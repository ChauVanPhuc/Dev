import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import apiClient from '@shared/services/api';

const QualityEmployeeModal = ({ isOpen, onClose, onSuccess, employeeData = null }) => {
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    department: 'Phòng QLCL',
    stage: 'QLCL',
    factory: 'Nhà máy 1',
    phone: '',
    email: '',
    status: 'Đang làm việc',
    latest_rating: 'A',
    note: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (employeeData) {
      setFormData({
        employee_id: employeeData.employee_id || '',
        full_name: employeeData.full_name || '',
        department: employeeData.department || 'Phòng QLCL',
        stage: employeeData.stage || 'QLCL',
        factory: employeeData.factory || 'Nhà máy 1',
        phone: employeeData.phone || '',
        email: employeeData.email || '',
        status: employeeData.status || 'Đang làm việc',
        latest_rating: employeeData.latest_rating || 'A',
        note: employeeData.note || ''
      });
    } else {
      setFormData({
        employee_id: '',
        full_name: '',
        department: 'Phòng QLCL',
        stage: 'QLCL',
        factory: 'Nhà máy 1',
        phone: '',
        email: '',
        status: 'Đang làm việc',
        latest_rating: 'A',
        note: ''
      });
    }
    setError('');
  }, [employeeData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.full_name) {
      setError('Vui lòng nhập Mã nhân sự và Họ tên!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (employeeData && employeeData.id) {
        await apiClient.put(`/quality-employees/${employeeData.id}`, formData);
      } else {
        await apiClient.post('/quality-employees/', formData);
      }
      setLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setLoading(false);
      setError(err.response?.data?.detail || 'Có lỗi xảy ra khi lưu nhân sự QLCL!');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '16px', width: '90%', maxWidth: '580px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', backgroundColor: '#32251e', color: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>
            {employeeData ? 'Chỉnh Sửa Nhân Sự QLCL' : 'Thêm Mới Nhân Sự QLCL'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                Mã Nhân Sự *
              </label>
              <input
                type="text"
                value={formData.employee_id}
                onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                disabled={!!employeeData}
                placeholder="VD: NV_QLCL_026"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: employeeData ? '#f1f5f9' : '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                Họ và Tên *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nhập họ và tên..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                Nhà Máy
              </label>
              <select
                value={formData.factory}
                onChange={e => setFormData({ ...formData, factory: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              >
                <option value="Nhà máy 1">Nhà máy 1</option>
                <option value="Nhà máy 2">Nhà máy 2</option>
                <option value="Nhà máy 3">Nhà máy 3</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                Công Đoạn
              </label>
              <input
                type="text"
                value={formData.stage}
                onChange={e => setFormData({ ...formData, stage: e.target.value })}
                placeholder="VD: Gia công CNC..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                Bộ Phận
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                placeholder="VD: Phòng QLCL..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                Xếp Loại KPI
              </label>
              <select
                value={formData.latest_rating}
                onChange={e => setFormData({ ...formData, latest_rating: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              >
                <option value="A">Loại A (Xuất sắc)</option>
                <option value="B">Loại B (Khá)</option>
                <option value="C">Loại C (Trung bình)</option>
                <option value="D">Loại D (Cần cải thiện)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                Trạng Thái
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              >
                <option value="Đang làm việc">Đang làm việc</option>
                <option value="Thử việc">Thử việc</option>
                <option value="Tạm nghỉ">Tạm nghỉ</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
              Ghi Chú
            </label>
            <textarea
              rows="2"
              value={formData.note}
              onChange={e => setFormData({ ...formData, note: e.target.value })}
              placeholder="Nhập ghi chú thêm..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'none' }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: '700', cursor: 'pointer' }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', backgroundColor: '#32251e', color: '#fff', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Check size={18} /> {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QualityEmployeeModal;
