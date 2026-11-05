import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, Calendar, Filter, CheckCircle2, AlertCircle, Layers, Users } from 'lucide-react';
import apiClient from '@shared/services/api';

const ExportKPIModal = ({ isOpen, onClose, defaultMonth = '2026-09', defaultFactory = '' }) => {
  const [monthStr, setMonthStr] = useState(defaultMonth || '2026-09');
  const [scope, setScope] = useState('ALL'); // 'ALL' | 'QLCL_ONLY' | 'QCSX_ONLY'
  const [factory, setFactory] = useState(defaultFactory || 'ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleExport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const [yearStr, mStr] = monthStr.split('-');
      const month = parseInt(mStr, 10) || 9;
      const year = parseInt(yearStr, 10) || 2026;

      const payload = {
        month: month,
        year: year,
        scope: scope,
        factory: factory !== 'ALL' ? factory : undefined
      };

      console.log('[ExportKPIModal] 📤 Gửi yêu cầu xuất KPI Excel:', payload);

      const response = await apiClient.post('/quality-employees/kpi/export-excel', payload, {
        responseType: 'blob'
      });

      // Tạo đường link ảo để trình duyệt tải file xuống
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `CL_KPI_Thang_${String(month).padStart(2, '0')}_${year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setSuccessMsg(`Xuất thành công file KPI Tháng ${month}/${year}!`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('[ExportKPIModal] ❌ Lỗi xuất file KPI:', err);
      setError(err.response?.data?.detail || err.message || 'Lỗi trong quá trình sinh file Excel từ hệ thống.');
    } finally {
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
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
        maxWidth: '560px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid #EADCC9'
      }}>
        {/* Header Modal */}
        <div style={{
          backgroundColor: '#FAF7F2',
          padding: '20px 24px',
          borderBottom: '1px solid #EADCC9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#E8F5E9',
              color: '#15803D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#7B5233' }}>
                Xuất Báo Cáo KPI Theo Tháng
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#8C7A6B' }}>
                Chuẩn hóa định dạng Master G7.QLCL-KPI (CL_KPI tháng 9.xlsx)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8C7A6B',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Modal */}
        <form onSubmit={handleExport} style={{ padding: '24px' }}>
          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              color: '#DC2626',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '18px'
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '8px',
              color: '#15803D',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '18px'
            }}>
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Chọn Tháng / Năm */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#4B3621', marginBottom: '8px' }}>
                <Calendar size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
                Kỳ đánh giá KPI (Tháng / Năm)
              </label>
              <input
                type="month"
                value={monthStr}
                onChange={(e) => setMonthStr(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  border: '1.5px solid #D6C7B2',
                  fontSize: '0.95rem',
                  color: '#2B2B2B',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Phạm vi nhân sự */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#4B3621', marginBottom: '8px' }}>
                <Users size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
                Phạm vi tổng hợp nhân sự
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                {[
                  { value: 'ALL', label: 'Toàn bộ Khối QLCL & Công nhân QCSX (25 nhân sự)', desc: 'Xuất đầy đủ 21 nhân sự QLCL và 4 công nhân kiểm tra tại chuyền' },
                  { value: 'QLCL_ONLY', label: 'Chỉ Khối Quản lý, Giám sát & QC Văn phòng (21 nhân sự)', desc: 'Chỉ bao gồm Quản lý, QA Lead, QA Admin, QC Supervisor, IQC, PQC' },
                  { value: 'QCSX_ONLY', label: 'Chỉ Khối Công nhân kiểm tra QCSX tại chuyền (4 nhân sự)', desc: 'Chỉ bao gồm Thị Cẩm, Thạch Thị Vinh, Nguyễn Thị Hồng, Mai Thanh Trúc' }
                ].map((item) => (
                  <label
                    key={item.value}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: scope === item.value ? '2px solid #7B5233' : '1px solid #EADCC9',
                      backgroundColor: scope === item.value ? '#FAF7F2' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="radio"
                      name="kpi_scope"
                      value={item.value}
                      checked={scope === item.value}
                      onChange={() => setScope(item.value)}
                      style={{ marginTop: '3px', accentColor: '#7B5233' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#3D2B1F' }}>{item.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#8C7A6B', marginTop: '2px' }}>{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Thông tin mô tả cấu trúc file xuất */}
            <div style={{
              backgroundColor: '#F8F9FA',
              border: '1px dashed #D6C7B2',
              borderRadius: '10px',
              padding: '14px 16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Layers size={16} color="#7B5233" />
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#7B5233' }}>
                  CẤU TRÚC FILE XUẤT CHUẨN ERP G7
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: '#555555', lineHeight: '1.6' }}>
                <li><strong>Sheet 1:</strong> Bảng đánh giá KPI nhân viên CL (Đầy đủ 20 cột A - T, công thức IF đối chiếu, SUM tổng điểm).</li>
                <li><strong>Sheet 2:</strong> QCSX (Chi tiết tiêu chuẩn, mô tả công việc và cách tính cho từng vị trí chuyền).</li>
                <li><strong>Dữ liệu động:</strong> Tự động truy xuất kết quả thực hiện thực tế từ các phiếu kiểm tra, ngày công, CAPA, Claim trong CSDL.</li>
              </ul>
            </div>
          </div>

          {/* Footer Nút bấm */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid #EADCC9'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                height: '40px',
                padding: '0 20px',
                borderRadius: '8px',
                border: '1px solid #D6C7B2',
                backgroundColor: '#FFFFFF',
                color: '#5D4037',
                fontWeight: '700',
                fontSize: '0.88rem',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                height: '40px',
                padding: '0 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#1E6F5C',
                color: '#FFFFFF',
                fontWeight: '700',
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(30, 111, 92, 0.3)',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #ffffff',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  <span>Đang tổng hợp dữ liệu...</span>
                </>
              ) : (
                <>
                  <Download size={17} />
                  <span>Tải File Excel (.xlsx)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ExportKPIModal;

