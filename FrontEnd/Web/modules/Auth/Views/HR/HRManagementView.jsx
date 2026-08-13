import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import OrgChartView from './OrgChartView';
import HierarchyChartView from './HierarchyChartView';
import PersonnelChartView from './PersonnelChartView';
import FactoryStructureView from './FactoryStructureView';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const HRManagementView = ({ defaultDiagram = 'org-chart' }) => {
  const [activeDiagram, setActiveDiagram] = useState(defaultDiagram);
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};

  const diagrams = [
    { 
      id: 'org-chart', 
      label: 'Sơ đồ theo phòng ban', 
      title: 'Sơ đồ tổ chức',
      subtitle: 'Cấu trúc phòng ban và phân cấp sơ đồ tổ chức công ty',
      screenCode: 'NS02',
      route: '/admin/hr/org-chart',
      component: OrgChartView 
    },
    { 
      id: 'hierarchy', 
      label: 'Sơ đồ theo cấp bậc', 
      title: 'Sơ đồ cấp bậc',
      subtitle: 'Phân cấp cấp bậc, chức danh và vị trí trong doanh nghiệp',
      screenCode: 'NS03',
      route: '/admin/hr/hierarchy',
      component: HierarchyChartView 
    },
    { 
      id: 'personnel', 
      label: 'Sơ đồ theo nhân sự', 
      title: 'Sơ đồ nhân sự',
      subtitle: 'Sơ đồ phân bổ nhân sự và số lượng lao động theo bộ phận',
      screenCode: 'NS04',
      route: '/admin/hr/personnel',
      component: PersonnelChartView 
    },
    { 
      id: 'factory', 
      label: 'Sơ đồ theo cấu trúc nhà máy', 
      title: 'Sơ đồ cấu trúc nhà máy',
      subtitle: 'Sơ đồ tổ chức các phân xưởng và dây chuyền sản xuất tại nhà máy',
      screenCode: 'NS05',
      route: '/admin/hr/factory',
      component: FactoryStructureView 
    }
  ];

  const currentDiag = diagrams.find(d => d.id === activeDiagram) || diagrams[0];
  const ActiveComponent = currentDiag.component;
  const { screenCode, title, subtitle } = useScreenMetadataCached(currentDiag.route);

  useEffect(() => {
    if (typeof setCustomTitle === 'function') setCustomTitle(title || currentDiag.title);
    if (typeof setCustomSubtitle === 'function') setCustomSubtitle(subtitle || currentDiag.subtitle);
    if (typeof setCustomScreenCode === 'function') setCustomScreenCode(screenCode || currentDiag.screenCode);
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, title, subtitle, screenCode, currentDiag]);

  const diagramDropdown = (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <select
        value={activeDiagram}
        onChange={(e) => setActiveDiagram(e.target.value)}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          backgroundColor: '#FFFFFF',
          border: '1.5px solid #EADCC9',
          borderRadius: '8px',
          padding: '8px 36px 8px 16px',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#4A2E1B',
          cursor: 'pointer',
          outline: 'none',
          backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%234A2E1B\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          backgroundSize: '16px',
          boxShadow: '0 2px 4px rgba(123, 82, 51, 0.04)',
          transition: 'border-color 0.15s ease'
        }}
        onFocus={(e) => e.target.style.borderColor = '#7B5233'}
        onBlur={(e) => e.target.style.borderColor = '#EADCC9'}
      >
        {diagrams.map(diag => (
          <option key={diag.id} value={diag.id}>
            {diag.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="mgmt-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px', maxWidth: '100%', margin: '0', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div className="mgmt-main" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}>
        {/* Header with dynamic Title and Subtitle depending on active diagram */}
        <div className="page-header" style={{ marginBottom: '0', paddingBottom: '16px', borderBottom: '2px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2D1A12', margin: 0 }}>
            {title || currentDiag.title}
          </h1>
        </div>

        {/* Workspace content area with active chart/diagram */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginTop: '16px', minHeight: 0 }}>
          {ActiveComponent && <ActiveComponent diagramDropdown={diagramDropdown} />}
        </div>
      </div>
    </div>
  );
};

export default HRManagementView;
