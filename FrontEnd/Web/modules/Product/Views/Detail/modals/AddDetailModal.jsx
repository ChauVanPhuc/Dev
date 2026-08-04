import React, { useState } from 'react';
import { X } from 'lucide-react';
import api from '@webShared/Services/api.service';

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: '700',
  color: '#2D1A12',
  marginBottom: '6px',
};

const inputBaseStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #EADCC9',
  borderRadius: '8px',
  fontSize: '0.88rem',
  fontWeight: '600',
  color: '#2D1A12',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  backgroundColor: '#FFFFFF',
};

const AddDetailModal = ({ productId, product, bomRows = [], detailRows = [], onClose, onSuccess }) => {
  // Option lists từ bảng master_product_details (detailRows)
  const parentOptions = [
    { id: '', name: product?.name || 'Sản phẩm' },
    ...detailRows.map(r => ({ id: r.id || r.name, name: r.name }))
  ];

  const stageOptions = ['Định hình', 'Tạo phôi', 'Lắp ráp', 'Sơn', 'Đóng gói', 'Lưu kho'];
  const materialOptions = ['Gỗ tự nhiên', 'MDF', 'Gỗ Sồi', 'Gỗ thông', 'Ván ép', 'Kim loại'];
  const unitOptions = ['Cái', 'Tấm', 'Bộ', 'm2', 'm3'];

  // Form states
  const [detailName, setDetailName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('Cái');
  const [inputStage, setInputStage] = useState('Định hình');
  const [outputStage, setOutputStage] = useState('Lắp ráp');
  const [selectedParent, setSelectedParent] = useState('');
  const [material, setMaterial] = useState('Gỗ tự nhiên');
  const [loading, setLoading] = useState(false);
  const [systemSuggestions, setSystemSuggestions] = useState([]);

  // Fetch full system detail suggestions from backend
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await api.get('/master-products/detail-suggestions').catch(() => null);
        if (res && res.detail_names) {
          setSystemSuggestions(res.detail_names);
        }
      } catch (err) {
        console.warn('Lỗi lấy gợi ý tên chi tiết:', err);
      }
    };
    fetchSuggestions();
  }, []);

  // Combined suggestions
  const dynamicDetailNames = Array.from(new Set([
    ...detailRows.map(r => r.name).filter(Boolean),
    ...systemSuggestions
  ]));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!detailName.trim()) return;

    try {
      setLoading(true);
      const parentObj = parentOptions.find(o => o.id === selectedParent);
      const parentStt = parentObj ? parentObj.stt : '1';

      await api.post(`/master-products/${productId}/product-details`, {
        name: detailName,
        quantity: parseFloat(quantity),
        unit,
        input_stage: inputStage,
        output_stage: outputStage,
        parent_name: parentObj ? parentObj.name : '',
        material
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Lỗi khi thêm chi tiết mới:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(45, 26, 18, 0.45)',
      backdropFilter: 'blur(3px)',
      zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '780px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        border: '1.5px solid #EADCC9'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #EADCC9'
        }}>
          <h3 style={{ fontSize: '1.38rem', fontWeight: '900', color: '#2D1A12', margin: 0 }}>
            KT03.1: Thêm chi tiết
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#2D1A12',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '4px'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* ROW 1: Tên chi tiết, Số lượng, Đơn vị */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <label style={labelStyle}>Tên chi tiết *</label>
                <input
                  type="text"
                  required
                  placeholder="Gõ để xem gợi ý tên chi tiết..."
                  value={detailName}
                  onChange={e => setDetailName(e.target.value)}
                  style={inputBaseStyle}
                />
                {detailName && detailName.trim() && (
                  (() => {
                    const filtered = dynamicDetailNames
                      .filter(s => s.toLowerCase().includes(detailName.toLowerCase().trim()) && s.toLowerCase() !== detailName.toLowerCase().trim())
                      .slice(0, 6);
                    if (filtered.length === 0) return null;
                    return (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                        backgroundColor: '#FFFFFF', border: '1.5px solid #EADCC9', borderRadius: '8px',
                        boxShadow: '0 8px 16px rgba(45, 26, 18, 0.15)', maxHeight: '180px', overflowY: 'auto', zIndex: 3000
                      }}>
                        {filtered.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => setDetailName(item)}
                            style={{
                              padding: '8px 12px', fontSize: '0.82rem', fontWeight: '600', color: '#2D1A12',
                              cursor: 'pointer', borderBottom: idx < filtered.length - 1 ? '1px solid #F1F5F9' : 'none'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#FAF6F0'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#FFFFFF'}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
              <div>
                <label style={labelStyle}>Số lượng *</label>
                <input
                  type="number" min="1" step="any" required
                  value={quantity} onChange={e => setQuantity(e.target.value)}
                  style={inputBaseStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Đơn vị *</label>
                <select value={unit} onChange={e => setUnit(e.target.value)} style={inputBaseStyle}>
                  {unitOptions.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ROW 2: Công đoạn giao, Công đoạn nhận, Thành phẩm */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Công đoạn giao *</label>
                <select value={inputStage} onChange={e => setInputStage(e.target.value)} style={inputBaseStyle}>
                  {stageOptions.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Công đoạn nhận *</label>
                <select value={outputStage} onChange={e => setOutputStage(e.target.value)} style={inputBaseStyle}>
                  {stageOptions.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Thành phẩm *</label>
                <select value={selectedParent} onChange={e => setSelectedParent(e.target.value)} style={inputBaseStyle}>
                  {parentOptions.map((opt, i) => (
                    <option key={i} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ROW 3: Vật liệu */}
            <div>
              <label style={labelStyle}>Vật liệu *</label>
              <select value={material} onChange={e => setMaterial(e.target.value)} style={inputBaseStyle}>
                {materialOptions.map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '10px'
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '11px 26px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #2D1A12',
                  borderRadius: '8px',
                  color: '#2D1A12',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '11px 32px',
                  backgroundColor: '#432818',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 10px rgba(67, 40, 24, 0.2)'
                }}
              >
                {loading ? 'Đang thêm...' : 'Xác nhận'}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDetailModal;
