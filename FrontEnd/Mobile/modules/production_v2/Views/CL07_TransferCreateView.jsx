import { useState, useEffect, useRef, useCallback } from 'react'
import useAuthStore from '@modules/auth/Models/authModel'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Eye, ImagePlus, X, ChevronDown, Check, ScanLine, ArrowLeft, Camera, Plus } from 'lucide-react'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import FormMultiSearchSelect from '@mobile/Shared/Views/components/form/FormMultiSearchSelect'
import QRScanner from '@mobile/Shared/Views/components/media/QRScanner'
import { useTransferController, useTransferDetail } from '../Controllers/useTransferController'
import useProduction_v2Store from '../Models/production_v2Store'
import { stageService } from '../services/stageService'
import { transferService } from '../services/transferService'
import TransferItemTable from './components/TransferItemTable'
import ConfirmQtyModal from './components/ConfirmQtyModal'
import PalletCardModal from '@modules/delivery/Views/components/PalletCardModal'
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal'
import ActionConfirmModal from '@mobile/Shared/Views/components/ui/ActionConfirmModal'
import { ROUTES } from '../constants'
import apiClient, { getFullImageUrl } from '@shared/services/api'
import '../styles/production_v2.css'

const palletOpts = [{ value: '', label: 'Chọn mã pallet' }]

const newItems = () => []

const isInvalidSpec = (spec) => {
  if (!spec) return true
  const str = String(spec).trim()
  if (!str) return true
  if (/^[\s*_\-—–.,/\\#]+$/.test(str)) return true
  if (/^0(?:\s*[*xX×]\s*0)*$/i.test(str)) return true
  const lower = str.toLowerCase()
  if (['tiêu chuẩn', 'quy cách tiêu chuẩn', 'quy cách thành phẩm', 'n/a', 'na', 'none', 'null', 'undefined', '—', '–'].includes(lower)) {
    return true
  }
  return false
}

const parseDimensionStringFromText = (text) => {
  if (!text) return null
  const str = String(text)
  const m3d = str.match(/(\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?(?:\s*mm|\s*cm)?)/i)
  if (m3d) return m3d[1].replace(/\s*/g, '')
  const mHw = str.match(/(\b\d{4,5}\s*[-–—*xX×]\s*\d{3,4}(?:mm|cm)?\b)/i)
  if (mHw) return mHw[1].replace(/\s*/g, '')
  const m2d = str.match(/(\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?(?:\s*mm|\s*cm)?)/i)
  if (m2d) return m2d[1].replace(/\s*/g, '')
  const mBolt = str.match(/([MØOD]?\d+(?:[.,]\d+)?\s*[*xX×-]\s*\d+(?:[.,]\d+)?(?:\s*mm)?)/i)
  if (mBolt) return mBolt[1].replace(/\s*/g, '')
  const mCode = str.match(/(\b[A-Z0-9]{2,6}\s*[-–—]\s*\d{2,4}(?:mm|cm)?\b)/i)
  if (mCode) return mCode[1].replace(/\s*/g, '')
  // 6. Single size with unit: e.g. 350mm, 50cm (chỉ chấp nhận mm hoặc cm, không match đơn vị 'm' để tránh nhầm các từ tiếng Việt như 'mặt', 'màu', 'mép')
  const mUnit = str.match(/(?:^|[^\p{L}\d])(\d+(?:[.,]\d+)?\s*(?:mm|cm))(?:$|[^\p{L}\d])/iu)
  if (mUnit) return mUnit[1].replace(/\s*/g, '')
  return null
}

const getEffectiveSpec = (specRaw, partName) => {
  // 1. Ưu tiên hàng đầu: Lấy quy cách thực tế đã có trong CSDL (specRaw)
  if (specRaw && !isInvalidSpec(specRaw)) {
    return String(specRaw).trim()
  }
  // 2. Dự phòng: Nếu CSDL không có hoặc invalid, mới trích xuất kích thước từ tên chi tiết (partName)
  const dimStr = parseDimensionStringFromText(partName)
  if (dimStr && !isInvalidSpec(dimStr)) return dimStr

  return 'Tiêu chuẩn'
}

const generateAutoPalletCode = () => {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return `BG-${yy}${mm}${dd}-${rand}`
}

const CL07_TransferCreateView = ({ embedded = false, backupQrCode: propBackupQrCode, deliveryId: propDeliveryId }) => {
  const { id: routeId } = useParams()
  const id = propDeliveryId !== undefined ? propDeliveryId : routeId
  const navigate = useNavigate()
  const location = useLocation()
  const backupQrCode = propBackupQrCode || location.state?.backupQrCode || null
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false)
  const isNew = !id || id === 'NEW'
  const readOnly = !isNew
  const [ticketCode, setTicketCode] = useState('LC---')
  const user = useAuthStore((state) => state.user)
  const creatorName = user?.full_name || user?.username || 'Nguyễn Văn A'
  const { createTicket, confirmTicket } = useTransferController()

  useEffect(() => {
    if (backupQrCode) {
      setForm((f) => ({ ...f, palletCode: backupQrCode }))
      setPalletOpts((prev) => {
        if (!prev.some((o) => o.value === backupQrCode)) {
          return [{ value: backupQrCode, label: `Thẻ DP: ${backupQrCode}` }, ...prev]
        }
        return prev
      })
    }
  }, [backupQrCode])

  useEffect(() => {
    if (!isNew) {
      const raw = String(id)
      setTicketCode(/^LC\d+/i.test(raw) ? raw.toUpperCase() : `LC${raw.padStart(3, '0')}`)
      return
    }
    let mounted = true
    transferService.getNextCode().then((code) => {
      if (mounted) setTicketCode(code)
    })
    return () => { mounted = false }
  }, [isNew, id])
  const { ticket, loading, images, setImages, addImage, removeImage } = useTransferDetail(isNew ? null : id)
  const { transferFilters } = useProduction_v2Store()

  const selectedMonth = transferFilters?.month || (new Date().getMonth() + 1)

  const [form, setForm] = useState({
    palletCode: '', totalQty: '', surplus: '', detail: '', spec: '',
    fromStage: 'Định hình', toStage: '', note: '',
  })
  const [items, setItems] = useState(newItems())
  const [noPallet, setNoPallet] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [editIdx, setEditIdx] = useState(null)
  const [confirmModal, setConfirmModal] = useState(false)
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false)
  const [showPalletModal, setShowPalletModal] = useState(false)
  const [palletData, setPalletData] = useState(null)
  const [palletPartProducts, setPalletPartProducts] = useState([])
  const [planName, setPlanName] = useState('Luân chuyển sản xuất')
  const [planId, setPlanId] = useState(1)
  const [productOptions, setProductOptions] = useState([{ value: '', label: 'Chọn chi tiết' }])
  const [stageOptions, setStageOptions] = useState(
    [{ value: '', label: 'Chọn công đoạn' }]
  )
  const [palletOpts, setPalletOpts] = useState([{ value: '', label: 'Chọn mã pallet' }])
  const fileRef = useRef()
  const specDropRef = useRef()

  const [partsData, setPartsData] = useState([])
  const [selectedDetails, setSelectedDetails] = useState([])
  const [specOptions, setSpecOptions] = useState([{ value: '', label: 'Chọn quy cách' }])
  const [specDropdownOpen, setSpecDropdownOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

  // Load danh sách mã pallet đã được kiểm tra từ CL09A / StageInspections
  useEffect(() => {
    let isMounted = true
    const fetchInspectedPallets = async () => {
      try {
        const res = await apiClient.get('/inspections/pallets')
        const itemsList = res.data || []
        if (Array.isArray(itemsList) && itemsList.length > 0 && isMounted) {
          const opts = [
            { value: '', label: 'Chọn mã pallet' },
            ...itemsList.map((p) => {
              const code = p.palletCode || p.code
              const prod = p.product ? ` - ${p.product}` : ''
              const po = p.po ? ` (${p.po})` : ''
              return { value: code, label: `${code}${prod}${po}` }
            })
          ]
          setPalletOpts(opts)
        }
      } catch (err) {
        console.warn('Lỗi khi lấy danh sách mã pallet từ /inspections/pallets:', err)
      }
    }
    fetchInspectedPallets()
    return () => { isMounted = false }
  }, [])

  // Click outside đóng dropdown spec
  useEffect(() => {
    const handler = (e) => {
      if (specDropRef.current && !specDropRef.current.contains(e.target)) {
        setSpecDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Load available stages from DB
  useEffect(() => {
    stageService.getAll().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        const opts = [{ value: '', label: 'Chọn công đoạn' }, ...data.map((s) => ({ value: s.name, label: s.name }))]
        setStageOptions(opts)
      }
    }).catch((err) => {
      console.warn('Lỗi khi tải công đoạn từ DB:', err)
    })
  }, [])

  // Load KHSX theo tháng đã chọn
  useEffect(() => {
    transferService.getPlanByMonth(selectedMonth).then((p) => {
      setPlanName(p.code || p.name || 'Luân chuyển sản xuất')
      if (p.id) setPlanId(p.id)
    })
  }, [selectedMonth])

  // Helper tính danh sách 5 tháng (2 tháng trước, tháng hiện tại, 2 tháng tiếp theo)
  const get5MonthWindow = useCallback((baseMonth) => {
    const m = Number(baseMonth) || (new Date().getMonth() + 1)
    const windowMonths = []
    for (let offset = -2; offset <= 2; offset++) {
      let target = (m + offset) % 12
      if (target <= 0) target += 12
      windowMonths.push(target)
    }
    return windowMonths
  }, [])

  const cleanAndSplitStages = (stageStr) => {
    if (!stageStr) return []
    const cleaned = String(stageStr).replace(/\b(QC|PQC1|PQC2|PQC|IQC|FQC)\b/gi, '').trim()
    const parts = cleaned.split(/[-/,|+]|\bhoặc\b/i).map((s) => s.trim()).filter(Boolean)
    return parts.length > 0 ? parts : [String(stageStr).trim()]
  }

  // Helper phân tách công đoạn nhận và cập nhật options + values cho TẤT CẢ các chi tiết được chọn
  const updateStageOptionsForDetails = useCallback((detailsList, partsDataList = partsData) => {
    const userStage = user?.activeStageName || user?.stage_name || ''
    const names = Array.isArray(detailsList) ? detailsList : [detailsList]

    const matchedParts = names
      .map((dName) => {
        const nameStr = typeof dName === 'string' ? dName : (dName?.part_name || dName?.name)
        return partsDataList.find((p) => (p.part_name || p.name) === nameStr) || (typeof dName === 'object' ? dName : null)
      })
      .filter(Boolean)

    const firstPart = matchedParts[0]
    const fromSt = firstPart?.input_stage || userStage || 'Tạo phôi'

    let possibleToStagesSet = new Set()
    matchedParts.forEach((partObj) => {
      const outStr = partObj?.output_stage || ''
      if (outStr) {
        outStr.split(/[,/|+]|\bhoặc\b/i).forEach((s) => {
          const trimmed = s.trim()
          if (trimmed) possibleToStagesSet.add(trimmed)
        })
      }
    })

    let possibleToStages = Array.from(possibleToStagesSet)

    if (possibleToStages.length === 0) {
      const nextSt = getNextStageName(fromSt, stageOptions)
      if (nextSt) {
        possibleToStages = [nextSt]
      }
    }

    let newToStageOpts = []
    let selectedToStage = ''

    if (possibleToStages.length === 1) {
      selectedToStage = possibleToStages[0]
      newToStageOpts = [{ value: selectedToStage, label: selectedToStage }]
    } else if (possibleToStages.length > 1) {
      newToStageOpts = [
        { value: '', label: 'Chọn công đoạn' },
        ...possibleToStages.map((s) => ({ value: s, label: s }))
      ]
      selectedToStage = possibleToStages[0]
    } else {
      newToStageOpts = stageOptions
    }

    setStageOptions(newToStageOpts)
    setForm((prev) => ({
      ...prev,
      fromStage: fromSt,
      toStage: (prev.toStage && possibleToStages.includes(prev.toStage)) ? prev.toStage : (selectedToStage || prev.toStage)
    }))
  }, [user, partsData, stageOptions])

  // Hàm tải danh sách chi tiết (Component Parts) linh hoạt
  const loadPartsList = useCallback(async (isNoPalletMode, baseMonth = selectedMonth) => {
    try {
      const activeStage = user?.activeStageName || user?.stage_name || user?.department_name || ''
      let partsList = []
      if (isNoPalletMode) {
        const fiveMonths = get5MonthWindow(baseMonth)
        partsList = await transferService.getParts({
          months: fiveMonths,
          department_id: user?.department_id,
          department_name: user?.department_name,
          stage: activeStage,
          exclude_completed: true
        })
      } else {
        partsList = await transferService.getParts({
          month: baseMonth,
          department_id: user?.department_id,
          department_name: user?.department_name,
          stage: activeStage
        })
      }

      if (Array.isArray(partsList)) {
        // Lọc nghiêm ngặt chỉ hiển thị chi tiết thuộc công đoạn tài khoản (hỗ trợ tên công đoạn ghép như QC Sơn - Đóng Gói)
        let filteredList = partsList
        if (activeStage) {
          const userTokens = cleanAndSplitStages(activeStage).map((s) => s.toLowerCase())
          filteredList = partsList.filter((p) => {
            const inSt = (p.input_stage || '').toLowerCase().trim()
            if (!inSt) return true
            return userTokens.some((tok) =>
              inSt.includes(tok) || tok.includes(inSt)
            )
          })
        }
        if (filteredList.length === 0 && partsList.length > 0) {
          filteredList = partsList
        }

        setPartsData(filteredList)
        const opts = filteredList.map((p) => {
          const name = typeof p === 'string' ? p : (p.part_name || p.name)
          const remText = p.remaining_qty !== undefined ? ` (Còn: ${p.remaining_qty})` : ''
          return { value: name, label: `${name}${remText}`, rawName: name }
        })
        setProductOptions(opts)
      }
    } catch (err) {
      console.warn('Lỗi khi lấy Chi tiết sản phẩm từ /production-v2/parts:', err)
    }
  }, [get5MonthWindow, selectedMonth, user])

  // Load Chi tiết sản phẩm ban đầu hoặc khi đổi tháng / đổi trạng thái noPallet
  useEffect(() => {
    loadPartsList(noPallet, selectedMonth)
  }, [noPallet, selectedMonth, loadPartsList])

  useEffect(() => {
    if (ticket) {
      setForm((f) => ({
        ...f,
        palletCode: ticket.palletCode || '',
        totalQty: ticket.totalQty || '',
        fromStage: ticket.fromStage || 'Định hình',
        toStage: ticket.toStage || '',
        note: ticket.note || '',
        detail: ticket.detail || '',
      }))
      if (ticket.items) {
        setItems(ticket.items)
        const detailsFromItems = Array.from(new Set(ticket.items.map((it) => it.detail).filter(Boolean)))
        setSelectedDetails(detailsFromItems)
      }
    }
  }, [ticket])

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

  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const recalculateQtyAndSurplus = useCallback((updatedItems) => {
    const totalQty = updatedItems.reduce((acc, item) => acc + (Number(item.qty) || 0), 0)
    const itemSurplus = updatedItems.reduce((acc, item) => {
      const q = Number(item.qty) || 0
      const t = Number(item.total) || 0
      return acc + (t > 0 ? Math.max(0, q - t) : 0)
    }, 0)

    setForm((prev) => ({
      ...prev,
      totalQty: String(totalQty),
      surplus: itemSurplus > 0 ? String(itemSurplus) : ''
    }))
  }, [])

  useEffect(() => {
    recalculateQtyAndSurplus(items)
  }, [items, recalculateQtyAndSurplus])

  const [palletInspectedParts, setPalletInspectedParts] = useState([])
  const [currentPalletInfo, setCurrentPalletInfo] = useState(null)

  const updateSpecsForDetails = (detailsList, currentPallet = currentPalletInfo) => {
    let newSpecOpts = [{ value: '', label: 'Chọn quy cách' }]
    const fallbackTargetQty = Number(currentPallet?.remaining_qty ?? currentPallet?.requiredQty ?? 40)

    detailsList.forEach((dName) => {
      const partObj = partsData.find((p) => (p.part_name || p.name) === dName)
      const matchedIns = (currentPallet?.inspected_details || []).find((d) => d.part_name === dName)

      if (partObj && Array.isArray(partObj.specs) && partObj.specs.length > 0) {
        partObj.specs.forEach((s) => {
          const specVal = getEffectiveSpec(s.specification, dName)
          newSpecOpts.push({
            value: detailsList.length > 1 ? `[${dName}] ${specVal}` : specVal,
            label: detailsList.length > 1 ? `[${dName}] ${specVal}` : specVal,
            detail: dName,
            rawSpec: specVal,
            targetQty: Number(s.target_qty || s.remaining_qty || partObj.remaining_qty || fallbackTargetQty)
          })
        })
      } else {
        const rawFallback = matchedIns?.specification || currentPallet?.spec
        const fallbackSpec = getEffectiveSpec(rawFallback, dName)
        newSpecOpts.push({
          value: detailsList.length > 1 ? `[${dName}] ${fallbackSpec}` : fallbackSpec,
          label: detailsList.length > 1 ? `[${dName}] ${fallbackSpec}` : fallbackSpec,
          detail: dName,
          rawSpec: fallbackSpec,
          targetQty: Number(partObj?.specs?.[0]?.target_qty || partObj?.remaining_qty || matchedIns?.remaining_qty || fallbackTargetQty)
        })
      }
    })

    setSpecOptions(newSpecOpts)
    return newSpecOpts
  }

  const handleMultiDetailChange = (newDetails) => {
    setSelectedDetails(newDetails)
    upd('detail', newDetails.join(', '))

    if (!newDetails || newDetails.length === 0) {
      setItems([])
      setSpecOptions([{ value: '', label: 'Chọn quy cách' }])
      return
    }

    const fallbackTargetQty = Number(currentPalletInfo?.remaining_qty ?? currentPalletInfo?.requiredQty ?? 40)

    // Cập nhật công đoạn giao/nhận tự động từ TẤT CẢ các chi tiết được chọn
    updateStageOptionsForDetails(newDetails, partsData)

    // Giữ lại các dòng items thuộc các chi tiết còn được chọn
    const retainedItems = items.filter((it) => newDetails.includes(it.detail))

    // Thêm dòng mặc định cho các chi tiết mới được chọn
    const newlyAddedDetails = newDetails.filter((d) => !items.some((it) => it.detail === d))
    const addedItems = newlyAddedDetails.map((dName, i) => {
      const partObj = partsData.find((p) => (p.part_name || p.name) === dName)
      const matchedIns = (currentPalletInfo?.inspected_details || []).find((d) => d.part_name === dName)
      const rawSpecVal = matchedIns?.specification || currentPalletInfo?.inspected_specs?.[i] || partObj?.specs?.[0]?.specification
      const specVal = getEffectiveSpec(rawSpecVal, dName)
      const targetQty = Number(partObj?.specs?.[0]?.target_qty || partObj?.remaining_qty || matchedIns?.remaining_qty || matchedIns?.plan_qty || fallbackTargetQty)
      return {
        id: String(Date.now() + i + Math.random()),
        detail: dName,
        spec: specVal,
        qty: 0,
        total: targetQty
      }
    })

    const finalItems = [...retainedItems, ...addedItems]
    setItems(finalItems)
    updateSpecsForDetails(newDetails)
  }

  // Toggle checkbox quy cách: tick = thêm dòng, bỏ tick = xóa dòng
  const handleSpecToggle = (opt) => {
    const specVal = typeof opt === 'object' ? (opt.rawSpec || opt.value) : opt
    const dName = typeof opt === 'object' ? (opt.detail || selectedDetails[0] || form.detail) : (selectedDetails[0] || form.detail)
    if (!specVal || !dName) return

    const exists = items.some((it) => it.spec === specVal && it.detail === dName)
    const matchedIns = (currentPalletInfo?.inspected_details || []).find((d) => d.part_name === dName)
    const fallbackTargetQty = Number(matchedIns?.remaining_qty ?? currentPalletInfo?.remaining_qty ?? currentPalletInfo?.requiredQty ?? 40)

    if (exists) {
      // Bỏ tick → xóa dòng
      const updatedItems = items.filter((it) => !(it.spec === specVal && it.detail === dName))
      setItems(updatedItems)
    } else {
      // Tick → thêm dòng mới
      const partObj = partsData.find((p) => (p.part_name || p.name) === dName)
      const specObj = partObj?.specs?.find((s) => s.specification === specVal)
      const target = Number(specObj?.target_qty || specObj?.remaining_qty) || Number(partObj?.remaining_qty || partObj?.total_qty || matchedIns?.remaining_qty) || fallbackTargetQty

      const newItem = {
        id: String(Date.now() + Math.random()),
        detail: dName,
        spec: specVal,
        qty: 0,
        total: target
      }
      const updatedItems = [...items, newItem]
      setItems(updatedItems)
    }
  }

  const selectedSpecs = items.map((it) => it.spec)

  const getNextStageName = (currentStage, allStageOpts) => {
    if (!currentStage || !Array.isArray(allStageOpts)) return ''
    const validOpts = allStageOpts.filter((o) => o.value)
    const normCurrent = String(currentStage).toLowerCase().trim()
    const idx = validOpts.findIndex((o) => {
      const normVal = String(o.value).toLowerCase().trim()
      return normVal === normCurrent || normVal.includes(normCurrent) || normCurrent.includes(normVal)
    })
    if (idx >= 0 && idx < validOpts.length - 1) {
      return validOpts[idx + 1].value
    }
    return ''
  }

  const handlePalletChange = async (val) => {
    upd('palletCode', val)
    if (!val) {
      setPalletInspectedParts([])
      setCurrentPalletInfo(null)
      setSelectedDetails([])
      setItems([])
      setSpecOptions([{ value: '', label: 'Chọn quy cách' }])
      return
    }

    try {
      const res = await apiClient.get(`/inspections/pallet/${encodeURIComponent(val)}`)
      const palletInfo = res.data
      if (!palletInfo) return

      setCurrentPalletInfo(palletInfo)

      let inspectedList = []
      if (Array.isArray(palletInfo.inspected_parts) && palletInfo.inspected_parts.length > 0) {
        inspectedList = palletInfo.inspected_parts
      } else if (palletInfo.product) {
        const prodTrim = palletInfo.product.trim()
        const isExactPart = partsData.some((p) => (p.part_name || p.name) === prodTrim)
        inspectedList = (!isExactPart && prodTrim.includes(', '))
          ? prodTrim.split(', ').map((p) => p.trim()).filter(Boolean)
          : [prodTrim]
      }

      setPalletInspectedParts(inspectedList)
      setSelectedDetails(inspectedList)

      const fromSt = palletInfo.stage || 'Tạo phôi'
      const nextSt = getNextStageName(fromSt, stageOptions)

      const newItems = inspectedList.map((pName, i) => {
        const partObj = partsData.find((p) => (p.part_name || p.name) === pName)
        const matchedIns = (palletInfo.inspected_details || []).find((d) => d.part_name === pName)
        const specVal = matchedIns?.specification || palletInfo.inspected_specs?.[i] || partObj?.specs?.[0]?.specification || 'Tiêu chuẩn'
        const targetQty = Number(partObj?.specs?.[0]?.target_qty || partObj?.remaining_qty || matchedIns?.remaining_qty || matchedIns?.plan_qty || 24)
        return {
          id: String(Date.now() + i),
          detail: pName,
          spec: specVal,
          qty: 0,
          total: targetQty
        }
      })
      setItems(newItems)
      setForm((prev) => ({
        ...prev,
        palletCode: val,
        detail: inspectedList.join(', '),
        spec: `${newItems.length} quy cách đã chọn`,
        totalQty: '0',
        surplus: ''
      }))

      updateStageOptionsForDetails(inspectedList, partsData)

      updateSpecsForDetails(inspectedList, palletInfo)
    } catch (err) {
      console.warn(`Lỗi khi tải chi tiết mã pallet ${val}:`, err)
    }
  }

  const handleInFormScanResult = (scanned) => {
    setIsQrScannerOpen(false)
    if (!scanned) return
    const trimmed = String(scanned).trim()
    setPalletOpts((prev) => {
      if (!prev.some((o) => o.value === trimmed)) {
        return [{ value: trimmed, label: `Quét được: ${trimmed}` }, ...prev]
      }
      return prev
    })
    handlePalletChange(trimmed)
  }

  const handleToggleNoPallet = () => {
    if (!noPallet) {
      const autoCode = generateAutoPalletCode()
      const userStage = user?.activeStageName || user?.stage_name?.split('|')[0]?.trim() || ''
      setForm((p) => ({
        ...p,
        palletCode: autoCode,
        totalQty: '0',
        surplus: '',
        detail: '',
        spec: '',
        fromStage: userStage || p.fromStage || 'Tạo phôi'
      }))
      setNoPallet(true)
      setPalletInspectedParts([])
      setCurrentPalletInfo(null)
      setSelectedDetails([])
      setItems([])
      setSpecOptions([{ value: '', label: 'Chọn quy cách' }])
    } else {
      setForm((p) => ({
        ...p,
        palletCode: '',
        totalQty: '0',
        surplus: '',
        detail: '',
        spec: ''
      }))
      setNoPallet(false)
      setPalletInspectedParts([])
      setCurrentPalletInfo(null)
      setSelectedDetails([])
      setItems([])
      setSpecOptions([{ value: '', label: 'Chọn quy cách' }])
    }
  }

  const handleImagePick = async (e) => {
    const files = Array.from(e.target?.files || [])
    if (files.length === 0) return
    for (const f of files) await addImage(f)
    if (e.target) e.target.value = ''
  }

  const handleConfirmQty = (updated) => {
    setItems(updated)
    setConfirmModal(false)
  }

  const handleUpdateQty = (idx, val) => {
    const qty = Math.max(0, Number(val) || 0)
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, qty } : it)))
  }

  const handleOpenPallet = async () => {
    const detailsList = selectedDetails.length > 0
      ? selectedDetails
      : [form.detail || items[0]?.detail].filter(Boolean)
    const spec = items.length === 1 ? items[0]?.spec : (form.spec || items.map((it) => it.spec).filter(Boolean).join(', ') || '')

    let matching = []
    try {
      const fiveMonths = noPallet ? get5MonthWindow(selectedMonth) : null
      matching = await transferService.getOrdersByPart({
        part_names: detailsList,
        specification: items.length === 1 ? spec : undefined,
        pallet_code: form.palletCode,
        month: !noPallet ? selectedMonth : undefined,
        months: fiveMonths
      })
      if (!matching || matching.length === 0) {
        matching = await transferService.getOrdersByPart({
          part_names: detailsList,
          pallet_code: form.palletCode
        })
      }
    } catch (err) {
      console.warn('Lỗi getOrdersByPart:', err)
    }

    const firstMatch = (matching && matching[0]) || {}

    const partProducts = (matching || []).map((m) => ({
      order_id: m.order_id || m.product_sku || m.po_code,
      order_code: m.po_code || '',
      customer: m.customer || '',
      prod_sku: m.product_sku || `${m.part_name}${m.specification ? ' - ' + m.specification : ''}`,
      part_qty_needed: m.part_qty_needed || m.order_qty || 0,
      delivered: 0
    }))

    const totalQty = items.reduce((sum, it) => sum + Number(it.qty || 0), 0) || Number(form.totalQty) || 0
    const totalPlanDemand = items.reduce((sum, it) => sum + Number(it.total || 0), 0) || firstMatch.total_plan_qty || partProducts.reduce((sum, p) => sum + (p.part_qty_needed || 0), 0) || 40

    const poCodesList = Array.from(new Set((matching || []).map((m) => m.po_code).filter(Boolean)))
    const skuList = Array.from(new Set((matching || []).map((m) => m.product_sku).filter(Boolean)))
    const customerList = Array.from(new Set((matching || []).map((m) => m.customer).filter(Boolean)))
    const planList = Array.from(new Set((matching || []).map((m) => m.plan_name).filter(Boolean)))

    const data = {
      id: ticketCode,
      qr_code: form.palletCode || ticketCode,
      backup_qr: form.palletCode || ticketCode,
      plan_name: planList.join(', ') || planName || firstMatch.plan_name || `KHSX Tháng ${selectedMonth}`,
      customer: customerList.join(', ') || firstMatch.customer || 'Khách hàng',
      order_code: poCodesList.join(', ') || firstMatch.po_code || 'APT-0075-01',
      product_sku: skuList.join(', ') || firstMatch.product_sku || 'OSLO-BUFFET-1800',
      part_name: form.detail || firstMatch.part_name || 'Chi tiết',
      specification: spec || firstMatch.specification || 'Tiêu chuẩn',
      quantity: totalQty,
      total_plan_qty: totalPlanDemand,
      already_delivered: firstMatch.already_delivered || 0,
      remaining_qty: Math.max(0, totalPlanDemand - totalQty),
      residual: Number(form.surplus) || 0,
      delivery_stage: form.fromStage || 'Nhập Kho/Đầu Vào',
      receiving_stage: form.toStage || 'Tạo Phôi',
      note: form.note || '',
      created_at: new Date(),
      user_name: creatorName || 'Administrator',
      qc_status: firstMatch.qc_status || 'Đạt (Mẫu lần đầu)',
      qc_inspector: firstMatch.qc_inspector || 'QC',
      moisture_min: 8,
      moisture_max: 12
    }
    setPalletPartProducts(partProducts)
    setPalletData(data)
    setShowPalletModal(true)
  }

  const handleSubmit = () => {
    if (!form.palletCode) {
      showMessage('Chưa chọn mã pallet', 'Vui lòng chọn hoặc tự sinh mã pallet trước khi tiếp tục.', 'warning')
      return
    }
    if (!form.toStage) {
      showMessage('Chưa chọn công đoạn', 'Vui lòng chọn công đoạn nhận trước khi tiếp tục.', 'warning')
      return
    }
    setConfirmSubmitOpen(true)
  }

  const doSubmit = async () => {
    setSubmitting(true)
    try {
      if (isNew) {
        await createTicket({
          ...form,
          backup_qr: backupQrCode || form.palletCode,
          items,
          plan_id: planId,
          user_id: user?.id || 1
        })
        showMessage('Thành công', 'Đã tạo phiếu luân chuyển thành công!', 'success', () => {
          navigate(ROUTES.TRANSFER_LIST)
        })
      } else {
        await confirmTicket(id, { items })
        showMessage('Thành công', 'Đã xác nhận luân chuyển thành công!', 'success', () => {
          navigate(ROUTES.TRANSFER_LIST)
        })
      }
    } catch (e) {
      console.error('Lỗi khi xử lý phiếu luân chuyển:', e)
      const errorMsg = e.response?.data?.detail
        ? (typeof e.response.data.detail === 'string' ? e.response.data.detail : JSON.stringify(e.response.data.detail))
        : (e.message || 'Không thể xử lý phiếu luân chuyển. Vui lòng thử lại.')
      showMessage('Lỗi xử lý phiếu', errorMsg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const title = isNew ? 'Tạo phiếu luân chuyển' : 'Xác nhận luân chuyển'

  const content = (
    <>
      <div className="pv2-page pv2-page--form" style={embedded ? { paddingTop: 4 } : {}}>
        <div className="pv2-form-card">
          <h1 className="pv2-form-heading">Thông Tin Bàn Giao</h1>

          <div className="pv2-ticket-meta">
            <div className="pv2-ticket-info">
              <div className="pv2-ticket-id">Phiếu: {ticketCode}</div>
              <div className="pv2-ticket-creator">Được tạo bởi: {creatorName}</div>
            </div>
            <button type="button" className="pv2-btn-pallet-view" onClick={handleOpenPallet}>
              <Eye size={15} /> Xem thẻ pallet
            </button>
          </div>

          {!embedded && backupQrCode && (
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              padding: '8px 12px',
              marginBottom: '14px',
              color: '#92400e',
              fontWeight: '600',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ScanLine size={18} /> Đang liên kết Thẻ luân chuyển dự phòng: <strong>{backupQrCode}</strong>
            </div>
          )}

          <div className="pv2-form">
            <div className="pv2-field" style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>
                  Mã pallet <span className="pv2-req">*</span>
                </label>
                {!readOnly && (
                  <button
                    type="button"
                    className="pv2-link-underline"
                    onClick={handleToggleNoPallet}
                    style={{ fontSize: '0.82rem', fontWeight: 600, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    {noPallet ? '← Chọn mã pallet' : 'Không có mã pallet'}
                  </button>
                )}
              </div>
              {readOnly || noPallet ? (
                <input
                  type="text"
                  className="pv2-input pv2-input--disabled"
                  value={form.palletCode}
                  readOnly
                  disabled
                />
              ) : (
                <CustomSelect value={form.palletCode} options={palletOpts} onChange={handlePalletChange} />
              )}
            </div>

            <div className="pv2-field-row pv2-field-row--2col" style={{ marginBottom: '10px' }}>
              <div className="pv2-field">
                <label>Tổng số lượng <span className="pv2-req">*</span></label>
                <div className="pv2-input-unit-wrap pv2-input-unit-wrap--disabled">
                  <input
                    type="text"
                    className="pv2-input pv2-input--disabled"
                    value={form.totalQty}
                    readOnly
                    disabled
                    placeholder="0"
                  />
                  <span className="pv2-unit">Cái</span>
                </div>
              </div>
              <div className="pv2-field">
                <label>Dư (nếu có)</label>
                <div className="pv2-input-unit-wrap pv2-input-unit-wrap--disabled">
                  <input
                    type="number"
                    className="pv2-input pv2-input--disabled"
                    value={form.surplus}
                    onChange={(e) => upd('surplus', e.target.value)}
                    placeholder=""
                    disabled
                  />
                  <span className="pv2-unit">Cái</span>
                </div>
              </div>
            </div>

            <div className="pv2-field-row pv2-field-row--2col">
              <div className="pv2-field">
                <label>Chi tiết <span className="pv2-req">*</span></label>
                {readOnly ? (
                  <input
                    type="text"
                    className="pv2-input pv2-input--disabled"
                    value={selectedDetails.join(', ') || form.detail}
                    readOnly
                    disabled
                  />
                ) : (
                  <FormMultiSearchSelect
                    values={selectedDetails}
                    options={
                      (!noPallet && Boolean(form.palletCode) && palletInspectedParts.length > 0)
                        ? palletInspectedParts.map((p) => ({ value: p, label: p }))
                        : productOptions.filter((o) => Boolean(o.value))
                    }
                    onChange={handleMultiDetailChange}
                    placeholder="Chọn chi tiết..."
                    required
                  />
                )}
              </div>
              <div className="pv2-field" ref={specDropRef} style={{ position: 'relative' }}>
                <label>Quy cách <span className="pv2-req">*</span></label>
                {readOnly ? (
                  <input
                    type="text"
                    className="pv2-input pv2-input--disabled"
                    value={selectedSpecs.join(', ') || (items[0] && items[0].spec) || 'Tiêu chuẩn'}
                    readOnly
                    disabled
                  />
                ) : (
                  <>
                    <div
                      className="pv2-input"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => setSpecDropdownOpen((v) => !v)}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedSpecs.length > 0 ? `${selectedSpecs.length} quy cách đã chọn` : 'Chọn quy cách'}
                      </span>
                      <ChevronDown size={16} style={{ flexShrink: 0, transform: specDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </div>
                    {specDropdownOpen && specOptions.filter((o) => o.value).length > 0 && (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                        background: '#fff', border: '1px solid #d4a574', borderRadius: 8,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50,
                        maxHeight: 220, overflowY: 'auto'
                      }}>
                        {specOptions.filter((o) => o.value).map((opt) => {
                          const specVal = opt.rawSpec || opt.value
                          const dName = opt.detail || (selectedDetails[0] || form.detail)
                          const isChecked = items.some((it) => it.spec === specVal && it.detail === dName)
                          return (
                            <div
                              key={opt.value}
                              onClick={() => handleSpecToggle(opt)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 14px', cursor: 'pointer',
                                background: isChecked ? '#fdf6ef' : '#fff',
                                borderBottom: '1px solid #f0e6da',
                                transition: 'background 0.15s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = isChecked ? '#faecd8' : '#fdf6ef'}
                              onMouseLeave={(e) => e.currentTarget.style.background = isChecked ? '#fdf6ef' : '#fff'}
                            >
                              <div style={{
                                width: 20, height: 20, borderRadius: 4,
                                border: isChecked ? '2px solid #8B5E3C' : '2px solid #ccc',
                                background: isChecked ? '#8B5E3C' : '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, transition: 'all 0.15s'
                              }}>
                                {isChecked && <Check size={14} color="#fff" strokeWidth={3} />}
                              </div>
                              <span style={{ fontSize: 14, color: '#333' }}>{opt.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="pv2-field-row pv2-field-row--2col">
              <div className="pv2-field">
                <label>Công đoạn giao</label>
                <input
                  type="text"
                  className="pv2-input pv2-input--disabled"
                  value={form.fromStage}
                  readOnly
                  disabled
                />
              </div>
              <div className="pv2-field">
                <label>Công đoạn nhận <span className="pv2-req">*</span></label>
                {readOnly ? (
                  <input
                    type="text"
                    className="pv2-input pv2-input--disabled"
                    value={form.toStage}
                    readOnly
                    disabled
                  />
                ) : (
                  <CustomSelect value={form.toStage} options={stageOptions} onChange={(v) => upd('toStage', v)} />
                )}
              </div>
            </div>

            <div className="pv2-field">
              <label>Ghi chú</label>
              <textarea
                className={`pv2-textarea ${readOnly ? 'pv2-input--disabled' : ''}`}
                rows={3}
                value={form.note}
                onChange={(e) => upd('note', e.target.value)}
                readOnly={readOnly}
                disabled={readOnly}
                placeholder={readOnly ? 'Không có ghi chú' : 'Nhập ghi chú...'}
              />
            </div>

            <div className="pv2-upload-area" style={{ marginTop: 12, marginBottom: 12 }}>
              {/* Header của mục hình ảnh */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Camera size={16} color="#7B5233" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#4A240E' }}>
                    Hình ảnh đính kèm {!readOnly && <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: 11 }}>(tùy chọn)</span>}
                  </span>
                </div>
                {images.length > 0 && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#15803D',
                    backgroundColor: '#DCFCE7',
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    ✓ Đã chọn {images.length} ảnh
                  </span>
                )}
              </div>

              {!readOnly && (
                <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleImagePick} />
              )}

              {/* Grid hiển thị ảnh hoặc nút thêm ảnh */}
              {images.length === 0 ? (
                !readOnly ? (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    style={{
                      width: '100%',
                      padding: '16px 12px',
                      borderRadius: 10,
                      border: '1.5px dashed #C89D7C',
                      backgroundColor: '#FFF9F5',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      backgroundColor: '#FDEEE4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#7B5233',
                    }}>
                      <ImagePlus size={20} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#4A240E' }}>
                      Thêm ảnh pallet
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      Chạm để chụp hoặc chọn ảnh từ thư viện
                    </div>
                  </button>
                ) : (
                  <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
                    Không có hình ảnh đính kèm cho phiếu này.
                  </div>
                )
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                  {images.map((src, i) => (
                    <div
                      key={i}
                      style={{
                        position: 'relative',
                        width: 68,
                        height: 68,
                        borderRadius: 10,
                        overflow: 'hidden',
                        border: '1.5px solid #EADBCE',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                        cursor: 'pointer',
                        flexShrink: 0,
                        background: '#f8fafc',
                      }}
                      onClick={() => setPreviewImage(getFullImageUrl(src))}
                    >
                      <img
                        src={getFullImageUrl(src)}
                        alt={`Ảnh pallet ${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeImage(i)
                          }}
                          title="Xóa ảnh"
                          style={{
                            position: 'absolute',
                            top: 3,
                            right: 3,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(0,0,0,0.65)',
                            color: '#fff',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  ))}

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      style={{
                        width: 68,
                        height: 68,
                        borderRadius: 10,
                        border: '1.5px dashed #C89D7C',
                        backgroundColor: '#FFF9F5',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3,
                        cursor: 'pointer',
                        color: '#7B5233',
                        fontSize: 11,
                        fontWeight: 700,
                        transition: 'all 0.15s',
                        padding: '4px 6px',
                        flexShrink: 0,
                      }}
                    >
                      <Plus size={20} color="#7B5233" strokeWidth={2.5} />
                      <span>Thêm</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <TransferItemTable
              items={items}
              onEditItem={(item, idx) => {
                if (readOnly) return
                setEditItem(item)
                setEditIdx(idx)
                setConfirmModal(true)
              }}
              onUpdateQty={handleUpdateQty}
              readOnly={readOnly}
            />
          </div>
        </div>
      </div>

      {/* Cố định neo cuối màn hình (Fixed Bottom Action Bar) */}
      <div className="pv2-fixed-bottom-actions">
        {readOnly ? (
          <button
            type="button"
            className="pv2-btn-cancel"
            style={{ width: '100%', justifyContent: 'center', background: '#f1f5f9', color: '#334155', fontWeight: 700 }}
            onClick={() => navigate(ROUTES.TRANSFER_LIST)}
          >
            <ArrowLeft size={17} /> Quay lại danh sách
          </button>
        ) : (
          <>
            <button type="button" className="pv2-btn-cancel" onClick={() => navigate(ROUTES.TRANSFER_LIST)}>
              <X size={17} /> Hủy bỏ
            </button>
            <button type="button" className="pv2-btn-submit" onClick={handleSubmit} disabled={submitting}>
              <Check size={17} /> {submitting ? 'Đang lưu...' : 'Xác nhận'}
            </button>
          </>
        )}
      </div>

      <ConfirmQtyModal
        open={confirmModal}
        items={items}
        onConfirm={handleConfirmQty}
        onClose={() => setConfirmModal(false)}
      />

      <MessageModal
        isOpen={modalConfig.isOpen}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
      />

      <ActionConfirmModal
        isOpen={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        onAction={doSubmit}
        title="Xác nhận lưu phiếu"
        message="Bạn có chắc chắn muốn lưu phiếu luân chuyển này?"
        type="save"
        confirmText="Lưu"
        cancelText="Hủy"
      />

      <PalletCardModal
        isOpen={showPalletModal}
        onClose={() => setShowPalletModal(false)}
        data={palletData}
        partProducts={palletPartProducts}
      />

      <QRScanner
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onResult={handleInFormScanResult}
      />

      {/* Lightbox xem ảnh lớn */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }} onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImage}
              alt="Xem ảnh lớn"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 8, objectFit: 'contain' }}
            />
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
              <X size={18} color="#000" />
            </button>
          </div>
        </div>
      )}
    </>
  )

  if (embedded) {
    return content
  }

  return (
    <Layout>
      <PageHeader
        title={isNew ? 'Khởi tạo phiếu' : 'Chi tiết phiếu'}
        subTitle={isNew ? 'CL07: Tạo phiếu luân chuyển' : `CL07: Chi tiết phiếu ${ticketCode}`}
        showBack={true}
      />
      {content}
    </Layout>
  )
}

export default CL07_TransferCreateView
