import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import { useInspectionFormBase } from '../Controllers/useInspectionFormBase'
import InspectionFormShell from './components/InspectionFormShell'
import InspectionStepsTable from './components/InspectionStepsTable'
import { INSPECT_MODES } from '../constants'

const CL09D_ProcessView = () => {
  const formState = useInspectionFormBase(INSPECT_MODES.PROCESS)

  const {
    readOnly,
    mode,
    modeOptions,
    handleModeChange,
    process,
    setProcess,
    processOptions,
    area,
    setArea,
    stageOptions,
    result,
    setResult,
    steps,
    handleStepResultChange,
    note,
    setNote,
  } = formState

  return (
    <InspectionFormShell
      title="Kiểm tra quy trình"
      subTitle="CL09.4: Phiếu kiểm tra quy trình"
      formState={formState}
    >
      {({ renderImageUploadArea }) => (
        <>
          <div className="pv2-field-row pv2-field-row--2col" style={{ marginBottom: 12 }}>
            <div className="pv2-field">
              <label>Chọn quy trình <span className="pv2-req">*</span></label>
              <CustomSelect value={process} options={processOptions} onChange={setProcess} disabled={readOnly} />
            </div>
            <div className="pv2-field">
              <label>Chọn khu vực kiểm tra <span className="pv2-req">*</span></label>
              <CustomSelect value={area} options={stageOptions.map(o => o.value === '' ? { value: '', label: 'Chọn khu vực' } : o)} onChange={setArea} disabled={readOnly} />
            </div>
          </div>

          <div className="pv2-field" style={{ marginBottom: 12 }}>
            <label>Kết quả <span className="pv2-req">*</span></label>
            <div className="pv2-radio-group">
              <label className="pv2-radio-label">
                <input type="radio" name="res_proc" checked={result === 'pass'} onChange={() => setResult('pass')} disabled={readOnly} /> Đạt
              </label>
              <label className="pv2-radio-label">
                <input type="radio" name="res_proc" checked={result === 'fail'} onChange={() => setResult('fail')} disabled={readOnly} /> Không đạt
              </label>
            </div>
          </div>

          <div className="pv2-section-title">Các bước của quy trình</div>
          <InspectionStepsTable steps={steps} onStepChange={handleStepResultChange} disabled={readOnly} mode={mode} processSelected={process} />

          {renderImageUploadArea()}

          <div className="pv2-field">
            <label>Ghi chú</label>
            <textarea
              className={`pv2-textarea ${readOnly ? 'pv2-input--disabled' : ''}`}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={readOnly}
            />
          </div>
        </>
      )}
    </InspectionFormShell>
  )
}

export default CL09D_ProcessView
