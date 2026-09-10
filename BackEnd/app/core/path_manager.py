# -*- coding: utf-8 -*-
"""
Centralized Path Manager for SmartFlow Quản lý Claim.
Single source of truth for all Data/ input, database, and backup directories.
Resolves PROJECT_ROOT independently of Current Working Directory (CWD).
"""

import os
from pathlib import Path

def resolve_project_root() -> Path:
    current_file = Path(__file__).resolve()
    # Marker-based detection: search upwards for run_project.bat or workspace root marker
    for parent in [current_file] + list(current_file.parents):
        if (parent / "run_project.bat").exists() or (parent / "lpn_crawler").exists():
            return parent
    if len(current_file.parents) >= 5:
        return current_file.parents[4]
    return current_file.parents[-1]

def resolve_claim_root() -> Path:
    current_file = Path(__file__).resolve()
    for parent in [current_file] + list(current_file.parents):
        if (parent / "BackEnd").exists() and (parent / "FrontEnd").exists():
            return parent
    if len(current_file.parents) >= 4:
        return current_file.parents[3]
    return current_file.parents[2]

PROJECT_ROOT = resolve_project_root()
CLAIM_ROOT = resolve_claim_root()
DATA_ROOT = (CLAIM_ROOT / "Data") if (CLAIM_ROOT / "Data").exists() else (PROJECT_ROOT / "Data")
INPUT_ROOT = DATA_ROOT / "input"
DATABASE_ROOT = DATA_ROOT / "database"
BACKUP_ROOT = DATA_ROOT / "backup"

# Module Input Directories
ERROR_CODES_INPUT = INPUT_ROOT / "error_codes"
ERROR_CODES_INPUT_EXCEL = ERROR_CODES_INPUT / "excel"
ERROR_CODES_INPUT_PDF = ERROR_CODES_INPUT / "pdf"

CLAIMS_INPUT = INPUT_ROOT / "claims"
CLAIMS_INPUT_EXCEL = CLAIMS_INPUT / "excel"
CLAIMS_PDF_ROOT = CLAIMS_INPUT / "pdf"
CLAIMS_CLAIM_INFO_PDF = CLAIMS_PDF_ROOT / "claim_info"
CLAIMS_CUSTOMER_PENALTY_PDF = CLAIMS_PDF_ROOT / "customer_penalty"
# Legacy reference for backwards compatibility
CLAIMS_INPUT_PDF = CLAIMS_CLAIM_INFO_PDF

CABINET_PRICES_INPUT = INPUT_ROOT / "cabinet_prices"
CABINET_PRICES_INPUT_EXCEL = CABINET_PRICES_INPUT / "excel"
CABINET_PRICES_INPUT_PDF = CABINET_PRICES_INPUT / "pdf"

def ensure_data_directories():
    """
    Ensures all required Data subdirectories exist.
    Created automatically during backend startup.
    """
    directories = [
        DATA_ROOT,
        INPUT_ROOT,
        DATABASE_ROOT,
        BACKUP_ROOT,
        ERROR_CODES_INPUT_EXCEL,
        ERROR_CODES_INPUT_PDF,
        CLAIMS_INPUT_EXCEL,
        CLAIMS_PDF_ROOT,
        CLAIMS_CLAIM_INFO_PDF,
        CLAIMS_CUSTOMER_PENALTY_PDF,
        CABINET_PRICES_INPUT_EXCEL,
        CABINET_PRICES_INPUT_PDF,
    ]
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)

def get_module_input_dir(module_name: str, file_format: str, sub_type: str = None) -> Path:
    """
    Returns the target input Path for a given module, file format, and optional sub_type.
    """
    mod = str(module_name).lower().strip()
    fmt = str(file_format).lower().strip()
    sub = str(sub_type).lower().strip() if sub_type else None
    
    if mod == "claims" and fmt == "pdf":
        if sub == "customer_penalty":
            target = CLAIMS_CUSTOMER_PENALTY_PDF
        else:
            target = CLAIMS_CLAIM_INFO_PDF
    else:
        mapping = {
            ("error_codes", "excel"): ERROR_CODES_INPUT_EXCEL,
            ("error_codes", "pdf"): ERROR_CODES_INPUT_PDF,
            ("claims", "excel"): CLAIMS_INPUT_EXCEL,
            ("cabinet_prices", "excel"): CABINET_PRICES_INPUT_EXCEL,
            ("cabinet_prices", "pdf"): CABINET_PRICES_INPUT_PDF,
        }
        target = mapping.get((mod, fmt))
        if not target:
            raise ValueError(f"Unknown module/format pair: module='{module_name}', format='{file_format}'")
    
    target.mkdir(parents=True, exist_ok=True)
    return target
