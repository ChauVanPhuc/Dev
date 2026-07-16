import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { 
    ChevronLeft, 
    FileText, 
    Truck, 
    ClipboardCheck, 
    ShieldCheck,
    Calendar,
    User,
    Package,
    ArrowRight,
    MapPin,
    AlertCircle,
    CheckCircle2,
    Eye,
    Clock
} from 'lucide-react';
import { qualityService } from '@modules/QualityRecords/Models/quality.service';
import { API_ROOT } from '@webShared/Services/api.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const QualityRecordsDetailView = () => {
    const { id } = useParams(); // poCode
    const navigate = useNavigate();
    const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  
  // Lấy metadata từ database thay vì hardcode
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/quality-records/:id');
    const [activeTab, setActiveTab] = useState('handover');
    const [loading, setLoading] = useState(true);
    const [orderInfo, setOrderInfo] = useState(null);
    const [handoverData, setHandoverData] = useState([]);
    const [inboundData, setInboundData] = useState([]);
    const [qcData, setQcData] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imageZoom, setImageZoom] = useState(1);
    const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const hasSetTitle = React.useRef(false);


    useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

    // 2. Logic Fetch Data
    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const [order, handover, inbound, qc] = await Promise.all([
                    qualityService.getOrderDetail(id).catch(() => null),
                    qualityService.getHandoverHistory(id).catch(() => []),
                    qualityService.getInboundHistory(id).catch(() => []),
                    qualityService.getQCReceivingHistory(id).catch(() => [])
                ]);

                setOrderInfo(order);
                setHandoverData(handover || []);
                setInboundData(inbound || []);
                setQcData(qc || []);
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu chi tiết hồ sơ:", error);
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [id]); 

    // Hàm mở modal an toàn
    const handleOpenModal = (e, item, type) => {
        if (e) {
            if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
            e.preventDefault();
            e.stopPropagation();
        }
        setSelectedItem({ ...item, type });
        setIsModalOpen(true);
    };

    const handleCloseModal = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setIsModalOpen(false);
        setSelectedItem(null);
    };

    const tabs = [
        { id: 'handover', label: 'Lịch sử bàn giao', icon: <Truck size={18} /> },
        { id: 'inbound', label: 'Kiểm tra đầu vào', icon: <ClipboardCheck size={18} /> },
        { id: 'qc', label: 'QC kiểm tra hàng', icon: <ShieldCheck size={18} /> }
    ];

    const formatDate = (dateStr) => {
        if (!dateStr) return "---";
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return "---";
            return date.toLocaleDateString('vi-VN');
        } catch (e) {
            return "---";
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return "";
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return "";
            return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return "";
        }
    };

    const renderQCValue = (value) => {
        if (value === null || value === undefined) return "---";
        if (typeof value === 'object') {
            // Trường hợp dữ liệu dạng { min, max, is_pass, value } hoặc tương tự
            if (value.value !== undefined) return value.value;
            if (value.min !== undefined && value.max !== undefined) return `${value.min} - ${value.max}`;
            return JSON.stringify(value);
        }
        return value;
    };

    const renderImageGallery = (images) => {
        if (!images || images.length === 0) return null;
        
        // Normalize image paths (có thể là mảng chuỗi hoặc mảng object)
        const normalizedImages = images.map(img => 
            typeof img === 'string' ? img : img.image_path
        );

        // Giới hạn tối đa 3 ảnh
        const displayImages = normalizedImages.slice(0, 3);

        return (
            <div style={{ marginTop: '10px' }}>
                <div className="card-label">Ảnh minh chứng ({displayImages.length}/3)</div>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: '8px',
                    marginTop: '4px'
                }}>
                    {displayImages.map((path, i) => (
                        <img 
                            key={i}
                            src={`${API_ROOT}${path.replace(/^\//, '')}`} 
                            style={{ 
                                width: '100%', 
                                height: '120px', 
                                objectFit: 'cover', 
                                borderRadius: '8px', 
                                border: '1px solid #EADCC9', 
                                cursor: 'pointer',
                                transition: 'transform 0.2s'
                            }}
                            alt={`Evidence ${i + 1}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(`${API_ROOT}${path.replace(/^\//, '')}`);
                                setImageZoom(1);
                                setImagePan({ x: 0, y: 0 });
                                setIsDragging(false);
                                setImageModalOpen(true);
                            }}
                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        />
                    ))}
                </div>
            </div>
        );
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Hoàn thành':
            case 'Đã Nhận Hàng':
                return { bg: '#E8F5E9', color: '#2E7D32' };
            case 'Chờ Nhận Hàng':
            case 'Chờ Xác Nhận':
                return { bg: '#FFF3E0', color: '#E65100' };
            case 'Lỗi':
            case 'Từ chối':
                return { bg: '#FFEBEE', color: '#C62828' };
            default:
                return { bg: '#F5F5F5', color: '#757575' };
        }
    };

    return (
        <div className="quality-detail-container" style={{ padding: '1rem', width: '100%', boxSizing: 'border-box' }}>
            <style dangerouslySetInnerHTML={{ __html: `
                .detail-card {
                    background: #fff;
                    border-radius: 12px;
                    border: 1px solid #EADCC9;
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                    box-shadow: 0 4px 6px -1px rgba(123, 82, 51, 0.05);
                }
                .tab-container {
                    display: flex;
                    gap: 10px;
                    border-bottom: 1px solid #EADCC9;
                    margin-bottom: 1.5rem;
                    overflow-x: auto;
                    scrollbar-width: none;
                    padding-bottom: 2px;
                }
                .tab-btn {
                    padding: 0.6rem 1.25rem;
                    border: 1px solid transparent;
                    border-radius: 8px 8px 0 0;
                    background: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #8D6E63;
                    font-weight: 700;
                    transition: all 0.2s;
                    white-space: nowrap;
                    margin-bottom: -1px;
                }
                .tab-btn.active {
                    color: #7B5233;
                    background-color: #FAF6F0;
                    border: 1px solid #EADCC9;
                    border-bottom-color: #FAF6F0;
                }
                .tab-btn:hover:not(.active) {
                    background: #FAF6F0;
                    color: #7B5233;
                }

                /* Mobile-First Card Design */
                .history-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 0.75rem;
                    padding: 0.5rem;
                }
                @media (min-width: 768px) {
                    .history-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }
                @media (min-width: 1280px) {
                    .history-grid {
                        grid-template-columns: repeat(4, 1fr);
                    }
                }
                @media (min-width: 1536px) {
                    .history-grid {
                        grid-template-columns: repeat(5, 1fr);
                    }
                }

                .history-card {
                    background: #fff;
                    border: 1px solid #EADCC9;
                    border-radius: 10px;
                    padding: 0.75rem;
                    position: relative;
                    transition: all 0.2s;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    cursor: pointer;
                }
                .history-card:hover {
                    border-color: #7B5233;
                    background-color: #FAF6F0;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(123, 82, 51, 0.08);
                }
                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 1px dashed #EADCC9;
                    padding-bottom: 0.4rem;
                }
                .card-label {
                    font-size: 0.65rem;
                    color: #8D6E63;
                    font-weight: 700;
                    text-transform: uppercase;
                    margin-bottom: 1px;
                }
                .card-value {
                    font-size: 0.8rem;
                    color: #2D1A12;
                    font-weight: 600;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .card-badge {
                    padding: 2px 8px;
                    border-radius: 20px;
                    font-size: 0.6rem;
                    font-weight: 800;
                }
                .card-row {
                    display: flex;
                    gap: 0.5rem;
                }
                .card-col {
                    flex: 1;
                    min-width: 0; /* Cho phép text-overflow hoạt động */
                }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    background: rgba(0, 0, 0, 0.75) !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    z-index: 999999 !important;
                    padding: 20px !important;
                    backdrop-filter: blur(2px) !important;
                }
                .modal-content {
                    background: #ffffff !important;
                    border-radius: 16px !important;
                    width: 100% !important;
                    max-width: 600px !important;
                    max-height: 90vh !important;
                    overflow-y: auto !important;
                    position: relative !important;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
                    border: 2px solid #7B5233 !important;
                }
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .modal-header {
                    padding: 1.25rem 1.5rem;
                    border-bottom: 1px solid #EADCC9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: sticky;
                    top: 0;
                    background: #fff;
                    z-index: 10;
                }
                .modal-body {
                    padding: 1.5rem;
                }
                .modal-close {
                    background: #F5F5F5;
                    border: none;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #5D4037;
                    transition: all 0.2s;
                }
                .modal-close:hover {
                    background: #FFEBEE;
                    color: #C62828;
                }
                .detail-row {
                    display: flex;
                    padding: 10px 0;
                    border-bottom: 1px solid #FAF6F0;
                }
                .detail-label {
                    flex: 0 0 140px;
                    font-size: 0.85rem;
                    color: #8D6E63;
                    font-weight: 700;
                }
                .detail-value {
                    flex: 1;
                    font-size: 0.9rem;
                    color: #2D1A12;
                    font-weight: 600;
                }
            `}} />

            {/* Header Info */}
            <div className="detail-card card-shadow">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>Đang tải thông tin đơn hàng...</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '700' }}>MÃ ĐƠN HÀNG</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#7B5233' }}>#{orderInfo?.order_code || id}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '700' }}>KHÁCH HÀNG</div>
                            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#2D1A12' }}>{orderInfo?.customer || '---'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '700' }}>SẢN PHẨM</div>
                            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#2D1A12' }}>
                                {orderInfo?.products?.length || 0} loại ({orderInfo?.products?.reduce((acc, p) => acc + (p.quantity || 0), 0) || 0} chiếc)
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="tab-container">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="detail-card card-shadow" style={{ padding: '1rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>Đang tải lịch sử...</div>
                ) : (
                    <>
                        {activeTab === 'handover' && (
                            <div className="history-grid">
                                {handoverData.length === 0 ? (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#8D6E63' }}>
                                        <Truck size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                        <p>Chưa có lịch sử bàn giao cho PO này.</p>
                                    </div>
                                ) : (
                                    handoverData.map((item, idx) => {
                                        const status = getStatusStyle(item.status);
                                        return (
                                            <div key={`${id}-h-${idx}`} className="history-card" onClick={(e) => handleOpenModal(e, item, 'handover')}>
                                                <div className="card-header">
                                                    <div>
                                                        <div className="card-label">Thời gian</div>
                                                        <div className="card-value">{formatDate(item.created_at)}</div>
                                                    </div>
                                                    <span className="card-badge" style={{ backgroundColor: status.bg, color: status.color }}>
                                                        {(item.status || 'Chờ').toUpperCase()}
                                                    </span>
                                                </div>
                                                
                                                <div className="card-row">
                                                    <div className="card-col">
                                                        <div className="card-label">Linh kiện</div>
                                                        <div className="card-value" style={{ color: '#7B5233' }}>{item.part_name || item.product_name || '---'}</div>
                                                    </div>
                                                </div>

                                                <div className="card-row">
                                                    <div className="card-col">
                                                        <div className="card-label">Công đoạn</div>
                                                        <div className="card-value">{item.delivery_stage} → {item.receiving_stage}</div>
                                                    </div>
                                                </div>

                                                <div className="card-row">
                                                    <div className="card-col">
                                                        <div className="card-label">Số lượng</div>
                                                        <div className="card-value" style={{ fontSize: '0.9rem', color: '#7B5233' }}>{item.quantity_total} chiếc</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {activeTab === 'inbound' && (
                            <div className="history-grid">
                                {inboundData.length === 0 ? (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#8D6E63' }}>
                                        <ClipboardCheck size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                        <p>Chưa có lịch sử kiểm tra đầu vào cho PO này.</p>
                                    </div>
                                ) : (
                                    inboundData.map((item, idx) => (
                                        <div key={`${id}-i-${idx}`} className="history-card" onClick={(e) => handleOpenModal(e, item, 'inbound')}>
                                            <div className="card-header">
                                                <div>
                                                    <div className="card-label">Thời gian</div>
                                                    <div className="card-value">{formatDate(item.created_at)}</div>
                                                </div>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    backgroundColor: item.result === 'Pass' ? '#E8F5E9' : '#FFEBEE'
                                                }}>
                                                    {item.result === 'Pass' ? (
                                                        <CheckCircle2 size={14} color="#2E7D32" />
                                                    ) : (
                                                        <AlertCircle size={14} color="#C62828" />
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="card-label">Linh kiện</div>
                                                <div className="card-value" style={{ color: '#7B5233' }}>{item.part_name}</div>
                                            </div>

                                            <div className="card-row">
                                                <div className="card-col">
                                                    <div className="card-label">Kích thước</div>
                                                    <div className="card-value">
                                                        {item.specification || '---'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="card-row">
                                                <div className="card-col">
                                                    <div className="card-label">Kết quả</div>
                                                    <div className="card-value" style={{
                                                        color: item.result === 'Pass' ? '#2E7D32' : '#C62828',
                                                        fontWeight: '700'
                                                    }}>
                                                        {item.result === 'Pass' ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'qc' && (
                            <div className="history-grid">
                                {qcData.length === 0 ? (
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#8D6E63' }}>
                                        <ShieldCheck size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                        <p>Chưa có dữ liệu QC kiểm tra hàng cho PO này.</p>
                                    </div>
                                ) : (
                                    qcData.map((item, idx) => (
                                        <div key={`${id}-q-${idx}`} className="history-card" onClick={(e) => handleOpenModal(e, item, 'qc')}>
                                            <div className="card-header">
                                                <div>
                                                    <div className="card-label">Thời gian</div>
                                                    <div className="card-value">{formatDate(item.created_at)}</div>
                                                </div>
                                                <span className="card-badge" style={{ 
                                                    backgroundColor: item.result === 'Đạt' ? '#E8F5E9' : '#FFEBEE',
                                                    color: item.result === 'Đạt' ? '#2E7D32' : '#C62828'
                                                }}>
                                                    {(item.result || '---').toUpperCase()}
                                                </span>
                                            </div>

                                            <div className="card-row">
                                                <div className="card-col">
                                                    <div className="card-label">Độ ẩm</div>
                                                    <div className="card-value" style={{ color: '#2E7D32' }}>{renderQCValue(item.results_data?.moisture ?? item.moisture)}%</div>
                                                </div>
                                                <div className="card-col">
                                                    <div className="card-label">Độ cong</div>
                                                    <div className="card-value" style={{ color: '#1565C0' }}>{renderQCValue(item.results_data?.bend ?? item.bend)}mm</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Detail Modal */}
            {isModalOpen && selectedItem && ReactDOM.createPortal(
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(e); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, color: '#2D1A12', fontSize: '1.1rem' }}>Chi tiết hồ sơ</h3>
                            <button className="modal-close" onClick={handleCloseModal}>
                                <ChevronLeft size={20} style={{ transform: 'rotate(-90deg)' }} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-row">
                                <div className="detail-label">Thời gian</div>
                                <div className="detail-value">{formatDate(selectedItem.created_at)} {formatTime(selectedItem.created_at)}</div>
                            </div>
                            
                            {selectedItem.type === 'handover' && (
                                <>
                                    <div className="detail-row">
                                        <div className="detail-label">Mã bàn giao</div>
                                        <div className="detail-value" style={{ fontWeight: '800', color: '#7B5233' }}>{selectedItem.delivery_id || selectedItem.id || '---'}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">PO Code</div>
                                        <div className="detail-value">{selectedItem.po_code || id}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Linh kiện</div>
                                        <div className="detail-value" style={{ color: '#7B5233', fontWeight: '600' }}>{selectedItem.part_name || selectedItem.product_name || '---'}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Trạng thái</div>
                                        <div className="detail-value">
                                            <span style={{ 
                                                padding: '4px 12px', 
                                                borderRadius: '12px', 
                                                fontSize: '0.85rem',
                                                fontWeight: '700',
                                                backgroundColor: selectedItem.status === 'Hoàn thành' ? '#E8F5E9' : '#FFF3E0',
                                                color: selectedItem.status === 'Hoàn thành' ? '#2E7D32' : '#E65100'
                                            }}>
                                                {selectedItem.status || 'Chờ'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Công đoạn giao</div>
                                        <div className="detail-value">{selectedItem.delivery_stage}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Công đoạn nhận</div>
                                        <div className="detail-value">{selectedItem.receiving_stage}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Số lượng tổng</div>
                                        <div className="detail-value" style={{ color: '#7B5233', fontSize: '1.1rem' }}>{selectedItem.quantity_total} chiếc</div>
                                    </div>
                                    {selectedItem.quantity_ok !== undefined && (
                                        <div className="detail-row">
                                            <div className="detail-label">Số lượng OK</div>
                                            <div className="detail-value" style={{ color: '#2E7D32' }}>{selectedItem.quantity_ok} chiếc</div>
                                        </div>
                                    )}
                                    {selectedItem.quantity_ng !== undefined && (
                                        <div className="detail-row">
                                            <div className="detail-label">Số lượng NG</div>
                                            <div className="detail-value" style={{ color: '#C62828' }}>{selectedItem.quantity_ng} chiếc</div>
                                        </div>
                                    )}
                                    <div className="detail-row">
                                        <div className="detail-label">Người giao</div>
                                        <div className="detail-value">{selectedItem.sx_delivery_name}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Người nhận</div>
                                        <div className="detail-value">{selectedItem.sx_receipt_name || '---'}</div>
                                    </div>
                                    {selectedItem.receipt_time && (
                                        <div className="detail-row">
                                            <div className="detail-label">Thời gian nhận</div>
                                            <div className="detail-value">{formatDate(selectedItem.receipt_time)} {formatTime(selectedItem.receipt_time)}</div>
                                        </div>
                                    )}
                                </>
                            )}

                            {selectedItem.type === 'inbound' && (
                                <>
                                    <div className="detail-row">
                                        <div className="detail-label">Mã kiểm tra</div>
                                        <div className="detail-value" style={{ fontWeight: '800', color: '#7B5233' }}>{selectedItem.id || '---'}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">PO Code</div>
                                        <div className="detail-value">{selectedItem.po_code || id}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Linh kiện</div>
                                        <div className="detail-value" style={{ color: '#7B5233' }}>{selectedItem.part_name}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Kích thước</div>
                                        <div className="detail-value">{selectedItem.specification || '---'}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Người kiểm tra</div>
                                        <div className="detail-value">{selectedItem.inspector_name}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Kết quả</div>
                                        <div className="detail-value">
                                            <span style={{ color: selectedItem.result === 'Pass' ? '#2E7D32' : '#C62828', fontWeight: '800' }}>
                                                {selectedItem.result === 'Pass' ? 'ĐẠT (PASS)' : 'KHÔNG ĐẠT (FAIL)'}
                                            </span>
                                        </div>
                                    </div>
                                    {selectedItem.check_time && (
                                        <div className="detail-row">
                                            <div className="detail-label">Thời gian kiểm</div>
                                            <div className="detail-value">{formatDate(selectedItem.check_time)} {formatTime(selectedItem.check_time)}</div>
                                        </div>
                                    )}
                                </>
                            )}

                            {selectedItem.type === 'qc' && (
                                <>
                                    <div className="detail-row">
                                        <div className="detail-label">Mã QC</div>
                                        <div className="detail-value" style={{ fontWeight: '800', color: '#7B5233' }}>{selectedItem.id || '---'}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">PO Code</div>
                                        <div className="detail-value">{selectedItem.po_code || id}</div>
                                    </div>
                                    {/* Hiển thị results_data (dữ liệu chi tiết từ kết quả kiểm tra) */}
                                    {selectedItem.results_data && typeof selectedItem.results_data === 'object' && Object.keys(selectedItem.results_data).length > 0 ? (
                                        <>
                                            {Object.entries(selectedItem.results_data).map(([key, value]) => {
                                                // Map nhãn tiếng Việt
                                                const labelMap = {
                                                    size: 'Kích thước',
                                                    structure: 'Kết cấu',
                                                    visual: 'Ngoại quan',
                                                    moisture: 'Độ ẩm',
                                                    bend: 'Độ cong',
                                                    accessories: 'Phụ kiện',
                                                    visual_ext: 'Ngoại quan mở rộng',
                                                    functional: 'Chức năng'
                                                };
                                                const label = labelMap[key] || key;

                                                // Hàm render badge trạng thái đạt/không đạt
                                                const renderStatusBadge = (isPass) => {
                                                    if (isPass === null || isPass === undefined) return null;
                                                    return (
                                                        <span style={{ 
                                                            marginLeft: '12px', 
                                                            color: isPass ? '#2E7D32' : '#C62828', 
                                                            fontWeight: '800',
                                                            fontSize: '0.9rem',
                                                            display: 'inline-flex', 
                                                            alignItems: 'center', 
                                                            gap: '6px',
                                                            padding: '2px 10px',
                                                            borderRadius: '6px',
                                                            backgroundColor: isPass ? '#E8F5E9' : '#FFEBEE',
                                                            border: `1.5px solid ${isPass ? '#2E7D32' : '#C62828'}`
                                                        }}>
                                                            {isPass ? '✓ ĐẠT' : '✗ LỖI'}
                                                        </span>
                                                    );
                                                };

                                                // Trường hợp 1: Dữ liệu kích thước (long, wide, thick)
                                                if (typeof value === 'object' && value !== null && ('long' in value || 'wide' in value || 'thick' in value)) {
                                                    const hasData = value.long || value.wide || value.thick;
                                                    return (
                                                        <div className="detail-row" key={key}>
                                                            <div className="detail-label">{label}</div>
                                                            <div className="detail-value">
                                                                {hasData ? (
                                                                    <span style={{ fontWeight: '600' }}>{value.long || 0} x {value.wide || 0} x {value.thick || 0} mm</span>
                                                                ) : (
                                                                    <span style={{ color: '#9E9E9E', fontStyle: 'italic' }}>---</span>
                                                                )}
                                                                {renderStatusBadge(value.is_pass)}
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                // Trường hợp 2: Các object có is_pass khác
                                                if (typeof value === 'object' && value !== null && value.is_pass !== undefined) {
                                                    const displayVal = value.value !== undefined ? value.value : '';
                                                    const unit = key === 'moisture' ? '%' : (key === 'bend' ? ' mm' : '');
                                                    return (
                                                        <div className="detail-row" key={key}>
                                                            <div className="detail-label">{label}</div>
                                                            <div className="detail-value">
                                                                {displayVal ? (
                                                                    <span style={{ fontWeight: '600' }}>{displayVal}{unit}</span>
                                                                ) : (
                                                                    <span style={{ color: '#9E9E9E', fontStyle: 'italic' }}>---</span>
                                                                )}
                                                                {renderStatusBadge(value.is_pass)}
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                // Trường hợp 3: String hoặc Number đơn thuần
                                                if (typeof value === 'string' || typeof value === 'number') {
                                                    if (value === '') return null;
                                                    const unit = key === 'moisture' ? '%' : (key === 'bend' ? ' mm' : '');
                                                    return (
                                                        <div className="detail-row" key={key}>
                                                            <div className="detail-label">{label}</div>
                                                            <div className="detail-value" style={{ fontWeight: '600' }}>{value}{unit}</div>
                                                        </div>
                                                    );
                                                }

                                                return null;
                                            })}
                                        </>
                                    ) : (
                                        /* Hiển thị moisture/bend từ cấu trúc cũ nếu results_data trống */
                                        <>
                                            {selectedItem.moisture !== undefined && (
                                                <div className="detail-row">
                                                    <div className="detail-label">Độ ẩm</div>
                                                    <div className="detail-value" style={{ color: '#2E7D32', fontWeight: '600' }}>{renderQCValue(selectedItem.moisture)}%</div>
                                                </div>
                                            )}
                                            {selectedItem.bend !== undefined && (
                                                <div className="detail-row">
                                                    <div className="detail-label">Độ cong</div>
                                                    <div className="detail-value" style={{ color: '#1565C0', fontWeight: '600' }}>{renderQCValue(selectedItem.bend)} mm</div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    
                                    <div className="detail-row" style={{ marginTop: '8px', borderTop: '1px dashed #E0E0E0', paddingTop: '8px' }}>
                                        <div className="detail-label">Nhân viên QC</div>
                                        <div className="detail-value" style={{ fontWeight: '600' }}>{selectedItem.qc_inspector_name}</div>
                                    </div>
                                    <div className="detail-row">
                                        <div className="detail-label">Kết luận tổng quát</div>
                                        <div className="detail-value">
                                            <span style={{ 
                                                color: selectedItem.result === 'Đạt' ? '#2E7D32' : '#C62828', 
                                                fontWeight: '900',
                                                fontSize: '1.2rem',
                                                textDecoration: 'underline'
                                            }}>
                                                {selectedItem.result?.toUpperCase() || 'CHƯA CÓ'}
                                            </span>
                                        </div>
                                    </div>
                                    {selectedItem.created_at && (
                                        <div className="detail-row">
                                            <div className="detail-label">Thời gian QC</div>
                                            <div className="detail-value" style={{ color: '#616161' }}>{formatDate(selectedItem.created_at)} {formatTime(selectedItem.created_at)}</div>
                                        </div>
                                    )}
                                </>
                            )}

                            {(selectedItem.note || selectedItem.remark) && (
                                <div className="detail-row">
                                    <div className="detail-label">Ghi chú</div>
                                    <div className="detail-value" style={{ fontStyle: 'italic' }}>{selectedItem.note || selectedItem.remark}</div>
                                </div>
                            )}

                            <div style={{ marginTop: '1.5rem' }}>
                                {renderImageGallery(selectedItem.images)}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Image Modal */}
            {imageModalOpen && selectedImage && ReactDOM.createPortal(
                <div 
                    className="modal-overlay" 
                    onClick={() => { setImageModalOpen(false); setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') { setImageModalOpen(false); setImageZoom(1); setImagePan({ x: 0, y: 0 }); }
                        if (e.key === '+' || e.key === '=') setImageZoom(prev => Math.min(5, prev + 0.2));
                        if (e.key === '-' || e.key === '_') setImageZoom(prev => Math.max(0.5, prev - 0.2));
                        if (e.key === '0') { setImageZoom(1); setImagePan({ x: 0, y: 0 }); }
                    }}
                    tabIndex={0}
                    style={{ outline: 'none' }}
                >
                    <div 
                        className="modal-content" 
                        style={{ 
                            maxWidth: '95vw', 
                            maxHeight: '95vh', 
                            padding: '0',
                            backgroundColor: 'transparent',
                            boxShadow: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                        }} 
                        onClick={e => e.stopPropagation()}
                    >
                        <div 
                            style={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                overflow: 'hidden',
                                maxWidth: '100%',
                                maxHeight: '90vh',
                                cursor: imageZoom > 1 ? 'grab' : 'default',
                                position: 'relative'
                            }}
                            onMouseDown={(e) => {
                                if (imageZoom > 1) {
                                    setIsDragging(true);
                                    setDragStart({ x: e.clientX - imagePan.x, y: e.clientY - imagePan.y });
                                }
                            }}
                            onMouseMove={(e) => {
                                if (isDragging && imageZoom > 1) {
                                    setImagePan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                                }
                            }}
                            onMouseUp={() => setIsDragging(false)}
                            onMouseLeave={() => setIsDragging(false)}
                        >
                            <img 
                                src={selectedImage} 
                                alt="Full size" 
                                style={{ 
                                    maxWidth: '100%', 
                                    maxHeight: '90vh', 
                                    objectFit: 'contain',
                                    borderRadius: '12px',
                                    transform: `scale(${imageZoom}) translate(${imagePan.x / imageZoom}px, ${imagePan.y / imageZoom}px)`,
                                    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    cursor: imageZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                                    userSelect: 'none',
                                    pointerEvents: 'none'
                                }}
                                onWheel={(e) => {
                                    e.preventDefault();
                                    const delta = e.deltaY > 0 ? -0.15 : 0.15;
                                    setImageZoom(prev => Math.max(0.5, Math.min(5, prev + delta)));
                                }}
                                onDoubleClick={() => {
                                    setImageZoom(prev => prev === 1 ? 2 : 1);
                                    if (imageZoom === 1) setImagePan({ x: 0, y: 0 });
                                }}
                            />
                        </div>

                        {/* Floating Control Panel */}
                        <div style={{
                            position: 'absolute',
                            bottom: '30px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            padding: '12px 20px',
                            display: 'flex',
                            gap: '16px',
                            alignItems: 'center',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                            <button 
                                onClick={() => setImageZoom(prev => Math.max(0.5, prev - 0.25))}
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    width: '40px',
                                    height: '40px',
                                    cursor: 'pointer',
                                    fontSize: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    fontWeight: '300'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                                title="Zoom Out (-)"
                            >
                                −
                            </button>
                            
                            <div style={{
                                color: 'white',
                                fontSize: '15px',
                                fontWeight: '600',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                minWidth: '70px',
                                textAlign: 'center',
                                fontFamily: 'monospace'
                            }}>
                                {Math.round(imageZoom * 100)}%
                            </div>
                            
                            <button 
                                onClick={() => setImageZoom(prev => Math.min(5, prev + 0.25))}
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    width: '40px',
                                    height: '40px',
                                    cursor: 'pointer',
                                    fontSize: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    fontWeight: '300'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                                title="Zoom In (+)"
                            >
                                +
                            </button>

                            <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

                            <button 
                                onClick={() => { setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    width: '40px',
                                    height: '40px',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                                title="Reset (0)"
                            >
                                ⟲
                            </button>
                        </div>

                        {/* Close Button */}
                        <button 
                            onClick={() => { setImageModalOpen(false); setImageZoom(1); setImagePan({ x: 0, y: 0 }); }}
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                                backdropFilter: 'blur(10px)',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                width: '44px',
                                height: '44px',
                                cursor: 'pointer',
                                fontSize: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = 'rgba(220, 38, 38, 0.9)';
                                e.target.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
                                e.target.style.transform = 'scale(1)';
                            }}
                            title="Close (ESC)"
                        >
                            ×
                        </button>

                        {/* Keyboard Hints */}
                        <div style={{
                            position: 'absolute',
                            bottom: '100px',
                            left: '20px',
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(8px)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            fontSize: '11px',
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontFamily: 'monospace',
                            lineHeight: '1.6'
                        }}>
                            <div>Scroll / +/- : Zoom</div>
                            <div>Double-click : Toggle</div>
                            <div>Drag : Pan (zoomed)</div>
                            <div>ESC : Close</div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default QualityRecordsDetailView;
