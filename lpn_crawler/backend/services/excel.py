# -*- coding: utf-8 -*-
import os
from typing import List, Dict, Any
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.drawing.image import Image as OpenpyxlImage
from PIL import Image as PILImage
from lpn_crawler.backend.config.settings import settings

def generate_excel_export(containers_data: List[Dict[str, Any]], export_filename: str = "lpn_export.xlsx") -> str:
    """
    Xuất file Excel đầy đủ dữ liệu text và hình ảnh chèn trực tiếp (embedded images)
    giữ nguyên tỷ lệ Aspect Ratio và tự động tính chiều cao dòng phù hợp.
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Dữ liệu LPN Container"

    # Style Header
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="7B5233", end_color="7B5233", fill_type="solid")
    center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align = Alignment(horizontal="left", vertical="center", wrap_text=True)
    thin_border = Border(
        left=Side(style='thin', color='D3D3D3'),
        right=Side(style='thin', color='D3D3D3'),
        top=Side(style='thin', color='D3D3D3'),
        bottom=Side(style='thin', color='D3D3D3')
    )

    # 1. Thu thập số lượng ảnh tối đa trên 1 record item
    max_pictures = 1
    flat_rows = []

    for cont in containers_data:
        items = cont.get("items", [])
        if not items:
            # Container không có items
            flat_rows.append({
                "container_number": cont.get("container_number", ""),
                "factory": cont.get("factory", ""),
                "date_loading": str(cont.get("date_loading", "") or cont.get("date_loading_raw", "") or ""),
                "timestamp": str(cont.get("timestamp_val", "") or cont.get("timestamp_raw", "") or ""),
                "operator_name": cont.get("operator_name", ""),
                "record_type": "",
                "suffix_key": "",
                "batch_resolved": "",
                "batch_original": "",
                "lpn": "",
                "sku": "",
                "images": []
            })
        else:
            for item in items:
                imgs = item.get("images", [])
                if len(imgs) > max_pictures:
                    max_pictures = len(imgs)
                flat_rows.append({
                    "container_number": cont.get("container_number", ""),
                    "factory": cont.get("factory", ""),
                    "date_loading": str(cont.get("date_loading", "") or cont.get("date_loading_raw", "") or ""),
                    "timestamp": str(cont.get("timestamp_val", "") or cont.get("timestamp_raw", "") or ""),
                    "operator_name": cont.get("operator_name", ""),
                    "record_type": item.get("record_type", ""),
                    "suffix_key": item.get("suffix_key", ""),
                    "batch_resolved": item.get("batch_resolved", ""),
                    "batch_original": item.get("batch_original", ""),
                    "lpn": item.get("lpn", ""),
                    "sku": item.get("sku", ""),
                    "images": imgs
                })

    # 2. Xây dựng Header Columns (AppSheet Original Terminology)
    headers = [
        "STT", "Container number", "Factory", "Date loading", "Timestamp",
        "Operator name", "Record Type", "Suffix Key", "Batch (Resolved)",
        "Batch (Original)", "LPN", "SKU"
    ]
    for i in range(1, max_pictures + 1):
        headers.append(f"Picture {i}")

    ws.append(headers)

    # Apply Header Styles
    for col_num in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align
        cell.border = thin_border
    ws.row_dimensions[1].height = 28

    # 3. Điền dữ liệu & chèn ảnh
    max_box_w = 140.0  # Max width in pixels
    max_box_h = 95.0   # Max height in pixels

    for idx, r_data in enumerate(flat_rows, start=1):
        row_num = idx + 1
        row_values = [
            idx,
            r_data["container_number"],
            r_data["factory"],
            r_data["date_loading"],
            r_data["timestamp"],
            r_data["operator_name"],
            r_data["record_type"],
            r_data["suffix_key"],
            r_data["batch_resolved"],
            r_data["batch_original"],
            r_data["lpn"],
            r_data["sku"]
        ]
        ws.append(row_values)

        # Style text cells
        for c_idx in range(1, 13):
            cell = ws.cell(row=row_num, column=c_idx)
            cell.alignment = center_align if c_idx in [1, 4, 5, 7, 8] else left_align
            cell.border = thin_border

        # Embed Images
        max_img_h_pt = 20.0  # Minimum row height
        imgs_list = r_data["images"]

        for i_idx, img_info in enumerate(imgs_list):
            col_target = 13 + i_idx
            local_path = img_info.get("local_path")
            if not local_path:
                continue

            abs_img_path = os.path.join(settings.PROJECT_ROOT, local_path)
            if not os.path.exists(abs_img_path):
                continue

            try:
                # Open with PIL to calculate aspect ratio
                with PILImage.open(abs_img_path) as pil_img:
                    orig_w, orig_h = pil_img.size

                if orig_w <= 0 or orig_h <= 0:
                    continue

                # Aspect ratio scaling
                scale = min(max_box_w / float(orig_w), max_box_h / float(orig_h))
                new_w = int(orig_w * scale)
                new_h = int(orig_h * scale)

                # Openpyxl Image
                img_obj = OpenpyxlImage(abs_img_path)
                img_obj.width = new_w
                img_obj.height = new_h

                cell_address = ws.cell(row=row_num, column=col_target).coordinate
                ws.add_image(img_obj, cell_address)

                # Convert height pixels to Excel points (~ 0.75 pt/px)
                height_pt = new_h * 0.75
                if height_pt > max_img_h_pt:
                    max_img_h_pt = height_pt

            except Exception as img_err:
                print(f"Error embedding image in excel row {row_num}: {img_err}")

        # Set row height based on tallest image
        ws.row_dimensions[row_num].height = max(max_img_h_pt + 10, 24)

    # 4. Set column widths
    col_widths = {
        1: 6, 2: 20, 3: 18, 4: 15, 5: 20, 6: 18, 7: 14, 8: 15, 9: 16, 10: 16, 11: 18, 12: 18
    }
    for col_idx, width in col_widths.items():
        col_letter = openpyxl.utils.get_column_letter(col_idx)
        ws.column_dimensions[col_letter].width = width

    for p_idx in range(1, max_pictures + 1):
        col_letter = openpyxl.utils.get_column_letter(12 + p_idx)
        ws.column_dimensions[col_letter].width = 22

    # Save to storage/exports
    export_path = os.path.join(settings.STORAGE_EXPORTS_DIR, export_filename)
    wb.save(export_path)
    return export_path
