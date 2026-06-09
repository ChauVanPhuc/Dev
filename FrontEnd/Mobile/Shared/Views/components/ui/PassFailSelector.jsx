import React from 'react';
import { CheckCircle2, XCircle, Check, X } from 'lucide-react';

/**
 * PassFailSelector Component
 * Unified component for Pass/Fail selection across inspection pages
 * 
 * @param {Object} props
 * @param {string} props.label - Label for the entire selector (radio variant only)
 * @param {string} props.value - Current value: 'pass', 'fail', true, false, or null
 * @param {Function} props.onChange - Callback when selection changes
 * @param {boolean} props.disabled - Whether the selector is disabled
 * @param {string} props.variant - 'radio' (default) or 'button' style
 * @param {string} props.passLabel - Label for pass option (default: 'Đạt')
 * @param {string} props.failLabel - Label for fail option (default: 'Chưa Đạt')
 * @param {boolean} props.showIcons - Whether to show icons (default: true)
 */
const PassFailSelector = ({
  label,
  value,
  onChange,
  disabled = false,
  variant = 'radio',
  passLabel = 'Đạt',
  failLabel = 'Chưa Đạt',
  showIcons = true
}) => {
  // Normalize value to boolean for comparison
  const isPass = value === 'pass' || value === true;
  const isFail = value === 'fail' || value === false;

  // Radio variant (used in StageInspectionView)
  if (variant === 'radio') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '12px' }}>
        <span style={{ flex: 1, fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>{label}</span>
        <div style={{ display: 'flex', gap: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: disabled ? 'default' : 'pointer' }}>
            <input
              type="radio"
              checked={isPass}
              onChange={() => !disabled && onChange && onChange('pass')}
              disabled={disabled}
              style={{ accentColor: '#22c55e', width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '0.9rem', color: '#22c55e', fontWeight: '700' }}>{passLabel}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: disabled ? 'default' : 'pointer' }}>
            <input
              type="radio"
              checked={isFail}
              onChange={() => !disabled && onChange && onChange('fail')}
              disabled={disabled}
              style={{ accentColor: '#ef4444', width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: '700' }}>{failLabel}</span>
          </label>
        </div>
      </div>
    );
  }

  // Button variant (used in InputInspectionView, QualityInspectionDetailView)
  return (
    <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '10px', gap: '3px' }}>
      <div
        onClick={() => !disabled && onChange && onChange('pass')}
        style={{
          flex: 1,
          padding: '8px',
          textAlign: 'center',
          borderRadius: '8px',
          cursor: disabled ? 'default' : 'pointer',
          transition: '0.3s',
          backgroundColor: isPass ? '#22c55e' : 'transparent',
          color: isPass ? '#fff' : '#64748b',
          fontWeight: '800',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          opacity: disabled && !isPass ? 0.4 : 1
        }}
      >
        {showIcons && (isPass ? <Check size={16} strokeWidth={3} /> : <CheckCircle2 size={16} color={isPass ? '#fff' : '#cbd5e1'} strokeWidth={2.5} />)}
        {passLabel}
      </div>
      <div
        onClick={() => !disabled && onChange && onChange('fail')}
        style={{
          flex: 1,
          padding: '8px',
          textAlign: 'center',
          borderRadius: '8px',
          cursor: disabled ? 'default' : 'pointer',
          transition: '0.3s',
          backgroundColor: isFail ? '#ef4444' : 'transparent',
          color: isFail ? '#fff' : '#64748b',
          fontWeight: '800',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          opacity: disabled && !isFail ? 0.4 : 1
        }}
      >
        {showIcons && (isFail ? <X size={16} strokeWidth={3} /> : <XCircle size={16} color={isFail ? '#fff' : '#cbd5e1'} strokeWidth={2.5} />)}
        {failLabel}
      </div>
    </div>
  );
};

export default PassFailSelector;
