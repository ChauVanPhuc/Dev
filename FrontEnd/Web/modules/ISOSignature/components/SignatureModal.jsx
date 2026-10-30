import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Upload,
  AlertCircle
} from 'lucide-react';
import {
  DEPARTMENTS,
  CA_PROVIDERS,
  generateRandomSerial,
  generateSignatureHash,
  makeSignatureBackgroundTransparent
} from '../utils/signatureUtils';
import '../styles/isoSignature.css';

/**
 * Modal Thêm mới / Chỉnh sửa Chữ ký ISO:
 * 1. Thông tin nhân sự nằm TRÊN CÙNG (Họ tên, Mã NV, Phòng ban, Chức vụ).
 * 2. Mẫu chữ ký nằm BÊN DƯỚI với 3 lựa chọn không rườm rà:
 *    - Tải ảnh chữ ký tay (Mặc định tự động khử nền, nút Đổi/Xóa đưa lên trên)
 *    - Vẽ tay trên màn hình (Bảng vẽ to như Word/Paint, có chỗ Gõ chữ ký nghệ thuật, nhiều màu mực, header đồng bộ popup)
 *    - Chữ ký điện tử / CA (Tông màu gỗ chủ đạo, không màu tím)
 * 3. Trạng thái hoạt động & Ghi chú.
 */
export const SignatureModal = ({
  show = false,
  mode = 'create', // 'create' | 'edit'
  initialData = null,
  onClose,
  onSubmit,
  loading = false
}) => {
  // Loại chữ ký đang chọn: 'HANDWRITTEN_IMAGE' | 'HANDWRITTEN_DRAW' | 'DIGITAL'
  const [signatureType, setSignatureType] = useState('HANDWRITTEN_IMAGE');

  // 1. Thông tin nhân sự (Nằm trên cùng)
  const [fullName, setFullName] = useState('');
  const [userCode, setUserCode] = useState('');
  const [department, setDepartment] = useState('CL');
  const [position, setPosition] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');

  // 2. Dữ liệu cho Tải lên hình ảnh
  const [imagePreview, setImagePreview] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  // 3. Dữ liệu cho Bảng vẽ chữ ký to (Canvas Popup Modal như Word / Paint)
  const [isDrawPadOpen, setIsDrawPadOpen] = useState(false);
  const [drawPadMode, setDrawPadMode] = useState('draw'); // 'draw' | 'type'
  const [typedSignatureText, setTypedSignatureText] = useState('');
  const [typedFontFamily, setTypedFontFamily] = useState("'Dancing Script', cursive, sans-serif");
  const padCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#003399'); // Mực xanh mặc định
  const [penWidth, setPenWidth] = useState(3.2);
  const [hasCanvasStrokes, setHasCanvasStrokes] = useState(false);
  const [showGuideLine, setShowGuideLine] = useState(true);
  const strokeHistoryRef = useRef([]);

  // Bảng màu phong phú
  const PRESET_COLORS = [
    { color: '#003399', label: 'Xanh mực bút' },
    { color: '#1E40AF', label: 'Xanh navy' },
    { color: '#2563EB', label: 'Xanh tươi' },
    { color: '#111827', label: 'Đen' },
    { color: '#DC2626', label: 'Đỏ ký' },
    { color: '#991B1B', label: 'Đỏ đô' },
    { color: '#059669', label: 'Xanh lá' },
    { color: '#7C3AED', label: 'Tím than' },
    { color: '#7B5233', label: 'Nâu gỗ' }
  ];

  // 4. Dữ liệu cho Chữ ký điện tử / Chứng thư số (Tone màu gỗ)
  const [certProvider, setCertProvider] = useState('SmartFlow Corporate PKI');
  const [serialNo, setSerialNo] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [digitalHash, setDigitalHash] = useState('');

  // Lỗi form validation
  const [errorMsg, setErrorMsg] = useState('');

  // Đồng bộ dữ liệu khi modal mở hoặc thay đổi initialData
  useEffect(() => {
    if (!show) return;
    setErrorMsg('');
    setIsDrawPadOpen(false);

    if (mode === 'edit' && initialData) {
      setSignatureType(initialData.signature_type || 'HANDWRITTEN_IMAGE');
      setFullName(initialData.full_name || '');
      setTypedSignatureText(initialData.full_name || '');
      setUserCode(initialData.user_code || '');
      setDepartment(initialData.department || 'CL');
      setPosition(initialData.position || '');
      setIsActive(initialData.is_active !== undefined ? initialData.is_active : true);
      setNotes(initialData.notes || '');

      setImagePreview(initialData.signature_data || initialData.image_path || '');
      setCertProvider(initialData.digital_cert_provider || 'SmartFlow Corporate PKI');
      setSerialNo(initialData.digital_serial_no || '');
      setValidFrom(initialData.digital_valid_from || '');
      setValidTo(initialData.digital_valid_to || '');
      setDigitalHash(initialData.digital_hash || '');
    } else {
      // Khởi tạo mới: lấy thông tin từ session đăng nhập nếu có
      let defaultName = '';
      try {
        const uStr = localStorage.getItem('smartflow_user');
        if (uStr) {
          const u = JSON.parse(uStr);
          defaultName = u.full_name || u.name || '';
          setFullName(defaultName);
          setTypedSignatureText(defaultName);
          setUserCode(u.employee_code || u.username || '');
          setDepartment(u.department || 'CL');
          setPosition(u.role_name || u.position || 'Kiểm soát viên');
        } else {
          setFullName('');
          setTypedSignatureText('');
          setUserCode('');
          setDepartment('CL');
          setPosition('');
        }
      } catch {
        setFullName('');
        setTypedSignatureText('');
        setUserCode('');
        setDepartment('CL');
        setPosition('');
      }

      setSignatureType('HANDWRITTEN_IMAGE');
      setIsActive(true);
      setNotes('');
      setImagePreview('');
      setUploadedFile(null);

      // Mặc định chứng thư số
      setCertProvider('SmartFlow Corporate PKI');
      const today = new Date().toISOString().split('T')[0];
      const twoYearsLater = new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0];
      setValidFrom(today);
      setValidTo(twoYearsLater);
      setSerialNo(generateRandomSerial());
      setDigitalHash(generateSignatureHash());
    }
  }, [show, mode, initialData]);

  // Cập nhật text ký mặc định khi họ tên thay đổi nếu chưa gõ gì riêng
  useEffect(() => {
    if (fullName && !typedSignatureText) {
      setTypedSignatureText(fullName);
    }
  }, [fullName, typedSignatureText]);

  // Khởi tạo Canvas to khi mở DrawPad
  const initPadCanvas = useCallback(() => {
    const canvas = padCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;

    if (imagePreview) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasCanvasStrokes(true);
      };
      img.src = imagePreview;
    } else {
      setHasCanvasStrokes(false);
      strokeHistoryRef.current = [];
    }
  }, [penColor, penWidth, imagePreview]);

  useEffect(() => {
    if (isDrawPadOpen) {
      setTimeout(() => initPadCanvas(), 60);
    }
  }, [isDrawPadOpen, initPadCanvas]);

  // Vẽ chữ ký gõ chữ lên canvas
  const renderTypedSignatureOnCanvas = useCallback((text, font, color) => {
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!text || !text.trim()) {
      setHasCanvasStrokes(false);
      return;
    }

    const displayText = text.trim();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;

    // Tính toán kích thước font chữ phù hợp với chiều ngang bảng vẽ
    let fontSize = 48;
    ctx.font = `italic ${fontSize}px ${font}`;
    let measuredWidth = ctx.measureText(displayText).width;
    while (measuredWidth > rect.width * 0.8 && fontSize > 22) {
      fontSize -= 4;
      ctx.font = `italic ${fontSize}px ${font}`;
      measuredWidth = ctx.measureText(displayText).width;
    }

    const centerX = rect.width / 2;
    const centerY = (rect.height / 2) - 10;
    ctx.fillText(displayText, centerX, centerY);

    // Vẽ nét gạch chân chữ ký nghệ thuật
    ctx.beginPath();
    const halfWidth = measuredWidth / 2;
    const startX = centerX - halfWidth - 10;
    const endX = centerX + halfWidth + 18;
    const lineY = centerY + (fontSize / 2) + 6;
    ctx.moveTo(startX, lineY);
    ctx.quadraticCurveTo(centerX, lineY + 12, endX, lineY - 4);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    ctx.restore();
    setHasCanvasStrokes(true);

    try {
      const dpr = window.devicePixelRatio || 1;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      strokeHistoryRef.current = [imgData];
    } catch {}
  }, []);

  // Xử lý upload ảnh chữ ký tay (mặc định luôn tự động khử nền)
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg|webp|svg\+xml)$/i)) {
      setErrorMsg('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, SVG, WebP)!');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Dung lượng tệp không được vượt quá 5MB!');
      return;
    }

    setErrorMsg('');
    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64Data = ev.target?.result;
      if (typeof base64Data === 'string') {
        if (!file.type.includes('svg')) {
          try {
            // Mặc định luôn tự động khử nền trắng sang trong suốt
            const transparentData = await makeSignatureBackgroundTransparent(base64Data);
            setImagePreview(transparentData);
          } catch {
            setImagePreview(base64Data);
          }
        } else {
          setImagePreview(base64Data);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Canvas drawing handlers (Bảng vẽ to)
  const getPadCoords = (e) => {
    const canvas = padCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startPadDrawing = (e) => {
    e.preventDefault();
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPadCoords(e);

    setIsDrawing(true);
    setHasCanvasStrokes(true);
    ctx.beginPath();
    ctx.moveTo(x, y);

    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      strokeHistoryRef.current.push(imgData);
    } catch {}
  };

  const drawPad = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPadCoords(e);

    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopPadDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const handleClearPad = () => {
    const canvas = padCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasCanvasStrokes(false);
    strokeHistoryRef.current = [];
  };

  const handleUndoPad = () => {
    const canvas = padCanvasRef.current;
    if (!canvas || strokeHistoryRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    const previousState = strokeHistoryRef.current.pop();
    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
      if (strokeHistoryRef.current.length === 0) {
        setHasCanvasStrokes(false);
      }
    }
  };

  // Khi người dùng bấm "Chấp nhận" trên bảng vẽ to
  const handleAcceptDrawing = () => {
    const canvas = padCanvasRef.current;
    if (!canvas || !hasCanvasStrokes) {
      setErrorMsg('Vui lòng ký tên trên bảng vẽ trước khi chấp nhận!');
      return;
    }
    const signatureDataUrl = canvas.toDataURL('image/png');
    setImagePreview(signatureDataUrl);
    setIsDrawPadOpen(false);
    setErrorMsg('');
  };

  // Submit Form
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên nhân sự!');
      return;
    }

    if (signatureType === 'HANDWRITTEN_IMAGE' && !imagePreview) {
      setErrorMsg('Vui lòng tải lên hình ảnh mẫu chữ ký tay!');
      return;
    }

    if (signatureType === 'HANDWRITTEN_DRAW' && !imagePreview) {
      setErrorMsg('Vui lòng mở bảng vẽ và hoàn thành chữ ký điện tử!');
      return;
    }

    if (signatureType === 'DIGITAL') {
      if (!certProvider.trim()) {
        setErrorMsg('Vui lòng chọn đơn vị cung cấp chứng thư số!');
        return;
      }
      if (!serialNo.trim()) {
        setErrorMsg('Vui lòng nhập hoặc sinh số Serial chứng thư số!');
        return;
      }
    }

    const payload = {
      full_name: fullName.trim(),
      user_code: userCode.trim() || undefined,
      department: department || 'CL',
      position: position.trim() || undefined,
      approval_level: 'Cả hai',
      signature_type: signatureType,
      is_default: true,
      is_active: isActive,
      notes: notes.trim() || undefined
    };

    if (signatureType === 'HANDWRITTEN_IMAGE' || signatureType === 'HANDWRITTEN_DRAW') {
      payload.signature_data = imagePreview;
      payload.image_path = uploadedFile ? uploadedFile.name : undefined;
    } else if (signatureType === 'DIGITAL') {
      payload.digital_cert_provider = certProvider;
      payload.digital_serial_no = serialNo;
      payload.digital_valid_from = validFrom || undefined;
      payload.digital_valid_to = validTo || undefined;
      payload.digital_hash = digitalHash || generateSignatureHash();
      payload.signature_data = imagePreview || undefined;
    }

    if (onSubmit) {
      onSubmit(payload);
    }
  };

  if (!show) return null;

  return (
    <div className="iso-modal-backdrop" onClick={onClose}>
      <div
        className="iso-modal-content sig-modal-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '800px', borderRadius: '8px' }}
      >
        {/* HEADER - Tinh gọn, đồng bộ chuẩn SmartFlow popup */}
        <div className="iso-modal-header" style={{ padding: '14px 20px', borderBottom: '1px solid #EADCC9' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2D1A12' }}>
            {mode === 'edit' ? 'Chỉnh sửa Chữ ký ISO' : 'Thêm mới Chữ ký ISO'}
          </div>
          <button
            type="button"
            className="iso-modal-close-btn"
            onClick={onClose}
            disabled={loading}
            title="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL FORM */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="iso-modal-body" style={{ padding: '18px 22px', maxHeight: '76vh', overflowY: 'auto' }}>
            
            {/* ALERT ERROR */}
            {errorMsg && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '6px',
                  padding: '9px 12px',
                  color: '#991B1B',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '14px'
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. THÔNG TIN NHÂN SỰ NẰM TRÊN CÙNG */}
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2D1A12', borderBottom: '1px solid #EADCC9', paddingBottom: '6px', marginBottom: '12px' }}>
              Thông tin nhân sự
            </div>

            <div className="sig-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              {/* 1. Họ và tên người sở hữu */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#2D1A12', marginBottom: '4px' }}>
                  Họ và tên người sở hữu <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="iso-search-input"
                  placeholder="VD: Đặng Văn Nam, Lương Thị Thanh Tâm..."
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  style={{ paddingLeft: '12px', height: '36px' }}
                />
              </div>

              {/* 2. Mã nhân viên */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#2D1A12', marginBottom: '4px' }}>
                  Mã nhân viên
                </label>
                <input
                  type="text"
                  className="iso-search-input"
                  placeholder="VD: NV01, TP_QLCL, admin..."
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  style={{ paddingLeft: '12px', height: '36px' }}
                />
              </div>

              {/* 3. Phòng ban */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#2D1A12', marginBottom: '4px' }}>
                  Phòng ban
                </label>
                <select
                  className="iso-filter-select"
                  style={{
                    width: '100%',
                    height: '36px',
                    border: '1px solid #EADCC9',
                    borderRadius: '6px',
                    padding: '0 32px 0 12px',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.85rem',
                    color: '#2D1A12',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              {/* 4. Chức vụ */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#2D1A12', marginBottom: '4px' }}>
                  Chức vụ
                </label>
                <input
                  type="text"
                  className="iso-search-input"
                  placeholder="VD: Trưởng phòng QLCL, Tổng Giám Đốc..."
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  style={{ paddingLeft: '12px', height: '36px' }}
                />
              </div>
            </div>

            {/* 2. HÌNH THỨC & MẪU CHỮ KÝ NẰM BÊN DƯỚI */}
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2D1A12', borderBottom: '1px solid #EADCC9', paddingBottom: '6px', marginBottom: '12px' }}>
              Hình thức & Bản mẫu chữ ký
            </div>

            {/* 3 TAB CHỌN GỌN GÀNG, BỎ CHỮ RƯỜM RÀ & BỎ ICON */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => setSignatureType('HANDWRITTEN_IMAGE')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '6px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: signatureType === 'HANDWRITTEN_IMAGE' ? '1px solid #7B5233' : '1px solid #EADCC9',
                  backgroundColor: signatureType === 'HANDWRITTEN_IMAGE' ? '#7B5233' : '#FAF6F0',
                  color: signatureType === 'HANDWRITTEN_IMAGE' ? '#FFFFFF' : '#5D3E26',
                  transition: 'all 0.15s ease'
                }}
              >
                Tải ảnh chữ ký tay
              </button>

              <button
                type="button"
                onClick={() => setSignatureType('HANDWRITTEN_DRAW')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '6px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: signatureType === 'HANDWRITTEN_DRAW' ? '1px solid #7B5233' : '1px solid #EADCC9',
                  backgroundColor: signatureType === 'HANDWRITTEN_DRAW' ? '#7B5233' : '#FAF6F0',
                  color: signatureType === 'HANDWRITTEN_DRAW' ? '#FFFFFF' : '#5D3E26',
                  transition: 'all 0.15s ease'
                }}
              >
                Vẽ tay trên màn hình
              </button>

              <button
                type="button"
                onClick={() => setSignatureType('DIGITAL')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '6px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: signatureType === 'DIGITAL' ? '1px solid #7B5233' : '1px solid #EADCC9',
                  backgroundColor: signatureType === 'DIGITAL' ? '#7B5233' : '#FAF6F0',
                  color: signatureType === 'DIGITAL' ? '#FFFFFF' : '#5D3E26',
                  transition: 'all 0.15s ease'
                }}
              >
                Chữ ký điện tử / CA
              </button>
            </div>

            {/* VÙNG THAO TÁC CỤ THỂ CHO TỪNG TAB */}
            <div className="sig-workspace-box" style={{ marginBottom: '16px', background: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: '8px', padding: '14px' }}>
              
              {/* --- TAB 1: TẢI ẢNH CHỮ KÝ TAY --- */}
              {signatureType === 'HANDWRITTEN_IMAGE' && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    onChange={handleFileChange}
                  />

                  {!imagePreview ? (
                    <div
                      className="sig-dropzone"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ padding: '24px 16px', textAlign: 'center', border: '2px dashed #EADCC9', borderRadius: '8px', cursor: 'pointer', background: '#FAF6F0' }}
                    >
                      <Upload size={28} color="#7B5233" style={{ margin: '0 auto 6px auto', display: 'block' }} />
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#2D1A12' }}>
                        Nhấp vào đây hoặc kéo thả ảnh chữ ký vào vùng này
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#8D6E63', marginTop: '4px' }}>
                        Định dạng hỗ trợ: PNG, JPG, JPEG, SVG (Tự động khử nền trắng trong suốt)
                      </div>
                      <button
                        type="button"
                        className="iso-btn iso-btn-outline"
                        style={{ marginTop: '10px', fontSize: '0.78rem', padding: '5px 14px', background: '#FFFFFF' }}
                      >
                        Chọn tệp từ máy tính
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* ĐỂ NÚT THAO TÁC [ĐỔI ẢNH KHÁC] VÀ [XÓA ẢNH] LÊN TRÊN ĐẦU KHUNG MÔ PHỎNG */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#7B5233' }}>
                          Mẫu chữ ký đã nạp:
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="iso-btn iso-btn-outline"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ fontSize: '0.78rem', padding: '4px 12px', background: '#FFFFFF' }}
                          >
                            Đổi ảnh khác
                          </button>
                          <button
                            type="button"
                            className="iso-btn iso-btn-outline"
                            onClick={() => {
                              setImagePreview('');
                              setUploadedFile(null);
                            }}
                            style={{ fontSize: '0.78rem', padding: '4px 12px', color: '#DC2626', borderColor: '#FECACA', background: '#FFFFFF' }}
                          >
                            Xóa ảnh
                          </button>
                        </div>
                      </div>

                      {/* KHUNG MÔ PHỎNG KÝ TRÊN BIỂU MẪU */}
                      <div className="sig-paper-box" style={{ margin: '0 auto', maxWidth: '420px', padding: '16px', background: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: '6px' }}>
                        <div className="sig-paper-header" style={{ fontSize: '0.74rem', fontWeight: 700, color: '#7B5233', borderBottom: '1px dashed #D5C2AF', paddingBottom: '6px', marginBottom: '10px', textAlign: 'center' }}>
                          Mô phỏng chữ ký
                        </div>
                        <div className="sig-paper-body" style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '0.74rem', color: '#6B7280', display: 'block', marginBottom: '4px' }}>Người phê duyệt:</span>
                          <img
                            src={imagePreview}
                            alt="Ký mô phỏng"
                            style={{ maxHeight: '75px', maxWidth: '240px', objectFit: 'contain', margin: '4px auto', display: 'block' }}
                          />
                          <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#2D1A12', marginTop: '4px' }}>
                            {fullName || 'Chưa nhập họ tên'}
                          </div>
                          {position && (
                            <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{position}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* --- TAB 2: VẼ TAY TRÊN MÀN HÌNH (MỞ BẢNG TO NHƯ WORD / PAINT) --- */}
              {signatureType === 'HANDWRITTEN_DRAW' && (
                <div>
                  {imagePreview ? (
                    <div>
                      {/* ĐỂ NÚT THAO TÁC LÊN TRÊN */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#7B5233' }}>
                          Mẫu chữ ký vẽ tay:
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="iso-btn iso-btn-primary"
                            onClick={() => setIsDrawPadOpen(true)}
                            style={{ fontSize: '0.78rem', padding: '4px 12px', backgroundColor: '#7B5233', color: '#FFFFFF' }}
                          >
                            Mở bảng vẽ lại
                          </button>
                          <button
                            type="button"
                            className="iso-btn iso-btn-outline"
                            onClick={() => {
                              setImagePreview('');
                              setHasCanvasStrokes(false);
                            }}
                            style={{ fontSize: '0.78rem', padding: '4px 12px', color: '#DC2626', borderColor: '#FECACA', background: '#FFFFFF' }}
                          >
                            Xóa chữ ký
                          </button>
                        </div>
                      </div>

                      {/* KHUNG MÔ PHỎNG */}
                      <div className="sig-paper-box" style={{ margin: '0 auto', maxWidth: '420px', padding: '16px', background: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: '6px' }}>
                        <div className="sig-paper-header" style={{ fontSize: '0.74rem', fontWeight: 700, color: '#7B5233', borderBottom: '1px dashed #D5C2AF', paddingBottom: '6px', marginBottom: '10px', textAlign: 'center' }}>
                          Mô phỏng chữ ký
                        </div>
                        <div className="sig-paper-body" style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '0.74rem', color: '#6B7280', display: 'block', marginBottom: '4px' }}>Người phê duyệt:</span>
                          <img
                            src={imagePreview}
                            alt="Ký mô phỏng"
                            style={{ maxHeight: '75px', maxWidth: '240px', objectFit: 'contain', margin: '4px auto', display: 'block' }}
                          />
                          <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#2D1A12', marginTop: '4px' }}>
                            {fullName || 'Chưa nhập họ tên'}
                          </div>
                          {position && (
                            <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{position}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setIsDrawPadOpen(true)}
                      style={{
                        padding: '30px 16px',
                        textAlign: 'center',
                        border: '2px dashed #EADCC9',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: '#FAF6F0'
                      }}
                    >
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#7B5233' }}>
                        Chưa có nét ký vẽ trực tiếp
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#8D6E63', marginTop: '4px', marginBottom: '10px' }}>
                        Nhấp vào đây để mở bảng vẽ to như Word/Paint (hỗ trợ vẽ tay, gõ chữ ký và chọn nhiều màu mực)
                      </div>
                      <button
                        type="button"
                        className="iso-btn iso-btn-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDrawPadOpen(true);
                        }}
                        style={{ fontSize: '0.8rem', padding: '6px 16px', backgroundColor: '#7B5233', color: '#FFFFFF' }}
                      >
                        Mở bảng ký vẽ ngay
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* --- TAB 3: CHỮ KÝ ĐIỆN TỬ / CA (TÔNG MÀU GỖ CHỦ ĐẠO) --- */}
              {signatureType === 'DIGITAL' && (
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#7B5233', marginBottom: '10px' }}>
                    Thông số chứng thư số điện tử (PKI)
                  </div>

                  <div className="sig-digital-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#2D1A12', marginBottom: '4px' }}>
                        Đơn vị cấp chứng thư số <span style={{ color: '#DC2626' }}>*</span>
                      </label>
                      <select
                        className="iso-filter-select"
                        style={{
                          width: '100%',
                          height: '36px',
                          border: '1px solid #EADCC9',
                          borderRadius: '6px',
                          padding: '0 32px 0 12px',
                          backgroundColor: '#FFFFFF',
                          fontSize: '0.85rem',
                          color: '#2D1A12',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                        value={certProvider}
                        onChange={(e) => setCertProvider(e.target.value)}
                      >
                        {CA_PROVIDERS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2D1A12' }}>
                          Số Serial chứng thư <span style={{ color: '#DC2626' }}>*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setSerialNo(generateRandomSerial())}
                          style={{ border: 'none', background: 'transparent', color: '#7B5233', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Tạo mã Serial
                        </button>
                      </div>
                      <input
                        type="text"
                        className="iso-search-input"
                        placeholder="VD: 54:02:FA:7E:99:20:26:01"
                        value={serialNo}
                        onChange={(e) => setSerialNo(e.target.value)}
                        style={{ paddingLeft: '12px', height: '36px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#2D1A12', marginBottom: '4px' }}>
                        Hiệu lực từ ngày
                      </label>
                      <input
                        type="date"
                        className="iso-search-input"
                        value={validFrom}
                        onChange={(e) => setValidFrom(e.target.value)}
                        style={{ paddingLeft: '12px', height: '36px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#2D1A12', marginBottom: '4px' }}>
                        Hiệu lực đến ngày
                      </label>
                      <input
                        type="date"
                        className="iso-search-input"
                        value={validTo}
                        onChange={(e) => setValidTo(e.target.value)}
                        style={{ paddingLeft: '12px', height: '36px' }}
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2D1A12' }}>
                          Mã băm xác thực bảo mật SHA-256
                        </label>
                        <button
                          type="button"
                          onClick={() => setDigitalHash(generateSignatureHash())}
                          style={{ border: 'none', background: 'transparent', color: '#7B5233', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Sinh lại mã băm
                        </button>
                      </div>
                      <input
                        type="text"
                        className="iso-search-input"
                        value={digitalHash}
                        onChange={(e) => setDigitalHash(e.target.value)}
                        style={{ paddingLeft: '12px', fontFamily: 'monospace', fontSize: '0.78rem', height: '36px' }}
                      />
                    </div>
                  </div>

                  {/* KHUNG CON DẤU ĐIỆN TỬ - TÔNG MÀU GỖ CHỦ ĐẠO (KHÔNG MÀU TÍM) */}
                  <div style={{ maxWidth: '440px', margin: '10px auto 0 auto', padding: '14px', background: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#7B5233', borderBottom: '1px dashed #D5C2AF', paddingBottom: '6px', marginBottom: '8px' }}>
                      MẪU CON DẤU ĐIỆN TỬ (PKI SIGNATURE)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: '#4E342E' }}>
                      <div>Người ký duyệt: <b>{fullName || 'Chưa nhập họ tên'}</b></div>
                      <div>Đơn vị CA: <b>{certProvider}</b></div>
                      <div>Số Serial: <b>{serialNo || '---'}</b></div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', background: '#F3EDE4', padding: '3px 6px', borderRadius: '4px', wordBreak: 'break-all', marginTop: '4px' }}>
                        {digitalHash || 'SHA256:AUTHENTICATED_ISO'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. TRẠNG THÁI HOẠT ĐỘNG & GHI CHÚ */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#FAF6F0', borderRadius: '6px', border: '1px solid #EADCC9', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2D1A12' }}>Trạng thái hoạt động</div>
                <div style={{ fontSize: '0.74rem', color: '#8D6E63' }}>Cho phép sử dụng chữ ký này khi ký duyệt văn bản, quy trình ISO</div>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#2D1A12' }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#059669' }}
                />
                <span>Kích hoạt sử dụng</span>
              </label>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#2D1A12', marginBottom: '4px' }}>
                Ghi chú
              </label>
              <textarea
                className="iso-search-input"
                rows={2}
                placeholder="Nhập ghi chú áp dụng (tùy chọn)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ padding: '8px 12px', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* FOOTER */}
          <div className="iso-modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #EADCC9', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#FAF6F0' }}>
            <button
              type="button"
              className="iso-btn iso-btn-outline"
              onClick={onClose}
              disabled={loading}
              style={{ fontSize: '0.82rem', padding: '6px 16px', background: '#FFFFFF' }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="iso-btn iso-btn-primary"
              disabled={loading}
              style={{ fontSize: '0.82rem', padding: '6px 18px', backgroundColor: '#7B5233', color: '#FFFFFF' }}
            >
              {loading ? 'Đang lưu...' : mode === 'edit' ? 'Cập nhật chữ ký' : 'Lưu chữ ký'}
            </button>
          </div>
        </form>
      </div>

      {/* =========================================================================
          POPUP BẢNG KÝ VẼ TAY RỘNG RÃI (NHƯ PAINT / WORD)
          - Heading đồng bộ phong cách các popup khác (#FFFFFF, border #EADCC9)
          - Có chỗ Gõ chữ ký nghệ thuật (Type Signature)
          - Chọn nhiều màu mực phong phú kèm Color Picker
          - Nét bút chuẩn, có nút Chấp nhận
          ========================================================================= */}
      {isDrawPadOpen && (
        <div
          className="iso-modal-backdrop"
          style={{ zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setIsDrawPadOpen(false)}
        >
          <div
            className="iso-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '92vw', maxWidth: '860px', backgroundColor: '#FFFFFF', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}
          >
            {/* DrawPad Header - Đồng bộ hoàn toàn với các popup khác (nền trắng, viền dưới, chữ đậm) */}
            <div className="iso-modal-header" style={{ padding: '14px 20px', borderBottom: '1px solid #EADCC9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2D1A12' }}>
                Bảng ký tên điện tử cảm ứng / chuột
              </div>
              <button
                type="button"
                className="iso-modal-close-btn"
                onClick={() => setIsDrawPadOpen(false)}
                title="Đóng bảng vẽ"
              >
                <X size={18} />
              </button>
            </div>

            {/* Thanh công cụ 2 chế độ: Vẽ tay (Bút) HOẶC Nhập chữ ký */}
            <div style={{ padding: '8px 18px', background: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setDrawPadMode('draw')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: drawPadMode === 'draw' ? '1px solid #7B5233' : '1px solid #D1C7BD',
                    backgroundColor: drawPadMode === 'draw' ? '#7B5233' : '#FFFFFF',
                    color: drawPadMode === 'draw' ? '#FFFFFF' : '#5D3E26'
                  }}
                >
                  Vẽ tự do (Chuột / Bút)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawPadMode('type');
                    renderTypedSignatureOnCanvas(typedSignatureText || fullName, typedFontFamily, penColor);
                  }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: drawPadMode === 'type' ? '1px solid #7B5233' : '1px solid #D1C7BD',
                    backgroundColor: drawPadMode === 'type' ? '#7B5233' : '#FFFFFF',
                    color: drawPadMode === 'type' ? '#FFFFFF' : '#5D3E26'
                  }}
                >
                  Nhập chữ ký (Gõ tên)
                </button>
              </div>

              {/* Thao tác Hỗ trợ: Dòng kẻ, Hoàn tác, Xóa */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowGuideLine(!showGuideLine)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid #CBD5E1',
                    background: showGuideLine ? '#EFF6FF' : '#FFFFFF',
                    color: showGuideLine ? '#1D4ED8' : '#64748B'
                  }}
                >
                  {showGuideLine ? 'Ẩn dòng kẻ' : 'Hiện dòng kẻ'}
                </button>

                <button
                  type="button"
                  onClick={handleUndoPad}
                  disabled={!hasCanvasStrokes}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid #D1C7BD',
                    background: '#FFFFFF',
                    color: '#4E342E'
                  }}
                >
                  Hoàn tác
                </button>

                <button
                  type="button"
                  onClick={handleClearPad}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid #FECACA',
                    background: '#FFFFFF',
                    color: '#DC2626'
                  }}
                >
                  Xóa nét
                </button>
              </div>
            </div>

            {/* Thanh chọn Mực & Nét / Font chữ ký */}
            <div style={{ padding: '8px 18px', background: '#FFFFFF', borderBottom: '1px solid #F0E6D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              
              {/* CHỌN MÀU MỰC: NHIỀU MÀU PHONG PHÚ + COLOR PICKER TÙY CHỌN */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5D3E26' }}>Mực:</span>
                {PRESET_COLORS.map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => {
                      setPenColor(item.color);
                      if (drawPadMode === 'type') {
                        renderTypedSignatureOnCanvas(typedSignatureText || fullName, typedFontFamily, item.color);
                      }
                    }}
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: item.color,
                      border: penColor === item.color ? '2px solid #7B5233' : '1px solid #D1C7BD',
                      boxShadow: penColor === item.color ? '0 0 0 2px #7B5233' : 'none',
                      cursor: 'pointer'
                    }}
                    title={item.label}
                  />
                ))}

                {/* Color picker tùy ý */}
                <label style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '4px', cursor: 'pointer' }} title="Chọn màu mực khác...">
                  <input
                    type="color"
                    value={penColor}
                    onChange={(e) => {
                      setPenColor(e.target.value);
                      if (drawPadMode === 'type') {
                        renderTypedSignatureOnCanvas(typedSignatureText || fullName, typedFontFamily, e.target.value);
                      }
                    }}
                    style={{ width: '24px', height: '24px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  />
                </label>
              </div>

              {/* TÙY CHỌN THEO CHẾ ĐỘ: NÉT VẼ HOẶC Ô NHẬP CHỮ KÝ */}
              {drawPadMode === 'draw' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5D3E26' }}>Cỡ nét:</span>
                  {[
                    { width: 1.8, label: 'Mảnh' },
                    { width: 3.2, label: 'Vừa' },
                    { width: 5.0, label: 'Đậm' },
                    { width: 7.0, label: 'Rất đậm' }
                  ].map((item) => (
                    <button
                      key={item.width}
                      type="button"
                      onClick={() => setPenWidth(item.width)}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '4px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: penWidth === item.width ? '1px solid #7B5233' : '1px solid #D1C7BD',
                        backgroundColor: penWidth === item.width ? '#7B5233' : '#FFFFFF',
                        color: penWidth === item.width ? '#FFFFFF' : '#4E342E'
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : (
                /* CHẾ ĐỘ NHẬP CHỮ KÝ (GÕ TÊN) */
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5D3E26' }}>Nhập tên:</span>
                  <input
                    type="text"
                    className="iso-search-input"
                    value={typedSignatureText}
                    onChange={(e) => {
                      setTypedSignatureText(e.target.value);
                      renderTypedSignatureOnCanvas(e.target.value, typedFontFamily, penColor);
                    }}
                    placeholder="Gõ tên để tạo chữ ký..."
                    style={{ width: '180px', height: '30px', padding: '0 8px', fontSize: '0.8rem' }}
                  />
                  <select
                    className="iso-filter-select"
                    style={{ height: '30px', fontSize: '0.78rem' }}
                    value={typedFontFamily}
                    onChange={(e) => {
                      setTypedFontFamily(e.target.value);
                      renderTypedSignatureOnCanvas(typedSignatureText || fullName, e.target.value, penColor);
                    }}
                  >
                    <option value="'Dancing Script', cursive, sans-serif">Chữ ký viết tay mềm mại</option>
                    <option value="'Great Vibes', cursive, serif">Chữ ký thư pháp nghiêng</option>
                    <option value="'Caveat', cursive, sans-serif">Chữ ký phóng khoáng</option>
                    <option value="'Brush Script MT', cursive, sans-serif">Chữ ký cọ mực Brush</option>
                  </select>
                </div>
              )}
            </div>

            {/* Vùng Canvas Vẽ Chữ Ký To Rộng Rãi */}
            <div style={{ position: 'relative', width: '100%', height: '340px', backgroundColor: '#FFFFFF', cursor: 'crosshair', userSelect: 'none' }}>
              <canvas
                ref={padCanvasRef}
                style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
                onMouseDown={startPadDrawing}
                onMouseMove={drawPad}
                onMouseUp={stopPadDrawing}
                onMouseLeave={stopPadDrawing}
                onTouchStart={startPadDrawing}
                onTouchMove={drawPad}
                onTouchEnd={stopPadDrawing}
              />
              {showGuideLine && (
                <div
                  style={{
                    position: 'absolute',
                    left: '5%',
                    right: '5%',
                    top: '68%',
                    height: '1px',
                    borderBottom: '1px dashed #CBD5E1',
                    pointerEvents: 'none'
                  }}
                />
              )}
              {!hasCanvasStrokes && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#CBD5E1',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    pointerEvents: 'none',
                    textAlign: 'center'
                  }}
                >
                  {drawPadMode === 'draw' ? 'Ký tên tại đây bằng chuột hoặc bút cảm ứng...' : 'Gõ họ tên ở thanh trên để tạo mẫu chữ ký...'}
                </div>
              )}
            </div>

            {/* DrawPad Footer: Nút Chấp nhận & Hủy */}
            <div style={{ padding: '12px 20px', background: '#FAF6F0', borderTop: '1px solid #EADCC9', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="iso-btn iso-btn-outline"
                onClick={() => setIsDrawPadOpen(false)}
                style={{ fontSize: '0.82rem', padding: '6px 16px', background: '#FFFFFF' }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="iso-btn iso-btn-primary"
                onClick={handleAcceptDrawing}
                style={{ fontSize: '0.82rem', padding: '6px 20px', backgroundColor: '#7B5233', color: '#FFFFFF', fontWeight: 700 }}
              >
                Chấp nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignatureModal;
