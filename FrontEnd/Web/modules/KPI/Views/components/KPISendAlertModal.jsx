import React, { useState, useEffect } from 'react';
import { X, Bell, Send } from 'lucide-react';
import '@styles/components.css';

/**
 * Modal KPISendAlertModal (Tab 6 - Tạo/Chỉnh sửa Cảnh báo & Phát Thông báo đến Mobile Banner)
 */
const KPISendAlertModal = ({ isOpen, onClose, alertData, onSend }) => {
  if (!isOpen) return null;

  const formatToDatetimeLocal = (str) => {
    if (!str) {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
      return str.slice(0, 16);
    }
    const dMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    const tMatch = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
    if (dMatch) {
      const day = dMatch[1].padStart(2, '0');
      const month = dMatch[2].padStart(2, '0');
      const year = dMatch[3];
      const hour = tMatch ? tMatch[1].padStart(2, '0') : '08';
      const min = tMatch ? tMatch[2].padStart(2, '0') : '00';
      return `${year}-${month}-${day}T${hour}:${min}`;
    }
    try {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        const hours = String(parsed.getHours()).padStart(2, '0');
        const mins = String(parsed.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${mins}`;
      }
    } catch (e) {}
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T08:00`;
  };

  const formatFromDatetimeLocal = (val) => {
    if (!val) return '';
    const [dPart, tPart] = val.split('T');
    if (!dPart) return val;
    const [y, m, d] = dPart.split('-');
    return `${d}/${m}/${y} ${tPart || '00:00'}`;
  };

  const getNowFormatted = () => formatFromDatetimeLocal(formatToDatetimeLocal());

  const getFutureFormatted = (days = 7) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const calculateDuration = (startStr, endStr) => {
    if (!startStr || !endStr) return '';
    const parseDateTime = (str) => {
      if (!str) return null;
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
        return new Date(str);
      }
      const dMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      const tMatch = str.match(/(\d{1,2}):(\d{2})/);
      if (dMatch && tMatch) {
        const day = parseInt(dMatch[1], 10);
        const month = parseInt(dMatch[2], 10) - 1;
        const year = parseInt(dMatch[3], 10);
        const hour = parseInt(tMatch[1], 10);
        const min = parseInt(tMatch[2], 10);
        return new Date(year, month, day, hour, min);
      }
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    };

    const startDate = parseDateTime(startStr);
    const endDate = parseDateTime(endStr);
    if (!startDate || !endDate) return '';
    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs <= 0) return '0 phút (Hạn ngắn hơn ban hành)';

    const totalMins = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMins / (24 * 60));
    const hours = Math.floor((totalMins % (24 * 60)) / 60);
    const mins = totalMins % 60;

    let res = [];
    if (days > 0) res.push(`${days} ngày`);
    if (hours > 0) res.push(`${hours} giờ`);
    if (mins > 0 || (days === 0 && hours === 0)) res.push(`${mins} phút`);
    return res.join(' ');
  };

  const [formData, setFormData] = useState({
    code: `ALT-0${Math.floor(Math.random() * 90) + 10}`,
    title: 'Hiển thị thông báo mới',
    content: '',
    receiver: 'Bộ phận Sản xuất - Tổ Đóng Gói',
    channel: 'Mobile App Banner (/dashboard)',
    priority: 'Khẩn cấp',
    issuedAt: getNowFormatted(),
    expiresAt: getFutureFormatted(7)
  });

  useEffect(() => {
    if (alertData) {
      setFormData({
        code: alertData.code || 'ALT-01',
        title: alertData.title || '',
        content: alertData.content || '',
        receiver: alertData.receiver || '',
        channel: alertData.channel || 'Mobile App Banner (/dashboard)',
        priority: alertData.priority || 'Khẩn cấp',
        issuedAt: alertData.issuedAt || alertData.date || getNowFormatted(),
        expiresAt: alertData.expiresAt || getFutureFormatted(7)
      });
    } else {
      setFormData({
        code: `ALT-0${Math.floor(Math.random() * 90) + 10}`,
        title: 'Hiển thị thông báo mới',
        content: '',
        receiver: 'Bộ phận Sản xuất - Tổ Đóng Gói',
        channel: 'Mobile App Banner (/dashboard)',
        priority: 'Khẩn cấp',
        issuedAt: getNowFormatted(),
        expiresAt: getFutureFormatted(7)
      });
    }
  }, [alertData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSend) {
      const dateStr = getNowFormatted();
      onSend({
        ...formData,
        id: alertData ? alertData.id : Date.now(),
        date: alertData ? alertData.date : dateStr,
        issuedAt: formData.issuedAt || dateStr,
        expiresAt: formData.expiresAt || getFutureFormatted(7),
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                Thời gian ban hành *
              </label>
              <input
                type="datetime-local"
                value={formatToDatetimeLocal(formData.issuedAt)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setFormData(prev => ({ ...prev, issuedAt: formatFromDatetimeLocal(val) }));
                  }
                }}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
                required
              />
              {formData.issuedAt && (
                <span style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px', display: 'block' }}>
                  Đã chọn: <strong style={{ color: '#5D3B32' }}>{formData.issuedAt}</strong>
                </span>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                Thời gian kết thúc *
              </label>
              <input
                type="datetime-local"
                value={formatToDatetimeLocal(formData.expiresAt)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setFormData(prev => ({ ...prev, expiresAt: formatFromDatetimeLocal(val) }));
                  }
                }}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
                required
              />
              {formData.expiresAt && (
                <span style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px', display: 'block' }}>
                  Hạn đến: <strong style={{ color: '#DC2626' }}>{formData.expiresAt}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Badge Tổng thời gian phát */}
          {formData.issuedAt && formData.expiresAt && (
            <div style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '8px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              fontSize: '0.78rem',
              color: '#166534'
            }}>
              <span>⏱️ <strong>Tổng thời gian phát thông báo:</strong></span>
              <span style={{ fontWeight: '800', color: '#15803D', fontSize: '0.85rem' }}>
                {calculateDuration(formData.issuedAt, formData.expiresAt) || '0 phút'}
              </span>
            </div>
          )}

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
