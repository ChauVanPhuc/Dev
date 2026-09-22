# -*- coding: utf-8 -*-
"""
Auto-Orientation & Deskew Module.
Tự động phát hiện hướng quay của nhãn (0°, 90°, 180°, 270°) và góc nghiêng nhỏ (+-45°):
- Phân tích hướng phân bố đường thẳng / vân mã vạch / dòng text.
- Xoay ảnh về hướng đọc chuẩn (Left-to-Right, Top-to-Bottom).
"""

import cv2
import numpy as np
from typing import Tuple, Dict, Any


class AutoOrient:
    """Tự động xoay và nắn thẳng ảnh nhãn dán."""

    @staticmethod
    def detect_skew_angle(image: np.ndarray) -> float:
        """
        Tính góc nghiêng tự do (-45° đến +45°) bằng thuật toán Hough Lines / MinAreaRect.
        """
        if image is None:
            return 0.0

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image.copy()
        
        # Nhị phân đảo ngược (chữ trắng nền đen)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # Lấy tọa độ các điểm ảnh khác 0
        coords = np.column_stack(np.where(thresh > 0))
        if len(coords) < 50:
            return 0.0

        # Tính hình chữ nhật xoay nhỏ nhất chứa toàn bộ các điểm chữ
        rect = cv2.minAreaRect(coords)
        angle = rect[-1]

        # Chuẩn hóa góc OpenCV
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        # Giới hạn góc nghiêng vừa phải
        if abs(angle) > 45:
            angle = 0.0

        return round(float(angle), 2)

    @staticmethod
    def order_points(pts: np.ndarray) -> np.ndarray:
        """
        Sắp xếp 4 đỉnh của tứ giác theo thứ tự:
        0: Top-Left, 1: Top-Right, 2: Bottom-Right, 3: Bottom-Left.
        """
        rect = np.zeros((4, 2), dtype="float32")
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]  # Top-Left (tổng x+y nhỏ nhất)
        rect[2] = pts[np.argmax(s)]  # Bottom-Right (tổng x+y lớn nhất)

        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]  # Top-Right (hiệu y-x nhỏ nhất)
        rect[3] = pts[np.argmax(diff)]  # Bottom-Left (hiệu y-x lớn nhất)
        return rect

    @staticmethod
    def four_point_transform(image: np.ndarray, pts: np.ndarray) -> np.ndarray:
        """
        Perspective Transformation: Nắn phẳng tem nhãn bị méo hình thang do góc chụp xiên.
        Sử dụng cv2.getPerspectiveTransform và cv2.warpPerspective (không phải warpAffine).
        """
        if image is None or pts is None or len(pts) != 4:
            return image

        rect = AutoOrient.order_points(pts)
        (tl, tr, br, bl) = rect

        width_a = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
        width_b = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
        max_width = max(int(width_a), int(width_b))

        height_a = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
        height_b = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
        max_height = max(int(height_a), int(height_b))

        if max_width < 10 or max_height < 10:
            return image

        dst = np.array([
            [0, 0],
            [max_width - 1, 0],
            [max_width - 1, max_height - 1],
            [0, max_height - 1]
        ], dtype="float32")

        M = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(image, M, (max_width, max_height), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return warped

    @staticmethod
    def auto_orient_image(image: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Thực hiện phát hiện và nắn thẳng ảnh tự động:
        1. Đo góc nghiêng tự do (-45° đến +45°) và xoay 2D (warpAffine).
        Trả về: (ảnh đã nắn thẳng, thông tin metadata về góc đã nắn)
        """
        if image is None:
            return image, {"applied_angle": 0.0, "perspective_corrected": False}

        h, w = image.shape[:2]
        applied_rotations = []

        current = image.copy()

        # Đo góc nghiêng nhỏ (-45° đến +45°) để nắn thẳng tem nhãn bị chụp nghiêng nhẹ
        skew_angle = AutoOrient.detect_skew_angle(current)
        if abs(skew_angle) > 0.5:
            (ch, cw) = current.shape[:2]
            M = cv2.getRotationMatrix2D((cw // 2, ch // 2), skew_angle, 1.0)
            current = cv2.warpAffine(current, M, (cw, ch), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
            applied_rotations.append(skew_angle)

        total_applied = sum(applied_rotations)
        return current, {
            "applied_angle": round(total_applied, 2),
            "is_rotated": len(applied_rotations) > 0,
            "perspective_corrected": False
        }
