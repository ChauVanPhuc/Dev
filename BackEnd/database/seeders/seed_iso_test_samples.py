import os
import sys
import shutil
import json
import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Đảm bảo import được các module từ BackEnd
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

from config.database import SessionLocal
from modules.inspection.models.iso_models import (
    ISODocument,
    ISORevisionLog,
    ISOSection,
    ISOProcessStep,
    ISOProcess,
    ISOProcessSection,
    ISOProcessStepInstance
)
from modules.iso_approval.models.iso_approval_model import ISOApprovalLog
from modules.iso_signature.models.iso_signature_model import ISOSignature
from modules.iso_signature.services.iso_signature_service import ISOSignatureService


def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)


def create_sample_docx_capa(output_path: str):
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(0.7)
        s.bottom_margin = Inches(0.7)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)

    # 1. Bìa Header Table
    table0 = doc.add_table(rows=4, cols=4)
    table0.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr_cells = table0.rows[0].cells
    hdr_cells[0].text = "CÔNG TY CỔ PHẦN VINA G7"
    hdr_cells[1].text = "QUY TRÌNH HÀNH ĐỘNG KHẮC PHỤC VÀ PHÒNG NGỪA (CAPA)"
    hdr_cells[2].text = "Mã hiệu: G7.CL-QT02"
    hdr_cells[3].text = "Lần ban hành: 02"

    r1 = table0.rows[1].cells
    r1[0].text = "Bộ phận: Quản lý Chất lượng"
    r1[1].text = "Hệ thống Quản lý Chất lượng ISO 9001:2015"
    r1[2].text = "Ngày ban hành: 2026-10-01"
    r1[3].text = "Trang: 1/4"

    r2 = table0.rows[2].cells
    r2[0].text = "Người soạn thảo: Phạm Thị Mai"
    r2[1].text = "Chức vụ: QA Document Controller"
    r2[2].text = "Người soát xét: Nguyễn Văn An"
    r2[3].text = "Chức vụ: Trưởng phòng QLCL"

    r3 = table0.rows[3].cells
    r3[0].text = "Người phê duyệt: Trần Đình Hùng"
    r3[1].text = "Chức vụ: Tổng Giám Đốc"
    r3[2].text = "Cấp phê duyệt: Cấp công ty"
    r3[3].text = "Hiệu lực: Ban hành nội bộ"

    for row in table0.rows:
        for c in row.cells:
            for p in c.paragraphs:
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.space_before = Pt(2)

    doc.add_paragraph()

    # 2. Nhật ký sửa đổi (Revision Log)
    p_rev = doc.add_paragraph("THEO DÕI SỬA ĐỔI NỘI DUNG TÀI LIỆU")
    p_rev.runs[0].bold = True
    p_rev.runs[0].font.size = Pt(11)

    table_rev = doc.add_table(rows=3, cols=4)
    table_rev.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Số TT", "Ngày Sửa", "Nội Dung Sửa Đổi", "Trang Số"]
    for i, h in enumerate(headers):
        c = table_rev.rows[0].cells[i]
        c.text = h
        set_cell_background(c, "E2E8F0")
        c.paragraphs[0].runs[0].bold = True

    data_rev = [
        ["1", "2025-06-15", "Ban hành lần đầu theo tiêu chuẩn ISO 9001:2015", "Tất cả"],
        ["2", "2026-10-01", "Cập nhật biểu mẫu 5-Why và phương thức đối ứng trên SmartFlow ERP", "Trang 2-3"]
    ]
    for row_idx, row_data in enumerate(data_rev):
        for col_idx, val in enumerate(row_data):
            table_rev.rows[row_idx + 1].cells[col_idx].text = val

    doc.add_paragraph()

    # 3. Các mục nội dung văn bản
    sections = [
        ("1. Mục đích.", "Quy định trình tự ghi nhận, phân tích nguyên nhân gốc rễ, đề xuất biện pháp khắc phục phòng ngừa (CAPA) nhằm loại bỏ nguy cơ tái diễn sự không phù hợp trong toàn bộ hệ thống vận hành và sản xuất của VINA G7."),
        ("2. Phạm vi áp dụng.", "Áp dụng cho toàn thể các phòng ban: Sản xuất, Quản lý chất lượng, Kỹ thuật công nghệ, Kho vận, Mua hàng và Khối văn phòng."),
        ("3. Tài liệu viện dẫn.", "Tiêu chuẩn ISO 9001:2015 - Điều khoản 10.2 (Sự không phù hợp và hành động khắc phục).\nSổ tay chất lượng VINA G7 (G7-STCL)."),
        ("4. Định nghĩa và Từ viết tắt.", "- CAPA: Corrective and Preventive Actions (Hành động khắc phục và phòng ngừa).\n- NCR: Non-Conformity Report (Phiếu ghi nhận sự không phù hợp).\n- 5-Why: Phương pháp 5 câu hỏi truy tìm nguyên nhân gốc rễ."),
        ("5. Biểu mẫu liên quan.", "- BM01: Phiếu yêu cầu hành động CAPA (G7.CL-BM01)\n- BM02: Báo cáo phân tích 5-Why và biện pháp đối ứng (G7.CL-BM02)\n- BM03: Bảng theo dõi và đánh giá hiệu lực CAPA (G7.CL-BM03)")
    ]

    for title, body in sections:
        p_t = doc.add_paragraph(title)
        p_t.runs[0].bold = True
        p_t.paragraph_format.space_before = Pt(6)
        p_t.paragraph_format.space_after = Pt(2)
        p_b = doc.add_paragraph(body)
        p_b.paragraph_format.space_after = Pt(4)

    # 4. Bảng các bước quy trình & lưu đồ
    p_step_hdr = doc.add_paragraph("6. Trình tự thực hiện và Lưu đồ quy trình.")
    p_step_hdr.runs[0].bold = True
    p_step_hdr.paragraph_format.space_before = Pt(8)

    table_steps = doc.add_table(rows=6, cols=4)
    table_steps.alignment = WD_TABLE_ALIGNMENT.CENTER
    step_cols = ["Bước", "Trách nhiệm", "Lưu đồ", "Biểu mẫu / Phụ lục"]
    for i, h in enumerate(step_cols):
        c = table_steps.rows[0].cells[i]
        c.text = h
        set_cell_background(c, "E2E8F0")
        c.paragraphs[0].runs[0].bold = True

    steps_data = [
        ["1", "Bộ phận phát hiện lỗi", "Phát hiện sự không phù hợp", "Phiếu NCR"],
        ["2", "Tổ CAPA liên phòng ban", "Phân tích nguyên nhân 5-Why", "Biểu mẫu 5-Why"],
        ["3", "Đơn vị chịu trách nhiệm", "Lập kế hoạch khắc phục & phòng ngừa", "Kế hoạch CAPA"],
        ["4", "Trưởng phòng QLCL & BGĐ", "Thẩm định và phê duyệt giải pháp", "Chữ ký phê duyệt"],
        ["5", "Phòng QLCL (QA)", "Theo dõi và đánh giá hiệu lực sau 30 ngày", "Báo cáo hiệu lực CAPA"]
    ]

    for row_idx, row_data in enumerate(steps_data):
        for col_idx, val in enumerate(row_data):
            table_steps.rows[row_idx + 1].cells[col_idx].text = val

    doc.save(output_path)
    print(f"Generated DOCX: {output_path}")


def create_sample_docx_iqc(output_path: str):
    doc = docx.Document()
    for s in doc.sections:
        s.top_margin = Inches(0.7)
        s.bottom_margin = Inches(0.7)
        s.left_margin = Inches(0.8)
        s.right_margin = Inches(0.8)

    table0 = doc.add_table(rows=3, cols=4)
    table0.alignment = WD_TABLE_ALIGNMENT.CENTER
    table0.rows[0].cells[0].text = "CÔNG TY CỔ PHẦN VINA G7"
    table0.rows[0].cells[1].text = "PHIẾU KIỂM TRA CHẤT LƯỢNG NGUYÊN VẬT LIỆU ĐẦU VÀO (IQC)"
    table0.rows[0].cells[2].text = "Mã hiệu: G7.CL-BM01"
    table0.rows[0].cells[3].text = "Lần ban hành: 01"

    table0.rows[1].cells[0].text = "Bộ phận: Quản lý Chất lượng (QC)"
    table0.rows[1].cells[1].text = "Biểu mẫu kiểm soát tiêu chuẩn nhập kho"
    table0.rows[1].cells[2].text = "Ngày ban hành: 2026-10-01"
    table0.rows[1].cells[3].text = "Cấp phê duyệt: Cấp phòng"

    table0.rows[2].cells[0].text = "Người biên soạn: Phạm Thị Mai"
    table0.rows[2].cells[1].text = "QA Document Controller"
    table0.rows[2].cells[2].text = "Người duyệt: Nguyễn Văn An"
    table0.rows[2].cells[3].text = "Trưởng phòng QLCL"

    doc.add_paragraph()
    p_m = doc.add_paragraph("1. Mục đích & Tiêu chuẩn áp dụng:")
    p_m.runs[0].bold = True
    doc.add_paragraph("Kiểm tra toàn diện 100% lô gỗ, ván MDF, sơn PU, phụ kiện kim khí nhập xưởng theo tiêu chuẩn AQL Bậc II (Level II) - Sai hỏng chấp nhận được AQL 1.0/2.5.")

    p_p = doc.add_paragraph("2. Danh mục các hạng mục kiểm tra (Checklist IQC):")
    p_p.runs[0].bold = True

    table_ck = doc.add_table(rows=5, cols=4)
    table_ck.alignment = WD_TABLE_ALIGNMENT.CENTER
    ck_headers = ["Hạng mục kiểm tra", "Tiêu chuẩn kỹ thuật", "Phương pháp kiểm", "Đánh giá"]
    for i, h in enumerate(ck_headers):
        c = table_ck.rows[0].cells[i]
        c.text = h
        set_cell_background(c, "E2E8F0")
        c.paragraphs[0].runs[0].bold = True

    ck_data = [
        ["1. Ngoại quan bề mặt", "Không trầy xước, không nứt toác, màu đồng nhất", "Mắt thường & Đèn chuẩn D65", "Đạt / Không đạt"],
        ["2. Kích thước (D x R x C)", "Dung sai ±0.5mm so với bản vẽ kỹ thuật", "Thước kẹp điện tử Mitutoyo", "Ghi số đo thực tế"],
        ["3. Độ ẩm gỗ tự nhiên / ván", "Độ ẩm từ 8% - 12%", "Máy đo độ ẩm gỗ Wagner", "Ghi % thực tế"],
        ["4. Chứng từ CO/CQ, FSC", "Đầy đủ nguồn gốc gỗ hợp pháp và test report", "Đối chiếu hồ sơ hải quan", "Đạt / Không đạt"]
    ]
    for row_idx, row_data in enumerate(ck_data):
        for col_idx, val in enumerate(row_data):
            table_ck.rows[row_idx + 1].cells[col_idx].text = val

    doc.save(output_path)
    print(f"Generated DOCX: {output_path}")


def seed_iso_database():
    db = SessionLocal()
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    date_str = datetime.datetime.now().strftime("%Y-%m-%d")

    # Đảm bảo chữ ký mẫu đã có
    ISOSignatureService.seed_initial_signatures_if_empty(db)

    print("=== BẮT ĐẦU KHỞI TẠO BÁO CÁO VÀ QUY TRÌNH MẪU ISO SMARTFLOW ===")

    # -------------------------------------------------------------------------
    # 1. TÀI LIỆU MẪU (ISODocument)
    # -------------------------------------------------------------------------
    # Mẫu 1: G7.CL-BM01 (Chờ Trưởng phòng duyệt - Cấp phòng)
    doc1 = db.query(ISODocument).filter(ISODocument.code == "G7.CL-BM01").first()
    if not doc1:
        doc1 = ISODocument(
            code="G7.CL-BM01",
            name="Phiếu kiểm tra chất lượng nguyên vật liệu đầu vào (IQC Checklist)",
            version="01",
            issue_date=date_str,
            issuer="Phạm Thị Mai",
            approver="Nguyễn Văn An",
            status="Chờ Trưởng phòng duyệt",
            folder="CL/IQC",
            doc_type="Biểu mẫu kiểm tra",
            document_level="Cấp phòng",
            symbol="G7.CL-BM01",
            notes="Biểu mẫu kiểm tra bắt buộc cho toàn bộ vật tư gỗ, phụ kiện và hóa chất sơn nhập xưởng",
            created_at=now_str,
            updated_at=now_str
        )
        db.add(doc1)
        db.flush()

        # Sections
        db.add(ISOSection(document_id=doc1.id, section_name="Mục đích", content_html="Quy định tiêu chuẩn kiểm soát chất lượng vật tư đầu vào trước khi nhập kho."))
        db.add(ISOSection(document_id=doc1.id, section_name="Phạm vi áp dụng", content_html="Áp dụng cho Bộ phận QC, Kho nguyên vật liệu và Thu mua."))
        db.add(ISOSection(document_id=doc1.id, section_name="Tiêu chuẩn lấy mẫu", content_html="Áp dụng tiêu chuẩn AQL MIL-STD-105E Bậc II, AQL Minor 2.5, Major 1.0, Critical 0."))

        # Steps
        steps1 = [
            ("1. Tiếp nhận và đối chiếu PO", "Thu mua & Thủ kho", "Kiểm tra số lượng theo hóa đơn và đơn đặt hàng PO.", [{"field": "So_PO", "label": "Số PO", "type": "text"}, {"field": "So_Luong", "label": "Số lượng thực nhận", "type": "number"}]),
            ("2. Lấy mẫu ngẫu nhiên theo AQL", "Nhân viên QC", "Rút mẫu kiểm tra theo bảng AQL Bậc II.", [{"field": "So_Mau", "label": "Số lượng mẫu rút", "type": "number"}, {"field": "Vi_Tri_Lay_Mau", "label": "Vị trí lấy mẫu", "type": "text"}]),
            ("3. Đo lường kích thước & độ ẩm", "Nhân viên QC", "Dùng thước kẹp Mitutoyo và máy đo độ ẩm Wagner.", [{"field": "Do_Am_TB", "label": "Độ ẩm trung bình (%)", "type": "number"}, {"field": "Ket_Qua_Kich_Thuoc", "label": "Kích thước hình học", "type": "select"}]),
            ("4. Đánh giá và ký duyệt", "Trưởng phòng QLCL", "Xác nhận kết quả đạt chuẩn nhập kho hoặc lập biên bản từ chối.", [{"field": "Ket_Luan", "label": "Kết luận (Đạt / Hàng lỗi)", "type": "select"}, {"field": "Chu_Ky_QC", "label": "Ký duyệt", "type": "signature"}])
        ]
        for idx, (s_name, role, inst, ck) in enumerate(steps1):
            db.add(ISOProcessStep(
                document_id=doc1.id,
                step_number=idx + 1,
                name=s_name,
                assignee_role=role,
                instructions=inst,
                checklist_json=json.dumps(ck),
                flow_node_id=f"step_{idx+1}"
            ))
        print("-> Đã tạo mẫu tài liệu G7.CL-BM01 (Chờ Trưởng phòng duyệt)")

    # Mẫu 2: G7.SX-BM02 (Chờ BGĐ duyệt - Cấp công ty, đã có duyệt bước 1 của Trưởng phòng SX)
    doc2 = db.query(ISODocument).filter(ISODocument.code == "G7.SX-BM02").first()
    if not doc2:
        doc2 = ISODocument(
            code="G7.SX-BM02",
            name="Phiếu yêu cầu hành động khắc phục phòng ngừa (Phiếu CAPA / NCR)",
            version="02",
            issue_date=date_str,
            issuer="Lê Hoàng Long",
            approver="Trần Đình Hùng",
            status="Chờ BGĐ duyệt",
            folder="SX/CAPA",
            doc_type="Biểu mẫu CAPA",
            document_level="Cấp công ty",
            symbol="G7.SX-BM02",
            notes="Phiếu xử lý sự cố chất lượng nghiêm trọng vượt thẩm quyền cấp phân xưởng",
            created_at=now_str,
            updated_at=now_str
        )
        db.add(doc2)
        db.flush()

        db.add(ISOSection(document_id=doc2.id, section_name="Mục đích", content_html="Ghi nhận sai lệch kỹ thuật nghiêm trọng trong sản xuất và phân công xử lý triệt để."))
        db.add(ISOSection(document_id=doc2.id, section_name="Phạm vi", content_html="Toàn bộ các xưởng sản xuất: Xưởng Mộc, Xưởng Sơn, Xưởng Bọc Nệm, Xưởng Đóng Gói."))

        steps2 = [
            ("1. Ghi nhận lỗi bất thường", "Kỹ thuật xưởng", "Mô tả chi tiết vị trí lỗi, tỷ lệ phế phẩm và lô hàng ảnh hưởng.", []),
            ("2. Phân tích nguyên nhân 5-Why", "Tổ điều tra chất lượng", "Xác định nguyên nhân gốc: Con người, Máy móc, Nguyên liệu, Phương pháp.", []),
            ("3. Biện pháp đối ứng khẩn cấp", "Quản đốc xưởng", "Cách ly sản phẩm lỗi, chặn xuất hàng và sửa chữa tạm thời.", []),
            ("4. Đề xuất phương án dài hạn", "Trưởng phòng QLCL & SX", "Thay đổi cữ gá, huấn luyện thao tác công nhân, cập nhật SOP.", []),
            ("5. Phê duyệt ban hành", "Ban Giám Đốc", "Tổng Giám Đốc ký duyệt cấp ngân sách cải tiến và thời hạn hoàn thành.", [])
        ]
        for idx, (s_name, role, inst, ck) in enumerate(steps2):
            db.add(ISOProcessStep(
                document_id=doc2.id,
                step_number=idx + 1,
                name=s_name,
                assignee_role=role,
                instructions=inst,
                checklist_json=json.dumps(ck),
                flow_node_id=f"step_{idx+1}"
            ))

        # Ghi log duyệt bước 1 của Trưởng phòng Sản xuất
        db.add(ISOApprovalLog(
            item_type="document",
            item_id=doc2.id,
            item_code=doc2.code,
            item_name=doc2.name,
            action="APPROVE_DEPT",
            action_by="lehoanglong",
            action_by_name="Lê Hoàng Long",
            role="Trưởng phòng",
            previous_status="Chờ Trưởng phòng duyệt",
            new_status="Chờ BGĐ duyệt",
            comment="Trưởng phòng Sản Xuất đã thẩm định và xác nhận phương án đối ứng lỗi. Kính trình Tổng Giám Đốc phê duyệt ban hành áp dụng.",
            created_at=now_str
        ))
        print("-> Đã tạo mẫu tài liệu G7.SX-BM02 (Chờ BGĐ duyệt)")

    # Mẫu 3: G7.KT-BM03 (Dự thảo - Cấp công ty)
    doc3 = db.query(ISODocument).filter(ISODocument.code == "G7.KT-BM03").first()
    if not doc3:
        doc3 = ISODocument(
            code="G7.KT-BM03",
            name="Biên bản thay đổi kỹ thuật sản phẩm và định mức BOM (ECN)",
            version="01",
            issue_date=date_str,
            issuer="Vũ Đức Thắng",
            approver="Nguyễn Văn An",
            status="Dự thảo",
            folder="KT/ECN",
            doc_type="Tiêu chuẩn kỹ thuật",
            document_level="Cấp công ty",
            symbol="G7.KT-BM03",
            notes="Phiếu đề xuất cải tiến kết cấu gỗ và phụ kiện nhằm giảm giá thành và tối ưu thời gian lắp ráp",
            created_at=now_str,
            updated_at=now_str
        )
        db.add(doc3)
        db.flush()
        db.add(ISOSection(document_id=doc3.id, section_name="Mục đích", content_html="Quản lý việc thay đổi bản vẽ, kết cấu mộng âm dương, hoặc mã phụ kiện ngũ kim."))
        print("-> Đã tạo mẫu tài liệu G7.KT-BM03 (Dự thảo)")

    # -------------------------------------------------------------------------
    # 2. QUY TRÌNH NGHIỆP VỤ (ISOProcess)
    # -------------------------------------------------------------------------

    # Quy trình 1: G7.CL-QT01 (Chờ Trưởng phòng duyệt - Cấp phòng)
    proc1 = db.query(ISOProcess).filter(ISOProcess.code == "G7.CL-QT01").first()
    if not proc1:
        proc1 = ISOProcess(
            code="G7.CL-QT01",
            name="Quy trình kiểm soát nguyên vật liệu đầu vào (IQC Process)",
            iso_document_id=doc1.id,
            owner="Nguyễn Văn An",
            editor="Phạm Thị Mai",
            approver="Nguyễn Văn An",
            issue_date=date_str,
            status="Chờ Trưởng phòng duyệt",
            document_level="Cấp phòng",
            symbol="G7.CL-QT01",
            role="Trưởng phòng Quản lý Chất lượng",
            notes="Quy trình chuẩn hóa 6 bước từ tiếp nhận, lấy mẫu đến dán tem PASS/REJECT kho",
            created_at=now_str,
            updated_at=now_str
        )
        db.add(proc1)
        db.flush()

        # Sections
        proc1_sections = [
            ("Mục đích", "Quy trình này đảm bảo việc kiểm soát chất lượng vật tư đầu vào được thực hiện nghiêm ngặt, phù hợp tiêu chuẩn ISO 9001:2015 của VINA G7, ngăn ngừa lỗi lọt vào chuyền sản xuất."),
            ("Phạm vi áp dụng", "Áp dụng cho toàn bộ nguyên vật liệu gỗ, sơn, keo, ngũ kim nhập vào nhà máy Vina G7 Đồng Nai."),
            ("Tài liệu viện dẫn", "Tiêu chuẩn ISO 9001:2015, Tiêu chuẩn FSC nguồn gốc gỗ, Bảng lấy mẫu tiêu chuẩn AQL MIL-STD-105E."),
            ("Định nghĩa và Viết tắt", "IQC: In-coming Quality Control (Kiểm tra chất lượng đầu vào); NVL: Nguyên vật liệu; PO: Purchase Order."),
            ("Biểu mẫu liên quan", "G7.CL-BM01: Phiếu kiểm tra IQC; G7.KHO-BM01: Phiếu nhập kho; G7.CL-BM02: Tem trạng thái NVL (Đạt: Xanh, Chờ test: Vàng, Không đạt: Đỏ).")
        ]
        for s_name, content in proc1_sections:
            db.add(ISOProcessSection(process_id=proc1.id, section_name=s_name, content_html=content))

        # Steps
        proc1_steps = [
            ("1. Tiếp nhận NVL", "Thu mua & Thủ kho", "Nhận hàng tại cổng kho, đối chiếu packing list, số kiện và ngoại quan xe giao hàng.", "G7.KHO-BM01"),
            ("2. Kiểm tra giấy tờ nhập kho", "Kho", "Kiểm tra CO/CQ, chứng chỉ kiểm dịch thực vật, phiếu xuất kho bên bán.", "Hồ sơ chứng từ"),
            ("3. Kiểm tra chất lượng đầu vào", "QC", "Rút mẫu kiểm tra theo AQL Bậc II: đo độ ẩm, kích thước, kiểm tra khuyết tật mắt gỗ, nứt tét.", "G7.CL-BM01"),
            ("4. Đánh giá kết quả & Quyết định", "Trưởng phòng QLCL", "Xem xét báo cáo thử nghiệm: Đạt tiêu chuẩn cho nhập kho; Không đạt lập biên bản từ chối.", "Biên bản đánh giá"),
            ("5. Nhập kho và dán tem trạng thái", "Kho", "Dán tem xanh ĐẠT CHUẨN và sắp xếp lên kệ pallet theo vị trí chỉ định.", "Tem kho"),
            ("6. Bàn giao lên chuyền sản xuất", "Sản xuất & Kho", "Xuất vật tư theo lệnh sản xuất và phiếu yêu cầu cấp phát vật tư.", "Lệnh sản xuất")
        ]
        for idx, (s_name, role, inst, tpl) in enumerate(proc1_steps):
            db.add(ISOProcessStepInstance(
                process_id=proc1.id,
                step_number=idx + 1,
                name=s_name,
                assignee_role=role,
                instructions=inst,
                checklist_json=json.dumps([{"item": f"Nội dung kiểm tra {idx+1}", "status": "Pass"}]),
                flow_node_id=f"step_{idx+1}"
            ))

        print("-> Đã tạo quy trình nghiệp vụ G7.CL-QT01 (Chờ Trưởng phòng duyệt)")

    # Quy trình 2: G7.CL-QT02 (Chờ Trưởng phòng duyệt - Cấp công ty: 2 cấp duyệt)
    proc2 = db.query(ISOProcess).filter(ISOProcess.code == "G7.CL-QT02").first()
    if not proc2:
        proc2 = ISOProcess(
            code="G7.CL-QT02",
            name="Quy trình hành động khắc phục và phòng ngừa CAPA toàn công ty",
            iso_document_id=doc2.id,
            owner="Nguyễn Văn An",
            editor="Phạm Thị Mai",
            approver="Trần Đình Hùng",
            issue_date=date_str,
            status="Chờ Trưởng phòng duyệt",
            document_level="Cấp công ty",
            symbol="G7.CL-QT02",
            role="Ban Giám Đốc",
            notes="Quy trình xử lý sự không phù hợp hệ thống 2 cấp: Trưởng phòng QLCL duyệt bước 1 -> Tổng Giám Đốc duyệt ban hành bước 2",
            created_at=now_str,
            updated_at=now_str
        )
        db.add(proc2)
        db.flush()

        proc2_sections = [
            ("Mục đích", "Quy định quy trình loại bỏ nguyên nhân gốc rễ của sự không phù hợp nhằm ngăn ngừa sự tái diễn."),
            ("Phạm vi", "Áp dụng trong toàn bộ nhà máy VINA G7 và các phòng ban chức năng."),
            ("Tài liệu viện dẫn", "ISO 9001:2015 Điều khoản 10.2; Quy trình kiểm soát thông tin dạng văn bản G7.CL-QT05.")
        ]
        for s_name, content in proc2_sections:
            db.add(ISOProcessSection(process_id=proc2.id, section_name=s_name, content_html=content))

        proc2_steps = [
            ("1. Ghi nhận sự không phù hợp", "Bộ phận phát hiện", "Điền phiếu NCR trên SmartFlow trong vòng 4 giờ kể từ khi phát hiện sự cố."),
            ("2. Điều tra nguyên nhân 5-Why", "Tổ công tác chuyên môn", "Tổ chức họp khẩn cấp, sử dụng biểu đồ Ishikawa xương cá và kỹ thuật 5-Why."),
            ("3. Lập kế hoạch hành động CAPA", "Trưởng bộ phận liên quan", "Xác định rõ người thực hiện, nguồn lực, chi phí và thời hạn hoàn tất."),
            ("4. Thẩm định và ký duyệt", "Trưởng phòng QLCL & Ban Giám Đốc", "Trưởng phòng QLCL duyệt vòng 1, Tổng Giám Đốc ký số phê duyệt ban hành vòng 2."),
            ("5. Đánh giá hiệu lực sau 30 ngày", "Phòng QA", "Kiểm tra hiện trường, thẩm định tỷ lệ lỗi tái diễn và ký đóng phiếu CAPA.")
        ]
        for idx, (s_name, role, inst) in enumerate(proc2_steps):
            db.add(ISOProcessStepInstance(
                process_id=proc2.id,
                step_number=idx + 1,
                name=s_name,
                assignee_role=role,
                instructions=inst,
                checklist_json=json.dumps([]),
                flow_node_id=f"step_{idx+1}"
            ))
        print("-> Đã tạo quy trình nghiệp vụ G7.CL-QT02 (Chờ Trưởng phòng duyệt - Cấp công ty)")

    # Quy trình 3: G7.SX-QT02 (Chờ BGĐ duyệt - Cấp công ty, đã có log duyệt Bước 1 của Trưởng phòng SX)
    proc3 = db.query(ISOProcess).filter(ISOProcess.code == "G7.SX-QT02").first()
    if not proc3:
        proc3 = ISOProcess(
            code="G7.SX-QT02",
            name="Quy trình kiểm soát chất lượng trên chuyền sản xuất (PQC)",
            iso_document_id=doc2.id,
            owner="Lê Hoàng Long",
            editor="Nguyễn Tiến Dũng",
            approver="Trần Đình Hùng",
            issue_date=date_str,
            status="Chờ BGĐ duyệt",
            document_level="Cấp công ty",
            symbol="G7.SX-QT02",
            role="Tổng Giám Đốc",
            notes="Quy trình kiểm tra chất lượng 4 công đoạn: Phôi tinh, Lắp ráp, Đánh bóng, Sơn hoàn thiện",
            created_at=now_str,
            updated_at=now_str
        )
        db.add(proc3)
        db.flush()

        proc3_sections = [
            ("Mục đích", "Quy định quy trình kiểm soát chất lượng tại từng trạm thao tác sản xuất theo nguyên tắc: Không nhận hàng lỗi - Không tạo ra hàng lỗi - Không chuyển hàng lỗi cho công đoạn sau.")
        ]
        for s_name, content in proc3_sections:
            db.add(ISOProcessSection(process_id=proc3.id, section_name=s_name, content_html=content))

        proc3_steps = [
            ("1. Kiểm tra đầu ca sản xuất (First Piece)", "Tổ trưởng & QC chuyền", "Kiểm tra mẫu đầu tiên của ca máy CNC và máy dán cạnh trước khi chạy hàng loạt."),
            ("2. Tự kiểm soát tại từng trạm (Self-check)", "Công nhân đứng máy", "Công nhân tự đo kích thước và kiểm tra cạnh mộng theo hướng dẫn thao tác SOS."),
            ("3. Tuần tra chất lượng (Patrol QC)", "Kỹ thuật viên QC", "Tuần tra định kỳ 2 giờ/lần tại tất cả các trạm máy."),
            ("4. Đóng dấu PASS công đoạn", "QC Trạm", "Sản phẩm đạt yêu cầu được dán mã vạch chuyển sang công đoạn kế tiếp.")
        ]
        for idx, (s_name, role, inst) in enumerate(proc3_steps):
            db.add(ISOProcessStepInstance(
                process_id=proc3.id,
                step_number=idx + 1,
                name=s_name,
                assignee_role=role,
                instructions=inst,
                checklist_json=json.dumps([]),
                flow_node_id=f"step_{idx+1}"
            ))

        # Log duyệt Bước 1 của Trưởng phòng Sản xuất
        db.add(ISOApprovalLog(
            item_type="process",
            item_id=proc3.id,
            item_code=proc3.code,
            item_name=proc3.name,
            action="APPROVE_DEPT",
            action_by="lehoanglong",
            action_by_name="Lê Hoàng Long",
            role="Trưởng phòng",
            previous_status="Chờ Trưởng phòng duyệt",
            new_status="Chờ BGĐ duyệt",
            comment="Trưởng phòng Sản Xuất đã nghiệm thu tài liệu và đồng thuận tiêu chuẩn kiểm tra công đoạn PQC. Kính trình Tổng Giám Đốc ký duyệt ban hành toàn công ty.",
            created_at=now_str
        ))
        print("-> Đã tạo quy trình nghiệp vụ G7.SX-QT02 (Chờ BGĐ duyệt)")

    # Quy trình 4: G7.KHO-QT01 (Từ chối - Cấp phòng)
    proc4 = db.query(ISOProcess).filter(ISOProcess.code == "G7.KHO-QT01").first()
    if not proc4:
        proc4 = ISOProcess(
            code="G7.KHO-QT01",
            name="Quy trình quản lý nhập xuất và kiểm soát tồn kho vật tư hóa chất",
            iso_document_id=doc1.id,
            owner="Trần Quang Huy",
            editor="Trần Quang Huy",
            approver="Nguyễn Văn An",
            issue_date=date_str,
            status="Từ chối",
            document_level="Cấp phòng",
            symbol="G7.KHO-QT01",
            role="Trưởng phòng Quản lý Chất lượng",
            notes="Hồ sơ bị từ chối do thiếu quy định PCCC và kiểm soát hạn sử dụng keo dán",
            created_at=now_str,
            updated_at=now_str
        )
        db.add(proc4)
        db.flush()

        db.add(ISOProcessSection(process_id=proc4.id, section_name="Mục đích", content_html="Quản lý việc bảo quản và xuất nhập hóa chất sơn, dung môi, keo AB."))

        db.add(ISOApprovalLog(
            item_type="process",
            item_id=proc4.id,
            item_code=proc4.code,
            item_name=proc4.name,
            action="REJECT",
            action_by="nguyenvanan",
            action_by_name="Nguyễn Văn An",
            role="Trưởng phòng",
            previous_status="Chờ Trưởng phòng duyệt",
            new_status="Từ chối",
            comment="Chưa bổ sung quy định kiểm soát nhiệt độ, độ ẩm đối với kho hóa chất và hạn sử dụng keo PU (FIFO). Yêu cầu bổ sung biểu mẫu theo dõi nhật ký kho trước khi trình duyệt lại.",
            created_at=now_str
        ))
        print("-> Đã tạo quy trình nghiệp vụ G7.KHO-QT01 (Từ chối)")

    try:
        db.commit()
        print(">>> TẤT CẢ DỮ LIỆU ĐÃ ĐƯỢC LƯU VÀO DATABASE THÀNH CÔNG! <<<")
    except Exception as e:
        db.rollback()
        print(f"LỖI KHI COMMIT DATABASE: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    sample_dir = os.path.join(workspace_root, "sample_iso_documents")
    os.makedirs(sample_dir, exist_ok=True)

    # 1. Tạo file DOCX mẫu
    doc_iqc_path = os.path.join(sample_dir, "G7.CL-BM01_Phieu_kiem_tra_chat_luong_IQC.docx")
    doc_capa_path = os.path.join(sample_dir, "G7.CL-QT02_Quy_trinh_CAPA_Khac_phuc_phong_ngua.docx")
    
    # Sao chép file quy trình NVL gốc có sẵn sang thư mục mẫu
    src_existing = os.path.join(workspace_root, "G7.CL -QT01_Quy trình kiểm soát nguyên vật liệu đầu vào.docx")
    dest_existing = os.path.join(sample_dir, "G7.CL-QT01_Quy_trinh_kiem_soat_NVL_dau_vao.docx")
    if os.path.exists(src_existing):
        shutil.copy2(src_existing, dest_existing)
        print(f"Copied existing docx to: {dest_existing}")

    create_sample_docx_iqc(doc_iqc_path)
    create_sample_docx_capa(doc_capa_path)

    # Sao chép vào thư mục uploads của BackEnd
    upload_iso_dir = os.path.join(workspace_root, "BackEnd", "static", "uploads", "iso_documents")
    os.makedirs(upload_iso_dir, exist_ok=True)
    for fname in os.listdir(sample_dir):
        if fname.endswith(".docx"):
            shutil.copy2(os.path.join(sample_dir, fname), os.path.join(upload_iso_dir, fname))

    # 2. Nạp dữ liệu vào Database
    seed_iso_database()
