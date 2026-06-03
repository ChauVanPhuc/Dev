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
