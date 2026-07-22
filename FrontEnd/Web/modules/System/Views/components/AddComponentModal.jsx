import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, FileText, Play, Type, Table2, CheckSquare, List, Layout, Menu, CreditCard, Sliders, Bell, Component } from 'lucide-react';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import api, { getBaseURL } from '@webShared/Services/api.service';

const AddComponentModal = ({ isOpen, onClose, editingComponent, onConfirm }) => {
  const [newComponentName, setNewComponentName] = useState('');
  const [newComponentType, setNewComponentType] = useState('Button');
  const [newComponentButtonId, setNewComponentButtonId] = useState('');
  const [newComponentExportMode, setNewComponentExportMode] = useState('list');
  const [newComponentFrontend, setNewComponentFrontend] = useState('');
  const [newComponentWorkflow, setNewComponentWorkflow] = useState('');
  const [newComponentBackend, setNewComponentBackend] = useState('');
  const [newComponentSampleFileUrl, setNewComponentSampleFileUrl] = useState('');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isUploadingSample, setIsUploadingSample] = useState(false);
  const sampleFileInputRef = useRef(null);
  
  const { toast } = useToast();
  const showToast = React.useCallback((message, type = 'success') => {
    toast(type, message);
  }, [toast]);

  useEffect(() => {
    if (editingComponent) {
      let techObj = {};
      if (editingComponent.technical_details) {
        try {
          techObj = typeof editingComponent.technical_details === 'string'
            ? JSON.parse(editingComponent.technical_details)
            : editingComponent.technical_details;
        } catch (err) { }
      }
      setNewComponentName(editingComponent.name || '');
      setNewComponentType(editingComponent.type || 'Button');
      setNewComponentFrontend(techObj.frontend_description || editingComponent.description || '');
      setNewComponentWorkflow(techObj.workflow_description || '');
      setNewComponentBackend(techObj.backend_description || '');
      setNewComponentButtonId(techObj.button_id || '');
      setNewComponentExportMode(techObj.export_mode || 'list');
      setNewComponentSampleFileUrl(editingComponent.file_path || techObj.sample_file_url || '');
    } else {
      setNewComponentName('');
      setNewComponentType('Button');
      setNewComponentFrontend('');
      setNewComponentWorkflow('');
      setNewComponentBackend('');
      setNewComponentButtonId('');
      setNewComponentExportMode('list');
      setNewComponentSampleFileUrl('');
    }
    setIsUploadingSample(false);
  }, [editingComponent, isOpen]);

  if (!isOpen) return null;

  const handleSampleFileChange = async (e) => {
    const input = e.target;
    const files = Array.from(input.files);
    if (files.length === 0) return;

    const allowedExts = ['.doc', '.docx', '.xls', '.xlsx', '.pdf'];
    const validFiles = [];

    for (const file of files) {
      const dotIndex = file.name.lastIndexOf('.');
      const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : '';
      if (!allowedExts.includes(ext)) {
        showToast(`Tệp "${file.name}" không hợp lệ! Chỉ chấp nhận Word, Excel hoặc PDF.`, 'error');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      input.value = '';
      return;
    }

    setIsUploadingSample(true);
    try {
      const uploadedUrls = [];
      for (const file of validFiles) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/screens/upload-component-sample', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        if (res && res.url) {
          uploadedUrls.push(res.url);
        }
      }

      if (uploadedUrls.length > 0) {
        const existingUrls = newComponentSampleFileUrl ? newComponentSampleFileUrl.split(',').filter(Boolean) : [];
        const newUrls = [...existingUrls, ...uploadedUrls].join(',');
        setNewComponentSampleFileUrl(newUrls);
        showToast(`Tải lên thành công ${uploadedUrls.length} file mẫu!`);
      } else {
        showToast('Tải lên file mẫu thất bại!', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi tải lên file mẫu!', 'error');
    } finally {
      setIsUploadingSample(false);
      input.value = '';
    }
  };

  const handleSubmit = () => {
    if (!newComponentName.trim()) {
      showToast('Tên component không được để trống!', 'error');
      return;
    }
    onConfirm({
      name: newComponentName.trim(),
      type: newComponentType,
      frontend_description: newComponentFrontend.trim(),
      workflow_description: newComponentWorkflow.trim(),
      backend_description: newComponentBackend.trim(),
      button_id: newComponentButtonId.trim(),
      export_mode: newComponentExportMode,
      sample_file_url: newComponentSampleFileUrl
    });
  };

  return (
    <div className="hd05-modal-overlay-custom" style={{
      zIndex: 9999,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="hd05-modal-container-custom" style={{
        background: '#ffffff',
        padding: '24px 28px',
        borderRadius: '16px',
        width: '600px',
        maxWidth: '100%',
        maxHeight: 'calc(100vh - 40px)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
        border: '1px solid #E2E8F0',
        fontFamily: "'Outfit', sans-serif"
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#111827' }}>
            {editingComponent ? 'HD05: Chỉnh sửa thành phần' : 'HD05: Thêm thành phần'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1, paddingRight: '8px', marginBottom: '18px' }}>
          {/* Row 1: Name and Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                Tên <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={newComponentName}
                onChange={(e) => setNewComponentName(e.target.value)}
                placeholder="Nhập tên thành phần..."
                style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', boxSizing: 'border-box', outline: 'none', backgroundColor: '#ffffff' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0, position: 'relative' }}>
              <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                Loại Component
              </label>

              {/* Custom Dropdown Trigger */}
              <div
                onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                style={{
                  width: '100%',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '0.84rem',
                  boxSizing: 'border-box',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  userSelect: 'none',
                  color: '#374151',
                  fontWeight: '600'
                }}
              >
                <span>
                  {newComponentType === 'Button' && 'Nút'}
                  {newComponentType === 'Input Field' && 'Ô nhập dữ liệu'}
                  {newComponentType === 'Checkbox / Radio' && 'Hộp chọn'}
                  {newComponentType === 'Dropdown / Select' && 'Menu thả xuống'}
                  {newComponentType === 'Modal / Dialog' && 'Hộp hội thoại'}
                  {newComponentType === 'Navbar / Sidebar' && 'Thanh điều hướng'}
                  {newComponentType === 'Card' && 'Thẻ thông tin'}
                  {newComponentType === 'Table' && 'Bảng dữ liệu'}
                  {newComponentType === 'Carousel / Slider' && 'Trình chiếu'}
                  {newComponentType === 'Toast / Alert' && 'Thông báo nhanh'}
                  {newComponentType === 'Khác' && 'Khác'}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>▼</span>
              </div>

              {/* Custom Dropdown Menu */}
              {isTypeDropdownOpen && (
                <>
                  <div
                    onClick={() => setIsTypeDropdownOpen(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: '#fff',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    zIndex: 10001,
                    maxHeight: '260px',
                    overflowY: 'auto',
                    marginTop: '4px',
                    padding: '4px 0'
                  }}>
                    {[
                      { value: 'Button', label: 'Nút', hint: 'Nút bấm kích hoạt hành động.' },
                      { value: 'Input Field', label: 'Ô nhập dữ liệu', hint: 'Ô nhập dữ liệu văn bản.' },
                      { value: 'Checkbox / Radio', label: 'Hộp chọn', hint: 'Hộp chọn một hoặc nhiều mục.' },
                      { value: 'Dropdown / Select', label: 'Menu thả xuống', hint: 'Menu danh sách thả xuống.' },
                      { value: 'Modal / Dialog', label: 'Hộp hội thoại', hint: 'Cửa sổ thông báo bật lên.' },
                      { value: 'Navbar / Sidebar', label: 'Thanh điều hướng', hint: 'Thanh điều hướng trang web.' },
                      { value: 'Card', label: 'Thẻ thông tin', hint: 'Thẻ chứa hình ảnh và thông tin.' },
                      { value: 'Table', label: 'Bảng dữ liệu', hint: 'Bảng hiển thị dữ liệu cột.' },
                      { value: 'Carousel / Slider', label: 'Trình chiếu', hint: 'Trình trình chiếu ảnh chạy qua lại.' },
                      { value: 'Toast / Alert', label: 'Thông báo nhanh', hint: 'Thanh thông báo nhanh góc màn hình.' },
                      { value: 'Khác', label: 'Khác', hint: 'Không tồn tại trong các sự lựa chọn trên.' }
                    ].map((item) => (
                      <div
                        key={item.value}
                        onClick={() => {
                          setNewComponentType(item.value);
                          setIsTypeDropdownOpen(false);
                        }}
                        className="custom-select-item"
                        title={item.hint}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          transition: 'background 0.2s',
                          borderBottom: '1px solid #FAF6F0'
                        }}
                      >
                        <span style={{ fontWeight: '700', fontSize: '0.82rem', color: '#2D1A12' }}>{item.label}</span>
                        <span style={{ fontSize: '0.7rem', color: '#8D6E63', fontStyle: 'italic' }}>{item.hint}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Row 2: Button ID & Export Mode */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flexShrink: 0 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                Tên ID nút
              </label>
              <input
                type="text"
                value={newComponentButtonId}
                onChange={(e) => setNewComponentButtonId(e.target.value)}
                placeholder="Nhập id/tên định danh của nút..."
                style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', backgroundColor: '#ffffff' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
                Chế độ xuất dữ liệu
              </label>
              <select
                value={newComponentExportMode}
                onChange={(e) => setNewComponentExportMode(e.target.value)}
                style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit', backgroundColor: '#ffffff' }}
              >
                <option value="list">Danh sách (List)</option>
                <option value="single">Một bản ghi (Single)</option>
              </select>
            </div>
          </div>

          {/* Row 3: Frontend Spec */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
              Đặc tả Frontend
            </label>
            <textarea
              rows="2"
              value={newComponentFrontend}
              onChange={(e) => setNewComponentFrontend(e.target.value)}
              placeholder="Mô tả cấu trúc hiển thị, giao diện của thành phần..."
              style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit', backgroundColor: '#ffffff' }}
            />
          </div>

          {/* Row 4: Workflow Spec */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
              Luồng xử lý/Điều kiện
            </label>
            <textarea
              rows="2"
              value={newComponentWorkflow}
              onChange={(e) => setNewComponentWorkflow(e.target.value)}
              placeholder="Mô tả các điều kiện kiểm tra, kịch bản tương tác và luồng nghiệp vụ..."
              style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit', backgroundColor: '#ffffff' }}
            />
          </div>

          {/* Row 5: Backend Spec */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '6px' }}>
              Đặc tả Backend
            </label>
            <textarea
              rows="2"
              value={newComponentBackend}
              onChange={(e) => setNewComponentBackend(e.target.value)}
              placeholder="Mô tả API Endpoint cần gọi, tham số request/response và logic xử lý server..."
              style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '10px 14px', fontSize: '0.84rem', boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit', backgroundColor: '#ffffff' }}
            />
          </div>

          {/* Row 6: Sample File Upload */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: '700', color: '#374151', fontSize: '0.82rem', display: 'block', marginBottom: '8px' }}>
              File mẫu
            </label>
            <input
              type="file"
              ref={sampleFileInputRef}
              multiple
              accept=".doc,.docx,.xls,.xlsx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf"
              onChange={handleSampleFileChange}
              disabled={isUploadingSample}
              style={{ display: 'none' }}
            />

            <div
              onClick={() => !isUploadingSample && sampleFileInputRef.current && sampleFileInputRef.current.click()}
              style={{
                border: '2px dashed #D1D5DB',
                borderRadius: '10px',
                padding: '22px 16px',
                textAlign: 'center',
                cursor: isUploadingSample ? 'not-allowed' : 'pointer',
                background: isUploadingSample ? '#F9FAFB' : '#fff',
                transition: 'all 0.2s ease',
                marginBottom: '8px'
              }}
              onMouseEnter={(e) => { if (!isUploadingSample) { e.currentTarget.style.borderColor = '#7B5233'; e.currentTarget.style.background = '#FDFBF7'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.background = isUploadingSample ? '#F9FAFB' : '#fff'; }}
            >
              <Upload size={28} style={{ color: '#7B5233', marginBottom: '8px' }} />
              <div style={{ fontSize: '0.84rem', color: '#374151', fontWeight: 600, marginBottom: '4px' }}>
                Nhấn để chọn file mẫu (Có thể chọn nhiều file)
              </div>
              <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                Word (.doc, .docx), Excel (.xls, .xlsx), PDF (.pdf)
              </div>
            </div>

            {isUploadingSample && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', border: '1px solid #F3E8D8', borderRadius: '10px', background: '#FDFBF7', color: '#7B5233', fontSize: '0.84rem', marginBottom: '8px' }}>
                <div style={{ width: '18px', height: '18px', border: '2px solid #D1B99D', borderTopColor: '#7B5233', borderRadius: '50%' }} />
                <span>Đang tải lên file mẫu...</span>
              </div>
            )}

            {newComponentSampleFileUrl && !isUploadingSample && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {newComponentSampleFileUrl.split(',').filter(Boolean).map((fileUrl, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #D1D5DB', borderRadius: '10px', background: '#F9FAFB' }}>
                    <FileText size={22} style={{ color: '#7B5233', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a
                        href={`${getBaseURL()}${fileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'block', fontSize: '0.82rem', color: '#7B5233', fontWeight: 600, textDecoration: 'underline', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {fileUrl.split('/').pop()}
                      </a>
                      <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '2px' }}>
                        Đã tải lên thành công
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const remaining = newComponentSampleFileUrl.split(',').filter(Boolean).filter((_, i) => i !== index).join(',');
                        setNewComponentSampleFileUrl(remaining);
                      }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: '#FEE2E2', color: '#EF4444', cursor: 'pointer' }}
                      title="Xóa file mẫu"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '10px 24px', border: '1px solid #7B5233', borderRadius: '8px', fontSize: '0.84rem', cursor: 'pointer', background: '#fff', color: '#7B5233', fontWeight: 'bold' }}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isUploadingSample}
            style={{ padding: '10px 24px', border: 'none', borderRadius: '8px', fontSize: '0.84rem', cursor: isUploadingSample ? 'not-allowed' : 'pointer', background: '#4A2E20', color: '#fff', fontWeight: 'bold', opacity: isUploadingSample ? 0.6 : 1 }}
          >
            {isUploadingSample ? 'Đang tải file...' : (editingComponent ? 'Cập nhật' : 'Tạo mới')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddComponentModal;
