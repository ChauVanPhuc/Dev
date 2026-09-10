# -*- coding: utf-8 -*-
from app.core.database import Base
from app.modules.defect.models import DefectType, ClientDefect, DefectGlossary
from app.modules.claim.models import CustomerClaim
from app.modules.price.models import CabinetPrice

__all__ = [
    "Base",
    "DefectType", "ClientDefect", "DefectGlossary",
    "CustomerClaim", "CabinetPrice"
]
