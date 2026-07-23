import sys
import os
import shutil
from sqlalchemy import text

# Reconfigure stdout to use UTF-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Set up paths
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_root = os.path.abspath(os.path.join(current_dir, '..'))
sys.path.append(backend_root)

from config.database import SessionLocal
from modules.system.models.system_screen import SystemScreen
from modules.system.models.system_component import SystemComponent
from modules.system.models.system_guide import SystemGuide
from modules.system.models.screen_bug import ScreenBug, ScreenBugUpdate, ScreenBugImage

def clear_data(reseed=True):
    db = SessionLocal()
    try:
        print("=" * 60)
        print("BẮT ĐẦU DỌN DẸP DỮ LIỆU MÀN HÌNH VÀ LIÊN QUAN")
        print("=" * 60)

        # 1. Thu thập thông tin các file cần xóa trước khi xóa bản ghi trong DB
        bug_images = db.query(ScreenBugImage).all()
        components = db.query(SystemComponent).all()
        screens = db.query(SystemScreen).all()

        print(f"- Tìm thấy: {len(bug_images)} ảnh lỗi, {len(components)} thành phần, {len(screens)} màn hình.")

        # 2. Xóa các tệp vật lý
        static_dir = os.path.join(backend_root, "static")
        
        def delete_file_if_exists(rel_path):
            if not rel_path:
                return
            # Chuẩn hóa đường dẫn (bỏ dấu gạch chéo đầu nếu có)
            norm_path = rel_path.lstrip('/')
            abs_path = os.path.join(backend_root, norm_path)
            if os.path.isfile(abs_path):
                try:
                    os.remove(abs_path)
                    print(f"  [XÓA FILE] Đã xóa tệp vật lý: {abs_path}")
                except Exception as file_err:
                    print(f"  [LỖI] Không thể xóa tệp {abs_path}: {file_err}")

        # Xóa các tệp được tham chiếu trong DB
        print("\n[FILE] Đang xóa các tệp được tham chiếu...")
        for img in bug_images:
            delete_file_if_exists(img.image_path)
        for comp in components:
            delete_file_if_exists(comp.file_path)
        for s in screens:
            delete_file_if_exists(s.mockup_path)

        # Dọn dẹp sạch sẽ các thư mục upload liên quan
        uploads_to_clean = [
            os.path.join(static_dir, "uploads", "screen_bugs"),
            os.path.join(static_dir, "uploads", "component_samples")
        ]

        print("\n[FILE] Đang dọn dẹp các thư mục upload...")
        for folder in uploads_to_clean:
            if os.path.isdir(folder):
                print(f"- Dọn dẹp thư mục: {folder}")
                for filename in os.listdir(folder):
                    file_path = os.path.join(folder, filename)
                    try:
                        if os.path.isfile(file_path) or os.path.islink(file_path):
                            os.unlink(file_path)
                        elif os.path.isdir(file_path):
                            shutil.rmtree(file_path)
                        print(f"  -> Đã xóa tệp thừa: {filename}")
                    except Exception as e:
                        print(f"  [LỖI] Không thể xóa {file_path}: {e}")

        # 3. Xóa các bản ghi trong DB theo đúng thứ tự phụ thuộc khóa ngoại
        print("\n[DB] Đang xóa các bản ghi trong cơ sở dữ liệu...")
        
        db.query(ScreenBugImage).delete()
        db.query(ScreenBugUpdate).delete()
        db.query(ScreenBug).delete()
        db.query(SystemGuide).delete()
        db.query(SystemComponent).delete()
        db.query(SystemScreen).delete()
        
        db.commit()
        print("[DB] Đã xóa thành công và lưu thay đổi vào cơ sở dữ liệu.")

        # 4. Nạp lại màn hình mặc định nếu yêu cầu
        if reseed:
            print("\n[DB] Đang nạp lại các cấu hình màn hình hệ thống mặc định...")
            from database.migrations.create_system_screens_table import upgrade as reseed_screens
            reseed_screens()
            print("[DB] Nạp dữ liệu mặc định thành công.")

        # Realtime WebSocket broadcast
        try:
            from shared.services.websocket_service import socket_manager
            import asyncio
            # Vì đây là script độc lập không chạy trong event loop của FastAPI, ta sử dụng loop có sẵn hoặc tạo mới
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
            if loop.is_running():
                # Chạy background task
                loop.create_task(socket_manager.broadcast_all({
                    "type": "SCREEN_UPDATED",
                    "action": "CLEARED_ALL"
                }))
            else:
                loop.run_until_complete(socket_manager.broadcast_all({
                    "type": "SCREEN_UPDATED",
                    "action": "CLEARED_ALL"
                }))
            print("\n[REALTIME] Đã phát sóng thông báo dọn dẹp qua WebSocket.")
        except Exception as ws_err:
            print(f"\n[REALTIME] Bỏ qua thông báo WebSocket (không trong môi trường chạy server): {ws_err}")

        print("\n" + "=" * 60)
        print("HOÀN TẤT DỌN DẸP DỮ LIỆU MÀN HÌNH HỆ THỐNG!")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"\n[LỖI] Dọn dẹp thất bại: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Xóa toàn bộ dữ liệu màn hình hệ thống và tài nguyên liên quan.")
    parser.add_argument("--no-reseed", action="store_true", help="Không nạp lại các màn hình mặc định sau khi xóa")
    args = parser.parse_args()
    
    # Mặc định là có reseed (Option 2) trừ khi truyền --no-reseed
    clear_data(reseed=not args.no_reseed)
