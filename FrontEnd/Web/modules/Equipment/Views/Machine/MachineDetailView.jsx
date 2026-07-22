import React, { useState, useEffect } from 'react';
import api, { getBaseURL } from '@webShared/Services/api.service';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Edit, FileText, X, Plus, Download, Trash2, ChevronDown, ChevronRight, Settings, Eye, Check, Upload, Camera
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import '@styles/components.css';

const MachineDetailView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  
  // Lấy metadata từ database thay vì hardcode
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/machines/:id');
  const navigate = useNavigate();
  const { id } = useParams();

  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const setMessage = (msg) => {
    if (msg && msg.text) {
      toast(msg.type, msg.text);
    }
  };

  // Accordion Expand/Collapse States
  const [expandedSection, setExpandedSection] = useState({
    history: false,
    instruction: false,
    manual: false
  });

  // Document Lists
  const [documents, setDocuments] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState({}); // { docId: true/false }
  
  // Dropdown action menus for file items
  const [activeFileMenuId, setActiveFileMenuId] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageError, setImageError] = useState({});
  const avatarInputRef = React.useRef(null);

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      try {
        await api.put(`/machines/${id}`, { ...machine, images: base64Data });
        setMachine(prev => ({ ...prev, images: base64Data }));
        setImageError({});
        setMessage({ type: 'success', text: 'Đã cập nhật ảnh máy móc thành công.' });
      } catch (err) {
        console.error('Lỗi cập nhật ảnh máy:', err);
        setMessage({ type: 'error', text: 'Không thể cập nhật ảnh máy.' });
      }
    };
    reader.readAsDataURL(file);
  };



  const loadMachineData = async () => {
    setLoading(true);
    try {
      const macData = await api.get(`/machines/${id}`);
      setMachine(macData);

      // Load all documents for this machine
      const docsData = await api.get(`/machines/${id}/documents`);
      setDocuments(Array.isArray(docsData) ? docsData : []);
    } catch (error) {
      console.error('Lỗi khi tải thông tin chi tiết máy:', error);
      setMessage({ type: 'error', text: 'Không thể tải dữ liệu máy.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadMachineData();
    }
  }, [id]);

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #7B5233', borderTopColor: 'transparent', borderRadius: '50%', animation: 'mgmtSpin 1s linear infinite', margin: '0 auto 15px auto' }} />
        Đang tải hồ sơ máy móc...
      </div>
    );
  }

  if (!machine) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h4 style={{ color: '#ef4444' }}>Không tìm thấy thông tin máy móc này</h4>
        <button className="btn-primary" style={{ marginTop: '20px', backgroundColor: '#7B5233' }} onClick={() => navigate('/admin/machines')}>
          Quay lại danh sách máy móc
        </button>
      </div>
    );
  }

  // Group documents by category
  const docsByCat = {
    maintenance_history: documents.filter(d => d.category === 'maintenance_history'),
    maintenance_instruction: documents.filter(d => d.category === 'maintenance_instruction'),
    user_manual: documents.filter(d => d.category === 'user_manual')
  };

  // Toggle Section
  const toggleSection = (sectionName) => {
    setExpandedSection(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Handle Document Selection Checkbox
  const handleDocCheckbox = (docId) => {
    setSelectedDocs(prev => ({
      ...prev,
      [docId]: !prev[docId]
    }));
  };

  // Select all inside a category
  const handleSelectAllCategory = (category, isChecked) => {
    const catDocs = docsByCat[category] || [];
    const nextSelections = { ...selectedDocs };
    catDocs.forEach(d => {
      nextSelections[d.id] = isChecked;
    });
    setSelectedDocs(nextSelections);
  };

  // Handle File Upload Trigger
  const triggerFileUpload = (category) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const token = localStorage.getItem('token');
      try {
        await axios.post(
          `${getBaseURL()}/api/v1/machines/${id}/documents?category=${category}`,
          uploadFormData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
          }
        );
        setMessage({ type: 'success', text: `Đã tải lên tệp "${file.name}" thành công.` });
        
        // Reload documents
        const docsData = await api.get(`/machines/${id}/documents`);
        setDocuments(Array.isArray(docsData) ? docsData : []);
      } catch (err) {
        console.error('Upload document error:', err);
        setMessage({ type: 'error', text: 'Có lỗi xảy ra khi tải lên tài liệu đính kèm.' });
      }
    };
    input.click();
  };

  // Handle Single File Download
  const handleDownloadFile = (doc) => {
    const link = document.createElement('a');
    link.href = getBaseURL() + doc.file_path;
    link.download = doc.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Batch Download Selected in a Category
  const handleBatchDownload = (category) => {
    const catDocs = docsByCat[category] || [];
    const selectedCatDocs = catDocs.filter(d => selectedDocs[d.id]);
    
    if (selectedCatDocs.length === 0) {
      toast('warning', 'Vui lòng chọn ít nhất một tệp để tải xuống.');
      return;
    }

    selectedCatDocs.forEach(doc => {
      handleDownloadFile(doc);
    });
  };

  // Handle File Delete
  const handleDeleteFile = async (doc) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa tệp đính kèm "${doc.file_name}"?`)) {
      try {
        await api.delete(`/machines/documents/${doc.id}`);
        setMessage({ type: 'success', text: `Đã xóa tệp "${doc.file_name}" thành công.` });
        
        // Reload documents
        const docsData = await api.get(`/machines/${id}/documents`);
        setDocuments(Array.isArray(docsData) ? docsData : []);
      } catch (err) {
        console.error(err);
        setMessage({ type: 'error', text: 'Không thể xóa tài liệu đính kèm.' });
      }
    }
  };

  // Helper scroll down to documents zone
  const scrollToDocuments = () => {
    const element = document.getElementById("machine-docs-accordions");
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      // Open all sections
      setExpandedSection({
        history: true,
        instruction: true,
        manual: true
      });
    }
  };

  // Accordion Document Table component
  const renderDocumentTable = (category) => {
    const catDocs = docsByCat[category] || [];
    const isAllSelected = catDocs.length > 0 && catDocs.every(d => selectedDocs[d.id]);

    return (
      <div style={{ padding: '15px', backgroundColor: '#fff', borderTop: '1px solid #E5E7EB' }}>
        {/* Table Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '12px' }}>
          <button 
            onClick={() => handleBatchDownload(category)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
              backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '6px',
              fontSize: '12px', fontWeight: '700', cursor: 'pointer'
            }}
          >
            <Download size={13} /> Tải xuống
          </button>
          <button 
            onClick={() => triggerFileUpload(category)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
              backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '6px',
              fontSize: '12px', fontWeight: '700', cursor: 'pointer'
            }}
          >
            <Plus size={13} /> Thêm mới
          </button>
        </div>

        {/* File Table matching Mockup 3 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #EADCC9' }}>
          <thead>
            <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9' }}>
              <th style={{ width: '60px', padding: '10px', textAlign: 'center', borderRight: '1px solid #EADCC9' }}>
                <input 
                  type="checkbox" 
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAllCategory(category, e.target.checked)}
                  style={{ accentColor: '#7B5233', width: '15px', height: '15px', cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '10px 15px', textAlign: 'left', fontWeight: '800', fontSize: '13px', color: '#7B5233', borderRight: '1px solid #EADCC9' }}>Tên File</th>
              <th style={{ padding: '10px 15px', textAlign: 'left', fontWeight: '800', fontSize: '13px', color: '#7B5233', borderRight: '1px solid #EADCC9' }}>Ngày cập nhật</th>
              <th style={{ width: '80px', padding: '10px', textAlign: 'center', fontWeight: '800', fontSize: '13px', color: '#7B5233' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {catDocs.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#7B5233', fontSize: '13px', backgroundColor: '#fff' }}>
                  Chưa có tài liệu đính kèm nào trong mục này. Nhấn "Thêm mới" để tải lên.
                </td>
              </tr>
            ) : (
              catDocs.map((doc) => (
                <tr key={doc.id} style={{ borderBottom: '1px solid #EADCC9', backgroundColor: '#fff' }}>
                  <td style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid #EADCC9' }}>
                    <input 
                      type="checkbox" 
                      checked={!!selectedDocs[doc.id]}
                      onChange={() => handleDocCheckbox(doc.id)}
                      style={{ accentColor: '#7B5233', width: '15px', height: '15px', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '10px 15px', fontSize: '13px', color: '#7B5233', borderRight: '1px solid #EADCC9', fontWeight: '600' }}>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); handleDownloadFile(doc); }}
                      style={{ color: '#7B5233', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <FileText size={15} />
                      {doc.file_name}
                    </a>
                  </td>
                  <td style={{ padding: '10px 15px', fontSize: '13px', color: '#7B5233', borderRight: '1px solid #EADCC9' }}>
                    {doc.upload_date || '—'}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', position: 'relative' }} className="file-actions-container">
                    <button 
                      onClick={() => setActiveFileMenuId(activeFileMenuId === doc.id ? null : doc.id)}
                      style={{
                        background: '#FAF6F0', border: '1px solid #EADCC9', color: '#7B5233',
                        borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontWeight: 'bold'
                      }}
                    >
                      ...
                    </button>
                    {activeFileMenuId === doc.id && (
                      <div style={{
                        position: 'absolute', right: '10px', top: '100%', backgroundColor: '#fff',
                        border: '1px solid #EADCC9', borderRadius: '6px', zIndex: 10,
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '5px 0', minWidth: '110px'
                      }}>
                        <div 
                          onClick={() => { setActiveFileMenuId(null); handleDownloadFile(doc); }}
                          style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', textAlign: 'left', fontWeight: '600', color: '#7B5233' }}
                          className="dropdown-hover"
                        >
                          Tải xuống
                        </div>
                        <div 
                          onClick={() => { setActiveFileMenuId(null); handleDeleteFile(doc); }}
                          style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', textAlign: 'left', color: '#ef4444', fontWeight: '600' }}
                          className="dropdown-hover"
                        >
                          Xóa
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const fieldLabelStyle = { fontSize: '12px', fontWeight: '800', color: '#7B5233', textTransform: 'uppercase', display: 'block', marginBottom: '4px' };
  const fieldInputStyle = { 
    width: '100%', padding: '8px 12px', border: '1.5px solid #EADCC9', 
    borderRadius: '8px', outline: 'none', backgroundColor: '#FAF6F0', 
    color: '#7B5233', fontWeight: '600', fontSize: '13px'
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      


      {/* Section 1: Main Machinery Info */}
      <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '2.5px solid #7B5233', backgroundColor: '#fff' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '900', color: '#7B5233', borderBottom: '2.5px solid #7B5233', paddingBottom: '10px' }}>
          Thông tin thiết bị
        </h3>

        <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Column Left: Large Circular Avatar with Thumbnails & Upload Trigger */}
          {(() => {
            const parseImages = (imagesStr) => {
              if (!imagesStr || !imagesStr.trim()) return [];
              let list = [];
              try {
                const parsed = JSON.parse(imagesStr);
                if (Array.isArray(parsed)) list = parsed;
                else if (typeof parsed === 'string') list = [parsed];
              } catch {
                if (imagesStr.includes(',')) {
                  list = imagesStr.split(',');
                } else {
                  list = [imagesStr];
                }
              }
              return list
                .map(item => String(item).trim())
                .filter(item => item && item !== 'null' && item !== 'undefined' && item !== 'none')
                .map(item => (item.startsWith('/') && !item.startsWith('//')) ? getBaseURL() + item : item);
            };

            const activeImages = parseImages(machine.images);
            const currentImgSrc = activeImages[activeImageIndex] || activeImages[0];
            const hasValidImage = activeImages.length > 0 && currentImgSrc && !imageError[currentImgSrc];

            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '130px', flexShrink: 0 }}>
                <input 
                  type="file" 
                  ref={avatarInputRef} 
                  accept="image/*" 
                  onChange={handleAvatarUpload} 
                  style={{ display: 'none' }} 
                />
                <div 
                  onClick={() => avatarInputRef.current?.click()}
                  title="Nhấp để tải lên / đổi ảnh máy"
                  style={{
                    width: '120px', height: '120px', borderRadius: '60px', backgroundColor: '#7B5233',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '48px', fontWeight: '800', overflow: 'hidden',
                    position: 'relative', cursor: 'pointer', border: '3px solid #EADCC9',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                  }}
                >
                  {hasValidImage ? (
                    <img 
                      src={currentImgSrc} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      alt={machine.name || ''} 
                      onError={() => {
                        setImageError(prev => ({ ...prev, [currentImgSrc]: true }));
                      }}
                    />
                  ) : (
                    <span>{machine.name ? machine.name.charAt(0).toUpperCase() : 'M'}</span>
                  )}

                  {/* Camera overlay */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '30px',
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#fff'
                  }}>
                    <Camera size={14} />
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  style={{
                    border: 'none', background: 'none', color: '#7B5233', fontSize: '11px',
                    fontWeight: '800', cursor: 'pointer', textDecoration: 'underline'
                  }}
                >
                  Tải ảnh máy lên
                </button>

                {activeImages.length > 1 && (
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
                    {activeImages.map((imgUrl, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setActiveImageIndex(idx)}
                        style={{ 
                          width: '32px', height: '32px', borderRadius: '6px', overflow: 'hidden', 
                          border: idx === activeImageIndex ? '2px solid #7B5233' : '1px solid #cbd5e1',
                          cursor: 'pointer', transition: 'all 0.2s ease', opacity: idx === activeImageIndex ? 1 : 0.7
                        }}
                      >
                        <img src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Column Right: Field Grids */}
          <div style={{ flex: 1, minWidth: '350px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px 30px' }}>
              <div style={{ gridColumn: 'span 3' }}>
                <label style={fieldLabelStyle}>Mã máy</label>
                <input type="text" readOnly value={machine.code || ''} style={fieldInputStyle} />
              </div>
              <div style={{ gridColumn: 'span 6' }}>
                <label style={fieldLabelStyle}>Tên máy</label>
                <input type="text" readOnly value={machine.name || ''} style={fieldInputStyle} />
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <label style={fieldLabelStyle}>Trạng thái</label>
                <input type="text" readOnly value={machine.status || 'Bình thường'} style={fieldInputStyle} />
              </div>
              
              <div style={{ gridColumn: 'span 3' }}>
                <label style={fieldLabelStyle}>Nhà máy</label>
                <input type="text" readOnly value={machine.factory || ''} style={fieldInputStyle} />
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <label style={fieldLabelStyle}>Xưởng</label>
                <input type="text" readOnly value={machine.workshop || ''} style={fieldInputStyle} />
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <label style={fieldLabelStyle}>Bộ phận</label>
                <input type="text" readOnly value={machine.department || ''} style={fieldInputStyle} />
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <label style={fieldLabelStyle}>Ngày nhận máy</label>
                <input type="text" readOnly value={machine.receive_date || ''} style={fieldInputStyle} />
              </div>

              <div style={{ gridColumn: 'span 4' }}>
                <label style={fieldLabelStyle}>Xuất xứ</label>
                <input type="text" readOnly value={machine.origin || ''} style={fieldInputStyle} />
              </div>
              <div style={{ gridColumn: 'span 4' }}>
                <label style={fieldLabelStyle}>Nhà cung cấp</label>
                <input type="text" readOnly value={machine.supplier || ''} style={fieldInputStyle} />
              </div>
              <div style={{ gridColumn: 'span 4', display: 'flex', alignItems: 'flex-end' }}>
                <button 
                  onClick={scrollToDocuments}
                  style={{
                    width: '100%', padding: '8px 12px', backgroundColor: '#7B5233', color: '#FFF',
                    border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px',
                    cursor: 'pointer', transition: 'background 0.2s', textTransform: 'uppercase',
                    textAlign: 'center', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(123, 82, 51, 0.2)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5c3924'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B5233'}
                >
                  Danh sách chứng từ liên quan
                </button>
              </div>

              <div style={{ gridColumn: 'span 4' }}>
                <label style={fieldLabelStyle}>Tần suất bảo trì</label>
                <input type="text" readOnly value={machine.maintenance_cycle ? `${machine.maintenance_cycle} ngày` : '—'} style={fieldInputStyle} />
              </div>
              <div style={{ gridColumn: 'span 4' }}>
                <label style={fieldLabelStyle}>Ngày bảo trì dự kiến</label>
                <input type="text" readOnly value={machine.next_maintenance_date || ''} style={fieldInputStyle} />
              </div>
              <div style={{ gridColumn: 'span 4' }}>
                <label style={fieldLabelStyle}>Ngày đã bảo trì gần nhất</label>
                <input type="text" readOnly value={machine.last_maintenance_date || ''} style={fieldInputStyle} />
              </div>

              <div style={{ gridColumn: 'span 12' }}>
                <label style={fieldLabelStyle}>Ghi chú</label>
                <textarea 
                  readOnly 
                  rows="3" 
                  value={machine.notes || 'Không có ghi chú nào.'} 
                  style={{...fieldInputStyle, height: 'auto', resize: 'none'}} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Accordions stacking */}
      <div id="machine-docs-accordions" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {/* Accordion 1: Lịch sử Bảo trì */}
        <div style={{ border: '2.5px solid #7B5233', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
          <div 
            onClick={() => toggleSection('history')}
            style={{
              padding: '12px 20px', backgroundColor: '#FAF6F0', color: '#7B5233',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontWeight: '900', fontSize: '14px', cursor: 'pointer', userSelect: 'none',
              borderBottom: expandedSection.history ? '2.5px solid #7B5233' : 'none'
            }}
          >
            <span>Lịch sử Bảo trì</span>
            {expandedSection.history ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
          {expandedSection.history && renderDocumentTable('maintenance_history')}
        </div>

        {/* Accordion 2: Hướng dẫn bảo trì */}
        <div style={{ border: '2.5px solid #7B5233', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
          <div 
            onClick={() => toggleSection('instruction')}
            style={{
              padding: '12px 20px', backgroundColor: '#FAF6F0', color: '#7B5233',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontWeight: '900', fontSize: '14px', cursor: 'pointer', userSelect: 'none',
              borderBottom: expandedSection.instruction ? '2.5px solid #7B5233' : 'none'
            }}
          >
            <span>Hướng dẫn bảo trì</span>
            {expandedSection.instruction ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
          {expandedSection.instruction && renderDocumentTable('maintenance_instruction')}
        </div>

        {/* Accordion 3: Hướng dẫn sử dụng */}
        <div style={{ border: '2.5px solid #7B5233', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
          <div 
            onClick={() => toggleSection('manual')}
            style={{
              padding: '12px 20px', backgroundColor: '#FAF6F0', color: '#7B5233',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontWeight: '900', fontSize: '14px', cursor: 'pointer', userSelect: 'none',
              borderBottom: expandedSection.manual ? '2.5px solid #7B5233' : 'none'
            }}
          >
            <span>Hướng dẫn sử dụng</span>
            {expandedSection.manual ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
          {expandedSection.manual && renderDocumentTable('user_manual')}
        </div>
      </div>
    </div>
  );
};

export default MachineDetailView;
