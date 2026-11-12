// UnitOfMeasureDeleteModal.jsx - Popup xác nhận xóa đơn vị tính có kiểm soát ràng buộc dữ liệu
import React, { useMemo } from 'react';
import { AlertTriangle, AlertCircle, Ban, Trash2, X } from 'lucide-react';
import unitOfMeasureService from '../services/unitOfMeasure.service';

export const UnitOfMeasureDeleteModal = ({
  show = false,
  unit = null,
  onClose,
  onConfirmDelete,
  onSwitchToInactive
}) => {
  // Kiểm tra ràng buộc dữ liệu
  const usageCheck = useMemo(() => {
    if (!show || !unit) return { inUse: false, usageCount: 0, details: [] };
    return unitOfMeasureService.checkUnitUsage(unit);
  }, [show, unit]);

  if (!show || !unit) return null;

  return (
    <div className="exp-modal-overlay" onClick={onClose}>
      <div 
        className="exp-modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px' }}
      >
        {/* Header Modal */}
        <div 
          className="exp-modal-header"
          style={{ 
            backgroundColor: usageCheck.inUse ? '#FEF3C7' : '#FEE2E2',
            borderBottomColor: usageCheck.inUse ? '#FDE68A' : '#FECACA'
          }}
        >
          <h3 
            className="exp-modal-title"
            style={{ color: usageCheck.inUse ? '#92400E' : '#991B1B' }}
          >
            {usageCheck.inUse ? (
              <AlertTriangle size={18} color="#D97706" />
            ) : (
              <AlertCircle size={18} color="#DC2626" />
            )}
            <span>
              {usageCheck.inUse ? 'Không thể xóa đơn vị tính' : 'Xác nhận xóa đơn vị tính'}
            </span>
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6B7280', display: 'flex', alignItems: 'center' }}
            title="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nội dung Modal */}
        <div className="exp-modal-body">
          {usageCheck.inUse ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#1F2937', lineHeight: 1.5 }}>
                Đơn vị tính <strong>"{unit.code}"</strong> ({unit.full_name || 'không có tên đầy đủ'}) đang được sử dụng trong:
              </p>
              
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.82rem', color: '#B45309', lineHeight: 1.6 }}>
                {usageCheck.details.map((item, idx) => (
                  <li key={idx} style={{ fontWeight: 600 }}>{item}</li>
                ))}
              </ul>

              <div style={{ 
                padding: '10px 12px', 
                backgroundColor: '#FFFBEB', 
                border: '1px solid #FDE68A', 
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: '#78350F',
                lineHeight: 1.45
              }}>
                <strong>Hướng dẫn nghiệp vụ:</strong> Để đảm bảo tính toàn vẹn của chứng từ lịch sử và báo cáo tồn kho, hệ thống không cho phép xóa đơn vị tính đã phát sinh dữ liệu. Bạn có thể chuyển đơn vị tính này sang <strong>"Ngừng hoạt động"</strong> để không cho phép chọn khi tạo chứng từ mới.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#1F2937', lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn xóa đơn vị tính <strong>"{unit.code}"</strong> ({unit.full_name || '—'}) không?
              </p>
              <div style={{ 
                padding: '10px 12px', 
                backgroundColor: '#FEF2F2', 
                border: '1px solid #FECACA', 
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: '#991B1B'
              }}>
                Hành động này sẽ xóa hoàn toàn đơn vị tính khỏi hệ thống và không thể hoàn tác.
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="exp-modal-footer">
          {usageCheck.inUse ? (
            <>
              <button 
                type="button" 
                className="exp-btn-secondary" 
                onClick={onClose}
              >
                Đóng
              </button>
              {unit.status === 'ACTIVE' && (
                <button 
                  type="button" 
                  className="exp-btn-brown"
                  style={{ backgroundColor: '#D97706', borderColor: '#D97706' }}
                  onClick={() => {
                    onSwitchToInactive(unit);
                    onClose();
                  }}
                >
                  <Ban size={14} />
                  <span>Chuyển sang Ngừng hoạt động</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button 
                type="button" 
                className="exp-btn-secondary" 
                onClick={onClose}
              >
                Hủy
              </button>
              <button 
                type="button" 
                style={{
                  height: '34px',
                  padding: '0 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onClick={() => {
                  onConfirmDelete(unit);
                  onClose();
                }}
              >
                <Trash2 size={14} />
                <span>Đồng ý xóa</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnitOfMeasureDeleteModal;
