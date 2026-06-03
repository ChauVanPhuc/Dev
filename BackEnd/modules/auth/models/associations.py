from sqlalchemy import Table, Column, Integer, ForeignKey
from config.database import Base

# Bảng liên kết giữa Permission và Stage (Many-to-Many)
permission_stage = Table(
    "permission_stage",
    Base.metadata,
    Column("permission_id", Integer, ForeignKey("permissions.id"), primary_key=True),
    Column("stage_id", Integer, ForeignKey("stages.id"), primary_key=True)
)

# Bảng liên kết giữa Role và Permission (Many-to-Many)
role_permission = Table(
    "role_permission",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id"), primary_key=True)
)
