# -*- coding: utf-8 -*-
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class InspectionGuideStepImageOut(BaseModel):
    id: int
    image_url: str
    file_name: str
    display_order: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class InspectionGuideSubStepOut(BaseModel):
    id: int
    sub_step_no: int
    title: Optional[str] = None
    content: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class InspectionGuideSubStepCreate(BaseModel):
    sub_step_no: int
    title: Optional[str] = Field(None, max_length=250)
    content: Optional[str] = Field(None, max_length=4000)


class InspectionGuideSubStepUpdate(BaseModel):
    sub_step_no: Optional[int] = None
    title: Optional[str] = Field(None, max_length=250)
    content: Optional[str] = Field(None, max_length=4000)


class InspectionGuideStepOut(BaseModel):
    id: int
    step_no: int
    title: str
    content: Optional[str]
    images: List[InspectionGuideStepImageOut] = []
    sub_steps: List[InspectionGuideSubStepOut] = []
    model_config = ConfigDict(from_attributes=True)


class InspectionGuideStepCreate(BaseModel):
    step_no: int
    title: str = Field(..., max_length=250)
    content: Optional[str] = Field(None, max_length=4000)


class InspectionGuideStepUpdate(BaseModel):
    step_no: Optional[int] = None
    title: Optional[str] = Field(None, max_length=250)
    content: Optional[str] = Field(None, max_length=4000)


class InspectionGuideAssignmentOut(BaseModel):
    id: int
    inspection_type: str
    product_id: Optional[int] = None
    category_id: Optional[int] = None
    stage_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class InspectionGuideAssignmentCreate(BaseModel):
    inspection_type: str = Field(..., max_length=50)
    product_id: Optional[int] = None
    category_id: Optional[int] = None
    stage_id: Optional[int] = None
    is_active: Optional[bool] = True


class InspectionGuideBase(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=250)
    doc_type: Optional[str] = Field("HDKT", max_length=50)
    description: Optional[str] = Field(None, max_length=1000)
    is_active: Optional[bool] = True


class InspectionGuideCreate(InspectionGuideBase):
    pass


class InspectionGuideUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=250)
    doc_type: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=1000)
    is_active: Optional[bool] = None


class InspectionGuideOut(InspectionGuideBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    steps: List[InspectionGuideStepOut] = []
    assignments: List[InspectionGuideAssignmentOut] = []
    model_config = ConfigDict(from_attributes=True)


class InspectionGuideListOut(BaseModel):
    id: int
    code: str
    name: str
    doc_type: Optional[str] = "HDKT"
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    steps: List[InspectionGuideStepOut] = []
    assignments: List[InspectionGuideAssignmentOut] = []
    model_config = ConfigDict(from_attributes=True)


class ReorderPayload(BaseModel):
    ids: List[int]


class GuideAssignmentPayload(BaseModel):
    assignments: List[InspectionGuideAssignmentCreate]
