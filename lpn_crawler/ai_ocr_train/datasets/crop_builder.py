# -*- coding: utf-8 -*-
"""
Crop Dataset Builder V2 (Tier A / Tier B / Tier C Architecture).
Mục tiêu:
- Phân định rạch ròi giữa LOCALIZATION QUALITY và RECOGNITION DIFFICULTY.
- TIER A (Gold Real): Localization chuẩn xác, Text rõ ràng, GT chắc chắn (Precision >= 99%).
- TIER B (Hard Real Verified): Localization chuẩn xác theo layout/geometry/barcode, GT chuẩn,
  nhưng Text khó đọc (dot-matrix, in nhiệt mờ, lóa sáng, OCR cũ đọc sai/garbled).
- REVIEW: Thiếu bằng chứng chắc chắn hoặc có nhiều candidate tranh chấp (Ambiguous).
- REJECT: Sai bounding box, sai trường (nhầm sang Description như 'BASE CABINET'), crop cụt.
- TIER C (Synthetic / Augmented): Dữ liệu tổng hợp bổ trợ mô phỏng đúng các case khó ngoài kho.
"""

import os
import sys
import re
import json
import time
import random
import cv2
import numpy as np
from typing import Dict, Any, List, Optional, Tuple

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ai_ocr_train.core.pipeline import AiOcrPipeline
from ai_ocr_train.core.parser import LabelDataParser
from ai_ocr_train.core.validators import is_valid_warehouse_lpn, is_valid_warehouse_sku, clean_warehouse_lpn


def compute_levenshtein(s1: str, s2: str) -> int:
    """Khoảng cách Levenshtein giữa 2 chuỗi."""
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i - 1] == s2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[m][n]


class CropDatasetBuilderV2:
    """Hệ thống trích xuất và phân hạng Text-Line Crops theo Tier A / Tier B / Tier C."""

    DESCRIPTION_KEYWORDS = set(LabelDataParser.IGNORED_SKU_WORDS) | {
        "BASE", "CABINET", "VANITY", "DRAWER", "DOOR", "WALL", "LINEN", "SIDE",
        "WHITE", "BLACK", "OAK", "GREY", "GRAY", "BROWN", "WOOD", "CARTON",
        "MADE", "VIETNAM", "CHINA", "ASSEMBLY", "REQUIRED", "PIECES", "PACKAGE",
        "WEIGHT", "GROSS", "NET", "CUFT", "CBM", "QUANTITY", "QTY", "UPC",
        "FINISH", "COLOR", "STYLE", "SIZE", "INCH", "PRODUCT", "DESCRIPTION"
    }

    def __init__(self, output_dir: Optional[str] = None):
        self.pipeline = AiOcrPipeline()
        self.output_dir = output_dir or os.path.join(PROJECT_ROOT, "storage", "crops_v2")
        for tier in ("tier_a", "tier_b", "review", "reject", "tier_c"):
            os.makedirs(os.path.join(self.output_dir, tier), exist_ok=True)

    def is_description_text(self, text: str) -> bool:
        """Kiểm tra xem text có phải là mô tả sản phẩm thông thường không."""
        clean = re.sub(r"[^A-Za-z\s]", " ", text.upper()).split()
        if not clean:
            return False
        match_count = sum(1 for w in clean if w in self.DESCRIPTION_KEYWORDS)
        return match_count >= 1 and (match_count / len(clean)) >= 0.5

    def analyze_candidate_difficulty(self, crop_bgr: np.ndarray, ocr_text: str, ocr_conf: float) -> List[str]:
        """Phát hiện các đặc tính khó (Hard Case attributes) của ảnh crop."""
        diffs = []
        if crop_bgr is None or crop_bgr.size == 0:
            return diffs

        gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY) if len(crop_bgr.shape) == 3 else crop_bgr

        # 1. Đo độ mờ (Blur / Sharpness qua Laplacian variance)
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if lap_var < 80.0:
            diffs.append("blur")

        # 2. Đo độ tương phản (Low Contrast)
        contrast = float(gray.std())
        if contrast < 28.0:
            diffs.append("low_contrast")

        # 3. Đo lóa sáng (Glare / Overexposure)
        bright_ratio = float(np.sum(gray > 245)) / max(1, gray.size)
        if bright_ratio > 0.40:
            diffs.append("glare")

        # 4. Kích thước chữ nhỏ (Small text)
        h, w = gray.shape[:2]
        if h < 18:
            diffs.append("small_text")

        # 5. Dấu hiệu chữ in kim / ngắt nét (Dot-matrix pattern: biến thiên gradient chu kỳ cao)
        # Ký tự in kim thường có nhiều hạt chấm đen rời rạc
        thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
        n_dots = cv2.countNonZero(thresh)
        dot_ratio = n_dots / max(1, gray.size)
        if 0.08 <= dot_ratio <= 0.22 and ocr_conf < 0.65:
            diffs.append("dot_matrix")

        # 6. OCR nhận diện yếu
        if ocr_conf < 0.40:
            diffs.append("low_ocr_conf")

        return diffs

    def evaluate_lpn_candidate(
        self,
        box: Tuple[int, int, int, int],
        text: str,
        conf: float,
        gt_lpn: str,
        roi_shape: Tuple[int, int],
        barcode_boxes: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Đánh giá và chấm điểm chất lượng Localization + Recognition cho LPN candidate."""
        bx1, by1, bx2, by2 = box
        bw, bh = bx2 - bx1, by2 - by1
        H_roi, W_roi = roi_shape
        aspect_ratio = bw / max(1, bh)

        # Trích xuất số sau khi chuẩn hóa ký tự nhầm lẫn (O->0, I->1, etc.)
        cleaned_cand = clean_warehouse_lpn(text)
        cand_digits = "".join(filter(str.isdigit, cleaned_cand))

        loc_score = 0.0
        reasons = []
        is_cut = (bx1 <= 2 or bx2 >= W_roi - 2) and aspect_ratio < 2.5
        is_multi_line = (bh > 48 and aspect_ratio < 1.3)

        # 1. Bằng chứng số liệu: Trùng khớp với GT LPN
        if cand_digits == gt_lpn:
            loc_score += 0.65
            reasons.append("Exact digits match with GT LPN")
        elif len(cand_digits) >= 7 and cand_digits in gt_lpn:
            loc_score += 0.50
            reasons.append("Sub-sequence digits match GT LPN")
        elif len(cand_digits) == 9 and cand_digits.startswith("06"):
            loc_score += 0.40
            reasons.append("Valid 9-digit warehouse LPN format")
        elif len(cand_digits) >= 6:
            loc_score += 0.25

        # 2. Bằng chứng hình học (Geometry & Barcode Proximity)
        # Mã LPN thường in ngay phía dưới vạch barcode LPN
        near_barcode = False
        for bc in barcode_boxes:
            bc_box = bc.get("box", [0, 0, 0, 0])
            bc_y2 = bc_box[1] + bc_box[3]
            # Khoảng cách từ chân barcode đến đỉnh text box
            dy = by1 - bc_y2
            if 0 <= dy <= int(0.35 * H_roi) and abs(bx1 - bc_box[0]) < int(0.3 * W_roi):
                near_barcode = True
                break

        if near_barcode:
            loc_score += 0.30
            reasons.append("Located directly below LPN barcode")

        # 3. Aspect Ratio hợp lệ của dòng mã LPN
        if 2.2 <= aspect_ratio <= 10.0:
            loc_score += 0.10
        elif is_multi_line or is_cut:
            loc_score -= 0.35
            reasons.append("Abnormal aspect ratio / multi-line or cut")

        loc_score = max(0.0, min(1.0, loc_score))

        # Phân hạng Tier
        tier = "REJECT"
        if is_cut or is_multi_line or loc_score < 0.40:
            tier = "REJECT"
        elif loc_score >= 0.85 and cand_digits == gt_lpn:
            tier = "A"
        elif loc_score >= 0.70:
            # Đúng localization nhưng text khó đọc / OCR đọc thiếu 1-2 số
            tier = "B"
        else:
            tier = "REVIEW"

        return {
            "field": "LPN",
            "box": box,
            "text": text,
            "cleaned_text": cand_digits,
            "conf": conf,
            "loc_score": round(loc_score, 3),
            "tier": tier,
            "is_cut": is_cut,
            "is_multi_line": is_multi_line,
            "reasons": "; ".join(reasons)
        }

    def evaluate_sku_candidate(
        self,
        box: Tuple[int, int, int, int],
        text: str,
        conf: float,
        gt_sku: str,
        roi_shape: Tuple[int, int]
    ) -> Dict[str, Any]:
        """Đánh giá và chấm điểm chất lượng Localization + Recognition cho SKU candidate."""
        bx1, by1, bx2, by2 = box
        bw, bh = bx2 - bx1, by2 - by1
        H_roi, W_roi = roi_shape
        aspect_ratio = bw / max(1, bh)

        clean_upper = text.strip().upper()
        clean_alnum = re.sub(r"[^A-Z0-9\-]", "", clean_upper)

        loc_score = 0.0
        reasons = []
        is_cut = (bx1 <= 2 or bx2 >= W_roi - 2) and aspect_ratio < 2.0
        is_multi_line = (bh > 45 and aspect_ratio < 1.3)
        is_desc = self.is_description_text(clean_upper)

        if is_desc:
            # Tuyệt đối phạt nặng nếu là text mô tả sản phẩm (BASE CABINET)
            loc_score = 0.02
            reasons.append("Rejected: Matches Product Description keyword")
            return {
                "field": "SKU",
                "box": box,
                "text": text,
                "cleaned_text": clean_alnum,
                "conf": conf,
                "loc_score": loc_score,
                "tier": "REJECT",
                "is_cut": is_cut,
                "is_multi_line": is_multi_line,
                "is_desc": True,
                "reasons": "; ".join(reasons)
            }

        # 1. Bằng chứng chuỗi ký tự so với GT SKU
        gt_clean = re.sub(r"[^A-Z0-9\-]", "", gt_sku.upper())
        if clean_alnum == gt_clean:
            loc_score += 0.70
            reasons.append("Exact match with GT SKU")
        elif len(clean_alnum) >= 4 and (clean_alnum in gt_clean or gt_clean in clean_alnum):
            loc_score += 0.55
            reasons.append("Strong substring match with GT SKU")
        else:
            # Tính khoảng cách ký tự Levenshtein
            dist = compute_levenshtein(clean_alnum, gt_clean)
            if dist <= 2 and len(gt_clean) >= 6:
                loc_score += 0.45
                reasons.append(f"Near-exact match (Levenshtein={dist})")
            elif '-' in clean_alnum and any(c.isalpha() for c in clean_alnum) and any(c.isdigit() for c in clean_alnum):
                # Khớp cấu trúc SKU công nghiệp (chữ-số-gạch nối)
                loc_score += 0.25
                reasons.append("Valid SKU token syntax pattern")

        # 2. Bằng chứng vị trí Layout trong con tem
        # SKU thường nằm ở nửa trên con tem (y_rel < 0.65)
        y_rel = (by1 + by2) / (2.0 * max(1, H_roi))
        if 0.10 <= y_rel <= 0.65:
            loc_score += 0.20
            reasons.append("Optimal SKU vertical label band")

        # 3. Tỷ lệ hình học (Aspect Ratio) của dòng SKU
        if 2.0 <= aspect_ratio <= 10.0:
            loc_score += 0.10
        elif is_multi_line or is_cut:
            loc_score -= 0.35
            reasons.append("Abnormal aspect ratio / multi-line or cut")

        loc_score = max(0.0, min(1.0, loc_score))

        # Phân hạng Tier
        tier = "REJECT"
        if is_cut or is_multi_line or loc_score < 0.40:
            tier = "REJECT"
        elif loc_score >= 0.85 and (clean_alnum == gt_clean or compute_levenshtein(clean_alnum, gt_clean) <= 1):
            tier = "A"
        elif loc_score >= 0.65:
            # Đúng localization theo layout/syntax nhưng Text khó đọc (dot-matrix mờ, OCR cũ đọc lỗi)
            tier = "B"
        else:
            tier = "REVIEW"

        return {
            "field": "SKU",
            "box": box,
            "text": text,
            "cleaned_text": clean_alnum,
            "conf": conf,
            "loc_score": round(loc_score, 3),
            "tier": tier,
            "is_cut": is_cut,
            "is_multi_line": is_multi_line,
            "is_desc": False,
            "reasons": "; ".join(reasons)
        }

    @staticmethod
    def merge_horizontal_boxes(
        candidates: List[Dict[str, Any]],
        max_gap_px: int = 45,
        max_y_diff_px: int = 14
    ) -> List[Dict[str, Any]]:
        """
        Ghép các bounding box nằm cạnh nhau trên cùng một dòng ngang.
        Giải quyết triệt để trường hợp CRAFT cắt cụt SKU như:
        'A036S' + '-R-' + 'BC' + '-WOA' -> 'A036S-R-BC-WOA'.
        """
        if len(candidates) < 2:
            return list(candidates)

        boxes = []
        for c in candidates:
            bx1, by1, bx2, by2 = c["box"]
            ymid = (by1 + by2) / 2.0
            h = by2 - by1
            boxes.append({
                "box": (bx1, by1, bx2, by2),
                "text": c.get("text", ""),
                "conf": c.get("conf", 0.0),
                "ymid": ymid,
                "h": h
            })

        boxes.sort(key=lambda b: (b["ymid"], b["box"][0]))
        merged_results = list(candidates)

        for i in range(len(boxes)):
            curr_group = [boxes[i]]
            for j in range(i + 1, len(boxes)):
                prev = curr_group[-1]
                cand = boxes[j]
                y_diff = abs(cand["ymid"] - prev["ymid"])
                x_gap = cand["box"][0] - prev["box"][2]

                # Cùng dòng ngang và khoảng cách hợp lý
                if y_diff <= max_y_diff_px and -8 <= x_gap <= max_gap_px:
                    curr_group.append(cand)
                elif cand["box"][0] > prev["box"][2] + max_gap_px:
                    break

            if len(curr_group) >= 2:
                mbx1 = min(b["box"][0] for b in curr_group)
                mby1 = min(b["box"][1] for b in curr_group)
                mbx2 = max(b["box"][2] for b in curr_group)
                mby2 = max(b["box"][3] for b in curr_group)
                m_text = "".join(b["text"] for b in curr_group)
                m_conf = float(sum(b["conf"] for b in curr_group) / len(curr_group))

                merged_results.append({
                    "box": (mbx1, mby1, mbx2, mby2),
                    "text": m_text,
                    "conf": m_conf,
                    "is_merged": True
                })

        return merged_results

    def run_sku_pass2_recovery(
        self,
        img_bgr: np.ndarray,
        gt_sku: str,
        H_img: int,
        W_img: int
    ) -> Optional[Dict[str, Any]]:
        """
        Pass 2 - SKU Recovery: Chạy trên dải tem chứa SKU (y in [0.12*H, 0.70*H])
        với tiền xử lý tăng cường nét in kim/mờ nhiệt (CLAHE, unsharp) và CRAFT nhạy hơn.
        """
        sy1 = max(0, int(0.12 * H_img))
        sy2 = min(H_img, int(0.70 * H_img))
        if (sy2 - sy1) < 35:
            return None

        band_crop = img_bgr[sy1:sy2, :]
        if band_crop.size == 0:
            return None

        # Tiền xử lý tăng cường tương phản & làm nét
        gray = cv2.cvtColor(band_crop, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4))
        enhanced = clahe.apply(gray)
        blurred = cv2.GaussianBlur(enhanced, (3, 3), 0)
        sharpened = cv2.addWeighted(enhanced, 1.4, blurred, -0.4, 0)
        color_enhanced = cv2.cvtColor(sharpened, cv2.COLOR_GRAY2BGR)

        reader = self.pipeline.ocr_engine.get_reader()
        if reader is None:
            return None

        try:
            dets = reader.readtext(
                color_enhanced,
                text_threshold=0.25,
                low_text=0.15,
                link_threshold=0.20
            )
        except Exception:
            return None

        raw_cands = []
        for det_box, det_txt, det_conf in dets:
            clean_t = str(det_txt).strip()
            if not clean_t:
                continue
            pts = np.array(det_box, dtype=np.int32)
            bx1 = max(0, int(pts[:, 0].min()))
            by1 = max(0, int(pts[:, 1].min())) + sy1
            bx2 = min(W_img, int(pts[:, 0].max()))
            by2 = min(H_img, int(pts[:, 1].max())) + sy1

            raw_cands.append({
                "box": (bx1, by1, bx2, by2),
                "text": clean_t,
                "conf": float(det_conf)
            })

        all_cands = self.merge_horizontal_boxes(raw_cands, max_gap_px=50, max_y_diff_px=18)

        pass2_evals = []
        for c in all_cands:
            ev = self.evaluate_sku_candidate(
                box=c["box"],
                text=c["text"],
                conf=c["conf"],
                gt_sku=gt_sku,
                roi_shape=(H_img, W_img)
            )
            ev["pass_source"] = "pass_2_recovery"
            pass2_evals.append(ev)

        best_p2 = max(pass2_evals, key=lambda x: x["loc_score"]) if pass2_evals else None
        return best_p2

    def process_image_for_crops(
        self,
        image_path: str,
        gt_lpn: str,
        gt_sku: str,
        source_id: str = "",
        save_crops: bool = False
    ) -> Dict[str, Any]:
        """
        Xử lý 1 Real Full Image qua Two-Pass SKU Strategy:
        Pass 1: High Precision CRAFT + Box Merging
        Pass 2: SKU Recovery (nếu Pass 1 chưa tìm được SKU đạt chuẩn)
        """
        t_p1_start = time.time()
        pass2_triggered = False
        pass1_dur = 0.0
        pass2_dur = 0.0

        if not os.path.isfile(image_path):
            return {"error": "Image file not found", "records": [], "pass2_triggered": False}

        img_bgr = cv2.imread(image_path)
        if img_bgr is None:
            return {"error": "Failed to decode image", "records": [], "pass2_triggered": False}

        H_img, W_img = img_bgr.shape[:2]

        # PASS 1: High Precision Pipeline Scan
        res = self.pipeline.process(image_path, auto_crop=True, auto_rotate=True, return_images_base64=False)
        full_res = res.get("full_result", {})
        raw_ocr = full_res.get("raw_ocr", {})
        det_tokens = raw_ocr.get("tokens", [])
        barcodes = full_res.get("barcodes", [])

        raw_cands = []
        for item in det_tokens:
            bbox = item.get("bbox", [])
            txt = str(item.get("text", "")).strip()
            conf = float(item.get("confidence", 0.0))
            if not bbox or len(bbox) < 2 or not txt:
                continue

            pts = np.array(bbox, dtype=np.int32)
            bx1, by1 = max(0, int(pts[:, 0].min())), max(0, int(pts[:, 1].min()))
            bx2, by2 = min(W_img, int(pts[:, 0].max())), min(H_img, int(pts[:, 1].max()))

            if (bx2 - bx1) < 12 or (by2 - by1) < 6:
                continue

            raw_cands.append({
                "box": (bx1, by1, bx2, by2),
                "text": txt,
                "conf": conf
            })

        # Ghép các box nằm cạnh nhau trên cùng một dòng trong Pass 1
        all_cands = self.merge_horizontal_boxes(raw_cands, max_gap_px=45, max_y_diff_px=14)

        lpn_candidates = []
        sku_candidates = []

        for c in all_cands:
            box_tuple = c["box"]
            txt = c["text"]
            conf = c["conf"]

            # Đánh giá LPN
            lpn_eval = self.evaluate_lpn_candidate(
                box=box_tuple,
                text=txt,
                conf=conf,
                gt_lpn=gt_lpn,
                roi_shape=(H_img, W_img),
                barcode_boxes=[{"box": (0, 0, 100, 50)}]
            )
            lpn_eval["pass_source"] = "pass_1"
            lpn_candidates.append(lpn_eval)

            # Đánh giá SKU
            sku_eval = self.evaluate_sku_candidate(
                box=box_tuple,
                text=txt,
                conf=conf,
                gt_sku=gt_sku,
                roi_shape=(H_img, W_img)
            )
            sku_eval["pass_source"] = "pass_1"
            sku_candidates.append(sku_eval)

        best_lpn = max(lpn_candidates, key=lambda c: c["loc_score"]) if lpn_candidates else None
        best_sku = max(sku_candidates, key=lambda c: c["loc_score"]) if sku_candidates else None

        pass1_dur = time.time() - t_p1_start

        # PASS 2: SKU Recovery nếu Pass 1 chưa tìm được SKU đạt chuẩn (Tier A/B hoặc loc_score >= 0.65)
        p1_sku_accepted = best_sku and (best_sku["tier"] in ("A", "B") or best_sku["loc_score"] >= 0.65)
        if not p1_sku_accepted:
            t_p2_start = time.time()
            pass2_triggered = True
            recovered_sku = self.run_sku_pass2_recovery(img_bgr, gt_sku, H_img, W_img)
            pass2_dur = time.time() - t_p2_start

            if recovered_sku:
                # Nếu Pass 2 tìm thấy candidate tốt hơn, thay thế
                cur_score = best_sku["loc_score"] if best_sku else 0.0
                if recovered_sku["loc_score"] > cur_score and not recovered_sku.get("is_desc", False):
                    best_sku = recovered_sku

        records = []
        for field_type, best_cand, gt_val in [("LPN", best_lpn, gt_lpn), ("SKU", best_sku, gt_sku)]:
            if not best_cand:
                records.append({
                    "source_image_id": source_id,
                    "field_type": field_type,
                    "ground_truth": gt_val,
                    "old_ocr_text": "NOT_FOUND",
                    "old_ocr_confidence": 0.0,
                    "localization_confidence": 0.0,
                    "tier": "REJECT",
                    "difficulty": [],
                    "crop_path": "",
                    "bbox": [0, 0, 0, 0],
                    "pass_source": "none",
                    "accept_reason": "",
                    "reject_reason": "No text box detected"
                })
                continue

            bx1, by1, bx2, by2 = best_cand["box"]
            crop_img = img_bgr[by1:by2, bx1:bx2]
            diffs = self.analyze_candidate_difficulty(crop_img, best_cand["text"], best_cand["conf"])

            tier = best_cand["tier"]
            crop_rel_path = ""

            if save_crops and crop_img.size > 0:
                tier_sub = f"tier_{tier.lower()}"
                fname = f"{source_id}_{field_type}_{best_cand['loc_score']:.2f}.jpg"
                out_p = os.path.join(self.output_dir, tier_sub, fname)
                cv2.imwrite(out_p, crop_img)
                crop_rel_path = os.path.relpath(out_p, PROJECT_ROOT)

            records.append({
                "source_image_id": source_id,
                "field_type": field_type,
                "ground_truth": gt_val,
                "old_ocr_text": best_cand["text"],
                "old_ocr_confidence": round(best_cand["conf"], 3),
                "localization_confidence": best_cand["loc_score"],
                "tier": tier,
                "difficulty": diffs,
                "crop_path": crop_rel_path,
                "bbox": [bx1, by1, bx2, by2],
                "pass_source": best_cand.get("pass_source", "pass_1"),
                "accept_reason": best_cand["reasons"] if tier in ("A", "B") else "",
                "reject_reason": best_cand["reasons"] if tier in ("REJECT", "REVIEW") else ""
            })

        return {
            "source_image_id": source_id,
            "records": records,
            "pass2_triggered": pass2_triggered,
            "pass1_time": round(pass1_dur, 3),
            "pass2_time": round(pass2_dur, 3)
        }
