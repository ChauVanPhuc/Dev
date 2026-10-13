import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Camera, Upload, CheckCircle2, AlertCircle, 
  Trash2, RefreshCw, PenTool, FileText, Check, Award, Info
} from 'lucide-react';
import apiClient, { API_URL, getFullImageUrl } from '@shared/services/api';

// Helper phân tách danh sách URL ảnh (hỗ trợ dấu phẩy hoặc mảng JSON)
const parseImageUrls = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    if (raw.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(s => String(s).trim()).filter(Boolean);
      } catch (e) {}
    }
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

/**
 * Component Bottom Sheet / Modal Thực Hiện CheckList trên Mobile
 * Tự động thích ứng form theo từng loại evidence_type:
 * - IMAGE: Chụp nhiều ảnh hiện trường trực tiếp từ Camera
 * - DOCUMENT: Đính kèm file biên bản / tài liệu
 * - SIGNATURE: Chữ ký điện tử vẽ cảm ứng trực tiếp trên màn hình
 * - NONE: Nhập ghi chú kết quả hoàn thành
 */
const MobileChecklistExecutionModal = ({ visible, onClose, checklist, onSuccess }) => {
  if (!visible || !checklist) return null;

  const evidenceType = String(checklist.evidence_type || 'NONE').toUpperCase();
  const isImageRequired = evidenceType === 'IMAGE' || evidenceType === 'PHOTO';
  const isDocRequired = evidenceType === 'DOCUMENT' || evidenceType === 'FILE';
  const isSignatureRequired = evidenceType === 'SIGNATURE';

  // State form
  const [performerNote, setPerformerNote] = useState(checklist.performer_note || checklist.notes || '');
  // Danh sách ảnh chụp hiện trường: [{ id, file, url, isExisting }]
  const [photos, setPhotos] = useState(() => {
    if (isImageRequired && checklist.evidence_url) {
      return parseImageUrls(checklist.evidence_url).map((url, idx) => ({
        id: `existing_${idx}_${Date.now()}`,
        url,
        isExisting: true
      }));
    }
    return [];
  });
  const [selectedDocFile, setSelectedDocFile] = useState(null);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [activePreviewImg, setActivePreviewImg] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Ref cho file inputs và canvas
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Đồng bộ lại dữ liệu khi checklist hoặc modal thay đổi
  useEffect(() => {
    if (visible && checklist) {
      setPerformerNote(checklist.performer_note || checklist.notes || '');
      setErrorMessage('');
      if (isImageRequired && checklist.evidence_url) {
        setPhotos(parseImageUrls(checklist.evidence_url).map((url, idx) => ({
          id: `existing_${idx}_${Date.now()}`,
          url,
          isExisting: true
        })));
      } else {
        setPhotos([]);
      }
      setSelectedDocFile(null);
      setHasDrawnSignature(false);
      setActivePreviewImg(null);
    }
  }, [visible, checklist?.id]);

  // Khởi tạo Canvas vẽ chữ ký nếu loại là SIGNATURE
  useEffect(() => {
    if (isSignatureRequired && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      // Đặt độ nét canvas theo tỷ lệ màn hình Retina/High DPI
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      ctx.scale(ratio, ratio);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [isSignatureRequired, visible]);

  // Xử lý vẽ chữ ký Touch (Mobile) & Mouse (Desktop)
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleStartDrawing = (e) => {
    if (e.cancelable) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoords(e);
    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasDrawnSignature(true);
  };

  const handleDraw = (e) => {
    if (!isDrawingRef.current) return;
    if (e.cancelable) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleEndDrawing = (e) => {
    if (!isDrawingRef.current) return;
    if (e.cancelable) e.preventDefault();
    isDrawingRef.current = false;
  };

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
  };

  // Chụp ảnh hiện trường từ camera (hỗ trợ chụp nhiều ảnh liên tiếp)
  const handleCameraCapture = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPhotos = files.map((file, idx) => ({
      id: `photo_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      file,
      url: URL.createObjectURL(file),
      isExisting: false
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
    setErrorMessage('');

    // Reset input để bấm chụp liên tiếp được nhiều ảnh
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  // Xóa 1 ảnh trong danh sách đã chụp
  const handleRemovePhoto = (photoId) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  // Chọn file tài liệu/biên bản
  const handleDocFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedDocFile(file);
    setErrorMessage('');
  };

  // Upload tệp/ảnh lên API backend
  const uploadFileToBackend = async (fileToUpload) => {
    const formData = new FormData();
    formData.append('file', fileToUpload);
    const resp = await apiClient.post('/kpi-management/upload-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return resp.data?.fileUrl || resp.fileUrl || '';
  };

  // Xử lý submit hoàn thành checklist
  const handleSubmit = async () => {
    setErrorMessage('');

    // Kiểm tra ràng buộc bằng chứng bắt buộc
    if (isImageRequired && photos.length === 0) {
      setErrorMessage('Vui lòng chụp ít nhất 1 ảnh hiện trường để hoàn thành.');
      return;
    }
    if (isDocRequired && !selectedDocFile && !checklist.evidence_url) {
      setErrorMessage('Vui lòng đính kèm biên bản/file báo cáo để hoàn thành.');
      return;
    }
    if (isSignatureRequired && !hasDrawnSignature && !checklist.evidence_url) {
      setErrorMessage('Vui lòng ký tên xác nhận vào khung chữ ký phía trên.');
      return;
    }

    try {
      setSubmitting(true);
      let uploadedUrl = '';

      // 1. Tải ảnh hoặc tài liệu nếu có
      if (isImageRequired) {
        // Tải tất cả ảnh mới lên song song qua Promise.all
        const uploadedUrls = await Promise.all(
          photos.map(async (photo) => {
            if (photo.isExisting) return photo.url;
            if (photo.file) {
              return await uploadFileToBackend(photo.file);
            }
            return null;
          })
        );
        uploadedUrl = uploadedUrls.filter(Boolean).join(',');
      } else if (isDocRequired) {
        if (selectedDocFile) {
          uploadedUrl = await uploadFileToBackend(selectedDocFile);
        } else {
          uploadedUrl = checklist.evidence_url || '';
        }
      } else if (isSignatureRequired) {
        if (hasDrawnSignature && canvasRef.current) {
          // Chuyển Canvas thành Blob để upload
          const canvas = canvasRef.current;
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
            const signatureFile = new File([blob], `signature_${checklist.id}_${Date.now()}.png`, { type: 'image/png' });
            uploadedUrl = await uploadFileToBackend(signatureFile);
          }
        } else {
          uploadedUrl = checklist.evidence_url || '';
        }
      }

      // 2. Gửi PUT cập nhật trạng thái checklist
      await apiClient.put(`/production-v2/dashboard/checklist/${checklist.id}`, {
        status: 'Đã hoàn thành',
        performer_note: performerNote,
        notes: performerNote,
        evidence_url: uploadedUrl
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Lỗi khi cập nhật checklist:', err);
      setErrorMessage(err?.response?.data?.detail || 'Không thể cập nhật công việc. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(3px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* Container Bottom Sheet */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        maxHeight: '88vh',
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -8px 20px rgba(0, 0, 0, 0.18)',
        overflow: 'hidden'
      }}>
        {/* Thanh kéo nhỏ phía trên */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '6px', paddingBottom: '2px' }}>
          <div style={{ width: '32px', height: '3px', borderRadius: '2px', backgroundColor: '#CBD5E1' }} />
        </div>

        {/* 1. HEADER MODAL */}
        <div style={{
          padding: '8px 12px 8px 12px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: '700',
                color: '#5D3B32',
                backgroundColor: '#F5EBE1',
                padding: '1px 6px',
                borderRadius: '4px'
              }}>
                {checklist.task_code || 'CHECKLIST'}
              </span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: '700',
                color: '#15803D',
                backgroundColor: '#DCFCE7',
                padding: '1px 6px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}>
                <Award size={10} />
                +{checklist.weight_score || 10}đ
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: '0.84rem', fontWeight: '800', color: '#1E293B', lineHeight: '1.25', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {checklist.content || checklist.task_name}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B',
              flexShrink: 0
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* 2. BODY CONTENT (SCROLLABLE) */}
        <div style={{
          padding: '10px 12px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              backgroundColor: '#FEF2F2',
              borderRadius: '8px',
              border: '1px solid #FCA5A5',
              color: '#B91C1C',
              fontSize: '0.72rem',
              fontWeight: '600'
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Tiêu chuẩn nghiệm thu mẫu nếu có */}
          {checklist.result && (
            <div style={{
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '8px',
              padding: '6px 8px',
              display: 'flex',
              gap: '6px'
            }}>
              <Info size={14} color="#D97706" style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: '800', color: '#92400E', textTransform: 'uppercase', marginBottom: '1px' }}>
                  Tiêu chuẩn nghiệm thu
                </div>
                <div style={{ fontSize: '0.72rem', color: '#78350F', lineHeight: '1.3' }}>
                  {checklist.result}
                </div>
              </div>
            </div>
          )}

          {/* PHẦN FORM NỘP BẰNG CHỨNG THEO LOẠI */}
          {/* --- TRƯỜNG HỢP 1: BẮT BUỘC CHỤP ẢNH HIỆN TRƯỜNG --- */}
          {isImageRequired && (
            <div style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              padding: '8px',
              border: '1px solid #E2E8F0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.70rem', fontWeight: '800', color: '#334155' }}>
                  📸 Bằng chứng ảnh hiện trường <span style={{ color: '#DC2626' }}>*</span>
                </label>
                {photos.length > 0 && (
                  <span style={{
                    fontSize: '0.64rem',
                    fontWeight: '700',
                    color: '#5D3B32',
                    backgroundColor: '#F5EBE1',
                    padding: '1px 6px',
                    borderRadius: '8px'
                  }}>
                    Đã chụp {photos.length} ảnh
                  </span>
                )}
              </div>

              {/* Input mở Camera trực tiếp (không cho chọn từ thư viện) */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                style={{ display: 'none' }}
                onChange={handleCameraCapture}
              />

              {photos.length === 0 ? (
                /* Chưa có ảnh: Nút chụp ảnh Camera to rõ ràng */
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '11px',
                    borderRadius: '8px',
                    border: '1.5px dashed #5D3B32',
                    backgroundColor: '#F5EBE1',
                    color: '#5D3B32',
                    fontSize: '0.76rem',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  <Camera size={18} color="#5D3B32" />
                  Chụp ảnh hiện trường (Camera)
                </button>
              ) : (
                /* Đã có ảnh: Hiển thị lưới Thumbnail nhỏ gọn kèm nút Chụp thêm */
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '6px'
                }}>
                  {photos.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '1 / 1',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#0F172A',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                      }}
                    >
                      <img
                        src={getFullImageUrl(item.url)}
                        alt={`Ảnh ${idx + 1}`}
                        onClick={() => setActivePreviewImg(getFullImageUrl(item.url))}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          cursor: 'pointer',
                          display: 'block'
                        }}
                      />
                      {/* Nút xóa ảnh đỏ */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(item.id);
                        }}
                        title="Xóa ảnh này"
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          backgroundColor: 'rgba(220, 38, 38, 0.95)',
                          color: '#FFF',
                          border: 'none',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }}
                      >
                        <Trash2 size={10} />
                      </button>
                      {/* Số thứ tự */}
                      <span style={{
                        position: 'absolute',
                        bottom: '2px',
                        left: '2px',
                        fontSize: '0.58rem',
                        fontWeight: '700',
                        color: '#FFF',
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        padding: '0 3px',
                        borderRadius: '3px',
                        pointerEvents: 'none',
                        lineHeight: '1.2'
                      }}>
                        #{idx + 1}
                      </span>
                    </div>
                  ))}

                  {/* Nút Chụp thêm ảnh tiếp theo từ camera */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    title="Chụp thêm ảnh"
                    style={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      borderRadius: '6px',
                      border: '1.5px dashed #5D3B32',
                      backgroundColor: '#F5EBE1',
                      color: '#5D3B32',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  >
                    <Camera size={16} color="#5D3B32" />
                    <span style={{ fontSize: '0.62rem', fontWeight: '800', lineHeight: 1 }}>+ Chụp thêm</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* --- TRƯỜNG HỢP 2: BẮT BUỘC ĐÍNH KÈM BIÊN BẢN/FILE --- */}
          {isDocRequired && (
            <div style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              padding: '8px',
              border: '1px solid #E2E8F0'
            }}>
              <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                📄 Biên bản / File tài liệu đính kèm <span style={{ color: '#DC2626' }}>*</span>
              </label>

              {selectedDocFile || checklist.evidence_url ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  backgroundColor: '#EFF6FF',
                  borderRadius: '6px',
                  border: '1px solid #BFDBFE'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <FileText size={16} color="#1D4ED8" />
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#1E40AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedDocFile?.name || checklist.evidence_url.split('/').pop()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDocFile(null)}
                    style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '2px' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                    style={{ display: 'none' }}
                    onChange={handleDocFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '9px',
                      borderRadius: '8px',
                      border: '1px dashed #3B82F6',
                      backgroundColor: '#EFF6FF',
                      color: '#1D4ED8',
                      fontSize: '0.74rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    <Upload size={14} />
                    Chọn tệp biên bản (.pdf, .xlsx, .docx, ảnh...)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* --- TRƯỜNG HỢP 3: CHỮ KÝ XÁC NHẬN --- */}
          {isSignatureRequired && (
            <div style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              padding: '8px',
              border: '1px solid #E2E8F0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.70rem', fontWeight: '800', color: '#334155' }}>
                  ✍️ Ký tên xác nhận trên màn hình <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={handleClearSignature}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '0.68rem',
                    color: '#64748B',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '700'
                  }}
                >
                  <RefreshCw size={11} />
                  Ký lại
                </button>
              </div>

              <div style={{
                position: 'relative',
                width: '100%',
                height: '100px',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                touchAction: 'none',
                overflow: 'hidden'
              }}>
                <canvas
                  ref={canvasRef}
                  style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
                  onMouseDown={handleStartDrawing}
                  onMouseMove={handleDraw}
                  onMouseUp={handleEndDrawing}
                  onMouseLeave={handleEndDrawing}
                  onTouchStart={handleStartDrawing}
                  onTouchMove={handleDraw}
                  onTouchEnd={handleEndDrawing}
                />
                {!hasDrawnSignature && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    color: '#94A3B8',
                    fontSize: '0.72rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <PenTool size={13} />
                    Chạm ngón tay vào đây để ký tên
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- TRƯỜNG HỢP 4: KHÔNG BẮT BUỘC BẰNG CHỨNG --- */}
          {evidenceType === 'NONE' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 8px',
              backgroundColor: '#F1F5F9',
              borderRadius: '8px',
              color: '#475569',
              fontSize: '0.70rem',
              fontWeight: '600'
            }}>
              <CheckCircle2 size={13} color="#16A34A" />
              Công việc này không bắt buộc nộp bằng chứng tệp tin.
            </div>
          )}

          {/* Ô NHẬP GHI CHÚ / KẾT QUẢ THỰC TẾ */}
          <div>
            <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
              📝 Ghi chú / Số liệu đo đạc thực tế
            </label>
            <textarea
              rows={2}
              value={performerNote}
              onChange={(e) => setPerformerNote(e.target.value)}
              placeholder="VD: Đã kiểm tra hoàn thành..."
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.74rem',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        {/* 3. FOOTER THAO TÁC */}
        <div style={{
          padding: '8px 12px',
          borderTop: '1px solid #F1F5F9',
          display: 'flex',
          gap: '8px',
          backgroundColor: '#FFFFFF',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: submitting ? '#94A3B8' : '#5D3B32',
              color: '#FFFFFF',
              fontSize: '0.76rem',
              fontWeight: '800',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Check size={14} />
                Hoàn thành
              </>
            )}
          </button>
        </div>
      </div>

      {/* Lightbox phóng to ảnh khi bấm vào thumbnail */}
      {activePreviewImg && (
        <div
          onClick={() => setActivePreviewImg(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(3px)'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', maxWidth: '100%', maxHeight: '90%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <img
              src={activePreviewImg}
              alt="Xem trước ảnh"
              style={{ maxWidth: '100%', maxHeight: '82vh', borderRadius: '8px', objectFit: 'contain', display: 'block', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
            />
            <button
              type="button"
              onClick={() => setActivePreviewImg(null)}
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-12px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileChecklistExecutionModal;
