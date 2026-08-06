import { TRANSFER_STATUS_CONFIG } from '../../constants'

const InspectionCard = ({ ticket, onClick }) => {
  const statusCfg = TRANSFER_STATUS_CONFIG[ticket.status] || { label: ticket.status, className: '' }

  return (
    <div className="pv2-card" onClick={onClick}>
      <div className="pv2-card-row pv2-card-top">
        <span className="pv2-ticket-code">{ticket.code}</span>
        <span className="pv2-time">{ticket.time} | {ticket.date}</span>
      </div>
      <div className="pv2-card-row pv2-card-bottom">
        <span className="pv2-route">PO: {ticket.poCode}</span>
        <span className={`pv2-status-tag ${statusCfg.className}`}>{statusCfg.label}</span>
      </div>
    </div>
  )
}

export default InspectionCard
