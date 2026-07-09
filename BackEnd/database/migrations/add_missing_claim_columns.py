# -*- coding: utf-8 -*-
"""
Migration script to add missing columns to customer_claims table
"""
import pyodbc
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection_string():
    """Get database connection string from environment variables"""
    server = os.getenv("DB_SERVER")
    database = os.getenv("DB_NAME")
    username = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    
    return f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};DATABASE={database};UID={username};PWD={password}"

def add_missing_columns():
    """Add missing columns to customer_claims table"""
    conn_str = get_db_connection_string()
    
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Check and add each column if it doesn't exist
        columns_to_add = [
            ("lpn", "NVARCHAR(50) NULL"),
            ("container_no", "NVARCHAR(50) NULL"),
            ("action", "NVARCHAR(200) NULL"),
            ("period", "NVARCHAR(20) NULL"),
            ("image_paths", "NVARCHAR(MAX) NULL"),
            ("image_captions", "NVARCHAR(MAX) NULL")
        ]
        
        for col_name, col_type in columns_to_add:
            # Check if column exists
            cursor.execute("""
                SELECT COUNT(*) 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'customer_claims' AND COLUMN_NAME = ?
            """, col_name)
            
            if cursor.fetchone()[0] == 0:
                print(f"Adding column {col_name}...")
                cursor.execute(f"ALTER TABLE customer_claims ADD {col_name} {col_type}")
                print(f"Column {col_name} added successfully")
            else:
                print(f"Column {col_name} already exists")
        
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_missing_columns()
