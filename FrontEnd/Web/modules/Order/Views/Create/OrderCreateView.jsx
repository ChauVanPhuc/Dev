import React, { useState, useEffect } from 'react';
import { 
    Save, 
    X, 
    Plus, 
    Layers,
    Activity,
    ClipboardList,
    Calendar,
    User,
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    Search,
    Loader2
} from 'lucide-react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { bomService } from '@modules/Product/Models/bom.service';
import { orderService } from '@modules/Order/Models/order.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

// --- SEARCHABLE SELECT COMPONENT ---
const SearchableSelect = ({ value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [options, setOptions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = React.useRef(null);
    const debounceTimer = React.useRef(null);

    // Tìm sản phẩm hiện tại để hiển thị label
    const [selectedOption, setSelectedOption] = useState(null);

    // Lấy thông tin sản phẩm đã chọn nếu có value mà chưa có selectedOption
    useEffect(() => {
        if (value && !selectedOption) {
            const fetchCurrent = async () => {
                try {
                    // Tận dụng API search để lấy đúng cái ID đó
                    const data = await bomService.getBOMs('', 100); 
                    const found = data.find(opt => opt.id === value);
                    if (found) setSelectedOption(found);
                } catch (e) {}
            };
            fetchCurrent();
        }
    }, [value]);

    // Tải 50 cái mặc định khi mở dropdown lần đầu
    useEffect(() => {
        if (isOpen && options.length === 0) {
            fetchData('');
        }
    }, [isOpen]);

    const fetchData = async (q) => {
        setIsLoading(true);
        try {
            const data = await bomService.getBOMs(q, 50);
            setOptions(data || []);
        } catch (error) {
            console.error("Lỗi search:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        if (!isOpen) return;
        
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        
        debounceTimer.current = setTimeout(() => {
            fetchData(searchTerm);
        }, 400); // 400ms debounce

        return () => clearTimeout(debounceTimer.current);
    }, [searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="searchable-select-container" ref={dropdownRef}>
            <div 
                className={`searchable-select-display ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedOption ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: '#7B5233', fontWeight: 800, fontSize: '0.8rem', backgroundColor: '#fdf2f2', padding: '2px 6px', borderRadius: '4px' }}>
                            {selectedOption.sku}
                        </span>
                        <span style={{ color: '#1e293b' }}>{selectedOption.name}</span>
                    </div>
                ) : placeholder}
            </div>

            {isOpen && (
                <div className="searchable-select-dropdown">
                    <div className="searchable-select-search-wrapper">
                        {isLoading ? (
                            <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#7B5233' }} />
                        ) : (
                            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        )}
                        <input 
                            type="text"
                            className="searchable-select-search-input"
                            placeholder="Tìm theo Mã hoặc Tên sản phẩm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="searchable-select-options-list">
                        {options.length > 0 ? (
                            options.map(opt => (
                                <div 
                                    key={opt.id}
                                    className={`searchable-select-option ${opt.id === value ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedOption(opt);
                                        onChange(opt.id);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
                                >
                                    <span style={{ color: '#7B5233', fontWeight: 800, fontSize: '0.75rem', minWidth: '80px' }}>
                                        {opt.sku}
                                    </span>
                                    <span style={{ borderLeft: '1px solid #eee', paddingLeft: '10px' }}>{opt.name}</span>
                                </div>
                            ))
                        ) : (
                            <div className="searchable-select-no-results">
                                {isLoading ? 'Đang tìm kiếm...' : 'Không tìm thấy sản phẩm nào'}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const OrderCreate = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
    const routePath = id ? '/admin/orders/edit/:id' : '/admin/orders/create';
    const { screenCode, title, subtitle } = useScreenMetadataCached(routePath);
    const [isLoading, setIsLoading] = useState(false);
    const [boms, setBoms] = useState([]);

    useEffect(() => {
      if (screenCode && title) {
        if (setCustomTitle) setCustomTitle(title);
        if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
        if (setCustomScreenCode) setCustomScreenCode(screenCode);
      }
    }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

    const [orderData, setOrderData] = useState({
        customer: '',
        orderCode: 'ĐH-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
        estimated_date: '',
        finished_date: '',
        note: '',
        status: 'Chờ Lệnh Sản Xuất'
    });

    useEffect(() => {
        const fetchBOMs = async () => {
            try {
                const data = await bomService.getBOMs('', 1000);
                setBoms(data || []);
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu BOM:", error);
            }
        };
        fetchBOMs();
    }, []);

    useEffect(() => {
        if (!id) return;
        const fetchExistingOrder = async () => {
            try {
                setIsLoading(true);
                const existing = await orderService.getById(id);
                if (existing) {
                    setOrderData({
                        customer: existing.customer || '',
                        orderCode: existing.order_code || '',
                        estimated_date: existing.estimated_date ? new Date(existing.estimated_date).toISOString().slice(0, 10) : '',
                        finished_date: existing.finished_date ? new Date(existing.finished_date).toISOString().slice(0, 10) : '',
                        note: existing.note || '',
                        status: existing.order_status === 3 ? 'Hoàn thành' : existing.order_status === 2 ? 'Đang sản xuất' : 'Chờ Lệnh Sản Xuất'
                    });

                    const items = existing.items || [];
                    if (items.length > 0) {
                        setSelectedProducts(items.map((item, idx) => ({
                            id: `p-existing-${idx}-${Date.now()}`,
                            productId: item.master_product_id,
                            quantity: item.quantity || 1,
                            elements: [],
                            isExpanded: false
                        })));
                    }
                }
            } catch (err) {
                console.error("Lỗi khi tải đơn hàng cũ:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchExistingOrder();
    }, [id]);

    const [selectedProducts, setSelectedProducts] = useState([
        { id: `p-${Date.now()}`, productId: '', quantity: 1, elements: [], isExpanded: false }
    ]);

    const handleAddProduct = () => {
        setSelectedProducts([...selectedProducts, { 
            id: `p-${Date.now()}`, 
            productId: '', 
            quantity: 1, 
            elements: [],
            isExpanded: false
        }]);
    };

    const handleSelectProduct = async (internalId, productId) => {
        setIsLoading(true);
        try {
            const productData = await bomService.getBOM(productId);
            if (!productData) return;

            const bomDetails = productData.master_bom_details || [];
            
            const elements = bomDetails.map(el => ({
                id: el.id,
                name: el.name,
                quantity: el.quantity || 1,
                parts: (el.children || []).map(part => ({
                    id: part.id,
                    name: part.name,
                    quantity: part.quantity || 1
                }))
            }));

            setSelectedProducts(selectedProducts.map(p => p.id === internalId ? {
                ...p,
                productId: Number(productId),
                elements: elements,
                isExpanded: true
            } : p));
        } catch (error) {
            console.error("Lỗi khi tải chi tiết sản phẩm:", error);
            setSaveMsg({ type: 'error', text: 'Không thể tải cấu trúc BOM của sản phẩm này.' });
        } finally {
            setIsLoading(false);
        }
    };

    const toggleExpand = (internalId) => {
        setSelectedProducts(selectedProducts.map(p => 
            p.id === internalId ? { ...p, isExpanded: !p.isExpanded } : p
        ));
    };

    const updateQuantity = (internalId, value) => {
        setSelectedProducts(selectedProducts.map(p => 
            p.id === internalId ? { ...p, quantity: parseInt(value) || 1 } : p
        ));
    };

    const updateElementQuantity = (prodInternalId, elementId, value) => {
        setSelectedProducts(selectedProducts.map(p => {
            if (p.id !== prodInternalId) return p;
            return {
                ...p,
                elements: p.elements.map(el => 
                    el.id === elementId ? { ...el, quantity: parseInt(value) || 0 } : el
                )
            };
        }));
    };

    const updatePartQuantity = (prodInternalId, elementId, partId, value) => {
        setSelectedProducts(selectedProducts.map(p => {
            if (p.id !== prodInternalId) return p;
            return {
                ...p,
                elements: p.elements.map(el => {
                    if (el.id !== elementId) return el;
                    return {
                        ...el,
                        parts: el.parts.map(pt => 
                            pt.id === partId ? { ...pt, quantity: parseInt(value) || 0 } : pt
                        )
                    };
                })
            };
        }));
    };

    const handleRemoveProduct = (internalId) => {
        setSelectedProducts(selectedProducts.filter(p => p.id !== internalId));
    };

    const [saveMsg, setSaveMsg] = useState(null);

    const handleSave = async () => {
        if (!orderData.customer.trim()) {
            setSaveMsg({ type: 'error', text: 'Vui lòng nhập tên đơn hàng.' });
            return;
        }
        if (selectedProducts.length === 0 || selectedProducts.some(p => !p.productId)) {
            setSaveMsg({ type: 'error', text: 'Vui lòng chọn ít nhất một sản phẩm.' });
            return;
        }
        setIsLoading(true);
        try {
            const payload = {
                order_code: orderData.orderCode,
                customer: orderData.customer,
                estimated_date: orderData.estimated_date ? new Date(orderData.estimated_date).toISOString() : null,
                finished_date: orderData.finished_date ? new Date(orderData.finished_date).toISOString() : null,
                note: orderData.note || null,
                items: selectedProducts.map(p => ({
                    master_product_id: p.productId,
                    quantity: p.quantity
                }))
            };

            let result;
            if (id) {
                result = await orderService.update(id, payload);
                setSaveMsg({ type: 'success', text: `Đã cập nhật Đơn hàng ${result.order_code || orderData.orderCode} thành công!` });
            } else {
                result = await orderService.create(payload);
                setSaveMsg({ type: 'success', text: `Đã tạo Đơn hàng ${result.order_code} thành công!` });
            }
            setTimeout(() => navigate('/admin/orders'), 1500);
        } catch (error) {
            setSaveMsg({ type: 'error', text: 'Lỗi khi lưu dữ liệu. Thử lại sau.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="manufacture-plan-container" style={{ padding: '10px' }}>
            <div className="card-shadow floating-action-bar" style={{ 
                display: 'flex', justifyContent: 'flex-end', alignItems: 'center', 
                padding: '10px 15px', marginBottom: '1.5rem',
                position: 'sticky', top: '10px', zIndex: '1000', borderRadius: '16px',
                width: '100%', maxWidth: 'calc(100vw - 32px)'
            }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleSave} disabled={isLoading} className="btn btn-primary" style={{ 
                        padding: '8px 16px', borderRadius: '10px', border: 'none', 
                        backgroundColor: '#5d3b32', color: 'white', fontWeight: '700', fontSize: '0.85rem',
                        display: 'flex', alignItems: 'center', gap: '6px', cursor: isLoading ? 'not-allowed' : 'pointer'
                    }}>
                        <Save size={18} />
                        <span className="desktop-only">Lưu Đơn</span>
                    </button>
                </div>
            </div>

            <div className="stats-grid" style={{ 
                display: 'flex', 
                flexDirection: 'row', 
                flexWrap: 'wrap', 
                gap: '24px',
                gridTemplateColumns: '1fr'
            }}>
                
                <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '0' }}>
                    
                    <div className="card-shadow" style={{ padding: '20px', borderLeft: '5px solid #5d3b32' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#666', marginBottom: '8px', display: 'block' }}>TÊN/MÃ ĐƠN HÀNG *</label>
                                <div style={{ position: 'relative' }}>
                                    <ClipboardList size={16} color="#999" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                                    <input type="text" placeholder="Ví dụ: Đơn hàng Tủ bếp chung cư A" value={orderData.customer} onChange={(e) => setOrderData({...orderData, customer: e.target.value})}
                                        className="premium-input" style={{ paddingLeft: '40px' }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>NGÀY BẮT ĐẦU DỰ KIẾN</label>
                                <div style={{ position: 'relative' }}>
                                    <Calendar size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '14px', zIndex: 1 }} />
                                    <input type="date" value={orderData.estimated_date} onChange={(e) => setOrderData({...orderData, estimated_date: e.target.value})}
                                        className="premium-input" style={{ paddingLeft: '40px' }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>NGÀY HOÀN THÀNH DỰ KIẾN</label>
                                <div style={{ position: 'relative' }}>
                                    <Calendar size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '14px', zIndex: 1 }} />
                                    <input type="date" value={orderData.finished_date} onChange={(e) => setOrderData({...orderData, finished_date: e.target.value})}
                                        className="premium-input" style={{ paddingLeft: '40px' }} />
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: '15px' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#666', marginBottom: '8px', display: 'block' }}>GHI CHÚ SẢN XUẤT</label>
                            <textarea placeholder="Ghi chú kỹ thuật hoặc yêu cầu riêng..." value={orderData.note} onChange={(e) => setOrderData({...orderData, note: e.target.value})}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '60px', boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    {selectedProducts.map((prod, pIdx) => (
                        <div key={prod.id} className="card-shadow" style={{ borderRadius: '12px', overflow: 'visible' }}>
                            <div style={{ padding: '15px', backgroundColor: '#f9f9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: '100%' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#5d3b32', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.9rem', flexShrink: 0 }}>
                                        {pIdx + 1}
                                    </div>
                                    <div style={{ flex: 1, minWidth: '240px' }}>
                                        <SearchableSelect 
                                            value={prod.productId} 
                                            onChange={(val) => handleSelectProduct(prod.id, val)}
                                            placeholder="-- CHỌN SẢN PHẨM BOM --"
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#fff', padding: '4px 12px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>SL:</span>
                                        <input type="number" min="1" value={prod.quantity} onChange={(e) => updateQuantity(prod.id, e.target.value)}
                                            style={{ width: '60px', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 800, color: '#5d3b32', fontSize: '1rem', outline: 'none' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div 
                                        onClick={() => toggleExpand(prod.id)}
                                        style={{ 
                                            cursor: 'pointer', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            padding: '4px',
                                            borderRadius: '50%',
                                            backgroundColor: prod.isExpanded ? '#e5e7eb' : 'transparent',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {prod.isExpanded ? <ChevronUp size={20} color="#555" /> : <ChevronDown size={20} color="#555" />}
                                    </div>
                                    {selectedProducts.length > 1 && <X size={20} color="red" style={{ cursor: 'pointer' }} onClick={() => handleRemoveProduct(prod.id)} />}
                                </div>
                            </div>

                            {/* BOM Detail Table - Scrollable for Mobile */}
                            {prod.productId && prod.isExpanded && (
                                <div style={{ overflowX: 'auto', padding: '15px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
                                        <thead>
                                            <tr style={{ fontSize: '0.7rem', color: '#aaa', textTransform: 'uppercase', borderBottom: '1px solid #eee' }}>
                                                <th style={{ textAlign: 'left', padding: '8px' }}>Cấu phần</th>
                                                <th style={{ textAlign: 'center', padding: '8px' }}>Định mức</th>
                                                <th style={{ textAlign: 'center', padding: '8px' }}>Tổng dự kiến</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {prod.elements.map(el => (
                                                <React.Fragment key={el.id}>
                                                    <tr style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                                                        <td style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <Layers size={14} color="#D2B48C" /> {el.name}
                                                        </td>
                                                        <td style={{ textAlign: 'center', padding: '4px' }}>
                                                            <input 
                                                                type="number" 
                                                                value={el.quantity} 
                                                                onChange={(e) => updateElementQuantity(prod.id, el.id, e.target.value)}
                                                                style={{ width: '60px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center', fontSize: '0.85rem' }} 
                                                            />
                                                        </td>
                                                        <td style={{ textAlign: 'center', color: '#5d3b32', fontWeight: 800 }}>{el.quantity * prod.quantity}</td>
                                                    </tr>
                                                    {el.parts.map(part => (
                                                        <tr key={part.id} style={{ fontSize: '0.8rem', color: '#777' }}>
                                                            <td style={{ padding: '4px 4px 4px 30px' }}>• {part.name}</td>
                                                            <td style={{ textAlign: 'center', padding: '4px' }}>
                                                                <input 
                                                                    type="number" 
                                                                    value={part.quantity} 
                                                                    onChange={(e) => updatePartQuantity(prod.id, el.id, part.id, e.target.value)}
                                                                    style={{ width: '60px', padding: '2px', border: '1px solid transparent', background: '#f0f0f0', borderRadius: '4px', textAlign: 'center', fontSize: '0.75rem' }} 
                                                                />
                                                            </td>
                                                            <td style={{ textAlign: 'center' }}>{part.quantity * prod.quantity}</td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}

                    <button onClick={handleAddProduct} style={{ 
                        width: '100%', padding: '15px', border: '2px dashed #ccc', borderRadius: '12px',
                        backgroundColor: '#fdfdfd', color: '#666', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                    }}>
                        <Plus size={20} /> THÊM SẢN PHẨM KHÁC
                    </button>
                </div>

                {/* --- CỘT PHẢI (Sidebar Summary) - Stack below on Mobile --- */}
                <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', color: 'white', padding: '24px', position: 'sticky', top: '20px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Activity size={18} color="#4ADE80" /> TỔNG QUAN ĐƠN HÀNG
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ opacity: 0.6, fontSize: '0.85rem' }}>Số loại máy:</span>
                                <span style={{ fontWeight: 800 }}>{selectedProducts.filter(p => p.productId).length}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ opacity: 0.6, fontSize: '0.85rem' }}>Tổng SL Sản xuất:</span>
                                <span style={{ fontWeight: 800, color: '#4ADE80', fontSize: '1.2rem' }}>
                                    {selectedProducts.reduce((acc, p) => p.productId ? acc + p.quantity : acc, 0)}
                                </span>
                            </div>
                             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ opacity: 0.6, fontSize: '0.85rem' }}>Mã gợi ý:</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{orderData.orderCode}</span>
                            </div>
                        </div>

                        {saveMsg && (
                            <div style={{ 
                                marginTop: '20px', padding: '12px', borderRadius: '8px', 
                                backgroundColor: saveMsg.type === 'success' ? '#065F46' : '#9F1239',
                                fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                {saveMsg.text}
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '0 10px', fontSize: '0.8rem', color: '#999' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                            <Layers size={14} color="#D2B48C" /> Cấu phần Element
                         </div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>•</span> Chi tiết Part
                         </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default OrderCreate;
