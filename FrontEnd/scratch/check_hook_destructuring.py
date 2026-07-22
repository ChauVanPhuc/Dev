import os
import re
import glob

WEB_DIR = r"m:\ERP\FrontEnd\Web"

def find_all_hooks_and_views():
    files = glob.glob(os.path.join(WEB_DIR, "**", "*.jsx"), recursive=True) + \
            glob.glob(os.path.join(WEB_DIR, "**", "*.js"), recursive=True)
    
    hooks = [f for f in files if "use" in os.path.basename(f)]
    print(f"Found {len(hooks)} hook files.")
    
    for hook_path in hooks:
        with open(hook_path, "r", encoding="utf-8") as f:
            code = f.read()
        
        # find return statement of hook
        # usually return { key1, key2, ... } at the end
        matches = re.findall(r"return\s*\{([\s\S]*?)\}\s*;\s*\}", code)
        if not matches:
            # try alternative return match
            matches = re.findall(r"return\s*\{([\s\S]*?)\}\s*$", code.strip())
        
        if matches:
            returned_text = matches[-1]
            # extract keys returned
            # lines with key, or key: val
            returned_keys = set()
            for token in re.split(r"[,\n]", returned_text):
                token = token.strip()
                if not token or token.startswith("//") or token.startswith("/*"):
                    continue
                key = token.split(":")[0].strip()
                if re.match(r"^[a-zA-Z0-9_]+$", key):
                    returned_keys.add(key)
            
            hook_name = os.path.basename(hook_path).replace(".jsx", "").replace(".js", "")
            
            # Now search where this hook is used across all files
            for view_path in files:
                if view_path == hook_path:
                    continue
                with open(view_path, "r", encoding="utf-8") as vf:
                    view_code = vf.read()
                if hook_name in view_code:
                    # check destructuring
                    # const { a, b } = useHook(...)
                    destructures = re.findall(r"const\s*\{([\s\S]*?)\}\s*=\s*" + hook_name + r"\s*\(", view_code)
                    for dest in destructures:
                        for token in re.split(r"[,\n]", dest):
                            token = token.strip()
                            if not token or token.startswith("//"):
                                continue
                            used_key = token.split(":")[0].strip().split("=")[0].strip()
                            if re.match(r"^[a-zA-Z0-9_]+$", used_key):
                                if used_key not in returned_keys:
                                    print(f"[MISSING HOOK RETURN] File '{os.path.relpath(view_path, WEB_DIR)}' destructures '{used_key}' from '{hook_name}', but '{hook_name}' DOES NOT RETURN '{used_key}'!")

find_all_hooks_and_views()
