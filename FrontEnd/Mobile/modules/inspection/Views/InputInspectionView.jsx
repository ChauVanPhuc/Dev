import { useState, useRef, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import { Camera, CheckCircle2, XCircle, X, Loader2 } from 'lucide-react'
import useAuthStore from '@modules/auth/Models/authModel'
import apiClient, { API_ROOT } from '@shared/services/api'
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal'
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal'

/**
 * MH2.4 - Kiểm tra đầu vào
 * InputInspection Screen
 * - viewOnly = false (mặc định): form nhập KT mới
 * - viewOnly = true: xem lại kết quả, cùng layout nhưng disabled
 */
const InputInspection = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()

  const { 
    partName = '', 
    planId = '', 
    viewOnly = false, 
    inspection = null, 
    stage = '',
    contName = '',
    specifications = [],
    inspections = []
  } = location.state || {}

  // Danh sách quy cách hỗ trợ hiển thị — hỗ trợ cả format cũ (string) và mới ({spec, orderNames})
  const specList = useMemo(() => {
    const raw = [...(specifications || [])].filter(Boolean)
    const list = raw.map(item => {
      if (typeof item === 'string') return { spec: item, orderNames: [] }
      return { spec: item.spec, orderNames: item.orderNames || [] }
    })
    if (viewOnly && inspection?.specification) {
      const exists = list.some(s => s.spec === inspection.specification)
      if (!exists) list.push({ spec: inspection.specification, orderNames: [] })
    }
    return list
  }, [specifications, viewOnly, inspection])

  // Khởi tạo quy cách đã chọn. Tự động chọn nếu chỉ có duy nhất 1 quy cách
  const [selectedSpec, setSelectedSpec] = useState(() => {
    if (viewOnly) return inspection?.specification ?? ''
    return specList.length === 1 ? specList[0].spec : ''
  })

  // Lấy danh sách Cont của quy cách đang chọn
  const selectedSpecObj = useMemo(() => {
    return specList.find(s => s.spec === selectedSpec)
  }, [specList, selectedSpec])

  const specOrderNames = selectedSpecObj?.orderNames || []

  // Nhóm các PO/Cont chi tiết về dạng APT-(số chung), ví dụ APT-0060, APT-0073
  const commonContNames = useMemo(() => {
    const list = specOrderNames.map(name => {
      if (!name) return '';
      const parts = name.split('-');
      return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : name;
    }).filter(Boolean);
    return Array.from(new Set(list));
  }, [specOrderNames])

  const [chosenCont, setChosenCont] = useState('')

  // Tự động gán/reset chosenCont khi thay đổi quy cách chọn
  useEffect(() => {
    if (!viewOnly) {
      if (commonContNames.length === 1) {
        setChosenCont(commonContNames[0])
      } else {
        setChosenCont('')
      }
    }
  }, [commonContNames, viewOnly])

  // Form state — khi viewOnly thì khởi tạo từ inspection
  const [length, setLength] = useState(viewOnly ? (inspection?.measured_length ?? '') : '')
  const [width, setWidth]   = useState(viewOnly ? (inspection?.measured_width  ?? '') : '')
  const [height, setHeight] = useState(viewOnly ? (inspection?.measured_height ?? '') : '')
  const [result, setResult] = useState(viewOnly ? (inspection?.result ?? '') : '')
  const [note, setNote]     = useState(viewOnly ? (inspection?.note ?? '') : '')
  const [loading, setLoading] = useState(false)
  const [compressing, setCompressing] = useState(false) // Trạng thái nén ảnh
  const [error, setError]   = useState('')
  const [isConfirmOpen, setIsConfirmOpen] = useState(false) // [NEW] Popup xác nhận lưu kết quả
  const [messageModal, setMessageModal] = useState({ isOpen: false, type: 'success', title: '', message: '' })

  // Chỉ dùng khi không viewOnly
  const [images, setImages] = useState([])
  const [previews, setPreviews] = useState([])
  const fileInputRef = useRef(null)

  // Ảnh hiện có (khi viewOnly)
  const existingImages = viewOnly
    ? [inspection?.image_path_1, inspection?.image_path_2, inspection?.image_path_3].filter(Boolean)
    : []

  const getFullImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const root = API_ROOT.endsWith('/') ? API_ROOT.slice(0, -1) : API_ROOT;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${root}${cleanPath}`;
  }

  // Nén ảnh để giảm dung lượng trước khi upload
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            const newFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(newFile);
          }, 'image/jpeg', 0.7); // Giảm chất lượng còn 70%
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImagePick = async (e) => {
    const files = Array.from(e.target.files || [])
    const picked = files.slice(0, 3 - images.length)
    if (!picked.length) return

    setCompressing(true);
    const compressedFiles = await Promise.all(picked.map(f => compressImage(f)));
    setCompressing(false);

    setImages(prev => [...prev, ...compressedFiles])
    setPreviews(prev => [...prev, ...compressedFiles.map(f => URL.createObjectURL(f))])
    e.target.value = ''
  }

  const removeImage = (i) => {
    setImages(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const triggerSubmitConfirm = () => {
    if (specList.length > 0 && !selectedSpec) {
      setError('Vui lòng chọn Quy cách cần kiểm tra.')
      return
    }
    if (!contName && commonContNames.length > 1 && !chosenCont) {
      setError('Vui lòng chọn Container thực hiện kiểm tra.')
      return
    }
    if (!result) { setError('Vui lòng chọn Đạt hoặc Không đạt.'); return }
    setError('')
    setIsConfirmOpen(true)
  }

  const handleSubmit = async () => {
    setIsConfirmOpen(false)
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('plan_id', planId)
      fd.append('part_name', partName)
      if (selectedSpec) fd.append('specification', selectedSpec)
      
      const finalContName = contName || chosenCont
      if (finalContName) fd.append('cont_name', finalContName)
      
      if (stage) fd.append('stage', stage)
      if (user?.id) fd.append('inspector_id', user.id)
      fd.append('result', result)
      if (length)  fd.append('measured_length', length)
      if (width)   fd.append('measured_width', width)
      if (height)  fd.append('measured_height', height)
      if (note)    fd.append('note', note)
      images.forEach(f => fd.append('files', f))
      await apiClient.post('/inspections/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      
      setMessageModal({
        isOpen: true,
        type: 'success',
        title: 'Thành công',
        message: 'Đã lưu kết quả kiểm tra đầu vào thành công!'
      })
    } catch (err) {
      setMessageModal({
        isOpen: true,
        type: 'error',
        title: 'Lỗi',
        message: 'Lỗi khi lưu kết quả: ' + (err.response?.data?.detail || err.message || 'Vui lòng thử lại.')
      })
    } finally {
      setLoading(false)
    }
  }

  // ─── Styles ────────────────────────────────────────────────────────────────
  const card = {
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: '12px 14px',
    marginBottom: '10px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    border: '1px solid #f1f5f9'
  }

  const sectionLabel = {
    fontSize: '0.72rem',
    fontWeight: '800',
    color: '#78523b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
    display: 'block'
  }

  const inputBase = {
    width: '100%',
    padding: '9px 10px',
    borderRadius: '10px',
    border: '1.5px solid #e2e8f0',
    backgroundColor: viewOnly ? '#f1f5f9' : '#fafafa',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: viewOnly ? '#64748b' : '#1e293b',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: viewOnly ? 'not-allowed' : 'text'
  }

  return (
    <Layout>
      <PageHeader
        title="G7 - Smart Flow"
        subTitle={viewOnly ? 'MB2.4 | Kết quả kiểm tra' : 'MB2.4 | Kiểm tra đầu vào'}
      />

      <div className="page-content" style={{ padding: '12px', flex: 1, backgroundColor: 'var(--bg-cream)', overflowY: 'auto' }}>

        {/* Header chi tiết */}
        <div id="input-info-card" style={{ ...card, background: 'linear-gradient(135deg, #4a2c1d 0%, #78523b 100%)', border: 'none', padding: '12px 16px', marginBottom: '10px' }}>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.65)', fontWeight: '700', letterSpacing: '0.5px' }}>
            {viewOnly ? 'CHI TIẾT ĐÃ KIỂM TRA' : 'CHI TIẾT KIỂM TRA'}
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#fff', marginTop: '2px' }}>
            {partName || 'Không xác định'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', fontWeight: '600' }}>
              KHSX #{planId} {(contName || inspection?.cont_name || chosenCont) ? ` | Cont: ${contName || inspection?.cont_name || chosenCont}` : ''}
            </div>
            {viewOnly && inspection?.inspected_at && (
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', fontWeight: '600' }}>
                {new Date(inspection.inspected_at).toLocaleString('vi-VN')}
              </div>
            )}
          </div>
        </div>

        {/* Chọn Quy cách */}
        {specList.length > 0 && (
          <div id="input-specifications-card" style={card}>
            <span style={sectionLabel}>📐 Chọn Quy cách</span>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              gap: '8px',
              maxHeight: '175px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {specList.map(({ spec, orderNames }) => {
                const isSelected = selectedSpec === spec
                // Đếm số lần quy cách này đã được kiểm tra từ trước
                const count = (inspections || []).filter(insp => 
                  (insp.specification || '').trim().toLowerCase() === spec.trim().toLowerCase()
                ).length

                // Trích Cont number từ order name (VD: "APT-0073" → "73")
                const contLabels = Array.from(
                  new Set(
                    (orderNames || []).map(name => {
                      const parts = name.split('-')
                      return parts.length >= 2 ? parseInt(parts[1], 10) || parts[1] : name
                    })
                  )
                )

                return (
                  <button
                    key={spec}
                    type="button"
                    disabled={viewOnly}
                    onClick={() => setSelectedSpec(spec)}
                    style={{
                      position: 'relative',
                      padding: '14px 8px 12px 8px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #78523b' : '1.5px solid #e2e8f0',
                      backgroundColor: isSelected ? '#fdf8f5' : '#fafafa',
                      color: isSelected ? '#78523b' : '#64748b',
                      fontWeight: '800',
                      fontSize: '0.82rem',
                      textAlign: 'center',
                      cursor: viewOnly ? 'default' : 'pointer',
                      transition: 'all 0.15s ease',
                      opacity: viewOnly && !isSelected ? 0.4 : 1
                    }}
                  >
                    {/* Badge order/cont ở góc trên bên phải */}
                    {contLabels.length > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '2px',
                        right: '3px',
                        backgroundColor: isSelected ? '#78523b' : '#94a3b8',
                        color: '#fff',
                        fontSize: '0.5rem',
                        fontWeight: '900',
                        borderRadius: '4px',
                        padding: '1px 3px',
                        lineHeight: '1.2',
                        maxWidth: '90%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {contLabels.join(',')}
                      </span>
                    )}

                    {spec}
                    
                    {/* Badge số lần kiểm tra ở góc nhỏ trái (bottom-left) */}
                    {count > 0 && (
                      <span style={{
                        position: 'absolute',
                        bottom: '3px',
                        left: '3px',
                        backgroundColor: '#78523b',
                        color: '#fff',
                        fontSize: '0.62rem',
                        fontWeight: '900',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                      }}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Chọn Container (chỉ hiển thị khi thêm mới từ chế độ Tất cả Cont) */}
        {!viewOnly && !contName && selectedSpec && commonContNames.length > 0 && (
          <div id="input-container-selection-card" style={card}>
            <span style={sectionLabel}>📦 Chọn Container kiểm tra</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {commonContNames.map(name => {
                const isSelected = chosenCont === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setChosenCont(name)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #78523b' : '1.5px solid #e2e8f0',
                      backgroundColor: isSelected ? '#fdf8f5' : '#fafafa',
                      color: isSelected ? '#78523b' : '#64748b',
                      fontWeight: '800',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Kích thước (Đã ẩn theo yêu cầu) */}
        <div id="input-dims-card" style={{...card, display: 'none'}}>
          <span style={sectionLabel}>📏 Kích thước (mm)</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {[
              { label: 'Dài',  value: length, set: setLength },
              { label: 'Rộng', value: width,  set: setWidth },
              { label: 'Cao',  value: height, set: setHeight }
            ].map(({ label, value, set }) => (
              <div key={label}>
                <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#94a3b8', marginBottom: '4px', textAlign: 'center' }}>
                  {label}
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={value}
                  onChange={e => {
                    if (viewOnly) return;
                    const val = e.target.value;
                    if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= 1000)) {
                      set(val);
                    }
                  }}
                  readOnly={viewOnly}
                  max="1000"
                  style={{ ...inputBase, textAlign: 'center', padding: '8px 4px', fontSize: '0.95rem' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Kết quả kiểm tra */}
        <div id="input-result-card" style={card}>
          <span style={sectionLabel}>📋 Kết quả kiểm tra</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { val: 'Đạt',       icon: CheckCircle2, activeColor: '#22c55e', activeBg: '#f0fdf4', label: 'ĐẠT' },
              { val: 'Không đạt', icon: XCircle,      activeColor: '#ef4444', activeBg: '#fef2f2', label: 'KHÔNG ĐẠT' }
            ].map(({ val, icon: Icon, activeColor, activeBg, label }) => {
              const active = result === val
              return (
                <button
                  key={val}
                  onClick={() => !viewOnly && setResult(val)}
                  style={{
                    padding: '10px 8px', borderRadius: '12px',
                    border: active ? `2px solid ${activeColor}` : '1.5px solid #e2e8f0',
                    backgroundColor: active ? activeBg : '#fafafa',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    cursor: viewOnly ? 'default' : 'pointer',
                    transition: 'backgroundColor 0.15s ease, opacity 0.15s ease',
                    opacity: viewOnly && !active ? 0.4 : 1
                  }}
                >
                  <Icon size={20} color={active ? activeColor : '#cbd5e1'} strokeWidth={2.5} />
                  <span style={{ fontWeight: '800', fontSize: '0.82rem', color: active ? activeColor : '#94a3b8' }}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Ảnh minh chứng */}
        <div id="input-images-card" style={card}>
          <span style={sectionLabel}>
            📷 Ảnh minh chứng ({viewOnly ? existingImages.length : images.length}/3)
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {viewOnly
              ? existingImages.map((src, i) => (
                  <img
                    key={i}
                    src={getFullImageUrl(src)}
                    alt={`Ảnh ${i + 1}`}
                    style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                  />
                ))
              : (
                <>
                  {previews.map((src, i) => (
                    <div key={i} style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        onClick={() => removeImage(i)}
                        style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <X size={11} color="#fff" />
                      </button>
                    </div>
                  ))}
                  {images.length < 3 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={compressing}
                      style={{ width: '72px', height: '72px', borderRadius: '10px', border: '1.5px dashed #cbd5e1', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: compressing ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                    >
                      {compressing ? (
                         <Loader2 size={18} color="#94a3b8" style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                         <Camera size={18} color="#94a3b8" />
                      )}
                      <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: '700' }}>
                         {compressing ? 'Xử lý...' : 'Thêm'}
                      </span>
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleImagePick} />
                </>
              )
            }
            {viewOnly && existingImages.length === 0 && (
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>Không có ảnh</span>
            )}
          </div>
        </div>

        {/* Ghi chú */}
        <div style={card}>
          <span style={sectionLabel}>📝 Ghi chú {!viewOnly && '(tuỳ chọn)'}</span>
          <textarea
            placeholder={viewOnly ? 'Không có ghi chú' : 'Nhập ghi chú...'}
            value={note}
            onChange={e => !viewOnly && setNote(e.target.value)}
            readOnly={viewOnly}
            rows={2}
            style={{ ...inputBase, resize: 'none', lineHeight: '1.5' }}
          />
        </div>

        {/* Error (chỉ khi không viewOnly) */}
        {!viewOnly && error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 12px', marginBottom: '10px', color: '#dc2626', fontSize: '0.8rem', fontWeight: '700' }}>
            {error}
          </div>
        )}

        {/* Nút hành động */}
        {viewOnly ? (
          <button
            onClick={() => navigate(-1)}
            style={{
              width: '100%', padding: '14px', borderRadius: '14px',
              border: '1.5px solid #e2e8f0', background: '#fff',
              color: '#475569', fontWeight: '800', fontSize: '0.92rem',
              cursor: 'pointer', marginBottom: '20px'
            }}
          >
            ← Quay lại
          </button>
        ) : (
          <button
            id="input-submit-btn"
            onClick={triggerSubmitConfirm}
            disabled={loading || compressing}
            style={{
              width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
              background: (loading || compressing) ? '#94a3b8' : 'linear-gradient(135deg, #4a2c1d 0%, #78523b 100%)',
              color: '#fff', fontWeight: '800', fontSize: '0.95rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: (loading || compressing) ? 'none' : '0 4px 14px rgba(74,44,29,0.3)',
              cursor: (loading || compressing) ? 'not-allowed' : 'pointer',
              marginBottom: '20px', transition: 'boxShadow 0.2s ease, cursor 0.2s ease'
            }}
          >
            {loading ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={17} />}
            {loading ? 'Đang lưu...' : 'Lưu kết quả'}
          </button>
        )}
      </div>

      <ConfirmModal 
        isOpen={isConfirmOpen} 
        title="Xác nhận lưu kết quả" 
        message={`Bạn có chắc chắn muốn lưu kết quả kiểm tra đầu vào cho chi tiết "${partName}"${selectedSpec ? ` (Quy cách: ${selectedSpec})` : ''} là "${result.toUpperCase()}" không?`} 
        onConfirm={handleSubmit} 
        onCancel={() => setIsConfirmOpen(false)} 
        confirmText="Xác nhận" 
        cancelText="Quay lại" 
      />

      <MessageModal
        isOpen={messageModal.isOpen}
        type={messageModal.type}
        title={messageModal.title}
        message={messageModal.message}
        onConfirm={() => {
          setMessageModal(prev => ({ ...prev, isOpen: false }))
          if (messageModal.type === 'success') {
            navigate(-1)
          }
        }}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        #input-specifications-card > div::-webkit-scrollbar {
          width: 4px;
        }
        #input-specifications-card > div::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 4px;
        }
      `}</style>
    </Layout>
  )
}

export default InputInspection
