import React, { useState, useMemo, useRef, useEffect } from 'react';
import { lpnCrawlerApi } from '../services/api';

const resolveImgUrl = (img) => {
  if (!img) return '';
  if (typeof img === 'string') {
    if (img.startsWith('data:') || img.startsWith('http://') || img.startsWith('https://')) return img;
    return `/api/v1/lpn-crawler/images/view?path=${encodeURIComponent(img)}`;
  }
  if (img.id) {
    return `/api/v1/lpn-crawler/images/${img.id}/file`;
  }
  const rawPath = img.local_path || '';
  if (rawPath) {
    return `/api/v1/lpn-crawler/images/view?path=${encodeURIComponent(rawPath)}`;
  }
  return img.source_url || '';
};

// Kiểm tra kiện có phải là Top Nóc hay không
const isTopNocItem = (itm) => {
  if (itm.is_top_noc !== undefined) return Boolean(itm.is_top_noc);
  const s = String(itm.suffix_key || itm.record_type || '').toUpperCase();
  return Boolean(
    s.includes('TOP') ||
    s.includes('NÓC') ||
    s.includes('NOC') ||
    /\d+[A-Z]$/.test(s) ||
    /BOX\s*\d+[A-Z]$/.test(s)
  );
};

// Helper gom nhóm các kiện Top Nóc chung LPN/SKU/Pallet Nóc lại với nhau
const groupTopNocItems = (topItems) => {
  const groupsMap = {};
  const groupOrder = [];

  topItems.forEach((itm) => {
    // Định danh nhóm theo top_noc_group_id hoặc theo mã LPN chung
    const cleanLpn = String(itm.lpn || '').trim().toUpperCase();
    const cleanSku = String(itm.sku || '').trim().toUpperCase();
    const groupKey = itm.top_noc_group_id || itm.top_noc_group_name || (cleanLpn ? `LPN_${cleanLpn}` : `SKU_${cleanSku}`) || `ITEM_${itm.id}`;

    if (!groupsMap[groupKey]) {
      groupsMap[groupKey] = {
        groupId: groupKey,
        groupName: itm.top_noc_group_name || `Pallet Nóc (${itm.lpn || 'Chung'})`,
        lpn: itm.lpn || '',
        sku: itm.sku || '',
        batch: itm.batch_resolved || itm.batch_original || '',
        items: [],
        boxCount: 0,
        pairedPallets: []
      };
      groupOrder.push(groupKey);
    }

    groupsMap[groupKey].items.push(itm);
    groupsMap[groupKey].boxCount += 1;

    // Tìm pallet đứng dán cạnh tương ứng từ suffix_key (ví dụ Box 1A -> Pallet 1)
    const matchNum = String(itm.suffix_key || '').match(/\d+/);
    if (matchNum) {
      const pLabel = `Pallet ${matchNum[0]}`;
      if (!groupsMap[groupKey].pairedPallets.includes(pLabel)) {
        groupsMap[groupKey].pairedPallets.push(pLabel);
      }
    }
  });

  return groupOrder.map((key, idx) => {
    const grp = groupsMap[key];
    const isEven = grp.boxCount === 2 || grp.boxCount === 4 || grp.boxCount === 6;

    // Kiểm tra xem trong nhóm đã có kiện nào xác thực thành công cả LPN và SKU chưa
    const hasVerifiedMember = grp.items.some((it) => {
      const o = it.ocr;
      const hasSku = Boolean(it.sku && String(it.sku).trim() !== '' && String(it.sku).trim() !== '—');
      return o && o.status === 'success' && o.is_lpn_match && (!hasSku || o.is_sku_match);
    });

    const allPassed = grp.items.length > 0 && grp.items.every((it) => {
      const o = it.ocr;
      const hasSku = Boolean(it.sku && String(it.sku).trim() !== '' && String(it.sku).trim() !== '—');
      if (o && o.status === 'success' && o.is_lpn_match && (!hasSku || o.is_sku_match)) {
        return true;
      }
      // Kế thừa Pallet Nóc: Nếu trong cụm Pallet Nóc đã có thành viên xác thực chuẩn và kiện này đã có LPN khớp (hoặc có ghi chú xác thực liên kết / hoán đổi)
      if (hasVerifiedMember && o && (o.is_lpn_match || (o.error_reason && o.error_reason.includes('Khớp')))) {
        return true;
      }
      return false;
    });

    const hasError = grp.items.some((it) => {
      const o = it.ocr;
      const hasSku = Boolean(it.sku && String(it.sku).trim() !== '' && String(it.sku).trim() !== '—');
      if (!it.first_image || !it.lpn || !hasSku) return true;
      if (hasVerifiedMember && o && (o.is_lpn_match || (o.error_reason && o.error_reason.includes('Khớp')))) {
        return false;
      }
      return o && (o.status !== 'success' || !o.is_lpn_match || (hasSku && !o.is_sku_match));
    });

    return {
      ...grp,
      groupIndex: idx + 1,
      groupName: grp.groupName || `Pallet Nóc #${idx + 1} (${grp.boxCount} tủ)`,
      isEven,
      validationMsg: isEven ? null : `Số lượng lẻ (${grp.boxCount} tủ, chuẩn là 2, 4, 6 tủ)`,
      isPassed: allPassed,
      isError: hasError,
      statusLabel: allPassed ? 'Đạt' : (hasError ? 'Lệch/Lỗi' : 'Chưa quét')
    };
  });
};

/**
 * Định dạng gọn gàng danh sách Pallet đi cùng (ví dụ: Pallet 5, 6, 7, 8 -> Pallet 5 → 8)
 */
const formatPairedPallets = (pallets) => {
  if (!pallets || pallets.length === 0) return '—';
  const nums = pallets
    .map((p) => {
      const m = String(p).match(/\d+/);
      return m ? parseInt(m[0], 10) : null;
    })
    .filter((n) => n !== null);

  if (nums.length === 0) return pallets.join(', ');
  nums.sort((a, b) => a - b);

  // Nếu có từ 3 pallet liên tiếp trở lên: Pallet 5 → 8
  const isConsecutive = nums.length >= 3 && nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
  if (isConsecutive) {
    return `Pallet ${nums[0]} → ${nums[nums.length - 1]}`;
  }
  return `Pallet ${nums.join(', ')}`;
};

/**
 * Helper kiểm tra tài khoản đang đăng nhập có quyền Quản trị viên (Admin) hay không
 */
export const checkIsAdmin = () => {
  try {
    const raw = localStorage.getItem('smartflow_user');
    if (!raw) return false;
    const u = JSON.parse(raw);
    if (!u) return false;
    if (u.is_admin === true || u.isAdmin === true) return true;
    const username = (u.username || '').toLowerCase();
    if (username === 'admin') return true;
    const roleName = (u.role_name || u.roleName || u.role || '').toLowerCase();
    if (roleName === 'it' || roleName === 'bgd' || roleName === 'admin') return true;
    const roleDesc = (u.role_description || '').toLowerCase();
    if (roleDesc.includes('admin') || roleDesc.includes('quản trị')) return true;
    const permName = (u.permission_name || '').toLowerCase();
    if (permName.includes('admin')) return true;
    const deptName = (u.department_name || '').toLowerCase();
    if (deptName === 'it' || deptName === 'bgd' || deptName.includes('admin')) return true;
    return false;
  } catch (e) {
    return false;
  }
};

/**
 * Component chỉnh sửa nhanh trực tiếp từng ô dữ liệu (Inline Editable Cell)
 * Chỉ tài khoản Admin mới có quyền click để sửa LPN / SKU.
 */
const InlineEditableCell = ({
  value,
  itemId,
  field,
  onSave,
  isMatch = null,
  placeholder = 'Nhập mã...',
  bold = true,
  canEdit
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentVal, setCurrentVal] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const [flashSuccess, setFlashSuccess] = useState(false);
  const inputRef = useRef(null);

  // Chỉ cho phép sửa nếu tài khoản là Admin
  const isEditable = canEdit !== undefined ? Boolean(canEdit) : checkIsAdmin();

  useEffect(() => {
    setCurrentVal(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = (e) => {
    e.stopPropagation();
    if (!isEditable) return;
    setIsEditing(true);
    setCurrentVal(value || '');
  };

  const handleCancel = (e) => {
    if (e) e.stopPropagation();
    setIsEditing(false);
    setCurrentVal(value || '');
  };

  const handleCommit = async (e) => {
    if (e) e.stopPropagation();
    if (!isEditable) {
      setIsEditing(false);
      return;
    }
    const trimmed = (currentVal || '').trim();
    if (trimmed === (value || '').trim()) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    const res = await onSave(itemId, field, trimmed);
    setIsSaving(false);
    if (res && res.success) {
      setIsEditing(false);
      setFlashSuccess(true);
      setTimeout(() => setFlashSuccess(false), 2000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit(e);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel(e);
    }
  };

  if (isEditing) {
    return (
      <div
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={currentVal}
          onChange={(e) => setCurrentVal(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          placeholder={placeholder}
          style={{
            fontSize: '0.78rem',
            fontWeight: bold ? '700' : '500',
            padding: '3px 6px',
            borderRadius: '4px',
            border: '2px solid #2563EB',
            outline: 'none',
            backgroundColor: '#FFFFFF',
            color: '#1E293B',
            width: '125px',
            boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.2)'
          }}
        />
        <button
          type="button"
          onClick={handleCommit}
          disabled={isSaving}
          title="Lưu (Enter)"
          style={{
            background: '#10B981',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '4px',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isSaving ? 'wait' : 'pointer',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            flexShrink: 0
          }}
        >
          {isSaving ? '…' : '✓'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving}
          title="Hủy (Esc)"
          style={{
            background: '#9CA3AF',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '4px',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '0.70rem',
            fontWeight: 'bold',
            flexShrink: 0
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  // Chế độ hiển thị
  let textColor = '#374151';
  if (isMatch === true) textColor = '#15803D';
  else if (isMatch === false) textColor = '#DC2626';

  return (
    <div
      onClick={isEditable ? handleStartEdit : undefined}
      title={isEditable ? "Click để sửa nhanh trực tiếp (Inline Edit)" : "Chỉ tài khoản Quản trị viên (Admin) mới có quyền chỉnh sửa"}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        cursor: isEditable ? 'pointer' : 'default',
        padding: '2px 6px',
        borderRadius: '4px',
        transition: 'all 0.15s ease',
        backgroundColor: flashSuccess ? '#D1FAE5' : 'transparent',
        border: flashSuccess ? '1px solid #10B981' : '1px solid transparent'
      }}
      onMouseEnter={(e) => {
        if (!flashSuccess && isEditable) {
          e.currentTarget.style.backgroundColor = '#F3F4F6';
          e.currentTarget.style.borderColor = '#CBD5E1';
          const icon = e.currentTarget.querySelector('.edit-pencil-icon');
          if (icon) icon.style.opacity = '1';
        }
      }}
      onMouseLeave={(e) => {
        if (!flashSuccess && isEditable) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.borderColor = 'transparent';
          const icon = e.currentTarget.querySelector('.edit-pencil-icon');
          if (icon) icon.style.opacity = '0';
        }
      }}
    >
      <span
        style={{
          fontWeight: bold ? '700' : '500',
          color: textColor,
          fontFamily: 'inherit',
          whiteSpace: 'nowrap'
        }}
      >
        {value || <span style={{ color: '#DC2626', fontStyle: 'italic', fontWeight: '500' }}>{placeholder}</span>}
      </span>
      {isEditable && (
        <span
          className="edit-pencil-icon"
          style={{
            fontSize: '0.68rem',
            opacity: 0,
            transition: 'opacity 0.15s ease',
            color: '#6B7280'
          }}
        >
          ✏️
        </span>
      )}
      {flashSuccess && (
        <span style={{ fontSize: '0.65rem', color: '#059669', fontWeight: '700' }}>
          Đã lưu!
        </span>
      )}
    </div>
  );
};

export const ContainerDetailModal = ({
  containerData,
  onSelectItemDetail = () => {},
  onClose = () => {},
  onContainerUpdate = () => {}
}) => {
  const [currentContainer, setCurrentContainer] = useState(containerData);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 2 Tab chính: 'base_pallet' (Tủ đứng) và 'top_noc' (Top nóc gộp)
  const [mainTab, setMainTab] = useState('base_pallet');
  
  // Chế độ xem: Tự động chọn Dạng Thẻ ('cards') trên màn hình nhỏ/mobile để dễ nhìn & thao tác
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'cards';
    }
    return 'table';
  });

  // Lọc nhanh theo kết quả: 'all', 'passed', 'error', 'unprocessed'
  const [filterMode, setFilterMode] = useState('all');
  const [onlyUnprocessed, setOnlyUnprocessed] = useState(false);

  // Mở rộng chi tiết nhóm Top Nóc
  const [expandedTopGroups, setExpandedTopGroups] = useState({});

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanningItemId, setScanningItemId] = useState(null);
  const [scanProgress, setScanProgress] = useState({
    processed: 0,
    total: 0,
    percent: 0,
    passed: 0,
    failed: 0
  });
  const [scanStatusMessage, setScanStatusMessage] = useState('');
  const [scanSummary, setScanSummary] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const abortControllerRef = useRef(null);

  const isAdmin = useMemo(() => checkIsAdmin(), []);

  const handleResolveCrossMatches = async () => {
    const cId = currentContainer?.container_id || currentContainer?.id;
    if (!cId || isResolving) return;
    setIsResolving(true);
    try {
      const res = await lpnCrawlerApi.resolveCrossMatches(cId);
      if (res && res.success) {
        const fresh = await lpnCrawlerApi.getContainerDetail(cId);
        if (fresh && fresh.items) {
          setCurrentContainer(fresh);
          if (onContainerUpdate) onContainerUpdate(fresh);
        }
      }
    } catch (err) {
      console.error('handleResolveCrossMatches error:', err);
    } finally {
      setIsResolving(false);
    }
  };

  // Hàm xử lý chỉnh sửa trực tiếp từng ô (Inline Edit - Chỉ dành riêng cho tài khoản Admin)
  const handleInlineEdit = async (itemId, field, value) => {
    if (!isAdmin) {
      alert('Chức năng chỉnh sửa dữ liệu chỉ dành cho tài khoản Quản trị viên (Admin)!');
      return { success: false, message: 'Chức năng chỉnh sửa chỉ dành cho tài khoản Admin!' };
    }
    try {
      const res = await lpnCrawlerApi.inlineEditItem(itemId, field, value);
      if (res && res.success) {
        const cId = currentContainer?.container_id || currentContainer?.id;
        if (cId) {
          const fresh = await lpnCrawlerApi.getContainerDetail(cId);
          if (fresh && fresh.items) {
            setCurrentContainer(fresh);
            if (onContainerUpdate) onContainerUpdate(fresh);
          }
        }
        return { success: true };
      } else {
        alert(res?.message || 'Không thể lưu chỉnh sửa');
        return { success: false, message: res?.message };
      }
    } catch (err) {
      console.error('handleInlineEdit error:', err);
      alert('Lỗi kết nối khi lưu: ' + err.message);
      return { success: false, message: err.message };
    }
  };

  // Luôn đồng bộ currentContainer khi containerData từ cha thay đổi (quét lại, cập nhật trạng thái...)
  useEffect(() => {
    if (containerData) {
      setCurrentContainer(containerData);
    }
  }, [containerData]);

  // Khi mở container mới (id thay đổi), tải dữ liệu chi tiết mới nhất từ server
  useEffect(() => {
    const cId = containerData?.container_id || containerData?.id;
    if (cId) {
      lpnCrawlerApi.getContainerDetail(cId).then((fresh) => {
        if (fresh && fresh.items) {
          setCurrentContainer(fresh);
          if (onContainerUpdate) {
            onContainerUpdate(fresh);
          }
        }
      }).catch((e) => console.warn('getContainerDetail initial fetch error:', e));
    }
  }, [containerData?.container_id, containerData?.id]);

  if (!currentContainer) return null;

  const items = currentContainer.items || [];

  // Phân tách 2 danh mục: Tủ Đứng và Top Nóc
  const basePalletItems = useMemo(() => items.filter((it) => !isTopNocItem(it)), [items]);
  const topNocItems = useMemo(() => items.filter((it) => isTopNocItem(it)), [items]);

  // Gom các kiện Top Nóc chung LPN/SKU/Pallet Nóc lại thành danh sách Pallet Nóc
  const groupedTopNocList = useMemo(() => groupTopNocItems(topNocItems), [topNocItems]);

  // Helper kiểm tra trạng thái 1 item
  const getItemStatus = (itm) => {
    const ocr = itm.ocr;
    const hasItemSku = Boolean(
      itm.sku &&
      String(itm.sku).trim() !== '' &&
      String(itm.sku).trim() !== 'None' &&
      String(itm.sku).trim() !== '0' &&
      String(itm.sku).trim() !== '—'
    );
    const isPassed = Boolean(ocr && ocr.status === 'success' && ocr.is_lpn_match && (!hasItemSku || ocr.is_sku_match));
    const isError = Boolean(
      !itm.first_image ||
      !itm.lpn ||
      !hasItemSku ||
      (ocr && (ocr.status !== 'success' || !ocr.is_lpn_match || (hasItemSku && !ocr.is_sku_match)))
    );
    const isUnproc = !ocr && Boolean(itm.first_image && itm.lpn && hasItemSku);
    return { isPassed, isError, isUnproc };
  };

  // Helper render huy hiệu trạng thái thông minh
  const renderSmartStatusTag = (o, isPassed, isError) => {
    if (isPassed) {
      const reason = String(o?.error_reason || '');
      return (
        <div>
          <span
            style={{ padding: '3px 8px', backgroundColor: '#ECFDF5', color: '#047857', borderRadius: '4px', fontWeight: '700', fontSize: '0.74rem' }}
            title={reason || 'Đạt'}
          >
            Đạt
          </span>
        </div>
      );
    }
    if (isError) {
      return (
        <div>
          <span
            style={{ padding: '3px 8px', backgroundColor: '#FEF2F2', color: '#B91C1C', borderRadius: '4px', fontWeight: '700', fontSize: '0.74rem' }}
            title={o?.error_reason || 'Lệch dữ liệu'}
          >
            Lệch mã
          </span>
          {o?.error_reason && (
            <div style={{ fontSize: '0.66rem', color: '#991B1B', marginTop: '2px', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.error_reason}>
              {o.error_reason}
            </div>
          )}
        </div>
      );
    }
    return (
      <span style={{ padding: '3px 8px', backgroundColor: '#F3F4F6', color: '#4B5563', borderRadius: '4px', fontWeight: '600', fontSize: '0.74rem' }}>
        Chưa quét
      </span>
    );
  };

  // Thống kê nhanh toàn container
  const stats = useMemo(() => {
    let passed = 0;
    let failed = 0;
    let unproc = 0;
    items.forEach((itm) => {
      const { isPassed, isError, isUnproc } = getItemStatus(itm);
      if (isPassed) passed++;
      else if (isError) failed++;
      else if (isUnproc) unproc++;
    });
    return {
      passed,
      failed,
      unproc,
      baseCount: basePalletItems.length,
      topItemCount: topNocItems.length,
      topGroupCount: groupedTopNocList.length,
      total: items.length
    };
  }, [items, basePalletItems, topNocItems, groupedTopNocList]);

  // Lọc danh sách Tủ Đứng
  const filteredBaseItems = useMemo(() => {
    return basePalletItems.filter((itm) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          (itm.lpn && String(itm.lpn).toLowerCase().includes(q)) ||
          (itm.sku && String(itm.sku).toLowerCase().includes(q)) ||
          (itm.suffix_key && String(itm.suffix_key).toLowerCase().includes(q)) ||
          (itm.batch_resolved && String(itm.batch_resolved).toLowerCase().includes(q)) ||
          (itm.ocr?.detected_lpn && String(itm.ocr.detected_lpn).toLowerCase().includes(q));
        if (!matches) return false;
      }
      const { isPassed, isError, isUnproc } = getItemStatus(itm);
      if (filterMode === 'passed') return isPassed;
      if (filterMode === 'error') return isError;
      if (filterMode === 'unprocessed') return isUnproc;
      return true;
    });
  }, [basePalletItems, searchQuery, filterMode]);

  // Lọc danh sách Top Nóc Gộp
  const filteredTopGroups = useMemo(() => {
    return groupedTopNocList.filter((grp) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          grp.groupName.toLowerCase().includes(q) ||
          grp.lpn.toLowerCase().includes(q) ||
          grp.sku.toLowerCase().includes(q) ||
          grp.batch.toLowerCase().includes(q) ||
          grp.items.some(
            (it) =>
              (it.suffix_key && it.suffix_key.toLowerCase().includes(q)) ||
              (it.ocr?.detected_lpn && it.ocr.detected_lpn.toLowerCase().includes(q))
          );
        if (!matches) return false;
      }
      if (filterMode === 'passed') return grp.isPassed;
      if (filterMode === 'error') return grp.isError;
      if (filterMode === 'unprocessed') return !grp.isPassed && !grp.isError;
      return true;
    });
  }, [groupedTopNocList, searchQuery, filterMode]);

  // Toggle mở rộng nhóm top nóc
  const toggleGroupExpand = (grpId) => {
    setExpandedTopGroups((prev) => ({
      ...prev,
      [grpId]: !prev[grpId]
    }));
  };

  // Kích hoạt Quét Chuyên Sâu Đồng Thời
  const handleStartDeepScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanSummary(null);
    setScanStatusMessage('Đang khởi tạo luồng quét song song đa luồng...');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setScanProgress({
      processed: 0,
      total: items.length,
      percent: 0,
      passed: 0,
      failed: 0
    });

    try {
      await lpnCrawlerApi.scanContainerDeepStream(
        currentContainer.container_id || currentContainer.id,
        { only_unprocessed: onlyUnprocessed },
        (ev) => {
          if (ev.type === 'empty') {
            setScanStatusMessage(ev.message || 'Tất cả ảnh đều đã có dữ liệu AI OCR.');
            setScanProgress((prev) => ({ ...prev, percent: 100 }));
          } else if (ev.type === 'start') {
            setScanProgress((prev) => ({
              ...prev,
              total: ev.total || items.length,
              percent: 0
            }));
            setScanStatusMessage(`Đang quét đồng thời ${ev.total} ảnh qua ThreadPool...`);
          } else if (ev.type === 'item_scanned') {
            setScanningItemId(ev.item_id);
            setCurrentContainer((prev) => {
              if (!prev || !prev.items) return prev;
              const nextItems = prev.items.map((it) => {
                if (it.id === ev.item_id) {
                  return {
                    ...it,
                    ocr: {
                      id: ev.item_id,
                      status: ev.status,
                      is_lpn_match: ev.is_lpn_match,
                      is_sku_match: ev.is_sku_match,
                      detected_lpn: ev.detected_lpn,
                      detected_sku: ev.detected_sku,
                      confidence: ev.confidence,
                      error_reason: ev.error_reason
                    }
                  };
                }
                return it;
              });
              return { ...prev, items: nextItems };
            });

            const pct = ev.total > 0 ? Math.round((ev.processed / ev.total) * 100) : 0;
            setScanProgress({
              processed: ev.processed,
              total: ev.total,
              percent: pct,
              passed: ev.passed_count,
              failed: ev.failed_count
            });
            setScanStatusMessage(`Đã xử lý ${ev.processed}/${ev.total} ảnh (${pct}%)...`);
          } else if (ev.type === 'completed') {
            setScanningItemId(null);
            setScanSummary(ev);
            setScanStatusMessage(ev.message || 'Hoàn tất quét toàn bộ container!');
            setScanProgress({
              processed: ev.scanned_items_count,
              total: ev.total_items_in_container,
              percent: 100,
              passed: ev.matched_count,
              failed: ev.mismatch_count
            });
            setCurrentContainer((prev) => {
              if (!prev) return prev;
              const updated = {
                ...prev,
                status_code: ev.status_code,
                status_label: ev.status_label,
                ocr_scanned_count: ev.scanned_items_count,
                ocr_matched_count: ev.matched_count,
                ocr_mismatch_count: ev.mismatch_count
              };
              if (onContainerUpdate) {
                onContainerUpdate(updated);
              }
              return updated;
            });
          } else if (ev.type === 'error') {
            setScanningItemId(null);
            setScanStatusMessage(`Lỗi quét: ${ev.message}`);
          }
        },
        controller.signal
      );
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Lỗi khi quét container stream:', err);
        setScanStatusMessage(`Lỗi quét: ${err.message || 'Mất kết nối máy chủ'}`);
      }
    } finally {
      setIsScanning(false);
      setScanningItemId(null);
      abortControllerRef.current = null;
      try {
        const cId = currentContainer.container_id || currentContainer.id;
        if (cId) {
          const fresh = await lpnCrawlerApi.getContainerDetail(cId);
          if (fresh && fresh.items) {
            setCurrentContainer(fresh);
            if (onContainerUpdate) {
              onContainerUpdate(fresh);
            }
          }
        }
      } catch (reloadErr) {
        console.warn('Lỗi khi nạp lại dữ liệu container sau quét:', reloadErr);
      }
    }
  };

  const handleStopScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsScanning(false);
    setScanningItemId(null);
    setScanStatusMessage('Đã dừng tiến trình quét theo yêu cầu.');
  };

  const statusCode = currentContainer.status_code;
  const statusLabel = currentContainer.status_label || (statusCode === 'PASSED' ? 'Đạt' : 'Chưa đạt');
  const isContainerPassed = statusCode === 'PASSED';

  return (
    <div
      className="lpn-container-detail-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(25, 15, 10, 0.70)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px'
      }}
      onClick={onClose}
    >
      <div
        className="lpn-container-detail-dialog"
        style={{
          backgroundColor: '#FAF6F0',
          border: '1px solid #EADCC9',
          borderRadius: '12px',
          width: 'min(98vw, 1340px)',
          maxWidth: '98vw',
          height: 'min(95vh, 920px)',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header: Gọn gàng, phân tầng rõ nét */}
        <div
          className="lpn-cdm-header"
          style={{
            padding: '12px 18px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #EADCC9',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flexShrink: 0
          }}
        >
          {/* Top row: Container number + Factory + Nút Đóng */}
          <div className="lpn-cdm-top-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="lpn-cdm-title" style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2D1A12', letterSpacing: '0.3px' }}>
                {currentContainer.container_number}
              </span>
              {currentContainer.factory && currentContainer.factory !== '—' && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    backgroundColor: '#4A2E1B',
                    color: '#FFFFFF'
                  }}
                >
                  {currentContainer.factory}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#FAF6F0',
                border: '1px solid #EADCC9',
                padding: '5px 14px',
                cursor: 'pointer',
                color: '#4A2E1B',
                borderRadius: '6px',
                fontSize: '0.80rem',
                fontWeight: '700',
                transition: 'all 0.15s ease'
              }}
            >
              Đóng
            </button>
          </div>

          {/* Meta row: Trạng thái + Ngày + Thống kê */}
          <div className="lpn-cdm-meta-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.76rem' }}>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: '700',
                backgroundColor: isContainerPassed ? '#ECFDF5' : (statusCode === 'MISMATCH' ? '#FEF2F2' : '#FFFBEB'),
                color: isContainerPassed ? '#059669' : (statusCode === 'MISMATCH' ? '#DC2626' : '#D97706'),
                border: `1px solid ${isContainerPassed ? '#A7F3D0' : (statusCode === 'MISMATCH' ? '#FECACA' : '#FDE68A')}`
              }}
            >
              Trạng thái: {statusLabel}
            </span>

            {currentContainer.date_loading && (
              <span style={{ color: '#8D6E63', fontWeight: '600' }}>
                {currentContainer.date_loading}
              </span>
            )}

            <div className="lpn-cdm-chips-row" style={{ display: 'inline-flex', gap: '5px', flexWrap: 'wrap' }}>
              <span className="lpn-cdm-chip" style={{ background: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: '14px', padding: '1px 8px', fontSize: '0.72rem', color: '#7B5233', fontWeight: '600' }}>
                <b>{stats.total}</b> kiện
              </span>
              <span className="lpn-cdm-chip" style={{ background: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: '14px', padding: '1px 8px', fontSize: '0.72rem', color: '#7B5233', fontWeight: '600' }}>
                <b>{stats.baseCount}</b> Tủ đứng
              </span>
              <span className="lpn-cdm-chip" style={{ background: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: '14px', padding: '1px 8px', fontSize: '0.72rem', color: '#7B5233', fontWeight: '600' }}>
                <b>{stats.topGroupCount}</b> Pallet Nóc ({stats.topItemCount} tủ)
              </span>
              {isAdmin ? (
                <span
                  style={{
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '14px',
                    padding: '1px 8px',
                    fontSize: '0.72rem',
                    color: '#1D4ED8',
                    fontWeight: '700'
                  }}
                  title="Tài khoản Admin: Cho phép click để sửa nhanh LPN/SKU"
                >
                  👑 Admin (Được sửa)
                </span>
              ) : (
                <span
                  style={{
                    background: '#F3F4F6',
                    border: '1px solid #E5E7EB',
                    borderRadius: '14px',
                    padding: '1px 8px',
                    fontSize: '0.72rem',
                    color: '#6B7280',
                    fontWeight: '600'
                  }}
                  title="Chế độ chỉ xem: Chỉ tài khoản Admin mới có quyền sửa mã LPN/SKU"
                >
                  🔒 Chỉ xem
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Thanh Điều Khiển & Bộ Lọc Gọn Gàng (Hợp nhất thống kê & lọc, loại bỏ lặp lại) */}
        <div
          className="lpn-cdm-toolbar"
          style={{
            padding: '8px 16px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #EADCC9',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flexShrink: 0
          }}
        >
          {/* Hàng 1: Nút Quét Chuyên Sâu & Checkbox */}
          <div className="lpn-cdm-scan-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
            {!isScanning ? (
              <button
                type="button"
                className="lpn-cdm-scan-btn"
                onClick={handleStartDeepScan}
                style={{
                  backgroundColor: isContainerPassed ? '#15803D' : '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '0.80rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.10)',
                  flex: '1 1 auto'
                }}
              >
                {isContainerPassed ? 'Quét Lại Container (Chuyên Sâu)' : 'Quét Chuyên Sâu Container'}
              </button>
            ) : (
              <button
                type="button"
                className="lpn-cdm-scan-btn"
                onClick={handleStopScan}
                style={{
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '0.80rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  flex: '1 1 auto'
                }}
              >
                Dừng Quét
              </button>
            )}

            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.74rem',
                color: '#4A2E1B',
                cursor: isScanning ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                userSelect: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <input
                type="checkbox"
                checked={onlyUnprocessed}
                disabled={isScanning}
                onChange={(e) => setOnlyUnprocessed(e.target.checked)}
                style={{ accentColor: '#7B5233' }}
              />
              <span>Chỉ quét ảnh chưa quét / lỗi</span>
            </label>
          </div>

          {/* Hàng 2: Bộ lọc trạng thái thông minh kiêm Thống kê số lượng (Không lặp lại) */}
          <div className="lpn-cdm-filter-pills" style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              style={{
                flex: '1 1 auto',
                minWidth: '65px',
                border: filterMode === 'all' ? '1.5px solid #4A2E1B' : '1px solid #EADCC9',
                backgroundColor: filterMode === 'all' ? '#4A2E1B' : '#FAF6F0',
                color: filterMode === 'all' ? '#FFFFFF' : '#6D4C41',
                borderRadius: '6px',
                padding: '5px 8px',
                fontSize: '0.74rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span>Tất cả</span>
              <span style={{ opacity: 0.9 }}>({items.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('passed')}
              style={{
                flex: '1 1 auto',
                minWidth: '65px',
                border: filterMode === 'passed' ? '1.5px solid #059669' : '1px solid #A7F3D0',
                backgroundColor: filterMode === 'passed' ? '#059669' : '#ECFDF5',
                color: filterMode === 'passed' ? '#FFFFFF' : '#047857',
                borderRadius: '6px',
                padding: '5px 8px',
                fontSize: '0.74rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span>Đạt</span>
              <span style={{ opacity: 0.9 }}>({stats.passed})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('error')}
              style={{
                flex: '1 1 auto',
                minWidth: '70px',
                border: filterMode === 'error' ? '1.5px solid #DC2626' : '1px solid #FECACA',
                backgroundColor: filterMode === 'error' ? '#DC2626' : '#FEF2F2',
                color: filterMode === 'error' ? '#FFFFFF' : '#B91C1C',
                borderRadius: '6px',
                padding: '5px 8px',
                fontSize: '0.74rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span>Lệch/Lỗi</span>
              <span style={{ opacity: 0.9 }}>({stats.failed})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('unprocessed')}
              style={{
                flex: '1 1 auto',
                minWidth: '75px',
                border: filterMode === 'unprocessed' ? '1.5px solid #4B5563' : '1px solid #E5E7EB',
                backgroundColor: filterMode === 'unprocessed' ? '#4B5563' : '#F3F4F6',
                color: filterMode === 'unprocessed' ? '#FFFFFF' : '#4B5563',
                borderRadius: '6px',
                padding: '5px 8px',
                fontSize: '0.74rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span>Chưa quét</span>
              <span style={{ opacity: 0.9 }}>({stats.unproc})</span>
            </button>
          </div>

          {/* Hàng 3: Ô Tìm Kiếm + Chuyển Chế Độ Xem (Bảng / Thẻ) */}
          <div className="lpn-cdm-search-view-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
            <input
              type="text"
              className="lpn-cdm-search-input"
              placeholder="Tìm LPN, SKU, Kiện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: '1px solid #EADCC9',
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '0.78rem',
                color: '#2D1A12',
                backgroundColor: '#FFFFFF',
                flex: 1,
                minWidth: 0,
                outline: 'none'
              }}
            />

            <div style={{ display: 'inline-flex', backgroundColor: '#FAF6F0', padding: '2px', borderRadius: '6px', border: '1px solid #EADCC9', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  border: 'none',
                  background: viewMode === 'table' ? '#4A2E1B' : 'transparent',
                  color: viewMode === 'table' ? '#FFFFFF' : '#6D4C41',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Dạng Bảng
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                style={{
                  border: 'none',
                  background: viewMode === 'cards' ? '#4A2E1B' : 'transparent',
                  color: viewMode === 'cards' ? '#FFFFFF' : '#6D4C41',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Dạng Thẻ
              </button>
            </div>
          </div>
        </div>

        {/* 3. Tiến trình quét Real-time (nếu đang chạy) */}
        {(isScanning || scanStatusMessage) && (
          <div
            style={{
              padding: '8px 20px',
              backgroundColor: isScanning ? '#FEF3C7' : (scanSummary?.status_code === 'PASSED' ? '#DCFCE7' : '#FEE2E2'),
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', fontWeight: '700' }}>
              <span style={{ color: isScanning ? '#92400E' : (scanSummary?.status_code === 'PASSED' ? '#166534' : '#991B1B') }}>
                {scanStatusMessage}
              </span>
              <span style={{ color: isScanning ? '#B45309' : '#166534' }}>
                {scanProgress.percent}%
              </span>
            </div>
            <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${scanProgress.percent}%`,
                  height: '100%',
                  backgroundColor: isScanning ? '#D97706' : (scanSummary?.status_code === 'PASSED' ? '#16A34A' : '#DC2626'),
                  transition: 'width 0.2s ease'
                }}
              />
            </div>
          </div>
        )}

        {/* 4. CHIA 2 TAB CHÍNH: TỦ ĐỨNG & TOP NÓC */}
        <div
          className="lpn-cdm-tabs"
          style={{
            display: 'flex',
            backgroundColor: '#EDE3D2',
            borderBottom: '1px solid #EADCC9',
            padding: '6px 18px 0 18px',
            gap: '8px',
            flexShrink: 0
          }}
        >
          {/* TAB 1: TỦ ĐỨNG */}
          <button
            type="button"
            className="lpn-cdm-tab-btn"
            onClick={() => setMainTab('base_pallet')}
            style={{
              border: 'none',
              backgroundColor: mainTab === 'base_pallet' ? '#FAF6F0' : 'transparent',
              color: mainTab === 'base_pallet' ? '#4A2E1B' : '#7B5233',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              padding: '9px 18px',
              fontSize: '0.86rem',
              fontWeight: '800',
              cursor: 'pointer',
              borderTop: mainTab === 'base_pallet' ? '2px solid #7B5233' : '2px solid transparent',
              borderLeft: mainTab === 'base_pallet' ? '1px solid #EADCC9' : '1px solid transparent',
              borderRight: mainTab === 'base_pallet' ? '1px solid #EADCC9' : '1px solid transparent',
              marginBottom: mainTab === 'base_pallet' ? '-1px' : '0'
            }}
          >
            Tủ đứng ({filteredBaseItems.length} kiện / {stats.baseCount} Pallet)
          </button>

          {/* TAB 2: TOP NÓC (GỘP CÁC TOP NÓC GIỐNG NHAU) */}
          <button
            type="button"
            className="lpn-cdm-tab-btn"
            onClick={() => setMainTab('top_noc')}
            style={{
              border: 'none',
              backgroundColor: mainTab === 'top_noc' ? '#FAF6F0' : 'transparent',
              color: mainTab === 'top_noc' ? '#1E40AF' : '#1D4ED8',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              padding: '9px 18px',
              fontSize: '0.86rem',
              fontWeight: '800',
              cursor: 'pointer',
              borderTop: mainTab === 'top_noc' ? '2px solid #2563EB' : '2px solid transparent',
              borderLeft: mainTab === 'top_noc' ? '1px solid #EADCC9' : '1px solid transparent',
              borderRight: mainTab === 'top_noc' ? '1px solid #EADCC9' : '1px solid transparent',
              marginBottom: mainTab === 'top_noc' ? '-1px' : '0'
            }}
          >
            Top nóc ({filteredTopGroups.length} Pallet Nóc gộp &bull; {stats.topItemCount} tủ)
          </button>
        </div>

        {/* 5. NỘI DUNG CHÍNH (DẠNG BẢNG / TABLE HOẶC CARDS) */}
        <div className="lpn-cdm-content" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', backgroundColor: '#FAF6F0' }}>
          {/* TAB 1: HIỂN THỊ TỦ ĐỨNG */}
          {mainTab === 'base_pallet' && (
            <div>
              {filteredBaseItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8D6E63', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                  Không tìm thấy kiện Tủ đứng nào phù hợp với bộ lọc.
                </div>
              ) : viewMode === 'table' ? (
                /* BẢNG TỦ ĐỨNG (DẠNG BẢNG CÓ CUỘN NGANG MƯỢT TRÊN MOBILE) */
                <div className="lpn-cdm-table-wrapper" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #EADCC9', overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                  <table style={{ width: '100%', minWidth: '860px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F5EFE6', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                      <tr style={{ color: '#4A2E1B', borderBottom: '1px solid #EADCC9' }}>
                        <th style={{ padding: '9px 10px', width: '45px', textAlign: 'center', whiteSpace: 'nowrap' }}>STT</th>
                        <th style={{ padding: '9px 12px', minWidth: '120px', whiteSpace: 'nowrap' }}>Vị trí kiện</th>
                        <th style={{ padding: '9px 10px', width: '80px', whiteSpace: 'nowrap' }}>Ảnh</th>
                        <th style={{ padding: '9px 10px', minWidth: '110px', whiteSpace: 'nowrap' }}>Mã LPN (CSDL)</th>
                        <th style={{ padding: '9px 10px', minWidth: '110px', whiteSpace: 'nowrap' }}>Mã SKU (CSDL)</th>
                        <th style={{ padding: '9px 10px', minWidth: '100px', whiteSpace: 'nowrap' }}>Lô hàng (Batch)</th>
                        <th style={{ padding: '9px 10px', minWidth: '110px', whiteSpace: 'nowrap' }}>LPN Đọc AI</th>
                        <th style={{ padding: '9px 10px', minWidth: '110px', whiteSpace: 'nowrap' }}>SKU Đọc AI</th>
                        <th style={{ padding: '9px 10px', width: '100px', textAlign: 'center', whiteSpace: 'nowrap' }}>Trạng thái</th>
                        <th style={{ padding: '9px 10px', width: '95px', textAlign: 'center', whiteSpace: 'nowrap' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBaseItems.map((itm, idx) => {
                        const { isPassed, isError } = getItemStatus(itm);
                        const firstImg = itm.first_image || (itm.images && itm.images.length > 0 ? itm.images[0] : null);
                        const imgUrl = resolveImgUrl(firstImg);
                        const o = itm.ocr;

                        return (
                          <tr
                            key={itm.id || idx}
                            style={{
                              borderBottom: '1px solid #F0E6D8',
                              backgroundColor: isScanningThisItem(scanningItemId, itm.id)
                                ? '#FEF3C7'
                                : (idx % 2 === 0 ? '#FFFFFF' : '#FCFAF7')
                            }}
                          >
                            <td style={{ padding: '8px 10px', color: '#8D6E63', fontWeight: '600', textAlign: 'center' }}>
                              #{idx + 1}
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: '700', color: '#2D1A12', whiteSpace: 'nowrap' }}>
                              <div style={{ whiteSpace: 'nowrap' }}>{itm.suffix_key || `Pallet ${idx + 1}`}</div>
                              <div style={{ fontSize: '0.70rem', color: '#7B5233', fontWeight: '500', whiteSpace: 'nowrap' }}>Pallet đứng (4 tủ)</div>
                            </td>
                            <td style={{ padding: '5px 10px' }}>
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt={itm.suffix_key}
                                  style={{
                                    width: '60px',
                                    height: '42px',
                                    objectFit: 'cover',
                                    borderRadius: '4px',
                                    border: '1px solid #D1D5DB',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => onSelectItemDetail(itm, items)}
                                  title="Bấm để xem ảnh chi tiết"
                                />
                              ) : (
                                <span style={{ fontSize: '0.70rem', color: '#9CA3AF' }}>Chưa có ảnh</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                              <InlineEditableCell
                                value={itm.lpn}
                                itemId={itm.id}
                                field="csdl_lpn"
                                onSave={handleInlineEdit}
                                placeholder="Thiếu LPN"
                              />
                            </td>
                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                              <InlineEditableCell
                                value={itm.sku}
                                itemId={itm.id}
                                field="csdl_sku"
                                onSave={handleInlineEdit}
                                placeholder="Thiếu SKU"
                              />
                            </td>
                            <td style={{ padding: '8px 10px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                              {itm.batch_resolved || itm.batch_original || '—'}
                            </td>
                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                              <InlineEditableCell
                                value={o?.detected_lpn}
                                itemId={itm.id}
                                field="ocr_lpn"
                                onSave={handleInlineEdit}
                                isMatch={o ? o.is_lpn_match : null}
                                placeholder="—"
                              />
                            </td>
                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                              <InlineEditableCell
                                value={o?.detected_sku}
                                itemId={itm.id}
                                field="ocr_sku"
                                onSave={handleInlineEdit}
                                isMatch={o ? o.is_sku_match : null}
                                placeholder="—"
                              />
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {renderSmartStatusTag(o, isPassed, isError)}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <button
                                type="button"
                                onClick={() => onSelectItemDetail(itm, items)}
                                style={{
                                  backgroundColor: '#F3F4F6',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '5px',
                                  padding: '4px 8px',
                                  fontSize: '0.74rem',
                                  fontWeight: '700',
                                  color: '#374151',
                                  cursor: 'pointer'
                                }}
                              >
                                Xem chi tiết
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* DẠNG THẺ (CARDS CHO TỦ ĐỨNG - TỐI ƯU MOBILE & TABLET) */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                  {filteredBaseItems.map((itm, idx) => (
                    <BasePalletCard
                      key={itm.id || idx}
                      itm={itm}
                      idx={idx}
                      onSelectItemDetail={onSelectItemDetail}
                      allItems={items}
                      onInlineEdit={handleInlineEdit}
                      getItemStatus={getItemStatus}
                      renderSmartStatusTag={renderSmartStatusTag}
                      scanningItemId={scanningItemId}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HIỂN THỊ TOP NÓC (GỘP CHUNG CÁC TOP NÓC GIỐNG NHAU) */}
          {mainTab === 'top_noc' && (
            <div>
              {filteredTopGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8D6E63', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                  Không tìm thấy nhóm Pallet Nóc nào phù hợp với bộ lọc.
                </div>
              ) : viewMode === 'table' ? (
                /* BẢNG TOP NÓC GỘP (DẠNG BẢNG CÓ CUỘN NGANG MƯỢT TRÊN MOBILE) */
                <div className="lpn-cdm-table-wrapper" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #EADCC9', overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                  <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#EFF6FF', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                      <tr style={{ color: '#1E3A8A', borderBottom: '2px solid #DBEAFE' }}>
                        <th style={{ padding: '9px 10px', width: '45px', textAlign: 'center' }}>STT</th>
                        <th style={{ padding: '9px 12px', minWidth: '170px' }}>Pallet Nóc (Gộp)</th>
                        <th style={{ padding: '9px 12px', minWidth: '220px' }}>Ảnh các kiện</th>
                        <th style={{ padding: '9px 10px', minWidth: '110px' }}>Mã LPN</th>
                        <th style={{ padding: '9px 10px', minWidth: '115px' }}>Mã SKU</th>
                        <th style={{ padding: '9px 10px', minWidth: '115px' }}>Đi cùng Pallet</th>
                        <th style={{ padding: '9px 10px', minWidth: '110px' }}>LPN Đọc AI</th>
                        <th style={{ padding: '9px 10px', minWidth: '115px' }}>SKU Đọc AI</th>
                        <th style={{ padding: '9px 10px', width: '90px', textAlign: 'center' }}>Trạng thái</th>
                        <th style={{ padding: '9px 10px', width: '135px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTopGroups.map((grp, gIdx) => {
                        const isExpanded = Boolean(expandedTopGroups[grp.groupId]);
                        const firstOcr = grp.items.find((it) => it.ocr)?.ocr;
                        const targetOcrItm = grp.items.find((it) => it.ocr) || grp.items[0];

                        return (
                          <React.Fragment key={grp.groupId || gIdx}>
                            <tr
                              style={{
                                borderBottom: '1px solid #F0E6D8',
                                backgroundColor: gIdx % 2 === 0 ? '#FFFFFF' : '#F9FBFE'
                              }}
                            >
                              <td style={{ padding: '8px 10px', color: '#8D6E63', fontWeight: '600', textAlign: 'center' }}>
                                #{gIdx + 1}
                              </td>

                              {/* Tên nhóm Pallet Nóc & Danh sách tủ */}
                              <td style={{ padding: '8px 12px' }}>
                                <div style={{ fontWeight: '800', color: '#1D4ED8', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                                  {grp.groupName.replace(/\s*\(\d+\s*tủ\)/i, '')}
                                </div>
                                <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginTop: '2px', flexWrap: 'nowrap' }}>
                                  <span
                                    style={{
                                      padding: '1px 6px',
                                      borderRadius: '3px',
                                      fontSize: '0.68rem',
                                      fontWeight: '700',
                                      backgroundColor: grp.isEven ? '#DBEAFE' : '#FEF3C7',
                                      color: grp.isEven ? '#1E40AF' : '#B45309',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {grp.boxCount} tủ
                                  </span>
                                  <span style={{ fontSize: '0.70rem', color: '#64748B', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                    ({grp.items.map((it) => it.suffix_key).join(', ')})
                                  </span>
                                </div>
                              </td>

                              {/* Dải ảnh thumbnail của các kiện trong nhóm */}
                              <td style={{ padding: '6px 12px' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'nowrap' }}>
                                  {grp.items.map((it, itIdx) => {
                                    const firstImg = it.first_image || (it.images && it.images.length > 0 ? it.images[0] : null);
                                    const imgUrl = resolveImgUrl(firstImg);
                                    return (
                                      <div key={it.id || itIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        {imgUrl ? (
                                          <img
                                            src={imgUrl}
                                            alt={it.suffix_key}
                                            style={{
                                              width: '46px',
                                              height: '34px',
                                              objectFit: 'cover',
                                              borderRadius: '4px',
                                              border: '1px solid #D1D5DB',
                                              cursor: 'pointer'
                                            }}
                                            onClick={() => onSelectItemDetail(it, items)}
                                            title={`Bấm để xem chi tiết ${it.suffix_key}`}
                                          />
                                        ) : (
                                          <div style={{ width: '46px', height: '34px', backgroundColor: '#E5E7EB', borderRadius: '4px', fontSize: '0.60rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                                            No ảnh
                                          </div>
                                        )}
                                        <span style={{ fontSize: '0.64rem', fontWeight: '700', color: '#4B5563', marginTop: '1px' }}>
                                          {it.suffix_key}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>

                              {/* Mã LPN chung */}
                              <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                <InlineEditableCell
                                  value={grp.lpn}
                                  itemId={targetOcrItm?.id}
                                  field="csdl_lpn"
                                  onSave={handleInlineEdit}
                                  placeholder="Thiếu LPN"
                                />
                              </td>

                              {/* Mã SKU chung */}
                              <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                <InlineEditableCell
                                  value={grp.sku}
                                  itemId={targetOcrItm?.id}
                                  field="csdl_sku"
                                  onSave={handleInlineEdit}
                                  placeholder="Thiếu SKU"
                                />
                              </td>

                              {/* Đi cùng với Pallet đứng (rút gọn đẹp) */}
                              <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                <span
                                  style={{
                                    padding: '2px 8px',
                                    backgroundColor: '#F1F5F9',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '4px',
                                    fontSize: '0.74rem',
                                    fontWeight: '600',
                                    color: '#334155',
                                    display: 'inline-block'
                                  }}
                                  title={grp.pairedPallets.join(', ')}
                                >
                                  {formatPairedPallets(grp.pairedPallets)}
                                </span>
                              </td>

                              {/* LPN Đọc AI */}
                              <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                <InlineEditableCell
                                  value={firstOcr?.detected_lpn}
                                  itemId={targetOcrItm?.id}
                                  field="ocr_lpn"
                                  onSave={handleInlineEdit}
                                  isMatch={firstOcr ? firstOcr.is_lpn_match : null}
                                  placeholder="—"
                                />
                              </td>

                              {/* SKU Đọc AI */}
                              <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                                <InlineEditableCell
                                  value={firstOcr?.detected_sku}
                                  itemId={targetOcrItm?.id}
                                  field="ocr_sku"
                                  onSave={handleInlineEdit}
                                  isMatch={firstOcr ? firstOcr.is_sku_match : null}
                                  placeholder="—"
                                />
                              </td>

                              {/* Trạng thái nhóm */}
                              <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                {grp.isPassed ? (
                                  <span style={{ padding: '3px 8px', backgroundColor: '#ECFDF5', color: '#047857', borderRadius: '4px', fontWeight: '700', fontSize: '0.74rem', whiteSpace: 'nowrap' }}>
                                    Đạt ({grp.boxCount} tủ)
                                  </span>
                                ) : grp.isError ? (
                                  <span style={{ padding: '3px 8px', backgroundColor: '#FEF2F2', color: '#B91C1C', borderRadius: '4px', fontWeight: '700', fontSize: '0.74rem', whiteSpace: 'nowrap' }}>
                                    Lệch/Lỗi
                                  </span>
                                ) : (
                                  <span style={{ padding: '3px 8px', backgroundColor: '#F3F4F6', color: '#4B5563', borderRadius: '4px', fontWeight: '600', fontSize: '0.74rem', whiteSpace: 'nowrap' }}>
                                    Chưa quét
                                  </span>
                                )}
                              </td>

                              {/* Thao tác */}
                              <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => onSelectItemDetail(grp.items[0], items)}
                                    style={{
                                      backgroundColor: '#F3F4F6',
                                      border: '1px solid #D1D5DB',
                                      borderRadius: '5px',
                                      padding: '4px 8px',
                                      fontSize: '0.72rem',
                                      fontWeight: '700',
                                      color: '#374151',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    Chi tiết
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleGroupExpand(grp.groupId)}
                                    style={{
                                      backgroundColor: isExpanded ? '#DBEAFE' : '#F9FAFB',
                                      border: '1px solid #CBD5E1',
                                      borderRadius: '5px',
                                      padding: '4px 8px',
                                      fontSize: '0.72rem',
                                      fontWeight: '600',
                                      color: isExpanded ? '#1E40AF' : '#4B5563',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {isExpanded ? 'Thu gọn' : 'Từng kiện'}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Chi tiết từng kiện con bên trong nhóm Top nóc (khi bấm 'Từng kiện') */}
                            {isExpanded && (
                              <tr>
                                <td colSpan="10" style={{ backgroundColor: '#F8FAFC', padding: '10px 16px', borderBottom: '2px solid #E2E8F0' }}>
                                  <div style={{ fontSize: '0.76rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                    Chi tiết từng kiện trong {grp.groupName}:
                                  </div>
                                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    {grp.items.map((subItm, subIdx) => {
                                      const { isPassed, isError } = getItemStatus(subItm);
                                      const firstImg = subItm.first_image || (subItm.images && subItm.images.length > 0 ? subItm.images[0] : null);
                                      const imgUrl = resolveImgUrl(firstImg);
                                      return (
                                        <div
                                          key={subItm.id || subIdx}
                                          style={{
                                            border: '1px solid #CBD5E1',
                                            borderRadius: '6px',
                                            padding: '8px 10px',
                                            backgroundColor: '#FFFFFF',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            minWidth: '240px'
                                          }}
                                        >
                                          {imgUrl && (
                                            <img
                                              src={imgUrl}
                                              alt={subItm.suffix_key}
                                              style={{ width: '50px', height: '38px', objectFit: 'cover', borderRadius: '4px' }}
                                            />
                                          )}
                                          <div style={{ flex: 1, fontSize: '0.74rem' }}>
                                            <div style={{ fontWeight: '800', color: '#1E293B', marginBottom: '2px' }}>{subItm.suffix_key}</div>
                                            <div style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                              <span style={{ minWidth: '32px' }}>LPN:</span>
                                              <InlineEditableCell
                                                value={subItm.lpn}
                                                itemId={subItm.id}
                                                field="csdl_lpn"
                                                onSave={handleInlineEdit}
                                                placeholder="—"
                                              />
                                            </div>
                                            <div style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                              <span style={{ minWidth: '32px' }}>SKU:</span>
                                              <InlineEditableCell
                                                value={subItm.sku}
                                                itemId={subItm.id}
                                                field="csdl_sku"
                                                onSave={handleInlineEdit}
                                                placeholder="—"
                                              />
                                            </div>
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {renderSmartStatusTag(subItm.ocr, isPassed, isError)}
                                            <button
                                              type="button"
                                              onClick={() => onSelectItemDetail(subItm, items)}
                                              style={{
                                                backgroundColor: '#2563EB',
                                                color: '#FFFFFF',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '3px 8px',
                                                fontSize: '0.70rem',
                                                fontWeight: '700',
                                                cursor: 'pointer'
                                              }}
                                            >
                                              Xem ảnh
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* DẠNG THẺ (CARDS CHO TOP NÓC - TỐI ƯU MOBILE & TABLET) */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
                  {filteredTopGroups.map((grp, gIdx) => (
                    <TopNocGroupCard
                      key={grp.groupId || gIdx}
                      grp={grp}
                      gIdx={gIdx}
                      onSelectItemDetail={onSelectItemDetail}
                      allItems={items}
                      onInlineEdit={handleInlineEdit}
                      isExpanded={Boolean(expandedTopGroups[grp.groupId])}
                      onToggleExpand={toggleGroupExpand}
                      renderSmartStatusTag={renderSmartStatusTag}
                      getItemStatus={getItemStatus}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Component thẻ kiện Tủ Đứng (Tối ưu cảm ứng di động & Dạng Thẻ)
 */
const BasePalletCard = ({
  itm,
  idx,
  onSelectItemDetail,
  allItems,
  onInlineEdit,
  getItemStatus,
  renderSmartStatusTag,
  scanningItemId
}) => {
  const { isPassed, isError } = getItemStatus(itm);
  const firstImg = itm.first_image || (itm.images && itm.images.length > 0 ? itm.images[0] : null);
  const imgUrl = resolveImgUrl(firstImg);
  const o = itm.ocr;
  const isScanning = isScanningThisItem(scanningItemId, itm.id);
  const csdlLpn = String(itm.lpn || '').trim();
  const aiLpn = String(o?.detected_lpn || '').trim();
  const isLpnDiff = Boolean(aiLpn && csdlLpn && aiLpn.toUpperCase() !== csdlLpn.toUpperCase());

  const csdlSku = String(itm.sku || '').trim();
  const aiSku = String(o?.detected_sku || '').trim();
  const isSkuDiff = Boolean(aiSku && csdlSku && aiSku.toUpperCase() !== csdlSku.toUpperCase());

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: isScanning
          ? '1.5px solid #D97706'
          : isError
          ? '1.5px solid #FCA5A5'
          : isPassed
          ? '1.5px solid #86EFAC'
          : '1px solid #EADCC9',
        borderRadius: '10px',
        padding: '10px 12px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'all 0.15s ease'
      }}
    >
      {/* Header Thẻ: STT + Tên Pallet + Trạng thái */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#8D6E63' }}>#{idx + 1}</span>
          <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#2D1A12' }}>
            {itm.suffix_key || `Pallet ${idx + 1}`}
          </span>
          <span style={{ fontSize: '0.68rem', color: '#7B5233', backgroundColor: '#FAF6F0', padding: '1px 6px', borderRadius: '4px', border: '1px solid #EADCC9', fontWeight: '600' }}>
            Pallet đứng (4 tủ)
          </span>
        </div>
        {renderSmartStatusTag(o, isPassed, isError)}
      </div>

      {/* Body: Ảnh bên trái + Mã LPN/SKU bên phải (chỉ hiện 1 mã, chỉ hiện đối chiếu khi lệch) */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {/* Ảnh thumbnail to rõ, chạm vào để xem chi tiết */}
        <div
          onClick={() => onSelectItemDetail(itm, allItems)}
          style={{
            position: 'relative',
            width: '80px',
            height: '58px',
            flexShrink: 0,
            borderRadius: '6px',
            overflow: 'hidden',
            border: '1px solid #E5E7EB',
            cursor: 'pointer',
            backgroundColor: '#F3F4F6'
          }}
          title="Chạm để xem ảnh chi tiết"
        >
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={itm.suffix_key}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', color: '#9CA3AF' }}>
              Chưa ảnh
            </div>
          )}
          <div style={{ position: 'absolute', bottom: '2px', right: '2px', backgroundColor: 'rgba(0,0,0,0.65)', color: '#FFF', borderRadius: '3px', padding: '1px 4px', fontSize: '0.55rem', fontWeight: '700' }}>
            🔍 Xem
          </div>
        </div>

        {/* Thông tin LPN & SKU */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.76rem' }}>
          {/* LPN */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: '3px 8px', borderRadius: '5px' }}>
            <span style={{ color: '#64748B', fontSize: '0.70rem', fontWeight: '700', width: '32px' }}>LPN:</span>
            {isLpnDiff ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                <InlineEditableCell
                  value={itm.lpn}
                  itemId={itm.id}
                  field="csdl_lpn"
                  onSave={onInlineEdit}
                  placeholder="Thiếu LPN"
                />
                <span style={{ color: '#DC2626', fontSize: '0.65rem', fontWeight: 'bold' }}>≠</span>
                <InlineEditableCell
                  value={o?.detected_lpn}
                  itemId={itm.id}
                  field="ocr_lpn"
                  onSave={onInlineEdit}
                  isMatch={false}
                  placeholder="AI chưa đọc"
                />
              </div>
            ) : (
              <InlineEditableCell
                value={itm.lpn || o?.detected_lpn}
                itemId={itm.id}
                field="csdl_lpn"
                onSave={onInlineEdit}
                isMatch={o ? o.is_lpn_match : null}
                placeholder="Thiếu LPN"
              />
            )}
          </div>

          {/* SKU */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: '3px 8px', borderRadius: '5px' }}>
            <span style={{ color: '#64748B', fontSize: '0.70rem', fontWeight: '700', width: '32px' }}>SKU:</span>
            {isSkuDiff ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                <InlineEditableCell
                  value={itm.sku}
                  itemId={itm.id}
                  field="csdl_sku"
                  onSave={onInlineEdit}
                  placeholder="Thiếu SKU"
                />
                <span style={{ color: '#DC2626', fontSize: '0.65rem', fontWeight: 'bold' }}>≠</span>
                <InlineEditableCell
                  value={o?.detected_sku}
                  itemId={itm.id}
                  field="ocr_sku"
                  onSave={onInlineEdit}
                  isMatch={false}
                  placeholder="AI chưa đọc"
                />
              </div>
            ) : (
              <InlineEditableCell
                value={itm.sku || o?.detected_sku}
                itemId={itm.id}
                field="csdl_sku"
                onSave={onInlineEdit}
                isMatch={o ? o.is_sku_match : null}
                placeholder="Thiếu SKU"
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer: Lô hàng + Nút Xem chi tiết */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px dashed #F1F5F9' }}>
        <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
          Lô: <b>{itm.batch_resolved || itm.batch_original || '—'}</b>
        </span>
        <button
          type="button"
          onClick={() => onSelectItemDetail(itm, allItems)}
          style={{
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            border: '1px solid #BFDBFE',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '0.74rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          Xem chi tiết
        </button>
      </div>
    </div>
  );
};

/**
 * Component thẻ nhóm Top Nóc (Tối ưu cảm ứng di động & Dạng Thẻ)
 */
const TopNocGroupCard = ({
  grp,
  gIdx,
  onSelectItemDetail,
  allItems,
  onInlineEdit,
  isExpanded,
  onToggleExpand,
  renderSmartStatusTag,
  getItemStatus
}) => {
  const firstOcr = grp.items.find((it) => it.ocr)?.ocr;
  const targetOcrItm = grp.items.find((it) => it.ocr) || grp.items[0];
  const displayName = grp.groupName.replace(/\s*\(\d+\s*tủ\)/i, '');
  const csdlGrpLpn = String(grp.lpn || '').trim();
  const aiGrpLpn = String(firstOcr?.detected_lpn || '').trim();
  const isGrpLpnDiff = Boolean(aiGrpLpn && csdlGrpLpn && aiGrpLpn.toUpperCase() !== csdlGrpLpn.toUpperCase());

  const csdlGrpSku = String(grp.sku || '').trim();
  const aiGrpSku = String(firstOcr?.detected_sku || '').trim();
  const isGrpSkuDiff = Boolean(aiGrpSku && csdlGrpSku && aiGrpSku.toUpperCase() !== csdlGrpSku.toUpperCase());

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: grp.isError ? '1.5px solid #FCA5A5' : (grp.isPassed ? '1.5px solid #93C5FD' : '1px solid #EADCC9'),
        borderRadius: '10px',
        padding: '10px 12px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
    >
      {/* Header: Tên Pallet Nóc + Badge số tủ + Trạng thái */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#8D6E63' }}>#{gIdx + 1}</span>
          <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#1D4ED8' }}>
            {displayName}
          </span>
          <span style={{ fontSize: '0.70rem', color: '#1E40AF', backgroundColor: '#DBEAFE', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
            {grp.boxCount} tủ
          </span>
        </div>
        {grp.isPassed ? (
          <span style={{ padding: '2px 8px', backgroundColor: '#ECFDF5', color: '#047857', borderRadius: '4px', fontWeight: '700', fontSize: '0.72rem' }}>
            Đạt ({grp.boxCount} tủ)
          </span>
        ) : grp.isError ? (
          <span style={{ padding: '2px 8px', backgroundColor: '#FEF2F2', color: '#B91C1C', borderRadius: '4px', fontWeight: '700', fontSize: '0.72rem' }}>
            Lệch/Lỗi
          </span>
        ) : (
          <span style={{ padding: '2px 8px', backgroundColor: '#F3F4F6', color: '#4B5563', borderRadius: '4px', fontWeight: '600', fontSize: '0.72rem' }}>
            Chưa quét
          </span>
        )}
      </div>

      {/* Sub-header: Danh sách kiện & Pallet đi cùng */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
        <span style={{ color: '#475569' }}>
          Kiện: <b>{grp.items.map((it) => it.suffix_key).join(', ')}</b>
        </span>
        <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
          Đi cùng: {formatPairedPallets(grp.pairedPallets)}
        </span>
      </div>

      {/* Dải ảnh thumbnail của các kiện con: cuộn ngang mượt */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '2px 0', WebkitOverflowScrolling: 'touch' }}>
        {grp.items.map((it, itIdx) => {
          const firstImg = it.first_image || (it.images && it.images.length > 0 ? it.images[0] : null);
          const imgUrl = resolveImgUrl(firstImg);
          return (
            <div
              key={it.id || itIdx}
              onClick={() => onSelectItemDetail(it, allItems)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, cursor: 'pointer' }}
              title={`Xem chi tiết ${it.suffix_key}`}
            >
              {imgUrl ? (
                <img
                  src={imgUrl}
                  alt={it.suffix_key}
                  style={{ width: '52px', height: '38px', objectFit: 'cover', borderRadius: '5px', border: '1px solid #D1D5DB' }}
                />
              ) : (
                <div style={{ width: '52px', height: '38px', backgroundColor: '#E5E7EB', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', color: '#6B7280' }}>
                  No ảnh
                </div>
              )}
              <span style={{ fontSize: '0.64rem', fontWeight: '700', color: '#475569', marginTop: '1px' }}>
                {it.suffix_key}
              </span>
            </div>
          );
        })}
      </div>

      {/* So sánh LPN & SKU chung */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.76rem' }}>
        {/* LPN */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: '3px 8px', borderRadius: '5px' }}>
          <span style={{ color: '#64748B', fontSize: '0.70rem', fontWeight: '700', width: '32px' }}>LPN:</span>
          {isGrpLpnDiff ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
              <InlineEditableCell
                value={grp.lpn}
                itemId={targetOcrItm?.id}
                field="csdl_lpn"
                onSave={onInlineEdit}
                placeholder="Thiếu LPN"
              />
              <span style={{ color: '#DC2626', fontSize: '0.65rem', fontWeight: 'bold' }}>≠</span>
              <InlineEditableCell
                value={firstOcr?.detected_lpn}
                itemId={targetOcrItm?.id}
                field="ocr_lpn"
                onSave={onInlineEdit}
                isMatch={false}
                placeholder="AI chưa đọc"
              />
            </div>
          ) : (
            <InlineEditableCell
              value={grp.lpn || firstOcr?.detected_lpn}
              itemId={targetOcrItm?.id}
              field="csdl_lpn"
              onSave={onInlineEdit}
              isMatch={firstOcr ? firstOcr.is_lpn_match : null}
              placeholder="Thiếu LPN"
            />
          )}
        </div>

        {/* SKU */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: '3px 8px', borderRadius: '5px' }}>
          <span style={{ color: '#64748B', fontSize: '0.70rem', fontWeight: '700', width: '32px' }}>SKU:</span>
          {isGrpSkuDiff ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
              <InlineEditableCell
                value={grp.sku}
                itemId={targetOcrItm?.id}
                field="csdl_sku"
                onSave={onInlineEdit}
                placeholder="Thiếu SKU"
              />
              <span style={{ color: '#DC2626', fontSize: '0.65rem', fontWeight: 'bold' }}>≠</span>
              <InlineEditableCell
                value={firstOcr?.detected_sku}
                itemId={targetOcrItm?.id}
                field="ocr_sku"
                onSave={onInlineEdit}
                isMatch={false}
                placeholder="AI chưa đọc"
              />
            </div>
          ) : (
            <InlineEditableCell
              value={grp.sku || firstOcr?.detected_sku}
              itemId={targetOcrItm?.id}
              field="csdl_sku"
              onSave={onInlineEdit}
              isMatch={firstOcr ? firstOcr.is_sku_match : null}
              placeholder="Thiếu SKU"
            />
          )}
        </div>
      </div>

      {/* Footer: Nút Xem chi tiết & Từng kiện con */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px dashed #E2E8F0' }}>
        <button
          type="button"
          onClick={() => onToggleExpand(grp.groupId)}
          style={{
            backgroundColor: isExpanded ? '#DBEAFE' : '#F1F5F9',
            color: isExpanded ? '#1E40AF' : '#475569',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '0.74rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          {isExpanded ? '▲ Thu gọn' : '▼ Từng kiện'}
        </button>
        <button
          type="button"
          onClick={() => onSelectItemDetail(grp.items[0], allItems)}
          style={{
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            border: '1px solid #BFDBFE',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '0.74rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          Xem chi tiết
        </button>
      </div>

      {/* Chi tiết từng kiện con khi mở rộng */}
      {isExpanded && (
        <div style={{ backgroundColor: '#F8FAFC', borderRadius: '6px', padding: '6px 8px', border: '1px solid #E2E8F0', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {grp.items.map((subItm, subIdx) => {
            const { isPassed: subPassed, isError: subError } = getItemStatus(subItm);
            const subFirstImg = subItm.first_image || (subItm.images && subItm.images.length > 0 ? subItm.images[0] : null);
            const subImgUrl = resolveImgUrl(subFirstImg);
            return (
              <div
                key={subItm.id || subIdx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 6px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '5px',
                  border: '1px solid #E2E8F0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {subImgUrl && (
                    <img
                      src={subImgUrl}
                      alt={subItm.suffix_key}
                      style={{ width: '36px', height: '26px', objectFit: 'cover', borderRadius: '3px' }}
                      onClick={() => onSelectItemDetail(subItm, allItems)}
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.72rem', color: '#1E293B' }}>{subItm.suffix_key}</div>
                    <div style={{ fontSize: '0.64rem', color: '#64748B' }}>LPN: {subItm.lpn}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {renderSmartStatusTag(subItm.ocr, subPassed, subError)}
                  <button
                    type="button"
                    onClick={() => onSelectItemDetail(subItm, allItems)}
                    style={{
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '0.66rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Xem
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const isScanningThisItem = (scanningId, itemId) => Boolean(scanningId && scanningId === itemId);

export default ContainerDetailModal;
