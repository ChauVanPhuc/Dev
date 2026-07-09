import React from 'react';
import { Minus, Plus } from 'lucide-react';

/**
 * Stepper Component
 * Một bộ tăng giảm số lượng phong cách hiện đại cho Mobile ERP.
 */
const Stepper = ({ value = 0, onChange, min = 0, max = 999999 }) => {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      backgroundColor: '#f1f5f9', 
      borderRadius: '12px', 
      padding: '4px',
      border: '1px solid #e2e8f0'
    }}>
      <button 
        onClick={handleDecrement}
        disabled={value <= min}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#3b2f2f',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          opacity: value <= min ? 0.5 : 1
        }}
      >
        <Minus size={18} strokeWidth={3} />
      </button>
      
      <div style={{ 
        minWidth: '45px', 
        textAlign: 'center', 
        fontWeight: '700', 
        fontSize: '1rem',
        color: '#1e293b'
      }}>
        {value}
      </div>
      
      <button 
        onClick={handleIncrement}
        disabled={value >= max}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#3b2f2f',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          opacity: value >= max ? 0.5 : 1
        }}
      >
        <Plus size={18} strokeWidth={3} />
      </button>
    </div>
  );
};

export default Stepper;
