# -*- coding: utf-8 -*-
import os
from dotenv import load_dotenv

# Load .env file from project root, Claim/BackEnd or BackEnd
possible_env_paths = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "Claim", "BackEnd", ".env")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "BackEnd", ".env")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env")),
]
for env_path in possible_env_paths:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

class Settings:
    APPSHEET_URL: str = os.getenv(
        "APPSHEET_URL",
        "https://www.appsheet.com/start/600686db-6622-4b98-a276-02cdb3e0ab2b"
    )
    APPSHEET_GOOGLE_EMAIL: str = os.getenv("APPSHEET_GOOGLE_EMAIL", "atlasfactory06@gmail.com")
    APPSHEET_GOOGLE_PASSWORD: str = os.getenv("APPSHEET_GOOGLE_PASSWORD", "Factory12345")
    HEADLESS: bool = os.getenv("APPSHEET_HEADLESS", "True").lower() == "true"
    
    # Fast-Path & Performance Configuration
    APPSHEET_TEMPLATE_ID: str = os.getenv("APPSHEET_TEMPLATE_ID", "600686db-6622-4b98-a276-02cdb3e0ab2b")
    IMAGE_DOWNLOAD_WORKERS: int = int(os.getenv("IMAGE_DOWNLOAD_WORKERS", "16"))
    USE_DIRECT_API_FASTPATH: bool = os.getenv("USE_DIRECT_API_FASTPATH", "True").lower() == "true"
    APPSHEET_WEBHOOK_SECRET: str = os.getenv("APPSHEET_WEBHOOK_SECRET", "SmartFlow_2026")
    
    # Path settings (Relative to project root)
    PROJECT_ROOT: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    MODULE_ROOT: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    
    STORAGE_AUTH_DIR: str = os.path.join(MODULE_ROOT, "storage", "auth")
    STORAGE_STATE_FILE: str = os.path.join(STORAGE_AUTH_DIR, "storage_state.json")
    STORAGE_IMAGES_DIR: str = os.path.join(MODULE_ROOT, "storage", "images")
    STORAGE_EXPORTS_DIR: str = os.path.join(MODULE_ROOT, "storage", "exports")
    STORAGE_WEBHOOKS_DIR: str = os.path.join(MODULE_ROOT, "storage", "webhooks")

settings = Settings()

# Ensure internal storage directories exist
os.makedirs(settings.STORAGE_AUTH_DIR, exist_ok=True)
os.makedirs(settings.STORAGE_IMAGES_DIR, exist_ok=True)
os.makedirs(settings.STORAGE_EXPORTS_DIR, exist_ok=True)
os.makedirs(settings.STORAGE_WEBHOOKS_DIR, exist_ok=True)
