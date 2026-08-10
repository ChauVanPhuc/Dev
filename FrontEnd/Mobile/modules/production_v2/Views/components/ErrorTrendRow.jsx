import { Minus, Plus } from 'lucide-react'

const ErrorTrendRow = ({ row, onChange, onRemove, disabled = false }) => (
  <div className="pv2-error-row">
    <input
      type="text"
      className="pv2-input pv2-error-name"
      placeholder="Tên lỗi"
      value={row.name}
      disabled={disabled}
      style={disabled ? { backgroundColor: '#f1f5f9', cursor: 'default', color: '#334155' } : {}}
      onChange={(e) => !disabled && onChange && onChange({ ...row, name: e.target.value })}
    />
    <div className="pv2-stepper">
      {!disabled && (
        <button
          type="button"
          className="pv2-stepper-btn"
          onClick={() => onChange && onChange({ ...row, qty: Math.max(0, row.qty - 1) })}
        ><Minus size={14} /></button>
      )}
      <span className="pv2-stepper-val" style={disabled ? { minWidth: 36, textAlign: 'center', fontWeight: 'bold' } : {}}>{row.qty}</span>
      {!disabled && (
        <button
          type="button"
          className="pv2-stepper-btn"
          onClick={() => onChange && onChange({ ...row, qty: row.qty + 1 })}
        ><Plus size={14} /></button>
      )}
    </div>
  </div>
)

export default ErrorTrendRow
