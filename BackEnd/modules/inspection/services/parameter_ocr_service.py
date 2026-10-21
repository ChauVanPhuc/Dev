# -*- coding: utf-8 -*-
"""
Parameter OCR Service.
Chuyên trách nhận diện và bóc tách thông số kỹ thuật từ ảnh chụp thiết bị đo:
1. Độ bóng (Gloss): Máy đo độ bóng màu xanh (Gloss Meter) -> số đo góc 60°/85° (VD: 30.7 GU).
2. Màu sơn (Color): Máy so màu & ứng dụng điện thoại (Colorimeter) -> giá trị sai lệch màu (VD: 0.10 ΔE).
"""

import os
import re
import json
import logging
import threading
from datetime import datetime
from typing import Dict, Any, Optional, Tuple, List
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

_OCR_READER = None
_OCR_LOCK = threading.Lock()


def get_ocr_reader():
    """Khởi tạo Singleton EasyOCR Reader luồng an toàn."""
    global _OCR_READER
    if _OCR_READER is None:
        with _OCR_LOCK:
            if _OCR_READER is None:
                try:
                    import easyocr
                    _OCR_READER = easyocr.Reader(['en'], gpu=False)
                    logger.info("Khởi tạo EasyOCR Reader thành công cho Parameter OCR.")
                except Exception as e:
                    logger.error(f"Không thể khởi tạo EasyOCR Reader: {e}")
                    _OCR_READER = None
    return _OCR_READER


def parse_gloss_candidate(text: str) -> Optional[str]:
    """Bóc tách giá trị độ bóng (5.0 - 150.0 GU) từ văn bản nhận diện."""
    if not text:
        return None
    clean = text.strip()
    
    # 1. Khớp số thực có dấu chấm thập phân (VD: 30.7, 60.5, 85.0)
    m_float = re.search(r'\b(\d{1,3}\.\d{1,2})\b', clean)
    if m_float:
        try:
            val = float(m_float.group(1))
            if 5.0 <= val <= 180.0:
                return f"{val:.1f}"
        except ValueError:
            pass

    # 2. Khớp trường hợp đọc dính 3 số liền kề: 307 -> 30.7
    m_3digits = re.search(r'\b(\d{3})\b', clean)
    if m_3digits:
        try:
            raw_int = int(m_3digits.group(1))
            val = raw_int / 10.0
            if 5.0 <= val <= 180.0:
                return f"{val:.1f}"
        except ValueError:
            pass

    # 3. Khớp số nguyên thông thường (VD: 30, 60, 85)
    m_int = re.search(r'\b(\d{2})\b', clean)
    if m_int:
        try:
            val = float(m_int.group(1))
            if 10.0 <= val <= 99.0 and val not in [20, 60]:  # Tránh góc 20° hoặc 60°
                return f"{val:.1f}"
        except ValueError:
            pass

    return None


def parse_color_candidate(text: str) -> Optional[str]:
    """Bóc tách giá trị độ lệch màu / thông số màu sơn (0.01 - 15.00 ΔE)."""
    if not text:
        return None
    clean = text.strip()

    # Khớp số thập phân có 2 chữ số (VD: 0.10, 0.05, 0.85, 1.25)
    m = re.search(r'\b(0\.\d{1,2}|[1-9]\.\d{1,2})\b', clean)
    if m:
        try:
            val = float(m.group(1))
            if 0.01 <= val <= 15.0:
                return f"{val:.2f}"
        except ValueError:
            pass

    return None


def extract_parameter_from_image_path(img_path: str) -> Dict[str, Any]:
    """
    Đọc ảnh từ đường dẫn đĩa và bóc tách 2 chỉ số: Độ bóng & Màu sơn.
    """
    if not os.path.exists(img_path):
        return {"success": False, "error": f"Không tìm thấy file: {img_path}"}

    try:
        img_pil = Image.open(img_path).convert('RGB')
        img_np = np.array(img_pil)
    except Exception as e:
        return {"success": False, "error": f"Lỗi đọc ảnh: {str(e)}"}

    reader = get_ocr_reader()
    if not reader:
        return {"success": False, "error": "EasyOCR engine chưa sẵn sàng"}

    try:
        with _OCR_LOCK:
            results = reader.readtext(img_np)
    except Exception as e:
        return {"success": False, "error": f"Lỗi thực thi OCR: {str(e)}"}

    detected_gloss = None
    detected_color = None
    all_detections = []

    for bbox, text, prob in results:
        t_clean = str(text).strip()
        all_detections.append({"text": t_clean, "prob": float(prob)})

        # Ưu tiên nhận diện màu sơn
        if detected_color is None:
            c_val = parse_color_candidate(t_clean)
            if c_val:
                detected_color = c_val

        # Nhận diện độ bóng
        if detected_gloss is None:
            g_val = parse_gloss_candidate(t_clean)
            if g_val:
                detected_gloss = g_val

    # Nếu chưa bắt được độ bóng chính xác (hoặc bắt nhầm 30 thay vì 30.7), thử crop phóng to vùng máy đo nếu cần
    if detected_gloss and detected_gloss.endswith('.0'):
        # Thử tìm xem có kết quả nào sát hơn không
        for item in all_detections:
            txt = item["text"]
            if "30" in txt and len(txt) > 2:
                re_30 = parse_gloss_candidate(txt)
                if re_30 and not re_30.endswith('.0'):
                    detected_gloss = re_30
                    break

    return {
        "success": True,
        "gloss_value": detected_gloss,
        "color_value": detected_color,
        "detections": all_detections
    }


def resolve_local_image_path(web_path: str) -> Optional[str]:
    """Chuyển đổi đường dẫn URL tĩnh của ảnh thành đường dẫn tuyệt đối trên đĩa."""
    if not web_path or not isinstance(web_path, str):
        return None

    clean = web_path.replace('\\', '/').strip()
    clean = clean.split('?')[0].split('#')[0]

    # Các thư mục lưu trữ ảnh trong hệ thống
    base_dirs = [
        os.path.normpath(os.path.join(os.path.dirname(__file__), "../../../uploads/inspections")),
        os.path.normpath(os.path.join(os.path.dirname(__file__), "../../../static/uploads/inspections")),
        os.path.normpath(os.path.join(os.path.dirname(__file__), "../../../uploads")),
        os.path.normpath(os.path.join(os.path.dirname(__file__), "../../../static")),
        r"C:\Users\Châu Văn Phúc\.gemini\antigravity-ide\brain\efa899b8-24c4-4174-ad36-925f3df7694b\.user_uploaded"
    ]

    filename = os.path.basename(clean)

    # 1. Kiểm tra trực tiếp đường dẫn tuyệt đối nếu file tồn tại
    if os.path.isabs(clean) and os.path.exists(clean):
        return clean

    # 2. Tìm theo tên file trong các thư mục tĩnh
    for b in base_dirs:
        cand = os.path.join(b, filename)
        if os.path.exists(cand):
            return cand

    # 3. Thử tìm với tiền tố stripped
    stripped = clean.lstrip('/')
    if stripped.startswith('static/'):
        stripped = stripped[len('static/'):]
    for b in base_dirs:
        cand = os.path.normpath(os.path.join(b, "..", stripped))
        if os.path.exists(cand):
            return cand

    return None


def scan_and_save_inspection_parameters(inspection_item, db) -> Dict[str, Any]:
    """
    Quét OCR toàn bộ ảnh của phiếu kiểm tra và tự động cập nhật vào CSDL.
    """
    if not inspection_item:
        return {"success": False, "error": "Phiếu kiểm tra không tồn tại"}

    # 1. Thu thập tất cả các đường dẫn ảnh của phiếu
    img_candidates = []
    for f in [inspection_item.image_path_1, inspection_item.image_path_2, inspection_item.image_path_3]:
        if f:
            img_candidates.append(f)

    if inspection_item.images_json:
        try:
            p_json = json.loads(inspection_item.images_json)
            if isinstance(p_json, list):
                img_candidates.extend(p_json)
            elif isinstance(p_json, dict):
                for v in p_json.values():
                    if isinstance(v, list):
                        img_candidates.extend(v)
                    elif isinstance(v, str):
                        img_candidates.append(v)
        except Exception:
            pass

    data_dict = {}
    if inspection_item.data_json:
        try:
            data_dict = json.loads(inspection_item.data_json) if isinstance(inspection_item.data_json, str) else inspection_item.data_json
            if isinstance(data_dict, dict) and "images" in data_dict and isinstance(data_dict["images"], list):
                img_candidates.extend(data_dict["images"])
        except Exception:
            data_dict = {}

    # Kiểm tra xem phiếu có thuộc loại kiểm tra màu / độ bóng không
    param = str(data_dict.get("parameter") or "").strip().lower()
    task_name = str(inspection_item.part_name or "").strip().lower()

    is_color = (
        param in ("do_bong", "do_bong_son", "kiem_tra_mau", "mau_son", "color") or
        "mau" in param or "màu" in param or "bóng" in param or "bong" in param or
        "kiểm tra màu" in task_name or "màu sơn" in task_name
    )

    if not is_color:
        return {
            "success": True,
            "task_id": inspection_item.id,
            "ticket_code": inspection_item.ticket_code,
            "message": "Phiếu không thuộc loại kiểm tra màu/độ bóng, bỏ qua quét OCR",
            "is_ocr_scanned": False,
            "scan_performed": False
        }

    if not img_candidates:
        # Nếu chưa có ảnh tải lên, đánh dấu đã kiểm tra nhưng không có ảnh
        return {
            "success": True,
            "message": "Phiếu chưa có ảnh minh chứng để quét OCR",
            "gloss_value": data_dict.get("gloss_value"),
            "color_value": data_dict.get("color_value"),
            "is_ocr_scanned": False
        }

    # 2. Duyệt qua từng ảnh để quét OCR
    found_gloss = data_dict.get("gloss_value")
    found_color = data_dict.get("color_value")
    scan_performed = False

    for img_ref in img_candidates:
        local_path = resolve_local_image_path(img_ref)
        if not local_path:
            continue

        res = extract_parameter_from_image_path(local_path)
        if res.get("success"):
            scan_performed = True
            if not found_gloss and res.get("gloss_value"):
                found_gloss = res.get("gloss_value")
            if not found_color and res.get("color_value"):
                found_color = res.get("color_value")

        if found_gloss and found_color:
            break

    # 3. Cập nhật vào data_json và lưu CSDL
    if not isinstance(data_dict, dict):
        data_dict = {}

    data_dict["gloss_value"] = found_gloss or ""
    data_dict["color_value"] = found_color or ""
    data_dict["is_ocr_scanned"] = True
    data_dict["ocr_scanned_at"] = datetime.now().isoformat()

    inspection_item.data_json = json.dumps(data_dict, ensure_ascii=False)
    try:
        db.commit()
        db.refresh(inspection_item)
    except Exception as db_err:
        db.rollback()
        logger.error(f"Lỗi lưu CSDL kết quả OCR cho phiếu #{inspection_item.id}: {db_err}")
        return {"success": False, "error": f"Lỗi lưu CSDL: {str(db_err)}"}

    return {
        "success": True,
        "task_id": inspection_item.id,
        "ticket_code": inspection_item.ticket_code,
        "gloss_value": found_gloss,
        "color_value": found_color,
        "is_ocr_scanned": True,
        "scan_performed": scan_performed
    }
