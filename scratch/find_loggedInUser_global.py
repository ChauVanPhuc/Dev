import os
import re

found = []
for root, dirs, files in os.walk("FrontEnd"):
    for file in files:
        if file.endswith((".js", ".jsx")):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    if "loggedInUser" in content:
                        found.append(path)
            except:
                pass

print("Files containing loggedInUser:")
for p in found:
    print(p)
