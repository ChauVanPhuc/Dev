import React, { useState, useEffect } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import '@styles/components.css';

const EquipmentTrainingDetailView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  const navigate = useNavigate();
  const { id } = useParams();

  const [training, setTraining] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCustomScreenCode('AD37.6');
    setCustomTitle('Chi tiết đào tạo vận hành');
    setCustomSubtitle('Xem thông tin chi tiết biên bản, kết quả đánh giá và nội dung tài liệu đào tạo.');

    const fetchTrainingDetail = async () => {
      setLoading(true);
      try {
        const data = await api.get('/equipments/trainings');
        if (Array.isArray(data)) {
          const found = data.find(t => t.id === parseInt(id));
          setTraining(found || null);
        }
      } catch (error) {
        console.error('Lỗi khi tải chi tiết đào tạo:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrainingDetail();
  }, [id]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải chi tiết đào tạo...</div>;
  }

  if (!training) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h4 style={{ color: '#ef4444' }}>Không tìm thấy thông tin cuộc đào tạo này</h4>
        <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/admin/equipment/training')}>
          Quay lại danh sách đào tạo
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          onClick={() => navigate('/admin/equipment/training')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none',
            color: '#64748b', fontWeight: '700', cursor: 'pointer', fontSize: '14px'
          }}
        >
          <ArrowLeft size={16} /> Quay lại danh sách đào tạo
        </button>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
            backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '8px',
            fontWeight: '700', fontSize: '13px', cursor: 'pointer'
          }}
        >
          <Download size={16} /> Tải tài liệu về máy (.PDF)
        </button>
      </div>

      <div className="card" style={{ padding: '24px', borderRadius: '16px', backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '900', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>Thông tin tài liệu đào tạo</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '25px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Tên tệp</label>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#A0301B', marginTop: '4px' }}>{training.file_name}</div>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Loại đào tạo</label>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginTop: '4px' }}>{training.file_type || 'Đào tạo vận hành'}</div>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Người tải lên</label>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#334155', marginTop: '4px' }}>{training.uploader || 'admin'}</div>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Kết quả sau đánh giá</label>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#16a34a', marginTop: '4px' }}>{training.evaluation_result || 'Đạt yêu cầu'}</div>
          </div>
        </div>

        {/* Document preview zone */}
        <div style={{
          border: '1px solid #cbd5e1', borderRadius: '12px', minHeight: '380px', backgroundColor: '#f8fafc',
          padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', boxSizing: 'border-box'
        }}>
          <FileText size={64} color="#64748b" style={{ marginBottom: '15px' }} />
          <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '800', color: '#334155' }}>
            Hiển thị nội dung tệp đính kèm tương ứng
          </h4>
          <p style={{ maxWidth: '600px', color: '#64748b', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
            {training.file_content_preview || 
             'Hệ thống đang tải và kết xuất nội dung tài liệu vận hành an toàn...'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EquipmentTrainingDetailView;
