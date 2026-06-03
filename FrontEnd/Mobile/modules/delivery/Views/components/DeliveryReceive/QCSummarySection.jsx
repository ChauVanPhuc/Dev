import React from 'react';
import { Package, Check, X, ClipboardCheck } from 'lucide-react';

const QCSummarySection = ({
  delivery,
  totalHandover,
  totalReceived,
  totalInspected,
  setTotalInspected,
  qcData,
  setQcData,
  inspectionResult,
  setInspectionResult
}) => {
  const calcErrorRate = () => {
    const scrap = parseFloat(qcData.scrap_qty) || 0;
    const actual = parseFloat(totalInspected) || 0; // Chia cho số lượng THỰC KIỂM
    return actual > 0 ? ((scrap / actual) * 100).toFixed(0) : 0;
  };

  // Tự động chuyển sang Fail nếu tỷ lệ lỗi hơn 20%
  React.useEffect(() => {
    const scrap = parseFloat(qcData.scrap_qty) || 0;
    const actual = parseFloat(totalInspected) || 0;
    const rate = actual > 0 ? (scrap / actual) * 100 : 0;
    if (rate > 20) {
      setInspectionResult('fail');
    } else {
      setInspectionResult('pass');
    }
  }, [qcData.scrap_qty, totalInspected, setInspectionResult]);

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '16px',
      padding: '16px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
      marginBottom: '80px',
      border: '1px solid #f1f5f9'
    }}>
      <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#334155', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Package size={18} color="#64748b" /> Thông tin xác nhận
      </h3>

      {/* Hàng 1: Grid 3 cột Compact */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px', marginLeft: '2px' }}>Chi tiết</label>
          <div style={{ width: '100%', height: '34px', padding: '0 10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', fontWeight: '600', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {delivery?.part_name || '...'}
          </div>
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px', textAlign: 'center' }}>Cần kiểm</label>
          <div style={{ width: '100%', height: '34px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
            {Math.ceil((parseFloat(totalReceived) || 0) * 0.2)}
          </div>
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: '800', color: '#ef4444', display: 'block', marginBottom: '4px', textAlign: 'center' }}>Thực kiểm</label>
          <input
            type="number"
            value={totalInspected}
            onChange={e => {
              const val = e.target.value;
              const max = parseFloat(totalReceived) || 0; // Không được kiểm quá số lượng nhận
              if (parseFloat(val) > max) {
                setTotalInspected(max.toString());
              } else {
                setTotalInspected(val);
              }
            }}
            style={{
              width: '100%',
              height: '34px',
              backgroundColor: '#fff',
              borderRadius: '8px',
              border: '1.5px solid #fee2e2',
              textAlign: 'center',
              color: '#1e293b',
              fontWeight: '900',
              fontSize: '1rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Hàng 2: Ghi chú & (SL Loại + Tỉ lệ) Compact */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ flex: 1.8 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px', marginLeft: '2px' }}>Ghi chú</label>
          <textarea
            rows="5"
            value={qcData.note}
            onChange={e => setQcData(p => ({ ...p, note: e.target.value }))}
            placeholder="Nhập ghi chú..."
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              fontSize: '0.85rem',
              resize: 'none',
              lineHeight: '1.4',
              backgroundColor: '#fcfcfc',
              outline: 'none'
            }}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>SL Lỗi</label>
            <input
              type="number"
              value={qcData.scrap_qty}
              onChange={e => {
                let val = parseFloat(e.target.value) || 0;
                const actual = parseFloat(totalInspected) || 0; // SL Lỗi không vượt quá số lượng đã kiểm
                if (val < 0) val = 0;
                if (val > actual) val = actual;
                setQcData(p => ({ ...p, scrap_qty: val.toString() }));
              }}
              style={{
                width: '100%', height: '34px', padding: '0 10px', borderRadius: '10px',
                border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: '900',
                fontSize: '1rem', color: '#1e293b', outline: 'none'
              }}
            />
          </div>
          <div style={{
            flex: 0.8,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundColor: '#fff1f2',
            borderRadius: '10px',
            padding: '4px'
          }}>
            <div style={{ fontSize: '0.6rem', fontWeight: '800', color: '#f43f5e', textTransform: 'uppercase' }}>Tỷ lệ lỗi</div>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#e11d48' }}>
              {calcErrorRate()}<span style={{ fontSize: '0.7rem' }}>%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Kết quả kiểm tra */}
      <div style={{ marginTop: '15px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#334155', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ClipboardCheck size={18} color="#64748b" /> Kết quả kiểm tra
        </h3>
        <div style={{
          display: 'flex',
          backgroundColor: '#f1f5f9',
          padding: '3px',
          borderRadius: '11px',
          gap: '3px'
        }}>
          <div
            onClick={() => setInspectionResult('pass')}
            style={{
              flex: 1,
              padding: '8px',
              textAlign: 'center',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: inspectionResult === 'pass' ? '#22c55e' : 'transparent',
              color: inspectionResult === 'pass' ? '#fff' : '#64748b',
              fontWeight: '800',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'backgroundColor 0.2s, color 0.2s'
            }}
          >
            {inspectionResult === 'pass' && <Check size={16} strokeWidth={3} />} Đạt
          </div>
          <div
            onClick={() => setInspectionResult('fail')}
            style={{
              flex: 1,
              padding: '8px',
              textAlign: 'center',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: inspectionResult === 'fail' ? '#ef4444' : 'transparent',
              color: inspectionResult === 'fail' ? '#fff' : '#64748b',
              fontWeight: '800',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'backgroundColor 0.2s, color 0.2s'
            }}
          >
            {inspectionResult === 'fail' && <X size={16} strokeWidth={3} />} Chưa Đạt
          </div>
        </div>
      </div>
    </div>
  );
};

export default QCSummarySection;
