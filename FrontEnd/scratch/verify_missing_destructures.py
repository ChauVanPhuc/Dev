import os
import re

WEB_DIR = r"m:\ERP\FrontEnd\Web"
FRONTEND_DIR = r"m:\ERP\FrontEnd"

MODULES = [
    {
        "name": "DeliveryTracking",
        "view": os.path.join(WEB_DIR, "modules", "Delivery", "Views", "Tracking", "DeliveryTrackingView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "Delivery", "Views", "Tracking", "hooks", "useDeliveryTracking.jsx"),
        "var_name": "tracker"
    },
    {
        "name": "InspectionReports",
        "view": os.path.join(WEB_DIR, "modules", "Inspection", "Views", "Report", "InspectionReportsView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "Inspection", "Views", "Report", "hooks", "useInspectionReports.jsx"),
        "var_name": "reports"
    },
    {
        "name": "ScreenBugManagement",
        "view": os.path.join(WEB_DIR, "modules", "System", "Views", "Screen", "ScreenBugManagementView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "System", "Views", "Screen", "hooks", "useScreenBugManagement.jsx"),
        "var_name": "bugManager"
    },
    {
        "name": "ClaimList",
        "view": os.path.join(WEB_DIR, "modules", "Claim", "views", "Claim", "ClaimListView.jsx"),
        "hook": os.path.join(WEB_DIR, "modules", "Claim", "views", "hooks", "useClaimList.jsx"),
        "var_name": "list"
    }
]

def verify_module(mod):
    view_path = mod["view"]
    if not os.path.exists(view_path):
        return

    with open(view_path, "r", encoding="utf-8") as f:
        code = f.read()

    # Find the destructuring block
    dest_match = re.search(r"const\s*\{([\s\S]*?)\}\s*=\s*(?:" + mod["var_name"] + r"|use[A-Za-z0-9_]+\(\))\s*;", code)
    if not dest_match:
        print(f"[{mod['name']}] No destructuring block found.")
        return

    destructed_str = dest_match.group(1)
    destructed_keys = set()
    for p in re.split(r"[,\n]", destructed_str):
        p_clean = p.strip().split(":")[0].split("=")[0].strip()
        if re.match(r"^[a-zA-Z0-9_]+$", p_clean):
            destructed_keys.add(p_clean)

    # Now get all identifier usages in the file using regex word match
    # We want to match all words that are NOT part of the destructuring block or imports
    # Let's extract everything after the destructuring block
    body_code = code[dest_match.end():]
    
    # Also find words inside the file body
    all_words = set(re.findall(r"\b([a-zA-Z0-9_]+)\b", body_code))

    # Let's check if there are any words that were removed from the hook return but are still used!
    # Wait, we want to know what was in the hook originally vs what is in the hook now, but more importantly,
    # what variables are used in the JSX that are NOT destructured, NOT local variables, NOT globally imported!
    # Let's read the Hook file to see what it ACTUALLY returns
    with open(mod["hook"], "r", encoding="utf-8") as f:
        hook_code = f.read()

    last_ret = hook_code.rfind("return {")
    if last_ret == -1:
        print(f"[{mod['name']}] No return block in hook.")
        return

    sub = hook_code[last_ret:]
    ret_match = re.search(r"return\s*\{([\s\S]*?)\}", sub)
    if not ret_match:
        print(f"[{mod['name']}] Could not match return in hook.")
        return

    returned_keys = set()
    for p in re.split(r"[,\n]", ret_match.group(1)):
        p_clean = p.strip().split(":")[0].strip()
        if re.match(r"^[a-zA-Z0-9_]+$", p_clean):
            returned_keys.add(p_clean)

    # Find keys that are used in the view code body, are not destructured, but exist in the hook!
    # Or, if they are destructured, let's verify if there is any variable used in JSX that is NOT defined!
    # To find this, we can run eslint or a quick javascript parser. Or we can check:
    # If a variable is used in the view body, does it exist in the destructured list, or is it a local var, or a React import?
    # Let's find if there are variables in the destructured block of the view that we REMOVED but are still needed in the JSX!
    # If we removed them, they are NOT in destructed_keys anymore, and they are not defined locally.
    # Let's check which variables are referenced in the view JSX, e.g. {varName} or varName.xxx
    # Let's list all variables that are NOT in destructed_keys, NOT imported, NOT declared as const/let/var/function in the view.
    local_declarations = set(re.findall(r"\b(?:const|let|var|function)\s+([a-zA-Z0-9_]+)\b", body_code))
    imported_names = set(re.findall(r"import\s+(?:[a-zA-Z0-9_]+|\{[^}]+\})\s+from", code)) # rough estimate
    # Detailed import extraction
    detailed_imports = set()
    for imp_line in re.findall(r"import\s+([\s\S]+?)\s+from", code):
        imp_line_clean = imp_line.replace("{", "").replace("}", "").replace("* as", "")
        for part in imp_line_clean.split(","):
            name = part.strip().split(" as ")[-1].strip()
            if re.match(r"^[a-zA-Z0-9_]+$", name):
                detailed_imports.add(name)

    props_passed = {"props", "React", "window", "document", "console", "localStorage", "JSON", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "Math", "Date", "Array", "Object", "String", "Number", "Boolean", "RegExp", "Error", "Promise"}

    undefined_candidates = []
    for word in all_words:
        if word in destructed_keys:
            continue
        if word in local_declarations:
            continue
        if word in detailed_imports:
            continue
        if word in props_passed:
            continue
        # Check if it was returned by the hook (if so, we forgot to destructure it!)
        if word in returned_keys:
            undefined_candidates.append(word)

    if undefined_candidates:
        print(f"[{mod['name']}] Found variables used in View that are in Hook but NOT destructured in View: {undefined_candidates}")
    else:
        print(f"[{mod['name']}] All hook variables are correctly destructured/ignored.")

for mod in MODULES:
    verify_module(mod)
