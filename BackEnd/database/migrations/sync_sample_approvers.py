import os
import sys

# Thêm thư mục BackEnd vào sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import text
from config.database import engine

def sync_sample_approvers():
    with engine.begin() as conn:
        # Cấp công ty cho tài liệu
        conn.execute(text("""
            UPDATE iso_documents
            SET approver = CASE WHEN code LIKE '%SX%' THEN N'Lê Hoàng Long' ELSE N'Nguyễn Văn An' END,
                approver_bgd = N'Trần Đình Hùng'
            WHERE document_level = N'Cấp công ty'
        """))
        # Cấp phòng cho tài liệu
        conn.execute(text("""
            UPDATE iso_documents
            SET approver = CASE WHEN code LIKE '%SX%' THEN N'Lê Hoàng Long' ELSE N'Nguyễn Văn An' END,
                approver_bgd = NULL
            WHERE document_level = N'Cấp phòng' OR document_level IS NULL
        """))
        # Cấp công ty cho quy trình
        conn.execute(text("""
            UPDATE iso_processes
            SET approver = CASE WHEN code LIKE '%SX%' THEN N'Lê Hoàng Long' ELSE N'Nguyễn Văn An' END,
                approver_bgd = N'Trần Đình Hùng'
            WHERE document_level = N'Cấp công ty'
        """))
        # Cấp phòng cho quy trình
        conn.execute(text("""
            UPDATE iso_processes
            SET approver = CASE WHEN code LIKE '%SX%' THEN N'Lê Hoàng Long' ELSE N'Nguyễn Văn An' END,
                approver_bgd = NULL
            WHERE document_level = N'Cấp phòng' OR document_level IS NULL
        """))
        print("Updated approver and approver_bgd across iso_documents and iso_processes successfully!")

if __name__ == '__main__':
    sync_sample_approvers()
