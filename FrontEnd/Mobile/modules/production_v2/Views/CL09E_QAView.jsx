import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import { useInspectionFormBase } from '../Controllers/useInspectionFormBase'
import InspectionFormShell from './components/InspectionFormShell'
import { INSPECT_MODES, MOCK_STAFF_OPTIONS } from '../constants'

const staffOpts = [{ value: '', label: 'Chọn nhân sự' }, ...MOCK_STAFF_OPTIONS]

const MOCK_QUESTIONS = [
  { q: 'Câu hỏi 1', answer: 'Đáp án câu 1...' },
  { q: 'Câu hỏi 2', answer: 'Đáp án câu 2...' },
  { q: 'Câu hỏi 3', answer: 'Đáp án câu 3...' },
]

const CL09E_QAView = () => {
  const formState = useInspectionFormBase(INSPECT_MODES.QA)

  const {
    readOnly,
    mode,
    modeOptions,
    handleModeChange,
    staff,
    setStaff,
    answers,
    setAnswers,
    showAnswers,
    setShowAnswers,
    qaResult,
    setQaResult,
  } = formState

  return (
    <InspectionFormShell
      title="Vấn đáp"
      subTitle="CL09.5: Phiếu kiểm tra vấn đáp"
      formState={formState}
    >
      {({ renderImageUploadArea }) => (
        <>
          <div className="pv2-field" style={{ marginBottom: 12 }}>
            <label>Tên nhân sự <span className="pv2-req">*</span></label>
            <CustomSelect value={staff} options={staffOpts} onChange={setStaff} disabled={readOnly} />
          </div>

          {MOCK_QUESTIONS.map((q, i) => (
            <div key={i} className="pv2-field" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>{q.q}:</label>
                <button type="button" className="pv2-link-underline" onClick={() => setShowAnswers((prev) => prev.map((v, idx) => (idx === i ? !v : v)))}>
                  {showAnswers[i] ? 'Ẩn đáp án' : 'Xem đáp án'}
                </button>
              </div>
              {showAnswers[i] && <div className="pv2-qa-answer">{q.answer}</div>}
              <textarea
                className={`pv2-textarea ${readOnly ? 'pv2-input--disabled' : ''}`}
                rows={2}
                value={answers[i]}
                onChange={(e) => setAnswers((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                disabled={readOnly}
              />
            </div>
          ))}

          <div className="pv2-field">
            <label>Kết quả <span className="pv2-req">*</span></label>
            <div className="pv2-radio-group">
              <label className="pv2-radio-label">
                <input type="radio" name="res_qa" checked={qaResult === 'excellent'} onChange={() => setQaResult('excellent')} disabled={readOnly} /> Xuất sắc
              </label>
              <label className="pv2-radio-label">
                <input type="radio" name="res_qa" checked={qaResult === 'pass'} onChange={() => setQaResult('pass')} disabled={readOnly} /> Đạt
              </label>
              <label className="pv2-radio-label">
                <input type="radio" name="res_qa" checked={qaResult === 'fail'} onChange={() => setQaResult('fail')} disabled={readOnly} /> Không đạt
              </label>
            </div>
          </div>

          {renderImageUploadArea()}
        </>
      )}
    </InspectionFormShell>
  )
}

export default CL09E_QAView
