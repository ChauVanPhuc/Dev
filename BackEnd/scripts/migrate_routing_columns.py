import sys
import os

# Add BackEnd root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config.database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        # 1. Add 'line' to production_routings if not exists
        try:
            conn.execute(text("""
                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns 
                    WHERE object_id = OBJECT_ID('production_routings') AND name = 'line'
                )
                BEGIN
                    ALTER TABLE production_routings ADD line NVARCHAR(100) NULL;
                END
            """))
            conn.commit()
            print("Successfully checked/added 'line' to production_routings")
        except Exception as e:
            print("Error on production_routings.line:", e)

        # 2. Add 'factory' to production_routing_nodes if not exists
        try:
            conn.execute(text("""
                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns 
                    WHERE object_id = OBJECT_ID('production_routing_nodes') AND name = 'factory'
                )
                BEGIN
                    ALTER TABLE production_routing_nodes ADD factory NVARCHAR(100) NULL;
                END
            """))
            conn.commit()
            print("Successfully checked/added 'factory' to production_routing_nodes")
        except Exception as e:
            print("Error on production_routing_nodes.factory:", e)

        # 3. Add 'factory' to production_teams if not exists
        try:
            conn.execute(text("""
                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns 
                    WHERE object_id = OBJECT_ID('production_teams') AND name = 'factory'
                )
                BEGIN
                    ALTER TABLE production_teams ADD factory NVARCHAR(100) NULL;
                END
            """))
            conn.commit()
            print("Successfully checked/added 'factory' to production_teams")
        except Exception as e:
            print("Error on production_teams.factory:", e)

if __name__ == '__main__':
    run_migration()
