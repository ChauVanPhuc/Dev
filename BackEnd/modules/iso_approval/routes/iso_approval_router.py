from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from config.database import get_db

from modules.iso_approval.schemas.iso_approval_schema import (
    ApprovalActionRequest,
    BatchApprovalRequest,
    ForwardApprovalRequest,
    ApprovalStatsResponse
)
from modules.iso_approval.services.iso_approval_service import ISOApprovalService

router = APIRouter()

@router.get("/stats", response_model=ApprovalStatsResponse)
def get_approval_stats(db: Session = Depends(get_db)):
    """
    [GET] Lấy số liệu thống kê hồ sơ chờ duyệt, đã duyệt, từ chối, dự thảo
    """
    try:
        return ISOApprovalService.get_approval_stats(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn thống kê: {str(e)}")


@router.get("/list")
def get_approval_items_list(
    status: Optional[str] = Query("all", description="Trạng thái: pending, approved, rejected, draft, all"),
    item_type: Optional[str] = Query("all", description="Loại hồ sơ: all, document, process"),
    department: Optional[str] = Query("all", description="Phòng ban: all, CL, SX, KT, KHO, IT, BGD..."),
    keyword: Optional[str] = Query(None, description="Từ khóa tìm kiếm theo mã, tên, người đề xuất"),
    issuer: Optional[str] = Query(None, description="Lọc theo người đề xuất / tạo"),
    approver: Optional[str] = Query(None, description="Lọc theo người phê duyệt"),
    document_level: Optional[str] = Query(None, description="Lọc theo cấp quản lý: Cấp công ty, Cấp phòng ban"),
    db: Session = Depends(get_db)
):
    """
    [GET] Danh sách hồ sơ cần phê duyệt kèm theo bộ lọc linh hoạt
    """
    try:
        return ISOApprovalService.get_items_list(
            db=db,
            status=status,
            item_type=item_type,
            department=department,
            keyword=keyword,
            issuer=issuer,
            approver=approver,
            document_level=document_level
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy danh sách hồ sơ: {str(e)}")


@router.get("/detail/{item_type}/{item_id}")
def get_item_detail(
    item_type: str,
    item_id: int,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy chi tiết toàn bộ hồ sơ (nội dung sections, các bước quy trình, checklist, tệp đính kèm và lịch sử duyệt)
    """
    try:
        return ISOApprovalService.get_item_detail(db, item_type=item_type, item_id=item_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn chi tiết hồ sơ: {str(e)}")


@router.post("/approve")
def approve_item(
    payload: ApprovalActionRequest,
    db: Session = Depends(get_db)
):
    """
    [POST] Phê duyệt hồ sơ (Chuyển trạng thái sang 'Hiệu lực', ghi log người duyệt)
    """
    try:
        return ISOApprovalService.approve_item(
            db=db,
            item_type=payload.item_type,
            item_id=payload.item_id,
            comment=payload.comment,
            approver_name=payload.approver_name,
            approver_username=payload.approver_username
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi phê duyệt hồ sơ: {str(e)}")


@router.post("/reject")
def reject_item(
    payload: ApprovalActionRequest,
    db: Session = Depends(get_db)
):
    """
    [POST] Từ chối / Yêu cầu sửa đổi hồ sơ (Yêu cầu bắt buộc lý do từ chối)
    """
    try:
        return ISOApprovalService.reject_item(
            db=db,
            item_type=payload.item_type,
            item_id=payload.item_id,
            comment=payload.comment,
            approver_name=payload.approver_name,
            approver_username=payload.approver_username
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi từ chối hồ sơ: {str(e)}")


@router.post("/batch-approve")
def batch_approve_items(
    payload: BatchApprovalRequest,
    db: Session = Depends(get_db)
):
    """
    [POST] Phê duyệt hàng loạt nhiều hồ sơ cùng lúc
    """
    success_count = 0
    errors = []

    for item in payload.items:
        i_type = item.get("item_type")
        i_id = item.get("item_id")
        try:
            ISOApprovalService.approve_item(
                db=db,
                item_type=i_type,
                item_id=i_id,
                comment=payload.comment or "Phê duyệt hàng loạt",
                approver_name=payload.approver_name,
                approver_username=payload.approver_username
            )
            success_count += 1
        except Exception as err:
            errors.append(f"{i_type} #{i_id}: {str(err)}")

    return {
        "success": True,
        "success_count": success_count,
        "total_requested": len(payload.items),
        "errors": errors
    }


@router.post("/forward")
def forward_item(
    payload: ForwardApprovalRequest,
    db: Session = Depends(get_db)
):
    """
    [POST] Chuyển cấp hoặc chỉ định người duyệt khác
    """
    try:
        return ISOApprovalService.forward_item(
            db=db,
            item_type=payload.item_type,
            item_id=payload.item_id,
            new_approver_name=payload.new_approver_name,
            new_approver_role=payload.new_approver_role,
            note=payload.note,
            forwarded_by=payload.forwarded_by
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi chuyển duyệt: {str(e)}")


@router.get("/history/{item_type}/{item_id}")
def get_approval_history(
    item_type: str,
    item_id: int,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy lịch sử vết phê duyệt của hồ sơ (Audit Trail)
    """
    try:
        return ISOApprovalService.get_approval_history(db, item_type=item_type, item_id=item_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn lịch sử phê duyệt: {str(e)}")
