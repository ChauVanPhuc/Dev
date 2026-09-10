from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
Base = declarative_base()
from app.core.config import settings

# Khởi tạo engine để kết nối với cơ sở dữ liệu SQL Server
# Sử dụng chuỗi kết nối (connection string) được cấu hình trong file .env
engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URL,
    pool_size=50,
    max_overflow=100,
    pool_recycle=1800,
    pool_pre_ping=True
)

@event.listens_for(engine, "connect")
def set_sql_server_options(dbapi_connection, connection_record):
    try:
        cursor = dbapi_connection.cursor()
        cursor.execute("SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED")
        cursor.close()
    except Exception:
        pass

# Tạo SessionLocal class, factory để tạo ra các session riêng biệt cho từng request
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
