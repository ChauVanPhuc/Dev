# -*- coding: utf-8 -*-
"""
Unified LPN & SKU Validators.
Nguồn chân lý duy nhất (Single Source of Truth) cho việc kiểm tra tính hợp lệ
của mã LPN và mã SKU trên toàn bộ dự án:
- fast_audit.py
- parser.py
- dataset.py
- crop generator
- benchmark / validation
"""

import re
from typing import Optional

# Pattern LPN chuẩn kho vận VINA G7 (chủ đạo là 9 chữ số bắt đầu bằng 06, 05 hoặc 60)
WAREHOUSE_LPN_REGEX = re.compile(r"^(?:06|05|60)\d{7}$")
PURE_NUMERIC_LPN_REGEX = re.compile(r"^\d{8,10}$")

CARTON_PREFIXES = (
    "VOM", "VOL", "MEAS", "CTN", "BOX", "QTY", "PCS", "NW", "GW",
    "ITEM", "ORDER", "PO", "LOT", "BATCH", "CARTON", "PALLET",
    "PACKAGE", "PKG", "CUFT", "CBM", "WEIGHT", "GROSS", "NET"
)

IGNORED_SKU_WORDS = {
    "MADE-IN-VIETNAM", "MADE-IN-CHINA", "FRAGILE-HANDLE", "THIS-SIDE-UP",
    "DOUBLE-SINK", "BASE-CABINET", "SINGLE-SINK", "VANITY-SET", "TOP-BOTTOM",
    "ARIEL", "RIGHT", "LEFT", "CENTER", "CAMBRIDGE", "CABINET", "VANITY",
    "BATCH", "MODEL", "WHITE", "BLACK", "OAK", "GREY", "GRAY", "BROWN",
    "HANDLE", "DRAWER", "FINISH", "MIRROR", "DOOR", "WALL", "LINEN",
    "SIDE-CABINET", "PIECES", "CARTON", "PALLET", "PACKAGE", "WEIGHT",
    "GROSS", "NET", "CUFT", "CBM", "QUANTITY", "UPC", "BARCODE",
    "COLOR", "STYLE", "SIZE", "INCH", "PRODUCT", "DESCRIPTION", "NAME",
    "VOM", "VOL", "MEAS", "CTN", "ITEM", "ORDER", "PO", "LOT", "BOX", "NW", "GW", "QTY", "PCS"
}


def clean_warehouse_lpn(text: Optional[str]) -> str:
    """
    Chuẩn hóa chuỗi số LPN:
    - Loại bỏ tiền tố LPN, NO, dấu hai chấm, khoảng trắng
    - Khử nhầm lẫn ký tự quang học (OCR character confusion: O/Q/D -> 0, I/L -> 1, S -> 5, B -> 8)
    """
    if not text:
        return ""
    s = str(text).strip().upper()
    s = re.sub(r'^(?:LPN|LP|NO|SERI|SERIAL)[\s\:\#\-]*', '', s)
    s = re.sub(r'[^0-9A-Z]', '', s)

    # Hiệu chỉnh ký tự nếu có ít nhất 5 chữ số
    digits_count = sum(c.isdigit() for c in s)
    if digits_count >= 5 and any(c in s for c in "OQDIBSZ"):
        trans_map = str.maketrans({
            'O': '0', 'Q': '0', 'D': '0',
            'I': '1', 'L': '1',
            'Z': '2', 'S': '5', 'B': '8', 'G': '6'
        })
        s = s.translate(trans_map)

    return s


def is_valid_warehouse_lpn(text: Optional[str], strict_warehouse: bool = True) -> bool:
    """
    Kiểm tra một chuỗi có phải mã LPN hợp lệ của kho không.
    - strict_warehouse=True: Bắt buộc chuẩn 9 chữ số (bắt đầu bằng 06, 05, 60 như trong CSDL thực tế)
    - strict_warehouse=False: Chấp nhận chuỗi số 8-10 chữ số
    """
    if not text:
        return False
    cleaned = clean_warehouse_lpn(text)
    if not cleaned or not cleaned.isdigit():
        return False

    # Loại bỏ chuỗi giả mạo/dummy (toàn số 0, toàn số 1...)
    if len(set(cleaned)) <= 1:
        return False

    if strict_warehouse:
        return bool(WAREHOUSE_LPN_REGEX.match(cleaned))
    return bool(PURE_NUMERIC_LPN_REGEX.match(cleaned))


def is_valid_warehouse_sku(cand: Optional[str]) -> bool:
    """
    Kiểm tra một chuỗi có phải mã SKU hợp lệ của nhà máy không:
    - Bất kỳ chuỗi nào chứa tiền tố in vỏ thùng (VOM, VOL, MEAS, CTN, BOX, QTY, PCS, NW, GW...) đều bị loại bỏ ngay
    - Cắt gọt toàn bộ dấu câu thừa ở đầu và đuôi chuỗi SKU: .strip("-:;,. #*!_/")
    - Có ít nhất 1 dấu gạch nối hoặc khớp chuẩn format dòng sản phẩm
    """
    if not cand:
        return False
    c_upper = str(cand).strip().upper().strip("-:;,. #*!_/")
    if len(c_upper) < 3 or c_upper in IGNORED_SKU_WORDS:
        return False

    # Loại bỏ ngay lập tức nếu chuỗi bắt đầu bằng bất kỳ tiền tố in vỏ thùng carton nào
    for pfx in CARTON_PREFIXES:
        if c_upper.startswith(pfx):
            return False

    # Không có dấu gạch nối: bắt buộc khớp pattern model code
    if '-' not in c_upper:
        if not (4 <= len(c_upper) <= 10):
            return False
        if not re.match(r'^(?:[AVBWCD]|CAM|DB|1|2)\d{2,4}[A-Z0-9]?$', c_upper):
            return False
        return any(c.isdigit() for c in c_upper) and any(c.isalpha() for c in c_upper)

    # Có dấu gạch nối:
    parts = [p.strip("-:;,. #*!_/") for p in c_upper.split('-') if p.strip("-:;,. #*!_/")]
    if len(parts) < 2:
        return False
    if any(p in IGNORED_SKU_WORDS for p in parts):
        return False
    if any(any(p.startswith(pfx) for pfx in CARTON_PREFIXES) for p in parts):
        return False

    valid_codes = {
        "WOA", "WHT", "BLK", "GRY", "BL", "OAK", "WAL", "ESP", "BRO",
        "MNB", "VGN", "BC", "BF", "STD", "PRO", "LX", "DB", "SC", "R", "L", "C", "S", "D"
    }
    has_number_part = any(any(c.isdigit() for c in p) for p in parts)
    has_code_part = any(p in valid_codes for p in parts)
    return has_number_part or has_code_part

