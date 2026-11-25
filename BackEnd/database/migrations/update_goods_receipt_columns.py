# -*- coding: utf-8 -*-
"""
Migration script: Bổ sung các cột tài chính và liên kết PO cho phiếu nhập kho (goods_receipts & goods_receipt_items).
"""
import sys
import os

# Đảm bảo đường dẫn import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from config.database import engine
from sqlalchemy import text, inspect

def run_migration():
    insp = inspect(engine)
    gr_cols = {c['name'].lower() for c in insp.get_columns('goods_receipts')}
    gri_cols = {c['name'].lower() for c in insp.get_columns('goods_receipt_items')}

    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # 1. goods_receipts
            if 'total_amount' not in gr_cols:
                print("Adding column total_amount to goods_receipts...")
                conn.execute(text("ALTER TABLE goods_receipts ADD total_amount FLOAT NOT NULL DEFAULT 0.0;"))
            
            if 'updated_by' not in gr_cols:
                print("Adding column updated_by to goods_receipts...")
                conn.execute(text("ALTER TABLE goods_receipts ADD updated_by NVARCHAR(100) NULL;"))

            # 2. goods_receipt_items
            if 'amount' not in gri_cols:
                print("Adding column amount to goods_receipt_items...")
                conn.execute(text("ALTER TABLE goods_receipt_items ADD amount FLOAT NOT NULL DEFAULT 0.0;"))

            if 'unit_price' not in gri_cols:
                print("Adding column unit_price to goods_receipt_items...")
                conn.execute(text("ALTER TABLE goods_receipt_items ADD unit_price FLOAT NOT NULL DEFAULT 0.0;"))

            if 'po_code' not in gri_cols:
                print("Adding column po_code to goods_receipt_items...")
                conn.execute(text("ALTER TABLE goods_receipt_items ADD po_code NVARCHAR(100) NULL;"))

            if 'order_code' not in gri_cols:
                print("Adding column order_code to goods_receipt_items...")
                conn.execute(text("ALTER TABLE goods_receipt_items ADD order_code NVARCHAR(100) NULL;"))

            if 'partner_po' not in gri_cols:
                print("Adding column partner_po to goods_receipt_items...")
                conn.execute(text("ALTER TABLE goods_receipt_items ADD partner_po NVARCHAR(100) NULL;"))

            # Indexes
            indexes = {ix['name'].lower() for ix in insp.get_indexes('goods_receipt_items')}
            if 'ix_goods_receipt_items_po_code' not in indexes:
                print("Creating index IX_goods_receipt_items_po_code...")
                conn.execute(text("CREATE INDEX IX_goods_receipt_items_po_code ON goods_receipt_items(po_code);"))

            trans.commit()
            print("Migration update_goods_receipt_columns completed successfully!")
        except Exception as e:
            trans.rollback()
            print(f"Error executing migration: {e}")
            raise e

if __name__ == '__main__':
    run_migration()

