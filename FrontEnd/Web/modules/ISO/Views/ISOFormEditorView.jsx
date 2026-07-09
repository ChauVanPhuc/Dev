import React, { useState, useEffect } from 'react';
import api from '@webShared/Services/api.service';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, FileText, GitBranch } from 'lucide-react';
import '@styles/components.css';

const ISOFormEditorView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const isProcessMode = false;
  const backPath = '/admin/iso-documents';
  const isEditMode = id && id !== 'new';

  const [formData, setFormData] = useState({
    id: null,
    code: '',
    name: '',
    version: '01',
    issue_date: new Date().toISOString().split('T')[0],
    issuer: '',
    approver: '',
    file_path: '',
    status: 'Dự thảo',
    folder: '',
    doc_type: '',
    document_level: '',
    revision_logs: [
      { seq_no: 1, rev_date: '', content: 'Ban hành lần đầu', page_no: 'Tất cả' }
    ],
    sections: {},
    section_types: {},
    steps: []
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (location.state && location.state.parsedData) {
      const parsed = location.state.parsedData;
      // Lấy nguyên danh sách sections từ parser – không thêm bớt
      const newSections = parsed.sections || {};
      const newSectionTypes = {};
      Object.keys(newSections).forEach(key => {
        newSectionTypes[key] = parsed.section_types?.[key] || 'text';
      });

      generateNextCode().then(nextCode => {
        setFormData(prev => ({
          ...prev,
          code: parsed.code || nextCode,
          name: parsed.name || '',
          version: parsed.version || '01',
          issue_date: parsed.issue_date || new Date().toISOString().split('T')[0],
          file_path: parsed.file_path || '',
          status: parsed.status || 'Hiệu lực',
          folder: parsed.folder || '',
          doc_type: parsed.doc_type || '',
          document_level: parsed.document_level || '',
          sections: newSections,
          section_types: newSectionTypes
        }));
      });
      showFeedback('success', 'Đã bóc tách tự động cấu trúc từ tài liệu Word thành công!');
    } else if (isEditMode) {
      fetchDocDetails();
    } else {
      generateNextCode().then(nextCode => {
        setFormData(prev => ({ ...prev, code: nextCode }));
      });
    }
  }, [id]);

  const generateNextCode = async () => {
    try {
      const data = await api.get('/iso-documents/');
      const count = (data || []).length + 1;
      return `G7.QT-${String(count).padStart(2, '0')}`;
    } catch (e) {
      return 'G7.QT-01';
    }
  };

  const fetchDocDetails = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/iso-documents/${id}/details`);
      const receivedSections = { ...(data.sections || {}) };
      let sectionTypes = {};

      if (receivedSections['__metadata_section_types__']) {
        try {
          sectionTypes = JSON.parse(receivedSections['__metadata_section_types__']);
        } catch (e) {
          console.error('Error parsing section types metadata:', e);
        }
        delete receivedSections['__metadata_section_types__'];
      }

      // Sections được lấy nguyên từ DB – không merge thêm key cố định

      Object.keys(receivedSections).forEach(key => {
        if (sectionTypes[key] === undefined) {
          sectionTypes[key] = 'text';
        }
      });

      setFormData({
        id: data.id,
        code: data.code || '',
        name: data.name || '',
        version: data.version || '01',
        issue_date: data.issue_date || '',
        issuer: data.issuer || '',
        approver: data.approver || '',
        file_path: data.file_path || '',
        status: data.status || 'Hiệu lực',
        folder: data.folder || data.display_at || '',
        doc_type: data.doc_type || data.notes || '',
        document_level: data.document_level || '',
        revision_logs: data.revision_logs || [],
        sections: receivedSections,
        section_types: sectionTypes,
        steps: data.steps || []
      });
    } catch (error) {
      console.error('Lỗi khi tải chi tiết mẫu ISO:', error);
      showFeedback('error', 'Không thể tải chi tiết mẫu ISO từ hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 4000);
  };

  const handleInputChange = (field, val) => {
    setFormData(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleSaveForm = async () => {
    if (!formData.code || !formData.name) {
      showFeedback('error', 'Vui lòng nhập đầy đủ Mã và Tên mẫu ISO');
      return;
    }

    setLoading(true);
    try {
      const finalPayload = {
        ...formData,
        display_at: formData.folder,
        notes: formData.doc_type,
        sections: {
          ...(formData.sections || {}),
          '__metadata_section_types__': JSON.stringify(formData.section_types || {})
        }
      };

      const res = await api.post('/iso-documents/save', finalPayload);
      showFeedback('success', res.message || 'Lưu Mẫu ISO thành công!');
      setTimeout(() => {
        navigate(backPath);
      }, 1000);
    } catch (error) {
      console.error('Lỗi khi lưu mẫu ISO:', error);
      showFeedback('error', error.response?.data?.detail || 'Lỗi hệ thống khi lưu trữ mẫu ISO');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1.5px solid #7B5233',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(123, 82, 51, 0.02)',
    marginBottom: '16px'
  };

  const headerStyle = {
    backgroundColor: '#FAF6F0',
    padding: '10px 14px',
    borderBottom: '1.5px solid #7B5233',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    userSelect: 'none'
  };

  const headerTextStyle = {
    fontWeight: 'bold',
    color: '#7B5233',
    fontSize: '0.84rem',
    textTransform: 'uppercase'
  };

  return (
    <div style={{
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '16px',
      color: '#2D1A12',
      backgroundColor: '#FAF8F5',
      minHeight: '100vh',
      width: '100%'
    }}>
      
      {/* Action Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        border: '1px solid #EADCC9',
        boxShadow: '0 2px 8px rgba(45, 26, 18, 0.02)',
        width: '100%'
      }}>
        <button
          onClick={() => navigate(backPath)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#7B5233',
            fontSize: '0.88rem',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>

        <button
          onClick={handleSaveForm}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#7B5233',
            color: 'white',
            border: 'none',
            padding: '8px 20px',
            borderRadius: '6px',
            fontSize: '0.88rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(123, 82, 51, 0.1)'
          }}
        >
          <Save size={16} /> {loading ? 'Đang lưu...' : 'Lưu Mẫu ISO'}
        </button>
      </div>

      {message.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.88rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: message.type === 'success' ? '#e6f4ea' : '#fce8e6',
          color: message.type === 'success' ? '#137333' : '#c5221f',
          border: `1px solid ${message.type === 'success' ? '#137333' : '#c5221f'}`,
          width: '100%'
        }}>
          <AlertCircle size={16} />
          <span>{message.text}</span>
        </div>
      )}

      {/* 1. Màn hình chính */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
        
        {/* Card: Thông tin Mẫu ISO */}
        <div style={cardStyle}>
          <div style={{ ...headerStyle, cursor: 'default' }}>
            <span style={headerTextStyle}>Thông tin Mẫu ISO</span>
          </div>
          
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #EADCC9' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Mã Mẫu</label>
                <input type="text" value={formData.code} readOnly style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed', fontWeight: '500' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Tên Mẫu ISO</label>
                <input type="text" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Ngày ban hành</label>
                <input type="date" value={formData.issue_date} onChange={(e) => handleInputChange('issue_date', e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Trạng thái</label>
                <select value={formData.status} onChange={(e) => handleInputChange('status', e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', backgroundColor: 'white', cursor: 'pointer' }}>
                  <option value="Hiệu lực">Đang hoạt động</option>
                  <option value="Hết hiệu lực">Hết hiệu lực</option>
                  <option value="Dự thảo">Dự thảo</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Hiển thị tại</label>
                <input type="text" value={formData.folder} onChange={(e) => handleInputChange('folder', e.target.value)} placeholder="Màn hình hiển thị..." style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Cấp tài liệu (Chọn 1 hoặc nhiều)</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                  {['Cấp 1', 'Cấp 2', 'Cấp 3', 'Cấp 4'].map(lvl => {
                    const selectedList = formData.document_level ? formData.document_level.split(',').map(s => s.trim()) : [];
                    const isSelected = selectedList.includes(lvl);
                    const handleToggle = () => {
                      let newList;
                      if (isSelected) {
                        newList = selectedList.filter(x => x !== lvl);
                      } else {
                        newList = [...selectedList, lvl];
                      }
                      handleInputChange('document_level', newList.filter(Boolean).join(', '));
                    };
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={handleToggle}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          border: isSelected ? '1.5px solid #7B5233' : '1.5px solid #cbd5e1',
                          backgroundColor: isSelected ? '#FAF6F0' : 'white',
                          color: isSelected ? '#7B5233' : '#64748b',
                          fontSize: '0.78rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          outline: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.borderColor = '#7B5233';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.borderColor = '#cbd5e1';
                        }}
                      >
                        {lvl} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Ghi chú</label>
              <textarea value={formData.doc_type} onChange={(e) => handleInputChange('doc_type', e.target.value)} rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
            </div>
        </div>
      </div>

        {/* Card: Nội dung quy trình */}
        <div style={cardStyle}>
          <div style={{ ...headerStyle, cursor: 'default' }}>
            <span style={headerTextStyle}>Cấu hình loại dữ liệu các đề mục</span>
          </div>
          
          <div style={{
            padding: '20px',
            backgroundColor: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            borderTop: '1px solid #EADCC9'
          }}>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.78rem', color: '#64748b', lineHeight: '1.4' }}>
              Thiết lập định dạng cho từng đề mục trong Mẫu ISO. Quy trình được tạo từ mẫu này sẽ tự động áp dụng cấu hình tương ứng (Soạn thảo văn bản hoặc Vẽ sơ đồ lưu trình).
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px'
            }}>
              {Object.keys(formData.sections || {})
                .filter(key => !key.startsWith('__'))
                .map((sectionId, sIdx) => {
                  const currentType = formData.section_types?.[sectionId] || 'text';
                  return (
                    <div
                      key={sIdx}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        backgroundColor: '#FAF8F5',
                        border: '1px solid #EADCC9',
                        borderRadius: '6px',
                        transition: 'all 0.2s',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '4px',
                          backgroundColor: '#FAF6F0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #7B5233',
                          flexShrink: 0
                        }}>
                          {currentType === 'flowchart' ? (
                            <GitBranch size={14} style={{ color: '#7B5233' }} />
                          ) : (
                            <FileText size={14} style={{ color: '#7B5233' }} />
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#2D1A12', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {`${sIdx + 1}. ${sectionId}`}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #EADCC9', paddingTop: '8px' }}>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Định dạng:</span>
                        <select
                          value={currentType}
                          onChange={(e) => {
                            const type = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              section_types: {
                                ...(prev.section_types || {}),
                                [sectionId]: type
                              }
                            }));
                          }}
                          style={{
                            fontSize: '0.74rem',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            color: '#7B5233',
                            outline: 'none',
                            fontWeight: 'bold',
                            width: '110px'
                          }}
                        >
                          <option value="text">Văn bản</option>
                          <option value="flowchart">Lưu trình</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ISOFormEditorView;
