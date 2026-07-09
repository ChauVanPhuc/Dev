import React from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const MB21_DeliveryCreateMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const getCompDesc = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.description : '';
  };

  const getCompType = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.type : 'UI Component';
  };

  return (
    <div className="mock-mobile-container scrollable-mobile">
      {/* Header */}
      <div className="mobile-header-bar">
        <span className="back-arrow-icon">←</span>
        <span className="mobile-header-title">Tạo Phiếu Bàn Giao</span>
        <span></span>
      </div>

      {/* Form content */}
      <div className="mobile-form-content">
        
        {/* Kế hoạch info */}
        <div className="form-info-banner">
          <span className="banner-title">Kế hoạch sản xuất hiện hành</span>
          <span className="banner-val font-mono">PO-2026-004 - Bàn trà gỗ Sồi</span>
        </div>

        {/* 1. PartSelector */}
        <div className="mobile-field-group">
          <label className="mobile-field-label">Linh kiện bàn giao</label>
          <InteractiveBlock
            name="PartSelector"
            type={getCompType('PartSelector')}
            description={getCompDesc('PartSelector')}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          >
            <div className="mock-mobile-dropdown">
              <span>Mặt bàn trà G7 (Mã: BOM-MB-02)</span>
              <span className="dropdown-arrow">▼</span>
            </div>
          </InteractiveBlock>
        </div>

        {/* 2. MoistureInput */}
        <div className="mobile-field-group">
          <label className="mobile-field-label">Kiểm tra độ ẩm gỗ (Tiêu chuẩn &lt; 14%)</label>
          <InteractiveBlock
            name="MoistureInput"
            type={getCompType('MoistureInput')}
            description={getCompDesc('MoistureInput')}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          >
            <div className="mock-moisture-panel">
              <div className="moisture-inputs-row">
                <div className="m-input-box">
                  <span className="m-point">P1</span>
                  <span className="m-val">12.4%</span>
                </div>
                <div className="m-input-box">
                  <span className="m-point">P2</span>
                  <span className="m-val">12.8%</span>
                </div>
                <div className="m-input-box">
                  <span className="m-point">P3</span>
                  <span className="m-val">12.6%</span>
                </div>
              </div>
              <div className="moisture-result-row">
                <span>Độ ẩm trung bình:</span>
                <span className="moisture-avg-val text-green">12.6% (ĐẠT)</span>
              </div>
            </div>
          </InteractiveBlock>
        </div>

        {/* 3. CameraCapture */}
        <div className="mobile-field-group">
          <label className="mobile-field-label">Ảnh chụp minh chứng bàn giao</label>
          <InteractiveBlock
            name="CameraCapture"
            type={getCompType('CameraCapture')}
            description={getCompDesc('CameraCapture')}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          >
            <div className="mock-camera-capture">
              <div className="camera-preview-thumb">
                <span className="wood-icon">🪵</span>
                <span className="photo-tag">Photo_01.jpg</span>
              </div>
              <div className="camera-trigger-btn">
                <span>📸 Chụp lại hình ảnh</span>
              </div>
            </div>
          </InteractiveBlock>
        </div>

        {/* 4. SubmitDeliveryButton */}
        <div style={{ marginTop: 24, marginBottom: 12 }}>
          <InteractiveBlock
            name="SubmitDeliveryButton"
            type={getCompType('SubmitDeliveryButton')}
            description={getCompDesc('SubmitDeliveryButton')}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          >
            <div className="mock-mobile-btn-submit">
              Xác Nhận & Gửi Phiếu Giao
            </div>
          </InteractiveBlock>
        </div>

      </div>
    </div>
  );
};

export default MB21_DeliveryCreateMock;
