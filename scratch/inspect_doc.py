import docx

doc = docx.Document("G7.CL -QT01_Quy trình kiểm soát nguyên vật liệu đầu vào.docx")
with open("scratch/inspect_output.txt", "w", encoding="utf-8") as f:
    f.write(f"Total tables: {len(doc.tables)}\n")
    for idx, table in enumerate(doc.tables):
        f.write(f"\n--- Table {idx} (Rows: {len(table.rows)}, Cols: {len(table.columns)}) ---\n")
        for r_idx, row in enumerate(table.rows):
            row_text = [cell.text.strip().replace('\n', ' ') for cell in row.cells]
            # De-duplicate adjacent identical cells due to cell merging
            unique_row_text = []
            for text in row_text:
                if not unique_row_text or unique_row_text[-1] != text:
                    unique_row_text.append(text)
            f.write(f"Row {r_idx}: {unique_row_text}\n")
print("Done inspecting docx tables!")
