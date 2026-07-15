import sys
import os
import json
import shutil
from datetime import datetime

# Add BackEnd path to sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config.settings import settings
# Đăng ký toàn bộ Models vào Registry trước khi truy vấn
import app.models
from modules.system.models.system_screen import SystemScreen
from modules.system.models.screen_bug import ScreenBug, ScreenBugUpdate, ScreenBugImage

def parse_date(date_str):
    if not date_str:
        return None
    try:
        # Standard formats
        for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
    except Exception:
        pass
    return None

def main():
    print("Connecting to SQL Server database...")
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Thư mục chứa dữ liệu đầu vào
    bug_dir = os.path.abspath(os.path.join(backend_path, "..", "bug"))
    json_path = os.path.join(bug_dir, "bugs_data.json")
    src_images_dir = os.path.join(bug_dir, "images")

    # Thư mục đích lưu ảnh của hệ thống
    dest_images_dir = os.path.abspath(os.path.join(backend_path, "static", "uploads", "screen_bugs"))
    os.makedirs(dest_images_dir, exist_ok=True)

    print(f"Reading JSON data from: {json_path}")
    if not os.path.exists(json_path):
        print(f"Error: {json_path} does not exist.")
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        bugs_data = json.load(f)

    print(f"Loaded {len(bugs_data)} bugs from JSON.")

    # 1. Sao chép các tệp hình ảnh vào thư mục upload tĩnh
    print(f"Copying images from {src_images_dir} to {dest_images_dir}...")
    copied_count = 0
    if os.path.exists(src_images_dir):
        for filename in os.listdir(src_images_dir):
            src_file = os.path.join(src_images_dir, filename)
            dest_file = os.path.join(dest_images_dir, filename)
            if os.path.isfile(src_file):
                shutil.copy2(src_file, dest_file)
                copied_count += 1
    print(f"Successfully copied {copied_count} images.")

    # 2. Nhập dữ liệu vào Database
    print("Importing bugs data into database...")
    try:
        for idx, item in enumerate(bugs_data):
            bug_id = item["id"]
            screen_id = item["screen_id"]
            screen_title = item["screen_title"]
            screen_code = item["screen_code"]
            platform = item["platform"]

            # Kiểm tra xem màn hình liên kết screen_id có tồn tại trong system_screens không
            screen = db.query(SystemScreen).filter(SystemScreen.id == screen_id).first()
            if not screen:
                title_safe = screen_title.encode('ascii', errors='replace').decode('ascii')
                print(f"Screen ID {screen_id} ({title_safe}) not found. Creating it...")
                screen = SystemScreen(
                    id=screen_id,
                    platform=platform if platform in ("Web", "Mobile") else "Mobile",
                    route_path=f"/{screen_code.lower()}" if screen_code else "/unknown",
                    default_code=screen_code or "COMMON",
                    current_code=screen_code or "COMMON",
                    title=screen_title or "Unknown Screen",
                    subtitle="Imported screen",
                    is_active=True
                )
                db.add(screen)
                db.flush()

            # Để an toàn và chạy được nhiều lần không trùng lặp, xóa bug cũ cùng ID nếu có
            existing_bug = db.query(ScreenBug).filter(ScreenBug.id == bug_id).first()
            if existing_bug:
                db.delete(existing_bug)
                db.flush()

            # Tạo bản ghi ScreenBug mới
            new_bug = ScreenBug(
                id=bug_id,
                screen_id=screen_id,
                description=item.get("description", ""),
                severity=item.get("severity", "Medium"),
                status=item.get("status", "New"),
                assignee=item.get("assignee"),
                reporter=item.get("reporter"),
                requested_at=parse_date(item.get("requested_at")) or datetime.now(),
                completed_at=parse_date(item.get("completed_at")),
                notes=item.get("notes"),
                created_at=parse_date(item.get("created_at")) or datetime.now()
            )
            db.add(new_bug)
            db.flush()

            # Tạo các bản cập nhật (ScreenBugUpdate)
            update_id_mapping = {} # mapping json update_id to db generated update_id
            for u in item.get("updates", []):
                json_update_id = u["id"]
                new_update = ScreenBugUpdate(
                    bug_id=bug_id,
                    status=u.get("status"),
                    assignee=u.get("assignee"),
                    notes=u.get("notes"),
                    updater=u.get("updater"),
                    created_at=parse_date(u.get("created_at")) or datetime.now()
                )
                db.add(new_update)
                db.flush()
                # Lưu lại id thật để liên kết ảnh
                update_id_mapping[json_update_id] = new_update.id

            # Tạo các hình ảnh đính kèm (ScreenBugImage)
            for img in item.get("images", []):
                json_update_id = img.get("update_id")
                db_update_id = None
                if json_update_id is not None and json_update_id in update_id_mapping:
                    db_update_id = update_id_mapping[json_update_id]

                # Định dạng đường dẫn ảnh lưu trữ trong database
                filename = img["filename"]
                image_path = f"/static/uploads/screen_bugs/{filename}"

                new_img = ScreenBugImage(
                    bug_id=bug_id,
                    update_id=db_update_id,
                    image_path=image_path,
                    created_at=parse_date(img.get("created_at")) or datetime.now()
                )
                db.add(new_img)

            if (idx + 1) % 10 == 0 or (idx + 1) == len(bugs_data):
                print(f"Processed {idx + 1}/{len(bugs_data)} bugs...")

        db.commit()
        print("Import completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error during import: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
