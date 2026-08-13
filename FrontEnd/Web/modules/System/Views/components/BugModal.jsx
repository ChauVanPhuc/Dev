import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { bugService } from '@modules/System/Models/bug.service';
import { getBaseURL } from '@webShared/Services/api.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const getLoggedInUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
    return user.full_name || user.username || 'Phúc';
  } catch {
    return 'Phúc';
  }
};

const getBugStatusLabel = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'new' || s === 'mới') return 'Mới';
  if (s === 'resolved' || s === 'đã sửa') return 'Đã sửa';
  if (s === 'verified' || s === 'hoàn thành') return 'Hoàn thành';
  if (s === 'reopened' || s === 'sửa lại' || s === 'in progress' || s === 'in_progress') return 'Sửa lại';
  return status;
};

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const apiBase = getBaseURL();
  return `${apiBase.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
};

const BugModal = ({ isOpen, onClose, bugModalMode, bugModalData: initialData, screen, itAccounts, onConfirm }) => {
  const modalMeta = useScreenMetadataCached('/admin/system/bugs/modal');
  const [bugModalData, setBugModalData] = useState({
    id: '',
    componentName: 'Chung',
    severity: 'Medium',
    description: '',
    reporter: getLoggedInUser(),
    assignee: 'IT',
    targetDate: '',
    imagePaths: [],
    status: 'New'
  });
  
  const [replyNotes, setReplyNotes] = useState('');
  const [replyImages, setReplyImages] = useState([]);
  const [replyStatusVal, setReplyStatusVal] = useState('');
  const [bugImageUploading, setBugImageUploading] = useState(false);
  const [replyUploading, setReplyUploading] = useState(false);

  const { toast } = useToast();
  const showToast = React.useCallback((message, type = 'success') => {
    toast(type, message);
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setBugModalData(initialData);
      } else {
        setBugModalData({
          id: '',
          componentName: 'Chung',
          severity: 'Medium',
          description: '',
          reporter: getLoggedInUser(),
          assignee: itAccounts[0] || 'IT',
          targetDate: '',
          imagePaths: [],
          status: 'New'
        });
      }
      setReplyNotes('');
      setReplyImages([]);
      setReplyStatusVal('');
      setBugImageUploading(false);
      setReplyUploading(false);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handlePasteBugModal = async (e) => {
    const clipboardData = e.clipboardData || (e.nativeEvent && e.nativeEvent.clipboardData);
    if (!clipboardData) return;

    const items = clipboardData.items;
    if (!items) return;

    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      try {
        if (bugModalMode === 'edit') {
          setReplyUploading(true);
          showToast('Đang tải lên ảnh phản hồi từ clipboard...', 'info');
          const uploadedPaths = [];
          for (const file of files) {
            const res = await bugService.uploadImage(file);
            if (res && res.url) {
              uploadedPaths.push(res.url);
            }
          }
          setReplyImages(prev => [...prev, ...uploadedPaths]);
          showToast('Tải lên hình ảnh phản hồi từ clipboard thành công!');
        } else {
          setBugImageUploading(true);
          showToast('Đang tải lên ảnh lỗi từ clipboard...', 'info');
          const uploadedUrls = [];
          for (const file of files) {
            const res = await bugService.uploadImage(file);
            if (res && res.url) {
              uploadedUrls.push(res.url);
            }
          }
          setBugModalData(prev => ({
            ...prev,
            imagePaths: [...(prev.imagePaths || []), ...uploadedUrls]
          }));
          showToast(`Tải lên thành công ${uploadedUrls.length} hình ảnh lỗi!`);
        }
      } catch (err) {
        console.error(err);
        showToast('Tải lên hình ảnh từ clipboard thất bại!', 'error');
      } finally {
        setReplyUploading(false);
        setBugImageUploading(false);
      }
    }
  };

  const handleReplyImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    try {
      setReplyUploading(true);
      showToast('Đang tải lên hình ảnh...', 'info');
      const uploadedPaths = [];
      for (const file of files) {
        const res = await bugService.uploadImage(file);
        if (res && res.url) {
          uploadedPaths.push(res.url);
        }
      }
      setReplyImages(prev => [...prev, ...uploadedPaths]);
      showToast('Tải lên hình ảnh thành công!');
    } catch (err) {
      console.error(err);
      showToast('Tải lên hình ảnh thất bại!', 'error');
    } finally {
      setReplyUploading(false);
    }
  };

  const handleManualImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    try {
      setBugImageUploading(true);
      showToast('Đang tải lên hình ảnh lỗi...', 'info');
      const uploadedUrls = [];
      for (const file of files) {
        const res = await bugService.uploadImage(file);
        if (res && res.url) {
          uploadedUrls.push(res.url);
        }
      }
      setBugModalData(prev => ({
        ...prev,
        imagePaths: [...(prev.imagePaths || []), ...uploadedUrls]
      }));
      showToast('Tải lên hình ảnh lỗi thành công!');
    } catch (err) {
      console.error(err);
      showToast('Tải lên hình ảnh lỗi thất bại!', 'error');
    } finally {
      setBugImageUploading(false);
    }
  };

  const handleSubmit = () => {
    if (bugModalMode === 'edit') {
      let newStatus = bugModalData.status;
      const current = (bugModalData.status || '').toLowerCase();
      const isNewOrReopened = current === 'new' || current === 'mới' || current === 'sửa lại' || current === 'in progress' || current === 'in_progress';
      const isFixed = current === 'resolved' || current === 'đã sửa';

      if (isNewOrReopened) {
        if (replyStatusVal === 'Đã sửa') {
          newStatus = 'Đã sửa';
        }
      } else if (isFixed) {
        if (replyStatusVal === 'Hoàn thành') {
          newStatus = 'Hoàn thành';
        } else if (replyStatusVal === 'Từ chối' || replyStatusVal === 'Sửa lại') {
          newStatus = 'Sửa lại';
        }
      }

      onConfirm({
        mode: 'edit',
        id: bugModalData.id,
        severity: bugModalData.severity,
        assignee: bugModalData.assignee,
        status: newStatus,
        targetDate: bugModalData.targetDate,
        replyNotes,
        replyImages,
        updater: getLoggedInUser()
      });
    } else {
      if (!bugModalData.description) {
        showToast('Vui lòng nhập mô tả lỗi!', 'error');
        return;
      }
      const todayStr = new Date().toISOString().split('T')[0];
      if (bugModalData.targetDate && bugModalData.targetDate < todayStr) {
        showToast('Ngày yêu cầu hoàn thành không được là ngày quá khứ!', 'error');
        return;
      }

      onConfirm({
        mode: 'create',
        componentName: bugModalData.componentName,
        description: bugModalData.description,
        severity: bugModalData.severity,
        reporter: bugModalData.reporter,
        assignee: bugModalData.assignee,
        targetDate: bugModalData.targetDate,
        imagePaths: bugModalData.imagePaths
      });
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(45, 26, 18, 0.4)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(2px)'
    }}>
      <div
        onPaste={handlePasteBugModal}
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '540px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          border: '1px solid #EADCC9',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid #CBD5E1'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#2D1A12' }}>
            {bugModalMode === 'edit' 
              ? `${modalMeta.screenCode || 'HD04'}: Chi tiết lỗi BUG-${bugModalData.id}` 
              : `${modalMeta.screenCode || screen?.current_code || 'AD'}: ${modalMeta.title || 'Khai báo lỗi'}`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: 0,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Row 1: Màn hình & Trạng thái */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Màn hình</label>
              <select
                disabled
                value={screen?.id}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', backgroundColor: '#F1F5F9', color: '#64748B', fontWeight: '500', boxSizing: 'border-box', height: '36px' }}
              >
                <option value={screen?.id}>{screen?.current_code}: {screen?.title}</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Trạng thái</label>
              {bugModalMode === 'edit' ? (
                (() => {
                  const activeStatusLabel = getBugStatusLabel(replyStatusVal || bugModalData.status);
                  if (activeStatusLabel === 'Mới' || activeStatusLabel === 'Sửa lại') {
                    return (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#E5E7EB',
                        borderRadius: '8px',
                        padding: '4px 12px',
                        border: '1px solid #CBD5E1',
                        height: '36px',
                        boxSizing: 'border-box',
                        width: '100%'
                      }}>
                        <span style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 'bold' }}>{activeStatusLabel}</span>
                        <button
                          type="button"
                          onClick={() => setReplyStatusVal('Đã sửa')}
                          style={{
                            backgroundColor: '#4A2E20',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 12px',
                            fontWeight: 'bold',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s'
                          }}
                        >
                          Xác nhận
                        </button>
                      </div>
                    );
                  } else if (activeStatusLabel === 'Đã sửa') {
                    return (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#E5E7EB',
                        borderRadius: '8px',
                        padding: '4px 12px',
                        border: '1px solid #CBD5E1',
                        height: '36px',
                        boxSizing: 'border-box',
                        width: '100%'
                      }}>
                        <span style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 'bold' }}>Đã sửa</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setReplyStatusVal('Sửa lại')}
                            style={{
                              backgroundColor: '#fff',
                              color: '#475569',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
                              padding: '4px 12px',
                              fontWeight: 'bold',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s'
                            }}
                          >
                            Từ chối
                          </button>
                          <button
                            type="button"
                            onClick={() => setReplyStatusVal('Hoàn thành')}
                            style={{
                              backgroundColor: '#4A2E20',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '4px 12px',
                              fontWeight: 'bold',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s'
                            }}
                          >
                            Xác nhận
                          </button>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#F1F5F9',
                        borderRadius: '8px',
                        padding: '4px 12px',
                        border: '1px solid #E2E8F0',
                        height: '36px',
                        boxSizing: 'border-box',
                        width: '100%'
                      }}>
                        <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 'bold' }}>{activeStatusLabel}</span>
                      </div>
                    );
                  }
                })()
              ) : (
                <input
                  type="text"
                  value="Mới"
                  disabled
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', backgroundColor: '#F1F5F9', color: '#64748B', fontWeight: '500', boxSizing: 'border-box', height: '36px' }}
                />
              )}
            </div>
          </div>

          {/* Row 2: Component & Mức độ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Component</label>
              <select
                value={bugModalData.componentName}
                onChange={(e) => setBugModalData(prev => ({ ...prev, componentName: e.target.value }))}
                disabled={bugModalMode === 'edit'}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', backgroundColor: bugModalMode === 'edit' ? '#F1F5F9' : '#fff', color: bugModalMode === 'edit' ? '#64748B' : '#334155', fontWeight: '500', boxSizing: 'border-box', height: '36px', cursor: bugModalMode === 'edit' ? 'default' : 'pointer' }}
              >
                <option value="Chung">Chung</option>
                {(screen?.components || []).map(comp => (
                  <option key={comp.id} value={comp.name}>{comp.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Mức độ</label>
              <select
                value={bugModalData.severity}
                onChange={(e) => setBugModalData(prev => ({ ...prev, severity: e.target.value }))}
                disabled={bugModalMode === 'edit'}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', backgroundColor: bugModalMode === 'edit' ? '#F1F5F9' : '#fff', color: bugModalMode === 'edit' ? '#64748B' : '#334155', fontWeight: '500', boxSizing: 'border-box', height: '36px', cursor: bugModalMode === 'edit' ? 'default' : 'pointer' }}
              >
                <option value="Critical">Khẩn cấp</option>
                <option value="High">Cao</option>
                <option value="Medium">Trung bình</option>
                <option value="Low">Thấp</option>
              </select>
            </div>
          </div>

          {/* Row 3: Mô tả lỗi */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>
              Mô tả lỗi
            </label>
            <textarea
              value={bugModalData.description}
              onChange={(e) => setBugModalData(prev => ({ ...prev, description: e.target.value }))}
              onPaste={handlePasteBugModal}
              placeholder="Mô tả chi tiết hành vi lỗi hoặc sự khác biệt so với đặc tả... (Có thể dán ảnh bằng Ctrl+V)"
              disabled={bugModalMode === 'edit'}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', color: bugModalMode === 'edit' ? '#64748B' : '#334155', backgroundColor: bugModalMode === 'edit' ? '#F1F5F9' : '#fff', boxSizing: 'border-box', minHeight: '60px', fontFamily: 'inherit', outline: 'none' }}
            />
          </div>

          {/* Row 4: Image Preview List */}
          <div className="form-group" style={{ margin: 0 }}>
            {bugModalMode !== 'edit' && bugImageUploading && (
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '0.74rem', color: '#666' }}>Đang tải ảnh...</span>
              </div>
            )}
            
            {bugModalData.imagePaths && bugModalData.imagePaths.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {bugModalData.imagePaths.map((img, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      width: '80px',
                      height: '80px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#F8FAFC'
                    }}
                  >
                    <img
                      src={getImageUrl(img)}
                      alt={`Bug preview ${idx}`}
                      onClick={() => window.open(getImageUrl(img), '_blank')}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                    />
                    {bugModalMode !== 'edit' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBugModalData(prev => ({
                            ...prev,
                            imagePaths: prev.imagePaths.filter((_, i) => i !== idx)
                          }));
                        }}
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          lineHeight: '1',
                          padding: 0
                        }}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Row 5: Người ghi nhận & Thời gian ghi nhận */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Người ghi nhận</label>
              <input
                type="text"
                value={bugModalData.reporter}
                disabled
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', backgroundColor: '#F1F5F9', color: '#64748B', fontWeight: '500', boxSizing: 'border-box', height: '36px' }}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Thời gian ghi nhận</label>
              <input
                type="date"
                value={new Date().toISOString().split('T')[0]}
                disabled
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', backgroundColor: '#F1F5F9', color: '#64748B', boxSizing: 'border-box', height: '36px' }}
              />
            </div>
          </div>

          {/* Row 6: Người xử lý & Hạn hoàn thành */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Người xử lý</label>
              <select
                value={bugModalData.assignee}
                onChange={(e) => setBugModalData(prev => ({ ...prev, assignee: e.target.value }))}
                disabled={bugModalMode === 'edit'}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', backgroundColor: bugModalMode === 'edit' ? '#F1F5F9' : '#fff', color: bugModalMode === 'edit' ? '#64748B' : '#334155', fontWeight: '500', boxSizing: 'border-box', height: '36px', cursor: bugModalMode === 'edit' ? 'default' : 'pointer' }}
              >
                {itAccounts.map((acc, idx) => (
                  <option key={idx} value={acc}>{acc}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Ngày yêu cầu hoàn thành</label>
              <input
                type="date"
                value={bugModalData.targetDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setBugModalData(prev => ({ ...prev, targetDate: e.target.value }))}
                disabled={bugModalMode === 'edit'}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', color: bugModalMode === 'edit' ? '#64748B' : '#334155', backgroundColor: bugModalMode === 'edit' ? '#F1F5F9' : '#fff', boxSizing: 'border-box', height: '36px', cursor: bugModalMode === 'edit' ? 'default' : 'pointer' }}
              />
            </div>
          </div>

          {/* Row 7 & 8: Phản hồi */}
          {bugModalMode === 'edit' && (
            <>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>
                  Phản hồi
                </label>
                <textarea
                  value={replyNotes}
                  onChange={(e) => setReplyNotes(e.target.value)}
                  onPaste={handlePasteBugModal}
                  placeholder="Nhập nội dung phản hồi kết quả sửa lỗi... (Có thể dán ảnh bằng Ctrl+V)"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '0.82rem', color: '#334155', boxSizing: 'border-box', minHeight: '60px', fontFamily: 'inherit', outline: 'none' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 'bold', color: '#475569', fontSize: '0.78rem', display: 'block', marginBottom: '6px' }}>Hình ảnh phản hồi đính kèm</label>
                <div style={{ marginBottom: '8px' }}>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleReplyImageUpload}
                    style={{ display: 'none' }}
                    id="bug-reply-image-upload"
                  />
                  <label
                    htmlFor="bug-reply-image-upload"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '6px 12px',
                      backgroundColor: '#FAF6F0',
                      border: '1px solid #EADCC9',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      color: '#7B5233',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Chọn ảnh phản hồi...
                  </label>
                  {replyUploading && <span style={{ marginLeft: '10px', fontSize: '0.74rem', color: '#666' }}>Đang tải ảnh...</span>}
                </div>
                
                {replyImages.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {replyImages.map((img, idx) => (
                      <div key={idx} style={{ width: '120px', height: '80px', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden', position: 'relative', backgroundColor: '#F8FAFC' }}>
                        <img src={getImageUrl(img)} alt="Reply preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => setReplyImages(prev => prev.filter((_, i) => i !== idx))}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px'
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 24px',
          borderTop: '1px solid #CBD5E1',
          backgroundColor: '#F8FAFC',
          borderRadius: '0 0 16px 16px'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#fff',
              color: '#475569',
              fontWeight: 'bold',
              fontSize: '0.82rem',
              cursor: 'pointer',
              height: '36px'
            }}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#4A2E20',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '0.82rem',
              cursor: 'pointer',
              height: '36px'
            }}
          >
            {bugModalMode === 'edit' ? 'Lưu thay đổi' : 'Tạo mới'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default BugModal;
