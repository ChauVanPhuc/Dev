import { useState, useEffect, useRef, useCallback } from 'react'
import useAuthStore from '@modules/auth/Models/authModel'
import { useParams, useNavigate } from 'react-router-dom'
import { Eye, ImagePlus, X, ChevronDown, Check } from 'lucide-react'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import FormMultiSearchSelect from '@mobile/Shared/Views/components/form/FormMultiSearchSelect'
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

const generateAutoPalletCode = () => {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return `BG-${yy}${mm}${dd}-${rand}`
}

const CL07_TransferCreateView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'NEW'
  const [ticketCode, setTicketCode] = useState('LC---')
  const user = useAuthStore((state) => state.user)
  const creatorName = user?.full_name || user?.username || 'Nguyễn Văn A'
  const { createTicket, confirmTicket } = useTransferController()

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
      return acc + Math.max(0, q - t)
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
          newSpecOpts.push({
            value: detailsList.length > 1 ? `[${dName}] ${s.specification}` : s.specification,
            label: detailsList.length > 1 ? `[${dName}] ${s.specification}` : s.specification,
            detail: dName,
            rawSpec: s.specification,
            targetQty: Number(s.target_qty || s.remaining_qty || partObj.remaining_qty || fallbackTargetQty)
          })
        })
      } else {
        const fallbackSpec = matchedIns?.specification || currentPallet?.spec || 'Tiêu chuẩn'
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
      const specVal = matchedIns?.specification || currentPalletInfo?.inspected_specs?.[i] || partObj?.specs?.[0]?.specification || 'Tiêu chuẩn'
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
        inspectedList = palletInfo.product.includes(',')
          ? palletInfo.product.split(',').map((p) => p.trim()).filter(Boolean)
          : [palletInfo.product.trim()]
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
    const files = Array.from(e.target.files)
    for (const f of files) await addImage(f)
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
      : (form.detail ? form.detail.split(',').map((s) => s.trim()).filter(Boolean) : [items[0]?.detail].filter(Boolean))
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

  return (
    <Layout>
      <PageHeader title="Khởi tạo phiếu" subTitle="CL07: Tạo phiếu luân chuyển" showBack={true} />

      <div className="pv2-page pv2-page--form">
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

          <div className="pv2-form">
            <div className="pv2-field-row pv2-field-row--3col">
              <div className="pv2-field pv2-field--grow">
                <label>Mã pallet <span className="pv2-req">*</span></label>
                {noPallet ? (
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

            <div className="pv2-link-row">
              <button type="button" className="pv2-link-underline" onClick={handleToggleNoPallet}>
                {noPallet ? '← Chọn mã pallet' : 'Không có mã pallet'}
              </button>
            </div>

            <div className="pv2-field-row pv2-field-row--2col">
              <div className="pv2-field">
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Chi tiết <span className="pv2-req">*</span></span>
                  {!noPallet && Boolean(form.palletCode) && (
                    <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700 }}>
                      Mục đã kiểm tra {selectedDetails.length > 0 ? `(${selectedDetails.length})` : ''}
                    </span>
                  )}
                </label>
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
              </div>
              <div className="pv2-field" ref={specDropRef} style={{ position: 'relative' }}>
                <label>Quy cách <span className="pv2-req">*</span></label>
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
                <CustomSelect value={form.toStage} options={stageOptions} onChange={(v) => upd('toStage', v)} />
              </div>
            </div>

            <div className="pv2-field">
              <label>Ghi chú</label>
              <textarea
                className="pv2-textarea"
                rows={3}
                value={form.note}
                onChange={(e) => upd('note', e.target.value)}
              />
            </div>

            <div className="pv2-upload-area">
              <button type="button" className="pv2-btn-add-image-link" onClick={() => fileRef.current.click()}>
                <span className="pv2-plus-icon">+</span> Thêm ảnh pallet
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleImagePick} />

              {images.length > 0 && (
                <div className="pv2-image-preview-row">
                  {images.map((src, i) => (
                    <div key={i} className="pv2-img-thumb">
                      <img src={getFullImageUrl(src)} alt="Ảnh pallet" />
                      <button type="button" className="pv2-img-remove" onClick={() => removeImage(i)}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <TransferItemTable
              items={items}
              onEditItem={(item, idx) => {
                setEditItem(item)
                setEditIdx(idx)
                setConfirmModal(true)
              }}
              onUpdateQty={handleUpdateQty}
            />

            <div className="pv2-card-actions">
              <button type="button" className="pv2-btn-cancel" onClick={() => navigate(ROUTES.TRANSFER_LIST)}>
                Hủy bỏ
              </button>
              <button type="button" className="pv2-btn-submit" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
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
    </Layout>
  )
}

export default CL07_TransferCreateView
