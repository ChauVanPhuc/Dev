# -*- coding: utf-8 -*-
"""
High-Throughput Multi-Processing Batch OCR Runner (Gói B).
Tối ưu hóa chạy song song 2-8 Workers cho tập dữ liệu lớn (38.000+ ảnh):
- Producer-Consumer Architecture với multiprocessing an toàn trên Windows (spawn context).
- Checkpoint Recovery: Tự động bỏ qua các ảnh đã quét xong trong bảng lpn_ai_ocr_results.
- Single-Writer Database Pattern: Toàn bộ kết quả được gửi về Main Process để ghi CSDL, tránh lỗi SQLite Database Locked.
- Progress Bar trực quan (tqdm): Hiển thị tốc độ (ảnh/giây), % hoàn thành, số lượng thành công và thời gian còn lại (ETA).
- Hỗ trợ dừng an toàn bằng Ctrl+C bất kỳ lúc nào mà không mất dữ liệu.
"""

import os
import sys
import time
import json
import argparse
from datetime import datetime, date
from typing import Optional, List, Dict, Any

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CLAIM_BACKEND = os.path.join(PROJECT_ROOT, "Claim", "BackEnd")
LPN_ROOT = os.path.join(PROJECT_ROOT, "lpn_crawler")

for p in [PROJECT_ROOT, CLAIM_BACKEND, LPN_ROOT]:
    if p not in sys.path:
        sys.path.insert(0, p)

import torch
import multiprocessing as mp
from sqlalchemy import or_, and_
from app.core.database import SessionLocal
from lpn_crawler.backend.models.models import (
    LpnImage,
    LpnItem,
    LpnContainer,
    LpnAiOcrResult
)
from lpn_crawler.backend.api.routes.images import resolve_image_file_path


def worker_process(
    worker_id: int,
    task_queue: mp.Queue,
    result_queue: mp.Queue,
    model_id: Optional[str] = None,
    memory_fraction: float = 0.22
):
    """Tiến trình Worker độc lập xử lý OCR cho từng ảnh."""
    try:
        # Cấu hình VRAM PyTorch nếu có GPU
        if torch.cuda.is_available():
            try:
                torch.cuda.set_per_process_memory_fraction(memory_fraction, 0)
            except Exception:
                pass

        # Nạp pipeline độc lập trong worker
        from lpn_crawler.ai_ocr_train.core.pipeline import AiOcrPipeline
        pipeline = AiOcrPipeline()
        # Warmup GPU / CUDA kernel trong worker trước khi nhận ảnh thực tế
        pipeline.ocr_engine.warmup()

        while True:
            try:
                task = task_queue.get(timeout=2.0)
            except Exception:
                continue

            if task is None:  # Sentinel báo kết thúc
                break

            image_id = task["image_id"]
            item_id = task["item_id"]
            local_path = task["local_path"]
            source_url = task["source_url"]
            container_number = task["container_number"]
            suffix_key = task["suffix_key"]
            gt_lpn = task.get("gt_lpn")
            gt_sku = task.get("gt_sku")

            t0 = time.time()
            abs_p = resolve_image_file_path(local_path)
            img_target = abs_p if (abs_p and os.path.isfile(abs_p)) else source_url

            if not img_target:
                result_queue.put({
                    "image_id": image_id,
                    "item_id": item_id,
                    "container_number": container_number,
                    "suffix_key": suffix_key,
                    "model_id": model_id or "default",
                    "detected_lpn": None,
                    "detected_sku": None,
                    "detected_barcodes": json.dumps([]),
                    "confidence": 0.0,
                    "is_lpn_match": False,
                    "is_sku_match": False,
                    "status": "failed",
                    "error_reason": "Không tìm thấy file ảnh cục bộ hoặc URL nguồn",
                    "raw_ocr_text": "",
                    "processing_time_ms": 0.0,
                    "worker_id": worker_id
                })
                continue

            try:
                expected_skus = [gt_sku.strip().upper()] if gt_sku else None
                expected_lpn = gt_lpn.strip().upper() if gt_lpn else None

                res = pipeline.process(
                    image_input=img_target,
                    model_id=model_id,
                    auto_crop=True,
                    auto_rotate=True,
                    apply_super_res=True,
                    return_images_base64=False,
                    expected_skus=expected_skus,
                    expected_lpn=expected_lpn
                )
                dur_ms = round((time.time() - t0) * 1000, 1)

                det_lpn = res.get("lpn")
                det_sku = res.get("sku")
                det_barcodes = res.get("barcodes", [])
                conf = res.get("confidence", 0.0)
                extracted = res.get("extracted", {})

                sku_is_pred = extracted.get("sku_is_predicted", False)
                sku_is_val = extracted.get("sku_is_validated", False)
                overall_c = extracted.get("overall_confidence", conf)

                is_lpn_match = (det_lpn.strip().upper() == gt_lpn.strip().upper()) if (det_lpn and gt_lpn) else False
                is_sku_match = (det_sku.strip().upper() == gt_sku.strip().upper()) if (det_sku and gt_sku) else False

                # Đánh giá trạng thái 3 cấp (success / review / failed):
                # 1. SUCCESS: Khớp cả LPN và SKU với CSDL chuẩn, hoặc đủ cả 2 trường hợp lệ (confidence >= 0.60)
                if is_lpn_match and is_sku_match:
                    status_val = "success"
                    error_reason = None
                elif det_lpn and det_sku and (is_lpn_match or is_sku_match or overall_c >= 0.60) and (not sku_is_pred or sku_is_val):
                    status_val = "success"
                    error_reason = None
                # 2. REVIEW: Đọc được tem nhưng thiếu 1 trường hoặc lệch mã so với CSDL
                elif det_lpn or det_sku or (det_barcodes and len(det_barcodes) > 0):
                    status_val = "review"
                    reasons = []
                    if not det_lpn:
                        reasons.append("Thiếu mã LPN")
                    elif gt_lpn and not is_lpn_match:
                        reasons.append(f"LPN đọc '{det_lpn}' khác CSDL '{gt_lpn}'")
                    if not det_sku:
                        reasons.append("Thiếu mã SKU")
                    elif gt_sku and not is_sku_match:
                        reasons.append(f"SKU đọc '{det_sku}' khác CSDL '{gt_sku}'")
                    if sku_is_pred and not sku_is_val:
                        reasons.append("SKU suy luận từ mô tả tem (chưa kiểm chứng SKU Master)")
                    elif overall_c < 0.50 and not is_lpn_match and not is_sku_match:
                        reasons.append(f"Độ tin cậy thấp ({round(overall_c*100, 1)}%)")
                    error_reason = "; ".join(reasons) if reasons else "Cần kiểm tra đối chiếu"
                else:
                    status_val = "failed"
                    error_reason = "Không tìm thấy tem nhãn hoặc chữ/mã vạch không đọc được"

                raw_text = res.get("full_result", {}).get("raw_ocr", {}).get("full_text", "")

                result_queue.put({
                    "image_id": image_id,
                    "item_id": item_id,
                    "container_number": container_number,
                    "suffix_key": suffix_key,
                    "model_id": model_id or "default",
                    "detected_lpn": det_lpn,
                    "detected_sku": det_sku,
                    "detected_barcodes": json.dumps(det_barcodes),
                    "confidence": round(float(conf), 3),
                    "is_lpn_match": is_lpn_match,
                    "is_sku_match": is_sku_match,
                    "status": status_val,
                    "error_reason": error_reason,
                    "raw_ocr_text": raw_text[:2000] if raw_text else "",
                    "processing_time_ms": dur_ms,
                    "worker_id": worker_id
                })
            except Exception as proc_err:
                dur_ms = round((time.time() - t0) * 1000, 1)
                result_queue.put({
                    "image_id": image_id,
                    "item_id": item_id,
                    "container_number": container_number,
                    "suffix_key": suffix_key,
                    "model_id": model_id or "default",
                    "detected_lpn": None,
                    "detected_sku": None,
                    "detected_barcodes": json.dumps([]),
                    "confidence": 0.0,
                    "is_lpn_match": False,
                    "is_sku_match": False,
                    "status": "failed",
                    "error_reason": f"Lỗi OCR Pipeline: {str(proc_err)}",
                    "raw_ocr_text": "",
                    "processing_time_ms": dur_ms,
                    "worker_id": worker_id
                })

    except Exception as e:
        print(f"[Worker-{worker_id}] Gặp lỗi nghiêm trọng: {e}")


def save_results_to_db(db, results: List[Dict[str, Any]]):
    """Ghi danh sách kết quả vào bảng lpn_ai_ocr_results một cách an toàn."""
    if not results:
        return
    try:
        for r in results:
            existing = db.query(LpnAiOcrResult).filter(
                LpnAiOcrResult.item_id == r["item_id"],
                LpnAiOcrResult.image_id == r["image_id"]
            ).first()

            if existing:
                existing.detected_lpn = r["detected_lpn"]
                existing.detected_sku = r["detected_sku"]
                existing.detected_barcodes = r["detected_barcodes"]
                existing.confidence = r["confidence"]
                existing.is_lpn_match = r["is_lpn_match"]
                existing.is_sku_match = r["is_sku_match"]
                existing.status = r["status"]
                existing.error_reason = r["error_reason"]
                existing.raw_ocr_text = r["raw_ocr_text"]
                existing.processing_time_ms = r["processing_time_ms"]
                existing.scanned_at = datetime.utcnow()
            else:
                db_record = LpnAiOcrResult(
                    item_id=r["item_id"],
                    image_id=r["image_id"],
                    container_number=r["container_number"],
                    suffix_key=r["suffix_key"],
                    model_id=r["model_id"],
                    detected_lpn=r["detected_lpn"],
                    detected_sku=r["detected_sku"],
                    detected_barcodes=r["detected_barcodes"],
                    confidence=r["confidence"],
                    is_lpn_match=r["is_lpn_match"],
                    is_sku_match=r["is_sku_match"],
                    status=r["status"],
                    error_reason=r["error_reason"],
                    raw_ocr_text=r["raw_ocr_text"],
                    processing_time_ms=r["processing_time_ms"],
                    scanned_at=datetime.utcnow()
                )
                db.add(db_record)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Database Error] Không thể lưu kết quả: {e}")


def main():
    parser = argparse.ArgumentParser(description="Chạy Multi-Processing Batch AI OCR siêu tốc.")
    parser.add_argument("--workers", type=int, default=4, help="Số lượng tiến trình song song (mặc định: 4)")
    parser.add_argument("--limit", type=int, default=0, help="Giới hạn số ảnh cần quét (0 = tất cả ảnh chưa quét)")
    parser.add_argument("--container", type=str, default="", help="Lọc theo mã Container cụ thể")
    parser.add_argument("--model-id", type=str, default=None, help="Mã Model OCR (mặc định: Base)")
    parser.add_argument("--chunk-size", type=int, default=30, help="Số lượng bản ghi commit vào CSDL mỗi lần (mặc định: 30)")
    parser.add_argument("--reset-existing", action="store_true", help="Quét lại cả những ảnh đã có kết quả trong DB")
    args = parser.parse_args()

    num_workers = max(1, args.workers)
    print("=" * 70)
    print(f"🚀 BẮT ĐẦU CHẠY BATCH AI OCR ĐA TIẾN TRÌNH ({num_workers} WORKERS)")
    print("=" * 70)

    db = SessionLocal()
    try:
        query = db.query(LpnImage, LpnItem, LpnContainer).\
            join(LpnItem, LpnImage.lpn_item_id == LpnItem.id).\
            join(LpnContainer, LpnImage.container_id == LpnContainer.id)

        # Mặc định lọc từ 01/01/2026 về hiện tại
        query = query.filter(
            or_(
                LpnContainer.date_loading >= date(2026, 1, 1),
                and_(LpnContainer.date_loading == None, LpnContainer.created_at >= datetime(2026, 1, 1))
            )
        )

        if args.container:
            query = query.filter(LpnContainer.container_number.ilike(f"%{args.container}%"))

        if not args.reset_existing:
            # Checkpoint Recovery: Bỏ qua những ảnh đã quét
            processed_rows = db.query(LpnAiOcrResult.image_id).filter(LpnAiOcrResult.image_id != None).distinct().all()
            processed_id_set = {r[0] for r in processed_rows if r[0] is not None}
            if processed_id_set:
                query = query.filter(~LpnImage.id.in_(processed_id_set))

        query = query.order_by(LpnContainer.date_loading.desc(), LpnImage.id.desc())
        if args.limit > 0:
            query = query.limit(args.limit)

        rows = query.all()
        total_tasks = len(rows)
    finally:
        db.close()

    if total_tasks == 0:
        print("✅ Tất cả các ảnh đã được quét xong! Không có ảnh nào cần xử lý.")
        return

    print(f"📦 Tổng số ảnh cần quét trong đợt này: {total_tasks:,} ảnh.")
    print(f"⚙️ Cấu hình: {num_workers} Workers song song | Auto-Commit mỗi {args.chunk_size} ảnh.")
    print("💡 Bấm Ctrl+C bất kỳ lúc nào để dừng an toàn (tiến độ quét sẽ được lưu nguyên vẹn).")
    print("-" * 70)

    # Khởi tạo Queues bằng spawn context
    ctx = mp.get_context("spawn")
    task_queue = ctx.Queue(maxsize=num_workers * 10)
    result_queue = ctx.Queue()

    # Tính toán bộ nhớ VRAM cho mỗi worker (chia đều cho GPU)
    mem_frac = max(0.12, min(0.45, 0.85 / float(num_workers))) if torch.cuda.is_available() else 0.0

    # Khởi chạy các tiến trình con
    workers = []
    for wid in range(num_workers):
        p = ctx.Process(
            target=worker_process,
            args=(wid + 1, task_queue, result_queue, args.model_id, mem_frac),
            daemon=True
        )
        p.start()
        workers.append(p)

    # Chuẩn bị Task items
    task_list = []
    for img, item, container in rows:
        task_list.append({
            "image_id": img.id,
            "item_id": item.id,
            "local_path": img.local_path,
            "source_url": img.source_url,
            "container_number": container.container_number,
            "suffix_key": item.suffix_key,
            "gt_lpn": item.lpn,
            "gt_sku": item.sku
        })

    # Tiến trình Producer đẩy task vào Queue trong luồng riêng
    import threading
    def producer_worker():
        for t in task_list:
            task_queue.put(t)
        for _ in range(num_workers):
            task_queue.put(None)  # Sentinel kết thúc

    prod_thread = threading.Thread(target=producer_worker, daemon=True)
    prod_thread.start()

    # Vòng lặp Main Consumer thu thập kết quả và lưu Database
    processed_count = 0
    success_count = 0
    review_count = 0
    failed_count = 0
    batch_buffer = []

    from tqdm import tqdm
    pbar = tqdm(total=total_tasks, desc="Quét AI OCR", unit="ảnh")

    writer_db = SessionLocal()
    t_start = time.time()

    try:
        while processed_count < total_tasks:
            try:
                res = result_queue.get(timeout=1.0)
            except Exception:
                # Kiểm tra nếu tất cả workers đã chết
                if not any(w.is_alive() for w in workers) and task_queue.empty():
                    break
                continue

            batch_buffer.append(res)
            processed_count += 1

            if res["status"] == "success":
                success_count += 1
            elif res["status"] == "review":
                review_count += 1
            else:
                failed_count += 1

            # Commit định kỳ theo chunk_size
            if len(batch_buffer) >= args.chunk_size or processed_count == total_tasks:
                save_results_to_db(writer_db, batch_buffer)
                batch_buffer = []

            # In chi tiết từng ảnh ra màn hình theo thời gian thực
            dur_s = res.get("processing_time_ms", 0.0) / 1000.0
            lpn_val = res.get("detected_lpn") or "None"
            sku_val = res.get("detected_sku") or "None"
            lpn_icon = "✅ Khớp" if res.get("is_lpn_match") else "❌ Khác"
            sku_icon = "✅ Khớp" if res.get("is_sku_match") else "❌ Khác"
            status_badge = "🟢 SUCCESS" if res["status"] == "success" else ("🟡 REVIEW" if res["status"] == "review" else "🔴 FAILED")
            
            pbar.write(f"[Ảnh #{processed_count:>2}/{total_tasks}] (W{res.get('worker_id', 1)} | {dur_s:>4.1f}s) {res['container_number']} ({res['suffix_key']}) -> LPN: {lpn_val} ({lpn_icon}) | SKU: {sku_val} ({sku_icon}) | {status_badge}")

            # Cập nhật thông số trực quan
            elapsed_sec = max(1.0, time.time() - t_start)
            speed_ips = processed_count / elapsed_sec
            succ_pct = round((success_count / processed_count) * 100, 1)

            pbar.set_postfix({
                "Tốc độ": f"{speed_ips:.1f} ảnh/s",
                "Đúng": f"{success_count} ({succ_pct}%)",
                "Cần duyệt": review_count,
                "Lỗi": failed_count
            })
            pbar.update(1)

    except KeyboardInterrupt:
        print("\n\n⚠️ Người dùng đã bấm dừng (Ctrl+C). Đang lưu các kết quả cuối cùng vào CSDL...")
        if batch_buffer:
            save_results_to_db(writer_db, batch_buffer)
            batch_buffer = []
        print("💾 Đã lưu tiến trình thành công! Bạn có thể chạy lại lệnh bất kỳ lúc nào để tiếp tục.")
    finally:
        pbar.close()
        if batch_buffer:
            save_results_to_db(writer_db, batch_buffer)
        writer_db.close()

        # Dọn dẹp các tiến trình con
        for _ in range(num_workers):
            try:
                task_queue.put(None, timeout=0.2)
            except Exception:
                pass
        for w in workers:
            w.join(timeout=1.0)

    tot_dur = time.time() - t_start
    print("\n" + "=" * 70)
    print("📊 BÁO CÁO TỔNG KẾT BATCH OCR")
    print("=" * 70)
    print(f"Tổng số ảnh đã quét    : {processed_count:,} / {total_tasks:,} ảnh")
    print(f"Thời gian thực thi     : {round(tot_dur, 1)}s (~{round(tot_dur/60, 1)} phút)")
    if tot_dur > 0 and processed_count > 0:
        print(f"Tốc độ trung bình      : {processed_count/tot_dur:.2f} ảnh / giây")
    print(f"Thành công (Khớp chuẩn): {success_count:,} ({round(success_count/max(1, processed_count)*100, 1)}%)")
    print(f"Cần kiểm tra lại       : {review_count:,}")
    print(f"Không đọc được/Lỗi     : {failed_count:,}")
    print("=" * 70)


if __name__ == "__main__":
    mp.freeze_support()
    main()
