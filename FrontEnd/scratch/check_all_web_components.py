import os
import re
import glob

WEB_DIR = r"m:\ERP\FrontEnd\Web"

def find_all_unresolved_tags():
    print("--- 1. CHECKING ALL JSX FILES FOR UNRESOLVED TAGS (MISSING IMPORTS) ---")
    files = glob.glob(os.path.join(WEB_DIR, "**", "*.jsx"), recursive=True) + \
            glob.glob(os.path.join(WEB_DIR, "**", "*.js"), recursive=True)
    
    html_svg_tags = {
        "Fragment", "React", "Suspense", "div", "span", "p", "a", "button", "input", "select", "option",
        "textarea", "h1", "h2", "h3", "h4", "h5", "h6", "table", "thead", "tbody", "tr", "th", "td",
        "ul", "ol", "li", "form", "label", "img", "svg", "path", "circle", "rect", "line", "polyline",
        "polygon", "g", "defs", "linearGradient", "stop", "use", "canvas", "iframe", "main", "header",
        "footer", "nav", "section", "article", "aside", "small", "strong", "b", "i", "em", "code", "pre"
    }

    issues_found = 0
    for file_path in files:
        rel_path = os.path.relpath(file_path, WEB_DIR)
        with open(file_path, "r", encoding="utf-8") as f:
            code = f.read()
        
        # Extract component name if any (e.g. const X = ...)
        # Find all JSX element opening tags <CapitalizedName
        jsx_tags = set(re.findall(r"<([A-Z][a-zA-Z0-9_]*)\b", code))
        
        # Find all imported names in the file
        imported_names = set()
        # default imports: import Name from ...
        for d in re.findall(r"import\s+([A-Z][a-zA-Z0-9_]*)\s+from", code):
            imported_names.add(d)
        # named imports: import { A, B as C } from ...
        for n in re.findall(r"import\s+[\s\S]*?\{([\s\S]*?)\}\s*from", code):
            for item in n.split(","):
                item = item.strip()
                if item:
                    alias = item.split(" as ")[-1].strip()
                    if alias and alias[0].isupper():
                        imported_names.add(alias)
        
        # Local component/const definitions in same file: const MyComp = ... or function MyComp...
        local_defs = set(re.findall(r"(?:const|function|class)\s+([A-Z][a-zA-Z0-9_]*)", code))

        unresolved = jsx_tags - imported_names - local_defs - html_svg_tags
        if unresolved:
            print(f"[MISSING IMPORT] In '{rel_path}': JSX uses tags {unresolved} but they are NOT imported or defined!")
            issues_found += 1

    print(f"\nTotal unresolved import issues found: {issues_found}\n")

find_all_unresolved_tags()
