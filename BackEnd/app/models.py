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
from modules.production.models.mobile_daily_plan import MobileDailyPlan
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
from modules.system.models.screen_bug import ScreenBug, ScreenBugUpdate, ScreenBugImage
from modules.system.models.system_guide import SystemGuide
from modules.inspection.models.defect_type import DefectType, ClientDefect, DefectGlossary
from modules.chatbot.models.chatbot_history import ChatbotHistory
from modules.purchasing.models.purchase_requisition import PurchaseRequisition
from modules.purchasing.models.purchase_order_item import PurchaseOrderItem
from modules.equipment.models.equipment import Equipment, EquipmentInspection, EquipmentTraining
from modules.equipment.models.machinery import Machine, MachineMaintenance, MachineDocument
from modules.inspection.models.iso_models import ISODocument, ISORevisionLog, ISOSection, ISOProcessStep, ISOProcess, ISOProcessSection, ISOProcessStepInstance
from modules.hr.models.hr_models import HRDepartment, HRPosition, HRSection, HREmployee, HROrgNode, HRNodeAssignment
from modules.auth.models.org_structures import OrgStructure, OrgStructureKPI, OrgStructureTask
from modules.auth.models.employees import Employee
from modules.inspection.models.stage_inspection import StageInspection

__all__ = [
    "Base", "Account", "Category", "Delivery", "DeliveryDetails", "DeliveryImage",
    "Department", "BOMDetail", "Order", "OrderItem", "Permission", "Product",
    "ProductPlan", "MobileDailyPlan", "Role", "Stage", "Notification", "MasterCategory", "MasterProduct",
    "MasterBOMDetail", "DeliveryQC", "DeliveryReturn", "permission_stage", "role_permission",
    "BackupQRCode", "PalletCard", "KPI", "AwardDiscipline", "StaffEvaluation", "CAPA",
    "CAPAOccurrence", "CAPAEvaluation", "SystemScreen", "SystemComponent", "SystemGuide", "ScreenBug",
    "ScreenBugUpdate", "ScreenBugImage", "DefectType", "ClientDefect", "DefectGlossary", "ChatbotHistory",
    "PurchaseRequisition", "PurchaseOrderItem", "Equipment", "EquipmentInspection", "EquipmentTraining",
    "Machine", "MachineMaintenance", "MachineDocument",
    "ISODocument", "ISORevisionLog", "ISOSection", "ISOProcessStep",
    "ISOProcess", "ISOProcessSection", "ISOProcessStepInstance",
    "HRDepartment", "HRPosition", "HRSection", "HREmployee", "HROrgNode", "HRNodeAssignment",
    "OrgStructure", "OrgStructureKPI", "OrgStructureTask", "Employee", "StageInspection"
]

