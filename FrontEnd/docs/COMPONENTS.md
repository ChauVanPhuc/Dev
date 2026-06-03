# 🧩 Component Library - SmartFlow v2

Tài liệu này mô tả chi tiết về component library của SmartFlow v2, bao gồm shared components, layout components, và business components.

---

## 📋 Mục lục (Table of Contents)

1. [Tổng quan](#-tổng-quánverview)
2. [Shared Components](#-shared-components)
3. [Layout Components](#-layout-components)
4. [Business Components](#-business-components)
5. [Component Patterns](#-component-patterns)
6. [Styling System](#-styling-system)
7. [Best Practices](#-best-practices)

---

## 🎯 Tổng quan (Overview)

### Component Categories

SmartFlow v2 có 3 loại chính của components:

1. **Shared Components** - Components dùng chung giữa Web và Mobile
2. **Layout Components** - Components cho layout (Sidebar, Header, v.v.)
3. **Business Components** - Components cho nghiệp vụ cụ thể

### Component Hierarchy

```
Shared Components (Thư viện dùng chung)
├── UI Components (Button, Input, Card, Modal...)
├── Data Components (Table, List, Grid...)
└── Utility Components (Loading, Error, Empty...)

Layout Components (Layout-specific)
├── Web Layout (Sidebar, Header, MainLayout...)
└── Mobile Layout (MobileHeader, MobileBottomNav...)

Business Components (Nghiệp vụ)
├── Plan Components (PlanCard, PlanRow...)
├── Delivery Components (DeliveryCard, DeliveryForm...)
└── QC Components (InspectionForm, ResultCard...)
```

---

## 📦 Shared Components

### 1. Button

**Location:** `shared/components/ui/Button.jsx`

```jsx
import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...props
}) => {
  const baseStyles = 'font-medium rounded-lg transition-colors';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
  };
  
  const sizes = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Đang xử lý...
        </span>
      ) : children}
    </button>
  );
};

export default Button;
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `string` | `'primary'` | Button style (primary, secondary, danger, success, outline) |
| `size` | `string` | `'medium'` | Button size (small, medium, large) |
| `disabled` | `boolean` | `false` | Disable button |
| `loading` | `boolean` | `false` | Show loading spinner |
| `onClick` | `function` | - | Click handler |

**Usage:**
```jsx
<Button variant="primary" onClick={handleSubmit}>
  Lưu
</Button>

<Button variant="danger" loading={isSubmitting}>
  Xóa
</Button>
```

### 2. Input

**Location:** `shared/components/ui/Input.jsx`

```jsx
import React from 'react';

const Input = ({
  label,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  error = '',
  disabled = false,
  required = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        {...props}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default Input;
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Input label |
| `type` | `string` | `'text'` | Input type (text, password, email, number) |
| `placeholder` | `string` | - | Placeholder text |
| `value` | `string` | - | Input value |
| `onChange` | `function` | - | Change handler |
| `error` | `string` | - | Error message |
| `disabled` | `boolean` | `false` | Disable input |
| `required` | `boolean` | `false` | Mark as required |

**Usage:**
```jsx
<Input
  label="Tên đăng nhập"
  type="text"
  placeholder="Nhập tên đăng nhập"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  error={errors.username}
  required
/>
```

### 3. Card

**Location:** `shared/components/ui/Card.jsx`

```jsx
import React from 'react';

const Card = ({
  title,
  children,
  className = '',
  footer = null,
  ...props
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`} {...props}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      )}
      <div className="card-content">{children}</div>
      {footer && (
        <div className="card-footer mt-4 pt-4 border-t">{footer}</div>
      )}
    </div>
  );
};

export default Card;
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Card title |
| `children` | `node` | - | Card content |
| `footer` | `node` | - | Card footer |
| `className` | `string` | - | Additional classes |

**Usage:**
```jsx
<Card title="Thông tin kế hoạch">
  <p>Nội dung card</p>
  <footer>
    <Button>Lưu</Button>
  </footer>
</Card>
```

### 4. Modal

**Location:** `shared/components/ui/Modal.jsx`

```jsx
import React, { useEffect } from 'react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  ...props
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    xlarge: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className={`relative bg-white rounded-lg shadow-xl ${sizes[size]} w-full mx-4 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | `false` | Modal open state |
| `onClose` | `function` | - | Close handler |
| `title` | `string` | - | Modal title |
| `children` | `node` | - | Modal content |
| `size` | `string` | `'medium'` | Modal size (small, medium, large, xlarge) |

**Usage:**
```jsx
const [isModalOpen, setIsModalOpen] = useState(false);

<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Tạo kế hoạch mới"
  size="large"
>
  <PlanForm onSubmit={handleSubmit} />
</Modal>
```

### 5. Table

**Location:** `shared/components/ui/Table.jsx`

```jsx
import React from 'react';

const Table = ({
  columns,
  data,
  onRowClick = null,
  loading = false,
  emptyMessage = 'Không có dữ liệu',
  className = ''
}) => {
  if (loading) {
    return <div className="text-center py-8">Đang tải...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-gray-500">{emptyMessage}</div>;
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `array` | - | Column definitions |
| `data` | `array` | - | Table data |
| `onRowClick` | `function` | - | Row click handler |
| `loading` | `boolean` | `false` | Loading state |
| `emptyMessage` | `string` | - | Empty state message |

**Usage:**
```jsx
const columns = [
  { key: 'code', label: 'Mã' },
  { key: 'name', label: 'Tên' },
  { key: 'status', label: 'Trạng thái', render: (value) => (
    <span className={`px-2 py-1 rounded ${value === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
      {value}
    </span>
  )}
];

<Table
  columns={columns}
  data={plans}
  onRowClick={(plan) => navigate(`/plans/${plan.id}`)}
/>
```

### 6. Select

**Location:** `shared/components/ui/Select.jsx`

```jsx
import React from 'react';

const Select = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Chọn...',
  error = '',
  disabled = false,
  required = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default Select;
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Select label |
| `options` | `array` | `[]` | Options array [{value, label}] |
| `value` | `string` | - | Selected value |
| `onChange` | `function` | - | Change handler |
| `placeholder` | `string` | `'Chọn...'` | Placeholder text |
| `error` | `string` | - | Error message |
| `disabled` | `boolean` | `false` | Disable select |
| `required` | `boolean` | `false` | Mark as required |

**Usage:**
```jsx
<Select
  label="Công đoạn"
  options={[
    { value: 'STAGE_1', label: 'Định hình' },
    { value: 'STAGE_2', label: 'Lắp ráp' }
  ]}
  value={stage}
  onChange={(e) => setStage(e.target.value)}
  required
/>
```

---

## 🏗️ Layout Components

### 1. MainLayout (Web)

**Location:** `Web/Shared/Views/components/layout/MainLayout.jsx`

```jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
```

### 2. MobileLayout

**Location:** `Mobile/Shared/Views/components/layout/MobileLayout.jsx`

```jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';

const MobileLayout = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <MobileHeader />
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default MobileLayout;
```

### 3. Sidebar (Web)

**Location:** `Web/Shared/Views/components/layout/Sidebar.jsx`

```jsx
import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/plans', label: 'Kế hoạch', icon: '📋' },
    { path: '/orders', label: 'Đơn hàng', icon: '📦' },
    { path: '/deliveries', label: 'Phiếu giao', icon: '🚚' },
    { path: '/products', label: 'Sản phẩm', icon: '🏭' },
    { path: '/system', label: 'Hệ thống', icon: '⚙️' }
  ];

  return (
    <aside className="w-64 bg-white shadow-lg">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-blue-600">SmartFlow</h1>
      </div>
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
```

---

## 💼 Business Components

### 1. PlanCard

**Location:** `Web/Plan/Views/components/PlanCard.jsx`

```jsx
import React from 'react';
import Card from '@shared/components/ui/Card';
import Button from '@shared/components/ui/Button';

const PlanCard = ({ plan, onEdit, onDelete }) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="text-sm text-gray-500">{plan.code}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${
          plan.status === 0 ? 'bg-blue-100 text-blue-800' :
          plan.status === 1 ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {plan.status === 0 ? 'Mới' : plan.status === 1 ? 'Đang làm' : 'Xong'}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        <p>📅 Tháng: {plan.month}/{plan.year}</p>
        <p>🎯 Ngày dự kiến: {new Date(plan.estimated_date).toLocaleDateString('vi-VN')}</p>
        <p>📦 Đơn hàng: {plan.orders?.length || 0}</p>
      </div>
      
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" size="small" onClick={() => onEdit(plan)}>
          Sửa
        </Button>
        <Button variant="danger" size="small" onClick={() => onDelete(plan.id)}>
          Xóa
        </Button>
      </div>
    </Card>
  );
};

export default PlanCard;
```

### 2. DeliveryCard

**Location:** `Web/Delivery/Views/components/DeliveryCard.jsx`

```jsx
import React from 'react';
import Card from '@shared/components/ui/Card';

const DeliveryCard = ({ delivery }) => {
  return (
    <Card className="border-l-4 border-blue-500">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{delivery.part_name}</h3>
          <p className="text-sm text-gray-500">
            {delivery.delivery_stage} → {delivery.receiving_stage}
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${
          delivery.status === 'Chờ xác nhận' ? 'bg-yellow-100 text-yellow-800' :
          delivery.status === 'Đã nhận' ? 'bg-blue-100 text-blue-800' :
          'bg-green-100 text-green-800'
        }`}>
          {delivery.status}
        </span>
      </div>
      
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Giao:</span>
          <span className="font-medium ml-1">{delivery.quantity_total}</span>
        </div>
        <div>
          <span className="text-gray-500">Nhận:</span>
          <span className="font-medium ml-1">{delivery.quantity_received}</span>
        </div>
      </div>
      
      {delivery.note && (
        <p className="mt-2 text-sm text-gray-600 italic">"{delivery.note}"</p>
      )}
    </Card>
  );
};

export default DeliveryCard;
```

### 3. InspectionForm

**Location:** `Web/Inspection/Views/components/InspectionForm.jsx`

```jsx
import React, { useState } from 'react';
import Card from '@shared/components/ui/Card';
import Input from '@shared/components/ui/Input';
import Select from '@shared/components/ui/Select';
import Button from '@shared/components/ui/Button';

const InspectionForm = ({ delivery, onSubmit }) => {
  const [formData, setFormData] = useState({
    result: 'Đạt',
    quantity_checked: delivery.quantity_total,
    quantity_error: 0,
    note: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card title="Kiểm tra chất lượng">
      <form onSubmit={handleSubmit}>
        <Select
          label="Kết quả"
          options={[
            { value: 'Đạt', label: 'Đạt' },
            { value: 'Lỗi', label: 'Lỗi' }
          ]}
          value={formData.result}
          onChange={(e) => setFormData({ ...formData, result: e.target.value })}
          required
        />
        
        <Input
          label="Số lượng kiểm"
          type="number"
          value={formData.quantity_checked}
          onChange={(e) => setFormData({ ...formData, quantity_checked: parseInt(e.target.value) })}
          required
        />
        
        <Input
          label="Số lượng lỗi"
          type="number"
          value={formData.quantity_error}
          onChange={(e) => setFormData({ ...formData, quantity_error: parseInt(e.target.value) })}
        />
        
        <Input
          label="Ghi chú"
          type="text"
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
        />
        
        <div className="flex gap-2 mt-4">
          <Button type="submit" variant="primary">
            Lưu kết quả
          </Button>
          <Button type="button" variant="secondary">
            Hủy
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default InspectionForm;
```

---

## 🎨 Component Patterns

### 1. Compound Component Pattern

```jsx
// Compound component for complex UI
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-lg">
        {children}
      </div>
    </div>
  );
};

Modal.Header = ({ children }) => (
  <div className="p-4 border-b">{children}</div>
);

Modal.Body = ({ children }) => (
  <div className="p-4">{children}</div>
);

Modal.Footer = ({ children }) => (
  <div className="p-4 border-t">{children}</div>
);

// Usage
<Modal isOpen={isOpen} onClose={onClose}>
  <Modal.Header>
    <h2>Title</h2>
  </Modal.Header>
  <Modal.Body>
    Content
  </Modal.Body>
  <Modal.Footer>
    <Button>Close</Button>
  </Modal.Footer>
</Modal>
```

### 2. Render Props Pattern

```jsx
const DataFetcher = ({ url, children }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData(url).then(response => {
      setData(response);
      setLoading(false);
    });
  }, [url]);

  return children({ data, loading });
};

// Usage
<DataFetcher url="/plans/">
  {({ data, loading }) => {
    if (loading) return <LoadingSpinner />;
    return <PlanList plans={data} />;
  }}
</DataFetcher>
```

### 3. Higher-Order Component Pattern

```jsx
const withAuth = (Component) => {
  return (props) => {
    const { user } = useAuth();
    
    if (!user) {
      return <Navigate to="/login" />;
    }
    
    return <Component {...props} user={user} />;
  };
};

// Usage
const ProtectedPage = withAuth(Dashboard);
```

---

## 🎨 Styling System

### 1. Tailwind CSS Configuration

SmartFlow v2 sử dụng Tailwind CSS với custom configuration:

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './index.html',
    './**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8'
        }
      },
      spacing: {
        '128': '32rem',
        '144': '36rem'
      }
    }
  },
  plugins: []
};
```

### 2. CSS Variables

```css
/* shared/styles/variables.css */
:root {
  --color-primary: #2563eb;
  --color-secondary: #64748b;
  --color-success: #22c55e;
  --color-danger: #ef4444;
  --color-warning: #f59e0b;
  
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  
  --border-radius-sm: 0.375rem;
  --border-radius-md: 0.5rem;
  --border-radius-lg: 0.75rem;
}
```

### 3. Global Styles

```css
/* shared/styles/global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50 text-gray-900;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-100;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400;
}
```

---

## ✅ Best Practices

### 1. Component Naming

- Use PascalCase for component names
- Be descriptive and specific
- Prefix with type if needed

**Good:**
```jsx
PlanCard.jsx
DeliveryForm.jsx
InspectionResultModal.jsx
```

**Bad:**
```jsx
Card.jsx
Form.jsx
Modal.jsx
```

### 2. Props Naming

- Use camelCase for props
- Be descriptive
- Use boolean prefixes for boolean props

**Good:**
```jsx
<Button isLoading={false} onClick={handleClick} />
<Modal isOpen={true} onClose={handleClose} />
```

**Bad:**
```jsx
<Button loading={false} on_click={handleClick} />
<Modal open={true} close={handleClose} />
```

### 3. Component Size

- Keep components small and focused
- Single responsibility principle
- Extract reusable parts

**Good:**
```jsx
// Small, focused component
const PlanCard = ({ plan }) => {
  return (
    <Card>
      <PlanHeader plan={plan} />
      <PlanBody plan={plan} />
      <PlanFooter plan={plan} />
    </Card>
  );
};
```

**Bad:**
```jsx
// Large, monolithic component
const PlanCard = ({ plan }) => {
  // 200+ lines of mixed logic
  return (
    <Card>
      {/* Everything in one place */}
    </Card>
  );
};
```

### 4. TypeScript (Optional)

Consider adding TypeScript for better type safety:

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  children
}) => {
  // Component implementation
};
```

### 5. Accessibility

- Add ARIA labels where needed
- Support keyboard navigation
- Use semantic HTML

**Good:**
```jsx
<button
  aria-label="Close modal"
  onClick={onClose}
>
  <CloseIcon />
</button>
```

---

## 📞 Hỗ trợ (Support)

Nếu bạn có câu hỏi về components:

1. Kiểm tra **React Docs**: https://react.dev/
2. Kiểm tra **Tailwind Docs**: https://tailwindcss.com/
3. Liên hệ **Frontend Team**: frontend@smartflowg7.cloud

---

**Last Updated:** 2026-06-03
**Version:** 2.0
**Branch:** test_v1
