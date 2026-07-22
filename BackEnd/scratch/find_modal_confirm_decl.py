import subprocess

res = subprocess.run(
    ["git", "show", "70fb195~1:FrontEnd/Web/modules/System/Views/ScreenDetailView.jsx"],
    capture_output=True,
    text=True,
    encoding='utf-8'
)
content = res.stdout

idx = content.find("showToast('Đã thêm thành phần mới vào danh sách!');")
if idx != -1:
    # Let's write the 2000 characters before this index
    with open(r"M:\ERP\BackEnd\scratch\modal_confirm_decl.txt", "w", encoding="utf-8") as f:
        f.write(content[idx-3000:idx])
    print("Wrote to modal_confirm_decl.txt")
