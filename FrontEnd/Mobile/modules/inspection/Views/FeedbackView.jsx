import React, { useState } from 'react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FeedbackView = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('Vui lòng nhập nội dung góp ý!');
      return;
    }
    setIsSuccessOpen(true);
  };

  return (
    <Layout>
      <div style={{ backgroundColor: 'var(--bg-cream)', minHeight: '100vh', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '100px' }}>
        <PageHeader title="G7 - Smart Flow" subTitle="MB19 | Góp ý cải tiến" />

        <form onSubmit={handleSubmit} style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '20px', border: '1px solid #e8e1d5', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#4b301e', display: 'block', marginBottom: '8px' }}>Đánh giá chất lượng quy trình di động:</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  style={{ border: 'none', backgroundColor: 'transparent', fontSize: '24px', cursor: 'pointer', color: star <= rating ? '#f59e0b' : '#cbd5e1' }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#4b301e', display: 'block', marginBottom: '8px' }}>Nội dung góp ý / Ý tưởng cải tiến:</label>
            <textarea
              rows="5"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập ý kiến của bạn để giúp chúng tôi hoàn thiện hệ thống tốt hơn..."
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'none' }}
            />
          </div>

          <button
            type="submit"
            style={{ width: '100%', backgroundColor: '#4b301e', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px' }}
          >
            <Check size={18} /> Gửi góp ý
          </button>
        </form>

        <MessageModal
          isOpen={isSuccessOpen}
          type="success"
          title="Thành công"
          message="Cảm ơn đóng góp của bạn! Ý kiến của bạn đã được chuyển tới Ban Giám Đốc."
          onConfirm={() => {
            setIsSuccessOpen(false);
            navigate('/dashboard');
          }}
        />
      </div>
    </Layout>
  );
};

export default FeedbackView;
