import sys
sys.stdout.reconfigure(encoding='utf-8')

from sqlalchemy import create_engine, text
from config.settings import settings

engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)

with engine.connect() as conn:
    # Get all documents
    result = conn.execute(text("SELECT id, code, name, symbol, file_path FROM iso_documents"))
    print("Documents in DB:")
    for row in result:
        print(f"ID: {row[0]}, Code: {row[1]}, Name: {row[2]}, Symbol: {row[3]}, File: {row[4]}")
