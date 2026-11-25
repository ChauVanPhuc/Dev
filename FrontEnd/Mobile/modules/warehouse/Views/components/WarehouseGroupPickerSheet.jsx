import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X, Search, CheckSquare, Square, MinusSquare, FolderCheck, Check, AlertCircle, ChevronDown, ChevronRight,
} from 'lucide-react';
import { formatNumberVN } from '../../constants/warehouseConstants';

const UNGROUPED = 'Chưa phân nhóm';
const groupOf = (m) => m.group_type || UNGROUPED;

/**
 * Bottom Sheet chọn nhóm vật tư bàn giao theo PO.
 * - Tích chọn nhóm => tự động xổ danh sách vật tư con của nhóm (mặc định tích tất cả mã con).
 * - Có thể bỏ tích / tích lẻ từng mã vật tư bên trong nhóm.
 * - Bấm "Áp dụng" => trả về (danh sách nhóm, danh sách mã vật tư đã chọn).
 */
const WarehouseGroupPickerSheet = ({
  isOpen,
  onClose,
  poCode = '',
  groups = [], // Array of { name, count, inStockCount }
  selectedGroups = [], // Array of string
  materials = [], // Array vật tư chi tiết { item_code, item_name, unit1, required_qty, available_stock, group_type }
  selectedItemCodes = [], // Mã vật tư đang có trong phiếu
  onApply, // (groups: string[], itemCodes: string[]) => void
}) => {
  const [tempCodes, setTempCodes] = useState(new Set());
  const [expanded, setExpanded] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const wasOpenRef = useRef(false);

  // Gom vật tư theo nhóm
  const itemsByGroup = useMemo(() => {
    const map = {};
    (materials || []).forEach((m) => {
      const g = groupOf(m);
      if (!map[g]) map[g] = [];
      map[g].push(m);
    });
    return map;
  }, [materials]);

  // Chỉ đồng bộ trạng thái ban đầu tại thời điểm MỞ Sheet (tránh reset khi parent re-render)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const groupSet = new Set(selectedGroups);
      const codeSet = new Set(selectedItemCodes || []);
      const init = new Set();
      (materials || []).forEach((m) => {
        if (groupSet.has(groupOf(m)) && (codeSet.size === 0 || codeSet.has(m.item_code))) {
          init.add(m.item_code);
        }
      });
      setTempCodes(init);
      setExpanded(new Set());
      setSearchQuery('');
    }
    wasOpenRef.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      if (String(g.name || '').toLowerCase().includes(q)) return true;
      return (itemsByGroup[g.name] || []).some(
        (m) => String(m.item_code || '').toLowerCase().includes(q) || String(m.item_name || '').toLowerCase().includes(q)
      );
    });
  }, [groups, searchQuery, itemsByGroup]);

  const totalAllItems = useMemo(() => groups.reduce((s, g) => s + (Number(g.count) || 0), 0), [groups]);

  const groupSelectedCount = (name) => (itemsByGroup[name] || []).filter((m) => tempCodes.has(m.item_code)).length;

  const selectedGroupNames = useMemo(
    () => groups.filter((g) => (itemsByGroup[g.name] || []).some((m) => tempCodes.has(m.item_code))).map((g) => g.name),
    [groups, itemsByGroup, tempCodes]
  );

  if (!isOpen) return null;

  const toggleExpand = (name) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleToggleGroup = (name) => {
    const items = itemsByGroup[name] || [];
    const allChecked = items.length > 0 && items.every((m) => tempCodes.has(m.item_code));
    setTempCodes((prev) => {
      const next = new Set(prev);
      items.forEach((m) => {
        if (allChecked) next.delete(m.item_code);
        else next.add(m.item_code);
      });
      return next;
    });
    // Chọn nhóm => tự động xổ danh sách vật tư con
    if (!allChecked) {
      setExpanded((prev) => new Set(prev).add(name));
    }
  };

  const handleToggleItem = (code) => {
    setTempCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleSelectAll = () => setTempCodes(new Set((materials || []).map((m) => m.item_code)));
  const handleDeselectAll = () => setTempCodes(new Set());

  const handleConfirm = () => {
    if (tempCodes.size === 0) return;
    onApply(selectedGroupNames, Array.from(tempCodes));
    onClose();
  };

  const isAllSelected = (materials || []).length > 0 && tempCodes.size === (materials || []).length;
  const isNoneSelected = tempCodes.size === 0;

  return (
    <div className="mwh-sheet-backdrop" onClick={onClose}>
      <div className="mwh-sheet mwh-group-picker-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mwh-sheet-head">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FolderCheck size={18} style={{ color: '#7B5233', flexShrink: 0 }} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#5C2D0E' }}>
                Chọn nhóm vật tư bàn giao
              </h3>
            </div>
            <div style={{ fontSize: '11.5px', color: '#78716C', marginTop: 3 }}>
              {poCode ? <span>PO: <strong>{poCode}</strong> • </span> : null}
              {groups.length} nhóm ({formatNumberVN(totalAllItems)} loại vật tư)
            </div>
          </div>
          <button type="button" className="mwh-sheet-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="mwh-gps-toolbar">
          {groups.length > 4 && (
            <div className="mwh-gps-search-box">
              <Search size={14} className="mwh-gps-search-icon" />
              <input
                type="text"
                className="mwh-gps-search-input"
                placeholder="Tìm nhóm, mã hoặc tên vật tư..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" className="mwh-gps-search-clear" onClick={() => setSearchQuery('')}>
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          <div className="mwh-gps-quick-actions">
            <button
              type="button"
              className={`mwh-gps-quick-btn ${isAllSelected ? 'active' : ''}`}
              onClick={handleSelectAll}
            >
              <CheckSquare size={13} />
              <span>Chọn tất cả ({groups.length})</span>
            </button>
            <button
              type="button"
              className={`mwh-gps-quick-btn ${isNoneSelected ? 'active' : ''}`}
              onClick={handleDeselectAll}
            >
              <Square size={13} />
              <span>Bỏ chọn tất cả</span>
            </button>
          </div>
        </div>

        {/* Danh sách nhóm + vật tư con */}
        <div className="mwh-sheet-body mwh-gps-body">
          {filteredGroups.length === 0 ? (
            <div className="mwh-empty" style={{ padding: '24px 12px' }}>
              <span>Không tìm thấy nhóm / vật tư nào khớp với "{searchQuery}"</span>
            </div>
          ) : (
            filteredGroups.map((g) => {
              const items = itemsByGroup[g.name] || [];
              const selCount = groupSelectedCount(g.name);
              const isFull = items.length > 0 && selCount === items.length;
              const isPartial = selCount > 0 && !isFull;
              const isExpanded = expanded.has(g.name) || (searchQuery.trim() !== '');
              const hasStock = Number(g.inStockCount || 0) > 0;
              const q = searchQuery.trim().toLowerCase();
              const visibleItems = q && !String(g.name || '').toLowerCase().includes(q)
                ? items.filter((m) =>
                  String(m.item_code || '').toLowerCase().includes(q) || String(m.item_name || '').toLowerCase().includes(q))
                : items;

              return (
                <div key={g.name} className={`mwh-gps-group ${selCount > 0 ? 'selected' : ''}`}>
                  <div className={`mwh-gps-row ${selCount > 0 ? 'selected' : ''}`} onClick={() => handleToggleGroup(g.name)}>
                    <div className="mwh-gps-checkbox-wrap">
                      {isFull ? (
                        <CheckSquare size={18} className="mwh-gps-checkbox-icon--checked" />
                      ) : isPartial ? (
                        <MinusSquare size={18} className="mwh-gps-checkbox-icon--checked" />
                      ) : (
                        <Square size={18} className="mwh-gps-checkbox-icon--unchecked" />
                      )}
                    </div>

                    <div className="mwh-gps-info">
                      <div className="mwh-gps-name">{g.name}</div>
                      <div className="mwh-gps-meta">
                        <span className={`mwh-gps-stock-status ${hasStock ? 'in-stock' : 'out-stock'}`}>
                          ● {g.inStockCount || 0}/{g.count} mã còn tồn
                        </span>
                        {selCount > 0 && (
                          <span className="mwh-gps-sel-count">• Đã chọn {selCount}/{items.length}</span>
                        )}
                      </div>
                    </div>

                    <div className="mwh-gps-badge">
                      <span className="mwh-gps-count-pill">{g.count} VT</span>
                    </div>

                    {items.length > 0 && (
                      <button
                        type="button"
                        className="mwh-gps-expand-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(g.name);
                        }}
                        aria-label={isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    )}
                  </div>

                  {isExpanded && visibleItems.length > 0 && (
                    <div className="mwh-gps-items">
                      {visibleItems.map((m) => {
                        const checked = tempCodes.has(m.item_code);
                        const stock = Number(m.available_stock || 0);
                        const req = Number(m.required_qty || 0);
                        const enough = stock > 0 && stock + 0.0001 >= req;
                        return (
                          <div
                            key={m.item_code}
                            className={`mwh-gps-item ${checked ? 'checked' : ''}`}
                            onClick={() => handleToggleItem(m.item_code)}
                          >
                            <div className="mwh-gps-item-check">
                              {checked ? (
                                <CheckSquare size={15} className="mwh-gps-checkbox-icon--checked" />
                              ) : (
                                <Square size={15} className="mwh-gps-checkbox-icon--unchecked" />
                              )}
                            </div>
                            <div className="mwh-gps-item-info">
                              <div className="mwh-gps-item-code">{m.item_code}</div>
                              <div className="mwh-gps-item-name" title={m.item_name}>{m.item_name}</div>
                              <div className="mwh-gps-item-meta">
                                <span className="mwh-gps-item-quota">
                                  Định mức: <strong>{formatNumberVN(req)}</strong> {m.unit1 || ''}
                                </span>
                                <span className={`mwh-gps-item-stock ${stock <= 0 ? 'zero' : enough ? 'ok' : 'low'}`}>
                                  Tồn: <strong>{formatNumberVN(stock)}</strong>
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mwh-gps-footer">
          {isNoneSelected && (
            <div className="mwh-gps-warning-tip">
              <AlertCircle size={13} />
              <span>Vui lòng chọn ít nhất 1 nhóm / vật tư để bàn giao</span>
            </div>
          )}

          <div className="mwh-gps-btn-row">
            <button type="button" className="mwh-gps-btn-cancel" onClick={onClose}>
              Hủy
            </button>
            <button
              type="button"
              disabled={isNoneSelected}
              className={`mwh-gps-btn-apply ${isNoneSelected ? 'disabled' : ''}`}
              onClick={handleConfirm}
            >
              <Check size={16} />
              <span>
                {isNoneSelected
                  ? 'Chưa chọn vật tư nào'
                  : `Áp dụng (${selectedGroupNames.length} nhóm • ${formatNumberVN(tempCodes.size)} vật tư)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseGroupPickerSheet;
