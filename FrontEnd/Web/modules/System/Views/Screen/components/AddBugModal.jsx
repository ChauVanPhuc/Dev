import React from 'react';
import { Plus, X, FolderOpen, Clipboard } from 'lucide-react';

const AddBugModal = ({ bugManager }) => {
  const {
    showAddModal,
    setShowAddModal,
    handleAddSubmit,
    isAddScreenDropdownOpen,
    setIsAddScreenDropdownOpen,
    addForm,
    setAddForm,
    screens,
    addScreenSearch,
    setAddScreenSearch,
    screenComponents,
    handlePasteImage,
    setAddImages,
    addImages,
    getImageUrl,
    setActiveLightboxUrl,
    handleManualUpload,
    handlePasteFromClipboardAPI,
    itUsers,
    requestedDefaultName,
    isSubmitting
  } = bugManager;

  if (!showAddModal) return null;

  return (
        <div className="modal-overlay" style={{ zIndex: 2999 }}>
          <div className="modal-container" style={{ maxWidth: '560px', borderRadius: '12px', border: '1px solid #EADCC9' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} /> Báo cáo lỗi màn hình
              </h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', margin: 0 }}>
              <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>

                {/* Searchable Screen Selector */}
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="required">Màn hình lỗi</label>

                  {!isAddScreenDropdownOpen ? (
                    <div
                      style={{
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        backgroundColor: '#FAF8F6',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxSizing: 'border-box',
                        minHeight: '42px'
                      }}
                      onClick={() => setIsAddScreenDropdownOpen(true)}
                    >
                      <span style={{ color: addForm.screen_id ? '#2D1A12' : '#9CA3AF' }}>
                        {addForm.screen_id
                          ? (() => {
                            const selected = screens.find(s => s.id === parseInt(addForm.screen_id));
                            return selected ? `[${selected.platform}] ${selected.current_code} - ${selected.title}` : 'Chọn màn hình...';
                          })()
                          : 'Chọn màn hình...'
                        }
                      </span>
                      <span style={{ fontSize: '0.6rem', color: '#8D6E63' }}>▼</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        border: '1px solid #7B5233',
                        borderRadius: '8px',
                        backgroundColor: '#fff',
                        fontSize: '0.9rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxSizing: 'border-box',
                        minHeight: '42px',
                        position: 'relative'
                      }}
                    >
                      <input
                        type="text"
                        autoFocus
                        placeholder="Tìm theo mã hoặc tên màn hình..."
                        value={addScreenSearch}
                        onChange={(e) => setAddScreenSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            setIsAddScreenDropdownOpen(false);
                          }
                        }}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          border: 'none',
                          padding: '10px 30px 10px 14px',
                          fontSize: '0.9rem',
                          outline: 'none',
                          backgroundColor: 'transparent',
                          color: '#2D1A12'
                        }}
                      />
                      <span
                        style={{
                          fontSize: '0.6rem',
                          color: '#8D6E63',
                          position: 'absolute',
                          right: '14px',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsAddScreenDropdownOpen(false);
                          setAddScreenSearch('');
                        }}
                      >
                        ▲
                      </span>
                    </div>
                  )}

                  {isAddScreenDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px -5px rgba(45, 26, 18, 0.1)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        marginTop: '4px'
                      }}
                    >
                      {screens
                        .filter(s => s.current_code !== 'OTHER')
                        .filter(s => {
                          if (!addScreenSearch) return true;
                          const q = addScreenSearch.toLowerCase();
                          return (
                            s.current_code.toLowerCase().includes(q) ||
                            s.title.toLowerCase().includes(q) ||
                            s.platform.toLowerCase().includes(q)
                          );
                        })
                        .map(s => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setAddForm(prev => ({ ...prev, screen_id: s.id.toString() }));
                              setIsAddScreenDropdownOpen(false);
                              setAddScreenSearch('');
                            }}
                            style={{
                              padding: '10px 14px',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              borderBottom: '1px solid #FAF6F0',
                              backgroundColor: addForm.screen_id === s.id.toString() ? '#FAF6F0' : '#fff',
                              color: '#5D4037'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF8F6'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = addForm.screen_id === s.id.toString() ? '#FAF6F0' : '#fff'}
                          >
                            <strong>[{s.platform}] {s.current_code}</strong> - {s.title}
                          </div>
                        ))
                      }

                      {(() => {
                        const otherScreen = screens.find(s => s.current_code === 'OTHER');
                        if (!otherScreen) return null;
                        return (
                          <div
                            key={otherScreen.id}
                            onClick={() => {
                              setAddForm(prev => ({ ...prev, screen_id: otherScreen.id.toString() }));
                              setIsAddScreenDropdownOpen(false);
                              setAddScreenSearch('');
                            }}
                            style={{
                              padding: '10px 14px',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              borderTop: '2px solid #EADCC9',
                              backgroundColor: addForm.screen_id === otherScreen.id.toString() ? '#FAF6F0' : '#fff',
                              color: '#7B5233',
                              fontWeight: '700'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF8F6'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = addForm.screen_id === otherScreen.id.toString() ? '#FAF6F0' : '#fff'}
                          >
                            <strong>[{otherScreen.platform}] {otherScreen.current_code}</strong> - {otherScreen.title}
                          </div>
                        );
                      })()}

                      {screens.filter(s => s.current_code !== 'OTHER').filter(s => {
                        if (!addScreenSearch) return true;
                        const q = addScreenSearch.toLowerCase();
                        return (
                          s.current_code.toLowerCase().includes(q) ||
                          s.title.toLowerCase().includes(q) ||
                          s.platform.toLowerCase().includes(q)
                        );
                      }).length === 0 && (
                          <div style={{ padding: '10px 14px', color: '#8D6E63', fontSize: '0.9rem', textAlign: 'center' }}>
                            Không tìm thấy màn hình phù hợp
                          </div>
                        )}
                    </div>
                  )}
                </div>

                {/* Component Selector */}
                <div className="form-group">
                  <label className="required">Component bị lỗi</label>
                  <select
                    className="form-control"
                    value={addForm.component_id || 'Chung'}
                    onChange={(e) => setAddForm(prev => ({ ...prev, component_id: e.target.value }))}
                    required
                    style={{ borderRadius: '8px', padding: '10px 14px', fontSize: '0.9rem', minHeight: '42px' }}
                  >
                    <option value="Chung">Chung / Toàn bộ màn hình</option>
                    {screenComponents.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="required">Mô tả chi tiết lỗi</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={addForm.description}
                    onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                    placeholder="Mô tả các bước tái hiện lỗi, kết quả thực tế và mong muốn... Nhấn Ctrl+V để dán ảnh chụp màn hình."
                    required
                    onPaste={(e) => {
                      const clipboardData = e.clipboardData || (e.nativeEvent && e.nativeEvent.clipboardData);
                      const items = clipboardData?.items || [];
                      let hasImage = false;
                      for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf('image') !== -1) {
                          hasImage = true;
                          break;
                        }
                      }
                      if (hasImage) {
                        e.preventDefault();
                        handlePasteImage(e, setAddImages);
                      }
                    }}
                  />
                </div>

                {/* Image Attachments (Moved directly below Description and styled to show previews inside) */}
                <div className="form-group">
                  <label>Hình ảnh minh họa</label>
                  <div
                    onPaste={(e) => handlePasteImage(e, setAddImages)}
                    tabIndex={0}
                    style={{
                      border: '2px dashed #7B5233',
                      borderRadius: '8px',
                      padding: addImages.length > 0 ? '16px' : '24px 16px',
                      textAlign: 'center',
                      backgroundColor: '#FAF6F0',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                    onFocus={(e) => e.currentTarget.style.backgroundColor = '#FFF8F0'}
                    onBlur={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                    onClick={() => document.getElementById('add-bug-file-input')?.click()}
                  >
                    {addImages.length > 0 ? (
                      <>
                        {/* Previews inside the upload dropzone */}
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            width: '100%'
                          }}
                          onClick={(e) => e.stopPropagation()} // Prevent opening file selection dialog
                        >
                          {addImages.map((path, idx) => (
                            <div key={idx} style={{ position: 'relative', width: '60px', height: '60px' }}>
                              <img
                                src={getImageUrl(path)}
                                alt="preview"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  borderRadius: '6px',
                                  border: '1px solid #EADCC9'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveLightboxUrl(getImageUrl(path));
                                }}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAddImages(prev => prev.filter((_, i) => i !== idx));
                                }}
                                style={{
                                  position: 'absolute',
                                  top: '-6px',
                                  right: '-6px',
                                  backgroundColor: '#EF4444',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '18px',
                                  height: '18px',
                                  fontSize: '11px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '600' }}>
                          📸 Click hoặc dán tiếp (Ctrl+V) để đính kèm thêm ảnh
                        </div>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '1.5rem' }}>📷</span>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#5D4037', fontWeight: 'bold' }}>
                          Dán ảnh chụp màn hình (Ctrl+V) hoặc kéo thả tại đây
                        </p>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '12px', width: '100%', maxWidth: '360px', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => document.getElementById('add-bug-file-input')?.click()}
                            style={{
                              height: '34px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              padding: '0 12px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              backgroundColor: '#4F46E5',
                              color: '#fff',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <FolderOpen size={14} /> Duyệt qua các tệp
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => handlePasteFromClipboardAPI(setAddImages)}
                            style={{
                              height: '34px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              padding: '0 12px',
                              backgroundColor: '#fff',
                              border: '1px solid #7B5233',
                              color: '#7B5233',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <Clipboard size={14} /> Dán từ bộ nhớ tạm
                          </button>
                        </div>
                      </>
                    )}
                    <input
                      type="file"
                      id="add-bug-file-input"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleManualUpload(e, setAddImages)}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>

                {/* Assignee */}
                <div className="form-group">
                  <label className="required">Người xử lý (IT)</label>
                  <select
                    className="form-control"
                    value={addForm.assignee}
                    onChange={(e) => setAddForm({ ...addForm, assignee: e.target.value })}
                    required
                  >
                    <option value="">-- Chưa chỉ định --</option>
                    {itUsers.map(u => (
                      <option key={u.id} value={u.full_name || u.username}>
                        {u.full_name ? `${u.full_name} (${u.username})` : u.username}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Severity & Date Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Mức độ lỗi</label>
                    <select
                      className="form-control"
                      value={addForm.severity}
                      onChange={(e) => setAddForm({ ...addForm, severity: e.target.value })}
                    >
                      <option value="Critical">Khẩn cấp</option>
                      <option value="High">Cao</option>
                      <option value="Medium">Trung bình</option>
                      <option value="Low">Thấp</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="required">Ngày báo cáo</label>
                    <input
                      type="date"
                      className="form-control"
                      value={addForm.requested_at}
                      onChange={(e) => setAddForm({ ...addForm, requested_at: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label>Ghi chú thêm</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={addForm.notes}
                    onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                    placeholder="Ghi chú kỹ thuật hoặc thông tin môi trường thử nghiệm (nếu có)..."
                  />
                </div>

              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  style={{ borderRadius: '8px', padding: '8px 16px' }}
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ borderRadius: '8px', padding: '8px 16px', fontWeight: 'bold' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
                </button>
              </div>
            </form>
          </div>
        </div>
  );
};

export default AddBugModal;
