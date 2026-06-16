from pydantic import BaseModel
from typing import Optional, List

class ClientDefectBase(BaseModel):
    code: str
    name: str
    name_en: Optional[str] = None
    minor_criteria: Optional[str] = None
    major_criteria: Optional[str] = None
    critical_criteria: Optional[str] = None
    detection_method: Optional[str] = None
    g7_code: Optional[str] = None
    defect_type_id: Optional[int] = None
    is_active: bool = True

class ClientDefectCreate(ClientDefectBase):
    pass

class ClientDefect(ClientDefectBase):
    id: int

    class Config:
        from_attributes = True

class DefectTypeBase(BaseModel):
    name: str
    category: str
    stage: Optional[str] = None
    description: Optional[str] = None
    needs_tracking: bool = False # QA tracking
    qc_tracking: bool = False    # QC tracking
    is_active: bool = True
    code: Optional[str] = None
    aql_class: Optional[str] = None

class DefectTypeCreate(DefectTypeBase):
    pass

class DefectType(DefectTypeBase):
    id: int
    is_tracked_by_me: bool = False # Personalized QC tracking status
    client_defects: List[ClientDefect] = []

    class Config:
        from_attributes = True

