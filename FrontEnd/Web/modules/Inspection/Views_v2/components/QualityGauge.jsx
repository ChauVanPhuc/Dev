import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';

/**
 * Reusable Semi-Circle Gauge Chart for Quality Compliance Metrics
 * Styled with Walnut & Cream aesthetic, Forest Sage Green (#3F7D58) for positive state.
 */
export const QualityGauge = ({
  value = 95,
  maxValue = 100,
  unit = '%',
  title = '',
  targetText = 'Mục tiêu: >=95%',
  isMet = true,
  arcColor = '#3F7D58',
  trackColor = '#E4DDD5',
  size = 110,
  strokeWidth = 11,
  tooltipData = null
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);

  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2 + 10;
  
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));
  const halfCircumference = Math.PI * radius;
  const strokeDashoffset = halfCircumference * (1 - percentage / 100);

  const handleMouseEnter = () => {
    if (!triggerRef.current || !tooltipData) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 250;
    
    // Tính toán toạ độ hiển thị nổi bên ngoài theo viewport
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left < 10) left = 10;
    if (left + popoverWidth > window.innerWidth - 10) {
      left = window.innerWidth - popoverWidth - 10;
    }

    let top = rect.bottom + 6;
    if (top + 185 > window.innerHeight) {
      top = Math.max(10, rect.top - 185);
    }

    setCoords({ top, left });
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 8px',
        height: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        cursor: tooltipData ? 'pointer' : 'default',
        borderRadius: '6px'
      }}
    >
      {/* Title */}
      <div style={{
        fontSize: '0.74rem',
        fontWeight: '800',
        color: '#302820',
        textAlign: 'center',
        lineHeight: 1.2,
        minHeight: '22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <span>{title}</span>
      </div>

      {/* SVG Arc Gauge */}
      <div style={{ position: 'relative', width: size, height: size / 2 + 14, display: 'flex', justifyContent: 'center' }}>
        <svg width={size} height={size / 2 + 18} style={{ overflow: 'visible' }}>
          {/* Background Track */}
          <path
            d={`M ${strokeWidth / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Progress Arc */}
          <path
            d={`M ${strokeWidth / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
            fill="none"
            stroke={arcColor}
            strokeWidth={strokeWidth}
            strokeDasharray={halfCircumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>

        {/* Center Text */}
        <div style={{
          position: 'absolute',
          bottom: '2px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#302820', letterSpacing: '-0.5px' }}>
            {value}
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#786B61' }}>
            {unit}
          </span>
        </div>
      </div>

      {/* Target & Met Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.66rem',
        color: isMet ? '#3F7D58' : '#B94A3D',
        fontWeight: '800',
        marginTop: '2px',
        backgroundColor: isMet ? '#EBF3EE' : '#F9EBE9',
        padding: '2px 8px',
        borderRadius: '10px',
        border: `1px solid ${isMet ? '#C6DEC7' : '#EDC7C2'}`
      }}>
        <span>{targetText}</span>
      </div>

      {/* ─── FLOATING PORTAL POPOVER ─── */}
      {isHovered && coords && tooltipData && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          top: coords.top,
          left: coords.left,
          width: '250px',
          backgroundColor: '#FFFDFC',
          color: '#302820',
          borderRadius: '6px',
          padding: '8px 10px',
          fontSize: '0.66rem',
          boxShadow: '0 12px 28px rgba(91, 57, 36, 0.16), 0 3px 8px rgba(91, 57, 36, 0.08)',
          border: '1px solid #E4DDD5',
          zIndex: 999999,
          pointerEvents: 'none',
          lineHeight: 1.4
        }}>
          {/* Header */}
          <div style={{
            fontSize: '0.72rem',
            fontWeight: '800',
            color: '#5B3924',
            borderBottom: '1px solid #E4DDD5',
            paddingBottom: '4px',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{tooltipData.title}</span>
            <span style={{ fontSize: '0.62rem', color: '#3F7D58', fontWeight: '800' }}>
              Thực tế: {value}{unit}
            </span>
          </div>

          {/* Quick Metrics Grid */}
          {tooltipData.metrics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '6px', textAlign: 'center' }}>
              {tooltipData.metrics.map((m, idx) => (
                <div key={idx} style={{ background: '#F7F4F0', padding: '3px 2px', borderRadius: '4px', border: '1px solid #E4DDD5' }}>
                  <div style={{ fontSize: '0.56rem', color: '#786B61', fontWeight: '600' }}>{m.label}</div>
                  <div style={{ fontSize: '0.74rem', fontWeight: '900', color: m.color || '#302820', marginTop: '1px' }}>
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Details / Breakdown Sections */}
          {tooltipData.sections && tooltipData.sections.map((sec, sIdx) => (
            <div key={sIdx} style={{ marginBottom: '4px' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: '800', color: '#5B3924', marginBottom: '2px' }}>
                {sec.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '2px' }}>
                {sec.items.map((item, iIdx) => (
                  <div key={iIdx} style={{ fontSize: '0.62rem', color: '#786B61', fontWeight: '600' }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Footer Note */}
          {tooltipData.footer && (
            <div style={{
              marginTop: '5px',
              paddingTop: '4px',
              borderTop: '1px dashed #E4DDD5',
              fontSize: '0.58rem',
              color: '#3F7D58',
              fontWeight: '700'
            }}>
              {tooltipData.footer}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default QualityGauge;
