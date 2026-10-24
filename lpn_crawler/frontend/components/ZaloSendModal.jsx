import React, { useState, useEffect } from 'react';
import { Send, Users, CheckSquare, Square, Plus, Phone, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { lpnCrawlerApi } from '../services/api';

/**
 * Modal Xem trước & Lựa chọn danh sách những người nhận báo cáo Zalo
 * Cho phép Quản trị viên kiểm tra chính xác những ai sẽ nhận tin trước khi gửi.
 */
export function ZaloSendModal({
  isOpen,
  onClose,
  container,
  onSuccess = () => {},
  showToast = () => {}
}) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [sendImage, setSendImage] = useState(true);
  const [extraPhone, setExtraPhone] = useState('');
  const [extraName, setExtraName] = useState('');
  const [sendResult, setSendResult] = useState(null);

  const containerId = container?.container_id || container?.id;
  const containerNumber = container?.container_number || 'N/A';

  useEffect(() => {
    if (!isOpen || !containerId) return;

    let isMounted = true;
    setLoading(true);
    setSendResult(null);

    lpnCrawlerApi.getContainerZaloRecipients(containerId)
      .then((data) => {
        if (!isMounted) return;
        if (data.success && Array.isArray(data.recipients)) {
          setRecipients(data.recipients.map(r => ({
            ...r,
            is_selected: r.is_selected !== false
          })));
        } else {
          setRecipients([]);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error fetching preview recipients:', err);
        // Fallback: Lấy ít nhất người phụ trách hoặc số mặc định
        const fallbackPhone = container.operator_phone || '';
        setRecipients([
          {
            phone: fallbackPhone || 'Chưa rõ',
            name: container.operator_name || 'Người phụ trách',
            role: 'Người phụ trách cont',
            is_primary: true,
            is_selected: true
          }
        ]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, containerId, container]);

  if (!isOpen || !container) return null;

  const toggleRecipient = (phone) => {
    setRecipients(prev => prev.map(r => {
      if (r.phone === phone) {
        return { ...r, is_selected: !r.is_selected };
      }
      return r;
    }));
  };

  const handleSelectAll = (select) => {
    setRecipients(prev => prev.map(r => ({ ...r, is_selected: select })));
  };

  const handleAddExtraRecipient = (e) => {
    if (e) e.preventDefault();
    const clean = extraPhone.trim().replace(/[^0-9+]/g, '');
    if (!clean || clean.length < 9) {
      showToast('error', 'Vui lòng nhập số điện thoại hợp lệ!');
      return;
    }
    let norm = clean;
    if (norm.startsWith('+84')) norm = '0' + norm.slice(3);
    else if (norm.startsWith('84') && norm.length >= 11) norm = '0' + norm.slice(2);

    if (recipients.some(r => r.phone === norm)) {
      showToast('error', `Số điện thoại ${norm} đã có trong danh sách nhận!`);
      return;
    }

    setRecipients(prev => [
      ...prev,
      {
        phone: norm,
        name: extraName.trim() || `Thêm thủ công (${norm})`,
        role: 'Người nhận bổ sung',
        is_primary: false,
        is_selected: true
      }
    ]);
    setExtraPhone('');
    setExtraName('');
    showToast('success', `Đã thêm ${norm} vào danh sách gửi!`);
  };

  const selectedCount = recipients.filter(r => r.is_selected).length;

  const handleSend = async () => {
    const selectedPhones = recipients.filter(r => r.is_selected).map(r => r.phone);
    if (selectedPhones.length === 0) {
      showToast('error', 'Vui lòng chọn ít nhất 1 số điện thoại nhận báo cáo!');
      return;
    }

    setSending(true);
    setSendResult(null);

    try {
      const res = await lpnCrawlerApi.resendContainerZaloReport(
        containerId,
        null,
        selectedPhones,
        sendImage
      );

      setSendResult(res);
      if (res.success) {
        showToast('success', res.message || `Đã gửi báo cáo Zalo thành công cho ${res.success_count || selectedPhones.length} người!`);
        if (onSuccess) onSuccess(res);
      } else {
        showToast('error', res.message || 'Gửi báo cáo Zalo thất bại!');
      }
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Lỗi kết nối khi gửi báo cáo Zalo');
      setSendResult({
        success: false,
        message: err.message || 'Lỗi hệ thống khi gửi Zalo'
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(30, 20, 10, 0.65)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
        border: '1px solid #EADCC9',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          backgroundColor: '#FAF7F2',
          borderBottom: '1px solid #EADCC9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#7B5233',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem'
            }}>
              💬
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#4A3728' }}>
                Gửi Báo Cáo Zalo Container
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#7B5233', fontWeight: 700 }}>
                {containerNumber}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            style={{
              border: 'none',
              background: 'none',
              cursor: sending ? 'not-allowed' : 'pointer',
              color: '#9CA3AF',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

          {/* Section: Danh sách người sẽ nhận tin */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} color="#7B5233" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#374151' }}>
                  NHỮNG AI SẼ NHẬN ĐƯỢC TIN NHẮN BÁO CÁO:
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#2563EB',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Chọn tất cả
                </button>
                <span style={{ color: '#D1D5DB' }}>|</span>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#6B7280',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280', fontSize: '0.85rem' }}>
                Đang nạp danh sách người nhận...
              </div>
            ) : recipients.length === 0 ? (
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FEE2E2',
                color: '#DC2626',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>Chưa tìm thấy người nhận nào. Vui lòng thêm số điện thoại ở khung bên dưới!</span>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                border: '1px solid #E5E7EB',
                borderRadius: '10px',
                padding: '8px',
                backgroundColor: '#FAF8F6'
              }}>
                {recipients.map((r, idx) => {
                  return (
                    <div
                      key={r.phone + idx}
                      onClick={() => toggleRecipient(r.phone)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: r.is_selected ? '#FFFFFF' : 'transparent',
                        border: r.is_selected ? '1px solid #86EFAC' : '1px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {r.is_selected ? (
                          <CheckSquare size={18} color="#15803D" />
                        ) : (
                          <Square size={18} color="#9CA3AF" />
                        )}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1F2937', fontFamily: 'monospace' }}>
                              {r.phone}
                            </span>
                            {r.is_primary ? (
                              <span style={{
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                backgroundColor: '#DCFCE7',
                                color: '#15803D',
                                border: '1px solid #86EFAC'
                              }}>
                                ★ Người phụ trách
                              </span>
                            ) : (
                              <span style={{
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                backgroundColor: '#EFF6FF',
                                color: '#2563EB',
                                border: '1px solid #BFDBFE'
                              }}>
                                Quản lý nhận cùng
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>
                            {r.name ? `${r.name} • ` : ''}{r.role}
                          </div>
                        </div>
                      </div>

                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: r.is_selected ? '#15803D' : '#9CA3AF'
                      }}>
                        {r.is_selected ? 'Sẽ gửi tin' : 'Bỏ qua'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form thêm nhanh người nhận bất kỳ */}
          <div style={{
            border: '1px dashed #D1D5DB',
            borderRadius: '10px',
            padding: '12px 14px',
            backgroundColor: '#FFFFFF',
            marginBottom: '16px'
          }}>
            <span style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#4B5563', marginBottom: '8px' }}>
              ➕ THÊM SỐ ĐIỆN THOẠI KHÁC VÀO DANH SÁCH GỬI LẦN NÀY:
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 150px' }}>
                <Phone size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9CA3AF' }} />
                <input
                  type="text"
                  value={extraPhone}
                  onChange={(e) => setExtraPhone(e.target.value)}
                  placeholder="SĐT Zalo..."
                  style={{
                    width: '100%',
                    padding: '8px 8px 8px 30px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.8rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <input
                type="text"
                value={extraName}
                onChange={(e) => setExtraName(e.target.value)}
                placeholder="Tên / Chức vụ..."
                style={{
                  flex: '1 1 130px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.8rem',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={handleAddExtraRecipient}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#FAF6F0',
                  border: '1px solid #7B5233',
                  color: '#7B5233',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} />
                <span>Thêm</span>
              </button>
            </div>
          </div>

          {/* Tuỳ chọn gửi ảnh */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.82rem',
            color: '#374151',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '4px 0'
          }}>
            <input
              type="checkbox"
              checked={sendImage}
              onChange={(e) => setSendImage(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#7B5233', cursor: 'pointer' }}
            />
            <span>Đính kèm ảnh đại diện Container (nếu có trên hệ thống)</span>
          </label>

          {/* Kết quả sau khi gửi */}
          {sendResult && (
            <div style={{
              marginTop: '16px',
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: sendResult.success ? '#ECFDF5' : '#FEF2F2',
              border: `1px solid ${sendResult.success ? '#A7F3D0' : '#FCA5A5'}`,
              color: sendResult.success ? '#065F46' : '#991B1B',
              fontSize: '0.82rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                {sendResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{sendResult.message || (sendResult.success ? 'Đã gửi thành công!' : 'Gửi thất bại')}</span>
              </div>
              {Array.isArray(sendResult.results) && (
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.76rem' }}>
                  {sendResult.results.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>• {r.phone} ({r.name || 'Không rõ'}):</span>
                      <strong style={{ color: r.status === 'SUCCESS' ? '#059669' : '#DC2626' }}>
                        {r.status === 'SUCCESS' ? '✓ Thành công' : `✗ Lỗi: ${r.error || 'Thất bại'}`}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          backgroundColor: '#FAF7F2',
          borderTop: '1px solid #EADCC9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
            Đã chọn: <strong style={{ color: '#7B5233' }}>{selectedCount}</strong> người nhận
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#4B5563',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: sending ? 'not-allowed' : 'pointer'
              }}
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={sending || selectedCount === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
                borderRadius: '8px',
                backgroundColor: '#7B5233',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.84rem',
                fontWeight: 800,
                cursor: (sending || selectedCount === 0) ? 'not-allowed' : 'pointer',
                opacity: (sending || selectedCount === 0) ? 0.6 : 1,
                boxShadow: '0 2px 10px rgba(123, 82, 51, 0.25)'
              }}
            >
              <Send size={15} />
              <span>{sending ? 'Đang gửi báo cáo...' : `Gửi ngay (${selectedCount} người)`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
