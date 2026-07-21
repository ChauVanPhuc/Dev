import React, { useState, useEffect } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, FileText, X } from 'lucide-react';
import '@styles/components.css';
import EquipmentHandover from './EquipmentHandoverView';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const EquipmentDetailView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  
  // Lấy metadata từ database thay vì hardcode
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/equipment/:id');
  const navigate = useNavigate();
  const { id } = useParams();

  const [equipment, setEquipment] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  // PDF Preview States
  const [showPdfReader, setShowPdfReader] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfBase64Data, setPdfBase64Data] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageError, setImageError] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const eqData = await api.get('/equipments/');
      if (Array.isArray(eqData)) {
        const found = eqData.find(item => item.id === parseInt(id));
        setEquipment(found || null);
      }

      const inspData = await api.get('/equipments/inspections');
      setInspections(Array.isArray(inspData) ? inspData : []);
    } catch (error) {
      console.error('Lỗi khi tải thông tin chi tiết thiết bị:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải chi tiết thiết bị...</div>;
  }

  if (!equipment) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h4 style={{ color: '#ef4444' }}>Không tìm thấy thông tin thiết bị này</h4>
        <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/admin/equipment')}>
          Quay lại danh sách thiết bị
        </button>
      </div>
    );
  }

  // Handle PDF preview click
  const handleOpenPdfReader = (pdfStr) => {
    if (pdfStr.includes('|')) {
      const parts = pdfStr.split('|');
      setPdfFileName(parts[0]);
      setPdfBase64Data(parts[1]);
    } else {
      setPdfFileName(pdfStr);
      setPdfBase64Data('');
    }
    setShowPdfReader(true);
  };

  const steps = (() => {
    try {
      return JSON.parse(equipment.user_manual_steps || '[]');
    } catch(e) {
      return [];
    }
  })();

  const matchedInsps = inspections.filter(i => i.equipment_id === equipment.id);

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Zone */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          onClick={() => navigate('/admin/equipment')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none',
            color: '#64748b', fontWeight: '700', cursor: 'pointer', fontSize: '14px'
          }}
        >
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>
        <button
          onClick={() => setShowEditModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
            backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '8px',
            fontWeight: '700', fontSize: '13px', cursor: 'pointer'
          }}
        >
          <Edit size={16} /> Chỉnh sửa thông tin
        </button>
      </div>

      {/* Section 1: Main Info Card */}
      <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '900', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>Thông tin thiết bị</h3>
        <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
          {/* Avatar placeholder with actual image rendering */}
          {(() => {
            const parseImages = (imagesStr) => {
              if (!imagesStr || !imagesStr.trim()) return [];
              let list = [];
              try {
                const parsed = JSON.parse(imagesStr);
                if (Array.isArray(parsed)) list = parsed;
                else if (typeof parsed === 'string') list = [parsed];
              } catch {
                if (imagesStr.includes(',')) {
                  list = imagesStr.split(',');
                } else {
                  list = [imagesStr];
                }
              }
              return list
                .map(item => String(item).trim())
                .filter(item => item && item !== 'null' && item !== 'undefined' && item !== 'none')
                .map(item => (item.startsWith('/') && !item.startsWith('//')) ? getBaseURL() + item : item);
            };
            const activeImages = parseImages(equipment.images);
            const currentImgSrc = activeImages[activeImageIndex] || activeImages[0];
            const hasValidImage = activeImages.length > 0 && currentImgSrc && !imageError[currentImgSrc];

            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <div style={{
                  width: '120px', height: '120px', borderRadius: '60px', backgroundColor: '#7B5233',
                  display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '48px', fontWeight: '800', overflow: 'hidden'
                }}>
                  {hasValidImage ? (
                    <img 
                      src={currentImgSrc} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      alt={equipment.name} 
                      onError={() => {
                        setImageError(prev => ({ ...prev, [currentImgSrc]: true }));
                      }}
                    />
                  ) : (
                    <span>{equipment.name ? equipment.name.charAt(0).toUpperCase() : 'E'}</span>
                  )}
                </div>

                {/* Thumbnails list if multiple images exist */}
                {activeImages.length > 1 && (
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {activeImages.map((imgUrl, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setActiveImageIndex(idx)}
                        style={{ 
                          width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', 
                          border: idx === activeImageIndex ? '2px solid #7B5233' : '1px solid #cbd5e1',
                          cursor: 'pointer', transition: 'all 0.2s ease', opacity: idx === activeImageIndex ? 1 : 0.7
                        }}
                      >
                        <img src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          {/* Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px 30px', flex: 1 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Mã thiết bị</label>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b', marginTop: '4px' }}>{equipment.code}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Tên thiết bị</label>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginTop: '4px' }}>{equipment.name}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Trạng thái</label>
              <div style={{ marginTop: '4px' }}>
                <span style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800',
                  backgroundColor: equipment.status === 'Bình thường' ? '#dcfce7' : equipment.status === 'Bảo trì' ? '#fef3c7' : '#fee2e2',
                  color: equipment.status === 'Bình thường' ? '#15803d' : equipment.status === 'Bảo trì' ? '#b45309' : '#b91c1c'
                }}>
                  {equipment.status}
                </span>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Bộ phận phụ trách</label>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#334155', marginTop: '4px' }}>{equipment.department || '—'}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Người sở hữu</label>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginTop: '4px' }}>{equipment.owner_name || 'Chưa bàn giao'}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Ngày hiệu chuẩn</label>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#334155', marginTop: '4px' }}>{equipment.calibration_date || '—'}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Ngày bàn giao</label>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#334155', marginTop: '4px' }}>{equipment.handover_date || '—'}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Ngày kiểm tra</label>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#334155', marginTop: '4px' }}>{equipment.check_date || '—'}</div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Biên bản bàn giao</label>
              <div style={{ marginTop: '4px' }}>
                {equipment.attachment_pdf ? (
                  <a 
                    href="#" 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      handleOpenPdfReader(equipment.attachment_pdf); 
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#A0301B', fontWeight: '700', fontSize: '13px', textDecoration: 'underline' }}
                  >
                    <FileText size={15} /> 
                    {equipment.attachment_pdf.includes('|') ? equipment.attachment_pdf.split('|')[0] : equipment.attachment_pdf}
                  </a>
                ) : <span style={{ color: '#94a3b8', fontSize: '13px' }}>Chưa đính kèm</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Inspection logs list */}
      <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '900', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>Lịch sử kiểm tra</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>
              <th style={{ padding: '10px 15px', color: '#64748b', fontSize: '11px', fontWeight: '800', textAlign: 'left' }}>Ngày kiểm tra</th>
              <th style={{ padding: '10px 15px', color: '#64748b', fontSize: '11px', fontWeight: '800', textAlign: 'left' }}>Người thực hiện</th>
              <th style={{ padding: '10px 15px', color: '#64748b', fontSize: '11px', fontWeight: '800', textAlign: 'left' }}>Người kiểm chứng</th>
              <th style={{ padding: '10px 15px', color: '#64748b', fontSize: '11px', fontWeight: '800', textAlign: 'left' }}>Trạng thái</th>
              <th style={{ padding: '10px 15px', color: '#64748b', fontSize: '11px', fontWeight: '800', textAlign: 'left' }}>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {matchedInsps.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Chưa ghi nhận lịch sử kiểm tra.</td>
              </tr>
            ) : (
              matchedInsps.map((insp) => (
                <tr key={insp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 15px', fontSize: '13px', fontWeight: '600' }}>{insp.check_date}</td>
                  <td style={{ padding: '10px 15px', fontSize: '13px' }}>{insp.performed_by || '—'}</td>
                  <td style={{ padding: '10px 15px', fontSize: '13px' }}>{insp.verified_by || '—'}</td>
                  <td style={{ padding: '10px 15px', fontSize: '12px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800',
                      backgroundColor: insp.status === 'Bình thường' ? '#dcfce7' : '#fee2e2',
                      color: insp.status === 'Bình thường' ? '#15803d' : '#b91c1c'
                    }}>{insp.status}</span>
                  </td>
                  <td style={{ padding: '10px 15px', fontSize: '13px', color: '#64748b' }}>{insp.notes || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Section 3: Instruction Manual (SOP Steps) */}
      <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '900', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>Hướng dẫn sử dụng</h3>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {steps.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '13px' }}>Chưa định nghĩa các bước vận hành.</div>
          ) : (
            steps.map((s) => (
              <div key={s.step} style={{
                width: '300px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden',
                backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column'
              }}>
                <div style={{
                  height: '160px', backgroundColor: '#cbd5e1', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', overflow: 'hidden'
                }}>
                  {s.image_url ? (
                    <img src={s.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  ) : (
                    <FileText size={48} color="#94a3b8" />
                  )}
                </div>
                <div style={{ padding: '15px' }}>
                  <span style={{
                    backgroundColor: '#7B5233', color: '#fff', padding: '3px 8px', borderRadius: '6px',
                    fontSize: '11px', fontWeight: '800', display: 'inline-block', marginBottom: '10px'
                  }}>Bước {s.step}</span>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#334155', lineHeight: '1.4' }}>{s.title}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PDF View Modal */}
      {showPdfReader && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', width: '1000px', height: '780px',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#FAF6F0'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#7B5233' }}>
                Biên bản bàn giao thiết bị: {pdfFileName}
              </h3>
              <button 
                onClick={() => setShowPdfReader(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={24} />
              </button>
            </div>
            <div style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
              {pdfBase64Data ? (
                <iframe 
                  src={`${pdfBase64Data}#toolbar=1&navpanes=0&view=FitH`} 
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="PDF Reader"
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                  <FileText size={48} style={{ marginBottom: '10px' }} />
                  <span>Dữ liệu tệp đính kèm trống hoặc không hợp lệ.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Edit/Handover Modal */}
      {showEditModal && (
        <EquipmentHandover 
          id={equipment.id} 
          onClose={() => setShowEditModal(false)} 
          onSaved={() => { 
            setShowEditModal(false); 
            loadData(); 
          }} 
        />
      )}
    </div>
  );
};

export default EquipmentDetailView;
