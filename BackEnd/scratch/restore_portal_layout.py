import subprocess
import os

target_file = r"FrontEnd\Web\Shared\Views\components\layout\PortalLayout.jsx"

# 1. Fetch file from commit 0dd8bba with proper utf-8 decoding
print("Fetching PortalLayout.jsx from commit 0dd8bba using raw bytes & utf-8 decoding...")
try:
    raw_bytes = subprocess.check_output(
        ['git', 'show', '0dd8bba:FrontEnd/Web/Shared/Views/components/layout/PortalLayout.jsx']
    )
    content = raw_bytes.decode('utf-8')
except Exception as e:
    print(f"Error fetching: {e}")
    exit(1)

# Define the targets and replacements
replacements = [
    # 1. default layoutMode
    (
        "  const [layoutMode, setLayoutMode] = useState(() => {\n    return localStorage.getItem('smartflow_layout_mode') || 'fit-to-screen';\n  });",
        "  const [layoutMode, setLayoutMode] = useState(() => {\n    return localStorage.getItem('smartflow_layout_mode') || 'responsive';\n  });"
    ),
    # 2. .admin-layout CSS
    (
        "        .admin-layout {\n          display: flex;\n          height: 100vh;\n          max-height: 100vh;\n          background-color: #FAFAFA;\n          position: relative;\n          max-width: 100vw;\n          overflow: hidden !important;\n        }",
        "        .admin-layout {\n          display: flex;\n          min-height: 100vh;\n          background-color: #FAFAFA;\n          position: relative;\n          max-width: 100vw;\n        }"
    ),
    # 3. .dashboard-content CSS
    (
        "        .admin-layout.fit-to-screen-active .dashboard-content {\n          height: calc(100% - 60px) !important;\n          max-height: calc(100% - 60px) !important;\n          overflow: hidden !important;\n          background-color: #F8FAFC !important;\n        }\n        .dashboard-content {\n          flex: 1;\n          height: calc(100vh - 60px) !important;\n          max-height: calc(100vh - 60px) !important;\n          overflow: hidden !important;\n          background-color: #F8FAFC !important;\n          display: flex;\n          flex-direction: column;\n          padding: 24px !important;\n          box-sizing: border-box;\n        }",
        "        .admin-layout.fit-to-screen-active .dashboard-content {\n          height: calc(100% - 60px) !important;\n          overflow-y: auto !important;\n          background-color: #F8FAFC !important;\n        }\n        .admin-layout.fit-to-screen-active .admin-list-layout {\n          height: calc((100vh / var(--scale-factor, 1)) - 250px) !important;\n        }"
    ),
    # 4. .admin-main CSS
    (
        "        .admin-main {\n          flex: 1;\n          margin-left: 0;\n          transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);\n          display: flex;\n          flex-direction: column;\n          height: 100vh;\n          max-height: 100vh;\n          overflow: hidden !important;\n          position: relative;\n        }",
        "        .admin-main {\n          flex: 1;\n          margin-left: 0;\n          transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);\n          display: flex;\n          flex-direction: column;\n          min-height: 100vh;\n          position: relative;\n        }"
    )
]

print("Applying replacements...")
replaced_count = 0
for target, replacement in replacements:
    # We do a replacement handling both \n and \r\n
    if target in content:
        content = content.replace(target, replacement)
        print("Replaced successfully (LF)")
        replaced_count += 1
    else:
        # Try normalizing line endings to CRLF for comparison if targets in file are CRLF
        target_crlf = target.replace('\n', '\r\n')
        replacement_crlf = replacement.replace('\n', '\r\n')
        if target_crlf in content:
            content = content.replace(target_crlf, replacement_crlf)
            print("Replaced successfully (CRLF)")
            replaced_count += 1
        else:
            print("WARNING: target not found in file content!")

print(f"Total replacements applied: {replaced_count}/{len(replacements)}")

# Write file back in utf-8
print(f"Writing updated content to {target_file} in utf-8...")
with open(target_file, "w", encoding="utf-8") as f:
    f.write(content)

print("Done!")
