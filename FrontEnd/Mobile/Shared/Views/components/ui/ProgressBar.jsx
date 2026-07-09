import React from 'react'

/**
 * ProgressBar Component
 * Hiển thị thanh tiến độ chuyên nghiệp với màu sắc thương hiệu.
 */
const ProgressBar = ({ percent, style }) => {
  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flex: 1,
        ...style
      }}
    >
      {/* Thanh nền */}
      <div 
        style={{
          height: '10px',
          backgroundColor: '#e5e7eb',
          borderRadius: '5px',
          flex: 1,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Thanh giá trị */}
        <div 
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${percent}%`,
            backgroundColor: 'var(--primary-color)',
            borderRadius: '5px',
            transition: 'width 0.5s ease-in-out'
          }}
        />
      </div>
      
      {/* Chỉ số phần trăm */}
      <span 
        style={{ 
          fontSize: '0.9rem', 
          fontWeight: '600', 
          color: '#9ca3af',
          minWidth: '35px'
        }}
      >
        {percent}%
      </span>
    </div>
  )
}

export default ProgressBar
