import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Plus, PackageCheck, Loader2 } from 'lucide-react';
import mobileWarehouseService from '../../services/mobileWarehouseService';
import { formatNumberVN } from '../../constants/warehouseConstants';

/**
 * Sheet chọn nhanh vật tư trong kho / danh mục CSDL (hỗ trợ tìm kiếm, lọc theo kho hoặc nhập mã mới).
 */
const WarehousePickerSheet = ({
  isOpen,
  onClose,
  onSelect,
  materials = [],
  units = [],
  warehouseName = '',
  onlyInStock = false,
  allowCustomNew = false,
  stockBadgePrefix = 'Tồn',
  emptyText = '',
  title = 'Chọn vật tư / hàng hóa',
}) => {
  const [query, setQuery] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('cái');
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setCustomMode(false);
      setCustomCode('');
      setCustomName('');
      setCatalogError('');
      if (units.length > 0) setCustomUnit(units[0].code);
    }
  }, [isOpen, units]);

  useEffect(() => {
    if (!isOpen || onlyInStock) {
      setCatalogItems([]);
      setCatalogLoading(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setCatalogLoading(true);
      setCatalogError('');
      try {
        const items = await mobileWarehouseService.searchCatalog({
          search: query.trim(),
          warehouseCode: 'ALL',
          limit: 60,
        });
        if (!cancelled) setCatalogItems(items);
      } catch (err) {
        if (!cancelled) {
          setCatalogError(err?.response?.data?.detail || 'Không tải được danh mục từ CSDL.');
          setCatalogItems([]);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, onlyInStock, query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const targetWh = String(warehouseName || '').trim().toLowerCase();

    const localMatches = (materials || []).filter((m) => {
      if (targetWh && String(m.warehouse_name || '').trim().toLowerCase() !== targetWh) {
        return false;
      }
      if (onlyInStock && Number(m.closing_main || 0) <= 0) {
        return false;
      }
      if (!q) return true;
      return (
        String(m.item_code || '').toLowerCase().includes(q) ||
        String(m.item_name || '').toLowerCase().includes(q) ||
        String(m.origin_voucher_no || '').toLowerCase().includes(q)
      );
    });

    if (onlyInStock) {
      return localMatches.slice(0, 80);
    }

    const merged = [...localMatches.map((m) => ({ ...m, source: m.source || 'Kho' }))];
    const seen = new Set(merged.map((m) => String(m.item_code || '').trim().toLowerCase()));
    for (const c of catalogItems) {
      const codeKey = String(c.item_code || '').trim().toLowerCase();
      if (!codeKey || seen.has(codeKey)) continue;
      seen.add(codeKey);
      merged.push({
        ...c,
        warehouse_name: c.warehouse_name || warehouseName,
      });
    }
    return merged.slice(0, 80);
  }, [materials, catalogItems, warehouseName, onlyInStock, query]);

  if (!isOpen) return null;

  const handleConfirmCustom = () => {
    if (!customCode.trim() || !customName.trim()) return;
    onSelect({
      item_code: customCode.trim().toUpperCase(),
      item_name: customName.trim(),
      unit_main: customUnit || 'cái',
      unit_conversion: '',
      conversion_rate: 1,
      closing_main: 0,
      warehouse_name: warehouseName,
    });
    onClose();
  };

  return (
    <div className="mwh-sheet-backdrop" onClick={onClose}>
      <div className="mwh-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="mwh-sheet-head">
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#422918' }}>{title}</div>
            {warehouseName && (
              <div style={{ fontSize: '11.5px', color: '#7b6456' }}>Kho: {warehouseName}</div>
            )}
          </div>
          <button type="button" className="mwh-icon-btn" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1e6d8', display: 'flex', gap: '8px' }}>
          <div className="mwh-search-box">
            <Search size={15} className="mwh-search-icon" />
            <input
              type="text"
              className="mwh-search-input"
              placeholder="Tìm mã hoặc tên vật tư..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {allowCustomNew && (
            <button
              type="button"
              className="mwh-btn-secondary"
              onClick={() => setCustomMode((v) => !v)}
              style={{ padding: '6px 10px', fontSize: '12px' }}
            >
              <Plus size={14} /> Mã mới
            </button>
          )}
        </div>

        <div className="mwh-sheet-body">
          {customMode && allowCustomNew ? (
            <div className="mwh-item-card">
              <div className="mwh-section-title" style={{ marginBottom: 4 }}>Khai báo mã vật tư mới vào kho</div>
              <div className="mwh-field-group">
                <label className="mwh-label">Mã vật tư <span className="mwh-req">*</span></label>
                <input
                  className="mwh-input"
                  placeholder="VD: GO-SOI-2026"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                />
              </div>
              <div className="mwh-field-group">
                <label className="mwh-label">Tên mặt hàng <span className="mwh-req">*</span></label>
                <input
                  className="mwh-input"
                  placeholder="VD: Gỗ Sồi trắng sấy 25mm"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>
              <div className="mwh-field-group">
                <label className="mwh-label">Đơn vị tính chính (ĐVT1)</label>
                <select className="mwh-select" value={customUnit} onChange={(e) => setCustomUnit(e.target.value)}>
                  {(units.length > 0 ? units : [{ code: 'cái' }, { code: 'Tấm' }, { code: 'm3' }, { code: 'Kg' }]).map((u) => (
                    <option key={u.code} value={u.code}>{u.code}{u.full_name ? ` (${u.full_name})` : ''}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="mwh-btn-primary"
                disabled={!customCode.trim() || !customName.trim()}
                onClick={handleConfirmCustom}
              >
                <PackageCheck size={16} /> Thêm mặt hàng này vào phiếu
              </button>
            </div>
          ) : catalogLoading && filtered.length === 0 ? (
            <div className="mwh-empty">
              <Loader2 size={20} className="spin" />
              <span>Đang tải danh mục vật tư từ CSDL...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mwh-empty">
              <span>
                {catalogError
                  ? catalogError
                  : emptyText || `Không tìm thấy vật tư phù hợp${onlyInStock && warehouseName ? ` còn tồn trong ${warehouseName}` : ''}.`}
              </span>
              {allowCustomNew && (
                <button type="button" className="mwh-btn-secondary" onClick={() => { setCustomCode(query.toUpperCase()); setCustomMode(true); }}>
                  <Plus size={14} /> Thêm mã mới "{query || '...'}"
                </button>
              )}
            </div>
          ) : (
            filtered.map((m, idx) => {
              const stock = Number(m.closing_main || 0);
              const unitLabel = m.unit_main || m.unit || 'Cái';
              return (
                <div
                  key={`${m.warehouse_code || m.source || 'DB'}_${m.item_code}_${idx}`}
                  className="mwh-pick-row"
                  onClick={() => {
                    onSelect({ ...m, unit_main: unitLabel });
                    onClose();
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, color: '#5c2d0e', fontSize: '13.5px' }}>{m.item_code}</span>
                      {m.source && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 6,
                            background: m.source === 'Kho' ? '#FEF3C7' : '#EFE7DC',
                            color: '#7B5233',
                          }}
                        >
                          {m.source}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#374151', marginTop: 2 }}>{m.item_name}</div>
                    <div style={{ fontSize: '11px', color: '#7b6456', marginTop: 2 }}>
                      {m.origin_voucher_no ? `${m.origin_voucher_no} • ` : ''}
                      {m.warehouse_name ? `${m.warehouse_name} • ` : ''}
                      {m.factory_name ? `${m.factory_name} • ` : ''}
                      ĐVT: {unitLabel}
                      {m.unit_conversion ? ` → ${m.unit_conversion} (x${m.conversion_rate || 1})` : ''}
                      {m.po_code ? ` • PO: ${m.po_code}` : ''}
                    </div>
                  </div>
                  <span className={`mwh-stock-pill ${stock <= 0 ? 'mwh-stock-pill--danger' : ''}`}>
                    {stock > 0 || m.source === 'Kho' ? `${stockBadgePrefix}: ${formatNumberVN(stock)} ${unitLabel}` : 'Chưa tồn kho'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default WarehousePickerSheet;

