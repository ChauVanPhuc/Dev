import React, { useState, useEffect, useRef } from 'react';
import { 
    Save, 
    X, 
    Plus, 
    Trash2, 
    Layers,
    Activity,
    ChevronDown,
    ChevronUp,
    Box,
    Search,
    Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { planService } from '@modules/Plan/Models/plan.service';
import { orderService } from '@modules/Order/Models/order.service';
import { bomService } from '@modules/Product/Models/bom.service';
import '@web/styles/Manufacture/ProductionProgress.css';

// --- COMPONENT TÌM KIẾM SẢN PHẨM THÔNG MINH (TRÁNH LOAD TẤT CẢ) ---
const ProductSearchSelect = ({ value, onChange, placeholder, onOpenChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [options, setOptions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState('');
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const pageSize = 20;
    const dropdownRef = useRef(null);
    const debounceTimer = useRef(null);

    useEffect(() => {
        if (onOpenChange) onOpenChange(isOpen);
    }, [isOpen]);

    // Tìm nhãn hiển thị khi đã chọn
    useEffect(() => {
        if (value && !selectedLabel) {
            bomService.getBOM(value).then(data => {
                if (data) setSelectedLabel(data.name);
            }).catch(() => {});
        }
    }, [value]);

    const fetchOptions = async (q, p = 0) => {
        setIsLoading(true);
        try {
            const skip = p * pageSize;
            const response = await bomService.getBOMs(q, pageSize, skip);
            const items = Array.isArray(response) ? response : (response?.items || response?.data || []);
            const totalCount = response?.total || items.length;
            setOptions(items);
            setTotal(totalCount);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchOptions(searchTerm, page);
        }
    }, [isOpen, page]);

    useEffect(() => {
        if (!isOpen) return;
        setPage(0); // Reset trang khi tìm kiếm mới
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => fetchOptions(searchTerm, 0), 300);
        return () => clearTimeout(debounceTimer.current);
    }, [searchTerm]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="searchable-select-container" ref={dropdownRef} style={{ position: 'relative', width: '100%', zIndex: isOpen ? 10001 : 1 }}>
            <div 
                className={`searchable-select-display ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    padding: '10px 16px', border: '1.5px solid #EFEBE9', borderRadius: '12px', 
                    background: 'white', cursor: 'pointer', fontSize: '14px', minHeight: '44px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isOpen ? '0 0 0 3px rgba(93, 64, 55, 0.1)' : 'none',
                    borderColor: isOpen ? '#8D6E63' : '#EFEBE9'
                }}
            >
                <span style={{ color: value ? '#3E2723' : '#A0A0A0', fontWeight: value ? '800' : '500' }}>
                    {selectedLabel || placeholder}
                </span>
                <ChevronDown size={18} color={isOpen ? '#5D4037' : '#A0A0A0'} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
            </div>

            {isOpen && (
                <div className="searchable-select-dropdown" style={{ 
                    position: 'absolute', top: 'calc(100% + 5px)', left: 0, width: '480px', zIndex: 100000,
                    background: 'white', border: '1px solid rgba(93, 64, 55, 0.1)', borderRadius: '16px',
                    boxShadow: '0 15px 45px rgba(62, 39, 35, 0.3)', overflow: 'hidden',
                    animation: 'dropdownFade 0.2s ease-out'
                }}>
                    <div style={{ padding: '15px', background: '#FDFCFB', borderBottom: '1px solid #F5F5F5' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} color="#8D6E63" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input 
                                type="text"
                                placeholder="Tìm kiếm sản phẩm Master..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ 
                                    width: '100%', padding: '10px 15px 10px 42px', 
                                    border: '1.5px solid #EFEBE9', borderRadius: '10px', 
                                    outline: 'none', fontSize: '14px',
                                    transition: 'border-color 0.2s',
                                    fontWeight: '500'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#8D6E63'}
                                onBlur={(e) => e.target.style.borderColor = '#EFEBE9'}
                                autoFocus
                            />
                        </div>
                    </div>
                    
                    <div style={{ minHeight: '120px', maxHeight: '400px', overflowY: 'auto', padding: '8px' }}>
                        {isLoading ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}>
                                <Loader2 className="animate-spin" size={28} color="#8D6E63" />
                                <p style={{ marginTop: '12px', fontSize: '13px', color: '#8D6E63', fontWeight: '600' }}>Đang tải dữ liệu...</p>
                            </div>
                        ) : options.length > 0 ? (
                            options.map(opt => (
                                <div 
                                    key={opt.id}
                                    onClick={() => {
                                        onChange(opt.id);
                                        setSelectedLabel(opt.name);
                                        setIsOpen(false);
                                    }}
                                    style={{ 
                                        padding: '12px 16px', cursor: 'pointer', borderRadius: '10px',
                                        transition: 'all 0.2s', margin: '2px 0'
                                    }}
                                    className="search-option-hover"
                                >
                                    <div style={{ fontWeight: '800', color: '#3E2723', fontSize: '14px', marginBottom: '2px' }}>{opt.name}</div>
                                    <div style={{ fontSize: '11px', color: '#8D6E63', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                                        <Box size={12} /> SKU: {opt.sku}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center' }}>
                                <Box size={32} color="#EFEBE9" style={{ marginBottom: '12px' }} />
                                <div style={{ color: '#A0A0A0', fontSize: '13px', fontWeight: '500' }}>Không tìm thấy sản phẩm nào</div>
                            </div>
                        )}
                    </div>
                    
                    {options.length > 0 && (
                        <div style={{ 
                            padding: '12px 15px', borderTop: '1px solid #F5F5F5', 
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                            background: '#FAF9F8' 
                        }}>
                            <div style={{ fontSize: '12px', color: '#5D4037', fontWeight: '800' }}>
                                <span style={{ opacity: 0.6 }}>TRANG</span> {page + 1} <span style={{ opacity: 0.6, marginLeft: '8px' }}>TỔNG:</span> {total}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button 
                                    disabled={page === 0} 
                                    onClick={(e) => { e.stopPropagation(); setPage(page - 1); }}
                                    style={{ 
                                        padding: '6px 16px', border: '1px solid #EFEBE9', borderRadius: '8px', 
                                        background: 'white', cursor: page === 0 ? 'default' : 'pointer', 
                                        opacity: page === 0 ? 0.4 : 1, fontSize: '12px', fontWeight: '800', color: '#5D4037',
                                        transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    Trước
                                </button>
                                <button 
                                    disabled={total > 0 && (page + 1) * pageSize >= total} 
                                    onClick={(e) => { e.stopPropagation(); setPage(page + 1); }}
                                    style={{ 
                                        padding: '6px 16px', border: '1px solid #EFEBE9', borderRadius: '8px', 
                                        background: 'white', cursor: (total > 0 && (page + 1) * pageSize >= total) ? 'default' : 'pointer', 
                                        opacity: (total > 0 && (page + 1) * pageSize >= total) ? 0.4 : 1, fontSize: '12px', fontWeight: '800', color: '#5D4037',
                                        transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    Sau
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const AddProductionPlan = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    const [activeSelectId, setActiveSelectId] = useState(null);

    const [planData, setPlanData] = useState({
        name: 'KHSX T' + (new Date().getMonth() + 1),
        created_at: new Date().toISOString().split('T')[0],
        estimated_date: '',
        finished_date: '',
        status: 1 
    });

    const [orders, setOrders] = useState([
        { id: 1, name: 'Đơn hàng 1', products: [], expanded: true }
    ]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleAddOrder = () => {
        setOrders([...orders, { 
            id: Date.now(), 
            name: `Đơn hàng ${orders.length + 1}`, 
            start_date: planData.estimated_date || todayStr,
            estimated_date: planData.finished_date || todayStr,
            products: [], 
            expanded: true 
        }]);
    };

    const handleAddProductToOrder = (orderId) => {
        setOrders(orders.map(o => o.id === orderId ? {
            ...o,
            products: [...o.products, { id: `p-${Date.now()}`, productId: '', quantity: 1, components: [], showBOM: false }]
        } : o));
    };

    const handleSelectProduct = async (orderId, productInternalId, productId) => {
        setIsLoading(true);
        try {
            const productData = await bomService.getBOM(productId);
            if (!productData) return;

            const bomSource = productData.master_bom_details || productData.master_elements || [];

            const autoComponents = bomSource.map(comp => ({
                id: `c-master-${comp.id}-${Date.now()}`,
                name: comp.name,
                sku: comp.sku,
                quantity: comp.quantity || 1,
                parts: (comp.children || comp.master_parts || []).map(part => ({ 
                    id: `pt-master-${part.id}-${Date.now()}`, 
                    name: part.name, 
                    sku: part.sku,
                    quantity: part.quantity || 1 
                }))
            }));

            setOrders(orders.map(o => o.id === orderId ? { 
                ...o, 
                products: o.products.map(p => p.id === productInternalId ? {
                    ...p,
                    productId: Number(productId),
                    name: productData.name,
                    sku: productData.sku,
                    components: autoComponents,
                    showBOM: false
                } : p)
            } : o));
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!planData.name) return alert("Vui lòng nhập tên kế hoạch");
        setIsLoading(true);
        try {
            const createdPlan = await planService.createPlan({
                name: planData.name,
                estimated_date: planData.estimated_date || null,
                finished_date: planData.finished_date || null,
                status: planData.status
            });
            
            for (const orderData of orders) {
                if (!orderData.products || orderData.products.length === 0) continue;

                const productsDetailsPayload = orderData.products.map(p => ({
                    name: p.name,
                    sku: p.sku,
                    quantity: p.quantity,
                    master_product_id: p.productId || null,
                    elements: (p.components || []).map(c => ({
                        name: c.name,
                        sku: c.sku || null,
                        quantity: c.quantity,
                        parts: (c.parts || []).map(pt => ({ name: pt.name, sku: pt.sku || null, quantity: pt.quantity }))
                    }))
                }));

                await orderService.create({ 
                    customer: orderData.name, 
                    plan_id: createdPlan.id, 
                    order_status: 2, 
                    start_date: orderData.start_date,
                    estimated_date: orderData.estimated_date,
                    products_details: productsDetailsPayload 
                });
            }
            alert('Đã lưu Kế hoạch Sản xuất thành công!');
            navigate('/manufacture/plan');
        } catch (error) {
            console.error(error);
            alert(`Có lỗi xảy ra khi lưu dữ liệu.`);
        } finally {
            setIsLoading(false);
        }
    };

    const todayStr = new Date().toISOString().split('T')[0];

    const handleStartDateChange = (e) => {
        const newStartDate = e.target.value;
        setPlanData(prev => {
            const updated = { ...prev, estimated_date: newStartDate };
            // Nếu ngày dự kiến cũ nhỏ hơn ngày bắt đầu mới chọn, tự động đẩy ngày dự kiến lên
            if (prev.finished_date && prev.finished_date < newStartDate) {
                updated.finished_date = newStartDate;
            }
            return updated;
        });
    };

    return (
        <div className="production-progress-page" style={{ padding: '24px', background: '#FAF9F8', overflow: 'visible !important' }}>
            <div className="progress-header-wood card-shadow" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0px', flex: 1, alignItems: 'center' }}>
                    <div className="header-item" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', gap: '10px', flex: 1, paddingLeft: '20px' }}>
                        <span className="label" style={{ whiteSpace: 'nowrap', marginBottom: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>TÊN KẾ HOẠCH:</span>
                        <input type="text" value={planData.name} onChange={(e) => setPlanData({...planData, name: e.target.value})} style={{ border: 'none', background: 'transparent', fontSize: '1.25rem', fontWeight: '900', color: '#3E2723', outline: 'none', width: '300px', textTransform: 'uppercase' }} />
                    </div>
                    <div className="header-item" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', gap: '10px', flex: 1, borderLeft: '1.5px solid #E6E0DD', paddingLeft: '30px' }}>
                        <span className="label" style={{ whiteSpace: 'nowrap', marginBottom: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>BẮT ĐẦU:</span>
                        <input 
                            type="date" 
                            value={planData.estimated_date} 
                            min={todayStr}
                            onChange={handleStartDateChange} 
                            style={{ border: 'none', background: 'transparent', fontSize: '1.1rem', fontWeight: '900', color: '#5D4037', outline: 'none', cursor: 'pointer', textTransform: 'uppercase' }} 
                        />
                    </div>
                    <div className="header-item" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', gap: '10px', flex: 1, borderLeft: '1.5px solid #E6E0DD', paddingLeft: '30px' }}>
                        <span className="label" style={{ whiteSpace: 'nowrap', marginBottom: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>DỰ KIẾN XONG:</span>
                        <input 
                            type="date" 
                            value={planData.finished_date} 
                            min={planData.estimated_date || todayStr}
                            onChange={(e) => setPlanData({...planData, finished_date: e.target.value})} 
                            style={{ border: 'none', background: 'transparent', fontSize: '1.1rem', fontWeight: '900', color: '#5D4037', outline: 'none', cursor: 'pointer', textTransform: 'uppercase' }} 
                        />
                    </div>
                </div>
                <button onClick={handleSave} disabled={isLoading} style={{ padding: '12px 30px', borderRadius: '12px', background: '#5D4037', color: 'white', fontWeight: '800', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(93, 64, 55, 0.2)' }}>
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} {isLoading ? '...' : 'Lưu kế hoạch'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#3E2723', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Activity size={24} color="#5D4037" /> Đơn hàng</h2>
                        <button onClick={handleAddOrder} style={{ padding: '8px 20px', background: 'white', border: '1.5px solid #EFEBE9', borderRadius: '10px', color: '#5D4037', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={18} /> Thêm Đơn hàng</button>
                    </div>

                    {orders.map((order, oIdx) => (
                        <div key={order.id} className="tree-node-wrapper card-shadow" style={{ background: 'white', borderRadius: '16px', overflow: 'visible', position: 'relative' }}>
                            <div style={{ padding: '16px 20px', background: '#FAF9F8', borderBottom: '1px solid #EFEBE9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#5D4037', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>{oIdx + 1}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <input 
                                            value={order.name} 
                                            onChange={(e) => setOrders(orders.map(o => o.id === order.id ? {...o, name: e.target.value} : o))} 
                                            placeholder="Tên đơn hàng (không bắt buộc)"
                                            style={{ border: 'none', background: 'transparent', fontWeight: '800', color: '#3E2723', fontSize: '1rem', outline: 'none', width: '250px' }} 
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button onClick={() => setOrders(orders.map(o => o.id === order.id ? {...o, expanded: !o.expanded} : o))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8D6E63' }}>{order.expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</button>
                                    <button onClick={() => setOrders(orders.filter(o => o.id !== order.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF5350' }}><Trash2 size={18} /></button>
                                </div>
                            </div>

                            {order.expanded && (
                                <div style={{ padding: '20px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'visible' }}>
                                        {(order.products || []).map((prod, pIdx) => (
                                            <div key={prod.id} className="stage-item" style={{ border: '1px solid #EFEBE9', borderRadius: '12px', padding: '0', background: 'white', overflow: 'visible', position: activeSelectId === prod.id ? 'relative' : 'static', zIndex: activeSelectId === prod.id ? 1000 : 1 }}>
                                                <div style={{ padding: '12px 16px', background: '#FDFCFB', borderBottom: '1px solid #EFEBE9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                                        <button 
                                                            onClick={() => setOrders(orders.map(o => o.id === order.id ? {...o, products: o.products.map(p => p.id === prod.id ? {...p, showBOM: !p.showBOM} : p)} : o))}
                                                            style={{ background: prod.showBOM ? '#EFEBE9' : 'transparent', border: '1px solid #EFEBE9', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#5D4037', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                                                            title={prod.showBOM ? "Thu gọn BOM" : "Xem chi tiết BOM"}
                                                        >
                                                            <Layers size={16} />
                                                            {prod.productId && <span style={{ fontSize: '11px', fontWeight: '800' }}>{prod.showBOM ? 'Ẩn' : 'BOM'}</span>}
                                                        </button>
                                                        <div style={{ width: '400px' }}>
                                                            <ProductSearchSelect 
                                                                value={prod.productId} 
                                                                onChange={(val) => handleSelectProduct(order.id, prod.id, val)} 
                                                                placeholder="-- Chọn sản phẩm Master --" 
                                                                onOpenChange={(isOpen) => isOpen ? setActiveSelectId(prod.id) : activeSelectId === prod.id && setActiveSelectId(null)}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '20px' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#8D6E63' }}>SL:</span>
                                                            <input type="number" value={prod.quantity} onChange={(e) => setOrders(orders.map(o => o.id === order.id ? {...o, products: o.products.map(p => p.id === prod.id ? {...p, quantity: parseInt(e.target.value) || 0} : p)} : o))} style={{ width: '60px', padding: '4px 8px', border: '1px solid #EFEBE9', borderRadius: '6px', textAlign: 'center', fontWeight: '800' }} />
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setOrders(orders.map(o => o.id === order.id ? {...o, products: o.products.filter(p => p.id !== prod.id)} : o))} style={{ background: 'none', border: 'none', color: '#EF5350', cursor: 'pointer', marginLeft: '10px' }}><X size={16} /></button>
                                                </div>
                                                {prod.productId && prod.showBOM && (
                                                    <div style={{ padding: '12px 16px' }}>
                                                        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                                            <thead>
                                                                <tr style={{ textAlign: 'left', color: '#8D6E63' }}><th style={{ padding: '8px', borderBottom: '1px solid #EFEBE9' }}>CẤU TRÚC BOM</th><th style={{ padding: '8px', borderBottom: '1px solid #EFEBE9', textAlign: 'center' }}>ĐỊNH MỨC</th><th style={{ padding: '8px', borderBottom: '1px solid #EFEBE9', textAlign: 'center' }}>TỔNG</th></tr>
                                                            </thead>
                                                            <tbody>
                                                                {(prod.components || []).map(comp => (
                                                                    <React.Fragment key={comp.id}>
                                                                        <tr style={{ fontWeight: '700', color: '#3E2723' }}><td style={{ padding: '8px' }}><Layers size={14} color="#8D6E63" /> {comp.name}</td><td style={{ textAlign: 'center' }}>{comp.quantity}</td><td style={{ textAlign: 'center', color: '#2E7D32' }}>{comp.quantity * prod.quantity}</td></tr>
                                                                        {(comp.parts || []).map(part => <tr key={part.id} style={{ color: '#8D6E63' }}><td style={{ padding: '4px 8px 4px 30px' }}>• {part.name}</td><td style={{ textAlign: 'center' }}>{part.quantity}</td><td style={{ textAlign: 'center' }}>{part.quantity * prod.quantity}</td></tr>)}
                                                                    </React.Fragment>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <button onClick={() => handleAddProductToOrder(order.id)} style={{ width: '100%', padding: '12px', border: '1.5px dashed #EFEBE9', borderRadius: '12px', background: 'transparent', color: '#8D6E63', fontWeight: '700', cursor: 'pointer' }}>+ Thêm sản phẩm định mức</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

            </div>
            
            <style>{`
                .search-option-hover:hover { background-color: #FAF9F8 !important; transform: translateX(5px); }
                .searchable-select-display:hover { border-color: #8D6E63 !important; }
                @keyframes dropdownFade {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default AddProductionPlan;
