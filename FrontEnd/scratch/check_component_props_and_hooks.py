import os
import re
import glob

WEB_DIR = r"m:\ERP\FrontEnd\Web"

def check_component_props_and_hooks():
    all_files = glob.glob(os.path.join(WEB_DIR, "**", "*.jsx"), recursive=True) + \
                glob.glob(os.path.join(WEB_DIR, "**", "*.js"), recursive=True)

    print(f"Scanning {len(all_files)} files for destructuring and scope issues...")

    for file_path in all_files:
        rel_path = os.path.relpath(file_path, WEB_DIR)
        with open(file_path, "r", encoding="utf-8") as f:
            code = f.read()

        # Check subcomponents that accept `editor` or `props`
        # e.g. const { foo, bar } = editor;
        # Check if `editor` might be null/undefined or if any hook returns are missing
        
        # Check 1: Unused or undefined handler calls in JSX
        # match onClick={() => handleSomething(...)}
        handlers1 = set(re.findall(r"onClick=\{[^\}]*\b(handle[A-Za-z0-9_]+)", code))
        handlers2 = set(re.findall(r"onChange=\{[^\}]*\b(handle[A-Za-z0-9_]+)", code))
        handlers3 = set(re.findall(r"onSubmit=\{[^\}]*\b(handle[A-Za-z0-9_]+)", code))
        handlers = handlers1 | handlers2 | handlers3

        # Check if handlers are defined in scope
        destructured_vars = set(re.findall(r"const\s*\{([\s\S]*?)\}\s*=\s*(?:editor|props|use[A-Za-z0-9_]+)", code))
        all_destructured = set()
        for d in destructured_vars:
            for line in d.split("\n"):
                for part in line.split(","):
                    k = part.split(":")[0].strip().split("=")[0].strip()
                    if k:
                        all_destructured.add(k)

        all_local_vars = set(re.findall(r"(?:const|let|var|function)\s+([a-zA-Z0-9_]+)", code))
        all_imports = set(re.findall(r"([a-zA-Z0-9_]+)", re.sub(r"import[\s\S]*?from", "", code)))

        # Find handler names used in JSX but nowhere defined or destructured or imported
        missing_handlers = set()
        for h in handlers:
            if h not in all_destructured and h not in all_local_vars and h not in all_imports:
                missing_handlers.add(h)

        if missing_handlers:
            print(f"[MISSING HANDLER] In '{rel_path}': Handlers {missing_handlers} used in JSX but NOT defined/destructured!")

check_component_props_and_hooks()
