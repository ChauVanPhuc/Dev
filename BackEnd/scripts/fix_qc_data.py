import sys
import os
from sqlalchemy import text

# Thêm thư mục BackEnd vào sys.path để import cấu hình và models
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_root = os.path.abspath(os.path.join(current_dir, '..'))
sys.path.append(backend_root)

# Chuyển thư mục làm việc hiện tại sang BackEnd để Pydantic tìm thấy file .env
os.chdir(backend_root)

from config.database import engine

def main():
    print("==================================================================")
    print("   SMARTFLOW - CÔNG CỤ DỌN DẸP / SỬA DỮ LIỆU QC LỊCH SỬ")
    print("==================================================================")
    
    # 1. Kết nối để đọc thông tin (Không giữ transaction trong lúc đợi input)
    affected_count = 0
    with engine.connect() as conn:
        print("\n[1] DANH SÁCH TÀI KHOẢN TRONG HỆ THỐNG:")
        print(f"{'ID':<5} | {'Username':<15} | {'Họ tên hiển thị':<30}")
        print("-" * 60)
        try:
            users = conn.execute(text("SELECT id, username, full_name FROM accounts")).fetchall()
            for u in users:
                print(f"{u[0]:<5} | {u[1]:<15} | {u[2]:<30}")
        except Exception as e:
            print(f"Lỗi khi lấy danh sách tài khoản: {e}")
            return

        print("\n[2] KIỂM TRA SỐ LƯỢNG PHIẾU BỊ ẢNH HƯỞNG BỞI BUG CŨ:")
        try:
            count_sql = text("""
                SELECT COUNT(*) FROM deliveries 
                WHERE qc_receipt = sx_receipt 
                  AND status IN (N'Hoàn thành', N'Trả Hàng', N'Đã Nhận', N'Đã nhận')
            """)
            affected_count = conn.execute(count_sql).scalar()
            print(f"-> Phát hiện {affected_count} phiếu cũ bị ghi đè nhầm tên QC thành tên SX.")
        except Exception as e:
            print(f"Lỗi khi kiểm tra dữ liệu: {e}")
            return

    if affected_count == 0:
        print("Không phát hiện phiếu nào bị sai dữ liệu. Hệ thống của bạn đã sạch!")
        return

    # 2. Hỏi người dùng ngoài khối block connection để tránh khóa DB (Database Lock)
    print("\n[3] PHƯƠNG ÁN XỬ LÝ:")
    print(" - Nhập ID của nhân viên QC (từ danh sách mục [1]) để gán tất cả phiếu cũ cho người này.")
    print(" - HOẶC nhấn Enter (để trống) để chuyển QC về '---' (Đặt qc_receipt = NULL).")
    
    choice = input("\nNhập ID nhân viên QC mong muốn (hoặc Enter để xóa tên QC cũ): ").strip()
    
    # 3. Kết nối lại và thực thi UPDATE trong một Transaction
    if choice == "":
        try:
            with engine.begin() as conn:
                update_sql = text("""
                    UPDATE deliveries 
                    SET qc_receipt = NULL 
                    WHERE qc_receipt = sx_receipt 
                      AND status IN (N'Hoàn thành', N'Trả Hàng', N'Đã Nhận', N'Đã nhận')
                """)
                result = conn.execute(update_sql)
                print(f"\n[OK] Đã cập nhật thành công {result.rowcount} phiếu cũ về trạng thái chưa gán QC (hiển thị '---').")
        except Exception as e:
            print(f"[!] Đã xảy ra lỗi khi xóa tên QC cũ: {e}")
    else:
        try:
            qc_id = int(choice)
            # Kiểm tra xem ID có tồn tại trong bảng accounts không
            with engine.connect() as conn:
                user_exists = conn.execute(text("SELECT id FROM accounts WHERE id = :id"), {"id": qc_id}).fetchone()
                if not user_exists:
                    print(f"[!] Lỗi: Không tìm thấy tài khoản có ID = {qc_id} trong hệ thống.")
                    return
            
            # Thực hiện cập nhật trong transaction tự động commit (engine.begin())
            with engine.begin() as conn:
                update_sql = text("""
                    UPDATE deliveries 
                    SET qc_receipt = :qc_id 
                    WHERE qc_receipt = sx_receipt 
                      AND status IN (N'Hoàn thành', N'Trả Hàng', N'Đã Nhận', N'Đã nhận')
                """)
                result = conn.execute(update_sql, {"qc_id": qc_id})
                print(f"\n[OK] Đã gán thành công {result.rowcount} phiếu cũ cho nhân viên QC có ID = {qc_id}.")
        except ValueError:
            print("[!] Lỗi: Vui lòng nhập một số nguyên hợp lệ cho ID.")
        except Exception as e:
            print(f"[!] Đã xảy ra lỗi khi gán ID QC: {e}")

if __name__ == "__main__":
    main()
