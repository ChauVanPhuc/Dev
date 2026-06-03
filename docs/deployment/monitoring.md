# Monitoring and Logging

Tài liệu này hướng dẫn cách monitoring và logging cho SmartFlow v2.

---

## 📋 Mục lục (Table of Contents)

1. [Application Logging](#-application-logging)
2. [Log Rotation](#-log-rotation)
3. [Monitoring](#-monitoring)
4. [Alerts](#-alerts)
5. [Performance Metrics](#-performance-metrics)

---

## 📝 Application Logging

### Backend Logging (Python)

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

logger = logging.getLogger(__name__)

logger.info("Application started")
logger.error("Database connection failed")
```

### Frontend Logging

```javascript
// Configure logging in production
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
}
```

---

## 🔄 Log Rotation

### Logrotate Config

**Location:** `/etc/logrotate.d/smartflow`

```
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

### Test Logrotate

```bash
sudo logrotate -d /etc/logrotate.d/smartflow
```

---

## 📊 Monitoring

### Docker Container Monitoring

```bash
# View container stats
docker stats

# View container logs
docker logs smartflow-backend
docker logs smartflow-frontend
```

### Nginx Monitoring

```bash
# View access logs
sudo tail -f /var/log/nginx/access.log

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### Database Monitoring

```sql
-- Check active connections
SELECT 
    DB_NAME(dbid) as DatabaseName,
    COUNT(dbid) as NumberOfConnections
FROM sys.sysprocesses
WHERE dbid > 0
GROUP BY dbid;

-- Check database size
EXEC sp_spaceused;
```

---

## 🚨 Alerts

### Health Check Endpoint

```python
@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now()}
```

### Monitor Health Check

```bash
# Check health endpoint
curl http://localhost:8000/health
```

### Setup Uptime Monitoring

Dùng services như:
- UptimeRobot
- Pingdom
- Better Uptime

---

## 📈 Performance Metrics

### Key Metrics to Monitor

| Metric | Tool | Threshold |
|--------|------|-----------|
| CPU Usage | Docker stats | > 80% |
| Memory Usage | Docker stats | > 85% |
| Disk Usage | df command | > 90% |
| Response Time | APM tools | > 2s |
| Error Rate | Logs | > 5% |

### Prometheus (Optional)

**Prometheus Config:**
```yaml
scrape_configs:
  - job_name: 'smartflow-backend'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
```

---

**Last Updated:** 2026-06-03
