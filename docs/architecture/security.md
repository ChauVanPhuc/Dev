# Security Architecture

Tài liệu này mô tả kiến trúc bảo mật của hệ thống SmartFlow v2.

---

## 📋 Mục lục (Table of Contents)

1. [Authentication](#-authentication)
2. [Authorization](#-authorization)
3. [Data Protection](#-data-protection)
4. [API Security](#-api-security)
5. [Network Security](#-network-security)

---

## 🔐 Authentication

### JWT Token Strategy

SmartFlow v2 sử dụng JWT (JSON Web Token) cho authentication:

**Token Structure:**
```json
{
  "sub": "username",
  "user_id": 1,
  "role": "admin",
  "exp": 1713512345,
  "iat": 1713508745
}
```

**Security Features:**
- **Algorithm**: HS256 (HMAC SHA-256)
- **Secret Key**: Minimum 32 characters
- **Expiration**: 8 hours (480 minutes)
- **Refresh Token**: 7 days

### Password Security

**Hashing Algorithm:**
- **Bcrypt** with cost factor 12
- **Salt**: Auto-generated per password
- **Verification**: Compare hash on login

**Example:**
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Hash password
hashed = pwd_context.hash("password123")

# Verify password
is_valid = pwd_context.verify("password123", hashed)
```

### Failed Login Tracking

- Track failed login attempts per user
- Lock account after 5 failed attempts
- Lockout duration: 30 minutes
- Notify admin on lockout

---

## 👥 Authorization

### RBAC (Role-Based Access Control)

**Roles:**
- `admin` - Full access
- `manager` - Management access
- `qc` - QC access
- `worker` - Worker access

**Permissions:**
- `view_dashboard` - Xem dashboard
- `manage_users` - Quản lý người dùng
- `manage_orders` - Quản lý đơn hàng
- `create_delivery` - Tạo phiếu giao
- `perform_qc` - Thực hiện QC

### Stage-Based Permissions

User chỉ có thể truy cập dữ liệu của công đoạn họ được phân công:

```python
# Filter by user's stage
user_stages = get_user_stages(user)
query = query.filter(stage.in_(user_stages))
```

---

## 🔒 Data Protection

### Encryption

**In Transit:**
- HTTPS/TLS 1.2+
- SSL/TLS termination at Nginx

**At Rest:**
- Database encryption (SQL Server TDE)
- Password hashing (Bcrypt)
- Sensitive data encryption (optional)

### Input Validation

**Backend:**
- Pydantic schemas for validation
- SQL injection prevention (SQLAlchemy ORM)
- XSS prevention (input sanitization)

**Frontend:**
- Client-side validation
- XSS protection (React built-in)
- CSRF protection (if needed)

---

## 🛡️ API Security

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /accounts/login | 5 requests | 1 minute |
| POST /deliveries/ | 10 requests | 1 minute |
| Other endpoints | 100 requests | 1 minute |

### CORS Configuration

```python
CORS_ORIGINS = [
    "https://smartflowg7.cloud",
    "https://www.smartflowg7.cloud"
]
```

### Security Headers

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000" always;
```

---

## 🌐 Network Security

### Cloudflare Tunnel

- HTTPS encryption
- DDoS protection
- WAF (Web Application Firewall)
- Bot protection

### Firewall Rules

- Only allow necessary ports (80, 443, 8000)
- Block suspicious IPs
- Rate limiting at network level

---

## 🔍 Security Best Practices

### 1. Never Store Secrets in Code

**Bad:**
```python
SECRET_KEY = "my-secret-key"
DB_PASSWORD = "password123"
```

**Good:**
```python
SECRET_KEY = os.getenv("SECRET_KEY")
DB_PASSWORD = os.getenv("DB_PASSWORD")
```

### 2. Use Environment Variables

```env
# .env.production
SECRET_KEY=your-secret-key
DB_PASSWORD=your-db-password
```

### 3. Regular Security Audits

- Update dependencies regularly
- Scan for vulnerabilities
- Review access logs
- Monitor failed login attempts

### 4. Backup Security

- Encrypt backups
- Store backups securely
- Test restore process
- Keep multiple backup versions

---

## 📞 Incident Response

### Security Incident Procedure

1. **Identify** - Detect security breach
2. **Contain** - Isolate affected systems
3. **Eradicate** - Remove threat
4. **Recover** - Restore from backup
5. **Learn** - Document and improve

---

**Last Updated:** 2026-06-03
