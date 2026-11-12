from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import date, datetime


class DailyInspectionDefectCreate(BaseModel):
    defect_id: int
    quantity: int


class DailyInspectionRecordCreate(BaseModel):
    inspection_date: Optional[date] = None
    stage_name: str
    inspector_id: Optional[int] = None
    batch_no: Optional[str] = None
    pallet_code: Optional[str] = None
    total_products: int
    total_defects: int
    defect_rate: float
    defects: List[DailyInspectionDefectCreate]


class DailyInspectionDefectRead(BaseModel):
    id: int
    record_id: int
    defect_id: int
    quantity: int
    defect_name: Optional[str] = None
    defect_code: Optional[str] = None

    class Config:
        from_attributes = True


class KpiItem(BaseModel):
    value: float
    prev_value: Optional[float] = None
    diff_pct: Optional[float] = None
    diff_pts: Optional[float] = None
    unit_type: Optional[str] = "pct"  # "pct" | "pts"
    label: Optional[str] = None
    trend: Optional[str] = "neutral"  # "up" | "down" | "neutral" | "no_data"
    is_favorable: Optional[bool] = None
    tooltip: Optional[str] = None


class ComparisonMetadata(BaseModel):
    has_comparison: bool = False
    reference_period_label: Optional[str] = None
    ref_start_date: Optional[str] = None
    ref_end_date: Optional[str] = None
    current_start_date: Optional[str] = None
    current_end_date: Optional[str] = None
    is_daily_average: bool = False


class DailyInspectionSummary(BaseModel):
    total_records: int
    pass_rate: float = 0.0
    total_products: int
    defective_products: int = 0
    total_defects: int
    avg_defect_rate: float
    critical_defects: int = 0
    kpi_records: Optional[KpiItem] = None
    kpi_pass_rate: Optional[KpiItem] = None
    kpi_products: Optional[KpiItem] = None
    kpi_defective_products: Optional[KpiItem] = None
    kpi_defects: Optional[KpiItem] = None
    kpi_defect_rate: Optional[KpiItem] = None
    kpi_critical_defects: Optional[KpiItem] = None
    comparison: Optional[ComparisonMetadata] = None


class ParetoItem(BaseModel):
    defect_id: Optional[int] = None
    defect_code: Optional[str] = None
    defect_name: str
    count: int
    percentage: float
    cumulative_percentage: float
    rank: Optional[int] = None


class TopCauseItem(BaseModel):
    defect_id: int
    defect_code: str
    defect_name: str
    category: Optional[str] = None
    aql_class: Optional[str] = None
    count: int
    percentage: float
    rank: Optional[int] = None


class TrendItem(BaseModel):
    date: str
    defect_count: int
    product_count: int
    defective_products: int = 0
    defect_rate: float
    pass_rate: float = 0.0


class DistributionItem(BaseModel):
    label: str
    value: int


class StageBreakdownItem(BaseModel):
    stage: str
    defect_count: int
    percentage: float
    color: Optional[str] = None


class StagePassRateItem(BaseModel):
    stage: str
    code: Optional[str] = None
    total_lots: int = 0
    passed_lots: int = 0
    failed_lots: int = 0
    total_products: int = 0
    passed_products: int = 0
    defective_products: int = 0
    pass_rate: float = 0.0
    target_rate: float = 95.0


class CategorySeverityItem(BaseModel):
    category: str
    category_name: str
    minor: int = 0
    major: int = 0
    critical: int = 0
    unclassified: int = 0
    total: int = 0


class KpiPareto(BaseModel):
    critical_defects: int = 0
    major_defects: int = 0
    minor_defects: int = 0
    pareto_80_ratio: float = 0.0
    kpi_critical: Optional[KpiItem] = None
    kpi_major: Optional[KpiItem] = None
    kpi_minor: Optional[KpiItem] = None
    comparison: Optional[ComparisonMetadata] = None


class HeatmapStageItem(BaseModel):
    code: str
    name: str


class HeatmapRow(BaseModel):
    defect_id: int
    defect_code: str
    defect_name: str
    total_count: int
    stages: Dict[str, int] = {}


class DailyBreakdownItem(BaseModel):
    date: str
    total_orders: int = 0
    passed_orders: int = 0
    failed_orders: int = 0
    total_products: int = 0
    passed_products: int = 0
    defective_products: int = 0
    defect_count: int = 0
    pass_rate: float = 0.0
    defect_rate: float = 0.0


class AqlSeverityItem(BaseModel):
    name: str
    aql_class: str
    count: int
    percentage: float
    color: str


class DetailedDefectItem(BaseModel):
    defect_id: Optional[int] = None
    defect_code: str
    defect_name: str
    category: Optional[str] = None
    category_name: Optional[str] = None
    aql_class: Optional[str] = None
    count: int


class BatchDefectItem(BaseModel):
    batch_no: str
    pallet_code: Optional[str] = None
    stage_name: Optional[str] = None
    product_line: Optional[str] = None
    inspector_name: Optional[str] = None
    total_products: int = 0
    defective_products: int = 0
    total_defects: int = 0
    defect_rate: float = 0.0


class ProductLineItem(BaseModel):
    line_code: str
    line_name: str
    orders: int = 0
    passed_orders: int = 0
    failed_orders: int = 0
    pass_rate: float = 0.0
    inspected_qty: int = 0
    defective_qty: int = 0
    defect_rate: float = 0.0
    defect_share: float = 0.0


class QcRosterItem(BaseModel):
    id: Optional[int] = None
    inspector_name: str
    primary_stage: str
    total_inspections: int = 0
    passed_inspections: int = 0
    failed_inspections: int = 0
    total_products: int = 0
    passed_products: int = 0
    defective_products: int = 0
    pass_rate: float = 0.0


class CapaStatusItem(BaseModel):
    name: str
    status: str
    count: int
    percentage: float
    color: str


class ActionItem(BaseModel):
    id: Optional[int] = None
    capa_code: str
    issue_title: str
    batch_no: Optional[str] = None
    stage: Optional[str] = None
    owner: Optional[str] = None
    severity: Optional[str] = "Major"
    status: str = "OPEN"
    deadline: Optional[str] = None


class KpiAction(BaseModel):
    total_capa: int = 0
    resolution_rate: float = 0.0
    in_progress_capa: int = 0
    overdue_capa: int = 0
    kpi_total_capa: Optional[KpiItem] = None
    kpi_resolution_rate: Optional[KpiItem] = None
    comparison: Optional[ComparisonMetadata] = None


class DailyInspectionAnalytics(BaseModel):
    summary: DailyInspectionSummary
    pareto: List[ParetoItem]
    trend: List[TrendItem]
    stage_breakdown: List[StageBreakdownItem] = []
    top_defect_causes: List[TopCauseItem] = []
    stage_pass_rates: List[StagePassRateItem] = []
    severity_by_category: List[CategorySeverityItem] = []
    kpi_pareto: Optional[KpiPareto] = None
    defect_stage_heatmap: List[HeatmapRow] = []
    heatmap_stages: List[HeatmapStageItem] = []
    daily_breakdown: List[DailyBreakdownItem] = []
    aql_severity_breakdown: List[AqlSeverityItem] = []
    detailed_defect_table: List[DetailedDefectItem] = []
    kpi_action: Optional[KpiAction] = None
    top_defective_batches: List[BatchDefectItem] = []
    product_line_breakdown: List[ProductLineItem] = []
    qc_roster: List[QcRosterItem] = []
    capa_status_breakdown: List[CapaStatusItem] = []
    action_items: List[ActionItem] = []
    distribution: Optional[List[DistributionItem]] = []


class StageCauseDetailItem(BaseModel):
    defect_id: int
    defect_code: str
    defect_name: str
    aql_class: str
    count: int
    percentage: float


class StageCausesResponse(BaseModel):
    stage_name: str
    totalStageDefects: int
    causes: List[StageCauseDetailItem]


class AqlBreakdownRow(BaseModel):
    defect_id: Optional[int] = None
    defect_code: str
    defect_name: str
    curr_count: int
    prev_count: Optional[int] = None
    diff: Optional[int] = None
    diff_str: str
    percentage: float
    color: str


class AqlBreakdownResponse(BaseModel):
    aql_class: str
    totalAqlDefects: int
    totalPrevDefects: Optional[int] = None
    totalDiff: Optional[int] = None
    totalDiffStr: str
    hasComparison: bool = False
    tableRows: List[AqlBreakdownRow]


class DailyInspectionRecordRead(BaseModel):
    id: int
    inspection_date: date
    stage_name: str
    inspector_id: Optional[int]
    inspector_name: Optional[str] = None
    batch_no: Optional[str] = None
    pallet_code: Optional[str] = None
    status: Optional[str] = "Đã hoàn thành"
    is_confirmed: Optional[bool] = True
    is_deleted: Optional[bool] = False
    total_products: int
    total_defects: int
    defect_rate: float
    created_at: datetime
    defects: List[DailyInspectionDefectRead]

    class Config:
        from_attributes = True
