import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from contextlib import contextmanager

try:
    from report_config import settings
except ImportError:
    from Report.report_config import settings

logger = logging.getLogger("report_db")

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,
    pool_pre_ping=True,
    pool_timeout=30,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

@contextmanager
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        logger.error(f"Database session error: {e}")
        raise
    finally:
        db.close()

def test_connection():
    try:
        with get_db() as db:
            res = db.execute(text("SELECT 1")).scalar()
            return res == 1
    except Exception as e:
        logger.error(f"DB connection test failed: {e}")
        return False
