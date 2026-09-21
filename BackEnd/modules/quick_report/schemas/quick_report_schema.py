# -*- coding: utf-8 -*-
from pydantic import BaseModel
from typing import Optional, List

class QuickReportCreate(BaseModel):
    code: Optional[str] = None
    report_type: str # "Biên bản cuộc họp" | "Báo cáo vấn đề"
    creator_name: Optional[str] = "Nguyễn Văn A"
    is_anonymous: Optional[bool] = False
    attendees: Optional[str] = None
    related_ticket: Optional[str] = None
    issue_type: Optional[str] = None
    area: Optional[str] = None
    main_content: str
    solution_recommendation: Optional[str] = None
    images: Optional[str] = "[]"
    audio_url: Optional[str] = None
    status: Optional[str] = "Chờ xử lý"

class QuickReportUpdate(BaseModel):
    report_type: Optional[str] = None
    creator_name: Optional[str] = None
    is_anonymous: Optional[bool] = None
    attendees: Optional[str] = None
    related_ticket: Optional[str] = None
    issue_type: Optional[str] = None
    area: Optional[str] = None
    main_content: Optional[str] = None
    solution_recommendation: Optional[str] = None
    images: Optional[str] = None
    audio_url: Optional[str] = None
    status: Optional[str] = None
    handler_name: Optional[str] = None
    handler_response: Optional[str] = None

class AIGenerateRequest(BaseModel):
    report_type: str
    main_content: str
    issue_type: Optional[str] = None
    area: Optional[str] = None
