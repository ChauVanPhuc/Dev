# -*- coding: utf-8 -*-
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class SummaryKpiResponse(BaseModel):
    total_claims: int
    claims_change_pct: float
    total_penalty_amount: float
    penalty_change_pct: float
    avg_penalty_per_claim: float
    avg_penalty_change: float
    total_containers: int
    containers_change_pct: float
    resolution_rate: float
    resolved_count: int
    period_label: str
    comparison_label: Optional[str] = None
    is_mock: bool = False


class ParetoItem(BaseModel):
    code: str
    name: str
    category: str
    count: int
    amount: float
    percentage: float
    cumulative_pct: float


class ParetoResponse(BaseModel):
    items: List[ParetoItem]
    total_count: int
    total_amount: float
    is_mock: bool = False


class TrendDataPoint(BaseModel):
    period: str
    total_cases: int
    total_amount: float
    breakdown_cases: Dict[str, int]
    breakdown_amount: Dict[str, float]


class TrendResponse(BaseModel):
    granularity: str
    categories: List[str]
    timeline: List[TrendDataPoint]
    is_mock: bool = False


class ComboDataPoint(BaseModel):
    period: str
    cases: int
    amount: float


class ComboResponse(BaseModel):
    data: List[ComboDataPoint]
    is_mock: bool = False


class ContainerLoadPoint(BaseModel):
    loading_month: str
    container_count: int
    containers: List[str]
    sample_claims: List[str]
    lag_months: int


class ContainerLoadResponse(BaseModel):
    claim_month: str
    total_containers: int
    points: List[ContainerLoadPoint]
    is_mock: bool = False


class DefectGroupPoint(BaseModel):
    group_code: str
    group_name: str
    count: int
    amount: float
    percentage: float
    color: str


class DefectGroupResponse(BaseModel):
    groups: List[DefectGroupPoint]
    total_count: int
    total_amount: float
    is_mock: bool = False


class FilterOption(BaseModel):
    value: str
    label: str


class FilterOptionsResponse(BaseModel):
    periods: List[FilterOption]
    default_period: str
    customers: List[FilterOption]
    severities: List[FilterOption]
    categories: List[FilterOption]
