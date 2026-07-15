from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
Base = declarative_base()
from config.settings import settings


# Khởi tạo engine để kết nối với cơ sở dữ liệu SQL Server
# Sử dụng chuỗi kết nối (connection string) được cấu hình trong file .env
engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URL,
    pool_size=100,          # Tăng pool sẵn sàng: 50 → 100
    max_overflow=400,       # Cho phép burst tối đa 500 connections (100 + 400)
    pool_recycle=1800,      # Tái tạo connection sau 30 phút
    pool_pre_ping=True,     # Kiểm tra connection còn sống trước khi dùng
    pool_timeout=30,        # Timeout chờ lấy connection từ pool (giây)
)

# Tạo SessionLocal class, bản thân nó không phải là database session thực sự
# Nó là một factory để tạo ra các session riêng biệt cho từng request
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    Dependency dùng để cung cấp Database Session cho các FastAPI Endpoints.
    Quản lý việc mở session khi nhận request và tự động đóng session sau khi xử lý xong (context manager).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
