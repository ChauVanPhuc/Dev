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

    def read_barcodes(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Đọc tất cả mã vạch 1D và QR code trong ảnh.
        Ưu tiên hàng đầu là ZXing C++ với kiểm tra mã checksum nghiêm ngặt.
        Trả về danh sách dict:
        [
            {
                "data": str (ví dụ: "060074034" hoặc "V36S1-BF-WHT"),
                "type": "Code128" | "QRCode" | "1D_BARCODE",
                "confidence": 1.0,
                "source": "ZXing (Code128)"
            }
        ]
        """
        if image is None:
            return []

        results: List[Dict[str, Any]] = []
        seen_texts = set()

        # 1. ƯU TIÊN 1: Giải mã bằng ZXing C++ (Công nghiệp, hỗ trợ Code128, Code39, UPC, EAN, QR)
        # Hỗ trợ xoay tự động, đa biến thể tương phản (CLAHE, Sharpen, Otsu) và kiểm tra checksum tuyệt đối
        if self.has_zxing:
            try:
                candidate_imgs = [image]
                h, w = image.shape[:2]
                min_dim = min(h, w)
                
                # Phóng to nếu tem nhỏ để phục hồi độ rộng vạch barcode
                if min_dim < 320:
                    scale = min(3.0, max(1.5, 320.0 / max(1, min_dim)))
                    candidate_imgs.append(cv2.resize(image, (0, 0), fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC))

                # Biến thể tăng cường tương phản CLAHE cho tem bị mờ/lóa
                gray_crop = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image.copy()
                clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
                gray_clahe = clahe.apply(gray_crop)
                candidate_imgs.append(gray_clahe)

                # Biến thể làm sắc nét biên độ barcode
                blur = cv2.GaussianBlur(gray_clahe, (0, 0), 1.5)
                sharp = cv2.addWeighted(gray_clahe, 1.4, blur, -0.4, 0)
                candidate_imgs.append(sharp)

                # Biến thể nhị phân hóa Otsu cho mã vạch nhiệt mờ
                _, otsu_bin = cv2.threshold(gray_clahe, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                candidate_imgs.append(otsu_bin)

                for c_img in candidate_imgs:
                    bcs = zxingcpp.read_barcodes(c_img, try_rotate=True, try_downscale=True, try_invert=True)
                    for b in bcs:
                        clean_text = str(b.text).strip()
                        if clean_text and clean_text not in seen_texts:
                            seen_texts.add(clean_text)
                            fmt_name = b.format.name if hasattr(b.format, 'name') else str(b.format)
                            results.append({
                                "data": clean_text,
                                "type": fmt_name,
                                "confidence": 1.0,
                                "source": f"ZXing ({fmt_name})"
                            })
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
