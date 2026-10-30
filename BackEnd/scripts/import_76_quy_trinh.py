# -*- coding: utf-8 -*-
r"""
Script Batch Import Toàn Bộ 76 Quy Trình ISO vào SmartFlow ERP v3
Nguồn: P:\APP\SmartFlow\File\quy trình (QT01 -> QT76)
Đích: /admin/iso-processes (bảng iso_processes, iso_process_sections, iso_process_step_instances, iso_revision_logs, iso_documents)
"""
import os
import sys
import re
import uuid
import shutil
import json
import datetime
import argparse

sys.stdout.reconfigure(encoding='utf-8')

# Ensure backend root in path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from config.database import SessionLocal
from modules.auth.models.accounts import Account
from modules.auth.models.role import Role
from modules.auth.models.permissions import Permission
from modules.inspection_guide.models.inspection_guide import (
    InspectionGuide, InspectionGuideStep, InspectionGuideAssignment, InspectionGuideParameter
)
from modules.inspection.models.iso_models import (
    ISOProcess, ISOProcessSection, ISOProcessStepInstance,
    ISORevisionLog, ISODocument, ISODocumentType
)
from modules.inspection.services.iso_file_service import ensure_docx_path
from modules.inspection.services.iso_parser import parse_iso_docx

SOURCE_ROOT = r"P:\APP\SmartFlow\File\quy trình"
UPLOAD_DIR = os.path.join(BACKEND_DIR, "static", "uploads", "iso_documents")
PREVIEW_CACHE = os.path.join(BACKEND_DIR, "data", "preview_cache")
BACKUP_DIR = os.path.join(BACKEND_DIR, "data", "backups")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PREVIEW_CACHE, exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)

# -----------------------------------------------------------------------------
# BẢNG METADATA CHUẨN CỦA 76 QUY TRÌNH (Theo plan_import_76_iso_processes.md)
# -----------------------------------------------------------------------------
PROCESS_CATALOG = {
    1:  {"code": "QT01", "new_code": "G7.BG.QT.01", "dept": "Ban Giám Đốc", "dept_id": 2001, "title": "QUY TRÌNH CẬP NHẬT LUẬT VÀ CÁC YÊU CẦU KHÁC"},
    2:  {"code": "QT02", "new_code": "G7.MH.QT.02", "dept": "Kho & Mua Hàng", "dept_id": 2005, "title": "QUY TRÌNH LỰA CHỌN ĐỐI TÁC KINH DOANH VÀ QUY TẮC ỨNG XỬ"},
    3:  {"code": "QT03", "new_code": "G7.SX.QT.03", "dept": "Sản Xuất & Kỹ Thuật", "dept_id": 2002, "title": "QUY TRÌNH TRIỂN KHAI SẢN XUẤT"},
    4:  {"code": "QT04", "new_code": "G7.BG.QT.04", "dept": "Ban Giám Đốc", "dept_id": 2001, "title": "QUY TRÌNH HỌP XEM XÉT CỦA LÃNH ĐẠO"},
    5:  {"code": "QT05", "new_code": "G7.HC.QT.05", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH GIẢI QUYẾT KHIẾU NẠI CÔNG NHÂN VÀ CỘNG ĐỒNG XUNG QUANH"},
    6:  {"code": "QT06", "new_code": "G7.AT.QT.06", "dept": "ATVSLĐ & PCCC", "dept_id": 2006, "title": "QUY TRÌNH QUẢN LÝ AN TOÀN LAO ĐỘNG"},
    7:  {"code": "QT07", "new_code": "G7.HC.QT.07", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH XÁC MINH ĐỘ TUỔI"},
    8:  {"code": "QT08", "new_code": "G7.HC.QT.08", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH NGĂN NGỪA LAO ĐỘNG TRẺ EM"},
    9:  {"code": "QT09", "new_code": "G7.HC.QT.09", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH XỬ LÝ KỶ LUẬT LAO ĐỘNG"},
    10: {"code": "QT10", "new_code": "G7.HC.QT.10", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH NGHỈ VIỆC"},
    11: {"code": "QT11", "new_code": "G7.AT.QT.11", "dept": "ATVSLĐ & PCCC", "dept_id": 2006, "title": "QUY TRÌNH QUẢN LÝ THIẾT BỊ YÊU CẦU NGHIÊM NGẶT"},
    12: {"code": "QT12", "new_code": "G7.SX.QT.12", "dept": "Sản Xuất & Kỹ Thuật", "dept_id": 2002, "title": "QUY TRÌNH QUẢN LÝ MÁY MÓC THIẾT BỊ"},
    13: {"code": "QT13", "new_code": "G7.MT.QT.13", "dept": "Quản Lý Môi Trường", "dept_id": 2007, "title": "QUY TRÌNH QUẢN LÝ HÓA CHẤT"},
    14: {"code": "QT14", "new_code": "G7.HC.QT.14", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH NGĂN NGỪA HÀNH VI VÔ ĐẠO ĐỨC"},
    15: {"code": "QT15", "new_code": "G7.AT.QT.15", "dept": "ATVSLĐ & PCCC", "dept_id": 2006, "title": "QUY TRÌNH ỨNG PHÓ TÌNH HUỐNG KHẨN CẤP"},
    16: {"code": "QT16", "new_code": "G7.MT.QT.16", "dept": "Quản Lý Môi Trường", "dept_id": 2007, "title": "QUY TRÌNH XÁC ĐỊNH KHÍA CẠNH MÔI TRƯỜNG"},
    17: {"code": "QT17", "new_code": "G7.MT.QT.17", "dept": "Quản Lý Môi Trường", "dept_id": 2007, "title": "QUY TRÌNH QUẢN LÝ RÁC THẢI"},
    18: {"code": "QT18", "new_code": "G7.AT.QT.18", "dept": "ATVSLĐ & PCCC", "dept_id": 2006, "title": "QUY TRÌNH XỬ LÝ VÀ ĐIỀU TRA TAI NẠN"},
    19: {"code": "QT19", "new_code": "G7.HC.QT.19", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH ĐÀO TẠO"},
    20: {"code": "QT20", "new_code": "G7.QL.QT.20", "dept": "Ban ISO & QLCL", "dept_id": 1, "title": "QUY TRÌNH ĐÁNH GIÁ NỘI BỘ"},
    21: {"code": "QT21", "new_code": "G7.AT.QT.21", "dept": "ATVSLĐ & PCCC", "dept_id": 2006, "title": "QUY TRÌNH SƠ CẤP CỨU"},
    22: {"code": "QT22", "new_code": "G7.HC.QT.22", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH QUẢN LÝ LAO ĐỘNG NỮ"},
    23: {"code": "QT23", "new_code": "G7.HC.QT.23", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH BẢO VỆ LAO ĐỘNG TRẺ EM VÀ LAO ĐỘNG CHƯA THÀNH NIÊN"},
    24: {"code": "QT24", "new_code": "G7.HC.QT.24", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH VỀ MỨC SỐNG TỐI THIỂU"},
    25: {"code": "QT25", "new_code": "G7.AT.QT.25", "dept": "ATVSLĐ & PCCC", "dept_id": 2006, "title": "QUY TRÌNH QUẢN LÝ THIẾT BỊ BẢO HỘ LAO ĐỘNG (BHLĐ)"},
    26: {"code": "QT26", "new_code": "G7.MH.QT.26", "dept": "Kho & Mua Hàng", "dept_id": 2005, "title": "QUY TRÌNH KIỂM SOÁT ĐỐI TÁC KINH DOANH"},
    27: {"code": "QT27", "new_code": "G7.HC.QT.27", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH GIẢI QUYẾT ĐÌNH CÔNG"},
    28: {"code": "QT28", "new_code": "G7.AT.QT.28", "dept": "ATVSLĐ & PCCC", "dept_id": 2006, "title": "QUY TRÌNH KIỂM SOÁT RA VÀO VÀ NGĂN NGỪA MỐI NGUY"},
    29: {"code": "QT29", "new_code": "G7.AT.QT.29", "dept": "ATVSLĐ & PCCC", "dept_id": 2006, "title": "QUY TRÌNH ĐÁNH GIÁ RỦI RO AN TOÀN VỆ SINH LAO ĐỘNG"},
    30: {"code": "QT30", "new_code": "G7.HC.QT.30", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH XỬ LÝ THAM NHŨNG VÀ HỐI LỘ"},
    31: {"code": "QT31", "new_code": "G7.HC.QT.31", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH TUYỂN DỤNG"},
    32: {"code": "QT32", "new_code": "G7.SX.QT.32", "dept": "Sản Xuất & Kỹ Thuật", "dept_id": 2002, "title": "QUY TRÌNH QUẢN LÝ KIM GÃY"},
    33: {"code": "QT33", "new_code": "G7.HC.QT.33", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH TRẢ LƯƠNG HÀNG THÁNG"},
    34: {"code": "QT34", "new_code": "G7.AT.QT.34", "dept": "ATVSLĐ & PCCC", "dept_id": 2006, "title": "QUY TRÌNH AN TOÀN ĐIỆN CÔNG NGHIỆP"},
    35: {"code": "QT35", "new_code": "G7.QL.QT.35", "dept": "Ban ISO & QLCL", "dept_id": 1, "title": "QUY TRÌNH QUẢN LÝ VÀ LƯU TRỮ HỒ SƠ"},
    36: {"code": "QT36", "new_code": "G7.HC.QT.36", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH LẬP KẾ HOẠCH ĐÁNH GIÁ CÔNG VIỆC (KPIS)"},
    37: {"code": "QT37", "new_code": "G7.BG.QT.37", "dept": "Ban Giám Đốc", "dept_id": 2001, "title": "QUY TRÌNH XÁC ĐỊNH BỐI CẢNH VÀ CÁC BÊN QUAN TÂM"},
    38: {"code": "QT38", "new_code": "G7.BG.QT.38", "dept": "Ban Giám Đốc", "dept_id": 2001, "title": "QUY TRÌNH QUẢN LÝ RỦI RO VÀ CƠ HỘI"},
    39: {"code": "QT39", "new_code": "G7.QL.QT.39", "dept": "Ban ISO & QLCL", "dept_id": 1, "title": "QUY TRÌNH KIỂM SOÁT SẢN PHẨM KHÔNG PHÙ HỢP"},
    40: {"code": "QT40", "new_code": "G7.QL.QT.40", "dept": "Ban ISO & QLCL", "dept_id": 1, "title": "QUY TRÌNH HIỆU CHUẨN THIẾT BỊ ĐO"},
    41: {"code": "QT41", "new_code": "G7.KH.QT.41", "dept": "Kho & Mua Hàng", "dept_id": 2005, "title": "QUY TRÌNH QUẢN LÝ KHO"},
    42: {"code": "QT42", "new_code": "G7.QL.QT.42", "dept": "Ban ISO & QLCL", "dept_id": 1, "title": "QUY TRÌNH TRUY XUẤT NGUỒN GỐC VÀ THU HỒI SẢN PHẨM"},
    43: {"code": "QT43", "new_code": "G7.QL.QT.43", "dept": "Ban ISO & QLCL", "dept_id": 1, "title": "QUY TRÌNH HÀNH ĐỘNG KHẮC PHỤC PHÒNG NGỪA"},
    44: {"code": "QT44", "new_code": "G7.HC.QT.44", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH ĐÁNH GIÁ NĂNG LỰC NHÂN VIÊN"},
    45: {"code": "QT45", "new_code": "G7.QL.QT.45", "dept": "Ban ISO & QLCL", "dept_id": 1, "title": "QUY TRÌNH KIỂM SOÁT SỰ THAY ĐỔI"},
    46: {"code": "QT46", "new_code": "G7.KD.QT.46", "dept": "Kho & Mua Hàng", "dept_id": 2005, "title": "QUY TRÌNH BÁN HÀNG"},
    47: {"code": "QT47", "new_code": "G7.MH.QT.47", "dept": "Kho & Mua Hàng", "dept_id": 2005, "title": "QUY TRÌNH MUA HÀNG"},
    48: {"code": "QT48", "new_code": "G7.QL.QT.48", "dept": "Ban ISO & QLCL", "dept_id": 1, "title": "QUY TRÌNH QUẢN LÝ CHẤT LƯỢNG SẢN PHẨM"},
    49: {"code": "QT49", "new_code": "G7.QL.QT.49", "dept": "Ban ISO & QLCL", "dept_id": 1, "title": "QUY TRÌNH GIẢI QUYẾT KHIẾU NẠI VÀ ĐO LƯỜNG SỰ THỎA MÃN KHÁCH HÀNG"},
    50: {"code": "QT50", "new_code": "G7.BG.QT.50", "dept": "Ban Giám Đốc", "dept_id": 2001, "title": "QUY TRÌNH ĐÁNH GIÁ VÀ NHẬN DIỆN RỦI RO"},
    51: {"code": "QT51", "new_code": "G7.KT.QT.51", "dept": "Sản Xuất & Kỹ Thuật", "dept_id": 2002, "title": "QUY TRÌNH THIẾT KẾ SẢN PHẨM"},
    52: {"code": "QT52", "new_code": "G7.QL.QT.52", "dept": "Ban ISO & QLCL", "dept_id": 1, "title": "QUY TRÌNH PHÂN TÍCH DỮ LIỆU"},
    53: {"code": "QT53", "new_code": "G7.KT.QT.53", "dept": "Kho & Mua Hàng", "dept_id": 2005, "title": "QUY TRÌNH ĐỀ XUẤT THANH TOÁN"},
    54: {"code": "QT54", "new_code": "G7.AT.QT.54", "dept": "ATVSLĐ & PCCC", "dept_id": 2006, "title": "QUY TRÌNH LÀM VIỆC TRÊN CAO"},
    55: {"code": "QT55", "new_code": "G7.AT.QT.55", "dept": "ATVSLĐ & PCCC", "dept_id": 2006, "title": "QUY TRÌNH LÀM VIỆC TRONG KHÔNG GIAN KÍN"},
    56: {"code": "QT56", "new_code": "G7.AT.QT.56", "dept": "ATVSLĐ & PCCC", "dept_id": 2006, "title": "QUY TRÌNH TREO THẺ LOTO (LOCKOUT TAGOUT)"},
    57: {"code": "QT57", "new_code": "G7.AT.QT.57", "dept": "ATVSLĐ & PCCC", "dept_id": 2006, "title": "QUY TRÌNH LÀM VIỆC TRONG KHÔNG GIAN HẠN CHẾ"},
    58: {"code": "QT58", "new_code": "G7.AT.QT.58", "dept": "ATVSLĐ & PCCC", "dept_id": 2006, "title": "QUY TRÌNH ĐÁNH GIÁ AN TOÀN MÁY MÓC THIẾT BỊ"},
    59: {"code": "QT59", "new_code": "G7.MT.QT.59", "dept": "Quản Lý Môi Trường", "dept_id": 2007, "title": "QUY TRÌNH TÁI SỬ DỤNG NƯỚC"},
    60: {"code": "QT60", "new_code": "G7.QL.QT.60", "dept": "Ban ISO & QLCL", "dept_id": 1, "title": "QUY TRÌNH KIỂM TRA 5S VÀ AN TOÀN VSLĐ"},
    61: {"code": "QT61", "new_code": "G7.MT.QT.61", "dept": "Quản Lý Môi Trường", "dept_id": 2007, "title": "QUY TRÌNH QUẢN LÝ CHẤT THẢI"},
    62: {"code": "QT62", "new_code": "G7.MT.QT.62", "dept": "Quản Lý Môi Trường", "dept_id": 2007, "title": "QUY TRÌNH KIỂM TRA MSDS"},
    63: {"code": "QT63", "new_code": "G7.QL.QT.63", "dept": "Ban ISO & QLCL", "dept_id": 1, "title": "QUY TRÌNH THỰC HIỆN CÔNG VIỆC PDCA"},
    64: {"code": "QT64", "new_code": "G7.MH.QT.64", "dept": "Kho & Mua Hàng", "dept_id": 2005, "title": "QUY TRÌNH MUA HÀNG VẬT TƯ SỬA CHỮA"},
    65: {"code": "QT65", "new_code": "G7.AT.QT.65", "dept": "ATVSLĐ & PCCC", "dept_id": 2006, "title": "QUY TRÌNH QUẢN LÝ SỨC KHỎE VÀ BỆNH NGHỀ NGHIỆP"},
    66: {"code": "QT66", "new_code": "G7.QL.QT.66", "dept": "Ban ISO & QLCL", "dept_id": 1, "title": "QUY TRÌNH KIỂM SOÁT TÀI LIỆU VÀ HỒ SƠ"},
    67: {"code": "QT67", "new_code": "G7.QL.QT.67", "dept": "Ban ISO & QLCL", "dept_id": 1, "title": "QUY TRÌNH HÀNH ĐỘNG KHẮC PHỤC VÀ PHÒNG NGỪA SỰ KHÔNG PHÙ HỢP HỆ THỐNG (CAPA)"},
    68: {"code": "QT68", "new_code": "G7.HC.QT.68", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH KIỂM TRA BẾP ĂN TẬP THỂ CÔNG TY"},
    69: {"code": "QT69", "new_code": "G7.MT.QT.69", "dept": "Quản Lý Môi Trường", "dept_id": 2007, "title": "QUY TRÌNH ĐÁNH GIÁ KHÍA CẠNH MÔI TRƯỜNG"},
    70: {"code": "QT70", "new_code": "G7.AT.QT.70", "dept": "ATVSLĐ & PCCC", "dept_id": 2006, "title": "QUY TRÌNH NHẬN DIỆN MỐI NGUY VÀ ĐÁNH GIÁ RỦI RO ATSKNN"},
    71: {"code": "QT71", "new_code": "G7.HC.QT.71", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH THAM GIA VÀ THAM VẤN"},
    72: {"code": "QT72", "new_code": "G7.AT.QT.72", "dept": "ATVSLĐ & PCCC", "dept_id": 2006, "title": "QUY TRÌNH CẤP PHÉP LÀM VIỆC VÀ KIỂM SOÁT NHÀ THẦU"},
    73: {"code": "QT73", "new_code": "G7.HC.QT.73", "dept": "Hành Chính - Nhân Sự", "dept_id": 2006, "title": "QUY TRÌNH TỐ GIÁC ẨN DANH"},
    74: {"code": "QT74", "new_code": "G7.BG.QT.74", "dept": "Ban Giám Đốc", "dept_id": 2001, "title": "QUY TRÌNH XÁC ĐỊNH CÁC YÊU CẦU VÀ ĐÁNH GIÁ SỰ TUÂN THỦ"},
    75: {"code": "QT75", "new_code": "G7.QL.QT.75", "dept": "Ban ISO & QLCL", "dept_id": 1, "title": "QUY TRÌNH ĐÁNH GIÁ HIỆN TRƯỜNG SẢN XUẤT THEO LỚP LPA"},
    76: {"code": "QT76", "new_code": "G7.BG.QT.76", "dept": "Ban Giám Đốc", "dept_id": 2001, "title": "QUY TRÌNH HỌP ĐÁNH GIÁ KPI'S VÀ CHI THƯỞNG TRONG THÁNG"},
}

def clean_form_title(fname):
    base = os.path.splitext(fname)[0].strip()
    # Loại bỏ tiền tố mã QT..-BM..
    cleaned = re.sub(r'^(?:QT\d+[-_.]?BM\d+|BM[-_.]?\d+|\d+[-_.]?BM[-_.]?\d+)\s*[-_.]?\s*', '', base, flags=re.I).strip()
    if not cleaned:
        cleaned = base
    return cleaned

def run_import(dry_run=False):
    db = SessionLocal()
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print("=" * 80)
    print("🚀 BẮT ĐẦU QUY TRÌNH IMPORT 76 QUY TRÌNH ISO VÀO SMARTFLOW ERP V3")
    print(f"Chế độ: {'DRY-RUN (Thử nghiệm - Không ghi CSDL)' if dry_run else 'LIVE (Ghi chính thức vào CSDL)'}")
    print(f"Nguồn: {SOURCE_ROOT}")
    print(f"Đích file: {UPLOAD_DIR}")
    print("=" * 80)

    # 1. SAO LƯU DỮ LIỆU CŨ NẾU CÓ BẢN GHI QT
    print("\n[BƯỚC 1] Kiểm tra & sao lưu dữ liệu quy trình hiện tại...")
    old_qt_processes = db.query(ISOProcess).filter(ISOProcess.doc_type_code == "QT").all()
    print(f"Tìm thấy {len(old_qt_processes)} quy trình loại 'QT' cũ trong CSDL.")
    
    if old_qt_processes and not dry_run:
        backup_data = []
        for p in old_qt_processes:
            backup_data.append({
                "id": p.id,
                "code": p.code,
                "new_code": p.new_code,
                "name": p.name,
                "department_name": p.department_name,
                "file_path": p.file_path,
                "created_at": p.created_at
            })
        backup_file = os.path.join(BACKUP_DIR, f"backup_qt_processes_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        with open(backup_file, "w", encoding="utf-8") as f:
            json.dump(backup_data, f, ensure_ascii=False, indent=2)
        print(f"Đã sao lưu {len(backup_data)} bản ghi ra: {backup_file}")

        # Dọn dẹp sạch bản ghi QT cũ để nạp mới hoàn toàn không trùng lặp
        print("Xóa sạch các bản ghi QT cũ (bảo toàn CS & TT)...")
        for p in old_qt_processes:
            db.query(InspectionGuide).filter(InspectionGuide.process_id == p.id).update({InspectionGuide.process_id: None})
            db.query(ISOProcessSection).filter(ISOProcessSection.process_id == p.id).delete()
            db.query(ISOProcessStepInstance).filter(ISOProcessStepInstance.process_id == p.id).delete()
            db.query(ISORevisionLog).filter(ISORevisionLog.process_id == p.id).delete()
            db.query(ISODocument).filter(ISODocument.process_id == p.id).delete()
            db.delete(p)
        db.commit()
        print("Đã dọn sạch các bản ghi QT cũ thành công.")

    # 2. ĐẢM BẢO DOC TYPE QT & BM CÓ ĐẦY ĐỦ
    doc_types = db.query(ISODocumentType).all()
    type_map = {t.code.upper(): t for t in doc_types}
    qt_type_id = type_map.get("QT").id if "QT" in type_map else 4

    # 3. LẤY DANH SÁCH MÃ CODE ISODOCUMENT HIỆN CÓ ĐỂ ĐẢM BẢO UNIQUE
    existing_bm_codes = set()
    for d in db.query(ISODocument.code).all():
        if d[0]:
            existing_bm_codes.add(d[0].strip().upper())

    # 4. QUÉT VÀ IMPORT TỪNG QUY TRÌNH (1 ĐẾN 76)
    print("\n[BƯỚC 2] Bắt đầu nạp tuần tự 76 quy trình...")

    imported_count = 0
    total_forms_imported = 0
    folders = sorted([f for f in os.listdir(SOURCE_ROOT) if os.path.isdir(os.path.join(SOURCE_ROOT, f))])

    for idx, folder_name in enumerate(folders):
        stt = idx + 1
        meta = PROCESS_CATALOG.get(stt, {
            "code": f"QT{stt:02d}",
            "new_code": f"G7.ISO.QT.{stt:02d}",
            "dept": "Ban ISO & QLCL",
            "dept_id": 1,
            "title": folder_name
        })

        folder_path = os.path.join(SOURCE_ROOT, folder_name)
        print(f"\n--- [{stt:02d}/76] {meta['code']}: {meta['title']} ({meta['dept']}) ---")

        # Quét tất cả file trong folder
        all_files = []
        for root, dirs, files in os.walk(folder_path):
            for f in files:
                if not f.startswith("~$") and not f.endswith(".tmp"):
                    rel_p = os.path.relpath(os.path.join(root, f), folder_path)
                    all_files.append((rel_p, os.path.join(root, f)))

        main_file = None
        main_file_abs = None
        forms = []

        # Phân loại file chính và biểu mẫu con
        for rel_p, abs_p in all_files:
            lower = rel_p.lower()
            if lower.endswith(('.docx', '.doc')):
                if re.search(r'[-_]bm\d+|biểu\s*mẫu|báo\s*cáo|sổ\s*theo|bảng\s*theo|phiếu|checklist', lower):
                    forms.append({"name": os.path.basename(rel_p), "path": rel_p, "abs": abs_p, "ext": os.path.splitext(rel_p)[1]})
                elif "quy trình" in lower or lower.startswith("qt"):
                    if not main_file:
                        main_file = os.path.basename(rel_p)
                        main_file_abs = abs_p
                    else:
                        forms.append({"name": os.path.basename(rel_p), "path": rel_p, "abs": abs_p, "ext": os.path.splitext(rel_p)[1]})
                else:
                    forms.append({"name": os.path.basename(rel_p), "path": rel_p, "abs": abs_p, "ext": os.path.splitext(rel_p)[1]})
            elif lower.endswith(('.xlsx', '.xls', '.pdf')):
                forms.append({"name": os.path.basename(rel_p), "path": rel_p, "abs": abs_p, "ext": os.path.splitext(rel_p)[1]})
            else:
                forms.append({"name": os.path.basename(rel_p), "path": rel_p, "abs": abs_p, "ext": os.path.splitext(rel_p)[1]})

        if not main_file:
            for item in list(forms):
                if item["ext"].lower() in ['.docx', '.doc']:
                    main_file = item["name"]
                    main_file_abs = item["abs"]
                    forms.remove(item)
                    break

        # TRƯỜNG HỢP QT76: Thư mục rỗng -> Tạo bản ghi Dự thảo
        if stt == 76 or not main_file:
            print(f"-> Thư mục trống hoặc chưa có file: Khởi tạo quy trình Dự thảo {meta['new_code']}")
            if not dry_run:
                p_obj = ISOProcess(
                    code=meta["code"],
                    new_code=meta["new_code"],
                    name=meta["title"],
                    department_id=meta["dept_id"],
                    department_name=meta["dept"],
                    doc_type_code="QT",
                    doc_type_id=qt_type_id,
                    status="Soạn thảo",
                    notes="Phiên bản khởi tạo: 01",
                    issue_date=now_str[:10],
                    symbol="QT",
                    document_level="Cấp công ty",
                    owner="Phòng ISO",
                    editor="Ngô Diễm My",
                    approver="Đặng Văn Nam",
                    approver_bgd="Nguyễn Hòa",
                    created_at=now_str,
                    updated_at=now_str
                )
                db.add(p_obj)
                db.flush()
                # Thêm revision log ban đầu
                db.add(ISORevisionLog(
                    process_id=p_obj.id,
                    seq_no=1,
                    rev_date=now_str[:10],
                    content="Khởi tạo hồ sơ quy trình dự thảo (Chờ ban hành tài liệu chính thức)",
                    page_no="1",
                    modifier="Ban ISO"
                ))
                db.commit()
            imported_count += 1
            continue

        # XỬ LÝ QUY TRÌNH CÓ FILE CHÍNH
        raw_ext = os.path.splitext(main_file)[1]
        unique_raw_name = f"{uuid.uuid4()}{raw_ext}"
        raw_dest = os.path.join(UPLOAD_DIR, unique_raw_name)
        
        if not dry_run:
            shutil.copyfile(main_file_abs, raw_dest)
        rel_original_path = f"static/uploads/iso_documents/{unique_raw_name}"

        # Chuyển đổi .doc sang .docx nếu cần
        docx_work_path = main_file_abs
        if raw_ext.lower() == ".doc":
            docx_work_path = ensure_docx_path(main_file_abs)

        # Copy .docx chuẩn vào UPLOAD_DIR
        unique_docx_name = f"{uuid.uuid4()}.docx"
        docx_dest = os.path.join(UPLOAD_DIR, unique_docx_name)
        if not dry_run:
            shutil.copyfile(docx_work_path, docx_dest)
        rel_docx_path = f"static/uploads/iso_documents/{unique_docx_name}"

        # Parser docx
        parsed_data = parse_iso_docx(docx_work_path, original_filename=main_file)

        # Trích xuất metadata
        extracted_ver = parsed_data.get("version") or "01"
        extracted_date = parsed_data.get("issue_date") or "2024-01-01"
        extracted_title = meta["title"] # Luôn ưu tiên tên chuẩn hóa rõ ràng

        print(f"-> File chính: {main_file} (Phiên bản: {extracted_ver}, Ngày: {extracted_date})")
        print(f"-> Sections: {len(parsed_data.get('sections', {}))}, Steps: {len(parsed_data.get('steps', []))}, Biểu mẫu: {len(forms)}")

        if not dry_run:
            p_obj = ISOProcess(
                code=meta["code"],
                new_code=meta["new_code"],
                name=extracted_title,
                department_id=meta["dept_id"],
                department_name=meta["dept"],
                doc_type_code="QT",
                doc_type_id=qt_type_id,
                file_path=rel_docx_path,
                original_file_path=rel_original_path,
                original_file_name=main_file,
                status="Soạn thảo",
                notes=f"Phiên bản ban hành: {extracted_ver}",
                issue_date=extracted_date,
                symbol="QT",
                document_level="Cấp công ty",
                owner="Phòng ISO",
                editor="Ngô Diễm My",
                approver="Đặng Văn Nam",
                approver_bgd="Nguyễn Hòa",
                created_at=now_str,
                updated_at=now_str
            )
            db.add(p_obj)
            db.flush()

            # Nạp Sections
            sections_dict = parsed_data.get("sections", {})
            if isinstance(sections_dict, dict):
                for s_name, s_html in sections_dict.items():
                    db.add(ISOProcessSection(
                        process_id=p_obj.id,
                        section_name=s_name,
                        content_html=s_html
                    ))
            if parsed_data.get("forms_table_html"):
                if not any("biểu mẫu" in s.lower() for s in sections_dict.keys()):
                    db.add(ISOProcessSection(
                        process_id=p_obj.id,
                        section_name="6. Danh mục biểu mẫu & Hồ sơ lưu trữ",
                        content_html=parsed_data["forms_table_html"]
                    ))

            # Nạp Steps (Lưu đồ)
            steps_list = parsed_data.get("steps", [])
            for st in steps_list:
                s_name = (st.get("name") or "Bước thực hiện").strip()
                # Lấy dòng đầu tiên làm tên bước ngắn gọn cho lưu đồ trực quan, tối đa 250 ký tự
                first_line = s_name.split("\n")[0].strip()
                concise_name = first_line if len(first_line) <= 240 else first_line[:237] + "..."
                if not concise_name:
                    concise_name = s_name[:237] + "..."
                
                db.add(ISOProcessStepInstance(
                    process_id=p_obj.id,
                    step_number=st.get("step_number", 1),
                    name=concise_name,
                    assignee_role=(st.get("assignee_role") or meta["dept"])[:200],
                    instructions=st.get("instructions", "")
                ))

            # Nạp Revision Logs
            rev_logs = parsed_data.get("revision_logs", [])
            if rev_logs:
                for r in rev_logs:
                    db.add(ISORevisionLog(
                        process_id=p_obj.id,
                        seq_no=r.get("seq_no", 1),
                        rev_date=r.get("rev_date", extracted_date),
                        content=r.get("content", "Ban hành lần đầu"),
                        page_no=r.get("page_no", "1"),
                        modifier=r.get("modifier", "Ban ISO")
                    ))
            else:
                db.add(ISORevisionLog(
                    process_id=p_obj.id,
                    seq_no=1,
                    rev_date=extracted_date,
                    content="Ban hành chính thức lần đầu",
                    page_no="1",
                    modifier="Ban ISO"
                ))

            # Nạp các Biểu mẫu con (Forms)
            for b_idx, f_item in enumerate(forms, 1):
                f_name = f_item["name"]
                f_abs = f_item["abs"]
                f_ext = f_item["ext"]

                # Unique code cho BM
                m_bm = re.search(r'(?:QT\d+[-_.]?)?(BM[-_.]?\d+)', f_name, re.I)
                bm_tag = m_bm.group(1).upper().replace("_", "").replace(".", "") if m_bm else f"BM{b_idx:02d}"
                bm_code = f"{meta['code']}-{bm_tag}"
                
                # Tránh duplicate code trong bảng iso_documents
                base_bm_code = bm_code
                suffix = 1
                while bm_code.upper() in existing_bm_codes:
                    bm_code = f"{base_bm_code}.{suffix}"
                    suffix += 1
                existing_bm_codes.add(bm_code.upper())

                bm_title = clean_form_title(f_name)[:240]
                f_name_safe = f_name[:240]

                # Copy file biểu mẫu
                bm_uuid_name = f"{uuid.uuid4()}{f_ext}"
                bm_dest = os.path.join(UPLOAD_DIR, bm_uuid_name)
                shutil.copyfile(f_abs, bm_dest)
                rel_bm_path = f"static/uploads/iso_documents/{bm_uuid_name}"

                db.add(ISODocument(
                    process_id=p_obj.id,
                    code=bm_code[:95],
                    name=bm_title,
                    symbol="BM",
                    doc_type="Biểu mẫu đính kèm",
                    file_path=rel_bm_path,
                    original_file_path=rel_bm_path,
                    original_file_name=f_name_safe,
                    status="Hiệu lực",
                    version="01",
                    issue_date=extracted_date,
                    created_at=now_str,
                    updated_at=now_str
                ))
                total_forms_imported += 1

            db.commit()

        imported_count += 1

    print("\n" + "=" * 80)
    print("🎉 HOÀN TẤT QUY TRÌNH BATCH IMPORT 76 QUY TRÌNH ISO!")
    print(f"- Tổng số quy trình nạp thành công: {imported_count}/76")
    print(f"- Tổng số biểu mẫu con nạp kèm: {total_forms_imported}")
    print("=" * 80)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Batch import 76 ISO processes into SmartFlow ERP")
    parser.add_argument("--dry-run", action="store_true", help="Chạy giả lập kiểm tra, không ghi vào CSDL")
    args = parser.parse_args()

    run_import(dry_run=args.dry_run)
