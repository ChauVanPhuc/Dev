import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, Calendar, Filter, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import apiClient from '@shared/services/api';

const REPORT_TEMPLATES = [
  {
    id: 'matrix',
    title: 'Bảng Ma Trận Chấm Công Tháng',
    desc: 'Hiển thị ma trận 1-31 ngày cho toàn bộ nhân sự với mã ký hiệu (X, P, KP, 20h, 22h, CN) và tổng số giờ',
    badge: 'Mẫu ERP chuẩn',
    color: '#7B5233',
    bgColor: '#FAF6F0',
    borderColor: '#EADCC9'
  },
  {
    id: 'log',
    title: 'Nhật Ký Chi Tiết Báo Phép & Tăng Ca',
    desc: 'Liệt kê từng lượt báo nghỉ, báo tăng ca kèm ngày tháng, lý do và ghi chú chi tiết',
    badge: 'Chi tiết từng lượt',
    color: '#1E40AF',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE'
  },
  {
    id: 'summary',
    title: 'Báo Cáo Tổng Hợp Quân Số',
    desc: 'Thống kê quân số tổng thể và tỷ lệ đi làm / vắng mặt phân loại theo Quản lý, QA, QC, NVSX',
    badge: 'Tổng hợp quân số',
    color: '#166534',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0'
  },
  {
    id: 'overtime',
    title: 'Bảng Tổng Hợp Giờ Tăng Ca (Tính Lương)',
    desc: 'Thống kê chi tiết số lượt tăng ca 20h, 22h, tổng giờ tăng ca và số ngày vắng CP cho Kế toán',
    badge: 'Phục vụ tính lương',
    color: '#6B21A8',
    bgColor: '#F3E8FF',
    borderColor: '#E9D5FF'
  }
];

const ExportAttendanceModal = ({ isOpen, onClose, defaultMonth = '2026-09', defaultFactory = '' }) => {
  const [reportType, setReportType] = useState('matrix');
  const [dateMode, setDateMode] = useState('month'); // 'month' | 'range'
  const [month, setMonth] = useState(defaultMonth || '2026-09');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [factory, setFactory] = useState(defaultFactory || 'ALL');
  const [department, setDepartment] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleExport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        report_type: reportType,
        factory: factory || 'ALL',
        department: department || 'ALL'
      };

      if (dateMode === 'month') {
        payload.month = month;
      } else {
        payload.start_date = startDate;
        payload.end_date = endDate;
      }

      console.log('[ExportModal] 📤 Gửi request xuất file Excel:', payload);

      const response = await apiClient.post('/quality-employees/attendance/export-excel', payload, {
        responseType: 'blob'
      });

      // Handle file download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const fileName = `Bao_Cao_Lich_Cham_Cong_${reportType}_${dateMode === 'month' ? month : startDate}.xlsx`;
      
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);

      setLoading(false);
      onClose();
    } catch (err) {
      console.error('[ExportModal] ❌ Lỗi xuất file Excel:', err);
      setError('Không thể tải file Excel. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau!');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #EADCC9',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          backgroundColor: '#FAF6F0',
          borderBottom: '1px solid #EADCC9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#7B5233',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(123, 82, 51, 0.2)'
            }}>
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#3D2B1F' }}>
                Xuất Báo Cáo Chấm Công & Tăng Ca
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#7B5233' }}>
                Tùy chỉnh mẫu báo cáo, khoảng thời gian và bộ lọc xuất file Excel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleExport} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#991B1B',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* 1. Chọn Mẫu Báo Cáo */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#3D2B1F', marginBottom: '10px' }}>
              <Layers size={16} color="#7B5233" />
              1. Chọn Mẫu Báo Cáo (Excel Template):
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {REPORT_TEMPLATES.map(tpl => {
                const isSelected = reportType === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setReportType(tpl.id)}
                    style={{
                      border: `2px solid ${isSelected ? tpl.color : '#E5E7EB'}`,
                      backgroundColor: isSelected ? tpl.bgColor : '#FFFFFF',
                      borderRadius: '12px',
                      padding: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: isSelected ? tpl.color : '#F3F4F6',
                        color: isSelected ? '#FFFFFF' : '#4B5563'
                      }}>
                        {tpl.badge}
                      </span>
                      {isSelected && <CheckCircle2 size={18} color={tpl.color} />}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: isSelected ? tpl.color : '#1F2937' }}>
                      {tpl.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', lineHeight: '1.3' }}>
                      {tpl.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Khoảng Thời Gian */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#3D2B1F', marginBottom: '10px' }}>
              <Calendar size={16} color="#7B5233" />
              2. Chọn Khoảng Thời Gian Báo Cáo:
            </label>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                <input
                  type="radio"
                  name="dateMode"
                  checked={dateMode === 'month'}
                  onChange={() => setDateMode('month')}
                />
                Theo Tháng chọn (YYYY-MM)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                <input
                  type="radio"
                  name="dateMode"
                  checked={dateMode === 'range'}
                  onChange={() => setDateMode('range')}
                />
                Tùy chọn khoảng ngày (Từ - Đến)
              </label>
            </div>

            {dateMode === 'month' ? (
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid #EADCC9',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#2D1A12',
                  outline: 'none'
                }}
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>Từ ngày:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #EADCC9',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#2D1A12',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>Đến ngày:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #EADCC9',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#2D1A12',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Lọc Phạm Vi Nhân Sự */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#3D2B1F', marginBottom: '10px' }}>
              <Filter size={16} color="#7B5233" />
              3. Phạm Vi Nhân Sự & Nhà Máy:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>Nhà máy:</label>
                <select
                  value={factory}
                  onChange={(e) => setFactory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #EADCC9',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#2D1A12',
                    outline: 'none',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  <option value="ALL">Tất cả nhà máy (VP + NM1 + NM2 + NM3)</option>
                  <option value="VP">Văn phòng (VP)</option>
                  <option value="Nhà máy 1">Nhà máy 1 (NM1)</option>
                  <option value="Nhà máy 2">Nhà máy 2 (NM2)</option>
                  <option value="Nhà máy 3">Nhà máy 3 (NM3)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '4px' }}>Bộ phận:</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #EADCC9',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#2D1A12',
                    outline: 'none',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  <option value="ALL">Tất cả bộ phận (QLCL + SX)</option>
                  <option value="QLCL">Quản lý chất lượng (QLCL)</option>
                  <option value="SX">Sản xuất (SX)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div style={{
            marginTop: '12px',
            paddingTop: '16px',
            borderTop: '1px solid #F3F4F6',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: loading ? '#9CA3AF' : '#7B5233',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px -1px rgba(123, 82, 51, 0.2)'
              }}
            >
              <Download size={16} />
              {loading ? 'Đang khởi tạo File Excel...' : 'Tải File Excel (.xlsx)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExportAttendanceModal;
