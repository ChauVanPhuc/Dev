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


def parse_pdf_claims(pdf_path, batch_id, images_batch_dir, seen_keys=None, normalize_penalty_func=None):
    """
    Parses claims from PDF using PyMuPDF coordinate-based sorting.
    Falls back to OCR if a page contains zero text.
    Extracts and crops defect photos from photo pages.
    
    Args:
        pdf_path: Path to PDF file
        batch_id: Batch identifier
        images_batch_dir: Directory to save cropped images
        seen_keys: Set of existing claim keys for deduplication
        normalize_penalty_func: Function to normalize penalty values (from shared.utils.claim_utils)
    """
    if seen_keys is None:
        seen_keys = set()
    
    if normalize_penalty_func is None:
        # Fallback if no function provided
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

    # Deduplicate claims where all key fields are identical
    unique_claims = []
    duplicate_count = 0
    for c in claims:
        try:
            cab_no = int(c["cabinet_no"]) if c["cabinet_no"] is not None else None
        except (ValueError, TypeError):
            cab_no = c["cabinet_no"]
        key = (
            cab_no,
            str(c["sku"] or "").strip(),
            str(c["claim_description"] or "").strip(),
            str(c["defect_code"] or "").strip(),
            normalize_penalty_func(c["action"]),
            str(c["lpn"] or "").strip(),
            str(c["container_no"] or "").strip(),
            str(c["period"] or "").strip()
        )
        if key not in seen_keys:
            seen_keys.add(key)
            unique_claims.append(c)
        else:
            duplicate_count += 1
    
    logger.info(f"Deduplication: {len(claims)} parsed -> {len(unique_claims)} unique ({duplicate_count} duplicates removed)")
            
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
    return claims, period or datetime.now().strftime("%m-%Y"), parse_warnings


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


def save_claims_to_excel(claims, excel_path, images_batch_dir=None, claim_imports_dir=None, resolve_company_func=None, cabinet_prices_map=None):
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
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Claims Report"
    
    headers = [
        "STT", "SKU", "Description", "Mã lỗi KH", "Mã lỗi G7", 
        "Action", "Tổng giá trị phạt", "LPN", "Container", 
        "Thời gian", "Cabinet No", "Hình ảnh 1", "Hình ảnh 2", "Hình ảnh 3"
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
        ws.cell(row=row_num, column=2, value=c.get("sku") or "")
        ws.cell(row=row_num, column=3, value=c.get("claim_description") or "")
        ws.cell(row=row_num, column=4, value=c.get("defect_code") or "")
        
        resolved_company_code = c.get("company_error_code") or ""
        if resolve_company_func:
            resolved_company_code = resolve_company_func(c.get("defect_code") or "")
        ws.cell(row=row_num, column=5, value=resolved_company_code)
        
        action_val = c.get("action") or ""
        ws.cell(row=row_num, column=6, value=action_val)
        
        # Calculate and format total penalty
        tot = calculate_total_penalty(action_val, c.get("sku"), cabinet_prices_map)
        ws.cell(row=row_num, column=7, value=f"${tot:.2f}")
        
        ws.cell(row=row_num, column=8, value=c.get("lpn") or "")
        ws.cell(row=row_num, column=9, value=c.get("container_no") or "")
        ws.cell(row=row_num, column=10, value=c.get("period") or "")
        
        cabinet_no = c.get("cabinet_no") or ""
        if cabinet_no and not str(cabinet_no).startswith("Cabinet #"):
            cabinet_no = f"Cabinet #{cabinet_no}"
        ws.cell(row=row_num, column=11, value=cabinet_no)
        
        # Set alignment for cells
        for col_num in range(1, 12):
            ws.cell(row=row_num, column=col_num).alignment = Alignment(vertical="center", horizontal="center")
            
        # Embed images if available
        if c.get("image_paths"):
            for img_idx, img_path in enumerate(c["image_paths"][:3]): # Max 3 images
                if not img_path:
                    continue
                # Try to resolve relative to CLAIM_IMPORTS_DIR
                local_img_path = None
                if claim_imports_dir and "/claim_imports/" in img_path:
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
                        img = OpenpyxlImage(local_img_path)
                        col_letter = openpyxl.utils.get_column_letter(12 + img_idx)
                        cell_coordinate = f"{col_letter}{row_num}"
                        ws.add_image(img, cell_coordinate)
                    except Exception as e:
                        logger.warning(f"Không thể chèn ảnh {local_img_path} vào Excel: {str(e)}")
                        
    # Auto-adjust column sizes for text columns (1 to 11)
    for col_idx in range(1, 12):
        col_letter = openpyxl.utils.get_column_letter(col_idx)
        max_len = 0
        for cell in ws[col_letter]:
            val_str = str(cell.value or '')
            if len(val_str) > max_len:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 10)
        
    # Set fixed column widths for Image columns
    ws.column_dimensions["L"].width = 20
    ws.column_dimensions["M"].width = 20
    ws.column_dimensions["N"].width = 20
    
    wb.save(excel_path)
