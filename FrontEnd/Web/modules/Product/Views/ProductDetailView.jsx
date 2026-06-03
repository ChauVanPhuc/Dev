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
import '@web/styles/Manufacture/ProductDetail.css';

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

            <div className="table-container-wood card-shadow">
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
        </div>
    );
};

export default ProductDetail;
