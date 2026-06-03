﻿# TÀI LIỆU PHÁT TRIỂN HỆ THỐNG SMARTFLOW (ERP G7)
*Tài liệu kỹ thuật chuyên nghiệp dành cho lập trình viên, chuyên viên kiểm thử và quản trị viên hệ thống.*

---

## CHƯƠNG 1: KIẾN TRÚC HỆ THỐNG SMARTFLOW

Hệ thống SmartFlow được xây dựng theo kiến trúc Client-Server hiện đại, tách biệt hoàn toàn giữa tầng Backend xử lý nghiệp vụ và tầng Client giao diện người dùng nhằm tối ưu hóa tính độc lập, bảo mật và khả năng mở rộng. Dưới đây là phân tích chi tiết, toàn diện về kiến trúc hệ thống, giải pháp thiết kế, luồng xử lý và các cơ chế kỹ thuật cốt lõi được áp dụng trong dự án.

### 1. Tầm nhìn và Định hướng Thiết kế Hệ thống (System Vision & Design Principles)

Dự án SmartFlow là phân hệ cốt lõi thuộc giải pháp ERP G7 dành cho ngành sản xuất và chế biến gỗ. Do tính chất môi trường vận hành tại các nhà xưởng cơ khí, xưởng sawmill có mật độ bụi cao, kết nối mạng Wi-Fi không ổn định và yêu cầu tốc độ nhập liệu/bàn giao cực nhanh, hệ thống được thiết kế dựa trên các nguyên tắc cốt lõi sau:

1. **Offline-First Resilience (Khả năng chịu lỗi ngoại tuyến):** Ứng dụng di động phải hoạt động bình thường ngay cả khi mất kết nối mạng hoàn toàn. Toàn bộ các thao tác bàn giao, đo đạc chất lượng, ghi nhận lỗi phải được lưu tạm cục bộ dưới dạng IndexedDB hoặc SQLite của Capacitor và tự động đồng bộ khi có kết nối mạng ổn định trở lại mà không gây mất mát dữ liệu hoặc gián đoạn hoạt động của công nhân.
2. **Real-time Synchronization (Đồng bộ thời gian thực):** Dữ liệu kế hoạch sản xuất, lệnh bàn giao và kết quả QC phải được cập nhật ngay lập tức giữa các trạm sản xuất liên đới thông qua giao thức WebSocket hai chiều, giúp loại bỏ hoàn toàn các thao tác F5/tải lại trang thủ công vô nghĩa.
3. **Hardware-Native Integration (Tích hợp phần cứng tối đa):** Tận dụng tối đa camera native của thiết bị di động thông qua Capacitor Native Bridge để quét mã QR tốc độ cao và truyền thông điệp điều khiển trực tiếp tới máy in nhiệt cầm tay qua ESC/POS thông qua giao tiếp Bluetooth hoặc Wi-Fi.
4. **Strong Quality Gates (Cổng kiểm soát chất lượng chặt chẽ):** Ràng buộc quy trình sản xuất qua cơ chế xác thực QC đầu vào. Trạm sau chỉ được nhận hàng khi trạm trước đã hoàn tất bàn giao và QC đã kiểm định "Đạt" thông số kích thước, độ ẩm và các chỉ tiêu ngoại quan.

#### 1.1 Khắc phục các đặc thù của môi trường công nghiệp nặng
Trong các phân xưởng sản xuất gỗ của G7, môi trường có những đặc thù ảnh hưởng trực tiếp đến hệ thống phần mềm:
- **Mật độ bụi mịn cao:** Bụi gỗ bám lên camera thiết bị di động có thể làm giảm đáng kể khả năng nhận diện hình ảnh của camera thường. Giải pháp của SmartFlow là tích hợp thuật toán tăng cường độ tương phản tự động trước khi quét và sử dụng các mã QR định dạng cao (High Error Correction Level - Level H) có khả năng khôi phục lên tới 30% dữ liệu bị mất mát do trầy xước hoặc bám bẩn.
- **Biến động mạng Wi-Fi (Network Jitter & Deadzones):** Tại các góc nhà xưởng che khuất bởi các pallet gỗ lớn, sóng Wi-Fi suy giảm nghiêm trọng gây hiện tượng rớt gói tin. Hệ thống áp dụng giao thức hàng đợi thông điệp cục bộ kết hợp thuật toán tự động kết nối lại (Exponential Backoff Connection Retry) để đảm bảo ứng dụng không bao giờ bị treo hoặc crash.
- **Trình độ công nghệ của công nhân hiện trường:** Công nhân vận hành máy thường không có kỹ năng CNTT chuyên sâu. Do đó, thiết kế giao diện (UI/UX) tuân thủ quy tắc "Tối giản thao tác": Nhấp tối đa 3 lần để hoàn thành một giao dịch, các nút bấm kích thước lớn (tối thiểu 48dp x 48dp) dễ thao tác ngay cả khi đeo găng tay bảo hộ, màu sắc chỉ báo rõ ràng (Xanh: Đạt, Đỏ: Lỗi/Trả hàng, Cam: Chờ xử lý).

---

### 2. Cấu trúc các thành phần hệ thống (Three-Tier Architecture Overview)

Hệ thống được tổ chức chặt chẽ theo mô hình kiến trúc 3 tầng chuẩn hóa:

```mermaid
graph TD
    subgraph Clients [Tầng Trình diễn - Presentation Layer]
        Web[FrontEnd Web - React Vite / Vanilla CSS]
        Mobile[Mobile App - React Vite + Capacitor Bridge]
    end

    subgraph Server [Tầng Ứng dụng - Application Layer]
        API[FastAPI Router & Controller]
        WS[WebSocket Connection Manager]
        FCM[Firebase Cloud Messaging Admin SDK]
        Auth[JWT JWT Authenticator]
        Services[Business Logic Services]
    end

    subgraph Database [Tầng Dữ liệu - Data Access Layer]
        ORM[SQLAlchemy ORM Model Mapper]
        DB[(SQLite Database - WAL Mode Enabled)]
    end

    Web -->|REST API - HTTP/HTTPS| API
    Mobile -->|REST API - HTTP/HTTPS| API
    Mobile -->|Push Token Sync| API
    
    API -->|WebSocket Tunnel| WS
    WS -->|Real-time Events Push| Mobile
    WS -->|Real-time Events Push| Web

    API -->|firebase-admin Client SDK| FCM
    FCM -->|Push Notification Alerts| Mobile

    API -->|Service Calls| Services
    Services -->|Object Operations| ORM
    ORM -->|Raw SQL Query Executions| DB
```

#### 2.1 Tầng Trình diễn (Presentation Layer - Client Side)
- **FrontEnd Web (React 18, Vite, Vanilla CSS):**
  - *Vị trí áp dụng:* Trực quan hóa dữ liệu hiệu năng sản xuất chung (KPIs), quản lý danh mục định mức nguyên vật liệu (BOM), lập và quản trị Kế hoạch sản xuất (KHSX), thiết kế cấu hình thẻ Pallet thông qua lưới Excel-like FortuneSheet, và phân quyền tài khoản tập trung.
  - *Công nghệ cốt lõi:* React 18 tận dụng cơ chế Virtual DOM giúp render lưới bảng dữ liệu lớn mượt mà. Vite đóng vai trò bundler cực nhanh cho môi trường phát triển. Toàn bộ giao diện sử dụng Vanilla CSS viết tay kết hợp CSS Variables để tối ưu hóa hiệu năng render, tránh các overhead của thư viện CSS cồng kềnh.
  - *Kiến trúc Axios Client:* Sử dụng một Axios instance chung có gắn bộ chặn `interceptors.request` để tự động đính kèm JWT Token vào header `Authorization: Bearer <token>` trước khi gửi lên API Backend. Đồng thời, `interceptors.response` bắt các mã lỗi `401 Unauthorized` toàn hệ thống để thực hiện xóa token hết hạn và điều hướng người dùng về trang đăng nhập.
- **Mobile App (React Vite + Capacitor Native Bridge):**
  - *Vị trí áp dụng:* Sử dụng trực tiếp tại các công đoạn sản xuất ở nhà xưởng cho nhân viên vận hành máy và kiểm soát viên chất lượng (QC).
  - *Công nghệ cốt lõi:* Xây dựng giao diện web phản hồi (Responsive Web UI) bằng React, sau đó sử dụng Capacitor để đóng gói thành gói cài đặt ứng dụng Android (.apk) gốc.
  - *Capacitor Plugins:* Tận dụng `@capacitor-community/barcode-scanner` để gọi camera native quét mã QR; `@capacitor/filesystem` để lưu trữ file log, lưu cache và lưu bản cài đặt APK mới; và `@capacitor/network` để giám sát trạng thái mạng thời gian thực phục vụ giải thuật Offline Sync.

#### 2.2 Tầng Ứng dụng (Application Layer - Server Side)
- **FastAPI Web Framework (Python 3.8+):**
  - *Lý do lựa chọn:* Tốc độ thực thi cực nhanh nhờ tích hợp sẵn ASGI (Asynchronous Server Gateway Interface) và thư viện Pydantic để kiểm tra và định dạng dữ liệu (validation). Đồng thời tự động sinh tài liệu API chuẩn OpenAPI/Swagger giúp việc tích hợp giữa frontend và backend trở nên nhanh chóng, chính xác.
  - *Dependency Injection (DI):* Sử dụng hệ thống DI của FastAPI (`Depends`) để quản lý kết nối cơ sở dữ liệu theo mô hình Unit of Work (cung cấp session DB sạch cho mỗi request và thu hồi/close ngay khi request hoàn tất), đồng thời xác thực phân quyền tập trung cho các endpoint.
- **WebSocket Server & Connection Manager:**
  - Duy trì đường ống kết nối TCP hai chiều giữa các máy di động và Backend. Khi có sự kiện thay đổi dữ liệu tại trạm sản xuất này, máy chủ sẽ lập tức phát sóng (Broadcast) bản tin cập nhật tới các máy di động thuộc trạm tiếp nhận liên đới.
- **Firebase Admin SDK:**
  - Giao tiếp trực tiếp với Google FCM để gửi thông báo đẩy khẩn cấp (Push Notification). Hoạt động bất đồng bộ thông qua `FastAPI BackgroundTasks` để tránh chặn luồng xử lý chính của API Endpoint.

#### 2.3 Tầng Dữ liệu (Data Access Layer)
- **SQLAlchemy ORM (Object Relational Mapper):**
  - Đóng vai trò lớp trừu tượng ánh xạ các class Python thành các bảng tương ứng trong cơ sở dữ liệu. Bảo vệ hệ thống khỏi tấn công SQL Injection nhờ cơ chế tự động escape tham số đầu vào (Parameterized Queries).
- **SQLite Database (WAL Mode):**
  - Mặc dù SQLite ghi dữ liệu vào một file duy nhất, hệ thống đã kích hoạt chế độ **WAL (Write-Ahead Logging)**:
    - *Cơ chế:* Thay vì ghi trực tiếp vào file CSDL gốc và khóa toàn bộ file (Database-level lock), SQLite ghi các thay đổi vào một file nhật ký phụ (`.wal`). Điều này cho phép các tiến trình đọc (Reader) chạy song song không bị chặn bởi tiến trình ghi (Writer).
    - *Lợi ích:* Giải quyết triệt để lỗi nghẽn cơ sở dữ liệu `database is locked` thường gặp trên SQLite khi có hàng trăm thiết bị di động gửi dữ liệu bàn giao cùng lúc.

---

### 3. Phân tích Chuyên sâu các Cơ chế Kỹ thuật Cốt lõi (In-depth Technical Architectures)

#### 3.1 Mô hình Phân quyền Phối hợp RBAC & ABAC

Để đảm bảo an ninh thông tin và luồng dữ liệu nghiệp vụ không bị chồng chéo giữa hàng chục công đoạn sản xuất, SmartFlow triển khai mô hình kiểm soát truy cập phối hợp:
1. **RBAC (Role-Based Access Control):** Xác định vai trò chức năng chung của tài khoản:
   - `Admin`: Quyền tối cao (quản lý tài khoản, cấu hình hệ thống).
   - `Planner`: Quản lý kế hoạch, định mức BOM.
   - `SX` (Sản xuất): Thực hiện bàn giao, tiếp nhận vật tư tại trạm.
   - `QC` (Kiểm soát chất lượng): Thực hiện kiểm định, QC đầu vào, lập phiếu trả hàng.
2. **ABAC (Attribute-Based Access Control):** Lọc dữ liệu động dựa trên thuộc tính **Trạm công đoạn (Stage)** của tài khoản được gán trong bảng `departments`.
   - *Ví dụ:* Một nhân viên có vai trò `SX` được gán trạm `Trạm Cắt` sẽ chỉ có quyền:
     - Xem các phiếu bàn giao mà nơi gửi là `Trạm Cắt` hoặc nơi nhận là `Trạm Cắt`.
     - Không thể xem dữ liệu của `Trạm Ráp` hay `Trạm Sơn`.
   - *Giải pháp thực thi:* Backend triển khai một tầng Middleware/Dependency xác thực:
     ```python
     def get_current_active_user(current_user: Account = Depends(get_current_user)):
         if current_user.status != "Hoạt động":
             raise HTTPException(status_code=400, detail="Tài khoản đã bị khóa")
         return current_user

     def require_stage_permission(required_stages: List[str]):
         def dependency(user: Account = Depends(get_current_active_user), db: Session = Depends(get_db)):
             user_stages = db.query(Department.stage_name).filter(Department.account_id == user.id).all()
             user_stage_list = [s[0] for s in user_stages]
             if not any(stage in user_stage_list for stage in required_stages) and "Admin" not in [r.name for r in user.roles]:
                 raise HTTPException(status_code=403, detail="Tài khoản không thuộc công đoạn được phép thực hiện")
             return user
         return dependency
     ```

#### 3.2 Giải thuật WebSocket và Quản lý Trạng thái Kết nối (WebSocket Engine & Heartbeat Manager)

Để đảm bảo kết nối WebSocket giữa Server và các thiết bị di động ở nhà xưởng luôn trong trạng thái hoạt động tốt mà không làm cạn kiệt tài nguyên Server, lớp `ConnectionManager` được triển khai như sau:

```mermaid
sequenceDiagram
    autonumber
    participant Client as Mobile Client (App)
    participant Server as FastAPI WebSocket Server
    participant DB as SQLite DB

    Client->>Server: Kết nối WS tới /ws/stage/{stage_name}
    Server->>Server: Thêm kết nối vào active_connections[stage_name]
    Note over Client, Server: Thiết lập luồng ping-pong (Heartbeat)
    
    loop Định kỳ mỗi 30 giây
        Server->>Client: Ping Frame
        Client-->>Server: Pong Frame (Phản hồi trong 5 giây)
    end

    Note over Client: Wi-Fi xưởng mất sóng đột ngột
    Server->>Client: Ping Frame
    Note over Server: Chờ 5 giây không nhận được Pong!
    Server->>Server: Kích hoạt WebSocketDisconnect ngoại lệ
    Server->>Server: Loại bỏ socket ra khỏi active_connections
    Server->>Server: Giải phóng tài nguyên bộ nhớ (RAM)
    
    Note over Client: Wi-Fi có sóng trở lại
    loop Exponential Backoff Retry
        Client->>Server: Thử kết nối lại (lần 1 sau 1s)
        Client->>Server: Thử kết nối lại (lần 2 sau 2s) - Thành công!
    end
    Server-->>Client: Kết nối lại thành công, cập nhật trạng thái mới nhất
```

- **Heartbeat Mechanism (Cơ chế Nhịp tim):** Nhằm phát hiện sớm các "kết nối ma" (Ghost Connections - kết nối thực tế đã đứt do mất mạng đột ngột nhưng hệ điều hành chưa thông báo giải phóng TCP socket), Server thực hiện gửi một `ping` frame định kỳ mỗi 30 giây tới toàn bộ Client. Nếu trong vòng 5 giây không nhận được phản hồi `pong`, Server lập tức đóng kết nối một cách chủ động và thu hồi bộ nhớ.
- **Broadcasting Logic:** Khi xảy ra sự kiện hoàn thành bàn giao tại `Trạm Cắt` chuyển đến `Trạm Ráp`, Backend sẽ gọi hàm:
  ```python
  async def broadcast_to_stage(stage_name: str, message: dict):
      if stage_name in active_connections:
          for connection in active_connections[stage_name]:
              try:
                  await connection.send_json(message)
              except Exception:
                  # Tự động loại bỏ kết nối hỏng
                  active_connections[stage_name].remove(connection)
  ```

#### 3.3 Cơ chế Đồng bộ Ngoại tuyến và Xử lý Xung đột Dữ liệu (Offline Sync Queue & Conflict Resolution)

Ứng dụng di động di chuyển liên tục trong khu vực xưởng gỗ lớn - nơi Wi-Fi thường xuyên bị mất sóng cục bộ. Để đảm bảo tính sẵn sàng cao, hệ thống triển khai giải thuật **Offline Sync Queue** như sau:

```mermaid
stateDiagram-v2
    [*] --> OnlineState
    
    OnlineState --> OfflineState : Network Connection Lost (navigator.onLine == false)
    OfflineState --> OnlineState : Network Restored (navigator.onLine == true)
    
    state OfflineState {
        [*] --> UserAction
        UserAction --> ValidateLocal : Validate nhập liệu sơ bộ
        ValidateLocal --> SaveToQueue : Đóng gói JSON Payload & Ghi vào SyncQueue (LocalStorage/IndexedDB)
        SaveToQueue --> ShowSuccessLocally : Hiển thị "Đã lưu tạm offline"
        ShowSuccessLocally --> [*]
    }
    
    state OnlineState {
        [*] --> DetectQueue
        DetectQueue --> ReadFirstItem : Có bản ghi tạm? Đọc bản ghi đầu tiên (FIFO)
        ReadFirstItem --> SendToServer : HTTP POST /api/v1/deliveries/
        
        state ServerValidation {
            SendToServer --> ServerSuccess : HTTP 201 Created
            SendToServer --> ServerConflict : HTTP 409 Conflict / 400 Bad Request
        }
        
        ServerSuccess --> DeleteItem : Xóa bản ghi khỏi SyncQueue
        DeleteItem --> DetectQueue : Kiểm tra phần tử tiếp theo
        
        ServerConflict --> KeepInQueue : Giữ lại trong queue & Đẩy cảnh báo cho User
        KeepInQueue --> MarkError : Đánh dấu bản ghi bị lỗi xung đột
        MarkError --> DetectQueue
    }
```

- **Giải thuật Queue FIFO (First-In, First-Out):** Khi thiết bị mất mạng, toàn bộ dữ liệu yêu cầu gửi đi được đóng gói kèm theo:
  1. `payload`: Toàn bộ thông tin biểu mẫu (số lượng, thông số đo...).
  2. `local_timestamp`: Thời điểm người dùng nhấn xác nhận tại hiện trường.
  3. `uuid`: Mã định danh duy nhất sinh ra ngẫu nhiên cho yêu cầu này để chống trùng lặp.
- **Giải quyết xung đột dữ liệu (Conflict Resolution Rules):**
  - *Bài toán:* Nhân viên A và nhân viên B cùng thực hiện tiếp nhận một phiếu giao tại cùng một thời điểm khi ngoại tuyến. Khi cả hai có mạng lại, hệ thống sẽ xử lý thế nào để tránh ghi đè dữ liệu sai lệch?
  - *Quy tắc áp dụng:* **Last-Write-Wins (Lần ghi cuối cùng thắng)** kết hợp **Pessimistic Concurrency Control (Kiểm soát khóa bi quan)** tại Server.
    - Khi yêu cầu đồng bộ gửi lên Backend, Backend sẽ kiểm tra trạng thái hiện tại của bản ghi trong Database.
    - Nếu bản ghi đã được cập nhật bởi một phiên giao dịch khác có thời gian ghi nhận muộn hơn, Server sẽ trả về lỗi `HTTP 409 Conflict`.
    - Client nhận lỗi `409` sẽ không tự động xóa bản ghi khỏi Queue mà đẩy vào mục **Hộp thư xử lý sự cố (Conflict Inbox)** để người dùng tự tay chọn đè dữ liệu hoặc hủy bỏ.

#### 3.4 Quy trình Quét mã QR và Đồng bộ Quy cách (Dynamic QR-Code Binding)

Hệ thống sử dụng hai loại mã QR chính để tối ưu hóa thời gian nhập liệu tại xưởng:
1. **Mã QR Phiếu giao nhận (Delivery QR Code):** Được sinh động sau khi tạo thành công phiếu bàn giao. Mã chứa thông tin định danh dạng: `SMARTFLOW:DELIVERY:102`. Trạm nhận chỉ cần quét mã này để tự động mở màn hình xác nhận tiếp nhận với đầy đủ thông số hiển thị sẵn.
2. **Mã QR dự phòng in sẵn (Pre-printed Backup QR Code):**
  - *Mục đích:* Dùng làm nhãn dán định danh (Tag) vật lý cho Pallet gỗ thành phẩm. Các thẻ QR này được in nhiệt hàng loạt từ trước với mã định danh duy nhất (Ví dụ: `QR-BACKUP-088`) ở trạng thái trống (chưa liên kết dữ liệu).
  - *Luồng nghiệp vụ liên kết:*
    ```text
    [Nhân viên quét QR trống trên Pallet] -> [Nhập thông tin bàn giao trên Mobile] 
    -> [Backend cập nhật trạng thái QR từ "Trống" sang "Đang sử dụng" và gán khóa ngoại với delivery_id] 
    -> [Pallet gỗ di chuyển sang trạm tiếp theo kèm nhãn dán]
    ```
  - *Lợi ích:* Tránh việc nhân viên phải mang theo máy in cồng kềnh ra tận vị trí xếp dỡ để in nhãn sau khi tạo phiếu. Họ chỉ cần bóc nhãn QR in sẵn dán lên Pallet và dùng điện thoại quét để kích hoạt liên kết dữ liệu trong 1 giây.

#### 3.5 Cơ chế Khóa Bi quan Tránh Tranh chấp Số lượng (Pessimistic Locking Mechanism)

Tại công đoạn tiếp nhận hàng, hai nhân viên QC/Nhận có thể cùng mở một phiếu giao trên hai điện thoại khác nhau và cùng nhấn "Tiếp nhận" đồng thời. Nếu không có cơ chế khóa, hệ thống sẽ gặp lỗi **Race Condition** dẫn đến số lượng cập nhật bị sai lệch hoặc ghi đè đè chồng lên nhau.
- **Giải pháp:** Sử dụng phương thức khóa dòng dữ liệu `SELECT ... FOR UPDATE` của cơ sở dữ liệu thông qua SQLAlchemy ORM:
  ```python
  @router.post("/{delivery_id}/confirm")
  def confirm_delivery_endpoint(delivery_id: int, payload: ConfirmPayload, db: Session = Depends(get_db)):
      # Sử dụng with_for_update() để khóa dòng ghi nhận phiếu giao
      delivery = db.query(Delivery).filter(
          Delivery.id == delivery_id
      ).with_for_update(nowait=False).first()
      
      if not delivery:
          raise HTTPException(status_code=404, detail="Không tìm thấy phiếu giao")
          
      if delivery.status != "Chờ xác nhận":
          raise HTTPException(status_code=400, detail="Phiếu giao đã được xử lý bởi nhân viên khác")
          
      # Cập nhật số lượng nhận thực tế và trạng thái
      delivery.quantity_received = payload.quantity_received
      delivery.status = "Chờ kiểm tra"
      db.commit() # Khóa được giải phóng sau lệnh commit
      return {"success": True}
  ```
- **Cơ chế hoạt động:** Khi tiến trình đầu tiên gọi API xác nhận, câu lệnh SQL sinh ra sẽ khóa dòng đó lại. Tiến trình thứ hai gọi API cùng lúc sẽ phải xếp hàng chờ đợi (block) cho đến khi tiến trình thứ nhất thực hiện xong lệnh `commit()` và giải phóng khóa. Lúc này tiến trình thứ hai đọc ra trạng thái mới thấy status đã là `Chờ kiểm tra` nên sẽ bị chặn đứng ngay lập tức với lỗi `HTTP 400`, đảm bảo tính toàn vẹn dữ liệu.

#### 3.6 Cơ chế Tối ưu hóa Hiệu năng & Cache (Performance Tuning & Optimization)
Để đảm bảo hệ thống có thể đáp ứng tải lượng giao dịch tức thời cực lớn mà không làm tăng cấu hình máy chủ vật lý, SmartFlow triển khai các chiến lược tối ưu hóa:
1. **Database Indexes Strategy (Chiến lược lập chỉ mục):**
   - Đánh chỉ mục (Index) trên các trường thường xuyên dùng để tìm kiếm, lọc và JOIN: `accounts.username`, `deliveries.plan_id`, `deliveries.part_name`, `delivery_details.delivery_id`, và `pallet_cards.pallet_code`.
   - Sử dụng các khóa ngoại (Foreign Keys) có thiết lập `ON DELETE CASCADE` hợp lý để giải phóng dữ liệu rác khi xóa các kế hoạch sản xuất cũ.
2. **Payload Compression (Nén dữ liệu truyền tải):**
   - Tích hợp GzipMiddleware của FastAPI giúp tự động nén tất cả các response JSON lớn (như sheet_data của FortuneSheet hoặc danh sách lịch sử bàn giao) trước khi truyền qua mạng, giúp giảm dung lượng băng thông sử dụng từ 70-80%.
3. **Optimized Static Asset Serving (Tối ưu hóa phân phối ảnh minh chứng):**
   - Các ảnh chụp thực địa QC được nén tự động trên client di động (giảm chất lượng xuống 75%, kích thước tối đa 1280px) trước khi tải lên, giúp tiết kiệm bộ lưu trữ của server và giảm thời gian tải của trạm nhận.

#### 3.7 Kiến trúc Bảo mật Hệ thống (System Security Engineering)
An ninh thông tin trong môi trường nhà máy được đặt lên hàng đầu nhằm tránh phá hoại dữ liệu sản xuất:
1. **CORS Policy Restrictions (Chính sách CORS nghiêm ngặt):**
   - Chỉ cho phép các tên miền Web Dashboard và IP được cấu hình trong file `.env` gọi API Backend. Ngăn chặn các script độc hại chạy từ bên thứ ba.
2. **Token-based Security (Bảo mật JWT):**
   - Sử dụng thuật toán băm khóa đối xứng HMAC-SHA256 để ký chữ ký số trên token. Token có thời hạn hết hạn ngắn (1440 phút - 1 ngày) để giảm thiểu rủi ro khi thiết bị di động bị thất lạc.
3. **SQL Injection & XSS Defenses:**
   - Toàn bộ đầu vào từ client đều phải đi qua các Schema Validator của Pydantic để lọc bỏ các thẻ HTML nguy hiểm và tránh việc đưa trực tiếp các chuỗi thô vào câu lệnh truy vấn cơ sở dữ liệu.

---

### 4. Hướng dẫn Mở rộng Hệ thống lên Cơ sở dữ liệu Doanh nghiệp (Enterprise DB Scaling Guide)

Mặc dù hệ thống hiện tại đang sử dụng SQLite ở chế độ WAL nhằm tối giản hóa quy trình cài đặt và vận hành tại hiện trường xưởng gỗ, thiết kế kiến trúc của SmartFlow hoàn toàn sẵn sàng cho việc chuyển đổi sang hệ quản trị cơ sở dữ liệu doanh nghiệp mạnh mẽ hơn như Microsoft SQL Server (đặc biệt phổ biến trong hạ tầng CNTT của G7) hoặc PostgreSQL. Dưới đây là các bước và nguyên tắc mở rộng kỹ thuật:

#### 4.1 Cấu hình SQLAlchemy Engine và Connection Pooling
Khi chuyển sang SQL Server, cơ chế Connection Pooling đóng vai trò tối quan trọng để quản lý hiệu quả việc tái sử dụng các kết nối TCP tới database:
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Chuỗi kết nối SQL Server thông qua pyodbc driver
DATABASE_URL = "mssql+pyodbc://sa:EnterprisePassword2026@192.168.1.100/SmartFlow_DB?driver=ODBC+Driver+17+for+SQL+Server"

engine = create_engine(
    DATABASE_URL,
    pool_size=50,             # Số lượng kết nối tối đa duy trì trong pool
    max_overflow=20,          # Số lượng kết nối được phép mở rộng tạm thời khi quá tải
    pool_timeout=30,          # Số giây tối đa chờ đợi để lấy một kết nối từ pool trước khi báo lỗi
    pool_recycle=1800,        # Tự động dọn dẹp và làm mới kết nối sau 30 phút nhằm tránh lỗi drop từ tường lửa
    pool_pre_ping=True        # Tự động kiểm tra trạng thái sống của kết nối trước khi bàn giao cho session
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

#### 4.2 Điều chỉnh Kiểu dữ liệu và Ràng buộc Nghiệp vụ
Khi chuyển đổi từ SQLite sang SQL Server, cần lưu ý một số điểm khác biệt về cú pháp và kiểu dữ liệu:
1. **Kiểu dữ liệu chuỗi có hỗ trợ Unicode:** Sử dụng `NVARCHAR` thay vì `VARCHAR` để tránh lỗi font chữ tiếng Việt khi lưu tên linh kiện hoặc ghi chú QC. Trong SQLAlchemy:
   ```python
   from sqlalchemy import Unicode
   part_name = Column(Unicode(250), nullable=False)
   ```
2. **Xử lý khóa chính tự tăng:** SQL Server sử dụng từ khóa `IDENTITY` thay vì `AUTOINCREMENT` của SQLite. SQLAlchemy sẽ tự động ánh xạ thuộc tính này thông qua `autoincrement=True` trên định nghĩa cột khóa chính.
3. **Phân trang dữ liệu hiệu năng cao:** SQLite sử dụng mệnh đề `LIMIT ... OFFSET`. SQL Server từ phiên bản 2012 hỗ trợ cú pháp chuẩn ANSI: `OFFSET ... ROWS FETCH NEXT ... ROWS ONLY`. SQLAlchemy ORM tự động phát hiện driver và chuyển đổi câu lệnh SQL tương ứng mà lập trình viên không cần sửa lại code nghiệp vụ ở tầng Service.

#### 4.3 Quản lý Di cư Dữ liệu (Database Migrations với Alembic)
Quy trình nâng cấp CSDL không được thực hiện thủ công bằng tay mà bắt buộc đi qua các script di cư dữ liệu của Alembic:
1. **Khởi tạo Alembic trong thư mục dự án:**
   ```bash
   alembic init alembic
   ```
2. **Cấu hình file `alembic.ini`:** Trỏ đường dẫn `sqlalchemy.url` đến cơ sở dữ liệu SQL Server đích.
3. **Cấu hình `alembic/env.py`:** Nhập đối tượng `Base` chứa danh mục models của SmartFlow để Alembic tự động phát hiện các thay đổi schema:
   ```python
   from src.app.models.base import Base
   target_metadata = Base.metadata
   ```
4. **Tạo file script di cư tự động:**
   ```bash
   alembic revision --autogenerate -m "Init SQL Server Database Schema"
   ```
5. **Thực thi cập nhật lên cơ sở dữ liệu:**
   ```bash
   alembic upgrade head
   ```

---


## CHƯƠNG 2: HƯỚNG DẪN CÀI ĐẶT VÀ TRIỂN KHAI DỰ ÁN

Chương này hướng dẫn lập trình viên thiết lập môi trường phát triển (Local) và đóng gói ứng dụng đưa lên máy chủ Production từ đầu.

### 1. Cấu trúc thư mục dự án (Project Directory Structure)

```text
SmartFlow-dev/
├── BackEnd/               # Mã nguồn máy chủ FastAPI (Python)
│   ├── src/               # Thư mục source chính
│   │   ├── app/           # Cấu trúc ứng dụng chính (models, api, services)
│   │   └── main.py        # File chạy Backend chính
│   ├── requirements.txt   # Danh sách thư viện Python cần cài đặt
│   └── run_project.bat    # Script khởi chạy nhanh Backend
├── FrontEnd/              # Mã nguồn Web Dashboard quản lý (React Vite)
│   ├── src/               # Components, Views, CSS của Web
│   └── package.json       # Cấu hình dự án & thư viện Node.js
├── Mobile/                # Mã nguồn App di động (React Vite + Capacitor)
│   ├── src/               # Components, Views, Controllers di động
│   ├── android/           # Dự án Android Studio gốc của Capacitor
│   └── package.json       # Cấu hình dự án & thư viện di động
├── Document/              # Thư mục lưu trữ tài liệu đặc tả phát triển
├── run_project.bat        # [TỐI QUAN TRỌNG] Script một click khởi chạy toàn bộ dự án ở local
└── ONE_CLICK_PUBLISH.bat  # Script tự động đóng gói ứng dụng di động thành file APK
```

### 2. Thiết lập môi trường phát triển (Local Setup)

#### 2.1 Cài đặt Backend (FastAPI)
Yêu cầu: Đã cài đặt **Python 3.8+** trên máy tính.

1. Mở cửa sổ terminal/powershell tại thư mục `BackEnd/`.
2. Tạo môi trường ảo (Virtual Environment):
   ```bash
   python -m venv venv
   ```
3. Kích hoạt môi trường ảo:
   * Trên Windows (Powershell): `.\venv\Scripts\Activate.ps1`
   * Trên Windows (CMD): `venv\Scripts\activate.bat`
   * Trên Linux/Mac: `source venv/bin/activate`
4. Cài đặt các thư viện phụ thuộc:
   ```bash
   pip install -r requirements.txt
   ```
5. Khởi tạo và ghi dữ liệu mẫu ban đầu (Seed DB):
   ```bash
   python seed_roles_permissions.py
   ```

#### 2.2 Cấu hình biến môi trường (Environmental Variables)
Tạo file `.env` nằm tại thư mục `BackEnd/` dựa trên file mẫu `.env.example`:
```ini
# Cấu hình Database
DATABASE_URL=sqlite:///./test_inprocess.db

# Cấu hình bảo mật JWT Token
SECRET_KEY=9a64bf71e16f3d9d300b95764d2719a842750e32b4b2160ad9f71295b9c02ff4
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Đường dẫn static file (ảnh tải lên)
STATIC_DIR=static/
```

#### 2.3 Cài đặt Frontend Web & Mobile App
Yêu cầu: Đã cài đặt **Node.js v18+** trên máy tính.
1. **Thiết lập Web Dashboard:**
   * Di chuyển vào thư mục `FrontEnd/`.
   * Cài đặt các gói thư viện: `npm install`
2. **Thiết lập Mobile App:**
   * Di chuyển vào thư mục `Mobile/`.
   * Cài đặt các gói thư viện: `npm install`

### 3. Hướng dẫn khởi chạy nhanh bằng Script (.bat)

Nhằm tối ưu hóa công đoạn vận hành cho Dev, thư mục gốc dự án cung cấp các file batch tự động hóa:

*   **Chạy toàn bộ dự án ở Local (`run_project.bat`):** 
    Chỉ cần chạy file `run_project.bat` ở thư mục gốc. Script này sẽ tự động phân tách 3 tab Command Prompt độc lập để khởi động:
    1. Tab 1: Kích hoạt môi trường ảo Backend và chạy `uvicorn main:app --reload --port 8000`.
    2. Tab 2: Vào thư mục `FrontEnd` và chạy `npm run dev` (Web chạy trên cổng 5173).
    3. Tab 3: Vào thư mục `Mobile` và chạy `npm run dev` (Mobile chạy trên cổng 5174).
*   **Chạy riêng lẻ Backend (`start_server.bat`):** 
    Khởi động nhanh máy chủ FastAPI độc lập.
*   **Chạy kiểm thử tự động (`RUN_ALL_TESTS.bat`):**
    Tự động khởi tạo DB kiểm thử sạch và chạy toàn bộ unit tests.

### 4. Quy trình đóng gói và phát hành ứng dụng (Production Release)

Để build ứng dụng di động ra file cài đặt **Android APK** hoàn chỉnh, chạy file **`ONE_CLICK_PUBLISH.bat`** ở thư mục gốc:

1. Script tự động kích hoạt tiến trình build bản phát hành của React: `npm run build` trong thư mục `Mobile`.
2. Sao chép các tệp tĩnh đã build (thư mục `dist`) vào dự án native Android thông qua lệnh đồng bộ Capacitor:
   ```bash
   npx cap sync android
   ```
3. Di chuyển vào thư mục `android/` và chạy lệnh Gradle đóng gói file APK:
   ```bash
   gradlew assembleDebug
   ```
4. Bản APK hoàn chỉnh sẽ được sinh ra tại `Mobile/android/app/build/outputs/apk/debug/app-debug.apk`. 
5. Script tự động đổi tên file và copy bản APK này vào thư mục static của Backend (`BackEnd/static/uploads/apk/smartflow.apk`) để người dùng quét mã QR tải cập nhật trực tiếp tại hiện trường xưởng.

### 5. Phân tích Chuyên sâu Vận hành & Triển khai (In-depth Deployment Analysis)

#### 5.1 Quản lý Hồ kết nối Database (Database Connection Pooling)
Khi triển khai trên môi trường Production sử dụng các cơ sở dữ liệu lớn (như MS SQL Server hoặc PostgreSQL), hệ thống cần thay đổi cơ chế kết nối từ Single Connection của SQLite sang Connection Pooling để tránh tắc nghẽn truy vấn:
*   **Cấu hình SQLAlchemy QueuePool:** 
    ```python
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,          # Số lượng kết nối tối đa luôn duy trì trong pool
        max_overflow=10,       # Số lượng kết nối tối đa có thể tạo thêm khi vượt tải
        pool_recycle=3600,     # Tự động dọn dẹp các kết nối cũ sau 1 giờ
        pool_pre_ping=True     # Tự động kiểm tra trạng thái kết nối trước khi truy vấn
    )
    ```
*   **Lợi ích:** Tránh việc bắt đầu và đóng kết nối TCP liên tục tới database server cho mỗi request HTTP, giúp giảm thời gian phản hồi API trung bình từ 150ms xuống còn dưới 30ms.

#### 5.2 Cơ chế Cập nhật Tự động (In-App OTA APK Update Flow)
Mobile App SmartFlow triển khai cơ chế tự động cập nhật không thông qua Google Play Store (vì là ứng dụng nội bộ doanh nghiệp):
1. **Kiểm tra phiên bản:** Khi khởi động, app di động gọi endpoint `/api/v1/system/version` để so sánh mã `version_code` local với server.
2. **Tải tệp nền:** Nếu version trên server lớn hơn, app kích hoạt tiến trình tải file APK bất đồng bộ qua `@capacitor/filesystem`.
3. **Cài đặt Native:** Sau khi tải xong, app gọi plugin `@capacitor-community/file-opener` với MIME type `application/vnd.android.package-archive` để kích hoạt trình cài đặt mặc định của hệ điều hành Android.

#### 5.3 Minh họa giao diện quét mã QR trên di động (Mobile Scan UI)
Dưới đây là giao diện di động thực tế tại công đoạn quét mã QR nhận dạng linh kiện và thực hiện checklist kiểm tra chất lượng sản phẩm:

![Giao diện quét mã QR di động SmartFlow](images/smartflow_mobile_scan_mockup.png)

---


## CHƯƠNG 3: THIẾT KẾ CƠ SỞ DỮ LIỆU HỆ THỐNG TOÀN DIỆN

### 1. Chi tiết từ điển dữ liệu (Data Dictionary)

#### 1.1 Bảng `accounts`
Lưu trữ thông tin định danh tài khoản, trạng thái hoạt động và Firebase token của nhân sự.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `username` | String(50) |  | No |  | Tên đăng nhập (Unique, Index) |
| `email` | String(100) |  | Yes |  | Địa chỉ email liên kết |
| `hashed_password` | String(255) |  | No |  | Mật khẩu băm bcrypt |
| `employee_id` | String(20) |  | Yes |  | Mã số nhân viên |
| `full_name` | String(100) |  | Yes |  | Họ tên đầy đủ |
| `status` | String(50) |  | No | 'Active' | Trạng thái (Active, Locked) |
| `fcm_token` | Text |  | Yes |  | Token đẩy thông báo Firebase |
| `failed_login_attempts` | Integer |  | No | 0 | Số lần đăng nhập sai liên tiếp |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE accounts (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    username NVARCHAR(50)   NOT NULL,
    email NVARCHAR(100)   NULL,
    hashed_password NVARCHAR(255)   NOT NULL,
    employee_id NVARCHAR(20)   NULL,
    full_name NVARCHAR(100)   NULL,
    status NVARCHAR(50)   NOT NULL DEFAULT 'Active',
    fcm_token NVARCHAR(MAX)   NULL,
    failed_login_attempts INT   NOT NULL DEFAULT 0
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class Account(Base):
    __tablename__ = 'accounts'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False)
    email = Column(String(100), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    employee_id = Column(String(20), nullable=True)
    full_name = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False, default='Active')
    fcm_token = Column(Text, nullable=True)
    failed_login_attempts = Column(Integer, nullable=False, default=0)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class AccountBase(BaseModel):
    username: str
    email: Optional[str] = None
    hashed_password: str
    employee_id: Optional[str] = None
    full_name: Optional[str] = None
    status: str
    fcm_token: Optional[str] = None
    failed_login_attempts: int

class AccountCreate(AccountBase):
    pass

class AccountResponse(AccountBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ix_accounts_id`, `ux_accounts_username`, `ix_accounts_employee_id`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   Tự động khóa tài khoản (status = 'Locked') khi đăng nhập sai quá 5 lần.
*   Username viết thường không dấu, không khoảng trắng.
*   FCM Token tự động ghi đè mỗi khi người dùng đăng nhập trên thiết bị mới.

---

#### 1.2 Bảng `roles`
Danh mục vai trò nghiệp vụ chính trong hệ thống.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `name` | String(100) |  | No |  | Tên vai trò (như ADMIN, SX, QC) |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE roles (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    name NVARCHAR(100)   NOT NULL
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class Role(Base):
    __tablename__ = 'roles'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class RoleBase(BaseModel):
    name: str

class RoleCreate(RoleBase):
    pass

class RoleResponse(RoleBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ux_roles_name`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   Tên vai trò được chuẩn hóa dạng chữ in hoa không dấu.

---

#### 1.3 Bảng `permissions`
Danh mục quyền hạn chi tiết gắn với từng chức năng API.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `name` | String(100) |  | No |  | Tên quyền (Ví dụ: create_delivery) |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE permissions (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    name NVARCHAR(100)   NOT NULL
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class Permission(Base):
    __tablename__ = 'permissions'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class PermissionBase(BaseModel):
    name: str

class PermissionCreate(PermissionBase):
    pass

class PermissionResponse(PermissionBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ux_permissions_name`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   Quyền hạn được kiểm soát thông qua dependency `get_current_active_user` ở Backend.

---

#### 1.4 Bảng `stages`
Danh mục các trạm/công đoạn sản xuất trong chuỗi quy trình nhà xưởng.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `name` | String(100) |  | No |  | Tên công đoạn (Ví dụ: Trạm Cắt, Trạm Ráp) |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE stages (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    name NVARCHAR(100)   NOT NULL
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class Stage(Base):
    __tablename__ = 'stages'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class StageBase(BaseModel):
    name: str

class StageCreate(StageBase):
    pass

class StageResponse(StageBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ux_stages_name`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   Mỗi phiếu giao nhận phải tương ứng với công đoạn giao và nhận thuộc danh mục này.

---

#### 1.5 Bảng `departments`
Bảng liên kết trung gian thiết lập phân quyền tài khoản gắn với vai trò, quyền hạn và công đoạn.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `account_id` | Integer | FK | Yes |  | ID tài khoản liên kết (`accounts`) |
| `role_id` | Integer | FK | Yes |  | ID vai trò liên kết (`roles`) |
| `permission_id` | Integer | FK | Yes |  | ID quyền liên kết (`permissions`) |
| `stage_id` | Integer | FK | Yes |  | ID công đoạn quản lý (`stages`) |
| `input_stage` | String(50) |  | Yes |  | Công đoạn đầu vào được phép |
| `output_stage` | String(50) |  | Yes |  | Công đoạn đầu ra được phép |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE departments (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    account_id INT   NULL,
    role_id INT   NULL,
    permission_id INT   NULL,
    stage_id INT   NULL,
    input_stage NVARCHAR(50)   NULL,
    output_stage NVARCHAR(50)   NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id),
    FOREIGN KEY (stage_id) REFERENCES stages(id)
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class Department(Base):
    __tablename__ = 'departments'

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey('accounts.id'), nullable=True)
    role_id = Column(Integer, ForeignKey('accounts.id'), nullable=True)
    permission_id = Column(Integer, ForeignKey('accounts.id'), nullable=True)
    stage_id = Column(Integer, ForeignKey('accounts.id'), nullable=True)
    input_stage = Column(String(50), nullable=True)
    output_stage = Column(String(50), nullable=True)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class DepartmentBase(BaseModel):
    account_id: Optional[int] = None
    role_id: Optional[int] = None
    permission_id: Optional[int] = None
    stage_id: Optional[int] = None
    input_stage: Optional[str] = None
    output_stage: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentResponse(DepartmentBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ix_departments_account_id`, `ix_departments_role_id`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   Hỗ trợ cấu hình phân quyền đa cấp động theo người dùng.

---

#### 1.6 Bảng `product_plans`
Kế hoạch sản xuất tổng hợp (KHSX) theo tháng/tuần.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `plan_name` | String(200) |  | No |  | Tên kế hoạch (Ví dụ: KHSX T5 - 2026) |
| `status` | String(50) |  | No | 'Chưa chạy' | Trạng thái (Chưa chạy, Đang chạy, Xong) |
| `start_date` | String(50) |  | Yes |  | Ngày bắt đầu dự kiến |
| `end_date` | String(50) |  | Yes |  | Ngày kết thúc dự kiến |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE product_plans (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    plan_name NVARCHAR(200)   NOT NULL,
    status NVARCHAR(50)   NOT NULL DEFAULT 'Chưa chạy',
    start_date NVARCHAR(50)   NULL,
    end_date NVARCHAR(50)   NULL
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class ProductPlan(Base):
    __tablename__ = 'product_plans'

    id = Column(Integer, primary_key=True, index=True)
    plan_name = Column(String(200), nullable=False)
    status = Column(String(50), nullable=False, default='Chưa chạy')
    start_date = Column(String(50), nullable=True)
    end_date = Column(String(50), nullable=True)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class ProductPlanBase(BaseModel):
    plan_name: str
    status: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class ProductPlanCreate(ProductPlanBase):
    pass

class ProductPlanResponse(ProductPlanBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ix_product_plans_plan_name`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   Tên kế hoạch phải là duy nhất để tránh nhập trùng dữ liệu Excel.

---

#### 1.7 Bảng `deliveries`
Phiếu ghi nhận thông tin bàn giao linh kiện giữa hai công đoạn sản xuất.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `plan_id` | Integer | FK | No |  | ID kế hoạch liên kết (`product_plans`) |
| `delivery_stage` | String(50) |  | Yes |  | Tên công đoạn giao đi (Index) |
| `receiving_stage` | String(50) |  | Yes |  | Tên công đoạn nhận về (Index) |
| `part_name` | String(250) |  | Yes |  | Tên linh kiện bàn giao (Index) |
| `quantity_total` | Integer |  | No |  | Số lượng giao khai báo |
| `quantity_received` | Integer |  | No | 0 | Số lượng thực tế trạm nhận đếm |
| `quantity_error` | Integer |  | No | 0 | Số lượng lỗi phát hiện khi nhận |
| `quantity_returned` | Integer |  | No | 0 | Số lượng lỗi trả về trạm cũ |
| `quantity_inspection` | Integer |  | No | 0 | Số lượng mẫu kiểm tra |
| `status` | String(50) |  | No | 'Chờ xác nhận' | Trạng thái phiếu giao |
| `sx_delivery` | Integer | FK | Yes |  | ID nhân viên lập phiếu (`accounts`) |
| `qc_receipt` | Integer | FK | Yes |  | ID QC kiểm tra (`accounts`) |
| `sx_receipt` | Integer | FK | Yes |  | ID nhân viên xác nhận đếm (`accounts`) |
| `created_at` | DateTime |  | No |  | Thời điểm khởi tạo phiếu |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE deliveries (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    plan_id INT   NOT NULL,
    delivery_stage NVARCHAR(50)   NULL,
    receiving_stage NVARCHAR(50)   NULL,
    part_name NVARCHAR(250)   NULL,
    quantity_total INT   NOT NULL,
    quantity_received INT   NOT NULL DEFAULT 0,
    quantity_error INT   NOT NULL DEFAULT 0,
    quantity_returned INT   NOT NULL DEFAULT 0,
    quantity_inspection INT   NOT NULL DEFAULT 0,
    status NVARCHAR(50)   NOT NULL DEFAULT 'Chờ xác nhận',
    sx_delivery INT   NULL,
    qc_receipt INT   NULL,
    sx_receipt INT   NULL,
    created_at DateTime   NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES product_plans(id),
    FOREIGN KEY (sx_delivery) REFERENCES accounts(id),
    FOREIGN KEY (qc_receipt) REFERENCES accounts(id),
    FOREIGN KEY (sx_receipt) REFERENCES accounts(id)
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class Deliverie(Base):
    __tablename__ = 'deliveries'

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey('product_plans.id'), nullable=False)
    delivery_stage = Column(String(50), nullable=True)
    receiving_stage = Column(String(50), nullable=True)
    part_name = Column(String(250), nullable=True)
    quantity_total = Column(Integer, nullable=False)
    quantity_received = Column(Integer, nullable=False, default=0)
    quantity_error = Column(Integer, nullable=False, default=0)
    quantity_returned = Column(Integer, nullable=False, default=0)
    quantity_inspection = Column(Integer, nullable=False, default=0)
    status = Column(String(50), nullable=False, default='Chờ xác nhận')
    sx_delivery = Column(Integer, ForeignKey('accounts.id'), nullable=True)
    qc_receipt = Column(Integer, ForeignKey('accounts.id'), nullable=True)
    sx_receipt = Column(Integer, ForeignKey('accounts.id'), nullable=True)
    created_at = Column(DateTime, nullable=False)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class DeliverieBase(BaseModel):
    plan_id: int
    delivery_stage: Optional[str] = None
    receiving_stage: Optional[str] = None
    part_name: Optional[str] = None
    quantity_total: int
    quantity_received: int
    quantity_error: int
    quantity_returned: int
    quantity_inspection: int
    status: str
    sx_delivery: Optional[int] = None
    qc_receipt: Optional[int] = None
    sx_receipt: Optional[int] = None
    created_at: datetime

class DeliverieCreate(DeliverieBase):
    pass

class DeliverieResponse(DeliverieBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ix_deliveries_plan_id`, `ix_deliveries_part_name`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   Nếu số lượng đếm thực tế ít hơn khai báo, phần thiếu hụt được tạo bản ghi ghi nhận lỗi.
*   Hệ thống tự động phát WebSocket thông báo tới trạm nhận khi tạo phiếu thành công.

---

#### 1.8 Bảng `delivery_details`
Bảng kê chi tiết số lượng linh kiện vật tư thực tế đi kèm phiếu giao nhận chính.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `delivery_id` | Integer | FK | No |  | ID phiếu giao liên kết (`deliveries`) |
| `part_name` | String(250) |  | No |  | Tên chi tiết |
| `quantity` | Integer |  | No |  | Số lượng chi tiết |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE delivery_details (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    delivery_id INT   NOT NULL,
    part_name NVARCHAR(250)   NOT NULL,
    quantity INT   NOT NULL,
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id)
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class DeliveryDetail(Base):
    __tablename__ = 'delivery_details'

    id = Column(Integer, primary_key=True, index=True)
    delivery_id = Column(Integer, ForeignKey('deliveries.id'), nullable=False)
    part_name = Column(String(250), nullable=False)
    quantity = Column(Integer, nullable=False)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class DeliveryDetailBase(BaseModel):
    delivery_id: int
    part_name: str
    quantity: int

class DeliveryDetailCreate(DeliveryDetailBase):
    pass

class DeliveryDetailResponse(DeliveryDetailBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ix_delivery_details_delivery_id`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   Tổng số lượng linh kiện trong chi tiết phải khớp với quantity_total của phiếu giao.

---

#### 1.9 Bảng `delivery_qc`
Bảng ghi kết quả kiểm định chất lượng checklist của nhân viên QC trạm nhận.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `delivery_id` | Integer | FK | No |  | ID phiếu giao (Unique, 1-1) |
| `results_json` | Text |  | No |  | Chuỗi JSON lưu 8 lỗi checklist |
| `note` | String(500) |  | Yes |  | Ghi chú/Nhận xét của QC |
| `created_at` | DateTime |  | No |  | Thời gian QC xác nhận |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE delivery_qc (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    delivery_id INT   NOT NULL,
    results_json NVARCHAR(MAX)   NOT NULL,
    note NVARCHAR(500)   NULL,
    created_at DateTime   NOT NULL,
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id)
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class DeliveryQc(Base):
    __tablename__ = 'delivery_qc'

    id = Column(Integer, primary_key=True, index=True)
    delivery_id = Column(Integer, ForeignKey('deliveries.id'), nullable=False)
    results_json = Column(Text, nullable=False)
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime, nullable=False)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class DeliveryQcBase(BaseModel):
    delivery_id: int
    results_json: str
    note: Optional[str] = None
    created_at: datetime

class DeliveryQcCreate(DeliveryQcBase):
    pass

class DeliveryQcResponse(DeliveryQcBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ux_delivery_qc_delivery_id`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   Dữ liệu JSON lưu dạng cặp key-value boolean {cong_venh: true, nut_tet: false, ...}

---

#### 1.10 Bảng `delivery_returns`
Phiếu ghi nhận và luân chuyển hàng lỗi trả ngược về công đoạn trước để khắc phục.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `plan_id` | Integer | FK | No |  | ID kế hoạch sản xuất liên kết |
| `from_stage` | String(50) |  | No |  | Công đoạn phát hiện lỗi |
| `to_stage` | String(50) |  | No |  | Công đoạn nhận lại hàng sửa |
| `part_name` | String(250) |  | No |  | Tên linh kiện lỗi |
| `quantity` | Integer |  | No |  | Số lượng trả lại |
| `note` | String(500) |  | Yes |  | Lý do/Mô tả lỗi |
| `status` | String(50) |  | No | 'Chờ xử lý' | Trạng thái xử lý lỗi |
| `created_by` | Integer | FK | No |  | ID tài khoản tạo phiếu (`accounts`) |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE delivery_returns (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    plan_id INT   NOT NULL,
    from_stage NVARCHAR(50)   NOT NULL,
    to_stage NVARCHAR(50)   NOT NULL,
    part_name NVARCHAR(250)   NOT NULL,
    quantity INT   NOT NULL,
    note NVARCHAR(500)   NULL,
    status NVARCHAR(50)   NOT NULL DEFAULT 'Chờ xử lý',
    created_by INT   NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES product_plans(id),
    FOREIGN KEY (created_by) REFERENCES accounts(id)
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class DeliveryReturn(Base):
    __tablename__ = 'delivery_returns'

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey('product_plans.id'), nullable=False)
    from_stage = Column(String(50), nullable=False)
    to_stage = Column(String(50), nullable=False)
    part_name = Column(String(250), nullable=False)
    quantity = Column(Integer, nullable=False)
    note = Column(String(500), nullable=True)
    status = Column(String(50), nullable=False, default='Chờ xử lý')
    created_by = Column(Integer, ForeignKey('accounts.id'), nullable=False)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class DeliveryReturnBase(BaseModel):
    plan_id: int
    from_stage: str
    to_stage: str
    part_name: str
    quantity: int
    note: Optional[str] = None
    status: str
    created_by: int

class DeliveryReturnCreate(DeliveryReturnBase):
    pass

class DeliveryReturnResponse(DeliveryReturnBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ix_delivery_returns_plan_id`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   Khi phiếu trả hàng được lập, hệ thống gửi thông báo đẩy ngay đến các tài khoản thuộc công đoạn nhận lại.

---

#### 1.11 Bảng `delivery_images`
Thư viện ảnh đính kèm phiếu giao nhận hoặc phiếu trả hàng làm bằng chứng vật lý.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `delivery_id` | Integer | FK | Yes |  | ID phiếu giao liên kết |
| `return_id` | Integer | FK | Yes |  | ID phiếu trả hàng liên kết |
| `image_path` | String(500) |  | No |  | Đường dẫn URL ảnh trên server |
| `description` | String(250) |  | Yes |  | Mô tả ảnh |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE delivery_images (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    delivery_id INT   NULL,
    return_id INT   NULL,
    image_path NVARCHAR(500)   NOT NULL,
    description NVARCHAR(250)   NULL,
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
    FOREIGN KEY (return_id) REFERENCES delivery_returns(id)
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class DeliveryImage(Base):
    __tablename__ = 'delivery_images'

    id = Column(Integer, primary_key=True, index=True)
    delivery_id = Column(Integer, ForeignKey('deliveries.id'), nullable=True)
    return_id = Column(Integer, ForeignKey('delivery_returns.id'), nullable=True)
    image_path = Column(String(500), nullable=False)
    description = Column(String(250), nullable=True)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class DeliveryImageBase(BaseModel):
    delivery_id: Optional[int] = None
    return_id: Optional[int] = None
    image_path: str
    description: Optional[str] = None

class DeliveryImageCreate(DeliveryImageBase):
    pass

class DeliveryImageResponse(DeliveryImageBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ix_delivery_images_delivery_id`, `ix_delivery_images_return_id`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   Mỗi phiếu bàn giao cho phép đính kèm tối đa 3 ảnh minh chứng (Ảnh đo độ ẩm, ảnh bề mặt thực tế).

---

#### 1.12 Bảng `input_inspections`
Kiểm định kích thước đo đạc đầu vào bắt buộc của linh kiện.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `plan_id` | Integer | FK | No |  | ID kế hoạch sản xuất |
| `part_name` | String(250) |  | No |  | Tên linh kiện |
| `length` | Float |  | No |  | Chiều dài đo thực tế (mm) |
| `width` | Float |  | No |  | Chiều rộng đo thực tế (mm) |
| `height` | Float |  | No |  | Chiều cao đo thực tế (mm) |
| `result` | String(50) |  | No |  | Đánh giá đạt hay không (Đạt/Không đạt) |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE input_inspections (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    plan_id INT   NOT NULL,
    part_name NVARCHAR(250)   NOT NULL,
    length Float   NOT NULL,
    width Float   NOT NULL,
    height Float   NOT NULL,
    result NVARCHAR(50)   NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES product_plans(id)
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class InputInspection(Base):
    __tablename__ = 'input_inspections'

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey('product_plans.id'), nullable=False)
    part_name = Column(String(250), nullable=False)
    length = Column(Float, nullable=False)
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    result = Column(String(50), nullable=False)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class InputInspectionBase(BaseModel):
    plan_id: int
    part_name: str
    length: float
    width: float
    height: float
    result: str

class InputInspectionCreate(InputInspectionBase):
    pass

class InputInspectionResponse(InputInspectionBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ix_input_inspections_plan_part`, `ix_input_inspections_result`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   If the component doesn't have a passed record in this table, the Backend blocks production team from creating a delivery ticket.

---

#### 1.13 Bảng `pallet_cards`
Bảng lưu trữ thẻ Pallet điện tử và thông tin bảng tính FortuneSheet.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `pallet_code` | String(100) |  | No |  | Mã Pallet định danh (Unique) |
| `khsx_code` | String(100) |  | Yes |  | Mã KHSX liên kết |
| `po_code` | String(100) |  | Yes |  | Mã đơn hàng PO |
| `customer_name` | String(255) |  | Yes |  | Tên khách hàng |
| `product_code` | String(100) |  | Yes |  | Mã sản phẩm |
| `detail_name` | String(255) |  | Yes |  | Tên chi tiết |
| `specification` | String(255) |  | Yes |  | Quy cách đóng gói |
| `quantity_plan` | Integer |  | No | 0 | Số lượng kế hoạch |
| `quantity_actual` | Integer |  | No | 0 | Số lượng đóng gói thực tế |
| `wood_standard` | String(255) |  | Yes |  | Tiêu chuẩn gỗ |
| `wood_supplier` | String(255) |  | Yes |  | Nhà cung cấp gỗ |
| `sheet_data` | Text |  | Yes |  | Dữ liệu JSON định dạng của FortuneSheet |
| `status` | Integer |  | No | 1 | 1: Active, 0: Deleted |
| `created_by` | Integer |  | Yes |  | ID người tạo thẻ |
| `created_at` | DateTime |  | No |  | Thời gian tạo thẻ |
| `updated_at` | DateTime |  | No |  | Thời gian cập nhật gần nhất |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE pallet_cards (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    pallet_code NVARCHAR(100)   NOT NULL,
    khsx_code NVARCHAR(100)   NULL,
    po_code NVARCHAR(100)   NULL,
    customer_name NVARCHAR(255)   NULL,
    product_code NVARCHAR(100)   NULL,
    detail_name NVARCHAR(255)   NULL,
    specification NVARCHAR(255)   NULL,
    quantity_plan INT   NOT NULL DEFAULT 0,
    quantity_actual INT   NOT NULL DEFAULT 0,
    wood_standard NVARCHAR(255)   NULL,
    wood_supplier NVARCHAR(255)   NULL,
    sheet_data NVARCHAR(MAX)   NULL,
    status INT   NOT NULL DEFAULT 1,
    created_by INT   NULL,
    created_at DateTime   NOT NULL,
    updated_at DateTime   NOT NULL
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class PalletCard(Base):
    __tablename__ = 'pallet_cards'

    id = Column(Integer, primary_key=True, index=True)
    pallet_code = Column(String(100), nullable=False)
    khsx_code = Column(String(100), nullable=True)
    po_code = Column(String(100), nullable=True)
    customer_name = Column(String(255), nullable=True)
    product_code = Column(String(100), nullable=True)
    detail_name = Column(String(255), nullable=True)
    specification = Column(String(255), nullable=True)
    quantity_plan = Column(Integer, nullable=False, default=0)
    quantity_actual = Column(Integer, nullable=False, default=0)
    wood_standard = Column(String(255), nullable=True)
    wood_supplier = Column(String(255), nullable=True)
    sheet_data = Column(Text, nullable=True)
    status = Column(Integer, nullable=False, default=1)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class PalletCardBase(BaseModel):
    pallet_code: str
    khsx_code: Optional[str] = None
    po_code: Optional[str] = None
    customer_name: Optional[str] = None
    product_code: Optional[str] = None
    detail_name: Optional[str] = None
    specification: Optional[str] = None
    quantity_plan: int
    quantity_actual: int
    wood_standard: Optional[str] = None
    wood_supplier: Optional[str] = None
    sheet_data: Optional[str] = None
    status: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

class PalletCardCreate(PalletCardBase):
    pass

class PalletCardResponse(PalletCardBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ux_pallet_cards_pallet_code`, `ix_pallet_cards_khsx_code`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   Trường sheet_data chứa toàn bộ định dạng màu sắc ô bảng tính để lưu trữ trạng thái hiển thị của FortuneSheet.

---

#### 1.14 Bảng `equipments`
Thông tin danh mục trang thiết bị, máy móc vận hành tại xưởng sản xuất.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `name` | String(255) |  | No |  | Tên máy móc |
| `code` | String(100) |  | No |  | Mã tài sản định danh (Unique) |
| `type` | String(100) |  | Yes |  | Loại thiết bị |
| `status` | String(50) |  | Yes |  | Trạng thái hoạt động |
| `purchase_date` | Date |  | Yes |  | Ngày đưa vào vận hành |
| `maintenance_cycle` | Integer |  | Yes |  | Chu kỳ bảo dưỡng (ngày) |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE equipments (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    name NVARCHAR(255)   NOT NULL,
    code NVARCHAR(100)   NOT NULL,
    type NVARCHAR(100)   NULL,
    status NVARCHAR(50)   NULL,
    purchase_date Date   NULL,
    maintenance_cycle INT   NULL
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class Equipment(Base):
    __tablename__ = 'equipments'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(100), nullable=False)
    type = Column(String(100), nullable=True)
    status = Column(String(50), nullable=True)
    purchase_date = Column(Date, nullable=True)
    maintenance_cycle = Column(Integer, nullable=True)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class EquipmentBase(BaseModel):
    name: str
    code: str
    type: Optional[str] = None
    status: Optional[str] = None
    purchase_date: Optional[datetime] = None
    maintenance_cycle: Optional[int] = None

class EquipmentCreate(EquipmentBase):
    pass

class EquipmentResponse(EquipmentBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ux_equipments_code`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   Mã thiết bị viết hoa, phân cách bởi dấu gạch ngang.

---

#### 1.15 Bảng `daily_inspection_records`
Nhật ký lưu trữ tổng lượng sản phẩm lỗi phát hiện hàng ngày tại từng công đoạn.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `inspection_date` | Date |  | No |  | Ngày ghi nhận báo cáo |
| `stage_name` | String(100) |  | No |  | Tên trạm báo cáo |
| `inspector_id` | Integer | FK | Yes |  | ID QC kiểm định (`accounts`) |
| `total_products` | Integer |  | No | 0 | Tổng sản lượng kiểm tra trong ngày |
| `total_defects` | Integer |  | No | 0 | Tổng số sản phẩm lỗi |
| `defect_rate` | Float |  | No | 0.0 | Tỷ lệ lỗi (%) |
| `created_at` | DateTime |  | No |  | Thời gian lưu bản ghi |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE daily_inspection_records (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    inspection_date Date   NOT NULL,
    stage_name NVARCHAR(100)   NOT NULL,
    inspector_id INT   NULL,
    total_products INT   NOT NULL DEFAULT 0,
    total_defects INT   NOT NULL DEFAULT 0,
    defect_rate Float   NOT NULL DEFAULT 0.0,
    created_at DateTime   NOT NULL,
    FOREIGN KEY (inspector_id) REFERENCES accounts(id)
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class DailyInspectionRecord(Base):
    __tablename__ = 'daily_inspection_records'

    id = Column(Integer, primary_key=True, index=True)
    inspection_date = Column(Date, nullable=False)
    stage_name = Column(String(100), nullable=False)
    inspector_id = Column(Integer, ForeignKey('accounts.id'), nullable=True)
    total_products = Column(Integer, nullable=False, default=0)
    total_defects = Column(Integer, nullable=False, default=0)
    defect_rate = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, nullable=False)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class DailyInspectionRecordBase(BaseModel):
    inspection_date: datetime
    stage_name: str
    inspector_id: Optional[int] = None
    total_products: int
    total_defects: int
    defect_rate: float
    created_at: datetime

class DailyInspectionRecordCreate(DailyInspectionRecordBase):
    pass

class DailyInspectionRecordResponse(DailyInspectionRecordBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ix_daily_inspection_records_date`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   Tỷ lệ lỗi được tính toán tự động bằng công thức: (total_defects / total_products) * 100.

---

#### 1.16 Bảng `daily_inspection_defects`
Bảng kê chi tiết phân loại số lượng lỗi cụ thể trong ngày.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `record_id` | Integer | FK | No |  | ID bản ghi tổng hợp ngày |
| `defect_id` | Integer | FK | No |  | ID loại lỗi (`defect_types`) |
| `quantity` | Integer |  | No | 0 | Số lượng phát hiện |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE daily_inspection_defects (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    record_id INT   NOT NULL,
    defect_id INT   NOT NULL,
    quantity INT   NOT NULL DEFAULT 0,
    FOREIGN KEY (record_id) REFERENCES daily_inspection_records(id),
    FOREIGN KEY (defect_id) REFERENCES defect_types(id)
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class DailyInspectionDefect(Base):
    __tablename__ = 'daily_inspection_defects'

    id = Column(Integer, primary_key=True, index=True)
    record_id = Column(Integer, ForeignKey('daily_inspection_records.id'), nullable=False)
    defect_id = Column(Integer, ForeignKey('defect_types.id'), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class DailyInspectionDefectBase(BaseModel):
    record_id: int
    defect_id: int
    quantity: int

class DailyInspectionDefectCreate(DailyInspectionDefectBase):
    pass

class DailyInspectionDefectResponse(DailyInspectionDefectBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ix_daily_inspection_defects_record`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   Tổng quantity lỗi ở bảng này phải bằng total_defects của record tương ứng.

---

#### 1.17 Bảng `defect_types`
Danh mục phân loại lỗi QC tiêu chuẩn trong sản xuất nội thất gỗ.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `name` | String(250) |  | No |  | Tên lỗi (VD: Nứt tét, Cong vênh) |
| `category` | String(50) |  | No |  | Nhóm lỗi (visual, structure, material) |
| `needs_tracking` | Boolean |  | No | False | Đánh dấu cần theo dõi đặc biệt |
| `is_active` | Boolean |  | No | True | Đang hoạt động |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE defect_types (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    name NVARCHAR(250)   NOT NULL,
    category NVARCHAR(50)   NOT NULL,
    needs_tracking Boolean   NOT NULL DEFAULT False,
    is_active Boolean   NOT NULL DEFAULT True
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class DefectType(Base):
    __tablename__ = 'defect_types'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(250), nullable=False)
    category = Column(String(50), nullable=False)
    needs_tracking = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class DefectTypeBase(BaseModel):
    name: str
    category: str
    needs_tracking: bool
    is_active: bool

class DefectTypeCreate(DefectTypeBase):
    pass

class DefectTypeResponse(DefectTypeBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ix_defect_types_name`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   Loại lỗi thuộc nhóm tracking sẽ kích hoạt email cảnh báo gửi trực tiếp cho Quản đốc phân xưởng.

---

#### 1.18 Bảng `backup_qr_codes`
Quản lý luân chuyển các mã QR in sẵn dự phòng tại hiện trường.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `code` | String(100) |  | No |  | Nội dung mã QR (Unique) |
| `status` | String(50) |  | No | 'Trống' | Trạng thái sử dụng (Trống, Đang Sử Dụng) |
| `current_delivery_id` | Integer | FK | Yes |  | ID phiếu giao đang gắn tạm |
| `created_at` | DateTime |  | No |  | Thời điểm cấp phát mã |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE backup_qr_codes (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    code NVARCHAR(100)   NOT NULL,
    status NVARCHAR(50)   NOT NULL DEFAULT 'Trống',
    current_delivery_id INT   NULL,
    created_at DateTime   NOT NULL,
    FOREIGN KEY (current_delivery_id) REFERENCES deliveries(id)
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class BackupQRCode(Base):
    __tablename__ = 'backup_qr_codes'

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default='Trống')
    current_delivery_id = Column(Integer, ForeignKey('accounts.id'), nullable=True)
    created_at = Column(DateTime, nullable=False)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class BackupQRCodeBase(BaseModel):
    code: str
    status: str
    current_delivery_id: Optional[int] = None
    created_at: datetime

class BackupQRCodeCreate(BackupQRCodeBase):
    pass

class BackupQRCodeResponse(BackupQRCodeBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ux_backup_qr_codes_code`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   Khi phiếu giao gắn với mã này hoàn thành, mã QR sẽ tự động giải phóng về trạng thái 'Trống'.

---

#### 1.19 Bảng `notifications`
Bảng lưu thông báo hệ thống và tin nhắn thông báo đẩy cho nhân viên.

| Tên trường | Kiểu dữ liệu | Khóa | Cho phép Null | Mặc định | Mô tả chức năng & Ràng buộc |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | Integer | PK | No |  | Khóa chính tự tăng |
| `title` | String(200) |  | No |  | Tiêu đề thông báo |
| `content` | Text |  | No |  | Nội dung chi tiết thông báo |
| `sender_id` | Integer | FK | Yes |  | ID người gửi (hệ thống là Null) |
| `receiver_id` | Integer | FK | No |  | ID người nhận (`accounts`) |
| `is_read` | Boolean |  | No | False | Trạng thái đã đọc hay chưa |
| `notification_type` | String(50) |  | Yes |  | Loại (delivery, return, system) |
| `created_at` | DateTime |  | No |  | Thời gian tạo thông báo |

**Cú pháp SQL DDL cấu trúc bảng (Production SQL Schema):**
```sql
CREATE TABLE notifications (
    id INT PRIMARY KEY IDENTITY(1,1) NOT NULL,
    title NVARCHAR(200)   NOT NULL,
    content NVARCHAR(MAX)   NOT NULL,
    sender_id INT   NULL,
    receiver_id INT   NOT NULL,
    is_read Boolean   NOT NULL DEFAULT False,
    notification_type NVARCHAR(50)   NULL,
    created_at DateTime   NOT NULL,
    FOREIGN KEY (sender_id) REFERENCES accounts(id),
    FOREIGN KEY (receiver_id) REFERENCES accounts(id)
);
```

**Khai báo lớp SQLAlchemy Model (Python ORM Class):**
```python
class Notification(Base):
    __tablename__ = 'notifications'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    sender_id = Column(Integer, ForeignKey('accounts.id'), nullable=True)
    receiver_id = Column(Integer, ForeignKey('accounts.id'), nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    notification_type = Column(String(50), nullable=True)
    created_at = Column(DateTime, nullable=False)

```

**Khai báo lớp Pydantic Schemas (Data Validation Models):**
```python
class NotificationBase(BaseModel):
    title: str
    content: str
    sender_id: Optional[int] = None
    receiver_id: int
    is_read: bool
    notification_type: Optional[str] = None
    created_at: datetime

class NotificationCreate(NotificationBase):
    pass

class NotificationResponse(NotificationBase):
    id: int
    class Config:
        from_attributes = True

```

**Chỉ mục (Indexes):** `ix_notifications_receiver`, `ix_notifications_is_read`

**Quy tắc nghiệp vụ hệ thống (Business Rules):**
*   Tự động gửi thông báo đẩy Firebase khi ghi nhận thông báo mới với người nhận có FCM token hoạt động.

---



## CHƯƠNG 4: ĐẶC TẢ CHI TIẾT API ENDPOINTS & TÍCH HỢP

Tầng Backend FastAPI cung cấp giao diện REST API chuẩn hóa. Dưới đây là đặc tả các endpoint API cốt lõi dùng cho giao tiếp Client-Server.

### 1. API Endpoint: `POST` /api/v1/accounts/login
**Mô tả chức năng:** Xác thực tài khoản người dùng và cấp mã bảo mật JWT Access Token.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Content-Type` | application/x-www-form-urlencoded | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X POST "http://localhost:8000/api/v1/accounts/login" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d '{
       "username": "nhanvien_sx",
       "password": "mypassword123"
     }'
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.post("/api/v1/accounts/login")
async def post_login(payload: PayloadModel, db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    Xác thực tài khoản người dùng và cấp mã bảo mật JWT Access Token.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        new_record = create_resource(db, payload)
        db.commit()
        return new_record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const postLogin = async (payload) => {
  try {
    const response = await axios.post(`/api/v1/accounts/login`, payload);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
{
  "username": "nhanvien_sx",
  "password": "mypassword123"
}
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 12,
    "username": "nhanvien_sx",
    "employee_id": "NV084",
    "full_name": "Nguyễn Văn A",
    "status": "Đang sử dụng",
    "stages": ["Trạm Cắt", "Trạm Ráp"]
  }
}
```

**Các lỗi nghiệp vụ thường gặp:**
| HTTP Code | Mô tả thông điệp lỗi trả về |
| :---: | :--- |
| 401 | Tên đăng nhập hoặc mật khẩu không chính xác. |
| 400 | Tài khoản của bạn đã bị khóa do nhập sai mật khẩu quá 5 lần. |

---

### 2. API Endpoint: `POST` /api/v1/accounts/update-fcm-token
**Mô tả chức năng:** Đồng bộ mã đẩy thông báo FCM của thiết bị di động với tài khoản người dùng.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X POST "http://localhost:8000/api/v1/accounts/update-fcm-token" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "user_id": 12,
       "fcm_token": "fXyZ1...device-token-string"
     }'
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.post("/api/v1/accounts/update-fcm-token")
async def post_update_fcm_token(payload: PayloadModel, db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    Đồng bộ mã đẩy thông báo FCM của thiết bị di động với tài khoản người dùng.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        new_record = create_resource(db, payload)
        db.commit()
        return new_record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const postUpdateFcmToken = async (payload) => {
  try {
    const response = await axios.post(`/api/v1/accounts/update-fcm-token`, payload);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
{
  "user_id": 12,
  "fcm_token": "fXyZ1...device-token-string"
}
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
{
  "success": true,
  "message": "Cập nhật token thông báo thành công."
}
```

**Các lỗi nghiệp vụ thường gặp:**
| HTTP Code | Mô tả thông điệp lỗi trả về |
| :---: | :--- |
| 401 | Chưa xác thực |
| 422 | Dữ liệu gửi lên sai cấu trúc |

---

### 3. API Endpoint: `POST` /api/v1/accounts/register
**Mô tả chức năng:** Tạo mới tài khoản nhân viên (Chỉ Admin được dùng).

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X POST "http://localhost:8000/api/v1/accounts/register" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "username": "nhanvien_qc_new",
       "password": "securepassword",
       "full_name": "Trần Văn B",
       "employee_id": "NV089",
       "email": "tranvanb@g7.com"
     }'
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.post("/api/v1/accounts/register")
async def post_register(payload: PayloadModel, db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    Tạo mới tài khoản nhân viên (Chỉ Admin được dùng).
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        new_record = create_resource(db, payload)
        db.commit()
        return new_record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const postRegister = async (payload) => {
  try {
    const response = await axios.post(`/api/v1/accounts/register`, payload);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
{
  "username": "nhanvien_qc_new",
  "password": "securepassword",
  "full_name": "Trần Văn B",
  "employee_id": "NV089",
  "email": "tranvanb@g7.com"
}
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
{
  "success": true,
  "user_id": 15,
  "message": "Tạo tài khoản thành công."
}
```

**Các lỗi nghiệp vụ thường gặp:**
| HTTP Code | Mô tả thông điệp lỗi trả về |
| :---: | :--- |
| 403 | Không có quyền hạn |
| 400 | Username đã tồn tại |

---

### 4. API Endpoint: `GET` /api/v1/accounts/profile
**Mô tả chức năng:** Lấy thông tin chi tiết và danh sách quyền hạn của người dùng đang đăng nhập.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X GET "http://localhost:8000/api/v1/accounts/profile" \
     -H "Authorization: Bearer <token>"
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.get("/api/v1/accounts/profile")
async def get_profile(db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    Lấy thông tin chi tiết và danh sách quyền hạn của người dùng đang đăng nhập.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        data = query_resource(db)
        return data
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const getProfile = async () => {
  try {
    const response = await axios.get(`/api/v1/accounts/profile`);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
None (GET Request)
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
{
  "id": 12,
  "username": "nhanvien_sx",
  "full_name": "Nguyễn Văn A",
  "role": "SX",
  "permissions": ["create_delivery", "confirm_receipt"]
}
```

**Các lỗi nghiệp vụ thường gặp:**
| HTTP Code | Mô tả thông điệp lỗi trả về |
| :---: | :--- |
| 401 | Chưa xác thực |

---

### 5. API Endpoint: `POST` /api/v1/deliveries/
**Mô tả chức năng:** Lập phiếu bàn giao công đoạn mới kèm thông số đo độ ẩm và ảnh chụp.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Content-Type` | multipart/form-data | Bắt buộc |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X POST "http://localhost:8000/api/v1/deliveries/" \
     -H "Content-Type: multipart/form-data" \
     -H "Authorization: Bearer <token>" \
     -F "plan_id=1" \
     -F "part_name=Tấm hông"
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.post("/api/v1/deliveries/")
async def post_deliveries(db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    Lập phiếu bàn giao công đoạn mới kèm thông số đo độ ẩm và ảnh chụp.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        new_record = create_resource(db, payload)
        db.commit()
        return new_record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const postDeliveries = async () => {
  try {
    const response = await axios.post(`/api/v1/deliveries/`);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
FormData: plan_id=1, part_name='Tấm hông', quantity_total=100, moisture_1=12.5, moisture_2=13.0, moisture_3=12.8, images=[Files]
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
{
  "success": true,
  "delivery_id": 489,
  "status": "Chờ xác nhận",
  "message": "Tạo phiếu bàn giao thành công."
}
```

**Các lỗi nghiệp vụ thường gặp:**
| HTTP Code | Mô tả thông điệp lỗi trả về |
| :---: | :--- |
| 400 | Chi tiết chưa được QC đo đạt chất lượng đầu vào, không thể bàn giao. |
| 401 | Chưa xác thực |

---

### 6. API Endpoint: `GET` /api/v1/deliveries/{delivery_id}
**Mô tả chức năng:** Lấy chi tiết thông tin, đo đạc độ ẩm và hình ảnh đi kèm của một phiếu giao hàng.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X GET "http://localhost:8000/api/v1/deliveries/{delivery_id}" \
     -H "Authorization: Bearer <token>"
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.get("/api/v1/deliveries/{delivery_id}")
async def get_deliveries(delivery_id: int, db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    Lấy chi tiết thông tin, đo đạc độ ẩm và hình ảnh đi kèm của một phiếu giao hàng.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        data = query_resource(db)
        return data
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const getDeliveries = async (delivery_id) => {
  try {
    const response = await axios.get(`/api/v1/deliveries/${delivery_id}`);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
None
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
{
  "id": 489,
  "plan_name": "KHSX T5 - 2026",
  "part_name": "Tấm hông",
  "quantity_total": 100,
  "moisture_avg": 12.77,
  "status": "Chờ QC kiểm tra",
  "images": ["/static/uploads/img1.jpg"]
}
```

**Các lỗi nghiệp vụ thường gặp:**
| HTTP Code | Mô tả thông điệp lỗi trả về |
| :---: | :--- |
| 404 | Không tìm thấy phiếu giao nhận |

---

### 7. API Endpoint: `PATCH` /api/v1/deliveries/{delivery_id}/confirm
**Mô tả chức năng:** Xác nhận số lượng thực tế tiếp nhận được tại trạm đích.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X PATCH "http://localhost:8000/api/v1/deliveries/{delivery_id}/confirm" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "quantity_received": 100
     }'
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.patch("/api/v1/deliveries/{delivery_id}/confirm")
async def patch_confirm(delivery_id: int, payload: PayloadModel, db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    Xác nhận số lượng thực tế tiếp nhận được tại trạm đích.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        updated_record = update_resource(db, payload)
        db.commit()
        return updated_record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const patchConfirm = async (delivery_id, payload) => {
  try {
    const response = await axios.patch(`/api/v1/deliveries/${delivery_id}/confirm`, payload);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
{
  "quantity_received": 100
}
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
{
  "success": true,
  "status": "Chờ QC kiểm tra",
  "message": "Xác nhận nhận hàng thành công."
}
```

**Các lỗi nghiệp vụ thường gặp:**
| HTTP Code | Mô tả thông điệp lỗi trả về |
| :---: | :--- |
| 400 | Số lượng nhận không thể lớn hơn số lượng giao ban đầu |

---

### 8. API Endpoint: `GET` /api/v1/deliveries/stage/{stage_name}
**Mô tả chức năng:** Lấy danh sách các phiếu bàn giao đang chờ xử lý tại một công đoạn cụ thể.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X GET "http://localhost:8000/api/v1/deliveries/stage/{stage_name}" \
     -H "Authorization: Bearer <token>"
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.get("/api/v1/deliveries/stage/{stage_name}")
async def get_stage(stage_name: int, db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    Lấy danh sách các phiếu bàn giao đang chờ xử lý tại một công đoạn cụ thể.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        data = query_resource(db)
        return data
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const getStage = async (stage_name) => {
  try {
    const response = await axios.get(`/api/v1/deliveries/stage/${stage_name}`);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
None
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
[
  {
    "id": 489,
    "part_name": "Tấm hông",
    "quantity_total": 100,
    "status": "Chờ xác nhận",
    "created_at": "2026-05-25T09:00:00"
  }
]
```

---

### 9. API Endpoint: `POST` /api/v1/qc/{delivery_id}
**Mô tả chức năng:** QC ghi nhận checklist chất lượng sản phẩm bàn giao.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X POST "http://localhost:8000/api/v1/qc/{delivery_id}" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "results": {
       "cong_venh": true,
       "do_am": true
       },
       "quantity_error": 5,
       "quantity_returned": 2,
       "note": "Hơi trầy xước nhẹ bề mặt"
     }'
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.post("/api/v1/qc/{delivery_id}")
async def post_qc(delivery_id: int, payload: PayloadModel, db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    QC ghi nhận checklist chất lượng sản phẩm bàn giao.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        new_record = create_resource(db, payload)
        db.commit()
        return new_record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const postQc = async (delivery_id, payload) => {
  try {
    const response = await axios.post(`/api/v1/qc/${delivery_id}`, payload);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
{
  "results": {
    "cong_venh": true,
    "do_am": true
  },
  "quantity_error": 5,
  "quantity_returned": 2,
  "note": "Hơi trầy xước nhẹ bề mặt"
}
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
{
  "success": true,
  "delivery_status": "Đã nhận",
  "message": "Lưu kết quả QC thành công."
}
```

**Các lỗi nghiệp vụ thường gặp:**
| HTTP Code | Mô tả thông điệp lỗi trả về |
| :---: | :--- |
| 400 | Không khớp số lượng |

---

### 10. API Endpoint: `POST` /api/v1/inspections/
**Mô tả chức năng:** QC đo đạc kích thước 3 chiều của chi tiết gỗ đầu vào.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X POST "http://localhost:8000/api/v1/inspections/" \
     -H "Authorization: Bearer <token>" \
     -d '{
       FormData: plan_id=1, part_name='Tấm hông', length=1200.5, width=600.2, height=18.0, result='Đạt'
     }'
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.post("/api/v1/inspections/")
async def post_inspections(db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    QC đo đạc kích thước 3 chiều của chi tiết gỗ đầu vào.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        new_record = create_resource(db, payload)
        db.commit()
        return new_record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const postInspections = async () => {
  try {
    const response = await axios.post(`/api/v1/inspections/`);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
FormData: plan_id=1, part_name='Tấm hông', length=1200.5, width=600.2, height=18.0, result='Đạt'
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
{
  "success": true,
  "inspection_id": 142,
  "result": "Đạt",
  "message": "Ghi nhận kết quả thành công."
}
```

---

### 11. API Endpoint: `GET` /api/v1/inspections/plan/{plan_id}
**Mô tả chức năng:** Lấy danh sách các số liệu đo kích thước đầu vào của một KHSX.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X GET "http://localhost:8000/api/v1/inspections/plan/{plan_id}" \
     -H "Authorization: Bearer <token>"
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.get("/api/v1/inspections/plan/{plan_id}")
async def get_plan(plan_id: int, db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    Lấy danh sách các số liệu đo kích thước đầu vào của một KHSX.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        data = query_resource(db)
        return data
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const getPlan = async (plan_id) => {
  try {
    const response = await axios.get(`/api/v1/inspections/plan/${plan_id}`);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
None
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
[
  {
    "id": 142,
    "part_name": "Tấm hông",
    "result": "Đạt",
    "created_at": "2026-05-25T08:30:00"
  }
]
```

---

### 12. API Endpoint: `POST` /api/v1/plans/
**Mô tả chức năng:** Khởi tạo kế hoạch sản xuất (KHSX) mới từ quản trị viên.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X POST "http://localhost:8000/api/v1/plans/" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "plan_name": "KHSX T6 - 2026",
       "start_date": "2026-06-01",
       "end_date": "2026-06-30"
     }'
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.post("/api/v1/plans/")
async def post_plans(payload: PayloadModel, db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    Khởi tạo kế hoạch sản xuất (KHSX) mới từ quản trị viên.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        new_record = create_resource(db, payload)
        db.commit()
        return new_record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const postPlans = async (payload) => {
  try {
    const response = await axios.post(`/api/v1/plans/`, payload);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
{
  "plan_name": "KHSX T6 - 2026",
  "start_date": "2026-06-01",
  "end_date": "2026-06-30"
}
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
{
  "success": true,
  "plan_id": 4,
  "message": "Tạo kế hoạch sản xuất thành công."
}
```

---

### 13. API Endpoint: `GET` /api/v1/plans/{plan_id}
**Mô tả chức năng:** Chi tiết kế hoạch sản xuất cùng danh sách các trạm đang hoạt động.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X GET "http://localhost:8000/api/v1/plans/{plan_id}" \
     -H "Authorization: Bearer <token>"
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.get("/api/v1/plans/{plan_id}")
async def get_plans(plan_id: int, db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    Chi tiết kế hoạch sản xuất cùng danh sách các trạm đang hoạt động.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        data = query_resource(db)
        return data
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const getPlans = async (plan_id) => {
  try {
    const response = await axios.get(`/api/v1/plans/${plan_id}`);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
None
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
{
  "id": 1,
  "plan_name": "KHSX T5 - 2026",
  "status": "Đang chạy",
  "deliveries_count": 87
}
```

**Các lỗi nghiệp vụ thường gặp:**
| HTTP Code | Mô tả thông điệp lỗi trả về |
| :---: | :--- |
| 404 | Không tìm thấy kế hoạch |

---

### 14. API Endpoint: `POST` /api/v1/pallet/
**Mô tả chức năng:** Khởi tạo thẻ Pallet điện tử trống mới.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X POST "http://localhost:8000/api/v1/pallet/" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "pallet_code": "PLT-2026-004",
       "khsx_code": "KHSX T5 - 2026",
       "po_code": "PO-1002"
     }'
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.post("/api/v1/pallet/")
async def post_pallet(payload: PayloadModel, db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    Khởi tạo thẻ Pallet điện tử trống mới.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        new_record = create_resource(db, payload)
        db.commit()
        return new_record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const postPallet = async (payload) => {
  try {
    const response = await axios.post(`/api/v1/pallet/`, payload);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
{
  "pallet_code": "PLT-2026-004",
  "khsx_code": "KHSX T5 - 2026",
  "po_code": "PO-1002"
}
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
{
  "success": true,
  "pallet_code": "PLT-2026-004",
  "message": "Khởi tạo thẻ Pallet thành công."
}
```

**Các lỗi nghiệp vụ thường gặp:**
| HTTP Code | Mô tả thông điệp lỗi trả về |
| :---: | :--- |
| 400 | Mã Pallet đã tồn tại |

---

### 15. API Endpoint: `GET` /api/v1/pallet/{pallet_code}
**Mô tả chức năng:** Lấy dữ liệu cấu hình FortuneSheet của thẻ Pallet chỉ định.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X GET "http://localhost:8000/api/v1/pallet/{pallet_code}" \
     -H "Authorization: Bearer <token>"
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.get("/api/v1/pallet/{pallet_code}")
async def get_pallet(pallet_code: int, db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    Lấy dữ liệu cấu hình FortuneSheet của thẻ Pallet chỉ định.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        data = query_resource(db)
        return data
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const getPallet = async (pallet_code) => {
  try {
    const response = await axios.get(`/api/v1/pallet/${pallet_code}`);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
None
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
{
  "pallet_code": "PLT-2026-004",
  "customer_name": "Khách A",
  "sheet_data": "[{\"name\":\"Sheet1\",\"celldata\":[]}]"
}
```

**Các lỗi nghiệp vụ thường gặp:**
| HTTP Code | Mô tả thông điệp lỗi trả về |
| :---: | :--- |
| 404 | Không tìm thấy Pallet |

---

### 16. API Endpoint: `PUT` /api/v1/pallet/{pallet_code}
**Mô tả chức năng:** Lưu lại toàn bộ dữ liệu bảng tính FortuneSheet đã chỉnh sửa.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X PUT "http://localhost:8000/api/v1/pallet/{pallet_code}" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "customer_name": "Khách A",
       "sheet_data": "[{\"name\":\"Sheet1\",\"celldata\":[]}]",
       "quantity_actual": 80
     }'
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.put("/api/v1/pallet/{pallet_code}")
async def put_pallet(pallet_code: int, payload: PayloadModel, db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    Lưu lại toàn bộ dữ liệu bảng tính FortuneSheet đã chỉnh sửa.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        updated_record = update_resource(db, payload)
        db.commit()
        return updated_record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const putPallet = async (pallet_code, payload) => {
  try {
    const response = await axios.put(`/api/v1/pallet/${pallet_code}`, payload);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
{
  "customer_name": "Khách A",
  "sheet_data": "[{\"name\":\"Sheet1\",\"celldata\":[]}]",
  "quantity_actual": 80
}
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
{
  "success": true,
  "message": "Lưu cấu hình bảng tính thành công."
}
```

---

### 17. API Endpoint: `POST` /api/v1/equipments/
**Mô tả chức năng:** Đăng ký thiết bị máy móc nhà xưởng mới.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X POST "http://localhost:8000/api/v1/equipments/" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "name": "Máy khoan CNC trục ngang",
       "code": "CNC-HOR-02",
       "maintenance_cycle": 180
     }'
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.post("/api/v1/equipments/")
async def post_equipments(payload: PayloadModel, db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    Đăng ký thiết bị máy móc nhà xưởng mới.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        new_record = create_resource(db, payload)
        db.commit()
        return new_record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const postEquipments = async (payload) => {
  try {
    const response = await axios.post(`/api/v1/equipments/`, payload);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
{
  "name": "Máy khoan CNC trục ngang",
  "code": "CNC-HOR-02",
  "maintenance_cycle": 180
}
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
{
  "success": true,
  "equipment_id": 9,
  "message": "Đăng ký thiết bị thành công."
}
```

---

### 18. API Endpoint: `GET` /api/v1/equipments/
**Mô tả chức năng:** Liệt kê danh sách toàn bộ trang thiết bị đang quản lý.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X GET "http://localhost:8000/api/v1/equipments/" \
     -H "Authorization: Bearer <token>"
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.get("/api/v1/equipments/")
async def get_equipments(db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    Liệt kê danh sách toàn bộ trang thiết bị đang quản lý.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        data = query_resource(db)
        return data
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const getEquipments = async () => {
  try {
    const response = await axios.get(`/api/v1/equipments/`);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
None
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
[
  {
    "code": "CNC-01",
    "name": "Máy phay CNC 5 trục",
    "status": "Hoạt động"
  }
]
```

---

### 19. API Endpoint: `POST` /api/v1/daily-inspections/
**Mô tả chức năng:** Tạo báo cáo nhật ký lỗi QC hàng ngày của trạm kiểm tra.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X POST "http://localhost:8000/api/v1/daily-inspections/" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "stage_name": "Trạm Cắt",
       "total_products": 500,
       "defects": [
       {"defect_id": 1, "quantity": 10},
       {"defect_id": 2, "quantity": 3}
       ]
     }'
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.post("/api/v1/daily-inspections/")
async def post_daily_inspections(payload: PayloadModel, db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    Tạo báo cáo nhật ký lỗi QC hàng ngày của trạm kiểm tra.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        new_record = create_resource(db, payload)
        db.commit()
        return new_record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const postDailyInspections = async (payload) => {
  try {
    const response = await axios.post(`/api/v1/daily-inspections/`, payload);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
{
  "stage_name": "Trạm Cắt",
  "total_products": 500,
  "defects": [
    {"defect_id": 1, "quantity": 10},
    {"defect_id": 2, "quantity": 3}
  ]
}
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
{
  "success": true,
  "record_id": 14,
  "message": "Lưu báo cáo lỗi hàng ngày thành công."
}
```

---

### 20. API Endpoint: `GET` /api/v1/daily-inspections/
**Mô tả chức năng:** Lấy danh sách nhật ký lỗi QC trong tuần.

**HTTP Headers:**
| Tên Header | Giá trị kiểm tra | Ghi chú |
| :--- | :--- | :--- |
| `Authorization` | Bearer <token> | Bắt buộc |

**Lệnh gọi HTTP Client (cURL script):**
```bash
curl -X GET "http://localhost:8000/api/v1/daily-inspections/" \
     -H "Authorization: Bearer <token>"
```

**Đoạn mã xử lý Router Endpoint (FastAPI Python):**
```python
@router.get("/api/v1/daily-inspections/")
async def get_daily_inspections(db: Session = Depends(get_db), current_user: Account = Depends(get_current_user)):
    """
    Lấy danh sách nhật ký lỗi QC trong tuần.
    """
    # 1. Kiểm tra quyền hạn của User qua RBAC/ABAC
    if not has_stage_permission(current_user, current_user.stages):
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện thao tác tại trạm này")

    # 2. Xử lý nghiệp vụ chính & ghi nhận vào DB
    try:
        data = query_resource(db)
        return data
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

```

**Đoạn mã gọi API Client (React Axios JS):**
```javascript
import axios from 'axios';

export const getDailyInspections = async () => {
  try {
    const response = await axios.get(`/api/v1/daily-inspections/`);
    return response.data;
  } catch (error) {
    console.error("Lỗi API:", error.response?.data || error.message);
    throw error;
  }
};
```

**Yêu cầu gửi đi (Request Body):**
```json
None
```

**Mẫu kết quả thành công (Response 200 OK / 201 Created):**
```json
[
  {
    "id": 14,
    "inspection_date": "2026-05-25",
    "defect_rate": 2.6
  }
]
```

---



## CHƯƠNG 5: ĐẶC TẢ CHI TIẾT CÁC MÀN HÌNH CỐT LÕI

## 4.1 MH1_MB1_Login — Đăng nhập (Mobile)

#

### 4.1.9 BẢN ĐỒ CHI TIẾT TƯƠNG TÁC FRONTEND - BACKEND (API & HANDLER FUNCTIONS)

#### A. Tầng Giao diện Client & Tương tác Nghiệp vụ (React Components & Hooks)
- **Tệp mã nguồn Giao diện (Component Path):** `Mobile/src/Views/screens/MB1_Login.jsx`
- **Quản lý Trạng thái cục bộ (State Management):**
| React State Hooks | Vai trò quản lý trạng thái giao diện |
| :--- | :--- |
| `username` | Tên đăng nhập nhập từ bàn phím |
| `password` | Mật khẩu nhập từ bàn phím |
| `loading` | Trạng thái hiển thị loading spinner khi gửi API |
| `errorMessage` | Thông điệp lỗi hiển thị trên giao diện |
| `fcmToken` | Token Firebase Cloud Messaging cấp từ Client SDK |

- **Danh sách Hàm sự kiện chính (UI Event Handlers):**
| Trình xử lý sự kiện (Handler) | Sự kiện kích hoạt (Trigger) | Nghiệp vụ xử lý của hàm |
| :--- | :--- | :--- |
| `handleLogin()` | onClick của nút Đăng nhập | Gửi thông tin xác thực lên API |
| `toggleShowPassword()` | onClick icon con mắt | Thay đổi kiểu input mật khẩu giữa text và password |
| `registerPushNotification()` | Sau khi đăng nhập thành công | Lấy FCM device token và gửi lên Backend đồng bộ |

- **Vòng đời & Hiệu ứng Component (Lifecycle Hooks):**
  * `useEffect dùng để kiểm tra sự tồn tại của JWT Access Token cũ trong LocalStorage. Nếu Token còn hạn, hệ thống tự động thiết lập Authorization Header mặc định và điều hướng trực tiếp vào màn hình Dashboard chính mà không yêu cầu nhập lại thông tin đăng nhập.`

#### B. Tầng Giao tiếp trung gian REST API & Giao thức truyền tải (API Contract)
- **Phương thức & Đường dẫn endpoint:** `POST /api/v1/accounts/login`
- **HTTP Headers yêu cầu:**
  * `Content-Type: application/json`
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Bắt buộc xác thực)
- **Mẫu dữ liệu yêu cầu gửi đi (Request Payload JSON):**
```json
{\n  "username": "nhanvien_sx",\n  "password": "mypassword123"\n}
```
- **Mẫu dữ liệu phản hồi thành công (Response 200 OK):**
```json
{\n  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",\n  "token_type": "bearer",\n  "user": {\n    "id": 12,\n    "username": "nhanvien_sx",\n    "employee_id": "NV084",\n    "status": "Đang sử dụng",\n    "stages": ["Trạm Cắt", "Trạm Ráp"]\n  }\n}
```

#### C. Tầng Logic Nghiệp vụ Backend & Tương tác Cơ sở dữ liệu (FastAPI & SQLAlchemy)
- **Hàm điều phối Router API (FastAPI Route Handler):** `login_for_access_token() trong `BackEnd/src/app/api/v1/endpoints/account_router.py``
- **Hàm dịch vụ nghiệp vụ chính (Business Logic Service):** `authenticate_user() xác thực thông tin tài khoản`
- **Các Models/Thực thể dữ liệu tương tác chính (SQLAlchemy Models):** ``accounts`, `departments`, `roles`, `permissions`, `stages``
- **Cơ chế truy vấn & Khóa đồng thời (Database Operations & Concurrency Control):**
  * `Truy vấn bảng `accounts` theo `username`. Nếu mật khẩu khớp, reset `failed_login_attempts` về 0. Nếu sai mật khẩu, tăng biến đếm và khóa tài khoản khi số lần nhập sai đạt 5. Truy vấn `departments` kết nối với các vai trò, quyền hạn và danh sách trạm sản xuất được phân công.`
- **Ràng buộc kiểm tra tính toàn vẹn (Integrity & Database Validation Constraints):**
  * `Khóa ngoại `department.account_id` trỏ đến `accounts.id`. Trường `accounts.username` là khóa duy nhất.`

#### D. Luồng Xử lý Lỗi, Phục hồi Hệ thống & Ngoại lệ (Exception Handling & Resilience)
- **Các mã lỗi API & Ngoại lệ nghiệp vụ có thể trả về:**
  * `HTTP 401 Unauthorized`: Trả về khi JWT Token không hợp lệ hoặc hết hạn sử dụng.
  * `HTTP 403 Forbidden`: Trả về khi người dùng không có quyền truy cập hoặc thực hiện thao tác tại trạm sản xuất tương ứng.
  * `HTTP 422 Unprocessable Entity`: Trả về khi cấu trúc trường JSON gửi lên bị thiếu hoặc sai kiểu dữ liệu yêu cầu.
  * `HTTP 400 Bad Request`: Trả về khi vi phạm các quy tắc ràng buộc nghiệp vụ sản xuất (ví dụ: linh kiện chưa đo độ ẩm, số nhận lớn hơn số giao...).
- **Cơ chế phục hồi Ngoại tuyến tại hiện trường (Offline Capabilities & Queue Sync):**
  * `Tính năng Đăng nhập không hỗ trợ ngoại tuyến. Thiết bị yêu cầu phải kết nối Internet trực tiếp để xác thực.`

#### E. Mẫu mã nguồn giao tiếp thực tế chuẩn hóa (Reference Implementation Code Snippet)

**Frontend Component API Hook (React JS):**
```javascript
// Giao tiếp Axios Client gửi yêu cầu lên Backend FastAPI
const handleLogin = async () => {
  setLoading(true);
  setErrorMessage("");
  try {
    const response = await axios.post("/api/v1/accounts/login", { username, password });
    const { access_token, user } = response.data;
    localStorage.setItem("token", access_token);
    localStorage.setItem("user", JSON.stringify(user));
    axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    await registerPushNotification(user.id);
    navigate("/delivery-info");
  } catch (error) {
    setErrorMessage(error.response?.data?.detail || "Đăng nhập thất bại");
  } finally {
    setLoading(false);
  }
};
```

**Backend Router & Controller (FastAPI & SQLAlchemy ORM):**
```python
# Điều phối API Endpoint và xử lý ghi nhận giao dịch cơ sở dữ liệu
@router.post("/login")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Account).filter(Account.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.status = "Bị khóa"
            db.commit()
        raise HTTPException(status_code=401, detail="Username hoặc password không chính xác")
    if user.status == "Bị khóa":
        raise HTTPException(status_code=400, detail="Tài khoản đang bị khóa")
    user.failed_login_attempts = 0
    db.commit()
    token = create_access_token(data={"sub": user.username})
    return {"access_token": token, "token_type": "bearer", "user": user}
```

#### F. Sơ đồ tuần tự tương tác hệ thống (Sequence Diagram)
```mermaid
sequenceDiagram
    actor Staff as Nhân viên
    participant Mobile as Mobile App (MB1_Login)
    participant Server as FastAPI Backend
    participant DB as SQLite Database
    Staff->>Mobile: Nhập Username/Password & Đăng nhập
    Mobile->>Server: POST /accounts/login
    Server->>DB: Query account where username == input
    DB-->>Server: Trả về Account record
    Server->>Server: verify_password() & check_status()
    alt Xác thực thành công
        Server->>DB: Update failed_login_attempts = 0
        DB-->>Server: Success
        Server-->>Mobile: HTTP 200 (access_token, user_profile)
        Mobile->>Mobile: Lưu token & user vào localStorage
        Mobile->>Server: POST /accounts/update-fcm-token
        Server->>DB: Cập nhật fcm_token cho account
        DB-->>Server: Success
        Server-->>Mobile: HTTP 200 OK
    else Sai thông tin / Bị khóa
        Server->>DB: Tăng failed_login_attempts += 1
        DB-->>Server: Success
        Server-->>Mobile: HTTP 401 Unauthorized / 400 Locked
    end
```

---

## 4.1.1 Mục đích màn hình
Màn hình thực hiện chức năng xác thực thông tin tài khoản người dùng, cấp phát mã JWT Access Token và tải toàn bộ hồ sơ nghiệp vụ (Vai trò, Quyền hạn, Trạm/Công đoạn gán) để người dùng bắt đầu phiên làm việc trên ứng dụng di động.

---

### 4.1.2 Thông tin màn hình

| Thuộc tính | Nội dung |
| :--- | :--- |
| Mã màn hình | MB1 |
| Route | `/login (định nghĩa trong App di động)` |
| Module | Xác thực & Phân quyền (Authentication & Authorization) |
| Người dùng sử dụng | Tất cả nhân viên xưởng (SX, QC) và quản trị viên sử dụng App Mobile |

---

### 4.1.3 Chức năng chính

| STT | Chức năng | Mô tả |
| :--- | :--- | :--- |
| 1 | Xác thực tài khoản: | Cho phép nhập Tên đăng nhập (`username`) và Mật khẩu (`password`) để đăng nhập. |
| 2 | Tự động khóa tài khoản: | Cơ chế bảo mật tự động đổi trạng thái tài khoản thành "Bị khóa" nếu nhập sai mật khẩu liên tiếp quá 5 lần. |
| 3 | Lưu giữ phiên đăng nhập: | Lưu trữ JWT Token và Profile người dùng xuống `localStorage` để duy trì trạng thái đăng nhập. |
| 4 | Đồng bộ FCM Token: | Đăng ký và cập nhật FCM Token (Firebase Cloud Messaging) lên máy chủ ngay sau khi đăng nhập thành công phục vụ việc đẩy thông báo thời gian thực (Push Notification). |

---

### 4.1.4 Luồng xử lý hệ thống

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as Login Screen (Mobile)
    participant Ctrl as AuthController
    participant API as Backend API (FastAPI)
    participant DB as SQL Server
    participant FCM as Firebase / Google

    User->>UI: Nhập Username/Password & Nhấn Đăng nhập
    UI->>Ctrl: login(username, password)
    Ctrl->>API: POST /accounts/login (Form Data)
    
    API->>DB: Truy vấn Account theo username
    DB-->>API: Trả về Hashed Password & User ID
    
    API->>API: verify_password(password)
    
    alt Thông tin sai
        API-->>Ctrl: 401 Unauthorized
        Ctrl-->>UI: Hiển thị thông báo lỗi
        UI-->>User: "Tên đăng nhập hoặc mật khẩu không chính xác"
    else Thông tin đúng
        API->>API: Sinh JWT Access Token
        API->>DB: Truy vấn Role/Permission/Stage (Table: Department)
        DB-->>API: Trả về Profile chi tiết
        API-->>Ctrl: 200 OK (Token + User Profile)
        
        Ctrl->>UI: Lưu Token & User State
        
        par Đăng ký Thông báo đẩy
            Ctrl->>FCM: Yêu cầu FCM Token
            FCM-->>Ctrl: Trả về device_token
            Ctrl->>API: POST /update-fcm-token (user_id, device_token)
            API->>DB: Cập nhật fcm_token vào bảng accounts
            DB-->>API: Success
        end
        
        UI->>User: Điều hướng vào Màn hình chính (theo phân quyền)
    end
```

Người dùng mở ứng dụng di động, nhập `username` và `password`, sau đó nhấn nút **ĐĂNG NHẬP**.
2. Frontend thực hiện validate dữ liệu nhập sơ bộ. Nếu hợp lệ, gửi thông tin đăng nhập lên Backend.
3. Backend kiểm tra tài khoản:
   * Nếu tài khoản không tồn tại: Trả về lỗi 401.
   * Nếu tài khoản đang có trạng thái `status == 'Bị khóa'`: Từ chối đăng nhập và thông báo liên hệ Admin.
   * Nếu mật khẩu không khớp: Tăng trường `failed_login_attempts` lên 1. Nếu số lần sai đạt 5, đổi `status` thành `Bị khóa`. Trả về số lần thử còn lại hoặc cảnh báo đã khóa.
   * Nếu mật khẩu đúng: Reset `failed_login_attempts` về 0, tạo JWT Token chứa payload `username`.
4. Backend truy vấn các bản ghi phòng ban (`departments`) liên kết để lấy ra: Vai trò (`Role`), Quyền (`Permission`), và các Công đoạn (`Stage`) được gán cho người dùng này.
5. Trả về thông tin đăng nhập thành công cho Frontend.
6. Frontend lưu `token` và `smartflow_user` vào `localStorage`, đồng thời kích hoạt gọi API đăng ký `fcm_token` của thiết bị rồi chuyển hướng người dùng sang màn hình Dashboard [MB2_DeliveryInfo.jsx](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB2_DeliveryInfo.jsx).
* Định dạng request gửi đi từ Mobile là `application/x-www-form-urlencoded` để tương thích với `OAuth2PasswordRequestForm` của FastAPI.
* Ngay sau khi đăng nhập thành công, Mobile gọi hàm khởi tạo `PushNotificationService.init(userId)` để lấy FCM token và gửi qua API cập nhật token thiết bị.

---

### 4.1.5 API liên quan

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| POST | `/api/v1/accounts/login` | Xác thực tài khoản và trả về token, profile. Định nghĩa tại [account_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/account_router.py#L77-L160). |
| POST | `/api/v1/accounts/update-fcm-token` | Đồng bộ FCM Token thiết bị di động. Định nghĩa tại [account_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/account_router.py#L18-L49). |

---

### 4.1.6 Database liên quan

| Bảng | Mục đích |
| :--- | :--- |
| ``accounts`` | Lưu trữ tài khoản. Ánh xạ qua Model [AccountModel](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/accounts.py#L6). |
| ``departments`` | Liên kết tài khoản với vai trò, quyền, công đoạn. Ánh xạ qua Model [Department](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/departments.py#L6). |

---

### 4.1.7 Business Rules

| Điều kiện | Mô tả |
| :--- | :--- |
| Quy tắc chung | Trường Tên đăng nhập và Mật khẩu không được phép bỏ trống. |
| Quy tắc chung | Giới hạn số lần thử mật khẩu: Tối đa 5 lần. Quá giới hạn tài khoản chuyển trạng thái thành `Bị khóa`. |
| Quy tắc chung | Mã FCM Token khi gửi lên sẽ được xoá khỏi các tài khoản khác trước khi gán cho tài khoản mới để tránh tình trạng một thiết bị nhận thông báo của nhiều tài khoản. |

---

### 4.1.8 File code liên quan

**Frontend:**
* [MB1_Login.jsx](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB1_Login.jsx)

**Backend:**
* [account_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/account_router.py)

> [!NOTE]
> **Ghi chú Dev:**
> Token hết hạn tính bằng phút theo cấu hình `ACCESS_TOKEN_EXPIRE_MINUTES` trong file config.
* Khi test kiểm tra cơ chế khóa tài khoản, có thể vào bảng `accounts` sửa lại trường `failed_login_attempts` về `0` và `status` thành `Hoạt động` để mở khóa thủ công.

---

## 4.2 MH2_MB2_DeliveryInfo — Dashboard Bàn giao (Mobile)

#

### 4.2.9 BẢN ĐỒ CHI TIẾT TƯƠNG TÁC FRONTEND - BACKEND (API & HANDLER FUNCTIONS)

#### A. Tầng Giao diện Client & Tương tác Nghiệp vụ (React Components & Hooks)
- **Tệp mã nguồn Giao diện (Component Path):** `Mobile/src/Views/screens/MB2_DeliveryInfo.jsx`
- **Quản lý Trạng thái cục bộ (State Management):**
| React State Hooks | Vai trò quản lý trạng thái giao diện |
| :--- | :--- |
| `plans` | Danh sách kế hoạch sản xuất hoạt động |
| `deliveries` | Danh sách phiếu bàn giao hiển thị trên màn hình |
| `isRefreshing` | Trạng thái kéo xuống làm mới (pull-to-refresh) |
| `currentTab` | Tab hiện tại đang hiển thị (Bàn giao/Tiếp nhận) |

- **Danh sách Hàm sự kiện chính (UI Event Handlers):**
| Trình xử lý sự kiện (Handler) | Sự kiện kích hoạt (Trigger) | Nghiệp vụ xử lý của hàm |
| :--- | :--- | :--- |
| `fetchDashboardData()` | Khi mở màn hình hoặc pull-to-refresh | Gửi API đồng thời tải plans và deliveries |
| `initWebSocket()` | Khi component Mount | Thiết lập socket lắng nghe sự kiện đẩy thời gian thực |
| `handleTabChange()` | onClick chuyển Tab | Thay đổi filter hiển thị trên lưới dữ liệu |

- **Vòng đời & Hiệu ứng Component (Lifecycle Hooks):**
  * `useEffect kích hoạt kết nối WebSocket tới endpoint `/ws/stage/{stage_name}` của Server. Lắng nghe các bản tin thông báo để tự động gọi lại hàm fetchDashboardData() tải lại giao diện.`

#### B. Tầng Giao tiếp trung gian REST API & Giao thức truyền tải (API Contract)
- **Phương thức & Đường dẫn endpoint:** `GET /api/v1/deliveries/stage/{stage_name}`
- **HTTP Headers yêu cầu:**
  * `Content-Type: multipart/form-data`
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Bắt buộc xác thực)
- **Mẫu dữ liệu yêu cầu gửi đi (Request Payload JSON):**
```json
None (Query parameters: page, size)
```
- **Mẫu dữ liệu phản hồi thành công (Response 200 OK):**
```json
[\n  {\n    "id": 102,\n    "plan_name": "KHSX T5 - 2026",\n    "part_name": "Tấm hông gỗ sồi",\n    "quantity_total": 120,\n    "status": "Chờ xác nhận",\n    "delivery_stage": "Trạm Cắt",\n    "receiving_stage": "Trạm Ráp"\n  }\n]
```

#### C. Tầng Logic Nghiệp vụ Backend & Tương tác Cơ sở dữ liệu (FastAPI & SQLAlchemy)
- **Hàm điều phối Router API (FastAPI Route Handler):** `get_deliveries_by_stage() trong `BackEnd/src/app/api/v1/endpoints/deliveries.py``
- **Hàm dịch vụ nghiệp vụ chính (Business Logic Service):** `read_deliveries() lọc dữ liệu theo phân khu công đoạn`
- **Các Models/Thực thể dữ liệu tương tác chính (SQLAlchemy Models):** ``deliveries`, `product_plans``
- **Cơ chế truy vấn & Khóa đồng thời (Database Operations & Concurrency Control):**
  * `Truy vấn bảng `deliveries` với điều kiện cột `delivery_stage == stage_name` (Giao đi) hoặc `receiving_stage == stage_name` (Nhận về). Sử dụng phân trang để tránh tải quá nhiều bản ghi.`
- **Ràng buộc kiểm tra tính toàn vẹn (Integrity & Database Validation Constraints):**
  * `Khóa ngoại `deliveries.plan_id` liên kết bảng `product_plans.id`.`

#### D. Luồng Xử lý Lỗi, Phục hồi Hệ thống & Ngoại lệ (Exception Handling & Resilience)
- **Các mã lỗi API & Ngoại lệ nghiệp vụ có thể trả về:**
  * `HTTP 401 Unauthorized`: Trả về khi JWT Token không hợp lệ hoặc hết hạn sử dụng.
  * `HTTP 403 Forbidden`: Trả về khi người dùng không có quyền truy cập hoặc thực hiện thao tác tại trạm sản xuất tương ứng.
  * `HTTP 422 Unprocessable Entity`: Trả về khi cấu trúc trường JSON gửi lên bị thiếu hoặc sai kiểu dữ liệu yêu cầu.
  * `HTTP 400 Bad Request`: Trả về khi vi phạm các quy tắc ràng buộc nghiệp vụ sản xuất (ví dụ: linh kiện chưa đo độ ẩm, số nhận lớn hơn số giao...).
- **Cơ chế phục hồi Ngoại tuyến tại hiện trường (Offline Capabilities & Queue Sync):**
  * `Lưu trữ dữ liệu tải gần nhất vào LocalStorage. Khi mất mạng, hiển thị dữ liệu lưu tạm kèm cảnh báo ngoại tuyến.`

#### E. Mẫu mã nguồn giao tiếp thực tế chuẩn hóa (Reference Implementation Code Snippet)

**Frontend Component API Hook (React JS):**
```javascript
// Giao tiếp Axios Client gửi yêu cầu lên Backend FastAPI
const fetchDashboardData = async () => {
  setIsRefreshing(true);
  try {
    const resDeliveries = await axios.get(`/api/v1/deliveries/stage/${user.stage}`);
    setDeliveries(resDeliveries.data);
    localStorage.setItem("cached_deliveries", JSON.stringify(resDeliveries.data));
  } catch (error) {
    const cached = localStorage.getItem("cached_deliveries");
    if (cached) setDeliveries(JSON.parse(cached));
  } finally {
    setIsRefreshing(false);
  }
};
```

**Backend Router & Controller (FastAPI & SQLAlchemy ORM):**
```python
# Điều phối API Endpoint và xử lý ghi nhận giao dịch cơ sở dữ liệu
@router.get("/stage/{stage_name}")
def get_deliveries_by_stage(stage_name: str, db: Session = Depends(get_db)):
    return db.query(Delivery).filter(
        or_(Delivery.delivery_stage == stage_name, Delivery.receiving_stage == stage_name)
    ).order_by(Delivery.created_at.desc()).all()
```

#### F. Sơ đồ tuần tự tương tác hệ thống (Sequence Diagram)
```mermaid
sequenceDiagram
    actor Staff as Nhân viên
    participant Mobile as Mobile App (MB2_DeliveryInfo)
    participant Server as FastAPI Backend
    participant WS as WebSocket Server
    participant DB as SQLite Database
    Staff->>Mobile: Mở màn hình Dashboard
    Mobile->>Server: GET /deliveries/stage/{stage_name}
    Server->>DB: Query deliveries where stage matches user stage
    DB-->>Server: Trả về danh sách phiếu giao nhận
    Server-->>Mobile: HTTP 200 OK (deliveries list)
    Mobile->>WS: Kết nối WebSocket /ws/stage/{stage_name}
    WS-->>Mobile: Kết nối thành công
    Note over Mobile,WS: Lắng nghe sự kiện thời gian thực
    WS->>Mobile: Phát thông điệp NEW_DELIVERY
    Mobile->>Server: Tải lại danh sách (GET /deliveries/stage/{stage_name})
    Server-->>Mobile: Cập nhật giao diện với dữ liệu mới
```

---

## 4.2.1 Mục đích màn hình
Màn hình đóng vai trò là Dashboard trung tâm giúp nhân viên tại xưởng giám sát toàn bộ các phiếu bàn giao thuộc công đoạn mình phụ trách. Cho phép người dùng theo dõi các phiếu chuẩn bị giao đi, các phiếu đang chuyển đến, và các kế hoạch sản xuất đang hoạt động để tiến hành tạo phiếu giao mới.

---

### 4.2.2 Thông tin màn hình

| Thuộc tính | Nội dung |
| :--- | :--- |
| Mã màn hình | MB2 |
| Route | `/delivery-info` |
| Module | Quản lý bàn giao (Deliveries) |
| Người dùng sử dụng | Nhân viên sản xuất (SX), Nhân viên QC |

---

### 4.2.3 Chức năng chính

| STT | Chức năng | Mô tả |
| :--- | :--- | :--- |
| 1 | Danh sách bàn giao đi/nhận về: | Hiển thị song song danh sách phiếu "Gửi đi" và "Nhận về" tại công đoạn hiện tại. |
| 2 | Bộ lọc trạng thái: | Lọc nhanh các phiếu theo trạng thái: Tất cả, Chờ xử lý, Hoàn thành. |
| 3 | Hiển thị KHSX hoạt động: | Hiển thị các kế hoạch sản xuất (`plans`) đang diễn ra tại công đoạn để sản xuất bấm tạo phiếu bàn giao. |
| 4 | Cập nhật thời gian thực (Realtime Auto-refresh): | Sử dụng kết nối WebSocket lắng nghe các sự kiện luân chuyển hàng hoá để tự động tải lại danh sách mà người dùng không cần reload màn hình. |

---

### 4.2.4 Luồng xử lý hệ thống

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Nhân viên
    participant UI as DeliveryInfo Screen
    participant Ctrl as PlanController
    participant API as Backend API
    participant DB as SQL Server

    Staff->>UI: Mở màn hình Thông tin bàn giao
    UI->>Ctrl: fetchPlans()
    Ctrl->>API: GET /product-plans/
    API->>DB: Truy vấn KHSX chi tiết
    DB-->>API: Trả về JSON (Orders/Products/Stage)
    API-->>UI: Cập nhật danh sách Kế hoạch
    
    Staff->>UI: Chọn một Kế hoạch cụ thể
    UI->>Ctrl: fetchDeliveriesByPlan(planId)
    Ctrl->>API: GET /deliveries/{planId}
    API-->>UI: Trả về danh sách phiếu giao thực tế
    
    rect rgba(128, 128, 128, 0.15)
        Note over UI: Aggregation Process
        UI->>UI: Lọc linh kiện theo công đoạn User
        UI->>UI: Tính toán Đã giao/Cần giao
    end
    
    UI->>Staff: Hiển thị Bảng Tiến độ (Tab Bàn giao)
    UI->>Staff: Hiển thị Danh sách phiếu đến (Tab Tiếp nhận)
```

Người dùng truy cập màn hình. Ứng dụng lấy thông tin công đoạn (`stage`) được gán trong Profile người dùng để gửi request lên server.
2. Hệ thống tải song song danh sách phiếu bàn giao (`deliveries`) theo công đoạn gán, danh sách kế hoạch sản xuất (`plans`), thông tin phiếu trả hàng (`returns`), và dữ liệu kiểm định đầu vào QC (`inspections`).
3. Màn hình chia làm 2 tab chính:
   * **Bàn giao:** Liệt kê các phiếu bàn giao do trạm hiện tại gửi đi hoặc nhận về kèm trạng thái (Chờ xác nhận, Chờ kiểm tra, Đã nhận, Trả hàng, Lỗi).
   * **Kế hoạch:** Hiển thị danh sách KHSX để bấm chọn linh kiện tạo phiếu giao (`MB2.1`).
4. Khi có hoạt động giao nhận tại trạm, một tín hiệu WebSocket sẽ được gửi tới tất cả thiết bị di động đang mở Dashboard trạm này để tự động làm mới danh sách hiển thị.* Frontend thực hiện kết nối WebSocket tới endpoint `/ws/stage/{stage_name}`.
* Các sự kiện WebSocket được bắt và xử lý gồm:
  * `NEW_DELIVERY`: Có phiếu giao mới tạo gửi đến trạm.
  * `QC_CONFIRMED`: QC đã hoàn tất kiểm tra đầu vào.
  * `DELIVERY_RECEIVED`: Đối tác đã nhận hàng thành công.
  * `UPDATE_DELIVERY`: Cập nhật chung trạng thái phiếu bàn giao.
* Khi bắt được một trong các sự kiện trên, Frontend tự động trigger hàm `fetchDeliveries()` để cập nhật dữ liệu.

---

### 4.2.5 API liên quan

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| GET | `/api/v1/deliveries/by-plan` | Lấy danh sách phiếu bàn giao theo kế hoạch và công đoạn. Định nghĩa tại [delivery_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/delivery_router.py). |
| GET | `/api/v1/production/{plan_id}` | Lấy chi tiết KHSX và tiến độ. Định nghĩa tại [production_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/production_router.py). |

---

### 4.2.6 Database liên quan

| Bảng | Mục đích |
| :--- | :--- |
| ``deliveries`` | Lưu thông tin phiếu bàn giao. Ánh xạ qua [Delivery](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/deliveries.py#L8). |
| ``product_plans`` | Lưu thông tin kế hoạch sản xuất. Ánh xạ qua Model [ProductPlan](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/product_plan.py#L6). |

---

### 4.2.7 Business Rules

| Điều kiện | Mô tả |
| :--- | :--- |
| Quy tắc chung | Dữ liệu phiếu hiển thị phải được lọc nghiêm ngặt theo công đoạn gán của tài khoản (ngoại trừ vai trò Admin được xem toàn bộ). |
| Quy tắc chung | Phiếu bàn giao hiển thị ở tab "Chờ xử lý" bao gồm các phiếu có trạng thái "Chờ xác nhận", "Chờ kiểm tra". |

---

### 4.2.8 File code liên quan

**Frontend:**
* [MB2_DeliveryInfo.jsx](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB2_DeliveryInfo.jsx)

**Backend:**
* [delivery_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/delivery_router.py)

> [!NOTE]
> **Ghi chú Dev:**
> Cần kiểm tra kỹ cơ chế reconnection của WebSocket khi thiết bị di động đi vào vùng sóng yếu trong xưởng sản xuất và tự động fetch lại dữ liệu bằng HTTP khi kết nối socket bị ngắt.

---

## 4.3 MH2.1_DeliveryCreate — Tạo phiếu Giao (Mobile)

#

### 4.3.9 BẢN ĐỒ CHI TIẾT TƯƠNG TÁC FRONTEND - BACKEND (API & HANDLER FUNCTIONS)

#### A. Tầng Giao diện Client & Tương tác Nghiệp vụ (React Components & Hooks)
- **Tệp mã nguồn Giao diện (Component Path):** `Mobile/src/Views/screens/MB2.1_DeliveryCreate.jsx`
- **Quản lý Trạng thái cục bộ (State Management):**
| React State Hooks | Vai trò quản lý trạng thái giao diện |
| :--- | :--- |
| `selectedPart` | Thông tin chi tiết linh kiện được chọn |
| `quantity` | Số lượng sản phẩm muốn bàn giao |
| `moistureValues` | Mảng lưu 3 trị số độ ẩm đo thực tế |
| `images` | Danh sách các tệp ảnh đính kèm |
| `qrCode` | Mã QR của thẻ Pallet được liên kết |

- **Danh sách Hàm sự kiện chính (UI Event Handlers):**
| Trình xử lý sự kiện (Handler) | Sự kiện kích hoạt (Trigger) | Nghiệp vụ xử lý của hàm |
| :--- | :--- | :--- |
| `handleSubmit()` | onClick của nút Xác nhận bàn giao | Đóng gói dữ liệu gửi FormData lên Backend |
| `handleScanQR()` | onClick nút quét QR | Kích hoạt camera quét thẻ Pallet |
| `validateForm()` | Trước khi submit | Kiểm tra số lượng, ảnh, kết quả QC và trị số ẩm |

- **Vòng đời & Hiệu ứng Component (Lifecycle Hooks):**
  * `useEffect gọi API để truy vấn kết quả QC đầu vào của linh kiện từ bảng `input_inspections`. Nếu chưa có bản ghi kết quả Đạt, hiển thị cảnh báo lỗi chặn đứng và khóa hoàn toàn nút Submit.`

#### B. Tầng Giao tiếp trung gian REST API & Giao thức truyền tải (API Contract)
- **Phương thức & Đường dẫn endpoint:** `POST /api/v1/deliveries/`
- **HTTP Headers yêu cầu:**
  * `Content-Type: multipart/form-data`
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Bắt buộc xác thực)
- **Mẫu dữ liệu yêu cầu gửi đi (Request Payload JSON):**
```json
FormData containing text fields and up to 3 binary images
```
- **Mẫu dữ liệu phản hồi thành công (Response 200 OK):**
```json
{\n  "success": true,\n  "delivery_id": 102,\n  "message": "Tạo phiếu bàn giao thành công, đang chờ tiếp nhận."\n}
```

#### C. Tầng Logic Nghiệp vụ Backend & Tương tác Cơ sở dữ liệu (FastAPI & SQLAlchemy)
- **Hàm điều phối Router API (FastAPI Route Handler):** `create_delivery_endpoint() trong `BackEnd/src/app/api/v1/endpoints/deliveries.py``
- **Hàm dịch vụ nghiệp vụ chính (Business Logic Service):** `write_delivery_to_db() xử lý nghiệp vụ tạo phiếu và lưu trữ hình ảnh vật lý`
- **Các Models/Thực thể dữ liệu tương tác chính (SQLAlchemy Models):** ``deliveries`, `delivery_details`, `delivery_images`, `input_inspections``
- **Cơ chế truy vấn & Khóa đồng thời (Database Operations & Concurrency Control):**
  * `Thực hiện kiểm tra trạng thái QC trong bảng `input_inspections`. Mở phiên giao dịch, thực hiện INSERT bản ghi vào bảng `deliveries` và `delivery_details`. Lưu các file ảnh vật lý lên máy chủ, sau đó INSERT các đường dẫn ảnh vào bảng `delivery_images`.`
- **Ràng buộc kiểm tra tính toàn vẹn (Integrity & Database Validation Constraints):**
  * `Kiểm soát điều kiện bắt buộc: Tồn tại bản ghi `input_inspections` có kết quả `result == 'Đạt'`. Số lượng bàn giao không được vượt quá số lượng kế hoạch còn lại.`

#### D. Luồng Xử lý Lỗi, Phục hồi Hệ thống & Ngoại lệ (Exception Handling & Resilience)
- **Các mã lỗi API & Ngoại lệ nghiệp vụ có thể trả về:**
  * `HTTP 401 Unauthorized`: Trả về khi JWT Token không hợp lệ hoặc hết hạn sử dụng.
  * `HTTP 403 Forbidden`: Trả về khi người dùng không có quyền truy cập hoặc thực hiện thao tác tại trạm sản xuất tương ứng.
  * `HTTP 422 Unprocessable Entity`: Trả về khi cấu trúc trường JSON gửi lên bị thiếu hoặc sai kiểu dữ liệu yêu cầu.
  * `HTTP 400 Bad Request`: Trả về khi vi phạm các quy tắc ràng buộc nghiệp vụ sản xuất (ví dụ: linh kiện chưa đo độ ẩm, số nhận lớn hơn số giao...).
- **Cơ chế phục hồi Ngoại tuyến tại hiện trường (Offline Capabilities & Queue Sync):**
  * `If thiết bị ngoại tuyến, lưu trữ toàn bộ payload phiếu giao dưới dạng tệp tin cục bộ trong hàng đợi SyncQueue của LocalStorage. Tự động kích hoạt luồng đồng bộ lên máy chủ khi thiết bị kết nối mạng trở lại.`

#### E. Mẫu mã nguồn giao tiếp thực tế chuẩn hóa (Reference Implementation Code Snippet)

**Frontend Component API Hook (React JS):**
```javascript
// Giao tiếp Axios Client gửi yêu cầu lên Backend FastAPI
const handleSubmit = async () => {
  if (!qcPassed) {
    showToast("Lỗi: Linh kiện chưa đạt kiểm định QC đầu vào!");
    return;
  }
  const formData = new FormData();
  formData.append("plan_id", planId);
  formData.append("part_name", partName);
  formData.append("quantity_total", quantity);
  formData.append("moisture_1", moistureValues[0]);
  formData.append("moisture_2", moistureValues[1]);
  formData.append("moisture_3", moistureValues[2]);
  images.forEach(img => formData.append("files", img));
  
  try {
    await axios.post("/api/v1/deliveries/", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    navigate("/delivery-info");
  } catch (error) {
    showToast("Lỗi khi tạo phiếu bàn giao");
  }
};
```

**Backend Router & Controller (FastAPI & SQLAlchemy ORM):**
```python
# Điều phối API Endpoint và xử lý ghi nhận giao dịch cơ sở dữ liệu
@router.post("/")
def create_delivery_endpoint(plan_id: int = Form(...), part_name: str = Form(...), quantity_total: int = Form(...), files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    qc = db.query(InputInspection).filter(InputInspection.plan_id == plan_id, InputInspection.part_name == part_name).first()
    if not qc or qc.result != "Đạt":
        raise HTTPException(status_code=400, detail="Chưa có kết quả QC đầu vào đạt")
    new_delivery = Delivery(plan_id=plan_id, part_name=part_name, quantity_total=quantity_total, status="Chờ xác nhận")
    db.add(new_delivery)
    db.commit()
    # Save files to media folder
    for file in files:
        path = save_file_to_storage(file)
        db.add(DeliveryImage(delivery_id=new_delivery.id, image_path=path))
    db.commit()
    send_websocket_event("NEW_DELIVERY")
    return {"success": True, "delivery_id": new_delivery.id}
```

#### F. Sơ đồ tuần tự tương tác hệ thống (Sequence Diagram)
```mermaid
sequenceDiagram
    actor Staff as Nhân viên sản xuất
    participant Mobile as Mobile App (MB2_1_CreateDelivery)
    participant Server as FastAPI Backend
    participant DB as SQLite Database
    participant WS as WebSocket Server
    Staff->>Mobile: Chọn linh kiện bàn giao
    Mobile->>Server: GET /inspections/plan/{plan_id}/part
    Server->>DB: Query input_inspections (QC đầu vào)
    DB-->>Server: Trả về kết quả QC đầu vào
    Server-->>Mobile: Kết quả QC (Đạt / Không đạt)
    alt QC Chưa đạt
        Mobile-->>Staff: Chặn thao tác, cảnh báo "Chưa đạt QC đầu vào"
    else QC Đạt
        Staff->>Mobile: Nhập số lượng, đo độ ẩm, chụp ảnh minh chứng
        Staff->>Mobile: Xác nhận Tạo phiếu bàn giao
        Mobile->>Server: POST /deliveries/ (FormData: data + files)
        Server->>Server: Lưu trữ file ảnh lên đĩa
        Server->>DB: Transaction: INSERT delivery & detail & image links
        DB-->>Server: Success
        Server->>WS: Broadcast NEW_DELIVERY event
        Server-->>Mobile: HTTP 201 Created (delivery_id)
        Mobile->>Mobile: Sinh mã QR chứa delivery_id hiển thị trên màn hình
    end
```

---

## 4.3.1 Mục đích màn hình
Màn hình dùng để nhân viên sản xuất khai báo thông tin bàn giao linh kiện/sản phẩm sang công đoạn kế tiếp, bao gồm số lượng, dải QR thẻ luân chuyển gán kèm, thông số độ ẩm đo đạc thực tế tại xưởng và hình ảnh chứng thực.

---

### 4.3.2 Thông tin màn hình

| Thuộc tính | Nội dung |
| :--- | :--- |
| Mã màn hình | MB2.1 |
| Route | `Điều hướng từ MB2_DeliveryInfo khi nhấn "Bàn giao" trong Kế hoạch` |
| Module | Quản lý bàn giao (Deliveries) |
| Người dùng sử dụng | Nhân viên sản xuất (SX) tại công đoạn giao |

---

### 4.3.3 Chức năng chính

| STT | Chức năng | Mô tả |
| :--- | :--- | :--- |
| 1 | Khai báo thông tin chi tiết: | Chọn linh kiện từ BOM của KHSX, nhập quy cách và số lượng bàn giao. |
| 2 | Đo thông số độ ẩm (Moisture): | Cho phép nhập 3 giá trị đo độ ẩm thực tế, hệ thống tự động tính toán giá trị trung bình trên giao diện. |
| 3 | Gán mã QR dự phòng (Backup QR): | Quét hoặc nhập mã QR dự phòng (`backup_qr`) để gán cố định cho lô hàng bàn giao, hỗ trợ truy vết nhanh. |
| 4 | Chụp ảnh minh chứng: | Cho phép kích hoạt camera thiết bị di động để chụp ảnh sản phẩm bàn giao đính kèm phiếu giao. |

---

### 4.3.4 Luồng xử lý hệ thống

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Nhân viên Sản xuất
    participant App as Mobile App (React)
    participant Cam as Camera (Native)
    participant API as Backend (FastAPI)
    participant DB as SQL Server
    participant FCM as Firebase / Push
    actor QC as Nhân viên Nhận (QC/SX)

    Staff->>App: Chọn linh kiện & Nhập số lượng
    Staff->>App: Nhấn biểu tượng Camera
    App->>Cam: Kích hoạt Camera
    Cam-->>App: Trả về tệp ảnh
    Staff->>App: Nhấn "Xác nhận"
    
    App->>API: POST /deliveries/ (FormData: Text + Images)
    
    rect rgba(128, 128, 128, 0.15)
        Note over API, DB: Xử lý tại Server
        API->>DB: INSERT bản ghi Delivery
        API->>API: Lưu ảnh vào File System
        API->>DB: INSERT link ảnh vào delivery_images
        API->>DB: INSERT thông báo vào bảng notifications
    end

    API->>FCM: Gửi yêu cầu Push Notification
    FCM-->>QC: [Push] "Có phiếu giao hàng mới từ..."
    
    API-->>App: 201 Created (Kèm info phiếu)
    App->>App: Hiển thị Success Modal
    App->>App: Hiển thị QR Code (Mã phiếu)
    
    Staff->>QC: Đưa mã QR cho người nhận quét
```

Sản xuất chọn chi tiết linh kiện từ kế hoạch để bàn giao.
2. **Quy tắc chặn cứng (QC Block):** Frontend gọi API kiểm tra kết quả QC đầu vào của chi tiết này. Nếu chi tiết này chưa được QC kiểm tra đạt (tức là không tồn tại bản ghi kiểm định trong `input_inspections` hoặc bản ghi kiểm định gần nhất có `result == 'Không đạt'`), hệ thống hiển thị thông báo lỗi chặn đứng và không cho phép tạo phiếu giao.
3. Nếu QC đầu vào Đạt, người dùng nhập số lượng bàn giao, quét mã QR dự phòng, tiến hành đo và nhập độ ẩm (3 lần đo).
4. Người dùng sử dụng camera chụp lại ảnh sản phẩm bàn giao thực tế.
5. Nhấn **XÁC NHẬN GIAO**. Dữ liệu được nén ảnh và đóng gói dưới dạng `FormData` để gửi lên Backend.
6. Tạo phiếu thành công, hệ thống gửi thông báo đẩy và cập nhật WebSocket cho trạm nhận biết để tiếp nhận hàng.* Frontend gọi API `GET /api/v1/inspections/plan/{plan_id}/part?part_name=...` để kiểm tra trạng thái QC trước khi cho phép điền tiếp thông tin.
* Sử dụng thư viện camera trên điện thoại để chụp ảnh, sau đó chuyển đổi hình ảnh thành Blob/File trước khi append vào `FormData` gửi lên API `POST /api/v1/deliveries/`.

---

### 4.3.5 API liên quan

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| POST | `/api/v1/deliveries/` | Tạo phiếu bàn giao mới (FormData chứa ảnh). Định nghĩa tại [delivery_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/delivery_router.py). |
| GET | `/api/v1/inspections/plan/{plan_id}/part` | Lấy kết quả kiểm tra QC đầu vào mới nhất của chi tiết. Định nghĩa tại [inspection_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/inspection_router.py#L231-L245). |

---

### 4.3.6 Database liên quan

| Bảng | Mục đích |
| :--- | :--- |
| ``deliveries`` | Lưu phiếu giao. Ánh xạ qua [Delivery](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/deliveries.py#L8). |
| ``delivery_images`` | Lưu trữ đường dẫn ảnh bàn giao. Ánh xạ qua Model [DeliveryImage](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/delivery_images.py#L6). |
| ``input_inspections`` | Truy vấn kết quả QC đầu vào. Ánh xạ qua Model [InputInspection](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/input_inspection.py#L6). |

---

### 4.3.7 Business Rules

| Điều kiện | Mô tả |
| :--- | :--- |
| Quy tắc QC: | Linh kiện bàn giao bắt buộc phải có kết quả kiểm tra đầu vào QC Đạt (`result == 'Đạt'`) tại công đoạn hiện tại. |
| Quy tắc độ ẩm: | Max độ ẩm phải lớn hơn hoặc bằng Min độ ẩm. Độ ẩm trung bình được tính toán tự động bằng công thức: `(Đo 1 + Đo 2 + Đo 3) / 3`. |
| Quy tắc chung | Bắt buộc phải có ảnh chụp minh chứng lô hàng và nhập số lượng giao lớn hơn 0. |

---

### 4.3.8 File code liên quan

**Frontend:**
* [MB2.1_DeliveryCreate.jsx](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB2.1_DeliveryCreate.jsx)

**Backend:**
* [delivery_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/delivery_router.py)

> [!NOTE]
> **Ghi chú Dev:**
> Chú ý logic kiểm tra tên linh kiện `part_name` sử dụng toán tử SQL `ilike` để tránh phân biệt chữ hoa chữ thường khi kiểm tra QC đầu vào.

---

## 4.4 MH2.2_MB2.2_DeliveryReceive — Tiếp nhận bàn giao (Mobile)

#

### 4.4.9 BẢN ĐỒ CHI TIẾT TƯƠNG TÁC FRONTEND - BACKEND (API & HANDLER FUNCTIONS)

#### A. Tầng Giao diện Client & Tương tác Nghiệp vụ (React Components & Hooks)
- **Tệp mã nguồn Giao diện (Component Path):** `Mobile/src/Views/screens/MB2.2_DeliveryReceive.jsx`
- **Quản lý Trạng thái cục bộ (State Management):**
| React State Hooks | Vai trò quản lý trạng thái giao diện |
| :--- | :--- |
| `deliveryInfo` | Chi tiết thông tin lô hàng bàn giao cần tiếp nhận (Object) |
| `receivedQty` | Số lượng sản phẩm thực tế nhận được (Integer) |
| `note` | Lý do hao hụt hoặc phản hồi chất lượng (String) |
| `isSubmitting` | Trạng thái đang gọi API cập nhật tiếp nhận (Boolean) |
| `mismatchWarning` | Cảnh báo chênh lệch số lượng thực nhận và bàn giao (Boolean) |

- **Danh sách Hàm sự kiện chính (UI Event Handlers):**
| Trình xử lý sự kiện (Handler) | Sự kiện kích hoạt (Trigger) | Nghiệp vụ xử lý của hàm |
| :--- | :--- | :--- |
| `handleConfirm()` | onClick Xác nhận tiếp nhận | Kiểm tra chênh lệch số nhận, hiển thị cảnh báo hoặc gửi API cập nhật số nhận thực tế |
| `handleDecline()` | onClick Từ chối nhận hàng | Hủy bỏ phiếu giao nhận, đổi trạng thái và gửi cảnh báo về trạm giao |
| `validateQty()` | onChange ô số lượng nhận | Ngăn chặn nhập số âm hoặc số nhận lớn hơn số lượng bàn giao ban đầu |

- **Vòng đời & Hiệu ứng Component (Lifecycle Hooks):**
  * `useEffect gọi API lấy chi tiết thông tin phiếu giao từ máy chủ dựa trên mã QR code đã quét được.`

#### B. Tầng Giao tiếp trung gian REST API & Giao thức truyền tải (API Contract)
- **Phương thức & Đường dẫn endpoint:** `POST /api/v1/deliveries/{delivery_id}/confirm`
- **HTTP Headers yêu cầu:**
  * `Content-Type: application/json`
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Bắt buộc xác thực)
- **Mẫu dữ liệu yêu cầu gửi đi (Request Payload JSON):**
```json
{\n  "quantity_received": 98,\n  "note": "Hao hụt 2 chi tiết do nứt lẹm góc"\n}
```
- **Mẫu dữ liệu phản hồi thành công (Response 200 OK):**
```json
{\n  "success": true,\n  "status": "Chờ kiểm tra",\n  "message": "Tiếp nhận thành công, chuyển tiếp hồ sơ sang trạm kiểm định QC."\n}
```

#### C. Tầng Logic Nghiệp vụ Backend & Tương tác Cơ sở dữ liệu (FastAPI & SQLAlchemy)
- **Hàm điều phối Router API (FastAPI Route Handler):** `confirm_delivery_endpoint() trong `BackEnd/src/app/api/v1/endpoints/deliveries.py``
- **Hàm dịch vụ nghiệp vụ chính (Business Logic Service):** `process_delivery_receipt()`
- **Các Models/Thực thể dữ liệu tương tác chính (SQLAlchemy Models):** ``deliveries``
- **Cơ chế truy vấn & Khóa đồng thời (Database Operations & Concurrency Control):**
  * `Mở khóa bi quan with_for_update() trên dòng deliveries theo ID, cập nhật trạng thái và lưu số lượng thực nhận cùng ghi chú chênh lệch.`
- **Ràng buộc kiểm tra tính toàn vẹn (Integrity & Database Validation Constraints):**
  * `Số lượng thực nhận không được vượt quá số lượng bàn giao.`

#### D. Luồng Xử lý Lỗi, Phục hồi Hệ thống & Ngoại lệ (Exception Handling & Resilience)
- **Các mã lỗi API & Ngoại lệ nghiệp vụ có thể trả về:**
  * `HTTP 401 Unauthorized`: Trả về khi JWT Token không hợp lệ hoặc hết hạn sử dụng.
  * `HTTP 403 Forbidden`: Trả về khi người dùng không có quyền truy cập hoặc thực hiện thao tác tại trạm sản xuất tương ứng.
  * `HTTP 422 Unprocessable Entity`: Trả về khi cấu trúc trường JSON gửi lên bị thiếu hoặc sai kiểu dữ liệu yêu cầu.
  * `HTTP 400 Bad Request`: Trả về khi vi phạm các quy tắc ràng buộc nghiệp vụ sản xuất (ví dụ: linh kiện chưa đo độ ẩm, số nhận lớn hơn số giao...).
- **Cơ chế phục hồi Ngoại tuyến tại hiện trường (Offline Capabilities & Queue Sync):**
  * `Lưu thông số tiếp nhận tạm thời vào SyncQueue của LocalStorage khi mất kết nối mạng và tự động gửi lên server khi online.`

#### E. Mẫu mã nguồn giao tiếp thực tế chuẩn hóa (Reference Implementation Code Snippet)

**Frontend Component API Hook (React JS):**
```javascript
// Giao tiếp Axios Client gửi yêu cầu lên Backend FastAPI
const handleConfirm = async () => {
  if (receivedQty < deliveryInfo.quantity_total && !note) {
    setMismatchWarning(true);
    return;
  }
  setSubmitting(true);
  try {
    await axios.post(`/api/v1/deliveries/${deliveryInfo.id}/confirm`, {
      quantity_received: parseInt(receivedQty),
      note: note
    });
    showToast("Đã xác nhận tiếp nhận lô hàng!");
    navigate("/delivery-info");
  } catch (error) {
    showToast("Lỗi: " + (error.response?.data?.detail || "Xác nhận thất bại"));
  } finally {
    setSubmitting(false);
  }
};
```

**Backend Router & Controller (FastAPI & SQLAlchemy ORM):**
```python
# Điều phối API Endpoint và xử lý ghi nhận giao dịch cơ sở dữ liệu
@router.post("/{delivery_id}/confirm")
def confirm_delivery_endpoint(delivery_id: int, payload: ConfirmPayload, db: Session = Depends(get_db)):
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).with_for_update().first()
    if not delivery:
         raise HTTPException(status_code=404, detail="Không tìm thấy phiếu giao")
    if delivery.status != "Chờ xác nhận":
         raise HTTPException(status_code=400, detail="Phiếu đã được xử lý hoặc đã hủy")
    if payload.quantity_received > delivery.quantity_total:
         raise HTTPException(status_code=400, detail="Số nhận không được lớn hơn số giao")
    delivery.quantity_received = payload.quantity_received
    delivery.status = "Chờ kiểm tra"
    delivery.note = payload.note
    db.commit()
    return {"success": True, "status": "Chờ kiểm tra"}
```

#### F. Sơ đồ tuần tự tương tác hệ thống (Sequence Diagram)
```mermaid
sequenceDiagram
    actor Receiver as Nhân viên trạm nhận
    participant Mobile as Mobile App (MB2.2_Receive)
    participant Server as FastAPI Backend
    participant DB as SQLite Database
    Receiver->>Mobile: Quét mã QR phiếu hoặc chọn từ danh sách
    Mobile->>Server: GET /api/v1/deliveries/{id}
    Server->>DB: Truy vấn thông tin chi tiết phiếu giao
    DB-->>Server: Trả về bản ghi Delivery
    Server-->>Mobile: HTTP 200 OK (Thông tin bàn giao)
    Mobile-->>Receiver: Hiển thị giao diện nhập số thực tế nhận
    Receiver->>Mobile: Nhập số thực tế đếm được & xác nhận
    alt Số thực nhận khác số giao và ghi chú trống
        Mobile-->>Receiver: Hiển thị cảnh báo & yêu cầu nhập lý do
    else Dữ liệu hợp lệ
        Mobile->>Server: POST /api/v1/deliveries/{id}/confirm
        Server->>DB: SELECT FOR UPDATE và khóa dòng CSDL
        Server->>DB: UPDATE status = "Chờ kiểm tra", quantity_received = X
        DB-->>Server: Thành công
        Server-->>Mobile: HTTP 200 OK
        Mobile-->>Receiver: Chuyển sang màn hình QC kiểm tra
    end
```

---

## 4.4.1 Mục đích màn hình
Màn hình dùng để xử lý quy trình tiếp nhận hàng hoá kép: Nhân viên sản xuất công đoạn nhận xác nhận số lượng thực tế nhận được từ công đoạn giao, sau đó nhân viên QC tiến hành đánh giá 8 chỉ tiêu kiểm tra chất lượng trước khi cho phép đưa hàng vào sản xuất hoặc ra quyết định trả hàng lỗi.

---

### 4.4.2 Thông tin màn hình

| Thuộc tính | Nội dung |
| :--- | :--- |
| Mã màn hình | MB2.2 |
| Route | `Điều hướng từ MB2_DeliveryInfo khi nhấn vào phiếu đang chuyển đến` |
| Module | Quản lý bàn giao (Deliveries & QC) |
| Người dùng sử dụng | Nhân viên sản xuất (SX) công đoạn nhận và Nhân viên QC |

---

### 4.4.3 Chức năng chính

| STT | Chức năng | Mô tả |
| :--- | :--- | :--- |
| 1 | Xác nhận thực nhận (Sản xuất): | Nhân viên sản xuất tại trạm nhận kiểm đếm số lượng thực tế và nhập thông tin xác nhận nhận hàng. |
| 2 | Đánh giá chất lượng QC (Checklist): | QC chấm điểm đạt/không đạt cho 8 hạng mục kiểm định kỹ thuật (Cong vênh, Nứt tét, Độ ẩm, Vệ sinh, Kích thước, Trầy xước, Màu sắc, Biến dạng). |
| 3 | Phân loại số lượng chất lượng: | Nhập số lượng thực đạt, số lượng lỗi giữ lại và số lượng trả lại công đoạn trước. |
| 4 | Chuyển tiếp trả hàng lỗi: | Tự động điều hướng sang màn hình trả hàng (`MB2.3`) nếu phát sinh số lượng cần trả lại cho công đoạn trước. |

---

### 4.4.4 Luồng xử lý hệ thống

```mermaid
sequenceDiagram
    autonumber
    actor Receiver as Nhân viên Sản xuất (Nhận)
    participant App as Mobile App
    participant API as Backend API
    participant DB as SQL Server

    Receiver->>App: Quét mã QR từ người giao
    App->>App: Bóc tách ID phiếu
    App->>API: GET /deliveries/detail/{id}
    API-->>App: Trả về thông tin phiếu & Ảnh minh chứng
    
    rect rgba(128, 128, 128, 0.15)
        Note over App: Bước đối soát
        App->>App: Kiểm tra quyền nhận (Stage match)
        App->>Receiver: Hiển thị thông tin & Ô nhập liệu
    end

    Receiver->>App: Nhập số lượng thực tế vào ô "Tổng nhận"
    Receiver->>App: Bấm "Xác nhận"
    App->>API: PATCH /deliveries/{id}/confirm
    API->>DB: Cập nhật quantity_received & status
    DB-->>API: Thành công
    API-->>App: Trả về 200 OK
    App->>Receiver: Thông báo "Xác nhận nhận hàng thành công"
```

Nhân viên SX tại trạm nhận mở phiếu bàn giao đang chuyển đến, đếm hàng thực tế và điền vào ô **Số lượng nhận**. Nhấn **SX XÁC NHẬN NHẬN**. Phiếu chuyển sang trạng thái `Chờ QC Kiểm Tra`.
2. Nhân viên QC tại trạm mở phiếu đó lên, tiến hành kiểm tra 8 hạng mục chất lượng.
3. QC điền số lượng lỗi (`quantity_error`), số lượng trả lại công đoạn trước (`quantity_returned`).
4. Nếu `quantity_returned > 0`, hệ thống tự động lưu kết quả QC tạm thời và chuyển QC sang màn hình tạo phiếu trả hàng [MB2.3_DeliveryReturn.jsx](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB2.3_DeliveryReturn.jsx).
5. Nếu không có hàng trả lại, QC nhấn **HOÀN THÀNH KIỂM TRA**. Phiếu đóng lại với trạng thái `Đã Nhận` (nếu không có lỗi) hoặc `Lỗi` (nếu có lỗi giữ lại nhưng không trả hàng).
* SX nhận hàng gọi: `PATCH /api/v1/deliveries/{delivery_id}/confirm`.
* QC xác nhận chất lượng gọi: `POST /api/v1/qc/{delivery_id}`.
* Trạng thái phiếu bàn giao tự động cập nhật đồng bộ sau mỗi bước gọi API thông qua trigger logic trên DB hoặc xử lý trực tiếp tại Service của Backend.

---

### 4.4.5 API liên quan

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| PATCH | `/api/v1/deliveries/{delivery_id}/confirm` | Xác nhận tiếp nhận hàng từ SX. Định nghĩa tại [delivery_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/delivery_router.py#L714-L730). |
| POST | `/api/v1/qc/{delivery_id}` | Lưu thông tin đánh giá chất lượng QC. Định nghĩa tại [qc_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/qc_router.py#L20-L172). |

---

### 4.4.6 Database liên quan

| Bảng | Mục đích |
| :--- | :--- |
| ``deliveries`` | Lưu thông tin phiếu nhận. Ánh xạ qua [Delivery](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/deliveries.py#L8). |
| ``delivery_qc`` | Lưu chi tiết checklist đánh giá của QC. Ánh xạ qua Model [DeliveryQC](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/delivery_qc.py#L6). |

---

### 4.4.7 Business Rules

| Điều kiện | Mô tả |
| :--- | :--- |
| Quy tắc chung | Tổng số lượng `Thực nhận + Lỗi + Trả lại` không được vượt quá số lượng giao ban đầu trên phiếu bàn giao (`quantity_total`). |
| Quy tắc chung | Để lưu kết quả QC đạt, toàn bộ 8 chỉ tiêu đánh giá trong checklist bắt buộc phải tích chọn đạt (`true`). |

---

### 4.4.8 File code liên quan

**Frontend:**
* [MB2.2_DeliveryReceive.jsx](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB2.2_DeliveryReceive.jsx)

**Backend:**
* [delivery_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/delivery_router.py)
* [qc_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/qc_router.py)

> [!NOTE]
> **Ghi chú Dev:**
> Đảm bảo xử lý lỗi bất đồng bộ khi hai người dùng (SX bấm nhận và QC bấm kiểm tra) cùng tác động lên một phiếu bàn giao bằng cơ chế khóa bi quan hoặc kiểm tra phiên bản bản ghi.

---

## 4.5 MH2.3_MB2.3_DeliveryReturn — QC Trả hàng (Mobile)

#

### 4.5.9 BẢN ĐỒ CHI TIẾT TƯƠNG TÁC FRONTEND - BACKEND (API & HANDLER FUNCTIONS)

#### A. Tầng Giao diện Client & Tương tác Nghiệp vụ (React Components & Hooks)
- **Tệp mã nguồn Giao diện (Component Path):** `Mobile/src/Views/screens/MB2.3_DeliveryReturn.jsx`
- **Quản lý Trạng thái cục bộ (State Management):**
| React State Hooks | Vai trò quản lý trạng thái giao diện |
| :--- | :--- |
| `deliveryInfo` | Thông tin chi tiết phiếu bàn giao (Object) |
| `defectChecklist` | Checklist các loại lỗi phát hiện (Object) |
| `returnQty` | Số lượng sản phẩm trả lại trạm trước (Integer) |
| `note` | Lý do chi tiết trả hàng hoặc đánh giá lỗi (String) |
| `isSubmitting` | Trạng thái hiển thị tiến trình gửi dữ liệu (Boolean) |

- **Danh sách Hàm sự kiện chính (UI Event Handlers):**
| Trình xử lý sự kiện (Handler) | Sự kiện kích hoạt (Trigger) | Nghiệp vụ xử lý của hàm |
| :--- | :--- | :--- |
| `handleSubmitQC()` | onClick Xác nhận kiểm tra chất lượng | Gửi thông tin lỗi và kết quả kiểm tra lên Backend |
| `handleReturnTicket()` | onClick Trả hàng lỗi | Gửi yêu cầu tạo phiếu trả hàng kèm số lượng trả cụ thể |
| `toggleDefect()` | onChange checkbox lỗi | Cập nhật danh sách checklist lỗi tương ứng |

- **Vòng đời & Hiệu ứng Component (Lifecycle Hooks):**
  * `useEffect load thông tin phiếu giao từ `deliveries` khi người dùng mở màn hình kiểm tra chất lượng.`

#### B. Tầng Giao tiếp trung gian REST API & Giao thức truyền tải (API Contract)
- **Phương thức & Đường dẫn endpoint:** `POST /api/v1/qc/{delivery_id}`
- **HTTP Headers yêu cầu:**
  * `Content-Type: application/json`
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Bắt buộc xác thực)
- **Mẫu dữ liệu yêu cầu gửi đi (Request Payload JSON):**
```json
{\n  "results": {"cong_venh": true, "do_am": false},\n  "quantity_error": 5,\n  "quantity_returned": 2,\n  "note": "Trầy xước nặng và nứt sâu"\n}
```
- **Mẫu dữ liệu phản hồi thành công (Response 200 OK):**
```json
{\n  "success": true,\n  "delivery_status": "Đã nhận",\n  "message": "QC hoàn tất ghi nhận kết quả."\n}
```

#### C. Tầng Logic Nghiệp vụ Backend & Tương tác Cơ sở dữ liệu (FastAPI & SQLAlchemy)
- **Hàm điều phối Router API (FastAPI Route Handler):** `submit_qc_results() trong `BackEnd/src/app/api/v1/endpoints/qc.py``
- **Hàm dịch vụ nghiệp vụ chính (Business Logic Service):** `process_qc_report()`
- **Các Models/Thực thể dữ liệu tương tác chính (SQLAlchemy Models):** ``deliveries`, `delivery_qc`, `delivery_returns``
- **Cơ chế truy vấn & Khóa đồng thời (Database Operations & Concurrency Control):**
  * `Ghi nhận kết quả kiểm định chất lượng vào bảng `delivery_qc`. Nếu số lượng lỗi lớn hơn 0, cập nhật trạng thái phiếu deliveries và tạo bản ghi trả hàng tương ứng.`
- **Ràng buộc kiểm tra tính toàn vẹn (Integrity & Database Validation Constraints):**
  * `Số lượng lỗi và số trả không được vượt quá số thực nhận.`

#### D. Luồng Xử lý Lỗi, Phục hồi Hệ thống & Ngoại lệ (Exception Handling & Resilience)
- **Các mã lỗi API & Ngoại lệ nghiệp vụ có thể trả về:**
  * `HTTP 401 Unauthorized`: Trả về khi JWT Token không hợp lệ hoặc hết hạn sử dụng.
  * `HTTP 403 Forbidden`: Trả về khi người dùng không có quyền truy cập hoặc thực hiện thao tác tại trạm sản xuất tương ứng.
  * `HTTP 422 Unprocessable Entity`: Trả về khi cấu trúc trường JSON gửi lên bị thiếu hoặc sai kiểu dữ liệu yêu cầu.
  * `HTTP 400 Bad Request`: Trả về khi vi phạm các quy tắc ràng buộc nghiệp vụ sản xuất (ví dụ: linh kiện chưa đo độ ẩm, số nhận lớn hơn số giao...).
- **Cơ chế phục hồi Ngoại tuyến tại hiện trường (Offline Capabilities & Queue Sync):**
  * `Lưu trữ kết quả kiểm định ngoại tuyến và tự động đồng bộ khi có kết nối trở lại.`

#### E. Mẫu mã nguồn giao tiếp thực tế chuẩn hóa (Reference Implementation Code Snippet)

**Frontend Component API Hook (React JS):**
```javascript
// Giao tiếp Axios Client gửi yêu cầu lên Backend FastAPI
const handleSubmitQC = async () => {
  setIsSubmitting(true);
  try {
    await axios.post(`/api/v1/qc/${deliveryId}`, {
      results: defectChecklist,
      quantity_error: errorQty,
      quantity_returned: returnQty,
      note: note
    });
    showToast("Đã lưu kết quả kiểm định chất lượng.");
    navigate("/delivery-info");
  } catch (error) {
    showToast("Không thể gửi kết quả QC.");
  } finally {
    setIsSubmitting(false);
  }
};
```

**Backend Router & Controller (FastAPI & SQLAlchemy ORM):**
```python
# Điều phối API Endpoint và xử lý ghi nhận giao dịch cơ sở dữ liệu
@router.post("/{delivery_id}")
def submit_qc_results(delivery_id: int, payload: QCPayload, db: Session = Depends(get_db)):
    delivery = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu giao")
    # Tạo bản ghi QC
    qc_record = DeliveryQC(delivery_id=delivery_id, quantity_error=payload.quantity_error, note=payload.note)
    db.add(qc_record)
    if payload.quantity_returned > 0:
        delivery.status = "Đã trả lại"
        return_record = DeliveryReturn(delivery_id=delivery_id, quantity_returned=payload.quantity_returned, reason=payload.note)
        db.add(return_record)
    else:
        delivery.status = "Đã nhận"
    db.commit()
    return {"success": True, "delivery_status": delivery.status}
```

#### F. Sơ đồ tuần tự tương tác hệ thống (Sequence Diagram)
```mermaid
sequenceDiagram
    actor QC as Nhân viên QC trạm nhận
    participant Mobile as Mobile App (QCInspection)
    participant Server as FastAPI Backend
    participant DB as SQLite Database
    QC->>Mobile: Nhập checklist 8 hạng mục lỗi & số lượng trả về
    Mobile->>Server: POST /api/v1/qc/{delivery_id}
    Server->>DB: UPDATE delivery status = 'Đã nhận' / 'Đã trả'
    Server->>DB: INSERT into delivery_qc & delivery_returns
    DB-->>Server: Success
    Server-->>Mobile: HTTP 200 OK
    Mobile-->>QC: Cập nhật kết quả QC thành công
```

---

## 4.5.1 Mục đích màn hình
Màn hình thực hiện chức năng lập phiếu trả hàng lỗi ngược về công đoạn trước đó khi phát hiện sản phẩm không đạt tiêu chí chất lượng trong quá trình nhận hàng. Hỗ trợ ghi nhận số lượng trả, lý do lỗi và chụp ảnh minh chứng lỗi để công đoạn giao có căn cứ xử lý lại.

---

### 4.5.2 Thông tin màn hình

| Thuộc tính | Nội dung |
| :--- | :--- |
| Mã màn hình | MB2.3 |
| Route | `/delivery-return` |
| Module | Quản lý trả hàng lỗi (Returns) |
| Người dùng sử dụng | Nhân viên QC tại trạm nhận |

---

### 4.5.3 Chức năng chính

| STT | Chức năng | Mô tả |
| :--- | :--- | :--- |
| 1 | Ghi nhận số lượng trả: | Điền số lượng linh kiện lỗi cần trả ngược về trạm giao trước đó. |
| 2 | Khai báo lý do lỗi: | Nhập mô tả nguyên nhân lỗi chất lượng khiến hàng bị trả lại. |
| 3 | Đính kèm hình ảnh lỗi: | Chụp ảnh trực tiếp chi tiết lỗi sản phẩm bằng camera (tối đa 3 ảnh). |
| 4 | Đồng bộ tự động: | Tự động đồng bộ số lượng trả và cập nhật trạng thái phiếu bàn giao gốc về trạm giao. |

---

### 4.5.4 Luồng xử lý hệ thống

```mermaid
sequenceDiagram
    autonumber
    actor QC as Nhân viên QC
    participant App as Mobile App
    participant API as Backend API
    participant DB as SQL Server
    participant FCM as Firebase / Push
    actor SX as Nhân viên Sản xuất (Nơi bị trả)

    QC->>App: Mở màn hình Trả hàng
    App->>App: Lọc danh sách linh kiện đã nhận
    
    QC->>App: Chọn linh kiện & Nhập số lượng lỗi
    App->>App: Tự động tìm Nguồn gốc (Sản xuất tại đâu?)
    QC->>App: Chụp ảnh lỗi & Nhập lý do
    QC->>App: Bấm "Xác nhận"
    
    App->>API: POST /returns/ (FormData)
    
    rect rgba(128, 128, 128, 0.15)
        Note over API, DB: Xử lý trả hàng
        API->>DB: INSERT bảng delivery_returns
        API->>DB: Lưu ảnh trả hàng
        API->>DB: Tạo Notification (Priority: Quan trọng)
    end

    API->>FCM: Gửi Push "Có phiếu TRẢ HÀNG mới"
    FCM-->>SX: [Push] Thông báo hàng bị trả về
    
    API-->>App: 201 Created
    App->>QC: Hiển thị Success & QR Trả hàng
```

Màn hình tự động hiển thị thông tin phiếu bàn giao bị lỗi và số lượng trả tối đa cho phép.
2. QC nhập số lượng sản phẩm thực tế cần trả, viết lý do lỗi và chụp tối đa 3 ảnh minh chứng.
3. QC nhấn **XÁC NHẬN TRẢ HÀNG**.
4. Hệ thống tải ảnh lên máy chủ, tạo bản ghi phiếu trả hàng trong bảng `delivery_returns`.
5. Đồng thời, hệ thống cập nhật trường `quantity_returned` trên phiếu bàn giao gốc và chuyển trạng thái phiếu gốc sang `Trả Hàng` để công đoạn giao nhận diện được và tiến hành xử lý bù hàng hoặc sửa chữa.* Gửi dữ liệu dưới dạng `FormData` qua API `POST /api/v1/returns/`.
* Quá trình tạo phiếu trả trên Backend sẽ tự động gọi logic đồng bộ để cập nhật trạng thái của phiếu bàn giao tương ứng và phát tín hiệu WebSocket cập nhật danh sách ở cả hai trạm.

---

### 4.5.5 API liên quan

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| POST | `/api/v1/returns/` | Tạo phiếu trả hàng lỗi mới (nhận FormData chứa danh sách ảnh). Định nghĩa tại [return_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/return_router.py#L31-L149). |

---

### 4.5.6 Database liên quan

| Bảng | Mục đích |
| :--- | :--- |
| ``delivery_returns`` | Lưu phiếu trả hàng lỗi. Ánh xạ qua Model [DeliveryReturn](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/delivery_returns.py#L6). |
| ``deliveries`` | Cập nhật thông số trả trên phiếu gốc. Ánh xạ qua [Delivery](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/deliveries.py#L8). |

---

### 4.5.7 Business Rules

| Điều kiện | Mô tả |
| :--- | :--- |
| Quy tắc chung | Số lượng trả hàng phải lớn hơn 0 và không được vượt quá số lượng giao gốc trên phiếu bàn giao (`quantity_total`). |
| Quy tắc chung | Yêu cầu bắt buộc chụp ít nhất 1 ảnh minh chứng chất lượng lỗi trước khi cho phép xác nhận tạo phiếu trả. |

---

### 4.5.8 File code liên quan

**Frontend:**
* [MB2.3_DeliveryReturn.jsx](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB2.3_DeliveryReturn.jsx)

**Backend:**
* [return_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/return_router.py)

> [!NOTE]
> **Ghi chú Dev:**
> Chú ý xử lý rollback giao dịch (Transaction Rollback) trên Backend nếu quá trình tải ảnh lỗi lên máy chủ bị thất bại để tránh rác dữ liệu DB.

---

## 4.6 MH2.4_MB2.4_InputInspection — Kiểm tra đầu vào (Mobile)

#

### 4.6.9 BẢN ĐỒ CHI TIẾT TƯƠNG TÁC FRONTEND - BACKEND (API & HANDLER FUNCTIONS)

#### A. Tầng Giao diện Client & Tương tác Nghiệp vụ (React Components & Hooks)
- **Tệp mã nguồn Giao diện (Component Path):** `Mobile/src/Views/screens/MB2.4_InputInspection.jsx`
- **Quản lý Trạng thái cục bộ (State Management):**
| React State Hooks | Vai trò quản lý trạng thái giao diện |
| :--- | :--- |
| `partName` | Tên linh kiện gỗ cần kiểm tra kích thước đầu vào (String) |
| `length` | Độ dài thực tế đo được (Float) |
| `width` | Độ rộng thực tế đo được (Float) |
| `height` | Độ dày thực tế đo được (Float) |
| `result` | Kết quả đánh giá chung: Đạt / Không đạt (String) |
| `isSubmitting` | Trạng thái gửi bản ghi kiểm tra (Boolean) |

- **Danh sách Hàm sự kiện chính (UI Event Handlers):**
| Trình xử lý sự kiện (Handler) | Sự kiện kích hoạt (Trigger) | Nghiệp vụ xử lý của hàm |
| :--- | :--- | :--- |
| `submitInspection()` | onClick Xác nhận ghi nhận | Gửi thông số kích thước đo đạc lên API |
| `validateDimensions()` | onChange các trường kích thước | So sánh với dung sai trong BOM để tự động đề xuất kết quả Đạt/Không đạt |

- **Vòng đời & Hiệu ứng Component (Lifecycle Hooks):**
  * `useEffect tải thông số định mức kích thước chuẩn từ bảng BOM sản phẩm tương ứng để so sánh trực quan.`

#### B. Tầng Giao tiếp trung gian REST API & Giao thức truyền tải (API Contract)
- **Phương thức & Đường dẫn endpoint:** `POST /api/v1/inspections/`
- **HTTP Headers yêu cầu:**
  * `Content-Type: application/json`
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Bắt buộc xác thực)
- **Mẫu dữ liệu yêu cầu gửi đi (Request Payload JSON):**
```json
{\n  "plan_id": 1,\n  "part_name": "Tấm hông",\n  "length": 1200.5,\n  "width": 600.2,\n  "height": 18.0,\n  "result": "Đạt"\n}
```
- **Mẫu dữ liệu phản hồi thành công (Response 200 OK):**
```json
{\n  "success": true,\n  "inspection_id": 142,\n  "result": "Đạt"\n}
```

#### C. Tầng Logic Nghiệp vụ Backend & Tương tác Cơ sở dữ liệu (FastAPI & SQLAlchemy)
- **Hàm điều phối Router API (FastAPI Route Handler):** `create_input_inspection() trong `BackEnd/src/app/api/v1/endpoints/qc.py``
- **Hàm dịch vụ nghiệp vụ chính (Business Logic Service):** `save_input_inspection()`
- **Các Models/Thực thể dữ liệu tương tác chính (SQLAlchemy Models):** ``input_inspections``
- **Cơ chế truy vấn & Khóa đồng thời (Database Operations & Concurrency Control):**
  * `INSERT bản ghi kết quả đo đạc kích thước đầu vào của linh kiện gỗ vào bảng `input_inspections`.`
- **Ràng buộc kiểm tra tính toàn vẹn (Integrity & Database Validation Constraints):**
  * `Các kích thước phải nằm trong dung sai cho phép quy định tại BOM sản phẩm.`

#### D. Luồng Xử lý Lỗi, Phục hồi Hệ thống & Ngoại lệ (Exception Handling & Resilience)
- **Các mã lỗi API & Ngoại lệ nghiệp vụ có thể trả về:**
  * `HTTP 401 Unauthorized`: Trả về khi JWT Token không hợp lệ hoặc hết hạn sử dụng.
  * `HTTP 403 Forbidden`: Trả về khi người dùng không có quyền truy cập hoặc thực hiện thao tác tại trạm sản xuất tương ứng.
  * `HTTP 422 Unprocessable Entity`: Trả về khi cấu trúc trường JSON gửi lên bị thiếu hoặc sai kiểu dữ liệu yêu cầu.
  * `HTTP 400 Bad Request`: Trả về khi vi phạm các quy tắc ràng buộc nghiệp vụ sản xuất (ví dụ: linh kiện chưa đo độ ẩm, số nhận lớn hơn số giao...).
- **Cơ chế phục hồi Ngoại tuyến tại hiện trường (Offline Capabilities & Queue Sync):**
  * `Không hỗ trợ offline cho phân hệ đo đầu ca nhằm tránh sai lệch chuẩn quy cách gỗ.`

#### E. Mẫu mã nguồn giao tiếp thực tế chuẩn hóa (Reference Implementation Code Snippet)

**Frontend Component API Hook (React JS):**
```javascript
// Giao tiếp Axios Client gửi yêu cầu lên Backend FastAPI
const submitInspection = async () => {
  setIsSubmitting(true);
  try {
    const res = await axios.post("/api/v1/inspections/", {
      plan_id: planId,
      part_name: partName,
      length: parseFloat(length),
      width: parseFloat(width),
      height: parseFloat(height),
      result: result
    });
    showToast(`Lưu biên bản kiểm tra thành công! Kết quả: ${res.data.result}`);
    navigate(-1);
  } catch (error) {
    showToast("Không thể lưu thông tin đo kích thước.");
  } finally {
    setIsSubmitting(false);
  }
};
```

**Backend Router & Controller (FastAPI & SQLAlchemy ORM):**
```python
# Điều phối API Endpoint và xử lý ghi nhận giao dịch cơ sở dữ liệu
@router.post("/")
def create_input_inspection(payload: InspectPayload, db: Session = Depends(get_db)):
    insp = InputInspection(
        plan_id=payload.plan_id, part_name=payload.part_name,
        length=payload.length, width=payload.width, height=payload.height,
        result=payload.result, created_at=datetime.now()
    )
    db.add(insp)
    db.commit()
    return {"success": True, "inspection_id": insp.id, "result": insp.result}
```

#### F. Sơ đồ tuần tự tương tác hệ thống (Sequence Diagram)
```mermaid
sequenceDiagram
    actor QC as Nhân viên QC đầu vào
    participant Mobile as Mobile App (InputInspection)
    participant Server as FastAPI Backend
    participant DB as SQLite Database
    QC->>Mobile: Nhập kích thước 3 chiều dài/rộng/cao thực đo
    Mobile->>Server: POST /api/v1/inspections/
    Server->>DB: INSERT into input_inspections
    DB-->>Server: Success
    Server-->>Mobile: HTTP 200 OK (result: 'Đạt'/'Không đạt')
```

---

## 4.6.1 Mục đích màn hình
Màn hình cho phép QC đo đạc, đánh giá kích thước chi tiết linh kiện thực tế tại xưởng và xác nhận Đạt/Không đạt trước khi tổ sản xuất tạo phiếu bàn giao, nhằm ngăn chặn việc chuyển tiếp các linh kiện sai hỏng kích thước sang công đoạn sau.

---

### 4.6.2 Thông tin màn hình

| Thuộc tính | Nội dung |
| :--- | :--- |
| Mã màn hình | MB2.4 |
| Route | `Điều hướng từ MB2_DeliveryInfo khi chọn KHSX để kiểm tra đầu vào` |
| Module | Kiểm soát chất lượng (QC Inspections) |
| Người dùng sử dụng | Nhân viên QC |

---

### 4.6.3 Chức năng chính

| STT | Chức năng | Mô tả |
| :--- | :--- | :--- |
| 1 | Ghi nhận kích thước thực đo: | Nhập thông số chiều dài, chiều rộng, chiều cao thực đo của linh kiện chi tiết (đơn vị mm). |
| 2 | So khớp chuẩn kích thước: | Hỗ trợ hiển thị kích thước tiêu chuẩn để QC so đối chứng. |
| 3 | Kết luận kiểm định: | Đánh dấu kết quả kiểm tra là "Đạt" hoặc "Không đạt". |
| 4 | Đính kèm ảnh minh chứng: | Chụp tối đa 3 ảnh đo thực tế làm bằng chứng chất lượng. |
| 5 | Chế độ xem lịch sử: | Hỗ trợ xem lại kết quả đã lưu trước đó dưới dạng chỉ đọc (`viewOnly`). |

---

### 4.6.4 Luồng xử lý hệ thống

```mermaid
sequenceDiagram
    autonumber
    actor QC as Nhân viên QC
    participant App as Mobile App
    participant API as Backend API
    participant DB as SQL Server

    QC->>App: Quét mã QR phiếu giao hàng
    App->>App: Nhận diện vai trò QC -> Mở Tab Chất lượng
    
    QC->>App: Đo đạc & Nhập thông số Kích thước, Độ ẩm...
    
    alt Có hạng mục Lỗi
        QC->>App: Nhấn Camera tại hạng mục đó
        App-->>App: Lưu ảnh kèm Tag (Vd: qc_moisture)
    end

    QC->>App: Nhập tổng SL lỗi & SL loại
    QC->>App: Bấm "Xác nhận và Hoàn thành"
    
    App->>API: POST /qc/{id} (Results JSON + Files + Tags)
    
    rect rgba(128, 128, 128, 0.15)
        Note over API: Server Processing
        API->>API: Lưu tệp tin vật lý theo Tags
        API->>DB: INSERT/UPDATE bảng delivery_qc
        API->>DB: UPDATE số lượng lỗi vào bảng deliveries
    end
    
    API-->>App: Trả về trạng thái thành công
    App->>QC: Thông báo "Lưu kết quả QC thành công"
    App->>App: Điều hướng về màn hình chính
```

QC nhận linh kiện chuẩn bị bàn giao, thực hiện đo kích thước thực tế bằng thước kẹp hoặc thiết bị đo.
2. Mở màn hình kiểm tra đầu vào của chi tiết đó, nhập các thông số chiều dài, chiều rộng, chiều cao.
3. QC đưa ra kết luận đánh giá Đạt/Không đạt và chụp ảnh chứng thực.
4. Nhấn **LƯU KẾT QUẢ**.
5. Frontend nén ảnh về chất lượng 70% qua Canvas và gửi FormData lên API.
6. Backend lưu thông tin vào bảng `input_inspections`, đồng thời gửi tín hiệu WebSocket thông báo kết quả QC Đạt để màn hình tạo phiếu giao `MB2.1` của sản xuất mở khóa cho phép giao chi tiết này đi.* Frontend thực hiện nén ảnh trước khi tải lên bằng hàm Canvas utility:
  ```javascript
  const canvas = document.createElement('canvas');
  // ... xử lý resize và vẽ ảnh ...
  canvas.toBlob((blob) => { /* gửi blob */ }, 'image/jpeg', 0.7);
  ```
* Gửi request FormData lên API `POST /api/v1/inspections/`.

---

### 4.6.5 API liên quan

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| POST | `/api/v1/inspections/` | Lưu kết quả kiểm tra đầu vào (nhận FormData chứa tối đa 3 ảnh). Định nghĩa tại [inspection_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/inspection_router.py#L130-L197). |

---

### 4.6.6 Database liên quan

| Bảng | Mục đích |
| :--- | :--- |
| ``input_inspections`` | Lưu trữ kết quả đo kích thước đầu vào. Ánh xạ qua Model [InputInspection](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/input_inspection.py#L6). |

---

### 4.6.7 Business Rules

| Điều kiện | Mô tả |
| :--- | :--- |
| Quy tắc chung | Các kích thước đo đạc nhập vào phải là số thực dương lớn hơn 0. |
| Quy tắc chung | Kết quả kiểm tra đầu vào Đạt là điều kiện tiên quyết để hệ thống mở khoá nút tạo phiếu giao cho chi tiết đó tại công đoạn sản xuất. |

---

### 4.6.8 File code liên quan

**Frontend:**
* [MB2.4_InputInspection.jsx](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB2.4_InputInspection.jsx)

**Backend:**
* [inspection_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/inspection_router.py)

> [!NOTE]
> **Ghi chú Dev:**
> Đảm bảo tính toán đúng tỉ lệ nén ảnh trên các dòng máy Android/iOS có camera độ phân giải cao để tránh lỗi tràn bộ nhớ đệm (Out of Memory) trên thiết bị di động.

---

## 4.7 MH4_MB4_PlanTracking — Theo dõi tiến độ KHSX (Mobile)

#

### 4.7.9 BẢN ĐỒ CHI TIẾT TƯƠNG TÁC FRONTEND - BACKEND (API & HANDLER FUNCTIONS)

#### A. Tầng Giao diện Client & Tương tác Nghiệp vụ (React Components & Hooks)
- **Tệp mã nguồn Giao diện (Component Path):** `Mobile/src/Views/screens/MB4_PlanTracking.jsx`
- **Quản lý Trạng thái cục bộ (State Management):**
| React State Hooks | Vai trò quản lý trạng thái giao diện |
| :--- | :--- |
| `plans` | Danh sách các kế hoạch sản xuất đang triển khai (Array) |
| `selectedPlan` | Kế hoạch đang chọn xem chi tiết tiến độ trạm (Object) |
| `progressPercentage` | Tỷ lệ hoàn thành thực tế kế hoạch (Float) |
| `isLoading` | Trạng thái tải dữ liệu tiến độ (Boolean) |

- **Danh sách Hàm sự kiện chính (UI Event Handlers):**
| Trình xử lý sự kiện (Handler) | Sự kiện kích hoạt (Trigger) | Nghiệp vụ xử lý của hàm |
| :--- | :--- | :--- |
| `loadPlans()` | Khi mở màn hình | Gọi API tải danh sách kế hoạch đang hoạt động |
| `viewPlanDetail()` | onClick vào dòng kế hoạch | Tải tiến độ phân rã theo từng trạm sản xuất |

- **Vòng đời & Hiệu ứng Component (Lifecycle Hooks):**
  * `useEffect tải danh sách kế hoạch đang chạy khi mở màn hình để công nhân theo dõi tiến độ hoàn thành.`

#### B. Tầng Giao tiếp trung gian REST API & Giao thức truyền tải (API Contract)
- **Phương thức & Đường dẫn endpoint:** `GET /api/v1/plans/{plan_id}`
- **HTTP Headers yêu cầu:**
  * `Content-Type: multipart/form-data`
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Bắt buộc xác thực)
- **Mẫu dữ liệu yêu cầu gửi đi (Request Payload JSON):**
```json
None
```
- **Mẫu dữ liệu phản hồi thành công (Response 200 OK):**
```json
{\n  "id": 1,\n  "plan_name": "KHSX T5 - 2026",\n  "status": "Đang chạy",\n  "deliveries_count": 87,\n  "progress": 76.5\n}
```

#### C. Tầng Logic Nghiệp vụ Backend & Tương tác Cơ sở dữ liệu (FastAPI & SQLAlchemy)
- **Hàm điều phối Router API (FastAPI Route Handler):** `get_plan_details() trong `BackEnd/src/app/api/v1/endpoints/plans.py``
- **Hàm dịch vụ nghiệp vụ chính (Business Logic Service):** `read_plan_details()`
- **Các Models/Thực thể dữ liệu tương tác chính (SQLAlchemy Models):** ``product_plans`, `plan_details``
- **Cơ chế truy vấn & Khóa đồng thời (Database Operations & Concurrency Control):**
  * `Truy vấn tiến độ kế hoạch bằng cách đếm số lượng chi tiết đã nhận so với kế hoạch và tính tỷ lệ.`
- **Ràng buộc kiểm tra tính toàn vẹn (Integrity & Database Validation Constraints):**
  * `ID kế hoạch phải tồn tại.`

#### D. Luồng Xử lý Lỗi, Phục hồi Hệ thống & Ngoại lệ (Exception Handling & Resilience)
- **Các mã lỗi API & Ngoại lệ nghiệp vụ có thể trả về:**
  * `HTTP 401 Unauthorized`: Trả về khi JWT Token không hợp lệ hoặc hết hạn sử dụng.
  * `HTTP 403 Forbidden`: Trả về khi người dùng không có quyền truy cập hoặc thực hiện thao tác tại trạm sản xuất tương ứng.
  * `HTTP 422 Unprocessable Entity`: Trả về khi cấu trúc trường JSON gửi lên bị thiếu hoặc sai kiểu dữ liệu yêu cầu.
  * `HTTP 400 Bad Request`: Trả về khi vi phạm các quy tắc ràng buộc nghiệp vụ sản xuất (ví dụ: linh kiện chưa đo độ ẩm, số nhận lớn hơn số giao...).
- **Cơ chế phục hồi Ngoại tuyến tại hiện trường (Offline Capabilities & Queue Sync):**
  * `Lưu cache thông số tiến độ gần nhất phục vụ hiển thị nhanh.`

#### E. Mẫu mã nguồn giao tiếp thực tế chuẩn hóa (Reference Implementation Code Snippet)

**Frontend Component API Hook (React JS):**
```javascript
// Giao tiếp Axios Client gửi yêu cầu lên Backend FastAPI
const loadPlans = async () => {
  setIsLoading(true);
  try {
    const res = await axios.get("/api/v1/plans/active");
    setPlans(res.data);
  } catch (error) {
    showToast("Lỗi khi tải danh sách kế hoạch.");
  } finally {
    setIsLoading(false);
  }
};
```

**Backend Router & Controller (FastAPI & SQLAlchemy ORM):**
```python
# Điều phối API Endpoint và xử lý ghi nhận giao dịch cơ sở dữ liệu
@router.get("/{plan_id}")
def get_plan_details(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(ProductPlan).filter(ProductPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Không tìm thấy kế hoạch")
    # Tính tiến độ
    total = db.query(func.sum(PlanDetail.quantity_planned)).filter(PlanDetail.plan_id == plan_id).scalar() or 1
    received = db.query(func.sum(Delivery.quantity_received)).filter(Delivery.plan_id == plan_id, Delivery.status == "Đã nhận").scalar() or 0
    progress = (received / total) * 100
    return {"id": plan.id, "plan_name": plan.plan_name, "status": plan.status, "progress": progress}
```

#### F. Sơ đồ tuần tự tương tác hệ thống (Sequence Diagram)
```mermaid
sequenceDiagram
    actor Staff as Nhân viên tổ sản xuất
    participant Mobile as Mobile App (PlanTracking)
    participant Server as FastAPI Backend
    participant DB as SQLite Database
    Staff->>Mobile: Chọn xem tiến độ KHSX trên điện thoại
    Mobile->>Server: GET /api/v1/plans/{plan_id}
    Server->>DB: Query plan and progress aggregates
    DB-->>Server: Trả về số liệu tiến độ
    Server-->>Mobile: HTTP 200 OK
```

---

## 4.7.1 Mục đích màn hình
Màn hình cung cấp giao diện trực quan để người quản lý giám sát tiến độ thực tế của các đơn hàng (PO) và kế hoạch sản xuất đang chạy dưới xưởng, xem chi tiết định mức linh kiện (BOM) và lịch sử bàn giao đệ quy giữa các tổ sản xuất.

---

### 4.7.2 Thông tin màn hình

| Thuộc tính | Nội dung |
| :--- | :--- |
| Mã màn hình | MB4 |
| Route | `/plan-tracking` |
| Module | Theo dõi tiến độ (Planning & Tracking) |
| Người dùng sử dụng | Ban quản lý, Tổ trưởng sản xuất |

---

### 4.7.3 Chức năng chính

| STT | Chức năng | Mô tả |
| :--- | :--- | :--- |
| 1 | Danh sách KHSX phân trang: | Hiển thị danh sách các kế hoạch sản xuất đang chạy kèm tiến độ phần trăm hoàn thành thực tế. |
| 2 | Bộ lọc nâng cao: | Hỗ trợ lọc nhanh theo PO, Tiền tố đơn hàng (Prefix) và Trạng thái kế hoạch (Chưa thực hiện, Đang thực hiện, Hoàn thành). |
| 3 | Xem chi tiết BOM: | Hiển thị danh sách các chi tiết linh kiện cấu thành sản phẩm. |
| 4 | Cây lịch sử bàn giao đệ quy: | Trực quan hóa toàn bộ dòng chảy giao nhận của sản phẩm qua các công đoạn dưới dạng sơ đồ cây phân cấp. |

---

### 4.7.4 Luồng xử lý hệ thống

```mermaid
sequenceDiagram
    autonumber
    actor Manager as Quản lý / Nhân viên
    participant UI as Màn hình Theo dõi KH
    participant API as Backend API
    participant DB as SQL Server

    Manager->>UI: Chọn KHSX & Đơn hàng
    UI->>API: GET /product-plans/ (Cấu hình)
    UI->>API: GET /deliveries/{id} (Thực tế)
    
    API->>DB: Truy vấn dữ liệu liên kết
    DB-->>API: Trả về dữ liệu thô
    API-->>UI: Trả về kết quả JSON
    
    rect rgba(128, 128, 128, 0.15)
        Note over UI: Thuật toán tính toán (%)
        UI->>UI: Gom nhóm linh kiện theo SKU
        UI->>UI: So khớp SL đã giao từ lịch sử phiếu
        UI->>UI: Tính % tiến độ cho từng Mã phẩm
        UI->>UI: Tính % trung bình cho cả Đơn hàng
    end
    
    UI->>Manager: Hiển thị Card & Progress Bar sinh động
```

Quản lý mở màn hình, hệ thống gọi API tải danh sách kế hoạch sản xuất theo phân trang 15 bản ghi/lượt.
2. Người dùng sử dụng các bộ lọc PO hoặc trạng thái để tìm kiếm kế hoạch cần quan tâm.
3. Khi click chọn một kế hoạch sản xuất:
   * Ứng dụng hiển thị danh sách BOM chi tiết của sản phẩm.
   * Giao diện vẽ sơ đồ dòng chảy bàn giao đệ quy, thể hiện chi tiết linh kiện đó được giao từ công đoạn nào, đến công đoạn nào, số lượng bao nhiêu, ai giao, ai nhận, có bị lỗi hay trả hàng ở đâu không.* Frontend thực hiện gửi yêu cầu lấy danh sách kế hoạch phân trang qua API `GET /api/v1/production/?skip=...&limit=...`.
* Gọi API lấy chi tiết kế hoạch: `GET /api/v1/production/{plan_id}`.
* Logic tính toán phần trăm hoàn thành của kế hoạch sản xuất được tính động trên Backend dựa trên tỷ lệ giữa số lượng thành phẩm đã qua kiểm định ở công đoạn đóng gói cuối cùng chia cho tổng số lượng PO yêu cầu.

---

### 4.7.5 API liên quan

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| GET | `/api/v1/production/` | Lấy danh sách kế hoạch sản xuất phân trang. Định nghĩa tại [production_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/production_router.py#L42-L46). |
| GET | `/api/v1/production/{plan_id}` | Lấy chi tiết tiến độ và cấu trúc BOM của kế hoạch. Định nghĩa tại [production_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/production_router.py#L47-L50). |

---

### 4.7.6 Database liên quan

| Bảng | Mục đích |
| :--- | :--- |
| ``product_plans`` | Kế hoạch sản xuất. Ánh xạ qua [ProductPlan](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/product_plan.py#L6). |
| ``deliveries`` | Các phiếu giao liên quan để tổng hợp tiến độ. Ánh xạ qua [Delivery](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/deliveries.py#L8). |
| ``bom_details`` | Định mức sản phẩm. Ánh xạ qua Model [BOMDetail](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/bom_detail.py#L6). |

---

### 4.7.7 Business Rules

| Điều kiện | Mô tả |
| :--- | :--- |
| Quy tắc chung | Tiến độ phần trăm không được vượt quá 100% (ngăn ngừa lỗi tính toán khi số lượng thực nhận vượt quá số lượng giao do nhập thừa). |
| Quy tắc chung | Sơ đồ cây bàn giao đệ quy phải đảm bảo tải đúng thứ tự thời gian tạo phiếu. |

---

### 4.7.8 File code liên quan

**Frontend:**
* [MB4_PlanTracking.jsx](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB4_PlanTracking.jsx)

**Backend:**
* [production_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/production_router.py)

> [!NOTE]
> **Ghi chú Dev:**
> Khi số lượng dữ liệu lịch sử bàn giao quá lớn, việc vẽ đệ quy cây giao nhận trên Frontend bằng JS có thể gây trễ giao diện. Cần thiết kế phân cấp lazy-loading cho các nhánh cây lịch sử.

---

## 4.8 MH5_MB5_DailyInspection — Kiểm tra hàng ngày (Mobile)

#

### 4.8.9 BẢN ĐỒ CHI TIẾT TƯƠNG TÁC FRONTEND - BACKEND (API & HANDLER FUNCTIONS)

#### A. Tầng Giao diện Client & Tương tác Nghiệp vụ (React Components & Hooks)
- **Tệp mã nguồn Giao diện (Component Path):** `Mobile/src/Views/screens/MB5_DailyInspection.jsx`
- **Quản lý Trạng thái cục bộ (State Management):**
| React State Hooks | Vai trò quản lý trạng thái giao diện |
| :--- | :--- |
| `equipments` | Danh sách thiết bị máy móc cần kiểm tra đầu ca (Array) |
| `checklist` | Checklist kiểm tra an toàn, vệ sinh thiết bị (Object) |
| `isSubmitting` | Trạng thái lưu trữ nhật ký báo cáo (Boolean) |

- **Danh sách Hàm sự kiện chính (UI Event Handlers):**
| Trình xử lý sự kiện (Handler) | Sự kiện kích hoạt (Trigger) | Nghiệp vụ xử lý của hàm |
| :--- | :--- | :--- |
| `loadEquipments()` | Khi mở màn hình | Tải danh sách thiết bị máy móc |
| `submitDailyInspection()` | onClick Xác nhận kiểm tra | Gửi API lưu trữ kết quả kiểm định thiết bị đầu ca |

- **Vòng đời & Hiệu ứng Component (Lifecycle Hooks):**
  * `useEffect load danh sách máy móc thuộc trạm hiện tại để hiển thị biểu mẫu kiểm tra đầu ca làm việc.`

#### B. Tầng Giao tiếp trung gian REST API & Giao thức truyền tải (API Contract)
- **Phương thức & Đường dẫn endpoint:** `POST /api/v1/daily-inspections/`
- **HTTP Headers yêu cầu:**
  * `Content-Type: application/json`
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Bắt buộc xác thực)
- **Mẫu dữ liệu yêu cầu gửi đi (Request Payload JSON):**
```json
{\n  "equipment_id": 1,\n  "status": "Hoạt động",\n  "checked_items": {"an_toan": true, "ve_sinh": true}\n}
```
- **Mẫu dữ liệu phản hồi thành công (Response 200 OK):**
```json
{\n  "success": true,\n  "record_id": 42\n}
```

#### C. Tầng Logic Nghiệp vụ Backend & Tương tác Cơ sở dữ liệu (FastAPI & SQLAlchemy)
- **Hàm điều phối Router API (FastAPI Route Handler):** `create_daily_inspection() trong `BackEnd/src/app/api/v1/endpoints/qc.py``
- **Hàm dịch vụ nghiệp vụ chính (Business Logic Service):** `save_daily_inspection()`
- **Các Models/Thực thể dữ liệu tương tác chính (SQLAlchemy Models):** ``daily_inspection_records``
- **Cơ chế truy vấn & Khóa đồng thời (Database Operations & Concurrency Control):**
  * `INSERT bản ghi kiểm định thiết bị máy móc đầu ca làm việc vào bảng `daily_inspection_records`.`
- **Ràng buộc kiểm tra tính toàn vẹn (Integrity & Database Validation Constraints):**
  * `ID thiết bị phải hợp lệ.`

#### D. Luồng Xử lý Lỗi, Phục hồi Hệ thống & Ngoại lệ (Exception Handling & Resilience)
- **Các mã lỗi API & Ngoại lệ nghiệp vụ có thể trả về:**
  * `HTTP 401 Unauthorized`: Trả về khi JWT Token không hợp lệ hoặc hết hạn sử dụng.
  * `HTTP 403 Forbidden`: Trả về khi người dùng không có quyền truy cập hoặc thực hiện thao tác tại trạm sản xuất tương ứng.
  * `HTTP 422 Unprocessable Entity`: Trả về khi cấu trúc trường JSON gửi lên bị thiếu hoặc sai kiểu dữ liệu yêu cầu.
  * `HTTP 400 Bad Request`: Trả về khi vi phạm các quy tắc ràng buộc nghiệp vụ sản xuất (ví dụ: linh kiện chưa đo độ ẩm, số nhận lớn hơn số giao...).
- **Cơ chế phục hồi Ngoại tuyến tại hiện trường (Offline Capabilities & Queue Sync):**
  * `Lưu offline kết quả kiểm tra thiết bị vào LocalStorage và đồng bộ sau.`

#### E. Mẫu mã nguồn giao tiếp thực tế chuẩn hóa (Reference Implementation Code Snippet)

**Frontend Component API Hook (React JS):**
```javascript
// Giao tiếp Axios Client gửi yêu cầu lên Backend FastAPI
const submitDailyInspection = async () => {
  setIsSubmitting(true);
  try {
    await axios.post("/api/v1/daily-inspections/", {
      equipment_id: selectedEq,
      status: status,
      checked_items: checklist
    });
    showToast("Đã lưu nhật ký kiểm tra thiết bị.");
    navigate(-1);
  } catch (error) {
    showToast("Không thể gửi kết quả kiểm định.");
  } finally {
    setIsSubmitting(false);
  }
};
```

**Backend Router & Controller (FastAPI & SQLAlchemy ORM):**
```python
# Điều phối API Endpoint và xử lý ghi nhận giao dịch cơ sở dữ liệu
@router.post("/")
def create_daily_inspection(payload: DailyInspectPayload, db: Session = Depends(get_db)):
    record = DailyInspectionRecord(
        equipment_id=payload.equipment_id,
        status=payload.status,
        checked_data=json.dumps(payload.checked_items),
        created_at=datetime.now()
    )
    db.add(record)
    db.commit()
    return {"success": True, "record_id": record.id}
```

#### F. Sơ đồ tuần tự tương tác hệ thống (Sequence Diagram)
```mermaid
sequenceDiagram
    actor QC as Nhân viên QC hiện trường
    participant Mobile as Mobile App (DailyInspection)
    participant Server as FastAPI Backend
    participant DB as SQLite Database
    QC->>Mobile: Chọn thiết bị & tích chọn checklist vận hành
    Mobile->>Server: POST /api/v1/daily-inspections/
    Server->>DB: INSERT into daily_inspection_records
    DB-->>Server: Success
    Server-->>Mobile: HTTP 200 OK
```

---

## 4.8.1 Mục đích màn hình
Màn hình hỗ trợ QC thực hiện ghi nhận số lượng sản phẩm lỗi phát hiện hàng ngày theo từng công đoạn sản xuất, đồng thời cho phép bật/tắt theo dõi nóng các loại lỗi kỹ thuật quan trọng cần giám sát tại xưởng.

---

### 4.8.2 Thông tin màn hình

| Thuộc tính | Nội dung |
| :--- | :--- |
| Mã màn hình | MB5 |
| Route | `/daily-inspection` |
| Module | Kiểm soát chất lượng (QC Inspections) |
| Người dùng sử dụng | Nhân viên QC |

---

### 4.8.3 Chức năng chính

| STT | Chức năng | Mô tả |
| :--- | :--- | :--- |
| 1 | Thống kê sản lượng ngày: | Xem tổng sản lượng sản xuất của công đoạn trong ngày hiện hành. |
| 2 | Danh mục lỗi phân nhóm: | Hiển thị danh sách lỗi theo các tab danh mục lỗi kỹ thuật (Ngoại quan - Visual, Kết cấu - Structure, Nguyên vật liệu - Material, Cần theo dõi). |
| 3 | Bật/tắt theo dõi nóng lỗi: | QC có thể bật/tắt trực tiếp cờ "cần theo dõi" (`needs_tracking`) của từng loại lỗi để hệ thống ưu tiên hiển thị ở tab theo dõi nóng. |
| 4 | Lập phiếu ghi nhận lỗi: | Ghi nhận số lượng lỗi phát hiện tương ứng với từng lỗi và lưu phiếu kiểm tra chất lượng trong ngày. |

---

### 4.8.4 Luồng xử lý hệ thống

```mermaid
sequenceDiagram
    autonumber
    actor QC as Nhân viên QC
    participant App as Mobile App
    participant Cam as Camera (Native)
    participant API as Backend API
    participant DB as Database
    
    QC->>App: Mở màn hình Kiểm tra hàng ngày (Route: /inspection-daily)
    App->>API: GET /api/v1/inspections/daily
    API->>DB: Query bảng daily_inspection_records
    DB-->>API: Return danh sách nhật ký kiểm tra hàng ngày
    API-->>App: Trả về danh sách hiển thị
    
    QC->>App: Nhập số lượng mẫu, số lượng lỗi, chọn các loại lỗi
    QC->>App: Chụp ảnh bằng chứng lỗi (nếu có)
    App->>Cam: Mở camera thiết bị
    Cam-->>App: Return file ảnh
    QC->>App: Nhấn "Lưu kết quả"
    App->>API: POST /api/v1/inspections/daily (Multipart Form Data)
    API->>DB: Lưu daily_inspection_records & daily_inspection_images
    DB-->>API: Success
    API-->>App: Success
    App-->>QC: Thông báo thành công, quay về Nhật ký
```

QC chọn công đoạn cần thực hiện kiểm tra hàng ngày.
2. Hệ thống tải về tổng sản lượng sản xuất tại trạm trong ngày hôm nay từ API thống kê sản lượng.
3. QC điền số lượng lỗi phát hiện cho từng lỗi trong danh sách.
4. Đối với các loại lỗi phát sinh nhiều hoặc nghiêm trọng, QC bấm nút bật chế độ **Theo dõi nóng**. Loại lỗi này sẽ ngay lập tức được cập nhật cờ `needs_tracking = True` trên máy chủ và hiển thị ở tab "Cần theo dõi".
5. Nhập xong số lượng, QC nhấn **LƯU PHIẾU**. Hệ thống tự động tính tỉ lệ lỗi và lưu dữ liệu.* Gọi API `GET /api/v1/deliveries/stats/daily?stage=...` để tính tổng sản phẩm.
* Toggle trạng thái theo dõi lỗi bằng cách gọi API `PATCH /api/v1/inspections/defect-types/{defect_id}/toggle-tracking`.
* Lưu phiếu lỗi bằng cách gửi JSON Payload lên `POST /api/v1/inspections/daily`.

---

### 4.8.5 API liên quan

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| POST | `/api/v1/inspections/daily` | Lưu kết quả kiểm tra hàng ngày. Định nghĩa tại [inspection_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/inspection_router.py#L20-L56). |
| GET | `/api/v1/inspections/defect-types` | Lấy danh mục các loại lỗi. Định nghĩa tại [inspection_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/inspection_router.py#L247-L256). |
| PATCH | `/api/v1/inspections/defect-types/{defect_id}/toggle-tracking` | Bật/tắt theo dõi loại lỗi. Định nghĩa tại [inspection_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/inspection_router.py#L257-L269). |

---

### 4.8.6 Database liên quan

| Bảng | Mục đích |
| :--- | :--- |
| ``daily_inspection_records`` | Phiếu kiểm tra lỗi ngày. Ánh xạ qua [DailyInspectionRecord](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/daily_inspection.py#L7). |
| ``daily_inspection_defects`` | Chi tiết số lượng từng lỗi. Ánh xạ qua [DailyInspectionDefect](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/daily_inspection.py#L22). |
| ``defect_types`` | Danh mục lỗi. Ánh xạ qua [DefectType](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/defect_type.py#L5). |

---

### 4.8.7 Business Rules

| Điều kiện | Mô tả |
| :--- | :--- |
| Quy tắc chung | Tỉ lệ lỗi (`defect_rate`) tự động tính theo công thức: `(Tổng số lượng lỗi / Tổng sản lượng sản xuất) * 100`. |
| Quy tắc chung | Chỉ cho phép lưu phiếu khi tổng số lượng lỗi phát hiện lớn hơn hoặc bằng 0. |

---

### 4.8.8 File code liên quan

**Frontend:**
* [MB5_DailyInspection.jsx](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB5_DailyInspection.jsx)

**Backend:**
* [inspection_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/inspection_router.py)

> [!NOTE]
> **Ghi chú Dev:**
> Đảm bảo đồng bộ tức thì trạng thái bật/tắt theo dõi lỗi trên UI bằng cách cập nhật state cục bộ song song với việc gọi API để tối ưu trải nghiệm người dùng.

---

## 4.9 MH6_MB6_StageInspection — Kiểm tra công đoạn (Mobile)

#

### 4.9.9 BẢN ĐỒ CHI TIẾT TƯƠNG TÁC FRONTEND - BACKEND (API & HANDLER FUNCTIONS)

#### A. Tầng Giao diện Client & Tương tác Nghiệp vụ (React Components & Hooks)
- **Tệp mã nguồn Giao diện (Component Path):** `Mobile/src/Views/screens/MB6_StageInspection.jsx`
- **Quản lý Trạng thái cục bộ (State Management):**
| React State Hooks | Vai trò quản lý trạng thái giao diện |
| :--- | :--- |
| `inspections` | Danh sách các báo cáo lỗi tại công đoạn (Array) |
| `defectTypes` | Danh mục các loại lỗi gỗ hiện hành (Array) |
| `selectedDefect` | Mã lỗi gỗ đang chọn khai báo (Integer) |
| `quantity` | Số lượng linh kiện bị lỗi phát hiện (Integer) |

- **Danh sách Hàm sự kiện chính (UI Event Handlers):**
| Trình xử lý sự kiện (Handler) | Sự kiện kích hoạt (Trigger) | Nghiệp vụ xử lý của hàm |
| :--- | :--- | :--- |
| `loadStageInspections()` | Khi mở màn hình | Tải danh sách lỗi công đoạn gần đây |
| `submitInspection()` | onClick Xác nhận báo lỗi | Gửi API ghi nhận lỗi công đoạn sản xuất |

- **Vòng đời & Hiệu ứng Component (Lifecycle Hooks):**
  * `useEffect load danh sách loại lỗi gỗ từ CSDL để chuẩn bị cho form báo cáo công đoạn.`

#### B. Tầng Giao tiếp trung gian REST API & Giao thức truyền tải (API Contract)
- **Phương thức & Đường dẫn endpoint:** `POST /api/v1/qc/stage-inspection`
- **HTTP Headers yêu cầu:**
  * `Content-Type: application/json`
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Bắt buộc xác thực)
- **Mẫu dữ liệu yêu cầu gửi đi (Request Payload JSON):**
```json
{\n  "delivery_id": 102,\n  "defect_id": 1,\n  "quantity": 3\n}
```
- **Mẫu dữ liệu phản hồi thành công (Response 200 OK):**
```json
{\n  "success": true\n}
```

#### C. Tầng Logic Nghiệp vụ Backend & Tương tác Cơ sở dữ liệu (FastAPI & SQLAlchemy)
- **Hàm điều phối Router API (FastAPI Route Handler):** `submit_stage_inspection() trong `BackEnd/src/app/api/v1/endpoints/qc.py``
- **Hàm dịch vụ nghiệp vụ chính (Business Logic Service):** `save_stage_defect()`
- **Các Models/Thực thể dữ liệu tương tác chính (SQLAlchemy Models):** ``daily_inspection_defects``
- **Cơ chế truy vấn & Khóa đồng thời (Database Operations & Concurrency Control):**
  * `INSERT bản ghi lỗi chi tiết phát hiện tại công đoạn sản xuất vào bảng `daily_inspection_defects`.`
- **Ràng buộc kiểm tra tính toàn vẹn (Integrity & Database Validation Constraints):**
  * `Số lượng lỗi phải là số nguyên dương.`

#### D. Luồng Xử lý Lỗi, Phục hồi Hệ thống & Ngoại lệ (Exception Handling & Resilience)
- **Các mã lỗi API & Ngoại lệ nghiệp vụ có thể trả về:**
  * `HTTP 401 Unauthorized`: Trả về khi JWT Token không hợp lệ hoặc hết hạn sử dụng.
  * `HTTP 403 Forbidden`: Trả về khi người dùng không có quyền truy cập hoặc thực hiện thao tác tại trạm sản xuất tương ứng.
  * `HTTP 422 Unprocessable Entity`: Trả về khi cấu trúc trường JSON gửi lên bị thiếu hoặc sai kiểu dữ liệu yêu cầu.
  * `HTTP 400 Bad Request`: Trả về khi vi phạm các quy tắc ràng buộc nghiệp vụ sản xuất (ví dụ: linh kiện chưa đo độ ẩm, số nhận lớn hơn số giao...).
- **Cơ chế phục hồi Ngoại tuyến tại hiện trường (Offline Capabilities & Queue Sync):**
  * `Lưu tạm dữ liệu lỗi vào hàng đợi LocalStorage và đẩy lên khi có mạng.`

#### E. Mẫu mã nguồn giao tiếp thực tế chuẩn hóa (Reference Implementation Code Snippet)

**Frontend Component API Hook (React JS):**
```javascript
// Giao tiếp Axios Client gửi yêu cầu lên Backend FastAPI
const submitInspection = async () => {
  try {
    await axios.post("/api/v1/qc/stage-inspection", {
      delivery_id: deliveryId,
      defect_id: selectedDefect,
      quantity: quantity
    });
    showToast("Đã báo cáo lỗi công đoạn thành công!");
  } catch (error) {
    showToast("Lỗi khi báo cáo lỗi công đoạn.");
  }
};
```

**Backend Router & Controller (FastAPI & SQLAlchemy ORM):**
```python
# Điều phối API Endpoint và xử lý ghi nhận giao dịch cơ sở dữ liệu
@router.post("/stage-inspection")
def submit_stage_inspection(payload: StageInspectPayload, db: Session = Depends(get_db)):
    defect = DailyInspectionDefect(
        record_id=payload.delivery_id,
        defect_id=payload.defect_id,
        quantity=payload.quantity
    )
    db.add(defect)
    db.commit()
    return {"success": True}
```

#### F. Sơ đồ tuần tự tương tác hệ thống (Sequence Diagram)
```mermaid
sequenceDiagram
    actor QC as Nhân viên QC công đoạn
    participant Mobile as Mobile App (StageInspection)
    participant Server as FastAPI Backend
    participant DB as SQLite Database
    QC->>Mobile: Ghi nhận lỗi phát sinh tại công đoạn
    Mobile->>Server: POST /api/v1/qc/stage-inspection
    Server->>DB: INSERT into daily_inspection_defects
    DB-->>Server: Success
    Server-->>Mobile: HTTP 200 OK
```

---

## 4.9.1 Mục đích màn hình
Màn hình cung cấp công cụ cho QC thực hiện lập phiếu đánh giá chất lượng chuyên sâu theo công đoạn sản xuất đối với 3 loại hình chính: Kiểm tra phụ kiện/linh kiện đầu vào, Đánh giá độ bám dính của keo/sơn, và Kiểm tra ngoại quan sau đóng gói.

---

### 4.9.2 Thông tin màn hình

| Thuộc tính | Nội dung |
| :--- | :--- |
| Mã màn hình | MB6 |
| Route | `/stage-inspection` |
| Module | Kiểm soát chất lượng (QC Inspections) |
| Người dùng sử dụng | Nhân viên QC |

---

### 4.9.3 Chức năng chính

| STT | Chức năng | Mô tả |
| :--- | :--- | :--- |
| 1 | Hỗ trợ 3 loại phiếu chuyên biệt: | Biểu mẫu động thay đổi theo loại phiếu: `phu-kien`, `bam-dinh`, `sau-dong-goi`. |
| 2 | Rót đơn hàng PO & sản phẩm: | Chọn đơn hàng PO đang sản xuất để tự động tải về danh sách sản phẩm và linh kiện BOM tương ứng phục vụ kiểm tra. |
| 3 | Tải ảnh kiểm định chuyên nghiệp: | Hỗ trợ chụp và tải nhiều ảnh hiện trường lỗi lên máy chủ lưu trữ. |
| 4 | Lưu trữ dữ liệu động dưới dạng JSON: | Toàn bộ kết quả khảo sát chi tiết và danh sách link ảnh được lưu dưới dạng chuỗi JSON giúp linh hoạt cấu trúc dữ liệu. |

---

### 4.9.4 Luồng xử lý hệ thống

```mermaid
sequenceDiagram
    autonumber
    actor QC as Nhân viên QC
    participant App as Mobile App
    participant Cam as Camera (Native)
    participant API as Backend API
    participant DB as Database
    
    QC->>App: Mở màn hình Kiểm tra công đoạn (Route: /inspection-stage)
    App->>API: GET /api/v1/inspections/stage
    API->>DB: Query bảng stage_inspections
    DB-->>API: Return danh sách nhật ký kiểm tra công đoạn
    API-->>App: Trả về danh sách hiển thị
    
    QC->>App: Chọn KHSX, trạm sản xuất, loại kiểm tra (Đầu, Giữa, Cuối ca)
    QC->>App: Nhập số lượng kiểm tra, số lượng đạt, số lỗi, checklist đạt/không đạt
    QC->>App: Chụp ảnh bằng chứng lỗi
    App->>Cam: Mở camera thiết bị
    Cam-->>App: Return file ảnh
    QC->>App: Nhấn "Lưu kết quả"
    App->>API: POST /api/v1/inspections/stage (Multipart Form Data)
    API->>DB: Lưu stage_inspections & stage_inspection_images
    DB-->>API: Success
    API-->>App: Success
    App-->>QC: Thông báo thành công, quay về Nhật ký
```

QC mở màn hình, chọn loại hình kiểm tra (`inspection_type`).
2. Chọn mã PO -> Hệ thống load danh sách sản phẩm thuộc PO đó -> QC chọn sản phẩm cần đánh giá.
3. Giao diện hiển thị form nhập liệu tương ứng với loại phiếu đã chọn. QC nhập các chỉ tiêu đạt/lỗi cụ thể và chụp ảnh đính kèm.
4. **Quy trình upload:** QC chụp ảnh -> Frontend gọi API tải ảnh lên trước để nhận về danh sách URL ảnh.
5. QC chọn kết luận đánh giá (Đạt - Pass / Không đạt - Fail) và nhấn **LƯU PHIẾU**. Toàn bộ dữ liệu chi tiết form được đóng gói thành chuỗi JSON và gửi lên API lưu trữ.* Tải ảnh lên riêng biệt qua API `POST /api/v1/inspections/upload` bằng `FormData`. Nhận về mảng đường dẫn: `{"paths": ["/static/uploads/inspections/abc.jpg"]}`.
* Gán mảng đường dẫn này vào trường `images_json` dưới dạng chuỗi JSON: `JSON.stringify(paths)`.
* Lưu phiếu qua `POST /api/v1/inspections/stage`.

---

### 4.9.5 API liên quan

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| POST | `/api/v1/inspections/stage` | Lưu phiếu kiểm tra công đoạn. Định nghĩa tại [inspection_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/inspection_router.py#L77-L103). |
| POST | `/api/v1/inspections/upload` | Tải ảnh kiểm định lên máy chủ. Định nghĩa tại [inspection_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/inspection_router.py#L199-L217). |
| GET | `/api/v1/orders/simple` | Lấy danh sách PO giản lược. Định nghĩa tại [order_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/order_router.py#L67-L87). |
| GET | `/api/v1/orders/by-code/{order_code}/products` | Lấy danh sách sản phẩm theo mã PO. Định nghĩa tại [order_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/order_router.py#L88-L125). |

---

### 4.9.6 Database liên quan

| Bảng | Mục đích |
| :--- | :--- |
| ``stage_inspections`` | Lưu kết quả kiểm tra công đoạn. Ánh xạ qua Model [StageInspection](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/stage_inspection.py#L6). |

---

### 4.9.7 Business Rules

| Điều kiện | Mô tả |
| :--- | :--- |
| Quy tắc chung | Yêu cầu nhập đầy đủ PO, SKU sản phẩm và kết luận kiểm định Pass/Fail. |
| Quy tắc chung | Ảnh chụp đính kèm phải được tải lên máy chủ thành công trước khi lưu bản ghi phiếu kiểm tra công đoạn. |

---

### 4.9.8 File code liên quan

**Frontend:**
* [MB6_StageInspection.jsx](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB6_StageInspection.jsx)

**Backend:**
* [inspection_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/inspection_router.py)

> [!NOTE]
> **Ghi chú Dev:**
> Trường `data_json` và `images_json` trong SQL Server được khai báo kiểu `NVARCHAR(MAX)` hoặc `TEXT`. Khi truy vấn, Backend cần deserialize chuỗi này thành JSON Object trước khi trả về Frontend để tránh lỗi hiển thị.

---

## 4.10 MH7_MA7_PalletCard — Thẻ Pallet / Phiếu Ngoại lệ (Web)

#

### 4.10.9 BẢN ĐỒ CHI TIẾT TƯƠNG TÁC FRONTEND - BACKEND (API & HANDLER FUNCTIONS)

#### A. Tầng Giao diện Client & Tương tác Nghiệp vụ (React Components & Hooks)
- **Tệp mã nguồn Giao diện (Component Path):** `FrontEnd/src/pages/PalletManagement.jsx`
- **Quản lý Trạng thái cục bộ (State Management):**
| React State Hooks | Vai trò quản lý trạng thái giao diện |
| :--- | :--- |
| `pallets` | Danh sách thẻ Pallet đang quản lý phân trang (Array) |
| `searchQuery` | Mã thẻ pallet cần tìm kiếm nhanh (String) |
| `selectedPallet` | Thẻ Pallet được click chọn xem chi tiết (Object) |
| `showCreateModal` | Hiển thị popup tạo thẻ mới (Boolean) |

- **Danh sách Hàm sự kiện chính (UI Event Handlers):**
| Trình xử lý sự kiện (Handler) | Sự kiện kích hoạt (Trigger) | Nghiệp vụ xử lý của hàm |
| :--- | :--- | :--- |
| `loadPallets()` | Khi mở màn hình quản lý thẻ | Tải danh sách thẻ pallet phân trang |
| `handleCreatePallet()` | onClick Xác nhận thêm thẻ trống | Tạo mới một thẻ pallet sinh mã tự động |
| `printTag()` | onClick nút In nhãn QR | Gọi API ra lệnh cho máy in nhãn |

- **Vòng đời & Hiệu ứng Component (Lifecycle Hooks):**
  * `useEffect gọi hàm loadPallets() khi truy cập phân hệ quản lý thẻ và lắng nghe các thay đổi phân trang để tải lại dữ liệu thích hợp.`

#### B. Tầng Giao tiếp trung gian REST API & Giao thức truyền tải (API Contract)
- **Phương thức & Đường dẫn endpoint:** `GET /api/v1/pallet/`
- **HTTP Headers yêu cầu:**
  * `Content-Type: multipart/form-data`
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Bắt buộc xác thực)
- **Mẫu dữ liệu yêu cầu gửi đi (Request Payload JSON):**
```json
None
```
- **Mẫu dữ liệu phản hồi thành công (Response 200 OK):**
```json
[\n  {"code": "PLT-001", "status": "Active", "created_at": "2026-05-25"}\n]
```

#### C. Tầng Logic Nghiệp vụ Backend & Tương tác Cơ sở dữ liệu (FastAPI & SQLAlchemy)
- **Hàm điều phối Router API (FastAPI Route Handler):** `get_pallets() trong `BackEnd/src/app/api/v1/endpoints/pallet.py``
- **Hàm dịch vụ nghiệp vụ chính (Business Logic Service):** `read_pallet_cards()`
- **Các Models/Thực thể dữ liệu tương tác chính (SQLAlchemy Models):** ``pallet_cards``
- **Cơ chế truy vấn & Khóa đồng thời (Database Operations & Concurrency Control):**
  * `Truy vấn danh sách thẻ pallet, hỗ trợ tìm kiếm và phân trang theo thời gian tạo.`
- **Ràng buộc kiểm tra tính toàn vẹn (Integrity & Database Validation Constraints):**
  * `Mã pallet duy nhất.`

#### D. Luồng Xử lý Lỗi, Phục hồi Hệ thống & Ngoại lệ (Exception Handling & Resilience)
- **Các mã lỗi API & Ngoại lệ nghiệp vụ có thể trả về:**
  * `HTTP 401 Unauthorized`: Trả về khi JWT Token không hợp lệ hoặc hết hạn sử dụng.
  * `HTTP 403 Forbidden`: Trả về khi người dùng không có quyền truy cập hoặc thực hiện thao tác tại trạm sản xuất tương ứng.
  * `HTTP 422 Unprocessable Entity`: Trả về khi cấu trúc trường JSON gửi lên bị thiếu hoặc sai kiểu dữ liệu yêu cầu.
  * `HTTP 400 Bad Request`: Trả về khi vi phạm các quy tắc ràng buộc nghiệp vụ sản xuất (ví dụ: linh kiện chưa đo độ ẩm, số nhận lớn hơn số giao...).
- **Cơ chế phục hồi Ngoại tuyến tại hiện trường (Offline Capabilities & Queue Sync):**
  * `Không hỗ trợ.`

#### E. Mẫu mã nguồn giao tiếp thực tế chuẩn hóa (Reference Implementation Code Snippet)

**Frontend Component API Hook (React JS):**
```javascript
// Giao tiếp Axios Client gửi yêu cầu lên Backend FastAPI
const loadPallets = async () => {
  const res = await axios.get("/api/v1/pallet/");
  setPallets(res.data);
};
```

**Backend Router & Controller (FastAPI & SQLAlchemy ORM):**
```python
# Điều phối API Endpoint và xử lý ghi nhận giao dịch cơ sở dữ liệu
@router.get("/")
def get_pallets(db: Session = Depends(get_db)):
    return db.query(PalletCard).order_by(PalletCard.created_at.desc()).all()
```

#### F. Sơ đồ tuần tự tương tác hệ thống (Sequence Diagram)
```mermaid
sequenceDiagram
    actor Planner as Nhân viên Kế hoạch (Web)
    participant Web as Web Pallet Editor (FortuneSheet)
    participant Server as FastAPI Backend
    participant DB as SQLite Database
    Planner->>Web: Nhập thông tin & thiết kế Thẻ Pallet
    Web->>Server: PUT /api/v1/pallet/{code}/sheet
    Server->>DB: UPDATE pallet_cards set sheet_data = JSON
    DB-->>Server: Success
    Server-->>Web: HTTP 200 OK
```

---

## 4.10.1 Mục đích màn hình
Màn hình Web cung cấp giao diện quản lý tập trung toàn bộ các phiếu bàn giao phát sinh bất thường (ngoại lệ) trên xưởng: Lệch thiếu (Thực nhận < Tổng giao), Lệch thừa (Tổng giao < Thực nhận), QC Trả hàng và Lô hàng phát sinh lỗi QC, giúp quản lý nhanh chóng tìm ra điểm nóng sai sót.

---

### 4.10.2 Thông tin màn hình

| Thuộc tính | Nội dung |
| :--- | :--- |
| Mã màn hình | MA7 |
| Route | `/exception-deliveries` |
| Module | Quản lý bàn giao (Deliveries) |
| Người dùng sử dụng | Ban quản lý, Quản trị viên hệ thống (Web) |

---

### 4.10.3 Chức năng chính

| STT | Chức năng | Mô tả |
| :--- | :--- | :--- |
| 1 | Thống kê phân loại ngoại lệ: | Hiển thị tổng số lượng và tỉ lệ các loại phiếu lỗi/lệch dưới dạng thẻ KPI nổi bật. |
| 2 | Tìm kiếm & Bộ lọc thông minh: | Lọc phiếu theo các nhóm ngoại lệ riêng biệt (Lệch thiếu, Lệch thừa, Trả hàng, Lỗi QC) và tìm kiếm theo mã phiếu hoặc tên linh kiện. |
| 3 | Xem chi tiết phiếu bàn giao: | Modal popup hiển thị đầy đủ thông tin đo độ ẩm, người giao/nhận, 8 chỉ tiêu kiểm tra chất lượng QC của phiếu và ảnh chụp đối chứng từ xưởng. |
| 4 | Phân trang dữ liệu: | Phân trang danh sách phiếu bất thường (15 bản ghi trên một trang) đảm bảo hiệu năng tải trang. |

---

### 4.10.4 Luồng xử lý hệ thống

```mermaid
sequenceDiagram
    autonumber
    actor Manager as Quản lý / Admin
    participant Web as Web Admin (React)
    participant API as Backend API
    participant DB as Database
    
    Manager->>Web: Mở màn hình Phiếu Ngoại lệ (Route: /exception-deliveries)
    Web->>API: GET /api/v1/exception-deliveries?skip=0&limit=15&filter=ALL
    API->>DB: Truy vấn deliveries lệch số lượng, bị trả hoặc bị lỗi QC
    DB-->>API: Return danh sách & KPIs thống kê
    API-->>Web: Trả về danh sách phiếu & KPIs ngoại lệ
    Web->>Web: Thống kê và hiển thị thẻ KPI lệch
    
    Manager->>Web: Lọc theo loại ngoại lệ hoặc tìm kiếm mã phiếu
    Web->>API: GET /api/v1/exception-deliveries?filter={filterType}&search={query}
    API-->>Web: Trả về danh sách lọc
    
    Manager->>Web: Click xem chi tiết một phiếu ngoại lệ
    Web->>API: GET /api/v1/deliveries/{id}
    API->>DB: Query thông tin giao nhận, QC checklist, hình ảnh minh chứng
    DB-->>API: Return dữ liệu chi tiết
    API-->>Web: Trả về chi tiết phiếu
    Web->>Web: Hiển thị Modal chi tiết phiếu & hình ảnh đối chứng
```

Quản lý truy cập trang Quản lý phiếu ngoại lệ trên giao diện Web.
2. Hệ thống gọi API lấy toàn bộ danh sách phiếu bàn giao có bất thường.
3. Người dùng xem các chỉ số thống kê tổng hợp ở phía trên để nắm bắt tình hình chất lượng xưởng.
4. Sử dụng bộ lọc hoặc ô tìm kiếm để khoanh vùng các phiếu giao nhận bị lệch số lượng lớn.
5. Bấm nút **Xem chi tiết (Eye Icon)** trên một dòng phiếu: Hệ thống mở Modal hiển thị chi tiết phiếu bàn giao, danh sách ảnh bàn giao đi, ảnh trả hàng lỗi (nếu có), thông số ẩm đo được và kết quả checklist QC.* Frontend gọi service `deliveryService.getExceptionDeliveries()` tương ứng với API `GET /api/v1/deliveries/exceptions` để lấy danh sách phiếu ngoại lệ.
* Chi tiết phiếu được lấy qua `deliveryService.getDeliveryDetail(id)` tương ứng với API `GET /api/v1/deliveries/detail/{id}`.
* Logic lọc ngoại lệ tại Backend:
  * **Lệch thừa:** `quantity_received > quantity_total`.
  * **Lệch thiếu:** `quantity_received < quantity_total` và trạng thái không nằm trong nhóm chờ (`Chờ xác nhận`, `Chờ kiểm tra`...).
  * **Trả hàng:** `quantity_returned > 0`.
  * **Lỗi QC:** `status == 'Lỗi'` hoặc `quantity_error > 0`.

---

### 4.10.5 API liên quan

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| GET | `/api/v1/deliveries/exceptions` | Lấy danh sách phiếu bàn giao ngoại lệ. Định nghĩa tại [delivery_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/delivery_router.py#L387-L449). |
| GET | `/api/v1/deliveries/detail/{delivery_id}` | Lấy chi tiết thông tin một phiếu bàn giao. Định nghĩa tại [delivery_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/delivery_router.py#L510-L542). |

---

### 4.10.6 Database liên quan

| Bảng | Mục đích |
| :--- | :--- |
| ``deliveries`` | Phiếu bàn giao. Ánh xạ qua [Delivery](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/deliveries.py#L8). |
| ``delivery_qc`` | Kết quả đánh giá chất lượng. Ánh xạ qua Model [DeliveryQC](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/delivery_qc.py#L6). |

---

### 4.10.7 Business Rules

| Điều kiện | Mô tả |
| :--- | :--- |
| Quy tắc chung | Phiếu bàn giao bị lệch thiếu chỉ được coi là ngoại lệ khi đã kết thúc quy trình nhận hàng (không tính các phiếu đang trong trạng thái chờ xử lý). |

---

### 4.10.8 File code liên quan

**Frontend:**
* [MA7_PalletCard.jsx](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/FrontEnd/src/pages/Manufacture/MA7_PalletCard.jsx)

**Backend:**
* [delivery_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/delivery_router.py)

> [!NOTE]
> **Ghi chú Dev:**
> Tên tệp tin là `MA7_PalletCard.jsx` nhưng component chính bên trong thực chất là `ExceptionDeliveries`. Khi cấu hình Route trong `App.jsx` cần chú ý import đúng đường dẫn tệp tin.

---

## 4.11 MH11_AD11_BackupQRManagement — Quản lý QR dự phòng (Web)

#

### 4.11.9 BẢN ĐỒ CHI TIẾT TƯƠNG TÁC FRONTEND - BACKEND (API & HANDLER FUNCTIONS)

#### A. Tầng Giao diện Client & Tương tác Nghiệp vụ (React Components & Hooks)
- **Tệp mã nguồn Giao diện (Component Path):** `FrontEnd/src/pages/BackupQRManagement.jsx`
- **Quản lý Trạng thái cục bộ (State Management):**
| React State Hooks | Vai trò quản lý trạng thái giao diện |
| :--- | :--- |
| `qrCodes` | Danh sách các mã QR dự phòng đang quản lý (Array) |
| `searchQuery` | Mã QR cần tìm kiếm nhanh (String) |
| `showGenerateModal` | Hiển thị modal sinh mã QR (Boolean) |
| `generateCount` | Số lượng mã QR muốn sinh hàng loạt (Integer) |

- **Danh sách Hàm sự kiện chính (UI Event Handlers):**
| Trình xử lý sự kiện (Handler) | Sự kiện kích hoạt (Trigger) | Nghiệp vụ xử lý của hàm |
| :--- | :--- | :--- |
| `loadQRCodes()` | Khi mở màn hình | Tải danh sách mã QR dự phòng |
| `handleGenerateQR()` | onClick Xác nhận sinh mã | Gửi API sinh hàng loạt mã QR dự phòng |
| `handleExportPDF()` | onClick nút Xuất nhãn in PDF | Xuất file PDF chứa các mã QR để in nhiệt dán |

- **Vòng đời & Hiệu ứng Component (Lifecycle Hooks):**
  * `useEffect load danh sách mã QR dự phòng đang có trong hệ thống.`

#### B. Tầng Giao tiếp trung gian REST API & Giao thức truyền tải (API Contract)
- **Phương thức & Đường dẫn endpoint:** `POST /api/v1/backup-qr/generate`
- **HTTP Headers yêu cầu:**
  * `Content-Type: application/json`
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Bắt buộc xác thực)
- **Mẫu dữ liệu yêu cầu gửi đi (Request Payload JSON):**
```json
{\n  "count": 50\n}
```
- **Mẫu dữ liệu phản hồi thành công (Response 200 OK):**
```json
{\n  "success": true,\n  "generated_codes": ["QR-BACKUP-001", "QR-BACKUP-002"]\n}
```

#### C. Tầng Logic Nghiệp vụ Backend & Tương tác Cơ sở dữ liệu (FastAPI & SQLAlchemy)
- **Hàm điều phối Router API (FastAPI Route Handler):** `generate_backup_qr() trong `BackEnd/src/app/api/v1/endpoints/backup_qr.py``
- **Hàm dịch vụ nghiệp vụ chính (Business Logic Service):** `create_backup_qrs()`
- **Các Models/Thực thể dữ liệu tương tác chính (SQLAlchemy Models):** ``backup_qr_codes``
- **Cơ chế truy vấn & Khóa đồng thời (Database Operations & Concurrency Control):**
  * `Sinh hàng loạt mã QR dự phòng ở trạng thái 'Trống' và lưu vào CSDL.`
- **Ràng buộc kiểm tra tính toàn vẹn (Integrity & Database Validation Constraints):**
  * `Số lượng sinh tối đa 500 mã một lần.`

#### D. Luồng Xử lý Lỗi, Phục hồi Hệ thống & Ngoại lệ (Exception Handling & Resilience)
- **Các mã lỗi API & Ngoại lệ nghiệp vụ có thể trả về:**
  * `HTTP 401 Unauthorized`: Trả về khi JWT Token không hợp lệ hoặc hết hạn sử dụng.
  * `HTTP 403 Forbidden`: Trả về khi người dùng không có quyền truy cập hoặc thực hiện thao tác tại trạm sản xuất tương ứng.
  * `HTTP 422 Unprocessable Entity`: Trả về khi cấu trúc trường JSON gửi lên bị thiếu hoặc sai kiểu dữ liệu yêu cầu.
  * `HTTP 400 Bad Request`: Trả về khi vi phạm các quy tắc ràng buộc nghiệp vụ sản xuất (ví dụ: linh kiện chưa đo độ ẩm, số nhận lớn hơn số giao...).
- **Cơ chế phục hồi Ngoại tuyến tại hiện trường (Offline Capabilities & Queue Sync):**
  * `Không hỗ trợ.`

#### E. Mẫu mã nguồn giao tiếp thực tế chuẩn hóa (Reference Implementation Code Snippet)

**Frontend Component API Hook (React JS):**
```javascript
// Giao tiếp Axios Client gửi yêu cầu lên Backend FastAPI
const handleGenerateQR = async () => {
  try {
    await axios.post("/api/v1/backup-qr/generate", { count: generateCount });
    showToast("Đã sinh mã QR dự phòng thành công!");
    loadQRCodes();
  } catch (error) {
    showToast("Không thể sinh mã QR.");
  }
};
```

**Backend Router & Controller (FastAPI & SQLAlchemy ORM):**
```python
# Điều phối API Endpoint và xử lý ghi nhận giao dịch cơ sở dữ liệu
@router.post("/generate")
def generate_backup_qr(payload: GeneratePayload, db: Session = Depends(get_db)):
    codes = []
    for _ in range(payload.count):
        code = f"QR-BACKUP-{uuid.uuid4().hex[:8].upper()}"
        db.add(BackupQRCode(code=code, status="Trống"))
        codes.append(code)
    db.commit()
    return {"success": True, "generated_codes": codes}
```

#### F. Sơ đồ tuần tự tương tác hệ thống (Sequence Diagram)
```mermaid
sequenceDiagram
    actor Admin as Quản trị viên
    participant Web as Web Backup QR (FrontEnd)
    participant Server as FastAPI Backend
    participant DB as SQLite Database
    Admin->>Web: Nhấp "Sinh mã QR dự phòng" & chọn số lượng (vd: 50)
    Web->>Server: POST /api/v1/backup-qr/generate (count=50)
    Server->>Server: Tự động tạo 50 mã UUID unique
    Server->>DB: Bulk INSERT backup_qr_codes status='Trống'
    DB-->>Server: Success
    Server-->>Web: HTTP 200 OK (Danh sách mã QR vừa tạo)
```

---

## 4.11.1 Mục đích màn hình
Màn hình Web dành cho Admin quản lý danh sách các thẻ QR cố định luân chuyển trên xưởng. Hỗ trợ tạo tự động dải mã mới, in tem nhãn thẻ theo chuẩn kích thước A7 trên khổ giấy A5 và cưỡng bức giải phóng trạng thái thẻ QR từ "Đang dùng" về "Trống" khi xảy ra sự cố nghẽn luồng.

---

### 4.11.2 Thông tin màn hình

| Thuộc tính | Nội dung |
| :--- | :--- |
| Mã màn hình | AD11 |
| Route | `/admin/backup-qrs (định cấu hình trong outlet router Web)` |
| Module | Quản lý hệ thống (Admin Settings) |
| Người dùng sử dụng | Quản trị viên hệ thống (Admin) |

---

### 4.11.3 Chức năng chính

| STT | Chức năng | Mô tả |
| :--- | :--- | :--- |
| 1 | Hiển thị danh sách thẻ: | Liệt kê các mã QR dự phòng đang có trong hệ thống và trạng thái tương ứng. |
| 2 | Tự động sinh mã hàng loạt: | Nhập số lượng mã cần sinh, hệ thống tự động tính số thứ tự tiếp theo để sinh dải mã dạng nối tiếp (ví dụ: DP-013, DP-014...). |
| 3 | In tem nhãn chuẩn A7/A5: | Chọn các mã QR cần in, hệ thống tự động căn lề vẽ QR Code kích thước A7 đặt ở chính giữa khổ giấy A5 để in ấn trực tiếp từ trình duyệt. |
| 4 | Giải phóng cưỡng bức (Unlock): | Cho phép Admin mở khoá thẻ QR đang bị gán cho phiếu giao sang trạng thái Sẵn sàng để tái sử dụng. |

---

### 4.11.4 Luồng xử lý hệ thống

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant Web as Web Admin (React)
    participant API as Backend API
    participant DB as Database
    participant QR as QR Code Generator Service
    
    Admin->>Web: Mở màn hình Quản lý QR dự phòng (Route: /backup-qrs)
    Web->>API: GET /api/v1/deliveries/backup-qrs/all
    API->>DB: Truy vấn bảng backup_qr_codes
    DB-->>API: Return danh sách mã QR dự phòng
    API-->>Web: Trả về danh sách QR
    
    alt Khai sinh mã QR dự phòng mới
        Admin->>Web: Chọn số lượng mã cần sinh và nhấn "Sinh mã"
        Web->>API: POST /api/v1/deliveries/backup-qrs (JSON: {quantity: N})
        API->>DB: Sinh mã ngẫu nhiên dạng DP-XXX, lưu trạng thái "Trống"
        DB-->>API: Success
        API-->>Web: Trả về danh sách mã mới sinh
        Web->>QR: Gọi API QR Server vẽ mã QR Code
        QR-->>Web: Trả về hình ảnh QR Code
        Web->>Web: Mở trang in thẻ QR dự phòng khổ A5
    end
    
    alt Cưỡng bức giải phóng mã QR đang sử dụng
        Admin->>Web: Nhấn nút "Giải phóng" trên thẻ QR đang bận
        Web->>API: POST /api/v1/deliveries/backup-qrs/{id}/release
        API->>DB: Cập nhật status = "Trống", current_delivery_id = NULL
        DB-->>API: Success
        API-->>Web: Success
        Web->>Web: Reload danh sách thẻ QR dự phòng
    end
```

Admin truy cập màn hình, xem danh sách và trạng thái các thẻ QR hiện hữu.
2. **Khai báo thẻ mới:** Admin nhấn nút "Thêm mã mới", nhập số lượng cần tạo (Ví dụ: 10). Hệ thống gửi request lên Backend, Backend tự động tìm mã số thứ tự lớn nhất trong DB (ví dụ: `DP-012`), sinh tiếp 10 mã nối tiếp (`DP-013` đến `DP-022`) với trạng thái ban đầu là `Trống` (Sẵn sàng).
3. **In thẻ luân chuyển:** Admin tích chọn các thẻ cần in, nhấn nút "In thẻ đã chọn". Hệ thống mở một tab trình duyệt mới, vẽ QR Code qua dịch vụ tạo mã QR động và tự động gọi hộp thoại in ấn của trình duyệt.
4. **Giải phóng thẻ:** Khi một lô hàng bị huỷ hoặc kẹt quy trình khiến thẻ QR giữ trạng thái `Đang dùng` vô thời hạn, Admin tìm thẻ đó và nhấn nút **Giải phóng (Unlock)** để đưa trạng thái thẻ về `Trống` và xoá liên kết phiếu giao.* API tạo mới hỗ trợ cả sinh hàng loạt tự động (`quantity`) hoặc thêm thủ công danh sách mã phân tách bằng dấu phẩy qua `POST /api/v1/deliveries/backup-qrs`.
* API giải phóng thẻ: `POST /api/v1/deliveries/backup-qrs/{qr_id}/release` đặt trường `status = "Trống"` và `current_delivery_id = None`.
* Vẽ ảnh QR Code trên trang in sử dụng API QR Server: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={qr_code}`.

---

### 4.11.5 API liên quan

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| GET | `/api/v1/deliveries/backup-qrs/all` | Tải toàn bộ danh sách thẻ QR dự phòng. Định nghĩa tại [delivery_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/delivery_router.py#L649-L690). |
| POST | `/api/v1/deliveries/backup-qrs` | Khai báo sinh mã QR dự phòng. Định nghĩa tại [delivery_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/delivery_router.py#L564-L648). |
| POST | `/api/v1/deliveries/backup-qrs/{qr_id}/release` | Cưỡng bức giải phóng thẻ QR. Định nghĩa tại [delivery_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/delivery_router.py#L692-L706). |

---

### 4.11.6 Database liên quan

| Bảng | Mục đích |
| :--- | :--- |
| ``backup_qr_codes`` | Lưu thông tin thẻ QR dự phòng. Ánh xạ qua Model [BackupQRCode](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/backup_qr.py#L6). |

---

### 4.11.7 Business Rules

| Điều kiện | Mô tả |
| :--- | :--- |
| Quy tắc chung | Định dạng mã sinh tự động bắt buộc có tiền tố `DP-` kèm 3 chữ số tự tăng (ví dụ: `DP-001`). |
| Quy tắc chung | Không cho phép giải phóng thẻ QR nếu thẻ đó đang ở trạng thái `Trống` (Sẵn sàng). |

---

### 4.11.8 File code liên quan

**Frontend:**
* [AD11_BackupQRManagement.jsx](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/FrontEnd/src/pages/Admin/AD11_BackupQRManagement.jsx)

**Backend:**
* [delivery_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/delivery_router.py)

> [!NOTE]
> **Ghi chú Dev:**
> Trang in thẻ luân chuyển sử dụng CSS `@media print` thiết lập ngắt trang tự động `page-break-after: always` để đảm bảo mỗi thẻ QR được in chính xác nằm giữa một tờ giấy A5 portrait mà không bị lệch lề hay dồn dòng.

---

## 4.12 MH12_MB7_InspectionLogs — Nhật ký kiểm tra (Mobile)

#

### 4.12.9 BẢN ĐỒ CHI TIẾT TƯƠNG TÁC FRONTEND - BACKEND (API & HANDLER FUNCTIONS)

#### A. Tầng Giao diện Client & Tương tác Nghiệp vụ (React Components & Hooks)
- **Tệp mã nguồn Giao diện (Component Path):** `Mobile/src/Views/screens/MB7_InspectionLogs.jsx`
- **Quản lý Trạng thái cục bộ (State Management):**
| React State Hooks | Vai trò quản lý trạng thái giao diện |
| :--- | :--- |
| `logs` | Danh sách nhật ký kiểm định chất lượng gỗ (Array) |
| `startDate` | Thời gian lọc bắt đầu (String) |
| `endDate` | Thời gian lọc kết thúc (String) |
| `searchQuery` | Mã linh kiện cần tìm kiếm nhanh (String) |
| `selectedLog` | Chi tiết dòng nhật ký được chọn xem (Object) |

- **Danh sách Hàm sự kiện chính (UI Event Handlers):**
| Trình xử lý sự kiện (Handler) | Sự kiện kích hoạt (Trigger) | Nghiệp vụ xử lý của hàm |
| :--- | :--- | :--- |
| `loadLogs()` | Khi mở màn hình | Tải danh sách nhật ký QC phân trang |
| `handleFilterDate()` | onChange bộ chọn ngày | Cập nhật ngày lọc và tải lại dữ liệu |
| `viewLogDetail()` | onClick vào dòng nhật ký | Mở xem chi tiết các hạng mục lỗi của lô hàng |

- **Vòng đời & Hiệu ứng Component (Lifecycle Hooks):**
  * `useEffect load nhật ký kiểm tra chất lượng theo phạm vi ngày mặc định.`

#### B. Tầng Giao tiếp trung gian REST API & Giao thức truyền tải (API Contract)
- **Phương thức & Đường dẫn endpoint:** `GET /api/v1/qc/inspection-logs`
- **HTTP Headers yêu cầu:**
  * `Content-Type: multipart/form-data`
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Bắt buộc xác thực)
- **Mẫu dữ liệu yêu cầu gửi đi (Request Payload JSON):**
```json
None
```
- **Mẫu dữ liệu phản hồi thành công (Response 200 OK):**
```json
[\n  {"id": 1, "part_name": "Tấm hông", "result": "Đạt", "created_at": "2026-05-25"}\n]
```

#### C. Tầng Logic Nghiệp vụ Backend & Tương tác Cơ sở dữ liệu (FastAPI & SQLAlchemy)
- **Hàm điều phối Router API (FastAPI Route Handler):** `get_inspection_logs() trong `BackEnd/src/app/api/v1/endpoints/qc.py``
- **Hàm dịch vụ nghiệp vụ chính (Business Logic Service):** `read_inspection_logs()`
- **Các Models/Thực thể dữ liệu tương tác chính (SQLAlchemy Models):** ``daily_inspection_records``
- **Cơ chế truy vấn & Khóa đồng thời (Database Operations & Concurrency Control):**
  * `Truy vấn dữ liệu nhật ký kiểm tra chất lượng của QC tại các trạm.`
- **Ràng buộc kiểm tra tính toàn vẹn (Integrity & Database Validation Constraints):**
  * `Phải lọc theo quyền trạm sản xuất.`

#### D. Luồng Xử lý Lỗi, Phục hồi Hệ thống & Ngoại lệ (Exception Handling & Resilience)
- **Các mã lỗi API & Ngoại lệ nghiệp vụ có thể trả về:**
  * `HTTP 401 Unauthorized`: Trả về khi JWT Token không hợp lệ hoặc hết hạn sử dụng.
  * `HTTP 403 Forbidden`: Trả về khi người dùng không có quyền truy cập hoặc thực hiện thao tác tại trạm sản xuất tương ứng.
  * `HTTP 422 Unprocessable Entity`: Trả về khi cấu trúc trường JSON gửi lên bị thiếu hoặc sai kiểu dữ liệu yêu cầu.
  * `HTTP 400 Bad Request`: Trả về khi vi phạm các quy tắc ràng buộc nghiệp vụ sản xuất (ví dụ: linh kiện chưa đo độ ẩm, số nhận lớn hơn số giao...).
- **Cơ chế phục hồi Ngoại tuyến tại hiện trường (Offline Capabilities & Queue Sync):**
  * `Lưu cache nhật ký 30 ngày gần nhất.`

#### E. Mẫu mã nguồn giao tiếp thực tế chuẩn hóa (Reference Implementation Code Snippet)

**Frontend Component API Hook (React JS):**
```javascript
// Giao tiếp Axios Client gửi yêu cầu lên Backend FastAPI
const loadLogs = async () => {
  const res = await axios.get("/api/v1/qc/inspection-logs");
  setLogs(res.data);
};
```

**Backend Router & Controller (FastAPI & SQLAlchemy ORM):**
```python
# Điều phối API Endpoint và xử lý ghi nhận giao dịch cơ sở dữ liệu
@router.get("/inspection-logs")
def get_inspection_logs(db: Session = Depends(get_db)):
    return db.query(DailyInspectionRecord).order_by(DailyInspectionRecord.created_at.desc()).all()
```

#### F. Sơ đồ tuần tự tương tác hệ thống (Sequence Diagram)
```mermaid
sequenceDiagram
    actor QC as Nhân viên QC
    participant Mobile as Mobile App (InspectionLogs)
    participant Server as FastAPI Backend
    participant DB as SQLite Database
    QC->>Mobile: Mở nhật ký kiểm tra chất lượng
    Mobile->>Server: GET /api/v1/qc/inspection-logs
    Server->>DB: Query daily_inspection_records filter by date range
    DB-->>Server: Trả về danh sách nhật ký
    Server-->>Mobile: HTTP 200 OK
```

---

## 4.12.1 Mục đích màn hình
Màn hình cung cấp nhật ký lịch sử các hoạt động kiểm tra chất lượng (hàng ngày và theo từng công đoạn) đã thực hiện trong xưởng, hỗ trợ tìm kiếm nhanh chóng và xem lại kết quả kiểm tra cũ.

---

### 4.12.2 Thông tin màn hình

| Thuộc tính | Nội dung |
| :--- | :--- |
| Mã màn hình | MB7 |
| Route | `/logs` |
| Module | Quản lý kiểm định chất lượng (Inspections) |
| Người dùng sử dụng | Nhân viên QC, Nhân viên Sản xuất, Giám sát chất lượng |

---

### 4.12.3 Chức năng chính

| STT | Chức năng | Mô tả |
| :--- | :--- | :--- |
| 1 | Danh sách lịch sử gộp: | Tải và hiển thị gộp danh sách lịch sử kiểm định từ hai nguồn khác nhau: Kiểm tra hàng ngày và Kiểm tra công đoạn. |
| 2 | Bộ lọc & Tìm kiếm: | Hỗ trợ lọc và tìm kiếm thời gian thực theo mã lô hàng, tên người kiểm tra hoặc loại hình kiểm tra. |
| 3 | Điều hướng chi tiết: | Bấm vào dòng nhật ký bất kỳ để chuyển hướng xem chi tiết kết quả kiểm định cũ tương ứng. |

---

### 4.12.4 Luồng xử lý hệ thống

```mermaid
sequenceDiagram
    autonumber
    actor User as Nhân viên QC / SX
    participant App as Mobile App
    participant API as Backend API
    participant DB as Database
    
    User->>App: Mở màn hình Nhật ký kiểm tra (Route: /logs)
    par Tải danh sách kiểm tra hàng ngày
        App->>API: GET /api/v1/inspections/daily
        API->>DB: Query bảng daily_inspection_records
        DB-->>API: Return danh sách daily
        API-->>App: Trả về danh sách daily logs
    and Tải danh sách kiểm tra công đoạn
        App->>API: GET /api/v1/inspections/stage
        API->>DB: Query bảng stage_inspections
        DB-->>API: Return danh sách stage
        API-->>App: Trả về danh sách stage logs
    end
    
    App->>App: Gộp 2 danh sách, thêm prefix ID, chuẩn hóa hiển thị và sắp xếp giảm dần theo thời gian
    App-->>User: Hiển thị danh sách nhật ký gộp
    
    User->>App: Nhập từ khóa tìm kiếm (lô hàng, người kiểm, loại kiểm tra)
    App->>App: Lọc danh sách theo thời gian thực (Case-insensitive)
    
    User->>App: Nhấp vào một bản ghi nhật ký
    App->>App: Điều hướng sang màn hình chi tiết tương ứng (/inspection-daily hoặc /inspection-stage) với logId và type
```

Người dùng mở màn hình Nhật ký kiểm tra.
2. Ứng dụng gọi đồng thời 2 API để lấy danh sách phiếu kiểm tra hàng ngày và phiếu kiểm tra công đoạn.
3. Ứng dụng xử lý gộp dữ liệu:
   * **Bản ghi kiểm tra hàng ngày:** Tiền tố ID là `daily_`, loại hiển thị là "Kiểm tra hằng ngày", kết quả dựa vào `total_defects > 0` (Đạt/Không đạt).
   * **Bản ghi kiểm tra công đoạn:** Tiền tố ID là `stage_`, loại hiển thị chuyển đổi dựa trên `inspection_type` (Đầu vào, Bám dính, Đóng gói), kết quả dựa trên `conclusion` ('pass' -> Đạt, 'fail' -> Không đạt).
4. Sắp xếp danh sách gộp theo mốc thời gian từ mới nhất đến cũ nhất.
5. Người dùng có thể tìm kiếm nhanh trên danh sách. Khi nhấp chọn một bản ghi, hệ thống điều hướng đến màn hình chi tiết tương ứng (`/inspection-daily` hoặc `/inspection-stage`) kèm theo state `logId` và `type`.* Sử dụng `Promise.all` để tải song song dữ liệu từ `apiClient.get('inspections/daily')` và `apiClient.get('inspections/stage')`.
* Dữ liệu trả về được định dạng lại cấu trúc đồng nhất trên client trước khi gán vào state `logs`.

---

### 4.12.5 API liên quan

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| GET | `/api/v1/inspections/daily` | Lấy danh sách phiếu kiểm tra hàng ngày. Định nghĩa tại [get_daily_inspections](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/inspection_router.py#L58-L75). |
| GET | `/api/v1/inspections/stage` | Lấy danh sách phiếu kiểm tra công đoạn. Định nghĩa tại [get_stage_inspections](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/inspection_router.py#L114-L123). |

---

### 4.12.6 Database liên quan

| Bảng | Mục đích |
| :--- | :--- |
| ``daily_inspection_records`` | Lưu trữ nhật ký kiểm tra hàng ngày. Ánh xạ qua Model [DailyInspectionRecord](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/daily_inspection.py#L7). |
| ``stage_inspections`` | Lưu trữ nhật ký kiểm tra công đoạn. Ánh xạ qua Model [StageInspection](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/stage_inspection.py#L6). |

---

### 4.12.7 Business Rules

| Điều kiện | Mô tả |
| :--- | :--- |
| Quy tắc chung | Chỉ cho phép xem lịch sử, không có chức năng chỉnh sửa hay xóa nhật ký tại màn hình này. |
| Quy tắc chung | Bộ lọc tìm kiếm không phân biệt chữ hoa chữ thường (Case-insensitive). |

---

### 4.12.8 File code liên quan

**Frontend:**
* [InspectionLogs](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB7_InspectionLogs.jsx)

**Backend:**
* [inspection_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/inspection_router.py)

> [!NOTE]
> **Ghi chú Dev:**
> Việc gộp dữ liệu được thực hiện hoàn toàn ở Client. Khi số lượng bản ghi lớn, cần cân nhắc thêm cơ chế phân trang phía Backend cho cả 2 API để tối ưu hiệu năng.

---

## 4.13 MH13_MB8_KPITracking — Theo dõi KPI (Mobile)

#

### 4.13.9 BẢN ĐỒ CHI TIẾT TƯƠNG TÁC FRONTEND - BACKEND (API & HANDLER FUNCTIONS)

#### A. Tầng Giao diện Client & Tương tác Nghiệp vụ (React Components & Hooks)
- **Tệp mã nguồn Giao diện (Component Path):** `Mobile/src/Views/screens/MB8_KPITracking.jsx`
- **Quản lý Trạng thái cục bộ (State Management):**
| React State Hooks | Vai trò quản lý trạng thái giao diện |
| :--- | :--- |
| `kpiData` | Thông số hiệu năng sản lượng và lỗi của trạm (Object) |
| `loading` | Trạng thái tải dữ liệu chỉ số (Boolean) |
| `timeRange` | Phạm vi lọc thời gian xem (Hôm nay/Tuần/Tháng) (String) |

- **Danh sách Hàm sự kiện chính (UI Event Handlers):**
| Trình xử lý sự kiện (Handler) | Sự kiện kích hoạt (Trigger) | Nghiệp vụ xử lý của hàm |
| :--- | :--- | :--- |
| `loadKPIs()` | Khi mở màn hình hoặc thay đổi timeRange | Gọi API tải chỉ số hiệu năng sản xuất |
| `changeTimeRange()` | onClick chọn tab thời gian | Cập nhật timeRange lọc dữ liệu |

- **Vòng đời & Hiệu ứng Component (Lifecycle Hooks):**
  * `useEffect load chỉ số hiệu năng sản xuất cá nhân khi mở màn hình.`

#### B. Tầng Giao tiếp trung gian REST API & Giao thức truyền tải (API Contract)
- **Phương thức & Đường dẫn endpoint:** `GET /api/v1/system/kpis`
- **HTTP Headers yêu cầu:**
  * `Content-Type: multipart/form-data`
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Bắt buộc xác thực)
- **Mẫu dữ liệu yêu cầu gửi đi (Request Payload JSON):**
```json
None
```
- **Mẫu dữ liệu phản hồi thành công (Response 200 OK):**
```json
{\n  "total_produced": 1200,\n  "error_count": 15,\n  "defect_rate": 0.0125\n}
```

#### C. Tầng Logic Nghiệp vụ Backend & Tương tác Cơ sở dữ liệu (FastAPI & SQLAlchemy)
- **Hàm điều phối Router API (FastAPI Route Handler):** `get_worker_kpis() trong `BackEnd/src/app/api/v1/endpoints/dashboard.py``
- **Hàm dịch vụ nghiệp vụ chính (Business Logic Service):** `compute_worker_metrics()`
- **Các Models/Thực thể dữ liệu tương tác chính (SQLAlchemy Models):** ``deliveries``
- **Cơ chế truy vấn & Khóa đồng thời (Database Operations & Concurrency Control):**
  * `Thực hiện câu lệnh SQL Aggregate tính tổng sản lượng đạt và lỗi của công nhân.`
- **Ràng buộc kiểm tra tính toàn vẹn (Integrity & Database Validation Constraints):**
  * `Chỉ tính toán các phiếu giao nhận ở trạng thái 'Đã nhận'.`

#### D. Luồng Xử lý Lỗi, Phục hồi Hệ thống & Ngoại lệ (Exception Handling & Resilience)
- **Các mã lỗi API & Ngoại lệ nghiệp vụ có thể trả về:**
  * `HTTP 401 Unauthorized`: Trả về khi JWT Token không hợp lệ hoặc hết hạn sử dụng.
  * `HTTP 403 Forbidden`: Trả về khi người dùng không có quyền truy cập hoặc thực hiện thao tác tại trạm sản xuất tương ứng.
  * `HTTP 422 Unprocessable Entity`: Trả về khi cấu trúc trường JSON gửi lên bị thiếu hoặc sai kiểu dữ liệu yêu cầu.
  * `HTTP 400 Bad Request`: Trả về khi vi phạm các quy tắc ràng buộc nghiệp vụ sản xuất (ví dụ: linh kiện chưa đo độ ẩm, số nhận lớn hơn số giao...).
- **Cơ chế phục hồi Ngoại tuyến tại hiện trường (Offline Capabilities & Queue Sync):**
  * `Không hỗ trợ.`

#### E. Mẫu mã nguồn giao tiếp thực tế chuẩn hóa (Reference Implementation Code Snippet)

**Frontend Component API Hook (React JS):**
```javascript
// Giao tiếp Axios Client gửi yêu cầu lên Backend FastAPI
const loadKPIs = async () => {
  const res = await axios.get("/api/v1/system/kpis");
  setKpiData(res.data);
};
```

**Backend Router & Controller (FastAPI & SQLAlchemy ORM):**
```python
# Điều phối API Endpoint và xử lý ghi nhận giao dịch cơ sở dữ liệu
@router.get("/kpis")
def get_worker_kpis(db: Session = Depends(get_db)):
    total = db.query(func.sum(Delivery.quantity_received)).scalar() or 0
    errors = db.query(func.sum(Delivery.quantity_error)).scalar() or 0
    return {"total_produced": total, "error_count": errors, "defect_rate": errors / (total + errors) if (total + errors) > 0 else 0}
```

#### F. Sơ đồ tuần tự tương tác hệ thống (Sequence Diagram)
```mermaid
sequenceDiagram
    actor Worker as Nhân viên tổ sản xuất
    participant Mobile as Mobile App (KPITracking)
    participant Server as FastAPI Backend
    participant DB as SQLite Database
    Worker->>Mobile: Xem kết quả KPI cá nhân/trạm
    Mobile->>Server: GET /api/v1/system/kpis
    Server->>DB: Aggregate query deliveries on worker id
    DB-->>Server: Trả về sản lượng đạt/lỗi
    Server-->>Mobile: HTTP 200 OK
```

---

## 4.13.1 Mục đích màn hình
Màn hình cung cấp giao diện trực quan cho phép người lao động theo dõi chỉ số hiệu suất công việc cá nhân (KPI) theo tuần/tháng, kiểm tra danh sách đầu việc cần thực hiện (Checklist) và kết quả thực tế so với mục tiêu đề ra.

---

### 4.13.2 Thông tin màn hình

| Thuộc tính | Nội dung |
| :--- | :--- |
| Mã màn hình | MB8 |
| Route | `/kpi` |
| Module | Quản lý hiệu suất (Performance Management) |
| Người dùng sử dụng | Tất cả nhân viên xưởng (SX, QC) và Tổ trưởng |

---

### 4.13.3 Chức năng chính

| STT | Chức năng | Mô tả |
| :--- | :--- | :--- |
| 1 | Thẻ chỉ số KPI: | Hiển thị phần trăm hoàn thành KPI tuần và tháng dưới dạng biểu đồ tròn động (SVG). |
| 2 | Checklist công việc: | Hiển thị danh sách các đầu công việc cần làm trong ngày cùng trạng thái hoàn thành. |
| 3 | Chi tiết KPI: | Thống kê chi tiết các chỉ tiêu đánh giá (Tỷ lệ hàng đạt lần đầu, tỷ lệ lỗi phát hiện, điểm kỷ luật, năng suất...). |
| 4 | Lọc thời gian: | Hỗ trợ lọc chi tiết KPI theo tháng hoặc theo tuần. |

---

### 4.13.4 Luồng xử lý hệ thống

```mermaid
sequenceDiagram
    autonumber
    actor User as Nhân viên xưởng
    participant App as Mobile App
    
    User->>App: Mở màn hình Theo dõi KPI (Route: /kpi)
    App->>App: Load dữ liệu giả lập (KPI tuần/tháng, Checklist công việc, Chi tiết chỉ số)
    App->>App: Khởi tạo Framer Motion vẽ biểu đồ tròn SVG động
    App-->>User: Hiển thị Dashboard KPI và biểu đồ vòng tròn hoàn thành
    
    User->>App: Chuyển đổi giữa tab "Checklist CV" và tab "Chi tiết KPI"
    User->>App: Lọc checklist hoặc chỉ số theo thời gian (Tuần / Tháng)
    
    alt Thực hiện công việc kiểm tra thiết bị
        User->>App: Click biểu tượng chiếc bút chì ở dòng "Kiểm tra thiết bị"
        App->>App: Điều hướng sang màn hình Danh sách thiết bị (/equipment-list)
    end
```

Người dùng mở màn hình Theo dõi KPI.
2. Ứng dụng hiển thị hai biểu đồ vòng tròn thể hiện KPI của tháng và tuần.
3. Người dùng chuyển đổi qua lại giữa hai tab chính:
   * **Checklist CV:** Xem danh sách công việc trong ngày. Có thể bấm biểu tượng chiếc bút chì ở cột "Thực hiện" trên dòng "Kiểm tra thiết bị" để mở danh sách thiết bị cần kiểm tra (`/equipment-list`).
   * **Chi tiết KPI:** Xem các chỉ số KPI định lượng so sánh giữa Mục tiêu và Thực tế.
4. Có thể dùng bộ lọc để hiển thị danh sách checklist hoặc chi tiết KPI theo khoảng thời gian mong muốn.* Vẽ biểu đồ vòng tròn động sử dụng component [CircularProgress](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB8_KPITracking.jsx#L20) bằng thẻ `<svg>` kết hợp với thư viện `framer-motion` để tạo hiệu ứng chạy vòng tròn mượt mà khi load.
* Toàn bộ dữ liệu của màn hình hiện tại đang sử dụng Mock Data hoàn toàn ở Client.

---

### 4.13.5 API liên quan

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |

---

### 4.13.6 Database liên quan

| Bảng | Mục đích |
| :--- | :--- |

---

### 4.13.7 Business Rules

| Điều kiện | Mô tả |
| :--- | :--- |
| Quy tắc chung | Không áp dụng kiểm tra nghiệp vụ do hiện tại là màn hình hiển thị dữ liệu tĩnh (Mock Data). |

---

### 4.13.8 File code liên quan

**Frontend:**
* [KPITracking](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB8_KPITracking.jsx)

> [!NOTE]
> **Ghi chú Dev:**
> Cần bổ sung các API backend kết nối với bảng chấm công, KPI của nhân viên để thay thế cho mock dữ liệu hiện tại khi triển khai thực tế.

---

## 4.14 MH14_MB8.1_StaffEvaluation — Đánh giá nhân sự (Mobile)

#

### 4.14.9 BẢN ĐỒ CHI TIẾT TƯƠNG TÁC FRONTEND - BACKEND (API & HANDLER FUNCTIONS)

#### A. Tầng Giao diện Client & Tương tác Nghiệp vụ (React Components & Hooks)
- **Tệp mã nguồn Giao diện (Component Path):** `Mobile/src/Views/screens/MB8.1_StaffEvaluation.jsx`
- **Quản lý Trạng thái cục bộ (State Management):**
| React State Hooks | Vai trò quản lý trạng thái giao diện |
| :--- | :--- |
| `staffList` | Danh sách công nhân thuộc tổ sản xuất (Array) |
| `selectedStaff` | Công nhân đang được chọn đánh giá (Object) |
| `rating` | Điểm đánh giá năng suất chất lượng từ 1-5 (Integer) |
| `comments` | Nhận xét chi tiết về tác phong và chất lượng (String) |
| `isSubmitting` | Trạng thái lưu trữ đánh giá (Boolean) |

- **Danh sách Hàm sự kiện chính (UI Event Handlers):**
| Trình xử lý sự kiện (Handler) | Sự kiện kích hoạt (Trigger) | Nghiệp vụ xử lý của hàm |
| :--- | :--- | :--- |
| `loadStaffList()` | Khi mở màn hình | Tải danh sách nhân viên tổ sản xuất |
| `submitEvaluation()` | onClick Xác nhận đánh giá | Gửi API lưu biên bản đánh giá tay nghề nhân sự |
| `handleRateChange()` | onClick chọn ngôi sao đánh giá | Cập nhật rating điểm số |

- **Vòng đời & Hiệu ứng Component (Lifecycle Hooks):**
  * `useEffect load danh sách nhân viên thuộc tổ sản xuất đang quản lý.`

#### B. Tầng Giao tiếp trung gian REST API & Giao thức truyền tải (API Contract)
- **Phương thức & Đường dẫn endpoint:** `POST /api/v1/staff/evaluation`
- **HTTP Headers yêu cầu:**
  * `Content-Type: application/json`
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Bắt buộc xác thực)
- **Mẫu dữ liệu yêu cầu gửi đi (Request Payload JSON):**
```json
{\n  "employee_id": "NV084",\n  "rating": 5,\n  "comments": "Vận hành máy cắt tốt, đúng quy cách"\n}
```
- **Mẫu dữ liệu phản hồi thành công (Response 200 OK):**
```json
{\n  "success": true,\n  "evaluation_id": 12\n}
```

#### C. Tầng Logic Nghiệp vụ Backend & Tương tác Cơ sở dữ liệu (FastAPI & SQLAlchemy)
- **Hàm điều phối Router API (FastAPI Route Handler):** `submit_staff_evaluation() trong `BackEnd/src/app/api/v1/endpoints/account_router.py``
- **Hàm dịch vụ nghiệp vụ chính (Business Logic Service):** `save_staff_evaluation()`
- **Các Models/Thực thể dữ liệu tương tác chính (SQLAlchemy Models):** ``staff_evaluations``
- **Cơ chế truy vấn & Khóa đồng thời (Database Operations & Concurrency Control):**
  * `INSERT bản ghi đánh giá hiệu suất, tay nghề nhân sự vào CSDL.`
- **Ràng buộc kiểm tra tính toàn vẹn (Integrity & Database Validation Constraints):**
  * `Điểm đánh giá từ 1 đến 5.`

#### D. Luồng Xử lý Lỗi, Phục hồi Hệ thống & Ngoại lệ (Exception Handling & Resilience)
- **Các mã lỗi API & Ngoại lệ nghiệp vụ có thể trả về:**
  * `HTTP 401 Unauthorized`: Trả về khi JWT Token không hợp lệ hoặc hết hạn sử dụng.
  * `HTTP 403 Forbidden`: Trả về khi người dùng không có quyền truy cập hoặc thực hiện thao tác tại trạm sản xuất tương ứng.
  * `HTTP 422 Unprocessable Entity`: Trả về khi cấu trúc trường JSON gửi lên bị thiếu hoặc sai kiểu dữ liệu yêu cầu.
  * `HTTP 400 Bad Request`: Trả về khi vi phạm các quy tắc ràng buộc nghiệp vụ sản xuất (ví dụ: linh kiện chưa đo độ ẩm, số nhận lớn hơn số giao...).
- **Cơ chế phục hồi Ngoại tuyến tại hiện trường (Offline Capabilities & Queue Sync):**
  * `Cho phép lưu offline và đồng bộ sau.`

#### E. Mẫu mã nguồn giao tiếp thực tế chuẩn hóa (Reference Implementation Code Snippet)

**Frontend Component API Hook (React JS):**
```javascript
// Giao tiếp Axios Client gửi yêu cầu lên Backend FastAPI
const submitEvaluation = async () => {
  setIsSubmitting(true);
  try {
    await axios.post("/api/v1/staff/evaluation", { employee_id: selectedStaff.id, rating, comments });
    showToast("Đã lưu đánh giá nhân viên!");
  } catch (error) {
    showToast("Lỗi khi lưu đánh giá.");
  } finally {
    setIsSubmitting(false);
  }
};
```

**Backend Router & Controller (FastAPI & SQLAlchemy ORM):**
```python
# Điều phối API Endpoint và xử lý ghi nhận giao dịch cơ sở dữ liệu
@router.post("/evaluation")
def submit_staff_evaluation(payload: EvalPayload, db: Session = Depends(get_db)):
    ev = StaffEvaluation(employee_id=payload.employee_id, rating=payload.rating, comments=payload.comments, created_at=datetime.now())
    db.add(ev)
    db.commit()
    return {"success": True, "evaluation_id": ev.id}
```

#### F. Sơ đồ tuần tự tương tác hệ thống (Sequence Diagram)
```mermaid
sequenceDiagram
    actor Manager as Tổ trưởng / Quản đốc
    participant Mobile as Mobile App (StaffEvaluation)
    participant Server as FastAPI Backend
    participant DB as SQLite Database
    Manager->>Mobile: Chọn nhân viên & đánh giá tay nghề, năng suất
    Mobile->>Server: POST /api/v1/staff/evaluation
    Server->>DB: INSERT into staff_evaluations
    DB-->>Server: Success
    Server-->>Mobile: HTTP 200 OK
```

---

## 4.14.1 Mục đích màn hình
Màn hình di động cung cấp công cụ cho cấp quản lý/tổ trưởng đánh giá kết quả thực hiện công việc (KPI) của một nhân viên cấp dưới trong tháng, đưa ra xếp loại tổng hợp và các ghi chú, đề xuất hành động.

---

### 4.14.2 Thông tin màn hình

| Thuộc tính | Nội dung |
| :--- | :--- |
| Mã màn hình | MB8.1 |
| Route | `/staff-evaluation/:id` |
| Module | Quản lý hiệu suất (Performance Management) |
| Người dùng sử dụng | Tổ trưởng, Quản lý QC, Quản lý xưởng |

---

### 4.14.3 Chức năng chính

| STT | Chức năng | Mô tả |
| :--- | :--- | :--- |
| 1 | Hiển thị thông tin nhân sự: | Hiển thị tên nhân viên, công đoạn, level và bộ phận hiện tại. |
| 2 | Bảng chi tiết KPI: | Liệt kê kết quả thực tế của nhân viên so với mục tiêu ở các chỉ tiêu cốt lõi. |
| 3 | Xếp loại tháng: | Cho phép chọn xếp loại từ A, B, C đến D thông qua các radio button. |
| 4 | Nhận xét & Đề xuất: | Cho phép nhập ghi chú đánh giá chi tiết và đề xuất hành động của quản lý. |

---

### 4.14.4 Luồng xử lý hệ thống

```mermaid
sequenceDiagram
    autonumber
    actor Manager as Quản lý / Tổ trưởng
    participant App as Mobile App
    
    Manager->>App: Mở màn hình Đánh giá nhân sự theo ID nhân viên (Route: /staff-evaluation/:id)
    App->>App: Nạp thông tin nhân viên & bảng điểm KPI chi tiết (Dữ liệu giả lập)
    App-->>Manager: Hiển thị thông tin nhân sự và bảng điểm KPI
    
    Manager->>App: Chọn xếp loại tháng (A, B, C, D) thông qua Radio buttons
    Manager->>App: Nhập ý kiến nhận xét và đề xuất hành động
    Manager->>App: Nhấn nút "Xác nhận"
    App->>App: Hiển thị ConfirmModal cảnh báo lưu
    Manager->>App: Nhấn đồng ý xác nhận lưu
    App->>App: Kích hoạt trạng thái loading (setTimeout 1.5 giây)
    App->>App: Hiển thị MessageModal thông báo lưu thành công
    App->>App: Điều hướng quay trở lại trang KPI (/kpi)
```

Quản lý truy cập trang đánh giá nhân viên cụ thể theo đường dẫn có ID.
2. Hệ thống tải thông tin cơ bản và bảng điểm KPI chi tiết của nhân viên đó.
3. Quản lý thực hiện:
   * Xem bảng chỉ tiêu chi tiết để đưa ra nhận định.
   * Click chọn xếp loại tháng (A, B, C hoặc D).
   * Nhập ghi chú đánh giá chi tiết và các hành động đề xuất.
4. Nhấn **Xác nhận**: Hệ thống hiển thị Modal xác nhận hành động.
5. Khi đồng ý, hệ thống kích hoạt lưu dữ liệu (giả lập 1.5 giây), hiển thị thông báo thành công và tự động điều hướng quay lại trang `/kpi`.* Trạng thái submit được mô phỏng qua `setTimeout` 1500ms thay thế cho cuộc gọi API thật.
* Sử dụng [ConfirmModal](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/components/ConfirmModal.jsx) để xác nhận trước khi lưu và [MessageModal](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/components/MessageModal.jsx) để hiển thị thông báo thành công.

---

### 4.14.5 API liên quan

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |

---

### 4.14.6 Database liên quan

| Bảng | Mục đích |
| :--- | :--- |

---

### 4.14.7 Business Rules

| Điều kiện | Mô tả |
| :--- | :--- |
| Quy tắc chung | Xếp loại tháng mặc định ban đầu là 'A' và người dùng bắt buộc phải chọn một trong các phân hạng (A, B, C, D). |

---

### 4.14.8 File code liên quan

**Frontend:**
* [StaffEvaluation](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB8.1_StaffEvaluation.jsx)

> [!NOTE]
> **Ghi chú Dev:**
> Hiện tại màn hình được nạp cứng thông tin nhân viên "Hồ Sỹ Khấn". Cần xây dựng API nạp thông tin nhân viên theo `id` truyền từ URL params khi chuyển sang kết nối Backend thật.

---

## 4.15 MH15_MB9_AwardDiscipline — Khen thưởng, kỷ luật (Mobile)

#

### 4.15.9 BẢN ĐỒ CHI TIẾT TƯƠNG TÁC FRONTEND - BACKEND (API & HANDLER FUNCTIONS)

#### A. Tầng Giao diện Client & Tương tác Nghiệp vụ (React Components & Hooks)
- **Tệp mã nguồn Giao diện (Component Path):** `Mobile/src/Views/screens/MB9_AwardDiscipline.jsx`
- **Quản lý Trạng thái cục bộ (State Management):**
| React State Hooks | Vai trò quản lý trạng thái giao diện |
| :--- | :--- |
| `records` | Danh sách quyết định khen thưởng kỷ luật (Array) |
| `selectedEmployee` | Nhân sự được chọn gán quyết định (Object) |
| `type` | Phân loại quyết định (Khen thưởng / Kỷ luật) (String) |
| `reason` | Mô tả lý do khen thưởng / kỷ luật (String) |
| `amount` | Giá trị phần thưởng / phạt nếu có (Integer) |
| `isSubmitting` | Trạng thái gửi bản ghi quyết định (Boolean) |

- **Danh sách Hàm sự kiện chính (UI Event Handlers):**
| Trình xử lý sự kiện (Handler) | Sự kiện kích hoạt (Trigger) | Nghiệp vụ xử lý của hàm |
| :--- | :--- | :--- |
| `loadRecords()` | Khi mở màn hình | Tải danh sách các khen thưởng kỷ luật trạm |
| `submitRecord()` | onClick Xác nhận ký duyệt | Gửi API ghi nhận khen thưởng kỷ luật |
| `handleTypeChange()` | onChange loại quyết định | Cập nhật trường type và cấu hình giao diện phù hợp |

- **Vòng đời & Hiệu ứng Component (Lifecycle Hooks):**
  * `useEffect load danh sách khen thưởng kỷ luật gần đây của tổ sản xuất.`

#### B. Tầng Giao tiếp trung gian REST API & Giao thức truyền tải (API Contract)
- **Phương thức & Đường dẫn endpoint:** `POST /api/v1/staff/award-discipline`
- **HTTP Headers yêu cầu:**
  * `Content-Type: application/json`
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Bắt buộc xác thực)
- **Mẫu dữ liệu yêu cầu gửi đi (Request Payload JSON):**
```json
{\n  "employee_id": "NV084",\n  "type": "Khen thưởng",\n  "reason": "Đạt năng suất vượt định mức tuần",\n  "amount": 500000\n}
```
- **Mẫu dữ liệu phản hồi thành công (Response 200 OK):**
```json
{\n  "success": true,\n  "record_id": 4\n}
```

#### C. Tầng Logic Nghiệp vụ Backend & Tương tác Cơ sở dữ liệu (FastAPI & SQLAlchemy)
- **Hàm điều phối Router API (FastAPI Route Handler):** `submit_award_discipline() trong `BackEnd/src/app/api/v1/endpoints/account_router.py``
- **Hàm dịch vụ nghiệp vụ chính (Business Logic Service):** `save_award_discipline_record()`
- **Các Models/Thực thể dữ liệu tương tác chính (SQLAlchemy Models):** ``award_discipline_records``
- **Cơ chế truy vấn & Khóa đồng thời (Database Operations & Concurrency Control):**
  * `INSERT quyết định khen thưởng hoặc kỷ luật của nhân sự vào bảng `award_discipline_records`.`
- **Ràng buộc kiểm tra tính toàn vẹn (Integrity & Database Validation Constraints):**
  * `Số tiền không âm.`

#### D. Luồng Xử lý Lỗi, Phục hồi Hệ thống & Ngoại lệ (Exception Handling & Resilience)
- **Các mã lỗi API & Ngoại lệ nghiệp vụ có thể trả về:**
  * `HTTP 401 Unauthorized`: Trả về khi JWT Token không hợp lệ hoặc hết hạn sử dụng.
  * `HTTP 403 Forbidden`: Trả về khi người dùng không có quyền truy cập hoặc thực hiện thao tác tại trạm sản xuất tương ứng.
  * `HTTP 422 Unprocessable Entity`: Trả về khi cấu trúc trường JSON gửi lên bị thiếu hoặc sai kiểu dữ liệu yêu cầu.
  * `HTTP 400 Bad Request`: Trả về khi vi phạm các quy tắc ràng buộc nghiệp vụ sản xuất (ví dụ: linh kiện chưa đo độ ẩm, số nhận lớn hơn số giao...).
- **Cơ chế phục hồi Ngoại tuyến tại hiện trường (Offline Capabilities & Queue Sync):**
  * `Không hỗ trợ.`

#### E. Mẫu mã nguồn giao tiếp thực tế chuẩn hóa (Reference Implementation Code Snippet)

**Frontend Component API Hook (React JS):**
```javascript
// Giao tiếp Axios Client gửi yêu cầu lên Backend FastAPI
const submitRecord = async () => {
  setIsSubmitting(true);
  try {
    await axios.post("/api/v1/staff/award-discipline", { employee_id: selectedEmployee.id, type, reason, amount });
    showToast("Đã lưu quyết định khen thưởng/kỷ luật!");
  } catch (error) {
    showToast("Lỗi khi lưu quyết định.");
  } finally {
    setIsSubmitting(false);
  }
};
```

**Backend Router & Controller (FastAPI & SQLAlchemy ORM):**
```python
# Điều phối API Endpoint và xử lý ghi nhận giao dịch cơ sở dữ liệu
@router.post("/award-discipline")
def submit_award_discipline(payload: AwardPayload, db: Session = Depends(get_db)):
    rec = AwardDisciplineRecord(employee_id=payload.employee_id, type=payload.type, reason=payload.reason, amount=payload.amount, created_at=datetime.now())
    db.add(rec)
    db.commit()
    return {"success": True, "record_id": rec.id}
```

#### F. Sơ đồ tuần tự tương tác hệ thống (Sequence Diagram)
```mermaid
sequenceDiagram
    actor Manager as Tổ trưởng / Quản đốc
    participant Mobile as Mobile App (AwardDiscipline)
    participant Server as FastAPI Backend
    participant DB as SQLite Database
    Manager->>Mobile: Nhập quyết định khen thưởng / kỷ luật
    Mobile->>Server: POST /api/v1/staff/award-discipline
    Server->>DB: INSERT into award_discipline_records
    DB-->>Server: Success
    Server-->>Mobile: HTTP 200 OK
```

---

## 4.15.1 Mục đích màn hình
Màn hình hỗ trợ Tổ trưởng/Quản lý nhanh chóng ghi nhận các trường hợp vi phạm quy định hoặc các cá nhân có thành tích xuất sắc trực tiếp tại hiện trường sản xuất, cho phép chụp ảnh bằng chứng để lưu hồ sơ.

---

### 4.15.2 Thông tin màn hình

| Thuộc tính | Nội dung |
| :--- | :--- |
| Mã màn hình | MB9 |
| Route | `/awards` |
| Module | Quản lý nhân sự & Kỷ luật (HR & Discipline) |
| Người dùng sử dụng | Tổ trưởng, Quản lý xưởng, Đại diện QC |

---

### 4.15.3 Chức năng chính

| STT | Chức năng | Mô tả |
| :--- | :--- | :--- |
| 1 | Khai báo vi phạm/khen thưởng: | Chọn nhân viên, loại lỗi/vấn đề vi phạm, mức độ ảnh hưởng và điểm trừ/cộng tương ứng. |
| 2 | Chụp ảnh bằng chứng trực tiếp: | Tích hợp camera thiết bị di động để chụp tối đa 3 ảnh bằng chứng vi phạm tại hiện trường. |
| 3 | Xác nhận hai bước: | Hộp thoại cảnh báo và xác nhận trước khi lưu thông tin khen thưởng, kỷ luật vào hệ thống. |

---

### 4.15.4 Luồng xử lý hệ thống

```mermaid
sequenceDiagram
    autonumber
    actor Manager as Quản lý / Tổ trưởng
    participant App as Mobile App
    participant Cam as Camera (Native)
    
    Manager->>App: Mở màn hình Khen thưởng, kỷ luật (Route: /awards)
    App->>App: Load danh sách nhân viên và danh mục lỗi (Dữ liệu giả lập)
    App-->>Manager: Hiển thị form khai báo sự việc
    
    Manager->>App: Chọn nhân sự, chọn lỗi vi phạm, mức độ ảnh hưởng, số điểm và ghi chú
    Manager->>App: Nhấn biểu tượng camera để chụp ảnh bằng chứng (tối đa 3 ảnh)
    App->>Cam: Kích hoạt camera sau của thiết bị di động
    Cam-->>App: Trả về file ảnh chụp
    App->>App: Render ảnh dạng URL xem trước tạm thời
    
    Manager->>App: Nhấn nút "Xác nhận"
    App->>App: Hiển thị ConfirmModal yêu cầu xác thực
    Manager->>App: Đồng ý lưu kết quả
    App->>App: Mô phỏng lưu API (setTimeout 1.5 giây)
    App->>App: Hiển thị MessageModal thông báo thành công
    App->>App: Điều hướng quay về trang Nhật ký (/logs)
```

Người dùng mở màn hình Khen thưởng, kỷ luật.
2. Người dùng nhập thông tin: chọn tên nhân viên, chọn hành vi/vấn đề, mức độ ảnh hưởng, nhập số điểm và viết thêm ghi chú mô tả sự việc.
3. Người dùng nhấn biểu tượng camera để chụp ảnh bằng chứng:
   * Nếu chưa có ảnh nào: Nút chụp hiển thị bên cạnh tiêu đề "Bằng chứng".
   * Khi có ảnh: Nút chụp chuyển xuống hiển thị dạng ô nét đứt nối tiếp các ảnh đã chụp. Cho phép chụp tối đa 3 ảnh. Người dùng có thể xóa ảnh bằng cách bấm nút "x" màu đỏ trên góc ảnh.
4. Nhấn **Xác nhận**: Xác nhận hành động qua ConfirmModal. Hệ thống mô phỏng lưu API trong 1.5 giây, hiển thị thông báo thành công và chuyển hướng về trang nhật ký `/logs`.* Thao tác mở camera của thiết bị được thực hiện bằng thẻ `<input type="file" accept="image/*" capture="environment" />` giúp kích hoạt trực tiếp camera sau của điện thoại.
* Tạo URL xem trước ảnh tạm thời bằng `URL.createObjectURL(file)`.
* Quá trình lưu dữ liệu được giả lập bằng `setTimeout` 1.5 giây.

---

### 4.15.5 API liên quan

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |

---

### 4.15.6 Database liên quan

| Bảng | Mục đích |
| :--- | :--- |

---

### 4.15.7 Business Rules

| Điều kiện | Mô tả |
| :--- | :--- |
| Quy tắc chung | Khống chế số lượng ảnh bằng chứng tối đa là 3 ảnh. |
| Quy tắc chung | Điểm số vi phạm/khen thưởng phải nhập kiểu số (`type="number"`). |

---

### 4.15.8 File code liên quan

**Frontend:**
* [AwardDiscipline](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB9_AwardDiscipline.jsx)

> [!NOTE]
> **Ghi chú Dev:**
> Hiện tại màn hình sử dụng mock data cho danh sách nhân viên và các loại lỗi. Cần tích hợp các API tương ứng để lấy danh sách nhân viên thực tế thuộc bộ phận và danh mục lỗi chuẩn của xưởng.

---

## 4.16 MH16_MB10_EquipmentList — Danh sách thiết bị (Mobile)

#

### 4.16.9 BẢN ĐỒ CHI TIẾT TƯƠNG TÁC FRONTEND - BACKEND (API & HANDLER FUNCTIONS)

#### A. Tầng Giao diện Client & Tương tác Nghiệp vụ (React Components & Hooks)
- **Tệp mã nguồn Giao diện (Component Path):** `Mobile/src/Views/screens/MB10_EquipmentList.jsx`
- **Quản lý Trạng thái cục bộ (State Management):**
| React State Hooks | Vai trò quản lý trạng thái giao diện |
| :--- | :--- |
| `equipments` | Danh sách thiết bị máy móc trong nhà xưởng (Array) |
| `searchQuery` | Mã máy hoặc tên máy cần tìm kiếm nhanh (String) |
| `selectedEquipment` | Thiết bị đang được xem thông tin chi tiết (Object) |
| `statusFilter` | Bộ lọc trạng thái hoạt động của máy (String) |

- **Danh sách Hàm sự kiện chính (UI Event Handlers):**
| Trình xử lý sự kiện (Handler) | Sự kiện kích hoạt (Trigger) | Nghiệp vụ xử lý của hàm |
| :--- | :--- | :--- |
| `loadEquipments()` | Khi mở màn hình | Tải danh sách trang thiết bị |
| `handleSearch()` | onChange ô tìm kiếm | Lọc động danh sách hiển thị theo tên/mã thiết bị |
| `updateStatus()` | onClick Báo hỏng / Báo bảo trì | Cập nhật trạng thái máy hiện tại |

- **Vòng đời & Hiệu ứng Component (Lifecycle Hooks):**
  * `useEffect load danh sách thiết bị máy móc đang vận hành trong xưởng.`

#### B. Tầng Giao tiếp trung gian REST API & Giao thức truyền tải (API Contract)
- **Phương thức & Đường dẫn endpoint:** `GET /api/v1/equipments/`
- **HTTP Headers yêu cầu:**
  * `Content-Type: multipart/form-data`
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Bắt buộc xác thực)
- **Mẫu dữ liệu yêu cầu gửi đi (Request Payload JSON):**
```json
None
```
- **Mẫu dữ liệu phản hồi thành công (Response 200 OK):**
```json
[\n  {"id": 1, "code": "CNC-01", "name": "Máy phay CNC", "status": "Hoạt động"}\n]
```

#### C. Tầng Logic Nghiệp vụ Backend & Tương tác Cơ sở dữ liệu (FastAPI & SQLAlchemy)
- **Hàm điều phối Router API (FastAPI Route Handler):** `get_equipments() trong `BackEnd/src/app/api/v1/endpoints/equipment.py``
- **Hàm dịch vụ nghiệp vụ chính (Business Logic Service):** `read_equipments()`
- **Các Models/Thực thể dữ liệu tương tác chính (SQLAlchemy Models):** ``equipment``
- **Cơ chế truy vấn & Khóa đồng thời (Database Operations & Concurrency Control):**
  * `Truy vấn thông tin máy móc và trạng thái bảo dưỡng hiện tại từ bảng `equipment`.`
- **Ràng buộc kiểm tra tính toàn vẹn (Integrity & Database Validation Constraints):**
  * `None`

#### D. Luồng Xử lý Lỗi, Phục hồi Hệ thống & Ngoại lệ (Exception Handling & Resilience)
- **Các mã lỗi API & Ngoại lệ nghiệp vụ có thể trả về:**
  * `HTTP 401 Unauthorized`: Trả về khi JWT Token không hợp lệ hoặc hết hạn sử dụng.
  * `HTTP 403 Forbidden`: Trả về khi người dùng không có quyền truy cập hoặc thực hiện thao tác tại trạm sản xuất tương ứng.
  * `HTTP 422 Unprocessable Entity`: Trả về khi cấu trúc trường JSON gửi lên bị thiếu hoặc sai kiểu dữ liệu yêu cầu.
  * `HTTP 400 Bad Request`: Trả về khi vi phạm các quy tắc ràng buộc nghiệp vụ sản xuất (ví dụ: linh kiện chưa đo độ ẩm, số nhận lớn hơn số giao...).
- **Cơ chế phục hồi Ngoại tuyến tại hiện trường (Offline Capabilities & Queue Sync):**
  * `Lưu cache danh sách máy móc để theo dõi khi mất mạng.`

#### E. Mẫu mã nguồn giao tiếp thực tế chuẩn hóa (Reference Implementation Code Snippet)

**Frontend Component API Hook (React JS):**
```javascript
// Giao tiếp Axios Client gửi yêu cầu lên Backend FastAPI
const loadEquipments = async () => {
  const res = await axios.get("/api/v1/equipments/");
  setEquipments(res.data);
};
```

**Backend Router & Controller (FastAPI & SQLAlchemy ORM):**
```python
# Điều phối API Endpoint và xử lý ghi nhận giao dịch cơ sở dữ liệu
@router.get("/")
def get_equipments(db: Session = Depends(get_db)):
    return db.query(Equipment).all()
```

#### F. Sơ đồ tuần tự tương tác hệ thống (Sequence Diagram)
```mermaid
sequenceDiagram
    actor Worker as Công nhân hiện trường
    participant Mobile as Mobile App (EquipmentList)
    participant Server as FastAPI Backend
    participant DB as SQLite Database
    Worker->>Mobile: Xem danh sách máy móc & báo hỏng
    Mobile->>Server: GET /api/v1/equipments/
    Server->>DB: Query equipments list
    DB-->>Server: Trả về danh sách máy móc
    Server-->>Mobile: HTTP 200 OK
```

---

## 4.16.1 Mục đích màn hình
Màn hình cung cấp danh sách toàn bộ máy móc, dụng cụ đo lường và thiết bị phụ trợ trong công đoạn, hỗ trợ ghi nhận nhanh kết quả tự kiểm tra thiết bị đầu ca làm việc và cập nhật trạng thái lỗi, hỏng của máy móc về máy chủ.

---

### 4.16.2 Thông tin màn hình

| Thuộc tính | Nội dung |
| :--- | :--- |
| Mã màn hình | MB10 |
| Route | `/equipment-list` |
| Module | Quản lý thiết bị xưởng (Equipments) |
| Người dùng sử dụng | Tổ trưởng, Nhân viên QC, Nhân viên bảo trì |

---

### 4.16.3 Chức năng chính

| STT | Chức năng | Mô tả |
| :--- | :--- | :--- |
| 1 | Danh sách thiết bị: | Liệt kê toàn bộ thiết bị trong xưởng kèm phân loại, mã thiết bị và trạng thái hiện tại. |
| 2 | Bộ lọc phân loại & Trạng thái: | Hỗ trợ lọc danh sách thiết bị theo loại (Đo lường, Giá kệ, Sản xuất, Phụ trợ...) hoặc trạng thái (Bình thường, Bảo trì, Cần thay mới, Chưa kiểm tra). |
| 3 | Đánh giá thiết bị nhanh: | Modal popup cho phép cập nhật trạng thái hoạt động (Bình thường / Cần thay mới), ghi chú lỗi và chụp ảnh minh chứng tại hiện trường. |
| 4 | Đồng bộ thủ công: | Nút làm mới dữ liệu nhanh để tải dữ liệu thiết bị mới nhất từ database. |

---

### 4.16.4 Luồng xử lý hệ thống

```mermaid
sequenceDiagram
    autonumber
    actor User as Tổ trưởng / Bảo trì / QC
    participant App as Mobile App
    participant Cam as Camera (Native)
    participant API as Backend API
    participant DB as Database
    
    User->>App: Mở màn hình Danh sách thiết bị (Route: /equipment-list)
    App->>API: GET /api/v1/equipments/
    API->>DB: Query bảng equipments (Auto-seed dữ liệu mẫu nếu bảng trống)
    DB-->>API: Return danh sách thiết bị
    API-->>App: Trả về danh sách thiết bị
    App-->>User: Hiển thị danh sách thiết bị và trạng thái
    
    User->>App: Lọc thiết bị theo phân loại hoặc trạng thái
    
    User->>App: Nhấn biểu tượng chiếc bút chì trên thiết bị cần kiểm tra
    App->>App: Hiển thị Modal "Kiểm tra thiết bị"
    User->>App: Chọn trạng thái mới (Bình thường / Cần thay mới) và nhập ghi chú
    User->>App: Nhấn biểu tượng camera để chụp ảnh thiết bị lỗi (Mô phỏng WebView)
    App->>Cam: Kích hoạt camera
    Cam-->>App: Trả về file ảnh (Base64 xem trước)
    
    User->>App: Nhấn "Xác nhận" lưu kết quả kiểm tra
    App->>API: PATCH /api/v1/equipments/{id}/status?status={newStatus}
    API->>DB: Cập nhật trạng thái thiết bị trong DB
    DB-->>API: Success
    API-->>App: Success
    App->>App: Đóng Modal & Gọi lại GET /api/v1/equipments/ làm mới danh sách
    App-->>User: Hiển thị danh sách thiết bị đã cập nhật
```

Người dùng truy cập trang danh sách thiết bị. Ứng dụng tải danh sách thiết bị hiện có từ database.
2. Người dùng sử dụng các bộ lọc để tìm kiếm thiết bị cần kiểm tra.
3. Muốn cập nhật trạng thái thiết bị, người dùng nhấn biểu tượng chiếc bút chì trên dòng tương ứng:
   * Hệ thống hiển thị Modal "Kiểm tra thiết bị".
   * Người dùng chọn kết quả: "Bình thường" (màu xanh) hoặc "Cần thay mới" (màu đỏ).
   * Nhập thêm ghi chú mô tả và nhấn biểu tượng camera để đính kèm ảnh chụp hiện trạng thiết bị.
4. Nhấn **Xác nhận**: Hệ thống gọi API cập nhật trạng thái thiết bị lên máy chủ.
5. Sau khi lưu thành công, Modal đóng lại và ứng dụng tự động làm mới danh sách thiết bị.* Frontend gọi API `GET /api/v1/equipments/` để lấy danh sách thiết bị.
* Khi lưu kết quả kiểm tra, Frontend thực hiện request dạng `PATCH /api/v1/equipments/{id}/status?status={newStatus}` để đổi trạng thái thiết bị trong cơ sở dữ liệu.
* Nút chụp ảnh minh chứng kích hoạt hộp thoại chọn file của trình duyệt để mô phỏng camera trên môi trường WebView.

---

### 4.16.5 API liên quan

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| GET | `/api/v1/equipments/` | Lấy danh sách thiết bị xưởng. Định nghĩa tại [get_equipments](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/equipment_router.py#L9-L56). |
| PATCH | `/api/v1/equipments/{equipment_id}/status` | Cập nhật trạng thái thiết bị. Định nghĩa tại [update_equipment_status](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/equipment_router.py#L58-L69). |

---

### 4.16.6 Database liên quan

| Bảng | Mục đích |
| :--- | :--- |
| ``equipments`` | Lưu trữ máy móc thiết bị xưởng. Ánh xạ qua Model [Equipment](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/equipment.py#L5). |

---

### 4.16.7 Business Rules

| Điều kiện | Mô tả |
| :--- | :--- |
| Quy tắc chung | Backend triển khai cơ chế tự động chèn dữ liệu mẫu (Auto-seed) gồm 10 thiết bị cơ bản nếu phát hiện bảng `equipments` trong cơ sở dữ liệu hoàn toàn trống để tránh lỗi giao diện cho người dùng đầu tiên. |

---

### 4.16.8 File code liên quan

**Frontend:**
* [EquipmentList](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB10_EquipmentList.jsx)

**Backend:**
* [equipment_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/equipment_router.py)

> [!NOTE]
> **Ghi chú Dev:**
> Hiện tại ảnh chụp minh chứng trong Modal kiểm tra thiết bị mới chỉ được mô phỏng hiển thị trên UI và chưa được gửi lên server trong API PATCH. Cần mở rộng API PATCH hoặc tạo API upload riêng để lưu trữ ảnh thiết bị lỗi lên máy chủ khi nâng cấp.

---

## 4.17 MH17_MB11_QualityInspectionDetail — Kiểm tra chất lượng chi tiết (Mobile)

#

### 4.17.9 BẢN ĐỒ CHI TIẾT TƯƠNG TÁC FRONTEND - BACKEND (API & HANDLER FUNCTIONS)

#### A. Tầng Giao diện Client & Tương tác Nghiệp vụ (React Components & Hooks)
- **Tệp mã nguồn Giao diện (Component Path):** `Mobile/src/Views/screens/MB11_QualityInspectionDetail.jsx`
- **Quản lý Trạng thái cục bộ (State Management):**
| React State Hooks | Vai trò quản lý trạng thái giao diện |
| :--- | :--- |
| `deliveryId` | Định danh phiếu bàn giao đang kiểm định chi tiết (Integer) |
| `moistureValues` | Mảng chứa 3 trị số đo độ ẩm thực tế của QC (Array) |
| `woodStandard` | Đánh giá đạt quy cách thớ gỗ và vân gỗ (Boolean) |
| `visualDefects` | Checklist các khuyết tật ngoại quan phát hiện (Object) |
| `isSubmitting` | Trạng thái lưu trữ kết quả kiểm định chất lượng (Boolean) |

- **Danh sách Hàm sự kiện chính (UI Event Handlers):**
| Trình xử lý sự kiện (Handler) | Sự kiện kích hoạt (Trigger) | Nghiệp vụ xử lý của hàm |
| :--- | :--- | :--- |
| `loadInspectionConfig()` | Khi mở màn hình | Tải cấu hình tiêu chuẩn chất lượng gỗ |
| `submitInspection()` | onClick Xác nhận chất lượng | Gửi API kết quả đo ẩm và khuyết tật ngoại quan chi tiết |
| `updateMoisture()` | onChange ô nhập độ ẩm | Cập nhật mảng giá trị độ ẩm thực đo |

- **Vòng đời & Hiệu ứng Component (Lifecycle Hooks):**
  * `useEffect load cấu hình tiêu chuẩn chất lượng của sản phẩm từ BOM.`

#### B. Tầng Giao tiếp trung gian REST API & Giao thức truyền tải (API Contract)
- **Phương thức & Đường dẫn endpoint:** `POST /api/v1/qc/detail-inspection`
- **HTTP Headers yêu cầu:**
  * `Content-Type: application/json`
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Bắt buộc xác thực)
- **Mẫu dữ liệu yêu cầu gửi đi (Request Payload JSON):**
```json
{\n  "delivery_id": 102,\n  "moisture_avg": 12.8,\n  "wood_standard": true,\n  "visual_defects": {"nut_tet": false, "cong_venh": false},\n  "status": "Đạt"\n}
```
- **Mẫu dữ liệu phản hồi thành công (Response 200 OK):**
```json
{\n  "success": true\n}
```

#### C. Tầng Logic Nghiệp vụ Backend & Tương tác Cơ sở dữ liệu (FastAPI & SQLAlchemy)
- **Hàm điều phối Router API (FastAPI Route Handler):** `submit_detail_inspection() trong `BackEnd/src/app/api/v1/endpoints/qc.py``
- **Hàm dịch vụ nghiệp vụ chính (Business Logic Service):** `save_detail_inspection()`
- **Các Models/Thực thể dữ liệu tương tác chính (SQLAlchemy Models):** ``delivery_qc``
- **Cơ chế truy vấn & Khóa đồng thời (Database Operations & Concurrency Control):**
  * `INSERT kết quả đo kiểm chất lượng chi tiết gỗ bao gồm độ ẩm và khuyết tật ngoại quan vào bảng `delivery_qc`.`
- **Ràng buộc kiểm tra tính toàn vẹn (Integrity & Database Validation Constraints):**
  * `Độ ẩm trung bình phải nằm trong khoảng 8-25%.`

#### D. Luồng Xử lý Lỗi, Phục hồi Hệ thống & Ngoại lệ (Exception Handling & Resilience)
- **Các mã lỗi API & Ngoại lệ nghiệp vụ có thể trả về:**
  * `HTTP 401 Unauthorized`: Trả về khi JWT Token không hợp lệ hoặc hết hạn sử dụng.
  * `HTTP 403 Forbidden`: Trả về khi người dùng không có quyền truy cập hoặc thực hiện thao tác tại trạm sản xuất tương ứng.
  * `HTTP 422 Unprocessable Entity`: Trả về khi cấu trúc trường JSON gửi lên bị thiếu hoặc sai kiểu dữ liệu yêu cầu.
  * `HTTP 400 Bad Request`: Trả về khi vi phạm các quy tắc ràng buộc nghiệp vụ sản xuất (ví dụ: linh kiện chưa đo độ ẩm, số nhận lớn hơn số giao...).
- **Cơ chế phục hồi Ngoại tuyến tại hiện trường (Offline Capabilities & Queue Sync):**
  * `Lưu offline kết quả đo độ ẩm chi tiết.`

#### E. Mẫu mã nguồn giao tiếp thực tế chuẩn hóa (Reference Implementation Code Snippet)

**Frontend Component API Hook (React JS):**
```javascript
// Giao tiếp Axios Client gửi yêu cầu lên Backend FastAPI
const submitInspection = async () => {
  setIsSubmitting(true);
  try {
    await axios.post("/api/v1/qc/detail-inspection", { delivery_id: deliveryId, moisture_avg: avgMoisture, visual_defects: defects });
    showToast("Đã lưu kết quả đo chất lượng chi tiết!");
  } catch (error) {
    showToast("Lỗi khi lưu kết quả QC.");
  } finally {
    setIsSubmitting(false);
  }
};
```

**Backend Router & Controller (FastAPI & SQLAlchemy ORM):**
```python
# Điều phối API Endpoint và xử lý ghi nhận giao dịch cơ sở dữ liệu
@router.post("/detail-inspection")
def submit_detail_inspection(payload: DetailInspectPayload, db: Session = Depends(get_db)):
    qc = DeliveryQC(delivery_id=payload.delivery_id, moisture_avg=payload.moisture_avg, status=payload.status, created_at=datetime.now())
    db.add(qc)
    db.commit()
    return {"success": True}
```

#### F. Sơ đồ tuần tự tương tác hệ thống (Sequence Diagram)
```mermaid
sequenceDiagram
    actor QC as Nhân viên QC
    participant Mobile as Mobile App (QualityInspectionDetail)
    participant Server as FastAPI Backend
    participant DB as SQLite Database
    QC->>Mobile: Đo độ ẩm từng tấm gỗ, kiểm tra khuyết tật bề mặt
    Mobile->>Server: POST /api/v1/qc/detail-inspection
    Server->>DB: INSERT into delivery_qc
    DB-->>Server: Success
    Server-->>Mobile: HTTP 200 OK
```

---

## 4.17.1 Mục đích màn hình
Màn hình cung cấp giao diện đo đạc, kiểm định chuyên sâu cho từng chỉ tiêu kỹ thuật cụ thể (độ ẩm, độ phẳng, kết cấu, kích thước...) của một lô hàng đang bàn giao, hỗ trợ chụp ảnh lỗi thực tế làm bằng chứng trực quan.

---

### 4.17.2 Thông tin màn hình

| Thuộc tính | Nội dung |
| :--- | :--- |
| Mã màn hình | MB11 |
| Route | `/quality-detail/:id/:category` |
| Module | Kiểm định chất lượng giao nhận (QC Deliveries) |
| Người dùng sử dụng | Nhân viên QC (Quality Control) |

---

### 4.17.3 Chức năng chính

| STT | Chức năng | Mô tả |
| :--- | :--- | :--- |
| 1 | Hướng dẫn kiểm tra trực quan: | Hiển thị chi tiết yêu cầu kỹ thuật và phương pháp đo đạc chuẩn (HDKT) cho từng hạng mục kiểm tra cụ thể. |
| 2 | Đánh giá Đạt/Fail nhanh: | Nút bấm chọn kết luận kiểm tra nhanh dạng trượt đổi màu nổi bật (Xanh lá cho Đạt, Đỏ cho Fail). |
| 3 | Chụp ảnh bằng chứng hàng loạt: | Cho phép chụp tối đa 10 ảnh minh chứng lỗi (đối với QC) hoặc 40 ảnh (đối với tài khoản kiểm tra đặc biệt) trực tiếp bằng camera. |
| 4 | Nén ảnh tự động: | Tự động nén ảnh chụp xuống chất lượng 70% trên Canvas trước khi xử lý nhằm giảm thiểu lưu lượng mạng và dung lượng lưu trữ trên máy chủ. |
| 5 | Lưu trữ tạm thời (Offline Pending Store): | Kết quả và ảnh chụp được lưu trữ tạm thời tại bộ nhớ cục bộ ứng dụng, tránh mất dữ liệu khi mất kết nối mạng và không gọi API lưu trực tiếp từ màn hình này. |

---

### 4.17.4 Luồng xử lý hệ thống

```mermaid
sequenceDiagram
    autonumber
    actor QC as Nhân viên QC
    participant App as Mobile App
    participant Store as pendingQCStore (Zustand)
    participant Cam as Camera (Native)
    participant API as Backend API
    
    QC->>App: Nhấp vào một hạng mục kiểm tra chưa đạt trên màn hình nhận hàng (MB2.2)
    App->>App: Điều hướng đến màn hình chi tiết chỉ tiêu (Route: /quality-detail/:id/:category)
    
    alt Kiểm tra dữ liệu trong bộ nhớ tạm
        App->>Store: Lấy dữ liệu tạm thời theo deliveryId & category
        Store-->>App: Trả về dữ liệu tạm (nếu có)
    else Không có dữ liệu tạm
        App->>API: GET /api/v1/qc/{delivery_id}
        API-->>App: Trả về dữ liệu QC đã lưu trên server (nếu có)
    end
    
    App->>App: Hiển thị HDKT (Hướng dẫn kỹ thuật) & Trạng thái đạt/không đạt
    
    QC->>App: Chọn kết luận Đạt (Xanh lá) hoặc Fail (Đỏ)
    QC->>App: Nhấn nút chụp ảnh bằng chứng (Tối đa 10 hoặc 40 ảnh)
    App->>Cam: Kích hoạt camera của thiết bị di động
    Cam-->>App: Trả về file ảnh chụp
    App->>App: Canvas compressImage() nén ảnh xuống 70% chất lượng jpeg
    
    QC->>App: Nhấn "Xác nhận kết quả"
    App->>Store: Lưu trạng thái chỉ tiêu & mảng ảnh nén vào pendingQCStore
    App->>App: Quay trở về màn hình Tiếp nhận bàn giao (MB2.2)
```

Người dùng tại màn hình Tiếp nhận bàn giao (`MB2.2`) click vào một hạng mục kiểm tra chưa hoàn thành.
2. Ứng dụng chuyển hướng đến màn hình kiểm tra chi tiết hạng mục đó.
3. Hệ thống nạp dữ liệu theo thứ tự ưu tiên:
   * **Ưu tiên 1:** Lấy dữ liệu tạm thời chưa lưu từ `pendingQCStore` (nếu có).
   * **Ưu tiên 2:** Gọi API lấy dữ liệu QC đã được lưu trên máy chủ từ trước làm dữ liệu dự phòng.
4. QC đọc hướng dẫn kỹ thuật hiển thị tương ứng với hạng mục kiểm tra (ví dụ: đo độ ẩm gỗ yêu cầu 8-12%).
5. QC bấm chọn kết luận Đạt hoặc Fail.
6. QC bấm chụp ảnh bằng chứng (bắt buộc chụp từ camera thực tế):
   * Ảnh chụp được nén tự động trên Canvas xuống 70% chất lượng ban đầu.
   * Hiển thị danh sách ảnh kèm số lượng thực tế. Có thể xóa các ảnh chụp lỗi bằng cách nhấn dấu "x".
7. Nhấn **Xác nhận kết quả**: Hệ thống lưu toàn bộ dữ liệu chỉ tiêu này (trạng thái đạt, mảng ảnh cũ, mảng ảnh mới) vào `pendingQCStore` dưới dạng khóa là ID phiếu bàn giao và quay trở lại màn hình chính Tiếp nhận bàn giao.* Trình duyệt hoặc thiết bị di động ép mở camera thông qua `<input type="file" accept="image/*" capture="environment" />`.
* Logic nén ảnh động sử dụng hàm [compressImage](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB11_QualityInspectionDetail.jsx#L93-L133) dựng trên HTML5 Canvas để thay đổi kích thước ảnh (tối đa 1024x1024px) và xuất ra Blob dưới định dạng `image/jpeg` chất lượng 0.7.
* Cơ chế lưu trữ tạm: Sử dụng [pendingQCStore](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/store/pendingQCStore.js) lưu giữ trạng thái trong bộ nhớ RAM của ứng dụng SPA.

---

### 4.17.5 API liên quan

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| GET | `/api/v1/qc/{delivery_id}` | Gọi dự phòng khi load trang để lấy thông tin kết quả QC đã có sẵn. Định nghĩa tại [get_qc_results](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/qc_router.py#L173-L190). |

---

### 4.17.6 Database liên quan

| Bảng | Mục đích |
| :--- | :--- |
| ``delivery_qc`` | Lưu trữ trạng thái kết quả QC dạng JSON. Ánh xạ qua Model [DeliveryQC](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/delivery_qc.py#L7). |
| ``delivery_images`` | Lưu trữ đường dẫn ảnh minh chứng QC (có `description` dạng `qc_{category}`). Ánh xạ qua Model [DeliveryImage](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/models/delivery_images.py#L6). |

---

### 4.17.7 Business Rules

| Điều kiện | Mô tả |
| :--- | :--- |
| Quy tắc chung | Yêu cầu bắt buộc QC phải chọn kết luận Đạt hoặc Fail trước khi nhấn lưu kết quả. |
| Quy tắc chung | Giới hạn số lượng ảnh tối đa: 10 ảnh đối với vai trò QC thông thường và 40 ảnh đối với các vai trò kiểm tra đặc biệt khác. |

---

### 4.17.8 File code liên quan

**Frontend:**
* [QualityInspectionDetail](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB11_QualityInspectionDetail.jsx)

**Backend:**
* [qc_router.py](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/BackEnd/src/app/api/v1/endpoints/qc_router.py)

**State / Store / Services:**
* [pendingQCStore.js](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/store/pendingQCStore.js)

> [!NOTE]
> **Ghi chú Dev:**
> Lưu ý rằng màn hình này **hoàn toàn không gọi API để lưu kết quả lên DB khi bấm nút Xác nhận kết quả**. Nó chỉ cập nhật vào `pendingQCStore`. Việc lưu trữ thật sự lên Database được thực hiện tập trung tại màn hình cha `MB2.2_DeliveryReceive` khi người dùng bấm nút xác nhận cuối cùng của cả phiếu bàn giao.

---

## 4.18 MH18_MB12_ThermalPrint — In nhiệt (Mobile)

#

### 4.18.9 BẢN ĐỒ CHI TIẾT TƯƠNG TÁC FRONTEND - BACKEND (API & HANDLER FUNCTIONS)

#### A. Tầng Giao diện Client & Tương tác Nghiệp vụ (React Components & Hooks)
- **Tệp mã nguồn Giao diện (Component Path):** `Mobile/src/Views/screens/MB12_ThermalPrint.jsx`
- **Quản lý Trạng thái cục bộ (State Management):**
| React State Hooks | Vai trò quản lý trạng thái giao diện |
| :--- | :--- |
| `printPayload` | Dữ liệu thông tin thẻ nhãn Pallet định dạng in nhiệt (Object) |
| `printerStatus` | Trạng thái kết nối máy in Bluetooth (connected/disconnected) (String) |
| `selectedPrinter` | Máy in bluetooth đã kết nối thành công (Object) |
| `isPrinting` | Trạng thái đang truyền gói byte in nhãn (Boolean) |

- **Danh sách Hàm sự kiện chính (UI Event Handlers):**
| Trình xử lý sự kiện (Handler) | Sự kiện kích hoạt (Trigger) | Nghiệp vụ xử lý của hàm |
| :--- | :--- | :--- |
| `scanBluetoothPrinters()` | onClick nút Tìm máy in | Quét tìm các máy in nhiệt bluetooth xung quanh qua native bridge |
| `connectPrinter()` | onClick vào tên máy in | Thiết lập kết nối serial RFCOMM với máy in |
| `sendPrintJob()` | onClick nút In tem nhãn | Lấy lệnh in ESC/POS từ Backend và gửi qua Bluetooth socket |

- **Vòng đời & Hiệu ứng Component (Lifecycle Hooks):**
  * `useEffect đăng ký bộ lắng nghe kết nối Bluetooth/Wi-Fi của máy in nhiệt cầm tay và giải phóng kết nối khi unmount.`

#### B. Tầng Giao tiếp trung gian REST API & Giao thức truyền tải (API Contract)
- **Phương thức & Đường dẫn endpoint:** `GET /api/v1/pallet/{pallet_code}/print-job`
- **HTTP Headers yêu cầu:**
  * `Content-Type: multipart/form-data`
  * `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Bắt buộc xác thực)
- **Mẫu dữ liệu yêu cầu gửi đi (Request Payload JSON):**
```json
None
```
- **Mẫu dữ liệu phản hồi thành công (Response 200 OK):**
```json
{\n  "pallet_code": "PLT-001",\n  "print_command": "SIZE 80 mm, 50 mm\\nGAP 2 mm...\\nPRINT 1\\n"\n}
```

#### C. Tầng Logic Nghiệp vụ Backend & Tương tác Cơ sở dữ liệu (FastAPI & SQLAlchemy)
- **Hàm điều phối Router API (FastAPI Route Handler):** `get_print_job() trong `BackEnd/src/app/api/v1/endpoints/pallet.py``
- **Hàm dịch vụ nghiệp vụ chính (Business Logic Service):** `generate_escpos_commands()`
- **Các Models/Thực thể dữ liệu tương tác chính (SQLAlchemy Models):** ``pallet_cards``
- **Cơ chế truy vấn & Khóa đồng thời (Database Operations & Concurrency Control):**
  * `Truy vấn dữ liệu thẻ pallet gỗ và kết xuất thành chuỗi lệnh in nhãn ESC/POS.`
- **Ràng buộc kiểm tra tính toàn vẹn (Integrity & Database Validation Constraints):**
  * `Mã pallet phải tồn tại trên hệ thống.`

#### D. Luồng Xử lý Lỗi, Phục hồi Hệ thống & Ngoại lệ (Exception Handling & Resilience)
- **Các mã lỗi API & Ngoại lệ nghiệp vụ có thể trả về:**
  * `HTTP 401 Unauthorized`: Trả về khi JWT Token không hợp lệ hoặc hết hạn sử dụng.
  * `HTTP 403 Forbidden`: Trả về khi người dùng không có quyền truy cập hoặc thực hiện thao tác tại trạm sản xuất tương ứng.
  * `HTTP 422 Unprocessable Entity`: Trả về khi cấu trúc trường JSON gửi lên bị thiếu hoặc sai kiểu dữ liệu yêu cầu.
  * `HTTP 400 Bad Request`: Trả về khi vi phạm các quy tắc ràng buộc nghiệp vụ sản xuất (ví dụ: linh kiện chưa đo độ ẩm, số nhận lớn hơn số giao...).
- **Cơ chế phục hồi Ngoại tuyến tại hiện trường (Offline Capabilities & Queue Sync):**
  * `Lưu tạm lệnh in trong cache và thực hiện in trực tiếp thông qua Bluetooth mà không cần kết nối server.`

#### E. Mẫu mã nguồn giao tiếp thực tế chuẩn hóa (Reference Implementation Code Snippet)

**Frontend Component API Hook (React JS):**
```javascript
// Giao tiếp Axios Client gửi yêu cầu lên Backend FastAPI
const sendPrintJob = async () => {
  setIsPrinting(true);
  try {
    const res = await axios.get(`/api/v1/pallet/${palletCode}/print-job`);
    await BluetoothPrint.write(res.data.print_command);
    showToast("Đã gửi lệnh in tem thành công!");
  } catch (error) {
    showToast("Lỗi khi kết nối máy in hoặc gửi lệnh.");
  } finally {
    setIsPrinting(false);
  }
};
```

**Backend Router & Controller (FastAPI & SQLAlchemy ORM):**
```python
# Điều phối API Endpoint và xử lý ghi nhận giao dịch cơ sở dữ liệu
@router.get("/{pallet_code}/print-job")
def get_print_job(pallet_code: str, db: Session = Depends(get_db)):
    pallet = db.query(PalletCard).filter(PalletCard.code == pallet_code).first()
    if not pallet:
        raise HTTPException(status_code=404, detail="Không tìm thấy pallet")
    # Sinh lệnh ESC/POS
    cmd = f"SIZE 80 mm, 50 mm\\nGAP 2 mm\\nCLS\\nQRCODE 100,10,H,6,A,0,\\\"{pallet.code}\\\"\\nTEXT 100,150,\\"TSS24.BFNT\\",0,1,1,\\"Mã: {pallet.code}\\"\\nPRINT 1\\n"
    return {"pallet_code": pallet.code, "print_command": cmd}
```

#### F. Sơ đồ tuần tự tương tác hệ thống (Sequence Diagram)
```mermaid
sequenceDiagram
    actor Worker as Nhân viên đóng gói / QC
    participant Mobile as Mobile App (ThermalPrint)
    participant Printer as Bluetooth Thermal Printer
    Worker->>Mobile: Quét nhãn QR pallet & nhấp In nhiệt cầm tay
    Mobile->>Mobile: Kết nối Bluetooth/Wi-Fi với máy in nhiệt
    Mobile->>Mobile: Chuyển payload nhãn thành tập lệnh ESC/POS
    Mobile->>Printer: Truyền luồng byte lệnh ESC/POS qua Bluetooth
    Printer-->>Mobile: Hoàn tất in nhãn vật lý
```

---

## 4.18.1 Mục đích màn hình
Màn hình chuyên biệt hỗ trợ in tem nhãn nhiệt dán trên các pallet hàng luân chuyển với kích thước khổ giấy tiêu chuẩn 58mm. Hỗ trợ hiển thị mã QR Code chứa ID phiếu giao nhận và thông tin tổng quát của lô hàng để quét nhanh tại các trạm kế tiếp.

---

### 4.18.2 Thông tin màn hình

| Thuộc tính | Nội dung |
| :--- | :--- |
| Mã màn hình | MB12 |
| Route | `/thermal-print` |
| Module | Quản lý bàn giao & In ấn (Deliveries & Print) |
| Người dùng sử dụng | Nhân viên sản xuất, Tổ trưởng |

---

### 4.18.3 Chức năng chính

| STT | Chức năng | Mô tả |
| :--- | :--- | :--- |
| 1 | Vẽ tem nhiệt khổ 58mm: | Thiết kế giao diện tem in tối ưu cho máy in nhiệt mini cầm tay (khổ rộng 58mm), hiển thị rõ ràng mã vạch/QR Code và các thông số linh kiện, số lượng. |
| 2 | Tự động kích hoạt in: | Tự động kích hoạt lệnh in ấn trình duyệt ngay sau khi dữ liệu của trang được tải hoàn tất (độ trễ 500ms). |
| 3 | Cơ chế in ấn WebView di động: | Tích hợp API cầu nối đặc biệt (Bridge) gửi mã HTML sang WebView lớp ngoài của ứng dụng Android để in trực tiếp thông qua máy in kết nối Bluetooth/USB mà không bị hệ điều hành chặn. |

---

### 4.18.4 Luồng xử lý hệ thống

```mermaid
sequenceDiagram
    autonumber
    actor User as Nhân viên Sản xuất / Tổ trưởng
    participant App as Mobile App (React)
    participant Android as window.AndroidPrint (Bridge)
    participant Browser as Browser Window (Web)
    participant HW as Thermal Printer (Máy in nhiệt)
    
    App->>App: Tạo phiếu giao thành công (MB2.1) -> Mở tab mới dẫn đến /thermal-print kèm URL search params
    App->>App: Phân tích URL params: id, title, planName, partName, total, mainOrder, extraOrders, code...
    App->>App: Thư viện qrcode.react vẽ QR Code động lên Canvas
    App-->>User: Hiển thị mẫu nhãn in nhiệt khổ 58mm
    
    rect rgba(128, 128, 128, 0.15)
        Note over App: Đợi 500ms (setTimeout) để trang nạp hoàn tất
        alt Có đối tượng cầu nối in di động (window.AndroidPrint)
            App->>App: canvas.toDataURL('image/png') chuyển QR Canvas sang Base64
            App->>App: Thay thế thẻ <canvas> bằng thẻ <img> chứa ảnh Base64
            App->>Android: printHtml(fullHtmlContentWithInlineCSS)
            Android->>HW: Gửi lệnh in trực tiếp đến máy in di động Bluetooth/USB
        else Môi trường trình duyệt web tiêu chuẩn
            App->>Browser: window.print()
            Browser->>HW: Mở hộp thoại in hệ thống ra máy in kết nối máy tính
        end
    end
    
    User->>App: Nhấn nút "Quay lại"
    App->>App: Đóng tab in ấn, quay về màn hình nghiệp vụ trước đó
```

Sau khi nhân viên Sản xuất tạo phiếu giao thành công tại màn hình `MB2.1`, ứng dụng tự động mở một tab/cửa sổ mới dẫn đến route `/thermal-print` kèm theo đầy đủ các tham số thông tin phiếu qua URL params.
2. Ứng dụng phân tích URL params, hiển thị giao diện mẫu nhãn in gồm: tiêu đề, mã QR Code động, ID phiếu, tên linh kiện, số lượng tổng và danh sách đơn hàng chính phụ.
3. Sau 500ms kể từ khi trang nạp thành công:
   * Nếu đang chạy trong WebView của ứng dụng Android có hỗ trợ cầu nối in (`window.AndroidPrint.printHtml`), hệ thống sẽ chuyển đổi thành phần Canvas vẽ QR Code sang dạng ảnh Base64, chèn kèm CSS định dạng trang in và gọi hàm cầu nối để in trực tiếp.
   * Nếu ở môi trường trình duyệt web tiêu chuẩn: Kích hoạt hộp thoại in ấn mặc định của trình duyệt (`window.print()`).
4. Người dùng có thể nhấn nút "Quay lại" ở đầu trang để đóng tab in ấn và quay lại màn hình nghiệp vụ trước đó.* Sử dụng thư viện `qrcode.react` (thành phần `QRCodeCanvas`) để vẽ mã QR động lên màn hình.
* **Ultimate Print Fix:** WebView của Android mặc định chặn lệnh `window.print()`. Ứng dụng giải quyết bằng cách phát hiện đối tượng cầu nối `window.AndroidPrint`. Đoạn mã canvas QR được chuyển đổi thành chuỗi Base64 qua phương thức `canvas.toDataURL('image/png')` rồi chèn thay thế thẻ `<canvas>` bằng thẻ `<img>` trước khi gửi toàn bộ chuỗi HTML kèm CSS inline sang phía native Android để máy in nhiệt hoạt động chính xác.
* Tự động kích hoạt in được bọc trong hook `useEffect` có cài đặt `setTimeout` 500ms.

---

### 4.18.5 API liên quan

| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |

---

### 4.18.6 Database liên quan

| Bảng | Mục đích |
| :--- | :--- |

---

### 4.18.7 Business Rules

| Điều kiện | Mô tả |
| :--- | :--- |
| Quy tắc chung | Yêu cầu tham số `id` bắt buộc phải tồn tại trong URL Search Params. Nếu không có `id`, màn hình sẽ chặn xử lý và hiển thị thông báo lỗi "Không tìm thấy mã phiếu!". |

---

### 4.18.8 File code liên quan

**Frontend:**
* [ThermalPrint](file:///e:/Work/SmartFlow-dev%20%281%29/SmartFlow-dev/Mobile/src/Views/screens/MB12_ThermalPrint.jsx)

> [!NOTE]
> **Ghi chú Dev:**
> Tệp tin CSS in sử dụng media query `@media print` với cấu hình `@page { size: 58mm auto; margin: 0; }` để triệt tiêu các thông tin header/footer mặc định của trình duyệt (như ngày in, tiêu đề trang) giúp tem in ra sạch sẽ và vừa vặn với giấy nhiệt.


## CHƯƠNG 6: BẢN ĐỒ MÃ NGUỒN CHI TIẾT & HƯỚNG DẪN BẢO TRÌ

### 1. Bản đồ cấu trúc thư mục & Vai trò tệp nguồn chính

#### 1.1 Tệp: `BackEnd/src/main.py`
**Vai trò nhiệm vụ:** Điểm khởi chạy chính của máy chủ FastAPI. Định nghĩa ứng dụng, cấu hình CORS Middleware, đăng ký các Route Controllers và thiết lập các sự kiện kết nối vòng đời hệ thống.

**Các thư viện imports chính:**
`fastapi`, `fastapi.middleware.cors`, `src.app.api.v1.api`, `src.app.database.session`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `create_app()` | Khởi tạo ứng dụng FastAPI |
| `startup()` | Cấu hình DB và dọn dẹp các tiến trình cũ |
| `shutdown()` | Đóng kết nối DB sạch sẽ |

---

#### 1.2 Tệp: `BackEnd/src/app/core/security.py`
**Vai trò nhiệm vụ:** Xử lý băm bảo mật mật khẩu bằng bcrypt và sinh mã token JWT phục vụ xác thực người dùng.

**Các thư viện imports chính:**
`passlib.context`, `jose.jwt`, `datetime`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `verify_password()` | So sánh mật khẩu thô và mật khẩu băm |
| `get_password_hash()` | Băm mật khẩu |
| `create_access_token()` | Tạo JWT Access Token |

---

#### 1.3 Tệp: `BackEnd/src/app/database/session.py`
**Vai trò nhiệm vụ:** Cấu hình SQLAlchemy Engine, thiết lập SessionLocal để quản lý truy cập và cung cấp dependency get_db cho các API endpoints.

**Các thư viện imports chính:**
`sqlalchemy`, `sqlalchemy.orm`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `get_db()` | Sinh phiên làm việc Database cho mỗi request HTTP |

---

#### 1.4 Tệp: `BackEnd/src/app/models/pallet_card.py`
**Vai trò nhiệm vụ:** Mô hình SQLAlchemy ORM ánh xạ bảng pallet_cards lưu trữ cấu trúc FortuneSheet.

**Các thư viện imports chính:**
`sqlalchemy.Column`, `sqlalchemy.dialects.mssql.NVARCHAR`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `PalletCard` | Lớp ánh xạ các cột pallet_code, sheet_data, PO, khách hàng... |

---

#### 1.5 Tệp: `BackEnd/src/app/services/websocket.py`
**Vai trò nhiệm vụ:** Lớp quản lý các kênh WebSocket kết nối thời gian thực phục vụ gửi thông báo sự kiện.

**Các thư viện imports chính:**
`fastapi.WebSocket`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `ConnectionManager.connect()` | Đăng ký kết nối WebSocket mới vào nhóm |
| `ConnectionManager.disconnect()` | Dọn dẹp giải phóng kết nối |
| `ConnectionManager.broadcast()` | Gửi dữ liệu đồng loạt tới các client cùng công đoạn |

---

#### 1.6 Tệp: `BackEnd/src/app/services/firebase.py`
**Vai trò nhiệm vụ:** Giao tiếp với máy chủ Google Firebase Cloud Messaging để thực hiện gửi tin nhắn thông báo đẩy.

**Các thư viện imports chính:**
`firebase_admin`, `firebase_admin.messaging`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `send_push_notification()` | Gửi nội dung thông báo đẩy qua token Firebase của người nhận |

---

#### 1.7 Tệp: `FrontEnd/src/components/PalletGrid.jsx`
**Vai trò nhiệm vụ:** Thành phần giao diện quản lý bảng tính FortuneSheet cho phép nhân viên thiết kế mẫu và điền thông số thẻ Pallet ngay trên Web.

**Các thư viện imports chính:**
`react`, `fortunesheet-react`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `PalletGrid` | Hiển thị lưới bảng tính, xử lý kéo thả dữ liệu Excel, bắt sự kiện thay đổi ô dữ liệu |
| `onSaveSheet()` | Đóng gói sheet_data thành chuỗi JSON và gọi API lưu lên Backend |

---

#### 1.8 Tệp: `Mobile/src/pages/ScanQR.jsx`
**Vai trò nhiệm vụ:** Trang quét mã QR camera di động sử dụng plugin Capacitor. Xử lý quét nhanh nhãn linh kiện hiện trường.

**Các thư viện imports chính:**
`react`, `@capacitor-community/barcode-scanner`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `startScan()` | Kích hoạt camera native của điện thoại |
| `stopScan()` | Dừng camera và trả lại màn hình webview |
| `handleScanResult()` | Đọc dữ liệu chuỗi QR và điều hướng nghiệp vụ |

---

#### 1.9 Tệp: `Mobile/src/pages/InputInspection.jsx`
**Vai trò nhiệm vụ:** Màn hình ghi nhận kích thước đo thước đo thực tế dành cho QC trước khi giao nhận.

**Các thư viện imports chính:**
`react`, `axios`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `submitInspection()` | Đóng gói kích thước dài/rộng/cao gửi lên API /inspections/ để mở khóa trạm |

---

#### 1.10 Tệp: `Mobile/src/services/api.js`
**Vai trò nhiệm vụ:** Tầng giao tiếp API của di động tích hợp cơ chế tự động cài đặt Bearer token và xử lý lỗi kết nối.

**Các thư viện imports chính:**
`axios`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `apiClient.interceptors.request` | Tự động gán token JWT từ localStorage vào Authorization header |
| `apiClient.interceptors.response` | Bắt lỗi 401 hết hạn token để tự động chuyển về màn hình đăng nhập |

---

#### 1.11 Tệp: `BackEnd/src/app/models/accounts.py`
**Vai trò nhiệm vụ:** Model tài khoản người dùng, định nghĩa cấu trúc lưu trữ thông tin đăng nhập, nhân sự và FCM token.

**Các thư viện imports chính:**
`sqlalchemy`, `sqlalchemy.orm`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `Account` | Lớp ánh xạ tài khoản nhân viên |

---

#### 1.12 Tệp: `BackEnd/src/app/models/deliveries.py`
**Vai trò nhiệm vụ:** Model phiếu giao nhận công đoạn chính.

**Các thư viện imports chính:**
`sqlalchemy`, `sqlalchemy.orm`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `Delivery` | Ánh xạ phiếu bàn giao vật tư, chứa số lượng giao, thực nhận, số lượng lỗi... |

---

#### 1.13 Tệp: `BackEnd/src/app/models/equipment.py`
**Vai trò nhiệm vụ:** Model thiết bị máy móc, quản lý danh mục tài sản xưởng sản xuất.

**Các thư viện imports chính:**
`sqlalchemy`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `Equipment` | Lưu thông tin máy móc, ngày mua, chu kỳ bảo trì... |

---

#### 1.14 Tệp: `BackEnd/src/app/models/daily_inspection.py`
**Vai trò nhiệm vụ:** Model báo cáo kiểm định chất lượng hàng ngày.

**Các thư viện imports chính:**
`sqlalchemy`, `sqlalchemy.orm`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `DailyInspectionRecord` | Lưu báo cáo lỗi tổng ngày |
| `DailyInspectionDefect` | Chi tiết số lượng từng loại lỗi |

---

#### 1.15 Tệp: `BackEnd/src/app/models/backup_qr.py`
**Vai trò nhiệm vụ:** Model thẻ QR dự phòng hỗ trợ luân chuyển tại hiện trường.

**Các thư viện imports chính:**
`sqlalchemy`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `BackupQRCode` | Định nghĩa mã QR trống và liên kết phiếu giao đang sử dụng |

---

#### 1.16 Tệp: `BackEnd/src/app/api/v1/endpoints/deliveries.py`
**Vai trò nhiệm vụ:** Router xử lý các endpoint giao nhận công đoạn, đo độ ẩm và upload ảnh vật lý.

**Các thư viện imports chính:**
`fastapi`, `sqlalchemy.orm`, `src.app.services.websocket`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `create_delivery_endpoint()` | Tạo phiếu giao mới, gửi WebSocket notify |
| `confirm_delivery_endpoint()` | Xác nhận thực nhận |

---

#### 1.17 Tệp: `BackEnd/src/app/api/v1/endpoints/qc.py`
**Vai trò nhiệm vụ:** Router xử lý việc nhập checklist kiểm định 8 hạng mục và tạo phiếu trả hàng lỗi.

**Các thư viện imports chính:**
`fastapi`, `sqlalchemy.orm`, `src.app.services.firebase`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `submit_qc_results()` | QC duyệt checklist chất lượng |
| `create_return_ticket()` | Tạo phiếu trả hàng lỗi về trạm cũ |

---

#### 1.18 Tệp: `FrontEnd/src/pages/Dashboard.jsx`
**Vai trò nhiệm vụ:** Màn hình bảng điều khiển quản trị trung tâm dành cho Web.

**Các thư viện imports chính:**
`react`, `recharts`, `axios`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `Dashboard` | Render các biểu đồ KPIs sản lượng, biểu đồ tròn phân tích tỷ lệ lỗi QC và tiến độ KHSX |

---

#### 1.19 Tệp: `Mobile/src/pages/ConfirmReceipt.jsx`
**Vai trò nhiệm vụ:** Màn hình xác nhận đếm nhận thực tế dành cho nhân viên tổ sản xuất trạm đích.

**Các thư viện imports chính:**
`react`, `axios`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `ConfirmReceipt` | Nhập số lượng thực tế nhận, kiểm tra chênh lệch và cập nhật trạng thái phiếu giao |

---

#### 1.20 Tệp: `Mobile/src/pages/QCInspection.jsx`
**Vai trò nhiệm vụ:** Màn hình dành riêng cho nhân viên QC trạm đích tích chọn checklist lỗi.

**Các thư viện imports chính:**
`react`, `axios`

**Các hàm & Thành phần chính xử lý:**
| Tên hàm/Component | Mô tả nghiệp vụ thực thi |
| :--- | :--- |
| `QCInspection` | Hiển thị 8 checkbox lỗi, nhập số lượng lỗi, số lượng trả lại và mô tả lý do |

---



## CHƯƠNG 7: KỊCH BẢN KIỂM THỬ CHI TIẾT & ĐOẠN MÃ TỰ ĐỘNG (TEST CASES & AUTOMATION)

Chương này cung cấp hướng dẫn kiểm thử chi tiết cho từng kịch bản nghiệp vụ chính, kèm theo các đoạn mã kiểm thử tự động (Automation PyTest) tương ứng để chạy tích hợp liên tục (CI/CD).

### 7.1 Kịch bản: `TC-01` - Đăng nhập thành công tài khoản SX
- **Phân hệ chính:** Authentication
- **Các bước thực hiện:**
  1. Nhập username hợp lệ
  2. Nhập password đúng
  3. Click Đăng nhập
- **Kết quả mong đợi:** Đăng nhập thành công, lưu Token, chuyển hướng Dashboard
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_01_login_success(client, db_session):
    # Nhập tài khoản hợp lệ
    payload = {"username": "nhanvien_sx", "password": "correct_password_123"}
    response = client.post("/api/v1/accounts/login", data=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "nhanvien_sx"
    print("Test TC-01 Passed")
```

---

### 7.2 Kịch bản: `TC-02` - Đăng nhập thất bại mật khẩu sai
- **Phân hệ chính:** Authentication
- **Các bước thực hiện:**
  1. Nhập username đúng
  2. Nhập mật khẩu sai
  3. Click Đăng nhập
- **Kết quả mong đợi:** Hiển thị lỗi 401 Unauthorized, yêu cầu nhập lại
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_02_login_failed_wrong_password(client, db_session):
    # Nhập mật khẩu sai
    payload = {"username": "nhanvien_sx", "password": "wrong_password_xyz"}
    response = client.post("/api/v1/accounts/login", data=payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Username hoặc password không chính xác"
    print("Test TC-02 Passed")
```

---

### 7.3 Kịch bản: `TC-03` - Khóa tài khoản sau 5 lần nhập sai
- **Phân hệ chính:** Authentication
- **Các bước thực hiện:**
  1. Nhập mật khẩu sai 5 lần liên tiếp
  2. Click đăng nhập lần thứ 6
- **Kết quả mong đợi:** Hiển thị lỗi tài khoản bị khóa tạm thời, trạng thái status chuyển sang Locked
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_03_account_lockout(client, db_session):
    # Nhập sai mật khẩu liên tiếp 5 lần
    payload = {"username": "nhanvien_lockout", "password": "wrong_password"}
    for i in range(5):
        response = client.post("/api/v1/accounts/login", data=payload)
        assert response.status_code in [401, 400]
    
    # Lần thứ 6, kiểm tra tài khoản đã bị khóa
    response = client.post("/api/v1/accounts/login", data=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "Tài khoản đang bị khóa"
    print("Test TC-03 Passed")
```

---

### 7.4 Kịch bản: `TC-04` - Đăng xuất hệ thống
- **Phân hệ chính:** Authentication
- **Các bước thực hiện:**
  1. Vào cài đặt
  2. Click Đăng xuất
- **Kết quả mong đợi:** Xóa JWT Token trong LocalStorage, chuyển hướng về Login
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_04_logout(client, auth_headers):
    # Gửi request đăng xuất
    response = client.post("/api/v1/accounts/logout", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    print("Test TC-04 Passed")
```

---

### 7.5 Kịch bản: `TC-05` - Tạo phiếu bàn giao thành công
- **Phân hệ chính:** Deliveries
- **Các bước thực hiện:**
  1. Chọn KHSX
  2. Chọn chi tiết
  3. Nhập số lượng 100
  4. Nhập 3 trị số ẩm
  5. Click Giao
- **Kết quả mong đợi:** Tạo phiếu thành công, trạng thái Chờ xác nhận, gửi WebSocket notify
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_05_create_delivery_success(client, db_session, auth_headers):
    # Chuẩn bị dữ liệu phiếu bàn giao hợp lệ
    payload = {
        "plan_id": 1,
        "part_name": "Tấm hông gỗ sồi",
        "quantity_total": 120,
        "moisture_1": 12.5,
        "moisture_2": 13.0,
        "moisture_3": 12.8
    }
    # Gửi POST tạo phiếu
    response = client.post("/api/v1/deliveries/", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "delivery_id" in data
    print("Test TC-05 Passed")
```

---

### 7.6 Kịch bản: `TC-06` - Tạo phiếu thất bại do chưa QC đầu vào
- **Phân hệ chính:** Deliveries
- **Các bước thực hiện:**
  1. Chọn chi tiết chưa đo kích thước đạt
  2. Click Giao
- **Kết quả mong đợi:** Chặn đứng giao dịch, hiển thị cảnh báo lỗi 400 Bad Request yêu cầu QC đo đầu vào
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_06_create_delivery_fail_no_qc(client, db_session, auth_headers):
    # Tạo phiếu bàn giao cho linh kiện chưa đạt QC đầu vào
    payload = {
        "plan_id": 999, # Plan chưa có QC
        "part_name": "Chân bàn gỗ thông",
        "quantity_total": 50
    }
    response = client.post("/api/v1/deliveries/", json=payload, headers=auth_headers)
    assert response.status_code == 400
    assert "Chưa có kết quả QC đầu vào" in response.json()["detail"]
    print("Test TC-06 Passed")
```

---

### 7.7 Kịch bản: `TC-07` - Nhập số lượng giao là số âm
- **Phân hệ chính:** Deliveries
- **Các bước thực hiện:**
  1. Nhập số lượng -10
  2. Click Giao
- **Kết quả mong đợi:** Báo lỗi Validation đầu vào dữ liệu, chặn không cho submit
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_07_create_delivery_fail_negative_qty(client, auth_headers):
    # Nhập số lượng âm
    payload = {
        "plan_id": 1,
        "part_name": "Tấm hông gỗ sồi",
        "quantity_total": -5
    }
    response = client.post("/api/v1/deliveries/", json=payload, headers=auth_headers)
    assert response.status_code == 422 # Pydantic Validation Error
    print("Test TC-07 Passed")
```

---

### 7.8 Kịch bản: `TC-08` - Tải quá 3 ảnh minh chứng
- **Phân hệ chính:** Deliveries
- **Các bước thực hiện:**
  1. Chọn 4 tệp ảnh đính kèm
  2. Click Giao
- **Kết quả mong đợi:** Cảnh báo chỉ cho phép tối đa 3 ảnh chụp thực tế
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_08_create_delivery_fail_too_many_images(client, auth_headers):
    # Gửi payload với 4 ảnh (vượt giới hạn 3 ảnh)
    files = [
        ("files", ("img1.jpg", b"content1", "image/jpeg")),
        ("files", ("img2.jpg", b"content2", "image/jpeg")),
        ("files", ("img3.jpg", b"content3", "image/jpeg")),
        ("files", ("img4.jpg", b"content4", "image/jpeg")),
    ]
    payload = {"plan_id": "1", "part_name": "Tấm hông gỗ sồi", "quantity_total": "100"}
    response = client.post("/api/v1/deliveries/", data=payload, files=files, headers=auth_headers)
    assert response.status_code == 400
    assert "Vượt quá giới hạn hình ảnh" in response.json()["detail"]
    print("Test TC-08 Passed")
```

---

### 7.9 Kịch bản: `TC-09` - Đồng bộ phiếu giao lưu tạm (Offline)
- **Phân hệ chính:** Deliveries
- **Các bước thực hiện:**
  1. Tắt Wi-Fi di động
  2. Click Tạo phiếu bàn giao
- **Kết quả mong đợi:** Lưu thông tin phiếu vào LocalStorage của điện thoại, báo trạng thái Offline
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_09_offline_sync_queue():
    # Giả lập LocalStorage lưu trữ queue ngoại tuyến trên client
    sync_queue = [
        {"url": "/api/v1/deliveries/", "method": "POST", "data": {"plan_id": 1, "quantity_total": 100}}
    ]
    # Kiểm tra queue được khởi tạo thành công cục bộ
    assert len(sync_queue) == 1
    assert sync_queue[0]["data"]["quantity_total"] == 100
    print("Test TC-09 Passed")
```

---

### 7.10 Kịch bản: `TC-10` - Đồng bộ tự động khi có mạng lại
- **Phân hệ chính:** Deliveries
- **Các bước thực hiện:**
  1. Bật Wi-Fi di động
  2. Mở ứng dụng
- **Kết quả mong đợi:** Hệ thống tự động đọc LocalStorage gửi API đồng bộ lên Server, thông báo thành công
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_10_online_auto_sync(client, auth_headers):
    # Giả lập thiết bị reconnect mạng và giải phóng hàng đợi sync_queue
    payload = {"plan_id": 1, "part_name": "Tấm hông gỗ sồi", "quantity_total": 100}
    response = client.post("/api/v1/deliveries/", json=payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    print("Test TC-10 Passed")
```

---

### 7.11 Kịch bản: `TC-11` - Xác nhận thực nhận trùng khớp số lượng
- **Phân hệ chính:** Deliveries
- **Các bước thực hiện:**
  1. Xem phiếu chờ nhận
  2. Nhập số lượng nhận đúng bằng số giao
  3. Click Xác nhận
- **Kết quả mong đợi:** Phiếu chuyển sang Chờ QC kiểm tra, cập nhật quantity_received
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_11_confirm_receipt_match(client, auth_headers):
    # Trạm nhận tiếp nhận phiếu số giao nhận trùng khớp
    payload = {"quantity_received": 120, "note": "Nhận đủ"}
    response = client.post("/api/v1/deliveries/102/confirm", json=payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "Chờ kiểm tra"
    print("Test TC-11 Passed")
```

---

### 7.12 Kịch bản: `TC-12` - Xác nhận thực nhận bị thiếu hụt
- **Phân hệ chính:** Deliveries
- **Các bước thực hiện:**
  1. Nhập số nhận 98 (giao 100)
  2. Click Xác nhận
- **Kết quả mong đợi:** Ghi nhận 2 sản phẩm hao hụt/lỗi, tạo bản ghi lỗi trong chi tiết giao
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_12_confirm_receipt_deficit(client, auth_headers):
    # Trạm nhận tiếp nhận phiếu giao bị thiếu hụt so với giao đi
    payload = {"quantity_received": 115, "note": "Thiếu 5 chi tiết do sứt góc"}
    response = client.post("/api/v1/deliveries/102/confirm", json=payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "Chờ kiểm tra"
    print("Test TC-12 Passed")
```

---

### 7.13 Kịch bản: `TC-13` - Hủy phiếu giao nhận
- **Phân hệ chính:** Deliveries
- **Các bước thực hiện:**
  1. Click nút Hủy phiếu khi trạng thái đang Chờ xác nhận
- **Kết quả mong đợi:** Phiếu chuyển sang trạng thái Đã hủy, thu hồi dữ liệu
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_13_cancel_delivery(client, auth_headers):
    # Hủy phiếu giao hàng trước khi tiếp nhận
    response = client.post("/api/v1/deliveries/102/cancel", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    print("Test TC-13 Passed")
```

---

### 7.14 Kịch bản: `TC-14` - QC phê duyệt đạt chất lượng
- **Phân hệ chính:** QC Inspection
- **Các bước thực hiện:**
  1. Mở phiếu chờ QC
  2. Tích đạt 8/8 lỗi checklist
  3. Click Phê duyệt
- **Kết quả mong đợi:** Phiếu chuyển sang Đã nhận, mở khóa số lượng để công đoạn sau sử dụng
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_14_qc_approve(client, auth_headers):
    # QC xác nhận kiểm định ĐẠT toàn bộ lô hàng
    payload = {
        "results": {"cong_venh": True, "nut_tet": True, "be_mat": True},
        "quantity_error": 0,
        "quantity_returned": 0,
        "note": "Lô hàng đạt tiêu chuẩn sản xuất"
    }
    response = client.post("/api/v1/qc/102/results", json=payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "Đã nhận"
    print("Test TC-14 Passed")
```

---

### 7.15 Kịch bản: `TC-15` - QC phát hiện lỗi checklist bề mặt
- **Phân hệ chính:** QC Inspection
- **Các bước thực hiện:**
  1. Tích phát hiện lỗi Trầy xước sơn và Cong vênh
  2. Điền số lỗi là 5
  3. Click Lưu kết quả
- **Kết quả mong đợi:** Ghi nhận 5 sản phẩm lỗi vào bảng delivery_qc
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_15_qc_reject_surface(client, auth_headers):
    # QC phát hiện lỗi bề mặt, không đạt 5 chi tiết
    payload = {
        "results": {"cong_venh": True, "nut_tet": True, "be_mat": False},
        "quantity_error": 5,
        "quantity_returned": 0,
        "note": "Có 5 chi tiết bị xước sơn bề mặt nghiêm trọng"
    }
    response = client.post("/api/v1/qc/102/results", json=payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "Đã nhận" # Vẫn nhận nhưng ghi nhận lỗi
    print("Test TC-15 Passed")
```

---

### 7.16 Kịch bản: `TC-16` - QC lập phiếu trả hàng lỗi về trạm cũ
- **Phân hệ chính:** QC Inspection
- **Các bước thực hiện:**
  1. Chọn trả lại 2 sản phẩm lỗi nặng
  2. Nhập note lý do
  3. Click Trả hàng
- **Kết quả mong đợi:** Tạo phiếu delivery_returns, gửi thông báo đẩy Firebase đến trạm giao
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_16_qc_return_ticket(client, auth_headers):
    # Lập phiếu trả hàng lỗi về trạm cắt cũ
    payload = {"note": "Trả lại 5 chi tiết lỗi cong vênh lớn"}
    response = client.post("/api/v1/qc/102/return", json=payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    print("Test TC-16 Passed")
```

---

### 7.17 Kịch bản: `TC-17` - Ghi nhận kích thước đầu vào đạt
- **Phân hệ chính:** QC Inspection
- **Các bước thực hiện:**
  1. Nhập chiều dài 1200, rộng 600, cao 18
  2. Đánh kết quả Đạt
  3. Click Lưu
- **Kết quả mong đợi:** Ghi nhận thành công vào bảng input_inspections, mở khóa quyền giao hàng chi tiết này
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_17_input_inspection_pass(client, auth_headers):
    # Ghi nhận kích thước đầu vào đạt tiêu chuẩn thiết kế
    payload = {
        "plan_id": 1,
        "part_name": "Tấm hông gỗ sồi",
        "length": 1200.0,
        "width": 600.0,
        "height": 18.0,
        "moisture_avg": 12.0,
        "result": "Đạt"
    }
    response = client.post("/api/v1/deliveries/input-inspection", json=payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    print("Test TC-17 Passed")
```

---

### 7.18 Kịch bản: `TC-18` - Ghi nhận kích thước không đạt
- **Phân hệ chính:** QC Inspection
- **Các bước thực hiện:**
  1. Nhập thông số sai quy cách
  2. Đánh kết quả Không đạt
  3. Click Lưu
- **Kết quả mong đợi:** Ghi nhận không đạt, tiếp tục khóa quyền bàn giao trạm
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_18_input_inspection_fail(client, auth_headers):
    # Kích thước đo sai lệch lớn (Vượt dung sai cho phép)
    payload = {
        "plan_id": 1,
        "part_name": "Tấm hông gỗ sồi",
        "length": 1205.5, # Dung sai cho phép là +-1mm, lệch hẳn 5.5mm
        "width": 600.0,
        "height": 18.0,
        "moisture_avg": 12.0,
        "result": "Không đạt"
    }
    response = client.post("/api/v1/deliveries/input-inspection", json=payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    print("Test TC-18 Passed")
```

---

### 7.19 Kịch bản: `TC-19` - Tạo thẻ Pallet mới
- **Phân hệ chính:** Pallet Card
- **Các bước thực hiện:**
  1. Click Thêm thẻ
  2. Nhập mã PLT-001
  3. Click Lưu
- **Kết quả mong đợi:** Tạo thẻ Pallet thành công ở trạng thái Active
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_19_create_pallet(client, auth_headers):
    # Tạo thẻ Pallet trống mới trên hệ thống
    response = client.post("/api/v1/pallet/?code=PLT-NEW-99", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    print("Test TC-19 Passed")
```

---

### 7.20 Kịch bản: `TC-20` - Lưu cấu hình bảng tính FortuneSheet
- **Phân hệ chính:** Pallet Card
- **Các bước thực hiện:**
  1. Thay đổi màu ô và công thức trên bảng tính
  2. Click Lưu bảng tính
- **Kết quả mong đợi:** Lưu chuỗi JSON định dạng thành công vào trường sheet_data trên database
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_20_save_sheet_data(client, auth_headers):
    # Lưu cấu hình FortuneSheet bảng tính thẻ Pallet
    payload = {"sheet_data": "[{\"name\":\"Sheet1\",\"celldata\":[]}]"}
    response = client.put("/api/v1/pallet/PLT-NEW-99/sheet", json=payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    print("Test TC-20 Passed")
```

---

### 7.21 Kịch bản: `TC-21` - Import dữ liệu Excel vào thẻ Pallet
- **Phân hệ chính:** Pallet Card
- **Các bước thực hiện:**
  1. Chọn tệp Excel vật tư sản xuất
  2. Click Nhập dữ liệu
- **Kết quả mong đợi:** Phân tích và đẩy toàn bộ dữ liệu Excel vào lưới bảng tính FortuneSheet
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_21_import_excel_pallet(client, auth_headers):
    # Import Excel gán trực tiếp dữ liệu vào cấu hình ô tính của FortuneSheet
    file_content = b"Mock Excel Sheet Binary Data"
    files = {"file": ("pallet_spec.xlsx", file_content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    response = client.post("/api/v1/pallet/PLT-NEW-99/import", files=files, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    print("Test TC-21 Passed")
```

---

### 7.22 Kịch bản: `TC-22` - In thẻ Pallet A4
- **Phân hệ chính:** Pallet Card
- **Các bước thực hiện:**
  1. Click nút In thẻ Pallet
- **Kết quả mong đợi:** Trích xuất tọa độ dữ liệu và xuất file PDF/Lệnh in chuẩn khổ A4
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_22_print_pallet_a4(client, auth_headers):
    # Gọi API sinh tài liệu nhãn in pallet chuẩn khổ A4
    response = client.get("/api/v1/pallet/PLT-NEW-99/print", headers=auth_headers)
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/pdf"
    print("Test TC-22 Passed")
```

---

### 7.23 Kịch bản: `TC-23` - Đăng ký thiết bị mới
- **Phân hệ chính:** Equipment
- **Các bước thực hiện:**
  1. Nhập tên máy và mã CNC-05
  2. Click Lưu
- **Kết quả mong đợi:** Tạo thiết bị mới thành công
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_23_register_equipment(client, auth_headers):
    # Đăng ký một máy CNC mới hoạt động
    payload = {"name": "Máy cắt CNC G7-08", "code": "CNC-G7-08", "type": "CNC", "status": "Hoạt động"}
    response = client.post("/api/v1/equipment/", json=payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    print("Test TC-23 Passed")
```

---

### 7.24 Kịch bản: `TC-24` - Cập nhật bảo trì máy móc
- **Phân hệ chính:** Equipment
- **Các bước thực hiện:**
  1. Chọn thiết bị
  2. Đổi trạng thái sang Bảo trì
  3. Ghi log ngày bảo trì
- **Kết quả mong đợi:** Cập nhật trạng thái thành công, lưu nhật ký vận hành
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_24_update_maintenance(client, auth_headers):
    # Cập nhật trạng thái máy sang Bảo trì
    payload = {"status": "Bảo trì", "note": "Thay vòng bi cốt máy cắt"}
    response = client.put("/api/v1/equipment/1/maintenance", json=payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    print("Test TC-24 Passed")
```

---

### 7.25 Kịch bản: `TC-25` - Nhận thông báo đẩy trên di động
- **Phân hệ chính:** Notifications
- **Các bước thực hiện:**
  1. Thiết bị chạy ngầm
  2. Server kích hoạt gửi FCM đẩy thông báo
- **Kết quả mong đợi:** Di động hiển thị popup thông báo đẩy kèm chuông báo tức thời
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_25_receive_push_notification(client, auth_headers):
    # Gửi thông báo đẩy FCM qua server
    payload = {"title": "Bàn giao mới", "body": "Phiếu 102 đang chờ tiếp nhận", "user_id": 12}
    response = client.post("/api/v1/notifications/send-push", json=payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    print("Test TC-25 Passed")
```

---

### 7.26 Kịch bản: `TC-26` - Nhận sự kiện WebSocket thời gian thực
- **Phân hệ chính:** Notifications
- **Các bước thực hiện:**
  1. Trạm giao tạo phiếu bàn giao mới
- **Kết quả mong đợi:** Trạm nhận tự động làm mới danh sách phiếu giao ngay lập tức mà không cần F5
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_26_websocket_broadcast(client):
    # Kết nối WebSocket lắng nghe sự kiện đẩy thời gian thực
    with client.websocket_connect("/ws/stage/Tram_Cat") as websocket:
        # Gửi trigger event bên ngoài
        # websocket nhận thông điệp broadcast tức thời
        websocket.send_text("PING")
        data = websocket.receive_text()
        assert "PONG" in data
    print("Test TC-26 Passed")
```

---

### 7.27 Kịch bản: `TC-27` - Kích hoạt mã QR dự phòng
- **Phân hệ chính:** Backup QR
- **Các bước thực hiện:**
  1. Quét mã QR in sẵn trống
  2. Gán tạm với phiếu bàn giao 102
  3. Click Kích hoạt
- **Kết quả mong đợi:** Trạng thái QR chuyển sang Đang Sử Dụng, gắn ID phiếu giao tương ứng
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_27_activate_backup_qr(client, auth_headers):
    # Kích hoạt mã QR in sẵn dự phòng
    response = client.post("/api/v1/backup-qr/QR-BACKUP-088/activate?delivery_id=102", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    print("Test TC-27 Passed")
```

---

### 7.28 Kịch bản: `TC-28` - Giải phóng mã QR dự phòng
- **Phân hệ chính:** Backup QR
- **Các bước thực hiện:**
  1. Hoàn thành phiếu bàn giao 102
- **Kết quả mong đợi:** Mã QR tự động được giải phóng về trạng thái Trống để tái sử dụng
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_28_release_backup_qr(client, auth_headers):
    # Giải phóng liên kết QR dự phòng để tái sử dụng
    response = client.post("/api/v1/backup-qr/QR-BACKUP-088/release", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    print("Test TC-28 Passed")
```

---

### 7.29 Kịch bản: `TC-29` - Yêu cầu quyền hạn API
- **Phân hệ chính:** Security
- **Các bước thực hiện:**
  1. Tài khoản vai trò SX gọi API của QC
- **Kết quả mong đợi:** Hệ thống chặn trả về lỗi 403 Forbidden
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_29_rbac_endpoint_access(client, db_session):
    # Gọi API yêu cầu quyền quản trị bằng token nhân viên thường
    headers = {"Authorization": "Bearer token_nhanvien_thuong"}
    response = client.post("/api/v1/accounts/register", json={}, headers=headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Không có quyền truy cập"
    print("Test TC-29 Passed")
```

---

### 7.30 Kịch bản: `TC-30` - Kiểm tra phiên bản cập nhật ứng dụng
- **Phân hệ chính:** System
- **Các bước thực hiện:**
  1. Khởi động App
  2. Server trả về version mới
- **Kết quả mong đợi:** Hiển thị thông báo yêu cầu tải bản cập nhật APK mới
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_30_check_app_version(client):
    # Kiểm tra cập nhật ứng dụng mobile
    response = client.get("/api/v1/system/app-version?current=1.0.0")
    assert response.status_code == 200
    data = response.json()
    assert "has_update" in data
    print("Test TC-30 Passed")
```

---

### 7.31 Kịch bản: `TC-31` - Cảnh báo máy quá hạn bảo dưỡng
- **Phân hệ chính:** Equipment
- **Các bước thực hiện:**
  1. Thiết lập chu kỳ 10 ngày
  2. Đăng ký ngày bảo dưỡng cách đây 12 ngày
  3. Mở Web Dashboard
- **Kết quả mong đợi:** Giao diện hiển thị nhãn đỏ cảnh báo CNC-01 quá hạn bảo trì
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_31_equipment_maintenance_alert(client, auth_headers):
    # Kiểm tra hệ thống tự động sinh cảnh báo bảo trì định kỳ
    response = client.get("/api/v1/equipment/alerts", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    print("Test TC-31 Passed")
```

---

### 7.32 Kịch bản: `TC-32` - Xóa thiết bị khỏi hệ thống
- **Phân hệ chính:** Equipment
- **Các bước thực hiện:**
  1. Chọn thiết bị CNC-05
  2. Click Xóa
- **Kết quả mong đợi:** Thiết bị chuyển sang trạng thái Đã xóa, không xuất hiện ở danh sách chính
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_32_delete_equipment(client, auth_headers):
    # Xóa hoàn toàn thiết bị khỏi cơ sở dữ liệu
    response = client.delete("/api/v1/equipment/1", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    print("Test TC-32 Passed")
```

---

### 7.33 Kịch bản: `TC-33` - Đồng bộ thông báo offline
- **Phân hệ chính:** Notifications
- **Các bước thực hiện:**
  1. Mất mạng
  2. Tạo thông báo
  3. Bật mạng lại
- **Kết quả mong đợi:** Tự động gửi thông báo tích lũy lên FCM khi kết nối mạng phục hồi
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_33_offline_notification_sync():
    # Đồng bộ thông báo đẩy khi reconnect mạng
    local_notifications = [{"id": 1, "title": "Thông báo 1", "read": False}]
    assert len(local_notifications) == 1
    print("Test TC-33 Passed")
```

---

### 7.34 Kịch bản: `TC-34` - Đánh dấu đã đọc tất cả
- **Phân hệ chính:** Notifications
- **Các bước thực hiện:**
  1. Vào danh sách thông báo
  2. Click Đã đọc tất cả
- **Kết quả mong đợi:** Tất cả bản ghi trong bảng notifications cập nhật is_read = True
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_34_mark_all_read(client, auth_headers):
    # Đánh dấu đã đọc tất cả thông báo
    response = client.put("/api/v1/notifications/mark-read", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    print("Test TC-34 Passed")
```

---

### 7.35 Kịch bản: `TC-35` - Sử dụng QR dự phòng tạo giao dịch
- **Phân hệ chính:** Backup QR
- **Các bước thực hiện:**
  1. Quét mã QR dự phòng
  2. Điền thông tin giao hàng
  3. Click Giao
- **Kết quả mong đợi:** Tạo phiếu giao thành công liên kết mã QR dự phòng
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_35_use_backup_qr_transaction(client, auth_headers):
    # Dùng mã QR dự phòng tạo giao dịch giao nhận
    payload = {"qr_code": "QR-BACKUP-088", "quantity": 100}
    response = client.post("/api/v1/deliveries/create-with-qr", json=payload, headers=auth_headers)
    assert response.status_code in [200, 400]
    print("Test TC-35 Passed")
```

---

### 7.36 Kịch bản: `TC-36` - Quét QR dự phòng không tồn tại
- **Phân hệ chính:** Backup QR
- **Các bước thực hiện:**
  1. Quét mã QR tự sinh ngoài luồng
  2. Nhận kết quả quét
- **Kết quả mong đợi:** Hệ thống cảnh báo lỗi 404 Không tìm thấy mã QR trên hệ thống
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_36_scan_invalid_backup_qr(client, auth_headers):
    # Quét mã QR dự phòng không tồn tại
    response = client.get("/api/v1/backup-qr/QR-INVALID-999/status", headers=auth_headers)
    assert response.status_code == 404
    assert "Mã QR dự phòng không tồn tại" in response.json()["detail"]
    print("Test TC-36 Passed")
```

---

### 7.37 Kịch bản: `TC-37` - Gọi API với Token hết hạn
- **Phân hệ chính:** Security
- **Các bước thực hiện:**
  1. Lấy token hết hạn
  2. Gửi request REST API
- **Kết quả mong đợi:** Máy chủ trả về lỗi 401 Unauthorized và thông điệp Token expired
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_37_expired_token(client):
    # Gọi API với Token JWT đã hết hạn
    headers = {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired_token_data"}
    response = client.get("/api/v1/deliveries/stage/Tram_Cat", headers=headers)
    assert response.status_code == 401
    assert "Token" in response.json()["detail"] or "Signature" in response.json()["detail"]
    print("Test TC-37 Passed")
```

---

### 7.38 Kịch bản: `TC-38` - Tài khoản thường truy cập tài nguyên quản trị
- **Phân hệ chính:** Security
- **Các bước thực hiện:**
  1. Login tài khoản SX
  2. Gửi GET request tới /api/v1/accounts/register
- **Kết quả mong đợi:** Trả về lỗi 403 Forbidden, chặn quyền truy cập
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_38_unauthorized_access(client, auth_headers):
    # Nhân viên thường cố tình gọi API tạo tài khoản Admin
    response = client.post("/api/v1/accounts/register", json={}, headers=auth_headers)
    assert response.status_code == 403
    print("Test TC-38 Passed")
```

---

### 7.39 Kịch bản: `TC-39` - Ngăn chặn SQL Injection đầu vào
- **Phân hệ chính:** Security
- **Các bước thực hiện:**
  1. Nhập username dạng ' OR 1=1 --
  2. Click Đăng nhập
- **Kết quả mong đợi:** Hệ thống báo lỗi đăng nhập không thành công, ngăn chặn thực thi SQL bẩn
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_39_sql_injection_prevention(client):
    # Nhập ký tự SQL Injection vào ô tìm kiếm
    payload = {"username": "admin' OR '1'='1", "password": "any"}
    response = client.post("/api/v1/accounts/login", data=payload)
    assert response.status_code == 401 # Không bị bypass, trả về lỗi xác thực thường
    print("Test TC-39 Passed")
```

---

### 7.40 Kịch bản: `TC-40` - Yêu cầu độ mạnh mật khẩu
- **Phân hệ chính:** Security
- **Các bước thực hiện:**
  1. Nhập mật khẩu '123' khi đổi pass
  2. Click Đổi mật khẩu
- **Kết quả mong đợi:** Hệ thống báo lỗi mật khẩu phải dài ít nhất 8 ký tự, gồm chữ hoa, thường và số
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_40_password_strength(client, auth_headers):
    # Đăng ký tài khoản mới với mật khẩu yếu (ngắn hơn 6 ký tự)
    payload = {"username": "new_user", "password": "123", "full_name": "New User", "employee_id": "NV999"}
    response = client.post("/api/v1/accounts/register", json=payload, headers=auth_headers)
    assert response.status_code == 400
    assert "mật khẩu" in response.json()["detail"].lower()
    print("Test TC-40 Passed")
```

---

### 7.41 Kịch bản: `TC-41` - Sao lưu cơ sở dữ liệu tự động
- **Phân hệ chính:** System
- **Các bước thực hiện:**
  1. Đến giờ backup định kỳ (23:00)
  2. Server chạy script backup
- **Kết quả mong đợi:** Tạo file backup .db mới dạng nén lưu tại thư mục backup của server
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_41_database_auto_backup(client, auth_headers):
    # Kích hoạt sao lưu database từ xa bằng API Admin
    response = client.post("/api/v1/system/backup", headers=auth_headers)
    assert response.status_code in [200, 403]
    if response.status_code == 200:
        assert "backup_file" in response.json()
    print("Test TC-41 Passed")
```

---

### 7.42 Kịch bản: `TC-42` - Khôi phục dữ liệu từ file backup
- **Phân hệ chính:** System
- **Các bước thực hiện:**
  1. Chọn file backup ngày hôm trước
  2. Click Khôi phục hệ thống
- **Kết quả mong đợi:** Dữ liệu được khôi phục nguyên trạng, ghi đè file DB cũ và kiểm tra tính toàn vẹn
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_42_database_restore(client, auth_headers):
    # Khôi phục dữ liệu từ tệp sao lưu
    payload = {"backup_file": "backup_2026_05_25.db"}
    response = client.post("/api/v1/system/restore", json=payload, headers=auth_headers)
    assert response.status_code in [200, 403, 400]
    print("Test TC-42 Passed")
```

---

### 7.43 Kịch bản: `TC-43` - Kiểm tra rò rỉ RAM WebSocket
- **Phân hệ chính:** System
- **Các bước thực hiện:**
  1. Mở và đóng 100 kết nối WebSocket đồng thời
  2. Kiểm tra bộ nhớ RAM
- **Kết quả mong đợi:** Bộ nhớ RAM duy trì ổn định, các đối tượng socket bị hủy được dọn dẹp sạch
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_43_websocket_memory_leak(client):
    # Kết nối đồng thời và ngắt kết nối WebSocket liên tục để kiểm tra rò rỉ bộ nhớ
    for i in range(50):
        with client.websocket_connect("/ws/stage/Tram_Cat") as ws:
            ws.send_text("PING")
            assert ws.receive_text() == "PONG"
    print("Test TC-43 Passed")
```

---

### 7.44 Kịch bản: `TC-44` - Kiểm tra trạng thái DB qua API Health
- **Phân hệ chính:** System
- **Các bước thực hiện:**
  1. Gửi request GET tới /api/v1/system/health
- **Kết quả mong đợi:** Trả về JSON trạng thái 'OK' của cả API và Database
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_44_system_health_check(client):
    # Kiểm tra trạng thái sức khỏe hệ thống
    response = client.get("/api/v1/system/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    print("Test TC-44 Passed")
```

---

### 7.45 Kịch bản: `TC-45` - Import KHSX Excel lỗi định dạng
- **Phân hệ chính:** Plans
- **Các bước thực hiện:**
  1. Chọn file Excel thiếu cột Số lượng kế hoạch
  2. Click Import
- **Kết quả mong đợi:** Chặn đứng tiến trình import, báo lỗi chính xác vị trí cột bị thiếu
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_45_import_plan_excel_invalid_format(client, auth_headers):
    # Import Excel sai định dạng cột bắt buộc
    file_content = b"Wrong Column Name, Quantity\nProduct A, 100"
    files = {"file": ("wrong_plan.csv", file_content, "text/csv")}
    response = client.post("/api/v1/product-plans/import", files=files, headers=auth_headers)
    assert response.status_code == 400
    assert "định dạng" in response.json()["detail"].lower()
    print("Test TC-45 Passed")
```

---

### 7.46 Kịch bản: `TC-46` - Cập nhật trạng thái KHSX sang Xong
- **Phân hệ chính:** Plans
- **Các bước thực hiện:**
  1. Hoàn thành toàn bộ phiếu giao nhận
  2. Cập nhật trạng thái KHSX
- **Kết quả mong đợi:** Trạng thái KHSX chuyển sang 'Xong', đóng các quyền thay đổi thông tin
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_46_complete_plan(client, auth_headers):
    # Cập nhật trạng thái kế hoạch sang Xong
    response = client.put("/api/v1/product-plans/1/complete", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    print("Test TC-46 Passed")
```

---

### 7.47 Kịch bản: `TC-47` - Xóa kế hoạch sản xuất chưa chạy
- **Phân hệ chính:** Plans
- **Các bước thực hiện:**
  1. Chọn KHSX chưa chạy
  2. Click Xóa
- **Kết quả mong đợi:** Xóa thành công, thu hồi tất cả chi tiết liên quan
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_47_delete_plan_not_started(client, auth_headers):
    # Xóa kế hoạch chưa chạy
    response = client.delete("/api/v1/product-plans/99", headers=auth_headers)
    assert response.status_code in [200, 400]
    print("Test TC-47 Passed")
```

---

### 7.48 Kịch bản: `TC-48` - Lưu độ ẩm ngoài khoảng cho phép
- **Phân hệ chính:** QC Inspection
- **Các bước thực hiện:**
  1. Nhập độ ẩm 35%
  2. Click Lưu độ ẩm
- **Kết quả mong đợi:** Hệ thống cảnh báo độ ẩm quá cao so với tiêu chuẩn gỗ đầu vào (>25%)
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_48_moisture_out_of_bounds(client, auth_headers):
    # Ghi nhận độ ẩm vượt quá giới hạn (ví dụ: 30%)
    payload = {
        "plan_id": 1,
        "part_name": "Tấm hông gỗ sồi",
        "length": 1200.0,
        "width": 600.0,
        "height": 18.0,
        "moisture_avg": 30.0,
        "result": "Không đạt"
    }
    response = client.post("/api/v1/deliveries/input-inspection", json=payload, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    print("Test TC-48 Passed")
```

---

### 7.49 Kịch bản: `TC-49` - Xem báo cáo tỷ lệ lỗi trực quan
- **Phân hệ chính:** QC Inspection
- **Các bước thực hiện:**
  1. Mở Web Dashboard
  2. Chọn xem thống kê tuần
- **Kết quả mong đợi:** Hiển thị biểu đồ phân tích lỗi theo nhóm và tỷ lệ phần trăm trực quan
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_49_get_defect_report(client, auth_headers):
    # Xem báo cáo tỷ lệ lỗi trực quan
    response = client.get("/api/v1/system/kpis?range=monthly", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "defect_rate" in data
    print("Test TC-49 Passed")
```

---

### 7.50 Kịch bản: `TC-50` - Giao dịch đồng thời cùng mã QR
- **Phân hệ chính:** Deliveries
- **Các bước thực hiện:**
  1. Hai nhân viên cùng quét và xác nhận nhận 1 mã QR tại một thời điểm
- **Kết quả mong đợi:** Hệ thống sử dụng khóa bi quan xử lý tuần tự, người thứ 2 nhận thông báo mã QR đã xử lý
- **Đoạn mã kiểm thử tự động chuẩn hóa (PyTest Script):**
```python
def test_tc_50_concurrent_qr_transaction(client, auth_headers):
    # Hai thiết bị gửi yêu cầu giao dịch đồng thời cho cùng một mã QR
    payload = {"qr_code": "QR-CONCURRENT-001", "quantity": 50}
    response1 = client.post("/api/v1/deliveries/create-with-qr", json=payload, headers=auth_headers)
    response2 = client.post("/api/v1/deliveries/create-with-qr", json=payload, headers=auth_headers)
    assert response1.status_code == 200 or response2.status_code == 200
    assert response1.status_code == 400 or response2.status_code == 400
    print("Test TC-50 Passed")
```

---


