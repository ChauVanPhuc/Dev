import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Filter, Plus, Clock, FileText, Search, RefreshCw, Trash2, X, UserCheck, AlertCircle, Download } from 'lucide-react';
import apiClient from '@shared/services/api';
import QualityAttendancePopup from './QualityAttendancePopup';
import ExportAttendanceModal from './ExportAttendanceModal';

const STATUS_BADGE_STYLE = {
  LEAVE_PAID: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', label: 'Vắng CP' },
  LEAVE_UNPAID: { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', label: 'Vắng KP' },
  EARLY_LEAVE_1630: { bg: '#FFEDD5', color: '#C2410C', border: '#FDBA74', label: 'Về 16h30' },
  HALF_DAY: { bg: '#FEF9C3', color: '#854D0E', border: '#FDE047', label: 'Nghỉ 0.5d' },
  OT_20H: { bg: '#E0E7FF', color: '#3730A3', border: '#C7D2FE', label: '20h' },
  OT_22H: { bg: '#F3E8FF', color: '#6B21A8', border: '#E9D5FF', label: '22h' },
  SUNDAY_OFF: { bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB', label: 'Vắng CN' },
  WORKING: { bg: '#DCFCE7', color: '#166534', border: '#86EFAC', label: 'Đi làm' }
};

const QualityEmployeeCalendarView = ({ onOpenLeaveModal, onOpenOtModal, onOpenSummaryModal, refreshTrigger }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1)); // Default Sep 2026
  const [selectedFactory, setSelectedFactory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [calendarData, setCalendarData] = useState({});
  const [employees, setEmployees] = useState([]);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  
  // Selected Day Detail Modal & Tab
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayEvents, setDayEvents] = useState([]);
  const [dayTab, setDayTab] = useState('OT'); // 'OT' | 'LEAVE'

  const otEvents = dayEvents.filter(e => e.status === 'OT_20H' || e.status === 'OT_22H');
  const leaveEvents = dayEvents.filter(e => ['LEAVE_PAID', 'LEAVE_UNPAID', 'EARLY_LEAVE_1630', 'HALF_DAY', 'SUNDAY_OFF'].includes(e.status));

  const handleQuickUpdateRecord = async (id, newStatus) => {
    try {
      await apiClient.put(`/quality-employees/attendance/${id}`, { status: newStatus });
      setDayEvents(prev => prev.map(item => {
        if (item.id === id) {
          const STATUS_LABEL_MAP_LOCAL = {
            'OT_20H': '20h', 'OT_22H': '22h',
            'LEAVE_PAID': 'Vắng CP', 'LEAVE_UNPAID': 'Vắng KP',
            'EARLY_LEAVE_1630': 'Về 16h30', 'HALF_DAY': 'Nghỉ 0.5d', 'SUNDAY_OFF': 'Vắng CN'
          };
          return {
            ...item,
            status: newStatus,
            status_label: STATUS_LABEL_MAP_LOCAL[newStatus] || newStatus,
            overtime_hours: newStatus === 'OT_22H' ? 4.0 : (newStatus === 'OT_20H' ? 2.0 : 0.0)
          };
        }
        return item;
      }));
      loadData();
    } catch (err) {
      console.error('Lỗi khi cập nhật nhanh bản ghi:', err);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const STATUS_PRIORITY = {
    OT_22H: 1,
    OT_20H: 2,
    LEAVE_PAID: 3,
    LEAVE_UNPAID: 4,
    HALF_DAY: 5,
    EARLY_LEAVE_1630: 6,
    SUNDAY_OFF: 7,
    WORKING: 8
  };

  const sortEventsByPriority = (eventsList) => {
    if (!eventsList || !eventsList.length) return [];
    return [...eventsList].sort((a, b) => {
      const pA = STATUS_PRIORITY[a.status] || 99;
      const pB = STATUS_PRIORITY[b.status] || 99;
      if (pA !== pB) return pA - pB;
      return (b.id || 0) - (a.id || 0); // Newest ID first
    });
  };

  const loadData = async () => {
    setLoading(true);
    console.log(`[CalendarView] 🔄 Tải dữ liệu lịch chấm công tháng ${monthStr} (refreshTrigger: ${refreshTrigger})`);
    try {
      const res = await apiClient.get('/quality-employees/attendance/calendar', {
        params: {
          month: monthStr,
          factory: selectedFactory || undefined
        }
      });
      if (res.data) {
        const cal = res.data.calendar || {};
        console.log(`[CalendarView] ✅ Tải dữ liệu lịch thành công! Tổng số ngày có dữ liệu: ${Object.keys(cal).length}`);
        setCalendarData(cal);
        setEmployees(res.data.employees || []);
        if (selectedDay) {
          setDayEvents(sortEventsByPriority(cal[selectedDay] || []));
        }
      }
    } catch (err) {
      console.error('[CalendarView] ❌ Lỗi tải dữ liệu lịch chấm công:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [monthStr, selectedFactory, refreshTrigger]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Custom Popup Dialog state
  const [popupState, setPopupState] = useState({ isOpen: false, type: 'info', title: '', message: '', onConfirm: null });

  const handleDeleteRecord = (id) => {
    setPopupState({
      isOpen: true,
      type: 'confirm',
      title: 'Xác nhận xóa bản ghi',
      message: 'Bạn có chắc chắn muốn xóa bản ghi chấm công / báo phép này khỏi lịch?',
      confirmText: 'Xóa ngay',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/quality-employees/attendance/${id}`);
          loadData();
          if (selectedDay) {
            setDayEvents(prev => prev.filter(e => e.id !== id));
          }
          setPopupState({ isOpen: false });
        } catch (err) {
          setPopupState({
            isOpen: true,
            type: 'error',
            title: 'Lỗi xóa bản ghi',
            message: 'Không thể xóa bản ghi chấm công này.',
            confirmText: 'Đóng'
          });
        }
      }
    });
  };

  // Helper to build days grid for the month
  const getDaysInMonthGrid = () => {
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);
    const totalDays = lastDayOfMonth.getDate();

    // Monday is index 0 in standard VI calendar (getDays(): Sun=0, Mon=1...)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday

    const grid = [];
    // Padding preceding blank cells
    for (let i = 0; i < startDayOfWeek; i++) {
      grid.push(null);
    }
    // Days 1..totalDays
    for (let d = 1; d <= totalDays; d++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const rawEvents = calendarData[dStr] || [];
      grid.push({
        dayNumber: d,
        dateStr: dStr,
        events: sortEventsByPriority(rawEvents)
      });
    }
    return grid;
  };

  const daysGrid = getDaysInMonthGrid();
  const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

  // Filter events by search term if typed
  const filterEvents = (events) => {
    if (!searchTerm) return events;
    return events.filter(e => 
      e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.status_label && e.status_label.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // Calculate monthly stats
  let totalLeaveCount = 0;
  let totalOtHours = 0;
  Object.values(calendarData).forEach(evList => {
    evList.forEach(e => {
      if (['LEAVE_PAID', 'LEAVE_UNPAID', 'EARLY_LEAVE_1630', 'HALF_DAY'].includes(e.status)) {
        totalLeaveCount++;
      }
      if (e.overtime_hours) {
        totalOtHours += e.overtime_hours;
      }
    });
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '12px', height: '100%' }}>
      {/* ── HEADER TOOLBAR & FILTERS ── */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #EADCC9',
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Điều hướng Tháng */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              onClick={handlePrevMonth}
              style={{ background: 'none', border: 'none', padding: '8px 12px', cursor: 'pointer', color: '#7B5233', display: 'flex', alignItems: 'center' }}
              title="Tháng trước"
            >
              <ChevronLeft size={18} />
            </button>
            <span style={{ padding: '0 12px', fontWeight: 800, fontSize: '0.95rem', color: '#3D2B1F', minWidth: '130px', textAlign: 'center' }}>
              Tháng {month} / {year}
            </span>
            <button
              onClick={handleNextMonth}
              style={{ background: 'none', border: 'none', padding: '8px 12px', cursor: 'pointer', color: '#7B5233', display: 'flex', alignItems: 'center' }}
              title="Tháng sau"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            onClick={handleCurrentMonth}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #EADCC9',
              backgroundColor: '#FAF6F0',
              color: '#7B5233',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Calendar size={14} />
            <span>Tháng hiện tại</span>
          </button>
        </div>

        {/* Thống kê nhanh tháng */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', color: '#92400E', fontWeight: 700 }}>
            Lượt nghỉ phép/vắng: <b>{totalLeaveCount}</b>
          </div>
          <div style={{ backgroundColor: '#F3E8FF', border: '1px solid #E9D5FF', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', color: '#6B21A8', fontWeight: 700 }}>
            Tổng giờ tăng ca: <b>{totalOtHours}h</b>
          </div>
        </div>

        {/* Lọc nhà máy & Tìm kiếm */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '220px', backgroundColor: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: '8px', padding: '0 10px', height: '36px' }}>
            <Search size={14} style={{ color: '#7B5233', marginRight: '6px' }} />
            <input
              type="text"
              placeholder="Tìm theo tên/mã NV..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.8rem', color: '#2D1A12' }}
            />
          </div>

          <select
            value={selectedFactory}
            onChange={(e) => setSelectedFactory(e.target.value)}
            style={{
              height: '36px',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid #EADCC9',
              backgroundColor: '#FFFFFF',
              color: '#7B5233',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <option value="">Tất cả nhà máy</option>
            <option value="Nhà máy 1">Nhà máy 1</option>
            <option value="Nhà máy 2">Nhà máy 2</option>
            <option value="Nhà máy 3">Nhà máy 3</option>
          </select>

          <button
            onClick={onOpenSummaryModal}
            style={{
              height: '36px',
              padding: '0 14px',
              borderRadius: '8px',
              backgroundColor: '#7B5233',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileText size={14} />
            <span>Báo cáo quân số ngày</span>
          </button>

          <button
            onClick={() => setExportModalOpen(true)}
            style={{
              height: '36px',
              padding: '0 14px',
              borderRadius: '8px',
              backgroundColor: '#166534',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(22, 101, 52, 0.2)'
            }}
            title="Xuất file Excel báo cáo chấm công & tăng ca nhiều tùy chọn"
          >
            <Download size={14} />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* ── LEGEND BẢNG MÃ MÀU TRẠNG THÁI ── */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '8px 16px', borderRadius: '8px', border: '1px solid #EADCC9', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4A2E1B' }}>Chú thích:</span>
        {Object.entries(STATUS_BADGE_STYLE).map(([code, st]) => (
          <div key={code} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, color: st.color }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: st.bg, border: `1px solid ${st.border}` }} />
            <span>{st.label}</span>
          </div>
        ))}
      </div>

      {/* ── KHUNG LỊCH CHÍNH (CALENDAR MATRIX GRID) ── */}
      <div style={{ flex: 1, backgroundColor: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '520px' }}>
        {/* Hàng Tiêu đề Thứ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9' }}>
          {weekDays.map((wDay, idx) => (
            <div key={wDay} style={{
              padding: '10px 4px',
              textAlign: 'center',
              fontWeight: 800,
              fontSize: '0.85rem',
              color: idx === 6 ? '#DC2626' : '#4A2E1B',
              borderRight: idx < 6 ? '1px solid #EADCC9' : 'none'
            }}>
              {wDay}
            </div>
          ))}
        </div>

        {/* Lưới các Ngày trong Tháng */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, backgroundColor: '#FDFBF7' }}>
          {daysGrid.map((item, index) => {
            if (!item) {
              return <div key={`blank_${index}`} style={{ backgroundColor: '#FAF8F5', borderRight: '1px solid #EADCC9', borderBottom: '1px solid #EADCC9' }} />;
            }

            const { dayNumber, dateStr, events } = item;
            const filteredEvs = filterEvents(events);
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const isSunday = (index % 7) === 6;

            return (
              <div
                key={dateStr}
                onClick={() => {
                  setSelectedDay(dateStr);
                  setDayEvents(events);
                }}
                style={{
                  borderRight: (index % 7) < 6 ? '1px solid #EADCC9' : 'none',
                  borderBottom: '1px solid #EADCC9',
                  padding: '6px',
                  backgroundColor: isToday ? '#FFFDF0' : (isSunday ? '#FAFAFA' : '#FFFFFF'),
                  minHeight: '100px',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FAF6F0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isToday ? '#FFFDF0' : (isSunday ? '#FAFAFA' : '#FFFFFF'); }}
              >
                {/* Ngày Header Cell */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    color: isSunday ? '#DC2626' : '#2D1A12',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: isToday ? '#7B5233' : 'transparent',
                    color: isToday ? '#FFFFFF' : (isSunday ? '#DC2626' : '#2D1A12'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {dayNumber}
                  </span>
                  {events.length > 0 && (
                    <span style={{ fontSize: '0.65rem', color: '#7B5233', backgroundColor: '#FAF6F0', padding: '1px 5px', borderRadius: '10px', fontWeight: 700 }}>
                      {events.length} sự kiện
                    </span>
                  )}
                </div>

                {/* Danh sách các Badge Sự kiện trong Ô */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto', maxHeight: '110px' }}>
                  {filteredEvs.slice(0, 4).map((ev) => {
                    const st = STATUS_BADGE_STYLE[ev.status] || STATUS_BADGE_STYLE.LEAVE_PAID;
                    return (
                      <div
                        key={ev.id}
                        style={{
                          backgroundColor: st.bg,
                          color: st.color,
                          border: `1px solid ${st.border}`,
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          lineHeight: 1.2,
                          gap: '4px'
                        }}
                      >
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                          {ev.full_name}
                        </span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.95, fontWeight: 800, flexShrink: 0, marginLeft: 'auto' }}>
                          {ev.status_label || st.label}
                        </span>
                      </div>
                    );
                  })}
                  {filteredEvs.length > 4 && (
                    <div style={{ fontSize: '0.65rem', color: '#7B5233', fontWeight: 800, textAlign: 'center', paddingTop: '2px' }}>
                      + Xem thêm {filteredEvs.length - 4} bản ghi...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MODAL POPUP CHI TIẾT NGÀY ĐƯỢC CHỌN (2 TAB & EDIT NHANH) ── */}
      {selectedDay && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '14px', maxWidth: '640px', width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            {/* Header Modal */}
            <div style={{ padding: '16px 20px', backgroundColor: '#3D2B1F', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  Chi tiết chấm công ngày {new Date(selectedDay).toLocaleDateString('vi-VN')}
                </h3>
                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Tổng số {dayEvents.length} bản ghi phát sinh</span>
              </div>
              <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* TAB CONTROLS: TĂNG CA (X) | NGHỈ / VẮNG (Y) */}
            <div style={{ display: 'flex', borderBottom: '1px solid #EADCC9', backgroundColor: '#FAF6F0', padding: '0 16px' }}>
              <button
                type="button"
                onClick={() => setDayTab('OT')}
                style={{
                  padding: '10px 16px', border: 'none', background: 'transparent',
                  borderBottom: dayTab === 'OT' ? '3px solid #7B5233' : '3px solid transparent',
                  fontWeight: 800, fontSize: '0.85rem', color: dayTab === 'OT' ? '#3D2B1F' : '#6B7280',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <span>Tăng ca</span>
                <span style={{
                  fontSize: '0.72rem', backgroundColor: dayTab === 'OT' ? '#7B5233' : '#E5E7EB',
                  color: dayTab === 'OT' ? '#FFF' : '#374151', padding: '1px 8px', borderRadius: '10px', fontWeight: 700
                }}>
                  {otEvents.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDayTab('LEAVE')}
                style={{
                  padding: '10px 16px', border: 'none', background: 'transparent',
                  borderBottom: dayTab === 'LEAVE' ? '3px solid #7B5233' : '3px solid transparent',
                  fontWeight: 800, fontSize: '0.85rem', color: dayTab === 'LEAVE' ? '#3D2B1F' : '#6B7280',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <span>Nghỉ / Vắng</span>
                <span style={{
                  fontSize: '0.72rem', backgroundColor: dayTab === 'LEAVE' ? '#7B5233' : '#E5E7EB',
                  color: dayTab === 'LEAVE' ? '#FFF' : '#374151', padding: '1px 8px', borderRadius: '10px', fontWeight: 700
                }}>
                  {leaveEvents.length}
                </span>
              </button>
            </div>

            {/* Content List - CỐ ĐỊNH CHIỀU CAO */}
            <div style={{ padding: '16px 20px', height: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {((dayTab === 'OT' ? otEvents : leaveEvents)).length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6B7280', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={32} style={{ color: '#9CA3AF', marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem' }}>
                    {dayTab === 'OT' ? 'Không có ai báo tăng ca trong ngày này.' : 'Không có ai vắng / báo nghỉ phép trong ngày này.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(dayTab === 'OT' ? otEvents : leaveEvents).map(ev => {
                    const st = STATUS_BADGE_STYLE[ev.status] || STATUS_BADGE_STYLE.LEAVE_PAID;
                    return (
                      <div key={ev.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        backgroundColor: '#FAF8F5', border: '1px solid #EADCC9', padding: '10px 14px', borderRadius: '10px',
                        gap: '10px'
                      }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#2D1A12' }}>{ev.full_name} ({ev.employee_id})</div>
                          <div style={{ fontSize: '0.73rem', color: '#6B7280', marginTop: '2px' }}>
                            Phòng ban: {ev.department} • Nhà máy: {ev.factory}
                          </div>
                          {ev.note && <div style={{ fontSize: '0.72rem', color: '#7B5233', fontStyle: 'italic', marginTop: '3px' }}>Ghi chú: {ev.note}</div>}
                        </div>

                        {/* EDIT NHANH TRỰC TIẾP */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          {dayTab === 'OT' ? (
                            /* SỬA NHANH CA TĂNG CA: 20H HOẶC 22H */
                            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#EFEAE3', padding: '2px', borderRadius: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleQuickUpdateRecord(ev.id, 'OT_20H')}
                                style={{
                                  padding: '4px 10px', borderRadius: '6px', border: 'none',
                                  backgroundColor: ev.status === 'OT_20H' ? '#6366F1' : 'transparent',
                                  color: ev.status === 'OT_20H' ? '#FFFFFF' : '#6B7280',
                                  fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s'
                                }}
                              >
                                20h
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickUpdateRecord(ev.id, 'OT_22H')}
                                style={{
                                  padding: '4px 10px', borderRadius: '6px', border: 'none',
                                  backgroundColor: ev.status === 'OT_22H' ? '#9333EA' : 'transparent',
                                  color: ev.status === 'OT_22H' ? '#FFFFFF' : '#6B7280',
                                  fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s'
                                }}
                              >
                                22h
                              </button>
                            </div>
                          ) : (
                            /* SỬA NHANH TRẠNG THÁI NGHỈ / VẮNG */
                            <select
                              value={ev.status}
                              onChange={(e) => handleQuickUpdateRecord(ev.id, e.target.value)}
                              style={{
                                padding: '4px 8px', borderRadius: '6px', border: '1px solid #EADCC9',
                                backgroundColor: st.bg, color: st.color, fontWeight: 800, fontSize: '0.78rem',
                                outline: 'none', cursor: 'pointer'
                              }}
                            >
                              <option value="LEAVE_PAID">Vắng CP (Nghỉ phép)</option>
                              <option value="LEAVE_UNPAID">Vắng KP (Không lương)</option>
                              <option value="EARLY_LEAVE_1630">Về 16h30</option>
                              <option value="HALF_DAY">Nghỉ 0.5d</option>
                              <option value="SUNDAY_OFF">Vắng CN</option>
                            </select>
                          )}

                          <button
                            onClick={() => handleDeleteRecord(ev.id)}
                            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                            title="Xóa bản ghi"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div style={{ padding: '12px 20px', backgroundColor: '#FAF6F0', borderTop: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => { const target = selectedDay; setSelectedDay(null); onOpenLeaveModal(target); }}
                  style={{ padding: '6px 12px', backgroundColor: '#3D2B1F', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  + Báo nghỉ phép
                </button>
                <button
                  onClick={() => { const target = selectedDay; setSelectedDay(null); onOpenOtModal(target); }}
                  style={{ padding: '6px 12px', backgroundColor: '#A27B5C', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  + Báo tăng ca
                </button>
              </div>

              <button
                onClick={() => setSelectedDay(null)}
                style={{ padding: '6px 16px', backgroundColor: '#E5E7EB', color: '#374151', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Custom Project Popup Dialog */}
      <QualityAttendancePopup
        isOpen={popupState.isOpen}
        type={popupState.type}
        title={popupState.title}
        message={popupState.message}
        confirmText={popupState.confirmText}
        cancelText={popupState.cancelText}
        onConfirm={popupState.onConfirm}
        onClose={() => setPopupState({ isOpen: false })}
      />

      {/* Export Attendance Modal */}
      <ExportAttendanceModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        defaultMonth={monthStr}
        defaultFactory={selectedFactory}
      />
    </div>
  );
};

export default QualityEmployeeCalendarView;
