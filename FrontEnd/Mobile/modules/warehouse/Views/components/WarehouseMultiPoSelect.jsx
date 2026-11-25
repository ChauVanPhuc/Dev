import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, ChevronUp, X, CheckSquare, Square, Check, Plus, Loader2 } from 'lucide-react';
import mobileWarehouseService from '../../services/mobileWarehouseService';

/**
 * Dropdown chọn nhiều PO inline (giữ nguyên giao diện gọn đẹp như dropdown cũ,
 * bổ sung ô checkbox để tick chọn nhiều PO cùng lúc + chip hiển thị các PO đã chọn).
 */
const WarehouseMultiPoSelect = ({
  selectedPos = [],
  initialOptions = [],
  loadingMaterials = false,
  onApply, // (poList: string[], metaMap: Record<string, any>) => void
  onRemoveSingle, // (poCode: string) => void
  placeholder = 'Gõ tìm kiếm PO (ví dụ: APT-0123-01, ADV-0406-01)...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState(initialOptions || []);
  const [searching, setSearching] = useState(false);
  const [draftSelected, setDraftSelected] = useState(selectedPos || []);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const searchTimerRef = useRef(null);
  const metaMapRef = useRef({});

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

  // Đồng bộ draftSelected khi selectedPos thay đổi từ bên ngoài (và đang đóng dropdown)
  useEffect(() => {
    if (!isOpen) {
      setDraftSelected(selectedPos || []);
    }
  }, [selectedPos, isOpen]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // Đóng dropdown khi chạm ra ngoài
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery('');
        setDraftSelected(selectedPos || []);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [isOpen, selectedPos]);

  const draftSet = useMemo(() => new Set(draftSelected), [draftSelected]);

  const hasPendingChanges = useMemo(() => {
    const a = selectedPos || [];
    const b = draftSelected || [];
    if (a.length !== b.length) return true;
    const setA = new Set(a);
    return b.some((x) => !setA.has(x));
  }, [selectedPos, draftSelected]);

  const openDropdown = () => {
    setDraftSelected(selectedPos || []);
    setIsOpen(true);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!isOpen) openDropdown();

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await mobileWarehouseService.getSubPoCodes({ search: val.trim(), limit: 100 });
        rememberOptions(res);
        setOptions(res || []);
      } catch (err) {
        console.warn('[WarehouseMultiPoSelect] Lỗi tìm kiếm PO:', err);
      } finally {
        setSearching(false);
      }
    }, 220);
  };

  const togglePoInDraft = (code) => {
    const clean = String(code || '').trim();
    if (!clean) return;
    setDraftSelected((prev) =>
      prev.includes(clean) ? prev.filter((c) => c !== clean) : [...prev, clean]
    );
  };

  const handleConfirmApply = () => {
    setIsOpen(false);
    setSearchQuery('');
    if (inputRef.current) inputRef.current.blur();
    if (onApply) {
      onApply(draftSelected, metaMapRef.current);
    }
  };

  const handleCancelDropdown = () => {
    setIsOpen(false);
    setSearchQuery('');
    setDraftSelected(selectedPos || []);
    if (inputRef.current) inputRef.current.blur();
  };

  const handleClearInputOrAll = (e) => {
    e.stopPropagation();
    if (searchQuery) {
      setSearchQuery('');
      setOptions(initialOptions || []);
      return;
    }
    if (isOpen) {
      setDraftSelected([]);
    } else if (selectedPos.length > 0 && onApply) {
      onApply([], metaMapRef.current);
    }
  };

  const trimmedQuery = searchQuery.trim().toUpperCase();
  const canAddCustomPo =
    trimmedQuery.length >= 2 &&
    !draftSet.has(trimmedQuery) &&
    !(options || []).some((o) => String(o?.value || '').trim().toUpperCase() === trimmedQuery);

  const displayedChips = isOpen ? draftSelected : selectedPos;

  return (
    <div className="mwh-mpo-wrap" ref={containerRef}>
      {/* Ô Input + Chip PO giống hệt CustomSelect cũ */}
      <div
        className={`mwh-mpo-control ${isOpen ? 'open' : ''}`}
        onClick={() => {
          if (!isOpen) openDropdown();
          if (inputRef.current) inputRef.current.focus();
        }}
      >
        <div className="mwh-mpo-content">
          {displayedChips.length > 0 && (
            <div className="mwh-mpo-chips">
              {displayedChips.map((code) => (
                <span key={code} className="mwh-mpo-chip">
                  <span>{code}</span>
                  <button
                    type="button"
                    className="mwh-mpo-chip-x"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isOpen) {
                        togglePoInDraft(code);
                      } else if (onRemoveSingle) {
                        onRemoveSingle(code);
                      }
                    }}
                    aria-label={`Gỡ ${code}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            ref={inputRef}
            type="text"
            className="mwh-mpo-input"
            placeholder={
              loadingMaterials
                ? 'Đang tải định mức BOM...'
                : displayedChips.length > 0
                  ? 'Gõ thêm PO...'
                  : placeholder
            }
            value={searchQuery}
            onFocus={() => {
              if (!isOpen) openDropdown();
            }}
            onChange={handleSearchChange}
          />
        </div>

        <div className="mwh-mpo-icons">
          {searching || loadingMaterials ? (
            <Loader2 size={15} className="mwh-mpo-spinner" />
          ) : (searchQuery || displayedChips.length > 0) ? (
            <button
              type="button"
              className="mwh-mpo-icon-btn"
              onClick={handleClearInputOrAll}
              title={searchQuery ? 'Xóa từ khóa' : 'Xóa tất cả PO'}
            >
              <X size={15} />
            </button>
          ) : null}

          <button
            type="button"
            className="mwh-mpo-icon-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (isOpen) handleCancelDropdown();
              else openDropdown();
            }}
            aria-label="Mở danh sách PO"
          >
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Dropdown thả xuống ngay bên dưới (y như cũ nhưng có Checkbox chọn nhiều) */}
      {isOpen && (
        <div className="mwh-mpo-dropdown">
          <div className="mwh-mpo-list">
            {canAddCustomPo && (
              <button
                type="button"
                className="mwh-mpo-item mwh-mpo-item--custom"
                onClick={() => {
                  togglePoInDraft(trimmedQuery);
                  setSearchQuery('');
                }}
              >
                <Plus size={15} color="#7b5233" />
                <span>Thêm mã PO: <strong>{trimmedQuery}</strong></span>
              </button>
            )}

            {options.length === 0 ? (
              <div className="mwh-mpo-empty">
                {searching ? 'Đang tìm kiếm PO...' : 'Không tìm thấy mã PO phù hợp'}
              </div>
            ) : (
              options.map((opt) => {
                const code = String(opt?.value || '').trim();
                if (!code) return null;
                const isChecked = draftSet.has(code);
                const customer = opt?.customer || '';

                return (
                  <button
                    key={code}
                    type="button"
                    className={`mwh-mpo-item ${isChecked ? 'selected' : ''}`}
                    onClick={() => togglePoInDraft(code)}
                  >
                    <span className="mwh-mpo-checkbox">
                      {isChecked ? (
                        <CheckSquare size={17} color="#7b5233" />
                      ) : (
                        <Square size={17} color="#b0a090" />
                      )}
                    </span>
                    <span className="mwh-mpo-code">{code}</span>
                    {customer && (
                      <span className="mwh-mpo-cust">{customer}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Thanh xác nhận gọn gàng ở đáy dropdown */}
          <div className="mwh-mpo-footer">
            <div className="mwh-mpo-footer-left">
              <span>Đã chọn: <strong>{draftSelected.length}</strong> PO</span>
              {draftSelected.length > 0 && (
                <button
                  type="button"
                  className="mwh-mpo-clear-link"
                  onClick={() => setDraftSelected([])}
                >
                  Bỏ hết
                </button>
              )}
            </div>
            <div className="mwh-mpo-footer-right">
              <button
                type="button"
                className="mwh-mpo-btn-cancel"
                onClick={handleCancelDropdown}
              >
                Đóng
              </button>
              <button
                type="button"
                className="mwh-mpo-btn-apply"
                onClick={handleConfirmApply}
              >
                <Check size={14} />
                <span>{hasPendingChanges ? `Áp dụng (${draftSelected.length})` : 'Xong'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseMultiPoSelect;

