import React, { useState, useEffect, useCallback } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { bugService } from '@modules/System/Models/bug.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const BugDetailModal = ({ 
  show, 
  onClose, 
  bug = null,
  screens = [],
  users = [],
  itUsers = [],
  onSubmit 
}) => {
  const modalMeta = useScreenMetadataCached('/admin/bugs/modal');
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    screen_id: '',
    component_id: 'Chung',
    severity: 'Medium',
    description: '',
    reporter: '',
    assignee: '',
    reported_at: new Date().toISOString().split('T')[0],
    requested_at: '',
    notes: '',
    images: [],
    reply_images: []
  });

  const [selectedScreen, setSelectedScreen] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pastedImages, setPastedImages] = useState([]);
  const MAX_IMAGES = 5;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  useEffect(() => {
    if (bug) {
      setFormData({
        screen_id: bug.screen_id || '',
        component_id: bug.component_id || 'Chung',
        severity: bug.severity || 'Medium',
        description: bug.description || '',
        reporter: bug.reporter || '',
        assignee: bug.assignee || '',
        reported_at: bug.reported_at ? bug.reported_at.split('T')[0] : '',
        requested_at: bug.requested_at ? bug.requested_at.split('T')[0] : '',
        notes: bug.notes || '',
        images: bug.images || [],
        reply_images: []
      });
    } else {
      const defaultAssignee = itUsers[0]?.full_name || itUsers[0]?.username || '';
      setFormData({
        screen_id: screens[0]?.id || '',
        component_id: 'Chung',
        severity: 'Medium',
        description: '',
        reporter: getCurrentUser(),
        assignee: defaultAssignee,
        reported_at: new Date().toISOString().split('T')[0],
        requested_at: new Date().toISOString().split('T')[0],
        notes: '',
        images: [],
        reply_images: []
      });
    }
  }, [bug, screens, itUsers]);

  useEffect(() => {
    if (formData.screen_id) {
      const screen = screens.find(s => s.id === parseInt(formData.screen_id));
      setSelectedScreen(screen);
    }
  }, [formData.screen_id, screens]);

  // Handle paste ảnh từ clipboard (theo cách ScreenBugManagementView)
  const handlePasteImage = async (e) => {
    console.log('🎯 handlePasteImage triggered!');
    const clipboardData = e.clipboardData || (e.nativeEvent && e.nativeEvent.clipboardData);
    console.log('📋 clipboardData:', clipboardData);
    if (!clipboardData) {
      console.log('❌ No clipboardData');
      return;
    }
    
    const items = clipboardData.items;
    console.log('📦 items:', items, 'length:', items?.length);
    const files = [];
    
    for (let i = 0; i < items.length; i++) {
      console.log(`📄 Item ${i} type:`, items[i].type);
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        console.log('🖼️ Image file:', file);
        if (file) files.push(file);
      }
    }

    console.log('✅ Total image files:', files.length);
    if (files.length === 0) {
      console.log('❌ No image files found');
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Validate số lượng ảnh
    const currentCount = formData.images.length;
    const newCount = currentCount + files.length;
    if (newCount > MAX_IMAGES) {
      toast.error(`Tối đa ${MAX_IMAGES} ảnh!`);
      return;
    }

    // Validate file size và type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    for (let file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File "${file.name}" quá lớn! Tối đa 5MB.`);
        return;
      }
      if (!validTypes.includes(file.type)) {
        toast.error(`File "${file.name}" không hợp lệ! Chỉ chấp nhận JPG, PNG, GIF, WebP.`);
        return;
      }
    }

    // Upload
    setUploading(true);
    
    for (const file of files) {
      try {
        const res = await bugService.uploadImage(file);
        if (res && res.url) {
          setFormData(prev => ({
            ...prev,
            images: [...prev.images, res.url]
          }));
        }
      } catch (error) {
        console.error('Lỗi tải ảnh từ clipboard:', error);
        toast.error('Tải ảnh từ clipboard thất bại!');
      }
    }
    
    setUploading(false);
    toast.success(`Đã dán ${files.length} ảnh thành công!`);
  };

  // Handle ESC và Ctrl+Enter
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Enter' && e.ctrlKey) {
        handleSubmit(e);
      }
    };

    if (show) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [show]);

  const getCurrentUser = () => {
    const userStr = localStorage.getItem('smartflow_user');
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        return userObj.full_name || userObj.username || 'Admin';
      } catch (e) {
        return 'Admin';
      }
    }
    return 'Admin';
  };

  const handleImageUpload = useCallback(async (e, field) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate số lượng ảnh
    const currentCount = formData[field].length;
    const newCount = currentCount + files.length;
    if (newCount > MAX_IMAGES) {
      toast.error(`Tối đa ${MAX_IMAGES} ảnh!`);
      return;
    }

    // Validate file size và type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    for (let file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File "${file.name}" quá lớn! Tối đa 5MB.`);
        return;
      }
      if (!validTypes.includes(file.type)) {
        toast.error(`File "${file.name}" không hợp lệ! Chỉ chấp nhận JPG, PNG, GIF, WebP.`);
        return;
      }
    }

    setUploading(true);
    const uploadedUrls = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await bugService.uploadImage(file);
        if (res && res.url) {
          uploadedUrls.push(res.url);
        } else {
          toast.error(`Không thể tải "${file.name}"`);
        }
      }

      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], ...uploadedUrls]
      }));

      toast.success(`Đã tải lên ${uploadedUrls.length} ảnh!`);
    } catch (error) {
      toast.error('Tải ảnh thất bại!');
    } finally {
      setUploading(false);
    }
  }, [formData, toast]);

  const handleRemoveImage = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.screen_id || !formData.description.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin bắt buộc!');
      return;
    }

    if (formData.images.length === 0) {
      toast.error('Vui lòng tải lên ít nhất 1 ảnh bằng chứng!');
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      toast.error('Không thể lưu báo cáo lỗi!');
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'modal-overlay') {
      onClose();
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div className="modal-container" 
        onPaste={handlePasteImage}
        style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        width: '660px',
        maxWidth: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          backgroundColor: '#fff',
          zIndex: 1
        }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#111827' }}>
            {modalMeta.screenCode ? `${modalMeta.screenCode}: ` : ''}
            {modalMeta.title || '🐛 Khai báo lỗi'}
          </h3>
          <button type="button" onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9CA3AF', fontSize: '1.5rem', padding: '4px'
          }}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                  Màn hình <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select value={formData.screen_id} onChange={(e) => setFormData({ ...formData, screen_id: e.target.value })} required
                  style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', outline: 'none' }}>
                  {screens.map(s => (
                    <option key={s.id} value={s.id}>{s.current_code}: {s.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>Trạng thái</label>
                <input type="text" value="Mới" disabled
                  style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', backgroundColor: '#F3F4F6', color: '#6B7280' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>Component</label>
                <select value={formData.component_id} onChange={(e) => setFormData({ ...formData, component_id: e.target.value })}
                  style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', outline: 'none' }}>
                  <option value="Chung">Chung (Toàn màn hình)</option>
                  {selectedScreen?.components && selectedScreen.components.length > 0 ? (
                    selectedScreen.components.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))
                  ) : (
                    <option disabled>Chưa có components</option>
                  )}
                </select>
              </div>

              <div>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                  Mức độ <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })} required
                  style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', outline: 'none' }}>
                  <option value="Critical">Khẩn cấp</option>
                  <option value="High">Cao</option>
                  <option value="Medium">Trung bình</option>
                  <option value="Low">Thấp</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                Mô tả lỗi <span style={{ color: '#EF4444' }}>*</span>
                <span style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 'normal', marginLeft: '8px' }}>
                  💡 Có thể dán ảnh trực tiếp (Ctrl+V)
                </span>
              </label>
              <textarea rows="3" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                onPaste={handlePasteImage}
                placeholder="Mô tả chi tiết lỗi... (Có thể dán ảnh bằng Ctrl+V)" required
                style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>

            <div>
              <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                Ảnh bằng chứng <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ border: '2px dashed #D1D5DB', borderRadius: '8px', padding: '20px', textAlign: 'center', backgroundColor: '#F9FAFB' }}>
                <input type="file" id="bug-images" accept="image/*" multiple onChange={(e) => handleImageUpload(e, 'images')} style={{ display: 'none' }} />
                <label htmlFor="bug-images" style={{ cursor: 'pointer' }}>
                  <ImageIcon size={32} style={{ margin: '0 auto 8px', color: '#9CA3AF' }} />
                  <p style={{ margin: 0, color: '#6B7280', fontSize: '0.84rem' }}>Click để tải ảnh hoặc dán từ clipboard (Ctrl+V)</p>
                  <p style={{ margin: '4px 0 0', color: '#9CA3AF', fontSize: '0.75rem' }}>Tối đa {MAX_IMAGES} ảnh, mỗi ảnh ≤ 5MB</p>
                </label>
                {uploading && (
                  <div style={{ marginTop: '12px', color: '#7B5233', fontSize: '0.84rem', fontWeight: '600' }}>
                    ⏳ Đang tải ảnh...
                  </div>
                )}
                
                {formData.images.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {formData.images.map((img, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '80px', height: '80px' }}>
                        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                        <button type="button" onClick={() => handleRemoveImage('images', idx)}
                          style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>Người ghi nhận</label>
                <input type="text" value={formData.reporter} disabled
                  style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', backgroundColor: '#F3F4F6', color: '#6B7280' }} />
              </div>

              <div>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>Thời gian ghi nhận</label>
                <input type="date" value={formData.reported_at} onChange={(e) => setFormData({ ...formData, reported_at: e.target.value })}
                  style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', outline: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                  Người xử lý <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select value={formData.assignee} onChange={(e) => setFormData({ ...formData, assignee: e.target.value })} required
                  style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', outline: 'none' }}>
                  {itUsers.map(u => (
                    <option key={u.id} value={u.full_name || u.username}>{u.full_name || u.username}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                  Ngày yêu cầu hoàn thành <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input type="date" value={formData.requested_at} onChange={(e) => setFormData({ ...formData, requested_at: e.target.value })} required
                  min={new Date().toISOString().split('T')[0]}
                  style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', outline: 'none' }} />
              </div>
            </div>

            <div>
              <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>Phản hồi</label>
              <textarea rows="3" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Ghi chú thêm..."
                style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>

          </div>

          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '10px 20px', border: '1px solid #D1D5DB', borderRadius: '8px', backgroundColor: '#fff', color: '#374151', fontSize: '0.84rem', fontWeight: '600', cursor: 'pointer' }}>
              Hủy bỏ
            </button>
            <button type="submit" disabled={uploading}
              style={{ padding: '10px 20px', border: 'none', borderRadius: '8px', backgroundColor: '#7B5233', color: '#fff', fontSize: '0.84rem', fontWeight: '600', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
              {uploading ? 'Đang tải...' : 'Xác nhận'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BugDetailModal;
