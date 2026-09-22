# -*- coding: utf-8 -*-
r"""
Synthetic Label Generator & Data Augmentation.
Bộ sinh dữ liệu nhãn giả lập siêu chân thực mô phỏng máy in nhiệt / in kim công nghiệp:
- Sinh tem nhãn trắng có mã LPN (\d{9}), mã SKU (V36S1-BF-WHT, A073D-BC-GRY) và Barcode 1D Code128.
- Dán tem trắng lên nền bìa carton nâu kraft có in hình vẽ phác thảo / chữ in thương hiệu để rèn luyện model.
- Giả lập hiệu ứng lóa sáng màng co nylon, mờ nét, xước rách, xoay nghiêng -15° đến +15°.
"""

import os
import random
import cv2
import numpy as np
from typing import Dict, Any, List, Optional, Tuple


class SyntheticLabelGenerator:
    """Bộ sinh ảnh nhãn nhân tạo phục vụ huấn luyện Deep Learning OCR & YOLO."""

    SKU_PREFIXES = ["V36S1", "V36S2", "V36-R", "V42S1", "V42S2", "W1830", "B30", "B36", "DB36", "A073D", "A060S", "CAM72D"]
    SKU_MID = ["BF", "STD", "PRO", "LX", "BC", "DB"]
    SKU_COLORS = ["WHT", "GRY", "BLK", "BL", "OAK", "WAL"]

    @classmethod
    def generate_random_sku(cls) -> str:
        """Sinh mã SKU chuẩn nhà máy."""
        p = random.choice(cls.SKU_PREFIXES)
        m = random.choice(cls.SKU_MID)
        c = random.choice(cls.SKU_COLORS)
        return f"{p}-{m}-{c}"

    @classmethod
    def generate_random_lpn(cls) -> str:
        """Sinh mã LPN 9 chữ số."""
        return f"{random.randint(60000000, 99999999):09d}"

    @classmethod
    def generate_synthetic_sticker_image(
        cls,
        lpn: Optional[str] = None,
        sku: Optional[str] = None,
        width: int = 400,
        height: int = 240
    ) -> Tuple[np.ndarray, str, str]:
        """
        Tạo 1 ảnh con tem nhãn trắng có barcode và text LPN/SKU.
        """
        lpn_str = lpn or cls.generate_random_lpn()
        sku_str = sku or cls.generate_random_sku()

        # Nền giấy trắng nhiệt hơi ngả xám nhạt tự nhiên
        base_gray = random.randint(235, 250)
        sticker = np.full((height, width, 3), base_gray, dtype=np.uint8)

        # Thêm nhiễu texture giấy
        noise = np.random.normal(0, 3, (height, width, 3)).astype(np.int16)
        sticker = np.clip(sticker.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        # Header thương hiệu
        cv2.putText(sticker, "ARIEL SHIPPING / PRODUCT LABEL", (20, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (20, 20, 20), 2, cv2.LINE_AA)

        # Vẽ giả lập vạch Barcode 1D
        bc_x = 20
        bc_y = 45
        bc_h = 75
        bc_w = width - 40
        curr_x = bc_x
        while curr_x < bc_x + bc_w - 10:
            bar_thick = random.choice([2, 3, 4, 6])
            space_thick = random.choice([2, 3, 4, 5])
            cv2.rectangle(sticker, (curr_x, bc_y), (curr_x + bar_thick, bc_y + bc_h), (10, 10, 10), -1)
            curr_x += bar_thick + space_thick

        # Text mã LPN & SKU
        cv2.putText(sticker, f"LPN: {lpn_str}", (20, 145),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.70, (0, 0, 0), 2, cv2.LINE_AA)
        cv2.putText(sticker, f"SKU: {sku_str}", (20, 180),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.70, (0, 0, 0), 2, cv2.LINE_AA)
        cv2.putText(sticker, f"LOT: BATCH-{random.randint(1, 99):02d} | MADE IN VIETNAM", (20, 215),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (60, 60, 60), 1, cv2.LINE_AA)

        return sticker, lpn_str, sku_str

    @classmethod
    def generate_synthetic_pallet_sample(
        cls,
        bg_width: int = 1024,
        bg_height: int = 1024
    ) -> Dict[str, Any]:
        """
        Tạo ảnh kiện hàng Pallet hoàn chỉnh:
        - Nền bìa carton nâu kraft với các nét vẽ sơ đồ sản phẩm (phục vụ train chống bắt nhầm).
        - 1-4 con tem dán trắng dán lên các vị trí khác nhau kèm bounding box.
        """
        # Nền carton nâu kraft: BGR khoảng (90, 140, 185)
        carton_b = random.randint(70, 105)
        carton_g = random.randint(120, 155)
        carton_r = random.randint(165, 205)
        bg = np.full((bg_height, bg_width, 3), (carton_b, carton_g, carton_r), dtype=np.uint8)

        # Thêm các nét vẽ phác thảo sơ đồ thùng carton (Hard Negative features)
        for _ in range(random.randint(3, 7)):
            draw_x = random.randint(50, bg_width - 250)
            draw_y = random.randint(50, bg_height - 250)
            draw_w = random.randint(120, 200)
            draw_h = random.randint(120, 200)
            # Vẽ hình hộp/tủ bồn rửa sơ đồ
            cv2.rectangle(bg, (draw_x, draw_y), (draw_x + draw_w, draw_y + draw_h), (35, 45, 60), 2)
            cv2.line(bg, (draw_x, draw_y + int(draw_h * 0.4)), (draw_x + draw_w, draw_y + int(draw_h * 0.4)), (35, 45, 60), 2)
            cv2.circle(bg, (draw_x + int(draw_w * 0.3), draw_y + int(draw_h * 0.2)), 4, (35, 45, 60), -1)
            cv2.circle(bg, (draw_x + int(draw_w * 0.7), draw_y + int(draw_h * 0.2)), 4, (35, 45, 60), -1)

        # Thêm chữ in thô trên thùng carton
        cv2.putText(bg, "CAMBRIDGE 72\" DOUBLE SINK", (100, 150),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.1, (30, 40, 55), 3, cv2.LINE_AA)
        cv2.putText(bg, "BASE CABINET", (100, 200),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (30, 40, 55), 2, cv2.LINE_AA)

        # Dán 1-3 con tem nhãn trắng
        num_stickers = random.randint(1, 3)
        labels_meta = []
        for s_idx in range(num_stickers):
            sw = random.randint(260, 340)
            sh = random.randint(160, 210)
            stk_img, lpn, sku = cls.generate_synthetic_sticker_image(width=sw, height=sh)

            # Áp dụng suy giảm chất lượng thực tế (nắn nghiêng, lóa sáng, mờ nét)
            stk_distorted = cls.apply_realistic_degradation(stk_img)
            dh, dw = stk_distorted.shape[:2]

            pos_x = random.randint(int(bg_width * 0.4), max(int(bg_width * 0.4) + 10, bg_width - dw - 40))
            pos_y = random.randint(60 + s_idx * 280, min(bg_height - dh - 40, 180 + s_idx * 300))

            # Ghép vào nền carton
            bg[pos_y:pos_y+dh, pos_x:pos_x+dw] = stk_distorted
            labels_meta.append({
                "label_id": s_idx + 1,
                "bbox": [pos_x, pos_y, dw, dh],
                "gt_lpn": lpn,
                "gt_sku": sku
            })

        # Áp dụng nén ảnh toàn cục mô phỏng WebP/JPEG thực tế kho
        final_bg = cls.apply_compression(bg, quality=random.randint(45, 80))

        return {
            "image": final_bg,
            "labels": labels_meta,
            "num_labels": len(labels_meta)
        }

    @classmethod
    def apply_realistic_degradation(cls, sticker_img: np.ndarray) -> np.ndarray:
        """
        Mô phỏng các điều kiện khó khăn THỰC TẾ trong kho:
        - Xoay nghiêng & méo phối cảnh nhẹ (Perspective Transform).
        - Lóa sáng phản quang của màng co nylon (Shrink Wrap Glare).
        - Nhiễu Gaussian & mờ nét in nhiệt.
        """
        h, w = sticker_img.shape[:2]
        res = sticker_img.copy()

        # 1. Perspective / Tilt nhẹ (±8 độ)
        pts1 = np.float32([[0, 0], [w, 0], [0, h], [w, h]])
        dx1 = random.randint(-12, 12)
        dy1 = random.randint(-8, 8)
        dx2 = random.randint(-12, 12)
        dy2 = random.randint(-8, 8)
        pts2 = np.float32([[dx1, dy1], [w - dx2, dy2], [-dx1, h - dy1], [w + dx2, h - dy2]])
        M = cv2.getPerspectiveTransform(pts1, pts2)
        res = cv2.warpPerspective(res, M, (w, h), borderValue=(240, 240, 240))

        # 2. Lóa sáng dải màng co (Glare Reflection)
        if random.random() > 0.4:
            glare_mask = np.zeros((h, w), dtype=np.float32)
            gx = random.randint(30, w - 30)
            gw = random.randint(25, 60)
            cv2.line(glare_mask, (gx, 0), (gx + random.randint(-20, 20), h), 1.0, gw)
            glare_mask = cv2.GaussianBlur(glare_mask, (41, 41), 0)
            glare_3ch = np.repeat(glare_mask[:, :, np.newaxis], 3, axis=2)
            res = np.clip(res.astype(np.float32) + glare_3ch * random.randint(40, 90), 0, 255).astype(np.uint8)

        # 3. Mờ nét / Defocus nhẹ
        if random.random() > 0.5:
            k = random.choice([3, 5])
            res = cv2.GaussianBlur(res, (k, k), 0)

        return res

    @classmethod
    def apply_compression(cls, img: np.ndarray, quality: int = 65) -> np.ndarray:
        """Giả lập nén ảnh WebP/JPEG lossy nén dung lượng ở kho."""
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), max(20, min(95, quality))]
        result, encimg = cv2.imencode('.jpg', img, encode_param)
        if result:
            return cv2.imdecode(encimg, 1)
        return img

    @classmethod
    def generate_sample_metadata(cls, count: int = 10) -> List[Dict[str, Any]]:
        """Sinh danh sách metadata mẫu."""
        samples = []
        for idx in range(count):
            samples.append({
                "sample_id": f"synth_{idx+1:05d}",
                "lpn": cls.generate_random_lpn(),
                "sku": cls.generate_random_sku(),
                "batch": f"BATCH-{random.randint(1, 50):02d}",
                "pallet": f"Pallet {random.randint(1, 20)}"
            })
        return samples

    @classmethod
    def generate_tier_c_textline_crop(
        cls,
        text: str,
        target_height: int = 32,
        target_width: int = 256,
        difficulties: Optional[List[str]] = None
    ) -> np.ndarray:
        """
        Tạo ảnh text-line crop Tier C mô phỏng chính xác các trường hợp khó tại kho (Hard Cases):
        - dot-matrix simulation: ngắt nét dạng hạt ma trận kim
        - thermal_fade: chữ mờ một phần do đầu in nhiệt bị bẩn/yếu
        - glare: lóa sáng một góc
        - blur / motion_blur: mờ nét chuyển động
        - compression: nhiễu nén ảnh WebP/JPEG
        Tuyệt đối giữ nguyên vẹn 100% Ground Truth text.
        """
        clean_text = str(text or "").strip().upper()
        diffs = difficulties if difficulties is not None else random.sample(
            ["dot_matrix", "thermal_fade", "glare", "blur", "compression", "low_contrast"],
            k=random.randint(1, 3)
        )

        # Nền giấy nhãn trắng nhiệt hơi xám
        bg_val = random.randint(225, 250)
        img = np.full((target_height, target_width, 3), bg_val, dtype=np.uint8)

        # Căn chỉnh kích thước chữ
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.65
        thickness = 2
        (tw, th), baseline = cv2.getTextSize(clean_text, font, font_scale, thickness)

        if tw > target_width - 16:
            font_scale *= (target_width - 24) / max(1, tw)
            (tw, th), baseline = cv2.getTextSize(clean_text, font, font_scale, thickness)

        tx = max(6, (target_width - tw) // 2 + random.randint(-4, 4))
        ty = max(target_height - 6, (target_height + th) // 2 + random.randint(-2, 2))

        # Màu chữ: từ đen tuyền đến xám đậm
        text_color = (random.randint(10, 35), random.randint(10, 35), random.randint(10, 35))
        cv2.putText(img, clean_text, (tx, ty), font, font_scale, text_color, thickness, cv2.LINE_AA)

        # Áp dụng các hiệu ứng Hard Case theo danh mục
        if "dot_matrix" in diffs:
            # Mô phỏng in kim bằng cách tạo mặt nạ lưới các chấm rời rạc
            grid_mask = np.ones((target_height, target_width), dtype=np.uint8)
            grid_mask[::2, ::2] = 0  # Bỏ cách quãng chấm
            for c in range(3):
                # Thay thế các điểm chấm bằng màu nền
                img[:, :, c] = np.where(grid_mask == 0, np.clip(img[:, :, c] + random.randint(30, 70), 0, 255), img[:, :, c])

        if "thermal_fade" in diffs:
            # Mô phỏng mờ nhiệt: giảm độ tương phản ở nửa trái hoặc nửa phải
            fade_grad = np.linspace(0.4, 1.0, target_width).astype(np.float32)
            if random.random() > 0.5:
                fade_grad = np.flip(fade_grad)
            for c in range(3):
                img[:, :, c] = np.clip(img[:, :, c].astype(np.float32) * fade_grad + (1.0 - fade_grad) * bg_val, 0, 255).astype(np.uint8)

        if "low_contrast" in diffs:
            # Giảm độ tương phản tổng thể
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            low_c = (gray.astype(np.float32) * 0.4 + bg_val * 0.6).astype(np.uint8)
            img = cv2.cvtColor(low_c, cv2.COLOR_GRAY2BGR)

        if "glare" in diffs:
            gx = random.randint(10, target_width - 10)
            gy = random.randint(5, target_height - 5)
            glare_patch = np.zeros((target_height, target_width), dtype=np.float32)
            cv2.circle(glare_patch, (gx, gy), random.randint(15, 30), 1.0, -1)
            glare_patch = cv2.GaussianBlur(glare_patch, (21, 21), 0)
            for c in range(3):
                img[:, :, c] = np.clip(img[:, :, c].astype(np.float32) + glare_patch * random.randint(40, 90), 0, 255).astype(np.uint8)

        if "blur" in diffs:
            k = random.choice([3, 5])
            img = cv2.GaussianBlur(img, (k, k), 0)

        if "compression" in diffs:
            img = cls.apply_compression(img, quality=random.randint(35, 60))

        return img


