import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { hrService } from '../Models/hr.service';
import SelectInfoModal from './SelectInfoModal';

const HierarchyNodeModal = ({ isOpen, onClose, node, allNodes, onSave }) => {
  const [rankLevel, setRankLevel] = useState('Cấp 1');
  const [parentId, setParentId] = useState('');
  const [description, setDescription] = useState('');
  const [pos, setPos] = useState(null);
  
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const isEdit = !!node;

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (node) {
        setRankLevel(node.rank_level || 'Cấp 1');
        setParentId(node.parent_id || '');
        setDescription(node.description || '');
        setPos(node.position_id ? { id: node.position_id, name: node.position_name } : null);
      } else {
        setRankLevel('Cấp 1');
        setParentId('');
        setDescription('');
        setPos(null);
      }
    }
  }, [isOpen, node]);

  const handleInfoSelect = (item) => {
    setPos(item);
    setSelectModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rankLevel) {
      setErrorMsg('Vui lòng nhập cấp bậc.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const payload = {
        rank_level: rankLevel,
        parent_id: parentId ? parseInt(parentId) : null,
        position_id: pos ? pos.id : null,
        description: description || null
      };

      if (isEdit) {
        await hrService.updateHierarchyNode(node.id, payload);
      } else {
        await hrService.createHierarchyNode(payload);
      }
      
      if (onSave) onSave();
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Lỗi khi lưu nút sơ đồ cấp bậc.');
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
              {isEdit ? 'Chỉnh sửa nút sơ đồ cấp bậc' : 'Thêm nút sơ đồ cấp bậc'}
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
                Cấp bậc <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={rankLevel}
                onChange={(e) => setRankLevel(e.target.value)}
                placeholder="Cấp 1, Cấp 2, Cấp 3..."
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
                Vị trí
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={pos ? pos.name : ''}
                  readOnly
                  placeholder="Chọn vị trí"
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
                  <option key={n.id} value={n.id}>{n.rank_level}</option>
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
        type="position"
        onSelect={handleInfoSelect}
      />
    </>
  );
};

export default HierarchyNodeModal;
