with open("FrontEnd/Web/modules/ISO/Views/ISOFormEditorView.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

brace_count = 0
paren_count = 0
in_string = False
string_char = ''

for idx, line in enumerate(lines):
    clean_line = ""
    i = 0
    while i < len(line):
        char = line[i]
        # Skip comments
        if char == '/' and i + 1 < len(line) and line[i+1] == '/':
            break
        
        if not in_string:
            if char in ['"', "'", '`']:
                in_string = True
                string_char = char
            elif char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
            elif char == '(':
                paren_count += 1
            elif char == ')':
                paren_count -= 1
        else:
            if char == string_char and line[i-1] != '\\':
                in_string = False
        i += 1

print(f"Final brace balance: {brace_count}")
print(f"Final paren balance: {paren_count}")
