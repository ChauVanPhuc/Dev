# -*- coding: utf-8 -*-
import os
import sys

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from config.database import engine, SessionLocal, Base
import app.models
from modules.daily_production.models.daily_production_model import DailyProductionBatch, DailyProductionItem
from modules.daily_production.schemas.daily_production_schema import PreviewMergeRequest, DailyProductionBatchCreate, DailyProductionItemPayload
from modules.daily_production.controllers.daily_production_controller import preview_merged_containers_bom, create_daily_batch
from modules.system.models.system_sidebar import SystemSidebar
from modules.system.models.system_screen import SystemScreen
from shared.utils.timezone import get_vietnam_time


def run_migration():
    print("[Migration] Creating daily_production_batches & daily_production_items tables...")
    Base.metadata.create_all(bind=engine, tables=[
        DailyProductionBatch.__table__,
        DailyProductionItem.__table__
    ])
    print("[Migration] Tables ensured successfully.")

    db = SessionLocal()
    try:
        # 1. Seed Sidebar Menu Item under "Quản lý sản xuất"
        prod_group = db.query(SystemSidebar).filter(
            SystemSidebar.title == "Quản lý sản xuất",
            SystemSidebar.parent_id == None
        ).first()

        if prod_group:
            existing_menu = db.query(SystemSidebar).filter(
                SystemSidebar.route_path == "/admin/daily-production"
            ).first()
            if not existing_menu:
                new_menu = SystemSidebar(
                    platform="Web",
                    parent_id=prod_group.id,
                    title="Hôm nay sản xuất gì",
                    route_path="/admin/daily-production",
                    icon="CalendarCheck",
                    sort_order=2,
                    is_active=True,
                    permission_key="plan"
                )
                db.add(new_menu)
                print("[Migration] Added 'Hôm nay sản xuất gì' (/admin/daily-production) to system_sidebars.")
            else:
                existing_menu.title = "Hôm nay sản xuất gì"
                existing_menu.is_active = True
                print("[Migration] Updated 'Hôm nay sản xuất gì' in system_sidebars.")

        # 2. Seed Screen Metadata (SX03.1)
        existing_screen = db.query(SystemScreen).filter(
            SystemScreen.route_path == "/admin/daily-production"
        ).first()
        if not existing_screen:
            new_screen = SystemScreen(
                platform="Web",
                route_path="/admin/daily-production",
                backend_path="/api/v1/daily-production",
                default_code="SX03.1",
                current_code="SX03.1",
                title="Hôm nay sản xuất gì",
                subtitle="Gộp Cont tùy chọn & Custom chi tiết sản xuất trong ngày",
                is_active=True,
                status="Hoạt động"
            )
            db.add(new_screen)
            print("[Migration] Added screen metadata SX03.1 for /admin/daily-production.")

        db.commit()

        # 3. Seed 1 bảng mẫu cho ngày hôm nay nếu bảng đang trống
        if db.query(DailyProductionBatch).count() == 0:
            today_str = get_vietnam_time().strftime("%Y-%m-%d")
            sample_req = PreviewMergeRequest(
                order_codes=["APT-0074-01", "APT-0074-02", "APT-0084-04"],
                section_name="MẶT TIỀN",
                factory="NM2"
            )
            preview = preview_merged_containers_bom(db, sample_req)
            if preview and preview.get("items"):
                batch_payload = DailyProductionBatchCreate(
                    plan_date=today_str,
                    factory="NM2",
                    section_name="MẶT TIỀN",
                    batch_title=preview["batch_title"] or "APT-0074-01~02; APT-0084-04",
                    line_color_summary=preview["line_color_summary"] or "Dòng R/WHT/GRY/MNB-NM2",
                    selected_orders=preview["selected_orders"],
                    status="PUBLISHED",
                    notes="Bảng liệt kê chi tiết Mặt tiền chạy trong ngày",
                    created_by="Admin",
                    items=[DailyProductionItemPayload(**it) for it in preview["items"]]
                )
                created = create_daily_batch(db, batch_payload)
                print(f"[Migration] Seeded initial daily production batch: {created['batch_code']} ({created['batch_title']}) with {len(created['items'])} rows.")

        print("[Migration] Completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"[Migration Error] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()
