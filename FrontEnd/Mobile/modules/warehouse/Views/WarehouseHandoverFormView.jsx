import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, CheckCircle2, Edit3, ClipboardCheck, AlertTriangle } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import useAuthStore from '@modules/auth/Models/authModel';
import mobileWarehouseService from '../services/mobileWarehouseService';
import WarehousePickerSheet from './components/WarehousePickerSheet';
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

  const [form, setForm] = useState({
    voucher_no: '',
    warehouse_name: '',
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
        const [metaRes, rawMats, existing] = await Promise.all([
          mobileWarehouseService.getMobileMeta(),
          mobileWarehouseService.getRawMaterials(),
          isNew ? Promise.resolve(null) : mobileWarehouseService.getHandoverById(id),
        ]);
        if (!mounted) return;
        setMeta(metaRes);
        setMaterials(rawMats);

        if (existing) {
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
            ctgs: existing.ctgs || '',
            content: existing.content || '',
            status: existing.status || 'PENDING',
            created_channel: existing.created_channel || 'Web',
            confirmed_by: existing.confirmed_by || '',
            confirmed_at: existing.confirmed_at || '',
            images: Array.isArray(existing.images) ? existing.images : [],
            items: itemWithStock,
          });
          setIsEditing(false);
        } else {
          setForm((prev) => ({
            ...prev,
            warehouse_name: prev.warehouse_name || metaRes?.warehouses?.[0]?.name || '',
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
          lsx: '',
          package_split: '',
          notes: '',
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
    if (!form.issue_date) return 'Vui lòng chọn Ngày bàn giao.';
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
        issue_date: form.issue_date,
        deliverer_name: delivererDisplay || form.deliverer_name,
        receiver_name: String(form.receiver_name || '').trim(),
        created_by: loggedInAccountName || undefined,
        factory_id: form.factory_id ? Number(form.factory_id) : null,
        factory_name: form.factory_name || '',
        department_name: String(form.department_name || '').trim(),
        customer_code: form.customer_code,
        customer_name: form.customer_name,
        issue_type: form.issue_type,
        status: targetStatus || form.status,
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
              <div className="mwh-section-title">1. Thông tin bàn giao từ Kho</div>

              <div className="mwh-field-row">
                <div className="mwh-field-group">
                  <label className="mwh-label">Kho xuất bàn giao <span className="mwh-req">*</span></label>
                  <select
                    className="mwh-select"
                    disabled={readOnly || (!isNew && form.status === 'COMPLETED')}
                    value={form.warehouse_name}
                    onChange={(e) => setForm((p) => ({ ...p, warehouse_name: e.target.value, items: isNew ? [] : p.items }))}
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
                    disabled={readOnly}
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
                  <label className="mwh-label">Ngày bàn giao <span className="mwh-req">*</span></label>
                  <input
                    type="date"
                    className="mwh-input"
                    readOnly={readOnly}
                    value={form.issue_date}
                    onChange={(e) => setForm((p) => ({ ...p, issue_date: e.target.value }))}
                  />
                </div>
                <div className="mwh-field-group">
                  <label className="mwh-label">Loại bàn giao / Xuất</label>
                  <select
                    className="mwh-select"
                    disabled={readOnly}
                    value={form.issue_type}
                    onChange={(e) => setForm((p) => ({ ...p, issue_type: e.target.value }))}
                  >
                    {(meta.issue_types || []).map((it) => (
                      <option key={it} value={it}>{it}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mwh-field-row">
                <div className="mwh-field-group">
                  <label className="mwh-label">Người bàn giao (Kho)</label>
                  <input
                    className="mwh-input"
                    readOnly={true}
                    value={delivererDisplay}
                    placeholder="Tài khoản đăng nhập"
                    title="Tự động lấy theo tài khoản đang đăng nhập"
                  />
                </div>
                <div className="mwh-field-group">
                  <label className="mwh-label">Người nhận bàn giao</label>
                  <input
                    type="text"
                    className="mwh-input"
                    readOnly={readOnly && form.status === 'COMPLETED'}
                    placeholder="Nhập tên người nhận..."
                    value={form.receiver_name}
                    onChange={(e) => setForm((p) => ({ ...p, receiver_name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="mwh-field-group">
                <label className="mwh-label">Bộ phận nhận <span className="mwh-req">*</span></label>
                <input
                  type="text"
                  className="mwh-input"
                  readOnly={readOnly}
                  placeholder="Nhập bộ phận / xưởng nhận..."
                  value={form.department_name}
                  onChange={(e) => setForm((p) => ({ ...p, department_name: e.target.value }))}
                />
              </div>

              <div className="mwh-field-group" style={{ marginBottom: 0 }}>
                <label className="mwh-label">Nội dung bàn giao</label>
                <textarea
                  rows={2}
                  className="mwh-textarea"
                  readOnly={readOnly}
                  placeholder="Ghi chú hạng mục bàn giao, yêu cầu sử dụng..."
                  value={form.content}
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                />
              </div>
            </div>

            <div className="mwh-card">
              <div className="mwh-section-title">
                <span>2. Vật tư bàn giao ({form.items.length} dòng • Tổng: {formatNumberVN(totalQty)})</span>
                {!readOnly && (
                  <button
                    type="button"
                    className="mwh-btn-primary"
                    style={{ padding: '5px 10px', fontSize: '12px' }}
                    onClick={() => setPickerOpen(true)}
                  >
                    <Plus size={14} /> Chọn tồn kho
                  </button>
                )}
              </div>

              {form.items.length === 0 ? (
                <div className="mwh-empty" style={{ padding: '20px 10px' }}>
                  <ClipboardCheck size={28} color="#b09b84" />
                  <span>Chưa có vật tư nào. Bấm "Chọn tồn kho" để thêm hàng.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {form.items.map((it, idx) => {
                    const overStock = isEditing && Number(it.quantity1 || 0) > Number(it.available_stock || 0) + 0.0001;
                    return (
                      <div key={`${it.item_code}_${idx}`} className="mwh-item-card" style={overStock ? { borderColor: '#dc2626', background: '#fef2f2' } : undefined}>
                        <div className="mwh-item-head">
                          <div>
                            <div style={{ fontWeight: 800, color: '#5c2d0e', fontSize: '13.5px' }}>
                              #{idx + 1} • {it.item_code}
                            </div>
                            <div style={{ fontSize: '12.5px', color: '#374151' }}>{it.item_name}</div>
                            {isEditing && (
                              <span className={`mwh-stock-pill ${overStock ? 'mwh-stock-pill--danger' : ''}`} style={{ marginTop: 4 }}>
                                {overStock && <AlertTriangle size={11} />}
                                Tồn khả dụng: {formatNumberVN(it.available_stock)} {it.unit1}
                              </span>
                            )}
                          </div>
                          {!readOnly && (
                            <button type="button" className="mwh-icon-btn" onClick={() => removeLine(idx)} style={{ width: 30, height: 30, color: '#dc2626' }}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        <div className="mwh-field-group">
                          <label className="mwh-label">SL bàn giao ({it.unit1 || 'ĐVT'}) <span className="mwh-req">*</span></label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="mwh-input"
                            readOnly={readOnly}
                            value={it.quantity1}
                            onChange={(e) => updateLine(idx, 'quantity1', e.target.value)}
                          />
                        </div>

                        <div className="mwh-field-group" style={{ marginBottom: 0 }}>
                          <label className="mwh-label">Ghi chú dòng</label>
                          <input
                            className="mwh-input"
                            readOnly={readOnly}
                            placeholder="Vị trí giao, tình trạng kiện..."
                            value={it.notes || ''}
                            onChange={(e) => updateLine(idx, 'notes', e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })}
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
                {!isNew && (
                  <button type="button" className="mwh-btn-secondary" onClick={() => setIsEditing(false)} disabled={saving}>
                    Hủy sửa
                  </button>
                )}
                <button
                  type="button"
                  className="mwh-btn-secondary"
                  style={{ flex: 1 }}
                  disabled={saving || hasOverStock}
                  onClick={() => submitSave('PENDING')}
                >
                  <Save size={15} /> Chờ nhận
                </button>
                {(canApprove || isNew) && (
                  <button
                    type="button"
                    className="mwh-btn-primary"
                    style={{ flex: 1 }}
                    disabled={saving || hasOverStock}
                    onClick={() => submitSave('COMPLETED')}
                  >
                    <CheckCircle2 size={15} /> Đã bàn giao
                  </button>
                )}
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
      </div>
    </Layout>
  );
};

export default WarehouseHandoverFormView;

