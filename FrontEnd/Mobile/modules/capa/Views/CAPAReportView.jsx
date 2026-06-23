import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, User, Eye, ChevronRight, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import apiClient from '@shared/services/api';

const CAPAReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [capaData, setCapaData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fallback offline mock data matching DB structure
  const fallbackCapaDetail = {
    id: parseInt(id) || 1,
    error_name: 'Cong vênh',
    description: 'Cánh cửa bị cong dẫn đến đóng không được khít, độ lệch vượt qua sai số cho phép (>2mm). Cần khắc phục gấp.',
    severity: 'Nghiêm trọng',
    assigned_person: 'Hà Minh Xuân',
    images: '[]',
    occurrences: [
      {
        id: 2,
        occurrence_number: 2,
        occurrence_date: '27/08/2025',
        container_code: 'APT0056',
        product_name: 'T48s',
        quantity: 12,
        inspector_name: 'Hà Minh Xuân',
        status: 'Chờ đánh giá'
      },
      {
        id: 1,
        occurrence_number: 1,
        occurrence_date: '27/08/2024',
        container_code: 'APT0042',
        product_name: 'T48s',
        quantity: 150,
        inspector_name: 'Hà Minh Xuân',
        status: 'Đã đóng'
      }
    ]
  };

  useEffect(() => {
    let active = true;
    const fetchCapaDetail = async () => {
      try {
        const resp = await apiClient.get(`/capas/${id}`);
        if (active) {
          setCapaData(resp.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải chi tiết CAPA, dùng mock:', err);
        if (active) {
          setCapaData(fallbackCapaDetail);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchCapaDetail();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <PageHeader title="G7 - Smart Flow" subTitle="Báo cáo CAPA" />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, backgroundColor: 'var(--bg-cream)' }}>
          <div style={{ color: '#8c7e6e', fontWeight: '500' }}>Đang tải thông tin chi tiết CAPA...</div>
        </div>
      </Layout>
    );
  }

  if (!capaData) {
    return (
      <Layout>
        <PageHeader title="G7 - Smart Flow" subTitle="Báo cáo CAPA" />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, backgroundColor: 'var(--bg-cream)' }}>
          <div style={{ color: '#991b1b', fontWeight: '600' }}>Không tìm thấy dữ liệu CAPA.</div>
        </div>
      </Layout>
    );
  }

  // Parse images if any
  let imageList = [];
  try {
    imageList = typeof capaData.images === 'string' ? JSON.parse(capaData.images) : (capaData.images || []);
  } catch (e) {
    console.error(e);
  }

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'Nghiêm trọng': return { bg: '#fee2e2', text: '#ef4444', border: '#fca5a5' };
      case 'Nặng': return { bg: '#ffedd5', text: '#f97316', border: '#fed7aa' };
      case 'Nhẹ': return { bg: '#fef9c3', text: '#eab308', border: '#fef08a' };
      default: return { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' };
    }
  };

  const currentSevColors = getSeverityColor(capaData.severity);

  return (
    <Layout>
      <PageHeader title="G7 - Smart Flow" subTitle="MH14 | Đánh giá CAPA" />

      <div style={{ padding: '0px', backgroundColor: 'var(--bg-cream)', flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Main scrollable body */}
        <div style={{ padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          
          {/* Images Section */}
          <div id="capa-report-images" style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
            border: '1px solid #e8e1d5'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#4b301e', marginBottom: '12px' }}>Hình ảnh lỗi ghi nhận</h3>
            {imageList.length === 0 ? (
              <div style={{
                height: '140px',
                borderRadius: '12px',
                backgroundColor: '#f9f6f0',
                border: '2px dashed #e8e1d5',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#8c7e6e'
              }}>
                <ImageIcon size={32} strokeWidth={1.5} />
                <span style={{ fontSize: '13px', fontWeight: '500' }}>Không có hình ảnh đính kèm</span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                {imageList.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt="capa defect"
                    style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                ))}
              </div>
            )}
          </div>
 
          {/* Defect Information Card */}
          <div id="capa-report-info" style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
            border: '1px solid #e8e1d5',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifycontent: 'space-between', alignitems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#4b301e', margin: 0 }}>
                {capaData.error_name}
              </h2>
              <span style={{
                backgroundColor: currentSevColors.bg,
                color: currentSevColors.text,
                border: `1px solid ${currentSevColors.border}`,
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700'
              }}>
                {capaData.severity}
              </span>
            </div>
 
            <div style={{ fontSize: '14px', color: '#4b301e', lineheight: '1.5', whitespace: 'pre-line' }}>
              <strong>Mô tả:</strong> {capaData.description}
            </div>
 
            <div style={{ borderTop: '1px solid #f0ede8', paddingtop: '12px', display: 'flex', justifycontent: 'space-between', fontSize: '13px', color: '#7c6d5e' }}>
              <div style={{ display: 'flex', alignitems: 'center', gap: '6px' }}>
                <User size={16} />
                <span>Người phụ trách: <strong>{capaData.assigned_person}</strong></span>
              </div>
            </div>
          </div>
 
          {/* Severity Option Buttons (Static display matching wireframe) */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
            border: '1px solid #e8e1d5'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#4b301e', marginBottom: '12px' }}>Mức độ lỗi</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {['Nghiêm trọng', 'Nặng', 'Nhẹ'].map(sev => {
                const isActive = capaData.severity === sev;
                const colors = getSeverityColor(sev);
                return (
                  <div
                    key={sev}
                    style={{
                      padding: '12px 6px',
                      borderRadius: '10px',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: '700',
                      border: isActive ? `1.5px solid ${colors.text}` : '1.5px solid #e8e1d5',
                      backgroundColor: isActive ? colors.bg : '#fff',
                      color: isActive ? colors.text : '#8c7e6e',
                      transition: 'all 0.2s'
                    }}
                  >
                    {sev}
                  </div>
                );
              })}
            </div>
          </div>
 
          {/* Occurrence Versions List */}
          <div id="capa-report-history" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#4b301e', margin: '4px 0 0' }}>Lịch sử các lần ghi nhận</h3>
            
            {capaData.occurrences.map((occ) => {
              const isClosed = occ.status === 'Đã đóng';
              return (
                <div
                  key={occ.id}
                  onClick={() => navigate(`/capa-detail/${capaData.id}/${occ.id}`)}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    border: '1px solid #e8e1d5',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'transform 0.1s'
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: '#4b301e' }}>
                        Lần {occ.occurrence_number}
                      </span>
                      <span style={{
                        backgroundColor: isClosed ? '#dcfce7' : '#fef9c3',
                        color: isClosed ? '#166534' : '#854d0e',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}>
                        {occ.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: '#7c6d5e' }}>
                      Mã cont: <strong style={{ color: '#4b301e' }}>{occ.container_code}</strong> | SP: <strong style={{ color: '#4b301e' }}>{occ.product_name}</strong>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#8c7e6e', marginTop: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        <span>{occ.occurrence_date}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} />
                        <span>SL: {occ.quantity} | K/s: {occ.inspector_name}</span>
                      </div>
                    </div>
                  </div>
                  
                  <ChevronRight size={20} color="#8c7e6e" />
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </Layout>
  );
};

export default CAPAReport;
