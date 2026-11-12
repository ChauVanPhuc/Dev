# coding: utf-8
import fitz  # PyMuPDF
import re
import os
import logging
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill
from openpyxl.drawing.image import Image as OpenpyxlImage

from app.shared.utils import clean_and_standardize_sku, extract_product_line_from_sku, normalize_penalty_value
logger = logging.getLogger("pdf_parser")

def _split_composite_image_if_needed(img_path, images_batch_dir, cab_no, page_num, batch_id, caption_str, target_claims):
    """
    If a cropped fallback image contains multiple vertically stacked photos (aspect ratio height/width > 1.15 and height > 250),
    splits it horizontally into separate photo files so photos are not merged into a single frame.
    """
    try:
        from PIL import Image as PILImage
        if not os.path.exists(img_path):
            return False
        with PILImage.open(img_path) as pil_img:
            w, h = pil_img.size
            if h / float(w) > 1.15 and h > 250:
                gray_img = pil_img.convert('L')
                search_start = int(h * 0.35)
                search_end = int(h * 0.65)
                min_var = float('inf')
                best_split_y = int(h / 2)
                
                step = max(1, w // 40)
                for y in range(search_start, search_end):
                    row_pixels = [gray_img.getpixel((x, y)) for x in range(0, w, step)]
                    avg = sum(row_pixels) / float(len(row_pixels))
                    var = sum((p - avg) ** 2 for p in row_pixels) / float(len(row_pixels))
                    if var < min_var:
                        min_var = var
                        best_split_y = y
                
                top_crop = pil_img.crop((0, 0, w, best_split_y))
                bottom_crop = pil_img.crop((0, best_split_y, w, h))
                
                filename_1 = f"cabinet_{cab_no}_page_{page_num}_photo_1.png"
                path_1 = os.path.join(images_batch_dir, filename_1)
                top_crop.save(path_1)
                
                filename_2 = f"cabinet_{cab_no}_page_{page_num}_photo_2.png"
                path_2 = os.path.join(images_batch_dir, filename_2)
                bottom_crop.save(path_2)
                
                if os.path.exists(img_path):
                    try:
                        os.remove(img_path)
                    except Exception:
                        pass
                
                rel_path_1 = f"/static/uploads/claim_imports/images/{batch_id}/{filename_1}"
                rel_path_2 = f"/static/uploads/claim_imports/images/{batch_id}/{filename_2}"
                
                for c in target_claims:
                    c["image_paths"].append(rel_path_1)
                    c["image_captions"].append(f"{caption_str} (Ảnh 1)")
                    c["photo_pages"].append(page_num)
                    
                    c["image_paths"].append(rel_path_2)
                    c["image_captions"].append(f"{caption_str} (Ảnh 2)")
                    c["photo_pages"].append(page_num)
                return True
    except Exception as e:
        logger.warning(f"Lỗi khi split composite image {img_path}: {str(e)}")
    return False


def group_blocks_into_rows(text_blocks):
    """
    Group PyMuPDF text blocks by their vertical alignment (Y-coordinate ranges).
    """
    # Sort blocks by y0 (top to bottom)
    text_blocks.sort(key=lambda b: b[1])
    
    rows = []
    for b in text_blocks:
        x0, y0, x1, y1, text_content, block_no, block_type = b
        text_content = text_content.strip()
        if not text_content:
            continue
            
        placed = False
        y_center = (y0 + y1) / 2
        
        # Check if it fits in an existing row (vertical center similarity within 35 pixels)
        for row in rows:
            row_y0 = min(item[1] for item in row)
            row_y1 = max(item[3] for item in row)
            row_y_center = (row_y0 + row_y1) / 2
            
            if abs(y_center - row_y_center) < 35:
                row.append(b)
                placed = True
                break
                
        if not placed:
            rows.append([b])
            
    # Sort blocks within each row from left to right (X coordinate)
    for row in rows:
        row.sort(key=lambda b: b[0])
        
    return rows


def parse_pdf_claims(pdf_path, batch_id, images_batch_dir, seen_keys=None, normalize_penalty_func=None, claims_only=False):
    """
    Router entrypoint: phát hiện cấu trúc PDF và điều hướng đến parser phù hợp.
    
    - Cơ chế 1 (Standard): Cấu trúc phân tách bảng dữ liệu ở các trang đầu và khu vực ảnh minh chứng riêng biệt ở các trang cuối.
    - Cơ chế 2 (In-page Claim & Evidence): Cấu trúc claim legacy với bảng claim ở đầu trang và ảnh minh chứng nằm phía dưới bảng.
    - Cơ chế 3 (Label-Value Table): Cấu trúc claim dạng nhãn - giá trị (Label-Value), mỗi record bắt đầu bằng Claim #<N>, ảnh nằm phía dưới.
    
    Returns:
        (claims, period, parse_warnings, mechanism_info)
    """
    if seen_keys is None:
        seen_keys = set()
    
    if normalize_penalty_func is None:
        normalize_penalty_func = lambda x: x
    
    filename = os.path.basename(pdf_path)
    doc = fitz.open(pdf_path)

    # 0. Phát hiện CƠ CHẾ 4 (Credit Note Table PDF - bảng 5 cột: STT, SKU/CLAIM, CONTAINER #, LPN, ACTION, không có ảnh)
    is_mechanism_4 = False
    for p_idx in range(min(3, len(doc))):
        p_text = doc[p_idx].get_text()
        if re.search(r'CREDIT\s+NOTE', p_text, re.IGNORECASE) or re.search(r'TOTAL\s+CREDIT\s+AMOUNT', p_text, re.IGNORECASE):
            is_mechanism_4 = True
            break
        if (re.search(r'SKU\\s*/\\s*CLAIM', p_text, re.IGNORECASE) and re.search(r'CONTAINER\\s*#', p_text, re.IGNORECASE)):
            is_mechanism_4 = True
            break

    if is_mechanism_4:
        doc.close()
        logger.info(f"[{filename}] ✓ Phát hiện CƠ CHẾ 4 (Bảng dữ liệu Credit Note)")
        return parse_pdf_claims_mechanism_4(pdf_path, batch_id, images_batch_dir, seen_keys, normalize_penalty_func, claims_only)

    # 1. Phát hiện CƠ CHẾ 3 (Label-Value Table dạng Claim #<N> kèm các nhãn cột đặc trưng)
    is_mechanism_3 = False
    for p_idx in range(min(5, len(doc))):
        p_text = doc[p_idx].get_text()
        has_claim_num = bool(re.search(r'Claim\s*#\s*\d+', p_text, re.IGNORECASE))
        keywords = ['SKU', 'LPN', 'DEFECT NAME', 'CONTAINER', 'DEFECT CODE', 'ACTION']
        kw_count = sum(1 for kw in keywords if re.search(r'\b' + kw.replace(' ', r'\s+') + r'\b', p_text, re.IGNORECASE))
        if has_claim_num and kw_count >= 4:
            is_mechanism_3 = True
            break

    if is_mechanism_3:
        doc.close()
        logger.info(f"[{filename}] ✓ Phát hiện CƠ CHẾ 3 (Cấu trúc bảng claim dạng Label-Value)")
        return parse_pdf_claims_mechanism_3(pdf_path, batch_id, images_batch_dir, seen_keys, normalize_penalty_func, claims_only)

    has_separate_photo_section = False
    detected_on_page = None
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        # Normalize whitespace (including newlines) for more robust matching
        text_normalized = re.sub(r'\s+', ' ', text)
        if re.search(r'REFERENCE\s+DEFECTS?\s+PHOTOS?', text_normalized, re.IGNORECASE) or \
           re.search(r'H[iì]nh\s+[AẢả]nh\s+C[aá]c\s+L[oỗ]i', text_normalized, re.IGNORECASE) or \
           re.search(r'REFERENCE\s+PHOTOS?', text_normalized, re.IGNORECASE) or \
           re.search(r'DEFECTS?\s+PHOTOS?', text_normalized, re.IGNORECASE) or \
           re.search(r'H[iì]nh\s+[AẢả]nh\s+Minh\s+Ch[uứ]ng', text_normalized, re.IGNORECASE) or \
           re.search(r'H[iì]nh\s+[AẢả]nh\s+L[oỗ]i', text_normalized, re.IGNORECASE):
            has_separate_photo_section = True
            detected_on_page = page_num + 1
            break
            
    doc.close()
    
    if has_separate_photo_section:
        logger.info(f"[{filename}] ✓ Phát hiện CƠ CHẾ 1 (Cấu trúc phân tách bảng dữ liệu và trang ảnh riêng)")
        return parse_pdf_claims_mechanism_1(pdf_path, batch_id, images_batch_dir, seen_keys, normalize_penalty_func, claims_only)
    else:
        logger.info(f"[{filename}] ✓ Phát hiện CƠ CHẾ 2 (Cấu trúc claim legacy: bảng ở đầu trang và ảnh phía dưới)")
        return parse_pdf_claims_mechanism_2(pdf_path, batch_id, images_batch_dir, seen_keys, normalize_penalty_func, claims_only)


def parse_pdf_claims_mechanism_1(pdf_path, batch_id, images_batch_dir, seen_keys=None, normalize_penalty_func=None, claims_only=False):
    """
    [CƠ CHẾ 1]
    Dành cho cấu trúc claim phân tách bảng dữ liệu và trang ảnh riêng biệt:
    - Bảng danh sách claim tập trung ở các trang đầu (Cabinet #, SKU, Defect Name, LPN, Container, Defect Code, Action).
    - Khu vực ảnh minh chứng nằm riêng biệt ở các trang cuối (tiêu đề 'REFERENCE DEFECTS PHOTOS' hoặc tương đương).
    - Mỗi ảnh minh chứng có nhãn Cabinet tương ứng phía trên ảnh.
    - Mã tham chiếu dùng `Cabinet#N_MMYYYY`.
    """
    if seen_keys is None:
        seen_keys = set()
    
    if normalize_penalty_func is None:
        normalize_penalty_func = lambda x: x
    
    doc = fitz.open(pdf_path)
    claims = []
    parse_warnings = []
    period = None
    
    # Identify Reference defect photo page indices
    photo_candidate_pages = []
    photo_section_started = False
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        
        # Check if the page is a reference photos page or photo section has started
        text_upper = text.upper()
        if (
            "REFERENCE DEFECTS PHOTOS" in text_upper
            or "HÌNH ẢNH CÁC LỖI" in text_upper
            or "REFERENCE PHOTOS" in text_upper
            or "HÌNH ẢNH LỖI" in text_upper
            or "DEFECTS PHOTOS" in text_upper
            or "HÌNH ẢNH MINH CHỨNG" in text_upper
        ):
            photo_section_started = True
            
        if photo_section_started:
            photo_candidate_pages.append(page_num)
            continue
            
        # If the page yields absolutely no text, skip directly
        if not text.strip():
            continue
                
        # Extract text blocks
        blocks = page.get_text("blocks")
        text_blocks = [b for b in blocks if b[6] == 0]
        
        # Filter headers
        clean_blocks = []
        for b in text_blocks:
            text_content = b[4].strip()
            if "[CLAIM REPORT AT VINA G7 FACTORY]" in text_content or re.search(r'Page\s*\d+\s*of\s*\d+', text_content, re.IGNORECASE):
                continue
            clean_blocks.append(b)
            
        # Group text blocks by vertical alignment (Y-coordinate sorting)
        rows = group_blocks_into_rows(clean_blocks)
        
        for row in rows:
            # Reconstruct row text
            row_text = " ".join([b[4].strip() for b in row])
            
            # Period yellow-bar matching, e.g. "THÁNG 02 - 2026" or "THÁNG 8 - 2025" or "THÁNG 8/2025"
            period_match = re.search(r'THÁNG\s*(\d{1,2})\s*(?:-|_|–|—|/)?\s*(\d{4})', row_text, re.IGNORECASE)
            if period_match:
                month_str = period_match.group(1).zfill(2)
                period = f"{month_str}-{period_match.group(2)}"
                # CHỈ skip row nếu row KHÔNG chứa Cabinet data
                # (tránh mất dòng khi banner THÁNG bị gộp chung với Cabinet#1)
                has_cabinet_in_row = bool(re.search(r'Cabinet\s*#\s*\d+', row_text, re.IGNORECASE))
                if not has_cabinet_in_row:
                    continue
                
            # Parse individual claim row elements
            b_texts = [b[4].strip() for b in row]
            
            # 1. Identify STT
            stt = None
            for text_val in b_texts:
                if text_val.isdigit() and len(text_val) <= 2:
                    stt = int(text_val)
                    break
            if stt is None:
                stt = len(claims) + 1
                
            # 2. Extract SKU, cabinet_no, LPN, Container, Defect code, Action, and description parts line-by-line
            cabinet_no = None
            sku = ""
            claim_description_parts = []
            lpn = ""
            container_no = ""
            defect_codes = []
            actions = []
            has_cabinet = False
            
            for b in row:
                text_content = b[4].strip()
                lines = [line.strip() for line in text_content.split('\n') if line.strip()]
                
                # A block is an Action block ONLY if it does NOT contain Cabinet#, LPN:, or Container:
                has_claim_fields = bool(re.search(r'(Cabinet\s*#|LPN\s*:|Container\s*:)', text_content, re.IGNORECASE))
                has_action_words = bool(re.search(r'\b(PAY|FULL\s*BC|X2\s*UNIT|REPLACE|\$\d+)\b', text_content, re.IGNORECASE) or (b[0] > 400 and re.search(r'\b(PAY|REPLACE|REPAIR|FULL\s*BC|X2|\$)\b', text_content, re.IGNORECASE)))
                
                if not has_claim_fields and has_action_words:
                    # Separate defect codes inside the action block if any
                    d_matches = re.findall(r'\b([a-zA-Z]{2,4}[a-zA-Z0-9]*[-_][0-9]+[a-zA-Z0-9_-]*)\b', text_content, re.IGNORECASE)
                    for dm in d_matches:
                        if dm.strip() not in defect_codes:
                            defect_codes.append(dm.strip())
                    
                    clean_block_text = text_content
                    for dm in d_matches:
                        clean_block_text = re.sub(re.escape(dm), '', clean_block_text, flags=re.IGNORECASE)
                    
                    clean_lines = [l.strip() for l in clean_block_text.split('\n') if l.strip()]
                    full_act_str = " ".join(clean_lines)
                    actions.append(full_act_str)
                    continue
                
                for line in lines:
                    if re.search(r'Cabinet\s*#\s*\d+', line, re.IGNORECASE):
                        has_cabinet = True
                        cab_match = re.search(r'Cabinet\s*#\s*(\d+)\s*:\s*(.*)', line, re.IGNORECASE)
                        if cab_match:
                            cabinet_no = int(cab_match.group(1))
                            sku = cab_match.group(2).strip()
                            if '/' in sku:
                                sku = sku.split('/')[0].strip()
                        else:
                            cab_match_simple = re.search(r'Cabinet\s*#\s*(\d+)', line, re.IGNORECASE)
                            if cab_match_simple:
                                cabinet_no = int(cab_match_simple.group(1))
                        continue
                        
                    lpn_match = re.search(r'LPN\s*:?\s*([0-9]+)', line, re.IGNORECASE)
                    if lpn_match:
                        lpn = lpn_match.group(1).strip()
                        continue
                        
                    container_match = re.search(r'Container\s*:?\s*([A-Za-z0-9]+)', line, re.IGNORECASE)
                    if container_match:
                        container_no = container_match.group(1).strip()
                        continue
                        
                    defect_matches = re.findall(r'\b([a-zA-Z]{2,4}[a-zA-Z0-9]*[-_][0-9]+[a-zA-Z0-9_-]*)\b', line, re.IGNORECASE)
                    if defect_matches:
                        for dm in defect_matches:
                            defect_codes.append(dm.strip())
                        continue
                        
                    if line.isdigit() and len(line) <= 2:
                        continue
                        
                    if line.upper() in ["LPN:", "CONTAINER:", "DEFECTS", "ACTION", "STT", "SKU / CLAIM"]:
                        continue
                        
                    claim_description_parts.append(line)
                    
            claim_description = " / ".join(claim_description_parts)
            
            # If the row has no cabinet block, skip it silently as it is a layout or title row
            if not has_cabinet:
                continue
                
            # Clean and join actions (preserves full original text including Pay and notes in parentheses)
            cleaned_actions = []
            for act in actions:
                act_clean = re.sub(r'\s+', ' ', act).strip()
                if re.match(r'^\d+$', act_clean):
                    act_clean = f"${act_clean}"
                act_clean = normalize_penalty_func(act_clean)
                if act_clean and act_clean not in cleaned_actions:
                    cleaned_actions.append(act_clean)
            # Clean and join defect codes
            unique_defect_codes = []
            for dc in defect_codes:
                if dc not in unique_defect_codes:
                    unique_defect_codes.append(dc)
            defect_code = ", ".join(unique_defect_codes)
            action = ", ".join(cleaned_actions)

            if cabinet_no is not None:
                claims.append({
                    "id": f"{batch_id}_{len(claims) + 1}",
                    "batch_id": batch_id,
                    "stt": stt,
                    "cabinet_no": cabinet_no,
                    "sku": sku,
                    "claim_description": claim_description,
                    "defect_code": defect_code,
                    "company_error_code": "",  # Will be resolved later
                    "action": action,
                    "lpn": lpn,
                    "container_no": container_no,
                    "period": period,
                    "image_paths": [],
                    "image_captions": [],
                    "source_page": page_num + 1,
                    "photo_pages": [],
                    "status": "Mới"
                })
            else:
                parse_warnings.append(f"Dòng {stt} ở trang {page_num + 1}: Không tìm thấy số Cabinet.")

    filename = os.path.basename(pdf_path)
    parsed_count_before_dedup = len(claims)
    logger.info(f"[{filename}] Cơ chế 1: Đã parse được {parsed_count_before_dedup} claims (trước dedup)")

    # Deduplicate claims where all key fields are identical
    unique_claims = []
    duplicate_count = 0
    seen_in_file = set()
    
    # Do NOT discard duplicates anymore, keep all and let user inspect them as Exceptions
    for c in claims:
        try:
            cab_no = int(c["cabinet_no"]) if c["cabinet_no"] is not None else None
        except (ValueError, TypeError):
            cab_no = c["cabinet_no"]
        
        data_fields = (
            str(c["sku"] or "").strip(),
            str(c["claim_description"] or "").strip(),
            str(c["defect_code"] or "").strip(),
            normalize_penalty_func(c["action"]),
            str(c["lpn"] or "").strip(),
            str(c["container_no"] or "").strip(),
            str(c["period"] or "").strip()
        )
        key_with_cab = (cab_no,) + data_fields
        
        # Check duplicate 100% locally or in DB
        is_dup_in_file = key_with_cab in seen_in_file
        is_dup_in_db = key_with_cab in seen_keys
        
        if is_dup_in_file or is_dup_in_db:
            duplicate_count += 1
            msg = f"Dòng Cabinet #{cab_no} (STT {c['stt']}) bị trùng lặp dữ liệu hoàn toàn 100%."
            if msg not in parse_warnings:
                parse_warnings.append(msg)
        
        seen_in_file.add(key_with_cab)
        seen_keys.add(key_with_cab)
        unique_claims.append(c)
    
    logger.info(f"[{filename}] Cơ chế 1: Đã giữ lại toàn bộ {len(unique_claims)} claims (bao gồm {duplicate_count} dòng trùng lặp phát hiện)")
            
    # Reset stt for the unique claims to be sequential
    for i, c in enumerate(unique_claims):
        c["stt"] = i + 1
        c["id"] = f"{batch_id}_{i + 1}"
        
    claims = unique_claims

    # Validate parsing results
    for c in claims:
        cab_no = c["cabinet_no"]
        page_num = c["source_page"]
        if not c["sku"]:
            parse_warnings.append(f"Cabinet #{cab_no} ở trang {page_num}: Thiếu mã SKU.")
        if not c["period"]:
            parse_warnings.append(f"Cabinet #{cab_no} ở trang {page_num}: Thiếu kỳ báo cáo (Period).")
        if not c["defect_code"]:
            parse_warnings.append(f"Cabinet #{cab_no} ở trang {page_num}: Thiếu mã lỗi (DVA_XX).")
        if not c["action"]:
            parse_warnings.append(f"Cabinet #{cab_no} ở trang {page_num}: Thiếu biện pháp xử lý (Action).")

    mechanism_info = {
        "id": 1,
        "name": "Cơ chế 1 (Standard)",
        "description": "Bảng claim ở các trang đầu, khu vực ảnh minh chứng riêng biệt ở các trang cuối"
    }

    if claims_only:
        doc.close()
        return claims, period or datetime.now().strftime("%m-%Y"), parse_warnings, mechanism_info

    # If any page wasn't flagged as a photo page but has images, treat it as photo page candidate too
    if not photo_candidate_pages:
        for page_num in range(len(doc)):
            page = doc[page_num]
            if len(page.get_images()) > 0 and page_num not in [c["source_page"] - 1 for c in claims]:
                photo_candidate_pages.append(page_num)

    # 2. Extract and crop defect photos from reference photo pages using Caption Boundary Cropping
    for page_num in photo_candidate_pages:
        page = doc[page_num]
        blocks = page.get_text("blocks")
        
        # Determine dynamic starting Y limit
        y_top_limit = 75
        
        # Look for report header blocks to start below them
        for b in blocks:
            x0, y0, x1, y1, text_content, block_no, block_type = b
            text_content_upper = text_content.upper()
            if "[CLAIM REPORT" in text_content_upper or "PAGE " in text_content_upper or re.search(r'\d{2}\.\d{2}\.\d{4}', text_content):
                if y1 > y_top_limit and y1 < 120:
                    y_top_limit = y1 + 5
                    
        # Look for reference title block to start below it if present on page
        title_block_bottom = None
        for b in blocks:
            x0, y0, x1, y1, text_content, block_no, block_type = b
            text_content_upper = text_content.upper()
            if (
                "REFERENCE DEFECTS PHOTOS" in text_content_upper
                or "HÌNH ẢNH CÁC LỖI" in text_content_upper
                or "REFERENCE PHOTOS" in text_content_upper
                or "DEFECTS PHOTOS" in text_content_upper
            ):
                title_block_bottom = y1
                break
                
        if title_block_bottom is not None:
            y_top_limit = max(y_top_limit, title_block_bottom + 5)
            
        # Find all Cabinet captions on the page
        sorted_captions = []
        for b in blocks:
            x0, y0, x1, y1, text_content, block_no, block_type = b
            if block_type != 0:
                continue
            text_content = text_content.strip()
            match = re.search(r'Cabinet\s*#\s*(\d+)', text_content, re.IGNORECASE)
            if match:
                if y0 < y_top_limit:
                    continue
                cab_no = int(match.group(1))
                caption_str = " ".join(text_content.split())
                match_obj = re.search(r'Cabinet\s*#\s*(\d+)\s*:\s*([^/]+)(?:\s*/\s*([^/]+))?', caption_str, re.IGNORECASE)
                sorted_captions.append({
                    "cabinet_no": cab_no,
                    "caption_str": caption_str,
                    "rect": fitz.Rect(x0, y0, x1, y1),
                    "match_obj": match_obj
                })
                
        # Sort captions vertically (top-to-bottom)
        sorted_captions.sort(key=lambda item: item["rect"].y0)
        
        # If no caption is found on this photo page, log a warning and fallback to full content area
        if not sorted_captions:
            msg = f"Không tìm thấy nhãn Cabinet ở trang {page_num + 1}."
            logger.warning(msg)
            parse_warnings.append(msg)
            
            # Map page content to the last parsed cabinet if possible
            last_cab_no = None
            if claims:
                last_cab_no = claims[-1]["cabinet_no"]
                
            if last_cab_no is not None:
                try:
                    y_start = max(0, y_top_limit)
                    y_end = page.rect.height - 30
                    x_start = max(0, 30)
                    x_end = max(x_start + 1, page.rect.width - 30)
                    # Validate crop dimensions
                    if y_end > y_start + 20 and x_end > x_start:
                        crop_rect = fitz.Rect(x_start, y_start, x_end, y_end)
                        crop_rect = crop_rect & page.rect  # Clamp to page bounds
                        if not crop_rect.is_empty and crop_rect.width > 1 and crop_rect.height > 1:
                            pix = page.get_pixmap(clip=crop_rect, dpi=150)
                            img_filename = f"cabinet_{last_cab_no}_page_{page_num + 1}_continuation.png"
                            img_path = os.path.join(images_batch_dir, img_filename)
                            pix.save(img_path)
                            
                            for c in claims:
                                if c["cabinet_no"] == last_cab_no:
                                    c["image_paths"].append(f"/static/uploads/claim_imports/images/{batch_id}/{img_filename}")
                                    c["image_captions"].append(f"Cabinet #{last_cab_no} (Ảnh bổ sung trang {page_num + 1})")
                                    c["photo_pages"].append(page_num + 1)
                except Exception as img_err:
                    logger.warning(f"Bỏ qua ảnh trang {page_num + 1} (lỗi kích thước vùng cắt): {str(img_err)}")
            continue
            
        # Slice page content based on caption boundaries
        for cap_idx, current_caption in enumerate(sorted_captions):
            cab_no = current_caption["cabinet_no"]
            caption_str = current_caption["caption_str"]
            rect = current_caption["rect"]
            
            # Use user-defined offset rules
            if cap_idx == 0:
                y_start = y_top_limit
            else:
                previous_caption = sorted_captions[cap_idx - 1]
                y_start = previous_caption["rect"].y1 + 8
                
            photo_y_end = max(y_start + 10, rect.y0 - 2)
            
            if photo_y_end - y_start < 5:
                msg = f"Phân vùng cắt cho Cabinet #{cab_no} ở trang {page_num + 1} quá nhỏ."
                logger.warning(msg)
                parse_warnings.append(msg)
                continue
                
            try:
                x_start = max(0, 30)
                x_end = max(x_start + 1, page.rect.width - 30)
                y_start_clamped = max(0, y_start)
                y_end_clamped = min(page.rect.height, photo_y_end)
                
                if y_end_clamped <= y_start_clamped or x_end <= x_start:
                    msg = f"Phân vùng cắt cho Cabinet #{cab_no} ở trang {page_num + 1} có kích thước không hợp lệ."
                    logger.warning(msg)
                    parse_warnings.append(msg)
                    continue
                
                crop_rect = fitz.Rect(x_start, y_start_clamped, x_end, y_end_clamped) & page.rect
                
                if crop_rect.is_empty or crop_rect.width < 1 or crop_rect.height < 1:
                    msg = f"Phân vùng cắt cho Cabinet #{cab_no} ở trang {page_num + 1} rỗng sau khi giới hạn."
                    logger.warning(msg)
                    parse_warnings.append(msg)
                    continue

                img_infos = page.get_image_info(xrefs=True)
                region_sub_imgs = []
                for info in img_infos:
                    bx0, by0, bx1, by1 = info['bbox']
                    if by0 < rect.y0 + 15 and by1 > y_start_clamped - 15:
                        region_sub_imgs.append(info)

                region_sub_imgs.sort(key=lambda item: item['bbox'][1])

                target_claims = [c for c in claims if c["cabinet_no"] == cab_no]
                if not target_claims and current_caption["match_obj"]:
                    sku_cap = current_caption["match_obj"].group(2).strip().lower()
                    target_claims = [c for c in claims if c["sku"].lower() in sku_cap or sku_cap in c["sku"].lower()]

                if len(region_sub_imgs) > 0:
                    for sub_idx, sub_info in enumerate(region_sub_imgs):
                        sbx0, sby0, sbx1, sby1 = sub_info['bbox']
                        sub_rect = fitz.Rect(max(0, sbx0 - 3), max(0, sby0 - 3), min(page.rect.width, sbx1 + 3), min(page.rect.height, sby1 + 3)) & page.rect
                        if not sub_rect.is_empty and sub_rect.width > 5 and sub_rect.height > 5:
                            sub_pix = page.get_pixmap(clip=sub_rect, dpi=150)
                            img_suffix = f"photo_{sub_idx + 1}" if len(region_sub_imgs) > 1 else "photo"
                            cap_suffix = f" (Ảnh {sub_idx + 1})" if len(region_sub_imgs) > 1 else ""
                            img_filename = f"cabinet_{cab_no}_page_{page_num + 1}_{img_suffix}.png"
                            img_path = os.path.join(images_batch_dir, img_filename)
                            sub_pix.save(img_path)

                            for c in target_claims:
                                c["image_paths"].append(f"/static/uploads/claim_imports/images/{batch_id}/{img_filename}")
                                c["image_captions"].append(f"{caption_str}{cap_suffix}")
                                c["photo_pages"].append(page_num + 1)
                else:
                    pix = page.get_pixmap(clip=crop_rect, dpi=150)
                    img_filename = f"cabinet_{cab_no}_page_{page_num + 1}.png"
                    img_path = os.path.join(images_batch_dir, img_filename)
                    pix.save(img_path)

                    split_done = _split_composite_image_if_needed(img_path, images_batch_dir, cab_no, page_num + 1, batch_id, caption_str, target_claims)
                    
                    if not split_done:
                        for c in target_claims:
                            c["image_paths"].append(f"/static/uploads/claim_imports/images/{batch_id}/{img_filename}")
                            c["image_captions"].append(caption_str)
                            c["photo_pages"].append(page_num + 1)
            except Exception as img_err:
                msg = f"Bỏ qua ảnh Cabinet #{cab_no} trang {page_num + 1} (lỗi kích thước): {str(img_err)}"
                logger.warning(msg)
                parse_warnings.append(msg)
                
    doc.close()
    logger.info(f"[{os.path.basename(pdf_path)}] Cơ chế 1: Kết quả cuối cùng = {len(claims)} claims")
    return claims, period or datetime.now().strftime("%m-%Y"), parse_warnings, mechanism_info


def parse_pdf_claims_mechanism_2(pdf_path, batch_id, images_batch_dir, seen_keys=None, normalize_penalty_func=None, claims_only=False):
    """
    [CƠ CHẾ 2]
    Dành cho cấu trúc claim legacy:
    - Thông tin claim nằm trong bảng ở đầu trang.
    - Một ô chứa chung Cabinet #, SKU, Defect Name, LPN, Container.
    - Defect Code và Action nằm ở các cột riêng.
    - Ảnh minh chứng nằm phía dưới bảng và có thể tiếp tục sang trang kế.
    - Ảnh được xác định/cắt dựa trên layout và khung viền hiện có.
    - Mã tham chiếu dùng `Cabinet#N_MMYYYY`.
    """
    if seen_keys is None:
        seen_keys = set()
    
    if normalize_penalty_func is None:
        normalize_penalty_func = lambda x: x
    
    doc = fitz.open(pdf_path)
    pdf_name_clean = re.sub(r'[^a-zA-Z0-9_-]', '_', os.path.basename(pdf_path).lower().replace('.pdf', ''))
    claims = []
    parse_warnings = []
    period = None
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        
        if not text.strip():
            continue
        
        # Skip photo-only pages (evidence photo pages contain this header)
        # These pages have "Cabinet#X: SKU / Description" labels but no actual claim data
        if re.search(r'REFERENCE\s+DEFECTS?\s+PHOTOS?', text, re.IGNORECASE) or \
           re.search(r'Hình\s+Ảnh\s+Các\s+Lỗi', text, re.IGNORECASE):
            logger.info(f"Page {page_num + 1}: Skipping photo-only page (REFERENCE DEFECTS PHOTOS)")
            continue
        
        # Also skip pages that have only 1 Cabinet label and no table structure
        # (pure photo pages without the REFERENCE DEFECTS PHOTOS header)
        cab_count_on_page = len(re.findall(r'Cabinet\s*#?\s*\d+', text, re.IGNORECASE))
        has_table_structure = bool(re.search(r'\b(STT|LPN|Container\s*No|Defect\s*Code|Action)\b', text, re.IGNORECASE))
        if cab_count_on_page <= 1 and not has_table_structure and re.search(r'Cabinet\s*#?\s*\d+', text, re.IGNORECASE):
            logger.info(f"Page {page_num + 1}: Skipping photo-only page (single Cabinet label, no table headers)")
            continue
                
        # Extract text blocks
        blocks = page.get_text("blocks")
        text_blocks = [b for b in blocks if b[6] == 0]
        
        # Filter headers
        clean_blocks = []
        for b in text_blocks:
            text_content = b[4].strip()
            if "[CLAIM REPORT AT VINA G7 FACTORY]" in text_content or re.search(r'Page\s*\d+\s*of\s*\d+', text_content, re.IGNORECASE):
                continue
            clean_blocks.append(b)
            
        rows = group_blocks_into_rows(clean_blocks)
        
        for row in rows:
            row_text = " ".join([b[4].strip() for b in row])
            period_match = re.search(r'THÁNG\s*(\d{1,2})\s*(?:-|_|–|—|/)?\s*(\d{4})', row_text, re.IGNORECASE)
            if period_match:
                month_str = period_match.group(1).zfill(2)
                period = f"{month_str}-{period_match.group(2)}"
                # CHỈ skip row nếu row KHÔNG chứa Cabinet data
                # (tránh mất dòng khi banner THÁNG bị gộp chung với Cabinet#1)
                has_cabinet_in_row = bool(re.search(r'Cabinet\s*#\s*\d+', row_text, re.IGNORECASE))
                if not has_cabinet_in_row:
                    continue
                
            b_texts = [b[4].strip() for b in row]
            stt = None
            for text_val in b_texts:
                if text_val.isdigit() and len(text_val) <= 2:
                    stt = int(text_val)
                    break
            if stt is None:
                stt = len(claims) + 1
                
            cabinet_no = None
            sku = ""
            claim_description_parts = []
            lpn = ""
            container_no = ""
            defect_codes = []
            actions = []
            has_cabinet = False
            
            for b in row:
                text_content = b[4].strip()
                lines = [line.strip() for line in text_content.split('\n') if line.strip()]
                
                # A block is an Action block ONLY if it does NOT contain Cabinet#, LPN:, or Container:
                has_claim_fields = bool(re.search(r'(Cabinet\s*#|LPN\s*:|Container\s*:)', text_content, re.IGNORECASE))
                has_action_words = bool(re.search(r'\b(PAY|FULL\s*BC|X2\s*UNIT|REPLACE|\$\d+)\b', text_content, re.IGNORECASE) or (b[0] > 400 and re.search(r'\b(PAY|REPLACE|REPAIR|FULL\s*BC|X2|\$)\b', text_content, re.IGNORECASE)))
                
                if not has_claim_fields and has_action_words:
                    # Separate defect codes inside the action block if any
                    d_matches = re.findall(r'\b([a-zA-Z]{2,4}[a-zA-Z0-9]*[-_][0-9]+[a-zA-Z0-9_-]*)\b', text_content, re.IGNORECASE)
                    for dm in d_matches:
                        if dm.strip() not in defect_codes:
                            defect_codes.append(dm.strip())
                    
                    clean_block_text = text_content
                    for dm in d_matches:
                        clean_block_text = re.sub(re.escape(dm), '', clean_block_text, flags=re.IGNORECASE)
                    
                    clean_lines = [l.strip() for l in clean_block_text.split('\n') if l.strip()]
                    full_act_str = " ".join(clean_lines)
                    actions.append(full_act_str)
                    continue
                
                for line in lines:
                    if re.search(r'Cabinet\s*#\s*\d+', line, re.IGNORECASE):
                        has_cabinet = True
                        cab_match = re.search(r'Cabinet\s*#\s*(\d+)\s*:\s*(.*)', line, re.IGNORECASE)
                        if cab_match:
                            cabinet_no = int(cab_match.group(1))
                            sku = cab_match.group(2).strip()
                            if '/' in sku:
                                sku = sku.split('/')[0].strip()
                        else:
                            cab_match_simple = re.search(r'Cabinet\s*#\s*(\d+)', line, re.IGNORECASE)
                            if cab_match_simple:
                                cabinet_no = int(cab_match_simple.group(1))
                        continue
                        
                    lpn_match = re.search(r'LPN\s*:?\s*([0-9]+)', line, re.IGNORECASE)
                    if lpn_match:
                        lpn = lpn_match.group(1).strip()
                        continue
                        
                    container_match = re.search(r'Container\s*:?\s*([A-Za-z0-9]+)', line, re.IGNORECASE)
                    if container_match:
                        container_no = container_match.group(1).strip()
                        continue
                        
                    defect_matches = re.findall(r'\b([a-zA-Z]{2,4}[a-zA-Z0-9]*[-_][0-9]+[a-zA-Z0-9_-]*)\b', line, re.IGNORECASE)
                    if defect_matches:
                        for dm in defect_matches:
                            defect_codes.append(dm.strip())
                        continue
                        
                    if line.isdigit() and len(line) <= 2:
                        continue
                        
                    if line.upper() in ["LPN:", "CONTAINER:", "DEFECTS", "ACTION", "STT", "SKU / CLAIM"]:
                        continue
                        
                    claim_description_parts.append(line)
                    
            claim_description = " / ".join(claim_description_parts)
            
            if not has_cabinet:
                continue
                
            cleaned_actions = []
            for act in actions:
                act_clean = re.sub(r'\s+', ' ', act).strip()
                if re.match(r'^\d+$', act_clean):
                    act_clean = f"${act_clean}"
                act_clean = normalize_penalty_func(act_clean)
                if act_clean and act_clean not in cleaned_actions:
                    cleaned_actions.append(act_clean)
            unique_defect_codes = []
            for dc in defect_codes:
                if dc not in unique_defect_codes:
                    unique_defect_codes.append(dc)
            defect_code = ", ".join(unique_defect_codes)
            action = ", ".join(cleaned_actions)

            if cabinet_no is not None:
                claims.append({
                    "id": f"{batch_id}_{len(claims) + 1}",
                    "batch_id": batch_id,
                    "stt": stt,
                    "cabinet_no": cabinet_no,
                    "sku": sku,
                    "claim_description": claim_description,
                    "defect_code": defect_code,
                    "company_error_code": "",
                    "action": action,
                    "lpn": lpn,
                    "container_no": container_no,
                    "period": period,
                    "image_paths": [],
                    "image_captions": [],
                    "source_page": page_num + 1,
                    "photo_pages": [],
                    "status": "Mới"
                })
            else:
                parse_warnings.append(f"Dòng {stt} ở trang {page_num + 1}: Không tìm thấy số Cabinet.")

    filename = os.path.basename(pdf_path)
    parsed_count_before_dedup = len(claims)
    logger.info(f"[{filename}] Cơ chế 2: Đã parse được {parsed_count_before_dedup} claims (trước dedup)")

    # Deduplicate claims where all key fields are identical
    unique_claims = []
    duplicate_count = 0
    seen_in_file = set()
    
    # Do NOT discard duplicates anymore, keep all and let user inspect them as Exceptions
    for c in claims:
        try:
            cab_no = int(c["cabinet_no"]) if c["cabinet_no"] is not None else None
        except (ValueError, TypeError):
            cab_no = c["cabinet_no"]
        
        data_fields = (
            str(c["sku"] or "").strip(),
            str(c["claim_description"] or "").strip(),
            str(c["defect_code"] or "").strip(),
            normalize_penalty_func(c["action"]),
            str(c["lpn"] or "").strip(),
            str(c["container_no"] or "").strip(),
            str(c["period"] or "").strip()
        )
        key_with_cab = (cab_no,) + data_fields
        
        # Check duplicate 100% locally or in DB
        is_dup_in_file = key_with_cab in seen_in_file
        is_dup_in_db = key_with_cab in seen_keys
        
        if is_dup_in_file or is_dup_in_db:
            duplicate_count += 1
            msg = f"Dòng Cabinet #{cab_no} (STT {c['stt']}) bị trùng lặp dữ liệu hoàn toàn 100%."
            if msg not in parse_warnings:
                parse_warnings.append(msg)
        
        seen_in_file.add(key_with_cab)
        seen_keys.add(key_with_cab)
        unique_claims.append(c)
    
    logger.info(f"[{filename}] Cơ chế 2: Đã giữ lại toàn bộ {len(unique_claims)} claims (bao gồm {duplicate_count} dòng trùng lặp phát hiện)")
            
    # Reset stt for the unique claims to be sequential
    for i, c in enumerate(unique_claims):
        c["stt"] = i + 1
        c["id"] = f"{batch_id}_{i + 1}"
        
    claims = unique_claims

    # Validate parsing results
    for c in claims:
        cab_no = c["cabinet_no"]
        page_num = c["source_page"]
        if not c["sku"]:
            parse_warnings.append(f"Cabinet #{cab_no} ở trang {page_num}: Thiếu mã SKU.")
        if not c["period"]:
            parse_warnings.append(f"Cabinet #{cab_no} ở trang {page_num}: Thiếu kỳ báo cáo (Period).")
        if not c["defect_code"]:
            parse_warnings.append(f"Cabinet #{cab_no} ở trang {page_num}: Thiếu mã lỗi (DVA_XX).")
        if not c["action"]:
            parse_warnings.append(f"Cabinet #{cab_no} ở trang {page_num}: Thiếu biện pháp xử lý (Action).")

    mechanism_info = {
        "id": 2,
        "name": "Cơ chế 2 (In-page Claim & Evidence)",
        "description": "Bảng claim ở đầu trang và ảnh minh chứng nằm phía dưới bảng trên từng trang"
    }

    if claims_only:
        doc.close()
        return claims, period or datetime.now().strftime("%m-%Y"), parse_warnings, mechanism_info

    # 2. Xử lý cắt ảnh theo Cơ chế 2 (Trang chứa bảng claim và các trang ảnh nối tiếp)
    claim_source_pages = {cl["source_page"] for cl in claims}
    
    for c in claims:
        # 1. Xác định trang nguồn và tất cả các trang nối tiếp của claim này
        start_page_1 = c["source_page"]  # 1-indexed
        pages_to_process = [start_page_1 - 1]  # 0-indexed list of pages to process
        
        # Tìm các trang nối tiếp ngay sau trang nguồn mà không chứa dòng claim nào khác
        next_page_idx = start_page_1
        while next_page_idx < len(doc):
            # Nếu trang tiếp theo này không phải là trang nguồn của bất kỳ claim nào khác
            if (next_page_idx + 1) not in claim_source_pages:
                pages_to_process.append(next_page_idx)
                next_page_idx += 1
            else:
                break
                
        # 2. Xử lý cắt ảnh trên từng trang trong danh sách
        for page_num in pages_to_process:
            # Bỏ qua trang bìa đầu tiên (trang 1) nếu nó lọt vào danh sách
            if page_num == 0:
                continue
                
            page = doc[page_num]
            
            # Chỉ xử lý nếu trang có chứa hình ảnh
            if len(page.get_images()) > 0:
                try:
                    # Xác định đáy của bảng claim (nếu là trang nguồn) hoặc dùng header_limit (nếu là trang nối tiếp)
                    table_bottom_y = 60
                    blocks = page.get_text("blocks")
                    
                    # Tìm tọa độ dưới cùng của bảng claim ở phần trên trang
                    for b in blocks:
                        x0, y0, x1, y1, text_content, block_no, block_type = b
                        if block_type == 0:
                            text_upper = text_content.upper()
                            # Nhận diện các khối chữ thuộc bảng claim ở phía trên trang
                            if any(k in text_upper for k in ["STT", "SKU", "CLAIM", "DEFECT", "ACTION", "CABINET", "LPN", "CONTAINER", "PAY", "REPAIR", "REPLACE"]):
                                if y1 > table_bottom_y and y1 < 250:
                                    table_bottom_y = y1
                                    
                    # Lấy danh sách ảnh trên trang
                    image_infos = page.get_image_info(xrefs=True)
                    
                    if image_infos:
                        # Trích xuất các nét vẽ thẳng (đường viền khung đen) nằm bên dưới bảng claim
                        drawings = page.get_drawings()
                        v_lines = []
                        h_lines = []
                        
                        for d in drawings:
                            r = d['rect']
                            if r.y0 < table_bottom_y + 5:
                                continue
                            # Nét dọc
                            if r.width <= 3 and r.height >= 30:
                                v_lines.append(r)
                            # Nét ngang
                            elif r.height <= 3 and r.width >= 30:
                                h_lines.append(r)
                                
                        # Với mỗi ảnh, tìm đường biên khung đen bao quanh gần nhất để cắt
                        for img_idx, img in enumerate(image_infos):
                            bbox = img['bbox']
                            img_x0, img_y0, img_x1, img_y1 = bbox
                            
                            # Bỏ qua nếu ảnh nằm trong vùng bảng dữ liệu phía trên
                            if img_y0 < table_bottom_y:
                                continue
                                
                            left_candidates = [vl.x0 for vl in v_lines if vl.x0 <= img_x0 + 2 and abs(vl.x0 - img_x0) < 25]
                            crop_x0 = min(left_candidates, key=lambda x: abs(x - img_x0)) if left_candidates else img_x0 - 7
                            
                            right_candidates = [vl.x1 for vl in v_lines if vl.x1 >= img_x1 - 2 and abs(vl.x1 - img_x1) < 25]
                            crop_x1 = min(right_candidates, key=lambda x: abs(x - img_x1)) if right_candidates else img_x1 + 7
                            
                            top_candidates = [hl.y0 for hl in h_lines if hl.y0 <= img_y0 + 2 and abs(hl.y0 - img_y0) < 25]
                            crop_y0 = min(top_candidates, key=lambda y: abs(y - img_y0)) if top_candidates else img_y0 - 2
                            
                            bottom_candidates = [hl.y1 for hl in h_lines if hl.y1 >= img_y1 - 2 and abs(hl.y1 - img_y1) < 25]
                            crop_y1 = min(bottom_candidates, key=lambda y: abs(y - img_y1)) if bottom_candidates else img_y1 + 2
                            
                            crop_rect = fitz.Rect(crop_x0, crop_y0, crop_x1, crop_y1)
                            crop_rect = crop_rect & page.rect
                            
                            if not crop_rect.is_empty and crop_rect.width > 2 and crop_rect.height > 2:
                                pix = page.get_pixmap(clip=crop_rect, dpi=150)
                                cab_no = c["cabinet_no"]
                                
                                # Đặt tên phân biệt ảnh chính và ảnh nối tiếp
                                is_continuation = page_num != (start_page_1 - 1)
                                suffix = f"photo_cont_{img_idx + 1}" if is_continuation else f"photo_{img_idx + 1}"
                                caption_desc = f"Ảnh nối tiếp {img_idx + 1}" if is_continuation else f"Ảnh {img_idx + 1}"
                                
                                img_filename = f"{pdf_name_clean}_cabinet_{cab_no}_page_{page_num + 1}_{suffix}.png"
                                img_path = os.path.join(images_batch_dir, img_filename)
                                pix.save(img_path)
                                
                                c["image_paths"].append(f"/static/uploads/claim_imports/images/{batch_id}/{img_filename}")
                                c["image_captions"].append(f"Cabinet #{cab_no} ({caption_desc} trang {page_num + 1})")
                                c["photo_pages"].append(page_num + 1)
                                
                    # Nếu vì lý do nào đó không trích xuất được ảnh riêng lẻ, cắt toàn bộ vùng ảnh làm dự phòng
                    has_page_img = any(f"page_{page_num + 1}" in p for p in c.get("image_paths", []))
                    if not has_page_img:
                        y_start = table_bottom_y + 10
                        y_end = page.rect.height - 30
                        x_start = max(0, 30)
                        x_end = max(x_start + 1, page.rect.width - 30)
                        
                        y_start_clamped = max(0, y_start)
                        y_end_clamped = min(page.rect.height, y_end)
                        
                        if y_end_clamped > y_start_clamped + 20 and x_end > x_start:
                            crop_rect = fitz.Rect(x_start, y_start_clamped, x_end, y_end_clamped)
                            crop_rect = crop_rect & page.rect
                            
                            if not crop_rect.is_empty and crop_rect.width > 1 and crop_rect.height > 1:
                                pix = page.get_pixmap(clip=crop_rect, dpi=150)
                                cab_no = c["cabinet_no"]
                                
                                is_continuation = page_num != (start_page_1 - 1)
                                name_suffix = "continuation" if is_continuation else "primary"
                                caption_desc = "Ảnh bổ sung" if is_continuation else "Ảnh minh chứng"
                                
                                img_filename = f"{pdf_name_clean}_cabinet_{cab_no}_page_{page_num + 1}_{name_suffix}.png"
                                img_path = os.path.join(images_batch_dir, img_filename)
                                pix.save(img_path)
                                
                                c["image_paths"].append(f"/static/uploads/claim_imports/images/{batch_id}/{img_filename}")
                                c["image_captions"].append(f"Cabinet #{cab_no} ({caption_desc} trang {page_num + 1})")
                                c["photo_pages"].append(page_num + 1)
                                
                except Exception as img_err:
                    logger.warning(f"Bỏ qua cắt ảnh trang {page_num + 1} cho Cabinet #{c['cabinet_no']}: {str(img_err)}")

    doc.close()
    logger.info(f"[{os.path.basename(pdf_path)}] Cơ chế 2: Kết quả cuối cùng = {len(claims)} claims")
    return claims, period or datetime.now().strftime("%m-%Y"), parse_warnings, mechanism_info


def parse_pdf_claims_mechanism_3(pdf_path, batch_id, images_batch_dir, seen_keys=None, normalize_penalty_func=None, claims_only=False):
    """
    [CƠ CHẾ 3]
    Dành cho cấu trúc claim dạng Label-Value:
    - Mỗi record bắt đầu bằng `Claim #N`.
    - Bảng gồm 2 cặp Label-Value (hoặc 1 cặp):
      Row 1: SKU, LPN
      Row 2: Defect Name, Container
      Row 3: Defect Code, Action
    - Đọc theo từng ô (cell) dựa trên ranh giới thực tế của bảng để không ghép nhầm text giữa các trường.
    - Chuẩn hóa Dòng hàng (trích xuất từ phần trước '-' đầu tiên của SKU).
    - Ảnh minh chứng nằm dưới phần thông tin claim và có thể tiếp tục sang trang kế.
    - Mã tham chiếu dùng `Claim#N_MMYYYY`.
    """
    if seen_keys is None:
        seen_keys = set()
    
    if normalize_penalty_func is None:
        normalize_penalty_func = normalize_penalty_value

    def _extract_words_in_bbox(page, bbox):
        if not bbox:
            return []
        words = page.get_text("words", clip=bbox)
        if not words:
            return []
        lines = []
        for w in sorted(words, key=lambda x: (x[1], x[0])):
            if not lines or abs(lines[-1][0][1] - w[1]) > 5:
                lines.append([w])
            else:
                lines[-1].append(w)
        result = []
        for line in lines:
            line.sort(key=lambda x: x[0])
            result.append(" ".join(w[4] for w in line))
        return result

    def _sort_and_join_cell_words(w_list):
        if not w_list:
            return ""
        lines = []
        w_sorted = sorted(w_list, key=lambda w: (w[1], w[0]))
        for w in w_sorted:
            placed = False
            for line in lines:
                if abs(line[0][1] - w[1]) < 6:
                    line.append(w)
                    placed = True
                    break
            if not placed:
                lines.append([w])
        lines.sort(key=lambda line: line[0][1])
        line_strs = []
        for line in lines:
            line.sort(key=lambda w: w[0])
            line_strs.append(" ".join(w[4] for w in line))
        return "\n".join(line_strs).strip()

    doc = fitz.open(pdf_path)
    filename = os.path.basename(pdf_path)
    pdf_name_clean = re.sub(r'[^a-zA-Z0-9_-]', '_', filename.lower().replace('.pdf', ''))
    claims = []
    parse_warnings = []
    period = None
    page_table_bottoms = {}

    # 1. Trích xuất Period từ 5 trang đầu
    for p_idx in range(min(5, len(doc))):
        p_text = doc[p_idx].get_text()
        m_period = re.search(r'Period\s*[:\s]*(\d{1,2})\s*[-–/]\s*(\d{4})', p_text, re.IGNORECASE)
        if m_period:
            period = f"{int(m_period.group(1)):02d}-{m_period.group(2)}"
            break
        m_period_vn = re.search(r'THÁNG\s*(\d{1,2})\s*(?:-|_|–|—|/)?\s*(\d{4})', p_text, re.IGNORECASE)
        if m_period_vn:
            period = f"{int(m_period_vn.group(1)):02d}-{m_period_vn.group(2)}"
            break

    # 2. Duyệt từng trang để bóc tách thông tin khiếu nại (Claim table)
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        
        header_m = re.search(r'Claim\s*#\s*(\d+)', text, re.IGNORECASE)
        if not header_m:
            continue
            
        claim_no = int(header_m.group(1))
        
        data = {}
        table_bottom_y = 0
        table_found = False
        
        # Phương pháp 1: Trích xuất dựa trên cấu trúc bảng ô (cell-level) từ PyMuPDF find_tables()
        tabs = page.find_tables()
        if tabs.tables:
            for tab in tabs.tables:
                extracted = tab.extract()
                text_flat = " ".join(" ".join(str(c or "") for c in row) for row in extracted).upper()
                if "SKU" in text_flat and ("ACTION" in text_flat or "CONTAINER" in text_flat):
                    table_found = True
                    table_bottom_y = tab.bbox[3]
                    for r_idx, row in enumerate(extracted):
                        c_idx = 0
                        while c_idx < len(row):
                            cell_val = str(row[c_idx] or "").strip()
                            cell_upper = cell_val.upper()
                            
                            target_key = None
                            if re.search(r'^\s*SKU\b', cell_upper):
                                target_key = "sku"
                            elif re.search(r'\bLPN\b', cell_upper):
                                target_key = "lpn"
                            elif "DEFECT" in cell_upper and "NAME" in cell_upper:
                                target_key = "defect_name"
                            elif re.search(r'\bCONTAINER\b', cell_upper):
                                target_key = "container"
                            elif "DEFECT" in cell_upper and "CODE" in cell_upper:
                                target_key = "defect_code"
                            elif re.search(r'\bACTION\b', cell_upper):
                                target_key = "action"
                            
                            if target_key:
                                val_str = ""
                                if c_idx + 1 < len(row) and row[c_idx + 1] is not None:
                                    val_str = str(row[c_idx + 1] or "").strip()
                                
                                val_lines = [l.strip() for l in val_str.split("\n") if l.strip()]
                                if not val_lines and r_idx < len(tab.rows) and c_idx + 1 < len(tab.rows[r_idx].cells):
                                    cell_bbox = tab.rows[r_idx].cells[c_idx + 1]
                                    if cell_bbox is not None:
                                        val_lines = _extract_words_in_bbox(page, cell_bbox)
                                
                                data[target_key] = val_lines
                                c_idx += 2
                            else:
                                c_idx += 1
                    break

        # Phương pháp 2: Fallback định vị ranh giới ô độc lập qua đường kẻ ngang vector / nhãn
        if not table_found or not ("sku" in data and "action" in data and data.get("sku")):
            words = page.get_text("words")
            drawings = page.get_drawings()
            
            sku_words = [w for w in words if w[4].upper() == 'SKU' and w[0] < 120]
            lpn_words = [w for w in words if w[4].upper() == 'LPN' and w[0] > 250]
            defect_name_words = [w for w in words if w[4].upper() == 'DEFECT' and any(w2[4].upper() == 'NAME' and abs(w2[1] - w[1]) < 10 for w2 in words) and w[0] < 120]
            container_words = [w for w in words if w[4].upper() == 'CONTAINER' and w[0] > 250]
            defect_code_words = [w for w in words if w[4].upper() == 'DEFECT' and any(w2[4].upper() == 'CODE' and abs(w2[1] - w[1]) < 10 for w2 in words) and w[0] < 120]
            action_words = [w for w in words if w[4].upper() == 'ACTION' and w[0] > 250]

            if sku_words and defect_name_words and defect_code_words:
                min_y = sku_words[0][1] - 15
                max_y = defect_code_words[0][1] + 80
                h_lines = sorted(list(set(round(d['rect'].y0, 1) for d in drawings if min_y <= d['rect'].y1 <= max_y and d['rect'].width > 80)))
                
                left_labels = sku_words + defect_name_words + defect_code_words
                right_labels = lpn_words + container_words + action_words
                
                col2_x0 = max(w[2] for w in left_labels) + 5
                col2_x1 = min(w[0] for w in right_labels) - 5 if right_labels else 320
                col4_x0 = max(w[2] for w in right_labels) + 5 if right_labels else 350
                col4_x1 = page.rect.width - 20
                
                if len(h_lines) >= 4:
                    r1_y0, r1_y1 = h_lines[0], h_lines[1]
                    r2_y0, r2_y1 = h_lines[1], h_lines[2]
                    r3_y0, r3_y1 = h_lines[2], h_lines[3]
                    table_bottom_y = h_lines[3]
                else:
                    r1_y0 = sku_words[0][1] - 5
                    r2_y0 = defect_name_words[0][1] - 5
                    r3_y0 = defect_code_words[0][1] - 5
                    r1_y1 = r2_y0
                    r2_y1 = r3_y0
                    r3_y1 = r3_y0 + 70
                    table_bottom_y = r3_y1

                r1_col2 = [w for w in words if r1_y0 <= w[1] < r1_y1 and col2_x0 <= w[0] < col2_x1]
                r1_col4 = [w for w in words if r1_y0 <= w[1] < r1_y1 and col4_x0 <= w[0] < col4_x1]
                r2_col2 = [w for w in words if r2_y0 <= w[1] < r2_y1 and col2_x0 <= w[0] < col2_x1]
                r2_col4 = [w for w in words if r2_y0 <= w[1] < r2_y1 and col4_x0 <= w[0] < col4_x1]
                r3_col2 = [w for w in words if r3_y0 <= w[1] < r3_y1 and col2_x0 <= w[0] < col2_x1]
                r3_col4 = [w for w in words if r3_y0 <= w[1] < r3_y1 and col4_x0 <= w[0] < col4_x1]

                if "sku" not in data or not data["sku"]: data["sku"] = _sort_and_join_cell_words(r1_col2).split("\n")
                if "lpn" not in data: data["lpn"] = _sort_and_join_cell_words(r1_col4).split("\n")
                if "defect_name" not in data or not data["defect_name"]: data["defect_name"] = _sort_and_join_cell_words(r2_col2).split("\n")
                if "container" not in data: data["container"] = _sort_and_join_cell_words(r2_col4).split("\n")
                if "defect_code" not in data or not data["defect_code"]: data["defect_code"] = _sort_and_join_cell_words(r3_col2).split("\n")
                if "action" not in data or not data["action"]: data["action"] = _sort_and_join_cell_words(r3_col4).split("\n")

        if table_bottom_y == 0:
            table_bottom_y = 145
        page_table_bottoms[page_num] = table_bottom_y

        # Chuẩn hóa dữ liệu theo mapping nghiêm ngặt
        sku_val = clean_and_standardize_sku(" ".join(data.get("sku", [])))
        dong_hang_val = extract_product_line_from_sku(sku_val)
        
        lpn_lines = data.get("lpn", [])
        lpn_val = ", ".join(" ".join(lpn_lines).split()) if lpn_lines else ""
        
        defect_name_lines = [l.strip() for l in data.get("defect_name", []) if l.strip()]
        defect_name_val = ", ".join(defect_name_lines)
        
        container_lines = data.get("container", [])
        container_val = " ".join(container_lines).strip()
        
        raw_dc = " ".join(data.get("defect_code", []))
        clean_codes = []
        for mc in re.finditer(r'\b([A-Za-z]{2,4})\s*[-_]?\s*(\d{2,3})\b', raw_dc):
            c_str = f"{mc.group(1).upper()}_{mc.group(2)}"
            if c_str not in clean_codes:
                clean_codes.append(c_str)
        defect_code_val = ", ".join(clean_codes) if clean_codes else raw_dc.replace('\n', ' ').strip()
        
        action_lines = [l.strip() for l in data.get("action", []) if l.strip()]
        action_raw = " ".join(action_lines)
        action_clean = re.sub(r'VIDEO\s*LINK:.*$', '', action_raw, flags=re.IGNORECASE | re.DOTALL).strip()
        action_val = normalize_penalty_value(action_clean)

        # Tiền phạt cụ thể (chỉ trích xuất nếu có số tiền cụ thể trong PDF)
        dollar_m = re.search(r'\$\s*(\d+(?:\.\d+)?)', action_clean)
        penalty_val = float(dollar_m.group(1)) if dollar_m else 0.0

        claim_data = {
            "stt": claim_no,
            "cabinet_no": claim_no,
            "claim_no": claim_no,
            "reference_prefix": "Claim",
            "mechanism_id": 3,
            "sku": sku_val,
            "dong_hang": dong_hang_val,
            "line": dong_hang_val,
            "product_line": dong_hang_val,
            "claim_description": defect_name_val,
            "defect_code": defect_code_val,
            "action": action_val,
            "lpn": lpn_val,
            "container_no": container_val,
            "period": period,
            "penalty": penalty_val,
            "source_page": page_num + 1,
            "image_paths": [],
            "image_captions": [],
            "photo_pages": []
        }
        claims.append(claim_data)

    parsed_count_before_dedup = len(claims)
    logger.info(f"[{filename}] Cơ chế 3: Đã parse được {parsed_count_before_dedup} claims (trước dedup)")

    # Deduplicate claims where all key fields are identical
    unique_claims = []
    duplicate_count = 0
    seen_in_file = set()
    for c in claims:
        c_no = c["claim_no"]
        data_fields = (
            str(c["sku"] or "").strip(),
            str(c["claim_description"] or "").strip(),
            str(c["defect_code"] or "").strip(),
            normalize_penalty_func(c["action"]) if normalize_penalty_func else str(c["action"] or "").strip(),
            str(c["lpn"] or "").strip(),
            str(c["container_no"] or "").strip(),
            str(c["period"] or "").strip()
        )
        key_with_claim = (c_no,) + data_fields
        is_dup_in_file = key_with_claim in seen_in_file
        is_dup_in_db = key_with_claim in seen_keys
        if is_dup_in_file or is_dup_in_db:
            duplicate_count += 1
            msg = f"Dòng Claim #{c_no} (STT {c['stt']}) bị trùng lặp dữ liệu hoàn toàn 100%."
            if msg not in parse_warnings:
                parse_warnings.append(msg)
        seen_in_file.add(key_with_claim)
        seen_keys.add(key_with_claim)
        unique_claims.append(c)

    for i, c in enumerate(unique_claims):
        c["stt"] = i + 1
        c["id"] = f"{batch_id}_{i + 1}"
    claims = unique_claims

    # Validate parsing results
    for c in claims:
        c_no = c["claim_no"]
        page_num = c["source_page"]
        if not c["sku"]:
            parse_warnings.append(f"Claim #{c_no} ở trang {page_num}: Thiếu mã SKU.")
        if not c["period"]:
            parse_warnings.append(f"Claim #{c_no} ở trang {page_num}: Thiếu kỳ báo cáo (Period).")
        if not c["action"]:
            parse_warnings.append(f"Claim #{c_no} ở trang {page_num}: Thiếu biện pháp xử lý (Action).")

    mechanism_info = {
        "id": 3,
        "name": "Cơ chế 3 (Label-Value Table)",
        "description": "Bảng claim dạng nhãn - giá trị và ảnh minh chứng nằm phía dưới thông tin claim"
    }

    if claims_only:
        doc.close()
        return claims, period or datetime.now().strftime("%m-%Y"), parse_warnings, mechanism_info

    # 3. Trích xuất ảnh minh chứng trên từng trang và trang nối tiếp
    claim_by_no = {c["claim_no"]: c for c in claims}
    current_claim_no = None

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        header_m = re.search(r'Claim\s*#\s*(\d+)', text, re.IGNORECASE)
        if header_m:
            current_claim_no = int(header_m.group(1))
            table_bottom_y = page_table_bottoms.get(page_num, 145) + 5
        else:
            table_bottom_y = 30

        if current_claim_no is None or current_claim_no not in claim_by_no:
            continue

        target_claim = claim_by_no[current_claim_no]
        image_infos = page.get_image_info(xrefs=True)
        if not image_infos:
            continue

        valid_images = [img for img in image_infos if img['bbox'][1] >= table_bottom_y and img['bbox'][2] - img['bbox'][0] > 20 and img['bbox'][3] - img['bbox'][1] > 20]
        valid_images.sort(key=lambda img: (round(img['bbox'][1] / 30) * 30, img['bbox'][0]))

        drawings = page.get_drawings()
        v_lines = [d['rect'] for d in drawings if d['rect'].y0 >= table_bottom_y - 10 and d['rect'].width <= 3 and d['rect'].height >= 30]
        h_lines = [d['rect'] for d in drawings if d['rect'].y0 >= table_bottom_y - 10 and d['rect'].height <= 3 and d['rect'].width >= 30]

        for img_idx, img in enumerate(valid_images):
            bx0, by0, bx1, by1 = img['bbox']
            left_cands = [vl.x0 for vl in v_lines if vl.x0 <= bx0 + 2 and abs(vl.x0 - bx0) < 25]
            right_cands = [vl.x1 for vl in v_lines if vl.x1 >= bx1 - 2 and abs(vl.x1 - bx1) < 25]
            top_cands = [hl.y0 for hl in h_lines if hl.y0 <= by0 + 2 and abs(hl.y0 - by0) < 25]
            bottom_cands = [hl.y1 for hl in h_lines if hl.y1 >= by1 - 2 and abs(hl.y1 - by1) < 25]

            crop_x0 = min(left_cands, key=lambda x: abs(x - bx0)) if left_cands else max(0, bx0 - 3)
            crop_x1 = min(right_cands, key=lambda x: abs(x - bx1)) if right_cands else min(page.rect.width, bx1 + 3)
            crop_y0 = min(top_cands, key=lambda y: abs(y - by0)) if top_cands else max(0, by0 - 3)
            crop_y1 = min(bottom_cands, key=lambda y: abs(y - by1)) if bottom_cands else min(page.rect.height, by1 + 3)

            crop_rect = fitz.Rect(crop_x0, crop_y0, crop_x1, crop_y1) & page.rect
            if crop_rect.is_empty or crop_rect.width < 5 or crop_rect.height < 5:
                crop_rect = fitz.Rect(bx0, by0, bx1, by1) & page.rect
            if crop_rect.is_empty or crop_rect.width < 5 or crop_rect.height < 5:
                continue

            try:
                if not os.path.exists(images_batch_dir):
                    os.makedirs(images_batch_dir, exist_ok=True)
                pix = page.get_pixmap(clip=crop_rect, dpi=150)
                is_continuation = page_num != (target_claim["source_page"] - 1)
                sub_num = len(target_claim["image_paths"]) + 1
                suffix = f"photo_cont_{sub_num}" if is_continuation else f"photo_{sub_num}"
                caption_desc = f"Ảnh nối tiếp {sub_num}" if is_continuation else f"Ảnh {sub_num}"
                img_filename = f"{pdf_name_clean}_claim_{current_claim_no}_page_{page_num + 1}_{suffix}.png"
                img_path = os.path.join(images_batch_dir, img_filename)
                pix.save(img_path)
                target_claim["image_paths"].append(f"/static/uploads/claim_imports/images/{batch_id}/{img_filename}")
                target_claim["image_captions"].append(f"Claim #{current_claim_no} ({caption_desc} trang {page_num + 1})")
                target_claim["photo_pages"].append(page_num + 1)
            except Exception as img_err:
                logger.warning(f"Lỗi khi lưu ảnh trang {page_num + 1} cho Claim #{current_claim_no}: {str(img_err)}")

    doc.close()
    logger.info(f"[{os.path.basename(pdf_path)}] Cơ chế 3: Kết quả cuối cùng = {len(claims)} claims")
    return claims, period or datetime.now().strftime("%m-%Y"), parse_warnings, mechanism_info

def calculate_total_penalty(action, sku, cabinet_prices_map) -> float:
    if not action:
        return 0.0
    action_str = str(action).strip().lower()
    sku_clean = str(sku).strip().lower() if sku else ""
    cabinet_prices_map = cabinet_prices_map or {}
    
    sale_price = cabinet_prices_map.get(sku_clean, 0.0)
    
    if any(k in action_str for k in ['x2 unit', 'x2unit', '2x unit', 'x2']):
        return float(sale_price * 2)
    elif any(k in action_str for k in ['full bc', 'ful bc']):
        return float(sale_price)
    else:
        try:
            money_match = re.search(r'\$\s*([\d,]+(?:\.\d+)?)', action_str)
            if money_match:
                return float(money_match.group(1).replace(',', ''))
            num_match = re.search(r'\b(\d+(?:\.\d+)?)\b', action_str)
            if num_match:
                return float(num_match.group(1))
        except Exception:
            pass
    return 0.0


def save_claims_to_excel(claims, excel_path, images_batch_dir=None, claim_imports_dir=None, resolve_company_func=None, cabinet_prices_map=None, resolve_company_name_func=None):
    """
    Saves the extracted claim records into a styled Excel file.
    Supports embedding defect photos directly in columns.
    
    Args:
        claims: List of claim records
        excel_path: Path to save Excel file
        images_batch_dir: Directory containing claim images
        claim_imports_dir: Base directory for claim imports
        resolve_company_func: Function to resolve company error codes
        cabinet_prices_map: Dictionary of cabinet codes to sale prices
        resolve_company_name_func: Function to resolve company error names
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Claims Report"
    
    # We keep a list of BytesIO streams to keep them alive until workbook is saved!
    keep_alive_streams = []
    
    # 1. Xác định số ảnh lớn nhất trong tập Claim để sinh cột hình ảnh động
    max_images = max([len(c.get("image_paths") or []) for c in claims] or [0])
    
    headers = [
        "STT", "Dòng hàng", "Mã tham chiếu", "Tên sản phẩm", "Mô tả", 
        "Mã lỗi KH", "Mã lỗi G7", "Tên lỗi G7", "Trạng thái", "Giá trị phạt", 
        "Tổng tiền phạt", "LPN", "Container", "Thời gian Claim"
    ]
    for i in range(1, max_images + 1):
        headers.append(f"Hình ảnh {i}")
    
    # Styled header block matching wood-brown dashboard color #5B3924
    header_fill = PatternFill(start_color="5B3924", end_color="5B3924", fill_type="solid")
    header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    center_align = Alignment(horizontal="center", vertical="center")
    
    ws.append(headers)
    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align
    
    # Freeze header row & add AutoFilter
    last_col_letter = openpyxl.utils.get_column_letter(len(headers))
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{last_col_letter}{max(len(claims) + 1, 2)}"
    
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    for idx, c in enumerate(claims):
        row_num = idx + 2 # Header is row 1
        
        # 1. STT
        ws.cell(row=row_num, column=1, value=c.get("stt") or (idx + 1)).alignment = Alignment(vertical="center", horizontal="center")
        
        # 2. Dòng hàng
        p_line = c.get("dong_hang") or c.get("product_line") or c.get("customer_name") or ""
        if not p_line and c.get("product_name") and "-" in c.get("product_name"):
            p_line = c.get("product_name").split("-")[0].strip()
        ws.cell(row=row_num, column=2, value=str(p_line)).alignment = Alignment(vertical="center", horizontal="center")
        
        # 3. Mã tham chiếu (Cabinet No)
        cabinet_no = c.get("claim_code") or c.get("cabinet_no") or ""
        if cabinet_no:
            import re
            cabinet_no_str = str(cabinet_no).strip()
            clean_cab_no = re.sub(r'^(Cabinet\s*#\s*)+', '', cabinet_no_str, flags=re.IGNORECASE)
            cabinet_no = f"Cabinet #{clean_cab_no}"
        cab_cell = ws.cell(row=row_num, column=3, value=str(cabinet_no))
        cab_cell.alignment = Alignment(vertical="center", horizontal="left")
        
        # 4. Tên sản phẩm (SKU)
        sku_cell = ws.cell(row=row_num, column=4, value=str(c.get("product_name") or c.get("sku") or ""))
        sku_cell.alignment = Alignment(vertical="center", horizontal="left")
        
        # 5. Mô tả
        desc_val = str(c.get("description") or c.get("claim_description") or "")
        desc_cell = ws.cell(row=row_num, column=5, value=desc_val)
        desc_cell.alignment = Alignment(vertical="center", horizontal="left")
        
        # 6. Mã lỗi KH
        defect_code_cell = ws.cell(row=row_num, column=6, value=str(c.get("order_code") or c.get("defect_code") or ""))
        defect_code_cell.alignment = Alignment(vertical="center", horizontal="center")
        
        # 7. Mã lỗi G7
        resolved_company_code = c.get("company_error_code") or ""
        if not resolved_company_code and resolve_company_func:
            resolved_company_code = resolve_company_func(c.get("defect_code") or c.get("order_code") or "")
        g7_code_cell = ws.cell(row=row_num, column=7, value=str(resolved_company_code or ""))
        g7_code_cell.alignment = Alignment(vertical="center", horizontal="center")
        
        # 8. Tên lỗi G7
        resolved_company_name = c.get("company_error_name") or ""
        if not resolved_company_name and resolve_company_name_func:
            resolved_company_name = resolve_company_name_func(c.get("defect_code") or c.get("order_code") or "")
        g7_name_cell = ws.cell(row=row_num, column=8, value=str(resolved_company_name or ""))
        g7_name_cell.alignment = Alignment(vertical="center", horizontal="center")
        
        # 9. Trạng thái
        status_val = str(c.get("status") or "")
        status_cell = ws.cell(row=row_num, column=9, value=status_val)
        status_cell.alignment = Alignment(vertical="center", horizontal="center")
        
        # 10. Giá trị phạt
        action_val = str(c.get("penalty") or c.get("action") or "")
        ws.cell(row=row_num, column=10, value=action_val).alignment = Alignment(vertical="center", horizontal="center")
        
        # 11. Tổng tiền phạt (Kiểu số thực USD, định dạng tiền tệ)
        tot_val = 0.0
        raw_tot = c.get("total_penalty")
        if raw_tot is not None:
            try:
                tot_val = float(str(raw_tot).replace("$", "").replace(",", "").strip())
            except Exception:
                tot_val = 0.0
        else:
            tot_val = float(calculate_total_penalty(action_val, c.get("sku") or c.get("product_name"), cabinet_prices_map) or 0.0)
            
        penalty_cell = ws.cell(row=row_num, column=11, value=tot_val)
        penalty_cell.number_format = '"$"#,##0.00'
        penalty_cell.alignment = Alignment(vertical="center", horizontal="right")
        
        # 12. LPN (Chuỗi Text để không mất số 0 đầu)
        lpn_val = str(c.get("lpn") or "")
        lpn_cell = ws.cell(row=row_num, column=12, value=lpn_val)
        lpn_cell.number_format = '@'
        lpn_cell.alignment = Alignment(vertical="center", horizontal="center")
        
        # 13. Container (Chuỗi Text để không mất số 0 đầu)
        cont_val = str(c.get("cont") or c.get("container_no") or "")
        cont_cell = ws.cell(row=row_num, column=13, value=cont_val)
        cont_cell.number_format = '@'
        cont_cell.alignment = Alignment(vertical="center", horizontal="center")
        
        # 14. Thời gian Claim (MM/YYYY)
        period_val = str(c.get("date") or c.get("period") or "")
        period_cell = ws.cell(row=row_num, column=14, value=period_val)
        period_cell.alignment = Alignment(vertical="center", horizontal="center")
        
        # 15+. Nhúng ảnh minh chứng động vào các cột hình ảnh
        claim_images = c.get("image_paths") or []
        has_embedded_image = False
        
        for img_idx, img_path in enumerate(claim_images):
            if not img_path:
                continue
            
            target_col = 15 + img_idx
            
            # Resolve image path
            raw_path = str(img_path)
            if raw_path.startswith("http://") or raw_path.startswith("https://"):
                from urllib.parse import urlparse
                raw_path = urlparse(raw_path).path

            local_img_path = None
            if "/static/" in raw_path:
                sub_path = raw_path.split("/static/")[-1]
                local_img_path = os.path.join(backend_dir, "static", sub_path.replace("/", os.sep))
            elif "/uploads/" in raw_path:
                sub_path = raw_path.split("/uploads/")[-1]
                local_img_path = os.path.join(backend_dir, "static", "uploads", sub_path.replace("/", os.sep))
            
            if (not local_img_path or not os.path.exists(local_img_path)) and claim_imports_dir and "/claim_imports/" in raw_path:
                sub_path = raw_path.split("/claim_imports/")[-1]
                local_img_path = os.path.join(claim_imports_dir, sub_path.replace("/", os.sep))
            
            if (not local_img_path or not os.path.exists(local_img_path)) and images_batch_dir:
                filename = raw_path.split("/")[-1]
                local_img_path = os.path.join(images_batch_dir, filename)
            
            if not local_img_path or not os.path.exists(local_img_path):
                if os.path.exists(raw_path) and os.path.isfile(raw_path):
                    local_img_path = raw_path
            
            if local_img_path and os.path.exists(local_img_path):
                try:
                    from PIL import Image as PILImage
                    pil_img = PILImage.open(local_img_path)
                    
                    # Resize thumbnail (max width 120px, max height 60px)
                    max_width = 120
                    max_height = 60
                    pil_img.thumbnail((max_width, max_height))
                    
                    import io
                    img_io = io.BytesIO()
                    pil_img.save(img_io, format='PNG')
                    img_io.seek(0)
                    keep_alive_streams.append(img_io)
                    
                    img = OpenpyxlImage(img_io)
                    col_letter = openpyxl.utils.get_column_letter(target_col)
                    cell_coordinate = f"{col_letter}{row_num}"
                    ws.add_image(img, cell_coordinate)
                    has_embedded_image = True
                except Exception as e:
                    logger.warning(f"Không thể nhúng ảnh {local_img_path} vào ô {target_col}:{row_num}: {str(e)}")
        
        if has_embedded_image:
            ws.row_dimensions[row_num].height = 65
            
    # Auto-adjust column sizes for standard 14 business columns + dynamic image columns
    column_min_widths = {
        1: 8,   # STT
        2: 14,  # Dòng hàng
        3: 20,  # Mã tham chiếu
        4: 18,  # Tên sản phẩm
        5: 25,  # Mô tả
        6: 14,  # Mã lỗi KH
        7: 14,  # Mã lỗi G7
        8: 22,  # Tên lỗi G7
        9: 14,  # Trạng thái
        10: 14, # Giá trị phạt
        11: 16, # Tổng tiền phạt
        12: 14, # LPN
        13: 16, # Container
        14: 16  # Thời gian Claim
    }
    
    for col_idx in range(1, 15):
        col_letter = openpyxl.utils.get_column_letter(col_idx)
        max_len = 0
        for cell in ws[col_letter]:
            val_str = str(cell.value or '')
            if len(val_str) > max_len:
                max_len = len(val_str)
        min_w = column_min_widths.get(col_idx, 12)
        ws.column_dimensions[col_letter].width = max(max_len + 3, min_w)
    
    # Set fixed column widths for all dynamic Image columns (15 to 14 + max_images)
    for img_i in range(1, max_images + 1):
        col_letter = openpyxl.utils.get_column_letter(14 + img_i)
        ws.column_dimensions[col_letter].width = 20
    
    wb.save(excel_path)
    
    # Close keep alive streams
    for stream in keep_alive_streams:
        try:
            stream.close()
        except:
            pass


def parse_pdf_claims_mechanism_4(pdf_path, batch_id, images_batch_dir, seen_keys=None, normalize_penalty_func=None, claims_only=False):
    """
    [CƠ CHẾ 4]
    Dành cho bảng dữ liệu Credit Note PDF (bảng 5 cột: STT, SKU/CLAIM, CONTAINER #, LPN, ACTION).
    Không chứa ảnh minh chứng lỗi, có tổng tiền phạt TOTAL CREDIT AMOUNT.
    Bảo toàn số 0 ở đầu LPN dạng chuỗi, xử lý các ô trống container/lpn, ghép nối đầy đủ các trang.
    """
    if seen_keys is None:
        seen_keys = set()
    if normalize_penalty_func is None:
        normalize_penalty_func = lambda x: x

    filename = os.path.basename(pdf_path)
    doc = fitz.open(pdf_path)

    full_text = ""
    page_texts = []
    for p in doc:
        pt = p.get_text()
        page_texts.append(pt)
        full_text += pt + "\n"

    factory = "VINA G7"
    m_fact = re.search(r'FACTORY\s*:\s*([^\r\n]+)', full_text, re.IGNORECASE)
    if m_fact:
        factory = m_fact.group(1).strip()

    credit_note_no = ""
    m_cn = re.search(r'CREDIT\s+NOTE\s*:\s*([A-Za-z0-9\-]+)', full_text, re.IGNORECASE)
    if m_cn:
        credit_note_no = m_cn.group(1).strip()

    date_issued = ""
    m_date = re.search(r'DATE\s+REPORT\s+ISSUED\s*:\s*([^\r\n]+)', full_text, re.IGNORECASE)
    if m_date:
        date_issued = m_date.group(1).strip()

    total_amount = 0.0
    m_amt = re.search(r'TOTAL\s+CREDIT\s+AMOUNT\s*[:\-]?\s*[\$]?\s*([\d,]+(?:\.\d+)?)', full_text, re.IGNORECASE)
    if not m_amt:
        m_amt = re.search(r'TOTAL\s+AMOUNT\s*[:\-]?\s*[\$]?\s*([\d,]+(?:\.\d+)?)', full_text, re.IGNORECASE)
    if m_amt:
        try:
            total_amount = float(m_amt.group(1).replace(",", ""))
        except ValueError:
            pass

    # Month extraction priority
    month_map = {
        "january": "01", "february": "02", "march": "03", "april": "04",
        "may": "05", "june": "06", "july": "07", "august": "08",
        "september": "09", "october": "10", "november": "11", "december": "12",
        "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
        "jul": "07", "aug": "08", "sep": "09", "sept": "09", "oct": "10", "nov": "11", "dec": "12"
    }
    parsed_month = None
    for pt in page_texts:
        top_lines = [l.strip() for l in pt.splitlines() if l.strip()][:6]
        for line in top_lines:
            if "DATE REPORT ISSUED" in line.upper():
                continue
            m_my = re.search(r'\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s*[-–\s\/]\s*(\d{4})\b', line, re.IGNORECASE)
            if m_my:
                m_digit = month_map.get(m_my.group(1).lower())
                if m_digit:
                    parsed_month = f"{m_digit}-{m_my.group(2)}"
                    break
            m_th = re.search(r'TH[AÁ]NG\s*(\d{1,2})\s*[-–\/]\s*(\d{4})', line, re.IGNORECASE)
            if m_th:
                parsed_month = f"{int(m_th.group(1)):02d}-{m_th.group(2)}"
                break
        if parsed_month:
            break

    if not parsed_month:
        m_meta = re.search(r'(?:CLAIM\s+MONTH|PERIOD|THÁNG\s+CLAIM)\s*[:\-]?\s*(\d{1,2})[-–\/](\d{4})', full_text, re.IGNORECASE)
        if m_meta:
            parsed_month = f"{int(m_meta.group(1)):02d}-{m_meta.group(2)}"

    if not parsed_month and filename:
        m_fn = re.search(r'[T_](\d{1,2})[_\-\s].*?(\d{4})', filename, re.IGNORECASE)
        if m_fn:
            parsed_month = f"{int(m_fn.group(1)):02d}-{m_fn.group(2)}"
        else:
            m_fn2 = re.search(r'(?:^|[^\d])(\d{1,2})[-_](\d{4})(?:[^\d]|$)', filename)
            if m_fn2:
                parsed_month = f"{int(m_fn2.group(1)):02d}-{m_fn2.group(2)}"

    period = parsed_month or "09-2026"
    clean_period = period.replace("-", "")

    claims = []
    ignore_patterns = [
        r'FACTORY:', r'CREDIT\s+NOTE:', r'DATE\s+REPORT\s+ISSUED:',
        r'TOTAL\s+CREDIT\s+AMOUNT', r'TOTAL\s+AMOUNT',
        r'STT\s+SKU', r'STT\tSKU'
    ]

    for page in doc:
        for raw_line in page.get_text().splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if any(re.search(pat, line, re.IGNORECASE) for pat in ignore_patterns):
                continue
            if re.match(r'^(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}$', line, re.IGNORECASE):
                continue
            stt_match = re.match(r'^(\d{1,3})\s+(.*)$', line)
            if not stt_match:
                continue
            stt_num = int(stt_match.group(1))
            rest = stt_match.group(2).strip()

            if '\t' in raw_line:
                parts = [p.strip() for p in raw_line.split('\t')]
                sku = parts[1] if len(parts) > 1 else ''
                container = parts[2] if len(parts) > 2 else ''
                lpn = parts[3] if len(parts) > 3 else ''
                action = parts[4] if len(parts) > 4 else ''
            else:
                tokens = rest.split()
                if not tokens:
                    continue
                sku = tokens[0]
                tokens = tokens[1:]
                container = ''
                lpn = ''
                action = ''
                if tokens and re.match(r'^[A-Za-z]{3,4}\d{6,7}$', tokens[0]):
                    container = tokens[0].upper()
                    tokens = tokens[1:]
                if tokens and re.match(r'^\d{7,12}$', tokens[0]):
                    lpn = str(tokens[0])
                    tokens = tokens[1:]
                action = ' '.join(tokens)

            claims.append({
                "cabinet_no": stt_num,
                "claim_no": stt_num,
                "stt": stt_num,
                "claim_code": f"Claim#{stt_num}_{clean_period}",
                "customer_name": factory,
                "sku": sku,
                "product_name": sku,
                "container_no": container,
                "lpn": str(lpn) if lpn else "",
                "action": action,
                "period": period,
                "status": "Mới",
                "defect_code": "Credit Note",
                "claim_description": f"Credit Note {credit_note_no} - Item {stt_num} ({sku})",
                "image_paths": [],
                "image_captions": [],
                "photo_pages": []
            })

    doc.close()
    parse_warnings = []
    mechanism_info = {
        "id": "mechanism_4",
        "name": "Cơ chế 4 (Credit Note Table)",
        "credit_note_no": credit_note_no,
        "factory": factory,
        "date_issued": date_issued,
        "total_credit_amount": total_amount,
        "currency": "USD"
    }
    return claims, period, parse_warnings, mechanism_info
