import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, AlertOctagon, Share2, X, AlertTriangle, ShieldCheck, PenTool } from 'lucide-react';
import isoSignatureService from '@modules/ISOSignature/services/isoSignature.service';

/**
 * Dialog xử lý tác vụ: Phê duyệt, Từ chối (yêu cầu lý do), Chuyển cấp duyệt
 */
export const ApprovalActionModal = ({
  show,
  actionType = 'approve', // 'approve' | 'reject' | 'forward'
  item,
  onClose,
  onSubmit,
  loading = false
}) => {
  const [comment, setComment] = useState('');
  const [approverName, setApproverName] = useState('');
  const [forwardData, setForwardData] = useState({
    newApproverName: '',
    newApproverRole: '',
    note: ''
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [signaturesList, setSignaturesList] = useState([]);

  useEffect(() => {
    if (show) {
      setErrorMsg('');
      setComment('');
      setForwardData({ newApproverName: '', newApproverRole: '', note: '' });

      // Lấy thông tin user đăng nhập hiện tại nếu có
      try {
        const storedUser = localStorage.getItem('smartflow_user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          setApproverName(u.full_name || u.name || u.username || '');
        }
      } catch (e) {
        setApproverName('');
      }

      // Tải danh sách chữ ký
      isoSignatureService.getSignatures().then(res => {
        if (Array.isArray(res)) setSignaturesList(res);
      }).catch(() => {});
    }
  }, [show, actionType, item]);

  const isCompanyLevel = item?.document_level !== 'Cấp phòng';
  const isBgdStage = (item?.status || '').toLowerCase().includes('chờ bgđ');

  const currentApproverSig = useMemo(() => {
    if (!signaturesList.length || !item) return null;
    if (approverName) {
      const match = signaturesList.find(s => s.full_name?.toLowerCase() === approverName.toLowerCase() || s.user_code?.toLowerCase() === approverName.toLowerCase());
      if (match) return match;
    }
    if (isBgdStage) {
      return signaturesList.find(s => s.department === 'BGD' || s.position?.toLowerCase().includes('giám đốc') || s.user_code === 'BGD_CEO') || signaturesList[1];
    }
    return signaturesList.find(s => s.department === item?.department && s.position?.toLowerCase().includes('trưởng phòng')) ||
           signaturesList.find(s => s.position?.toLowerCase().includes('trưởng phòng')) ||
           signaturesList[0];
  }, [signaturesList, approverName, isBgdStage, item]);

  if (!show || !item) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (actionType === 'reject') {
      if (!comment.trim()) {
        setErrorMsg('Vui lòng nhập rõ lý do từ chối hoặc nội dung cần chỉnh sửa!');
        return;
      }
      onSubmit({
        actionType: 'reject',
        item_type: item.item_type,
        item_id: item.id,
        comment: comment.trim(),
        approver_name: approverName.trim()
      });
    } else if (actionType === 'forward') {
      if (!forwardData.newApproverName.trim()) {
        setErrorMsg('Vui lòng nhập họ tên người nhận chuyển tiếp phê duyệt!');
        return;
      }
      onSubmit({
        actionType: 'forward',
        item_type: item.item_type,
        item_id: item.id,
        new_approver_name: forwardData.newApproverName.trim(),
        new_approver_role: forwardData.newApproverRole.trim(),
        note: forwardData.note.trim(),
        forwarded_by: approverName.trim()
      });
    } else {
      // approve
      onSubmit({
        actionType: 'approve',
        item_type: item.item_type,
        item_id: item.id,
        comment: comment.trim(),
        approver_name: approverName.trim()
      });
    }
  };

  const getHeaderInfo = () => {
    switch (actionType) {
      case 'reject':
        return {
          title: 'Yêu cầu sửa đổi / Từ chối hồ sơ',
          icon: <AlertOctagon size={22} color="#DC2626" />,
          btnText: 'Xác nhận từ chối',
          btnClass: 'iso-btn-danger'
        };
      case 'forward':
        return {
          title: 'Chuyển cấp / Người duyệt khác',
          icon: <Share2 size={22} color="#2563EB" />,
          btnText: 'Xác nhận chuyển',
          btnClass: 'iso-btn-primary'
        };
      case 'approve':
      default:
        if (isCompanyLevel) {
          if (isBgdStage) {
            return {
              title: 'Ban Giám Đốc phê duyệt ban hành (Cấp công ty)',
              icon: <CheckCircle2 size={22} color="#059669" />,
              btnText: 'Phê duyệt ban hành',
              btnClass: 'iso-btn-success'
            };
          } else {
            return {
              title: 'Trưởng phòng ký duyệt (Cấp công ty)',
              icon: <CheckCircle2 size={22} color="#059669" />,
              btnText: 'Duyệt & Chuyển lên BGĐ',
              btnClass: 'iso-btn-success'
            };
          }
        }
        return {
          title: 'Trưởng phòng phê duyệt ban hành (Cấp phòng)',
          icon: <CheckCircle2 size={22} color="#059669" />,
          btnText: 'Phê duyệt ban hành',
          btnClass: 'iso-btn-success'
        };
    }
  };

  const { title, icon, btnText, btnClass } = getHeaderInfo();

  return (
    <div className="iso-modal-backdrop" onClick={onClose}>
      <div className="iso-modal-content iso-modal-md" onClick={(e) => e.stopPropagation()}>
        <div className="iso-modal-header">
          <h3 className="iso-modal-title">
            {icon}
            {title}
          </h3>
          <button className="iso-modal-close-btn" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="iso-modal-body">
            {/* Thông tin vắn tắt về hồ sơ đang thao tác */}
            <div style={{
              background: '#FAF6F0',
              border: '1px solid #EADCC9',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '0.82rem', color: '#8D6E63', fontWeight: 600 }}>
                {item.item_type_label || (item.item_type === 'document' ? 'Tài liệu mẫu ISO' : 'Quy trình thực tế')}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#2D1A12', marginTop: '2px' }}>
                <span style={{ color: '#7B5233', marginRight: '6px' }}>[{item.code}]</span>
                {item.name}
              </div>
            </div>

            {errorMsg && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#991B1B',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '14px'
              }}>
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Các trường theo từng loại action */}
            {actionType === 'forward' ? (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#2D1A12', marginBottom: '6px' }}>
                    Người nhận chuyển tiếp phê duyệt <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="iso-search-input"
                    placeholder="VD: Nguyễn Văn A (Tổng Giám Đốc)"
                    value={forwardData.newApproverName}
                    onChange={(e) => setForwardData({ ...forwardData, newApproverName: e.target.value })}
                    required
                    style={{ paddingLeft: '14px' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#2D1A12', marginBottom: '6px' }}>
                    Chức danh / Cấp thẩm quyền
                  </label>
                  <input
                    type="text"
                    className="iso-search-input"
                    placeholder="VD: Ban Giám Đốc, Trưởng phòng Kỹ thuật..."
                    value={forwardData.newApproverRole}
                    onChange={(e) => setForwardData({ ...forwardData, newApproverRole: e.target.value })}
                    style={{ paddingLeft: '14px' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#2D1A12', marginBottom: '6px' }}>
                    Ghi chú / Chỉ đạo chuyển tiếp
                  </label>
                  <textarea
                    rows={3}
                    className="iso-search-input"
                    style={{ height: 'auto', padding: '10px 14px' }}
                    placeholder="Nhập ghi chú hoặc lý do chuyển cấp duyệt..."
                    value={forwardData.note}
                    onChange={(e) => setForwardData({ ...forwardData, note: e.target.value })}
                  />
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#2D1A12', marginBottom: '6px' }}>
                    Họ tên người phê duyệt / ký xác nhận
                  </label>
                  <input
                    type="text"
                    className="iso-search-input"
                    placeholder="Họ tên người duyệt..."
                    value={approverName}
                    onChange={(e) => setApproverName(e.target.value)}
                    style={{ paddingLeft: '14px' }}
                  />
                </div>

                {/* Khung hiển thị trước mẫu chữ ký sẽ áp dụng */}
                {actionType === 'approve' && currentApproverSig && (
                  <div style={{
                    background: '#FAF6F0',
                    border: '1px solid #EADCC9',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7B5233', textTransform: 'uppercase' }}>
                        Chữ ký phê duyệt áp dụng:
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#1F2937', fontWeight: 700 }}>
                        {currentApproverSig.full_name} ({currentApproverSig.signature_type === 'DIGITAL' ? 'Chữ ký điện tử / PKI CA' : 'Chữ ký tay'})
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#8D6E63' }}>
                        {currentApproverSig.position || (isBgdStage ? 'Ban Giám Đốc' : 'Trưởng phòng')}
                      </div>
                    </div>
                    <div>
                      {currentApproverSig.signature_type === 'DIGITAL' ? (
                        <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <ShieldCheck size={13} /> {currentApproverSig.digital_cert_provider?.split(' ')[0] || 'CA'}
                        </span>
                      ) : (
                        <img
                          src={currentApproverSig.signature_data || currentApproverSig.image_path}
                          alt="Chữ ký phê duyệt"
                          style={{ maxHeight: '36px', maxWidth: '120px', objectFit: 'contain' }}
                        />
                      )}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#2D1A12', marginBottom: '6px' }}>
                    {actionType === 'reject' ? (
                      <>
                        Lý do từ chối & Yêu cầu chỉnh sửa <span style={{ color: '#DC2626' }}>*</span>
                      </>
                    ) : (
                      'Ý kiến chỉ đạo / Nhận xét phê duyệt'
                    )}
                  </label>
                  <textarea
                    rows={4}
                    className="iso-search-input"
                    style={{
                      height: 'auto',
                      padding: '10px 14px',
                      borderColor: actionType === 'reject' ? '#FCA5A5' : undefined
                    }}
                    placeholder={
                      actionType === 'reject'
                        ? 'Vui lòng nêu chi tiết các điểm chưa đạt, lỗi quy trình hoặc nội dung cần phòng ban biên soạn sửa đổi...'
                        : 'Nhập ý kiến chỉ đạo triển khai hoặc căn cứ ban hành (không bắt buộc)...'
                    }
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Thông báo điều kiện */}
            <div style={{
              fontSize: '0.82rem',
              color: actionType === 'reject' ? '#991B1B' : '#8D6E63',
              background: actionType === 'reject' ? '#FEF2F2' : '#F9FAFB',
              border: `1px solid ${actionType === 'reject' ? '#FECACA' : '#E5E7EB'}`,
              borderRadius: '6px',
              padding: '10px 14px',
              lineHeight: 1.5
            }}>
              {actionType === 'reject'
                ? 'Lưu ý: Khi từ chối, hồ sơ sẽ chuyển sang trạng thái "Từ chối" và ghi nhận vào lịch sử kiểm duyệt ISO.'
                : actionType === 'forward'
                ? 'Hồ sơ sẽ được chuyển đến người phụ trách mới kèm theo các ghi chú chỉ đạo.'
                : isCompanyLevel
                ? isBgdStage
                  ? 'Cấp công ty: Hồ sơ đã được Trưởng phòng ký duyệt. Ban Giám Đốc xác nhận phê duyệt sẽ chính thức ban hành quy trình/tài liệu có hiệu lực toàn công ty.'
                  : 'Cấp công ty: Trưởng phòng ký duyệt thông qua cấp phòng. Hồ sơ sẽ tự động chuyển tiếp lên Ban Giám Đốc để ký duyệt ban hành.'
                : 'Cấp phòng: Trưởng phòng ký duyệt hoàn tất ban hành áp dụng trong phạm vi phòng ban.'}
            </div>
          </div>

          <div className="iso-modal-footer">
            <button
              type="button"
              className="iso-btn iso-btn-outline"
              onClick={onClose}
              disabled={loading}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className={`iso-btn ${btnClass}`}
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : btnText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApprovalActionModal;
