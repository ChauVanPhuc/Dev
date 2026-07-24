import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
import os
import sys

# CẬP NHẬT: Trỏ vào thư mục BackEnd từ thư mục tests/backend/
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "BackEnd"))
sys.path.append(BASE_DIR)

from app.main import app
from config.database import get_db, Base

# SQLite cho Testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_db.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from sqlalchemy import event
import re

@event.listens_for(engine, "before_cursor_execute", retval=True)
def clean_sqlite_unicode_literals(conn, cursor, statement, parameters, context, executemany):
    if conn.dialect.name == "sqlite":
        statement = re.sub(r"\bN'", "'", statement)
    return statement, parameters

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    # Import models to register them on Base.metadata
    from modules.inspection.models.input_inspection import InputInspection
    from modules.inspection.models.stage_inspection import StageInspection
    Base.metadata.create_all(bind=engine)
    yield

@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
