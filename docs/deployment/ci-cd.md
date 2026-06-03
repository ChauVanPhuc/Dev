# CI/CD Pipeline

Tài liệu này hướng dẫn cấu hình CI/CD pipeline cho SmartFlow v2.

---

## 📋 Mục lục (Table of Contents)

1. [GitHub Actions Workflow](#-github-actions-workflow)
2. [Docker Hub Integration](#-docker-hub-integration)
3. [Automated Deployment](#-automated-deployment)
4. [Secrets Configuration](#-secrets-configuration)

---

## 🔄 GitHub Actions Workflow

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

---

## 🐳 Docker Hub Integration

### Setup Docker Hub

1. Tạo Docker Hub account
2. Tạo repository: `smartflow/backend` và `smartflow/frontend`
3. Configure GitHub secrets

### GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub password/access token |
| `SERVER_HOST` | Server IP/hostname |
| `SERVER_USER` | SSH username |
| `SSH_PRIVATE_KEY` | SSH private key |

---

## 🚀 Automated Deployment

### Server Setup

```bash
# Clone repository
git clone https://github.com/mynd02work-bit/SmartFlow.git
cd SmartFlow

# Setup docker-compose
cp docker-compose.yml.example docker-compose.yml
# Edit docker-compose.yml with production values

# Start services
docker-compose up -d
```

### Auto-Deploy on Push

Khi push code lên branch `main`:
1. GitHub Actions triggers
2. Build Docker images
3. Push to Docker Hub
4. SSH to server
5. Pull new images
6. Restart services

---

## 🔐 Secrets Configuration

### GitHub Secrets Setup

1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret from table above

### Server Environment Variables

Create `.env.production` on server:

```env
DB_SERVER=your-sql-server
DB_NAME=SmartFlowDB
DB_USER=smartflow_user
DB_PASSWORD=your-secure-password
SECRET_KEY=your-very-secure-secret-key
```

---

**Last Updated:** 2026-06-03
