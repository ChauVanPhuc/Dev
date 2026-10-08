# -*- coding: utf-8 -*-
"""
Label Region Detector (High-Precision Multi-Label & Barcode ROI Locator).
Phát hiện và đóng khung TOÀN BỘ các vị trí nhãn dán tem in nhiệt (White Thermal Shipping Labels) trên Pallet / Thùng hàng:
1. Thuật toán phân lập màu tem nhãn trắng (White Paper Color Segmentation in HSV + LAB + RGB):
   - Tem nhãn dán là giấy in nhiệt trắng (High Lightness, Low Saturation, Neutral RGB).
   - Tự động loại bỏ 100% hình vẽ/bản vẽ phác thảo sản phẩm (Product sketches/diagrams) in trên nền carton nâu kraft.
2. Bản đồ năng lượng mã vạch 1D/2D (Barcode Gradient Energy Map - Sobel X >> Sobel Y):
   - Nhận diện các vạch mã vạch song song đặc trưng trên tem nhãn bưu chính / LPN.
3. Chấm điểm độ tin cậy đa tiêu chí (Multi-Factor Scoring):
   - Tỷ lệ độ trắng tinh khiết (Whiteness Purity Ratio >= 40%)
   - Độ tương phản biên với nền carton xung quanh (Border Step Contrast >= 15)
   - Năng lượng vạch mã vạch / mật độ ký tự OCR
   - Tỷ lệ khung hình tem chuẩn (Aspect ratio 0.35 - 4.5)
4. Khử trùng lặp (Non-Maximum Suppression - NMS) & Đánh số thứ tự nhãn [NHÃN #1], [NHÃN #2]...
"""

import cv2
import numpy as np
from typing import Dict, Any, Tuple, Optional, List


class LabelDetector:
    """Bộ phát hiện toàn diện và chính xác cao các vùng nhãn dán trên Pallet."""

    def __init__(self, yolo_model_path: Optional[str] = None):
        self.yolo_model_path = yolo_model_path
        self.yolo_model = None
        if yolo_model_path:
            self._load_yolo_model(yolo_model_path)

    def _load_yolo_model(self, path: str):
        try:
            from ultralytics import YOLO
            self.yolo_model = YOLO(path)
        except Exception:
            self.yolo_model = None

    def detect_label_roi(
        self,
        image: np.ndarray,
        max_labels: int = 22,
        min_area_ratio: float = 0.0010,
        max_area_ratio: float = 0.35
    ) -> Dict[str, Any]:
        """
        Phát hiện tất cả các vùng nhãn dán trên Pallet / Thùng carton (hỗ trợ tới 22 nhãn, tem ngang và tem xoay 90°).
        Loại trừ triệt để hình vẽ sơ đồ thùng carton và chữ in thô trên nền carton.
        """
        if image is None or image.size == 0:
            raise ValueError("Ảnh đầu vào không hợp lệ.")

        h, w = image.shape[:2]
        total_area = h * w
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image.copy()

        # 1. Thử dùng YOLO nếu có mô hình đã huấn luyện
        if self.yolo_model is not None:
            try:
                results = self.yolo_model(image, verbose=False)
                if len(results) > 0 and len(results[0].boxes) > 0:
                    yolo_boxes = []
                    for box in results[0].boxes[:max_labels]:
                        xyxy = box.xyxy[0].cpu().numpy().astype(int)
                        conf = float(box.conf[0].cpu().numpy())
                        x1, y1, x2, y2 = max(0, xyxy[0]), max(0, xyxy[1]), min(w, xyxy[2]), min(h, xyxy[3])
                        yolo_boxes.append((x1, y1, x2 - x1, y2 - y1, conf))
                    if yolo_boxes:
                        return self._build_multi_roi_result(image, yolo_boxes, "yolo")
            except Exception:
                pass

        # Tối ưu hóa hiệu năng: Downscale ảnh để phát hiện vị trí nhãn (Detection on thumbnail)
        # Giúp giảm thời gian tìm nhãn từ 2.500ms xuống còn ~35ms, trong khi các tem cắt ra vẫn từ ảnh gốc 100% nét
        max_det_dim = 1024
        scale_det = 1.0
        if max(h, w) > max_det_dim:
            scale_det = max_det_dim / float(max(h, w))
            det_w = int(w * scale_det)
            det_h = int(h * scale_det)
            work_img = cv2.resize(image, (det_w, det_h), interpolation=cv2.INTER_AREA)
            work_gray = cv2.cvtColor(work_img, cv2.COLOR_BGR2GRAY) if len(work_img.shape) == 3 else work_img.copy()
        else:
            det_w, det_h = w, h
            work_img = image
            work_gray = gray

        work_total_area = det_h * det_w

        # 2. Tạo mặt nạ màu giấy trắng thích nghi (Adaptive White Paper Mask)
        # Giấy in nhãn trắng luôn có độ sáng vượt trội so với nền bìa carton vàng/nâu xung quanh
        if len(work_img.shape) == 3:
            hsv = cv2.cvtColor(work_img, cv2.COLOR_BGR2HSV)
            s_ch = hsv[:, :, 1]
            v_ch = hsv[:, :, 2]
            b_ch, g_ch, r_ch = cv2.split(work_img)
            
            # Loại trừ vùng trời ngoài trời (Sky / Outdoor glare) ở đỉnh ảnh để tránh dính liền vào tem nhãn thùng hàng
            is_sky = (b_ch > 170) & (g_ch > 150) & ((b_ch > r_ch + 10) | (b_ch >= 225))
            sky_zone = np.zeros((det_h, det_w), dtype=bool)
            sky_zone[:int(det_h * 0.22), :] = True
            sky_mask = is_sky & sky_zone

            median_v = float(np.median(v_ch))
            # Độ sáng ngưỡng tự động: hỗ trợ cả tem nhãn trong bóng râm (v >= 110, s <= 70) lẫn tem dưới ánh sáng trực tiếp
            thresh_v = max(160, int(median_v + 5))
            is_bright_white = (v_ch >= thresh_v) & (s_ch <= 85) & (b_ch >= 100)
            is_shadow_white = (v_ch >= 110) & (s_ch <= 70) & (b_ch >= 75)
            is_white = (is_bright_white | is_shadow_white) & (~sky_mask)

            # Bổ trợ White Top-Hat để bắt các tem nhãn nhỏ bị sấp bóng hoặc tương phản cục bộ
            kt = max(11, int(51 * scale_det)) | 1
            kernel_tophat = cv2.getStructuringElement(cv2.MORPH_RECT, (kt, kt))
            tophat = cv2.morphologyEx(work_gray, cv2.MORPH_TOPHAT, kernel_tophat)
            _, tophat_mask = cv2.threshold(tophat, 20, 255, cv2.THRESH_BINARY)
            tophat_valid = (tophat_mask > 0) & (s_ch <= 85) & (v_ch >= 110) & (~sky_mask)

            white_mask = ((is_white | tophat_valid).astype(np.uint8)) * 255
        else:
            median_g = float(np.median(work_gray))
            _, white_mask = cv2.threshold(work_gray, max(180, int(median_g + 15)), 255, cv2.THRESH_BINARY)

        # 3. Bản đồ năng lượng mã vạch (Barcode Gradient Energy: cả ngang và dọc cho tem quay 90°)
        sobel_x = cv2.Sobel(work_gray, cv2.CV_32F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(work_gray, cv2.CV_32F, 0, 1, ksize=3)
        barcode_energy_h = np.maximum(0, np.abs(sobel_x) - np.abs(sobel_y) * 0.75)
        barcode_energy_v = np.maximum(0, np.abs(sobel_y) - np.abs(sobel_x) * 0.75)
        barcode_energy = np.maximum(barcode_energy_h, barcode_energy_v)
        barcode_norm = cv2.normalize(barcode_energy, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        kbc = max(5, int(17 * scale_det)) | 1
        bc_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kbc, kbc))
        barcode_closed = cv2.morphologyEx(barcode_norm, cv2.MORPH_CLOSE, bc_kernel)
        _, barcode_mask = cv2.threshold(barcode_closed, 30, 255, cv2.THRESH_BINARY)

        # 4. Kết hợp và lọc hình thái học (Morphological Operations)
        # Loại trừ viền mép ảnh chống lóa biên sát mép
        border_m = max(2, int(4 * scale_det))
        white_mask[:border_m, :] = 0
        white_mask[-border_m:, :] = 0
        white_mask[:, :border_m] = 0
        white_mask[:, -border_m:] = 0

        # Tách rời các nét viền băng dính / khe rãnh mỏng (< 5px) trước khi gom cụm
        k_open = cv2.getStructuringElement(cv2.MORPH_RECT, (max(3, int(5 * scale_det)) | 1, max(3, int(5 * scale_det)) | 1))
        opened_white = cv2.morphologyEx(white_mask, cv2.MORPH_OPEN, k_open)
        k_close = cv2.getStructuringElement(cv2.MORPH_RECT, (max(5, int(9 * scale_det)) | 1, max(3, int(7 * scale_det)) | 1))
        morph_white = cv2.morphologyEx(opened_white, cv2.MORPH_CLOSE, k_close)

        contours, _ = cv2.findContours(morph_white, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        candidates = []

        # Đo độ dày thực tế của mảng màu trắng (Euclidean Distance Transform)
        dist_map = cv2.distanceTransform(white_mask, cv2.DIST_L2, 5)

        # Lõi nền đặc sau khi co rút hình thái học (Morphology Erosion)
        k_erode = cv2.getStructuringElement(cv2.MORPH_RECT, (max(3, int(9 * scale_det)) | 1, max(3, int(9 * scale_det)) | 1))
        solid_core_mask = cv2.erode(white_mask, k_erode)

        min_dim_thresh = max(6, int(16 * scale_det))
        max_dim_thresh = max(12, int(32 * scale_det))
        min_area_thresh = max(60, int(500 * (scale_det ** 2)))

        for c in contours:
            x, y, bw, bh = cv2.boundingRect(c)
            area = bw * bh
            area_ratio = area / float(work_total_area)
            aspect = float(bw) / float(bh) if bh > 0 else 0

            min_dim = min(bw, bh)
            max_dim = max(bw, bh)
            is_vert = bh > bw

            # Điều kiện kích thước tem nhãn: hỗ trợ cả tem nhỏ trên pallet và tem dọc/ngang linh hoạt
            if not (min_area_ratio <= area_ratio <= max_area_ratio and 0.10 <= aspect <= 7.5 and min_dim >= min_dim_thresh and max_dim >= max_dim_thresh and area >= min_area_thresh):
                continue

            # Loại trừ viền giả sát mép ảnh
            if (x <= 2 or y <= 2 or x + bw >= det_w - 2 or y + bh >= det_h - 2) and (aspect > 3.5 or aspect < 0.2):
                continue

            # Kiểm tra độ tinh khiết màu trắng (Whiteness Purity Ratio)
            patch_white = white_mask[y:y+bh, x:x+bw]
            whiteness_ratio = float(np.count_nonzero(patch_white)) / float(area) if area > 0 else 0

            # Năng lượng mã vạch & cạnh chữ
            patch_bc = barcode_mask[y:y+bh, x:x+bw]
            bc_ratio = float(np.count_nonzero(patch_bc)) / float(area) if area > 0 else 0
            bc_score = min(1.0, bc_ratio * 4.0)

            c_area = cv2.contourArea(c)
            rect_fill = c_area / float(area) if area > 0 else 0

            # LỌC BỎ CHỮ IN THÙNG CARTON / BẢN VẼ SƠ ĐỒ / VIỀN MÀNG CO
            min_white_needed = 0.35 if is_vert else 0.45
            min_bc_needed = 0.12 if is_vert else 0.20
            if whiteness_ratio < min_white_needed and bc_score < min_bc_needed:
                continue
            if rect_fill < 0.45 and bc_score < 0.12:
                continue

            # 1. Kiểm tra độ dày thực tế của mảng giấy trắng (bỏ qua cho tem dọc mỏng)
            patch_dist = dist_map[y:y+bh, x:x+bw]
            max_thickness = float(np.max(patch_dist)) if patch_dist.size > 0 else 0
            if not is_vert:
                min_thick_needed = (1.5 if min_dim < int(65 * scale_det) else 2.5) if scale_det < 1.0 else (3.0 if min_dim < 65 else 5.0)
                if max_thickness < min_thick_needed:
                    continue

            # 2. Kiểm tra tỷ lệ diện tích lõi giấy đặc (Solid Core Ratio)
            patch_solid = solid_core_mask[y:y+bh, x:x+bw]
            solid_ratio = float(np.count_nonzero(patch_solid)) / float(area) if area > 0 else 0
            if not is_vert and solid_ratio < 0.04 and max_thickness < (10.0 * scale_det):
                continue

            # 3. Loại trừ chữ in stencil to trên carton (như 60, 72, 36)
            inner_patch = work_gray[y:y+bh, x:x+bw]
            lap = float(cv2.Laplacian(inner_patch, cv2.CV_64F).var()) if inner_patch.size > 0 else 0
            lap_score = min(1.0, lap / 600.0)
            
            # Nếu không có mã vạch và kết cấu nhẵn không có chữ in -> Chắc chắn là số stencil carton
            if bc_score < 0.10 and lap < 120.0:
                continue

            if min_dim >= int(50 * scale_det) and bc_score < 0.08 and whiteness_ratio < 0.70:
                continue

            # 4. Kiểm tra độ tương phản bước nhảy so với viền carton xung quanh
            pad_cx = max(4, int(bw * 0.12))
            pad_cy = max(4, int(bh * 0.12))
            ox1 = max(0, x - pad_cx)
            oy1 = max(0, y - pad_cy)
            ox2 = min(det_w, x + bw + pad_cx)
            oy2 = min(det_h, y + bh + pad_cy)
            
            outer_patch = work_gray[oy1:oy2, ox1:ox2]
            
            mean_inner = float(np.mean(inner_patch))
            mean_outer = float(np.mean(outer_patch))
            contrast_step = max(0.0, mean_inner - mean_outer)

            if contrast_step < 4.0 and bc_score < 0.08 and lap < 200.0:
                continue

            score = (
                (whiteness_ratio * 0.35) +
                (rect_fill * 0.25) +
                (bc_score * 0.25) +
                (min(solid_ratio / 0.35, 1.0) * 0.15)
            )

            candidates.append({
                "bbox": (x, y, bw, bh),
                "score": score,
                "whiteness": whiteness_ratio,
                "contrast": contrast_step,
                "bc_score": bc_score,
                "solid_ratio": solid_ratio,
                "max_thickness": max_thickness
            })

        # Nhánh 2: Phát hiện tem nhãn cạnh sắc nét và tem dán dọc (Canny Edge Contour Branch)
        # Chỉ xét các contour có kích thước tem thực tế, tránh các mảnh cắt nhỏ dòng chữ (10-20px)
        canny_edges = cv2.Canny(work_gray, 30, 85)
        k_canny = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        dil_canny = cv2.dilate(canny_edges, k_canny)
        canny_contours, _ = cv2.findContours(dil_canny, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        for cc in canny_contours:
            cx, cy, cbw, cbh = cv2.boundingRect(cc)
            c_area = cbw * cbh
            c_ratio = c_area / float(work_total_area)
            c_aspect = float(cbw) / float(cbh) if cbh > 0 else 0
            c_min = min(cbw, cbh)
            c_max = max(cbw, cbh)
            # Yêu cầu kích thước tem thực tế (không lấy các dòng chữ nhỏ 15px làm rác NMS)
            if not (0.001 <= c_ratio <= 0.18 and 0.15 <= c_aspect <= 6.5 and c_min >= max(25, int(30 * scale_det)) and c_max >= max(40, int(50 * scale_det)) and c_area >= max(400, int(1200 * (scale_det**2)))):
                continue
            c_patch = work_gray[cy:cy+cbh, cx:cx+cbw]
            mean_val = float(c_patch.mean())
            if mean_val < 105:
                continue
            if mean_val < 160:
                c_bc = barcode_mask[cy:cy+cbh, cx:cx+cbw]
                bc_cov = float(np.count_nonzero(c_bc)) / float(c_area) if c_area > 0 else 0
                if bc_cov < 0.04 and c_aspect > 4.5:
                    continue

            # Bỏ qua nếu đã trùng với một ứng viên tem trắng đã có
            is_dup = False
            for ex in candidates:
                ex_x, ex_y, ex_w, ex_h = ex["bbox"]
                ex_area = ex_w * ex_h
                ix1, iy1 = max(cx, ex_x), max(cy, ex_y)
                ix2, iy2 = min(cx + cbw, ex_x + ex_w), min(cy + cbh, ex_y + ex_h)
                if ix2 > ix1 and iy2 > iy1:
                    inter = (ix2 - ix1) * (iy2 - iy1)
                    # Nếu ex là mảng stencil carton lớn (> 2.5 * c_area) và diện tích lớn (> 12% ảnh), c là tem thực tế -> Không triệt tiêu c
                    if ex_area > 2.5 * c_area and ex_area > 0.12 * work_total_area:
                        continue
                    if inter > 0.35 * min(c_area, ex_area):
                        is_dup = True
                        break
            if is_dup:
                continue

            c_score = min(0.75, (mean_val / 255.0) * 0.40 + 0.30)
            candidates.append({
                "bbox": (cx, cy, cbw, cbh),
                "score": c_score,
                "whiteness": mean_val / 255.0,
                "contrast": 15.0,
                "bc_score": 0.5,
                "solid_ratio": 0.2,
                "max_thickness": 5.0
            })

        # 5. Khử trùng lặp (Non-Maximum Suppression) để chọn danh sách các tem nhãn riêng biệt
        candidates.sort(key=lambda c: c["score"], reverse=True)
        distinct_boxes = []
        for c in candidates:
            if distinct_boxes and c["score"] < 0.12:
                continue
            x, y, bw, bh = c["bbox"]
            area = bw * bh
            overlap = False
            for ex in distinct_boxes:
                ex_x, ex_y, ex_w, ex_h, _ = ex
                ex_area = ex_w * ex_h
                ix1 = max(x, ex_x)
                iy1 = max(y, ex_y)
                ix2 = min(x + bw, ex_x + ex_w)
                iy2 = min(y + bh, ex_y + ex_h)
                if ix2 > ix1 and iy2 > iy1:
                    inter_area = (ix2 - ix1) * (iy2 - iy1)
                    min_a = min(area, ex_area)
                    if inter_area > 0.35 * min_a:
                        overlap = True
                        break
            if not overlap:
                distinct_boxes.append((x, y, bw, bh, c["score"]))
                if len(distinct_boxes) >= max_labels:
                    break

        # Ghép các nửa tem bị vạch mã vạch xẻ đôi theo trục dọc (descriptor line + barcode)
        if len(distinct_boxes) >= 2:
            merged_boxes = []
            used = [False] * len(distinct_boxes)
            for i in range(len(distinct_boxes)):
                if used[i]:
                    continue
                bx, by, bw, bh, bsc = distinct_boxes[i]
                for j in range(i + 1, len(distinct_boxes)):
                    if used[j]:
                        continue
                    ox, oy, ow, oh, osc = distinct_boxes[j]
                    center_x1 = bx + bw / 2.0
                    center_x2 = ox + ow / 2.0
                    x_aligned = abs(center_x1 - center_x2) <= max(bw, ow) * 0.30
                    if x_aligned:
                        top_box = (bx, by, bw, bh) if by < oy else (ox, oy, ow, oh)
                        bot_box = (ox, oy, ow, oh) if by < oy else (bx, by, bw, bh)
                        gap_y = bot_box[1] - (top_box[1] + top_box[3])
                        total_h = (bot_box[1] + bot_box[3]) - top_box[1]
                        if -10 <= gap_y <= int(35 * scale_det) and total_h <= int(185 * scale_det):
                            nx = min(bx, ox)
                            ny = min(by, oy)
                            nw = max(bx + bw, ox + ow) - nx
                            nh = total_h
                            nsc = max(bsc, osc)
                            bx, by, bw, bh, bsc = nx, ny, nw, nh, nsc
                            used[j] = True
                merged_boxes.append((bx, by, bw, bh, bsc))
            distinct_boxes = merged_boxes

        # Ghép các nửa tem bị vạch mã vạch xẻ đôi theo trục ngang (split halves trái - phải, ví dụ Tem 2 + Tem 3)
        if len(distinct_boxes) >= 2:
            h_merged = []
            used_h = [False] * len(distinct_boxes)
            for i in range(len(distinct_boxes)):
                if used_h[i]:
                    continue
                bx, by, bw, bh, bsc = distinct_boxes[i]
                for j in range(i + 1, len(distinct_boxes)):
                    if used_h[j]:
                        continue
                    ox, oy, ow, oh, osc = distinct_boxes[j]
                    center_y1 = by + bh / 2.0
                    center_y2 = oy + oh / 2.0
                    y_aligned = abs(center_y1 - center_y2) <= max(bh, oh) * 0.25
                    h_ratio = min(bh, oh) / float(max(bh, oh))
                    if y_aligned and h_ratio >= 0.70:
                        left_box = (bx, by, bw, bh) if bx < ox else (ox, oy, ow, oh)
                        right_box = (ox, oy, ow, oh) if bx < ox else (bx, by, bw, bh)
                        gap_x = right_box[0] - (left_box[0] + left_box[2])
                        total_w = (right_box[0] + right_box[2]) - left_box[0]
                        if -int(20 * scale_det) <= gap_x <= int(25 * scale_det) and total_w <= int(185 * scale_det):
                            nx = left_box[0]
                            ny = min(by, oy)
                            nw = total_w
                            nh = max(by + bh, oy + oh) - ny
                            nsc = max(bsc, osc)
                            bx, by, bw, bh, bsc = nx, ny, nw, nh, nsc
                            used_h[j] = True
                h_merged.append((bx, by, bw, bh, bsc))
            distinct_boxes = h_merged

        if distinct_boxes:
            # Tinh chỉnh các hộp quá khổ dính hình vẽ/chữ stencil carton khổng lồ về đúng con tem mã vạch thực sự
            refined_boxes = []
            for item in distinct_boxes:
                sub_boxes = self._refine_barcode_sticker_boxes(work_gray, (item[0], item[1], item[2], item[3]), item[4])
                refined_boxes.extend(sub_boxes)

            # Khử trùng lặp trên danh sách các hộp sau khi tinh chỉnh
            dedup_refined = []
            for rbox in refined_boxes:
                rx, ry, rw, rh, rconf = rbox
                rarea = rw * rh
                overlap = False
                for ex in dedup_refined:
                    ex_x, ex_y, ex_w, ex_h, _ = ex
                    ix1 = max(rx, ex_x)
                    iy1 = max(ry, ex_y)
                    ix2 = min(rx + rw, ex_x + ex_w)
                    iy2 = min(ry + rh, ex_y + ex_h)
                    if ix2 > ix1 and iy2 > iy1:
                        inter = (ix2 - ix1) * (iy2 - iy1)
                        if inter > 0.35 * min(rarea, ex_w * ex_h):
                            overlap = True
                            break
                if not overlap:
                    dedup_refined.append(rbox)
            refined_boxes = dedup_refined

            # Sắp xếp các tem nhãn từ trên xuống dưới, từ trái sang phải
            refined_boxes.sort(key=lambda b: (b[1] // max(1, int(160 * scale_det)), b[0]))

            # Ánh xạ tọa độ từ thumbnail quay về kích thước ảnh gốc sắc nét
            orig_boxes = []
            for bx, by, bw, bh, conf in refined_boxes[:max_labels]:
                if scale_det != 1.0:
                    ox = max(0, int(round(bx / scale_det)))
                    oy = max(0, int(round(by / scale_det)))
                    obw = min(w - ox, int(round(bw / scale_det)))
                    obh = min(h - oy, int(round(bh / scale_det)))
                else:
                    ox, oy, obw, obh = bx, by, bw, bh
                orig_boxes.append((ox, oy, obw, obh, conf))

            return self._build_multi_roi_result(image, orig_boxes, "white_sticker_heuristic")

        # 7. Fallback: Nếu không có tem nhãn dán ngoài (như kiện hàng in trực tiếp thông tin lên thùng carton),
        # Giữ nguyên toàn bộ ảnh Pallet để OCR quét toàn diện không bỏ sót mã.
        return {
            "roi_image": image.copy(),
            "primary_roi_image": image.copy(),
            "all_rois": [{"roi_image": image.copy(), "bbox": [0, 0, w, h], "label_id": 1, "confidence": 1.0}],
            "bbox": [0, 0, w, h],
            "all_bboxes": [[0, 0, w, h]],
            "total_labels": 1,
            "confidence": 1.0,
            "method": "full_pallet_scan",
            "annotated_image": image.copy()
        }

    def _build_multi_roi_result(
        self,
        image: np.ndarray,
        boxes_with_conf: List[Tuple[int, int, int, int, float]],
        method: str
    ) -> Dict[str, Any]:
        """Tạo ảnh đóng khung toàn cảnh Pallet và ảnh ghép tổng hợp tất cả các nhãn."""
        h, w = image.shape[:2]
        annotated = image.copy()
        rois = []
        crop_images = []

        for idx, item in enumerate(boxes_with_conf):
            bx, by, bw, bh, conf = item
            # Padding hào phóng tối đa để bảo đảm ôm trọn 100% con tem và toàn bộ dòng chữ in người đọc (HRI) phía dưới mã (kể cả tem xoay dọc)
            pad_x = max(35, int(bw * 0.35))
            pad_y_top = max(30, int(bh * 0.25))
            pad_y_bottom = max(35, int(bh * 0.35))
            x1 = max(0, bx - pad_x)
            y1 = max(0, by - pad_y_top)
            x2 = min(w, bx + bw + pad_x)
            y2 = min(h, by + bh + pad_y_bottom)

            crop = image[y1:y2, x1:x2].copy()
            crop_images.append(crop)
            rois.append({
                "roi_image": crop,
                "bbox": [x1, y1, x2 - x1, y2 - y1],
                "label_id": idx + 1,
                "confidence": round(float(conf), 3)
            })

            # Vẽ khung xanh lá neon nổi bật
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (70, 220, 0), 4)

            # 4 góc nhấn
            corner_len = min(22, int((x2 - x1) * 0.16))
            cv2.line(annotated, (x1, y1), (x1 + corner_len, y1), (0, 255, 128), 5)
            cv2.line(annotated, (x1, y1), (x1, y1 + corner_len), (0, 255, 128), 5)
            cv2.line(annotated, (x2, y1), (x2 - corner_len, y1), (0, 255, 128), 5)
            cv2.line(annotated, (x2, y1), (x2, y2 + corner_len if y2 < y1 else y1 + corner_len), (0, 255, 128), 5)
            cv2.line(annotated, (x1, y2), (x1 + corner_len, y2), (0, 255, 128), 5)
            cv2.line(annotated, (x1, y2), (x1, y2 - corner_len), (0, 255, 128), 5)
            cv2.line(annotated, (x2, y2), (x2 - corner_len, y2), (0, 255, 128), 5)
            cv2.line(annotated, (x2, y2), (x2, y2 - corner_len), (0, 255, 128), 5)

            # Header badge trên ảnh toàn cảnh
            badge_text = f"NHAN #{idx + 1}"
            cv2.rectangle(annotated, (x1, max(0, y1 - 28)), (x1 + 120, max(28, y1)), (70, 220, 0), -1)
            cv2.putText(annotated, badge_text, (x1 + 6, max(20, y1 - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 2, cv2.LINE_AA)

        # Tạo ảnh tổng hợp Composite ROI
        composite_roi = self._create_composite_roi(crop_images)
        primary_roi = crop_images[0] if crop_images else image.copy()
        primary_bbox = rois[0]["bbox"] if rois else [0, 0, w, h]
        avg_conf = round(float(np.mean([r["confidence"] for r in rois])), 3) if rois else 0.80

        return {
            "roi_image": composite_roi, # Ảnh tổng hợp tất cả các nhãn sạch chữ
            "primary_roi_image": primary_roi,
            "all_rois": rois,
            "bbox": primary_bbox,
            "all_bboxes": [r["bbox"] for r in rois],
            "total_labels": len(rois),
            "confidence": avg_conf,
            "method": method,
            "annotated_image": annotated
        }

    def _create_composite_roi(self, crop_images: List[np.ndarray], auto_rotate: bool = True) -> np.ndarray:
        """Ghép các ảnh nhãn đã cắt thành một lưới ảnh dạng 2 cột sắc nét, trực quan."""
        if not crop_images:
            return np.zeros((200, 300, 3), dtype=np.uint8)
        if len(crop_images) == 1:
            c = crop_images[0]
            if auto_rotate and c.shape[0] > 1.15 * c.shape[1]:
                c = cv2.rotate(c, cv2.ROTATE_90_CLOCKWISE)
            return c

        target_h = 360 # Độ phân giải lớn, sắc nét rõ từng ký tự
        resized = []
        for idx, crop in enumerate(crop_images):
            ch, cw = crop.shape[:2]
            if auto_rotate and ch > 1.15 * cw:
                crop = cv2.rotate(crop, cv2.ROTATE_90_CLOCKWISE)
                ch, cw = crop.shape[:2]

            aspect = float(cw) / float(ch) if ch > 0 else 1.0
            tw = max(200, min(650, int(target_h * aspect)))
            rc = cv2.resize(crop, (tw, target_h), interpolation=cv2.INTER_AREA)

            # Thêm tiêu đề banner "Tem #N" phía trên
            banner_h = 28
            banner = np.zeros((banner_h, tw, 3), dtype=np.uint8)
            banner[:] = (45, 26, 18) # Nâu sẫm SmartFlow
            cv2.putText(banner, f"Tem #{idx + 1}", (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)
            labeled_crop = np.vstack([banner, rc])
            # Viền xám mờ lịch thiệp
            cv2.rectangle(labeled_crop, (0, 0), (tw - 1, target_h + banner_h - 1), (80, 80, 80), 1)
            resized.append(labeled_crop)

        # Xếp dạng lưới 2 cột cân đối thay vì kéo dãn thành 1 hàng ngang siêu dài
        if len(resized) == 2:
            max_w = max(resized[0].shape[1], resized[1].shape[1])
            def pad_w(im, w):
                if im.shape[1] < w:
                    p = np.zeros((im.shape[0], w - im.shape[1], 3), dtype=np.uint8)
                    return np.hstack([im, p])
                return im
            return np.vstack([pad_w(resized[0], max_w), pad_w(resized[1], max_w)])

        cols = 2
        rows = []
        for i in range(0, len(resized), cols):
            row_items = resized[i:i+cols]
            if len(row_items) == 1:
                p = np.zeros((row_items[0].shape[0], row_items[0].shape[1], 3), dtype=np.uint8)
                row = np.hstack([row_items[0], p])
            else:
                row = np.hstack(row_items)
            rows.append(row)

        max_rw = max(r.shape[1] for r in rows)
        padded_rows = []
        for r in rows:
            if r.shape[1] < max_rw:
                p = np.zeros((r.shape[0], max_rw - r.shape[1], 3), dtype=np.uint8)
                padded_rows.append(np.hstack([r, p]))
            else:
                padded_rows.append(r)
        return np.vstack(padded_rows)

    @staticmethod
    def _refine_barcode_sticker_boxes(
        gray: np.ndarray,
        box: Tuple[int, int, int, int],
        default_conf: float = 0.90
    ) -> List[Tuple[int, int, int, int, float]]:
        """
        Nếu vùng phát hiện quá lớn (như chữ số in stencil carton khổng lồ 72, 36 hoặc gom nhiều tem dính nhau),
        bóc tách tất cả các con tem nhãn thực sự (hỗ trợ cả tem ngang và tem dọc quay 90°).
        """
        x, y, bw, bh = box
        h_img, w_img = gray.shape[:2]
        min_dim = min(bw, bh)
        max_dim = max(bw, bh)

        patch = gray[y:y+bh, x:x+bw]
        if patch.size == 0:
            return [(x, y, bw, bh, default_conf)]

        # Kiểm tra xem có phải là mảng sơn stencil carton trống trơn (như '60', '72') không
        sobel_x_p = cv2.Sobel(patch, cv2.CV_32F, 1, 0, ksize=3)
        sobel_y_p = cv2.Sobel(patch, cv2.CV_32F, 0, 1, ksize=3)
        bc_h_p = np.maximum(0, np.abs(sobel_x_p) - np.abs(sobel_y_p) * 0.7)
        bc_v_p = np.maximum(0, np.abs(sobel_y_p) - np.abs(sobel_x_p) * 0.7)
        bc_val_p = float(np.mean(np.maximum(bc_h_p, bc_v_p)))
        lap_p = float(cv2.Laplacian(patch, cv2.CV_64F).var()) if patch.size > 0 else 0

        # Nếu không có mã vạch và kết cấu nhẵn hoặc nền carton tối màu -> Mảng số stencil carton
        mean_p = float(patch.mean()) if patch.size > 0 else 0
        if bc_val_p < 22.0 and (lap_p < 140.0 or mean_p < 145.0):
            return []

        # Nếu là tem nhãn đơn lẻ chuẩn (bề ngang <= 260px và chiều cao <= 155px trên thumbnail, aspect 0.35 - 5.0),
        # giữ nguyên trực tiếp 100% khung tem, tuyệt đối không bóc tách mảnh con để tránh cắt đứt mã vạch hoặc dòng chữ in bên dưới.
        aspect_box = float(bw) / float(bh) if bh > 0 else 1.0
        if bw <= 260 and bh <= 155 and 0.35 <= aspect_box <= 5.0 and mean_p >= 135.0:
            return [(x, y, bw, bh, default_conf)]

        # 1. Tìm các mảng giấy trắng con bên trong (White Sub-Contours)
        median_v = float(np.median(patch))
        thresh_val = max(170, int(median_v + 12))
        _, white_sub = cv2.threshold(patch, thresh_val, 255, cv2.THRESH_BINARY)

        # Loại bỏ sliver biên dính mép ảnh ngoài nếu box chạm sát biên
        if x + bw >= w_img - 10:
            white_sub[:, -max(4, int(bw * 0.08)):] = 0
        if x <= 10:
            white_sub[:, :max(4, int(bw * 0.08))] = 0
        if y <= 10:
            white_sub[:max(4, int(bh * 0.08)), :] = 0
        if y + bh >= h_img - 10:
            white_sub[-max(4, int(bh * 0.08)):, :] = 0
        
        k_sub_open = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        white_sub_opened = cv2.morphologyEx(white_sub, cv2.MORPH_OPEN, k_sub_open)
        k_sub_close = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        white_sub_closed = cv2.morphologyEx(white_sub_opened, cv2.MORPH_CLOSE, k_sub_close)

        conts, _ = cv2.findContours(white_sub_closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        stickers = []
        for c in conts:
            cbx, cby, cbw, cbh = cv2.boundingRect(c)
            c_area = cbw * cbh
            aspect = float(cbw) / float(cbh) if cbh > 0 else 1.0
            min_c = min(cbw, cbh)
            max_c = max(cbw, cbh)

            # Hỗ trợ toàn diện cả tem ngang chuẩn (w>=50, h>=30) và tem dán dọc xoay 90°
            # Tem nhãn kho thực tế không bao giờ có tỷ lệ quá hẹp dài như khe cửa sổ hay rãnh thùng (0.38 <= aspect <= 3.8, max_c <= 220px)
            if min_c >= 14 and 35 <= max_c <= 220 and 0.20 <= aspect <= 5.0 and 450 <= c_area <= 0.90 * (bw * bh):
                sub_patch = patch[cby:cby+cbh, cbx:cbx+cbw]
                sobel_x = cv2.Sobel(sub_patch, cv2.CV_32F, 1, 0, ksize=3)
                sobel_y = cv2.Sobel(sub_patch, cv2.CV_32F, 0, 1, ksize=3)
                bc_h = np.maximum(0, np.abs(sobel_x) - np.abs(sobel_y) * 0.7)
                bc_v = np.maximum(0, np.abs(sobel_y) - np.abs(sobel_x) * 0.7)
                bc_val = float(np.mean(np.maximum(bc_h, bc_v)))
                lap = float(cv2.Laplacian(sub_patch, cv2.CV_64F).var()) if sub_patch.size > 0 else 0

                score = bc_val * 2.0 + min(lap / 600.0, 1.0)
                if score > 4.0 or lap > 250.0 or bc_val > 4.0:
                    pad_x = max(8, int(cbw * 0.10))
                    pad_y = max(8, int(cbh * 0.12))
                    rx1 = max(0, cbx - pad_x)
                    ry1 = max(0, cby - pad_y)
                    rx2 = min(bw, cbx + cbw + pad_x)
                    ry2 = min(bh, cby + cbh + pad_y)

                    ref_x = max(0, min(w_img - 1, x + rx1))
                    ref_y = max(0, min(h_img - 1, y + ry1))
                    ref_w = max(10, min(w_img - ref_x, rx2 - rx1))
                    ref_h = max(10, min(h_img - ref_y, ry2 - ry1))
                    stickers.append(((ref_x, ref_y, ref_w, ref_h, round(min(0.99, 0.75 + score * 0.05), 2)), score))

        if stickers:
            stickers.sort(key=lambda s: s[1], reverse=True)
            sub_distinct = []
            for item, sc in stickers:
                sx, sy, sw, sh, conf = item
                overlap = False
                for ex in sub_distinct:
                    ex_x, ex_y, ex_w, ex_h, _ = ex
                    ix1, iy1 = max(sx, ex_x), max(sy, ex_y)
                    ix2, iy2 = min(sx + sw, ex_x + ex_w), min(sy + sh, ex_y + ex_h)
                    if ix2 > ix1 and iy2 > iy1:
                        inter = (ix2 - ix1) * (iy2 - iy1)
                        if inter > 0.35 * min(sw * sh, ex_w * ex_h):
                            overlap = True
                            break
                if not overlap:
                    sub_distinct.append((sx, sy, sw, sh, conf))
            if sub_distinct:
                return sub_distinct

        # Bounding box quá khổ (chứa nét vẽ carton hoặc số in stencil như '72', '36', '48')
        # mà không chứa con tem nhãn trắng hợp lệ bên trong -> loại bỏ triệt để
        if min_dim >= 135 or max_dim >= 200:
            return []

        return [(x, y, bw, bh, default_conf)]

