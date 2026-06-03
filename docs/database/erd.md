# Entity Relationship Diagram (ERD)

Sơ đồ quan hệ giữa các bảng trong database SmartFlow v2.

---

## 📋 Mục lục (Table of Contents)

1. [ERD Overview](#-erd-overview)
2. [Key Relationships](#-key-relationships)
3. [Relationship Diagram](#-relationship-diagram)

---

## 🎯 ERD Overview

SmartFlow v2 database có các quan hệ chính:

- **One-to-Many**: Plan → Orders, Order → Products, Delivery → DeliveryDetails
- **Many-to-Many**: Role ↔ Permission, Permission ↔ Stage
- **Self-Referencing**: Plan → Plan (nếu có kế hoạch con)

---

## 🔗 Key Relationships

### 1. ProductPlan → Orders

```mermaid
erDiagram
    PRODUCT_PLANS ||--o{ ORDERS : "includes"
    PRODUCT_PLANS {
        int id PK
        string code UK
        string name
        int month
        int year
        int status
    }
    ORDERS {
        int id PK
        string order_code
        string customer
        int plan_id FK
        int order_status
    }
```

### 2. Order → Products

```mermaid
erDiagram
    ORDERS ||--o{ PRODUCTS : "produces"
    ORDERS {
        int id PK
        string order_code
        int plan_id FK
    }
    PRODUCTS {
        int id PK
        string sku
        string name
        int order_id FK
        float quantity
    }
```

### 3. ProductPlan → Deliveries

```mermaid
erDiagram
    PRODUCT_PLANS ||--o{ DELIVERIES : "tracks"
    PRODUCT_PLANS {
        int id PK
        string code
        int status
    }
    DELIVERIES {
        int id PK
        string delivery_stage
        string receiving_stage
        int plan_id FK
        string status
    }
```

### 4. Delivery → DeliveryDetails

```mermaid
erDiagram
    DELIVERIES ||--o{ DELIVERY_DETAILS : "has"
    DELIVERIES {
        int id PK
        string part_name
        int plan_id FK
    }
    DELIVERY_DETAILS {
        int id PK
        string part_name
        int quantity
        int delivery_id FK
    }
```

### 5. Account → Role (Many-to-Many)

```mermaid
erDiagram
    ACCOUNTS ||--o{ ROLES : "has"
    ROLES ||--o{ ROLE_PERMISSION : "has"
    PERMISSIONS ||--o{ ROLE_PERMISSION : "associated with"
    ACCOUNTS {
        int id PK
        string username UK
        string full_name
    }
    ROLES {
        int id PK
        string name UK
    }
    PERMISSIONS {
        int id PK
        string name
    }
    ROLE_PERMISSION {
        int role_id FK
        int permission_id FK
    }
```

### 6. Permission → Stage (Many-to-Many)

```mermaid
erDiagram
    PERMISSIONS ||--o{ PERMISSION_STAGE : "grants access to"
    STAGES ||--o{ PERMISSION_STAGE : "granted by"
    PERMISSIONS {
        int id PK
        string name
    }
    STAGES {
        int id PK
        string code UK
        string name
    }
    PERMISSION_STAGE {
        int permission_id FK
        int stage_id FK
    }
```

### 7. Delivery → Inspection

```mermaid
erDiagram
    DELIVERIES ||--o{ INPUT_INSPECTION : "inspected by"
    DELIVERIES ||--o{ STAGE_INSPECTION : "inspected by"
    DELIVERIES ||--o{ DAILY_INSPECTION : "inspected by"
    DELIVERIES {
        int id PK
        string status
    }
    INPUT_INSPECTION {
        int id PK
        int delivery_id FK
        string result
    }
```

---

## 📊 Complete ERD

```mermaid
erDiagram
    %% Authentication
    ACCOUNTS ||--o{ ROLES : "has"
    ROLES ||--o{ ROLE_PERMISSION : "has"
    PERMISSIONS ||--o{ ROLE_PERMISSION : "associated with"
    PERMISSIONS ||--o{ PERMISSION_STAGE : "controls"
    STAGES ||--o{ PERMISSION_STAGE : "associated with"
    DEPARTMENTS ||--o{ ACCOUNTS : "contains"
    
    %% Production
    PRODUCT_PLANS ||--o{ ORDERS : "includes"
    ORDERS ||--o{ ORDER_ITEMS : "contains"
    ORDERS ||--o{ PRODUCTS : "produces"
    PRODUCTS ||--o{ BOM_DETAILS : "has"
    CATEGORIES ||--o{ PRODUCTS : "categorizes"
    
    %% Delivery
    PRODUCT_PLANS ||--o{ DELIVERIES : "tracks"
    DELIVERIES ||--o{ DELIVERY_DETAILS : "has"
    DELIVERIES ||--o{ DELIVERY_IMAGES : "proves"
    DELIVERIES ||--o{ DELIVERY_QC : "inspected by"
    DELIVERIES ||--o{ DELIVERY_RETURNS : "returned from"
    ORDERS ||--o{ DELIVERY_DETAILS : "linked to"
    PALLET_CARDS ||--o{ DELIVERIES : "assigned to"
    
    %% QC
    DELIVERIES ||--o{ INPUT_INSPECTION : "inspected"
    DELIVERIES ||--o{ STAGE_INSPECTION : "inspected"
    DELIVERIES ||--o{ DAILY_INSPECTION : "inspected"
    CHECKLISTS ||--o{ INPUT_INSPECTION : "used in"
    CHECKLISTS ||--o{ STAGE_INSPECTION : "used in"
    DEFECT_TYPES ||--o{ INPUT_INSPECTION : "categorized"
    DEFECT_TYPES ||--o{ STAGE_INSPECTION : "categorized"
    
    %% Equipment
    EQUIPMENT ||--o{ EQUIPMENT_MAINTENANCE : "maintained"
    
    %% KPI
    ACCOUNTS ||--o{ STAFF_EVALUATION : "evaluated"
    ACCOUNTS ||--o{ AWARD_DISCIPLINE : "awarded/disciplined"
    ACCOUNTS ||--o{ KPI : "tracked"
    
    %% CAPA
    ACCOUNTS ||--o{ CAPA_OCCURRENCES : "reported"
    CAPA_OCCURRENCES ||--o{ CAPA : "resolved"
    CAPA ||--o{ CAPA_EVALUATION : "evaluated"
    
    %% System
    SYSTEM_SCREENS ||--o{ SYSTEM_COMPONENTS : "contains"
    BACKUP_QR ||--o{ DELIVERIES : "backup for"
```

---

## 📝 Relationship Descriptions

### Primary Relationships

| Table A | Table B | Relationship | Description |
|---------|---------|-------------|-------------|
| `product_plans` | `orders` | One-to-Many | Một kế hoạch có nhiều đơn hàng |
| `orders` | `products` | One-to-Many | Một đơn hàng có nhiều sản phẩm |
| `deliveries` | `delivery_details` | One-to-Many | Một phiếu giao có nhiều chi tiết |
| `accounts` | `roles` | Many-to-Many | Một tài khoản có nhiều vai trò |
| `permissions` | `stages` | Many-to-Many | Một quyền áp dụng cho nhiều công đoạn |

### Foreign Keys

| Table | Column | References |
|-------|--------|------------|
| `orders` | `plan_id` | `product_plans.id` |
| `products` | `order_id` | `orders.id` |
| `deliveries` | `plan_id` | `product_plans.id` |
| `deliveries` | `order_id` | `orders.id` |
| `delivery_details` | `delivery_id` | `deliveries.id` |
| `delivery_details` | `order_id` | `orders.id` |

---

**Last Updated:** 2026-06-03
