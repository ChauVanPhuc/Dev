import React, { useState } from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const MB15_CapaDetailMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const [feedback, setFeedback] = useState('');
  const [feedbacksList, setFeedbacksList] = useState([
    { author: 'Trần Thế Minh (MGR)', content: 'Yêu cầu kiểm tra thêm ổ bi dự phòng trong kho.', time: '31/05/2026 14:00' },
    { author: 'Lê Thế Hoàng (QC)', content: 'Đã hoàn tất thay thế và căn chỉnh máy, chạy thử đạt chuẩn.', time: '31/05/2026 16:30' }
  ]);

  const getCompDesc = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.description : '';
  };

  const getCompType = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.type : 'UI Component';
  };

  const addFeedback = () => {
    if (!feedback.trim()) return;
    setFeedbacksList(prev => [
      ...prev,
      { author: 'Tôi (QC)', content: feedback, time: 'Vừa xong' }
    ]);
    setFeedback('');
  };

  return (
    <div className="mock-mobile-container scrollable-mobile">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#FAF8F5', display: 'flex', flexDirection: 'column' }}>
        <div className="mobile-header-real">
          <div className="real-header-left">
            <span className="back-arrow" style={{ marginRight: 8, cursor: 'pointer' }}>◀</span>
            <div className="real-title-group">
              <span className="real-title-main">Chi tiết CAPA</span>
              <span className="real-title-sub">MB15 | Tiến trình khắc phục sự cố</span>
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
        {/* CAPADetail */}
        <InteractiveBlock
          name="CAPADetail"
          type={getCompType('CAPADetail')}
          description={getCompDesc('CAPADetail')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ background: '#FFF', padding: 10, borderRadius: 8, border: '1px solid #EADCC9', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', fontFamily: 'monospace' }}>CAPA-2026-001</span>
              <span style={{ fontSize: '0.62rem', background: '#FFF3E0', color: '#EF6C00', padding: '2px 6px', borderRadius: 4, fontWeight: 'bold' }}>Đang xử lý</span>
            </div>

            <h4 style={{ margin: '2px 0', fontSize: '0.82rem', color: '#2D1A12' }}>Khắc phục nứt ván hông gỗ Sồi</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.68rem', color: '#7B5233', borderTop: '1px solid #F5EBE0', paddingTop: 6, marginTop: 4 }}>
              <span><b>Mức độ khẩn:</b> <span style={{ color: '#C62828', fontWeight: 'bold' }}>Cao</span></span>
              <span><b>Bộ phận phụ trách:</b> Tổ Cưa Xẻ 2</span>
              <span><b>Người chỉ định:</b> Nguyễn Văn A (MGR)</span>
              <span><b>Thời hạn hoàn thành:</b> 05/06/2026</span>
            </div>
            
            <div style={{ background: '#FAF6F0', padding: 8, borderRadius: 6, fontSize: '0.68rem', color: '#2D1A12', marginTop: 4 }}>
              <b>Nguyên nhân cốt lõi:</b> Lực kẹp của gá đỡ cưa quá lớn làm gỗ sồi thô nứt thớ.<br/>
              <b>Hành động yêu cầu:</b> Giảm lực kẹp thủy lực xuống 2.5 bar, điều chỉnh cự ly gá kẹp từ 100mm lên 120mm.
            </div>
          </div>
        </InteractiveBlock>

        {/* CAPAHistory */}
        <InteractiveBlock
          name="CAPAHistory"
          type={getCompType('CAPAHistory')}
          description={getCompDesc('CAPAHistory')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ background: '#FFF', padding: 10, borderRadius: 8, border: '1px solid #EADCC9', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233' }}>
              Ý KIẾN PHẢN HỒI VÀ LỊCH SỬ DUYỆT
            </span>

            {/* List of comments */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {feedbacksList.map((f, idx) => (
                <div key={idx} style={{ borderBottom: idx < feedbacksList.length - 1 ? '1px solid #F5EBE0' : 'none', paddingBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#C5B5AD', marginBottom: 2 }}>
                    <span style={{ fontWeight: 'bold', color: '#7B5233' }}>{f.author}</span>
                    <span>{f.time}</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#2D1A12' }}>{f.content}</span>
                </div>
              ))}
            </div>

            {/* Input field */}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <input
                type="text"
                placeholder="Nhập ý kiến hoặc cập nhật tiến độ..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                style={{ flex: 1, padding: '6px 8px', border: '1px solid #EADCC9', borderRadius: 4, fontSize: '0.7rem' }}
              />
              <button
                onClick={addFeedback}
                style={{
                  padding: '6px 12px',
                  background: '#7B5233',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Gửi
              </button>
            </div>
          </div>
        </InteractiveBlock>
      </div>
    </div>
  );
};

export default MB15_CapaDetailMock;
