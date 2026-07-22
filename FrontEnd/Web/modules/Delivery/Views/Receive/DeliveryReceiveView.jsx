import React from 'react';

const ManufactureReceive = () => {
  const stats = [
    { title: 'CHỜ TIẾP NHẬN', value: '12 Đơn', color: '#FFF3E0' },
    { title: 'ĐÃ TIẾP NHẬN', value: '450 Đơn', color: '#E8F5E9' },
    { title: 'THIẾU HỤT', value: '2 Đơn', color: '#FFEBEE' },
  ];

  const receiveData = [
    { id: 1, code: 'TN-001', supplier: 'Kho Gỗ Hà Nội', item: 'Gỗ sồi tấm', qty: 100, unit: 'm3', date: '2026-03-25', status: 'Đang giao', color: '#FFA726' },
    { id: 2, code: 'TN-002', supplier: 'Phụ kiện ABC', item: 'Bản lề giảm chấn', qty: 500, unit: 'Cái', date: '2026-03-24', status: 'Hoàn tất', color: '#66BB6A' },
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
          <button className="btn btn-primary">Quét mã QR</button>
          <button className="btn btn-outline">Tạo phiếu nhập</button>
        </div>
      </div>

      <div className="table-responsive desktop-only card-shadow">
        <table className="manufacture-table">
          <thead>
            <tr>
              <th>Mã tiếp nhận</th>
              <th>Nhà cung cấp</th>
              <th>Vật tư</th>
              <th>Số lượng</th>
              <th>Ngày nhập</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {receiveData.map((row) => (
              <tr key={row.id}>
                <td className="text-bold">{row.code}</td>
                <td>{row.supplier}</td>
                <td>{row.item}</td>
                <td>{row.qty} {row.unit}</td>
                <td>{row.date}</td>
                <td>
                  <span className="status-badge" style={{ backgroundColor: row.color + '22', color: row.color, border: `1px solid ${row.color}` }}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-only manufacture-cards-container">
         {receiveData.map((row) => (
            <div key={row.id} className="plan-mobile-card card-shadow">
               <div className="card-header">
                  <span className="card-khxs">{row.code}</span>
                  <span className="status-badge-compact" style={{ color: row.color }}>● {row.status}</span>
               </div>
               <div className="card-body">
                  <div className="info-row">
                      <span className="label">Vật tư:</span>
                      <span className="value">{row.item}</span>
                  </div>
                  <div className="info-row">
                      <span className="label">Số lượng:</span>
                      <span className="value">{row.qty} {row.unit}</span>
                  </div>
                  <div className="info-row">
                      <span className="label">NCC:</span>
                      <span className="value">{row.supplier}</span>
                  </div>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
};

export default ManufactureReceive;
