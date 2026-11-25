# -*- coding: utf-8 -*-
"""
Script xóa sạch dữ liệu:
- Phiếu bàn giao / xuất kho (/warehouse/handover): goods_issue_items, goods_issues
- Phiếu trả về / hàng lỗi (/warehouse/returns): rejected_goods
Và reset identity seeds về 0.
"""
import sys
import os

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from config.database import engine
from sqlalchemy import text


def clear_handover_and_returns():
    print("=" * 60)
    print("XÓA SẠCH DỮ LIỆU PHIẾU BÀN GIAO & PHIẾU TRẢ VỀ")
    print("=" * 60)

    with engine.connect() as conn:
        trans = conn.begin()
        try:
            r1 = conn.execute(text("DELETE FROM goods_issue_items"))
            print(f"1. Đã xóa goods_issue_items: {r1.rowcount} dòng")

            r2 = conn.execute(text("DELETE FROM goods_issues"))
            print(f"2. Đã xóa goods_issues: {r2.rowcount} dòng")

            r3 = conn.execute(text("DELETE FROM rejected_goods"))
            print(f"3. Đã xóa rejected_goods: {r3.rowcount} dòng")

            for tbl in ["goods_issue_items", "goods_issues", "rejected_goods"]:
                conn.execute(text(f"DBCC CHECKIDENT ('{tbl}', RESEED, 0)"))
                print(f"4. Reset Identity Seed '{tbl}' về 0.")

            trans.commit()
            print("=" * 60)
            print("TRANSACTION COMMITTED THÀNH CÔNG!")
            print("=" * 60)
        except Exception as exc:
            trans.rollback()
            print(f"LỖI TRANSACTION, ĐÃ ROLLBACK: {exc}")
            raise


if __name__ == "__main__":
    clear_handover_and_returns()

