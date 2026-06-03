from sqlalchemy.orm import Session
from modules.production.models.product import Product
from modules.production.schemas.product import ProductCreate, ProductUpdate

def get_products(db: Session, skip: int = 0, limit: int = 100):
    """
    Lấy danh sách các sản phẩm từ cơ sở dữ liệu với tính năng phân trang.
    
    Args:
        db: Kết nối cơ sở dữ liệu.
        skip: Số lượng bản ghi bỏ qua.
        limit: Số lượng bản ghi tối đa lấy về.
        
    Returns:
        List[Product]: Danh sách các đối tượng sản phẩm.
    """
    return db.query(Product).order_by(Product.id).offset(skip).limit(limit).all()

def get_product(db: Session, product_id: int):
    """
    Lấy thông tin chi tiết của một sản phẩm dựa trên ID.
    
    Args:
        db: Kết nối cơ sở dữ liệu.
        product_id: ID của sản phẩm cần tìm.
        
    Returns:
        Product: Đối tượng sản phẩm tìm được hoặc None.
    """
    return db.query(Product).filter(Product.id == product_id).first()

def create_product(db: Session, product: ProductCreate):
    """
    Tạo mới một sản phẩm trong hệ thống.
    
    Args:
        db: Kết nối cơ sở dữ liệu.
        product: Dữ liệu sản phẩm mới.
        
    Returns:
        Product: Đối tượng sản phẩm vừa tạo.
    """
    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def update_product(db: Session, product_id: int, product: ProductUpdate):
    """
    Cập nhật thông tin cho một sản phẩm hiện có.
    
    Args:
        db: Kết nối cơ sở dữ liệu.
        product_id: ID của sản phẩm cần cập nhật.
        product: Dữ liệu cập nhật.
        
    Returns:
        Product: Sản phẩm sau khi cập nhật hoặc None nếu không tìm thấy.
    """
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if db_product:
        update_data = product.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_product, key, value)
        db.commit()
        db.refresh(db_product)
    return db_product

def delete_product(db: Session, product_id: int):
    """
    Xóa sản phẩm khỏi cơ sở dữ liệu.
    
    Args:
        db: Kết nối cơ sở dữ liệu.
        product_id: ID của sản phẩm cần xóa.
        
    Returns:
        bool: True nếu xóa thành công, False nếu không tìm thấy.
    """
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if db_product:
        db.delete(db_product)
        db.commit()
        return True
    return False
