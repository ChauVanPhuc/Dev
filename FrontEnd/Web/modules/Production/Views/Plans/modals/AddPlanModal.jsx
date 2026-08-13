import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const AddPlanModal = ({ isOpen, onClose, onSave }) => {
  const modalMeta = useScreenMetadataCached('/admin/production/plans/modal/add-plan');
  const [formData, setFormData] = useState({
    startDate: '2026-08-05',
    endDate: '2026-08-15',
    orderId: 'DNH-2026-088',
    customer: 'Công ty Kiến trúc Á Đông',
    quantity: 100,
    factory: 'Nhà máy 1',
    note: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

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
      zIndex: 1000,
      backdropFilter: 'blur(3px)'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '560px',
        maxWidth: '92%',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
      }}>
        <div style={{
          padding: '18px 24px',
          backgroundColor: '#5D3B32',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            {modalMeta.screenCode && (
              <span style={{ fontSize: '0.75rem', fontWeight: '800', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', marginRight: '8px' }}>
                {modalMeta.screenCode}
              </span>
            )}
            <h3 style={{ margin: '4px 0 0 0', fontSize: '1.1rem', fontWeight: '800', display: 'inline-block' }}>
              {modalMeta.title || 'Lập Kế Hoạch Sản Xuất Mới'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>Mã đơn hàng liên kết</label>
              <input
                type="text"
                value={formData.orderId}
                onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>Khách hàng</label>
              <input
                type="text"
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>Ngày bắt đầu</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>Ngày hoàn thành dự kiến</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>Số lượng sản xuất</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>Nhà máy phân công</label>
              <select
                value={formData.factory}
                onChange={(e) => setFormData({ ...formData, factory: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', boxSizing: 'border-box', background: '#FFF' }}
              >
                <option value="Nhà máy 1">Nhà máy 1 (Gỗ tự nhiên)</option>
                <option value="Nhà máy 2">Nhà máy 2 (Gỗ công nghiệp)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>Ghi chú kế hoạch</label>
            <textarea
              rows="3"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Yêu cầu phối hợp các tổ sản xuất..."
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', borderRadius: '8px', border: '1.5px solid #EADCC9', background: '#FFF', color: '#374151', fontWeight: '600', cursor: 'pointer' }}>
              Hủy
            </button>
            <button type="submit" style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: '#5D3B32', color: '#FFF', fontWeight: '700', cursor: 'pointer' }}>
              Lưu kế hoạch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPlanModal;
