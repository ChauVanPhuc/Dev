import React from 'react';
import { History, X, CheckCircle2, AlertOctagon, Share2, Clock, FileText } from 'lucide-react';
import { formatVietnameseDateTime } from '../utils/isoDateUtils';

/**
 * Modal hiển thị vết lịch sử phê duyệt (Audit Trail Log) của hồ sơ
 */
export const ApprovalHistoryModal = ({
  show,
  item,
  logs = [],
  onClose,
  loading = false
}) => {
  if (!show || !item) return null;

  const getActionBadge = (action) => {
    switch ((action || '').toUpperCase()) {
      case 'APPROVE':
        return (
          <span className="iso-badge iso-badge-approved">
            <CheckCircle2 size={13} /> Đã phê duyệt
          </span>
        );
      case 'REJECT':
        return (
          <span className="iso-badge iso-badge-rejected">
            <AlertOctagon size={13} /> Yêu cầu sửa đổi / Từ chối
          </span>
        );
      case 'FORWARD':
        return (
          <span className="iso-badge" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
            <Share2 size={13} /> Chuyển cấp duyệt
          </span>
        );
      default:
        return (
          <span className="iso-badge iso-badge-draft">
            <Clock size={13} /> {action}
          </span>
        );
    }
  };

  return (
    <div className="iso-modal-backdrop" onClick={onClose}>
      <div className="iso-modal-content iso-modal-md" onClick={(e) => e.stopPropagation()}>
        <div className="iso-modal-header">
          <h3 className="iso-modal-title">
            <History size={20} color="#7B5233" />
            Nhật ký vết phê duyệt (Audit Trail)
          </h3>
          <button className="iso-modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="iso-modal-body">
          {/* Header vắn tắt */}
          <div style={{
            background: '#FAF6F0',
            border: '1px solid #EADCC9',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '18px'
          }}>
            <div style={{ fontSize: '0.82rem', color: '#8D6E63', fontWeight: 600 }}>
              {item.item_type_label || (item.item_type === 'document' ? 'Tài liệu mẫu ISO' : 'Quy trình thực tế')}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#2D1A12', marginTop: '2px' }}>
              <span style={{ color: '#7B5233', marginRight: '6px' }}>[{item.code}]</span>
              {item.name}
            </div>
          </div>

          {loading ? (
            <div className="iso-empty-state">
              <div className="iso-pulse-dot" style={{ width: '12px', height: '12px' }} />
              <div>Đang tải lịch sử vết duyệt...</div>
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="iso-empty-state">
              <FileText size={36} color="#CBD5E1" />
              <p className="iso-empty-title">Chưa có dữ liệu vết duyệt</p>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                Hồ sơ này hiện chưa phát sinh các lần phê duyệt, từ chối hay chuyển cấp trong hệ thống.
              </p>
            </div>
          ) : (
            <div className="iso-timeline">
              {logs.map((log) => {
                const isApprove = log.action === 'APPROVE';
                const isReject = log.action === 'REJECT';
                const dotClass = isApprove ? 'approve' : isReject ? 'reject' : '';

                return (
                  <div key={log.id} className="iso-timeline-item">
                    <div className={`iso-timeline-dot ${dotClass}`}>
                      {isApprove ? (
                        <CheckCircle2 size={12} color="#059669" />
                      ) : isReject ? (
                        <AlertOctagon size={12} color="#DC2626" />
                      ) : (
                        <Clock size={12} color="#7B5233" />
                      )}
                    </div>
                    <div className="iso-timeline-card">
                      <div className="iso-timeline-meta">
                        <div>{getActionBadge(log.action)}</div>
                        <span style={{ fontSize: '0.78rem', color: '#8D6E63', fontWeight: 600 }}>
                          {formatVietnameseDateTime(log.created_at)}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2D1A12', marginTop: '6px' }}>
                        Người thực hiện: <span style={{ color: '#7B5233' }}>{log.action_by_name || log.action_by || 'Hệ thống'}</span>
                        {log.role && <span style={{ fontWeight: 500, color: '#6B7280', marginLeft: '6px' }}>({log.role})</span>}
                      </div>

                      {(log.previous_status || log.new_status) && (
                        <div style={{ fontSize: '0.82rem', color: '#6B7280', marginTop: '4px' }}>
                          Trạng thái: <b>{log.previous_status || 'Khởi tạo'}</b> &rarr; <b>{log.new_status}</b>
                        </div>
                      )}

                      {log.comment && (
                        <div style={{
                          marginTop: '8px',
                          padding: '8px 10px',
                          background: '#FFFFFF',
                          borderRadius: '6px',
                          border: '1px solid #EADCC9',
                          fontSize: '0.85rem',
                          color: '#374151',
                          fontStyle: 'italic'
                        }}>
                          "{log.comment}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="iso-modal-footer">
          <button type="button" className="iso-btn iso-btn-primary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalHistoryModal;
