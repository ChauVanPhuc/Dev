import React from 'react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import { AlertCircle, Calendar } from 'lucide-react';

const WarningsView = () => {
  const warningList = [
    { id: 1, title: 'Cảnh báo độ ẩm gỗ vượt mức 12%', detail: 'Tổ sấy NM1 phát hiện lô gỗ tần bì (OAK) độ ẩm trung bình đạt 13.5%. Cần kiểm tra lò sấy.', date: '2026-06-26 14:30', level: 'high' },
    { id: 2, title: 'Lỗi bám dính sơn lô hàng APT0081', detail: 'Tổ kiểm tra OQC phát hiện hiện tượng rộp sơn nhẹ ở góc cạnh mặt bàn. Cần chỉnh sửa súng phun.', date: '2026-06-26 10:15', level: 'medium' },
    { id: 3, title: 'Sai lệch kích thước tay nắm CC192', detail: 'Phát hiện sai số độ dày chốt tay nắm +0.3mm. Yêu cầu tổ IQC đo kỹ các lô phụ kiện mới nhập.', date: '2026-06-25 16:45', level: 'medium' },
  ];

  return (
    <Layout>
      <div style={{ backgroundColor: 'var(--bg-cream)', minHeight: '100vh', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '100px' }}>
        <PageHeader title="G7 - Smart Flow" subTitle="MB21 | Cảnh báo lỗi" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {warningList.map((warn) => (
            <div
              key={warn.id}
              style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #e8e1d5', borderLeft: `5px solid ${warn.level === 'high' ? '#ef4444' : '#f59e0b'}`, display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#4b301e' }}>{warn.title}</span>
                <span style={{ fontSize: '10px', backgroundColor: warn.level === 'high' ? '#ef4444' : '#f59e0b', color: '#fff', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  {warn.level === 'high' ? 'Khẩn' : 'Cảnh báo'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#7c6d5e', lineHeight: '1.4' }}>{warn.detail}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '6px', marginTop: '4px' }}>
                <Calendar size={12} />
                <span>{warn.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default WarningsView;
