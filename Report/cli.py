import os
import sys
import argparse
import subprocess
from datetime import datetime
from typing import List

# Configure UTF-8 for Windows PowerShell / CMD
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    from report_config import settings
except ImportError:
    from Report.report_config import settings

try:
    from core.weekly_analyzer import WeeklyAnalyzer
    from core.daily_analyzer import DailyAnalyzer
    from exporters.image_exporter import ImageExporter
    from exporters.excel_exporter import ExcelExporter
    from exporters.word_exporter import WordExporter
except ImportError:
    from Report.core.weekly_analyzer import WeeklyAnalyzer
    from Report.core.daily_analyzer import DailyAnalyzer
    from Report.exporters.image_exporter import ImageExporter
    from Report.exporters.excel_exporter import ExcelExporter
    from Report.exporters.word_exporter import WordExporter

def print_banner():
    banner = r"""
========================================================================
   ____                       _   _____ _               
  / ___| _ __ ___   __ _ _ __| |_|  ___| | _____      __
  \___ \| '_ ` _ \ / _` | '__| __| |_  | |/ _ \ \ /\ / /
   ___) | | | | | | (_| | |  | |_|  _| | | (_) \ V  V / 
  |____/|_| |_| |_|\__,_|_|   \__|_|   |_|\___/ \_/\_/  
         QUALITY REPORTING & INFOGRAPHIC SYSTEM
========================================================================
"""
    print(banner)

def parse_args():
    parser = argparse.ArgumentParser(
        description="SmartFlow ERP - Quality Reporting & Infographic Generator (Daily & Weekly)",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument(
        "-t", "--type",
        choices=["weekly", "daily"],
        default="weekly",
        help="Chế độ báo cáo:\n  weekly: Báo cáo tổng hợp tuần (Mặc định)\n  daily:  Báo cáo hoạt động theo ngày"
    )
    parser.add_argument(
        "-w", "--week",
        type=int,
        default=None,
        help="Số tuần ISO (1-52). Mặc định: tuần hiện tại hoặc tuần 42."
    )
    parser.add_argument(
        "-y", "--year",
        type=int,
        default=None,
        help="Năm phân tích (Mặc định: năm hiện tại)."
    )
    parser.add_argument(
        "-d", "--date",
        type=str,
        default=None,
        help="Ngày phân tích định dạng YYYY-MM-DD hoặc 'today' (dành cho chế độ daily)."
    )
    parser.add_argument(
        "-e", "--export",
        type=str,
        default="all",
        help="Định dạng xuất file:\n  all:   Xuất cả 3 định dạng (Ảnh Infographic + Excel + Word)\n  image: Chỉ xuất ảnh Poster Infographic (.png)\n  excel: Chỉ xuất bảng tính Excel (.xlsx)\n  word:  Chỉ xuất văn bản Word (.docx)\n  Hoặc kết hợp: image,excel / excel,word"
    )
    parser.add_argument(
        "-o", "--output-dir",
        type=str,
        default=None,
        help="Thư mục lưu trữ kết quả đầu ra (Mặc định: Report/output)."
    )
    parser.add_argument(
        "--open",
        action="store_true",
        help="Tự động mở thư mục kết quả trong File Explorer sau khi hoàn tất."
    )
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Chỉ in tổng kết KPI ra màn hình console, không tạo file xuất."
    )
    return parser.parse_args()

def main():
    print_banner()
    args = parse_args()

    out_dir = os.path.abspath(args.output_dir) if args.output_dir else settings.OUTPUT_DIR
    os.makedirs(out_dir, exist_ok=True)

    # 1. Khởi tạo analyzer
    if args.type == "daily":
        target_date = args.date if (args.date and args.date.lower() != "today") else None
        print(f"[*] Thu thập dữ liệu BÁO CÁO NGÀY: {target_date or 'Hôm nay'}")
        analyzer = DailyAnalyzer(target_date)
        report_param = target_date or datetime.now().strftime("%Y-%m-%d")
    else:
        week_num = args.week if args.week is not None else 42
        year_num = args.year if args.year is not None else datetime.now().year
        print(f"[*] Thu thập dữ liệu BÁO CÁO TUẦN: Tuần {week_num} (Năm {year_num})")
        analyzer = WeeklyAnalyzer(week=week_num, year=year_num)
        report_param = str(week_num)

    start_time = datetime.now()
    try:
        data = analyzer.analyze()
    except Exception as e:
        print(f"\n[!] LỖI TRUY VẤN DỮ LIỆU: {e}")
        sys.exit(1)

    elapsed_db = (datetime.now() - start_time).total_seconds()
    print(f"[+] Dữ liệu phân tích thành công trong {elapsed_db:.2f}s!")

    # In Preview nếu được yêu cầu hoặc tóm tắt
    meta = data["metadata"]
    kpis = data["kpis"]
    print("-" * 65)
    print(f"  TIÊU ĐỀ    : {meta['report_title']}")
    print(f"  KỲ BÁO CÁO : {meta['curr_period_str']} (So với: {meta['prev_period_str']})")
    print(f"  MÃ QUẢN LÝ : {meta['iso_code']}")
    print("-" * 65)
    print(f"  SẢN PHẨM   : {kpis['daily_checked']['curr']:,} sp ({kpis['daily_checked']['diff']:+,} / {kpis['daily_checked']['diff_pct']:+.1f}%)")
    print(f"  TỶ LỆ ĐẠT  : {kpis['pass_rate']['curr']:.1f}% ({kpis['pass_rate']['diff']:+.1f}% so với kỳ trước)")
    print(f"  TỔNG LỖI   : {kpis['daily_defects']['curr']:,} lỗi (Tỷ lệ lỗi: {kpis['defect_rate']['curr']:.2f}%)")
    print(f"  PHIẾU KIỂM : {kpis['total_tickets']['curr']:,} phiếu (Không đạt: {kpis['fail_tickets']['curr']:,} phiếu)")
    print("-" * 65)

    if args.preview:
        print("[i] Chế độ --preview kích hoạt. Đã hoàn tất xem trước.")
        return

    # Parse danh sách export
    export_targets = set()
    raw_targets = [x.strip().lower() for x in args.export.split(",")]
    if "all" in raw_targets:
        export_targets = {"image", "excel", "word"}
    else:
        for t in raw_targets:
            if t in {"image", "excel", "word", "png", "xlsx", "docx"}:
                if t == "png": export_targets.add("image")
                elif t == "xlsx": export_targets.add("excel")
                elif t == "docx": export_targets.add("word")
                else: export_targets.add(t)

    exported_files = []

    # 1. Xuất Ảnh Infographic Poster
    if "image" in export_targets:
        img_name = f"Infographic_{args.type}_{report_param}_{meta['iso_code']}.png"
        img_path = os.path.join(out_dir, img_name)
        print(f"\n[>] Đang kết xuất INFOGRAPHIC POSTER siêu nét (Playwright Chromium)...")
        try:
            t0 = datetime.now()
            ImageExporter.export(data, img_path, report_type=args.type, report_param=report_param)
            t_img = (datetime.now() - t0).total_seconds()
            size_kb = os.path.getsize(img_path) / 1024
            print(f"    -> THÀNH CÔNG: {img_path} ({size_kb:.1f} KB, {t_img:.2f}s)")
            exported_files.append(img_path)
        except Exception as e:
            print(f"    -> THẤT BẠI: {e}")

    # 2. Xuất Excel
    if "excel" in export_targets:
        xls_name = f"BaoCao_ChatLuong_{args.type}_{report_param}_{meta['iso_code']}.xlsx"
        xls_path = os.path.join(out_dir, xls_name)
        print(f"\n[>] Đang lập bảng tính EXCEL đa phân hệ (6 Sheets chuẩn hóa)...")
        try:
            t0 = datetime.now()
            ExcelExporter.export(data, xls_path)
            t_xls = (datetime.now() - t0).total_seconds()
            size_kb = os.path.getsize(xls_path) / 1024
            print(f"    -> THÀNH CÔNG: {xls_path} ({size_kb:.1f} KB, {t_xls:.2f}s)")
            exported_files.append(xls_path)
        except Exception as e:
            print(f"    -> THẤT BẠI: {e}")

    # 3. Xuất Word
    if "word" in export_targets:
        doc_name = f"BaoCao_ChatLuong_{args.type}_{report_param}_{meta['iso_code']}.docx"
        doc_path = os.path.join(out_dir, doc_name)
        print(f"\n[>] Đang soạn thảo văn bản WORD quản trị (Chuẩn ISO/CAPA)...")
        try:
            t0 = datetime.now()
            WordExporter.export(data, doc_path)
            t_doc = (datetime.now() - t0).total_seconds()
            size_kb = os.path.getsize(doc_path) / 1024
            print(f"    -> THÀNH CÔNG: {doc_path} ({size_kb:.1f} KB, {t_doc:.2f}s)")
            exported_files.append(doc_path)
        except Exception as e:
            print(f"    -> THẤT BẠI: {e}")

    total_time = (datetime.now() - start_time).total_seconds()
    print("\n" + "=" * 65)
    print(f"[✓] HOÀN TẤT TẤT CẢ TÁC VỤ BÁO CÁO TRONG {total_time:.2f}s!")
    print(f"    Thư mục xuất file: {out_dir}")
    print("=" * 65)

    # Tự động mở thư mục nếu có cờ --open
    if args.open and exported_files:
        try:
            if sys.platform == "win32":
                os.startfile(out_dir)
            elif sys.platform == "darwin":
                subprocess.Popen(["open", out_dir])
            else:
                subprocess.Popen(["xdg-open", out_dir])
        except Exception as e:
            print(f"[!] Không thể tự mở Explorer: {e}")

if __name__ == "__main__":
    main()
