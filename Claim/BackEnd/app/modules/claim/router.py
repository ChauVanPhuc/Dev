# -*- coding: utf-8 -*-
import os
import re
import json
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.claim import schemas, service, import_service, excel_export

router = APIRouter()

def format_month_year(d, raw_str=None) -> str:
    if d and hasattr(d, "strftime"):
        return d.strftime("%m/%Y")
    if raw_str:
        s = str(raw_str).strip()
        parts = re.split(r'[-/]', s)
        if len(parts) == 3:
            if len(parts[0]) == 4:
                return f"{int(parts[1]):02d}/{parts[0]}"
            else:
                return f"{int(parts[0]):02d}/{parts[2]}"
        elif len(parts) == 2:
            return f"{parts[0].zfill(2)}/{parts[1]}"
    return ""

def resolve_company_error_codes(order_code: str, db: Session = None) -> str:
    return import_service.resolve_company_error_codes(order_code, db)

@router.get("/claims", response_model=Dict[str, Any])
def read_claims(
    page: int = 1,
    size: int = 100000,
    search: str = None,
    status: str = None,
    year: str = None,
    db: Session = Depends(get_db)
):
    skip = (page - 1) * size
    items, total = service.get_claims(db, skip=skip, limit=size, search=search, status=status, year=year)
    
    # Auto-resolve missing or un-synced company_error_code
    changed = False
    for item in items:
        if item.order_code:
            expected = resolve_company_error_codes(item.order_code, db)
            if item.company_error_code != expected:
                item.company_error_code = expected
                changed = True
    if changed:
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            import_service.logger.error(f"Error auto-syncing claims company_error_code: {e}")
            
    # Prefetch container details from lpn_containers
    cont_map = {}
    try:
        cont_rows = db.execute(text("""
            SELECT 
                id, container_number, 
                REPLACE(container_number, ' ', '') as cont_clean,
                date_loading, date_loading_raw, factory
            FROM lpn_containers WITH (NOLOCK)
        """)).fetchall()
        for cr in cont_rows:
            if cr[2]:
                c_key = str(cr[2]).strip().upper()
                if c_key not in cont_map:
                    cont_map[c_key] = {
                        "lpn_container_id": cr[0],
                        "lpn_container_number": cr[1],
                        "date_loading": cr[3].isoformat() if hasattr(cr[3], "isoformat") else str(cr[3]) if cr[3] else None,
                        "date_loading_raw": format_month_year(cr[3], cr[4])
                    }
    except Exception as e:
        import_service.logger.warning(f"Error prefetching lpn_containers for claims: {e}")

    # Serialize items
    item_dicts = []
    for c in items:
        img_paths = json.loads(c.image_paths) if c.image_paths else []
        img_caps = json.loads(c.image_captions) if c.image_captions else []
        
        c_clean = (c.container_no or "").replace(" ", "").strip().upper()
        c_info = cont_map.get(c_clean, {})
        pname = c.product_name or ""
        loai_hang = "OAK" if "WOA" in pname.upper() else "Pigment"

        item_dicts.append({
            "id": c.id,
            "claim_code": c.claim_code,
            "customer_name": c.customer_name or "",
            "loai_hang": loai_hang,
            "product_name": c.product_name,
            "order_code": c.order_code or "",
            "company_error_code": c.company_error_code or "",
            "description": c.description or "",
            "severity": c.severity or "Medium",
            "status": c.status or "Received",
            "lpn": c.lpn or "",
            "container_no": c.container_no or "",
            "cont": c.container_no or "",
            "lpn_container_number": c_info.get("lpn_container_number") or c.container_no or "",
            "lpn_container_id": c_info.get("lpn_container_id"),
            "date_loading": c_info.get("date_loading"),
            "date_loading_raw": c_info.get("date_loading_raw"),
            "action": c.action or "",
            "period": c.period or "",
            "image_paths": img_paths,
            "image_captions": img_caps,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "resolved_at": c.resolved_at.isoformat() if c.resolved_at else None
        })

    # Add items from temp_claims.json if DB returns fewer items
    try:
        temp_claims = import_service.load_temp_claims(
            resolve_company_func=resolve_company_error_codes,
            db=db
        )
        if temp_claims:
            db_codes = {c["claim_code"] for c in item_dicts}
            for tc in temp_claims:
                if tc.get("claim_code") not in db_codes:
                    tc_clean = (tc.get("container_no") or tc.get("cont") or "").replace(" ", "").strip().upper()
                    tc_info = cont_map.get(tc_clean, {})
                    tc_pname = tc.get("product_name") or tc.get("sku") or ""
                    tc["loai_hang"] = "OAK" if "WOA" in tc_pname.upper() else "Pigment"
                    tc["lpn_container_number"] = tc_info.get("lpn_container_number") or tc.get("container_no") or ""
                    tc["lpn_container_id"] = tc_info.get("lpn_container_id")
                    tc["date_loading"] = tc_info.get("date_loading")
                    tc["date_loading_raw"] = tc_info.get("date_loading_raw")
                    item_dicts.append(tc)
                    total += 1
    except Exception as e:
        import_service.logger.warning(f"Error loading temp_claims: {e}")

    return {"items": item_dicts, "total": total, "page": page, "size": size}

@router.post("/claims/import-pdf")
def import_claims_from_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Vui lòng tải lên tệp định dạng PDF")
    
    try:
        pdf_bytes = file.file.read()
        extracted_data = import_service.process_pdf_import(
            file_bytes=pdf_bytes,
            filename=file.filename,
            db=db
        )
        return {
            "success": True,
            "status": "success",
            "message": f"Đã bóc tách thành công PDF {file.filename}",
            "batch_id": extracted_data.get("batch_id"),
            "period": extracted_data.get("period"),
            "total_records": extracted_data.get("total_records", 0),
            "db_saved_count": extracted_data.get("db_saved_count", 0),
            "parse_warnings": extracted_data.get("parse_warnings", []),
            "file_stats": extracted_data.get("file_stats", []),
            "mechanism": extracted_data.get("mechanism"),
            "data": extracted_data
        }
    except Exception as e:
        import_service.logger.exception("Error processing PDF import:")
        raise HTTPException(status_code=500, detail=f"Lỗi bóc tách PDF: {str(e)}")

@router.post("/claims/import-folder")
def import_claims_from_folder(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    pdf_files = [f for f in files if f.filename.lower().endswith('.pdf')]
    if not pdf_files:
        raise HTTPException(status_code=400, detail="Không tìm thấy tệp PDF nào trong danh sách tải lên")
    
    results = []
    errors = []
    total_records_count = 0
    total_saved_count = 0
    all_warnings = []
    all_file_stats = []
    latest_batch_id = None
    
    for f in pdf_files:
        try:
            pdf_bytes = f.file.read()
            ext_data = import_service.process_pdf_import(
                file_bytes=pdf_bytes,
                filename=f.filename,
                db=db
            )
            claims_count = ext_data.get("total_records", 0)
            saved_cnt = ext_data.get("db_saved_count", 0)
            total_records_count += claims_count
            total_saved_count += saved_cnt
            latest_batch_id = ext_data.get("batch_id") or latest_batch_id
            if ext_data.get("parse_warnings"):
                all_warnings.extend(ext_data["parse_warnings"])
            if ext_data.get("file_stats"):
                all_file_stats.extend(ext_data["file_stats"])

            results.append({
                "filename": f.filename,
                "status": "success",
                "extracted_claims_count": claims_count
            })
        except Exception as e:
            errors.append({
                "filename": f.filename,
                "error": str(e)
            })
            all_warnings.append(f"[{f.filename}] Lỗi: {str(e)}")
            
    return {
        "success": True,
        "status": "completed",
        "total_files": len(pdf_files),
        "success_count": len(results),
        "error_count": len(errors),
        "total_records": total_records_count,
        "db_saved_count": total_saved_count,
        "batch_id": latest_batch_id or datetime.now().strftime("%Y%m%d_%H%M%S"),
        "parse_warnings": all_warnings,
        "file_stats": all_file_stats,
        "results": results,
        "errors": errors
    }

@router.post("/claims/parse-credit-note")
def parse_credit_note(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận tệp tin định dạng PDF.")
    try:
        content = file.file.read()
        result = import_service.parse_credit_note_pdf_content(content, filename=file.filename, db=db)
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        import_service.logger.exception("Error parsing credit note PDF:")
        raise HTTPException(status_code=500, detail=str(err))

@router.post("/claims/parse-credit-notes")
def parse_credit_notes_batch(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    pdf_files = [f for f in files if f.filename.lower().endswith('.pdf')]
    if not pdf_files:
        raise HTTPException(status_code=400, detail="Không tìm thấy tệp PDF nào trong danh sách tải lên")
        
    results = []
    for f in pdf_files:
        try:
            content = f.file.read()
            res = import_service.parse_credit_note_pdf_content(content, filename=f.filename, db=db)
            results.append(res)
        except Exception as e:
            results.append({
                "month": "N/A",
                "total_amount": 0.0,
                "filename": f.filename,
                "success": False,
                "error": str(e)
            })
            
    return {
        "status": "success",
        "total_files": len(pdf_files),
        "results": results
    }

@router.post("/claims/import-folder-stream")
def import_claims_from_folder_stream(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    pdf_files = [f for f in files if f.filename.lower().endswith('.pdf')]
    if not pdf_files:
        raise HTTPException(status_code=400, detail="Không tìm thấy tệp PDF nào")

    def generate_events():
        total = len(pdf_files)
        results = []
        errors = []
        total_records_count = 0
        total_saved_count = 0
        all_warnings = []
        all_file_stats = []
        latest_batch_id = None
        
        yield f"data: {json.dumps({'type': 'start', 'total': total, 'total_files': total}, ensure_ascii=False)}\n\n"
        
        for idx, f in enumerate(pdf_files, 1):
            start_percent = int(((idx - 1) / total) * 100)
            yield f"data: {json.dumps({'type': 'progress', 'current': idx, 'total': total, 'file_index': idx, 'total_files': total, 'filename': f.filename, 'status': 'processing', 'percent': start_percent}, ensure_ascii=False)}\n\n"
            try:
                pdf_bytes = f.file.read()
                ext_data = import_service.process_pdf_import(
                    file_bytes=pdf_bytes,
                    filename=f.filename,
                    db=db
                )
                claims_count = ext_data.get("total_records", 0)
                saved_cnt = ext_data.get("db_saved_count", 0)
                total_records_count += claims_count
                total_saved_count += saved_cnt
                latest_batch_id = ext_data.get("batch_id") or latest_batch_id
                if ext_data.get("parse_warnings"):
                    for w in ext_data["parse_warnings"]:
                        w_str = str(w)
                        if not w_str.startswith("["):
                            all_warnings.append(f"[{f.filename}] {w_str}")
                        else:
                            all_warnings.append(w_str)
                if ext_data.get("file_stats"):
                    all_file_stats.extend(ext_data["file_stats"])

                res_item = {
                    "filename": f.filename,
                    "status": "success",
                    "extracted_claims_count": claims_count
                }
                results.append(res_item)
                done_percent = int((idx / total) * 100)
                yield f"data: {json.dumps({'type': 'progress', 'current': idx, 'total': total, 'file_index': idx, 'total_files': total, 'filename': f.filename, 'status': 'done', 'claims_found': claims_count, 'mechanism': ext_data.get('mechanism'), 'percent': done_percent}, ensure_ascii=False)}\n\n"
            except Exception as e:
                err_msg = str(e)
                is_dup = "tồn tại" in err_msg or "trùng lặp" in err_msg
                status_key = "warning" if is_dup else "error"
                status_name = "Trùng lặp (đã có sẵn)" if is_dup else "Không chứa bảng khiếu nại"

                all_file_stats.append({
                    "filename": f.filename,
                    "original_name": f.filename,
                    "status": status_key,
                    "claims_count": 0,
                    "mechanism": {"name": status_name, "type": status_key},
                    "period": "N/A"
                })
                err_item = {"filename": f.filename, "error": err_msg}
                errors.append(err_item)
                all_warnings.append(f"[{f.filename}] {err_msg}")
                done_percent = int((idx / total) * 100)
                yield f"data: {json.dumps({'type': 'progress', 'current': idx, 'total': total, 'file_index': idx, 'total_files': total, 'filename': f.filename, 'status': status_key, 'error': err_msg, 'percent': done_percent}, ensure_ascii=False)}\n\n"

        final_payload = {
            "type": "result",
            "success": True,
            "status": "completed",
            "total_files": total,
            "success_count": len(results),
            "error_count": len(errors),
            "total_records": total_records_count,
            "db_saved_count": total_saved_count,
            "batch_id": latest_batch_id or datetime.now().strftime("%Y%m%d_%H%M%S"),
            "parse_warnings": all_warnings,
            "file_stats": all_file_stats,
            "results": results,
            "errors": errors
        }
        yield f"data: {json.dumps(final_payload, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        generate_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/claims/export-excel")
def export_claims_excel(claims_data: List[Dict[str, Any]]):
    try:
        excel_bytes = excel_export.export_claims_to_excel(
            claims_data=claims_data,
            resolve_company_func=import_service.resolve_company_error_codes,
            resolve_company_name_func=import_service.resolve_company_error_names
        )
        return StreamingResponse(
            excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=danh_sach_kieu_nai_claim.xlsx"}
        )
    except Exception as e:
        import_service.logger.exception("Error exporting claims Excel:")
        raise HTTPException(status_code=500, detail=f"Lỗi xuất file Excel: {str(e)}")

@router.get("/claims/{claim_id}", response_model=schemas.CustomerClaimResponse)
def read_claim(claim_id: int, db: Session = Depends(get_db)):
    db_claim = service.get_claim_by_id(db, claim_id)
    if not db_claim:
        raise HTTPException(status_code=404, detail="Không tìm thấy khiếu nại khách hàng")

    # Enrich with container info and loai_hang
    c_clean = (db_claim.container_no or "").replace(" ", "").strip().upper()
    if c_clean:
        try:
            cont_row = db.execute(text("""
                SELECT id, container_number, date_loading, date_loading_raw
                FROM lpn_containers WITH (NOLOCK)
                WHERE REPLACE(container_number, ' ', '') = :c
            """), {"c": c_clean}).fetchone()
            if cont_row:
                db_claim.lpn_container_id = cont_row[0]
                db_claim.lpn_container_number = cont_row[1]
                db_claim.date_loading = cont_row[2].isoformat() if hasattr(cont_row[2], "isoformat") else str(cont_row[2]) if cont_row[2] else None
                db_claim.date_loading_raw = format_month_year(cont_row[2], cont_row[3])
        except Exception:
            pass
    pname = db_claim.product_name or ""
    db_claim.loai_hang = "OAK" if "WOA" in pname.upper() else "Pigment"
    return db_claim

@router.post("/claims", response_model=schemas.CustomerClaimResponse, status_code=status.HTTP_201_CREATED)
def create_new_claim(claim: schemas.CustomerClaimCreate, db: Session = Depends(get_db)):
    if not claim.company_error_code:
        claim.company_error_code = resolve_company_error_codes(claim.order_code, db)
    db_claim = service.create_claim(db, claim)
    return db_claim

@router.put("/claims/{claim_id}", response_model=schemas.CustomerClaimResponse)
def update_existing_claim(claim_id: int, claim: schemas.CustomerClaimUpdate, db: Session = Depends(get_db)):
    db_claim = service.update_claim(db, claim_id, claim)
    if not db_claim:
        raise HTTPException(status_code=404, detail="Không tìm thấy khiếu nại khách hàng")
    return db_claim

@router.delete("/claims/{claim_id}")
def delete_existing_claim(claim_id: int, db: Session = Depends(get_db)):
    success = service.delete_claim(db, claim_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy khiếu nại khách hàng")
    return {"message": "Xóa khiếu nại thành công"}

@router.patch("/claims/{claim_id}/status")
def patch_claim_status(claim_id: int, body: Dict[str, Any], db: Session = Depends(get_db)):
    new_status = body.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Thiếu trường 'status'")
    
    status_map = {
        "Mới": "Received",
        "Đang xem xét": "Processing",
        "Đã xử lý": "Resolved",
        "Chấp nhận": "Resolved"
    }
    backend_status = status_map.get(new_status, new_status)
    
    db_claim = service.update_claim(db, claim_id, schemas.CustomerClaimUpdate(status=backend_status))
    if not db_claim:
        raise HTTPException(status_code=404, detail="Không tìm thấy khiếu nại khách hàng")
    
    return {"message": "Cập nhật trạng thái thành công", "status": new_status}

@router.get("/claim_imports/{sub_path:path}")
def serve_claim_imports(sub_path: str):
    file_path = os.path.join(import_service.CLAIM_IMPORTS_DIR, sub_path)
    abs_file_path = os.path.abspath(file_path)
    abs_imports_dir = os.path.abspath(import_service.CLAIM_IMPORTS_DIR)
    
    if not abs_file_path.startswith(abs_imports_dir):
        raise HTTPException(status_code=403, detail="Access denied")
        
    if not os.path.exists(abs_file_path) or not os.path.isfile(abs_file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(abs_file_path)
