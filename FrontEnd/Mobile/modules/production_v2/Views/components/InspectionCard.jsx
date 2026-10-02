const MODE_LABELS = {
  first_sample: { label: 'Mẫu lần đầu', bg: '#eff6ff', color: '#1d4ed8' },
  re_inspect: { label: 'Kiểm tra lại', bg: '#fff7ed', color: '#c2410c' },
  parameter: { label: 'Thông số', bg: '#f0fdf4', color: '#15803d' },
  process: { label: 'Quy trình', bg: '#faf5ff', color: '#7e22ce' },
  qa: { label: 'Vấn đáp', bg: '#fdf2f8', color: '#be185d' },
  input: { label: 'Đầu vào', bg: '#eff6ff', color: '#1d4ed8' },
}

const formatShortSpec = (spec) => {
  if (!spec) return ''
  const firstPart = String(spec).split(/\s*[-–—]\s*/)[0]?.trim() || ''
  return firstPart || spec
}

const InspectionCard = ({ ticket, onClick }) => {
  const code = ticket.code || `KT${ticket.id}`
  const timeStr = ticket.time_str || (ticket.time && ticket.date ? `${ticket.time} | ${ticket.date}` : (ticket.created_at ? new Date(ticket.created_at).toLocaleString('vi-VN') : ''))
  const poCode = ticket.po || ticket.poCode || ticket.batch_no || '---'
  const isDone = ticket.status === 'done' || ticket.is_confirmed === true
  const statusLabel = isDone ? 'Đã xong' : 'Chờ xác nhận'
  const modeInfo = MODE_LABELS[ticket.mode] || { label: ticket.mode || 'QC', bg: '#f1f5f9', color: '#475569' }
  const isPass = ticket.result === 'pass' || ticket.result === 'Đạt' || ticket.result === 'excellent'

  return (
    <div className="pv2-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="pv2-card-row pv2-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="pv2-ticket-code" style={{ fontSize: 16, fontWeight: 800, color: '#4a240e' }}>{code}</span>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 12,
            backgroundColor: modeInfo.bg,
            color: modeInfo.color,
          }}>
            {modeInfo.label}
          </span>
        </div>
        <div className="pv2-card-right">
          <span className="pv2-time" style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>{timeStr}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '6px 0', fontSize: 13, color: '#444' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>PO: <strong style={{ color: '#1e293b' }}>{poCode}</strong></span>
          {ticket.stage && (
            <span style={{ color: '#64748b', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '58%', textAlign: 'right' }} title={ticket.stage}>
              C.Đoạn: <strong style={{ color: '#334155' }}>{ticket.stage}</strong>
            </span>
          )}
        </div>
        {(ticket.product || ticket.spec) && (
          <div style={{ fontSize: 12, color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '50%' }} title={ticket.product}>
              SP: <strong style={{ color: '#334155' }}>{ticket.product || '---'}</strong>
            </span>
            {ticket.spec && (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '50%', textAlign: 'right' }} title={ticket.spec}>
                QC: <strong style={{ color: '#334155' }}>{formatShortSpec(ticket.spec)}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="pv2-card-row pv2-card-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTop: '1px dashed #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 4,
            backgroundColor: isPass ? '#dcfce7' : '#fee2e2',
            color: isPass ? '#15803d' : '#b91c1c',
          }}>
            {isPass ? 'Đạt' : 'Không đạt'}
          </span>
          {!isPass && (ticket.action === 'chap-nhan' || ticket.action === 'luu-kho') && (
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 4,
              backgroundColor: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0'
            }}>
              Tự xử lý
            </span>
          )}
          {!isPass && ticket.action === 'cach-ly' && (
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 4,
              backgroundColor: '#fffbeb',
              color: '#b45309',
              border: '1px solid #fde68a'
            }}>
              Cách ly
            </span>
          )}
          {(Number(ticket.required_qty || ticket.needQty || ticket.sampleQty) > 0 || Number(ticket.errorQty) > 0) && (
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {Number(ticket.required_qty || ticket.needQty) > 0 ? (
                <>SL: <strong>{ticket.required_qty || ticket.needQty}</strong> | </>
              ) : null}
              Lỗi: <strong style={{ color: Number(ticket.errorQty) > 0 ? '#dc2626' : 'inherit' }}>{ticket.errorQty || 0}</strong>
            </span>
          )}
        </div>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: isDone ? '#16a34a' : '#d9381e',
        }}>
          {statusLabel}
        </span>
      </div>
    </div>
  )
}

export default InspectionCard
