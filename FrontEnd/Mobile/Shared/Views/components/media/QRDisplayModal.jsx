import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { QRCodeCanvas } from 'qrcode.react';
import { X, Download, FileJson as FilePdf, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Component QRDisplayModal
 * Hiển thị mã QR và hỗ trợ tải xuống/xuất PDF cho ERP G7.
 */
const QRDisplayModal = ({ isOpen, onClose, code, title = "Mã QR Giao Nhận" }) => {
  const navigate = useNavigate();
  const qrRef = useRef(null);
  
  // Xử lý dữ liệu code: có thể là string (cũ) hoặc object (mới)
  const isObj = typeof code === 'object' && code !== null;
  
  // Chuẩn hóa dữ liệu từ object
  const deliveryId = isObj ? (code.id || '') : '';
  const qrValue = isObj ? String(deliveryId) : String(code || '');
  const displayId = isObj ? deliveryId : code;

  // Lấy dữ liệu bổ sung nếu có
  const planName = isObj ? (code.plan_name || code.planName || '') : '';
  const partName = isObj ? (code.part_name || code.partName || '') : '';
  const quantity = isObj ? (code.quantity || '') : '';

  /**
   * Helper function: captureQR
   */
  const captureQR = async (scale = 2) => {
    if (!qrRef.current) return null;
    return await html2canvas(qrRef.current, {
      backgroundColor: '#ffffff',
      scale: scale,
      useCORS: true,
      logging: false,
    });
  };

  /**
   * Hàm downloadImage
   */
  const downloadImage = async () => {
    try {
      const canvas = await captureQR(2);
      if (!canvas) {
        alert("Không thể chụp được vùng QR. Thử lại sau.");
        return;
      }
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert("Lỗi khi tạo file ảnh.");
          return;
        }

        const fileName = `QR_Delivery_${displayId}.png`;

        // [OPTIMIZED] Ưu tiên sử dụng Web Share API cho Mobile
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: 'image/png' })] })) {
          try {
            const file = new File([blob], fileName, { type: 'image/png' });
            await navigator.share({
              files: [file],
              title: title,
              text: `Mã QR Phiếu bàn giao: ${displayId}`
            });
            return; // Thoát nếu share thành công
          } catch (shareErr) {
            console.log("Share failed, falling back to download", shareErr);
          }
        }

        // Fallback: Lưu trực tiếp (truyền thống)
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      }, 'image/png');
    } catch (err) {
      alert("Lỗi khi tải ảnh: " + err.message);
    }
  };

  /**
   * Hàm exportPDF
   */
  const exportPDF = async () => {
    try {
      const canvas = await captureQR(2);
      if (!canvas) {
        alert("Không thể chụp được vùng QR. Thử lại sau.");
        return;
      }
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      pdf.setFontSize(16);
      pdf.text(`${title}: ${displayId}`, 10, 15);
      pdf.addImage(imgData, 'PNG', 10, 25, 80, 80);
      
      if (planName) pdf.text(`Kế hoạch: ${planName}`, 10, 115);
      if (partName) pdf.text(`Chi tiết: ${partName}`, 10, 125);
      if (quantity) pdf.text(`Số lượng: ${quantity}`, 10, 135);
      
      const blob = pdf.output('blob');
      const fileName = `QR_Delivery_${displayId}.pdf`;

      // [OPTIMIZED] Ưu tiên Share PDF trên Mobile
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: 'application/pdf' })] })) {
        try {
          const file = new File([blob], fileName, { type: 'application/pdf' });
          await navigator.share({
            files: [file],
            title: title,
            text: `Tài liệu PDF QR: ${displayId}`
          });
          return;
        } catch (shareErr) {
          console.log("PDF Share failed", shareErr);
        }
      }

      // Fallback
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      alert("Lỗi khi xuất PDF: " + err.message);
    }
  };

  /**
   * Hàm handlePrint (ULTIMATE AUTO-PRINT)
   * Gửi lệnh in trực tiếp tới Native Bridge mà không cần chuyển trang.
   */
  const handlePrint = async () => {
    try {
        if (!window.AndroidPrint || !window.AndroidPrint.printHtml) {
          // Nếu không ở trên máy POS (Web), dùng cơ chế fallback cũ
          handlePrintFallback();
          return;
        }

        // 1. Lấy dữ liệu ảnh QR từ Canvas đang hiển thị
        const canvas = qrRef.current.querySelector('canvas');
        let qrImageData = '';
        if (canvas) {
          qrImageData = canvas.toDataURL('image/png');
        }

        // 2. Xây dựng HTML bản in 58mm (CỠ CHỮ TO RÕ - BỰ)
        const styles = `
          <style>
            body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; display: flex; justify-content: center; }
            .print-section { width: 48mm; text-align: center; color: #000; padding: 2mm 0; }
            .p-header { font-size: 10px; font-weight: bold; margin-bottom: 3px; }
            .p-title { font-size: 15px; font-weight: 900; margin: 8px 0; text-transform: uppercase; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 4px 0; }
            .p-row { display: flex; justify-content: space-between; margin-bottom: 5px; border-bottom: 0.5px dashed #ccc; padding-bottom: 3px; }
            .p-label { font-size: 11px; color: #333; text-align: left; }
            .p-value { font-size: 12px; font-weight: bold; text-align: right; }
            .p-id { font-size: 18px; font-weight: 900; margin-bottom: 12px; }
            img { max-width: 140px; height: auto; margin: 10px auto; display: block; }
          </style>
        `;

        const fullHtml = `
          <html><head>${styles}</head><body>
            <div class="print-section">
              <div class="p-header">VINA G7 - SMART FLOW</div>
              <div class="p-title">${title}</div>
              <img src="${qrImageData}" />
              <div class="p-id">ID: ${displayId}</div>
              <div style="text-align: left;">
                <div class="p-row"><div class="p-label">Lệnh SX:</div><div class="p-value">${planName}</div></div>
                <div class="p-row"><div class="p-label">Chi tiết:</div><div class="p-value">${partName}</div></div>
                <div class="p-row" style="border-bottom: 1.5px solid #000; margin-top: 4px; padding-bottom: 6px;">
                  <div class="p-label" style="font-size: 13px; font-weight: bold;">SL TỔNG:</div>
                  <div class="p-value" style="font-size: 22px;">${quantity}</div>
                </div>
              </div>
              <div style="font-size: 8px; color: #666; margin-top: 15px; font-style: italic;">
                In lúc: ${new Date().toLocaleString('vi-VN')}
              </div>
            </div>
          </body></html>
        `;

        // 3. Gửi thẳng lệnh in (Bấm phát in luôn)
        window.AndroidPrint.printHtml(fullHtml, `In_Phieu_G7_${displayId}`);
        
    } catch (err) {
    }
  };

  /**
   * handlePrintFallback: Chế độ in sơ phòng (Blank Web)
   * Phỏng theo cơ chế của ERP_v1 để đảm bảo in được khi WebView bị chặn.
   */
  const handlePrintFallback = async () => {
    try {
      const canvas = await captureQR(1.5);
      if (!canvas) return;
      
      const imgData = canvas.toDataURL('image/png');
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <html>
            <head><title>In dự phòng - SmartFlow</title></head>
            <body style="margin:0; display:flex; justify-content:center; align-items:center;">
              <img src="${imgData}" style="width:100%; max-width:58mm;" onload="window.print();setTimeout(()=>window.close(), 500);" />
            </body>
          </html>
        `);
        win.document.close();
      } else {
        alert("Không thể mở cửa sổ mới. Vui lòng kiểm tra cài đặt trình duyệt.");
      }
    } catch (err) {
      alert("Lỗi in dự phòng: " + err.message);
    }
  };

  return (
    <>
      {isOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}>
          {/* Backdrop (Tĩnh) */}
          <div
            onClick={onClose}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.6)'
            }}
          />

          {/* Modal Container (Tĩnh) */}
          <div
            style={{
              background: 'white',
              width: '100%',
              maxWidth: '380px',
              maxHeight: 'calc(100dvh - 32px)',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              borderRadius: '32px',
              padding: '30px',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              textAlign: 'center'
            }}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute', top: '20px', right: '20px',
                background: '#f3f4f6', border: 'none', borderRadius: '50%',
                width: '36px', height: '36px', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#4b5563'
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1f2937', marginBottom: '8px' }}>{title}</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>Quét mã để truy xuất thông tin phiếu</p>

            {/* QR Code Area */}
            <div 
              ref={qrRef}
              style={{
                background: 'white', padding: '24px', borderRadius: '24px',
                display: 'inline-block', border: '2px solid #f3f4f6',
                marginBottom: '20px'
              }}
            >
              <QRCodeCanvas 
                value={qrValue} 
                size={140}
                level="M"
                includeMargin={false}
              />
              <div style={{ marginTop: '16px', fontWeight: '800', fontSize: '24px', color: 'var(--primary-color, #7c5234)' }}>
                ID: {displayId}
              </div>
              {planName && (
                <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 'bold', color: '#1f2937' }}>
                  KHSX: {planName}
                </div>
              )}
              {partName && (
                <div style={{ marginTop: '4px', fontSize: '11px', color: '#6b7280' }}>
                  Chi tiết: {partName} - SL: {quantity}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                onClick={downloadImage}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '14px', borderRadius: '16px', background: '#f3f4f6',
                  color: '#1f2937', fontWeight: '700', border: 'none', cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                <Download size={18} /> Ảnh
              </button>
              <button
                onClick={exportPDF}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '14px', borderRadius: '16px', background: 'var(--primary-color, #7c5234)',
                  color: 'white', fontWeight: '700', border: 'none', cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                <FilePdf size={18} /> PDF
              </button>
            </div>
            
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                  onClick={handlePrint}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '14px', borderRadius: '16px', background: '#22c55e',
                    color: 'white', fontWeight: '700', border: 'none', cursor: 'pointer',
                    fontSize: '14px', boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)'
                  }}
                >
                  <Printer size={18} /> In Phiếu (Máy POS)
              </button>

              <button
                onClick={handlePrintFallback}
                style={{ 
                  fontSize: '11px', 
                  color: '#6b7280', 
                  background: 'none', 
                  border: 'none', 
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: '5px'
                }}
              >
                In bị lỗi? Thử chế độ sơ phòng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QRDisplayModal;
