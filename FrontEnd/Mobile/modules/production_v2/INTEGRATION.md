# HƯỚNG DẪN TÍCH HỢP MODULE production_v2

Thêm đoạn code sau vào từng file:

---

## 1. vite.config.js — thêm alias

```js
import path from 'path'

// Trong resolve.alias thêm:
'@modules/production_v2': path.resolve(__dirname, 'modules/production_v2'),
```

---

## 2. App.jsx — thêm imports + routes

```jsx
// === IMPORTS ===
import CL06_TransferListView    from './modules/production_v2/Views/CL06_TransferListView'
import CL07_TransferCreateView  from './modules/production_v2/Views/CL07_TransferCreateView'
import CL08_InspectionListView  from './modules/production_v2/Views/CL08_InspectionListView'
import CL09_InspectionCreateView from './modules/production_v2/Views/CL09_InspectionCreateView'

// === ROUTES (trong <Routes> hoặc router config) ===
<Route path="/production_v2/transfer-list"     element={<CL06_TransferListView />} />
<Route path="/production_v2/transfer/:id?"     element={<CL07_TransferCreateView />} />
<Route path="/production_v2/inspection-list"   element={<CL08_InspectionListView />} />
<Route path="/production_v2/inspection/:id?"   element={<CL09_InspectionCreateView />} />
```

---

## 3. ProtectedRoute.jsx — thêm permission mapping

```js
// Trong object ROUTE_PERMISSION_MAP thêm:
'/production_v2/transfer-list':     'mobile_production_v2_transfer_list',
'/production_v2/transfer':          'mobile_production_v2_transfer_create',
'/production_v2/inspection-list':   'mobile_production_v2_inspection_list',
'/production_v2/inspection':        'mobile_production_v2_inspection_create',
```

---

## 4. MobileSidebar.jsx — thêm menu group

Trong mảng fallback menu items (hoặc template dùng khi server chưa trả về), thêm:

```js
{
  id: 'production-v2-group',
  title: 'Thông tin sản xuất v2',
  icon: 'Users',
  children: [
    {
      id: 'pv2-transfer',
      title: 'Lịch sử luân chuyển',
      route_path: '/production_v2/transfer-list',
      icon: 'Truck',
    },
    {
      id: 'pv2-inspection',
      title: 'Kiểm tra chất lượng',
      route_path: '/production_v2/inspection-list',
      icon: 'ClipboardCheck',
    },
  ],
},
```
