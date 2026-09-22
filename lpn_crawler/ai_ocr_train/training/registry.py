# -*- coding: utf-8 -*-
"""
Model Registry & Training Run Manager.
Quản lý các lần huấn luyện (Runs), lưu trữ siêu dữ liệu, phân loại trạng thái mô hình
(Production, Candidate, Archived, Rejected), và ghi vết chi tiết từng mẫu dự đoán
trên tập kiểm thử thực tế (Real Held-Out Test Set).
"""

import os
import json
import time
from datetime import datetime
from typing import List, Dict, Any, Optional

REGISTRY_FILE = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "models", "model_registry.json"
)
RUNS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "runs"
)
os.makedirs(RUNS_DIR, exist_ok=True)


class ModelRegistry:
    """Quản lý các phiên bản mô hình và kết quả đánh giá thực nghiệm."""

    @classmethod
    def load_registry(cls) -> List[Dict[str, Any]]:
        """Nạp danh sách các model run đã đăng ký."""
        if os.path.isfile(REGISTRY_FILE):
            try:
                with open(REGISTRY_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[ModelRegistry] Error loading registry: {e}")
        return []

    @classmethod
    def list_models(cls) -> List[Dict[str, Any]]:
        """Alias cho load_registry."""
        return cls.load_registry()

    @classmethod
    def save_registry(cls, registry_data: List[Dict[str, Any]]):
        """Lưu danh sách registry xuống đĩa."""
        os.makedirs(os.path.dirname(REGISTRY_FILE), exist_ok=True)
        with open(REGISTRY_FILE, "w", encoding="utf-8") as f:
            json.dump(registry_data, f, ensure_ascii=False, indent=2)

    @classmethod
    def register_run(
        cls,
        run_id: str,
        model_name: str,
        architecture: str = "CRNN (VGG + BiLSTM + CTC)",
        dataset_version: str = "VINA_G7_v2",
        train_manifest: str = "train_v1.json",
        val_manifest: str = "val_v1.json",
        test_manifest: str = "test_lockbox_v1.json",
        real_train_count: int = 0,
        synth_train_count: int = 0,
        synth_ratio: float = 0.0,
        real_val_count: int = 0,
        real_test_count: int = 0,
        epochs: int = 10,
        batch_size: int = 16,
        learning_rate: float = 1e-4,
        scheduler: str = "CosineAnnealingLR",
        best_epoch: int = 1,
        train_loss: float = 0.0,
        val_loss: float = 0.0,
        char_accuracy: float = 0.0,
        cer: float = 0.0,
        seq_exact_match: float = 0.0,
        val_lpn_exact: float = 0.0,
        val_sku_exact: float = 0.0,
        val_both_correct_e2e: float = 0.0,
        test_lpn_exact: Optional[float] = None,
        test_sku_exact: Optional[float] = None,
        test_both_correct_e2e: Optional[float] = None,
        duration_seconds: float = 0.0,
        gpu: str = "NVIDIA GeForce RTX 4060 Laptop GPU",
        peak_vram_mb: float = 0.0,
        checkpoint_path: str = "",
        status: str = "Candidate",
        notes: str = ""
    ) -> Dict[str, Any]:
        """Đăng ký một model run mới vào Registry với 3 tầng metric chuẩn hóa."""
        registry = cls.load_registry()

        # Kiểm tra điều kiện tự động: nếu test_both_correct_e2e >= 98% thì đánh dấu Eligible for Production
        if test_both_correct_e2e is not None and test_both_correct_e2e >= 98.0 and status == "Candidate":
            status = "Eligible for Production"

        # Nếu model mới được kích hoạt là Production, chuyển model Production cũ thành Archived
        if status == "Production":
            for m in registry:
                if m.get("status") == "Production":
                    m["status"] = "Archived"

        record = {
            "run_id": run_id,
            "model_name": model_name,
            "architecture": architecture,
            "dataset_version": dataset_version,
            "train_manifest": train_manifest,
            "val_manifest": val_manifest,
            "test_manifest": test_manifest,
            "real_train_count": real_train_count,
            "synth_train_count": synth_train_count,
            "synth_ratio": round(synth_ratio, 2),
            "real_val_count": real_val_count,
            "real_test_count": real_test_count,
            "epochs": epochs,
            "batch_size": batch_size,
            "learning_rate": learning_rate,
            "scheduler": scheduler,
            "best_epoch": best_epoch,
            "train_loss": round(train_loss, 4),
            "val_loss": round(val_loss, 4),
            # Tầng 1: Recognizer Metrics
            "char_accuracy": round(char_accuracy, 2),
            "cer": round(cer, 2),
            "seq_exact_match": round(seq_exact_match, 2),
            # Tầng 2: Real Validation Metrics
            "val_lpn_exact": round(val_lpn_exact, 2),
            "val_sku_exact": round(val_sku_exact, 2),
            "val_both_correct_e2e": round(val_both_correct_e2e, 2),
            # Tầng 3: Official Test Lockbox (Chỉ có sau khi chạy Final Test)
            "test_lpn_exact": round(test_lpn_exact, 2) if test_lpn_exact is not None else None,
            "test_sku_exact": round(test_sku_exact, 2) if test_sku_exact is not None else None,
            "test_both_correct_e2e": round(test_both_correct_e2e, 2) if test_both_correct_e2e is not None else None,
            "duration_seconds": round(duration_seconds, 1),
            "gpu": gpu,
            "peak_vram_mb": round(peak_vram_mb, 1),
            "checkpoint_path": checkpoint_path,
            "status": status,
            "notes": notes,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        # Cập nhật nếu run_id đã có, hoặc thêm mới
        idx = next((i for i, r in enumerate(registry) if r["run_id"] == run_id), -1)
        if idx >= 0:
            registry[idx] = record
        else:
            registry.append(record)

        cls.save_registry(registry)
        return record

    @classmethod
    def set_model_status(cls, run_id: str, new_status: str) -> bool:
        """Cập nhật trạng thái của model: Production | Eligible for Production | Candidate | Archived | Rejected."""
        allowed = ("Production", "Eligible for Production", "Candidate", "Archived", "Rejected")
        if new_status not in allowed:
            raise ValueError(f"Trạng thái không hợp lệ: {new_status}. Phải là một trong {allowed}")

        registry = cls.load_registry()
        target = None
        for m in registry:
            if m.get("run_id") == run_id:
                target = m
                break

        if not target:
            return False

        if new_status == "Production":
            for m in registry:
                if m.get("status") == "Production":
                    m["status"] = "Archived"

        target["status"] = new_status
        cls.save_registry(registry)
        return True

    @classmethod
    def get_production_model(cls) -> Optional[Dict[str, Any]]:
        """Lấy model đang được gán quyền Production."""
        registry = cls.load_registry()
        for m in registry:
            if m.get("status") == "Production":
                return m
        return registry[0] if registry else None

    @classmethod
    def save_run_predictions(cls, run_id: str, predictions: List[Dict[str, Any]]):
        """Lưu chi tiết dự đoán từng ảnh cho một Run cụ thể."""
        run_folder = os.path.join(RUNS_DIR, run_id)
        os.makedirs(run_folder, exist_ok=True)
        pred_file = os.path.join(run_folder, "predictions.json")
        with open(pred_file, "w", encoding="utf-8") as f:
            json.dump(predictions, f, ensure_ascii=False, indent=2)

    @classmethod
    def load_run_predictions(
        cls,
        run_id: str,
        filter_type: Optional[str] = "all"
    ) -> Dict[str, Any]:
        """
        Nạp danh sách dự đoán và lọc theo tiêu chí:
        filter_type: all | correct | wrong_lpn | wrong_sku | both_wrong | low_conf | real | synthetic
        """
        run_folder = os.path.join(RUNS_DIR, run_id)
        pred_file = os.path.join(run_folder, "predictions.json")
        if not os.path.isfile(pred_file):
            return {"run_id": run_id, "total": 0, "predictions": [], "error_analysis": {}}

        with open(pred_file, "r", encoding="utf-8") as f:
            all_preds = json.load(f)

        filtered = []
        error_counts = {
            "0_vs_O": 0,
            "1_vs_I_L": 0,
            "5_vs_S": 0,
            "8_vs_B": 0,
            "char_missing": 0,
            "char_extra": 0,
            "wrong_hyphen": 0,
            "blurry": 0,
            "glare": 0,
            "perspective": 0,
            "barcode_confusion": 0,
            "small_label": 0,
            "crop_cut": 0
        }

        correct_count = 0
        wrong_lpn_count = 0
        wrong_sku_count = 0
        both_wrong_count = 0

        for p in all_preds:
            is_lpn = p.get("is_lpn_match", False)
            is_sku = p.get("is_sku_match", False)
            is_both = is_lpn and is_sku
            conf = float(p.get("confidence", 0.0))
            is_synth = bool(p.get("source_type") == "synthetic")

            if is_both:
                correct_count += 1
            elif not is_lpn and not is_sku:
                both_wrong_count += 1
            elif not is_lpn:
                wrong_lpn_count += 1
            elif not is_sku:
                wrong_sku_count += 1

            # Thống kê phân loại lỗi (Error Analysis)
            err_cat = p.get("error_category")
            if err_cat and err_cat in error_counts:
                error_counts[err_cat] += 1

            # Kiểm tra bộ lọc
            if filter_type == "correct" and not is_both:
                continue
            elif filter_type == "wrong_lpn" and is_lpn:
                continue
            elif filter_type == "wrong_sku" and is_sku:
                continue
            elif filter_type == "both_wrong" and (is_lpn or is_sku):
                continue
            elif filter_type == "low_conf" and conf >= 0.80:
                continue
            elif filter_type == "real" and is_synth:
                continue
            elif filter_type == "synthetic" and not is_synth:
                continue

            filtered.append(p)

        return {
            "run_id": run_id,
            "total_evaluated": len(all_preds),
            "total_filtered": len(filtered),
            "summary": {
                "both_correct": correct_count,
                "wrong_lpn": wrong_lpn_count,
                "wrong_sku": wrong_sku_count,
                "both_wrong": both_wrong_count,
                "both_correct_pct": round((correct_count / len(all_preds) * 100), 1) if all_preds else 0.0
            },
            "error_analysis": error_counts,
            "predictions": filtered
        }
