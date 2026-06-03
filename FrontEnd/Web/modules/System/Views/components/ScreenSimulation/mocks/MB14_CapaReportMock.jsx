import React, { useState } from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const MB14_CapaReportMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const [why1, setWhy1] = useState('');
  const [why2, setWhy2] = useState('');
  const [why3, setWhy3] = useState('');
  const [why4, setWhy4] = useState('');
  const [why5, setWhy5] = useState('');
  const [solution, setSolution] = useState('');

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
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#FAF8F5', display: 'flex', flexDirection: 'column' }}>
        <div className="mobile-header-real">
          <div className="real-header-left">
            <span className="back-arrow" style={{ marginRight: 8, cursor: 'pointer' }}>◀</span>
            <div className="real-title-group">
              <span className="real-title-main">Báo cáo CAPA</span>
              <span className="real-title-sub">MB14 | Phân tích 5-Why & Biện pháp</span>
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
        {/* Source Incident Card inside mockup */}
        <div style={{ background: '#7B5233', color: '#FFF', padding: 10, borderRadius: 8 }}>
          <span style={{ fontSize: '0.65rem', color: '#EADCC9', display: 'block' }}>NGUỒN GỐC SỰ CỐ QC</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 'bold' }}>Mẻ cạnh hàng loạt ván MFC - Lô hàng PO-2026-09</span>
          <span style={{ fontSize: '0.68rem', display: 'block', color: '#EADCC9', marginTop: 2 }}>Phát hiện tại: Tổ Dán Cạnh | Ngày: 31/05/2026</span>
        </div>

        {/* CAPAReportForm */}
        <InteractiveBlock
          name="CAPAReportForm"
          type={getCompType('CAPAReportForm')}
          description={getCompDesc('CAPAReportForm')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ background: '#FFF', padding: 10, borderRadius: 8, border: '1px solid #EADCC9', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233' }}>
              PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (5-WHY)
            </span>
            
            {/* Why 1 */}
            <div>
              <span style={{ fontSize: '0.68rem', color: '#7B5233', fontWeight: 600 }}>Why 1: Tại sao ván bị mẻ cạnh?</span>
              <input type="text" value={why1} onChange={(e) => setWhy1(e.target.value)} placeholder="Ví dụ: Do lưỡi cưa của máy dán cạnh bị rung lắc..." style={{ width: '100%', padding: 5, border: '1px solid #EADCC9', borderRadius: 4, fontSize: '0.72rem', boxSizing: 'border-box' }} />
            </div>

            {/* Why 2 */}
            <div>
              <span style={{ fontSize: '0.68rem', color: '#7B5233', fontWeight: 600 }}>Why 2: Tại sao lưỡi cưa bị rung lắc?</span>
              <input type="text" value={why2} onChange={(e) => setWhy2(e.target.value)} placeholder="Ví dụ: Do ổ bi kẹp trục cưa bị mòn và rơ..." style={{ width: '100%', padding: 5, border: '1px solid #EADCC9', borderRadius: 4, fontSize: '0.72rem', boxSizing: 'border-box' }} />
            </div>

            {/* Why 3 */}
            <div>
              <span style={{ fontSize: '0.68rem', color: '#7B5233', fontWeight: 600 }}>Why 3: Tại sao ổ bi bị mòn không phát hiện sớm?</span>
              <input type="text" value={why3} onChange={(e) => setWhy3(e.target.value)} placeholder="Ví dụ: Do không thực hiện tự kiểm tra thiết bị đầu ca..." style={{ width: '100%', padding: 5, border: '1px solid #EADCC9', borderRadius: 4, fontSize: '0.72rem', boxSizing: 'border-box' }} />
            </div>

            {/* Why 4 & 5 represented simply */}
            <span style={{ fontSize: '0.62rem', color: '#C5B5AD', fontStyle: 'italic' }}>* Điền thêm Why 4 & 5 nếu có để xác định nguyên nhân cốt lõi.</span>

            {/* Corrective Action */}
            <div style={{ marginTop: 4, borderTop: '1px solid #F5EBE0', paddingTop: 6 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: 4 }}>
                BIỆN PHÁP KHẮC PHỤC & PHÒNG NGỪA
              </span>
              <textarea
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                placeholder="Nhập hành động cụ thể để sửa chữa lỗi vĩnh viễn..."
                style={{ width: '100%', height: 45, padding: 5, border: '1px solid #EADCC9', borderRadius: 4, fontSize: '0.72rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </InteractiveBlock>

        {/* CapaSubmitButton */}
        <InteractiveBlock
          name="CapaSubmitButton"
          type={getCompType('CapaSubmitButton')}
          description={getCompDesc('CapaSubmitButton')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={(name) => {
            onClick(name);
            if (!why1 || !solution) {
              alert('Vui lòng nhập phân tích nguyên nhân và biện pháp khắc phục.');
              return;
            }
            alert('Đã gửi báo cáo phân tích CAPA lên máy chủ để duyệt.');
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
            🚀 PHÊ DUYỆT & GỬI BÁO CÁO CAPA
          </button>
        </InteractiveBlock>
      </div>
    </div>
  );
};

export default MB14_CapaReportMock;
