# -*- coding: utf-8 -*-
import os
import json
import logging
import asyncio
import time
import re
import tempfile
from datetime import datetime

from app.shared.utils import normalize_penalty_value
from app.shared.pdf_parser import parse_pdf_claims
from app.modules.claim.models import CustomerClaim
from app.modules.claim.schemas import CustomerClaimCreate
from app.modules.claim import service as claim_service
from app.core.input_archive_service import archive_input_file

logger = logging.getLogger("claim_import")
logger.setLevel(logging.INFO)

# Module-level cache for defect codes & names
_defect_map_cache = None
_defect_map_cache_time = 0.0
_defect_name_cache = None
_defect_name_cache_time = 0.0

from config.settings import BACKEND_DIR, STATIC_DIR, get_upload_dir

CLAIM_IMPORTS_DIR = get_upload_dir("claim_imports")
DATA_DIR = os.path.join(BACKEND_DIR, "data")

IMAGES_DIR = os.path.join(CLAIM_IMPORTS_DIR, "images")
PDFS_DIR = os.path.join(CLAIM_IMPORTS_DIR, "pdfs")
UPLOADS_DIR = os.path.join(CLAIM_IMPORTS_DIR, "uploads")
CUSTOMER_PENALTY_PDFS_DIR = get_upload_dir("customer_penalty_pdfs")

os.makedirs(CLAIM_IMPORTS_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(PDFS_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(CUSTOMER_PENALTY_PDFS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

def save_customer_penalty_pdf(filename: str, content: bytes, month: str = None) -> tuple[str, str]:
    """Saves uploaded customer penalty / credit note PDF into static storage and returns (saved_name, file_url)."""
    safe_filename = filename.split('/')[-1].split('\\')[-1]
    safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', safe_filename)
    safe_filename = re.sub(r'_+', '_', safe_filename)
    prefix = f"penalty_{month.replace('-', '_')}_" if month and month != "N/A" else f"penalty_{datetime.now().strftime('%Y%m%d_%H%M%S')}_"
    saved_name = f"{prefix}{safe_filename}"
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
                cab_match = re.search(r'Cabinet\s*#?\s*(\d+)', c.claim_code, re.IGNORECASE)
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

def generate_unique_claim_code(c, period, db, local_seen_codes):
    """
    Generates a unique claim code in the format: Cabinet#<no>_<month_year>[_suffix]
    e.g., Cabinet#1_052026
    """
    cabinet_no = c.get("cabinet_no")
    if cabinet_no is None:
        cabinet_no = "Unknown"
        
    period_str = c.get("period") or period or ""
    month_year = re.sub(r'[^0-9]', '', period_str)
    if not month_year:
        month_year = datetime.now().strftime("%m%Y")
        
    base_code = f"Cabinet#{cabinet_no}_{month_year}"
    
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

def validate_import_files(files, db=None):
    """
    Validates that all uploaded PDF files contain at least one valid claim.
    Also checks if claims already exist in DB - blocks import if all claims are duplicates.
    """
    existing_keys = get_existing_claims_keys(db) if db else set()
    total_new_claims = 0
    total_duplicate_claims = 0
    
    for upload_file in files:
        filename = upload_file.filename.split('/')[-1].split('\\')[-1]
        file_bytes = upload_file.file.read()
        upload_file.file.seek(0)
        
        temp_pdf_name = f"val_route_{datetime.now().strftime('%H%M%S_%f')}_{filename}"
        temp_pdf_path = os.path.join(tempfile.gettempdir(), temp_pdf_name)
        with open(temp_pdf_path, "wb") as f:
            f.write(file_bytes)
            
        try:
            seen_keys_temp = set()
            claims, period, parse_warnings, mechanism_info = parse_pdf_claims(
                temp_pdf_path, "val_batch", "", seen_keys_temp, normalize_penalty_value, claims_only=True
            )
            
            if os.path.exists(temp_pdf_path):
                os.remove(temp_pdf_path)
                
            if not claims or len(claims) == 0:
                raise ValueError(f"file PDF [{filename}] ko hợp lệ, yêu cầu kiểm tra lại")
            
            if existing_keys:
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
                    
                    if key_with_cab in existing_keys or key_without_cab in existing_keys:
                        total_duplicate_claims += 1
                    else:
                        total_new_claims += 1
            else:
                total_new_claims += len(claims)
                
        except Exception as e:
            if os.path.exists(temp_pdf_path):
                os.remove(temp_pdf_path)
            if isinstance(e, ValueError) and "ko hợp lệ" in str(e):
                raise e
            raise ValueError(f"Lỗi khi đọc file {filename}: {str(e)}")
    
    if total_new_claims == 0 and total_duplicate_claims > 0:
        raise ValueError(
            f"Dữ liệu đã tồn tại trong hệ thống! "
            f"Tất cả {total_duplicate_claims} dòng khiếu nại đã được import trước đó. "
            f"Không thể import trùng lặp."
        )

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
                if os.path.exists(pdf_path):
                    os.remove(pdf_path)
                if os.path.exists(images_batch_dir):
                    import shutil
                    shutil.rmtree(images_batch_dir)
                raise ValueError(
                    f"Dữ liệu từ file [{filename}] đã tồn tại trong hệ thống! "
                    f"Tất cả {dup_count} dòng khiếu nại đã được import trước đó. "
                    f"Không thể import trùng lặp."
                )
            claims = new_claims

        # Generate unique claim_code for each parsed claim
        local_seen_codes = set()
        for c in claims:
            if not c.get("claim_code") and c.get("cabinet_no") is not None:
                c["claim_code"] = generate_unique_claim_code(c, period, db, local_seen_codes)
    except Exception as parse_err:
        logger.exception("PDF parsing process failed critically.")
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
        if os.path.exists(images_batch_dir):
            import shutil
            shutil.rmtree(images_batch_dir)
        if isinstance(parse_err, ValueError):
            raise parse_err
        raise RuntimeError(f"Lỗi phân tích cú pháp PDF: {str(parse_err)}")
        
    # 3. Save each claim to Database
    db_saved_count = 0
    if db:
        for c in claims:
            try:
                code = c.get("claim_code")
                if not code and c.get("cabinet_no") is not None:
                    code = c.get("id", f"{batch_id}_Cabinet#{c['cabinet_no']}_{c.get('stt', 0)}")
                
                claim_data = CustomerClaimCreate(
                    claim_code=code,
                    customer_name=c.get("customer_name") or "Atlas",
                    product_name=c.get("sku"),
                    order_code=c.get("defect_code"),
                    company_error_code=c.get("company_error_code"),
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

    return {
        "success": True,
        "batch_id": batch_id,
        "period": period,
        "total_records": len(claims),
        "db_saved_count": db_saved_count,
        "parse_warnings": parse_warnings,
        "file_stats": [
            {
                "filename": filename,
                "claims_count": len(claims),
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
                if not c.get("claim_code") and c.get("cabinet_no") is not None:
                    c["claim_code"] = generate_unique_claim_code(c, period, db, local_seen_codes)
            
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
                        if not code and c.get("cabinet_no") is not None:
                            code = f"{batch_id}_{stt_counter}"
                            stt_counter += 1
                        
                        claim_data = CustomerClaimCreate(
                            claim_code=code,
                            customer_name=c.get("customer_name") or "Atlas",
                            product_name=c.get("sku"),
                            order_code=c.get("defect_code"),
                            company_error_code=c.get("company_error_code"),
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
    logger.info(f"Import summary: Total parsed={total_parsed_count}, Combined unique={len(combined_claims)}, DB saved={db_saved_count}")
            
    return {
        "success": True,
        "batch_id": batch_id,
        "period": final_period,
        "total_records": len(combined_claims),
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
                if not c.get("claim_code") and c.get("cabinet_no") is not None:
                    c["claim_code"] = generate_unique_claim_code(c, period, db, local_seen_codes)
            
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
                        if not code and c.get("cabinet_no") is not None:
                            code = f"{batch_id}_{stt_counter}"
                            stt_counter += 1
                        
                        claim_data = CustomerClaimCreate(
                            claim_code=code,
                            customer_name=c.get("customer_name") or "Atlas",
                            product_name=c.get("sku"),
                            order_code=c.get("defect_code"),
                            company_error_code=c.get("company_error_code"),
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
    final_event = {
        "type": "result",
        "success": True,
        "batch_id": batch_id,
        "period": final_period,
        "total_records": len(combined_claims),
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
                from app.core.database import SessionLocal
                db = SessionLocal()
                close_db = True
            except Exception:
                db = None
                close_db = False

        try:
            if db:
                from app.modules.defect.models import ClientDefect
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
                from app.core.database import SessionLocal
                db = SessionLocal()
                close_db = True
            except Exception:
                db = None
                close_db = False

        try:
            if db:
                from app.modules.defect.models import ClientDefect
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
    Extracts the month (e.g. "01-2026") and the total customer penalty amount.
    """
    import fitz
    import tempfile
    from app.shared.pdf_parser import parse_pdf_claims
    from app.modules.price.models import CabinetPrice
    
    # 1. First check if direct text has TOTAL CREDIT AMOUNT pattern
    doc = fitz.open(stream=content, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text() + "\n"
    doc.close()
    
    month_map = {
        "january": "01", "february": "02", "march": "03", "april": "04",
        "may": "05", "june": "06", "july": "07", "august": "08",
        "september": "09", "october": "10", "november": "11", "december": "12"
    }
    
    # Search for Month YYYY pattern in text
    month_year_match = re.search(
        r"\b(january|february|march|april|may|june|july|august|september|october|november|december)\s*[-–\s]\s*(\d{4})\b",
        text,
        re.IGNORECASE
    )
    
    parsed_month = None
    if month_year_match:
        m_name = month_year_match.group(1).lower()
        year = month_year_match.group(2)
        m_digit = month_map.get(m_name)
        if m_digit:
            parsed_month = f"{m_digit}-{year}"
            
    # Also check "THÁNG MM - YYYY" or "THÁNG MM/YYYY" in text
    if not parsed_month:
        thang_match = re.search(r"TH[AÁ]NG\s*(\d{1,2})\s*[-–\/]\s*(\d{4})", text, re.IGNORECASE)
        if thang_match:
            parsed_month = f"{int(thang_match.group(1)):02d}-{thang_match.group(2)}"
            
    # Search for direct TOTAL CREDIT AMOUNT
    amount_match = re.search(
        r"TOTAL\s+CREDIT\s+AMOUNT\s*[:\-]?\s*[\$]?\s*([\d,]+(?:\.\d+)?)",
        text,
        re.IGNORECASE
    )
    if not amount_match:
        amount_match = re.search(r"TOTAL\s+AMOUNT\s*[:\-]?\s*[\$]?\s*([\d,]+(?:\.\d+)?)", text, re.IGNORECASE)
        
    if parsed_month and amount_match:
        try:
            amt = float(amount_match.group(1).replace(",", ""))
            if amt > 0:
                saved_name, file_url = save_customer_penalty_pdf(filename, content, parsed_month)
                return {
                    "month": parsed_month,
                    "total_amount": amt,
                    "filename": filename,
                    "saved_filename": saved_name,
                    "file_url": file_url,
                    "claims_count": 0,
                    "success": True
                }
        except ValueError:
            pass

    # 2. Parse claims from PDF and calculate penalty sum
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_file:
        tmp_file.write(content)
        tmp_path = tmp_file.name
        
    try:
        with tempfile.TemporaryDirectory() as tmp_img_dir:
            claims, period, warnings, mech = parse_pdf_claims(tmp_path, "credit_note_calc", tmp_img_dir, claims_only=True)
            
        if not parsed_month and period:
            parsed_month = period
            
        # Get prices from DB
        price_map = {}
        if db:
            prices = db.query(CabinetPrice).all()
            price_map = {p.cabinet_code.strip().upper(): float(p.sale_price or p.base_price or 0) for p in prices if p.cabinet_code}
            
        total_penalty = sum(calculate_claim_penalty_from_price_map(c, price_map) for c in claims)
        is_success = parsed_month is not None and (total_penalty > 0 or len(claims) > 0)
        
        file_url = None
        saved_name = None
        if is_success and parsed_month:
            saved_name, file_url = save_customer_penalty_pdf(filename, content, parsed_month)
            
        return {
            "month": parsed_month or "N/A",
            "total_amount": round(total_penalty, 2),
            "claims_count": len(claims),
            "filename": filename,
            "saved_filename": saved_name,
            "file_url": file_url,
            "success": is_success
        }
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

