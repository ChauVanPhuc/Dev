import React from 'react';
import {
  Plus, Settings, ChevronDown, ChevronUp, Activity, HelpCircle, Save, Trash2, Edit,
  ZoomIn, ZoomOut, Maximize2, FileText, Download, ArrowLeft
} from 'lucide-react';
import FlowchartCanvas from '../FlowchartCanvas';
import FlowchartTable from '../FlowchartTable';
import { FlowchartConnectors } from './FlowchartConnectors';
import RichTextEditor from './RichTextEditor';

const ProcessContentTab = ({ editor }) => {
  const {
    accentColor, activeMenu, activeTab, cardBorderColor, cardStyle,
    explanationExpanded, flowchartCanvasRef, flowchartMode, formData, getSectionHint, getStepFailPath,
    handleAddStep, handleAddStepFromCanvas, handleAutoLayoutClassic, handleNodeSelect, handlePositionsChange, handleRemoveStep,
    handleSectionChange, handleSetFlowchartMode, handleUpdateStep, headerStyle, headerTextStyle,
    isStepSelected, maxLeftChainLength, renderSingleStepCard,
    selectedStepIdx, setActiveMenu, setExplanationExpanded, setFormData, setInfoExpanded, setSelectedStepIdx,
    setShowPdfPreview, setZoomScale, stepDisplayLabels, zoomScale, sidestepSet,
  } = editor;

  return (
    <>
            <div style={cardStyle}>
            <div style={{ ...headerStyle, cursor: 'default' }}>
              <span style={headerTextStyle}>Nội dung quy trình</span>
              <button 
                type="button"
                onClick={() => setShowPdfPreview(true)}
                style={{ padding: '4px 12px', backgroundColor: '#7B5233', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight:'bold', cursor:'pointer' }}
              >
                Xem trước
              </button>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '220px 1fr',
              minHeight: '480px',
              borderTop: '1px solid #EADCC9'
            }}>
              {/* Left Column: Menu TOC list */}
              <div style={{
                borderRight: `1.5px solid ${cardBorderColor}`,
                backgroundColor: '#FAF8F5',
                padding: '16px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '4px' }}>Mục lục</span>
                {Object.keys(formData.sections || {})
                  .filter(key => !key.startsWith('__'))
                  .map((sectionId, sIdx) => {
                  const isSelected = activeMenu === sectionId;
                  const currentType = formData.section_types?.[sectionId] || 'text';
                  return (
                    <div
                      key={sIdx}
                      onClick={() => {
                        setActiveMenu(sectionId);
                        if (formData.section_types?.[sectionId] === 'flowchart') {
                          setInfoExpanded(false);
                        } else {
                          setInfoExpanded(true);
                        }
                      }}
                      style={{
                        padding: '8px 10px',
                        fontSize: '0.78rem',
                        fontWeight: isSelected ? 'bold' : 'normal',
                        color: isSelected ? '#7B5233' : '#475569',
                        backgroundColor: isSelected ? '#FAF6F0' : 'transparent',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>{`${sIdx + 1}. ${sectionId}`}</span>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Unified live editing area with custom content type definition */}
              <div style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                backgroundColor: 'white'
              }}>


                {formData.section_types?.[activeMenu] === 'flowchart' ? (
                  /* RENDER FLOWCHART WORKSPACE */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                    <div style={{
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: `1.5px solid ${cardBorderColor}`,
                      boxShadow: '0 4px 16px rgba(123, 82, 51, 0.05)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isStepSelected ? 'minmax(0, 1.2fr) minmax(0, 1fr)' : '1fr',
                        alignItems: 'stretch'
                      }}>
{/* Left Side: ReactFlow Flowchart Canvas column */}
                        <div style={{
                          borderRight: isStepSelected ? `1.5px solid ${cardBorderColor}` : 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          minHeight: '700px',
                          minWidth: 0,
                          overflow: 'hidden'
                        }}>
                          {/* Segmented Control Mode Toggle */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            backgroundColor: '#F8FAFC',
                            borderBottom: '1px solid #cbd5e1',
                            flexShrink: 0
                          }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Activity size={14} style={{ color: '#7B5233' }} /> Chế độ thiết kế lưu trình
                            </span>

                            {/* Auto Layout Button inside header */}
                            <button
                              type="button"
                              onClick={() => {
                                if (flowchartMode === 'canvas') {
                                  flowchartCanvasRef.current?.triggerAutoLayout();
                                } else {
                                  handleAutoLayoutClassic();
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                borderRadius: '6px',
                                border: '1.5px solid #7B5233',
                                backgroundColor: 'white',
                                color: '#7B5233',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#FAF6F0';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = 'white';
                              }}
                            >
                              ✨ Sắp xếp tự động
                            </button>

                            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                              <button
                                type="button"
                                onClick={() => handleSetFlowchartMode('canvas')}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  borderRadius: '6px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  backgroundColor: flowchartMode === 'canvas' ? 'white' : 'transparent',
                                  color: flowchartMode === 'canvas' ? '#7B5233' : '#64748b',
                                  boxShadow: flowchartMode === 'canvas' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                }}
                              >
                                🗺️ Kéo thả
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetFlowchartMode('classic')}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  borderRadius: '6px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  backgroundColor: flowchartMode === 'classic' ? 'white' : 'transparent',
                                  color: flowchartMode === 'classic' ? '#7B5233' : '#64748b',
                                  boxShadow: flowchartMode === 'classic' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                }}
                              >
                                🗂️ Dạng danh sách
                              </button>
                            </div>
                          </div>

                          {flowchartMode === 'canvas' ? (
                            <FlowchartCanvas
                              ref={flowchartCanvasRef}
                              steps={formData.steps}
                              selectedStepIdx={selectedStepIdx}
                              onPositionsChange={handlePositionsChange}
                              onAddStep={handleAddStepFromCanvas}
                              onUpdateStep={handleUpdateStep}
                              onDeleteStep={handleRemoveStep}
                              onNodeSelect={handleNodeSelect}
                            />
                          ) : (
                            <div style={{
                              width: '100%',
                              flex: 1,
                              border: 'none',
                              backgroundColor: '#F8FAFC',
                              maxHeight: '700px',
                              position: 'relative',
                              display: 'flex',
                              flexDirection: 'column',
                              overflow: 'hidden'
                            }}>
                              {/* Visual Flowchart Canvas (Scrollable) */}
                              <div style={{
                                width: '100%',
                                flex: 1,
                                padding: '24px 16px',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'auto'
                              }}>
                                <div 
                                  id="flowchart-canvas-container"
                                  style={{
                                    transform: `scale(${zoomScale})`,
                                    transformOrigin: 'top center',
                                    width: 'max-content',
                                    minWidth: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '20px',
                                    transition: 'transform 0.15s ease-out',
                                    paddingBottom: '40px',
                                    position: 'relative',
                                    paddingLeft: `${(maxLeftChainLength * 270) + 40}px`,
                                    paddingRight: `${(maxLeftChainLength * 270) + 40}px`,
                                    margin: '0 auto'
                                  }}
                                >
                                  <FlowchartConnectors steps={formData.steps} zoomScale={zoomScale} />
                                  {formData.steps.length === 0 ? (
                                    <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '100px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                      <span>Chưa có bước nào. Click nút "Thêm bước mới" để bắt đầu thiết lập.</span>
                                      <button
                                        type="button"
                                        onClick={handleAddStep}
                                        style={{
                                          padding: '8px 20px',
                                          backgroundColor: '#7B5233',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '6px',
                                          fontSize: '0.8rem',
                                          fontWeight: 'bold',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          boxShadow: '0 2px 8px rgba(123, 82, 51, 0.2)'
                                        }}
                                      >
                                        <Plus size={14} /> Thêm bước mới
                                      </button>
                                    </div>
                                  ) : (
                                    (() => {
                                      // Filter main steps to render vertically
                                      const mainSteps = formData.steps.filter(s => !sidestepSet.has(s.step_number));
                                      
                                      return mainSteps.map((step, mainIdx) => {
                                        const idx = formData.steps.findIndex(s => s.step_number === step.step_number);
                                        const isDecision = step.node_type === 'decision';
                                        const leftColumnWidth = maxLeftChainLength * 270;
                                        
                                        const chain = [];
                                        if (isDecision) {
                                          const failPath = step.fail_path || [];
                                          let current = failPath[0]?.return_to_step;
                                          const visited = new Set();
                                          while (current && !visited.has(current)) {
                                            visited.add(current);
                                            const currStep = formData.steps.find(s => String(s.step_number) === String(current));
                                            if (currStep) {
                                              chain.push(currStep);
                                              current = currStep.transition?.next_step || currStep.next_step;
                                              if (mainSteps.some(ms => ms.step_number === current)) break;
                                            } else break;
                                          }
                                        }
                                        return (
                                          <React.Fragment key={step.step_number}>
                                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: 'max-content', justifyContent: 'center' }}>
                                              <div style={{ 
                                                width: `${leftColumnWidth}px`, 
                                                marginRight: isDecision ? '-50px' : '0px',
                                                display: 'flex', 
                                                justifyContent: 'flex-end', 
                                                alignItems: 'center',
                                                flexShrink: 0
                                              }}>
                                                {chain.length > 0 && (
                                                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0px' }}>
                                                    {[...chain].reverse().map((cStep, rIdx) => {
                                                      const cStepIdx = formData.steps.findIndex(s => s.step_number === cStep.step_number);
                                                      return (
                                                        <React.Fragment key={cStep.step_number}>
                                                          <div style={{ flexShrink: 0 }}>
                                                            {renderSingleStepCard(cStep, cStepIdx)}
                                                          </div>
                                                          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, margin: '0 6px', gap: '2px', zIndex: 6 }}>
                                                            <div style={{
                                                              width: 0,
                                                              height: 0,
                                                              borderTop: '5px solid transparent',
                                                              borderBottom: '5px solid transparent',
                                                              borderRight: '7px solid #ef4444'
                                                            }} />
                                                            <div style={{ width: '20px', height: '2.5px', backgroundColor: '#ef4444' }} />
                                                          </div>
                                                        </React.Fragment>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </div>
                                              <div style={{ 
                                                width: '240px', 
                                                display: 'flex', 
                                                justifyContent: 'center', 
                                                alignItems: 'center',
                                                flexShrink: 0,
                                                zIndex: 2,
                                                position: 'relative'
                                              }}>
                                                {renderSingleStepCard(step, idx)}
                                              </div>
                                              <div style={{ 
                                                width: `${leftColumnWidth}px`, 
                                                marginLeft: isDecision ? '-50px' : '0px',
                                                flexShrink: 0 
                                              }} />
                                            </div>
                                            {mainIdx < mainSteps.length - 1 && (
                                              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: 'max-content', justifyContent: 'center' }}>
                                                <div style={{ width: `${leftColumnWidth}px`, marginRight: isDecision ? '-50px' : '0px', flexShrink: 0 }} />
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '240px', height: '24px', margin: '-10px 0', flexShrink: 0 }}>
                                                  <div style={{ width: '2px', height: '16px', backgroundColor: '#cbd5e1' }} />
                                                  <div style={{
                                                    width: 0,
                                                    height: 0,
                                                    borderLeft: '4px solid transparent',
                                                    borderRight: '4px solid transparent',
                                                    borderTop: '6px solid #cbd5e1'
                                                  }} />
                                                </div>
                                                <div style={{ width: `${leftColumnWidth}px`, marginLeft: isDecision ? '-50px' : '0px', flexShrink: 0 }} />
                                              </div>
                                            )}
                                          </React.Fragment>
                                        );
                                      });
                                    })()
                                  )}
                                </div>
                              </div>

                              {/* Floating Glassmorphic Zoom Toolbar */}
                              <div style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                display: 'flex',
                                gap: '4px',
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #cbd5e1',
                                borderRadius: '20px',
                                padding: '2px 8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                zIndex: 30,
                                alignItems: 'center'
                              }}>
                                <button
                                  type="button"
                                  onClick={() => setZoomScale(prev => Math.max(0.6, prev - 0.1))}
                                  style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', padding: '4px', color: '#475569' }}
                                  title="Thu nhỏ (Zoom Out)"
                                >
                                  <ZoomOut size={14} />
                                </button>
                                <span style={{ fontSize: '0.65rem', fontWeight: 'bold', minWidth: '32px', textAlign: 'center', color: '#475569', userSelect: 'none' }}>
                                  {Math.round(zoomScale * 100)}%
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setZoomScale(prev => Math.min(1.4, prev + 0.1))}
                                  style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', padding: '4px', color: '#475569' }}
                                  title="Phóng to (Zoom In)"
                                >
                                  <ZoomIn size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setZoomScale(1.0)}
                                  style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', padding: '4px', color: '#475569', borderLeft: '1px solid #cbd5e1', marginLeft: '2px', paddingLeft: '6px' }}
                                  title="Mặc định (100%)"
                                >
                                  <Maximize2 size={12} />
                                </button>
                              </div>

                              {/* Floating "Thêm bước mới" Button - Always fixed in the bottom-left corner of the workspace area */}
                              {formData.steps.length > 0 && (
                                <button
                                  type="button"
                                  onClick={handleAddStep}
                                  style={{
                                    position: 'absolute',
                                    bottom: '12px',
                                    left: '12px',
                                    padding: '8px 16px',
                                    backgroundColor: '#7B5233',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '20px',
                                    fontSize: '0.78rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(123, 82, 51, 0.3)',
                                    zIndex: 30,
                                    transition: 'all 0.2s ease',
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#623f25';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#7B5233';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                  }}
                                >
                                  <Plus size={14} /> Thêm bước mới
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right Side: Step Details Editor */}
                        {isStepSelected && (
                          <div style={{
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            overflowY: 'auto',
                            maxHeight: '700px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EADCC9', paddingBottom: '8px', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#7B5233' }}>Cấu hình thuộc tính bước</span>
                              <button
                                type="button"
                                onClick={() => setSelectedStepIdx(-1)}
                                style={{
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  color: '#64748b',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: 'bold',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                              >
                                ✕ Đóng
                              </button>
                            </div>
                            {formData.steps[selectedStepIdx] && (
                              <>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr 1.8fr', gap: '10px' }}>
                                <div>
                                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '2px' }}>Bước:</label>
                                  <select
                                    value={selectedStepIdx}
                                    onChange={(e) => setSelectedStepIdx(parseInt(e.target.value))}
                                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.76rem', backgroundColor:'white' }}
                                  >
                                    {formData.steps.map((s, idx) => (
                                      <option key={idx} value={idx}>{(stepDisplayLabels[s.step_number] || ('B' + s.step_number)).replace(/^B/, 'Bước ')}: {s.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '2px' }}>Kiểu bước:</label>
                                  <select
                                    value={formData.steps[selectedStepIdx].node_type || 'task'}
                                    onChange={(e) => handleUpdateStep(selectedStepIdx, 'node_type', e.target.value)}
                                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.76rem', backgroundColor:'white', fontWeight: 'bold', color: '#7B5233' }}
                                  >
                                    <option value="task">Công việc thường</option>
                                    <option value="decision">Quyết định (Yes/No)</option>
                                    <option value="condition">Nhiều điều kiện</option>
                                    <option value="terminal">Kết thúc</option>
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '2px' }}>Bộ phận phụ trách:</label>
                                  <select
                                    value={formData.steps[selectedStepIdx].assignee_role || ''}
                                    onChange={(e) => handleUpdateStep(selectedStepIdx, 'assignee_role', e.target.value)}
                                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.76rem', backgroundColor:'white' }}
                                  >
                                    <option value="Kho">Bộ phận Kho</option>
                                    <option value="QC">Bộ phận QC / QLCL</option>
                                    <option value="Sản xuất">Bộ phận Sản xuất</option>
                                    <option value="Thu mua">Bộ phận Thu mua</option>
                                    <option value="Bán hàng">Bộ phận Bán hàng</option>
                                    <option value="Admin">Ban Giám Đốc</option>
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '2px' }}>Tiêu đề công việc:</label>
                                  <input
                                    type="text"
                                    value={formData.steps[selectedStepIdx].name || ''}
                                    onChange={(e) => handleUpdateStep(selectedStepIdx, 'name', e.target.value)}
                                    style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.76rem' }}
                                  />
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', display: 'block' }}>Bản soạn thảo (Giải thích chi tiết bước):</label>
                                <RichTextEditor
                                  value={formData.steps[selectedStepIdx].instructions || ''}
                                  onChange={(val) => handleUpdateStep(selectedStepIdx, 'instructions', val)}
                                  placeholder="Nhập hướng dẫn, giải thích các bước chi tiết tại đây..."
                                  style={{ minHeight: '160px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                />
                              </div>

                              {/* DYNAMIC CONDITIONAL ROUTING SUB-PANEL */}
                              {formData.steps[selectedStepIdx].node_type === 'decision' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#FAF6F0', padding: '10px 14px', borderRadius: '6px', border: '1px solid #EADCC9' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                      <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: '2px' }}>Chọn bước đúng (Yes):</label>
                                      <select 
                                        value={formData.steps[selectedStepIdx]?.transition?.next_step === null ? 'custom' : (formData.steps[selectedStepIdx]?.transition?.next_step || '')} 
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setFormData(prev => {
                                            const steps = prev.steps.map(s => ({ ...s }));
                                            if (!steps[selectedStepIdx]) return prev;
                                            if (val === 'new_step') {
                                              const nextStepNum = steps.length + 1;
                                              const newStep = {
                                                step_number: nextStepNum,
                                                name: `Bước mới ${nextStepNum}`,
                                                node_type: 'task',
                                                assignee_role: 'QC',
                                                transition: null,
                                                fail_path: []
                                              };
                                              steps.push(newStep);
                                              steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { next_step: nextStepNum } };
                                              setTimeout(() => setSelectedStepIdx(steps.length - 1), 0);
                                              return { ...prev, steps };
                                            } else if (val === 'custom') {
                                              steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { next_step: null, name: "Hoàn tất", node_type: "terminal" } };
                                              return { ...prev, steps };
                                            } else if (val === '') {
                                              steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: null };
                                              return { ...prev, steps };
                                            } else {
                                              steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { next_step: parseInt(val) } };
                                              return { ...prev, steps };
                                            }
                                          });
                                        }}
                                        style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.74rem', backgroundColor:'white', color: '#7B5233', fontWeight: 'bold' }}
                                      >
                                        <option value="">-- Chọn bước --</option>
                                        <option value="new_step">➕ Tạo bước mới...</option>
                                        <option value="custom">✍️ Kết quả tùy chỉnh...</option>
                                        {formData.steps.map((s, idx) => (
                                          <option key={idx} value={s.step_number}>{stepDisplayLabels[s.step_number] || `B${s.step_number}`}: {s.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: '2px' }}>Chọn bước sai (No):</label>
                                      <select 
                                        value={getStepFailPath(formData.steps[selectedStepIdx])[0]?.return_to_step === null && getStepFailPath(formData.steps[selectedStepIdx])[0]?.name ? 'custom' : (getStepFailPath(formData.steps[selectedStepIdx])[0]?.return_to_step || '')} 
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setFormData(prev => {
                                            const steps = prev.steps.map(s => ({ ...s }));
                                            if (!steps[selectedStepIdx]) return prev;
                                            const currentStep = steps[selectedStepIdx];
                                            const failPath = [...getStepFailPath(currentStep)];
                                            if (val === 'new_step') {
                                              const nextStepNum = steps.length + 1;
                                              const newStep = {
                                                step_number: nextStepNum,
                                                name: `Bước mới ${nextStepNum}`,
                                                node_type: 'task',
                                                assignee_role: 'QC',
                                                transition: null,
                                                fail_path: []
                                              };
                                              steps.push(newStep);
                                              let newFailPath;
                                              if (failPath.length === 0) {
                                                newFailPath = [{ name: "Không đồng ý", assignee_role: currentStep.assignee_role || 'QC', edge_label: "Không", return_to_step: nextStepNum }];
                                              } else {
                                                newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, return_to_step: nextStepNum } : { ...fp });
                                              }
                                              steps[selectedStepIdx] = { ...currentStep, fail_path: newFailPath, has_branch: true };
                                              setTimeout(() => setSelectedStepIdx(steps.length - 1), 0);
                                              return { ...prev, steps };
                                            } else if (val === 'custom') {
                                              let newFailPath;
                                              if (failPath.length === 0) {
                                                newFailPath = [{ name: "Hủy bỏ / Trả hàng", assignee_role: currentStep.assignee_role || 'QC', edge_label: "Không", return_to_step: null, node_type: "terminal" }];
                                              } else {
                                                newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, return_to_step: null, node_type: "terminal", name: fp.name || "Hủy bỏ / Trả hàng" } : { ...fp });
                                              }
                                              steps[selectedStepIdx] = { ...currentStep, has_branch: true, fail_path: newFailPath };
                                              return { ...prev, steps };
                                            } else if (val === '') {
                                              steps[selectedStepIdx] = { ...currentStep, fail_path: [], has_branch: false };
                                              return { ...prev, steps };
                                            } else {
                                              const stepNum = parseInt(val);
                                              let newFailPath;
                                              if (failPath.length === 0) {
                                                newFailPath = [{ name: "Xử lý lỗi", assignee_role: currentStep.assignee_role || 'QC', edge_label: "Không", return_to_step: stepNum }];
                                              } else {
                                                newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, return_to_step: stepNum } : { ...fp });
                                              }
                                              steps[selectedStepIdx] = { ...currentStep, has_branch: true, fail_path: newFailPath };
                                              return { ...prev, steps };
                                            }
                                          });
                                        }}
                                        style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.74rem', backgroundColor:'white', color: '#7B5233', fontWeight: 'bold' }}
                                      >
                                        <option value="">-- Chọn bước --</option>
                                        <option value="new_step">➕ Tạo bước mới...</option>
                                        <option value="custom">✍️ Kết quả tùy chỉnh...</option>
                                        {formData.steps.map((s, idx) => (
                                          <option key={idx} value={s.step_number}>{stepDisplayLabels[s.step_number] || `B${s.step_number}`}: {s.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  {/* Custom config for Yes outcome */}
                                  {formData.steps[selectedStepIdx]?.transition?.next_step === null && (
                                    <div style={{ borderTop: '1px solid #EADCC9', paddingTop: '6px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                                      <div>
                                        <label style={{ fontSize: '0.66rem', fontWeight: 'bold', color: '#16a34a', display: 'block', marginBottom: '2px' }}>Nhãn kết quả (Yes):</label>
                                        <input
                                          type="text"
                                          value={formData.steps[selectedStepIdx].transition.name || ''}
                                          onChange={(e) => {
                                            setFormData(prev => {
                                              const steps = prev.steps.map(s => ({ ...s }));
                                              if (steps[selectedStepIdx]?.transition) {
                                                steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { ...steps[selectedStepIdx].transition, name: e.target.value } };
                                                return { ...prev, steps };
                                              }
                                              return prev;
                                            });
                                          }}
                                          placeholder="Ví dụ: Hoàn tất, Chấp nhận..."
                                          style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem' }}
                                        />
                                      </div>
                                      <div>
                                        <label style={{ fontSize: '0.66rem', fontWeight: 'bold', color: '#16a34a', display: 'block', marginBottom: '2px' }}>Hình khối:</label>
                                        <select
                                          value={formData.steps[selectedStepIdx].transition.node_type || 'terminal'}
                                          onChange={(e) => {
                                            setFormData(prev => {
                                              const steps = prev.steps.map(s => ({ ...s }));
                                              if (steps[selectedStepIdx]?.transition) {
                                                steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { ...steps[selectedStepIdx].transition, node_type: e.target.value } };
                                                return { ...prev, steps };
                                              }
                                              return prev;
                                            });
                                          }}
                                          style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem', backgroundColor:'white' }}
                                        >
                                          <option value="terminal">Pill (Kết thúc)</option>
                                          <option value="task">Hình chữ nhật (Công việc)</option>
                                          <option value="decision">Hình thoi (Quyết định)</option>
                                        </select>
                                      </div>
                                    </div>
                                  )}

                                  {/* Custom config for No outcome */}
                                  {getStepFailPath(formData.steps[selectedStepIdx])[0] && getStepFailPath(formData.steps[selectedStepIdx])[0].return_to_step === null && (
                                    <div style={{ borderTop: '1px solid #EADCC9', paddingTop: '6px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                                      <div>
                                        <label style={{ fontSize: '0.66rem', fontWeight: 'bold', color: '#dc2626', display: 'block', marginBottom: '2px' }}>Nhãn kết quả (No):</label>
                                        <input
                                          type="text"
                                          value={getStepFailPath(formData.steps[selectedStepIdx])[0].name || ''}
                                          onChange={(e) => {
                                            setFormData(prev => {
                                              const steps = prev.steps.map(s => ({ ...s }));
                                              const failPath = [...getStepFailPath(steps[selectedStepIdx])];
                                              if (failPath[0]) {
                                                const newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, name: e.target.value } : { ...fp });
                                                steps[selectedStepIdx] = { ...steps[selectedStepIdx], fail_path: newFailPath };
                                                return { ...prev, steps };
                                              }
                                              return prev;
                                            });
                                          }}
                                          placeholder="Ví dụ: Hủy bỏ, Trả hàng NCC..."
                                          style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem' }}
                                        />
                                      </div>
                                      <div>
                                        <label style={{ fontSize: '0.66rem', fontWeight: 'bold', color: '#dc2626', display: 'block', marginBottom: '2px' }}>Hình khối:</label>
                                        <select
                                          value={getStepFailPath(formData.steps[selectedStepIdx])[0].node_type || 'terminal'}
                                          onChange={(e) => {
                                            setFormData(prev => {
                                              const steps = prev.steps.map(s => ({ ...s }));
                                              const failPath = [...getStepFailPath(steps[selectedStepIdx])];
                                              if (failPath[0]) {
                                                const newFailPath = failPath.map((fp, i) => i === 0 ? { ...fp, node_type: e.target.value } : { ...fp });
                                                steps[selectedStepIdx] = { ...steps[selectedStepIdx], fail_path: newFailPath };
                                                return { ...prev, steps };
                                              }
                                              return prev;
                                            });
                                          }}
                                          style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem', backgroundColor:'white' }}
                                        >
                                          <option value="terminal">Pill (Kết thúc)</option>
                                          <option value="task">Hình chữ nhật (Công việc)</option>
                                          <option value="decision">Hình thoi (Quyết định)</option>
                                        </select>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {formData.steps[selectedStepIdx].node_type === 'condition' && (
                                <div style={{ backgroundColor: '#FAF6F0', padding: '10px 14px', borderRadius: '6px', border: '1px solid #EADCC9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#7B5233' }}>Nhánh điều kiện rẽ hướng:</span>
                                  
                                  {getStepFailPath(formData.steps[selectedStepIdx]).map((branch, branchIdx) => (
                                    <div key={branchIdx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                                      <div>
                                        <input 
                                          type="text" 
                                          value={branch.name || ''} 
                                          onChange={(e) => {
                                            const steps = [...formData.steps];
                                            const failPath = [...getStepFailPath(steps[selectedStepIdx])];
                                            failPath[branchIdx] = { ...failPath[branchIdx], name: e.target.value };
                                            steps[selectedStepIdx].fail_path = failPath;
                                            setFormData({ ...formData, steps });
                                          }}
                                          placeholder="Nhập điều kiện..." 
                                          style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem' }} 
                                        />
                                      </div>
                                      <div>
                                        <select 
                                          value={branch.return_to_step || ''} 
                                          onChange={(e) => {
                                            const steps = [...formData.steps];
                                            const failPath = [...getStepFailPath(steps[selectedStepIdx])];
                                            failPath[branchIdx] = { ...failPath[branchIdx], return_to_step: parseInt(e.target.value) };
                                            steps[selectedStepIdx].fail_path = failPath;
                                            setFormData({ ...formData, steps });
                                          }}
                                          style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.72rem', backgroundColor:'white' }}
                                        >
                                          <option value="">-- Chọn --</option>
                                          {formData.steps.map((s, idx) => (
                                            <option key={idx} value={s.step_number}>{stepDisplayLabels[s.step_number] || `B${s.step_number}`}: {s.name}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const steps = [...formData.steps];
                                          const failPath = getStepFailPath(steps[selectedStepIdx]).filter((_, bIdx) => bIdx !== branchIdx);
                                          steps[selectedStepIdx].fail_path = failPath;
                                          setFormData({ ...formData, steps });
                                        }}
                                        style={{ border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  ))}

                                  <button 
                                    onClick={() => {
                                      const steps = [...formData.steps];
                                      const failPath = [...getStepFailPath(steps[selectedStepIdx])];
                                      failPath.push({ name: '', assignee_role: steps[selectedStepIdx].assignee_role || 'QC', return_to_step: null });
                                      steps[selectedStepIdx].fail_path = failPath;
                                      steps[selectedStepIdx].has_branch = true;
                                      setFormData({ ...formData, steps });
                                    }}
                                    style={{
                                      alignSelf: 'flex-start',
                                      padding: '2px 8px',
                                      fontSize: '9px',
                                      border: '1px dashed #7B5233',
                                      backgroundColor: 'white',
                                      color: '#7B5233',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontWeight: 'bold',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '2px'
                                    }}
                                  >
                                    <Plus size={10} /> Thêm nhánh điều kiện
                                  </button>
                                </div>
                              )}



                              {/* Bước tiếp theo (Transition) configuration for normal task steps */}
                              {formData.steps[selectedStepIdx].node_type !== 'decision' && formData.steps[selectedStepIdx].node_type !== 'condition' && formData.steps[selectedStepIdx].node_type !== 'terminal' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: '#FAF6F0', padding: '10px 14px', borderRadius: '6px', border: '1px solid #EADCC9' }}>
                                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#7B5233', display: 'block' }}>Bước tiếp theo:</label>
                                  <select
                                    value={formData.steps[selectedStepIdx].transition?.next_step === null ? 'custom' : (formData.steps[selectedStepIdx].transition?.next_step || '')}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFormData(prev => {
                                        const steps = prev.steps.map(s => ({ ...s }));
                                        if (!steps[selectedStepIdx]) return prev;
                                        if (val === 'new_step') {
                                          const nextStepNum = steps.length + 1;
                                          const newStep = {
                                            step_number: nextStepNum,
                                            name: `Bước mới ${nextStepNum}`,
                                            node_type: 'task',
                                            assignee_role: 'QC',
                                            transition: null,
                                            fail_path: []
                                          };
                                          steps.push(newStep);
                                          steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { next_step: nextStepNum } };
                                          setTimeout(() => setSelectedStepIdx(steps.length - 1), 0);
                                          return { ...prev, steps };
                                        } else if (val === 'custom') {
                                          steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { next_step: null, name: "Hoàn tất", node_type: "terminal" } };
                                          return { ...prev, steps };
                                        } else if (val === '') {
                                          steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: null };
                                          return { ...prev, steps };
                                        } else {
                                          steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { next_step: parseInt(val) } };
                                          return { ...prev, steps };
                                        }
                                      });
                                    }}
                                    style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.74rem', backgroundColor: 'white', color: '#7B5233', fontWeight: 'bold' }}
                                  >
                                    <option value="">-- Mặc định (bước tiếp theo) --</option>
                                    <option value="new_step">➕ Tạo bước mới...</option>
                                    <option value="custom">✍️ Kết quả tùy chỉnh...</option>
                                    {formData.steps.map((s, idx) => (
                                      <option key={idx} value={s.step_number}>{stepDisplayLabels[s.step_number] || `B${s.step_number}`}: {s.name}</option>
                                    ))}
                                  </select>
                                  
                                  {/* Custom outcome options for regular step if terminal */}
                                  {formData.steps[selectedStepIdx].transition?.next_step === null && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', marginTop: '4px' }}>
                                      <div>
                                        <label style={{ fontSize: '0.64rem', fontWeight: 'bold', color: '#16a34a', display: 'block', marginBottom: '2px' }}>Nhãn kết quả:</label>
                                        <input
                                          type="text"
                                          value={formData.steps[selectedStepIdx].transition.name || ''}
                                          onChange={(e) => {
                                            setFormData(prev => {
                                              const steps = prev.steps.map(s => ({ ...s }));
                                              if (steps[selectedStepIdx]?.transition) {
                                                steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { ...steps[selectedStepIdx].transition, name: e.target.value } };
                                                return { ...prev, steps };
                                              }
                                              return prev;
                                            });
                                          }}
                                          placeholder="Hoàn tất..."
                                          style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.7rem' }}
                                        />
                                      </div>
                                      <div>
                                        <label style={{ fontSize: '0.64rem', fontWeight: 'bold', color: '#16a34a', display: 'block', marginBottom: '2px' }}>Hình khối:</label>
                                        <select
                                          value={formData.steps[selectedStepIdx].transition.node_type || 'terminal'}
                                          onChange={(e) => {
                                            setFormData(prev => {
                                              const steps = prev.steps.map(s => ({ ...s }));
                                              if (steps[selectedStepIdx]?.transition) {
                                                steps[selectedStepIdx] = { ...steps[selectedStepIdx], transition: { ...steps[selectedStepIdx].transition, node_type: e.target.value } };
                                                return { ...prev, steps };
                                              }
                                              return prev;
                                            });
                                          }}
                                          style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.7rem', backgroundColor: 'white' }}
                                        >
                                          <option value="terminal">Pill (Kết thúc)</option>
                                          <option value="task">Hình chữ nhật (Công việc)</option>
                                        </select>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '2px' }}>Đính kèm tài liệu:</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    value={formData.steps[selectedStepIdx].template_files || ''}
                                    onChange={(e) => handleUpdateStep(selectedStepIdx, 'template_files', e.target.value)}
                                    placeholder="Tên file đính kèm..."
                                    style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.76rem' }}
                                  />
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <span style={{ padding: '2px 6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '9px', color: '#475569' }}>G7.CL.QTxxx</span>
                                    <span style={{ padding: '2px 6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '9px', color: '#475569' }}>G7.CL.QTXXa</span>
                                  </div>
                                </div>
                              </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bảng/Danh sách hướng dẫn chi tiết các bước (Ảnh 2) */}
                    <div 
                      id="steps-explanation-preview"
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: `1.5px solid ${cardBorderColor}`,
                        boxShadow: '0 4px 16px rgba(123, 82, 51, 0.05)',
                        padding: '16px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        marginTop: '16px'
                      }}
                    >
                      <div 
                        onClick={() => setExplanationExpanded(!explanationExpanded)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          borderBottom: explanationExpanded ? '2px solid #EADCC9' : 'none',
                          paddingBottom: explanationExpanded ? '8px' : '0',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <h3 style={{
                          fontSize: '0.95rem',
                          fontWeight: 'bold',
                          color: accentColor,
                          margin: 0,
                          textTransform: 'uppercase'
                        }}>
                          Giải thích chi tiết các bước quy trình
                        </h3>
                        {explanationExpanded ? (
                          <ChevronUp size={16} style={{ color: accentColor }} />
                        ) : (
                          <ChevronDown size={16} style={{ color: accentColor }} />
                        )}
                      </div>

                      {explanationExpanded && (
                        <div style={{
                          fontFamily: '"Times New Roman", Times, serif',
                          fontSize: '0.95rem',
                          lineHeight: '1.6',
                          color: '#000000',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          marginTop: '16px'
                        }}>
                          {formData.steps && formData.steps.length > 0 ? (
                            formData.steps.map((step, idx) => {
                              const stepLabel = (stepDisplayLabels[step.step_number] || '').replace(/^B/, 'Bước ') || `Bước ${step.step_number}`;
                              return (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '1rem', color: '#000000' }}>
                                    {stepLabel}: {step.name}
                                  </div>
                                  {step.instructions ? (
                                    <div 
                                      dangerouslySetInnerHTML={{ __html: step.instructions }} 
                                      style={{ paddingLeft: '16px', color: '#000000' }}
                                    />
                                  ) : (
                                    <div style={{ paddingLeft: '16px', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>
                                      (Chưa có giải thích cho bước này)
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                              Chưa có bước nào trong quy trình.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* RENDER RICH TEXT EDITOR */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                    {(() => {
                      const hint = getSectionHint(activeMenu);
                      if (!hint) return null;
                      return (
                        <div style={{
                          padding: '10px 14px',
                          backgroundColor: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          borderRadius: '6px',
                          color: '#1E40AF',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '6px',
                          lineHeight: '1.4'
                        }}>
                          <span style={{ fontSize: '1rem', lineHeight: '1' }}>💡</span>
                          <div>
                            <strong>Gợi ý từ tài liệu mẫu:</strong> {hint}
                          </div>
                        </div>
                      );
                    })()}
                    <RichTextEditor
                      value={formData.sections[activeMenu] || ''}
                      onChange={(val) => handleSectionChange(activeMenu, val)}
                      placeholder={getSectionHint(activeMenu) || `Nhập nội dung cho phần: ${activeMenu}...`}
                      style={{ flex: 1, minHeight: '420px' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
    </>
  );
};

export default ProcessContentTab;
