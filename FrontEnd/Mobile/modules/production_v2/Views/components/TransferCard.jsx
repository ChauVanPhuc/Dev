import { TRANSFER_STATUS_CONFIG, VERSION_CONFIG } from '../../constants'

const TransferCard = ({ ticket, onClick }) => {
  const statusCfg = TRANSFER_STATUS_CONFIG[ticket.status] || { label: ticket.status, className: '' }
  const versionCfg = VERSION_CONFIG[ticket.version] || { label: ticket.version, className: '' }

  return (
    <div className="pv2-card" onClick={onClick}>
      <div className="pv2-card-row pv2-card-top">
        <div className="pv2-card-left">
          <span className="pv2-ticket-code">{ticket.code}</span>
          <span className={`pv2-version-badge ${versionCfg.className}`}>{versionCfg.label}</span>
        </div>
        <div className="pv2-card-right">
          <span className="pv2-time">{ticket.time} | {ticket.date}</span>
        </div>
      </div>
      <div className="pv2-card-row pv2-card-bottom">
        <span className="pv2-route">{ticket.fromStage} - {ticket.toStage}</span>
        <span className={`pv2-status-tag ${statusCfg.className}`}>{statusCfg.label}</span>
      </div>
    </div>
  )
}

export default TransferCard
