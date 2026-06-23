# -*- coding: utf-8 -*-
import re
import logging

logger = logging.getLogger("chatbot")

def query_claims(intent: str, filters: dict, all_claims: list) -> list:
    """
    Filters the normalized claim list using the identified intent and filters.
    """
    results = []
    
    for c in all_claims:
        match = True
        
        # Check period filters
        if "period" in filters:
            if c["period"] != filters["period"]:
                match = False
                logger.debug(f"Period mismatch: claim period={c['period']}, filter period={filters['period']}")
        elif "month" in filters or "year" in filters:
            c_period = c["period"] # "MM-YYYY"
            if "-" in c_period:
                m, y = c_period.split("-")
                if "month" in filters and m != filters["month"]:
                    match = False
                if "year" in filters and y != filters["year"]:
                    match = False
                    logger.debug(f"Year mismatch: claim year={y}, filter year={filters['year']}")
            else:
                # If period format is unexpected, log it
                if "year" in filters:
                    logger.warning(f"Unexpected period format: {c_period}, cannot filter by year {filters['year']}")
                    
        # Check cabinet number
        if "cabinet_no" in filters:
            c_cab = c["cabinet_no"]
            c_code = c.get("claim_code") or ""
            cabinet_matched = False
            
            # Check cabinet_no
            if c_cab is not None:
                try:
                    if int(c_cab) == int(filters["cabinet_no"]):
                        cabinet_matched = True
                except (ValueError, TypeError):
                    if str(c_cab).lower() == str(filters["cabinet_no"]).lower():
                        cabinet_matched = True
            
            # Check claim_code contains Cabinet #12
            cab_num = str(filters["cabinet_no"])
            if f"cabinet #{cab_num}" in c_code.lower() or f"cabinet {cab_num}" in c_code.lower():
                cabinet_matched = True
                
            if not cabinet_matched:
                match = False
                    
        # Check SKU
        if "sku" in filters:
            if filters["sku"] not in c["sku"].upper():
                match = False
                
        # Check Defect code
        if "defect_code" in filters:
            if filters["defect_code"] not in c["defect_code"].upper() and filters["defect_code"] not in c["company_error_code"].upper():
                match = False
                
        # Check Action
        if "action" in filters:
            if filters["action"].lower() not in c["action"].lower():
                match = False
                
        # Check Container
        if "container_no" in filters:
            if filters["container_no"] not in c["container_no"].upper():
                match = False
                
        # Check LPN
        if "lpn" in filters:
            if filters["lpn"] not in c["lpn"]:
                match = False
                
        # Check Status
        if "status" in filters:
            if str(c.get("status") or "").lower() != str(filters["status"]).lower():
                match = False
                
        # Check Severity
        if "severity" in filters:
            if str(c.get("severity") or "").lower() != str(filters["severity"]).lower():
                match = False
                
        # Intent-specific filters
        if intent == "find_latest":
            # For find_latest, we don't necessarily filter yet, 
            # we just collect all to sort later, or we can just return all and take top N
            pass
        elif intent == "find_by_defect":
            # Already handled by defect_code filter above
            pass
        elif intent == "missing_images":
            if len(c["image_paths"]) > 0:
                match = False
        elif intent == "missing_info":
            has_missing = not c["sku"] or not c["action"] or not c["defect_code"]
            if not has_missing:
                match = False
                
        # Keyword search for general queries
        if intent == "general_query" and "keyword" in filters:
            kw = filters["keyword"].upper()
            found_kw = (
                kw in c["sku"].upper()
                or kw in c["claim_description"].upper()
                or kw in c["defect_code"].upper()
                or kw in c["company_error_code"].upper()
                or kw in c["container_no"].upper()
                or kw in c["lpn"]
                or kw in c["claim_code"].upper()
            )
            if not found_kw:
                match = False
                
        if match:
            results.append(c)
            
    if intent == "find_latest" and not results:
        # If no filters matched but intent is find_latest, return everything for sorting
        results = all_claims
            
    return results

def calculate_penalty(action: str, product_name: str, cabinet_prices: dict) -> float:
    if not action:
        return 0.0
    action_clean = action.strip()
    sku_norm = product_name.strip().upper() if product_name else ""
    
    if action_clean.startswith("$"):
        try:
            val = float(action_clean.replace("$", "").replace(",", "").strip())
            return val
        except ValueError:
            return 0.0
    elif action_clean == "Full BC":
        return cabinet_prices.get(sku_norm, 0.0) if cabinet_prices else 0.0
    elif action_clean == "X2 Unit":
        return (cabinet_prices.get(sku_norm, 0.0) * 2) if cabinet_prices else 0.0
    return 0.0

def build_answer(intent: str, filters: dict, results: list, all_claims: list, message: str = "", cabinet_prices: dict = None) -> str:
    """
    Generates a natural language response summarizing results.
    """
    total_count = len(results)
    
    if total_count == 0:
        filter_descs = []
        if "period" in filters:
            p = filters["period"].replace("-", "/")
            filter_descs.append(f"tháng {p}")
        elif "month" in filters or "year" in filters:
            m = filters.get("month", "mọi")
            y = filters.get("year", "mọi")
            filter_descs.append(f"tháng {m}/{y}")
            
        if "cabinet_no" in filters:
            filter_descs.append(f"Cabinet #{filters['cabinet_no']}")
        if "sku" in filters:
            filter_descs.append(f"SKU {filters['sku']}")
        if "defect_code" in filters:
            filter_descs.append(f"mã lỗi {filters['defect_code']}")
        if "action" in filters:
            filter_descs.append(f"hình thức phạt {filters['action']}")
        if "container_no" in filters:
            filter_descs.append(f"Container {filters['container_no']}")
        if "lpn" in filters:
            filter_descs.append(f"LPN {filters['lpn']}")
        if "status" in filters:
            filter_descs.append(f"trạng thái {filters['status']}")
            
        if filter_descs:
            desc_str = ", ".join(filter_descs)
            return f"Không tìm thấy khiếu nại nào khớp với bộ lọc: **{desc_str}** (Số lượng: 0)."
        return "Không tìm thấy khiếu nại nào phù hợp trong các lô claim đã import."
        
    msg_lower = message.lower()
    is_asking_for_money = any(k in msg_lower for k in ["phạt", "phat", "tiền", "tien", "đền", "den", "giá", "gia", "bảng giá", "bang gia", "bc", "x2"])
    is_asking_for_details = any(k in msg_lower for k in ["chi tiết", "chi tiet", "danh sách", "danh sach", "liệt kê", "liet ke", "show details", "details", "list", "detail"])

    # If asking for money/penalties, calculate and render a summary table
    if is_asking_for_money:
        breakdown = {}
        total_penalty = 0.0
        for c in results:
            sku = c.get("sku") or "N/A"
            act = c.get("action") or "N/A"
            price = calculate_penalty(act, sku, cabinet_prices)
            key = (sku, act)
            if key not in breakdown:
                breakdown[key] = {"count": 0, "unit_price": price, "total": 0.0}
            breakdown[key]["count"] += 1
            breakdown[key]["total"] += price
            total_penalty += price

        summary = f"**THỐNG KÊ CHI TIẾT TIỀN PHẠT**<br/>"
        if "period" in filters:
            summary += f"Kỳ lọc: Tháng {filters['period'].replace('-', '/')}<br/>"
        summary += f"Tổng số khiếu nại: **{total_count}**<br/>"
        summary += f"Tổng tiền phạt ước tính: **${total_penalty:,.2f}**<br/><br/>"
        
        summary += '<table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; border: 1px solid #dcdcdc; background-color: #ffffff;">'
        summary += '  <thead>'
        summary += '    <tr style="background-color: #6F4E37; color: white;">'
        summary += '      <th style="padding: 8px; text-align: left; border: 1px solid #dcdcdc; font-weight: bold;">Sản phẩm</th>'
        summary += '      <th style="padding: 8px; text-align: left; border: 1px solid #dcdcdc; font-weight: bold;">Hình thức (Đơn giá)</th>'
        summary += '      <th style="padding: 8px; text-align: center; border: 1px solid #dcdcdc; font-weight: bold; width: 45px;">SL</th>'
        summary += '      <th style="padding: 8px; text-align: right; border: 1px solid #dcdcdc; font-weight: bold; width: 85px;">Thành tiền</th>'
        summary += '    </tr>'
        summary += '  </thead>'
        summary += '  <tbody>'
        
        row_idx = 0
        for (sku, act), info in sorted(breakdown.items(), key=lambda x: x[1]["total"], reverse=True):
            bg_color = "#fdfaf6" if row_idx % 2 == 0 else "#ffffff"
            if act in ["Full BC", "X2 Unit"]:
                act_display = f"{act} (${info['unit_price']:,.2f})" if info['unit_price'] > 0 else f"{act} (N/A)"
            else:
                act_display = act
            total_str = f"${info['total']:,.2f}" if info['total'] > 0 else "$0.00"
            
            summary += f'    <tr style="background-color: {bg_color};">'
            summary += f'      <td style="padding: 8px; border: 1px solid #dcdcdc; text-align: left; word-break: break-all;">{sku}</td>'
            summary += f'      <td style="padding: 8px; border: 1px solid #dcdcdc; text-align: left;">{act_display}</td>'
            summary += f'      <td style="padding: 8px; border: 1px solid #dcdcdc; text-align: center;">{info["count"]}</td>'
            summary += f'      <td style="padding: 8px; border: 1px solid #dcdcdc; text-align: right; font-weight: 500;">{total_str}</td>'
            summary += f'    </tr>'
            row_idx += 1
            
        # Total row
        summary += '    <tr style="background-color: #f5ebe0; font-weight: bold; border-top: 2px solid #6F4E37;">'
        summary += '      <td style="padding: 8px; border: 1px solid #dcdcdc; text-align: left;" colspan="2">TỔNG CỘNG</td>'
        summary += f'      <td style="padding: 8px; border: 1px solid #dcdcdc; text-align: center;">{total_count}</td>'
        summary += f'      <td style="padding: 8px; border: 1px solid #dcdcdc; text-align: right; color: #6F4E37;">${total_penalty:,.2f}</td>'
        summary += '    </tr>'
        summary += '  </tbody>'
        summary += '</table>'
        return summary

    # General "tổng hợp" without money (e.g. status/severity summary)
    if "tổng hợp" in msg_lower or "tong hop" in msg_lower or "tổng quát" in msg_lower or "tong quat" in msg_lower:
        status_counts = {}
        severity_counts = {}
        for c in results:
            st = c.get("status") or "Mới"
            sv = c.get("severity") or "Medium"
            status_counts[st] = status_counts.get(st, 0) + 1
            severity_counts[sv] = severity_counts.get(sv, 0) + 1
        
        status_str = ", ".join(f"{k}: {v}" for k, v in status_counts.items())
        severity_str = ", ".join(f"{k}: {v}" for k, v in severity_counts.items())
        
        summary = f"**THÔNG TIN TỔNG HỢP KHIẾU NẠI**\n"
        if "period" in filters:
            summary += f"Kỳ lọc: Tháng {filters['period'].replace('-', '/')}\n"
        summary += f"Tổng số khiếu nại: **{total_count}**\n"
        summary += f"Trạng thái: {status_str}\n"
        summary += f"Mức độ nghiêm trọng: {severity_str}\n"
        return summary

    # Detail lists when NOT asking for money
    if is_asking_for_details or intent == "follow_up_detail":
        summary = f"Dưới đây là danh sách **{min(total_count, 15)}/{total_count}** khiếu nại đang thảo luận:\n\n"
        summary += "| Mã khiếu nại | SKU sản phẩm | Lỗi | Pallet (LPN) | Trạng thái |\n"
        summary += "| :--- | :--- | :--- | :--- | :--- |\n"
        for c in results[:15]:
            summary += f"| {c.get('claim_code') or 'N/A'} | {c.get('sku') or 'N/A'} | {c.get('defect_code') or 'N/A'} | {c.get('lpn') or 'N/A'} | {c.get('status') or 'N/A'} |\n"
        if total_count > 15:
            summary += f"\n*Và {total_count - 15} khiếu nại khác...*"
        return summary

    if intent == "find_latest":
        limit = filters.get("limit", 5)
        latest = results[:limit]
        summary = f"Dưới đây là **{len(latest)}** khiếu nại mới nhất mà tôi tìm thấy:\n"
        for idx, c in enumerate(latest):
            summary += f"{idx+1}. Tủ #{c['cabinet_no']} - SKU: {c['sku']} ({c['period']})\n"
        summary += "\nNhắn **\"Xem chi tiết\"** để xem thông tin đầy đủ."
        return summary

    if intent == "count_all":
        return f"Hệ thống hiện có tổng cộng **{total_count}** claim trên toàn bộ dữ liệu."
        
    elif intent == "count_by_month":
        unique_periods = set(c.get("period") for c in results if c.get("period"))
        month_count = len(unique_periods)
        return f"Hệ thống hiện có claim trong **{month_count} tháng** khác nhau trên toàn bộ dữ liệu."
        
    elif intent == "count_by_date":
        if "period" in filters:
            p = filters["period"].replace("-", "/")
            return f"Tìm thấy {total_count} claim trong tháng {p} trên toàn bộ dữ liệu."
        elif "month" in filters:
            m = filters["month"]
            if "year" in filters:
                return f"Tìm thấy {total_count} claim trong tháng {m}/{filters['year']} trên toàn bộ dữ liệu."
            else:
                return f"Tìm thấy {total_count} claim trong tháng {m} trên toàn bộ dữ liệu."
        elif "year" in filters:
            return f"Tìm thấy {total_count} claim trong năm {filters['year']} trên toàn bộ dữ liệu."
        else:
            return f"Tìm thấy {total_count} claim trên toàn bộ dữ liệu."
            
    elif intent == "find_by_cabinet":
        cab = filters.get("cabinet_no")
        raw_defects = set()
        for c in results:
            if c.get("defect_code"):
                for p in re.split(r'[;,/]', str(c["defect_code"])):
                    clean_p = p.strip().upper()
                    if clean_p:
                        raw_defects.add(clean_p)
        
        raw_actions = set()
        for c in results:
            if c.get("action"):
                for p in re.split(r'[;,]', str(c["action"])):
                    clean_p = p.strip()
                    if clean_p:
                        raw_actions.add(clean_p)
        
        summary = f"Tìm thấy **{total_count}** claim cho Cabinet #{cab}."
        if raw_defects:
            summary += f" Có **{len(raw_defects)}** mã lỗi khác nhau."
        if raw_actions:
            summary += f" Actions: {', '.join(sorted(raw_actions))}."
        summary += "\nNhắn **\"Xem chi tiết\"** để xem danh sách chi tiết."
        return summary
        
    elif intent == "find_by_sku":
        sku = filters.get("sku")
        return f"Tìm thấy **{total_count}** khiếu nại đối với SKU **{sku}**."
        
    elif intent == "find_by_defect":
        df_code = filters.get("defect_code")
        return f"Ghi nhận **{total_count}** khiếu nại có mã lỗi **{df_code}**."
        
    elif intent == "find_by_action":
        act = filters.get("action")
        return f"Có **{total_count}** khiếu nại bị áp dụng biện pháp **{act}**."
        
    elif intent == "missing_images":
        return f"Hệ thống phát hiện **{total_count}** claim hiện đang **thiếu hình ảnh minh chứng**."
        
    elif intent == "missing_info":
        return f"Phát hiện **{total_count}** claim đang bị **thiếu các thông tin chính** (như mã SKU, Action, hoặc mã lỗi)."
        
    elif intent == "top_defects":
        defect_counts = {}
        for c in results:
            code = c["defect_code"] or "CHƯA XÁC ĐỊNH"
            g7_code = c["company_error_code"]
            key = f"{code} (Mã G7: {g7_code})" if g7_code else code
            defect_counts[key] = defect_counts.get(key, 0) + 1
            
        sorted_defects = sorted(defect_counts.items(), key=lambda x: x[1], reverse=True)
        if not sorted_defects:
            return "Không có dữ liệu lỗi để thống kê."
        
        top_list = [f"{idx+1}. **{k}**: {v} lần" for idx, (k, v) in enumerate(sorted_defects[:5])]
        top_str = "\n".join(top_list)
        period_str = f" trong kỳ {filters.get('period')}" if "period" in filters else ""
        return f"Thống kê các mã lỗi xuất hiện nhiều nhất{period_str}:\n{top_str}"
        
    elif intent == "top_skus":
        sku_counts = {}
        for c in results:
            sku = c["sku"] or "CHƯA XÁC ĐỊNH"
            sku_counts[sku] = sku_counts.get(sku, 0) + 1
            
        sorted_skus = sorted(sku_counts.items(), key=lambda x: x[1], reverse=True)
        if not sorted_skus:
            return "Không có dữ liệu SKU để thống kê."
            
        top_list = [f"{idx+1}. **{k}**: {v} lần" for idx, (k, v) in enumerate(sorted_skus[:5])]
        top_str = "\n".join(top_list)
        period_str = f" trong kỳ {filters.get('period')}" if "period" in filters else ""
        return f"Thống kê các sản phẩm (SKU) bị khiếu nại nhiều nhất{period_str}:\n{top_str}"
        
    elif intent == "find_by_transport":
        cont = filters.get("container_no")
        lpn = filters.get("lpn")
        if cont:
            target = f"Container {cont}"
        elif lpn:
            target = f"LPN {lpn}"
        else:
            msg_lower = message.lower()
            if "container" in msg_lower or "cont" in msg_lower:
                target = "Container"
            elif "lpn" in msg_lower:
                target = "LPN"
            else:
                target = "vận chuyển"
        return f"Tìm thấy **{total_count}** khiếu nại thuộc **{target}**."
        
    else:
        return f"Tìm thấy **{total_count}** khiếu nại khớp với từ khóa tìm kiếm."
