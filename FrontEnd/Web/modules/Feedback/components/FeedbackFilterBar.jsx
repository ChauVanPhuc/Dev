import React from 'react';
import { Filter, RotateCcw, Calendar } from 'lucide-react';

export const FeedbackFilterBar = ({
  isOpen,
  filterReportType,
  setFilterReportType,
  filterStatus,
  setFilterStatus,
  filterDepartment,
  setFilterDepartment,
  filterSection,
  setFilterSection,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  departments = [],
  sections = [],
  itemsPerPage,
  setItemsPerPage,
  onReset
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="filter-inline-bar"
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #EADCC9',
        borderRadius: '10px',
        marginBottom: '12px',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        boxShadow: '0 2px 6px rgba(123, 82, 51, 0.05)'
      }}
    >
      {/* Loại báo cáo */}
      <div className="filter-field-group">
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
          Loại phiếu
        </label>
        <select
          value={filterReportType}
          onChange={(e) => setFilterReportType(e.target.value)}
          style={{
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#fff',
            fontWeight: '600',
            color: '#334155',
            fontSize: '0.78rem',
            minWidth: '140px'
          }}
        >
          <option value="all">Tất cả loại</option>
          <option value="Báo cáo vấn đề">Báo cáo vấn đề</option>
          <option value="Biên bản cuộc họp">Biên bản cuộc họp</option>
        </select>
      </div>

      {/* Trạng thái */}
      <div className="filter-field-group">
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
          Trạng thái
        </label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#fff',
            fontWeight: '600',
            color: '#334155',
            fontSize: '0.78rem',
            minWidth: '140px'
          }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="Chờ xử lý">Chờ xử lý</option>
          <option value="Đã tiếp nhận">Đã tiếp nhận</option>
          <option value="Đã xong">Đã hoàn thành</option>
          <option value="Từ chối">Từ chối / Hủy</option>
        </select>
      </div>

      {/* Phòng Ban */}
      <div className="filter-field-group">
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
          Phòng Ban
        </label>
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          style={{
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#fff',
            fontWeight: '600',
            color: '#334155',
            fontSize: '0.78rem',
            minWidth: '150px'
          }}
        >
          <option value="all">Tất cả phòng ban</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {/* Bộ Phận */}
      <div className="filter-field-group">
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
          Bộ Phận
        </label>
        <select
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
          style={{
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#fff',
            fontWeight: '600',
            color: '#334155',
            fontSize: '0.78rem',
            minWidth: '150px'
          }}
        >
          <option value="all">Tất cả bộ phận</option>
          {sections.map((sec) => (
            <option key={sec} value={sec}>{sec}</option>
          ))}
        </select>
      </div>

      {/* Từ ngày */}
      <div className="filter-field-group">
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
          Từ ngày
        </label>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          style={{
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#fff',
            fontWeight: '600',
            color: '#334155',
            fontSize: '0.78rem'
          }}
        />
      </div>

      {/* Đến ngày */}
      <div className="filter-field-group">
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
          Đến ngày
        </label>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          style={{
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#fff',
            fontWeight: '600',
            color: '#334155',
            fontSize: '0.78rem'
          }}
        />
      </div>

      {/* Dòng / trang */}
      <div className="filter-field-group" style={{ marginLeft: 'auto' }}>
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
          Dòng / trang
        </label>
        <select
          value={itemsPerPage}
          onChange={(e) => setItemsPerPage(Number(e.target.value))}
          style={{
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#fff',
            fontWeight: '600',
            color: '#334155',
            fontSize: '0.78rem',
            minWidth: '70px'
          }}
        >
          <option value={15}>15</option>
          <option value={30}>30</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Nút Đặt lại bộ lọc */}
      <div style={{ paddingBottom: '2px' }}>
        <button
          type="button"
          onClick={onReset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            color: '#7B5233',
            fontSize: '0.78rem',
            fontWeight: '700',
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid #EADCC9',
            backgroundColor: '#FAF6F0',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Đặt lại toàn bộ điều kiện lọc"
        >
          <RotateCcw size={13} />
          <span>Đặt lại</span>
        </button>
      </div>
    </div>
  );
};

export default FeedbackFilterBar;
