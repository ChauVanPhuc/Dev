# KẾ HOẠCH CHI TIẾT: CHUYỂN ĐỔI CHỮ SỐ ĐẦU THÀNH KÝ TỰ SERIES CHO QUY CÁCH KIỂM TRA (/production_v2/inspection/)

> **Định hướng thống nhất**:
> 1. **Quy tắc chuyển đổi**: Đơn giản hóa thay thế số đầu thành ký hiệu Series tương ứng (ví dụ: `1` -> `A`, `2` -> `T`, `7` -> `K`, `13` -> `A`, `16` -> `T1`, `21` -> `Z`...). Phần kích thước và màu sắc phía sau giữ nguyên.
> 2. **Phạm vi áp dụng**: Chỉ can thiệp vào tầng hiển thị giao diện Mobile (UI Display Layer) tại dropdown Quy cách và các badge thông tin; dữ liệu lưu trữ CSDL và API vẫn bảo toàn mã SKU gốc để đảm bảo hệ thống vận hành ổn định 100%.

---

## 1. 🔍 BẢNG QUY CHUẨN CHUYỂN ĐỔI CHÍNH THỨC (THEO ẢNH 1 & 2)

Dưới đây là bảng đối chiếu chi tiết từ các chữ số ban đầu trong CSDL/BOM sang ký tự Series hiển thị trên Mobile:

| Số đầu cũ | Ký tự mới | Dòng tủ tương ứng (Bản vẽ) | Mã SKU gốc trong CSDL | Mã hiển thị mới trên Mobile UI |
| :---: | :---: | :--- | :--- | :--- |
| **1** | **A** | Series A (Cambridge) | `1-60-BRO`, `1-66-BRO`, `1-72D-BRO` | **`A-60-BRO`**, **`A-66-BRO`**, **`A-72D-BRO`** |
| **2** | **T** | Series T (Hepburn) | `2-60-BRO`, `2-48-GRY`, `2-72D-BRO` | **`T-60-BRO`**, **`T-48-GRY`**, **`T-72D-BRO`** |
| **7** | **K** | Series Kelly | `7-60-BRO`, `7-48-WHT`, `7-66-ROA` | **`K-60-BRO`**, **`K-48-WHT`**, **`K-66-ROA`** |
| **8** | **B** | Series Monroe | `8-60-BRO`, `8-48-WHT`, `8-66-MNB` | **`B-60-BRO`**, **`B-48-WHT`**, **`B-66-MNB`** |
| **9** | **S** | Series Magnolia | `9-60-BRO`, `9-48-WHT`, `9-72D-VGN` | **`S-60-BRO`**, **`S-48-WHT`**, **`S-72D-VGN`** |
| **10** | **R** | Series Bayhill | `10-48-WHT`, `10-60-BRO` | **`R-48-WHT`**, **`R-60-BRO`** |
| **11** | **P** | Series Milan | `11-60-BRO`, `11-48-WHT`, `11-54-SAN` | **`P-60-BRO`**, **`P-48-WHT`**, **`P-54-SAN`** |
| **12** | **L** | Series Lucia | `12-60-BRO`, `12-48-WHT`, `12-54-WOA` | **`L-60-BRO`**, **`L-48-WHT`**, **`L-54-WOA`** |
| **13** | **A** | Linen Closet Series A | `13-2065-BRO`, `13-2065-WHT` | **`A-2065-BRO`**, **`A-2065-WHT`** |
| **14** | **T** | Linen Closet Series T | `14-2065-BRO`, `14-2065-GRY` | **`T-2065-BRO`**, **`T-2065-GRY`** |
| **15** | **P** | Linen Closet Series P | `15-2065-BRO`, `15-2065-SAN` | **`P-2065-BRO`**, **`P-2065-SAN`** |
| **16** | **T1** | Wall Cabinet Hepburn T1 | `16-3123-GRY`, `16-3123-WHT` | **`T1-3123-GRY`**, **`T1-3123-WHT`** |
| **17** | **T2** | Wall Cabinet Hepburn T2 | `17-2621-GRY`, `17-2621-WOA` | **`T2-2621-GRY`**, **`T2-2621-WOA`** |
| **18** | **P1** | Wall Cabinet Milan P1 | `18-3123-WC-BLK`, `18-3123-WC-SAN`| **`P1-3123-WC-BLK`** |
| **19** | **X** | Series West | `19-60-BRO`, `19-72D-MCA` | **`X-60-BRO`**, **`X-72D-MCA`** |
| **20** | **MIRROR** | Series Mirror | `20-` (các mã gương) | **`MIRROR-...`** (hoặc `M-...`) |
| **21** | **Z** | Series Loren | `21-60-BRO`, `21-72D-BRO` | **`Z-60-BRO`**, **`Z-72D-BRO`** |
| **22** | **FILLER** | Thanh Filler tủ | `22-` | **`FILLER-...`** |
| **23** | **L** | Linen Closet Series L | `23-1458-...` | **`L-1458-...`** |
| **24** | **X** | Linen Closet Series X | `24-1458-...` | **`X-1458-...`** |
| **APTU** | **U** | Khung tủ APTU | `APTU60-BF-BLK` | **`U-60-BF-BLK`** |
| **APTV** | **V** | Khung tủ APTV | `APTV60-BF-BLK` | **`V-60-BF-BLK`** |

---

## 2. 📍 CÁC MÀN HÌNH ÁP DỤNG TRONG `/production_v2/inspection/`

Tất cả các phiếu kiểm tra trên Mobile đều dùng chung Hook điều khiển `useInspectionFormBase.js` và Component Dropdown `FormMultiSearchSelect.jsx`:

1. **Phiếu kiểm tra mẫu lần đầu (CL09.1)**:
   - Route: `/production_v2/inspection/first-sample` & `/production_v2/inspection/first-sample/:id`
   - File: [CL09A_FirstSampleView.jsx](file:///c:/Product/SmartFlow/SmartFlow/SmartFlow_v2_Test/FrontEnd/Mobile/modules/production_v2/Views/CL09A_FirstSampleView.jsx) & [FirstSampleReInspectForm.jsx](file:///c:/Product/SmartFlow/SmartFlow/SmartFlow_v2_Test/FrontEnd/Mobile/modules/production_v2/Views/components/FirstSampleReInspectForm.jsx)
   - Vị trí: Dropdown chọn "Quy cách" (như Ảnh 3 người dùng cung cấp).

2. **Phiếu kiểm tra lại (CL09.2)**:
   - Route: `/production_v2/inspection/re-inspect` & `/production_v2/inspection/re-inspect/:id`
   - File: [CL09B_ReInspectView.jsx](file:///c:/Product/SmartFlow/SmartFlow/SmartFlow_v2_Test/FrontEnd/Mobile/modules/production_v2/Views/CL09B_ReInspectView.jsx)
   - Vị trí: Dropdown chọn "Quy cách".

3. **Phiếu kiểm tra thông số (CL09.3)**:
   - Route: `/production_v2/inspection/parameter` & `/production_v2/inspection/parameter/:id`
   - File: [CL09C_ParameterView.jsx](file:///c:/Product/SmartFlow/SmartFlow/SmartFlow_v2_Test/FrontEnd/Mobile/modules/production_v2/Views/CL09C_ParameterView.jsx)
   - Vị trí: Dropdown chọn "Quy cách".

4. **Phiếu kiểm tra hằng ngày / Tuần tra (CL09.6)**:
   - Route: `/production_v2/inspection/daily` & `/production_v2/inspection/daily/:id`
   - File: [CL09F_DailyInspectionView.jsx](file:///c:/Product/SmartFlow/SmartFlow/SmartFlow_v2_Test/FrontEnd/Mobile/modules/production_v2/Views/CL09F_DailyInspectionView.jsx)
   - Vị trí: Dropdown chọn "Quy cách".

---

## 3. ⚙️ KIẾN TRÚC KỸ THUẬT & CÁCH THỨC TRIỂN KHAI

### 3.1. Tạo Module Tiện ích: `cabinetSeriesMapper.js`
Đường dẫn: `FrontEnd/Mobile/modules/production_v2/utils/cabinetSeriesMapper.js`

**Logic chuyển đổi regex tối ưu**:
```javascript
const PREFIX_MAP = {
  '1': 'A',
  '2': 'T',
  '7': 'K',
  '8': 'B',
  '9': 'S',
  '10': 'R',
  '11': 'P',
  '12': 'L',
  '13': 'A',
  '14': 'T',
  '15': 'P',
  '16': 'T1',
  '17': 'T2',
  '18': 'P1',
  '19': 'X',
  '20': 'MIRROR',
  '21': 'Z',
  '22': 'FILLER',
  '23': 'L',
  '24': 'X',
}

export const formatCabinetSeriesTag = (rawTag, fallback = '') => {
  if (!rawTag) return fallback
  
  // 1. Cắt bỏ tiền tố mã PO như "APT-0102-01 | ", "APT-0090-38 | "
  let cleaned = String(rawTag).replace(/^[A-Za-z0-9]+-\d+(?:-[A-Za-z0-9]+)?\s*\|\s*/i, '').trim()

  // 2. Bỏ phần trong ngoặc nếu lặp
  const mParen = cleaned.match(/^([^(]+?)\s*\(([^)]+)\)$/)
  if (mParen) {
    const c1 = mParen[1].replace(/^APT[-_]?/i, '').trim().toLowerCase()
    const c2 = mParen[2].replace(/^APT[-_]?/i, '').trim().toLowerCase()
    if (c1 === c2) cleaned = mParen[1].trim()
  }

  // 3. Khung U / V
  if (/^APTU/i.test(cleaned)) return cleaned.replace(/^APTU[-_]?/i, 'U-')
  if (/^APTV/i.test(cleaned)) return cleaned.replace(/^APTV[-_]?/i, 'V-')

  // 4. Bóc tách chữ số đầu: "1-60-BRO" -> numPrefix="1", rest="60-BRO"
  const m = cleaned.match(/^(?:APT[-_]?)?(\d+)[-_](.+)$/i)
  if (m && PREFIX_MAP[m[1]]) {
    return `${PREFIX_MAP[m[1]]}-${m[2]}`
  }

  return cleaned || fallback
}
```

### 3.2. Cập nhật `useInspectionFormBase.js`
- Tích hợp `formatCabinetSeriesTag` trực tiếp vào hàm `cleanCabinetTag`.
- Gán thuộc tính `badge` hiển thị là mã chữ mới (ví dụ `A-60-BRO`), trong khi `opt.value` và dữ liệu gốc vẫn lưu giữ đầy đủ ID và SKU gốc.

### 3.3. Tối ưu Dropdown `FormMultiSearchSelect.jsx`
- Hiển thị badge: Dưới kích thước `876*546*1524` sẽ hiển thị badge xanh `A-60-BRO`.
- **Tìm kiếm 2 chiều (Bidirectional Search)**:
  - Cho phép người dùng gõ cả mã mới (ví dụ: `A-60`, `A-`, `BRO`)
  - HOẶC gõ mã số cũ (ví dụ: `1-60`, `2-60`) đều tìm ra đúng dòng quy cách cần chọn.

---

## 4. 🚀 CÁC BƯỚC THỰC HIỆN CHI TIẾT (ACTION PLAN)

| Bước | Nhiệm vụ | File tác động | Mục tiêu hoàn thành |
| :---: | :--- | :--- | :--- |
| **1** | Tạo tiện ích `cabinetSeriesMapper.js` | `FrontEnd/Mobile/modules/production_v2/utils/cabinetSeriesMapper.js` | Khởi tạo bảng mapping và hàm regex chuyển đổi số -> chữ |
| **2** | Cập nhật hook `useInspectionFormBase.js` | `FrontEnd/Mobile/modules/production_v2/Controllers/useInspectionFormBase.js` | Đồng bộ hiển thị badge cho dropdown Quy cách |
| **3** | Cập nhật tìm kiếm `FormMultiSearchSelect.jsx` | `FrontEnd/Mobile/Shared/Views/components/form/FormMultiSearchSelect.jsx` | Hỗ trợ tìm kiếm thông minh cả mã chữ mới và mã số cũ |
| **4** | Kiểm thử giao diện Mobile trên cả 4 form | CL09A, CL09B, CL09C, CL09F | Xác nhận PO APT-0102 hiển thị `A-60-BRO`, `A-66-BRO`, `A-72D-BRO` chuẩn đẹp |
| **5** | Nghiệm thu và bàn giao | Toàn hệ thống | Báo cáo hoàn tất tới người dùng |
