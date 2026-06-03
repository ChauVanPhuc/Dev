import datetime

def get_vietnam_time():
    """
    Trả về thời gian hiện tại theo múi giờ Việt Nam (GMT+7).
    Sử dụng hàm này làm mặc định cho các cột created_at trong Models.
    """
    # Múi giờ Việt Nam là UTC+7
    vietnam_tz = datetime.timezone(datetime.timedelta(hours=7))
    return datetime.datetime.now(vietnam_tz).replace(tzinfo=None) # Bỏ tzinfo để tương thích với SQL Server DateTime
