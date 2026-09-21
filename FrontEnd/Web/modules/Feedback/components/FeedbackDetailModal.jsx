import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Save, Trash2, CheckCircle2, AlertCircle, Clock, User, MapPin, Calendar, FileText, Send, Volume2, Image as ImageIcon, Plus, Upload } from 'lucide-react';
import { feedbackService } from '../services/feedback.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';

export const FeedbackDetailModal = ({ report, onClose, onSaved, onDelete, onImageClick }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'images' | 'action'

  // Form states
  const [status, setStatus] = useState('Chờ xử lý');
  const [handlerName, setHandlerName] = useState('Ban Quản Lý');
  const [handlerResponse, setHandlerResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  // Images state
  const [imagesList, setImagesList] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [localLightbox, setLocalLightbox] = useState(null);
  const imageInputRef = useRef(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', type: 'warning', onConfirm: null });

  useEffect(() => {
    if (report) {
      setStatus(report.status || 'Chờ xử lý');
      setHandlerName(report.handler_name || 'Ban Quản Lý');
      setHandlerResponse(report.handler_response || '');
      setActiveTab('info');

      // Phân tích hình ảnh
      let parsed = [];
      try {
        if (typeof report.images === 'string') {
          parsed = JSON.parse(report.images);
        } else if (Array.isArray(report.images)) {
          parsed = report.images;
        }
      } catch (e) {
        parsed = [];
      }
      setImagesList(Array.isArray(parsed) ? parsed : []);
    }
  }, [report]);

  // Phím tắt Esc đóng Modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (localLightbox) {
          setLocalLightbox(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, localLightbox]);

  // Upload thêm ảnh mới vào báo cáo
  const handleUploadImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImage(true);
    try {
      const newUrls = [];
      for (const file of files) {
        const res = await feedbackService.uploadImage(file);
        const url = res?.data?.url || res?.url;
        if (url) {
          newUrls.push(url);
        }
      }

      const updatedList = [...imagesList, ...newUrls];
      setImagesList(updatedList);

      // Cập nhật ngay vào CSDL
      await feedbackService.updateReport(report.id, {
        images: JSON.stringify(updatedList)
      });
      report.images = JSON.stringify(updatedList);

      toast('success', `Đã tải lên và lưu ${newUrls.length} ảnh mới thành công!`);
      if (onSaved) onSaved();
    } catch (err) {
      console.error('Lỗi khi tải ảnh:', err);
      toast('error', 'Không thể tải ảnh lên: ' + (err.message || 'Lỗi server'));
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // Xóa ảnh khỏi báo cáo
  const handleDeleteImage = async (idx, e) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh này khỏi báo cáo không?')) return;

    const updatedList = imagesList.filter((_, i) => i !== idx);
    setImagesList(updatedList);

    try {
      await feedbackService.updateReport(report.id, {
        images: JSON.stringify(updatedList)
      });
      report.images = JSON.stringify(updatedList);
      toast('success', 'Đã xóa ảnh thành công!');
      if (onSaved) onSaved();
    } catch (err) {
      console.error('Lỗi khi xóa ảnh:', err);
      toast('error', 'Không thể xóa ảnh: ' + (err.message || 'Lỗi server'));
    }
  };

  if (!report) return null;

  // Xử lý AI hỗ trợ
  const handleGenerateAI = async () => {
    if (!report.main_content) {
      toast('warning', 'Phiếu không có nội dung chính để AI phân tích!');
      return;
    }

    setGeneratingAI(true);
    try {
      const resp = await feedbackService.generateAI({
        report_type: report.report_type || 'Báo cáo vấn đề',
        main_content: report.main_content,
        issue_type: report.issue_type || '',
        area: report.area || ''
      });

      const generated = resp.generated_text || '';
      if (generated) {
        setHandlerResponse(prev => prev ? `${prev}\n${generated}` : generated);
        toast('success', 'AI Local Gemini đã gợi ý giải pháp xử lý thành công!');
        setActiveTab('action');
      }
    } catch (err) {
      console.error('Lỗi gọi AI:', err);
      toast('error', 'Không thể kết nối với dịch vụ AI Local Gemini.');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Lưu cập nhật
  const handleSave = async () => {
    setSaving(true);
    try {
      await feedbackService.updateReport(report.id, {
        status,
        handler_name: handlerName,
        handler_response: handlerResponse
      });

      toast('success', `Đã cập nhật thành công phiếu #${report.code}!`);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Lỗi khi lưu phiếu:', err);
      toast('error', 'Không thể cập nhật phiếu: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Xóa phiếu — hiện BeautifulConfirmModal thay vì window.confirm
  const handleDelete = () => {
    setConfirmModal({
      visible: true,
      title: 'Xác nhận xóa phiếu',
      message: `Bạn có chắc chắn muốn xóa phiếu #${report.code} không?\nThao tác này không thể hoàn tác.`,
      type: 'error',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, visible: false }));
        try {
          await feedbackService.deleteReport(report.id);
          toast('success', `Đã xóa thành công phiếu #${report.code}!`);
          if (onDelete) onDelete(report.id);
          onClose();
        } catch (err) {
          toast('error', 'Lỗi khi xóa phiếu: ' + err.message);
        }
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="ticket-code-pill" style={{ fontSize: '1rem', padding: '4px 10px' }}>
              #{report.code}
            </span>
            <div>
              <div className="modal-title">{report.report_type || 'Báo cáo sự cố'}</div>
              <div style={{ fontSize: '0.8rem', color: '#8C7B73', display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                <span><Calendar size={13} style={{ display: 'inline', marginRight: 3 }} />{report.created_at}</span>
                <span>•</span>
                <span><User size={13} style={{ display: 'inline', marginRight: 3 }} />{report.creator_name}</span>
                {report.area && (
                  <>
                    <span>•</span>
                    <span><MapPin size={13} style={{ display: 'inline', marginRight: 3 }} />{report.area}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#F1EAE4',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#5D4037',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #EDE4DE',
          background: '#FAF8F6',
          padding: '0 24px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            style={{
              padding: '12px 18px',
              fontSize: '0.88rem',
              fontWeight: activeTab === 'info' ? 700 : 500,
              color: activeTab === 'info' ? '#7B5233' : '#7A6961',
              borderBottom: activeTab === 'info' ? '2px solid #7B5233' : 'none',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer'
            }}
          >
            Thông tin chi tiết
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('images')}
            style={{
              padding: '12px 18px',
              fontSize: '0.88rem',
              fontWeight: activeTab === 'images' ? 700 : 500,
              color: activeTab === 'images' ? '#7B5233' : '#7A6961',
              borderBottom: activeTab === 'images' ? '2px solid #7B5233' : 'none',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <ImageIcon size={15} />
            Ảnh đính kèm ({imagesList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('action')}
            style={{
              padding: '12px 18px',
              fontSize: '0.88rem',
              fontWeight: activeTab === 'action' ? 700 : 500,
              color: activeTab === 'action' ? '#7B5233' : '#7A6961',
              borderBottom: activeTab === 'action' ? '2px solid #7B5233' : 'none',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Send size={15} />
            Biện pháp xử lý & Phản hồi
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Meta Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 14,
                background: '#FDFBFA',
                padding: '16px 20px',
                borderRadius: 12,
                border: '1px solid #EAE1DA'
              }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#8C7B73', fontWeight: 600 }}>NGƯỜI TẠO BÁO CÁO:</span>
                  <div style={{ fontWeight: 700, color: '#2C1810', marginTop: 2 }}>
                    {report.is_anonymous ? 'Ẩn danh (Bảo mật danh tính)' : report.creator_name}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#8C7B73', fontWeight: 600 }}>TRẠNG THÁI HIỆN TẠI:</span>
                  <div style={{ marginTop: 4 }}>
                    <span className={`badge-status ${
                      status === 'Đã xong' || status === 'Đã hoàn thành' ? 'badge-resolved' :
                      status === 'Đã tiếp nhận' ? 'badge-in-progress' :
                      status === 'Từ chối' || status === 'Đã hủy' ? 'badge-rejected' : 'badge-pending'
                    }`}>
                      <span className="badge-status-dot" />
                      {status || 'Chờ xử lý'}
                    </span>
                  </div>
                </div>
                {report.issue_type && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#8C7B73', fontWeight: 600 }}>PHÒNG BAN:</span>
                    <div style={{ fontWeight: 600, color: '#4A3B32', marginTop: 2 }}>{report.issue_type}</div>
                  </div>
                )}
                {report.area && (
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#8C7B73', fontWeight: 600 }}>BỘ PHẬN / KHU VỰC:</span>
                    <div style={{ fontWeight: 600, color: '#4A3B32', marginTop: 2 }}>{report.area}</div>
                  </div>
                )}
                {report.attendees && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '0.78rem', color: '#8C7B73', fontWeight: 600 }}>THÀNH PHẦN THAM DỰ:</span>
                    <div style={{ fontWeight: 500, color: '#4A3B32', marginTop: 2 }}>{report.attendees}</div>
                  </div>
                )}
                {report.related_ticket && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '0.78rem', color: '#8C7B73', fontWeight: 600 }}>PHIẾU LIÊN QUAN:</span>
                    <div style={{ fontWeight: 600, color: '#7B5233', marginTop: 2 }}>{report.related_ticket}</div>
                  </div>
                )}
              </div>

              {/* Nội dung chính */}
              <div>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={15} color="#7B5233" />
                  NỘI DUNG CHÍNH (VẤN ĐỀ PHẢN ÁNH):
                </label>
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #D8CCC3',
                  borderRadius: 10,
                  padding: '14px 16px',
                  fontSize: '0.92rem',
                  lineHeight: 1.6,
                  color: '#2C1810',
                  whiteSpace: 'pre-wrap'
                }}>
                  {report.main_content}
                </div>
              </div>

              {/* Kiến nghị giải pháp từ người lập */}
              {report.solution_recommendation && (
                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={15} color="#D97706" />
                    ĐỀ XUẤT / KIẾN NGHỊ BAN ĐẦU:
                  </label>
                  <div style={{
                    background: '#FFFDF9',
                    border: '1px solid #F2E3D5',
                    borderRadius: 10,
                    padding: '12px 16px',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    color: '#7B5233',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {report.solution_recommendation}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'images' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Header của Tab Ảnh kèm nút Thêm ảnh */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 10,
                borderBottom: '1px solid #EDE4DE'
              }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#5D4037' }}>
                  Danh sách hình ảnh minh chứng ({imagesList.length})
                </div>
                <div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleUploadImages}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#7B5233',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: 8,
                      padding: '7px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: uploadingImage ? 'not-allowed' : 'pointer',
                      opacity: uploadingImage ? 0.7 : 1,
                      boxShadow: '0 2px 6px rgba(123, 82, 51, 0.2)'
                    }}
                  >
                    <Plus size={15} />
                    <span>{uploadingImage ? 'Đang tải ảnh...' : 'Thêm ảnh mới'}</span>
                  </button>
                </div>
              </div>

              {imagesList.length === 0 ? (
                <div
                  onClick={() => imageInputRef.current?.click()}
                  style={{
                    textAlign: 'center',
                    padding: '48px 20px',
                    color: '#8C7B73',
                    border: '2px dashed #D8CCC3',
                    borderRadius: 12,
                    cursor: 'pointer',
                    backgroundColor: '#FAF8F6'
                  }}
                >
                  <ImageIcon size={48} style={{ opacity: 0.35, margin: '0 auto 12px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>Phiếu này chưa có hình ảnh đính kèm.</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#A89284' }}>
                    Nhấp vào đây hoặc nút "Thêm ảnh mới" phía trên để đính kèm ảnh minh chứng
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 16
                }}>
                  {imagesList.map((imgUrl, idx) => {
                    const resolvedUrl = feedbackService.formatMediaUrl ? feedbackService.formatMediaUrl(imgUrl) : imgUrl;
                    return (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          borderRadius: 10,
                          overflow: 'hidden',
                          border: '1px solid #D8CCC3',
                          aspectRatio: '1',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                          backgroundColor: '#F5EBE1'
                        }}
                        onClick={() => {
                          if (onImageClick) {
                            onImageClick(resolvedUrl);
                          } else {
                            setLocalLightbox(resolvedUrl);
                          }
                        }}
                      >
                        <img
                          src={resolvedUrl}
                          alt={`Ảnh minh chứng ${idx + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        />

                        {/* Nút xóa ảnh */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteImage(idx, e)}
                          title="Xóa ảnh này"
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(220, 38, 38, 0.85)',
                            color: '#FFF',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 5,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>

                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: '6px 8px',
                          background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                          color: '#FFF',
                          fontSize: '0.72rem',
                          textAlign: 'center'
                        }}>
                          Nhấp để phóng to
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'action' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Trạng thái & Người xử lý */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">CẬP NHẬT TRẠNG THÁI:</label>
                  <select
                    className="form-control"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Chờ xử lý">Chờ xử lý</option>
                    <option value="Đã tiếp nhận">Đã tiếp nhận</option>
                    <option value="Đã xong">Đã giải quyết (Hoàn thành)</option>
                    <option value="Từ chối">Từ chối / Đóng phiếu</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">NGƯỜI XỬ LÝ / PHẢN HỒI:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={handlerName}
                    onChange={(e) => setHandlerName(e.target.value)}
                    placeholder="Tên quản lý / BP xử lý..."
                  />
                </div>
              </div>

              {/* Phản hồi & Biện pháp khắc phục */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Ý KIẾN XỬ LÝ & BIỆN PHÁP KHẮC PHỤC:
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={generatingAI}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#7B5233',
                      background: '#F4EBE6',
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid #E2D7CF',
                      cursor: generatingAI ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Sparkles size={13} color="#D97706" />
                    <span>{generatingAI ? 'AI đang phân tích...' : 'AI Gợi ý giải pháp'}</span>
                  </button>
                </div>
                <textarea
                  className="form-control"
                  rows={6}
                  value={handlerResponse}
                  onChange={(e) => setHandlerResponse(e.target.value)}
                  placeholder="Ghi nhận phương án xử lý, phân công phòng ban hoặc lý do phản hồi lại cho người gửi..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            type="button"
            onClick={handleDelete}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#DC2626',
              fontWeight: 700,
              fontSize: '0.82rem',
              marginRight: 'auto',
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid #FECACA',
              background: '#FEF2F2',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Trash2 size={15} />
            <span>Xóa phiếu</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-toolbar btn-toolbar-secondary"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-toolbar btn-toolbar-primary"
          >
            <Save size={15} />
            <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
          </button>
        </div>
      </div>

      {/* Beautiful Confirm Modal thay thế window.confirm */}
      <BeautifulConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Xóa phiếu"
        cancelText="Hủy bỏ"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      />

      {/* Lightbox xem ảnh nội bộ */}
      {localLightbox && (
        <div
          onClick={() => setLocalLightbox(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 4000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh'
            }}
          >
            <img
              src={localLightbox}
              alt="Phóng to ảnh"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: 10,
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
              }}
            />
            <button
              type="button"
              onClick={() => setLocalLightbox(null)}
              style={{
                position: 'absolute',
                top: -12,
                right: -12,
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: '#FFF',
                color: '#333',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackDetailModal;
