"""
Migration: Create system_screens table and seed initial data
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from config.database import get_db
from datetime import datetime

INITIAL_SCREENS = []

def extract_routes_from_file(file_path: str):
    import re
    if not os.path.exists(file_path):
        print(f"[AUTO-REGISTER] File not found: {file_path}")
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Remove comments
    content = re.sub(r'//.*', '', content)
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    
    routes = []
    lines = content.split('\n')
    current_parents = [] # Stack of (indent_level, path)
    
    for line in lines:
        path_match = re.search(r'path=["\']([^"\']+)["\']', line)
        is_index = "index" in line
        
        if path_match:
            path = path_match.group(1)
            indent = len(line) - len(line.lstrip())
            
            while current_parents and current_parents[-1][0] >= indent:
                current_parents.pop()
                
            if current_parents:
                parent_path = current_parents[-1][1]
                if parent_path.endswith('/') or path.startswith('/'):
                    full_path = f"{parent_path.rstrip('/')}/{path.lstrip('/')}"
                else:
                    full_path = f"{parent_path}/{path}"
            else:
                full_path = path
                
            if not full_path.endswith('*'):
                routes.append(full_path)
                
            is_self_closing = line.strip().endswith('/>')
            if not is_self_closing:
                current_parents.append((indent, full_path))
                
        elif is_index and current_parents:
            routes.append(current_parents[-1][1])
            
    unique_routes = []
    for r in routes:
        r = r.strip()
        if not r.startswith('/'):
            r = '/' + r
        r = r.rstrip('/')
        if not r:
            r = '/'
        if r not in unique_routes:
            unique_routes.append(r)
            
    return unique_routes

def generate_default_title(path: str):
    segments = [s for s in path.split('/') if s and not s.startswith(':')]
    if not segments:
        return "Trang chủ"
    
    last = segments[-1]
    title = last.replace('-', ' ').replace('_', ' ').title()
    if ':id' in path or 'detail' in path.lower():
        title += " Detail"
        
    if path.startswith('/admin'):
        title = f"Admin {title}"
    elif path.startswith('/manufacture'):
        title = f"Manufacture {title}"
    return title

def get_next_screen_code(db, platform: str, route_path: str) -> str:
    if platform == "Mobile":
        prefix = "MB"
    else:
        if any(keyword in route_path for keyword in ["/claims", "/prices", "/shipments", "/chatbot"]):
            prefix = "CL"
        elif "/manufacture" in route_path:
            prefix = "MA"
        else:
            prefix = "AD"
            
    query = text("SELECT default_code FROM system_screens WHERE default_code LIKE :prefix")
    result = db.execute(query, {"prefix": f"{prefix}%"}).fetchall()
    
    import re
    max_num = 0
    for row in result:
        code = row[0]
        match = re.match(rf"{prefix}(\d+)", code)
        if match:
            num = int(match.group(1))
            if num > max_num:
                max_num = num
                
    has_params = ":" in route_path
    if has_params:
        base_path = route_path.split("/:")[0]
        base_query = text("SELECT default_code FROM system_screens WHERE route_path = :base_path AND platform = :platform")
        base_result = db.execute(base_query, {"base_path": base_path, "platform": platform}).fetchone()
        if base_result:
            base_code = base_result[0]
            sub_query = text("SELECT default_code FROM system_screens WHERE default_code LIKE :base_code_dot AND platform = :platform")
            sub_result = db.execute(sub_query, {"base_code_dot": f"{base_code}.%", "platform": platform}).fetchall()
            max_sub = 0
            for sub_row in sub_result:
                sub_code = sub_row[0]
                try:
                    sub_num = int(sub_code.split(".")[-1])
                    if sub_num > max_sub:
                        max_sub = sub_num
                except ValueError:
                    pass
            return f"{base_code}.{max_sub + 1}"
            
    return f"{prefix}{max_num + 1}"

def auto_register_missing_screens(db):
    print("[AUTO-REGISTER] Scanning for missing frontend routes...")
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    
    web_app_file = os.path.join(base_dir, "FrontEnd", "Web", "Shared", "app", "App.jsx")
    mobile_app_file = os.path.join(base_dir, "FrontEnd", "Mobile", "app", "App.jsx")
    
    web_routes = extract_routes_from_file(web_app_file)
    mobile_routes = extract_routes_from_file(mobile_app_file)
    
    print(f"[AUTO-REGISTER] Found {len(web_routes)} Web routes and {len(mobile_routes)} Mobile routes.")
    
    # Process Web routes
    for route in web_routes:
        if route in ["/login", "/"]:
            continue
        
        # Check if already registered
        check_query = text("SELECT COUNT(*) FROM system_screens WHERE route_path = :route_path AND platform = 'Web'")
        exists = db.execute(check_query, {"route_path": route}).fetchone()[0]
        
        if exists == 0:
            next_code = get_next_screen_code(db, "Web", route)
            title = generate_default_title(route)
            subtitle = f"Tự động đăng ký cho {route}"
            
            insert_sql = text("""
                INSERT INTO system_screens (platform, route_path, default_code, current_code, title, subtitle, is_active, status, updated_at)
                VALUES ('Web', :route_path, :code, :code, :title, :subtitle, 1, N'Mới thiết kế', :updated_at)
            """)
            db.execute(insert_sql, {
                "route_path": route,
                "code": next_code,
                "title": title,
                "subtitle": subtitle,
                "updated_at": datetime.now()
            })
            db.commit()
            print(f"[AUTO-REGISTER] Registered NEW Web route: {route} -> Code: {next_code}, Title: {title}")
            
    # Process Mobile routes
    for route in mobile_routes:
        if route in ["/login", "/"]:
            continue
            
        # Check if already registered
        check_query = text("SELECT COUNT(*) FROM system_screens WHERE route_path = :route_path AND platform = 'Mobile'")
        exists = db.execute(check_query, {"route_path": route}).fetchone()[0]
        
        if exists == 0:
            next_code = get_next_screen_code(db, "Mobile", route)
            title = generate_default_title(route)
            subtitle = f"Tự động đăng ký cho {route}"
            
            insert_sql = text("""
                INSERT INTO system_screens (platform, route_path, default_code, current_code, title, subtitle, is_active, status, updated_at)
                VALUES ('Mobile', :route_path, :code, :code, :title, :subtitle, 1, N'Mới thiết kế', :updated_at)
            """)
            db.execute(insert_sql, {
                "route_path": route,
                "code": next_code,
                "title": title,
                "subtitle": subtitle,
                "updated_at": datetime.now()
            })
            db.commit()
            print(f"[AUTO-REGISTER] Registered NEW Mobile route: {route} -> Code: {next_code}, Title: {title}")

def upgrade():
    """Create system_screens table and seed it"""
    db = next(get_db())
    try:
        # Check if table exists
        table_exists_query = text("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'system_screens'")
        table_exists = db.execute(table_exists_query).fetchone()[0]
        
        if table_exists == 0:
            print("Creating system_screens table...")
            create_table_sql = text("""
                CREATE TABLE system_screens (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    platform NVARCHAR(20) NOT NULL,
                    route_path NVARCHAR(150) NOT NULL,
                    default_code NVARCHAR(20) NOT NULL,
                    current_code NVARCHAR(20) NOT NULL,
                    title NVARCHAR(100) NOT NULL,
                    subtitle NVARCHAR(150) NULL,
                    is_active BIT NOT NULL DEFAULT 1,
                    status NVARCHAR(50) NOT NULL DEFAULT N'Mới thiết kế',
                    target_date NVARCHAR(20) NULL,
                    mockup_path NVARCHAR(1000) NULL,
                    updated_at DATETIME NULL,
                    CONSTRAINT UQ_platform_route UNIQUE (platform, route_path)
                )
            """)
            db.execute(create_table_sql)
            db.commit()
            print("[OK] Created system_screens table with composite unique constraint")
        else:
            print("[INFO] system_screens table already exists, checking for dynamic column updates.")
            try:
                dialect = db.bind.dialect.name
                if dialect == 'sqlite':
                    existing_cols = [row[1] for row in db.execute(text("PRAGMA table_info(system_screens)")).fetchall()]
                else:
                    cols_query = text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'system_screens'")
                    existing_cols = [r[0] for r in db.execute(cols_query).fetchall()]
                
                if 'status' not in existing_cols:
                    print("Adding 'status' column to system_screens table...")
                    db.execute(text("ALTER TABLE system_screens ADD status NVARCHAR(50) NOT NULL DEFAULT N'Mới thiết kế'"))
                    db.commit()
                if 'target_date' not in existing_cols:
                    print("Adding 'target_date' column to system_screens table...")
                    db.execute(text("ALTER TABLE system_screens ADD target_date NVARCHAR(20) NULL"))
                    db.commit()
                if 'mockup_path' not in existing_cols:
                    print("Adding 'mockup_path' column to system_screens table...")
                    db.execute(text("ALTER TABLE system_screens ADD mockup_path NVARCHAR(1000) NULL"))
                    db.commit()
            except Exception as alter_err:
                print(f"Error altering system_screens: {alter_err}")
            
        # Clean up corrupted auto-registered routes from Web platform
        cleanup_sql = text("""
            DELETE FROM system_screens 
            WHERE platform = 'Web' 
              AND route_path NOT LIKE '/admin%' 
              AND route_path NOT LIKE '/manufacture%' 
              AND route_path NOT LIKE '/login' 
              AND route_path NOT LIKE '/common%' 
              AND route_path <> '/'
        """)
        db.execute(cleanup_sql)
        db.commit()
        print("[OK] Cleaned up incorrect auto-registered routes from system_screens")
        
        # Seed initial data
        print("Seeding initial screen configurations...")
        for screen in INITIAL_SCREENS:
            # Check if this route already exists
            check_route = text("SELECT COUNT(*) FROM system_screens WHERE route_path = :route_path AND platform = :platform")
            route_exists = db.execute(check_route, {"route_path": screen["route_path"], "platform": screen["platform"]}).fetchone()[0]
            
            if route_exists == 0:
                insert_sql = text("""
                    INSERT INTO system_screens (platform, route_path, default_code, current_code, title, subtitle, is_active, status, updated_at)
                    VALUES (:platform, :route_path, :default_code, :current_code, :title, :subtitle, 1, N'Mới thiết kế', :updated_at)
                """)
                db.execute(insert_sql, {
                    "platform": screen["platform"],
                    "route_path": screen["route_path"],
                    "default_code": screen["default_code"],
                    "current_code": screen["current_code"],
                    "title": screen["title"],
                    "subtitle": screen["subtitle"],
                    "updated_at": datetime.now()
                })
                print(f"[OK] Seeded route {screen['route_path']} ({screen['platform']})")
            else:
                # Update details if exists
                update_sql = text("""
                    UPDATE system_screens 
                    SET default_code = :default_code, title = :title, subtitle = :subtitle, updated_at = :updated_at
                    WHERE route_path = :route_path AND platform = :platform
                """)
                db.execute(update_sql, {
                    "platform": screen["platform"],
                    "route_path": screen["route_path"],
                    "default_code": screen["default_code"],
                    "title": screen["title"],
                    "subtitle": screen["subtitle"],
                    "updated_at": datetime.now()
                })
                print(f"[SKIP/UPDATE] Route {screen['route_path']} ({screen['platform']}) already exists, updated details")
                
        db.commit()
        print("[SUCCESS] Seeding completed!")
        
        # Run auto-registration of missing screens
        # try:
        #     auto_register_missing_screens(db)
        # except Exception as e:
        #     err_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
        #     print(f"[AUTO-REGISTER] Failed: {err_msg}")
        
    except Exception as e:
        db.rollback()
        err_msg = str(e).encode('ascii', errors='ignore').decode('ascii')
        print(f"[ERROR] Migration failed: {err_msg}")
        raise

if __name__ == "__main__":
    upgrade()
