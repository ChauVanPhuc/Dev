import os

file_path = "FrontEnd/Web/modules/ISO/Views/ISOFormEditorView.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("\r\n", "\n")

target_top = """      {/* 1. Màn hình chính */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>"""

print(f"Occurrences of target_top: {content.count(target_top)}")
