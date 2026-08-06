import { Minus, Plus } from 'lucide-react'

const ErrorTrendRow = ({ row, onChange, onRemove }) => (
  <div className="pv2-error-row">
    <input
      type="text"
      className="pv2-input pv2-error-name"
      placeholder="Nứt tét"
      value={row.name}
      onChange={(e) => onChange({ ...row, name: e.target.value })}
    />
    <div className="pv2-stepper">
      <button
        className="pv2-stepper-btn"
        onClick={() => onChange({ ...row, qty: Math.max(0, row.qty - 1) })}
      ><Minus size={14} /></button>
      <span className="pv2-stepper-val">{row.qty}</span>
      <button
        className="pv2-stepper-btn"
        onClick={() => onChange({ ...row, qty: row.qty + 1 })}
      ><Plus size={14} /></button>
    </div>
  </div>
)

export default ErrorTrendRow
