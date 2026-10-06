# -*- coding: utf-8 -*-
"""
Mock Data Service for Claim Analytics Dashboard
Cung cấp dữ liệu mẫu sát thực tế ngành gỗ/nội thất xuất khẩu khi DB chưa có đủ thông tin
hoặc khi người dùng bật công tắc chế độ dữ liệu mẫu (Demo Mode).
"""
from typing import Dict, Any, List, Optional
from datetime import datetime


class MockDataService:

    @staticmethod
    def get_filter_options() -> Dict[str, Any]:
        return {
            "periods": [
                {"value": "08/2026", "label": "Tháng 08/2026 (Chốt M-1)"},
                {"value": "07/2026", "label": "Tháng 07/2026"},
                {"value": "06/2026", "label": "Tháng 06/2026"},
                {"value": "05/2026", "label": "Tháng 05/2026"},
                {"value": "04/2026", "label": "Tháng 04/2026"},
                {"value": "03/2026", "label": "Tháng 03/2026"},
                {"value": "02/2026", "label": "Tháng 02/2026"},
                {"value": "01/2026", "label": "Tháng 01/2026"}
            ],
            "default_period": "08/2026",
            "customers": [
                {"value": "ALL", "label": "Tất cả khách hàng"},
                {"value": "Atlas Vanity", "label": "Atlas Vanity Inc."},
                {"value": "G7 Home Furnishing", "label": "G7 Home Furnishing"},
                {"value": "Noble Craft", "label": "Noble Craft USA"}
            ],
            "severities": [
                {"value": "ALL", "label": "Tất cả mức độ"},
                {"value": "Critical", "label": "Nghiêm trọng (Critical)"},
                {"value": "Major", "label": "Nặng (Major)"},
                {"value": "Minor", "label": "Nhẹ (Minor)"}
            ],
            "categories": [
                {"value": "ALL", "label": "Tất cả phân nhóm"},
                {"value": "visual", "label": "Ngoại quan (Visual)"},
                {"value": "structure", "label": "Kết cấu (Structure)"},
                {"value": "paint", "label": "Nước sơn (Paint)"},
                {"value": "material", "label": "Vật liệu (Material)"},
                {"value": "hardware", "label": "Phụ kiện / Đóng gói"}
            ]
        }

    @staticmethod
    def get_summary_kpi(mode: str = "monthly", period: str = "08/2026") -> Dict[str, Any]:
        """
        mode: 'monthly' (chế độ theo tháng có so sánh với tháng trước) hoặc 'overview' (tổng quan trước giờ)
        """
        if mode == "overview":
            return {
                "total_claims": 1486,
                "claims_change_pct": 0.0,
                "total_penalty_amount": 384500.0,
                "penalty_change_pct": 0.0,
                "avg_penalty_per_claim": 258.7,
                "avg_penalty_change": 0.0,
                "total_containers": 194,
                "containers_change_pct": 0.0,
                "resolution_rate": 96.8,
                "resolved_count": 1438,
                "period_label": "Toàn bộ lịch sử (Lũy kế)",
                "comparison_label": None,
                "is_mock": True
            }

        # Monthly comparative mode (Mặc định kỳ chốt 08/2026 so với 07/2026)
        if period == "08/2026":
            return {
                "total_claims": 128,
                "claims_change_pct": 12.3,  # tăng 12.3% so với tháng 7
                "total_penalty_amount": 34520.0,
                "penalty_change_pct": -5.2, # giảm 5.2% nhờ bồi thường các vụ nhẹ
                "avg_penalty_per_claim": 269.7,
                "avg_penalty_change": -32.5,
                "total_containers": 18,
                "containers_change_pct": 5.9,
                "resolution_rate": 94.5,
                "resolved_count": 121,
                "period_label": "Tháng 08/2026",
                "comparison_label": "so với Tháng 07/2026",
                "is_mock": True
            }
        elif period == "07/2026":
            return {
                "total_claims": 114,
                "claims_change_pct": -8.1,
                "total_penalty_amount": 36410.0,
                "penalty_change_pct": 4.5,
                "avg_penalty_per_claim": 319.4,
                "avg_penalty_change": 38.0,
                "total_containers": 17,
                "containers_change_pct": -5.5,
                "resolution_rate": 98.2,
                "resolved_count": 112,
                "period_label": "Tháng 07/2026",
                "comparison_label": "so với Tháng 06/2026",
                "is_mock": True
            }
        else:
            return {
                "total_claims": 98,
                "claims_change_pct": 2.1,
                "total_penalty_amount": 28900.0,
                "penalty_change_pct": -1.8,
                "avg_penalty_per_claim": 294.9,
                "avg_penalty_change": -11.0,
                "total_containers": 15,
                "containers_change_pct": 0.0,
                "resolution_rate": 95.9,
                "resolved_count": 94,
                "period_label": f"Tháng {period}",
                "comparison_label": "so với tháng trước",
                "is_mock": True
            }

    @staticmethod
    def get_pareto_defects(mode: str = "monthly", period: str = "08/2026") -> Dict[str, Any]:
        """
        Top 10 lỗi sắp xếp giảm dần, tính % và % tích lũy (Cumulative Percentage)
        """
        raw_items = [
            {"code": "DVA_01", "name": "Nứt tét mặt bàn / ván hông", "category": "visual", "count": 34, "amount": 9180.0},
            {"code": "DVB_02", "name": "Trầy xước màng sơn PU", "category": "paint", "count": 22, "amount": 4840.0},
            {"code": "STR_01", "name": "Lỏng kết cấu ray trượt hộc kéo", "category": "structure", "count": 16, "amount": 3520.0},
            {"code": "MAT_03", "name": "Cong vênh cánh tủ vượt chuẩn", "category": "material", "count": 14, "amount": 4200.0},
            {"code": "COL_01", "name": "Lệch tông màu sơn với mẫu chuẩn", "category": "paint", "count": 11, "amount": 2970.0},
            {"code": "DVA_05", "name": "Hở khe mối ghép mộng chân bàn", "category": "structure", "count": 8, "amount": 2240.0},
            {"code": "PAC_02", "name": "Bao bì rách / Móp góc xốp", "category": "hardware", "count": 7, "amount": 1400.0},
            {"code": "HDW_01", "name": "Thiếu bộ ốc vít / Bản lề đóng êm", "category": "hardware", "count": 6, "amount": 600.0},
            {"code": "MAT_01", "name": "Đốm nấm mốc trắng bề mặt gỗ", "category": "material", "count": 5, "amount": 1250.0},
            {"code": "STR_04", "name": "Khe hở hộc kéo không đều nhau", "category": "structure", "count": 5, "amount": 1050.0}
        ]

        if mode == "overview":
            # Scale up numbers for overview
            for item in raw_items:
                item["count"] = int(item["count"] * 11.5)
                item["amount"] = round(item["amount"] * 11.2, 2)

        total_count = sum(x["count"] for x in raw_items)
        total_amount = sum(x["amount"] for x in raw_items)

        items = []
        running_sum = 0
        for x in raw_items:
            pct = round((x["count"] / total_count) * 100, 1) if total_count > 0 else 0
            running_sum += x["count"]
            cum_pct = round((running_sum / total_count) * 100, 1) if total_count > 0 else 0
            items.append({
                "code": x["code"],
                "name": x["name"],
                "category": x["category"],
                "count": x["count"],
                "amount": x["amount"],
                "percentage": pct,
                "cumulative_pct": min(cum_pct, 100.0)
            })

        return {
            "items": items,
            "total_count": total_count,
            "total_amount": round(total_amount, 2),
            "is_mock": True
        }

    @staticmethod
    def get_trend_defects(granularity: str = "month", metric: str = "cases") -> Dict[str, Any]:
        """
        Xu hướng lỗi theo thời gian (Tổng + Chi tiết theo nhóm), hỗ trợ switch Vụ / Tiền
        """
        months = ["01/2026", "02/2026", "03/2026", "04/2026", "05/2026", "06/2026", "07/2026", "08/2026"]
        categories = ["Ngoại quan", "Kết cấu", "Nước sơn", "Vật liệu", "Phụ kiện"]
        
        timeline = []
        base_cases = [
            (82, 21500.0, [28, 20, 15, 12, 7], [7000.0, 5800.0, 4100.0, 3400.0, 1200.0]),
            (76, 19800.0, [25, 18, 16, 11, 6], [6600.0, 5200.0, 4200.0, 2900.0, 900.0]),
            (95, 26300.0, [32, 24, 19, 13, 7], [8500.0, 7100.0, 5100.0, 4400.0, 1200.0]),
            (88, 24100.0, [30, 22, 17, 12, 7], [7900.0, 6400.0, 4800.0, 3900.0, 1100.0]),
            (104, 29400.0, [36, 26, 21, 14, 7], [9700.0, 7900.0, 5700.0, 4900.0, 1200.0]),
            (98, 28900.0, [33, 24, 20, 14, 7], [9200.0, 7800.0, 5600.0, 5100.0, 1200.0]),
            (114, 36410.0, [39, 28, 23, 16, 8], [11800.0, 9800.0, 6900.0, 6410.0, 1500.0]),
            (128, 34520.0, [45, 32, 26, 16, 9], [11500.0, 9800.0, 6420.0, 5400.0, 1400.0]),
        ]

        for i, m in enumerate(months):
            tot_cases, tot_amt, c_list, a_list = base_cases[i]
            breakdown_c = {categories[j]: c_list[j] for j in range(len(categories))}
            breakdown_a = {categories[j]: a_list[j] for j in range(len(categories))}
            timeline.append({
                "period": m,
                "total_cases": tot_cases,
                "total_amount": tot_amt,
                "breakdown_cases": breakdown_c,
                "breakdown_amount": breakdown_a
            })

        return {
            "granularity": granularity,
            "categories": categories,
            "timeline": timeline,
            "is_mock": True
        }

    @staticmethod
    def get_combo_cases_amount() -> Dict[str, Any]:
        """
        Combo Chart: Số vụ là Cột (Trục trái), Tiền ($) là Đường (Trục phải)
        """
        data = [
            {"period": "01/2026", "cases": 82, "amount": 21500.0},
            {"period": "02/2026", "cases": 76, "amount": 19800.0},
            {"period": "03/2026", "cases": 95, "amount": 26300.0},
            {"period": "04/2026", "cases": 88, "amount": 24100.0},
            {"period": "05/2026", "cases": 104, "amount": 29400.0},
            {"period": "06/2026", "cases": 98, "amount": 28900.0},
            {"period": "07/2026", "cases": 114, "amount": 36410.0},
            {"period": "08/2026", "cases": 128, "amount": 34520.0}
        ]
        return {
            "data": data,
            "is_mock": True
        }

    @staticmethod
    def get_container_load_by_claim_month(claim_month: str = "08/2026") -> Dict[str, Any]:
        """
        Biểu đồ cột: Hiển thị các tháng Đóng/Load container thực tế ăn theo Tháng Claim lọc.
        Ví dụ: Claim tháng 08/2026 bắt nguồn từ các cont load tháng 04/2026 (2 cont), 05/2026 (5 cont), 06/2026 (7 cont), 07/2026 (4 cont).
        """
        if claim_month in ("08/2026", "08-2026"):
            points = [
                {
                    "loading_month": "04/2026",
                    "container_count": 2,
                    "containers": ["MEDU6182910", "TCKU9281720"],
                    "sample_claims": ["CLM-2608-001", "CLM-2608-014"],
                    "lag_months": 4
                },
                {
                    "loading_month": "05/2026",
                    "container_count": 5,
                    "containers": ["CMAU8291024", "TCLU3829102", "MSKU8291028", "ONEU9182910", "TEMU2910291"],
                    "sample_claims": ["CLM-2608-022", "CLM-2608-035", "CLM-2608-041", "CLM-2608-053", "CLM-2608-059"],
                    "lag_months": 3
                },
                {
                    "loading_month": "06/2026",
                    "container_count": 7,
                    "containers": ["SEGU2819201", "COSU8291029", "MSCU9102912", "FSCU8291021", "EMCU8291040", "TGHU2910294", "WHLU9281920"],
                    "sample_claims": ["CLM-2608-062", "CLM-2608-071", "CLM-2608-084", "CLM-2608-090", "CLM-2608-095"],
                    "lag_months": 2
                },
                {
                    "loading_month": "07/2026",
                    "container_count": 4,
                    "containers": ["CAXU9182912", "FSCU8291028", "BEAU9281029", "SUDU8291048"],
                    "sample_claims": ["CLM-2608-101", "CLM-2608-112", "CLM-2608-120", "CLM-2608-128"],
                    "lag_months": 1
                }
            ]
        elif claim_month in ("07/2026", "07-2026"):
            points = [
                {
                    "loading_month": "03/2026",
                    "container_count": 2,
                    "containers": ["TCKU8291012", "MEDU9281023"],
                    "sample_claims": ["CLM-2607-005", "CLM-2607-018"],
                    "lag_months": 4
                },
                {
                    "loading_month": "04/2026",
                    "container_count": 4,
                    "containers": ["CMAU9281024", "TEMU8291021", "MSKU7281920", "ONEU8291022"],
                    "sample_claims": ["CLM-2607-024", "CLM-2607-033"],
                    "lag_months": 3
                },
                {
                    "loading_month": "05/2026",
                    "container_count": 8,
                    "containers": ["SEGU9281024", "COSU7281920", "MSCU8291044", "FSCU7281920", "EMCU9281045", "TGHU8291024", "WHLU8291023", "BEAU7281920"],
                    "sample_claims": ["CLM-2607-045", "CLM-2607-058", "CLM-2607-070"],
                    "lag_months": 2
                },
                {
                    "loading_month": "06/2026",
                    "container_count": 3,
                    "containers": ["CAXU8291024", "SUDU7281920", "TCLU8291023"],
                    "sample_claims": ["CLM-2607-092", "CLM-2607-105"],
                    "lag_months": 1
                }
            ]
        else:
            points = [
                {
                    "loading_month": "02/2026",
                    "container_count": 3,
                    "containers": ["MEDU1111111", "TCKU2222222", "MSKU3333333"],
                    "sample_claims": ["CLM-DEMO-001"],
                    "lag_months": 3
                },
                {
                    "loading_month": "03/2026",
                    "container_count": 6,
                    "containers": ["CMAU4444444", "TEMU5555555", "ONEU6666666", "SEGU7777777", "COSU8888888", "MSCU9999999"],
                    "sample_claims": ["CLM-DEMO-002"],
                    "lag_months": 2
                },
                {
                    "loading_month": "04/2026",
                    "container_count": 4,
                    "containers": ["FSCU0000001", "EMCU0000002", "TGHU0000003", "WHLU0000004"],
                    "sample_claims": ["CLM-DEMO-003"],
                    "lag_months": 1
                }
            ]

        total_conts = sum(p["container_count"] for p in points)
        return {
            "claim_month": claim_month,
            "total_containers": total_conts,
            "points": points,
            "is_mock": True
        }

    @staticmethod
    def get_defect_groups() -> Dict[str, Any]:
        """
        Tỉ lệ lỗi theo phân nhóm lỗi chuẩn ngành gỗ (Donut / Pie Chart)
        Thay thế công đoạn sản xuất (Sơn, Định hình) bằng phân nhóm lỗi thực tế:
        Nước sơn, Ngoại quan, Kết cấu, Vật liệu gỗ, Phụ kiện & Bao bì
        """
        groups = [
            {"group_code": "paint", "group_name": "Nước sơn", "count": 18, "amount": 15400.0, "percentage": 40.9, "color": "#4A2E1B"},
            {"group_code": "visual", "group_name": "Ngoại quan", "count": 12, "amount": 8200.0, "percentage": 27.3, "color": "#8C5A3C"},
            {"group_code": "structure", "group_name": "Kết cấu", "count": 7, "amount": 6100.0, "percentage": 15.9, "color": "#C05621"},
            {"group_code": "material", "group_name": "Vật liệu gỗ", "count": 4, "amount": 3500.0, "percentage": 9.1, "color": "#B58E6F"},
            {"group_code": "hardware", "group_name": "Bao bì & Phụ kiện", "count": 3, "amount": 1800.0, "percentage": 6.8, "color": "#6D4C41"}
        ]
        return {
            "groups": groups,
            "total_count": sum(g["count"] for g in groups),
            "total_amount": sum(g["amount"] for g in groups),
            "is_mock": True
        }

