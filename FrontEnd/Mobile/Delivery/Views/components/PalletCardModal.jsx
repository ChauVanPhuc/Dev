import { useRef } from 'react'
import { X, Printer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import logoImg from '@mobile/assets/logo.jpg'

/**
 * PalletCardModal - Thẻ Pallet cỡ A5 dạng bảng chuẩn in
 * Props: isOpen, onClose, data, partProducts[]
 */
const PalletCardModal = ({ isOpen, onClose, data, partProducts = [] }) => {
  const printRef = useRef(null)

  const handlePrint = async () => {
    const printContent = printRef.current?.innerHTML
    if (!printContent) return

    let logoBase64 = ''
    try {
      const resp = await fetch(logoImg)
      const blob = await resp.blob()
      logoBase64 = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(blob)
      })
    } catch { logoBase64 = '' }

    const injectedContent = logoBase64
      ? printContent.replace(/src="[^"]*Logo[^"]*"/gi, `src="${logoBase64}"`)
      : printContent

    const win = window.open('', '_blank', 'width=700,height=1000')
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Thẻ Pallet - ${data?.qr_code || data?.id || 'PREVIEW'}</title>
        <style>
          @page { size: A5 portrait; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .pallet-card { width: 148mm !important; min-height: 210mm !important; padding: 10mm !important; }
          table { width: 100%; border-collapse: collapse; }
          td, th { border: 1px solid #333; padding: 4px 6px; font-size: 10px; vertical-align: top; }
          .red { color: #c00; font-weight: bold; }
          .big-title { font-size: 22px; font-weight: 900; text-align: center; }
          .sub-title { font-size: 10px; text-align: center; color: #444; }
          .section-header { background: #f0f0f0; font-weight: bold; text-align: center; font-size: 10px; }
          .logo-img { width: 60px; object-fit: contain; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${injectedContent}
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body>
      </html>
    `)
    win.document.close()
  }

  if (!isOpen || !data) return null

  const formatDate = (dt) => {
    const d = dt ? new Date(dt) : new Date()
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const partName = data?.part_name || '---'
  const spec = data?.specification && data.specification !== 'Không có' ? data.specification : ''
  const qty = data?.quantity || data?.quantity_total || data?.quantity_received || 0
  const residualVal = data?.residual || 0
  const planName = data?.plan_name || '---'
  const deliveryStage = data?.delivery_stage || ''
  const receivingStage = data?.receiving_stage || ''
  const note = data?.note || ''
  const createdAt = formatDate(data?.created_at)
  const userName = data?.user_name || ''
  const orderCode = data?.order_code || data?.backup_qr || ''

  const qrCode = data?.qr_code || (data?.id ? `DEL-${data.id}` : null)
  // Khi chưa có mã từ server, encode thông tin chi tiết vào QR để xem trước
  const qrValue = qrCode || `${partName}|${spec}|${planName}|${createdAt}`
  // Tính tổng kế hoạch của chi tiết này trong toàn bộ KHSX
  const totalPlanQty = partProducts.reduce((sum, p) => sum + (p.part_qty_needed || 0), 0)

  const cellStyle = { border: '1px solid #999', padding: '5px 7px', fontSize: '11px', verticalAlign: 'top' }
  const labelStyle = { ...cellStyle, color: '#333', fontWeight: 400 }
  const valueStyle = { ...cellStyle, color: '#c00', fontWeight: 700 }
  const sectionHeaderStyle = { ...cellStyle, background: '#f5f5f5', fontWeight: 700, textAlign: 'center', fontSize: '11px', color: '#222' }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9998, backdropFilter: 'blur(3px)' }} />

      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '12px', overflowY: 'auto' }}>
        {/* Action bar */}
        <div style={{ width: '100%', maxWidth: '440px', display: 'flex', gap: '10px', marginBottom: '10px', position: 'sticky', top: 0, zIndex: 1 }}>
          <button
            onClick={handlePrint}
            style={{ flex: 1, background: '#3d2b1f', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <Printer size={18} /> In thẻ Pallet (A5)
          </button>
          <button
            onClick={onClose}
            style={{ background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '11px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.9rem' }}
          >
            <X size={16} /> Đóng
          </button>
        </div>

        {/* Card */}
        <div
          ref={printRef}
          className="pallet-card"
          style={{
            width: '100%',
            maxWidth: '440px',
            background: '#fff',
            padding: '12px',
            boxSizing: 'border-box',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            borderRadius: '4px',
            color: '#000',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          {/* Header: Logo + Tiêu đề + Mã + Ngày */}
          <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '6px' }}>
            <tbody>
              <tr>
                <td rowSpan={2} style={{ ...cellStyle, width: '80px', textAlign: 'center', verticalAlign: 'middle' }}>
                  <img src={logoImg} alt="Logo" style={{ width: '64px', objectFit: 'contain' }} />
                </td>
                <td style={{ ...cellStyle, textAlign: 'center', fontSize: '22px', fontWeight: 900, letterSpacing: '1px', border: '1px solid #999' }}>
                  Thẻ pallet
                </td>
                <td rowSpan={2} style={{ ...cellStyle, width: '90px', textAlign: 'center', verticalAlign: 'middle' }}>
                  <QRCodeSVG value={qrValue} size={75} bgColor="#ffffff" fgColor="#000000" level="M" />
                </td>
              </tr>
              <tr>
                <td style={{ ...cellStyle, textAlign: 'center', fontSize: '11px', color: '#444' }}>
                  Mã: <span style={{ fontWeight: 700, color: '#c00' }}>{qrCode}</span>
                  &nbsp;&nbsp;Ngày tạo: <span style={{ fontWeight: 700 }}>{createdAt}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Thông tin chính */}
          <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '6px' }}>
            <tbody>
              <tr>
                <td style={labelStyle}>KHSX:</td>
                <td style={valueStyle}>{planName}</td>
                <td style={labelStyle}>PO:</td>
                <td style={valueStyle}>
                  {(() => {
                    // 1. Nếu đã có dữ liệu details từ server (đã tạo phiếu)
                    if (data?.details && data.details.length > 0) {
                      const activePOs = new Set();
                      data.details.forEach(d => {
                        if (d.order_code && d.order_code !== 'N/A') {
                          activePOs.add(d.order_code);
                        } else if (d.order?.order_code) {
                          activePOs.add(d.order.order_code);
                        }
                      });
                      if (activePOs.size > 0) return Array.from(activePOs).join(', ');
                    }
                    
                    // 2. Nếu là preview và có chọn các đơn hàng cụ thể
                    if (data?.selected_order_ids && data.selected_order_ids.length > 0) {
                      const activePOs = new Set();
                      partProducts
                        .filter(p => data.selected_order_ids.includes(p.order_id?.toString()))
                        .forEach(p => {
                          if (p.order_code) activePOs.add(p.order_code);
                        });
                      if (activePOs.size > 0) return Array.from(activePOs).join(', ');
                    }

                    // 3. Fallback: tự động rót (chức năng cũ)
                    if (!partProducts || partProducts.length === 0) return orderCode;
                    let remainingGiao = qty;
                    const activePOs = new Set();
                    partProducts.forEach(p => {
                      const alreadyDelivered = p.delivered || 0;
                      const remainingNeeded = Math.max(0, p.part_qty_needed - alreadyDelivered);
                      const allocated = Math.min(remainingGiao, remainingNeeded);
                      if (allocated > 0 && p.order_code) {
                        activePOs.add(p.order_code);
                      }
                      remainingGiao -= allocated;
                    });
                    return activePOs.size > 0 ? Array.from(activePOs).join(', ') : orderCode;
                  })()}
                </td>
              </tr>
              <tr>
                <td style={labelStyle}>Khách hàng:</td>
                <td style={{ ...valueStyle }} colSpan={1}>
                  {(() => {
                    // 1. Nếu đã có dữ liệu details từ server
                    if (data?.details && data.details.length > 0) {
                      const activeCustomers = new Set();
                      data.details.forEach(d => {
                        const matchedProduct = partProducts?.find(p => p.order_id === d.order_id);
                        const cust = matchedProduct?.customer || d.order?.customer;
                        if (cust) {
                          activeCustomers.add(cust);
                        }
                      });
                      if (activeCustomers.size > 0) return Array.from(activeCustomers).join(', ');
                    }

                    // 2. Nếu là preview và có chọn các đơn hàng cụ thể
                    if (data?.selected_order_ids && data.selected_order_ids.length > 0) {
                      const activeCustomers = new Set();
                      partProducts
                        .filter(p => data.selected_order_ids.includes(p.order_id?.toString()))
                        .forEach(p => {
                          if (p.customer) activeCustomers.add(p.customer);
                        });
                      if (activeCustomers.size > 0) return Array.from(activeCustomers).join(', ');
                    }

                    // 3. Fallback: tự động rót (chức năng cũ)
                    if (!partProducts || partProducts.length === 0) return (data?.customer || '');
                    let remainingGiao = qty;
                    const activeCustomers = new Set();
                    partProducts.forEach(p => {
                      const alreadyDelivered = p.delivered || 0;
                      const remainingNeeded = Math.max(0, p.part_qty_needed - alreadyDelivered);
                      const allocated = Math.min(remainingGiao, remainingNeeded);
                      if (allocated > 0 && p.customer) {
                        activeCustomers.add(p.customer);
                      }
                      remainingGiao -= allocated;
                    });
                    return activeCustomers.size > 0 ? Array.from(activeCustomers).join(', ') : (data?.customer || '');
                  })()}
                </td>
                <td style={labelStyle}>Mã sản phẩm</td>
                <td style={{ ...valueStyle, fontSize: '10px', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                  {(() => {
                    // 1. Nếu đã có dữ liệu details từ server
                    if (data?.details && data.details.length > 0) {
                      return data.details.map(d => {
                        const matchedProduct = partProducts?.find(p => p.order_id === d.order_id);
                        const sku = matchedProduct?.prod_sku || d.order?.prod_sku || d.prod_sku || '';
                        const qtyVal = d.quantity || 0;
                        if (qtyVal <= 0) return null;
                        if (matchedProduct) {
                          return `${sku}: ${qtyVal.toLocaleString('vi-VN')} / ${matchedProduct.part_qty_needed.toLocaleString('vi-VN')}`;
                        }
                        return `${sku}: ${qtyVal.toLocaleString('vi-VN')}`;
                      }).filter(Boolean).join('\n');
                    }

                    // 2. Nếu là preview và có chọn các đơn hàng cụ thể
                    if (data?.selected_order_ids && data.selected_order_ids.length > 0) {
                      const allowedPartProds = partProducts.filter(p => data.selected_order_ids.includes(p.order_id?.toString()));
                      let remainingGiao = qty;
                      return allowedPartProds.map(p => {
                        const alreadyDelivered = p.delivered || 0;
                        const remainingNeeded = Math.max(0, p.part_qty_needed - alreadyDelivered);
                        const allocated = Math.min(remainingGiao, remainingNeeded);
                        remainingGiao -= allocated;
                        if (allocated <= 0) return null;
                        return `${p.prod_sku}: ${allocated.toLocaleString('vi-VN')} / ${p.part_qty_needed.toLocaleString('vi-VN')}`;
                      }).filter(Boolean).join('\n');
                    }

                    // 3. Fallback: tự động rót (chức năng cũ)
                    let remainingGiao = qty
                    return partProducts.map(p => {
                      const alreadyDelivered = p.delivered || 0
                      const remainingNeeded = Math.max(0, p.part_qty_needed - alreadyDelivered)
                      
                      // Cấp phát cho SP này dựa trên lượng CÒN THIẾU trong kế hoạch
                      const allocated = Math.min(remainingGiao, remainingNeeded)
                      remainingGiao -= allocated
                      
                      // [CHỈNH SỬA] Chỉ hiển thị số lượng thực tế nằm trong kiện này (allocated)
                      // Thay vì hiển thị tổng lũy kế (alreadyDelivered + allocated) gây nhầm lẫn
                      if (allocated <= 0) return null
                      return `${p.prod_sku}: ${allocated.toLocaleString('vi-VN')} / ${p.part_qty_needed.toLocaleString('vi-VN')}`
                    }).filter(Boolean).join('\n')
                  })()}
                </td>
              </tr>
              <tr>
                <td style={labelStyle}>Tên chi tiết:</td>
                <td style={valueStyle} colSpan={3}>{partName}</td>
              </tr>
              <tr>
                <td style={labelStyle}>Quy cách:</td>
                <td style={valueStyle}>{spec}</td>
                <td style={labelStyle}>Số lượng<br />(giao/kế hoạch)</td>
                <td style={{ ...valueStyle, fontSize: '14px' }}>
                  <div>{qty.toLocaleString('vi-VN')} / {totalPlanQty.toLocaleString('vi-VN')}</div>
                  {residualVal > 0 && (
                    <div style={{ color: '#c00', fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>
                      (Dư: {residualVal.toLocaleString('vi-VN')})
                    </div>
                  )}
                </td>
              </tr>
              <tr>
                <td style={labelStyle}>Độ ẩm</td>
                <td style={valueStyle}>
                  {data?.moisture_min !== undefined && data?.moisture_max !== undefined && data?.moisture_min !== '' && data?.moisture_max !== '' 
                    ? `${data.moisture_min}% - ${data.moisture_max}%` 
                    : '[Min - Max]'}
                </td>
                <td style={labelStyle}>QC test:</td>
                <td style={valueStyle}>{data?.qc_status || 'Chưa test'}</td>
              </tr>
              <tr>
                <td style={labelStyle}>Giao bởi:</td>
                <td style={cellStyle}>{userName}</td>
                <td style={labelStyle}>Bộ phận:</td>
                <td style={valueStyle}>{deliveryStage}</td>
              </tr>
              <tr>
                <td style={labelStyle}>Nhận bởi:</td>
                <td style={cellStyle}></td>
                <td style={labelStyle}>Bộ phận:</td>
                <td style={valueStyle}>{receivingStage}</td>
              </tr>
              <tr>
                <td style={labelStyle}>Kiểm tra bởi:</td>
                <td style={cellStyle}></td>
                <td style={labelStyle}>Bộ phận:</td>
                <td style={cellStyle}></td>
              </tr>
            </tbody>
          </table>

          {/* Thông tin nguồn gốc gỗ */}
          <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '6px' }}>
            <tbody>
              <tr>
                <td colSpan={4} style={sectionHeaderStyle}>Thông tin nguồn gốc gỗ</td>
              </tr>
              <tr>
                <td style={labelStyle}>Tiêu chuẩn NL:</td>
                <td style={cellStyle} colSpan={3}></td>
              </tr>
              <tr>
                <td style={labelStyle}>Nhà cung cấp:</td>
                <td style={cellStyle} colSpan={3}></td>
              </tr>
              <tr>
                <td style={labelStyle}>Loại gỗ:</td>
                <td colSpan={3} style={{ ...cellStyle, color: '#666', fontSize: '10px', textAlign: 'left' }}>Tên khoa học: </td>
              </tr>
              <tr>
                <td style={labelStyle}>Chủng loại</td>
                <td style={cellStyle} colSpan={3}></td>
              </tr>
              <tr>
                <td style={labelStyle}>Thông tin khác</td>
                <td style={cellStyle} colSpan={3}>{note}</td>
              </tr>
            </tbody>
          </table>

          {/* [DELETED] Phần QR cũ ở chân trang */}
        </div>
      </div>
    </>
  )
}

export default PalletCardModal
