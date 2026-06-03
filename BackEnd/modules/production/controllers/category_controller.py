from sqlalchemy.orm import Session
from modules.production.models.category import Category
from modules.production.schemas.category import CategoryCreate, CategoryUpdate

def get_categories(db: Session, skip: int = 0, limit: int = 100):
    """
    Lấy danh sách các danh mục sản phẩm từ cơ sở dữ liệu.
    
    Args:
        db: Kết nối cơ sở dữ liệu.
        skip: Số lượng bản ghi bỏ qua (phân trang).
        limit: Số lượng bản ghi tối đa lấy về.
        
    Returns:
        List[Category]: Danh sách các đối tượng danh mục.
    """
    return db.query(Category).order_by(Category.id).offset(skip).limit(limit).all()

def create_category(db: Session, category: CategoryCreate):
    """
    Tạo mới một danh mục sản phẩm (ví dụ: Túi giấy, Hộp cứng, Tem nhãn...).
    
    Args:
        db: Kết nối cơ sở dữ liệu.
        category: Dữ liệu danh mục mới từ request.
        
    Returns:
        Category: Đối tượng danh mục vừa được tạo.
    """
    db_category = Category(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def update_category(db: Session, category_id: int, category: CategoryUpdate):
    """
    Cập nhật thông tin của một danh mục đã tồn tại dựa trên ID.
    
    Args:
        db: Kết nối cơ sở dữ liệu.
        category_id: ID của danh mục cần cập nhật.
        category: Dữ liệu cập nhật (chỉ cập nhật các trường được gửi lên).
        
    Returns:
        Category: Đối tượng danh mục sau khi cập nhật, hoặc None nếu không tìm thấy.
    """
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if db_category:
        update_data = category.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_category, key, value)
        db.commit()
        db.refresh(db_category)
    return db_category

def delete_category(db: Session, category_id: int):
    """
    Xóa một danh mục khỏi hệ thống dựa trên ID.
    
    Lưu ý: Việc xóa danh mục có thể ảnh hưởng đến các sản phẩm đang thuộc danh mục đó 
    (tùy thuộc vào cấu hình Constraint trong Database).
    
    Args:
        db: Kết nối cơ sở dữ liệu.
        category_id: ID của danh mục cần xóa.
        
    Returns:
        bool: True nếu xóa thành công, False nếu không tìm thấy ID.
    """
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if db_category:
        db.delete(db_category)
        db.commit()
        return True
    return False
