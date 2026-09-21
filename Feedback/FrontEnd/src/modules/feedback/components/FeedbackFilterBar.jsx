import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';

export const FeedbackFilterBar = ({
  isOpen,
  filterReportType,
  setFilterReportType,
  filterStatus,
  setFilterStatus,
  filterArea,
  setFilterArea,
  areas = [],
  onReset
}) => {
  if (!isOpen) return null;

  return (
    <div className="filter-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#7B5233', fontSize: '0.84rem' }}>
        <Filter size={16} />
        <span>Bộ lọc chi tiết:</span>
      </div>

      {/* Loại báo cáo */}
      <div className="filter-group">
        <label className="filter-label">Loại phiếu:</label>
        <select
          className="filter-select"
          value={filterReportType}
          onChange={(e) => setFilterReportType(e.target.value)}
        >
          <option value="all">Tất cả loại</option>
          <option value="Báo cáo vấn đề">Báo cáo vấn đề</option>
          <option value="Biên bản cuộc họp">Biên bản cuộc họp</option>
        </select>
      </div>

      {/* Trạng thái */}
      <div className="filter-group">
        <label className="filter-label">Trạng thái:</label>
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="Chờ xử lý">Chờ xử lý</option>
          <option value="Đã tiếp nhận">Đã tiếp nhận</option>
          <option value="Đã xong">Đã hoàn thành</option>
          <option value="Từ chối">Từ chối / Hủy</option>
        </select>
      </div>

      {/* Khu vực */}
      <div className="filter-group">
        <label className="filter-label">Khu vực / Xưởng:</label>
        <select
          className="filter-select"
          value={filterArea}
          onChange={(e) => setFilterArea(e.target.value)}
        >
          <option value="all">Tất cả khu vực</option>
          {areas.map(area => (
            <option key={area} value={area}>{area}</option>
          ))}
        </select>
      </div>

      {/* Nút Reset */}
      <button
        onClick={onReset}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          color: '#8C7B73',
          fontSize: '0.8rem',
          fontWeight: 600,
          marginLeft: 'auto'
        }}
      >
        <RotateCcw size={14} />
        <span>Đặt lại bộ lọc</span>
      </button>
    </div>
  );
};
