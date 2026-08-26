import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('.')
from config.database import SessionLocal, engine
from sqlalchemy import text
import json

db = SessionLocal()

print("=" * 70)
print("KIỂM TRA TOÀN DIỆN DỮ LIỆU THÁNG 8: PHIẾU BÀN GIAO & PHIẾU KIỂM TRA")
print("=" * 70)

with engine.connect() as conn:
    tables = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).fetchall()
    all_tables = [t[0] for t in tables]

# Tìm các bảng liên quan đến bàn giao & kiểm tra
target_tables = [
    t for t in all_tables
    if any(k in t.lower() for k in [
        'handover', 'delivery', 'transfer', 'ban_giao', 'bangiao',
        'inspect', 'quality', 'defect', 'check', 'kiem_tra', 'kiemtra',
        'capa', 'violation', 'record'
    ])
]

print(f"Tìm thấy {len(target_tables)} bảng liên quan:")
for t in target_tables:
    print(f" - {t}")

print("\n" + "-" * 70)
print("KẾT QUẢ QUÉT CHI TIẾT TỪNG BẢNG:")
print("-" * 70)

total_found_august = 0

for t in target_tables:
    try:
        with engine.connect() as conn:
            cols_res = conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='{t}'")).fetchall()
            cols = [c[0] for c in cols_res]
            date_cols = [c for c in cols if any(k in c.lower() for k in ['date', 'time', 'created', 'at', 'ngay'])]
            
            total_count = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
            
            if total_count == 0:
                print(f"⚪ Bảng '{t}': 0 bản ghi")
                continue
                
            # Lấy tất cả bản ghi để kiểm tra ngày tháng
            rows = conn.execute(text(f"SELECT * FROM {t}")).mappings().fetchall()
            
            aug_rows = []
            for row in rows:
                row_dict = dict(row)
                # Kiểm tra các trường ngày
                is_aug = False
                matched_date = None
                for dc in date_cols:
                    val = str(row_dict.get(dc, ''))
                    if '-08-' in val or '/08/' in val or '2026-08' in val or '2025-08' in val or '2024-08' in val:
                        is_aug = True
                        matched_date = f"{dc}={val}"
                        break
                
                if is_aug:
                    aug_rows.append((row_dict, matched_date))
            
            if aug_rows:
                total_found_august += len(aug_rows)
                print(f"\n🟢 BẢNG '{t}' (Tổng: {total_count} bản ghi | THÁNG 8: {len(aug_rows)} bản ghi):")
                for idx, (r, m_date) in enumerate(aug_rows):
                    summary = {k: v for k, v in r.items() if any(sub in k.lower() for sub in ['id', 'code', 'name', 'title', 'status', 'type', 'product', 'creator', 'user', 'sender', 'receiver', 'note'])}
                    print(f"   [{idx+1}] Ngày: {m_date}")
                    print(f"       Chi tiết: {summary}")
            else:
                print(f"🔵 Bảng '{t}': Có {total_count} bản ghi, nhưng KHÔNG có bản ghi nào trong tháng 8.")
                
    except Exception as e:
        print(f"❌ Lỗi quét bảng '{t}': {e}")

print("\n" + "=" * 70)
print(f"TỔNG KẾT: Tìm thấy tổng cộng {total_found_august} bản ghi thuộc Tháng 8.")
print("=" * 70)

db.close()
