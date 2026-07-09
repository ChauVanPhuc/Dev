import React, { useState } from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const MB81_StaffEvaluationMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const [selectedGrade, setSelectedGrade] = useState('A');
  const [comments, setComments] = useState('');

  const getCompDesc = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.description : '';
  };

  const getCompType = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.type : 'UI Component';
  };

  const kpiRows = [
    { metric: 'Hiệu suất cưa xẻ gỗ thô', target: '95%', actual: '97%', status: 'Đạt' },
    { metric: 'Tỷ lệ gỗ hỏng hao hụt', target: '≤ 3%', actual: '2.1%', status: 'Đạt' },
    { metric: 'An toàn lao động & vệ sinh', target: '100%', actual: '100%', status: 'Đạt' },
    { metric: 'Chấp hành giờ giấc ca làm', target: '100%', actual: '98%', status: 'Cảnh báo' }
  ];

  return (
    <div className="mock-mobile-container scrollable-mobile">
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#FAF8F5', display: 'flex', flexDirection: 'column' }}>
        <div className="mobile-header-real">
          <div className="real-header-left">
            <span className="back-arrow" style={{ marginRight: 8, cursor: 'pointer' }}>◀</span>
            <div className="real-title-group">
              <span className="real-title-main">Đánh giá nhân viên</span>
              <span className="real-title-sub">MB8.1 | Báo cáo đánh giá</span>
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
        {/* Staff Profile Summary inside mockup */}
        <div style={{ background: '#7B5233', color: '#FFF', padding: 10, borderRadius: 8 }}>
          <span style={{ fontSize: '0.65rem', color: '#EADCC9', display: 'block' }}>NHÂN VIÊN ĐƯỢC ĐÁNH GIÁ</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Trần Văn Tèo - NV0922</span>
          <span style={{ fontSize: '0.7rem', display: 'block', color: '#EADCC9', marginTop: 2 }}>Tổ Cưa Xẻ 2 | Chức danh: Công nhân</span>
        </div>

        {/* StaffKPITable */}
        <InteractiveBlock
          name="StaffKPITable"
          type={getCompType('StaffKPITable')}
          description={getCompDesc('StaffKPITable')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ background: '#FFF', padding: 8, borderRadius: 8, border: '1px solid #EADCC9' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: 6 }}>
              KẾT QUẢ ĐO LƯỜNG KPI THÁNG
            </span>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.68rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F5EBE0', color: '#7B5233' }}>
                  <th style={{ padding: 4 }}>Chỉ tiêu</th>
                  <th style={{ padding: 4 }}>Mục tiêu</th>
                  <th style={{ padding: 4 }}>Thực tế</th>
                  <th style={{ padding: 4 }}>Đánh giá</th>
                </tr>
              </thead>
              <tbody>
                {kpiRows.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #EADCC9' }}>
                    <td style={{ padding: '6px 4px', fontWeight: 600, color: '#2D1A12' }}>{row.metric}</td>
                    <td style={{ padding: '6px 4px' }}>{row.target}</td>
                    <td style={{ padding: '6px 4px', fontWeight: 'bold', color: '#7B5233' }}>{row.actual}</td>
                    <td style={{ padding: '6px 4px' }}>
                      <span style={{
                        padding: '1px 4px',
                        borderRadius: 3,
                        fontSize: '0.6rem',
                        fontWeight: 'bold',
                        background: row.status === 'Đạt' ? '#E8F5E9' : '#FFF3E0',
                        color: row.status === 'Đạt' ? '#2E7D32' : '#E65100'
                      }}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InteractiveBlock>

        {/* StaffEvaluationForm */}
        <InteractiveBlock
          name="StaffEvaluationForm"
          type={getCompType('StaffEvaluationForm')}
          description={getCompDesc('StaffEvaluationForm')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={onClick}
        >
          <div style={{ background: '#FFF', padding: 10, borderRadius: 8, border: '1px solid #EADCC9', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233' }}>
              Ý KIẾN XẾP LOẠI CỦA TỔ TRƯỞNG
            </span>
            
            {/* Grade Selection */}
            <div>
              <span style={{ fontSize: '0.68rem', display: 'block', marginBottom: 4, color: '#7B5233', fontWeight: 600 }}>Chọn Xếp loại:</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {['A', 'B', 'C', 'D'].map(grade => (
                  <button
                    key={grade}
                    onClick={() => setSelectedGrade(grade)}
                    style={{
                      flex: 1,
                      padding: 6,
                      borderRadius: 4,
                      border: '1px solid #7B5233',
                      background: selectedGrade === grade ? '#7B5233' : '#FFF',
                      color: selectedGrade === grade ? '#FFF' : '#7B5233',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    Hạng {grade}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment Text Area */}
            <div>
              <span style={{ fontSize: '0.68rem', display: 'block', marginBottom: 4, color: '#7B5233', fontWeight: 600 }}>Nhận xét chi tiết:</span>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Nhập ý kiến đánh giá về thái độ và chuyên môn..."
                style={{
                  width: '100%',
                  height: 60,
                  padding: 6,
                  borderRadius: 6,
                  border: '1px solid #EADCC9',
                  fontSize: '0.72rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </InteractiveBlock>

        {/* StaffEvaluationService */}
        <InteractiveBlock
          name="StaffEvaluationService"
          type={getCompType('StaffEvaluationService')}
          description={getCompDesc('StaffEvaluationService')}
          activeComponent={activeComponent}
          hoveredComponent={hoveredComponent}
          onHover={onHover}
          onClick={(name) => {
            onClick(name);
            alert(`Gửi đánh giá thành công! X xếp loại Trần Văn Tèo đạt hạng ${selectedGrade}.`);
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
            🚀 GỬI BÁO CÁO ĐÁNH GIÁ NHÂN SỰ
          </button>
        </InteractiveBlock>
      </div>
    </div>
  );
};

export default MB81_StaffEvaluationMock;
