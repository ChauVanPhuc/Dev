import React from 'react';
import { Monitor, Phone, Layers, Edit3, Trash2, ShieldAlert, CheckCircle, Clock, AlertCircle, RefreshCw, X, FolderOpen, Clipboard } from 'lucide-react';

const BugDetailsPanel = ({ bugManager }) => {
  const {
    selectedBug,
    setSelectedBug,
    commentText,
    setCommentText,
    commentImages,
    setCommentImages,
    editModalMode,
    setEditModalMode,
    renderSeverityBadge,
    renderStatusBadge,
    renderQuickStatusActions,
    formatDate,
    handleEditSubmit,
    editForm,
    setEditForm,
    itUsers,
    isSubmitting,
    formatDateTime,
    getImageUrl,
    activeLightboxUrl,
    setActiveLightboxUrl,
    updateImages,
    setUpdateImages,
    handleUpdateImageUpload,
    handleRemoveUpdateImage,
    handlePasteImage,
    handleManualUpload,
    handlePasteFromClipboardAPI,
    handleWordUpload,
    handlePostComment,
    newReplyText,
    setNewReplyText,
    handleReplySubmit,
    isReplying,
    handleToggleReplyPinned,
    handleDeleteReply,
    getCurrentUserName,
    parseDescription,
    handleDeleteBug,
    setShowDeleteModal,
    setBugToDelete,
    toast
  } = bugManager;

  return selectedBug ? (
    <>
                {/* Header Chi tiết */}
                <div style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  backgroundColor: '#F8FAFC'
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                        padding: '2px 7px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold',
                        color: '#fff', backgroundColor: selectedBug.platform === 'Web' ? '#3B82F6' : '#EC4899'
                      }}>
                        {selectedBug.platform === 'Web' ? <Monitor size={10} /> : <Phone size={10} />}
                        {selectedBug.platform.toUpperCase()}
                      </span>
                      <strong style={{ fontFamily: 'monospace', color: '#0F172A', fontSize: '0.95rem' }}>
                        {selectedBug.screen_code}
                      </strong>
                      <span style={{ color: '#CBD5E1', fontSize: '0.78rem', fontWeight: '400' }}>#{selectedBug.id}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: '500' }}>
                      {selectedBug.screen_title || '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: '12px' }}>
                    {editModalMode === 'view' ? (
                      <button
                        onClick={() => setEditModalMode('edit')}
                        style={{
                          background: '#fff',
                          border: '1px solid #E2E8F0',
                          color: '#334155',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Edit3 size={12} /> Sửa
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditModalMode('view')}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #E2E8F0',
                          color: '#475569',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Hủy sửa
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedBug(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '6px',
                        borderRadius: '50%',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      title="Đóng panel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* === Info Strip: Mức độ, Trạng thái, Ngày tháng, Xử lý (chỉ hiển khi View Mode) === */}
                {editModalMode === 'view' && (
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
                    padding: '10px 20px', backgroundColor: '#fff',
                    borderBottom: '2px solid #F1F5F9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.05em' }}>MỨC ĐỘ</span>
                      {renderSeverityBadge(selectedBug.severity)}
                    </div>
                    <div style={{ width: '1px', height: '18px', backgroundColor: '#E2E8F0', flexShrink: 0 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.05em' }}>TRẠNG THÁI</span>
                      {renderStatusBadge(selectedBug.status)}
                      <span style={{ fontSize: '0.65rem', color: '#CBD5E1' }}>→</span>
                      {renderQuickStatusActions(selectedBug)}
                    </div>
                    <div style={{ width: '1px', height: '18px', backgroundColor: '#E2E8F0', flexShrink: 0 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: '#64748B' }}>
                      <span style={{ fontWeight: '700', color: '#94A3B8', fontSize: '0.62rem', letterSpacing: '0.04em' }}>BÁO CÁO</span>
                      <span style={{ fontWeight: '600' }}>{formatDate(selectedBug.created_at)}</span>
                    </div>
                    {selectedBug.completed_at && (
                      <>
                        <div style={{ width: '1px', height: '18px', backgroundColor: '#E2E8F0', flexShrink: 0 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: '#059669' }}>
                          <span style={{ fontWeight: '700', color: '#94A3B8', fontSize: '0.62rem', letterSpacing: '0.04em' }}>HOÀN THÀNH</span>
                          <span style={{ fontWeight: '600' }}>{formatDate(selectedBug.completed_at)}</span>
                        </div>
                      </>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: '700', letterSpacing: '0.04em' }}>XỬ LÝ</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#EEF2FF', padding: '3px 8px', borderRadius: '12px', fontWeight: '600', color: '#4F46E5', fontSize: '0.72rem' }}>
                        <span style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#4F46E5', color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {(selectedBug.assignee || 'A').charAt(0).toUpperCase()}
                        </span>
                        {selectedBug.assignee || 'Chưa phân công'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Panel Body */}
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                  {/* Mode: Edit */}
                  {editModalMode === 'edit' && (
                    <form onSubmit={handleEditSubmit} className="modal-form" style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
                      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="form-group">
                          <label style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Màn hình</label>
                          <input
                            type="text"
                            className="form-control disabled-input"
                            value={`[${selectedBug.platform}] ${selectedBug.screen_code} - ${selectedBug.screen_title}`}
                            disabled
                            style={{ borderRadius: '6px', padding: '6px 10px', backgroundColor: '#F3F4F6', fontSize: '0.8rem' }}
                          />
                        </div>

                        <div className="form-group">
                          <label className="required" style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Mô tả lỗi</label>
                          <textarea
                            className="form-control"
                            rows="3"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            required
                            style={{ borderRadius: '6px', padding: '8px', fontSize: '0.8rem' }}
                          />
                        </div>

                        <div className="form-group">
                          <label className="required" style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Người sửa (Người xử lý)</label>
                          <select
                            className="form-control"
                            value={editForm.assignee}
                            onChange={(e) => setEditForm({ ...editForm, assignee: e.target.value })}
                            required
                            style={{ borderRadius: '6px', padding: '6px', fontSize: '0.8rem' }}
                          >
                            <option value="">-- Chưa chỉ định --</option>
                            {itUsers.map(u => (
                              <option key={u.id} value={u.full_name || u.username}>
                                {u.full_name ? `${u.full_name} (${u.username})` : u.username}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div className="form-group">
                            <label style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Trạng thái</label>
                            <select
                              className="form-control"
                              value={editForm.status}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                const completedVal = (newStatus === 'Resolved' || newStatus === 'Verified')
                                  ? new Date().toISOString().split('T')[0]
                                  : '';
                                setEditForm({ ...editForm, status: newStatus, completed_at: completedVal });
                              }}
                              style={{ borderRadius: '6px', padding: '6px', fontSize: '0.8rem' }}
                            >
                              <option value="New">Mới</option>
                              <option value="In Progress">Cần kiểm tra</option>
                              <option value="Resolved">Đã sửa</option>
                              <option value="Verified">Đã xác nhận</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Mức độ</label>
                            <select
                              className="form-control"
                              value={editForm.severity}
                              onChange={(e) => setEditForm({ ...editForm, severity: e.target.value })}
                              style={{ borderRadius: '6px', padding: '6px', fontSize: '0.8rem' }}
                            >
                              <option value="Critical">Khẩn cấp</option>
                              <option value="High">Cao</option>
                              <option value="Medium">Trung bình</option>
                              <option value="Low">Thấp</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div className="form-group">
                            <label className="required" style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Dự kiến hoàn thành</label>
                            <input
                              type="date"
                              className="form-control"
                              value={editForm.requested_at}
                              onChange={(e) => setEditForm({ ...editForm, requested_at: e.target.value })}
                              required
                              min={getTodayString()}
                              style={{ borderRadius: '6px', padding: '6px', fontSize: '0.8rem' }}
                            />
                          </div>

                          <div className="form-group">
                            <label style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Ngày hoàn thành</label>
                            <input
                              type="date"
                              className="form-control"
                              value={editForm.completed_at}
                              onChange={(e) => setEditForm({ ...editForm, completed_at: e.target.value })}
                              disabled={editForm.status !== 'Resolved' && editForm.status !== 'Verified'}
                              style={{ borderRadius: '6px', padding: '6px', fontSize: '0.8rem', backgroundColor: (editForm.status !== 'Resolved' && editForm.status !== 'Verified') ? '#F3F4F6' : '#fff' }}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Ghi chú thay đổi</label>
                          <textarea
                            className="form-control"
                            rows="2"
                            placeholder="Lý do cập nhật thông tin lỗi..."
                            value={editForm.notes}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            style={{ borderRadius: '6px', padding: '6px 8px', fontSize: '0.8rem' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', padding: '16px', borderTop: '1px solid #E5E7EB', backgroundColor: '#fff' }}>
                        <button type="button" className="btn-secondary" onClick={() => setEditModalMode('view')} style={{ borderRadius: '6px', flex: 1, fontSize: '0.8rem', height: '34px' }} disabled={isSubmitting}>Hủy</button>
                        <button type="submit" className="btn-primary" style={{ borderRadius: '6px', backgroundColor: '#7B5233', borderColor: '#7B5233', flex: 1, fontSize: '0.8rem', height: '34px', color: '#fff', fontWeight: 'bold' }} disabled={isSubmitting}>
                          {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Mode: View */}
                  {editModalMode === 'view' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '15px' }}>

                        {/* Báo cáo lỗi ban đầu */}
                        <div style={{
                          padding: '16px',
                          backgroundColor: '#fff',
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0',
                          borderLeft: selectedBug.severity === 'Critical' ? '4px solid #F43F5E' :
                            selectedBug.severity === 'High' ? '4px solid #F59E0B' :
                              selectedBug.severity === 'Medium' ? '4px solid #EAB308' : '4px solid #94A3B8',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: '700', color: '#475569', letterSpacing: '0.05em' }}>BÁO CÁO GỐC</span>
                            </div>
                            <span>{formatDateTime(selectedBug.created_at)}</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: '#475569', marginBottom: '12px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#94A3B8' }}>Người báo:</span>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: '#F1F5F9',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: '600',
                                color: '#334155'
                              }}>
                                <span style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#6366F1', color: '#fff', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {(selectedBug.reporter || 'U').charAt(0).toUpperCase()}
                                </span>
                                {selectedBug.reporter || 'Chưa rõ'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#94A3B8' }}>Người xử lý:</span>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: '#EEF2FF',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: '600',
                                color: '#4F46E5'
                              }}>
                                <span style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#4F46E5', color: '#fff', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {(selectedBug.assignee || 'A').charAt(0).toUpperCase()}
                                </span>
                                {selectedBug.assignee || 'Chưa phân công'}
                              </span>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.82rem', color: '#1E293B', whiteSpace: 'pre-wrap', lineHeight: '1.5', fontWeight: '500', marginBottom: '10px' }}>
                            {(() => {
                              const { tag, text } = parseDescription(selectedBug.description);
                              return (
                                <>
                                  {tag && (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.65rem',
                                      fontWeight: 'bold',
                                      color: '#4F46E5',
                                      backgroundColor: '#EEF2FF',
                                      border: '1px solid #E0E7FF',
                                      marginRight: '6px'
                                    }}>
                                      {tag}
                                    </span>
                                  )}
                                  <span>{text}</span>
                                </>
                              );
                            })()}
                          </div>
                          {selectedBug.notes && (
                            <div style={{
                              marginTop: '10px',
                              padding: '8px 12px',
                              backgroundColor: '#FAF5F0',
                              borderLeft: '3px solid #7B5233',
                              borderRadius: '4px',
                              fontSize: '0.78rem',
                              color: '#5C4033',
                              fontStyle: 'italic',
                              whiteSpace: 'pre-wrap'
                            }}>
                              <strong>Ghi chú:</strong> {selectedBug.notes}
                            </div>
                          )}
                          {selectedBug.images && selectedBug.images.filter(img => !img.update_id).length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                              {selectedBug.images.filter(img => !img.update_id).map(img => (
                                <img
                                  key={img.id}
                                  src={getImageUrl(img.image_path)}
                                  alt="initial-attachment"
                                  onClick={() => setActiveLightboxUrl(getImageUrl(img.image_path))}
                                  style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px', cursor: 'zoom-in', border: '1px solid #E2E8F0', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        <h4 style={{ color: '#475569', margin: '8px 0', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Layers size={14} /> Lịch sử & Phản hồi
                          <span style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', padding: '2px 7px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '700' }}>
                            {selectedBug.updates ? selectedBug.updates.length : 0}
                          </span>
                        </h4>

                        {/* Timeline container */}
                        <div className="timeline-container" style={{
                          paddingRight: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          position: 'relative',
                          paddingLeft: '14px',
                          borderLeft: '2px solid #F1F5F9',
                          marginLeft: '8px'
                        }}>
                          {selectedBug.updates && selectedBug.updates.length > 0 ? (
                            selectedBug.updates.map(up => (
                              <div key={up.id} style={{ position: 'relative', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                {/* Circle node marker on line */}
                                <div style={{
                                  position: 'absolute',
                                  left: '-20px',
                                  top: '16px',
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  backgroundColor: up.status === 'Resolved' || up.status === 'Verified' ? '#10B981' : '#6366F1',
                                  border: '2px solid #fff',
                                  boxShadow: '0 0 0 2px #E2E8F0'
                                }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748B', marginBottom: '6px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      backgroundColor: '#475569',
                                      color: '#fff',
                                      fontSize: '9px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 'bold'
                                    }}>
                                      {(up.updater || 'H').charAt(0).toUpperCase()}
                                    </span>
                                    <span style={{ fontWeight: '700', color: '#334155' }}>{up.updater || 'Hệ thống'}</span>
                                    {up.status && renderStatusBadge(up.status)}
                                  </div>
                                  <span>{formatDateTime(up.created_at)}</span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.4', fontWeight: '500' }}>
                                  {up.notes}
                                </div>
                                {up.images && up.images.length > 0 && (
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                    {up.images.map(img => (
                                      <img
                                        key={img.id}
                                        src={getImageUrl(img.image_path)}
                                        alt="update-attachment"
                                        onClick={() => setActiveLightboxUrl(getImageUrl(img.image_path))}
                                        style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px', cursor: 'zoom-in', border: '1px solid #E2E8F0', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.transform = 'scale(1.05)';
                                          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'scale(1)';
                                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                                        }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '15px' }}>
                              Chưa có lượt cập nhật tiến độ nào.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Form đăng phản hồi/cập nhật mới */}
                      <div style={{ borderTop: '1px solid #E2E8F0', padding: '16px', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <h5 style={{ color: '#475569', margin: 0, fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Thêm phản hồi nhanh</h5>
                          <span style={{ fontSize: '0.7rem', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4F46E5', color: '#fff', fontSize: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {(getCurrentUserName() || 'U').charAt(0).toUpperCase()}
                            </span>
                            Đang nhập: <strong>{getCurrentUserName() || 'User'}</strong>
                          </span>
                        </div>
                        <textarea
                          className="form-control"
                          rows="2"
                          placeholder="Nhập phản hồi... Nhấn Ctrl+V để dán ảnh chụp màn hình."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onPaste={(e) => {
                            const clipboardData = e.clipboardData || (e.nativeEvent && e.nativeEvent.clipboardData);
                            const items = clipboardData?.items || [];
                            let hasImage = false;
                            for (let i = 0; i < items.length; i++) {
                              if (items[i].type.indexOf('image') !== -1) {
                                hasImage = true;
                                break;
                              }
                            }
                            if (hasImage) {
                              e.preventDefault();
                              handlePasteImage(e, setCommentImages);
                            }
                          }}
                          style={{ fontSize: '0.8rem', borderRadius: '8px', padding: '8px 12px', border: '1px solid #E2E8F0', outline: 'none', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }}
                          onFocus={(e) => e.currentTarget.style.borderColor = '#6366F1'}
                          onBlur={(e) => e.currentTarget.style.borderColor = '#E2E8F0'}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              id="comment-file-upload"
                              onChange={(e) => handleManualUpload(e, setCommentImages)}
                              style={{ display: 'none' }}
                            />
                            <label
                              htmlFor="comment-file-upload"
                              style={{
                                fontSize: '0.72rem',
                                color: '#475569',
                                fontWeight: '600',
                                cursor: 'pointer',
                                border: '1px solid #E2E8F0',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                backgroundColor: '#fff',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                            >
                              📎 Đính kèm ảnh
                            </label>
                          </div>

                          <button
                            type="button"
                            onClick={handlePostComment}
                            disabled={!commentText.trim() && commentImages.length === 0}
                            style={{
                              backgroundColor: '#4F46E5',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 16px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: (!commentText.trim() && commentImages.length === 0) ? 'not-allowed' : 'pointer',
                              opacity: (!commentText.trim() && commentImages.length === 0) ? 0.5 : 1,
                              transition: 'all 0.2s',
                              boxShadow: '0 1px 2px rgba(79, 70, 229, 0.1)'
                            }}
                          >
                            Gửi phản hồi
                          </button>
                        </div>

                        {commentImages.length > 0 && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', backgroundColor: '#F8FAFC', padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                            {commentImages.map((path, idx) => (
                              <div key={idx} style={{ position: 'relative', width: '48px', height: '48px' }}>
                                <img src={getImageUrl(path)} alt="comment-preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E2E8F0' }} />
                                <button
                                  type="button"
                                  onClick={() => setCommentImages(prev => prev.filter((_, i) => i !== idx))}
                                  style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: '#EF4444', color: '#fff', border: 'none', borderRadius: '50%', width: '14px', height: '14px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Placeholder Card khi chưa chọn bug
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: '400px',
                color: '#94A3B8',
                textAlign: 'center',
                padding: '24px',
                backgroundColor: '#F8FAFC',
                border: '2px dashed #E2E8F0',
                margin: '16px',
                borderRadius: '12px'
              }}>
                <Layers size={44} style={{ marginBottom: '12px', color: '#CBD5E1' }} />
                <h4 style={{ margin: '0 0 6px 0', color: '#0F172A', fontSize: '0.92rem', fontWeight: '700' }}>Chưa chọn báo cáo lỗi</h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', lineHeight: '1.5', maxWidth: '240px' }}>
                  Vui lòng chọn một hàng trong danh sách bên trái để xem chi tiết lịch sử, bình luận phản hồi và cập nhật tiến độ xử lý lỗi.
                </p>
              </div>
            );
};

export default BugDetailsPanel;
