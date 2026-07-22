import os
import re
import glob

WEB_DIR = r"m:\ERP\FrontEnd\Web"

def check_hook_self_returns():
    files = glob.glob(os.path.join(WEB_DIR, "**", "*.jsx"), recursive=True) + \
            glob.glob(os.path.join(WEB_DIR, "**", "*.js"), recursive=True)

    print("Checking all hooks for self-referencing return keys...")

    for file_path in files:
        rel_path = os.path.relpath(file_path, WEB_DIR)
        with open(file_path, "r", encoding="utf-8") as f:
            code = f.read()

        # Find function / hook names
        hooks = re.findall(r"export\s+const\s+(use[A-Za-z0-9_]+)\s*=", code)
        for hook_name in hooks:
            # check if hook_name is returned inside return { ... }
            if re.search(r"return\s*\{[\s\S]*?\b" + hook_name + r"\b[\s\S]*?\}", code):
                print(f"[HOOK SELF-RETURN BUG] In '{rel_path}': hook '{hook_name}' returns ITSELF in its return object!")

check_hook_self_returns()
