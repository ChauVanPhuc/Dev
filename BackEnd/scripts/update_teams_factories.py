import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config.database import engine
from sqlalchemy import text

def update_factories():
    with engine.connect() as conn:
        conn.execute(text("""
            UPDATE production_teams 
            SET factory = N'Vaniti Phân Xưởng 1' 
            WHERE factory = N'Nhà máy 1' OR team_code LIKE '%NM1%';

            UPDATE production_teams 
            SET factory = N'Vaniti Phân Xưởng 2' 
            WHERE factory = N'Nhà máy 2' OR team_code LIKE '%NM2%';

            UPDATE production_teams 
            SET factory = N'Vaniti Phân Xưởng 3' 
            WHERE factory = N'Nhà máy 3' OR team_code LIKE '%NM3%';

            UPDATE production_teams 
            SET factory = N'Vaniti Phân Xưởng 3' 
            WHERE factory = N'Nhà máy 4' OR team_code LIKE '%NM4%';
        """))
        conn.commit()
        print("Updated production_teams factory names successfully!")

        res = conn.execute(text("SELECT id, team_code, team_name, factory FROM production_teams")).fetchall()
        for r in res:
            print(f"Team: {r[1]} - {r[2]} -> Factory: {r[3]}")

if __name__ == '__main__':
    update_factories()
