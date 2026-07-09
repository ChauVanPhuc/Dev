# -*- coding: utf-8 -*-
import re

def extract_filters(message: str) -> dict:
    """
    Extracts query filters (month, year, sku, defect code, action, LPN, container, cabinet) from raw message.
    Supports Vietnamese formats like "tháng 2", "thang 2", "T2", etc.
    """
    filters = {}
    msg = message.lower()
    
    # Extract period / month / year
    # Examples: "tháng 02-2026", "tháng 2/2026", "tháng 2 năm 2026", "02-2026", "2026"
    period_match = re.search(r'(?:tháng|thang)\s*(\d{1,2})\s*(?:-|/|năm|nam)?\s*(\d{4})', msg)
    if period_match:
        m = period_match.group(1).zfill(2)
        y = period_match.group(2)
        filters["period"] = f"{m}-{y}"
    else:
        # Check standalone date format like MM-YYYY or MM/YYYY
        simple_date = re.search(r'\b(\d{1,2})[-/](\d{4})\b', msg)
        if simple_date:
            m = simple_date.group(1).zfill(2)
            y = simple_date.group(2)
            filters["period"] = f"{m}-{y}"
        else:
            # Standalone month: "tháng 2", "thang 2", "T2", "t2"
            month_match = re.search(r'(?:tháng|thang)\s*(\d{1,2})\b', msg)
            t_match = re.search(r'\bt(\d{1,2})\b', msg)
            if month_match:
                filters["month"] = month_match.group(1).zfill(2)
            elif t_match:
                filters["month"] = t_match.group(1).zfill(2)
                
            # Standalone year: "năm 2026", "nam 2026"
            year_match = re.search(r'(?:năm|nam)\s*(\d{4})\b', msg)
            if year_match:
                filters["year"] = year_match.group(1)
            else:
                # Standalone year four digits if not part of date and not month
                if not month_match and not t_match:
                    four_digit = re.search(r'\b(202\d)\b', msg)
                    if four_digit:
                        filters["year"] = four_digit.group(1)
                        
    # Extract Limit/Count - More flexible patterns
    # Patterns: "cho tôi 1 cái", "lấy 2 bản ghi", "xem 3 dòng", "1 khiếu nại", "5 claim", "phiếu 1 cái"
    limit_keywords = ["cái", "bản ghi", "dòng", "khiếu nại", "claim", "phiếu", "lô", "kết quả", "bản"]
    
    # Try pattern: "cho tôi X cái", "lấy X bản ghi", etc.
    for kw in limit_keywords:
        pattern = rf'\b(\d+)\s+{kw}'
        match = re.search(pattern, msg)
        if match:
            filters["limit"] = int(match.group(1))
            break
    
    # If not found, try pattern: "cái X", "bản ghi X" (less common but possible)
    if "limit" not in filters:
        for kw in limit_keywords:
            pattern = rf'{kw}\s*(\d+)'
            match = re.search(pattern, msg)
            if match:
                filters["limit"] = int(match.group(1))
                break
    
    # If still not found, try standalone number with context words
    if "limit" not in filters:
        context_words = ["cho", "lấy", "xem", "hiện", "liệt kê", "liet ke", "tìm", "tim"]
        if any(cw in msg for cw in context_words):
            # Find first number in the message
            numbers = re.findall(r'\b(\d+)\b', msg)
            if numbers:
                filters["limit"] = int(numbers[0])
        
    # Extract cabinet number - enhanced patterns
    cab_match = re.search(r'(?:cabinet|tủ|tu)\s*#?\s*(\d+)', msg)
    if cab_match:
        filters["cabinet_no"] = int(cab_match.group(1))
    else:
        sharp_match = re.search(r'#(\d+)', msg)
        if sharp_match:
            filters["cabinet_no"] = int(sharp_match.group(1))
        else:
            # Pattern: "tủ 5", "cabinet 5", "tu 5"
            simple_cab = re.search(r'(?:tủ|tu|cabinet)\s*(\d+)', msg)
            if simple_cab:
                filters["cabinet_no"] = int(simple_cab.group(1))
            
    # Extract defect code - enhanced patterns
    defect_match = re.search(r'\b([a-z]{2,4}[-_]?[0-9]+[a-z0-9_-]*)\b', msg)
    if defect_match:
        val = defect_match.group(1).upper()
        if not re.match(r'^[A-Z]{4}[0-9]{7}$', val):
            filters["defect_code"] = val
    else:
        # Pattern: "lỗi DVA_17", "ma loi APP-24"
        defect_follow = re.search(r'(?:lỗi|loi|mã lỗi|ma loi|defect)\s*[:\s]*([a-z0-9_-]+)', msg)
        if defect_follow:
            val = defect_follow.group(1).upper()
            ignore_defect_words = {
                "BỊ", "BI", "PHẠT", "PHAT", "NẶNG", "NANG", "NHẸ", "NHE", 
                "NHIỀU", "NHIEU", "LỚN", "LON", "NHỎ", "NHO", "HẾT", "HET", 
                "CỦA", "CUA", "CHO", "VỚI", "VOI", "ĐÃ", "DA", "CHƯA", "CHUA", 
                "ĐANG", "DANG", "TRONG", "PHÁT", "SINH", "GÌ", "GI"
            }
            if val not in ignore_defect_words and len(val) >= 3:
                filters["defect_code"] = val
        
    # Extract Action
    if any(k in msg for k in ["full bc", "full bộ", "full bo", "phạt full", "phat full"]):
        filters["action"] = "Full BC"
    elif any(k in msg for k in ["$50", "50 đô", "50 do", "50$"]):
        filters["action"] = "$50"
    elif any(k in msg for k in ["repair", "sửa chữa", "sua chua"]):
        filters["action"] = "Repair"
    elif any(k in msg for k in ["x2 unit", "x2"]):
        filters["action"] = "X2 Unit"
        
    # Extract Container
    cont_match = re.search(r'\b([a-z]{4}[0-9]{7})\b', msg)
    if cont_match:
        filters["container_no"] = cont_match.group(1).upper()
        
    # Extract LPN
    lpn_match = re.search(r'\b(\d{7,10})\b', msg)
    if lpn_match:
        filters["lpn"] = lpn_match.group(1)
        
    # Extract SKU
    sku_match = re.search(r'\b([a-z0-9]{3,5}-[a-z0-9-]+)\b', msg)
    if sku_match:
        filters["sku"] = sku_match.group(1).upper()
    else:
        sku_follow = re.search(r'\b(?:sku|sản phẩm|san pham|mã hàng|ma hang)\s+([a-z0-9-]+)\b', msg)
        if sku_follow:
            filters["sku"] = sku_follow.group(1).upper()
        
    # Extract Status (Received/Processing/Resolved -> Mới/Đang xử lý/Đã xử lý)
    if any(k in msg for k in ["chưa xử lý", "chua xu ly", "mới", "moi nhận", "chưa giải quyết"]):
        filters["status"] = "Mới"
    elif any(k in msg for k in ["đang xử lý", "dang xu ly", "đang giải quyết", "dang giai quyet"]):
        filters["status"] = "Đang xử lý"
    elif any(k in msg for k in ["đã xử lý", "da xu ly", "hoàn thành", "hoan thanh", "đã giải quyết", "da giai quyet", "resolved"]):
        filters["status"] = "Đã xử lý"
        
    # Extract Severity
    if any(k in msg for k in ["phạt nặng", "phat nang", "nghiêm trọng", "nghiem trong", "nguy hiểm", "cao", "high"]):
        filters["severity"] = "High"
    elif any(k in msg for k in ["trung bình", "medium", "vừa", "tạm"]):
        filters["severity"] = "Medium"
    elif any(k in msg for k in ["phạt nhẹ", "phat nhe", "thấp", "low", "nhẹ"]):
        filters["severity"] = "Low"
        
    # Standard keyword extraction for general searches
    # Skip if we already have specific filters (year, month, period, etc.)
    has_specific_filter = any(k in filters for k in ["year", "month", "period", "cabinet_no", "sku", "defect_code", "container_no", "lpn", "action", "status", "severity"])
    
    if not has_specific_filter:
        clean_msg = re.sub(r'[?.,!\(\)]', ' ', msg)
        words = clean_msg.split()
        ignore_words = {
            "tìm", "claim", "khiếu", "nại", "của", "cho", "có", "bị", "lỗi", "mã", "tháng", "năm", "tủ", "cabinet", "nào", "ở", "trong",
            "xuất", "hiện", "nhiều", "nhất", "gì", "bao", "nhiêu", "thống", "kê", "xem", "liệt", "đâu", "sao", "thế", "không", "tổng",
            "hết", "toàn", "bộ", "danh", "sách", "phổ", "biến", "top", "mấy", "tất", "cả", "hay", "như", "thì", "với", "được", "hỏi",
            "biết", "giúp", "kiểm", "tra", "container", "cont", "lpn", "sku", "trạng", "thái", "mức", "độ"
        }
        keywords = [w for w in words if w not in ignore_words and len(w) > 2]
        if keywords:
            filters["keyword"] = " ".join(keywords)
        
    return filters
