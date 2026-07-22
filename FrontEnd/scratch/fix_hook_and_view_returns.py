import os
import re

WEB_DIR = r"m:\ERP\FrontEnd\Web"

MODULES = [
    {
        "name": "DeliveryTracking",
        "view": os.path.join(WEB_DIR, "modules", "Delivery", "Views", "Tracking", "DeliveryTrackingView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "Delivery", "Views", "Tracking", "hooks", "useDeliveryTracking.jsx"),
        "var": "tracker",
        "func": "useDeliveryTracking"
    },
    {
        "name": "InspectionReports",
        "view": os.path.join(WEB_DIR, "modules", "Inspection", "Views", "Report", "InspectionReportsView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "Inspection", "Views", "Report", "hooks", "useInspectionReports.jsx"),
        "var": "reports",
        "func": "useInspectionReports"
    },
    {
        "name": "ScreenBugManagement",
        "view": os.path.join(WEB_DIR, "modules", "System", "Views", "Screen", "ScreenBugManagementView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "System", "Views", "Screen", "hooks", "useScreenBugManagement.jsx"),
        "var": "bugManager",
        "func": "useScreenBugManagement"
    },
    {
        "name": "ClaimList",
        "view": os.path.join(WEB_DIR, "modules", "Claim", "views", "Claim", "ClaimListView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "Claim", "views", "hooks", "useClaimList.jsx"),
        "var": "list",
        "func": "useClaimList"
    }
]

def process_module(mod):
    print(f"\nProcessing {mod['name']}...")
    hook_path = mod["hook"]
    view_path = mod["view"]

    with open(hook_path, "r", encoding="utf-8") as f:
        hook_code = f.read()

    # Find hook function definition
    hook_func_name = mod["func"]
    func_match = re.search(r"export\s+const\s+" + hook_func_name + r"\s*=\s*\([^)]*\)\s*=>\s*\{", hook_code)
    if not func_match:
        func_match = re.search(r"function\s+" + hook_func_name, hook_code)
    if not func_match:
        print(f"Could not find hook function in {hook_path}")
        return

    hook_body = hook_code[func_match.end():]

    # Find top-level declared names inside hook body
    declared_names = set()
    # const [a, setA] = useState
    for match in re.findall(r"const\s*\[\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*\]", hook_body):
        declared_names.add(match[0])
        declared_names.add(match[1])

    # const { a, b } = ...
    for match in re.findall(r"const\s*\{([^}]+)\}", hook_body):
        for item in match.split(','):
            item_clean = item.strip().split(':')[0].strip().split('=')[0].strip()
            if re.match(r"^[a-zA-Z0-9_]+$", item_clean):
                declared_names.add(item_clean)

    # const name =, let name =, var name =, function name
    for name in re.findall(r"(?:const|let|var|function)\s+([a-zA-Z0-9_]+)", hook_body):
        declared_names.add(name)

    # Discard self hook name
    declared_names.discard(hook_func_name)

    # Find final return { ... } in hook
    last_ret_idx = hook_code.rfind("return {")
    if last_ret_idx == -1:
        print("No return { found")
        return

    sub = hook_code[last_ret_idx:]
    ret_match = re.search(r"(return\s*\{)([\s\S]*?)(\}\s*;\s*\}?\s*$)", sub)
    if not ret_match:
        print("Could not match return block")
        return

    r_prefix, r_body, r_suffix = ret_match.groups()
    valid_returns = []
    removed_returns = []

    for line in r_body.split("\n"):
        line_str = line.strip()
        if not line_str or line_str.startswith("//"):
            continue
        for p in line_str.split(","):
            p_clean = p.strip()
            if not p_clean:
                continue
            key = p_clean.split(":")[0].strip()
            if key in declared_names:
                valid_returns.append(p_clean)
            else:
                removed_returns.append(key)

    new_ret_body = "\n".join("    " + k + "," for k in valid_returns)
    new_sub = r_prefix + "\n" + new_ret_body + "\n  " + r_suffix
    new_hook_code = hook_code[:last_ret_idx] + new_sub

    with open(hook_path, "w", encoding="utf-8") as f:
        f.write(new_hook_code)

    print(f"Updated '{os.path.basename(hook_path)}': kept {len(valid_returns)} declared return keys, removed {len(removed_returns)} undeclared keys ({removed_returns[:5]}...)")

    # Now update view file destructuring
    valid_set = set(k.split(":")[0].strip() for k in valid_returns)
    with open(view_path, "r", encoding="utf-8") as vf:
        view_code = vf.read()

    var_name = mod["var"]
    dest_match = re.search(r"(const\s*\{)([\s\S]*?)(\}\s*=\s*(?:" + var_name + r"|" + hook_func_name + r"\(\));)", view_code)
    if dest_match:
        d_prefix, d_body, d_suffix = dest_match.groups()
        kept_d = []
        for line in d_body.split("\n"):
            line_str = line.strip()
            if not line_str or line_str.startswith("//"):
                continue
            for p in line_str.split(","):
                p_clean = p.strip()
                if not p_clean:
                    continue
                key = p_clean.split(":")[0].strip().split("=")[0].strip()
                if key in valid_set:
                    kept_d.append(p_clean)
        new_d_body = "\n".join("    " + k + "," for k in kept_d)
        new_dest_block = d_prefix + "\n" + new_d_body + "\n  " + d_suffix
        new_view_code = view_code[:dest_match.start()] + new_dest_block + view_code[dest_match.end():]
        with open(view_path, "w", encoding="utf-8") as vf:
            vf.write(new_view_code)
        print(f"Updated '{os.path.basename(view_path)}': kept {len(kept_d)} valid destructured keys.")

for mod in MODULES:
    process_module(mod)
