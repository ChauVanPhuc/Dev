# -*- coding: utf-8 -*-
import sys, json, os
sys.path.insert(0, r"d:\SmartFlow_v2_Test\BackEnd")
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from config.database import SessionLocal
from sqlalchemy import text

def run():
    db = SessionLocal()
    try:
        print("[MIGRATION] Checking columns...")
        # 1. Add inspection_guide_id to iso_processes
        cols_proc = [c[0] for c in db.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'iso_processes'")).fetchall()]
        if 'inspection_guide_id' not in cols_proc:
            print("Adding inspection_guide_id to iso_processes...")
            db.execute(text("ALTER TABLE iso_processes ADD inspection_guide_id INT NULL"))
            try:
                db.execute(text("ALTER TABLE iso_processes ADD CONSTRAINT FK_iso_processes_guide FOREIGN KEY (inspection_guide_id) REFERENCES inspection_guides(id) ON DELETE SET NULL"))
            except Exception as e:
                print("Note FK constraint:", e)
            db.commit()
            print("Added inspection_guide_id successfully.")

        # 2. Add process_id to inspection_guides
        cols_guide = [c[0] for c in db.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inspection_guides'")).fetchall()]
        if 'process_id' not in cols_guide:
            print("Adding process_id to inspection_guides...")
            db.execute(text("ALTER TABLE inspection_guides ADD process_id INT NULL"))
            try:
                db.execute(text("ALTER TABLE inspection_guides ADD CONSTRAINT FK_inspection_guides_process FOREIGN KEY (process_id) REFERENCES iso_processes(id) ON DELETE SET NULL"))
            except Exception as e:
                print("Note FK constraint:", e)
        # 2b. Expand image_url in inspection_guide_step_images to NVARCHAR(MAX) to support data URIs and long URLs
        try:
            db.execute(text("ALTER TABLE inspection_guide_step_images ALTER COLUMN image_url NVARCHAR(MAX) NOT NULL"))
            db.commit()
            print("Expanded image_url to NVARCHAR(MAX)")
        except Exception as e:
            print("Note on image_url alter:", e)

        # 3. Migrate existing work instructions from iso_process_sections for Process 1 (G7.SX.QT01)
        row = db.execute(text("SELECT content_html FROM iso_process_sections WHERE process_id = 1 AND section_name = '__metadata_work_instructions__'")).fetchone()
        if row and row[0]:
            try:
                work_instructions = json.loads(row[0])
                if isinstance(work_instructions, list) and len(work_instructions) > 0:
                    first_inst = work_instructions[0]
                    inst_title = first_inst.get('title') or 'Hướng dẫn check mã Barcode'
                    inst_steps = first_inst.get('steps') or []

                    # Check if already migrated
                    existing_guide = db.execute(text("SELECT id FROM inspection_guides WHERE process_id = 1 OR code = 'HD-QT01'")).fetchone()
                    guide_id = None
                    if not existing_guide:
                        print(f"Migrating work instruction '{inst_title}' to inspection_guides...")
                        ins_sql = text("""
                            INSERT INTO inspection_guides (code, name, doc_type, description, is_active, process_id, created_at, updated_at)
                            OUTPUT INSERTED.id
                            VALUES ('HD-QT01', :name, 'HDKT', :desc, 1, 1, GETDATE(), GETDATE())
                        """)
                        res = db.execute(ins_sql, {"name": inst_title, "desc": f"Hướng dẫn kiểm tra thực hiện liên kết 1-1 với Quy trình G7.SX.QT01"})
                        guide_id = res.fetchone()[0]
                        print(f"Created InspectionGuide id={guide_id}")

                        # Insert steps
                        for s_idx, st in enumerate(inst_steps):
                            st_name = st.get('name') or f"Bước {s_idx + 1}"
                            st_note = st.get('note') or ''
                            st_standard = st.get('standard') or ''
                            st_img = st.get('image_url') or ''
                            
                            step_ins = text("""
                                INSERT INTO inspection_guide_steps (guide_id, step_no, title, content)
                                OUTPUT INSERTED.id
                                VALUES (:guide_id, :step_no, :title, :content)
                            """)
                            s_res = db.execute(step_ins, {
                                "guide_id": guide_id,
                                "step_no": s_idx + 1,
                                "title": st_name,
                                "content": st_note
                            })
                            step_id = s_res.fetchone()[0]

                            # Sub step for standard if exists
                            if st_standard:
                                db.execute(text("""
                                    INSERT INTO inspection_guide_sub_steps (step_id, sub_step_no, title, content)
                                    VALUES (:step_id, 1, 'Tiêu chuẩn chấp nhận', :standard)
                                """), {"step_id": step_id, "standard": st_standard})

                            # Image
                            if st_img:
                                db.execute(text("""
                                    INSERT INTO inspection_guide_step_images (step_id, guide_id, file_name, image_url, display_order, created_at)
                                    VALUES (:step_id, :guide_id, :fname, :url, 0, GETDATE())
                                """), {
                                    "step_id": step_id,
                                    "guide_id": guide_id,
                                    "fname": f"step_{s_idx+1}_sample.png",
                                    "url": st_img
                                })

                        db.commit()
                        print(f"Migrated {len(inst_steps)} steps to inspection_guide_steps.")
                    else:
                        guide_id = existing_guide[0]
                        print(f"Existing guide found id={guide_id}")

                    # Update iso_processes
                    db.execute(text("UPDATE iso_processes SET inspection_guide_id = :gid WHERE id = 1"), {"gid": guide_id})
                    db.execute(text("UPDATE inspection_guides SET process_id = 1 WHERE id = :gid"), {"gid": guide_id})
                    db.commit()
                    print(f"Linked iso_processes (id=1) <-> inspection_guides (id={guide_id})")
            except Exception as e:
                print("Error migrating work instructions:", e)
                db.rollback()

        print("[MIGRATION COMPLETED SUCCESSFULLY]")
    finally:
        db.close()

if __name__ == "__main__":
    run()
