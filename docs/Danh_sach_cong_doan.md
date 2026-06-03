# DANH SÁCH CÔNG ĐOẠN SẢN XUẤT (BOM MASTER)

Tài liệu này tổng hợp toàn bộ các công đoạn (Stages) đang có trong hệ thống dữ liệu gốc (Bảng `master_bom_details`).

---

## 🏭 NHÀ MÁY 1 (NM1)
| Tên Công đoạn                   | Vào (Input) | Ra (Output) | Ghi chú             |
| :------------------------------ | :---------: | :---------: | :------------------ |
| **NM1 - Định hình 1**           |      ✅      |      ✅      | Công đoạn sản xuất  |
| **NM1 - Định hình ván 1**       |      ✅      |      ✅      | Công đoạn sản xuất  |
| **NM1 - Lắp ráp, chà nhám 1**   |      ✅      |      ✅      | Công đoạn sản xuất  |
| **NM1 - Sơn 1**                 |      ✅      |      ✅      | Công đoạn sản xuất  |
| **NM1 - Đóng gói 1**            |      ❌      |      ✅      | Công đoạn hoàn thiện|

---

## 🏭 NHÀ MÁY 2 (NM2)
| Tên Công đoạn                   | Vào (Input) | Ra (Output) | Ghi chú             |
| :------------------------------ | :---------: | :---------: | :------------------ |
| **NM2 - Định hình mặt tiền 2**  |      ✅      |      ✅      | Công đoạn sản xuất  |
| **NM2 - Định hình tủ 2**        |      ✅      |      ✅      | Công đoạn sản xuất  |
| **NM2 - Lắp ráp mặt tiền 2**    |      ✅      |      ✅      | Công đoạn sản xuất  |
| **NM2 - Sơn Pallet 2**          |      ✅      |      ✅      | Công đoạn sản xuất  |
| **NM2 - Sơn treo 2**            |      ✅      |      ✅      | Công đoạn sản xuất  |
| **NM2 - Lắp ráp tủ 2**          |      ❌      |      ✅      | Công đoạn sản xuất  |
| **NM2 - Đóng gói 2**            |      ❌      |      ✅      | Công đoạn hoàn thiện|

---

## 🏭 NHÀ MÁY 3 (NM3)
| Tên Công đoạn                   | Vào (Input) | Ra (Output) | Ghi chú             |
| :------------------------------ | :---------: | :---------: | :------------------ |
| **NM3 - Định hình 3**           |      ✅      |      ✅      | Công đoạn sản xuất  |
| **NM3 - Lắp ráp 3**             |      ✅      |      ✅      | Công đoạn sản xuất  |
| **NM3 - Sơn 3**                 |      ✅      |      ✅      | Công đoạn sản xuất  |
| **NM3 - Tạo phôi 3**            |      ✅      |      ✅      | Công đoạn sản xuất  |
| **NM3 - Đóng gói 3**            |      ❌      |      ✅      | Công đoạn hoàn thiện|

---

### 💡 LƯU Ý CHO QUẢN TRỊ VIÊN:
1.  **Cấu hình tài khoản:** Khi tạo tài khoản cho nhân viên sản xuất, mã công đoạn phải khớp **chính xác 100%** với cột "Tên Công đoạn" ở trên (bao gồm cả dấu gạch ngang và khoảng trắng).
2.  **Lọc dữ liệu trên App:** Hiện tại App Mobile đang ưu tiên lọc theo **Công đoạn vào (Input Stage)**. Nếu một linh kiện không hiện lên, hãy kiểm tra xem linh kiện đó trong BOM đã được gán đúng Công đoạn vào hay chưa.
3.  **Dữ liệu thực tế:** Danh sách này được trích xuất trực tiếp từ Database `Test` vào ngày 29/04/2026.
