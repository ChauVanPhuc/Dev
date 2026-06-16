import time

class ActiveDeviceTracker:
    def __init__(self):
        # Dictionary structure: { device_key: {"ip": ip, "user_agent": ua, "type": "web"|"mobile", "last_active": timestamp} }
        self.devices = {}

    def record_activity(self, ip: str, user_agent: str, user_id: str = "Anonymous"):
        if not user_agent:
            user_agent = "Unknown"
        ua_lower = user_agent.lower()
        
        # Phân loại thiết bị dựa trên User-Agent
        device_type = "web"
        if any(keyword in ua_lower for keyword in ["android", "iphone", "ipad", "okhttp", "dart", "mobile"]):
            device_type = "mobile"
        
        # Khóa định danh thiết bị: kết hợp IP, User-Agent rút gọn và User ID
        device_key = f"{user_id}_{ip}_{user_agent[:50]}"
        
        self.devices[device_key] = {
            "user_id": user_id,
            "ip": ip,
            "user_agent": user_agent,
            "type": device_type,
            "last_active": time.time()
        }

    def get_active_counts(self, window_seconds: int = 60):
        """Lấy số lượng thiết bị hoạt động trong khoảng thời gian (mặc định 1 phút)"""
        now = time.time()
        web_count = 0
        mobile_count = 0
        
        stale_keys = []
        for key, info in list(self.devices.items()):
            if now - info["last_active"] > window_seconds:
                stale_keys.append(key)
            else:
                if info["type"] == "mobile":
                    mobile_count += 1
                else:
                    web_count += 1
                    
        # Dọn dẹp thiết bị không còn hoạt động
        for key in stale_keys:
            self.devices.pop(key, None)
            
        return {
            "web": web_count,
            "mobile": mobile_count,
            "total": web_count + mobile_count
        }

# Khởi tạo instance duy nhất sử dụng trong toàn ứng dụng
device_tracker = ActiveDeviceTracker()
