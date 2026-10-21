from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class ISOSignatureBase(BaseModel):
    user_id: Optional[int] = None
    user_code: Optional[str] = ""
    full_name: str
    department: Optional[str] = ""
    position: Optional[str] = ""
    approval_level: Optional[str] = "Cả hai"
    signature_type: str = "HANDWRITTEN_IMAGE" # 'HANDWRITTEN_IMAGE' | 'HANDWRITTEN_DRAW' | 'DIGITAL'
    image_path: Optional[str] = ""
    signature_data: Optional[str] = ""
    digital_cert_provider: Optional[str] = ""
    digital_serial_no: Optional[str] = ""
    digital_valid_from: Optional[str] = ""
    digital_valid_to: Optional[str] = ""
    digital_hash: Optional[str] = ""
    is_default: Optional[bool] = True
    is_active: Optional[bool] = True
    notes: Optional[str] = ""

class ISOSignatureCreate(ISOSignatureBase):
    pass

class ISOSignatureUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    approval_level: Optional[str] = None
    signature_type: Optional[str] = None
    image_path: Optional[str] = None
    signature_data: Optional[str] = None
    digital_cert_provider: Optional[str] = None
    digital_serial_no: Optional[str] = None
    digital_valid_from: Optional[str] = None
    digital_valid_to: Optional[str] = None
    digital_hash: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class ISOSignatureResponse(ISOSignatureBase):
    id: int
    created_at: Optional[str] = ""
    updated_at: Optional[str] = ""

    model_config = ConfigDict(from_attributes=True)

class ISOSignatureStatsResponse(BaseModel):
    total: int
    handwritten_image_count: int
    handwritten_draw_count: int
    digital_count: int
    active_count: int
    inactive_count: int
