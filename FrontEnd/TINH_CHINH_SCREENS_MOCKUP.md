# 📋 ĐỀ XUẤT TINH CHỈNH TRANG /admin/screens THEO MOCKUP

## 🎯 MỤC TIÊU
Cải thiện giao diện quản lý màn hình và lỗi hệ thống theo mockup design mới, tập trung vào:
1. **Danh sách màn hình** (HD02 - Ảnh 1)
2. **Đặc tả màn hình chi tiết** (HD03 - Ảnh 2, 6)
3. **Modal báo lỗi** (HD04 - Ảnh 3, 4)
4. **Danh sách lỗi expanded** (Ảnh 5)
5. **Danh sách lỗi hệ thống** (HD06 - Ảnh 7) ✅ Đã có
6. **Tiến độ thực hiện** (HD07 - Ảnh 8)

---

## 📊 PHÂN TÍCH MOCKUP CHI TIẾT

### **ẢNH 1: HD02 - Danh sách màn hình**
**Route**: `/admin/screens`  
**File**: `ScreenManagementView.jsx`

#### **Cấu trúc hiện tại vs Mockup:**

**Stats Cards (4 cards):**
- ✅ Tiến độ xây dựng: 30/500 (25%)
- ✅ Tiến độ chính sửa: 30/500 (25%)
- ✅ Tiến độ khắc phục: 30/500 (25%)
- ✅ Lỗi khẩn cấp: 30/500 (25%)

**Toolbar:**
- ✅ Search: "Nhập Mã, Tên màn"
- ✅ Sort icon (A-Z)
- ✅ Filter icon
- ✅ Nút "Khác" (dropdown)
- ✅ Nút "Nhập dữ liệu"
- ✅ Nút "Xuất dữ liệu"
- ✅ Nút "+ Thêm mới"

**Table Columns:**
```
Mã | Tên | Phân hệ | Nền tảng | Ngày thiết kế | Ngày cập nhật | Lỗi | Mô tả | Thao tác
```

**Cần thay đổi:**
1. Thêm cột "Lỗi" hiển thị số lượng bugs
2. Thêm icon "..." menu thao tác cho mỗi row
3. Pagination footer: "Show 1 to 10 of 20 results"

---

### **ẢNH 2 & 6: HD03 - Đặc tả màn hình**
**Route**: `/admin/screens/:id` hoặc `/admin/screens/new`  
**File**: `ScreenDetailView.jsx`

#### **Layout 3 phần:**

**1. Thông tin màn hình (Top Card):**
```
Header Row:
- Phân hệ: [Dropdown] Quản lý hệ thống
- Nền tảng: [Dropdown] Web
- Trạng thái: [Dropdown] Mới Thiết Kế
- Nút "Báo lỗi"

Body Grid (4 columns):
- Mã màn hình (disabled, auto-gen)
- Tên màn hình *
- Đường dẫn * (prefix + input)
- Ngày hoàn thành dự kiến *

Bottom Row:
- Mô tả * (full width)
```

**2. Middle Split Layout:**

**Left Panel (280px):**
- **Tab 1: Thành phần**
  - List components với icon
  - Menu "..." cho mỗi item (Báo lỗi | Xóa)
  - Nút "+ Thêm thành phần"
  
- **Tab 2: Hướng dẫn sử dụng**
  - List steps: "Bước 1: Hành động a"
  - Controls: ▲ ▼ ✕
  - Nút "+ Thêm bước"

**Right Panel:**
- **Mockup Viewer** (expandable)
  - Icon "☰" toggle expand
  - Nút "+ Thêm ảnh"
  - Image carousel với pagination
  - Nút "Xóa ảnh"

- **Thông tin đặc tả** (Bottom card)
  - Khi tab = "Hướng dẫn sử dụng":
    - Bước (dropdown)
    - Tên nội dung *
    - Các thành phần liên quan (multi-select)
    - Mô tả chi tiết (textarea)
  
  - Khi tab = "Thành phần":
    - View switcher: Frontend | Luồng xử lý | Backend ▾
    - Mô tả (textarea)

**3. Bottom: Danh sách lỗi (Collapsible)**
- Header: "DANH SÁCH LỖI" + badge count
- Table với expandable rows
- Columns: Mã | Component | Mô tả | Mức độ | Trạng thái | Ngày cập nhật | Người cập nhật | Ngày ghi nhận | THAO TÁC

**✅ Đã implement đầy đủ!**

---

### **ẢNH 3-4: HD04 - Modal báo lỗi chi tiết**

#### **Cấu trúc Modal:**

**Header:**
```
HD04: Thông tin chi tiết lỗi                    [X]
```

**Form Fields (2 columns):**

**Row 1:**
- Màn hình: [Dropdown] HD02-1.1: Đặc tả màn hình
- Trạng thái: Mới (disabled)

**Row 2:**
- Component: [Dropdown] Nút A
- Mức độ: [Dropdown] Khẩn cấp

**Row 3:**
- Mô tả lỗi * (textarea)

**Row 4:**
- Image upload area (placeholder)

**Row 5 (2 columns):**
- Người ghi nhận: [Dropdown] Phúc
- Thời gian ghi nhận: [Date picker]

**Row 6 (2 columns):**
- Người xử lý: [Dropdown] Phúc
- Ngày yêu cầu hoàn thành: [Date picker]

**Row 7:**
- Phản hồi * (textarea)

**Row 8:**
- 2 image upload placeholders

**Footer:**
- Nút "Hủy bỏ"
- Nút "Xác nhận"

**Cần implement:**
- Modal này khác với modal hiện tại
- Cần tạo component mới hoặc refactor modal bug

---

### **ẢNH 5: Danh sách lỗi Expanded**

**Khi expand row trong table:**

**Layout:**
- **3 image thumbnails** (120x80px) - Ảnh gốc
- **Text box phản hồi:**
  - Header: "Phản hồi từ [vị trí - họ tên]" | "10:00 | 10/07/2026"
  - Content: Nội dung phản hồi

**Multiple updates:**
- Mỗi update có 3 ảnh + text box
- Hiển thị theo timeline

**✅ Đã implement trong ScreenDetailView!**

---

### **ẢNH 7: HD06 - Danh sách lỗi hệ thống** ✅

**Route**: `/admin/screens/bugs`  
**File**: `ScreenBugManagementView.jsx`

**✅ Đã có đầy đủ:**
- Stats cards (4 cards)
- Search: "Nhập mã lỗi, mã màn hình, tên màn hình"
- Table columns đúng mockup
- Master-Detail layout

**Chỉ cần tinh chỉnh nhỏ:**
1. Đảm bảo column "Tên màn hình" hiển thị đầy đủ
2. Column "Component" hiển thị tag từ description

---

### **ẢNH 8: HD07 - Tiến độ thực hiện**

**Route**: `/admin/screens/progress`  
**File**: `ProjectProgressView.jsx`

**Cấu trúc:**
- Stats cards (4 cards giống HD06)
- Search: "Nhập Họ và tên hoặc Mã NV"
- Filter dropdown: "Phân hệ: Quản lý hệ thống" (80% progress bar)

**Table Columns:**
```
Mã | Màn hình | Mô tả | Trạng thái | Lỗi sửa | Ngày cập nhật | Người cập nhật | Tiến độ | Thao tác
```

**Tiến độ column:**
- Progress bar với % (50%)

**Cần kiểm tra:**
- File này có tồn tại không?
- Nếu chưa có, cần tạo mới

---

## 🔧 CÁC THAY ĐỔI CẦN THỰC HIỆN

### **1. ScreenManagementView.jsx (HD02)**

#### **Thêm cột "Lỗi" vào table:**

```jsx
// Trong table header
<th>Lỗi</th>

// Trong table body
<td>
  {screen.bugs_count > 0 ? (
    <span style={{
      backgroundColor: '#FEF2F2',
      color: '#EF4444',
      padding: '2px 8px',
      borderRadius: '10px',
      fontSize: '0.75rem',
      fontWeight: 'bold'
    }}>
      {screen.bugs_count}
    </span>
  ) : (
    <span style={{ color: '#10B981', fontSize: '0.75rem' }}>✓</span>
  )}
</td>
```

#### **Thêm action menu cho mỗi row:**

```jsx
<td onClick={(e) => e.stopPropagation()}>
  <button
    onClick={(e) => {
      e.stopPropagation();
      setActiveMenu(activeMenu === screen.id ? null : screen.id);
    }}
  >
    <MoreVertical size={16} />
  </button>
  {activeMenu === screen.id && (
    <div className="action-menu">
      <button onClick={() => navigate(`/admin/screens/${screen.id}`)}>
        Chi tiết
      </button>
      <button onClick={() => handleCopyScreen(screen.id)}>
        Sao chép
      </button>
      <button onClick={() => handleDeleteScreen(screen.id)}>
        Xóa
      </button>
    </div>
  )}
</td>
```

---

### **2. ScreenDetailView.jsx (HD03)**

**✅ Đã hoàn chỉnh theo mockup!**

**Chỉ cần kiểm tra:**
- Nút "Báo lỗi" trong header card
- Tab switching hoạt động đúng
- Multi-select components trong guides

---

### **3. Bug Modal Component (HD04)**

**Tạo component mới: `BugDetailModal.jsx`**

```jsx
const BugDetailModal = ({ show, onClose, bug, screens, onSubmit }) => {
  const [formData, setFormData] = useState({
    screen_id: '',
    component_id: '',
    severity: 'Medium',
    description: '',
    reporter: getCurrentUser(),
    assignee: '',
    reported_at: new Date().toISOString().split('T')[0],
    requested_at: '',
    notes: '',
    images: [],
    reply_images: []
  });

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ width: '660px' }}>
        <div className="modal-header">
          <h3>HD04: Thông tin chi tiết lỗi</h3>
          <button onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {/* Row 1: Màn hình & Trạng thái */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label>Màn hình</label>
              <select value={formData.screen_id} onChange={...}>
                {screens.map(s => (
                  <option value={s.id}>
                    {s.current_code}: {s.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Trạng thái</label>
              <input value="Mới" disabled />
            </div>
          </div>

          {/* Row 2: Component & Mức độ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label>Component</label>
              <select value={formData.component_id} onChange={...}>
                <option value="Chung">Chung</option>
                {selectedScreen?.components.map(c => (
                  <option value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Mức độ</label>
              <select value={formData.severity} onChange={...}>
                <option value="Critical">Khẩn cấp</option>
                <option value="High">Cao</option>
                <option value="Medium">Trung bình</option>
                <option value="Low">Thấp</option>
              </select>
            </div>
          </div>

          {/* Row 3: Mô tả lỗi */}
          <div>
            <label>Mô tả lỗi *</label>
            <textarea rows="3" value={formData.description} onChange={...} />
          </div>

          {/* Row 4: Image upload */}
          <div>
            <ImageUploadArea
              images={formData.images}
              onUpload={(urls) => setFormData({...formData, images: urls})}
            />
          </div>

          {/* Row 5: Người ghi nhận & Thời gian */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label>Người ghi nhận</label>
              <select value={formData.reporter} onChange={...}>
                {users.map(u => <option value={u.full_name}>{u.full_name}</option>)}
              </select>
            </div>
            <div>
              <label>Thời gian ghi nhận</label>
              <input type="date" value={formData.reported_at} onChange={...} />
            </div>
          </div>

          {/* Row 6: Người xử lý & Ngày yêu cầu */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label>Người xử lý</label>
              <select value={formData.assignee} onChange={...}>
                {itUsers.map(u => <option value={u.full_name}>{u.full_name}</option>)}
              </select>
            </div>
            <div>
              <label>Ngày yêu cầu hoàn thành</label>
              <input type="date" value={formData.requested_at} onChange={...} />
            </div>
          </div>

          {/* Row 7: Phản hồi */}
          <div>
            <label>Phản hồi *</label>
            <textarea rows="3" value={formData.notes} onChange={...} />
          </div>

          {/* Row 8: Reply images */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <ImageUploadPlaceholder />
            <ImageUploadPlaceholder />
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose}>Hủy bỏ</button>
          <button onClick={handleSubmit}>Xác nhận</button>
        </div>
      </div>
    </div>
  );
};
```

---

### **4. ProjectProgressView.jsx (HD07)**

**Kiểm tra file tồn tại:**

```bash
# Nếu chưa có, cần tạo mới
M:\ERP\FrontEnd\Web\modules\System\Views\ProjectProgressView.jsx
```

**Cấu trúc:**

```jsx
const ProjectProgressView = () => {
  const [screens, setScreens] = useState([]);
  const [subsystemFilter, setSubsystemFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats cards giống HD06
  const stats = {
    buildProgress: 25,
    editProgress: 25,
    fixProgress: 25,
    criticalProgress: 25
  };

  return (
    <div>
      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Toolbar */}
      <div className="toolbar">
        <input
          placeholder="Nhập Họ và tên hoặc Mã NV"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        {/* Subsystem filter với progress bar */}
        <div className="subsystem-filter">
          <label>Phân hệ:</label>
          <select value={subsystemFilter} onChange={...}>
            <option value="All">Tất cả</option>
            <option value="Quản lý hệ thống">Quản lý hệ thống</option>
            {/* ... */}
          </select>
          <div className="progress-bar">
            <div style={{ width: '80%' }} />
          </div>
          <span>80%</span>
        </div>
      </div>

      {/* Table */}
      <table>
        <thead>
          <tr>
            <th>Mã</th>
            <th>Màn hình</th>
            <th>Mô tả</th>
            <th>Trạng thái</th>
            <th>Lỗi sửa</th>
            <th>Ngày cập nhật</th>
            <th>Người cập nhật</th>
            <th>Tiến độ</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {screens.map(screen => (
            <tr key={screen.id}>
              <td>{screen.current_code}</td>
              <td>{screen.title}</td>
              <td>{screen.subtitle}</td>
              <td>{screen.status}</td>
              <td>{screen.bugs_resolved}/{screen.bugs_total}</td>
              <td>{formatDate(screen.updated_at)}</td>
              <td>{screen.updated_by}</td>
              <td>
                <div className="progress-bar">
                  <div style={{ width: `${screen.progress}%` }} />
                </div>
                <span>{screen.progress}%</span>
              </td>
              <td>
                <button>...</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## ✅ CHECKLIST THỰC HIỆN

### **Ưu tiên cao:**

- [ ] **ScreenManagementView.jsx**
  - [ ] Thêm cột "Lỗi" vào table
  - [ ] Thêm action menu "..." cho mỗi row
  - [ ] Fetch bugs_count từ API

- [ ] **BugDetailModal.jsx**
  - [ ] Tạo component mới theo mockup HD04
  - [ ] Integrate vào ScreenDetailView
  - [ ] Integrate vào ScreenBugManagementView

- [ ] **ProjectProgressView.jsx**
  - [ ] Kiểm tra file tồn tại
  - [ ] Tạo mới nếu chưa có
  - [ ] Implement theo mockup HD07

### **Ưu tiên trung bình:**

- [ ] **ScreenDetailView.jsx**
  - [ ] Kiểm tra nút "Báo lỗi" trong header
  - [ ] Test tab switching
  - [ ] Test multi-select components

- [ ] **ScreenBugManagementView.jsx**
  - [ ] Đảm bảo column widths đúng mockup
  - [ ] Test master-detail layout

### **Ưu tiên thấp:**

- [ ] **Styling refinements**
  - [ ] Đồng bộ màu sắc theo design system
  - [ ] Responsive breakpoints
  - [ ] Animation transitions

---

## 🎨 DESIGN TOKENS

### **Colors:**
```css
--primary: #7B5233
--primary-light: #FAF6F0
--border: #E2E8F0, #EADCC9
--text-primary: #1E293B, #2D1A12
--text-secondary: #64748B
--text-muted: #94A3B8

--error: #EF4444
--warning: #F59E0B
--success: #10B981
--info: #3B82F6
```

### **Typography:**
```css
--font-size-xs: 0.72rem
--font-size-sm: 0.75rem
--font-size-base: 0.8rem
--font-size-lg: 0.85rem
--font-size-xl: 1.8rem

--font-weight-normal: 500
--font-weight-semibold: 600
--font-weight-bold: 700
--font-weight-extrabold: 800
```

### **Spacing:**
```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 12px
--spacing-lg: 16px
--spacing-xl: 20px
```

### **Border Radius:**
```css
--radius-sm: 6px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px
```

---

## 📝 GHI CHÚ

1. **Backend API cần hỗ trợ:**
   - `GET /screens/` → thêm field `bugs_count`
   - `GET /screens/:id` → thêm nested `bugs[]`
   - `POST /bugs/` → hỗ trợ multiple images
   - `GET /screens/progress` → endpoint mới cho HD07

2. **Component reusable:**
   - `ImageUploadArea` - Upload multiple images
   - `ProgressBar` - Hiển thị tiến độ
   - `ActionMenu` - Menu "..." dropdown
   - `StatsCard` - Card thống kê

3. **Testing checklist:**
   - [ ] Create new screen
   - [ ] Edit existing screen
   - [ ] Add component
   - [ ] Add guide step
   - [ ] Upload mockup
   - [ ] Report bug
   - [ ] Update bug status
   - [ ] Filter & search
   - [ ] Pagination
   - [ ] Export Excel

---

**Tài liệu này được tạo dựa trên phân tích 9 ảnh mockup.**  
**Ngày tạo:** 16/07/2026  
**Người tạo:** Cascade AI Assistant
