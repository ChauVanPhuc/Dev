# Kế Hoạch Kỹ Thuật: Tách Danh Sách Quy Cách Theo Từng Tủ / Đơn Con (List Đơn Ra) Trong Mobile QC

---

## 1. Bối Cảnh & Vấn Đề

### 1.1. Hiện trạng
Sau khi gôm nhóm PO gốc (ví dụ `APT-0092`), đơn hàng bao gồm **7 Lệnh con** (`APT-0092-01` đến `APT-0092-07`) với nhiều dòng tủ khác nhau (`1-36L-WOA`, `1-36R-WOA`, `1-42L-WOA`, `1-48-WOA`, `1-60-WOA`, `1-66D-WOA`, `1-72D-WOA`...).

Khi chọn chi tiết **"Hông tủ"**:
* Nhiều loại tủ cùng dùng chung kích thước quy cách `50*50*876`.
* Hiện tại hệ thống đang gộp tất cả các tủ này vào **1 dòng duy nhất**:
  * Dòng hiển thị: `50*50*876` kèm một badge dài ngoằng nối bằng dấu phẩy: `1-36L-WOA (APT1-36L-WOA), 1-36R-WOA (A...`
* **Hậu quả**:
  1. Nhãn bị cắt cụt (`...`), người dùng không xem được hết các tủ.
  2. Nhân viên QC **không thể chọn kiểm tra riêng từng đơn con / từng loại tủ cụ thể** trong ca sản xuất, vì chỉ có 1 ô tích chọn duy nhất đại diện cho toàn bộ các đơn.
  3. Số lượng cần kiểm (`requiredQty`) bị cộng dồn toàn bộ thay vì theo đúng đơn/tủ đang kiểm.

### 1.2. Mục Tiêu Cần Đạt ("List đơn ra")
1. **Tách riêng từng dòng** trong dropdown Quy cách theo từng **Đơn con (Order) + Loại tủ (SKU)**:
   * Ví dụ:
     * Dòng 1: `50*50*876` - Huy hiệu: `[APT-0092-01 | 1-36L-WOA (APT1-36L-WOA)]` (SL: 40)
     * Dòng 2: `50*50*876` - Huy hiệu: `[APT-0092-01 | 1-36R-WOA (APT1-36R-WOA)]` (SL: 48)
     * Dòng 3: `50*50*876` - Huy hiệu: `[APT-0092-01 | 1-42L-WOA (APT1-42L-WOA)]` (SL: 72)
     * Dòng 4: `50*50*876` - Huy hiệu: `[APT-0092-02 | 1-48-WOA (APT1-48-WOA)]` (SL: 180)
     * ...
2. **Chọn lọc độc lập**: Cho phép QC tích chọn 1 hoặc nhiều đơn/tủ cần kiểm tra.
3. **Tự động tính SL cần kiểm & Cỡ mẫu AQL**:
   * Khi tích chọn dòng nào, hệ thống tính tổng số lượng (`requiredQty`) theo đúng các dòng được chọn.
   * Cỡ mẫu kiểm tra AQL (`sampleQty`) tự động nhảy theo số lượng thực tế của các đơn/tủ đã chọn.
4. **Tìm kiếm siêu nhanh**: Ô tìm kiếm trong dropdown hỗ trợ tìm theo kích thước (`50*50*876`), mã đơn (`01`, `0092-01`), hoặc tên tủ (`36L`).

---

## 2. Thiết Kế Kiến Trúc & Luồng Dữ Liệu

```mermaid
flowchart TD
    subgraph DB [Database]
        O1[Order: APT-0092-01, Product: 1-36L-WOA]
        O2[Order: APT-0092-01, Product: 1-36R-WOA]
        O3[Order: APT-0092-02, Product: 1-48-WOA]
    end

    subgraph Backend [FastAPI - production_v2_router.py]
        API["GET /orders/{po_code}/bom"]
        API --> MapOrder[Ánh xạ product_id -> order_code]
        MapOrder --> SplitSpecs[Tách specs theo từng order_code & product]
        SplitSpecs --> ReturnJSON["Trả về specs: [{specification, order_code, product_name, product_sku, product_label, badge, qty}]"]
    end

    subgraph Controller [Mobile - useInspectionFormBase.js]
        ReturnJSON --> BuildOptions[Tạo specOptions với value duy nhất per row]
        BuildOptions --> CalcLotSize[Tính requiredQty theo các dòng được chọn]
        CalcLotSize --> AQLLookup[Tự động tra cứu cỡ mẫu AQL chính xác]
    end

    subgraph UI [FormMultiSearchSelect.jsx]
        BuildOptions --> RenderRows[Hiển thị từng dòng với Badge Mã đơn | Tên tủ]
        RenderRows --> SearchFilter[Lọc nhanh theo mã đơn / tên tủ / quy cách]
    end
```

---

## 3. Các Thay Đổi Cụ Thể

### 3.1. Backend ([`production_v2_router.py`](file:///d:/SmartFlow_v2_Test/BackEnd/modules/production/routes/production_v2_router.py))
* **Trong API `GET /orders/{po_code}/bom`**:
  * Tạo map `prod_order_map: {p.id: order.order_code}` từ `matching_orders`.
  * Thay vì gom tất cả sản phẩm cùng quy cách vào 1 key duy nhất trong `specs_map`, ta tách theo bộ khóa: `(specification, order_code, product_sku)`.
  * Mỗi phần tử trong `specs` trả về:
    * `specification`: Kích thước thuần (ví dụ `50*50*876`).
    * `qty`: Số lượng chi tiết cho đơn/tủ đó.
    * `order_code`: Mã đơn con (ví dụ `APT-0092-01`).
    * `product_name`: Tên tủ (ví dụ `1-36L-WOA`).
    * `product_sku`: SKU tủ (ví dụ `APT1-36L-WOA`).
    * `product_label`: `APT-0092-01 | 1-36L-WOA (APT1-36L-WOA)` (hoặc chỉ tên tủ nếu đơn hàng đơn lẻ).
    * `badge`: `APT-0092-01 | 1-36L-WOA (APT1-36L-WOA)`.
  * Áp dụng nhất quán cho cả 3 tầng: Đóng gói (Thành phẩm Tủ), Công đoạn sản xuất (BOMDetail linh kiện), và MasterBOM fallback.

### 3.2. Frontend Controller ([`useInspectionFormBase.js`](file:///d:/SmartFlow_v2_Test/FrontEnd/Mobile/modules/production_v2/Controllers/useInspectionFormBase.js))
* **Tạo `specOptions` với `value` duy nhất**:
  * Gán `value: ${s.specification}__${s.order_code || ''}__${s.product_sku || ''}`.
  * Gán `label: s.specification`.
  * Gán `rawSpec: s.specification`.
  * Gán `badge: s.badge || s.product_label`.
  * Gán `qty: s.qty`.
* **Xử lý `handleMultiSpecChange`**:
  * Lưu trữ danh sách key đã chọn trong `selectedSpecs`.
  * Trích xuất các kích thước thuần (`rawSpec`) không trùng lặp đưa vào `spec` để lưu phiếu kiểm tra.
  * Tự động cộng dồn `requiredQty` từ các dòng được chọn:
    `requiredQty = sum(selectedOptions.map(opt => opt.qty))`
  * Tự động kích hoạt tra cứu mốc lấy mẫu AQL (`sampleQty`) theo số lượng thực tế vừa tính.

### 3.3. Frontend Component ([`FormMultiSearchSelect.jsx`](file:///d:/SmartFlow_v2_Test/FrontEnd/Mobile/Shared/Views/components/form/FormMultiSearchSelect.jsx))
* **Cải tiến bộ lọc tìm kiếm (`filteredOptions`)**:
  * Cho phép tìm kiếm cả trong `opt.badge` và `opt.order_code`. Khi người dùng gõ `01`, `36L`, hay `WOA`, các dòng tương ứng sẽ lọc ra ngay lập tức.
* **Tối ưu hiển thị Badge**:
  * Hiển thị badge xanh gọn gàng với `whiteSpace: 'nowrap'`, không bị cắt cụt.

---

## 4. Kế Hoạch Kiểm Thử (Verification Plan)

### 4.1. Automated Tests
* Chạy `python BackEnd/scripts/test_po_grouping_bom.py`:
  * Xác minh endpoint `/orders/APT-0102/bom` và `/orders/APT-0092/bom` trả về danh sách `specs` được phân tách theo từng đơn con và loại tủ.
  * Xác minh tất cả các trường `specification`, `qty`, `order_code`, `product_label` đều đầy đủ và chính xác.
* Chạy `npm run build` trong `FrontEnd/Mobile`:
  * Xác minh không có lỗi cú pháp hoặc typing trong React/Vite.

### 4.2. Manual Verification
* Mở giao diện Mobile QC, chọn PO `APT-0092`, Chi tiết `Hông tủ`.
* Mở dropdown `Quy cách *`:
  * Xác nhận danh sách hiển thị từng dòng riêng biệt kèm huy hiệu `APT-0092-01 | 1-36L-WOA (APT1-36L-WOA)`.
  * Tích chọn 1 dòng: `SL Cần Kiểm` hiển thị số lượng của dòng đó, `SL mẫu` tính đúng theo AQL.
  * Tích chọn 2 dòng: `SL Cần Kiểm` cộng dồn số lượng của cả 2 dòng.
  * Gõ từ khóa `36L` hoặc `01` vào ô tìm kiếm: chỉ lọc ra các dòng khớp.
