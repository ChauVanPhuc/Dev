# -*- coding: utf-8 -*-
import os
import json
import logging
import asyncio
import shutil
import time
import re
import tempfile
from datetime import datetime

from app.shared.utils import normalize_penalty_value
from app.shared.pdf_parser import parse_pdf_claims
from modules.claim.models import CustomerClaim
from modules.claim.schemas import CustomerClaimCreate
from modules.claim.services import claim_service
from app.core.input_archive_service import archive_input_file

logger = logging.getLogger("claim_import")
logger.setLevel(logging.INFO)

# Module-level cache for defect codes & names
_defect_map_cache = None
_defect_map_cache_time = 0.0
_defect_name_cache = None
_defect_name_cache_time = 0.0

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
STATIC_DIR = os.path.join(BACKEND_DIR, "static")
CLAIM_IMPORTS_DIR = os.path.join(STATIC_DIR, "uploads", "claim_imports")
DATA_DIR = os.path.join(BACKEND_DIR, "data")

IMAGES_DIR = os.path.join(CLAIM_IMPORTS_DIR, "images")
PDFS_DIR = os.path.join(CLAIM_IMPORTS_DIR, "pdfs")
UPLOADS_DIR = os.path.join(CLAIM_IMPORTS_DIR, "uploads")
CUSTOMER_PENALTY_PDFS_DIR = os.path.join(STATIC_DIR, "uploads", "customer_penalty_pdfs")

os.makedirs(CLAIM_IMPORTS_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(PDFS_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(CUSTOMER_PENALTY_PDFS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

def _safe_cleanup_batch_files(pdf_path: str, images_batch_dir: str):
    """Dọn dẹp an toàn file PDF tạm và thư mục ảnh trên Windows (tránh lỗi WinError 145 khi handle đang khóa)."""
    if pdf_path and os.path.exists(pdf_path):
        try:
            os.remove(pdf_path)
        except OSError as rm_err:
            logger.warning(f"Không thể xóa file PDF tạm {pdf_path}: {rm_err}")

    if images_batch_dir and os.path.exists(images_batch_dir):
        try:
            shutil.rmtree(images_batch_dir, ignore_errors=False)
        except OSError as dir_err:
            logger.warning(f"Dọn thư mục ảnh {images_batch_dir} lần 1 gặp lỗi ({dir_err}), thử lại...")
            time.sleep(0.1)
            try:
                shutil.rmtree(images_batch_dir, ignore_errors=True)
            except OSError as retry_err:
                logger.warning(f"Bỏ qua khóa handle thư mục ảnh {images_batch_dir}: {retry_err}")

def save_customer_penalty_pdf(filename: str, content: bytes, month: str = None) -> tuple[str, str]:
    """Saves uploaded customer penalty / credit note PDF into static storage and returns (saved_name, file_url)."""
    safe_filename = filename.split('/')[-1].split('\\')[-1]
    safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', safe_filename)
    safe_filename = re.sub(r'_+', '_', safe_filename)
    prefix = f"penalty_{month.replace('-', '_')}_" if month and month != "N/A" else f"penalty_{datetime.now().strftime('%Y%m%d_%H%M%S')}_"
    saved_name = f"{prefix}{safe_filename}"
    file_path = os.path.join(CUSTOMER_PENALTY_PDFS_DIR, saved_name)
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Archive source PDF into Data/input/claims/pdf/customer_penalty/
    try:
        from app.core.input_archive_service import archive_input_file
        archive_input_file("claims", "pdf", filename, content, sub_type="customer_penalty")
    except Exception as arch_err:
        logger.error(f"Error archiving customer penalty PDF {filename}: {arch_err}")

    file_url = f"/static/uploads/customer_penalty_pdfs/{saved_name}"
    return saved_name, file_url

def save_pdf_to_static_storage(filename: str, file_bytes: bytes, batch_id: str):
    """Deprecated: PDF files are archived directly to Data/input/claims/pdf/claim_info/."""
    safe_filename = filename.split('/')[-1].split('\\')[-1]
    safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', safe_filename)
    safe_filename = re.sub(r'_+', '_', safe_filename)
    return f"{batch_id}_{safe_filename}"

def get_existing_claims_keys(db=None):
    """Checks database for existing claims to avoid duplicates during import."""
    keys = set()
    if db is None:
        return keys
        
    try:
        db_items = db.query(CustomerClaim).all()
        for c in db_items:
            cab_no = None
            if c.claim_code:
                cab_match = re.search(r'(?:Cabinet|Claim)\s*#?\s*(\d+)', c.claim_code, re.IGNORECASE)
                if cab_match:
                    try:
                        cab_no = int(cab_match.group(1))
                    except Exception:
                        pass
            
            key = (
                cab_no,
                str(c.product_name or "").strip(),
                str(c.description or "").strip(),
                str(c.order_code or "").strip(),
                normalize_penalty_value(c.action),
                str(c.lpn or "").strip(),
                str(c.container_no or "").strip(),
                str(c.period or "").strip()
            )
            keys.add(key)
    except Exception as e:
        logger.warning(f"Error reading existing claims from database: {e}")
    return keys

def generate_unique_claim_code(c, period, db, local_seen_codes, mechanism_id=None):
    """
    Generates a unique claim code:
    - Cơ chế 3 (Label-Value Table): Claim#<no>_<month_year>[_suffix]
    - Cơ chế 1 & 2 (Cabinet-based Table): Cabinet#<no>_<month_year>[_suffix]
    """
    prefix = "Claim" if (mechanism_id == 3 or c.get("reference_prefix") == "Claim") else "Cabinet"
    claim_num = c.get("claim_no") if prefix == "Claim" else c.get("cabinet_no")
    if claim_num is None:
        claim_num = c.get("cabinet_no") or c.get("claim_no") or "Unknown"
        
    period_str = c.get("period") or period or ""
    month_year = re.sub(r'[^0-9]', '', period_str)
    if not month_year:
        month_year = datetime.now().strftime("%m%Y")
        
    base_code = f"{prefix}#{claim_num}_{month_year}"
    
    candidate = base_code
    suffix = 1
    
    while True:
        if candidate in local_seen_codes:
            candidate = f"{base_code}_{suffix}"
            suffix += 1
            continue
            
        if db:
            exists = db.query(CustomerClaim).filter(CustomerClaim.claim_code == candidate).first()
            if exists:
                candidate = f"{base_code}_{suffix}"
                suffix += 1
                continue
                
        break
        
    local_seen_codes.add(candidate)
    return candidate

def process_pdf_import(file_bytes: bytes = None, filename: str = "", db=None, pdf_bytes: bytes = None):
    """
    Core function: parses PDF claims, performs duplicate check, saves to DB,
    and archives source PDF to Data/input/claims/pdf/claim_info/ upon success.
    """
    if file_bytes is None:
        file_bytes = pdf_bytes
    if file_bytes is None:
        raise ValueError("file_bytes or pdf_bytes content must be provided.")
    """
    Main ingestion orchestrator. Saves PDF, extracts claims/photos, writes outputs,
    saves to Database, and returns a success payload.
    """
    if not filename.lower().endswith('.pdf'):
        raise ValueError("Chỉ chấp nhận các tệp tin định dạng PDF.")
        
    batch_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    images_batch_dir = os.path.join(IMAGES_DIR, batch_id)
    os.makedirs(images_batch_dir, exist_ok=True)
    
    # 1. Save single primary PDF to Data/input/claims/pdf/claim_info/
    try:
        pdf_path = archive_input_file("claims", "pdf", filename, file_bytes, sub_type="claim_info")
    except Exception as arch_err:
        logger.error(f"Error archiving source PDF {filename}: {arch_err}")
        pdf_path = os.path.join(tempfile.gettempdir(), f"{batch_id}_{filename}")
        with open(pdf_path, "wb") as f:
            f.write(file_bytes)
        
    # 2. Parse claims using shared service
    try:
        seen_keys = get_existing_claims_keys(db) if db else set()
        claims, period, parse_warnings, mechanism_info = parse_pdf_claims(
            pdf_path, batch_id, images_batch_dir, seen_keys.copy(), normalize_penalty_value
        )
        logger.info(f"File {filename}: Sử dụng {mechanism_info['name']} — {len(claims)} claims, period={period}")
        
        # Check duplicate claims against DB
        if seen_keys and claims:
            dup_count = 0
            new_claims = []
            for c in claims:
                try:
                    cab_no = int(c["cabinet_no"]) if c.get("cabinet_no") is not None else None
                except (ValueError, TypeError):
                    cab_no = c.get("cabinet_no")
                
                data_fields = (
                    str(c.get("sku") or "").strip(),
                    str(c.get("claim_description") or "").strip(),
                    str(c.get("defect_code") or "").strip(),
                    normalize_penalty_value(c.get("action")),
                    str(c.get("lpn") or "").strip(),
                    str(c.get("container_no") or "").strip(),
                    str(c.get("period") or "").strip()
                )
                key_with_cab = (cab_no,) + data_fields
                key_without_cab = (None,) + data_fields
                
                if key_with_cab in seen_keys or key_without_cab in seen_keys:
                    dup_count += 1
                else:
                    new_claims.append(c)
            
            if dup_count == len(claims) and len(claims) > 0:
                _safe_cleanup_batch_files(pdf_path, images_batch_dir)
                raise ValueError(
                    f"Dữ liệu từ file [{filename}] đã tồn tại trong hệ thống! "
                    f"Tất cả {dup_count} dòng khiếu nại đã được import trước đó. "
                    f"Không thể import trùng lặp."
                )
            claims = new_claims

        # Generate unique claim_code for each parsed claim
        local_seen_codes = set()
        c_mech_id = mechanism_info.get("id") if isinstance(mechanism_info, dict) else None
        for c in claims:
            if not c.get("claim_code") and (c.get("cabinet_no") is not None or c.get("claim_no") is not None):
                c["claim_code"] = generate_unique_claim_code(c, period, db, local_seen_codes, c_mech_id)
    except Exception as parse_err:
        if not isinstance(parse_err, ValueError):
            logger.exception("PDF parsing process failed critically.")
        _safe_cleanup_batch_files(pdf_path, images_batch_dir)
        if isinstance(parse_err, ValueError):
            raise parse_err
        raise RuntimeError(f"Lỗi phân tích cú pháp PDF: {str(parse_err)}")
        
    # 3. Save each claim to Database
    db_saved_count = 0
    if db:
        for c in claims:
            try:
                code = c.get("claim_code")
                if not code and (c.get("cabinet_no") is not None or c.get("claim_no") is not None):
                    claim_num = c.get("claim_no") or c.get("cabinet_no")
                    prefix = "Claim" if c.get("reference_prefix") == "Claim" else "Cabinet"
                    code = c.get("id", f"{batch_id}_{prefix}#{claim_num}_{c.get('stt', 0)}")
                
                claim_data = CustomerClaimCreate(
                    claim_code=code,
                    customer_name=c.get("customer_name") or "Atlas",
                    product_name=c.get("sku"),
                    order_code=c.get("defect_code"),
                    company_error_code=c.get("company_error_code") or resolve_company_error_codes(c.get("defect_code"), db),
                    description=c.get("claim_description"),
                    severity=c.get("severity") or "Medium",
                    status="Received",
                    lpn=c.get("lpn"),
                    container_no=c.get("container_no"),
                    action=c.get("action"),
                    period=c.get("period") or period,
                    image_paths=c.get("image_paths"),
                    image_captions=c.get("image_captions")
                )
                claim_service.create_claim(db, claim_data)
                db_saved_count += 1
            except Exception as e:
                logger.error(f"Failed to save claim {code} to DB: {e}")
                parse_warnings.append(f"Lỗi lưu vào DB: {code}")

    total_photos = sum(len(c.get("image_paths") or []) for c in claims)
    return {
        "success": True,
        "batch_id": batch_id,
        "period": period,
        "total_records": len(claims),
        "photo_count": total_photos,
        "linked_photos_count": total_photos,
        "db_saved_count": db_saved_count,
        "parse_warnings": parse_warnings,
        "file_stats": [
            {
                "filename": filename,
                "claims_count": len(claims),
                "photo_count": total_photos,
                "period": period,
                "mechanism": mechanism_info
            }
        ],
        "mechanism": mechanism_info
    }

async def process_folder_import(files, db=None):
    """
    Orchestrates the ingestion pipeline for multiple PDF files from a folder.
    """
    batch_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    images_batch_dir = os.path.join(IMAGES_DIR, batch_id)
    os.makedirs(images_batch_dir, exist_ok=True)
    
    combined_claims = []
    combined_warnings = []
    periods = []
    file_stats = []
    
    stt_counter = 1
    seen_keys = get_existing_claims_keys(db)
    local_seen_codes = set()
    logger.info(f"Starting folder import with {len(files)} files. Existing claims in DB: {len(seen_keys)}")
    
    db_saved_count = 0
    total_parsed_count = 0
    
    for upload_file in files:
        filename = upload_file.filename.split('/')[-1].split('\\')[-1]
        file_bytes = await upload_file.read()
        
        try:
            pdf_path = archive_input_file("claims", "pdf", filename, file_bytes, sub_type="claim_info")
        except Exception as arch_err:
            logger.error(f"Error archiving source PDF {filename}: {arch_err}")
            pdf_path = os.path.join(tempfile.gettempdir(), f"{batch_id}_{filename}")
            with open(pdf_path, "wb") as f:
                f.write(file_bytes)
            
        try:
            claims, period, parse_warnings, mechanism_info = parse_pdf_claims(
                pdf_path, batch_id, images_batch_dir, seen_keys, normalize_penalty_value
            )
            total_parsed_count += len(claims)
            logger.info(f"File {filename}: Sử dụng {mechanism_info['name']} — {len(claims)} claims, period={period}")
            
            for c in claims:
                if not c.get("claim_code") and (c.get("cabinet_no") is not None or c.get("claim_no") is not None):
                    c["claim_code"] = generate_unique_claim_code(c, period, db, local_seen_codes, mechanism_info.get("id") if isinstance(mechanism_info, dict) else None)
            
            file_stats.append({
                "filename": filename,
                "claims_count": len(claims),
                "period": period,
                "mechanism": mechanism_info
            })
            
            if db:
                for c in claims:
                    try:
                        code = c.get("claim_code")
                        if not code and (c.get("cabinet_no") is not None or c.get("claim_no") is not None):
                            code = f"{batch_id}_{stt_counter}"
                            stt_counter += 1
                        
                        claim_data = CustomerClaimCreate(
                            claim_code=code,
                            customer_name=c.get("customer_name") or "Atlas",
                            product_name=c.get("sku"),
                            order_code=c.get("defect_code"),
                            company_error_code=c.get("company_error_code") or resolve_company_error_codes(c.get("defect_code"), db),
                            description=c.get("claim_description"),
                            severity=c.get("severity") or "Medium",
                            status="Received",
                            lpn=c.get("lpn"),
                            container_no=c.get("container_no"),
                            action=c.get("action"),
                            period=c.get("period") or period,
                            image_paths=c.get("image_paths"),
                            image_captions=c.get("image_captions")
                        )
                        claim_service.create_claim(db, claim_data)
                        db_saved_count += 1
                    except Exception as db_err:
                        logger.error(f"Failed to save claim {code} from {filename} to DB: {db_err}")
                        parse_warnings.append(f"Lỗi lưu DB: {code} - {str(db_err)}")

            for c in claims:
                c["stt"] = stt_counter
                c["id"] = f"{batch_id}_{stt_counter}"
                stt_counter += 1
                combined_claims.append(c)
                
            if period:
                periods.append(period)
                
            for w in parse_warnings:
                combined_warnings.append(f"[{filename}] {w}")
                
        except Exception as parse_err:
            logger.warning(f"Lỗi phân tích cú pháp file {filename}: {str(parse_err)}")
            combined_warnings.append(f"[{filename}] Lỗi: {str(parse_err)}")
            
    final_period = ", ".join(sorted(list(set(periods)))) if periods else "N/A"
    total_photos = sum(len(c.get("image_paths") or []) for c in combined_claims)
    logger.info(f"Import summary: Total parsed={total_parsed_count}, Combined unique={len(combined_claims)}, Total photos={total_photos}, DB saved={db_saved_count}")
            
    return {
        "success": True,
        "batch_id": batch_id,
        "period": final_period,
        "total_records": len(combined_claims),
        "photo_count": total_photos,
        "linked_photos_count": total_photos,
        "db_saved_count": db_saved_count,
        "parse_warnings": combined_warnings,
        "file_stats": file_stats
    }

async def process_folder_import_streaming(files, db=None):
    """
    SSE streaming version of folder import.
    """
    batch_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    images_batch_dir = os.path.join(IMAGES_DIR, batch_id)
    os.makedirs(images_batch_dir, exist_ok=True)
    
    combined_claims = []
    combined_warnings = []
    periods = []
    file_stats = []
    stt_counter = 1
    total_files = len(files)
    seen_keys = get_existing_claims_keys(db)
    local_seen_codes = set()
    db_saved_count = 0
    
    file_data_list = []
    for upload_file in files:
        filename = upload_file.filename.split('/')[-1].split('\\')[-1]
        file_bytes = await upload_file.read()
        file_data_list.append((filename, file_bytes))
    
    start_event = {
        "type": "start",
        "batch_id": batch_id,
        "total_files": total_files
    }
    yield f"data: {json.dumps(start_event, ensure_ascii=False)}\n\n"
    await asyncio.sleep(0)
    
    for file_idx, (filename, file_bytes) in enumerate(file_data_list):
        progress_event = {
            "type": "progress",
            "file_index": file_idx + 1,
            "total_files": total_files,
            "filename": filename,
            "status": "processing",
            "percent": int((file_idx / total_files) * 100)
        }
        yield f"data: {json.dumps(progress_event, ensure_ascii=False)}\n\n"
        await asyncio.sleep(0)
        
        try:
            pdf_path = archive_input_file("claims", "pdf", filename, file_bytes, sub_type="claim_info")
        except Exception as arch_err:
            logger.error(f"Error archiving source PDF {filename}: {arch_err}")
            pdf_path = os.path.join(tempfile.gettempdir(), f"{batch_id}_{filename}")
            with open(pdf_path, "wb") as f:
                f.write(file_bytes)
        
        claims_count = 0
        try:
            claims, period, parse_warnings, mechanism_info = parse_pdf_claims(
                pdf_path, batch_id, images_batch_dir, seen_keys, normalize_penalty_value
            )
            logger.info(f"File {filename}: Sử dụng {mechanism_info['name']} — {len(claims)} claims, period={period}")
            
            for c in claims:
                if not c.get("claim_code") and (c.get("cabinet_no") is not None or c.get("claim_no") is not None):
                    c["claim_code"] = generate_unique_claim_code(c, period, db, local_seen_codes, mechanism_info.get("id") if isinstance(mechanism_info, dict) else None)
            
            file_stats.append({
                "filename": filename,
                "claims_count": len(claims),
                "period": period,
                "mechanism": mechanism_info
            })
            
            if db:
                for c in claims:
                    try:
                        code = c.get("claim_code")
                        if not code and (c.get("cabinet_no") is not None or c.get("claim_no") is not None):
                            code = f"{batch_id}_{stt_counter}"
                            stt_counter += 1
                        
                        claim_data = CustomerClaimCreate(
                            claim_code=code,
                            customer_name=c.get("customer_name") or "Atlas",
                            product_name=c.get("sku"),
                            order_code=c.get("defect_code"),
                            company_error_code=c.get("company_error_code") or resolve_company_error_codes(c.get("defect_code"), db),
                            description=c.get("claim_description"),
                            severity=c.get("severity") or "Medium",
                            status="Received",
                            lpn=c.get("lpn"),
                            container_no=c.get("container_no"),
                            action=c.get("action"),
                            period=c.get("period") or period,
                            image_paths=c.get("image_paths"),
                            image_captions=c.get("image_captions")
                        )
                        claim_service.create_claim(db, claim_data)
                        db_saved_count += 1
                    except Exception as db_err:
                        logger.error(f"Failed to save claim {code} from {filename} to DB: {db_err}")
                        combined_warnings.append(f"Lỗi lưu DB: {code} - {str(db_err)}")
            
            for c in claims:
                c["stt"] = stt_counter
                c["id"] = f"{batch_id}_{stt_counter}"
                stt_counter += 1
                combined_claims.append(c)
            
            claims_count = len(claims)
            if period:
                periods.append(period)
            for w in parse_warnings:
                combined_warnings.append(f"[{filename}] {w}")
            
            done_event = {
                "type": "progress",
                "file_index": file_idx + 1,
                "total_files": total_files,
                "filename": filename,
                "status": "done",
                "claims_found": claims_count,
                "mechanism": mechanism_info,
                "percent": int(((file_idx + 1) / total_files) * 90)
            }
            yield f"data: {json.dumps(done_event, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0)
            
        except Exception as parse_err:
            logger.warning(f"Lỗi phân tích cú pháp file {filename}: {str(parse_err)}")
            combined_warnings.append(f"[{filename}] Lỗi: {str(parse_err)}")
            
            error_event = {
                "type": "progress",
                "file_index": file_idx + 1,
                "total_files": total_files,
                "filename": filename,
                "status": "error",
                "error": str(parse_err),
                "percent": int(((file_idx + 1) / total_files) * 90)
            }
            yield f"data: {json.dumps(error_event, ensure_ascii=False)}\n\n"
            await asyncio.sleep(0)
    
    final_period = periods[0] if periods else "N/A"
    total_photos = sum(len(c.get("image_paths") or []) for c in combined_claims)
    final_event = {
        "type": "result",
        "success": True,
        "batch_id": batch_id,
        "period": final_period,
        "total_records": len(combined_claims),
        "photo_count": total_photos,
        "linked_photos_count": total_photos,
        "db_saved_count": db_saved_count,
        "parse_warnings": combined_warnings,
        "file_stats": file_stats
    }
    yield f"data: {json.dumps(final_event, ensure_ascii=False)}\n\n"

def load_temp_claims(resolve_company_func=None, db=None):
    """
    Loads temporary claims from temp_claims.json if available in data directory.
    """
    file_path = os.path.join(DATA_DIR, "temp_claims.json")
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Error reading temp_claims.json: {e}")
    return []

def resolve_company_error_codes(order_code: str, db = None) -> str:
    global _defect_map_cache, _defect_map_cache_time
    if not order_code:
        return ""
    
    now = time.time()
    if _defect_map_cache is None or (now - _defect_map_cache_time > 10.0):
        defect_map = {}
        
        # Load DB defects from defect module
        close_db = False
        if not db:
            try:
                from config.database import SessionLocal
                db = SessionLocal()
                close_db = True
            except Exception:
                db = None
                close_db = False

        try:
            if db:
                from modules.inspection.models.defect_type import ClientDefect
                db_defects = db.query(ClientDefect).all()
                for d in db_defects:
                    code = d.code
                    g7 = d.g7_code
                    if code and g7:
                        clean_code = str(code).strip().upper()
                        if clean_code not in defect_map:
                            defect_map[clean_code] = str(g7).strip()
        except Exception as e:
            logger.warning(f"Error querying DB defects in resolve_company_error_codes: {e}")
        finally:
            if close_db and db:
                db.close()
                
        _defect_map_cache = defect_map
        _defect_map_cache_time = now
    else:
        defect_map = _defect_map_cache
            
    tokens = re.split(r'[\\,\/;]|\s+', order_code)
    tokens = [t.strip().upper() for t in tokens if t.strip()]
    
    mapped_g7s = []
    for token in tokens:
        if token in defect_map:
            mapped_g7s.append(defect_map[token])
        else:
            normalized_token = token.replace('-', '_')
            if normalized_token in defect_map:
                mapped_g7s.append(defect_map[normalized_token])
                
    if mapped_g7s:
        return ", ".join(mapped_g7s)
        
    return ""

def resolve_company_error_names(order_code: str, db = None) -> str:
    global _defect_name_cache, _defect_name_cache_time
    if not order_code:
        return ""
    
    now = time.time()
    if _defect_name_cache is None or (now - _defect_name_cache_time > 10.0):
        name_map = {}
        
        close_db = False
        if not db:
            try:
                from config.database import SessionLocal
                db = SessionLocal()
                close_db = True
            except Exception:
                db = None
                close_db = False

        try:
            if db:
                from modules.inspection.models.defect_type import ClientDefect
                db_defects = db.query(ClientDefect).all()
                for d in db_defects:
                    code = d.code
                    name = d.name
                    if code and name:
                        clean_code = str(code).strip().upper()
                        if clean_code not in name_map:
                            name_map[clean_code] = str(name).strip()
        except Exception as e:
            logger.warning(f"Error querying DB defects in resolve_company_error_names: {e}")
        finally:
            if close_db and db:
                db.close()
                
        _defect_name_cache = name_map
        _defect_name_cache_time = now
    else:
        name_map = _defect_name_cache
            
    tokens = re.split(r'[\\,\/;]|\s+', order_code)
    tokens = [t.strip().upper() for t in tokens if t.strip()]
    
    mapped_names = []
    for token in tokens:
        if token in name_map:
            mapped_names.append(name_map[token])
        else:
            normalized_token = token.replace('-', '_')
            if normalized_token in name_map:
                mapped_names.append(name_map[normalized_token])
                
    if mapped_names:
        return ", ".join(mapped_names)
        
    return ""


def calculate_claim_penalty_from_price_map(claim: dict, price_map: dict) -> float:
    action = str(claim.get('action') or claim.get('penalty') or '').upper()
    sku = str(claim.get('sku') or claim.get('product_name') or '').strip().upper()
    
    # 1. Direct $ amount in action
    if '$' in action:
        m = re.search(r'\$?([\d,]+(?:\.\d+)?)', action)
        if m:
            try:
                return float(m.group(1).replace(',', ''))
            except:
                pass
        return 50.0
        
    price = price_map.get(sku, 0.0)
    if not price:
        base_sku = sku.split('-')[0] if '-' in sku else sku
        for k, v in price_map.items():
            if k.startswith(base_sku):
                price = v
                break
                
    if 'X2' in action:
        return price * 2
    elif 'FULL BC' in action or 'BC' in action:
        return price
    elif 'REPAIR' in action:
        return 50.0
    return price if price > 0 else 0.0


def parse_credit_note_pdf_content(content: bytes, filename: str = "", db = None) -> dict:
    """
    Parses a Credit Note / Claim Report PDF from bytes.
    Extracts the month (e.g. "09-2026"), credit note number, factory, total penalty amount,
    and all claim table rows across all pages.
    """
    import fitz

    doc = fitz.open(stream=content, filetype="pdf")
    full_text = ""
    page_texts = []
    for p in doc:
        pt = p.get_text()
        page_texts.append(pt)
        full_text += pt + "\n"

    # Factory
    factory = "VINA G7"
    m_fact = re.search(r'FACTORY\s*:\s*([^\r\n]+)', full_text, re.IGNORECASE)
    if m_fact:
        factory = m_fact.group(1).strip()

    # Credit Note Number
    credit_note_no = ""
    m_cn = re.search(r'CREDIT\s+NOTE\s*:\s*([A-Za-z0-9\-]+)', full_text, re.IGNORECASE)
    if m_cn:
        credit_note_no = m_cn.group(1).strip()

    # Date Report Issued
    date_issued = ""
    m_date = re.search(r'DATE\s+REPORT\s+ISSUED\s*:\s*([^\r\n]+)', full_text, re.IGNORECASE)
    if m_date:
        date_issued = m_date.group(1).strip()

    # Total Credit Amount
    total_amount = 0.0
    m_amt = re.search(r'TOTAL\s+CREDIT\s+AMOUNT\s*[:\-]?\s*[\$]?\s*([\d,]+(?:\.\d+)?)', full_text, re.IGNORECASE)
    if not m_amt:
        m_amt = re.search(r'TOTAL\s+AMOUNT\s*[:\-]?\s*[\$]?\s*([\d,]+(?:\.\d+)?)', full_text, re.IGNORECASE)
    if m_amt:
        try:
            total_amount = float(m_amt.group(1).replace(",", ""))
        except ValueError:
            pass

    # Month extraction priority:
    # 1. Header/Title Month YYYY (e.g. SEPTEMBER 2026, September-2026, THÁNG 09/2026)
    # Strictly ignore Date Report Issued lines or dates with 3 parts (e.g. 10-05-2026)
    month_map = {
        "january": "01", "february": "02", "march": "03", "april": "04",
        "may": "05", "june": "06", "july": "07", "august": "08",
        "september": "09", "october": "10", "november": "11", "december": "12",
        "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
        "jul": "07", "aug": "08", "sep": "09", "sept": "09", "oct": "10", "nov": "11", "dec": "12"
    }

    parsed_month = None
    for pt in page_texts:
        top_lines = [l.strip() for l in pt.splitlines() if l.strip()][:6]
        for line in top_lines:
            if "DATE REPORT ISSUED" in line.upper():
                continue
            m_my = re.search(r'\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s*[-–\s\/]\s*(\d{4})\b', line, re.IGNORECASE)
            if m_my:
                m_digit = month_map.get(m_my.group(1).lower())
                if m_digit:
                    parsed_month = f"{m_digit}-{m_my.group(2)}"
                    break
            m_th = re.search(r'TH[AÁ]NG\s*(\d{1,2})\s*[-–\/]\s*(\d{4})', line, re.IGNORECASE)
            if m_th:
                parsed_month = f"{int(m_th.group(1)):02d}-{m_th.group(2)}"
                break
        if parsed_month:
            break

    # 2. Business metadata
    if not parsed_month:
        m_meta = re.search(r'(?:CLAIM\s+MONTH|PERIOD|THÁNG\s+CLAIM)\s*[:\-]?\s*(\d{1,2})[-–\/](\d{4})', full_text, re.IGNORECASE)
        if m_meta:
            parsed_month = f"{int(m_meta.group(1)):02d}-{m_meta.group(2)}"

    # 3. Fallback from filename
    if not parsed_month and filename:
        m_fn = re.search(r'[T_](\d{1,2})[_\-\s].*?(\d{4})', filename, re.IGNORECASE)
        if m_fn:
            parsed_month = f"{int(m_fn.group(1)):02d}-{m_fn.group(2)}"
        else:
            m_fn2 = re.search(r'(?:^|[^\d])(\d{1,2})[-_](\d{4})(?:[^\d]|$)', filename)
            if m_fn2:
                parsed_month = f"{int(m_fn2.group(1)):02d}-{m_fn2.group(2)}"

    period = parsed_month or "09-2026"
    clean_period = period.replace("-", "")

    # Parse all claim table rows
    claims = []
    ignore_patterns = [
        r'FACTORY:', r'CREDIT\s+NOTE:', r'DATE\s+REPORT\s+ISSUED:',
        r'TOTAL\s+CREDIT\s+AMOUNT', r'TOTAL\s+AMOUNT',
        r'STT\s+SKU', r'STT\tSKU'
    ]

    for page in doc:
        for raw_line in page.get_text().splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if any(re.search(pat, line, re.IGNORECASE) for pat in ignore_patterns):
                continue
            if re.match(r'^(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}$', line, re.IGNORECASE):
                continue
            stt_match = re.match(r'^(\d{1,3})\s+(.*)$', line)
            if not stt_match:
                continue
            stt_num = int(stt_match.group(1))
            rest = stt_match.group(2).strip()

            if '\t' in raw_line:
                parts = [p.strip() for p in raw_line.split('\t')]
                sku = parts[1] if len(parts) > 1 else ''
                container = parts[2] if len(parts) > 2 else ''
                lpn = parts[3] if len(parts) > 3 else ''
                action = parts[4] if len(parts) > 4 else ''
            else:
                tokens = rest.split()
                if not tokens:
                    continue
                sku = tokens[0]
                tokens = tokens[1:]
                container = ''
                lpn = ''
                action = ''
                if tokens and re.match(r'^[A-Za-z]{3,4}\d{6,7}$', tokens[0]):
                    container = tokens[0].upper()
                    tokens = tokens[1:]
                if tokens and re.match(r'^\d{7,12}$', tokens[0]):
                    lpn = str(tokens[0])
                    tokens = tokens[1:]
                action = ' '.join(tokens)

            claims.append({
                "cabinet_no": stt_num,
                "claim_no": stt_num,
                "stt": stt_num,
                "claim_code": f"Claim#{stt_num}_{clean_period}",
                "customer_name": factory,
                "sku": sku,
                "product_name": sku,
                "container_no": container,
                "lpn": str(lpn) if lpn else "",
                "action": action,
                "period": period,
                "status": "Mới",
                "defect_code": "Credit Note",
                "description": f"Credit Note {credit_note_no} - Item {stt_num} ({sku})",
                "image_paths": [],
                "image_captions": []
            })

    doc.close()

    is_success = bool(parsed_month and (total_amount > 0 or len(claims) > 0))
    file_url = None
    saved_name = None
    if is_success and parsed_month:
        try:
            saved_name, file_url = save_customer_penalty_pdf(filename, content, parsed_month)
        except Exception as err:
            logger.error(f"Error saving customer penalty PDF: {err}")

    return {
        "month": parsed_month or "N/A",
        "period": parsed_month or "N/A",
        "credit_note_no": credit_note_no,
        "factory": factory,
        "date_issued": date_issued,
        "total_amount": round(total_amount, 2),
        "currency": "USD",
        "claims_count": len(claims),
        "claims": claims,
        "filename": filename,
        "saved_filename": saved_name,
        "file_url": file_url,
        "success": is_success
    }

