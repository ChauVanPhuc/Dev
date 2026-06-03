from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base

class Department(Base):
    """
    Model đại diện cho bảng 'departments' (Phong ban / Phân cấp người dùng).
    Dùng để ánh xạ người dùng với Vai trò (Role), Quyền (Permission) và Công đoạn (Stage).
    """
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    
    # Các cột thông tin liên kết (Sử dụng ID để truy vấn, không ràng buộc cứng khóa ngoại để linh hoạt)
    account_id = Column(Integer, nullable=True)    # Liên kết với bảng accounts
    role_id = Column(Integer, nullable=True)       # Liên kết với bảng roles
    permission_id = Column(Integer, nullable=True) # Liên kết với bảng permissions
    stage_id = Column(Integer, nullable=True)      # Liên kết với bảng stages
    input_stage = Column(NVARCHAR(50), nullable=True) # Tên công đoạn đầu vào
    output_stage = Column(NVARCHAR(50), nullable=True) # Tên công đoạn đầu ra
