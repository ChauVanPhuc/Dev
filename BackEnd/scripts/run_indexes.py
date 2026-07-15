import sys
import os
import re

# Add BackEnd path to sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from sqlalchemy import create_engine, text
from config.settings import settings

def main():
    print("Connecting to SQL Server database...")
    db_url = settings.SQLALCHEMY_DATABASE_URL
    print(f"Server: {settings.DB_SERVER}")
    print(f"Database: {settings.DB_NAME}")
    
    engine = create_engine(db_url)
    sql_file_path = os.path.join(os.path.dirname(__file__), "add_performance_indexes.sql")
    
    if not os.path.exists(sql_file_path):
        print(f"Error: SQL file not found at {sql_file_path}")
        return
        
    with open(sql_file_path, "r", encoding="utf-8") as f:
        sql_content = f.read()
        
    # Split by 'GO' statement (case-insensitive, on its own line)
    statements = re.split(r'^\s*GO\s*$', sql_content, flags=re.IGNORECASE | re.MULTILINE)
    
    with engine.connect() as connection:
        # Start a transaction
        trans = connection.begin()
        try:
            print("Executing index creation statements...")
            for statement in statements:
                stmt_clean = statement.strip()
                if not stmt_clean:
                    continue
                    
                # Skip USE database commands in SQLAlchemy execution since we are already connected to settings.DB_NAME
                if stmt_clean.upper().startswith("USE "):
                    continue
                    
                stmt_desc = stmt_clean[:120].encode('ascii', errors='replace').decode('ascii')
                print(f"Running statement:\n{stmt_desc}...")
                connection.execute(text(stmt_clean))
                
            trans.commit()
            print("Successfully executed all statements! Performance indexes created.")
        except Exception as e:
            trans.rollback()
            print(f"Error executing statement: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()
