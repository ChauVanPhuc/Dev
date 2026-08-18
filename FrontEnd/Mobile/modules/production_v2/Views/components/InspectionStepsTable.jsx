import React, { useState } from 'react'
import {
  X,
  Image as ImageIcon,
  Eye,
  Info,
  ChevronRight,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react'
import { getFullImageUrl } from '@shared/services/api'
import { FormattedTextView, stripHtml } from '@shared/utils/textFormatter'

const cleanTextSummary = (str) => {
  if (str === null || str === undefined) return ''
  const strVal = String(str)
  const cleaned = stripHtml(strVal)
  return String(cleaned).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

const InspectionStepsTable = ({ steps = [], onStepChange, sampleQty, disabled = false, mode = '', processSelected = '' }) => {
  const [selectedStepModal, setSelectedStepModal] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)

  const handleResultToggle = (idx, currentResult, e) => {
    if (disabled) return
    if (e) e.stopPropagation()
    const nextResult = currentResult === 'pass' ? 'fail' : 'pass'
    if (onStepChange) {
      onStepChange(idx, nextResult)
    }
  }

  const openDetail = (step, idx) => {
    setSelectedStepModal({ ...step, idx })
  }

  if (!steps || steps.length === 0) {
    if (mode === 'process' && !processSelected) {
      return (
        <div className="pv2-sop-empty-box" style={{ backgroundColor: '#FAF6F0', borderColor: '#EADCC9' }}>
          <Info size={20} className="pv2-sop-empty-icon" style={{ color: '#7B5233' }} />
          <div className="pv2-sop-empty-text">
            <strong style={{ color: '#7B5233' }}>💡 Vui lòng chọn Quy trình</strong>
            <span style={{ color: '#64748b' }}>Vui lòng chọn 1 quy trình ở mục "Chọn quy trình" phía trên để hiển thị danh sách các bước SOP.</span>
          </div>
        </div>
      )
    }

    if (mode === 'process' && processSelected) {
      return (
        <div className="pv2-sop-empty-box">
          <Info size={20} className="pv2-sop-empty-icon" />
          <div className="pv2-sop-empty-text">
            <strong>Quy trình chưa có bước SOP</strong>
            <span>Quy trình đã chọn hiện chưa được khai báo chi tiết các bước hướng dẫn trên hệ thống.</span>
          </div>
        </div>
      )
    }

    return (
      <div className="pv2-sop-empty-box">
        <Info size={20} className="pv2-sop-empty-icon" />
        <div className="pv2-sop-empty-text">
          <strong>Chưa có hướng dẫn SOP cụ thể</strong>
          <span>Hệ thống chưa gán quy trình SOP cho lựa chọn này.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="pv2-sop-container">
      {/* 5-Column SOP Table: Super Compact */}
      <div className="pv2-sop-table-wrap">
        <table className="pv2-table pv2-table--sop-grid">
          <thead style={{ backgroundColor: '#6c3314', color: '#ffffff' }}>
            <tr>
              <th style={{ width: '42px', textAlign: 'center', color: '#ffffff' }}>Bước</th>
              <th style={{ width: '38%', textAlign: 'left', color: '#ffffff' }}>Mô tả</th>
              <th style={{ textAlign: 'left', color: '#ffffff' }}>Tiêu chuẩn</th>
              <th style={{ width: '36px', textAlign: 'center', color: '#ffffff' }}>SL</th>
              <th style={{ width: '78px', textAlign: 'center', color: '#ffffff' }}>Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step, idx) => {
              const hasSubSteps = Array.isArray(step.sub_steps) && step.sub_steps.length > 0
              const hasImages = Array.isArray(step.images) && step.images.length > 0
              const stepResult = step.result || 'pass'
              const displayQty = step.qty || sampleQty || 1

              // Tên bước ngắn gọn (làm sạch HTML)
              const rawTitle = step.title || `Bước ${step.step_no || idx + 1}`
              const stepTitle = cleanTextSummary(rawTitle) || `Bước ${idx + 1}`

              // Tiêu chuẩn tóm tắt (làm sạch HTML)
              let shortStandard = ''
              if (hasSubSteps) {
                shortStandard = `${step.sub_steps.length} tiêu chuẩn con`
              } else {
                const rawText = step.standard || step.content || step.description || ''
                const cleanText = cleanTextSummary(rawText)
                if (cleanText) {
                  shortStandard = cleanText.length > 38 ? cleanText.substring(0, 38) + '...' : cleanText
                }
              }

              return (
                <tr
                  key={step.id || idx}
                  className={`pv2-sop-tr ${stepResult === 'fail' ? 'pv2-sop-tr--fail' : ''}`}
                >
                  {/* Cột 1: Bước */}
                  <td className="pv2-sop-td-step" style={{ textAlign: 'center' }}>
                    <span className="pv2-sop-step-num-text">{step.step_no || step.step || idx + 1}</span>
                  </td>

                  {/* Cột 2: Mô tả (Ngắn gọn, click xem popup) */}
                  <td
                    className="pv2-sop-td-desc pv2-sop-td--clickable"
                    onClick={() => openDetail(step, idx)}
                  >
                    <div className="pv2-sop-short-title">
                      {stepTitle}
                    </div>
                    <span className="pv2-sop-view-detail-hint">
                      Chi tiết <ChevronRight size={12} />
                    </span>
                  </td>

                  {/* Cột 3: Tiêu chuẩn (Ngắn gọn, click xem popup) */}
                  <td
                    className="pv2-sop-td-standard pv2-sop-td--clickable"
                    onClick={() => openDetail(step, idx)}
                  >
                    {hasSubSteps ? (
                      <span className="pv2-sop-substep-chip">
                        {step.sub_steps.length} tiêu chí chi tiết ›
                      </span>
                    ) : shortStandard ? (
                      <span className="pv2-sop-standard-preview">
                        {shortStandard}
                      </span>
                    ) : (
                      <span className="pv2-sop-empty-dash">-</span>
                    )}

                    {hasImages && (
                      <span className="pv2-sop-img-badge" title="Có ảnh mẫu SOP">
                        <ImageIcon size={11} /> {step.images.length}
                      </span>
                    )}
                  </td>

                  {/* Cột 4: SL */}
                  <td className="pv2-sop-td-qty" style={{ textAlign: 'center' }}>
                    <span className="pv2-sop-qty-num-text">{displayQty}</span>
                  </td>

                  {/* Cột 5: Kết quả (Đạt - xanh lá / Không đạt - đỏ) */}
                  <td className="pv2-sop-td-result" style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={(e) => !disabled && handleResultToggle(idx, stepResult, e)}
                      className={`pv2-sop-btn-res pv2-sop-btn-res--${stepResult}`}
                      style={disabled ? { cursor: 'default', opacity: 0.9 } : {}}
                      title={disabled ? undefined : "Chạm để chuyển trạng thái Đạt / Không đạt"}
                    >
                      {stepResult === 'pass' ? 'Đạt' : 'Không đạt'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── STEP DETAIL POPUP MODAL ────────────────────────── */}
      {selectedStepModal && (
        <div className="pv2-sop-modal-backdrop" onClick={() => setSelectedStepModal(null)}>
          <div className="pv2-sop-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="pv2-sop-modal-header">
              <div className="pv2-sop-modal-title-group">
                <span className="pv2-sop-modal-badge">
                  Bước {selectedStepModal.step_no || selectedStepModal.idx + 1}
                </span>
                <h3 className="pv2-sop-modal-title">
                  {cleanTextSummary(selectedStepModal.title || '').replace(/^Bước\s*\d+\s*[:\-]\s*/i, '') || `Chi tiết bước ${selectedStepModal.idx + 1}`}
                </h3>
              </div>
              <button
                type="button"
                className="pv2-sop-modal-close-btn"
                onClick={() => setSelectedStepModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="pv2-sop-modal-body">
              {/* Phần 1: Mô tả & Hướng dẫn thao tác */}
              {(selectedStepModal.content || selectedStepModal.description) && (
                <div className="pv2-sop-modal-sec">
                  <div className="pv2-sop-modal-sec-title">
                    <FileText size={14} />
                    <span>Mô tả & Hướng dẫn thao tác</span>
                  </div>
                  <div className="pv2-sop-modal-sec-box">
                    <FormattedTextView text={selectedStepModal.content || selectedStepModal.description} />
                  </div>
                </div>
              )}

              {/* Phần 2: Tiêu chuẩn / Các bước nhỏ chi tiết */}
              {Array.isArray(selectedStepModal.sub_steps) && selectedStepModal.sub_steps.length > 0 && (
                <div className="pv2-sop-modal-sec">
                  <div className="pv2-sop-modal-sec-title">
                    <Info size={14} />
                    <span>Tiêu chuẩn & Các tiêu chí chi tiết ({selectedStepModal.sub_steps.length})</span>
                  </div>
                  <div className="pv2-sop-modal-substeps-list">
                    {selectedStepModal.sub_steps.map((sub, sIdx) => (
                      <div key={sub.id || sIdx} className="pv2-sop-modal-substep-card">
                        <div className="pv2-sop-modal-substep-head">
                          <span className="pv2-sop-modal-substep-badge">
                            {sub.sub_step_no
                              ? `${selectedStepModal.step_no || selectedStepModal.idx + 1}.${sub.sub_step_no}`
                              : `${selectedStepModal.idx + 1}.${sIdx + 1}`}
                          </span>
                          <span className="pv2-sop-modal-substep-name">{sub.title || 'Tiêu chuẩn chi tiết'}</span>
                        </div>
                        {sub.content && (
                          <div className="pv2-sop-modal-substep-body">
                            <FormattedTextView text={sub.content} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Phần 3: Ảnh tiêu chuẩn mẫu SOP */}
              {Array.isArray(selectedStepModal.images) && selectedStepModal.images.length > 0 && (
                <div className="pv2-sop-modal-sec">
                  <div className="pv2-sop-modal-sec-title">
                    <ImageIcon size={14} />
                    <span>Ảnh tiêu chuẩn SOP ({selectedStepModal.images.length})</span>
                  </div>
                  <div className="pv2-sop-modal-images-grid">
                    {selectedStepModal.images.map((img, imgIdx) => (
                      <div
                        key={img.id || imgIdx}
                        className="pv2-sop-modal-thumb-box"
                        onClick={() => setSelectedImage(getFullImageUrl(img.image_url))}
                      >
                        <img src={getFullImageUrl(img.image_url)} alt="Ảnh tiêu chuẩn" />
                        <div className="pv2-sop-modal-thumb-overlay">
                          <Eye size={16} />
                          <span>Xem ảnh</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pv2-sop-modal-footer">
              <button
                type="button"
                className={`pv2-sop-modal-btn-res pv2-sop-modal-btn-res--${selectedStepModal.result || 'pass'}`}
                onClick={() => {
                  const currentRes = selectedStepModal.result || 'pass'
                  const nextRes = currentRes === 'pass' ? 'fail' : 'pass'
                  handleResultToggle(selectedStepModal.idx, currentRes)
                  setSelectedStepModal((prev) => ({ ...prev, result: nextRes }))
                }}
              >
                {selectedStepModal.result === 'fail' ? (
                  <>
                    <XCircle size={15} />
                    <span>Trạng thái: Không đạt</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Trạng thái: Đạt</span>
                  </>
                )}
              </button>
              <button
                type="button"
                className="pv2-sop-modal-btn-close"
                onClick={() => setSelectedStepModal(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ZOOM IMAGE MODAL ─────────────────────── */}
      {selectedImage && (
        <div className="pv2-sop-lightbox" onClick={() => setSelectedImage(null)}>
          <div className="pv2-sop-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="pv2-sop-lightbox-header">
              <span className="pv2-sop-lightbox-title">Ảnh tiêu chuẩn SOP</span>
              <button
                type="button"
                className="pv2-sop-lightbox-close"
                onClick={() => setSelectedImage(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="pv2-sop-lightbox-img-wrap">
              <img src={getFullImageUrl(selectedImage)} alt="SOP Reference Standard" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InspectionStepsTable



