import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Box,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  Check
} from 'lucide-react';

export const DASHBOARD_PAGES = [
  { id: 'page1', label: 'Tổng quan chất lượng' },
  { id: 'page2', label: 'Phân tích lỗi' },
  { id: 'page3', label: 'Kiểm soát & hành động' },
  { id: 'page4', label: 'Khiếu nại khách hàng' }
];

export const INSPECTION_NAV_TABS = [
  { key: 'list', label: 'Danh sách lỗi', icon: <FileText size={14} /> },
  { key: 'field', label: 'Lỗi hiện trường', icon: <Box size={14} /> },
  { key: 'complaint', label: 'Lỗi khiếu nại', icon: <AlertTriangle size={14} /> },
  { key: 'capa', label: 'Quản lý CAPA', icon: <RefreshCw size={14} /> }
];

export const InspectionHeaderNavCard = ({
  activeTab = 'list',
  onTabChange,
  dashboardPage = 'page1',
  onDashboardPageChange,
  style = {}
}) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [dropdownOpen]);

  const isDashboardActive = activeTab === 'dashboard' || activeTab === 'analytics';
  const currentPageObj = DASHBOARD_PAGES.find((p) => p.id === dashboardPage) || DASHBOARD_PAGES[0];

  const handleTabClick = (key) => {
    setDropdownOpen(false);
    if (onTabChange) {
      onTabChange(key);
    } else {
      navigate(`/admin/defects?tab=${key}`);
    }
  };

  const handleDashboardButtonClick = (e) => {
    e.stopPropagation();
    if (!isDashboardActive) {
      if (onTabChange) onTabChange('dashboard');
      else navigate(`/admin/defects?tab=dashboard&page=${dashboardPage}`);
    }
    setDropdownOpen((prev) => !prev);
  };

  const handleSelectPage = (pageId, e) => {
    e.stopPropagation();
    setDropdownOpen(false);
    if (onDashboardPageChange) {
      onDashboardPageChange(pageId);
    } else {
      navigate(`/admin/defects?tab=dashboard&page=${pageId}`);
    }
  };

  return (
    <div
      className="inspection-nav-card"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#F8F9FB',
        border: '1px solid #E8E2DC',
        borderRadius: '7px',
        padding: '2px',
        gap: '3px',
        height: '34px',
        boxSizing: 'border-box',
        boxShadow: '0 1px 2px rgba(41, 37, 36, 0.04)',
        position: 'relative',
        ...style
      }}
    >
      {/* 4 tab nghiệp vụ lỗi & chất lượng của Dev_v4 */}
      {INSPECTION_NAV_TABS.map((t) => {
        const isActive = !isDashboardActive && activeTab === t.key;
        return (
          <button
            key={t.key}
            type="button"
            className="tab-btn"
            onClick={() => handleTabClick(t.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              height: '100%',
              padding: '0 10px',
              borderRadius: '5px',
              border: 'none',
              fontSize: '0.76rem',
              fontWeight: isActive ? '700' : '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              backgroundColor: isActive ? '#795137' : 'transparent',
              color: isActive ? '#FFFFFF' : '#78716C',
              boxShadow: isActive ? '0 1px 2px rgba(121, 81, 55, 0.2)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        );
      })}

      {/* Nút Dashboard tích hợp Dropdown 4 trang */}
      <div ref={dropdownRef} style={{ position: 'relative', height: '100%' }}>
        <button
          type="button"
          className="tab-btn"
          onClick={handleDashboardButtonClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            height: '100%',
            padding: '0 10px',
            borderRadius: '5px',
            border: 'none',
            fontSize: '0.76rem',
            fontWeight: isDashboardActive ? '700' : '500',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            backgroundColor: isDashboardActive ? '#795137' : 'transparent',
            color: isDashboardActive ? '#FFFFFF' : '#78716C',
            boxShadow: isDashboardActive ? '0 1px 2px rgba(121, 81, 55, 0.2)' : 'none',
            whiteSpace: 'nowrap'
          }}
          title="Chọn phân hệ Dashboard chất lượng"
        >
          <LayoutDashboard size={14} />
          <span>{isDashboardActive ? (currentPageObj?.label || 'Tổng quan chất lượng') : 'Dashboard'}</span>
          <ChevronDown
            size={13}
            style={{
              transition: 'transform 0.15s ease',
              transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              opacity: 0.85
            }}
          />
        </button>

        {dropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              minWidth: '205px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E8E2DC',
              borderRadius: '7px',
              boxShadow: '0 8px 16px -2px rgba(41, 37, 36, 0.12), 0 3px 6px -2px rgba(41, 37, 36, 0.06)',
              padding: '4px',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}
          >
            {DASHBOARD_PAGES.map((page) => {
              const isSelected = isDashboardActive && dashboardPage === page.id;
              return (
                <button
                  key={page.id}
                  type="button"
                  className="tab-btn"
                  onClick={(e) => handleSelectPage(page.id, e)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: isSelected ? '#FAF6F2' : 'transparent',
                    color: isSelected ? '#795137' : '#292524',
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: '0.76rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#F8F9FB';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <LayoutDashboard size={13} style={{ color: isSelected ? '#795137' : '#78716C' }} />
                    <span>{page.label}</span>
                  </div>
                  {isSelected && <Check size={13} style={{ color: '#795137', strokeWidth: 2.5 }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InspectionHeaderNavCard;
