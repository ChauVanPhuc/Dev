import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

const CapaCauseModal = ({ isOpen, onClose, onConfirm, initialData = null }) => {
  const [directCause, setDirectCause] = useState('Do con người');
  const [whys, setWhys] = useState(['', '']);

  useEffect(() => {
    if (initialData) {
      setDirectCause(initialData.direct_cause || 'Do con người');
      setWhys(initialData.whys && initialData.whys.length > 0 ? initialData.whys : ['', '']);
    } else {
      setDirectCause('Do con người');
      setWhys(['', '']);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleWhyChange = (index, value) => {
    const updated = [...whys];
    updated[index] = value;
    setWhys(updated);
  };

  const handleAddWhy = () => {
    setWhys([...whys, '']);
  };

  const handleRemoveWhy = (index) => {
    if (whys.length <= 1) return;
    setWhys(whys.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      direct_cause: directCause,
      whys: whys.filter(w => w.trim() !== '')
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(4px)',
      zIndex: 2500,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        animation: 'modalSlideUp 0.2s ease-out'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          padding: '14px 16px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#1e293b' }}>
            CL10.3: Thêm nguyên nhân
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#1e293b',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Nguyên nhân trực tiếp */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
              Nguyên nhân trực tiếp <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={directCause}
              onChange={(e) => setDirectCause(e.target.value)}
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.84rem',
                color: '#1e293b',
                backgroundColor: '#fff'
              }}
            >
              <option value="Do con người">Do con người</option>
              <option value="Do máy móc">Do máy móc</option>
              <option value="Do nguyên vật liệu">Do nguyên vật liệu</option>
              <option value="Do phương pháp">Do phương pháp</option>
              <option value="Do môi trường">Do môi trường</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          {/* Dynamic Whys */}
          {whys.map((whyVal, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
                  {idx + 1}. Tại sao ? <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {whys.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveWhy(idx)}
                    style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                value={whyVal}
                onChange={(e) => handleWhyChange(idx, e.target.value)}
                placeholder={`Nhập lý do tại sao (${idx + 1})...`}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  color: '#1e293b',
                  resize: 'vertical'
                }}
              />
            </div>
          ))}

          {/* + Thêm tại sao Button */}
          <button
            type="button"
            onClick={handleAddWhy}
            style={{
              alignSelf: 'flex-start',
              border: 'none',
              background: 'transparent',
              color: '#7B5233',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '2px'
            }}
          >
            <Plus size={15} /> Thêm tại sao
          </button>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#fff',
                color: '#475569',
                fontWeight: '700',
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              Xóa
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#7B5233',
                color: '#fff',
                fontWeight: '700',
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              Xác nhận
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default CapaCauseModal;
