import { useState } from 'react'
import { X, Minus, Plus } from 'lucide-react'

const ConfirmErrorQtyModal = ({ open, onConfirm, onClose }) => {
  const [sampleQty, setSampleQty] = useState(50)
  const [errorQty, setErrorQty] = useState(1)

  if (!open) return null

  return (
    <div className="pv2-modal-overlay">
      <div className="pv2-modal pv2-modal--sm">
        <div className="pv2-modal-header">
          <span className="pv2-modal-title">CL09.1: Xác nhận số lượng lỗi</span>
          <button className="pv2-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="pv2-modal-body">
          <div className="pv2-modal-row">
            <div className="pv2-field">
              <label>Số lượng lấy mẫu</label>
              <input
                type="number"
                className="pv2-input"
                value={sampleQty}
                onChange={(e) => setSampleQty(Number(e.target.value))}
              />
            </div>
            <div className="pv2-field">
              <label>SL không đạt</label>
              <div className="pv2-stepper pv2-stepper--lg">
                <button className="pv2-stepper-btn" onClick={() => setErrorQty((v) => Math.max(0, v - 1))}>
                  <Minus size={16} />
                </button>
                <span className="pv2-stepper-val">{errorQty}</span>
                <button className="pv2-stepper-btn" onClick={() => setErrorQty((v) => v + 1)}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="pv2-modal-footer">
          <button type="button" className="pv2-btn-cancel" onClick={onClose}>Hủy bỏ</button>
          <button type="button" className="pv2-btn-submit" onClick={() => onConfirm({ sampleQty, errorQty })}>Xác nhận</button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmErrorQtyModal
