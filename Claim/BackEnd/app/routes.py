import sys
import os

# Ensure project root is in sys.path so lpn_crawler module can be imported cleanly
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if not os.path.exists(os.path.join(PROJECT_ROOT, "lpn_crawler")):
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi import APIRouter
from app.modules.defect.router import router as defect_router
from app.modules.claim.router import router as claim_router
from app.modules.price.router import router as price_router
from lpn_crawler.backend.api.router import router as lpn_router
from dashboard.backend.api.router import router as dashboard_router

api_router = APIRouter()

api_router.include_router(defect_router, prefix="/inspections", tags=["inspections"])
api_router.include_router(claim_router, prefix="/claims", tags=["claims"])
api_router.include_router(price_router, prefix="/claims", tags=["price"])
api_router.include_router(lpn_router, prefix="/lpn-crawler", tags=["lpn-crawler"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])

# Reload trigger for LPN crawler filter options and top noc pallet grouping v2










