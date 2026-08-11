import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Eye, ImagePlus, X } from 'lucide-react'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import { useTransferController, useTransferDetail } from '../Controllers/useTransferController'
import useProduction_v2Store from '../Models/production_v2Store'
import { stageService } from '../services/stageService'
import TransferItemTable from './components/TransferItemTable'
import ConfirmQtyModal from './components/ConfirmQtyModal'
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal'
import { MOCK_PALLETS, MOCK_STAGE_OPTIONS, MOCK_PRODUCTS, ROUTES } from '../constants'
import apiClient, { getFullImageUrl } from '@shared/services/api'
import '../styles/production_v2.css'

const palletOpts = [{ value: '', label: 'Chọn mã pallet' }, ...MOCK_PALLETS]

const newItems = () => [
  { id: 1, detail: 'Thanh A', spec: '1', qty: 0, total: 40 },
  { id: 2, detail: 'Thanh A', spec: '2', qty: 12, total: 40 },
]

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
  const { createTicket, confirmTicket } = useTransferController()
  const { ticket, loading, images, addImage, removeImage } = useTransferDetail(isNew ? null : id)
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
  const [productOptions, setProductOptions] = useState(
    MOCK_PRODUCTS.map((p) => ({ value: p.label || p.value, label: p.label || p.value }))
  )
  const [stageOptions, setStageOptions] = useState(
    [{ value: '', label: 'Chọn công đoạn' }, ...MOCK_STAGE_OPTIONS]
  )
  const fileRef = useRef()

  const [partsData, setPartsData] = useState([])
  const [specOptions, setSpecOptions] = useState([{ value: '', label: 'Chọn quy cách' }])

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

  const recalculateQtyAndSurplus = (updatedItems) => {
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
  }

  const handleDetailChange = (detailName) => {
    upd('detail', detailName)
    if (!detailName) return

    const partObj = partsData.find((p) => (p.part_name || p.name) === detailName)
    let newItems = []
    let newSpecOpts = [{ value: '', label: 'Chọn quy cách' }]

    if (partObj && Array.isArray(partObj.specs) && partObj.specs.length > 0) {
      newItems = partObj.specs.map((s, idx) => ({
        id: String(idx + 1),
        detail: detailName,
        spec: s.specification || 'Tiêu chuẩn',
        qty: 0,
        total: Number(s.target_qty) || Number(partObj.total_qty) || 40
      }))
      newSpecOpts = [
        { value: '', label: 'Chọn quy cách' },
        ...partObj.specs.map((s) => ({ value: s.specification, label: s.specification }))
      ]
    } else {
      const fallbackTarget = Number(partObj?.total_qty) || 40
      newItems = [
        { id: '1', detail: detailName, spec: 'Tiêu chuẩn', qty: 0, total: fallbackTarget }
      ]
      newSpecOpts = [
        { value: '', label: 'Chọn quy cách' },
        { value: 'Tiêu chuẩn', label: 'Tiêu chuẩn' }
      ]
    }

    setSpecOptions(newSpecOpts)
    if (newSpecOpts.length > 1) {
      upd('spec', newSpecOpts[1].value)
    }

    setItems(newItems)
    recalculateQtyAndSurplus(newItems)
  }

  const handlePalletChange = (val) => {
    const pallet = MOCK_PALLETS.find((p) => p.value === val)
    upd('palletCode', val)
    if (pallet) upd('totalQty', pallet.totalQty)
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
    recalculateQtyAndSurplus(updated)
    setConfirmModal(false)
  }

  const handleSubmit = async () => {
    if (!form.palletCode) {
      showMessage('Chưa chọn mã pallet', 'Vui lòng chọn hoặc tự sinh mã pallet trước khi tiếp tục.', 'warning')
      return
    }
    if (!form.toStage) {
      showMessage('Chưa chọn công đoạn', 'Vui lòng chọn công đoạn nhận trước khi tiếp tục.', 'warning')
      return
    }
    setSubmitting(true)
    try {
      if (isNew) {
        await createTicket({ ...form, items })
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
      showMessage('Lỗi xử lý phiếu', e.message || 'Không thể xử lý phiếu luân chuyển. Vui lòng thử lại.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const ticketCode = isNew ? `LC${String(Date.now()).slice(-3)}` : id
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
              <div className="pv2-ticket-creator">Được tạo bởi: Nguyễn Văn A</div>
            </div>
            <button type="button" className="pv2-btn-pallet-view">
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
                <div className="pv2-input-unit-wrap">
                  <input
                    type="text"
                    className="pv2-input"
                    value={form.totalQty}
                    onChange={(e) => upd('totalQty', e.target.value)}
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
                <label>Chi tiết <span className="pv2-req">*</span></label>
                <CustomSelect
                  value={form.detail}
                  options={[{ value: '', label: 'Chọn chi tiết' }, ...productOptions]}
                  onChange={(v) => handleDetailChange(v)}
                />
              </div>
              <div className="pv2-field">
                <label>Quy cách <span className="pv2-req">*</span></label>
                <CustomSelect
                  value={form.spec}
                  options={specOptions}
                  onChange={(v) => upd('spec', v)}
                />
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
    </Layout>
  )
}

export default CL07_TransferCreateView
