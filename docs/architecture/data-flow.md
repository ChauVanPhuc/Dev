# Data Flow

Tài liệu này mô tả luồng dữ liệu trong hệ thống SmartFlow v2.

---

## Request Flow

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant UI as 🖥️ UI Component
    participant Service as 📡 API Service
    participant API as 🚀 Backend API
    participant DB as 🗄️ Database

    User->>UI: User Action
    UI->>Service: Call API
    Service->>API: HTTP Request
    API->>DB: SQL Query
    DB-->>API: Query Result
    API-->>Service: JSON Response
    Service-->>UI: Parsed Data
    UI->>User: Update UI
```

---

## State Management Flow

```mermaid
graph LR
    A[User Action] --> B[Component State]
    B --> C[Zustand Store]
    C --> D[API Service]
    D --> E[Backend API]
    E --> F[Database]
    F --> E
    E --> D
    D --> C
    C --> B
    B --> G[UI Re-render]
```

---

## WebSocket Data Flow

```mermaid
sequenceDiagram
    participant Backend as 🚀 Backend
    participant WS as 🔌 WebSocket
    participant Web as 🌐 Web Admin
    participant Mobile as 📱 Mobile App
    participant FCM as 🔔 FCM

    Backend->>WS: Broadcast Event
    WS->>Web: Push Message
    WS->>Mobile: Push Message
    Backend->>FCM: Send Push Notification
    FCM->>Mobile: Push Notification
```

---

## File Upload Flow

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant UI as 🖥️ UI
    participant API as 🚀 Backend
    participant Storage as 💾 File Storage
    participant DB as 🗄️ Database

    User->>UI: Select Files
    UI->>UI: Compress Images
    UI->>API: POST /deliveries/ (multipart)
    API->>Storage: Save Files
    Storage-->>API: File URLs
    API->>DB: Save Delivery with File URLs
    DB-->>API: Success
    API-->>UI: QR Code
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant UI as 🖥️ UI
    participant API as 🚀 Backend
    participant DB as 🗄️ Database
    participant JWT as 🔑 JWT Service

    User->>UI: Enter Credentials
    UI->>API: POST /accounts/login
    API->>DB: Query User
    DB-->>API: User Data
    API->>API: Verify Password
    API->>JWT: Generate Token
    JWT-->>API: Access Token
    API-->>UI: Token + User Info
    UI->>UI: Store Token
    UI->>User: Redirect to Dashboard
```

---

## Delivery Creation Flow

```mermaid
sequenceDiagram
    participant Worker as 👷 Công nhân
    participant Mobile as 📱 Mobile App
    participant API as 🚀 Backend
    participant DB as 🗄️ Database
    participant QC as 👨‍🔬 QC
    participant WS as 🔌 WebSocket

    Worker->>Mobile: Create Delivery
    Mobile->>API: POST /deliveries/
    API->>DB: Save Delivery
    DB-->>API: Delivery ID
    API-->>Mobile: QR Code
    API->>WS: Notify QC
    WS->>QC: Push Notification
    QC->>Mobile: Open Delivery
    QC->>Mobile: Receive Delivery
    Mobile->>API: PUT /deliveries/{id}/receive
    API->>DB: Update Status
```

---

**Last Updated:** 2026-06-03
