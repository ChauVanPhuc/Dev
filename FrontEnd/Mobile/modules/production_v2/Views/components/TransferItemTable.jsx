import { Pencil } from 'lucide-react'

const TransferItemTable = ({ items, onEditItem }) => (
  <div className="pv2-table-wrap">
    <table className="pv2-table">
      <thead>
        <tr>
          <th>STT</th>
          <th>Chi tiết</th>
          <th>Quy cách</th>
          <th>Số lượng</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => {
          const isFull = item.qty >= item.total
          const isEmpty = item.qty === 0
          return (
            <tr key={item.id}>
              <td>{String(idx + 1).padStart(2, '0')}</td>
              <td>{item.detail}</td>
              <td>{item.spec}</td>
              <td>
                <span className="pv2-qty-container">
                  <strong className={isEmpty ? 'pv2-qty-num--empty' : isFull ? 'pv2-qty-num--full' : 'pv2-qty-num--partial'}>
                    {item.qty}
                  </strong>
                  <span className="pv2-qty-total">/{item.total}</span>
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>
                <button type="button" className="pv2-edit-btn" onClick={() => onEditItem && onEditItem(item, idx)}>
                  <Pencil size={18} />
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
