# -*- coding: utf-8 -*-

from fastapi import APIRouter

from modules.production.routes import product_router, category_router, product_plan_router, production_router, stage_router

from modules.master.routes import master_product_router

from modules.delivery.routes import order_router, delivery_router, return_router, pallet_router

from modules.auth.routes import account_router, role_router, permission_router, org_structure_router, employee_router

from modules.notification.routes import notification_router

from modules.inspection.routes.qc_routes import router as qc_router
from modules.inspection.routes.inspection_routes import router as inspection_router

from modules.equipment.routes import equipment_router, machinery_router

from modules.kpi.routes import kpi_router, award_discipline_router, staff_evaluation_router, kpi_management_router

from modules.capa.routes import capa_router

from modules.system.routes import system_router, screen_router, screen_bug_router, system_sidebar_router

from modules.claim.routes.claim_routes import router as claim_router

from modules.purchasing.routes import purchase_requisition_router, purchase_order_item_router
from modules.inspection.routes.iso_router import router as iso_router
from modules.hr.routes import hr_router



api_router = APIRouter()



api_router.include_router(product_router.router, prefix="/products", tags=["products"])

api_router.include_router(master_product_router.router, prefix="/master-products", tags=["master-products"])

api_router.include_router(category_router.router, prefix="/categories", tags=["categories"])

api_router.include_router(order_router.router, prefix="/orders", tags=["orders"])

api_router.include_router(account_router.router, prefix="/accounts", tags=["accounts"])

api_router.include_router(role_router.router, prefix="/roles", tags=["roles"])

api_router.include_router(permission_router.router, prefix="/permissions", tags=["permissions"])
api_router.include_router(org_structure_router.router, prefix="/org-structures", tags=["org-structures"])
api_router.include_router(employee_router.router, prefix="/employees", tags=["employees"])

api_router.include_router(stage_router.router, prefix="/stages", tags=["stages"])

api_router.include_router(product_plan_router.router, prefix="/plans", tags=["plans"])

api_router.include_router(production_router.router, prefix="/production-plans", tags=["production_plans"])

api_router.include_router(delivery_router.router, prefix="/deliveries", tags=["deliveries"])

api_router.include_router(notification_router.router, prefix="/notifications", tags=["notifications"])

api_router.include_router(qc_router, prefix="/qc", tags=["qc"])

api_router.include_router(return_router.router, prefix="/returns", tags=["returns"])

api_router.include_router(system_router.router, prefix="/system", tags=["system"])

api_router.include_router(inspection_router, prefix="/inspections", tags=["inspections"])

api_router.include_router(equipment_router.router, prefix="/equipments", tags=["equipments"])
api_router.include_router(machinery_router.router, prefix="/machines", tags=["machines"])

api_router.include_router(pallet_router.router, prefix="/pallet-cards", tags=["pallet-cards"])

api_router.include_router(kpi_router.router, prefix="/kpis", tags=["kpis"])

api_router.include_router(award_discipline_router.router, prefix="/awards-discipline", tags=["awards-discipline"])

api_router.include_router(staff_evaluation_router.router, prefix="/staff-evaluations", tags=["staff-evaluations"])
api_router.include_router(kpi_management_router.router, prefix="/kpi-management", tags=["kpi-management"])

api_router.include_router(screen_router.router, prefix="/screens", tags=["screens"])

api_router.include_router(screen_bug_router.router, prefix="/screen-bugs", tags=["screen-bugs"])
api_router.include_router(system_sidebar_router.router, prefix="/system/sidebar", tags=["system-sidebar"])

api_router.include_router(capa_router.router, prefix="/capas", tags=["capas"])

api_router.include_router(claim_router, prefix="/claims", tags=["claim"])

api_router.include_router(purchase_requisition_router.router, prefix="/purchase-requisitions", tags=["purchase-requisitions"])

api_router.include_router(purchase_order_item_router.router, prefix="/purchase-order-items", tags=["purchase-order-items"])
api_router.include_router(iso_router, prefix="/iso-documents", tags=["iso-documents"])
api_router.include_router(hr_router.router, prefix="/hr", tags=["hr"])



from fastapi import Depends, HTTPException

from sqlalchemy.orm import Session

from config.database import get_db

from modules.auth.models.departments import Department



@api_router.delete("/dept/{dept_id}")

def delete_department_mapping(dept_id: int, db: Session = Depends(get_db)):

    db_dept = db.query(Department).filter(Department.id == dept_id).first()

    if not db_dept:

        raise HTTPException(status_code=404, detail="Không tìm thấy liên kết phòng ban này")

    db.delete(db_dept)

    db.commit()

    return {"message": "Xóa liên kết phòng ban thành công"}

