import React, { useState } from 'react';
import { X, Sliders, CheckSquare, Square, Save } from 'lucide-react';

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: '700',
  color: '#2D1A12',
  marginBottom: '6px',
};

const inputBaseStyle = {
  width: '100%',
  padding: '9px 12px',
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

const ConfigInfoModal = ({ visibleColumns, setVisibleColumns, onClose, toast }) => {
  const [cols, setCols] = useState(visibleColumns || {
    stt: true,
    type: true,
    stageFrom: true,
    stageTo: true,
    compCode: true,
    compName: true,
    quantity: true,
    unit: true,
    material: true,
    spec: true,
    volume: true,
    note: true,
    actions: true,
  });

  const columnLabels = [
    { key: 'stt', label: 'STT (Phân cấp)' },
    { key: 'type', label: 'Loại (Chi tiết / Khung / Cụm)' },
    { key: 'stageFrom', label: 'Công đoạn giao' },
    { key: 'stageTo', label: 'Công đoạn nhận' },
    { key: 'compCode', label: 'Mã thành phẩm' },
    { key: 'compName', label: 'Tên thành phẩm' },
    { key: 'quantity', label: 'Số lượng' },
    { key: 'unit', label: 'Đơn vị tính' },
    { key: 'material', label: 'Vật liệu' },
    { key: 'spec', label: 'Quy cách (mm)' },
    { key: 'volume', label: 'Khối lượng (m³)' },
    { key: 'note', label: 'Ghi chú kỹ thuật' },
    { key: 'actions', label: 'Thao tác' },
  ];

  const [defaultInputStage, setDefaultInputStage] = useState('Định hình');
  const [defaultOutputStage, setDefaultOutputStage] = useState('Lắp ráp');
  const [defaultUnit, setDefaultUnit] = useState('Cái');
  const [defaultMaterial, setDefaultMaterial] = useState('Gỗ / MDF');

  const toggleColumn = (key) => {
    setCols(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = () => {
    const allTrue = {};
    columnLabels.forEach(col => { allTrue[col.key] = true; });
    setCols(allTrue);
  };

  const handleDeselectAll = () => {
    const allFalse = {};
    columnLabels.forEach(col => { allFalse[col.key] = false; });
    // Always keep STT and compName visible
    allFalse.stt = true;
    allFalse.compName = true;
    setCols(allFalse);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (setVisibleColumns) {
      setVisibleColumns(cols);
    }
    if (toast) toast('success', 'Đã cập nhật cấu hình thông tin BOM thành công!');
    onClose();
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
        maxWidth: '620px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={22} color="#432818" />
            <h3 style={{ fontSize: '1.35rem', fontWeight: '900', color: '#2D1A12', margin: 0 }}>
              KT03.4: Cấu hình thông tin BOM
            </h3>
          </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Section 1: Cột hiển thị trên bảng BOM */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#432818' }}>
                  Hiển thị cột trên bảng BOM
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    style={{ border: 'none', background: 'none', color: '#2563EB', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Chọn tất cả
                  </button>
                  <span style={{ color: '#CBD5E1' }}>|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    style={{ border: 'none', background: 'none', color: '#64748B', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px 12px',
                padding: '12px 14px',
                backgroundColor: '#FAF6F0',
                borderRadius: '10px',
                border: '1.5px solid #EADCC9'
              }}>
                {columnLabels.map(col => (
                  <label
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      color: cols[col.key] ? '#2D1A12' : '#94A3B8',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    {cols[col.key] ? (
                      <CheckSquare size={17} color="#5D3B32" />
                    ) : (
                      <Square size={17} color="#CBD5E1" />
                    )}
                    {col.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Section 2: Giá trị mặc định khi tạo mới */}
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#432818', display: 'block', marginBottom: '10px' }}>
                Thiết lập quy trình & Giá trị mặc định
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Công đoạn giao mặc định</label>
                  <select value={defaultInputStage} onChange={e => setDefaultInputStage(e.target.value)} style={inputBaseStyle}>
                    <option value="Tạo phôi">Tạo phôi</option>
                    <option value="Định hình">Định hình</option>
                    <option value="Lắp ráp">Lắp ráp</option>
                    <option value="Sơn">Sơn</option>
                    <option value="Đóng gói">Đóng gói</option>
                    <option value="Lưu kho">Lưu kho</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Công đoạn nhận mặc định</label>
                  <select value={defaultOutputStage} onChange={e => setDefaultOutputStage(e.target.value)} style={inputBaseStyle}>
                    <option value="Tạo phôi">Tạo phôi</option>
                    <option value="Định hình">Định hình</option>
                    <option value="Lắp ráp">Lắp ráp</option>
                    <option value="Sơn">Sơn</option>
                    <option value="Đóng gói">Đóng gói</option>
                    <option value="Lưu kho">Lưu kho</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Đơn vị tính mặc định</label>
                  <select value={defaultUnit} onChange={e => setDefaultUnit(e.target.value)} style={inputBaseStyle}>
                    <option value="Cái">Cái</option>
                    <option value="Tấm">Tấm</option>
                    <option value="Bộ">Bộ</option>
                    <option value="m2">m²</option>
                    <option value="m3">m³</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Vật liệu mặc định</label>
                  <select value={defaultMaterial} onChange={e => setDefaultMaterial(e.target.value)} style={inputBaseStyle}>
                    <option value="Gỗ / MDF">Gỗ / MDF</option>
                    <option value="Gỗ Sồi">Gỗ Sồi</option>
                    <option value="MDF">MDF</option>
                    <option value="Ván ép">Ván ép</option>
                  </select>
                </div>
              </div>
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
                style={{
                  padding: '11px 32px',
                  backgroundColor: '#432818',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(67, 40, 24, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Save size={16} /> Xác nhận
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfigInfoModal;
