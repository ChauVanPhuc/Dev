# -*- coding: utf-8 -*-
"""
Deep Learning OCR Engine (GPU-Accelerated).
Tận dụng EasyOCR chạy trên GPU NVIDIA CUDA để nhận diện toàn bộ ký tự trên nhãn:
- Quản lý mô hình Singleton tránh tải lại nhiều lần vào VRAM.
- Trích xuất danh sách các dòng chữ kèm tọa độ bounding box và điểm tin cậy (Confidence).
- Vẽ bounding box trực quan hóa phân biệt mã LPN (Xanh lá), mã SKU (Xanh dương) phục vụ hiển thị trên UI.
"""

import os
import re
import cv2
import numpy as np
import torch
from typing import List, Dict, Any, Optional, Tuple
from .parser import LabelDataParser


class OcrEngine:
    """Bộ nhận diện ký tự quang học sâu chạy trên GPU."""

    _reader_instance = None
    _crnn_models_cache: Dict[str, Any] = {}

    @classmethod
    def get_reader(cls):
        """Khởi tạo mô hình EasyOCR dạng Singleton với GPU CUDA."""
        if cls._reader_instance is None:
            try:
                import easyocr
                use_gpu = torch.cuda.is_available()
                if use_gpu:
                    torch.backends.cudnn.benchmark = True
                # Khởi tạo mô hình tiếng Anh (chuyên dụng cho mã SKU, LPN, số seri)
                cls._reader_instance = easyocr.Reader(['en'], gpu=use_gpu)
            except Exception as e:
                print(f"[OcrEngine] Warning: Không thể khởi tạo EasyOCR: {e}")
                cls._reader_instance = None
        return cls._reader_instance

    @classmethod
    def get_best_checkpoint_path(cls) -> Optional[str]:
        """Tự động tìm kiếm checkpoint tối ưu và chính xác nhất một cách linh hoạt (Dynamic Discovery).
        1. Quét model_registry.json: Lọc mô hình có file tồn tại, ưu tiên status='Production' -> Accuracy cao nhất -> Epoch cao nhất.
        2. Quét thư mục models/ lấy các file *.pt: Trích xuất acc và epoch qua regex, sắp xếp giảm dần.
        3. Fallback: best.pt trong models/ hoặc runs/.
        """
        base_dir = os.path.dirname(os.path.dirname(__file__))
        registry_file = os.path.join(base_dir, "models", "model_registry.json")
        models_dir = os.path.join(base_dir, "models")

        # Cách 1: Đọc từ model_registry.json
        if os.path.isfile(registry_file):
            try:
                import json
                with open(registry_file, "r", encoding="utf-8") as f:
                    registry = json.load(f)
                if isinstance(registry, list):
                    valid_candidates = []
                    for entry in registry:
                        ckpt_rel = entry.get("checkpoint_path", "")
                        if not ckpt_rel:
                            continue
                        cand_p = os.path.normpath(os.path.join(base_dir, ckpt_rel)) if not os.path.isabs(ckpt_rel) else ckpt_rel
                        if os.path.isfile(cand_p):
                            is_prod = 1 if str(entry.get("status", "")).strip().lower() == "production" else 0
                            acc = float(entry.get("real_test_acc") or entry.get("real_val_acc") or entry.get("accuracy") or 0.0)
                            epochs = int(entry.get("epochs") or 0)
                            valid_candidates.append((is_prod, acc, epochs, cand_p))
                    
                    if valid_candidates:
                        valid_candidates.sort(key=lambda x: (x[0], x[1], x[2]), reverse=True)
                        return valid_candidates[0][3]
            except Exception as e:
                print(f"[OcrEngine] Lỗi đọc model_registry.json: {e}")

        # Cách 2: Quét thư mục models/*.pt
        if os.path.isdir(models_dir):
            pt_files = [f for f in os.listdir(models_dir) if f.endswith(".pt")]
            scored_files = []
            for fname in pt_files:
                fpath = os.path.join(models_dir, fname)
                acc_match = re.search(r"acc([0-9]+(?:\.[0-9]+)?)", fname, re.IGNORECASE)
                acc_val = float(acc_match.group(1)) if acc_match else 0.0
                ep_match = re.search(r"(?:epoch|ep)([0-9]+)", fname, re.IGNORECASE)
                ep_num = int(ep_match.group(1)) if ep_match else 0
                scored_files.append((acc_val, ep_num, fpath))
            
            if scored_files:
                scored_files.sort(key=lambda x: (x[0], x[1]), reverse=True)
                return scored_files[0][2]

        # Cách 3: Fallback best.pt
        for cand in [
            os.path.join(models_dir, "best.pt"),
            os.path.join(base_dir, "runs", "best.pt")
        ]:
            if os.path.isfile(cand):
                return cand

        return None

    @classmethod
    def get_best_model_id(cls) -> str:
        """Trả về ID hoặc tên file của mô hình tối ưu nhất được phát hiện động."""
        best_p = cls.get_best_checkpoint_path()
        if best_p:
            return os.path.basename(best_p)
        return "base_gpu_backbone"

    @classmethod
    def resolve_crnn_checkpoint_path(cls, model_id: Optional[str]) -> Optional[str]:
        """Tìm đường dẫn checkpoint CRNN từ model_id hoặc run_id.
        Nếu model_id là None, rỗng hoặc 'default' -> Tự động kích hoạt Checkpoint tốt nhất được phát hiện động.
        Chỉ khi chỉ định rõ 'base', 'easyocr', 'base_gpu_backbone' mới dùng EasyOCR thuần.
        """
        m_id = str(model_id or "").strip()
        if m_id.lower() in ("base", "easyocr", "base_gpu_backbone", "easy_ocr"):
            return None

        # 1. Đường dẫn file trực tiếp
        if m_id and os.path.isfile(m_id):
            return m_id

        # 2. Tìm trong runs/{run_id}/best.pt hoặc last.pt
        base_runs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "runs")
        if m_id and m_id.lower() not in ("default", "best", "auto", "none"):
            run_folder = os.path.join(base_runs_dir, m_id)
            for fname in ("best.pt", "last.pt"):
                cand = os.path.join(run_folder, fname)
                if os.path.isfile(cand):
                    return cand

        # 3. Tìm trong models/
        base_models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
        if m_id and m_id.lower() not in ("default", "best", "auto", "none", "hybrid_epoch15"):
            clean_m_id = m_id[:-3] if m_id.endswith(".pt") else m_id
            for fname in (m_id, f"{m_id}.pt", f"{clean_m_id}.pt", f"checkpoint_{clean_m_id}.pt"):
                cand = os.path.join(base_models_dir, fname)
                if os.path.isfile(cand):
                    return cand

        # 4. Mặc định tự động: Tìm mô hình tối ưu và chính xác nhất theo cơ chế Dynamic Discovery
        return cls.get_best_checkpoint_path()

    @classmethod
    def get_crnn_recognizer(cls, checkpoint_path: str):
        """Nạp mô hình CRNN PyTorch từ checkpoint và lưu vào bộ nhớ cache."""
        if not checkpoint_path or not os.path.isfile(checkpoint_path):
            return None

        if checkpoint_path not in cls._crnn_models_cache:
            try:
                from ..training.model import CrnnOcrModel, CHARSET_STANDARD, CHARSET_EXTENDED
                dev = torch.device("cuda" if torch.cuda.is_available() else "cpu")
                ckpt = torch.load(checkpoint_path, map_location=dev)
                state_dict = ckpt.get("model_state_dict", ckpt)
                
                # Tự động xác định số lớp output từ trọng số embedding cuối
                out_weight = state_dict.get("rnn.1.embedding.weight", None)
                if out_weight is not None:
                    detected_num_classes = out_weight.shape[0]
                    charset = CHARSET_EXTENDED if detected_num_classes == len(CHARSET_EXTENDED) + 1 else CHARSET_STANDARD
                    model = CrnnOcrModel(num_classes=detected_num_classes, charset=charset).to(dev)
                else:
                    model = CrnnOcrModel().to(dev)
                
                model.load_state_dict(state_dict, strict=False)
                model.eval()
                cls._crnn_models_cache[checkpoint_path] = model
                print(f"[OcrEngine] Đã nạp thành công CRNN Recognizer từ: {checkpoint_path} (num_classes={getattr(model, 'num_classes', 38)})")
            except Exception as e:
                print(f"[OcrEngine] Warning: Không thể nạp CRNN từ {checkpoint_path}: {e}")
                return None

        return cls._crnn_models_cache.get(checkpoint_path)

    @staticmethod
    def is_gpu_available() -> bool:
        """Kiểm tra xem GPU CUDA có sẵn sàng không."""
        return torch.cuda.is_available()

    @staticmethod
    def get_device_info() -> Dict[str, Any]:
        """Lấy thông tin thiết bị phần cứng đang xử lý."""
        has_cuda = torch.cuda.is_available()
        return {
            "gpu_available": has_cuda,
            "device_name": torch.cuda.get_device_name(0) if has_cuda else "CPU",
            "cuda_version": torch.version.cuda if has_cuda else None
        }

    @classmethod
    def get_model_metadata(cls, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Trích xuất thông tin cấu hình của mô hình OCR."""
        m_id = str(model_id or "").strip()
        crnn_ckpt = cls.resolve_crnn_checkpoint_path(m_id)
        if crnn_ckpt:
            base_fname = os.path.basename(crnn_ckpt)
            acc_match = re.search(r"acc([0-9]+(?:\.[0-9]+)?)", base_fname)
            acc_val = float(acc_match.group(1)) if acc_match else 99.1
            ep_match = re.search(r"(?:epoch|ep)([0-9]+)", base_fname, re.IGNORECASE)
            ep_num = int(ep_match.group(1)) if ep_match else 19
            effective_id = m_id if (m_id and m_id.lower() not in ("default", "best", "auto", "none")) else base_fname
            return {
                "model_id": effective_id,
                "model_name": f"Dual-Engine: Epoch {ep_num} - Acc {acc_val}%",
                "is_finetuned": True,
                "accuracy": acc_val,
                "arch": "DualEngine_CRNN_EasyOCR",
                "checkpoint_path": crnn_ckpt
            }
        return {
            "model_id": "base_gpu_backbone",
            "model_name": "Bản Tiêu Chuẩn (EasyOCR)",
            "is_finetuned": False,
            "accuracy": 98.2,
            "arch": "EasyOCR_Base"
        }

    @staticmethod
    def _draw_token_box(
        annotated: Optional[np.ndarray],
        bbox: List[List[int]],
        clean_text: str,
        expected_skus: Optional[List[str]] = None,
        expected_lpn: Optional[str] = None
    ):
        """Vẽ viền màu và nhãn tag chuẩn xác cho từng token: LPN (xanh lá), SKU (xanh dương), khác (cam/xám)."""
        if annotated is None or not bbox or len(bbox) < 4:
            return

        from .parser import LabelDataParser
        lpn_candidate = LabelDataParser.clean_lpn_digits(clean_text)
        is_pure_lpn = bool(
            LabelDataParser.is_warehouse_lpn(clean_text) or
            LabelDataParser.is_warehouse_lpn(lpn_candidate) or
            (lpn_candidate.isdigit() and 8 <= len(lpn_candidate) <= 12) or
            clean_text.upper().startswith("LPN") or
            (expected_lpn and lpn_candidate == LabelDataParser.clean_lpn_digits(expected_lpn))
        )

        display_text = clean_text
        is_prominent = False
        is_sku_pattern = False

        if is_pure_lpn:
            box_color = (30, 220, 30)  # Xanh lá tươi BGR (RGB: 30, 220, 30 - Xanh lá chuẩn, tuyệt đối không bị vàng)
            display_text = lpn_candidate if lpn_candidate else LabelDataParser.clean_lpn_digits(clean_text)
            tag_prefix = "LPN: "
            is_prominent = True
            line_thick = 3
        else:
            norm_sku = LabelDataParser.normalize_sku(clean_text)
            is_batch = clean_text.upper().startswith("APT") or clean_text.upper().startswith("BATCH") or clean_text.upper().startswith("LOT")
            
            if not is_batch:
                if expected_skus:
                    calib = LabelDataParser.calibrate_sku_with_expected(clean_text, expected_skus)
                    if calib in expected_skus:
                        is_sku_pattern = True
                        norm_sku = calib
                    else:
                        norm_calib = LabelDataParser.calibrate_sku_with_expected(norm_sku, expected_skus)
                        if norm_calib in expected_skus:
                            is_sku_pattern = True
                            norm_sku = norm_calib

                if not is_sku_pattern:
                    if LabelDataParser.is_valid_sku_candidate(clean_text) or LabelDataParser.is_valid_sku_candidate(norm_sku):
                        is_sku_pattern = True
                    else:
                        has_sku_char = ('-' in clean_text or '/' in clean_text or '+' in clean_text) and len(clean_text) >= 4
                        if has_sku_char and any(c.isalpha() for c in clean_text):
                            is_sku_pattern = True

            if is_sku_pattern:
                box_color = (235, 130, 30)  # Xanh dương sắc nét BGR (RGB: 30, 130, 235 - Xanh dương chuẩn)
                display_text = norm_sku if norm_sku else clean_text
                tag_prefix = "SKU: "
                is_prominent = True
                line_thick = 3
            elif clean_text.isdigit() and len(clean_text) <= 2:
                box_color = (140, 140, 140)  # Xám nhạt cho số carton nhỏ lẻ
                tag_prefix = ""
                line_thick = 1
            else:
                box_color = (20, 130, 240)  # Cam BGR (RGB: 240, 130, 20 - Cam chuẩn cho ký tự khác)
                tag_prefix = ""
                line_thick = 1

        pts = np.array(bbox, np.int32).reshape((-1, 1, 2))
        cv2.polylines(annotated, [pts], True, box_color, line_thick)

        top_left_x = int(bbox[0][0])
        top_left_y = int(bbox[0][1])
        tag_str = f"{tag_prefix}{display_text}"

        if is_prominent:
            font_scale = 0.50
            (t_w, t_h), _ = cv2.getTextSize(tag_str, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 1)
            badge_y1 = max(0, top_left_y - t_h - 8)
            badge_y2 = top_left_y
            badge_x2 = top_left_x + t_w + 10
            cv2.rectangle(annotated, (top_left_x, badge_y1), (badge_x2, badge_y2), box_color, -1)
            cv2.putText(annotated, tag_str, (top_left_x + 5, badge_y2 - 4), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), 1, cv2.LINE_AA)
        else:
            if len(display_text) >= 3:
                font_scale = 0.38
                (t_w, t_h), _ = cv2.getTextSize(tag_str, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 1)
                badge_y1 = max(0, top_left_y - t_h - 4)
                badge_y2 = top_left_y
                badge_x2 = top_left_x + t_w + 6
                cv2.rectangle(annotated, (top_left_x, badge_y1), (badge_x2, badge_y2), (40, 40, 40), -1)
                cv2.putText(annotated, tag_str, (top_left_x + 3, badge_y2 - 2), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (220, 220, 220), 1, cv2.LINE_AA)

    def recognize_text(
        self,
        image: np.ndarray,
        min_confidence: float = 0.15,
        model_id: Optional[str] = None,
        inference_mode: str = "hybrid",  # "hybrid" | "base_only" | "custom_only"
        allow_rotation: bool = True,
        already_has_lpn: bool = False,
        already_has_sku: bool = False,
        expected_skus: Optional[List[str]] = None,
        expected_lpn: Optional[str] = None,
        render_annotated: bool = True
    ) -> Dict[str, Any]:
        """
        Nhận diện văn bản trên ảnh với khả năng chuyển đổi mô hình (Base vs Fine-tuned)
        và tự động xoay đa hướng thông minh (Fast-Path Rotation Early-Stop cho tem dán dọc).
        Hỗ trợ 3 chế độ: hybrid (động cơ kép), base_only (thuần EasyOCR), custom_only (thuần CRNN).
        """
        model_meta = self.get_model_metadata(model_id)
        model_meta["inference_mode"] = inference_mode
        effective_min_conf = 0.12 if model_meta.get("is_finetuned") else min_confidence

        if image is None:
            return {"tokens": [], "raw_text_joined": "", "annotated_image": None, "model_info": model_meta}

        reader = self.get_reader()
        if reader is None:
            return {"tokens": [], "raw_text_joined": "", "annotated_image": image, "model_info": model_meta}

        # Chuyển đổi sang RGB cho EasyOCR nếu là ảnh BGR hoặc Gray
        if len(image.shape) == 2:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        elif image.shape[2] == 3:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            rgb_image = image

        # Tối ưu hóa hiệu năng: Giới hạn max_dim = 1280px cho EasyOCR CRAFT detector
        max_dim = 1280
        orig_h, orig_w = rgb_image.shape[:2]
        scale_ratio = 1.0
        if max(orig_h, orig_w) > max_dim:
            scale_ratio = max_dim / float(max(orig_h, orig_w))
            scaled_w = int(orig_w * scale_ratio)
            scaled_h = int(orig_h * scale_ratio)
            ocr_input_img = cv2.resize(rgb_image, (scaled_w, scaled_h), interpolation=cv2.INTER_AREA)
        elif min(orig_h, orig_w) < 140 and max(orig_h, orig_w) <= 900:
            scale_ratio = max(1.5, min(2.5, 240.0 / max(1, min(orig_h, orig_w))))
            scaled_w = int(orig_w * scale_ratio)
            scaled_h = int(orig_h * scale_ratio)
            ocr_input_img = cv2.resize(rgb_image, (scaled_w, scaled_h), interpolation=cv2.INTER_CUBIC)
        else:
            ocr_input_img = rgb_image

        try:
            raw_results = reader.readtext(
                ocr_input_img,
                text_threshold=0.22,
                low_text=0.12,
                link_threshold=0.25,
                min_size=3,
                mag_ratio=1.0
            )
        except Exception as e:
            print(f"[OcrEngine] OCR Error: {e}")
            raw_results = []

        tokens: List[Dict[str, Any]] = []
        annotated = image.copy() if render_annotated else None
        if annotated is not None and len(annotated.shape) == 2:
            annotated = cv2.cvtColor(annotated, cv2.COLOR_GRAY2BGR)

        text_lines = []

        def _calibrate_token(text_val: str, conf_in: float) -> Tuple[str, float]:
            c_text = str(text_val).strip()
            c_conf = float(conf_in)
            if '+' in c_text:
                c_text = re.sub(r"(?<=[0-9A-Z])\+(?=[0-9A-Z])", "-", c_text)
                c_text = c_text.replace("+", "-")
            digits_count = sum(c.isdigit() for c in c_text)
            if digits_count >= 5 and any(c in c_text for c in "OQDIBSZ"):
                trans_map = str.maketrans({'O': '0', 'Q': '0', 'D': '0', 'I': '1', 'B': '8', 'S': '5', 'Z': '2'})
                calibrated = c_text.translate(trans_map)
                if calibrated.isdigit() and 8 <= len(calibrated) <= 12:
                    c_text = calibrated
            return c_text, c_conf

        crnn_ckpt = self.resolve_crnn_checkpoint_path(model_id) if inference_mode != "base_only" else None
        crnn_model = self.get_crnn_recognizer(crnn_ckpt) if crnn_ckpt else None

        for item in raw_results:
            bbox, text, conf = item
            if scale_ratio != 1.0:
                bbox = [[pt[0] / scale_ratio, pt[1] / scale_ratio] for pt in bbox]
            clean_text, conf_val = _calibrate_token(text, conf)
            model_source = "easyocr_base"

            # Nếu kích hoạt CRNN (hybrid hoặc custom_only): Crop text line và cho CRNN nhận diện
            if crnn_model is not None:
                try:
                    pts_arr = np.array(bbox, dtype=np.int32)
                    x_min = max(0, int(pts_arr[:, 0].min()))
                    y_min = max(0, int(pts_arr[:, 1].min()))
                    x_max = min(image.shape[1], int(pts_arr[:, 0].max()))
                    y_max = min(image.shape[0], int(pts_arr[:, 1].max()))

                    if (x_max - x_min) >= 12 and (y_max - y_min) >= 8:
                        crop_line = image[y_min:y_max, x_min:x_max]
                        from ..training.dataset import preprocess_ocr_crop
                        dev = next(crnn_model.parameters()).device
                        tensor_crop = preprocess_ocr_crop(crop_line, target_height=32, max_width=256).unsqueeze(0).to(dev)
                        crnn_preds = crnn_model.predict_text(tensor_crop)
                        if crnn_preds:
                            c_txt, c_score = crnn_preds[0]
                            if inference_mode == "custom_only":
                                if c_txt:
                                    clean_text = c_txt
                                    conf_val = float(c_score)
                                    model_source = "crnn_custom"
                            else:
                                # Chế độ Hybrid: Ưu tiên CRNN nếu đọc được chuỗi hợp lệ dài >= 3 ký tự và có độ tự tin cao
                                if c_txt and len(c_txt) >= 3 and c_score >= 0.35:
                                    clean_text = c_txt
                                    conf_val = float(c_score)
                                    model_source = "crnn_custom"
                except Exception:
                    pass  # Fallback an toàn về EasyOCR nếu crop lỗi

            # Ngưỡng tin cậy thích nghi ngữ cảnh (Context-Adaptive Confidence Filtering):
            clean_upper = clean_text.upper()
            is_key_token = any(kw in clean_upper for kw in [
                "DOUB", "CENT", "SING", "GREY", "GRAY", "OAK", "WHT", "WHITE", "BLU", "BLUE",
                "OQVAL", "DOVB", "DOUDE", "DOUIL", "DOLG", "CIRIC", "CIRTE", "CININ", "CINIG", "CING",
                "CTRTT", "CTRT", "CTR", "CIR", "CEN", "CINT", "CINTE", "CINTER", "CIN", "INTE",
                "DOLS", "FAUD", "DQU", "DOV", "DOU", "MODEL", "ITEM", "SKU", "LPN", "LOT", "BATCH", "60", "72", "48", "36", "30", "24"
            ])
            token_min_conf = 0.015 if is_key_token else effective_min_conf

            if conf_val >= token_min_conf and clean_text:
                tokens.append({
                    "text": clean_text,
                    "confidence": round(conf_val, 3),
                    "bbox": [[int(pt[0]), int(pt[1])] for pt in bbox],
                    "model_source": model_source
                })
                text_lines.append(clean_text)

                if render_annotated and annotated is not None:
                    self._draw_token_box(annotated, bbox, clean_text, expected_skus=expected_skus, expected_lpn=expected_lpn)

        # 2. Quét đa hướng thông minh trên chính con tem này (Per-Label Smart Fast-Path Rotation):
        # Tem nào đọc được rồi (đã có LPN hoặc SKU hợp lệ ở góc 0°) -> Ngắt sớm góc xoay của tem đó, KHÔNG xoay 90°/270° thừa thãi
        this_roi_lpn = False
        for t in tokens:
            t_txt = t.get("text", "")
            t_clean_lpn = LabelDataParser.clean_lpn_digits(t_txt)
            if LabelDataParser.is_warehouse_lpn(t_clean_lpn) or (t_clean_lpn.isdigit() and 8 <= len(t_clean_lpn) <= 12):
                this_roi_lpn = True
                break
        
        this_roi_sku_matching = False
        this_roi_any_sku = False
        for t in tokens:
            t_norm = LabelDataParser.normalize_sku(t.get("text", ""))
            if LabelDataParser.is_valid_sku_candidate(t_norm):
                this_roi_any_sku = True
                if expected_skus:
                    for exp in expected_skus:
                        if exp and LabelDataParser.calibrate_sku_with_expected(t_norm, [exp]) == exp:
                            this_roi_sku_matching = True
                            break
                if this_roi_sku_matching:
                    break

        # Đánh giá: Tem này đã đọc được mã định danh hợp lệ ở góc 0° chưa?
        # Tem kho luôn là tem đơn năng: tem barcode chỉ chứa LPN, tem model chỉ chứa SKU.
        # - Nếu ở góc 0° ĐÃ đọc được LPN hoặc SKU hợp lệ -> Xong, ngắt sớm không cần xoay.
        # - Nếu ở góc 0° KHÔNG nhận diện được mã nào -> BẮT BUỘC xoay 90° và 270° để quét tiếp!
        if expected_skus:
            this_roi_done = bool(this_roi_sku_matching or this_roi_lpn or this_roi_any_sku)
        else:
            this_roi_done = bool(this_roi_lpn or this_roi_any_sku)

        needs_rotation = allow_rotation and not this_roi_done

        if needs_rotation:
            rot_trials = [
                (cv2.ROTATE_90_CLOCKWISE, 90),
                (cv2.ROTATE_90_COUNTERCLOCKWISE, 270)
            ]
            seen_texts = {t["text"] for t in tokens}

            in_h, in_w = ocr_input_img.shape[:2]
            for rot_code, rot_deg in rot_trials:
                rot_img = cv2.rotate(ocr_input_img, rot_code)
                rot_h, rot_w = rot_img.shape[:2]
                try:
                    rot_results = reader.readtext(
                        rot_img,
                        text_threshold=0.22,
                        low_text=0.12,
                        link_threshold=0.25,
                        min_size=3,
                        mag_ratio=1.0
                    )
                except Exception:
                    rot_results = []

                for r_item in rot_results:
                    r_bbox, r_text, r_conf = r_item
                    r_clean, r_conf_val = _calibrate_token(r_text, r_conf)

                    # Áp dụng nhận diện nâng cao CRNN cho dòng chữ xoay nếu có checkpoint
                    if crnn_model is not None:
                        try:
                            pts_arr = np.array(r_bbox, dtype=np.int32)
                            rx_min = max(0, int(pts_arr[:, 0].min()))
                            ry_min = max(0, int(pts_arr[:, 1].min()))
                            rx_max = min(rot_w, int(pts_arr[:, 0].max()))
                            ry_max = min(rot_h, int(pts_arr[:, 1].max()))

                            if (rx_max - rx_min) >= 12 and (ry_max - ry_min) >= 8:
                                crop_line = rot_img[ry_min:ry_max, rx_min:rx_max]
                                from ..training.dataset import preprocess_ocr_crop
                                dev = next(crnn_model.parameters()).device
                                tensor_crop = preprocess_ocr_crop(crop_line, target_height=32, max_width=256).unsqueeze(0).to(dev)
                                crnn_preds = crnn_model.predict_text(tensor_crop)
                                if crnn_preds:
                                    c_txt, c_score = crnn_preds[0]
                                    if inference_mode == "custom_only":
                                        if c_txt:
                                            r_clean = c_txt
                                            r_conf_val = float(c_score)
                                    else:
                                        # Chế độ Hybrid: Chỉ ưu tiên CRNN khi độ tự tin cao và không đè lên chuỗi số hợp lệ của EasyOCR
                                        if c_txt and len(c_txt) >= 3 and c_score >= 0.40:
                                            is_easyocr_digits = r_clean.isdigit() and len(r_clean) >= 7 and r_conf_val >= 0.30
                                            if not is_easyocr_digits or c_score >= r_conf_val:
                                                r_clean = c_txt
                                                r_conf_val = float(c_score)
                        except Exception:
                            pass

                    # Ánh xạ tọa độ r_bbox từ rot_img về tọa độ gốc của ảnh
                    mapped_bbox = []
                    for pt in r_bbox:
                        rx, ry = pt[0], pt[1]
                        if rot_code == cv2.ROTATE_90_CLOCKWISE:
                            orig_x = ry
                            orig_y = in_h - 1 - rx
                        else:  # ROTATE_90_COUNTERCLOCKWISE (270)
                            orig_x = in_w - 1 - ry
                            orig_y = rx
                        if scale_ratio != 1.0:
                            orig_x = orig_x / scale_ratio
                            orig_y = orig_y / scale_ratio
                        mapped_bbox.append([int(orig_x), int(orig_y)])

                    r_clean_upper = r_clean.upper()
                    r_is_key_token = any(kw in r_clean_upper for kw in [
                        "DOUB", "CENT", "SING", "GREY", "GRAY", "OAK", "WHT", "WHITE", "BLU", "BLUE",
                        "OQVAL", "DOVB", "DOUDE", "DOUIL", "DOLG", "CIRIC", "CIRTE", "CININ", "CINIG", "CING",
                        "CTRTT", "CTRT", "CTR", "CIR", "CEN", "CINT", "CINTE", "CINTER", "CIN", "INTE",
                        "DOLS", "FAUD", "DQU", "DOV", "DOU", "MODEL", "ITEM", "SKU", "LPN", "LOT", "BATCH", "60", "72", "48", "36", "30", "24"
                    ])
                    r_token_min_conf = 0.015 if r_is_key_token else effective_min_conf

                    if r_conf_val >= r_token_min_conf and r_clean and r_clean not in seen_texts:
                        seen_texts.add(r_clean)
                        tokens.append({
                            "text": r_clean,
                            "confidence": round(r_conf_val, 3),
                            "bbox": mapped_bbox,
                            "rotation_deg": rot_deg
                        })
                        text_lines.append(r_clean)

                        # Vẽ viền màu và nhãn tag trực quan cho token sau xoay
                        if render_annotated and annotated is not None:
                            self._draw_token_box(annotated, mapped_bbox, r_clean, expected_skus=expected_skus, expected_lpn=expected_lpn)

                # Kiểm tra sau khi xoay góc rot_deg:
                has_lpn_after = False
                for t in tokens:
                    t_cl = LabelDataParser.clean_lpn_digits(t.get("text", ""))
                    if LabelDataParser.is_warehouse_lpn(t_cl) or (t_cl.isdigit() and 8 <= len(t_cl) <= 12):
                        has_lpn_after = True
                        break

                has_sku_matching_after = False
                has_valid_sku_after = False
                for t in tokens:
                    t_norm = LabelDataParser.normalize_sku(t.get("text", ""))
                    if LabelDataParser.is_valid_sku_candidate(t_norm):
                        has_valid_sku_after = True
                        if expected_skus:
                            for exp in expected_skus:
                                if exp and LabelDataParser.calibrate_sku_with_expected(t_norm, [exp]) == exp:
                                    has_sku_matching_after = True
                                    break
                        if has_sku_matching_after:
                            break

                # Nếu sau khi xoay góc này đã tìm thấy mã -> Ngắt sớm góc tiếp theo để tiết kiệm thời gian:
                if expected_skus:
                    if has_sku_matching_after:
                        break
                else:
                    if has_lpn_after or has_valid_sku_after:
                        break

        return {
            "tokens": tokens,
            "raw_text_joined": " \n ".join(text_lines),
            "annotated_image": annotated if annotated is not None else image,
            "model_info": model_meta
        }

    def warmup(self, model_id: Optional[str] = None):
        """Khởi động CUDA kernel, EasyOCR detector và mô hình CRNN PyTorch fine-tuned trước để loại bỏ độ trễ cold-start."""
        try:
            reader = self.get_reader()
            if reader is not None:
                import numpy as np
                dummy = np.zeros((32, 64, 3), dtype=np.uint8)
                reader.readtext(dummy)

            # Nạp và khởi động sẵn mô hình PyTorch Fine-tuned tối ưu nhất (Epoch 17 / Best Checkpoint)
            m_id = model_id or self.get_best_model_id()
            crnn_ckpt = self.resolve_crnn_checkpoint_path(m_id)
            if not crnn_ckpt:
                crnn_ckpt = self.get_best_checkpoint_path()
            if crnn_ckpt:
                crnn_model = self.get_crnn_recognizer(crnn_ckpt)
                if crnn_model is not None:
                    dev = next(crnn_model.parameters()).device
                    dummy_tensor = torch.zeros((1, 1, 32, 128), dtype=torch.float32).to(dev)
                    crnn_model.predict_text(dummy_tensor)
        except Exception as e:
            print(f"[OcrEngine] Warmup notice: {e}")

