import os
import re
import glob

WEB_DIR = r"m:\ERP\FrontEnd\Web"
FRONTEND_DIR = r"m:\ERP\FrontEnd"

# Keep longer keys first to prevent partial matching (e.g. @webShared vs @shared)
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
        # Might be npm package (react, lucide-react, etc.)
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

def check_file_for_errors(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        code = f.read()

    rel_source = os.path.relpath(file_path, FRONTEND_DIR)
    
    # Check 1: Find export default matching
    exp_match = re.search(r"export\s+default\s+([A-Za-z0-9_]+)\s*;", code)
    if exp_match:
        exp_name = exp_match.group(1)
        if exp_name not in ["React", "null", "undefined", "true", "false"]:
            # Check if exp_name is defined in code
            if not re.search(r"\b(const|function|class|let|var|import)\s+.*?\b" + exp_name + r"\b", code):
                print(f"[EXPORT ERROR] {rel_source}: export default '{exp_name}' but it's not defined!")

    # Check 2: Check imports
    imports = re.findall(r"(?:import|from)\s+['\"]([^'\"]+)['\"]", code) + \
              re.findall(r"import\(['\"]([^'\"]+)['\"]\)", code)

    for imp in imports:
        if imp.startswith(".") or imp.startswith("@"):
            res = resolve_import(imp, file_path)
            if res is False:
                print(f"[BROKEN IMPORT] {rel_source}: import '{imp}' doesn't exist!")

    # Check 3: Check destructured properties in View vs Hook return
    destruct_hook_matches = re.finditer(r"const\s*\{([^}]+)\}\s*=\s*(use[A-Za-z0-9_]+)\s*\(", code)
    for match in destruct_hook_matches:
        destructed_str, hook_name = match.groups()
        import_match = re.search(r"import\s+[\s\S]*?\b" + hook_name + r"\b[\s\S]*?from\s+['\"]([^'\"]+)['\"]", code)
        if import_match:
            hook_imp = import_match.group(1)
            hook_resolved = resolve_import(hook_imp, file_path)
            if hook_resolved and os.path.exists(hook_resolved):
                with open(hook_resolved, "r", encoding="utf-8") as hf:
                    hook_code = hf.read()
                
                # Parse returned object of hook
                last_ret_idx = hook_code.rfind("return {")
                if last_ret_idx != -1:
                    sub = hook_code[last_ret_idx:]
                    ret_match = re.search(r"return\s*\{([\s\S]*?)\}", sub)
                    if ret_match:
                        returned_keys = set()
                        for p in re.split(r"[,\n]", ret_match.group(1)):
                            p_clean = p.strip().split(":")[0].strip()
                            if re.match(r"^[a-zA-Z0-9_]+$", p_clean):
                                returned_keys.add(p_clean)
                        
                        # Compare destructured keys
                        for dk in re.split(r"[,\n]", destructed_str):
                            dk_clean = dk.strip().split(":")[0].split("=")[0].strip()
                            if re.match(r"^[a-zA-Z0-9_]+$", dk_clean):
                                if dk_clean not in returned_keys:
                                    print(f"[MISSING HOOK RETURN] {rel_source}: destructures '{dk_clean}' from '{hook_name}', but hook does not return it!")

def main():
    all_files = glob.glob(os.path.join(WEB_DIR, "**", "*.jsx"), recursive=True) + \
                glob.glob(os.path.join(WEB_DIR, "**", "*.js"), recursive=True)
    
    print(f"Scanning {len(all_files)} files in Web directory...")
    for f in all_files:
        check_file_for_errors(f)
    print("Scan completed.")

if __name__ == "__main__":
    main()
