import os
import re

WEB_DIR = r"m:\ERP\FrontEnd\Web"

MODULES_TO_CHECK = [
    {
        "name": "ScreenDetail",
        "view": os.path.join(WEB_DIR, "modules", "System", "Views", "Screen", "ScreenDetailView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "System", "Views", "hooks", "useScreenDetail.jsx"),
        "components_dir": os.path.join(WEB_DIR, "modules", "System", "Views", "components")
    },
    {
        "name": "ScreenBugManagement",
        "view": os.path.join(WEB_DIR, "modules", "System", "Views", "Screen", "ScreenBugManagementView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "System", "Views", "Screen", "hooks", "useScreenBugManagement.jsx"),
        "components_dir": os.path.join(WEB_DIR, "modules", "System", "Views", "Screen", "components")
    },
    {
        "name": "ISOProcessEditor",
        "view": os.path.join(WEB_DIR, "modules", "ISO", "Views", "Process", "ISOProcessEditorView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "ISO", "Views", "Process", "hooks", "useISOProcessEditor.jsx"),
        "components_dir": os.path.join(WEB_DIR, "modules", "ISO", "Views", "Process", "components")
    },
    {
        "name": "ClaimList",
        "view": os.path.join(WEB_DIR, "modules", "Claim", "views", "Claim", "ClaimListView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "Claim", "views", "hooks", "useClaimList.jsx"),
        "components_dir": os.path.join(WEB_DIR, "modules", "Claim", "views", "components", "ClaimList")
    },
    {
        "name": "DeliveryTracking",
        "view": os.path.join(WEB_DIR, "modules", "Delivery", "Views", "Tracking", "DeliveryTrackingView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "Delivery", "Views", "Tracking", "hooks", "useDeliveryTracking.jsx"),
        "components_dir": os.path.join(WEB_DIR, "modules", "Delivery", "Views", "Tracking", "components")
    },
    {
        "name": "InspectionReports",
        "view": os.path.join(WEB_DIR, "modules", "Inspection", "Views", "Report", "InspectionReportsView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "Inspection", "Views", "Report", "hooks", "useInspectionReports.jsx"),
        "components_dir": os.path.join(WEB_DIR, "modules", "Inspection", "Views", "Report", "components")
    }
]

def parse_returned_object_keys(code):
    # Find the final return statement returning an object { ... }
    # Search backwards from the end of the code
    idx = code.rfind("return {")
    if idx == -1:
        idx = code.rfind("return (")
    if idx == -1:
        return set()
    
    # Extract from idx to end
    sub = code[idx:]
    # match content inside { ... }
    match = re.search(r"return\s*\{([\s\S]*)\}", sub)
    if not match:
        return set()

    body = match.group(1)
    keys = set()
    for line in body.split("\n"):
        line = line.strip()
        if not line or line.startswith("//") or line.startswith("/*"):
            continue
        # handle key, or key: value
        parts = line.split(",")
        for p in parts:
            p = p.strip()
            if not p:
                continue
            key = p.split(":")[0].strip()
            if re.match(r"^[a-zA-Z0-9_]+$", key):
                keys.add(key)
    return keys

def parse_destructured_keys(code, hook_name):
    # find const { a, b, c } = useHook(
    match = re.search(r"const\s*\{([\s\S]*?)\}\s*=\s*" + hook_name + r"\s*\(", code)
    if not match:
        return set()
    body = match.group(1)
    keys = set()
    for line in body.split("\n"):
        line = line.strip()
        if not line or line.startswith("//"):
            continue
        for part in line.split(","):
            part = part.strip()
            if not part:
                continue
            key = part.split(":")[0].strip().split("=")[0].strip()
            if re.match(r"^[a-zA-Z0-9_]+$", key):
                keys.add(key)
    return keys

def analyze_module(mod):
    print(f"\n=================== ANALYZING MODULE: {mod['name']} ===================")
    hook_path = mod["hook"]
    if not os.path.exists(hook_path):
        print(f"[WARN] Hook not found: {hook_path}")
        return

    with open(hook_path, "r", encoding="utf-8") as f:
        hook_code = f.read()

    hook_returns = parse_returned_object_keys(hook_code)
    hook_name = os.path.basename(hook_path).replace(".jsx", "").replace(".js", "")
    print(f"Hook '{hook_name}' returns {len(hook_returns)} keys.")

    view_path = mod["view"]
    if not os.path.exists(view_path):
        print(f"[WARN] View not found: {view_path}")
        return

    with open(view_path, "r", encoding="utf-8") as f:
        view_code = f.read()

    view_destruct = parse_destructured_keys(view_code, hook_name)
    print(f"View '{os.path.basename(view_path)}' destructures {len(view_destruct)} keys.")

    missing_in_hook = view_destruct - hook_returns
    if missing_in_hook:
        print(f"[CRITICAL WHITE SCREEN BUG] In '{os.path.basename(view_path)}': View destructures {missing_in_hook} but '{hook_name}' DOES NOT RETURN THEM!")
    else:
        print("Hook returns all destructured keys in view.")

    # Check subcomponents imports
    comp_dir = mod["components_dir"]
    if os.path.exists(comp_dir):
        for root, dirs, files in os.walk(comp_dir):
            for file in files:
                if file.endswith('.jsx') or file.endswith('.js'):
                    comp_path = os.path.join(root, file)
                    with open(comp_path, "r", encoding="utf-8") as cf:
                        comp_code = cf.read()
                    
                    jsx_tags = set(re.findall(r"<([A-Z][a-zA-Z0-9_]*)\b", comp_code))
                    # find all imports in file
                    all_imports = set()
                    for imp_line in re.findall(r"import\s+[\s\S]*?from\s+['\"].*?['\"]", comp_code):
                        names = re.findall(r"([A-Z][a-zA-Z0-9_]*)", imp_line)
                        all_imports.update(names)
                    
                    # check tags used inside component body
                    unresolved = jsx_tags - all_imports - {"Fragment", "React", "Suspense"}
                    if unresolved:
                        print(f"[UNRESOLVED TAGS] In component '{file}': JSX uses tags {unresolved} but they are NOT imported!")

for mod in MODULES_TO_CHECK:
    analyze_module(mod)
