import subprocess
import os

target_file = r"FrontEnd\shared\store\uiStore.js"

print("Fetching uiStore.js from commit 0dd8bba...")
try:
    raw_bytes = subprocess.check_output(
        ['git', 'show', '0dd8bba:FrontEnd/shared/store/uiStore.js']
    )
    content = raw_bytes.decode('utf-8')
except Exception as e:
    print(f"Error fetching: {e}")
    exit(1)

print(f"Writing updated content to {target_file} in utf-8...")
with open(target_file, "w", encoding="utf-8") as f:
    f.write(content)

print("Done!")
