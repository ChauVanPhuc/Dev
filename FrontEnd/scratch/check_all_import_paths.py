import os
import re
import glob

WEB_DIR = r"m:\ERP\FrontEnd\Web"
FRONTEND_DIR = r"m:\ERP\FrontEnd"

aliases = {
    "@modules": os.path.join(WEB_DIR, "modules"),
    "@webShared": os.path.join(WEB_DIR, "Shared"),
    "@shared": os.path.join(WEB_DIR, "Shared"),
}

def resolve_import(import_path, source_file):
    resolved = None
    if import_path.startswith("."):
        dir_name = os.path.dirname(source_file)
        resolved = os.path.normpath(os.path.join(dir_name, import_path))
    else:
        for alias, target in aliases.items():
            if import_path.startswith(alias):
                resolved = os.path.normpath(import_path.replace(alias, target, 1))
                break

    if not resolved:
        return None

    # Check potential file paths
    possible = [resolved]
    if not resolved.endswith(('.jsx', '.js', '.json', '.css', '.png', '.jpg', '.svg')):
        possible.append(resolved + '.jsx')
        possible.append(resolved + '.js')
        possible.append(os.path.join(resolved, 'index.jsx'))
        possible.append(os.path.join(resolved, 'index.js'))

    for p in possible:
        if os.path.exists(p) and os.path.isfile(p):
            return p
    return False

def check_all_imports():
    print("=== CHECKING ALL IMPORTS IN FRONTEND/WEB ===")
    all_files = glob.glob(os.path.join(WEB_DIR, "**", "*.jsx"), recursive=True) + \
                glob.glob(os.path.join(WEB_DIR, "**", "*.js"), recursive=True)

    broken_imports = []

    for file_path in all_files:
        rel_source = os.path.relpath(file_path, FRONTEND_DIR)
        with open(file_path, "r", encoding="utf-8") as f:
            code = f.read()

        # Find import statements: import ... from '...' or import('...')
        imports = re.findall(r"(?:import|from)\s+['\"]([^'\"]+)['\"]", code) + \
                  re.findall(r"import\(['\"]([^'\"]+)['\"]\)", code)

        for imp in imports:
            if imp.startswith(".") or imp.startswith("@"):
                res = resolve_import(imp, file_path)
                if res is False:
                    print(f"[BROKEN IMPORT] In '{rel_source}': import '{imp}' DOES NOT EXIST!")
                    broken_imports.append((rel_source, imp))

    print(f"\nTotal files scanned: {len(all_files)}. Total broken relative/alias imports: {len(broken_imports)}")

check_all_imports()
