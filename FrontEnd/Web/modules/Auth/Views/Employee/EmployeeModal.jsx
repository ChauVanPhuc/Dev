import React, { useState, useEffect, useRef } from 'react';
import { X, User } from 'lucide-react';
import { hrService } from '../../Models/hr.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const EmployeeModal = ({ isOpen, onClose, employee, onSave }) => {
  const modalMeta = useScreenMetadataCached('/admin/hr/employees/modal');
  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [avatarPath, setAvatarPath] = useState('');
  
  const avatarInputRef = useRef(null);
  
  // Lists for dropdown selectors
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [sections, setSections] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const isEdit = !!employee;

  // Load select dropdown choices
  const loadDropdownChoices = async () => {
    try {
      const [depts, poss, secs] = await Promise.all([
        hrService.getDepartments(),
        hrService.getPositions(),
        hrService.getSections()
      ]);
      setDepartments(depts || []);
      setPositions(poss || []);
      setSections(secs || []);
    } catch (err) {
      console.error('Error loading dropdown choices:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDropdownChoices();
      setErrorMsg('');
      if (employee) {
        setEmployeeId(employee.employee_id || '');
        setFullName(employee.full_name || '');
        setPhone(employee.phone || '');
        setHireDate(employee.hire_date || '');
        setDepartmentId(employee.department_id || '');
        setPositionId(employee.position_id || '');
        setSectionId(employee.section_id || '');
        setAvatarPath(employee.avatar_path || '');
      } else {
        setEmployeeId('');
        setFullName('');
        setPhone('');
        setHireDate(new Date().toISOString().substring(0, 10)); // Default to today
        setDepartmentId('');
        setPositionId('');
        setSectionId('');
        setAvatarPath('');
      }
    }
  }, [isOpen, employee]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await hrService.uploadAvatar(file);
      setAvatarPath(res.url);
    } catch (err) {
      alert('Lỗi khi tải lên ảnh đại diện.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId || !fullName) {
      setErrorMsg('Vui lòng điền Mã nhân viên và Họ tên.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const payload = {
        employee_id: employeeId,
        full_name: fullName,
        phone: phone || null,
        hire_date: hireDate || null,
        department_id: departmentId ? parseInt(departmentId) : null,
        position_id: positionId ? parseInt(positionId) : null,
        section_id: sectionId ? parseInt(sectionId) : null,
        avatar_path: avatarPath || null
      };

      if (isEdit) {
        await hrService.updateEmployee(employee.id, payload);
      } else {
        await hrService.createEmployee(payload);
      }
      onSave();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Lỗi khi lưu thông tin nhân sự.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        width: '640px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2D1A12', margin: 0 }}>
            {modalMeta.screenCode ? `${modalMeta.screenCode}: ` : ''}
            {modalMeta.title || (isEdit ? 'Chỉnh sửa thông tin nhân sự' : 'Thông tin nhân sự')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            padding: '10px 12px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Main profile section (horizontal split) */}
          <div style={{ display: 'flex', gap: '20px' }}>
            {/* Left side: user avatar with upload logic */}
            <div 
              onClick={() => avatarInputRef.current.click()}
              style={{
                width: '180px',
                height: '180px',
                backgroundColor: '#EBE6E1',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8D6E63',
                border: 'none',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {avatarPath ? (
                <img 
                  src={avatarPath.startsWith('/static') ? `http://localhost:1222${avatarPath}` : avatarPath} 
                  alt="Avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  onError={(e) => {
                    e.target.src = `http://localhost:8080${avatarPath}`;
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.6 }}>Tải ảnh đại diện</span>
                </div>
              )}
            </div>

            <input
              type="file"
              ref={avatarInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              style={{ display: 'none' }}
            />

            {/* Right side: standard text inputs */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#2D1A12', marginBottom: '4px' }}>Mã nhân viên</label>
                <input
                  type="text"
                  placeholder="Mã nhân viên"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  disabled={isEdit}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    backgroundColor: '#EBE6E1',
                    color: '#4A3E3D',
                    cursor: isEdit ? 'not-allowed' : 'text',
                    boxSizing: 'border-box',
                    fontWeight: 600
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#2D1A12', marginBottom: '4px' }}>Họ tên</label>
                <input
                  type="text"
                  placeholder="Họ tên"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#2D1A12', marginBottom: '4px' }}>Số điện thoại</label>
                <input
                  type="tel"
                  placeholder="Số điện thoại"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#2D1A12', marginBottom: '4px' }}>Ngày vào làm</label>
                <input
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Dropdowns: Department, Position, Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#2D1A12', marginBottom: '4px' }}>Phòng ban</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1.5px solid #EADCC9',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Chọn phòng ban</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#2D1A12', marginBottom: '4px' }}>Vị trí</label>
              <select
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1.5px solid #EADCC9',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Chọn vị trí</option>
                {positions.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#2D1A12', marginBottom: '4px' }}>Bộ phận</label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1.5px solid #EADCC9',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Chọn bộ phận</option>
                {sections.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 24px',
                border: '1.5px solid #C4B5A5',
                borderRadius: '8px',
                background: '#fff',
                color: '#4A2E1B',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 700,
                transition: 'all 0.15s'
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px',
                border: 'none',
                borderRadius: '8px',
                background: '#4A2E1B',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                transition: 'all 0.15s'
              }}
            >
              {loading ? 'Đang lưu...' : 'Xác nhận'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeModal;
