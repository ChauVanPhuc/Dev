import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, User, CheckCircle, AlertCircle, Zap, Search } from 'lucide-react';
import apiClient from '@shared/services/api';
import QualityAttendancePopup from './QualityAttendancePopup';

const QualityOvertimeReportModal = ({ isOpen, onClose, onSuccess, initialDate }) => {
  const [employees, setEmployees] = useState([]);
  // empShifts structure: { [employee_id]: 'OT_20H' | 'OT_22H' }
  const [empShifts, setEmpShifts] = useState({});
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [popupState, setPopupState] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  useEffect(() => {
    if (isOpen) {
      loadEmployees();
      const targetDate = initialDate || new Date().toISOString().split('T')[0];
      setWorkDate(targetDate);
      loadExistingDayData(targetDate);
    }
  }, [isOpen, initialDate]);

  const loadEmployees = async () => {
    try {
      const res = await apiClient.get('/quality-employees/', { params: { size: 1000 } });
      if (res.data && res.data.items) {
        setEmployees(res.data.items);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách nhân sự:', err);
    }
  };

  const loadExistingDayData = async (targetDate) => {
    try {
      setNote(''); // Reset ghi chú về trống mặc định
      const res = await apiClient.get('/quality-employees/attendance/day-details', {
        params: { work_date: targetDate }
      });
      if (res.data && Array.isArray(res.data)) {
        const shiftsMap = {};
        let existingNote = '';
        res.data.forEach(item => {
          if (item.status === 'OT_20H' || item.status === 'OT_22H') {
            shiftsMap[item.employee_id] = item.status;
          }
          const isSystemNote = item.note && (
            item.note.includes('Excel') || 
            item.note.includes('Imported') || 
            item.note.includes('Đồng bộ')
          );
          if (item.note && !existingNote && !isSystemNote) {
            existingNote = item.note;
          }
        });
        setEmpShifts(shiftsMap);
        if (existingNote) {
          setNote(existingNote);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu chấm công đã có của ngày:', err);
    }
  };

  const handleDateChange = (newDate) => {
    setWorkDate(newDate);
    if (newDate) {
      loadExistingDayData(newDate);
    }
  };

  // Filtered employee list based on search term
  const filteredEmployees = employees.filter(emp => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (emp.full_name && emp.full_name.toLowerCase().includes(term)) ||
      (emp.employee_id && emp.employee_id.toLowerCase().includes(term)) ||
      (emp.stage && emp.stage.toLowerCase().includes(term)) ||
      (emp.department && emp.department.toLowerCase().includes(term))
    );
  });

  // Toggle selection for individual employee
  const handleToggleEmp = (empId, defaultShift = 'OT_22H') => {
    setEmpShifts(prev => {
      const next = { ...prev };
      if (next[empId]) {
        delete next[empId];
      } else {
        next[empId] = defaultShift;
      }
      return next;
    });
  };

  // Change specific shift for employee
  const handleSetShift = (empId, shift) => {
    setEmpShifts(prev => ({
      ...prev,
      [empId]: shift
    }));
  };

  // Quick Action Buttons (applies to filtered list if searching)
  const handleSelectAllWithShift = (shift) => {
    const listToApply = filteredEmployees.length > 0 ? filteredEmployees : employees;
    setEmpShifts(prev => {
      const next = { ...prev };
      listToApply.forEach(e => {
        next[e.employee_id] = shift;
      });
      return next;
    });
  };

  const handleDeselectAll = () => {
    setEmpShifts({});
  };

  const selectedEmpIds = Object.keys(empShifts);
  const count20h = Object.values(empShifts).filter(s => s === 'OT_20H').length;
  const count22h = Object.values(empShifts).filter(s => s === 'OT_22H').length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedEmpIds.length === 0) {
      setError('Vui lòng chọn ít nhất 1 nhân sự tăng ca.');
      return;
    }
    if (!workDate) {
      setError('Vui lòng chọn ngày tăng ca.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        employee_ids: selectedEmpIds,
        employee_shifts: empShifts,
        start_date: workDate,
        end_date: workDate,
        status: 'OT_22H', // Fallback status
        skip_weekends: false,
        note
      };

      console.log('[OT Modal] 📤 Gửi request Báo tăng ca thông minh:', payload);
      const res = await apiClient.post('/quality-employees/attendance/batch-log', payload);
      console.log('[OT Modal] 📥 Kế quả Server trả về:', res.data);

      const count = res.data?.count || 0;

      if (count === 0) {
        setPopupState({
          isOpen: true,
          type: 'warning',
          title: 'Cảnh báo',
          message: 'Không thể ghi nhận bản ghi tăng ca. Vui lòng kiểm tra lại thông tin ngày đăng ký!',
          confirmText: 'Đã hiểu'
        });
      } else {
        const detailMsg = `Đã lưu thành công ${count} lượt báo tăng ca ngày ${workDate} cho ${selectedEmpIds.length} nhân sự! (${count20h} người ca 20h, ${count22h} người ca 22h)`;
        setPopupState({
          isOpen: true,
          type: 'success',
          title: 'Thành công',
          message: detailMsg,
          confirmText: 'Xác nhận',
          onConfirm: () => {
            console.log('[OT Modal] 🎯 Bấm Xác nhận popup -> Gọi onSuccess()');
            onSuccess?.();
            onClose();
          }
        });
      }
    } catch (err) {
      console.error('[OT Modal] ❌ Lỗi khi gửi request Báo tăng ca:', err);
      setError(err.response?.data?.detail || 'Lỗi khi đăng ký tăng ca.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '680px', width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header Modal */}
        <div style={{ padding: '12px 20px', backgroundColor: '#3D2B1F', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.0rem', fontWeight: 800 }}>Đăng Ký Báo Tăng Ca Nhân Sự</h3>
            <span style={{ fontSize: '0.72rem', color: '#EADCC9' }}>Tùy chọn thời gian tăng ca (20h hoặc 22h) linh hoạt cho từng nhân sự</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} style={{ padding: '14px 20px', overflowY: 'auto', maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {error && (
            <div style={{ padding: '8px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* CHỌN 1 NGÀY TĂNG CA (PHẦN 1 - THU GỌN) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#2D1A12', marginBottom: '3px' }}>
              Ngày tăng ca <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="date"
              value={workDate}
              onChange={(e) => handleDateChange(e.target.value)}
              style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', fontWeight: 600, fontSize: '0.82rem', color: '#2D1A12', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* DANH SÁCH NHÂN SỰ & NÚT CHỌN NHANH (PHẦN 2 - MỞ RỘNG CAO RA DỄ THAO TÁC) */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#2D1A12' }}>
                  Chọn nhân sự ({selectedEmpIds.length} / {employees.length}) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                {selectedEmpIds.length > 0 && (
                  <span style={{ fontSize: '0.7rem', backgroundColor: '#FAF6F0', color: '#7B5233', padding: '1px 7px', borderRadius: '10px', fontWeight: 700, border: '1px solid #EADCC9' }}>
                    {count20h > 0 && `${count20h} ca 20h`}
                    {count20h > 0 && count22h > 0 && ' • '}
                    {count22h > 0 && `${count22h} ca 22h`}
                  </span>
                )}
              </div>

              {/* Nhóm nút chọn nhanh */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleSelectAllWithShift('OT_20H')}
                  title="Chọn tất cả nhân sự hiển thị với ca 20h (2h OT)"
                  style={{
                    padding: '3px 8px', borderRadius: '6px', border: '1px solid #C7D2FE',
                    backgroundColor: '#EEF2FF', color: '#3730A3', fontSize: '0.72rem', fontWeight: 700,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px'
                  }}
                >
                  <Zap size={11} />
                  <span>Tất cả 20h</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectAllWithShift('OT_22H')}
                  title="Chọn tất cả nhân sự hiển thị với ca 22h (4h OT)"
                  style={{
                    padding: '3px 8px', borderRadius: '6px', border: '1px solid #E9D5FF',
                    backgroundColor: '#F3E8FF', color: '#6B21A8', fontSize: '0.72rem', fontWeight: 700,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px'
                  }}
                >
                  <Zap size={11} />
                  <span>Tất cả 22h</span>
                </button>

                {selectedEmpIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    style={{
                      padding: '3px 8px', borderRadius: '6px', border: '1px solid #E5E7EB',
                      backgroundColor: '#F9FAFB', color: '#6B7280', fontSize: '0.72rem', fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
            </div>

            {/* Ô TÌM KIẾM NHÂN SỰ */}
            <div style={{
              position: 'relative', display: 'flex', alignItems: 'center',
              marginBottom: '6px', backgroundColor: '#FAF6F0', border: '1px solid #EADCC9',
              borderRadius: '8px', padding: '0 8px', height: '32px'
            }}>
              <Search size={13} style={{ color: '#7B5233', marginRight: '6px', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, mã NV, công đoạn/phòng ban..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.78rem', color: '#2D1A12', fontWeight: 500 }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* List nhân sự với nút chọn 20h / 22h - MỞ RỘNG CHIỀU CAO (PHẦN 2) */}
            <div style={{
              border: '1px solid #EADCC9', borderRadius: '10px', height: '360px', maxHeight: '400px', overflowY: 'auto',
              backgroundColor: '#FAF8F5', padding: '6px'
            }}>
              {filteredEmployees.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280', fontSize: '0.8rem' }}>
                  Không tìm thấy nhân sự phù hợp với từ khóa "<b>{searchTerm}</b>"
                </div>
              ) : (
                filteredEmployees.map(emp => {
                  const currentShift = empShifts[emp.employee_id];
                  const isChecked = Boolean(currentShift);

                  return (
                    <div
                      key={emp.employee_id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 10px', borderRadius: '8px',
                        backgroundColor: isChecked ? '#FFFFFF' : 'transparent',
                        border: isChecked ? '1px solid #EADCC9' : '1px solid transparent',
                        boxShadow: isChecked ? '0 1px 2px rgba(0,0,0,0.03)' : 'none',
                        marginBottom: '4px', transition: 'all 0.15s'
                      }}
                    >
                      {/* Thông tin Nhân Viên */}
                      <div
                        onClick={() => handleToggleEmp(emp.employee_id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, minWidth: 0 }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ width: '15px', height: '15px', accentColor: '#7B5233', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#2D1A12' }}>{emp.full_name}</span>
                            <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>({emp.employee_id})</span>
                          </div>
                          <span style={{ fontSize: '0.68rem', color: '#7B5233', fontWeight: 600 }}>{emp.stage || emp.department || 'QLCL'}</span>
                        </div>
                      </div>

                      {/* Nút Chọn Nhanh Ca 20h / 22h cho Nhân Viên này */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleSetShift(emp.employee_id, 'OT_20H')}
                          style={{
                            padding: '3px 8px', borderRadius: '6px',
                            border: currentShift === 'OT_20H' ? '1.5px solid #6366F1' : '1px solid #E5E7EB',
                            backgroundColor: currentShift === 'OT_20H' ? '#EEF2FF' : '#F9FAFB',
                            color: currentShift === 'OT_20H' ? '#3730A3' : '#6B7280',
                            fontSize: '0.72rem', fontWeight: currentShift === 'OT_20H' ? 800 : 600,
                            cursor: 'pointer', transition: 'all 0.15s'
                          }}
                        >
                          20h <span style={{ fontSize: '0.62rem', opacity: 0.8 }}>(2h)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetShift(emp.employee_id, 'OT_22H')}
                          style={{
                            padding: '3px 8px', borderRadius: '6px',
                            border: currentShift === 'OT_22H' ? '1.5px solid #A855F7' : '1px solid #E5E7EB',
                            backgroundColor: currentShift === 'OT_22H' ? '#F3E8FF' : '#F9FAFB',
                            color: currentShift === 'OT_22H' ? '#6B21A8' : '#6B7280',
                            fontSize: '0.72rem', fontWeight: currentShift === 'OT_22H' ? 800 : 600,
                            cursor: 'pointer', transition: 'all 0.15s'
                          }}
                        >
                          22h <span style={{ fontSize: '0.62rem', opacity: 0.8 }}>(4h)</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* GHI CHÚ VÀ NÚT BẤM (PHẦN 3 - THU GỌN HỢP LÝ) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#2D1A12', marginBottom: '3px' }}>Ghi chú công việc tăng ca</label>
            <textarea
              rows={1}
              placeholder="Nhập nội dung/đơn hàng/công đoạn cần tăng ca..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ width: '100%', height: '38px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #EADCC9', outline: 'none', fontSize: '0.8rem', color: '#2D1A12', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '2px', paddingTop: '8px', borderTop: '1px solid #F3F4F6' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FFFFFF', color: '#374151', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '7px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#3D2B1F', color: '#FFFFFF', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Đang lưu...' : 'Xác nhận Báo tăng ca'}
            </button>
          </div>
        </form>
      </div>

      <QualityAttendancePopup
        isOpen={popupState.isOpen}
        type={popupState.type}
        title={popupState.title}
        message={popupState.message}
        onConfirm={popupState.onConfirm}
        onClose={() => setPopupState({ isOpen: false })}
      />
    </div>
  );
};

export default QualityOvertimeReportModal;
