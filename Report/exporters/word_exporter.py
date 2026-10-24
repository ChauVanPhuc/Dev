import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
from typing import Dict, Any

class WordExporter:
    @classmethod
    def export(cls, data: Dict[str, Any], output_path: str) -> str:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        doc = Document()

        for section in doc.sections:
            section.top_margin = Inches(0.7)
            section.bottom_margin = Inches(0.7)
            section.left_margin = Inches(0.7)
            section.right_margin = Inches(0.7)

        RGB_NAVY    = RGBColor(0x0F, 0x17, 0x2A)
        RGB_PRIMARY = RGBColor(0x1E, 0x29, 0x3B)
        RGB_ACCENT  = RGBColor(0x03, 0x69, 0xA1)
        RGB_GOLD    = RGBColor(0xB4, 0x53, 0x09)
        RGB_MUTED   = RGBColor(0x64, 0x74, 0x8B)

        def set_cell_shading(cell, color_hex):
            shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
            cell._tc.get_or_add_tcPr().append(shd)

        def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
            tcPr = cell._tc.get_or_add_tcPr()
            tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
            tcPr.append(tcMar)

        def add_callout(text, title="THÔNG ĐIỆP ĐIỀU HÀNH:"):
            tbl = doc.add_table(rows=1, cols=1)
            tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
            cell = tbl.cell(0, 0)
            set_cell_shading(cell, "FAF7F2")
            set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
            
            tcPr = cell._tc.get_or_add_tcPr()
            borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="36" w:space="0" w:color="B45309"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>')
            tcPr.append(borders)
            
            p = cell.paragraphs[0]
            run_t = p.add_run(f"📌 {title} ")
            run_t.bold = True
            run_t.font.name = "Segoe UI"
            run_t.font.size = Pt(10)
            run_t.font.color.rgb = RGB_GOLD
            
            run_b = p.add_run(text)
            run_b.font.name = "Segoe UI"
            run_b.font.size = Pt(9.5)
            run_b.font.color.rgb = RGB_PRIMARY

        def format_table(tbl, col_widths, hdr_bg="0F172A"):
            tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
            for idx, cell in enumerate(tbl.rows[0].cells):
                set_cell_shading(cell, hdr_bg)
                set_cell_margins(cell, top=120, bottom=120, left=120, right=120)
                p = cell.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                for run in p.runs:
                    run.font.bold = True
                    run.font.name = "Segoe UI"
                    run.font.size = Pt(9)
                    run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            
            for r_idx, row in enumerate(tbl.rows[1:], 1):
                bg = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
                for c_idx, cell in enumerate(row.cells):
                    set_cell_shading(cell, bg)
                    set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
                    p = cell.paragraphs[0]
                    for run in p.runs:
                        run.font.name = "Segoe UI"
                        run.font.size = Pt(8.5)
                        run.font.color.rgb = RGB_PRIMARY
            
            for row in tbl.rows:
                for idx, width in enumerate(col_widths):
                    row.cells[idx].width = Inches(width)

        meta = data["metadata"]
        kpis = data["kpis"]
        copq = data.get("copq", {})

        # Header
        p_top = doc.add_paragraph()
        p_top.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r_iso = p_top.add_run(f"Mã số ISO: {meta['iso_code']} | Ngày lập: {meta['generated_at']}")
        r_iso.font.name = "Segoe UI"
        r_iso.font.size = Pt(8.5)
        r_iso.font.color.rgb = RGB_MUTED

        p_main = doc.add_paragraph()
        p_main.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_org = p_main.add_run(f"{meta['org_name']}\n")
        r_org.font.name = "Segoe UI"
        r_org.font.size = Pt(11)
        r_org.font.bold = True
        r_org.font.color.rgb = RGB_ACCENT

        r_title = p_main.add_run(f"{meta['report_title']}\n")
        r_title.font.name = "Segoe UI"
        r_title.font.size = Pt(15)
        r_title.font.bold = True
        r_title.font.color.rgb = RGB_NAVY

        p_sub = doc.add_paragraph()
        p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_sub = p_sub.add_run(f"Kỳ báo cáo: {meta['curr_period_str']} | Đối chiếu: {meta['prev_period_str']}")
        r_sub.font.name = "Segoe UI"
        r_sub.font.size = Pt(9.5)
        r_sub.font.italic = True
        r_sub.font.color.rgb = RGB_MUTED

        add_callout(
            " ".join(data.get("takeaways", [])),
            "THÔNG ĐIỆP ĐIỀU HÀNH:"
        )

        doc.add_paragraph().paragraph_format.space_after = Pt(6)

        # I. KPI Summary
        doc.add_heading("I. TỔNG QUAN CHỈ SỐ ĐIỀU HÀNH CHẤT LƯỢNG", level=1)
        t1 = doc.add_table(rows=8, cols=5)
        hdr = t1.rows[0].cells
        hdr[0].text = "Chỉ số KPI cốt lõi"
        hdr[1].text = "Kỳ trước"
        hdr[2].text = "Kỳ này"
        hdr[3].text = "Biến động"
        hdr[4].text = "Đánh giá & Xu hướng"

        kpi_list = [
            ("Tỷ lệ phiếu Đạt", f"{kpis['pass_rate']['prev']}%", f"{kpis['pass_rate']['curr']}%", f"{kpis['pass_rate']['diff']}% pt", "Đạt chuẩn ISO >90%"),
            ("Tỷ lệ lỗi trên SP", f"{kpis['defect_rate']['prev']}%", f"{kpis['defect_rate']['curr']}%", f"{kpis['defect_rate']['diff']}% pt", "Defect Rate Daily"),
            ("Tổng số lỗi Daily", str(kpis['daily_defects']['prev']), str(kpis['daily_defects']['curr']), f"{kpis['daily_defects']['diff_pct']}%", "Số lỗi phát hiện"),
            ("Sản phẩm lỗi (Error Qty)", str(kpis['error_qty']['prev']), str(kpis['error_qty']['curr']), f"{kpis['error_qty']['diff_pct']}%", "Thiệt hại SP"),
            ("Sản phẩm kiểm tra Daily", str(kpis['daily_checked']['prev']), str(kpis['daily_checked']['curr']), f"{kpis['daily_checked']['diff_pct']}%", "Quy mô kiểm tra"),
            ("Tỷ lệ xác nhận phiếu", f"{kpis['confirmed_rate']['prev']}%", f"{kpis['confirmed_rate']['curr']}%", f"{kpis['confirmed_rate']['diff']}% pt", "Ký duyệt điện tử"),
            ("Ước tính thiệt hại COPQ", f"{copq.get('total_prev_millions', 0)} tr", f"{copq.get('total_curr_millions', 0)} tr", f"{copq.get('cost_diff_millions', 0)} tr", "Chi phí phế phẩm")
        ]
        for idx, item in enumerate(kpi_list, 1):
            row = t1.rows[idx].cells
            for c_i, v in enumerate(item):
                row[c_i].text = v
        format_table(t1, [2.4, 1.1, 1.1, 1.1, 1.4], hdr_bg="0F172A")

        doc.add_paragraph().paragraph_format.space_after = Pt(8)

        # II. Diễn biến theo ngày
        daily_b = data.get("daily_breakdown", [])
        if daily_b:
            doc.add_heading("II. DIỄN BIẾN CHẤT LƯỢNG CHI TIẾT 7 NGÀY TRONG TUẦN", level=1)
            t_day = doc.add_table(rows=len(daily_b)+1, cols=7)
            hdr_d = t_day.rows[0].cells
            hdr_d[0].text = "Thứ / Ngày"
            hdr_d[1].text = "Tổng phiếu"
            hdr_d[2].text = "Đạt"
            hdr_d[3].text = "Không đạt"
            hdr_d[4].text = "Tỷ lệ Đạt"
            hdr_d[5].text = "SP lỗi"
            hdr_d[6].text = "Đánh giá"
            for idx, d in enumerate(daily_b, 1):
                row = t_day.rows[idx].cells
                row[0].text = f"{d['day_name']} ({d['date_str']})"
                row[1].text = str(d["total"])
                row[2].text = str(d["pass_cnt"])
                row[3].text = str(d["fail_cnt"])
                row[4].text = f"{d['pass_rate']}%"
                row[5].text = str(d["error_qty"])
                row[6].text = d["status"] + (" (Đỉnh lỗi)" if d.get("is_peak") else "")
            format_table(t_day, [1.8, 0.8, 0.7, 0.9, 1.0, 0.9, 1.0], hdr_bg="0369A1")
            doc.add_paragraph().paragraph_format.space_after = Pt(8)

        # III. Stages
        doc.add_heading("III. PHÂN LOẠI THEO 5 CÔNG ĐOẠN SẢN XUẤT", level=1)
        stages = data["stages"]
        t2 = doc.add_table(rows=len(stages)+1, cols=6)
        hdr = t2.rows[0].cells
        hdr[0].text = "Công đoạn"
        hdr[1].text = "Tổng phiếu"
        hdr[2].text = "Phiếu Đạt"
        hdr[3].text = "Phiếu Lỗi"
        hdr[4].text = "Tỷ lệ Đạt"
        hdr[5].text = "Tỷ trọng lỗi"
        for idx, s in enumerate(stages, 1):
            row = t2.rows[idx].cells
            row[0].text = s["stage"]
            row[1].text = str(s["curr_total"])
            row[2].text = str(s["curr_pass"])
            row[3].text = str(s["curr_fail"])
            row[4].text = f"{s['curr_pass_rate']}%"
            row[5].text = f"{s['defect_share']}%"
        format_table(t2, [1.8, 1.0, 1.0, 1.0, 1.2, 1.1], hdr_bg="1E293B")

        doc.add_paragraph().paragraph_format.space_after = Pt(8)

        # IV. Top Defects Pareto
        doc.add_heading("IV. TOP LỖI KỸ THUẬT PHÁT SINH (PARETO AQL)", level=1)
        top_def = data["defects"][:8]
        t3 = doc.add_table(rows=len(top_def)+1, cols=6)
        hdr = t3.rows[0].cells
        hdr[0].text = "STT"
        hdr[1].text = "Tên lỗi kỹ thuật"
        hdr[2].text = "AQL"
        hdr[3].text = "Số lượng"
        hdr[4].text = "Tỷ trọng %"
        hdr[5].text = "Xu hướng"
        for idx, d in enumerate(top_def, 1):
            row = t3.rows[idx].cells
            row[0].text = str(d["stt"])
            row[1].text = d["name"]
            row[2].text = d.get("aql_class", "Major")
            row[3].text = str(d["curr_qty"])
            row[4].text = f"{d['share_pct']}%"
            row[5].text = d["status"]
        format_table(t3, [0.5, 2.5, 0.9, 0.9, 1.0, 1.3], hdr_bg="0F172A")

        doc.add_paragraph().paragraph_format.space_after = Pt(8)

        # V. 5M Ishikawa
        def_5m = data.get("defect_5m", [])
        if def_5m:
            doc.add_heading("V. SỔ TAY NGUYÊN NHÂN GỐC RỄ 5M & KẾ HOẠCH CAPA", level=1)
            t_5m = doc.add_table(rows=len(def_5m)+1, cols=4)
            hdr_5 = t_5m.rows[0].cells
            hdr_5[0].text = "Lỗi & AQL"
            hdr_5[1].text = "Phân tích 5M (Man, Machine, Material, Method, Measurement)"
            hdr_5[2].text = "Biện pháp phòng ngừa (CAPA)"
            hdr_5[3].text = "Phụ trách & Hạn"
            for idx, d in enumerate(def_5m, 1):
                row = t_5m.rows[idx].cells
                row[0].text = f"{d['defect_name']}\n({d['aql_class']} - {d['curr_qty']} lỗi)"
                row[1].text = f"• Man: {d['ishikawa']['man']}\n• Machine: {d['ishikawa']['machine']}\n• Material: {d['ishikawa']['material']}\n• Method: {d['ishikawa']['method']}"
                row[2].text = f"Tức thời:\n{d['containment_action']}\n\nLâu dài:\n{d['preventive_capa']}"
                row[3].text = f"{d['pic']}\n⏱️ {d['timeline']}"
            format_table(t_5m, [1.5, 2.6, 2.0, 1.0], hdr_bg="0369A1")
            doc.add_paragraph().paragraph_format.space_after = Pt(8)

        # VI. Hotspot Batches & Specifications
        doc.add_heading("VI. ĐIỂM NÓNG LÔ HÀNG & QUY CÁCH PHỤ TÙNG", level=1)
        batches = data["batches"][:5]
        t4 = doc.add_table(rows=len(batches)+1, cols=6)
        hdr = t4.rows[0].cells
        hdr[0].text = "STT"
        hdr[1].text = "Mã lô hàng"
        hdr[2].text = "Chi tiết / Phụ tùng"
        hdr[3].text = "Công đoạn"
        hdr[4].text = "Số SP lỗi"
        hdr[5].text = "Đánh giá rủi ro"
        for idx, b in enumerate(batches, 1):
            row = t4.rows[idx].cells
            row[0].text = str(idx)
            row[1].text = b["batch_no"]
            row[2].text = b.get("part_name", "-")
            row[3].text = b.get("stage", "-")
            row[4].text = str(b["error_qty"])
            row[5].text = b["note"]
        format_table(t4, [0.5, 1.3, 2.0, 1.1, 1.0, 1.2], hdr_bg="1E293B")

        doc.add_paragraph().paragraph_format.space_after = Pt(8)

        # VI.B. Phân tích Dòng Hàng
        if data.get("product_lines"):
            doc.add_heading("VI.B. MA TRẬN CHẤT LƯỢNG THEO DÒNG HÀNG (PRODUCT LINES)", level=1)
            plines = data["product_lines"]
            t_pl = doc.add_table(rows=len(plines)+1, cols=6)
            hdr_pl = t_pl.rows[0].cells
            hdr_pl[0].text = "Dòng"
            hdr_pl[1].text = "Tên dòng sản phẩm"
            hdr_pl[2].text = "Phiếu Đạt/Tổng"
            hdr_pl[3].text = "Tỷ lệ Đạt"
            hdr_pl[4].text = "Số SP lỗi"
            hdr_pl[5].text = "Tỷ lệ lỗi SP"
            for idx, pl in enumerate(plines, 1):
                row = t_pl.rows[idx].cells
                row[0].text = pl["code"]
                row[1].text = pl["name"]
                row[2].text = f"{pl['pass_tickets']}/{pl['total_tickets']}"
                row[3].text = f"{pl['pass_rate']}%"
                row[4].text = str(pl["error_qty"])
                row[5].text = f"{pl['defect_rate']}%"
            format_table(t_pl, [0.8, 2.0, 1.4, 1.0, 1.0, 1.0], hdr_bg="0369A1")
            doc.add_paragraph().paragraph_format.space_after = Pt(8)

        # VII. QC Audit
        doc.add_heading("VII. ĐÁNH GIÁ NĂNG SUẤT ĐỘI NGŨ KIỂM TRA VIÊN (QC AUDIT)", level=1)
        inspectors = data["inspectors"][:6]
        t5 = doc.add_table(rows=len(inspectors)+1, cols=6)
        hdr = t5.rows[0].cells
        hdr[0].text = "Họ tên KCS"
        hdr[1].text = "Công đoạn chính"
        hdr[2].text = "Tổng phiếu"
        hdr[3].text = "Tỷ lệ Đạt"
        hdr[4].text = "Số SP lỗi"
        hdr[5].text = "Xếp loại"
        for idx, insp in enumerate(inspectors, 1):
            row = t5.rows[idx].cells
            row[0].text = insp["name"]
            row[1].text = insp.get("stage", "Kiểm định")
            row[2].text = str(insp["total"])
            row[3].text = f"{insp['pass_rate']}%"
            row[4].text = str(insp["error_qty"])
            row[5].text = insp.get("evaluation", "Đạt chuẩn")
        format_table(t5, [1.8, 1.4, 1.0, 1.1, 1.0, 1.0], hdr_bg="334155")

        doc.add_paragraph().paragraph_format.space_after = Pt(8)

        # VIII. CAPA Action Plan
        doc.add_heading("VIII. KẾ HOẠCH HÀNH ĐỘNG ƯU TIÊN (5W2H)", level=1)
        actions = data["actions"]
        t6 = doc.add_table(rows=len(actions)+1, cols=5)
        hdr = t6.rows[0].cells
        hdr[0].text = "Mục"
        hdr[1].text = "Nội dung chỉ đạo & Hành động"
        hdr[2].text = "Bộ phận phụ trách"
        hdr[3].text = "Chỉ tiêu KPI"
        hdr[4].text = "Thời hạn"
        for idx, a in enumerate(actions, 1):
            row = t6.rows[idx].cells
            row[0].text = str(a["id"])
            row[1].text = f"{a['title']}\n{a['desc']}"
            row[2].text = a.get("dept", "Quản đốc xưởng")
            row[3].text = a.get("kpi", "Đạt chuẩn")
            row[4].text = a.get("timeline", "Trong tuần")
        format_table(t6, [0.6, 2.7, 1.5, 1.3, 1.0], hdr_bg="059669")

        doc.add_paragraph().paragraph_format.space_after = Pt(12)

        # IX. Signatures
        doc.add_heading("IX. PHÊ DUYỆT & KÝ TÊN ĐIỀU HÀNH", level=1)
        t_sign = doc.add_table(rows=2, cols=3)
        t_sign.alignment = WD_TABLE_ALIGNMENT.CENTER
        t_sign.rows[0].cells[0].text = "NGƯỜI LẬP BÁO CÁO\n(QC Trưởng ca)"
        t_sign.rows[0].cells[1].text = "KIỂM SOÁT BỞI\n(Trưởng phòng QA/QC)"
        t_sign.rows[0].cells[2].text = "PHÊ DUYỆT BỞI\n(Giám đốc Nhà máy)"
        for cell in t_sign.rows[0].cells:
            cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            for r in cell.paragraphs[0].runs:
                r.font.bold = True
                r.font.name = "Segoe UI"
                r.font.size = Pt(9.5)

        t_sign.rows[1].cells[0].paragraphs[0].text = "Ngày: ...../...../2026\n(Ký và ghi rõ họ tên)"
        t_sign.rows[1].cells[1].paragraphs[0].text = "Ngày: ...../...../2026\n(Ký và ghi rõ họ tên)"
        t_sign.rows[1].cells[2].paragraphs[0].text = "Ngày: ...../...../2026\n(Ký và ghi rõ họ tên)"
        for cell in t_sign.rows[1].cells:
            cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            set_cell_margins(cell, top=320, bottom=50, left=50, right=50)

        doc.save(output_path)
        return output_path
