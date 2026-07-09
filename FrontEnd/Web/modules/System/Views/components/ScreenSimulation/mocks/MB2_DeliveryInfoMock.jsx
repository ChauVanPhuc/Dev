import React, { useState } from 'react';
import InteractiveBlock from '../InteractiveBlock';
import '../Simulation.css';

export const MB2_DeliveryInfoMock = ({
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  components = []
}) => {
  const [activeTab, setActiveTab] = useState('kehoach'); // 'kehoach' or 'bangiao'

  // Advanced filter states
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Chờ giao', 'Đã giao'
  const [qcOnly, setQcOnly] = useState(false);

  const getCompDesc = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.description : '';
  };

  const getCompType = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.type : 'UI Component';
  };

  const detailRows = [
    { name: 'Thanh ngang', qty: 0, kh: 28422, status: 'Chờ giao', qc: 'Đạt' },
    { name: 'Ván', qty: 120, kh: 320, status: 'Đã giao', qc: 'Đạt' },
    { name: 'Tấm đáy', qty: 0, kh: 16499, status: 'Chờ giao', qc: 'Đạt' },
    { name: 'Hậu hộc', qty: 240, kh: 240, status: 'Đã giao', qc: 'Đạt' },
    { name: 'Ván cửa (QC Lỗi)', qty: 0, kh: 18731, status: 'Chờ giao', qc: 'Lỗi' },
    { name: 'Tấm sau', qty: 0, kh: 16499, status: 'Chờ giao', qc: 'Đạt' },
    { name: 'Đáy hộc', qty: 24557, kh: 24557, status: 'Đã giao', qc: 'Đạt' },
  ];

  // Dynamic filter logic
  const filteredRows = detailRows.filter(row => {
    const matchesSearch = !searchQuery || row.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || row.status === statusFilter;
    const matchesQC = !qcOnly || row.qc === 'Đạt';
    return matchesSearch && matchesStatus && matchesQC;
  });

  return (
    <div className="mock-mobile-container scrollable-mobile">
      {/* Sticky Header Group for Mobile Simulation */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#FAF8F5', display: 'flex', flexDirection: 'column' }}>
        {/* 1. Header Bar thực tế */}
        <div className="mobile-header-real">
          <div className="real-header-left">
            <div className="real-avatar">👤</div>
            <div className="real-title-group">
              <span className="real-title-main">G7 - SmartFlow</span>
              <span className="real-title-sub">MB2 | Thông tin giao hàng</span>
            </div>
          </div>
          
          <div className="real-header-right">
            {/* UserGuideButton */}
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

            {/* NotificationBell */}
            <InteractiveBlock
              name="NotificationBell"
              type={getCompType('NotificationBell')}
              description={getCompDesc('NotificationBell')}
              activeComponent={activeComponent}
              hoveredComponent={hoveredComponent}
              onHover={onHover}
              onClick={onClick}
            >
              <span className="header-icon" style={{ position: 'relative' }}>
                🔔
                <span className="bell-badge-dot"></span>
              </span>
            </InteractiveBlock>
            
            {/* QRScannerNative */}
            <InteractiveBlock
              name="QRScannerNative"
              type={getCompType('QRScannerNative')}
              description={getCompDesc('QRScannerNative')}
              activeComponent={activeComponent}
              hoveredComponent={hoveredComponent}
              onHover={onHover}
              onClick={onClick}
            >
              <span className="header-icon">⛶</span>
            </InteractiveBlock>
          </div>
        </div>

        {/* 2. Subheader */}
        <div className="real-subheader">
          <h2 className="real-page-title">Kế hoạch bàn giao</h2>
          
          {/* QuickCreateButton */}
          <InteractiveBlock
            name="QuickCreateButton"
            type={getCompType('QuickCreateButton')}
            description={getCompDesc('QuickCreateButton')}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          >
            <button className="real-quick-btn">+ Tạo nhanh</button>
          </InteractiveBlock>
        </div>

        {/* 3. Tabs */}
        <div className="real-tabs">
          <div 
            className={`real-tab-item ${activeTab === 'kehoach' ? 'active' : ''}`}
            onClick={() => setActiveTab('kehoach')}
          >
            📋 Kế hoạch
          </div>
          <div 
            className={`real-tab-item ${activeTab === 'bangiao' ? 'active' : ''}`}
            onClick={() => setActiveTab('bangiao')}
          >
            🚚 Bàn giao {activeComponent === 'DeliveryOverviewCard' || hoveredComponent === 'DeliveryOverviewCard' ? <span className="tab-pulsing-dot"></span> : null}
          </div>
        </div>
      </div>

      {/* 4. Tab Contents */}
      {activeTab === 'kehoach' ? (
        <div className="tab-pane-content">
          {/* Filters Row */}
          <div className="real-filters-row">
            {/* PlanSelector */}
            <InteractiveBlock
              name="PlanSelector"
              type={getCompType('PlanSelector')}
              description={getCompDesc('PlanSelector')}
              activeComponent={activeComponent}
              hoveredComponent={hoveredComponent}
              onHover={onHover}
              onClick={onClick}
            >
              <div className="real-dropdown-select">
                <span>KHSX T5 - 2026</span>
                <span className="arrow-down">▼</span>
              </div>
            </InteractiveBlock>

            {/* PlanFilter (Funnel Outline) */}
            <InteractiveBlock
              name="PlanFilter"
              type={getCompType('PlanFilter')}
              description={getCompDesc('PlanFilter')}
              activeComponent={activeComponent}
              hoveredComponent={hoveredComponent}
              onHover={onHover}
              onClick={(name) => {
                onClick(name);
                setShowAdvancedFilter(!showAdvancedFilter);
              }}
            >
              <div className={`real-filter-icon ${showAdvancedFilter ? 'filter-active' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={showAdvancedFilter ? '#FAF6F0' : '#7B5233'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
              </div>
            </InteractiveBlock>

            {/* PlanSort */}
            <InteractiveBlock
              name="PlanSort"
              type={getCompType('PlanSort')}
              description={getCompDesc('PlanSort')}
              activeComponent={activeComponent}
              hoveredComponent={hoveredComponent}
              onHover={onHover}
              onClick={onClick}
            >
              <div className="real-filter-icon">⇅</div>
            </InteractiveBlock>
          </div>

          {/* Advanced Filter Slide-Down Panel */}
          {showAdvancedFilter && (
            <div className="advanced-filter-panel" style={{ padding: '8px 10px', gap: '6px', marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
              <div className="filter-group" style={{ gap: '2px' }}>
                <div className="filter-input-wrap">
                  <input 
                    type="text" 
                    placeholder="Nhập tên chi tiết..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mobile-search-field"
                    style={{ padding: '4px 24px 4px 8px', fontSize: '0.75rem', borderRadius: '5px' }}
                  />
                  {searchQuery && (
                    <button className="mobile-search-clear" style={{ fontSize: '0.8rem', right: '6px' }} onClick={() => setSearchQuery('')}>×</button>
                  )}
                </div>
                {/* Quick Filter Tags in mockup */}
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '2px' }}>
                  {['Thanh', 'Ngang', 'Đứng', 'Cửa', 'Ván'].map(tag => {
                    const isActive = searchQuery.toLowerCase().trim() === tag.toLowerCase();
                    return (
                      <button
                        key={tag}
                        onClick={() => setSearchQuery(isActive ? '' : tag)}
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          fontWeight: '700',
                          border: isActive ? 'none' : '1px solid #EADCC9',
                          backgroundColor: isActive ? '#7B5233' : '#FFF',
                          color: isActive ? '#FFF' : '#7B5233',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="filter-group" style={{ marginTop: '2px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div className="filter-pills-row" style={{ gap: '4px' }}>
                  {['All', 'Chờ giao', 'Đã giao'].map(p => (
                    <button 
                      key={p} 
                      className={`filter-pill-btn ${statusFilter === p ? 'active' : ''}`}
                      style={{ padding: '3px 8px', fontSize: '0.65rem', borderRadius: '10px' }}
                      onClick={() => setStatusFilter(p)}
                    >
                      {p === 'All' ? 'Tất cả' : p}
                    </button>
                  ))}
                </div>

                <div className="filter-group-checkbox" style={{ display: 'flex', alignItems: 'center' }}>
                  <label className="filter-checkbox-lbl" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={qcOnly}
                      onChange={(e) => setQcOnly(e.target.checked)}
                      style={{ transform: 'scale(0.85)' }}
                    />
                    <span style={{ fontSize: '0.68rem', color: '#7B5233', fontWeight: '700' }}>Chỉ gỗ QC đạt</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Accordion & Table */}
          {/* DetailAccordion */}
          <InteractiveBlock
            name="DetailAccordion"
            type={getCompType('DetailAccordion')}
            description={getCompDesc('DetailAccordion')}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          >
            <div className="real-accordion">
              <div className="real-accordion-header">
                <span className="accordion-title">CHI TIẾT ({filteredRows.length} mục)</span>
                <div className="accordion-right">
                  <span className="accordion-date-badge">31/5/2026</span>
                  <span className="accordion-arrow">▲</span>
                </div>
              </div>
              
              <div className="real-accordion-content">
                {/* PlanTable */}
                <InteractiveBlock
                  name="PlanTable"
                  type={getCompType('PlanTable')}
                  description={getCompDesc('PlanTable')}
                  activeComponent={activeComponent}
                  hoveredComponent={hoveredComponent}
                  onHover={onHover}
                  onClick={onClick}
                >
                  <table className="real-table-data">
                    <thead>
                      <tr>
                        <th>chi tiết</th>
                        <th>Số lượng</th>
                        <th>KT</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: '#7B5233', fontStyle: 'italic', fontSize: '0.8rem' }}>
                            Không tìm thấy kết quả lọc
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row, idx) => (
                          <tr key={idx}>
                            <td className="cell-detail-name">{row.name}</td>
                            <td className="cell-qty">
                              <div className="qty-main">{row.qty}</div>
                              <div className="qty-sub">KH: {row.kh}</div>
                            </td>
                            <td>
                              <span className={`kt-pill ${row.qc === 'Đạt' ? 'ok' : 'fail'}`}>
                                {row.qc === 'Đạt' ? '✓ Đạt' : '✗ Lỗi'}
                              </span>
                            </td>
                            <td>
                              <button className={`status-btn-${row.status === 'Đã giao' ? 'dagiao' : 'chogiao'}`}>
                                {row.status}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </InteractiveBlock>
              </div>
            </div>
          </InteractiveBlock>
          
          <div className="dev-tab-hint" onClick={() => setActiveTab('bangiao')}>
            💡 Click tab <strong>🚚 Bàn giao</strong> để xem component <strong>DeliveryOverviewCard</strong>
          </div>
        </div>
      ) : (
        <div className="tab-pane-content" style={{ padding: 12 }}>
          {/* DeliveryOverviewCard Wrapper */}
          <InteractiveBlock
            name="DeliveryOverviewCard"
            type={getCompType('DeliveryOverviewCard')}
            description={getCompDesc('DeliveryOverviewCard')}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          >
            <div className="mock-delivery-card-list">
              <div className="mock-delivery-card">
                <div className="card-top-row">
                  <span className="delivery-id font-mono">DEL-2026-081</span>
                  <span className="status-badge badge-pending">Chờ nhận QC</span>
                </div>
                
                <div className="card-info-grid">
                  <div className="info-item">
                    <span className="info-lbl">Kế hoạch:</span>
                    <span className="info-val font-mono">PO-2026-004</span>
                  </div>
                  <div className="info-item">
                    <span className="info-lbl">Linh kiện:</span>
                    <span className="info-val">Mặt bàn trà G7</span>
                  </div>
                  <div className="info-item">
                    <span className="info-lbl">Nơi giao:</span>
                    <span className="info-val">Chà nhám 3</span>
                  </div>
                  <div className="info-item">
                    <span className="info-lbl">Số lượng:</span>
                    <span className="info-val highlight-qty">48 cái</span>
                  </div>
                </div>
                <div className="card-footer-timestamp">Giao lúc: 09:30 - 27/05/2026</div>
              </div>
              
              <div className="mock-delivery-card static-card">
                <div className="card-top-row">
                  <span className="delivery-id font-mono">DEL-2026-079</span>
                  <span className="status-badge badge-done">Hoàn thành</span>
                </div>
                
                <div className="card-info-grid">
                  <div className="info-item">
                    <span className="info-lbl">Kế hoạch:</span>
                    <span className="info-val font-mono">PO-2026-003</span>
                  </div>
                  <div className="info-item">
                    <span className="info-lbl">Linh kiện:</span>
                    <span className="info-val">Chân bàn gỗ</span>
                  </div>
                  <div className="info-item">
                    <span className="info-lbl">Số lượng:</span>
                    <span className="info-val">120 cái</span>
                  </div>
                </div>
              </div>
            </div>
          </InteractiveBlock>
        </div>
      )}

      {/* CSS Styles cục bộ cho phần lọc nâng cao trên giao diện giả lập di động */}
      <style dangerouslySetInnerHTML={{ __html: `
        .advanced-filter-panel {
          background: #FAF6F0;
          border: 1px solid #EADCC9;
          border-radius: 8px;
          padding: 10px;
          margin: 0 12px 12px 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          animation: slideDownMobile 0.25s ease-out;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .filter-lbl {
          font-size: 0.72rem;
          font-weight: 700;
          color: #7B5233;
          text-transform: uppercase;
        }

        .filter-input-wrap {
          position: relative;
          width: 100%;
        }

        .mobile-search-field {
          width: 100%;
          padding: 6px 28px 6px 10px;
          border: 1px solid #EADCC9;
          background: #FFF;
          border-radius: 6px;
          font-size: 0.8rem;
          color: #2D1A12;
          box-sizing: border-box;
        }

        .mobile-search-field:focus {
          border-color: #7B5233;
          outline: none;
        }

        .mobile-search-clear {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #7B5233;
          font-size: 1rem;
          cursor: pointer;
        }

        .filter-pills-row {
          display: flex;
          gap: 6px;
        }

        .filter-pill-btn {
          padding: 4px 10px;
          border: 1px solid #EADCC9;
          border-radius: 12px;
          background: #FFF;
          font-size: 0.72rem;
          color: #7B5233;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .filter-pill-btn.active {
          background: #7B5233;
          color: #FFF;
          border-color: #7B5233;
        }

        .filter-group-checkbox {
          display: flex;
          align-items: center;
        }

        .filter-checkbox-lbl {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }

        .kt-pill {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .kt-pill.ok {
          background: #E8F5E9;
          color: #2E7D32;
        }

        .kt-pill.fail {
          background: #FFEBEE;
          color: #C62828;
        }

        .status-btn-dagiao {
          background: #E8F5E9;
          color: #2E7D32;
          border: 1px solid #A5D6A7;
          border-radius: 4px;
          font-size: 0.7rem;
          padding: 2px 6px;
          cursor: default;
        }

        .filter-active {
          background: #7B5233 !important;
          color: #FFF !important;
        }

        @keyframes slideDownMobile {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
};

export default MB2_DeliveryInfoMock;
