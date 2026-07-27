import React, { useState } from 'react';
import { X, FileText, Layers } from 'lucide-react';
import api from '@webShared/Services/api.service';

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1.5px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '0.84rem',
  fontWeight: '600',
  outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  backgroundColor: '#fff',
  color: '#1e293b',
  boxSizing: 'border-box',
};

const inputFocusStyle = {
  borderColor: '#432818',
  boxShadow: '0 0 0 3px rgba(67, 40, 24, 0.08)',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: '700',
  color: '#475569',
  marginBottom: '5px',
};

const sectionTitleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '0.82rem',
  fontWeight: '800',
  color: '#432818',
  marginBottom: '10px',
  paddingBottom: '6px',
  borderBottom: '1px solid #f1f5f9',
};

const FocusInput = ({ style, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{ ...inputStyle, ...style, ...(focused ? inputFocusStyle : {}) }}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
    />
  );
};

const FocusSelect = ({ style, children, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      style={{ ...inputStyle, ...style, ...(focused ? inputFocusStyle : {}) }}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
    >
      {children}
    </select>
  );
};

const AddDetailModal = ({ productId, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('Cái');
  const [inputStage, setInputStage] = useState('Định hình');
  const [outputStage, setOutputStage] = useState('Lắp ráp');
  const [sku, setSku] = useState('');
  const [material, setMaterial] = useState('Gỗ tự nhiên');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setLoading(true);
      await api.post(`/master-products/${productId}/bom-details`, {
        name,
        sku: sku || `PART-${Date.now().toString().slice(-4)}`,
        quantity: parseFloat(quantity),
        unit,
        input_stage: inputStage,
        output_stage: outputStage,
        material
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Lỗi khi thêm chi tiết BOM:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.45)',
      backdropFilter: 'blur(4px)',
      zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #432818 0%, #5a3a28 100%)',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#fff', margin: 0 }}>
                KTO3.1: Thêm chi tiết
              </h3>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
                Thêm chi tiết mới vào cấu trúc BOM
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              cursor: 'pointer',
              color: '#fff',
              borderRadius: '8px',
              width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px' }}>

          {/* Section 1 */}
          <div style={{ marginBottom: '18px' }}>
            <div style={sectionTitleStyle}>
              <Layers size={14} color="#432818" />
              Thông tin cơ bản
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Tên chi tiết <span style={{ color: '#dc2626' }}>*</span></label>
                <FocusInput
                  type="text" required placeholder="Nhập tên chi tiết"
                  value={name} onChange={e => setName(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Số lượng <span style={{ color: '#dc2626' }}>*</span></label>
                <FocusInput
                  type="number" required min="1" step="any"
                  value={quantity} onChange={e => setQuantity(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Đơn vị <span style={{ color: '#dc2626' }}>*</span></label>
                <FocusSelect value={unit} onChange={e => setUnit(e.target.value)}>
                  <option value="Cái">Cái</option>
                  <option value="Tấm">Tấm</option>
                  <option value="Thanh">Thanh</option>
                  <option value="Bộ">Bộ</option>
                  <option value="m2">m²</option>
                  <option value="m3">m³</option>
                </FocusSelect>
              </div>
            </div>
          </div>

          {/* Section 2: Công đoạn */}
          <div style={{ marginBottom: '18px' }}>
            <div style={sectionTitleStyle}>
              <Layers size={14} color="#432818" />
              Công đoạn sản xuất
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: '8px', alignItems: 'end' }}>
              <div>
                <label style={labelStyle}>Công đoạn giao <span style={{ color: '#dc2626' }}>*</span></label>
                <FocusSelect value={inputStage} onChange={e => setInputStage(e.target.value)}>
                  <option value="Tạo phôi">Tạo phôi</option>
                  <option value="Định hình">Định hình</option>
                  <option value="Lắp ráp">Lắp ráp</option>
                  <option value="Sơn">Sơn</option>
                  <option value="Đóng gói">Đóng gói</option>
                  <option value="Lưu kho">Lưu kho</option>
                </FocusSelect>
              </div>
              <div style={{ textAlign: 'center', paddingBottom: '10px' }}>
                <span style={{ fontSize: '1.1rem', color: '#94a3b8', fontWeight: '900' }}>➔</span>
              </div>
              <div>
                <label style={labelStyle}>Công đoạn nhận <span style={{ color: '#dc2626' }}>*</span></label>
                <FocusSelect value={outputStage} onChange={e => setOutputStage(e.target.value)}>
                  <option value="Tạo phôi">Tạo phôi</option>
                  <option value="Định hình">Định hình</option>
                  <option value="Lắp ráp">Lắp ráp</option>
                  <option value="Sơn">Sơn</option>
                  <option value="Đóng gói">Đóng gói</option>
                  <option value="Lưu kho">Lưu kho</option>
                </FocusSelect>
              </div>
            </div>
          </div>

          {/* Section 3: Mã & Vật liệu */}
          <div style={{ marginBottom: '20px' }}>
            <div style={sectionTitleStyle}>
              <Layers size={14} color="#432818" />
              Mã & Vật liệu
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Mã thành phần</label>
                <FocusInput
                  type="text" placeholder="VD: A009.01.1 (tự sinh nếu bỏ trống)"
                  value={sku} onChange={e => setSku(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Vật liệu <span style={{ color: '#dc2626' }}>*</span></label>
                <FocusInput
                  type="text" required placeholder="Gỗ sồi, MDF..."
                  value={material} onChange={e => setMaterial(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9',
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: '1.5px solid #cbd5e1',
                background: '#fff',
                padding: '10px 22px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.84rem',
                cursor: 'pointer',
                color: '#475569',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                border: 'none',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #432818 0%, #5a3a28 100%)',
                color: '#fff',
                padding: '10px 28px',
                borderRadius: '10px',
                fontWeight: '800',
                fontSize: '0.84rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 6px rgba(67, 40, 24, 0.25)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 6px 12px rgba(67, 40, 24, 0.35)'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.boxShadow = '0 4px 6px rgba(67, 40, 24, 0.25)'; }}
            >
              {loading ? 'Đang lưu...' : '✓ Xác nhận thêm'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AddDetailModal;
