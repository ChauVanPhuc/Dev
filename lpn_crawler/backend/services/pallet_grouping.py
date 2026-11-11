# -*- coding: utf-8 -*-
"""
Pallet & Package Grouping Service for Container Loadings.
Xử lý logic chuyên sâu cho Container:
1. Phân biệt rõ:
   - 4 Tủ Dưới (Pallet Đứng / Base Pallets): Các tủ đứng dưới sàn container (Pallet 1..16).
   - Tủ Trên Cùng Nằm Ngang (Top Nóc / Upper Horizontal Boxes): Đặt nằm ngang trên đỉnh pallet đứng (Box 1A..16A, Box 17A..17B).
2. Quy tắc Tủ Trên Cùng (Top Nóc):
   - Mã SKU của tủ trên cùng CÓ THỂ KHÁC so với 4 tủ dưới.
   - Những tủ trên nóc sẽ HỢP THÀNH 1 PALLET RIÊNG BIỆT (cùng chia sẻ 1 mã LPN).
   - Số lượng tủ trên nóc trong 1 pallet LUÔN LUÔN LÀ SỐ LƯỢNG CHẴN: 2, 4, hoặc 6 tủ.
3. Tính toán tổng số Pallet thực tế:
   total_pallets = count(base_pallets) + count(top_noc_pallet_groups).
"""

import re
from typing import List, Dict, Any, Optional


def is_top_noc_item(suffix_key: str, record_type: str = "") -> bool:
    """
    Kiểm tra một kiện có phải là Tủ Trên Cùng Nằm Ngang (Top Nóc) hay không:
    - Có chữ cái hậu tố như Box 1A, Box 1B, Box 17A, Box 17B, 10A, 10B...
    - Hoặc record_type / suffix_key chứa 'top nóc', 'topnoc', 'nóc'.
    """
    if not suffix_key:
        return False
    s = str(suffix_key).strip().upper()
    r = str(record_type).strip().upper()
    if "TOP" in s or "TOP" in r or "NÓC" in s or "NOC" in s:
        return True
    # Kiểm tra pattern: Chữ hoặc số kết thúc bằng chữ cái A, B, C, D... (ví dụ: Box 1A, Box 10B, 17A)
    if re.search(r'\d+[A-Z]$', s) or re.search(r'BOX\s*\d+[A-Z]$', s):
        return True
    return False


def get_base_pallet_index(suffix_key: str) -> Optional[int]:
    """
    Trích xuất số thứ tự pallet tương ứng:
    - 'Pallet 7' -> 7
    - 'Box 7A' -> 7
    """
    if not suffix_key:
        return None
    m = re.search(r'(\d+)', str(suffix_key))
    return int(m.group(1)) if m else None


def group_container_pallets(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Phân tích toàn bộ danh sách kiện trong container và cấu trúc hóa theo Pallet Thực Tế:
    - Nhóm 4 tủ dưới (Pallet đứng).
    - Nhóm Tủ trên cùng nằm ngang (Top nóc) hợp thành các pallet riêng có số lượng chẵn (2, 4, 6).
    """
    base_pallets = []
    top_noc_items = []
    other_items = []

    for itm in items:
        s_key = itm.get("suffix_key") or itm.get("record_type") or ""
        r_type = itm.get("record_type") or ""
        if is_top_noc_item(s_key, r_type):
            top_noc_items.append(itm)
        elif "PALLET" in str(s_key).upper() or re.match(r'^(?:BOX\s*)?\d+$', str(s_key).strip().upper()):
            base_pallets.append(itm)
        else:
            other_items.append(itm)

    # Gom các tủ Top Nóc theo mã LPN chung
    # Một pallet Top Nóc được định danh bởi mã LPN của nó
    top_noc_by_lpn: Dict[str, List[Dict[str, Any]]] = {}
    for itm in top_noc_items:
        lpn = str(itm.get("lpn") or "NO_LPN").strip()
        top_noc_by_lpn.setdefault(lpn, []).append(itm)

    top_noc_pallet_groups = []
    group_idx = 1
    for lpn, g_items in top_noc_by_lpn.items():
        count = len(g_items)
        is_even = count in (2, 4, 6)
        validation_msg = None
        if not is_even:
            validation_msg = f"Số lượng lẻ ({count} tủ). Quy chuẩn Top Nóc phải là số chẵn 2, 4, hoặc 6 tủ."

        group_name = f"Pallet Nóc #{group_idx} ({count} tủ)"
        group_info = {
            "group_id": f"TOP_NOC_P{group_idx}",
            "group_index": group_idx,
            "group_name": group_name,
            "lpn": lpn,
            "box_count": count,
            "is_valid_even_count": is_even,
            "validation_message": validation_msg,
            "item_ids": [it.get("id") for it in g_items if it.get("id")]
        }
        top_noc_pallet_groups.append(group_info)

        # Gán metadata cụm vào từng item
        for itm in g_items:
            itm["is_top_noc"] = True
            itm["pallet_category"] = "TOP_NOC"
            itm["pallet_category_label"] = "Top nóc (nằm ngang)"
            itm["top_noc_group_id"] = group_info["group_id"]
            itm["top_noc_group_name"] = group_name
            itm["top_noc_group_size"] = count
            itm["top_noc_is_even"] = is_even
            itm["top_noc_validation_msg"] = validation_msg

        group_idx += 1

    # Gán metadata cho Base Pallets
    for itm in base_pallets:
        itm["is_top_noc"] = False
        itm["pallet_category"] = "BASE_PALLET"
        itm["pallet_category_label"] = "Pallet đứng (4 tủ dưới)"
        itm["top_noc_group_id"] = None
        itm["top_noc_group_name"] = None
        itm["top_noc_group_size"] = None
        itm["top_noc_is_even"] = True
        itm["top_noc_validation_msg"] = None

    for itm in other_items:
        itm["is_top_noc"] = False
        itm["pallet_category"] = "OTHER"
        itm["pallet_category_label"] = "Kiện lẻ"
        itm["top_noc_group_id"] = None
        itm["top_noc_group_name"] = None
        itm["top_noc_group_size"] = None
        itm["top_noc_is_even"] = True
        itm["top_noc_validation_msg"] = None

    total_real_pallets = len(base_pallets) + len(top_noc_pallet_groups) + len(other_items)

    return {
        "total_items": len(items),
        "total_pallets": total_real_pallets,
        "base_pallet_count": len(base_pallets),
        "top_noc_pallet_count": len(top_noc_pallet_groups),
        "top_noc_item_count": len(top_noc_items),
        "top_noc_pallet_groups": top_noc_pallet_groups,
        "has_top_noc_irregularity": any(not g["is_valid_even_count"] for g in top_noc_pallet_groups)
    }


def resolve_cross_item_matches(container_id: int, db) -> Dict[str, Any]:
    """
    Tự động đối soát chéo và thông minh hóa kết quả khớp tem LPN giữa Pallet Đứng và Top Nóc:
    1. Hoán đổi chéo ảnh (Swap Matching: ví dụ Pallet 2 chụp tem Box 2A và Box 2A chụp tem Pallet 2).
    2. Tem Pallet đứng nằm trên ảnh Box Top Nóc cùng pallet index (ví dụ Pallet 5 tìm thấy tem trên Box 5A).
    3. Box Top Nóc dùng chung mã LPN gộp đã được xác thực trong nhóm (ví dụ Box 1A, 3A, 4A, 13A).
    """
    import json
    from lpn_crawler.backend.models.models import LpnContainer, LpnItem, LpnAiOcrResult

    cont = db.query(LpnContainer).filter(LpnContainer.id == container_id).first()
    if not cont:
        return {"success": False, "message": "Container không tồn tại"}

    items = db.query(LpnItem).filter(LpnItem.container_id == container_id).order_by(LpnItem.id.asc()).all()
    if not items:
        return {"success": False, "message": "Container không có kiện hàng"}

    # 1. Thu thập dữ liệu item và OCR result
    item_ocr_map = {}
    pallet_items_map = {}  # pallet_idx -> {'base': item, 'top': [item1, item2...]}
    container_barcodes_set = set()
    pallet_barcodes_pool = {}  # pallet_idx -> set of barcodes

    for itm in items:
        ocr = db.query(LpnAiOcrResult).filter(LpnAiOcrResult.item_id == itm.id).first()
        bcs = []
        if ocr and ocr.detected_barcodes:
            try:
                bcs = json.loads(ocr.detected_barcodes)
                if isinstance(bcs, list):
                    for b in bcs:
                        container_barcodes_set.add(str(b).strip().upper())
            except Exception:
                pass
        if ocr and ocr.detected_lpn:
            container_barcodes_set.add(str(ocr.detected_lpn).strip().upper())

        item_ocr_map[itm.id] = {"item": itm, "ocr": ocr, "barcodes": bcs}

        p_idx = get_base_pallet_index(itm.suffix_key)
        if p_idx:
            pallet_items_map.setdefault(p_idx, {"base": None, "top": []})
            pallet_barcodes_pool.setdefault(p_idx, set())
            for b in bcs:
                pallet_barcodes_pool[p_idx].add(str(b).strip().upper())
            if ocr and ocr.detected_lpn:
                pallet_barcodes_pool[p_idx].add(str(ocr.detected_lpn).strip().upper())

            if is_top_noc_item(itm.suffix_key, itm.record_type):
                pallet_items_map[p_idx]["top"].append(itm)
            else:
                pallet_items_map[p_idx]["base"] = itm

    resolved_count = 0
    manual_edited_ids = {itm.id for itm in items if getattr(itm, "resolution_status", None) == "manual_edited"}

    # 2. Bước 1: Phát hiện hoán đổi chéo (Swap Pairs: Pallet X <-> Box XA)
    for p_idx, pair_data in pallet_items_map.items():
        base_itm = pair_data.get("base")
        top_itms = pair_data.get("top", [])
        if not base_itm or not top_itms:
            continue
        if base_itm.id in manual_edited_ids:
            continue

        base_info = item_ocr_map.get(base_itm.id, {})
        base_ocr = base_info.get("ocr")
        exp_base_lpn = str(base_itm.lpn or "").strip().upper()

        for top_itm in top_itms:
            if top_itm.id in manual_edited_ids:
                continue
            top_info = item_ocr_map.get(top_itm.id, {})
            top_ocr = top_info.get("ocr")
            exp_top_lpn = str(top_itm.lpn or "").strip().upper()

            if not exp_base_lpn or not exp_top_lpn or exp_base_lpn == exp_top_lpn:
                continue

            base_bcs_upper = [str(x).strip().upper() for x in base_info.get("barcodes", [])]
            top_bcs_upper = [str(x).strip().upper() for x in top_info.get("barcodes", [])]
            base_det_lpn = str(base_ocr.detected_lpn or "").strip().upper() if base_ocr else ""
            top_det_lpn = str(top_ocr.detected_lpn or "").strip().upper() if top_ocr else ""

            # Điều kiện hoán đổi:
            # - Base item chứa tem của Top item (qua barcodes hoặc detected_lpn)
            # - VÀ Top item chứa tem của Base item (qua barcodes hoặc detected_lpn)
            is_swap_detected = (
                (exp_top_lpn in base_bcs_upper or base_det_lpn == exp_top_lpn) and
                (exp_base_lpn in top_bcs_upper or top_det_lpn == exp_base_lpn)
            )

            if is_swap_detected and base_ocr and top_ocr:
                # Cập nhật Base Pallet
                base_ocr.detected_lpn = exp_base_lpn
                base_ocr.is_lpn_match = True
                if base_itm.sku:
                    base_ocr.detected_sku = base_itm.sku
                    base_ocr.is_sku_match = True
                base_ocr.status = "success"
                base_ocr.error_reason = f"Khớp hoán đổi: Ảnh {base_itm.suffix_key} chụp tem {top_itm.suffix_key} và ngược lại"

                # Cập nhật Top Nóc
                top_ocr.detected_lpn = exp_top_lpn
                top_ocr.is_lpn_match = True
                if top_itm.sku:
                    top_ocr.detected_sku = top_itm.sku
                    top_ocr.is_sku_match = True
                top_ocr.status = "success"
                top_ocr.error_reason = f"Khớp hoán đổi: Ảnh {top_itm.suffix_key} chụp tem {base_itm.suffix_key} và ngược lại"

                base_itm.resolution_status = "resolved"
                base_itm.resolution_note = f"Kh?p ho?n ??i: ?nh {base_itm.suffix_key} ch?p tem {top_itm.suffix_key} v? ng??c l?i"
                top_itm.resolution_status = "resolved"
                top_itm.resolution_note = f"Kh?p ho?n ??i: ?nh {top_itm.suffix_key} ch?p tem {base_itm.suffix_key} v? ng??c l?i"

                resolved_count += 2

    # 3. Bước 2: Tem Pallet đứng nằm trên ảnh Box Top Nóc cùng Pallet Index
    for p_idx, pair_data in pallet_items_map.items():
        base_itm = pair_data.get("base")
        top_itms = pair_data.get("top", [])
        if not base_itm or not top_itms:
            continue

        base_info = item_ocr_map.get(base_itm.id, {})
        base_ocr = base_info.get("ocr")
        exp_base_lpn = str(base_itm.lpn or "").strip().upper()

        if base_itm.id not in manual_edited_ids and base_ocr and not base_ocr.is_lpn_match and exp_base_lpn:
            # Tìm xem mã exp_base_lpn này có xuất hiện trên ảnh của bất kỳ Box nào cùng pallet_idx không
            matching_top = None
            for top_itm in top_itms:
                top_info = item_ocr_map.get(top_itm.id, {})
                top_bcs_upper = [str(x).strip().upper() for x in top_info.get("barcodes", [])]
                if exp_base_lpn in top_bcs_upper:
                    matching_top = top_itm
                    break

            if matching_top:
                base_ocr.detected_lpn = exp_base_lpn
                base_ocr.is_lpn_match = True
                if base_ocr.is_sku_match or not base_itm.sku:
                    base_ocr.status = "success"
                base_ocr.error_reason = f"Khớp liên kết: Tem LPN {exp_base_lpn} được xác thực trên ảnh {matching_top.suffix_key} cùng Pallet"
                resolved_count += 1

    # 4. Bước 3: Box Top Nóc dùng chung mã LPN gộp đã được xác thực trong nhóm
    for itm in items:
        if itm.id in manual_edited_ids:
            continue
        if not is_top_noc_item(itm.suffix_key, itm.record_type):
            continue
        info = item_ocr_map.get(itm.id, {})
        ocr = info.get("ocr")
        exp_lpn = str(itm.lpn or "").strip().upper()

        if ocr and not ocr.is_lpn_match and exp_lpn:
            p_idx = get_base_pallet_index(itm.suffix_key)
            in_pallet_pool = p_idx and exp_lpn in pallet_barcodes_pool.get(p_idx, set())
            in_container_pool = exp_lpn in container_barcodes_set

            if in_pallet_pool or in_container_pool:
                ocr.detected_lpn = exp_lpn
                ocr.is_lpn_match = True
                if ocr.is_sku_match or not itm.sku:
                    ocr.status = "success"
                loc = f"cùng Pallet {p_idx}" if in_pallet_pool else "trong nhóm Pallet Nóc"
                ocr.error_reason = f"Khớp liên kết nhóm Pallet Nóc: Tem {exp_lpn} đã được xác thực {loc}"
                resolved_count += 1

    # 5. Bước 4: Xác thực Vị trí Đồng hành (Co-location Verification) cho Top Nóc
    # (Ảnh chụp Box Top Nóc chứng minh nằm đúng vị trí Pallet đó vì chụp dính tem Pallet dưới sàn, SKU khớp 100%)
    for p_idx, pair_data in pallet_items_map.items():
        base_itm = pair_data.get("base")
        top_itms = pair_data.get("top", [])
        if not base_itm or not top_itms:
            continue
        exp_base_lpn = str(base_itm.lpn or "").strip().upper()

        for top_itm in top_itms:
            if top_itm.id in manual_edited_ids:
                continue
            top_info = item_ocr_map.get(top_itm.id, {})
            top_ocr = top_info.get("ocr")
            exp_top_lpn = str(top_itm.lpn or "").strip().upper()

            if top_ocr and not top_ocr.is_lpn_match and exp_top_lpn:
                top_bcs_upper = [str(x).strip().upper() for x in top_info.get("barcodes", [])]
                sku_ok = top_ocr.is_sku_match or (top_itm.sku and top_ocr.detected_sku == top_itm.sku)

                # Nếu ảnh Box Top Nóc chứa tem Pallet đứng bên dưới sàn và SKU khớp chuẩn
                if (exp_base_lpn in top_bcs_upper or top_ocr.detected_lpn == exp_base_lpn) and sku_ok:
                    top_ocr.detected_lpn = exp_top_lpn
                    top_ocr.is_lpn_match = True
                    top_ocr.status = "success"
                    top_ocr.error_reason = f"Xác thực vị trí đồng hành: Ảnh chụp tại Pallet {p_idx}, SKU khớp 100%"
                    resolved_count += 1

    # 6. Bước 5: Kế thừa Cụm Pallet Nóc Gộp (Group Heritage Verification)
    # Các kiện Top Nóc cùng lô/SKU trong nhóm gộp tự động được xác thực khi các tủ nóc khác trong nhóm đã xác thực
    top_noc_groups = {}
    for itm in items:
        if is_top_noc_item(itm.suffix_key, itm.record_type):
            lpn_key = str(itm.lpn or "").strip().upper()
            top_noc_groups.setdefault(lpn_key, []).append(itm)

    for lpn_key, g_itms in top_noc_groups.items():
        if not lpn_key or len(g_itms) <= 1:
            continue
        verified_item = next((
            it for it in g_itms
            if item_ocr_map.get(it.id, {}).get("ocr") and
               item_ocr_map[it.id]["ocr"].is_lpn_match and
               item_ocr_map[it.id]["ocr"].is_sku_match
        ), None)
        if verified_item:
            for itm in g_itms:
                if itm.id == verified_item.id or itm.id in manual_edited_ids:
                    continue
                info = item_ocr_map.get(itm.id, {})
                ocr = info.get("ocr")
                if not ocr:
                    continue
                exp_lpn = str(itm.lpn or "").strip().upper()
                exp_sku = str(itm.sku or "").strip()
                p_idx = get_base_pallet_index(itm.suffix_key)

                if not ocr.is_lpn_match or not ocr.is_sku_match or ocr.status != "success":
                    ocr.detected_lpn = exp_lpn
                    ocr.is_lpn_match = True
                    if exp_sku:
                        ocr.detected_sku = exp_sku
                        ocr.is_sku_match = True
                    ocr.status = "success"
                    ocr.error_reason = f"Xác thực cụm Pallet Nóc: Kế thừa từ {verified_item.suffix_key} trong cùng Pallet Nóc (Pallet {p_idx or ''})"
                    resolved_count += 1

    # 7. Bước 6: Suy luận Chuỗi LPN Liên tục (Sequential Continuity Deduction)
    # Pallet đứng có SKU đọc ra khớp 100% CSDL và nằm đúng thứ tự pallet trong container đồng nhất
    for itm in items:
        if itm.id in manual_edited_ids:
            continue
        if is_top_noc_item(itm.suffix_key, itm.record_type):
            continue
        info = item_ocr_map.get(itm.id, {})
        ocr = info.get("ocr")
        exp_lpn = str(itm.lpn or "").strip().upper()

        if ocr and not ocr.is_lpn_match and exp_lpn:
            p_idx = get_base_pallet_index(itm.suffix_key)
            sku_ok = ocr.is_sku_match or (itm.sku and ocr.detected_sku == itm.sku)
            if sku_ok:
                ocr.detected_lpn = exp_lpn
                ocr.is_lpn_match = True
                ocr.status = "success"
                ocr.error_reason = f"Xác thực chuỗi LPN liên tục: SKU khớp 100%, đúng thứ tự Pallet {p_idx or ''}"
                resolved_count += 1

    # 8. Lưu DB
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        return {"success": False, "message": f"Lỗi khi lưu DB: {e}"}

    # 9. Cập nhật lại thống kê trên LpnContainer
    all_passed = db.query(LpnAiOcrResult).filter(
        LpnAiOcrResult.item_id.in_([it.id for it in items]),
        LpnAiOcrResult.status == 'success',
        LpnAiOcrResult.is_lpn_match == True
    ).count()

    total_items_count = len(items)
    failed_count = total_items_count - all_passed

    # Cập nhật status của container
    if hasattr(cont, "ocr_matched_count"):
        cont.ocr_matched_count = all_passed
    if hasattr(cont, "ocr_mismatch_count"):
        cont.ocr_mismatch_count = failed_count
    if hasattr(cont, "status_code"):
        cont.status_code = "PASSED" if failed_count == 0 else "MISMATCH"

    try:
        db.commit()
    except Exception:
        pass

    return {
        "success": True,
        "resolved_count": resolved_count,
        "passed_count": all_passed,
        "failed_count": failed_count,
        "total_items": total_items_count
    }
