import React, { useState } from 'react';
import { History, RefreshCw, Clock, ChevronDown } from 'lucide-react';

export const ISOAuditHistoryTab = ({
  auditLogs = [],
  loadingAuditLogs = false,
  fetchAuditLogs,
  detailRecord = {},
  isCreateMode = false
}) => {
  const [expandedLogIds, setExpandedLogIds] = useState({});

  return (
    <div className="iso-viewer-tab-content">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Header bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          backgroundColor: '#FFFFFF',
          padding: '10px 14px',
          borderRadius: '8px',
          border: '1px solid var(--iso-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={16} color="#7B5233" />
            <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#1E293B' }}>
              Nhật ký kiểm toán & Lịch sử thay đổi ({auditLogs.length} sự kiện)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {detailRecord?.id && (
              <button
                type="button"
                className="iso-page-btn"
                style={{ fontSize: '0.76rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                onClick={() => fetchAuditLogs && fetchAuditLogs(detailRecord.id)}
                disabled={loadingAuditLogs}
                title="Làm mới lịch sử"
              >
                <RefreshCw size={13} className={loadingAuditLogs ? 'iso-spinner' : ''} />
                <span>Làm mới</span>
              </button>
            )}
            {!isCreateMode && detailRecord?.id && (
              <span style={{ fontSize: '0.8rem', color: '#64748B', backgroundColor: '#F8FAFC', padding: '4px 10px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                Lần ban hành hiện hành: <b style={{ color: '#7B5233' }}>{detailRecord.edition || '01'}</b>
              </span>
            )}
          </div>
        </div>

        {loadingAuditLogs ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: '#8D6E63' }}>
            <RefreshCw className="iso-spinner" size={28} />
            <div style={{ marginTop: '10px', fontSize: '0.86rem', fontWeight: '600' }}>
              Đang tải lịch sử thay đổi...
            </div>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="iso-empty-history">
            <History size={36} color="#CBD5E1" style={{ margin: '0 auto 10px auto', display: 'block' }} />
            <div style={{ fontSize: '0.92rem', fontWeight: '700', color: '#475569' }}>
              Chưa có lịch sử thay đổi nào được ghi nhận cho hồ sơ này
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '6px', maxWidth: '440px', lineHeight: '1.5' }}>
              Hệ thống sẽ tự động ghi nhận các sự kiện: tạo mới, cập nhật thông tin chung, thêm/xóa file liên quan, cập nhật tài liệu Word, chuyển đổi hoặc lưu nháp khi thao tác thành công.
            </div>
          </div>
        ) : (
          /* TIMELINE ERP G7 - Sắp xếp mới nhất lên đầu */
          <div className="iso-timeline-container">
            {auditLogs.map((log, idx) => {
              const hasChanges = Array.isArray(log.details?.changes) && log.details.changes.length > 0;
              const isExpanded = expandedLogIds[log.id] ?? false;

              const getSemanticClass = (type) => {
                switch (type) {
                  case 'APPROVAL':
                  case 'ACCEPT_CONVERSION':
                  case 'SAVE_CONVERTED_DOC':
                    return 'semantic-success';
                  case 'SUBMIT_APPROVAL':
                  case 'SAVE_DRAFT':
                  case 'STATUS_CHANGE':
                    return 'semantic-warning';
                  case 'REJECT':
                  case 'UNLINK_FILE':
                  case 'DELETE':
                    return 'semantic-danger';
                  default:
                    return 'semantic-neutral';
                }
              };

              const semanticClass = getSemanticClass(log.action_type);

              // Trích xuất các trường delta chính để hiển thị gọn gàng
              const docCodeOld = log.details?.doc_code_old || log.details?.changes?.find(c => c.field === 'suggested_doc_code')?.old_val;
              const docCodeNew = log.details?.doc_code_new || log.details?.changes?.find(c => c.field === 'suggested_doc_code')?.new_val;
              const edOld = log.details?.edition_old || log.details?.changes?.find(c => c.field === 'edition')?.old_val;
              const edNew = log.details?.edition_new || log.details?.changes?.find(c => c.field === 'edition')?.new_val;
              const dateOld = log.details?.issue_date_old || log.details?.changes?.find(c => c.field === 'issue_date')?.old_val;
              const dateNew = log.details?.issue_date_new || log.details?.changes?.find(c => c.field === 'issue_date')?.new_val;
              const deptOld = log.details?.dept_old || log.details?.changes?.find(c => c.field === 'department_in_charge')?.old_val;
              const deptNew = log.details?.dept_new || log.details?.changes?.find(c => c.field === 'department_in_charge')?.new_val;

              const hasDeltaItems = (docCodeOld && docCodeNew) || (edOld && edNew) || (dateOld && dateNew) || (deptOld && deptNew) ||
                (log.details?.source_filename && (log.details?.draft_filename || log.details?.official_filename));

              return (
                <div key={log.id || idx} className="iso-timeline-item">
                  <div className="iso-timeline-marker">
                    <div className={`iso-timeline-dot ${semanticClass}`} />
                    {idx < auditLogs.length - 1 && <div className="iso-timeline-line" />}
                  </div>

                  <div className="iso-timeline-card">
                    <div className="iso-timeline-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={`iso-timeline-badge ${semanticClass}`}>
                          {log.action_label || log.action_type}
                        </span>
                        {log.target_name && (
                          <span className="iso-timeline-target" title={log.target_name}>
                            {log.target_name}
                          </span>
                        )}
                      </div>
                      <div className="iso-timeline-time">
                        <Clock size={12} />
                        <span>{log.created_at || '---'}</span>
                      </div>
                    </div>

                    {/* Thông tin delta */}
                    {hasDeltaItems && (
                      <div className="iso-timeline-delta-list">
                        {docCodeOld && docCodeNew && (
                          <div className="iso-timeline-delta-item">
                            <span className="iso-timeline-delta-label">Mã hiệu:</span>
                            <span className="iso-timeline-delta-val">{docCodeOld} → <b>{docCodeNew}</b></span>
                          </div>
                        )}
                        {edOld && edNew && (
                          <div className="iso-timeline-delta-item">
                            <span className="iso-timeline-delta-label">Lần ban hành:</span>
                            <span className="iso-timeline-delta-val">{edOld} → <b>{edNew}</b></span>
                          </div>
                        )}
                        {dateOld !== undefined && dateNew && (
                          <div className="iso-timeline-delta-item">
                            <span className="iso-timeline-delta-label">Ngày ban hành:</span>
                            <span className="iso-timeline-delta-val">{dateOld || '(Chưa có)'} → <b>{dateNew}</b></span>
                          </div>
                        )}
                        {deptOld && deptNew && (
                          <div className="iso-timeline-delta-item">
                            <span className="iso-timeline-delta-label">Phòng ban:</span>
                            <span className="iso-timeline-delta-val">{deptOld} → <b>{deptNew}</b></span>
                          </div>
                        )}
                        {log.details?.source_filename && (log.details?.draft_filename || log.details?.official_filename) && (
                          <div className="iso-timeline-delta-item">
                            <span className="iso-timeline-delta-label">Tài liệu:</span>
                            <span className="iso-timeline-delta-val">
                              <code>{log.details.source_filename}</code> → <code>{log.details.official_filename || log.details.draft_filename}</code>
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="iso-timeline-footer-info">
                      <span>
                        Người thực hiện: <b>{log.actor_name || 'Hệ thống'}</b>{log.actor_dept ? ` (${log.actor_dept})` : ''}
                      </span>
                      {log.details?.usage_status_label && (
                        <span>Trạng thái: <b>{log.details.usage_status_label}</b></span>
                      )}
                      {log.details?.size_formatted && (
                        <span>Dung lượng: <b>{log.details.size_formatted}</b></span>
                      )}
                    </div>

                    {/* Chi tiết thay đổi */}
                    {hasChanges && (
                      <div className="iso-timeline-diffs-section">
                        <button
                          type="button"
                          className="iso-timeline-expand-btn"
                          onClick={() => setExpandedLogIds(prev => ({ ...prev, [log.id]: !prev[log.id] }))}
                        >
                          <ChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                          <span>{isExpanded ? 'Thu gọn chi tiết' : `Xem chi tiết (${log.details.changes.length} trường thay đổi)`}</span>
                        </button>

                        {isExpanded && (
                          <div className="iso-timeline-diffs-table-wrapper">
                            <table className="iso-timeline-diffs-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '30%' }}>Trường thông tin</th>
                                  <th style={{ width: '35%' }}>Giá trị trước</th>
                                  <th style={{ width: '35%' }}>Giá trị sau</th>
                                </tr>
                              </thead>
                              <tbody>
                                {log.details.changes.map((chg, cIdx) => (
                                  <tr key={cIdx}>
                                    <td className="field-name">{chg.field_label || chg.field}</td>
                                    <td className="old-val">{chg.old_val !== null && chg.old_val !== undefined && String(chg.old_val).trim() !== '' ? String(chg.old_val) : <span className="empty-val">(Trống)</span>}</td>
                                    <td className="new-val">{chg.new_val !== null && chg.new_val !== undefined && String(chg.new_val).trim() !== '' ? String(chg.new_val) : <span className="empty-val">(Trống)</span>}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default ISOAuditHistoryTab;
