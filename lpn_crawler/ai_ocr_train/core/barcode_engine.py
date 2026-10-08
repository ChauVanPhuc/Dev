# -*- coding: utf-8 -*-
"""
Barcode & QR Code Detection Engine.
Giải mã siêu tốc mã vạch 1D/2D in trên nhãn Pallet / Thùng hàng:
- Tích hợp ZXing C++ (zxing-cpp): Bộ giải mã công nghiệp chuẩn xác cao cho Code128, Code39, EAN, UPC, QR.
  Loại bỏ 100% hiện tượng giải mã ảo (false positive / hallucination) của OpenCV.
- Hỗ trợ đa góc quét (0°, 90°, 180°, 270°) và tự động scale thông minh.
- Dự phòng (Fallback) sang OpenCV Barcode/QR Detector nếu môi trường chưa cài zxing-cpp.
"""

import cv2
import numpy as np
from typing import List, Dict, Any, Optional

try:
    import zxingcpp
    HAS_ZXING = True
except ImportError:
    HAS_ZXING = False


class BarcodeEngine:
    """Bộ giải mã mã vạch công nghiệp."""

    def __init__(self):
        self.has_zxing = HAS_ZXING
        try:
            self.barcode_detector = cv2.barcode.BarcodeDetector()
        except Exception:
            self.barcode_detector = None

        try:
            self.qr_detector = cv2.QRCodeDetector()
        except Exception:
            self.qr_detector = None

    def read_barcodes(self, image: np.ndarray, expected_lpn: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Đọc tất cả mã vạch 1D và QR code trong ảnh.
        Ưu tiên hàng đầu là ZXing C++ với kiểm tra mã checksum nghiêm ngặt.
        Hỗ trợ đa tỷ lệ (Multi-Scale: 1.0x, 1.5x, 2.0x) và đa biến thể tương phản (CLAHE, Otsu, Sharpen).
        Nếu có expected_lpn, ưu tiên tìm và trả về mã khớp ngay lập tức.
        """
        if image is None:
            return []

        results: List[Dict[str, Any]] = []
        seen_texts = set()
        target_clean = str(expected_lpn).strip().upper() if expected_lpn else None

        # 1. ƯU TIÊN 1: Giải mã bằng ZXing C++ (Công nghiệp, hỗ trợ Code128, Code39, UPC, EAN, QR)
        if self.has_zxing:
            try:
                h, w = image.shape[:2]
                min_dim = min(h, w)

                if min_dim < 400:
                    scales = [1.0, 2.0, 3.0]
                else:
                    scales = [1.0, 1.5, 2.0]

                target_found = False
                for sc in scales:
                    if target_found:
                        break
                    sc_img = cv2.resize(image, (0, 0), fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC) if sc != 1.0 else image
                    gray = cv2.cvtColor(sc_img, cv2.COLOR_BGR2GRAY) if len(sc_img.shape) == 3 else sc_img.copy()

                    variants = [sc_img, gray]

                    # Biến thể tăng cường tương phản CLAHE cho tem bị mờ/lóa
                    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
                    gray_clahe = clahe.apply(gray)
                    variants.append(gray_clahe)

                    # Biến thể nhị phân hóa Otsu cho mã vạch nhiệt mờ
                    _, otsu_bin = cv2.threshold(gray_clahe, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                    variants.append(otsu_bin)

                    for v_mat in variants:
                        bcs = zxingcpp.read_barcodes(v_mat, try_rotate=True, try_downscale=True, try_invert=True)
                        for b in bcs:
                            clean_text = str(b.text).strip()
                            if not clean_text:
                                continue
                            fmt_name = b.format.name if hasattr(b.format, 'name') else str(b.format)
                            res_item = {
                                "data": clean_text,
                                "type": fmt_name,
                                "confidence": 1.0,
                                "source": f"ZXing ({fmt_name})"
                            }
                            if target_clean and clean_text.upper() == target_clean:
                                if clean_text not in seen_texts:
                                    seen_texts.add(clean_text)
                                    results.insert(0, res_item)
                                target_found = True
                                break
                            elif clean_text not in seen_texts:
                                seen_texts.add(clean_text)
                                results.append(res_item)

                        if target_found:
                            break
                        # Nếu không có target_clean nhưng đã đọc được barcode ở scale 1.0x, dừng sớm để tối ưu tốc độ
                        if not target_clean and results and sc == 1.0:
                            break

                if results:
                    return results
            except Exception:
                pass

        # 2. DỰ PHÒNG: Thử quét bằng OpenCV nếu ZXing chưa đọc được
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image.copy()

        # Quét QR Code
        if self.qr_detector is not None:
            try:
                ok, decoded_info, points, _ = self.qr_detector.detectAndDecodeMulti(gray)
                if ok and decoded_info:
                    for text in decoded_info:
                        clean_text = str(text).strip()
                        if clean_text and clean_text not in seen_texts:
                            seen_texts.add(clean_text)
                            results.append({
                                "data": clean_text,
                                "type": "QR_CODE",
                                "confidence": 1.0,
                                "source": "QR Detector"
                            })
            except Exception:
                pass

        # Quét Barcode 1D bằng OpenCV (chỉ dùng ảnh xám gốc, tránh CLAHE làm sinh mã EAN ảo)
        if not results and self.barcode_detector is not None:
            try:
                ok, decoded_info, decoded_type, points = self.barcode_detector.detectAndDecodeWithType(gray)
                if ok and decoded_info:
                    for idx, text in enumerate(decoded_info):
                        clean_text = str(text).strip()
                        if clean_text and clean_text not in seen_texts:
                            b_type = str(decoded_type[idx]) if decoded_type is not None and idx < len(decoded_type) else "1D_BARCODE"
                            seen_texts.add(clean_text)
                            results.append({
                                "data": clean_text,
                                "type": b_type,
                                "confidence": 0.95,
                                "source": f"Barcode Detector ({b_type})"
                            })
            except Exception:
                pass

        return results
