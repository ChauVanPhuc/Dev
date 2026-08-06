import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ImagePlus, X, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import { useInspectionController, useInspectionDetail } from '../Controllers/useInspectionController'
import InspectionStepsTable from './components/InspectionStepsTable'
import ErrorTrendRow from './components/ErrorTrendRow'
import ConfirmErrorQtyModal from './components/ConfirmErrorQtyModal'
import FinishInspectionModal from './components/FinishInspectionModal'
import {
  INSPECT_MODE_OPTIONS, INSPECT_MODES, MOCK_STAGE_OPTIONS,
  MOCK_PO_OPTIONS, MOCK_PRODUCTS, MOCK_PARAMETER_OPTIONS,
  MOCK_PROCESS_OPTIONS, MOCK_AREA_OPTIONS, MOCK_STAFF_OPTIONS,
  ROUTES,
} from '../constants'
import '../styles/production_v2.css'

const stageOpts = [{ value: '', label: 'Chọn công đoạn' }, ...MOCK_STAGE_OPTIONS]
const poOpts = [{ value: '', label: 'Chọn PO' }, ...MOCK_PO_OPTIONS]
const productOpts = [{ value: '', label: 'Chọn sản phẩm' }, ...MOCK_PRODUCTS]
const paramOpts = [{ value: '', label: 'Chọn thông số' }, ...MOCK_PARAMETER_OPTIONS]
const processOpts = [{ value: '', label: 'Chọn quy trình' }, ...MOCK_PROCESS_OPTIONS]
const areaOpts = [{ value: '', label: 'Chọn khu vực' }, ...MOCK_AREA_OPTIONS]
const staffOpts = [{ value: '', label: 'Chọn nhân sự' }, ...MOCK_STAFF_OPTIONS]

const initErrors = () => [{ id: 1, name: '', qty: 0 }]

const CL09_InspectionCreateView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'NEW'
  const { createTicket } = useInspectionController()
  const { ticket, loading, steps, setSteps, images, addImage, removeImage, loadGuide, getLastResult } =
    useInspectionDetail(isNew ? null : id)

  const [mode, setMode] = useState(INSPECT_MODES.FIRST_SAMPLE)
  const [stage, setStage] = useState('')
  const [po, setPo] = useState('')
  const [result, setResult] = useState('pass')
  const [product, setProduct] = useState('')
  const [spec, setSpec] = useState('')
  const [sampleQty, setSampleQty] = useState('')
  const [errorQty, setErrorQty] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState(initErrors())

  const [parameter, setParameter] = useState('')
  const [paramStage, setParamStage] = useState('')
  const [paramPo, setParamPo] = useState('')
  const [paramProduct, setParamProduct] = useState('')
  const [paramSample, setParamSample] = useState('')
  const [paramPass, setParamPass] = useState('')
  const [paramFail, setParamFail] = useState('')

  const [process, setProcess] = useState('')
  const [area, setArea] = useState('')

  const [staff, setStaff] = useState('')
  const [answers, setAnswers] = useState(['', '', ''])
  const [showAnswers, setShowAnswers] = useState([false, false, false])
  const [qaResult, setQaResult] = useState('pass')

  const [guideVisible, setGuideVisible] = useState(false)
  const [palletCode, setPalletCode] = useState('DA7819')
  const [confirmErrModal, setConfirmErrModal] = useState(false)
  const [finishModal, setFinishModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fileRef = useRef()

  useEffect(() => {
    if (product && stage && (mode === INSPECT_MODES.FIRST_SAMPLE || mode === INSPECT_MODES.RE_INSPECT)) {
      loadGuide(mode, product)
    }
  }, [mode, product, stage])

  const handleModeChange = (m) => {
    setMode(m)
    setSteps([])
    setErrors(initErrors())
  }

  const handleLoadLastResult = async () => {
    const res = await getLastResult(mode, product, po)
    if (res) { setSampleQty(String(res.sampleQty)); setErrorQty(String(res.errorQty)); setResult(res.result) }
  }

  const handleImagePick = async (e) => {
    for (const f of Array.from(e.target.files)) await addImage(f)
  }

  const addErrorRow = () => setErrors((p) => [...p, { id: Date.now(), name: '', qty: 0 }])
  const updateError = (idx, row) => setErrors((p) => p.map((r, i) => i === idx ? row : r))

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await createTicket({ mode, stage, po, result, product, spec, sampleQty, errorQty, note, errors })
      setFinishModal(true)
    } catch (e) {
      alert(e.message || 'Lỗi tạo phiếu')
      setSubmitting(false)
    }
  }

  const handleFinishConfirm = () => {
    setFinishModal(false)
    alert('Hoàn thành kiểm tra thành công')
    navigate(ROUTES.INSPECTION_LIST)
  }

  const ticketCode = isNew ? `KT${String(Date.now()).slice(-3)}` : id
  const summary = { poCode: po, result, product, spec, needQty: sampleQty, sampleQty, errorQty }

  const MOCK_QUESTIONS = [
    { q: 'Câu hỏi 1', answer: 'Đáp án câu 1...' },
    { q: 'Câu hỏi 2', answer: 'Đáp án câu 2...' },
    { q: 'Câu hỏi 3', answer: 'Đáp án câu 3...' },
  ]

  return (
    <Layout>
      <PageHeader title="Khởi tạo phiếu" subTitle="CL09: Tạo phiếu kiểm tra" showBack={true} />

      <div className="pv2-page pv2-page--form">
        <div className="pv2-form-card">
          <h1 className="pv2-form-heading">Thông Tin Kiểm Tra</h1>

          {/* Mode Selector + Extra Field at top of card */}
          <div className="pv2-field-row pv2-field-row--2col" style={{ marginBottom: 12 }}>
            <div className="pv2-field">
              <label>Chọn cách kiểm tra <span className="pv2-req">*</span></label>
              <CustomSelect value={mode} options={INSPECT_MODE_OPTIONS} onChange={handleModeChange} />
            </div>

            {mode === INSPECT_MODES.PARAMETER ? (
              <div className="pv2-field">
                <label>Mã pallet</label>
                <CustomSelect value={palletCode} options={[{ value: 'DA7819', label: 'DA7819' }]} onChange={setPalletCode} />
              </div>
            ) : mode === INSPECT_MODES.PROCESS ? (
              <div className="pv2-field">
                <label>Chọn quy trình</label>
                <CustomSelect value={process} options={processOpts} onChange={setProcess} />
              </div>
            ) : mode === INSPECT_MODES.QA ? (
              <div className="pv2-field">
                <label>Tên nhân sự</label>
                <CustomSelect value={staff} options={staffOpts} onChange={setStaff} />
              </div>
            ) : (
              <div className="pv2-field">
                <label>Công đoạn</label>
                <CustomSelect value={stage} options={stageOpts} onChange={setStage} />
              </div>
            )}
          </div>

          {/* Ticket Meta Box */}
          <div className="pv2-ticket-meta">
            <div className="pv2-ticket-info">
              <div className="pv2-ticket-id">Phiếu: {ticketCode}</div>
              <div className="pv2-ticket-creator">Được tạo bởi: Nguyễn Văn A</div>
            </div>
            {mode === INSPECT_MODES.RE_INSPECT && (
              <button type="button" className="pv2-btn-pallet-view" onClick={handleLoadLastResult}>
                📄 Xuất kết quả gần nhất
              </button>
            )}
          </div>

          <div className="pv2-form">
            {/* MODE: FIRST_SAMPLE & RE_INSPECT */}
            {(mode === INSPECT_MODES.FIRST_SAMPLE || mode === INSPECT_MODES.RE_INSPECT) && (
              <>
                <div className="pv2-field-row pv2-field-row--2col">
                  <div className="pv2-field">
                    <label>Chọn PO <span className="pv2-req">*</span></label>
                    <CustomSelect value={po} options={poOpts} onChange={setPo} />
                  </div>
                  <div className="pv2-field">
                    <label>Kết quả <span className="pv2-req">*</span></label>
                    <div className="pv2-radio-group">
                      <label className="pv2-radio-label">
                        <input type="radio" name="res" checked={result === 'pass'} onChange={() => setResult('pass')} /> Đạt
                      </label>
                      <label className="pv2-radio-label">
                        <input type="radio" name="res" checked={result === 'fail'} onChange={() => setResult('fail')} /> Không đạt
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pv2-field-row pv2-field-row--2col">
                  <div className="pv2-field">
                    <label>Sản phẩm <span className="pv2-req">*</span></label>
                    <CustomSelect value={product} options={productOpts} onChange={setProduct} />
                  </div>
                  <div className="pv2-field">
                    <label>Quy cách</label>
                    <CustomSelect value={spec} options={[{ value: '', label: '' }]} onChange={setSpec} />
                  </div>
                </div>

                <div className="pv2-field-row pv2-field-row--3col">
                  <div className="pv2-field">
                    <label>SL Cần Kiểm</label>
                    <input type="text" className="pv2-input pv2-input--disabled" readOnly disabled value="" placeholder="" />
                  </div>
                  <div className="pv2-field">
                    <label>SL mẫu <span className="pv2-req">*</span></label>
                    <input type="number" className="pv2-input" value={sampleQty} onChange={(e) => setSampleQty(e.target.value)} placeholder="134" />
                  </div>
                  <div className="pv2-field">
                    <label>Lỗi (nếu có)</label>
                    <input type="number" className="pv2-input pv2-input--disabled" value={errorQty} onChange={(e) => setErrorQty(e.target.value)} disabled />
                  </div>
                </div>

                <div className="pv2-section-title">Hướng dẫn kiểm tra</div>
                <InspectionStepsTable steps={steps} />

                <div className="pv2-upload-area">
                  <button type="button" className="pv2-btn-add-image-link" onClick={() => fileRef.current.click()}>
                    <span className="pv2-plus-icon">+</span> Thêm ảnh kiểm tra
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleImagePick} />

                  {images.length > 0 && (
                    <div className="pv2-image-preview-row">
                      {images.map((src, i) => (
                        <div key={i} className="pv2-img-thumb">
                          <img src={src} alt="" />
                          <button type="button" className="pv2-img-remove" onClick={() => removeImage(i)}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pv2-field">
                  <label>Ghi chú</label>
                  <textarea className="pv2-textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>

                <div className="pv2-error-section">
                  <div className="pv2-section-title">Theo dõi xu hướng lỗi</div>
                  <div className="pv2-error-table-header">
                    <span>Tên lỗi</span>
                    <span>SL Ghi nhận</span>
                  </div>
                  {errors.map((row, idx) => (
                    <ErrorTrendRow key={row.id} row={row} onChange={(r) => updateError(idx, r)} />
                  ))}
                  <button type="button" className="pv2-btn-add-image-link" onClick={addErrorRow} style={{ marginTop: 6 }}>
                    <span className="pv2-plus-icon">+</span> Ghi nhận lỗi khác
                  </button>
                </div>
              </>
            )}

            {/* MODE: PARAMETER */}
            {mode === INSPECT_MODES.PARAMETER && (
              <>
                <div className="pv2-field-row pv2-field-row--2col">
                  <div className="pv2-field">
                    <label>Chọn thông số <span className="pv2-req">*</span></label>
                    <CustomSelect value={parameter} options={paramOpts} onChange={setParameter} />
                  </div>
                  <div className="pv2-field">
                    <label>Công đoạn <span className="pv2-req">*</span></label>
                    <CustomSelect value={paramStage} options={stageOpts} onChange={setParamStage} />
                  </div>
                </div>

                <div className="pv2-field-row pv2-field-row--2col">
                  <div className="pv2-field">
                    <label>PO <span className="pv2-req">*</span></label>
                    <CustomSelect value={paramPo} options={poOpts} onChange={setParamPo} />
                  </div>
                  <div className="pv2-field">
                    <label>Sản phẩm <span className="pv2-req">*</span></label>
                    <CustomSelect value={paramProduct} options={productOpts} onChange={setParamProduct} />
                  </div>
                </div>

                <div className="pv2-field-row pv2-field-row--3col">
                  <div className="pv2-field">
                    <label>SL mẫu <span className="pv2-req">*</span></label>
                    <input type="number" className="pv2-input" value={paramSample} onChange={(e) => setParamSample(e.target.value)} placeholder="134" />
                  </div>
                  <div className="pv2-field">
                    <label>SL đạt</label>
                    <input type="number" className="pv2-input pv2-input--disabled" value={paramPass} onChange={(e) => setParamPass(e.target.value)} disabled />
                  </div>
                  <div className="pv2-field">
                    <label>SL không đạt</label>
                    <input type="number" className="pv2-input pv2-input--disabled" value={paramFail} onChange={(e) => setParamFail(e.target.value)} disabled />
                  </div>
                </div>

                <button type="button" className="pv2-btn-dark-pill" onClick={() => setGuideVisible((v) => !v)}>
                  👁 Xem hướng dẫn kiểm tra
                </button>

                {guideVisible && <InspectionStepsTable steps={steps} />}

                <div className="pv2-upload-area">
                  <button type="button" className="pv2-btn-add-image-link" onClick={() => fileRef.current.click()}>
                    <span className="pv2-plus-icon">+</span> Thêm ảnh kiểm tra
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleImagePick} />
                </div>

                <div className="pv2-field">
                  <label>Kết quả <span className="pv2-req">*</span></label>
                  <div className="pv2-radio-group">
                    <label className="pv2-radio-label">
                      <input type="radio" name="res_param" checked={result === 'pass'} onChange={() => setResult('pass')} /> Đạt
                    </label>
                    <label className="pv2-radio-label">
                      <input type="radio" name="res_param" checked={result === 'fail'} onChange={() => setResult('fail')} /> Không đạt
                    </label>
                  </div>
                </div>

                <div className="pv2-field">
                  <label>Ghi chú</label>
                  <textarea className="pv2-textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>

                <div className="pv2-error-section">
                  <div className="pv2-section-title">Theo dõi xu hướng lỗi</div>
                  <div className="pv2-error-table-header">
                    <span>Tên lỗi</span>
                    <span>SL Ghi nhận</span>
                  </div>
                  {errors.map((row, idx) => (
                    <ErrorTrendRow key={row.id} row={row} onChange={(r) => updateError(idx, r)} />
                  ))}
                  <button type="button" className="pv2-btn-add-image-link" onClick={addErrorRow} style={{ marginTop: 6 }}>
                    <span className="pv2-plus-icon">+</span> Ghi nhận lỗi khác
                  </button>
                </div>
              </>
            )}

            {/* MODE: PROCESS */}
            {mode === INSPECT_MODES.PROCESS && (
              <>
                <div className="pv2-field-row pv2-field-row--2col">
                  <div className="pv2-field">
                    <label>Chọn khu vực kiểm tra <span className="pv2-req">*</span></label>
                    <CustomSelect value={area} options={areaOpts} onChange={setArea} />
                  </div>
                  <div className="pv2-field">
                    <label>Kết quả <span className="pv2-req">*</span></label>
                    <div className="pv2-radio-group">
                      <label className="pv2-radio-label">
                        <input type="radio" name="res_proc" checked={result === 'pass'} onChange={() => setResult('pass')} /> Đạt
                      </label>
                      <label className="pv2-radio-label">
                        <input type="radio" name="res_proc" checked={result === 'fail'} onChange={() => setResult('fail')} /> Không đạt
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pv2-section-title">Các bước của quy trình</div>
                <InspectionStepsTable steps={steps} />

                <div className="pv2-upload-area">
                  <button type="button" className="pv2-btn-add-image-link" onClick={() => fileRef.current.click()}>
                    <span className="pv2-plus-icon">+</span> Thêm ảnh kiểm tra
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleImagePick} />
                </div>

                <div className="pv2-field">
                  <label>Ghi chú</label>
                  <textarea className="pv2-textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
              </>
            )}

            {/* MODE: QA */}
            {mode === INSPECT_MODES.QA && (
              <>
                {MOCK_QUESTIONS.map((q, i) => (
                  <div key={i} className="pv2-field" style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label>{q.q}:</label>
                      <button type="button" className="pv2-link-underline" onClick={() => setShowAnswers((prev) => prev.map((v, idx) => idx === i ? !v : v))}>
                        {showAnswers[i] ? 'Ẩn đáp án' : 'Xem đáp án'}
                      </button>
                    </div>
                    {showAnswers[i] && <div className="pv2-qa-answer">{q.answer}</div>}
                    <textarea
                      className="pv2-textarea"
                      rows={2}
                      value={answers[i]}
                      onChange={(e) => setAnswers((prev) => prev.map((v, idx) => idx === i ? e.target.value : v))}
                    />
                  </div>
                ))}

                <div className="pv2-field">
                  <label>Kết quả <span className="pv2-req">*</span></label>
                  <div className="pv2-radio-group">
                    <label className="pv2-radio-label">
                      <input type="radio" name="res_qa" checked={qaResult === 'excellent'} onChange={() => setQaResult('excellent')} /> Xuất sắc
                    </label>
                    <label className="pv2-radio-label">
                      <input type="radio" name="res_qa" checked={qaResult === 'pass'} onChange={() => setQaResult('pass')} /> Đạt
                    </label>
                    <label className="pv2-radio-label">
                      <input type="radio" name="res_qa" checked={qaResult === 'fail'} onChange={() => setQaResult('fail')} /> Không đạt
                    </label>
                  </div>
                </div>

                <div className="pv2-card-actions" style={{ marginTop: 16 }}>
                  <button type="button" className="pv2-btn-cancel" onClick={() => navigate(ROUTES.INSPECTION_LIST)}>
                    Hủy bỏ
                  </button>
                  <button type="button" className="pv2-btn-submit" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Đang lưu...' : 'Xác nhận'}
                  </button>
                </div>
              </>
            )}

            {mode !== INSPECT_MODES.QA && (
              <div className="pv2-card-actions">
                <button type="button" className="pv2-btn-cancel" onClick={() => navigate(ROUTES.INSPECTION_LIST)}>
                  Hủy bỏ
                </button>
                <button type="button" className="pv2-btn-submit" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Đang lưu...' : 'Xác nhận'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmErrorQtyModal
        open={confirmErrModal}
        onConfirm={(data) => { setConfirmErrModal(false); setSampleQty(String(data.sampleQty)); setErrorQty(String(data.errorQty)) }}
        onClose={() => setConfirmErrModal(false)}
      />

      <FinishInspectionModal
        open={finishModal}
        summary={summary}
        palletCode={palletCode}
        onConfirm={handleFinishConfirm}
        onClose={() => setFinishModal(false)}
        onCreatePallet={() => setPalletCode(`DA${Math.floor(Math.random() * 90000 + 10000)}`)}
      />
    </Layout>
  )
}

export default CL09_InspectionCreateView
