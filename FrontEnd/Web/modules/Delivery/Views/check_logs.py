import re

file_path = r"c:\SmartFlow_v2\FrontEnd\Web\modules\Delivery\Views\DeliveryTrackingView.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    for idx, line in enumerate(f, 1):
        if "console" in line:
            print(f"Line {idx}: {line.strip()}")
