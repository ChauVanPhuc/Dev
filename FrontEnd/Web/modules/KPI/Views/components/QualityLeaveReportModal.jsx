import React, { useState, useEffect } from 'react';
import { X, Calendar, User, FileText, CheckCircle, AlertCircle, Search } from 'lucide-react';
import apiClient from '@shared/services/api';
import QualityAttendancePopup from './QualityAttendancePopup';

const QualityLeaveReportModal = ({ isOpen, onClose, onSuccess, initialDate }) => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [status, setStatus] = useState('LEAVE_PAID');
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
        const leaveEmpIds = [];
        let existingNote = '';
        let detectedStatus = null;
        const LEAVE_STATUSES = ['LEAVE_PAID', 'LEAVE_UNPAID', 'EARLY_LEAVE_1630', 'HALF_DAY', 'SUNDAY_OFF'];
        
        res.data.forEach(item => {
          if (LEAVE_STATUSES.includes(item.status)) {
            leaveEmpIds.push(item.employee_id);
            if (!detectedStatus) detectedStatus = item.status;
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
        setSelectedEmpIds(leaveEmpIds);
        if (detectedStatus) {
          setStatus(detectedStatus);
        }
        if (existingNote) {
          setNote(existingNote);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu báo nghỉ đã có của ngày:', err);
    }
  };

  const handleDateChange = (newDate) => {
    setWorkDate(newDate);
    if (newDate) {
      loadExistingDayData(newDate);
    }
  };

  // Lọc danh sách nhân sự theo từ khóa tìm kiếm
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

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredEmployees.map(e => e.employee_id);
    const allFilteredSelected = filteredIds.every(id => selectedEmpIds.includes(id));

    if (allFilteredSelected) {
      setSelectedEmpIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedEmpIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleToggleEmp = (empId) => {
    setSelectedEmpIds(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedEmpIds.length === 0) {
      setError('Vui lòng chọn ít nhất 1 nhân sự.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        employee_ids: selectedEmpIds,
        start_date: workDate,
        end_date: workDate,
        status,
        skip_weekends: false,
        note
      };

      console.log('[Leave Modal] 📤 Gửi request Báo nghỉ phép:', payload);
      const res = await apiClient.post('/quality-employees/attendance/batch-log', payload);
      console.log('[Leave Modal] 📥 Kết quả Server trả về:', res.data);
      const count = res.data?.count || 0;

      setPopupState({
        isOpen: true,
        type: 'success',
        title: 'Thành công',
        message: `Đã lưu thành công ${count} lượt báo nghỉ phép cho nhân sự!`,
        confirmText: 'Xác nhận',
        onConfirm: () => {
          console.log('[Leave Modal] 🎯 Bấm Xác nhận popup -> Gọi onSuccess()');
          onSuccess?.();
          onClose();
        }
      });
    } catch (err) {
      console.error('[Leave Modal] ❌ Lỗi khi gửi request Báo nghỉ phép:', err);
      setError(err.response?.data?.detail || 'Lỗi khi tạo báo nghỉ phép.');
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
        backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '640px', width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header Modal - THU GỌN */}
        <div style={{ padding: '12px 20px', backgroundColor: '#3D2B1F', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.0rem', fontWeight: 800 }}>Đăng Ký Báo Nghỉ Phép Nhân Sự</h3>
            <span style={{ fontSize: '0.72rem', color: '#EADCC9' }}>Ghi nhận thông tin vắng mặt, về sớm, nghỉ phép</span>
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

          {/* CHỌN LOẠI HÌNH NGHỈ VÀ NGÀY NGHỈ (PHẦN 1 - THU GỌN) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#2D1A12', marginBottom: '3px' }}>
                Loại hình nghỉ / Vắng mặt <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', fontWeight: 700, fontSize: '0.8rem', color: '#3D2B1F', outline: 'none' }}
              >
                <option value="LEAVE_PAID">Vắng CP - Vắng có phép (Phép)</option>
                <option value="LEAVE_UNPAID">Vắng KP - Vắng không phép</option>
                <option value="EARLY_LEAVE_1630">Về 16h30 - Về sớm 16h30</option>
                <option value="HALF_DAY">Nghỉ 0.5 ngày - Nghỉ nửa ca</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#2D1A12', marginBottom: '3px' }}>
                Ngày nghỉ <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="date"
                value={workDate}
                onChange={(e) => handleDateChange(e.target.value)}
                style={{ width: '100%', height: '34px', padding: '0 10px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', fontWeight: 600, fontSize: '0.82rem', color: '#2D1A12', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* DANH SÁCH NHÂN SỰ & TÌM KIẾM (PHẦN 2 - MỞ RỘNG CAO RA DỄ THAO TÁC) */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#2D1A12' }}>
                Chọn nhân sự áp dụng ({selectedEmpIds.length} / {employees.length}) <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                style={{ background: 'none', border: 'none', color: '#7B5233', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
              >
                {filteredEmployees.every(e => selectedEmpIds.includes(e.employee_id)) && filteredEmployees.length > 0 ? 'Bỏ chọn hiển thị' : 'Chọn tất cả hiển thị'}
              </button>
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

            {/* Danh sách nhân sự với chiều cao cố định lớn (PHẦN 2) */}
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
                  const isChecked = selectedEmpIds.includes(emp.employee_id);
                  return (
                    <div
                      key={emp.employee_id}
                      onClick={() => handleToggleEmp(emp.employee_id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 10px', borderRadius: '8px', cursor: 'pointer',
                        backgroundColor: isChecked ? '#FFFFFF' : 'transparent',
                        border: isChecked ? '1px solid #EADCC9' : '1px solid transparent',
                        boxShadow: isChecked ? '0 1px 2px rgba(0,0,0,0.03)' : 'none',
                        marginBottom: '4px', transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* GHI CHÚ VÀ NÚT BẤM (PHẦN 3 - THU GỌN HỢP LÝ) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#2D1A12', marginBottom: '3px' }}>Lý do / Ghi chú</label>
            <textarea
              rows={1}
              placeholder="Nhập lý do vắng mặt, ghi chú bổ sung..."
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
              {loading ? 'Đang lưu...' : 'Xác nhận Báo nghỉ phép'}
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

export default QualityLeaveReportModal;
