# -*- coding: utf-8 -*-
import io
import json
import re
from typing import Dict, List, Any, Optional, Tuple
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def parse_excel_assessment(file_bytes: bytes) -> Dict[str, Any]:
    """
    Phân tích file Excel (.xlsx) chứa đề thi và ngân hàng câu hỏi.
    Hỗ trợ 2 định dạng:
    - Định dạng 1: File 1 Sheet với Metadata ở các hàng đầu (Hàng 1-5) và Bảng câu hỏi từ Hàng 7 trở đi.
    - Định dạng 2: File 2 Sheets ('ThongTinDeThi' và 'NganHangCauHoi').
    """
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    
    metadata: Dict[str, Any] = {
        "title": "Bài kiểm tra năng lực",
        "duration_minutes": 45,
        "category": "Quản lý chất lượng",
        "target_positions": ["QA", "QC", "Tổ trưởng"],
        "pass_percentage": 60.0,
        "shuffle_questions": True,
        "shuffle_options": True,
        "description": "",
        "instructions": "",
    }
    
    questions: List[Dict[str, Any]] = []
    warnings: List[str] = []
    
    sheet_names = wb.sheetnames
    
    # ── Kịch bản 1: File chuẩn 2 Sheet kiểu mới (Sheet 1: Hướng dẫn/Ví dụ, Sheet 2: Nhập đề thi & Câu hỏi)
    target_sheet = None
    
    # Tìm sheet nhập liệu ưu tiên
    for s_name in sheet_names:
        s_lower = s_name.lower()
        if "nhap" in s_lower or "form" in s_lower or "2_" in s_lower:
            target_sheet = wb[s_name]
            break
            
    # Nếu có 2 sheet kiểu cũ (ThongTinDeThi & NganHangCauHoi)
    if "ThongTinDeThi" in sheet_names and "NganHangCauHoi" in sheet_names:
        meta_sheet = wb["ThongTinDeThi"]
        q_sheet = wb["NganHangCauHoi"]
        
        for row in meta_sheet.iter_rows(min_row=1, max_col=2, values_only=True):
            if not row or not row[0]:
                continue
            k = str(row[0]).strip().lower()
            v = str(row[1]).strip() if row[1] is not None else ""
            if "tiêu đề" in k or "title" in k or "tên" in k:
                if v: metadata["title"] = v
            elif "thời gian" in k or "duration" in k:
                num = re.search(r'\d+', v)
                if num: metadata["duration_minutes"] = int(num.group())
            elif "danh mục" in k or "category" in k or "bộ phận" in k:
                if v: metadata["category"] = v
            elif "vị trí" in k or "positions" in k:
                pos = [p.strip() for p in re.split(r'[,;\|\/]', v) if p.strip()]
                if pos: metadata["target_positions"] = pos
            elif "tỷ lệ đạt" in k or "pass" in k:
                num = re.search(r'[\d\.]+', v)
                if num: metadata["pass_percentage"] = float(num.group())
            elif "mô tả" in k or "description" in k:
                metadata["description"] = v
                
        questions, q_warnings = _parse_question_rows(q_sheet, start_row=2, default_category=metadata.get("category", ""))
        warnings.extend(q_warnings)
    else:
        # Nếu tìm thấy Sheet 2 (Sheet nhập liệu)
        sheet_to_parse = target_sheet if target_sheet is not None else wb.active
        
        # Hàm đọc metadata và câu hỏi từ 1 sheet (dạng tích hợp)
        def parse_single_sheet(sheet):
            meta = {}
            header_idx = None
            for row_idx, row in enumerate(sheet.iter_rows(min_row=1, max_row=15, values_only=True), start=1):
                if not row: continue
                row_str = " ".join([str(c) for c in row if c is not None]).lower()
                if ("câu hỏi" in row_str or "nội dung" in row_str or "question" in row_str) and ("đáp án" in row_str or "phương án" in row_str or "option" in row_str):
                    header_idx = row_idx
                    break
                    
                non_empty = [str(c).strip() for c in row if c is not None and str(c).strip()]
                if len(non_empty) >= 2:
                    k = non_empty[0].lower()
                    v = non_empty[1]
                    if "tiêu đề" in k or "title" in k:
                        if v: meta["title"] = v
                    elif "thời gian" in k or "duration" in k:
                        num = re.search(r'\d+', v)
                        if num: meta["duration_minutes"] = int(num.group())
                    elif "danh mục" in k or "category" in k:
                        if v: meta["category"] = v
                    elif "vị trí" in k or "position" in k:
                        pos = [p.strip() for p in re.split(r'[,;\|\/]', v) if p.strip()]
                        if pos: meta["target_positions"] = pos
                    elif "tỷ lệ đạt" in k or "pass" in k:
                        num = re.search(r'[\d\.]+', v)
                        if num: meta["pass_percentage"] = float(num.group())
                    elif "mô tả" in k or "description" in k:
                        if v: meta["description"] = v
                        
            qs, q_warn = _parse_question_rows(sheet, start_row=(header_idx + 1 if header_idx else 2), header_row=header_idx, default_category=meta.get("category", ""))
            return meta, qs, q_warn
            
        parsed_meta, parsed_qs, parsed_warns = parse_single_sheet(sheet_to_parse)
        
        # Nếu Sheet 2 chưa có câu hỏi (người dùng chưa nhập hoặc sửa Sheet 1), fallback sang Sheet 1
        if not parsed_qs and target_sheet is not None and wb.sheetnames[0] != target_sheet.title:
            fallback_sheet = wb[wb.sheetnames[0]]
            fallback_meta, fallback_qs, fallback_warns = parse_single_sheet(fallback_sheet)
            if fallback_qs:
                parsed_meta.update(fallback_meta)
                parsed_qs = fallback_qs
                parsed_warns = fallback_warns
                
        metadata.update(parsed_meta)
        questions = parsed_qs
        warnings.extend(parsed_warns)

    return {
        "metadata": metadata,
        "questions": questions,
        "total_questions": len(questions),
        "warnings": warnings
    }

def _parse_question_rows(sheet, start_row: int = 2, header_row: Optional[int] = None, default_category: str = "") -> Tuple[List[Dict[str, Any]], List[str]]:
    """Phân tích các hàng dữ liệu câu hỏi từ Excel sheet"""
    questions: List[Dict[str, Any]] = []
    warnings: List[str] = []
    
    # Bản đồ cột nếu có header
    col_map = {
        "stt": 0,
        "type": 1,
        "question": 2,
        "opt_a": 3,
        "opt_b": 4,
        "opt_c": 5,
        "opt_d": 6,
        "opt_e": 7,
        "correct": 7,
        "points": 8,
        "category": 9,
        "explanation": 10
    }
    
    if header_row:
        headers = [str(cell.value).strip().lower() if cell.value else "" for cell in sheet[header_row]]
        for idx, h in enumerate(headers):
            if not h: continue
            if "stt" in h: col_map["stt"] = idx
            elif "loại" in h or "type" in h: col_map["type"] = idx
            elif "nội dung" in h or "câu hỏi" in h or "question" in h: col_map["question"] = idx
            elif "phương án a" in h or "đáp án a" in h or h == "a" or "lựa chọn a" in h: col_map["opt_a"] = idx
            elif "phương án b" in h or "đáp án b" in h or h == "b" or "lựa chọn b" in h: col_map["opt_b"] = idx
            elif "phương án c" in h or "đáp án c" in h or h == "c" or "lựa chọn c" in h: col_map["opt_c"] = idx
            elif "phương án d" in h or "đáp án d" in h or h == "d" or "lựa chọn d" in h: col_map["opt_d"] = idx
            elif "đáp án đúng" in h or "kết quả đúng" in h or "correct" in h or "key" in h: col_map["correct"] = idx
            elif "điểm" in h or "point" in h or "score" in h: col_map["points"] = idx
            elif "chủ đề" in h or "tiêu chuẩn" in h or "category" in h: col_map["category"] = idx
            elif "giải thích" in h or "hướng dẫn" in h or "explanation" in h: col_map["explanation"] = idx

    order_idx = 1
    for r_idx in range(start_row, sheet.max_row + 1):
        row_cells = sheet[r_idx]
        if not row_cells: continue
        
        row_vals = [cell.value for cell in row_cells]
        if not any(row_vals): continue
        
        def get_val(col_key: str) -> str:
            idx = col_map.get(col_key)
            if idx is not None and idx < len(row_vals) and row_vals[idx] is not None:
                return str(row_vals[idx]).strip()
            return ""
            
        q_text = get_val("question")
        if not q_text:
            continue
            
        # 1. Xác định Loại câu hỏi
        type_str = get_val("type").lower()
        if "nhiều" in type_str or "multi" in type_str:
            q_type = "multi_choice"
        elif "đúng/sai" in type_str or "dung/sai" in type_str or "true" in type_str or "tf" in type_str:
            q_type = "true_false"
        elif "tự luận" in type_str or "tu luan" in type_str or "essay" in type_str:
            q_type = "essay"
        else:
            q_type = "single_choice"
            
        # 2. Điểm số
        pts_str = get_val("points")
        try:
            points = float(pts_str) if pts_str else 2.0
        except Exception:
            points = 2.0
            
        # 3. Chủ đề & Giải thích
        category_tag = get_val("category") or default_category or "Chung"
        explanation = get_val("explanation")
        
        # 4. Phương án & Đáp án đúng
        options = []
        correct_answers = []
        
        if q_type in ("single_choice", "multi_choice", "true_false"):
            opt_a = get_val("opt_a")
            opt_b = get_val("opt_b")
            opt_c = get_val("opt_c")
            opt_d = get_val("opt_d")
            
            if q_type == "true_false":
                options = [
                    {"id": "A", "text": opt_a or "Đúng"},
                    {"id": "B", "text": opt_b or "Sai"}
                ]
            else:
                if opt_a: options.append({"id": "A", "text": opt_a})
                if opt_b: options.append({"id": "B", "text": opt_b})
                if opt_c: options.append({"id": "C", "text": opt_c})
                if opt_d: options.append({"id": "D", "text": opt_d})
                
            raw_correct = get_val("correct").upper()
            found_keys = re.findall(r'[A-D]', raw_correct)
            if found_keys:
                correct_answers = list(dict.fromkeys(found_keys))
            elif "đúng" in raw_correct.lower():
                correct_answers = ["A"]
            elif "sai" in raw_correct.lower():
                correct_answers = ["B"]
                
            if len(options) < 2 and q_type != "essay":
                warnings.append(f"Dòng {r_idx} (Câu {order_idx}): Thiếu phương án lựa chọn (A, B, C, D).")
            if len(correct_answers) == 0 and len(options) > 0:
                correct_answers = [options[0]["id"]]
                warnings.append(f"Dòng {r_idx} (Câu {order_idx}): Chưa có đáp án đúng, hệ thống tạm gán phương án {options[0]['id']}.")
            if len(correct_answers) > 1 and q_type == "single_choice":
                q_type = "multi_choice"
        else:
            options = []
            correct_answers = []
            
        questions.append({
            "order_index": order_idx,
            "question_type": q_type,
            "question_text": q_text,
            "category_tag": category_tag,
            "options": options,
            "correct_answers": correct_answers,
            "points": points,
            "explanation": explanation
        })
        order_idx += 1
        
    return questions, warnings

def generate_assessment_excel_template() -> bytes:
    """Tạo file mẫu Excel (.xlsx) chuẩn hóa 2 Sheet:
       - Sheet 1: Hướng dẫn chi tiết & Các câu hỏi mẫu ví dụ
       - Sheet 2: Form sạch để người dùng chỉ việc điền đề thi và câu hỏi
    """
    wb = openpyxl.Workbook()
    
    # ── Luxury Palette Styling ──
    color_coffee_dark  = "2D1A12"   # Deep Espresso
    color_coffee_main  = "7B5233"   # Warm Caramel Brown
    color_coffee_light = "FAF4ED"   # Light Section Brown
    color_cream_sub    = "FAF6F0"   # Light Latte
    color_cream_border = "EADCC9"   # Warm Sand Border
    color_zebra        = "FDFBF7"   # Warm White
    color_green_fill   = "ECFDF5"   # Soft Emerald
    color_green_text   = "065F46"   # Deep Emerald
    color_banner_guide = "FEF3C7"   # Warm Amber Notice
    color_banner_text  = "92400E"   # Amber Dark Text
    
    fill_main_title = PatternFill(start_color=color_coffee_main, end_color=color_coffee_main, fill_type="solid")
    fill_section    = PatternFill(start_color=color_coffee_light, end_color=color_coffee_light, fill_type="solid")
    fill_label      = PatternFill(start_color=color_cream_sub, end_color=color_cream_sub, fill_type="solid")
    fill_value      = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
    fill_note       = PatternFill(start_color="FCFAF7", end_color="FCFAF7", fill_type="solid")
    fill_tbl_header = PatternFill(start_color=color_coffee_main, end_color=color_coffee_main, fill_type="solid")
    fill_zebra      = PatternFill(start_color=color_zebra, end_color=color_zebra, fill_type="solid")
    fill_correct_col= PatternFill(start_color=color_green_fill, end_color=color_green_fill, fill_type="solid")
    fill_guide_box  = PatternFill(start_color=color_banner_guide, end_color=color_banner_guide, fill_type="solid")
    
    font_main_title = Font(name="Segoe UI", size=13, bold=True, color="FFFFFF")
    font_section    = Font(name="Segoe UI", size=11, bold=True, color=color_coffee_main)
    font_tbl_header = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    font_label      = Font(name="Segoe UI", size=10, bold=True, color=color_coffee_main)
    font_value      = Font(name="Segoe UI", size=10, color="1C1917")
    font_note       = Font(name="Segoe UI", size=9.5, italic=True, color="8D6E63")
    font_cell_bold  = Font(name="Segoe UI", size=10, bold=True, color="1C1917")
    font_cell_reg   = Font(name="Segoe UI", size=10, color="1C1917")
    font_correct    = Font(name="Segoe UI", size=10, bold=True, color=color_green_text)
    font_guide_box  = Font(name="Segoe UI", size=10.5, bold=True, color=color_banner_text)
    
    border_luxury = Border(
        left=Side(style="thin", color=color_cream_border),
        right=Side(style="thin", color=color_cream_border),
        top=Side(style="thin", color=color_cream_border),
        bottom=Side(style="thin", color=color_cream_border)
    )
    
    col_widths = {
        "A": 8,    # STT
        "B": 24,   # Loại câu hỏi
        "C": 48,   # Nội dung câu hỏi (*)
        "D": 26,   # Phương án A (*)
        "E": 26,   # Phương án B (*)
        "F": 26,   # Phương án C
        "G": 26,   # Phương án D
        "H": 18,   # Đáp án đúng (*)
        "I": 10,   # Điểm (*)
        "J": 24,   # Chủ đề / Tiêu chuẩn
        "K": 42    # Giải thích đáp án
    }
    
    headers = [
        ("STT", "center"),
        ("Loại câu hỏi", "center"),
        ("Nội dung câu hỏi (*)", "left"),
        ("Phương án A (*)", "left"),
        ("Phương án B (*)", "left"),
        ("Phương án C", "left"),
        ("Phương án D", "left"),
        ("Đáp án đúng (*)", "center"),
        ("Điểm (*)", "center"),
        ("Chủ đề / Tiêu chuẩn", "center"),
        ("Giải thích đáp án & Tiêu chuẩn", "left")
    ]
    
    # ══════════════════════════════════════════════════════════════════════
    # SHEET 1: HƯỚNG DẪN & CÂU HỎI MẪU (1_HuongDan_Va_ViDu)
    # ══════════════════════════════════════════════════════════════════════
    ws1 = wb.active
    ws1.title = "1_HuongDan_Va_ViDu"
    ws1.views.sheetView[0].showGridLines = True
    
    for col_l, w in col_widths.items():
        ws1.column_dimensions[col_l].width = w
        
    # Title Banner Sheet 1
    ws1.merge_cells("A1:K1")
    t1 = ws1["A1"]
    t1.value = "HƯỚNG DẪN QUY CÁCH & BỘ CÂU HỎI MẪU THAM KHẢO"
    t1.font = font_main_title
    t1.fill = fill_main_title
    t1.alignment = Alignment(horizontal="center", vertical="center")
    ws1.row_dimensions[1].height = 36
    
    # Hướng dẫn cấu hình
    config_guide_rows = [
        ("Tiêu đề bài kiểm tra (*):", "Đánh giá năng lực chuyên môn QA/QC & Tổ trưởng", "Tên đợt thi hoặc bài kiểm tra chính thức của phòng ban"),
        ("Thời gian làm bài (Phút):", 45, "Số phút thi quy định (ví dụ: 30, 45, 60, 90)"),
        ("Danh mục / Bộ phận:", "Quản lý chất lượng", "Phòng ban / Nhóm chuyên môn phụ trách đợt thi"),
        ("Vị trí áp dụng:", "QA, QC, KCS, Tổ trưởng chuyền", "Các vị trí nhân sự cần làm bài (ngăn cách bởi dấu phẩy)"),
        ("Tỷ lệ % điểm để Đạt:", 60, "Phần trăm điểm số tối thiểu để được xếp loại Đạt (0 - 100)"),
        ("Mô tả chi tiết đề thi:", "Bộ đề thi đánh giá kiến thức tiêu chuẩn xuất khẩu CARB Phase 2, FSC, ISO và quy trình SOP xưởng.", "Mô tả mục tiêu, yêu cầu và nội dung đợt kiểm tra")
    ]
    
    for idx, (label, val, note) in enumerate(config_guide_rows, start=2):
        ws1.merge_cells(start_row=idx, start_column=1, end_row=idx, end_column=2)
        c_lbl = ws1.cell(row=idx, column=1, value=label)
        c_lbl.font = font_label
        c_lbl.fill = fill_label
        c_lbl.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        
        ws1.merge_cells(start_row=idx, start_column=3, end_row=idx, end_column=5)
        c_val = ws1.cell(row=idx, column=3, value=val)
        c_val.font = font_value
        c_val.fill = fill_value
        c_val.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        
        ws1.merge_cells(start_row=idx, start_column=6, end_row=idx, end_column=11)
        c_note = ws1.cell(row=idx, column=6, value=f"💡 {note}")
        c_note.font = font_note
        c_note.fill = fill_note
        c_note.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        
        for c_idx in range(1, 12):
            ws1.cell(row=idx, column=c_idx).border = border_luxury
        ws1.row_dimensions[idx].height = 24
        
    ws1.row_dimensions[8].height = 10
    
    # Section Header Sheet 1
    ws1.merge_cells("A9:K9")
    s1 = ws1["A9"]
    s1.value = "DANH SÁCH CÂU HỎI MẪU (Ví dụ thực tế cho 4 loại câu hỏi)"
    s1.font = font_section
    s1.fill = fill_section
    s1.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    for c_idx in range(1, 12):
        ws1.cell(row=9, column=c_idx).border = border_luxury
    ws1.row_dimensions[9].height = 28
    
    # Headers Sheet 1
    for col_idx, (h_text, align_h) in enumerate(headers, start=1):
        c = ws1.cell(row=10, column=col_idx, value=h_text)
        c.font = font_tbl_header
        c.fill = fill_tbl_header
        c.alignment = Alignment(horizontal=align_h, vertical="center", wrap_text=True)
        c.border = border_luxury
    ws1.row_dimensions[10].height = 32
    
    # Sample Questions Sheet 1
    sample_questions = [
        (1, "Trắc nghiệm 1 đáp án", "Tiêu chuẩn CARB Phase 2 quy định mức phát thải Formaldehyde tối đa đối với ván ép Hardwood Plywood (HWPW) là bao nhiêu?", "0.05 ppm", "0.08 ppm", "0.11 ppm", "0.13 ppm", "A", 2.0, "Tiêu chuẩn CARB", "Theo quy định CARB Phase 2, giới hạn phát thải Formaldehyde cho HWPW là <= 0.05 ppm."),
        (2, "Trắc nghiệm 1 đáp án", "Khi phát hiện sản phẩm có lỗi nghiêm trọng (Critical Defect) tại chuyền, hành động đầu tiên của QC là gì?", "Dừng chuyền, gắn thẻ cách ly (Hold Tag) và báo ngay cho Tổ trưởng & Trưởng bộ phận", "Tiếp tục sản xuất và ghi nhận lỗi vào sổ cuối ca", "Tự sửa lỗi không cần báo cáo", "Chờ hàng chuyển sang công đoạn sau", "A", 2.0, "Quy trình SOP", "Lỗi nghiêm trọng bắt buộc phải kích hoạt quy trình chặn lỗi tức thì để tránh sản xuất hàng loạt phế phẩm."),
        (3, "Trắc nghiệm nhiều đáp án", "Những chứng chỉ nào sau đây liên quan đến nguồn gốc gỗ hợp pháp và bảo vệ rừng bền vững?", "FSC-CoC", "PEFC", "ISO 9001", "CARB Phase 2", "A, B", 2.0, "Tiêu chuẩn FSC", "FSC và PEFC là 2 chứng chỉ quốc tế về chuỗi hành trình sản phẩm và quản lý rừng bền vững."),
        (4, "Đúng/Sai", "Gỗ nguyên liệu khi nhập kho có độ ẩm trên 18% vẫn được phép đưa ngay vào sản xuất thành phẩm ngoài trời.", "Đúng", "Sai", "", "", "B", 1.5, "Kiểm tra NVL", "Độ ẩm gỗ vượt tiêu chuẩn sẽ gây cong vênh, nứt nẻ sau khi sơn phủ; phải qua sấy đạt độ ẩm 10-12%."),
        (5, "Tự luận", "Hãy nêu 3 bước cơ bản trong quy trình xử lý sự cố CAPA khi khách hàng khiếu nại sản phẩm lỗi.", "", "", "", "", "Theo tiêu chuẩn", 2.5, "Quy trình CAPA", "1. Khoanh vùng & Cách ly sản phẩm lỗi. 2. Tìm nguyên nhân gốc rễ (5-Why/Fishbone). 3. Đưa ra hành động khắc phục & phòng ngừa tái diễn.")
    ]
    
    for row_offset, q_row in enumerate(sample_questions, start=11):
        is_even = (row_offset % 2 == 0)
        curr_fill = fill_zebra if is_even else fill_value
        for col_idx, val in enumerate(q_row, start=1):
            c = ws1.cell(row=row_offset, column=col_idx, value=val)
            c.border = border_luxury
            c.font = font_cell_reg
            c.fill = curr_fill
            if col_idx in (1, 8, 9, 10):
                c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            elif col_idx == 2:
                c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
                c.font = font_cell_bold
            else:
                c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
            if col_idx == 8:
                c.fill = fill_correct_col
                c.font = font_correct
        ws1.row_dimensions[row_offset].height = 36
        
    # Guide Callout Sheet 1
    ws1.merge_cells("A17:K17")
    notice_cell = ws1["A17"]
    notice_cell.value = "👉 HƯỚNG DẪN: Vui lòng chuyển sang Tab [ 2_Nhap_DeThi_Va_CauHoi ] ở thanh phía dưới để nhập đề thi và câu hỏi của bạn!"
    notice_cell.font = font_guide_box
    notice_cell.fill = fill_guide_box
    notice_cell.alignment = Alignment(horizontal="center", vertical="center")
    for c_idx in range(1, 12):
        ws1.cell(row=17, column=c_idx).border = border_luxury
    ws1.row_dimensions[17].height = 30
    
    # ══════════════════════════════════════════════════════════════════════
    # SHEET 2: FORM NHẬP ĐỀ THI & CÂU HỎI TRỰC TIẾP (2_Nhap_DeThi_Va_CauHoi)
    # ══════════════════════════════════════════════════════════════════════
    ws2 = wb.create_sheet(title="2_Nhap_DeThi_Va_CauHoi")
    ws2.views.sheetView[0].showGridLines = True
    
    for col_l, w in col_widths.items():
        ws2.column_dimensions[col_l].width = w
        
    # Title Banner Sheet 2
    ws2.merge_cells("A1:K1")
    t2 = ws2["A1"]
    t2.value = "BẢNG CẤU HÌNH ĐỀ THI & NHẬP DANH SÁCH CÂU HỎI"
    t2.font = font_main_title
    t2.fill = fill_main_title
    t2.alignment = Alignment(horizontal="center", vertical="center")
    ws2.row_dimensions[1].height = 36
    
    # Form điền thông tin đề thi
    form_inputs = [
        ("Tiêu đề bài kiểm tra (*):", "Bài kiểm tra năng lực chuyên môn", "Nhập tên bài thi hoặc đợt đánh giá"),
        ("Thời gian làm bài (Phút):", 45, "Thời gian làm bài (ví dụ: 30, 45, 60...)"),
        ("Danh mục / Bộ phận:", "Quản lý chất lượng", "Tên phòng ban hoặc chuyên môn"),
        ("Vị trí áp dụng:", "QA, QC, KCS, Tổ trưởng", "Các vị trí cần làm bài (cách nhau dấu phẩy)"),
        ("Tỷ lệ % điểm để Đạt:", 60, "Điểm phần trăm tối thiểu để Đạt (ví dụ: 60)"),
        ("Mô tả chi tiết đề thi:", "Đánh giá kiến thức và quy trình thực hiện công việc thực tế.", "Mô tả yêu cầu đợt kiểm tra")
    ]
    
    for idx, (label, val, note) in enumerate(form_inputs, start=2):
        ws2.merge_cells(start_row=idx, start_column=1, end_row=idx, end_column=2)
        c_lbl = ws2.cell(row=idx, column=1, value=label)
        c_lbl.font = font_label
        c_lbl.fill = fill_label
        c_lbl.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        
        ws2.merge_cells(start_row=idx, start_column=3, end_row=idx, end_column=5)
        c_val = ws2.cell(row=idx, column=3, value=val)
        c_val.font = font_value
        c_val.fill = fill_value
        c_val.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        
        ws2.merge_cells(start_row=idx, start_column=6, end_row=idx, end_column=11)
        c_note = ws2.cell(row=idx, column=6, value=f"💡 {note}")
        c_note.font = font_note
        c_note.fill = fill_note
        c_note.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        
        for c_idx in range(1, 12):
            ws2.cell(row=idx, column=c_idx).border = border_luxury
        ws2.row_dimensions[idx].height = 24
        
    ws2.row_dimensions[8].height = 10
    
    # Section Header Sheet 2
    ws2.merge_cells("A9:K9")
    s2 = ws2["A9"]
    s2.value = "DANH SÁCH CÂU HỎI CỦA BẠN (Nhập hoặc dán nội dung từ hàng 11 trở đi)"
    s2.font = font_section
    s2.fill = fill_section
    s2.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    for c_idx in range(1, 12):
        ws2.cell(row=9, column=c_idx).border = border_luxury
    ws2.row_dimensions[9].height = 28
    
    # Headers Sheet 2
    for col_idx, (h_text, align_h) in enumerate(headers, start=1):
        c = ws2.cell(row=10, column=col_idx, value=h_text)
        c.font = font_tbl_header
        c.fill = fill_tbl_header
        c.alignment = Alignment(horizontal=align_h, vertical="center", wrap_text=True)
        c.border = border_luxury
    ws2.row_dimensions[10].height = 32
    
    # Kẻ sẵn 15 dòng trống định dạng sẵn để người dùng gõ/dán
    for row_offset in range(11, 26):
        is_even = (row_offset % 2 == 0)
        curr_fill = fill_zebra if is_even else fill_value
        stt_num = row_offset - 10
        
        for col_idx in range(1, 12):
            c = ws2.cell(row=row_offset, column=col_idx)
            c.border = border_luxury
            c.fill = curr_fill
            c.font = font_cell_reg
            
            if col_idx == 1:
                c.value = stt_num
                c.alignment = Alignment(horizontal="center", vertical="center")
            elif col_idx in (8, 9, 10):
                c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            elif col_idx == 2:
                c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            else:
                c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
                
            if col_idx == 8:
                c.fill = fill_correct_col
                c.font = font_correct
                
        ws2.row_dimensions[row_offset].height = 28
        
    # Đặt Sheet 2 làm sheet active khi mở file
    wb.active = ws2
    
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()
