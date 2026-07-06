import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from config.database import SessionLocal
from modules.auth.models.accounts import Account
from modules.auth.models.role import Role
from modules.auth.models.permissions import Permission
from modules.auth.models.departments import Department
from config.security import get_password_hash
import app.models

db = SessionLocal()
try:
    # Find IT role
    it_role = db.query(Role).filter(Role.name == "IT").first()
    # Find Admin permission
    admin_perm = db.query(Permission).filter(Permission.name == "Admin").first()
    
    # Check if admin account exists
    admin = db.query(Account).filter(Account.username == "admin").first()
    if not admin:
        admin = Account(
            username="admin",
            email="admin@smartflow.com",
            phone="0987654321",
            hashed_password=get_password_hash("Admin@123"),
            is_active=True,
            employee_id="EMP001",
            full_name="Admin SmartFlow",
            status="Đang sử dụng",
            permission_level="admin"
        )
        db.add(admin)
        db.flush()
        
        # Create department relation
        dept = Department(
            account_id=admin.id,
            role_id=it_role.id if it_role else None,
            permission_id=admin_perm.id if admin_perm else None,
            stage_id=None
        )
        db.add(dept)
        db.commit()
        print("Admin account seeded successfully!")
    else:
        print("Admin account already exists.")

    # Seed additional user accounts
    accounts_to_seed = [
        {
            "username": "qc",
            "email": "qc@smartflow.com",
            "phone": "0987654322",
            "password": "QC@123",
            "employee_id": "EMP002",
            "full_name": "QC Nguyễn Văn A",
            "permission_level": "user",
            "role_name": "QLCL",
            "perm_name": "NV QC"
        },
        {
            "username": "qa",
            "email": "qa@smartflow.com",
            "phone": "0987654323",
            "password": "QA@123",
            "employee_id": "EMP003",
            "full_name": "QA Trần Thị B",
            "permission_level": "user",
            "role_name": "QLCL",
            "perm_name": "NV QA"
        },
        {
            "username": "qclead",
            "email": "qclead@smartflow.com",
            "phone": "0987654324",
            "password": "QCLead@123",
            "employee_id": "EMP004",
            "full_name": "QC Lead Phạm Văn C",
            "permission_level": "manager",
            "role_name": "QLCL",
            "perm_name": "QC Lead"
        },
        {
            "username": "sx",
            "email": "sx@smartflow.com",
            "phone": "0987654325",
            "password": "SX@123",
            "employee_id": "EMP005",
            "full_name": "SX Lê Văn D",
            "permission_level": "user",
            "role_name": "Sx",
            "perm_name": "NV SX"
        },
        {
            "username": "bgd",
            "email": "bgd@smartflow.com",
            "phone": "0987654326",
            "password": "BGD@123",
            "employee_id": "EMP006",
            "full_name": "Director Hoàng Văn E",
            "permission_level": "admin",
            "role_name": "BGD",
            "perm_name": "Giám đốc"
        }
    ]

    for acc_data in accounts_to_seed:
        existing = db.query(Account).filter(Account.username == acc_data["username"]).first()
        if not existing:
            # Query role and permission
            role_obj = db.query(Role).filter(Role.name == acc_data["role_name"]).first()
            perm_obj = db.query(Permission).filter(Permission.name == acc_data["perm_name"]).first()
            
            new_acc = Account(
                username=acc_data["username"],
                email=acc_data["email"],
                phone=acc_data["phone"],
                hashed_password=get_password_hash(acc_data["password"]),
                is_active=True,
                employee_id=acc_data["employee_id"],
                full_name=acc_data["full_name"],
                status="Đang sử dụng",
                permission_level=acc_data["permission_level"]
            )
            db.add(new_acc)
            db.flush()
            
            dept_obj = Department(
                account_id=new_acc.id,
                role_id=role_obj.id if role_obj else None,
                permission_id=perm_obj.id if perm_obj else None,
                stage_id=None
            )
            db.add(dept_obj)
            db.commit()
            print(f"User account '{acc_data['username']}' seeded successfully!")
        else:
            print(f"User account '{acc_data['username']}' already exists.")
except Exception as e:
    db.rollback()
    print(f"Error seeding admin: {e}")
finally:
    db.close()
