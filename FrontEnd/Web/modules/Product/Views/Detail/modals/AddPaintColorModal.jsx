import React, { useState } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import api from '@webShared/Services/api.service';

const AddPaintColorModal = ({ productId, onClose, onSuccess }) => {
  const [colorCode, setColorCode] = useState('');
  const [colorName, setColorName] = useState('');
  const [supplier, setSupplier] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!colorCode.trim() || !colorName.trim()) return;
    try {
      setLoading(true);
      await api.post(`/master-products/${productId}/paint-colors`, {
        color_code: colorCode,
        color_name: colorName,
        supplier,
        expiry_date: expiryDate,
        image_url: imagePreview || '',
        note
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Lỗi khi thêm mẫu màu sơn:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '460px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#432818', margin: 0 }}>
            KTO3.3: Thêm mẫu màu sơn
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Image Upload Box matching Mockup 3 */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{
              width: '100px', height: '100px', borderRadius: '12px', border: '2px dashed #cbd5e1',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              backgroundColor: '#f8fafc', overflow: 'hidden', position: 'relative', cursor: 'pointer'
            }} onClick={() => document.getElementById('paint-img-input').click()}>
              {imagePreview ? (
                <img src={imagePreview} alt="Mẫu màu sơn" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <ImageIcon size={28} color="#94a3b8" />
                  <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>Tải ảnh mẫu</span>
                </>
              )}
              <input id="paint-img-input" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '2px' }}>Mã màu sơn *</label>
                <input
                  type="text" required placeholder="Ví dụ: MS-PU-01"
                  value={colorCode} onChange={e => setColorCode(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '2px' }}>Tên màu sơn *</label>
                <input
                  type="text" required placeholder="Ví dụ: Sơn bóng gỗ sồi"
                  value={colorName} onChange={e => setColorName(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '2px' }}>Nhà cung cấp *</label>
              <input
                type="text" required placeholder="Tên nhà cung cấp"
                value={supplier} onChange={e => setSupplier(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '2px' }}>Ngày hết hạn của mẫu *</label>
              <input
                type="date" required
                value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '2px' }}>Ghi chú *</label>
            <textarea
              rows="2" required placeholder="Ghi chú điều kiện bảo quản mẫu màu..."
              value={note} onChange={e => setNote(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '8px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '0.84rem', cursor: 'pointer' }}>
              Hủy bỏ
            </button>
            <button type="submit" disabled={loading} style={{ border: 'none', background: '#432818', color: '#fff', padding: '8px 18px', borderRadius: '8px', fontWeight: '700', fontSize: '0.84rem', cursor: 'pointer' }}>
              {loading ? 'Đang lưu...' : 'Xác nhận'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddPaintColorModal;
