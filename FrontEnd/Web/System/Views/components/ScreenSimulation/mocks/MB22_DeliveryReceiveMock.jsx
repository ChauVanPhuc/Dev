import React, { useState } from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const MB22_DeliveryReceiveMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const [scanned, setScanned] = useState(false);
  const [quantity, setQuantity] = useState(48);
  const [checklist, setChecklist] = useState({
    congVenh: 'Đạt',
    nutTet: 'Đạt',
    doAm: 'Đạt',
    veSinh: 'Đạt',
    kichThuoc: 'Đạt',
    trayXuoc: 'Đạt',
    mauSac: 'Đạt',
    bienDang: 'Đạt'
  });
  const [showQCPopup, setShowQCPopup] = useState(false);
  const [qcSaved, setQcSaved] = useState(false);
  const [returned, setReturned] = useState(false);

  const getCompDesc = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.description : '';
  };

  const getCompType = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.type : 'UI Component';
  };

  const toggleCheck = (key) => {
    setChecklist(prev => ({
      ...prev,
      [key]: prev[key] === 'Đạt' ? 'Lỗi' : 'Đạt'
    }));
  };

  return (
    <div className="mock-mobile-container scrollable-mobile">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#FAF8F5', display: 'flex', flexDirection: 'column' }}>
        <div className="mobile-header-real">
          <div className="real-header-left">
            <span className="back-arrow" style={{ marginRight: 8, cursor: 'pointer' }}>◀</span>
            <div className="real-title-group">
              <span className="real-title-main">Xác nhận nhận hàng</span>
              <span className="real-title-sub">MB2.2 | Nhận hàng & QC</span>
            </div>
          </div>
          
          <div className="real-header-right">
            <InteractiveBlock
              name="UserGuideButton"
              type={getCompType('UserGuideButton')}
              description={getCompDesc('UserGuideButton')}
              activeComponent={activeComponent}
              hoveredComponent={hoveredComponent}
              onHover={onHover}
              onClick={onClick}
            >
              <span className="header-icon">❓</span>
            </InteractiveBlock>

            <InteractiveBlock
              name="NotificationBell"
              type={getCompType('NotificationBell')}
              description={getCompDesc('NotificationBell')}
              activeComponent={activeComponent}
              hoveredComponent={hoveredComponent}
              onHover={onHover}
              onClick={onClick}
            >
              <span className="header-icon">🔔</span>
            </InteractiveBlock>
          </div>
        </div>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Native QR Scanner Trigger */}
        <InteractiveBlock
          name="QRScannerNative"
          type={getCompType('QRScannerNative')}
          description={getCompDesc('QRScannerNative')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={(name) => {
            onClick(name);
            setScanned(true);
          }}
        >
          <div style={{
            background: scanned ? '#E8F5E9' : '#F5EBE0',
            border: '2px dashed #7B5233',
            borderRadius: 8,
            padding: '20px 10px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}>
            <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: 4 }}>📷</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#7B5233' }}>
              {scanned ? '✓ QUÉT THÀNH CÔNG: PALLET-0912' : '[QUÉT MÃ QR PALLET GIAO]'}
            </span>
          </div>
        </InteractiveBlock>

        {scanned && (
          <>
            {/* PalletInfoCard */}
            <InteractiveBlock
              name="PalletInfoCard"
              type={getCompType('PalletInfoCard')}
              description={getCompDesc('PalletInfoCard')}
              activeComponent={activeComponent}
              hoveredComponent={hoveredComponent}
              onHover={onHover}
              onClick={onClick}
            >
              <div className="mock-delivery-card" style={{ margin: 0, border: '1px solid #7B5233' }}>
                <div className="card-top-row">
                  <span className="delivery-id font-mono">PALLET-0912</span>
                  <span className="status-badge badge-pending">Chờ kiểm nhận</span>
                </div>
                <div className="card-info-grid">
                  <div className="info-item">
                    <span className="info-lbl">Chi tiết:</span>
                    <span className="info-val">Ván hông tủ bếp G7</span>
                  </div>
                  <div className="info-item">
                    <span className="info-lbl">Nơi xuất:</span>
                    <span className="info-val">Tổ Cưa Xẻ</span>
                  </div>
                  <div className="info-item">
                    <span className="info-lbl">Nơi nhận:</span>
                    <span className="info-val">Tổ Chà Nhám</span>
                  </div>
                  <div className="info-item">
                    <span className="info-lbl">Số lượng giao:</span>
                    <span className="info-val" style={{ fontWeight: 'bold', color: '#7B5233' }}>50 cái</span>
                  </div>
                </div>
              </div>
            </InteractiveBlock>

            {/* QuantityConfirmInput */}
            <InteractiveBlock
              name="QuantityConfirmInput"
              type={getCompType('QuantityConfirmInput')}
              description={getCompDesc('QuantityConfirmInput')}
              activeComponent={activeComponent}
              hoveredComponent={hoveredComponent}
              onHover={onHover}
              onClick={onClick}
            >
              <div style={{ background: '#FFF', padding: 10, borderRadius: 8, border: '1px solid #EADCC9' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: 6 }}>
                  SỐ LƯỢNG THỰC TẾ NHẬN
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => setQuantity(q => Math.max(0, q - 1))} style={{ padding: '6px 12px', border: '1px solid #7B5233', borderRadius: 4, background: '#FFF', fontWeight: 'bold', color: '#7B5233' }}>-</button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.min(50, parseInt(e.target.value) || 0))}
                    style={{ flex: 1, textAlign: 'center', padding: 6, border: '1px solid #EADCC9', borderRadius: 4, fontSize: '0.9rem', fontWeight: 'bold', color: '#7B5233' }}
                  />
                  <button onClick={() => setQuantity(q => Math.min(50, q + 1))} style={{ padding: '6px 12px', border: '1px solid #7B5233', borderRadius: 4, background: '#FFF', fontWeight: 'bold', color: '#7B5233' }}>+</button>
                </div>
                {quantity < 50 && (
                  <span style={{ fontSize: '0.65rem', color: '#C62828', display: 'block', marginTop: 4 }}>
                    ⚠️ Phát hiện hao hụt ({50 - quantity} cái so với phiếu giao).
                  </span>
                )}
              </div>
            </InteractiveBlock>

            {/* QualityChecklist */}
            <InteractiveBlock
              name="QualityChecklist"
              type={getCompType('QualityChecklist')}
              description={getCompDesc('QualityChecklist')}
              activeComponent={activeComponent}
              hoveredComponent={hoveredComponent}
              onHover={onHover}
              onClick={onClick}
            >
              <div style={{ background: '#FFF', padding: 10, borderRadius: 8, border: '1px solid #EADCC9' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: 8 }}>
                  CHECKLIST CHẤT LƯỢNG (8 TIÊU CHÍ QC)
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {Object.keys(checklist).map(key => (
                    <div
                      key={key}
                      onClick={() => toggleCheck(key)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 6,
                        border: '1px solid #EADCC9',
                        background: checklist[key] === 'Đạt' ? '#E8F5E9' : '#FFEBEE',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', color: '#2D1A12', fontWeight: 600 }}>
                        {key === 'congVenh' ? 'Cong vênh' :
                         key === 'nutTet' ? 'Nứt tét' :
                         key === 'doAm' ? 'Độ ẩm' :
                         key === 'veSinh' ? 'Vệ sinh' :
                         key === 'kichThuoc' ? 'Kích thước' :
                         key === 'trayXuoc' ? 'Trầy xước' :
                         key === 'mauSac' ? 'Màu sắc' : 'Biến dạng'}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 'bold',
                        color: checklist[key] === 'Đạt' ? '#2E7D32' : '#C62828'
                      }}>
                        {checklist[key]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </InteractiveBlock>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <InteractiveBlock
                name="ConfirmReceiveButton"
                type={getCompType('ConfirmReceiveButton')}
                description={getCompDesc('ConfirmReceiveButton')}
                activeComponent={activeComponent}
                hoveredComponent={hoveredComponent}
                onHover={onHover}
                onClick={(name) => {
                  onClick(name);
                  alert('Xác nhận nhận thành công! Đã gửi trạng thái sang QC.');
                }}
              >
                <button style={{
                  width: '100%',
                  padding: '10px',
                  background: '#7B5233',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}>
                  🤝 TỔ TRƯỞNG XÁC NHẬN NHẬN
                </button>
              </InteractiveBlock>

              <div style={{ display: 'flex', gap: 8 }}>
                <InteractiveBlock
                  name="SaveQCButton"
                  type={getCompType('SaveQCButton')}
                  description={getCompDesc('SaveQCButton')}
                  activeComponent={activeComponent}
                  hoveredComponent={hoveredComponent}
                  onHover={onHover}
                  onClick={(name) => {
                    onClick(name);
                    setQcSaved(true);
                    alert('Lưu kết quả QC thành công! Pallet đã hoàn thành.');
                  }}
                  style={{ flex: 1 }}
                >
                  <button style={{
                    width: '100%',
                    padding: '8px',
                    background: '#C5B5AD',
                    color: '#7B5233',
                    border: '1px solid #7B5233',
                    borderRadius: 6,
                    fontWeight: 'bold',
                    fontSize: '0.72rem',
                    cursor: 'pointer'
                  }}>
                    💾 LƯU KẾT QUẢ QC
                  </button>
                </InteractiveBlock>

                <InteractiveBlock
                  name="CreateReturnSlipButton"
                  type={getCompType('CreateReturnSlipButton')}
                  description={getCompDesc('CreateReturnSlipButton')}
                  activeComponent={activeComponent}
                  hoveredComponent={hoveredComponent}
                  onHover={onHover}
                  onClick={(name) => {
                    onClick(name);
                    setReturned(true);
                    alert('Đã lập phiếu trả hàng lỗi!');
                  }}
                  style={{ flex: 1 }}
                >
                  <button style={{
                    width: '100%',
                    padding: '8px',
                    background: returned ? '#FFEBEE' : '#FFF',
                    color: '#C62828',
                    border: '1px solid #C62828',
                    borderRadius: 6,
                    fontWeight: 'bold',
                    fontSize: '0.72rem',
                    cursor: 'pointer'
                  }}>
                    ↩️ TRẢ HÀNG LỖI
                  </button>
                </InteractiveBlock>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MB22_DeliveryReceiveMock;
