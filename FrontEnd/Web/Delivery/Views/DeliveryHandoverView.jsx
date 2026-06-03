import React from 'react';
import '@web/styles/Manufacture/Plan.css'; // Tái sử dụng style chung

const ManufactureHandover = () => {
  const stats = [
    { title: 'CHỜ BÀN GIAO', value: '45 Lệnh', color: '#FFF3E0' },
    { title: 'ĐÃ BÀN GIAO', value: '180 Lệnh', color: '#E8F5E9' },
    { title: 'YÊU CẦU GẤP', value: '5 Lệnh', color: '#FFEBEE' },
  ];

  const handoverData = [
    { id: 1, code: 'BG-001', product: 'Tủ áo 4 cánh', qty: 5, date: '2026-03-25', status: 'Chờ duyệt', color: '#FFA726' },
    { id: 2, code: 'BG-002', product: 'Bàn ăn gỗ sồi', qty: 2, date: '2026-03-24', status: 'Đã giao', color: '#66BB6A' },
  ];

  return (
    <div className="manufacture-plan-container">
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card" style={{ backgroundColor: stat.color }}>
            <span className="stat-title">{stat.title}</span>
            <span className="stat-value">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="action-bar" style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {/* Title removed for Layout consistency */}
        <div className="action-buttons desktop-only">
          <button className="btn btn-primary">Tạo phiếu bàn giao</button>
        </div>
      </div>

      <div className="table-responsive desktop-only card-shadow">
        <table className="manufacture-table">
          <thead>
            <tr>
              <th>Mã bàn giao</th>
              <th>Sản phẩm</th>
              <th>Số lượng</th>
              <th>Ngày dự kiến</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {handoverData.map((row) => (
              <tr key={row.id}>
                <td className="text-bold">{row.code}</td>
                <td>{row.product}</td>
                <td>{row.qty}</td>
                <td>{row.date}</td>
                <td>
                  <span className="status-badge" style={{ backgroundColor: row.color + '22', color: row.color, border: `1px solid ${row.color}` }}>
                    {row.status}
                  </span>
                </td>
                <td>
                   <button className="btn" style={{ padding: '4px 8px' }}>Xem</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-only manufacture-cards-container">
         {handoverData.map((row) => (
            <div key={row.id} className="plan-mobile-card card-shadow">
               <div className="card-header">
                  <span className="card-khxs">{row.code}</span>
                  <span className="status-badge-compact" style={{ color: row.color }}>● {row.status}</span>
               </div>
               <div className="card-body">
                  <div className="info-row">
                      <span className="label">Sản phẩm:</span>
                      <span className="value">{row.product}</span>
                  </div>
                  <div className="info-row">
                      <span className="label">Số lượng:</span>
                      <span className="value">{row.qty}</span>
                  </div>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
};

export default ManufactureHandover;
