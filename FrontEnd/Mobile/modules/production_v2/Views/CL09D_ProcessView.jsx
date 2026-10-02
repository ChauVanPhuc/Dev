import React, { useState, useMemo } from 'react'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import { useInspectionFormBase } from '../Controllers/useInspectionFormBase'
import InspectionFormShell from './components/InspectionFormShell'
import InspectionStepsTable from './components/InspectionStepsTable'
import InspectionResultBanner from './components/InspectionResultBanner'
import { INSPECT_MODES } from '../constants'
import { FileText, ChevronDown, ChevronUp, BookOpen, X } from 'lucide-react'

const CL09D_ProcessView = () => {
  const formState = useInspectionFormBase(INSPECT_MODES.PROCESS)

  const {
    readOnly,
    mode,
    process,
    setProcess,
    processOptions,
    result,
    setResult,
    steps,
    handleStepResultChange,
    note,
    setNote,
    currentGuide,
  } = formState

  const [expandedSection, setExpandedSection] = useState('')
  const [showFullDocModal, setShowFullDocModal] = useState(false)

  // Đọc danh sách các mục (sections) ĐỘNG HOÀN TOÀN từ Tab "Nội dung Quy trình" của CSDL
  const docSections = useMemo(() => {
    if (!currentGuide?.sections) return []
    return Object.entries(currentGuide.sections)
      .filter(([key, val]) => {
        if (!key || key.startsWith('__')) return false
        if (!val) return false
        const str = String(val).replace(/<[^>]*>/g, '').trim()
        return str !== ''
      })
      .map(([title, content], idx) => ({
        id: `sec_${idx}`,
        title,
        content: typeof content === 'string' ? content : JSON.stringify(content)
      }))
  }, [currentGuide])

  return (
    <InspectionFormShell
      title="Kiểm tra quy trình"
      subTitle="CL09.4: Phiếu kiểm tra quy trình"
      formState={formState}
    >
      {({ renderImageUploadArea }) => {
        const isProcessFilled = readOnly || Boolean(process)
        return (
          <>
            <div className="pv2-field" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ margin: 0 }}>Chọn quy trình ISO <span className="pv2-req">*</span></label>
                {Boolean(process) && docSections.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowFullDocModal(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'none',
                      border: 'none',
                      color: '#c97a3e',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '2px 4px',
                      textDecoration: 'underline'
                    }}
                  >
                    <BookOpen size={13} /> Xem toàn bộ văn bản
                  </button>
                )}
              </div>
              <CustomSelect
                value={process}
                options={processOptions}
                onChange={setProcess}
                disabled={readOnly}
                placeholder="Chọn hoặc nhập tên quy trình..."
                allowCustomInput={true}
              />
            </div>

            <InspectionResultBanner
              result={result}
              onResultChange={setResult}
              disabled={readOnly}
              showDefectCount={false}
            />

            {!isProcessFilled && !readOnly ? (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#FAF5EE',
                  borderRadius: '12px',
                  border: '1px dashed #D6C7B8',
                  textAlign: 'center',
                  color: '#78716C',
                  fontSize: '13px',
                  marginTop: '8px'
                }}
              >
                📋 Vui lòng chọn quy trình ISO ở trên để hiển thị nội dung và các bước kiểm tra chi tiết.
              </div>
            ) : (
              <div className="pv2-fade-in">
                {/* Khối 1: Mục lục nội dung văn bản quy trình (Động theo CSDL) */}
                {docSections.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8
                    }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#7B5233',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <FileText size={15} color="#7B5233" />
                        <span>Nội dung văn bản quy trình ({docSections.length} mục)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedSection(expandedSection === 'ALL' ? '' : 'ALL')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#c97a3e',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        {expandedSection === 'ALL' ? 'Thu gọn tất cả' : 'Mở tất cả'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {docSections.map((sec, idx) => {
                        const isExpanded = expandedSection === 'ALL' || expandedSection === sec.id
                        return (
                          <div
                            key={sec.id}
                            style={{
                              borderRadius: 8,
                              border: '1px solid #EADCC9',
                              backgroundColor: '#ffffff',
                              overflow: 'hidden',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                            }}
                          >
                            <div
                              onClick={() => setExpandedSection(isExpanded && expandedSection !== 'ALL' ? '' : sec.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '9px 12px',
                                backgroundColor: isExpanded ? '#FAF5EE' : '#FAF8F5',
                                cursor: 'pointer',
                                transition: 'background-color 0.15s'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: '#7B5233',
                                  backgroundColor: '#EADCC9',
                                  borderRadius: '4px',
                                  padding: '1px 6px'
                                }}>
                                  {idx + 1}
                                </span>
                                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#2d1a12' }}>
                                  {sec.title}
                                </span>
                              </div>
                              {isExpanded ? <ChevronUp size={15} color="#7B5233" /> : <ChevronDown size={15} color="#7B5233" />}
                            </div>

                            {isExpanded && (
                              <div
                                style={{
                                  padding: '10px 14px',
                                  fontSize: '12.5px',
                                  lineHeight: '1.6',
                                  color: '#334155',
                                  backgroundColor: '#ffffff',
                                  borderTop: '1px solid #FAF0E6'
                                }}
                                dangerouslySetInnerHTML={{ __html: sec.content }}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Khối 2: Các bước kiểm tra quy trình ISO (Mục 5. Nội dung) */}
                <div className="pv2-section-title">Các bước kiểm tra quy trình ISO</div>
                <InspectionStepsTable steps={steps} onStepChange={handleStepResultChange} disabled={readOnly} mode={mode} processSelected={process} />

                {renderImageUploadArea()}

                {readOnly && note ? (
                  <div className="pv2-field" style={{ marginTop: 12 }}>
                    <label>Ghi chú</label>
                    <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', color: '#334155', fontSize: '13.5px', whiteSpace: 'pre-wrap' }}>
                      {note}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Modal hiển thị toàn bộ văn bản quy trình */}
            {showFullDocModal && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.55)',
                  zIndex: 9999,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '12px'
                }}
                onClick={() => setShowFullDocModal(false)}
              >
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    width: '100%',
                    maxWidth: '540px',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    overflow: 'hidden'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#63391f',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', color: '#fed7aa', fontWeight: 600 }}>
                        {currentGuide?.code || 'TÀI LIỆU QUY TRÌNH ISO'}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>
                        {currentGuide?.name || 'Văn bản Quy trình'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFullDocModal(false)}
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      overflowY: 'auto',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}
                  >
                    {docSections.map((sec) => (
                      <div
                        key={sec.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: '#FAF5EE',
                            padding: '8px 12px',
                            fontWeight: 700,
                            color: '#7B5233',
                            fontSize: '13px',
                            borderBottom: '1px solid #EADCC9'
                          }}
                        >
                          {sec.title}
                        </div>
                        <div
                          style={{
                            padding: '10px 12px',
                            fontSize: '12.5px',
                            lineHeight: '1.6',
                            color: '#334155'
                          }}
                          dangerouslySetInnerHTML={{ __html: sec.content }}
                        />
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      padding: '10px 16px',
                      borderTop: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      justifyContent: 'flex-end'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowFullDocModal(false)}
                      style={{
                        padding: '6px 16px',
                        backgroundColor: '#63391f',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )
      }}
    </InspectionFormShell>
  )
}

export default CL09D_ProcessView
