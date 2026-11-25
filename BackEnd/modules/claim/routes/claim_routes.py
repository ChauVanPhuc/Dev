# -*- coding: utf-8 -*-
import os
import re
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from app.shared.utils import extract_product_line_from_sku
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from jose import jwt
from config.settings import settings
from config.database import get_db
from modules.auth.models.accounts import Account as AccountModel
from modules.claim import schemas
from modules.claim.services import claim_service as service, import_service, excel_export

router = APIRouter()

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
            
    # Serialize items
    img_changed = False
    item_dicts = []
    for c in items:
        img_paths = json.loads(c.image_paths) if c.image_paths else []
        img_caps = json.loads(c.image_captions) if c.image_captions else []
        if not img_paths and c.claim_code:
            cab_match = re.search(r'(?:Cabinet|Claim)\s*#?\s*(\d+)', c.claim_code, re.IGNORECASE)
            if cab_match and hasattr(import_service, "IMAGES_DIR") and os.path.exists(import_service.IMAGES_DIR):
                c_num = cab_match.group(1)
                for b_folder in sorted(os.listdir(import_service.IMAGES_DIR), reverse=True):
                    b_path = os.path.join(import_service.IMAGES_DIR, b_folder)
                    if os.path.isdir(b_path):
                        matched = [
                            f for f in os.listdir(b_path)
                            if re.search(rf'claim_{c_num}_page_\d+_photo', f, re.IGNORECASE)
                        ]
                        if matched:
                            matched.sort()
                            img_paths = [f"/static/uploads/claim_imports/images/{b_folder}/{f}" for f in matched]
                            img_caps = [f"Claim #{c_num} (Ảnh {idx+1})" for idx in range(len(matched))]
                            try:
                                c.image_paths = json.dumps(img_paths)
                                c.image_captions = json.dumps(img_caps)
                                img_changed = True
                            except Exception as img_err:
                                import_service.logger.warning(f"Error caching recovered images for {c.claim_code}: {img_err}")
                            break
        p_line = extract_product_line_from_sku(c.product_name)
        item_dicts.append({
            "id": c.id,
            "claim_code": c.claim_code,
            "customer_name": c.customer_name or "",
            "product_name": c.product_name,
            "sku": c.product_name,
            "dong_hang": p_line,
            "line": p_line,
            "product_line": p_line,
            "order_code": c.order_code or "",
            "defect_code": c.order_code or "",
            "company_error_code": c.company_error_code or "",
            "description": c.description or "",
            "claim_description": c.description or "",
            "severity": c.severity or "Medium",
            "status": c.status or "Received",
            "lpn": c.lpn or "",
            "container_no": c.container_no or "",
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
                    if not tc.get("dong_hang"):
                        p_line = extract_product_line_from_sku(tc.get("product_name") or tc.get("sku") or "")
                        tc["dong_hang"] = p_line
                        tc["line"] = p_line
                        tc["product_line"] = p_line
                    if not tc.get("sku"):
                        tc["sku"] = tc.get("product_name")
                    if not tc.get("product_name"):
                        tc["product_name"] = tc.get("sku")
                    item_dicts.append(tc)
                    total += 1
    except Exception as e:
        import_service.logger.warning(f"Error loading temp_claims: {e}")

    if img_changed:
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            import_service.logger.warning(f"Error committing recovered images: {e}")
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
            "photo_count": extracted_data.get("photo_count", 0),
            "linked_photos_count": extracted_data.get("photo_count", 0),
            "db_saved_count": extracted_data.get("db_saved_count", 0),
            "parse_warnings": extracted_data.get("parse_warnings", []),
            "file_stats": extracted_data.get("file_stats", []),
            "mechanism": extracted_data.get("mechanism"),
            "data": extracted_data
        }
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
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
    total_photos_count = 0
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
            total_photos_count += ext_data.get("photo_count", 0)
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
        "photo_count": total_photos_count,
        "linked_photos_count": total_photos_count,
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

class CreditNoteConfirmPayload(BaseModel):
    credit_note_no: Optional[str] = None
    factory: Optional[str] = "VINA G7"
    date_issued: Optional[str] = None
    period: str
    total_amount: float
    currency: Optional[str] = "USD"
    saved_filename: Optional[str] = None
    file_url: Optional[str] = None
    claims: List[Dict[str, Any]]

@router.post("/claims/confirm-credit-note-import")
def confirm_credit_note_import(
    payload: CreditNoteConfirmPayload,
    db: Session = Depends(get_db)
):
    try:
        from modules.claim.models import CustomerClaim
        updated_count = 0
        unlinked_claims = []

        for c in payload.claims:
            stt = c.get("stt", 0)
            sku = str(c.get("sku") or c.get("product_name") or "").strip()
            lpn = str(c.get("lpn") or "").strip()
            container = str(c.get("container_no") or "").strip()
            action = str(c.get("action") or "").strip()
            claim_desc = str(c.get("description") or c.get("claim_description") or f"Credit Note {payload.credit_note_no or ''} - Item {stt} ({sku})").strip()

            existing = None
            if lpn or container or sku:
                query = db.query(CustomerClaim).filter(
                    CustomerClaim.period == payload.period
                )
                if sku:
                    query = query.filter(CustomerClaim.product_name == sku)
                if lpn:
                    query = query.filter(CustomerClaim.lpn == lpn)
                if container:
                    query = query.filter(CustomerClaim.container_no == container)
                existing = query.first()

            if existing:
                if action and not existing.action:
                    existing.action = action
                updated_count += 1
            else:
                # Do NOT create fake CustomerClaim! Put into unlinked list to prevent double counting
                unlinked_claims.append({
                    "stt": stt,
                    "sku": sku,
                    "lpn": lpn,
                    "container_no": container,
                    "action": action,
                    "description": claim_desc,
                    "period": payload.period,
                    "credit_note_no": payload.credit_note_no or ""
                })

        db.commit()

        # If there are unlinked items, persist to data/unlinked_credit_notes.json
        if unlinked_claims:
            unlinked_file = os.path.join(import_service.DATA_DIR, "unlinked_credit_notes.json")
            existing_unlinked = []
            if os.path.exists(unlinked_file):
                try:
                    with open(unlinked_file, "r", encoding="utf-8") as uf:
                        existing_unlinked = json.load(uf)
                except Exception as read_err:
                    import_service.logger.warning(f"Error reading unlinked credit notes file: {read_err}")
                    existing_unlinked = []

            unlinked_keys = {(u.get("credit_note_no"), u.get("stt"), u.get("sku")) for u in existing_unlinked}
            for u in unlinked_claims:
                k = (u.get("credit_note_no"), u.get("stt"), u.get("sku"))
                if k not in unlinked_keys:
                    existing_unlinked.append(u)
                    unlinked_keys.add(k)

            try:
                with open(unlinked_file, "w", encoding="utf-8") as uf:
                    json.dump(existing_unlinked, uf, ensure_ascii=False, indent=2)
            except Exception as fe:
                import_service.logger.warning(f"Error persisting unlinked credit notes: {fe}")

        return {
            "success": True,
            "status": "success",
            "message": f"Đã đối chiếu {updated_count} khiếu nại kỳ {payload.period}." + (f" Có {len(unlinked_claims)} mục chưa tìm thấy Claim tương ứng đã lưu vào danh sách chờ đối chiếu." if unlinked_claims else ""),
            "saved_count": 0,
            "updated_count": updated_count,
            "unlinked_count": len(unlinked_claims),
            "total_records": len(payload.claims),
            "period": payload.period,
            "total_amount": payload.total_amount,
            "credit_note_no": payload.credit_note_no
        }
    except Exception as e:
        db.rollback()
        import_service.logger.exception("Error confirming credit note import:")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/claims/unlinked-credit-notes")
def get_unlinked_credit_notes():
    unlinked_file = os.path.join(import_service.DATA_DIR, "unlinked_credit_notes.json")
    if os.path.exists(unlinked_file):
        try:
            with open(unlinked_file, "r", encoding="utf-8") as uf:
                return {"success": True, "items": json.load(uf)}
        except Exception as e:
            return {"success": False, "error": str(e), "items": []}
    return {"success": True, "items": []}

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
        total_photos_count = 0
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
                total_photos_count += ext_data.get("photo_count", 0)
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
            "photo_count": total_photos_count,
            "linked_photos_count": total_photos_count,
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

class ClaimPdfExportRequest(BaseModel):
    pageId: Optional[str] = "page4"
    period: Optional[str] = "10-2026"
    author: Optional[str] = "Dương Thị Lệ Uyên"
    includeAi: Optional[bool] = True
    predictTrend: Optional[bool] = True
    exportScope: Optional[str] = "all"
    selectedPages: Optional[List[int]] = None
    customFilters: Optional[Dict[str, Any]] = None

@router.api_route("/report-data", methods=["GET", "POST"])
@router.api_route("/claims/report-data", methods=["GET", "POST"])
def get_claim_report_data(
    req: Optional[ClaimPdfExportRequest] = None,
    db: Session = Depends(get_db)
):
    """
    [POST] Lấy trọn bộ dữ liệu báo cáo chuyên sâu (KPI, Pareto, biểu đồ, bảng 9 cột và nhận định AI)
    phục vụ Xem trước Đa trang và In ấn trực tiếp trên Trình duyệt.
    """
    from modules.claim.services.claim_report_pdf_service import ClaimReportPdfService
    p_id = req.pageId if req else "page4"
    author = req.author if req and req.author else "Dương Thị Lệ Uyên"
    period = req.period if req and req.period else "10-2026"
    include_ai = req.includeAi if req else True
    predict_trend = req.predictTrend if req else True

    try:
        report_data = ClaimReportPdfService.aggregate_claim_data(
            db=db,
            period=period,
            author=author,
            include_ai=include_ai,
            predict_trend=predict_trend
        )
        individual_pages = ClaimReportPdfService.get_individual_pages_html(report_data)
        return {
            "success": True, 
            "data": report_data,
            "pages": individual_pages
        }
    except Exception as e:
        import_service.logger.exception("Error aggregating claim report data:")
        raise HTTPException(status_code=500, detail=f"Lỗi nạp dữ liệu báo cáo: {str(e)}")

@router.api_route("/export-report-pdf", methods=["GET", "POST"])
@router.api_route("/claims/export-report-pdf", methods=["GET", "POST"])
def export_claim_report_pdf(
    req: Optional[ClaimPdfExportRequest] = None,
    db: Session = Depends(get_db)
):
    """
    [POST] Xuất bản file PDF Báo cáo Quản trị Chất lượng & Khiếu nại Khách hàng chuẩn VINA G7
    Tái hiện 100% bố cục và chất lượng tài liệu mẫu BÁO CÁO TÌNH HÌNH KHIẾU NẠI T10_2026.pdf
    (Khổ kết hợp: Trang 1-3 Portrait + Trang 4-7 Landscape bảng 9 cột có ảnh thực tế).
    """
    from modules.claim.services.claim_report_pdf_service import ClaimReportPdfService
    p_id = req.pageId if req else "page4"
    author = req.author if req and req.author else "Dương Thị Lệ Uyên"
    period = req.period if req and req.period else "10-2026"
    include_ai = req.includeAi if req else True
    predict_trend = req.predictTrend if req else True

    try:
        report_data = ClaimReportPdfService.aggregate_claim_data(
            db=db,
            period=period,
            author=author,
            include_ai=include_ai,
            predict_trend=predict_trend
        )
        selected_pages = None
        if req and req.selectedPages:
            selected_pages = req.selectedPages
        elif req and req.exportScope == "single":
            page_map = {
                "page1": [1],
                "page2": [2],
                "page3": [3],
                "page4": [4, 5, 6, 7]
            }
            selected_pages = page_map.get(p_id)

        pdf_bytes = ClaimReportPdfService.generate_full_pdf(report_data, selected_pages=selected_pages)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        clean_period = period.replace("-", "_").replace("/", "_")
        filename = f"BAO_CAO_TINH_HINH_KHIEU_NAI_{clean_period}_{timestamp}.pdf"

        return StreamingResponse(
            iter([pdf_bytes]),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "application/pdf"
            }
        )
    except Exception as e:
        import_service.logger.exception("Error exporting claim report PDF:")
        raise HTTPException(status_code=500, detail=f"Lỗi xuất báo cáo PDF: {str(e)}")

@router.get("/claims/{claim_id}", response_model=schemas.CustomerClaimResponse)
def read_claim(claim_id: int, db: Session = Depends(get_db)):
    db_claim = service.get_claim_by_id(db, claim_id)
    if not db_claim:
        raise HTTPException(status_code=404, detail="Không tìm thấy khiếu nại khách hàng")
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


def get_current_user(request: Request, db: Session = Depends(get_db)) -> AccountModel:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu cần Token xác thực Bearer.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token không hợp lệ (không tìm thấy username).",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception as e:
        import_service.logger.error(f"JWT Verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token đã hết hạn hoặc không hợp lệ. Chi tiết: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = db.query(AccountModel).filter(AccountModel.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản không tồn tại.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


@router.post("/chat")
def chat_claim_assistant(
    body: Dict[str, Any], 
    db: Session = Depends(get_db), 
    current_user: AccountModel = Depends(get_current_user)
):
    message = body.get("message")
    context = body.get("context") or {}
    history = body.get("history") or []
    session_id = body.get("session_id") or "default"
    if not message:
        raise HTTPException(status_code=400, detail="Thiếu nội dung câu hỏi (message)")
    try:
        from modules.chatbot.controllers.chatbot_controller import handle_claim_chat
        return handle_claim_chat(message, context, db, history, current_user=current_user, session_id=session_id)
    except Exception as e:
        import_service.logger.exception("Error in claim chatbot assistant:")
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {str(e)}")


@router.get("/chat/history")
def get_chat_history(
    session_id: str = "default",
    db: Session = Depends(get_db), 
    current_user: AccountModel = Depends(get_current_user)
):
    try:
        from modules.chatbot.models.chatbot_history import ChatbotHistory
        import json
        
        histories = db.query(ChatbotHistory).filter(
            ChatbotHistory.account_id == current_user.id,
            ChatbotHistory.session_id == session_id
        ).order_by(ChatbotHistory.created_at.asc()).all()
        
        result = []
        for h in histories:
            items = []
            if h.items_json:
                try:
                    items = json.loads(h.items_json)
                except Exception:
                    pass
            
            suggestions = []
            if h.suggestions_json:
                try:
                    suggestions = json.loads(h.suggestions_json)
                except Exception:
                    pass
            
            result.append({
                "role": h.role,
                "content": h.content,
                "items": items,
                "suggestions": suggestions,
                "created_at": h.created_at.isoformat() if h.created_at else None
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tải lịch sử chat: {str(e)}")


@router.delete("/chat/history")
def delete_chat_history(
    session_id: str = "default",
    db: Session = Depends(get_db), 
    current_user: AccountModel = Depends(get_current_user)
):
    try:
        from modules.chatbot.models.chatbot_history import ChatbotHistory
        db.query(ChatbotHistory).filter(
            ChatbotHistory.account_id == current_user.id,
            ChatbotHistory.session_id == session_id
        ).delete()
        db.commit()
        return {"message": "Đã xóa lịch sử chat thành công."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi xóa lịch sử chat: {str(e)}")


@router.get("/chat/sessions")
def get_chat_sessions(
    db: Session = Depends(get_db), 
    current_user: AccountModel = Depends(get_current_user)
):
    try:
        from modules.chatbot.models.chatbot_history import ChatbotHistory
        from sqlalchemy import func
        
        # Subquery to find the latest created_at per session_id
        subq = db.query(
            ChatbotHistory.session_id,
            func.max(ChatbotHistory.created_at).label("max_created_at")
        ).filter(
            ChatbotHistory.account_id == current_user.id
        ).group_by(
            ChatbotHistory.session_id
        ).subquery()

        # Query to join and get session details
        sessions = db.query(
            ChatbotHistory.session_id,
            ChatbotHistory.session_title,
            ChatbotHistory.created_at
        ).join(
            subq,
            (ChatbotHistory.session_id == subq.c.session_id) & 
            (ChatbotHistory.created_at == subq.c.max_created_at)
        ).filter(
            ChatbotHistory.account_id == current_user.id
        ).order_by(
            ChatbotHistory.created_at.desc()
        ).all()

        # Deduplicate results just in case of identical timestamps
        seen = set()
        result = []
        for s in sessions:
            sid = s.session_id or "default"
            if sid in seen:
                continue
            seen.add(sid)
            result.append({
                "session_id": sid,
                "session_title": s.session_title or "Cuộc trò chuyện mới",
                "updated_at": s.created_at.isoformat() if s.created_at else None
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tải danh sách phiên chat: {str(e)}")


@router.delete("/chat/sessions/{session_id}")
def delete_chat_session(
    session_id: str,
    db: Session = Depends(get_db), 
    current_user: AccountModel = Depends(get_current_user)
):
    try:
        from modules.chatbot.models.chatbot_history import ChatbotHistory
        db.query(ChatbotHistory).filter(
            ChatbotHistory.account_id == current_user.id,
            ChatbotHistory.session_id == session_id
        ).delete()
        db.commit()
        return {"message": "Đã xóa phiên chat thành công."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi xóa phiên chat: {str(e)}")

