from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime

class DailyInspectionDefectCreate(BaseModel):
    defect_id: int
    quantity: int

class DailyInspectionRecordCreate(BaseModel):
    inspection_date: Optional[date] = None
    stage_name: str
    inspector_id: Optional[int] = None
    total_products: int
    total_defects: int
    defect_rate: float
    defects: List[DailyInspectionDefectCreate]

class DailyInspectionDefectRead(BaseModel):
    id: int
    record_id: int
    defect_id: int
    quantity: int
    
    class Config:
        from_attributes = True

class DailyInspectionSummary(BaseModel):
    total_records: int
    total_products: int
    total_defects: int
    avg_defect_rate: float

class ParetoItem(BaseModel):
    defect_name: str
    count: int
    percentage: float
    cumulative_percentage: float

class TrendItem(BaseModel):
    date: date
    defect_count: int
    product_count: int
    defect_rate: float

class DistributionItem(BaseModel):
    label: str
    value: int

class DailyInspectionAnalytics(BaseModel):
    summary: DailyInspectionSummary
    pareto: List[ParetoItem]
    trend: List[TrendItem]
    distribution: List[DistributionItem]

class DailyInspectionRecordRead(BaseModel):
    id: int
    inspection_date: date
    stage_name: str
    inspector_id: Optional[int]
    inspector_name: Optional[str] = None
    total_products: int
    total_defects: int
    defect_rate: float
    created_at: datetime
    defects: List[DailyInspectionDefectRead]

    class Config:
        from_attributes = True
