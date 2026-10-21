# -*- coding: utf-8 -*-
import sys
import os

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
CLAIM_BACKEND = os.path.join(PROJECT_ROOT, "Claim", "BackEnd")
BACKEND_DIR = os.path.join(PROJECT_ROOT, "BackEnd")

for p in [PROJECT_ROOT, CLAIM_BACKEND, BACKEND_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

from sqlalchemy import text
try:
    from app.core.database import engine
except ImportError:
    from config.database import engine


def run_migration():
    print("=== BAT DAU MIGRATION CSDL CHO HE THONG ZALO NOTIFICATION ===")
    
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # 1. Tạo bảng lpn_zalo_configs nếu chưa có
            conn.execute(text("""
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'lpn_zalo_configs')
                BEGIN
                    CREATE TABLE lpn_zalo_configs (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        bot_phone VARCHAR(20) NULL,
                        bot_name NVARCHAR(100) NULL,
                        imei VARCHAR(255) NULL,
                        session_cookies NVARCHAR(MAX) NULL,
                        secret_key VARCHAR(255) NULL,
                        default_recipient_phone VARCHAR(20) NULL,
                        fallback_manager_phones NVARCHAR(MAX) NULL,
                        is_auto_send_enabled BIT DEFAULT 1,
                        is_connected BIT DEFAULT 0,
                        last_connected_at DATETIME NULL,
                        last_checked_at DATETIME NULL,
                        updated_at DATETIME DEFAULT GETDATE()
                    );
                    PRINT 'Da tao bang lpn_zalo_configs thanh cong.';
                END
                ELSE
                BEGIN
                    PRINT 'Bang lpn_zalo_configs da ton tai.';
                END
            """))

            # 2. Khởi tạo 1 dòng cấu hình mặc định nếu bảng đang rỗng
            conn.execute(text("""
                IF NOT EXISTS (SELECT 1 FROM lpn_zalo_configs)
                BEGIN
                    INSERT INTO lpn_zalo_configs (
                        bot_phone, bot_name, imei, session_cookies, 
                        default_recipient_phone, fallback_manager_phones, 
                        is_auto_send_enabled, is_connected, updated_at
                    ) VALUES (
                        '0888187044', N'SmartFlow Zalo Bot', '', '{}',
                        '0981206221', '["0981206221", "0888187044"]',
                        1, 0, GETDATE()
                    );
                    PRINT 'Da khoi tao ban ghi cau hinh mac dinh trong lpn_zalo_configs.';
                END
            """))

            # 3. Tạo bảng lpn_zalo_logs nếu chưa có
            conn.execute(text("""
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'lpn_zalo_logs')
                BEGIN
                    CREATE TABLE lpn_zalo_logs (
                        id BIGINT IDENTITY(1,1) PRIMARY KEY,
                        container_id BIGINT NULL,
                        container_number VARCHAR(100) NULL,
                        recipient_phone VARCHAR(20) NOT NULL,
                        recipient_zalo_id VARCHAR(100) NULL,
                        recipient_name NVARCHAR(100) NULL,
                        message_content NVARCHAR(MAX) NOT NULL,
                        status VARCHAR(30) DEFAULT 'PENDING', -- SUCCESS, FAILED, FALLBACK_SENT
                        error_reason NVARCHAR(500) NULL,
                        sent_at DATETIME DEFAULT GETDATE(),
                        FOREIGN KEY (container_id) REFERENCES lpn_containers(id) ON DELETE SET NULL
                    );
                    CREATE INDEX idx_lpn_zalo_logs_container ON lpn_zalo_logs(container_number);
                    CREATE INDEX idx_lpn_zalo_logs_phone ON lpn_zalo_logs(recipient_phone);
                    PRINT 'Da tao bang lpn_zalo_logs thanh cong.';
                END
                ELSE
                BEGIN
                    PRINT 'Bang lpn_zalo_logs da ton tai.';
                END
            """))

            # 4. Thêm các cột vào lpn_containers nếu chưa có
            conn.execute(text("""
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lpn_containers' AND COLUMN_NAME = 'operator_phone')
                BEGIN
                    ALTER TABLE lpn_containers ADD operator_phone VARCHAR(50) NULL;
                    PRINT 'Da them cot operator_phone vao lpn_containers.';
                END

                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lpn_containers' AND COLUMN_NAME = 'zalo_notify_status')
                BEGIN
                    ALTER TABLE lpn_containers ADD zalo_notify_status VARCHAR(50) DEFAULT 'PENDING';
                    PRINT 'Da them cot zalo_notify_status vao lpn_containers.';
                END

                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'lpn_containers' AND COLUMN_NAME = 'zalo_notified_at')
                BEGIN
                    ALTER TABLE lpn_containers ADD zalo_notified_at DATETIME NULL;
                    PRINT 'Da them cot zalo_notified_at vao lpn_containers.';
                END
            """))

            trans.commit()
            print("=== MIGRATION HOAN TAT XUAT SAC ===")
        except Exception as e:
            trans.rollback()
            print(f"[ERROR] Migration that bai: {e}")
            raise e

if __name__ == "__main__":
    run_migration()
