import sys
import os
import codecs
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from config.database import SessionLocal
from sqlalchemy import text

def run():
    db = SessionLocal()
    try:
        print("=== 1. CẬP NHẬT DAILY_INSPECTION_RECORDS CỦA BỘ PHẬN SẢN XUẤT VỀ BỘ PHẬN QLCL ===")
        
        # Danh sách ID công nhân SX: 44, 45, 46, 47, 48, 49
        rows = db.execute(text("SELECT id, stage_name, inspector_id FROM daily_inspection_records WHERE inspector_id IN (44, 45, 46, 47, 48, 49)")).fetchall()
        print(f"Tìm thấy {len(rows)} bản ghi daily_inspection_records cần chuyển đổi:")

        updated_count = 0
        for r in rows:
            rec_id = r[0]
            stage_str = str(r[1] or '').strip()
            
            factory = 1
            if '1' in stage_str: factory = 1
            elif '2' in stage_str: factory = 2
            elif '3' in stage_str: factory = 3
            
            is_inbound = any(k in stage_str for k in ['Nhập Kho', 'Đầu Vào', 'IQC'])
            is_shaping = any(k in stage_str for k in ['Định Hình', 'Lắp Ráp', 'Tạo Phôi', 'Mộc', 'Phôi'])
            
            new_inspector_id = 28 # Default Hà Đình Thành
            if is_inbound:
                new_inspector_id = 27 # Đặng Quý Hải (IQC)
            elif factory == 1:
                new_inspector_id = 28 if is_shaping else 32 # 28: Hà Đình Thành (PQC1), 32: Phan Thị Lương (PQC2)
            elif factory == 2:
                new_inspector_id = 30 if is_shaping else 34 # 30: Huỳnh Hoàng Sơn (PQC1), 34: Phạm Thị Mai (PQC2)
            else:
                new_inspector_id = 31 if is_shaping else 35 # 31: Hồ Sỹ Khẩn (PQC1), 35: Nguyễn Thị Mỹ Kim (PQC2)
                
            db.execute(text(f"UPDATE daily_inspection_records SET inspector_id = :insp_id WHERE id = :rec_id"), {
                "insp_id": new_inspector_id,
                "rec_id": rec_id
            })
            updated_count += 1

        print(f"-> Đã cập nhật thành công {updated_count} bản ghi daily_inspection_records về QLCL!")

        # 2. Cập nhật stage_inspections nếu có tên công nhân
        worker_names = [
            'Nguyễn Thị Thu Thủy', 'thuy.ntt',
            'Bùi Thị Tình', 'tinh.bt',
            'Đỗ Thị Kim Hiền', 'hien.dtk',
            'Huỳnh Thị Diễm Trinh', 'trinh.htd',
            'Bùi Hồng Hạnh', 'hanh.bh',
            'Huỳnh Thị Diễm Lài', 'lai.htd'
        ]
        for wname in worker_names:
            db.execute(text("UPDATE stage_inspections SET inspector_name = 'Hà Đình Thành' WHERE inspector_name = :wname"), {"wname": wname})
            db.execute(text("UPDATE input_inspections SET inspector_name = 'Đặng Quý Hải' WHERE inspector_name = :wname"), {"wname": wname})

        db.commit()
        print("\n=> Hoàn tất 100% việc chuyển đổi Người kiểm QC sang đúng nhân sự thuộc QLCL!")

    except Exception as e:
        db.rollback()
        print(f"Lỗi: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run()
