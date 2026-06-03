# Nhật ký thay đổi (CHANGELOG)

Tất cả các thay đổi quan trọng đối với dự án ERP G7 sẽ được ghi lại tại đây.

## [2026-04-27] - Cải tiến luồng QC và Hệ thống Tài liệu

### Thay đổi Backend
- **Database**: Thêm cột `quantity_inspection` vào bảng `deliveries` để theo dõi nỗ lực kiểm soát chất lượng thực tế.
- **API**: Cập nhật endpoint `POST /qc/{delivery_id}` hỗ trợ lưu số lượng thực kiểm và tự động đồng bộ trạng thái phiếu.

### Thay đổi Mobile
- **Giao diện**:
    - Tách nhỏ trang `DeliveryReceive.jsx` thành các component: `HandoverTab`, `InspectionChecklist`, `QCSummarySection`, `DeliveryFooter`.
    - Triển khai logic tính toán tự động "Số lượng thực nhận" (Tổng - Lỗi).
    - Áp dụng ràng buộc nhập liệu (Không số âm, tối đa x2 lượng hàng chuẩn).
- **Trải nghiệm người dùng**: Thêm chỉ dẫn công thức tính toán ngay trên giao diện nhận hàng.

### Tài liệu (Documentation)
- Xây dựng hệ thống **Developer Wiki** toàn diện.
- Thêm sơ đồ luồng (Sequence Diagrams) cho các quy trình: Đăng nhập, Bàn giao hàng, và Đồng bộ QC.
- Chi tiết hóa 22 UI Components dùng chung trong Mobile.

---
*Ghi chú: Bản cập nhật này tập trung vào tính ổn định của dữ liệu và khả năng bảo trì mã nguồn.*
