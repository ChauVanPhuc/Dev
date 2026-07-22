import React from 'react';

const SimulatorPane = ({
  screen,
  isMockupExpanded,
  setIsMockupExpanded,
  handlePasteMockupFromClipboard,
  handlePasteMockup,
  getImageUrl,
  setShowZoomModal,
  currentMockupIdx,
  setCurrentMockupIdx,
  handleDeleteMockup
}) => {
  return (
    <div className="card mockup-carousel-card" style={{
      background: '#fff',
      border: '1px solid #D1D5DB',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      minHeight: isMockupExpanded ? '600px' : '340px',
      transition: 'all 0.3s ease-in-out'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #CBD5E1', paddingBottom: '10px', marginBottom: '12px' }}>
        <span
          onClick={() => setIsMockupExpanded(!isMockupExpanded)}
          style={{
            fontSize: '1.25rem',
            color: '#7B5233',
            cursor: 'pointer',
            fontWeight: 'bold',
            padding: '4px 10px',
            borderRadius: '6px',
            backgroundColor: isMockupExpanded ? '#FAF6F0' : 'transparent',
            transition: 'all 0.2s',
            userSelect: 'none'
          }}
          title={isMockupExpanded ? "Thu nhỏ bản vẽ" : "Phóng to bản vẽ"}
        >
          ☰
        </span>
        <button
          type="button"
          onClick={handlePasteMockupFromClipboard}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', fontSize: '0.74rem', borderRadius: '6px', backgroundColor: '#7B5233', color: '#fff', fontWeight: 'bold', cursor: 'pointer', margin: 0, border: 'none' }}
        >
          + Dán ảnh
        </button>
      </div>

      <div
        onPaste={handlePasteMockup}
        tabIndex={0}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F8FAFC',
          borderRadius: '8px',
          minHeight: isMockupExpanded ? '520px' : '240px',
          overflow: 'hidden',
          border: '1px solid #CBD5E1',
          transition: 'all 0.3s ease-in-out',
          outline: 'none'
        }}
      >
        {screen.mockup_path ? (
          (() => {
            const mockups = screen.mockup_path.split(',').filter(Boolean);
            return (
              <img
                src={getImageUrl(mockups[currentMockupIdx])}
                alt="Mockup design"
                onClick={() => setShowZoomModal(true)}
                style={{
                  maxWidth: '100%',
                  maxHeight: isMockupExpanded ? '520px' : '250px',
                  objectFit: 'contain',
                  cursor: 'zoom-in',
                  transition: 'all 0.3s ease-in-out'
                }}
              />
            );
          })()
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#94A3B8' }}>
            <span style={{ fontSize: '3rem' }}>🖼️</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 'bold' }}>Chưa có hình ảnh bản vẽ thực tế (Nhấn nút + Dán ảnh hoặc Ctrl+V để dán ảnh)</span>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {screen.mockup_path && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #CBD5E1', paddingTop: '10px', marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              disabled={currentMockupIdx === 0}
              onClick={() => setCurrentMockupIdx(prev => prev - 1)}
              style={{ padding: '3px 8px', border: '1px solid #E2E8F0', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}
            >
              &lt;
            </button>
            {(() => {
              const mockups = screen.mockup_path.split(',').filter(Boolean);
              return mockups.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentMockupIdx(i)}
                  style={{
                    padding: '3px 7px',
                    border: '1px solid',
                    borderColor: currentMockupIdx === i ? '#7B5233' : '#E2E8F0',
                    background: currentMockupIdx === i ? '#7B5233' : '#fff',
                    color: currentMockupIdx === i ? '#fff' : '#334155',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {i + 1}
                </button>
              ));
            })()}
            <button
              type="button"
              disabled={(() => {
                const mockups = screen.mockup_path.split(',').filter(Boolean);
                return currentMockupIdx === mockups.length - 1;
              })()}
              onClick={() => setCurrentMockupIdx(prev => prev + 1)}
              style={{ padding: '3px 8px', border: '1px solid #E2E8F0', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}
            >
              &gt;
            </button>
          </div>
          <button
            type="button"
            onClick={handleDeleteMockup}
            style={{ background: 'transparent', border: 'none', color: '#EF4444', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Xóa ảnh
          </button>
        </div>
      )}
    </div>
  );
};

export default SimulatorPane;
