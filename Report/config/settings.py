import os
import urllib.parse
from dotenv import load_dotenv

REPORT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(REPORT_DIR)
BACKEND_DIR = os.path.join(PROJECT_ROOT, "BackEnd")

# Load environment variables: check Report/.env first, then BackEnd/.env
for env_path in [os.path.join(REPORT_DIR, ".env"), os.path.join(BACKEND_DIR, ".env")]:
    if os.path.exists(env_path):
        load_dotenv(dotenv_path=env_path, override=False)

class ReportSettings:
    REPORT_DIR: str = REPORT_DIR
    OUTPUT_DIR: str = os.path.join(REPORT_DIR, "output")
    TEMPLATES_DIR: str = os.path.join(REPORT_DIR, "templates")
    ASSETS_DIR: str = os.path.join(TEMPLATES_DIR, "assets")

    # DB Connection
    DB_SERVER: str = os.getenv("DB_SERVER", "localhost")
    DB_NAME: str = os.getenv("DB_NAME", "SmartFlow")
    DB_USER: str = os.getenv("DB_USER", "")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")

    # ISO Code & Company Metadata
    ORG_NAME: str = "HỆ THỐNG SMARTFLOW ERP V3 — BAN QUẢN LÝ CHẤT LƯỢNG (QLCL)"
    ISO_PREFIX: str = "SF-QC"
    
    @property
    def DATABASE_URL(self) -> str:
        if not self.DB_USER or not self.DB_PASSWORD:
            # Windows Trusted Connection
            return f"mssql+pyodbc://@{self.DB_SERVER}/{self.DB_NAME}?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes&TrustServerCertificate=yes&timeout=30"
        
        encoded_pwd = urllib.parse.quote_plus(self.DB_PASSWORD)
        return f"mssql+pyodbc://{self.DB_USER}:{encoded_pwd}@{self.DB_SERVER}/{self.DB_NAME}?driver=ODBC+Driver+17+for+SQL+Server&TrustServerCertificate=yes&timeout=30"

settings = ReportSettings()
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
