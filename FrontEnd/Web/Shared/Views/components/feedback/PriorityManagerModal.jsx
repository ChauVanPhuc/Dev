import { useState, useRef } from 'react';
import { GripVertical, X, Save, Star, Search, CheckCircle2 } from 'lucide-react';
import { planService } from '@modules/Plan/Models/plan.service';
import { orderService } from '@modules/Order/Models/order.service';

export default function PriorityManagerModal({ orders, onClose, onSaved }) {
    const [items, setItems] = useState(() =>
        [...(orders || []).filter(o => o.is_priority === 1 && (o.order_progress || 0) < 100)]
            .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
    );
    const completedItems = (orders || []).filter(o => o.is_priority === 1 && (o.order_progress || 0) >= 100);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [showHelp, setShowHelp] = useState(false);
    const [editingRank, setEditingRank] = useState(null);
    const [rankInputVal, setRankInputVal] = useState('');
    const [rankError, setRankError] = useState('');
    const dragIdx = useRef(null);

    const filtered = searchText.trim()
        ? items.filter(o =>
            o.name?.toLowerCase().includes(searchText.toLowerCase()) ||
            o.customer?.toLowerCase().includes(searchText.toLowerCase())
          )
        : items;

    // --- Drag & Drop ---
    const handleDragStart = (e, realIdx) => {
        dragIdx.current = realIdx;
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDrop = (e, realIdx) => {
        e.preventDefault();
        if (dragIdx.current === null || dragIdx.current === realIdx) return;
        const newItems = [...items];
        const [moved] = newItems.splice(dragIdx.current, 1);
        newItems.splice(realIdx, 0, moved);
        setItems(newItems);
        dragIdx.current = null;
    };

    // --- Di chuyển ---
    const moveItem = (realIdx, direction) => {
        const target = realIdx + direction;
        if (target < 0 || target >= items.length) return;
        const newItems = [...items];
        [newItems[realIdx], newItems[target]] = [newItems[target], newItems[realIdx]];
        setItems(newItems);
    };

    const moveToTop = (realIdx) => {
        if (realIdx === 0) return;
        const newItems = [...items];
        const [moved] = newItems.splice(realIdx, 1);
        newItems.unshift(moved);
        setItems(newItems);
    };

    const moveToBottom = (realIdx) => {
        if (realIdx === items.length - 1) return;
        const newItems = [...items];
        const [moved] = newItems.splice(realIdx, 1);
        newItems.push(moved);
        setItems(newItems);
    };

    // --- Nhập số thứ tự trực tiếp ---
    const startEditRank = (realIdx) => {
        setEditingRank(realIdx);
        setRankInputVal(String(realIdx + 1));
        setRankError('');
    };

    const commitRankEdit = (realIdx) => {
        const val = rankInputVal.trim();
        const newRank = parseInt(val, 10);

        if (!val || isNaN(newRank) || newRank < 1) {
            setRankError(`Vui lòng nhập số từ 1 đến ${items.length}`);
            return;
        }
        if (newRank > items.length) {
            setRankError(`Chỉ có ${items.length} đơn ưu tiên! Nhập từ 1–${items.length}`);
            return;
        }

        if (newRank - 1 !== realIdx) {
            const newItems = [...items];
            const [moved] = newItems.splice(realIdx, 1);
            newItems.splice(newRank - 1, 0, moved);
            setItems(newItems);
        }
        setEditingRank(null);
        setRankInputVal('');
        setRankError('');
    };

    const cancelEdit = () => {
        setEditingRank(null);
        setRankInputVal('');
        setRankError('');
    };

    // --- Lưu ---
    const handleSave = async () => {
        setSaving(true);
        try {
            if (items.length > 0) {
                await planService.reorderPriorities(items.map(o => o.id));
            }
            if (completedItems.length > 0) {
                await Promise.all(
                    completedItems.map(o => orderService.update(o.id, { is_priority: 0 }))
                );
            }
            setSaved(true);
            setTimeout(() => { onSaved(); onClose(); }, 700);
        } catch (err) {
            alert('Có lỗi xảy ra, vui lòng thử lại!');
        } finally {
            setSaving(false);
        }
    };

    const rankColor = (idx) => {
        if (idx === 0) return '#5D4037'; 
        if (idx === 1) return '#8D6E63'; 
        if (idx === 2) return '#A1887F'; 
        return '#CBD5E1'; 
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
        }} onClick={onClose}>
            <div style={{
                background: '#fff', borderRadius: '16px',
                width: '100%', maxWidth: '580px',
                maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 60px rgba(0,0,0,0.3)', overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    background: '#EFEBE9',
                    padding: '18px 24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid #D7CCC8',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Star size={20} fill="#5D4037" color="#5D4037" />
                        <div>
                            <h2 style={{ margin: 0, color: '#5D4037', fontSize: '16px', fontWeight: '700' }}>
                                Quản lý thứ tự ưu tiên
                            </h2>
                            <p style={{ margin: 0, color: '#8D6E63', fontSize: '12px', marginTop: '2px' }}>
                                {items.length} đơn ưu tiên · Kéo thả hoặc bấm số thứ tự
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(0,0,0,0.05)', border: 'none',
                        borderRadius: '8px', width: '30px', height: '30px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5D4037'
                    }}><X size={15} /></button>
                </div>

                {/* Search + Help */}
                <div style={{ flexShrink: 0, borderBottom: '1px solid #f3f4f6', padding: '12px 24px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
                        background: '#f9fafb', border: '1px solid #e5e7eb',
                        borderRadius: '8px', padding: '8px 12px'
                    }}>
                        <Search size={14} color="#9ca3af" />
                        <input
                            type="text"
                            placeholder="Tìm mã đơn..."
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            style={{
                                border: 'none', outline: 'none', background: 'transparent',
                                flex: 1, fontSize: '13px', color: '#374151'
                            }}
                        />
                        {searchText && (
                            <button onClick={() => setSearchText('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}>
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Nút ? Hướng dẫn */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onMouseEnter={() => setShowHelp(true)}
                            onMouseLeave={() => setShowHelp(false)}
                            onFocus={() => setShowHelp(true)}
                            onBlur={() => setShowHelp(false)}
                            style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                border: '2px solid #e5e7eb', background: 'white',
                                cursor: 'pointer', fontWeight: '800', fontSize: '14px',
                                color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}
                        >?</button>
                        {showHelp && (
                            <div style={{
                                position: 'absolute', right: 0, top: '38px', zIndex: 100,
                                background: '#1f2937', color: 'white', borderRadius: '10px',
                                padding: '12px 14px', width: '240px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: '12px', lineHeight: '1.7'
                            }}>
                                <p style={{ margin: '0 0 6px 0', fontWeight: '700', fontSize: '13px' }}>📌 Cách sử dụng</p>
                                <p style={{ margin: '0 0 4px 0' }}>⠿ <b>Kéo thả</b> dòng để thay đổi vị trí</p>
                                <p style={{ margin: '0 0 4px 0' }}>🔢 <b>Bấm vào số</b> thứ tự để nhập vị trí mới</p>
                                <p style={{ margin: '0 0 4px 0' }}>🔍 Tìm kiếm để lọc nhanh</p>
                                <p style={{ margin: 0, color: '#9ca3af', marginTop: '6px', borderTop: '1px solid #374151', paddingTop: '6px' }}>
                                    Đơn #1 được giao hàng <b>trước nhất</b>
                                </p>
                                <div style={{
                                    position: 'absolute', top: '-6px', right: '10px',
                                    width: '12px', height: '12px', background: '#1f2937',
                                    transform: 'rotate(45deg)', borderRadius: '2px'
                                }} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Danh sách */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                            <Search size={28} color="#e5e7eb" />
                            <p style={{ marginTop: '8px' }}>Không tìm thấy đơn hàng phù hợp</p>
                        </div>
                    ) : filtered.map((order) => {
                        const realIdx = items.findIndex(o => o.id === order.id);
                        const isEditing = editingRank === realIdx;
                        return (
                            <div key={order.id}>
                                <div
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        background: '#fff', border: `1.5px solid ${isEditing ? '#5D4037' : '#e5e7eb'}`,
                                        borderRadius: '10px', padding: '10px 12px',
                                        cursor: isEditing ? 'default' : 'grab',
                                        userSelect: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                                        boxShadow: isEditing ? '0 3px 10px rgba(93, 64, 55, 0.15)' : '0 1px 3px rgba(0,0,0,0.04)'
                                    }}
                                    draggable={!isEditing}
                                    onDragStart={e => handleDragStart(e, realIdx)}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={e => handleDrop(e, realIdx)}
                                >
                                    {/* Grip handle */}
                                    {!isEditing && <GripVertical size={16} color="#d1d5db" style={{ flexShrink: 0 }} />}

                                    {/* Rank — bấm để nhập vị trí */}
                                    {isEditing ? (
                                        <input
                                            autoFocus
                                            type="number"
                                            min={1}
                                            max={items.length}
                                            value={rankInputVal}
                                            onChange={e => { setRankInputVal(e.target.value); setRankError(''); }}
                                            onBlur={() => commitRankEdit(realIdx)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') commitRankEdit(realIdx);
                                                if (e.key === 'Escape') cancelEdit();
                                            }}
                                            style={{
                                                width: '44px', height: '36px',
                                                border: `2px solid ${rankError ? '#5D4037' : rankColor(realIdx)}`,
                                                borderRadius: '8px', textAlign: 'center',
                                                fontWeight: '800', fontSize: '14px',
                                                color: rankColor(realIdx), outline: 'none',
                                                background: 'white', flexShrink: 0
                                            }}
                                        />
                                    ) : (
                                        <div
                                            onClick={() => startEditRank(realIdx)}
                                            title={`Bấm để thay đổi vị trí (hiện tại: #${realIdx + 1})`}
                                            style={{
                                                minWidth: '36px', height: '36px',
                                                background: rankColor(realIdx),
                                                borderRadius: '8px', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontWeight: '800', fontSize: '13px',
                                                cursor: 'pointer', flexShrink: 0,
                                                transition: 'transform 0.12s, opacity 0.12s',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.opacity = '0.9'; }}
                                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
                                        >
                                            {realIdx + 1}
                                        </div>
                                    )}

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: '#1f2937' }}>
                                            {order.name}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>
                                            {order.customer || '—'}
                                        </p>
                                    </div>

                                    {/* Progress */}
                                    <span style={{
                                        background: '#f3f4f6', borderRadius: '6px',
                                        padding: '3px 8px', fontSize: '11px', fontWeight: '700',
                                        color: '#374151', flexShrink: 0
                                    }}>
                                        {Math.round((order.order_progress || 0) * (order.order_progress > 1 ? 1 : 100))}%
                                    </span>

                                </div>

                                {/* Thông báo lỗi nhập số - chỉ hiện khi đang edit dòng này */}
                                {isEditing && rankError && (
                                    <div style={{
                                        marginTop: '4px', padding: '6px 10px',
                                        background: '#fef2f2', border: '1px solid #fecaca',
                                        borderRadius: '6px', fontSize: '12px',
                                        color: '#5D4037', fontWeight: '600',
                                        display: 'flex', alignItems: 'center', gap: '6px'
                                    }}>
                                        ⚠️ {rankError}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Section đơn đã hoàn thành 100% */}
                    {completedItems.length > 0 && !searchText && (
                        <div style={{ marginTop: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 4px', marginBottom: '6px' }}>
                                <CheckCircle2 size={13} color="#16a34a" />
                                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700' }}>
                                    ĐÃ HOÀN THÀNH — Sẽ tự động bỏ ưu tiên khi lưu
                                </span>
                            </div>
                            {completedItems.map(order => (
                                <div key={order.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                                    borderRadius: '10px', padding: '10px 12px', marginBottom: '6px', opacity: 0.85
                                }}>
                                    <div style={{
                                        minWidth: '36px', height: '36px', background: '#16a34a',
                                        borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                    }}>
                                        <CheckCircle2 size={18} color="white" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: '#166534' }}>
                                            {order.name}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '11px', color: '#4ade80', marginTop: '1px' }}>
                                            {order.customer || '—'}
                                        </p>
                                    </div>
                                    <span style={{
                                        background: '#dcfce7', borderRadius: '6px',
                                        padding: '3px 10px', fontSize: '12px', fontWeight: '800', color: '#16a34a'
                                    }}>100%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '14px 24px', borderTop: '1px solid #f3f4f6',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#fafafa', flexShrink: 0
                }}>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {searchText ? `Đang lọc · ${filtered.length}/${items.length}` : `${items.length} đang ưu tiên`}
                        {completedItems.length > 0 && (
                            <span style={{ color: '#16a34a', marginLeft: '8px', fontWeight: '600' }}>
                                · {completedItems.length} hoàn thành → sẽ bỏ ưu tiên
                            </span>
                        )}
                    </span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={onClose} style={{
                            padding: '9px 18px', borderRadius: '8px',
                            border: '1.5px solid #e5e7eb', background: 'white',
                            cursor: 'pointer', fontWeight: '600', fontSize: '13px', color: '#374151'
                        }}>Hủy</button>
                        <button onClick={handleSave} disabled={saving || saved} style={{
                            padding: '9px 22px', borderRadius: '8px', border: 'none',
                            background: saved ? '#26A69A' : saving ? '#9ca3af' : '#5D4037',
                            color: 'white', cursor: saving || saved ? 'not-allowed' : 'pointer',
                            fontWeight: '700', fontSize: '13px',
                            display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.2s'
                        }}>
                            <Save size={14} />
                            {saved ? '✓ Đã lưu!' : saving ? 'Đang lưu...' : 'Lưu thứ tự'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
