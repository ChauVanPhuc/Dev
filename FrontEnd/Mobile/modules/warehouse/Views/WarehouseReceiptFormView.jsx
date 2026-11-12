import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, CheckCircle2, Edit3, PackagePlus } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import useAuthStore from '@modules/auth/Models/authModel';
import FormMultiSearchSelect from '@mobile/Shared/Views/components/form/FormMultiSearchSelect';
import mobileWarehouseService from '../services/mobileWarehouseService';
import WarehousePhotoGrid from './components/WarehousePhotoGrid';
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
    warehouse_name: '',
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
        const [metaRes, existing] = await Promise.all([
          mobileWarehouseService.getMobileMeta(),
          isNew ? Promise.resolve(null) : mobileWarehouseService.getReceiptById(id),
        ]);
        if (!mounted) return;
        setMeta(metaRes);

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
          setForm((prev) => ({
            ...prev,
            warehouse_name: prev.warehouse_name || metaRes?.warehouses?.[0]?.name || '',
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

  const handleAddManualItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item_code: '',
          item_name: '',
          unit1: '',
          quantity1: '',
          unit2: '',
          conversion_rate: 1,
          quantity2: 0,
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
    if (!form.warehouse_name) return 'Vui lòng chọn Kho nhập.';
    if (!form.receipt_date) return 'Vui lòng chọn Ngày nhập kho.';
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
        receipt_date: form.receipt_date,
        deliverer_name: String(form.deliverer_name || '').trim(),
        created_by: loggedInAccountName || undefined,
        customer_code: form.customer_code,
        customer_name: form.customer_name,
        receipt_type: form.receipt_type,
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
              <div className="mwh-section-title">1. Thông tin chứng từ nhập</div>

              <div className="mwh-field-group">
                <label className="mwh-label">Kho nhập <span className="mwh-req">*</span></label>
                <select
                  className="mwh-select"
                  disabled={readOnly || (!isNew && form.status === 'COMPLETED')}
                  value={form.warehouse_name}
                  onChange={(e) => setForm((p) => ({ ...p, warehouse_name: e.target.value }))}
                >
                  <option value="">-- Chọn kho --</option>
                  {(meta.warehouses || []).map((w) => (
                    <option key={w.code} value={w.name}>{w.name} ({w.code})</option>
                  ))}
                </select>
              </div>

              <div className="mwh-field-row">
                <div className="mwh-field-group">
                  <label className="mwh-label">Ngày nhập <span className="mwh-req">*</span></label>
                  <input
                    type="date"
                    className="mwh-input"
                    readOnly={readOnly}
                    value={form.receipt_date}
                    onChange={(e) => setForm((p) => ({ ...p, receipt_date: e.target.value }))}
                  />
                </div>
                <div className="mwh-field-group">
                  <label className="mwh-label">Loại nhập</label>
                  <select
                    className="mwh-select"
                    disabled={readOnly}
                    value={form.receipt_type}
                    onChange={(e) => setForm((p) => ({ ...p, receipt_type: e.target.value }))}
                  >
                    {(meta.receipt_types || []).map((rt) => (
                      <option key={rt} value={rt}>{rt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mwh-field-row">
                <div className="mwh-field-group">
                  <label className="mwh-label">Người giao hàng</label>
                  <input
                    className="mwh-input"
                    readOnly={readOnly}
                    placeholder="Nhập tên người giao..."
                    value={form.deliverer_name}
                    onChange={(e) => setForm((p) => ({ ...p, deliverer_name: e.target.value }))}
                  />
                </div>
                <div className="mwh-field-group">
                  <label className="mwh-label">Người nhận hàng</label>
                  <input
                    className="mwh-input"
                    readOnly={true}
                    value={receiverDisplay}
                    placeholder="Tài khoản đăng nhập"
                    title="Tự động lấy theo tài khoản đang đăng nhập"
                  />
                </div>
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
                  disabled={readOnly}
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
                  readOnly={readOnly}
                  placeholder="Ghi chú kiểm đếm, nguồn gỗ, container..."
                  value={form.content}
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                />
              </div>
            </div>

            <div className="mwh-card">
              <div className="mwh-section-title">
                <span>2. Danh sách vật tư ({form.items.length} dòng • Tổng SL: {formatNumberVN(totalQty)})</span>
                {!readOnly && (
                  <button
                    type="button"
                    className="mwh-btn-primary"
                    style={{ padding: '5px 10px', fontSize: '12px' }}
                    onClick={handleAddManualItem}
                  >
                    <Plus size={14} /> Thêm hàng
                  </button>
                )}
              </div>

              {form.items.length === 0 ? (
                <div className="mwh-empty" style={{ padding: '20px 10px' }}>
                  <PackagePlus size={28} color="#b09b84" />
                  <span>Chưa có sản phẩm nào. Bấm "Thêm hàng" để nhập tay.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {form.items.map((it, idx) => (
                    <div key={`manual_line_${idx}`} className="mwh-item-card">
                      <div className="mwh-item-head">
                        <div style={{ fontWeight: 800, color: '#5c2d0e', fontSize: '13.5px' }}>
                          Sản phẩm #{idx + 1}
                        </div>
                        {!readOnly && (
                          <button type="button" className="mwh-icon-btn" onClick={() => removeLine(idx)} style={{ width: 30, height: 30, color: '#dc2626' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <div className="mwh-field-group">
                        <label className="mwh-label">Tên sản phẩm <span className="mwh-req">*</span></label>
                        <input
                          type="text"
                          className="mwh-input"
                          readOnly={readOnly}
                          placeholder="Nhập tên sản phẩm..."
                          value={it.item_name || ''}
                          onChange={(e) => updateLine(idx, 'item_name', e.target.value)}
                        />
                      </div>

                      <div className="mwh-field-row">
                        <div className="mwh-field-group">
                          <label className="mwh-label">SL <span className="mwh-req">*</span></label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="mwh-input"
                            readOnly={readOnly}
                            placeholder="Nhập SL..."
                            value={it.quantity1}
                            onChange={(e) => updateLine(idx, 'quantity1', e.target.value)}
                          />
                        </div>
                        <div className="mwh-field-group">
                          <label className="mwh-label">Đơn vị</label>
                          <FormMultiSearchSelect
                            multiple={false}
                            values={it.unit1 ? [it.unit1] : []}
                            options={unitOptions}
                            placeholder="Chọn đơn vị..."
                            itemType="đơn vị"
                            allowCustomInput={true}
                            uppercaseCustom={false}
                            disabled={readOnly}
                            onChange={(vals) => updateLine(idx, 'unit1', vals?.[0] || '')}
                          />
                        </div>
                      </div>

                      <div className="mwh-field-group" style={{ marginBottom: 0 }}>
                        <label className="mwh-label">Ghi chú</label>
                        <input
                          type="text"
                          className="mwh-input"
                          readOnly={readOnly}
                          placeholder="Nhập ghi chú..."
                          value={it.notes || ''}
                          onChange={(e) => updateLine(idx, 'notes', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
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

