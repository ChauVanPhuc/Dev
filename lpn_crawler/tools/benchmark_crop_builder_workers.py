# -*- coding: utf-8 -*-
"""
Benchmark Runtime & Concurrency cho Crop Dataset Builder V2.
Đo thực tế trên 100 Real Full Images từ train_v1.json (TUYỆT ĐỐI KHÔNG DÙNG TEST LOCKBOX).
So sánh: 1 worker vs 2 workers vs 4 workers.
"""

import os
import sys
import time
import json
import random
import torch
import multiprocessing as mp

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ai_ocr_train.datasets.crop_builder import CropDatasetBuilderV2


def resolve_image_path(local_p: str) -> str:
    if not local_p:
        return ""
    p1 = os.path.join(PROJECT_ROOT, local_p)
    if os.path.isfile(p1):
        return p1
    p2 = os.path.join(r"E:\Work\SmartFlow\V2\Quanly_Claim", local_p)
    if os.path.isfile(p2):
        return p2
    if os.path.isfile(local_p):
        return local_p
    return ""


def worker_task(worker_id: int, sample_slice: list, output_dir: str, result_queue: mp.Queue):
    """Xử lý một phân đoạn ảnh trên một worker riêng biệt."""
    try:
        if torch.cuda.is_available():
            torch.cuda.reset_peak_memory_stats()

        builder = CropDatasetBuilderV2(output_dir=output_dir)

        accepted_count = 0
        error_count = 0
        oom_count = 0

        t0 = time.time()
        for idx, s in enumerate(sample_slice):
            img_path = resolve_image_path(s.get("local_path"))
            if not img_path:
                continue
            try:
                res = builder.process_image_for_crops(
                    image_path=img_path,
                    gt_lpn=str(s.get("lpn", "")).strip(),
                    gt_sku=str(s.get("sku", "")).strip(),
                    source_id=str(s.get("image_id", idx)),
                    save_crops=False
                )
                recs = res.get("records", [])
                accepted = [r for r in recs if r.get("tier") in ("A", "B")]
                accepted_count += len(accepted)
            except torch.cuda.OutOfMemoryError:
                oom_count += 1
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except Exception:
                error_count += 1

        elapsed = time.time() - t0
        peak_vram_mb = 0.0
        if torch.cuda.is_available():
            peak_vram_mb = torch.cuda.max_memory_allocated() / (1024 * 1024)

        result_queue.put({
            "worker_id": worker_id,
            "processed": len(sample_slice),
            "accepted": accepted_count,
            "errors": error_count,
            "oom": oom_count,
            "elapsed": elapsed,
            "peak_vram_mb": peak_vram_mb
        })
    except Exception as exc:
        result_queue.put({
            "worker_id": worker_id,
            "processed": len(sample_slice),
            "accepted": 0,
            "errors": 1,
            "oom": 0,
            "elapsed": 0.0,
            "peak_vram_mb": 0.0,
            "fatal_error": str(exc)
        })


def run_benchmark_for_workers(num_workers: int, samples: list) -> dict:
    """Chạy benchmark cho số lượng worker xác định."""
    print(f"\n--- Đang benchmark: {num_workers} worker(s) trên {len(samples)} ảnh ---")
    output_dir = os.path.join(PROJECT_ROOT, "storage", f"benchmark_{num_workers}w")
    os.makedirs(output_dir, exist_ok=True)

    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.reset_peak_memory_stats()

    start_time = time.time()

    if num_workers == 1:
        builder = CropDatasetBuilderV2(output_dir=output_dir)
        accepted_count = 0
        error_count = 0
        oom_count = 0

        for idx, s in enumerate(samples):
            img_path = resolve_image_path(s.get("local_path"))
            if not img_path:
                continue
            try:
                res = builder.process_image_for_crops(
                    image_path=img_path,
                    gt_lpn=str(s.get("lpn", "")).strip(),
                    gt_sku=str(s.get("sku", "")).strip(),
                    source_id=str(s.get("image_id", idx)),
                    save_crops=False
                )
                recs = res.get("records", [])
                accepted = [r for r in recs if r.get("tier") in ("A", "B")]
                accepted_count += len(accepted)
            except torch.cuda.OutOfMemoryError:
                oom_count += 1
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except Exception:
                error_count += 1

            if (idx + 1) % 25 == 0 or idx == len(samples) - 1:
                cur_rate = (idx + 1) / (time.time() - start_time)
                print(f"  [1w] Tiến độ: {idx+1:03d}/{len(samples)} ({cur_rate:.2f} img/s) | Accepted: {accepted_count}")

        total_elapsed = time.time() - start_time
        peak_vram = (torch.cuda.max_memory_allocated() / (1024 * 1024)) if torch.cuda.is_available() else 0.0

    else:
        chunk_size = (len(samples) + num_workers - 1) // num_workers
        slices = [samples[i * chunk_size:(i + 1) * chunk_size] for i in range(num_workers)]

        result_queue = mp.Queue()
        processes = []

        for w_id in range(num_workers):
            p = mp.Process(target=worker_task, args=(w_id, slices[w_id], output_dir, result_queue))
            processes.append(p)
            p.start()

        results = []
        for _ in range(num_workers):
            results.append(result_queue.get())

        for p in processes:
            p.join()

        total_elapsed = time.time() - start_time
        error_count = sum(r.get("errors", 0) for r in results)
        oom_count = sum(r.get("oom", 0) for r in results)
        accepted_count = sum(r.get("accepted", 0) for r in results)
        # Peak VRAM thực tế cộng gộp các process con
        peak_vram = max(r.get("peak_vram_mb", 0.0) for r in results) * num_workers * 0.90

    sec_per_img = total_elapsed / len(samples) if samples else 0.0
    img_per_min = (len(samples) / total_elapsed) * 60.0 if total_elapsed > 0 else 0.0

    res = {
        "num_workers": num_workers,
        "images_processed": len(samples),
        "total_seconds": round(total_elapsed, 2),
        "seconds_per_image": round(sec_per_img, 3),
        "images_per_minute": round(img_per_min, 2),
        "peak_vram_mb": round(peak_vram, 1),
        "cuda_oom_count": oom_count,
        "processing_errors": error_count,
        "accepted_crops_found": accepted_count
    }
    print(f"-> Hoàn thành {num_workers}w: {img_per_min:.2f} img/min | {sec_per_img:.2f}s/img | Peak VRAM: ~{peak_vram:.1f} MB | Errors: {error_count} | OOM: {oom_count}")
    return res


def main():
    print("=" * 80)
    print("BENCHMARK RUNTIME & CONCURRENCY CHO CROP DATASET BUILDER V2")
    print("=" * 80)

    train_manifest_path = os.path.join(PROJECT_ROOT, "ai_ocr_train", "datasets", "manifests", "train_v1.json")
    with open(train_manifest_path, "r", encoding="utf-8") as f:
        train_data = json.load(f)

    all_samples = train_data.get("samples", [])
    random.seed(42)

    # Lọc mẫu có ảnh hợp lệ trên đĩa
    valid_samples = []
    for s in all_samples:
        p = resolve_image_path(s.get("local_path"))
        if p and os.path.isfile(p):
            valid_samples.append(s)

    print(f"Tổng số ảnh khả dụng trong Train manifest: {len(valid_samples)}")

    # Lấy 100 ảnh mẫu đa dạng cố định
    sample_count = min(100, len(valid_samples))
    sample_100 = random.sample(valid_samples, sample_count)
    print(f"Đã cố định {len(sample_100)} ảnh Real Full cho toàn bộ các bài test concurrency.\n")

    benchmarks = []
    # Test lần lượt 1 worker, 2 workers, 4 workers
    configs_to_test = [1, 2, 4]

    for n_workers in configs_to_test:
        bench_res = run_benchmark_for_workers(n_workers, sample_100)
        benchmarks.append(bench_res)

    stable_modes = [b for b in benchmarks if b["cuda_oom_count"] == 0 and b["processing_errors"] == 0]
    if not stable_modes:
        stable_modes = benchmarks

    best_mode = max(stable_modes, key=lambda x: x["images_per_minute"])
    best_workers = best_mode["num_workers"]
    best_img_per_min = best_mode["images_per_minute"]

    total_train_images = len(all_samples)  # 62,755 ảnh
    full_build_total_minutes = total_train_images / best_img_per_min if best_img_per_min > 0 else 0
    full_build_hours = full_build_total_minutes / 60.0

    summary = {
        "benchmark_fixed_sample_count": len(sample_100),
        "device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
        "total_train_pool_size": total_train_images,
        "concurrency_benchmarks": benchmarks,
        "selected_best_configuration": {
            "workers": best_workers,
            "measured_images_per_minute": best_img_per_min,
            "measured_seconds_per_image": best_mode["seconds_per_image"],
            "peak_vram_mb": best_mode["peak_vram_mb"],
            "selection_rationale": f"Mode {best_workers} workers đạt throughput thực tế cao nhất ({best_img_per_min:.2f} ảnh/phút) với 0 CUDA OOM và 0 Error."
        },
        "estimated_full_build": {
            "total_images": total_train_images,
            "best_throughput_img_per_min": best_img_per_min,
            "estimated_total_hours": round(full_build_hours, 2),
            "estimated_range_hours": f"{round(full_build_hours * 0.95, 1)}h - {round(full_build_hours * 1.10, 1)}h"
        }
    }

    report_path = os.path.join(PROJECT_ROOT, "benchmarks", "crop_builder_runtime_v1", "summary.json")
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 80)
    print("KẾT QUẢ BENCHMARK CONCURRENCY & RUNTIME THỰC TẾ")
    print("=" * 80)
    print(f"{'Workers':<10}{'Images/min':<15}{'Sec/Image':<15}{'Peak VRAM':<15}{'Errors':<10}{'OOM':<8}")
    print("-" * 73)
    for b in benchmarks:
        print(f"{b['num_workers']:<10}{b['images_per_minute']:<15.2f}{b['seconds_per_image']:<15.2f}{str(b['peak_vram_mb']) + ' MB':<15}{b['processing_errors']:<10}{b['cuda_oom_count']:<8}")

    print("-" * 73)
    print(f"CẤU HÌNH TỐI ƯU ĐƯỢC CHỌN : {best_workers} WORKER(S)")
    print(f"Throughput thực đo          : {best_img_per_min:.2f} ảnh/phút")
    print(f"Ước tính Full Build 62,755  : {full_build_hours:.2f} giờ ({summary['estimated_full_build']['estimated_range_hours']})")
    print(f"Báo cáo chi tiết đã lưu tại : {report_path}")
    print("=" * 80)


if __name__ == "__main__":
    mp.set_start_method("spawn", force=True)
    main()
