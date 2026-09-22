# -*- coding: utf-8 -*-
from typing import List, Any

def check_item_missing_fields(item: Any, cont: Any) -> List[str]:
    """
    Kiểm tra một dòng dữ liệu (Item + Container) có bị thiếu các trường bắt buộc không.
    Danh sách trường bắt buộc kiểm tra theo các cột giao diện:
    - Container number
    - Timestamp
    - Date loading
    - LPN Pallet
    - SKU Pallet
    - Hình ảnh (Picture)
    (Ghi chú: Trường Batch Pallet đối tác không còn cập nhật nên không tính là thiếu)
    """
    missing = []
    if not cont or not getattr(cont, "container_number", None) or not str(cont.container_number).strip():
        missing.append("Container number")
    if not cont or (not getattr(cont, "date_loading", None) and (not getattr(cont, "date_loading_raw", None) or not str(cont.date_loading_raw).strip())):
        missing.append("Date loading")
    if not cont or not getattr(cont, "timestamp_raw", None) or not str(cont.timestamp_raw).strip():
        missing.append("Timestamp")
    if not getattr(item, "lpn", None) or not str(item.lpn).strip():
        missing.append("LPN Pallet")
    if not getattr(item, "sku", None) or not str(item.sku).strip():
        missing.append("SKU Pallet")

    # Kiểm tra thiếu hình ảnh: Bắt buộc phải có file ảnh đã tải về máy tính thành công (local_path hợp lệ)
    has_image = False
    try:
        if hasattr(item, "images") and item.images is not None:
            has_image = any(bool(getattr(img, "local_path", None) and str(getattr(img, "local_path", "")).strip()) for img in item.images)
    except Exception:
        has_image = False

    if not has_image:
        missing.append("Hình ảnh (Picture)")

    return missing
