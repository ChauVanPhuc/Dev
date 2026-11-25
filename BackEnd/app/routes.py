# -*- coding: utf-8 -*-

from fastapi import APIRouter

from modules.production.routes import product_router, category_router, product_plan_router, production_router, stage_router, routing_router

from modules.master.routes import master_product_router, master_category_router, customer_router

from modules.delivery.routes import order_router, delivery_router, return_router, pallet_router

from modules.auth.routes import account_router, role_router, permission_router, org_structure_router, employee_router, department_router


from modules.notification.routes import notification_router

from modules.inspection.routes.qc_routes import router as qc_router
from modules.inspection.routes.inspection_routes import router as inspection_router, get_quality_overview

from modules.equipment.routes import equipment_router, machinery_router

from modules.kpi.routes import kpi_router, award_discipline_router, staff_evaluation_router, kpi_management_router, kpi_task_router, quality_employee_router, quality_employee_attendance_router

from modules.capa.routes import capa_router
from modules.quick_report.routes import quick_report_router
from modules.production.routes import production_v2_router

from modules.system.routes import system_router, screen_router, screen_bug_router, system_sidebar_router, data_package_router

from modules.claim.routes.claim_routes import router as claim_router
from modules.price.routes.price_routes import router as price_router
from modules.defect.router import router as defect_router

from modules.purchasing.routes import purchase_requisition_router, purchase_order_item_router
from modules.inspection.routes.iso_router import router as iso_router
from modules.inspection.routes.onlyoffice_router import router as onlyoffice_router
from modules.inspection.routes.iso_master_record_router import router as iso_master_record_router
from modules.iso_approval.routes.iso_approval_router import router as iso_approval_router
from modules.iso_signature.routes.iso_signature_router import router as iso_signature_router
from modules.inspection.routes.quality_objective_routes import router as quality_objective_router
from modules.hr.routes import hr_router
from modules.hr.routes.assessment_router import admin_assessment_router, public_assessment_router
from modules.inspection_guide.routes.inspection_guide_router import router as inspection_guide_router
from modules.inspection_guide.routes.inspection_guide_router import parameter_router as inspection_parameter_router
from modules.inspection_guide.routes.inspection_form_type_router import router as inspection_form_type_router
from modules.inspection.routes.quality_report_router import router as quality_report_router

api_router = APIRouter()

api_router.include_router(admin_assessment_router, prefix="/hr/assessments", tags=["hr-assessments"])
api_router.include_router(public_assessment_router, prefix="/assessment", tags=["public-assessment"])


api_router.include_router(quality_objective_router, prefix="/quality-objectives", tags=["quality-objectives"])




api_router.include_router(product_router.router, prefix="/products", tags=["products"])
api_router.include_router(production_v2_router.router, prefix="/production-v2", tags=["production-v2"])

api_router.include_router(master_product_router.router, prefix="/master-products", tags=["master-products"])

api_router.include_router(master_category_router.router, prefix="/master-categories", tags=["master-categories"])

api_router.include_router(customer_router.router, prefix="/customers", tags=["customers"])

api_router.include_router(category_router.router, prefix="/categories", tags=["categories"])

api_router.include_router(order_router.router, prefix="/orders", tags=["orders"])

api_router.include_router(account_router.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(department_router.router, prefix="/departments", tags=["departments"])


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
api_router.include_router(data_package_router.router, prefix="/system/data-packages", tags=["data-packages"])

api_router.include_router(inspection_router, prefix="/inspections", tags=["inspections"])
api_router.get("/inspect_quality-overview", tags=["inspections"])(get_quality_overview)
api_router.include_router(quality_report_router, prefix="/quality-reports", tags=["quality-reports"])

api_router.include_router(equipment_router.router, prefix="/equipments", tags=["equipments"])
api_router.include_router(machinery_router.router, prefix="/machines", tags=["machines"])

api_router.include_router(pallet_router.router, prefix="/pallet-cards", tags=["pallet-cards"])

api_router.include_router(kpi_router.router, prefix="/kpis", tags=["kpis"])

api_router.include_router(award_discipline_router.router, prefix="/awards-discipline", tags=["awards-discipline"])

api_router.include_router(staff_evaluation_router.router, prefix="/staff-evaluations", tags=["staff-evaluations"])
api_router.include_router(staff_evaluation_router.router, prefix="/staff-evaluation", tags=["staff-evaluations"])
api_router.include_router(quality_employee_router.router, prefix="/quality-employees", tags=["quality-employees"])
api_router.include_router(quality_employee_attendance_router.router, prefix="/quality-employees/attendance", tags=["quality-employee-attendance"])
api_router.include_router(kpi_management_router.router, prefix="/kpi-management", tags=["kpi-management"])
api_router.include_router(kpi_task_router.router, prefix="/kpi-tasks", tags=["kpi-tasks"])

api_router.include_router(screen_router.router, prefix="/screens", tags=["screens"])

api_router.include_router(screen_bug_router.router, prefix="/screen-bugs", tags=["screen-bugs"])
api_router.include_router(system_sidebar_router.router, prefix="/system/sidebar", tags=["system-sidebar"])

api_router.include_router(capa_router.router, prefix="/capas", tags=["capas"])
api_router.include_router(quick_report_router.router, prefix="/quick-reports", tags=["quick-reports"])

api_router.include_router(claim_router, prefix="/claims", tags=["claim"])
api_router.include_router(price_router, prefix="/claims", tags=["cabinet-prices"])
api_router.include_router(defect_router, prefix="/inspections", tags=["defects"])

api_router.include_router(purchase_requisition_router.router, prefix="/purchase-requisitions", tags=["purchase-requisitions"])

api_router.include_router(purchase_order_item_router.router, prefix="/purchase-order-items", tags=["purchase-order-items"])
api_router.include_router(inspection_guide_router, prefix="/inspection-guides", tags=["inspection-guides"])
api_router.include_router(inspection_parameter_router, prefix="/inspection-parameters", tags=["inspection-parameters"])
api_router.include_router(inspection_form_type_router, prefix="/inspection-form-types", tags=["inspection-form-types"])
api_router.include_router(iso_router, prefix="/iso-documents", tags=["iso-documents"])
api_router.include_router(onlyoffice_router, prefix="/iso-documents/onlyoffice", tags=["onlyoffice"])
api_router.include_router(iso_master_record_router, prefix="/iso-master-records", tags=["iso-master-records"])
api_router.include_router(iso_master_record_router, prefix="/iso-records", tags=["iso-master-records"])
api_router.include_router(iso_approval_router, prefix="/iso-approvals", tags=["iso-approvals"])
api_router.include_router(iso_signature_router, prefix="/iso-signatures", tags=["iso-signatures"])
api_router.include_router(hr_router.router, prefix="/hr", tags=["hr"])
api_router.include_router(routing_router.router)

from modules.pallet_check.routes.pallet_check_router import router as pallet_check_router
api_router.include_router(pallet_check_router, prefix="/pallet-check", tags=["pallet-check"])

from modules.daily_production.routes.daily_production_router import router as daily_production_router
api_router.include_router(daily_production_router, prefix="/daily-production", tags=["daily-production"])

from modules.warehouse.routes import warehouse_router, unit_of_measure_router
api_router.include_router(warehouse_router, prefix="/warehouses", tags=["warehouses"])
api_router.include_router(unit_of_measure_router, prefix="/units-of-measure", tags=["units-of-measure"])

from modules.chatbot.routes import router as chatbot_router
api_router.include_router(chatbot_router, prefix="/chatbot", tags=["chatbot"])

import sys
import os

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

try:
    from lpn_crawler.backend.api.router import router as lpn_router
    api_router.include_router(lpn_router, prefix="/lpn-crawler", tags=["lpn-crawler"])
except Exception as e:
    print(f"Warning: Failed to load lpn_crawler router: {e}")
# Reload trigger for appsheet webhook receiver json capture mode

try:
    from dashboard.backend.api.router import router as dashboard_router
    api_router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
except Exception as e:
    print(f"Warning: Failed to load dashboard router: {e}")



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


# reload trigger security-v1
