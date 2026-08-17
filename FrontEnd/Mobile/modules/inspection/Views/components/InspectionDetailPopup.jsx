import React from 'react';
import { X, FileText, ClipboardCheck, Package, RotateCcw, Ruler, Droplets, Eye, ShieldCheck, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import apiClient, { API_ROOT } from '@shared/services/api';
import { useNavigate } from 'react-router-dom';

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} | ${day}-${month}-${year}`;
  } catch (e) {
    return dateStr;
  }
};

export const getTypeName = (type) => {
  switch (type) {
    case 'dau-vao':
    case 'phu-kien':
      return 'Kiểm tra đầu vào';
    case 'bam-dinh':
      return 'Kiểm tra bám dính';
    case 'sau-dong-goi':
      return 'Kiểm tra sau đóng gói';
    default:
      return 'Kiểm tra nhập kho';
  }
};

const InspectionDetailPopup = ({ item, onClose }) => {
  const navigate = useNavigate();
  if (!item) return null;

  let extra = {};
  try {
    extra = typeof item.data_json === 'string' ? JSON.parse(item.data_json) : (item.data_json || {});
  } catch (e) { extra = {}; }

  let images = {};
  try {
    images = typeof item.images_json === 'string' ? JSON.parse(item.images_json) : (item.images_json || {});
  } catch (e) { images = {}; }

  const typeInfo = {
    'nhap-kho': { icon: <ClipboardCheck size={20} />, color: '#3b82f6', label: 'KIỂM TRA NHẬP KHO' },
    'dau-vao': { icon: <ClipboardCheck size={20} />, color: '#3b82f6', label: 'KIỂM TRA NHẬP KHO' },
    'do-am': { icon: <ClipboardCheck size={20} />, color: '#f59e0b', label: 'KIỂM TRA ĐỘ ẨM' },
    'kich-thuoc': { icon: <ClipboardCheck size={20} />, color: '#10b981', label: 'KIỂM TRA KÍCH THƯỚC' },
    'ngoai-quan': { icon: <ClipboardCheck size={20} />, color: '#ec4899', label: 'KIỂM TRA NGOẠI QUAN' },
    'chuc-nang': { icon: <ClipboardCheck size={20} />, color: '#8b5cf6', label: 'KIỂM TRA CHỨC NĂNG' },
    'cong-doan': { icon: <ClipboardCheck size={20} />, color: '#f59e0b', label: 'KIỂM TRA CÔNG ĐOẠN' },
    'quy-trinh': { icon: <ClipboardCheck size={20} />, color: '#06b6d4', label: 'KIỂM TRA QUY TRÌNH' },
    'bam-dinh': { icon: <FileText size={20} />, color: '#8b5cf6', label: 'KIỂM TRA BÁM DÍNH' },
    'sau-dong-goi': { icon: <Package size={20} />, color: '#10b981', label: 'KIỂM TRA SAU ĐÓNG GÓI' }
  }[item.inspection_type] || { icon: <ClipboardCheck size={20} />, color: '#64748b', label: 'KIỂM TRA CÔNG ĐOẠN' };

  const getActionLabel = (action) => {
    switch (action) {
      case 'luu-kho': return 'Lưu kho';
      case 'cach-ly': return 'Cách ly';
      case 'tra-ve': return 'Trả về';
      default: return 'N/A';
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'luu-kho': return '#22c55e';
      case 'cach-ly': return '#f59e0b';
      case 'tra-ve': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  const getActionBg = (action) => {
    switch (action) {
      case 'luu-kho': return '#f0fdf4';
      case 'cach-ly': return '#fffbeb';
      case 'tra-ve': return '#fef2f2';
      default: return '#f8fafc';
    }
  };

  // Count pass/fail samples
  const samplesList = extra.samples || [];
  const measuredSamples = samplesList.filter(s => 
    (s.dimensions?.values?.length > 0) || (s.moisture?.values?.length > 0) || s.visual === 'fail' || s.function === 'fail'
  );
  const failVisual = measuredSamples.filter(s => s.visual === 'fail').length;
  const failFunction = measuredSamples.filter(s => s.function === 'fail').length;
  const passCount = measuredSamples.filter(s => s.visual === 'pass' && (extra.is_wood || s.function === 'pass')).length;

  // Dimension labels
  const dimLabels = ['Dày', 'Rộng', 'Dài'];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <div style={{ position: 'relative', backgroundColor: '#fff', borderRadius: '28px', width: '100%', maxWidth: '460px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: `${typeInfo.color}15`, color: typeInfo.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {typeInfo.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '900', color: '#1e293b', marginBottom: '2px' }}>{typeInfo.label}</h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>#{item.id} • {formatDateTime(item.inspection_date)}</span>
            </div>
          </div>
          <div 
            onClick={onClose}
            style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}
          >
            <X size={18} color="#64748b" />
          </div>
        </div>

        {/* Conclusion Banner */}
        <div style={{ 
          padding: '12px 20px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          backgroundColor: item.conclusion === 'pass' ? '#f0fdf4' : '#fef2f2',
          borderBottom: `2px solid ${item.conclusion === 'pass' ? '#bbf7d0' : '#fecaca'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {item.conclusion === 'pass' 
              ? <CheckCircle2 size={22} color="#16a34a" /> 
              : <XCircle size={22} color="#dc2626" />
            }
            <span style={{ fontWeight: '900', fontSize: '1.1rem', color: item.conclusion === 'pass' ? '#16a34a' : '#dc2626' }}>
              {item.conclusion === 'pass' ? 'ĐẠT' : 'KHÔNG ĐẠT'}
            </span>
          </div>
          {extra.action && (
            <span style={{ 
              fontWeight: '800', 
              fontSize: '0.75rem', 
              padding: '4px 12px', 
              borderRadius: '8px',
              backgroundColor: getActionBg(extra.action),
              color: getActionColor(extra.action),
              border: `1px solid ${getActionColor(extra.action)}30`
            }}>
              {getActionLabel(extra.action).toUpperCase()}
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '18px', overflowY: 'auto', flex: 1 }}>
          
          {/* Product Info Card */}
          <div style={{ backgroundColor: '#fdfbf7', borderRadius: '16px', padding: '14px', border: '1px solid #e8e1d5', marginBottom: '16px' }}>
            {extra.product_name && (
              <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dashed #e8e1d5' }}>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TÊN SẢN PHẨM</span>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#4b301e', marginTop: '2px' }}>{extra.product_name}</div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>MÃ PO</span>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>{item.batch_no || '-'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>MÃ SẢN PHẨM</span>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>{item.product_sku || '-'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>SỐ LƯỢNG</span>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>{extra.total_qty || 0}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>LOẠI VẬT LIỆU</span>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: extra.is_wood ? '#92400e' : '#475569' }}>
                  {extra.is_wood ? '🪵 Gỗ' : '📦 Khác'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>NGƯỜI KIỂM TRA</span>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>{item.inspector_name || '-'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>SỐ MẪU</span>
                <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>{samplesList.length} mẫu</div>
              </div>
            </div>
          </div>

          {/* Quality Summary Stats */}
          {item.inspection_type === 'dau-vao' && samplesList.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#f0fdf4', borderRadius: '12px', padding: '10px', textAlign: 'center', border: '1px solid #dcfce7' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#16a34a' }}>{passCount}</div>
                <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#4ade80', textTransform: 'uppercase' }}>Đạt</div>
              </div>
              <div style={{ backgroundColor: failVisual > 0 ? '#fef2f2' : '#f8fafc', borderRadius: '12px', padding: '10px', textAlign: 'center', border: `1px solid ${failVisual > 0 ? '#fecaca' : '#e2e8f0'}` }}>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: failVisual > 0 ? '#dc2626' : '#94a3b8' }}>{failVisual}</div>
                <div style={{ fontSize: '0.65rem', fontWeight: '700', color: failVisual > 0 ? '#f87171' : '#94a3b8', textTransform: 'uppercase' }}>Lỗi ngoại quan</div>
              </div>
              {!extra.is_wood && (
                <div style={{ backgroundColor: failFunction > 0 ? '#fef2f2' : '#f8fafc', borderRadius: '12px', padding: '10px', textAlign: 'center', border: `1px solid ${failFunction > 0 ? '#fecaca' : '#e2e8f0'}` }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: '900', color: failFunction > 0 ? '#dc2626' : '#94a3b8' }}>{failFunction}</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: '700', color: failFunction > 0 ? '#f87171' : '#94a3b8', textTransform: 'uppercase' }}>Lỗi chức năng</div>
                </div>
              )}
              {extra.is_wood && (
                <div style={{ backgroundColor: '#f0f9ff', borderRadius: '12px', padding: '10px', textAlign: 'center', border: '1px solid #bae6fd' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#0284c7' }}>
                    {measuredSamples.filter(s => s.moisture?.values?.length > 0).length}
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase' }}>Có đo ẩm</div>
                </div>
              )}
            </div>
          )}

          {/* Detailed Samples Table */}
          {item.inspection_type === 'dau-vao' && samplesList.length > 0 && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '14px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '900', color: '#475569', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Ruler size={14} /> Chi tiết mẫu kiểm tra ({samplesList.length} mẫu)
              </h4>
              
              {samplesList.map((s, idx) => {
                const dims = s.dimensions?.values || [];
                const mois = s.moisture?.values || [];
                const hasDimData = dims.length > 0;
                const hasMoisData = mois.length > 0;
                
                return (
                  <div key={s.stt || idx} style={{ 
                    backgroundColor: idx % 2 === 0 ? '#fdfbf7' : '#fff',
                    borderRadius: '12px', 
                    padding: '10px 12px', 
                    marginBottom: idx < samplesList.length - 1 ? '8px' : 0,
                    border: '1px solid #f1f5f9'
                  }}>
                    {/* Sample header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '900', fontSize: '0.8rem', color: '#4b301e', backgroundColor: '#e8e1d5', padding: '2px 10px', borderRadius: '6px' }}>
                        Mẫu #{s.stt}
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <span style={{ 
                          fontSize: '0.65rem', fontWeight: '800', padding: '2px 8px', borderRadius: '6px',
                          backgroundColor: s.visual === 'pass' ? '#dcfce7' : '#fecaca',
                          color: s.visual === 'pass' ? '#16a34a' : '#dc2626'
                        }}>
                          NQ: {s.visual === 'pass' ? '✓' : '✗'}
                        </span>
                        {!extra.is_wood && (
                          <span style={{ 
                            fontSize: '0.65rem', fontWeight: '800', padding: '2px 8px', borderRadius: '6px',
                            backgroundColor: s.function === 'pass' ? '#dcfce7' : '#fecaca',
                            color: s.function === 'pass' ? '#16a34a' : '#dc2626'
                          }}>
                            CN: {s.function === 'pass' ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Dimension values */}
                    {hasDimData && (
                      <div style={{ marginBottom: hasMoisData ? '6px' : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <Ruler size={11} color="#7c6d5e" />
                          <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#7c6d5e', textTransform: 'uppercase' }}>Kích thước</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {dims.map((val, dIdx) => (
                            <div key={dIdx} style={{ 
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              backgroundColor: '#fff', borderRadius: '8px', padding: '4px 10px',
                              border: '1px solid #e8e1d5', minWidth: '55px'
                            }}>
                              <span style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: '700' }}>{dimLabels[dIdx] || `#${dIdx + 1}`}</span>
                              <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1e293b' }}>{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Moisture values */}
                    {hasMoisData && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <Droplets size={11} color="#0284c7" />
                          <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#0284c7', textTransform: 'uppercase' }}>Độ ẩm</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {mois.map((val, mIdx) => (
                            <span key={mIdx} style={{ 
                              fontSize: '0.85rem', fontWeight: '800', color: '#0369a1',
                              backgroundColor: '#e0f2fe', borderRadius: '8px', padding: '4px 10px',
                              border: '1px solid #bae6fd'
                            }}>
                              {val}%
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Show minimal info if no measurement data */}
                    {!hasDimData && !hasMoisData && (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Chưa có dữ liệu đo</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Non-sample inspection types (bam-dinh, sau-dong-goi) */}
          {item.inspection_type !== 'dau-vao' && (
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '16px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '900', color: '#475569', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kết quả kiểm tra</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {extra.visual !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>Ngoại quan:</span>
                    <span style={{ fontWeight: '900', color: extra.visual === 'pass' ? '#22c55e' : '#ef4444', backgroundColor: extra.visual === 'pass' ? '#22c55e10' : '#ef444410', padding: '4px 10px', borderRadius: '8px' }}>{extra.visual === 'pass' ? 'ĐẠT' : 'KHÔNG ĐẠT'}</span>
                  </div>
                )}
                {extra.size !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>Kích thước:</span>
                    <span style={{ fontWeight: '900', color: extra.size === 'pass' ? '#22c55e' : '#ef4444', backgroundColor: extra.size === 'pass' ? '#22c55e10' : '#ef444410', padding: '4px 10px', borderRadius: '8px' }}>{extra.size === 'pass' ? 'ĐẠT' : 'KHÔNG ĐẠT'}</span>
                  </div>
                )}
                {extra.function !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>Chức năng:</span>
                    <span style={{ fontWeight: '900', color: extra.function === 'pass' ? '#22c55e' : '#ef4444', backgroundColor: extra.function === 'pass' ? '#22c55e10' : '#ef444410', padding: '4px 10px', borderRadius: '8px' }}>{extra.function === 'pass' ? 'ĐẠT' : 'KHÔNG ĐẠT'}</span>
                  </div>
                )}
                {extra.detail_bam_dinh && (
                  <div>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Chi tiết</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginTop: '2px' }}>{extra.detail_bam_dinh}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Defects Section */}
          {extra.defects && extra.defects.length > 0 && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '14px', marginBottom: '16px', border: '1px solid #fecaca' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '900', color: '#dc2626', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} /> Lỗi phát hiện ({extra.defects.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {extra.defects.map((def, idx) => (
                  <div key={idx} style={{ 
                    borderBottom: idx < extra.defects.length - 1 ? '1px dashed #e2e8f0' : 'none', 
                    paddingBottom: idx < extra.defects.length - 1 ? '12px' : '0' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>
                            {def.defect_name || (def.code ? `[${def.code}]` : '') || `Lỗi #${def.defectId}`}
                          </span>
                          {def.isCTQ ? (
                            <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #f87171', padding: '1px 6px', borderRadius: '10px', fontSize: '9px', fontWeight: '800', boxShadow: '0 1px 2px rgba(185, 28, 28, 0.15)' }}>
                              CTQ
                            </span>
                          ) : (def.isQA || def.needs_tracking || def.qc_tracking || def.is_tracked_by_me) ? (
                            <span style={{ backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74', padding: '1px 6px', borderRadius: '10px', fontSize: '9px', fontWeight: '700' }}>
                              QA Track
                            </span>
                          ) : null}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                          Số lượng: <span style={{ fontWeight: '800', color: '#1e293b' }}>{def.quantity || 1} / {extra.sample_qty || samplesList.length || 1} mẫu</span>
                        </span>
                      </div>
                      <span style={{ 
                        fontSize: '0.65rem', fontWeight: '800', padding: '4px 8px', borderRadius: '6px',
                        backgroundColor: def.isHeavy ? '#ef444415' : '#f59e0b15',
                        color: def.isHeavy ? '#ef4444' : '#d97706',
                        textTransform: 'uppercase'
                      }}>
                        {def.isHeavy ? 'Lỗi nặng' : 'Lỗi nhẹ'}
                      </span>
                    </div>

                    {/* Defect images */}
                    {def.images && def.images.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {def.images.map((path, imgIdx) => {
                          if (typeof path !== 'string') return null;
                          const cleanPath = path.startsWith('/') ? path.slice(1) : path;
                          const fullUrl = `${API_ROOT}${cleanPath}`;
                          return (
                            <div key={imgIdx} style={{ flexShrink: 0, width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                              <img 
                                src={fullUrl} 
                                alt="defect-qc" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                onClick={() => window.open(fullUrl, '_blank')}
                                onError={(e) => {
                                  e.target.src = 'https://placehold.co/60x60?text=Error';
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '900', color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>Ghi chú</h4>
              <div style={{ padding: '12px', backgroundColor: '#fffbeb', borderRadius: '12px', fontSize: '0.9rem', color: '#92400e', border: '1px solid #fef3c7', lineHeight: '1.5' }}>
                {item.notes}
              </div>
            </div>
          )}

          {/* Images */}
          {((Array.isArray(images) && images.length > 0) || (typeof images === 'object' && images !== null && Object.keys(images).length > 0)) && (
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: '900', color: '#475569', marginBottom: '10px', textTransform: 'uppercase' }}>Hình ảnh minh chứng</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Array.isArray(images) ? (
                  <div>
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
                      {images.map((path, idx) => {
                        if (typeof path !== 'string') return null;
                        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
                        const fullUrl = `${API_ROOT}${cleanPath}`;
                        return (
                          <div key={idx} style={{ flexShrink: 0, width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <img 
                              src={fullUrl} 
                              alt="qc" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                              onClick={() => window.open(fullUrl, '_blank')}
                              onError={(e) => { e.target.src = 'https://placehold.co/100x100?text=Error'; }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  Object.entries(images).map(([section, imgList]) => {
                    const list = Array.isArray(imgList) ? imgList : [imgList];
                    const validList = list.filter(p => typeof p === 'string' && p.trim());
                    if (validList.length === 0) return null;
                    return (
                      <div key={section}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '800', marginBottom: '6px', display: 'block' }}>{section}</span>
                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
                          {validList.map((path, idx) => {
                            const cleanPath = path.startsWith('/') ? path.slice(1) : path;
                            const fullUrl = `${API_ROOT}${cleanPath}`;
                            return (
                              <div key={idx} style={{ flexShrink: 0, width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <img 
                                  src={fullUrl} 
                                  alt="qc" 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                  onClick={() => window.open(fullUrl, '_blank')}
                                  onError={(e) => { e.target.src = 'https://placehold.co/100x100?text=Error'; }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '16px 20px 20px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
          {extra.action === 'cach-ly' ? (
            <button 
              onClick={() => {
                onClose();
                let targetRoute = '/inspection-stage';
                if (['do-am', 'kich-thuoc', 'ngoai-quan', 'chuc-nang', 'cong-doan'].includes(item.inspection_type)) {
                  targetRoute = '/inspection-stage-moisture';
                } else if (item.inspection_type === 'quy-trinh') {
                  targetRoute = '/inspection-stage-process';
                } else if (item.inspection_type === 'bam-dinh') {
                  targetRoute = '/inspection-stage-adhesion';
                } else if (item.inspection_type === 'sau-dong-goi') {
                  targetRoute = '/inspection-stage-packaging';
                }
                navigate(targetRoute, { state: { logId: item.id } });
              }}
              style={{ width: '100%', padding: '14px', backgroundColor: '#4b301e', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: '900', fontSize: '0.95rem', boxShadow: '0 10px 15px -3px rgba(75, 48, 30, 0.3)', cursor: 'pointer' }}
            >
              CHỈNH SỬA PHIẾU (CÁCH LY)
            </button>
          ) : (
            <div style={{ textAlign: 'center', backgroundColor: '#f1f5f9', borderRadius: '12px', padding: '10px' }}>
              <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: '700' }}>
                {item.conclusion === 'pass' ? 'Phiếu ĐẠT - Không thể chỉnh sửa' : `Phiếu đã ${getActionLabel(extra.action).toLowerCase()}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InspectionDetailPopup;
