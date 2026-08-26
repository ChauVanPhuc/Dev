import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('.')
from config.database import engine
from sqlalchemy import text

stage_map = {
    'nhập kho': 1, 'đầu vào': 1,
    'tạo phôi': 2, 'phôi': 2,
    'định hình': 3,
    'lắp ráp': 4,
    'sơn': 5,
    'đóng gói': 6,
    'lưu kho': 7
}

with engine.connect() as conn:
    teams = conn.execute(text('SELECT id, team_code, team_name, stage_name FROM production_teams')).fetchall()
    for t in teams:
        stg_name = (t.stage_name or '').lower()
        matched_id = None
        for k, v in stage_map.items():
            if k in stg_name:
                matched_id = v
                break
        
        if matched_id:
            conn.execute(text(f'UPDATE production_teams SET stage_id = {matched_id} WHERE id = {t.id}'))
            print(f'Fixed team ID {t.id} ({t.team_name}): stage_name="{t.stage_name}" -> stage_id={matched_id}')
    
    conn.commit()

print('Done fixing DB stage_ids!')
