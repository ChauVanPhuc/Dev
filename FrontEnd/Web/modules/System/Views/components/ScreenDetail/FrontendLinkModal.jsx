import React from 'react';
import { X } from 'lucide-react';

const FrontendLinkModal = ({
  isOpen,
  onClose,
  linkSubsystem,
  setLinkSubsystem,
  linkScreenId,
  setLinkScreenId,
  linkComponentId,
  setLinkComponentId,
  sidebarGroups,
  filteredScreens,
  linkFilteredComponents,
  displayInfoText,
  handleConfirmLink
}) => {
  if (!isOpen) return null;

  return (
<div style={{
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999
}}>
  <div style={{
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '480px',
    padding: '24px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    fontFamily: 'Inter, sans-serif'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1E293B', margin: 0 }}>
        03.1: Chọn link dẫn Frontend
      </h3>
      <button
        type="button"
        onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <X size={18} />
      </button>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.76rem', display: 'block', marginBottom: '6px' }}>Nhóm Menu Sidebar</label>
        <select
          value={linkSubsystem}
          onChange={(e) => setLinkSubsystem(e.target.value)}
          style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.84rem', outline: 'none', color: '#1E293B', backgroundColor: '#fff', height: '36px' }}
        >
          {sidebarGroups.map(s => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.76rem', display: 'block', marginBottom: '6px' }}>Mục Menu Sidebar</label>
          <select
            value={linkScreenId}
            onChange={(e) => setLinkScreenId(e.target.value)}
            style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.84rem', outline: 'none', color: '#1E293B', backgroundColor: '#fff', height: '36px' }}
          >
            <option value="">-- Chọn mục menu --</option>
            {filteredScreens.map(s => (
              <option key={s.id} value={s.id}>{s.title} ({s.route_path})</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.76rem', display: 'block', marginBottom: '6px' }}>Thành phần tương tác</label>
          <select
            value={linkComponentId}
            onChange={(e) => setLinkComponentId(e.target.value)}
            style={{ width: '100%', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 12px', fontSize: '0.84rem', outline: 'none', color: '#1E293B', backgroundColor: '#fff', height: '36px' }}
            disabled={!linkScreenId}
          >
            <option value="">-- Chọn component --</option>
            {linkFilteredComponents.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.76rem', display: 'block', marginBottom: '6px' }}>Thông tin hiển thị</label>
        <div style={{
          width: '100%',
          border: '1px solid #E2E8F0',
          backgroundColor: '#F1F5F9',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '0.84rem',
          fontWeight: '500',
          color: '#475569',
          minHeight: '38px',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box'
        }}>
          {displayInfoText}
        </div>
      </div>
    </div>

    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
      <button
        type="button"
        onClick={onClose}
        style={{
          padding: '8px 20px',
          borderRadius: '8px',
          border: '1px solid #7B5233',
          backgroundColor: '#fff',
          color: '#7B5233',
          fontWeight: 'bold',
          fontSize: '0.82rem',
          cursor: 'pointer',
          height: '36px'
        }}
      >
        Hủy bỏ
      </button>
      <button
        type="button"
        onClick={handleConfirmLink}
        style={{
          padding: '8px 20px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: '#7B5233',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '0.82rem',
          cursor: 'pointer',
          height: '36px'
        }}
      >
        Xác nhận
      </button>
    </div>
  </div>
</div>

  );
};

export default FrontendLinkModal;
