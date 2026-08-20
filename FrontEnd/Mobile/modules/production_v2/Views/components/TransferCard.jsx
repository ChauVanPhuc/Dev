const TransferCard = ({ ticket, onClick, isSelected = false }) => {
  const code = ticket.code || `LC${ticket.id}`
  const timeStr = ticket.time_str || (ticket.time && ticket.date ? `${ticket.time} | ${ticket.date}` : ticket.created_at || '—')
  const routeStr = ticket.route_str || (ticket.fromStage && ticket.toStage ? `${ticket.fromStage} - ${ticket.toStage}` : (ticket.delivery_stage ? `${ticket.delivery_stage} - ${ticket.receiving_stage || ''}` : '—'))
  const versionStr = ticket.version_badge || ticket.version || 'V1'
  const isV2 = versionStr === 'V2'
  const statusStr = ticket.status || 'Chờ xác nhận'

  return (
    <div className={`pv2-card ${isSelected ? 'pv2-card--selected' : ''}`} onClick={onClick}>
      <div className="pv2-card-row pv2-card-top">
        <div className="pv2-card-left">
          <span className="pv2-ticket-code">{code}</span>
          <span className={`pv2-version-pill ${isV2 ? 'pv2-version-pill--v2' : 'pv2-version-pill--v1'}`}>
            {versionStr}
          </span>
        </div>
        <div className="pv2-card-right">
          <span className="pv2-time">{timeStr}</span>
        </div>
      </div>
      <div className="pv2-card-row pv2-card-bottom">
        <span className="pv2-route">{routeStr}</span>
        <span className="pv2-status-tag-red">{statusStr}</span>
      </div>
    </div>
  )
}

export default TransferCard
