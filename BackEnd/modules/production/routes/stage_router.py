from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from config.database import get_db
from modules.production.models.stages import Stage
from modules.production.schemas.stages import Stage as StageSchema

from shared.services.cache_service import cached_query

router = APIRouter()

@router.get("/", response_model=List[StageSchema])
@cached_query("stages", ttl=600)
def read_stages(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách tất cả các công đoạn (Stages) trong hệ thống.
    """
    return db.query(Stage).all()
