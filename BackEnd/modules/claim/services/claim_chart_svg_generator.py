# -*- coding: utf-8 -*-
"""
Module sinh biểu đồ Vector SVG siêu nét chuẩn VINA G7
Tự động tính toán toạ độ hình học và nội suy số liệu động theo từng kỳ báo cáo khiếu nại.
Hoàn toàn độc lập, không phụ thuộc thư viện đồ họa ngoài, render tức thì 0ms.
"""

import math
from typing import List, Dict, Any, Optional

class ClaimChartSvgGenerator:

    @staticmethod
    def generate_pareto_svg(pareto_list: List[Dict[str, Any]], period_label: str, total_claims: int) -> str:
        """
        Sinh biểu đồ Pareto 80/20 dạng Vector SVG chuẩn VINA G7:
        - Cột số ca (trục tung trái, scale động)
        - Đường lũy kế % (trục tung phải 0 - 100%)
        - Ngưỡng Pareto 80% nét đứt
        - Nhãn tên lỗi xoay nghiêng -35 độ
        """
        w, h = 800, 310
        margin_left = 65
        margin_right = 65
        margin_top = 45
        margin_bottom = 85
        
        chart_w = w - margin_left - margin_right
        chart_h = h - margin_top - margin_bottom
        
        # Lấy tối đa 14 hạng mục để hiển thị đẹp
        items = pareto_list[:14] if pareto_list else [{"name": "Khác", "count": total_claims or 1, "cumPercentage": 100.0}]
        n = len(items)
        
        # 1. Xác định trục tung trái (Số ca phát sinh) chuẩn xác, chia vạch nguyên
        max_count = max([it.get("count", 0) for it in items] + [7])
        if max_count <= 8:
            y_max = 8
            left_ticks = [0, 1, 2, 3, 4, 5, 6, 7, 8]
        elif max_count <= 16:
            y_max = 20
            left_ticks = [0, 5, 10, 15, 20]
        elif max_count <= 25:
            y_max = 25
            left_ticks = [0, 5, 10, 15, 20, 25]
        else:
            y_max = math.ceil(max_count / 10) * 10
            step = max(1, y_max // 5)
            left_ticks = list(range(0, y_max + 1, step))
            
        slot_w = chart_w / n
        bar_w = min(slot_w * 0.65, 36)
        
        # Grid lines (trục tung trái số ca)
        grid_lines = []
        for val in left_ticks:
            y_pos = margin_top + chart_h - (val / y_max) * chart_h
            is_zero = (val == 0)
            stroke_style = 'stroke="#CBD5E1" stroke-width="1"' if is_zero else 'stroke="#F1F5F9" stroke-width="1" stroke-dasharray="3,3"'
            grid_lines.append(f"""
                <line x1="{margin_left}" y1="{y_pos:.1f}" x2="{w - margin_right}" y2="{y_pos:.1f}" {stroke_style} />
                <text x="{margin_left - 8}" y="{y_pos + 3.5:.1f}" font-size="9.5" font-weight="600" fill="#64748B" text-anchor="end">{val}</text>
            """)

        # Trục tung bên phải (Tỷ trọng tích lũy % chuẩn 0, 20, 40, 60, 80, 100)
        right_pct_ticks = [0, 20, 40, 60, 80, 100]
        for pct_val in right_pct_ticks:
            y_pos = margin_top + chart_h - (pct_val / 100.0) * chart_h
            grid_lines.append(f"""
                <text x="{w - margin_right + 8}" y="{y_pos + 3.5:.1f}" font-size="9.5" font-weight="600" fill="#64748B" text-anchor="start">{pct_val}%</text>
            """)
            
        # Ngưỡng 80% Pareto nét đứt màu cam chuẩn file gốc
        y_80 = margin_top + chart_h - (0.80 * chart_h)
        pareto_threshold = f"""
            <line x1="{margin_left}" y1="{y_80:.1f}" x2="{w - margin_right}" y2="{y_80:.1f}" stroke="#D97706" stroke-width="1.5" stroke-dasharray="4,4" />
            <text x="{w - margin_right - 10}" y="{y_80 - 5:.1f}" font-size="9" font-weight="700" fill="#D97706" text-anchor="end">Ngưỡng Pareto 80%</text>
        """
        
        # Vẽ cột và tính toạ độ đường line
        bars = []
        line_points = []
        
        for idx, it in enumerate(items):
            count = it.get("count", 0)
            cum_pct = min(it.get("cumPercentage", 0), 100.0)
            
            x_center = margin_left + (idx + 0.5) * slot_w
            x_bar = x_center - bar_w / 2
            
            bar_height = (count / y_max) * chart_h
            y_bar = margin_top + chart_h - bar_height
            
            # Màu cột: Top 2 đỏ tươi/hồng đỏ, kế tiếp cam đất, còn lại xanh ngọc
            if idx == 0:
                col = "#E11D48"
            elif idx == 1:
                col = "#F43F5E"
            elif idx in [2, 3, 4]:
                col = "#D97706"
            else:
                col = "#0D9488"
                
            bars.append(f"""
                <rect x="{x_bar:.1f}" y="{y_bar:.1f}" width="{bar_w:.1f}" height="{bar_height:.1f}" fill="{col}" rx="2" />
                <text x="{x_center:.1f}" y="{y_bar - 4:.1f}" font-size="10" font-weight="800" fill="{col}" text-anchor="middle">{count}</text>
            """)
            
            # Tên nhãn xoay nghiêng -38 độ
            raw_name = it.get("name", "")
            short_name = (raw_name[:18] + '..') if len(raw_name) > 20 else raw_name
            y_label = margin_top + chart_h + 12
            bars.append(f"""
                <text x="{x_center:.1f}" y="{y_label:.1f}" font-size="9" font-weight="600" fill="#334155" text-anchor="end" transform="rotate(-38 {x_center:.1f} {y_label:.1f})">{short_name}</text>
            """)
            
            # Toạ độ đường tích lũy % (đo theo trục tung bên phải 0 - 100%)
            y_pct = margin_top + chart_h - (cum_pct / 100.0) * chart_h
            line_points.append((x_center, y_pct, cum_pct))
            
        # Vẽ đường nối line và marker hình vuông chuẩn file gốc
        path_d = ""
        dots = []
        for i, (lx, ly, lpct) in enumerate(line_points):
            cmd = "M" if i == 0 else "L"
            path_d += f" {cmd} {lx:.1f} {ly:.1f}"
            dots.append(f"""
                <rect x="{lx - 3:.1f}" y="{ly - 3:.1f}" width="6" height="6" fill="#A91D22" stroke="#FFFFFF" stroke-width="1" />
            """)
                
        line_svg = f'<path d="{path_d}" fill="none" stroke="#A91D22" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />' + "".join(dots)
        
        # Tiêu đề biểu đồ và nhãn trục
        title = f"BIỂU ĐỒ PARETO 80/20 CÁC DẠNG LỖI KHIẾU NẠI {period_label.upper()}"
        
        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" style="width: 100%; height: auto; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <!-- Background nền nhẹ -->
            <rect width="{w}" height="{h}" fill="#FFFFFF" rx="4" />
            <rect x="0.5" y="0.5" width="{w-1}" height="{h-1}" fill="none" stroke="#E2E8F0" rx="4" />
            
            <!-- Tiêu đề -->
            <text x="{w/2}" y="24" font-size="11.5" font-weight="800" fill="#0E2C58" text-anchor="middle" letter-spacing="0.3">{title}</text>
            
            <!-- Trục toạ độ & Grid -->
            {''.join(grid_lines)}
            {pareto_threshold}
            
            <!-- Nhãn trục tung -->
            <text x="16" y="{margin_top + chart_h/2}" font-size="9" font-weight="700" fill="#64748B" text-anchor="middle" transform="rotate(-90 16 {margin_top + chart_h/2})">Số ca phát sinh</text>
            <text x="{w - 14}" y="{margin_top + chart_h/2}" font-size="9" font-weight="700" fill="#64748B" text-anchor="middle" transform="rotate(90 {w - 14} {margin_top + chart_h/2})">Tỷ trọng tích lũy (%)</text>
            
            <!-- Cột và Line -->
            {''.join(bars)}
            {line_svg}
        </svg>"""
        return svg

    @staticmethod
    def generate_donut_color_svg(colors_data: List[Dict[str, Any]], period_label: str, total_claims: int) -> str:
        """
        Sinh biểu đồ Donut cơ cấu màu sắc Vector SVG:
        - Bánh Donut vành khăn
        - Bảng chú giải Legend gọn gàng bên phải
        """
        w, h = 380, 205
        cx, cy = 110, 115
        r_outer = 66
        r_inner = 38
        
        items = colors_data if colors_data else [{"name": "Khác", "count": total_claims or 1, "pct": 100.0, "color": "#94A3B8"}]
        
        paths = []
        current_angle = -90.0  # Bắt đầu từ 12h
        
        for it in items:
            pct = it.get("pct", 0)
            if pct <= 0:
                continue
            angle_span = (pct / 100.0) * 360.0
            end_angle = current_angle + angle_span
            
            # Tính toạ độ
            start_rad = math.radians(current_angle)
            end_rad = math.radians(end_angle - 0.2)  # Trừ 0.2 độ tạo rãnh mảnh giữa các lát
            
            x1_out = cx + r_outer * math.cos(start_rad)
            y1_out = cy + r_outer * math.sin(start_rad)
            x2_out = cx + r_outer * math.cos(end_rad)
            y2_out = cy + r_outer * math.sin(end_rad)
            
            x1_in = cx + r_inner * math.cos(end_rad)
            y1_in = cy + r_inner * math.sin(end_rad)
            x2_in = cx + r_inner * math.cos(start_rad)
            y2_in = cy + r_inner * math.sin(start_rad)
            
            large_arc = 1 if angle_span > 180 else 0
            
            path_d = (
                f"M {x1_out:.2f} {y1_out:.2f} "
                f"A {r_outer} {r_outer} 0 {large_arc} 1 {x2_out:.2f} {y2_out:.2f} "
                f"L {x1_in:.2f} {y1_in:.2f} "
                f"A {r_inner} {r_inner} 0 {large_arc} 0 {x2_in:.2f} {y2_in:.2f} Z"
            )
            
            paths.append(f'<path d="{path_d}" fill="{it.get("color", "#94A3B8")}" />')
            current_angle = end_angle
            
        # Vẽ tâm tròn rỗng với tổng số ca
        center_circle = f"""
            <circle cx="{cx}" cy="{cy}" r="{r_inner-1}" fill="#FFFFFF" />
            <text x="{cx}" y="{cy - 2}" font-size="8.5" font-weight="700" fill="#64748B" text-anchor="middle">Tổng</text>
            <text x="{cx}" y="{cy + 13}" font-size="13" font-weight="800" fill="#0E2C58" text-anchor="middle">{total_claims}</text>
        """
        
        # Legend bên phải
        legend_items = []
        leg_x = 215
        leg_y_start = 48
        slot_h = 19
        for i, it in enumerate(items[:7]):
            ly = leg_y_start + i * slot_h
            col = it.get("color", "#94A3B8")
            nm = it.get("name", "")
            cnt = it.get("count", 0)
            pct = it.get("pct", 0)
            legend_items.append(f"""
                <rect x="{leg_x}" y="{ly}" width="10" height="10" fill="{col}" rx="2" />
                <text x="{leg_x + 15}" y="{ly + 9}" font-size="8" font-weight="600" fill="#334155">{nm}</text>
                <text x="{w - 14}" y="{ly + 9}" font-size="8" font-weight="700" fill="#0F172A" text-anchor="end">{cnt} ({pct:.1f}%)</text>
            """)
            
        title = f"CƠ CẤU THEO DÒNG MÀU SẮC {period_label.upper()}"
        
        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" style="width: 100%; height: auto; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <rect width="{w}" height="{h}" fill="#FFFFFF" rx="4" />
            <rect x="0.5" y="0.5" width="{w-1}" height="{h-1}" fill="none" stroke="#E2E8F0" rx="4" />
            
            <text x="{w/2}" y="22" font-size="10.5" font-weight="800" fill="#0E2C58" text-anchor="middle">{title}</text>
            
            <g>{''.join(paths)}</g>
            {center_circle}
            <g>{''.join(legend_items)}</g>
        </svg>"""
        return svg

    @staticmethod
    def generate_penalty_bar_svg(penalties: Dict[str, int], period_label: str, total_claims: int) -> str:
        """
        Sinh biểu đồ cột 3 phương án bồi thường chi phí:
        - Pay Full BC
        - Pay $50
        - Pay x2 Unit
        """
        w, h = 380, 205
        chart_top = 46
        chart_h = 100
        chart_bottom = chart_top + chart_h
        
        base_tot = max(total_claims, sum(penalties.values()) or 1)
        
        categories = [
            {"key": "Pay Full BC", "name": "Pay Full BC", "sub": "(Đền 100% thân tủ)", "color": "#E11D48"},
            {"key": "Pay $50", "name": "Pay $50", "sub": "(Hỗ trợ $50 sửa chữa)", "color": "#0D9488"},
            {"key": "Pay x2 Unit", "name": "Pay x2 Unit", "sub": "(Chế tài phạt gấp đôi)", "color": "#DC2626"}
        ]
        
        max_val = max([penalties.get(c["key"], 0) for c in categories] + [5])
        y_max = math.ceil(max_val * 1.2)
        
        bars = []
        bar_w = 48
        xs = [75, 190, 305]
        
        # Grid ngang
        grids = []
        for i in range(4):
            val = (y_max / 3) * i
            y_pos = chart_bottom - (i / 3) * chart_h
            grids.append(f"""
                <line x1="35" y1="{y_pos:.1f}" x2="355" y2="{y_pos:.1f}" stroke="#F1F5F9" stroke-width="1" />
                <text x="28" y="{y_pos + 3:.1f}" font-size="8.5" font-weight="600" fill="#94A3B8" text-anchor="end">{int(val)}</text>
            """)
            
        for i, c in enumerate(categories):
            cnt = penalties.get(c["key"], 0)
            pct = round((cnt / base_tot) * 100, 1) if base_tot > 0 else 0
            bh = (cnt / y_max) * chart_h
            bx = xs[i] - bar_w / 2
            by = chart_bottom - bh
            
            bars.append(f"""
                <rect x="{bx:.1f}" y="{by:.1f}" width="{bar_w}" height="{bh:.1f}" fill="{c['color']}" rx="3" />
                <text x="{xs[i]}" y="{by - 14}" font-size="10.5" font-weight="800" fill="{c['color']}" text-anchor="middle">{cnt} ca</text>
                <text x="{xs[i]}" y="{by - 3}" font-size="8.5" font-weight="700" fill="#64748B" text-anchor="middle">({pct}%)</text>
                
                <text x="{xs[i]}" y="{chart_bottom + 16}" font-size="9" font-weight="700" fill="#0F172A" text-anchor="middle">{c['name']}</text>
                <text x="{xs[i]}" y="{chart_bottom + 28}" font-size="7.5" font-weight="500" fill="#64748B" text-anchor="middle">{c['sub']}</text>
            """)
            
        title = f"PHƯƠNG ÁN XỬ LÝ ĐỀN BÙ CHI PHÍ {period_label.upper()}"
        
        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" style="width: 100%; height: auto; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <rect width="{w}" height="{h}" fill="#FFFFFF" rx="4" />
            <rect x="0.5" y="0.5" width="{w-1}" height="{h-1}" fill="none" stroke="#E2E8F0" rx="4" />
            
            <text x="{w/2}" y="22" font-size="10.5" font-weight="800" fill="#0E2C58" text-anchor="middle">{title}</text>
            
            <g>{''.join(grids)}</g>
            <g>{''.join(bars)}</g>
        </svg>"""
        return svg

    @staticmethod
    def generate_aging_delay_svg(container_delays: List[Dict[str, Any]], period_label: str, total_claims: int) -> str:
        """
        Sinh biểu đồ thanh ngang độ trễ container (Aging Delay):
        - 5 cấp độ trễ từ gần nhất đến tồn kho cũ > 2 năm
        - Nhãn và số liệu sắc nét
        """
        w, h = 800, 240
        margin_left = 260
        margin_right = 160
        margin_top = 45
        chart_w = w - margin_left - margin_right
        
        items = container_delays if container_delays else [
            {"label": "Xuất gần đây (< 3 tháng)", "count": total_claims, "delay": "Bình thường", "color": "#0D9488", "pct": 100.0}
        ]
        
        max_cnt = max([it.get("count", 0) for it in items] + [5])
        x_max = math.ceil(max_cnt * 1.2)
        
        bars = []
        slot_h = 34
        bar_h = 18
        
        for i, it in enumerate(items):
            cnt = it.get("count", 0)
            pct = it.get("pct", 0)
            del_str = it.get("delay", "")
            lbl = it.get("label", "")
            col = it.get("color", "#2563EB")
            
            bw = (cnt / x_max) * chart_w
            y_pos = margin_top + i * slot_h
            
            bars.append(f"""
                <!-- Label bên trái -->
                <text x="{margin_left - 12}" y="{y_pos + bar_h - 4}" font-size="9" font-weight="600" fill="#1E293B" text-anchor="end">{lbl}</text>
                
                <!-- Thanh ngang -->
                <rect x="{margin_left}" y="{y_pos}" width="{bw:.1f}" height="{bar_h}" fill="{col}" rx="2" />
                
                <!-- Nhãn số ca & độ trễ bên phải -->
                <text x="{margin_left + bw + 8:.1f}" y="{y_pos + bar_h - 4}" font-size="9.5" font-weight="700" fill="{col}">
                    {cnt} ca <tspan font-weight="500" fill="#64748B">| {del_str} ({pct:.1f}%)</tspan>
                </text>
            """)
            
        title = f"PHÂN TÍCH ĐỘ TRỄ CHUỖI CUNG ỨNG & THỜI ĐIỂM XUẤT CONTAINER ({period_label.upper()})"
        
        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" style="width: 100%; height: auto; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <rect width="{w}" height="{h}" fill="#FFFFFF" rx="4" />
            <rect x="0.5" y="0.5" width="{w-1}" height="{h-1}" fill="none" stroke="#E2E8F0" rx="4" />
            
            <text x="{w/2}" y="24" font-size="11.5" font-weight="800" fill="#0E2C58" text-anchor="middle">{title}</text>
            
            <!-- Trục chuẩn x=0 -->
            <line x1="{margin_left}" y1="{margin_top - 5}" x2="{margin_left}" y2="{margin_top + len(items)*slot_h - 5}" stroke="#94A3B8" stroke-width="1.5" />
            
            <g>{''.join(bars)}</g>
        </svg>"""
        return svg

    @staticmethod
    def generate_monthly_trend_svg(monthly_trend: List[Dict[str, Any]], selected_month_num: int) -> str:
        """
        Sinh biểu đồ diễn biến 10 tháng năm 2026:
        - Cột số ca khiếu nại (Highlight cột tháng được chọn)
        - Đường line đỏ chi phí phạt cấn trừ
        """
        w, h = 800, 255
        margin_left = 65
        margin_right = 75
        margin_top = 45
        margin_bottom = 35
        
        chart_w = w - margin_left - margin_right
        chart_h = h - margin_top - margin_bottom
        
        items = monthly_trend
        n = len(items)
        slot_w = chart_w / n
        bar_w = 34
        
        max_claims = max([it.get("claims", 0) for it in items] + [70])
        max_penalty = max([it.get("penalty", 0) for it in items] + [22000])
        
        y_max_c = math.ceil(max_claims * 1.15)
        y_max_p = math.ceil(max_penalty * 1.15)
        
        # Grid
        grids = []
        for i in range(5):
            y_pos = margin_top + chart_h - (i / 4) * chart_h
            val_c = (y_max_c / 4) * i
            val_p = (y_max_p / 4) * i
            grids.append(f"""
                <line x1="{margin_left}" y1="{y_pos:.1f}" x2="{w - margin_right}" y2="{y_pos:.1f}" stroke="#F1F5F9" stroke-width="1" />
                <text x="{margin_left - 8}" y="{y_pos + 4:.1f}" font-size="9" font-weight="600" fill="#64748B" text-anchor="end">{int(val_c)}</text>
                <text x="{w - margin_right + 8}" y="{y_pos + 4:.1f}" font-size="8.5" font-weight="600" fill="#DC2626" text-anchor="start">${int(val_p):,}</text>
            """)
            
        bars = []
        line_pts = []
        
        for idx, it in enumerate(items):
            m_num = idx + 1
            claims = it.get("claims", 0)
            penalty = it.get("penalty", 0)
            
            xc = margin_left + (idx + 0.5) * slot_w
            bx = xc - bar_w / 2
            
            bh = (claims / y_max_c) * chart_h
            by = margin_top + chart_h - bh
            
            is_active = (m_num == selected_month_num)
            col_bar = "#0D9488" if is_active else "#3B82F6"
            stroke_bar = 'stroke="#047857" stroke-width="2"' if is_active else ''
            
            bars.append(f"""
                <rect x="{bx:.1f}" y="{by:.1f}" width="{bar_w}" height="{bh:.1f}" fill="{col_bar}" rx="3" {stroke_bar} />
                <text x="{xc:.1f}" y="{by - 4}" font-size="9.5" font-weight="800" fill="{col_bar}" text-anchor="middle">{claims}</text>
                <text x="{xc:.1f}" y="{margin_top + chart_h + 16}" font-size="9.5" font-weight="{ '800' if is_active else '600' }" fill="{ '#047857' if is_active else '#334155' }" text-anchor="middle">T{m_num}</text>
            """)
            
            # Line penalty
            py = margin_top + chart_h - (penalty / y_max_p) * chart_h
            line_pts.append((xc, py, penalty))
            
        # Đường line đỏ
        path_p = ""
        penalty_dots = []
        for i, (lx, ly, pval) in enumerate(line_pts):
            cmd = "M" if i == 0 else "L"
            path_p += f" {cmd} {lx:.1f} {ly:.1f}"
            if pval > 0:
                penalty_dots.append(f"""
                    <circle cx="{lx:.1f}" cy="{ly:.1f}" r="4" fill="#DC2626" stroke="#FFFFFF" stroke-width="1.5" />
                    <rect x="{lx - 26:.1f}" y="{ly - 17:.1f}" width="52" height="13" fill="#FEE2E2" stroke="#DC2626" stroke-width="0.8" rx="2" />
                    <text x="{lx:.1f}" y="{ly - 7:.1f}" font-size="7.5" font-weight="800" fill="#991B1B" text-anchor="middle">${pval:,}</text>
                """)
                
        line_svg = f'<path d="{path_p}" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />' + "".join(penalty_dots)
        
        title = "DIỄN BIẾN KHIẾU NẠI & CHI PHÍ CẤN TRỪ 10 THÁNG NĂM 2026 (VINA G7)"
        
        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" style="width: 100%; height: auto; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <rect width="{w}" height="{h}" fill="#FFFFFF" rx="4" />
            <rect x="0.5" y="0.5" width="{w-1}" height="{h-1}" fill="none" stroke="#E2E8F0" rx="4" />
            
            <text x="{w/2}" y="24" font-size="11.5" font-weight="800" fill="#0E2C58" text-anchor="middle">{title}</text>
            
            <text x="18" y="{margin_top + chart_h/2}" font-size="8.5" font-weight="700" fill="#64748B" text-anchor="middle" transform="rotate(-90 18 {margin_top + chart_h/2})">Số ca khiếu nại (Ca)</text>
            <text x="{w - 14}" y="{margin_top + chart_h/2}" font-size="8.5" font-weight="700" fill="#DC2626" text-anchor="middle" transform="rotate(90 {w - 14} {margin_top + chart_h/2})">Chi phí cấn trừ ($ USD)</text>
            
            <g>{''.join(grids)}</g>
            <g>{''.join(bars)}</g>
            {line_svg}
        </svg>"""
        return svg

    @staticmethod
    def generate_bell_curve_svg(bell_curve: List[Dict[str, Any]], selected_quarter: str) -> str:
        """
        Sinh biểu đồ chu kỳ 8 quý hình chuông (Bell Curve):
        - Mô hình đường cong phân phối chuẩn
        - Vùng diện tích gradient
        - Highlight mốc quý đang xem
        """
        w, h = 800, 240
        margin_left = 65
        margin_right = 65
        margin_top = 45
        margin_bottom = 35
        
        chart_w = w - margin_left - margin_right
        chart_h = h - margin_top - margin_bottom
        
        items = bell_curve
        n = len(items)
        slot_w = chart_w / (n - 1) if n > 1 else chart_w
        
        max_c = max([it.get("claims", 0) for it in items] + [180])
        y_max = math.ceil(max_c * 1.15)
        
        # Grid
        grids = []
        for i in range(5):
            y_pos = margin_top + chart_h - (i / 4) * chart_h
            val = (y_max / 4) * i
            grids.append(f"""
                <line x1="{margin_left}" y1="{y_pos:.1f}" x2="{w - margin_right}" y2="{y_pos:.1f}" stroke="#F1F5F9" stroke-width="1" />
                <text x="{margin_left - 8}" y="{y_pos + 4:.1f}" font-size="9" font-weight="600" fill="#64748B" text-anchor="end">{int(val)}</text>
            """)
            
        pts = []
        for i, it in enumerate(items):
            xc = margin_left + i * slot_w
            claims = it.get("claims", 0)
            yc = margin_top + chart_h - (claims / y_max) * chart_h
            pts.append((xc, yc, claims, it.get("quarter", ""), it.get("note", "")))
            
        # Vẽ diện tích gradient dưới đường cong
        path_line = ""
        for i, (xc, yc, _, _, _) in enumerate(pts):
            cmd = "M" if i == 0 else "L"
            path_line += f" {cmd} {xc:.1f} {yc:.1f}"
            
        path_area = f"{path_line} L {pts[-1][0]:.1f} {margin_top + chart_h} L {pts[0][0]:.1f} {margin_top + chart_h} Z"
        
        markers = []
        for xc, yc, claims, q_str, note in pts:
            is_active = (selected_quarter in q_str)
            is_peak = ("ĐỈNH" in note or claims >= 160)
            
            # Điểm tròn
            r = 5 if is_active or is_peak else 3.5
            fill_c = "#DC2626" if is_peak else ("#0D9488" if is_active else "#2563EB")
            
            markers.append(f"""
                <circle cx="{xc:.1f}" cy="{yc:.1f}" r="{r}" fill="{fill_c}" stroke="#FFFFFF" stroke-width="2" />
                <text x="{xc:.1f}" y="{yc - 8}" font-size="9" font-weight="800" fill="{fill_c}" text-anchor="middle">{claims} ca</text>
                <text x="{xc:.1f}" y="{margin_top + chart_h + 16}" font-size="8.5" font-weight="{ '800' if is_active else '600' }" fill="{ '#047857' if is_active else '#475569' }" text-anchor="middle">{q_str}</text>
            """)
            
            # Note mốc đỉnh lỗi
            if is_peak:
                markers.append(f"""
                    <rect x="{xc - 60:.1f}" y="{yc - 35:.1f}" width="120" height="18" fill="#FEE2E2" stroke="#DC2626" stroke-width="1" rx="3" />
                    <text x="{xc:.1f}" y="{yc - 23:.1f}" font-size="7.5" font-weight="800" fill="#991B1B" text-anchor="middle">[!] ĐỈNH LỖI LỊCH SỬ</text>
                """)
            elif "VÙNG ĐÁY" in note or (is_active and "Q4" in q_str):
                markers.append(f"""
                    <rect x="{xc - 60:.1f}" y="{yc - 35:.1f}" width="120" height="18" fill="#DCFCE7" stroke="#16A34A" stroke-width="1" rx="3" />
                    <text x="{xc:.1f}" y="{yc - 23:.1f}" font-size="7.5" font-weight="800" fill="#15803D" text-anchor="middle">[✓] VÙNG ĐÁY KIỂM SOÁT</text>
                """)
                
        title = "CHU KỲ KHIẾU NẠI LIÊN TỤC 8 QUÝ (2025 - 2026) - MÔ HÌNH HÌNH CHUÔNG (BELL CURVE)"
        
        svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" style="width: 100%; height: auto; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <defs>
                <linearGradient id="bellGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#3B82F6" stop-opacity="0.35" />
                    <stop offset="100%" stop-color="#3B82F6" stop-opacity="0.02" />
                </linearGradient>
            </defs>
            <rect width="{w}" height="{h}" fill="#FFFFFF" rx="4" />
            <rect x="0.5" y="0.5" width="{w-1}" height="{h-1}" fill="none" stroke="#E2E8F0" rx="4" />
            
            <text x="{w/2}" y="24" font-size="11.5" font-weight="800" fill="#0E2C58" text-anchor="middle">{title}</text>
            <text x="18" y="{margin_top + chart_h/2}" font-size="8.5" font-weight="700" fill="#64748B" text-anchor="middle" transform="rotate(-90 18 {margin_top + chart_h/2})">Số ca khiếu nại (Ca)</text>
            
            <g>{''.join(grids)}</g>
            <path d="{path_area}" fill="url(#bellGrad)" />
            <path d="{path_line}" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <g>{''.join(markers)}</g>
        </svg>"""
        return svg

