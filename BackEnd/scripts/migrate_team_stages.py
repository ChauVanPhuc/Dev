import sys
import os
from sqlalchemy import text

# Set UTF-8 encoding for stdout
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import engine

def migrate_team_stages():
    print("=== Starting migration for Production Teams & Routing Nodes Stage Support ===")
    with engine.begin() as conn:
        # 1. Check & add columns to production_teams
        team_cols = [row[0] for row in conn.execute(text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'production_teams'
        """)).fetchall()]

        if 'stage_id' not in team_cols:
            print("Adding stage_id to production_teams...")
            conn.execute(text("ALTER TABLE production_teams ADD stage_id INT NULL;"))
        if 'stage_name' not in team_cols:
            print("Adding stage_name to production_teams...")
            conn.execute(text("ALTER TABLE production_teams ADD stage_name NVARCHAR(100) NULL;"))

        # 2. Check & add columns to production_routing_nodes
        node_cols = [row[0] for row in conn.execute(text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'production_routing_nodes'
        """)).fetchall()]

        if 'stage_id' not in node_cols:
            print("Adding stage_id to production_routing_nodes...")
            conn.execute(text("ALTER TABLE production_routing_nodes ADD stage_id INT NULL;"))
        if 'stage_name' not in node_cols:
            print("Adding stage_name to production_routing_nodes...")
            conn.execute(text("ALTER TABLE production_routing_nodes ADD stage_name NVARCHAR(100) NULL;"))

        # 3. Inspect existing stages in `stages` table
        stages = conn.execute(text("SELECT id, code, name FROM stages ORDER BY sequence, id")).fetchall()
        print(f"Found {len(stages)} stages in database:")
        for s in stages:
            print(f"  Stage ID {s[0]}: {s[1]} - {s[2]}")

        # 4. Map existing teams to matching stages
        teams = conn.execute(text("SELECT id, team_code, team_name, factory FROM production_teams")).fetchall()
        for t in teams:
            t_id, t_code, t_name, t_fac = t
            t_full = f"{t_code} {t_name}".lower()
            matched_stage = None
            
            # Find best match from stages
            for s in stages:
                s_id, s_code, s_name = s
                s_lower = s_name.lower()
                if "tạo phôi" in s_lower or "phôi" in s_lower:
                    if "phoi" in t_full or "phôi" in t_full or "xẻ" in t_full:
                        matched_stage = (s_id, s_name)
                        break
                elif "định hình" in s_lower:
                    if "dinhhinh" in t_full or "định hình" in t_full or "cnc" in t_full or "nẹp" in t_full or "khoan" in t_full or "uốn" in t_full:
                        matched_stage = (s_id, s_name)
                        break
                elif "lắp ráp" in s_lower or "lắp" in s_lower:
                    if "laprap" in t_full or "lắp ráp" in t_full or "hàn" in t_full or "module" in t_full or "nệm" in t_full:
                        matched_stage = (s_id, s_name)
                        break
                elif "sơn" in s_lower:
                    if "son" in t_full or "sơn" in t_full:
                        matched_stage = (s_id, s_name)
                        break
                elif "đóng gói" in s_lower or "gói" in s_lower:
                    if "donggoi" in t_full or "đóng gói" in t_full:
                        matched_stage = (s_id, s_name)
                        break
            
            if not matched_stage and stages:
                # Default to first stage or match by general order
                matched_stage = (stages[0][0], stages[0][2])
            
            if matched_stage:
                conn.execute(text("""
                    UPDATE production_teams 
                    SET stage_id = :sid, stage_name = :sname 
                    WHERE id = :tid
                """), {"sid": matched_stage[0], "sname": matched_stage[1], "tid": t_id})
                print(f"  Team {t_name} ({t_code}) -> Stage: {matched_stage[1]} (ID: {matched_stage[0]})")

        # 5. Update production_routing_nodes with stage_id and stage_name from their team
        conn.execute(text("""
            UPDATE prn
            SET prn.stage_id = pt.stage_id,
                prn.stage_name = pt.stage_name
            FROM production_routing_nodes prn
            JOIN production_teams pt ON prn.team_id = pt.id
        """))

    print("=== Migration completed successfully! ===")

if __name__ == "__main__":
    migrate_team_stages()
