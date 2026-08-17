import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Mic, Sparkles, Camera } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';
import apiClient from '@shared/services/api';

const QuickReportCreateView = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Form State
  const [reportType, setReportType] = useState('Biên bản cuộc họp'); // "Biên bản cuộc họp" | "Báo cáo vấn đề"
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [attendees, setAttendees] = useState('Phúc Châu Văn (SF13)');
  const [relatedTicket, setRelatedTicket] = useState('');
  const [issueType, setIssueType] = useState('Sản xuất');
  const [area, setArea] = useState('Xưởng 1');
  const [mainContent, setMainContent] = useState('');
  const [solutionRecommendation, setSolutionRecommendation] = useState('');
  const [photos, setPhotos] = useState([]);
  
  // Status states
  const [submitting, setSubmitting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  // System Popups State
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null
  });

  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const showMessage = (type, title, message, onConfirm = null) => {
    setModalState({
      isOpen: true,
      type,
      title,
      message,
      onConfirm: () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      }
    });
  };

  const showConfirm = (title, message, onConfirm) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      }
    });
  };

  // Camera Capture
  const handleAddPhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const newPhoto = {
        id: Date.now(),
        url: URL.createObjectURL(file),
        file
      };
      setPhotos(prev => [...prev, newPhoto]);
    }
  };

  const handleRemovePhoto = (id) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  // AI Local Gemini Integration
  const handleGenerateAI = async () => {
    if (!mainContent.trim()) {
      showMessage('warning', 'Thiếu nội dung', 'Vui lòng nhập nội dung chính trước khi sử dụng AI!');
      return;
    }

    setGeneratingAI(true);
    try {
      const resp = await apiClient.post('/quick-reports/generate-ai', {
        report_type: reportType,
        main_content: mainContent,
        issue_type: issueType,
        area: area
      });
      const generatedText = resp.data?.generated_text || '';
      if (generatedText) {
        setSolutionRecommendation(prev => prev ? `${prev}\n${generatedText}` : generatedText);
        showMessage('success', 'AI Local Gemini', 'Đã tự động tổng hợp giải pháp từ AI!');
      }
    } catch (err) {
      console.error('Lỗi khi tạo báo cáo với AI:', err);
      showMessage('error', 'Lỗi AI', 'Không thể kết nối với dịch vụ AI Local Gemini. Vui lòng tự điền nội dung.');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Submit Handler
  const executeSubmit = async () => {
    if (!mainContent || !mainContent.trim()) {
      showMessage('warning', 'Thiếu thông tin', 'Vui lòng nhập Nội dung chính (Vấn đề) trước khi tạo báo cáo!');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        report_type: reportType,
        creator_name: 'Nguyễn Văn A',
        is_anonymous: isAnonymous,
        attendees: reportType === 'Biên bản cuộc họp' ? attendees : null,
        related_ticket: reportType === 'Biên bản cuộc họp' ? relatedTicket : null,
        issue_type: reportType === 'Báo cáo vấn đề' ? issueType : null,
        area: reportType === 'Báo cáo vấn đề' ? area : null,
        main_content: mainContent,
        solution_recommendation: solutionRecommendation,
        images: JSON.stringify(photos.map(p => p.url)),
        status: 'Chờ xử lý'
      };

      const resp = await apiClient.post('/quick-reports/', payload);
      const newCode = resp.data?.data?.code || 'BC-04';
      
      showMessage(
        'success',
        'Thành công',
        `Tạo báo cáo nhanh (${newCode}) thành công!`,
        () => navigate('/quick-report-list')
      );
    } catch (err) {
      console.error('Lỗi khi tạo báo cáo:', err);
      showMessage('error', 'Lỗi kết nối', 'Không thể lưu phiếu báo cáo vào hệ thống. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    showConfirm(
      'Xác nhận tạo báo cáo',
      'Bạn có chắc chắn muốn gửi báo cáo nhanh này không?',
      executeSubmit
    );
  };

  const handleCancelClick = () => {
    showConfirm(
      'Xác nhận hủy bỏ',
      'Bạn có chắc chắn muốn rời khỏi trang và hủy thao tác lập báo cáo?',
      () => navigate('/quick-report-list')
    );
  };

  return (
    <Layout>
      <PageHeader title="Lập báo cáo" subTitle="CL11: Tạo báo cáo nhanh" />

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, padding: '14px 14px 110px 14px', display: 'flex', flexDirection: 'column', gap: '14px', boxSizing: 'border-box' }}>
        
        {/* Card Header Title */}
        <h2 style={{
          textAlign: 'center',
          color: '#432818',
          fontSize: '1.4rem',
          fontWeight: '900',
          margin: '4px 0 8px 0',
          letterSpacing: '0.5px'
        }}>
          Thông Tin Kiểm Tra
        </h2>

        {/* Main Form Card */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>

          {/* Chọn loại báo cáo * */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#334155' }}>
              Chọn loại báo cáo <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                boxSizing: 'border-box',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.86rem',
                fontWeight: '600',
                color: '#1e293b',
                outline: 'none',
                backgroundColor: '#fff'
              }}
            >
              <option value="Biên bản cuộc họp">Biên bản cuộc họp</option>
              <option value="Báo cáo vấn đề">Báo cáo vấn đề</option>
            </select>
          </div>

          {/* Sub Card Form Frame */}
          <div style={{
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>

            {/* Ticket Code & Author Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: '900',
                  fontStyle: 'italic',
                  color: '#c2410c'
                }}>
                  Phiếu: BC04
                </div>
                <div style={{
                  fontSize: '0.76rem',
                  fontStyle: 'italic',
                  color: '#ea580c',
                  fontWeight: '700',
                  marginTop: '2px'
                }}>
                  Được tạo bởi: {isAnonymous ? 'Ẩn danh' : 'Nguyễn Văn A'}
                </div>
              </div>

              {/* Checkbox Ẩn danh */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.84rem',
                fontWeight: '700',
                color: '#334155',
                cursor: 'pointer',
                userSelect: 'none'
              }}>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#432818', cursor: 'pointer' }}
                />
                Ẩn danh
              </label>
            </div>

            {/* Dynamic Form Content based on Report Type */}
            {reportType === 'Biên bản cuộc họp' ? (
              <>
                {/* Thành phần tham dự + Phiếu liên quan */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>
                      Thành phần tham dự <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      value={attendees}
                      onChange={(e) => setAttendees(e.target.value)}
                      style={{
                        width: '100%',
                        height: '40px',
                        boxSizing: 'border-box',
                        minWidth: 0,
                        padding: '0 8px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.84rem',
                        outline: 'none',
                        backgroundColor: '#fff'
                      }}
                    >
                      <option value="Phúc Châu Văn (SF13)">Phúc Châu Văn (SF13)</option>
                      <option value="Trần Thị B (SF02)">Trần Thị B (SF02)</option>
                      <option value="Nguyễn Văn A (SF01)">Nguyễn Văn A (SF01)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>
                      Phiếu liên quan
                    </label>
                    <select
                      value={relatedTicket}
                      onChange={(e) => setRelatedTicket(e.target.value)}
                      style={{
                        width: '100%',
                        height: '40px',
                        boxSizing: 'border-box',
                        minWidth: 0,
                        padding: '0 8px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.84rem',
                        outline: 'none',
                        backgroundColor: '#fff'
                      }}
                    >
                      <option value="">Chọn phiếu...</option>
                      <option value="CAPA-01">CAPA-01</option>
                      <option value="PLAN-101">PLAN-101</option>
                    </select>
                  </div>
                </div>

                {/* Nội dung chính (Vấn đề) * */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>
                    Nội dung chính (Vấn đề) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <textarea
                      rows={3}
                      value={mainContent}
                      onChange={(e) => setMainContent(e.target.value)}
                      placeholder="Nhập các nội dung chính cần báo cáo"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '10px 32px 10px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.84rem',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                    <Mic size={16} color="#64748b" style={{ position: 'absolute', top: '10px', right: '10px', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Kết luận (Giải pháp) * */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>
                    Kết luận (Giải pháp) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={solutionRecommendation}
                    onChange={(e) => setSolutionRecommendation(e.target.value)}
                    placeholder="Nhập các nội dung chính cần báo cáo"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.84rem',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Loại vấn đề + Khu vực */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>
                      Loại vấn đề <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                      style={{
                        width: '100%',
                        height: '40px',
                        boxSizing: 'border-box',
                        minWidth: 0,
                        padding: '0 8px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.84rem',
                        outline: 'none',
                        backgroundColor: '#fff'
                      }}
                    >
                      <option value="Sản xuất">Sản xuất</option>
                      <option value="Chất lượng">Chất lượng</option>
                      <option value="Thiết bị">Thiết bị</option>
                      <option value="An toàn">An toàn</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>
                      Khu vực
                    </label>
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      style={{
                        width: '100%',
                        height: '40px',
                        boxSizing: 'border-box',
                        minWidth: 0,
                        padding: '0 8px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.84rem',
                        outline: 'none',
                        backgroundColor: '#fff'
                      }}
                    >
                      <option value="Xưởng 1">Xưởng 1</option>
                      <option value="Khu đúc">Khu đúc</option>
                      <option value="Dây chuyền sơn">Dây chuyền sơn</option>
                      <option value="Kho thành phẩm">Kho thành phẩm</option>
                    </select>
                  </div>
                </div>

                {/* Nội dung chính (Vấn đề) * */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>
                    Nội dung chính (Vấn đề) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <textarea
                      rows={3}
                      value={mainContent}
                      onChange={(e) => setMainContent(e.target.value)}
                      placeholder="Nhập các nội dung chính cần báo cáo"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '10px 32px 10px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.84rem',
                        outline: 'none',
                        resize: 'vertical',
                        fontFamily: 'inherit'
                      }}
                    />
                    <Mic size={16} color="#64748b" style={{ position: 'absolute', top: '10px', right: '10px', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Kiến nghị * */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>
                    Kiến nghị <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={solutionRecommendation}
                    onChange={(e) => setSolutionRecommendation(e.target.value)}
                    placeholder="Nhập các nội dung chính cần báo cáo"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.84rem',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </>
            )}

            {/* Thêm ảnh Button */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={handleAddPhotoClick}
              style={{
                alignSelf: 'flex-start',
                border: 'none',
                background: 'transparent',
                color: '#432818',
                fontSize: '0.84rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 0'
              }}
            >
              <Plus size={16} strokeWidth={3} /> Thêm ảnh
            </button>

            {/* Preview Photos */}
            {photos.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {photos.map(photo => (
                  <div key={photo.id} style={{
                    width: '60px', height: '60px', borderRadius: '8px',
                    position: 'relative', overflow: 'hidden', border: '1px solid #cbd5e1'
                  }}>
                    <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      style={{
                        position: 'absolute', top: '2px', right: '2px',
                        background: '#fff', borderRadius: '50%', border: 'none',
                        width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }}
                    >
                      <X size={12} color="#ef4444" strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* AI Generation Box Container (+ Tạo Báo với AI) */}
            <div style={{
              backgroundColor: '#eaeaea',
              borderRadius: '12px',
              height: '140px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '4px'
            }}>
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={generatingAI}
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '8px 18px',
                  fontSize: '0.84rem',
                  fontWeight: '800',
                  color: '#432818',
                  cursor: generatingAI ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                }}
              >
                <Plus size={16} strokeWidth={3} />
                {generatingAI ? 'Đang gọi Local AI Gemini...' : 'Tạo Báo với AI'}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Fixed Bottom Action Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '450px',
        backgroundColor: '#fff',
        borderTop: '1px solid #e2e8f0',
        padding: '10px 14px 12px 14px',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.12)',
        zIndex: 1000,
        boxSizing: 'border-box',
        display: 'flex',
        gap: '10px'
      }}>
        <button
          type="button"
          onClick={handleCancelClick}
          style={{
            flex: 1,
            height: '38px',
            borderRadius: '8px',
            border: '1px solid #432818',
            backgroundColor: '#fff',
            color: '#432818',
            fontWeight: '700',
            fontSize: '0.84rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          Hủy bỏ
        </button>

        <button
          type="button"
          onClick={handleSubmitClick}
          disabled={submitting || !mainContent.trim()}
          style={{
            flex: 1,
            height: '38px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: (!mainContent.trim() || submitting) ? '#94a3b8' : '#432818',
            color: '#fff',
            fontWeight: '700',
            fontSize: '0.84rem',
            cursor: (!mainContent.trim() || submitting) ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 4px rgba(67, 40, 24, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {submitting ? 'Đang lưu...' : 'Xác nhận'}
        </button>
      </div>

      {/* System MessageModal */}
      <MessageModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
      />

      {/* System ConfirmModal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        confirmText="Xác nhận"
        cancelText="Hủy"
      />
    </Layout>
  );
};

export default QuickReportCreateView;
