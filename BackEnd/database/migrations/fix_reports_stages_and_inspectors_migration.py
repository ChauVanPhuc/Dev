import sys
import os
import codecs
import json
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from config.database import SessionLocal
from sqlalchemy import text

def get_exact_inspector(stage_name, row_id=0):
    stg = str(stage_name or '').strip()
    
    # 1. IQC - Nhập Kho / Đầu Vào & Tạo Phôi -> Đặng Quý Hải (ID: 27)
    if any(k in stg for k in ['Nhập Kho', 'Nhập kho', 'Đầu Vào', 'IQC', 'Tạo Phôi', 'Tạo phôi', 'Phôi']):
        return 27, 'Đặng Quý Hải'
    
    # 2. PHÂN XƯỞNG 1 (factory_id: 1)
    if '1' in stg:
        if any(k in stg for k in ['Định Hình', 'Định hình', 'Lắp Ráp', 'Lắp ráp', 'Mộc']):
            # PQC1 PX1: Hà Đình Thành (28) & Nguyễn Văn Tiến (36)
            return (28, 'Hà Đình Thành') if row_id % 2 == 0 else (36, 'Nguyễn Văn Tiến')
        elif any(k in stg for k in ['Sơn', 'Đóng Gói', 'Đóng gói']):
            # PQC2 PX1: Dương Văn Toàn (43)
            return 43, 'Dương Văn Toàn'
        elif any(k in stg for k in ['Lưu Kho', 'Final']):
            return 39, 'Đặng Minh Tuấn'

    # 3. PHÂN XƯỞNG 2 (factory_id: 2)
    elif '2' in stg:
        if any(k in stg for k in ['Định Hình', 'Định hình', 'Lắp Ráp', 'Lắp ráp', 'Mộc']):
            # PQC1 PX2: Hồ Sỹ Khẩn (31), Huỳnh Hoàng Sơn (30), Đậu Thị Tâm (29)
            pqc1_list = [(31, 'Hồ Sỹ Khẩn'), (30, 'Huỳnh Hoàng Sơn'), (29, 'Đậu Thị Tâm')]
            return pqc1_list[row_id % len(pqc1_list)]
        elif any(k in stg for k in ['Sơn', 'Đóng Gói', 'Đóng gói']):
            # PQC2 PX2: Phan Thị Lương (32), Phạm Thị Mai (34), Nguyễn Thị Mỹ Kim (35)
            pqc2_list = [(32, 'Phan Thị Lương'), (34, 'Phạm Thị Mai'), (35, 'Nguyễn Thị Mỹ Kim')]
            return pqc2_list[row_id % len(pqc2_list)]
        elif any(k in stg for k in ['Lưu Kho', 'Final']):
            return 39, 'Đặng Minh Tuấn'

    # 4. NHÀ MÁY 3 (factory_id: 3)
    elif '3' in stg:
        if any(k in stg for k in ['Định Hình', 'Định hình', 'Lắp Ráp', 'Lắp ráp', 'Mộc']):
            # NM3: Đỗ Hữu Phúc (Quản lý QC NM3 - ID: 33)
            return 33, 'Đỗ Hữu Phúc'
        elif any(k in stg for k in ['Sơn', 'Đóng Gói', 'Đóng gói']):
            # PQC2 NM3: Trần Thị Ánh (40), Nguyễn Thị Phương (42)
            return (40, 'Trần Thị Ánh') if row_id % 2 == 0 else (42, 'Nguyễn Thị Phương')
        elif any(k in stg for k in ['Lưu Kho', 'Final']):
            return 33, 'Đỗ Hữu Phúc'

    # Mặc định không có số 1, 2, 3
    if any(k in stg for k in ['Định Hình', 'Định hình', 'Lắp Ráp', 'Lắp ráp']):
        return 28, 'Hà Đình Thành'
    elif any(k in stg for k in ['Sơn', 'Đóng Gói', 'Đóng gói']):
        return 32, 'Phan Thị Lương'
    else:
        return 27, 'Đặng Quý Hải'

def run():
    db = SessionLocal()
    try:
        print("=== TIẾN HÀNH ĐỒNG BỘ 100% CÔNG ĐOẠN THEO ĐÚNG CHỨC DANH & PHÒNG BAN ===")

        # 1. daily_inspection_records
        daily_rows = db.execute(text("SELECT id, stage_name FROM daily_inspection_records")).fetchall()
        for r in daily_rows:
            did, sname = r
            insp_id, insp_name = get_exact_inspector(sname, did)
            db.execute(text("UPDATE daily_inspection_records SET inspector_id = :insp_id WHERE id = :did"), {
                "insp_id": insp_id,
                "did": did
            })

        # 2. input_inspections
        inp_rows = db.execute(text("SELECT id, stage, data_json FROM input_inspections")).fetchall()
        for r in inp_rows:
            iid, stg, dj = r
            insp_id, insp_name = get_exact_inspector(stg, iid)
            new_dj = dj
            if dj:
                try:
                    p = json.loads(dj)
                    if isinstance(p, dict):
                        p['inspector_name'] = insp_name
                        p['created_by'] = insp_name
                        new_dj = json.dumps(p, ensure_ascii=False)
                except:
                    pass

            db.execute(text("""
                UPDATE input_inspections 
                SET inspector_id = :insp_id, inspector_name = :insp_name, data_json = :dj 
                WHERE id = :iid
            """), {
                "insp_id": insp_id,
                "insp_name": insp_name,
                "dj": new_dj,
                "iid": iid
            })

        # 3. stage_inspections
        stg_rows = db.execute(text("SELECT id, stage_name FROM stage_inspections")).fetchall()
        for r in stg_rows:
            sid, sname = r
            insp_id, insp_name = get_exact_inspector(sname, sid)
            db.execute(text("UPDATE stage_inspections SET inspector_name = :iname WHERE id = :sid"), {
                "iname": insp_name,
                "sid": sid
            })

        db.commit()
        print("=> Hoàn tất 100% đồng bộ: Tạo Phôi thuộc IQC, Định Hình & Lắp Ráp thuộc PQC1, Sơn & Đóng Gói thuộc PQC2!")

    except Exception as e:
        db.rollback()
        print(f"Lỗi: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run()
