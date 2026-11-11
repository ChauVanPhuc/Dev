# -*- coding: utf-8 -*-
from typing import List, Optional, Any, Dict
from pydantic import BaseModel

class PalletCreatePayload(BaseModel):
    palletIndex: int
    palletId: str
    status: Optional[str] = "pass"
    timestamp: Optional[str] = None
    standing: Optional[Dict[str, Any]] = None
    roof: Optional[Dict[str, Any]] = None
    totalScans: Optional[int] = 0

class ContainerCreatePayload(BaseModel):
    id: str
    name: str
    inspector: Optional[str] = None
    status: Optional[str] = "completed"
    completedAt: Optional[str] = None
    pallets: Optional[List[PalletCreatePayload]] = []
    auditResult: Optional[Dict[str, Any]] = None

class ContainerUpdatePayload(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    inspector: Optional[str] = None
    status: Optional[str] = None
    completedAt: Optional[str] = None
    pallets: Optional[List[PalletCreatePayload]] = None
    auditResult: Optional[Dict[str, Any]] = None
