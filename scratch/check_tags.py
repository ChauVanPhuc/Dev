import re

with open("FrontEnd/Web/modules/ISO/Views/ISOFormEditorView.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Extract return statement
match = re.search(r'return\s*\(', content)
if not match:
    print("Return statement not found")
    exit(0)

start_pos = match.end()
paren_count = 1
pos = start_pos
return_body = ""
while pos < len(content) and paren_count > 0:
    char = content[pos]
    if char == '(':
        paren_count += 1
    elif char == ')':
        paren_count -= 1
    return_body += char
    pos += 1

# Let's find tags properly. We look for <... > or </...>
# and we check if it ends with />
raw_tags = re.findall(r'<([^>]+)>', return_body)

stack = []
for idx, raw in enumerate(raw_tags):
    # Ignore comments like {/* ... */}
    if raw.startswith('!--') or raw.startswith('/*') or raw.startswith('{/*'):
        continue
    
    # Strip quotes inside attributes to not confuse closing check
    # Check if self-closing: ends with /
    if raw.strip().endswith('/'):
        continue
        
    # Get tag name
    parts = raw.split()
    if not parts:
        continue
    tag = parts[0]
    
    # Check if closing
    is_closing = tag.startswith('/')
    tag_name = tag[1:] if is_closing else tag
    
    # Some React/HTML tags might be self-closing without / (not standard JSX, but let's be careful)
    # In JSX, ALL tags must be closed.
    
    if is_closing:
        if not stack:
            print(f"Error: Closing tag </{tag_name}> found with empty stack at index {idx} (raw: <{raw}>)")
        else:
            top = stack.pop()
            if top != tag_name:
                print(f"Mismatch: </{tag_name}> does not match <{top}> at index {idx} (raw: <{raw}>)")
                # Put it back to continue
                stack.append(top)
    else:
        stack.append(tag_name)

print("\nRemaining tags in stack:")
for t in stack:
    print(t)
