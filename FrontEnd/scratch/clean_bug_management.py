import re

view_file = r"m:\ERP\FrontEnd\Web\modules\System\Views\Screen\ScreenBugManagementView.jsx"

with open(view_file, "r", encoding="utf-8") as f:
    code = f.read()

# Remove invalid single letter and internal local vars from destructure block in ScreenBugManagementView.jsx
invalid_vars = {"a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
                "bgColor", "border", "bugDate", "buildProgress", "clipboardData", "clipboardItems", "completedScreens",
                "defects", "description", "err", "existing", "match", "payload", "phucUser", "reqDate", "res", "roles", "saved",
                "statusLabel", "tag", "targetScreen", "targetScreenId", "textColor", "textVi", "timePart", "toast", "updatedAt", "updater", "username"}

def filter_destruct(match):
    prefix, body, suffix = match.groups()
    lines = body.split("\n")
    kept = []
    for line in lines:
        line_str = line.strip()
        if not line_str or line_str.startswith("//"):
            continue
        parts = line_str.split(",")
        kept_parts = []
        for p in parts:
            p_clean = p.strip()
            if not p_clean:
                continue
            key = p_clean.split(":")[0].strip().split("=")[0].strip()
            if key not in invalid_vars:
                kept_parts.append(p_clean)
        if kept_parts:
            kept.append("    " + ", ".join(kept_parts) + ",")
    return prefix + "\n" + "\n".join(kept) + "\n  " + suffix

new_code = re.sub(r"(const\s*\{)([\s\S]*?)(\}\s*=\s*bugManager;)", filter_destruct, code)
with open(view_file, "w", encoding="utf-8") as f:
    f.write(new_code)

print("Cleaned ScreenBugManagementView.jsx destructure block.")
