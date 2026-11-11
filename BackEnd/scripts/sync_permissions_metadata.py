"""
Script đồng bộ toàn bộ Menu Sidebar và Danh mục Màn hình (System Screens)
phục vụ phân quyền đầy đủ cho cả Web và Mobile.
"""
import sys
import os

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import SessionLocal
from app import models
from modules.system.models.system_sidebar import SystemSidebar
from modules.system.models.system_screen import SystemScreen

def run_sync():
    db = SessionLocal()
    try:
        print("=== BẮT ĐẦU ĐỒNG BỘ DỮ LIỆU PHÂN QUYỀN ===")

        # 1. Kích hoạt lại Quản lý chức vụ (ID 14)
        pos_item = db.query(SystemSidebar).filter(SystemSidebar.id == 14).first()
        if pos_item:
            pos_item.is_active = True
            print("✓ Đã kích hoạt lại: Quản lý chức vụ (ID 14)")

        # 2. Xóa hoặc tắt mục test rác (ID 89: /admin/purchase-order-items)
        test_item = db.query(SystemSidebar).filter(SystemSidebar.id == 89).first()
        if test_item:
            test_item.is_active = False
            print("✓ Đã vô hiệu hóa mục test: /admin/purchase-order-items (ID 89)")

        # 3. Thêm nhóm Crawl & Tích hợp (Web)
        crawl_group = db.query(SystemSidebar).filter(
            SystemSidebar.platform == 'Web',
            SystemSidebar.title == 'Crawl & Tích hợp',
            SystemSidebar.parent_id == None
        ).first()

        if not crawl_group:
            crawl_group = SystemSidebar(
                platform='Web',
                parent_id=None,
                title='Crawl & Tích hợp',
                route_path='#',
                icon='Globe',
                sort_order=90,
                is_active=True
            )
            db.add(crawl_group)
            db.flush()
            print(f"✓ Đã tạo nhóm mới: Crawl & Tích hợp (ID {crawl_group.id})")

        # Thêm các mục con của Crawl & Tích hợp
        lpn_crawler = db.query(SystemSidebar).filter(
            SystemSidebar.platform == 'Web',
            SystemSidebar.route_path == '/admin/lpn-crawler'
        ).first()
        if not lpn_crawler:
            db.add(SystemSidebar(
                platform='Web',
                parent_id=crawl_group.id,
                title='Crawl dữ liệu LPN',
                route_path='/admin/lpn-crawler',
                icon='Database',
                sort_order=1,
                is_active=True
            ))
            print("✓ Đã thêm: Crawl dữ liệu LPN (/admin/lpn-crawler)")
        else:
            lpn_crawler.parent_id = crawl_group.id
            lpn_crawler.is_active = True

        ai_train = db.query(SystemSidebar).filter(
            SystemSidebar.platform == 'Web',
            SystemSidebar.route_path == '/admin/ai-ocr-train'
        ).first()
        if not ai_train:
            db.add(SystemSidebar(
                platform='Web',
                parent_id=crawl_group.id,
                title='Train Hình ảnh',
                route_path='/admin/ai-ocr-train',
                icon='Cpu',
                sort_order=2,
                is_active=True
            ))
            print("✓ Đã thêm: Train Hình ảnh (/admin/ai-ocr-train)")
        else:
            ai_train.parent_id = crawl_group.id
            ai_train.is_active = True

        pallet_check = db.query(SystemSidebar).filter(
            SystemSidebar.platform == 'Web',
            SystemSidebar.route_path == '/admin/pallet-check'
        ).first()
        if not pallet_check:
            db.add(SystemSidebar(
                platform='Web',
                parent_id=crawl_group.id,
                title='Quét Cont',
                route_path='/admin/pallet-check',
                icon='Boxes',
                sort_order=3,
                is_active=True
            ))
            print("✓ Đã thêm: Quét Cont (/admin/pallet-check)")
        else:
            pallet_check.parent_id = crawl_group.id
            pallet_check.title = 'Quét Cont'
            pallet_check.is_active = True

        # Đồng bộ SystemScreen cho nhóm Crawl & Tích hợp (CW01, CW02, CW03)
        cw_screens = [
            ('CW01', '/admin/lpn-crawler', '/api/v1/lpn-crawler', 'Crawl dữ liệu LPN', 'Công cụ crawler dữ liệu LPN'),
            ('CW02', '/admin/ai-ocr-train', '/api/v1/lpn-crawler/ai-ocr', 'Train Hình ảnh', 'Huấn luyện & kiểm thử mô hình AI OCR đọc nhãn'),
            ('CW03', '/admin/pallet-check', '/api/v1/pallet-check/containers', 'Quét Cont', 'Công cụ quản lý & kiểm định dữ liệu quét Container')
        ]
        for code, r_path, b_path, s_title, s_sub in cw_screens:
            scr = db.query(SystemScreen).filter(
                SystemScreen.platform == 'Web',
                SystemScreen.route_path == r_path
            ).first()
            if not scr:
                db.add(SystemScreen(
                    platform='Web',
                    route_path=r_path,
                    backend_path=b_path,
                    default_code=code,
                    current_code=code,
                    title=s_title,
                    subtitle=s_sub,
                    is_active=True
                ))
                print(f"✓ Đã thêm SystemScreen {code}: {s_title} ({r_path})")
            else:
                scr.default_code = code
                scr.current_code = code
                scr.title = s_title
                scr.subtitle = s_sub
                scr.backend_path = b_path
                scr.is_active = True

        # 4. Thêm các mục Web còn thiếu
        # Quản lý kinh doanh (ID 38)
        kd_group = db.query(SystemSidebar).filter(SystemSidebar.id == 38).first()
        if kd_group:
            orders_item = db.query(SystemSidebar).filter(
                SystemSidebar.platform == 'Web',
                SystemSidebar.route_path == '/admin/orders'
            ).first()
            if not orders_item:
                db.add(SystemSidebar(
                    platform='Web',
                    parent_id=38,
                    title='Danh sách đơn hàng bán',
                    route_path='/admin/orders',
                    icon='ShoppingCart',
                    sort_order=1,
                    is_active=True
                ))
                print("✓ Đã thêm vào Quản lý kinh doanh: Danh sách đơn hàng bán (/admin/orders)")

            cust_item = db.query(SystemSidebar).filter(
                SystemSidebar.platform == 'Web',
                SystemSidebar.route_path == '/admin/customers'
            ).first()
            if not cust_item:
                db.add(SystemSidebar(
                    platform='Web',
                    parent_id=38,
                    title='Quản lý khách hàng',
                    route_path='/admin/customers',
                    icon='Users',
                    sort_order=2,
                    is_active=True
                ))
                print("✓ Đã thêm vào Quản lý kinh doanh: Quản lý khách hàng (/admin/customers)")

        # Quản lý chất lượng
        qc_group = db.query(SystemSidebar).filter(
            SystemSidebar.platform == 'Web',
            SystemSidebar.title.in_(['Quản lý chất lượng', 'Module chất lượng']),
            SystemSidebar.parent_id == None
        ).first()
        if qc_group:
            claim_dash = db.query(SystemSidebar).filter(
                SystemSidebar.platform == 'Web',
                SystemSidebar.route_path == '/admin/claim-dashboard'
            ).first()
            if not claim_dash:
                db.add(SystemSidebar(
                    platform='Web',
                    parent_id=qc_group.id,
                    title='Dashboard Thống Kê khiếu nại',
                    route_path='/admin/claim-dashboard',
                    icon='LayoutDashboard',
                    sort_order=1,
                    is_active=True
                ))
                print("✓ Đã thêm vào Quản lý chất lượng: Dashboard Thống Kê khiếu nại (/admin/claim-dashboard)")

            quality_home = db.query(SystemSidebar).filter(
                SystemSidebar.platform == 'Web',
                SystemSidebar.route_path == '/admin/quality',
                SystemSidebar.parent_id == qc_group.id
            ).first()
            if not quality_home:
                db.add(SystemSidebar(
                    platform='Web',
                    parent_id=qc_group.id,
                    title='Tổng quan chất lượng',
                    route_path='/admin/quality',
                    icon='ShieldCheck',
                    sort_order=0,
                    is_active=True
                ))
                print("✓ Đã thêm vào Quản lý chất lượng: Tổng quan chất lượng (/admin/quality)")
            else:
                quality_home.parent_id = qc_group.id
                quality_home.is_active = True

        # Quản lý KPI
        kpi_group = db.query(SystemSidebar).filter(
            SystemSidebar.platform == 'Web',
            SystemSidebar.title == 'Quản lý KPI',
            SystemSidebar.parent_id == None
        ).first()
        if kpi_group:
            viol_item = db.query(SystemSidebar).filter(
                SystemSidebar.platform == 'Web',
                SystemSidebar.route_path == '/admin/violations'
            ).first()
            if not viol_item:
                db.add(SystemSidebar(
                    platform='Web',
                    parent_id=kpi_group.id,
                    title='Lịch sử vi phạm',
                    route_path='/admin/violations',
                    icon='AlertTriangle',
                    sort_order=6,
                    is_active=True
                ))
                print("✓ Đã thêm vào Quản lý KPI: Lịch sử vi phạm (/admin/violations)")

            kpi_pers = db.query(SystemSidebar).filter(
                SystemSidebar.platform == 'Web',
                SystemSidebar.route_path == '/admin/kpi/personnel'
            ).first()
            if not kpi_pers:
                db.add(SystemSidebar(
                    platform='Web',
                    parent_id=kpi_group.id,
                    title='Sơ đồ nhân sự KPI',
                    route_path='/admin/kpi/personnel',
                    icon='Users',
                    sort_order=7,
                    is_active=True
                ))
                print("✓ Đã thêm vào Quản lý KPI: Sơ đồ nhân sự KPI (/admin/kpi/personnel)")

            kpi_qual = db.query(SystemSidebar).filter(
                SystemSidebar.platform == 'Web',
                SystemSidebar.route_path == '/admin/kpi/quality-profiles'
            ).first()
            if not kpi_qual:
                db.add(SystemSidebar(
                    platform='Web',
                    parent_id=kpi_group.id,
                    title='Hồ sơ chất lượng KPI',
                    route_path='/admin/kpi/quality-profiles',
                    icon='ShieldCheck',
                    sort_order=8,
                    is_active=True
                ))
                print("✓ Đã thêm vào Quản lý KPI: Hồ sơ chất lượng KPI (/admin/kpi/quality-profiles)")

        # Quản lý kỹ thuật
        tech_group = db.query(SystemSidebar).filter(
            SystemSidebar.platform == 'Web',
            SystemSidebar.title == 'Quản lý kỹ thuật',
            SystemSidebar.parent_id == None
        ).first()
        if tech_group:
            tech_std = db.query(SystemSidebar).filter(
                SystemSidebar.platform == 'Web',
                SystemSidebar.route_path == '/admin/technical-standards'
            ).first()
            if not tech_std:
                db.add(SystemSidebar(
                    platform='Web',
                    parent_id=tech_group.id,
                    title='Tiêu chuẩn kỹ thuật',
                    route_path='/admin/technical-standards',
                    icon='FileCheck',
                    sort_order=3,
                    is_active=True
                ))
                print("✓ Đã thêm vào Quản lý kỹ thuật: Tiêu chuẩn kỹ thuật (/admin/technical-standards)")

            tech_dash = db.query(SystemSidebar).filter(
                SystemSidebar.platform == 'Web',
                SystemSidebar.route_path == '/admin/technical-dashboard'
            ).first()
            if not tech_dash:
                db.add(SystemSidebar(
                    platform='Web',
                    parent_id=tech_group.id,
                    title='Dashboard kỹ thuật',
                    route_path='/admin/technical-dashboard',
                    icon='BarChart2',
                    sort_order=4,
                    is_active=True
                ))
                print("✓ Đã thêm vào Quản lý kỹ thuật: Dashboard kỹ thuật (/admin/technical-dashboard)")

        # 5. Bổ sung các màn hình Mobile đang thiếu trên Sidebar
        m_init_group = db.query(SystemSidebar).filter(
            SystemSidebar.platform == 'Mobile',
            SystemSidebar.title == 'Khởi tạo phiếu',
            SystemSidebar.parent_id == None
        ).first()
        m_init_group_id = m_init_group.id if m_init_group else None

        if m_init_group_id:
            m_pallet_v1 = db.query(SystemSidebar).filter(
                SystemSidebar.platform == 'Mobile',
                SystemSidebar.route_path == '/pallet-check-v1'
            ).first()
            if not m_pallet_v1:
                db.add(SystemSidebar(
                    platform='Mobile',
                    parent_id=m_init_group_id,
                    title='Kiểm tra Pallet v1',
                    route_path='/pallet-check-v1',
                    icon='Barcode',
                    sort_order=1,
                    is_active=True
                ))
                print("✓ Đã thêm vào Mobile Khởi tạo phiếu: Kiểm tra Pallet v1 (/pallet-check-v1)")

            m_pallet_ai = db.query(SystemSidebar).filter(
                SystemSidebar.platform == 'Mobile',
                SystemSidebar.route_path == '/pallet-check'
            ).first()
            if not m_pallet_ai:
                db.add(SystemSidebar(
                    platform='Mobile',
                    parent_id=m_init_group_id,
                    title='Kiểm tra Pallet (AI)',
                    route_path='/pallet-check',
                    icon='ScanLine',
                    sort_order=2,
                    is_active=True
                ))
                print("✓ Đã thêm vào Mobile Khởi tạo phiếu: Kiểm tra Pallet AI (/pallet-check)")

            m_box = db.query(SystemSidebar).filter(
                SystemSidebar.platform == 'Mobile',
                SystemSidebar.route_path == '/cabinet-box-check'
            ).first()
            if not m_box:
                db.add(SystemSidebar(
                    platform='Mobile',
                    parent_id=m_init_group_id,
                    title='Kiểm tra Tủ thùng',
                    route_path='/cabinet-box-check',
                    icon='Boxes',
                    sort_order=3,
                    is_active=True
                ))
                print("✓ Đã thêm vào Mobile Khởi tạo phiếu: Kiểm tra Tủ thùng (/cabinet-box-check)")

            m_backup_qr = db.query(SystemSidebar).filter(
                SystemSidebar.platform == 'Mobile',
                SystemSidebar.route_path == '/production_v2/backup-qr'
            ).first()
            if not m_backup_qr:
                db.add(SystemSidebar(
                    platform='Mobile',
                    parent_id=m_init_group_id,
                    title='Quản lý mã QR tạm',
                    route_path='/production_v2/backup-qr',
                    icon='QrCode',
                    sort_order=8,
                    is_active=True
                ))
                print("✓ Đã thêm vào Mobile Khởi tạo phiếu: Quản lý mã QR tạm (/production_v2/backup-qr)")

        # Nhóm "QC & Chất lượng" trên Mobile
        # Tạo nhóm nếu chưa có
        m_qc_root = db.query(SystemSidebar).filter(
            SystemSidebar.platform == 'Mobile',
            SystemSidebar.title == 'QC & Kiểm tra chất lượng',
            SystemSidebar.parent_id == None
        ).first()
        if not m_qc_root:
            m_qc_root = SystemSidebar(
                platform='Mobile',
                parent_id=None,
                title='QC & Kiểm tra chất lượng',
                route_path='#',
                icon='ShieldCheck',
                sort_order=4,
                is_active=True
            )
            db.add(m_qc_root)
            db.flush()
            print(f"✓ Đã tạo nhóm Mobile: QC & Kiểm tra chất lượng (ID {m_qc_root.id})")

        mobile_qc_items = [
            ("Kiểm tra hàng ngày", "/inspection-daily", "CalendarCheck", 1),
            ("Kiểm tra sản phẩm công đoạn", "/inspection-stage", "CheckSquare", 2),
            ("Kiểm tra mẫu đầu tiên", "/inspection-first-article", "Award", 3),
            ("Kiểm tra độ ẩm", "/inspection-stage-moisture", "Droplets", 4),
            ("Kiểm tra bám dính", "/inspection-stage-adhesion", "Layers", 5),
            ("Kiểm tra quy trình", "/inspection-stage-process", "FileText", 6),
            ("Nhật ký kiểm QC & Sự cố", "/logs", "AlertCircle", 7),
            ("Báo cáo CTQ / SOS", "/ctq-sos", "AlertOctagon", 8),
            ("Cảnh báo lỗi", "/warnings", "AlertTriangle", 9),
            ("Góp ý cải tiến", "/feedback", "MessageSquare", 10),
            ("Nhân sự Quản lý Chất lượng", "/kpi-quality-employees", "UserCheck", 11),
        ]
        for title, route, icon, s_order in mobile_qc_items:
            it = db.query(SystemSidebar).filter(
                SystemSidebar.platform == 'Mobile',
                SystemSidebar.route_path == route
            ).first()
            if not it:
                db.add(SystemSidebar(
                    platform='Mobile',
                    parent_id=m_qc_root.id,
                    title=title,
                    route_path=route,
                    icon=icon,
                    sort_order=s_order,
                    is_active=True
                ))
                print(f"✓ Đã thêm vào Mobile QC: {title} ({route})")
            else:
                it.is_active = True

        # Nhóm "Bàn giao & Thiết bị" trên Mobile
        m_delivery_root = db.query(SystemSidebar).filter(
            SystemSidebar.platform == 'Mobile',
            SystemSidebar.title == 'Bàn giao & In ấn',
            SystemSidebar.parent_id == None
        ).first()
        if not m_delivery_root:
            m_delivery_root = SystemSidebar(
                platform='Mobile',
                parent_id=None,
                title='Bàn giao & In ấn',
                route_path='#',
                icon='Printer',
                sort_order=6,
                is_active=True
            )
            db.add(m_delivery_root)
            db.flush()
            print(f"✓ Đã tạo nhóm Mobile: Bàn giao & In ấn (ID {m_delivery_root.id})")

        mobile_delivery_items = [
            ("Thông tin bàn giao", "/delivery-info", "FileText", 1),
            ("Tạo phiếu bàn giao", "/delivery-create", "PlusCircle", 2),
            ("In tem nhiệt", "/thermal-print", "Printer", 3),
            ("Danh sách thiết bị máy móc", "/equipment-list", "Wrench", 4),
            ("Theo dõi KPI cá nhân/tổ", "/kpi", "TrendingUp", 5),
        ]
        for title, route, icon, s_order in mobile_delivery_items:
            it = db.query(SystemSidebar).filter(
                SystemSidebar.platform == 'Mobile',
                SystemSidebar.route_path == route
            ).first()
            if not it:
                db.add(SystemSidebar(
                    platform='Mobile',
                    parent_id=m_delivery_root.id,
                    title=title,
                    route_path=route,
                    icon=icon,
                    sort_order=s_order,
                    is_active=True
                ))
                print(f"✓ Đã thêm vào Mobile Bàn giao: {title} ({route})")
            else:
                it.is_active = True

        # Commit tất cả thay đổi
        db.commit()
        print("=== ĐỒNG BỘ CƠ SỞ DỮ LIỆU HOÀN TẤT THÀNH CÔNG ===")
    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi khi đồng bộ: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_sync()
