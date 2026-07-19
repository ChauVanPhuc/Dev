import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { bugService } from '@modules/System/Models/bug.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';

const BugDetailModal = ({ 
  show, 
  onClose, 
  bug = null,
  screens = [],
  users = [],
  itUsers = [],
  onSubmit 
}) => {
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

  useEffect(() => {
    if (bug) {
      // Edit mode
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
      // Create mode - reset
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

  const handleImageUpload = async (e, field) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedUrls = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await bugService.uploadImage(file);
        if (res && res.url) {
          uploadedUrls.push(res.url);
        }
      }

      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], ...uploadedUrls]
      }));

      toast('success', `Đã tải lên ${uploadedUrls.length} ảnh!`);
    } catch (error) {
      toast('error', 'Tải ảnh thất bại!');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.screen_id || !formData.description.trim()) {
      toast('error', 'Vui lòng nhập đầy đủ thông tin bắt buộc!');
      return;
    }

    if (formData.images.length === 0) {
      toast('error', 'Vui lòng tải lên ít nhất 1 ảnh bằng chứng!');
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      toast('error', 'Không thể lưu báo cáo lỗi!');
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" style={{
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
      <div className="modal-container" style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        width: '660px',
        maxWidth: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
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
            HD04: Thông tin chi tiết lỗi
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
              fontSize: '1.5rem',
              padding: '4px'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Row 1: Màn hình & Trạng thái */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                  Màn hình <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={formData.screen_id}
                  onChange={(e) => setFormData({ ...formData, screen_id: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '0.84rem',
                    outline: 'none'
                  }}
                >
                  {screens.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.current_code}: {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                  Trạng thái
                </label>
                <input
                  type="text"
                  value="Mới"
                  disabled
                  style={{
                    width: '100%',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '0.84rem',
                    backgroundColor: '#F3F4F6',
                    color: '#6B7280'
                  }}
                />
              </div>
            </div>

            {/* Row 2: Component & Mức độ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                  Component
                </label>
                <select
                  value={formData.component_id}
                  onChange={(e) => setFormData({ ...formData, component_id: e.target.value })}
                  style={{
                    width: '100%',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '0.84rem',
                    outline: 'none'
                  }}
                >
                  <option value="Chung">Chung</option>
                  {selectedScreen?.components?.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                  Mức độ <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '0.84rem',
                    outline: 'none'
                  }}
                >
                  <option value="Critical">Khẩn cấp</option>
                  <option value="High">Cao</option>
                  <option value="Medium">Trung bình</option>
                  <option value="Low">Thấp</option>
                </select>
              </div>
            </div>

            {/* Row 3: Mô tả lỗi */}
            <div>
              <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                Mô tả lỗi <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả chi tiết lỗi..."
                required
                style={{
                  width: '100%',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '0.84rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Row 4: Upload ảnh gốc */}
            <div>
              <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                Ảnh bằng chứng <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{
                border: '2px dashed #D1D5DB',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                backgroundColor: '#F9FAFB'
              }}>
                <input
                  type="file"
                  id="bug-images"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e, 'images')}
                  style={{ display: 'none' }}
                />
                <label htmlFor="bug-images" style={{ cursor: 'pointer' }}>
                  <ImageIcon size={32} style={{ margin: '0 auto 8px', color: '#9CA3AF' }} />
                  <p style={{ margin: 0, color: '#6B7280', fontSize: '0.84rem' }}>
                    Click để tải ảnh hoặc kéo thả vào đây
                  </p>
                </label>
                
                {formData.images.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {formData.images.map((img, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '80px', height: '80px' }}>
                        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage('images', idx)}
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            background: '#EF4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 5: Người ghi nhận & Thời gian */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                  Người ghi nhận
                </label>
                <input
                  type="text"
                  value={formData.reporter}
                  disabled
                  style={{
                    width: '100%',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '0.84rem',
                    backgroundColor: '#F3F4F6',
                    color: '#6B7280'
                  }}
                />
              </div>

              <div>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                  Thời gian ghi nhận
                </label>
                <input
                  type="date"
                  value={formData.reported_at}
                  onChange={(e) => setFormData({ ...formData, reported_at: e.target.value })}
                  style={{
                    width: '100%',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '0.84rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Row 6: Người xử lý & Ngày yêu cầu */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                  Người xử lý <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={formData.assignee}
                  onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '0.84rem',
                    outline: 'none'
                  }}
                >
                  {itUsers.map(u => (
                    <option key={u.id} value={u.full_name || u.username}>
                      {u.full_name || u.username}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                  Ngày yêu cầu hoàn thành <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.requested_at}
                  onChange={(e) => setFormData({ ...formData, requested_at: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '0.84rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Row 7: Phản hồi */}
            <div>
              <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                Phản hồi
              </label>
              <textarea
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ghi chú thêm..."
                style={{
                  width: '100%',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '0.84rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

          </div>

          {/* Footer */}
          <div style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                backgroundColor: '#fff',
                color: '#374151',
                fontSize: '0.84rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={uploading}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#7B5233',
                color: '#fff',
                fontSize: '0.84rem',
                fontWeight: '600',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.6 : 1
              }}
            >
              {uploading ? 'Đang tải...' : 'Xác nhận'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BugDetailModal;
