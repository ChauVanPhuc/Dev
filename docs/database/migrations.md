# Database Migrations

Tài liệu này hướng dẫn cách thực hiện database migrations trong SmartFlow v2.

---

## 📋 Mục lục (Table of Contents)

1. [Tổng quan](#-tổng-quánverview)
2. [Migration Strategy](#-migration-strategy)
3. [Tạo Migration Mới](#-tạo-migration-mới)
4. [Chạy Migration](#-chạy-migration)
5. [Auto-Migration](#-auto-migration)
6. [Rollback](#-rollback)

---

## 🎯 Tổng quan (Overview)

SmartFlow v2 sử dụng SQLAlchemy ORM với auto-migration để quản lý database schema changes.

---

## 🔄 Migration Strategy

### Auto-Migration

SmartFlow v2 sử dụng auto-migration trong `app/main.py`:

```python
@app.on_event("startup")
async def startup_event():
    # Auto-migrate for missing columns
    with engine.connect() as conn:
        try:
            conn.execute(text("""
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID('deliveries') 
                    AND name = 'part_name'
                )
                ALTER TABLE deliveries ADD part_name NVARCHAR(250) NULL
            """))
            conn.commit()
        except Exception as e:
            print(f"Migration error: {e}")
```

### Manual Migration

Đối với các thay đổi lớn, sử dụng manual migration files.

---

## 📝 Tạo Migration Mới

### 1. Tạo file migration

**Location:** `BackEnd/database/migrations/`

**Example:** `add_new_column.py`

```python
from sqlalchemy import text
from config.database import engine

def upgrade():
    """Add new column to table"""
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE deliveries 
            ADD new_column NVARCHAR(100) NULL
        """))
        conn.commit()
        print("Migration completed successfully")

def downgrade():
    """Remove column from table"""
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE deliveries 
            DROP COLUMN new_column
        """))
        conn.commit()
        print("Rollback completed successfully")
```

### 2. Chạy migration

```bash
cd BackEnd
python database/migrations/add_new_column.py
```

---

## 🚀 Chạy Migration

### Single Migration

```bash
python database/migrations/migration_file.py
```

### All Migrations

```bash
cd BackEnd/database/migrations
for file in *.py; do python "$file"; done
```

---

## ⚙️ Auto-Migration

### Thêm Auto-Migration

Trong `app/main.py`:

```python
@app.on_event("startup")
async def startup_event():
    with engine.connect() as conn:
        try:
            # Check if column exists
            if not db.has_column("deliveries", "new_column"):
                # Add column
                conn.execute(text("""
                    ALTER TABLE deliveries 
                    ADD new_column NVARCHAR(100) NULL
                """))
                conn.commit()
                print("Added 'new_column' to 'deliveries' table")
        except Exception as e:
            print(f"Migration error: {e}")
```

---

## ↩️ Rollback

### Manual Rollback

```python
def downgrade():
    """Rollback migration"""
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE deliveries 
            DROP COLUMN new_column
        """))
        conn.commit()
```

### Auto-Rollback

Không hỗ trợ auto-rollback, cần thực hiện manual rollback.

---

## 📋 Migration Checklist

Trước khi chạy migration:

- [ ] Backup database
- [ ] Test migration trên development
- [ ] Review migration script
- [ ] Document migration
- [ ] Schedule downtime (nếu cần)

---

**Last Updated:** 2026-06-03
