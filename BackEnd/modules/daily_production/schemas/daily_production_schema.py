# -*- coding: utf-8 -*-
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime


class PreviewMergeRequest(BaseModel):
    order_codes: List[str]
    product_ids: Optional[List[int]] = None
    section_name: Optional[str] = "MẶT TIỀN"
    factory: Optional[str] = "NM2"
    color_filter: Optional[List[str]] = None
    include_bom: Optional[bool] = True


class DailyProductionItemPayload(BaseModel):
    id: Optional[int] = None
    row_type: Optional[str] = "DETAIL_ITEM"  # CABINET_HEADER | DETAIL_ITEM
    cont_code: Optional[str] = ""
    color_code: Optional[str] = ""
    cabinet_code: Optional[str] = ""
    stt_code: Optional[str] = ""
    material_name: Optional[str] = ""
    item_name: Optional[str] = ""
    dim_thick: Optional[str] = ""
    dim_width: Optional[str] = ""
    dim_length: Optional[str] = ""
    set_qty: Optional[float] = 1.0
    base_planned_qty: Optional[int] = 0
    custom_planned_qty: Optional[int] = 0
    completed_qty: Optional[int] = 0
    is_visible: Optional[bool] = True
    is_custom_row: Optional[bool] = False
    source_orders_text: Optional[str] = ""
    note: Optional[str] = ""
    sort_order: Optional[int] = 0


class DailyProductionBatchCreate(BaseModel):
    plan_date: str
    factory: Optional[str] = "NM2"
    section_name: Optional[str] = "MẶT TIỀN"
    batch_title: str
    line_color_summary: Optional[str] = ""
    selected_orders: Optional[List[str]] = []
    status: Optional[str] = "PUBLISHED"
    notes: Optional[str] = ""
    created_by: Optional[str] = ""
    items: List[DailyProductionItemPayload] = []


class DailyProductionBatchUpdate(BaseModel):
    plan_date: Optional[str] = None
    factory: Optional[str] = None
    section_name: Optional[str] = None
    batch_title: Optional[str] = None
    line_color_summary: Optional[str] = None
    selected_orders: Optional[List[str]] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[List[DailyProductionItemPayload]] = None


class BatchItemsQuickUpdatePayload(BaseModel):
    items: List[DailyProductionItemPayload]

