# -*- coding: utf-8 -*-
"""
Webhook Receiver for AppSheet
Chế độ Tạm Thời: Lưu toàn bộ payload JSON gửi tới vào thư mục file JSON để kiểm tra cấu trúc,
chưa ghi trực tiếp vào Database cho đến khi được kích hoạt.
"""

import os
import re
import json
import glob
import time
import hashlib
import hmac
import threading
import requests
from datetime import datetime, date
from typing import Dict, Any, List, Optional, Tuple

from fastapi import APIRouter, Request, Header, Query, HTTPException, Depends, BackgroundTasks
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.core.database import get_db
from lpn_crawler.backend.config.settings import settings
from lpn_crawler.backend.models.models import LpnContainer, LpnItem, LpnImage, LpnAiOcrResult
from lpn_crawler.backend.services.storage import optimize_and_convert_to_webp, sanitize_folder_name

router = APIRouter()

# Kích hoạt lưu Database trực tiếp từ Webhook
SAVE_TO_DATABASE = True

# Đảm bảo thư mục lưu trữ file webhook tồn tại
WEBHOOKS_DIR = getattr(settings, "STORAGE_WEBHOOKS_DIR", os.path.join(settings.MODULE_ROOT, "storage", "webhooks"))
os.makedirs(WEBHOOKS_DIR, exist_ok=True)


def verify_webhook_token(
    x_webhook_token: Optional[str] = Header(None, alias="X-Webhook-Token"),
    token: Optional[str] = Query(None)
):
    """Xác thực an toàn Webhook chống Timing Attack qua Header hoặc Query param"""
    expected_token = getattr(settings, "APPSHEET_WEBHOOK_SECRET", "SmartFlow_2026")
    provided = (x_webhook_token or token or "").strip()
    if not provided or not hmac.compare_digest(provided, expected_token.strip()):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Token Webhook không hợp lệ hoặc bị thiếu."
        )
    return True


_LOGO_CACHE: Optional[str] = None


def _get_project_logo_base64() -> str:
    """Tự động tải và cache Base64 của Logo chính thức dự án SmartFlow"""
    global _LOGO_CACHE
    if _LOGO_CACHE:
        return _LOGO_CACHE
    
    candidates = [
        os.path.join(settings.MODULE_ROOT, "..", "FrontEnd", "Mobile", "assets", "logo-no-bg.png"),
        os.path.join(settings.MODULE_ROOT, "..", "FrontEnd", "Web", "Shared", "assets", "Logo remove bg.png"),
        os.path.join(settings.MODULE_ROOT, "..", "FrontEnd", "Mobile", "assets", "Logo.png"),
    ]
    for p in candidates:
        abs_p = os.path.abspath(p)
        if os.path.exists(abs_p):
            try:
                import base64
                with open(abs_p, "rb") as f:
                    _LOGO_CACHE = f"data:image/png;base64,{base64.b64encode(f.read()).decode('utf-8')}"
                    return _LOGO_CACHE
            except Exception:
                pass
    return ""


def _format_picture_url(c_pic: Optional[str]) -> str:
    """Chuẩn hóa URL ảnh xem trực tiếp: AppSheet URL trực tuyến hoặc local storage route"""
    if not c_pic:
        return ""
    p = str(c_pic).strip()
    if p.startswith("http"):
        return p
    clean_p = p.replace("\\", "/").strip().lstrip("/")
    return f"/api/v1/lpn-crawler/images/view?path={clean_p}"


def _find_user_uploaded_cont_pic_today(c_clean: str) -> Optional[str]:
    """Tìm ảnh container do người dùng upload lên trong các file webhook hôm nay (KHÔNG lấy từ CSDL)"""
    today_prefix = "webhook_" + datetime.now().strftime("%Y%m%d")
    pattern = os.path.join(WEBHOOKS_DIR, f"{today_prefix}_*_{c_clean}.json")
    matching_files = glob.glob(pattern)
    matching_files.sort(key=os.path.getmtime, reverse=True)
    for fp in matching_files:
        try:
            with open(fp, "r", encoding="utf-8") as f:
                d = json.load(f)
            p = d.get("payload") or {}
            row = p.get("Data") or p.get("Values") or p.get("values") or p
            pic = (
                row.get("Container picture")
                or row.get("Container_picture")
                or row.get("Ảnh cont")
                or row.get("Anh_cont")
                or row.get("Picture")
            )
            if not pic and isinstance(p, dict):
                pic = p.get("Container picture") or p.get("Picture")
            if pic and str(pic).strip().lower() not in ["none", "null", ""]:
                return str(pic).strip()
        except Exception:
            pass
    return None


def _get_deduplicated_webhook_items(limit: int = 200, only_today: bool = True):
    """Lấy danh sách toàn bộ container trong ngày - Ảnh Cont CHỈ lấy từ người dùng upload lên (KHÔNG lấy từ CSDL)"""
    files = glob.glob(os.path.join(WEBHOOKS_DIR, "webhook_*.json"))
    files.sort(key=os.path.getmtime, reverse=True)
    today = datetime.now().date()
    today_iso = today.strftime("%Y-%m-%d")
    today_vn = today.strftime("%d/%m/%Y")
    today_prefix = "webhook_" + today.strftime("%Y%m%d")

    container_map = {}
    today_files_count = 0
    for fp in files:
        fname = os.path.basename(fp)
        try:
            with open(fp, "r", encoding="utf-8") as f:
                d = json.load(f)
            p = d.get("payload") or {}
            row = p.get("Data") or p.get("Values") or p.get("values") or p
            r_time = d.get("received_at", "")
            
            # Lọc chỉ lấy các gói tin trong ngày hôm nay nếu only_today=True
            if only_today:
                is_today = False
                if r_time and r_time.startswith(today_iso):
                    is_today = True
                elif fname.startswith(today_prefix):
                    is_today = True
                else:
                    d_load = str(row.get("Date loading") or row.get("Date") or "").strip()
                    if d_load == today_vn or d_load.startswith(today_iso):
                        is_today = True
                    else:
                        file_date = datetime.fromtimestamp(os.path.getmtime(fp)).date()
                        if file_date == today:
                            is_today = True
                if not is_today:
                    continue

            today_files_count += 1
            c_num = row.get("Container number") or d.get("extracted_container") or "Chưa rõ"
            c_key = str(c_num).strip().upper()
            c_pic = (
                row.get("Container picture") 
                or row.get("Container_picture")
                or row.get("Ảnh cont") 
                or row.get("Anh_cont") 
                or row.get("Picture") 
                or ""
            )
            f_name = row.get("Factory", "")
            update_mode = p.get("UpdateMode") or "Add"
            table_name = p.get("TableName", "CONTAINER")

            # Đếm số Pallet có dữ liệu trong gói tin này
            p_count = 0
            if isinstance(row, dict):
                for i in range(1, 50):
                    if row.get(f"Batch Pallet {i}") or row.get(f"LPN  Pallet {i}") or row.get(f"LPN Pallet {i}") or row.get(f"Picture Pallet {i}"):
                        p_count += 1

            if c_key not in container_map:
                container_map[c_key] = {
                    "filename": fname,
                    "received_at": r_time,
                    "container": c_num,
                    "picture": c_pic,
                    "factory": f_name,
                    "table_name": table_name,
                    "update_mode": update_mode,
                    "history_count": 1,
                    "pallet_count": p_count,
                    "file_size": os.path.getsize(fp)
                }
            else:
                container_map[c_key]["history_count"] += 1
                if p_count > container_map[c_key].get("pallet_count", 0):
                    container_map[c_key]["pallet_count"] = p_count
                    container_map[c_key]["filename"] = fname
                # Nếu lần gửi mới nhất chưa kịp có ảnh nhưng lần trước do người dùng upload đã có thì giữ ảnh
                if not container_map[c_key]["picture"] and c_pic:
                    container_map[c_key]["picture"] = c_pic
                if update_mode.lower() == "update":
                    container_map[c_key]["update_mode"] = "Update"
        except Exception:
            pass
        if len(container_map) >= limit * 2:
            break

    # HIỂN THỊ TOÀN BỘ CÁC CONTAINER TRONG NGÀY ("Lấy tất cả")
    # Ảnh Cont CHỈ lấy từ người dùng upload lên trong file webhook, KHÔNG lấy từ CSDL.
    # Container nào người dùng chưa upload ảnh Cont thì để trống ảnh (hiển thị icon xe tải 🚚).
    all_items = list(container_map.values())
    return all_items[:limit], len(all_items), today_vn


@router.get("/webhook/appsheet")
def webhook_health_check(request: Request):
    """Kiểm tra trạng thái sẵn sàng của Webhook listener với giao diện chuyên nghiệp và logo dự án"""
    accept_header = request.headers.get("accept", "")
    
    # Nếu client chủ động yêu cầu thuần JSON (như script kiểm tra tự động)
    if "application/json" in accept_header and "text/html" not in accept_header:
        return {
            "status": "online",
            "service": "SmartFlow Webhook Gateway",
            "method": "POST",
            "auth_header": "X-Webhook-Token",
            "state": "ready"
        }
    
    logo_src = _get_project_logo_base64()
    logo_html = f'<img src="{logo_src}" alt="SmartFlow Logo" class="brand-logo-img" />' if logo_src else '<div class="logo-fallback">SF</div>'

    # Lấy danh sách toàn bộ container trong ngày có ảnh Cont (đã tự động gộp các lần Edit vào 1 dòng)
    deduped_items, total_files, today_date_str = _get_deduplicated_webhook_items(limit=200, only_today=True)
    latest_time_str = "--:--"
    if deduped_items and deduped_items[0].get("received_at"):
        raw_t = deduped_items[0]["received_at"]
        if len(raw_t) >= 16:
            latest_time_str = raw_t[11:16]

    recent_html_items = ""
    for item in deduped_items:
        fname = item["filename"]
        c_num = item["container"]
        c_pic = item["picture"]
        r_time_short = item["received_at"][11:19] if len(item["received_at"]) >= 19 else item["received_at"]
        f_name = item["factory"] or "N/A"
        tbl_name = item.get("table_name", "CONTAINER")
        pic_url = _format_picture_url(c_pic)
        pic_thumb = f'<a href="{pic_url}" target="_blank" title="Xem ảnh gốc AppSheet" class="thumb-link"><img src="{pic_url}" class="thumb-img" alt="Cont" /></a>' if pic_url else '<div class="thumb-empty">🚚</div>'
        json_url = f"/api/v1/lpn-crawler/webhook/appsheet/recent/{fname}?token=SmartFlow_2026"
        
        mode_badge = ""
        if item.get("update_mode", "").lower() == "update" or item.get("history_count", 1) > 1:
            cnt = item.get("history_count", 1)
            cnt_str = f" x{cnt}" if cnt > 1 else ""
            mode_badge = f'<span class="chip chip-blue">⚡ Cập nhật{cnt_str}</span>'

        pallet_badge = ""
        p_cnt = item.get("pallet_count", 0)
        if p_cnt > 0:
            pallet_badge = f'<span class="chip chip-purple">📦 {p_cnt} Pallet</span>'

        recent_html_items += f'''
        <div class="cont-card">
            <div class="card-left-group">
                {pic_thumb}
                <div class="card-details">
                    <div class="cont-title-line">
                        <span class="cont-code">{c_num}</span>
                        {mode_badge}
                        {pallet_badge}
                    </div>
                    <div class="cont-sub-line">
                        <span>🕒 {r_time_short}</span>
                        <span class="dot-sep">&bull;</span>
                        <span>🏭 {f_name}</span>
                        <span class="dot-sep">&bull;</span>
                        <span class="tbl-name">{tbl_name}</span>
                    </div>
                </div>
            </div>
            <a href="{json_url}" target="_blank" class="btn-action">JSON ↗</a>
        </div>'''

    recent_section = ""
    if deduped_items:
        recent_section = f'''
        <div class="feed-section">
            <div class="feed-header-row">
                <div class="feed-title-box">
                    <span class="section-title">Hoạt động trong ngày</span>
                    <span class="live-dot-wrap"><span class="live-dot"></span> LIVE</span>
                </div>
            </div>
            <div class="feed-cards-wrap">
                {recent_html_items}
            </div>
        </div>'''
    else:
        recent_section = f'''
        <div class="feed-empty-state">
            <div class="empty-emoji">⏳</div>
            <div class="empty-title">Chưa có Container nào trong ngày ({today_date_str})</div>
            <div class="empty-sub">Hệ thống đang sẵn sàng lắng nghe dữ liệu từ AppSheet Bot...</div>
        </div>'''

    html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>SmartFlow Gateway - Webhook Monitor</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -webkit-tap-highlight-color: transparent;
        }}
        html, body {{
            width: 100%;
            min-height: 100vh;
            background-color: #070b14;
            color: #f1f5f9;
            overflow-x: hidden;
        }}
        body {{
            background-image: 
                radial-gradient(circle at 10% 10%, rgba(37, 99, 235, 0.15) 0%, transparent 40%),
                radial-gradient(circle at 90% 90%, rgba(16, 185, 129, 0.12) 0%, transparent 45%),
                radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.08) 0%, transparent 50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: 24px 14px;
        }}
        .layout-container {{
            width: 100%;
            max-width: 640px;
            margin: 0 auto;
            position: relative;
            z-index: 1;
        }}
        .main-panel {{
            background: rgba(15, 23, 42, 0.78);
            backdrop-filter: blur(28px);
            -webkit-backdrop-filter: blur(28px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 22px;
            box-shadow: 
                0 20px 50px -10px rgba(0, 0, 0, 0.7),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
            padding: 24px 22px;
            width: 100%;
        }}

        /* Header */
        .top-navbar {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 18px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }}
        .brand-cluster {{
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
        }}
        .brand-logo-frame {{
            width: 46px;
            height: 46px;
            background: #ffffff;
            border-radius: 12px;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.3);
            flex-shrink: 0;
            overflow: hidden;
        }}
        .brand-logo-img {{
            width: 100%;
            height: 100%;
            object-fit: contain;
        }}
        .logo-fallback {{
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #7B5233, #10b981);
            color: #fff;
            font-weight: 800;
            font-size: 16px;
            border-radius: 8px;
        }}
        .brand-info {{
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
        }}
        .brand-name-row {{
            display: flex;
            align-items: center;
            gap: 7px;
        }}
        .brand-title {{
            font-size: 19px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.02em;
        }}
        .version-badge {{
            font-size: 10px;
            font-weight: 700;
            color: #38bdf8;
            background: rgba(56, 189, 248, 0.14);
            padding: 2px 7px;
            border-radius: 9999px;
            border: 1px solid rgba(56, 189, 248, 0.28);
            white-space: nowrap;
        }}
        .brand-tagline {{
            font-size: 11.5px;
            color: #94a3b8;
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }}
        .status-pill {{
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 11px;
            border-radius: 9999px;
            font-size: 10.5px;
            font-weight: 700;
            background: rgba(16, 185, 129, 0.12);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
            box-shadow: 0 0 12px rgba(16, 185, 129, 0.15);
            flex-shrink: 0;
            white-space: nowrap;
        }}
        .status-dot {{
            width: 6px;
            height: 6px;
            background-color: #10b981;
            border-radius: 50%;
            position: relative;
        }}
        .status-dot::after {{
            content: '';
            position: absolute;
            top: -3px; left: -3px; right: -3px; bottom: -3px;
            border-radius: 50%;
            border: 1px solid #10b981;
            animation: pulse-ring 2s infinite ease-out;
        }}
        @keyframes pulse-ring {{
            0% {{ transform: scale(1); opacity: 0.9; }}
            100% {{ transform: scale(2.4); opacity: 0; }}
        }}

        /* Metrics Bar (Tổng quan nhanh) */
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 16px;
        }}
        .metric-card {{
            background: rgba(255, 255, 255, 0.025);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            padding: 12px 14px;
            display: flex;
            flex-direction: column;
            gap: 2px;
            text-align: left;
            transition: all 0.2s ease;
        }}
        .metric-card:hover {{
            background: rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 255, 255, 0.1);
        }}
        .metric-label {{
            font-size: 10.5px;
            color: #94a3b8;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }}
        .metric-value-row {{
            display: flex;
            align-items: baseline;
            gap: 4px;
        }}
        .metric-num {{
            font-size: 22px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.02em;
        }}
        .metric-num.highlight-cyan {{ color: #38bdf8; }}
        .metric-num.highlight-green {{ color: #34d399; }}
        .metric-num.highlight-purple {{ color: #c084fc; }}
        .metric-unit {{
            font-size: 11px;
            color: #64748b;
            font-weight: 500;
        }}

        /* Tech specs strip */
        .specs-strip {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(6, 10, 18, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            padding: 7px 12px;
            margin-bottom: 20px;
            font-size: 11px;
            color: #94a3b8;
            gap: 8px;
            flex-wrap: wrap;
        }}
        .spec-item-box {{
            display: flex;
            align-items: center;
            gap: 5px;
        }}
        .spec-badge {{
            font-size: 9.5px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 4px;
            font-family: monospace;
        }}
        .spec-badge.badge-blue {{
            background: rgba(37, 99, 235, 0.22);
            color: #60a5fa;
            border: 1px solid rgba(37, 99, 235, 0.4);
        }}
        .spec-badge.badge-emerald {{
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.35);
        }}

        /* Feed Section */
        .feed-section {{
            margin-bottom: 20px;
            width: 100%;
        }}
        .feed-header-row {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            gap: 10px;
        }}
        .feed-title-box {{
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .section-title {{
            font-size: 13.5px;
            font-weight: 700;
            color: #f1f5f9;
            letter-spacing: -0.01em;
        }}
        .live-dot-wrap {{
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 9px;
            font-weight: 700;
            color: #10b981;
            background: rgba(16, 185, 129, 0.12);
            border: 1px solid rgba(16, 185, 129, 0.28);
            padding: 1px 6px;
            border-radius: 9999px;
        }}
        .live-dot {{
            width: 5px;
            height: 5px;
            background: #10b981;
            border-radius: 50%;
            box-shadow: 0 0 6px #10b981;
        }}
        .feed-cards-wrap {{
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
            max-height: 500px;
            overflow-y: auto;
            padding-right: 4px;
            scrollbar-width: thin;
            scrollbar-color: rgba(56, 189, 248, 0.35) rgba(255, 255, 255, 0.03);
        }}
        .feed-cards-wrap::-webkit-scrollbar {{
            width: 6px;
        }}
        .feed-cards-wrap::-webkit-scrollbar-track {{
            background: rgba(255, 255, 255, 0.03);
            border-radius: 8px;
        }}
        .feed-cards-wrap::-webkit-scrollbar-thumb {{
            background: rgba(56, 189, 248, 0.35);
            border-radius: 8px;
        }}
        .feed-cards-wrap::-webkit-scrollbar-thumb:hover {{
            background: rgba(56, 189, 248, 0.6);
        }}

        /* Container Card */
        .cont-card {{
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.07);
            border-radius: 12px;
            padding: 10px 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            transition: all 0.2s ease;
        }}
        .cont-card:hover {{
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(56, 189, 248, 0.25);
        }}
        .card-left-group {{
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
            flex: 1;
        }}
        .thumb-link {{
            display: block;
            flex-shrink: 0;
        }}
        .thumb-img {{
            width: 44px;
            height: 44px;
            object-fit: cover;
            border-radius: 9px;
            border: 1px solid rgba(255, 255, 255, 0.14);
            background: #0f172a;
            display: block;
            transition: transform 0.2s;
        }}
        .thumb-img:hover {{
            transform: scale(1.06);
        }}
        .thumb-empty {{
            width: 44px;
            height: 44px;
            border-radius: 9px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px dashed rgba(255, 255, 255, 0.12);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            flex-shrink: 0;
        }}
        .card-details {{
            display: flex;
            flex-direction: column;
            gap: 3px;
            min-width: 0;
            flex: 1;
        }}
        .cont-title-line {{
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
            line-height: 1.3;
        }}
        .cont-code {{
            font-size: 14px;
            font-weight: 700;
            color: #38bdf8;
            letter-spacing: -0.01em;
            white-space: nowrap;
        }}
        .chip {{
            font-size: 9px;
            font-weight: 700;
            padding: 1.5px 6px;
            border-radius: 9999px;
            white-space: nowrap;
            display: inline-flex;
            align-items: center;
        }}
        .chip-blue {{
            background: rgba(56, 189, 248, 0.15);
            color: #38bdf8;
            border: 1px solid rgba(56, 189, 248, 0.35);
        }}
        .chip-purple {{
            background: rgba(168, 85, 247, 0.18);
            color: #c084fc;
            border: 1px solid rgba(168, 85, 247, 0.35);
        }}
        .chip-green {{
            background: #10b981;
            color: #ffffff;
            box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
        }}
        .cont-sub-line {{
            font-size: 11px;
            color: #94a3b8;
            display: flex;
            align-items: center;
            gap: 5px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }}
        .dot-sep {{
            color: #475569;
        }}
        .tbl-name {{
            color: #64748b;
            font-size: 10px;
        }}
        .btn-action {{
            padding: 6px 12px;
            background: rgba(16, 185, 129, 0.12);
            border: 1px solid rgba(16, 185, 129, 0.35);
            color: #34d399;
            font-size: 11px;
            font-weight: 600;
            text-decoration: none;
            border-radius: 7px;
            white-space: nowrap;
            flex-shrink: 0;
            transition: all 0.2s ease;
        }}
        .btn-action:hover {{
            background: rgba(16, 185, 129, 0.22);
            border-color: #34d399;
            color: #6ee7b7;
        }}

        /* Empty state */
        .feed-empty-state {{
            padding: 22px 16px;
            border: 1px dashed rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            text-align: center;
            background: rgba(255, 255, 255, 0.015);
            margin: 10px 0;
        }}
        .empty-emoji {{ font-size: 24px; margin-bottom: 4px; }}
        .empty-title {{ font-size: 13px; font-weight: 600; color: #cbd5e1; }}
        .empty-sub {{ font-size: 11px; color: #64748b; margin-top: 3px; }}

        /* Endpoint URL Box */
        .url-box {{
            background: rgba(6, 10, 18, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.07);
            border-radius: 12px;
            padding: 10px 12px;
            margin-bottom: 16px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }}
        .url-box-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }}
        .btn-copy-url {{
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #cbd5e1;
            padding: 2px 8px;
            border-radius: 5px;
            font-size: 10px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
        }}
        .btn-copy-url:hover {{
            background: rgba(56, 189, 248, 0.2);
            border-color: #38bdf8;
            color: #38bdf8;
        }}
        .url-string {{
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 11.5px;
            color: #38bdf8;
            word-break: break-all;
        }}

        /* Footer */
        .footer-note {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 11px;
            color: #64748b;
            padding-top: 12px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            gap: 8px;
        }}

        /* Responsive Mobile Tweak */
        @media (max-width: 520px) {{
            body {{
                padding: 12px 8px;
            }}
            .main-panel {{
                padding: 16px 13px;
                border-radius: 16px;
            }}
            .top-navbar {{
                gap: 8px;
                margin-bottom: 14px;
                padding-bottom: 12px;
            }}
            .brand-logo-frame {{
                width: 40px;
                height: 40px;
                border-radius: 10px;
            }}
            .brand-title {{
                font-size: 17px;
            }}
            .brand-tagline {{
                font-size: 10.5px;
            }}
            .status-pill {{
                padding: 4px 8px;
                font-size: 9.5px;
            }}
            .metrics-grid {{
                gap: 6px;
                margin-bottom: 14px;
            }}
            .metric-card {{
                padding: 8px 9px;
            }}
            .metric-label {{
                font-size: 9.5px;
            }}
            .metric-num {{
                font-size: 17px;
            }}
            .specs-strip {{
                font-size: 10px;
                padding: 6px 9px;
                margin-bottom: 16px;
            }}
            .cont-card {{
                padding: 8px 10px;
                gap: 8px;
            }}
            .thumb-img, .thumb-empty {{
                width: 40px;
                height: 40px;
            }}
            .cont-code {{
                font-size: 13px;
            }}
            .cont-sub-line {{
                font-size: 10px;
            }}
            .btn-action {{
                padding: 5px 9px;
                font-size: 10.5px;
            }}
            .footer-note {{
                flex-direction: column;
                align-items: center;
                text-align: center;
                gap: 3px;
                font-size: 10px;
            }}
        }}
    </style>
</head>
<body>
    <div class="layout-container">
        <div class="main-panel">
            <!-- Navbar -->
            <div class="top-navbar">
                <div class="brand-cluster">
                    <div class="brand-logo-frame">
                        {logo_html}
                    </div>
                    <div class="brand-info">
                        <div class="brand-name-row">
                            <span class="brand-title">SmartFlow</span>
                            <span class="version-badge">v2 Cloud</span>
                        </div>
                        <span class="brand-tagline">Hệ thống bàn giao & giám sát Webhook</span>
                    </div>
                </div>
                <div class="status-pill">
                    <span class="status-dot"></span>
                    SẴN SÀNG
                </div>
            </div>

            <!-- Metrics bar (Thống kê trong ngày) -->
            <div class="metrics-grid">
                <div class="metric-card">
                    <span class="metric-label">Container hôm nay</span>
                    <div class="metric-value-row">
                        <span class="metric-num highlight-cyan" id="metric-containers">{len(deduped_items)}</span>
                        <span class="metric-unit">cont</span>
                    </div>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Lần nhận gần nhất</span>
                    <div class="metric-value-row">
                        <span class="metric-num highlight-purple" id="metric-latest">{latest_time_str}</span>
                    </div>
                </div>
            </div>

            <!-- Tech specs strip (Gọn gàng, tinh tế) -->
            <div class="specs-strip">
                <div class="spec-item-box">
                    <span class="spec-badge badge-blue">POST</span>
                    <span>REST Webhook</span>
                </div>
                <div class="spec-item-box">
                    <span>Định dạng:</span>
                    <strong style="color: #cbd5e1;">JSON</strong>
                </div>
                <div class="spec-item-box">
                    <span class="spec-badge badge-emerald">Active</span>
                    <span>X-Webhook-Token</span>
                </div>
                <div class="spec-item-box">
                    <span>Lưu đệm an toàn</span>
                </div>
            </div>

            <!-- Recent Feed -->
            <div id="recent-container">
                {recent_section}
            </div>

            <!-- Endpoint URL box -->
            <div class="url-box">
                <div class="url-box-header">
                    <span>Webhook Ingestion URL (AppSheet Target)</span>
                    <button class="btn-copy-url" id="btn-copy" onclick="copyWebhookUrl()">Sao chép URL</button>
                </div>
                <div class="url-string">
                    https://api.smartflowg7.cloud/api/v1/lpn-crawler/webhook/appsheet
                </div>
            </div>

            <!-- Footer -->
            <div class="footer-note">
                <span>SmartFlow Automated Gateway</span>
                <span>Bảo mật cấp Gateway &bull; 2026</span>
            </div>
        </div>
    </div>

    <script>
    function copyWebhookUrl() {{
        const url = 'https://api.smartflowg7.cloud/api/v1/lpn-crawler/webhook/appsheet';
        navigator.clipboard.writeText(url).then(() => {{
            const btn = document.getElementById('btn-copy');
            if (btn) {{
                btn.textContent = '✓ Đã chép!';
                btn.style.color = '#34d399';
                btn.style.borderColor = '#10b981';
                setTimeout(() => {{
                    btn.textContent = 'Sao chép URL';
                    btn.style.color = '';
                    btn.style.borderColor = '';
                }}, 2000);
            }}
        }}).catch(() => {{
            alert('Đã sao chép: ' + url);
        }});
    }}

    let lastTopFile = "{deduped_items[0]['filename'] if deduped_items else ''}";
    async function updateFeed() {{
        if (document.hidden) return;

        try {{
            const res = await fetch('/api/v1/lpn-crawler/webhook/appsheet/feed');
            if (!res.ok) return;
            const data = await res.json();
            const items = data.items || [];
            const dateStr = data.date || "";

            // Cập nhật các thẻ số liệu
            const cElem = document.getElementById('metric-containers');
            const lElem = document.getElementById('metric-latest');
            if (cElem) cElem.textContent = items.length;
            if (lElem && items.length > 0 && items[0].received_at) {{
                const rawT = items[0].received_at;
                lElem.textContent = rawT.length >= 16 ? rawT.substring(11, 16) : rawT;
            }}

            if (items.length === 0) {{
                lastTopFile = "";
                document.getElementById('recent-container').innerHTML = `
                <div class="feed-empty-state">
                    <div class="empty-emoji">⏳</div>
                    <div class="empty-title">Chưa có Container nào trong ngày (${{dateStr}})</div>
                    <div class="empty-sub">Hệ thống đang sẵn sàng lắng nghe dữ liệu từ AppSheet Bot...</div>
                </div>`;
                return;
            }}

            const topFile = items[0].filename;
            const isNew = lastTopFile && (lastTopFile !== topFile && !lastTopFile.includes(topFile));
            lastTopFile = topFile;

            let html = `
            <div class="feed-section">
                <div class="feed-header-row">
                    <div class="feed-title-box">
                        <span class="section-title">Hoạt động trong ngày</span>
                        <span class="live-dot-wrap"><span class="live-dot"></span> LIVE</span>
                    </div>
                </div>
                <div class="feed-cards-wrap">
            `;

            items.forEach((item, idx) => {{
                const pic = item.picture;
                const picSrc = (pic && !pic.startsWith('http')) ? ('/api/v1/lpn-crawler/images/view?path=' + encodeURIComponent(pic.replace(/^[/\\]+/, ''))) : pic;
                const picHtml = picSrc 
                    ? `<a href="${{picSrc}}" target="_blank" title="Xem ảnh gốc AppSheet" class="thumb-link"><img src="${{picSrc}}" class="thumb-img" alt="Cont" /></a>`
                    : `<div class="thumb-empty">🚚</div>`;
                const rTimeShort = (item.received_at || '').length >= 19 ? item.received_at.substring(11, 19) : item.received_at;
                const fName = item.factory || 'N/A';
                const tblName = item.table_name || 'CONTAINER';
                const jsonUrl = `/api/v1/lpn-crawler/webhook/appsheet/recent/${{item.filename}}?token=SmartFlow_2026`;
                const highlightStyle = (idx === 0 && isNew) ? 'border-color: #10b981; box-shadow: 0 0 16px rgba(16,185,129,0.3);' : '';
                const newBadge = (idx === 0 && isNew) ? '<span class="chip chip-green">Mới</span>' : '';
                
                let editBadge = '';
                if ((item.update_mode && item.update_mode.toLowerCase() === 'update') || (item.history_count && item.history_count > 1)) {{
                    const cntStr = item.history_count > 1 ? ` x${{item.history_count}}` : '';
                    editBadge = `<span class="chip chip-blue">⚡ Cập nhật${{cntStr}}</span>`;
                }}

                let palletBadge = '';
                if (item.pallet_count && item.pallet_count > 0) {{
                    palletBadge = `<span class="chip chip-purple">📦 ${{item.pallet_count}} Pallet</span>`;
                }}

                html += `
                <div class="cont-card" style="${{highlightStyle}}">
                    <div class="card-left-group">
                        ${{picHtml}}
                        <div class="card-details">
                            <div class="cont-title-line">
                                <span class="cont-code">${{item.container}}</span>
                                ${{newBadge}}
                                ${{editBadge}}
                                ${{palletBadge}}
                            </div>
                            <div class="cont-sub-line">
                                <span>🕒 ${{rTimeShort}}</span>
                                <span class="dot-sep">&bull;</span>
                                <span>🏭 ${{fName}}</span>
                                <span class="dot-sep">&bull;</span>
                                <span class="tbl-name">${{tblName}}</span>
                            </div>
                        </div>
                    </div>
                    <a href="${{jsonUrl}}" target="_blank" class="btn-action">JSON ↗</a>
                </div>`;
            }});
            html += `</div></div>`;
            document.getElementById('recent-container').innerHTML = html;
        }} catch (e) {{}}
    }}
    setInterval(updateFeed, 3500);
    </script>
</body>
</html>"""
    return HTMLResponse(content=html_content, status_code=200)


@router.get("/webhook/appsheet/feed")
def get_webhook_live_feed(only_today: bool = True):
    """Endpoint trả về feed các container mới nhất trong ngày (đã tự động gộp cập nhật) cho giao diện realtime"""
    items, total, today_str = _get_deduplicated_webhook_items(limit=200, only_today=only_today)
    return {"total": total, "date": today_str, "items": items}


@router.get("/webhook/appsheet/recent")
def list_recent_webhook_dumps(
    limit: int = 20,
    auth: bool = Depends(verify_webhook_token)
):
    """Xem danh sách các gói tin JSON vừa nhận được từ AppSheet (Yêu cầu Token Webhook)"""
    files = glob.glob(os.path.join(WEBHOOKS_DIR, "webhook_*.json"))
    files.sort(key=os.path.getmtime, reverse=True)
    recent_files = files[:limit]

    results = []
    for fp in recent_files:
        fname = os.path.basename(fp)
        try:
            with open(fp, "r", encoding="utf-8") as f:
                data = json.load(f)
            results.append({
                "filename": fname,
                "received_at": data.get("received_at"),
                "container_number": data.get("extracted_container"),
                "raw_keys": list((data.get("payload") or {}).keys()) if isinstance(data.get("payload"), dict) else [],
                "file_size_bytes": os.path.getsize(fp)
            })
        except Exception:
            results.append({"filename": fname, "error": "Không đọc được file"})

    return {
        "total_files": len(files),
        "recent_count": len(results),
        "files": results
    }


@router.post("/webhook/appsheet/clear")
def clear_webhook_dumps(
    auth: bool = Depends(verify_webhook_token)
):
    """Xóa toàn bộ các gói tin Webhook test trong thư mục lưu trữ (Yêu cầu Token Webhook)"""
    files = glob.glob(os.path.join(WEBHOOKS_DIR, "webhook_*.json"))
    for f in files:
        try:
            os.remove(f)
        except Exception:
            pass
    history_file = os.path.join(WEBHOOKS_DIR, "webhooks_history.jsonl")
    if os.path.exists(history_file):
        try:
            os.remove(history_file)
        except Exception:
            pass
    return {"status": "success", "message": f"Đã xóa sạch {len(files)} file dữ liệu webhook test"}



@router.get("/webhook/appsheet/recent/{filename}")
def view_webhook_file_content(
    filename: str,
    auth: bool = Depends(verify_webhook_token)
):
    """Xem chi tiết toàn bộ nội dung của 1 file JSON nhận được (Yêu cầu Token Webhook)"""
    # Ngăn chặn path traversal
    safe_name = os.path.basename(filename)
    target_path = os.path.join(WEBHOOKS_DIR, safe_name)
    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail=f"Không tìm thấy file {safe_name}")

    try:
        with open(target_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi đọc file: {e}")


def _extract_container_number(data: Dict[str, Any]) -> str:
    """Trích xuất mã container từ payload của AppSheet"""
    keys = [
        "Container number", "Container Number", "container_number", "Containernumber",
        "Số container", "so_container", "Container", "container", "Container #"
    ]
    for k in keys:
        if k in data and data[k]:
            val = str(data[k]).strip()
            m = re.search(r'([A-Z]{4}\s*\d{7})', val.upper())
            if m:
                return re.sub(r'\s+', ' ', m.group(1))
            return val.upper()
    return ""


def _extract_phone_number(data: Dict[str, Any], payload: Any, db: Session) -> str:
    """Trích xuất số điện thoại yêu cầu từ payload AppSheet hoặc mapping qua tài khoản hệ thống"""
    p_data = data if isinstance(data, dict) else (payload if isinstance(payload, dict) else {})
    phone_keys = [
        "Phone", "Phone number", "Phone Number", "phone", "phone_number",
        "Số điện thoại", "Số ĐT", "SĐT", "sdt", "so_dien_thoai",
        "Operator phone", "Operator Phone", "operator_phone",
        "Zalo phone", "Zalo Phone", "zalo_phone",
        "Userphone", "Telephone", "Mobile", "Contact"
    ]
    for k in phone_keys:
        if k in p_data and p_data[k]:
            val = str(p_data[k]).strip()
            if val and val.lower() not in ["none", "null", ""]:
                return val

    # Thử tìm qua Useremail hoặc Operator name trong bảng accounts
    email_or_user = str(p_data.get("Useremail") or p_data.get("Email") or p_data.get("Operator name") or p_data.get("UserName") or "").strip()
    if email_or_user:
        try:
            from modules.auth.models.accounts import Account
            acc = db.query(Account).filter(
                or_(
                    Account.email == email_or_user,
                    Account.username == email_or_user,
                    Account.full_name == email_or_user
                )
            ).first()
            if acc and acc.phone:
                return acc.phone.strip()
        except Exception:
            pass
    return ""



def _parse_date(date_str: Optional[str]):
    """Chuyển đổi chuỗi ngày linh hoạt sang datetime.date (ưu tiên chuẩn AppSheet MM/DD/YYYY)"""
    if not date_str:
        return None
    s = str(date_str).strip()
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":
        try:
            return datetime.strptime(s[:10], "%Y-%m-%d").date()
        except ValueError:
            pass
    parts = s.split("/")
    if len(parts) == 3:
        try:
            p1, p2, p3 = int(parts[0].strip()), int(parts[1].strip()), int(parts[2].strip()[:4])
            if p2 > 12:
                # p1 là tháng, p2 là ngày
                return date(p3, p1, p2)
            elif p1 > 12:
                # p1 là ngày, p2 là tháng
                return date(p3, p2, p1)
            else:
                # AppSheet gửi chuẩn US MM/DD/YYYY
                return date(p3, p1, p2)
        except Exception:
            pass
    for fmt in ("%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def _parse_datetime(dt_str: Optional[str]):
    """Chuyển đổi chuỗi thời gian linh hoạt sang datetime (hỗ trợ AM/PM đầy đủ)"""
    if not dt_str:
        return None
    s = str(dt_str).strip()
    for fmt in (
        "%m/%d/%Y %I:%M:%S %p", "%d/%m/%Y %I:%M:%S %p",
        "%m/%d/%Y %I:%M %p", "%d/%m/%Y %I:%M %p",
        "%m/%d/%Y %H:%M:%S", "%d/%m/%Y %H:%M:%S",
        "%Y-%m-%d %H:%M:%S", "%m/%d/%Y %H:%M", "%d/%m/%Y %H:%M", "%Y-%m-%d %H:%M",
        "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f"
    ):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            pass
    return None


def _download_and_save_webp(
    source_url: str,
    container_number: str,
    suffix_key: str,
    sort_order: int = 1,
    max_retries: int = 2
) -> Optional[Dict[str, Any]]:
    """
    Tải ảnh trực tiếp từ URL AppSheet ở độ phân giải gốc cao nhất (loại bỏ &width=600),
    nén sang WebP Full HD, xoay chuẩn EXIF và lưu tệp.
    Có cơ chế tự động thử lại (retry) khi gặp lỗi mạng.
    """
    if not source_url or not str(source_url).startswith("http"):
        return None

    effective_url = re.sub(r'([?&])width=\d+(&?)', r'\1\2', str(source_url)).rstrip('?&').replace('?&', '?')
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://www.appsheet.com/"
    }

    resp = None
    for attempt in range(max_retries + 1):
        try:
            resp = requests.get(effective_url, timeout=25, headers=headers)
            if resp.status_code in (200, 201, 304) and len(resp.content) >= 500:
                break
            # Fallback về link gốc có thể còn chữ ký CDN
            resp = requests.get(source_url, timeout=25, headers=headers)
            if resp.status_code in (200, 201, 304) and len(resp.content) >= 100:
                break
        except Exception as e:
            if attempt == max_retries:
                print(f"[Webhook Download Error] Lan thu {attempt+1} that bai: {e} cho URL {source_url[:60]}")
            time.sleep(1.0)

    if not resp or resp.status_code not in (200, 201, 304) or len(resp.content) < 100:
        return None

    try:
        final_bytes, file_mime, file_ext, img_hash = optimize_and_convert_to_webp(resp.content)
        file_size = len(final_bytes)

        cont_clean = sanitize_folder_name(container_number or "UNKNOWN")
        suf_clean = sanitize_folder_name(suffix_key or "general")

        dir_path = os.path.join(settings.STORAGE_IMAGES_DIR, cont_clean, suf_clean)
        os.makedirs(dir_path, exist_ok=True)

        filename = f"{img_hash[:12]}_{sort_order}{file_ext}"
        abs_file_path = os.path.join(dir_path, filename)
        rel_file_path = os.path.relpath(abs_file_path, settings.PROJECT_ROOT).replace("\\", "/")

        if not os.path.exists(abs_file_path):
            with open(abs_file_path, "wb") as f:
                f.write(final_bytes)

        return {
            "abs_path": abs_file_path,
            "rel_path": rel_file_path,
            "image_hash": img_hash,
            "file_mime": file_mime,
            "file_size": file_size,
            "source_url": source_url
        }
    except Exception as e:
        print(f"[Webhook Download Error] {e} for URL {source_url[:60]}")
        return None


_CONTAINER_OCR_LOCKS: Dict[int, threading.Lock] = {}
_OCR_LOCKS_MUTEX = threading.Lock()


def _get_container_lock(container_id: int) -> threading.Lock:
    with _OCR_LOCKS_MUTEX:
        if container_id not in _CONTAINER_OCR_LOCKS:
            _CONTAINER_OCR_LOCKS[container_id] = threading.Lock()
        return _CONTAINER_OCR_LOCKS[container_id]


def _scan_zxing_multirot(cv_img, expected_lpn: Optional[str] = None) -> Tuple[List[str], Optional[str]]:
    """Quét mã vạch tăng cường qua ZXing C++ với 4 góc xoay 0°, 90°, 180°, 270°."""
    barcodes = []
    detected_lpn = None
    if cv_img is None:
        return barcodes, detected_lpn
    try:
        import cv2
        import zxingcpp
        for angle in [0, 90, 180, 270]:
            if angle == 0:
                t_img = cv_img
            elif angle == 90:
                t_img = cv2.rotate(cv_img, cv2.ROTATE_90_CLOCKWISE)
            elif angle == 180:
                t_img = cv2.rotate(cv_img, cv2.ROTATE_180)
            elif angle == 270:
                t_img = cv2.rotate(cv_img, cv2.ROTATE_90_COUNTERCLOCKWISE)

            found = zxingcpp.read_barcodes(t_img)
            for b in found:
                b_text = str(b.text).strip()
                if b_text and b_text not in barcodes:
                    barcodes.append(b_text)
                if expected_lpn and (b_text == str(expected_lpn).strip() or str(expected_lpn).strip() in b_text):
                    detected_lpn = b_text
            if detected_lpn:
                break
    except Exception:
        pass
    return barcodes, detected_lpn


def _run_background_ocr_tasks(
    ocr_tasks: List[Dict[str, Any]],
    container_id: Optional[int] = None,
    target_phone: Optional[str] = None
):
    """
    Quy trình Quét AI OCR 2 Vòng & Gửi Báo Cáo Zalo Nghiệm Thu (Two-Pass Verified Dispatch):
    - VÒNG 1: Quét toàn bộ danh sách kiện/ảnh nhận được từ Webhook.
    - RÀ SOÁT GIỮA 2 VÒNG (Audit Gate): Phát hiện các kiện thiếu ảnh, ảnh lỗi 0 byte,
      OCR bị crash/skip hoặc chưa khớp LPN.
    - VÒNG 2: Tự động tải lại ảnh nếu thiếu, quét lại tăng cường (đa hướng 90°/180°/270°,
      ZXing Barcode, cân bằng tương phản).
    - HOÀN TẤT: Chỉ gửi tin nhắn Zalo 1 lần duy nhất khi toàn bộ các kiện đã được nghiệm thu xong.
    - Khóa Mutex chống gửi trùng lặp hoặc gửi sớm khi chưa có kiện.
    """
    if not container_id:
        return

    cont_lock = _get_container_lock(container_id)
    if not cont_lock.acquire(blocking=False):
        print(f"[AI OCR Webhook] Container ID {container_id} dang co tien trinh quet hoat dong. Bo qua tien trinh trung lap.")
        return

    try:
        from app.core.database import SessionLocal
        from lpn_crawler.ai_ocr_train.core.pipeline import get_default_pipeline
        import cv2

        db = SessionLocal()
        try:
            cont = db.query(LpnContainer).filter(LpnContainer.id == container_id).first()
            if not cont:
                print(f"[AI OCR Webhook] Khong tim thay Container ID {container_id} trong CSDL.")
                return

            all_db_items = db.query(LpnItem).filter(LpnItem.container_id == container_id).order_by(LpnItem.item_index).all()
            if not all_db_items:
                print(f"[AI OCR Webhook] Container {cont.container_number} chua co kien hang nao (items=0). Bo qua quet & KHONG gui Zalo.")
                return

            print("[AI OCR Webhook] ========================================================")
            print(f"[AI OCR Webhook] Bat dau tien trinh quet AI OCR Container: {cont.container_number} (Tong: {len(all_db_items)} kien)")
            print("[AI OCR Webhook] ========================================================")

            pipeline = get_default_pipeline()

            # ---------------------------------------------------------
            # VÒNG 1: QUÉT SƠ BỘ TOÀN BỘ ẢNH (Primary Pass)
            # ---------------------------------------------------------
            if ocr_tasks:
                print(f"[AI OCR Vong 1] Dang quet {len(ocr_tasks)} anh moi...")
                for task in ocr_tasks:
                    try:
                        t0 = time.time()
                        abs_p = task.get("abs_path")

                        # Kiểm tra file trên ổ đĩa
                        if not abs_p or not os.path.isfile(abs_p) or os.path.getsize(abs_p) < 100:
                            if task.get("source_url"):
                                img_dl = _download_and_save_webp(
                                    source_url=task["source_url"],
                                    container_number=task["container_number"],
                                    suffix_key=task["suffix_key"],
                                    sort_order=1
                                )
                                if img_dl:
                                    abs_p = img_dl["abs_path"]
                                    task["abs_path"] = abs_p

                        if not abs_p or not os.path.isfile(abs_p):
                            continue

                        expected_lpn = task.get("expected_lpn")
                        expected_skus = task.get("expected_skus")

                        res = pipeline.process(
                            image_input=abs_p,
                            expected_lpn=expected_lpn,
                            expected_skus=expected_skus
                        )
                        dur_ms = round((time.time() - t0) * 1000, 2)

                        detected_lpn = res.get("lpn")
                        detected_sku = res.get("sku")
                        barcodes = res.get("barcodes") or []
                        conf = float(res.get("confidence") or 0.0)

                        # ZXing tăng cường trên ảnh gốc
                        cv_img = cv2.imread(abs_p)
                        zx_barcodes, zx_lpn = _scan_zxing_multirot(cv_img, expected_lpn)
                        for zb in zx_barcodes:
                            if zb not in barcodes:
                                barcodes.append(zb)
                        if zx_lpn:
                            detected_lpn = zx_lpn
                            conf = max(conf, 0.99)

                        # So sánh LPN
                        is_lpn_match = False
                        if expected_lpn and detected_lpn:
                            exp_clean = re.sub(r'[^A-Za-z0-9]', '', str(expected_lpn)).upper()
                            det_clean = re.sub(r'[^A-Za-z0-9]', '', str(detected_lpn)).upper()
                            if exp_clean == det_clean or exp_clean in det_clean or det_clean in exp_clean:
                                is_lpn_match = True

                        # So sánh SKU
                        is_sku_match = False
                        if expected_skus and detected_sku:
                            for exp_s in expected_skus:
                                if exp_s and exp_s.strip().upper() in str(detected_sku).strip().upper():
                                    is_sku_match = True
                                    break

                        # Upsert LpnAiOcrResult
                        ocr_row = db.query(LpnAiOcrResult).filter(
                            LpnAiOcrResult.item_id == task["item_id"],
                            LpnAiOcrResult.image_id == task["image_id"]
                        ).first()

                        if not ocr_row:
                            ocr_row = LpnAiOcrResult(
                                item_id=task["item_id"],
                                image_id=task["image_id"],
                                container_number=task["container_number"],
                                suffix_key=task["suffix_key"],
                                model_id="AiOcrPipeline",
                                detected_lpn=detected_lpn,
                                detected_sku=detected_sku,
                                detected_barcodes=json.dumps(barcodes, ensure_ascii=False) if barcodes else None,
                                confidence=conf,
                                is_lpn_match=is_lpn_match,
                                is_sku_match=is_sku_match,
                                status="success" if (is_lpn_match or res.get("success", True)) else "failed",
                                processing_time_ms=dur_ms,
                                scanned_at=datetime.utcnow()
                            )
                            db.add(ocr_row)
                        else:
                            ocr_row.detected_lpn = detected_lpn
                            ocr_row.detected_sku = detected_sku
                            ocr_row.detected_barcodes = json.dumps(barcodes, ensure_ascii=False) if barcodes else None
                            ocr_row.confidence = conf
                            ocr_row.is_lpn_match = is_lpn_match
                            ocr_row.is_sku_match = is_sku_match
                            ocr_row.status = "success" if (is_lpn_match or res.get("success", True)) else "failed"
                            ocr_row.processing_time_ms = dur_ms
                            ocr_row.scanned_at = datetime.utcnow()

                        if is_lpn_match:
                            db_item = db.query(LpnItem).filter(LpnItem.id == task["item_id"]).first()
                            if db_item:
                                db_item.resolution_status = "resolved"
                                db_item.resolution_note = f"Khớp AI OCR Vòng 1 ({detected_lpn})"
                                db_item.resolved_at = datetime.utcnow()
                                db_item.resolved_by = "AI_WEBHOOK_P1"

                        db.commit()
                        try:
                            print(f"[AI OCR Vong 1] {task['suffix_key']}: LPN={detected_lpn} | Match={is_lpn_match} ({dur_ms}ms)")
                        except Exception:
                            pass
                    except Exception as item_err:
                        db.rollback()
                        try:
                            print(f"[AI OCR Vong 1 Loi] {task.get('suffix_key')}: {item_err}")
                        except Exception:
                            pass

            # ---------------------------------------------------------
            # RÀ SOÁT SAU VÒNG 1 (Audit Gate): Tìm các kiện cần quét lại lần 2
            # ---------------------------------------------------------
            retry_candidates = []
            for item in all_db_items:
                if item.resolution_status == "resolved":
                    continue

                imgs = db.query(LpnImage).filter(LpnImage.lpn_item_id == item.id).all()
                ocrs = db.query(LpnAiOcrResult).filter(LpnAiOcrResult.item_id == item.id).all()

                needs_retry = False
                latest_ocr = ocrs[-1] if ocrs else None

                # 1. Chưa có kết quả OCR
                if not latest_ocr:
                    needs_retry = True
                # 2. OCR bị lỗi (status != success)
                elif latest_ocr.status != "success":
                    needs_retry = True
                # 3. OCR chưa đọc được hoặc chưa khớp LPN
                elif not latest_ocr.is_lpn_match:
                    needs_retry = True

                # 4. Ảnh bị thiếu hoặc 0 bytes
                has_valid_img = False
                for img in imgs:
                    if img.local_path:
                        abs_f = os.path.join(settings.PROJECT_ROOT, img.local_path)
                        if os.path.isfile(abs_f) and os.path.getsize(abs_f) >= 100:
                            has_valid_img = True
                            break
                if not has_valid_img:
                    needs_retry = True

                if needs_retry:
                    retry_candidates.append({
                        "item": item,
                        "images": imgs,
                        "latest_ocr": latest_ocr
                    })

            # ---------------------------------------------------------
            # VÒNG 2: QUÉT LẠI LẦN NỮA NẾU CÓ ẢNH LỖI HOẶC THIẾU (Secondary Pass)
            # ---------------------------------------------------------
            if retry_candidates:
                print(f"[AI OCR Vong 2] >>> Phat hien {len(retry_candidates)} kien can quet lai lan 2 cho Container {cont.container_number}...")
                for candidate in retry_candidates:
                    try:
                        item = candidate["item"]
                        imgs = candidate["images"]
                        latest_ocr = candidate["latest_ocr"]
                        t0 = time.time()

                        # 1. Đảm bảo có ảnh hợp lệ trên đĩa (thử tải lại nếu thiếu/hỏng)
                        target_img_obj = imgs[0] if imgs else None
                        abs_p = None
                        if target_img_obj and target_img_obj.local_path:
                            chk_p = os.path.join(settings.PROJECT_ROOT, target_img_obj.local_path)
                            if os.path.isfile(chk_p) and os.path.getsize(chk_p) >= 100:
                                abs_p = chk_p

                        if (not abs_p) and target_img_obj and target_img_obj.source_url:
                            print(f"[AI OCR Vong 2] Dang tai lai anh cho {item.suffix_key}...")
                            dl_retry = _download_and_save_webp(
                                source_url=target_img_obj.source_url,
                                container_number=cont.container_number,
                                suffix_key=item.suffix_key,
                                sort_order=1,
                                max_retries=2
                            )
                            if dl_retry:
                                abs_p = dl_retry["abs_path"]
                                target_img_obj.local_path = dl_retry["rel_path"]
                                target_img_obj.file_size = dl_retry["file_size"]
                                target_img_obj.image_hash = dl_retry["image_hash"]
                                db.commit()

                        if not abs_p or not os.path.isfile(abs_p):
                            print(f"[AI OCR Vong 2] Khong the tai anh cho {item.suffix_key}. Bo qua quet lai.")
                            continue

                        # 2. Đọc ảnh và thử giải mã tăng cường Barcode qua ZXing ở 4 góc xoay
                        cv_img = cv2.imread(abs_p)
                        zx_barcodes, zx_lpn = _scan_zxing_multirot(cv_img, expected_lpn=item.lpn)

                        # 3. Quét qua pipeline với chế độ tăng cường (auto_rotate=True, apply_super_res=True)
                        exp_skus = [item.sku] if item.sku else []
                        res = pipeline.process(
                            image_input=abs_p,
                            auto_crop=True,
                            auto_rotate=True,
                            apply_super_res=True,
                            expected_lpn=item.lpn,
                            expected_skus=exp_skus,
                            package_position=item.suffix_key
                        )

                        detected_lpn = zx_lpn or res.get("lpn")
                        detected_sku = res.get("sku")
                        barcodes = res.get("barcodes") or []
                        for zb in zx_barcodes:
                            if zb not in barcodes:
                                barcodes.append(zb)

                        conf = float(res.get("confidence") or 0.0)
                        if zx_lpn:
                            conf = max(conf, 0.99)

                        # So sánh LPN lần 2
                        is_lpn_match = False
                        if item.lpn and detected_lpn:
                            exp_clean = re.sub(r'[^A-Za-z0-9]', '', str(item.lpn)).upper()
                            det_clean = re.sub(r'[^A-Za-z0-9]', '', str(detected_lpn)).upper()
                            if exp_clean == det_clean or exp_clean in det_clean or det_clean in exp_clean:
                                is_lpn_match = True

                        # So sánh SKU lần 2
                        is_sku_match = False
                        if exp_skus and detected_sku:
                            for exp_s in exp_skus:
                                if exp_s and exp_s.strip().upper() in str(detected_sku).strip().upper():
                                    is_sku_match = True
                                    break

                        dur_ms = round((time.time() - t0) * 1000, 2)

                        # Cập nhật kết quả OCR Vòng 2 vào CSDL
                        target_img_id = target_img_obj.id if target_img_obj else None
                        ocr_row = db.query(LpnAiOcrResult).filter(
                            LpnAiOcrResult.item_id == item.id
                        ).first()

                        if not ocr_row:
                            ocr_row = LpnAiOcrResult(
                                item_id=item.id,
                                image_id=target_img_id,
                                container_number=cont.container_number,
                                suffix_key=item.suffix_key,
                                model_id="AiOcrPipeline_Pass2",
                                detected_lpn=detected_lpn,
                                detected_sku=detected_sku,
                                detected_barcodes=json.dumps(barcodes, ensure_ascii=False) if barcodes else None,
                                confidence=conf,
                                is_lpn_match=is_lpn_match,
                                is_sku_match=is_sku_match,
                                status="success" if (is_lpn_match or res.get("success", True)) else "failed",
                                processing_time_ms=dur_ms,
                                scanned_at=datetime.utcnow()
                            )
                            db.add(ocr_row)
                        else:
                            ocr_row.detected_lpn = detected_lpn
                            ocr_row.detected_sku = detected_sku
                            ocr_row.detected_barcodes = json.dumps(barcodes, ensure_ascii=False) if barcodes else None
                            ocr_row.confidence = conf
                            ocr_row.is_lpn_match = is_lpn_match
                            ocr_row.is_sku_match = is_sku_match
                            ocr_row.status = "success" if (is_lpn_match or res.get("success", True)) else "failed"
                            ocr_row.processing_time_ms = dur_ms
                            ocr_row.scanned_at = datetime.utcnow()

                        if is_lpn_match:
                            item.resolution_status = "resolved"
                            item.resolution_note = f"Khớp AI OCR Vòng 2 ({detected_lpn})"
                            item.resolved_at = datetime.utcnow()
                            item.resolved_by = "AI_WEBHOOK_P2"

                        db.commit()
                        print(f"[AI OCR Vong 2] {item.suffix_key}: LPN={detected_lpn} | Match={is_lpn_match} ({dur_ms}ms)")
                    except Exception as p2_err:
                        db.rollback()
                        print(f"[AI OCR Vong 2 Loi] {candidate['item'].suffix_key}: {p2_err}")

                print(f"[AI OCR Vong 2] <<< Hoan tat quet lai lan 2 cho Container {cont.container_number}.")
            else:
                print("[AI OCR Webhook] 100% kien deu da dat sau Vong 1. Khong can quet lai Vong 2.")

        finally:
            db.close()

        # -------------------------------------------------------------
        # HOÀN TẤT TOÀN BỘ: TỰ ĐỘNG GỬI BÁO CÁO ZALO CHÍNH THỨC
        # -------------------------------------------------------------
        try:
            from lpn_crawler.backend.services.zalo_bot_service import ZaloBotService
            print(f"[Zalo Bot] Tat ca kien da hoan tat (Vong 1 + Vong 2). Dang gui bao cao Zalo cho Container ID {container_id} toi SDT: {target_phone}...")
            z_res = ZaloBotService.send_container_report(
                container_id=container_id,
                target_phone=target_phone,
                send_image=True
            )
            print(f"[Zalo Bot] Ket qua gui Zalo: {z_res.get('message')}")
        except Exception as ze:
            print(f"[Zalo Bot Error] Loi gui bao cao Zalo sau khi quet xong: {ze}")

    finally:
        cont_lock.release()


def _compute_content_hash(data: Any) -> str:
    """
    Tính mã hash MD5 nội dung thực tế của dữ liệu container.
    Bỏ qua các trường metadata động của webhook/AppSheet như At, _RowNumber...
    để đảm bảo nếu dữ liệu nghiệp vụ không đổi thì hash không đổi.
    """
    if not isinstance(data, dict):
        return hashlib.md5(str(data).encode("utf-8")).hexdigest()

    ignore_keys = {"At", "at", "_at", "_RowNumber", "Application", "TableName", "UserName", "UpdateMode"}
    clean_dict = {
        str(k).strip(): (v.strip() if isinstance(v, str) else v)
        for k, v in data.items()
        if k not in ignore_keys and not str(k).startswith("_")
    }
    return hashlib.md5(json.dumps(clean_dict, sort_keys=True).encode("utf-8")).hexdigest()


@router.post("/webhook/appsheet")
async def receive_appsheet_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    force: bool = Query(False, description="Bắt buộc xử lý lại ngay cả khi dữ liệu không thay đổi"),
    db: Session = Depends(get_db),
    auth: bool = Depends(verify_webhook_token)
):
    """
    Tiếp nhận dữ liệu từ AppSheet:
    - Kiểm tra nếu dữ liệu Container không thay đổi so với DB (Content Hash trùng) -> Bỏ qua.
    - Nếu có thay đổi hoặc là Container mới:
      1. Lưu gói tin JSON đệm an toàn.
      2. Cập nhật CSDL LpnContainer, LpnItem.
      3. Tải các ảnh WebP mới (tận dụng cache ảnh đã có, không tải lại ảnh trùng).
      4. Tự động lên lịch chạy ngầm AI OCR cho các ảnh mới.
    """
    now = datetime.now()
    timestamp_str = now.strftime("%Y%m%d_%H%M%S_%f")[:19]
    iso_time = now.isoformat()

    # 1. Đọc Raw Body và JSON payload
    try:
        payload = await request.json()
    except Exception:
        raw_body = (await request.body()).decode("utf-8", errors="replace")
        err_filename = f"webhook_error_{timestamp_str}.txt"
        err_path = os.path.join(WEBHOOKS_DIR, err_filename)
        with open(err_path, "w", encoding="utf-8") as f:
            f.write(raw_body)
        raise HTTPException(status_code=400, detail=f"Payload không phải là JSON hợp lệ. Đã lưu raw vào {err_filename}")

    # 2. Bóc tách dữ liệu sơ bộ
    row_data = payload
    if isinstance(payload, dict):
        if "Data" in payload and isinstance(payload["Data"], dict):
            row_data = payload["Data"]
        elif "data" in payload and isinstance(payload["data"], dict):
            row_data = payload["data"]
        elif "Values" in payload and isinstance(payload["Values"], dict):
            row_data = payload["Values"]
        elif "values" in payload and isinstance(payload["values"], dict):
            row_data = payload["values"]
        elif "Rows" in payload and isinstance(payload["Rows"], list) and len(payload["Rows"]) > 0:
            row_data = payload["Rows"][0]
    elif isinstance(payload, list) and len(payload) > 0 and isinstance(payload[0], dict):
        row_data = payload[0]

    c_num = _extract_container_number(row_data) if isinstance(row_data, dict) else ""
    if not c_num and isinstance(payload, dict):
        c_num = _extract_container_number(payload)
    c_num = c_num or "UNKNOWN"
    c_clean = c_num.replace(" ", "").upper()

    table_name = str(payload.get("TableName") or "CONTAINER").upper() if isinstance(payload, dict) else "CONTAINER"

    # Trích xuất các trường chung
    factory = str(row_data.get("Factory") or "").strip()
    date_loading_raw = str(row_data.get("Date loading") or row_data.get("Date") or "").strip()
    date_loading = _parse_date(date_loading_raw)
    timestamp_raw = str(row_data.get("Timestamp") or row_data.get("At") or payload.get("At") or "").strip()
    timestamp_val = _parse_datetime(timestamp_raw) or datetime.utcnow()
    operator_name = str(row_data.get("Operator name") or row_data.get("Operator") or row_data.get("Useremail") or payload.get("UserName") or "").strip()
    operator_phone = _extract_phone_number(row_data, payload, db)

    fingerprint = hashlib.md5(f"{c_clean}_{factory}".encode("utf-8")).hexdigest()
    content_hash = _compute_content_hash(row_data if isinstance(row_data, dict) else payload)

    # 3. TÌM BẢN GHI CONTAINER TRONG CSDL
    db_cont = db.query(LpnContainer).filter(
        or_(
            LpnContainer.container_number == c_num,
            func.replace(LpnContainer.container_number, ' ', '') == c_clean,
            LpnContainer.record_fingerprint == fingerprint
        )
    ).first()

    # 3. LƯU GÓI TIN JSON ĐỆM TRƯỚC (Ghi nhận toàn bộ webhook gửi đến để màn hình giám sát hiển thị đầy đủ)
    filename = f"webhook_{timestamp_str}_{c_clean}.json"
    file_path = os.path.join(WEBHOOKS_DIR, filename)

    dump_object = {
        "received_at": iso_time,
        "filename": filename,
        "client_ip": request.client.host if request.client else "unknown",
        "headers": dict(request.headers),
        "extracted_container": c_num or "None",
        "mode": "BUFFER_JSON_THEN_DATABASE",
        "saved_to_database": False,
        "items_processed": 0,
        "images_downloaded": 0,
        "payload": payload
    }

    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(dump_object, f, ensure_ascii=False, indent=2)
    except Exception as json_err:
        print(f"[Webhook JSON Save Error] {json_err}")

    # Ghi nối tiếp vào nhật ký tổng hợp (history.jsonl)
    history_path = os.path.join(WEBHOOKS_DIR, "webhooks_history.jsonl")
    try:
        with open(history_path, "a", encoding="utf-8") as hf:
            hf.write(json.dumps({
                "received_at": iso_time,
                "filename": filename,
                "container_number": c_num,
                "saved_to_db": False,
                "items_count": 0,
                "ocr_tasks": 0
            }, ensure_ascii=False) + "\n")
    except Exception:
        pass

    # 4. KIỂM TRA NẾU DATA CÓ THAY ĐỔI HAY KHÔNG (Deduplication / Skip No-Op Updates)
    if not force and db_cont and db_cont.content_hash and db_cont.content_hash == content_hash:
        now_utc = datetime.utcnow()
        if db_cont.last_seen_at is None or (now_utc - db_cont.last_seen_at).total_seconds() > 60:
            try:
                db_cont.last_seen_at = now_utc
                db_cont.crawl_count = (db_cont.crawl_count or 1) + 1
                db.commit()
            except Exception:
                db.rollback()

        try:
            print(f"[Webhook AppSheet] Container {c_num} ({c_clean}): Data KHONG thay doi (Hash: {content_hash[:8]}). Bo qua.")
        except Exception:
            pass
        return {
            "status": "skipped",
            "saved_to_database": False,
            "is_data_updated": False,
            "container_number": c_num,
            "table_name": table_name,
            "items_count": 0,
            "images_downloaded": 0,
            "ai_ocr_scheduled": 0,
            "message": f"Dữ liệu Container {c_num} không có thay đổi (Content Hash: {content_hash[:8]}). Đã bỏ qua các bước tiếp theo.",
            "received_at": iso_time
        }

    # 5. ĐIỀU KIỆN TIÊN QUYẾT: CHỈ LƯU NHỮNG CÁI NÀO CÓ ẢNH CONT DO NGƯỜI DÙNG UPLOAD LÊN
    # Tuyệt đối KHÔNG lấy ảnh từ CSDL (Chỉ lấy ảnh do người dùng upload lên từ webhook)
    incoming_cont_pic = None
    if isinstance(row_data, dict):
        incoming_cont_pic = (
            row_data.get("Container picture")
            or row_data.get("Container_picture")
            or row_data.get("Ảnh cont")
            or row_data.get("Anh_cont")
            or row_data.get("Picture")
        )
    if not incoming_cont_pic and isinstance(payload, dict):
        incoming_cont_pic = payload.get("Container picture") or payload.get("Picture")

    user_cont_pic = None
    if incoming_cont_pic and str(incoming_cont_pic).strip().lower() not in ["none", "null", ""]:
        user_cont_pic = str(incoming_cont_pic).strip()
    else:
        # Nếu gói tin hiện tại không kèm ảnh (ví dụ từ bảng Pallet LPN_11_04),
        # kiểm tra xem người dùng ĐÃ UPLOAD ảnh Cont trong các file webhook hôm nay chưa (KHÔNG lấy từ CSDL)
        user_cont_pic = _find_user_uploaded_cont_pic_today(c_clean)

    has_cont_pic = bool(user_cont_pic)

    if not has_cont_pic:
        # Người dùng CHƯA upload ảnh Cont:
        # Theo yêu cầu: Ảnh Cont không lấy từ CSDL mà chỉ lấy từ người dùng upload lên.
        # Nếu không có thì để trống rồi skip qua, không lưu vào CSDL.
        dump_object["saved_to_database"] = False
        dump_object["skip_reason"] = "no_user_uploaded_container_picture"
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(dump_object, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

        try:
            print(f"[Webhook AppSheet] Container {c_num} ({c_clean}): Nguoi dung CHUA upload anh Cont. Bo qua luu CSDL.")
        except Exception:
            pass
        return {
            "status": "skipped",
            "reason": "no_container_picture",
            "saved_to_database": False,
            "is_data_updated": False,
            "container_number": c_num,
            "table_name": table_name,
            "items_count": 0,
            "images_downloaded": 0,
            "ai_ocr_scheduled": 0,
            "message": f"Chưa lưu CSDL: Container {c_num} chưa có ảnh Cont do người dùng upload lên (Ảnh không lấy từ CSDL). Đã ghi nhận đệm JSON.",
            "received_at": iso_time
        }

    saved_to_db = False
    items_count = 0
    ocr_tasks = []

    # 6. GHI VÀO CSDL LPN-CRAWLER NẾU SAVE_TO_DATABASE = True (Container đã có ảnh Cont)
    if SAVE_TO_DATABASE and isinstance(row_data, dict):
        try:
            # 5.1. Tìm hoặc tạo mới LpnContainer
            if not db_cont:
                db_cont = LpnContainer(
                    record_fingerprint=fingerprint,
                    container_number=c_num,
                    factory=factory,
                    date_loading_raw=date_loading_raw,
                    date_loading=date_loading,
                    timestamp_raw=timestamp_raw,
                    timestamp_val=timestamp_val,
                    operator_name=operator_name,
                    operator_phone=operator_phone,
                    content_hash=content_hash,
                    status="success"
                )
                db.add(db_cont)
                db.flush()
            else:
                if factory:
                    db_cont.factory = factory
                if date_loading:
                    db_cont.date_loading = date_loading
                if date_loading_raw:
                    db_cont.date_loading_raw = date_loading_raw
                if timestamp_val:
                    db_cont.timestamp_val = timestamp_val
                if timestamp_raw:
                    db_cont.timestamp_raw = timestamp_raw
                if operator_name:
                    db_cont.operator_name = operator_name
                if operator_phone:
                    db_cont.operator_phone = operator_phone
                db_cont.content_hash = content_hash
                db_cont.last_seen_at = datetime.utcnow()
                db_cont.crawl_count = (db_cont.crawl_count or 1) + 1

            # 6.2. Xử lý ảnh đại diện Container (Container picture)
            c_pic = user_cont_pic or incoming_cont_pic or row_data.get("Container picture") or row_data.get("Picture")
            if c_pic and str(c_pic).startswith("http"):
                already_has_cont_img = False
                if db_cont.container_image:
                    abs_cont_img = os.path.join(settings.PROJECT_ROOT, db_cont.container_image)
                    if os.path.exists(abs_cont_img):
                        already_has_cont_img = True

                if not already_has_cont_img:
                    img_res = _download_and_save_webp(c_pic, c_clean, "container", 0)
                    if img_res:
                        db_cont.container_image = img_res["rel_path"]
                    elif not db_cont.container_image:
                        db_cont.container_image = c_pic

            # 5.3. Xử lý các kiện Pallet và Box (Từ 1 đến 50)
            for i in range(1, 51):
                # Pallet
                batch_p = str(row_data.get(f"Batch Pallet {i}") or "").strip()
                lpn_p = str(row_data.get(f"LPN  Pallet {i}") or row_data.get(f"LPN Pallet {i}") or "").strip()
                sku_p = str(row_data.get(f"SKU  Pallet {i}") or row_data.get(f"SKU Pallet {i}") or "").strip()
                pic_p = str(row_data.get(f"Picture Pallet {i}") or "").strip()

                if batch_p or lpn_p or sku_p or pic_p:
                    suf_p = f"Pallet {i}"
                    item_p = db.query(LpnItem).filter(
                        LpnItem.container_id == db_cont.id,
                        LpnItem.suffix_key == suf_p
                    ).first()
                    if not item_p:
                        item_p = LpnItem(
                            container_id=db_cont.id,
                            record_type="Pallet",
                            suffix_key=suf_p,
                            item_index=i,
                            batch_original=batch_p,
                            batch_resolved=batch_p,
                            lpn=lpn_p,
                            sku=sku_p,
                            raw_group_key=suf_p,
                            resolution_status="unresolved"
                        )
                        db.add(item_p)
                        db.flush()
                    else:
                        item_p.record_type = "Pallet"
                        item_p.item_index = i
                        if batch_p:
                            item_p.batch_original = batch_p
                            item_p.batch_resolved = batch_p
                        if lpn_p:
                            item_p.lpn = lpn_p
                        if sku_p:
                            item_p.sku = sku_p
                    items_count += 1

                    # Tải ảnh WebP của Pallet nếu có (tận dụng cache, không tải lại nếu không đổi)
                    if pic_p and pic_p.startswith("http"):
                        db_img = db.query(LpnImage).filter(
                            LpnImage.lpn_item_id == item_p.id,
                            LpnImage.container_id == db_cont.id
                        ).first()

                        img_res = None
                        already_cached = False
                        if db_img and db_img.source_url == pic_p and db_img.local_path:
                            abs_p = os.path.join(settings.PROJECT_ROOT, db_img.local_path)
                            if os.path.exists(abs_p):
                                already_cached = True
                                img_res = {
                                    "abs_path": abs_p,
                                    "rel_path": db_img.local_path,
                                    "image_hash": db_img.image_hash,
                                    "file_mime": db_img.file_mime,
                                    "file_size": db_img.file_size,
                                    "source_url": pic_p
                                }

                        if not already_cached:
                            img_res = _download_and_save_webp(pic_p, c_clean, suf_p, 1)

                        if not db_img:
                            db_img = LpnImage(
                                lpn_item_id=item_p.id,
                                container_id=db_cont.id,
                                image_type="Pallet",
                                sort_order=1,
                                source_url=pic_p,
                                local_path=img_res["rel_path"] if img_res else None,
                                image_hash=img_res["image_hash"] if img_res else None,
                                file_mime=img_res["file_mime"] if img_res else None,
                                file_size=img_res["file_size"] if img_res else None
                            )
                            db.add(db_img)
                            db.flush()
                        else:
                            db_img.source_url = pic_p
                            if img_res:
                                db_img.local_path = img_res["rel_path"]
                                db_img.image_hash = img_res["image_hash"]
                                db_img.file_mime = img_res["file_mime"]
                                db_img.file_size = img_res["file_size"]

                        # Chỉ lên lịch chạy AI OCR nếu ảnh mới được tải (chưa có trong cache)
                        if img_res and not already_cached:
                            ocr_tasks.append({
                                "item_id": item_p.id,
                                "image_id": db_img.id,
                                "abs_path": img_res["abs_path"],
                                "container_number": c_num,
                                "suffix_key": suf_p,
                                "expected_lpn": lpn_p,
                                "expected_skus": [sku_p] if sku_p else []
                            })

                # Box
                batch_b = str(row_data.get(f"Batch Box {i}A") or "").strip()
                lpn_b = str(row_data.get(f"LPN  Box {i}A") or row_data.get(f"LPN Box {i}A") or "").strip()
                sku_b = str(row_data.get(f"SKU  Box {i}A") or row_data.get(f"SKU Box {i}A") or "").strip()
                pic_b = str(row_data.get(f"Picture Box {i}A") or "").strip()

                if batch_b or lpn_b or sku_b or pic_b:
                    suf_b = f"Box {i}A"
                    item_b = db.query(LpnItem).filter(
                        LpnItem.container_id == db_cont.id,
                        LpnItem.suffix_key == suf_b
                    ).first()
                    if not item_b:
                        item_b = LpnItem(
                            container_id=db_cont.id,
                            record_type="Box",
                            suffix_key=suf_b,
                            item_index=i,
                            batch_original=batch_b,
                            batch_resolved=batch_b,
                            lpn=lpn_b,
                            sku=sku_b,
                            raw_group_key=suf_b,
                            resolution_status="unresolved"
                        )
                        db.add(item_b)
                        db.flush()
                    else:
                        item_b.record_type = "Box"
                        item_b.item_index = i
                        if batch_b:
                            item_b.batch_original = batch_b
                            item_b.batch_resolved = batch_b
                        if lpn_b:
                            item_b.lpn = lpn_b
                        if sku_b:
                            item_b.sku = sku_b
                    items_count += 1

                    # Tải ảnh WebP của Box nếu có (tận dụng cache, không tải lại nếu không đổi)
                    if pic_b and pic_b.startswith("http"):
                        db_img = db.query(LpnImage).filter(
                            LpnImage.lpn_item_id == item_b.id,
                            LpnImage.container_id == db_cont.id
                        ).first()

                        img_res = None
                        already_cached = False
                        if db_img and db_img.source_url == pic_b and db_img.local_path:
                            abs_p = os.path.join(settings.PROJECT_ROOT, db_img.local_path)
                            if os.path.exists(abs_p):
                                already_cached = True
                                img_res = {
                                    "abs_path": abs_p,
                                    "rel_path": db_img.local_path,
                                    "image_hash": db_img.image_hash,
                                    "file_mime": db_img.file_mime,
                                    "file_size": db_img.file_size,
                                    "source_url": pic_b
                                }

                        if not already_cached:
                            img_res = _download_and_save_webp(pic_b, c_clean, suf_b, 1)

                        if not db_img:
                            db_img = LpnImage(
                                lpn_item_id=item_b.id,
                                container_id=db_cont.id,
                                image_type="Box",
                                sort_order=1,
                                source_url=pic_b,
                                local_path=img_res["rel_path"] if img_res else None,
                                image_hash=img_res["image_hash"] if img_res else None,
                                file_mime=img_res["file_mime"] if img_res else None,
                                file_size=img_res["file_size"] if img_res else None
                            )
                            db.add(db_img)
                            db.flush()
                        else:
                            db_img.source_url = pic_b
                            if img_res:
                                db_img.local_path = img_res["rel_path"]
                                db_img.image_hash = img_res["image_hash"]
                                db_img.file_mime = img_res["file_mime"]
                                db_img.file_size = img_res["file_size"]

                        # Chỉ lên lịch chạy AI OCR nếu ảnh mới được tải (chưa có trong cache)
                        if img_res and not already_cached:
                            ocr_tasks.append({
                                "item_id": item_b.id,
                                "image_id": db_img.id,
                                "abs_path": img_res["abs_path"],
                                "container_number": c_num,
                                "suffix_key": suf_b,
                                "expected_lpn": lpn_b,
                                "expected_skus": [sku_b] if sku_b else []
                            })

            db.commit()
            saved_to_db = True

            # 5.4. Lên lịch chạy ngầm AI OCR qua BackgroundTasks
            if ocr_tasks:
                background_tasks.add_task(_run_background_ocr_tasks, ocr_tasks, container_id=db_cont.id, target_phone=operator_phone)
            elif items_count > 0:
                # Nếu tất cả ảnh đều đã cache không cần quét lại mới -> Vẫn chạy qua Audit Gate để kiểm tra và gửi báo cáo Zalo
                background_tasks.add_task(_run_background_ocr_tasks, [], container_id=db_cont.id, target_phone=operator_phone)
            else:
                # items_count == 0 (Container rỗng vừa tạo, chưa có chi tiết kiện) -> Tuyệt đối KHÔNG gửi Zalo
                print(f"[Webhook AppSheet] Container {c_num} ({c_clean}): items_count = 0. Bo qua gui Zalo, cho goi tin co chi tiet kien.")

        except Exception as db_err:
            db.rollback()
            print(f"[Webhook DB Error] {db_err}")

    # 6. Cập nhật lại file JSON với trạng thái lưu DB thành công
    dump_object["saved_to_database"] = saved_to_db
    dump_object["items_processed"] = items_count
    dump_object["images_downloaded"] = len(ocr_tasks)
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(dump_object, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

    return {
        "status": "success",
        "saved_to_database": saved_to_db,
        "is_data_updated": True,
        "container_number": c_num,
        "table_name": table_name,
        "items_count": items_count,
        "images_downloaded": len(ocr_tasks),
        "ai_ocr_scheduled": len(ocr_tasks),
        "message": f"Đã lưu thành công Container {c_num} ({items_count} items, {len(ocr_tasks)} ảnh WebP mới) vào CSDL và kích hoạt AI OCR ngầm.",
        "saved_file": filename,
        "received_at": iso_time
    }

