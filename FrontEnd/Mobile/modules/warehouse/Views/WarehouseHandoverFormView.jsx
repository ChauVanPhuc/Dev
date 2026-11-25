import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Edit3,
  ClipboardCheck,
  AlertTriangle,
  RefreshCw,
  Layers,
  Folder,
  FolderCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  Table,
  LayoutGrid,
  X,
  RotateCcw,
  Check,
  Info,
  User,
  Warehouse,
  Calendar,
  Clock,
  Building2,
  FileText,
} from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import Toast from '@mobile/Shared/Views/components/ui/Toast';
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect';
import useAuthStore from '@modules/auth/Models/authModel';
import mobileWarehouseService from '../services/mobileWarehouseService';
import WarehousePickerSheet from './components/WarehousePickerSheet';
import WarehouseGroupPickerSheet from './components/WarehouseGroupPickerSheet';
import WarehouseMultiPoSelect from './components/WarehouseMultiPoSelect';
import WarehousePhotoGrid from './components/WarehousePhotoGrid';
import {
  HANDOVER_STATUSES,
  getStatusBadge,
  todayISO,
  formatDateVN,
  formatNumberVN,
  hasWarehouseAction,
} from '../constants/warehouseConstants';
import '../styles/mobileWarehouse.css';

/**
 * Tự động lọc các nhóm vật tư phù hợp theo Kho xuất bàn giao:
 * - Kho vật tư (KVT): Tự động loại bỏ các nhóm Sơn (UV, Lót, Bóng, Stain...) và Bao bì (.BB, .X)
 * - Kho sơn (KSON): Tự động chọn các nhóm Sơn
 * - Kho bao bì (KDG): Tự động chọn các nhóm Bao bì, đóng gói
 */
const getSmartDefaultGroupsForWarehouse = (warehouseName, allGroupNames = []) => {
  const wh = String(warehouseName || '').toLowerCase();

  // 1. Kho Sơn - dầu màu (KSON)
  if (wh.includes('sơn') || wh.includes('kson')) {
    const paintGroups = allGroupNames.filter((g) => {
      const gLower = g.toLowerCase();
      return gLower.startsWith('sơn') || gLower === 'sơn';
    });
    return paintGroups.length > 0 ? paintGroups : allGroupNames;
  }

  // 2. Đóng gói - bao bì (KDG)
  if (wh.includes('bao bì') || wh.includes('đóng gói') || wh.includes('kdg')) {
    const pkgGroups = allGroupNames.filter((g) => {
      const gLower = g.toLowerCase();
      return gLower.includes('bao bì') || gLower.includes('thùng') || gLower.includes('carton');
    });
    return pkgGroups.length > 0 ? pkgGroups : allGroupNames;
  }

  // 3. Mặc định cho Kho vật tư (KVT) hoặc các kho khác: Luôn loại bỏ Sơn và Bao bì
  const vtGroups = allGroupNames.filter((g) => {
    const gLower = g.toLowerCase();
    const isPaint = gLower.startsWith('sơn') || gLower === 'sơn';
    const isPkg = gLower === 'bao bì, đóng gói' || gLower.includes('thùng') || gLower.includes('carton');
    return !isPaint && !isPkg;
  });
  return vtGroups.length > 0 ? vtGroups : allGroupNames;
};

const parsePoList = (raw) => {
  if (Array.isArray(raw)) {
    return Array.from(new Set(raw.map((c) => String(c || '').trim()).filter(Boolean)));
  }
  return Array.from(
    new Set(
      String(raw || '')
        .split(/[,;\n]+/)
        .map((c) => c.trim())
        .filter(Boolean)
    )
  );
};

const WarehouseHandoverFormView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, permissions, logout } = useAuthStore();
  const isNew = !id || id === 'new';

  const [meta, setMeta] = useState({ warehouses: [], factories: [], units: [], departments: [], customers: [], orders: [], accounts: [], issue_types: [] });
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(isNew);
  const [pickerOpen, setPickerOpen] = useState(false);

  // States quản lý nhiều PO & Lấy vật tư gộp theo nhiều PO
  const [poOptions, setPoOptions] = useState([]);
  const [selectedPoCodes, setSelectedPoCodes] = useState([]);
  const [isPoSheetOpen, setIsPoSheetOpen] = useState(false);
  const [selectedPoData, setSelectedPoData] = useState(null);
  const [loadingPoMaterials, setLoadingPoMaterials] = useState(false);
  const [expandedBreakdown, setExpandedBreakdown] = useState({});
  const poSearchTimerRef = useRef(null);

  // States lọc & chế độ xem bảng vật tư bàn giao
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [tableSearch, setTableSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK' | 'OVER_STOCK'

  // Quản lý Master vật tư PO & Chọn nhóm vật tư bàn giao
  const [poMasterMaterials, setPoMasterMaterials] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [isGroupSheetOpen, setIsGroupSheetOpen] = useState(false);
  const [userCustomQuantities, setUserCustomQuantities] = useState({});

  const [form, setForm] = useState({
    voucher_no: '',
    warehouse_name: 'Kho vật tư',
    factory_id: null,
    factory_name: '',
    issue_date: todayISO(),
    issue_type: 'Xuất sản xuất',
    deliverer_name: user?.full_name || user?.username || '',
    receiver_name: '',
    department_name: '',
    customer_code: '',
    customer_name: '',
    ctgs: '',
    content: '',
    status: 'PENDING',
    created_channel: 'Mobile',
    confirmed_by: '',
    confirmed_at: '',
    images: [],
    items: [],
  });

  const [confirmState, setConfirmState] = useState({ isOpen: false });
  const [msgModal, setMsgModal] = useState({ isOpen: false, type: 'info', title: '', message: '', onDone: null });
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ isVisible: true, message, type });
  };

  const canApprove = hasWarehouseAction(
    permissions,
    user,
    ['/warehouse/handover', 'mobile_warehouse-handover', 'mobile_warehouse', '/admin/warehouse/goods-issue', 'goods-issue', 'warehouse'],
    'approve'
  );
  const canEdit = hasWarehouseAction(
    permissions,
    user,
    ['/warehouse/handover', 'mobile_warehouse-handover', 'mobile_warehouse', '/admin/warehouse/goods-issue', 'goods-issue', 'warehouse'],
    'edit'
  );

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      try {
        const [metaRes, rawMats, existing, initialPos] = await Promise.all([
          mobileWarehouseService.getMobileMeta(),
          mobileWarehouseService.getRawMaterials(),
          isNew ? Promise.resolve(null) : mobileWarehouseService.getHandoverById(id),
          mobileWarehouseService.getSubPoCodes({ limit: 60 }),
        ]);
        if (!mounted) return;
        setMeta(metaRes);
        setMaterials(rawMats);
        setPoOptions(initialPos || []);

        if (existing) {
          const parsedPos = parsePoList(existing.ctgs);
          const fallbackPos = parsedPos.length > 0
            ? parsedPos
            : parsePoList((existing.items || []).map((it) => it.lsx).filter(Boolean).join(','));
          const joinedPos = fallbackPos.join(', ');
          setSelectedPoCodes(fallbackPos);

          if (fallbackPos.length > 0) {
            mobileWarehouseService.getPoMaterials(fallbackPos, existing.warehouse_name)
              .then((s) => {
                if (mounted && s) setSelectedPoData(s);
              })
              .catch(() => {});
          }
          const itemWithStock = (existing.items || []).map((it) => {
            const match = rawMats.find(
              (m) =>
                String(m.item_code || '').toLowerCase() === String(it.item_code || '').toLowerCase() &&
                String(m.warehouse_name || '').toLowerCase() === String(existing.warehouse_name || '').toLowerCase()
            );
            return {
              ...it,
              available_stock: match ? Number(match.closing_main || 0) : 0,
            };
          });
          setForm({
            voucher_no: existing.voucher_no || '',
            warehouse_name: existing.warehouse_name || '',
            factory_id: existing.factory_id || null,
            factory_name: existing.factory_name || '',
            issue_date: existing.issue_date || todayISO(),
            issue_type: existing.issue_type || 'Xuất sản xuất',
            deliverer_name: existing.deliverer_name || '',
            receiver_name: existing.receiver_name || '',
            department_name: existing.department_name || '',
            customer_code: existing.customer_code || '',
            customer_name: existing.customer_name || '',
            ctgs: joinedPos,
            content: existing.content || '',
            status: existing.status || 'PENDING',
            created_channel: existing.created_channel || 'Web',
            confirmed_by: existing.confirmed_by || '',
            confirmed_at: existing.confirmed_at || '',
            images: Array.isArray(existing.images) ? existing.images : [],
            items: itemWithStock,
          });
          setPoMasterMaterials(itemWithStock);
          const existingGroups = Array.from(new Set(itemWithStock.map((it) => it.group_type || 'Chưa phân nhóm')));
          setSelectedGroups(existingGroups);
          setIsEditing(false);
        } else {
          const defaultKvt = (metaRes?.warehouses || []).find(
            (w) => w.code === 'KVT' || String(w.name || '').toLowerCase().includes('vật tư')
          )?.name || 'Kho vật tư';

          setForm((prev) => ({
            ...prev,
            warehouse_name: prev.warehouse_name || defaultKvt,
            issue_type: metaRes?.issue_types?.[0] || 'Xuất sản xuất',
          }));
        }
      } catch (err) {
        console.error('[WarehouseHandoverFormView] Lỗi tải phiếu:', err);
        if (mounted) {
          setMsgModal({
            isOpen: true,
            type: 'error',
            title: 'Lỗi tải dữ liệu',
            message: err?.response?.data?.detail || err.message || 'Không thể tải chi tiết phiếu bàn giao.',
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, [id, isNew]);

  const readOnly = !isEditing;
  const loggedInAccountName = user?.full_name || user?.name || user?.username || '';
  const delivererDisplay = isNew
    ? loggedInAccountName
    : (form.deliverer_name || loggedInAccountName);

  const totalQty = useMemo(
    () => (form.items || []).reduce((acc, it) => acc + (Number(it.quantity1) || 0), 0),
    [form.items]
  );

  const hasOverStock = useMemo(() => {
    if (!isEditing) return false;
    return (form.items || []).some((it) => {
      const stock = Number(it.available_stock || 0);
      const qty = Number(it.quantity1 || 0);
      return qty > stock + 0.0001;
    });
  }, [form.items, isEditing]);

  // Thống kê nhóm vật tư tiêu hao từ PO Master hoặc items
  const masterGroups = useMemo(() => {
    const source = (poMasterMaterials && poMasterMaterials.length > 0)
      ? poMasterMaterials
      : (form.items || []);
    const counts = {};
    const stockCounts = {};
    source.forEach((it) => {
      const g = it.group_type || 'Chưa phân nhóm';
      counts[g] = (counts[g] || 0) + 1;
      if (Number(it.available_stock || 0) > 0) {
        stockCounts[g] = (stockCounts[g] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      inStockCount: stockCounts[name] || 0,
    }));
  }, [poMasterMaterials, form.items]);

  const isCustomGroup = masterGroups.length > 0 && selectedGroups.length > 0 && selectedGroups.length < masterGroups.length;

  const groupButtonLabel = useMemo(() => {
    if (masterGroups.length === 0) return 'Chọn nhóm vật tư';
    if (selectedGroups.length === 0) return `Chọn nhóm VT (0/${masterGroups.length})`;
    if (selectedGroups.length === masterGroups.length) return `Tất cả nhóm (${masterGroups.length})`;
    if (selectedGroups.length === 1) return `${selectedGroups[0]} (${form.items.length} VT)`;
    return `Đã chọn ${selectedGroups.length} nhóm (${form.items.length} VT)`;
  }, [masterGroups, selectedGroups, form.items.length]);

  // Thống kê tồn kho & vượt tồn
  const stockStats = useMemo(() => {
    let inStock = 0;
    let outOfStock = 0;
    let overStock = 0;
    (form.items || []).forEach((it) => {
      const stock = Number(it.available_stock || 0);
      const qty = Number(it.quantity1 || 0);
      if (stock > 0) inStock++;
      else outOfStock++;
      if (qty > stock + 0.0001) overStock++;
    });
    return { inStock, outOfStock, overStock };
  }, [form.items]);

  // Danh sách dòng sau khi lọc (kèm originalIndex chính xác để cập nhật form.items)
  const filteredItems = useMemo(() => {
    const q = tableSearch.toLowerCase().trim();
    return (form.items || [])
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        if (q) {
          const matchCode = String(item.item_code || '').toLowerCase().includes(q);
          const matchName = String(item.item_name || '').toLowerCase().includes(q);
          const matchGroup = String(item.group_type || '').toLowerCase().includes(q);
          const matchLsx = String(item.lsx || '').toLowerCase().includes(q);
          if (!matchCode && !matchName && !matchGroup && !matchLsx) return false;
        }
        if (stockFilter === 'IN_STOCK') {
          if (Number(item.available_stock || 0) <= 0) return false;
        } else if (stockFilter === 'OUT_OF_STOCK') {
          if (Number(item.available_stock || 0) > 0) return false;
        } else if (stockFilter === 'OVER_STOCK') {
          if (Number(item.quantity1 || 0) <= Number(item.available_stock || 0) + 0.0001) return false;
        }
        return true;
      });
  }, [form.items, tableSearch, stockFilter]);

  const handleApplyGroups = (newSelectedGroups, selectedItemCodes) => {
    setSelectedGroups(newSelectedGroups);
    const selectedSet = new Set(newSelectedGroups);
    const codeSet = Array.isArray(selectedItemCodes) ? new Set(selectedItemCodes) : null;
    const source = (poMasterMaterials && poMasterMaterials.length > 0)
      ? poMasterMaterials
      : form.items;

    const filtered = source
      .filter((m) => selectedSet.has(m.group_type || 'Chưa phân nhóm'))
      .filter((m) => !codeSet || codeSet.has(m.item_code))
      .map((m) => {
        const savedQty = userCustomQuantities[m.item_code];
        if (savedQty !== undefined) {
          const rate = Number(m.conversion_rate || 1);
          return {
            ...m,
            quantity1: savedQty,
            quantity2: Math.round(savedQty * rate * 100) / 100,
          };
        }
        return m;
      });

    setForm((prev) => ({
      ...prev,
      items: filtered,
    }));
  };

  const filteredTotalQty = useMemo(() => {
    return filteredItems.reduce((acc, { item }) => acc + (Number(item.quantity1) || 0), 0);
  }, [filteredItems]);

  const handlePoSearch = (query) => {
    if (poSearchTimerRef.current) clearTimeout(poSearchTimerRef.current);
    poSearchTimerRef.current = setTimeout(async () => {
      try {
        const results = await mobileWarehouseService.getSubPoCodes({ search: query, limit: 100 });
        setPoOptions(results);
      } catch (err) {
        console.warn('Lỗi tìm kiếm PO:', err);
      }
    }, 250);
  };

  const handleApplyPoSelection = async (poListInput, targetWarehouseName, metaMap = {}) => {
    const cleanPos = parsePoList(poListInput);
    const joinedPos = cleanPos.join(', ');
    setSelectedPoCodes(cleanPos);

    if (cleanPos.length === 0) {
      setForm((p) => ({ ...p, ctgs: '', items: [] }));
      setSelectedPoData(null);
      setPoMasterMaterials([]);
      setSelectedGroups([]);
      setUserCustomQuantities({});
      return;
    }

    const whName = targetWarehouseName !== undefined ? targetWarehouseName : form.warehouse_name;
    const matchedCustomers = Array.from(
      new Set(
        cleanPos
          .map((code) => {
            const opt = metaMap[code] || (poOptions || []).find((o) => String(o.value || '').trim() === code);
            return opt?.customer || '';
          })
          .filter(Boolean)
      )
    );

    setForm((p) => {
      const prevAutoPrefix = 'Xuất vật tư sản xuất theo PO ';
      const shouldUpdateContent = !p.content || p.content.startsWith(prevAutoPrefix);
      return {
        ...p,
        ctgs: joinedPos,
        warehouse_name: whName,
        customer_name: p.customer_name || matchedCustomers.join(', '),
        content: shouldUpdateContent ? `${prevAutoPrefix}${joinedPos}` : p.content,
      };
    });

    setLoadingPoMaterials(true);
    try {
      const summary = await mobileWarehouseService.getPoMaterials(cleanPos, whName);
      if (summary) {
        setSelectedPoData(summary);
        if (summary.customer) {
          setForm((p) => ({ ...p, customer_name: p.customer_name || summary.customer }));
        }

        if (summary.not_found_codes && summary.not_found_codes.length > 0) {
          showToast(`Không tìm thấy PO: ${summary.not_found_codes.join(', ')}`, 'warning');
        }

        if (summary.materials && summary.materials.length > 0) {
          const newItems = summary.materials.map((m) => {
            const req = Number(m.required_qty || 0);
            const cleanReq = Math.round(req * 1000) / 1000;
            const stock = Number(m.available_stock || 0);
            const itemLsx = m.lsx || (Array.isArray(m.source_pos) && m.source_pos.length > 0 ? m.source_pos.join(', ') : joinedPos);
            return {
              item_code: m.item_code,
              item_name: m.item_name,
              unit1: m.unit1 || m.unit || 'cái',
              quantity1: cleanReq,
              unit2: '',
              conversion_rate: 1.0,
              quantity2: cleanReq,
              available_stock: stock,
              required_qty: cleanReq,
              group_type: m.group_type || '',
              lsx: itemLsx,
              package_split: '',
              notes: m.notes || (m.group_type ? `[${m.group_type}] PO ${itemLsx}` : `PO ${itemLsx}`),
              breakdown: m.breakdown || [],
            };
          });

          setPoMasterMaterials(newItems);

          // Nếu người dùng đã chọn nhóm vật tư từ trước -> giữ lại các nhóm đang chọn & cộng dồn định mức tự động
          if (selectedGroups.length > 0) {
            const availableGroupSet = new Set(newItems.map((it) => it.group_type || 'Chưa phân nhóm'));
            const keptGroups = selectedGroups.filter((g) => availableGroupSet.has(g));
            const keptSet = new Set(keptGroups);
            const mergedFiltered = newItems.filter((it) => keptSet.has(it.group_type || 'Chưa phân nhóm'));

            setSelectedGroups(keptGroups);
            setUserCustomQuantities({});
            setForm((p) => ({
              ...p,
              items: mergedFiltered,
            }));
            showToast(`Đã cập nhật định mức gộp cho ${cleanPos.length} PO (${mergedFiltered.length} vật tư)`, 'success');
          } else {
            // Chưa chọn nhóm nào -> mở Bottom Sheet chọn nhóm 1 lần duy nhất cho toàn bộ PO đã chọn
            setSelectedGroups([]);
            setUserCustomQuantities({});
            setForm((p) => ({
              ...p,
              items: [],
            }));

            if (typeof document !== 'undefined' && document.activeElement && document.activeElement.blur) {
              document.activeElement.blur();
            }
            setIsGroupSheetOpen(true);
          }
        } else {
          setPoMasterMaterials([]);
          setSelectedGroups([]);
          setForm((p) => ({ ...p, items: [] }));
          showToast(`Các PO ${joinedPos} chưa có định mức vật tư trong hệ thống`, 'info');
        }
      }
    } catch (err) {
      console.error('[WarehouseHandoverFormView] Lỗi tải vật tư theo nhiều PO:', err);
      showToast(err?.response?.data?.detail || err.message || 'Không thể tải vật tư theo PO.', 'error');
    } finally {
      setLoadingPoMaterials(false);
    }
  };

  const handleRemoveSinglePo = (poCodeToRemove) => {
    const nextPos = selectedPoCodes.filter((c) => c !== poCodeToRemove);
    handleApplyPoSelection(nextPos);
  };

  const handleClearAllPos = () => {
    handleApplyPoSelection([]);
  };

  const handleRemoveOutOfStock = () => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((it) => Number(it.available_stock || 0) > 0),
    }));
  };

  const handleClampQtyToStock = () => {
    setForm((prev) => {
      const newItems = prev.items.map((it) => {
        const stock = Number(it.available_stock || 0);
        const qty = Number(it.quantity1 || 0);
        if (qty > stock) {
          const newQ = Math.max(0, stock);
          const rate = Number(it.conversion_rate || 1);
          if (it.item_code) {
            setUserCustomQuantities((prevCustom) => ({
              ...prevCustom,
              [it.item_code]: newQ,
            }));
          }
          return {
            ...it,
            quantity1: newQ,
            quantity2: Math.round(newQ * rate * 100) / 100,
          };
        }
        return it;
      });
      return { ...prev, items: newItems };
    });
  };

  const handleResetQtyToQuota = () => {
    setUserCustomQuantities({});
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it) => {
        if (it.required_qty !== undefined && it.required_qty !== null) {
          const req = Number(it.required_qty || 0);
          const cleanReq = Math.round(req * 1000) / 1000;
          const rate = Number(it.conversion_rate || 1);
          return {
            ...it,
            quantity1: cleanReq,
            quantity2: Math.round(cleanReq * rate * 100) / 100,
          };
        }
        return it;
      }),
    }));
  };

  const toggleBreakdown = (idx) => {
    setExpandedBreakdown((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleSelectMaterial = async (mat) => {
    const rate = Number(mat.conversion_rate || 1);
    const wh = form.warehouse_name || mat.warehouse_name || '';
    let liveAvail = Number(mat.closing_main || 0);
    try {
      const check = await mobileWarehouseService.checkStock(wh, mat.item_code);
      if (check && check.available !== undefined) liveAvail = Number(check.available);
    } catch (e) {
      console.warn('[WarehouseHandoverFormView] Check stock fallback:', e);
    }

    setForm((prev) => ({
      ...prev,
      warehouse_name: wh,
      items: [
        ...prev.items,
        {
          item_code: mat.item_code,
          item_name: mat.item_name,
          unit1: mat.unit_main || 'cái',
          quantity1: Math.min(1, liveAvail > 0 ? liveAvail : 1),
          unit2: mat.unit_conversion || '',
          conversion_rate: rate,
          quantity2: Math.round(Math.min(1, liveAvail > 0 ? liveAvail : 1) * rate * 100) / 100,
          available_stock: liveAvail,
          lsx: prev.ctgs || '',
          package_split: '',
          notes: prev.ctgs ? `PO ${prev.ctgs}` : '',
        },
      ],
    }));
  };

  const updateLine = (idx, field, val) => {
    setForm((prev) => {
      const next = [...prev.items];
      const cur = { ...next[idx], [field]: val };
      if (field === 'quantity1' || field === 'conversion_rate') {
        const q1 = Number(cur.quantity1 || 0);
        const rate = Number(cur.conversion_rate || 1);
        cur.quantity2 = Math.round(q1 * rate * 100) / 100;
        if (field === 'quantity1' && cur.item_code) {
          setUserCustomQuantities((prevCustom) => ({
            ...prevCustom,
            [cur.item_code]: q1,
          }));
        }
      }
      next[idx] = cur;
      return { ...prev, items: next };
    });
  };

  const removeLine = (idx) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const validate = () => {
    if (!form.warehouse_name) return 'Vui lòng chọn Kho xuất / bàn giao.';
    if (!form.factory_id && !form.factory_name) return 'Vui lòng chọn Nhà máy nhận bàn giao.';
    if (!String(form.department_name || '').trim() && !form.customer_name) return 'Vui lòng nhập Bộ phận nhận.';
    if (!form.items || form.items.length === 0) return 'Vui lòng chọn ít nhất 1 vật tư bàn giao.';
    for (let i = 0; i < form.items.length; i++) {
      const it = form.items[i];
      const q = Number(it.quantity1 || 0);
      if (q <= 0) return `Dòng ${i + 1}: Số lượng bàn giao phải lớn hơn 0.`;
      if (q > Number(it.available_stock || 0) + 0.0001) {
        return `Dòng ${i + 1} (${it.item_code}): Số lượng bàn giao (${q}) vượt quá tồn khả dụng (${it.available_stock}).`;
      }
    }
    return '';
  };

  const submitSave = async (targetStatus) => {
    const errText = validate();
    if (errText) {
      setMsgModal({ isOpen: true, type: 'warning', title: 'Kiểm tra lại thông tin', message: errText });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        voucher_no: form.voucher_no.trim() || undefined,
        warehouse_name: form.warehouse_name,
        issue_date: isNew ? todayISO() : (form.issue_date || todayISO()),
        deliverer_name: loggedInAccountName || delivererDisplay || form.deliverer_name || 'Administrator',
        receiver_name: String(form.receiver_name || '').trim(),
        created_by: loggedInAccountName || undefined,
        factory_id: form.factory_id ? Number(form.factory_id) : null,
        factory_name: form.factory_name || '',
        department_name: String(form.department_name || '').trim(),
        customer_code: form.customer_code,
        customer_name: form.customer_name,
        issue_type: form.issue_type || meta?.issue_types?.[0] || 'Xuất sản xuất',
        status: targetStatus || form.status,
        ctgs: form.ctgs || selectedPoCodes.join(', ') || undefined,
        content: form.content,
        images: form.images,
        items: form.items.map((it, idx) => ({
          line_no: idx + 1,
          item_code: it.item_code,
          item_name: it.item_name,
          unit1: it.unit1 || 'cái',
          quantity1: Number(it.quantity1),
          unit2: it.unit2 || '',
          quantity2: Number(it.quantity2 || 0),
          conversion_rate: Number(it.conversion_rate || 1),
          lsx: it.lsx || '',
          package_split: it.package_split || '',
          notes: it.notes || '',
        })),
      };

      const saved = isNew
        ? await mobileWarehouseService.createHandover(payload)
        : await mobileWarehouseService.updateHandover(id, payload);

      setMsgModal({
        isOpen: true,
        type: 'success',
        title: 'Đã lưu phiếu bàn giao',
        message: `Phiếu ${saved.voucher_no} đã được ghi vào hệ thống Xuất kho & hiển thị trực tiếp trên Web.`,
        onDone: () => navigate('/warehouse/handover'),
      });
    } catch (err) {
      console.error('[WarehouseHandoverFormView] Lỗi lưu phiếu:', err);
      const isAuthErr = err?.response?.status === 401;
      setMsgModal({
        isOpen: true,
        type: 'error',
        title: 'Không thể lưu phiếu',
        message: err?.response?.data?.detail || err.message || 'Lỗi khi tạo phiếu bàn giao.',
        onDone: isAuthErr
          ? () => {
            logout();
            navigate('/login', { replace: true });
          }
          : null,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReceive = async () => {
    setConfirmState({ isOpen: false });
    setSaving(true);
    try {
      const updated = await mobileWarehouseService.confirmHandover(id, {
        receiver_name: form.receiver_name || user?.full_name || user?.username || '',
        images: form.images,
      });
      setForm((p) => ({
        ...p,
        status: updated.status,
        receiver_name: updated.receiver_name,
        confirmed_by: updated.confirmed_by,
        confirmed_at: updated.confirmed_at,
      }));
      setMsgModal({
        isOpen: true,
        type: 'success',
        title: 'Đã xác nhận bàn giao',
        message: `Phiếu ${updated.voucher_no} đã được ký nhận & cập nhật trạng thái lên Web Xuất kho.`,
      });
    } catch (err) {
      console.error('[WarehouseHandoverFormView] Lỗi xác nhận:', err);
      setMsgModal({
        isOpen: true,
        type: 'error',
        title: 'Lỗi xác nhận',
        message: err?.response?.data?.detail || err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const badge = getStatusBadge(HANDOVER_STATUSES, form.status);

  return (
    <Layout>
      <div className="mwh-page">
        <PageHeader
          title={isNew ? 'Tạo phiếu bàn giao' : `Phiếu ${form.voucher_no || '...'}`}
          subTitle={isNew ? 'Kho → Xưởng / Bộ phận' : badge.label}
          showBack={true}
          onBackClick={() => navigate('/warehouse/handover')}
        />

        {loading ? (
          <div className="mwh-empty">Đang tải thông tin phiếu bàn giao...</div>
        ) : (
          <div className="mwh-scroll-area">
            {!isNew && (
              <div className="mwh-card" style={{ background: '#faf6f0' }}>
                <div className="mwh-card-header">
                  <div>
                    <div className="mwh-voucher-code">{form.voucher_no}</div>
                    <div style={{ fontSize: '12px', color: '#7b6456' }}>
                      Nguồn: <strong>{form.created_channel}</strong> • Ngày: {formatDateVN(form.issue_date)}
                    </div>
                  </div>
                  <span className="mwh-badge" style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                    {badge.label}
                  </span>
                </div>
                {form.confirmed_by && (
                  <div style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>
                    Ký nhận: {form.receiver_name || form.confirmed_by} ({form.confirmed_at})
                  </div>
                )}
              </div>
            )}

            <div className="mwh-card">
              <div className="mwh-section-title">
                <span>1. Thông tin bàn giao {!isNew ? '& Giao nhận' : 'từ Kho'}</span>
              </div>

              {readOnly ? (
                /* ── GIAO DIỆN LỊCH SỬ / CHI TIẾT ĐẦY ĐỦ THÔNG TIN BÀN GIAO: NGƯỜI GỬI, NGƯỜI NHẬN, THỜI GIAN ── */
                <div className="mwh-audit-grid">
                  <div className="mwh-audit-cell">
                    <span className="mwh-audit-title">
                      <Warehouse size={13} color="#7b5233" /> Bên giao (Kho xuất)
                    </span>
                    <span className="mwh-audit-text" title={form.warehouse_name}>
                      {form.warehouse_name || 'Kho xuất'}
                    </span>
                    <span className="mwh-audit-sub">
                      Thủ kho: {form.deliverer_name || form.created_by || 'Administrator'}
                    </span>
                  </div>

                  <div className="mwh-audit-cell">
                    <span className="mwh-audit-title">
                      <User size={13} color="#7b5233" /> Bên nhận (Xưởng / BP)
                    </span>
                    <span className="mwh-audit-text" style={{ color: '#047857' }} title={form.receiver_name || form.department_name}>
                      {form.receiver_name || form.confirmed_by || 'Chưa ghi tên'}
                    </span>
                    <span className="mwh-audit-sub">
                      {form.department_name || 'Bộ phận nhận'}{form.factory_name ? ` • ${form.factory_name}` : ''}
                    </span>
                  </div>

                  <div className="mwh-audit-cell">
                    <span className="mwh-audit-title">
                      <Calendar size={13} color="#7b5233" /> Ngày bàn giao
                    </span>
                    <span className="mwh-audit-text">
                      {formatDateVN(form.issue_date)}
                    </span>
                    {form.created_at && (
                      <span className="mwh-audit-sub">Tạo: {form.created_at}</span>
                    )}
                  </div>

                  <div className="mwh-audit-cell">
                    <span className="mwh-audit-title">
                      <Clock size={13} color="#7b5233" /> Thời gian xác nhận
                    </span>
                    <span className="mwh-audit-text" style={{ color: form.confirmed_at ? '#059669' : '#d97706' }}>
                      {form.confirmed_at ? form.confirmed_at : (form.status === 'COMPLETED' ? 'Đã nhận đủ' : 'Chờ ký nhận')}
                    </span>
                    {form.confirmed_by && (
                      <span className="mwh-audit-sub">Ký bởi: {form.confirmed_by}</span>
                    )}
                  </div>

                  {(selectedPoCodes.length > 0 || form.ctgs) && (
                    <div className="mwh-audit-cell mwh-audit-cell--full">
                      <span className="mwh-audit-title">
                        <Building2 size={13} color="#7b5233" /> Lệnh sản xuất / Đơn hàng PO ({selectedPoCodes.length || 1} PO)
                      </span>
                      <div className="mwh-po-chips-wrap" style={{ marginTop: 4 }}>
                        {(selectedPoCodes.length > 0 ? selectedPoCodes : parsePoList(form.ctgs)).map((po) => (
                          <span key={po} className="mwh-po-chip mwh-po-chip--readonly">
                            {po}
                          </span>
                        ))}
                      </div>
                      <span className="mwh-audit-sub" style={{ marginTop: 3 }}>
                        {form.customer_name ? `${form.customer_name} • ` : ''}{form.items.length} loại vật tư
                      </span>
                    </div>
                  )}

                  {form.content && (
                    <div className="mwh-audit-cell mwh-audit-cell--full">
                      <span className="mwh-audit-title">
                        <FileText size={13} color="#7b5233" /> Nội dung bàn giao
                      </span>
                      <span className="mwh-audit-sub" style={{ fontSize: '12.5px', color: '#4b382a', fontStyle: 'italic' }}>
                        {form.content}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* ── GIAO DIỆN FORM KHI TẠO MỚI HOẶC SỬA ── */
                <>
                  <div className="mwh-field-row">
                    <div className="mwh-field-group">
                      <label className="mwh-label">Kho xuất bàn giao <span className="mwh-req">*</span></label>
                      <select
                        className="mwh-select"
                        disabled={!isNew && form.status === 'COMPLETED'}
                        value={form.warehouse_name}
                        onChange={(e) => {
                          const newWh = e.target.value;
                          if (selectedPoCodes.length > 0) {
                            handleApplyPoSelection(selectedPoCodes, newWh);
                          } else {
                            setForm((p) => ({ ...p, warehouse_name: newWh, items: isNew ? [] : p.items }));
                          }
                        }}
                      >
                        <option value="">-- Chọn kho xuất --</option>
                        {(meta.warehouses || []).map((w) => (
                          <option key={w.code} value={w.name}>{w.name} ({w.code})</option>
                        ))}
                      </select>
                    </div>

                    <div className="mwh-field-group">
                      <label className="mwh-label">Nhà máy <span className="mwh-req">*</span></label>
                      <select
                        className="mwh-select"
                        value={form.factory_id ? String(form.factory_id) : ''}
                        onChange={(e) => {
                          const selId = e.target.value ? Number(e.target.value) : null;
                          const found = (meta.factories || []).find((f) => Number(f.id) === selId);
                          setForm((p) => ({
                            ...p,
                            factory_id: selId,
                            factory_name: found ? found.name : '',
                          }));
                        }}
                      >
                        <option value="">-- Chọn nhà máy --</option>
                        {(meta.factories || [])
                          .filter((f) => String(f.code || '').trim().toUpperCase() !== 'KHO' && String(f.name || '').trim().toUpperCase() !== 'KHO')
                          .map((f) => (
                            <option key={f.id} value={String(f.id)}>
                              {f.name}{f.code ? ` (${f.code})` : ''}
                            </option>
                          ))}
                        {!isNew && form.factory_name && !(meta.factories || []).some((f) => Number(f.id) === Number(form.factory_id)) && (
                          <option value={form.factory_id ? String(form.factory_id) : ''}>{form.factory_name}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="mwh-field-row">
                    <div className="mwh-field-group">
                      <label className="mwh-label">Người nhận bàn giao</label>
                      <input
                        type="text"
                        className="mwh-input"
                        placeholder="Nhập tên người nhận..."
                        value={form.receiver_name}
                        onChange={(e) => setForm((p) => ({ ...p, receiver_name: e.target.value }))}
                      />
                    </div>

                    <div className="mwh-field-group">
                      <label className="mwh-label">Bộ phận nhận <span className="mwh-req">*</span></label>
                      <input
                        type="text"
                        className="mwh-input"
                        placeholder="Nhập bộ phận / xưởng nhận..."
                        value={form.department_name}
                        onChange={(e) => setForm((p) => ({ ...p, department_name: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="mwh-field-group">
                    <label className="mwh-label">
                      Lệnh sản xuất / Đơn hàng PO <span className="mwh-req">*</span>
                      {selectedPoCodes.length > 0 && (
                        <span style={{ marginLeft: 6, color: '#7b5233', fontWeight: 700, fontSize: '11.5px' }}>
                          ({selectedPoCodes.length} PO)
                        </span>
                      )}
                    </label>
                    <WarehouseMultiPoSelect
                      selectedPos={selectedPoCodes}
                      initialOptions={poOptions}
                      loadingMaterials={loadingPoMaterials}
                      onApply={(poList, metaMap) => handleApplyPoSelection(poList, undefined, metaMap)}
                      onRemoveSingle={handleRemoveSinglePo}
                    />
                  </div>

                  <div className="mwh-field-group" style={{ marginBottom: 0 }}>
                    <label className="mwh-label">Nội dung bàn giao</label>
                    <textarea
                      rows={2}
                      className="mwh-textarea"
                      placeholder="Ghi chú hạng mục bàn giao, yêu cầu sử dụng..."
                      value={form.content}
                      onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mwh-card">
              <div className="mwh-section-title">
                <span>2. Vật tư bàn giao ({form.items.length} dòng • Tổng: {formatNumberVN(totalQty)})</span>
              </div>

              {(form.items.length > 0 || (poMasterMaterials && poMasterMaterials.length > 0)) && (
                <div className="mwh-toolbar-clean">
                  {/* Hàng 1: Tìm kiếm + Lọc Nhóm (Cùng trên 1 hàng ngang tiện dụng) */}
                  <div className="mwh-filter-row-top">
                    <div className="mwh-search-input-box">
                      <Search size={14} className="mwh-search-icon" />
                      <input
                        type="text"
                        className="mwh-search-field"
                        placeholder="Tìm mã VT, tên VT..."
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                      />
                      {tableSearch && (
                        <button
                          type="button"
                          onClick={() => setTableSearch('')}
                          className="mwh-search-clear"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Nút bấm Chọn nhóm bàn giao thông minh mở Bottom Sheet */}
                    <div className="mwh-group-select-wrap">
                      <button
                        type="button"
                        className={`mwh-group-btn ${selectedGroups.length === 0 && masterGroups.length > 0 ? 'prompt' : isCustomGroup ? 'active' : ''}`}
                        onClick={() => setIsGroupSheetOpen(true)}
                        title="Bấm để chọn nhóm vật tư bàn giao"
                      >
                        <Folder size={13} className="mwh-group-btn-icon" />
                        <span className="mwh-group-btn-text">{groupButtonLabel}</span>
                        <ChevronDown size={12} className="mwh-group-btn-arrow" />
                      </button>
                    </div>
                  </div>

                  {/* TẠM THỜI ẨN THEO YÊU CẦU: Hàng 2 (Segmented Control lọc tồn) & Hàng 3 (Thanh tác vụ vượt tồn) */}
                  {false && (
                    <div className="mwh-stock-segments">
                      <button
                        type="button"
                        className={`mwh-segment-btn ${stockFilter === 'ALL' ? 'active' : ''}`}
                        onClick={() => setStockFilter('ALL')}
                      >
                        Tất cả ({form.items.length})
                      </button>
                      <button
                        type="button"
                        className={`mwh-segment-btn ${stockFilter === 'IN_STOCK' ? 'active' : ''} ${stockStats.inStock > 0 ? 'mwh-segment-btn--green' : ''}`}
                        onClick={() => setStockFilter('IN_STOCK')}
                      >
                        <span className="mwh-segment-dot mwh-segment-dot--green" />
                        Còn ({stockStats.inStock})
                      </button>
                      <button
                        type="button"
                        className={`mwh-segment-btn ${stockFilter === 'OUT_OF_STOCK' ? 'active' : ''} ${stockStats.outOfStock > 0 ? 'mwh-segment-btn--red' : ''}`}
                        onClick={() => setStockFilter('OUT_OF_STOCK')}
                      >
                        <span className="mwh-segment-dot mwh-segment-dot--red" />
                        Hết ({stockStats.outOfStock})
                      </button>
                      {stockStats.overStock > 0 && (
                        <button
                          type="button"
                          className={`mwh-segment-btn ${stockFilter === 'OVER_STOCK' ? 'active' : ''} mwh-segment-btn--warn`}
                          onClick={() => setStockFilter('OVER_STOCK')}
                        >
                          <span className="mwh-segment-dot mwh-segment-dot--amber" />
                          Vượt ({stockStats.overStock})
                        </button>
                      )}
                    </div>
                  )}

                  {false && !readOnly && (stockStats.outOfStock > 0 || stockStats.overStock > 0 || form.ctgs) && (
                    <div className="mwh-batch-bar">
                      <div className="mwh-batch-bar-title">
                        {stockStats.overStock > 0 ? (
                          <>
                            <AlertTriangle size={13} color="#e11d48" />
                            <span><strong>{stockStats.overStock}</strong> dòng vượt tồn kho:</span>
                          </>
                        ) : (
                          <span>Thao tác nhanh cho bảng:</span>
                        )}
                      </div>

                      <div className="mwh-batch-actions">
                        {stockStats.outOfStock > 0 && (
                          <button
                            type="button"
                            onClick={handleRemoveOutOfStock}
                            className="mwh-batch-btn mwh-batch-btn--danger"
                            title="Xóa ngay các vật tư không có tồn kho"
                          >
                            <Trash2 size={11} /> Bỏ hết tồn ({stockStats.outOfStock})
                          </button>
                        )}
                        {stockStats.overStock > 0 && (
                          <button
                            type="button"
                            onClick={handleClampQtyToStock}
                            className="mwh-batch-btn mwh-batch-btn--primary"
                            title="Gán số lượng xuất bằng đúng tồn kho đang có"
                          >
                            <Check size={12} /> Gán SL = Tồn
                          </button>
                        )}
                        {form.ctgs && (
                          <button
                            type="button"
                            onClick={handleResetQtyToQuota}
                            className="mwh-batch-btn mwh-batch-btn--neutral"
                            title="Lấy lại số lượng chuẩn theo định mức PO"
                          >
                            <RotateCcw size={11} /> Đặt lại Đ.Mức
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {form.items.length === 0 ? (
                <div className="mwh-empty" style={{ padding: '24px 12px', textAlign: 'center' }}>
                  <FolderCheck size={36} color="#b09b84" style={{ marginBottom: 8, display: 'inline-block' }} />
                  {form.ctgs ? (
                    <div>
                      <div style={{ fontWeight: 700, color: '#5C2D0E', fontSize: 14, marginBottom: 4 }}>
                        Đã nạp PO {form.ctgs}
                      </div>
                      <div style={{ color: '#78716C', fontSize: 12.5, marginBottom: 12 }}>
                        Mặc định chưa chọn nhóm nào. Vui lòng bấm bên dưới để chọn các nhóm vật tư cần bàn giao ({masterGroups.length} nhóm có sẵn).
                      </div>
                      <button
                        type="button"
                        className="mwh-btn-primary"
                        style={{
                          margin: '0 auto',
                          padding: '8px 16px',
                          fontSize: '13px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        onClick={() => setIsGroupSheetOpen(true)}
                      >
                        <FolderCheck size={15} />
                        <span>Chọn nhóm vật tư bàn giao ({masterGroups.length} nhóm)</span>
                      </button>
                    </div>
                  ) : (
                    <span>Chưa có vật tư nào. Vui lòng chọn Lệnh sản xuất / Đơn hàng PO ở Mục 1 để tải dữ liệu.</span>
                  )}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="mwh-empty" style={{ padding: '16px 10px' }}>
                  <Search size={24} color="#b09b84" />
                  <span>Không tìm thấy vật tư nào khớp với bộ lọc hiện tại.</span>
                  <button
                    type="button"
                    className="mwh-btn-secondary"
                    style={{ marginTop: '8px', padding: '4px 10px', fontSize: '11.5px' }}
                    onClick={() => {
                      setTableSearch('');
                      setSelectedGroups(masterGroups.map((g) => g.name));
                      setStockFilter('ALL');
                    }}
                  >
                    Xóa tất cả bộ lọc
                  </button>
                </div>
              ) : (
                /* ── GIAO DIỆN THẲNG HÀNG THẲNG CỘT & CAO CẤP (PREMIUM MOBILE GRID) ── */
                <div className="mwh-grid-card">
                  {/* Container cuộn bao trùm CẢ Header và Body để đồng bộ chiều rộng 100%, không bị lệch do thanh cuộn */}
                  <div className="mwh-grid-scroll-wrap">
                    {/* Header 3 cột: Vật tư | Đ.Mức | Bàn giao (trên) / Tồn kho (dưới) */}
                    <div className="mwh-grid-header">
                      <div className="mwh-grid-col-mat">
                        VẬT TƯ
                      </div>
                      <div className="mwh-grid-col-quota">
                        ĐỊNH MỨC
                      </div>
                      <div className="mwh-grid-col-qty-header">
                        <div>BÀN GIAO</div>
                        <div className="mwh-grid-header-sub">Tồn kho khả dụng</div>
                      </div>
                    </div>

                    {/* Body danh sách từng dòng vật tư */}
                    <div className="mwh-grid-body">
                      {filteredItems.map(({ item: it, originalIndex: idx }) => {
                        const overStock = isEditing && Number(it.quantity1 || 0) > Number(it.available_stock || 0) + 0.0001;
                        const stock = Number(it.available_stock || 0);

                        return (
                          <div key={`${it.item_code}_${idx}`} className="mwh-grid-row">
                            {/* Cột 1: Thông tin vật tư */}
                            <div className="mwh-grid-col-mat">
                              <div className="mwh-grid-code-title" title={it.item_code}>
                                <span className="mwh-stt-pill">{idx + 1}</span>
                                <span className="mwh-grid-mat-code">{it.item_code}</span>
                              </div>
                              <div className="mwh-grid-name" title={it.item_name}>
                                {it.item_name}
                              </div>
                            </div>

                            {/* Cột 2: Định mức PO */}
                            <div className="mwh-grid-col-quota">
                              {it.required_qty !== undefined && it.required_qty !== null ? (
                                <>
                                  <span className="mwh-grid-quota-val">
                                    {formatNumberVN(it.required_qty)}
                                  </span>
                                  <span className="mwh-grid-unit-sub">{it.unit1}</span>
                                </>
                              ) : (
                                <span style={{ color: '#cbd5e1', fontSize: '11px' }}>—</span>
                              )}
                            </div>

                            {/* Cột 3: Gộp Bàn giao ở trên + Tồn kho ở dưới */}
                            <div className="mwh-grid-col-qty">
                              {/* Hàng trên: Input Group (Input + Unit) + Trash Button */}
                              <div className="mwh-grid-qty-top">
                                <div className={`mwh-input-wrapper ${overStock ? 'mwh-input-wrapper--warn' : ''}`}>
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    className="mwh-compact-input"
                                    readOnly={readOnly}
                                    value={it.quantity1}
                                    onChange={(e) => updateLine(idx, 'quantity1', e.target.value)}
                                  />
                                  <span className="mwh-input-unit">{it.unit1}</span>
                                </div>
                                {!readOnly && (
                                  <button
                                    type="button"
                                    onClick={() => removeLine(idx)}
                                    className="mwh-btn-trash-clean"
                                    title="Xóa dòng"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>

                              {/* Hàng dưới: Tồn kho khả dụng (Căn thẳng dưới Input Wrapper) */}
                              <div className="mwh-grid-stock-bottom">
                                {stock > 0 ? (
                                  <button
                                    type="button"
                                    className="mwh-stock-chip mwh-stock-chip--green"
                                    title={!readOnly ? "Chạm để gán SL xuất = Tồn kho" : ""}
                                    onClick={() => {
                                      if (!readOnly) updateLine(idx, 'quantity1', stock);
                                    }}
                                  >
                                    <span className="mwh-stock-dot mwh-stock-dot--green" />
                                    <span>Tồn: <strong>{formatNumberVN(stock)}</strong></span>
                                  </button>
                                ) : (
                                  <div className="mwh-stock-chip mwh-stock-chip--zero">
                                    <span className="mwh-stock-dot mwh-stock-dot--red" />
                                    <span>Tồn: <strong>0</strong></span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer tổng kết */}
                  <div className="mwh-grid-footer">
                    <div>
                      Đang hiển thị: <strong>{filteredItems.length}</strong> / {form.items.length} dòng
                      {tableSearch && ` (khớp "${tableSearch}")`}
                    </div>
                    <div>
                      Tổng SL: <strong style={{ color: '#15803d', fontSize: '12px' }}>{formatNumberVN(filteredTotalQty)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mwh-card">
              <WarehousePhotoGrid
                images={form.images}
                onChange={(imgs) => setForm((p) => ({ ...p, images: imgs }))}
                readOnly={readOnly && form.status === 'COMPLETED'}
                label="Ảnh bàn giao hàng hóa tại xưởng"
                onError={(msg) => setMsgModal({ isOpen: true, type: 'error', title: 'Lỗi ảnh', message: msg })}
              />
            </div>
          </div>
        )}

        {!loading && (
          <div className="mwh-bottom-bar">
            {isNew || isEditing ? (
              <>
                <button
                  type="button"
                  className="mwh-btn-secondary"
                  style={{ flex: 1 }}
                  disabled={saving}
                  onClick={() => (isNew ? navigate('/warehouse/handover') : setIsEditing(false))}
                >
                  <X size={15} /> Hủy
                </button>
                <button
                  type="button"
                  className="mwh-btn-primary"
                  style={{ flex: 1 }}
                  disabled={saving || hasOverStock}
                  onClick={() => submitSave(isNew ? 'PENDING' : (form.status || 'PENDING'))}
                >
                  <CheckCircle2 size={15} /> {saving ? 'Đang lưu...' : 'Xác nhận'}
                </button>
              </>
            ) : (
              <>
                {form.status !== 'COMPLETED' && form.status !== 'CANCELLED' && canEdit && (
                  <button type="button" className="mwh-btn-secondary" onClick={() => setIsEditing(true)} disabled={saving}>
                    <Edit3 size={15} /> Sửa
                  </button>
                )}
                {(form.status === 'PENDING' || form.status === 'PROCESSING') && (
                  <button
                    type="button"
                    className="mwh-btn-success"
                    style={{ flex: 1 }}
                    disabled={saving}
                    onClick={() => setConfirmState({ isOpen: true })}
                  >
                    <CheckCircle2 size={16} /> Xác nhận nhận bàn giao
                  </button>
                )}
                {form.status === 'COMPLETED' && (
                  <button type="button" className="mwh-btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/warehouse/handover')}>
                    Quay lại danh sách
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <WarehousePickerSheet
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handleSelectMaterial}
          materials={materials}
          units={meta.units || []}
          warehouseName={form.warehouse_name}
          onlyInStock={true}
          allowCustomNew={false}
          title="Chọn vật tư tồn kho để bàn giao"
        />

        <WarehouseGroupPickerSheet
          isOpen={isGroupSheetOpen}
          onClose={() => setIsGroupSheetOpen(false)}
          poCode={selectedPoCodes.length > 0 ? selectedPoCodes.join(', ') : (form.ctgs || selectedPoData?.po_code || '')}
          groups={masterGroups}
          selectedGroups={selectedGroups}
          materials={(poMasterMaterials && poMasterMaterials.length > 0) ? poMasterMaterials : form.items}
          selectedItemCodes={(form.items || []).map((it) => it.item_code)}
          onApply={handleApplyGroups}
        />

        <ConfirmModal
          isOpen={confirmState.isOpen}
          title="Xác nhận nhận bàn giao"
          message={`Xác nhận bộ phận '${form.department_name || 'nhận hàng'}' (${form.receiver_name || user?.full_name || 'người nhận'}) đã nhận đủ hàng theo phiếu ${form.voucher_no}?`}
          onCancel={() => setConfirmState({ isOpen: false })}
          onConfirm={handleConfirmReceive}
          confirmText="Xác nhận nhận"
        />

        <MessageModal
          isOpen={msgModal.isOpen}
          type={msgModal.type}
          title={msgModal.title}
          message={msgModal.message}
          onConfirm={() => {
            const cb = msgModal.onDone;
            setMsgModal({ isOpen: false, type: 'info', title: '', message: '', onDone: null });
            if (cb) cb();
          }}
        />

        <Toast
          isVisible={toast.isVisible}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
          duration={3000}
        />
      </div>
    </Layout>
  );
};

export default WarehouseHandoverFormView;

