import React, { useState, useEffect } from 'react'
import { X, Pencil } from 'lucide-react'

const ConfirmQtyModal = ({ open, items, onConfirm, onClose }) => {
  const [localItems, setLocalItems] = useState(items.map((i) => ({ ...i })))
  const [editIdx, setEditIdx] = useState(null)
  const [editVal, setEditVal] = useState('')

  useEffect(() => {
    if (open) {
      setLocalItems(items.map((i) => ({ ...i })))
      setEditIdx(null)
    }
  }, [open, items])

  if (!open) return null

  const startEdit = (idx) => {
    setEditIdx(idx)
    setEditVal(String(localItems[idx].qty || 0))
  }

  const saveEdit = () => {
    if (editIdx === null) return
    const val = Math.max(0, Number(editVal) || 0)
    setLocalItems((prev) => prev.map((it, i) => i === editIdx ? { ...it, qty: val } : it))
    setEditIdx(null)
  }

  return (
    <div className="pv2-modal-overlay">
      <div className="pv2-modal" style={{ maxWidth: 460, width: '94%', margin: '0 auto', boxSizing: 'border-box', maxHeight: 'calc(100dvh - 32px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="pv2-modal-header">
          <span className="pv2-modal-title">CL07.1: Xác nhận số lượng giao</span>
          <button type="button" className="pv2-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="pv2-modal-body" style={{ padding: '12px 10px', boxSizing: 'border-box', overflowX: 'hidden', overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
          <div className="pv2-table-wrap" style={{ width: '100%', boxSizing: 'border-box' }}>
            <table className="pv2-table" style={{ width: '100%', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '34px' }} />
                <col style={{ width: 'auto' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '68px' }} />
                <col style={{ width: '34px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', padding: '8px 2px' }}>STT</th>
                  <th style={{ padding: '8px 6px' }}>Chi tiết</th>
                  <th style={{ textAlign: 'center', padding: '8px 4px' }}>Quy cách</th>
                  <th style={{ textAlign: 'center', padding: '8px 4px' }}>Số lượng</th>
                  <th style={{ textAlign: 'center', padding: '8px 2px' }}></th>
                </tr>
              </thead>
              <tbody>
                {localItems.map((item, idx) => {
                  const isEmpty = Number(item.qty) === 0
                  const isFull = Number(item.qty) >= Number(item.total)
                  return (
                    <tr key={item.id || idx}>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: 11.5, padding: '8px 2px' }}>
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td style={{
                        fontWeight: 600,
                        color: '#1e293b',
                        fontSize: 12,
                        lineHeight: 1.35,
                        padding: '8px 6px',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'normal'
                      }}>
                        {item.detail}
                      </td>
                      <td style={{
                        textAlign: 'center',
                        fontSize: 11.5,
                        color: '#475569',
                        padding: '8px 4px',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'normal'
                      }}>
                        {item.spec}
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                        {editIdx === idx ? (
                          <input
                            type="number"
                            className="pv2-inline-input"
                            style={{
                              width: '100%',
                              height: 28,
                              textAlign: 'center',
                              borderRadius: 4,
                              border: '1.5px solid #c85a1e',
                              fontSize: 13,
                              fontWeight: 700,
                              boxSizing: 'border-box'
                            }}
                            value={editVal}
                            onChange={(e) => setEditVal(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                            autoFocus
                          />
                        ) : (
                          <span style={{
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: isEmpty ? '#dc2626' : isFull ? '#16a34a' : '#ea580c',
                            whiteSpace: 'nowrap'
                          }}>
                            {item.qty || 0}{Number(item.total) > 0 ? `/${item.total}` : ''}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px 2px' }}>
                        <button
                          type="button"
                          className="pv2-edit-btn"
                          onClick={() => editIdx === idx ? saveEdit() : startEdit(idx)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#c85a1e',
                            padding: 3,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 4
                          }}
                          title="Sửa số lượng"
                        >
                          <Pencil size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="pv2-modal-footer">
          <button type="button" className="pv2-btn-secondary" onClick={onClose}>Hủy bỏ</button>
          <button type="button" className="pv2-btn-primary" onClick={() => onConfirm(localItems)}>Xác nhận</button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmQtyModal
