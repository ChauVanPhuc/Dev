# -*- coding: utf-8 -*-
from config.database import Base
from modules.auth.models.accounts import Account
from modules.production.models.category import Category
from modules.delivery.models.deliveries import Delivery
from modules.delivery.models.delivery_details import DeliveryDetails
from modules.delivery.models.delivery_images import DeliveryImage
from modules.auth.models.departments import Department
from modules.production.models.bom_detail import BOMDetail
from modules.delivery.models.order import Order
from modules.delivery.models.order_item import OrderItem
from modules.auth.models.permissions import Permission
from modules.production.models.product import Product
from modules.production.models.product_plan import ProductPlan
from modules.auth.models.role import Role
from modules.production.models.stages import Stage
from modules.notification.models.notifications import Notification
from modules.master.models.master_category import MasterCategory
from modules.master.models.master_product import MasterProduct
from modules.master.models.master_bom_detail import MasterBOMDetail
from modules.delivery.models.delivery_qc import DeliveryQC
from modules.delivery.models.delivery_returns import DeliveryReturn
from modules.auth.models.associations import permission_stage, role_permission
from modules.system.models.backup_qr import BackupQRCode
from modules.delivery.models.pallet_card import PalletCard
from modules.kpi.models.kpi import KPI
from modules.kpi.models.award_discipline import AwardDiscipline
from modules.kpi.models.staff_evaluation import StaffEvaluation
from modules.capa.models.capa import CAPA
from modules.capa.models.capa_occurrence import CAPAOccurrence
from modules.capa.models.capa_evaluation import CAPAEvaluation
from modules.system.models.system_screen import SystemScreen
from modules.system.models.system_component import SystemComponent

__all__ = [
    "Base", "Account", "Category", "Delivery", "DeliveryDetails", "DeliveryImage",
    "Department", "BOMDetail", "Order", "OrderItem", "Permission", "Product",
    "ProductPlan", "Role", "Stage", "Notification", "MasterCategory", "MasterProduct",
    "MasterBOMDetail", "DeliveryQC", "DeliveryReturn", "permission_stage", "role_permission",
    "BackupQRCode", "PalletCard", "KPI", "AwardDiscipline", "StaffEvaluation", "CAPA",
    "CAPAOccurrence", "CAPAEvaluation", "SystemScreen", "SystemComponent"
]
