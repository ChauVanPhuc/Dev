# System Architecture - SmartFlow v2

Tài liệu này mô tả kiến trúc tổng thể của hệ thống SmartFlow v2.

---

## 📋 Mục lục (Table of Contents)

1. [Tổng quan](#-tổng-quánverview)
2. [Architecture Diagram](#-architecture-diagram)
3. [Component Overview](#-component-overview)
4. [Technology Stack](#-technology-stack)
5. [Design Principles](#-design-principles)

---

## 🎯 Tổng quan (Overview)

SmartFlow v2 là hệ thống ERP sản xuất với kiến trúc 3-tier:

1. **Presentation Layer** - Frontend (Web Admin + Mobile App)
2. **Application Layer** - Backend API (FastAPI)
3. **Data Layer** - Database (SQL Server)

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌─────────────────┐          ┌─────────────────┐          │
│  │   Web Admin     │          │   Mobile App     │          │
│  │  (React + Vite) │          │ (React + Capacitor)│         │
│  └─────────────────┘          └─────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                          │
│              FastAPI (http://localhost:8000)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Auth, Plans, Orders, Deliveries, QC, Notifications   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                               │
│              SQL Server (SmartFlowDB)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Accounts, Roles, Plans, Orders, Deliveries, QC      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 Component Overview

### Presentation Layer

**Web Admin:**
- React 18 + Vite
- Desktop-first design
- Rich dashboard và reports
- Complex forms và tables

**Mobile App:**
- React + Capacitor
- Mobile-first design
- Touch-optimized UI
- Camera integration, QR scanning

### Application Layer

**Backend API:**
- FastAPI (Python 3.13)
- RESTful API design
- JWT authentication
- WebSocket cho real-time
- SQLAlchemy ORM

### Data Layer

**Database:**
- Microsoft SQL Server 2019+
- Relational database
- ACID transactions
- Backup/restore support

---

## 🛠️ Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.13+ | Runtime |
| FastAPI | 0.104+ | Web Framework |
| SQLAlchemy | 2.0+ | ORM |
| Pydantic | 2.0+ | Validation |
| Bcrypt | 4.0+ | Password hashing |
| PyJWT | 2.8+ | JWT tokens |

### Frontend Web

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18+ | UI Framework |
| Vite | 5+ | Build Tool |
| React Router | 6+ | Routing |
| Zustand | 4+ | State Management |
| Axios | 1.6+ | HTTP Client |
| TailwindCSS | 3+ | Styling |

### Frontend Mobile

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18+ | UI Framework |
| Capacitor | 6+ | Native Bridge |
| React Router | 6+ | Routing |
| Zustand | 4+ | State Management |

---

## 🎨 Design Principles

### 1. Separation of Concerns

Mỗi layer có trách nhiệm riêng biệt:
- Presentation: UI và user interaction
- Application: Business logic và API
- Data: Data persistence

### 2. RESTful API

API tuân thủ REST principles:
- Resource-based URLs
- HTTP methods (GET, POST, PUT, DELETE)
- Stateless
- JSON format

### 3. Security

- JWT authentication
- RBAC (Role-Based Access Control)
- SQL injection prevention
- XSS protection

### 4. Scalability

- Stateless API
- Horizontal scaling ready
- Database connection pooling
- Caching support

---

## 📚 Chi tiết Architecture

Xem thêm chi tiết trong các file khác:

- [System Diagram](./system-diagram.md)
- [Tech Stack](./tech-stack.md)
- [Component Diagram](./component-diagram.md)
- [Data Flow](./data-flow.md)
- [Security](./security.md)

---

**Last Updated:** 2026-06-03
**Version:** 2.0
