import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { hrService } from '../Models/hr.service';
import SelectInfoModal from './SelectInfoModal';

const PersonnelNodeModal = ({ isOpen, onClose, node, allNodes, onSave }) => {
  const [nodeName, setNodeName] = useState('');
  const [parentId, setParentId] = useState('');
  const [employeeCount, setEmployeeCount] = useState(0);
  const [description, setDescription] = useState('');
  const [dept, setDept] = useState(null);
  const [sec, setSec] = useState(null);
  
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [selectType, setSelectType] = useState('department');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const isEdit = !!node;

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (node) {
        setNodeName(node.node_name || '');
        setParentId(node.parent_id || '');
        setEmployeeCount(node.employee_count || 0);
        setDescription(node.description || '');
        setDept(node.department_id ? { id: node.department_id, name: node.department_name } : null);
        setSec(node.section_id ? { id: node.section_id, name: node.section_name } : null);
      } else {
        setNodeName('');
        setParentId('');
        setEmployeeCount(0);
        setDescription('');
        setDept(null);
        setSec(null);
      }
    }
  }, [isOpen, node]);

  const openSelector = (type) => {
    setSelectType(type);
    setSelectModalOpen(true);
  };

  const handleInfoSelect = (item) => {
    if (selectType === 'department') setDept(item);
    else if (selectType === 'section') setSec(item);
    setSelectModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nodeName) {
      setErrorMsg('Vui lòng nhập tên nút.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const payload = {
        node_name: nodeName,
        parent_id: parentId ? parseInt(parentId) : null,
        department_id: dept ? dept.id : null,
        section_id: sec ? sec.id : null,
        employee_count: parseInt(employeeCount) || 0,
        description: description || null
      };

      if (isEdit) {
        await hrService.updatePersonnelNode(node.id, payload);
      } else {
        await hrService.createPersonnelNode(payload);
      }
      
      if (onSave) onSave();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Lỗi khi lưu nút sơ đồ nhân sự.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
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
        zIndex: 1000
      }} onClick={onClose}>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#2D1A12' }}>
              {isEdit ? 'Chỉnh sửa nút sơ đồ nhân sự' : 'Thêm nút sơ đồ nhân sự'}
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            {errorMsg && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#FEE2E2', 
                color: '#991B1B', 
                borderRadius: '8px', 
                marginBottom: '16px',
                fontSize: '0.875rem'
              }}>
                {errorMsg}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Tên nút <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                placeholder="Nhập tên nút..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Phòng ban
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={dept ? dept.name : ''}
                  readOnly
                  placeholder="Chọn phòng ban"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    backgroundColor: '#F9FAFB'
                  }}
                />
                <button
                  type="button"
                  onClick={() => openSelector('department')}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#7B5233',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Chọn
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Bộ phận
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={sec ? sec.name : ''}
                  readOnly
                  placeholder="Chọn bộ phận"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    backgroundColor: '#F9FAFB'
                  }}
                />
                <button
                  type="button"
                  onClick={() => openSelector('section')}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#7B5233',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Chọn
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Số lượng nhân viên
              </label>
              <input
                type="number"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
                min="0"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Nút cha
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">-- Không có (Nút gốc) --</option>
                {allNodes.filter(n => !isEdit || n.id !== node.id).map(n => (
                  <option key={n.id} value={n.id}>{n.node_name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Mô tả
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập mô tả..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: loading ? '#9CA3AF' : '#7B5233',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <SelectInfoModal
        isOpen={selectModalOpen}
        onClose={() => setSelectModalOpen(false)}
        type={selectType}
        onSelect={handleInfoSelect}
      />
    </>
  );
};

export default PersonnelNodeModal;
