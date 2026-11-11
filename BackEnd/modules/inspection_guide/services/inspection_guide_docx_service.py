# -*- coding: utf-8 -*-
"""
Dịch vụ xuất file Word (.docx) chuyên nghiệp, chi tiết và đạt chuẩn ISO
cho tài liệu Hướng dẫn kiểm tra (HDKT), Hướng dẫn thao tác (SOS), và Lỗi cần chú ý (CTQ).
"""

import os
import io
import re
import html
import zipfile
from datetime import datetime
from typing import List, Optional
from PIL import Image

import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

from config.settings import get_upload_dir
from modules.inspection_guide.models.inspection_guide import InspectionGuide, InspectionGuideStep
from modules.production.models.stages import Stage
from modules.inspection_guide.models.inspection_form_type import InspectionFormType

UPLOAD_DIR = get_upload_dir("inspection_guides")

# Bảng màu đại diện theo phân hệ (Gold Design System / Corporate Theme)
THEME_COLORS = {
    "HDKT": {
        "primary": RGBColor(123, 82, 51),     # Earth Bronze #7B5233
        "primary_hex": "7B5233",
        "bg_light_hex": "FAF6F0",
        "border_hex": "EADCC9",
        "title": "HƯỚNG DẪN KIỂM TRA CHẤT LƯỢNG (HDKT)",
        "label": "Hướng dẫn kiểm tra"
    },
    "SOS": {
        "primary": RGBColor(2, 132, 199),     # Ocean Blue #0284C7
        "primary_hex": "0284C7",
        "bg_light_hex": "F0F9FF",
        "border_hex": "BAE6FD",
        "title": "BẢNG PHÂN TÍCH THAO TÁC CHUẨN (SOS)",
        "label": "Hướng dẫn thao tác"
    },
    "CTQ": {
        "primary": RGBColor(225, 29, 72),     # Rose Crimson #E11D48
        "primary_hex": "E11D48",
        "bg_light_hex": "FFF1F2",
        "border_hex": "FECDD3",
        "title": "ĐIỂM KIỂM SOÁT CHẤT LƯỢNG TRỌNG YẾU (CTQ)",
        "label": "Lỗi cần chú ý"
    }
}

INSPECTION_TYPE_NAMES = {
    'first_sample': 'Kiểm tra mẫu lần đầu',
    'mau-dau-tien': 'Kiểm tra mẫu lần đầu',
    'mau_dau_tien': 'Kiểm tra mẫu lần đầu',
    're_inspect': 'Kiểm tra lại (Re-inspect)',
    're-inspect': 'Kiểm tra lại (Re-inspect)',
    'kiem_tra_lai': 'Kiểm tra lại (Re-inspect)',
    'parameter': 'Kiểm tra thông số kỹ thuật',
    'thong_so': 'Kiểm tra thông số kỹ thuật',
    'do-am': 'Đo độ ẩm gỗ',
    'bam-dinh': 'Kiểm tra bám dính sơn',
    'process': 'Kiểm tra quy trình công đoạn',
    'quy-trinh': 'Kiểm tra quy trình công đoạn',
    'quy_trinh': 'Kiểm tra quy trình công đoạn',
    'qa': 'Vấn đáp nghiệp vụ QA/QC',
    'van_dap': 'Vấn đáp nghiệp vụ QA/QC',
    'daily': 'Ghi nhận lỗi hằng ngày (Patrol)',
    'input_inspection': 'Nhập kho nguyên liệu (IQC)',
    'dau-vao': 'Nhập kho nguyên liệu (IQC)',
    'dau_vao': 'Nhập kho nguyên liệu (IQC)',
    'packaging_inspection': 'Sau đóng gói thành phẩm (OQC)',
    'sau-dong-goi': 'Sau đóng gói thành phẩm (OQC)',
    'sau_dong_goi': 'Sau đóng gói thành phẩm (OQC)'
}


def set_run_font(run, font_name: str = "Arial", size_pt: Optional[float] = None,
                 color_rgb: Optional[RGBColor] = None, bold: Optional[bool] = None,
                 italic: Optional[bool] = None):
    """
    Thiết lập font đồng bộ, chuẩn OpenXML Unicode cho từng đoạn run,
    ngăn ngừa triệt để hiện tượng lỗi font, vỡ ký tự tiếng Việt trên mọi phiên bản Word.
    """
    run.font.name = font_name
    rPr = run._r.get_or_add_rPr()
    rFonts = parse_xml(
        f'<w:rFonts {nsdecls("w")} w:ascii="{font_name}" w:hAnsi="{font_name}" '
        f'w:cs="{font_name}" w:eastAsia="{font_name}"/>'
    )
    rPr.append(rFonts)
    if size_pt is not None:
        run.font.size = Pt(size_pt)
    if color_rgb is not None:
        run.font.color.rgb = color_rgb
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic


def clean_html_to_text(raw_html: Optional[str]) -> str:
    """
    Chuyển đổi chuỗi HTML thành văn bản thuần túy chuẩn:
    - Bảo toàn các khối ngắt dòng có chủ đích (<p>, <br>, <li>, <tr>).
    - Loại bỏ thẻ HTML trước khi giải mã HTML entities (tránh làm mất các dấu so sánh như '<65%').
    - Giải mã triệt để các thực thể HTML (&nbsp;, &amp;, &lt;, &gt;, &quot;...).
    - Ghép nối lại các từ bị ngắt dòng do sao chép dán (\r\n trong câu).
    """
    if not raw_html:
        return ""

    # 1. Đánh dấu các thẻ ngắt dòng/khối có chủ đích
    text = re.sub(r'<br\s*/?>', '@@BREAK@@', raw_html, flags=re.IGNORECASE)
    text = re.sub(r'</?(?:p|div|tr|li|h[1-6])[^>]*>', '@@BREAK@@', text, flags=re.IGNORECASE)

    # 2. Xóa các thẻ HTML còn lại (như <b>, <span>, <i>...) TRƯỚC KHI unescape
    text = re.sub(r'<[^>]+>', '', text)

    # 3. Giải mã HTML entities (&nbsp;, &amp;, &lt;, &gt;, &quot;...)
    text = html.unescape(text)

    # 4. Tách các mục con (+) hoặc (-) bị phân cách bởi nhiều dấu cách hoặc non-breaking spaces
    text = re.sub(r'[\u00a0 ]{2,}(?=[+\-•]\s*[^:]{2,60}:)', '@@BREAK@@', text)

    # 5. Đổi toàn bộ các khoảng trắng đặc biệt và ngắt dòng trong câu thành dấu cách
    text = text.replace('\r', ' ').replace('\n', ' ').replace('\t', ' ').replace('\u00a0', ' ')

    # 6. Khôi phục ngắt dòng thật
    text = text.replace('@@BREAK@@', '\n')

    # 7. Xử lý từng dòng: lọc dòng rác, chuẩn hóa dấu đầu dòng
    cleaned_lines = []
    for raw_line in text.split('\n'):
        line = re.sub(r'[ ]+', ' ', raw_line).strip()
        if not line or line in ('-', '•', '+', '*', '- -', '+ +'):
            continue
        line = re.sub(r'^[-•]\s*[-•]\s*', '- ', line)
        line = re.sub(r'^\+\s*\+\s*', '+ ', line)
        line = re.sub(r'^[-•]\s*\+\s*', '+ ', line)

        # Tách các gạch đầu dòng lồng nhau nếu nằm cùng một dòng (VD: '- Thùng carton... - Đai nẹp...')
        parts = re.split(r'\s+-\s+(?=[A-Z0-9À-Ỹ])', line)
        if len(parts) > 1:
            for idx, p in enumerate(parts):
                p_clean = p.strip()
                if p_clean:
                    if idx > 0 and not p_clean.startswith(('-', '+', '•')):
                        p_clean = '- ' + p_clean
                    cleaned_lines.append(p_clean)
        else:
            cleaned_lines.append(line)

    return '\n'.join(cleaned_lines)


def clean_html_to_paragraphs(raw_html: Optional[str]) -> List[str]:
    """Trả về danh sách các đoạn văn bản đã được làm sạch và chuẩn hóa."""
    text = clean_html_to_text(raw_html)
    return [l.strip() for l in text.split('\n') if l.strip()]


def _add_formatted_content_to_doc(doc, raw_content: Optional[str], theme: dict):
    """
    Chuyển đổi nội dung HTML của bước thành các đoạn văn bản (paragraphs) có cấu trúc
    và định dạng phân cấp chuyên nghiệp trong Word:
    - Mục lớn (-) hoặc tiêu đề phần: Đậm, màu chủ đề (Bronze/Blue/Crimson), thụt lề 0.15"
    - Tiêu chí (+ Phương pháp đo:, + Tiêu chuẩn kỹ thuật:): Biểu tượng ▶, nhãn đậm, thụt lề 0.35"
    - Chi tiết tiêu chí (• Thùng phẳng đẹp..., • Đai nẹp...): Biểu tượng •, thụt lề 0.55"
    - Bảo toàn 100% font Arial, không lỗi tiếng Việt, không còn thực thể HTML (&nbsp;, &amp;...)
    """
    if not raw_content:
        return

    lines = clean_html_to_paragraphs(raw_content)
    if not lines:
        return

    for line in lines:
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.15

        # 1. Hạng mục chính (Ví dụ: "- Quy cách Thùng & Đai nẹp:", "- Nhãn mác & Ký hiệu:", "- Điều kiện Môi trường Kho:")
        if line.startswith(('- ', '• ', '-')) and (':' in line[:60]):
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.left_indent = Inches(0.15)

            clean_line = re.sub(r'^[-•]\s*', '', line)
            match = re.match(r'^([^:]+:)(.*)$', clean_line)
            if match:
                label, rest = match.groups()
                r_ico = p.add_run("■ ")
                set_run_font(r_ico, font_name="Arial", size_pt=9.5, color_rgb=theme["primary"], bold=True)
                r_lbl = p.add_run(label)
                set_run_font(r_lbl, font_name="Arial", size_pt=10, color_rgb=theme["primary"], bold=True)
                if rest.strip():
                    r_rest = p.add_run(" " + rest.strip())
                    set_run_font(r_rest, font_name="Arial", size_pt=9.5, color_rgb=RGBColor(51, 65, 85))
            else:
                r_ico = p.add_run("■ ")
                set_run_font(r_ico, font_name="Arial", size_pt=9.5, color_rgb=theme["primary"], bold=True)
                r = p.add_run(clean_line)
                set_run_font(r, font_name="Arial", size_pt=10, color_rgb=theme["primary"], bold=True)

        # 2. Tiêu chí chi tiết (Bắt đầu bằng "+", ví dụ: "+ Phương pháp & Thiết bị đo:", "+ Tiêu chuẩn kỹ thuật:", "+ Tần suất kiểm tra:")
        elif line.startswith('+'):
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.left_indent = Inches(0.35)

            clean_line = re.sub(r'^\+\s*', '', line)
            match = re.match(r'^([^:]+:)(.*)$', clean_line)
            if match:
                label, rest = match.groups()
                r_plus = p.add_run("▶ ")
                set_run_font(r_plus, font_name="Arial", size_pt=8.5, color_rgb=theme["primary"], bold=True)

                r_lbl = p.add_run(label)
                set_run_font(r_lbl, font_name="Arial", size_pt=9.5, color_rgb=RGBColor(30, 41, 59), bold=True)

                if rest.strip():
                    r_rest = p.add_run(" " + rest.strip())
                    set_run_font(r_rest, font_name="Arial", size_pt=9.5, color_rgb=RGBColor(51, 65, 85))
            else:
                r_plus = p.add_run("▶ ")
                set_run_font(r_plus, font_name="Arial", size_pt=8.5, color_rgb=theme["primary"], bold=True)
                r = p.add_run(clean_line)
                set_run_font(r, font_name="Arial", size_pt=9.5, color_rgb=RGBColor(30, 41, 59), bold=True)

        # 3. Các gạch đầu dòng con (Ví dụ: "- Thùng carton phẳng đẹp...", "- Đai nẹp nhựa chắc chắn...")
        elif line.startswith(('- ', '• ', '-')):
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.left_indent = Inches(0.55)

            clean_sub = re.sub(r'^[-•]\s*', '', line).strip()
            r_bullet = p.add_run("• ")
            set_run_font(r_bullet, font_name="Arial", size_pt=9.5, color_rgb=RGBColor(100, 116, 139), bold=True)

            r_sub = p.add_run(clean_sub)
            set_run_font(r_sub, font_name="Arial", size_pt=9.5, color_rgb=RGBColor(51, 65, 85))

        # 4. Các dòng văn bản bổ sung / ghi chú (Ví dụ: "Độ ẩm không khí trong kho <65%")
        else:
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.left_indent = Inches(0.55)

            match = re.match(r'^([^:]{2,45}:)(.*)$', line)
            if match:
                label, rest = match.groups()
                r_lbl = p.add_run(label)
                set_run_font(r_lbl, font_name="Arial", size_pt=9.5, color_rgb=RGBColor(30, 41, 59), bold=True)
                if rest.strip():
                    r_rest = p.add_run(" " + rest.strip())
                    set_run_font(r_rest, font_name="Arial", size_pt=9.5, color_rgb=RGBColor(51, 65, 85))
            else:
                r_bullet = p.add_run("• ")
                set_run_font(r_bullet, font_name="Arial", size_pt=9.5, color_rgb=RGBColor(100, 116, 139), bold=True)
                r_text = p.add_run(line)
                set_run_font(r_text, font_name="Arial", size_pt=9.5, color_rgb=RGBColor(51, 65, 85))


def _sanitize_filename(name: str) -> str:
    """Tạo tên file an toàn cho hệ điều hành Windows."""
    clean = re.sub(r'[\\/*?:"<>|]', '_', name)
    clean = re.sub(r'\s+', '_', clean.strip())
    return clean[:120]


def _set_cell_background(cell, hex_color: str):
    """Đặt màu nền cho một ô trong bảng."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)


def _set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    """Đặt khoảng đệm padding trong ô (đơn vị dxa, 20 dxa = 1 pt)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)


def _set_table_borders(table, color="D1D5DB", sz="4"):
    """Đặt viền thanh mảnh tinh tế cho toàn bảng."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:right w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)


def _convert_image_to_png_stream(image_path: str) -> Optional[io.BytesIO]:
    """
    Đọc ảnh (hỗ trợ .webp, .jpeg, .png) và chuyển đổi thành luồng PNG
    chuẩn trong bộ nhớ để OpenXML có thể nhúng vào Word không bị lỗi.
    """
    try:
        if not os.path.exists(image_path):
            return None
        with Image.open(image_path) as img:
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGB")
            out_buf = io.BytesIO()
            img.save(out_buf, format="PNG", optimize=True)
            out_buf.seek(0)
            return out_buf
    except Exception as e:
        print(f"[Warning] Không thể nạp ảnh {image_path}: {e}")
        return None


def generate_guide_docx(guide: InspectionGuide, db=None) -> io.BytesIO:
    """
    Tạo tài liệu Word (.docx) chi tiết, chuẩn quy chuẩn ISO cho một hướng dẫn kiểm tra.
    """
    doc_type = (guide.doc_type or "HDKT").upper()
    theme = THEME_COLORS.get(doc_type, THEME_COLORS["HDKT"])

    doc = docx.Document()

    # Cấu hình Default Style "Normal" thành Arial để toàn bộ tài liệu đồng nhất tuyệt đối
    normal_style = doc.styles["Normal"]
    normal_style.font.name = "Arial"
    normal_style.font.size = Pt(10)
    normal_style.font.color.rgb = RGBColor(30, 41, 59)
    normal_rPr = normal_style.element.get_or_add_rPr()
    normal_rFonts = parse_xml(
        f'<w:rFonts {nsdecls("w")} w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/>'
    )
    normal_rPr.append(normal_rFonts)

    # --- 1. THIẾT LẬP KHỔ GIẤY A4 & LỀ CHUẨN ---
    section = doc.sections[0]
    section.page_width = Inches(8.27)    # 21.0 cm
    section.page_height = Inches(11.69)  # 29.7 cm
    section.left_margin = Inches(0.98)   # 2.5 cm (đóng tập)
    section.right_margin = Inches(0.79)  # 2.0 cm
    section.top_margin = Inches(0.79)    # 2.0 cm
    section.bottom_margin = Inches(0.79) # 2.0 cm

    # --- 2. HEADER & FOOTER TRANG ---
    header = section.header
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hrun = hp.add_run(f"Mã: {guide.code}  |  {guide.name}")
    set_run_font(hrun, font_name="Arial", size_pt=8.5, color_rgb=RGBColor(148, 163, 184), italic=True)

    footer = section.footer
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    frun1 = fp.add_run("Hệ thống SmartFlow ERP - Tài liệu ban hành nội bộ")
    set_run_font(frun1, font_name="Arial", size_pt=8.5, color_rgb=RGBColor(148, 163, 184))

    # --- 3. BẢNG TIÊU ĐỀ DOANH NGHIỆP & THÔNG TIN BAN HÀNH (TOP HEADER TABLE) ---
    top_table = doc.add_table(rows=1, cols=3)
    top_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    _set_table_borders(top_table, color=theme["primary_hex"], sz="6")

    col_widths = [Inches(1.8), Inches(3.2), Inches(1.5)]
    for row in top_table.rows:
        for idx, width in enumerate(col_widths):
            row.cells[idx].width = width

    # Cột 1: Tên đơn vị
    c0 = top_table.rows[0].cells[0]
    c0.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    _set_cell_margins(c0, top=140, bottom=140, left=160, right=160)
    p0 = c0.paragraphs[0]
    p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r0_org = p0.add_run("TẬP ĐOÀN G7\nNHÀ MÁY G7")
    set_run_font(r0_org, font_name="Arial", size_pt=9.5, color_rgb=theme["primary"], bold=True)
    p0_sub = c0.add_paragraph()
    p0_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r0_sub = p0_sub.add_run("PHÒNG QLCL (QA/QC)")
    set_run_font(r0_sub, font_name="Arial", size_pt=8, color_rgb=RGBColor(100, 116, 139))

    # Cột 2: Tiêu đề biểu mẫu chính
    c1 = top_table.rows[0].cells[1]
    c1.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    _set_cell_background(c1, theme["bg_light_hex"])
    _set_cell_margins(c1, top=140, bottom=140, left=160, right=160)
    p1 = c1.paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r1_title = p1.add_run(theme["title"] + "\n")
    set_run_font(r1_title, font_name="Arial", size_pt=11, color_rgb=theme["primary"], bold=True)
    r1_docname = p1.add_run(f'"{guide.name.upper()}"')
    set_run_font(r1_docname, font_name="Arial", size_pt=11.5, color_rgb=RGBColor(45, 26, 18), bold=True)

    # Cột 3: Khung mã số & Quản lý kiểm soát
    c2 = top_table.rows[0].cells[2]
    c2.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    _set_cell_margins(c2, top=140, bottom=140, left=140, right=140)
    p2 = c2.paragraphs[0]
    p2.alignment = WD_ALIGN_PARAGRAPH.LEFT
    created_date_str = guide.created_at.strftime("%d/%m/%Y") if guide.created_at else datetime.now().strftime("%d/%m/%Y")
    r2_meta = p2.add_run(
        f"Mã: {guide.code}\n"
        f"Lần ban hành: 01\n"
        f"Ngày: {created_date_str}\n"
        f"Trạng thái: {'Áp dụng' if guide.is_active else 'Tạm ngưng'}"
    )
    set_run_font(r2_meta, font_name="Arial", size_pt=8.5, color_rgb=RGBColor(71, 85, 105))

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # --- 4. PHẦN I: THÔNG TIN TỔNG QUAN & PHẠM VI ÁP DỤNG ---
    p_sec1 = doc.add_paragraph()
    p_sec1.paragraph_format.space_before = Pt(8)
    p_sec1.paragraph_format.space_after = Pt(4)
    r_sec1 = p_sec1.add_run("I. THÔNG TIN CHUNG & PHẠM VI ÁP DỤNG")
    set_run_font(r_sec1, font_name="Arial", size_pt=12, color_rgb=theme["primary"], bold=True)

    # Thu thập tên công đoạn và tên loại phiếu áp dụng
    stages_map = {}
    if db:
        try:
            for s in db.query(Stage).all():
                stages_map[s.id] = s.name
        except Exception:
            pass

    form_types_map = {}
    if db:
        try:
            for ft in db.query(InspectionFormType).all():
                form_types_map[ft.code] = ft.name
        except Exception:
            pass

    applied_types = []
    applied_stages = []
    if guide.assignments:
        for a in guide.assignments:
            type_label = form_types_map.get(a.inspection_type) or INSPECTION_TYPE_NAMES.get(a.inspection_type, a.inspection_type)
            if type_label and type_label not in applied_types:
                applied_types.append(type_label)
            stage_text = stages_map.get(a.stage_id) if a.stage_id else "Tất cả công đoạn"
            if stage_text and stage_text not in applied_stages:
                applied_stages.append(stage_text)

    types_str = ", ".join(applied_types) if applied_types else "Chưa thiết lập"
    stages_str = ", ".join(applied_stages) if applied_stages else "Tất cả công đoạn"
    iso_process_str = f"[{guide.process.code}] {guide.process.name}" if getattr(guide, "process", None) else "Không liên kết"

    meta_table = doc.add_table(rows=5, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    _set_table_borders(meta_table, color="D1D5DB", sz="4")

    meta_rows_data = [
        ("Tên tài liệu / Tiêu chuẩn:", guide.name),
        ("Mã số quy chuẩn:", f"{guide.code}  (Loại tài liệu: {theme['label']})"),
        ("Quy trình ISO tham chiếu:", iso_process_str),
        ("Công đoạn sản xuất áp dụng:", stages_str),
        ("Loại phiếu kiểm tra áp dụng:", types_str),
    ]

    for idx, (label, val) in enumerate(meta_rows_data):
        row = meta_table.rows[idx]
        c_lbl = row.cells[0]
        c_val = row.cells[1]
        c_lbl.width = Inches(2.2)
        c_val.width = Inches(4.3)
        _set_cell_background(c_lbl, "FAF8F6")
        _set_cell_margins(c_lbl, top=80, bottom=80, left=120, right=120)
        _set_cell_margins(c_val, top=80, bottom=80, left=120, right=120)

        p_l = c_lbl.paragraphs[0]
        r_l = p_l.add_run(label)
        set_run_font(r_l, font_name="Arial", size_pt=9.5, color_rgb=RGBColor(71, 85, 105), bold=True)

        p_v = c_val.paragraphs[0]
        r_v = p_v.add_run(val)
        set_run_font(r_v, font_name="Arial", size_pt=9.5, color_rgb=RGBColor(30, 41, 59))

    # Mô tả mục đích tổng quan
    desc_clean = clean_html_to_text(guide.description)
    if desc_clean:
        p_desc = doc.add_paragraph()
        p_desc.paragraph_format.space_before = Pt(6)
        p_desc.paragraph_format.space_after = Pt(8)
        r_desc_lbl = p_desc.add_run("Mục đích & Yêu cầu tổng quan: ")
        set_run_font(r_desc_lbl, font_name="Arial", size_pt=9.5, color_rgb=RGBColor(71, 85, 105), bold=True)
        r_desc_val = p_desc.add_run(desc_clean)
        set_run_font(r_desc_val, font_name="Arial", size_pt=9.5, color_rgb=RGBColor(71, 85, 105), italic=True)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # --- 5. PHẦN II: DANH MỤC THÔNG SỐ ĐO KỸ THUẬT (NẾU CÓ) ---
    guide_params = getattr(guide, "guide_parameters", []) or []
    active_params = [gp.parameter for gp in guide_params if gp.is_active and getattr(gp, "parameter", None)]

    if active_params:
        p_sec2 = doc.add_paragraph()
        p_sec2.paragraph_format.space_before = Pt(8)
        p_sec2.paragraph_format.space_after = Pt(4)
        r_sec2 = p_sec2.add_run("II. TIÊU CHUẨN THÔNG SỐ ĐO KỸ THUẬT LIÊN KẾT")
        set_run_font(r_sec2, font_name="Arial", size_pt=12, color_rgb=theme["primary"], bold=True)

        param_table = doc.add_table(rows=len(active_params) + 1, cols=5)
        param_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        _set_table_borders(param_table, color="D1D5DB", sz="4")

        headers = ["STT", "Mã thông số", "Tên thông số đo", "Đơn vị tính", "Tiêu chuẩn cho phép (Min - Max)"]
        col_w = [Inches(0.6), Inches(1.3), Inches(2.2), Inches(1.0), Inches(1.4)]

        # Header row
        for i, h in enumerate(headers):
            c = param_table.rows[0].cells[i]
            c.width = col_w[i]
            _set_cell_background(c, theme["bg_light_hex"])
            _set_cell_margins(c, top=90, bottom=90, left=100, right=100)
            p = c.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = p.add_run(h)
            set_run_font(r, font_name="Arial", size_pt=9, color_rgb=theme["primary"], bold=True)

        for idx, param in enumerate(active_params, start=1):
            row = param_table.rows[idx]
            min_val = f"{param.default_min:g}" if param.default_min is not None else "-"
            max_val = f"{param.default_max:g}" if param.default_max is not None else "-"
            std_range = f"{min_val} ~ {max_val}" if (param.default_min is not None or param.default_max is not None) else "Theo bản vẽ kỹ thuật"

            data = [str(idx), param.code, param.name, param.unit or "-", std_range]
            for col_i, text in enumerate(data):
                c = row.cells[col_i]
                c.width = col_w[col_i]
                _set_cell_margins(c, top=80, bottom=80, left=100, right=100)
                p = c.paragraphs[0]
                if col_i in (0, 3, 4):
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r = p.add_run(text)
                set_run_font(r, font_name="Arial", size_pt=9, bold=(col_i == 0))

        doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # --- 6. PHẦN III: QUY TRÌNH & CÁC BƯỚC KIỂM TRA CHI TIẾT ---
    sec_num = "III" if active_params else "II"
    p_sec3 = doc.add_paragraph()
    p_sec3.paragraph_format.space_before = Pt(10)
    p_sec3.paragraph_format.space_after = Pt(4)
    r_sec3 = p_sec3.add_run(f"{sec_num}. CÁC BƯỚC KIỂM TRA & TIÊU CHUẨN THAO TÁC CHI TIẾT")
    set_run_font(r_sec3, font_name="Arial", size_pt=12, color_rgb=theme["primary"], bold=True)

    steps = getattr(guide, "steps", []) or []
    if not steps:
        p_empty = doc.add_paragraph()
        r_empty = p_empty.add_run("Hiện chưa có nội dung các bước kiểm tra được ban hành cho tài liệu này.")
        set_run_font(r_empty, font_name="Arial", size_pt=10, color_rgb=RGBColor(148, 163, 184), italic=True)
    else:
        for s_idx, step in enumerate(steps, start=1):
            # STEP BANNER TABLE
            step_table = doc.add_table(rows=1, cols=1)
            step_table.alignment = WD_TABLE_ALIGNMENT.CENTER
            c_step = step_table.rows[0].cells[0]
            c_step.width = Inches(6.5)
            _set_cell_background(c_step, theme["primary_hex"])
            _set_cell_margins(c_step, top=100, bottom=100, left=160, right=160)

            clean_step_title = re.sub(r'^(?:bước|buoc|step)\s*\d+[\s:.-]*', '', step.title or '', flags=re.IGNORECASE).strip()
            step_banner_text = f"BƯỚC {step.step_no or s_idx}: {clean_step_title.upper()}" if clean_step_title else f"BƯỚC {step.step_no or s_idx}"

            p_st = c_step.paragraphs[0]
            p_st.alignment = WD_ALIGN_PARAGRAPH.LEFT
            r_st = p_st.add_run(step_banner_text)
            set_run_font(r_st, font_name="Arial", size_pt=11, color_rgb=RGBColor(255, 255, 255), bold=True)

            # NỘI DUNG HƯỚNG DẪN TỔNG QUAN & TIÊU CHUẨN THAO TÁC CHI TIẾT
            _add_formatted_content_to_doc(doc, step.content, theme)

            # BẢNG TIÊU CHÍ CHI TIẾT (SUB-STEPS CHECKLIST)
            sub_steps = getattr(step, "sub_steps", []) or []
            if sub_steps:
                p_sub_hdr = doc.add_paragraph()
                p_sub_hdr.paragraph_format.space_before = Pt(4)
                p_sub_hdr.paragraph_format.space_after = Pt(2)
                r_sub_hdr = p_sub_hdr.add_run(f"▶ Danh mục tiêu chí & phân nhánh kiểm tra ({len(sub_steps)} tiêu chí):")
                set_run_font(r_sub_hdr, font_name="Arial", size_pt=9.5, color_rgb=RGBColor(5, 150, 105), bold=True)

                sub_table = doc.add_table(rows=len(sub_steps) + 1, cols=4)
                sub_table.alignment = WD_TABLE_ALIGNMENT.CENTER
                _set_table_borders(sub_table, color="D1D5DB", sz="4")

                sub_headers = ["STT", "Tiêu chí kiểm tra", "Yêu cầu kỹ thuật & Hướng dẫn thao tác", "Đánh giá"]
                sub_widths = [Inches(0.7), Inches(2.3), Inches(2.5), Inches(1.0)]

                for i, h in enumerate(sub_headers):
                    c = sub_table.rows[0].cells[i]
                    c.width = sub_widths[i]
                    _set_cell_background(c, "ECFDF5")
                    _set_cell_margins(c, top=80, bottom=80, left=100, right=100)
                    p = c.paragraphs[0]
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    r = p.add_run(h)
                    set_run_font(r, font_name="Arial", size_pt=8.5, color_rgb=RGBColor(6, 95, 70), bold=True)

                for sub_i, sub in enumerate(sub_steps, start=1):
                    row = sub_table.rows[sub_i]
                    sub_no_str = f"{step.step_no}.{sub.sub_step_no or sub_i}"
                    sub_title = clean_html_to_text(sub.title) or "-"
                    sub_content = clean_html_to_text(sub.content) or "-"

                    sub_data = [sub_no_str, sub_title, sub_content, "[  ] Đạt\n[  ] Lỗi"]
                    for col_i, text in enumerate(sub_data):
                        c = row.cells[col_i]
                        c.width = sub_widths[col_i]
                        _set_cell_margins(c, top=70, bottom=70, left=90, right=90)
                        p = c.paragraphs[0]
                        if col_i in (0, 3):
                            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        r = p.add_run(text)
                        text_color = RGBColor(100, 116, 139) if col_i == 3 else RGBColor(30, 41, 59)
                        set_run_font(r, font_name="Arial", size_pt=8.5, color_rgb=text_color, bold=(col_i == 0))

                doc.add_paragraph().paragraph_format.space_after = Pt(4)

            # LƯỚI ẢNH MINH HỌA TIÊU CHUẨN (VISUAL STANDARDS GALLERY)
            step_images = getattr(step, "images", []) or []
            if step_images:
                p_img_hdr = doc.add_paragraph()
                p_img_hdr.paragraph_format.space_before = Pt(6)
                p_img_hdr.paragraph_format.space_after = Pt(4)
                r_img_hdr = p_img_hdr.add_run(f"📷 Ảnh minh họa tiêu chuẩn Bước {step.step_no or s_idx} ({len(step_images)} ảnh):")
                set_run_font(r_img_hdr, font_name="Arial", size_pt=9.5, color_rgb=theme["primary"], bold=True)

                # Ghép ảnh theo từng cặp 2 ảnh trên 1 hàng (2 cột)
                total_imgs = len(step_images)
                num_img_rows = (total_imgs + 1) // 2

                img_table = doc.add_table(rows=num_img_rows * 2, cols=2)
                img_table.alignment = WD_TABLE_ALIGNMENT.CENTER
                _set_table_borders(img_table, color="E5E7EB", sz="4")

                for r_idx in range(num_img_rows):
                    row_img = img_table.rows[r_idx * 2]
                    row_caption = img_table.rows[r_idx * 2 + 1]

                    for col_idx in range(2):
                        img_index = r_idx * 2 + col_idx
                        c_img = row_img.cells[col_idx]
                        c_cap = row_caption.cells[col_idx]
                        c_img.width = Inches(3.2)
                        c_cap.width = Inches(3.2)
                        _set_cell_margins(c_img, top=60, bottom=60, left=80, right=80)
                        _set_cell_margins(c_cap, top=40, bottom=60, left=80, right=80)
                        _set_cell_background(c_cap, "F8FAFC")

                        if img_index < total_imgs:
                            img_obj = step_images[img_index]
                            img_path = os.path.join(UPLOAD_DIR, str(guide.id), img_obj.file_name)
                            png_stream = _convert_image_to_png_stream(img_path)

                            p_img = c_img.paragraphs[0]
                            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER

                            if png_stream:
                                p_img.add_run().add_picture(png_stream, width=Inches(2.95))
                            else:
                                r_missing = p_img.add_run("[Không tìm thấy file ảnh gốc trên máy chủ]")
                                set_run_font(r_missing, font_name="Arial", size_pt=8.5, color_rgb=RGBColor(220, 38, 38), italic=True)

                            # Caption bên dưới
                            p_cap = c_cap.paragraphs[0]
                            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
                            r_cap = p_cap.add_run(f"Hình {step.step_no}.{img_index + 1}: Tiêu chuẩn minh họa bước {step.step_no}")
                            set_run_font(r_cap, font_name="Arial", size_pt=8.5, color_rgb=RGBColor(71, 85, 105), italic=True)
                        else:
                            # Ô trống nếu số ảnh lẻ
                            c_img.paragraphs[0].text = ""
                            c_cap.paragraphs[0].text = ""

                doc.add_paragraph().paragraph_format.space_after = Pt(8)

            doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # --- 7. PHẦN IV: NGUYÊN TẮC XỬ LÝ SẢN PHẨM KHÔNG PHÙ HỢP ---
    p_sec4 = doc.add_paragraph()
    p_sec4.paragraph_format.space_before = Pt(10)
    p_sec4.paragraph_format.space_after = Pt(4)
    r_sec4 = p_sec4.add_run("IV. QUY ĐỊNH XỬ LÝ SẢN PHẨM KHÔNG PHÙ HỢP (KCS / QC)")
    set_run_font(r_sec4, font_name="Arial", size_pt=12, color_rgb=theme["primary"], bold=True)

    non_conformance_rules = [
        "1. Dừng thao tác & Cô lập: Khi phát hiện sản phẩm có sai lệch vượt ngưỡng tiêu chuẩn nêu trên, kiểm tra viên phải yêu cầu tạm dừng công đoạn và dán tem nhận diện cách ly (Khu vực hàng chờ xử lý).",
        "2. Ghi nhận số liệu: Cập nhật ngay hình ảnh và loại lỗi phát sinh lên phân hệ SmartFlow Mobile App / Web để bộ phận kỹ thuật nắm bắt tức thời.",
        "3. Phối hợp khắc phục: Báo cáo Tổ trưởng sản xuất và Trưởng ca để phân tích nguyên nhân gốc rễ, đưa ra phương án sửa chữa (Rework) hoặc hủy bỏ (Scrap).",
        "4. Tái kiểm tra: Lô hàng sau khi xử lý phải thực hiện kiểm tra lại theo đúng biểu mẫu 'Kiểm tra lại' trước khi được phép luân chuyển sang công đoạn kế tiếp."
    ]

    for rule in non_conformance_rules:
        p_r = doc.add_paragraph()
        p_r.paragraph_format.space_before = Pt(2)
        p_r.paragraph_format.space_after = Pt(2)
        p_r.paragraph_format.left_indent = Inches(0.2)
        r_rule = p_r.add_run(rule)
        set_run_font(r_rule, font_name="Arial", size_pt=9.5, color_rgb=RGBColor(51, 65, 85))

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # --- 8. PHẦN V: MA TRẬN PHÊ DUYỆT & KÝ TÊN BAN HÀNH (APPROVAL MATRIX) ---
    p_sec5 = doc.add_paragraph()
    p_sec5.paragraph_format.space_before = Pt(8)
    p_sec5.paragraph_format.space_after = Pt(4)
    r_sec5 = p_sec5.add_run("V. TRÁCH NHIỆM & MA TRẬN KÝ DUYỆT BAN HÀNH")
    set_run_font(r_sec5, font_name="Arial", size_pt=12, color_rgb=theme["primary"], bold=True)

    sign_table = doc.add_table(rows=4, cols=4)
    sign_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    _set_table_borders(sign_table, color="D1D5DB", sz="4")

    roles = [
        ("NGƯỜI BIÊN SOẠN", "Nhân viên QC / Kỹ thuật"),
        ("NGƯỜI KIỂM SOÁT", "QA Leader / KCS"),
        ("TRƯỞNG BỘ PHẬN", "Trưởng phòng QLCL"),
        ("PHÊ DUYỆT BAN HÀNH", "Giám đốc Nhà máy / BGD")
    ]

    col_w_sign = Inches(1.625)

    # Row 0: Chức danh
    for i, (role_title, role_sub) in enumerate(roles):
        c = sign_table.rows[0].cells[i]
        c.width = col_w_sign
        _set_cell_background(c, "FAF8F6")
        _set_cell_margins(c, top=80, bottom=80, left=80, right=80)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r1 = p.add_run(role_title + "\n")
        set_run_font(r1, font_name="Arial", size_pt=8.5, color_rgb=theme["primary"], bold=True)
        r2 = p.add_run(f"({role_sub})")
        set_run_font(r2, font_name="Arial", size_pt=7.5, color_rgb=RGBColor(100, 116, 139), italic=True)

    # Row 1: Khoảng trống để ký tên
    for i in range(4):
        c = sign_table.rows[1].cells[i]
        c.width = col_w_sign
        _set_cell_margins(c, top=260, bottom=260, left=80, right=80)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_blank = p.add_run("(Ký & ghi rõ họ tên)")
        set_run_font(r_blank, font_name="Arial", size_pt=7.5, color_rgb=RGBColor(203, 213, 225), italic=True)

    # Row 2: Họ và tên
    for i in range(4):
        c = sign_table.rows[2].cells[i]
        c.width = col_w_sign
        _set_cell_margins(c, top=60, bottom=60, left=80, right=80)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run("Họ tên: ...............................")
        set_run_font(r, font_name="Arial", size_pt=8, color_rgb=RGBColor(100, 116, 139))

    # Row 3: Ngày ký
    for i in range(4):
        c = sign_table.rows[3].cells[i]
        c.width = col_w_sign
        _set_cell_margins(c, top=60, bottom=60, left=80, right=80)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run("Ngày: ...../...../2026")
        set_run_font(r, font_name="Arial", size_pt=8, color_rgb=RGBColor(100, 116, 139))

    # Xuất ra luồng BytesIO
    out_file = io.BytesIO()
    doc.save(out_file)
    out_file.seek(0)
    return out_file


def generate_batch_guides_zip(guides: List[InspectionGuide], db=None) -> io.BytesIO:
    """
    Sinh file Word cho từng tài liệu đã chọn và gom tất cả vào 1 file ZIP nén trong RAM.
    """
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        used_filenames = set()
        for g in guides:
            docx_stream = generate_guide_docx(g, db)
            # Tạo tên file rõ ràng
            clean_code = _sanitize_filename(g.code or f"HD_{g.id}")
            clean_name = _sanitize_filename(g.name or "Tai_lieu")
            base_filename = f"{clean_code}_{clean_name}.docx"

            # Đảm bảo không trùng tên file trong zip
            filename = base_filename
            counter = 1
            while filename in used_filenames:
                filename = f"{clean_code}_{clean_name}_{counter}.docx"
                counter += 1
            used_filenames.add(filename)

            zf.writestr(filename, docx_stream.getvalue())

    zip_buffer.seek(0)
    return zip_buffer
