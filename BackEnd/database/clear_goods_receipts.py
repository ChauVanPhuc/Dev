# -*- coding: utf-8 -*-
"""
Script xóa sạch dữ liệu Phiếu Nhập Kho (/warehouse/goods-receipt)
Bao gồm:
- goods_receipt_items
- goods_receipts
- warehouse_materials thuộc các kho KVT, KDG, KSON, KHH
Và reset identity seeds về 0 để sẵn sàng cho lần import mới.
"""
import sys
import os

# Thêm thư mục BackEnd vào sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from config.database import engine
from sqlalchemy import text


def clear_goods_receipt_data():
    print("=" * 60)
    print("BẮT ĐẦU XÓA SẠCH DỮ LIỆU PHIẾU NHẬP KHO & VẬT TƯ LIÊN QUAN")
    print("=" * 60)

    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # 1. Xóa chi tiết dòng hàng phiếu nhập
            r1 = conn.execute(text("DELETE FROM goods_receipt_items"))
            print(f"1. Đã xóa goods_receipt_items: {r1.rowcount} dòng")

            # 2. Xóa chứng từ phiếu nhập
            r2 = conn.execute(text("DELETE FROM goods_receipts"))
            print(f"2. Đã xóa goods_receipts: {r2.rowcount} dòng")

            # 3. Dọn dẹp danh mục vật tư phát sinh từ phiếu nhập cũ (KVT, KDG, KSON, KHH)
            r3 = conn.execute(text("DELETE FROM warehouse_materials WHERE warehouse_code IN ('KVT', 'KDG', 'KSON', 'KHH')"))
            print(f"3. Đã xóa warehouse_materials (KVT, KDG, KSON, KHH): {r3.rowcount} dòng")

            # 4. Reset Identity Seed về 0
            for tbl in ['goods_receipt_items', 'goods_receipts']:
                try:
                    conn.execute(text(f"DBCC CHECKIDENT ('{tbl}', RESEED, 0)"))
                    print(f"4. Reset Identity Seed cho bảng '{tbl}' về 0 thành công.")
                except Exception as e:
                    print(f"4. Lưu ý khi reset seed '{tbl}': {e}")

            # Commit transaction
            trans.commit()
            print("=" * 60)
            print("TRANSACTION COMMITTED THÀNH CÔNG! ĐÃ DỌN SẠCH DỮ LIỆU PHIẾU NHẬP.")
            print("=" * 60)

        except Exception as exc:
            trans.rollback()
            print(f"LỖI TRANSACTION, ĐÃ ROLLBACK: {exc}")
            raise exc


if __name__ == '__main__':
    clear_goods_receipt_data()

