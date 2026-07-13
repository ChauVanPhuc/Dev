with open("FrontEnd/Web/modules/ISO/Views/ISOFormEditorView.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "match" in line and "plainText" in line:
        print(f"Line {idx+1}: {repr(line)}")
