with open("FrontEnd/Web/modules/ISO/Views/ISOFormEditorView.jsx", "r", encoding="utf-8") as f:
    content = f.read()

pos = 28805
start = max(0, pos - 100)
end = min(len(content), pos + 200)

print("Snippet around position 28805:")
print(content[start:end])
