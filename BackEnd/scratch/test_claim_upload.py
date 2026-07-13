import sys
import os
sys.path.append(os.path.abspath('BackEnd'))

from config.database import SessionLocal
from modules.claim.controllers.import_controller import validate_import_files, process_pdf_import
from fastapi import UploadFile
import io

class MockUploadFile:
    def __init__(self, filename, content):
        self.filename = filename
        self.content = content
        self.file = io.BytesIO(content)

pdf_path = r"c:\SmartFlow_v2_Test\data\CLAIM REPORT AT VINA G7 FACTORY (JUNE - 2026).pdf"
with open(pdf_path, "rb") as f:
    pdf_content = f.read()

db = SessionLocal()
try:
    print("Testing validate_import_files...")
    mock_file = MockUploadFile("CLAIM REPORT AT VINA G7 FACTORY (JUNE - 2026).pdf", pdf_content)
    validate_import_files([mock_file], db)
    print("Validation passed!")
    
    print("\nTesting process_pdf_import...")
    # Reset mock file seek for reading again if needed, or just pass bytes
    res = process_pdf_import(pdf_content, "CLAIM REPORT AT VINA G7 FACTORY (JUNE - 2026).pdf", db)
    print("Import passed!")
    print(res)
except Exception as e:
    import traceback
    print("EXCEPTION OCCURRED:")
    print(str(e))
    traceback.print_exc()
finally:
    db.close()
