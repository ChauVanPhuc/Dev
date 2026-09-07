import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, Printer, RefreshCw, Download, Columns, Search, SlidersHorizontal, Check } from 'lucide-react';
import apiClient from '@shared/services/api';

const DailyHeadcountSummaryModal = ({ isOpen, onClose }) => {
  const [viewMode, setViewMode] = useState('SUMMARY'); // 'SUMMARY' | 'DETAILS'
  const [periodType, setPeriodType] = useState('day'); // 'day' | 'week' | 'month'
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().substring(0, 7));
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  
  // Search & Filter state for Details View
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFactory, setSelectedFactory] = useState('ALL');

  // Column Visibility Config State
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [summaryColumns, setSummaryColumns] = useState({
    stt: true, category: true, total: true, working: true,
    leave_paid: true, leave_unpaid: true, early_1630: true,
    half_day: true, ot_20h: true, ot_22h: true
  });
  const [detailsColumns, setDetailsColumns] = useState({
    stt: true, employee_id: true, full_name: true, category: true,
    stage: true, factory: true, status_display: true, overtime_hours: true, note: true
  });

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const payload = {
        report_type: viewMode === 'SUMMARY' ? 'summary' : 'detail',
        factory: selectedFactory,
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
      link.download = `Bao_Cao_Quan_So_${viewMode.toLowerCase()}_${periodType}_${periodType === 'month' ? reportMonth : reportDate}.xlsx`;
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
  const details = summaryData?.details || [];
  const periodLabel = summaryData?.period_label || (
    periodType === 'day' ? `NGÀY ${new Date(reportDate).toLocaleDateString('vi-VN')}` :
    periodType === 'week' ? `TUẦN` : `THÁNG ${reportMonth}`
  );

  // Filter detailed list
  const filteredDetails = details.filter(item => {
    if (selectedFactory !== 'ALL' && item.factory !== selectedFactory) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (item.full_name && item.full_name.toLowerCase().includes(term)) ||
      (item.employee_id && item.employee_id.toLowerCase().includes(term)) ||
      (item.category && item.category.toLowerCase().includes(term)) ||
      (item.stage && item.stage.toLowerCase().includes(term)) ||
      (item.factory && item.factory.toLowerCase().includes(term)) ||
      (item.status_display && item.status_display.toLowerCase().includes(term))
    );
  });

  const toggleSummaryColumn = (key) => {
    setSummaryColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDetailsColumn = (key) => {
    setDetailsColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '1000px', width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '92vh'
      }}>
        {/* Header Modal */}
        <div style={{ padding: '16px 24px', backgroundColor: '#3D2B1F', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>BIỂU BÁO CÁO QUÂN SỐ QUẢN LÝ CHẤT LƯỢNG</h3>
            <span style={{ fontSize: '0.75rem', color: '#EADCC9' }}>Thống kê hiện diện, nghỉ phép & tăng ca theo Bộ phận & Chi tiết nhân sự</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation Bar: VIEW MODES & PERIOD SELECTION */}
        <div style={{ padding: '10px 24px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* CHẾ ĐỘ XEM: THỐNG KÊ VS CHI TIẾT */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#EFEAE3', padding: '3px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
            <button
              onClick={() => setViewMode('SUMMARY')}
              style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                backgroundColor: viewMode === 'SUMMARY' ? '#7B5233' : 'transparent',
                color: viewMode === 'SUMMARY' ? '#FFFFFF' : '#4A2E1B',
                transition: 'all 0.15s ease'
              }}
            >
              📊 Thống Kê Tổng Hợp
            </button>
            <button
              onClick={() => setViewMode('DETAILS')}
              style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                backgroundColor: viewMode === 'DETAILS' ? '#7B5233' : 'transparent',
                color: viewMode === 'DETAILS' ? '#FFFFFF' : '#4A2E1B',
                transition: 'all 0.15s ease'
              }}
            >
              📋 Chi Tiết Nhân Sự ({details.length})
            </button>
          </div>

          {/* PERIOD TYPE SELECTION: NGÀY / TUẦN / THÁNG */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#EADCC9', padding: '3px', borderRadius: '8px' }}>
            <button
              onClick={() => setPeriodType('day')}
              style={{
                padding: '5px 12px', borderRadius: '6px', border: 'none', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
                backgroundColor: periodType === 'day' ? '#3D2B1F' : 'transparent',
                color: periodType === 'day' ? '#FFFFFF' : '#4A2E1B'
              }}
            >
              📅 Ngày
            </button>
            <button
              onClick={() => setPeriodType('week')}
              style={{
                padding: '5px 12px', borderRadius: '6px', border: 'none', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
                backgroundColor: periodType === 'week' ? '#3D2B1F' : 'transparent',
                color: periodType === 'week' ? '#FFFFFF' : '#4A2E1B'
              }}
            >
              📆 Tuần
            </button>
            <button
              onClick={() => setPeriodType('month')}
              style={{
                padding: '5px 12px', borderRadius: '6px', border: 'none', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
                backgroundColor: periodType === 'month' ? '#3D2B1F' : 'transparent',
                color: periodType === 'month' ? '#FFFFFF' : '#4A2E1B'
              }}
            >
              🗓️ Tháng
            </button>
          </div>

          {/* DATE PICKER & REFRESH */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {periodType === 'month' ? (
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                style={{ height: '34px', padding: '0 10px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FFFFFF', fontWeight: 700, fontSize: '0.8rem', color: '#2D1A12', outline: 'none' }}
              />
            ) : (
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                style={{ height: '34px', padding: '0 10px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FFFFFF', fontWeight: 700, fontSize: '0.8rem', color: '#2D1A12', outline: 'none' }}
              />
            )}

            <button
              onClick={loadSummary}
              style={{ height: '34px', width: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: '8px', cursor: 'pointer', color: '#7B5233' }}
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Sub-toolbar: SEARCH, FACTORY FILTER, EDIT COLUMNS BUTTON & EXPORT */}
        <div style={{ padding: '8px 24px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* LEFT CONTROLS: SEARCH & FACTORY FILTER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            {viewMode === 'DETAILS' && (
              <>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', backgroundColor: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: '8px', padding: '0 8px', height: '32px', width: '260px' }}>
                  <Search size={14} style={{ color: '#7B5233', marginRight: '6px' }} />
                  <input
                    type="text"
                    placeholder="Tìm mã NV, tên, phòng ban..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.78rem', color: '#2D1A12' }}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '2px' }}>
                      <X size={12} />
                    </button>
                  )}
                </div>

                <select
                  value={selectedFactory}
                  onChange={(e) => setSelectedFactory(e.target.value)}
                  style={{ height: '32px', padding: '0 10px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', fontWeight: 700, fontSize: '0.78rem', color: '#3D2B1F', outline: 'none' }}
                >
                  <option value="ALL">Tất cả Nhà máy</option>
                  <option value="NM1">Nhà máy NM1</option>
                  <option value="NM2">Nhà máy NM2</option>
                  <option value="NM3">Nhà máy NM3</option>
                </select>
              </>
            )}
          </div>

          {/* RIGHT CONTROLS: COLUMN CONFIG DROPDOWN, PRINT & EXPORT */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            
            {/* CONTAINER BỌC NÚT & POPUP ẨN/HIỆN CỘT */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowColumnConfig(!showColumnConfig)}
                style={{
                  height: '32px', padding: '0 12px', borderRadius: '8px', border: '1px solid #EADCC9',
                  backgroundColor: showColumnConfig ? '#FAF6F0' : '#FFFFFF', color: '#7B5233',
                  fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                }}
              >
                <Columns size={14} />
                <span>Hiện/Ẩn Cột</span>
              </button>

              {/* POPUP CHỌN CỘT (CÓ Z-INDEX CAO 9999 TRÁNH BỊ BẢNG ĐÈ) */}
              {showColumnConfig && (
                <div style={{
                  position: 'absolute', top: '38px', right: 0, zIndex: 9999,
                  backgroundColor: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: '10px',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.25), 0 8px 10px -6px rgba(0,0,0,0.1)',
                  padding: '12px', width: '220px'
                }}>
                  <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#3D2B1F', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Tùy chỉnh cột ({viewMode === 'SUMMARY' ? 'Thống kê' : 'Chi tiết'})</span>
                    <X size={14} style={{ cursor: 'pointer' }} onClick={() => setShowColumnConfig(false)} />
                  </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                  {viewMode === 'SUMMARY' ? (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={summaryColumns.stt} onChange={() => toggleSummaryColumn('stt')} /> STT
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={summaryColumns.category} onChange={() => toggleSummaryColumn('category')} /> Bộ phận
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={summaryColumns.total} onChange={() => toggleSummaryColumn('total')} /> Tổng QS
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={summaryColumns.working} onChange={() => toggleSummaryColumn('working')} /> Đi làm
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={summaryColumns.leave_paid} onChange={() => toggleSummaryColumn('leave_paid')} /> Vắng CP
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={summaryColumns.leave_unpaid} onChange={() => toggleSummaryColumn('leave_unpaid')} /> Vắng KP
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={summaryColumns.early_1630} onChange={() => toggleSummaryColumn('early_1630')} /> Về 16h30
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={summaryColumns.half_day} onChange={() => toggleSummaryColumn('half_day')} /> Nghỉ 0.5d
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={summaryColumns.ot_20h} onChange={() => toggleSummaryColumn('ot_20h')} /> Lượt 20h
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={summaryColumns.ot_22h} onChange={() => toggleSummaryColumn('ot_22h')} /> Lượt 22h
                      </label>
                    </>
                  ) : (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={detailsColumns.stt} onChange={() => toggleDetailsColumn('stt')} /> STT
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={detailsColumns.employee_id} onChange={() => toggleDetailsColumn('employee_id')} /> Mã NV
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={detailsColumns.full_name} onChange={() => toggleDetailsColumn('full_name')} /> Họ và tên
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={detailsColumns.category} onChange={() => toggleDetailsColumn('category')} /> Nhóm
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={detailsColumns.stage} onChange={() => toggleDetailsColumn('stage')} /> Phòng ban/Công đoạn
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={detailsColumns.factory} onChange={() => toggleDetailsColumn('factory')} /> Nhà máy
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={detailsColumns.status_display} onChange={() => toggleDetailsColumn('status_display')} /> Trạng thái
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={detailsColumns.overtime_hours} onChange={() => toggleDetailsColumn('overtime_hours')} /> Giờ OT
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer' }}>
                        <input type="checkbox" checked={detailsColumns.note} onChange={() => toggleDetailsColumn('note')} /> Ghi chú
                      </label>
                    </>
                  )}
                </div>
              </div>
            )}
            </div>

            <button
              onClick={() => window.print()}
              style={{ height: '32px', padding: '0 12px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FFFFFF', color: '#7B5233', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Printer size={14} />
              <span>In báo cáo</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={exporting}
              style={{ height: '32px', padding: '0 14px', borderRadius: '8px', border: 'none', backgroundColor: '#166534', color: '#FFFFFF', fontWeight: 700, fontSize: '0.78rem', cursor: exporting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Download size={14} />
              <span>{exporting ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>
          </div>
        </div>

        {/* Content Table Container */}
        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: '#3D2B1F', textAlign: 'center', textTransform: 'uppercase' }}>
            {viewMode === 'SUMMARY' ? `BẢNG TỔNG HỢP QUÂN SỐ ${periodLabel.toUpperCase()}` : `DANH SÁCH CHI TIẾT QUÂN SỐ CHẤM CÔNG ${periodLabel.toUpperCase()}`}
          </h4>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.75rem', color: '#7B5233', textAlign: 'center', fontWeight: 600 }}>
            {viewMode === 'SUMMARY' ? 'Thống kê tình trạng điểm danh & quân số chi tiết theo từng Bộ phận' : `Hiển thị danh sách ${filteredDetails.length} nhân sự và trạng thái hiện diện`}
          </p>

          {/* VIEW MODE 1: SUMMARY MATRIX TABLE */}
          {viewMode === 'SUMMARY' && (
            <div className="mgmt-table card" style={{ overflowX: 'auto', border: '1px solid #EADCC9', borderRadius: '10px' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FAF6F0' }}>
                    {summaryColumns.stt && <th style={{ textAlign: 'center', width: '50px' }}>STT</th>}
                    {summaryColumns.category && <th>BỘ PHẬN</th>}
                    {summaryColumns.total && <th style={{ textAlign: 'center', fontWeight: 800 }}>TỔNG QS</th>}
                    {summaryColumns.working && <th style={{ textAlign: 'center', color: '#166534' }}>{periodType === 'day' ? 'Đi làm' : 'Lượt đi làm'}</th>}
                    {summaryColumns.leave_paid && <th style={{ textAlign: 'center', color: '#92400E' }}>Vắng CP</th>}
                    {summaryColumns.leave_unpaid && <th style={{ textAlign: 'center', color: '#991B1B' }}>Vắng KP</th>}
                    {summaryColumns.early_1630 && <th style={{ textAlign: 'center', color: '#C2410C' }}>Về 16h30</th>}
                    {summaryColumns.half_day && <th style={{ textAlign: 'center', color: '#854D0E' }}>Nghỉ 0.5d</th>}
                    {summaryColumns.ot_20h && <th style={{ textAlign: 'center', color: '#3730A3' }}>Lượt 20h</th>}
                    {summaryColumns.ot_22h && <th style={{ textAlign: 'center', color: '#6B21A8' }}>Lượt 22h</th>}
                  </tr>
                </thead>
                <tbody>
                  {['Quản lý', 'QA', 'QC', 'NVSX'].map((cat, idx) => {
                    const item = summary[cat] || {};
                    return (
                      <tr key={cat}>
                        {summaryColumns.stt && <td style={{ textAlign: 'center', fontWeight: 700, color: '#7B5233' }}>{idx + 1}</td>}
                        {summaryColumns.category && <td style={{ fontWeight: 800, color: '#2D1A12' }}>{cat}</td>}
                        {summaryColumns.total && <td style={{ textAlign: 'center', fontWeight: 800, backgroundColor: '#FAF8F5' }}>{item.total || 0}</td>}
                        {summaryColumns.working && <td style={{ textAlign: 'center', fontWeight: 700, color: '#166534' }}>{item.working || 0}</td>}
                        {summaryColumns.leave_paid && <td style={{ textAlign: 'center', fontWeight: 700, color: item.leave_paid > 0 ? '#92400E' : '#9CA3AF' }}>{item.leave_paid || 0}</td>}
                        {summaryColumns.leave_unpaid && <td style={{ textAlign: 'center', fontWeight: 700, color: item.leave_unpaid > 0 ? '#991B1B' : '#9CA3AF' }}>{item.leave_unpaid || 0}</td>}
                        {summaryColumns.early_1630 && <td style={{ textAlign: 'center', fontWeight: 700, color: item.early_1630 > 0 ? '#C2410C' : '#9CA3AF' }}>{item.early_1630 || 0}</td>}
                        {summaryColumns.half_day && <td style={{ textAlign: 'center', fontWeight: 700, color: item.half_day > 0 ? '#854D0E' : '#9CA3AF' }}>{item.half_day || 0}</td>}
                        {summaryColumns.ot_20h && <td style={{ textAlign: 'center', fontWeight: 700, color: item.ot_20h > 0 ? '#3730A3' : '#9CA3AF' }}>{item.ot_20h || 0}</td>}
                        {summaryColumns.ot_22h && <td style={{ textAlign: 'center', fontWeight: 700, color: item.ot_22h > 0 ? '#6B21A8' : '#9CA3AF' }}>{item.ot_22h || 0}</td>}
                      </tr>
                    );
                  })}
                  <tr style={{ backgroundColor: '#FAF6F0', fontWeight: 800 }}>
                    {summaryColumns.stt && <td style={{ textAlign: 'center' }}>-</td>}
                    {summaryColumns.category && <td style={{ color: '#3D2B1F' }}>TỔNG CỘNG</td>}
                    {summaryColumns.total && <td style={{ textAlign: 'center', color: '#3D2B1F', fontSize: '0.95rem' }}>{totals.total || 0}</td>}
                    {summaryColumns.working && <td style={{ textAlign: 'center', color: '#166534' }}>{totals.working || 0}</td>}
                    {summaryColumns.leave_paid && <td style={{ textAlign: 'center', color: '#92400E' }}>{totals.leave_paid || 0}</td>}
                    {summaryColumns.leave_unpaid && <td style={{ textAlign: 'center', color: '#991B1B' }}>{totals.leave_unpaid || 0}</td>}
                    {summaryColumns.early_1630 && <td style={{ textAlign: 'center', color: '#C2410C' }}>{totals.early_1630 || 0}</td>}
                    {summaryColumns.half_day && <td style={{ textAlign: 'center', color: '#854D0E' }}>{totals.half_day || 0}</td>}
                    {summaryColumns.ot_20h && <td style={{ textAlign: 'center', color: '#3730A3' }}>{totals.ot_20h || 0}</td>}
                    {summaryColumns.ot_22h && <td style={{ textAlign: 'center', color: '#6B21A8' }}>{totals.ot_22h || 0}</td>}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW MODE 2: DETAILED EMPLOYEES TABLE */}
          {viewMode === 'DETAILS' && (
            <div className="mgmt-table card" style={{ overflowX: 'auto', border: '1px solid #EADCC9', borderRadius: '10px' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FAF6F0' }}>
                    {detailsColumns.stt && <th style={{ textAlign: 'center', width: '45px' }}>STT</th>}
                    {detailsColumns.employee_id && <th style={{ textAlign: 'center', width: '90px' }}>MÃ NV</th>}
                    {detailsColumns.full_name && <th>HỌ VÀ TÊN</th>}
                    {detailsColumns.category && <th style={{ textAlign: 'center' }}>NHÓM</th>}
                    {detailsColumns.stage && <th>PHÒNG BAN / CÔNG ĐOẠN</th>}
                    {detailsColumns.factory && <th style={{ textAlign: 'center' }}>NHÀ MÁY</th>}
                    {detailsColumns.status_display && <th style={{ textAlign: 'center' }}>TRẠNG THÁI</th>}
                    {detailsColumns.overtime_hours && <th style={{ textAlign: 'center' }}>GIỜ OT</th>}
                    {detailsColumns.note && <th>GHI CHÚ</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredDetails.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#6B7280' }}>
                        Không tìm thấy nhân sự phù hợp dữ liệu tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredDetails.map((emp, idx) => {
                      const isOT = emp.status_display.includes('Tăng ca');
                      const isLeave = emp.status_display.includes('Vắng') || emp.status_display.includes('Nghỉ') || emp.status_display.includes('Về');
                      return (
                        <tr key={emp.employee_id}>
                          {detailsColumns.stt && <td style={{ textAlign: 'center', fontWeight: 700, color: '#7B5233' }}>{idx + 1}</td>}
                          {detailsColumns.employee_id && <td style={{ textAlign: 'center', fontWeight: 700, color: '#4B5563' }}>{emp.employee_id}</td>}
                          {detailsColumns.full_name && <td style={{ fontWeight: 800, color: '#2D1A12' }}>{emp.full_name}</td>}
                          {detailsColumns.category && <td style={{ textAlign: 'center', fontWeight: 700, color: '#7B5233' }}>{emp.category}</td>}
                          {detailsColumns.stage && <td>{emp.stage || emp.department}</td>}
                          {detailsColumns.factory && <td style={{ textAlign: 'center', fontWeight: 700 }}>{emp.factory}</td>}
                          {detailsColumns.status_display && (
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800,
                                backgroundColor: isOT ? '#EEF2FF' : (isLeave ? '#FEF2F2' : '#F0FDF4'),
                                color: isOT ? '#4F46E5' : (isLeave ? '#DC2626' : '#166534'),
                                border: `1px solid ${isOT ? '#C7D2FE' : (isLeave ? '#FECACA' : '#BBF7D0')}`
                              }}>
                                {emp.status_display}
                              </span>
                            </td>
                          )}
                          {detailsColumns.overtime_hours && (
                            <td style={{ textAlign: 'center', fontWeight: 800, color: emp.overtime_hours > 0 ? '#4F46E5' : '#9CA3AF' }}>
                              {emp.overtime_hours > 0 ? `${emp.overtime_hours}h` : '-'}
                            </td>
                          )}
                          {detailsColumns.note && (
                            <td style={{ fontSize: '0.75rem', color: '#6B7280', fontStyle: 'italic' }}>
                              {emp.note || '-'}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', backgroundColor: '#FAF6F0', borderTop: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#7B5233', fontWeight: 600 }}>
            {viewMode === 'SUMMARY' ? `Tổng quân số quản lý: ${totals.total || 0} nhân sự` : `Hiển thị ${filteredDetails.length} / ${details.length} nhân sự`}
          </span>
          <button
            onClick={onClose}
            style={{ padding: '7px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#3D2B1F', color: '#FFFFFF', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyHeadcountSummaryModal;
