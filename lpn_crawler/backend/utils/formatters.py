# -*- coding: utf-8 -*-
from typing import Any, Optional

def format_date_mdy(d_val: Any = None, raw_val: Optional[str] = None) -> Optional[str]:
    """
    Chuẩn hóa và format ngày thành chuỗi Tháng/Ngày/Năm (MM/DD/YYYY)
    """
    if d_val:
        try:
            if hasattr(d_val, "strftime"):
                return d_val.strftime("%m/%d/%Y")
            s = str(d_val).strip()
            if len(s) >= 10 and s[4] == "-" and s[7] == "-":
                y, m, d = s[:10].split("-")
                return f"{int(m):02d}/{int(d):02d}/{y}"
        except Exception:
            pass
    if raw_val and str(raw_val).strip():
        s = str(raw_val).strip()
        if len(s) >= 10 and s[4] == "-" and s[7] == "-":
            try:
                y, m, d = s[:10].split("-")
                return f"{int(m):02d}/{int(d):02d}/{y}"
            except Exception:
                pass
        parts = s.split("/")
        if len(parts) == 3:
            try:
                p1, p2, p3 = parts[0].strip(), parts[1].strip(), parts[2].strip()
                if len(p3) == 4:
                    return f"{int(p1):02d}/{int(p2):02d}/{p3}"
            except Exception:
                pass
        return s
    return None
