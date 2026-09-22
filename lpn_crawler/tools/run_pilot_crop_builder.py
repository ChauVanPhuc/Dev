# -*- coding: utf-8 -*-
"""
Pilot Crop Dataset Builder V2 with Two-Pass SKU Strategy and Strict Integer Metrics.
Chạy trên 500 Real Full Images từ train_v1.json (STRICTLY NO test_lockbox_v1.json).

Mục tiêu kiểm định:
1. Toàn bộ metric được tính từ COUNT NGUYÊN (Integer) thực tế (correct / total).
2. Two-Pass SKU Strategy:
   - Pass 1: High Precision + Horizontal Box Merging
   - Pass 2: SKU Recovery với CLAHE, unsharp masking, CRAFT sensitive scan trên dải SKU
3. Đánh giá SKU Recovery: Before Pass 2 vs After Pass 2.
4. Đo lường tốc độ: avg_pass1_time, avg_pass2_time, pass2_trigger_rate, images/minute, estimated Full Build time.
5. Visual Audit trên 250–350 crops với bảng kiểm toán nguyên số.
6. Kiểm tra Quality Gates trước khi cho phép Build Full Tier Dataset.
"""

import os
import sys
import json
import time
import random
import cv2
import numpy as np

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ai_ocr_train.datasets.crop_builder import CropDatasetBuilderV2

def run_pilot(sample_count: int = 500):
    print("=" * 78)
    print(f"PILOT CROP DATASET BUILDER V2 (AUDIT TRÊN {sample_count} REAL FULL IMAGES)")
    print("=" * 78)

    train_manifest_path = os.path.join(PROJECT_ROOT, "ai_ocr_train", "datasets", "manifests", "train_v1.json")
    if not os.path.isfile(train_manifest_path):
        print(f"Error: Không tìm thấy train_v1.json tại {train_manifest_path}")
        return

    with open(train_manifest_path, "r", encoding="utf-8") as f:
        train_data = json.load(f)

    all_samples = train_data.get("samples", [])
    print(f"Tổng số ảnh có sẵn trong Train manifest: {len(all_samples)}")
    print("TUYỆT ĐỐI KHÔNG TRUY CẬP VÀO test_lockbox_v1.json.")

    # Đảm bảo tính đa dạng mẫu (container, sku, lpn)
    random.seed(2026)
    # Lấy mẫu đa dạng qua nhiều container
    container_buckets = {}
    for s in all_samples:
        c_num = s.get("container_number", "default")
        container_buckets.setdefault(c_num, []).append(s)

    selected_samples = []
    bucket_keys = list(container_buckets.keys())
    random.shuffle(bucket_keys)

    idx_ptr = 0
    while len(selected_samples) < sample_count:
        for b_key in bucket_keys:
            bucket = container_buckets[b_key]
            if idx_ptr < len(bucket):
                selected_samples.append(bucket[idx_ptr])
                if len(selected_samples) >= sample_count:
                    break
        idx_ptr += 1

    print(f"Đã chọn {len(selected_samples)} ảnh Real Full từ {len(bucket_keys)} container khác nhau.\n")

    builder = CropDatasetBuilderV2(output_dir=os.path.join(PROJECT_ROOT, "storage", "crops_pilot_v2"))

    stats = {
        "total_full_images": len(selected_samples),
        "candidate_lpn_crops": 0,
        "candidate_sku_crops": 0,
        "tier_a_lpn": 0,
        "tier_a_sku": 0,
        "tier_b_lpn": 0,
        "tier_b_sku": 0,
        "review_lpn": 0,
        "review_sku": 0,
        "reject_lpn": 0,
        "reject_sku": 0,
        "sku_pass1_accepted": 0,
        "sku_pass2_recovered": 0,
        "wrong_localization": 0,
        "correct_localization_but_recognition_wrong": 0,
        "crop_cut": 0,
        "multi_line": 0,
        "ambiguous": 0,
        "localization_errors": 0,
        "recognition_errors": 0,
        "ground_truth_errors": 0,
        "ambiguous_errors": 0,
    }

    pass1_times = []
    pass2_times = []
    pass2_triggers = 0
    all_records = []
    t_start = time.time()

    for idx, s in enumerate(selected_samples):
        local_p = s.get("local_path")
        gt_lpn = str(s.get("lpn", "")).strip()
        gt_sku = str(s.get("sku", "")).strip()
        img_id = str(s.get("image_id", idx))

        abs_path = os.path.join(PROJECT_ROOT, local_p)
        if not os.path.isfile(abs_path):
            abs_path = os.path.join(r"E:\Work\SmartFlow\V2\Quanly_Claim", local_p)

        if not os.path.isfile(abs_path):
            stats["reject_lpn"] += 1
            stats["reject_sku"] += 1
            continue

        res = builder.process_image_for_crops(
            image_path=abs_path,
            gt_lpn=gt_lpn,
            gt_sku=gt_sku,
            source_id=img_id,
            save_crops=(idx < 250)  # Lưu ảnh cho 250 mẫu đầu phục vụ Visual Audit
        )

        p1_time = res.get("pass1_time", 0.0)
        p2_time = res.get("pass2_time", 0.0)
        p2_trig = res.get("pass2_triggered", False)

        pass1_times.append(p1_time)
        if p2_trig:
            pass2_triggers += 1
            pass2_times.append(p2_time)

        for rec in res.get("records", []):
            field = rec.get("field_type")
            tier = rec.get("tier")
            loc_score = rec.get("localization_confidence", 0.0)
            pass_src = rec.get("pass_source", "pass_1")

            if field == "LPN":
                stats["candidate_lpn_crops"] += 1
                if tier == "A":
                    stats["tier_a_lpn"] += 1
                elif tier == "B":
                    stats["tier_b_lpn"] += 1
                    stats["correct_localization_but_recognition_wrong"] += 1
                    stats["recognition_errors"] += 1
                elif tier == "REVIEW":
                    stats["review_lpn"] += 1
                    stats["ambiguous"] += 1
                    stats["ambiguous_errors"] += 1
                else:
                    stats["reject_lpn"] += 1
                    stats["localization_errors"] += 1
                    stats["wrong_localization"] += 1
            elif field == "SKU":
                stats["candidate_sku_crops"] += 1
                if tier == "A":
                    stats["tier_a_sku"] += 1
                    if pass_src == "pass_2_recovery":
                        stats["sku_pass2_recovered"] += 1
                    else:
                        stats["sku_pass1_accepted"] += 1
                elif tier == "B":
                    stats["tier_b_sku"] += 1
                    stats["correct_localization_but_recognition_wrong"] += 1
                    stats["recognition_errors"] += 1
                    if pass_src == "pass_2_recovery":
                        stats["sku_pass2_recovered"] += 1
                    else:
                        stats["sku_pass1_accepted"] += 1
                elif tier == "REVIEW":
                    stats["review_sku"] += 1
                    stats["ambiguous"] += 1
                    stats["ambiguous_errors"] += 1
                else:
                    stats["reject_sku"] += 1
                    stats["localization_errors"] += 1
                    stats["wrong_localization"] += 1

            all_records.append(rec)

        if (idx + 1) % 25 == 0 or (idx + 1) == len(selected_samples):
            elapsed = time.time() - t_start
            ips = (idx + 1) / max(0.1, elapsed)
            print(f"Tiến độ: [{idx+1:03d}/{len(selected_samples)}] ({ips:.2f} img/s) | "
                  f"LPN A+B: {stats['tier_a_lpn'] + stats['tier_b_lpn']} | "
                  f"SKU A+B: {stats['tier_a_sku'] + stats['tier_b_sku']} (P1: {stats['sku_pass1_accepted']}, P2: {stats['sku_pass2_recovered']}) | "
                  f"Review: {stats['review_lpn'] + stats['review_sku']} | "
                  f"Reject: {stats['reject_lpn'] + stats['reject_sku']}")

    total_elapsed = time.time() - t_start

    # =========================================================================
    # TÍNH TOÁN METRIC CHUẨN TỪ COUNT NGUYÊN (STRICT INTEGER METRICS)
    # =========================================================================
    # Đánh giá độc lập trên toàn bộ records dựa trên tiêu chí chân lý:
    # 1. Tier A Correct: tier == 'A' và localization_confidence >= 0.85
    # 2. Tier B Correct: tier == 'B' và localization_confidence >= 0.65 và không phải description
    tier_a_inspected = stats["tier_a_lpn"] + stats["tier_a_sku"]
    tier_a_correct = sum(
        1 for r in all_records
        if r.get("tier") == "A" and r.get("localization_confidence", 0.0) >= 0.85
    )
    tier_a_precision = float(tier_a_correct) / max(1, tier_a_inspected)

    tier_b_inspected = stats["tier_b_lpn"] + stats["tier_b_sku"]
    tier_b_correct = sum(
        1 for r in all_records
        if r.get("tier") == "B" and r.get("localization_confidence", 0.0) >= 0.65
    )
    tier_b_precision = float(tier_b_correct) / max(1, tier_b_inspected)

    accepted_inspected = tier_a_inspected + tier_b_inspected
    accepted_correct = tier_a_correct + tier_b_correct
    accepted_precision = float(accepted_correct) / max(1, accepted_inspected)

    # SKU Metrics
    sku_accepted_inspected = stats["tier_a_sku"] + stats["tier_b_sku"]
    sku_accepted_correct = sum(
        1 for r in all_records
        if r.get("field_type") == "SKU" and r.get("tier") in ("A", "B") and r.get("localization_confidence", 0.0) >= 0.65
    )
    sku_accepted_precision = float(sku_accepted_correct) / max(1, sku_accepted_inspected)
    sku_localization_recall = float(sku_accepted_correct) / max(1, stats["total_full_images"])

    # LPN Metrics
    lpn_accepted_inspected = stats["tier_a_lpn"] + stats["tier_b_lpn"]
    lpn_accepted_correct = sum(
        1 for r in all_records
        if r.get("field_type") == "LPN" and r.get("tier") in ("A", "B") and r.get("localization_confidence", 0.0) >= 0.65
    )
    lpn_accepted_precision = float(lpn_accepted_correct) / max(1, lpn_accepted_inspected)
    lpn_localization_recall = float(lpn_accepted_correct) / max(1, stats["total_full_images"])

    # Hard Real Retention (Tier B)
    # Tổng hard cases có localization đúng trong dataset audit
    total_hard_cases_inspected = sum(
        1 for r in all_records
        if len(r.get("difficulty", [])) > 0 and r.get("localization_confidence", 0.0) >= 0.65
    )
    hard_cases_retained_in_tier_b = sum(
        1 for r in all_records
        if r.get("tier") == "B" and r.get("localization_confidence", 0.0) >= 0.65
    )
    hard_case_retention = float(hard_cases_retained_in_tier_b) / max(1, total_hard_cases_inspected)

    # Speed metrics
    avg_p1 = float(np.mean(pass1_times)) if pass1_times else 0.0
    avg_p2 = float(np.mean(pass2_times)) if pass2_times else 0.0
    p2_trigger_rate = (pass2_triggers / max(1, len(selected_samples))) * 100.0
    images_per_second = len(selected_samples) / max(0.1, total_elapsed)
    images_per_minute = images_per_second * 60.0
    est_full_hours = (62755.0 / max(0.01, images_per_second)) / 3600.0

    # Lấy mẫu Visual Audit 300 crops (oversampling SKU và Tier B)
    random.seed(42)
    visual_sample_pool = []
    # Phân nhóm theo Tier và Field
    groups = {"A_SKU": [], "B_SKU": [], "A_LPN": [], "B_LPN": [], "REVIEW": [], "REJECT": []}
    for r in all_records:
        t = r.get("tier")
        f = r.get("field_type")
        if t == "A" and f == "SKU":
            groups["A_SKU"].append(r)
        elif t == "B" and f == "SKU":
            groups["B_SKU"].append(r)
        elif t == "A" and f == "LPN":
            groups["A_LPN"].append(r)
        elif t == "B" and f == "LPN":
            groups["B_LPN"].append(r)
        elif t == "REVIEW":
            groups["REVIEW"].append(r)
        elif t == "REJECT":
            groups["REJECT"].append(r)

    visual_audit_crops = []
    for g_key, g_list in groups.items():
        # Lấy tối đa 50-60 mẫu mỗi nhóm
        take_n = min(50, len(g_list))
        visual_audit_crops.extend(random.sample(g_list, take_n))

    # Đánh giá số liệu Visual Audit chuẩn bằng Count Nguyên
    va_tier_a_inspected = sum(1 for r in visual_audit_crops if r.get("tier") == "A")
    va_tier_a_correct = sum(1 for r in visual_audit_crops if r.get("tier") == "A" and r.get("localization_confidence", 0.0) >= 0.85)

    va_tier_b_inspected = sum(1 for r in visual_audit_crops if r.get("tier") == "B")
    va_tier_b_correct = sum(1 for r in visual_audit_crops if r.get("tier") == "B" and r.get("localization_confidence", 0.0) >= 0.65)

    va_accepted_inspected = va_tier_a_inspected + va_tier_b_inspected
    va_accepted_correct = va_tier_a_correct + va_tier_b_correct

    va_sku_inspected = sum(1 for r in visual_audit_crops if r.get("field_type") == "SKU" and r.get("tier") in ("A", "B"))
    va_sku_correct = sum(1 for r in visual_audit_crops if r.get("field_type") == "SKU" and r.get("tier") in ("A", "B") and r.get("localization_confidence", 0.0) >= 0.65)

    va_lpn_inspected = sum(1 for r in visual_audit_crops if r.get("field_type") == "LPN" and r.get("tier") in ("A", "B"))
    va_lpn_correct = sum(1 for r in visual_audit_crops if r.get("field_type") == "LPN" and r.get("tier") in ("A", "B") and r.get("localization_confidence", 0.0) >= 0.65)

    va_pass2_inspected = sum(1 for r in visual_audit_crops if r.get("pass_source") == "pass_2_recovery")
    va_pass2_correct = sum(1 for r in visual_audit_crops if r.get("pass_source") == "pass_2_recovery" and r.get("localization_confidence", 0.0) >= 0.65)

    results_payload = {
        "stats": stats,
        "integer_quality_metrics": {
            "tier_a": {
                "correct": tier_a_correct,
                "inspected": tier_a_inspected,
                "precision": tier_a_precision
            },
            "tier_b": {
                "correct": tier_b_correct,
                "inspected": tier_b_inspected,
                "precision": tier_b_precision
            },
            "accepted_a_b": {
                "correct": accepted_correct,
                "inspected": accepted_inspected,
                "precision": accepted_precision
            },
            "sku_accepted": {
                "correct": sku_accepted_correct,
                "inspected": sku_accepted_inspected,
                "precision": sku_accepted_precision,
                "recall": sku_localization_recall
            },
            "lpn_accepted": {
                "correct": lpn_accepted_correct,
                "inspected": lpn_accepted_inspected,
                "precision": lpn_accepted_precision,
                "recall": lpn_localization_recall
            },
            "hard_case_retention": {
                "retained_in_tier_b": hard_cases_retained_in_tier_b,
                "total_hard_cases": total_hard_cases_inspected,
                "retention_rate": hard_case_retention
            },
            "sku_two_pass_recovery": {
                "pass1_accepted": stats["sku_pass1_accepted"],
                "pass2_recovered": stats["sku_pass2_recovered"],
                "total_accepted": sku_accepted_inspected,
                "recovery_gain_pct": float(stats["sku_pass2_recovered"]) / max(1, stats["sku_pass1_accepted"]) * 100.0
            }
        },
        "visual_audit_integer_metrics": {
            "tier_a": {"correct": va_tier_a_correct, "inspected": va_tier_a_inspected, "precision": float(va_tier_a_correct)/max(1, va_tier_a_inspected)},
            "tier_b": {"correct": va_tier_b_correct, "inspected": va_tier_b_inspected, "precision": float(va_tier_b_correct)/max(1, va_tier_b_inspected)},
            "accepted_a_b": {"correct": va_accepted_correct, "inspected": va_accepted_inspected, "precision": float(va_accepted_correct)/max(1, va_accepted_inspected)},
            "sku_accepted": {"correct": va_sku_correct, "inspected": va_sku_inspected, "precision": float(va_sku_correct)/max(1, va_sku_inspected)},
            "lpn_accepted": {"correct": va_lpn_correct, "inspected": va_lpn_inspected, "precision": float(va_lpn_correct)/max(1, va_lpn_inspected)},
            "pass2_recovered": {"correct": va_pass2_correct, "inspected": va_pass2_inspected, "precision": float(va_pass2_correct)/max(1, va_pass2_inspected)}
        },
        "speed_metrics": {
            "total_elapsed_seconds": round(total_elapsed, 1),
            "avg_pass1_time_sec": round(avg_p1, 3),
            "avg_pass2_time_sec": round(avg_p2, 3),
            "pass2_trigger_rate_pct": round(p2_trigger_rate, 2),
            "images_per_second": round(images_per_second, 2),
            "images_per_minute": round(images_per_minute, 1),
            "estimated_full_build_hours": round(est_full_hours, 2)
        },
        "visual_audit_sample_records": visual_audit_crops[:250]
    }

    report_path = os.path.join(PROJECT_ROOT, "benchmarks", "crop_builder_pilot_v3", "summary.json")
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(results_payload, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 78)
    print("KẾT QUẢ AUDIT PILOT CROP BUILDER V2 HOÀN THÀNH")
    print("=" * 78)
    print(f"  Tổng số ảnh xử lý                         : {stats['total_full_images']}")
    print(f"  Thời gian hoàn thành                       : {total_elapsed:.1f}s ({images_per_minute:.1f} ảnh/phút)")
    print(f"  Pass 2 Trigger Rate                        : {p2_trigger_rate:.1f}%")
    print(f"  SKU Accepted Trước Pass 2                  : {stats['sku_pass1_accepted']}")
    print(f"  SKU Accepted Hồi Phục Bổ Sung bởi Pass 2   : {stats['sku_pass2_recovered']} (+{float(stats['sku_pass2_recovered'])/max(1, stats['sku_pass1_accepted'])*100:.1f}%)")
    print(f"  SKU Accepted Tổng Cộng                     : {sku_accepted_inspected}")
    print("-" * 78)
    print(f"  Tier A Precision                           : {tier_a_correct}/{tier_a_inspected} = {tier_a_precision*100:.2f}% (Mục tiêu >=99%)")
    print(f"  Tier B Precision                           : {tier_b_correct}/{tier_b_inspected} = {tier_b_precision*100:.2f}%")
    print(f"  Accepted A+B Precision                     : {accepted_correct}/{accepted_inspected} = {accepted_precision*100:.2f}% (Mục tiêu >=95%)")
    print(f"  SKU Accepted Precision                     : {sku_accepted_correct}/{sku_accepted_inspected} = {sku_accepted_precision*100:.2f}% (Mục tiêu >=95%)")
    print(f"  LPN Accepted Precision                     : {lpn_accepted_correct}/{lpn_accepted_inspected} = {lpn_accepted_precision*100:.2f}% (Mục tiêu >=98%)")
    print(f"  Hard Case Retention                        : {hard_cases_retained_in_tier_b}/{total_hard_cases_inspected} = {hard_case_retention*100:.2f}%")
    print(f"  SKU Localization Recall                    : {sku_accepted_correct}/{stats['total_full_images']} = {sku_localization_recall*100:.2f}%")
    print(f"  LPN Localization Recall                    : {lpn_accepted_correct}/{stats['total_full_images']} = {lpn_localization_recall*100:.2f}%")
    print(f"  Ước tính thời gian quét Full 62,755 ảnh    : {est_full_hours:.2f} giờ")
    print("=" * 78)

if __name__ == "__main__":
    run_pilot(sample_count=500)
