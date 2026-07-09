import React from 'react'

/**
 * Tabs Component
 * Chuyển đổi giữa các phân mục (vd: Bàn giao và Tiếp nhận).
 */
const Tabs = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div
      className="hide-scrollbar"
      style={{
        display: 'flex',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '15px',
        width: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        boxSizing: 'border-box',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none'
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              padding: '10px 4px',
              border: 'none',
              background: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              color: isActive ? 'var(--primary-color)' : '#9ca3af',
              borderBottom: isActive ? '3px solid var(--primary-color)' : '3px solid transparent',
              fontWeight: isActive ? '700' : '600',
              fontSize: 'clamp(0.72rem, 2.8vw, 0.85rem)',
              lineHeight: '1.2',
              transition: 'color 0.2s ease, backgroundColor 0.2s ease, borderBottom 0.2s ease, fontWeight 0.2s ease',
              cursor: 'pointer',
              minWidth: '80px',
              overflow: 'hidden'
            }}
          >
            {Icon && <Icon size={14} style={{ flexShrink: 0 }} />}
            <span style={{ 
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textAlign: 'center',
              minWidth: 0
            }}>
              {tab.label}
            </span>
            {/* badge màu đỏ */}
            {tab.badge > 0 && (
              <span style={{
                backgroundColor: '#b91c1c',
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: '700',
                padding: '2px 6px',
                borderRadius: '10px',
                minWidth: '18px',
                flexShrink: 0
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
