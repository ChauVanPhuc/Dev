import React, { useState } from 'react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import { AlertOctagon, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CtqSosView = () => {
  const navigate = useNavigate();
  const [partName, setPartName] = useState('');
  const [machine, setMachine] = useState('');
  const [issue, setIssue] = useState('');
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!partName.trim() || !issue.trim()) {
      alert('Vui lòng điền đầy đủ Tên chi tiết và Nội dung sự cố!');
      return;
    }
    setIsSuccessOpen(true);
  };

  return (
    <Layout>
      <div style={{ backgroundColor: 'var(--bg-cream)', flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '100px' }}>
        <PageHeader title="G7 - Smart Flow" subTitle="MB20 | Báo cáo CTQ / SOS" />

        <form onSubmit={handleSubmit} style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '20px', border: '1px solid #e8e1d5', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '12px', border: '1px solid #fee2e2', color: '#ef4444' }}>
            <AlertOctagon size={24} />
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Khai báo sự cố khẩn cấp (SOS) hoặc thông số kiểm soát chất lượng trọng yếu (CTQ).</span>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#4b301e', display: 'block', marginBottom: '6px' }}>Tên chi tiết / Mặt hàng:</label>
            <input
              type="text"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              placeholder="VD: Tay nắm CC192 brass"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#4b301e', display: 'block', marginBottom: '6px' }}>Máy móc / Công đoạn xảy ra sự cố:</label>
            <input
              type="text"
              value={machine}
              onChange={(e) => setMachine(e.target.value)}
              placeholder="VD: Máy phay chốt / Tổ ráp 1"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#4b301e', display: 'block', marginBottom: '6px' }}>Mô tả chi tiết sự cố / Lỗi kỹ thuật:</label>
            <textarea
              rows="4"
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="Mô tả cụ thể sự cố cần cảnh báo..."
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'none' }}
            />
          </div>

          <button
            type="submit"
            style={{ width: '100%', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)' }}
          >
            <AlertOctagon size={18} /> PHÁT TÍN HIỆU SOS
          </button>
        </form>

        <MessageModal
          isOpen={isSuccessOpen}
          type="success"
          title="Đã phát tín hiệu"
          message="Báo cáo CTQ / SOS đã được gửi khẩn cấp tới bộ phận chất lượng và Ban quản lý."
          onConfirm={() => {
            setIsSuccessOpen(false);
            navigate('/dashboard');
          }}
        />
      </div>
    </Layout>
  );
};

export default CtqSosView;
