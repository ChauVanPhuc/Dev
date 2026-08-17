import sys
import io
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from sqlalchemy import text
from config.database import engine, SessionLocal

def migrate_and_seed_defect_categories():
    print("[MIGRATION] Checking/Creating defect_categories table...")
    with engine.begin() as conn:
        conn.execute(text("""
            IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'defect_categories')
            BEGIN
                CREATE TABLE defect_categories (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    code NVARCHAR(50) NOT NULL UNIQUE,
                    name NVARCHAR(250) NOT NULL,
                    prefix NVARCHAR(20) NOT NULL,
                    default_departments NVARCHAR(500) NULL,
                    description NVARCHAR(500) NULL,
                    color NVARCHAR(50) NULL,
                    order_index INT DEFAULT 0,
                    is_active BIT DEFAULT 1,
                    created_at DATETIME DEFAULT GETDATE(),
                    updated_at DATETIME DEFAULT GETDATE()
                );
                CREATE INDEX ix_defect_categories_code ON defect_categories(code);
                PRINT 'Created table defect_categories successfully.';
            END
        """))

    db = SessionLocal()
    try:
        initial_categories = [
            {
                "code": "visual",
                "name": "Ngoại quan",
                "prefix": "APP",
                "default_departments": '["Sơn - Đóng gói", "Xưởng Đóng Gói"]',
                "description": "Lỗi ngoại quan bề mặt sản phẩm",
                "order_index": 1,
                "is_active": True
            },
            {
                "code": "structure",
                "name": "Kết cấu",
                "prefix": "STR",
                "default_departments": '["Tổ Lắp Ráp", "Khâu Mộc"]',
                "description": "Lỗi lắp ráp, kết cấu khung mộc",
                "order_index": 2,
                "is_active": True
            },
            {
                "code": "material",
                "name": "Nguyên liệu",
                "prefix": "MAT",
                "default_departments": '["Khâu Pha Phôi", "Khâu Sơ Chế"]',
                "description": "Lỗi phôi gỗ, phụ kiện, vật tư",
                "order_index": 3,
                "is_active": True
            },
            {
                "code": "paint",
                "name": "Sơn & Bề mặt",
                "prefix": "PAI",
                "default_departments": '["Khâu Sơn Chuyền", "Khâu Sơn Lót"]',
                "description": "Lỗi màu sơn, độ bóng, màng sơn",
                "order_index": 4,
                "is_active": True
            },
            {
                "code": "other",
                "name": "Khác",
                "prefix": "OTH",
                "default_departments": '[]',
                "description": "Các loại lỗi khác",
                "order_index": 5,
                "is_active": True
            }
        ]

        for cat in initial_categories:
            exists = db.execute(
                text("SELECT 1 FROM defect_categories WHERE code = :code"),
                {"code": cat["code"]}
            ).fetchone()
            
            if not exists:
                db.execute(
                    text("""
                        INSERT INTO defect_categories (code, name, prefix, default_departments, description, order_index, is_active, created_at, updated_at)
                        VALUES (:code, :name, :prefix, :default_departments, :description, :order_index, :is_active, GETDATE(), GETDATE())
                    """),
                    cat
                )
                print(f"  + Seeded category: {cat['code']} -> {cat['prefix']}")
        db.commit()
        print("[MIGRATION] defect_categories migration & seed completed.")
    except Exception as e:
        db.rollback()
        print(f"[MIGRATION] Error seeding defect_categories: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_and_seed_defect_categories()

