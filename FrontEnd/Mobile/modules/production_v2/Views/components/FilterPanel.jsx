import { useState } from 'react'
import { X } from 'lucide-react'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import { STATUS_FILTER_OPTIONS, TICKET_TYPE_OPTIONS, MOCK_FACTORIES, MOCK_STAGES } from '../../constants'

const FilterPanel = ({ open, filters, onApply, onClose }) => {
  const [local, setLocal] = useState({ ...filters })
  const upd = (k, v) => setLocal((p) => ({ ...p, [k]: v }))

  if (!open) return null

  return (
    <>
      <div className="pv2-filter-overlay" onClick={onClose} />
      <div className="pv2-filter-panel">
        <div className="pv2-filter-header">
          <span className="pv2-filter-title">Bộ lọc</span>
          <button className="pv2-filter-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="pv2-filter-body">
          <div className="pv2-filter-field">
            <label>Lọc theo ngày tạo phiếu</label>
            <div className="pv2-date-range">
              <input
                type="date"
                className="pv2-date-input"
                value={local.dateFrom}
                onChange={(e) => upd('dateFrom', e.target.value)}
              />
              <span className="pv2-date-sep">-</span>
              <input
                type="date"
                className="pv2-date-input"
                value={local.dateTo}
                onChange={(e) => upd('dateTo', e.target.value)}
              />
            </div>
          </div>

          <div className="pv2-filter-field">
            <label>Lọc theo trạng thái</label>
            <CustomSelect value={local.status} options={STATUS_FILTER_OPTIONS} onChange={(v) => upd('status', v)} />
          </div>

          <div className="pv2-filter-field">
            <label>Lọc theo nhà máy</label>
            <CustomSelect value={local.factory} options={MOCK_FACTORIES} onChange={(v) => upd('factory', v)} />
          </div>

          <div className="pv2-filter-field">
            <label>Lọc theo công đoạn</label>
            <CustomSelect value={local.stage} options={MOCK_STAGES} onChange={(v) => upd('stage', v)} />
          </div>

          <div className="pv2-filter-field">
            <label>Lọc theo loại phiếu</label>
            <CustomSelect value={local.type} options={TICKET_TYPE_OPTIONS} onChange={(v) => upd('type', v)} />
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
