# -*- coding: utf-8 -*-
"""
Utility module quy đổi thể tích m3 sang số lượng (Cái) cho chi tiết/thanh gỗ.
Dựa trên quy cách kích thước (Dày * Rộng * Dài) tính bằng mm trong tên/mô tả mặt hàng.
"""

import re


def parse_dimensions_from_text(text: str):
    """
    Trích xuất (Dày, Rộng, Dài) tính bằng mm từ tên hoặc quy cách mặt hàng.
    Ví dụ: 'Thanh ngang trước 18*50*1596' -> (18.0, 50.0, 1596.0)
           'Thanh đứng Khung Trước 18*50*766' -> (18.0, 50.0, 766.0)
           '18x42x1636' -> (18.0, 42.0, 1636.0)
    """
    if not text:
        return None
    
    match = re.search(r'(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)', str(text))
    if match:
        try:
            t = float(match.group(1))
            w = float(match.group(2))
            l = float(match.group(3))
            if t > 0 and w > 0 and l > 0:
                return t, w, l
        except (ValueError, TypeError):
            pass
    return None


def calculate_pieces_from_m3(item_name_or_spec: str, quantity_m3: float):
    """
    Tính số lượng cái từ thể tích m3 và tên/quy cách sản phẩm.
    Returns: dict hoặc None
    """
    dims = parse_dimensions_from_text(item_name_or_spec)
    if not dims or quantity_m3 is None or quantity_m3 <= 0:
        return None
    
    t, w, l = dims
    v_single = (t * w * l) / 1_000_000_000.0  # m3 per piece
    if v_single <= 0:
        return None
    
    pieces = round(quantity_m3 / v_single)
    return {
        "pieces": pieces,
        "v_single_m3": round(v_single, 8),
        "dimensions_str": f"{t:.0f}×{w:.0f}×{l:.0f} mm",
        "thickness": t,
        "width": w,
        "length": l
    }
