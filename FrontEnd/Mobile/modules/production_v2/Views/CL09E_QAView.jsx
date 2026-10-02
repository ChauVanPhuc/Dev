import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import { useInspectionFormBase } from '../Controllers/useInspectionFormBase'
import InspectionFormShell from './components/InspectionFormShell'
import InspectionResultBanner from './components/InspectionResultBanner'
import { INSPECT_MODES } from '../constants'

const CL09E_QAView = () => {
  const formState = useInspectionFormBase(INSPECT_MODES.QA)

  const {
    readOnly,
    mode,
    modeOptions,
    handleModeChange,
    staff,
    setStaff,
    staffOptions,
    qaQuestions,
    answers,
    setAnswers,
    showAnswers,
    setShowAnswers,
    qaResult,
    setQaResult,
  } = formState

  const questionsList = qaQuestions || []

  return (
    <InspectionFormShell
      title="Vấn đáp"
      subTitle="CL09.5: Phiếu kiểm tra vấn đáp"
      formState={formState}
    >
      {({ renderImageUploadArea }) => {
        const isStaffFilled = readOnly || Boolean(staff)
        return (
          <>
            <div className="pv2-field" style={{ marginBottom: 12 }}>
              <label>Tên nhân sự <span className="pv2-req">*</span></label>
              <CustomSelect
                value={staff}
                options={staffOptions || []}
                onChange={setStaff}
                disabled={readOnly}
                placeholder="Chọn hoặc nhập tên nhân sự..."
                allowCustomInput={true}
              />
            </div>

            {!isStaffFilled && !readOnly ? (
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
                👤 Vui lòng chọn nhân sự ở trên để hiển thị danh sách câu hỏi vấn đáp.
              </div>
            ) : (
              <div className="pv2-fade-in">
                {questionsList.map((q, i) => (
                  <div key={i} className="pv2-field" style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label>{q.q || `Câu hỏi ${i + 1}`}:</label>
                      <button type="button" className="pv2-link-underline" onClick={() => setShowAnswers((prev) => prev.map((v, idx) => (idx === i ? !v : v)))}>
                        {showAnswers[i] ? 'Ẩn đáp án' : 'Xem đáp án'}
                      </button>
                    </div>
                    {showAnswers[i] && <div className="pv2-qa-answer">{q.answer}</div>}
                    <textarea
                      className={`pv2-textarea ${readOnly ? 'pv2-input--disabled' : ''}`}
                      rows={2}
                      value={answers[i] || ''}
                      onChange={(e) => setAnswers((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                      disabled={readOnly}
                      placeholder="Nhập câu trả lời hoặc ghi nhận đánh giá..."
                    />
                  </div>
                ))}

                <InspectionResultBanner
                  result={qaResult}
                  onResultChange={setQaResult}
                  disabled={readOnly}
                  showDefectCount={false}
                  options={[
                    { value: 'excellent', label: '★ Xuất sắc', activeBg: '#8b5cf6', activeColor: '#ffffff' },
                    { value: 'pass', label: '✓ Đạt', activeBg: '#10b981', activeColor: '#ffffff' },
                    { value: 'fail', label: '✕ K.đạt', activeBg: '#ef4444', activeColor: '#ffffff' },
                  ]}
                />

                {renderImageUploadArea()}
              </div>
            )}
          </>
        )
      }}
    </InspectionFormShell>
  )
}

export default CL09E_QAView
