# -*- coding: utf-8 -*-
"""
Domain Registry & Smart Domain Router for SmartFlow ChatBot v2.
Bao phủ 8 Domain đại diện cho toàn bộ 23 phân hệ của SmartFlow ERP.
"""
from typing import Dict, List, Set
from modules.chatbot.domains.base import DomainSpec
from modules.chatbot.domains.production_domain import PRODUCTION_DOMAIN
from modules.chatbot.domains.warehouse_domain import WAREHOUSE_DOMAIN
from modules.chatbot.domains.quality_domain import QUALITY_DOMAIN
from modules.chatbot.domains.claim_domain import CLAIM_DOMAIN
from modules.chatbot.domains.delivery_domain import DELIVERY_DOMAIN
from modules.chatbot.domains.master_purchasing_domain import MASTER_PURCHASING_DOMAIN
from modules.chatbot.domains.hr_kpi_domain import HR_KPI_DOMAIN
from modules.chatbot.domains.equipment_iso_system_domain import EQUIPMENT_ISO_SYSTEM_DOMAIN

ALL_DOMAINS: Dict[str, DomainSpec] = {
    PRODUCTION_DOMAIN.key: PRODUCTION_DOMAIN,
    WAREHOUSE_DOMAIN.key: WAREHOUSE_DOMAIN,
    QUALITY_DOMAIN.key: QUALITY_DOMAIN,
    CLAIM_DOMAIN.key: CLAIM_DOMAIN,
    DELIVERY_DOMAIN.key: DELIVERY_DOMAIN,
    MASTER_PURCHASING_DOMAIN.key: MASTER_PURCHASING_DOMAIN,
    HR_KPI_DOMAIN.key: HR_KPI_DOMAIN,
    EQUIPMENT_ISO_SYSTEM_DOMAIN.key: EQUIPMENT_ISO_SYSTEM_DOMAIN,
}


def route_domains(
    message: str,
    current_page: str = "",
    allowed_domains: List[str] = None,
    max_domains: int = 3,
) -> List[str]:
    """
    Chọn tối đa `max_domains` Domain phù hợp nhất với câu hỏi và trang hiện tại,
    nằm trong danh sách `allowed_domains` của user.
    """
    if allowed_domains is None:
        allowed_domains = list(ALL_DOMAINS.keys())
    allowed_set = set(allowed_domains)
    if not allowed_set:
        return []

    msg_lower = (message or "").lower()
    page_lower = (current_page or "").lower()

    scores: Dict[str, int] = {}

    for key, spec in ALL_DOMAINS.items():
        if key not in allowed_set:
            continue
        score = 0
        for kw in spec.keywords:
            if kw in msg_lower:
                # Ưu tiên cụm từ dài (cụ thể hơn)
                score += 3 if " " in kw else 2

        if page_lower:
            for prefix in spec.route_prefixes:
                if prefix in page_lower:
                    score += 2
                    break

        if score > 0:
            scores[key] = score

    # Nếu không khớp từ khóa nào rõ rệt, fallback theo trang hiện tại hoặc bộ 2 domain phổ biến nhất
    if not scores:
        for key, spec in ALL_DOMAINS.items():
            if key in allowed_set and any(p in page_lower for p in spec.route_prefixes):
                return [key]
        # Mặc định trả về các domain phổ biến mà user có quyền
        defaults = [d for d in ("production", "quality", "claim", "warehouse") if d in allowed_set]
        return defaults[:max_domains] if defaults else list(allowed_set)[:max_domains]

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [k for k, _ in ranked[:max_domains]]


def get_allowed_tables_for_domains(domain_keys: List[str]) -> Set[str]:
    tables: Set[str] = set()
    for k in domain_keys:
        spec = ALL_DOMAINS.get(k)
        if spec:
            tables.update(spec.tables)
    return tables


def build_dynamic_schema_prompt(domain_keys: List[str]) -> str:
    sections: List[str] = []
    rules: List[str] = []
    examples: List[str] = []
    for k in domain_keys:
        spec = ALL_DOMAINS.get(k)
        if not spec:
            continue
        sections.append(spec.schema_text.strip())
        if spec.business_rules.strip():
            rules.append(f"[{spec.title}]\n{spec.business_rules.strip()}")
        if spec.examples.strip():
            examples.append(spec.examples.strip())

    out = "=== CẤU TRÚC BẢNG DỮ LIỆU ĐƯỢC PHÉP TRUY VẤN ===\n\n" + "\n\n".join(sections)
    if rules:
        out += "\n\n=== QUY TẮC NGHIỆP VỤ QUAN TRỌNG ===\n" + "\n\n".join(rules)
    if examples:
        out += "\n\n=== CÂU LỆNH T-SQL MẪU ===\n" + "\n".join(examples)
    return out

