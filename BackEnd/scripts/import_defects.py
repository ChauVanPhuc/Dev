# -*- coding: utf-8 -*-
import os
import sys
import json
import pandas as pd

# Add project root to PYTHONPATH
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(backend_dir)
sys.path.append(os.path.abspath(os.path.join(backend_dir, "..")))

# Load dotenv to resolve environment variables
from dotenv import load_dotenv
dotenv_path = os.path.join(backend_dir, ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    print(f"WARNING: .env file not found at {dotenv_path}")

from config.database import SessionLocal
from modules.inspection.models.defect_type import DefectType, ClientDefect, DefectGlossary

EXCEL_PATH = r"C:\Tool_Get_Data\bảng phân loại lỗi.xlsx"

# Định nghĩa danh sách công đoạn theo nhóm lỗi theo quy tắc người dùng xác nhận
STAGE_MAPPINGS = {
    "MAT": [
        "NM1 - Định hình 1", 
        "NM1 - Định hình ván 1", 
        "NM2 - Định hình mặt tiền 2", 
        "NM2 - Định hình tủ 2", 
        "NM3 - Tạo phôi 3", 
        "NM3 - Định hình 3"
    ],
    "STR": [
        "NM1 - Lắp ráp, chà nhám 1", 
        "NM2 - Lắp ráp mặt tiền 2", 
        "NM2 - Lắp ráp tủ 2", 
        "NM3 - Lắp ráp 3"
    ],
    "PAI": [
        "NM1 - Sơn 1", 
        "NM2 - Sơn Pallet 2", 
        "NM2 - Sơn treo 2", 
        "NM3 - Sơn 3"
    ],
    "APP": [
        "NM1 - Đóng gói 1", 
        "NM2 - Đóng gói 2", 
        "NM3 - Đóng gói 3"
    ]
}

CATEGORY_MAPPINGS = {
    "MAT": "material",
    "STR": "structure",
    "PAI": "paint",
    "APP": "visual"
}

def clean_val(val):
    if pd.isna(val) or val is None:
        return None
    s = str(val).strip()
    return s if s else None

def run_migrations(db):
    print("Running database migrations for defect classifications...")
    from sqlalchemy import text
    try:
        db.execute(text("ALTER TABLE defect_types ADD code NVARCHAR(50) NULL"))
        db.commit()
        try:
            db.execute(text("CREATE UNIQUE INDEX ix_defect_types_code ON defect_types (code) WHERE code IS NOT NULL"))
            db.commit()
        except Exception:
            db.rollback()
        print("Successfully added 'code' column and unique index to defect_types.")
    except Exception:
        db.rollback()

    try:
        db.execute(text("ALTER TABLE defect_types ADD aql_class NVARCHAR(50) NULL"))
        db.commit()
        print("Successfully added 'aql_class' column to defect_types.")
    except Exception:
        db.rollback()

    # Kiểm tra bảng client_defects
    table_check = db.execute(text("""
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'client_defects'
    """)).fetchone()

    if not table_check:
        db.execute(text("""
            CREATE TABLE client_defects (
                id INT IDENTITY(1,1) PRIMARY KEY,
                code NVARCHAR(50) NOT NULL UNIQUE,
                name NVARCHAR(250) NOT NULL,
                name_en NVARCHAR(250) NULL,
                minor_criteria NVARCHAR(500) NULL,
                major_criteria NVARCHAR(500) NULL,
                critical_criteria NVARCHAR(500) NULL,
                detection_method NVARCHAR(250) NULL,
                g7_code NVARCHAR(50) NULL,
                defect_type_id INT NULL,
                is_active BIT NOT NULL DEFAULT 1,
                CONSTRAINT FK_client_defects_defect_types FOREIGN KEY (defect_type_id) 
                    REFERENCES defect_types(id) ON DELETE CASCADE
            )
        """))
        db.commit()
        try:
            db.execute(text("CREATE INDEX ix_client_defects_code ON client_defects (code)"))
            db.commit()
        except Exception:
            db.rollback()
        print("Successfully created client_defects table and index.")
    else:
        print("Table client_defects already exists.")

    # Kiểm tra bảng defect_glossaries
    glossary_check = db.execute(text("""
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'defect_glossaries'
    """)).fetchone()

    if not glossary_check:
        db.execute(text("""
            CREATE TABLE defect_glossaries (
                id INT IDENTITY(1,1) PRIMARY KEY,
                source NVARCHAR(50) NOT NULL,
                code NVARCHAR(50) NOT NULL,
                description NVARCHAR(500) NOT NULL
            )
        """))
        db.commit()
        try:
            db.execute(text("CREATE INDEX ix_defect_glossaries_code ON defect_glossaries (code)"))
            db.commit()
        except Exception:
            db.rollback()
        print("Successfully created defect_glossaries table and index.")
    else:
        print("Table defect_glossaries already exists.")

def import_defects():
    if not os.path.exists(EXCEL_PATH):
        print(f"ERROR: File Excel không tồn tại tại: {EXCEL_PATH}")
        return

    print("--- BẮT ĐẦU NHẬP DANH MỤC LỖI TỪ EXCEL ---")
    db = SessionLocal()
    try:
        # Chạy migration trước
        run_migrations(db)

        # XÓA CÁC LỖI CŨ KHÔNG CÓ MÃ G7
        print("Đang dọn dẹp các loại lỗi cũ không có mã G7...")
        from sqlalchemy import text
        try:
            db.execute(text("DELETE FROM daily_inspection_defects WHERE defect_id IN (SELECT id FROM defect_types WHERE code IS NULL)"))
            db.execute(text("DELETE FROM user_defect_trackings WHERE defect_id IN (SELECT id FROM defect_types WHERE code IS NULL)"))
            db.execute(text("DELETE FROM defect_types WHERE code IS NULL"))
            db.commit()
            print("Đã dọn dẹp xong các loại lỗi cũ không có mã G7.")
        except Exception as err:
            db.rollback()
            print(f"Lỗi khi dọn dẹp lỗi cũ (bỏ qua): {err}")

        # 1. Đọc sheet "Lỗi G7"
        print("Đang đọc sheet 'Lỗi G7'...")
        df_g7 = pd.read_excel(EXCEL_PATH, sheet_name="Lỗi G7")
        
        # In tên các cột để kiểm tra
        print("Cột tìm thấy trong 'Lỗi G7':", list(df_g7.columns))
        
        g7_count = 0
        for idx, row in df_g7.iterrows():
            code = clean_val(row.get("Mã Lỗi"))
            name = clean_val(row.get("Tên Lỗi Ngắn Gọn"))
            aql = clean_val(row.get("Phân Loại AQL"))
            desc = clean_val(row.get("Mô Tả Chi Tiết Tiêu Chuẩn Ghi Nhật Ký"))
            raw_cat = clean_val(row.get("Phân loại")) # MAT, STR, PAI, APP
            
            if not code or not name:
                continue

            category = CATEGORY_MAPPINGS.get(raw_cat, "other")
            stages_list = STAGE_MAPPINGS.get(raw_cat, [])
            stages_json = json.dumps(stages_list, ensure_ascii=False)

            # Tìm kiếm bản ghi cũ
            defect = db.query(DefectType).filter(DefectType.code == code).first()
            if not defect:
                # Tìm theo tên nếu code null (nhưng code ở đây là khóa chính của Excel)
                defect = DefectType(code=code)
                db.add(defect)
                print(f"Tạo mới lỗi G7: {code} - {name}")
            else:
                print(f"Cập nhật lỗi G7: {code} - {name}")

            defect.name = name
            defect.category = category
            defect.stage = stages_json
            defect.description = desc
            defect.aql_class = aql
            defect.is_active = True
            
            # QA tracking mặc định nếu là Critical hoặc Major
            if aql in ["Critical", "Major"]:
                defect.needs_tracking = True
            
            g7_count += 1
        
        db.commit()
        print(f"Đã nhập thành công {g7_count} lỗi G7 nội bộ.")

        # 2. Đọc sheet "Lỗi khách"
        print("\nĐang đọc sheet 'Lỗi khách'...")
        df_client = pd.read_excel(EXCEL_PATH, sheet_name="Lỗi khách")
        print("Cột tìm thấy trong 'Lỗi khách':", list(df_client.columns))

        client_count = 0
        for idx, row in df_client.iterrows():
            c_code = clean_val(row.get("MÃ LỖI"))
            c_name = clean_val(row.get("TÊN LỖI"))
            c_name_en = clean_val(row.get("TÊN TIẾNG ANH"))
            minor = clean_val(row.get("MINOR"))
            major = clean_val(row.get("MAJOR"))
            critical = clean_val(row.get("CRITICAL"))
            method = clean_val(row.get("PHƯƠNG PHÁP XÁC ĐỊNH"))
            g7_code = clean_val(row.get("Mã lỗi tại G7"))

            if not c_code or not c_name:
                continue

            # Tìm G7 defect tương ứng để lấy defect_type_id
            g7_defect = None
            if g7_code:
                # Chuẩn hóa g7_code nếu cần (ví dụ APP-13)
                g7_defect = db.query(DefectType).filter(DefectType.code == g7_code).first()

            # Tìm client defect đã tồn tại
            client_def = db.query(ClientDefect).filter(ClientDefect.code == c_code).first()
            if not client_def:
                client_def = ClientDefect(code=c_code)
                db.add(client_def)
                print(f"Tạo mới lỗi khách hàng: {c_code} - {c_name} (Ánh xạ: {g7_code})")
            else:
                print(f"Cập nhật lỗi khách hàng: {c_code} - {c_name}")

            client_def.name = c_name
            client_def.name_en = c_name_en
            client_def.minor_criteria = minor
            client_def.major_criteria = major
            client_def.critical_criteria = critical
            client_def.detection_method = method
            client_def.g7_code = g7_code
            client_def.defect_type_id = g7_defect.id if g7_defect else None
            client_def.is_active = True

            client_count += 1
            
        db.commit()
        print(f"Đã nhập thành công {client_count} lỗi của khách hàng.")

        # 3. Đọc các sheet chú thích / giải nghĩa viết tắt
        print("\nĐang đọc các sheet để tìm bảng chú thích...")
        xls = pd.ExcelFile(EXCEL_PATH)
        print("Các sheet thực tế có trong file Excel:", xls.sheet_names)
        glossary_sheet = None
        for name in xls.sheet_names:
            name_lower = name.lower()
            if "phân loại" in name_lower or "phan loai" in name_lower or "chú thích" in name_lower or "chu thich" in name_lower or "glossary" in name_lower:
                glossary_sheet = name
                break
        
        if glossary_sheet:
            print(f"Đang import chú thích từ sheet '{glossary_sheet}'...")
            df_glossary = pd.read_excel(EXCEL_PATH, sheet_name=glossary_sheet, header=None)
            
            # Xóa sạch dữ liệu chú thích cũ trước khi import mới
            from sqlalchemy import text
            db.execute(text("DELETE FROM defect_glossaries"))
            db.commit()

            current_source = None
            glossary_count = 0

            for idx, row in df_glossary.iterrows():
                # Lấy 2 cột đầu
                val0 = clean_val(row[0]) if len(row) > 0 else None
                val1 = clean_val(row[1]) if len(row) > 1 else None

                if not val0:
                    continue

                # Xác định nguồn chú thích dựa trên từ khóa trong ô tiêu đề
                val0_up = val0.upper()
                if "CÁC KÝ TỰ VIẾT TẮT CỦA ATLAS" in val0_up or ("ATLAS" in val0_up and "VIẾT TẮT" in val0_up):
                    current_source = "ATLAS"
                    continue
                elif "PHÂN LOẠI LỖI TẠI G7" in val0_up or ("G7" in val0_up and "PHÂN LOẠI" in val0_up):
                    current_source = "G7"
                    continue

                # Bỏ qua dòng tiêu đề cột
                if val0_up == "KÝ TỰ" or val0_up == "MÔ TẢ" or val0_up == "KÝ HIỆU":
                    continue

                if current_source and val0 and val1:
                    glossary_item = DefectGlossary(
                        source=current_source,
                        code=val0,
                        description=val1
                    )
                    db.add(glossary_item)
                    glossary_count += 1

            db.commit()
            print(f"Đã nhập thành công {glossary_count} mục chú thích giải nghĩa lỗi.")
        else:
            print("WARNING: Không tìm thấy sheet 'Chú thích' phù hợp trong file Excel.")

        print("\n--- HOÀN THÀNH NHẬP DỮ LIỆU THÀNH CÔNG ---")

    except Exception as e:
        db.rollback()
        print(f"LỖI hệ thống khi import: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    import_defects()
