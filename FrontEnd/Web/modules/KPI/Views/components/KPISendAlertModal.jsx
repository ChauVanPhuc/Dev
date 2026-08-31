import React, { useState, useEffect } from 'react';
import { X, Bell, Send } from 'lucide-react';
import '@styles/components.css';

/**
 * Modal KPISendAlertModal (Tab 6 - Tạo/Chỉnh sửa Cảnh báo & Phát Thông báo đến Mobile Banner)
 */
const KPISendAlertModal = ({ isOpen, onClose, alertData, onSend }) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    code: `ALT-0${Math.floor(Math.random() * 90) + 10}`,
    title: 'Hiển thị thông báo mới',
    content: '',
    receiver: 'Bộ phận Sản xuất - Tổ Đóng Gói',
    channel: 'Mobile App Banner (/dashboard)',
    priority: 'Khẩn cấp'
  });

  useEffect(() => {
    if (alertData) {
      setFormData({
        code: alertData.code || 'ALT-01',
        title: alertData.title || '',
        content: alertData.content || '',
        receiver: alertData.receiver || '',
        channel: alertData.channel || 'Mobile App Banner (/dashboard)',
        priority: alertData.priority || 'Khẩn cấp'
      });
    } else {
      setFormData({
        code: `ALT-0${Math.floor(Math.random() * 90) + 10}`,
        title: 'Hiển thị thông báo mới',
        content: '',
        receiver: 'Bộ phận Sản xuất - Tổ Đóng Gói',
        channel: 'Mobile App Banner (/dashboard)',
        priority: 'Khẩn cấp'
      });
    }
  }, [alertData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSend) {
      const now = new Date();
      const dateStr = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
      onSend({
        ...formData,
        id: alertData ? alertData.id : Date.now(),
        date: alertData ? alertData.date : dateStr,
        status: alertData ? alertData.status : 'Đang phát'
      });
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      width: '100vw', height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(3px)',
      zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', boxSizing: 'border-box'
    }} onClick={onClose}>
      
      <div style={{
        margin: 'auto', backgroundColor: '#FFFFFF', borderRadius: '12px',
        width: '100%', maxWidth: '540px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 18px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#FAF6F0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} style={{ color: '#5D3B32' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#5D3B32', fontWeight: '800' }}>
              {alertData ? '✏️ Chỉnh sửa thông báo' : '📢 Bắn Cảnh Báo / Thông Báo Đến Mobile App'}
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
              Mã thông báo
            </label>
            <input
              type="text"
              value={formData.code}
              readOnly
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#F1F5F9', fontSize: '0.8rem', color: '#64748B', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
              Tiêu đề thông báo *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
              Nội dung chi tiết (Hiển thị Banner Mobile) *
            </label>
            <textarea
              rows={3}
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
              Đối tượng nhận thông báo *
            </label>
            <input
              type="text"
              value={formData.receiver}
              onChange={(e) => setFormData(prev => ({ ...prev, receiver: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
              required
            />
          </div>

          {/* Preview Box */}
          <div style={{ backgroundColor: '#FAF6F0', borderRadius: '10px', padding: '12px 16px', border: '1px solid #EADCC9' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#7B5233', textTransform: 'uppercase', marginBottom: '6px' }}>
              📱 Xem trước giao diện Banner trên Mobile App (/dashboard):
            </div>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '14px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#5D3B32', marginBottom: '6px' }}>
                {formData.title || 'Hiển thị thông báo mới'}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.4' }}>
                {formData.content || 'Nội dung thông báo sẽ hiển thị ở đây...'}
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '6px 16px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#334155', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 20px', border: 'none', borderRadius: '6px', backgroundColor: '#5D3B32', color: '#FFFFFF', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              <Send size={14} /> {alertData ? 'Cập nhật thông báo' : 'Phát thông báo đến Mobile'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default KPISendAlertModal;
