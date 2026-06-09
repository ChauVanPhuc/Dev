import React from 'react';
import { X, FileText, ClipboardCheck, Package, RotateCcw } from 'lucide-react';
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
      return 'Kiểm tra công đoạn';
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
    'dau-vao': { icon: <ClipboardCheck size={20} />, color: '#3b82f6', label: 'KIỂM TRA ĐẦU VÀO' },
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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <div style={{ position: 'relative', backgroundColor: '#fff', borderRadius: '32px', width: '100%', maxWidth: '450px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: `${typeInfo.color}15`, color: typeInfo.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {typeInfo.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#1e293b', marginBottom: '2px' }}>{typeInfo.label}</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>#{item.id}</span>
            </div>
          </div>
          <div 
            onClick={onClose}
            style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}
          >
            <X size={18} color="#64748b" />
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Primary Info */}
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '16px', border: '1px solid #f1f5f9', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #f1f5f9', paddingBottom: '10px', marginBottom: '4px' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>Ngày thực hiện</span>
              <span style={{ color: '#1e293b', fontSize: '0.85rem', fontWeight: '700' }}>{formatDateTime(item.inspection_date)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Mã PO</span>
              <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>{item.batch_no}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Sản phẩm</span>
              <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>{item.product_sku}</span>
            </div>
            {item.inspection_type === 'dau-vao' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Số lượng</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>{extra.total_qty || 0} {extra.unit || 'Cái'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Loại kiểm</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>{extra.check_type || 'N/A'} (SL: {extra.check_qty || 0})</span>
                </div>
              </>
            )}
            {extra.supplier && item.inspection_type === 'dau-vao' && (
              <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Nhà cung cấp</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>{extra.supplier}</span>
              </div>
            )}
            {extra.detail_bam_dinh && item.inspection_type !== 'sau-dong-goi' && (
              <div style={{ display: 'flex', flexDirection: 'column', gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Chi tiết</span>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>{extra.detail_bam_dinh}</span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Người kiểm</span>
              <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>{item.inspector_name}</span>
            </div>
          </div>

          {/* Quality Results */}
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '24px', padding: '20px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: '900', color: '#475569', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kết quả kiểm tra</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {item.inspection_type === 'dau-vao' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '600' }}>Ngoại quan:</span>
                    <span style={{ fontWeight: '900', color: extra.visual === 'pass' ? '#22c55e' : '#ef4444', backgroundColor: extra.visual === 'pass' ? '#22c55e10' : '#ef444410', padding: '4px 10px', borderRadius: '8px' }}>{extra.visual === 'pass' ? 'ĐẠT' : 'CHƯA ĐẠT'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '600' }}>Kích thước:</span>
                    <span style={{ fontWeight: '900', color: extra.size === 'pass' ? '#22c55e' : '#ef4444', backgroundColor: extra.size === 'pass' ? '#22c55e10' : '#ef444410', padding: '4px 10px', borderRadius: '8px' }}>{extra.size === 'pass' ? 'ĐẠT' : 'CHƯA ĐẠT'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '600' }}>Chức năng:</span>
                    <span style={{ fontWeight: '900', color: extra.function === 'pass' ? '#22c55e' : '#ef4444', backgroundColor: extra.function === 'pass' ? '#22c55e10' : '#ef444410', padding: '4px 10px', borderRadius: '8px' }}>{extra.function === 'pass' ? 'ĐẠT' : 'CHƯA ĐẠT'}</span>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#1e293b', fontSize: '0.95rem', fontWeight: '900' }}>KẾT LUẬN:</span>
                    <span style={{ fontWeight: '950', color: item.conclusion === 'pass' ? '#22c55e' : '#ef4444', fontSize: '1.1rem' }}>{item.conclusion === 'pass' ? 'ĐẠT' : 'CHƯA ĐẠT'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#1e293b', fontSize: '0.95rem', fontWeight: '900' }}>HÀNH ĐỘNG:</span>
                    <span style={{ fontWeight: '950', color: getActionColor(extra.action), fontSize: '1rem' }}>{getActionLabel(extra.action).toUpperCase()}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#1e293b', fontSize: '1rem', fontWeight: '900' }}>KẾT QUẢ:</span>
                  <span style={{ fontWeight: '950', color: item.conclusion === 'pass' ? '#22c55e' : '#ef4444', fontSize: '1.2rem', backgroundColor: item.conclusion === 'pass' ? '#22c55e15' : '#ef444415', padding: '6px 14px', borderRadius: '12px' }}>{item.conclusion === 'pass' ? 'ĐẠT' : 'CHƯA ĐẠT'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {item.notes && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: '900', color: '#475569', marginBottom: '10px', textTransform: 'uppercase' }}>Ghi chú</h4>
              <div style={{ padding: '14px', backgroundColor: '#fffbeb', borderRadius: '16px', fontSize: '0.95rem', color: '#92400e', border: '1px solid #fef3c7', lineHeight: '1.5' }}>
                {item.notes}
              </div>
            </div>
          )}

          {/* Images */}
          {Object.keys(images).length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: '900', color: '#475569', marginBottom: '12px', textTransform: 'uppercase' }}>Hình ảnh minh chứng</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(images).map(([section, imgList]) => (
                  <div key={section}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '800', marginBottom: '8px', display: 'block' }}>{section}</span>
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
                      {imgList.map((path, idx) => {
                        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
                        const fullUrl = `${API_ROOT}${cleanPath}`;
                        return (
                          <div key={idx} style={{ flexShrink: 0, width: '120px', height: '120px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <img 
                              src={fullUrl} 
                              alt="qc" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onClick={() => window.open(fullUrl, '_blank')}
                              onError={(e) => {
                                console.error("Popup Image Load Error:", fullUrl);
                                e.target.src = 'https://placehold.co/120x120?text=Error';
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '20px 24px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
          {extra.action === 'cach-ly' ? (
            <button 
              onClick={() => {
                onClose();
                navigate('/inspection-stage', { state: { logId: item.id, type: item.inspection_type } });
              }}
              style={{ width: '100%', padding: '16px', backgroundColor: '#4b301e', color: '#fff', border: 'none', borderRadius: '20px', fontWeight: '900', fontSize: '1.05rem', boxShadow: '0 10px 15px -3px rgba(75, 48, 30, 0.3)' }}
            >
              CHỈNH SỬA PHIẾU (CÁCH LY)
            </button>
          ) : (
            <div style={{ textAlign: 'center', backgroundColor: '#f1f5f9', borderRadius: '16px', padding: '12px' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '700' }}>
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
