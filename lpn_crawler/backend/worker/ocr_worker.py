# -*- coding: utf-8 -*-
"""
Dedicated AI OCR Worker & Persistent Queue Processor for LPN Containers.
- Runs as an independent process (ocr_worker.py) so CPU/GPU inference never starves the FastAPI event loop or GIL.
- Claims pending jobs atomically from `lpn_ocr_jobs` with SQL Server UPDLOCK + READPAST.
- Automatically recovers stale 'running' jobs if a worker crashes (heartbeat timeout).
- Optimizes Pass 1 & Pass 2:
  1. Downloads missing images in parallel (I/O bound ThreadPoolExecutor).
  2. Runs ultra-fast ZXing C++ barcode detection across 4 rotations FIRST (20-100ms).
     If LPN matches and no SKU check is needed, skips heavy deep-learning pipeline completely.
  3. Passes pre-decoded numpy image to AiOcrPipeline (avoids reading image from disk twice).
  4. Classifies Pass 1 results into MATCH, MISMATCH_CONFIDENT, UNREADABLE, NO_IMAGE, ERROR.
  5. Pass 2 ONLY retries UNREADABLE, NO_IMAGE, and ERROR items with a strict time budget,
     skipping MISMATCH_CONFIDENT items where the label was already clearly read.
"""

import os
import sys
import re
import json
import time
import socket
import logging
import threading
from logging.handlers import RotatingFileHandler
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, List, Optional, Tuple

# Cap CPU threads per OCR worker to keep system responsive
os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("MKL_NUM_THREADS", "2")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "2")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "2")

# Ensure project root & BackEnd are on sys.path when invoked standalone
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.abspath(os.path.join(_THIS_DIR, "..", "..", ".."))
_BACKEND_ROOT = os.path.join(_PROJECT_ROOT, "BackEnd")
for _p in (_PROJECT_ROOT, _BACKEND_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import requests
from sqlalchemy import text

from app.core.database import SessionLocal, engine
from lpn_crawler.backend.config.settings import settings
from lpn_crawler.backend.models.models import (
    LpnContainer,
    LpnItem,
    LpnImage,
    LpnAiOcrResult,
    LpnOcrJob,
)
from lpn_crawler.backend.services.storage import optimize_and_convert_to_webp, sanitize_folder_name

# ---------------------------------------------------------------------------
# Logging setup (Rotating file + concise console output to avoid CMD stalls)
# ---------------------------------------------------------------------------
LOG_DIR = os.path.join(settings.MODULE_ROOT, "storage", "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "ocr_worker.log")

ocr_logger = logging.getLogger("lpn.ocr")
if not ocr_logger.handlers:
    ocr_logger.setLevel(logging.INFO)
    ocr_logger.propagate = False
    _fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")

    _fh = RotatingFileHandler(LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8")
    _fh.setFormatter(_fmt)
    ocr_logger.addHandler(_fh)

    _ch = logging.StreamHandler(sys.stdout)
    _ch.setFormatter(_fmt)
    ocr_logger.addHandler(_ch)

# Time budgets & thresholds
PASS2_MAX_TOTAL_SECONDS = 90.0
PASS2_MAX_ITEM_SECONDS = 12.0
CONFIDENT_MISMATCH_THRESHOLD = 0.85
STALE_JOB_MINUTES = 5
MAX_JOB_ATTEMPTS = 3

_CONTAINER_OCR_LOCKS: Dict[int, threading.Lock] = {}
_OCR_LOCKS_MUTEX = threading.Lock()


def get_container_lock(container_id: int) -> threading.Lock:
    with _OCR_LOCKS_MUTEX:
        if container_id not in _CONTAINER_OCR_LOCKS:
            _CONTAINER_OCR_LOCKS[container_id] = threading.Lock()
        return _CONTAINER_OCR_LOCKS[container_id]


def download_and_save_webp(
    source_url: str,
    container_number: str,
    suffix_key: str,
    sort_order: int = 1,
    max_retries: int = 2
) -> Optional[Dict[str, Any]]:
    """
    Download image from AppSheet URL at full resolution, convert to WebP, and save to disk.
    """
    if not source_url or not str(source_url).startswith("http"):
        return None

    effective_url = re.sub(r'([?&])width=\d+(&?)', r'\1\2', str(source_url)).rstrip('?&').replace('?&', '?')
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://www.appsheet.com/"
    }

    resp = None
    for attempt in range(max_retries + 1):
        try:
            resp = requests.get(effective_url, timeout=20, headers=headers)
            if resp.status_code in (200, 201, 304) and len(resp.content) >= 500:
                break
            resp = requests.get(source_url, timeout=20, headers=headers)
            if resp.status_code in (200, 201, 304) and len(resp.content) >= 100:
                break
        except Exception as e:
            if attempt == max_retries:
                ocr_logger.warning(f"[Download Error] Attempt {attempt + 1} failed for {suffix_key}: {e}")
            time.sleep(0.5)

    if not resp or resp.status_code not in (200, 201, 304) or len(resp.content) < 100:
        return None

    try:
        final_bytes, file_mime, file_ext, img_hash = optimize_and_convert_to_webp(resp.content)
        file_size = len(final_bytes)

        cont_clean = sanitize_folder_name(container_number or "UNKNOWN")
        suf_clean = sanitize_folder_name(suffix_key or "general")

        dir_path = os.path.join(settings.STORAGE_IMAGES_DIR, cont_clean, suf_clean)
        os.makedirs(dir_path, exist_ok=True)

        filename = f"{img_hash[:12]}_{sort_order}{file_ext}"
        abs_file_path = os.path.join(dir_path, filename)
        rel_file_path = os.path.relpath(abs_file_path, settings.PROJECT_ROOT).replace("\\", "/")

        if not os.path.exists(abs_file_path):
            with open(abs_file_path, "wb") as f:
                f.write(final_bytes)

        return {
            "abs_path": abs_file_path,
            "rel_path": rel_file_path,
            "image_hash": img_hash,
            "file_mime": file_mime,
            "file_size": file_size,
            "source_url": source_url
        }
    except Exception as e:
        ocr_logger.error(f"[Download Save Error] {suffix_key}: {e}")
        return None


def scan_zxing_multirot(cv_img, expected_lpn: Optional[str] = None) -> Tuple[List[str], Optional[str]]:
    """Fast barcode scan via ZXing C++ across 0, 90, 180, 270 degrees (~20-80ms)."""
    barcodes: List[str] = []
    detected_lpn: Optional[str] = None
    if cv_img is None:
        return barcodes, detected_lpn
    try:
        import cv2
        import zxingcpp
        exp_norm = re.sub(r'[^A-Za-z0-9]', '', str(expected_lpn)).upper() if expected_lpn else ""

        for angle in (0, 90, 180, 270):
            if angle == 0:
                t_img = cv_img
            elif angle == 90:
                t_img = cv2.rotate(cv_img, cv2.ROTATE_90_CLOCKWISE)
            elif angle == 180:
                t_img = cv2.rotate(cv_img, cv2.ROTATE_180)
            else:
                t_img = cv2.rotate(cv_img, cv2.ROTATE_90_COUNTERCLOCKWISE)

            found = zxingcpp.read_barcodes(t_img)
            for b in found:
                b_text = str(b.text).strip()
                if b_text and b_text not in barcodes:
                    barcodes.append(b_text)
                if exp_norm:
                    b_norm = re.sub(r'[^A-Za-z0-9]', '', b_text).upper()
                    if b_norm and (b_norm == exp_norm or exp_norm in b_norm or b_norm in exp_norm):
                        detected_lpn = b_text
                elif not detected_lpn and re.fullmatch(r'0\d{8,11}', b_text):
                    detected_lpn = b_text
            if detected_lpn:
                break
    except Exception as e:
        ocr_logger.debug(f"[ZXing Warning] {e}")
    return barcodes, detected_lpn


def _check_lpn_match(expected_lpn: Optional[str], detected_lpn: Optional[str]) -> bool:
    if not expected_lpn or not detected_lpn:
        return False
    exp_clean = re.sub(r'[^A-Za-z0-9]', '', str(expected_lpn)).upper()
    det_clean = re.sub(r'[^A-Za-z0-9]', '', str(detected_lpn)).upper()
    if not exp_clean or not det_clean:
        return False
    return exp_clean == det_clean or exp_clean in det_clean or det_clean in exp_clean


def _check_sku_match(expected_skus: Optional[List[str]], detected_sku: Optional[str]) -> bool:
    if not expected_skus:
        return True
    valid_exp = [s.strip().upper() for s in expected_skus if s and s.strip() not in ("", "None", "0", "-")]
    if not valid_exp:
        return True
    if not detected_sku:
        return False
    det_up = str(detected_sku).strip().upper()
    return any(exp_s in det_up or det_up in exp_s for exp_s in valid_exp)


def _is_valid_lpn_format(lpn_str: Optional[str]) -> bool:
    if not lpn_str:
        return False
    clean = re.sub(r'[^A-Za-z0-9]', '', str(lpn_str)).strip()
    return bool(re.fullmatch(r'\d{7,12}', clean))


def classify_ocr_outcome(
    has_valid_img: bool,
    ocr_row: Optional[LpnAiOcrResult],
    expected_lpn: Optional[str]
) -> str:
    """
    Classify Pass 1 result to decide whether Pass 2 retry is worthwhile:
    - NO_IMAGE: Missing or <100B image on disk -> retry download + scan
    - ERROR: No OCR row or status != 'success' -> retry scan
    - MATCH: LPN matched -> done
    - MISMATCH_CONFIDENT: LPN read clearly (valid format & conf >= 0.85) but differs from declared LPN -> DO NOT retry Pass 2
    - UNREADABLE: Could not read LPN or low confidence -> retry Pass 2 with super-res & multi-orientation
    """
    if not has_valid_img:
        return "NO_IMAGE"
    if not ocr_row or ocr_row.status != "success":
        return "ERROR"
    if ocr_row.is_lpn_match:
        return "MATCH"
    if (
        ocr_row.detected_lpn
        and _is_valid_lpn_format(ocr_row.detected_lpn)
        and float(ocr_row.confidence or 0.0) >= CONFIDENT_MISMATCH_THRESHOLD
    ):
        return "MISMATCH_CONFIDENT"
    return "UNREADABLE"


def enqueue_container_ocr_job(
    db,
    container_id: int,
    container_number: str,
    ocr_tasks: List[Dict[str, Any]],
    target_phone: Optional[str] = None
) -> LpnOcrJob:
    """
    Create or merge a persistent OCR job in `lpn_ocr_jobs`.
    Fixes race condition (NN6-a): if a job for this container is already pending/running,
    merges new tasks into an existing pending job or creates a follow-up pending job so no images are dropped.
    """
    existing_pending = (
        db.query(LpnOcrJob)
        .filter(LpnOcrJob.container_id == container_id, LpnOcrJob.status == "pending")
        .order_by(LpnOcrJob.id.desc())
        .first()
    )

    if existing_pending:
        try:
            old_tasks = json.loads(existing_pending.payload_json or "[]")
        except Exception:
            old_tasks = []
        by_key = {(t.get("item_id"), t.get("image_id")): t for t in old_tasks}
        for t in ocr_tasks:
            by_key[(t.get("item_id"), t.get("image_id"))] = t
        merged = list(by_key.values())
        existing_pending.payload_json = json.dumps(merged, ensure_ascii=False)
        existing_pending.total_items = len(merged)
        if target_phone:
            existing_pending.target_phone = target_phone
        db.commit()
        ocr_logger.info(f"[Queue] Merged {len(ocr_tasks)} tasks into pending Job #{existing_pending.id} for {container_number} (total={len(merged)})")
        return existing_pending

    new_job = LpnOcrJob(
        container_id=container_id,
        container_number=container_number,
        status="pending",
        attempts=0,
        total_items=len(ocr_tasks),
        processed_items=0,
        matched_items=0,
        payload_json=json.dumps(ocr_tasks, ensure_ascii=False),
        target_phone=target_phone,
        created_at=datetime.utcnow()
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    ocr_logger.info(f"[Queue] Enqueued OCR Job #{new_job.id} for Container {container_number} ({len(ocr_tasks)} tasks)")
    return new_job


def _upsert_ocr_result(
    db,
    item_id: int,
    image_id: Optional[int],
    container_number: str,
    suffix_key: str,
    model_id: str,
    detected_lpn: Optional[str],
    detected_sku: Optional[str],
    barcodes: List[str],
    conf: float,
    is_lpn_match: bool,
    is_sku_match: bool,
    status: str,
    dur_ms: float
) -> LpnAiOcrResult:
    """Upsert LpnAiOcrResult keyed by BOTH (item_id, image_id) (fixes NN6-c)."""
    q = db.query(LpnAiOcrResult).filter(LpnAiOcrResult.item_id == item_id)
    if image_id is not None:
        q = q.filter(LpnAiOcrResult.image_id == image_id)
    ocr_row = q.order_by(LpnAiOcrResult.scanned_at.desc(), LpnAiOcrResult.id.desc()).first()

    barcodes_json = json.dumps(barcodes, ensure_ascii=False) if barcodes else None
    if not ocr_row:
        ocr_row = LpnAiOcrResult(
            item_id=item_id,
            image_id=image_id,
            container_number=container_number,
            suffix_key=suffix_key,
            model_id=model_id,
            detected_lpn=detected_lpn,
            detected_sku=detected_sku,
            detected_barcodes=barcodes_json,
            confidence=conf,
            is_lpn_match=is_lpn_match,
            is_sku_match=is_sku_match,
            status=status,
            processing_time_ms=dur_ms,
            scanned_at=datetime.utcnow()
        )
        db.add(ocr_row)
    else:
        ocr_row.model_id = model_id
        ocr_row.detected_lpn = detected_lpn
        ocr_row.detected_sku = detected_sku
        ocr_row.detected_barcodes = barcodes_json
        ocr_row.confidence = conf
        ocr_row.is_lpn_match = is_lpn_match
        ocr_row.is_sku_match = is_sku_match
        ocr_row.status = status
        ocr_row.processing_time_ms = dur_ms
        ocr_row.scanned_at = datetime.utcnow()
    return ocr_row


def execute_container_ocr_pipeline(
    ocr_tasks: List[Dict[str, Any]],
    container_id: int,
    target_phone: Optional[str] = None,
    job_id: Optional[int] = None
):
    """
    Core Two-Pass OCR execution for a container:
    - Parallel image download first (if any task has missing local file)
    - Pass 1: ZXing barcode fast-path -> AiOcrPipeline (with preloaded cv_img)
    - Audit Gate: Only retry UNREADABLE / NO_IMAGE / ERROR items (skips MISMATCH_CONFIDENT)
    - Pass 2: Time-budgeted enhanced scan
    - Dispatches Zalo report upon completion
    """
    if not container_id:
        return

    cont_lock = get_container_lock(container_id)
    if not cont_lock.acquire(timeout=5.0):
        ocr_logger.info(f"[OCR Worker] Container ID {container_id} is currently locked by another thread. Skipping.")
        return

    t_start_all = time.time()
    try:
        import cv2
        from lpn_crawler.ai_ocr_train.core.pipeline import get_default_pipeline

        db = SessionLocal()
        try:
            cont = db.query(LpnContainer).filter(LpnContainer.id == container_id).first()
            if not cont:
                ocr_logger.warning(f"[OCR Worker] Container ID {container_id} not found in DB.")
                return

            all_db_items = (
                db.query(LpnItem)
                .filter(LpnItem.container_id == container_id)
                .order_by(LpnItem.item_index)
                .all()
            )
            if not all_db_items:
                ocr_logger.info(f"[OCR Worker] Container {cont.container_number} has 0 items. Skipping OCR & Zalo.")
                return

            ocr_logger.info(
                f"[OCR Worker] === START Container {cont.container_number} "
                f"(Items={len(all_db_items)}, Tasks={len(ocr_tasks)}, Job={job_id}) ==="
            )

            # 0. Download container picture in background if still a raw URL
            if cont.container_image and str(cont.container_image).startswith("http"):
                c_dl = download_and_save_webp(cont.container_image, cont.container_number, "container", 0)
                if c_dl:
                    cont.container_image = c_dl["rel_path"]
                    db.commit()

            # 1. Parallel download for any task missing a valid local file (Step 2.7)
            tasks_needing_dl = [
                t for t in ocr_tasks
                if (not t.get("abs_path") or not os.path.isfile(t["abs_path"]) or os.path.getsize(t["abs_path"]) < 100)
                and t.get("source_url")
            ]
            if tasks_needing_dl:
                ocr_logger.info(f"[OCR Vong 1] Downloading {len(tasks_needing_dl)} images in parallel (4 workers)...")

                def _dl_worker(task_obj):
                    return task_obj, download_and_save_webp(
                        source_url=task_obj["source_url"],
                        container_number=task_obj.get("container_number") or cont.container_number,
                        suffix_key=task_obj.get("suffix_key") or "item",
                        sort_order=1
                    )

                with ThreadPoolExecutor(max_workers=4) as dl_pool:
                    futures = [dl_pool.submit(_dl_worker, t) for t in tasks_needing_dl]
                    for fut in as_completed(futures):
                        try:
                            t_obj, dl_res = fut.result()
                            if dl_res:
                                t_obj["abs_path"] = dl_res["abs_path"]
                                if t_obj.get("image_id"):
                                    img_row = db.query(LpnImage).filter(LpnImage.id == t_obj["image_id"]).first()
                                    if img_row:
                                        img_row.local_path = dl_res["rel_path"]
                                        img_row.image_hash = dl_res["image_hash"]
                                        img_row.file_mime = dl_res["file_mime"]
                                        img_row.file_size = dl_res["file_size"]
                        except Exception as dl_err:
                            ocr_logger.warning(f"[OCR Vong 1] Parallel download error: {dl_err}")
                db.commit()

            pipeline = get_default_pipeline()
            items_by_id = {it.id: it for it in all_db_items}
            p1_matched = 0
            p1_zx_fastpath = 0
            p1_processed = 0

            # ---------------------------------------------------------
            # PASS 1: ZXing Barcode First -> Pipeline (if needed)
            # ---------------------------------------------------------
            if ocr_tasks:
                for task in ocr_tasks:
                    try:
                        t0 = time.time()
                        item_id = task.get("item_id")
                        db_item = items_by_id.get(item_id)
                        # Step 2.6: Skip items already manually resolved
                        if db_item and db_item.resolution_status == "resolved" and db_item.resolved_by not in (None, "AI_WEBHOOK_P1", "AI_WEBHOOK_P2"):
                            continue

                        abs_p = task.get("abs_path")
                        if not abs_p or not os.path.isfile(abs_p) or os.path.getsize(abs_p) < 100:
                            continue

                        expected_lpn = task.get("expected_lpn")
                        expected_skus = task.get("expected_skus") or []
                        has_expected_sku = any(s and str(s).strip() not in ("", "None", "0", "-") for s in expected_skus)

                        # Step 2.5: Read image ONCE with OpenCV
                        cv_img = cv2.imread(abs_p)
                        if cv_img is None:
                            cv_img = pipeline.preprocessor.load_image(abs_p)
                        if cv_img is None:
                            continue

                        # Step 2.1: Run ZXing barcode multi-rotation FIRST (~20-80ms)
                        zx_barcodes, zx_lpn = scan_zxing_multirot(cv_img, expected_lpn)

                        if zx_lpn and _check_lpn_match(expected_lpn, zx_lpn) and not has_expected_sku:
                            # Fast-path hit: Barcode matched LPN and no SKU verification required
                            detected_lpn = zx_lpn
                            detected_sku = None
                            barcodes = zx_barcodes
                            conf = 0.99
                            is_lpn_match = True
                            is_sku_match = True
                            model_used = "ZXing_FastPath"
                            p1_zx_fastpath += 1
                        else:
                            # Pass pre-decoded numpy array to pipeline so it doesn't re-read from disk
                            res = pipeline.process(
                                image_input=cv_img,
                                expected_lpn=expected_lpn,
                                expected_skus=expected_skus
                            )
                            detected_lpn = zx_lpn or res.get("lpn")
                            detected_sku = res.get("sku")
                            barcodes = list(res.get("barcodes") or [])
                            for zb in zx_barcodes:
                                if zb not in barcodes:
                                    barcodes.append(zb)
                            conf = float(res.get("confidence") or 0.0)
                            if zx_lpn:
                                conf = max(conf, 0.99)
                            is_lpn_match = _check_lpn_match(expected_lpn, detected_lpn)
                            is_sku_match = _check_sku_match(expected_skus, detected_sku)
                            model_used = "AiOcrPipeline"

                        dur_ms = round((time.time() - t0) * 1000, 2)
                        _upsert_ocr_result(
                            db=db,
                            item_id=item_id,
                            image_id=task.get("image_id"),
                            container_number=task.get("container_number") or cont.container_number,
                            suffix_key=task.get("suffix_key") or "",
                            model_id=model_used,
                            detected_lpn=detected_lpn,
                            detected_sku=detected_sku,
                            barcodes=barcodes,
                            conf=conf,
                            is_lpn_match=is_lpn_match,
                            is_sku_match=is_sku_match,
                            status="success",
                            dur_ms=dur_ms
                        )

                        if is_lpn_match and db_item:
                            db_item.resolution_status = "resolved"
                            db_item.resolution_note = f"Khớp AI OCR Vòng 1 ({detected_lpn})"
                            db_item.resolved_at = datetime.utcnow()
                            db_item.resolved_by = "AI_WEBHOOK_P1"
                            p1_matched += 1

                        p1_processed += 1
                        if job_id:
                            db.execute(
                                text("UPDATE lpn_ocr_jobs SET processed_items = :p, matched_items = :m, heartbeat_at = GETUTCDATE() WHERE id = :jid"),
                                {"p": p1_processed, "m": p1_matched, "jid": job_id}
                            )
                        db.commit()
                        ocr_logger.info(
                            f"[AI OCR Vong 1] {task.get('suffix_key')}: LPN={detected_lpn} | "
                            f"Match={is_lpn_match} | Conf={conf:.2f} | Engine={model_used} ({dur_ms}ms)"
                        )
                    except Exception as item_err:
                        db.rollback()
                        ocr_logger.exception(f"[AI OCR Vong 1 Loi] {task.get('suffix_key')}: {item_err}")

            # ---------------------------------------------------------
            # AUDIT GATE (Step 2.2 & 2.3): Classify & filter Pass 2 candidates
            # ---------------------------------------------------------
            all_imgs = db.query(LpnImage).filter(LpnImage.container_id == container_id).all()
            imgs_by_item: Dict[int, List[LpnImage]] = {}
            for im in all_imgs:
                imgs_by_item.setdefault(im.lpn_item_id, []).append(im)

            item_ids = [it.id for it in all_db_items]
            all_ocrs = (
                db.query(LpnAiOcrResult)
                .filter(LpnAiOcrResult.item_id.in_(item_ids))
                .order_by(LpnAiOcrResult.scanned_at.asc(), LpnAiOcrResult.id.asc())
                .all()
            ) if item_ids else []
            latest_ocr_by_item: Dict[int, LpnAiOcrResult] = {}
            for oc in all_ocrs:
                latest_ocr_by_item[oc.item_id] = oc  # ordered asc -> last is newest (fixes NN6-b)

            retry_candidates = []
            skipped_confident_mismatch = 0

            for item in all_db_items:
                if item.resolution_status == "resolved":
                    continue

                imgs = imgs_by_item.get(item.id, [])
                latest_ocr = latest_ocr_by_item.get(item.id)

                has_valid_img = False
                for img in imgs:
                    if img.local_path:
                        abs_f = os.path.join(settings.PROJECT_ROOT, img.local_path)
                        if os.path.isfile(abs_f) and os.path.getsize(abs_f) >= 100:
                            has_valid_img = True
                            break

                outcome = classify_ocr_outcome(has_valid_img, latest_ocr, item.lpn)
                if outcome == "MISMATCH_CONFIDENT":
                    skipped_confident_mismatch += 1
                    ocr_logger.info(
                        f"[Audit Gate] Skip Vong 2 cho {item.suffix_key}: "
                        f"MISMATCH_CONFIDENT (Declared={item.lpn}, Detected={latest_ocr.detected_lpn}, Conf={latest_ocr.confidence:.2f})"
                    )
                    continue

                if outcome in ("NO_IMAGE", "ERROR", "UNREADABLE"):
                    retry_candidates.append({
                        "item": item,
                        "images": imgs,
                        "latest_ocr": latest_ocr,
                        "reason": outcome
                    })

            # ---------------------------------------------------------
            # PASS 2: Time-Budgeted Retry Only for UNREADABLE / NO_IMAGE / ERROR
            # ---------------------------------------------------------
            p2_matched = 0
            if retry_candidates:
                ocr_logger.info(
                    f"[AI OCR Vong 2] >>> Quet lai {len(retry_candidates)} kien "
                    f"(Bo qua {skipped_confident_mismatch} kien MISMATCH_CONFIDENT) cho Container {cont.container_number}..."
                )
                p2_start = time.time()
                for candidate in retry_candidates:
                    elapsed_p2 = time.time() - p2_start
                    if elapsed_p2 > PASS2_MAX_TOTAL_SECONDS:
                        ocr_logger.warning(
                            f"[AI OCR Vong 2] Vuot ngan sach thoi gian ({elapsed_p2:.1f}s > {PASS2_MAX_TOTAL_SECONDS}s). Dung Vong 2."
                        )
                        break

                    try:
                        item = candidate["item"]
                        imgs = candidate["images"]
                        t0 = time.time()

                        target_img_obj = imgs[0] if imgs else None
                        abs_p = None
                        if target_img_obj and target_img_obj.local_path:
                            chk_p = os.path.join(settings.PROJECT_ROOT, target_img_obj.local_path)
                            if os.path.isfile(chk_p) and os.path.getsize(chk_p) >= 100:
                                abs_p = chk_p

                        if (not abs_p) and target_img_obj and target_img_obj.source_url:
                            dl_retry = download_and_save_webp(
                                source_url=target_img_obj.source_url,
                                container_number=cont.container_number,
                                suffix_key=item.suffix_key,
                                sort_order=1,
                                max_retries=2
                            )
                            if dl_retry:
                                abs_p = dl_retry["abs_path"]
                                target_img_obj.local_path = dl_retry["rel_path"]
                                target_img_obj.file_size = dl_retry["file_size"]
                                target_img_obj.image_hash = dl_retry["image_hash"]
                                db.commit()

                        if not abs_p or not os.path.isfile(abs_p):
                            ocr_logger.warning(f"[AI OCR Vong 2] Khong co anh hop le cho {item.suffix_key}. Bo qua.")
                            continue

                        cv_img = cv2.imread(abs_p)
                        if cv_img is None:
                            cv_img = pipeline.preprocessor.load_image(abs_p)
                        if cv_img is None:
                            continue

                        zx_barcodes, zx_lpn = scan_zxing_multirot(cv_img, expected_lpn=item.lpn)
                        exp_skus = [item.sku] if item.sku else []

                        res = pipeline.process(
                            image_input=cv_img,
                            auto_crop=True,
                            auto_rotate=True,
                            apply_super_res=True,
                            expected_lpn=item.lpn,
                            expected_skus=exp_skus,
                            package_position=item.suffix_key
                        )

                        detected_lpn = zx_lpn or res.get("lpn")
                        detected_sku = res.get("sku")
                        barcodes = list(res.get("barcodes") or [])
                        for zb in zx_barcodes:
                            if zb not in barcodes:
                                barcodes.append(zb)

                        conf = float(res.get("confidence") or 0.0)
                        if zx_lpn:
                            conf = max(conf, 0.99)

                        is_lpn_match = _check_lpn_match(item.lpn, detected_lpn)
                        is_sku_match = _check_sku_match(exp_skus, detected_sku)
                        dur_ms = round((time.time() - t0) * 1000, 2)

                        target_img_id = target_img_obj.id if target_img_obj else None
                        _upsert_ocr_result(
                            db=db,
                            item_id=item.id,
                            image_id=target_img_id,
                            container_number=cont.container_number,
                            suffix_key=item.suffix_key,
                            model_id="AiOcrPipeline_Pass2",
                            detected_lpn=detected_lpn,
                            detected_sku=detected_sku,
                            barcodes=barcodes,
                            conf=conf,
                            is_lpn_match=is_lpn_match,
                            is_sku_match=is_sku_match,
                            status="success" if (is_lpn_match or res.get("success", True)) else "failed",
                            dur_ms=dur_ms
                        )

                        if is_lpn_match:
                            item.resolution_status = "resolved"
                            item.resolution_note = f"Khớp AI OCR Vòng 2 ({detected_lpn})"
                            item.resolved_at = datetime.utcnow()
                            item.resolved_by = "AI_WEBHOOK_P2"
                            p2_matched += 1

                        if job_id:
                            db.execute(
                                text("UPDATE lpn_ocr_jobs SET heartbeat_at = GETUTCDATE() WHERE id = :jid"),
                                {"jid": job_id}
                            )
                        db.commit()
                        ocr_logger.info(
                            f"[AI OCR Vong 2] {item.suffix_key} ({candidate['reason']}): "
                            f"LPN={detected_lpn} | Match={is_lpn_match} ({dur_ms}ms)"
                        )
                    except Exception as p2_err:
                        db.rollback()
                        ocr_logger.exception(f"[AI OCR Vong 2 Loi] {candidate['item'].suffix_key}: {p2_err}")

            total_dur_s = round(time.time() - t_start_all, 2)
                        # Ch?y ??i so?t ch?o an to?n (Swap pairs / Co-located barcodes) tr??c khi t?ng k?t v? g?i Zalo
            try:
                from lpn_crawler.backend.services.pallet_grouping import resolve_cross_item_matches
                cross_res = resolve_cross_item_matches(container_id, db)
                ocr_logger.info(f"[OCR Worker] Cross-item match resolved: {cross_res.get('resolved_count', 0)} items")
            except Exception as cross_err:
                ocr_logger.warning(f"[OCR Worker] Error resolving cross matches: {cross_err}")

            ocr_logger.info(
                f"[OCR Worker] === DONE Container {cont.container_number} in {total_dur_s}s "
                f"(P1={p1_matched}/{p1_processed} [ZXing={p1_zx_fastpath}], "
                f"P2={p2_matched}/{len(retry_candidates)}, SkippedConfident={skipped_confident_mismatch}) ==="
            )
        finally:
            db.close()

        # Dispatch Zalo report once all passes complete
        try:
            from lpn_crawler.backend.services.zalo_bot_service import ZaloBotService
            ocr_logger.info(f"[Zalo Bot] Sending container report for ID {container_id} to {target_phone}...")
            z_res = ZaloBotService.send_container_report(
                container_id=container_id,
                target_phone=target_phone,
                send_image=True
            )
            ocr_logger.info(f"[Zalo Bot] Result: {z_res.get('message')}")
        except Exception as ze:
            ocr_logger.exception(f"[Zalo Bot Error] Failed sending report for container {container_id}: {ze}")
    finally:
        cont_lock.release()


# ---------------------------------------------------------------------------
# Standalone Worker Loop (Claims jobs from `lpn_ocr_jobs` table)
# ---------------------------------------------------------------------------
def _lower_process_priority():
    """Set worker CPU priority to BELOW_NORMAL on Windows so API/Web never lags."""
    try:
        import ctypes
        BELOW_NORMAL_PRIORITY_CLASS = 0x00004000
        handle = ctypes.windll.kernel32.GetCurrentProcess()
        ctypes.windll.kernel32.SetPriorityClass(handle, BELOW_NORMAL_PRIORITY_CLASS)
        ocr_logger.info("[OCR Worker] Set Windows process priority to BELOW_NORMAL.")
    except Exception as e:
        ocr_logger.debug(f"[OCR Worker] Priority notice: {e}")


def recover_stale_ocr_jobs(db):
    """Reset jobs stuck in 'running' whose heartbeat is older than STALE_JOB_MINUTES."""
    try:
        cutoff = datetime.utcnow() - timedelta(minutes=STALE_JOB_MINUTES)
        res = db.execute(
            text("""
                UPDATE lpn_ocr_jobs
                SET status = CASE WHEN attempts >= :max_att THEN 'failed' ELSE 'pending' END,
                    last_error = N'Auto-recovered from stale running state (worker restart/timeout)'
                WHERE status = 'running'
                  AND (heartbeat_at IS NULL OR heartbeat_at < :cutoff)
            """),
            {"max_att": MAX_JOB_ATTEMPTS, "cutoff": cutoff}
        )
        if res.rowcount and res.rowcount > 0:
            db.commit()
            ocr_logger.warning(f"[OCR Worker] Recovered {res.rowcount} stale OCR job(s).")
    except Exception as e:
        db.rollback()
        ocr_logger.warning(f"[OCR Worker] Stale recovery check failed: {e}")


def claim_next_ocr_job(db, worker_id: str) -> Optional[Dict[str, Any]]:
    """Atomically claim the oldest pending job using SQL Server UPDLOCK + READPAST."""
    try:
        row = db.execute(
            text("""
                UPDATE TOP (1) lpn_ocr_jobs WITH (UPDLOCK, READPAST)
                SET status = 'running',
                    attempts = ISNULL(attempts, 0) + 1,
                    worker_id = :wid,
                    started_at = GETUTCDATE(),
                    heartbeat_at = GETUTCDATE()
                OUTPUT inserted.id, inserted.container_id, inserted.container_number,
                       inserted.payload_json, inserted.target_phone, inserted.attempts
                WHERE status = 'pending'
            """),
            {"wid": worker_id}
        ).fetchone()
        db.commit()
        if not row:
            return None
        return {
            "id": row[0],
            "container_id": row[1],
            "container_number": row[2],
            "payload_json": row[3],
            "target_phone": row[4],
            "attempts": row[5],
        }
    except Exception as e:
        db.rollback()
        ocr_logger.error(f"[OCR Worker] Claim job error: {e}")
        return None


def process_claimed_job(job_dict: Dict[str, Any]):
    job_id = job_dict["id"]
    container_id = job_dict["container_id"]
    target_phone = job_dict.get("target_phone")
    try:
        ocr_tasks = json.loads(job_dict.get("payload_json") or "[]")
    except Exception:
        ocr_tasks = []

    try:
        execute_container_ocr_pipeline(
            ocr_tasks=ocr_tasks,
            container_id=container_id,
            target_phone=target_phone,
            job_id=job_id
        )
        with engine.connect() as conn:
            trans = conn.begin()
            try:
                conn.execute(
                    text("UPDATE lpn_ocr_jobs SET status = 'done', finished_at = GETUTCDATE(), heartbeat_at = GETUTCDATE() WHERE id = :jid"),
                    {"jid": job_id}
                )
                trans.commit()
            except Exception:
                trans.rollback()
                raise
    except Exception as err:
        ocr_logger.exception(f"[OCR Worker] Job #{job_id} failed: {err}")
        with engine.connect() as conn:
            trans = conn.begin()
            try:
                attempts = int(job_dict.get("attempts") or 1)
                next_status = "failed" if attempts >= MAX_JOB_ATTEMPTS else "pending"
                conn.execute(
                    text("""
                        UPDATE lpn_ocr_jobs
                        SET status = :st,
                            last_error = :err,
                            finished_at = CASE WHEN :st = 'failed' THEN GETUTCDATE() ELSE NULL END
                        WHERE id = :jid
                    """),
                    {"st": next_status, "err": str(err)[:2000], "jid": job_id}
                )
                trans.commit()
            except Exception:
                trans.rollback()


def run_worker_forever(poll_interval: float = 2.0):
    """Main loop for standalone `ocr_worker.py` process."""
    _lower_process_priority()
    worker_id = f"{socket.gethostname()}-PID{os.getpid()}"
    ocr_logger.info(f"============================================================")
    ocr_logger.info(f"[OCR Worker] Starting Dedicated AI OCR Worker ({worker_id})")
    ocr_logger.info(f"[OCR Worker] Log file: {LOG_FILE}")
    ocr_logger.info(f"============================================================")

    # Pre-warm models once inside worker process
    try:
        from lpn_crawler.ai_ocr_train.core.ocr_engine import OcrEngine
        from lpn_crawler.ai_ocr_train.core.pipeline import get_default_pipeline
        eng = OcrEngine()
        eng.warmup()
        get_default_pipeline()
        ocr_logger.info("[OCR Worker] AI OCR Pipeline & DirectML GPU models pre-warmed!")
    except Exception as warm_err:
        ocr_logger.warning(f"[OCR Worker] Warmup notice: {warm_err}")

    last_stale_check = 0.0
    while True:
        try:
            now = time.time()
            db = SessionLocal()
            try:
                if now - last_stale_check > 30.0:
                    recover_stale_ocr_jobs(db)
                    last_stale_check = now
                claimed = claim_next_ocr_job(db, worker_id)
            finally:
                db.close()

            if claimed:
                process_claimed_job(claimed)
            else:
                time.sleep(poll_interval)
        except KeyboardInterrupt:
            ocr_logger.info("[OCR Worker] Shutting down cleanly.")
            break
        except Exception as loop_err:
            ocr_logger.exception(f"[OCR Worker] Loop error: {loop_err}")
            time.sleep(poll_interval)


if __name__ == "__main__":
    run_worker_forever()

