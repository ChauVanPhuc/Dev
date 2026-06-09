import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import PassFailSelector from '@mobile/Shared/Views/components/ui/PassFailSelector'
import { Check, Camera, X, ArrowLeft, Image as ImageIcon, RotateCcw } from 'lucide-react'
import apiClient, { API_URL, API_ROOT } from '@shared/services/api'
import useAuthStore from '@modules/auth/Models/authModel'
import pendingQCStore from '@modules/delivery/Models/pendingQCStore'
import NgrokImage from '@mobile/Shared/Views/components/media/NgrokImage'

/**
 * MH11 - Kiểm tra chất lượng chi tiết
 */
const QualityInspectionDetail = () => {
    const { id, category } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { user } = useAuthStore()
    
    // Lấy label từ state hoặc mapping
    const categoryLabel = location.state?.label || 'Kiểm tra chi tiết'
    
    const [isPass, setIsPass] = useState(null)
    const [images, setImages] = useState([])    // File (mới) | string (url đã lưu)
    const [loading, setLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [compressing, setCompressing] = useState(false) // Trạng thái nén ảnh

    // Tải dữ liệu QC khi mở màn hình (hoặc khi category thay đổi)
    // QUAN TRỌNG: Reset state trước → tránh hiển thị dữ liệu của mục trước
    useEffect(() => {
        setIsPass(null)   // Reset về null mỗi lần muc mục khác
        setImages([])     // Reset images
        setLoading(true)  // Kích loading spinner

        const loadData = async () => {
            // 1. Kiểm tra pending store trước (ưu tiên dữ liệu chưa lưu của phiên này)
            const pending = pendingQCStore.get(id, category)
            if (pending) {
                setIsPass(pending.isPass)
                setImages([...pending.existingImages, ...pending.newImages])
                setLoading(false)
                return
            }
            // 2. Dự phòng: tải từ API (dữ liệu đã lưu trước)
            try {
                const resp = await apiClient.get(`/qc/${id}`)
                if (resp.data) {
                    const info = resp.data.qc_info
                    if (info && info.results_json) {
                        const results = typeof info.results_json === 'string'
                            ? JSON.parse(info.results_json)
                            : info.results_json
                        if (results[category] !== undefined) {
                            setIsPass(results[category].is_pass)
                        }
                    }
                    const allImages = resp.data.images || []
                    const categoryImages = allImages
                        .filter(img => img.description === `qc_${category}`)
                        .map(img => img.image_path)
                    setImages(categoryImages)
                }
            } catch (e) {
                // Chưa có dữ liệu QC — bỏ qua
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [id, category])


    // Mapping hướng dẫn
    const getInstruction = (c) => {
        switch(c) {
            case 'moisture': return 'QC sử dụng máy đo độ ẩm gỗ chuyên dụng, lấy mẫu 5 tiêu điểm tại các vị trí khác nhau trên bề mặt. Yêu cầu độ ẩm ổn định từ 8-12%.';
            case 'bend': return 'Sử dụng thước đo độ phẳng tiêu chuẩn, đặt thanh gỗ lên mặt đá và kiểm tra độ hở lớn nhất tại các góc và tâm.';
            case 'visual': return 'Quan sát bề mặt dưới ánh sáng trắng 500 lux. Kiểm tra lỗi mắt gỗ, nứt nẻ, và độ đồng màu giữa các chi tiết.';
            case 'size': return 'Sử dụng thước kẹp điện tử đo các thông số Dài x Rộng x Dày theo đúng bản vẽ kỹ thuật chi tiết.';
            case 'structure': return 'Kiểm tra độ chắc chắn của các mối ghép mộng, mộng đuôi én và vị trí bắn vít khung.';
            case 'functional': return 'Vận hành thử nghiệm độ đóng mở, trượt của ray, bản lề và các phụ kiện tính năng đi kèm.';
            case 'visual_ext': return 'QC chọn ra 10 sản phẩm ngẫu nhiên. Mỗi sản phẩm thực hiện quan sát và đánh giá bề mặt, độ mịn sơn. Nếu không đạt phải chụp ảnh minh chứng lỗi.';
            default: return 'Thực hiện kiểm tra dựa trên tài liệu tiêu chuẩn kỹ thuật (TCKT) đã được ban hành cho chi tiết này.';
        }
    };

    const userRoleStr = (user?.role_name || user?.role_description || '').toLowerCase();
    const isQC = userRoleStr.includes('qc') || userRoleStr.includes('kiểm tra') || userRoleStr.includes('chất lượng');
    const MAX_IMAGES = isQC ? 10 : 40;

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

    const handleImageSelect = () => {
        if (images.length >= MAX_IMAGES || compressing) return
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.capture = 'environment' // Ép mở camera (không cho chọn từ thư viện)
        input.onchange = async (e) => {
            const files = Array.from(e.target.files)
            if (!files.length) return;
            
            setCompressing(true);
            const compressedFiles = await Promise.all(files.map(f => compressImage(f)));
            setCompressing(false);

            setImages(prev => {
                const remaining = MAX_IMAGES - prev.length
                const toAdd = compressedFiles.slice(0, remaining)
                return [...prev, ...toAdd]
            })
        }
        input.click()
    }

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index))
    }

    // Lưu kết quả vào pending store (KHÔNG gọi API)
    // Chỉ khi bấm "Xác nhận" ở màn hình ngoài thì mới gửi lên server
    const handleSave = () => {
        if (isPass === null) {
            alert('Vui lòng chọn trạng thái Đạt hoặc Chưa Đạt trước khi xác nhận!')
            return
        }
        const existingImages = images.filter(img => typeof img === 'string') // URL server
        const newImages      = images.filter(img => img instanceof File)      // File mới

        pendingQCStore.set(id, category, { isPass, existingImages, newImages })
        navigate(-1) // Quay lại — sẽ lưu lên server khi bấm "Xác nhận" ở màn hình ngoài
    }



    return (
        <Layout>
            <div style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'var(--bg-cream)' }}>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e2e8f0' }}>
                   <div onClick={() => navigate(-1)} style={{ cursor: 'pointer' }}><ArrowLeft size={24} color="#334155" /></div>
                   <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#1e293b', margin: 0 }}>MB11 | {categoryLabel}</h2>
                </div>
            </div>


            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTop: '3px solid #4e342e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '600' }}>Đang tải dữ liệu...</span>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '100px' }}>

                {/* Hướng dẫn Header */}
                <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div style={{ fontSize: '1rem', fontWeight: '800', color: '#64748b' }}>Yêu cầu kiểm tra</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#bf9270', fontWeight: '700', fontSize: '0.9rem', borderBottom: '1px solid #bf9270' }}>
                           Xem HDKT
                        </div>
                    </div>
                    <div style={{ color: '#334155', fontSize: '1rem', lineHeight: '1.6', fontWeight: '500' }}>
                        {getInstruction(category)}
                    </div>
                </div>

                {/* Kết quả Section */}
                <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#1e293b', marginBottom: '18px' }}>Kết quả kiểm tra</div>
                    <PassFailSelector
                        value={isPass}
                        onChange={(val) => setIsPass(val === 'pass')}
                        disabled={false}
                        variant="button"
                    />

                    {/* Ảnh minh chứng */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <div style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>Ảnh minh chứng</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: images.length >= MAX_IMAGES ? '#ef4444' : '#94a3b8', backgroundColor: images.length >= MAX_IMAGES ? '#fef2f2' : '#f1f5f9', padding: '4px 10px', borderRadius: '20px' }}>
                            {images.length}/{MAX_IMAGES}
                        </div>
                    </div>

                    {/* Grid 5 cột */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: '8px',
                    }}>
                        {images.map((img, idx) => (
                            <div key={idx} style={{ aspectRatio: '1', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', position: 'relative' }}>
                                {img instanceof File ? (
                                    <img
                                        src={URL.createObjectURL(img)}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <NgrokImage
                                        src={`${API_ROOT}${img.startsWith('/') ? img.substring(1) : img}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                )}
                                <div
                                    onClick={() => removeImage(idx)}
                                    style={{ position: 'absolute', top: '3px', right: '3px', backgroundColor: '#ef4444', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff', cursor: 'pointer' }}
                                >
                                    <X size={11} strokeWidth={3} />
                                </div>
                            </div>
                        ))}

                        {/* Nút thêm ảnh — chỉ hiện khi chưa đủ 40 */}
                        {images.length < MAX_IMAGES && (
                            <div
                                onClick={handleImageSelect}
                                style={{ aspectRatio: '1', borderRadius: '10px', border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', gap: '3px', cursor: compressing ? 'not-allowed' : 'pointer', opacity: compressing ? 0.6 : 1 }}
                            >
                                <Camera size={22} color="#94a3b8" />
                                <span style={{ fontSize: '0.6rem', fontWeight: '700', color: '#94a3b8', textAlign: 'center' }}>{compressing ? 'Đang nén...' : 'Thêm'}</span>
                            </div>
                        )}
                    </div>

                    {images.length >= MAX_IMAGES && (
                        <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#ef4444', fontWeight: '600', textAlign: 'center' }}>
                            Đã đạt tối đa {MAX_IMAGES} ảnh minh chứng.
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* Bottom Bar */}
            <div className="responsive-fixed-footer" style={{ backgroundColor: '#fff', padding: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
                <button 
                    onClick={handleSave}
                    disabled={isSubmitting || compressing}
                    style={{ flex: 2, height: '52px', backgroundColor: (isSubmitting || compressing) ? '#94a3b8' : '#4e342e', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '1.1rem', fontWeight: '800', boxShadow: (isSubmitting || compressing) ? 'none' : '0 4px 15px rgba(78, 52, 46, 0.2)' }}
                >
                    {isSubmitting ? 'Đang lưu...' : compressing ? 'Đang xử lý...' : 'Xác nhận kết quả'}
                </button>
                <button 
                    onClick={() => navigate(-1)}
                    style={{ flex: 1, height: '52px', backgroundColor: '#fff', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: '14px', fontSize: '1.1rem', fontWeight: '700' }}
                >
                    Hủy
                </button>
            </div>
        </Layout>
    )
}

export default QualityInspectionDetail
