# Technology Stack

Tài liệu này mô tả chi tiết technology stack của SmartFlow v2.

---

## Backend Stack

### Core Technologies

| Technology | Version | Description |
|------------|---------|-------------|
| **Python** | 3.13+ | Runtime language |
| **FastAPI** | 0.104+ | Modern web framework for building APIs |
| **SQLAlchemy** | 2.0+ | SQL toolkit and ORM |
| **Pydantic** | 2.0+ | Data validation using Python type annotations |
| **Uvicorn** | 0.24+ | ASGI server |
| **Bcrypt** | 4.0+ | Password hashing |
| **PyJWT** | 2.8+ | JWT token handling |
| **PyODBC** | 5.0+ | ODBC driver for SQL Server |

### Why FastAPI?

- **Performance**: High performance, on par with NodeJS and Go
- **Async Support**: Native async/await support
- **Type Safety**: Built-in data validation with Pydantic
- **Automatic Docs**: Auto-generated OpenAPI/Swagger docs
- **Modern**: Uses modern Python features (type hints, async)

---

## Frontend Web Stack

### Core Technologies

| Technology | Version | Description |
|------------|---------|-------------|
| **React** | 18+ | UI library |
| **Vite** | 5+ | Build tool and dev server |
| **React Router** | 6+ | Client-side routing |
| **Zustand** | 4+ | State management |
| **Axios** | 1.6+ | HTTP client |
| **TailwindCSS** | 3+ | Utility-first CSS framework |
| **Headless UI** | 1.7+ | Unstyled UI components |
| **Heroicons** | 2.0+ | Icon library |

### Why Vite?

- **Fast**: Lightning fast HMR (Hot Module Replacement)
- **Modern**: ES modules native support
- **Optimized**: Optimized build with Rollup
- **Configurable**: Easy configuration with plugins

---

## Frontend Mobile Stack

### Core Technologies

| Technology | Version | Description |
|------------|---------|-------------|
| **React** | 18+ | UI library |
| **Capacitor** | 6+ | Native runtime for web apps |
| **React Router** | 6+ | Client-side routing |
| **Zustand** | 4+ | State management |
| **Axios** | 1.6+ | HTTP client |

### Capacitor Plugins

| Plugin | Purpose |
|--------|---------|
| @capacitor/camera | Camera access |
| @capacitor/qr-scanner | QR code scanning |
| @capacitor/local-notifications | Local notifications |
| @capacitor/network | Network status |
| @capacitor/app | App lifecycle |
| @capacitor/clipboard | Clipboard access |

### Why Capacitor?

- **Cross-platform**: Build for iOS, Android, and Web from one codebase
- **Native Access**: Access native device features
- **Modern**: Built on modern web standards
- **Performance**: Near-native performance

---

## Database Stack

### Core Technologies

| Technology | Version | Description |
|------------|---------|-------------|
| **SQL Server** | 2019+ | Relational database |
| **ODBC Driver** | 17+ | ODBC driver for SQL Server |

### Why SQL Server?

- **Enterprise-grade**: Robust and reliable
- **ACID Compliance**: Strong data integrity
- **Performance**: Excellent query performance
- **Integration**: Good integration with Python ecosystem

---

## DevOps Stack

### Core Technologies

| Technology | Version | Description |
|------------|---------|-------------|
| **Docker** | 24.0+ | Containerization |
| **Docker Compose** | 2.20+ | Multi-container orchestration |
| **Nginx** | 1.24+ | Reverse proxy and web server |
| **Cloudflare** | - | CDN and tunneling |
| **GitHub Actions** | - | CI/CD pipeline |

---

## Development Tools

### Backend

| Tool | Purpose |
|------|---------|
| pytest | Testing framework |
| black | Code formatter |
| flake8 | Linter |
| mypy | Type checker |

### Frontend

| Tool | Purpose |
|------|---------|
| ESLint | Linter |
| Prettier | Code formatter |
| Jest | Testing framework |
| React Testing Library | Component testing |

---

## Security Stack

| Technology | Purpose |
|------------|---------|
| JWT | Authentication tokens |
| Bcrypt | Password hashing |
| HTTPS | Encrypted communication |
| CORS | Cross-origin resource sharing |
| Rate Limiting | API rate limiting |

---

**Last Updated:** 2026-06-03
