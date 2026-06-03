# Component Diagram

Sơ đồ chi tiết các component trong hệ thống SmartFlow v2.

---

## Backend Components

```mermaid
graph TB
    subgraph "FastAPI Application"
        Main[main.py<br/>Application Entry]
        Routes[routes.py<br/>API Router]
        Auth[Auth Module<br/>accounts, roles, permissions]
        Plans[Plans Module<br/>product_plans]
        Orders[Orders Module<br/>orders, order_items]
        Delivery[Delivery Module<br/>deliveries, delivery_details]
        QC[QC Module<br/>inspections, checklists]
        Notify[Notification Module<br/>notifications]
    end
    
    subgraph "Database Layer"
        DB[(SQL Server)]
    end
    
    Main --> Routes
    Routes --> Auth
    Routes --> Plans
    Routes --> Orders
    Routes --> Delivery
    Routes --> QC
    Routes --> Notify
    
    Auth --> DB
    Plans --> DB
    Orders --> DB
    Delivery --> DB
    QC --> DB
    Notify --> DB
```

---

## Frontend Web Components

```mermaid
graph TB
    subgraph "React Application"
        App[App.jsx<br/>Root Component]
        Router[React Router<br/>Routing]
        Layout[MainLayout<br/>Sidebar + Header]
        Dashboard[Dashboard View]
        Plan[Plan Views]
        Order[Order Views]
        Delivery[Delivery Views]
        Shared[Shared Components<br/>Button, Input, Card]
    end
    
    App --> Router
    Router --> Layout
    Router --> Dashboard
    Router --> Plan
    Router --> Order
    Router --> Delivery
    
    Layout --> Shared
    Dashboard --> Shared
    Plan --> Shared
    Order --> Shared
    Delivery --> Shared
```

---

## Frontend Mobile Components

```mermaid
graph TB
    subgraph "React Application"
        App[App.jsx<br/>Root Component]
        Router[React Router<br/>Routing]
        Layout[MobileLayout<br/>Header + BottomNav]
        Plan[Plan Tracking View]
        Delivery[Delivery Views<br/>Create + Receive]
        QC[Inspection View]
        Notify[Notification View]
        Shared[Shared Components<br/>Button, Input, Card]
    end
    
    App --> Router
    Router --> Layout
    Router --> Plan
    Router --> Delivery
    Router --> QC
    Router --> Notify
    
    Layout --> Shared
    Plan --> Shared
    Delivery --> Shared
    QC --> Shared
    Notify --> Shared
```

---

## Component Relationships

### Backend Module Structure

```
app/
├── main.py              # Application entry point
├── routes.py            # API router aggregation
├── dependencies.py      # Dependency injection
└── modules/
    ├── auth/            # Authentication & Authorization
    │   ├── models/      # SQLAlchemy models
    │   ├── schemas/     # Pydantic schemas
    │   ├── services/    # Business logic
    │   └── routes/      # API endpoints
    ├── plans/           # Production Plans
    ├── orders/          # Orders
    ├── delivery/        # Deliveries
    ├── inspection/      # QC Inspections
    └── notification/    # Notifications
```

### Frontend Web Module Structure

```
Web/
├── app/
│   ├── App.jsx          # Root component
│   └── bootstrap.jsx    # Bootstrap logic
├── Shared/              # Shared components
│   ├── Views/           # Shared views
│   ├── Services/        # API services
│   └── components/      # UI components
└── [Modules]/           # Business modules
    ├── Auth/
    ├── Dashboard/
    ├── Plan/
    ├── Order/
    └── Delivery/
```

### Frontend Mobile Module Structure

```
Mobile/
├── app/
│   ├── App.jsx          # Root component
│   └── bootstrap.jsx    # Bootstrap logic
├── Shared/              # Shared components
│   ├── Views/           # Shared views
│   ├── Services/        # API services
│   └── components/      # UI components
└── [Modules]/           # Business modules
    ├── Auth/
    ├── Delivery/
    ├── Production/
    └── Notification/
```

---

**Last Updated:** 2026-06-03
