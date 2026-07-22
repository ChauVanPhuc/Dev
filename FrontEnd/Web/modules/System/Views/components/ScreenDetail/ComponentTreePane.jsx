import React from 'react';
import { Play, Type, Table2, CheckSquare, List, Layout, Menu, CreditCard, Sliders, Bell, Component, MoreVertical } from 'lucide-react';

const renderComponentIcon = (type) => {
  const props = { size: 16, style: { color: '#7B5233' } };
  switch (type) {
    case 'Button':
      return <Play {...props} />;
    case 'Input Field':
      return <Type {...props} />;
    case 'Table':
      return <Table2 {...props} />;
    case 'Checkbox / Radio':
      return <CheckSquare {...props} />;
    case 'Dropdown / Select':
      return <List {...props} />;
    case 'Modal / Dialog':
      return <Layout {...props} />;
    case 'Navbar / Sidebar':
      return <Menu {...props} />;
    case 'Card':
      return <CreditCard {...props} />;
    case 'Carousel / Slider':
      return <Sliders {...props} />;
    case 'Toast / Alert':
      return <Bell {...props} />;
    default:
      return <Component {...props} />;
  }
};

const ComponentTreePane = ({
  activeTab,
  setActiveTab,
  screen,
  setScreen,
  activeComponent,
  setActiveComponent,
  setSpecDescriptions,
  setSpecSampleFile,
  setSpecSampleFileUrl,
  setIsSpecUploadingSample,
  activeComponentMenu,
  setActiveComponentMenu,
  handleEditComponentClick,
  handleDeleteComponent,
  handleSetComponentColor,
  handleAddComponent,
  selectedGuideIdx,
  setSelectedGuideIdx,
  showConfirm,
  showToast,
  COMPONENT_COLORS,
  getComponentHint,
  itAccounts,
  getLoggedInUser,
  setBugModalMode,
  setBugModalData,
  setShowBugModal,
  formData
}) => {
  return (
    <div className="card component-list-card" style={{
      background: '#fff',
      border: '1px solid #D1D5DB',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '590px'
    }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #CBD5E1', marginBottom: '16px', gap: '16px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('components')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'components' ? '2px solid #7B5233' : '2px solid transparent',
            color: activeTab === 'components' ? '#7B5233' : '#64748B',
            fontWeight: activeTab === 'components' ? 'bold' : 'normal',
            padding: '8px 4px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            outline: 'none'
          }}
        >
          Thành phần
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('guides');
            setActiveComponent(null);
            setSpecDescriptions({ Frontend: '', 'Luồng xử lý': '', Backend: '' });
          }}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'guides' ? '2px solid #7B5233' : '2px solid transparent',
            color: activeTab === 'guides' ? '#7B5233' : '#64748B',
            fontWeight: activeTab === 'guides' ? 'bold' : 'normal',
            padding: '8px 4px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            outline: 'none'
          }}
        >
          Hướng dẫn sử dụng
        </button>
      </div>

      {activeTab === 'components' ? (
        <>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
            {screen.components && screen.components.length > 0 ? (
              screen.components.map(comp => {
                let techObj = {};
                if (comp.technical_details) {
                  try {
                    techObj = typeof comp.technical_details === 'string'
                      ? JSON.parse(comp.technical_details)
                      : comp.technical_details;
                  } catch (e) { }
                }
                const colorKey = techObj.color || 'default';
                const colorScheme = COMPONENT_COLORS[colorKey] || COMPONENT_COLORS.default;
                const isSelected = activeComponent === comp.name;

                return (
                  <div
                    key={comp.id}
                    onClick={() => {
                      setActiveComponent(comp.name);
                      setSpecDescriptions({
                        Frontend: techObj.frontend_description || comp.description || '',
                        'Luồng xử lý': techObj.workflow_description || '',
                        Backend: techObj.backend_description || ''
                      });
                      setSpecSampleFile(null);
                      setSpecSampleFileUrl(comp.file_path || techObj.sample_file_url || '');
                      setIsSpecUploadingSample(false);
                    }}
                    title={getComponentHint(comp)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: isSelected ? '#7B5233' : colorScheme.border,
                      backgroundColor: isSelected ? '#FAF6F0' : colorScheme.bg,
                      cursor: 'pointer',
                      marginBottom: '8px',
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 'bold' : 'normal',
                      transition: 'all 0.2s',
                      color: isSelected ? '#7B5233' : colorScheme.text
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <span style={{ width: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        {renderComponentIcon(comp.type)}
                      </span>
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{comp.name}</span>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        className="comp-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveComponentMenu(activeComponentMenu === comp.name ? null : comp.name);
                        }}
                        title="Thao tác"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.6,
                          padding: '4px',
                          color: '#7B5233',
                          borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {activeComponentMenu === comp.name && (
                        <div className="action-menu" style={{
                          position: 'absolute',
                          right: 0,
                          top: '24px',
                          zIndex: 100,
                          width: '150px',
                          backgroundColor: '#FFF',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          padding: '4px 0',
                          display: 'flex',
                          flexDirection: 'column',
                          opacity: 1,
                          animation: 'none'
                        }}>
                          <button
                            className="action-menu-item"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveComponentMenu(null);
                              handleEditComponentClick(comp);
                            }}
                            style={{
                              padding: '8px 12px',
                              fontSize: '0.78rem',
                              textAlign: 'left',
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              color: '#334155'
                            }}
                          >
                            Sửa thành phần
                          </button>
                          {formData.status === 'Hoàn thành' && (
                            <button
                              className="action-menu-item"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveComponentMenu(null);
                                const defaultAssignee = itAccounts[0] || 'IT';
                                setBugModalMode('create');
                                setBugModalData({
                                  componentName: comp.name,
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
                                padding: '8px 12px',
                                fontSize: '0.78rem',
                                textAlign: 'left',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                color: '#334155'
                              }}
                            >
                              Báo lỗi
                            </button>
                          )}
                          <button
                            className="action-menu-item danger"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveComponentMenu(null);
                              handleDeleteComponent(comp.name);
                            }}
                            style={{
                              padding: '8px 12px',
                              fontSize: '0.78rem',
                              textAlign: 'left',
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              color: '#EF4444'
                            }}
                          >
                            Xóa
                          </button>
                          <div style={{ borderTop: '1px solid #CBD5E1', margin: '4px 0' }} />
                          <div style={{ padding: '4px 12px', fontSize: '0.72rem', color: '#64748B', fontWeight: 'bold' }}>Tô màu</div>
                          <div style={{ display: 'flex', gap: '6px', padding: '4px 12px', flexWrap: 'wrap' }}>
                            {Object.keys(COMPONENT_COLORS).map((cKey) => {
                              const cVal = COMPONENT_COLORS[cKey];
                              return (
                                <button
                                  key={cKey}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetComponentColor(comp.name, cKey);
                                    setActiveComponentMenu(null);
                                  }}
                                  title={cKey === 'default' ? 'Mặc định' : cKey}
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    backgroundColor: cVal.bg,
                                    border: `1px solid ${cVal.border}`,
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'block',
                                    boxShadow: techObj.color === cKey ? '0 0 0 2px #7B5233' : 'none'
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', fontSize: '0.78rem' }}>
                Không có component nào.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddComponent}
            style={{
              background: 'transparent',
              border: '1px dashed #7B5233',
              color: '#7B5233',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              width: '100%',
              justifyContent: 'center',
              marginTop: '12px'
            }}
          >
            <span>+ Thêm thành phần</span>
          </button>
        </>
      ) : (
        <>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
            {screen.guides && screen.guides.length > 0 ? (
              screen.guides.map((step, idx) => (
                <div
                  key={step.id || idx}
                  onClick={() => setSelectedGuideIdx(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: selectedGuideIdx === idx ? '#7B5233' : '#CBD5E1',
                    backgroundColor: selectedGuideIdx === idx ? '#FAF6F0' : '#FFF',
                    cursor: 'pointer',
                    marginBottom: '8px',
                    fontSize: '0.8rem',
                    fontWeight: selectedGuideIdx === idx ? 'bold' : 'normal',
                    transition: 'all 0.2s',
                    color: selectedGuideIdx === idx ? '#7B5233' : '#334155'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <span style={{ width: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      ⏩
                    </span>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      Bước {step.step_number || (idx + 1)}: {step.title || 'Hành động mới'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (idx > 0) {
                          setScreen(prev => {
                            const list = [...(prev.guides || [])];
                            const temp = list[idx];
                            list[idx] = list[idx - 1];
                            list[idx - 1] = temp;
                            list.forEach((item, i) => { item.step_number = i + 1; });
                            return { ...prev, guides: list };
                          });
                          setSelectedGuideIdx(idx - 1);
                        }
                      }}
                      disabled={idx === 0}
                      style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 0.6, padding: '2px', fontSize: '0.7rem' }}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (idx < screen.guides.length - 1) {
                          setScreen(prev => {
                            const list = [...(prev.guides || [])];
                            const temp = list[idx];
                            list[idx] = list[idx + 1];
                            list[idx + 1] = temp;
                            list.forEach((item, i) => { item.step_number = i + 1; });
                            return { ...prev, guides: list };
                          });
                          setSelectedGuideIdx(idx + 1);
                        }
                      }}
                      disabled={idx === screen.guides.length - 1}
                      style={{ background: 'none', border: 'none', cursor: idx === screen.guides.length - 1 ? 'default' : 'pointer', opacity: idx === screen.guides.length - 1 ? 0.3 : 0.6, padding: '2px', fontSize: '0.7rem' }}
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        showConfirm(
                          'Xác nhận xóa',
                          `Bạn có chắc chắn muốn xóa bước "${step.title || 'bước này'}" khỏi tài liệu hướng dẫn?`,
                          () => {
                            setScreen(prev => {
                              const filtered = (prev.guides || []).filter((_, i) => i !== idx);
                              filtered.forEach((item, i) => { item.step_number = i + 1; });
                              return { ...prev, guides: filtered };
                            });
                            setSelectedGuideIdx(Math.max(0, idx - 1));
                            showToast('Đã xóa bước hướng dẫn!');
                          }
                        );
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, padding: '2px', fontSize: '0.7rem' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', fontSize: '0.78rem' }}>
                Chưa khai báo các bước hướng dẫn.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              const nextStepNum = (screen.guides || []).length + 1;
              const newStep = {
                id: `temp_${Date.now()}`,
                step_number: nextStepNum,
                title: 'Hành động mới',
                related_components: '',
                description: ''
              };
              setScreen(prev => ({
                ...prev,
                guides: [...(prev.guides || []), newStep]
              }));
              setSelectedGuideIdx(nextStepNum - 1);
              showToast('Đã thêm bước hướng dẫn mới!');
            }}
            style={{
              background: 'transparent',
              border: '1px dashed #7B5233',
              color: '#7B5233',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              width: '100%',
              justifyContent: 'center',
              marginTop: '12px'
            }}
          >
            <span>+ Thêm bước</span>
          </button>
        </>
      )}
    </div>
  );
};

export default ComponentTreePane;
