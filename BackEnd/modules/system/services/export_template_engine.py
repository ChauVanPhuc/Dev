import io
import os
import re
import datetime
from copy import deepcopy
from typing import Any, Dict, List, Optional, Union


def _format_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (datetime.datetime, datetime.date)):
        return value.strftime("%d/%m/%Y")
    return str(value)


def _render_text(text: str, context: Dict[str, Any], data_row: Optional[Dict[str, Any]] = None) -> str:
    if not isinstance(text, str):
        return text
    result = text
    for key, value in context.items():
        placeholder = "{{" + key + "}}"
        result = result.replace(placeholder, _format_value(value))
    if data_row is not None:
        for key, value in data_row.items():
            placeholder = "{{" + key + "}}"
            result = result.replace(placeholder, _format_value(value))
    return result


def _extract_keys(text: str) -> List[str]:
    if not isinstance(text, str):
        return []
    return re.findall(r"\{\{(\w+)\}\}", text)


# ---------------------------------------------------------------------------
# Word / .docx
# ---------------------------------------------------------------------------
def fill_docx(input_path: str, mode: str, data: Union[Dict, List[Dict]], context: Dict[str, Any]) -> bytes:
    try:
        import docx
    except ImportError:
        raise RuntimeError("Thieu thu vien python-docx. Hay chay: pip install python-docx")

    document = docx.Document(input_path)

    # Normalize data
    rows: List[Dict[str, Any]] = []
    if isinstance(data, list):
        rows = data
    elif isinstance(data, dict):
        rows = [data]

    # 1. Replace context placeholders everywhere first (static parts)
    _docx_replace_context(document, context)

    if mode == "single" or not rows:
        # Single record mode: also replace data placeholders with the first/only row
        row = rows[0] if rows else {}
        _docx_replace_context(document, context, data_row=row)
    else:
        # List mode: duplicate table rows that contain data placeholders
        for table in document.tables:
            _docx_fill_list_table(table, rows, context)

    # 2. Process paragraphs outside tables with single row (if single mode) or first row (fallback)
    if mode == "single" and rows:
        _docx_replace_context(document, context, data_row=rows[0])

    output = io.BytesIO()
    document.save(output)
    output.seek(0)
    return output.read()


def _docx_replace_context(document, context: Dict[str, Any], data_row: Optional[Dict[str, Any]] = None):
    for p in document.paragraphs:
        _docx_replace_paragraph(p, context, data_row)
        _docx_insert_image_if_needed(p, context, data_row)
    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    _docx_replace_paragraph(p, context, data_row)
                    _docx_insert_image_if_needed(p, context, data_row)
                for t in cell.tables:
                    for r in t.rows:
                        for c in r.cells:
                            for p in c.paragraphs:
                                _docx_replace_paragraph(p, context, data_row)
                                _docx_insert_image_if_needed(p, context, data_row)
    for sec in document.sections:
        for h_type in ["header", "footer"]:
            header_footer = getattr(sec, h_type, None)
            if header_footer:
                for p in header_footer.paragraphs:
                    _docx_replace_paragraph(p, context, data_row)
                    _docx_insert_image_if_needed(p, context, data_row)
                for t in header_footer.tables:
                    for r in t.rows:
                        for c in r.cells:
                            for p in c.paragraphs:
                                _docx_replace_paragraph(p, context, data_row)
                                _docx_insert_image_if_needed(p, context, data_row)


def _docx_replace_paragraph(paragraph, context: Dict[str, Any], data_row: Optional[Dict[str, Any]] = None):
    if not paragraph.runs:
        return
    full_text = "".join(run.text for run in paragraph.runs)
    new_text = _render_text(full_text, context, data_row)
    if new_text == full_text:
        return
    # Clear all runs except first
    paragraph.runs[0].text = new_text
    for run in paragraph.runs[1:]:
        run.text = ""


def _docx_insert_image_if_needed(paragraph, context: Dict[str, Any], data_row: Optional[Dict[str, Any]] = None):
    """
    Kiem tra neu paragraph chua placeholder {{mockup_image}}, 
    thay the bang anh tu mockup_path.
    """
    if not paragraph.runs:
        return
    
    full_text = "".join(run.text for run in paragraph.runs)
    
    # Kiem tra co placeholder {{mockup_image}} khong
    if "{{mockup_image}}" not in full_text:
        return
    
    # Lay duong dan anh tu context hoac data_row
    image_path = None
    if context and "mockup_path" in context:
        image_path = context["mockup_path"]
    elif data_row and "mockup_path" in data_row:
        image_path = data_row["mockup_path"]
    
    if not image_path:
        # Khong co anh, xoa placeholder
        paragraph.runs[0].text = full_text.replace("{{mockup_image}}", "[Không có ảnh mockup]")
        for run in paragraph.runs[1:]:
            run.text = ""
        return
    
    # Resolve physical path
    image_full_path = _resolve_image_path(image_path)
    
    if not os.path.exists(image_full_path):
        paragraph.runs[0].text = full_text.replace("{{mockup_image}}", f"[Không tìm thấy ảnh: {image_path}]")
        for run in paragraph.runs[1:]:
            run.text = ""
        return
    
    try:
        from docx.shared import Inches
        
        # Xoa tat ca runs
        for run in paragraph.runs:
            run.text = ""
        
        # Them anh vao paragraph
        # Width 6 inches (khoang 15cm), height auto
        run = paragraph.runs[0] if paragraph.runs else paragraph.add_run()
        run.add_picture(image_full_path, width=Inches(6))
        
    except Exception as e:
        # Neu loi, hien thi thong bao loi
        paragraph.runs[0].text = full_text.replace("{{mockup_image}}", f"[Lỗi nhúng ảnh: {str(e)}]")
        for run in paragraph.runs[1:]:
            run.text = ""


def _resolve_image_path(relative_path: str) -> str:
    """
    Chuyen duong dan tuong doi thanh duong dan tuyet doi.
    Vi du: /static/uploads/mockups/abc.png -> M:/ERP/BackEnd/static/uploads/mockups/abc.png
    """
    if os.path.isabs(relative_path):
        return relative_path
    
    # Loai bo dau / dau tien neu co
    if relative_path.startswith("/"):
        relative_path = relative_path[1:]
    
    # Base dir la BackEnd/
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    
    # Neu path bat dau bang "static/", join truc tiep
    if relative_path.startswith("static/"):
        return os.path.join(base_dir, relative_path)
    
    # Neu path la "/static/...", bo dau /
    if relative_path.startswith("static"):
        return os.path.join(base_dir, relative_path)
    
    # Mac dinh join vao static/
    return os.path.join(base_dir, "static", relative_path)


def _docx_fill_list_table(table, rows: List[Dict[str, Any]], context: Dict[str, Any]):
    if not table.rows or not rows:
        return

    # Find template row: the last row that contains at least one {{key}} placeholder
    template_row_index = None
    for idx in range(len(table.rows) - 1, -1, -1):
        row = table.rows[idx]
        text = " ".join(cell.text for cell in row.cells)
        if _extract_keys(text):
            template_row_index = idx
            break

    if template_row_index is None:
        return

    template_row = table.rows[template_row_index]

    # Insert duplicated rows below the template row for each data item
    for item in rows:
        new_row = _docx_clone_row(table, template_row)
        for cell in new_row.cells:
            for p in cell.paragraphs:
                _docx_replace_paragraph(p, context, data_row=item)

    # Remove the original template row
    _docx_delete_row(table, template_row)


def _docx_clone_row(table, template_row):
    # Use deep copy of the underlying CT_Row and insert it after the template row
    new_tr = deepcopy(template_row._tr)
    template_row._tr.addnext(new_tr)
    # Return the new row object by index
    for row in table.rows:
        if row._tr is new_tr:
            return row
    return table.rows[-1]


def _docx_delete_row(table, row):
    tbl = table._tbl
    tr = row._tr
    tbl.remove(tr)


# ---------------------------------------------------------------------------
# Excel / .xlsx
# ---------------------------------------------------------------------------
def fill_xlsx(input_path: str, mode: str, data: Union[Dict, List[Dict]], context: Dict[str, Any]) -> bytes:
    try:
        from openpyxl import load_workbook
        from copy import copy
    except ImportError:
        raise RuntimeError("Thieu thu vien openpyxl. Hay chay: pip install openpyxl")

    wb = load_workbook(input_path)

    rows: List[Dict[str, Any]] = []
    if isinstance(data, list):
        rows = data
    elif isinstance(data, dict):
        rows = [data]

    # First pass: replace context placeholders in all cells (single or list)
    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for cell in row:
                if cell.value and isinstance(cell.value, str):
                    cell.value = _render_text(cell.value, context)

    if mode == "single" and rows:
        for ws in wb.worksheets:
            for row in ws.iter_rows():
                for cell in row:
                    if cell.value and isinstance(cell.value, str):
                        cell.value = _render_text(cell.value, context, rows[0])
    elif mode == "list" and rows:
        for ws in wb.worksheets:
            _xlsx_fill_list_rows(ws, rows, context)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.read()


def _xlsx_fill_list_rows(ws, rows: List[Dict[str, Any]], context: Dict[str, Any]):
    from copy import copy
    # Find template rows (rows containing at least one data placeholder)
    template_rows = []
    for row_idx, row in enumerate(ws.iter_rows(min_row=1, max_row=ws.max_row), start=1):
        has_placeholder = False
        for cell in row:
            if cell.value and isinstance(cell.value, str) and _extract_keys(cell.value):
                has_placeholder = True
                break
        if has_placeholder:
            template_rows.append((row_idx, row))

    if not template_rows:
        return

    # Process from bottom to top so inserted rows don't shift the next indexes
    for row_idx, template_row in reversed(template_rows):
        # Collect styles and column letters from the template row
        template_cells = list(template_row)

        # Insert one row per data item right after the template row
        insert_at = row_idx + 1
        for item in rows:
            ws.insert_rows(insert_at)
            new_row = ws[row_idx + 1]
            for new_cell, template_cell in zip(new_row, template_cells):
                if template_cell.has_style:
                    new_cell.font = copy(template_cell.font)
                    new_cell.border = copy(template_cell.border)
                    new_cell.fill = copy(template_cell.fill)
                    new_cell.number_format = copy(template_cell.number_format)
                    new_cell.protection = copy(template_cell.protection)
                    new_cell.alignment = copy(template_cell.alignment)
                if template_cell.value and isinstance(template_cell.value, str):
                    new_cell.value = _render_text(template_cell.value, context, item)
                else:
                    new_cell.value = template_cell.value
            row_idx += 1

        # Delete the original template row
        ws.delete_rows(row_idx - len(rows), 1)


# ---------------------------------------------------------------------------
# PDF / .pdf
# ---------------------------------------------------------------------------
def fill_pdf(input_path: str, mode: str, data: Union[Dict, List[Dict]], context: Dict[str, Any]) -> bytes:
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise RuntimeError("Thieu thu vien PyMuPDF. Hay chay: pip install pymupdf")

    src = fitz.open(input_path)

    rows: List[Dict[str, Any]] = []
    if isinstance(data, list):
        rows = data
    elif isinstance(data, dict):
        rows = [data]

    if not rows:
        # If no data rows, just replace context placeholders on the original document
        _pdf_fill_doc_pages(src, src, 0, src.page_count, context, {})
        output = io.BytesIO()
        src.save(output)
        output.seek(0)
        return output.read()

    if mode == "single":
        # For single mode use only the first data row, but keep all pages
        new_doc = fitz.open()
        new_doc.insert_pdf(src)
        _pdf_fill_doc_pages(new_doc, src, 0, new_doc.page_count, context, rows[0])
        output = io.BytesIO()
        new_doc.save(output)
        output.seek(0)
        return output.read()

    # List mode: duplicate the whole document for each data row
    new_doc = fitz.open()
    font_path = _get_vietnamese_font_path()

    for item in rows:
        start_page = new_doc.page_count
        new_doc.insert_pdf(src)
        end_page = new_doc.page_count
        _pdf_fill_doc_pages(new_doc, src, start_page, end_page, context, item, font_path=font_path)

    output = io.BytesIO()
    new_doc.save(output)
    output.seek(0)
    return output.read()


def _get_vietnamese_font_path() -> Optional[str]:
    candidates = [
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return None


def _pdf_fill_doc_pages(doc, src_doc, start_page, end_page, context, data_row, font_path=None):
    """Fill placeholders on pages [start_page, end_page) of doc."""
    try:
        import fitz
    except ImportError:
        return

    # Build placeholder -> value mapping
    mapping = {}
    for key, value in context.items():
        mapping["{{" + key + "}}"] = _format_value(value)
    for key, value in data_row.items():
        mapping["{{" + key + "}}"] = _format_value(value)

    for page_num in range(start_page, end_page):
        page = doc.load_page(page_num)
        _pdf_fill_page(page, mapping, font_path)


def _pdf_fill_page(page, mapping: Dict[str, str], font_path: Optional[str] = None):
    for placeholder, value in mapping.items():
        rects = page.search_for(placeholder)
        if not rects:
            continue
        for rect in rects:
            # Estimate font size from rect height; fallback to 10
            fontsize = max(8, int(rect.height * 0.7))
            # White-out the original placeholder text area
            page.add_redact_annot(rect, fill=(1, 1, 1))
            page.apply_redactions()
            # Insert new text at top-left of the rect
            font_kwargs = {}
            if font_path and os.path.exists(font_path):
                font_kwargs["fontname"] = "viet"
                font_kwargs["fontfile"] = font_path
            else:
                font_kwargs["fontname"] = "helv"
            try:
                page.insert_text(rect.tl, value, fontsize=fontsize, color=(0, 0, 0), **font_kwargs)
            except Exception:
                # If custom font fails, fallback to built-in
                page.insert_text(rect.tl, value, fontsize=fontsize, color=(0, 0, 0), fontname="helv")


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------
def fill_template(input_path: str, mode: str, data: Union[Dict, List[Dict]], context: Dict[str, Any]) -> bytes:
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Khong tim thay file mau: {input_path}")

    ext = os.path.splitext(input_path)[1].lower()
    if ext == ".docx":
        return fill_docx(input_path, mode, data, context)
    if ext in (".xlsx", ".xls"):
        return fill_xlsx(input_path, mode, data, context)
    if ext == ".pdf":
        return fill_pdf(input_path, mode, data, context)

    raise ValueError(f"Dinh dang file khong duoc ho tro: {ext}")
