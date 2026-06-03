# Luồng Hoạt động Hệ thống Thông báo Đẩy (Detailed Workflow)

Tài liệu này mô tả chi tiết cách thức vận hành của tính năng Thông báo đẩy (Push Notifications) từ lúc thiết bị đăng ký cho đến khi người dùng nhận được tin nhắn trên màn hình khóa.

## sơ đồ quy trình (Sequence Diagram)

```mermaid
sequenceDiagram
    participant Mobile as App Di Động (User QC)
    participant Server as Backend (FastAPI)
    participant FCM as Google Firebase (Cloud)
    participant Production as User Sản Xuất

    Note over Mobile, Server: GIAI ĐOẠN 1: ĐĂNG KÝ (Registration)
    Mobile->>Mobile: Kiểm tra và yêu cầu quyền thông báo
    Mobile->>FCM: Giao tiếp với Google để lấy FCM Token
    FCM-->>Mobile: Cấp mã Token định danh thiết bị
    Mobile->>Server: Gửi Token + UserID (/update-fcm-token)
    Server->>Server: Lưu Token vào bảng 'accounts' trong SQL Server

    Note over Production, Mobile: GIAI ĐOẠN 2: KÍCH HOẠT (Trigger)
    Production->>Server: Nhấn "Tạo phiếu giao hàng" (/deliveries)
    Server->>Server: Lưu thông tin giao hàng
    Server->>Server: Tạo bản ghi thông báo nội bộ (Notifications Table)
    Server->>Server: Tìm danh sách QC dựa trên công đoạn nhận (Stage)
    Server->>Server: Lấy các Token tương ứng từ database

    Note over Server, FCM: GIAI ĐOẠN 3: GỬI TIN (Pushing)
    Server->>FCM: Gọi Firebase Admin SDK (Priority: High)
    FCM-->>Server: Trả về kết quả thành công (Message ID)

    Note over FCM, Mobile: GIAI ĐOẠN 4: HIỂN THỊ (Receipt)
    FCM->>Mobile: Đẩy thông báo xuống khay hệ thống Android
    alt App đang đóng/chạy ngầm
        Mobile->>Mobile: Android hiện thông báo nổi lên màn hình khóa
    else App đang mở
        Mobile->>Mobile: Hiện thông báo và cập nhật Sidebar tin nhắn
    end
```

## Giải thích chi tiết các pha xử lý

### 1. Pha Đăng ký (Registration Phase)
Ngay khi người dùng QC đăng nhập, ứng dụng thực hiện lấy mã Token từ Google Firebase. Mã Token này là "địa chỉ duy nhất" của app trên thiết bị đó. Server lưu địa chỉ này vào cột `fcm_token` của người dùng. Việc này đảm bảo thông báo luôn được gửi đến đúng thiết bị của đúng người dùng.

### 2. Pha Kích hoạt (Trigger Phase)
Khi một phiếu giao hàng được tạo, hệ thống Backend sẽ tự động phân tích:
- **Người gửi là ai?** (Để lấy tên hiển thị).
- **Hàng đi đến đâu?** (Ví dụ: Công đoạn Lắp ráp).
- **Ai là người cần biết?** (Tìm QC của công đoạn Lắp ráp).

### 3. Pha Đẩy tin (Pushing Phase)
Server ERP gửi yêu cầu đến máy chủ Google. Thông tin gửi đi bao gồm:
- **Payload:** Tiêu đề và nội dung tin nhắn.
- **Priority (Ưu tiên):** Thiết lập mức `high` để thông báo có thể vượt qua các trình quản lý pin nghiêm ngặt của Android (giúp hiện tin nhắn kể cả khi đã thoát app).
- **Channel ID:** Sử dụng kênh `default` đã được định nghĩa trong mã nguồn Android để điện thoại nhận diện đúng loại thông báo.

### 4. Pha Nhận tin (Reception Phase)
Đây là bước cuối cùng trên tay người dùng. 
- Nếu điện thoại đang khóa: Thông báo sẽ sáng màn hình và hiển thị cùng âm thanh.
- Nếu người dùng nhấn vào thông báo: App sẽ được kích hoạt để mở ra màn hình chính, giúp người dùng xử lý công việc ngay lập tức.

---
> [!TIP]
> Hệ thống này giúp giảm thiểu thời gian chờ đợi giữa các công đoạn sản xuất, giúp QC luôn nắm bắt được dòng chảy hàng hóa trong nhà máy theo thời gian thực.
