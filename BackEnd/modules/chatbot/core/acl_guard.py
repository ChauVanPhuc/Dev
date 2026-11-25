# -*- coding: utf-8 -*-
"""
ACL Guard for SmartFlow ChatBot v2.
Kết nối trực tiếp với resolve_user_permissions(user, db) để kiểm soát quyền truy cập từng Domain.
"""
import logging
from typing import Dict, List, Set, Any
from sqlalchemy.orm import Session

logger = logging.getLogger("chatbot.acl")


def is_admin_user(user: Any, db: Session = None) -> bool:
    """Kiểm tra tài khoản có phải Admin / Ban Giám Đốc (toàn quyền) hay không."""
    if not user:
        return False
    username = (getattr(user, "username", "") or "").strip().lower()
    perm_level = (getattr(user, "permission_level", "") or "").strip().lower()
    if username in ("admin", "superadmin", "root") or perm_level in ("admin", "superadmin", "bgd"):
        return True

    if db is not None and getattr(user, "id", None):
        try:
            from modules.auth.models.departments import Department
            from modules.auth.models.role import Role
            from modules.auth.models.permissions import Permission

            depts = db.query(Department).filter(Department.account_id == user.id).all()
            role_ids = [d.role_id for d in depts if d.role_id]
            perm_ids = [d.permission_id for d in depts if d.permission_id]

            if role_ids:
                roles = db.query(Role).filter(Role.id.in_(role_ids)).all()
                for r in roles:
                    r_name = (r.name or "").strip().lower()
                    r_code = (getattr(r, "code", "") or "").strip().lower()
                    if r_name in ("admin", "bgd", "ban giám đốc", "it") or r_code in ("admin", "bgd", "it"):
                        return True
            if perm_ids:
                perms = db.query(Permission).filter(Permission.id.in_(perm_ids)).all()
                for p in perms:
                    if (p.name or "").strip().lower() in ("admin", "superadmin", "giám đốc", "tổng giám đốc"):
                        return True
        except Exception as e:
            logger.warning(f"[ACLGuard] Không kiểm tra được role/permission cho user {username}: {e}")

    return False


def get_user_readable_keys(user: Any, db: Session) -> Set[str]:
    """Trả về tập hợp các screen_key mà user có ít nhất quyền 'read'."""
    if not user or db is None:
        return set()
    try:
        from modules.auth.controllers.account_controller import resolve_user_permissions
        resolved = resolve_user_permissions(user, db) or {}
        readable = set()
        for key, actions in resolved.items():
            if not key:
                continue
            if isinstance(actions, (list, set, tuple)):
                if "read" in actions or len(actions) > 0:
                    readable.add(key.strip().lower())
                    readable.add(key.strip().lower().lstrip("/"))
            elif actions is True:
                readable.add(key.strip().lower())
                readable.add(key.strip().lower().lstrip("/"))
        return readable
    except Exception as e:
        logger.error(f"[ACLGuard] Lỗi resolve_user_permissions: {e}")
        return set()


def get_allowed_domains(user: Any, db: Session, all_domains: Dict[str, Any]) -> List[str]:
    """
    Trả về danh sách tên Domain mà user được phép truy vấn.
    - Admin/BGD/IT: toàn bộ Domain.
    - User thường: kiểm tra khớp `required_permissions` của Domain với `readable_keys`.
    - Các Domain có `public_read=True` (ví dụ hướng dẫn hệ thống) luôn được mở.
    """
    if not user:
        return []

    if is_admin_user(user, db):
        return list(all_domains.keys())

    readable_keys = get_user_readable_keys(user, db)
    allowed: List[str] = []

    for domain_key, spec in all_domains.items():
        if getattr(spec, "public_read", False):
            allowed.append(domain_key)
            continue

        req_keys = getattr(spec, "required_permissions", []) or []
        if not req_keys:
            allowed.append(domain_key)
            continue

        matched = False
        for rk in req_keys:
            rk_norm = rk.strip().lower()
            rk_clean = rk_norm.lstrip("/")
            if rk_norm in readable_keys or rk_clean in readable_keys:
                matched = True
                break
            # Cho phép khớp theo tiền tố/từ khóa màn hình (ví dụ '/admin/warehouse' chứa 'warehouse')
            for uk in readable_keys:
                if rk_clean and rk_clean in uk:
                    matched = True
                    break
            if matched:
                break

        if matched:
            allowed.append(domain_key)

    return allowed


def build_user_context_summary(user: Any, db: Session, allowed_domains: List[str]) -> Dict[str, Any]:
    """Thông tin ngữ cảnh user (an toàn, không chứa bí mật) để cung cấp cho Agent."""
    if not user:
        return {"user_id": None, "username": "guest", "is_admin": False, "allowed_domains": []}
    return {
        "user_id": getattr(user, "id", None),
        "username": getattr(user, "username", ""),
        "full_name": getattr(user, "full_name", "") or getattr(user, "username", ""),
        "employee_id": getattr(user, "employee_id", "") or "",
        "is_admin": is_admin_user(user, db),
        "allowed_domains": allowed_domains,
    }

