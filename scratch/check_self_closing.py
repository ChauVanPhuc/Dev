import re

with open("FrontEnd/Web/modules/ISO/Views/ISOFormEditorView.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Find all occurrences of <input ... >
# Standard regex to find JSX tags:
# We look for < followed by tag name (like input, img, hr, br, textarea, select, option, button, div, etc)
# up to the closing >
tags = re.findall(r'<([a-zA-Z0-9_:-]+)([^>]*?)>', content)

print("Checking input and other tags for proper self-closing / slash:")
for name, attrs in tags:
    if name in ['input', 'img', 'br', 'hr']:
        attrs_stripped = attrs.strip()
        if not attrs_stripped.endswith('/'):
            print(f"Non-self-closing <{name}> tag found: <{name}{attrs}>")
