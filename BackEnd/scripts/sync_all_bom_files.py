"""
Script Đồng bộ toàn bộ dữ liệu Master Product & BOM từ thư mục D:\SmartFlow\BOM vào CSDL SmartFlow.
Chạy trực tiếp: python scripts/sync_all_bom_files.py
"""
import sys
import os
import json

# Setup environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.stdout.reconfigure(encoding='utf-8')

from config.database import SessionLocal
from modules.master.controllers.master_product_controller import sync_all_boms_from_directory

def main():
    bom_dir = r"D:\SmartFlow\BOM"
    if len(sys.argv) > 1:
        bom_dir = sys.argv[1]

    print(f"============================================================")
    print(f" BẮT ĐẦU ĐỒNG BỘ TOÀN BỘ FILE BOM TỪ: {bom_dir}")
    print(f"============================================================")

    db = SessionLocal()
    try:
        generator = sync_all_boms_from_directory(db, directory_path=bom_dir)
        for chunk in generator:
            for line in chunk.split('\n'):
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    status = data.get("status", "")
                    msg = data.get("message", "")
                    pct = data.get("percent", 0)
                    fname = data.get("file_name", "")
                    print(f"[{pct:>3}%] {f'({fname}) ' if fname else ''}{msg}", flush=True)
                except Exception:
                    print(line, flush=True)
    except Exception as e:
        print(f"\n❌ LỖI ĐỒNG BỘ: {e}", flush=True)
        import traceback
        traceback.print_exc()
    finally:
        db.close()

    print(f"============================================================")
    print(f" HOÀN TẤT ĐỒNG BỘ BOM!")
    print(f"============================================================")

if __name__ == "__main__":
    main()
