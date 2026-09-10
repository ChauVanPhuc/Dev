import os
from dotenv import load_dotenv

# Load variables from .env to os.environ for chatbot services
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    """
    Cấu hình ứng dụng sử dụng Pydantic Settings.
    Các giá trị được lấy từ file .env.
    """
    # Database
    DB_SERVER: str
    DB_NAME: str
    DB_USER: Optional[str] = None
    DB_PASSWORD: Optional[str] = None
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 4320  # 3 days

    @property
    def SQLALCHEMY_DATABASE_URL(self) -> str:
        """
        Tạo chuỗi kết nối SQLAlchemy từ các biến môi trường.
        Hỗ trợ cả Windows Authentication và SQL Server Authentication.
        """
        if not self.DB_USER or not self.DB_PASSWORD:
            # Sử dụng Windows Authentication (Trusted Connection)
            return f"mssql+pyodbc://@{self.DB_SERVER}/{self.DB_NAME}?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes&TrustServerCertificate=yes&timeout=30"
        
        # Sử dụng SQL Server Authentication với tài khoản sa / user
        import urllib.parse
        encoded_password = urllib.parse.quote_plus(self.DB_PASSWORD)
        return f"mssql+pyodbc://{self.DB_USER}:{encoded_password}@{self.DB_SERVER}/{self.DB_NAME}?driver=ODBC+Driver+17+for+SQL+Server&TrustServerCertificate=yes&timeout=30"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

# ==============================================================================
# QUẢN LÝ ĐƯỜNG DẪN STATIC & UPLOAD CHUẨN (SINGLE SOURCE OF TRUTH)
# ==============================================================================
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BACKEND_DIR, "static")
UPLOADS_DIR = os.path.join(STATIC_DIR, "uploads")

# Đảm bảo thư mục static và uploads luôn sẵn sàng
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

def get_upload_dir(subfolder: str = "") -> str:
    """
    Trả về đường dẫn tuyệt đối chuẩn tới thư mục upload trong BackEnd/static/uploads/<subfolder>.
    Luôn đảm bảo thư mục đích tồn tại, loại bỏ hoàn toàn nguy cơ phân tán đường dẫn.
    """
    path = os.path.join(UPLOADS_DIR, subfolder) if subfolder else UPLOADS_DIR
    os.makedirs(path, exist_ok=True)
    return path

