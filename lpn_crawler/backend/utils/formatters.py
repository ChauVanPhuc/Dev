# -*- coding: utf-8 -*-
from typing import Any, Optional
from datetime import datetime, date

def format_date_mdy(d_val: Any = None, raw_val: Optional[str] = None) -> Optional[str]:
    """
    Chuẩn hóa và format ngày theo chuẩn Việt Nam: Ngày/Tháng/Năm (DD/MM/YYYY)
    """
    if d_val:
        try:
            if hasattr(d_val, "strftime"):
                return d_val.strftime("%d/%m/%Y")
            s = str(d_val).strip()
            if len(s) >= 10 and s[4] == "-" and s[7] == "-":
                y, m, d = s[:10].split("-")
                return f"{int(d):02d}/{int(m):02d}/{y}"
        except Exception:
            pass
    if raw_val and str(raw_val).strip():
        s = str(raw_val).strip()
        if len(s) >= 10 and s[4] == "-" and s[7] == "-":
            try:
                y, m, d = s[:10].split("-")
                return f"{int(d):02d}/{int(m):02d}/{y}"
            except Exception:
                pass
        parts = s.split("/")
        if len(parts) == 3:
            try:
                p1, p2, p3 = int(parts[0].strip()), int(parts[1].strip()), parts[2].strip()[:4]
                if p2 > 12:
                    # p1 là tháng, p2 là ngày
                    return f"{p2:02d}/{p1:02d}/{p3}"
                elif p1 > 12:
                    # p1 là ngày, p2 là tháng
                    return f"{p1:02d}/{p2:02d}/{p3}"
                else:
                    # Nguồn từ AppSheet là MM/DD/YYYY -> đổi sang DD/MM/YYYY
                    return f"{p2:02d}/{p1:02d}/{p3}"
            except Exception:
                pass
        return s
    return None

# Alias để dùng đồng thời chuẩn đặt tên mới
format_date_dmy = format_date_mdy


def format_timestamp_display(raw_val: Optional[str] = None, val: Any = None) -> Optional[str]:
    """
    Format thời gian chuẩn hiển thị Việt Nam Ngày/tháng/năm  giờ (DD/MM/YYYY hh:mm:ss AM/PM)
    """
    # 1. Nếu có datetime object chuẩn từ DB
    if val and hasattr(val, "strftime"):
        try:
            return val.strftime("%d/%m/%Y %I:%M:%S %p")
        except Exception:
            pass

    # 2. Xử lý từ chuỗi raw (ví dụ AppSheet: '10/14/2026 12:48:27 PM' hoặc '10/14/2026 19:40:32')
    if raw_val:
        s = str(raw_val).strip()
        fmts = [
            "%m/%d/%Y %I:%M:%S %p", "%d/%m/%Y %I:%M:%S %p",
            "%m/%d/%Y %I:%M %p", "%d/%m/%Y %I:%M %p",
            "%m/%d/%Y %H:%M:%S", "%d/%m/%Y %H:%M:%S",
            "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S",
            "%m/%d/%Y %H:%M", "%d/%m/%Y %H:%M",
            "%Y-%m-%d %H:%M", "%d-%m-%Y %H:%M:%S"
        ]
        for fmt in fmts:
            try:
                dt = datetime.strptime(s, fmt)
                return dt.strftime("%d/%m/%Y %I:%M:%S %p")
            except ValueError:
                pass
    return raw_val or ""

