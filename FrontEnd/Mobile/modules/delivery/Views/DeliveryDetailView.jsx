import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import { useDeliveryController } from '@modules/delivery/Controllers/deliveryController'
import { API_ROOT } from '@shared/services/api'
import {
  FileText, Layers, MapPin, Calendar, User, Info, ArrowRight,
  Package, Loader2, ChevronDown, ChevronUp, Image as ImageIcon,
  ClipboardCheck, AlertTriangle, CheckCircle2, XCircle, Droplet, X
} from 'lucide-react'

/**
 * Trang Chi tiết phiếu bàn giao (Mobile)
 * Route: /delivery-detail/:id
 * Hiển thị đầy đủ thông tin phiếu bàn giao như trang /admin/delivery-tracking trên Web.
 */

// Helper format ngày giờ
const formatDateTime = (dateStr) => {
  if (!dateStr) return '---';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('vi-VN');
  } catch {
    return dateStr;
  }
};

// Helper màu trạng thái
const getStatusColor = (status) => {
  switch (status) {
    case 'Chờ Xác Nhận': return { bg: '#fef2f2', border: '#fecaca', text: '#ef4444' };
    case 'Chờ Kiểm Tra': return { bg: '#eff6ff', border: '#bfdbfe', text: '#3b82f6' };
    case 'Chờ Nhận Hàng': return { bg: '#fff7ed', border: '#fed7aa', text: '#f97316' };
    case 'Hoàn thành':
    case 'Đã Nhận': return { bg: '#f0fdf4', border: '#bbf7d0', text: '#22c55e' };
    case 'Trả Hàng': return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' };
    default: return { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b' };
  }
};

// Helper build image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  return `${API_ROOT}api/v1/deliveries/image-proxy?path=${encodeURIComponent(cleanPath)}`;
};

// Helper render QC category label
const QC_LABELS = {
  size: 'Kích thước',
  structure: 'Cấu trúc',
  visual: 'Ngoại quan',
  moisture: 'Độ ẩm',
  bend: 'Độ uốn cong',
  accessories: 'Phụ kiện',
  visual_ext: 'Ngoại quan mở rộng',
  functional: 'Chức năng'
};

const DeliveryDetailView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { fetchDeliveryDetail, fetchQCDetail } = useDeliveryController()

  const [detail, setDetail] = useState(null)
  const [qcDetail, setQcDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('handover') // 'handover' | 'qc'
  const [expandedSections, setExpandedSections] = useState({ info: true, qty: true, po: false, images: false })
  const [lightboxImage, setLightboxImage] = useState(null)

  // Toggle expand/collapse
  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!id) return
      setLoading(true)
      try {
        const detailData = await fetchDeliveryDetail(id)
        setDetail(detailData)

        try {
          const qcData = await fetchQCDetail(id)
          setQcDetail(qcData)
        } catch {
          setQcDetail(null)
        }
      } catch (err) {
        console.error('[DeliveryDetail] Error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id, fetchDeliveryDetail, fetchQCDetail])

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Chi tiết phiếu" subTitle="MB17 | Chi tiết bàn giao" showBack={true} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '12px' }}>
          <Loader2 size={32} color="var(--primary-color, #7c523b)" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Đang tải chi tiết phiếu BG-{id}...</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </Layout>
    )
  }

  if (!detail) {
    return (
      <Layout>
        <PageHeader title="Chi tiết phiếu" subTitle="MB17 | Chi tiết bàn giao" showBack={true} />
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
          <XCircle size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p>Không tìm thấy thông tin phiếu BG-{id}</p>
        </div>
      </Layout>
    )
  }

  const statusColors = getStatusColor(detail.status);
  const handoverImages = (detail.images || []).filter(img => !img.description?.startsWith('qc_'));
  const qcImages = (detail.images || []).filter(img => img.description?.startsWith('qc_'));

  return (
    <Layout>
      <PageHeader title={`BG-${String(detail.id).padStart(2, '0')}`} subTitle="MB17 | Chi tiết bàn giao" showBack={true} />

      <div style={{
        padding: '0 16px 100px',
        maxWidth: '500px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* Status Banner */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 16px',
          borderRadius: '16px',
          backgroundColor: statusColors.bg,
          border: `1.5px solid ${statusColors.border}`
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>Trạng thái</div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: statusColors.text }}>{detail.status || 'Chờ xác nhận'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>Thời gian</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>{formatDateTime(detail.created_at)}</div>
          </div>
        </div>

        {/* Tabs: Bàn giao | Kết quả QC */}
        <div style={{
          display: 'flex',
          borderRadius: '14px',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc'
        }}>
          {[
            { id: 'handover', label: 'Bàn giao & PO', icon: Layers },
            { id: 'qc', label: 'Kết quả QC', icon: ClipboardCheck }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? 'var(--primary-color, #7c523b)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#64748b',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB: Bàn giao & PO */}
        {activeTab === 'handover' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Section 1: Thông tin chung */}
            <CollapsibleSection
              title="THÔNG TIN CHUNG"
              expanded={expandedSections.info}
              onToggle={() => toggleSection('info')}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Mã phiếu', value: `BG-${detail.id}`, icon: FileText },
                  { label: 'Tên chi tiết / Linh kiện', value: detail.part_name || 'N/A', icon: Layers },
                  { label: 'Quy cách kỹ thuật', value: detail.specification || '---', icon: Info },
                  { label: 'Kế hoạch sản xuất', value: detail.plan_name || (detail.plan_id ? `KH-${detail.plan_id}` : '---'), icon: FileText },
                  { label: 'Công đoạn', value: `${detail.delivery_stage || '---'} ➔ ${detail.receiving_stage || '---'}`, icon: MapPin },
                  { label: 'Thời gian lập', value: formatDateTime(detail.created_at), icon: Calendar },
                  { label: 'Người giao', value: detail.sx_delivery_name || 'N/A', icon: User },
                  { label: 'Người nhận', value: detail.sx_receipt_name || '---', icon: User },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <item.icon size={16} color="var(--primary-color, #7c523b)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>{item.label}</div>
                      <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '700', marginTop: '1px' }}>{item.value}</div>
                    </div>
                  </div>
                ))}
                {/* Ghi chú */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Info size={16} color="var(--primary-color, #7c523b)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Ghi chú bàn giao</div>
                    <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600', fontStyle: 'italic', marginTop: '1px' }}>
                      {detail.note || 'Không có ghi chú.'}
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 2: Số lượng thực tế */}
            <CollapsibleSection
              title="SỐ LƯỢNG THỰC TẾ"
              expanded={expandedSections.qty}
              onToggle={() => toggleSection('qty')}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {[
                  { label: 'SL GIAO', value: detail.quantity_total, color: '#7c523b', bg: '#faf6f0' },
                  { label: 'SL NHẬN', value: detail.quantity_received, color: '#16a34a', bg: '#f0fdf4' },
                  { label: 'SL TRẢ (QC)', value: detail.quantity_returned, color: '#dc2626', bg: '#fef2f2' },
                  { label: 'SL LỖI (QC)', value: detail.quantity_error, color: '#ea580c', bg: '#fff7ed' },
                  { label: 'SL KIỂM (QC)', value: detail.quantity_inspection || 0, color: '#2563eb', bg: '#eff6ff' },
                  { label: 'DƯ / PHẾ', value: detail.residual || 0, color: '#64748b', bg: '#f8fafc' },
                ].map((qty, idx) => (
                  <div key={idx} style={{
                    backgroundColor: qty.bg,
                    padding: '12px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    border: `1px solid ${qty.color}15`
                  }}>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: '800', letterSpacing: '0.5px' }}>{qty.label}</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '900', color: qty.color, marginTop: '4px' }}>
                      {qty.value !== null && qty.value !== undefined ? qty.value : '---'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Moisture info */}
              {(detail.moisture_min || detail.moisture_max) && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '10px',
                  padding: '10px 12px',
                  backgroundColor: '#eff6ff',
                  borderRadius: '10px',
                  border: '1px solid #bfdbfe'
                }}>
                  <Droplet size={16} color="#2563eb" />
                  <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e40af' }}>
                    Độ ẩm: {detail.moisture_min || '---'}% — {detail.moisture_max || '---'}%
                  </span>
                </div>
              )}
            </CollapsibleSection>

            {/* Section 3: Phân bổ PO */}
            <CollapsibleSection
              title="PHÂN BỔ ĐƠN HÀNG (PO)"
              expanded={expandedSections.po}
              onToggle={() => toggleSection('po')}
            >
              {!detail.details || detail.details.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic' }}>
                  Không có thông tin phân bổ PO.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detail.details.map((d, idx) => (
                    <div key={d.id || idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      backgroundColor: idx % 2 === 0 ? '#faf6f0' : '#fff',
                      borderRadius: '10px',
                      border: '1px solid #f1f5f9'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#7c523b' }}>{d.order_code || d.partner_po || `PO-${idx + 1}`}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                          {d.customer || '---'} {d.product_names ? `• ${d.product_names}` : ''}
                        </div>
                      </div>
                      <div style={{ fontWeight: '900', fontSize: '1rem', color: '#1e293b' }}>{d.quantity}</div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleSection>

            {/* Section 4: Ảnh minh chứng */}
            <CollapsibleSection
              title={`ẢNH MINH CHỨNG (${handoverImages.length})`}
              expanded={expandedSections.images}
              onToggle={() => toggleSection('images')}
            >
              {handoverImages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.82rem', fontStyle: 'italic' }}>
                  <ImageIcon size={24} style={{ marginBottom: '8px', opacity: 0.4 }} />
                  <p>Không có hình ảnh nào.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {handoverImages.map((img, idx) => {
                    const url = getImageUrl(img.image_path);
                    return (
                      <div
                        key={idx}
                        onClick={() => setLightboxImage(url)}
                        style={{
                          aspectRatio: '1',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          border: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          position: 'relative'
                        }}
                      >
                        <img src={url} alt={img.description || 'Ảnh'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    );
                  })}
                </div>
              )}
            </CollapsibleSection>
          </div>
        )}

        {/* TAB: Kết quả QC */}
        {activeTab === 'qc' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!qcDetail ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#94a3b8',
                fontSize: '0.9rem',
                fontStyle: 'italic'
              }}>
                <ClipboardCheck size={40} strokeWidth={1.5} style={{ marginBottom: '12px', opacity: 0.4 }} />
                <p>Chưa có kết quả kiểm tra QC cho phiếu này.</p>
              </div>
            ) : (
              <>
                {/* QC Summary */}
                <div style={{
                  backgroundColor: '#fff',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: '800', color: '#475569', marginBottom: '12px', textTransform: 'uppercase' }}>
                    Tổng quan QC
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#eff6ff', borderRadius: '10px' }}>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700' }}>SL KIỂM</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#2563eb' }}>{qcDetail.quantity_inspection || 0}</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#fef2f2', borderRadius: '10px' }}>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700' }}>SL LỖI</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#dc2626' }}>{qcDetail.quantity_error || 0}</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#fff7ed', borderRadius: '10px' }}>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700' }}>SL TRẢ</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ea580c' }}>{qcDetail.quantity_returned || 0}</div>
                    </div>
                  </div>
                  {qcDetail.note && (
                    <div style={{ marginTop: '12px', padding: '10px 12px', backgroundColor: '#faf6f0', borderRadius: '10px', fontSize: '0.82rem', color: '#475569', fontStyle: 'italic' }}>
                      <strong>Ghi chú QC:</strong> {qcDetail.note}
                    </div>
                  )}
                </div>

                {/* QC Category Results */}
                {qcDetail.results && Object.keys(qcDetail.results).length > 0 && (
                  <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: '800', color: '#475569', marginBottom: '12px', textTransform: 'uppercase' }}>
                      Chi tiết từng hạng mục
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Object.entries(qcDetail.results).map(([category, data]) => {
                        const isPassed = data.result === 'pass' || data.result === 'Đạt' || data.passed === true;
                        return (
                          <div key={category} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            backgroundColor: isPassed ? '#f0fdf4' : '#fef2f2',
                            border: `1px solid ${isPassed ? '#bbf7d0' : '#fecaca'}`
                          }}>
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b' }}>
                                {QC_LABELS[category] || category}
                              </div>
                              {data.note && (
                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{data.note}</div>
                              )}
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: '800',
                              fontSize: '0.78rem',
                              color: isPassed ? '#16a34a' : '#dc2626'
                            }}>
                              {isPassed ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                              {isPassed ? 'Đạt' : 'Không đạt'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* QC Images */}
                {qcImages.length > 0 && (
                  <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: '800', color: '#475569', marginBottom: '12px', textTransform: 'uppercase' }}>
                      Ảnh kiểm tra QC ({qcImages.length})
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {qcImages.map((img, idx) => {
                        const url = getImageUrl(img.image_path);
                        return (
                          <div
                            key={idx}
                            onClick={() => setLightboxImage(url)}
                            style={{
                              aspectRatio: '1',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              border: '1px solid #e2e8f0',
                              cursor: 'pointer',
                              position: 'relative'
                            }}
                          >
                            <img src={url} alt={img.description || 'QC'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              background: 'rgba(0,0,0,0.6)',
                              color: '#fff',
                              fontSize: '0.6rem',
                              textAlign: 'center',
                              padding: '2px 0'
                            }}>
                              {(img.description || '').replace('qc_', '')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Image */}
      {lightboxImage && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30000,
            cursor: 'zoom-out'
          }}
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="Enlarged"
            style={{
              maxWidth: '95%',
              maxHeight: '85vh',
              borderRadius: '8px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxImage(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: '#fff',
              border: 'none',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
          >
            <X size={20} color="#000" />
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  )
}

/**
 * Component: Section có thể expand/collapse
 */
const CollapsibleSection = ({ title, expanded, onToggle, children }) => (
  <div style={{
    backgroundColor: '#fff',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid #f1f5f9',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
  }}>
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 16px',
        border: 'none',
        backgroundColor: expanded ? 'rgba(124, 82, 59, 0.04)' : 'transparent',
        cursor: 'pointer',
        borderBottom: expanded ? '1px solid #f1f5f9' : 'none'
      }}
    >
      <div style={{
        fontSize: '0.78rem',
        fontWeight: '800',
        color: 'var(--primary-color, #7c523b)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <div style={{ width: '3px', height: '16px', backgroundColor: 'var(--primary-color, #7c523b)', borderRadius: '2px' }} />
        {title}
      </div>
      {expanded ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
    </button>
    {expanded && (
      <div style={{ padding: '14px 16px' }}>
        {children}
      </div>
    )}
  </div>
)

export default DeliveryDetailView
