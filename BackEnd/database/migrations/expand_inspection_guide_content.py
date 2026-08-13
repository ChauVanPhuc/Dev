"""
Mở rộng cột title/content cho inspection_guide_steps và inspection_guide_sub_steps
để tránh lỗi 422 khi lưu bước dài.
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import get_db


def migrate():
    db = next(get_db())
    try:
        db.execute(text("""
            ALTER TABLE inspection_guide_steps
            ALTER COLUMN title NVARCHAR(500) NOT NULL;
        """))
        db.execute(text("""
            ALTER TABLE inspection_guide_steps
            ALTER COLUMN content NVARCHAR(MAX) NULL;
        """))
        db.execute(text("""
            ALTER TABLE inspection_guide_sub_steps
            ALTER COLUMN title NVARCHAR(500) NULL;
        """))
        db.execute(text("""
            ALTER TABLE inspection_guide_sub_steps
            ALTER COLUMN content NVARCHAR(MAX) NULL;
        """))
        db.commit()
        print("[OK] Mở rộng cột title/content cho inspection_guide_steps/sub_steps.")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
