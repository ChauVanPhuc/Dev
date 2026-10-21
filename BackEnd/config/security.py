from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from config.settings import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Kiểm tra tính hợp lệ của mật khẩu.
    Sử dụng thư viện bcrypt trực tiếp để tránh lỗi tương thích của passlib trên Python mới.
    """
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """
    Thực hiện băm mật khẩu (hashing).
    Sử dụng thuật toán bcrypt trực tiếp.
    """
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password_bytes, salt)
    return hashed_password.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Tạo mã xác thực JSON Web Token (JWT).
    Payload chứa các thông tin như username (sub) và thời gian hết hạn (exp).
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Sử dụng thời gian hết hạn mặc định từ cấu hình hệ thống
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # Ký nhận token bằng SECRET_KEY và thuật toán quy định
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from config.database import get_db


def get_current_user(request: Request, db: Session = Depends(get_db)):
    """
    Dependency kiểm tra token Bearer và trả về Account của người dùng đang đăng nhập.
    Bảo vệ các API nghiệp vụ quan trọng khỏi truy cập trái phép.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu đăng nhập để thực hiện thao tác này (Thiếu Bearer Token).",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = auth_header.split(" ")[1].strip()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token không hợp lệ (không có username).",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên làm việc đã hết hạn hoặc Token không hợp lệ. Vui lòng đăng nhập lại.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    from modules.auth.models.accounts import Account
    user = db.query(Account).filter(Account.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản không tồn tại trên hệ thống.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

