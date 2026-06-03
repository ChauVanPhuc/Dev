# Docker Deployment

Tài liệu này hướng dẫn cách deploy SmartFlow v2 sử dụng Docker.

---

## 📋 Mục lục (Table of Contents)

1. [Backend Dockerfile](#-backend-dockerfile)
2. [Frontend Dockerfile](#-frontend-dockerfile)
3. [Docker Compose](#-docker-compose)
4. [Build và Run](#-build-và-run)
5. [Docker Commands](#-docker-commands)

---

## 🐳 Backend Dockerfile

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

---

## 🌐 Frontend Dockerfile

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

---

## 📦 Docker Compose

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

---

## 🔨 Build và Run

### Build Images

```bash
docker-compose build
```

### Start Services

```bash
docker-compose up -d
```

### View Logs

```bash
docker-compose logs -f
```

### Stop Services

```bash
docker-compose down
```

### Restart Services

```bash
docker-compose restart
```

---

## 🛠️ Docker Commands

### View Running Containers

```bash
docker ps
```

### View Container Logs

```bash
docker logs smartflow-backend
docker logs smartflow-frontend
```

### Enter Container

```bash
docker exec -it smartflow-backend bash
```

### Rebuild Specific Service

```bash
docker-compose build backend
docker-compose up -d backend
```

---

**Last Updated:** 2026-06-03
