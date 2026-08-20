import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import { STATUS_FILTER_OPTIONS, TICKET_TYPE_OPTIONS, BOM_STAGE_OPTIONS } from '../../constants'
import { stageService } from '../../services/stageService'

import apiClient from '@shared/services/api'

const DEFAULT_FACTORIES = [
  { value: '', label: 'Tất cả nhà máy' },
  { value: 'NM1', label: 'NM1 - Vaniti Phân Xưởng 1' },
  { value: 'NM2', label: 'NM2 - Vaniti Phân Xưởng 2' },
  { value: 'NM3', label: 'NM3 - Furniture nhà máy 3' },
]

const FilterPanel = ({ open, filters, onApply, onClose }) => {
  const [local, setLocal] = useState({ ...filters })
  const [stageOptions, setStageOptions] = useState(() => [
    { value: '', label: 'Tất cả công đoạn' },
    ...BOM_STAGE_OPTIONS.filter((s) => Boolean(s.value))
  ])
  const [factoryOptions, setFactoryOptions] = useState(DEFAULT_FACTORIES)

  // Đồng bộ state bộ lọc mỗi khi mở popup hoặc khi prop filters thay đổi
  useEffect(() => {
    if (open) {
      setLocal({ ...filters })
    }
  }, [open, filters])

  // Lấy danh sách công đoạn và nhà máy thực tế từ CSDL
  useEffect(() => {
    stageService.getAll()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const opts = [
            { value: '', label: 'Tất cả công đoạn' },
            ...data.map((s) => ({ value: s.name || s.stage_name, label: s.name || s.stage_name }))
          ]
          setStageOptions(opts)
        }
      })
      .catch(() => {})

    apiClient.get('/production-v2/factories')
      .then((res) => {
        const facs = res.data || []
        if (Array.isArray(facs) && facs.length > 0) {
          const opts = [
            { value: '', label: 'Tất cả nhà máy' },
            ...facs.map((f) => ({ value: f.code, label: `${f.code} - ${f.name}` }))
          ]
          setFactoryOptions(opts)
        }
      })
      .catch(() => {})
  }, [])


  const upd = (k, v) => setLocal((p) => ({ ...p, [k]: v }))

  if (!open) return null

  return (
    <>
      <div className="pv2-filter-overlay" onClick={onClose} />
      <div className="pv2-filter-panel">
        <div className="pv2-filter-header">
          <span className="pv2-filter-title">Bộ lọc chi tiết</span>
          <button className="pv2-filter-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="pv2-filter-body">
          <div className="pv2-filter-field">
            <label>Lọc theo ngày tạo phiếu</label>
            <div className="pv2-date-range">
              <input
                type="date"
                className="pv2-date-input"
                value={local.dateFrom || ''}
                onChange={(e) => upd('dateFrom', e.target.value)}
              />
              <span className="pv2-date-sep">-</span>
              <input
                type="date"
                className="pv2-date-input"
                value={local.dateTo || ''}
                onChange={(e) => upd('dateTo', e.target.value)}
              />
            </div>
          </div>

          <div className="pv2-filter-field">
            <label>Lọc theo trạng thái</label>
            <CustomSelect value={local.status || ''} options={STATUS_FILTER_OPTIONS} onChange={(v) => upd('status', v)} />
          </div>

          <div className="pv2-filter-field">
            <label>Lọc theo công đoạn</label>
            <CustomSelect value={local.stage || ''} options={stageOptions} onChange={(v) => upd('stage', v)} />
          </div>

          <div className="pv2-filter-field">
            <label>Lọc theo nhà máy</label>
            <CustomSelect value={local.factory || ''} options={factoryOptions} onChange={(v) => upd('factory', v)} />
          </div>

          <div className="pv2-filter-field">
            <label>Lọc theo loại phiếu</label>
            <CustomSelect value={local.type || ''} options={TICKET_TYPE_OPTIONS} onChange={(v) => upd('type', v)} />
          </div>
        </div>

        <div className="pv2-filter-footer">
          <button className="pv2-btn-primary" onClick={() => { onApply(local); onClose() }}>
            ✓ Xác nhận
          </button>
          <button className="pv2-btn-secondary" onClick={() => {
            const reset = { dateFrom: '', dateTo: '', status: '', factory: '', stage: '', type: '' }
            setLocal(reset)
            onApply(reset)
            onClose()
          }}>
            ↺ Hủy
          </button>
        </div>
      </div>
    </>
  )
}

export default FilterPanel
