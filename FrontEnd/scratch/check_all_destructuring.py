import os
import re
import glob

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
    if not resolved.endswith(('.jsx', '.js', '.json', '.css', '.png', '.jpg', '.svg')):
        possible.append(resolved + '.jsx')
        possible.append(resolved + '.js')
        possible.append(os.path.join(resolved, 'index.jsx'))
        possible.append(os.path.join(resolved, 'index.js'))

    for p in possible:
        if os.path.exists(p) and os.path.isfile(p):
            return p
    return False

def check_destructuring_in_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        code = f.read()

    rel_source = os.path.relpath(file_path, FRONTEND_DIR)

    # Regex to find const { ... } = something
    # We want to match destructuring assignments: const { a, b } = useX() or hookVar;
    # Let's match all const/let { ... } = ...
    matches = re.finditer(r"(const|let)\s*\{([^}]+)\}\s*=\s*([a-zA-Z0-9_]+(?:\([^)]*\))?)\s*;", code)
    for m in matches:
        _, destructed_str, source_expr = m.groups()
        
        # Parse the keys being destructured
        destructured_keys = []
        for p in re.split(r"[,\n]", destructed_str):
            p_clean = p.strip().split(":")[0].split("=")[0].strip()
            if re.match(r"^[a-zA-Z0-9_]+$", p_clean):
                destructured_keys.append(p_clean)

        # Now try to identify if the source_expr is a hook call or a hook variable
        # e.g., useScreenDetail() or bugManager or useClaimList()
        hook_name = None
        source_clean = source_expr.strip()
        if source_clean.startswith("use") and "(" in source_clean:
            hook_name = source_clean.split("(")[0].strip()
        else:
            # Maybe it is a variable assigned from a hook call earlier in the function
            # Let's search for: const source_clean = useHookName(
            var_assign = re.search(r"(const|let)\s+" + re.escape(source_clean) + r"\s*=\s*(use[a-zA-Z0-9_]+)\s*\(", code)
            if var_assign:
                hook_name = var_assign.group(2)

        if not hook_name:
            continue

        # Find the hook import path
        import_match = re.search(r"import\s+[\s\S]*?\b" + hook_name + r"\b[\s\S]*?from\s+['\"]([^'\"]+)['\"]", code)
        if not import_match:
            continue

        hook_imp = import_match.group(1)
        hook_resolved = resolve_import(hook_imp, file_path)
        if hook_resolved and os.path.exists(hook_resolved):
            with open(hook_resolved, "r", encoding="utf-8") as hf:
                hook_code = hf.read()
            
            # Find return block in hook
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
                    
                    # Verify each destructured key is returned
                    for dk in destructured_keys:
                        if dk not in returned_keys:
                            print(f"[MISSING HOOK RETURN] {rel_source}: destructures '{dk}' from '{hook_name}', but hook does not return it!")

def main():
    jsx_files = glob.glob(os.path.join(WEB_DIR, "**", "*.jsx"), recursive=True) + \
                glob.glob(os.path.join(WEB_DIR, "**", "*.js"), recursive=True)
    
    print(f"Scanning {len(jsx_files)} files for destructuring validation...")
    for f in jsx_files:
        check_destructuring_in_file(f)
    print("Scan completed.")

if __name__ == "__main__":
    main()
