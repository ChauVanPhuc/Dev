const TransferCard = ({ ticket, onClick }) => {
  const code = ticket.code || `LC${ticket.id}`
  const timeStr = ticket.time_str || (ticket.time && ticket.date ? `${ticket.time} | ${ticket.date}` : '16:40 | 22/1/2026')
  const routeStr = ticket.route_str || (ticket.fromStage && ticket.toStage ? `${ticket.fromStage} - ${ticket.toStage}` : 'Định hình 1 - Lắp ráp 1')
  const versionStr = 'V1'
  const statusStr = ticket.status || 'Chờ xác nhận'
  const isSelected = ticket.code === 'LC03'

  return (
    <div className={`pv2-card ${isSelected ? 'pv2-card--selected' : ''}`} onClick={onClick}>
      <div className="pv2-card-row pv2-card-top">
        <div className="pv2-card-left">
          <span className="pv2-ticket-code">{code}</span>
          <span className="pv2-version-pill pv2-version-pill--v1">
            V1
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
