import os
import re

APP_JSX = r"m:\ERP\FrontEnd\Web\Shared\app\App.jsx"
WEB_DIR = r"m:\ERP\FrontEnd\Web"
FRONTEND_DIR = r"m:\ERP\FrontEnd"

aliases = [
    ("@webShared", os.path.join(WEB_DIR, "Shared")),
    ("@shared", os.path.join(FRONTEND_DIR, "shared")),
    ("@web", WEB_DIR),
    ("@mobile", os.path.join(FRONTEND_DIR, "Mobile")),
    ("@styles", os.path.join(WEB_DIR, "Shared", "styles")),
    ("@assets", os.path.join(WEB_DIR, "Shared", "assets")),
    ("@modules", os.path.join(WEB_DIR, "modules"))
]

def resolve_import(import_path, source_file):
    resolved = None
    if import_path.startswith("."):
        dir_name = os.path.dirname(source_file)
        resolved = os.path.normpath(os.path.join(dir_name, import_path))
    else:
        for alias, target in aliases:
            if import_path.startswith(alias):
                resolved = os.path.normpath(import_path.replace(alias, target, 1))
                break

    if not resolved:
        return None

    possible = [resolved]
    if not resolved.endswith(('.jsx', '.js')):
        possible.append(resolved + '.jsx')
        possible.append(resolved + '.js')
        possible.append(os.path.join(resolved, 'index.jsx'))
        possible.append(os.path.join(resolved, 'index.js'))

    for p in possible:
        if os.path.exists(p) and os.path.isfile(p):
            return p
    return False

def check_lazy_imports():
    with open(APP_JSX, "r", encoding="utf-8") as f:
        code = f.read()

    # Find all lazy imports: const X = lazy(() => import('path'))
    lazy_imports = re.findall(r"const\s+([A-Za-z0-9_]+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(['\"]([^'\"]+)['\"]\)\)", code)
    print(f"Found {len(lazy_imports)} lazy imports in App.jsx")

    for var_name, import_path in lazy_imports:
        resolved = resolve_import(import_path, APP_JSX)
        if not resolved:
            print(f"[BROKEN LAZY PATH] {var_name}: {import_path} (Cannot resolve)")
            continue

        with open(resolved, "r", encoding="utf-8") as rf:
            file_code = rf.read()

        # Find export default
        exp_match = re.search(r"export\s+default\s+([A-Za-z0-9_]+)", file_code)
        if not exp_match:
            print(f"[MISSING DEFAULT EXPORT] {var_name} in {import_path}")
            continue

        exp_name = exp_match.group(1)
        # Verify exp_name matches a definition in the file
        defined = re.search(r"\b(?:const|function|class|let|var|import)\s+.*?\b" + exp_name + r"\b", file_code)
        if not defined:
            print(f"[MISMATCHED EXPORT] {var_name} in {import_path}: exports '{exp_name}' which is NOT defined in file!")

if __name__ == "__main__":
    check_lazy_imports()
