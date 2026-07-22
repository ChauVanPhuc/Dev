import React from 'react';
import { ChevronDown, Upload, FileText, X } from 'lucide-react';
import { getBaseURL } from '@webShared/Services/api.service';

const InspectorPane = ({
  activeTab,
  screen,
  setScreen,
  selectedGuideIdx,
  setSelectedGuideIdx,
  isGuideCompDropdownOpen,
  setIsGuideCompDropdownOpen,
  activeComponent,
  viewMode,
  setViewMode,
  specDescriptions,
  setSpecDescriptions,
  isSpecCardCollapsed,
  setIsSpecCardCollapsed,
  specFileInputRef,
  handleSpecSampleFileChange,
  isSpecUploadingSample,
  specSampleFileUrl,
  setSpecSampleFileUrl,
  specExportData,
  setSpecExportData,
  isSpecExporting,
  handleSpecExportTest,
  showToast
}) => {
  return (
    <div className="card detail-inspector-pane" style={{
      padding: '16px'
    }}>
      {activeTab === 'guides' ? (
        <>
          <div style={{ borderBottom: '1px solid #CBD5E1', paddingBottom: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#2D1A12', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Thông tin đặc tả
            </span>
          </div>
          {screen.guides && screen.guides.length > 0 && selectedGuideIdx >= 0 && selectedGuideIdx < screen.guides.length ? (
            (() => {
              const currentStep = screen.guides[selectedGuideIdx];
              const selectedComps = currentStep.related_components ? currentStep.related_components.split(',').map(c => c.trim()).filter(Boolean) : [];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 280px', gap: '16px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.75rem', display: 'block', marginBottom: '6px' }}>Bước</label>
                      <select
                        value={currentStep.step_number}
                        onChange={(e) => {
                          const newNum = parseInt(e.target.value);
                          setScreen(prev => {
                            const list = [...(prev.guides || [])];
                            const targetIdx = newNum - 1;
                            const sourceIdx = selectedGuideIdx;
                            const [removed] = list.splice(sourceIdx, 1);
                            list.splice(targetIdx, 0, removed);
                            list.forEach((item, i) => { item.step_number = i + 1; });
                            return { ...prev, guides: list };
                          });
                          setSelectedGuideIdx(newNum - 1);
                        }}
                        style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 10px', fontSize: '0.8rem', outline: 'none', backgroundColor: '#fff', height: '34px', boxSizing: 'border-box' }}
                      >
                        {(screen.guides || []).map((_, i) => (
                          <option key={i + 1} value={i + 1}>Bước {i + 1}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="required" style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.75rem', display: 'block', marginBottom: '6px' }}>Tên nội dung *</label>
                      <input
                        type="text"
                        value={currentStep.title || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setScreen(prev => {
                            const list = [...(prev.guides || [])];
                            list[selectedGuideIdx] = { ...list[selectedGuideIdx], title: val };
                            return { ...prev, guides: list };
                          });
                        }}
                        placeholder="Tên nội dung / hành động..."
                        required
                        style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 10px', fontSize: '0.8rem', boxSizing: 'border-box', outline: 'none', backgroundColor: '#fff', height: '34px' }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                      <label style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.75rem', display: 'block', marginBottom: '6px' }}>Các thành phần liên quan</label>
                      <div
                        onClick={() => setIsGuideCompDropdownOpen(!isGuideCompDropdownOpen)}
                        style={{
                          width: '100%',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          backgroundColor: '#FFF',
                          cursor: 'pointer',
                          minHeight: '34px',
                          boxSizing: 'border-box',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1 }}>
                          {selectedComps.length > 0 ? (
                            selectedComps.map(c => (
                              <span
                                key={c}
                                style={{
                                  backgroundColor: '#FAF6F0',
                                  border: '1px solid #EADCC9',
                                  color: '#7B5233',
                                  borderRadius: '4px',
                                  padding: '2px 6px',
                                  fontSize: '0.72rem',
                                  fontWeight: 'bold',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                {c}
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const filtered = selectedComps.filter(item => item !== c);
                                    const newVal = filtered.join(', ');
                                    setScreen(prev => {
                                      const list = [...(prev.guides || [])];
                                      list[selectedGuideIdx] = { ...list[selectedGuideIdx], related_components: newVal };
                                      return { ...prev, guides: list };
                                    });
                                  }}
                                  style={{ cursor: 'pointer', color: '#A1826F', fontSize: '0.65rem' }}
                                >
                                  ✕
                                </span>
                              </span>
                            ))
                          ) : (
                            <span style={{ color: '#94A3B8' }}>Chọn các thành phần liên quan...</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{isGuideCompDropdownOpen ? '▲' : '▼'}</span>
                      </div>

                      {isGuideCompDropdownOpen && (
                        <>
                          <div
                            onClick={() => setIsGuideCompDropdownOpen(false)}
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 990 }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              backgroundColor: '#fff',
                              border: '1px solid #E2E8F0',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              zIndex: 995,
                              maxHeight: '180px',
                              overflowY: 'auto',
                              marginTop: '4px',
                              padding: '6px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px'
                            }}
                          >
                            {screen.components && screen.components.length > 0 ? (
                              screen.components.map(comp => {
                                const isChecked = selectedComps.includes(comp.name);
                                return (
                                  <div
                                    key={comp.id}
                                    onClick={() => {
                                      let updated;
                                      if (isChecked) {
                                        updated = selectedComps.filter(item => item !== comp.name);
                                      } else {
                                        updated = [...selectedComps, comp.name];
                                      }
                                      const newVal = updated.join(', ');
                                      setScreen(prev => {
                                        const list = [...(prev.guides || [])];
                                        list[selectedGuideIdx] = { ...list[selectedGuideIdx], related_components: newVal };
                                        return { ...prev, guides: list };
                                      });
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isChecked) e.currentTarget.style.backgroundColor = '#FAF6F0';
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'flex-start',
                                      gap: '10px',
                                      padding: '8px 12px',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '0.78rem',
                                      userSelect: 'none',
                                      backgroundColor: isChecked ? '#FAF6F0' : 'transparent',
                                      color: isChecked ? '#7B5233' : '#334155',
                                      fontWeight: isChecked ? 'bold' : 'normal',
                                      width: '100%',
                                      boxSizing: 'border-box',
                                      textAlign: 'left',
                                      transition: 'background-color 0.2s ease'
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      readOnly
                                      style={{ cursor: 'pointer', margin: 0, width: '16px', height: '16px', flexShrink: 0 }}
                                    />
                                    <span style={{ textAlign: 'left', display: 'inline-block' }}>{comp.name}</span>
                                  </div>
                                );
                              })
                            ) : (
                              <div style={{ padding: '8px', color: '#94A3B8', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                Không có component nào.
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.75rem', display: 'block', marginBottom: '6px' }}>Mô tả chi tiết</label>
                    <textarea
                      rows="4"
                      value={currentStep.description || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setScreen(prev => {
                          const list = [...(prev.guides || [])];
                          list[selectedGuideIdx] = { ...list[selectedGuideIdx], description: val };
                          return { ...prev, guides: list };
                        });
                      }}
                      placeholder="Mô tả chi tiết hành động hoặc hướng dẫn của bước..."
                      style={{
                        width: '100%',
                        fontSize: '0.8rem',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '10px',
                        boxSizing: 'border-box',
                        outline: 'none',
                        backgroundColor: '#fff',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </div>
              );
            })()
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', fontSize: '0.8rem' }}>
              Vui lòng chọn hoặc thêm một bước để chỉnh sửa thông tin đặc tả.
            </div>
          )}
        </>
      ) : (
        <>
          {activeComponent ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #CBD5E1', paddingBottom: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#2D1A12', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Thông tin đặc tả: {activeComponent}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#F1F5F9', padding: '2px', borderRadius: '8px' }}>
                    {['Frontend', 'Luồng xử lý', 'Backend', 'File mẫu'].map(tab => {
                      const modeMap = {
                        'Frontend': 'blueprint',
                        'Luồng xử lý': 'workflow',
                        'Backend': 'cards',
                        'File mẫu': 'sample'
                      };
                      const isActive = viewMode === modeMap[tab];

                      let hasData = false;
                      if (tab === 'Frontend') {
                        hasData = !!(specDescriptions.Frontend && specDescriptions.Frontend.trim());
                      } else if (tab === 'Luồng xử lý') {
                        hasData = !!(specDescriptions['Luồng xử lý'] && specDescriptions['Luồng xử lý'].trim());
                      } else if (tab === 'Backend') {
                        hasData = !!(specDescriptions.Backend && specDescriptions.Backend.trim());
                      } else if (tab === 'File mẫu') {
                        hasData = !!(specSampleFileUrl && specSampleFileUrl.trim());
                      }

                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setViewMode(modeMap[tab])}
                          style={{
                            padding: '4px 12px',
                            border: 'none',
                            background: isActive ? '#fff' : 'transparent',
                            color: isActive ? '#2D1A12' : '#64748B',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {tab}
                          {hasData && (
                            <span style={{ color: '#EF4444', fontWeight: 'bold', fontSize: '0.9rem' }}>*</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSpecCardCollapsed(!isSpecCardCollapsed)}
                    style={{
                      background: '#F1F5F9',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px',
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                      outline: 'none',
                      width: '32px',
                      height: '32px'
                    }}
                  >
                    <ChevronDown
                      size={18}
                      style={{
                        transform: isSpecCardCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                        transition: 'transform 0.2s',
                        strokeWidth: 2.5
                      }}
                    />
                  </button>
                </div>
              </div>

              {!isSpecCardCollapsed && (
                <div style={{ margin: 0 }}>
                  {viewMode === 'sample' ? (
                    <>
                      <label style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.75rem', display: 'block', marginBottom: '6px' }}>File mẫu</label>
                      <input
                        type="file"
                        ref={specFileInputRef}
                        multiple
                        accept=".doc,.docx,.xls,.xlsx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf"
                        onChange={handleSpecSampleFileChange}
                        disabled={isSpecUploadingSample}
                        style={{ display: 'none' }}
                      />

                      <div
                        onClick={() => !isSpecUploadingSample && specFileInputRef.current && specFileInputRef.current.click()}
                        style={{
                          border: '2px dashed #D1D5DB',
                          borderRadius: '10px',
                          padding: '18px 12px',
                          textAlign: 'center',
                          cursor: isSpecUploadingSample ? 'not-allowed' : 'pointer',
                          background: isSpecUploadingSample ? '#F9FAFB' : '#fff',
                          transition: 'all 0.2s ease',
                          marginBottom: '8px'
                        }}
                      >
                        <Upload size={24} style={{ color: '#7B5233', marginBottom: '6px' }} />
                        <div style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 600, marginBottom: '2px' }}>
                          Nhấn để chọn file mẫu (Có thể chọn nhiều file)
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                          Word, Excel, PDF
                        </div>
                      </div>

                      {isSpecUploadingSample && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid #F3E8D8', borderRadius: '10px', background: '#FDFBF7', color: '#7B5233', fontSize: '0.78rem', marginBottom: '8px' }}>
                          <div style={{ width: '16px', height: '16px', border: '2px solid #D1B99D', borderTopColor: '#7B5233', borderRadius: '50%' }} />
                          <span>Đang tải lên file mẫu...</span>
                        </div>
                      )}

                      {specSampleFileUrl && !isSpecUploadingSample && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                          {specSampleFileUrl.split(',').filter(Boolean).map((fileUrl, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '10px', background: '#F9FAFB' }}>
                              <FileText size={18} style={{ color: '#7B5233', flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <a
                                  href={`${getBaseURL()}${fileUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ display: 'block', fontSize: '0.78rem', color: '#7B5233', fontWeight: 600, textDecoration: 'underline', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                >
                                  {fileUrl.split('/').pop()}
                                </a>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const remaining = specSampleFileUrl.split(',').filter(Boolean).filter((_, i) => i !== index).join(',');
                                  setSpecSampleFileUrl(remaining);
                                  setScreen(prev => {
                                    if (!prev) return null;
                                    const updatedComps = (prev.components || []).map(c => {
                                      if (c.name === activeComponent) {
                                        let techObj = {};
                                        if (c.technical_details) {
                                          try {
                                            techObj = typeof c.technical_details === 'string'
                                              ? JSON.parse(c.technical_details)
                                              : c.technical_details;
                                          } catch (err) { }
                                        }
                                        return {
                                          ...c,
                                          file_path: remaining,
                                          technical_details: JSON.stringify({
                                            ...techObj,
                                            sample_file_url: remaining
                                          })
                                        };
                                      }
                                      return c;
                                    });
                                    return { ...prev, components: updatedComps };
                                  });
                                }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '6px', border: 'none', background: '#FEE2E2', color: '#EF4444', cursor: 'pointer' }}
                                title="Xóa file mẫu"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {specSampleFileUrl && !isSpecUploadingSample && (
                        <div style={{ marginTop: '12px' }}>
                          <label style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.75rem', display: 'block', marginBottom: '6px' }}>
                            Dữ liệu mẫu để xuất thử (JSON)
                          </label>
                          <textarea
                            rows="3"
                            value={specExportData}
                            onChange={(e) => setSpecExportData(e.target.value)}
                            placeholder='[{"ma": "PO-001", "ten": "Don hang mau"}] hoac {"ma": "PO-001", "ten": "Don hang mau"}'
                            style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '8px 10px', fontSize: '0.78rem', boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit', backgroundColor: '#ffffff' }}
                          />
                          <button
                            type="button"
                            disabled={isSpecExporting}
                            onClick={handleSpecExportTest}
                            style={{ marginTop: '8px', width: '100%', background: '#7B5233', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '0.78rem', fontWeight: 700, cursor: isSpecExporting ? 'not-allowed' : 'pointer', opacity: isSpecExporting ? 0.7 : 1 }}
                          >
                            {isSpecExporting ? 'Đang xuất...' : 'Xuất file thử'}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <label style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.75rem', display: 'block', marginBottom: '6px' }}>Mô tả</label>
                      <textarea
                        rows="4"
                        value={
                          viewMode === 'blueprint' ? specDescriptions.Frontend :
                            viewMode === 'workflow' ? specDescriptions['Luồng xử lý'] :
                              viewMode === 'cards' ? specDescriptions.Backend : ''
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          setSpecDescriptions(prev => {
                            const next = { ...prev };
                            if (viewMode === 'blueprint') next.Frontend = val;
                            else if (viewMode === 'workflow') next['Luồng xử lý'] = val;
                            else if (viewMode === 'cards') next.Backend = val;
                            return next;
                          });

                          setScreen(prev => {
                            if (!prev) return null;
                            const updatedComps = (prev.components || []).map(c => {
                              if (c.name === activeComponent) {
                                  let techObj = {};
                                  if (c.technical_details) {
                                    try {
                                      techObj = typeof c.technical_details === 'string'
                                        ? JSON.parse(c.technical_details)
                                        : c.technical_details;
                                    } catch (err) { }
                                  }
                                  const updatedTech = {
                                    ...techObj,
                                    frontend_description: viewMode === 'blueprint' ? val : (techObj.frontend_description || ''),
                                    workflow_description: viewMode === 'workflow' ? val : (techObj.workflow_description || ''),
                                    backend_description: viewMode === 'cards' ? val : (techObj.backend_description || '')
                                  };
                                  return {
                                    ...c,
                                    description: viewMode === 'blueprint' ? val : c.description,
                                    technical_details: JSON.stringify(updatedTech)
                                  };
                              }
                              return c;
                            });
                            return { ...prev, components: updatedComps };
                          });
                        }}
                        placeholder={
                          viewMode === 'blueprint' ? 'Đặc tả chi tiết giao diện người dùng và cách bố trí các thành phần.' :
                            viewMode === 'workflow' ? 'Đặc tả luồng nghiệp vụ, tương tác và xử lý dữ liệu của màn hình.' :
                              viewMode === 'cards' ? 'Đặc tả các API endpoint liên kết, dịch vụ và cấu trúc dữ liệu phía máy chủ.' : ''
                        }
                        style={{
                          width: '100%',
                          fontSize: '0.8rem',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: '10px',
                          boxSizing: 'border-box',
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                      />
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', fontSize: '0.8rem' }}>
              Vui lòng chọn hoặc thêm một thành phần để xem và sửa đổi thông tin đặc tả.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InspectorPane;
