# -*- coding: utf-8 -*-
import re

def detect_intent(message: str) -> str:
    r"""
    Identifies the user intent from message keywords.
    Enhanced to understand more natural language patterns and combinations.
    Priority order:
      1. find_latest - explicitly asking for latest/new items
      2. missing_images_ratio - percentage of missing images query
      3. compare_months - comparison between months query
      4. show_images - checking for images of the active entity
      5. show_capa - CAPA query
      6. explain_action - explanation of current action
      7. follow_up_detail - viewing detail of context
      8. find_by_cabinet - cabinet number query
      9. find_by_sku - SKU code query
      10. find_by_defect - defect code query
      11. find_by_action - action/penalty query
      12. find_by_transport - container/lpn query
      13. missing_images - missing images query
      14. missing_info - missing information query
      15. count_by_date - count with date filter
      16. count_all - count without date
      17. top_defects - statistics on defects
      18. top_skus - statistics on SKUs
      19. general_query - fallback
    """
    msg = message.lower()
    
    # Typo correction for common Vietnamese typos
    typo_map = {
        "nhiu": "nhiều",
        "nhieu": "nhiều",
        "bao nhieu": "bao nhiêu",
        "co": "có",
        "khong": "không",
        "thang": "tháng",
        "nam": "năm",
        "tong": "tổng",
        "so": "số",
        "luong": "lượng",
        "thong": "thống",
        "ke": "kê",
        "ma": "mã",
        "loi": "lỗi",
        "khac": "khắc",
        "phuc": "phục",
        "xu": "xử",
        "ly": "lý",
        "chi": "chi",
        "tiet": "tiết",
        "danh": "danh",
        "sach": "sách",
        "liet": "liệt",
        "ke": "kê",
        "gan": "gần",
        "day": "đây",
        "moi": "mới",
        "nhap": "nhập",
        "truoc": "trước",
        "sau": "sau",
        "san": "sản",
        "pham": "phẩm",
        "bi": "bị",
        "pho": "phổ",
        "bien": "biến",
        "thuoc": "thuộc",
        "trong": "trong",
    }
    
    for typo, correct in typo_map.items():
        msg = msg.replace(typo, correct)
    
    words = set(msg.split())
    
    # 0. find_latest - only trigger if explicitly asking for latest/new items
    latest_keywords = ["gần nhất", "gan nhat", "mới nhất", "moi nhat", "vừa xong", "vua xong", "mới import", "moi import", 
                      "phiếu mới", "phieu moi", "claim mới", "claim moi", "lô mới", "lo moi", "vừa thêm", "vua them",
                      "mới nhập", "moi nhap", "gần đây", "gan day"]
    if any(k in msg for k in latest_keywords):
        return "find_latest"
        
    # 1. missing_images_ratio
    if any(k in msg for k in ["tỷ lệ", "tỉ lệ", "phần trăm", "phan tram", "%"]) and any(k in msg for k in ["thiếu ảnh", "thieu anh", "thiếu hình", "thieu hinh", "không có ảnh", "khong co anh"]):
        return "missing_images_ratio"
        
    # 2. compare_months
    is_compare_query = (
        any(k in msg for k in ["tháng trước", "thang truoc", "kỳ trước", "ky truoc", "tháng sau", "thang sau", "kỳ sau", "ky sau", "so sánh tháng", "so sanh thang", "so sánh kỳ", "so sanh ky"])
        or (any(k in msg for k in ["so sánh", "so sanh", "đối chiếu", "doi chieu"]) and any(k in msg for k in ["tháng", "thang", "kỳ", "ky"]))
        or (any(k in msg for k in ["tăng", "tang", "giảm", "giam"]) and any(k in msg for k in ["tháng", "thang", "kỳ", "ky"]))
    )
    if is_compare_query:
        return "compare_months"
        
    # 3. show_images
    has_image_keywords = any(k in msg for k in ["ảnh", "anh", "hình", "hinh", "image", "photo", "picture"])
    missing_images_keywords = [
        "thiếu ảnh", "thieu anh",
        "thiếu hình", "thieu hinh",
        "không có ảnh", "khong co anh",
        "không có hình", "khong co hinh",
        "chưa có ảnh", "chua co anh",
        "chưa có hình", "chua co hinh",
        "missing image", "no image", "no picture"
    ]
    if has_image_keywords and not any(k in msg for k in missing_images_keywords):
        return "show_images"
        
    # 4. show_capa
    if any(k in msg for k in ["capa", "khắc phục", "khac phuc"]):
        return "show_capa"
        
    # 5. explain_action
    has_action_keywords = any(k in msg for k in ["action", "penalty", "phạt", "phat", "biện pháp", "bien phap", "xử lý", "xu ly"])
    if has_action_keywords:
        if any(k in msg for k in ["gì", "gi", "thế nào", "the nao", "nào", "nao", "đâu", "dau", "nó", "no", "đó", "do", "này", "nay"]):
            return "explain_action"
            
    # 6. follow_up_detail
    if any(k in msg for k in ["chi tiết", "chi tiet", "danh sách", "danh sach", "liệt kê", "liet ke", "dòng đầu", "dong dau", "dòng đó", "dong do"]):
        return "follow_up_detail"
        
    # 7. find_by_cabinet - enhanced patterns
    if re.search(r'cabinet\s*#?\s*\d+', msg) or re.search(r'(tủ|tu)\s*#?\s*\d+', msg) or re.search(r'#\d+', msg):
        return "find_by_cabinet"
        
    # 8. find_by_sku (ONLY if message contains a specific SKU code pattern)
    sku_pattern = r'\b([a-z0-9]{3,5}-[a-z0-9-]+)\b'
    if re.search(sku_pattern, msg):
        return "find_by_sku"
        
    # 9. find_by_defect - NEW: detect defect code queries
    defect_keywords = ["mã lỗi", "ma loi", "defect", "lỗi", "loi", "dva", "app", "str"]
    has_defect_keyword = any(k in msg for k in defect_keywords)
    # Check if it's asking about specific defect codes (like DVA_17, APP-24, etc.)
    defect_code_pattern = r'\b([a-z]{3}_\d{2}|[a-z]{3}-\d{2})\b'
    if has_defect_keyword and re.search(defect_code_pattern, msg, re.IGNORECASE):
        return "find_by_defect"
        
    # 10. find_by_action
    if any(k in msg for k in ["full bc", "full bộ", "full bo", "phạt full", "phat full", "$50", "50 đô", "50 do", "50$", "repair", "sửa chữa", "sua chua", "x2 unit", "x2"]):
        return "find_by_action"
        
    # 11. find_by_transport
    if any(k in msg for k in ["container", "cont", "lpn"]) or re.search(r'\b([a-z]{4}[0-9]{7})\b', msg) or re.search(r'\b(\d{7,10})\b', msg):
        return "find_by_transport"
        
    # 12. missing_images
    if any(k in msg for k in missing_images_keywords):
        return "missing_images"
        
    # 13. missing_info
    if any(k in msg for k in ["thiếu sku", "thieu sku", "thiếu action", "thieu action", "thiếu mã lỗi", "thieu ma loi"]):
        return "missing_info"
        
    # 14 & 15. count_by_date and count_all - enhanced
    has_date = (
        re.search(r'(tháng|thang)\s*\d+', msg)
        or re.search(r'\bt\d{1,2}\b', msg)
        or re.search(r'\b\d{1,2}[-/]\d{4}\b', msg)
        or re.search(r'\b(202\d)\b', msg)
        or re.search(r'(năm|nam)\s*\d{4}', msg)
    )
    has_count_word = any(k in msg for k in [
        "bao nhiêu", "bao nhieu", "tổng số", "tong so", "tổng cộng", "tong cong", 
        "có mấy", "co may", "đếm", "dem", "số lượng", "so luong",
        "tổng hợp", "tong hop", "tổng quát", "tong quat", "tổng quan", "tong quan", "tổng", "tong"
    ])
    
    # NEW: count_by_month - asking how many months have claims
    if has_count_word and any(k in msg for k in ["tháng", "thang"]) and not re.search(r'(tháng|thang)\s*\d+', msg):
        return "count_by_month"
    
    if has_count_word:
        if has_date:
            return "count_by_date"
        else:
            return "count_all"
    elif has_date:
        return "count_by_date"
        
    # 16. top_defects - enhanced
    has_loi = bool({"lỗi", "loi"} & words)
    has_nhieu_nhat = "nhiều nhất" in msg or "nhieu nhat" in msg or "nhiều" in msg or "nhieu" in msg
    has_thong_ke = "thống kê" in msg or "thong ke" in msg
    has_top = "top" in words
    has_pho_bien = "phổ biến" in msg or "pho bien" in msg
    
    # Yield to top_skus if explicitly asking about a SKU or product
    asking_which_sku = any(k in msg for k in ["sku nào", "sku nao", "mã hàng nào", "ma hang nao", "sản phẩm nào", "san pham nao", "sản phẩm bị khiếu nại nhiều nhất", "sản phẩm bị claim nhiều nhất", "san pham bi claim nhieu nhat"])
    
    if not asking_which_sku and (
        (has_loi and has_nhieu_nhat)
        or (has_thong_ke and has_loi)
        or (has_top and has_loi)
        or (has_loi and has_pho_bien)
        or any(k in msg for k in ["mã lỗi nào", "ma loi nao", "thống kê mã lỗi", "thong ke ma loi"])
    ):
        return "top_defects"
        
    # 17. top_skus - enhanced
    has_sku_word = bool({"sku"} & words) or "mã hàng" in msg or "ma hang" in msg or "sản phẩm" in msg or "san pham" in msg
    has_nao = "nào" in msg or "nao" in msg
    
    if (
        (has_sku_word and has_nhieu_nhat)
        or (has_sku_word and has_nao)
        or (has_top and has_sku_word)
        or any(k in msg for k in ["sản phẩm bị khiếu nại nhiều nhất", "sản phẩm bị claim nhiều nhất", "san pham bi claim nhieu nhat"])
    ):
        return "top_skus"
        
    # NEW: If asking about specific conditions but no clear intent, try to extract filters
    # This helps with natural questions like "claim của tủ 5 tháng 6"
    if any(k in msg for k in ["của", "cua", "cho", "thuộc", "thuoc", "trong", "o"]) and any(k in msg for k in ["tủ", "tu", "cabinet", "sku", "lỗi", "loi", "tháng", "thang"]):
        return "general_query"
        
    return "general_query"
