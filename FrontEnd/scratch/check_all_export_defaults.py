import os
import re
import glob

WEB_DIR = r"m:\ERP\FrontEnd\Web"

def check_export_defaults():
    print("=== CHECKING ALL EXPORT DEFAULTS IN FRONTEND/WEB ===")
    all_files = glob.glob(os.path.join(WEB_DIR, "**", "*.jsx"), recursive=True) + \
                glob.glob(os.path.join(WEB_DIR, "**", "*.js"), recursive=True)

    mismatches = 0
    for file_path in all_files:
        rel_path = os.path.relpath(file_path, WEB_DIR)
        with open(file_path, "r", encoding="utf-8") as f:
            code = f.read()

        # Find export default Name; (or export default function Name / class Name)
        exports = re.findall(r"export\s+default\s+([A-Za-z0-9_]+)\s*;", code)
        for exp in exports:
            if exp in {"React", "null", "undefined", "true", "false"}:
                continue
            # Check if exp is defined in code
            # const exp =, function exp, class exp, let exp, var exp, import exp
            pattern = r"\b(?:const|function|class|let|var|import)\s+([\s\S]*?\b" + exp + r"\b)"
            if not re.search(r"\b(?:const|function|class|let|var|import)\s+.*?\b" + exp + r"\b", code):
                print(f"[EXPORT MISMATCH] In '{rel_path}': exports default '{exp}' BUT '{exp}' IS NOT DEFINED in file!")
                mismatches += 1

    print(f"\nTotal files scanned: {len(all_files)}. Total export mismatches: {mismatches}")

check_export_defaults()
