"""
Simple Migration: Add SX confirmation columns to delivery_returns table
This script runs standalone SQL commands without app dependencies
"""

import pyodbc
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_connection():
    """Get database connection from environment variables"""
    server = os.getenv('DB_SERVER', 'localhost')
    database = os.getenv('DB_NAME', 'ERP_G7')
    username = os.getenv('DB_USER', 'sa')
    password = os.getenv('DB_PASSWORD', 'YourPassword123!')
    driver = '{ODBC Driver 17 for SQL Server}'
    
    connection_string = f'DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password}'
    
    try:
        conn = pyodbc.connect(connection_string)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        print(f"Connection string: {connection_string}")
        raise

def check_column_exists(conn, table_name, column_name):
    """Check if a column exists in a table"""
    cursor = conn.cursor()
    query = """
        SELECT COUNT(*) 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = ? AND COLUMN_NAME = ?
    """
    cursor.execute(query, (table_name, column_name))
    count = cursor.fetchone()[0]
    return count > 0

def add_columns(conn):
    """Add SX confirmation columns to delivery_returns table"""
    cursor = conn.cursor()
    
    columns_to_add = [
        ('sx_confirmed_by', 'INT NULL'),
        ('sx_confirmed_at', 'DATETIME NULL'),
        ('sx_confirmation_note', 'NVARCHAR(500) NULL')
    ]
    
    for column_name, column_def in columns_to_add:
        if not check_column_exists(conn, 'delivery_returns', column_name):
            try:
                sql = f"ALTER TABLE delivery_returns ADD {column_name} {column_def}"
                print(f"Adding column: {column_name}")
                cursor.execute(sql)
                conn.commit()
                print(f"✅ Successfully added column: {column_name}")
            except Exception as e:
                print(f"❌ Error adding column {column_name}: {e}")
                conn.rollback()
        else:
            print(f"⚠️ Column {column_name} already exists, skipping")

def main():
    try:
        print("Starting migration...")
        conn = get_connection()
        print("✅ Connected to database")
        
        add_columns(conn)
        
        conn.close()
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
