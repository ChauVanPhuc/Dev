"""
Service xuất file Excel chuẩn mẫu Phiếu Xưởng ("BẢNG LIỆT KÊ CHI TIẾT")
cho phân hệ Hôm nay sản xuất gì (/admin/daily-production).
"""

import math
from io import BytesIO
from typing import Any, Dict, List, Optional, Union

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter


FONT_FAMILY = "Times New Roman"

# Độ rộng cột chuẩn cho khổ giấy A4 ngang (11 cột: A -> K)
COLUMN_WIDTHS = {
    1: 9.5,   # A: CONT
    2: 9.5,   # B: MÀU
    3: 11.5,  # C: STT
    4: 22.0,  # D: NGUYÊN LIỆU
    5: 25.0,  # E: SẢN PHẨM / CHI TIẾT
    6: 7.5,   # F: Dày
    7: 8.5,   # G: Rộng
    8: 8.5,   # H: Dài
    9: 7.5,   # I: SET
    10: 10.5, # J: SLKH
    11: 28.0, # K: GHI CHÚ
}


def _parse_number(val: Any) -> Union[int, float, str]:
    """Chuyển chuỗi số về int/float gọn đẹp (tránh .0 thừa), giữ nguyên nếu là chữ."""
    if val is None or val == "":
        return ""
    if isinstance(val, bool):
        return int(val)
    if isinstance(val, int):
        return val
    if isinstance(val, float):
        return int(val) if val.is_integer() else round(val, 2)
    s = str(val).strip()
    if not s:
        return ""
    try:
        f = float(s.replace(",", ""))
        return int(f) if f.is_integer() else round(f, 2)
    except ValueError:
        return s


def _estimate_wrapped_lines(text: Any, col_width: float) -> int:
    """Ước lượng số dòng sau khi wrap_text để đặt chiều cao hàng không bị cắt chữ."""
    if not text:
        return 1
    raw = str(text)
    effective_chars = max(8, int(col_width * 0.92))
    total_lines = 0
    for paragraph in raw.splitlines() or [""]:
        if not paragraph:
            total_lines += 1
        else:
            total_lines += max(1, math.ceil(len(paragraph) / effective_chars))
    return max(1, total_lines)


def _apply_border_range(ws, min_row: int, max_row: int, min_col: int, max_col: int, border: Border) -> None:
    """Áp viền đồng đều cho toàn bộ các ô trong vùng (bao gồm cả ô đã merge)."""
    for r in range(min_row, max_row + 1):
        for c in range(min_col, max_col + 1):
            ws.cell(row=r, column=c).border = border


def build_daily_production_excel(batch_data: Dict[str, Any]) -> BytesIO:
    """
    Tạo workbook Excel (.xlsx) chuẩn mẫu Phiếu Xưởng từ dữ liệu chi tiết 1 batch.
    Trả về BytesIO sẵn sàng stream về client.
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "BangLietKeChiTiet"

    # Tắt gridlines mặc định của Excel để bảng kẻ viền nổi bật sắc nét
    ws.views.sheetView[0].showGridLines = True

    # Khởi tạo các Style chuẩn Times New Roman
    thin_black = Side(style="thin", color="000000")
    medium_black = Side(style="medium", color="000000")

    border_thin_all = Border(left=thin_black, right=thin_black, top=thin_black, bottom=thin_black)
    border_header = Border(left=thin_black, right=thin_black, top=thin_black, bottom=thin_black)
    border_cabinet = Border(left=thin_black, right=thin_black, top=medium_black, bottom=thin_black)

    font_title_main = Font(name=FONT_FAMILY, size=16, bold=True, color="000000")
    font_title_sub = Font(name=FONT_FAMILY, size=13, bold=True, color="000000")
    font_tbl_header = Font(name=FONT_FAMILY, size=11, bold=True, color="000000")
    font_tbl_sub_header = Font(name=FONT_FAMILY, size=10.5, bold=True, color="000000")

    font_cab_bold = Font(name=FONT_FAMILY, size=13, bold=True, color="000000")
    font_cab_note = Font(name=FONT_FAMILY, size=10.5, bold=False, color="000000")

    font_cont_detail = Font(name=FONT_FAMILY, size=12, bold=True, color="000000")
    font_detail_regular = Font(name=FONT_FAMILY, size=11, bold=False, color="000000")
    font_detail_note = Font(name=FONT_FAMILY, size=10, bold=False, color="000000")

    fill_header = PatternFill(start_color="F2F2F2", end_color="F2F2F2", fill_type="solid")
    fill_cabinet = PatternFill(start_color="F7F7F7", end_color="F7F7F7", fill_type="solid")

    align_center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    align_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    align_stt_parent = Alignment(horizontal="left", vertical="center", indent=1)
    align_stt_child = Alignment(horizontal="right", vertical="center", indent=1)

    # 1. KHỐI TIÊU ĐỀ PHIẾU (Dòng 1 - 3, gộp A:K căn giữa)
    section_name = str(batch_data.get("section_name") or "TẤT CẢ").strip().upper()
    batch_title = str(batch_data.get("batch_title") or "").strip()
    factory = str(batch_data.get("factory") or "").strip()
    plan_date = str(batch_data.get("plan_date") or "").strip()
    line_summary = str(
        batch_data.get("line_color_summary")
        or f"Nhà máy {factory} - Ngày {plan_date}"
    ).strip()

    ws.merge_cells("A1:K1")
    ws["A1"] = f"BẢNG LIỆT KÊ CHI TIẾT - {section_name}"
    ws["A1"].font = font_title_main
    ws["A1"].alignment = align_center
    ws.row_dimensions[1].height = 26

    ws.merge_cells("A2:K2")
    ws["A2"] = batch_title
    ws["A2"].font = font_title_sub
    ws["A2"].alignment = align_center
    title_lines = _estimate_wrapped_lines(batch_title, 100)
    ws.row_dimensions[2].height = max(21, title_lines * 19)

    ws.merge_cells("A3:K3")
    ws["A3"] = line_summary
    ws["A3"].font = font_title_sub
    ws["A3"].alignment = align_center
    summary_lines = _estimate_wrapped_lines(line_summary, 100)
    ws.row_dimensions[3].height = max(21, summary_lines * 19)

    # Dòng 4: khoảng đệm nhỏ trước bảng
    ws.row_dimensions[4].height = 8

    # 2. HEADER BẢNG 2 TẦNG (Dòng 5 & 6)
    header_top_row = 5
    header_bot_row = 6

    vertical_headers = [
        (1, "CONT"),
        (2, "MÀU"),
        (3, "STT"),
        (4, "NGUYÊN LIỆU"),
        (5, "SẢN PHẨM / CHI TIẾT"),
        (9, "SET"),
        (10, "SLKH"),
        (11, "GHI CHÚ"),
    ]
    for col_idx, label in vertical_headers:
        ws.merge_cells(
            start_row=header_top_row,
            start_column=col_idx,
            end_row=header_bot_row,
            end_column=col_idx,
        )
        cell = ws.cell(row=header_top_row, column=col_idx, value=label)
        cell.font = font_tbl_header
        cell.alignment = align_center
        cell.fill = fill_header

    # Nhóm cột QUY CÁCH TINH (F5:H5) + 3 cột con Dày / Rộng / Dài (F6, G6, H6)
    ws.merge_cells(start_row=header_top_row, start_column=6, end_row=header_top_row, end_column=8)
    qc_cell = ws.cell(row=header_top_row, column=6, value="QUY CÁCH TINH")
    qc_cell.font = font_tbl_header
    qc_cell.alignment = align_center
    qc_cell.fill = fill_header

    for col_idx, sub_label in [(6, "Dày"), (7, "Rộng"), (8, "Dài")]:
        c = ws.cell(row=header_bot_row, column=col_idx, value=sub_label)
        c.font = font_tbl_sub_header
        c.alignment = align_center
        c.fill = fill_header

    # Áp fill + border cho toàn bộ vùng header 2 tầng
    for r in (header_top_row, header_bot_row):
        for c_idx in range(1, 12):
            cell = ws.cell(row=r, column=c_idx)
            cell.fill = fill_header
            cell.border = border_header

    ws.row_dimensions[header_top_row].height = 22
    ws.row_dimensions[header_bot_row].height = 20

    # 3. DỮ LIỆU CHI TIẾT (Từ dòng 7 trở đi)
    items: List[Dict[str, Any]] = batch_data.get("items") or []
    current_row = 7

    for item in items:
        row_type = str(item.get("row_type") or "DETAIL_ITEM").upper()
        is_cab = row_type == "CABINET_HEADER"

        cont_code = str(item.get("cont_code") or "").strip()
        color_code = str(item.get("color_code") or "").strip()
        stt_code = str(item.get("stt_code") or "").strip()
        note = str(item.get("note") or "").strip()
        planned_qty = _parse_number(item.get("custom_planned_qty"))

        if is_cab:
            # Dòng đầu mã tủ (VD: R42 | WHT | 10-42 | [gộp D:H] | [gộp I:J = 120] | GHI CHÚ)
            c_cont = ws.cell(row=current_row, column=1, value=cont_code)
            c_color = ws.cell(row=current_row, column=2, value=color_code)
            c_stt = ws.cell(row=current_row, column=3, value=stt_code)

            c_cont.font = font_cab_bold
            c_cont.alignment = align_center
            c_color.font = font_cab_bold
            c_color.alignment = align_center
            c_stt.font = font_cab_bold
            c_stt.alignment = align_center

            # Gộp D:H để trống sạch (không có đường kẻ dọc giữa chừng như ảnh 2)
            ws.merge_cells(start_row=current_row, start_column=4, end_row=current_row, end_column=8)

            # Gộp I:J hiển thị số lượng tủ in đậm căn giữa
            ws.merge_cells(start_row=current_row, start_column=9, end_row=current_row, end_column=10)
            c_qty = ws.cell(row=current_row, column=9, value=planned_qty if planned_qty != "" else 0)
            c_qty.font = font_cab_bold
            c_qty.alignment = align_center
            if isinstance(c_qty.value, (int, float)):
                c_qty.number_format = "#,##0"

            c_note = ws.cell(row=current_row, column=11, value=note)
            c_note.font = font_cab_note
            c_note.alignment = align_left

            for col_i in range(1, 12):
                cell = ws.cell(row=current_row, column=col_i)
                cell.fill = fill_cabinet
                cell.border = border_cabinet

            note_lines = _estimate_wrapped_lines(note, COLUMN_WIDTHS[11])
            ws.row_dimensions[current_row].height = max(25, note_lines * 16)
        else:
            # Dòng chi tiết BOM
            is_sub_part = "." in stt_code
            material_name = str(item.get("material_name") or "").strip()
            item_name = str(item.get("item_name") or "").strip()
            dim_thick = _parse_number(item.get("dim_thick"))
            dim_width = _parse_number(item.get("dim_width"))
            dim_length = _parse_number(item.get("dim_length"))
            set_qty = _parse_number(item.get("set_qty"))

            values = [
                cont_code,
                color_code,
                stt_code,
                material_name,
                item_name,
                dim_thick,
                dim_width,
                dim_length,
                set_qty,
                planned_qty if planned_qty != "" else 0,
                note,
            ]

            for col_i, val in enumerate(values, start=1):
                cell = ws.cell(row=current_row, column=col_i, value=val)
                cell.border = border_thin_all

                if col_i == 1:
                    cell.font = font_cont_detail
                    cell.alignment = align_center
                elif col_i == 2:
                    cell.font = font_detail_regular
                    cell.alignment = align_center
                elif col_i == 3:
                    cell.font = font_detail_regular
                    cell.alignment = align_stt_child if is_sub_part else align_stt_parent
                elif col_i in (4, 5):
                    cell.font = font_detail_regular
                    cell.alignment = align_left
                elif col_i in (6, 7, 8, 9, 10):
                    cell.font = font_detail_regular
                    cell.alignment = align_center
                    if isinstance(val, int) and col_i == 10:
                        cell.number_format = "#,##0"
                else:
                    cell.font = font_detail_note
                    cell.alignment = align_left

            max_lines = max(
                _estimate_wrapped_lines(material_name, COLUMN_WIDTHS[4]),
                _estimate_wrapped_lines(item_name, COLUMN_WIDTHS[5]),
                _estimate_wrapped_lines(note, COLUMN_WIDTHS[11]),
            )
            ws.row_dimensions[current_row].height = max(21, max_lines * 15 + 4)

        current_row += 1

    # Nếu không có dòng nào, vẫn kẻ 1 dòng trống giữ form
    if not items:
        ws.merge_cells(start_row=7, start_column=1, end_row=7, end_column=11)
        empty_cell = ws.cell(row=7, column=1, value="Không có dòng chi tiết nào đang được chọn hiển thị.")
        empty_cell.font = font_detail_regular
        empty_cell.alignment = align_center
        _apply_border_range(ws, 7, 7, 1, 11, border_thin_all)
        ws.row_dimensions[7].height = 28

    # 4. ĐỘ RỘNG CỘT
    for col_idx, width in COLUMN_WIDTHS.items():
        ws.column_dimensions[get_column_letter(col_idx)].width = width

    # 5. CẤU HÌNH IN ẤN CHUẨN PHIẾU XƯỞNG (A4 NGANG, FIT 1 TRANG RỘNG, LẶP HEADER)
    ws.page_setup.orientation = ws.ORIENTATION_LANDSCAPE
    ws.page_setup.paperSize = ws.PAPERSIZE_A4
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.print_options.horizontalCentered = True
    ws.print_title_rows = "5:6"

    ws.page_margins.left = 0.3
    ws.page_margins.right = 0.3
    ws.page_margins.top = 0.7
    ws.page_margins.bottom = 0.45
    ws.page_margins.header = 0.2
    ws.page_margins.footer = 0.2

    # Header công ty in ở đầu mỗi trang giấy (giống ảnh 2)
    ws.oddHeader.center.text = (
        '&"Times New Roman,Regular"&9CÔNG TY CỔ PHẦN VINA G7 - CCN Tam Phước 1, KP Long Khánh 3, P. Tam Phước, Tỉnh Đồng Nai\n'
        'Website: https://phutai.com.vn/  -  Email: vinag7@vinag7furniture.com'
    )
    ws.oddFooter.right.text = '&"Times New Roman,Regular"&9Trang &P / &N'

    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return output

