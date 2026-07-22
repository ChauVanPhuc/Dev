import os
import re

WEB_DIR = r"m:\ERP\FrontEnd\Web"

MODULES = [
    {
        "name": "ScreenBugManagement",
        "view": os.path.join(WEB_DIR, "modules", "System", "Views", "Screen", "ScreenBugManagementView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "System", "Views", "Screen", "hooks", "useScreenBugManagement.jsx"),
        "var_name": "bugManager",
        "hook_func": "useScreenBugManagement"
    },
    {
        "name": "DeliveryTracking",
        "view": os.path.join(WEB_DIR, "modules", "Delivery", "Views", "Tracking", "DeliveryTrackingView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "Delivery", "Views", "Tracking", "hooks", "useDeliveryTracking.jsx"),
        "var_name": "tracker",
        "hook_func": "useDeliveryTracking"
    },
    {
        "name": "InspectionReports",
        "view": os.path.join(WEB_DIR, "modules", "Inspection", "Views", "Report", "InspectionReportsView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "Inspection", "Views", "Report", "hooks", "useInspectionReports.jsx"),
        "var_name": "reports",
        "hook_func": "useInspectionReports"
    },
    {
        "name": "ClaimList",
        "view": os.path.join(WEB_DIR, "modules", "Claim", "views", "Claim", "ClaimListView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "Claim", "views", "hooks", "useClaimList.jsx"),
        "var_name": "list",
        "hook_func": "useClaimList"
    }
]

def parse_hook_returned_keys(hook_path):
    with open(hook_path, "r", encoding="utf-8") as f:
        code = f.read()

    last_idx = code.rfind("return {")
    if last_idx == -1:
        return set()

    sub = code[last_idx:]
    match = re.search(r"return\s*\{([\s\S]*?)\}\s*;\s*\}", sub)
    if not match:
        match = re.search(r"return\s*\{([\s\S]*)\}", sub)
    if not match:
        return set()

    body = match.group(1)
    keys = set()
    for line in body.split("\n"):
        line = line.strip()
        if not line or line.startswith("//") or line.startswith("/*"):
            continue
        for p in line.split(","):
            p = p.strip()
            if not p:
                continue
            key = p.split(":")[0].strip()
            if re.match(r"^[a-zA-Z0-9_]+$", key):
                keys.add(key)
    return keys

for mod in MODULES:
    view_path = mod["view"]
    hook_path = mod["hook"]
    var_name = mod["var_name"]
    hook_func = mod["hook_func"]

    if not os.path.exists(view_path) or not os.path.exists(hook_path):
        continue

    valid_keys = parse_hook_returned_keys(hook_path)
    # Remove self reference if present
    valid_keys.discard(hook_func)

    with open(view_path, "r", encoding="utf-8") as f:
        view_code = f.read()

    # Find const { ... } = var_name; or useHook();
    match = re.search(r"(const\s*\{)([\s\S]*?)(\}\s*=\s*(?:" + var_name + r"|" + hook_func + r"\(\));)", view_code)
    if not match:
        # Try match const { ... } = list; etc
        match = re.search(r"(const\s*\{)([\s\S]*?)(\}\s*=\s*[a-zA-Z0-9_]+\s*;)", view_code)

    if not match:
        print(f"Destructuring block not found in {mod['name']}")
        continue

    prefix, body, suffix = match.groups()
    
    kept_keys = []
    removed_keys = []
    for line in body.split("\n"):
        line = line.strip()
        if not line or line.startswith("//"):
            continue
        for p in line.split(","):
            p = p.strip()
            if not p:
                continue
            key = p.split(":")[0].strip().split("=")[0].strip()
            if key in valid_keys:
                kept_keys.append(p)
            else:
                removed_keys.append(key)

    new_body = "\n".join("    " + k + "," for k in kept_keys)
    new_block = prefix + "\n" + new_body + "\n  " + suffix

    new_code = view_code[:match.start()] + new_block + view_code[match.end():]
    with open(view_path, "w", encoding="utf-8") as f:
        f.write(new_code)

    print(f"Fixed {mod['name']}: Kept {len(kept_keys)} valid keys. Removed {len(removed_keys)} invalid keys: {removed_keys[:5]}...")

