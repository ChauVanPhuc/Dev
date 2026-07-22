import os
import re
import glob

WEB_DIR = r"m:\ERP\FrontEnd\Web"

def find_all_views_and_hooks():
    views = glob.glob(os.path.join(WEB_DIR, "**", "*View.jsx"), recursive=True) + \
            glob.glob(os.path.join(WEB_DIR, "**", "*View.js"), recursive=True) + \
            glob.glob(os.path.join(WEB_DIR, "**", "*List.jsx"), recursive=True) + \
            glob.glob(os.path.join(WEB_DIR, "**", "*Editor.jsx"), recursive=True)
    
    # Filter unique files
    views = sorted(list(set(views)))
    print(f"Found {len(views)} primary view files.")

    for view_path in views:
        rel_path = os.path.relpath(view_path, WEB_DIR)
        with open(view_path, "r", encoding="utf-8") as f:
            code = f.read()

        # 1. Check default export
        default_exp = re.search(r"export\s+default\s+([A-Za-z0-9_]+)", code)
        if not default_exp:
            print(f"[MISSING DEFAULT EXPORT] In '{rel_path}'")
        else:
            exp_name = default_exp.group(1)
            # check if exp_name is defined in code
            if not re.search(r"\b(?:const|function|class|let|var|import)\s+.*?\b" + exp_name + r"\b", code):
                print(f"[MISMATCHED DEFAULT EXPORT] In '{rel_path}': exports default '{exp_name}' which is NOT defined in file!")

        # 2. Check custom hook usage and destructuring
        # const x = useHook(...)
        hooks_used = re.findall(r"(?:const|let)\s+([a-zA-Z0-9_]+|\{[^}]+\})\s*=\s*(use[A-Z][a-zA-Z0-9_]*)\s*\(", code)
        for target, hook_name in hooks_used:
            # find where hook_name is imported
            imp_match = re.search(r"import\s+[\s\S]*?\b" + hook_name + r"\b[\s\S]*?from\s+['\"]([^'\"]+)['\"]", code)
            if imp_match:
                imp_path = imp_match.group(1)
                # resolve imp_path relative to view_path
                dir_name = os.path.dirname(view_path)
                if imp_path.startswith("."):
                    hook_file = os.path.normpath(os.path.join(dir_name, imp_path))
                    if not hook_file.endswith(('.jsx', '.js')):
                        if os.path.exists(hook_file + '.jsx'):
                            hook_file += '.jsx'
                        elif os.path.exists(hook_file + '.js'):
                            hook_file += '.js'

                    if os.path.exists(hook_file):
                        with open(hook_file, "r", encoding="utf-8") as hf:
                            hook_code = hf.read()
                        
                        # get hook return keys
                        last_ret = hook_code.rfind("return {")
                        if last_ret != -1:
                            sub = hook_code[last_ret:]
                            ret_match = re.search(r"return\s*\{([\s\S]*?)\}", sub)
                            if ret_match:
                                returned_keys = set()
                                for line in ret_match.group(1).split("\n"):
                                    line_s = line.strip()
                                    if line_s and not line_s.startswith("//"):
                                        for p in line_s.split(","):
                                            k = p.split(":")[0].strip()
                                            if re.match(r"^[a-zA-Z0-9_]+$", k):
                                                returned_keys.add(k)
                                
                                # check if target is object destructuring { a, b, c }
                                if target.startswith("{"):
                                    destructured = [k.strip().split(":")[0].split("=")[0].strip() for k in target[1:-1].split(",") if k.strip()]
                                    for dk in destructured:
                                        if dk and dk not in returned_keys and not dk.startswith("//"):
                                            print(f"[MISSING HOOK RETURN] In '{rel_path}': destructures '{dk}' from '{hook_name}', but '{hook_name}' does NOT return '{dk}'!")

find_all_views_and_hooks()
