import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from typing import Dict, Any

class ExcelExporter:
    @classmethod
    def export(cls, data: Dict[str, Any], output_path: str) -> str:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        wb = openpyxl.Workbook()
        wb.remove(wb.active)  # Xóa sheet mặc định

        # Bảng màu chuyên nghiệp SmartFlow Executive
        C_NAVY       = "0F172A"
        C_PRIMARY    = "1E293B"
        C_ACCENT     = "0369A1"
        C_GOLD       = "B45309"
        C_WHITE      = "FFFFFF"
        C_PASS_BG    = "DCFCE7"
        C_PASS_TXT   = "15803D"
        C_FAIL_BG    = "FEE2E2"
        C_FAIL_TXT   = "DC2626"
        C_WARN_BG    = "FEF3C7"
        C_GRAY_LIGHT = "F8FAFC"
        C_BORDER     = "CBD5E1"

        font_title    = Font(name="Segoe UI", size=14, bold=True, color=C_WHITE)
        font_subtitle = Font(name="Segoe UI", size=9.5, italic=True, color="E2E8F0")
        font_sec_hdr  = Font(name="Segoe UI", size=11, bold=True, color=C_NAVY)
        font_tbl_hdr  = Font(name="Segoe UI", size=9.5, bold=True, color=C_WHITE)
        font_bold     = Font(name="Segoe UI", size=9.5, bold=True, color=C_PRIMARY)
        font_regular  = Font(name="Segoe UI", size=9.5, color="334155")
        font_pass     = Font(name="Segoe UI", size=9.5, bold=True, color=C_PASS_TXT)
        font_fail     = Font(name="Segoe UI", size=9.5, bold=True, color=C_FAIL_TXT)

        fill_navy     = PatternFill("solid", fgColor=C_NAVY)
        fill_accent   = PatternFill("solid", fgColor=C_ACCENT)
        fill_sub_hdr  = PatternFill("solid", fgColor="334155")
        fill_pass     = PatternFill("solid", fgColor=C_PASS_BG)
        fill_fail     = PatternFill("solid", fgColor=C_FAIL_BG)
        fill_warn     = PatternFill("solid", fgColor=C_WARN_BG)
        fill_gray     = PatternFill("solid", fgColor=C_GRAY_LIGHT)

        thin_side = Side(style='thin', color=C_BORDER)
        border_cell = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
        border_header = Border(left=thin_side, right=thin_side, top=thin_side, bottom=Side(style='medium', color=C_NAVY))

        align_center = Alignment(horizontal='center', vertical='center')
        align_left   = Alignment(horizontal='left', vertical='center')

        def create_banner(ws, title, subtitle, max_col):
            ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=max_col)
            ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=max_col)
            c1 = ws.cell(row=1, column=1, value=title)
            c1.font = font_title
            c1.fill = fill_navy
            c1.alignment = align_center
            ws.row_dimensions[1].height = 32
            
            c2 = ws.cell(row=2, column=1, value=subtitle)
            c2.font = font_subtitle
            c2.fill = fill_navy
            c2.alignment = align_center
            ws.row_dimensions[2].height = 18

        meta = data["metadata"]
        kpis = data["kpis"]
        copq = data.get("copq", {})

        # ==============================================================
        # TAB 1: TongQuan_KPI
        # ==============================================================
        ws1 = wb.create_sheet(title="TongQuan_KPI")
        create_banner(ws1, f"{meta['report_title']} - {meta['curr_period_str']}", 
                      f"{meta['org_name']} | Đối chiếu: {meta['prev_period_str']} | Mã ISO: {meta['iso_code']}", 7)

        ws1.cell(row=4, column=1, value="I. BẢNG TỔNG HỢP CHỈ SỐ ĐIỀU HÀNH CHẤT LƯỢNG (EXECUTIVE KPI SUMMARY)").font = font_sec_hdr
        headers1 = ["Chỉ số Chất lượng cốt lõi (KPI)", "Kỳ trước", "Kỳ này", "Chênh lệch", "% Biến động", "Đánh giá & Xu hướng", "Ghi chú"]
        for col_idx, h in enumerate(headers1, 1):
            c = ws1.cell(row=5, column=col_idx, value=h)
            c.font = font_tbl_hdr
            c.fill = fill_accent
            c.alignment = align_center
            c.border = border_header
        ws1.row_dimensions[5].height = 24

        kpi_rows = [
            ("Tổng số phiếu kiểm tra toàn nhà máy", kpis["total_tickets"]["prev"], kpis["total_tickets"]["curr"], kpis["total_tickets"]["diff"], f"{kpis['total_tickets']['diff_pct']}%", "Ổn định", "Phiếu kiểm tra"),
            ("Số phiếu ĐẠT tiêu chuẩn", f"{kpis['pass_rate']['prev']}%", f"{kpis['pass_rate']['curr']}%", f"{kpis['pass_rate']['diff']}% pt", f"{kpis['pass_rate']['diff_pct']}%", "Đạt chuẩn ISO >90%", "Tỷ lệ pass"),
            ("Số phiếu KHÔNG ĐẠT", kpis["fail_tickets"]["prev"], kpis["fail_tickets"]["curr"], kpis["fail_tickets"]["diff"], f"{kpis['fail_tickets']['diff_pct']}%", "Cần chấn chỉnh khâu Sơn", "Phiếu fail"),
            ("Sản phẩm kiểm tra Daily", kpis["daily_checked"]["prev"], kpis["daily_checked"]["curr"], kpis["daily_checked"]["diff"], f"{kpis['daily_checked']['diff_pct']}%", "Quy mô kiểm tra", "Sản phẩm"),
            ("Tổng lỗi phát hiện Daily", kpis["daily_defects"]["prev"], kpis["daily_defects"]["curr"], kpis["daily_defects"]["diff"], f"{kpis['daily_defects']['diff_pct']}%", "Kiểm soát lỗi", "Lỗi Daily"),
            ("Tỷ lệ lỗi trên SP kiểm (Defect Rate)", f"{kpis['defect_rate']['prev']}%", f"{kpis['defect_rate']['curr']}%", f"{kpis['defect_rate']['diff']}% pt", f"{kpis['defect_rate']['diff_pct']}%", "Defect Rate", "Tỷ lệ lỗi"),
            ("Tổng sản phẩm lỗi ghi nhận (Error Qty)", kpis["error_qty"]["prev"], kpis["error_qty"]["curr"], kpis["error_qty"]["diff"], f"{kpis['error_qty']['diff_pct']}%", "Phế phẩm", "Thiệt hại SP"),
            ("Tỷ lệ ký duyệt phiếu (Confirmed)", f"{kpis['confirmed_rate']['prev']}%", f"{kpis['confirmed_rate']['curr']}%", f"{kpis['confirmed_rate']['diff']}% pt", f"{kpis['confirmed_rate']['diff_pct']}%", "Tuân thủ ký duyệt", "Confirmed"),
            ("Ước tính tổn thất phế phẩm (COPQ)", f"{copq.get('total_prev_millions', 0)} tr", f"{copq.get('total_curr_millions', 0)} tr", f"{copq.get('cost_diff_millions', 0)} tr", f"{copq.get('cost_diff_pct', 0)}%", "Tổn thất chất lượng", "VNĐ quy đổi")
        ]

        for r_idx, r in enumerate(kpi_rows, 6):
            ws1.row_dimensions[r_idx].height = 20
            for c_idx, val in enumerate(r, 1):
                c = ws1.cell(row=r_idx, column=c_idx, value=val)
                c.font = font_regular
                c.border = border_cell
                c.alignment = align_left if c_idx == 1 else align_center
                if c_idx == 6:
                    if "Đạt chuẩn" in str(val) or "Ổn định" in str(val):
                        c.font = font_pass
                        c.fill = fill_pass
                    elif "Cần chấn chỉnh" in str(val) or "Tổn thất" in str(val):
                        c.font = font_fail
                        c.fill = fill_fail

        # ==============================================================
        # TAB 2: XuHuong_TheoNgay
        # ==============================================================
        ws2 = wb.create_sheet(title="XuHuong_TheoNgay")
        create_banner(ws2, "DIỄN BIẾN CHẤT LƯỢNG CHI TIẾT THEO NGÀY / CA LÀM VIỆC", meta['curr_period_str'], 9)
        ws2.cell(row=4, column=1, value="II. BẢNG THEO DÕI NĂNG SUẤT & PHẾ PHẨM 7 NGÀY TRONG TUẦN").font = font_sec_hdr
        headers_day = ["Thứ / Ca", "Ngày", "Tổng phiếu kiểm", "Phiếu Đạt", "Phiếu Lỗi", "Tỷ lệ Đạt (%)", "Lượng mẫu kiểm", "SP lỗi phát hiện", "Đánh giá trạng thái"]
        for c_idx, h in enumerate(headers_day, 1):
            c = ws2.cell(row=5, column=c_idx, value=h)
            c.font = font_tbl_hdr
            c.fill = fill_accent
            c.alignment = align_center
            c.border = border_header

        for r_idx, d in enumerate(data.get("daily_breakdown", []), 6):
            ws2.row_dimensions[r_idx].height = 20
            row_vals = [
                d["day_name"], d["date_str"], d["total"], d["pass_cnt"], d["fail_cnt"],
                f"{d['pass_rate']}%", d["sample_qty"], d["error_qty"], d["status"]
            ]
            for c_idx, val in enumerate(row_vals, 1):
                c = ws2.cell(row=r_idx, column=c_idx, value=val)
                c.font = font_bold if d.get("is_peak") and c_idx in [1, 8] else font_regular
                c.border = border_cell
                c.alignment = align_center
                if d.get("is_peak"):
                    c.fill = fill_warn

        # ==============================================================
        # TAB 3: CongDoan_LoaiPhieu
        # ==============================================================
        ws3 = wb.create_sheet(title="CongDoan_LoaiPhieu")
        create_banner(ws3, "THỐNG KÊ CHI TIẾT THEO CÔNG ĐOẠN & LOẠI PHIẾU", meta['curr_period_str'], 9)
        ws3.cell(row=4, column=1, value="1. PHÂN LOẠI THEO TỪNG CÔNG ĐOẠN SẢN XUẤT").font = font_sec_hdr
        headers_stg = ["Công đoạn", "Kỳ trước", "Kỳ này", "Phiếu Đạt", "Phiếu Lỗi", "Pass Rate Kỳ này", "Pass Rate Kỳ trước", "Chênh lệch", "SL SP Lỗi"]
        for c_idx, h in enumerate(headers_stg, 1):
            c = ws3.cell(row=5, column=c_idx, value=h)
            c.font = font_tbl_hdr
            c.fill = fill_sub_hdr
            c.alignment = align_center
            c.border = border_header
        
        for r_idx, s in enumerate(data["stages"], 6):
            ws3.row_dimensions[r_idx].height = 20
            row_vals = [s["stage"], s["prev_total"], s["curr_total"], s["curr_pass"], s["curr_fail"], f"{s['curr_pass_rate']}%", f"{s['prev_pass_rate']}%", f"{s['pass_rate_diff']}% pt", s["error_qty"]]
            for c_idx, val in enumerate(row_vals, 1):
                c = ws3.cell(row=r_idx, column=c_idx, value=val)
                c.font = font_regular
                c.border = border_cell
                c.alignment = align_left if c_idx == 1 else align_center
                if c_idx == 6:
                    if s["curr_pass_rate"] >= 90:
                        c.fill = fill_pass
                        c.font = font_pass
                    elif s["curr_pass_rate"] < 75:
                        c.fill = fill_fail
                        c.font = font_fail

        # ==============================================================
        # TAB 4: DoiChieu_Loi_Pareto
        # ==============================================================
        ws4 = wb.create_sheet(title="DoiChieu_Loi_Pareto")
        create_banner(ws4, "BẢNG ĐỐI CHIẾU BIẾN ĐỘNG TOÀN BỘ CÁC LOẠI LỖI (PARETO CHUYÊN SÂU)", meta['curr_period_str'], 13)
        headers_def = ["STT", "Tên lỗi kỹ thuật", "Nhóm lỗi", "Phân loại AQL", "Kỳ trước", "Kỳ này", "Chênh lệch", "% Biến động", "Tỷ trọng %", "Pareto tích lũy", "Xu hướng", "Nguyên nhân gốc rễ (5 Whys)", "Giải pháp khắc phục & phòng ngừa (CAPA)"]
        for c_idx, h in enumerate(headers_def, 1):
            c = ws4.cell(row=4, column=c_idx, value=h)
            c.font = font_tbl_hdr
            c.fill = fill_navy
            c.alignment = align_center
            c.border = border_header

        for r_idx, d in enumerate(data["defects"], 5):
            ws4.row_dimensions[r_idx].height = 20
            row_vals = [
                d["stt"], d["name"], d.get("category", "Ngoại quan"), d.get("aql_class", "Major"),
                d["prev_qty"], d["curr_qty"], d["diff"], f"{d['diff_pct']}%", 
                f"{d['share_pct']}%", f"{d['cum_pct']}%", d["status"],
                d.get("root_cause", "Thao tác hoặc máy móc"), d.get("solution", "Tăng cường KCS")
            ]
            for c_idx, val in enumerate(row_vals, 1):
                c = ws4.cell(row=r_idx, column=c_idx, value=val)
                c.font = font_regular
                c.border = border_cell
                c.alignment = align_left if c_idx in [2, 12, 13] else align_center

        # ==============================================================
        # TAB 5: MaTran_Loi_CongDoan
        # ==============================================================
        ws5 = wb.create_sheet(title="MaTran_Loi_CongDoan")
        create_banner(ws5, "MA TRẬN LỖI KỸ THUẬT PHÂN BỔ VÀO CÔNG ĐOẠN", meta['curr_period_str'], 9)
        m_stages = data["matrix"]["stages"]
        headers_mat = ["STT", "Tên lỗi kỹ thuật"] + m_stages + ["Tổng lỗi", "Tỷ trọng %"]
        for c_idx, h in enumerate(headers_mat, 1):
            c = ws5.cell(row=4, column=c_idx, value=h)
            c.font = font_tbl_hdr
            c.fill = fill_accent
            c.alignment = align_center
            c.border = border_header

        for r_idx, m_row in enumerate(data["matrix"]["rows"], 5):
            ws5.row_dimensions[r_idx].height = 20
            vals = [m_row["stt"], m_row["name"]] + [m_row[s] for s in m_stages] + [m_row["total"], f"{m_row['share_pct']}%"]
            for c_idx, val in enumerate(vals, 1):
                c = ws5.cell(row=r_idx, column=c_idx, value=val)
                c.font = font_regular
                c.border = border_cell
                c.alignment = align_left if c_idx == 2 else align_center

        # ==============================================================
        # TAB 6: QuyCach_PhuTung_LoHang
        # ==============================================================
        ws6 = wb.create_sheet(title="QuyCach_PhuTung_LoHang")
        create_banner(ws6, "ĐIỂM NÓNG LÔ HÀNG VÀ CHI TIẾT QUY CÁCH KỸ THUẬT PHỤ TÙNG", meta['curr_period_str'], 9)
        ws6.cell(row=4, column=1, value="1. TOP LÔ HÀNG PHÁT SINH LỖI NHIỀU NHẤT").font = font_sec_hdr
        headers_b = ["STT", "Mã lô hàng", "Chi tiết / Phụ tùng", "Công đoạn", "Lượt kiểm", "Lượt lỗi", "Tỷ lệ lỗi", "Số SP lỗi", "Đánh giá rủi ro"]
        for c_idx, h in enumerate(headers_b, 1):
            c = ws6.cell(row=5, column=c_idx, value=h)
            c.font = font_tbl_hdr
            c.fill = fill_accent
            c.alignment = align_center
            c.border = border_header

        next_r = 6
        for idx, b in enumerate(data["batches"], 1):
            ws6.row_dimensions[next_r].height = 20
            row_vals = [
                idx, b["batch_no"], b.get("part_name", "-"), b.get("stage", "-"),
                b["total_records"], b["fail_records"], f"{b['fail_rate']}%", b["error_qty"], b["note"]
            ]
            for c_idx, val in enumerate(row_vals, 1):
                c = ws6.cell(row=next_r, column=c_idx, value=val)
                c.font = font_regular
                c.border = border_cell
                c.alignment = align_left if c_idx in [2, 3, 9] else align_center
            next_r += 1

        next_r += 2
        ws6.cell(row=next_r, column=1, value="2. CHI TIẾT QUY CÁCH KỸ THUẬT & DUNG SAI PHỤ TÙNG (TOP DEFECTIVE SPECS)").font = font_sec_hdr
        next_r += 1
        headers_s = ["STT", "Mã chi tiết / Phụ tùng", "Quy cách kỹ thuật / Kích thước", "Tổng lượt kiểm", "Số mẫu kiểm", "SP phế phẩm", "Tỷ lệ lỗi (%)"]
        for c_idx, h in enumerate(headers_s, 1):
            c = ws6.cell(row=next_r, column=c_idx, value=h)
            c.font = font_tbl_hdr
            c.fill = fill_sub_hdr
            c.alignment = align_center
            c.border = border_header
        next_r += 1

        for idx, s in enumerate(data.get("specifications", []), 1):
            ws6.row_dimensions[next_r].height = 20
            row_vals = [idx, s["part_name"], s["specification"], s["total_inspections"], s["sample_qty"], s["error_qty"], f"{s['fail_rate']}%"]
            for c_idx, val in enumerate(row_vals, 1):
                c = ws6.cell(row=next_r, column=c_idx, value=val)
                c.font = font_regular
                c.border = border_cell
                c.alignment = align_left if c_idx in [2, 3] else align_center
            next_r += 1

        # 3. Phân tích Dòng Hàng (Product Lines)
        if data.get("product_lines"):
            next_r += 2
            ws6.cell(row=next_r, column=1, value="3. MA TRẬN CHẤT LƯỢNG & TỶ LỆ LỖI THEO DÒNG HÀNG (PRODUCT LINES)").font = font_sec_hdr
            next_r += 1
            headers_pl = ["Mã dòng", "Tên dòng hàng", "Tổng số phiếu", "Phiếu Đạt", "Phiếu Lỗi", "Tỷ lệ Đạt (%)", "Số mẫu kiểm", "Số SP lỗi", "Tỷ lệ lỗi SP (%)", "Tỷ trọng lỗi toàn NM", "Rủi ro"]
            for c_idx, h in enumerate(headers_pl, 1):
                c = ws6.cell(row=next_r, column=c_idx, value=h)
                c.font = font_tbl_hdr
                c.fill = fill_accent
                c.alignment = align_center
                c.border = border_header
            next_r += 1

            for pl in data["product_lines"]:
                ws6.row_dimensions[next_r].height = 20
                row_vals = [
                    pl["code"], pl["name"], pl["total_tickets"], pl["pass_tickets"], pl["fail_tickets"],
                    f"{pl['pass_rate']}%", pl["sample_qty"], pl["error_qty"], f"{pl['defect_rate']}%",
                    f"{pl['defect_share']}%", pl["risk"]
                ]
                for c_idx, val in enumerate(row_vals, 1):
                    c = ws6.cell(row=next_r, column=c_idx, value=val)
                    c.font = font_regular
                    c.border = border_cell
                    c.alignment = align_left if c_idx == 2 else align_center
                    if c_idx == 6:
                        if pl["pass_rate"] >= 95:
                            c.fill = fill_pass
                            c.font = font_pass
                        elif pl["pass_rate"] < 90:
                            c.fill = fill_fail
                            c.font = font_fail
                next_r += 1

        # ==============================================================
        # TAB 7: PhanTich_5M_Ishikawa
        # ==============================================================
        ws7 = wb.create_sheet(title="PhanTich_5M_Ishikawa")
        create_banner(ws7, "SỔ TAY NGUYÊN NHÂN GỐC RỄ 5M & KẾ HOẠCH CAPA", meta['curr_period_str'], 8)
        headers_5m = ["Tên lỗi kỹ thuật", "AQL", "Man (Con người)", "Machine (Máy móc)", "Material (Vật tư)", "Method (Phương pháp)", "Xử lý tức thời", "Phòng ngừa dài hạn (CAPA)"]
        for c_idx, h in enumerate(headers_5m, 1):
            c = ws7.cell(row=4, column=c_idx, value=h)
            c.font = font_tbl_hdr
            c.fill = fill_accent
            c.alignment = align_center
            c.border = border_header

        for idx, d5 in enumerate(data.get("defect_5m", []), 5):
            ws7.row_dimensions[idx].height = 36
            vals = [
                d5["defect_name"], d5["aql_class"],
                d5["ishikawa"]["man"], d5["ishikawa"]["machine"], d5["ishikawa"]["material"], d5["ishikawa"]["method"],
                d5["containment_action"], d5["preventive_capa"]
            ]
            for c_idx, val in enumerate(vals, 1):
                c = ws7.cell(row=idx, column=c_idx, value=val)
                c.font = font_bold if c_idx == 1 else font_regular
                c.border = border_cell
                c.alignment = align_center if c_idx == 2 else align_left

        # ==============================================================
        # TAB 8: QC_Audit_Va_CAPA
        # ==============================================================
        ws8 = wb.create_sheet(title="QC_Audit_Va_CAPA")
        create_banner(ws8, "ĐÁNH GIÁ NĂNG SUẤT KIỂM ĐỊNH & KẾ HOẠCH HÀNH ĐỘNG 5W2H", meta['curr_period_str'], 9)
        ws8.cell(row=4, column=1, value="1. BẢNG KIỂM TOÁN NĂNG SUẤT ĐỘI NGŨ KIỂM TRA VIÊN (QC ROSTER)").font = font_sec_hdr
        headers_insp = ["STT", "Họ tên KCS", "Công đoạn chính", "Tổng số phiếu", "Phiếu Đạt", "Phiếu Không đạt", "Tỷ lệ Đạt", "Số SP lỗi", "Xếp loại"]
        for c_idx, h in enumerate(headers_insp, 1):
            c = ws8.cell(row=5, column=c_idx, value=h)
            c.font = font_tbl_hdr
            c.fill = fill_accent
            c.alignment = align_center
            c.border = border_header

        next_r = 6
        for idx, insp in enumerate(data["inspectors"], 1):
            ws8.row_dimensions[next_r].height = 20
            row_vals = [
                idx, insp["name"], insp.get("stage", "Kiểm định"), insp["total"],
                insp["pass_cnt"], insp["fail_cnt"], f"{insp['pass_rate']}%", insp["error_qty"], insp.get("evaluation", "Đạt chuẩn")
            ]
            for c_idx, val in enumerate(row_vals, 1):
                c = ws8.cell(row=next_r, column=c_idx, value=val)
                c.font = font_regular
                c.border = border_cell
                c.alignment = align_left if c_idx == 2 else align_center
            next_r += 1

        next_r += 2
        ws8.cell(row=next_r, column=1, value="2. KẾ HOẠCH HÀNH ĐỘNG ƯU TIÊN 5W2H").font = font_sec_hdr
        next_r += 1
        headers_a = ["ID", "Tiêu đề hành động", "Nội dung chỉ đạo & Hướng giải quyết", "Bộ phận phụ trách", "Chỉ tiêu KPI đo lường", "Thời hạn hoàn thành"]
        for c_idx, h in enumerate(headers_a, 1):
            c = ws8.cell(row=next_r, column=c_idx, value=h)
            c.font = font_tbl_hdr
            c.fill = fill_sub_hdr
            c.alignment = align_center
            c.border = border_header
        next_r += 1

        for a in data["actions"]:
            ws8.row_dimensions[next_r].height = 26
            vals = [
                a["id"], a["title"], a["desc"], 
                a.get("dept", "Quản đốc xưởng"), a.get("kpi", "Tỷ lệ đạt > 90%"), a.get("timeline", "Trong tuần")
            ]
            for c_idx, val in enumerate(vals, 1):
                c = ws8.cell(row=next_r, column=c_idx, value=val)
                c.font = font_bold if c_idx in [1, 2] else font_regular
                c.border = border_cell
                c.alignment = align_center if c_idx in [1, 5, 6] else align_left
            next_r += 1

        # Tự động điều chỉnh độ rộng cột
        for ws in wb.worksheets:
            for col in ws.columns:
                col_letter = get_column_letter(col[0].column)
                max_len = 0
                for cell in col:
                    if cell.row in [1, 2]: continue
                    max_len = max(max_len, len(str(cell.value or "")))
                ws.column_dimensions[col_letter].width = max(min(max_len + 4, 45), 12)

        wb.save(output_path)
        return output_path
