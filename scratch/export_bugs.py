import os
import sys
import shutil
import json
import csv
from sqlalchemy import text

# Add BackEnd path for database configuration
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../BackEnd")))

from config.database import SessionLocal

def format_datetime(dt):
    if dt is None:
        return ""
    return str(dt)

def main():
    print("Starting bug export process...")
    
    # Initialize paths
    workspace_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    bug_dir = os.path.join(workspace_dir, "bug")
    images_dest_dir = os.path.join(bug_dir, "images")
    
    # Create target directories
    os.makedirs(bug_dir, exist_ok=True)
    os.makedirs(images_dest_dir, exist_ok=True)
    
    # Possible source directories for bug images
    src_dirs = [
        os.path.join(workspace_dir, "BackEnd", "static", "uploads", "screen_bugs"),
        os.path.join(workspace_dir, "static", "uploads", "screen_bugs"),
    ]
    
    db = SessionLocal()
    try:
        # 1. Query all bugs with screen info
        bugs_query = db.execute(text("""
            SELECT 
                b.id, b.screen_id, b.description, b.severity, b.status, b.assignee, b.reporter, b.requested_at, b.completed_at, b.notes, b.created_at,
                s.platform, s.default_code, s.current_code, s.title as screen_title, s.subtitle as screen_subtitle
            FROM screen_bugs b
            LEFT JOIN system_screens s ON b.screen_id = s.id
            ORDER BY b.id ASC
        """)).fetchall()
        
        print(f"Found {len(bugs_query)} bugs in database.")
        
        exported_bugs = []
        copied_images_count = 0
        
        for bug in bugs_query:
            bug_id = bug.id
            
            # 2. Query updates for this bug
            updates_query = db.execute(text("""
                SELECT id, status, assignee, notes, updater, created_at
                FROM screen_bug_updates
                WHERE bug_id = :bug_id
                ORDER BY created_at ASC
            """), {"bug_id": bug_id}).fetchall()
            
            bug_updates = []
            for up in updates_query:
                bug_updates.append({
                    "id": up.id,
                    "status": up.status,
                    "assignee": up.assignee,
                    "notes": up.notes,
                    "updater": up.updater,
                    "created_at": format_datetime(up.created_at)
                })
            
            # 3. Query images for this bug
            # Note: ScreenBugImage has bug_id or update_id. Let's get both.
            images_query = db.execute(text("""
                SELECT id, update_id, image_path, created_at
                FROM screen_bug_images
                WHERE bug_id = :bug_id OR update_id IN (
                    SELECT id FROM screen_bug_updates WHERE bug_id = :bug_id
                )
                ORDER BY created_at ASC
            """), {"bug_id": bug_id}).fetchall()
            
            bug_images = []
            for img in images_query:
                image_path = img.image_path
                filename = os.path.basename(image_path)
                
                # Try to copy the image to bug/images/
                src_file_path = None
                for s_dir in src_dirs:
                    candidate = os.path.join(s_dir, filename)
                    if os.path.exists(candidate):
                        src_file_path = candidate
                        break
                
                copied_locally = False
                if src_file_path:
                    dest_file_path = os.path.join(images_dest_dir, filename)
                    try:
                        shutil.copy2(src_file_path, dest_file_path)
                        copied_locally = True
                        copied_images_count += 1
                    except Exception as e:
                        print(f"Error copying image {filename}: {e}")
                else:
                    # Let's check if the raw path is absolute or matches another pattern
                    # We print a warning but keep the path in metadata
                    pass
                
                bug_images.append({
                    "id": img.id,
                    "update_id": img.update_id,
                    "original_path": image_path,
                    "filename": filename,
                    "copied_locally": copied_locally,
                    "created_at": format_datetime(img.created_at)
                })
            
            # 4. Consolidate bug data
            exported_bugs.append({
                "id": bug_id,
                "screen_id": bug.screen_id,
                "screen_title": bug.screen_title or "N/A",
                "screen_code": bug.current_code or bug.default_code or "N/A",
                "platform": bug.platform or "N/A",
                "description": bug.description,
                "severity": bug.severity,
                "status": bug.status,
                "assignee": bug.assignee or "Chưa phân công",
                "reporter": bug.reporter or "N/A",
                "notes": bug.notes or "",
                "requested_at": format_datetime(bug.requested_at),
                "completed_at": format_datetime(bug.completed_at),
                "created_at": format_datetime(bug.created_at),
                "images": bug_images,
                "updates": bug_updates
            })
            
        print(f"Successfully processed database records. Total images copied: {copied_images_count}")
        
        # 5. Write JSON File
        json_file_path = os.path.join(bug_dir, "bugs_data.json")
        with open(json_file_path, "w", encoding="utf-8") as f:
            json.dump(exported_bugs, f, ensure_ascii=False, indent=2)
        print(f"Exported JSON data to {json_file_path}")
        
        # 6. Write CSV File
        csv_file_path = os.path.join(bug_dir, "bugs_list.csv")
        csv_headers = [
            "ID Lỗi", "Mã Màn Hình", "Tên Màn Hình", "Hệ Điều Hành", "Mô Tả", 
            "Mức Độ", "Trạng Thái", "Người Xử Lý", "Người Báo Cáo", 
            "Ngày Yêu Cầu", "Ngày Hoàn Thành", "Ghi Chú", "Số Lượng Ảnh"
        ]
        with open(csv_file_path, "w", encoding="utf-8-sig", newline="") as f: # utf-8-sig adds BOM for Excel
            writer = csv.writer(f)
            writer.writerow(csv_headers)
            for bug in exported_bugs:
                writer.writerow([
                    bug["id"],
                    bug["screen_code"],
                    bug["screen_title"],
                    bug["platform"],
                    bug["description"],
                    bug["severity"],
                    bug["status"],
                    bug["assignee"],
                    bug["reporter"],
                    bug["requested_at"],
                    bug["completed_at"],
                    bug["notes"],
                    len(bug["images"])
                ])
        print(f"Exported CSV list to {csv_file_path}")
        
        # 7. Write Markdown Report
        md_file_path = os.path.join(bug_dir, "bugs_report.md")
        with open(md_file_path, "w", encoding="utf-8") as f:
            f.write("# Báo Cáo Danh Sách Lỗi (Bugs Report)\n\n")
            f.write(f"Tổng số bug ghi nhận: **{len(exported_bugs)}**\n")
            f.write(f"Tổng số hình ảnh đính kèm đã xuất: **{copied_images_count}**\n\n")
            
            # Statistics
            status_stats = {}
            severity_stats = {}
            for bug in exported_bugs:
                status_stats[bug["status"]] = status_stats.get(bug["status"], 0) + 1
                severity_stats[bug["severity"]] = severity_stats.get(bug["severity"], 0) + 1
                
            f.write("### Thống kê trạng thái:\n")
            for k, v in status_stats.items():
                f.write(f"- **{k}**: {v} bugs\n")
            f.write("\n### Thống kê mức độ nghiêm trọng:\n")
            for k, v in severity_stats.items():
                f.write(f"- **{k}**: {v} bugs\n")
            f.write("\n---\n\n")
            
            # Table of bugs
            f.write("## Bảng Danh Sách Lỗi\n\n")
            f.write("| ID | Màn Hình | Mô Tả | Mức Độ | Trạng Thái | Người Xử Lý | Ngày Ghi Nhận | Ảnh |\n")
            f.write("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n")
            
            for bug in exported_bugs:
                screen_display = f"{bug['screen_code']} ({bug['platform']})"
                img_link = ""
                if bug["images"]:
                    img_links = []
                    for idx, img in enumerate(bug["images"]):
                        if img["copied_locally"]:
                            img_links.append(f"[Ảnh {idx+1}](images/{img['filename']})")
                        else:
                            img_links.append(f"[Ảnh {idx+1} (Remote)]({img['original_path']})")
                    img_link = ", ".join(img_links)
                else:
                    img_link = "Không có"
                    
                # Clean up newlines in description for table format
                desc_cleaned = bug["description"].replace("\n", " ").replace("\r", "")
                if len(desc_cleaned) > 100:
                    desc_cleaned = desc_cleaned[:97] + "..."
                    
                f.write(f"| {bug['id']} | {screen_display} | {desc_cleaned} | {bug['severity']} | {bug['status']} | {bug['assignee']} | {bug['created_at'][:10]} | {img_link} |\n")
            
            f.write("\n---\n\n")
            
            # Detail section for bugs with images
            f.write("## Chi Tiết Lỗi & Hình Ảnh Đính Kèm\n\n")
            bugs_with_images = [b for b in exported_bugs if b["images"]]
            
            if not bugs_with_images:
                f.write("*Không có hình ảnh đính kèm nào được ghi nhận.*\n")
            else:
                for bug in bugs_with_images:
                    f.write(f"### Bug ID: {bug['id']} - Màn hình: {bug['screen_title']} ({bug['screen_code']})\n")
                    f.write(f"- **Mô tả chi tiết:** {bug['description'].strip()}\n")
                    f.write(f"- **Trạng thái:** `{bug['status']}` | **Mức độ:** `{bug['severity']}`\n")
                    f.write(f"- **Người báo cáo:** {bug['reporter']} | **Người chịu trách nhiệm:** {bug['assignee']}\n")
                    if bug["notes"]:
                        f.write(f"- **Ghi chú:** {bug['notes']}\n")
                        
                    # Show updates/comments if any
                    if bug["updates"]:
                        f.write("- **Lịch sử cập nhật:**\n")
                        for up in bug["updates"]:
                            up_note = up["notes"].strip().replace("\n", " ") if up["notes"] else ""
                            f.write(f"  - [{up['created_at']}] `Trạng thái: {up['status']}` - Cập nhật bởi **{up['updater']}**: {up_note}\n")
                    
                    f.write("\n**Hình ảnh đính kèm:**\n\n")
                    for img in bug["images"]:
                        if img["copied_locally"]:
                            f.write(f"![Bug Image {bug['id']}](images/{img['filename']})\n\n")
                        else:
                            f.write(f"*[Ảnh chưa được tải cục bộ: {img['original_path']}]*\n\n")
                            
                    f.write("---\n\n")
                    
        print(f"Exported Markdown report to {md_file_path}")
        print("Bug export completed successfully!")
        
    except Exception as e:
        print(f"An error occurred: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    main()
