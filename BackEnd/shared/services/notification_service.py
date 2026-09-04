import firebase_admin
from firebase_admin import credentials, messaging
import os
from sqlalchemy.orm import Session
import logging

# Thiết lập hệ thống ghi nhật ký (logging) để theo dõi lỗi
logger = logging.getLogger(__name__)

# --- CẤU HÌNH ĐƯỜNG DẪN FIREBASE ---
# Xác định đường dẫn tuyệt đối đến file khóa bí mật JSON
# Cấu trúc: BackEnd/src/app/core/firebase_utils.py -> BackEnd/service-account-file.json
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(CURRENT_DIR))), "service-account-file.json")

def initialize_firebase():
    """
    Hàm khởi tạo Firebase Admin SDK.
    Đảm bảo SDK chỉ được khởi tạo một lần duy nhất để tránh lỗi hệ thống.
    """
    try:
        if not firebase_admin._apps:
            # Kiểm tra xem file JSON cấu hình có tồn tại không
            if os.path.exists(SERVICE_ACCOUNT_PATH):
                cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
                firebase_admin.initialize_app(cred)
                logger.info(f"Firebase Admin SDK đã được khởi tạo thành công từ: {SERVICE_ACCOUNT_PATH}")
            else:
                logger.error(f"LỖI: Không tìm thấy file service-account-file.json tại: {SERVICE_ACCOUNT_PATH}")
    except Exception as e:
        logger.error(f"Lỗi khi khởi tạo Firebase: {e}")

def send_push_notification(fcm_token: str, title: str, body: str, data: dict = None):
    """
    Gửi thông báo đẩy đến một thiết bị di động cụ thể thông qua mã Token (FCM Token).
    """
    initialize_firebase()
    
    if not firebase_admin._apps or not fcm_token:
        logger.warning("Bỏ qua gửi Push: Hệ thống chưa sẵn sàng hoặc không có Token.")
        return False

    try:
        # Chuẩn hóa dữ liệu data (Firebase yêu cầu dict các giá trị string)
        string_data = {}
        if data:
            for k, v in data.items():
                string_data[str(k)] = str(v) if v is not None else ""

        android_config = messaging.AndroidConfig(
            priority="high",
            notification=messaging.AndroidNotification(
                sound="default",
                channel_id="default"
            )
        )

        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            android=android_config,
            data=string_data,
            token=fcm_token,
        )
        response = messaging.send(message)
        logger.info(f"Đã gửi Push Notification thành công: {response}")
        return True
    except Exception as e:
        logger.error(f"Lỗi khi gửi Push Notification: {e}")
        return False

def send_push_to_user(db: Session, user_id: int, title: str, body: str, route_path: str = None, extra_data: dict = None):
    """
    Gửi thông báo đẩy trực tiếp tới một tài khoản người dùng cụ thể kèm theo Deep-link route.
    """
    from modules.auth.models.accounts import Account
    user = db.query(Account).filter(Account.id == user_id).first()
    if not user or not user.fcm_token:
        logger.info(f"Tài khoản ID {user_id} không có FCM Token để gửi Push.")
        return False

    payload = {"route_path": route_path or ""}
    if extra_data:
        payload.update(extra_data)

    return send_push_notification(user.fcm_token, title, body, payload)

def send_push_to_group(db: Session, target_group: str, title: str, body: str, route_path: str = None, stage_name: str = None, extra_data: dict = None):
    """
    Gửi thông báo đẩy đến TẤT CẢ nhân viên thuộc một nhóm (ví dụ: QC, SX, BGD) hoặc công đoạn cụ thể.
    """
    from modules.auth.models.accounts import Account
    from modules.auth.models.departments import Department
    from modules.auth.models.role import Role
    from modules.production.models.stages import Stage
    from sqlalchemy import or_

    initialize_firebase()
    if not firebase_admin._apps:
        return 0

    try:
        query = db.query(Account).join(Department, Account.id == Department.account_id)

        if target_group:
            tg_upper = target_group.upper()
            if any(k in tg_upper for k in ["QC", "QLCL", "CHẤT LƯỢNG", "KIỂM TRA"]):
                query = query.join(Role, Department.role_id == Role.id).filter(
                    or_(Role.name.like('%QC%'), Role.name.like('%QLCL%'), Role.description.like('%Chất lượng%'))
                )
            elif any(k in tg_upper for k in ["SX", "SẢN XUẤT"]):
                query = query.join(Role, Department.role_id == Role.id).filter(
                    or_(Role.name.like('%SX%'), Role.name.like('%Sản xuất%'), Role.description.like('%Sản xuất%'))
                )
            elif any(k in tg_upper for k in ["BGD", "GIÁM ĐỐC", "ADMIN"]):
                query = query.join(Role, Department.role_id == Role.id).filter(
                    or_(Role.name.like('%ADMIN%'), Role.name.like('%BGD%'), Role.name.like('%IT%'))
                )

        if stage_name:
            stage_obj = db.query(Stage).filter(or_(Stage.name == stage_name, Stage.description == stage_name)).first()
            if stage_obj:
                query = query.filter(Department.stage_id == stage_obj.id)

        users = query.filter(Account.fcm_token != None).all()
        sent_count = 0
        payload = {"route_path": route_path or ""}
        if extra_data:
            payload.update(extra_data)

        for u in users:
            if send_push_notification(u.fcm_token, title, body, payload):
                sent_count += 1

        return sent_count
    except Exception as e:
        logger.error(f"Lỗi khi gửi push to group: {e}")
        return 0


def notify_qc_stage(db: Session, stage_name: str, title: str, body: str):
    """
    Tự động tìm kiếm và gửi thông báo cho TẤT CẢ các nhân viên QC 
    đang phụ trách một công đoạn (Stage) cụ thể.
    
    Logic: Tìm trong bảng departments -> lọc người có Role là QC và Stage khớp với tên/mô tả.
    """
    # Import các Model bên trong hàm để tránh lỗi Circular Import
    from modules.auth.models.accounts import Account
    from modules.auth.models.departments import Department
    from modules.auth.models.role import Role
    from modules.production.models.stages import Stage
    from sqlalchemy import or_

    initialize_firebase()
    if not firebase_admin._apps:
        return

    try:
        # 1. Tìm bản ghi của công đoạn (Stage) dựa trên Tên viết tắt hoặc Mô tả đầy đủ
        target_stage = db.query(Stage).filter(
            or_(Stage.name == stage_name, Stage.description == stage_name)
        ).first()

        # Nếu không thấy thông tin phù hợp thì dừng lại
        if not target_stage:
            logger.warning(f"Không tìm thấy công đoạn '{stage_name}' để gửi Push.")
            return

        # 2. Truy vấn danh sách nhân viên:
        # - Phải có trong bảng Departments (Bộ phận)
        # - Có Role chứa chữ QC (Dùng Join trực tiếp)
        # - Stage_id phải khớp với nơi nhận hàng
        # - fcm_token phải tồn tại (đã từng đăng nhập vào app)
        qc_users = db.query(Account).join(
            Department, Account.id == Department.account_id
        ).join(
            Role, Department.role_id == Role.id
        ).filter(
            or_(
                Role.name.like('%QC%'),
                Role.name.like('%QLCL%'),
                Role.description.like('%Chất lượng%'),
                Role.description.like('%Kiểm tra%')
            ),
            Department.stage_id == target_stage.id,
            Account.fcm_token != None
        ).all()

        if not qc_users:
            logger.info(f"Không tìm thấy nhân viên QC nào có Token tại công đoạn: {stage_name}")
            return

        # 3. Gửi lần lượt thông báo đến từng thiết bị tìm thấy
        for user in qc_users:
            logger.info(f"Đang đẩy tin nhắn đến QC: {user.username} (Công đoạn: {target_stage.name})")
            
            # Cấu hình riêng cho Android để hiển thị nổi bật trên màn hình khóa
            android_config = messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    sound="default",
                    channel_id="default"
                )
            )
            
            # Đóng gói tin nhắn cuối cùng
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                android=android_config,
                token=user.fcm_token,
            )
            # Lệnh gửi tin của Firebase SDK
            messaging.send(message)
            
    except Exception as e:
        logger.error(f"Lỗi trong quá trình xử lý gửi Push theo công đoạn: {e}")

def notify_stage(db: Session, stage_name: str, title: str, body: str, role_filter: str = None):
    """
    Gửi thông báo đẩy đến TẤT CẢ các nhân viên thuộc một công đoạn cụ thể.
    Không phân biệt Role (QC hay Sản xuất).
    """
    from modules.auth.models.accounts import Account
    from modules.auth.models.departments import Department
    from modules.production.models.stages import Stage
    from sqlalchemy import or_

    initialize_firebase()
    if not firebase_admin._apps:
        return

    try:
        target_stage = db.query(Stage).filter(
            or_(Stage.name == stage_name, Stage.description == stage_name)
        ).first()

        if not target_stage:
            return

        from modules.auth.models.role import Role
        query = db.query(Account).join(
            Department, Account.id == Department.account_id
        )
        
        # Nếu có lọc theo Role (ví dụ 'SX' hoặc 'QC')
        if role_filter:
            role_terms = [role_filter]
            if role_filter.upper() == "QC":
                role_terms.extend(["QLCL", "Chất lượng", "Kiểm tra"])
            elif role_filter.upper() == "SX":
                role_terms.extend(["Sản xuất"])
            
            conditions = []
            for term in role_terms:
                conditions.append(Role.name.like(f'%{term}%'))
                conditions.append(Role.description.like(f'%{term}%'))
            query = query.join(Role, Department.role_id == Role.id).filter(or_(*conditions))

        users = query.filter(
            Department.stage_id == target_stage.id,
            Account.fcm_token != None
        ).all()

        for user in users:
            android_config = messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    sound="default",
                    channel_id="default"
                )
            )
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                android=android_config,
                token=user.fcm_token,
            )
            messaging.send(message)
    except Exception as e:
        logger.error(f"Error in notify_stage: {e}")
