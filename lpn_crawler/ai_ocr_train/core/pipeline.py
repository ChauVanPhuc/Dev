# -*- coding: utf-8 -*-
"""
End-to-End AI OCR Pipeline Orchestrator (Multi-Label Aware).
Kết nối đồng bộ toàn bộ luồng xử lý:
1. Load ảnh Pallet / Thùng hàng.
2. Label Detection (Phát hiện TẤT CẢ các vùng nhãn dán trên kiện hàng).
3. Auto-Orientation & Deskew (Tự động nắn thẳng & xoay ảnh).
4. Image Preprocessing (Resize, Zoom, CLAHE, Threshold, Sharpen, Denoise).
5. Barcode & QR Code Decoding trên toàn bộ các nhãn.
6. Deep Learning GPU OCR (EasyOCR) quét song song qua tất cả các tem nhãn.
7. Data Parsing (Hợp nhất và trích xuất đầy đủ LPN, SKU, Batch).
8. Đo thời gian chi tiết & Chuẩn bị dữ liệu trực quan hóa Base64 cho UI.
"""

import time
import re
import cv2
import numpy as np
from typing import Dict, Any, Optional, List

from .preprocessor import ImagePreprocessor
from .label_detector import LabelDetector
from .auto_orient import AutoOrient
from .barcode_engine import BarcodeEngine
from .ocr_engine import OcrEngine
from .parser import LabelDataParser


class AiOcrPipeline:
    """Pipeline AI OCR xử lý hình ảnh nhãn Pallet / Thùng hàng."""

    def __init__(self, yolo_path: Optional[str] = None, recognizer_mode: Optional[str] = None):
        self.preprocessor = ImagePreprocessor()
        self.label_detector = LabelDetector(yolo_model_path=yolo_path)
        self.auto_orient = AutoOrient()
        self.barcode_engine = BarcodeEngine()
        self.ocr_engine = OcrEngine()
        self.parser = LabelDataParser()
        # Ưu tiên mô hình tự huấn luyện tốt nhất và chính xác nhất theo cơ chế Dynamic Discovery, không gán cứng
        self.recognizer_mode = recognizer_mode or self.ocr_engine.get_best_model_id()

    def process(
        self,
        image_input: Any,
        auto_crop: bool = True,
        auto_rotate: bool = True,
        apply_super_res: bool = True,
        return_images_base64: bool = False,
        model_id: Optional[str] = None,
        inference_mode: Optional[str] = None,
        expected_skus: Optional[List[str]] = None,
        expected_lpn: Optional[str] = None,
        package_position: Optional[str] = None
    ) -> Dict[str, Any]:
        """Phương thức tiện ích cho Batch Scan và đọc ảnh nhanh."""
        cfg = {
            "auto_crop_label": auto_crop,
            "auto_rotate": auto_rotate,
            "super_resolution": apply_super_res
        }
        active_model_id = model_id or self.recognizer_mode or self.ocr_engine.get_best_model_id()
        res = self.process_image(
            image_input=image_input,
            preprocess_config=cfg,
            return_images_base64=return_images_base64,
            model_id=active_model_id,
            inference_mode=inference_mode,
            expected_skus=expected_skus,
            expected_lpn=expected_lpn,
            package_position=package_position
        )
        extracted = res.get("extracted", {})
        barcodes = [b.get("data") for b in res.get("barcodes", []) if isinstance(b, dict) and b.get("data")]
        return {
            "success": res.get("success", True),
            "lpn": extracted.get("lpn"),
            "sku": extracted.get("sku"),
            "barcodes": barcodes,
            "confidence": extracted.get("overall_confidence", 0.0),
            "time_metrics": res.get("time_metrics", {}),
            "extracted": extracted,
            "detected_lpns_detail": extracted.get("detected_lpns_detail", []),
            "detected_skus_detail": extracted.get("detected_skus_detail", []),
            "roi_details": res.get("roi_details", []),
            "full_result": res
        }

    def process_image(
        self,
        image_input: Any,
        preprocess_config: Optional[Dict[str, Any]] = None,
        return_images_base64: bool = True,
        model_id: Optional[str] = None,
        inference_mode: Optional[str] = None,
        expected_skus: Optional[List[str]] = None,
        expected_lpn: Optional[str] = None,
        package_position: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Xử lý toàn diện một bức ảnh nhãn Pallet / Thùng hàng đa nhãn.
        Tự động nhận biết quy cách kiện hàng (Box 10A -> Kiện dọc / Top nóc; Box 10 -> Kiện ngang / Pallet đứng).
        """
        t_start_total = time.time()
        time_metrics = {}
        active_model_id = model_id or self.recognizer_mode or self.ocr_engine.get_best_model_id()
        cfg = preprocess_config or {}
        eff_inference_mode = inference_mode or cfg.get("inference_mode", "hybrid")
        is_target_vertical = LabelDataParser.is_package_vertical(package_position)

        # 1. Nạp ảnh
        orig_img = ImagePreprocessor.load_image(image_input)
        if orig_img is None:
            raise ValueError("Không thể nạp hình ảnh hoặc định dạng ảnh không hợp lệ.")

        auto_crop = bool(cfg.get("auto_crop_label", True))
        auto_rotate = bool(cfg.get("auto_rotate", True))

        # 2. Phát hiện TẤT CẢ các vùng nhãn dán trên kiện hàng (Multi-Label Detection)
        t_det_start = time.time()
        if auto_crop:
            det_res = self.label_detector.detect_label_roi(orig_img, max_labels=22)
            roi_img = det_res["roi_image"] # Ảnh tổng hợp / ghép tất cả các nhãn
            all_rois = det_res.get("all_rois", [{"roi_image": roi_img, "bbox": det_res["bbox"], "label_id": 1}])
            det_bbox = det_res["bbox"]
            det_conf = det_res["confidence"]
            det_annotated = det_res["annotated_image"] # Ảnh toàn cảnh vẽ khung xanh lá tất cả các nhãn
            det_method = det_res["method"]
            total_labels_found = det_res.get("total_labels", len(all_rois))
        else:
            roi_img = orig_img.copy()
            all_rois = [{"roi_image": orig_img, "bbox": [0, 0, orig_img.shape[1], orig_img.shape[0]], "label_id": 1}]
            det_bbox = [0, 0, orig_img.shape[1], orig_img.shape[0]]
            det_conf = 1.0
            det_annotated = orig_img.copy()
            det_method = "manual_full"
            total_labels_found = 1
        time_metrics["detection_ms"] = round((time.time() - t_det_start) * 1000, 1)

        # 3. Tự động xoay và nắn thẳng (Auto Orientation)
        t_orient_start = time.time()
        if auto_rotate:
            oriented_img, orient_meta = self.auto_orient.auto_orient_image(roi_img)
        else:
            oriented_img = roi_img
            orient_meta = {"applied_angle": 0.0, "is_rotated": False}
        time_metrics["orientation_ms"] = round((time.time() - t_orient_start) * 1000, 1)

        # 4. Tiền xử lý nâng cao (Preprocessing: Zoom, CLAHE, Threshold, Sharpen)
        t_prep_start = time.time()
        processed_img, prep_previews = ImagePreprocessor.preprocess_pipeline(oriented_img, cfg)
        time_metrics["preprocessing_ms"] = round((time.time() - t_prep_start) * 1000, 1)

        # 5 & 6. Giải mã Barcode & Quét Deep Learning OCR qua TẤT CẢ các con tem trên Pallet
        t_ocr_start = time.time()
        t_bc_start = time.time()

        all_barcodes = []
        all_tokens = []
        seen_barcode_texts = set()
        seen_tokens = set()
        roi_details = []
        annotated_crops_for_grid = []

        found_pallet_lpn = None
        found_pallet_sku = None

        # Bước 5A: Quét nhanh Barcode trên toàn ảnh và từng vùng nhãn (hỗ trợ tìm mã target LPN nếu có)
        full_img_bcs = self.barcode_engine.read_barcodes(orig_img, expected_lpn=expected_lpn)
        for b in full_img_bcs:
            if b["data"] not in seen_barcode_texts:
                seen_barcode_texts.add(b["data"])
                all_barcodes.append(b)

        target_exp_lpn_clean = str(expected_lpn).strip().upper() if expected_lpn else ""
        if target_exp_lpn_clean and any(str(b.get("data", "")).strip().upper() == target_exp_lpn_clean for b in all_barcodes):
            found_pallet_lpn = expected_lpn

        roi_candidates = []
        for idx, r_item in enumerate(all_rois):
            crop = r_item["roi_image"]
            bbox = r_item.get("bbox", [])
            w = bbox[2] if len(bbox) >= 4 else crop.shape[1]
            h = bbox[3] if len(bbox) >= 4 else crop.shape[0]
            # Chỉ loại bỏ các đốm nhiễu vi mô (< 1000 px^2 hoặc kích thước < 15px), giữ lại toàn bộ dải mã vạch & tem nhỏ
            if (w * h < 1000) or w < 18 or h < 15:
                continue

            zoomed_crop = ImagePreprocessor.focus_and_zoom_roi(crop, target_min_dim=180)

            b_list = self.barcode_engine.read_barcodes(zoomed_crop, expected_lpn=expected_lpn)
            if not b_list and zoomed_crop is not crop:
                b_list = self.barcode_engine.read_barcodes(crop, expected_lpn=expected_lpn)

            bc_lpn_found = False
            bc_sku_found = False
            has_target_lpn = False
            for b in b_list:
                b_data = str(b.get("data", "")).strip()
                if expected_lpn and b_data == str(expected_lpn).strip():
                    has_target_lpn = True
                if (expected_lpn and b_data == str(expected_lpn).strip()) or LabelDataParser.is_warehouse_lpn(b_data):
                    bc_lpn_found = True
                if LabelDataParser.is_valid_sku_candidate(LabelDataParser.normalize_sku(b_data)):
                    bc_sku_found = True

            # Điểm ưu tiên: Tem có mã LPN mục tiêu = 100, có mã vạch = 50, tem nhãn thường = 10
            prio = 100 if has_target_lpn else (50 if (bc_lpn_found or bc_sku_found) else (30 if b_list else 10))
            roi_candidates.append({
                "idx": idx,
                "r_item": r_item,
                "crop": crop,
                "zoomed_crop": zoomed_crop,
                "b_list": b_list,
                "bc_lpn_found": bc_lpn_found,
                "bc_sku_found": bc_sku_found,
                "prio": prio
            })

        # Sắp xếp để các tem chứa mã vạch & LPN mục tiêu được xử lý trước tiên
        roi_candidates.sort(key=lambda x: (x["prio"], -x["idx"]), reverse=True)

        # Bước 5B: Quét OCR chuyên sâu toàn diện TẤT CẢ các con tem trên Pallet (không ngắt sớm)
        roi_exec_results = []
        target_exp_lpn = str(expected_lpn).strip().upper() if expected_lpn else ""
        target_exp_skus_set = {str(s).strip().upper() for s in (expected_skus or []) if s}

        for candidate in roi_candidates:
            idx = candidate["idx"]
            r_item = candidate["r_item"]
            crop = candidate["crop"]
            zoomed_crop = candidate["zoomed_crop"]
            b_list = candidate["b_list"]
            bc_lpn_found = candidate["bc_lpn_found"]
            bc_sku_found = candidate["bc_sku_found"]

            allow_rot = not (bc_lpn_found and bc_sku_found)
            ocr_item = self.ocr_engine.recognize_text(
                zoomed_crop,
                model_id=active_model_id,
                inference_mode=eff_inference_mode,
                allow_rotation=allow_rot,
                already_has_lpn=bool(bc_lpn_found),
                already_has_sku=bool(bc_sku_found),
                expected_skus=expected_skus,
                expected_lpn=expected_lpn,
                render_annotated=return_images_base64,
                is_target_vertical=is_target_vertical
            )

            roi_parsed = LabelDataParser.parse_extracted_data(
                ocr_tokens=ocr_item.get("tokens", []),
                barcode_results=b_list,
                expected_skus=expected_skus,
                expected_lpn=expected_lpn,
                package_position=package_position,
                is_single_label=True
            )

            r_lpn = roi_parsed.get("lpn")
            r_sku = roi_parsed.get("sku")
            if r_lpn:
                if not found_pallet_lpn or (target_exp_lpn and str(r_lpn).strip().upper() == target_exp_lpn):
                    found_pallet_lpn = r_lpn
            if r_sku:
                if not found_pallet_sku or (target_exp_skus_set and str(r_sku).strip().upper() in target_exp_skus_set):
                    found_pallet_sku = r_sku

            roi_exec_results.append((idx, r_item, crop, zoomed_crop, b_list, ocr_item, roi_parsed))

        roi_exec_results.sort(key=lambda x: x[0])

        for idx, r_item, crop, zoomed_crop, b_list, ocr_item, roi_parsed in roi_exec_results:
            for b in b_list:
                if b["data"] not in seen_barcode_texts:
                    seen_barcode_texts.add(b["data"])
                    all_barcodes.append(b)

            for tok in ocr_item["tokens"]:
                t_key = (tok["text"], tok["confidence"])
                if t_key not in seen_tokens:
                    seen_tokens.add(t_key)
                    all_tokens.append(tok)

            if roi_parsed.get("lpn") and not found_pallet_lpn:
                found_pallet_lpn = roi_parsed["lpn"]
            if roi_parsed.get("sku") and not found_pallet_sku:
                found_pallet_sku = roi_parsed["sku"]

            # Lọc bỏ các vùng ROI giả mạo (không phải tem nhãn thực sự):
            r_tokens = ocr_item.get("tokens", [])
            r_barcodes = [b.get("data") for b in b_list if isinstance(b, dict) and b.get("data")]
            r_box = r_item.get("bbox", [0, 0, 0, 0])
            r_w = r_box[2] if len(r_box) >= 4 else 0
            r_h = r_box[3] if len(r_box) >= 4 else 0
            r_asp = float(r_w) / float(r_h) if r_h > 0 else 1.0

            # Tem nhãn kho thực tế (hỗ trợ cả tem ngang 0° lẫn tem dán dọc xoay 90°/270°):
            # - Loại bỏ các vùng khe rãnh ánh sáng cửa sổ hoặc viền cạnh thùng dị dạng (r_h > 28% ảnh và r_asp < 0.38)
            img_h, img_w = orig_img.shape[:2]
            is_abnormal_slit = (r_h > img_h * 0.28 and r_asp < 0.38) or (r_w > img_w * 0.45) or (r_h > img_h * 0.35)
            if is_abnormal_slit:
                continue

            # NGUYÊN TẮC VÀNG: BÓC TÁCH CHUẨN XÁC TEM NHÃN
            # Một ROI chỉ được coi là tem nhãn hợp lệ khi:
            # 1. Có giải mã được Barcode / QR Code thực sự; HOẶC
            # 2. Đọc được mã LPN kho chuẩn (9 chữ số) từ OCR trên nhãn decal; HOẶC
            # 3. Đọc được mã SKU hợp lệ và KHÔNG PHẢI là chữ mô tả suy đoán từ vỏ thùng carton (Descriptor Prediction).
            has_real_barcode = bool(r_barcodes)
            has_real_lpn = bool(roi_parsed.get("lpn"))
            has_real_sku = bool(roi_parsed.get("sku") and not roi_parsed.get("sku_is_predicted", False))

            if not has_real_barcode and not has_real_lpn and not has_real_sku:
                # Loại bỏ hoàn toàn các mảng vỏ bìa carton ngẫu nhiên (chứa số 72, JHM-AZL-R, CAMB...)
                continue
            
            annotated_crop = ocr_item.get("annotated_image", zoomed_crop)
            if return_images_base64:
                annotated_crops_for_grid.append(annotated_crop)

            applied_rot = ocr_item.get("applied_rotation", 0)

            # Quy chuẩn chuẩn xác từ nhà máy:
            # - Top nóc là mã đứng: Con tem dán đứng theo chiều dọc (chiều rộng nhỏ hơn chiều cao, r_asp < 0.95)
            # - Tủ đứng là nằm ngang: Con tem dán nằm ngang (chiều rộng lớn hơn chiều cao, r_asp >= 0.95)
            is_vertical = bool(r_asp < 0.95)
            orientation = "vertical" if is_vertical else "horizontal"
            label_category = "top_roof" if is_vertical else "pallet_standing"
            category_name = "Top nóc" if is_vertical else "Pallet đứng"

            # TRÍCH XUẤT CHUẨN XÁC CHUỖI CHỮ DƯỚI MÃ QR / BARCODE (Spatial Barcode Anchoring):
            # 1. Ưu tiên hàng đầu: Nội dung giải mã từ chính mã QR / Barcode của tem
            clean_under_code = None
            if r_barcodes:
                clean_under_code = str(r_barcodes[0]).strip()

            # 2. Nếu cần tìm dòng chữ in dưới mã vạch từ OCR tokens (Spatial Anchoring):
            # Tìm token OCR nằm ngay phía dưới hoặc phía trên bounding box của mã vạch
            if not clean_under_code or not clean_under_code.isalnum():
                for b_obj in b_list:
                    bc_b = b_obj.get("bbox")
                    if bc_b and len(bc_b) >= 4:
                        bx, by, bw, bh = bc_b
                        for t in r_tokens:
                            tb = t.get("bbox")
                            t_text = str(t.get("text", "")).strip().upper()
                            if not t_text or len(t_text) < 4:
                                continue
                            if tb and len(tb) >= 4:
                                tx, ty, tw, th = tb
                                h_inter = max(0, min(bx + bw, tx + tw) - max(bx, tx))
                                # Nằm sát phía dưới hoặc phía trên mã vạch trong cự ly hẹp
                                is_near = (ty >= by + bh * 0.3 and ty <= by + bh * 2.2) or (ty + th <= by + bh * 0.4 and ty + th >= by - bh * 1.0)
                                if is_near and (h_inter > min(tw, bw) * 0.25):
                                    if (t_text.isdigit() and len(t_text) >= 8) or ('-' in t_text and LabelDataParser.is_valid_sku_candidate(t_text)):
                                        clean_under_code = t_text
                                        break
                    if clean_under_code:
                        break

            # 3. Fallback: Lấy LPN hoặc SKU hợp lệ của chính con tem này
            if not clean_under_code:
                clean_under_code = roi_parsed.get("lpn") or roi_parsed.get("sku")

            roi_info = {
                "label_id": len(roi_details) + 1,
                "bbox": r_item.get("bbox", []),
                "area": r_item.get("area", 0),
                "is_vertical": is_vertical,
                "orientation": orientation,
                "label_category": label_category,
                "category_name": category_name,
                "applied_rotation": applied_rot,
                "tokens": r_tokens,
                "barcodes": r_barcodes,
                "full_text": " ".join([t.get("text", "") for t in r_tokens if t.get("text")]),
                "text_under_barcode": clean_under_code,
                "extracted_lpn": roi_parsed.get("lpn"),
                "extracted_sku": roi_parsed.get("sku"),
                "all_lpns": roi_parsed.get("all_lpns", []),
                "all_skus": roi_parsed.get("all_skus", [])
            }
            if return_images_base64:
                roi_info["crop_preview"] = ImagePreprocessor.to_base64(crop)
                roi_info["zoomed_preview"] = ImagePreprocessor.to_base64(zoomed_crop)
                roi_info["ocr_annotated_preview"] = ImagePreprocessor.to_base64(annotated_crop)

            roi_details.append(roi_info)

        # Fallback hiển thị: nếu tất cả ROI đều bị lọc bỏ nhưng detector phát hiện có nhãn
        if not roi_details and all_rois:
            for idx, r_item in enumerate(all_rois[:2]):
                crop = r_item["roi_image"]
                zoomed_crop = ImagePreprocessor.focus_and_zoom_roi(crop, target_min_dim=180)
                if return_images_base64:
                    annotated_crops_for_grid.append(zoomed_crop)
                roi_info = {
                    "label_id": len(roi_details) + 1,
                    "bbox": r_item.get("bbox", []),
                    "area": r_item.get("area", 0),
                    "tokens": [],
                    "barcodes": [],
                    "extracted_lpn": None,
                    "extracted_sku": None,
                    "all_lpns": [],
                    "all_skus": []
                }
                if return_images_base64:
                    roi_info["crop_preview"] = ImagePreprocessor.to_base64(crop)
                    roi_info["zoomed_preview"] = ImagePreprocessor.to_base64(zoomed_crop)
                    roi_info["ocr_annotated_preview"] = ImagePreprocessor.to_base64(zoomed_crop)
                roi_details.append(roi_info)

        # Xây dựng ảnh OCR Annotated trực quan, sắc nét:
        # CHỈ vẽ và ghép khi return_images_base64=True (phục vụ giao diện UI)
        # Giúp tiết kiệm hàng trăm ms CPU và bộ nhớ RAM khi chạy hàng loạt (Batch Headless)
        if return_images_base64:
            if annotated_crops_for_grid:
                composite_ocr_img = self.label_detector._create_composite_roi(annotated_crops_for_grid, auto_rotate=False)
            else:
                composite_ocr_img = processed_img

            # Tạo ảnh toàn cảnh Pallet có vẽ vị trí tất cả các tem và nhãn LPN/SKU
            full_ocr_img = orig_img.copy()
            for r_item in roi_details:
                b = r_item.get("bbox", [])
                if len(b) == 4:
                    bx, by, bw, bh = b
                    is_lpn_label = bool(r_item.get("extracted_lpn"))
                    is_sku_label = bool(r_item.get("extracted_sku"))
                    box_c = (30, 220, 30) if is_lpn_label else ((235, 130, 30) if is_sku_label else (20, 130, 240))
                    cv2.rectangle(full_ocr_img, (bx, by), (bx + bw, by + bh), box_c, 3)
                    
                    tag_parts = [f"Tem #{r_item['label_id']}"]
                    if r_item.get("extracted_lpn"):
                        tag_parts.append(f"LPN: {r_item['extracted_lpn']}")
                    if r_item.get("extracted_sku"):
                        tag_parts.append(f"SKU: {r_item['extracted_sku']}")
                    tag_label = " | ".join(tag_parts)
                    
                    # Vẽ tag badge có nền tối tương phản cao trên ảnh toàn cảnh
                    (t_w, t_h), _ = cv2.getTextSize(tag_label, cv2.FONT_HERSHEY_SIMPLEX, 0.48, 1)
                    tag_y1 = max(0, by - t_h - 8)
                    tag_y2 = by
                    cv2.rectangle(full_ocr_img, (bx, tag_y1), (bx + t_w + 10, tag_y2), (30, 30, 30), -1)
                    cv2.rectangle(full_ocr_img, (bx, tag_y1), (bx + t_w + 10, tag_y2), box_c, 1)
                    cv2.putText(full_ocr_img, tag_label, (bx + 5, tag_y2 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 255, 255), 1, cv2.LINE_AA)
        else:
            composite_ocr_img = None
            full_ocr_img = None

        main_ocr_res = {"annotated_image": composite_ocr_img, "tokens": all_tokens}

        # Quét Barcode trên processed_img nếu chưa có mã vạch nào
        if not all_barcodes:
            b_main = self.barcode_engine.read_barcodes(processed_img)
            for b in b_main:
                if b["data"] not in seen_barcode_texts:
                    seen_barcode_texts.add(b["data"])
                    all_barcodes.append(b)

        time_metrics["barcode_ms"] = round((time.time() - t_bc_start) * 1000, 1)
        time_metrics["ocr_ms"] = round((time.time() - t_ocr_start) * 1000, 1)

        # 7. Hợp nhất & Bóc tách LPN, SKU, Batch
        t_parse_start = time.time()
        extracted_data = LabelDataParser.parse_extracted_data(
            ocr_tokens=all_tokens,
            barcode_results=all_barcodes,
            expected_skus=expected_skus,
            expected_lpn=expected_lpn,
            package_position=package_position
        )
        time_metrics["parsing_ms"] = round((time.time() - t_parse_start) * 1000, 1)

        # 8. Quét bổ trợ toàn ảnh: Kích hoạt khi còn thiếu bất kỳ mã LPN hoặc SKU mục tiêu nào
        has_matched_both = bool(extracted_data.get("lpn") and extracted_data.get("sku"))
        has_exp_lpn_match = bool(expected_lpn and extracted_data.get("lpn") and str(extracted_data["lpn"]).strip() == str(expected_lpn).strip())
        has_exp_sku_match = bool(expected_skus and expected_skus[0] and extracted_data.get("sku") and str(extracted_data["sku"]).strip().upper() == str(expected_skus[0]).strip().upper())
        if expected_lpn and expected_skus:
            need_fallback = not (has_exp_lpn_match and has_exp_sku_match)
        elif expected_lpn:
            need_fallback = not has_exp_lpn_match
        elif expected_skus:
            need_fallback = not has_exp_sku_match
        else:
            need_fallback = not has_matched_both
        if need_fallback and auto_crop and (roi_img.shape[0] < orig_img.shape[0] or roi_img.shape[1] < orig_img.shape[1]):
            t_fallback_start = time.time()
            full_ocr_res = self.ocr_engine.recognize_text(
                orig_img,
                model_id=active_model_id,
                inference_mode=eff_inference_mode,
                allow_rotation=False,
                expected_skus=expected_skus,
                expected_lpn=expected_lpn,
                render_annotated=False
            )
            full_barcodes = self.barcode_engine.read_barcodes(orig_img, expected_lpn=expected_lpn)

            # Cập nhật thêm tokens từ ảnh toàn cảnh vào all_tokens
            for tok in full_ocr_res["tokens"]:
                t_key = (tok["text"], tok["confidence"])
                if t_key not in seen_tokens:
                    seen_tokens.add(t_key)
                    all_tokens.append(tok)

            merged_tokens = all_tokens
            merged_barcodes = all_barcodes + [b for b in full_barcodes if b not in all_barcodes]

            re_extracted = LabelDataParser.parse_extracted_data(
                ocr_tokens=merged_tokens,
                barcode_results=merged_barcodes,
                expected_skus=expected_skus,
                expected_lpn=expected_lpn,
                package_position=package_position
            )

            if re_extracted.get("lpn") and not extracted_data.get("lpn"):
                extracted_data["lpn"] = re_extracted["lpn"]
                extracted_data["lpn_confidence"] = re_extracted["lpn_confidence"]
                extracted_data["lpn_source"] = f"{re_extracted['lpn_source']} (Toàn ảnh)"

            if re_extracted.get("sku") and not extracted_data.get("sku"):
                extracted_data["sku"] = re_extracted["sku"]
                extracted_data["sku_confidence"] = re_extracted["sku_confidence"]
                extracted_data["sku_source"] = f"{re_extracted['sku_source']} (Toàn ảnh)"

            if re_extracted.get("overall_confidence", 0) > extracted_data.get("overall_confidence", 0):
                extracted_data["overall_confidence"] = re_extracted["overall_confidence"]

            time_metrics["fallback_scan_ms"] = round((time.time() - t_fallback_start) * 1000, 1)

        # 9. Đồng bộ hóa tuyệt đối 100% giữa kết quả trích xuất và các con tem bóc tách (roi_details)
        roi_lpns = [r["extracted_lpn"] for r in roi_details if r.get("extracted_lpn")]

        roi_skus = []
        for r in roi_details:
            s_val = r.get("extracted_sku")
            if s_val:
                s_clean = LabelDataParser.normalize_sku(str(s_val).strip("-:;,. #*!_/"))
                if expected_skus:
                    s_clean = LabelDataParser.calibrate_sku_with_expected(s_clean, expected_skus)
                if LabelDataParser.is_valid_sku_candidate(s_clean):
                    r["extracted_sku"] = s_clean
                    roi_skus.append(s_clean)

        if roi_lpns:
            clean_roi_lpns = list(dict.fromkeys(roi_lpns))
            extracted_data["all_lpns"] = clean_roi_lpns

            # Nếu có expected_lpn và nó nằm trong các tem bóc tách được:
            # Chọn chính xác con tem khớp với kiện hàng cần kiểm tra!
            if expected_lpn and expected_lpn in clean_roi_lpns:
                extracted_data["lpn"] = expected_lpn
                extracted_data["lpn_confidence"] = 1.0
                extracted_data["lpn_source"] = "Tem ROI Match (Expected LPN)"
            elif not extracted_data.get("lpn") or extracted_data.get("lpn") not in clean_roi_lpns:
                extracted_data["lpn"] = clean_roi_lpns[0]

        # Kiểm tra nếu expected_lpn nằm trong all_barcodes (quét từ toàn ảnh hoặc các biến thể đa tỷ lệ)
        if expected_lpn:
            exp_lpn_clean = str(expected_lpn).strip().upper()
            has_bc_match = any(str(b.get("data", "")).strip().upper() == exp_lpn_clean for b in all_barcodes)
            if has_bc_match:
                extracted_data["lpn"] = expected_lpn
                extracted_data["lpn_confidence"] = 1.0
                extracted_data["lpn_source"] = "Barcode Match (Expected LPN)"
                if "all_lpns" not in extracted_data or not extracted_data["all_lpns"]:
                    extracted_data["all_lpns"] = [expected_lpn]
                elif expected_lpn not in extracted_data["all_lpns"]:
                    extracted_data["all_lpns"].insert(0, expected_lpn)

        if roi_skus:
            clean_roi_skus = list(dict.fromkeys(roi_skus))
            extracted_data["all_skus"] = clean_roi_skus
            if expected_skus:
                matched_sku = next((s for s in expected_skus if s in clean_roi_skus), None)
                if not matched_sku:
                    for r_sku in clean_roi_skus:
                        cal_s = LabelDataParser.calibrate_sku_with_expected(r_sku, expected_skus)
                        if cal_s in expected_skus:
                            matched_sku = cal_s
                            break
                if matched_sku:
                    extracted_data["sku"] = matched_sku
                    extracted_data["sku_confidence"] = max(extracted_data.get("sku_confidence", 0.0), 0.98)
                    extracted_data["sku_source"] = "Tem ROI Match (Expected SKU)"
            if not extracted_data.get("sku") or extracted_data.get("sku") not in clean_roi_skus:
                if is_target_vertical:
                    top_sku = None
                    for r in roi_details:
                        r_s = r.get("extracted_sku")
                        if r_s and r_s in clean_roi_skus:
                            bbox = r.get("bbox", [])
                            if r.get("orientation") == "vertical" or (bbox and bbox[1] < orig_img.shape[0] * 0.65):
                                top_sku = r_s
                                break
                    extracted_data["sku"] = top_sku if top_sku else clean_roi_skus[0]
                else:
                    extracted_data["sku"] = clean_roi_skus[0]
        else:
            if extracted_data.get("all_skus"):
                extracted_data["all_skus"] = [
                    s.strip("-:;,. #*!_/") for s in extracted_data["all_skus"]
                    if LabelDataParser.is_valid_sku_candidate(s.strip("-:;,. #*!_/"))
                ]

        # Thống kê phân bố SKU trên pallet và phát hiện kiện lệch lô (Outlier / Mixed-SKU Detection):
        from collections import Counter
        sku_counter = Counter(roi_skus)
        extracted_data["sku_breakdown"] = dict(sku_counter)
        if len(sku_counter) > 1:
            extracted_data["is_mixed_sku"] = True
            majority_sku, majority_cnt = sku_counter.most_common(1)[0]
            breakdown_str = " • ".join([f"{cnt} thùng: {k}" for k, cnt in sku_counter.items()])
            extracted_data["mixed_sku_warning"] = f"Phát hiện {len(sku_counter)} mã SKU khác nhau trên pallet ({breakdown_str})"
            # Đánh dấu kiện thiểu số (Outlier) cho từng con tem
            for r_item in roi_details:
                item_sku = (r_item.get("extracted_sku") or "").strip("-:;,. #*!_/")
                if item_sku and item_sku != majority_sku:
                    r_item["is_outlier"] = True
                    r_item["outlier_note"] = f"Khác mã đa số ({majority_sku})"
                else:
                    r_item["is_outlier"] = False
        else:
            extracted_data["is_mixed_sku"] = False
        # 10. Xây dựng danh sách chi tiết các mã LPN và SKU đọc được kèm số lượng, phân loại riêng rẽ theo hướng (Pallet đứng vs Top nóc)
        exp_lpn_clean = (expected_lpn or "").strip().upper()
        exp_sku_clean = (expected_skus[0] if expected_skus else "").strip().upper()

        lpn_map = {}
        for r in roi_details:
            code = r.get("extracted_lpn")
            if not code:
                continue
            code_clean = str(code).strip()
            ori_type = r.get("orientation", "horizontal")
            cat_label = "Top nóc" if ori_type == "vertical" else "Pallet đứng"
            key = (code_clean, ori_type)
            if key not in lpn_map:
                lpn_map[key] = {
                    "code": code_clean,
                    "count": 0,
                    "orientation": ori_type,
                    "category_label": cat_label
                }
            lpn_map[key]["count"] += 1

        detected_lpns_detail = []
        for (code, ori_type), info in sorted(lpn_map.items(), key=lambda x: -x[1]["count"]):
            is_m = bool(exp_lpn_clean and code.upper() == exp_lpn_clean)
            is_vert = (ori_type == "vertical")

            if is_m:
                reason = "Khớp CSDL"
            else:
                if exp_lpn_clean:
                    reason = f"Lệch mã: CSDL là {exp_lpn_clean} (Thùng khác dán cạnh)"
                else:
                    reason = "Không có mã LPN trong CSDL để đối chiếu"

            detected_lpns_detail.append({
                "code": code,
                "count": info["count"],
                "is_match": is_m,
                "orientation": ori_type,
                "category_label": info["category_label"],
                "match_reason": reason
            })

        sku_map = {}
        for r in roi_details:
            code = r.get("extracted_sku")
            if not code:
                continue
            code_clean = str(code).strip("-:;,. #*!_/")
            if exp_sku_clean:
                code_clean = LabelDataParser.calibrate_sku_with_expected(code_clean, [exp_sku_clean])
            ori_type = r.get("orientation", "horizontal")
            cat_label = "Top nóc" if ori_type == "vertical" else "Pallet đứng"
            key = (code_clean, ori_type)
            if key not in sku_map:
                sku_map[key] = {
                    "code": code_clean,
                    "count": 0,
                    "orientation": ori_type,
                    "category_label": cat_label
                }
            sku_map[key]["count"] += 1

        detected_skus_detail = []
        for (code, ori_type), info in sorted(sku_map.items(), key=lambda x: -x[1]["count"]):
            is_m = bool(exp_sku_clean and code.upper() == exp_sku_clean)
            if is_m:
                reason = "Khớp CSDL"
            else:
                reason = f"Lệch mã: CSDL là {exp_sku_clean}" if exp_sku_clean else "Không có mã SKU trong CSDL để đối chiếu"

            detected_skus_detail.append({
                "code": code,
                "count": info["count"],
                "is_match": is_m,
                "orientation": ori_type,
                "category_label": info["category_label"],
                "match_reason": reason
            })

        total_sku_detected = sum(s["count"] for s in detected_skus_detail)
        total_lpn_detected = sum(l["count"] for l in detected_lpns_detail)
        missing_lpn_count = max(0, total_sku_detected - total_lpn_detected)
        
        extracted_data["detected_lpns_detail"] = detected_lpns_detail
        extracted_data["detected_skus_detail"] = detected_skus_detail
        extracted_data["package_position"] = package_position
        extracted_data["is_target_vertical"] = is_target_vertical
        extracted_data["package_orientation"] = "vertical" if is_target_vertical else "horizontal"
        extracted_data["package_orientation_label"] = "Kiện để dọc (Top nóc)" if is_target_vertical else "Kiện để ngang (Pallet đứng)"
        extracted_data["missing_lpn_count"] = missing_lpn_count
        if missing_lpn_count > 0:
            extracted_data["missing_lpn_note"] = f"Phát hiện {total_sku_detected} thùng SKU nhưng chỉ đọc được {total_lpn_detected} mã LPN ({missing_lpn_count} thùng còn lại tem LPN bị mờ hoặc bóng lóa)"

        # Xác định engine cụ thể cho LPN và SKU
        if extracted_data.get("lpn"):
            cur_lpn = extracted_data["lpn"]
            if any(((b.get("data") if isinstance(b, dict) else str(b)) == cur_lpn) for b in all_barcodes):
                extracted_data["lpn_engine"] = "1D Barcode (Code128)"
            else:
                matching_tok = next((t for t in all_tokens if cur_lpn in t.get("text", "")), None)
                if matching_tok and matching_tok.get("model_source") == "crnn_custom":
                    extracted_data["lpn_engine"] = "PyTorch CRNN Custom"
                elif matching_tok and matching_tok.get("model_source") == "easyocr_base":
                    extracted_data["lpn_engine"] = "EasyOCR Base"
                else:
                    extracted_data["lpn_engine"] = "EasyOCR Base"
        else:
            extracted_data["lpn_engine"] = "Chưa nhận diện"

        if extracted_data.get("sku"):
            cur_sku = extracted_data["sku"]
            if "Deduction" in str(extracted_data.get("sku_source", "")):
                extracted_data["sku_engine"] = "Suy Luận Quy Cách (Descriptor)"
            elif any(((b.get("data") if isinstance(b, dict) else str(b)) == cur_sku) for b in all_barcodes):
                extracted_data["sku_engine"] = "1D Barcode (UPC)"
            else:
                cur_sku_norm = cur_sku.replace("-", "").upper()
                matching_tok = next((t for t in all_tokens if cur_sku in t.get("text", "") or cur_sku_norm in t.get("text", "").replace("-", "").upper()), None)
                if matching_tok and matching_tok.get("model_source") == "crnn_custom":
                    extracted_data["sku_engine"] = "PyTorch CRNN Custom"
                elif matching_tok and matching_tok.get("model_source") == "easyocr_base":
                    extracted_data["sku_engine"] = "EasyOCR Base"
                else:
                    extracted_data["sku_engine"] = "EasyOCR Base"
        else:
            extracted_data["sku_engine"] = "Chưa nhận diện"

        # Xác định model_source tổng thể của pallet
        all_token_sources = [t.get("model_source") for t in all_tokens if t.get("model_source")]
        if all(s == "crnn_custom" for s in all_token_sources) and all_token_sources:
            extracted_data["model_source_summary"] = "CRNN Custom"
        elif any(s == "crnn_custom" for s in all_token_sources) and any("easyocr" in s for s in all_token_sources):
            extracted_data["model_source_summary"] = "Dual-Engine (CRNN + EasyOCR)"
        else:
            extracted_data["model_source_summary"] = "EasyOCR Base"

        # KHÔNG đồng bộ hóa ngược LPN/SKU từ extracted_data về roi_details:
        # Mỗi tem nhãn chỉ hiển thị đúng thông tin thực sự đọc được trên tem đó.
        # 1 tem không thể vừa có LPN vừa có SKU (tem barcode chỉ có LPN, tem model chỉ có SKU).

        # Tái tạo det_annotated sạch sẽ chỉ chứa các tem nhãn hợp lệ
        if return_images_base64 and roi_details:
            clean_annotated = orig_img.copy()
            for r_item in roi_details:
                b = r_item.get("bbox", [])
                if len(b) == 4:
                    bx, by, bw, bh = b
                    cv2.rectangle(clean_annotated, (bx, by), (bx + bw, by + bh), (30, 220, 30), 2)
                    lbl_txt = f"Tem #{r_item['label_id']}"
                    cv2.putText(clean_annotated, lbl_txt, (bx, max(15, by - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (30, 220, 30), 2)
            det_annotated = clean_annotated

        total_ms = round((time.time() - t_start_total) * 1000, 1)
        time_metrics["total_ms"] = total_ms

        # Chuẩn bị ảnh Base64 trả về cho Frontend UI
        images_payload = {}
        if return_images_base64:
            images_payload = {
                "original_preview": ImagePreprocessor.to_base64(orig_img),
                "detected_label_preview": ImagePreprocessor.to_base64(det_annotated),
                "roi_preview": ImagePreprocessor.to_base64(roi_img),
                "processed_preview": ImagePreprocessor.to_base64(processed_img),
                "ocr_annotated_preview": ImagePreprocessor.to_base64(main_ocr_res["annotated_image"]),
                "full_ocr_annotated_preview": ImagePreprocessor.to_base64(full_ocr_img),
                "step_previews": prep_previews,
                "roi_details": roi_details
            }

        return {
            "success": True,
            "extracted": extracted_data,
            "barcodes": all_barcodes,
            "raw_ocr": {
                "tokens": all_tokens,
                "full_text": " \n ".join([t["text"] for t in all_tokens])
            },
            "detection": {
                "bbox": det_bbox,
                "all_bboxes": [r["bbox"] for r in roi_details] if roi_details else (det_res.get("all_bboxes", [det_bbox]) if auto_crop else [det_bbox]),
                "total_labels": len(roi_details) if roi_details else total_labels_found,
                "confidence": det_conf,
                "method": det_method,
                "auto_rotate_angle": orient_meta.get("applied_angle", 0.0)
            },
            "roi_details": roi_details,
            "model_info": self.ocr_engine.get_model_metadata(active_model_id),
            "device": OcrEngine.get_device_info(),
            "time_metrics": time_metrics,
            "images": images_payload
        }


# Singleton pipeline
_default_pipeline: Optional[AiOcrPipeline] = None

def get_default_pipeline() -> AiOcrPipeline:
    global _default_pipeline
    if _default_pipeline is None:
        _default_pipeline = AiOcrPipeline()
    return _default_pipeline
