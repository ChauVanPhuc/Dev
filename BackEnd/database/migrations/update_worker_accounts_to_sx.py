import sys
import os
import codecs
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from config.database import SessionLocal
from modules.auth.models.permissions import Permission
from modules.auth.models.role import Role
from modules.auth.models.departments import Department
from modules.auth.models.accounts import Account

def run():
    db = SessionLocal()
    try:
        # 1. Tìm Role SX
        sx_role = db.query(Role).filter((Role.name == "SX") | (Role.name == "Sản Xuất")).first()
        if not sx_role:
            print("Chưa có Role SX trong DB. Đang tạo Role SX...")
            sx_role = Role(name="SX", description="Sản Xuất", is_active=True)
            db.add(sx_role)
            db.commit()
            db.refresh(sx_role)

        print(f"Role SX: ID = {sx_role.id}, Name = '{sx_role.name}', Description = '{sx_role.description}'")

        # 2. Tìm tất cả tài khoản Công Nhân
        worker_accounts = db.query(Account).filter(
            (Account.permission_level == "Công Nhân") | 
            (Account.username.in_(["thuy.ntt", "tinh.bt", "hien.dtk", "trinh.htd", "hanh.bh", "lai.htd"]))
        ).all()

        print(f"Tìm thấy {len(worker_accounts)} tài khoản công nhân cần cập nhật:")

        for acc in worker_accounts:
            print(f"- Cập nhật tài khoản ID {acc.id}: {acc.username} ({acc.full_name})")
            
            # Cập nhật permission_level nếu chưa có
            acc.permission_level = "Công Nhân"

            # Cập nhật junction trong bảng departments
            depts = db.query(Department).filter(Department.account_id == acc.id).all()
            if depts:
                for d in depts:
                    old_role_id = d.role_id
                    d.role_id = sx_role.id
                    print(f"  + Cập nhật Department record {d.id}: role_id {old_role_id} -> {sx_role.id} (SX)")
            else:
                # Nếu chưa có bản ghi department liên kết, tạo mới
                new_dept = Department(
                    account_id=acc.id,
                    role_id=sx_role.id,
                    name=f"Bộ phận SX ({acc.username})"
                )
                db.add(new_dept)
                print(f"  + Tạo mới Department record liên kết Role SX cho account {acc.id}")

        db.commit()
        print("\n=> Cập nhật thành công 100% tài khoản công nhân sang bộ phận SX!")

    except Exception as e:
        db.rollback()
        print(f"Lỗi migration: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run()
