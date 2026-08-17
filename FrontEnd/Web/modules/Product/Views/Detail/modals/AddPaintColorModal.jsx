import React, { useState } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const getDefaultExpiryDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toISOString().split('T')[0];
};

const AddPaintColorModal = ({ productId, bomRows = [], detailRows = [], onClose, onSuccess }) => {
  const modalMeta = useScreenMetadataCached('/admin/product/detail/modal/add-paint-color');
  const [colorCode] = useState(() => `MS-${String(Math.floor(Math.random() * 800 + 100))}`);
  const [colorName, setColorName] = useState('');
  const [supplier, setSupplier] = useState('');
  const [expiryDate, setExpiryDate] = useState(getDefaultExpiryDate());
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  // Lấy danh sách tên màu sơn THUẦN TÚY từ các Chi tiết trong bảng master_product_details (detailRows)
  const dynamicColorNames = Array.from(new Set([
    'Sơn PU mờ 50%',
    'Sơn PU mờ 70%',
    'Sơn PU bóng 100%',
    'Sơn bóng gỗ sồi',
    'Sơn lót Polyurethane',
    'Sơn trắng 2K',
    'Sơn màu Walnut',
    ...detailRows.map(r => r.name ? `Sơn PU - ${r.name}` : null).filter(Boolean),
    ...detailRows.map(r => r.name).filter(Boolean)
  ]));

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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '16px' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '700px', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#432818', margin: 0 }}>
            {modalMeta.screenCode ? `${modalMeta.screenCode}: ` : ''}
            {modalMeta.title || 'Thêm mẫu màu sơn'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Image Upload Box */}
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
                  type="text" disabled readOnly
                  value={colorCode}
                  placeholder="Mã màu tự sinh..."
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #cbd5e1', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '8px', fontSize: '0.88rem', fontWeight: '700', cursor: 'not-allowed', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '2px' }}>Tên màu sơn *</label>
                <select
                  required
                  value={colorName}
                  onChange={e => setColorName(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', outline: 'none', backgroundColor: '#FFFFFF' }}
                >
                  <option value="">-- Chọn tên màu sơn --</option>
                  {dynamicColorNames.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '2px' }}>Nhà cung cấp *</label>
              <select
                required
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', outline: 'none', backgroundColor: '#FFFFFF' }}
              >
                <option value="">-- Chọn nhà cung cấp --</option>
                {[
                  'Công ty Sơn Nippon',
                  'NPP Sơn Oseven',
                  'NPP Sơn Dulux',
                  'Sơn Á Châu',
                  'Nội bộ G7'
                ].map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
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
            <select
              required
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', outline: 'none', backgroundColor: '#FFFFFF' }}
            >
              <option value="">-- Chọn điều kiện bảo quản / ghi chú --</option>
              {[
                'Bảo quản nơi khô ráo, thoáng mát (25-30°C)',
                'Đóng kín nắp ngay sau khi lấy mẫu',
                'Tránh ánh nắng trực tiếp',
                'Mẫu thử tiêu chuẩn kiểm định chất lượng',
                'Dùng cho công đoạn sơn phủ bề mặt'
              ].map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
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
