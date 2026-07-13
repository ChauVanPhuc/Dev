import docx

doc = docx.Document("G7.CL -QT01_Quy trình kiểm soát nguyên vật liệu đầu vào.docx")
with open("scratch/inspect_text.txt", "w", encoding="utf-8") as f:
    for idx, p in enumerate(doc.paragraphs):
        text = p.text.strip()
        if text:
            f.write(f"P {idx}: {text}\n")
print("Done inspecting docx text!")
