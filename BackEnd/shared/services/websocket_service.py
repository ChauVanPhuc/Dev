from typing import List, Dict
from fastapi import WebSocket

class ConnectionManager:
    """
    Quản lý các kết nối WebSocket realtime.
    Cho phép gửi tin nhắn đến từng User hoặc toàn bộ User thuộc một Công đoạn (Stage).
    """
    def __init__(self):
        # Dictionary lưu trữ: { user_id: [Danh sách WebSocket] }
        # Hỗ trợ một người dùng có thể mở nhiều tab hoặc nhiều thiết bị cùng lúc
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        """Chấp nhận kết nối và lưu vào danh sách quản lý theo user_id"""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        """Xóa một kết nối cụ thể khi người dùng đóng tab hoặc mất mạng"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            # Nếu không còn kết nối nào thì xóa luôn key của user đó
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, user_id: int, message: dict):
        """Gửi tin nhắn Realtime cho tất cả các tab/thiết bị của một người dùng cụ thể"""
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # Bỏ qua các kết nối đã chết nhưng chưa kịp xóa
                    pass

    async def broadcast_to_stage(self, db, stage_name: str, message: dict, role_filter: str = None):
        """
        Gửi tin nhắn Realtime cho TOÀN BỘ nhân viên thuộc một Công đoạn cụ thể.
        Có hỗ trợ lọc theo Vai trò (ví dụ: chỉ gửi cho QC hoặc chỉ gửi cho Sản xuất).
        """
        from modules.auth.models.accounts import Account
        from modules.auth.models.departments import Department
        from modules.auth.models.role import Role
        from modules.production.models.stages import Stage
        from sqlalchemy import or_

        # 1. Tìm thông tin Công đoạn để lấy ID (Chấp nhận cả tên viết tắt và mô tả đầy đủ)
        target_stage = db.query(Stage).filter(
            or_(Stage.name == stage_name, Stage.description == stage_name)
        ).first()

        if not target_stage:
            return

        # 2. Truy vấn danh sách AccountID thuộc công đoạn và vai trò phù hợp
        query = db.query(Account.id).join(Department, Account.id == Department.account_id)
        query = query.filter(Department.stage_id == target_stage.id)
        
        if role_filter:
            # Chuẩn hóa từ khóa tìm kiếm (Ví dụ: 'SX' sẽ tìm cả 'Sản xuất', 'QC' tìm cả 'Kiểm tra')
            search_terms = [role_filter]
            if role_filter.upper() == "SX": search_terms.append("Sản xuất")
            if role_filter.upper() == "QC": search_terms.append("Kiểm tra")
            
            conditions = []
            for term in search_terms:
                conditions.append(Role.name.like(f"%{term}%"))
                conditions.append(Role.description.like(f"%{term}%"))
            
            query = query.join(Role, Department.role_id == Role.id).filter(or_(*conditions))
            
        target_user_ids = [r[0] for r in query.all()]

        # 3. Gửi tin nhắn cho những ai đang online
        for uid in target_user_ids:
            await self.send_personal_message(uid, message)

# Khởi tạo instance duy nhất
socket_manager = ConnectionManager()
