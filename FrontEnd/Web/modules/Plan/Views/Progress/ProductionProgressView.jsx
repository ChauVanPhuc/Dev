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
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
const TreeNode = ({ node }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className="tree-node-wrapper">
            <div className={`stage-item ${node.status === 'Hoàn thành' ? 'completed' : ''} ${node.status === 'Đang thực hiện' ? 'in-progress' : ''}`}>
                <div className="stage-content-wrapper" style={{ paddingLeft: `calc(${node.level} * var(--indent-gap, 24px))` }}>
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
  
  // Lấy metadata từ database thay vì hardcode
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/production-progress/:id');
    const [loading, setLoading] = useState(true);
    const [productData, setProductData] = useState(null);

    const fetchProgress = async () => {
        setLoading(true);
        try {
            const data = await planService.getProductProgress(id);
            setProductData(data);
        } catch (error) {
            console.error('Lỗi khi tải tiến độ sản xuất:', error);
            setProductData({ error: 'Không thể tải tiến độ sản xuất.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchProgress();
        }
    }, [id]);

    useEffect(() => {
        if (screenCode && title) {
            if (setCustomTitle) setCustomTitle(title);
            if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
            if (setCustomScreenCode) setCustomScreenCode(screenCode);
        }
    }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

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
               <div className="progress-stats-grid">
                {[
                    { label: 'KẾ HOẠCH', value: productData.khsx || "---", bg: '#F5F5F5', color: '#424242' },
                    { label: 'MÃ SẢN PHẨM', value: productData.sku || "---", bg: '#F5F5F5', color: '#424242' },
                    { label: 'TỔNG SỐ LƯỢNG SP', value: `${productData.totalQty} Bộ/Cái`, bg: '#F5F5F5', color: '#424242' },
                    { label: 'THỜI HẠN TỔNG', value: productData.deadline || "30/06/2026", bg: '#FFF3E0', color: '#E65100' },
                ].map((stat, i) => (
                    <div key={i} className="progress-stat-card" style={{ background: stat.bg }}>
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
            <style dangerouslySetInnerHTML={{ __html: `
.production-progress-page {
    padding: 24px;
    background: #FAF9F8;
    min-height: calc(100vh - 64px);
    font-family: 'Inter', sans-serif;
}
.progress-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 30px;
}
.progress-stat-card {
    padding: 16px 15px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-height: 80px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    border: 1px solid rgba(0,0,0,0.05);
}
.btn-back-wood {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: white;
    border: 1px solid #EFEBE9;
    border-radius: 10px;
    color: #5D4037;
    font-weight: 700;
    cursor: pointer;
    margin-bottom: 24px;
    transition: all 0.2s;
}
.btn-back-wood:hover {
    background: #EFEBE9;
}
.progress-header-wood {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: white;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
    border-bottom: 4px solid #5D4037;
}
.header-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    border-right: 1px solid #EFEBE9;
}
.header-item:last-child { border-right: none; }
.header-item .label {
    font-size: 11px;
    font-weight: 800;
    color: #8D6E63;
    letter-spacing: 1px;
}
.header-item .value {
    font-size: 16px;
    font-weight: 800;
    color: #3E2723;
}
.header-item .value.highlight { color: #2E7D32; }
.progress-body-grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 24px;
}
.main-content-wood {
    display: flex;
    flex-direction: column;
}
.progress-summary-card {
    background: white;
    padding: 32px;
    border-radius: 20px;
}
.summary-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}
.summary-title h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    color: #3E2723;
    display: flex;
    align-items: center;
    gap: 12px;
}
.summary-title .numbers {
    font-size: 18px;
    font-weight: 800;
    color: #5D4037;
}
.bar-container {
    height: 12px;
    background: #EFEBE9;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 48px;
}
.bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #8D6E63, #5D4037);
    border-radius: 6px;
    transition: width 0.8s ease-in-out;
}
.section-subtitle {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    color: #5D4037;
    margin-bottom: 24px;
    font-weight: 800;
    border-bottom: 2px solid #EFEBE9;
    padding-bottom: 12px;
}
.tree-node-wrapper {
    margin-bottom: 16px;
}
.stage-item {
    background: white;
    border: 1px solid #EFEBE9;
    border-radius: 12px;
    padding: 0;
    display: flex;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 4px rgba(93, 64, 55, 0.03);
    margin-bottom: 4px;
}
.stage-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(93, 64, 55, 0.08);
    border-color: #D7CCC8;
}
.stage-content-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 14px 20px;
    position: relative;
}
.stage-content-wrapper::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: #EFEBE9;
}
.stage-item.completed .stage-content-wrapper::before { background: #7CB342; }
.stage-item.in-progress .stage-content-wrapper::before { background: #FFB74D; }
.stage-left {
    display: flex;
    align-items: center;
    gap: 8px;
}
.toggle-control-wood {
    width: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.toggle-placeholder-wood {
    width: 24px;
    height: 24px;
}
.toggle-btn-wood {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #8D6E63;
    width: 24px;
    height: 24px;
}
.toggle-btn-wood .arrow {
    display: inline-block;
    font-size: 9px;
    transition: transform 0.3s ease;
}
.toggle-btn-wood .arrow.expanded {
    transform: rotate(90deg);
}
.stage-icon {
    width: 36px;
    height: 36px;
    background: #EFEBE9;
    color: #5D4037;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.stage-item.completed .stage-icon {
    background: #7CB342;
    color: white;
}
.stage-info h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 800;
    color: #3E2723;
}
.stage-sku {
    font-size: 10px;
    color: #8D6E63;
    background: #FAF9F8;
    padding: 1px 6px;
    border-radius: 4px;
    margin-left: 8px;
    font-weight: 600;
}
.stage-progress-text {
    font-size: 11px;
    color: #8D6E63;
    margin-top: 2px;
    font-weight: 600;
}
.status-tag-wood {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.status-tag-wood.done { background: #7CB342; color: white; }
.status-tag-wood.running { background: #FFB74D; color: white; }
.status-tag-wood.waiting { background: #EEEEEE; color: #757575; }
.side-card-wood {
    background: white;
    border-radius: 16px;
    margin-bottom: 24px;
    overflow: hidden;
}
.side-header {
    padding: 14px 20px;
    background: #F5F5F5;
    border-bottom: 1px solid #EFEBE9;
}
.side-header h3 {
    margin: 0;
    font-size: 12px;
    font-weight: 800;
    color: #5D4037;
    text-transform: uppercase;
}
.side-body {
    padding: 16px 20px;
}
.info-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #FAF9F8;
    font-size: 12px;
}
.info-item:last-child { border-bottom: none; }
.info-item .label { color: #8D6E63; }
.info-item .value { font-weight: 700; color: #3E2723; }
.highlight-red { color: #D32F2F !important; }
.log-entry {
    padding: 10px 0;
    border-bottom: 1px solid #FAF9F8;
}
.log-top {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    margin-bottom: 2px;
}
.log-top .user { font-weight: 700; color: #5D4037; }
.log-top .time { color: #BDBDBD; }
.log-entry .action { font-size: 12px; font-weight: 600; color: #3E2723; }
.card-shadow {
    box-shadow: 0 4px 20px rgba(93, 64, 55, 0.05);
}
.wood-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #EFEBE9;
    border-top: 3px solid #5D4037;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 20px auto;
}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
.progress-loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400px;
    color: #8D6E63;
    font-weight: 700;
}
.error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400px;
}

@media (max-width: 768px) {
    .production-progress-page {
        padding: 12px;
    }
    .progress-stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-bottom: 16px;
    }
    .progress-stat-card {
        padding: 12px 10px;
        min-height: 60px;
    }
    .progress-stat-card h3 {
        font-size: 15px !important;
    }
    .progress-body-grid {
        grid-template-columns: 1fr;
        gap: 16px;
    }
    .progress-summary-card {
        padding: 16px;
        border-radius: 12px;
    }
    .stage-content-wrapper {
        padding: 12px;
        --indent-gap: 12px;
    }
    .stage-left {
        gap: 6px;
    }
    .stage-icon {
        width: 28px;
        height: 28px;
    }
    .stage-info h4 {
        font-size: 13px;
    }
    .stage-sku {
        margin-left: 4px;
        font-size: 9px;
    }
    .status-tag-wood {
        padding: 2px 8px;
        font-size: 8px;
    }
}
            `}} />
        </div>
    );
};

export default ProductionProgress;
