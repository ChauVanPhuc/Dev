# 🚀 Deployment Guide - SmartFlow v2

Tài liệu này hướng dẫn cách triển khai SmartFlow v2 lên production, bao gồm Docker setup, Nginx configuration, Cloudflare Tunnel, CI/CD pipeline, và monitoring.

---

## 📋 Mục lục (Table of Contents)

1. [Tổng quan](#-tổng-quánverview)
2. [Prerequisites](#-prerequisites)
3. [Docker Deployment](#-docker-deployment)
4. [Nginx Configuration](#-nginx-configuration)
5. [Cloudflare Tunnel](#-cloudflare-tunnel)
6. [Database Deployment](#-database-deployment)
7. [CI/CD Pipeline](#-cicd-pipeline)
8. [Monitoring & Logging](#-monitoring--logging)
9. [Backup Strategy](#-backup-strategy)
10. [Troubleshooting](#-troubleshooting)

---

## 🎯 Tổng quan (Overview)

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Internet                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare Tunnel                          │
│              (HTTPS, DDoS Protection)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Nginx Reverse Proxy                      │
│         (Static Files, SSL Termination, Load Balancing)      │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────┐           ┌─────────────────────┐
│   Backend (Docker)  │           │   Frontend (Docker)  │
│   FastAPI:8000      │           │   Nginx:80           │
└─────────────────────┘           └─────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              SQL Server (Database)                          │
└─────────────────────────────────────────────────────────────┘
```

### Server Requirements

| Component | CPU | RAM | Disk | OS |
|------------|-----|-----|------|----|
| **Backend** | 2 cores | 4 GB | 20 GB | Ubuntu 22.04 |
| **Frontend** | 1 core | 2 GB | 10 GB | Ubuntu 22.04 |
| **Database** | 4 cores | 8 GB | 100 GB | Windows Server 2019 |

---

## 📦 Prerequisites

### Software Required

- **Docker** 24.0+
- **Docker Compose** 2.20+
- **Nginx** 1.24+
- **Cloudflare CLI** (optional)
- **Git** 2.30+

### Domain & SSL

- Domain name (ví dụ: smartflowg7.cloud)
- SSL certificate (Let's Encrypt hoặc Cloudflare SSL)

---

## 🐳 Docker Deployment

### 1. Backend Dockerfile

**Location:** `BackEnd/Dockerfile`

```dockerfile
FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    unixodbc-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create static directory
RUN mkdir -p static/uploads

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. Frontend Dockerfile

**Location:** `FrontEnd/Dockerfile`

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 3. Docker Compose

**Location:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./BackEnd
      dockerfile: Dockerfile
    container_name: smartflow-backend
    ports:
      - "8000:8000"
    environment:
      - DB_SERVER=${DB_SERVER}
      - DB_NAME=${DB_NAME}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - SECRET_KEY=${SECRET_KEY}
    volumes:
      - backend-static:/app/static
    restart: unless-stopped
    networks:
      - smartflow-network

  frontend:
    build:
      context: ./FrontEnd
      dockerfile: Dockerfile
    container_name: smartflow-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - smartflow-network

volumes:
  backend-static:

networks:
  smartflow-network:
    driver: bridge
```

### 4. Environment Variables

**Location:** `.env.production`

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

# WebSocket
WS_HEARTBEAT_INTERVAL=30
```

### 5. Build and Run

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart
```

---

## 🌐 Nginx Configuration

### 1. Nginx Config for Frontend

**Location:** `FrontEnd/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Static files with caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy to backend
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy
    location /ws/ {
        proxy_pass http://backend:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 2. Nginx Reverse Proxy (Main Server)

**Location:** `/etc/nginx/sites-available/smartflow`

```nginx
upstream backend {
    server localhost:8000;
}

upstream frontend {
    server localhost:8080;
}

server {
    listen 80;
    server_name smartflowg7.cloud www.smartflowg7.cloud;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name smartflowg7.cloud www.smartflowg7.cloud;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/smartflowg7.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/smartflowg7.cloud/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://backend/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Static files from backend
    location /static/ {
        proxy_pass http://backend/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. Enable Configuration

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/smartflow /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🌩️ Cloudflare Tunnel

### 1. Install Cloudflare CLI

```bash
# Download cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# Install
sudo dpkg -i cloudflared-linux-amd64.deb
```

### 2. Authenticate

```bash
cloudflared tunnel login
```

### 3. Create Tunnel

```bash
cloudflared tunnel create smartflow-tunnel
```

### 4. Configure Tunnel

**Location:** `cloudflared-config.yml`

```yaml
tunnel: <tunnel-id>
credentials-file: /home/user/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: smartflowg7.cloud
    service: http://localhost:80
  - hostname: api.smartflowg7.cloud
    service: http://localhost:8000
  - service: http_status:404
```

### 5. Run Tunnel

```bash
# Run as service
sudo cloudflared service install

# Start service
sudo systemctl start cloudflared

# Enable on boot
sudo systemctl enable cloudflared
```

---

## 🗄️ Database Deployment

### 1. SQL Server on Windows

**Installation:**
1. Download SQL Server 2019/2022 from Microsoft
2. Install with Mixed Mode authentication
3. Enable TCP/IP in SQL Server Configuration Manager
4. Configure firewall for port 1433

**Configuration:**
```sql
-- Create database
CREATE DATABASE SmartFlowDB;
GO

-- Create user
USE SmartFlowDB;
GO
CREATE LOGIN smartflow_user WITH PASSWORD = 'YourSecurePassword';
CREATE USER smartflow_user FOR LOGIN smartflow_user;
ALTER ROLE db_owner ADD MEMBER smartflow_user;
GO
```

### 2. SQL Server on Docker (Linux)

**Docker Compose:**
```yaml
services:
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: smartflow-sqlserver
    environment:
      - ACCEPT_EULA=Y
      - SA_PASSWORD=YourSecurePassword
    ports:
      - "1433:1433"
    volumes:
      - sqlserver-data:/var/opt/mssql
    restart: unless-stopped

volumes:
  sqlserver-data:
```

**Run:**
```bash
docker-compose up -d sqlserver
```

---

## 🔄 CI/CD Pipeline

### 1. GitHub Actions Workflow

**Location:** `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push Backend
        uses: docker/build-push-action@v4
        with:
          context: ./BackEnd
          push: true
          tags: smartflow/backend:latest
      
      - name: Build and push Frontend
        uses: docker/build-push-action@v4
        with:
          context: ./FrontEnd
          push: true
          tags: smartflow/frontend:latest
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/smartflow
            docker-compose pull
            docker-compose up -d
            docker system prune -f
```

### 2. Secrets Configuration

**GitHub Secrets:**
- `DOCKER_USERNAME` - Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub password
- `SERVER_HOST` - Server IP/hostname
- `SERVER_USER` - SSH username
- `SSH_PRIVATE_KEY` - SSH private key

---

## 📊 Monitoring & Logging

### 1. Application Logging

**Backend Logging (Python):**
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/smartflow/backend.log'),
        logging.StreamHandler()
    ]
)
```

**Frontend Logging:**
```javascript
// Configure logging in production
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
}
```

### 2. Log Rotation

**Logrotate Config:**
```
# /etc/logrotate.d/smartflow
/var/log/smartflow/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data www-data
}
```

### 3. Monitoring with Prometheus (Optional)

**Prometheus Config:**
```yaml
scrape_configs:
  - job_name: 'smartflow-backend'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
```

---

## 💾 Backup Strategy

### 1. Database Backup

**Automated Backup Script:**
```bash
#!/bin/bash
# /opt/scripts/backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/sqlserver"
DB_NAME="SmartFlowDB"

# Create backup
sqlcmd -S localhost -U sa -P 'YourPassword' -Q "
  BACKUP DATABASE ${DB_NAME} 
  TO DISK = '${BACKUP_DIR}/${DB_NAME}_${DATE}.bak'
  WITH FORMAT, MEDIANAME = 'SmartFlow_Backup'
"

# Keep only last 7 days
find ${BACKUP_DIR} -name "*.bak" -mtime +7 -delete
```

**Cron Job:**
```bash
# Daily backup at 2 AM
0 2 * * * /opt/scripts/backup-database.sh
```

### 2. File Backup

**Static Files Backup:**
```bash
#!/bin/bash
# /opt/scripts/backup-files.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/files"
SOURCE_DIR="/opt/smartflow/static/uploads"

# Create tar.gz
tar -czf ${BACKUP_DIR}/uploads_${DATE}.tar.gz ${SOURCE_DIR}

# Keep only last 7 days
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +7 -delete
```

---

## 🔧 Troubleshooting

### 1. Container Not Starting

**Check logs:**
```bash
docker-compose logs backend
docker-compose logs frontend
```

**Common Issues:**
- Port already in use: Change port in docker-compose.yml
- Database connection failed: Check DB_SERVER in .env
- Permission denied: Check file permissions

### 2. Nginx 502 Bad Gateway

**Check backend status:**
```bash
docker ps | grep smartflow-backend
curl http://localhost:8000/health
```

**Fix:**
- Restart backend: `docker-compose restart backend`
- Check nginx config: `sudo nginx -t`
- Reload nginx: `sudo systemctl reload nginx`

### 3. Database Connection Failed

**Check SQL Server:**
```bash
# Check if SQL Server is running
sudo systemctl status mssql-server

# Test connection
sqlcmd -S localhost -U sa -P 'YourPassword' -Q "SELECT 1"
```

**Fix:**
- Restart SQL Server
- Check firewall rules
- Verify ODBC driver installed

### 4. WebSocket Connection Failed

**Check nginx config:**
```nginx
location /ws/ {
    proxy_pass http://backend:8000/ws/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

**Fix:**
- Ensure Upgrade header is forwarded
- Check Cloudflare WebSocket support
- Verify backend WebSocket endpoint

---

## 📞 Hỗ trợ (Support)

Nếu bạn gặp vấn đề với deployment:

1. Kiểm tra **Docker Docs**: https://docs.docker.com/
2. Kiểm tra **Nginx Docs**: https://nginx.org/en/docs/
3. Liên hệ **DevOps Team**: devops@smartflowg7.cloud

---

**Last Updated:** 2026-06-03
**Version:** 2.0
**Branch:** test_v1
