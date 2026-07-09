import sys
import os
from sqlalchemy import text

# Thêm thư mục BackEnd vào sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
sys.path.append(backend_root)

from config.database import engine, Base
# Import ALL models to ensure they are registered for dropping/creating
from modules.auth.models.accounts import Account
from modules.auth.models.departments import Department
from modules.auth.models.role import Role
from modules.auth.models.permissions import Permission
from modules.auth.models.associations import role_permission, permission_stage
from modules.production.models.product_plan import ProductPlan
from modules.production.models.product import Product
from modules.production.models.category import Category
from modules.production.models.stages import Stage
from modules.production.models.bom_detail import BOMDetail
from modules.master.models.master_product import MasterProduct
from modules.master.models.master_bom_detail import MasterBOMDetail
from modules.master.models.master_category import MasterCategory
from modules.delivery.models.deliveries import Delivery
from modules.delivery.models.delivery_details import DeliveryDetail
from modules.delivery.models.delivery_images import DeliveryImage
from modules.delivery.models.delivery_qc import DeliveryQC
from modules.delivery.models.delivery_returns import DeliveryReturn
from modules.delivery.models.order import Order
from modules.delivery.models.order_item import OrderItem
from modules.delivery.models.pallet_card import PalletCard
from modules.notification.models.notifications import Notification
from modules.inspection.models.input_inspection import InputInspection
from modules.inspection.models.defect_type import DefectType
from modules.inspection.models.daily_inspection import DailyInspectionRecord, DailyInspectionDefect
from modules.inspection.models.stage_inspection import StageInspection
from modules.equipment.models.equipment import Equipment
from modules.kpi.models.kpi import KPI
from modules.kpi.models.award_discipline import AwardDiscipline
from modules.kpi.models.staff_evaluation import StaffEvaluation
from modules.capa.models.capa import CAPA
from modules.capa.models.capa_occurrence import CAPAOccurrence
from modules.capa.models.capa_evaluation import CAPAEvaluation

def reset_all_db():
    print("--- Đang Reset toàn bộ Database để cập nhật cấu trúc mới (Department) ---")
    
    try:
        # Cách an toàn nhất: drop_all handles foreign key order
        Base.metadata.drop_all(bind=engine)
        print("1. Đã xóa toàn bộ các bảng cũ thành công.")
        
        # Tạo lại tất cả
        Base.metadata.create_all(bind=engine)
        print("2. Đã tạo lại cấu trúc Database mới thành công.")
        
    except Exception as e:
        print(f"Lỗi: {e}")

if __name__ == "__main__":
    reset_all_db()
