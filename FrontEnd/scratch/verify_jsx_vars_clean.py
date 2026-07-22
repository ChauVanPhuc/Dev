import os
import re
import glob

WEB_DIR = r"m:\ERP\FrontEnd\Web"
FRONTEND_DIR = r"m:\ERP\FrontEnd"

# Standard JS and browser globals
standard_globals = {
    "console", "window", "document", "localStorage", "sessionStorage", "JSON", "Math", "Date",
    "setTimeout", "clearTimeout", "setInterval", "clearInterval", "Array", "Object", "String",
    "Number", "Boolean", "RegExp", "Error", "Promise", "navigator", "location", "history",
    "parseInt", "parseFloat", "isNaN", "isFinite", "encodeURIComponent", "decodeURIComponent",
    "React", "useState", "useEffect", "useRef", "useMemo", "useCallback", "useContext", "useReducer",
    "useTransition", "useDeferredValue", "useId", "useLayoutEffect", "useImperativeHandle",
    "useInsertionEffect", "useDebugValue", "useSyncExternalStore", "Fragment", "Suspense", "lazy",
    "undefined", "null", "true", "false", "NaN", "Infinity", "event", "arguments"
}

def analyze_jsx_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        code = f.read()

    rel_path = os.path.relpath(file_path, FRONTEND_DIR)

    # 1. Gather all imported names
    imported_names = set()
    for match in re.findall(r"import\s+([\s\S]+?)\s+from", code):
        clean = match.replace("{", "").replace("}", "").replace("* as", "")
        for part in clean.split(","):
            name = part.strip().split(" as ")[-1].strip()
            if re.match(r"^[a-zA-Z0-9_]+$", name):
                imported_names.add(name)
    for match in re.findall(r"import\s+([a-zA-Z0-9_]+)\s+from", code):
        imported_names.add(match)

    # 2. Gather all local declarations inside the file
    local_declarations = set()
    for match in re.findall(r"\b(?:const|let|var|function|class)\s+([a-zA-Z0-9_]+)\b", code):
        local_declarations.add(match)
    
    for match in re.findall(r"const\s*\[\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*\]", code):
        local_declarations.add(match[0])
        local_declarations.add(match[1])

    for match in re.findall(r"const\s*\{([^}]+)\}", code):
        for item in match.split(','):
            item_clean = item.strip().split(':')[0].strip().split('=')[0].strip()
            if re.match(r"^[a-zA-Z0-9_]+$", item_clean):
                local_declarations.add(item_clean)

    # Param list
    comp_matches = re.finditer(r"(?:const|function)\s+[A-Z][a-zA-Z0-9_]*\s*=\s*\(([^)]*)\)\s*=>", code)
    for m in comp_matches:
        params_str = m.group(1)
        params_clean = params_str.replace("{", "").replace("}", "").replace("[", "").replace("]", "")
        for p in params_clean.split(","):
            p_name = p.strip().split("=")[0].strip()
            if re.match(r"^[a-zA-Z0-9_]+$", p_name):
                local_declarations.add(p_name)

    # 3. Find custom hooks destructures
    destruct_hook_matches = re.finditer(r"const\s*\{([^}]+)\}\s*=\s*(use[A-Za-z0-9_]+|[a-zA-Z0-9_]+)\s*\(", code)
    for m in destruct_hook_matches:
        destructed_str, _ = m.groups()
        for p in re.split(r"[,\n]", destructed_str):
            p_clean = p.strip().split(":")[0].split("=")[0].strip()
            if re.match(r"^[a-zA-Z0-9_]+$", p_clean):
                local_declarations.add(p_clean)

    # 4. Locate only the JSX return statement
    # Find 'return (' or 'return\s*<'
    ret_matches = list(re.finditer(r"return\s*\(|return\s*<", code))
    if not ret_matches:
        return

    # Process all JSX blocks found
    for ret_match in ret_matches:
        start_jsx = ret_match.end() - 1
        # Balance parentheses or XML tags to find the end of JSX
        balance = 1
        curr = start_jsx + 1
        jsx_exprs = []
        
        while curr < len(code):
            if code[curr] == "{":
                # Extract the expression between { and }
                inner_balance = 1
                inner_curr = curr + 1
                while inner_curr < len(code) and inner_balance > 0:
                    if code[inner_curr] == "{":
                        inner_balance += 1
                    elif code[inner_curr] == "}":
                        inner_balance -= 1
                    inner_curr += 1
                if inner_balance == 0:
                    jsx_exprs.append(code[curr+1:inner_curr-1])
                    curr = inner_curr
                    continue
            curr += 1

        for expr in jsx_exprs:
            # Exclude words preceded by a dot
            words = re.findall(r"(?<!\.)\b([a-zA-Z_][a-zA-Z0-9_]*)\b", expr)
            keys_followed_by_colon = set(re.findall(r"\b([a-zA-Z_][a-zA-Z0-9_]*)\s*:", expr))
            lambda_params = set(re.findall(r"\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=>", expr))

            for word in words:
                if word in keys_followed_by_colon:
                    continue
                if word in lambda_params:
                    continue
                if word in ["className", "style", "key", "onClick", "onChange", "onSubmit", "type", "placeholder", "value", "id", "name"]:
                    continue
                if word in ["map", "filter", "reduce", "find", "some", "every", "includes", "length"]:
                    continue
                if word in ["const", "let", "var", "function", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "typeof", "instanceof", "new", "in"]:
                    continue
                
                # Check if defined
                if (word not in standard_globals and 
                    word not in imported_names and 
                    word not in local_declarations):
                    
                    # Convert non-ascii message print to ascii representation to avoid cp1252 encoding errors
                    sanitized_expr = expr[:60].encode('ascii', errors='replace').decode('ascii')
                    print(f"[UNDEFINED JSX VARIABLE] {rel_path}: '{word}' in expression {{{sanitized_expr}...}}")

def main():
    jsx_files = glob.glob(os.path.join(WEB_DIR, "**", "*.jsx"), recursive=True)
    print(f"Scanning {len(jsx_files)} JSX files for undefined variables in JSX expressions...")
    for f in jsx_files:
        analyze_jsx_file(f)
    print("Scan completed.")

if __name__ == "__main__":
    main()
