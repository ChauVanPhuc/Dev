# 🤝 Contributing to SmartFlow v2

Tài liệu này hướng dẫn cách đóng góp vào dự án SmartFlow v2, bao gồm development workflow, git conventions, code review process, và testing requirements.

---

## 📋 Mục lục (Table of Contents)

1. [Getting Started](#-getting-started)
2. [Development Workflow](#-development-workflow)
3. [Git Conventions](#-git-conventions)
4. [Code Style](#-code-style)
5. [Code Review Process](#-code-review-process)
6. [Testing Requirements](#-testing-requirements)
7. [Documentation Standards](#-documentation-standards)
8. [Reporting Issues](#-reporting-issues)

---

## 🚀 Getting Started

### Prerequisites

Trước khi đóng góp, đảm bảo bạn đã:

1. Đọc README.md để hiểu về dự án
2. Đọc SETUP_GUIDE.md để cài đặt môi trường
3. Fork repository trên GitHub
4. Clone fork của bạn về máy

```bash
git clone https://github.com/YOUR_USERNAME/SmartFlow.git
cd SmartFlow
```

### Setting Up Development Environment

```bash
# Cài đặt Backend
cd BackEnd
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt

# Cài đặt Frontend Web
cd ../FrontEnd
npm install

# Cài đặt Mobile
cd Mobile
npm install
```

---

## 🔄 Development Workflow

### 1. Branch Strategy

SmartFlow v2 sử dụng Git Flow:

```
main (production)
  ↑
  develop (development)
  ↑
  feature/* (feature branches)
  bugfix/* (bugfix branches)
```

**Branch Types:**
- `main` - Branch production, chỉ merge từ develop
- `develop` - Branch development chính
- `feature/*` - Branch cho feature mới (ví dụ: feature/qc-improvement)
- `bugfix/*` - Branch cho fix bug (ví dụ: bugfix/login-error)
- `hotfix/*` - Branch cho fix bug production khẩn cấp

### 2. Creating a Feature Branch

```bash
# Đảm bảo develop là mới nhất
git checkout develop
git pull origin develop

# Tạo feature branch mới
git checkout -b feature/your-feature-name

# Hoặc cho bugfix
git checkout -b bugfix/your-bugfix-name
```

### 3. Making Changes

1. Thực hiện các thay đổi code
2. Thêm tests cho code mới
3. Cập nhật documentation (nếu cần)
4. Commit changes với message rõ ràng

### 4. Testing Locally

```bash
# Chạy Backend
cd BackEnd
.\venv\Scripts\activate
uvicorn app.main:app --reload

# Chạy Frontend Web (terminal khác)
cd FrontEnd
npm run dev

# Chạy Mobile (terminal khác)
cd FrontEnd/Mobile
npm run dev
```

### 5. Pushing Changes

```bash
git add .
git commit -m "feat: add new feature"
git push origin feature/your-feature-name
```

### 6. Creating Pull Request

1. Vào GitHub repository của bạn
2. Click "New Pull Request"
3. Chọn branch: `feature/your-feature-name` → `develop`
4. Điền PR template
5. Submit PR

---

## 📝 Git Conventions

### Commit Message Format

SmartFlow v2 sử dụng Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - Feature mới
- `fix` - Bug fix
- `docs` - Thay đổi documentation
- `style` - Thay đổi code style (formatting, không logic)
- `refactor` - Refactor code
- `perf` - Performance improvement
- `test` - Thêm hoặc sửa tests
- `chore` - Thay đổi build process, tools, dependencies

**Examples:**
```
feat(delivery): add QR code scanning for delivery receive

- Implement QR scanner using Capacitor
- Add validation for QR code format
- Update DeliveryReceiveView to support QR input

Closes #123
```

```
fix(auth): resolve JWT token expiration issue

- Fix token refresh logic
- Add proper error handling
- Update token expiration to 8 hours

Fixes #456
```

### Branch Naming

**Feature Branches:**
```
feature/<feature-name>
feature/delivery-qr-scan
feature/qc-checklist-improvement
```

**Bugfix Branches:**
```
bugfix/<bug-description>
bugfix/login-failed-on-mobile
bugfix/delivery-image-upload
```

**Hotfix Branches:**
```
hotfix/<hotfix-description>
hotfix/security-patch
hotfix/critical-bug-fix
```

---

## 🎨 Code Style

### Python (Backend)

**PEP 8 Compliance:**
```python
# Good
def calculate_progress(total, completed):
    """Calculate progress percentage."""
    if total == 0:
        return 0
    return (completed / total) * 100

# Bad
def calculateProgress(total,completed):
    if total==0:return 0
    return (completed/total)*100
```

**Type Hints:**
```python
from typing import List, Optional

def get_deliveries(plan_id: int, status: Optional[str] = None) -> List[dict]:
    """Get deliveries filtered by plan and status."""
    pass
```

**Docstrings:**
```python
def create_delivery(delivery_data: dict) -> dict:
    """
    Create a new delivery record.
    
    Args:
        delivery_data: Dictionary containing delivery information
        
    Returns:
        Dictionary with created delivery details
        
    Raises:
        ValueError: If required fields are missing
    """
    pass
```

### JavaScript/React (Frontend)

**ES6+ Standards:**
```javascript
// Good
const calculateProgress = (total, completed) => {
  if (total === 0) return 0;
  return (completed / total) * 100;
};

// Bad
function calculateProgress(total,completed){
  if(total==0)return 0
  return (completed/total)*100
}
```

**Component Structure:**
```jsx
// Good
const PlanCard = ({ plan, onEdit, onDelete }) => {
  const [loading, setLoading] = useState(false);
  
  const handleEdit = () => {
    onEdit(plan);
  };
  
  return (
    <Card>
      {/* Content */}
    </Card>
  );
};

export default PlanCard;
```

**Naming Conventions:**
- Components: PascalCase (`PlanCard`, `DeliveryForm`)
- Functions: camelCase (`calculateProgress`, `handleSubmit`)
- Constants: UPPER_SNAKE_CASE (`API_URL`, `MAX_RETRY`)
- Files: kebab-case (`plan-card.jsx`, `delivery.service.js`)

---

## 👀 Code Review Process

### 1. Self-Review Checklist

Trước khi submit PR, tự review:

- [ ] Code tuân thủ style guide
- [ ] Tests được thêm/cập nhật
- [ ] Documentation được cập nhật
- [ ] Không có console.log hoặc debug code
- [ ] Không có commented-out code
- [ ] Commit messages rõ ràng
- [ ] PR description đầy đủ

### 2. PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No merge conflicts
```

### 3. Review Process

1. **Automated Checks:**
   - CI/CD chạy tests
   - Linting checks
   - Build verification

2. **Peer Review:**
   - Ít nhất 1 reviewer approve
   - Reviewer kiểm tra:
     - Code quality
     - Logic correctness
     - Security issues
     - Performance impact

3. **Changes Requested:**
   - Nếu có issues, fix và push lại
   - Comment với "@reviewer" để request re-review

4. **Approval:**
   - Khi approved, merge vào develop
   - Delete feature branch sau merge

---

## 🧪 Testing Requirements

### Backend Testing

**Unit Tests:**
```python
# tests/test_delivery_service.py
import pytest
from modules.delivery.services.delivery_service import create_delivery

def test_create_delivery_success():
    delivery_data = {
        "plan_id": 1,
        "delivery_stage": "Định hình",
        "receiving_stage": "Lắp ráp",
        "quantity_total": 100
    }
    result = create_delivery(delivery_data)
    assert result["status"] == "Chờ xác nhận"
    assert result["quantity_total"] == 100

def test_create_delivery_invalid_quantity():
    delivery_data = {
        "plan_id": 1,
        "delivery_stage": "Định hình",
        "receiving_stage": "Lắp ráp",
        "quantity_total": -1
    }
    with pytest.raises(ValueError):
        create_delivery(delivery_data)
```

**Run Tests:**
```bash
cd BackEnd
pytest tests/ -v
```

### Frontend Testing

**Unit Tests:**
```javascript
// __tests__/PlanCard.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import PlanCard from '../Plan/Views/components/PlanCard';

test('renders plan card with correct data', () => {
  const plan = {
    id: 1,
    name: 'Kế hoạch tháng 6',
    code: 'KHSX-06-2026',
    status: 1
  };
  
  render(<PlanCard plan={plan} />);
  
  expect(screen.getByText('Kế hoạch tháng 6')).toBeInTheDocument();
  expect(screen.getByText('KHSX-06-2026')).toBeInTheDocument();
});

test('calls onEdit when edit button clicked', () => {
  const plan = { id: 1, name: 'Test' };
  const onEdit = jest.fn();
  
  render(<PlanCard plan={plan} onEdit={onEdit} />);
  
  fireEvent.click(screen.getByText('Sửa'));
  expect(onEdit).toHaveBeenCalledWith(plan);
});
```

**Run Tests:**
```bash
cd FrontEnd
npm test
```

### Integration Testing

**E2E Tests (Mobile):**
```javascript
// e2e/DeliveryFlow.test.js
describe('Delivery Flow', () => {
  it('should create delivery successfully', async () => {
    await device.launchApp();
    
    await element(by.id('delivery-create-button')).tap();
    await element(by.id('plan-selector')).tapText('Kế hoạch A');
    await element(by.id('quantity-input')).typeText('100');
    await element(by.id('submit-button')).tap();
    
    await expect(element(by.id('success-message'))).toBeVisible();
  });
});
```

---

## 📚 Documentation Standards

### Code Comments

**When to Comment:**
- Complex logic
- Non-obvious algorithms
- Workarounds for bugs
- TODO/FIXME markers

**Examples:**
```python
# Good
def calculate_fifo_progress(plan_id: int) -> dict:
    """
    Calculate progress using FIFO 2-Pass algorithm.
    
    First pass: Calculate stage completion rates
    Second pass: Calculate overall weighted progress
    
    Note: This algorithm assumes stages are processed in order
    """
    pass

# Bad
def calculate_progress(plan_id):
    # Calculate progress
    pass
```

### README Updates

Khi thêm feature mới:
1. Cập nhật README.md với feature description
2. Thêm screenshot (nếu có UI)
3. Cập nhật CHANGELOG.md
4. Cập nhật API_REFERENCE.md (nếu có API mới)

### API Documentation

Khi thêm/đổi API:
1. Cập nhật docstring trong code
2. Cập nhật API_REFERENCE.md
3. Thêm example trong Swagger UI (nếu cần)

---

## 🐛 Reporting Issues

### Bug Report Template

```markdown
## Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Screenshots
Add screenshots if applicable

## Environment
- OS: [e.g. Windows 10, Ubuntu 20.04]
- Browser: [e.g. Chrome 90]
- Backend Version: [e.g. 2.0.0]
- Frontend Version: [e.g. 2.0.0]

## Additional Context
Any other relevant information
```

### Feature Request Template

```markdown
## Problem Description
What problem does this feature solve?

## Proposed Solution
How should this feature work?

## Alternatives
What alternative solutions did you consider?

## Additional Context
Any other relevant information
```

---

## 📞 Getting Help

Nếu bạn cần help:

1. **GitHub Issues**: https://github.com/mynd02work-bit/SmartFlow/issues
2. **GitHub Discussions**: https://github.com/mynd02work-bit/SmartFlow/discussions
3. **Email**: support@smartflowg7.cloud

---

## 📜 Code of Conduct

### Our Pledge

Để làm cho SmartFlow v2 trở thành một cộng đồng mở và chào đón, chúng tôi cam kết:

- Sử dụng ngôn ngữ thân thiện và bao dung
- Tôn trọng quan điểm và kinh nghiệm khác nhau
- Chấp nhận xây dựng mang tính tích cực
- Tập trung vào những gì tốt nhất cho cộng đồng

### Our Standards

Ví dụ hành vi góp phần tạo ra môi trường tích cực:

- Sử dụng ngôn ngữ chào đón và bao dung
- Tôn trọng quan điểm và kinh nghiệm khác nhau
- Chấp nhận phản hồi mang tính xây dựng
- Tập trung vào những gì tốt nhất cho cộng đồng

Ví dụ hành vi không được chấp nhận:

- Sử dụng ngôn ngữ hoặc hình ảnh khiêu dâm
- Tấn công cá nhân hoặc chính trị
- Harassment công khai hoặc riêng tư
- Xuất bản thông tin riêng tư của người khác

---

**Last Updated:** 2026-06-03
**Version:** 2.0
**Branch:** test_v1
