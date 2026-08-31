import React, { useState, useEffect } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import '@styles/components.css';

/**
 * Modal KPINewTrainingModal (Tab 4 - Tạo/Chỉnh sửa Kế hoạch Đào tạo & Upload File Đính Kèm)
 */
const KPINewTrainingModal = ({ isOpen, onClose, planData, onSave }) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    code: `KH-ĐT-0${Math.floor(Math.random() * 90) + 10}`,
    name: '',
    target: 'Nhân viên QC mới & Tổ trưởng',
    time: '2026-09-15',
    teacher: 'Phạm Văn Trưởng QC',
    status: 'Sắp diễn ra'
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);

  useEffect(() => {
    if (planData) {
      setFormData({
        code: planData.code || 'KH-ĐT-01',
        name: planData.name || '',
        target: planData.target || 'Nhân viên QC mới & Tổ trưởng',
        time: planData.time || '2026-09-15',
        teacher: planData.teacher || 'Phạm Văn Trưởng QC',
        status: planData.status || 'Sắp diễn ra'
      });
      setFileUrl(planData.fileUrl || null);
    } else {
      setFormData({
        code: `KH-ĐT-0${Math.floor(Math.random() * 90) + 10}`,
        name: '',
        target: 'Nhân viên QC mới & Tổ trưởng',
        time: '2026-09-15',
        teacher: 'Phạm Văn Trưởng QC',
        status: 'Sắp diễn ra'
      });
      setSelectedFile(null);
      setFileUrl(null);
    }
  }, [planData, isOpen]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const createdUrl = URL.createObjectURL(file);
      setFileUrl(createdUrl);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) {
      onSave({
        ...formData,
        id: planData ? planData.id : undefined,
        fileName: selectedFile ? selectedFile.name : (planData?.fileName || 'TaiLieuDaoTao_ISO.pdf'),
        fileUrl: fileUrl || planData?.fileUrl || null,
        fileObject: selectedFile || planData?.fileObject || null,
        fileSize: selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : '1.24 MB'
      });
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(3px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      boxSizing: 'border-box'
    }} onClick={onClose}>
      
      <div style={{
        margin: 'auto',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '540px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#FAF6F0'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#5D3B32', fontWeight: '800' }}>
            {planData ? '✏️ Chỉnh sửa Kế hoạch Đào tạo' : '📚 Tạo Kế hoạch Đào tạo mới'}
          </h3>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                Mã khóa học *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                Giảng viên / Đơn vị phụ trách *
              </label>
              <input
                type="text"
                value={formData.teacher}
                onChange={(e) => setFormData(prev => ({ ...prev, teacher: e.target.value }))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
              Tên chương trình đào tạo *
            </label>
            <input
              type="text"
              placeholder="VD: Huấn luyện Quy trình kiểm định ISO 9001:2015"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                Đối tượng tham gia *
              </label>
              <input
                type="text"
                value={formData.target}
                onChange={(e) => setFormData(prev => ({ ...prev, target: e.target.value }))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                Thời gian tổ chức *
              </label>
              <input
                type="date"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                required
              />
            </div>
          </div>

          {/* Trạng thái khóa học */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
              Trạng thái khóa học *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="Sắp diễn ra">Sắp diễn ra</option>
              <option value="Đang mở đăng ký">Đang mở đăng ký</option>
              <option value="Đang diễn ra">Đang diễn ra</option>
              <option value="Đã hoàn thành">Đã hoàn thành</option>
            </select>
          </div>

          {/* Upload File Zone (PDF / DOCX) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
              Upload Tài liệu huấn luyện (PDF / DOCX)
            </label>
            <div style={{
              border: '2px dashed #CBD5E1',
              borderRadius: '8px',
              padding: '14px',
              textAlign: 'center',
              backgroundColor: '#FAF6F0',
              cursor: 'pointer',
              position: 'relative'
            }}>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xlsx"
                onChange={handleFileChange}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
              />
              <Upload size={24} style={{ color: '#7B5233', marginBottom: '4px' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#5D3B32' }}>
                {selectedFile ? selectedFile.name : (planData?.fileName || 'Nhấp vào đây hoặc kéo thả file vào đây')}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                Hỗ trợ định dạng .PDF, .DOCX, .XLSX (Tối đa 25MB)
              </div>
            </div>
            {(selectedFile || planData?.fileName) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.75rem', color: '#15803D', fontWeight: '700' }}>
                <FileText size={14} /> File đính kèm: {selectedFile ? selectedFile.name : planData.fileName}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '6px 16px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#334155', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              style={{ padding: '6px 20px', border: 'none', borderRadius: '6px', backgroundColor: '#5D3B32', color: '#FFFFFF', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              {planData ? 'Cập nhật kế hoạch' : 'Lưu kế hoạch đào tạo'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default KPINewTrainingModal;
