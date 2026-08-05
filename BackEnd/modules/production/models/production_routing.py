from sqlalchemy import Column, Integer, ForeignKey, Boolean, DateTime
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time

class ProductionRouting(Base):
    """
    Model đại diện cho bảng 'production_routings' (Quy trình sản xuất mẫu).
    """
    __tablename__ = "production_routings"

    id = Column(Integer, primary_key=True, index=True)
    routing_code = Column(NVARCHAR(50), nullable=False, unique=True, index=True)
    routing_name = Column(NVARCHAR(255), nullable=False)
    category = Column(NVARCHAR(100), nullable=True)
    category_id = Column(Integer, ForeignKey("master_categories.id"), nullable=True, index=True)
    is_default = Column(Boolean, default=False)
    applied_count = Column(Integer, default=0)
    description = Column(NVARCHAR(500), nullable=True)
    created_at = Column(DateTime, default=get_vietnam_time)

    # Relationships
    nodes = relationship("ProductionRoutingNode", back_populates="routing", cascade="all, delete-orphan", order_by="ProductionRoutingNode.step_order")
    components = relationship("ProductionRoutingComponent", back_populates="routing", cascade="all, delete-orphan")
    routing_products = relationship("ProductionRoutingProduct", back_populates="routing", cascade="all, delete-orphan")
    master_category = relationship("MasterCategory")


class ProductionRoutingNode(Base):
    """
    Model đại diện cho bảng 'production_routing_nodes' (Mắt xích Tổ thuộc Quy trình).
    """
    __tablename__ = "production_routing_nodes"

    id = Column(Integer, primary_key=True, index=True)
    routing_id = Column(Integer, ForeignKey("production_routings.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(Integer, ForeignKey("production_teams.id"), nullable=False)
    step_order = Column(Integer, nullable=False, default=1)
    color = Column(NVARCHAR(20), nullable=True)
    created_at = Column(DateTime, default=get_vietnam_time)

    # Relationships
    routing = relationship("ProductionRouting", back_populates="nodes")
    team = relationship("ProductionTeam", back_populates="nodes")


class ProductionRoutingComponent(Base):
    """
    Model đại diện cho bảng 'production_routing_components' (Gán linh kiện theo cặp Tổ giao / Tổ nhận trong Quy trình).
    """
    __tablename__ = "production_routing_components"

    id = Column(Integer, primary_key=True, index=True)
    routing_id = Column(Integer, ForeignKey("production_routings.id", ondelete="CASCADE"), nullable=False)
    team_code = Column(NVARCHAR(50), nullable=False)
    comp_code = Column(NVARCHAR(100), nullable=False)
    comp_name = Column(NVARCHAR(255), nullable=False)
    next_team_name = Column(NVARCHAR(100), nullable=True)
    qc_required = Column(Boolean, default=True)
    note = Column(NVARCHAR(500), nullable=True)
    created_at = Column(DateTime, default=get_vietnam_time)

    # Relationships
    routing = relationship("ProductionRouting", back_populates="components")


class ProductionRoutingProduct(Base):
    """
    Model đại diện cho bảng 'production_routing_products' (Liên kết gán sản phẩm vào Quy trình).
    """
    __tablename__ = "production_routing_products"

    id = Column(Integer, primary_key=True, index=True)
    routing_id = Column(Integer, ForeignKey("production_routings.id", ondelete="CASCADE"), nullable=False)
    product_sku = Column(NVARCHAR(100), nullable=False, unique=True, index=True)
    created_at = Column(DateTime, default=get_vietnam_time)

    # Relationships
    routing = relationship("ProductionRouting", back_populates="routing_products")

