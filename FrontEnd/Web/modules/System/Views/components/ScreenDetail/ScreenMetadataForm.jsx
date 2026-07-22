import React from 'react';

const ScreenMetadataForm = ({
  formData,
  setFormData,
  isNew,
  allScreens,
  isBackendPathManuallyEdited,
  setIsBackendPathManuallyEdited,
  generatedCode,
  subsystems,
  ROUTE_SUGGESTIONS,
  getDisplayRoutePath,
  slugify,
  parseRoutePath,
  normalizeRoutePath,
  handleSave,
  handleCopyScreenDetail,
  handleRefresh,
  navigate,
  screen,
  isModified,
  showToast,
  setShowLinkModal
}) => {
    return (
      <div style={{
        position: 'sticky',
        /*top: '60px',*/
        zIndex: 890,
        background: '#F8FAFC',
        marginLeft: '-15px',
        marginRight: '-15px',
        paddingTop: '12px',
        paddingBottom: '8px',
        paddingLeft: '15px',
        paddingRight: '15px',
        borderBottom: '1px solid #E2E8F0',
        boxSizing: 'border-box',
        transition: 'all 0.25s ease',
        flexShrink: 0
      }}>
        <div className="card" style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: (isHeaderCollapsed || isScreenInfoCollapsed) ? '12px 20px' : '16px 20px',
          boxShadow: isHeaderCollapsed ? '0 4px 12px rgba(0, 0, 0, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
          marginBottom: (isHeaderCollapsed || isScreenInfoCollapsed) ? '12px' : '20px',
          boxSizing: 'border-box',
          transition: 'all 0.25s ease'
        }}>
          {/* Card Header with Inline Selects & Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: (isHeaderCollapsed || isScreenInfoCollapsed) ? 'none' : '1px solid #CBD5E1',
            paddingBottom: (isHeaderCollapsed || isScreenInfoCollapsed) ? '4px' : '12px',
            marginBottom: (isHeaderCollapsed || isScreenInfoCollapsed) ? '0' : '16px',
            flexWrap: 'wrap',
            gap: '12px',
            minHeight: '36px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', color: '#2D1A12' }}>
                Thông tin màn hình
              </h3>
              <button
                type="button"
                onClick={() => setIsScreenInfoCollapsed(!isScreenInfoCollapsed)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                  outline: 'none',
                  width: '24px',
                  height: '24px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E2E8F0';
                  e.currentTarget.style.color = '#334155';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                  e.currentTarget.style.color = '#64748B';
                }}
              >
                <ChevronDown
                  size={14}
                  style={{
                    transform: isScreenInfoCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                    transition: 'transform 0.2s',
                    strokeWidth: 2.5
                  }}
                />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {/* Styled Metadata Pill Box Container */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                background: '#F8FAFC',
                padding: '6px 16px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.02)'
              }}>
                {/* Phân hệ select */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#475569', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Phân hệ:</span>
                  <select
                    value={formData.subsystem}
                    onChange={(e) => setFormData(prev => ({ ...prev, subsystem: e.target.value }))}
                    style={{
                      padding: '4px 28px 4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                      fontWeight: '600',
                      color: '#334155',
                      fontSize: '0.8rem',
                      backgroundColor: '#fff',
                      height: '28px',
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 8px center',
                      backgroundSize: '12px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {subsystems.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Nền tảng select */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#475569', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Nền tảng:</span>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                    style={{
                      padding: '4px 28px 4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                      fontWeight: '600',
                      color: '#334155',
                      fontSize: '0.8rem',
                      backgroundColor: '#fff',
                      height: '28px',
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 8px center',
                      backgroundSize: '12px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <option value="Web">Web</option>
                    <option value="Mobile">Mobile</option>
                  </select>
                </div>

                {/* Trạng thái select */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#475569', fontWeight: '700', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Trạng thái:</span>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    style={{
                      padding: '4px 28px 4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                      fontWeight: '600',
                      color: '#334155',
                      fontSize: '0.8rem',
                      backgroundColor: '#fff',
                      height: '28px',
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 8px center',
                      backgroundSize: '12px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <option value="Mới thiết kế">Mới Thiết Kế</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                  </select>
                </div>
              </div>

              {/* Actions group */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  style={{
                    padding: '6px 16px',
                    fontSize: '0.82rem',
                    borderRadius: '8px',
                    backgroundColor: '#7B5233',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 'bold',
                    height: '34px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(123, 82, 51, 0.2)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#8E6243';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(123, 82, 51, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#7B5233';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(123, 82, 51, 0.2)';
                  }}
                >
                  Lưu đặc tả
                </button>
                {!isNew && !isHeaderCollapsed && (
                  <button
                    type="button"
                    onClick={handleCopyScreenDetail}
                    style={{
                      padding: '6px 16px',
                      fontSize: '0.82rem',
                      borderRadius: '8px',
                      backgroundColor: '#7B5233',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 'bold',
                      height: '34px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(123, 82, 51, 0.2)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#8E6243';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(123, 82, 51, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#7B5233';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(123, 82, 51, 0.2)';
                    }}
                  >
                    Sao chép
                  </button>
                )}
                {!isNew && !isHeaderCollapsed && formData.status === 'Hoàn thành' && (
                  <button
                    type="button"
                    onClick={() => {
                      const defaultAssignee = itAccounts[0] || 'IT';
                      setBugModalMode('create');
                      setBugModalData({
                        componentName: 'Chung',
                        severity: 'Medium',
                        description: '',
                        reporter: getLoggedInUser(),
                        assignee: defaultAssignee,
                        targetDate: new Date().toISOString().split('T')[0],
                        imagePaths: []
                      });
                      setShowBugModal(true);
                    }}
                    style={{
                      padding: '6px 16px',
                      fontSize: '0.82rem',
                      borderRadius: '8px',
                      backgroundColor: '#7B5233',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 'bold',
                      height: '34px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(123, 82, 51, 0.2)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#8E6243';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(123, 82, 51, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#7B5233';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(123, 82, 51, 0.2)';
                    }}
                  >
                    + Báo lỗi
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Card Body - 5 columns (hidden when collapsed) */}
          {!isHeaderCollapsed && !isScreenInfoCollapsed && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.76rem', display: 'block', marginBottom: '6px' }}>Mã màn hình</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.current_code || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, current_code: e.target.value.toUpperCase() }))}
                    placeholder={isNew ? (generatedCode || 'VD: HT03, SX02') : 'VD: HT03, SX02'}
                    style={{
                      backgroundColor: (formData.status === 'Hoàn thành') ? '#F1F5F9' : '#fff',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      color: (formData.status === 'Hoàn thành') ? '#64748B' : '#111827',
                      fontWeight: '600',
                      height: '36px',
                      boxSizing: 'border-box',
                      cursor: (formData.status === 'Hoàn thành') ? 'not-allowed' : 'text'
                    }}
                    disabled={formData.status === 'Hoàn thành'}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="required" style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.76rem', display: 'block', marginBottom: '6px' }}>Tên màn hình</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="VD: Quản lý người dùng, Báo cáo KPI, Danh sách thiết bị..."
                    required
                    style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', height: '36px', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="required" style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.76rem', display: 'block', marginBottom: '6px' }}>Đường dẫn frontend</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: '500', whiteSpace: 'nowrap' }}>
                      {formData.subsystem}
                    </span>
                    {formData.frontend_path && (
                      <span style={{ fontSize: '0.8rem', color: '#1E293B', fontWeight: '600' }}>
                        {formData.frontend_path}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.frontend_path) {
                          const cleanPath = formData.frontend_path.replace(/^\//, '');
                          const parts = cleanPath.split('/');
                          const screenObj = (allScreens || []).find(s => s.title === parts[0]);
                          if (screenObj) {
                            setLinkSubsystem(getSubsystem(screenObj));
                            setLinkScreenId(String(screenObj.id));
                            setLinkComponentId(parts[1] || '');
                          } else {
                            setLinkSubsystem(formData.subsystem || 'Quản lý hệ thống');
                            setLinkScreenId('');
                            setLinkComponentId('');
                          }
                        } else {
                          setLinkSubsystem(formData.subsystem || 'Quản lý hệ thống');
                          setLinkScreenId('');
                          setLinkComponentId('');
                        }

                        setShowLinkModal(true);
                      }}
                      style={{
                        backgroundColor: '#7B5233',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0 14px',
                        height: '36px',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        transition: 'background-color 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#8E6243'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#7B5233'}
                    >
                      {formData.frontend_path ? (
                        <>
                          <Edit size={14} />
                          Edit
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          Chọn
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.76rem', display: 'block', marginBottom: '6px' }}>Đường dẫn backend</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.backend_path}
                    onChange={(e) => {
                      const newBack = e.target.value;
                      setIsBackendPathManuallyEdited(true);
                      setFormData(prev => ({
                        ...prev,
                        backend_path: newBack
                      }));
                    }}
                    placeholder="Đường dẫn backend"
                    style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', height: '36px', boxSizing: 'border-box', width: '100%', color: '#111827', fontWeight: '500' }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="required" style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.76rem', display: 'block', marginBottom: '6px' }}>Ngày hoàn thành dự kiến</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.target_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    style={{
                      backgroundColor: (formData.status === 'Hoàn thành') ? '#F1F5F9' : '#fff',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      color: (formData.status === 'Hoàn thành') ? '#64748B' : '#111827',
                      height: '36px',
                      boxSizing: 'border-box',
                      cursor: (formData.status === 'Hoàn thành') ? 'not-allowed' : 'text'
                    }}
                    disabled={formData.status === 'Hoàn thành'}
                  />
                </div>
              </div>

              {/* Full-width Mô tả at the bottom */}
              <div className="form-group" style={{ marginTop: '16px', marginBottom: 0 }}>
                <label className="required" style={{ fontWeight: 'bold', color: '#64748B', fontSize: '0.76rem', display: 'block', marginBottom: '6px' }}>Mô tả</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="VD: Quản lý tài khoản người dùng, phân quyền và theo dõi hoạt động"
                  required
                  style={{
                    backgroundColor: (formData.status === 'Hoàn thành') ? '#F1F5F9' : '#fff',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    color: (formData.status === 'Hoàn thành') ? '#64748B' : '#111827',
                    height: '36px',
                    boxSizing: 'border-box',
                    width: '100%',
                    cursor: (formData.status === 'Hoàn thành') ? 'not-allowed' : 'text'
                  }}
                  disabled={formData.status === 'Hoàn thành'}
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
};

export default ScreenMetadataForm;
