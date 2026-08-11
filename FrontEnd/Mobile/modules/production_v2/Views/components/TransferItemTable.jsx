import React from 'react'
import { Pencil } from 'lucide-react'

const TransferItemTable = ({ items = [], onEditItem }) => (
  <div className="pv2-table-wrap">
    <table className="pv2-table" style={{ width: '100%', tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '34px' }} />
        <col style={{ width: 'auto' }} />
        <col style={{ width: '80px' }} />
        <col style={{ width: '65px' }} />
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
        {items.map((item, idx) => {
          const isFull = Number(item.qty) >= Number(item.total)
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
                <span className="pv2-qty-container" style={{ display: 'inline-flex', alignItems: 'baseline', justifyContent: 'center' }}>
                  <strong
                    className={isEmpty ? 'pv2-qty-num--empty' : isFull ? 'pv2-qty-num--full' : 'pv2-qty-num--partial'}
                    style={{ fontSize: 12.5, fontWeight: 700 }}
                  >
                    {item.qty ?? 0}
                  </strong>
                  <span className="pv2-qty-total" style={{ fontSize: 11, color: '#94a3b8' }}>/{item.total ?? 0}</span>
                </span>
              </td>
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
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
)

export default TransferItemTable
