import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { hrService } from '../../Models/hr.service';
import SelectInfoModal from './SelectInfoModal';

const FactoryStructureModal = ({ isOpen, onClose, structure, allStructures, onSave }) => {
  const [structureCode, setStructureCode] = useState('');
  const [structureName, setStructureName] = useState('');
  const [structureType, setStructureType] = useState('Nhà máy');
  const [parentId, setParentId] = useState('');
  const [description, setDescription] = useState('');
  const [dept, setDept] = useState(null);
  const [departments, setDepartments] = useState([]);
  
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const isEdit = !!structure;

  const loadDepartments = async () => {
    try {
      const res = await hrService.getDepartments();
      setDepartments(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDepartments();
      setErrorMsg('');
      if (structure) {
        setStructureCode(structure.structure_code || '');
        setStructureName(structure.structure_name || '');
        setStructureType(structure.structure_type || 'Nhà máy');
        setParentId(structure.parent_id || '');
        setDescription(structure.description || '');
        setDept(structure.department_id ? { id: structure.department_id, name: structure.department_name } : null);
      } else {
        setStructureCode('');
        setStructureName('');
        setStructureType('Nhà máy');
        setParentId('');
        setDescription('');
        setDept(null);
      }
    }
  }, [isOpen, structure]);

  const handleInfoSelect = (item) => {
    setDept(item);
    setSelectModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!structureCode || !structureName) {
      setErrorMsg('Vui lòng nhập mã và tên cấu trúc.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const payload = {
        structure_code: structureCode,
        structure_name: structureName,
        structure_type: structureType,
        parent_id: parentId ? parseInt(parentId) : null,
        department_id: dept ? dept.id : null,
        description: description || null
      };

      if (isEdit) {
        await hrService.updateFactoryStructure(structure.id, payload);
      } else {
        await hrService.createFactoryStructure(payload);
      }
      
      if (onSave) onSave();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Lỗi khi lưu cấu trúc nhà máy.');
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
          maxWidth: '700px',
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
              {isEdit ? 'NS03: Cấu hình nhà máy' : 'NS03: Cấu hình nhà máy'}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Mã cấu trúc <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={structureCode}
                  onChange={(e) => setStructureCode(e.target.value)}
                  placeholder="NM001, PX001..."
                  disabled={isEdit}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    backgroundColor: isEdit ? '#F3F4F6' : '#fff'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                  Loại cấu trúc <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={structureType}
                  onChange={(e) => setStructureType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                  required
                >
                  <option value="Nhà máy">Nhà máy</option>
                  <option value="Phân xưởng">Phân xưởng</option>
                  <option value="Tổ sản xuất">Tổ sản xuất</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Tên cấu trúc <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={structureName}
                onChange={(e) => setStructureName(e.target.value)}
                placeholder="Nhập tên cấu trúc..."
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
                  onClick={() => setSelectModalOpen(true)}
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
                Cấu trúc cha
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
                <option value="">-- Không có (Cấu trúc gốc) --</option>
                {allStructures.filter(s => !isEdit || s.id !== structure.id).map(s => (
                  <option key={s.id} value={s.id}>{s.structure_name} ({s.structure_type})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
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

            {/* Department List Section */}
            <div style={{ 
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#FAF8F5',
              borderRadius: '8px',
              border: '1px solid #EADCC9'
            }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#2D1A12', marginBottom: '12px' }}>
                Danh sách phòng ban
              </h3>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#7B5233', color: '#fff' }}>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Mã</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Tên phòng ban</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Mô tả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: '12px', textAlign: 'center', color: '#9CA3AF' }}>
                          Không có phòng ban nào
                        </td>
                      </tr>
                    ) : departments.map(d => (
                      <tr key={d.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '8px', color: '#7B5233', fontWeight: 600 }}>{d.code}</td>
                        <td style={{ padding: '8px', color: '#1E293B' }}>{d.name}</td>
                        <td style={{ padding: '8px', color: '#64748B' }}>{d.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
        type="department"
        onSelect={handleInfoSelect}
      />
    </>
  );
};

export default FactoryStructureModal;
