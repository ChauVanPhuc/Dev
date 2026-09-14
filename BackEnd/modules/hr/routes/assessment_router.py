# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body, Response
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List

from config.database import get_db
from modules.hr.controllers import assessment_controller
from modules.hr.services.excel_assessment_parser_service import generate_assessment_excel_template
from modules.hr.services.md_parser_service import generate_assessment_markdown_template

admin_assessment_router = APIRouter()
public_assessment_router = APIRouter()

# ==============================================================================
# 1. ADMIN ROUTES (Quản trị đề thi & Ngân hàng câu hỏi & Lịch sử)
# ==============================================================================

@admin_assessment_router.get("", summary="Lấy danh sách các bài kiểm tra")
def get_assessments(
    search: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return assessment_controller.list_assessments(db, search=search, category=category)

@admin_assessment_router.post("", summary="Tạo mới bài kiểm tra thủ công")
def create_assessment(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    return assessment_controller.create_assessment(db, payload)

@admin_assessment_router.get("/submissions/all", summary="Lấy danh sách toàn bộ kết quả nộp bài")
def get_all_submissions(
    search: Optional[str] = None,
    rank_level: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return assessment_controller.list_assessment_submissions(db, search=search, rank_level=rank_level)

@admin_assessment_router.get("/submissions/export", summary="Xuất toàn bộ kết quả nộp bài ra file Excel")
def export_all_submissions(db: Session = Depends(get_db)):
    excel_bytes = assessment_controller.export_submissions_excel(db)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=KetQua_DanhGia_NangLuc.xlsx"}
    )

@admin_assessment_router.post("/submissions/{id}/regrade-ai", summary="Yêu cầu AI chấm lại toàn bộ các câu hỏi tự luận")
def regrade_submission(id: int, db: Session = Depends(get_db)):
    res = assessment_controller.regrade_submission_with_ai(db, id)
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài làm để chấm lại")
    return res

@admin_assessment_router.put("/submissions/{id}/override-score", summary="Giám khảo điều chỉnh điểm số và nhận xét bài làm thủ công")
def override_score(
    id: int,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    res = assessment_controller.override_submission_score(db, id, payload)
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài làm để chỉnh sửa điểm")
    return res

@admin_assessment_router.get("/template/excel", summary="Tải file Excel mẫu để soạn đề thi")
def download_excel_template():
    excel_bytes = generate_assessment_excel_template()
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=Mau_De_Thi_Danh_Gia.xlsx"}
    )

@admin_assessment_router.get("/template/markdown", summary="Tải file Markdown mẫu để soạn đề thi")
def download_markdown_template():
    md_text = generate_assessment_markdown_template()
    return Response(
        content=md_text.encode("utf-8"),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=Mau_De_Thi_Danh_Gia.md"}
    )

@admin_assessment_router.post("/import/preview", summary="Xem trước & Xác thực dữ liệu đề thi từ file Excel/MD hoặc nội dung văn bản")
async def preview_import(
    file: Optional[UploadFile] = File(None),
    content: Optional[str] = Form(None)
):
    file_bytes = None
    filename = ""
    if file:
        file_bytes = await file.read()
        filename = file.filename or ""
        
    res = assessment_controller.preview_assessment_import(file_bytes=file_bytes, filename=filename, content_str=content)
    return res

@admin_assessment_router.post("/import/confirm", summary="Xác nhận lưu đề thi sau khi Preview")
def confirm_import(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    return assessment_controller.import_assessment_from_parsed_payload(db, payload)

@admin_assessment_router.post("/import", summary="Import đề thi trực tiếp từ file hoặc text (Legacy)")
async def import_assessment(
    file: Optional[UploadFile] = File(None),
    content: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    file_bytes = None
    filename = ""
    if file:
        file_bytes = await file.read()
        filename = file.filename or ""
        
    parsed = assessment_controller.preview_assessment_import(file_bytes=file_bytes, filename=filename, content_str=content)
    if not parsed.get("questions"):
        raise HTTPException(status_code=400, detail="Không tìm thấy câu hỏi hợp lệ trong nội dung import.")
        
    return assessment_controller.import_assessment_from_parsed_payload(db, parsed)

@admin_assessment_router.get("/{id}", summary="Lấy chi tiết bài kiểm tra & câu hỏi")
def get_assessment(id: int, db: Session = Depends(get_db)):
    res = assessment_controller.get_assessment_detail(db, id)
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài kiểm tra")
    return res

@admin_assessment_router.put("/{id}", summary="Cập nhật bài kiểm tra")
def update_assessment(
    id: int,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    res = assessment_controller.update_assessment(db, id, payload)
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài kiểm tra để cập nhật")
    return res

@admin_assessment_router.delete("/{id}", summary="Xóa bài kiểm tra")
def delete_assessment(id: int, db: Session = Depends(get_db)):
    success = assessment_controller.delete_assessment(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài kiểm tra để xóa")
    return {"message": "Đã xóa bài kiểm tra thành công"}

@admin_assessment_router.post("/{id}/toggle-status", summary="Bật/Tắt trạng thái hoạt động")
def toggle_status(id: int, db: Session = Depends(get_db)):
    res = assessment_controller.toggle_assessment_status(db, id)
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài kiểm tra")
    return res

@admin_assessment_router.post("/{id}/questions/append", summary="Bổ sung thêm danh sách câu hỏi vào bài kiểm tra")
def append_questions(
    id: int,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    questions = payload.get("questions") or []
    if not questions:
        raise HTTPException(status_code=400, detail="Danh sách câu hỏi bổ sung trống")
    res = assessment_controller.append_questions_to_assessment(db, id, questions)
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài kiểm tra")
    return res

@admin_assessment_router.get("/{id}/submissions", summary="Lấy danh sách kết quả nộp bài của đề thi")
def get_assessment_submissions(
    id: int,
    search: Optional[str] = None,
    rank_level: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return assessment_controller.list_assessment_submissions(db, assessment_id=id, search=search, rank_level=rank_level)

@admin_assessment_router.get("/{id}/submissions/export", summary="Xuất kết quả nộp bài của 1 đề thi ra file Excel")
def export_single_assessment_submissions(id: int, db: Session = Depends(get_db)):
    excel_bytes = assessment_controller.export_submissions_excel(db, assessment_id=id)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=KetQua_DeThi_{id}.xlsx"}
    )


# ==============================================================================
# 2. PUBLIC CANDIDATE ROUTES (Cổng làm bài thi trực tuyến cho nhân sự)
# ==============================================================================

@public_assessment_router.get("/public/{code_or_id}", summary="Lấy thông tin đề thi & câu hỏi xáo trộn cho thí sinh")
def get_public_quiz(code_or_id: str, db: Session = Depends(get_db)):
    res = assessment_controller.get_public_assessment_for_candidate(db, code_or_id)
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài kiểm tra hoặc mã đề thi không hợp lệ")
    if "error" in res:
        raise HTTPException(status_code=400, detail=res.get("message", "Bài kiểm tra không khả dụng"))
    return res

@public_assessment_router.post("/submit", summary="Nộp bài thi & tự động chấm điểm, đánh giá AI")
def submit_quiz(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    res = assessment_controller.submit_assessment_answers(db, payload)
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài kiểm tra để nộp bài")
    return res

@public_assessment_router.get("/result/{submission_id}", summary="Lấy chi tiết kết quả đánh giá năng lực")
def get_result(submission_id: int, db: Session = Depends(get_db)):
    res = assessment_controller.get_submission_result(db, submission_id)
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy kết quả làm bài này")
    return res
