import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const ManufactureReceive = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/manufacture-receive');

  useEffect(() => {
    if (typeof setCustomTitle === 'function') setCustomTitle(title || 'Tiếp nhận sản xuất');
    if (typeof setCustomSubtitle === 'function') setCustomSubtitle(subtitle || 'Tiếp nhận vật tư và thành phẩm từ nhà máy/nhà cung cấp');
    if (typeof setCustomScreenCode === 'function') setCustomScreenCode(screenCode || 'SX05');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, title, subtitle, screenCode]);

  const stats = [
    { title: 'CHỜ TIẾP NHẬN', value: '0 Đơn', color: '#FFF3E0' },
    { title: 'ĐÃ TIẾP NHẬN', value: '0 Đơn', color: '#E8F5E9' },
    { title: 'THIẾU HỤT', value: '0 Đơn', color: '#FFEBEE' },
  ];

  const receiveData = [];

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
