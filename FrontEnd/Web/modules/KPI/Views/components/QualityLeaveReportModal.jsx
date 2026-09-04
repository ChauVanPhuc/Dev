import React, { useState, useEffect } from 'react';
import { X, Calendar, User, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import apiClient from '@shared/services/api';
import QualityAttendancePopup from './QualityAttendancePopup';

const QualityLeaveReportModal = ({ isOpen, onClose, onSuccess, initialDate }) => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [status, setStatus] = useState('LEAVE_PAID');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [popupState, setPopupState] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  useEffect(() => {
    if (isOpen) {
      loadEmployees();
      if (initialDate) {
        setStartDate(initialDate);
        setEndDate(initialDate);
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        setStartDate(todayStr);
        setEndDate(todayStr);
      }
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

  const handleSelectAll = () => {
    if (selectedEmpIds.length === employees.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(employees.map(e => e.employee_id));
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
    if (startDate > endDate) {
      setError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        employee_ids: selectedEmpIds,
        start_date: startDate,
        end_date: endDate,
        status,
        skip_weekends: skipWeekends,
        note
      };

      console.log('[Leave Modal] 📤 Gửi request Báo nghỉ phép:', payload);
      const res = await apiClient.post('/quality-employees/attendance/batch-log', payload);
      console.log('[Leave Modal] 📥 Kết quả Server trả về:', res.data);
      const count = res.data?.count || 0;

      if (count === 0) {
        setPopupState({
          isOpen: true,
          type: 'warning',
          title: 'Cảnh báo',
          message: 'Không có bản ghi báo phép nào được ghi nhận do khoảng ngày được chọn trùng vào Cuối tuần (và đang bật tùy chọn Bỏ qua T7/CN). Vui lòng kiểm tra lại ngày đăng ký!',
          confirmText: 'Đã hiểu'
        });
      } else {
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
      }
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
        {/* Header Modal */}
        <div style={{ padding: '18px 24px', backgroundColor: '#3D2B1F', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Đăng Ký Báo Nghỉ Phép Nhân Sự</h3>
            <span style={{ fontSize: '0.75rem', color: '#EADCC9' }}>Ghi nhận thông tin vắng mặt, về sớm, nghỉ phép</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', maxHeight: '78vh', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ padding: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Chọn loại hình nghỉ */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#2D1A12', marginBottom: '6px' }}>
              Loại hình nghỉ / Vắng mặt <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', fontWeight: 700, color: '#3D2B1F', outline: 'none' }}
            >
              <option value="LEAVE_PAID">Vắng CP - Vắng có phép (Tính phép)</option>
              <option value="LEAVE_UNPAID">Vắng KP - Vắng không phép</option>
              <option value="EARLY_LEAVE_1630">Về 16h30 - Về sớm 16h30</option>
              <option value="HALF_DAY">Nghỉ 0.5 ngày - Nghỉ nửa ca</option>
            </select>
          </div>

          {/* Chọn Khoảng Ngày */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#2D1A12', marginBottom: '6px' }}>
                Từ ngày <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', fontWeight: 600, color: '#2D1A12', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#2D1A12', marginBottom: '6px' }}>
                Đến ngày <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', fontWeight: 600, color: '#2D1A12', outline: 'none' }}
              />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: '#4B5563', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={skipWeekends}
              onChange={(e) => setSkipWeekends(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#7B5233' }}
            />
            <span>Bỏ qua ngày T7 & Chủ nhật (nếu là chuỗi ngày làm việc)</span>
          </label>

          {/* Chọn Danh Sách Nhân Sự */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2D1A12' }}>
                Chọn nhân sự áp dụng ({selectedEmpIds.length} / {employees.length}) <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{ background: 'none', border: 'none', color: '#7B5233', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
              >
                {selectedEmpIds.length === employees.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả nhân sự'}
              </button>
            </div>

            <div style={{
              border: '1px solid #EADCC9', borderRadius: '8px', maxHeight: '180px', overflowY: 'auto',
              backgroundColor: '#FAF8F5', padding: '8px'
            }}>
              {employees.map(emp => {
                const isChecked = selectedEmpIds.includes(emp.employee_id);
                return (
                  <div
                    key={emp.employee_id}
                    onClick={() => handleToggleEmp(emp.employee_id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 10px', borderRadius: '6px', cursor: 'pointer',
                      backgroundColor: isChecked ? '#FAF6F0' : 'transparent',
                      border: isChecked ? '1px solid #EADCC9' : '1px solid transparent',
                      marginBottom: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ accentColor: '#7B5233' }}
                      />
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2D1A12' }}>{emp.full_name}</span>
                      <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>({emp.employee_id})</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#7B5233', fontWeight: 600 }}>{emp.stage || emp.department}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lý do / Ghi chú */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#2D1A12', marginBottom: '6px' }}>Lý do / Ghi chú</label>
            <textarea
              rows={3}
              placeholder="Nhập lý do vắng mặt, ghi chú bổ sung..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #EADCC9', outline: 'none', fontSize: '0.85rem', color: '#2D1A12', boxSizing: 'border-box' }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid #F3F4F6' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FFFFFF', color: '#374151', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', backgroundColor: '#3D2B1F', color: '#FFFFFF', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
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
