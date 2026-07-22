import os
import re
import glob

WEB_DIR = r"m:\ERP\FrontEnd\Web"
FRONTEND_DIR = r"m:\ERP\FrontEnd"

# Standard JS and browser globals, plus common React/Lucide imports
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
    # import { a, b as c } from '...'
    for match in re.findall(r"import\s+([\s\S]+?)\s+from", code):
        clean = match.replace("{", "").replace("}", "").replace("* as", "")
        for part in clean.split(","):
            name = part.strip().split(" as ")[-1].strip()
            if re.match(r"^[a-zA-Z0-9_]+$", name):
                imported_names.add(name)
    # import x from '...'
    for match in re.findall(r"import\s+([a-zA-Z0-9_]+)\s+from", code):
        imported_names.add(match)

    # 2. Gather all local declarations inside the file
    local_declarations = set()
    # const x =, let x =, var x =, function x(), class x
    for match in re.findall(r"\b(?:const|let|var|function|class)\s+([a-zA-Z0-9_]+)\b", code):
        local_declarations.add(match)
    
    # const [x, setX] = ...
    for match in re.findall(r"const\s*\[\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*\]", code):
        local_declarations.add(match[0])
        local_declarations.add(match[1])

    # const { x, y } = ...
    for match in re.findall(r"const\s*\{([^}]+)\}", code):
        for item in match.split(','):
            item_clean = item.strip().split(':')[0].strip().split('=')[0].strip()
            if re.match(r"^[a-zA-Z0-9_]+$", item_clean):
                local_declarations.add(item_clean)

    # Component parameter list (e.g. props or destructured params)
    # const Component = ({ a, b }) => {
    # Let's check parameters of the main component
    comp_matches = re.finditer(r"(?:const|function)\s+[A-Z][a-zA-Z0-9_]*\s*=\s*\(([^)]*)\)\s*=>", code)
    for m in comp_matches:
        params_str = m.group(1)
        params_clean = params_str.replace("{", "").replace("}", "").replace("[", "").replace("]", "")
        for p in params_clean.split(","):
            p_name = p.strip().split("=")[0].strip()
            if re.match(r"^[a-zA-Z0-9_]+$", p_name):
                local_declarations.add(p_name)

    # 3. Find all custom hook usages and their destructured variables
    hook_variables = set()
    destruct_hook_matches = re.finditer(r"const\s*\{([^}]+)\}\s*=\s*(use[A-Za-z0-9_]+|[a-zA-Z0-9_]+)\s*\(", code)
    for m in destruct_hook_matches:
        destructed_str, _ = m.groups()
        for p in re.split(r"[,\n]", destructed_str):
            p_clean = p.strip().split(":")[0].split("=")[0].strip()
            if re.match(r"^[a-zA-Z0-9_]+$", p_clean):
                hook_variables.add(p_clean)

    # 4. Extract all identifiers inside JSX expressions {...}
    # E.g. {items.map(item => <div key={item.id}>{item.name}</div>)}
    # Let's extract everything between { and } that is not within quotes
    jsx_exprs = []
    # Simple recursive balancer to find { ... } pairs
    idx = 0
    while True:
        start = code.find("{", idx)
        if start == -1:
            break
        # Find matching }
        balance = 1
        curr = start + 1
        while curr < len(code) and balance > 0:
            if code[curr] == "{":
                balance += 1
            elif code[curr] == "}":
                balance -= 1
            curr += 1
        if balance == 0:
            jsx_exprs.append(code[start+1:curr-1])
            idx = curr
        else:
            idx = start + 1

    # In each JSX expression, find all words/identifiers
    # We should exclude:
    # - Property access keys (e.g. the 'name' in 'item.name', which is preceded by a dot)
    # - String literals or keywords
    # - Object key definitions (e.g. 'color' in '{ color: "red" }')
    for expr in jsx_exprs:
        # Find all words that could be variable references
        # Let's exclude words preceded by a dot: (?<!\.)\b[a-zA-Z0-9_]+\b
        words = re.findall(r"(?<!\.)\b([a-zA-Z_][a-zA-Z0-9_]*)\b", expr)
        
        # Exclude object keys in object literals: e.g. { color: 'red' }
        # If a word is followed by a colon, it is likely an object key
        keys_followed_by_colon = set(re.findall(r"\b([a-zA-Z_][a-zA-Z0-9_]*)\s*:", expr))

        for word in words:
            if word in keys_followed_by_colon:
                # But wait, could it be a ternary condition or something? Usually not
                continue
            if word in ["className", "style", "key", "onClick", "onChange", "onSubmit", "type", "placeholder", "value", "id", "name"]:
                # JSX properties or common HTML keywords
                continue
            if word in ["map", "filter", "reduce", "find", "some", "every", "includes", "length"]:
                # Common JS array methods/properties
                continue
            if word in ["const", "let", "var", "function", "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "typeof", "instanceof", "new", "in"]:
                # JS keywords
                continue
            
            # Check if defined
            if (word not in standard_globals and 
                word not in imported_names and 
                word not in local_declarations and 
                word not in hook_variables):
                # Also check if it is defined locally inside this JSX expression (like 'item' in 'items.map(item => ...)')
                # e.g., variable in map/filter callback: (item) => or item =>
                lambda_params = re.findall(r"\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=>", expr)
                if word in lambda_params:
                    continue
                # function params inside local functions
                print(f"[UNDEFINED JSX VARIABLE] {rel_path}: '{word}' in expression {{{expr[:60]}...}}")

def main():
    jsx_files = glob.glob(os.path.join(WEB_DIR, "**", "*.jsx"), recursive=True)
    print(f"Scanning {len(jsx_files)} JSX files for undefined variables in JSX expressions...")
    for f in jsx_files:
        analyze_jsx_file(f)
    print("Scan completed.")

if __name__ == "__main__":
    main()
