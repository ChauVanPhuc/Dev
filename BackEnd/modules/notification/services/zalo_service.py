import logging
import httpx
from typing import List, Dict
from config.database import SessionLocal
from modules.auth.models.accounts import Account as AccountModel
from modules.auth.models.departments import Department as DepartmentModel
from modules.auth.models.role import Role as RoleModel

logger = logging.getLogger("zalo_service")

# Cấu hình URL của Zalo Microservice (mặc định chạy ở cổng 5000)
ZALO_SERVICE_URL = "http://localhost:5000/send-zalo"

async def send_zalo_notification(phone: str, content: str, image_path: str = None, image_paths: List[str] = None) -> bool:
    """
    Gửi tin nhắn Zalo bất đồng bộ tới số điện thoại cụ thể thông qua Zalo Microservice
    """
    payload = {
        "phone": phone,
        "content": content
    }
    if image_paths:
        payload["image_paths"] = image_paths
    elif image_path:
        payload["image_path"] = image_path
    
    logger.info(f"Đang gửi thông báo Zalo tới số điện thoại {phone}...")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(ZALO_SERVICE_URL, json=payload, timeout=10.0)
            if response.status_code == 200:
                logger.info(f"Đã gửi tin nhắn Zalo thành công tới {phone}")
                return True
            else:
                logger.error(f"Lỗi phản hồi từ Zalo Microservice: Code {response.status_code} - {response.text}")
                return False
        except httpx.RequestError as e:
            logger.error(f"Không thể kết nối tới Zalo Microservice tại {ZALO_SERVICE_URL}: {e}")
            return False
        except Exception as e:
            logger.error(f"Lỗi không xác định khi gửi Zalo tới {phone}: {e}")
            return False

async def trigger_zalo_notifications_for_group(target_group: str, content: str):
    """
    Tìm danh sách số điện thoại tương ứng với nhóm (target_group) từ bảng accounts và thực hiện gửi thông báo Zalo
    """
    if not target_group:
        target_group = "DEFAULT"
        
    db = SessionLocal()
    try:
        tg_upper = target_group.upper()
        
        # 1. Xác định vai trò (role name) tương ứng trong DB
        role_to_find = None
        find_all = False
        
        if "QC" in tg_upper or "QLCL" in tg_upper or "CHẤT LƯỢNG" in tg_upper:
            role_to_find = "QLCL"
        elif "SX" in tg_upper or "SẢN XUẤT" in tg_upper:
            role_to_find = "Sx"
        elif "IT" in tg_upper:
            role_to_find = "IT"
        elif "TOÀN CÔNG TY" in tg_upper or "ALL" in tg_upper or "MỌI NGƯỜI" in tg_upper or target_group == "DEFAULT":
            find_all = True
            
        # 2. Truy vấn danh sách số điện thoại từ database
        phones = []
        if find_all:
            # Lấy tất cả tài khoản đang hoạt động có số điện thoại
            accounts = db.query(AccountModel).filter(
                AccountModel.status == "Đang sử dụng",
                AccountModel.phone.isnot(None),
                AccountModel.phone != ""
            ).all()
            phones = [a.phone for a in accounts]
        elif role_to_find:
            # Lấy tài khoản đang hoạt động thuộc phòng ban/vai trò tương ứng
            accounts = db.query(AccountModel).join(
                DepartmentModel, AccountModel.id == DepartmentModel.account_id
            ).join(
                RoleModel, DepartmentModel.role_id == RoleModel.id
            ).filter(
                RoleModel.name == role_to_find,
                AccountModel.status == "Đang sử dụng",
                AccountModel.phone.isnot(None),
                AccountModel.phone != ""
            ).all()
            # Sử dụng set để tránh trùng lặp số điện thoại
            phones = list(set([a.phone for a in accounts]))
            
        if not phones:
            logger.warning(f"Không tìm thấy số điện thoại nào thuộc bộ phận: {target_group} (Role: {role_to_find})")
            return
            
        # 3. Gửi tin nhắn đến từng số điện thoại bất đồng bộ
        import asyncio
        for phone in phones:
            asyncio.create_task(send_zalo_notification(phone, content))
            
    except Exception as e:
        logger.error(f"Lỗi khi truy vấn danh sách số điện thoại Zalo từ DB: {e}")
    finally:
        db.close()
