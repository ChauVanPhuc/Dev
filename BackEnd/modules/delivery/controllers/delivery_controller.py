from sqlalchemy.orm import Session
from modules.delivery.models.deliveries import Delivery
from modules.delivery.schemas.deliveries import DeliveryCreate, DeliveryUpdate

from sqlalchemy.orm import Session
from modules.delivery.models.deliveries import Delivery
from modules.delivery.schemas.deliveries import DeliveryCreate, DeliveryUpdate

def get_deliveries(db: Session, skip: int = 0, limit: int = 100):
    """
    Lấy danh sách các bản ghi giao hàng từ hệ thống.
    
    Args:
        db: Kết nối cơ sở dữ liệu.
        skip: Số lượng bản ghi cần bỏ qua.
        limit: Số lượng bản ghi tối đa lấy về.
        
    Returns:
        List[Delivery]: Danh sách thông tin giao hàng.
    """
    return db.query(Delivery).order_by(Delivery.id).offset(skip).limit(limit).all()

def create_delivery(db: Session, delivery: DeliveryCreate):
    """
    Tạo mới một lệnh giao hàng (Delivery Order).
    
    Hàm này khởi tạo bản ghi giao hàng dựa trên kế hoạch sản xuất 
    hoặc đơn hàng đã hoàn tất.
    
    Args:
        db: Kết nối cơ sở dữ liệu.
        delivery: Dữ liệu giao hàng từ request.
        
    Returns:
        Delivery: Bản ghi giao hàng vừa tạo.
    """
    db_delivery = Delivery(**delivery.model_dump())
    db.add(db_delivery)
    db.commit()
    db.refresh(db_delivery)
    return db_delivery

def update_delivery(db: Session, delivery_id: int, delivery: DeliveryUpdate):
    """
    Cập nhật thông tin giao hàng dựa trên ID.
    
    Thường dùng để cập nhật trạng thái giao hàng (Ví dụ: Đang giao, Đã giao thành công, Thất bại)
    hoặc cập nhật thông tin người vận chuyển, ngày giao thực tế.
    
    Args:
        db: Kết nối cơ sở dữ liệu.
        delivery_id: ID bản ghi giao hàng.
        delivery: Dữ liệu cập nhật.
        
    Returns:
        Delivery: Bản ghi đã cập nhật.
    """
    db_delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if db_delivery:
        update_data = delivery.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_delivery, key, value)
        db.commit()
        db.refresh(db_delivery)
    return db_delivery
