import React, { useState } from 'react';
import OrgChartView from './OrgChartView';
import HierarchyChartView from './HierarchyChartView';
import PersonnelChartView from './PersonnelChartView';
import FactoryStructureView from './FactoryStructureView';

const HRManagementView = () => {
  const [activeDiagram, setActiveDiagram] = useState('org-chart');

  const diagrams = [
    { 
      id: 'org-chart', 
      label: 'Sơ đồ theo phòng ban', 
      title: 'Sơ đồ tổ chức',
      component: OrgChartView 
    },
    { 
      id: 'hierarchy', 
      label: 'Sơ đồ theo cấp bậc', 
      title: 'Sơ đồ cấp bậc',
      component: HierarchyChartView 
    },
    { 
      id: 'personnel', 
      label: 'Sơ đồ theo nhân sự', 
      title: 'Sơ đồ nhân sự',
      component: PersonnelChartView 
    },
    { 
      id: 'factory', 
      label: 'Sơ đồ theo cấu trúc nhà máy', 
      title: 'Sơ đồ cấu trúc nhà máy',
      component: FactoryStructureView 
    }
  ];

  const currentDiag = diagrams.find(d => d.id === activeDiagram) || diagrams[0];
  const ActiveComponent = currentDiag.component;

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
    <div className="mgmt-container">
      <div className="mgmt-main">
        {/* Header with dynamic Title and Subtitle depending on active diagram */}
        <div className="page-header" style={{ marginBottom: '0', paddingBottom: '16px', borderBottom: '2px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2D1A12', margin: 0 }}>
            {currentDiag.title}
          </h1>
        </div>

        {/* Workspace content area with active chart/diagram */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginTop: '16px' }}>
          {ActiveComponent && <ActiveComponent diagramDropdown={diagramDropdown} />}
        </div>
      </div>
    </div>
  );
};

export default HRManagementView;
