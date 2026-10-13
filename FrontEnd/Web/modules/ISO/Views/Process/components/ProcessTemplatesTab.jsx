import api from '@webShared/Services/api.service';
import {
  Plus, Trash2, Edit, Upload, Eye, FileText, Settings, Download
} from 'lucide-react';

const ProcessTemplatesTab = ({ editor }) => {
  const {
    activeTab, formData, handleAddRelatedTemplate, handleDeleteAttachment,
    handleDeleteRelatedTemplate, handleOpenSystemTemplatesModal, handleUpdateRelatedTemplate, handleUploadAttachment,
    selectedTemplateId, setSelectedTemplateId, systemScreens,
  } = editor;

  return (
    <>
            <div style={{ display: 'flex', gap: '20px', minHeight: '520px', width: '100%' }}>
              
              {/* CỘT TRÁI: DANH SÁCH TÀI LIỆU LIÊN QUAN (RỘNG 22%) */}
              <div style={{
                width: '22%',
                backgroundColor: 'white',
                border: '1px solid #EADCC9',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(45, 26, 18, 0.02)'
              }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#7B5233', margin: '0 0 8px 0' }}>
                  Danh sách tài liệu liên quan
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', maxHeight: '420px' }}>
                  {(formData.related_templates || []).map((t) => {
                    const isSelected = selectedTemplateId === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTemplateId(t.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#FAF6F0' : 'transparent',
                          color: isSelected ? '#7B5233' : '#64748b',
                          fontWeight: isSelected ? '700' : '500',
                          fontSize: '0.82rem',
                          border: isSelected ? '1px solid #EADCC9' : '1px solid transparent',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>
                          {t.code} - {t.title}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Bạn có chắc muốn xóa tài liệu liên quan "${t.code} - ${t.title}"?`)) {
                              handleDeleteRelatedTemplate(t.id);
                            }
                          }}
                          style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            padding: '2px'
                          }}
                          title="Xóa tài liệu"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                  
                  {(formData.related_templates || []).length === 0 && (
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                      Chưa có tài liệu liên quan.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddRelatedTemplate}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: '1px dashed #7B5233',
                    color: '#7B5233',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginTop: '8px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Plus size={14} /> Thêm tài liệu mới
                </button>
              </div>

              {/* CỘT PHẢI: CHI TIẾT CẤU HÌNH TÀI LIỆU ĐANG CHỌN (RỘNG 78%) */}
              <div style={{
                flex: 1,
                backgroundColor: 'white',
                border: '1px solid #EADCC9',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 2px 8px rgba(45, 26, 18, 0.02)'
              }}>
                {(() => {
                  const selectedT = (formData.related_templates || []).find(t => t.id === selectedTemplateId);
                  if (!selectedT) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        Vui lòng chọn hoặc thêm một tài liệu liên quan từ cột bên trái để bắt đầu cấu hình.
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Grid form inputs */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>
                            Mã biểu mẫu <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          {(() => {
                            const procCodePrefix = formData.code ? `${formData.code}_` : 'QT_';
                            let currentSuffix = selectedT.code || '';
                            if (selectedT.code && selectedT.code.startsWith(procCodePrefix)) {
                              currentSuffix = selectedT.code.slice(procCodePrefix.length);
                            } else if (selectedT.code && formData.code && selectedT.code.startsWith(`${formData.code}_`)) {
                              currentSuffix = selectedT.code.slice(`${formData.code}_`.length);
                            }

                            const handleSuffixChange = (e) => {
                              let val = e.target.value.replace(/^[\s_]+/, '');
                              const newFullCode = `${procCodePrefix}${val}`;
                              handleUpdateRelatedTemplate(selectedT.id, 'code', newFullCode);
                            };

                            return (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                                  <span style={{
                                    backgroundColor: '#FAF6F0',
                                    color: '#7B5233',
                                    padding: '8px 10px',
                                    border: '1px solid #cbd5e1',
                                    borderRight: 'none',
                                    borderTopLeftRadius: '6px',
                                    borderBottomLeftRadius: '6px',
                                    fontSize: '0.85rem',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    userSelect: 'none',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {procCodePrefix}
                                  </span>
                                  <input
                                    type="text"
                                    value={currentSuffix}
                                    onChange={handleSuffixChange}
                                    placeholder="BM01..."
                                    style={{
                                      flex: 1,
                                      padding: '8px 12px',
                                      border: '1px solid #cbd5e1',
                                      borderTopRightRadius: '6px',
                                      borderBottomRightRadius: '6px',
                                      fontSize: '0.85rem',
                                      color: '#1e293b',
                                      outline: 'none'
                                    }}
                                  />
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                                  Mã đầy đủ: <strong style={{ color: '#7B5233' }}>{selectedT.code || `${procCodePrefix}...`}</strong>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>
                            Tên biểu mẫu <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={selectedT.title || ''}
                            onChange={(e) => handleUpdateRelatedTemplate(selectedT.id, 'title', e.target.value)}
                            placeholder="Nhập tên biểu mẫu..."
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              color: '#1e293b',
                              outline: 'none'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>
                            Phạm vi áp dụng
                          </label>
                          <select
                            value={selectedT.scope || 'Tất cả'}
                            onChange={(e) => handleUpdateRelatedTemplate(selectedT.id, 'scope', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              color: '#1e293b',
                              backgroundColor: 'white',
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="Tất cả">Tất cả</option>
                            {(systemScreens || []).map(s => (
                              <option key={s.route_path} value={s.screen_name || s.title}>
                                {s.screen_name || s.title} ({s.route_path})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Ghi chú */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>
                          Ghi chú
                        </label>
                        <textarea
                          value={selectedT.note || ''}
                          onChange={(e) => handleUpdateRelatedTemplate(selectedT.id, 'note', e.target.value)}
                          placeholder="Nhập ghi chú thêm..."
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            color: '#1e293b',
                            outline: 'none',
                            resize: 'vertical',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>

                      {/* File attachment upload area */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>
                          Tài liệu đính kèm
                        </label>
                        
                        {selectedT.file_path ? (
                          /* If file is attached */
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            border: '1px solid #EADCC9',
                            borderRadius: '8px',
                            backgroundColor: '#FAF6F0'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <FileText size={20} style={{ color: '#7B5233' }} />
                              <div>
                                <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#2d1a12', display: 'block' }}>
                                  {selectedT.file_name || selectedT.file_path.split('/').pop()}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                  Đã tải lên hệ thống
                                </span>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <a
                                href={selectedT.doc_id 
                                  ? `${api.defaults.baseURL.replace(/\/$/, '')}/iso-documents/${selectedT.doc_id}/download-raw`
                                  : `${api.defaults.baseURL.replace('/api/v1', '')}/${selectedT.file_path}`}
                                target="_blank"
                                rel="noreferrer"
                                download
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#7B5233',
                                  color: 'white',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Download size={12} /> Tải xuống
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteAttachment(selectedT.id)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#fee2e2',
                                  color: '#ef4444',
                                  border: '1px solid #fee2e2',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                ✕ Xóa file
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* If NO file is attached - Upload Area */
                          <div
                            onClick={() => document.getElementById(`file-upload-input-${selectedT.id}`).click()}
                            style={{
                              border: '2px dashed #cbd5e1',
                              borderRadius: '8px',
                              padding: '24px',
                              textAlign: 'center',
                              cursor: 'pointer',
                              backgroundColor: '#f8fafc',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#7B5233'; e.currentTarget.style.backgroundColor = '#FAF6F0'; }}
                            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                          >
                            <input
                              type="file"
                              id={`file-upload-input-${selectedT.id}`}
                              style={{ display: 'none' }}
                              accept=".pdf,.doc,.docx,.xlsx,.xls"
                              onChange={(e) => handleUploadAttachment(e, selectedT.id)}
                            />
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
                                Tải file từ máy (chấp nhận file PDF, Word .docx, Excel .xlsx)
                              </span>
                              <Upload size={16} style={{ color: '#64748b' }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
    </>
  );
};

export default ProcessTemplatesTab;
