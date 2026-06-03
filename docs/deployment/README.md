# Deployment Documentation - SmartFlow v2

Tài liệu này cung cấp tổng quan về deployment của SmartFlow v2.

---

## 📋 Mục lục (Table of Contents)

1. [Tổng quan](#-tổng-quánverview)
2. [Deployment Architecture](#-deployment-architecture)
3. [Prerequisites](#-prerequisites)
4. [Deployment Options](#-deployment-options)
5. [Environment Variables](#-environment-variables)

---

## 🎯 Tổng quan (Overview)

SmartFlow v2 có thể được deploy theo nhiều cách:

- **Docker** - Containerized deployment
- **Traditional** - Direct server deployment
- **Cloud** - Cloud platform deployment

---

## 🏗️ Deployment Architecture

```
Internet
    │
    ▼
Cloudflare Tunnel (HTTPS + DDoS Protection)
    │
    ▼
Nginx Reverse Proxy (SSL Termination, Load Balancing)
    │
    ├──────────────┬──────────────┐
    ▼              ▼              ▼
Backend         Frontend      Database
(FastAPI)       (Nginx)      (SQL Server)
:8000           :80           :1433
```

---

## 📦 Prerequisites

### Software Required

- Docker 24.0+
- Docker Compose 2.20+
- Nginx 1.24+
- SQL Server 2019+
- Git 2.30+

### Hardware Requirements

| Component | CPU | RAM | Disk |
|------------|-----|-----|------|
| Backend | 2 cores | 4 GB | 20 GB |
| Frontend | 1 core | 2 GB | 10 GB |
| Database | 4 cores | 8 GB | 100 GB |

---

## 🚀 Deployment Options

### 1. Docker Deployment (Recommended)

Dùng Docker Compose để deploy toàn bộ hệ thống.

### 2. Traditional Deployment

Deploy trực tiếp lên server với systemd services.

### 3. Cloud Deployment

Deploy lên cloud platforms (AWS, Azure, GCP).

---

## 🔧 Environment Variables

### Backend Environment Variables

```env
# Database
DB_SERVER=your-sql-server
DB_NAME=SmartFlowDB
DB_USER=sa
DB_PASSWORD=your-secure-password
DB_DRIVER=ODBC Driver 17 for SQL Server

# JWT
SECRET_KEY=your-very-secure-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# CORS
CORS_ORIGINS=https://smartflowg7.cloud,https://www.smartflowg7.cloud

# File Upload
UPLOAD_DIR=/app/static/uploads
MAX_UPLOAD_SIZE=10485760
```

### Frontend Environment Variables

```env
VITE_API_URL=https://smartflowg7.cloud/api/v1
VITE_WS_URL=wss://smartflowg7.cloud/ws
```

---

## 📚 Chi tiết Deployment

Xem thêm chi tiết trong các file khác:

- [Docker](./docker.md) - Docker setup và configuration
- [Nginx](./nginx.md) - Nginx reverse proxy configuration
- [Cloudflare](./cloudflare.md) - Cloudflare Tunnel setup
- [CI/CD](./ci-cd.md) - CI/CD pipeline configuration
- [Monitoring](./monitoring.md) - Monitoring và logging

---

**Last Updated:** 2026-06-03
**Version:** 2.0
