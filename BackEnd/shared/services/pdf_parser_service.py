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

def _split_composite_image_if_needed(img_path, images_batch_dir, cab_no, page_num, batch_id, caption_str, target_claims):
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
    text_blocks.sort(key=lambda b: b[1])
    rows = []
    for b in text_blocks:
        x0, y0, x1, y1, text_content, block_no, block_type = b
        text_content = text_content.strip()
        if not text_content:
            continue
            
        placed = False
        y_center = (y0 + y1) / 2
        
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
            
    for row in rows:
        row.sort(key=lambda b: b[0])
    return rows

def parse_pdf_claims(pdf_path, batch_id, images_batch_dir, claims_only=False):
    doc = fitz.open(pdf_path)
    claims = []
    period = None
    warnings = []

    if len(doc) == 0:
        doc.close()
        return claims, period, warnings, {"name": "Không xác định", "type": "warning"}

    # Extract month/year from doc text if available
    month_map = {
        "january": "01", "february": "02", "march": "03", "april": "04",
        "may": "05", "june": "06", "july": "07", "august": "08",
        "september": "09", "october": "10", "november": "11", "december": "12"
    }

    full_text = ""
    for page in doc:
        full_text += page.get_text() + "\n"

    month_match = re.search(r'\b(january|february|march|april|may|june|july|august|september|october|november|december)\s*[-–\s]\s*(\d{4})\b', full_text, re.IGNORECASE)
    if month_match:
        m_digit = month_map.get(month_match.group(1).lower())
        if m_digit:
            period = f"{m_digit}-{month_match.group(2)}"
            
    if not period:
        thang_match = re.search(r'TH[AÁ]NG\s*(\d{1,2})\s*[-–\/]\s*(\d{4})', full_text, re.IGNORECASE)
        if thang_match:
            period = f"{int(thang_match.group(1)):02d}-{thang_match.group(2)}"

    # Parse rows by iterating pages
    for page_idx, page in enumerate(doc, 1):
        blocks = page.get_text("blocks")
        rows = group_blocks_into_rows(blocks)

        for row in rows:
            row_text = " ".join([b[4].strip() for b in row if b[4].strip()])
            
            # Match SKU / Cabinet No pattern
            if "SKU" in row_text.upper() or "CABINET" in row_text.upper():
                # Extract SKU
                sku_m = re.search(r'\b([A-Z0-9]{3,8}-[A-Z0-9]{2,6}(?:-[A-Z0-9]{2,6})?)\b', row_text, re.IGNORECASE)
                sku = sku_m.group(1).upper() if sku_m else ""
                
                # Extract Cabinet No
                cab_m = re.search(r'Cabinet\s*#?\s*(\d+)', row_text, re.IGNORECASE)
                cab_no = int(cab_m.group(1)) if cab_m else None
                
                # Extract Action / Penalty
                action_m = re.search(r'\b(PENALTY|REPAIR|REPLACEMENT|CREDIT|FULL BC|BC|X2)\b', row_text, re.IGNORECASE)
                action = action_m.group(1).upper() if action_m else "PENALTY"

                # Extract LPN / Container
                lpn_m = re.search(r'\b(LPN[A-Z0-9_-]+)\b', row_text, re.IGNORECASE)
                lpn = lpn_m.group(1) if lpn_m else ""
                
                cont_m = re.search(r'\b([A-Z]{4}\d{7})\b', row_text)
                cont = cont_m.group(1) if cont_m else ""

                if sku or cab_no:
                    claims.append({
                        "stt": len(claims) + 1,
                        "customer_name": "Atlas",
                        "cabinet_no": cab_no,
                        "sku": sku or "N/A",
                        "product_name": sku or "N/A",
                        "claim_description": row_text,
                        "defect_code": "",
                        "company_error_code": "",
                        "severity": "Medium",
                        "status": "Received",
                        "action": action,
                        "lpn": lpn,
                        "container_no": cont,
                        "period": period or datetime.now().strftime("%m-%Y"),
                        "image_paths": [],
                        "image_captions": [],
                        "photo_pages": []
                    })

    # Extract images from PDF pages and associate with claims
    if not claims_only and claims and os.path.exists(images_batch_dir):
        for page_idx, page in enumerate(doc, 1):
            image_list = page.get_images()
            for img_index, img in enumerate(image_list):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                
                img_filename = f"page_{page_idx}_img_{img_index}.{image_ext}"
                img_path = os.path.join(images_batch_dir, img_filename)
                
                with open(img_path, "wb") as f_img:
                    f_img.write(image_bytes)

                rel_path = f"/static/uploads/claim_imports/images/{batch_id}/{img_filename}"

                # Assign image to corresponding claim by page index
                for c in claims:
                    if len(c["image_paths"]) < 3:
                        c["image_paths"].append(rel_path)
                        c["image_captions"].append(f"Page {page_idx} Image {img_index+1}")

    doc.close()
    mechanism = {"name": "Cơ chế 1 (Trắc xuất bảng & ảnh)", "type": "mechanism_1"}
    return claims, period, warnings, mechanism

def calculate_total_penalty(action: str, sku: str, price_map: dict) -> float:
    action_str = str(action or '').upper()
    sku_str = str(sku or '').strip().upper()

    if '$' in action_str:
        m = re.search(r'\$?([\d,]+(?:\.\d+)?)', action_str)
        if m:
            try:
                return float(m.group(1).replace(',', ''))
            except:
                pass

    price = price_map.get(sku_str, 0.0) if price_map else 0.0
    if 'X2' in action_str:
        return price * 2
    elif 'FULL BC' in action_str or 'BC' in action_str:
        return price
    elif 'REPAIR' in action_str:
        return 50.0
    return price if price > 0 else 0.0
