# -*- coding: utf-8 -*-
import os
import json
import logging
import asyncio
import time
import re
from datetime import datetime
from shared.utils.claim_utils import normalize_penalty_value
from shared.services.pdf_parser_service import group_blocks_into_rows, parse_pdf_claims, save_claims_to_excel

from modules.claim.controllers import claim_controller as db_controllers
from modules.claim.schemas.claim_schemas import CustomerClaimCreate

# Module-level cache for defect codes to avoid N+1 queries/file reads
_defect_map_cache = None
_defect_map_cache_time = 0.0

logger = logging.getLogger("claim_import")
logger.setLevel(logging.INFO)

# Paths for claim imports - use BackEnd/static/uploads for images
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Fix: BACKEND_DIR already includes 'modules', so don't add it again
CLAIM_IMPORTS_DIR = os.path.join(BACKEND_DIR, "claim_imports")
PRICE_IMPORTS_DIR = os.path.join(BACKEND_DIR, "price_imports")
DEFECT_IMPORTS_DIR = os.path.join(BACKEND_DIR, "defect_imports")

UPLOADS_DIR = os.path.join(CLAIM_IMPORTS_DIR, "uploads")
JSON_DIR = os.path.join(CLAIM_IMPORTS_DIR, "json")
EXCEL_DIR = os.path.join(CLAIM_IMPORTS_DIR, "excel")
# Use BackEnd/static/uploads for images and PDF archives
BACKEND_STATIC_DIR = os.path.join(os.path.dirname(BACKEND_DIR), "static")
IMAGES_DIR = os.path.join(BACKEND_STATIC_DIR, "uploads", "claim_imports", "images")
PDFS_DIR = os.path.join(BACKEND_STATIC_DIR, "uploads", "claim_imports", "pdfs")

# Ensure all self-contained directories exist
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(JSON_DIR, exist_ok=True)
os.makedirs(EXCEL_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(PDFS_DIR, exist_ok=True)
os.makedirs(PRICE_IMPORTS_DIR, exist_ok=True)
os.makedirs(DEFECT_IMPORTS_DIR, exist_ok=True)

def save_pdf_to_static_storage(filename: str, file_bytes: bytes, batch_id: str):
    """Saves the imported PDF file into the static folder for later download and preview."""
    import re
    safe_filename = filename.split('/')[-1].split('\\')[-1]
    # Replace non-alphanumeric (except dots, dashes and underscores) with underscores
    safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', safe_filename)
    safe_filename = re.sub(r'_+', '_', safe_filename)
    
    saved_name = f"{batch_id}_{safe_filename}"
    pdf_path = os.path.join(PDFS_DIR, saved_name)
    with open(pdf_path, "wb") as f:
        f.write(file_bytes)
    return saved_name

def get_imported_pdfs_list():
    """Returns list of all imported PDF files saved in static directory."""
    if not os.path.exists(PDFS_DIR):
        return []
    
    pdfs = []
    for fn in os.listdir(PDFS_DIR):
        if not fn.lower().endswith('.pdf'):
            continue
        full_path = os.path.join(PDFS_DIR, fn)
        stat = os.stat(full_path)
        
        # Extract original filename by removing batch prefix (YYYYMMDD_HHMMSS_)
        orig_name = fn
        if len(fn) > 16 and fn[15] == '_':
            orig_name = fn[16:]
        elif "original.pdf" in fn:
            orig_name = fn
            
        pdfs.append({
            "filename": fn,
            "original_name": orig_name,
            "size": stat.st_size,
            "created_at": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
            "url": f"/static/uploads/claim_imports/pdfs/{fn}"
        })
    # Sort by created_at newest first
    pdfs.sort(key=lambda x: x["created_at"], reverse=True)
    return pdfs

def delete_imported_pdf(filename: str):
    """Deletes an imported PDF file from disk."""
    pdf_path = os.path.join(PDFS_DIR, filename)
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
        return True
    return False

def validate_import_files(files, db=None):
    """
    Validates that all uploaded PDF files contain at least one valid claim.
    Also checks if claims already exist in DB - blocks import if all claims are duplicates.
    Raises ValueError if any file is invalid, empty, or contains only duplicate data.
    """
    # Get existing keys from DB for duplicate checking
    existing_keys = get_existing_claims_keys(db) if db else set()
    
    total_new_claims = 0
    total_duplicate_claims = 0
    
    for upload_file in files:
        filename = upload_file.filename.split('/')[-1].split('\\')[-1]
        
        # Read file bytes
        file_bytes = upload_file.file.read()
        upload_file.file.seek(0)
        
        temp_pdf_name = f"val_route_{datetime.now().strftime('%H%M%S_%f')}_{filename}"
        temp_pdf_path = os.path.join(UPLOADS_DIR, temp_pdf_name)
        with open(temp_pdf_path, "wb") as f:
            f.write(file_bytes)
            
        try:
            seen_keys_temp = set()
            claims, period, parse_warnings, mechanism_info = parse_pdf_claims(temp_pdf_path, "val_batch", "", seen_keys_temp, normalize_penalty_value, claims_only=True)
            
            if os.path.exists(temp_pdf_path):
                os.remove(temp_pdf_path)
                
            if not claims or len(claims) == 0:
                raise ValueError(f"file PDF [{filename}] ko hợp lệ, yêu cầu kiểm tra lại")
            
            # Check how many claims are duplicates
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
    
    # If ALL claims are duplicates, block the import
    if total_new_claims == 0 and total_duplicate_claims > 0:
        raise ValueError(
            f"Dữ liệu đã tồn tại trong hệ thống! "
            f"Tất cả {total_duplicate_claims} dòng khiếu nại đã được import trước đó. "
            f"Không thể import trùng lặp."
        )



def get_existing_claims_keys(db=None):
    """Checks database for existing claims to avoid duplicates during import.
    
    Key format must match the deduplication key in parse_pdf_claims:
    (cabinet_no, sku, claim_description, defect_code, action, lpn, container_no, period)
    
    Since cabinet_no is NOT stored in DB, we extract it from claim_code if possible,
    otherwise we use None (which still allows matching when parser also produces None).
    """
    keys = set()
    if db is None:
        return keys
        
    try:
        from modules.claim.models.claim_models import CustomerClaim
        db_items = db.query(CustomerClaim).all()
        for c in db_items:
            # Extract cabinet_no from claim_code
            # claim_code formats: "20260709_093016_1" or "Cabinet #45" or "batch_Cabinet#45_1"
            cab_no = None
            if c.claim_code:
                # Try "Cabinet #XX" format
                cab_match = re.search(r'Cabinet\s*#?\s*(\d+)', c.claim_code, re.IGNORECASE)
                if cab_match:
                    try:
                        cab_no = int(cab_match.group(1))
                    except:
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


def process_pdf_import(file_bytes: bytes, filename: str, db=None):
    """
    Main ingestion orchestrator. Saves PDF, extracts claims/photos, writes outputs,
    saves to Database, and returns a success payload.
    """
    if not filename.lower().endswith('.pdf'):
        raise ValueError("Chỉ chấp nhận các tệp tin định dạng PDF.")
        
    batch_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create specific directories inside claim_imports/
    images_batch_dir = os.path.join(IMAGES_DIR, batch_id)
    os.makedirs(images_batch_dir, exist_ok=True)
    
    # 1. Save original PDF inside uploads/
    pdf_path = os.path.join(UPLOADS_DIR, f"{batch_id}_original.pdf")
    with open(pdf_path, "wb") as f:
        f.write(file_bytes)
    
    # Save copy to static storage for downloads/previews
    save_pdf_to_static_storage(filename, file_bytes, batch_id)
        
    # 2. Parse claims using shared service
    try:
        seen_keys = get_existing_claims_keys(db)
        claims, period, parse_warnings, mechanism_info = parse_pdf_claims(pdf_path, batch_id, images_batch_dir, seen_keys, normalize_penalty_value)
        logger.info(f"File {filename}: Sử dụng {mechanism_info['name']} — {len(claims)} claims, period={period}")
    except Exception as parse_err:
        logger.exception("PDF parsing process failed critically.")
        # Cleanup PDF and images
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
        if os.path.exists(images_batch_dir):
            import shutil
            shutil.rmtree(images_batch_dir)
        raise RuntimeError(f"Lỗi phân tích cú pháp PDF: {str(parse_err)}")
        
    # 3. Save each claim to Database
    db_saved_count = 0
    if db:
        for c in claims:
            try:
                # Generate claim_code from cabinet_no if missing
                code = c.get("claim_code")
                if not code and c.get("cabinet_no") is not None:
                    # Use c["id"] which is already unique across the entire batch
                    # This was set in parse_pdf_claims after deduplication
                    code = c.get("id", f"{batch_id}_Cabinet#{c['cabinet_no']}_{c.get('stt', 0)}")
                
                # Map JSON fields to Schema
                claim_data = CustomerClaimCreate(
                    claim_code=code,
                    customer_name=c.get("customer_name") or "Atlas",
                    product_name=c.get("sku"),
                    order_code=c.get("defect_code"),
                    company_error_code=c.get("company_error_code"),
                    description=c.get("claim_description"),
                    severity=c.get("severity") or "Medium",
                    status="Received", # Default status for new imports
                    lpn=c.get("lpn"),
                    container_no=c.get("container_no"),
                    action=c.get("action"),
                    period=c.get("period") or period,
                    image_paths=c.get("image_paths"),
                    image_captions=c.get("image_captions")
                )
                db_controllers.create_claim(db, claim_data)
                db_saved_count += 1
            except Exception as e:
                logger.error(f"Failed to save claim {code} to DB: {e}")
                parse_warnings.append(f"Lỗi lưu vào DB: {code}")

    
    # Excel export removed from import flow (triggered manually by export button instead)
    pass
            
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
    Orchestrates the ingestion pipeline for multiple PDF files from a folder:
    1. Saves each PDF in uploads/
    2. Parses claims, crops images for each PDF, and merges them under a single batch_id
    3. Saves consolidated JSON results inside json/
    4. Saves to Database
    5. Saves a single combined Excel spreadsheet inside excel/
    """
    batch_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create specific directories inside claim_imports/
    images_batch_dir = os.path.join(IMAGES_DIR, batch_id)
    os.makedirs(images_batch_dir, exist_ok=True)
    
    combined_claims = []
    combined_warnings = []
    periods = []
    file_stats = []
    
    stt_counter = 1
    seen_keys = get_existing_claims_keys(db)
    logger.info(f"Starting folder import with {len(files)} files. Existing claims in DB: {len(seen_keys)}")
    
    db_saved_count = 0
    total_parsed_count = 0
    
    for upload_file in files:
        filename = upload_file.filename.split('/')[-1].split('\\')[-1]
        file_bytes = await upload_file.read()
        
        # Save original PDF
        pdf_filename = f"{batch_id}_{filename}"
        pdf_path = os.path.join(UPLOADS_DIR, pdf_filename)
        with open(pdf_path, "wb") as f:
            f.write(file_bytes)
            
        # Save copy to static storage for downloads/previews
        save_pdf_to_static_storage(filename, file_bytes, batch_id)
            
        try:
            claims, period, parse_warnings, mechanism_info = parse_pdf_claims(pdf_path, batch_id, images_batch_dir, seen_keys, normalize_penalty_value)
            total_parsed_count += len(claims)
            logger.info(f"File {filename}: Sử dụng {mechanism_info['name']} — {len(claims)} claims, period={period}")
            
            # Record individual file statistics
            file_stats.append({
                "filename": filename,
                "claims_count": len(claims),
                "period": period,
                "mechanism": mechanism_info
            })
            
            # Save each claim to Database
            if db:
                for c in claims:
                    try:
                        code = c.get("claim_code")
                        if not code and c.get("cabinet_no") is not None:
                            # Use global stt_counter to ensure uniqueness across all files in batch
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
                        result = db_controllers.create_claim(db, claim_data)
                        db_saved_count += 1
                    except Exception as db_err:
                        logger.error(f"Failed to save claim {code} from {filename} to DB: {db_err}")
                        import traceback
                        logger.error(traceback.format_exc())
                        parse_warnings.append(f"Lỗi lưu DB: {code} - {str(db_err)}")

            # Update stt to be sequential across all files
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
            
    # Decide the final period
    final_period = ", ".join(sorted(list(set(periods)))) if periods else "N/A"
    
    # Excel export removed from import flow (triggered manually by export button instead)
    pass
    
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
    SSE streaming version of folder import. Yields JSON progress events
    as each PDF file is processed, keeping the HTTP connection alive
    and giving the frontend real-time progress updates.
    
    Yields SSE events:
      - {"type": "progress", "file_index": N, "total_files": M, "filename": "...", "status": "processing|done|error", ...}
      - {"type": "result", ...full json_payload...}
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
    db_saved_count = 0
    
    # Pre-read all file bytes first (before streaming begins)
    file_data_list = []
    for upload_file in files:
        filename = upload_file.filename.split('/')[-1].split('\\')[-1]
        file_bytes = await upload_file.read()
        file_data_list.append((filename, file_bytes))
    
    # Yield start event
    start_event = {
        "type": "start",
        "batch_id": batch_id,
        "total_files": total_files
    }
    yield f"data: {json.dumps(start_event, ensure_ascii=False)}\n\n"
    await asyncio.sleep(0)  # Allow event loop to flush
    
    for file_idx, (filename, file_bytes) in enumerate(file_data_list):
        # Yield "processing" progress
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
        
        # Save original PDF
        pdf_filename = f"{batch_id}_{filename}"
        pdf_path = os.path.join(UPLOADS_DIR, pdf_filename)
        with open(pdf_path, "wb") as f:
            f.write(file_bytes)
        
        # Save copy to static storage for downloads/previews
        save_pdf_to_static_storage(filename, file_bytes, batch_id)
        
        claims_count = 0
        try:
            claims, period, parse_warnings, mechanism_info = parse_pdf_claims(pdf_path, batch_id, images_batch_dir, seen_keys, normalize_penalty_value)
            logger.info(f"File {filename}: Sử dụng {mechanism_info['name']} — {len(claims)} claims, period={period}")
            
            # Record individual file statistics
            file_stats.append({
                "filename": filename,
                "claims_count": len(claims),
                "period": period,
                "mechanism": mechanism_info
            })
            
            # Save each claim to Database
            if db:
                for c in claims:
                    try:
                        code = c.get("claim_code")
                        if not code and c.get("cabinet_no") is not None:
                            # Use global stt_counter to ensure uniqueness across all files in batch
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
                        result = db_controllers.create_claim(db, claim_data)
                        db_saved_count += 1
                    except Exception as db_err:
                        logger.error(f"Failed to save claim {code} from {filename} to DB: {db_err}")
                        import traceback
                        logger.error(traceback.format_exc())
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
            
            # Yield "done" for this file
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
    
    # Excel export removed from import flow (triggered manually by export button instead)
    final_period = periods[0] if periods else "N/A"
    
    # Yield final result
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


def save_temp_cabinet_prices(prices: list):
    """
    Saves imported/modified cabinet prices to a temporary JSON file inside price_imports directory.
    """
    os.makedirs(PRICE_IMPORTS_DIR, exist_ok=True)
    file_path = os.path.join(PRICE_IMPORTS_DIR, "temp_cabinet_prices.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(prices, f, ensure_ascii=False, indent=2)
    return {"message": "Dữ liệu giá tủ gỗ tạm thời đã được lưu thành công."}


def load_temp_cabinet_prices():
    """
    Loads cabinet prices from the temporary JSON file if it exists.
    """
    file_path = os.path.join(PRICE_IMPORTS_DIR, "temp_cabinet_prices.json")
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Error reading temp_cabinet_prices.json: {e}")
    return None


def get_cabinet_prices_map(db = None) -> dict:
    cabinet_prices_map = {}
    
    # 1. Load from DB if db is provided
    if db:
        try:
            from modules.claim.models.claim_models import CabinetPrice
            prices = db.query(CabinetPrice).all()
            for p in prices:
                if p.cabinet_code:
                    cabinet_prices_map[p.cabinet_code.strip().lower()] = p.sale_price or 0.0
        except Exception as e:
            logger.warning(f"Error querying cabinet prices from DB in get_cabinet_prices_map: {e}")
            
    # 2. Merge/fallback with temp JSON prices
    try:
        temp_prices = load_temp_cabinet_prices()
        if temp_prices:
            for p in temp_prices:
                code = p.get("cabinet_code")
                sale = p.get("sale_price")
                if code and sale is not None:
                    clean_code = str(code).strip().lower()
                    if clean_code not in cabinet_prices_map:
                        cabinet_prices_map[clean_code] = float(sale)
    except Exception as e:
        logger.warning(f"Error loading temp cabinet prices in get_cabinet_prices_map: {e}")
        
    return cabinet_prices_map


def save_temp_defect_catalog(defects: list):
    """
    Saves imported/modified defects to a temporary JSON file inside defect_imports directory.
    """
    global _defect_map_cache
    _defect_map_cache = None  # Invalidate the cache
    os.makedirs(DEFECT_IMPORTS_DIR, exist_ok=True)
    file_path = os.path.join(DEFECT_IMPORTS_DIR, "temp_defect_catalog.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(defects, f, ensure_ascii=False, indent=2)
    return {"message": "Dữ liệu danh mục lỗi tạm thời đã được lưu thành công."}


def load_temp_defect_catalog():
    """
    Loads defects from the temporary JSON file if it exists.
    """
    file_path = os.path.join(DEFECT_IMPORTS_DIR, "temp_defect_catalog.json")
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Error reading temp_defect_catalog.json: {e}")
    return None


def resolve_company_error_codes(order_code: str, db = None) -> str:
    global _defect_map_cache, _defect_map_cache_time
    if not order_code:
        return ""
    
    now = time.time()
    # Cache defect map for 10 seconds to avoid N+1 filesystem reads & db queries in loops
    if _defect_map_cache is None or (now - _defect_map_cache_time > 10.0):
        defect_map = {}
        
        # 1. Load temp defect catalog from json
        temp_defects = load_temp_defect_catalog()
        if temp_defects:
            for d in temp_defects:
                code = d.get("defect_code")
                g7 = d.get("g7_defect_code")
                if code and g7:
                    defect_map[str(code).strip().upper()] = str(g7).strip()
                    
        # 2. Load DB defects from inspection module
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
            
    # 3. Parse order_code and map tokens
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

def list_import_batches(db=None):
    """
    Returns a list of import batches.
    Since there's no ImportBatch model, returns empty list for now.
    """
    return []

def parse_credit_note_pdf_content(content: bytes):
    """
    Parses a Credit Note PDF from bytes.
    Extracts the month (e.g. "06-2026") and the total credit amount.
    """
    import fitz
    import re
    
    # Open the PDF using fitz from bytes
    doc = fitz.open(stream=content, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text() + "\n"
    
    # 1. Map months
    month_map = {
        "january": "01", "february": "02", "march": "03", "april": "04",
        "may": "05", "june": "06", "july": "07", "august": "08",
        "september": "09", "october": "10", "november": "11", "december": "12"
    }
    
    # Search for "Month YYYY" pattern, e.g., "(JUNE 2026)" or "June 2026"
    month_year_match = re.search(
        r"\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b",
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
            
    # 2. Search for TOTAL CREDIT AMOUNT
    amount_match = re.search(
        r"TOTAL\s+CREDIT\s+AMOUNT:\s*\$?\s*([\d,]+(?:\.\d+)?)",
        text,
        re.IGNORECASE
    )
    
    parsed_amount = 0.0
    if amount_match:
        amount_str = amount_match.group(1).replace(",", "")
        try:
            parsed_amount = float(amount_str)
        except ValueError:
            pass
            
    return {
        "month": parsed_month,
        "total_amount": parsed_amount,
        "success": parsed_month is not None and parsed_amount > 0
    }
