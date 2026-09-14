# -*- coding: utf-8 -*-
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import create_engine, text
from config.settings import settings

def add_assessment_sidebar():
    """Tự động thêm mục 'Bài kiểm tra' vào Sidebar cho phân hệ Web"""
    try:
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)
        with engine.begin() as conn:
            # 1. Tìm nhóm Quản lý nhân sự hoặc Người dùng
            parent = conn.execute(text("""
                SELECT id FROM system_sidebars 
                WHERE platform = 'Web' AND parent_id IS NULL AND (title LIKE N'%Nhân sự%' OR title LIKE N'%Người dùng%')
            """)).fetchone()

            parent_id = parent[0] if parent else None

            # 2. Kiểm tra nếu mục 'Bài kiểm tra' đã tồn tại
            existing = conn.execute(text("""
                SELECT id FROM system_sidebars 
                WHERE platform = 'Web' AND route_path = '/admin/hr/assessments'
            """)).fetchone()

            if not existing:
                conn.execute(text("""
                    INSERT INTO system_sidebars (title, icon, route_path, parent_id, platform, permission_key, is_active, sort_order)
                    VALUES (N'Bài kiểm tra', 'HelpCircle', '/admin/hr/assessments', :parent_id, 'Web', 'users', 1, 99)
                """), {'parent_id': parent_id})
                print("[MIGRATION] Added Assessment sidebar item to Web menu.")
            else:
                conn.execute(text("""
                    UPDATE system_sidebars 
                    SET is_active = 1, title = N'Bài kiểm tra', icon = 'HelpCircle', sort_order = 99
                    WHERE id = :id
                """), {'id': existing[0]})
                print("[MIGRATION] Updated Assessment sidebar item in Web menu.")

    except Exception as e:
        print(f"[MIGRATION WARNING] add_assessment_sidebar error: {str(e).encode('ascii', 'ignore').decode('ascii')}")

if __name__ == "__main__":
    add_assessment_sidebar()
