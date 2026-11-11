# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, ForeignKey, Float, DateTime, Boolean
from sqlalchemy.dialects.mssql import NVARCHAR
from sqlalchemy.orm import relationship
from config.database import Base
from shared.utils.timezone import get_vietnam_time


class DailyProductionBatch(Base):
    """
    Model đại diện cho bảng 'daily_production_batches' (Bảng/Lô gộp Cont sản xuất trong ngày - "Hôm nay sản xuất gì").
    Lưu trữ thông tin các Cont con được chọn gộp (VD: APT-0063-03~04; APT-0074-2; 84-4; APT-0123-01~08),
    nhà máy, cụm công đoạn (Mặt tiền, Thùng tủ, Định hình, Lắp ráp, Sơn...) và trạng thái phát hành.
    """
    __tablename__ = "daily_production_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_code = Column(NVARCHAR(100), unique=True, index=True, nullable=False)  # VD: SXN-20261110-001
    plan_date = Column(NVARCHAR(20), index=True, nullable=False)                # YYYY-MM-DD
    factory = Column(NVARCHAR(50), index=True, default="NM2")                   # NM1, NM2, NM3...
    section_name = Column(NVARCHAR(100), index=True, default="MẶT TIỀN")        # MẶT TIỀN, THÙNG TỦ, ĐỊNH HÌNH, LẮP RÁP, SƠN, ĐÓNG GÓI...
    batch_title = Column(NVARCHAR(500), nullable=False)                         # VD: APT-0063-03~04; APT-0074-2; 84-4; APT-0123-01~08
    line_color_summary = Column(NVARCHAR(255), nullable=True)                   # VD: Dòng R/WHT/GRY/MNB-NM2
    selected_orders_json = Column(NVARCHAR(None), nullable=True)                # JSON array các mã Cont con đã chọn gộp
    status = Column(NVARCHAR(30), default="PUBLISHED")                          # DRAFT, PUBLISHED, COMPLETED
    notes = Column(NVARCHAR(500), nullable=True)
    created_by = Column(NVARCHAR(100), nullable=True)
    created_at = Column(DateTime, default=get_vietnam_time)
    updated_at = Column(DateTime, default=get_vietnam_time, onupdate=get_vietnam_time)

    # Quan hệ với danh sách các dòng chi tiết trong bảng
    items = relationship(
        "DailyProductionItem",
        back_populates="batch",
        cascade="all, delete-orphan",
        order_by="DailyProductionItem.sort_order.asc(), DailyProductionItem.id.asc()"
    )


class DailyProductionItem(Base):
    """
    Model đại diện cho bảng 'daily_production_items' (Các dòng Mã tủ & Chi tiết BOM trong bảng "Hôm nay sản xuất gì").
    Cho phép người dùng Custom bật/tắt hiển thị (is_visible), chỉnh sửa số lượng chạy hôm nay (custom_planned_qty),
    sửa ghi chú (note) hoặc thêm dòng chi tiết tự chọn (is_custom_row).
    """
    __tablename__ = "daily_production_items"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("daily_production_batches.id", ondelete="CASCADE"), index=True, nullable=False)

    # Loại dòng: 'CABINET_HEADER' (Dòng tổng Mã tủ VD: R42 | WHT | 10-42 | SL: 120) hoặc 'DETAIL_ITEM' (Dòng chi tiết BOM)
    row_type = Column(NVARCHAR(30), default="DETAIL_ITEM")

    cont_code = Column(NVARCHAR(50), nullable=True)          # Cột CONT / Ký hiệu dòng (VD: R42, R48)
    color_code = Column(NVARCHAR(50), nullable=True)         # Cột MÀU (VD: WHT, GRY, MNB)
    cabinet_code = Column(NVARCHAR(100), nullable=True)      # Mã tủ gốc (VD: 10-42, 10-48)
    stt_code = Column(NVARCHAR(50), nullable=True)           # Cột STT (VD: '10-42' cho Header, hoặc '2', '3', '4', '4.1', '4.2', '8')
    material_name = Column(NVARCHAR(255), nullable=True)     # Cột NGUYÊN LIỆU (VD: Ván Ghép Cao Su, Ván Ép Poplar, Ván MDF)
    item_name = Column(NVARCHAR(255), nullable=True)         # Cột SẢN PHẨM/CHI TIẾT (VD: MẶT HỘC LẬT, MẶT HỘC, CÁNH CỬA, Thanh ngang...)

    # QUY CÁCH TINH (Dày - Rộng - Dài)
    dim_thick = Column(NVARCHAR(50), nullable=True)
    dim_width = Column(NVARCHAR(50), nullable=True)
    dim_length = Column(NVARCHAR(50), nullable=True)

    set_qty = Column(Float, nullable=True, default=1.0)      # Cột SET (Định mức trên 1 tủ)
    base_planned_qty = Column(Integer, default=0)            # SLKH gốc tính tự động (= SET * Tổng SL tủ của các Cont gộp)
    custom_planned_qty = Column(Integer, default=0)          # Cột SLKH thực tế sản xuất hôm nay (người dùng có thể sửa tay)
    completed_qty = Column(Integer, default=0)               # SL đã hoàn thành (phục vụ theo dõi tiến độ)

    is_visible = Column(Boolean, default=True)               # True = Chọn hiển thị hôm nay; False = Ẩn
    is_custom_row = Column(Boolean, default=False)           # True nếu người dùng thêm dòng thủ công ngoài BOM
    source_orders_text = Column(NVARCHAR(500), nullable=True)# Danh sách Cont đóng góp vào mã tủ này
    note = Column(NVARCHAR(500), nullable=True)              # Cột GHI CHÚ (VD: LĂN UV 2 MẶT TRONG TỦ, SƠN LÓT CẠNH)
    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime, default=get_vietnam_time)

    batch = relationship("DailyProductionBatch", back_populates="items")

