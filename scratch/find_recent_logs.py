import os
import time

now = time.time()
recent_logs = []

for root, dirs, files in os.walk("."):
    # Skip standard build/node folders
    if any(k in root for k in ["node_modules", ".git", "dist", "build", "__pycache__"]):
        continue
    for file in files:
        if file.endswith((".log", ".txt")):
            path = os.path.join(root, file)
            try:
                mtime = os.path.getmtime(path)
                # Modified in the last 10 minutes
                if now - mtime < 600:
                    recent_logs.append((path, mtime))
            except:
                pass

print("Recently modified log/txt files:")
for path, mtime in sorted(recent_logs, key=lambda x: x[1], reverse=True):
    print(f"{path} (Modified: {time.ctime(mtime)})")
