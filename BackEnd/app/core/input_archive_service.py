# -*- coding: utf-8 -*-
"""
Single Source of Truth for Input File Archiving.
Handles filename sanitization, original PDF preservation, and dated/timestamped Excel historical archiving.
"""

import os
import re
from datetime import datetime
from pathlib import Path
from app.core.path_manager import get_module_input_dir

def sanitize_filename(filename: str) -> str:
    """
    Sanitizes user-provided filename to prevent path traversal attack.
    Strips directory separators and returns clean base filename.
    """
    if not filename:
        return "unnamed_file"
    # Extract basename only
    clean = filename.replace("\\", "/").split("/")[-1]
    # Remove null bytes and control characters
    clean = re.sub(r'[\x00-\x1f\x7f]', '', clean)
    # Remove any remaining path traversal attempts
    clean = clean.replace("..", "_")
    return clean if clean else "unnamed_file"

def archive_input_file(module_name: str, file_format: str, original_filename: str, file_bytes: bytes, sub_type: str = None) -> str:
    """
    Archives a successfully imported source file into the Data/input directory.
    Must ONLY be called AFTER database transaction / import validation succeeds.
    
    - PDF: Preserves original filename unchanged.
      - claims claim_info PDF -> Data/input/claims/pdf/claim_info/
      - claims customer_penalty PDF -> Data/input/claims/pdf/customer_penalty/
    - Excel: Appends date {original_stem}_{DDMMYYYY}.{ext}, with timestamp/sequence fallback if exists.
    """
    target_dir = get_module_input_dir(module_name, file_format, sub_type=sub_type)
    clean_name = sanitize_filename(original_filename)
    
    path_obj = Path(clean_name)
    stem = path_obj.stem
    ext = path_obj.suffix.lower()
    if not ext:
        ext = ".xlsx" if file_format.lower() == "excel" else ".pdf"

    if file_format.lower() == "pdf":
        # Keep original filename for PDF imports
        candidate = f"{stem}{ext}"
        target_path = target_dir / candidate
        # If collision occurs for PDF, handle safely without overwriting
        if target_path.exists():
            date_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            candidate = f"{stem}_{date_str}{ext}"
            target_path = target_dir / candidate
    else:
        # Excel: Append date {original_stem}_{DDMMYYYY}.{ext}
        today_str = datetime.now().strftime("%d%m%Y")
        candidate = f"{stem}_{today_str}{ext}"
        target_path = target_dir / candidate
        
        # If file already exists today, append timestamp {HHMMSS}
        if target_path.exists():
            time_str = datetime.now().strftime("%H%M%S")
            candidate = f"{stem}_{today_str}_{time_str}{ext}"
            target_path = target_dir / candidate
            
            # If timestamp collision still occurs, append sequence
            seq = 1
            while target_path.exists():
                candidate = f"{stem}_{today_str}_{time_str}_{seq:02d}{ext}"
                target_path = target_dir / candidate
                seq += 1

    with open(target_path, "wb") as f:
        f.write(file_bytes)
        
    return str(target_path)
