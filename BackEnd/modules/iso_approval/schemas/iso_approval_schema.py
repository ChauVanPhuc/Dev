from typing import List, Optional, Any
from pydantic import BaseModel

class ApprovalActionRequest(BaseModel):
    item_type: str                   # 'document' hoặc 'process'
    item_id: int                     # ID của tài liệu hoặc quy trình
    comment: Optional[str] = ""      # Ý kiến chỉ đạo, nhận xét hoặc lý do từ chối
    approver_name: Optional[str] = "" # Tên người phê duyệt (nếu muốn ghi đè)
    approver_username: Optional[str] = ""

class BatchApprovalRequest(BaseModel):
    items: List[dict]                # Danh sách [{item_type: 'document'|'process', item_id: int}]
    comment: Optional[str] = ""
    approver_name: Optional[str] = ""
    approver_username: Optional[str] = ""

class ForwardApprovalRequest(BaseModel):
    item_type: str
    item_id: int
    new_approver_name: str
    new_approver_role: Optional[str] = ""
    note: Optional[str] = ""
    forwarded_by: Optional[str] = ""

class ApprovalItemResponse(BaseModel):
    id: int
    item_type: str                   # 'document' hoặc 'process'
    code: str
    name: str
    version: Optional[str] = "01"
    status: str
    issuer: Optional[str] = ""
    approver: Optional[str] = ""
    issue_date: Optional[str] = ""
    document_level: Optional[str] = ""
    doc_type: Optional[str] = ""
    department: Optional[str] = ""
    file_path: Optional[str] = ""
    created_at: Optional[str] = ""
    updated_at: Optional[str] = ""
    approval_date: Optional[str] = ""
    notes: Optional[str] = ""

class ApprovalStatsResponse(BaseModel):
    total: int
    pending: int
    approved: int
    rejected: int
    draft: int
    documents_count: int
    processes_count: int
