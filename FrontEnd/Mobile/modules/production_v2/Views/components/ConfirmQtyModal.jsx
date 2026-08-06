import { useState } from 'react'
import { X, Pencil } from 'lucide-react'

const ConfirmQtyModal = ({ open, items, onConfirm, onClose }) => {
  const [localItems, setLocalItems] = useState(items.map((i) => ({ ...i })))
  const [editIdx, setEditIdx] = useState(null)
  const [editVal, setEditVal] = useState('')

  if (!open) return null

  const startEdit = (idx) => {
    setEditIdx(idx)
    setEditVal(String(localItems[idx].qty))
  }

  const saveEdit = () => {
    if (editIdx === null) return
    const val = Math.min(Math.max(0, Number(editVal)), localItems[editIdx].total)
    setLocalItems((prev) => prev.map((it, i) => i === editIdx ? { ...it, qty: val } : it))
    setEditIdx(null)
  }

  return (
    <div className="pv2-modal-overlay">
      <div className="pv2-modal">
        <div className="pv2-modal-header">
          <span className="pv2-modal-title">CL07.1: Xác nhận số lượng giao</span>
          <button className="pv2-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="pv2-modal-body">
          <table className="pv2-table">
            <thead>
              <tr><th>STT</th><th>Chi tiết</th><th>Quy cách</th><th>Số lượng</th><th></th></tr>
            </thead>
            <tbody>
              {localItems.map((item, idx) => {
                const isEmpty = item.qty === 0
                const isFull = item.qty >= item.total
                return (
                  <tr key={item.id}>
                    <td>{String(idx + 1).padStart(2, '0')}</td>
                    <td>{item.detail}</td>
                    <td>{item.spec}</td>
                    <td>
                      {editIdx === idx ? (
                        <input
                          type="number"
                          className="pv2-inline-input"
                          value={editVal}
                          onChange={(e) => setEditVal(e.target.value)}
                          onBlur={saveEdit}
                          autoFocus
                        />
                      ) : (
                        <span className={isEmpty ? 'pv2-qty--empty' : isFull ? 'pv2-qty--full' : 'pv2-qty--partial'}>
                          {item.qty}/{item.total}
                        </span>
                      )}
                    </td>
                    <td>
                      <button className="pv2-edit-btn" onClick={() => editIdx === idx ? saveEdit() : startEdit(idx)}>
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="pv2-modal-footer">
          <button className="pv2-btn-secondary" onClick={onClose}>Hủy bỏ</button>
          <button className="pv2-btn-primary" onClick={() => onConfirm(localItems)}>Xác nhận</button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmQtyModal
