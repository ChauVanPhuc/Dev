import { useState, useEffect, useRef, useCallback } from 'react'
import useAuthStore from '@modules/auth/Models/authModel'
import { useParams, useNavigate } from 'react-router-dom'
import { Eye, ImagePlus, X, ChevronDown, Check } from 'lucide-react'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
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

  // Load Chi tiết sản phẩm (Component Parts) based on selectedMonth
  useEffect(() => {
    let isMounted = true
    const fetchComponentDetails = async () => {
      try {
        const res = await apiClient.get(`/production-v2/parts?month=${selectedMonth}`)
        const partsList = res.data || []
        if (Array.isArray(partsList) && partsList.length > 0 && isMounted) {
          setPartsData(partsList)
          const opts = partsList.map((p) => {
            const name = typeof p === 'string' ? p : (p.part_name || p.name)
            return { value: name, label: name }
          })
          setProductOptions(opts)
        }
      } catch (err) {
        console.warn('Lỗi khi lấy Chi tiết sản phẩm từ /production-v2/parts:', err)
      }
    }
    fetchComponentDetails()
    return () => { isMounted = false }
  }, [selectedMonth])

  useEffect(() => {
    if (ticket) {
      setForm((f) => ({
        ...f,
        palletCode: ticket.palletCode || '',
        totalQty: ticket.totalQty || '',
        fromStage: ticket.fromStage || 'Định hình',
        toStage: ticket.toStage || '',
        note: ticket.note || '',
      }))
      if (ticket.items) setItems(ticket.items)
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

  const handleDetailChange = (detailName) => {
    if (!detailName) {
      upd('detail', '')
      setItems([])
      return
    }

    const fallbackTargetQty = Number(currentPalletInfo?.remaining_qty ?? currentPalletInfo?.requiredQty ?? 40)

    if (detailName === 'ALL' && palletInspectedParts.length > 0) {
      const newItems = palletInspectedParts.map((pName, i) => {
        const partObj = partsData.find((p) => (p.part_name || p.name) === pName)
        const matchedIns = (currentPalletInfo?.inspected_details || []).find((d) => d.part_name === pName)
        const specVal = matchedIns?.specification || currentPalletInfo?.inspected_specs?.[i] || partObj?.specs?.[0]?.specification || 'Tiêu chuẩn'
        const targetQty = Number(partObj?.specs?.[0]?.target_qty || partObj?.remaining_qty || matchedIns?.remaining_qty || matchedIns?.plan_qty || fallbackTargetQty)
        return {
          id: String(Date.now() + i),
          detail: pName,
          spec: specVal,
          qty: 0,
          total: targetQty
        }
      })
      setItems(newItems)
      upd('detail', 'ALL')
      return
    }

    upd('detail', detailName)

    const partObj = partsData.find((p) => (p.part_name || p.name) === detailName)
    const matchedIns = (currentPalletInfo?.inspected_details || []).find((d) => d.part_name === detailName)
    let newSpecOpts = [{ value: '', label: 'Chọn quy cách' }]

    if (partObj && Array.isArray(partObj.specs) && partObj.specs.length > 0) {
      newSpecOpts = [
        { value: '', label: 'Chọn quy cách' },
        ...partObj.specs.map((s) => ({ value: s.specification, label: s.specification }))
      ]
    } else {
      const fallbackSpec = matchedIns?.specification || currentPalletInfo?.spec || form.spec || 'Tiêu chuẩn'
      newSpecOpts = [
        { value: '', label: 'Chọn quy cách' },
        { value: fallbackSpec, label: fallbackSpec }
      ]
    }

    setSpecOptions(newSpecOpts)

    // Tự động điền công đoạn giao nhận từ dữ liệu chi tiết BOM
    if (partObj) {
      setForm((prev) => ({
        ...prev,
        fromStage: partObj.input_stage || prev.fromStage,
        toStage: partObj.output_stage || prev.toStage
      }))
    }

    // Nếu chỉ có 1 quy cách → tự động thêm luôn 1 dòng
    if (newSpecOpts.length === 2) {
      const singleSpec = newSpecOpts[1].value
      upd('spec', singleSpec)
      const target = Number(partObj?.specs?.[0]?.target_qty || partObj?.remaining_qty || matchedIns?.remaining_qty || matchedIns?.plan_qty || fallbackTargetQty)
      const newItems = [{ id: '1', detail: detailName, spec: singleSpec, qty: 0, total: target }]
      setItems(newItems)
    } else {
      // Nhiều quy cách → reset bảng, chờ user chọn từng cái
      upd('spec', '')
      setItems([])
    }
  }

  // Toggle checkbox quy cách: tick = thêm dòng, bỏ tick = xóa dòng
  const handleSpecToggle = (specValue) => {
    if (!specValue || !form.detail) return

    const exists = items.some((it) => it.spec === specValue && it.detail === form.detail)
    const matchedIns = (currentPalletInfo?.inspected_details || []).find((d) => d.part_name === form.detail)
    const fallbackTargetQty = Number(matchedIns?.remaining_qty ?? currentPalletInfo?.remaining_qty ?? currentPalletInfo?.requiredQty ?? 40)

    if (exists) {
      // Bỏ tick → xóa dòng
      const updatedItems = items.filter((it) => !(it.spec === specValue && it.detail === form.detail))
      setItems(updatedItems)
    } else {
      // Tick → thêm dòng mới
      const partObj = partsData.find((p) => (p.part_name || p.name) === form.detail)
      const specObj = partObj?.specs?.find((s) => s.specification === specValue)
      const target = Number(specObj?.target_qty || specObj?.remaining_qty) || Number(partObj?.remaining_qty || partObj?.total_qty || matchedIns?.remaining_qty) || fallbackTargetQty

      const newItem = {
        id: String(Date.now()),
        detail: form.detail,
        spec: specValue,
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

      const fromSt = palletInfo.stage || 'Tạo phôi'
      const nextSt = getNextStageName(fromSt, stageOptions)

      if (inspectedList.length > 1) {
        // Pallet có nhiều chi tiết -> mặc định chọn hết tất cả các dòng chi tiết của Pallet
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
          spec: `${inspectedList.length} quy cách đã chọn`,
          totalQty: '0',
          surplus: '',
          fromStage: fromSt,
          toStage: nextSt || prev.toStage,
        }))
      } else if (inspectedList.length === 1) {
        const detailName = inspectedList[0]
        const matchedIns = (palletInfo.inspected_details || [])[0]
        const specValue = matchedIns?.specification || palletInfo.inspected_specs?.[0] || palletInfo.spec || 'Tiêu chuẩn'
        setForm((prev) => ({
          ...prev,
          palletCode: val,
          detail: detailName,
          spec: specValue,
          totalQty: '0',
          surplus: '',
          fromStage: fromSt,
          toStage: nextSt || prev.toStage,
        }))

        const partObj = partsData.find((p) => (p.part_name || p.name) === detailName)
        const targetQty = Number(partObj?.specs?.[0]?.target_qty || partObj?.remaining_qty || matchedIns?.remaining_qty || palletInfo.remaining_qty || 40)
        setItems([
          {
            id: String(Date.now()),
            detail: detailName,
            spec: specValue,
            qty: 0,
            total: targetQty,
          }
        ])
      }
    } catch (err) {
      console.warn(`Lỗi khi tải chi tiết mã pallet ${val}:`, err)
    }
  }

  const handleToggleNoPallet = () => {
    if (!noPallet) {
      const autoCode = generateAutoPalletCode()
      setForm((p) => ({ ...p, palletCode: autoCode, totalQty: '0' }))
      setNoPallet(true)
    } else {
      setForm((p) => ({ ...p, palletCode: '' }))
      setNoPallet(false)
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
    const partName = form.detail || items[0]?.detail || ''
    const spec = items.length === 1 ? items[0]?.spec : (form.spec || items.map((it) => it.spec).filter(Boolean).join(', ') || '')
    let matching = []
    try {
      matching = await transferService.getOrdersByPart({
        part_name: partName,
        specification: items.length === 1 ? spec : undefined,
        pallet_code: form.palletCode,
        month: selectedMonth
      })
      if (!matching || matching.length === 0) {
        matching = await transferService.getOrdersByPart({
          part_name: partName,
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
    const totalPlanDemand = firstMatch.total_plan_qty || partProducts.reduce((sum, p) => sum + (p.part_qty_needed || 0), 0) || 40

    const data = {
      id: ticketCode,
      qr_code: form.palletCode || ticketCode,
      backup_qr: form.palletCode || ticketCode,
      plan_name: planName || firstMatch.plan_name || `KHSX Tháng ${selectedMonth}`,
      customer: firstMatch.customer || 'Khách hàng',
      order_code: firstMatch.po_code || (matching.length > 0 ? Array.from(new Set(matching.map((m) => m.po_code).filter(Boolean))).join(', ') : 'APT-0075-01'),
      product_sku: firstMatch.product_sku || 'OSLO-BUFFET-1800',
      part_name: firstMatch.part_name || partName || 'Chi tiết',
      specification: firstMatch.specification || spec || '1800*480*820',
      quantity: totalQty,
      total_plan_qty: totalPlanDemand,
      already_delivered: firstMatch.already_delivered || 0,
      remaining_qty: firstMatch.remaining_qty !== undefined ? firstMatch.remaining_qty : Math.max(0, totalPlanDemand - totalQty),
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
                      Mục đã kiểm tra
                    </span>
                  )}
                </label>
                <CustomSelect
                  value={form.detail}
                  options={
                    (!noPallet && Boolean(form.palletCode) && palletInspectedParts.length > 0)
                      ? palletInspectedParts.map((p) => ({ value: p, label: p }))
                      : [{ value: '', label: 'Chọn chi tiết' }, ...productOptions]
                  }
                  onChange={(v) => handleDetailChange(v)}
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
                      const isChecked = selectedSpecs.includes(opt.value)
                      return (
                        <div
                          key={opt.value}
                          onClick={() => handleSpecToggle(opt.value)}
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
