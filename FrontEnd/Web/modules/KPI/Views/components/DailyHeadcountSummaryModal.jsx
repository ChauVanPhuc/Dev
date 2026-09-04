import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, Printer, RefreshCw, Download } from 'lucide-react';
import apiClient from '@shared/services/api';

const DailyHeadcountSummaryModal = ({ isOpen, onClose }) => {
  const [periodType, setPeriodType] = useState('day'); // 'day' | 'week' | 'month'
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().substring(0, 7));
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const payload = {
        report_type: 'summary',
        factory: 'ALL',
        department: 'ALL'
      };
      if (periodType === 'month') {
        payload.month = reportMonth;
      } else {
        payload.start_date = reportDate;
        payload.end_date = reportDate;
      }

      const res = await apiClient.post('/quality-employees/attendance/export-excel', payload, {
        responseType: 'blob'
      });

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Bao_Cao_Quan_So_${periodType}_${periodType === 'month' ? reportMonth : reportDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Lỗi xuất báo cáo quân số Excel:', err);
    } finally {
      setExporting(false);
    }
  };

  const loadSummary = async () => {
    setLoading(true);
    try {
      const params = { period_type: periodType };
      if (periodType === 'month') {
        params.report_month = reportMonth;
      } else {
        params.report_date = reportDate;
      }

      const res = await apiClient.get('/quality-employees/attendance/daily-summary', { params });
      if (res.data) {
        setSummaryData(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải báo cáo quân số:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSummary();
    }
  }, [isOpen, periodType, reportDate, reportMonth]);

  if (!isOpen) return null;

  const summary = summaryData?.summary || {};
  const totals = summaryData?.totals || {};
  const periodLabel = summaryData?.period_label || (
    periodType === 'day' ? `NGÀY ${new Date(reportDate).toLocaleDateString('vi-VN')}` :
    periodType === 'week' ? `TUẦN` : `THÁNG ${reportMonth}`
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '960px', width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        {/* Header Modal */}
        <div style={{ padding: '18px 24px', backgroundColor: '#3D2B1F', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>BIỂU BÁO CÁO QUÂN SỐ QUẢN LÝ CHẤT LƯỢNG</h3>
            <span style={{ fontSize: '0.75rem', color: '#EADCC9' }}>Thống kê hiện diện, nghỉ phép & tăng ca theo Bộ phận (Theo Ngày / Tuần / Tháng)</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Toolbar: Period Tabs & Controls */}
        <div style={{ padding: '12px 24px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* TAB CHỌN LOẠI BÁO CÁO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#EADCC9', padding: '3px', borderRadius: '8px' }}>
            <button
              onClick={() => setPeriodType('day')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                backgroundColor: periodType === 'day' ? '#3D2B1F' : 'transparent',
                color: periodType === 'day' ? '#FFFFFF' : '#4A2E1B',
                transition: 'all 0.15s ease'
              }}
            >
              📅 Theo Ngày
            </button>
            <button
              onClick={() => setPeriodType('week')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                backgroundColor: periodType === 'week' ? '#3D2B1F' : 'transparent',
                color: periodType === 'week' ? '#FFFFFF' : '#4A2E1B',
                transition: 'all 0.15s ease'
              }}
            >
              📆 Theo Tuần
            </button>
            <button
              onClick={() => setPeriodType('month')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                backgroundColor: periodType === 'month' ? '#3D2B1F' : 'transparent',
                color: periodType === 'month' ? '#FFFFFF' : '#4A2E1B',
                transition: 'all 0.15s ease'
              }}
            >
              🗓️ Theo Tháng
            </button>
          </div>

          {/* DYNAMIC DATE/MONTH PICKER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#3D2B1F' }}>
              {periodType === 'day' ? 'Chọn ngày:' : periodType === 'week' ? 'Chọn tuần (qua ngày):' : 'Chọn tháng:'}
            </label>
            
            {periodType === 'month' ? (
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                style={{ height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FFFFFF', fontWeight: 700, color: '#2D1A12', outline: 'none' }}
              />
            ) : (
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                style={{ height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FFFFFF', fontWeight: 700, color: '#2D1A12', outline: 'none' }}
              />
            )}

            <button
              onClick={loadSummary}
              style={{ height: '36px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: '8px', cursor: 'pointer', color: '#7B5233' }}
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => window.print()}
              style={{ height: '36px', padding: '0 14px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FFFFFF', color: '#7B5233', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={16} />
              <span>In báo cáo</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={exporting}
              style={{ height: '36px', padding: '0 14px', borderRadius: '8px', border: 'none', backgroundColor: '#166534', color: '#FFFFFF', fontWeight: 700, fontSize: '0.8rem', cursor: exporting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={16} />
              <span>{exporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: '#3D2B1F', textAlign: 'center', textTransform: 'uppercase' }}>
            BẢNG TỔNG HỢP QUÂN SỐ {periodLabel.toUpperCase()}
          </h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.75rem', color: '#7B5233', textAlign: 'center', fontWeight: 600 }}>
            {periodType === 'day' ? 'Thống kê tình trạng điểm danh & quân số chi tiết trong ngày' :
             periodType === 'week' ? 'Thống kê tổng hợp số lượt đi làm, nghỉ phép & tăng ca trong tuần' :
             'Thống kê tổng hợp số lượt đi làm, nghỉ phép & tăng ca trong tháng'}
          </p>

          <div className="mgmt-table card" style={{ overflowX: 'auto', border: '1px solid #EADCC9', borderRadius: '10px' }}>
            <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAF6F0' }}>
                  <th style={{ textAlign: 'center', width: '50px' }}>STT</th>
                  <th>BỘ PHẬN</th>
                  <th style={{ textAlign: 'center', fontWeight: 800 }}>TỔNG QS</th>
                  <th style={{ textAlign: 'center', color: '#166534' }}>{periodType === 'day' ? 'Đi làm' : 'Lượt đi làm'}</th>
                  <th style={{ textAlign: 'center', color: '#92400E' }}>Vắng CP</th>
                  <th style={{ textAlign: 'center', color: '#991B1B' }}>Vắng KP</th>
                  <th style={{ textAlign: 'center', color: '#C2410C' }}>Về 16h30</th>
                  <th style={{ textAlign: 'center', color: '#854D0E' }}>Nghỉ 0.5d</th>
                  <th style={{ textAlign: 'center', color: '#3730A3' }}>Lượt 20h</th>
                  <th style={{ textAlign: 'center', color: '#6B21A8' }}>Lượt 22h</th>
                </tr>
              </thead>
              <tbody>
                {['Quản lý', 'QA', 'QC', 'NVSX'].map((cat, idx) => {
                  const item = summary[cat] || {};
                  return (
                    <tr key={cat}>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#7B5233' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 800, color: '#2D1A12' }}>{cat}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800, backgroundColor: '#FAF8F5' }}>{item.total || 0}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#166534' }}>{item.working || 0}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: item.leave_paid > 0 ? '#92400E' : '#9CA3AF' }}>{item.leave_paid || 0}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: item.leave_unpaid > 0 ? '#991B1B' : '#9CA3AF' }}>{item.leave_unpaid || 0}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: item.early_1630 > 0 ? '#C2410C' : '#9CA3AF' }}>{item.early_1630 || 0}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: item.half_day > 0 ? '#854D0E' : '#9CA3AF' }}>{item.half_day || 0}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: item.ot_20h > 0 ? '#3730A3' : '#9CA3AF' }}>{item.ot_20h || 0}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: item.ot_22h > 0 ? '#6B21A8' : '#9CA3AF' }}>{item.ot_22h || 0}</td>
                    </tr>
                  );
                })}
                <tr style={{ backgroundColor: '#FAF6F0', fontWeight: 800 }}>
                  <td colSpan={2} style={{ textAlign: 'center', color: '#3D2B1F' }}>TỔNG CỘNG</td>
                  <td style={{ textAlign: 'center', color: '#3D2B1F', fontSize: '0.95rem' }}>{totals.total || 0}</td>
                  <td style={{ textAlign: 'center', color: '#166534' }}>{totals.working || 0}</td>
                  <td style={{ textAlign: 'center', color: '#92400E' }}>{totals.leave_paid || 0}</td>
                  <td style={{ textAlign: 'center', color: '#991B1B' }}>{totals.leave_unpaid || 0}</td>
                  <td style={{ textAlign: 'center', color: '#C2410C' }}>{totals.early_1630 || 0}</td>
                  <td style={{ textAlign: 'center', color: '#854D0E' }}>{totals.half_day || 0}</td>
                  <td style={{ textAlign: 'center', color: '#3730A3' }}>{totals.ot_20h || 0}</td>
                  <td style={{ textAlign: 'center', color: '#6B21A8' }}>{totals.ot_22h || 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', backgroundColor: '#FAF6F0', borderTop: '1px solid #EADCC9', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#3D2B1F', color: '#FFFFFF', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyHeadcountSummaryModal;
