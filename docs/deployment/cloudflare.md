# Cloudflare Tunnel Setup

Tài liệu này hướng dẫn cấu hình Cloudflare Tunnel cho SmartFlow v2.

---

## 📋 Mục lục (Table of Contents)

1. [Tổng quan](#-tổng-quánverview)
2. [Cài đặt Cloudflare CLI](#-cài-ặt-cloudflare-cli)
3. [Tạo Tunnel](#-tạo-tunnel)
4. [Cấu hình Tunnel](#-cấu-hình-tunnel)
5. [Chạy Tunnel](#-chạy-tunnel)

---

## 🎯 Tổng quan (Overview)

Cloudflare Tunnel cung cấp:
- HTTPS encryption
- DDoS protection
- No public IP required
- Automatic SSL certificates

---

## 📥 Cài đặt Cloudflare CLI

### Download và Install

```bash
# Download cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# Install
sudo dpkg -i cloudflared-linux-amd64.deb
```

### Authenticate

```bash
cloudflared tunnel login
```

---

## 🚇 Tạo Tunnel

```bash
cloudflared tunnel create smartflow-tunnel
```

Lưu tunnel ID được trả về.

---

## ⚙️ Cấu hình Tunnel

**Location:** `cloudflared-config.yml`

```yaml
tunnel: <tunnel-id>
credentials-file: /home/user/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: smartflowg7.cloud
    service: http://localhost:80
  - hostname: api.smartflowg7.cloud
    service: http://localhost:8000
  - service: http_status:404
```

---

## ▶️ Chạy Tunnel

### Manual Run

```bash
cloudflared tunnel --config cloudflared-config.yml run smartflow-tunnel
```

### Run as Service

```bash
# Install service
sudo cloudflared service install

# Start service
sudo systemctl start cloudflared

# Enable on boot
sudo systemctl enable cloudflared
```

---

**Last Updated:** 2026-06-03
