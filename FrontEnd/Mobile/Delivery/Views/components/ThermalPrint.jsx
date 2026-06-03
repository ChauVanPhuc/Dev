import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

/**
 * MH12 - In nhiệt
 * Screen: ThermalPrint [ULTIMATE PRINT FIX]
 * Trang chuyên biệt dùng để in nhiệt khổ 58mm với cơ chế Blank Web Fallback.
 */
const ThermalPrint = () => {
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const printAreaRef = useRef(null);

  // Trích xuất dữ liệu an toàn
  const id = searchParams.get('id') || '';
  const title = searchParams.get('title') || 'PHIẾU BÀN GIAO';
  const planName = searchParams.get('planName') || '';
  const partName = searchParams.get('partName') || '';
  const total = searchParams.get('total') || '0';
  const status = searchParams.get('status') || '';
  const code = searchParams.get('code') || id;
  const mainOrder = searchParams.get('mainOrder') || '';
  const extraOrders = searchParams.get('extraOrders') || '';

  /**
   * handleManualPrint: Cơ chế in Blank Web (Fallback Strategy)
   * Giúp vượt qua việc Android WebView chặn window.print()
   */
  const handleManualPrint = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);

      if (window.AndroidPrint && window.AndroidPrint.printHtml) {
        
        // [ULTIMATE FIX] Xử lý Canvas (QR) sang Image vì WebView ngầm không tự vẽ
        const canvas = printAreaRef.current.querySelector('canvas');
        let printContent = printAreaRef.current.innerHTML;
        
        if (canvas) {
          const qrImageData = canvas.toDataURL('image/png');
          printContent = printContent.replace(/<canvas[^>]*>.*?<\/canvas>/i, `<img src="${qrImageData}" width="150" height="150" style="width: 150px; height: 150px; margin: 10px auto; display: block;" />`);
        }

        const styles = `
          <style>
            body { margin: 0; padding: 10px; display: flex; justify-content: center; align-items: flex-start; background: #fff; font-family: Arial, sans-serif; }
            .print-section { width: 58mm; text-align: center; color: #000; }
            .p-row { display: flex; justify-content: space-between; margin-bottom: 4px; border-bottom: 0.5px dashed #ccc; padding-bottom: 2px; }
            .p-label { font-size: 10px; color: #333; text-align: left; }
            .p-value { font-size: 11px; font-weight: bold; text-align: right; }
            img { max-width: 100%; height: auto; }
            * { box-sizing: border-box; }
          </style>
        `;
        
        const fullHtml = `<html><head>${styles}</head><body><div class="print-section">${printContent}</div></body></html>`;

        window.AndroidPrint.printHtml(fullHtml, `In_Phieu_G7_${id}`);
      } else {
        window.print();
      }
      
    } catch (e) {
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    try {
      window.close();
      window.history.back();
    } catch (e) {}
  };

  // Tự động kích hoạt in sau khi load
  useEffect(() => {
    if (id && !isProcessing) {
      const timer = setTimeout(() => {
        handleManualPrint();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [id]);

  if (!id) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2 style={{ color: '#ef4444' }}>Không tìm thấy mã phiếu!</h2>
        <p>Vui lòng quay lại và thử lại.</p>
        <button onClick={() => window.history.back()} style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', margin: 0, padding: 0 }}>
      {/* Styles defined safely */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          .print-section { box-shadow: none !important; margin: 0 !important; width: 48mm !important; }
          @page { margin: 0; size: 58mm auto; }
        }
        .p-row { display: flex; justify-content: space-between; margin-bottom: 5px; border-bottom: 0.5px dashed #ccc; padding-bottom: 3px; }
        .p-label { font-size: 11px; color: #333; text-align: left; }
        .p-value { font-size: 12px; font-weight: bold; text-align: right; }
      `}} />

      {/* Control UI - Chỉ hiện khi chưa in / đang xử lý */}
      <div className="no-print" style={{ 
        padding: '12px', backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100
      }}>
        <button onClick={handleClose} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', fontWeight: '600', fontSize: '13px' }}>
          <ArrowLeft size={16} /> Quay lại
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isProcessing && <Loader2 className="animate-spin" size={16} color="#22c55e" />}
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: isProcessing ? '#22c55e' : '#6b7280' }}>
            {isProcessing ? 'ĐANG TỰ ĐỘNG IN...' : 'XEM TRƯỚC BẢN IN'}
          </span>
        </div>
      </div>

      {/* Vùng chứa phiếu in - Sẽ được html2canvas chụp lại */}
      <div ref={printAreaRef} className="print-section" style={{
        width: '48mm', margin: '0 auto', padding: '5mm 2mm', textAlign: 'center',
        fontFamily: 'Arial, sans-serif', backgroundColor: '#fff', color: '#000'
      }}>
        <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '3px' }}>VINA G7 - SMART FLOW</div>
        
        <div style={{ fontSize: '15px', fontWeight: '900', margin: '8px 0', textTransform: 'uppercase', borderTop: '1.5px solid #000', borderBottom: '1.5px solid #000', padding: '4px 0' }}>
          {title}
        </div>

        <div style={{ margin: '3mm 0' }}>
          <QRCodeCanvas value={String(code)} size={140} level="M" includeMargin={false} />
        </div>

        <div style={{ fontSize: '18px', fontWeight: '900', marginBottom: '12px' }}>ID: {id}</div>

        <div style={{ textAlign: 'left', marginBottom: '4mm' }}>
          {status && <div className="p-row"><div className="p-label">Trạng thái:</div><div class="p-value">{status}</div></div>}
          {planName && <div className="p-row"><div className="p-label">Lệnh SX:</div><div class="p-value">{planName}</div></div>}
          {partName && <div className="p-row"><div className="p-label">Linh kiện:</div><div class="p-value">{partName}</div></div>}
          
          <div className="p-row" style={{ borderBottom: '1.5px solid #000', marginTop: '4px', paddingBottom: '6px' }}>
            <div className="p-label" style={{ fontSize: '13px', fontWeight: 'bold', color: '#000' }}>SL TỔNG:</div>
            <div className="p-value" style={{ fontSize: '22px', color: '#000' }}>{total}</div>
          </div>

          {mainOrder && (
            <div style={{ marginTop: '8px', borderBottom: '0.5px solid #f3f4f6', paddingBottom: '4px' }}>
              <div style={{ fontSize: '9px', color: '#666' }}>Đơn chính:</div>
              <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{mainOrder}</div>
            </div>
          )}

          {typeof extraOrders === 'string' && extraOrders.length > 0 && extraOrders !== 'null' && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '9px', color: '#666' }}>Đơn phụ:</div>
              <div style={{ fontSize: '10px', color: '#333' }}>
                {extraOrders.split(',').map((extra, idx) => (
                  <div key={idx} style={{ marginBottom: '2px' }}>• {extra.trim()}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ fontSize: '8px', color: '#666', marginTop: '15px', borderTop: '0.5px solid #eee', paddingTop: '2mm', fontStyle: 'italic' }}>
          In lúc: {new Date().toLocaleString('vi-VN')}
        </div>
      </div>
    </div>
  );
};

export default ThermalPrint;
