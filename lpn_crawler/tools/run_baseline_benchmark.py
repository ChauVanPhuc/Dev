# -*- coding: utf-8 -*-
"""
Canonical Original EasyOCR Baseline Benchmark Runner.
Chạy đo lường trung thực pipeline ban đầu trên dev_benchmark_v1.json:
Real Full Image -> LabelDetector -> AutoOrient -> EasyOCR (CRAFT + CTC) -> LabelDataParser -> LPN / SKU.
Lưu kết quả chuẩn hóa vào benchmarks/baseline_v1/:
- summary.json
- predictions.json
- timing.json
- config.json
"""

import os
import sys
import time
import json
import argparse
import numpy as np
import multiprocessing as mp
from datetime import datetime
from typing import Dict, Any, List

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ai_ocr_train.core.pipeline import AiOcrPipeline


def determine_status(lpn: str, sku: str, conf: float, sku_is_predicted: bool = False, sku_is_validated: bool = False) -> str:
    """Xác định trạng thái theo chuẩn hệ thống: success, review, failed."""
    has_lpn = bool(lpn and str(lpn).strip())
    has_sku = bool(sku and str(sku).strip())
    
    if has_lpn and has_sku and conf >= 0.80 and (not sku_is_predicted or sku_is_validated):
        return "success"
    elif has_lpn or has_sku:
        return "review"
    else:
        return "failed"


def worker_proc(worker_id: int, sample_slice: List[Dict[str, Any]], out_queue: mp.Queue):
    """Worker process chạy pipeline trên một phần dataset."""
    try:
        pipeline = AiOcrPipeline(recognizer_mode="easyocr")
        
        # Warmup on first sample
        if sample_slice:
            first_path = sample_slice[0].get("absolute_path")
            if first_path and os.path.isfile(first_path):
                try:
                    pipeline.process(first_path, return_images_base64=False)
                except Exception:
                    pass

        results = []
        for idx, sample in enumerate(sample_slice):
            img_path = sample.get("absolute_path")
            gt_lpn = str(sample.get("gt_lpn") or sample.get("lpn") or "").strip()
            gt_sku = str(sample.get("gt_sku") or sample.get("sku") or "").strip()
            image_id = sample.get("image_id", f"img_{worker_id}_{idx}")
            container_id = sample.get("container_id", "unknown")

            t0 = time.time()
            error_type = "NONE"
            pred_lpn = ""
            pred_sku = ""
            conf = 0.0
            status = "failed"

            try:
                res = pipeline.process(img_path, return_images_base64=False)
                proc_time_ms = round((time.time() - t0) * 1000, 1)

                ext = res.get("extracted", {})
                pred_lpn = str(res.get("lpn") or ext.get("lpn") or "").strip()
                pred_sku = str(res.get("sku") or ext.get("sku") or "").strip()
                conf = round(float(res.get("confidence") or ext.get("overall_confidence", 0.0)), 3)

                sku_is_pred = bool(ext.get("sku_is_predicted", False))
                sku_is_val = bool(ext.get("sku_is_validated", False))

                status = determine_status(pred_lpn, pred_sku, conf, sku_is_pred, sku_is_val)

            except Exception as e:
                proc_time_ms = round((time.time() - t0) * 1000, 1)
                error_type = f"EXCEPTION: {str(e)[:100]}"
                status = "failed"

            lpn_correct = bool(pred_lpn and pred_lpn == gt_lpn)
            sku_correct = bool(pred_sku and pred_sku == gt_sku)
            both_correct = bool(lpn_correct and sku_correct)

            if not both_correct and error_type == "NONE":
                errs = []
                if not lpn_correct:
                    errs.append("LPN_MISMATCH" if pred_lpn else "LPN_MISSING")
                if not sku_correct:
                    errs.append("SKU_MISMATCH" if pred_sku else "SKU_MISSING")
                error_type = "; ".join(errs)

            record = {
                "image_id": image_id,
                "image_path": img_path,
                "container_id": container_id,
                "gt_lpn": gt_lpn,
                "pred_lpn": pred_lpn,
                "gt_sku": gt_sku,
                "pred_sku": pred_sku,
                "lpn_correct": lpn_correct,
                "sku_correct": sku_correct,
                "both_correct": both_correct,
                "status": status,
                "confidence": conf,
                "processing_time_ms": proc_time_ms,
                "detector": "LabelDetector (YOLO / Morphology)",
                "recognizer": "EasyOCR (CRAFT + ResNet/LSTM CTC)",
                "parser_version": "LabelDataParser v2.0",
                "error_type": error_type
            }
            results.append(record)
            out_queue.put(("progress", worker_id, len(results), len(sample_slice), record))

        out_queue.put(("done", worker_id, results))

    except Exception as e:
        out_queue.put(("error", worker_id, str(e)))


def run_benchmark(manifest_path: str, output_dir: str, num_workers: int = 2):
    print("=================================================================")
    print("CHẠY ORIGINAL EASY-OCR BASELINE BENCHMARK")
    print(f"Manifest  : {manifest_path}")
    print(f"Output Dir: {output_dir}")
    print(f"Workers   : {num_workers}")
    print("=================================================================")

    os.makedirs(output_dir, exist_ok=True)

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    samples = manifest.get("samples", [])
    total_samples = len(samples)
    print(f"Tổng số ảnh trong Dev Benchmark: {total_samples}")
    assert total_samples > 0, "Benchmark manifest không có mẫu nào!"

    # Split samples across workers
    slices = [[] for _ in range(num_workers)]
    for idx, s in enumerate(samples):
        slices[idx % num_workers].append(s)

    out_queue = mp.Queue()
    procs = []

    t_start = time.time()

    for w_id in range(num_workers):
        p = mp.Process(target=worker_proc, args=(w_id, slices[w_id], out_queue))
        p.start()
        procs.append(p)

    active_workers = num_workers
    all_records = []
    completed_count = 0

    worker_progress = {i: 0 for i in range(num_workers)}

    while active_workers > 0:
        try:
            msg = out_queue.get(timeout=1.0)
            msg_type = msg[0]

            if msg_type == "progress":
                _, w_id, current, total_w, rec = msg
                worker_progress[w_id] = current
                completed_count += 1
                all_records.append(rec)

                if completed_count % 25 == 0 or completed_count == total_samples:
                    elapsed = time.time() - t_start
                    img_per_min = round((completed_count / elapsed) * 60, 2) if elapsed > 0 else 0
                    eta_sec = round((total_samples - completed_count) / (completed_count / elapsed), 1) if completed_count > 0 else 0
                    print(f"Tiến độ: {completed_count}/{total_samples} ({completed_count/total_samples*100:.1f}%) | {img_per_min} img/min | ETA: {eta_sec/60:.1f} min | Vừa xong: {rec['image_id']} (Both: {rec['both_correct']})")

            elif msg_type == "done":
                _, w_id, _ = msg
                active_workers -= 1
                print(f"Worker {w_id} hoàn tất.")

            elif msg_type == "error":
                _, w_id, err_str = msg
                print(f"Worker {w_id} báo lỗi: {err_str}")
                active_workers -= 1

        except Exception:
            # Check if all processes are alive
            if all(not p.is_alive() for p in procs):
                break

    for p in procs:
        p.join()

    total_time_sec = round(time.time() - t_start, 2)
    print(f"\nBenchmark hoàn thành trong {total_time_sec}s ({total_time_sec/60:.2f} phút).")
    print(f"Tổng số bản ghi thu được: {len(all_records)} / {total_samples}")

    # Sắp xếp lại bản ghi theo thứ tự ban đầu của manifest
    id_to_order = {s.get("image_id"): i for i, s in enumerate(samples)}
    all_records.sort(key=lambda r: id_to_order.get(r.get("image_id"), 999999))

    # Tính toán metrics
    n_total = len(all_records)
    lpn_matches = sum(1 for r in all_records if r["lpn_correct"])
    sku_matches = sum(1 for r in all_records if r["sku_correct"])
    both_matches = sum(1 for r in all_records if r["both_correct"])

    status_counts = {
        "success": sum(1 for r in all_records if r["status"] == "success"),
        "review": sum(1 for r in all_records if r["status"] == "review"),
        "failed": sum(1 for r in all_records if r["status"] == "failed")
    }

    latencies_ms = [r["processing_time_ms"] for r in all_records]
    avg_latency = round(float(np.mean(latencies_ms)), 1) if latencies_ms else 0.0
    med_latency = round(float(np.median(latencies_ms)), 1) if latencies_ms else 0.0
    p95_latency = round(float(np.percentile(latencies_ms, 95)), 1) if latencies_ms else 0.0
    p99_latency = round(float(np.percentile(latencies_ms, 99)), 1) if latencies_ms else 0.0

    lpn_rate = round((lpn_matches / n_total) * 100, 2) if n_total > 0 else 0.0
    sku_rate = round((sku_matches / n_total) * 100, 2) if n_total > 0 else 0.0
    both_rate = round((both_matches / n_total) * 100, 2) if n_total > 0 else 0.0

    throughput = round((n_total / total_time_sec) * 60, 2) if total_time_sec > 0 else 0.0

    # 1. summary.json
    summary = {
        "benchmark_name": "dev_benchmark_v1",
        "timestamp": datetime.now().isoformat(),
        "total_images": n_total,
        "metrics": {
            "lpn_exact_match": lpn_matches,
            "lpn_exact_rate_pct": lpn_rate,
            "sku_exact_match": sku_matches,
            "sku_exact_rate_pct": sku_rate,
            "both_correct_e2e": both_matches,
            "both_correct_e2e_rate_pct": both_rate
        },
        "status_distribution": {
            "success_count": status_counts["success"],
            "success_rate_pct": round((status_counts["success"] / n_total) * 100, 2) if n_total > 0 else 0.0,
            "review_count": status_counts["review"],
            "review_rate_pct": round((status_counts["review"] / n_total) * 100, 2) if n_total > 0 else 0.0,
            "failed_count": status_counts["failed"],
            "failed_rate_pct": round((status_counts["failed"] / n_total) * 100, 2) if n_total > 0 else 0.0
        },
        "source": {
            "manifest": manifest_path,
            "source_pool": "val_v1.json",
            "official_test_accessed": False
        }
    }

    # 2. timing.json
    timing = {
        "total_time_seconds": total_time_sec,
        "total_images": n_total,
        "throughput_images_per_min": throughput,
        "average_latency_ms": avg_latency,
        "median_latency_ms": med_latency,
        "p95_latency_ms": p95_latency,
        "p99_latency_ms": p99_latency,
        "num_workers": num_workers
    }

    # 3. config.json
    config = {
        "recognizer_mode": "easyocr",
        "pipeline": "AiOcrPipeline",
        "detector": "LabelDetector (YOLO / Morphology Multi-ROI)",
        "orientation": "AutoOrient",
        "recognizer": "EasyOCR (CRAFT + ResNet/LSTM CTC)",
        "parser": "LabelDataParser v2.0",
        "benchmark_manifest": manifest_path,
        "official_test_accessed": False
    }

    # Ghi atomic ra các file canonical
    with open(os.path.join(output_dir, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    with open(os.path.join(output_dir, "predictions.json"), "w", encoding="utf-8") as f:
        json.dump(all_records, f, indent=2, ensure_ascii=False)

    with open(os.path.join(output_dir, "timing.json"), "w", encoding="utf-8") as f:
        json.dump(timing, f, indent=2, ensure_ascii=False)

    with open(os.path.join(output_dir, "config.json"), "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    print("\n=================================================================")
    print("KẾT QUẢ BASELINE ĐÃ ĐƯỢC ĐÓNG BĂNG VÀ LƯU VÀO CANONICAL FILES:")
    print(f"  LPN Exact Match  : {lpn_matches}/{n_total} ({lpn_rate}%)")
    print(f"  SKU Exact Match  : {sku_matches}/{n_total} ({sku_rate}%)")
    print(f"  Both Correct E2E : {both_matches}/{n_total} ({both_rate}%)")
    print(f"  Success / Review / Failed: {status_counts['success']} / {status_counts['review']} / {status_counts['failed']}")
    print(f"  Latency: Avg={avg_latency}ms | Median={med_latency}ms | P95={p95_latency}ms")
    print(f"  Canonical dir    : {output_dir}")
    print("=================================================================")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run EasyOCR Original Baseline Benchmark")
    parser.add_argument("--manifest", default="benchmarks/manifests/dev_benchmark_v1.json")
    parser.add_argument("--output_dir", default="benchmarks/baseline_v1")
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--limit", type=int, default=0, help="Optional sample limit for testing")
    args = parser.parse_args()

    with open(args.manifest, "r", encoding="utf-8") as f:
        mf = json.load(f)
    if args.limit and args.limit > 0:
        mf["samples"] = mf["samples"][:args.limit]
        test_mf_path = os.path.join(args.output_dir, "_temp_test_manifest.json")
        os.makedirs(args.output_dir, exist_ok=True)
        with open(test_mf_path, "w", encoding="utf-8") as f:
            json.dump(mf, f, indent=2)
        run_benchmark(test_mf_path, args.output_dir, args.workers)
        if os.path.isfile(test_mf_path):
            os.remove(test_mf_path)
    else:
        run_benchmark(args.manifest, args.output_dir, args.workers)

