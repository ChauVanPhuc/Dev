import React from 'react';
import { Image as ImageIcon, Pencil } from 'lucide-react';
import pendingQCStore from '@modules/delivery/Models/pendingQCStore';

const InspectionChecklist = ({ id, qcData, navigate }) => {
  const checklistItems = [
    { key: 'moisture', label: 'Kiểm tra độ ẩm' },
    { key: 'bend', label: 'Kiểm tra độ cong' },
    { key: 'visual', label: 'Kiểm tra bám dính sơn' },
    { key: 'size', label: 'Kiểm tra kích thước' },
    { key: 'structure', label: 'Kiểm tra kết cấu' },
    { key: 'functional', label: 'Kiểm tra tính năng' },
    { key: 'visual_ext', label: 'Kiểm tra ngoại quan' }
  ];

  const completedCount = Object.values(qcData).filter(
    v => v && typeof v === 'object' && v.hasOwnProperty('is_pass') && v.is_pass !== null
  ).length;

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#475569', margin: 0 }}>Checklist kiểm tra</h3>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700', marginTop: '2px' }}>
            Tiến độ: {completedCount}/7 tiêu chí
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7c5438', fontSize: '0.95rem', fontWeight: '800', cursor: 'pointer' }}>
          <span style={{ borderBottom: '1.5px solid #7c5438', display: 'flex', alignItems: 'center', gap: '4px', paddingBottom: '2px' }}>
            <ImageIcon size={18} /> Xem TCKT
          </span>
        </div>
      </div>

      <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#78523b', color: '#fff' }}>
              <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: '700', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Nội dung</th>
              <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', borderRight: '1px solid rgba(255,255,255,0.1)', width: '85px' }}>Trạng thái</th>
              <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', width: '65px' }}>Thực hiện</th>
            </tr>
          </thead>
          <tbody>
            {checklistItems.map((item, idx) => {
              const isPending = !!pendingQCStore.get(id, item.key);
              const isPassVal = qcData[item.key]?.is_pass;
              return (
                <tr key={item.key} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fcfaf9', borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 12px', color: '#334155', fontWeight: '600' }}>{item.label}</td>
                  <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: '800',
                        color: isPassVal === true ? '#22c55e' : (isPassVal === false ? '#ef4444' : '#94a3b8')
                      }}>
                        {isPassVal === true ? 'Đạt' : (isPassVal === false ? 'Chưa Đạt' : 'chưa KT')}
                      </span>
                      {isPending && isPassVal !== null && (
                        <span style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: '700', backgroundColor: '#fffbeb', padding: '1px 5px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                          chờ lưu
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                    <button
                      onClick={() => navigate(`/quality-detail/${id}/${item.key}`, { state: { label: item.label } })}
                      style={{ background: 'none', border: 'none', color: '#64748b' }}
                    >
                      <Pencil size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InspectionChecklist;
