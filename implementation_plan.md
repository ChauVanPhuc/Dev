# Kế hoạch Gôm nhóm Mã PO, Chi tiết (BOM) và Quy cách (QC) trong /production_v2/inspection/

## 1. Bối cảnh & Mục tiêu

Hiện tại trong hệ thống SmartFlow, các Lệnh sản xuất (Orders) được lưu theo từng lô / phân đoạn sản xuất nhỏ có hậu tố đính kèm số lô (ví dụ: `APT-0102-01`, `APT-0102-02`, ..., `APT-0102-26`, hoặc `APT-0092-05`, `APT-0092-06`, `APT-0092-07`, `ADV-0406-01`, `ADV-0406-02`).
- **Thực trạng**: Khi người dùng vào màn hình tạo phiếu kiểm tra `/production_v2/inspection/` (các phiếu Mẫu đầu chuyền CL09A, Tái kiểm CL09B, Thông số CL09C, Công đoạn CL09D, QA CL09E, Lỗi hằng ngày CL09F), danh sách dropdown **"Chọn PO *"** hiển thị hàng chục mã con lặp lại cho cùng 1 đơn hàng gốc, gây rối mắt và khó chọn. Đồng thời, khi chọn một mã con thì dữ liệu Chi tiết và Quy cách chỉ lấy của riêng mã con đó, làm phân tán số lượng lô và danh mục quy cách.
- **Mục tiêu**:
  1. **Gôm nhóm mã PO**: Các mã con cùng thuộc một đơn hàng gốc (ví dụ: `APT-0102-01` đến `APT-0102-26`) sẽ được gôm lại thành một mã duy nhất: `APT-0102` trên danh sách lựa chọn.
  2. **Gôm nhóm Chi tiết (BOM)**: Khi chọn mã PO gốc `APT-0102`, hệ thống tự động tổng hợp toàn bộ chi tiết linh kiện từ tất cả các lệnh con thuộc PO đó, cộng dồn tổng số lượng kế hoạch (`total_qty`).
  3. **Gôm nhóm QC (Quy cách)**: Quy cách của từng chi tiết cũng được gôm nhóm và khử trùng lặp từ tất cả các lệnh con, giúp người dùng chọn quy cách kiểm tra chính xác, không bị sót hay trùng lặp.

---

## 2. Giải pháp Kỹ thuật Chi tiết

### A. Thuật toán Trích xuất Mã PO Gốc (`extract_root_po`)
Qua khảo sát toàn bộ 1.101 đơn hàng thực tế trong Database:
- Các mã có hậu tố phân đoạn thường có dạng: `APT-0102-01`, `APT-0102-26`, `ADV-0406-01BS`, `APT-0048-49-01`.
- Các mã gốc đã chuẩn gồm 2 phần: `ADV-0409`, `FOL-0452`, `APT-0035`.
- **Hàm chuẩn hóa Regex**:
```python
def extract_root_po(code: str) -> str:
    if not code:
        return ""
    code_clean = code.strip()
    # Nếu mã có từ 3 phần trở lên và kết thúc bằng số phân đoạn kèm chữ (vd: APT-0102-01, ADV-0406-01BS, APT-0048-49-01)
    m = re.match(r'^([A-Za-z0-9]+-\d+(?:-\d+)?)-(\d+[A-Za-z]*)$', code_clean)
    if m:
        return m.group(1)
    m2 = re.match(r'^(.*?)-(\d+[A-Za-z]*)$', code_clean)
    if m2 and len(m2.group(1).split('-')) >= 2:
        return m2.group(1)
    return code_clean
```
*Kết quả kiểm nghiệm trên Database:*
- `APT-0102-01` ... `APT-0102-26` $\rightarrow$ `APT-0102`
- `APT-0092-05` ... `APT-0092-07` $\rightarrow$ `APT-0092`
- `ADV-0406-01BS` $\rightarrow$ `ADV-0406`
- `APT-0048-49-01` $\rightarrow$ `APT-0048-49`
- `ADV-0409` $\rightarrow$ `ADV-0409` (giữ nguyên không bị cắt)
- `FOL-0452` $\rightarrow$ `FOL-0452` (giữ nguyên)

---

### B. Cập nhật Backend API `/production-v2/po-codes`
- **File**: [`BackEnd/modules/production/routes/production_v2_router.py`](file:///d:/SmartFlow/SmartFlow_v2_Test/BackEnd/modules/production/routes/production_v2_router.py)
- **Cơ chế**:
  - Khi truy vấn `Order` theo tháng hoặc từ khóa tìm kiếm (`search`), hệ thống quét các cột `order_code`, `partner_po`, `production_code`.
  - Áp dụng `extract_root_po(code)` để lấy mã PO gốc.
  - Khử trùng lặp (`seen = set()`), trả về danh sách mã PO gốc sạch sẽ và gọn gàng.
  - Khi tìm kiếm (ví dụ gõ `0102` hoặc `APT-0102-01`), API vẫn lọc trúng và trả về mã gốc `APT-0102`.

---

### C. Cập nhật Backend API Lấy BOM & QC `/production-v2/orders/{po_code}/bom`
- **File**: [`BackEnd/modules/production/routes/production_v2_router.py`](file:///d:/SmartFlow/SmartFlow_v2_Test/BackEnd/modules/production/routes/production_v2_router.py)
- **Cơ chế gom Chi tiết & QC**:
  1. Trích xuất `root_po = extract_root_po(clean_po)`.
  2. Truy vấn **toàn bộ các đơn hàng** thuộc mã gốc này:
     ```python
     matching_orders = db.query(Order).options(joinedload(Order.products)).filter(
         or_(
             Order.order_code == root_po,
             Order.order_code.ilike(f"{root_po}-%"),
             Order.partner_po == root_po,
             Order.partner_po.ilike(f"{root_po}-%"),
             Order.production_code == root_po,
             Order.production_code.ilike(f"{root_po}-%"),
             Order.order_code == f"LSX-{root_po}",
             Order.order_code.ilike(f"LSX-{root_po}-%")
         )
     ).all()
     ```
  3. Gom Chi tiết và QC theo từng loại công đoạn:
     - **Đối với công đoạn Đóng gói / Lưu kho / Thành phẩm**:
       - Thu thập toàn bộ sản phẩm hoàn chỉnh (`products`) của tất cả các đơn hàng con.
       - Gôm theo tên sản phẩm / SKU (ví dụ: tủ `1-60-BRO (APT1-60-BRO)`).
       - Cộng dồn số lượng kế hoạch `total_qty` của sản phẩm đó qua tất cả các đợt.
       - Gôm danh sách quy cách (`specs`) của sản phẩm thành danh mục quy cách duy nhất.
     - **Đối với các công đoạn sản xuất linh kiện (Tạo phôi, Định hình, Lắp ráp, Sơn, v.v.)**:
       - Lấy danh sách ID của tất cả sản phẩm thuộc các đơn hàng con.
       - Truy vấn toàn bộ linh kiện trong bảng `BOMDetail` tương ứng với các sản phẩm này.
       - Lọc linh kiện theo công đoạn đang kiểm tra (`is_matching_stage`).
       - Gôm theo tên chi tiết `part_name`:
         - Cộng dồn `total_qty` của chi tiết đó trên toàn bộ các đơn con.
         - Gôm danh mục quy cách `specs_map` (sử dụng bộ trích xuất kích thước đa tầng chuẩn xác đã có).
  4. Trả về mảng JSON các chi tiết đã gôm:
     ```json
     [
       {
         "part_name": "Chi tiết đố trước",
         "label": "Chi tiết đố trước",
         "total_qty": 350,
         "specs": [
           { "specification": "18*65*876", "qty": 200 },
           { "specification": "18*65*1524", "qty": 150 }
         ]
       }
     ]
     ```

---

### D. Cập nhật Mobile FrontEnd Controller (`useInspectionFormBase.js`)
- **File**: [`FrontEnd/Mobile/modules/production_v2/Controllers/useInspectionFormBase.js`](file:///d:/SmartFlow/SmartFlow_v2_Test/FrontEnd/Mobile/modules/production_v2/Controllers/useInspectionFormBase.js)
- **Tối ưu trải nghiệm**:
  1. **Danh sách PO**: Dropdown PO nạp danh sách đã gôm nhóm từ API (và dự phòng hàm `extractRootPo` ở FE để đảm bảo không bao giờ xuất hiện mã con trùng lặp).
  2. **Khi chọn PO (ví dụ chọn `APT-0102`)**:
     - Nạp BOM đã gôm của `APT-0102` cho công đoạn hiện tại.
     - Dropdown Chi tiết hiển thị các linh kiện duy nhất với số lượng tổng của toàn bộ PO.
  3. **Khi chọn Chi tiết**:
     - Dropdown Quy cách tự động hiển thị danh sách quy cách QC duy nhất của chi tiết đó.
     - Ô Số lượng kế hoạch (`requiredQty`) hiển thị tổng số lượng thực tế.
     - Tự động tính toán cỡ mẫu kiểm tra theo tiêu chuẩn AQL tương ứng với tổng số lượng lô hàng.
  4. **Tương thích ngược với các phiếu cũ**:
     - Khi mở xem lại phiếu đã tạo trước đây có gắn mã con (ví dụ phiếu ghi `APT-0102-04`), form vẫn hiển thị đúng mã con `APT-0102-04` của phiếu đó và nạp đúng BOM tương ứng mà không bị lỗi.

---

## 3. Các File Cần Chỉnh Sửa

| STT | File | Thay đổi chính |
|---|---|---|
| 1 | [`BackEnd/modules/production/routes/production_v2_router.py`](file:///d:/SmartFlow/SmartFlow_v2_Test/BackEnd/modules/production/routes/production_v2_router.py) | - Thêm hàm `extract_root_po`<br>- Cập nhật `/po-codes` để gôm nhóm mã gốc<br>- Cập nhật `get_order_bom` để truy vấn tất cả đơn hàng con của root PO và gôm nhóm Chi tiết + QC |
| 2 | [`FrontEnd/Mobile/modules/production_v2/Controllers/useInspectionFormBase.js`](file:///d:/SmartFlow/SmartFlow_v2_Test/FrontEnd/Mobile/modules/production_v2/Controllers/useInspectionFormBase.js) | - Tích hợp chuẩn hóa mã PO gốc trên giao diện Mobile<br>- Đảm bảo cache và xử lý Chi tiết/Quy cách gôm nhóm mượt mà |

---

## 4. Kế hoạch Kiểm thử & Xác minh (Verification Plan)

### A. Kiểm thử Tự động & Backend Test
1. Viết script test chạy trực tiếp với Database thực tế kiểm tra:
   - `get_po_codes`: Xác nhận không còn mã lặp như `APT-0102-01`, `APT-0102-02` mà chỉ còn `APT-0102`.
   - `get_order_bom` với `po_code='APT-0102'`: Xác nhận tổng số lượng chi tiết được cộng dồn chính xác từ cả 26 lệnh con, danh mục quy cách không bị trùng lặp.
   - Kiểm tra với các công đoạn khác nhau: Đóng gói (Tủ hoàn thiện) và Tạo phôi/Định hình (Chi tiết gỗ rời).

### B. Kiểm thử Giao diện Mobile & Build
1. Chạy `npm run build` trong thư mục `FrontEnd/Mobile` để đảm bảo mã nguồn JavaScript không phát sinh lỗi cú pháp hay đóng gói.
2. Kiểm tra giao diện `/production_v2/inspection/first-sample` (Mẫu đầu chuyền) và `/production_v2/inspection/daily` (Ghi nhận lỗi hằng ngày):
   - Mở dropdown "Chọn PO *": Xác nhận danh sách hiển thị `APT-0102`, `APT-0092`, `ADV-0406`... không còn lặp `-xx`.
   - Tìm kiếm `0102`: Chỉ xuất hiện `APT-0102`.
   - Chọn `APT-0102`: Danh sách Chi tiết hiển thị đầy đủ linh kiện với tổng số lượng.
   - Chọn Chi tiết: Danh sách Quy cách hiển thị gọn gàng, tự động điền số lượng kiểm tra.
