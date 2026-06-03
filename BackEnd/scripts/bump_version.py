import re
import os
import sys

def bump_version(new_version, release_notes="Bản cập nhật mới"):
    # Sanitize version string (only keep digits and dots, stripping control chars/ANSI sequences)
    new_version = re.sub(r'[^0-9.]', '', new_version)
    
    # Sanitize release_notes: Strip ANSI escape sequences and control characters from Git Bash
    release_notes = re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', release_notes)  # Strip ANSI escape codes
    release_notes = re.sub(r'\x1b\[?', '', release_notes)  # Strip partial ANSI sequences
    release_notes = re.sub(r'[\x00-\x1f\x7f]', '', release_notes)  # Strip all control characters
    release_notes = release_notes.strip()
    if not release_notes:
        release_notes = f"Ban cap nhat {new_version}"
    
    # Convert "1.1.4" to "114" for versionCode
    version_code = "".join(filter(str.isdigit, new_version))
    
    # Get workspace root (assumed to be parent of BackEnd/scripts or current working dir)
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    if not os.path.exists(os.path.join(root, "BackEnd")):
        root = os.getcwd()
    
    # 1. Update FrontEnd/Mobile/package.json
    pkg_path = os.path.join(root, "FrontEnd", "Mobile", "package.json")
    if os.path.exists(pkg_path):
        with open(pkg_path, 'r', encoding='utf-8') as f:
            content = f.read()
        content = re.sub(r'"version":\s*".*?"', f'"version": "{new_version}"', content)
        with open(pkg_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"[OK] Updated FrontEnd/Mobile/package.json to {new_version}")

    # 2. Update FrontEnd/Mobile/android/app/build.gradle
    gradle_path = os.path.join(root, "FrontEnd", "Mobile", "android", "app", "build.gradle")
    if os.path.exists(gradle_path):
        with open(gradle_path, 'r', encoding='utf-8') as f:
            content = f.read()
        content = re.sub(r'versionCode\s*\d*', f'versionCode {version_code}', content)
        content = re.sub(r'versionName\s+".*?"', f'versionName "{new_version}"', content)
        with open(gradle_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"[OK] Updated Android build.gradle to {new_version} (Code: {version_code})")

    # 3. Update BackEnd/modules/system/routes/system_router.py
    sys_router_path = os.path.join(root, "BackEnd", "modules", "system", "routes", "system_router.py")
    if os.path.exists(sys_router_path):
        with open(sys_router_path, 'r', encoding='utf-8') as f:
            content = f.read()
        content = re.sub(r'latest_version = ".*?"', f'latest_version = "{new_version}"', content)
        content = re.sub(r'"release_notes": ".*?"', f'"release_notes": "{release_notes}"', content)
        content = re.sub(r'file_name = "SmartFlow_v.*?\.apk"', f'file_name = "SmartFlow_v{new_version}.apk"', content)
        content = re.sub(r'filename="SmartFlow_v.*?\.apk"', f'filename="SmartFlow_v{new_version}.apk"', content)
        with open(sys_router_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"[OK] Updated Backend modules/system/routes/system_router.py to {new_version}")

    # 4. Update ONE_CLICK_PUBLISH.bat
    pub_path = os.path.join(root, "ONE_CLICK_PUBLISH.bat")
    if os.path.exists(pub_path):
        with open(pub_path, 'r', encoding='utf-8') as f:
            content = f.read()
        content = re.sub(r'SmartFlow_v.*?\.apk', f'SmartFlow_v{new_version}.apk', content)
        with open(pub_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"[OK] Updated ONE_CLICK_PUBLISH.bat to {new_version}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python bump_version.py <new_version> [release_notes]")
        sys.exit(1)
    
    # Sanitize raw input FIRST before using in default notes
    raw_ver = sys.argv[1]
    clean_ver = re.sub(r'[^0-9.]', '', raw_ver)
    notes = sys.argv[2] if len(sys.argv) > 2 else f"Ban cap nhat {clean_ver}"
    bump_version(raw_ver, notes)
