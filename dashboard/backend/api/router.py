# -*- coding: utf-8 -*-
"""
Dashboard API Router
Cung cấp các endpoint RESTful cho phân hệ Claim Analytics Dashboard.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db

from dashboard.backend.schemas.dashboard_schemas import (
    SummaryKpiResponse,
    ParetoResponse,
    TrendResponse,
    ComboResponse,
    ContainerLoadResponse,
    DefectGroupResponse,
    FilterOptionsResponse
)
from dashboard.backend.services.analytics_service import AnalyticsService
from dashboard.backend.services.leadtime_service import LeadTimeService

router = APIRouter()


@router.get("/filters", response_model=FilterOptionsResponse, summary="Lấy danh mục các bộ lọc")
def get_filters(db: Session = Depends(get_db)):
    return AnalyticsService.get_filter_options(db)


@router.get("/summary", response_model=SummaryKpiResponse, summary="Lấy 5 thẻ KPI tổng hợp")
def get_summary(
    mode: str = Query("monthly", description="'monthly' (theo tháng) hoặc 'overview' (tổng quan)"),
    period: str = Query("08/2026", description="Kỳ tháng claim, ví dụ '08/2026'"),
    customer: str = Query("ALL", description="Mã khách hàng hoặc 'ALL'"),
    severity: str = Query("ALL", description="Mức độ hoặc 'ALL'"),
    is_mock: bool = Query(False, description="Bắt buộc sử dụng dữ liệu mẫu (Demo)"),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_summary_kpi(
        db=db,
        mode=mode,
        period=period,
        customer=customer,
        severity=severity,
        force_mock=is_mock
    )


@router.get("/pareto", response_model=ParetoResponse, summary="Lấy dữ liệu Biểu đồ 1: Pareto Top 10 lỗi")
def get_pareto(
    mode: str = Query("monthly", description="'monthly' hoặc 'overview'"),
    period: str = Query("08/2026", description="Kỳ tháng claim"),
    customer: str = Query("ALL", description="Khách hàng"),
    is_mock: bool = Query(False, description="Dữ liệu mẫu"),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_pareto_defects(
        db=db,
        mode=mode,
        period=period,
        customer=customer,
        force_mock=is_mock
    )


@router.get("/trend", response_model=TrendResponse, summary="Lấy dữ liệu Biểu đồ 2: Xu hướng lỗi (Tổng + Chi tiết)")
def get_trend(
    granularity: str = Query("month", description="Chu kỳ: 'month', 'week', 'day'"),
    metric: str = Query("cases", description="'cases' (số vụ) hoặc 'amount' (tiền)"),
    is_mock: bool = Query(False, description="Dữ liệu mẫu"),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_trend_defects(
        db=db,
        granularity=granularity,
        force_mock=is_mock
    )


@router.get("/combo", response_model=ComboResponse, summary="Lấy dữ liệu Biểu đồ 3: Combo Chart (Vụ là Cột, Tiền là Đường)")
def get_combo(
    is_mock: bool = Query(False, description="Dữ liệu mẫu"),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_combo_cases_amount(db=db, force_mock=is_mock)


@router.get("/container-load", response_model=ContainerLoadResponse, summary="Lấy dữ liệu Biểu đồ 4: Số Cont theo Thời gian Load Cont (ăn theo Claim)")
def get_container_load(
    claim_month: str = Query("08/2026", description="Tháng claim cần bóc tách cont, vd: '08/2026'"),
    is_mock: bool = Query(False, description="Dữ liệu mẫu"),
    db: Session = Depends(get_db)
):
    return LeadTimeService.get_container_load_by_claim_period(
        db=db,
        claim_period=claim_month,
        force_mock=is_mock
    )


@router.get("/defect-groups", response_model=DefectGroupResponse, summary="Lấy dữ liệu Biểu đồ 5: Tỉ lệ lỗi theo Phân nhóm")
def get_defect_groups(
    mode: str = Query("monthly", description="'monthly' hoặc 'overview'"),
    period: str = Query("08/2026", description="Kỳ tháng"),
    is_mock: bool = Query(False, description="Dữ liệu mẫu"),
    db: Session = Depends(get_db)
):
    return AnalyticsService.get_defect_groups(
        db=db,
        mode=mode,
        period=period,
        force_mock=is_mock
    )
