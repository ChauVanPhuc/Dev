import re

with open(r"m:\ERP\FrontEnd\Web\modules\Delivery\Views\Tracking\DeliveryTrackingView.jsx", "r", encoding="utf-8") as f:
    v_code = f.read()

with open(r"m:\ERP\FrontEnd\Web\modules\Delivery\Views\Tracking\hooks\useDeliveryTracking.jsx", "r", encoding="utf-8") as f:
    h_code = f.read()

# Get returned keys from hook
h_keys = set()
ret_match = re.search(r"return\s*\{([\s\S]*?)\}\s*;\s*\}", h_code)
if ret_match:
    for line in ret_match.group(1).split('\n'):
        for p in line.split(','):
            k = p.split(':')[0].strip()
            if re.match(r"^[a-zA-Z0-9_]+$", k):
                h_keys.add(k)

# Get destructured keys from view
v_keys = set()
dest_match = re.search(r"const\s*\{([\s\S]*?)\}\s*=\s*tracker\b", v_code)
if dest_match:
    for line in dest_match.group(1).split('\n'):
        for p in line.split(','):
            k = p.split(':')[0].strip().split('=')[0].strip()
            if re.match(r"^[a-zA-Z0-9_]+$", k):
                v_keys.add(k)

missing = v_keys - h_keys
print("Missing keys in DeliveryTrackingView destructure:", missing)
