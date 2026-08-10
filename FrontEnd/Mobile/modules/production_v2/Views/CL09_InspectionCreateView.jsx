import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ImagePlus, X, Plus, ChevronDown, ChevronUp, Eye, ArrowLeft, CheckCircle2 } from 'lucide-react'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import { useInspectionController, useInspectionDetail } from '../Controllers/useInspectionController'
import useAuthStore from '@modules/auth/Models/authModel'
import InspectionStepsTable from './components/InspectionStepsTable'
import ErrorTrendRow from './components/ErrorTrendRow'
import ConfirmErrorQtyModal from './components/ConfirmErrorQtyModal'
import FinishInspectionModal from './components/FinishInspectionModal'
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal'
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal'
import {
  INSPECT_MODE_OPTIONS, INSPECT_MODES, MOCK_PARAMETER_OPTIONS,
  MOCK_PROCESS_OPTIONS, MOCK_AREA_OPTIONS, MOCK_STAFF_OPTIONS,
  ROUTES,
} from '../constants'
import { stageService } from '../services/stageService'
import { orderService } from '../services/orderService'
import { inspectionService } from '../services/inspectionService'
import { getFullImageUrl } from '@shared/services/api'
import '../styles/production_v2.css'

const paramOpts = [{ value: '', label: 'Chọn thông số' }, ...MOCK_PARAMETER_OPTIONS]
const processOpts = [{ value: '', label: 'Chọn quy trình' }, ...MOCK_PROCESS_OPTIONS]
const areaOpts = [{ value: '', label: 'Chọn khu vực' }, ...MOCK_AREA_OPTIONS]
const staffOpts = [{ value: '', label: 'Chọn nhân sự' }, ...MOCK_STAFF_OPTIONS]

const initErrors = () => [{ id: 1, name: '', qty: 0 }]

const compactSpec = (spec) => {
  if (!spec) return ''
  const firstPart = String(spec).split(/\s*[-–—]\s*/)[0]?.trim() || ''
  return firstPart || spec
}

const CL09_InspectionCreateView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'NEW'
  const readOnly = !isNew

  const user = useAuthStore((state) => state.user)
  const creatorName = user?.full_name || user?.username || 'Nguyễn Văn A'
  const { createTicket, confirmTicket } = useInspectionController()
  const { ticket, loading, steps, setSteps, images, setImages, addImage, removeImage, loadGuide, getLastResult } =
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
  const [stageOptions, setStageOptions] = useState([{ value: '', label: 'Chọn công đoạn' }])
  const [processOptions, setProcessOptions] = useState([{ value: '', label: 'Chọn quy trình' }])
  const [poOptions, setPoOptions] = useState([{ value: '', label: 'Chọn PO' }])
  const [productOptions, setProductOptions] = useState([{ value: '', label: 'Chọn sản phẩm' }])
  const [specOptions, setSpecOptions] = useState([{ value: '', label: 'Chọn quy cách' }])
  const [bomData, setBomData] = useState([])
  const [requiredQty, setRequiredQty] = useState('')

  const [guideVisible, setGuideVisible] = useState(false)
  const [palletCode, setPalletCode] = useState('DA7819')
  const [confirmErrModal, setConfirmErrModal] = useState(false)
  const [finishModal, setFinishModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [stagesList, setStagesList] = useState([])
  const [previewImage, setPreviewImage] = useState(null)
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
  })

  const showMessage = (title, message, type = 'info', onConfirm = null) => {
    setModalConfig({
      isOpen: true,
      type,
      title,
      message,
      onConfirm: () => {
        setModalConfig((prev) => ({ ...prev, isOpen: false }))
        if (onConfirm) onConfirm()
      },
    })
  }

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    onConfirm: null,
  })

  const showConfirm = ({ title, message, confirmText = 'Xác nhận', cancelText = 'Hủy', onConfirm }) => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }))
        if (onConfirm) onConfirm()
      },
      onCancel: () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }))
      },
    })
  }

  const fileRef = useRef()

  useEffect(() => {
    stageService.getAll()
      .then((data) => {
        setStagesList(data || [])
        const opts = (data || []).map((s) => ({ value: s.name, label: s.name }))
        setStageOptions([{ value: '', label: 'Chọn công đoạn' }, ...opts])
      })
      .catch(() => {
        setStageOptions([{ value: '', label: 'Chọn công đoạn' }])
      })

    orderService.getAll()
      .then((res) => {
        const orders = res.orders || []
        const opts = orders.map((o) => ({ value: o.po_code, label: o.po_code }))
        setPoOptions([{ value: '', label: 'Chọn PO' }, ...opts])
      })
      .catch(() => {
        setPoOptions([{ value: '', label: 'Chọn PO' }])
      })

    inspectionService.getProcessGuides()
      .then((data) => {
        const opts = (data || []).map((g) => ({
          value: String(g.id),
          label: g.code ? `${g.code} - ${g.name}` : g.name
        }))
        setProcessOptions([{ value: '', label: 'Chọn quy trình' }, ...opts])
      })
      .catch(() => {
        setProcessOptions([{ value: '', label: 'Chọn quy trình' }])
      })
  }, [])

  // Nạp dữ liệu từ phiếu kiểm tra đã có
  useEffect(() => {
    if (ticket) {
      if (ticket.mode) setMode(ticket.mode)
      if (ticket.stage) setStage(ticket.stage)
      const poVal = ticket.po || ticket.poCode || ticket.po_code || ''
      if (poVal) setPo(poVal)

      const prodVal = ticket.product || ticket.product_name || ticket.detail_name || ''
      if (prodVal) setProduct(prodVal)

      const specVal = ticket.spec || ticket.specification || ''
      if (specVal) setSpec(compactSpec(specVal))

      const sampleVal = ticket.sampleQty ?? ticket.sample_qty ?? ''
      if (sampleVal !== '') setSampleQty(String(sampleVal))

      const errorVal = ticket.errorQty ?? ticket.error_qty ?? '0'
      setErrorQty(String(errorVal))

      const reqVal = ticket.requiredQty ?? ticket.required_qty ?? ticket.quantity_plan ?? ''
      if (reqVal !== '') setRequiredQty(String(reqVal))

      const resVal = ticket.result || ticket.conclusion || 'pass'
      setResult(resVal)

      if (ticket.note || ticket.notes) setNote(ticket.note || ticket.notes || '')
      if (ticket.palletCode || ticket.pallet_code) setPalletCode(ticket.palletCode || ticket.pallet_code)
      if (ticket.parameter) setParameter(ticket.parameter)
      if (ticket.paramStage) setParamStage(ticket.paramStage)
      if (ticket.paramPo) setParamPo(ticket.paramPo)
      if (ticket.paramProduct) setParamProduct(ticket.paramProduct)
      if (ticket.paramSample !== undefined && ticket.paramSample !== null) setParamSample(String(ticket.paramSample))
      if (ticket.paramPass !== undefined && ticket.paramPass !== null) setParamPass(String(ticket.paramPass))
      if (ticket.paramFail !== undefined && ticket.paramFail !== null) setParamFail(String(ticket.paramFail))
      if (ticket.process) setProcess(ticket.process)
      if (ticket.area) setArea(ticket.area)
      if (ticket.staff) setStaff(ticket.staff)
      if (Array.isArray(ticket.answers) && ticket.answers.length > 0) setAnswers(ticket.answers)
      if (resVal && ticket.mode === INSPECT_MODES.QA) setQaResult(resVal)
      if (Array.isArray(ticket.errors) && ticket.errors.length > 0) setErrors(ticket.errors)

      // Bổ sung options để hiển thị giá trị hiện có nếu chưa có trong danh sách
      if (prodVal) {
        setProductOptions((prev) => {
          if (!prev.some((opt) => opt.value === prodVal)) {
            return [...prev, { value: prodVal, label: prodVal }]
          }
          return prev
        })
      }
      if (specVal) {
        const cSpec = compactSpec(specVal)
        setSpecOptions((prev) => {
          if (!prev.some((opt) => opt.value === cSpec)) {
            return [...prev, { value: cSpec, label: cSpec }]
          }
          return prev
        })
      }
      if (ticket.stage) {
        setStageOptions((prev) => {
          if (!prev.some((opt) => opt.value === ticket.stage)) {
            return [...prev, { value: ticket.stage, label: ticket.stage }]
          }
          return prev
        })
      }
      if (poVal) {
        setPoOptions((prev) => {
          if (!prev.some((opt) => opt.value === poVal)) {
            return [...prev, { value: poVal, label: poVal }]
          }
          return prev
        })
      }
    }
  }, [ticket])

  useEffect(() => {
    if (!po) {
      if (isNew) {
        setProduct('')
        setSpec('')
        setProductOptions([{ value: '', label: 'Chọn sản phẩm' }])
        setSpecOptions([{ value: '', label: 'Chọn quy cách' }])
        setBomData([])
        setRequiredQty('')
      }
      return
    }
    orderService.getBom(po, stage)
      .then((data) => {
        setBomData(data || [])
        const opts = (data || []).map((p) => ({ value: p.part_name, label: p.part_name }))
        setProductOptions([{ value: '', label: 'Chọn sản phẩm' }, ...opts])
        if (isNew && data && data.length > 0) {
          const firstPart = data[0]
          setProduct(firstPart.part_name)
          const firstSpecs = firstPart.specs || []
          const specOpts = firstSpecs.map((s) => ({ value: compactSpec(s.specification), label: compactSpec(s.specification) }))
          setSpecOptions([{ value: '', label: 'Chọn quy cách' }, ...specOpts])
          if (firstSpecs.length > 0) {
            setSpec(compactSpec(firstSpecs[0].specification))
          }
          if (firstPart.total_qty) {
            setRequiredQty(String(firstPart.total_qty))
            const calcSample = Math.max(1, Math.ceil(Number(firstPart.total_qty) * 0.05))
            setSampleQty((prev) => prev || String(calcSample))
          }
        } else if (isNew) {
          setProduct('')
          setSpec('')
          setSpecOptions([{ value: '', label: 'Chọn quy cách' }])
          setRequiredQty('')
        }
      })
      .catch(() => {
        setBomData([])
        if (isNew) {
          setProductOptions([{ value: '', label: 'Chọn sản phẩm' }])
          setSpecOptions([{ value: '', label: 'Chọn quy cách' }])
          setProduct('')
          setSpec('')
          setRequiredQty('')
        }
      })
  }, [po, stage, isNew])

  // Tự động load SOP steps khi tạo mới
  useEffect(() => {
    if (!isNew && ticket?.steps && ticket.steps.length > 0) return
    if (mode === INSPECT_MODES.PROCESS) {
      if (process) {
        loadGuide(mode, null, null, process)
      } else {
        setSteps([])
      }
      return
    }
    const activeStage = mode === INSPECT_MODES.PARAMETER ? paramStage : stage
    const matchedStage = stagesList.find((s) => s.name === activeStage)
    const stageId = matchedStage ? matchedStage.id : null
    loadGuide(mode, null, stageId)
  }, [mode, stage, paramStage, process, stagesList, isNew, ticket])

  const hasFailedStep = steps.some((s) => s.result === 'fail')
  const isFailedResult =
    hasFailedStep ||
    result === 'fail' ||
    (mode === INSPECT_MODES.QA && qaResult === 'fail') ||
    Number(errorQty) > 0 ||
    errors.some((e) => Number(e.qty) > 0)

  const handleStepResultChange = (stepIdx, newResult) => {
    if (readOnly) return
    setSteps((prev) => {
      const next = prev.map((s, i) => (i === stepIdx ? { ...s, result: newResult } : s))
      const anyFail = next.some((s) => s.result === 'fail')
      setResult(anyFail ? 'fail' : 'pass')
      return next
    })
  }

  const handleModeChange = (m) => {
    if (readOnly) return
    setMode(m)
    setErrors(initErrors())
  }

  const handleProductChange = (partName) => {
    if (readOnly) return
    setProduct(partName)
    const part = bomData.find((p) => p.part_name === partName)
    if (part) {
      const firstSpecs = part.specs || []
      const specOpts = firstSpecs.map((s) => ({ value: compactSpec(s.specification), label: compactSpec(s.specification) }))
      setSpecOptions([{ value: '', label: 'Chọn quy cách' }, ...specOpts])
      if (firstSpecs.length > 0) {
        setSpec(compactSpec(firstSpecs[0].specification))
      } else {
        setSpec('')
      }
      if (part.total_qty) {
        setRequiredQty(String(part.total_qty))
        const calcSample = Math.max(1, Math.ceil(Number(part.total_qty) * 0.05))
        setSampleQty(String(calcSample))
      } else {
        setRequiredQty('')
      }
    } else {
      setSpecOptions([{ value: '', label: 'Chọn quy cách' }])
      setSpec('')
      setRequiredQty('')
    }
  }

  const handleLoadLastResult = async () => {
    if (readOnly) return
    const res = await getLastResult(mode, product, po)
    if (res) { setSampleQty(String(res.sampleQty)); setErrorQty(String(res.errorQty)); setResult(res.result) }
  }

  const handleImagePick = async (e) => {
    if (readOnly) return
    for (const f of Array.from(e.target.files)) await addImage(f)
  }

  const addErrorRow = () => {
    if (readOnly) return
    setErrors((p) => [...p, { id: Date.now(), name: '', qty: 0 }])
  }

  const updateError = (idx, row) => {
    if (readOnly) return
    setErrors((p) => {
      const next = p.map((r, i) => (i === idx ? row : r))
      const totalErr = next.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
      if (totalErr > 0) {
        setErrorQty(String(totalErr))
      }
      return next
    })
  }

  const handleCreatePallet = async () => {
    if (readOnly) return
    try {
      const res = await inspectionService.generatePalletCode('DA')
      if (res && res.palletCode) {
        setPalletCode(res.palletCode)
      }
    } catch (e) {
      console.warn('Lỗi tạo mã pallet từ server:', e)
    }
  }

  const handleSubmit = async () => {
    if (readOnly) return
    if (isFailedResult && images.length === 0) {
      showMessage(
        'Thiếu ảnh bằng chứng',
        'Vui lòng chụp hoặc tải lên ít nhất 1 ảnh bằng chứng/lỗi khi có hạng mục Không đạt.',
        'warning',
        () => {
          if (fileRef.current) fileRef.current.click()
        }
      )
      return
    }

    // Tự động sinh mã Pallet duy nhất từ server nếu chưa có
    if (!palletCode) {
      await handleCreatePallet()
    }

    // Mở popup hoàn thành kiểm tra CL09.2 để review thông tin và xác nhận mã pallet
    setFinishModal(true)
  }

  const handleFinishConfirm = async (modalData) => {
    setFinishModal(false)
    setSubmitting(true)
    try {
      const activeStage = mode === INSPECT_MODES.PARAM ? paramStage : (mode === INSPECT_MODES.PROCESS ? area : stage)
      const activePo = mode === INSPECT_MODES.PARAM ? paramPo : po
      const activeProduct = mode === INSPECT_MODES.PARAM ? paramProduct : product
      const activeResult = mode === INSPECT_MODES.QA ? qaResult : result
      const activeSampleQty = mode === INSPECT_MODES.PARAM ? paramSample : sampleQty
      const activeErrorQty = mode === INSPECT_MODES.PARAM ? paramFail : errorQty
      const finalPalletCode = modalData?.palletCode || palletCode

      await createTicket({
        mode,
        stage: activeStage,
        po: activePo,
        result: activeResult,
        product: activeProduct,
        spec: compactSpec(spec),
        requiredQty: requiredQty || sampleQty,
        sampleQty: activeSampleQty,
        errorQty: activeErrorQty,
        note,
        errors,
        images,
        creator: creatorName,
        palletCode: finalPalletCode,
        parameter,
        paramPass,
        process,
        area,
        staff,
        answers: mode === INSPECT_MODES.QA ? answers : null,
        steps: mode === INSPECT_MODES.PROCESS ? steps : null,
      })

      showMessage(
        'Hoàn thành kiểm tra',
        `Đã lưu phiếu kiểm tra thành công cho mã Pallet: ${finalPalletCode}!`,
        'success',
        () => {
          navigate(ROUTES.INSPECTION_LIST)
        }
      )
    } catch (e) {
      showMessage('Lỗi tạo phiếu', e.message || 'Không thể tạo phiếu kiểm tra. Vui lòng thử lại.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmTicketClick = () => {
    if (!ticket?.id) return
    showConfirm({
      title: 'Xác nhận duyệt phiếu',
      message: `Bạn có chắc chắn muốn xác nhận duyệt hoàn thành phiếu kiểm tra ${ticket.code || ticket.id}?`,
      confirmText: 'Đồng ý duyệt',
      cancelText: 'Xem lại',
      onConfirm: executeConfirmTicket,
    })
  }

  const executeConfirmTicket = async () => {
    if (!ticket?.id) return
    setSubmitting(true)
    try {
      await confirmTicket(ticket.id, { conclusion: result, notes: note })
      showMessage(
        'Duyệt thành công',
        `Đã xác nhận duyệt hoàn thành phiếu ${ticket.code || ticket.id}!`,
        'success',
        () => {
          navigate(ROUTES.INSPECTION_LIST)
        }
      )
    } catch (e) {
      showMessage('Lỗi xác nhận', e.message || 'Không thể duyệt phiếu. Vui lòng kiểm tra lại.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const ticketCode = ticket?.code || (isNew ? `KT${String(Date.now()).slice(-3)}` : id)
  const displayCreator = ticket?.creator || creatorName
  const displayTime = ticket?.time_str || (ticket?.created_at ? new Date(ticket.created_at).toLocaleString('vi-VN') : '')
  const isDone = ticket?.status === 'done' || ticket?.is_confirmed === true
  const summary = {
    poCode: mode === INSPECT_MODES.PARAM ? (paramPo || '—') : (po || ticket?.po_code || ticket?.po || '—'),
    result: mode === INSPECT_MODES.QA ? qaResult : (result || ticket?.conclusion || ticket?.result || 'pass'),
    product: mode === INSPECT_MODES.PARAM ? (paramProduct || '—') : (product || ticket?.product_name || ticket?.detail_name || ticket?.product || '—'),
    spec: compactSpec(spec || ticket?.specification || ticket?.spec) || '—',
    needQty: requiredQty || ticket?.quantity_plan || ticket?.required_qty || sampleQty || '—',
    sampleQty: (mode === INSPECT_MODES.PARAM ? paramSample : (sampleQty || ticket?.sample_qty || ticket?.sampleQty)) || '—',
    errorQty: (mode === INSPECT_MODES.PARAM ? paramFail : (errorQty || ticket?.error_qty || ticket?.errorQty)) || '0',
  }

  const renderImageUploadArea = () => (
    <div className="pv2-upload-area" style={{ marginTop: 12 }}>
      <div className="pv2-upload-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {!readOnly ? (
          <button
            type="button"
            className="pv2-btn-add-image-link"
            onClick={() => fileRef.current.click()}
          >
            <span className="pv2-plus-icon">+</span> Thêm ảnh kiểm tra
            {isFailedResult && (
              <span className="pv2-req-inline"> * (Bắt buộc khi có lỗi)</span>
            )}
          </button>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
            📸 Hình ảnh đính kèm ({images.length})
          </span>
        )}

        {!readOnly && isFailedResult && images.length === 0 && (
          <span className="pv2-req-tag">⚠️ Cần đính kèm ảnh</span>
        )}
        {!readOnly && images.length > 0 && (
          <span className="pv2-req-tag-ok">✓ Đã chọn {images.length} ảnh</span>
        )}
      </div>

      {!readOnly && (
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleImagePick} />
      )}

      {images.length > 0 ? (
        <div className="pv2-image-preview-row" style={{ marginTop: 8 }}>
          {images.map((src, i) => (
            <div key={i} className="pv2-img-thumb" style={{ cursor: 'pointer' }} onClick={() => setPreviewImage(getFullImageUrl(src))}>
              <img src={getFullImageUrl(src)} alt="Ảnh kiểm tra" />
              {!readOnly && (
                <button type="button" className="pv2-img-remove" onClick={(e) => { e.stopPropagation(); removeImage(i) }} title="Xóa ảnh">
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        readOnly && (
          <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
            Không có hình ảnh đính kèm cho phiếu này.
          </div>
        )
      )}
    </div>
  )

  const MOCK_QUESTIONS = [
    { q: 'Câu hỏi 1', answer: 'Đáp án câu 1...' },
    { q: 'Câu hỏi 2', answer: 'Đáp án câu 2...' },
    { q: 'Câu hỏi 3', answer: 'Đáp án câu 3...' },
  ]

  return (
    <Layout>
      <PageHeader
        title={readOnly ? 'Chi tiết phiếu' : 'Khởi tạo phiếu'}
        subTitle={readOnly ? `CL09: ${ticketCode}` : 'CL09: Tạo phiếu kiểm tra'}
        showBack={true}
      />

      <div className="pv2-page pv2-page--form">
        <div className="pv2-form-card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
            gap: 8,
            flexWrap: 'nowrap'
          }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#4a240e', whiteSpace: 'nowrap' }}>
              {readOnly ? 'Thông Tin Phiếu' : 'Thông Tin Kiểm Tra'}
            </span>
            {readOnly && (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 14,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                backgroundColor: isDone ? '#dcfce7' : '#ffedd5',
                color: isDone ? '#15803d' : '#c2410c',
                border: `1px solid ${isDone ? '#bbf7d0' : '#fed7aa'}`
              }}>
                {isDone ? '✓ Đã xong' : '⏳ Chờ xác nhận'}
              </span>
            )}
          </div>

          {/* Mode Selector + Extra Field at top of card */}
          <div className="pv2-field-row pv2-field-row--2col" style={{ marginBottom: 12 }}>
            <div className="pv2-field">
              <label>Chọn cách kiểm tra <span className="pv2-req">*</span></label>
              <CustomSelect value={mode} options={INSPECT_MODE_OPTIONS} onChange={handleModeChange} disabled={readOnly} />
            </div>

            {mode === INSPECT_MODES.PARAMETER ? (
              <div className="pv2-field">
                <label>Mã pallet</label>
                <CustomSelect value={palletCode} options={[{ value: 'DA7819', label: 'DA7819' }]} onChange={setPalletCode} disabled={readOnly} />
              </div>
            ) : mode === INSPECT_MODES.PROCESS ? (
              <div className="pv2-field">
                <label>Chọn quy trình</label>
                <CustomSelect value={process} options={processOptions} onChange={setProcess} disabled={readOnly} />
              </div>
            ) : mode === INSPECT_MODES.QA ? (
              <div className="pv2-field">
                <label>Tên nhân sự</label>
                <CustomSelect value={staff} options={staffOpts} onChange={setStaff} disabled={readOnly} />
              </div>
            ) : (
              <div className="pv2-field">
                <label>Công đoạn</label>
                <CustomSelect value={stage} options={stageOptions} onChange={setStage} disabled={readOnly} />
              </div>
            )}
          </div>

          {/* Ticket Meta Box */}
          <div className="pv2-ticket-meta">
            <div className="pv2-ticket-info">
              <div className="pv2-ticket-id">Phiếu: <strong>{ticketCode}</strong></div>
              <div className="pv2-ticket-creator">
                Người lập: <strong>{displayCreator}</strong> {displayTime && `• ${displayTime}`}
              </div>
            </div>
            {!readOnly && mode === INSPECT_MODES.RE_INSPECT && (
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
                    <CustomSelect value={po} options={poOptions} onChange={setPo} disabled={readOnly} />
                  </div>
                  <div className="pv2-field">
                    <label>Kết quả <span className="pv2-req">*</span></label>
                    <div className="pv2-radio-group">
                      <label className="pv2-radio-label">
                        <input type="radio" name="res" checked={result === 'pass'} onChange={() => setResult('pass')} disabled={readOnly} /> Đạt
                      </label>
                      <label className="pv2-radio-label">
                        <input type="radio" name="res" checked={result === 'fail'} onChange={() => setResult('fail')} disabled={readOnly} /> Không đạt
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pv2-field-row pv2-field-row--2col">
                  <div className="pv2-field">
                    <label>Sản phẩm <span className="pv2-req">*</span></label>
                    <CustomSelect value={product} options={productOptions} onChange={handleProductChange} disabled={readOnly} />
                  </div>
                  <div className="pv2-field">
                    <label>Quy cách</label>
                    <CustomSelect value={spec} options={specOptions} onChange={setSpec} disabled={readOnly} />
                  </div>
                </div>

                <div className="pv2-field-row pv2-field-row--3col">
                  <div className="pv2-field">
                    <label>SL Cần Kiểm</label>
                    <input type="text" className="pv2-input pv2-input--disabled" readOnly disabled value={requiredQty} placeholder="" />
                  </div>
                  <div className="pv2-field">
                    <label>SL mẫu <span className="pv2-req">*</span></label>
                    <input
                      type="number"
                      className={`pv2-input ${readOnly ? 'pv2-input--disabled' : ''}`}
                      value={sampleQty}
                      onChange={(e) => setSampleQty(e.target.value)}
                      placeholder={requiredQty ? String(Math.max(1, Math.ceil(Number(requiredQty) * 0.05))) : ''}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="pv2-field">
                    <label>Lỗi (nếu có)</label>
                    <input type="number" className="pv2-input pv2-input--disabled" value={errorQty} onChange={(e) => setErrorQty(e.target.value)} disabled />
                  </div>
                </div>

                <div className="pv2-section-title">Hướng dẫn kiểm tra</div>
                <InspectionStepsTable steps={steps} onStepChange={handleStepResultChange} sampleQty={sampleQty} disabled={readOnly} />

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

                <div className="pv2-error-section">
                  <div className="pv2-section-title">Theo dõi xu hướng lỗi</div>
                  <div className="pv2-error-table-header">
                    <span>Tên lỗi</span>
                    <span>SL Ghi nhận</span>
                  </div>
                  {errors.map((row, idx) => (
                    <ErrorTrendRow key={row.id} row={row} onChange={(r) => updateError(idx, r)} disabled={readOnly} />
                  ))}
                  {!readOnly && (
                    <button type="button" className="pv2-btn-add-image-link" onClick={addErrorRow} style={{ marginTop: 6 }}>
                      <span className="pv2-plus-icon">+</span> Ghi nhận lỗi khác
                    </button>
                  )}
                </div>
              </>
            )}

            {/* MODE: PARAMETER */}
            {mode === INSPECT_MODES.PARAMETER && (
              <>
                <div className="pv2-field-row pv2-field-row--2col">
                  <div className="pv2-field">
                    <label>Công đoạn <span className="pv2-req">*</span></label>
                    <CustomSelect value={paramStage} options={stageOptions} onChange={setParamStage} disabled={readOnly} />
                  </div>
                  <div className="pv2-field">
                    <label>Chọn PO <span className="pv2-req">*</span></label>
                    <CustomSelect value={paramPo} options={poOptions} onChange={setParamPo} disabled={readOnly} />
                  </div>
                </div>

                <div className="pv2-field-row pv2-field-row--2col">
                  <div className="pv2-field">
                    <label>Sản phẩm <span className="pv2-req">*</span></label>
                    <CustomSelect value={paramProduct} options={productOptions} onChange={setParamProduct} disabled={readOnly} />
                  </div>
                </div>

                <div className="pv2-field-row pv2-field-row--3col">
                  <div className="pv2-field">
                    <label>SL mẫu <span className="pv2-req">*</span></label>
                    <input
                      type="number"
                      className={`pv2-input ${readOnly ? 'pv2-input--disabled' : ''}`}
                      value={paramSample}
                      onChange={(e) => setParamSample(e.target.value)}
                      placeholder="134"
                      disabled={readOnly}
                    />
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

                {guideVisible && <InspectionStepsTable steps={steps} onStepChange={handleStepResultChange} sampleQty={paramSample} disabled={readOnly} />}

                {renderImageUploadArea()}

                <div className="pv2-field">
                  <label>Kết quả <span className="pv2-req">*</span></label>
                  <div className="pv2-radio-group">
                    <label className="pv2-radio-label">
                      <input type="radio" name="res_param" checked={result === 'pass'} onChange={() => setResult('pass')} disabled={readOnly} /> Đạt
                    </label>
                    <label className="pv2-radio-label">
                      <input type="radio" name="res_param" checked={result === 'fail'} onChange={() => setResult('fail')} disabled={readOnly} /> Không đạt
                    </label>
                  </div>
                </div>

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

                <div className="pv2-error-section">
                  <div className="pv2-section-title">Theo dõi xu hướng lỗi</div>
                  <div className="pv2-error-table-header">
                    <span>Tên lỗi</span>
                    <span>SL Ghi nhận</span>
                  </div>
                  {errors.map((row, idx) => (
                    <ErrorTrendRow key={row.id} row={row} onChange={(r) => updateError(idx, r)} disabled={readOnly} />
                  ))}
                  {!readOnly && (
                    <button type="button" className="pv2-btn-add-image-link" onClick={addErrorRow} style={{ marginTop: 6 }}>
                      <span className="pv2-plus-icon">+</span> Ghi nhận lỗi khác
                    </button>
                  )}
                </div>
              </>
            )}

            {/* MODE: PROCESS */}
            {mode === INSPECT_MODES.PROCESS && (
              <>
                <div className="pv2-field-row pv2-field-row--2col">
                  <div className="pv2-field">
                    <label>Chọn khu vực kiểm tra <span className="pv2-req">*</span></label>
                    <CustomSelect value={area} options={areaOpts} onChange={setArea} disabled={readOnly} />
                  </div>
                  <div className="pv2-field">
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

            {/* MODE: QA */}
            {mode === INSPECT_MODES.QA && (
              <>
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

            {/* ACTION BUTTONS */}
            <div className="pv2-card-actions" style={{ marginTop: 18 }}>
              {readOnly ? (
                <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                  <button
                    type="button"
                    className="pv2-btn-cancel"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    onClick={() => navigate(ROUTES.INSPECTION_LIST)}
                  >
                    <ArrowLeft size={16} /> Quay lại danh sách
                  </button>
                  {!isDone && (
                    <button
                      type="button"
                      className="pv2-btn-submit"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      onClick={handleConfirmTicketClick}
                      disabled={submitting}
                    >
                      <CheckCircle2 size={16} /> {submitting ? 'Đang duyệt...' : 'Xác nhận duyệt'}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <button type="button" className="pv2-btn-cancel" onClick={() => navigate(ROUTES.INSPECTION_LIST)}>
                    Hủy bỏ
                  </button>
                  <button type="button" className="pv2-btn-submit" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Đang lưu...' : 'Hoàn thành'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }} onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Xem ảnh lớn" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 8, objectFit: 'contain' }} />
            <button
              type="button"
              style={{
                position: 'absolute',
                top: -14,
                right: -14,
                background: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
              onClick={() => setPreviewImage(null)}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

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
        onCreatePallet={handleCreatePallet}
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        onConfirm={confirmConfig.onConfirm}
        onCancel={confirmConfig.onCancel}
      />

      <MessageModal
        isOpen={modalConfig.isOpen}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
      />
    </Layout>
  )
}

export default CL09_InspectionCreateView
