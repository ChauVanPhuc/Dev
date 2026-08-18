import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useAuthStore from '@modules/auth/Models/authModel'
import { useInspectionController, useInspectionDetail } from './useInspectionController'
import {
  INSPECT_MODES,
  INSPECT_MODE_OPTIONS,
  MODE_TO_ROUTE,
  ROUTES,
  BOM_STAGE_OPTIONS,
  MOCK_PARAMETER_OPTIONS,
} from '../constants'
import { stageService } from '../services/stageService'
import { orderService } from '../services/orderService'
import { inspectionService } from '../services/inspectionService'

const initErrors = () => [{ id: 1, name: '', qty: 0 }]

const compactSpec = (spec) => {
  if (!spec) return ''
  const firstPart = String(spec).split(/\s*[-–—]\s*/)[0]?.trim() || ''
  return firstPart || spec
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
    return (
      sRaw === stRaw ||
      sNorm === stNorm ||
      sRaw.includes(stRaw) ||
      stRaw.includes(sRaw) ||
      (sNorm && stNorm && (sNorm.includes(stNorm) || stNorm.includes(sNorm)))
    )
  })
}

const DEFAULT_FALLBACK_DEFECTS = []

export const useInspectionFormBase = (fixedMode = INSPECT_MODES.FIRST_SAMPLE) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'NEW'
  const readOnly = !isNew

  const user = useAuthStore((state) => state.user)
  const creatorName = user?.full_name || user?.username || 'Nguyễn Văn A'
  const { createTicket, confirmTicket } = useInspectionController()
  const { ticket, loading, steps, setSteps, images, setImages, addImage, removeImage, loadGuide, getLastResult } =
    useInspectionDetail(isNew ? null : id)

  const [mode, setMode] = useState(fixedMode)
  const [stage, setStage] = useState('')
  const [po, setPo] = useState('')
  const [result, setResult] = useState('pass')
  const [product, setProduct] = useState('')
  const [spec, setSpec] = useState('')
  const [selectedProducts, setSelectedProducts] = useState([])
  const [selectedSpecs, setSelectedSpecs] = useState([])
  const [sampleQty, setSampleQty] = useState('')
  const [errorQty, setErrorQty] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState(initErrors())

  const [parameter, setParameter] = useState('do_am')
  const [parameterOptions, setParameterOptions] = useState(MOCK_PARAMETER_OPTIONS)
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
  const [stageOptions, setStageOptions] = useState(BOM_STAGE_OPTIONS)
  const [processOptions, setProcessOptions] = useState([{ value: '', label: 'Chọn quy trình' }])
  const [poOptions, setPoOptions] = useState([{ value: '', label: 'Chọn PO' }])
  const [productOptions, setProductOptions] = useState([{ value: '', label: 'Chọn sản phẩm' }])
  const [specOptions, setSpecOptions] = useState([{ value: '', label: 'Chọn quy cách' }])
  const [bomData, setBomData] = useState([])
  const [requiredQty, setRequiredQty] = useState('')

  const [guideVisible, setGuideVisible] = useState(false)
  const [palletCode, setPalletCode] = useState('')
  const [palletOptions, setPalletOptions] = useState([
    { value: 'DA7819', label: 'DA7819' },
    { value: 'DA7820', label: 'DA7820' },
    { value: 'DA7821', label: 'DA7821' }
  ])
  const [recentTickets, setRecentTickets] = useState([])
  const [isRecentModalOpen, setIsRecentModalOpen] = useState(false)
  const [autoTicketCode, setAutoTicketCode] = useState(() => `KT${String(Date.now()).slice(-4)}${Math.floor(10 + Math.random() * 90)}`)
  const [confirmErrModal, setConfirmErrModal] = useState(false)
  const [finishModal, setFinishModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [stagesList, setStagesList] = useState([])
  const [defectCatalog, setDefectCatalog] = useState([])
  const [ctqGuides, setCtqGuides] = useState([])
  const [previewImage, setPreviewImage] = useState(null)
  const [isDirty, setIsDirty] = useState(false)

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
    inspectionService.getDefectTypes(user?.id)
      .then((data) => setDefectCatalog(data || []))
      .catch((err) => console.warn('Lỗi tải danh mục lỗi:', err))

    inspectionService.getCTQGuides()
      .then((data) => setCtqGuides(data || []))
      .catch((err) => console.warn('Lỗi tải danh sách CTQ:', err))

    inspectionService.getPallets()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setPalletOptions(list.map((p) => (typeof p === 'string' ? { value: p, label: p } : p)))
        }
      })
      .catch((e) => console.warn('[useInspectionFormBase] getPallets error:', e))
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
        if (origin.po) {
          setPo(origin.po)
          setParamPo(origin.po)
        }
        if (origin.stage) {
          setStage(origin.stage)
          setParamStage(origin.stage)
        }
        if (origin.product) {
          setProduct(origin.product)
          setParamProduct(origin.product)
        }
        if (origin.spec) setSpec(origin.spec)
        if (origin.requiredQty) setRequiredQty(origin.requiredQty)
        if (origin.sampleQty) {
          setSampleQty(origin.sampleQty)
          setParamSample(origin.sampleQty)
        }
      }
    } catch (e) {
      console.warn('[useInspectionFormBase] handlePalletSelect error:', e)
    }
  }

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

    // Bổ sung danh mục lỗi chuẩn nếu danh sách chưa đầy đủ
    DEFAULT_FALLBACK_DEFECTS.forEach((d) => {
      const dCode = d.code.toLowerCase().trim()
      const dName = d.name.toLowerCase().trim()

      if (seenCodes.has(dCode) || seenNames.has(dName)) return

      list.push({
        id: d.id,
        code: d.code,
        name: d.name,
        label: `[${d.code}] ${d.name}`,
        category: d.category,
        needs_tracking: d.needs_tracking,
        isQA: Boolean(d.needs_tracking || d.isCTQ),
        isCTQ: Boolean(d.isCTQ),
        source: 'default_fallback',
      })
      seenCodes.add(dCode)
      seenNames.add(dName)
    })

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
      needs_tracking: d.needs_tracking,
      qc_tracking: d.qc_tracking,
      is_tracked_by_me: d.is_tracked_by_me,
      isQA: Boolean(d.needs_tracking || d.qc_tracking || d.is_tracked_by_me || d.isCTQ),
      isCTQ: d.isCTQ,
      ctq_id: d.ctq_id,
      defect_type_id: d.defect_type_id,
    }))
  }, [combinedDefects])

  // Tự động hiện sẵn các lỗi QA Track / QC Track / CTQ theo công đoạn hiện tại vào danh sách ghi nhận lỗi
  useEffect(() => {
    if (readOnly || !isNew) return
    if (!defectOptions || defectOptions.length === 0) return

    const trackedOpts = defectOptions.filter(
      (opt) => opt.isQA || opt.isCTQ || opt.needs_tracking || opt.qc_tracking || opt.is_tracked_by_me
    )
    if (trackedOpts.length === 0) return

    setErrors((prevErrors) => {
      // Giữ lại các dòng người dùng đã nhập số lượng > 0 hoặc dòng tự gõ lỗi thủ công
      const userEditedRows = prevErrors.filter(
        (e) => Number(e.qty) > 0 || (!e.defectId && e.name && e.name.trim() !== '')
      )

      const autoRows = trackedOpts.map((opt, idx) => ({
        id: `auto_tracked_${opt.id}_${idx}`,
        defectId: opt.id || opt.value,
        code: opt.code || '',
        name: opt.name,
        isQA: Boolean(opt.isQA || opt.needs_tracking || opt.qc_tracking || opt.is_tracked_by_me),
        isCTQ: Boolean(opt.isCTQ),
        qty: 0,
      }))

      if (userEditedRows.length > 0) {
        const autoDefectIds = new Set(autoRows.map((a) => String(a.defectId)))
        const extraUserRows = userEditedRows.filter(
          (u) => !u.defectId || !autoDefectIds.has(String(u.defectId))
        )
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
    const activeStage = stage || paramStage
    if (activeStage === 'Đầu vào') {
      orderService.getPurchaseOrders()
        .then((poCodes) => {
          const opts = poCodes.map((code) => ({ value: code, label: code }))
          setPoOptions([{ value: '', label: 'Chọn PO' }, ...opts])
        })
        .catch(() => {
          setPoOptions([{ value: '', label: 'Chọn PO' }])
        })
    } else {
      orderService.getAll()
        .then((res) => {
          const orders = res.orders || []
          const opts = orders.map((o) => ({ value: o.po_code, label: o.po_code }))
          setPoOptions([{ value: '', label: 'Chọn PO' }, ...opts])
        })
        .catch(() => {
          setPoOptions([{ value: '', label: 'Chọn PO' }])
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
    const activePo = po || paramPo
    if (!activePo) {
      if (isNew) {
        setProduct('')
        setParamProduct('')
        setSpec('')
        setProductOptions([{ value: '', label: 'Chọn sản phẩm' }])
        setSpecOptions([{ value: '', label: 'Chọn quy cách' }])
        setBomData([])
        setRequiredQty('')
      }
      return
    }
    const activeStage = stage || paramStage
    orderService.getBom(activePo, activeStage)
      .then((data) => {
        const bomList = data || []
        setBomData(bomList)
        const opts = bomList.map((p) => ({ value: p.part_name, label: p.part_name }))
        
        if (bomList.length === 0) {
          setProductOptions([{ value: '', label: 'Không có chi tiết cho công đoạn này' }])
        } else {
          setProductOptions([{ value: '', label: 'Chọn sản phẩm' }, ...opts])
        }

        if (isNew && bomList.length > 0) {
          const currentProd = product || paramProduct
          const matchedPart = bomList.find((p) => p.part_name === currentProd) || bomList[0]
          
          setProduct(matchedPart.part_name)
          setParamProduct(matchedPart.part_name)
          
          const firstSpecs = matchedPart.specs || []
          const specOpts = firstSpecs.map((s) => ({ value: compactSpec(s.specification), label: compactSpec(s.specification) }))
          setSpecOptions([{ value: '', label: 'Chọn quy cách' }, ...specOpts])
          if (firstSpecs.length > 0) {
            setSpec(compactSpec(firstSpecs[0].specification))
          } else {
            setSpec('')
          }
          if (matchedPart.total_qty) {
            setRequiredQty(String(matchedPart.total_qty))
            const calcSample = Math.max(1, Math.ceil(Number(matchedPart.total_qty) * 0.05))
            setSampleQty(String(calcSample))
            setParamSample(String(calcSample))
          } else {
            setRequiredQty('')
          }
        } else if (isNew) {
          setProduct('')
          setParamProduct('')
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
          setParamProduct('')
          setSpec('')
          setRequiredQty('')
        }
      })
  }, [po, paramPo, stage, paramStage, isNew])

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
    } else if (sampleVal > 0 && totalFail === 0) {
      setResult('pass')
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

    if (mode === INSPECT_MODES.FIRST_SAMPLE || mode === INSPECT_MODES.RE_INSPECT) {
      const matchedStage = stagesList.find((s) => s.name === stage)
      const stageId = matchedStage ? matchedStage.id : null
      loadGuide(mode, null, stageId)
    } else {
      setSteps([])
    }
  }, [mode, stage, process, stagesList, isNew, ticket])

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

  const handleMultiProductChange = (partNamesArray) => {
    if (readOnly) return
    setIsDirty(true)
    setSelectedProducts(partNamesArray)
    const combinedStr = partNamesArray.join(', ')
    setProduct(combinedStr)
    setParamProduct(combinedStr)

    const selectedParts = bomData.filter((p) => partNamesArray.includes(p.part_name))
    let allSpecs = []
    let totalQtySum = 0

    selectedParts.forEach((part) => {
      if (Array.isArray(part.specs)) {
        allSpecs.push(...part.specs)
      }
      if (part.total_qty) {
        totalQtySum += Number(part.total_qty)
      }
    })

    const specOpts = allSpecs.map((s) => ({ value: compactSpec(s.specification), label: compactSpec(s.specification) }))
    const uniqueSpecOpts = Array.from(new Set(specOpts.map((s) => s.value))).map((val) => ({ value: val, label: val }))
    setSpecOptions([{ value: '', label: 'Chọn quy cách' }, ...uniqueSpecOpts])

    if (totalQtySum > 0) {
      setRequiredQty(String(totalQtySum))
      const calcSample = Math.max(1, Math.ceil(totalQtySum * 0.05))
      setSampleQty(String(calcSample))
    }
  }

  const handleMultiSpecChange = (specArray) => {
    if (readOnly) return
    setIsDirty(true)
    setSelectedSpecs(specArray)
    const combinedStr = specArray.join(', ')
    setSpec(combinedStr)
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
    for (const f of Array.from(e.target.files)) await addImage(f)
  }

  const addErrorRow = () => {
    if (readOnly) return
    setErrors((p) => [...p, { id: Date.now(), defectId: null, code: '', name: '', qty: 0 }])
  }

  const removeErrorRow = (idx) => {
    if (readOnly) return
    setErrors((p) => p.filter((_, i) => i !== idx))
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
      if (!area) {
        showMessage('Thiếu thông tin', 'Vui lòng chọn Khu vực kiểm tra trước khi tiếp tục.', 'warning')
        return
      }
    } else if (mode === INSPECT_MODES.QA) {
      if (!staff) {
        showMessage('Thiếu thông tin', 'Vui lòng chọn Tên nhân sự trước khi tiếp tục.', 'warning')
        return
      }
    }

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
      const activeStage = mode === INSPECT_MODES.PARAMETER ? paramStage : (mode === INSPECT_MODES.PROCESS ? area : stage)
      const activePo = mode === INSPECT_MODES.PARAMETER ? paramPo : po
      const activeProduct = mode === INSPECT_MODES.PARAMETER ? paramProduct : product
      const activeResult = mode === INSPECT_MODES.QA ? qaResult : result
      const activeSampleQty = mode === INSPECT_MODES.PARAMETER ? paramSample : sampleQty
      const activeErrorQty = mode === INSPECT_MODES.PARAMETER ? paramFail : errorQty
      const finalPalletCode = mode === INSPECT_MODES.PROCESS ? '' : (modalData?.palletCode || palletCode)

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
        mode === INSPECT_MODES.PROCESS
          ? 'Đã lưu phiếu kiểm tra quy trình thành công!'
          : `Đã lưu phiếu kiểm tra thành công cho mã Pallet: ${finalPalletCode}!`,
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

  const summary = {
    poCode: mode === INSPECT_MODES.PARAMETER ? (paramPo || '—') : (po || ticket?.po_code || ticket?.po || '—'),
    result: mode === INSPECT_MODES.QA ? qaResult : (result || ticket?.conclusion || ticket?.result || 'pass'),
    product: mode === INSPECT_MODES.PARAMETER ? (paramProduct || '—') : (product || ticket?.product_name || ticket?.detail_name || ticket?.product || '—'),
    spec: compactSpec(spec || ticket?.specification || ticket?.spec) || '—',
    needQty: requiredQty || ticket?.quantity_plan || ticket?.required_qty || sampleQty || '—',
    sampleQty: (mode === INSPECT_MODES.PARAMETER ? paramSample : (sampleQty || ticket?.sample_qty || ticket?.sampleQty)) || '—',
    errorQty: (mode === INSPECT_MODES.PARAMETER ? paramFail : (errorQty || ticket?.error_qty || ticket?.errorQty)) || '0',
  }

  const handleModeChange = (newMode) => {
    if (newMode === mode) return
    const doChange = () => {
      setIsDirty(false)
      setMode(newMode)
      const targetRoute = MODE_TO_ROUTE[newMode] || ROUTES.INSPECTION_FIRST_SAMPLE
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

  const setStageWithDirty = (val) => { setStage(val); setIsDirty(true); }
  const setPoWithDirty = (val) => { setPo(val); setIsDirty(true); }
  const setResultWithDirty = (val) => { setResult(val); setIsDirty(true); }
  const setProductWithDirty = (val) => { setProduct(val); setIsDirty(true); }
  const setSpecWithDirty = (val) => { setSpec(val); setIsDirty(true); }
  const setSampleQtyWithDirty = (val) => { setSampleQty(val); setIsDirty(true); }
  const setErrorQtyWithDirty = (val) => { setErrorQty(val); setIsDirty(true); }
  const setNoteWithDirty = (val) => { setNote(val); setIsDirty(true); }
  const setErrorsWithDirty = (val) => { setErrors(val); setIsDirty(true); }
  const setParameterWithDirty = (val) => { setParameter(val); setIsDirty(true); }
  const setParamStageWithDirty = (val) => { setParamStage(val); setIsDirty(true); }
  const setParamPoWithDirty = (val) => { setParamPo(val); setIsDirty(true); }
  const setParamProductWithDirty = (val) => { setParamProduct(val); setIsDirty(true); }
  const setParamSampleWithDirty = (val) => { setParamSample(val); setIsDirty(true); }
  const setProcessWithDirty = (val) => { setProcess(val); setIsDirty(true); }
  const setAreaWithDirty = (val) => { setArea(val); setIsDirty(true); }
  const setStaffWithDirty = (val) => { setStaff(val); setIsDirty(true); }
  const setAnswersWithDirty = (val) => { setAnswers(val); setIsDirty(true); }
  const setQaResultWithDirty = (val) => { setQaResult(val); setIsDirty(true); }

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
    modeOptions: INSPECT_MODE_OPTIONS,
    handleModeChange,
    stage,
    setStage: setStageWithDirty,
    po,
    setPo: setPoWithDirty,
    result,
    setResult: setResultWithDirty,
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
    setParamStage: setParamStageWithDirty,
    handleParamStageChange: (val) => { setParamStage(val); setStage(val); setIsDirty(true); },
    paramPo,
    setParamPo: setParamPoWithDirty,
    handleParamPoChange: (val) => { setParamPo(val); setPo(val); setParamProduct(''); setProduct(''); setIsDirty(true); },
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
    setArea: setAreaWithDirty,
    staff,
    setStaff: setStaffWithDirty,
    answers,
    setAnswers: setAnswersWithDirty,
    showAnswers,
    setShowAnswers,
    qaResult,
    setQaResult: setQaResultWithDirty,
    stageOptions,
    processOptions,
    poOptions,
    productOptions,
    specOptions,
    bomData,
    requiredQty,
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
    previewImage,
    setPreviewImage,
    modalConfig,
    confirmConfig,
    fileRef,
    isFailedResult,
    handleStepResultChange,
    isIncomingStage: stage === 'Đầu vào' || paramStage === 'Đầu vào',
    selectedProducts,
    setSelectedProducts,
    selectedSpecs,
    setSelectedSpecs,
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
  }
}
