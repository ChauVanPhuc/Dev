import React, { useState } from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const MB5_DailyInspectionMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const [selectedDate, setSelectedDate] = useState('2026-06-01');
  const [activeTab, setActiveTab] = useState('ngoaiquan'); // 'ngoaiquan', 'ketcau', 'nguyenlieu'
  const [formData, setFormData] = useState({
    xuocBeMat: 2,
    nutDauGo: 5,
    doLechKichThuoc: 1,
    thieuGhim: 0,
    mocGo: 0
  });

  const [hotlist, setHotlist] = useState({
    xuocBeMat: true,
    nutDauGo: false,
    doLechKichThuoc: true,
    thieuGhim: false,
    mocGo: false
  });

  const getCompDesc = (name) => {
    const find = components.find(c => c.name === name);
    return find ? find.description : '';
  };

  const getCompType = (name) => {
    const find = components.find(c => c.name === name);
    return find ? find.type : 'UI Component';
  };

  const updateForm = (key, val) => {
    setFormData(prev => ({
      ...prev,
      [key]: Math.max(0, parseInt(val) || 0)
    }));
  };

  const toggleHotlist = (key) => {
    setHotlist(prev => ({
      ...prev,
      [key]: !prev[key]
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
              <span className="real-title-main">Kiểm tra hàng ngày</span>
              <span className="real-title-sub">MB5 | Nhật ký kiểm tra QC</span>
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

        {/* DateSelector */}
        <div style={{ padding: '8px 12px', background: '#F5EBE0', borderBottom: '1px solid #EADCC9' }}>
          <InteractiveBlock
            name="DateSelector"
            type={getCompType('DateSelector')}
            description={getCompDesc('DateSelector')}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          >
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid #7B5233',
                borderRadius: 6,
                fontSize: '0.8rem',
                color: '#7B5233',
                fontWeight: 'bold',
                background: '#FFF',
                textAlign: 'center'
              }}
            />
          </InteractiveBlock>
        </div>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Tab Selection inside mockup */}
        <div style={{ display: 'flex', background: '#EADCC9', padding: 2, borderRadius: 6 }}>
          <button onClick={() => setActiveTab('ngoaiquan')} style={{ flex: 1, padding: 6, border: 'none', background: activeTab === 'ngoaiquan' ? '#FFF' : 'transparent', color: '#7B5233', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: 4 }}>Ngoại quan</button>
          <button onClick={() => setActiveTab('ketcau')} style={{ flex: 1, padding: 6, border: 'none', background: activeTab === 'ketcau' ? '#FFF' : 'transparent', color: '#7B5233', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: 4 }}>Kết cấu</button>
          <button onClick={() => setActiveTab('nguyenlieu')} style={{ flex: 1, padding: 6, border: 'none', background: activeTab === 'nguyenlieu' ? '#FFF' : 'transparent', color: '#7B5233', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: 4 }}>Nguyên liệu</button>
        </div>

        {/* DailyInspectionForm */}
        <InteractiveBlock
          name="DailyInspectionForm"
          type={getCompType('DailyInspectionForm')}
          description={getCompDesc('DailyInspectionForm')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ background: '#FFF', padding: 10, borderRadius: 8, border: '1px solid #EADCC9', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeTab === 'ngoaiquan' && (
              <>
                {/* Row 1 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F5EBE0', paddingBottom: 6 }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', color: '#2D1A12' }}>Trầy xước bề mặt</span>
                    <span style={{ fontSize: '0.62rem', color: '#7B5233' }}>Dễ xuất hiện khi di chuyển chà nhám</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* HotlistToggle */}
                    <InteractiveBlock name="HotlistToggle" type={getCompType('HotlistToggle')} description={getCompDesc('HotlistToggle')} activeComponent={activeComponent} hoveredComponent={hoveredComponent} onHover={onHover} onClick={(n) => { onClick(n); toggleHotlist('xuocBeMat'); }}>
                      <button style={{ border: 'none', background: hotlist.xuocBeMat ? '#EF5350' : '#ECEFF1', color: hotlist.xuocBeMat ? '#FFF' : '#78909C', padding: '3px 6px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 'bold', cursor: 'pointer' }}>
                        🔥 {hotlist.xuocBeMat ? 'Đang hột' : 'Theo dõi'}
                      </button>
                    </InteractiveBlock>
                    <input type="number" value={formData.xuocBeMat} onChange={(e) => updateForm('xuocBeMat', e.target.value)} style={{ width: 50, textAlign: 'center', padding: 4, border: '1px solid #EADCC9', borderRadius: 4, fontSize: '0.75rem', fontWeight: 'bold' }} />
                  </div>
                </div>

                {/* Row 2 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F5EBE0', paddingBottom: 6 }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', color: '#2D1A12' }}>Nứt tét đầu gỗ</span>
                    <span style={{ fontSize: '0.62rem', color: '#7B5233' }}>Do sấy quá nhiệt hoặc gỗ thô kém chất lượng</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <InteractiveBlock name="HotlistToggle" type={getCompType('HotlistToggle')} description={getCompDesc('HotlistToggle')} activeComponent={activeComponent} hoveredComponent={hoveredComponent} onHover={onHover} onClick={(n) => { onClick(n); toggleHotlist('nutDauGo'); }}>
                      <button style={{ border: 'none', background: hotlist.nutDauGo ? '#EF5350' : '#ECEFF1', color: hotlist.nutDauGo ? '#FFF' : '#78909C', padding: '3px 6px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 'bold', cursor: 'pointer' }}>
                        🔥 {hotlist.nutDauGo ? 'Đang hột' : 'Theo dõi'}
                      </button>
                    </InteractiveBlock>
                    <input type="number" value={formData.nutDauGo} onChange={(e) => updateForm('nutDauGo', e.target.value)} style={{ width: 50, textAlign: 'center', padding: 4, border: '1px solid #EADCC9', borderRadius: 4, fontSize: '0.75rem', fontWeight: 'bold' }} />
                  </div>
                </div>

                {/* Row 3 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', color: '#2D1A12' }}>Mốc xanh đầu ván</span>
                    <span style={{ fontSize: '0.62rem', color: '#7B5233' }}>Độ ẩm kho bãi cao</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <InteractiveBlock name="HotlistToggle" type={getCompType('HotlistToggle')} description={getCompDesc('HotlistToggle')} activeComponent={activeComponent} hoveredComponent={hoveredComponent} onHover={onHover} onClick={(n) => { onClick(n); toggleHotlist('mocGo'); }}>
                      <button style={{ border: 'none', background: hotlist.mocGo ? '#EF5350' : '#ECEFF1', color: hotlist.mocGo ? '#FFF' : '#78909C', padding: '3px 6px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 'bold', cursor: 'pointer' }}>
                        🔥 {hotlist.mocGo ? 'Đang hột' : 'Theo dõi'}
                      </button>
                    </InteractiveBlock>
                    <input type="number" value={formData.mocGo} onChange={(e) => updateForm('mocGo', e.target.value)} style={{ width: 50, textAlign: 'center', padding: 4, border: '1px solid #EADCC9', borderRadius: 4, fontSize: '0.75rem', fontWeight: 'bold' }} />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'ketcau' && (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#7B5233', fontSize: '0.75rem', fontStyle: 'italic' }}>
                Ghi nhận các lỗi về Ghim, Mộng ghép, Biến dạng...
              </div>
            )}

            {activeTab === 'nguyenlieu' && (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#7B5233', fontSize: '0.75rem', fontStyle: 'italic' }}>
                Ghi nhận lỗi từ phía nhà cung cấp gỗ đầu vào...
              </div>
            )}
          </div>
        </InteractiveBlock>

        {/* DailyInspectionService */}
        <InteractiveBlock
          name="DailyInspectionService"
          type={getCompType('DailyInspectionService')}
          description={getCompDesc('DailyInspectionService')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={(name) => {
            onClick(name);
            alert('Lưu báo cáo lỗi kiểm QC hàng ngày thành công!');
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
            💾 LƯU PHIẾU KIỂM TRA HÀNG NGÀY
          </button>
        </InteractiveBlock>
      </div>
    </div>
  );
};

export default MB5_DailyInspectionMock;
