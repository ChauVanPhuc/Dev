import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
    Calendar,
    Clock,
    CheckCircle2,
    ArrowLeft,
    TrendingUp,
    History,
    MoreHorizontal,
    Layers,
    Box,
    AlertCircle,
    Activity
} from 'lucide-react';
import { planService } from '@modules/Plan/Models/plan.service';
import '@web/styles/Manufacture/ProductionProgress.css';

const TreeNode = ({ node }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className="tree-node-wrapper">
            <div className={`stage-item ${node.status === 'Hoàn thành' ? 'completed' : ''} ${node.status === 'Đang thực hiện' ? 'in-progress' : ''}`}>
                <div className="stage-content-wrapper" style={{ paddingLeft: `${node.level * 24}px` }}>
                    <div className="stage-left">
                        <div className="toggle-control-wood">
                            {hasChildren ? (
                                <button 
                                    className="toggle-btn-wood" 
                                    onClick={() => setIsExpanded(!isExpanded)}
                                >
                                    <span className={`arrow ${isExpanded ? 'expanded' : ''}`}>▶</span>
                                </button>
                            ) : (
                                <div className="toggle-placeholder-wood"></div>
                            )}
                        </div>
                        
                        <div className="stage-icon">
                            {node.status === 'Hoàn thành' ? 
                                <CheckCircle2 size={16} /> : 
                                (hasChildren ? <Layers size={16} /> : <Box size={16} />)
                            }
                        </div>
                        <div className="stage-info">
                            <h4>
                                {node.name} 
                                <span className="stage-sku">{node.sku}</span>
                            </h4>
                            <div className="stage-progress-text">
                                {node.actual || 0} / {node.plan || 0} {node.unit || 'chi tiết'}
                            </div>
                        </div>
                    </div>
                    <div className={`status-tag-wood ${node.status === 'Hoàn thành' ? 'done' : node.status === 'Đang thực hiện' ? 'running' : 'waiting'}`}>
                        {node.status}
                    </div>
                </div>
            </div>
            
            {hasChildren && isExpanded && (
                <div className="children-container">
                    {node.children.map((child, idx) => (
                        <TreeNode key={child.id || idx} node={child} />
                    ))}
                </div>
            )}
        </div>
    );
};

const ProductionProgress = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra } = useOutletContext();
    const [loading, setLoading] = useState(true);
    const [productData, setProductData] = useState(null);

    useEffect(() => {
        const fetchProgress = async () => {
            try {
                setLoading(true);
                const data = await planService.getProductProgress(id);
                setProductData(data);
                
                if (data.prodName) {
                    setCustomScreenCode('MA5');
                    setCustomTitle(`Tiến độ: ${data.prodName}`);
                }
                setHeaderExtra(null);
            } catch (error) {
                console.error("Lỗi khi tải tiến độ:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProgress();
    }, [id]);

    if (loading) return (
        <div className="progress-loading-container">
            <div className="wood-spinner"></div>
            <p>Đang tải tiến độ sản xuất...</p>
        </div>
    );

    if (!productData || productData.error) return (
        <div className="error-container">
            <AlertCircle size={48} color="#ef4444" />
            <h3>{productData?.error || "Không tìm thấy dữ liệu"}</h3>
            <button className="btn-back-wood" onClick={() => navigate(-1)}>Quay lại</button>
        </div>
    );

    return (
        <div className="production-progress-page">
            {/* Header Info Cards - Chuẩn hóa đồng bộ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                {[
                    { label: 'KẾ HOẠCH', value: productData.khsx || "---", bg: '#F5F5F5', color: '#424242' },
                    { label: 'MÃ SẢN PHẨM', value: productData.sku || "---", bg: '#F5F5F5', color: '#424242' },
                    { label: 'TỔNG SỐ LƯỢNG SP', value: `${productData.totalQty} Bộ/Cái`, bg: '#F5F5F5', color: '#424242' },
                    { label: 'THỜI HẠN TỔNG', value: productData.deadline || "30/06/2026", bg: '#FFF3E0', color: '#E65100' },
                ].map((stat, i) => (
                    <div key={i} style={{ 
                        background: stat.bg, 
                        padding: '16px 15px', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        textAlign: 'center',
                        minHeight: '80px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                        border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                        <p style={{ margin: '0 0 6px 0', fontSize: '11px', fontWeight: '700', color: '#757575', letterSpacing: '0.5px' }}>{stat.label}</p>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: stat.color }}>{stat.value}</h3>
                    </div>
                ))}
            </div>


            <div className="progress-body-grid">
                <div className="main-content-wood">
                    <div className="progress-summary-card card-shadow">
                        <div className="summary-title">
                            <h2><Activity size={24} color="#5D4037" /> Tiến độ thực hiện</h2>
                            <span className="numbers">{(productData.currentProgress || 0).toLocaleString()} / {(productData.targetProgress || 0).toLocaleString()}</span>
                        </div>
                        <div className="bar-container">
                            <div className="bar-fill" style={{ width: `${((productData.currentProgress || 0) / (productData.targetProgress || 1)) * 100}%` }}></div>
                        </div>

                        <div className="stages-list-wood">
                            <h3 className="section-subtitle"><Layers size={18} /> Cấu trúc linh kiện & Tiến độ hoàn thiện</h3>
                            <div className="tree-container-wood">
                                {productData.stages?.map((stage, idx) => (
                                    <TreeNode key={stage.id || idx} node={stage} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="side-content-wood">
                    <div className="side-card-wood card-shadow">
                        <div className="side-header"><h3>THÔNG TIN CƠ BẢN</h3></div>
                        <div className="side-body">
                            <div className="info-item"><span className="label">Đơn hàng:</span><span className="value">{productData.orderCode}</span></div>
                            <div className="info-item"><span className="label">Dòng SP:</span><span className="value">ATL</span></div>
                            <div className="info-item"><span className="label">Ưu tiên:</span><span className="value highlight-red">CÓ</span></div>
                        </div>
                    </div>

                    <div className="side-card-wood card-shadow">
                        <div className="side-header"><h3><History size={16} /> NHẬT KÝ BÀN GIAO</h3></div>
                        <div className="side-body">
                            {productData.logs_summary?.map((log, idx) => (
                                <div key={idx} className="log-entry">
                                    <div className="log-top">
                                        <span className="user">{log.name}</span>
                                        <span className="time">{log.time}</span>
                                    </div>
                                    <div className="action">+{log.qty} chi tiết → {log.stage}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductionProgress;
