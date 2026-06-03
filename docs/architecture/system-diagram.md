# System Diagram

Sơ đồ chi tiết hệ thống SmartFlow v2.

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Presentation Layer"
        Web[Web Admin<br/>React + Vite]
        Mobile[Mobile App<br/>React + Capacitor]
    end
    
    subgraph "Application Layer"
        API[FastAPI Backend<br/>Python 3.13]
        WS[WebSocket Server]
    end
    
    subgraph "Data Layer"
        DB[(SQL Server<br/>SmartFlowDB)]
    end
    
    subgraph "External Services"
        FCM[Firebase Cloud Messaging]
        Cloud[Cloudflare Tunnel]
    end
    
    Web -->|HTTP/HTTPS| API
    Mobile -->|HTTP/HTTPS| API
    Mobile -->|WebSocket| WS
    API -->|SQLAlchemy| DB
    API -->|FCM| FCM
    API -->|Tunnel| Cloud
```

---

## Component Interaction

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant Web as 🌐 Web Admin
    participant Mobile as 📱 Mobile App
    participant API as 🚀 Backend API
    participant DB as 🗄️ Database
    participant WS as 🔌 WebSocket
    participant FCM as 🔔 FCM

    User->>Web: Login
    Web->>API: POST /accounts/login
    API->>DB: Query user
    DB-->>API: User data
    API-->>Web: JWT token
    Web-->>User: Dashboard

    User->>Mobile: Create delivery
    Mobile->>API: POST /deliveries/
    API->>DB: Create delivery
    API-->>Mobile: QR code
    API->>WS: Broadcast notification
    WS-->>Mobile: Real-time notification
    API->>FCM: Push notification
    FCM-->>Mobile: Push notification
```

---

## Data Flow

```mermaid
graph LR
    A[User Action] --> B[Component]
    B --> C[Service/API Call]
    C --> D[Backend API]
    D --> E[Database]
    E --> D
    D --> C
    C --> F[State Update]
    F --> B
    B --> G[UI Re-render]
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        CF[Cloudflare Tunnel<br/>HTTPS + DDoS Protection]
        Nginx[Nginx Reverse Proxy<br/>SSL Termination]
        Backend[Backend Container<br/>FastAPI:8000]
        Frontend[Frontend Container<br/>Nginx:80]
        SQL[SQL Server<br/>Database]
    end
    
    Internet --> CF
    CF --> Nginx
    Nginx --> Frontend
    Nginx --> Backend
    Backend --> SQL
```

---

**Last Updated:** 2026-06-03
