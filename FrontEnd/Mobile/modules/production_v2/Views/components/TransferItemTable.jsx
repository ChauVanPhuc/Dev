import React from 'react'
import { Pencil } from 'lucide-react'

const TransferItemTable = ({ items = [], onEditItem, onUpdateQty, readOnly = false }) => (
  <div className="pv2-table-wrap">
    <table className="pv2-table" style={{ width: '100%', tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '32px' }} />
        <col style={{ width: 'auto' }} />
        <col style={{ width: '76px' }} />
        <col style={{ width: readOnly ? '70px' : '78px' }} />
        {!readOnly && <col style={{ width: '34px' }} />}
      </colgroup>
      <thead>
        <tr>
          <th style={{ textAlign: 'center', padding: '8px 2px' }}>STT</th>
          <th style={{ padding: '8px 6px' }}>Chi tiết</th>
          <th style={{ textAlign: 'center', padding: '8px 4px' }}>Quy cách</th>
          <th style={{ textAlign: 'center', padding: '8px 4px' }}>Số lượng</th>
          {!readOnly && <th style={{ textAlign: 'center', padding: '8px 2px' }}></th>}
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => {
          const hasTotal = Number(item.total) > 0
          const isFull = hasTotal && Number(item.qty) >= Number(item.total)
          const isEmpty = Number(item.qty) === 0
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
              <td style={{ textAlign: 'center', padding: '8px 2px', whiteSpace: 'nowrap' }}>
                {readOnly ? (
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                    {item.qty || 0}
                    {hasTotal && (
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, marginLeft: 2 }}>
                        /{item.total}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="pv2-qty-container" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <input
                      type="number"
                      min={0}
                      value={item.qty}
                      onChange={(e) => onUpdateQty && onUpdateQty(idx, e.target.value)}
                      style={{
                        width: 48,
                        textAlign: 'center',
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: isEmpty ? '#dc2626' : isFull ? '#16a34a' : '#ea580c',
                        border: '1.5px solid #c85a1e',
                        borderRadius: 6,
                        padding: '4px 2px',
                        boxSizing: 'border-box'
                      }}
                    />
                    {hasTotal && (
                      <span className="pv2-qty-total" style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                        /{item.total}
                      </span>
                    )}
                  </span>
                )}
              </td>
              {!readOnly && (
                <td style={{ textAlign: 'center', padding: '8px 2px' }}>
                  <button
                    type="button"
                    className="pv2-edit-btn"
                    onClick={() => onEditItem && onEditItem(item, idx)}
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
                    title="Chỉnh sửa số lượng"
                  >
                    <Pencil size={15} />
                  </button>
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
)

export default TransferItemTable
