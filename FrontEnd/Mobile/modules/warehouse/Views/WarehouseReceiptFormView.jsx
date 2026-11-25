import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Edit3,
  PackagePlus,
  Search,
  X,
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
import useAuthStore from '@modules/auth/Models/authModel';
import FormMultiSearchSelect from '@mobile/Shared/Views/components/form/FormMultiSearchSelect';
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect';
import mobileWarehouseService from '../services/mobileWarehouseService';
import WarehousePhotoGrid from './components/WarehousePhotoGrid';
import WarehousePickerSheet from './components/WarehousePickerSheet';
import {
  RECEIPT_STATUSES,
  getStatusBadge,
  todayISO,
  formatDateVN,
  formatNumberVN,
  hasWarehouseAction,
} from '../constants/warehouseConstants';
import '../styles/mobileWarehouse.css';

const WarehouseReceiptFormView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, permissions, logout } = useAuthStore();
  const isNew = !id || id === 'new';

  const [meta, setMeta] = useState({ warehouses: [], units: [], customers: [], receipt_types: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(isNew);

  const [form, setForm] = useState({
    voucher_no: '',
    warehouse_name: 'Kho vật tư',
    receipt_date: todayISO(),
    receipt_type: 'Nhập mua hàng',
    deliverer_name: '',
    department_name: '',
    customer_code: '',
    customer_name: '',
    ctgs: '',
    content: '',
    status: 'PENDING',
    created_channel: 'Mobile',
    created_by: user?.full_name || user?.username || '',
    confirmed_by: '',
    confirmed_at: '',
    images: [],
    items: [],
  });

  const [confirmState, setConfirmState] = useState({ isOpen: false, action: null });
  const [msgModal, setMsgModal] = useState({ isOpen: false, type: 'info', title: '', message: '', onDone: null });
  const [tableSearch, setTableSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [poOptions, setPoOptions] = useState([]);
  const [loadingPo, setLoadingPo] = useState(false);
  const [poInfo, setPoInfo] = useState(null);
  const [showAllPoItems, setShowAllPoItems] = useState(false);
  const poSearchTimerRef = useRef(null);

  const canApprove = hasWarehouseAction(
    permissions,
    user,
    ['/warehouse/goods-receipt', 'mobile_warehouse-receipt', 'mobile_warehouse', '/admin/warehouse/goods-receipt', 'goods-receipt', 'warehouse'],
    'approve'
  );
  const canEdit = hasWarehouseAction(
    permissions,
    user,
    ['/warehouse/goods-receipt', 'mobile_warehouse-receipt', 'mobile_warehouse', '/admin/warehouse/goods-receipt', 'goods-receipt', 'warehouse'],
    'edit'
  );

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      try {
        const [metaRes, existing, initialPos] = await Promise.all([
          mobileWarehouseService.getMobileMeta(),
          isNew ? Promise.resolve(null) : mobileWarehouseService.getReceiptById(id),
          mobileWarehouseService.getPurchasePoCodes({ limit: 60 }),
        ]);
        if (!mounted) return;
        setMeta(metaRes);
        setPoOptions(initialPos || []);

        if (existing) {
          setForm({
            voucher_no: existing.voucher_no || '',
            warehouse_name: existing.warehouse_name || '',
            receipt_date: existing.receipt_date || todayISO(),
            receipt_type: existing.receipt_type || 'Nhập mua hàng',
            deliverer_name: existing.deliverer_name || '',
            department_name: existing.department_name || '',
            customer_code: existing.customer_code || '',
            customer_name: existing.customer_name || '',
            ctgs: existing.ctgs || '',
            content: existing.content || '',
            status: existing.status || 'PENDING',
            created_channel: existing.created_channel || 'Web',
            created_by: existing.created_by || '',
            confirmed_by: existing.confirmed_by || '',
            confirmed_at: existing.confirmed_at || '',
            images: Array.isArray(existing.images) ? existing.images : [],
            items: Array.isArray(existing.items) ? existing.items : [],
          });
          setIsEditing(false);
        } else {
          const defaultKvt = (metaRes?.warehouses || []).find(
            (w) => w.code === 'KVT' || String(w.name || '').toLowerCase().includes('vật tư')
          )?.name || 'Kho vật tư';

          setForm((prev) => ({
            ...prev,
            warehouse_name: prev.warehouse_name || defaultKvt,
            receipt_type: metaRes?.receipt_types?.[0] || 'Nhập mua hàng',
          }));
        }
      } catch (err) {
        console.error('[WarehouseReceiptFormView] Lỗi nạp chi tiết:', err);
        if (mounted) {
          setMsgModal({
            isOpen: true,
            type: 'error',
            title: 'Lỗi tải phiếu',
            message: err?.response?.data?.detail || err.message || 'Không thể tải dữ liệu phiếu nhập kho.',
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
  const receiverDisplay = isNew
    ? loggedInAccountName
    : (form.confirmed_by || form.created_by || loggedInAccountName);
  const totalQty = useMemo(
    () => (form.items || []).reduce((acc, it) => acc + (Number(it.quantity1) || 0), 0),
    [form.items]
  );

  const filteredItems = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    return (form.items || []).map((item, originalIndex) => ({ item, originalIndex })).filter(({ item }) => {
      if (!q) return true;
      return (
        String(item.item_code || '').toLowerCase().includes(q) ||
        String(item.item_name || '').toLowerCase().includes(q) ||
        String(item.lsx || '').toLowerCase().includes(q) ||
        String(item.notes || '').toLowerCase().includes(q)
      );
    });
  }, [form.items, tableSearch]);

  const filteredTotalQty = useMemo(() => {
    return filteredItems.reduce((acc, { item }) => acc + (Number(item.quantity1) || 0), 0);
  }, [filteredItems]);

  const customerOptions = useMemo(() => {
    const opts = (meta.customers || []).map((c) => ({
      value: c.name,
      label: c.name,
      rawSpec: c.code || '',
    }));
    if (form.customer_name && !opts.some((o) => o.value === form.customer_name)) {
      opts.unshift({ value: form.customer_name, label: form.customer_name, rawSpec: form.customer_code || '' });
    }
    return opts;
  }, [meta.customers, form.customer_name, form.customer_code]);

  const unitOptions = useMemo(
    () =>
      (meta.units || []).map((u) => ({
        value: u.code,
        label: u.full_name ? `${u.code} (${u.full_name})` : u.code,
        rawSpec: u.full_name || '',
      })),
    [meta.units]
  );

  const handlePickMaterial = (picked) => {
    if (!picked) return;
    setForm((prev) => {
      const pCode = (picked.item_code || '').trim();
      const existingIdx = pCode
        ? prev.items.findIndex((it) => (it.item_code || '').trim() === pCode)
        : -1;

      if (existingIdx >= 0) {
        const next = [...prev.items];
        const cur = next[existingIdx];
        const nextQty = Number(cur.quantity1 || 0) + 1;
        const rate = Number(cur.conversion_rate || 1);
        next[existingIdx] = {
          ...cur,
          quantity1: nextQty,
          quantity2: Math.round(nextQty * rate * 100) / 100,
        };
        return { ...prev, items: next };
      }

      const q1 = Number(picked.quantity1 || 1);
      const convRate = Number(picked.conversion_rate || 1);
      return {
        ...prev,
        items: [
          ...prev.items,
          {
            item_code: pCode,
            item_name: picked.item_name || '',
            unit1: picked.unit1 || picked.unit_main || picked.unit || 'Cái',
            quantity1: q1,
            unit2: picked.unit_conversion || '',
            conversion_rate: convRate,
            quantity2: Math.round(q1 * convRate * 100) / 100,
            lsx: picked.po_code || '',
            package_split: '',
            notes: picked.notes || '',
            unit_price: picked.unit_price || null,
          },
        ],
      };
    });
    setPickerOpen(false);
  };

  const handleAddManualItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item_code: '',
          item_name: '',
          unit1: 'Cái',
          quantity1: 1,
          unit2: '',
          conversion_rate: 1,
          quantity2: 1,
          lsx: '',
          package_split: '',
          notes: '',
        },
      ],
    }));
  };

  const handlePoSearch = (query) => {
    if (poSearchTimerRef.current) clearTimeout(poSearchTimerRef.current);
    poSearchTimerRef.current = setTimeout(async () => {
      try {
        const results = await mobileWarehouseService.getPurchasePoCodes({ search: query, limit: 80 });
        setPoOptions(results);
      } catch (err) {
        console.warn('[WarehouseReceiptFormView] Lỗi tìm kiếm Mã PO:', err);
      }
    }, 250);
  };

  const mapPoItemLine = (m, poCodeStr) => {
    const ordQty = Number(m.order_qty || 0);
    const recQty = Number(m.received_qty || 0);
    const remQty = Number(m.remaining_qty || 0);
    // Nếu mã đã nhận đủ 100% (remQty <= 0 và recQty > 0): Thực nhập mặc định = 0 để tránh nhập trùng
    // Nếu mã còn thiếu (remQty > 0): Thực nhập mặc định = remQty (số lượng còn lại cần giao)
    // Nếu chưa nhận lần nào: Thực nhập mặc định = ordQty
    const qtyDefault = remQty > 0 ? remQty : (recQty > 0 ? 0 : ordQty);
    return {
      item_code: m.item_code || '',
      item_name: m.item_name || m.item_code || '',
      unit1: m.unit1 || 'Cái',
      quantity1: qtyDefault,
      order_qty: ordQty,
      received_qty: recQty,
      remaining_qty: remQty,
      unit2: m.unit2 || '',
      conversion_rate: 1.0,
      quantity2: qtyDefault,
      unit_price: Number(m.unit_price || 0),
      po_code: poCodeStr,
      lsx: m.lsx || '',
      package_split: '',
      notes: m.notes || '',
    };
  };

  const handlePoSelect = async (poCode) => {
    const cleanPo = String(poCode || '').trim();
    if (!cleanPo) {
      setForm((p) => ({ ...p, ctgs: '' }));
      setPoInfo(null);
      setShowAllPoItems(true);
      return;
    }

    const matchOpt = (poOptions || []).find((o) => String(o.value || '').trim().toUpperCase() === cleanPo.toUpperCase());
    setForm((p) => ({
      ...p,
      ctgs: cleanPo,
      customer_name: matchOpt?.supplier_name || p.customer_name,
      customer_code: matchOpt?.supplier_code || p.customer_code,
      content: p.content ? p.content : `Nhập hàng theo PO ${cleanPo}`,
    }));

    setLoadingPo(true);
    try {
      const poData = await mobileWarehouseService.getPurchasePoItems(cleanPo);
      if (poData && poData.found) {
        const finalPo = poData.po_code || cleanPo;
        const allMapped = (poData.items || []).map((m) => mapPoItemLine(m, finalPo));
        const pendingOnly = allMapped.filter((it) => it.remaining_qty > 0.0001);

        setPoInfo({
          po_code: finalPo,
          allItems: allMapped,
          pendingCount: pendingOnly.length,
          completedCount: allMapped.length - pendingOnly.length,
          receiptCount: Number(poData.receipt_count || 0),
        });
        // Mặc định cho hiện tất cả các mã của PO
        setShowAllPoItems(true);

        setForm((p) => ({
          ...p,
          ctgs: finalPo,
          customer_name: poData.supplier_name || p.customer_name,
          customer_code: poData.supplier_code || p.customer_code,
          content: p.content ? p.content : `Nhập hàng theo PO ${finalPo}`,
          items: allMapped.length > 0 ? allMapped : p.items,
        }));
      } else {
        setPoInfo(null);
      }
    } catch (err) {
      console.error('[WarehouseReceiptFormView] Lỗi tải chi tiết PO đặt hàng:', err);
    } finally {
      setLoadingPo(false);
    }
  };

  const updateLine = (idx, field, val) => {
    setForm((prev) => {
      const next = [...prev.items];
      const cur = { ...next[idx], [field]: val };
      if (field === 'quantity1' || field === 'conversion_rate') {
        const q1 = Number(cur.quantity1 || 0);
        const rate = Number(cur.conversion_rate || 1);
        cur.quantity2 = Math.round(q1 * rate * 100) / 100;
      }
      next[idx] = cur;
      return { ...prev, items: next };
    });
  };

  const removeLine = (idx) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const validate = () => {
    if (!form.warehouse_name) return 'Vui lòng chọn Kho nhập.';
    if (!form.items || form.items.length === 0) return 'Vui lòng thêm ít nhất 1 sản phẩm.';
    for (let i = 0; i < form.items.length; i++) {
      const it = form.items[i];
      if (!String(it.item_name || '').trim()) return `Dòng ${i + 1}: Vui lòng nhập Tên sản phẩm.`;
      if (!it.quantity1 || Number(it.quantity1) <= 0) return `Dòng ${i + 1}: Số lượng phải lớn hơn 0.`;
    }
    return '';
  };

  const submitSave = async (targetStatus) => {
    const errText = validate();
    if (errText) {
      setMsgModal({ isOpen: true, type: 'warning', title: 'Thiếu thông tin', message: errText });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        voucher_no: form.voucher_no.trim() || undefined,
        warehouse_name: form.warehouse_name,
        receipt_date: form.receipt_date || todayISO(),
        deliverer_name: String(form.deliverer_name || '').trim(),
        created_by: loggedInAccountName || undefined,
        customer_code: form.customer_code,
        customer_name: form.customer_name,
        ctgs: form.ctgs || undefined,
        receipt_type: form.receipt_type || 'Nhập mua hàng',
        status: targetStatus || form.status,
        content: form.content,
        images: form.images,
        items: form.items.map((it, idx) => ({
          line_no: idx + 1,
          item_code: (it.item_code || '').trim(),
          item_name: String(it.item_name || '').trim(),
          unit1: String(it.unit1 || '').trim() || 'Cái',
          quantity1: Number(it.quantity1),
          unit2: it.unit2 || '',
          quantity2: Number(it.quantity2 || 0),
          conversion_rate: Number(it.conversion_rate || 1),
          unit_price: Number(it.unit_price || 0),
          po_code: it.po_code || form.ctgs || '',
          lsx: it.lsx || '',
          package_split: it.package_split || '',
          notes: String(it.notes || '').trim(),
        })),
      };

      const saved = isNew
        ? await mobileWarehouseService.createReceipt(payload)
        : await mobileWarehouseService.updateReceipt(id, payload);

      setMsgModal({
        isOpen: true,
        type: 'success',
        title: 'Thành công',
        message: `Đã lưu phiếu nhập kho ${saved.voucher_no} và đồng bộ dữ liệu lên hệ thống Web.`,
        onDone: () => navigate('/warehouse/goods-receipt'),
      });
    } catch (err) {
      console.error('[WarehouseReceiptFormView] Lỗi lưu phiếu:', err);
      const isAuthErr = err?.response?.status === 401;
      setMsgModal({
        isOpen: true,
        type: 'error',
        title: 'Không thể lưu phiếu',
        message: err?.response?.data?.detail || err.message || 'Lỗi khi lưu phiếu nhập kho.',
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

  const handleConfirmComplete = async () => {
    setConfirmState({ isOpen: false, action: null });
    setSaving(true);
    try {
      const updated = await mobileWarehouseService.confirmReceipt(id, { images: form.images });
      setForm((p) => ({
        ...p,
        status: updated.status,
        confirmed_by: updated.confirmed_by,
        confirmed_at: updated.confirmed_at,
      }));
      setMsgModal({
        isOpen: true,
        type: 'success',
        title: 'Đã xác nhận nhập kho',
        message: `Phiếu ${updated.voucher_no} đã hoàn tất nhập kho & cập nhật tồn kho trên Web.`,
      });
    } catch (err) {
      console.error('[WarehouseReceiptFormView] Lỗi xác nhận:', err);
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

  const badge = getStatusBadge(RECEIPT_STATUSES, form.status);

  return (
    <Layout>
      <div className="mwh-page">
        <PageHeader
          title={isNew ? 'Tạo phiếu nhập kho' : `Phiếu ${form.voucher_no || '...'}`}
          subTitle={isNew ? 'Kho Mobile → Web' : badge.label}
          showBack={true}
          onBackClick={() => navigate('/warehouse/goods-receipt')}
        />

        {loading ? (
          <div className="mwh-empty">Đang tải thông tin phiếu...</div>
        ) : (
          <div className="mwh-scroll-area">
            {!isNew && (
              <div className="mwh-card" style={{ background: '#faf6f0' }}>
                <div className="mwh-card-header">
                  <div>
                    <div className="mwh-voucher-code">{form.voucher_no}</div>
                    <div style={{ fontSize: '12px', color: '#7b6456' }}>
                      Nguồn: <strong>{form.created_channel}</strong> • Ngày: {formatDateVN(form.receipt_date)}
                    </div>
                  </div>
                  <span className="mwh-badge" style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                    {badge.label}
                  </span>
                </div>
                {form.confirmed_by && (
                  <div style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>
                    Xác nhận bởi: {form.confirmed_by} ({form.confirmed_at})
                  </div>
                )}
              </div>
            )}

            <div className="mwh-card">
              <div className="mwh-section-title">
                <span>1. Thông tin chứng từ {!isNew ? '& Giao nhận' : 'nhập'}</span>
              </div>

              {readOnly ? (
                /* ── GIAO DIỆN LỊCH SỬ / CHI TIẾT ĐẦY ĐỦ: NGƯỜI GỬI, NGƯỜI NHẬN, THỜI GIAN ── */
                <div className="mwh-audit-grid">
                  <div className="mwh-audit-cell">
                    <span className="mwh-audit-title">
                      <User size={13} color="#7b5233" /> Người gửi (Giao hàng)
                    </span>
                    <span className="mwh-audit-text" title={form.deliverer_name || form.customer_name}>
                      {form.deliverer_name || form.customer_name || 'Chưa ghi nhận'}
                    </span>
                    {form.customer_name && form.deliverer_name && (
                      <span className="mwh-audit-sub">Đối tác: {form.customer_name}</span>
                    )}
                  </div>

                  <div className="mwh-audit-cell">
                    <span className="mwh-audit-title">
                      <Warehouse size={13} color="#7b5233" /> Người nhận (Thủ kho)
                    </span>
                    <span className="mwh-audit-text" style={{ color: '#047857' }} title={form.confirmed_by || form.created_by}>
                      {form.confirmed_by || form.created_by || receiverDisplay || 'Thủ kho nhận'}
                    </span>
                    <span className="mwh-audit-sub">Kho: {form.warehouse_name || 'Kho vật tư'}</span>
                  </div>

                  <div className="mwh-audit-cell">
                    <span className="mwh-audit-title">
                      <Calendar size={13} color="#7b5233" /> Ngày chứng từ / Nhập
                    </span>
                    <span className="mwh-audit-text">
                      {formatDateVN(form.receipt_date)}
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
                      {form.confirmed_at ? form.confirmed_at : (form.status === 'COMPLETED' ? 'Đã nhập kho' : 'Chờ xác nhận')}
                    </span>
                    {form.created_by && (
                      <span className="mwh-audit-sub">Lập bởi: {form.created_by}</span>
                    )}
                  </div>

                  <div className="mwh-audit-cell mwh-audit-cell--full">
                    <span className="mwh-audit-title">
                      <Building2 size={13} color="#7b5233" /> Đối tác / Nhà cung cấp
                    </span>
                    <span className="mwh-audit-text" style={{ fontWeight: 600 }}>
                      {form.customer_name ? `${form.customer_name}${form.customer_code ? ` (${form.customer_code})` : ''}` : '—'}
                    </span>
                  </div>

                  {form.content && (
                    <div className="mwh-audit-cell mwh-audit-cell--full">
                      <span className="mwh-audit-title">
                        <FileText size={13} color="#7b5233" /> Nội dung / Ghi chú
                      </span>
                      <span className="mwh-audit-sub" style={{ fontSize: '12.5px', color: '#4b382a', fontStyle: 'italic' }}>
                        {form.content}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* ── GIAO DIỆN FORM KHI TẠO MỚI HOẶC ĐANG SỬA ── */
                <>
                  <div className="mwh-field-group">
                    <label className="mwh-label">Kho nhập <span className="mwh-req">*</span></label>
                    <select
                      className="mwh-select"
                      disabled={!isNew && form.status === 'COMPLETED'}
                      value={form.warehouse_name}
                      onChange={(e) => setForm((p) => ({ ...p, warehouse_name: e.target.value }))}
                    >
                      <option value="">-- Chọn kho --</option>
                      {(meta.warehouses || []).map((w) => (
                        <option key={w.code} value={w.name}>{w.name} ({w.code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="mwh-field-group">
                    <label className="mwh-label">
                      Mã PO đặt hàng {loadingPo && <span style={{ fontSize: '11px', color: '#7b5233', fontWeight: 500 }}>(đang tải...)</span>}
                    </label>
                    <CustomSelect
                      value={form.ctgs}
                      options={poOptions}
                      onChange={handlePoSelect}
                      placeholder="Chọn hoặc gõ tìm Mã PO (VD: DMH_00685/26)..."
                      allowCustomInput={true}
                      onSearch={handlePoSearch}
                    />
                  </div>

                  <div className="mwh-field-group">
                    <label className="mwh-label">Người giao hàng</label>
                    <input
                      className="mwh-input"
                      placeholder="Nhập tên người giao..."
                      value={form.deliverer_name}
                      onChange={(e) => setForm((p) => ({ ...p, deliverer_name: e.target.value }))}
                    />
                  </div>

                  <div className="mwh-field-group">
                    <label className="mwh-label">Khách hàng / NCC</label>
                    <FormMultiSearchSelect
                      multiple={false}
                      values={form.customer_name ? [form.customer_name] : []}
                      options={customerOptions}
                      placeholder="Chọn đối tác..."
                      itemType="đối tác"
                      allowCustomInput={true}
                      uppercaseCustom={false}
                      onChange={(vals) => {
                        const nextName = vals?.[0] || '';
                        const match = (meta.customers || []).find((c) => c.name === nextName);
                        setForm((p) => ({
                          ...p,
                          customer_name: nextName,
                          customer_code: match ? match.code : '',
                        }));
                      }}
                    />
                  </div>

                  <div className="mwh-field-group" style={{ marginBottom: 0 }}>
                    <label className="mwh-label">Nội dung / Ghi chú</label>
                    <textarea
                      rows={2}
                      className="mwh-textarea"
                      placeholder="Ghi chú kiểm đếm, nguồn gỗ, container..."
                      value={form.content}
                      onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mwh-card">
              <div className="mwh-section-title">
                <span>2. Danh sách vật tư ({form.items.length} dòng • Tổng SL: {formatNumberVN(totalQty)})</span>
                {!readOnly && form.items.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="mwh-btn-secondary"
                      style={{ padding: '5px 9px', fontSize: '11.5px', whiteSpace: 'nowrap' }}
                      onClick={() => setPickerOpen(true)}
                    >
                      <Plus size={13} /> Danh mục
                    </button>
                    <button
                      type="button"
                      className="mwh-btn-primary"
                      style={{ padding: '5px 9px', fontSize: '11.5px', whiteSpace: 'nowrap' }}
                      onClick={handleAddManualItem}
                    >
                      <Plus size={13} /> Thêm dòng
                    </button>
                  </div>
                )}
              </div>

              {form.items.length > 0 && (
                <div className="mwh-toolbar-clean">
                  <div className="mwh-filter-row-top">
                    <div className="mwh-search-input-box">
                      <Search size={14} className="mwh-search-icon" />
                      <input
                        type="text"
                        className="mwh-search-field"
                        placeholder="Tìm mã VT, tên VT, PO trong phiếu..."
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
                  </div>
                </div>
              )}

              {form.items.length === 0 ? (
                <div className="mwh-empty" style={{ padding: '22px 10px' }}>
                  <PackagePlus size={32} color="#b09b84" />
                  <span style={{ color: '#78716c', fontSize: '12.5px', marginTop: 4 }}>
                    Chưa có sản phẩm nào trong phiếu nhập.
                  </span>
                  {!readOnly && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="mwh-btn-secondary"
                        style={{ padding: '7px 14px', fontSize: '12.5px', whiteSpace: 'nowrap' }}
                        onClick={() => setPickerOpen(true)}
                      >
                        <Plus size={14} /> Chọn từ danh mục
                      </button>
                      <button
                        type="button"
                        className="mwh-btn-primary"
                        style={{ padding: '7px 14px', fontSize: '12.5px', whiteSpace: 'nowrap' }}
                        onClick={handleAddManualItem}
                      >
                        <Plus size={14} /> Thêm dòng thủ công
                      </button>
                    </div>
                  )}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="mwh-empty" style={{ padding: '16px 10px' }}>
                  <Search size={22} color="#b09b84" />
                  <span>Không tìm thấy vật tư nào khớp với "{tableSearch}".</span>
                  <button
                    type="button"
                    className="mwh-btn-secondary"
                    style={{ marginTop: '8px', padding: '4px 10px', fontSize: '11.5px' }}
                    onClick={() => setTableSearch('')}
                  >
                    Xóa tìm kiếm
                  </button>
                </div>
              ) : (
                /* ── GIAO DIỆN LƯỚI MOBILE TINH GỌN (CHUẨN ẢNH 2) ── */
                <div className="mwh-grid-card">
                  <div className="mwh-grid-scroll-wrap">
                    {/* Header 3 cột: VẬT TƯ | PO/ĐVT | THỰC NHẬP */}
                    <div className="mwh-grid-header">
                      <div className="mwh-grid-col-mat">VẬT TƯ</div>
                      <div className="mwh-grid-col-quota" style={{ width: '75px' }}>PO / ĐVT</div>
                      <div className="mwh-grid-col-qty-header" style={{ width: '135px' }}>
                        <div>THỰC NHẬP</div>
                      </div>
                    </div>

                    {/* Body danh sách từng dòng vật tư */}
                    <div className="mwh-grid-body">
                      {filteredItems.map(({ item: it, originalIndex: idx }) => (
                        <div key={`rcp_item_${it.item_code || 'manual'}_${idx}`} className="mwh-grid-row">
                          {/* Cột 1: Thông tin vật tư */}
                          <div className="mwh-grid-col-mat">
                            <div className="mwh-grid-code-title" title={it.item_code || it.item_name}>
                              <span className="mwh-stt-pill">{idx + 1}</span>
                              {it.item_code ? (
                                <span className="mwh-grid-mat-code">{it.item_code}</span>
                              ) : !readOnly ? (
                                <input
                                  type="text"
                                  className="mwh-compact-text-input"
                                  placeholder="Nhập tên sản phẩm..."
                                  value={it.item_name || ''}
                                  onChange={(e) => updateLine(idx, 'item_name', e.target.value)}
                                />
                              ) : (
                                <span className="mwh-grid-mat-code">{it.item_name || '(Chưa đặt tên)'}</span>
                              )}
                            </div>
                            {it.item_code ? (
                              <div className="mwh-grid-name" title={it.item_name}>
                                {it.item_name}
                              </div>
                            ) : null}
                          </div>

                          {/* Cột 2: Đặt hàng / PO / ĐVT */}
                          <div className="mwh-grid-col-quota" style={{ width: '78px' }}>
                            {it.order_qty > 0 ? (
                              <>
                                <span className="mwh-grid-quota-val" style={{ fontSize: '11.5px', color: '#7b5233', fontWeight: 700 }}>
                                  Đặt: {formatNumberVN(it.order_qty)}
                                </span>
                                <span className="mwh-grid-unit-sub">{it.unit1 || '—'}</span>
                                {it.received_qty > 0 && (
                                  <span style={{ fontSize: '9.5px', color: '#059669' }}>
                                    Đã nhận: {formatNumberVN(it.received_qty)}
                                  </span>
                                )}
                                {it.remaining_qty > 0 && it.remaining_qty !== it.order_qty ? (
                                  <span style={{ fontSize: '9.5px', color: '#d97706', fontWeight: 700 }}>
                                    Còn: {formatNumberVN(it.remaining_qty)}
                                  </span>
                                ) : it.received_qty >= it.order_qty && it.order_qty > 0 ? (
                                  <span style={{ fontSize: '9.5px', color: '#15803d', fontWeight: 600 }}>
                                    (Đã đủ)
                                  </span>
                                ) : null}
                              </>
                            ) : it.lsx ? (
                              <span className="mwh-grid-quota-val" style={{ fontSize: '11px', color: '#7b5233' }} title={it.lsx}>
                                {it.lsx}
                              </span>
                            ) : !readOnly && !it.item_code ? (
                              <select
                                className="mwh-select"
                                style={{ height: '24px', padding: '0 2px', fontSize: '11px', width: '58px' }}
                                value={it.unit1 || 'Cái'}
                                onChange={(e) => updateLine(idx, 'unit1', e.target.value)}
                              >
                                {(meta.units || []).map((u) => (
                                  <option key={u.code} value={u.code}>{u.code}</option>
                                ))}
                                {it.unit1 && !(meta.units || []).some((u) => u.code === it.unit1) && (
                                  <option value={it.unit1}>{it.unit1}</option>
                                )}
                              </select>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                {it.unit1 || '—'}
                              </span>
                            )}
                          </div>

                          {/* Cột 3: Thực nhập + Nút xóa */}
                          <div className="mwh-grid-col-qty" style={{ width: '135px' }}>
                            {!readOnly ? (
                              <div className="mwh-grid-qty-top">
                                <div className="mwh-input-wrapper">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    className="mwh-compact-input"
                                    value={it.quantity1}
                                    placeholder="0"
                                    onChange={(e) => updateLine(idx, 'quantity1', e.target.value)}
                                  />
                                  <span className="mwh-input-unit">{it.unit1 || 'Cái'}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeLine(idx)}
                                  className="mwh-btn-trash-clean"
                                  title="Xóa dòng"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', width: '100%' }}>
                                <strong style={{ fontSize: '13.5px', color: '#15803d' }}>
                                  {formatNumberVN(it.quantity1)}
                                </strong>
                                <span style={{ fontSize: '11px', color: '#78716c' }}>{it.unit1}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
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
                readOnly={readOnly && form.status !== 'PENDING'}
                onError={(msg) => setMsgModal({ isOpen: true, type: 'error', title: 'Lỗi ảnh', message: msg })}
              />
            </div>
          </div>
        )}

        {!loading && (
          <div className="mwh-bottom-bar">
            {isNew || isEditing ? (
              <>
                {!isNew && (
                  <button type="button" className="mwh-btn-secondary" onClick={() => setIsEditing(false)} disabled={saving}>
                    Hủy sửa
                  </button>
                )}
                <button
                  type="button"
                  className="mwh-btn-secondary"
                  style={{ flex: 1 }}
                  disabled={saving}
                  onClick={() => submitSave('PENDING')}
                >
                  <Save size={15} /> {saving ? 'Đang lưu...' : 'Lưu (Chờ nhập)'}
                </button>
                {(canApprove || isNew) && (
                  <button
                    type="button"
                    className="mwh-btn-primary"
                    style={{ flex: 1 }}
                    disabled={saving}
                    onClick={() => submitSave('COMPLETED')}
                  >
                    <CheckCircle2 size={15} /> Lưu & Đã nhập
                  </button>
                )}
              </>
            ) : (
              <>
                {form.status !== 'COMPLETED' && form.status !== 'CANCELLED' && canEdit && (
                  <button type="button" className="mwh-btn-secondary" onClick={() => setIsEditing(true)} disabled={saving}>
                    <Edit3 size={15} /> Chỉnh sửa
                  </button>
                )}
                {(form.status === 'PENDING' || form.status === 'PROCESSING') && (
                  <button
                    type="button"
                    className="mwh-btn-success"
                    style={{ flex: 1 }}
                    disabled={saving}
                    onClick={() => setConfirmState({ isOpen: true, action: 'CONFIRM' })}
                  >
                    <CheckCircle2 size={16} /> Xác nhận Đã nhập kho
                  </button>
                )}
                {form.status === 'COMPLETED' && (
                  <button type="button" className="mwh-btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/warehouse/goods-receipt')}>
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
          onSelect={handlePickMaterial}
          warehouseName={form.warehouse_name}
          units={meta.units || []}
          onlyInStock={false}
          allowCustomNew={true}
          title="Chọn vật tư nhập kho"
        />

        <ConfirmModal
          isOpen={confirmState.isOpen}
          title="Xác nhận nhập kho"
          message={`Xác nhận phiếu ${form.voucher_no} đã kiểm đếm và nhập đủ hàng vào ${form.warehouse_name}?`}
          onCancel={() => setConfirmState({ isOpen: false, action: null })}
          onConfirm={handleConfirmComplete}
          confirmText="Đã nhập kho"
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
      </div>
    </Layout>
  );
};

export default WarehouseReceiptFormView;

