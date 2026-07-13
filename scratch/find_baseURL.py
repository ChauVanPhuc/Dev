with open("FrontEnd/Web/modules/ISO/Views/ISOFormEditorView.jsx", "r", encoding="utf-8") as f:
    content = f.read()

lines = content.split('\n')
for idx, line in enumerate(lines):
    if "baseURL" in line:
        print(f"Line {idx+1}: {repr(line)}")
