# -*- coding: utf-8 -*-
"""
Lead-time & Container Analysis Service
Bóc tách số Container theo Thời gian Load Cont thực tế, ăn theo Tháng Claim lọc.
Ví dụ: Claim tháng 08/2026 -> Tìm danh sách container thuộc claim tháng 08/2026 ->
Tra cứu date_loading trong bảng lpn_containers -> Gom nhóm theo tháng load cont.
"""
from typing import Dict, Any, List
import re
from datetime import datetime
from sqlalchemy.orm import Session

try:
    from modules.claim.models.customer_claim import CustomerClaim
except ImportError:
    try:
        from modules.claim.models import CustomerClaim
    except ImportError:
        from app.modules.claim.models import CustomerClaim

from dashboard.backend.services.mock_data_service import MockDataService

try:
    from lpn_crawler.backend.models.models import LpnContainer
except Exception:
    LpnContainer = None


class LeadTimeService:

    @staticmethod
    def get_container_load_by_claim_period(db: Session, claim_period: str, force_mock: bool = False) -> Dict[str, Any]:
        """
        claim_period: e.g. "08/2026" or "08-2026"
        """
        if force_mock:
            return MockDataService.get_container_load_by_claim_month(claim_period)

        try:
            # Chuẩn hóa format period (có thể lưu là "08-2026" hoặc "08/2026")
            period_variants = [claim_period, claim_period.replace("/", "-"), claim_period.replace("-", "/")]
            
            # Query claims thuộc kỳ này
            claims = db.query(CustomerClaim).filter(CustomerClaim.period.in_(period_variants)).all()
            
            if not claims:
                # Nếu chưa có claim nào trong DB cho kỳ này, fallback sang mock
                return MockDataService.get_container_load_by_claim_month(claim_period)

            # Thu thập danh sách container_no không rỗng
            cont_to_claims: Dict[str, List[str]] = {}
            for c in claims:
                cont_no = (c.container_no or "").strip().upper()
                if cont_no:
                    if cont_no not in cont_to_claims:
                        cont_to_claims[cont_no] = []
                    cont_to_claims[cont_no].append(c.claim_code)

            if not cont_to_claims or LpnContainer is None:
                return MockDataService.get_container_load_by_claim_month(claim_period)

            # Tra cứu date_loading trong bảng lpn_containers
            lpn_conts = db.query(LpnContainer).filter(
                LpnContainer.container_number.in_(list(cont_to_claims.keys()))
            ).all()

            # Nhóm theo loading_month
            month_groups: Dict[str, Dict[str, Any]] = {}
            unmatched_conts = []

            for lc in lpn_conts:
                load_date = lc.date_loading
                if load_date:
                    load_month_str = load_date.strftime("%m/%Y")
                elif lc.date_loading_raw:
                    # Parse raw string
                    load_month_str = lc.date_loading_raw[:7].replace("-", "/")
                else:
                    load_month_str = "Chưa rõ"

                if load_month_str not in month_groups:
                    month_groups[load_month_str] = {
                        "loading_month": load_month_str,
                        "containers": set(),
                        "claims": set(),
                        "lag_months": 0
                    }
                c_num = lc.container_number
                month_groups[load_month_str]["containers"].add(c_num)
                for clm in cont_to_claims.get(c_num, []):
                    month_groups[load_month_str]["claims"].add(clm)

            if not month_groups:
                return MockDataService.get_container_load_by_claim_month(claim_period)

            # Tính lag_months và chuyển sang danh sách kết quả
            points = []
            claim_m_int = 8
            claim_y_int = 2026
            try:
                parts = claim_period.replace("-", "/").split("/")
                claim_m_int = int(parts[0])
                claim_y_int = int(parts[1])
            except Exception:
                pass

            for m_str, data in sorted(month_groups.items(), key=lambda x: x[0]):
                lag = 0
                try:
                    p_parts = m_str.split("/")
                    lm = int(p_parts[0])
                    ly = int(p_parts[1])
                    lag = (claim_y_int - ly) * 12 + (claim_m_int - lm)
                except Exception:
                    lag = 0

                points.append({
                    "loading_month": m_str,
                    "container_count": len(data["containers"]),
                    "containers": list(data["containers"])[:10],
                    "sample_claims": list(data["claims"])[:5],
                    "lag_months": max(lag, 0)
                })

            total_conts = sum(p["container_count"] for p in points)
            return {
                "claim_month": claim_period,
                "total_containers": total_conts,
                "points": points,
                "is_mock": False
            }

        except Exception as e:
            # Fallback an toàn nếu có lỗi
            return MockDataService.get_container_load_by_claim_month(claim_period)
