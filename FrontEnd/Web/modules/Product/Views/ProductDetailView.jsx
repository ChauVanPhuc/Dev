import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Layers, 
    Box, 
    Package, 
    Settings, 
    Database,
    ChevronRight,
    ChevronDown,
    Expand,
    Shrink
} from 'lucide-react';
import api from '@webShared/Services/api.service';

const flattenBOM = (items, parentPath = '', level = 0, result = []) => {
    items.forEach((item, index) => {
        const path = parentPath ? `${parentPath}-${index}` : `${index}`;
        const enrichedItem = {
            ...item,
            path,
            parentPath,
            level,
            hasChildren: item.children && item.children.length > 0
        };
        result.push(enrichedItem);
        if (enrichedItem.hasChildren) {
            flattenBOM(item.children, path, level + 1, result);
        }
    });
    return result;
};

const isRowVisible = (node, expandedPaths) => {
    if (node.level === 0) return true;
    const parts = node.path.split('-');
    let currentAncestorPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
        currentAncestorPath = currentAncestorPath ? `${currentAncestorPath}-${parts[i]}` : parts[i];
        if (!expandedPaths.has(currentAncestorPath)) {
            return false;
        }
    }
    return true;
};

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedPaths, setExpandedPaths] = useState(new Set());

    useEffect(() => {
        fetchProductDetail();
    }, [id]);

    const fetchProductDetail = async () => {
        try {
            setLoading(true);
            const data = await api.get(`/master-products/${id}`);
            setProduct(data);
            
            if (data && data.master_bom_details) {
                const flattened = flattenBOM(data.master_bom_details);
                // Mặc định mở rộng tất cả các cụm ở cấp 0 (cấp cao nhất)
                const initialExpanded = new Set();
                flattened.forEach(item => {
                    if (item.hasChildren && item.level < 1) {
                        initialExpanded.add(item.path);
                    }
                });
                setExpandedPaths(initialExpanded);
            }
        } catch (error) {
            console.error('Lỗi khi lấy chi tiết sản phẩm:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="progress-loading-container">
            <div className="wood-spinner"></div>
            <p>Đang tải cấu trúc BOM...</p>
        </div>
    );

    if (!product) return <div className="error-container">Không tìm thấy sản phẩm.</div>;

    const flattenedData = flattenBOM(product.master_bom_details || []);

    const toggleNode = (path) => {
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const handleExpandAll = () => {
        const allPaths = flattenedData
            .filter(item => item.hasChildren)
            .map(item => item.path);
        setExpandedPaths(new Set(allPaths));
    };

    const handleCollapseAll = () => {
        setExpandedPaths(new Set());
    };

    const visibleRows = flattenedData.filter(node => isRowVisible(node, expandedPaths));

    return (
        <div className="product-detail-page">
            <div className="product-header-wood card-shadow">
                <div className="product-title">
                    <h1>{product.name} <span className="sku-tag">{product.sku}</span></h1>
                </div>
            </div>

            <div className="info-grid-wood">
                <div className="info-card-wood">
                    <div className="label">Mã SKU</div>
                    <div className="value">{product.sku}</div>
                </div>
                <div className="info-card-wood">
                    <div className="label">Quy cách</div>
                    <div className="value">{product.specification || '---'}</div>
                </div>
                <div className="info-card-wood">
                    <div className="label">Đơn vị chính</div>
                    <div className="value">{product.unit || 'Bộ/Cái'}</div>
                </div>
                <div className="info-card-wood">
                    <div className="label">Tổng linh kiện</div>
                    <div className="value">{flattenedData.length} mục</div>
                </div>
            </div>

            <div className="table-container-wood card-shadow desktop-only">
                <div className="table-header-title">
                    <div className="table-title-left">
                        <Settings size={16} /> Cấu trúc định mức vật tư (BOM)
                    </div>
                    <div className="tree-control-actions">
                        <button className="control-btn-wood" onClick={handleExpandAll}>
                            <Expand size={12} /> Mở rộng tất cả
                        </button>
                        <button className="control-btn-wood" onClick={handleCollapseAll}>
                            <Shrink size={12} /> Thu gọn tất cả
                        </button>
                    </div>
                </div>
                <table className="table-wood">
                    <thead>
                        <tr>
                            <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                            <th style={{ width: '60px', textAlign: 'center' }}>Cấp</th>
                            <th>Tên linh kiện / Vật tư</th>
                            <th style={{ width: '130px' }}>Mã SKU</th>
                            <th style={{ width: '150px' }}>Quy cách</th>
                            <th style={{ width: '110px', textAlign: 'right' }}>Số lượng</th>
                            <th style={{ width: '200px' }}>Cổng công đoạn</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleRows.length > 0 ? (
                            visibleRows.map((item, idx) => (
                                <tr key={item.path || idx} className={`level-${item.level}`}>
                                    <td style={{ textAlign: 'center', color: '#8D6E63', fontWeight: '600', fontSize: '12px' }}>
                                        {idx + 1}
                                    </td>
                                    <td style={{ textAlign: 'center', color: '#5D4037', fontWeight: '800' }}>
                                        <span className="level-badge">{item.level + 1}</span>
                                    </td>
                                    <td>
                                        <div 
                                            className="tree-cell-content" 
                                            style={{ paddingLeft: `${item.level * 20}px` }}
                                        >
                                            {item.level > 0 && <span className="tree-connector">└─</span>}
                                            {item.hasChildren ? (
                                                <button 
                                                    className="tree-toggle-btn" 
                                                    onClick={() => toggleNode(item.path)}
                                                    title={expandedPaths.has(item.path) ? "Thu gọn" : "Mở rộng"}
                                                >
                                                    {expandedPaths.has(item.path) ? (
                                                        <ChevronDown size={12} className="icon-arrow" />
                                                    ) : (
                                                        <ChevronRight size={12} className="icon-arrow" />
                                                    )}
                                                </button>
                                            ) : (
                                                <span className="tree-toggle-placeholder" />
                                            )}
                                            
                                            <span className={`tree-node-icon ${item.is_raw_material ? 'raw' : (item.hasChildren ? 'assembly' : 'item')}`}>
                                                {item.is_raw_material ? (
                                                    <Database size={12} />
                                                ) : item.hasChildren ? (
                                                    <Layers size={12} />
                                                ) : (
                                                    <Box size={12} />
                                                )}
                                            </span>
                                            
                                            <span className="tree-node-name">{item.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ color: '#8D6E63', fontSize: '12px', fontWeight: '600' }}>{item.sku}</td>
                                    <td style={{ color: '#8D6E63', fontSize: '12px', fontStyle: item.specification ? 'normal' : 'italic' }}>
                                        {item.specification || '---'}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#2E7D32', fontSize: '13px' }}>
                                        {item.quantity} <small style={{ fontWeight: '600', color: '#8D6E63' }}>{item.unit}</small>
                                    </td>
                                    <td>
                                        <div className="stage-tags-container">
                                            {item.input_stage && (
                                                <span className="stage-tag-wood in" title={`Công đoạn vào: ${item.input_stage}`}>
                                                    In: {item.input_stage}
                                                </span>
                                            )}
                                            {item.input_stage && item.output_stage && (
                                                <span className="stage-arrow">➔</span>
                                            )}
                                            {item.output_stage && (
                                                <span className="stage-tag-wood out" title={`Công đoạn ra: ${item.output_stage}`}>
                                                    Out: {item.output_stage}
                                                </span>
                                            )}
                                            {!item.input_stage && !item.output_stage && (
                                                <span style={{ color: '#BDBDBD', fontSize: '11px', fontStyle: 'italic' }}>Không có cổng</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="empty-state">Sản phẩm này chưa có cấu trúc BOM.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View - High-density List */}
            <div className="bom-mobile-list-container mobile-only">
                <div className="table-header-title" style={{ borderRadius: '12px 12px 0 0' }}>
                    <div className="table-title-left">
                        <Settings size={16} /> Định mức BOM
                    </div>
                    <div className="tree-control-actions">
                        <button className="control-btn-wood" onClick={handleExpandAll} style={{ padding: '6px 8px', fontSize: '11px' }}>
                            <Expand size={10} /> Mở hết
                        </button>
                        <button className="control-btn-wood" onClick={handleCollapseAll} style={{ padding: '6px 8px', fontSize: '11px' }}>
                            <Shrink size={10} /> Thu hết
                        </button>
                    </div>
                </div>

                <div className="bom-mobile-list">
                    {visibleRows.length > 0 ? (
                        visibleRows.map((item, idx) => (
                            <div 
                                key={item.path || idx} 
                                className={`bom-mobile-row level-${item.level}`}
                                style={{ paddingLeft: `${Math.min(item.level * 12 + 10, 60)}px` }}
                            >
                                <div className="bom-mobile-left">
                                    {item.level > 0 && <span className="tree-connector" style={{ marginRight: '4px' }}>└─</span>}
                                    {item.hasChildren ? (
                                        <button 
                                            className="tree-toggle-btn" 
                                            onClick={() => toggleNode(item.path)}
                                            style={{ marginRight: '4px' }}
                                        >
                                            {expandedPaths.has(item.path) ? (
                                                <ChevronDown size={14} />
                                            ) : (
                                                <ChevronRight size={14} />
                                            )}
                                        </button>
                                    ) : (
                                        <span className="tree-toggle-placeholder-mobile" style={{ width: '18px' }} />
                                    )}

                                    <span className={`tree-node-icon ${item.is_raw_material ? 'raw' : (item.hasChildren ? 'assembly' : 'item')}`} style={{ width: '20px', height: '20px', marginRight: '6px' }}>
                                        {item.is_raw_material ? (
                                            <Database size={10} />
                                        ) : item.hasChildren ? (
                                            <Layers size={10} />
                                        ) : (
                                            <Box size={10} />
                                        )}
                                    </span>

                                    <div className="bom-mobile-details">
                                        <div className="bom-mobile-name-row">
                                            <span className="bom-mobile-name">{item.name}</span>
                                        </div>
                                        <div className="bom-mobile-meta">
                                            <span className="bom-mobile-sku">{item.sku}</span>
                                            {item.specification && (
                                                <>
                                                    <span className="bullet" style={{ margin: '0 3px', color: '#cbd5e1' }}>•</span>
                                                    <span className="bom-mobile-spec">{item.specification}</span>
                                                </>
                                            )}
                                        </div>
                                        {(item.input_stage || item.output_stage) && (
                                            <div className="bom-mobile-stages">
                                                {item.input_stage && <span className="stage-badge-mobile in">In: {item.input_stage}</span>}
                                                {item.input_stage && item.output_stage && <span className="arrow">→</span>}
                                                {item.output_stage && <span className="stage-badge-mobile out">Out: {item.output_stage}</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="bom-mobile-right">
                                    <span className="bom-mobile-qty">{item.quantity}</span>
                                    <span className="bom-mobile-unit">{item.unit}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">Sản phẩm này chưa có cấu trúc BOM.</div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
.product-detail-page {
    padding: 24px;
    background: #FAF9F8;
    min-height: 100vh;
    font-family: 'Inter', sans-serif;
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
.product-header-wood {
    background: white;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
    border-bottom: 4px solid #5D4037;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.product-title h1 {
    margin: 0;
    font-size: 24px;
    color: #3E2723;
    font-weight: 800;
}
.product-title .sku-tag {
    font-size: 14px;
    color: #8D6E63;
    font-weight: 500;
    margin-left: 10px;
}
.view-mode-selector {
    display: flex;
    background: #EFEBE9;
    padding: 4px;
    border-radius: 10px;
}
.view-mode-btn {
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
    background: transparent;
    color: #8D6E63;
}
.view-mode-btn.active {
    background: white;
    color: #5D4037;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.info-grid-wood {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 24px;
}
.info-card-wood {
    background: white;
    padding: 16px 20px;
    border-radius: 12px;
    border-left: 4px solid #5D4037;
    box-shadow: 0 4px 15px rgba(93, 64, 55, 0.05);
}
.info-card-wood .label {
    font-size: 11px;
    font-weight: 800;
    color: #8D6E63;
    text-transform: uppercase;
    margin-bottom: 4px;
}
.info-card-wood .value {
    font-size: 16px;
    font-weight: 800;
    color: #3E2723;
}
.btn-back-wood-inline {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #FAF9F8;
    border: 1px solid #EFEBE9;
    border-radius: 8px;
    color: #5D4037;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    margin-right: 16px;
    transition: all 0.2s ease;
}
.btn-back-wood-inline:hover {
    background: #EFEBE9;
    transform: translateX(-2px);
}
.product-title {
    display: flex;
    align-items: center;
}
.tree-control-actions {
    display: flex;
    gap: 10px;
}
.control-btn-wood {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: #FAF9F8;
    border: 1px solid #EFEBE9;
    border-radius: 6px;
    color: #5D4037;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
}
.control-btn-wood:hover {
    background: #5D4037;
    color: white;
    border-color: #5D4037;
    box-shadow: 0 4px 10px rgba(93, 64, 55, 0.15);
}
.table-header-title {
    background: #FAF9F8;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 800;
    color: #3E2723;
    border-bottom: 2px solid #EFEBE9;
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.table-title-left {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 800;
    color: #3E2723;
}
.level-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    background: #EFEBE9;
    color: #5D4037;
    border-radius: 50%;
    font-size: 10px;
    font-weight: 800;
}
.tree-cell-content {
    display: flex;
    align-items: center;
    position: relative;
}
.tree-connector {
    color: #D7CCC8;
    font-family: monospace;
    font-weight: bold;
    margin-right: 6px;
    user-select: none;
}
.tree-toggle-btn {
    background: none;
    border: none;
    padding: 0;
    margin-right: 6px;
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #8D6E63;
    border-radius: 4px;
    transition: all 0.15s ease;
}
.tree-toggle-btn:hover {
    background: #EFEBE9;
    color: #3E2723;
}
.tree-toggle-placeholder {
    width: 20px;
    display: inline-block;
}
.tree-node-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    margin-right: 8px;
    border: 1px solid #EFEBE9;
    flex-shrink: 0;
}
.tree-node-icon.assembly {
    background: #efebe9;
    color: #5d4037;
}
.tree-node-icon.item {
    background: #e8f5e9;
    color: #2e7d32;
}
.tree-node-icon.raw {
    background: #e3f2fd;
    color: #1565c0;
}
.tree-node-name {
    font-weight: 700;
    color: #3E2723;
    font-size: 14px;
}
.table-wood tr.level-0 {
    background: rgba(93, 64, 55, 0.01);
}
.table-wood tr.level-0:hover {
    background: rgba(93, 64, 55, 0.04);
}
.table-wood tr.level-1 td {
    background: rgba(250, 249, 248, 0.3);
}
.stage-tags-container {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: nowrap;
    white-space: nowrap;
}
.stage-arrow {
    color: #8D6E63;
    font-size: 12px;
    font-weight: 800;
    margin: 0 2px;
    user-select: none;
}
.stage-tag-wood {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    border: 1px solid #EFEBE9;
    white-space: nowrap;
}
.stage-tag-wood.in { 
    background: #ECEFF1; 
    color: #455A64; 
    border-color: #CFD8DC;
}
.stage-tag-wood.out { 
    background: #EFEBE9; 
    color: #5D4037; 
    border-color: #D7CCC8;
}
.empty-state {
    text-align: center;
    padding: 40px !important;
    color: #8D6E63;
    font-style: italic;
    font-weight: 500;
}
.table-container-wood {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(93, 64, 55, 0.05);
}
.table-wood {
    width: 100%;
    border-collapse: collapse;
}
.table-wood th {
    background: #FAF9F8;
    padding: 10px 14px;
    text-align: left;
    font-size: 11px;
    font-weight: 800;
    color: #5D4037;
    text-transform: uppercase;
    border-bottom: 2px solid #EFEBE9;
}
.table-wood td {
    padding: 10px 14px;
    border-bottom: 1px solid #FAF9F8;
    font-size: 13px;
}
.table-wood tr:hover {
    background: #FAF9F8;
}

@media (max-width: 768px) {
    .product-detail-page {
        padding: 12px;
    }
    .product-header-wood {
        padding: 16px;
        margin-bottom: 12px;
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }
    .product-title h1 {
        font-size: 18px;
    }
    .info-grid-wood {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin-bottom: 16px;
    }
    .info-card-wood {
        padding: 10px 12px;
    }
    .info-card-wood .value {
        font-size: 14px;
    }
    .table-container-wood {
        border-radius: 12px;
    }
    .table-header-title {
        padding: 10px 12px;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }
    .tree-control-actions {
        width: 100%;
        display: flex;
        justify-content: space-between;
        gap: 10px;
    }
    .control-btn-wood {
        flex: 1;
        justify-content: center;
        padding: 8px;
    }
    
    /* Mobile BOM list design */
    .bom-mobile-list {
        background: white;
        border-radius: 0 0 12px 12px;
        padding: 8px 0;
        box-shadow: 0 4px 15px rgba(93, 64, 55, 0.05);
        border: 1px solid #EFEBE9;
        border-top: none;
    }
    .bom-mobile-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        border-bottom: 1px solid #FAF9F8;
        transition: background-color 0.15s ease;
    }
    .bom-mobile-row:last-child {
        border-bottom: none;
    }
    .bom-mobile-row:active {
        background-color: #FAF9F8;
    }
    .bom-mobile-left {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
    }
    .tree-toggle-placeholder-mobile {
        width: 16px;
        display: inline-block;
        flex-shrink: 0;
    }
    .bom-mobile-row .tree-toggle-btn {
        width: 16px;
        height: 16px;
        margin-right: 4px;
        flex-shrink: 0;
    }
    .bom-mobile-details {
        display: flex;
        flex-direction: column;
        min-width: 0;
        flex: 1;
    }
    .bom-mobile-name {
        font-size: 13px;
        font-weight: 700;
        color: #3E2723;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
    }
    .bom-mobile-meta {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 2px;
        font-size: 11px;
        color: #8D6E63;
    }
    .bom-mobile-sku {
        font-weight: 600;
    }
    .bom-mobile-spec {
        font-style: italic;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 120px;
    }
    .bom-mobile-stages {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 4px;
    }
    .stage-badge-mobile {
        font-size: 9px;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 700;
        border: 1px solid transparent;
    }
    .stage-badge-mobile.in {
        background: #ECEFF1; 
        color: #455A64; 
        border-color: #CFD8DC;
    }
    .stage-badge-mobile.out {
        background: #EFEBE9; 
        color: #5D4037; 
        border-color: #D7CCC8;
    }
    .bom-mobile-stages .arrow {
        font-size: 10px;
        color: #8D6E63;
    }
    .bom-mobile-right {
        display: flex;
        align-items: baseline;
        gap: 2px;
        margin-left: 8px;
        flex-shrink: 0;
        font-size: 13px;
        font-weight: 800;
        color: #2E7D32;
    }
    .bom-mobile-unit {
        font-size: 10px;
        color: #8D6E63;
        font-weight: 600;
    }
}
            `}} />
        </div>
    );
};

export default ProductDetail;
