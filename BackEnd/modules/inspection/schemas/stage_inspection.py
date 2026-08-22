from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from modules.inspection.schemas.input_inspection import (
    InputInspectionBase as StageInspectionBase,
    InputInspectionCreate as StageInspectionCreate,
    InputInspectionRead as StageInspectionRead
)

class InspectionCreateV2Request(BaseModel):
    mode: Optional[str] = "input"
    stage: Optional[str] = None
    po: Optional[str] = None
    result: Optional[str] = "pass"
    product: Optional[str] = None
    spec: Optional[str] = None
    sampleQty: Optional[Any] = None
    errorQty: Optional[Any] = None
    note: Optional[str] = None
    errors: Optional[List[Dict[str, Any]]] = []
    images: Optional[List[str]] = []
    creator: Optional[str] = None
    palletCode: Optional[str] = None
    subLot: Optional[str] = None
    humidity: Optional[Any] = None
    machine: Optional[str] = None
    area: Optional[str] = None
    answers: Optional[Any] = None
    steps: Optional[List[Dict[str, Any]]] = None


