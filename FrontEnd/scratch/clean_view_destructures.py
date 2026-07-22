import os
import re

WEB_DIR = r"m:\ERP\FrontEnd\Web"

MODULES_TO_FIX = [
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
    },
    {
        "name": "ScreenBugManagement",
        "view": os.path.join(WEB_DIR, "modules", "System", "Views", "Screen", "ScreenBugManagementView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "System", "Views", "Screen", "hooks", "useScreenBugManagement.jsx"),
        "var_name": "bugManager",
        "hook_func": "useScreenBugManagement"
    },
    {
        "name": "ISOProcessEditor",
        "view": os.path.join(WEB_DIR, "modules", "ISO", "Views", "Process", "ISOProcessEditorView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "ISO", "Views", "Process", "hooks", "useISOProcessEditor.jsx"),
        "var_name": "editor",
        "hook_func": "useISOProcessEditor"
    }
]

def parse_last_hook_return_keys(hook_path):
    with open(hook_path, "r", encoding="utf-8") as f:
        code = f.read()

    # Find the last occurrence of "return {"
    last_idx = code.rfind("return {")
    if last_idx == -1:
        return set()

    sub = code[last_idx:]
    match = re.search(r"return\s*\{([\s\S]*)\}\s*;\s*\}?", sub)
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

# First restore git state of views before running clean
os.system(f"git checkout -- {WEB_DIR}")

for mod in MODULES_TO_FIX:
    view_path = mod["view"]
    hook_path = mod["hook"]
    var_name = mod["var_name"]
    hook_func = mod["hook_func"]

    if not os.path.exists(view_path) or not os.path.exists(hook_path):
        continue

    returned_keys = parse_last_hook_return_keys(hook_path)
    returned_keys.discard(hook_func)

    with open(view_path, "r", encoding="utf-8") as f:
        view_code = f.read()

    pattern = r"(const\s*\{)([\s\S]*?)(\}\s*=\s*(?:" + var_name + r"|" + hook_func + r"\(\));)"
    match = re.search(pattern, view_code)
    if not match:
        print(f"[WARN] Destructuring pattern not found in '{os.path.basename(view_path)}'")
        continue

    prefix, raw_keys_block, suffix = match.groups()
    destructured_lines = raw_keys_block.split("\n")
    cleaned_lines = []
    removed_count = 0

    for line in destructured_lines:
        line_str = line.strip()
        if not line_str or line_str.startswith("//") or line_str.startswith("/*"):
            continue
        parts = line_str.split(",")
        kept_parts = []
        for p in parts:
            p_clean = p.strip()
            if not p_clean:
                continue
            key_name = p_clean.split(":")[0].strip().split("=")[0].strip()
            if key_name in returned_keys:
                kept_parts.append(p_clean)
            else:
                removed_count += 1
        if kept_parts:
            cleaned_lines.append("    " + ", ".join(kept_parts) + ",")

    new_block = prefix + "\n" + "\n".join(cleaned_lines) + "\n  " + suffix
    new_view_code = view_code[:match.start()] + new_block + view_code[match.end():]

    with open(view_path, "w", encoding="utf-8") as f:
        f.write(new_view_code)

    print(f"Cleaned '{os.path.basename(view_path)}': Hook returns {len(returned_keys)} keys. Kept {len(cleaned_lines)} lines, removed {removed_count} unreturned keys.")

