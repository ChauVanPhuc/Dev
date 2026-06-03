import React from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const AD3_UserManagementMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  // Tìm mô tả của component từ list để đưa vào tooltip
  const getCompDesc = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.description : '';
  };

  const getCompType = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.type : 'UI Component';
  };

  const sampleUsers = [
    { empId: 'QC017', name: 'QC - NM3 - ĐG 3', dept: 'Sản xuất', stage: 'NM3 - Đóng gói 3', username: 'qc17', role: 'QLCL', status: 'Đang sử dụng' },
    { empId: 'SX017', name: 'SX - NM3 - ĐG 3', dept: 'Sản xuất', stage: 'NM3 - Đóng gói 3', username: 'sx17', role: 'Sx', status: 'Đang sử dụng' },
    { empId: 'QC016', name: 'QC - NM3 - Sơn 3', dept: 'Sản xuất', stage: 'NM3 - Sơn 3', username: 'qc16', role: 'QLCL', status: 'Đang sử dụng' },
    { empId: 'SX016', name: 'SX - NM3 - Sơn 3', dept: 'Sản xuất', stage: 'NM3 - Sơn 3', username: 'sx16', role: 'Sx', status: 'Đang sử dụng' },
  ];

  return (
    <div className="mock-user-mgmt-layout">
      {/* 1. Toolbar Section */}
      <div className="mock-toolbar">
        <div className="mock-toolbar-left">
          
          {/* UserSearch */}
          <InteractiveBlock
            name="UserSearch"
            type={getCompType('UserSearch')}
            description={getCompDesc('UserSearch')}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          >
            <div className="mock-search-box">
              🔍 Nhập tên hoặc mã nhân viên...
            </div>
          </InteractiveBlock>

          {/* UserFilter */}
          <InteractiveBlock
            name="UserFilter"
            type={getCompType('UserFilter')}
            description={getCompDesc('UserFilter')}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          >
            <div className="mock-filter-btn">
              🎛️
            </div>
          </InteractiveBlock>

          {/* Sort Button Mock (Sắp xếp) */}
          <div className="mock-filter-btn" title="Nút sắp xếp (Tĩnh)">
            ↕
          </div>

          {/* Display selection Dropdown */}
          <select className="mock-display-select" disabled>
            <option>Thông tin tài khoản</option>
          </select>
        </div>

        <div className="mock-toolbar-right">
          {/* UserCreateButton */}
          <InteractiveBlock
            name="UserCreateButton"
            type={getCompType('UserCreateButton')}
            description={getCompDesc('UserCreateButton')}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          >
            <div className="mock-btn mock-btn-primary">
              Tạo mới
            </div>
          </InteractiveBlock>

          {/* ExportUserButton */}
          <InteractiveBlock
            name="ExportUserButton"
            type={getCompType('ExportUserButton')}
            description={getCompDesc('ExportUserButton')}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          >
            <div className="mock-btn mock-btn-outline">
              Xuất dữ liệu
            </div>
          </InteractiveBlock>
        </div>
      </div>

      {/* 2. Main content area (Table + Sidebar) */}
      <div className="mock-main-content">
        
        {/* Table + Pagination Column */}
        <InteractiveBlock
          name="UserTable"
          type={getCompType('UserTable')}
          description={getCompDesc('UserTable')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div className="mock-table-card">
            <table className="mock-data-table">
              <thead>
                <tr>
                  <th>MÃ NV</th>
                  <th>TÊN</th>
                  <th>BỘ PHẬN</th>
                  <th>CÔNG ĐOẠN</th>
                  <th>USERNAME</th>
                  <th>VAI TRÒ</th>
                  <th>TRẠNG THÁI</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {sampleUsers.map((user, idx) => (
                  <tr key={idx}>
                    <td>{user.empId}</td>
                    <td style={{ fontWeight: 'bold' }}>{user.name}</td>
                    <td>{user.dept}</td>
                    <td>{user.stage}</td>
                    <td>{user.username}</td>
                    <td>{user.role}</td>
                    <td style={{ color: '#2E7D32', fontWeight: 'bold' }}>{user.status}</td>
                    <td>
                      {/* ActionMenu */}
                      <InteractiveBlock
                        name="ActionMenu"
                        type={getCompType('ActionMenu')}
                        description={getCompDesc('ActionMenu')}
                        activeComponent={activeComponent}
                        hoveredComponent={hoveredComponent}
                        onHover={onHover}
                        onClick={onClick}
                      >
                        <span className="mock-action-dots">•••</span>
                      </InteractiveBlock>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <InteractiveBlock
              name="Pagination"
              type={getCompType('Pagination')}
              description={getCompDesc('Pagination')}
              activeComponent={activeComponent}
              hoveredComponent={hoveredComponent}
              onHover={onHover}
              onClick={onClick}
            >
              <div className="mock-pagination">
                <span>Hiển thị 1-4 / 35 kết quả</span>
                <div className="mock-page-controls">
                  <button className="mock-page-btn" disabled>&lt;</button>
                  <button className="mock-page-btn mock-page-btn active">1</button>
                  <button className="mock-page-btn">2</button>
                  <button className="mock-page-btn">3</button>
                  <button className="mock-page-btn">4</button>
                  <button className="mock-page-btn">&gt;</button>
                </div>
              </div>
            </InteractiveBlock>
          </div>
        </InteractiveBlock>

        {/* ActivityFeed Aside Column */}
        <InteractiveBlock
          name="ActivityFeed"
          type={getCompType('ActivityFeed')}
          description={getCompDesc('ActivityFeed')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div className="mock-aside-feed">
            <div className="mock-feed-title">Hoạt động gần đây</div>
            <div className="mock-feed-item">
              <span className="mock-feed-user">qc17 (QLCL)</span>
              <span className="mock-feed-action">Đã quét xác nhận nhận hàng PO-2026-004</span>
              <span className="mock-feed-time">1 phút trước</span>
            </div>
            <div className="mock-feed-item">
              <span className="mock-feed-user">admin</span>
              <span className="mock-feed-action">Cập nhật quyền tài khoản nhân viên sx17</span>
              <span className="mock-feed-time">12 phút trước</span>
            </div>
            <div className="mock-feed-item" style={{ border: 'none' }}>
              <span className="mock-feed-user">sx15 (Sản xuất)</span>
              <span className="mock-feed-action">Đã đăng ký thiết bị máy nén khí lỗi QC</span>
              <span className="mock-feed-time">30 phút trước</span>
            </div>
          </div>
        </InteractiveBlock>
        
      </div>
    </div>
  );
};

export default AD3_UserManagementMock;
