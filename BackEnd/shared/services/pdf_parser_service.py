# -*- coding: utf-8 -*-
import fitz  # PyMuPDF
import re
import os
import logging
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill
from openpyxl.drawing.image import Image as OpenpyxlImage

logger = logging.getLogger("pdf_parser")

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
    Router entrypoint function: detects PDF format and delegates parsing to Mechanism 1 or Mechanism 2.
    
    Mechanism 1 (standard): PDF has separate data pages (tables) and photo pages 
                            (identified by 'REFERENCE DEFECTS PHOTOS' header).
    Mechanism 2 (mixed):    PDF has combined data+photos on each page (no separate photo section).
    
    Returns:
        (claims, period, parse_warnings, mechanism_info)
        mechanism_info = {"id": 1 or 2, "name": "...", "description": "..."}
    """
    if seen_keys is None:
        seen_keys = set()
    
    if normalize_penalty_func is None:
        normalize_penalty_func = lambda x: x
    
    filename = os.path.basename(pdf_path)
    doc = fitz.open(pdf_path)
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
        logger.info(f"[{filename}] ✓ Phát hiện CƠ CHẾ 1 (standard PDF, trang ảnh riêng biệt phát hiện tại trang {detected_on_page})")
        return parse_pdf_claims_mechanism_1(pdf_path, batch_id, images_batch_dir, seen_keys, normalize_penalty_func, claims_only)
    else:
        logger.info(f"[{filename}] ✓ Phát hiện CƠ CHẾ 2 (mixed PDF, không có trang ảnh riêng biệt)")
        return parse_pdf_claims_mechanism_2(pdf_path, batch_id, images_batch_dir, seen_keys, normalize_penalty_func, claims_only)


def parse_pdf_claims_mechanism_1(pdf_path, batch_id, images_batch_dir, seen_keys=None, normalize_penalty_func=None, claims_only=False):
    """
    [CƠ CHẾ 1] - Gốc 100% nguyên bản không thay đổi dòng nào so với mã nguồn ban đầu của dự án.
    Dành riêng cho file định dạng cũ (Bảng claim ở các trang đầu, ảnh minh chứng có nhãn Cabinet riêng biệt ở các trang cuối).
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
            
        # If the page yields absolutely no text, try OCR fallback
        if not text.strip():
            logger.info(f"Page {page_num + 1} has no text. Trying OCR fallback...")
            try:
                # OCR=True requires Tesseract on the host system.
                text = page.get_text("text", ocr=True)
            except Exception as ocr_err:
                msg = f"OCR fallback failed on page {page_num + 1}: {str(ocr_err)}"
                logger.warning(msg)
                parse_warnings.append(msg)
                
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
                        
                    action_match = re.search(r'\b(PAY|REPLACE|REPAIR)\b.*', line, re.IGNORECASE)
                    if action_match:
                        actions.append(action_match.group(0).strip())
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
                
            # Clean and join actions
            cleaned_actions = []
            for act in actions:
                act_clean = re.sub(r'\bPAY\b', '', act, flags=re.IGNORECASE).strip()
                if re.match(r'^\d+$', act_clean):
                    act_clean = f"${act_clean}"
                act_clean = re.sub(r'\s+', ' ', act_clean).strip()
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
        "description": "Bảng claim ở các trang đầu, ảnh minh chứng ở các trang cuối"
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
                
            y_end = rect.y1 + 5
            
            # Validate crop area dimensions
            if y_end - y_start < 5:
                msg = f"Phân vùng cắt cho Cabinet #{cab_no} ở trang {page_num + 1} quá nhỏ (chiều cao: {y_end - y_start:.1f}px)."
                logger.warning(msg)
                parse_warnings.append(msg)
                continue  # Skip this caption entirely, dimensions are invalid
                
            # Perform crop and save
            try:
                x_start = max(0, 30)
                x_end = max(x_start + 1, page.rect.width - 30)
                y_start_clamped = max(0, y_start)
                y_end_clamped = min(page.rect.height, y_end)
                
                if y_end_clamped <= y_start_clamped or x_end <= x_start:
                    msg = f"Phân vùng cắt cho Cabinet #{cab_no} ở trang {page_num + 1} có kích thước không hợp lệ."
                    logger.warning(msg)
                    parse_warnings.append(msg)
                    continue
                
                crop_rect = fitz.Rect(x_start, y_start_clamped, x_end, y_end_clamped)
                crop_rect = crop_rect & page.rect  # Clamp to page bounds
                
                if crop_rect.is_empty or crop_rect.width < 1 or crop_rect.height < 1:
                    msg = f"Phân vùng cắt cho Cabinet #{cab_no} ở trang {page_num + 1} rỗng sau khi giới hạn."
                    logger.warning(msg)
                    parse_warnings.append(msg)
                    continue
                
                pix = page.get_pixmap(clip=crop_rect, dpi=150)
                img_filename = f"cabinet_{cab_no}_page_{page_num + 1}.png"
                img_path = os.path.join(images_batch_dir, img_filename)
                pix.save(img_path)
                
                # Map to claim records
                mapped = False
                for c in claims:
                    if c["cabinet_no"] == cab_no:
                        c["image_paths"].append(f"/static/uploads/claim_imports/images/{batch_id}/{img_filename}")
                        c["image_captions"].append(caption_str)
                        c["photo_pages"].append(page_num + 1)
                        mapped = True
                        
                # Fallback mapping by SKU/Description similarity
                if not mapped and current_caption["match_obj"]:
                    sku_cap = current_caption["match_obj"].group(2).strip().lower()
                    for c in claims:
                        if c["sku"].lower() in sku_cap or sku_cap in c["sku"].lower():
                            c["image_paths"].append(f"/static/uploads/claim_imports/images/{batch_id}/{img_filename}")
                            c["image_captions"].append(caption_str)
                            c["photo_pages"].append(page_num + 1)
                            mapped = True
            except Exception as img_err:
                msg = f"Bỏ qua ảnh Cabinet #{cab_no} trang {page_num + 1} (lỗi kích thước): {str(img_err)}"
                logger.warning(msg)
                parse_warnings.append(msg)
                
    doc.close()
    logger.info(f"[{os.path.basename(pdf_path)}] Cơ chế 1: Kết quả cuối cùng = {len(claims)} claims")
    return claims, period or datetime.now().strftime("%m-%Y"), parse_warnings, mechanism_info


def parse_pdf_claims_mechanism_2(pdf_path, batch_id, images_batch_dir, seen_keys=None, normalize_penalty_func=None, claims_only=False):
    """
    [CƠ CHẾ 2] - Cơ chế mới dành riêng cho file dạng hỗn hợp vừa có bảng claim vừa có ảnh trên từng trang (như file 1111.pdf).
    Xử lý việc cắt ảnh theo các khung viền đen tự động và phân bổ các trang ảnh nối tiếp (overflow) một cách độc lập.
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
            logger.info(f"Page {page_num + 1} has no text. Trying OCR fallback...")
            try:
                text = page.get_text("text", ocr=True)
            except Exception as ocr_err:
                msg = f"OCR fallback failed on page {page_num + 1}: {str(ocr_err)}"
                logger.warning(msg)
                parse_warnings.append(msg)
        
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
                        
                    action_match = re.search(r'\b(PAY|REPLACE|REPAIR)\b.*', line, re.IGNORECASE)
                    if action_match:
                        actions.append(action_match.group(0).strip())
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
                act_clean = re.sub(r'\bPAY\b', '', act, flags=re.IGNORECASE).strip()
                if re.match(r'^\d+$', act_clean):
                    act_clean = f"${act_clean}"
                act_clean = re.sub(r'\s+', ' ', act_clean).strip()
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
        "name": "Cơ chế 2 (Mixed)",
        "description": "Bảng claim và ảnh minh chứng trộn lẫn trên từng trang"
    }

    if claims_only:
        doc.close()
        return claims, period or datetime.now().strftime("%m-%Y"), parse_warnings, mechanism_info

    # 2. Xử lý cắt ảnh theo Cơ chế 2 (Mixed pages & overflow pages)
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
                                name_suffix = "continuation" if is_continuation else "mixed"
                                caption_desc = "Ảnh bổ sung" if is_continuation else "Ảnh minh chứng"
                                
                                img_filename = f"{pdf_name_clean}_cabinet_{cab_no}_page_{page_num + 1}_{name_suffix}.png"
                                img_path = os.path.join(images_batch_dir, img_filename)
                                pix.save(img_path)
                                
                                c["image_paths"].append(f"/static/uploads/claim_imports/images/{batch_id}/{img_filename}")
                                c["image_captions"].append(f"Cabinet #{cab_no} ({caption_desc} trang {page_num + 1})")
                                c["photo_pages"].append(page_num + 1)
                                
                except Exception as img_err:
                    logger.warning(f"Bỏ qua cắt ảnh hỗn hợp trang {page_num + 1} cho Cabinet #{c['cabinet_no']}: {str(img_err)}")

    doc.close()
    logger.info(f"[{os.path.basename(pdf_path)}] Cơ chế 2: Kết quả cuối cùng = {len(claims)} claims")
    return claims, period or datetime.now().strftime("%m-%Y"), parse_warnings, mechanism_info


def calculate_total_penalty(action, sku, cabinet_prices_map) -> float:
    if not action:
        return 0.0
    action_str = str(action).strip().lower()
    sku_clean = str(sku).strip().lower() if sku else ""
    cabinet_prices_map = cabinet_prices_map or {}
    
    # Check if we need to get price from map
    sale_price = cabinet_prices_map.get(sku_clean, 0.0)
    
    if any(k in action_str for k in ['x2 unit', 'x2unit', '2x unit', 'x2']):
        return float(sale_price * 2)
    elif any(k in action_str for k in ['full bc', 'ful bc']):
        return float(sale_price)
    else:
        # Extract number if it's money
        try:
            num_str = re.sub(r'[^0-9.]', '', action_str)
            if num_str:
                return float(num_str)
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
    
    headers = [
        "STT", "Dòng hàng", "Mã tham chiếu", "Tên sản phẩm", "Mô tả", "Mã lỗi KH", "Mã lỗi G7", "Tên lỗi G7", 
        "Mức độ", "Trạng thái", "Giá trị phạt", "Tổng tiền phạt", "LPN", "Container", 
        "Thời gian Claim", "Hình ảnh 1", "Hình ảnh 2", "Hình ảnh 3"
    ]
    
    # Styled header block matching wood-brown dashboard color #7B5233
    header_fill = PatternFill(start_color="7B5233", end_color="7B5233", fill_type="solid")
    header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    center_align = Alignment(horizontal="center", vertical="center")
    
    ws.append(headers)
    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align
    
    for idx, c in enumerate(claims):
        row_num = idx + 2 # Header is row 1
        
        # Write values directly to cells
        ws.cell(row=row_num, column=1, value=c.get("stt") or (idx + 1))
        ws.cell(row=row_num, column=2, value=c.get("customer_name") or "")
        
        # 3. Mã tham chiếu (Cabinet No) standing before SKU
        cabinet_no = c.get("cabinet_no") or ""
        if cabinet_no:
            import re
            cabinet_no_str = str(cabinet_no).strip()
            # Clean up all repeated Cabinet# or Cabinet # prefixes at start
            clean_cab_no = re.sub(r'^(Cabinet\s*#\s*)+', '', cabinet_no_str, flags=re.IGNORECASE)
            cabinet_no = f"Cabinet #{clean_cab_no}"
        ws.cell(row=row_num, column=3, value=cabinet_no)
        
        ws.cell(row=row_num, column=4, value=c.get("sku") or "")
        ws.cell(row=row_num, column=5, value=c.get("claim_description") or "")
        ws.cell(row=row_num, column=6, value=c.get("defect_code") or "")
        
        resolved_company_code = c.get("company_error_code") or ""
        if resolve_company_func:
            resolved_company_code = resolve_company_func(c.get("defect_code") or "")
        ws.cell(row=row_num, column=7, value=resolved_company_code)
        
        # New column: Tên lỗi G7
        resolved_company_name = ""
        if resolve_company_name_func:
            resolved_company_name = resolve_company_name_func(c.get("defect_code") or "")
        ws.cell(row=row_num, column=8, value=resolved_company_name)
        
        ws.cell(row=row_num, column=9, value=c.get("severity") or "")
        ws.cell(row=row_num, column=10, value=c.get("status") or "")
        
        action_val = c.get("action") or ""
        ws.cell(row=row_num, column=11, value=action_val)
        
        # Calculate and format total penalty
        tot = calculate_total_penalty(action_val, c.get("sku"), cabinet_prices_map)
        ws.cell(row=row_num, column=12, value=f"${tot:.2f}")
        
        ws.cell(row=row_num, column=13, value=c.get("lpn") or "")
        ws.cell(row=row_num, column=14, value=c.get("container_no") or "")
        ws.cell(row=row_num, column=15, value=c.get("period") or "")
        
        # Set alignment for cells
        for col_num in range(1, 16):
            ws.cell(row=row_num, column=col_num).alignment = Alignment(vertical="center", horizontal="center")
            
        # Embed images if available
        if c.get("image_paths"):
            for img_idx, img_path in enumerate(c["image_paths"][:3]): # Max 3 images
                if not img_path:
                    continue
                local_img_path = None
                if "/static/" in img_path:
                    # Dynamically resolve relative to BackEnd/static/ directory
                    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                    sub_path = img_path.split("/static/")[-1]
                    local_img_path = os.path.join(backend_dir, "static", sub_path.replace("/", os.sep))
                
                # Fallback to claim_imports_dir legacy resolution
                if (not local_img_path or not os.path.exists(local_img_path)) and claim_imports_dir and "/claim_imports/" in img_path:
                    sub_path = img_path.split("/claim_imports/")[-1]
                    local_img_path = os.path.join(claim_imports_dir, sub_path.replace("/", os.sep))
                
                # Fallback to images_batch_dir
                if (not local_img_path or not os.path.exists(local_img_path)) and images_batch_dir:
                    filename = img_path.split("/")[-1]
                    local_img_path = os.path.join(images_batch_dir, filename)
                
                # Check if it is already a valid absolute path
                if not local_img_path or not os.path.exists(local_img_path):
                    if os.path.exists(img_path) and os.path.isfile(img_path):
                        local_img_path = img_path
                
                if local_img_path and os.path.exists(local_img_path):
                    try:
                        from PIL import Image as PILImage
                        pil_img = PILImage.open(local_img_path)
                        
                        # Resize to max width 120px to optimize Excel file size (from 320MB down to ~3MB)
                        max_width = 120
                        if pil_img.width > max_width:
                            w_percent = (max_width / float(pil_img.width))
                            h_size = int((float(pil_img.height) * float(w_percent)))
                            resample_filter = getattr(PILImage, 'Resampling', None)
                            filter_type = resample_filter.LANCZOS if resample_filter else PILImage.ANTIALIAS
                            pil_img = pil_img.resize((max_width, h_size), filter_type)
                            
                        import io
                        img_io = io.BytesIO()
                        pil_img.save(img_io, format='PNG')
                        img_io.seek(0)
                        keep_alive_streams.append(img_io)
                        
                        img = OpenpyxlImage(img_io)
                        col_letter = openpyxl.utils.get_column_letter(16 + img_idx)
                        cell_coordinate = f"{col_letter}{row_num}"
                        ws.add_image(img, cell_coordinate)
                    except Exception as e:
                        logger.warning(f"Không thể chèn ảnh {local_img_path} vào Excel: {str(e)}")
                        
    # Auto-adjust column sizes for text columns (1 to 15)
    for col_idx in range(1, 16):
        col_letter = openpyxl.utils.get_column_letter(col_idx)
        max_len = 0
        for cell in ws[col_letter]:
            val_str = str(cell.value or '')
            if len(val_str) > max_len:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 10)
        
    # Set fixed column widths for Image columns
    ws.column_dimensions["P"].width = 20
    ws.column_dimensions["Q"].width = 20
    ws.column_dimensions["R"].width = 20
    
    wb.save(excel_path)
    
    # Close keep alive streams
    for stream in keep_alive_streams:
        try:
            stream.close()
        except:
            pass
