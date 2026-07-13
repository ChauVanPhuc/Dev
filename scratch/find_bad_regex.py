import re

with open("FrontEnd/Web/modules/ISO/Views/ISOFormEditorView.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Let's find all regex literals. A regex literal in JS usually starts with / and ends with / (possibly followed by flags like g, i, m)
# However, inside JSX, / can also be part of closing tags.
# Let's look for any occurrences of / that are followed by < or > or have them inside.
# Alternatively, let's look for "replace(" or "match(" or "test("
matches = re.finditer(r'(\.replace|\.match|\.test)\s*\(\s*/([^/]+)/', content)

print("Found regexes:")
for m in matches:
    print(f"Match: {m.group(0)} at position {m.start()}")

# Let's also search for any occurrence of '/<' or '<' inside a regex literal manually.
lines = content.split('\n')
for idx, line in enumerate(lines):
    if '/' in line and ('<' in line or '>' in line) and not '</' in line and not '=>' in line:
        # Check if it looks like a regex literal or a division or something
        if re.search(r'/[^/]+/[gim]*', line):
            print(f"Line {idx+1}: {repr(line)}")
