import sys

file_path = r'c:\SmartFlow_v2_Test\FrontEnd\Web\modules\System\Views\ScreenDetailView.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Original length: {len(lines)}")
# Deleting lines 2832 to 2878 (which corresponds to 0-indexed indices 2831 to 2877 inclusive)
# Verification check:
print("First line to delete (2832):", repr(lines[2831]))
print("Last line to delete (2878):", repr(lines[2877]))

del lines[2831:2878]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"New length: {len(lines)}")
print("Deleted successfully!")
