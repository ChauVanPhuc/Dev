import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '@modules/auth/Models/authModel'
import apiClient from '@shared/services/api'
import { useInspectionController, useInspectionDetail } from './useInspectionController'
import {
  INSPECT_MODES,
  INSPECT_MODE_OPTIONS,
  MODE_TO_ROUTE,
  ROUTES,
  BOM_STAGE_OPTIONS,
  DEFAULT_PARAMETER_OPTIONS,
} from '../constants'
import { stageService } from '../services/stageService'
import { orderService } from '../services/orderService'
import { inspectionService } from '../services/inspectionService'
import { userActivityService } from '../services/userActivityService'
import { extractRootPo, deduplicatePoCodes } from '../utils/poHelper'

const initErrors = () => [{ id: 1, name: '', qty: 0 }]

const getCleanString = (val) => {
  if (!val) return ''
  if (typeof val === 'string') return val.trim()
  if (typeof val === 'number') return String(val).trim()
  if (typeof val === 'object') {
    return String(val.name || val.code || val.stage || val.po || val.label || val.value || '').trim()
  }
  return ''
}

export const calculateAqlSampleSize = (lotSize) => {
  const n = Number(lotSize) || 0
  if (n <= 0) return 0
  if (n <= 50) return Math.min(n, 5)
  if (n <= 150) return 12
  if (n <= 280) return 20
  if (n <= 500) return 32
  if (n <= 1200) return 65
  if (n <= 3200) return 125
  return 200
}

const isInvalidSpec = (spec) => {
  if (!spec) return true
  const str = String(spec).trim()
  if (!str) return true
  // Check if only non-alphanumeric punctuation (e.g. **, *, ***, -, --, _, ., /, \)
  if (/^[\s*_\-—–.,/\\#]+$/.test(str)) return true
  // Check all zeros (e.g. 0*0*0, 0x0, 0)
  if (/^0(?:\s*[*xX×]\s*0)*$/i.test(str)) return true
  const lower = str.toLowerCase()
  if (['tiêu chuẩn', 'quy cách tiêu chuẩn', 'quy cách thành phẩm', 'n/a', 'na', 'none', 'null', 'undefined', '—', '–'].includes(lower)) {
    return true
  }
  return false
}

const compactSpec = (spec) => {
  if (isInvalidSpec(spec)) return ''
  const str = String(spec).trim()
  if (str.includes(' - ')) {
    const parts = str.split(/\s+-\s+/)
    if (parts[0] && parts[0].trim().length > 0 && !isInvalidSpec(parts[0])) {
      return parts[0].trim()
    }
  }
  return str
}

const parseDimensionsFromText = (text) => {
  if (!text) return null
  const match = String(text).match(/(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)/)
  if (match) {
    const t = parseFloat(match[1])
    const w = parseFloat(match[2])
    const l = parseFloat(match[3])
    if (t > 0 && w > 0 && l > 0) return { t, w, l }
  }
  return null
}

const parseDimensionStringFromText = (text) => {
  if (!text) return null
  const str = String(text)
  
  // 1. 3D Dimensions: e.g. 50*50*876, 18*42*1636, 18x42x1636, 18.5*42*1636.5
  const m3d = str.match(/(\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?(?:\s*mm|\s*cm)?)/i)
  if (m3d) return m3d[1].replace(/\s*/g, '')

  // 2. Hardware Model & Size: e.g. 5018-350mm, 5018-350, 5018*350
  const mHw = str.match(/(\b\d{4,5}\s*[-–—*xX×]\s*\d{3,4}(?:mm|cm)?\b)/i)
  if (mHw) return mHw[1].replace(/\s*/g, '')

  // 3. 2D Dimensions: e.g. 295*540, 295x540
  const m2d = str.match(/(\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?(?:\s*mm|\s*cm)?)/i)
  if (m2d) return m2d[1].replace(/\s*/g, '')

  // 4. Threaded / Screw / Dowel: e.g. M8x40, Ø10x50, D10x50
  const mBolt = str.match(/([MØOD]?\d+(?:[.,]\d+)?\s*[*xX×-]\s*\d+(?:[.,]\d+)?(?:\s*mm)?)/i)
  if (mBolt) return mBolt[1].replace(/\s*/g, '')

  // 5. Model code with dash: e.g. SS10-350
  const mCode = str.match(/(\b[A-Z0-9]{2,6}\s*[-–—]\s*\d{2,4}(?:mm|cm)?\b)/i)
  if (mCode) return mCode[1].replace(/\s*/g, '')

  // 6. Single size with unit: e.g. 350mm, 50cm (chỉ chấp nhận mm hoặc cm, không match đơn vị 'm' để tránh nhầm các từ tiếng Việt như 'mặt', 'màu', 'mép')
  const mUnit = str.match(/(?:^|[^\p{L}\d])(\d+(?:[.,]\d+)?\s*(?:mm|cm))(?:$|[^\p{L}\d])/iu)
  if (mUnit) return mUnit[1].replace(/\s*/g, '')

  return null
}

const cleanCabinetTag = (tag, fallback = '') => {
  if (!tag) return fallback
  // Bỏ tiền tố mã PO như "APT-0090-38 | ", "APT-0102-01 | ", chỉ giữ tên tủ (SKU)
  let cleaned = String(tag).replace(/^[A-Za-z0-9]+-\d+(?:-[A-Za-z0-9]+)?\s*\|\s*/i, '').trim()

  // Bỏ phần mã trong ngoặc nếu trùng hoặc chỉ khác tiền tố APT (ví dụ: "2-48-GRY (APT2-48-GRY)" -> "2-48-GRY")
  const m = cleaned.match(/^([^(]+?)\s*\(([^)]+)\)$/)
  if (m) {
    const namePart = m[1].trim()
    const skuPart = m[2].trim()
    const cleanName = namePart.replace(/^APT[-_]?/i, '').trim().toLowerCase()
    const cleanSku = skuPart.replace(/^APT[-_]?/i, '').trim().toLowerCase()
    if (cleanName === cleanSku) {
      cleaned = namePart
    }
  }
  return cleaned || fallback
}

const getEffectiveSpec = (specRaw, partName) => {
  // 1. Ưu tiên hàng đầu: Lấy quy cách thực tế đã có trong CSDL (specRaw)
  const cSpec = compactSpec(specRaw)
  if (cSpec && !isInvalidSpec(cSpec)) return cSpec

  // 2. Dự phòng: Nếu CSDL không có hoặc invalid, mới trích xuất kích thước từ tên chi tiết (partName)
  const dimStr = parseDimensionStringFromText(partName)
  if (dimStr && !isInvalidSpec(dimStr)) return dimStr

  // 3. Fallback cuối cùng
  return (specRaw && !isInvalidSpec(specRaw)) ? String(specRaw).trim() : 'Tiêu chuẩn'
}

const getQuantityConversionDetails = (partNameOrSpec, rawQty, unit = '', isConvertedHint = false) => {
  if (rawQty === undefined || rawQty === null || rawQty === '') return { qty: rawQty, isConverted: false }
  const qty = Number(rawQty)
  if (isNaN(qty) || qty <= 0) return { qty: rawQty, isConverted: false }

  if (isConvertedHint) {
    return { qty: Math.round(qty), isConverted: true }
  }

  const unitStr = String(unit).toLowerCase().trim()
  const isM3Unit = unitStr.includes('m3') || unitStr.includes('m³') || unitStr.includes('mét khối') || unitStr.includes('met khoi')

  const dims = parseDimensionsFromText(partNameOrSpec)
  if (dims) {
    const vSingle = (dims.t * dims.w * dims.l) / 1000000000
    if (vSingle > 0) {
      const piecesIfQtyIsM3 = Math.round(qty / vSingle)
      const volumeIfQtyIsPieces = qty * vSingle

      if (isM3Unit) {
        return { qty: piecesIfQtyIsM3 > 0 ? piecesIfQtyIsM3 : Math.round(qty), isConverted: true }
      }

      if (volumeIfQtyIsPieces >= 0.01 && volumeIfQtyIsPieces <= 500) {
        return { qty: Math.round(qty), isConverted: true }
      }
    }
  }

  if (isM3Unit) {
    return { qty: Math.round(qty), isConverted: true }
  }

  return { qty: qty, isConverted: false }
}

const convertQuantityToPiecesIfNeeded = (partNameOrSpec, rawQty, unit = '') => {
  return getQuantityConversionDetails(partNameOrSpec, rawQty, unit).qty
}

const parseCTQStage = (description) => {
  if (!description) return 'Chung'
  const match = description.match(/^\[Công đoạn:\s*([^\]]+)\]\s*(.*)$/i)
  if (match) {
    return match[1].trim()
  }
  return 'Chung'
}

const normalizeStageName = (name) => {
  if (!name) return ''
  return String(name)
    .replace(/^NM\d+\s*[-–—]\s*/i, '')
    .replace(/\s+\d+$/i, '')
    .toLowerCase()
    .trim()
}

const isStageMatching = (selectedStage, targetStage) => {
  if (!selectedStage) return true
  const sRaw = String(selectedStage).toLowerCase().trim()
  if (sRaw === '' || sRaw === 'chung' || sRaw === 'tất cả công đoạn' || sRaw === 'tất cả' || sRaw === 'all') {
    return true
  }

  if (!targetStage) return true
  if (typeof targetStage === 'string') {
    const tRaw = targetStage.toLowerCase().trim()
    if (tRaw === '' || tRaw === 'chung' || tRaw === 'tất cả công đoạn' || tRaw === 'tất cả' || tRaw === 'all' || tRaw === 'toàn bộ') {
      return true
    }
  }

  let list = []
  if (Array.isArray(targetStage)) {
    list = targetStage
  } else if (typeof targetStage === 'string') {
    const trimmed = targetStage.trim()
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        list = JSON.parse(trimmed)
      } catch (e) {
        list = [trimmed]
      }
    } else {
      list = [trimmed]
    }
  }

  if (!list || list.length === 0) return true

  const sNorm = normalizeStageName(selectedStage)

  return list.some((st) => {
    if (!st) return true
    const stRaw = String(st).toLowerCase().trim()
    if (stRaw === '' || stRaw === 'tất cả công đoạn' || stRaw === 'tất cả' || stRaw === 'chung' || stRaw === 'all' || stRaw === 'toàn bộ') {
      return true
    }

    const stNorm = normalizeStageName(st)

    // Khi chọn công đoạn Lắp Ráp, lấy kèm các tiêu chuẩn / danh mục lỗi của công đoạn Sơn
    const isAssemblyAndPaint =
      (sNorm.includes('lắp ráp') || sNorm.includes('lap rap') || sRaw.includes('lắp ráp') || sRaw.includes('lap rap')) &&
      (stNorm.includes('sơn') || stNorm.includes('son') || stRaw.includes('sơn') || stRaw.includes('son'))

    // Khi chọn công đoạn Định Hình, lấy kèm các tiêu chuẩn / danh mục lỗi của công đoạn Tạo Phôi (giống logic Lắp Ráp & Sơn)
    const isShapingAndMolding =
      (sNorm.includes('định hình') || sNorm.includes('dinh hinh') || sRaw.includes('định hình') || sRaw.includes('dinh hinh')) &&
      (stNorm.includes('phôi') || stNorm.includes('phoi') || stRaw.includes('phôi') || stRaw.includes('phoi') || stNorm.includes('cắt') || stRaw.includes('cắt'))

    return (
      sRaw === stRaw ||
      sNorm === stNorm ||
      sRaw.includes(stRaw) ||
      stRaw.includes(sRaw) ||
      (sNorm && stNorm && (sNorm.includes(stNorm) || stNorm.includes(sNorm))) ||
      isAssemblyAndPaint ||
      isShapingAndMolding
    )
  })
}

const DEFAULT_FALLBACK_DEFECTS = []

export const useInspectionFormBase = (fixedMode = INSPECT_MODES.FIRST_SAMPLE, propId = null, propBackupQrCode = null) => {
  const { id: routeId } = useParams()
  const id = propId !== undefined && propId !== null ? propId : routeId
  const navigate = useNavigate()
  const location = useLocation()
  const backupQrCode = propBackupQrCode || location.state?.backupQrCode || null
  const isNew = !id || id === 'NEW'
  const readOnly = !isNew

  const user = useAuthStore((state) => state.user)
  const creatorName = user?.full_name || user?.username || ''
  const { createTicket, confirmTicket } = useInspectionController()
  const { ticket, loading, steps, setSteps, images, setImages, addImage, removeImage, loadGuide, getLastResult, currentGuide } =
    useInspectionDetail(isNew ? null : id)

  const [mode, setMode] = useState(fixedMode)
  const [modeOptions, setModeOptions] = useState(INSPECT_MODE_OPTIONS)
  const [formTypeRoutes, setFormTypeRoutes] = useState(MODE_TO_ROUTE)
  const [stage, setStage] = useState('')
  const [po, setPo] = useState('')
  const [result, setResult] = useState('pass')
  const [action, setAction] = useState('luu-kho')
  const [product, setProduct] = useState('')
  const [spec, setSpec] = useState('')
  const [selectedProducts, setSelectedProducts] = useState([])
  const [selectedSpecs, setSelectedSpecs] = useState([])
  const [sampleQty, setSampleQty] = useState('')
  const [errorQty, setErrorQty] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState(initErrors())

  const [parameter, setParameter] = useState('do_am')
  const [parameterOptions, setParameterOptions] = useState(DEFAULT_PARAMETER_OPTIONS)
  const [paramStage, setParamStage] = useState('')
  const [paramPo, setParamPo] = useState('')
  const [paramProduct, setParamProduct] = useState('')
  const [paramSample, setParamSample] = useState('')
  const [paramPass, setParamPass] = useState('')
  const [paramFail, setParamFail] = useState('')

  const [process, setProcess] = useState('')
  const [area, setArea] = useState('')

  const [staff, setStaff] = useState('')
  const [staffOptions, setStaffOptions] = useState([{ value: '', label: 'Chọn nhân sự' }])
  const [answers, setAnswers] = useState(['', '', ''])
  const [showAnswers, setShowAnswers] = useState([false, false, false])
  const [qaQuestions, setQaQuestions] = useState([
    { q: 'Quy trình vận hành máy & kiểm tra an toàn', answer: 'Tuân thủ bảng hướng dẫn an toàn lao động và checklist thiết bị trước khi chạy máy.' },
    { q: 'Cách xử lý khi phát hiện lỗi không phù hợp', answer: 'Cách ly lô hàng, gắn biển nhận diện và lập phiếu báo cáo sự không phù hợp cho QC.' },
    { q: 'Tiêu chuẩn kích thước và độ dung sai cho phép', answer: 'Kiểm tra theo đúng bản vẽ kỹ thuật chi tiết đính kèm đơn hàng.' },
  ])
  const [qaResult, setQaResult] = useState('pass')
  const [stageOptions, setStageOptions] = useState(BOM_STAGE_OPTIONS)
  const [processOptions, setProcessOptions] = useState([{ value: '', label: 'Chọn quy trình' }])
  const [poOptions, setPoOptions] = useState([{ value: '', label: 'Vui lòng chọn công đoạn trước' }])
  const [productOptions, setProductOptions] = useState([{ value: '', label: 'Vui lòng chọn công đoạn trước' }])
  const [specOptions, setSpecOptions] = useState([{ value: '', label: 'Vui lòng chọn công đoạn trước' }])
  const [bomData, setBomData] = useState([])
  const [requiredQty, setRequiredQty] = useState('')
  const [totalBatchQty, setTotalBatchQty] = useState('')
  const totalBatchQtyRef = useRef('')
  const [isQtyConverted, setIsQtyConverted] = useState(false)
  const [samplingRule, setSamplingRule] = useState(null)

  const [partHistoryTickets, setPartHistoryTickets] = useState([])
  const [isPartHistoryModalOpen, setIsPartHistoryModalOpen] = useState(false)
  const [totalInspectedSoFar, setTotalInspectedSoFar] = useState(0)
  const totalInspectedSoFarRef = useRef(0)

  useEffect(() => {
    totalBatchQtyRef.current = totalBatchQty
  }, [totalBatchQty])

  useEffect(() => {
    totalInspectedSoFarRef.current = totalInspectedSoFar
  }, [totalInspectedSoFar])

  const isIncoming = useMemo(() => {
    const s = (stage || paramStage || '').toLowerCase()
    return Boolean(
      s.includes('nhập kho') ||
      s.includes('nhap kho') ||
      s.includes('đầu vào') ||
      s.includes('dau vao')
    )
  }, [stage, paramStage])

  const [guideVisible, setGuideVisible] = useState(true)
  const [palletCode, setPalletCode] = useState('')
  const [palletOptions, setPalletOptions] = useState([])
  const [recentTickets, setRecentTickets] = useState([])
  const [isRecentModalOpen, setIsRecentModalOpen] = useState(false)
  const [autoTicketCode, setAutoTicketCode] = useState(() => `DA${String(Date.now()).slice(-4)}${Math.floor(10 + Math.random() * 90)}`)
  const [confirmErrModal, setConfirmErrModal] = useState(false)
  const [finishModal, setFinishModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [stagesList, setStagesList] = useState([])
  const [defectCatalog, setDefectCatalog] = useState([])
  const [ctqGuides, setCtqGuides] = useState([])
  const [previewImage, setPreviewImage] = useState(null)
  const [isDirty, setIsDirty] = useState(false)
  const [userActivity, setUserActivity] = useState(() => userActivityService.getUserActivity(user))

  useEffect(() => {
    if (user) {
      const initial = userActivityService.getUserActivity(user)
      setUserActivity(initial)
      userActivityService.fetchRecentActivityFromBackend(user).then((synced) => {
        if (synced) setUserActivity(synced)
      })
    }
  }, [user])

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !readOnly) {
        e.preventDefault()
        e.returnValue = 'Bạn có dữ liệu chưa lưu. Bạn có chắc chắn muốn rời khỏi trang không?'
        return e.returnValue
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty, readOnly])

  const fileRef = useRef()

  useEffect(() => {
    const fetchDefects = async () => {
      try {
        let data = await inspectionService.getDefectTypes(user?.id)
        if (!Array.isArray(data) || data.length === 0) {
          data = await inspectionService.getDefectTypes(null)
        }
        setDefectCatalog(Array.isArray(data) ? data : [])
      } catch (err) {
        console.warn('Lỗi tải danh mục lỗi:', err)
      }
    }
    fetchDefects()

    inspectionService.getCTQGuides()
      .then((data) => setCtqGuides(data || []))
      .catch((err) => console.warn('Lỗi tải danh sách CTQ:', err))

    inspectionService.getPallets()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          const formatted = list.map((p) => {
            if (typeof p === 'string') return { value: p, label: p }
            const code = p.palletCode || p.pallet_code || p.value || ''
            const labelStr = p.label || (p.product ? `${code} (${p.po || ''} - ${p.product})` : code)
            return { value: code, label: labelStr }
          })
          setPalletOptions(formatted)
        }
      })
      .catch((e) => console.warn('[useInspectionFormBase] getPallets error:', e))

    // Load custom inspection parameters from backend
    apiClient.get('/inspection-parameters')
      .then((res) => {
        const data = res?.data !== undefined ? res.data : res
        if (Array.isArray(data) && data.length > 0) {
          setParameterOptions(data.map((p) => ({
            value: p.code,
            label: p.name,
            unit: p.unit,
            min: p.default_min,
            max: p.default_max
          })))
        }
      })
      .catch((e) => console.warn('[useInspectionFormBase] getParameters error:', e))

    // Load customizable inspection form types from backend
    apiClient.get('/inspection-form-types')
      .then((res) => {
        const data = res?.data !== undefined ? res.data : res
        if (Array.isArray(data) && data.length > 0) {
          const activeTypes = data.filter((t) => t.is_active !== false)
          if (activeTypes.length > 0) {
            setModeOptions(activeTypes.map((t) => ({
              value: t.code,
              label: t.name,
              shortName: t.short_name || t.name,
              route: t.route_path,
              color: t.color,
              bgColor: t.bg_color,
            })))
            const routeMap = { ...MODE_TO_ROUTE }
            activeTypes.forEach((t) => {
              if (t.route_path) {
                let r = t.route_path
                if (r.startsWith('/production-v2/')) {
                  r = r.replace('/production-v2/', '/production_v2/')
                }
                routeMap[t.code] = r
              }
            })
            setFormTypeRoutes(routeMap)
          }
        }
      })
      .catch((e) => console.warn('[useInspectionFormBase] getInspectionFormTypes error:', e))
  }, [user?.id])

  const handlePalletSelect = async (selectedPallet) => {
    setPalletCode(selectedPallet)
    setIsDirty(true)
    if (!selectedPallet) return

    try {
      const tickets = await inspectionService.getTicketsByPallet(selectedPallet, 3)
      setRecentTickets(tickets || [])

      if (Array.isArray(tickets) && tickets.length > 0) {
        const origin = tickets[0]
        if (origin.stage) {
          setStage(origin.stage)
          setParamStage(origin.stage)
        }
        if (origin.po) {
          setPo(origin.po)
          setParamPo(origin.po)
          setPoOptions((prev) => {
            const next = [...prev]
            if (!next.some((o) => o.value === origin.po)) next.push({ value: origin.po, label: origin.po })
            return next
          })
        }
        if (origin.product) {
          setProduct(origin.product)
          setParamProduct(origin.product)
          const prodArr = origin.product.split(', ').map(s => s.trim()).filter(Boolean)
          setSelectedProducts(prodArr)
          setProductOptions((prev) => {
            const next = [...prev]
            prodArr.forEach((p) => {
              if (!next.some((o) => o.value === p)) next.push({ value: p, label: p })
            })
            return next
          })
        }
        if (origin.spec) {
          const cSpec = compactSpec(origin.spec)
          setSpec(cSpec)
          const specArr = cSpec.split(', ').map(s => s.trim()).filter(Boolean)
          setSelectedSpecs(specArr)
          setSpecOptions((prev) => {
            const next = [...prev]
            specArr.forEach((s) => {
              if (!next.some((o) => o.value === s)) next.push({ value: s, label: s })
            })
            return next
          })
        }
        if (origin.requiredQty) {
          const details = getQuantityConversionDetails(origin.product || origin.spec, origin.requiredQty, origin.unit)
          setRequiredQty(String(details.qty))
          setIsQtyConverted(details.isConverted)
        }
        if (origin.sampleQty) {
          setSampleQty(String(origin.sampleQty))
          setParamSample(String(origin.sampleQty))
        }
      }
    } catch (e) {
      console.warn('[useInspectionFormBase] handlePalletSelect error:', e)
    }
  }

  const scannedPalletFromNav = location.state?.palletCode || location.state?.scannedCode || null
  useEffect(() => {
    if (scannedPalletFromNav && isNew) {
      handlePalletSelect(scannedPalletFromNav)
    }
  }, [scannedPalletFromNav, isNew])

  const applyRecentTicket = (histTicket) => {
    if (!histTicket) return
    if (histTicket.sampleQty || histTicket.sample_qty) {
      setSampleQty(histTicket.sampleQty || histTicket.sample_qty)
    }
    if (Array.isArray(histTicket.errors) && histTicket.errors.length > 0) {
      setErrors(histTicket.errors.map((e, i) => ({ id: e.id || i + 1, name: e.name || e.label || '', qty: e.qty || 1 })))
      setErrorQty(histTicket.errors.reduce((acc, curr) => acc + Number(curr.qty || 1), 0))
    }
    if (histTicket.result || histTicket.conclusion) {
      setResult(histTicket.result || histTicket.conclusion)
    }
  }

  const currentSelectedStage = useMemo(() => {
    if (mode === INSPECT_MODES.PARAMETER) return paramStage
    if (mode === INSPECT_MODES.PROCESS) return area || process
    return stage
  }, [mode, paramStage, area, process, stage])

  const combinedDefects = useMemo(() => {
    const list = []
    const seenCodes = new Set()
    const seenNames = new Set()

    const ctqList = Array.isArray(ctqGuides) ? ctqGuides : []
    const catList = Array.isArray(defectCatalog) ? defectCatalog : []

    ctqList.forEach((ctq) => {
      const ctqStage = parseCTQStage(ctq.description)
      if (!isStageMatching(currentSelectedStage, ctqStage)) return

      let code = ctq.code || ''
      let name = ctq.name || ''
      const codeMatch = ctq.name?.match(/^\[([A-Za-z0-9_-]+)\]\s*(.*)$/)
      if (codeMatch) {
        code = codeMatch[1]
        name = codeMatch[2]
      }

      const item = {
        id: `ctq_${ctq.id}`,
        ctq_id: ctq.id,
        code: code,
        name: name,
        label: code ? `[${code}] ${name}` : name,
        category: 'CTQ',
        stage: ctqStage && ctqStage !== 'Chung' ? [ctqStage] : null,
        description: ctq.description,
        needs_tracking: true,
        isQA: true,
        isCTQ: true,
        source: 'CTQ',
      }

      if (code) seenCodes.add(code.toLowerCase().trim())
      if (name) seenNames.add(name.toLowerCase().trim())
      list.push(item)
    })

    catList.forEach((d) => {
      if (!isStageMatching(currentSelectedStage, d.stage)) return

      const dCode = (d.code || '').toLowerCase().trim()
      const dName = (d.name || '').toLowerCase().trim()

      if ((dCode && seenCodes.has(dCode)) || (dName && seenNames.has(dName))) {
        const existing = list.find(
          (item) =>
            (dCode && item.code?.toLowerCase().trim() === dCode) ||
            (dName && item.name?.toLowerCase().trim() === dName)
        )
        if (existing) {
          existing.defect_type_id = d.id
          if (!existing.category || existing.category === 'CTQ') {
            existing.category = d.category || 'CTQ'
          }
          if (d.needs_tracking) existing.needs_tracking = true
          if (d.qc_tracking) existing.qc_tracking = true
          if (d.is_tracked_by_me) existing.is_tracked_by_me = true
        }
        return
      }

      list.push({
        id: d.id,
        code: d.code,
        name: d.name,
        label: d.code ? `[${d.code}] ${d.name}` : d.name,
        category: d.category,
        stage: d.stage,
        description: d.description,
        needs_tracking: d.needs_tracking,
        qc_tracking: d.qc_tracking,
        is_tracked_by_me: d.is_tracked_by_me,
        isQA: Boolean(d.needs_tracking || d.qc_tracking || d.is_tracked_by_me),
        source: 'catalog',
      })
      if (dCode) seenCodes.add(dCode)
      if (dName) seenNames.add(dName)
    })

    // Nếu danh sách lọc theo công đoạn rỗng nhưng trong CSDL có lỗi, nạp toàn bộ danh mục CSDL làm fallback an toàn
    if (list.length === 0 && catList.length > 0) {
      catList.forEach((d) => {
        list.push({
          id: d.id,
          code: d.code,
          name: d.name,
          label: d.code ? `[${d.code}] ${d.name}` : d.name,
          category: d.category,
          stage: d.stage,
          description: d.description,
          needs_tracking: d.needs_tracking,
          qc_tracking: d.qc_tracking,
          is_tracked_by_me: d.is_tracked_by_me,
          isQA: Boolean(d.needs_tracking || d.qc_tracking || d.is_tracked_by_me),
          source: 'catalog_fallback',
        })
      })
    }

    return list
  }, [defectCatalog, ctqGuides, currentSelectedStage])

  const defectOptions = useMemo(() => {
    return combinedDefects.map((d) => ({
      value: d.id,
      id: d.id,
      code: d.code,
      name: d.name,
      label: d.code ? `[${d.code}] ${d.name}` : d.name,
      category: d.category,
      stage: d.stage,
      needs_tracking: d.needs_tracking,
      qc_tracking: d.qc_tracking,
      is_tracked_by_me: d.is_tracked_by_me,
      isQA: Boolean(d.needs_tracking || d.qc_tracking || d.is_tracked_by_me || d.isCTQ),
      isCTQ: d.isCTQ,
      ctq_id: d.ctq_id,
      defect_type_id: d.defect_type_id,
    }))
  }, [combinedDefects])

  // Toàn bộ danh mục lỗi trong hệ thống (không bị lọc theo công đoạn), dùng khi tìm kiếm
  const allDefectsList = useMemo(() => {
    const list = []
    const seenCodes = new Set()
    const seenNames = new Set()

    const ctqList = Array.isArray(ctqGuides) ? ctqGuides : []
    const catList = Array.isArray(defectCatalog) ? defectCatalog : []

    // 1. CTQ items
    ctqList.forEach((ctq) => {
      let code = ctq.code || ''
      let name = ctq.name || ''
      const ctqStage = parseCTQStage(ctq.description)
      list.push({
        id: `ctq_${ctq.id}`,
        ctq_id: ctq.id,
        code,
        name,
        label: code ? `[${code}] ${name}` : name,
        category: 'CTQ',
        stage: ctqStage && ctqStage !== 'Chung' ? [ctqStage] : null,
        description: ctq.description,
        needs_tracking: true,
        isQA: true,
        isCTQ: true,
        source: 'CTQ',
      })
      if (code) seenCodes.add(code.toLowerCase().trim())
      if (name) seenNames.add(name.toLowerCase().trim())
    })

    // 2. All catalog items
    catList.forEach((d) => {
      const dCode = (d.code || '').toLowerCase().trim()
      const dName = (d.name || '').toLowerCase().trim()

      if ((dCode && seenCodes.has(dCode)) || (dName && seenNames.has(dName))) {
        const existing = list.find(
          (item) =>
            (dCode && item.code?.toLowerCase().trim() === dCode) ||
            (dName && item.name?.toLowerCase().trim() === dName)
        )
        if (existing) {
          existing.defect_type_id = d.id
          if (!existing.category || existing.category === 'CTQ') {
            existing.category = d.category || 'CTQ'
          }
          if (d.needs_tracking) existing.needs_tracking = true
          if (d.qc_tracking) existing.qc_tracking = true
          if (d.is_tracked_by_me) existing.is_tracked_by_me = true
          if (d.stage) existing.stage = d.stage
        }
        return
      }

      list.push({
        id: d.id,
        code: d.code,
        name: d.name,
        label: d.code ? `[${d.code}] ${d.name}` : d.name,
        category: d.category,
        stage: d.stage,
        description: d.description,
        needs_tracking: d.needs_tracking,
        qc_tracking: d.qc_tracking,
        is_tracked_by_me: d.is_tracked_by_me,
        isQA: Boolean(d.needs_tracking || d.qc_tracking || d.is_tracked_by_me),
        source: 'catalog',
      })
      if (dCode) seenCodes.add(dCode)
      if (dName) seenNames.add(dName)
    })

    return list
  }, [defectCatalog, ctqGuides])

  const allDefectOptions = useMemo(() => {
    return allDefectsList.map((d) => ({
      value: d.id,
      id: d.id,
      code: d.code,
      name: d.name,
      label: d.code ? `[${d.code}] ${d.name}` : d.name,
      category: d.category,
      stage: d.stage,
      needs_tracking: d.needs_tracking,
      qc_tracking: d.qc_tracking,
      is_tracked_by_me: d.is_tracked_by_me,
      isQA: Boolean(d.needs_tracking || d.qc_tracking || d.is_tracked_by_me || d.isCTQ),
      isCTQ: d.isCTQ,
      ctq_id: d.ctq_id,
      defect_type_id: d.defect_type_id,
    }))
  }, [allDefectsList])

  // Tự động hiện sẵn các lỗi QA Track / QC Track / CTQ theo công đoạn hiện tại vào danh sách ghi nhận lỗi
  useEffect(() => {
    if (readOnly || !isNew) return
    if (!defectOptions || defectOptions.length === 0) return

    const trackedOpts = defectOptions.filter(
      (opt) => opt.isQA || opt.isCTQ || opt.needs_tracking || opt.qc_tracking || opt.is_tracked_by_me
    )
    if (trackedOpts.length === 0) return

    // Loại bỏ các lựa chọn trùng mã (code) hoặc trùng tên (name)
    const uniqueTrackedOpts = []
    const seenTrackKeys = new Set()
    trackedOpts.forEach((opt) => {
      const key = (opt.code || opt.name || String(opt.id)).toLowerCase().trim()
      if (!seenTrackKeys.has(key)) {
        seenTrackKeys.add(key)
        uniqueTrackedOpts.push(opt)
      }
    })

    setErrors((prevErrors) => {
      // Giữ lại các dòng người dùng đã nhập số lượng > 0 hoặc dòng tự gõ lỗi thủ công
      const userEditedRows = prevErrors.filter(
        (e) => Number(e.qty) > 0 || (!e.defectId && e.name && e.name.trim() !== '')
      )

      const autoRows = uniqueTrackedOpts.map((opt, idx) => ({
        id: `auto_tracked_${opt.id}_${idx}`,
        defectId: opt.id || opt.value,
        code: opt.code || '',
        name: opt.name,
        isQA: Boolean(opt.isQA || opt.needs_tracking || opt.qc_tracking || opt.is_tracked_by_me),
        isCTQ: Boolean(opt.isCTQ),
        qty: 0,
      }))

      if (userEditedRows.length > 0) {
        const autoDefectKeys = new Set(
          autoRows.flatMap((a) => [String(a.defectId), a.code?.toLowerCase(), a.name?.toLowerCase()].filter(Boolean))
        )
        const extraUserRows = userEditedRows.filter((u) => {
          const uId = String(u.defectId || '')
          const uCode = (u.code || '').toLowerCase()
          const uName = (u.name || '').toLowerCase()
          return (
            (!uId || !autoDefectKeys.has(uId)) &&
            (!uCode || !autoDefectKeys.has(uCode)) &&
            (!uName || !autoDefectKeys.has(uName))
          )
        })
        return [...autoRows, ...extraUserRows]
      }

      return autoRows
    })
  }, [defectOptions, readOnly, isNew])

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

  useEffect(() => {
    stageService.getAll()
      .then((data) => {
        setStagesList(data || [])
        const dynamicOpts = (data || []).map((s) => ({
          value: s.name,
          label: s.name
        }))
        setStageOptions([{ value: '', label: 'Chọn công đoạn' }, ...dynamicOpts])
      })
      .catch(() => {
        setStageOptions(BOM_STAGE_OPTIONS)
      })

    apiClient.get('/accounts/?limit=500')
      .then((res) => {
        const list = res.data?.items || res.data || []
        if (Array.isArray(list) && list.length > 0) {
          const opts = list.map((u) => ({
            value: u.full_name || u.username,
            label: u.full_name ? `${u.full_name} (${u.username})` : u.username
          }))
          setStaffOptions([{ value: '', label: 'Chọn nhân sự' }, ...opts])
        }
      })
      .catch((err) => {
        console.warn('[useInspectionFormBase] Lỗi tải danh sách nhân sự:', err)
      })

    if (isNew) {
      inspectionService.generateTicketCode('KT')
        .then((res) => {
          if (res && res.ticketCode) {
            setAutoTicketCode(res.ticketCode)
          }
        })
        .catch(() => { })
    }
  }, [isNew])

  useEffect(() => {
    if (stage && isNew) {
      setArea(stage)
    }
  }, [stage, isNew])

  useEffect(() => {
    const activeStage = stage || area || paramStage
    inspectionService.getProcessGuides(activeStage)
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
  }, [stage, area, paramStage])

  // Cache danh sách PO của tháng hiện tại
  const monthPoCacheRef = useRef([])
  // Cache kết quả BOM để khi chọn PO mở chi tiết tức thì (0ms)
  const bomCacheRef = useRef({})

  const handlePoChange = useCallback((newPo, forcedStage = null) => {
    if (readOnly) return
    const cleanPo = getCleanString(newPo)
    setIsDirty(true)
    setPo(cleanPo)
    setParamPo(cleanPo)

    // Nếu chọn PO mà chưa có Công đoạn -> tự động chọn Công đoạn theo PO hoặc gần nhất
    const curStage = getCleanString(forcedStage || stage || paramStage)
    if (cleanPo && !curStage) {
      const autoStage = getCleanString(userActivity?.lastPo?.stage || userActivity?.lastStage?.name || userActivity?.lastStage)
      if (autoStage) {
        setStage(autoStage)
        setParamStage(autoStage)
        setArea(autoStage)
      }
    }

    if (cleanPo) {
      setPoOptions((prev) => {
        const safePrev = Array.isArray(prev) ? prev : []
        if (!safePrev.some((o) => o.value === cleanPo)) {
          return [{ value: cleanPo, label: cleanPo }, ...safePrev.filter((o) => o.value !== '')]
        }
        return safePrev
      })
    }

    if (cleanPo && user) {
      const activeStage = getCleanString(forcedStage || stage || paramStage || userActivity?.lastPo?.stage || userActivity?.lastStage?.name)
      const updated = userActivityService.recordPo(user, cleanPo, activeStage)
      setUserActivity(updated)
    }

    setProduct('')
    setParamProduct('')
    setSelectedProducts([])
    setSpec('')
    setSelectedSpecs([])
    setTotalBatchQty('')
    totalBatchQtyRef.current = ''
    setRequiredQty('')
    setSampleQty('')
    setParamSample('')
    setErrorQty('0')
    setParamPass('')
    setParamFail('')

    if (!cleanPo) {
      const activeStage = getCleanString(stage || paramStage)
      setProductOptions([{ value: '', label: !activeStage ? 'Vui lòng chọn công đoạn trước' : 'Vui lòng chọn PO trước' }])
      setSpecOptions([{ value: '', label: !activeStage ? 'Vui lòng chọn công đoạn trước' : 'Vui lòng chọn PO trước' }])
      setBomData([])
    }
  }, [readOnly, stage, paramStage, user])

  // Hàm tìm kiếm PO full trên Server khi người dùng nhập từ khóa
  const handlePoSearch = useCallback((searchTerm) => {
    const activeStage = stage || paramStage
    if (!activeStage) return
    const isIncoming = activeStage.toLowerCase().includes('đầu vào') || activeStage.toLowerCase().includes('nhập kho')
    const term = (searchTerm || '').trim()

    if (!term) {
      // Khi xóa ô tìm kiếm -> xóa PO đã chọn và khôi phục danh sách PO của tháng hiện tại
      handlePoChange('')
      if (monthPoCacheRef.current.length > 0) {
        setPoOptions([{ value: '', label: 'Nhập hoặc chọn PO...' }, ...monthPoCacheRef.current])
      }
      return
    }

    if (isIncoming) {
      orderService.getPurchaseOrders(term)
        .then((poCodes) => {
          const rawCodes = poCodes || []
          if (rawCodes.length === 0) {
            setPoOptions([{ value: '', label: 'Không tìm thấy PO phù hợp' }])
          } else {
            const opts = rawCodes.map((code) => ({ value: code, label: code }))
            setPoOptions([{ value: '', label: 'Nhập hoặc chọn PO...' }, ...opts])
          }
        })
        .catch(() => {})
    } else {
      // Tìm kiếm Lệnh sản xuất Full siêu tốc (5-10ms)
      orderService.getPoCodes({ search: term, limit: 1000 })
        .then((codes) => {
          const rawCodes = deduplicatePoCodes(codes || [])
          if (rawCodes.length === 0) {
            setPoOptions([{ value: '', label: 'Không tìm thấy PO phù hợp' }])
          } else {
            const opts = rawCodes.map((code) => ({ value: code, label: code }))
            setPoOptions([{ value: '', label: 'Nhập hoặc chọn PO...' }, ...opts])
          }
        })
        .catch(() => {})
    }
  }, [stage, paramStage, handlePoChange])

  useEffect(() => {
    const activeStage = stage || paramStage
    if (!activeStage) {
      setPoOptions([{ value: '', label: 'Vui lòng chọn công đoạn trước' }])
      return
    }
    const isIncoming = activeStage.toLowerCase().includes('đầu vào') || activeStage.toLowerCase().includes('nhập kho')
    if (isIncoming) {
      orderService.getPurchaseOrders()
        .then((poCodes) => {
          const opts = (poCodes || []).map((code) => ({ value: code, label: code }))
          monthPoCacheRef.current = opts
          const curPo = po || paramPo
          if (curPo && !opts.some((o) => o.value === curPo)) {
            opts.unshift({ value: curPo, label: curPo })
          }
          setPoOptions([{ value: '', label: 'Nhập hoặc chọn PO...' }, ...opts])
        })
        .catch(() => {
          setPoOptions([{ value: '', label: 'Nhập hoặc chọn PO...' }])
        })
    } else {
      // Mặc định chỉ lấy danh sách PO thuộc tháng hiện tại qua API siêu tốc
      const currentMonth = new Date().getMonth() + 1
      orderService.getPoCodes({ month: currentMonth, limit: 1000 })
        .then((codes) => {
          const cleanCodes = deduplicatePoCodes(codes || [])
          const opts = cleanCodes.map((code) => ({ value: code, label: code }))
          monthPoCacheRef.current = opts
          const curPo = po || paramPo
          if (curPo && !opts.some((o) => o.value === curPo)) {
            opts.unshift({ value: curPo, label: curPo })
          }
          setPoOptions([{ value: '', label: 'Nhập hoặc chọn PO...' }, ...opts])
        })
        .catch(() => {
          setPoOptions([{ value: '', label: 'Nhập hoặc chọn PO...' }])
        })
    }
  }, [stage, paramStage])

  // Nạp dữ liệu phiếu kiểm tra khi xem chi tiết
  useEffect(() => {
    if (ticket) {
      if (ticket.mode) setMode(ticket.mode)
      if (ticket.stage) setStage(ticket.stage)
      const poVal = ticket.po || ticket.poCode || ticket.po_code || ''
      if (poVal) setPo(poVal)

      const prodVal = ticket.product || ticket.product_name || ticket.detail_name || ''
      if (prodVal) {
        setProduct(prodVal)
        if (Array.isArray(ticket.parts_details) && ticket.parts_details.length > 0) {
          setSelectedProducts(ticket.parts_details.map(p => (p.part_name || p.name || '').trim()).filter(Boolean))
        } else if (Array.isArray(ticket.parts_with_specs) && ticket.parts_with_specs.length > 0) {
          setSelectedProducts(ticket.parts_with_specs.map(p => (p.part_name || p.name || '').trim()).filter(Boolean))
        } else {
          setSelectedProducts([prodVal.trim()])
        }
      }

      const specVal = ticket.spec || ticket.specification || ''
      if (specVal) {
        const cSpec = compactSpec(specVal)
        setSpec(cSpec)
        setSelectedSpecs(cSpec.split(', ').map(s => s.trim()).filter(Boolean))
      }

      const sampleVal = ticket.sampleQty ?? ticket.sample_qty ?? ''
      if (sampleVal !== '') setSampleQty(String(sampleVal))

      const errorVal = ticket.errorQty ?? ticket.error_qty ?? '0'
      setErrorQty(String(errorVal))

      const reqVal = ticket.requiredQty ?? ticket.required_qty ?? ticket.quantity_plan ?? ''
      if (reqVal !== '') setRequiredQty(String(reqVal))

      const resVal = ticket.result || ticket.conclusion || 'pass'
      setResult(resVal)

      const actVal = ticket.action || (resVal === 'pass' ? 'luu-kho' : 'tra-ve')
      setAction(actVal)

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
      if (Array.isArray(ticket.errors) && ticket.errors.length > 0) {
        const cleanedErrors = ticket.errors.map((e) => {
          const nameStr = (e.name || '').trim()
          const codeStr = (e.code || '').trim()
          if (!nameStr && !codeStr && Number(e.qty) > 0) {
            const fallbackName = (ticket.note || ticket.notes || '').trim() || 'Lỗi ghi nhận'
            return { ...e, name: fallbackName, is_custom: true }
          }
          return e
        })
        setErrors(cleanedErrors)
      }

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
    const activeStage = stage || paramStage
    const activePo = po || paramPo

    if (!activeStage) {
      if (isNew) {
        setProduct('')
        setParamProduct('')
        setSpec('')
        setSelectedProducts([])
        setSelectedSpecs([])
        setBomData([])
        setRequiredQty('')
        setProductOptions([{ value: '', label: 'Vui lòng chọn công đoạn trước' }])
        setSpecOptions([{ value: '', label: 'Vui lòng chọn công đoạn trước' }])
      }
      return
    }

    if (!activePo) {
      if (isNew) {
        setProduct('')
        setParamProduct('')
        setSpec('')
        setSelectedProducts([])
        setSelectedSpecs([])
        setBomData([])
        setRequiredQty('')
        setProductOptions([{ value: '', label: 'Vui lòng chọn PO trước' }])
        setSpecOptions([{ value: '', label: 'Vui lòng chọn PO trước' }])
      }
      return
    }

    const applyBomData = (data) => {
      const bomList = data || []
      setBomData(bomList)
      const opts = bomList.map((p) => ({ value: p.part_name, label: p.label || p.part_name }))
      
      if (bomList.length === 0) {
        setProductOptions([{ value: '', label: 'Không có chi tiết cho công đoạn này' }])
        setSpecOptions([{ value: '', label: 'Không có quy cách' }])
      } else {
        setProductOptions([{ value: '', label: 'Chọn sản phẩm' }, ...opts])
      }

      if (isNew && bomList.length > 0) {
        const currentProdStr = product || paramProduct
        const currentProdArray = currentProdStr ? currentProdStr.split(', ').map(s => s.trim()).filter(Boolean) : []
        
        let matchedParts = []
        if (currentProdArray.length > 0) {
          matchedParts = bomList.filter(p => currentProdArray.includes(p.part_name) || (p.sku && currentProdArray.includes(p.sku)))
        }

        if (matchedParts.length > 0) {
          const partNames = matchedParts.map(p => p.part_name)
          const combinedName = partNames.join(', ')
          setProduct(combinedName)
          setParamProduct(combinedName)
          setSelectedProducts(partNames)
          
          let specOpts = []
          let totalQtySum = 0
          let isAnyConverted = false
          matchedParts.forEach(part => {
            if (Array.isArray(part.specs)) {
              part.specs.forEach((s, idx) => {
                const effSpec = getEffectiveSpec(s.specification, part.part_name)
                const rawTag = s.badge || s.product_label || s.product_name || s.product_sku || (part.sku ? `${part.part_name} (${part.sku})` : '')
                const cabinetTag = cleanCabinetTag(rawTag, part.label || part.part_name || 'Chi tiết')
                const optKey = s.id || `${part.part_name}__${effSpec}__${s.order_code || ''}__${s.product_sku || s.product_name || idx}`
                specOpts.push({
                  value: optKey,
                  label: effSpec,
                  rawSpec: effSpec,
                  badge: cabinetTag,
                  productLabel: cabinetTag,
                  partName: part.part_name,
                  orderCode: s.order_code || '',
                  qty: Number(s.qty) || 0
                })
              })
            }
            if (part.total_qty) {
              const details = getQuantityConversionDetails(part.part_name || combinedName, part.total_qty, part.unit, part.is_converted)
              totalQtySum += Number(details.qty)
              if (details.isConverted) isAnyConverted = true
            }
          })
          
          setSpecOptions([{ value: '', label: 'Chọn quy cách' }, ...specOpts])
          // Mặc định không chọn trước quy cách nào
          setSelectedSpecs([])
          setSpec('')
          setRequiredQty('')
          setSampleQty('')
          setParamSample('')
          setIsQtyConverted(false)
        } else {
          // Mặc định không tự chọn chi tiết nào, để người dùng chủ động chọn
          setProduct('')
          setParamProduct('')
          setSelectedProducts([])
          setSpec('')
          setSelectedSpecs([])
          setSpecOptions([{ value: '', label: 'Vui lòng chọn chi tiết trước' }])
          setRequiredQty('')
          setSampleQty('')
          setParamSample('')
          setIsQtyConverted(false)
        }
      } else if (isNew) {
        setProduct('')
        setParamProduct('')
        setSpec('')
        setSelectedProducts([])
        setSelectedSpecs([])
        setSpecOptions([{ value: '', label: 'Chọn quy cách' }])
        setRequiredQty('')
      }
    }

    const cacheKey = `${activePo}_${activeStage}`
    if (bomCacheRef.current[cacheKey]) {
      applyBomData(bomCacheRef.current[cacheKey])
    } else {
      orderService.getBom(activePo, activeStage)
        .then((data) => {
          bomCacheRef.current[cacheKey] = data || []
          applyBomData(data)
        })
        .catch(() => {
          applyBomData([])
        })
    }
  }, [po, paramPo, stage, paramStage, isNew])

  // Tự động tra cứu mốc lấy mẫu AQL từ Database theo tổng SL lô hàng N
  useEffect(() => {
    if (!isNew) return

    // Khi ở công đoạn sản xuất, tra cứu theo requiredQty nếu đã có, hoặc theo totalBatchQty
    const lotSize = Number(isIncoming ? requiredQty : (requiredQty || totalBatchQty))
    if (!lotSize || lotSize <= 0) {
      setSamplingRule(null)
      return
    }

    apiClient.get(`/inspections/qc-sampling/lookup?lot_size=${lotSize}`)
      .then((res) => {
        const resData = res.data || res
        if (resData && resData.rule) {
          setSamplingRule(resData.rule)
          if (resData.rule.sample_size) {
            const calculatedSample = String(resData.rule.sample_size)
            setSampleQty(calculatedSample)
            setParamSample(calculatedSample)
            return
          }
        }
        const fallbackSample = String(calculateAqlSampleSize(lotSize))
        setSampleQty(fallbackSample)
        setParamSample(fallbackSample)
      })
      .catch((err) => {
        console.warn('Lỗi tra cứu mốc lấy mẫu AQL, dùng fallback:', err)
        const fallbackSample = String(calculateAqlSampleSize(lotSize))
        setSampleQty(fallbackSample)
        setParamSample(fallbackSample)
      })
  }, [requiredQty, totalBatchQty, isIncoming, isNew])

  // Tự động tính SL đạt = SL mẫu - Tổng SL lỗi (SL không đạt) & Cập nhật Kết quả (Đạt/Không đạt)
  useEffect(() => {
    const totalFail = errors.reduce((sum, item) => {
      const q = Number(item.qty) || 0
      return sum + (item.defectId || item.code || item.name || q > 0 ? q : 0)
    }, 0)

    setErrorQty(String(totalFail))

    const sampleVal = Number(paramSample || sampleQty) || 0
    if (sampleVal > 0 || totalFail > 0) {
      const passVal = Math.max(0, sampleVal - totalFail)
      setParamPass(String(passVal))
      setParamFail(String(totalFail))
    } else {
      setParamPass('')
      setParamFail('')
    }

    if (totalFail > 0) {
      setResult('fail')
      setAction((prev) => (prev === 'cach-ly' ? 'cach-ly' : 'tra-ve'))
    } else if (sampleVal > 0 && totalFail === 0) {
      setResult('pass')
      setAction('chap-nhan')
    }
  }, [paramSample, sampleQty, errors])

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

    if (mode === INSPECT_MODES.PARAMETER) {
      const currentStg = paramStage || stage
      const matchedStage = stagesList.find((s) => s.name === currentStg || (s.name && currentStg && s.name.toLowerCase() === currentStg.toLowerCase()))
      const stageId = matchedStage ? matchedStage.id : null
      loadGuide(mode, null, stageId, null, parameter)
      return
    }

    if (mode === INSPECT_MODES.FIRST_SAMPLE || mode === INSPECT_MODES.RE_INSPECT) {
      const matchedStage = stagesList.find((s) => s.name === stage)
      const stageId = matchedStage ? matchedStage.id : null
      loadGuide(mode, null, stageId)
    } else {
      setSteps([])
    }
  }, [mode, stage, paramStage, parameter, process, stagesList, isNew, ticket])

  const hasFailedStep = steps.some((s) => s.result === 'fail')
  const isFailedResult =
    hasFailedStep ||
    result === 'fail' ||
    (mode === INSPECT_MODES.QA && qaResult === 'fail') ||
    Number(errorQty) > 0 ||
    errors.some((e) => Number(e.qty) > 0)

  const handleStepResultChange = (stepIdx, newResult) => {
    if (readOnly) return
    setIsDirty(true)
    setSteps((prev) => {
      const next = prev.map((s, i) => (i === stepIdx ? { ...s, result: newResult } : s))
      const anyFail = next.some((s) => s.result === 'fail')
      setResult(anyFail ? 'fail' : 'pass')
      return next
    })
  }

  const handleProductChange = (partName) => {
    if (readOnly) return
    setIsDirty(true)
    setProduct(partName)
    const part = bomData.find((p) => p.part_name === partName)
    if (part) {
      const firstSpecs = part.specs || []
      let specOpts = firstSpecs.map((s, idx) => {
        const val = getEffectiveSpec(s.specification, partName)
        const rawTag = s.badge || s.product_label || s.product_name || s.product_sku || (part.sku ? `${part.part_name} (${part.sku})` : '')
        const cabinetTag = cleanCabinetTag(rawTag, part.label || part.part_name || 'Chi tiết')
        const optKey = s.id || `${partName}__${val}__${s.order_code || ''}__${s.product_sku || s.product_name || idx}`
        return {
          value: optKey,
          label: val,
          rawSpec: val,
          badge: cabinetTag,
          productLabel: cabinetTag,
          partName: partName,
          orderCode: s.order_code || '',
          qty: Number(s.qty) || 0
        }
      })
      if (specOpts.length === 0) {
        const effSpec = getEffectiveSpec('', partName)
        const cabinetTag = part.sku ? `${part.part_name} (${part.sku})` : ''
        specOpts = [{ value: effSpec, label: effSpec, rawSpec: effSpec, badge: cabinetTag, productLabel: cabinetTag, qty: Number(part.total_qty) || 0 }]
      }
      setSpecOptions([{ value: '', label: 'Chọn quy cách' }, ...specOpts])
      // Mặc định không chọn trước quy cách nào; chỉ hiện số lượng sau khi chọn quy cách
      setSelectedSpecs([])
      setSpec('')
      setTotalBatchQty('')
      totalBatchQtyRef.current = ''
      setRequiredQty('')
      setSampleQty('')
      setParamSample('')
    } else {
      setSpecOptions([{ value: '', label: 'Chọn quy cách' }])
      setSpec('')
      setSelectedSpecs([])
      setTotalBatchQty('')
      setRequiredQty('')
    }
  }

  const handleMultiProductChange = (partNamesArray) => {
    if (readOnly) return
    setIsDirty(true)
    setSelectedProducts(partNamesArray)
    const combinedStr = partNamesArray.join(', ')
    setProduct(combinedStr)
    setParamProduct(combinedStr)

    const selectedParts = bomData.filter((p) => partNamesArray.includes(p.part_name))
    let specOpts = []
    let totalQtySum = 0

    selectedParts.forEach((part) => {
      const partSpecs = (Array.isArray(part.specs) && part.specs.length > 0)
        ? part.specs
        : [{ specification: getEffectiveSpec('', part.part_name) }]

      partSpecs.forEach((s, idx) => {
        const effSpec = getEffectiveSpec(s.specification, part.part_name)
        const rawTag = s.badge || s.product_label || s.product_name || s.product_sku || (part.sku ? `${part.part_name} (${part.sku})` : '')
        const cabinetTag = cleanCabinetTag(rawTag, part.label || part.part_name || 'Chi tiết')
        const optKey = s.id || `${part.part_name}__${effSpec}__${s.order_code || ''}__${s.product_sku || s.product_name || idx}`
        specOpts.push({
          value: optKey,
          label: effSpec,
          rawSpec: effSpec,
          badge: cabinetTag,
          productLabel: cabinetTag,
          partName: part.part_name,
          orderCode: s.order_code || '',
          qty: Number(s.qty) || 0
        })
      })

      if (part.total_qty) {
        const cQty = convertQuantityToPiecesIfNeeded(part.part_name, part.total_qty, part.unit)
        totalQtySum += Number(cQty)
      }
    })

    setSpecOptions(specOpts)
    // Mặc định không chọn trước quy cách nào; chỉ hiện số lượng sau khi người dùng chọn quy cách
    setSelectedSpecs([])
    setSpec('')
    setTotalBatchQty('')
    totalBatchQtyRef.current = ''
    setRequiredQty('')
    const defaultDailySample = mode === INSPECT_MODES.DAILY ? '100' : ''
    setSampleQty(defaultDailySample)
    setParamSample(defaultDailySample)
  }

  // Bỏ gán cứng khóa quy cách để người dùng linh hoạt chọn/bỏ chọn theo từng dòng tủ
  const lockedSpecs = useMemo(() => {
    return []
  }, [])

  const handleMultiSpecChange = (specArray) => {
    if (readOnly) return
    setIsDirty(true)
    const cleanKeys = Array.from(new Set(specArray || []))
    setSelectedSpecs(cleanKeys)

    // Trích xuất các kích thước thuần từ các dòng được chọn
    const selectedOpts = specOptions.filter(o => cleanKeys.includes(o.value?.toString()))
    const distinctRawSpecs = Array.from(new Set(selectedOpts.map(o => o.rawSpec || o.label))).filter(Boolean)
    const combinedStr = distinctRawSpecs.join(', ')
    setSpec(combinedStr)

    // Tự động tính lại tổng số lượng và số lượng cần kiểm theo các dòng đã chọn
    const sumQty = selectedOpts.reduce((sum, opt) => sum + (Number(opt.qty) || 0), 0)
    if (sumQty > 0 && cleanKeys.length > 0) {
      setTotalBatchQty(String(sumQty))
      totalBatchQtyRef.current = String(sumQty)
      // Mặc định SL Cần Kiểm theo lượng còn lại chưa kiểm (Tổng - Đã kiểm)
      const prevInspected = Number(totalInspectedSoFarRef.current || totalInspectedSoFar || 0)
      const remaining = Math.max(0, sumQty - prevInspected)
      const lotSize = remaining > 0 ? remaining : sumQty

      if (isIncoming) {
        // Đối với Nhập kho/Đầu vào: "SL Cần Kiểm" là số lượng giao đợt này (người dùng có thể sửa)
        setRequiredQty(String(lotSize))
        const aqlSample = calculateAqlSampleSize(lotSize)
        setSampleQty(String(aqlSample))
        setParamSample(String(aqlSample))
        apiClient.get(`/inspections/qc-sampling/lookup?lot_size=${lotSize}`)
          .then((res) => {
            const resData = res.data || res
            if (resData?.rule) {
              setSamplingRule(resData.rule)
              if (resData.rule.sample_size) {
                setSampleQty(String(resData.rule.sample_size))
                setParamSample(String(resData.rule.sample_size))
              }
            }
          })
          .catch(() => {})
      } else {
        // Đối với tất cả công đoạn sản xuất & kiểm tra mẫu đầu (FIRST_SAMPLE):
        // "Số lượng kiểm tra" (SL Cần Kiểm) ăn theo AQL của lô sản xuất (lotSize)!
        const aqlSample = calculateAqlSampleSize(lotSize)
        setRequiredQty(String(aqlSample))
        setSampleQty(String(aqlSample))
        setParamSample(String(aqlSample))
        apiClient.get(`/inspections/qc-sampling/lookup?lot_size=${lotSize}`)
          .then((res) => {
            const resData = res.data || res
            if (resData?.rule) {
              setSamplingRule(resData.rule)
              if (resData.rule.sample_size) {
                setRequiredQty(String(resData.rule.sample_size))
                setSampleQty(String(resData.rule.sample_size))
                setParamSample(String(resData.rule.sample_size))
              }
            }
          })
          .catch(() => {})
      }
    } else {
      setTotalBatchQty('')
      totalBatchQtyRef.current = ''
      setRequiredQty('')
      const defaultDailySample = mode === INSPECT_MODES.DAILY ? '100' : ''
      setSampleQty(defaultDailySample)
      setParamSample(defaultDailySample)
    }
  }

  // Tự động tải lịch sử các phiếu kiểm tra trước đây của chi tiết này theo PO
  useEffect(() => {
    const activePo = po || paramPo
    const activeProduct = product || paramProduct
    if (!activePo || !activeProduct) {
      setPartHistoryTickets([])
      setTotalInspectedSoFar(0)
      return
    }

    let isMounted = true
    inspectionService.getList({
      poCode: activePo,
      product: activeProduct,
      tab: 'all',
      limit: 50
    }).then((res) => {
      if (!isMounted) return
      const items = res?.items || []
      // Bỏ qua phiếu hiện tại nếu đang ở chế độ xem/sửa phiếu cũ
      const filtered = ticket?.id ? items.filter(t => String(t.id) !== String(ticket.id)) : items
      setPartHistoryTickets(filtered)

      const sumPrev = filtered.reduce((acc, t) => {
        const q = Number(t.requiredQty ?? t.required_qty ?? t.plan_qty ?? 0)
        return acc + (isNaN(q) ? 0 : q)
      }, 0)
      totalInspectedSoFarRef.current = sumPrev
      setTotalInspectedSoFar(sumPrev)

      // Nếu đã chọn quy cách trước khi API tải xong lịch sử, tự động cập nhật số lượng theo lượng còn lại
      if (sumPrev > 0 && totalBatchQtyRef.current) {
        const batchNum = Number(totalBatchQtyRef.current)
        if (batchNum > 0) {
          const rem = Math.max(0, batchNum - sumPrev)
          const targetLot = rem > 0 ? rem : batchNum
          if (isIncoming) {
            setRequiredQty((prev) => {
              if (!prev || Number(prev) === batchNum) {
                return String(targetLot)
              }
              return prev
            })
            const aqlSample = calculateAqlSampleSize(targetLot)
            setSampleQty(String(aqlSample))
            setParamSample(String(aqlSample))
          } else {
            const aqlSample = calculateAqlSampleSize(targetLot)
            setRequiredQty(String(aqlSample))
            setSampleQty(String(aqlSample))
            setParamSample(String(aqlSample))
          }
        }
      }
    }).catch((err) => {
      console.warn('[useInspectionFormBase] Lỗi tải lịch sử kiểm tra chi tiết:', err)
      if (isMounted) {
        setPartHistoryTickets([])
        setTotalInspectedSoFar(0)
      }
    })

    return () => {
      isMounted = false
    }
  }, [po, paramPo, product, paramProduct, ticket?.id, isIncoming])

  const handleRequiredQtyChange = (val) => {
    if (readOnly) return
    setIsDirty(true)
    setRequiredQty(val)
    if (!isIncoming) {
      setSampleQty(val)
      setParamSample(val)
    }
  }

  const handleLoadLastResult = async () => {
    if (readOnly) return
    setIsDirty(true)
    const res = await getLastResult(mode, product, po)
    if (res) { setSampleQty(String(res.sampleQty)); setErrorQty(String(res.errorQty)); setResult(res.result) }
  }

  const handleImagePick = async (e) => {
    if (readOnly) return
    setIsDirty(true)
    const files = Array.from(e.target?.files || [])
    if (files.length === 0) return
    for (const f of files) {
      await addImage(f)
    }
    if (e.target) {
      e.target.value = ''
    }
  }

  const addErrorRow = () => {
    if (readOnly) return
    setErrors((p) => [...p, { id: Date.now(), defectId: null, code: '', name: '', qty: 0 }])
  }

  const removeErrorRow = (idx) => {
    if (readOnly) return
    setErrors((p) => {
      const next = p.filter((_, i) => i !== idx)
      const totalErr = next.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
      setErrorQty(String(totalErr))
      return next
    })
  }

  const updateError = (idx, row) => {
    if (readOnly) return
    setErrors((p) => {
      const next = p.map((r, i) => (i === idx ? row : r))
      const totalErr = next.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
      setErrorQty(String(totalErr))
      if (totalErr > 0) {
        setResult('fail')
      }
      return next
    })
  }

  const handleCreatePallet = async () => {
    if (readOnly) return
    try {
      const activeStage = (mode === INSPECT_MODES.PARAMETER ? paramStage : (mode === INSPECT_MODES.PROCESS ? (area || stage || 'Quy trình ISO') : stage)) || ''
      const activePo = (mode === INSPECT_MODES.PARAMETER ? paramPo : po) || ''

      const stLower = activeStage.toLowerCase().trim()
      const isPoAsPalletStage = ['lắp ráp', 'lap rap', 'sơn', 'son', 'đóng gói', 'dong goi'].some(keyword => stLower.includes(keyword))

      if (isPoAsPalletStage && activePo) {
        setPalletCode(activePo)
        return
      }

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

    if (mode === INSPECT_MODES.FIRST_SAMPLE || mode === INSPECT_MODES.RE_INSPECT) {
      if (!stage) {
        showMessage('Thiếu thông tin', 'Vui lòng chọn Công đoạn trước khi tiếp tục.', 'warning')
        return
      }
      if (!po) {
        showMessage('Thiếu thông tin', 'Vui lòng chọn PO trước khi tiếp tục.', 'warning')
        return
      }
      if (!product) {
        showMessage('Thiếu thông tin', 'Vui lòng chọn Sản phẩm trước khi tiếp tục.', 'warning')
        return
      }
    } else if (mode === INSPECT_MODES.PARAMETER) {
      if (!paramStage) {
        showMessage('Thiếu thông tin', 'Vui lòng chọn Công đoạn trước khi tiếp tục.', 'warning')
        return
      }
      if (!paramPo) {
        showMessage('Thiếu thông tin', 'Vui lòng chọn PO trước khi tiếp tục.', 'warning')
        return
      }
      if (!paramProduct) {
        showMessage('Thiếu thông tin', 'Vui lòng chọn Sản phẩm trước khi tiếp tục.', 'warning')
        return
      }
    } else if (mode === INSPECT_MODES.PROCESS) {
      if (!process) {
        showMessage('Thiếu thông tin', 'Vui lòng chọn Quy trình trước khi tiếp tục.', 'warning')
        return
      }
    } else if (mode === INSPECT_MODES.QA) {
      if (!staff) {
        showMessage('Thiếu thông tin', 'Vui lòng chọn Tên nhân sự trước khi tiếp tục.', 'warning')
        return
      }
    }

    showConfirm({
      title: 'Xác nhận tạo phiếu',
      message: 'Bạn có chắc chắn muốn xác nhận lưu phiếu kiểm tra này?',
      confirmText: 'Xác nhận',
      cancelText: 'Hủy bỏ',
      onConfirm: async () => {
        if (mode === INSPECT_MODES.PROCESS) {
          handleFinishConfirm({ palletCode: '' })
          return
        }

        if (!palletCode) {
          await handleCreatePallet()
        }

        setFinishModal(true)
      }
    })
  }

  const handleFinishConfirm = async (modalData) => {
    setFinishModal(false)
    setSubmitting(true)
    try {
      const finalPalletCode = (modalData && typeof modalData === 'object' && modalData.palletCode !== undefined)
        ? modalData.palletCode
        : (palletCode || '')
      const activeResult = mode === INSPECT_MODES.QA ? qaResult : result
      const finalAction = (modalData && modalData.action) || action || (activeResult === 'pass' ? 'chap-nhan' : 'tra-ve')
      // Hành động ăn theo kết quả:
      // - Trả hàng: luôn là Không đạt ('fail')
      // - Chấp nhận / Cách ly: lấy theo kết quả modalData?.result (khi phiếu Không đạt nhưng chọn Chấp nhận/Tự xử lý thì kết quả vẫn là 'fail')
      const finalResult = (finalAction === 'tra-ve')
        ? 'fail'
        : (modalData?.result || activeResult)
      const finalNote = (modalData && modalData.note !== undefined && modalData.note !== '') ? modalData.note : note
      const activeStage = mode === INSPECT_MODES.PARAMETER ? paramStage : (mode === INSPECT_MODES.PROCESS ? (area || stage || 'Quy trình ISO') : stage)
      const activePo = mode === INSPECT_MODES.PARAMETER ? paramPo : po
      const activeProduct = mode === INSPECT_MODES.PARAMETER ? paramProduct : product
      const activeSampleQty = mode === INSPECT_MODES.PARAMETER ? paramSample : sampleQty
      const activeErrorQty = mode === INSPECT_MODES.PARAMETER ? paramFail : errorQty
      const partsDetails = (currentPartsDetails && currentPartsDetails.length > 0)
        ? currentPartsDetails
        : [{ part_name: activeProduct, specification: compactSpec(spec), plan_qty: Number(requiredQty || sampleQty) || 0 }]

      setResult(finalResult)
      setAction(finalAction)
      if (modalData && modalData.note !== undefined) {
        setNote(modalData.note)
      }

      // Chuẩn hóa danh sách lỗi khi lưu:
      // 1. Lọc bỏ các dòng hoàn toàn trống (qty === 0 và không có tên/mã)
      // 2. Nếu dòng có qty > 0 nhưng chưa có tên, tự động lấy finalNote hoặc 'Lỗi ghi nhận'
      const sanitizedErrors = (Array.isArray(errors) ? errors : [])
        .filter((e) => {
          const qtyNum = Number(e.qty) || 0
          const hasNameOrCode = Boolean((e.name && String(e.name).trim()) || (e.code && String(e.code).trim()) || e.defectId)
          return qtyNum > 0 || hasNameOrCode
        })
        .map((e) => {
          const qtyNum = Number(e.qty) || 0
          const nameStr = (e.name || '').trim()
          const codeStr = (e.code || '').trim()
          if (qtyNum > 0 && !nameStr && !codeStr && !e.defectId) {
            return {
              ...e,
              name: (finalNote || '').trim() || 'Lỗi ghi nhận',
              is_custom: true
            }
          }
          return e
        })

      const createdResult = await createTicket({
        mode,
        stage: activeStage,
        po: activePo,
        result: finalResult,
        action: finalAction,
        product: activeProduct,
        spec: compactSpec(spec),
        requiredQty: requiredQty || sampleQty,
        sampleQty: activeSampleQty,
        errorQty: activeErrorQty,
        note: finalNote,
        errors: sanitizedErrors,
        images: (images || []).filter((img) => img && !String(img).startsWith('blob:')),
        creator: creatorName,
        userId: user?.id,
        inspector_id: user?.id,
        palletCode: finalPalletCode || backupQrCode || '',
        backup_qr: backupQrCode || null,
        backupQrCode: backupQrCode || null,
        parts_details: partsDetails,
        parameter,
        paramPass,
        process,
        area,
        staff,
        steps: (Array.isArray(steps) && steps.length > 0)
          ? steps
          : (Array.isArray(currentGuide?.steps) && currentGuide.steps.length > 0
            ? currentGuide.steps.map((st, idx) => ({
                id: st.id,
                step_no: st.step_no || (idx + 1),
                step: st.step_no || (idx + 1),
                title: st.title || `Bước ${idx + 1}`,
                standard: st.standard || st.content || '',
                content: st.content || st.standard || '',
                result: 'pass',
                note: ''
              }))
            : null)
      })

      // Ghi log phiếu kiểm tra gần nhất của cá nhân người kiểm tra
      if (user) {
        const recordedTicketData = {
          id: createdResult?.id || autoTicketCode,
          code: createdResult?.code || (createdResult?.id ? `KT${createdResult.id}` : autoTicketCode),
          mode,
          stage: activeStage,
          po: activePo,
          product: activeProduct,
          spec: compactSpec(spec),
          sampleQty: activeSampleQty,
          errorQty: activeErrorQty,
          result: finalResult,
          action: finalAction,
          palletCode: finalPalletCode || backupQrCode || '',
          created_at: createdResult?.created_at || new Date().toISOString()
        }
        const updated = userActivityService.recordTicket(user, recordedTicketData)
        setUserActivity(updated)
      }

      showMessage(
        'Hoàn thành kiểm tra',
        mode === INSPECT_MODES.PROCESS
          ? 'Đã lưu phiếu kiểm tra quy trình thành công!'
          : (finalPalletCode
              ? `Đã lưu phiếu kiểm tra thành công cho mã Pallet: ${finalPalletCode}!`
              : 'Đã lưu phiếu kiểm tra thành công!'),
        'success',
        () => {
          setIsDirty(false)
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
          setIsDirty(false)
          navigate(ROUTES.INSPECTION_LIST)
        }
      )
    } catch (e) {
      showMessage('Lỗi xác nhận', e.message || 'Không thể duyệt phiếu. Vui lòng kiểm tra lại.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const ticketCode = ticket?.code || (isNew ? autoTicketCode : id)
  const displayCreator = ticket?.creator || creatorName
  const displayTime = ticket?.time_str || (ticket?.created_at ? new Date(ticket.created_at).toLocaleString('vi-VN') : '')
  const isDone = ticket?.status === 'done' || ticket?.is_confirmed === true

  const currentPartsDetails = useMemo(() => {
    // 1. Ưu tiên hàng đầu: Lấy chi tiết từ danh sách quy cách và loại tủ đã chọn (selectedSpecs)
    if (selectedSpecs && selectedSpecs.length > 0) {
      return selectedSpecs.map((specVal, idx) => {
        const opt = (specOptions || []).find((o) => o.value?.toString() === specVal?.toString())
        const pName = opt?.partName || selectedProducts[0] || product || 'Chi tiết'
        const rawSpec = opt?.rawSpec || opt?.label || spec || 'Tiêu chuẩn'
        const cab = cleanCabinetTag(opt?.badge || opt?.productLabel || '')
        const effective = getEffectiveSpec(rawSpec, pName)
        const itemQty = opt?.qty ? Number(opt.qty) : (Number(requiredQty) || 0)
        return {
          stt: String(idx + 1).padStart(2, '0'),
          part_name: pName,
          name: pName,
          specification: effective,
          spec: effective,
          cabinet: cab,
          product_label: cab,
          badge: cab,
          order_code: opt?.orderCode || '',
          plan_qty: itemQty,
          qty: itemQty
        }
      })
    }

    // 2. Nếu không có selectedSpecs riêng, lấy theo danh sách chi tiết được chọn
    if (selectedProducts && selectedProducts.length > 0) {
      return selectedProducts.map((pName, i) => {
        const partObj = (bomData || []).find((b) => b.part_name === pName)
        const matchedSpec = (selectedSpecs && selectedSpecs[i]) || (partObj?.specs?.[0]?.specification) || spec || 'Tiêu chuẩn'
        const effective = getEffectiveSpec(matchedSpec, pName)
        const rawCab = partObj?.specs?.[0]?.badge || partObj?.specs?.[0]?.product_label || partObj?.specs?.[0]?.product_name || partObj?.product_name || (partObj?.sku ? `${partObj.part_name} (${partObj.sku})` : '')
        const cab = cleanCabinetTag(rawCab)
        return {
          stt: String(i + 1).padStart(2, '0'),
          part_name: pName,
          name: pName,
          specification: effective,
          spec: effective,
          cabinet: cab,
          product_label: cab,
          badge: cab,
          plan_qty: partObj?.total_qty ? convertQuantityToPiecesIfNeeded(pName, partObj.total_qty, partObj.unit) : 0,
          qty: partObj?.total_qty ? convertQuantityToPiecesIfNeeded(pName, partObj.total_qty, partObj.unit) : 0
        }
      })
    }

    if (ticket?.parts_details && Array.isArray(ticket.parts_details) && ticket.parts_details.length > 0) {
      return ticket.parts_details.map((item, idx) => {
        const pName = (item.part_name || item.name || '').trim()
        const effective = getEffectiveSpec(item.specification || item.spec, pName)
        const cab = cleanCabinetTag(item.cabinet || item.product_label || item.badge || item.product_sku || '')
        return {
          stt: String(idx + 1).padStart(2, '0'),
          part_name: pName,
          name: pName,
          specification: effective,
          spec: effective,
          cabinet: cab,
          product_label: cab,
          badge: cab,
          plan_qty: item.plan_qty || item.qty || 0,
          qty: item.plan_qty || item.qty || 0
        }
      }).filter((p) => p.name && p.name !== '—')
    }

    if (ticket?.parts_with_specs && Array.isArray(ticket.parts_with_specs) && ticket.parts_with_specs.length > 0) {
      return ticket.parts_with_specs.map((item) => {
        const pName = (item.part_name || item.name || '').trim()
        const effective = getEffectiveSpec(item.specification || item.spec, pName)
        return {
          part_name: pName,
          name: pName,
          specification: effective,
          spec: effective,
          plan_qty: item.plan_qty
        }
      }).filter((p) => p.name && p.name !== '—')
    }

    if (product && product !== '—') {
      const pName = product.trim()
      const effective = getEffectiveSpec(spec, pName)
      return [{
        part_name: pName,
        name: pName,
        specification: effective,
        spec: effective
      }]
    }

    return []
  }, [selectedProducts, selectedSpecs, bomData, spec, product, ticket])

  const curSummaryResult = mode === INSPECT_MODES.QA
    ? qaResult
    : (isFailedResult ? 'fail' : (result || ticket?.conclusion || ticket?.result || 'pass'))
  const curSummaryAction = curSummaryResult === 'pass'
    ? 'chap-nhan'
    : (action === 'cach-ly' ? 'cach-ly' : 'tra-ve')

  const summary = useMemo(() => ({
    poCode: mode === INSPECT_MODES.PARAMETER ? (paramPo || '—') : (po || ticket?.po_code || ticket?.po || '—'),
    result: curSummaryResult,
    action: curSummaryAction,
    isFailed: isFailedResult,
    product: mode === INSPECT_MODES.PARAMETER ? (paramProduct || '—') : (product || ticket?.product_name || ticket?.detail_name || ticket?.product || '—'),
    spec: compactSpec(spec || ticket?.specification || ticket?.spec) || '—',
    partsDetails: currentPartsDetails,
    needQty: (() => {
      const details = getQuantityConversionDetails(product || spec || ticket?.product_name || ticket?.detail_name, requiredQty || ticket?.quantity_plan || ticket?.required_qty || sampleQty)
      const val = details.qty || '—'
      return (details.isConverted || isQtyConverted) && val !== '—' ? `≈ ${val}` : val
    })(),
    sampleQty: (mode === INSPECT_MODES.PARAMETER ? paramSample : (sampleQty || ticket?.sample_qty || ticket?.sampleQty)) || '—',
    errorQty: (mode === INSPECT_MODES.PARAMETER ? paramFail : (errorQty || ticket?.error_qty || ticket?.errorQty)) || '0',
    note: note || ticket?.note || '',
  }), [
    mode,
    paramPo,
    po,
    ticket,
    curSummaryResult,
    curSummaryAction,
    isFailedResult,
    paramProduct,
    product,
    spec,
    currentPartsDetails,
    requiredQty,
    sampleQty,
    isQtyConverted,
    paramSample,
    paramFail,
    errorQty,
    note
  ])

  const handleModeChange = (newMode) => {
    if (newMode === mode) return
    const doChange = () => {
      setIsDirty(false)
      setMode(newMode)
      let targetRoute = formTypeRoutes[newMode] || MODE_TO_ROUTE[newMode] || ROUTES.INSPECTION_FIRST_SAMPLE
      if (typeof targetRoute === 'string' && targetRoute.startsWith('/production-v2/')) {
        targetRoute = targetRoute.replace('/production-v2/', '/production_v2/')
      }
      const targetUrl = isNew ? `${targetRoute}/NEW` : `${targetRoute}/${id}`
      navigate(targetUrl, { replace: true })
    }

    if (isDirty && !readOnly) {
      showConfirm({
        title: 'Xác nhận đổi cách kiểm tra',
        message: 'Dữ liệu bạn vừa nhập chưa được lưu. Bạn có chắc chắn muốn chuyển sang cách kiểm tra khác không?',
        confirmText: 'Rời đi & Đổi',
        cancelText: 'Ở lại tiếp tục',
        onConfirm: doChange,
      })
    } else {
      doChange()
    }
  }

  const handleCancelOrBack = (targetAction) => {
    if (isDirty && !readOnly) {
      showConfirm({
        title: 'Xác nhận rời khỏi trang',
        message: 'Dữ liệu bạn vừa nhập chưa được lưu. Bạn có chắc chắn muốn hủy và rời đi không?',
        confirmText: 'Hủy & Rời đi',
        cancelText: 'Ở lại tiếp tục',
        onConfirm: () => {
          setIsDirty(false)
          if (typeof targetAction === 'function') {
            targetAction()
          } else {
            navigate(ROUTES.INSPECTION_LIST || '/production-v2/inspections')
          }
        },
      })
    } else {
      if (typeof targetAction === 'function') {
        targetAction()
      } else {
        navigate(ROUTES.INSPECTION_LIST || '/production-v2/inspections')
      }
    }
  }

  const handleStageChange = (newStage) => {
    if (readOnly) return
    const cleanStage = getCleanString(newStage)
    setIsDirty(true)
    setStage(cleanStage)
    setParamStage(cleanStage)
    setArea(cleanStage)
    setProcess('')

    if (cleanStage && user) {
      const updated = userActivityService.recordStage(user, cleanStage)
      setUserActivity(updated)
    }

    setPo('')
    setParamPo('')
    setProduct('')
    setParamProduct('')
    setSelectedProducts([])
    setSpec('')
    setSelectedSpecs([])
    setTotalBatchQty('')
    totalBatchQtyRef.current = ''
    setRequiredQty('')
    setSampleQty('')
    setParamSample('')
    setErrorQty('0')
    setParamPass('')
    setParamFail('')
    setBomData([])

    if (!cleanStage) {
      setPoOptions([{ value: '', label: 'Vui lòng chọn công đoạn trước' }])
      setProductOptions([{ value: '', label: 'Vui lòng chọn công đoạn trước' }])
      setSpecOptions([{ value: '', label: 'Vui lòng chọn công đoạn trước' }])
    } else {
      setProductOptions([{ value: '', label: 'Vui lòng chọn PO trước' }])
      setSpecOptions([{ value: '', label: 'Vui lòng chọn PO trước' }])
    }
  }

  const handleAreaChange = (newArea) => {
    if (readOnly) return
    setIsDirty(true)
    setArea(newArea)
    setStage(newArea)
    setParamStage(newArea)
    setProcess('')
  }



  const handleResultChange = (val) => {
    setResult(val)
    setIsDirty(true)
    if (val === 'pass') {
      setAction('chap-nhan')
    } else {
      setAction((prev) => (prev === 'cach-ly' ? 'cach-ly' : 'tra-ve'))
    }
  }

  const handleActionChange = (val) => {
    setAction(val)
    setIsDirty(true)
    if (val === 'chap-nhan' || val === 'luu-kho') {
      setResult('pass')
    } else if (val === 'tra-ve') {
      setResult('fail')
    }
  }

  const setResultWithDirty = handleResultChange
  const setActionWithDirty = handleActionChange
  const setProductWithDirty = (val) => { setProduct(val); setIsDirty(true); }
  const setSpecWithDirty = (val) => { setSpec(val); setIsDirty(true); }
  const setSampleQtyWithDirty = (val) => {
    let num = Number(val)
    if (mode !== INSPECT_MODES.DAILY) {
      const maxAllowed = Number(requiredQty) || samplingRule?.sample_size || 0
      if (maxAllowed > 0 && num > maxAllowed) {
        num = maxAllowed
      }
    }
    const finalVal = val === '' ? '' : String(isNaN(num) || num < 0 ? 0 : num)
    setSampleQty(finalVal)
    setParamSample(finalVal)
    setIsDirty(true)
  }
  const setErrorQtyWithDirty = (val) => { setErrorQty(val); setIsDirty(true); }
  const setNoteWithDirty = (val) => { setNote(val); setIsDirty(true); }
  const setErrorsWithDirty = (val) => { setErrors(val); setIsDirty(true); }
  const setParameterWithDirty = (val) => { setParameter(val); setIsDirty(true); }
  const setParamProductWithDirty = (val) => { setParamProduct(val); setIsDirty(true); }
  const setParamSampleWithDirty = (val) => {
    let num = Number(val)
    const maxAllowed = Number(requiredQty) || samplingRule?.sample_size || 0
    if (maxAllowed > 0 && num > maxAllowed) {
      num = maxAllowed
    }
    const finalVal = val === '' ? '' : String(isNaN(num) || num < 0 ? 0 : num)
    setSampleQty(finalVal)
    setParamSample(finalVal)
    setIsDirty(true)
  }
  const setProcessWithDirty = (val) => { setProcess(val); setIsDirty(true); }
  const setAreaWithDirty = (val) => { setArea(val); setIsDirty(true); }
  const setStaffWithDirty = (val) => { setStaff(val); setIsDirty(true); }
  const setAnswersWithDirty = (val) => { setAnswers(val); setIsDirty(true); }
  const setQaResultWithDirty = (val) => { setQaResult(val); setIsDirty(true); }

  const applyLastStage = useCallback((targetStage) => {
    const st = getCleanString(targetStage || userActivity?.lastStage?.name || userActivity?.lastStage)
    if (st) {
      handleStageChange(st)
    }
  }, [userActivity, handleStageChange])

  const applyLastPo = useCallback((targetPo, targetStage) => {
    const p = getCleanString(targetPo || userActivity?.lastPo?.code || userActivity?.lastPo)
    const st = getCleanString(targetStage || userActivity?.lastPo?.stage || userActivity?.lastStage?.name || userActivity?.lastStage)
    if (!p) return

    const currentStage = getCleanString(stage || paramStage)
    // Mặc định tự động chọn Công đoạn khi chọn PO nếu chưa chọn hoặc khác công đoạn
    if (st && (!currentStage || currentStage !== st)) {
      handleStageChange(st)
      setTimeout(() => {
        handlePoChange(p, st)
      }, 150)
    } else {
      handlePoChange(p, currentStage || st)
    }
  }, [userActivity, stage, paramStage, handleStageChange, handlePoChange])

  const applyLastStageAndPo = useCallback((targetStage, targetPo) => {
    const st = getCleanString(targetStage || userActivity?.lastPo?.stage || userActivity?.lastStage?.name || userActivity?.lastStage)
    const p = getCleanString(targetPo || userActivity?.lastPo?.code || userActivity?.lastPo)
    if (st) {
      handleStageChange(st)
      if (p) {
        setTimeout(() => {
          handlePoChange(p, st)
        }, 150)
      }
    } else if (p) {
      handlePoChange(p)
    }
  }, [userActivity, handleStageChange, handlePoChange])

  // Tự động áp dụng dữ liệu gần nhất (Công đoạn & PO) khi mở form mới cho 3 chế độ:
  // Kiểm tra lần đầu (first_sample), Thông số (parameter), Hằng ngày (daily)
  const hasAutoAppliedRef = useRef(false)
  useEffect(() => {
    if (hasAutoAppliedRef.current) return
    if (!isNew || readOnly) return
    if (scannedPalletFromNav) return
    if (![INSPECT_MODES.FIRST_SAMPLE, INSPECT_MODES.PARAMETER, INSPECT_MODES.DAILY].includes(mode)) return

    const currentStage = getCleanString(stage || paramStage)
    const currentPo = getCleanString(po || paramPo)
    // Nếu form đã có công đoạn hoặc PO (từ scan QR hoặc route param) thì không ghi đè
    if (currentStage || currentPo) return

    const targetStage = getCleanString(userActivity?.lastPo?.stage || userActivity?.lastStage?.name || userActivity?.lastStage)
    const targetPo = getCleanString(userActivity?.lastPo?.code || userActivity?.lastPo)

    if (targetStage || targetPo) {
      hasAutoAppliedRef.current = true
      if (targetStage) {
        handleStageChange(targetStage)
        if (targetPo) {
          setTimeout(() => {
            handlePoChange(targetPo, targetStage)
            setIsDirty(false)
          }, 150)
        } else {
          setIsDirty(false)
        }
      } else if (targetPo) {
        handlePoChange(targetPo)
        setIsDirty(false)
      }
    }
  }, [isNew, readOnly, mode, stage, paramStage, po, paramPo, scannedPalletFromNav, userActivity, handleStageChange, handlePoChange])

  return {
    id,
    navigate,
    isNew,
    readOnly,
    isDirty,
    setIsDirty,
    handleCancelOrBack,
    user,
    creatorName,
    ticket,
    loading,
    steps,
    setSteps,
    images,
    setImages,
    addImage,
    removeImage,
    mode,
    setMode,
    modeOptions,
    handleModeChange,
    stage,
    setStage: handleStageChange,
    handleStageChange,
    po,
    setPo: handlePoChange,
    handlePoChange,
    result,
    setResult: handleResultChange,
    action,
    setAction: handleActionChange,
    handleResultChange,
    handleActionChange,
    product,
    setProduct: setProductWithDirty,
    spec,
    setSpec: setSpecWithDirty,
    sampleQty,
    setSampleQty: setSampleQtyWithDirty,
    errorQty,
    setErrorQty: setErrorQtyWithDirty,
    note,
    setNote: setNoteWithDirty,
    errors,
    setErrors: setErrorsWithDirty,
    parameter,
    setParameter: setParameterWithDirty,
    parameterOptions,
    setParameterOptions,
    paramStage,
    setParamStage: handleStageChange,
    handleParamStageChange: handleStageChange,
    paramPo,
    setParamPo: handlePoChange,
    handleParamPoChange: handlePoChange,
    paramProduct,
    setParamProduct: setParamProductWithDirty,
    handleParamProductChange: (val) => { setParamProduct(val); setProduct(val); setIsDirty(true); },
    paramSample,
    setParamSample: setParamSampleWithDirty,
    paramPass,
    setParamPass,
    paramFail,
    setParamFail,
    process,
    setProcess: setProcessWithDirty,
    area,
    setArea: handleAreaChange,
    handleAreaChange,
    staff,
    setStaff: setStaffWithDirty,
    staffOptions,
    setStaffOptions,
    qaQuestions,
    setQaQuestions,
    answers,
    setAnswers: setAnswersWithDirty,
    showAnswers,
    setShowAnswers,
    qaResult,
    setQaResult: setQaResultWithDirty,
    stageOptions,
    processOptions,
    poOptions,
    handlePoSearch,
    productOptions,
    specOptions,
    bomData,
    requiredQty,
    setRequiredQty: handleRequiredQtyChange,
    totalBatchQty,
    setTotalBatchQty,
    isIncomingStage: isIncoming,
    partHistoryTickets,
    isPartHistoryModalOpen,
    setIsPartHistoryModalOpen,
    totalInspectedSoFar,
    isQtyConverted,
    displayRequiredQty: (isQtyConverted || getQuantityConversionDetails(product || spec, requiredQty).isConverted) && requiredQty ? `≈ ${requiredQty}` : (requiredQty || ''),
    samplingRule,
    guideVisible,
    setGuideVisible,
    palletCode,
    setPalletCode,
    palletOptions,
    recentTickets,
    isRecentModalOpen,
    setIsRecentModalOpen,
    handlePalletSelect,
    applyRecentTicket,
    autoTicketCode,
    confirmErrModal,
    setConfirmErrModal,
    finishModal,
    setFinishModal,
    submitting,
    defectOptions,
    allDefectOptions,
    previewImage,
    setPreviewImage,
    modalConfig,
    confirmConfig,
    fileRef,
    isFailedResult,
    handleStepResultChange,
    isIncomingStage: Boolean(
      (stage && (stage.toLowerCase().includes('đầu vào') || stage.toLowerCase().includes('nhập kho'))) ||
      (paramStage && (paramStage.toLowerCase().includes('đầu vào') || paramStage.toLowerCase().includes('nhập kho')))
    ),
    selectedProducts,
    setSelectedProducts,
    selectedSpecs,
    setSelectedSpecs,
    lockedSpecs,
    handleMultiProductChange,
    handleMultiSpecChange,
    handleProductChange,
    handleLoadLastResult,
    handleImagePick,
    addErrorRow,
    removeErrorRow,
    updateError,
    handleCreatePallet,
    handleSubmit,
    handleFinishConfirm,
    handleConfirmTicketClick,
    ticketCode,
    displayCreator,
    displayTime,
    isDone,
    summary,
    currentGuide,
    setSteps,
    userActivity,
    applyLastStage,
    applyLastPo,
    applyLastStageAndPo,
  }
}
