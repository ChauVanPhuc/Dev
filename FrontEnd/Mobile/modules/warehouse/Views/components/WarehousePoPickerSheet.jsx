import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Search,
  CheckSquare,
  Square,
  Plus,
  Building2,
  Check,
  Loader2,
} from 'lucide-react';
import mobileWarehouseService from '../../services/mobileWarehouseService';

/**
 * Bottom Sheet chọn nhiều Lệnh sản xuất / Đơn hàng PO trên Mobile (/warehouse/handover/new).
 * - Cho phép tìm kiếm server-side và tick chọn nhiều PO liên tiếp mà không bị đóng Sheet.
 * - Hiển thị thanh chip các PO đang chọn để gỡ nhanh.
 * - Hỗ trợ nút "Chọn tất cả kết quả lọc" và thêm mã PO nhập tay nếu chưa có trong gợi ý.
 */
const WarehousePoPickerSheet = ({
  isOpen,
  onClose,
  selectedPos = [],
  initialOptions = [],
  onApply, // (poList: string[], matchedMetaMap: Record<string, any>) => void
}) => {
  const [tempSelected, setTempSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState(initialOptions || []);
  const [searching, setSearching] = useState(false);
  const wasOpenRef = useRef(false);
  const searchTimerRef = useRef(null);
  const metaMapRef = useRef({});

  // Lưu metadata (customer, label...) của các PO đã thấy để truyền ngược lại Form
  const rememberOptions = (opts = []) => {
    (opts || []).forEach((o) => {
      const code = String(o?.value || '').trim();
      if (code) metaMapRef.current[code] = o;
    });
  };

  useEffect(() => {
    rememberOptions(initialOptions);
    if (!searchQuery.trim() && Array.isArray(initialOptions) && initialOptions.length > 0) {
      setOptions(initialOptions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOptions]);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setTempSelected(Array.from(new Set((selectedPos || []).map((c) => String(c || '').trim()).filter(Boolean))));
      setSearchQuery('');
      setOptions(initialOptions || []);
      rememberOptions(initialOptions);
    }
    wasOpenRef.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const selectedSet = useMemo(() => new Set(tempSelected), [tempSelected]);

  if (!isOpen) return null;

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await mobileWarehouseService.getSubPoCodes({ search: val.trim(), limit: 100 });
        rememberOptions(res);
        setOptions(res || []);
      } catch (err) {
        console.warn('[WarehousePoPickerSheet] Lỗi tìm kiếm PO:', err);
      } finally {
        setSearching(false);
      }
    }, 220);
  };

  const handleClearSearch = async () => {
    setSearchQuery('');
    setOptions(initialOptions || []);
  };

  const togglePo = (code) => {
    const clean = String(code || '').trim();
    if (!clean) return;
    setTempSelected((prev) =>
      prev.includes(clean) ? prev.filter((c) => c !== clean) : [...prev, clean]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleCodes = (options || []).map((o) => String(o?.value || '').trim()).filter(Boolean);
    if (visibleCodes.length === 0) return;
    setTempSelected((prev) => Array.from(new Set([...prev, ...visibleCodes])));
  };

  const handleClearAll = () => {
    setTempSelected([]);
  };

  const trimmedQuery = searchQuery.trim().toUpperCase();
  const canAddCustomPo =
    trimmedQuery.length >= 2 &&
    !selectedSet.has(trimmedQuery) &&
    !(options || []).some((o) => String(o?.value || '').trim().toUpperCase() === trimmedQuery);

  const handleAddCustomPo = () => {
    if (!trimmedQuery) return;
    setTempSelected((prev) => (prev.includes(trimmedQuery) ? prev : [...prev, trimmedQuery]));
    setSearchQuery('');
  };

  const handleConfirm = () => {
    if (onApply) {
      onApply(tempSelected, metaMapRef.current);
    }
    onClose();
  };

  return (
    <div className="mwh-sheet-backdrop" onClick={onClose}>
      <div className="mwh-sheet mwh-po-picker-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mwh-sheet-head">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={18} style={{ color: '#7B5233', flexShrink: 0 }} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#5C2D0E' }}>
                Chọn Lệnh SX / Đơn hàng PO
              </h3>
            </div>
            <div style={{ fontSize: '11.5px', color: '#78716C', marginTop: 2 }}>
              Chạm để chọn nhiều PO cùng lúc • Đang chọn: <strong>{tempSelected.length} PO</strong>
            </div>
          </div>
          <button type="button" className="mwh-sheet-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Toolbar tìm kiếm + Khay chip PO đang chọn */}
        <div className="mwh-gps-toolbar">
          <div className="mwh-gps-search-box">
            <Search size={14} className="mwh-gps-search-icon" />
            <input
              type="text"
              className="mwh-gps-search-input"
              placeholder="Gõ tìm mã PO (VD: APT-0123, ADV-0406)..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {searching ? (
              <Loader2 size={14} className="mwh-po-spin" />
            ) : searchQuery ? (
              <button type="button" className="mwh-gps-search-clear" onClick={handleClearSearch}>
                <X size={12} />
              </button>
            ) : null}
          </div>

          {tempSelected.length > 0 && (
            <div className="mwh-po-selected-strip">
              {tempSelected.map((code) => (
                <span key={code} className="mwh-po-chip mwh-po-chip--sheet">
                  <span>{code}</span>
                  <button
                    type="button"
                    className="mwh-po-chip-x"
                    onClick={() => togglePo(code)}
                    aria-label={`Bỏ ${code}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="mwh-gps-quick-actions">
            {options.length > 0 && (
              <button
                type="button"
                className="mwh-gps-quick-btn"
                onClick={handleSelectAllVisible}
              >
                <CheckSquare size={13} />
                <span>Chọn đang hiển thị ({options.length})</span>
              </button>
            )}
            {tempSelected.length > 0 && (
              <button
                type="button"
                className="mwh-gps-quick-btn"
                onClick={handleClearAll}
              >
                <Square size={13} />
                <span>Bỏ chọn hết</span>
              </button>
            )}
          </div>
        </div>

        {/* Danh sách PO */}
        <div className="mwh-sheet-body mwh-po-sheet-body">
          {canAddCustomPo && (
            <button
              type="button"
              className="mwh-po-custom-add"
              onClick={handleAddCustomPo}
            >
              <Plus size={14} />
              <span>Thêm mã PO nhập tay: <strong>{trimmedQuery}</strong></span>
            </button>
          )}

          {options.length === 0 ? (
            <div className="mwh-empty" style={{ padding: '24px 12px' }}>
              <span>{searching ? 'Đang tìm kiếm PO...' : 'Không tìm thấy mã PO phù hợp.'}</span>
            </div>
          ) : (
            options.map((opt) => {
              const code = String(opt?.value || '').trim();
              if (!code) return null;
              const isChecked = selectedSet.has(code);
              const subLabel = opt?.customer || (opt?.label && opt.label !== code ? opt.label : '');

              return (
                <button
                  key={code}
                  type="button"
                  className={`mwh-po-option-row ${isChecked ? 'checked' : ''}`}
                  onClick={() => togglePo(code)}
                >
                  <div className="mwh-po-option-check">
                    {isChecked ? (
                      <CheckSquare size={18} color="#7B5233" />
                    ) : (
                      <Square size={18} color="#A89888" />
                    )}
                  </div>
                  <div className="mwh-po-option-info">
                    <div className="mwh-po-option-code">{code}</div>
                    {subLabel && subLabel !== code && (
                      <div className="mwh-po-option-sub">{subLabel}</div>
                    )}
                  </div>
                  {isChecked && (
                    <span className="mwh-po-option-tag">Đã chọn</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer cố định */}
        <div className="mwh-sheet-foot">
          <button type="button" className="mwh-btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button
            type="button"
            className="mwh-btn-primary"
            style={{ flex: 1 }}
            onClick={handleConfirm}
          >
            <Check size={15} />
            <span>
              {tempSelected.length > 0
                ? `Áp dụng (${tempSelected.length} PO)`
                : 'Xác nhận bỏ chọn PO'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarehousePoPickerSheet;

