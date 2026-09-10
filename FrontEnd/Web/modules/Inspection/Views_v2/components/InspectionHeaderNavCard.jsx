import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Box, AlertTriangle, RefreshCw } from 'lucide-react';

export const INSPECTION_NAV_TABS = [
  { key: 'list', label: 'Danh sách lỗi', icon: <FileText size={15} /> },
  { key: 'field', label: 'Lỗi hiện trường', icon: <Box size={15} /> },
  { key: 'complaint', label: 'Lỗi khiếu nại', icon: <AlertTriangle size={15} /> },
  { key: 'capa', label: 'Quản lý CAPA', icon: <RefreshCw size={15} /> }
];

export const InspectionHeaderNavCard = ({ activeTab, onTabChange, style = {} }) => {
  const navigate = useNavigate();

  const handleClick = (key) => {
    if (onTabChange) {
      onTabChange(key);
    } else {
      navigate(`/admin/defects?tab=${key}`);
    }
  };

  return (
    <div
      className="inspection-nav-card"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#F7F4F0',
        border: '1.5px solid #E4DDD5',
        borderRadius: '8px',
        padding: '3px',
        gap: '4px',
        height: '38px',
        boxSizing: 'border-box',
        boxShadow: '0 2px 4px rgba(91, 57, 36, 0.05)',
        ...style
      }}
    >
      {INSPECTION_NAV_TABS.map((t) => {
        const isActive = activeTab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => handleClick(t.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '100%',
              padding: '0 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: isActive ? '700' : '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              backgroundColor: isActive ? '#5B3924' : 'transparent',
              color: isActive ? '#FFFDFC' : '#5B3924',
              boxShadow: isActive ? '0 1px 3px rgba(91, 57, 36, 0.25)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default InspectionHeaderNavCard;
