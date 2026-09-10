# -*- coding: utf-8 -*-
import os
import io
import tempfile
from app.shared.pdf_parser import save_claims_to_excel

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
CLAIM_IMPORTS_DIR = os.path.join(BACKEND_DIR, "static", "uploads", "claim_imports")

def export_claims_to_excel(claims_data, resolve_company_func=None, resolve_company_name_func=None):
    """
    Exports list of claims to formatted Excel spreadsheet in-memory buffer.
    """
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        tmp_path = tmp.name
        
    try:
        save_claims_to_excel(
            claims=claims_data,
            excel_path=tmp_path,
            claim_imports_dir=CLAIM_IMPORTS_DIR,
            resolve_company_func=resolve_company_func,
            resolve_company_name_func=resolve_company_name_func
        )
        with open(tmp_path, "rb") as f:
            buf = io.BytesIO(f.read())
        return buf
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
