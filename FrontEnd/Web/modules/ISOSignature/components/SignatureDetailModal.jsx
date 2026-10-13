import React from 'react';
import { X } from 'lucide-react';

/**
 * Modal hiển thị thông tin chi tiết một Chữ ký ISO
 * Thứ tự chuẩn:
 * 1. Thông tin nhân sự (Họ tên, Mã NV, Phòng ban, Chức vụ) nằm TRÊN CÙNG
 * 2. Bản mẫu chữ ký (Chữ ký tay & Con dấu điện tử) nằm BÊN DƯỚI
 * 3. Trạng thái hoạt động & Ghi chú
 * Tông màu gỗ nhận diện SmartFlow (#7B5233), không màu tím, tối giản icon.
 */
export const SignatureDetailModal = ({
  show = false,
  signature = null,
  onClose,
  onEdit,
  onToggleStatus,
  onDelete,
  loading = false
}) => {
  if (!show || !signature) return null;

  const hasHandwritten = Boolean(signature.signature_data || signature.image_path);
  const hasDigital = Boolean(signature.digital_cert_provider || signature.digital_serial_no);

  return (
    <div className="iso-modal-backdrop" onClick={onClose}>
      <div
        className="iso-modal-content sig-modal-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', borderRadius: '8px' }}
      >
        {/* HEADER - Tinh gọn, không icon rườm rà */}
        <div className="iso-modal-header" style={{ padding: '14px 20px', borderBottom: '1px solid #EADCC9' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2D1A12' }}>
            Chi tiết Chữ ký ISO
          </div>
          <button type="button" className="iso-modal-close-btn" onClick={onClose} title="Đóng cửa sổ">
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="iso-modal-body" style={{ padding: '18px 22px', maxHeight: '76vh', overflowY: 'auto' }}>
          
          {/* 1. THÔNG TIN NHÂN SỰ NẰM TRÊN CÙNG */}
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2D1A12', borderBottom: '1px solid #EADCC9', paddingBottom: '6px', marginBottom: '12px' }}>
            Thông tin nhân sự
          </div>

          <div className="sig-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {/* 1. Họ và tên người sở hữu */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#6B7280', marginBottom: '4px' }}>
                Họ và tên người sở hữu
              </label>
              <div
                style={{
                  padding: '9px 12px',
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  color: '#111827'
                }}
              >
                {signature.full_name}
              </div>
            </div>

            {/* 2. Mã nhân viên */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#6B7280', marginBottom: '4px' }}>
                Mã nhân viên
              </label>
              <div
                style={{
                  padding: '9px 12px',
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  color: '#111827'
                }}
              >
                {signature.user_code || '---'}
              </div>
            </div>

            {/* 3. Phòng ban */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#6B7280', marginBottom: '4px' }}>
                Phòng ban
              </label>
              <div
                style={{
                  padding: '9px 12px',
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  fontSize: '0.86rem',
                  color: '#111827'
                }}
              >
                {signature.department || '---'}
              </div>
            </div>

            {/* 4. Chức vụ */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#6B7280', marginBottom: '4px' }}>
                Chức vụ
              </label>
              <div
                style={{
                  padding: '9px 12px',
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  fontSize: '0.86rem',
                  color: '#111827'
                }}
              >
                {signature.position || '---'}
              </div>
            </div>
          </div>

          {/* 2. MẪU CHỮ KÝ NẰM DƯỚI THÔNG TIN NHÂN SỰ */}
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2D1A12', borderBottom: '1px solid #EADCC9', paddingBottom: '6px', marginBottom: '12px' }}>
            Bản mẫu chữ ký trên biểu mẫu văn bản
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div className="sig-workspace-box" style={{ padding: '16px', background: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: '8px' }}>
              {/* Nếu có chữ ký tay */}
              {hasHandwritten && (
                <div className="sig-paper-box" style={{ margin: '0 auto 14px auto', maxWidth: '420px', padding: '16px', background: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: '6px' }}>
                  <div className="sig-paper-header" style={{ fontSize: '0.74rem', fontWeight: 700, color: '#7B5233', borderBottom: '1px dashed #D5C2AF', paddingBottom: '6px', marginBottom: '10px', textAlign: 'center' }}>
                    Mô phỏng chữ ký
                  </div>
                  <div className="sig-paper-body" style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.74rem', color: '#6B7280', display: 'block', marginBottom: '4px' }}>Người phê duyệt:</span>
                    <img
                      src={signature.signature_data || signature.image_path}
                      alt={signature.full_name}
                      style={{ maxHeight: '75px', maxWidth: '240px', objectFit: 'contain', margin: '4px auto', display: 'block' }}
                    />
                    <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#2D1A12', marginTop: '4px' }}>
                      {signature.full_name}
                    </div>
                    {signature.position && (
                      <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{signature.position}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Nếu có chữ ký số CA - Đổi từ màu tím sang màu gỗ chuẩn #7B5233 */}
              {hasDigital && (
                <div style={{ maxWidth: '440px', margin: '0 auto', padding: '14px', background: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#7B5233', borderBottom: '1px dashed #D5C2AF', paddingBottom: '6px', marginBottom: '8px' }}>
                    CHỨNG THƯ SỐ ĐIỆN TỬ (PKI SIGNATURE)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: '#4E342E' }}>
                    <div>Người ký: <b>{signature.full_name}</b></div>
                    <div>Đơn vị cấp CA: <b>{signature.digital_cert_provider || 'SmartFlow PKI'}</b></div>
                    <div>Số Serial: <b>{signature.digital_serial_no || '---'}</b></div>
                    {signature.digital_valid_from && (
                      <div>Thời hạn: {signature.digital_valid_from} → {signature.digital_valid_to || 'Không giới hạn'}</div>
                    )}
                    {signature.digital_hash && (
                      <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', background: '#F3EDE4', padding: '4px 6px', borderRadius: '4px', wordBreak: 'break-all', marginTop: '4px' }}>
                        {signature.digital_hash}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!hasHandwritten && !hasDigital && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: '0.84rem' }}>
                  Chưa có dữ liệu mẫu chữ ký
                </div>
              )}
            </div>
          </div>

          {/* 3. TRẠNG THÁI HOẠT ĐỘNG */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#FAF6F0', borderRadius: '6px', border: '1px solid #EADCC9', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2D1A12' }}>Trạng thái hoạt động</div>
              <div style={{ fontSize: '0.74rem', color: '#8D6E63' }}>Hiệu lực áp dụng của mẫu chữ ký này khi duyệt hồ sơ</div>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: signature.is_active ? '#DCFCE7' : '#FEE2E2',
                color: signature.is_active ? '#166534' : '#991B1B',
                border: `1px solid ${signature.is_active ? '#BBF7D0' : '#FECACA'}`
              }}
            >
              {signature.is_active ? 'Đang hoạt động' : 'Tạm khóa'}
            </span>
          </div>

          {/* GHI CHÚ (Nếu có) */}
          {signature.notes && (
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#6B7280', marginBottom: '4px' }}>
                Ghi chú
              </label>
              <div
                style={{
                  padding: '8px 12px',
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  color: '#4B5563'
                }}
              >
                {signature.notes}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER - Nút bấm không màu mè */}
        <div className="iso-modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAF6F0' }}>
          <div>
            {onDelete && (
              <button
                type="button"
                className="iso-btn iso-btn-outline"
                onClick={() => onDelete(signature)}
                disabled={loading}
                style={{ fontSize: '0.8rem', padding: '6px 12px', color: '#DC2626', borderColor: '#FECACA', background: '#FFFFFF' }}
              >
                Xóa chữ ký
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {onToggleStatus && (
              <button
                type="button"
                className="iso-btn iso-btn-outline"
                onClick={() => onToggleStatus(signature.id, !signature.is_active)}
                disabled={loading}
                style={{ fontSize: '0.8rem', padding: '6px 14px', background: '#FFFFFF', color: signature.is_active ? '#B45309' : '#166534' }}
              >
                {signature.is_active ? 'Tạm khóa' : 'Kích hoạt'}
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                className="iso-btn iso-btn-primary"
                onClick={() => {
                  onClose();
                  onEdit(signature);
                }}
                disabled={loading}
                style={{ fontSize: '0.8rem', padding: '6px 16px', backgroundColor: '#7B5233', color: '#FFFFFF' }}
              >
                Chỉnh sửa
              </button>
            )}

            <button
              type="button"
              className="iso-btn iso-btn-outline"
              onClick={onClose}
              style={{ fontSize: '0.8rem', padding: '6px 16px', background: '#FFFFFF' }}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureDetailModal;
