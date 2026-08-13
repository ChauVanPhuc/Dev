import React, { useState, useEffect } from 'react';
import { X, FileText, FileSpreadsheet, File } from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const ScreenExportDetailModal = ({ visible, screen, onClose, onExport }) => {
  const modalMeta = useScreenMetadataCached('/admin/system/screens/modal/export-detail');
  const [format, setFormat] = useState('pdf');
  const [templateStyle, setTemplateStyle] = useState('standard');
  const [options, setOptions] = useState({
    include_basic_info: true,
    include_mockup: true,
    include_components: true,
    include_guides: true,
    include_bugs: true,
    include_history: false,
  });
  const [loading, setLoading] = useState(false);

  // Reset state khi modal mo lai
  useEffect(() => {
    if (visible) {
      setFormat('pdf');
      setTemplateStyle('standard');
      setOptions({
        include_basic_info: true,
        include_mockup: true,
        include_components: true,
        include_guides: true,
        include_bugs: true,
        include_history: false,
      });
      setLoading(false);
    }
  }, [visible]);

  if (!visible || !screen) return null;

  const handleToggleOption = (key) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = () => {
    setOptions({
      include_basic_info: true,
      include_mockup: true,
      include_components: true,
      include_guides: true,
      include_bugs: true,
      include_history: true,
    });
  };

  const handleDeselectAll = () => {
    setOptions({
      include_basic_info: false,
      include_mockup: false,
      include_components: false,
      include_guides: false,
      include_bugs: false,
      include_history: false,
    });
  };

  const handleExport = async () => {
    const selectedCount = Object.values(options).filter(Boolean).length;
    if (selectedCount === 0) {
      alert('Vui lòng chọn ít nhất 1 nội dung để xuất!');
      return;
    }

    setLoading(true);
    try {
      await onExport(format, options, templateStyle);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          width: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          border: '1px solid #EADCC9',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #EADCC9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#7B5233' }}>
            {modalMeta.screenCode ? `${modalMeta.screenCode}: ` : ''}
            {modalMeta.title || '📄 Xuất đặc tả chi tiết màn hình'}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#8D6E63',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* 1. Thông tin màn hình */}
          <div
            style={{
              background: '#FAF6F0',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
              border: '1px solid #EADCC9',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: '#7B5233', marginBottom: '8px' }}>
              <strong>Mã màn hình:</strong> {screen.current_code || screen.default_code}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#7B5233', marginBottom: '8px' }}>
              <strong>Tên màn hình:</strong> {screen.title}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#7B5233' }}>
              <strong>Nền tảng:</strong> {screen.platform}
            </div>
          </div>

          {/* 2. Chọn định dạng */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: '12px' }}>
              Chọn định dạng xuất
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label
                style={{
                  flex: 1,
                  padding: '12px',
                  border: format === 'pdf' ? '2px solid #7B5233' : '1px solid #D1D5DB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: format === 'pdf' ? '#FAF6F0' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={format === 'pdf'}
                  onChange={(e) => setFormat(e.target.value)}
                  style={{ accentColor: '#7B5233' }}
                />
                <FileText size={18} color="#7B5233" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#2D1A12' }}>PDF</div>
                  <div style={{ fontSize: '0.75rem', color: '#8D6E63' }}>In ấn, không sửa</div>
                </div>
              </label>

              <label
                style={{
                  flex: 1,
                  padding: '12px',
                  border: format === 'docx' ? '2px solid #7B5233' : '1px solid #D1D5DB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: format === 'docx' ? '#FAF6F0' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <input
                  type="radio"
                  name="format"
                  value="docx"
                  checked={format === 'docx'}
                  onChange={(e) => setFormat(e.target.value)}
                  style={{ accentColor: '#7B5233' }}
                />
                <File size={18} color="#7B5233" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#2D1A12' }}>DOCX</div>
                  <div style={{ fontSize: '0.75rem', color: '#8D6E63' }}>Chỉnh sửa được</div>
                </div>
              </label>

              <label
                style={{
                  flex: 1,
                  padding: '12px',
                  border: format === 'excel' ? '2px solid #7B5233' : '1px solid #D1D5DB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: format === 'excel' ? '#FAF6F0' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <input
                  type="radio"
                  name="format"
                  value="excel"
                  checked={format === 'excel'}
                  onChange={(e) => setFormat(e.target.value)}
                  style={{ accentColor: '#7B5233' }}
                />
                <FileSpreadsheet size={18} color="#7B5233" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#2D1A12' }}>Excel</div>
                  <div style={{ fontSize: '0.75rem', color: '#8D6E63' }}>Phân tích dữ liệu</div>
                </div>
              </label>
            </div>
          </div>

          {/* 3. Chọn nội dung */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: '12px' }}>
              Chọn nội dung xuất
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { key: 'include_basic_info', label: 'Thông tin cơ bản (mã, tên, phân hệ, trạng thái...)' },
                { key: 'include_mockup', label: 'Ảnh Mockup giao diện' },
                { key: 'include_components', label: 'Danh sách Components (UI, Logic, API...)' },
                { key: 'include_guides', label: 'Hướng dẫn sử dụng chi tiết' },
                { key: 'include_bugs', label: 'Danh sách lỗi (Bugs) và tiến độ sửa' },
                { key: 'include_history', label: 'Lịch sử thay đổi (sắp có)', disabled: true },
              ].map((item) => (
                <label
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: item.disabled ? 'not-allowed' : 'pointer',
                    opacity: item.disabled ? 0.5 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={options[item.key]}
                    onChange={() => !item.disabled && handleToggleOption(item.key)}
                    disabled={item.disabled}
                    style={{ accentColor: '#7B5233', width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#2D1A12' }}>{item.label}</span>
                </label>
              ))}
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSelectAll}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  border: '1px solid #7B5233',
                  borderRadius: '6px',
                  background: '#fff',
                  color: '#7B5233',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Chọn tất cả
              </button>
              <button
                onClick={handleDeselectAll}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  background: '#fff',
                  color: '#6B7280',
                  cursor: 'pointer',
                }}
              >
                Bỏ chọn tất cả
              </button>
            </div>
          </div>

          {/* 4. Chọn template */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: '12px' }}>
              Chọn template
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { value: 'standard', label: 'Standard', desc: 'Chuẩn, đầy đủ' },
                { value: 'detailed', label: 'Detailed', desc: 'Chi tiết, thống kê' },
                { value: 'minimal', label: 'Minimal', desc: 'Tối giản' },
              ].map((item) => (
                <label
                  key={item.value}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: templateStyle === item.value ? '2px solid #7B5233' : '1px solid #D1D5DB',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: templateStyle === item.value ? '#FAF6F0' : '#fff',
                    textAlign: 'center',
                  }}
                >
                  <input
                    type="radio"
                    name="templateStyle"
                    value={item.value}
                    checked={templateStyle === item.value}
                    onChange={(e) => setTemplateStyle(e.target.value)}
                    style={{ display: 'none' }}
                  />
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#2D1A12', marginBottom: '4px' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#8D6E63' }}>{item.desc}</div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #EADCC9',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 20px',
              fontSize: '0.85rem',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              background: '#fff',
              color: '#6B7280',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            Hủy
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            style={{
              padding: '10px 20px',
              fontSize: '0.85rem',
              border: 'none',
              borderRadius: '8px',
              background: loading ? '#D1D5DB' : '#7B5233',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {loading ? 'Đang xuất...' : 'Xuất file'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScreenExportDetailModal;
