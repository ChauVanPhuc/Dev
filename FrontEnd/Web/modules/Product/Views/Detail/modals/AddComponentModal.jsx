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
};

const whiteInputStyle = {
  ...inputBaseStyle,
  backgroundColor: '#FFFFFF',
};

const greyInputStyle = {
  ...inputBaseStyle,
  backgroundColor: '#F1ECE6', // Light beige-grey matching mockup fields
  border: '1.5px solid #D9C5B2',
};

const AddComponentModal = ({ productId, product, bomRows = [], parentId = null, onClose, onSuccess }) => {
  // Option lists
  const parentOptions = [
    { id: '', name: product?.name || 'Sven Display Cabinet', stt: '1' },
    ...bomRows
      .filter(r => r.stt.split('.').length <= 2)
      .map(r => ({ id: r.id || r.compCode, name: r.compName, stt: r.stt }))
  ];

  const typeOptions = ['Chân', 'Cụm', 'Ván panel', 'Khung', 'Hộc kéo', 'Mặt', 'Phụ kiện'];
  const nameOptions = ['Chân', 'Ván panel', 'Cụm hông dưới', 'Cánh tủ', 'Khung đỡ', 'Đế tủ'];
  const stageOptions = [
    'Tạo phôi',
    'Định hình',
    'Chà nhám',
    'Sơn',
    'Sơn Pallet',
    'Sơn treo',
    'Lắp ráp',
    'QC / Kiểm định',
    'Đóng gói',
    'Lưu kho',
    'NM1 - Tạo phôi 1',
    'NM1 - Định hình 1',
    'NM1 - Định hình ván 1',
    'NM1 - Chà nhám 1',
    'NM1 - Lắp ráp 1',
    'NM1 - Lắp ráp ván 1',
    'NM1 - Lắp ráp, chà nhám 1',
    'NM1 - Sơn 1',
    'NM1 - Đóng gói 1',
    'NM2 - Định hình mặt tiền 2',
    'NM2 - Định hình tủ 2',
    'NM2 - Lắp ráp mặt tiền 2',
    'NM2 - Lắp ráp tủ 2',
    'NM2 - Sơn Pallet 2',
    'NM2 - Sơn treo 2',
    'NM2 - Đóng gói 2',
    'NM3 - Tạo phôi 3',
    'NM3 - Định hình 3',
    'NM3 - Lắp ráp 3',
    'NM3 - Sơn 3',
    'NM3 - Đóng gói 3'
  ];
  const materialOptions = ['MDF', 'Gỗ Sồi', 'Gỗ thông', 'HDF', 'Ván ép', 'Kim loại'];
  const colorOptions = ['Tự nhiên', 'Màu WOA', 'Màu sồi', 'Trắng', 'Đen'];

  // Form states
  const [selectedParent, setSelectedParent] = useState(parentId || '');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('Cái');
  const [type, setType] = useState('Chân');
  const [detailName, setDetailName] = useState('Chân');
  const [inputStage, setInputStage] = useState('Định hình');
  const [outputStage, setOutputStage] = useState('Lắp ráp');
  const [length, setLength] = useState('12');
  const [width, setWidth] = useState('12');
  const [height, setHeight] = useState('15');
  const [volume, setVolume] = useState('5');
  const [material, setMaterial] = useState('MDF');
  const [color, setColor] = useState('Tự nhiên');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!detailName.trim()) return;

    try {
      setLoading(true);
      const specStr = `${length || 0}*${width || 0}*${height || 0}`;
      
      // Auto-generate target parent STT
      const parentObj = parentOptions.find(o => o.id === selectedParent);
      const parentStt = parentObj ? parentObj.stt : '1';

      await api.post(`/master-products/${productId}/bom-details`, {
        parent_id: selectedParent || null,
        name: detailName,
        sku: `ADV691.${parentStt}.${bomRows.length + 1}`,
        quantity: parseFloat(quantity),
        unit,
        component_type: type,
        input_stage: inputStage,
        output_stage: outputStage,
        specification: specStr,
        material,
        color,
        volume: parseFloat(volume),
        description: note
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Lỗi khi thêm thành phần mới:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(45, 26, 18, 0.45)', // Custom brown shadow backdrop
      backdropFilter: 'blur(3px)',
      zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '580px',
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
            KT03.2: Thêm thành phần
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
            
            {/* ROW 1: Thành phẩm, Số lượng, Đơn vị */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Thành phẩm</label>
                <select value={selectedParent} onChange={e => setSelectedParent(e.target.value)} style={whiteInputStyle}>
                  {parentOptions.map((opt, i) => (
                    <option key={i} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Số lượng</label>
                <input
                  type="number" min="1" step="any" required
                  value={quantity} onChange={e => setQuantity(e.target.value)}
                  style={greyInputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Đơn vị</label>
                <select value={unit} onChange={e => setUnit(e.target.value)} style={greyInputStyle}>
                  <option value="Cái">Cái</option>
                  <option value="Tấm">Tấm</option>
                  <option value="Bộ">Bộ</option>
                  <option value="m2">m2</option>
                  <option value="m3">m3</option>
                </select>
              </div>
            </div>

            {/* ROW 2: Loại, Tên chi tiết */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Loại *</label>
                <select value={type} onChange={e => setType(e.target.value)} style={whiteInputStyle}>
                  {typeOptions.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tên chi tiết *</label>
                <select value={detailName} onChange={e => setDetailName(e.target.value)} style={whiteInputStyle}>
                  {nameOptions.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ROW 3: Công đoạn giao, Công đoạn nhận, Quy cách, Khối lượng */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.8fr 1.2fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Công đoạn giao</label>
                <select value={inputStage} onChange={e => setInputStage(e.target.value)} style={greyInputStyle}>
                  {stageOptions.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Công đoạn nhận</label>
                <select value={outputStage} onChange={e => setOutputStage(e.target.value)} style={greyInputStyle}>
                  {stageOptions.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Quy cách (mm)</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="number" placeholder="Dài" required
                    value={length} onChange={e => setLength(e.target.value)}
                    style={{ ...whiteInputStyle, padding: '10px 4px', textAlign: 'center' }}
                  />
                  <input
                    type="number" placeholder="Rộng" required
                    value={width} onChange={e => setWidth(e.target.value)}
                    style={{ ...whiteInputStyle, padding: '10px 4px', textAlign: 'center' }}
                  />
                  <input
                    type="number" placeholder="Cao" required
                    value={height} onChange={e => setHeight(e.target.value)}
                    style={{ ...whiteInputStyle, padding: '10px 4px', textAlign: 'center' }}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Khối lượng (m3)</label>
                <input
                  type="number" placeholder="Volume" step="any" required
                  value={volume} onChange={e => setVolume(e.target.value)}
                  style={greyInputStyle}
                />
              </div>
            </div>

            {/* ROW 4: Vật liệu, Màu sắc */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Vật liệu *</label>
                <select value={material} onChange={e => setMaterial(e.target.value)} style={whiteInputStyle}>
                  {materialOptions.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Màu sắc *</label>
                <select value={color} onChange={e => setColor(e.target.value)} style={whiteInputStyle}>
                  {colorOptions.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ROW 5: Ghi chú */}
            <div>
              <label style={labelStyle}>Ghi chú</label>
              <textarea
                rows="3"
                placeholder="Nhập ghi chú kỹ thuật..."
                value={note} onChange={e => setNote(e.target.value)}
                style={{ ...whiteInputStyle, resize: 'none' }}
              />
            </div>

            {/* ROW 6: Action Buttons */}
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

export default AddComponentModal;
