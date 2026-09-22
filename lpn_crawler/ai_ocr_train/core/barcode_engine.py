# -*- coding: utf-8 -*-
"""
Barcode & QR Code Detection Engine.
Giải mã siêu tốc mã vạch 1D/2D in trên nhãn Pallet / Thùng hàng:
- Tận dụng bộ giải mã cv2.barcode.BarcodeDetector và cv2.QRCodeDetector sẵn có.
- Thử nghiệm đa góc quét và tăng tương phản nếu ảnh chụp mờ hoặc lóa sáng.
- Trả về danh sách mã vạch đọc được kèm vị trí và loại mã.
"""

import cv2
import numpy as np
from typing import List, Dict, Any, Optional


class BarcodeEngine:
    """Bộ giải mã mã vạch công nghiệp."""

    def __init__(self):
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
        Trả về danh sách dict:
        [
            {
                "data": str (ví dụ: "060074034" hoặc "V36S1-BF-WHT"),
                "type": "BARCODE_1D" | "QR_CODE",
                "confidence": 1.0,
                "bbox": [x, y, w, h] (nếu có)
            }
        ]
        """
        if image is None:
            return []

        results: List[Dict[str, Any]] = []
        seen_texts = set()

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image.copy()

        # 1. Thử quét Barcode 1D bằng OpenCV
        if self.barcode_detector is not None:
            try:
                # Quét trên ảnh xám bằng detectAndDecodeWithType
                ok, decoded_info, decoded_type, points = self.barcode_detector.detectAndDecodeWithType(gray)
                if ok and decoded_info:
                    for idx, text in enumerate(decoded_info):
                        clean_text = str(text).strip()
                        if clean_text and clean_text not in seen_texts:
                            seen_texts.add(clean_text)
                            b_type = str(decoded_type[idx]) if decoded_type is not None and idx < len(decoded_type) else "1D_BARCODE"
                            results.append({
                                "data": clean_text,
                                "type": b_type,
                                "confidence": 1.0,
                                "source": "Barcode Detector"
                            })
            except Exception:
                pass

        # 2. Thử quét QR Code
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

        # 3. Nếu chưa đọc được, thử áp dụng CLAHE tăng tương phản cao và quét lại
        if not results and self.barcode_detector is not None:
            try:
                clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
                enhanced = clahe.apply(gray)
                ok, decoded_info, decoded_type, _ = self.barcode_detector.detectAndDecodeWithType(enhanced)
                if ok and decoded_info:
                    for idx, text in enumerate(decoded_info):
                        clean_text = str(text).strip()
                        if clean_text and clean_text not in seen_texts:
                            seen_texts.add(clean_text)
                            results.append({
                                "data": clean_text,
                                "type": "1D_BARCODE_ENHANCED",
                                "confidence": 1.0,
                                "source": "Barcode Detector (CLAHE)"
                            })
            except Exception:
                pass

        # 4. Quét đa hướng (0°, 90°, 270°) và tự động phóng to nếu là tem nhỏ
        if not results:
            min_dim = min(gray.shape[:2])
            candidate_imgs = []

            # Nếu tem nhỏ, phóng to 2.5x
            if min_dim < 160:
                scale = min(3.5, 220.0 / max(1, min_dim))
                up_gray = cv2.resize(gray, (0, 0), fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
                candidate_imgs.append(up_gray)
            else:
                candidate_imgs.append(gray)

            # Thêm các góc xoay 90° và 270°
            for base in list(candidate_imgs):
                candidate_imgs.append(cv2.rotate(base, cv2.ROTATE_90_CLOCKWISE))
                candidate_imgs.append(cv2.rotate(base, cv2.ROTATE_90_COUNTERCLOCKWISE))

            for c_img in candidate_imgs:
                if self.barcode_detector is not None:
                    try:
                        ok, decoded_info, decoded_type, _ = self.barcode_detector.detectAndDecodeWithType(c_img)
                        if ok and decoded_info:
                            for idx, text in enumerate(decoded_info):
                                clean_text = str(text).strip()
                                if clean_text and clean_text not in seen_texts:
                                    seen_texts.add(clean_text)
                                    results.append({
                                        "data": clean_text,
                                        "type": "1D_BARCODE_ROTATED",
                                        "confidence": 1.0,
                                        "source": "Barcode Detector (Multi-Angle)"
                                    })
                    except Exception:
                        pass

                if self.qr_detector is not None:
                    try:
                        ok, decoded_info, _, _ = self.qr_detector.detectAndDecodeMulti(c_img)
                        if ok and decoded_info:
                            for text in decoded_info:
                                clean_text = str(text).strip()
                                if clean_text and clean_text not in seen_texts:
                                    seen_texts.add(clean_text)
                                    results.append({
                                        "data": clean_text,
                                        "type": "QR_CODE_ROTATED",
                                        "confidence": 1.0,
                                        "source": "QR Detector (Multi-Angle)"
                                    })
                    except Exception:
                        pass

                if results:
                    break

        return results
