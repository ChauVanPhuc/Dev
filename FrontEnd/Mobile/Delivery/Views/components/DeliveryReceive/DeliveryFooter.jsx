import React from 'react';
import { Check, X, RotateCcw, CheckCircle, Pencil, Trash2 } from 'lucide-react';

const DeliveryFooter = ({
  delivery,
  isQC,
  isAdmin,
  isSender,
  isReceiver,
  canAccessQCTab,
  canSaveQC,
  inspectionResult,
  activeTab,
  handleGoToReturn,
  handleSaveQC,
  handleCreateReturnSlip,
  handleConfirm,
  handleEditDelivery,
  handleDeleteDelivery,
  isSubmitting,
  isPendingReceiving,
  isPendingInspection,
  navigate
}) => {
  // Chỉ hiện nút QC nếu là QC/Admin VÀ có quyền xem tab QC
  const showQCFooter = (isQC || isAdmin) && canAccessQCTab;

  // Kiểm tra xem user là bên Giao (sender) và phiếu đang chờ nhận
  // → Hiện nút Chỉnh sửa + Xóa thay vì nút Xác nhận
  const showSenderEditFooter = isSender && !isReceiver && isPendingReceiving && !showQCFooter;

  return (
    <div className="responsive-fixed-footer" style={{ backgroundColor: 'var(--bg-cream)', padding: '16px', display: 'flex', gap: '12px', borderTop: '1px solid #e2e8f0', zIndex: 50 }}>
      {showQCFooter ? (
        <>
          <button
            onClick={() => {
              if (activeTab === 'returns') {
                handleCreateReturnSlip();
              } else if (inspectionResult === 'fail') {
                handleGoToReturn();
              } else {
                handleSaveQC();
              }
            }}
            disabled={isSubmitting || !canSaveQC}
            style={{
              flex: 1,
              backgroundColor: !canSaveQC ? '#94a3b8' : (inspectionResult === 'fail' ? '#ef4444' : '#4e342e'),
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              height: '48px',
              fontSize: '0.9rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: !canSaveQC ? 0.6 : 1,
              cursor: !canSaveQC ? 'not-allowed' : 'pointer',
              boxShadow: !canSaveQC ? 'none' : (inspectionResult === 'fail' ? '0 4px 12px rgba(239, 68, 68, 0.2)' : '0 4px 12px rgba(78, 52, 46, 0.2)')
            }}
          >
            {isSubmitting ? 'Đang lưu...' : (
              delivery?.status === 'Chờ Nhận Hàng' ? 'Chờ SX nhận...' : (
                <>
                  {inspectionResult === 'fail' ? <X size={20} strokeWidth={3} /> : <CheckCircle size={20} strokeWidth={3} />}
                  {inspectionResult === 'fail' ? 'Trả hàng' : 'Xác nhận QC'}
                </>
              )
            )}
          </button>
          <button
            onClick={() => navigate(-1)}
            style={{
              flex: 1,
              backgroundColor: '#fff',
              color: '#64748b',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              height: '48px',
              fontSize: '0.9rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <RotateCcw size={18} /> Hủy
          </button>
        </>
      ) : showSenderEditFooter ? (
        /* Footer dành cho bên Giao — chỉ hiện khi phiếu còn Chờ Nhận Hàng */
        <>
          <button
            onClick={handleEditDelivery}
            disabled={isSubmitting}
            style={{
              flex: 1,
              backgroundColor: '#4e342e',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              height: '48px',
              fontSize: '0.9rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(78, 52, 46, 0.2)'
            }}
          >
            <Pencil size={18} strokeWidth={3} /> Chỉnh sửa phiếu
          </button>
          <button
            onClick={() => navigate(-1)}
            style={{
              flex: 1,
              backgroundColor: '#fff',
              color: '#64748b',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              height: '48px',
              fontSize: '0.9rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <RotateCcw size={18} /> Hủy
          </button>
        </>
      ) : (
        /* Footer mặc định cho bên Nhận (SX Nhận) */
        <>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !isPendingReceiving || isQC || (isSender && !isReceiver)}
            style={{
              flex: 1,
              backgroundColor: (!isPendingReceiving || isQC || (isSender && !isReceiver)) ? '#94a3b8' : '#4e342e',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              height: '48px',
              fontSize: '0.9rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: (!isPendingReceiving || isQC || (isSender && !isReceiver)) ? 0.6 : 1,
              cursor: (!isPendingReceiving || isQC || (isSender && !isReceiver)) ? 'not-allowed' : 'pointer',
              boxShadow: (!isPendingReceiving || isQC || (isSender && !isReceiver)) ? 'none' : '0 4px 12px rgba(78, 52, 46, 0.2)'
            }}
          >
            {isSubmitting ? 'Đang xử lý...' : (
              <>
                <CheckCircle size={20} strokeWidth={3} />
                {isQC ? 'Chỉ SX được nhận' : (isSender && !isReceiver) ? 'Chờ bên nhận xác nhận' : 'Xác nhận'}
              </>
            )}
          </button>
          <button
            onClick={() => navigate(-1)}
            style={{
              flex: 1,
              backgroundColor: '#fff',
              color: '#64748b',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              height: '48px',
              fontSize: '0.9rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <RotateCcw size={18} /> Hủy
          </button>
        </>
      )}
    </div>
  );
};

export default DeliveryFooter;
