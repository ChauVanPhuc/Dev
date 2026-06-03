import React from 'react';
import { BrowserFrame, MobileFrame } from './DeviceFrames';
import FallbackMockup from './FallbackMockup';
import AD1_LoginMock from './mocks/AD1_LoginMock';
import AD3_UserManagementMock from './mocks/AD3_UserManagementMock';
import MA2_PlanMock from './mocks/MA2_PlanMock';
import MB1_LoginMock from './mocks/MB1_LoginMock';
import MB2_DeliveryInfoMock from './mocks/MB2_DeliveryInfoMock';
import MB21_DeliveryCreateMock from './mocks/MB21_DeliveryCreateMock';
import MB22_DeliveryReceiveMock from './mocks/MB22_DeliveryReceiveMock';
import MB24_InputInspectionMock from './mocks/MB24_InputInspectionMock';
import MB4_PlanTrackingMock from './mocks/MB4_PlanTrackingMock';
import MB5_DailyInspectionMock from './mocks/MB5_DailyInspectionMock';
import MB6_StageInspectionMock from './mocks/MB6_StageInspectionMock';
import MB7_InspectionHistoryMock from './mocks/MB7_InspectionHistoryMock';
import MB8_KpiTrackingMock from './mocks/MB8_KpiTrackingMock';
import MB81_StaffEvaluationMock from './mocks/MB81_StaffEvaluationMock';
import MB82_KpiStaffMock from './mocks/MB82_KpiStaffMock';
import MB9_AwardsMock from './mocks/MB9_AwardsMock';
import MB10_EquipmentListMock from './mocks/MB10_EquipmentListMock';
import MB11_QualityDetailMock from './mocks/MB11_QualityDetailMock';
import MB12_ThermalPrintMock from './mocks/MB12_ThermalPrintMock';
import MB13_CapaListMock from './mocks/MB13_CapaListMock';
import MB14_CapaReportMock from './mocks/MB14_CapaReportMock';
import MB15_CapaDetailMock from './mocks/MB15_CapaDetailMock';
import InteractiveBlock from './InteractiveBlock';
import './Simulation.css';



/**
 * ScreenSimulator - Điều phối và hiển thị bản vẽ mô phỏng tương tác
 */
export const ScreenSimulator = ({
  screenCode,
  platform,
  routePath,
  components = [],
  activeComponent,
  hoveredComponent,
  onHover,
  onClick,
  startGlobalUpload,
  onRefresh,
  simulationMode = 'mockup'
}) => {
  const normalizedCode = (screenCode || '').toUpperCase();

  const [dimensions, setDimensions] = React.useState({ scale: 1, mockupHeight: 560, wrapperHeight: 560 });
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    let active = true;
    const handleResize = () => {
      if (!active || !containerRef.current) return;
      
      const parent = containerRef.current.parentElement;
      if (parent) {
        // Tìm cell cha có CSS grid cố định để tránh các lỗi co rúm flexbox
        const paneEl = containerRef.current.closest('.detail-simulator-pane');
        const widthSource = paneEl || parent;
        const parentWidth = widthSource.getBoundingClientRect().width;
        
        // Tìm .simulator-wrapper để đo chiều cao khả dụng
        const wrapperEl = paneEl ? paneEl.querySelector('.simulator-wrapper') : parent;
        const wrapperHeight = wrapperEl ? wrapperEl.getBoundingClientRect().height : 560;
        
        if (parentWidth > 0 && wrapperHeight > 0) {
          const availableWidth = parentWidth - 30; // Trừ padding 15px mỗi bên
          const availableHeight = wrapperHeight - 46; // Trừ padding 15px mỗi bên + 16px khoảng trống an toàn để tránh bị cắt góc bezel
          
          const isWeb = platform === 'Web';
          const baseMockupWidth = isWeb ? 960 : 360;
          const baseMockupHeight = isWeb ? 680 : 720;
          
          const widthScale = availableWidth / baseMockupWidth;
          const heightScale = availableHeight / baseMockupHeight;
          
          // Tỉ lệ scale tối ưu không bao giờ vượt quá 1 (để giữ độ nét gốc)
          const scaleFactor = Math.min(1, widthScale, heightScale);
          
          // Tính toán chiều cao mockup gốc để lấp đầy 100% chiều cao khả dụng
          const computedMockupHeight = isWeb 
            ? availableHeight / scaleFactor 
            : baseMockupHeight;
          
          setDimensions({
            scale: scaleFactor,
            mockupHeight: computedMockupHeight,
            wrapperHeight: availableHeight
          });
        } else {
          // Nếu width chưa paint xong, thử lại ở frame tiếp theo
          requestAnimationFrame(handleResize);
        }
      }
    };

    handleResize();

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      const paneEl = containerRef.current.closest('.detail-simulator-pane');
      const observeTarget = paneEl || containerRef.current.parentElement;
      if (observeTarget) {
        resizeObserver = new ResizeObserver(() => {
          handleResize();
        });
        resizeObserver.observe(observeTarget);
      }
    }

    window.addEventListener('resize', handleResize);
    return () => {
      active = false;
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [platform]);


  // Tách biệt các component UI (hiển thị) và các component nghiệp vụ/API (phi vật lý)
  const uiComponents = components.filter(c => c.type === 'UI Component');
  const systemComponents = components.filter(c => c.type !== 'UI Component');

  const getCompDesc = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.description : '';
  };

  const getCompType = (name) => {
    const found = components.find(c => c.name === name);
    return found ? found.type : 'Logic / Service';
  };

  // Chọn Mockup tương ứng để render phần UI
  const renderUiMockup = () => {
    switch (normalizedCode) {
      case 'AD1':
        return (
          <AD1_LoginMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'AD3':
        return (
          <AD3_UserManagementMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MA2':
        return (
          <MA2_PlanMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
            startGlobalUpload={startGlobalUpload}
            onRefresh={onRefresh}
          />
        );

      case 'MB1':
        return (
          <MB1_LoginMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MB2':
        return (
          <MB2_DeliveryInfoMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MB2.1':
        return (
          <MB21_DeliveryCreateMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MB2.2':
        return (
          <MB22_DeliveryReceiveMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MB2.4':
        return (
          <MB24_InputInspectionMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MB4':
        return (
          <MB4_PlanTrackingMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MB5':
        return (
          <MB5_DailyInspectionMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MB6':
        return (
          <MB6_StageInspectionMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MB7':
        return (
          <MB7_InspectionHistoryMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MB8':
        return (
          <MB8_KpiTrackingMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MB8.1':
        return (
          <MB81_StaffEvaluationMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MB8.2':
        return (
          <MB82_KpiStaffMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MB9':
        return (
          <MB9_AwardsMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MB10':
        return (
          <MB10_EquipmentListMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MB11':
        return (
          <MB11_QualityDetailMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MB12':
        return (
          <MB12_ThermalPrintMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MB13':
        return (
          <MB13_CapaListMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MB14':
        return (
          <MB14_CapaReportMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      case 'MB15':
        return (
          <MB15_CapaDetailMock
            components={components}
            activeComponent={activeComponent}
            hoveredComponent={hoveredComponent}
            onHover={onHover}
            onClick={onClick}
          />
        );

      default: {
        const hasUserGuide = uiComponents.some(c => c.name === 'UserGuideButton');
        const hasNotification = uiComponents.some(c => c.name === 'NotificationBell');
        
        const headerNames = ['UserGuideButton', 'NotificationBell'];
        const bodyComponents = uiComponents.filter(c => !headerNames.includes(c.name));

        if (platform === 'Web') {
          // Giao diện giả lập dạng Web/Desktop cho các màn hình MA
          return (
            <div className="mock-web-dashboard-container" style={{ display: 'flex', height: '100%', minHeight: 480, background: '#FAF6F0', color: '#2D1A12', textAlign: 'left', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              {/* Sidebar bên trái */}
              <div className="mock-web-sidebar" style={{ width: 180, background: '#4A2E20', color: '#FFF', display: 'flex', flexDirection: 'column', borderRight: '1px solid #EADCC9', flexShrink: 0 }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 800, fontSize: '0.72rem', color: '#EADCC9', letterSpacing: '0.5px' }}>
                  🛠️ G7 SMARTFLOW
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 6px' }}>
                  <div style={{ padding: '8px 10px', borderRadius: 4, background: normalizedCode.startsWith('MA1') ? 'rgba(255,255,255,0.12)' : 'transparent', fontSize: '0.68rem', color: normalizedCode.startsWith('MA1') ? '#FFF' : '#C5B5AD', fontWeight: 600 }}>📊 Dashboard</div>
                  <div style={{ padding: '8px 10px', borderRadius: 4, background: normalizedCode.startsWith('MA2') ? 'rgba(255,255,255,0.12)' : 'transparent', fontSize: '0.68rem', color: normalizedCode.startsWith('MA2') ? '#FFF' : '#C5B5AD', fontWeight: 600 }}>📅 Kế hoạch SX</div>
                  <div style={{ padding: '8px 10px', borderRadius: 4, background: normalizedCode.startsWith('MA3') ? 'rgba(255,255,255,0.12)' : 'transparent', fontSize: '0.68rem', color: normalizedCode.startsWith('MA3') ? '#FFF' : '#C5B5AD', fontWeight: 600 }}>📦 Đơn hàng PO</div>
                  <div style={{ padding: '8px 10px', borderRadius: 4, background: normalizedCode.startsWith('MA4') ? 'rgba(255,255,255,0.12)' : 'transparent', fontSize: '0.68rem', color: normalizedCode.startsWith('MA4') ? '#FFF' : '#C5B5AD', fontWeight: 600 }}>🪚 Danh mục SP</div>
                  <div style={{ padding: '8px 10px', borderRadius: 4, background: normalizedCode.startsWith('MA5') ? 'rgba(255,255,255,0.12)' : 'transparent', fontSize: '0.68rem', color: normalizedCode.startsWith('MA5') ? '#FFF' : '#C5B5AD', fontWeight: 600 }}>📈 Tiến độ tổ máy</div>
                  <div style={{ padding: '8px 10px', borderRadius: 4, background: normalizedCode.startsWith('MA6') ? 'rgba(255,255,255,0.12)' : 'transparent', fontSize: '0.68rem', color: normalizedCode.startsWith('MA6') ? '#FFF' : '#C5B5AD', fontWeight: 600 }}>🚚 Giao nhận hàng</div>
                  <div style={{ padding: '8px 10px', borderRadius: 4, background: normalizedCode.startsWith('MA7') ? 'rgba(255,255,255,0.12)' : 'transparent', fontSize: '0.68rem', color: normalizedCode.startsWith('MA7') ? '#FFF' : '#C5B5AD', fontWeight: 600 }}>⚠️ Pallet ngoại lệ</div>
                </div>
              </div>

              {/* Khu vực workspace bên phải */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header thanh công cụ phía trên */}
                <div style={{ height: 46, background: '#FFFFFF', borderBottom: '1px solid #EADCC9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: '#7B5233', color: '#FFF', fontSize: '0.62rem', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{normalizedCode}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4A2E20' }}>{routePath}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {hasUserGuide && (
                      <InteractiveBlock
                        name="UserGuideButton"
                        type={getCompType('UserGuideButton')}
                        description={getCompDesc('UserGuideButton')}
                        activeComponent={activeComponent}
                        hoveredComponent={hoveredComponent}
                        onHover={onHover}
                        onClick={onClick}
                      >
                        <span style={{ cursor: 'pointer', fontSize: '0.8rem', padding: '4px' }}>❓ Trợ giúp</span>
                      </InteractiveBlock>
                    )}
                    {hasNotification && (
                      <InteractiveBlock
                        name="NotificationBell"
                        type={getCompType('NotificationBell')}
                        description={getCompDesc('NotificationBell')}
                        activeComponent={activeComponent}
                        hoveredComponent={hoveredComponent}
                        onHover={onHover}
                        onClick={onClick}
                      >
                        <span style={{ cursor: 'pointer', fontSize: '0.8rem', padding: '4px', position: 'relative' }}>🔔 Thông báo</span>
                      </InteractiveBlock>
                    )}
                  </div>
                </div>

                {/* Workspace Content */}
                <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {bodyComponents.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#8C6239', fontStyle: 'italic', fontSize: '0.75rem' }}>
                      Chưa cấu hình UI components cho màn hình này.
                    </div>
                  ) : (
                    bodyComponents.map(comp => {
                      let content = null;
                      const cName = comp.name.toLowerCase();

                      if (cName.includes('selector') || cName.includes('filter') || cName.includes('sort') || cName.includes('search')) {
                        content = (
                          <div style={{ background: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '0.8rem' }}>🔍</span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4A2E20' }}>BỘ LỌC TÌM KIẾM: {comp.name}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <div style={{ height: 26, width: 140, background: '#FAF6F0', borderRadius: 4, border: '1px solid #EADCC9', fontSize: '0.65rem', display: 'flex', alignItems: 'center', paddingLeft: 8, color: '#A0A0A0' }}>Nhập từ khóa tìm kiếm...</div>
                              <div style={{ height: 26, background: '#FAF6F0', borderRadius: 4, border: '1px solid #EADCC9', fontSize: '0.65rem', display: 'flex', alignItems: 'center', padding: '0 10px', color: '#7B5233', fontWeight: 600 }}>Tất cả bộ lọc ▼</div>
                            </div>
                          </div>
                        );
                      } else if (cName.includes('form') || cName.includes('create') || cName.includes('add') || cName.includes('edit')) {
                        content = (
                          <div style={{ background: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: 8, padding: 16, textAlign: 'left' }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.78rem', fontWeight: 800, color: '#7B5233', borderBottom: '1px solid #FAF0E6', paddingBottom: 6 }}>
                              📝 BIỂU MẪU NHẬP LIỆU: {comp.name}
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                              <div>
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#8C6239', display: 'block', marginBottom: 4 }}>Trường thông tin bắt buộc</label>
                                <div style={{ height: 28, background: '#FAF6F0', borderRadius: 6, border: '1px solid #EADCC9', fontSize: '0.68rem', display: 'flex', alignItems: 'center', paddingLeft: 8, color: '#A0A0A0' }}>Nhập thông tin tại đây...</div>
                              </div>
                              <div>
                                <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#8C6239', display: 'block', marginBottom: 4 }}>Thông tin bổ sung</label>
                                <div style={{ height: 28, background: '#FAF6F0', borderRadius: 6, border: '1px solid #EADCC9', fontSize: '0.68rem', display: 'flex', alignItems: 'center', paddingLeft: 8, color: '#A0A0A0' }}>Chọn từ danh mục ▼</div>
                              </div>
                            </div>
                            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                              <div style={{ background: '#FAF6F0', border: '1px solid #EADCC9', color: '#7B5233', padding: '5px 12px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>Hủy bỏ</div>
                              <div style={{ background: '#7B5233', color: '#FFF', padding: '5px 12px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>Lưu thông tin</div>
                            </div>
                          </div>
                        );
                      } else if (cName.includes('table') || cName.includes('list') || cName.includes('grid') || cName.includes('datagrid') || cName.includes('bom') || cName.includes('view') || cName.includes('header')) {
                        content = (
                          <div style={{ background: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: 8, padding: 14, textAlign: 'left' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.78rem', fontWeight: 800, color: '#4A2E20', borderBottom: '1px solid #FAF0E6', paddingBottom: 6 }}>
                              📊 CHI TIẾT BẢNG / DỮ LIỆU: {comp.name}
                            </h4>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.68rem' }}>
                              <thead>
                                <tr style={{ background: '#FAF6F0', borderBottom: '1px solid #EADCC9' }}>
                                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#7B5233' }}>Mã / Số hiệu</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#7B5233' }}>Tên hiển thị</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#7B5233' }}>Trạng thái</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr style={{ borderBottom: '1px dashed #FAF0E6' }}>
                                  <td style={{ padding: '6px 8px', fontWeight: 700 }}>#01. Chi tiết dữ liệu mẫu</td>
                                  <td style={{ padding: '6px 8px', color: '#606060' }}>Giá trị mẫu hiển thị trên bảng quản lý</td>
                                  <td style={{ padding: '6px 8px' }}><span style={{ background: '#E8F5E9', color: '#2E7D32', padding: '2px 6px', borderRadius: 4, fontWeight: 700, fontSize: '0.58rem' }}>Đạt QC</span></td>
                                </tr>
                                <tr>
                                  <td style={{ padding: '6px 8px', fontWeight: 700 }}>#02. Chi tiết dữ liệu mẫu</td>
                                  <td style={{ padding: '6px 8px', color: '#606060' }}>Giá trị mẫu hiển thị trên bảng quản lý</td>
                                  <td style={{ padding: '6px 8px' }}><span style={{ background: '#FFF3E0', color: '#E65100', padding: '2px 6px', borderRadius: 4, fontWeight: 700, fontSize: '0.58rem' }}>Chờ kiểm</span></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      } else if (cName.includes('chart') || cName.includes('graph') || cName.includes('dashboard')) {
                        content = (
                          <div style={{ background: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: 8, padding: 14, textAlign: 'left' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.78rem', fontWeight: 800, color: '#4A2E20' }}>
                              📈 BIỂU ĐỒ & CHỈ SỐ: {comp.name}
                            </h4>
                            <div style={{ height: 120, background: '#FAF6F0', border: '1px dashed #EADCC9', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                              <div style={{ fontSize: '1rem' }}>📊</div>
                              <div style={{ fontSize: '0.65rem', color: '#8C6239', fontWeight: 600 }}>Biểu đồ theo dõi năng suất sản xuất và tỷ lệ lỗi QC</div>
                            </div>
                          </div>
                        );
                      } else if (cName.includes('button') || cName.includes('submit') || cName.includes('btn') || cName.includes('import') || cName.includes('export')) {
                        content = (
                          <div style={{ display: 'inline-flex', background: '#7B5233', color: '#FFFFFF', padding: '6px 14px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', border: '1px solid #7B5233' }}>
                            ⚙️ Thực hiện: {comp.name}
                          </div>
                        );
                      } else {
                        content = (
                          <div style={{ background: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: 8, padding: 10, fontSize: '0.7rem', fontWeight: 600, color: '#4A2E20' }}>
                            🔲 Component UI: {comp.name}
                          </div>
                        );
                      }

                      return (
                        <InteractiveBlock
                          key={comp.id}
                          name={comp.name}
                          type={comp.type}
                          description={comp.description}
                          activeComponent={activeComponent}
                          hoveredComponent={hoveredComponent}
                          onHover={onHover}
                          onClick={onClick}
                        >
                          {content}
                        </InteractiveBlock>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        } else {
          // Mobile Fallback Wireframe
          return (
            <div className="mock-mobile-container" style={{ minHeight: 480 }}>
              {/* Header giả lập động */}
              <div className="mobile-header-real">
                <div className="real-header-left">
                  <div className="real-avatar">👤</div>
                  <div className="real-title-group">
                    <span className="real-title-main">G7 - SmartFlow</span>
                    <span className="real-title-sub">{normalizedCode} | {routePath}</span>
                  </div>
                </div>
                <div className="real-header-right" style={{ display: 'flex', gap: 6 }}>
                  {hasUserGuide && (
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
                  )}
                  {hasNotification && (
                    <InteractiveBlock
                      name="NotificationBell"
                      type={getCompType('NotificationBell')}
                      description={getCompDesc('NotificationBell')}
                      activeComponent={activeComponent}
                      hoveredComponent={hoveredComponent}
                      onHover={onHover}
                      onClick={onClick}
                    >
                      <span className="header-icon" style={{ position: 'relative' }}>🔔</span>
                    </InteractiveBlock>
                  )}
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

              {/* Thân trang wireframe */}
              <div className="mobile-body-content" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
                {bodyComponents.length === 0 ? (
                  <div style={{ padding: 30, fontStyle: 'italic', color: '#888', textAlign: 'center', fontSize: '0.75rem' }}>
                    Chưa có chi tiết UI component.
                  </div>
                ) : (
                  bodyComponents.map(comp => {
                    let content = null;
                    
                    if (comp.name.toLowerCase().includes('selector') || comp.name.toLowerCase().includes('filter') || comp.name.toLowerCase().includes('sort')) {
                      content = (
                        <div className="mock-mobile-dropdown" style={{ margin: 0, padding: '6px 10px', height: 32 }}>
                          <span>🔍 Chọn / Lọc {comp.name}</span>
                          <span>▼</span>
                        </div>
                      );
                    } else if (comp.name.toLowerCase().includes('form') || comp.name.toLowerCase().includes('input') || comp.name.toLowerCase().includes('modal') || comp.name.toLowerCase().includes('checklist') || comp.name.toLowerCase().includes('uploader')) {
                      content = (
                        <div style={{ background: '#FFF', border: '1px solid #EADCC9', borderRadius: 8, padding: 10, textAlign: 'left' }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#7B5233', marginBottom: 6 }}>BIỂU MẪU / CHỈ TIÊU: {comp.name}</div>
                          <div style={{ height: 28, background: '#FAF6F0', borderRadius: 4, border: '1px solid #EADCC9', marginBottom: 6, fontSize: '0.62rem', display: 'flex', alignItems: 'center', paddingLeft: 8, color: '#A0A0A0' }}>Nhập dữ liệu kiểm tra...</div>
                          <div style={{ height: 28, background: '#FAF6F0', borderRadius: 4, border: '1px solid #EADCC9', fontSize: '0.62rem', display: 'flex', alignItems: 'center', paddingLeft: 8, color: '#A0A0A0' }}>Nhập nhận xét / kết quả...</div>
                        </div>
                      );
                    } else if (comp.name.toLowerCase().includes('list') || comp.name.toLowerCase().includes('table') || comp.name.toLowerCase().includes('card') || comp.name.toLowerCase().includes('logs') || comp.name.toLowerCase().includes('history') || comp.name.toLowerCase().includes('dashboard') || comp.name.toLowerCase().includes('layout') || comp.name.toLowerCase().includes('banner')) {
                      content = (
                        <div style={{ background: '#FFF', border: '1px solid #EADCC9', borderRadius: 8, padding: 10, textAlign: 'left' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4A2E20', borderBottom: '1px solid #EADCC9', paddingBottom: 4, marginBottom: 6 }}>DANH SÁCH: {comp.name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', padding: '4px 0', borderBottom: '1px dashed #F2EAE1' }}>
                            <span style={{ fontWeight: 700 }}>#01. Chi tiết dữ liệu mẫu</span>
                            <span style={{ color: '#2E7D32', fontWeight: 700 }}>Đạt QC</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', padding: '4px 0' }}>
                            <span style={{ fontWeight: 700 }}>#02. Chi tiết dữ liệu mẫu</span>
                            <span style={{ color: '#EF6C00', fontWeight: 700 }}>Chờ kiểm</span>
                          </div>
                        </div>
                      );
                    } else if (comp.name.toLowerCase().includes('button') || comp.name.toLowerCase().includes('submit') || comp.name.toLowerCase().includes('confirm') || comp.name.toLowerCase().includes('save')) {
                      content = (
                        <div className="mock-mobile-btn-submit" style={{ padding: 8, fontSize: '0.72rem', borderRadius: 6, margin: '4px 0' }}>
                          {comp.name}
                        </div>
                      );
                    } else {
                      content = (
                        <div className="fallback-block-item" style={{ background: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: 8, padding: 8, minHeight: 40 }}>
                          {comp.name}
                        </div>
                      );
                    }

                    return (
                      <InteractiveBlock
                        key={comp.id}
                        name={comp.name}
                        type={comp.type}
                        description={comp.description}
                        activeComponent={activeComponent}
                        hoveredComponent={hoveredComponent}
                        onHover={onHover}
                        onClick={onClick}
                      >
                        {content}
                      </InteractiveBlock>
                    );
                  })
                )}
              </div>
            </div>
          );
        }
      }
    }
  };

  // Render toàn bộ layout hiển thị UI Mockup
  const renderFullViewport = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', height: '100%' }}>
        {/* Viewport chính hiển thị Mockup */}
        <div className="simulator-viewport-main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {renderUiMockup()}
        </div>
      </div>
    );
  };

  // Bao bọc bởi Device Frame tương ứng
  if (platform === 'Web') {
    const mockupWidth = 960;
    
    return (
      <div 
        ref={containerRef}
        className="web-simulator-scaler-wrapper"
        style={{
          width: '100%',
          height: `${dimensions.wrapperHeight}px`,
          position: 'relative',
          overflow: 'hidden',
          transition: 'height 0.2s ease'
        }}
      >
        <div
          style={{
            width: `${mockupWidth}px`,
            height: `${dimensions.mockupHeight}px`,
            position: 'absolute',
            left: '50%',
            top: 0,
            transform: `translateX(-50%) scale(${dimensions.scale})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease, height 0.2s ease'
          }}
        >
          <BrowserFrame url={routePath}>
            {renderFullViewport()}
          </BrowserFrame>
        </div>
      </div>
    );
  } else if (platform === 'Mobile') {
    const mockupWidth = 360;
    
    return (
      <div 
        ref={containerRef}
        className="mobile-simulator-scaler-wrapper"
        style={{
          width: '100%',
          height: `${dimensions.wrapperHeight}px`,
          position: 'relative',
          overflow: 'hidden',
          transition: 'height 0.2s ease'
        }}
      >
        <div
          style={{
            width: `${mockupWidth}px`,
            height: `${dimensions.mockupHeight}px`,
            position: 'absolute',
            left: '50%',
            top: '-12px', // Đẩy điện thoại lên một chút để tránh bị cắt góc bezel bên dưới
            transform: `translateX(-50%) scale(${dimensions.scale})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease, height 0.2s ease'
          }}
        >
          <MobileFrame>
            {renderFullViewport()}
          </MobileFrame>
        </div>
      </div>
    );
  }

  // Trường hợp không xác định nền tảng
  return (
    <div style={{ padding: 20, border: '1px dashed #EADCC9', borderRadius: 12, width: '100%' }}>
      {renderFullViewport()}
    </div>
  );
};

export default ScreenSimulator;
