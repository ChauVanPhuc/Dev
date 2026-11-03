"""
Migration: Tạo bảng pallet_check_containers và pallet_check_records (chuẩn theo commit fc67dd9)
"""
from sqlalchemy import text
from config.database import SessionLocal

def run():
    print("[MIGRATION] Kiểm tra và tạo bảng pallet_check_containers & pallet_check_records...")
    db = SessionLocal()
    try:
        sql = text("""
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pallet_check_containers')
        BEGIN
            CREATE TABLE pallet_check_containers (
                id VARCHAR(100) PRIMARY KEY,
                name NVARCHAR(255) NOT NULL,
                inspector NVARCHAR(100) NULL,
                status VARCHAR(50) DEFAULT 'completed',
                is_valid BIT DEFAULT 1,
                total_pallets INT DEFAULT 0,
                total_boxes INT DEFAULT 0,
                total_scans INT DEFAULT 0,
                audit_result NVARCHAR(MAX) NULL,
                completed_at NVARCHAR(100) NULL,
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME DEFAULT GETDATE()
            );
            PRINT N'Bảng pallet_check_containers đã được tạo thành công.';
        END

        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pallet_check_records')
        BEGIN
            CREATE TABLE pallet_check_records (
                id VARCHAR(100) PRIMARY KEY,
                container_id VARCHAR(100) NOT NULL FOREIGN KEY REFERENCES pallet_check_containers(id) ON DELETE CASCADE,
                pallet_index INT NOT NULL,
                status VARCHAR(50) DEFAULT 'pass',
                has_roof BIT DEFAULT 0,
                standing_standard_sku NVARCHAR(100) NULL,
                standing_standard_lpn NVARCHAR(100) NULL,
                standing_skus_count INT DEFAULT 0,
                standing_lpns_count INT DEFAULT 0,
                standing_data NVARCHAR(MAX) NULL,
                roof_standard_sku NVARCHAR(100) NULL,
                roof_standard_lpn NVARCHAR(100) NULL,
                roof_skus_count INT DEFAULT 0,
                roof_lpns_count INT DEFAULT 0,
                roof_data NVARCHAR(MAX) NULL,
                total_scans INT DEFAULT 0,
                timestamp_str NVARCHAR(100) NULL,
                created_at DATETIME DEFAULT GETDATE()
            );
            CREATE INDEX idx_pallet_check_records_container_id ON pallet_check_records(container_id);
            PRINT N'Bảng pallet_check_records đã được tạo thành công.';
        END
        """)
        db.execute(sql)
        db.commit()
        print("[MIGRATION] Hoàn thành tạo bảng pallet_check_containers & pallet_check_records thành công!")
    except Exception as e:
        db.rollback()
        print(f"[MIGRATION ERROR] Lỗi khi tạo bảng pallet_check: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run()

