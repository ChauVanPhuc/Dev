# -*- coding: utf-8 -*-
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from modules.iso_approval.routes.iso_approval_router import router as iso_approval_router

try:
    import app.routes  # Preload models to satisfy foreign key relationships
except Exception:
    pass

app = FastAPI(
    title="SmartFlow ISO Approval Microservice",
    description="Phân hệ Quản lý & Phê duyệt Hồ sơ ISO độc lập",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(iso_approval_router, prefix="/api/v1/iso-approvals", tags=["iso-approvals"])

@app.get("/")
def root():
    return {"module": "ISOApproval", "status": "running", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8005, reload=True)
