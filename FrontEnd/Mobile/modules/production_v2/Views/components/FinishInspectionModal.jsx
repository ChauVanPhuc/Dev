import { useState } from 'react'
import { X } from 'lucide-react'

const FinishInspectionModal = ({ open, summary, palletCode, onConfirm, onClose, onCreatePallet }) => {
  const [confirmCheck, setConfirmCheck] = useState(false)

  if (!open) return null

  return (
    <div className="pv2-modal-overlay">
      <div className="pv2-modal">
        <div className="pv2-modal-header">
          <span className="pv2-modal-title">CL09.2: Hoàn thành kiểm tra</span>
          <button className="pv2-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="pv2-modal-body">
          <div className="pv2-modal-grid">
            <div className="pv2-field">
              <label>PO</label>
              <div className="pv2-readonly">{summary?.poCode || '—'}</div>
            </div>
            <div className="pv2-field">
              <label>Kết quả</label>
              <div className="pv2-radio-group">
                <label className="pv2-radio-label">
                  <input type="radio" checked={summary?.result === 'pass'} readOnly /> Đạt
                </label>
                <label className="pv2-radio-label">
                  <input type="radio" checked={summary?.result === 'fail'} readOnly /> Không đạt
                </label>
              </div>
            </div>
            <div className="pv2-field">
              <label>Sản phẩm</label>
              <div className="pv2-readonly">{summary?.product || '—'}</div>
            </div>
            <div className="pv2-field">
              <label>Quy cách</label>
              <div className="pv2-readonly">{summary?.spec || '—'}</div>
            </div>
            <div className="pv2-field">
              <label>SL Cần Kiểm</label>
              <div className="pv2-readonly">{summary?.needQty || '—'}</div>
            </div>
            <div className="pv2-field">
              <label>SL mẫu</label>
              <div className="pv2-readonly">{summary?.sampleQty || '—'}</div>
            </div>
            <div className="pv2-field">
              <label>Lỗi (nếu có)</label>
              <div className="pv2-readonly">{summary?.errorQty || '—'}</div>
            </div>
          </div>

          <div className="pv2-finish-pallet-row">
            <label className="pv2-checkbox-label">
              <input
                type="checkbox"
                checked={confirmCheck}
                onChange={(e) => setConfirmCheck(e.target.checked)}
              />
              <span>Xác nhận hoàn thành kiểm tra cho mã Pallet:</span>
            </label>
            <div className="pv2-pallet-display">
              {palletCode
                ? <strong className="pv2-pallet-code">{palletCode}</strong>
                : <button className="pv2-btn-create-pallet" onClick={onCreatePallet}>
                    🔖 Tạo mã pallet
                  </button>
              }
            </div>
          </div>
        </div>
        <div className="pv2-modal-footer">
          <button type="button" className="pv2-btn-cancel" onClick={onClose}>Hủy bỏ</button>
          <button
            type="button"
            className="pv2-btn-submit"
            disabled={!confirmCheck}
            onClick={() => onConfirm({ ...summary, palletCode, confirmed: confirmCheck })}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  )
}

export default FinishInspectionModal
