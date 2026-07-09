import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Zap, ZapOff, Keyboard, Search, AlertCircle } from 'lucide-react';


/**
 * Component QRScanner
 * Quét mã QR và hỗ trợ nhập mã thủ công cho ERP G7.
 */
const QRScanner = ({ isOpen, onClose, onResult }) => {
  const html5QrCodeRef = useRef(null);
  const [error, setError] = useState(null);
  const [isManual, setIsManual] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    if (isOpen && !isManual) {
      const startScanner = async () => {
        try {
          const html5QrCode = new Html5Qrcode("qr-reader");
          html5QrCodeRef.current = html5QrCode;

          const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          };

          await html5QrCode.start(
            { facingMode: "environment" }, 
            config, 
            (decodedText) => {
              onResult(decodedText);
              stopScanner();
            }
          );
          setError(null);
        } catch (err) {
          setError("Không thể truy cập Camera. Vui lòng kiểm tra quyền hoặc nhập mã thủ công.");
          setIsManual(true); // Tự động chuyển sang nhập tay nếu lỗi camera
        }
      };

      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, isManual, onResult]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
      }
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onResult(manualCode.trim());
    }
  };

  const toggleTorch = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        try {
            const track = html5QrCodeRef.current.getRunningTrack();
            if (track.getCapabilities().torch) {
                await track.applyConstraints({
                    advanced: [{ torch: !torchOn }]
                });
                setTorchOn(!torchOn);
            }
        } catch (err) {
        }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: '#000', zIndex: 10000,
            display: 'flex', flexDirection: 'column', color: 'white', overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
            padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)'
          }}>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', padding: '10px', color: 'white' }}>
              <X size={24} />
            </button>
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{isManual ? "Nhập mã thủ công" : "Quét mã QR"}</h3>
            <button 
              onClick={() => {
                  setIsManual(!isManual);
                  if (!isManual) stopScanner();
              }}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', padding: '10px', color: 'white' }}
            >
              {isManual ? <Camera size={24} /> : <Keyboard size={24} />}
            </button>
          </div>

          {/* Camera View / Manual Entry */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            {!isManual ? (
              <>
                <style dangerouslySetInnerHTML={{ __html: `
                  #qr-reader video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                  }
                  #qr-reader {
                    width: 100% !important;
                    height: 100% !important;
                  }
                `}} />
                <div id="qr-reader"></div>
                
                {/* Overlays - Căn giữa tuyệt đối bằng transform */}
                <div style={{ 
                    position: 'absolute', 
                    width: '260px', 
                    height: '260px', 
                    pointerEvents: 'none',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 5
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '40px', borderTop: '4px solid white', borderLeft: '4px solid white', borderTopLeftRadius: '24px' }}></div>
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', borderTop: '4px solid white', borderRight: '4px solid white', borderTopRightRadius: '24px' }}></div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '40px', height: '40px', borderBottom: '4px solid white', borderLeft: '4px solid white', borderBottomLeftRadius: '24px' }}></div>
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40px', height: '40px', borderBottom: '4px solid white', borderRight: '4px solid white', borderBottomRightRadius: '24px' }}></div>
                  
                  <div
                    style={{ position: 'absolute', left: '10%', right: '10%', top: '50%', height: '1px', background: 'rgba(255,255,255,0.5)', boxShadow: '0 0 8px #fff' }}
                  />
                </div>

                <div style={{ position: 'absolute', bottom: '80px', width: '100%', textAlign: 'center', padding: '0 40px', zIndex: 10 }}>
                  <p style={{ fontSize: '14px', opacity: 0.9, textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontWeight: '600' }}>
                    Căn chỉnh mã QR vào giữa khung để quét
                  </p>
                </div>

                <button 
                  onClick={toggleTorch}
                  style={{ position: 'absolute', bottom: '150px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '56px', height: '56px', color: 'white' }}
                >
                  {torchOn ? <ZapOff size={24} /> : <Zap size={24} />}
                </button>
              </>
            ) : (
              <div 
                style={{ width: '100%', maxWidth: '320px', padding: '20px', textAlign: 'center' }}
              >
                {error && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '12px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' }}>
                    <AlertCircle size={18} /> {error}
                  </div>
                )}
                <h4 style={{ marginBottom: '20px' }}>Nhập mã phiếu giao hàng</h4>
                <form onSubmit={handleManualSubmit}>
                  <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <input
                      type="text"
                      placeholder="Ví dụ: 12345"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      autoFocus
                      style={{
                        width: '100%', padding: '16px 45px 16px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.3)',
                        background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '16px', outline: 'none'
                      }}
                    />
                    <Search size={20} style={{ position: 'absolute', right: '16px', top: '16px', opacity: 0.5 }} />
                  </div>
                  <button
                    type="submit"
                    style={{
                      width: '100%', padding: '16px', borderRadius: '16px', background: 'var(--primary-color, #78523b)',
                      color: 'white', fontWeight: '700', border: 'none', cursor: 'pointer'
                    }}
                  >
                    Xác nhận tìm kiếm
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default QRScanner;
