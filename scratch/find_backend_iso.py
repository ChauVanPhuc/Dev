import os

found = []
for root, dirs, files in os.walk("BackEnd"):
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    if "/iso-documents" in content or "iso-documents" in content:
                        found.append(path)
            except:
                pass

print("Backend files containing iso-documents:")
for p in found:
    print(p)
