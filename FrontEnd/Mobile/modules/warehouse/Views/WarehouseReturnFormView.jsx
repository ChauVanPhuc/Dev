import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RotateCcw, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import useAuthStore from '@modules/auth/Models/authModel';
import mobileWarehouseService from '../services/mobileWarehouseService';
import WarehousePickerSheet from './components/WarehousePickerSheet';
import WarehousePhotoGrid from './components/WarehousePhotoGrid';
import {
  RETURN_STATUSES,
  RETURN_RESOLUTIONS,
  getStatusBadge,
  todayISO,
  formatDateVN,
  formatNumberVN,
  hasWarehouseAction,
} from '../constants/warehouseConstants';
import '../styles/mobileWarehouse.css';

const DEFAULT_DEFECT_CATS = [
  'Cong vênh / Nứt nẻ',
  'Mọt / Mốc / Ẩm ướt',
  'Sai kích thước / Độ dày',
  'Trầy xước bề mặt',
  'Lỗi phủ melamine / Veneer',
  'Sai màu sắc / Chênh tông',
  'Bao bì rách / Hư hỏng',
  'Khác',
];

const WarehouseReturnFormView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, permissions, logout } = useAuthStore();
  const isNew = !id || id === 'new';

  const [meta, setMeta] = useState({ warehouses: [], units: [], departments: [], defect_categories: [] });
  const [myFactory, setMyFactory] = useState({
    factory_id: user?.factory_id || null,
    factory_name: user?.factory_name || '',
    factory_code: '',
  });
  const [hasFactory, setHasFactory] = useState(null);
  const [factoryHandovers, setFactoryHandovers] = useState([]);
  const [selectedHandoverMeta, setSelectedHandoverMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [form, setForm] = useState({
    voucher_no: '',
    created_date: todayISO(),
    source_type: 'PROD_RETURN',
    return_mode: 'DEFECTIVE',
    origin_voucher_id: null,
    origin_voucher_no: '',
    origin_line_id: null,
    factory_id: user?.factory_id || null,
    factory_name: user?.factory_name || '',
    warehouse_name: '',
    department_name: '',
    returned_by: user?.full_name || user?.username || '',
    item_code: '',
    item_name: '',
    unit_main: 'Cái',
    unit_conversion: '',
    conversion_rate: 1,
    quantity_main: '',
    defect_category: '',
    defect_reason: '',
    status: 'PENDING',
    resolution: 'PENDING',
    resolution_notes: '',
    received_by: '',
    received_at: '',
    created_channel: 'Mobile',
    images: [],
  });

  const [resolveModal, setResolveModal] = useState({ isOpen: false, resolution: 'REUSE', label: '', notes: '' });
  const [msgModal, setMsgModal] = useState({ isOpen: false, type: 'info', title: '', message: '', onDone: null });

  const canResolve = hasWarehouseAction(
    permissions,
    user,
    ['/warehouse/returns', 'mobile_warehouse-return', 'mobile_warehouse', '/admin/warehouse/rejected-goods', 'warehouse-rejected', 'warehouse-management', 'warehouse'],
    'approve'
  );

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      try {
        const [metaRes, existing, myFactoryRes] = await Promise.all([
          mobileWarehouseService.getMobileMeta(),
          isNew ? Promise.resolve(null) : mobileWarehouseService.getReturnById(id),
          isNew ? mobileWarehouseService.getMyFactoryHandovers() : Promise.resolve(null),
        ]);
        if (!mounted) return;
        setMeta(metaRes);

        if (myFactoryRes) {
          const fac = myFactoryRes.factory || { factory_id: null, factory_name: '', factory_code: '' };
          setMyFactory(fac);
          setHasFactory(Boolean(myFactoryRes.has_factory));
          setFactoryHandovers(Array.isArray(myFactoryRes.vouchers) ? myFactoryRes.vouchers : []);
          if (isNew) {
            setForm((p) => ({
              ...p,
              factory_id: fac.factory_id || null,
              factory_name: fac.factory_name || '',
            }));
          }
        }

        if (existing) {
          setForm({
            voucher_no: existing.voucher_no || '',
            created_date: existing.created_date || todayISO(),
            source_type: existing.source_type || 'PROD_RETURN',
            return_mode: existing.return_mode || 'DEFECTIVE',
            origin_voucher_id: existing.origin_voucher_id || null,
            origin_voucher_no: existing.origin_voucher_no || '',
            origin_line_id: existing.origin_line_id || null,
            factory_id: existing.factory_id || null,
            factory_name: existing.factory_name || '',
            warehouse_name: existing.warehouse_name || '',
            department_name: existing.department_name || '',
            returned_by: existing.returned_by || existing.created_by || '',
            item_code: existing.item_code || '',
            item_name: existing.item_name || '',
            unit_main: existing.unit_main || 'Cái',
            unit_conversion: existing.unit_conversion || '',
            conversion_rate: Number(existing.conversion_rate || 1),
            quantity_main: existing.quantity_main || '',
            defect_category: existing.defect_category || '',
            defect_reason: existing.defect_reason || '',
            status: existing.status || 'PENDING',
            resolution: existing.resolution || 'PENDING',
            resolution_notes: existing.resolution_notes || '',
            received_by: existing.received_by || '',
            received_at: existing.received_at || '',
            created_channel: existing.created_channel || 'Web',
            images: Array.isArray(existing.images) ? existing.images : [],
          });
        }
      } catch (err) {
        console.error('[WarehouseReturnFormView] Lỗi tải phiếu trả về:', err);
        if (mounted) {
          const isAuthErr = err?.response?.status === 401;
          setMsgModal({
            isOpen: true,
            type: 'error',
            title: 'Lỗi tải dữ liệu',
            message: err?.response?.data?.detail || err.message,
            onDone: isAuthErr
              ? () => {
                  logout();
                  navigate('/login', { replace: true });
                }
              : null,
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, [id, isNew]);

  const defectCategoryOptions = useMemo(() => {
    const dbNames = (meta.defect_categories || []).map((c) => c.name).filter(Boolean);
    return Array.from(new Set([...dbNames, ...DEFAULT_DEFECT_CATS]));
  }, [meta.defect_categories]);

  const qtyConv = useMemo(() => {
    const q = Number(form.quantity_main || 0);
    const rate = Number(form.conversion_rate || 1);
    return Math.round(q * rate * 100) / 100;
  }, [form.quantity_main, form.conversion_rate]);

  const deliveredPickerItems = useMemo(() => {
    const items = [];
    for (const v of factoryHandovers || []) {
      for (const it of v.items || []) {
        const qtyVal = Number(it.quantity1 || it.quantity || 0);
        if (qtyVal <= 0) continue;
        items.push({
          item_code: it.item_code,
          item_name: it.item_name,
          unit_main: it.unit1 || it.unit || 'cái',
          unit_conversion: it.unit2 || '',
          conversion_rate: Number(it.conversion_rate || 1),
          closing_main: qtyVal,
          warehouse_code: v.warehouse_code || '',
          warehouse_name: v.warehouse_name || '',
          origin_voucher_id: v.id,
          origin_voucher_no: v.voucher_no,
          origin_line_id: it.id || it.line_id || null,
          factory_id: v.factory_id,
          factory_name: v.factory_name || '',
          source: 'Đã giao',
          _voucher: v,
          _item: it,
        });
      }
    }
    return items;
  }, [factoryHandovers]);

  const handlePickHandoverItem = (voucher, item) => {
    const qtyVal = Number(item.quantity1 || item.quantity || 1);
    setSelectedHandoverMeta({
      voucher_no: voucher.voucher_no,
      issue_date: voucher.issue_date,
      warehouse_name: voucher.warehouse_name,
      delivered_qty: qtyVal,
      delivered_unit: item.unit1 || item.unit || 'cái',
    });
    setForm((p) => ({
      ...p,
      origin_voucher_id: voucher.id,
      origin_voucher_no: voucher.voucher_no,
      origin_line_id: item.id || item.line_id || null,
      factory_id: voucher.factory_id || myFactory.factory_id || p.factory_id || null,
      factory_name: voucher.factory_name || myFactory.factory_name || p.factory_name || '',
      warehouse_name: voucher.warehouse_name || p.warehouse_name || '',
      department_name: p.department_name || voucher.department_name || '',
      item_code: item.item_code,
      item_name: item.item_name,
      unit_main: item.unit1 || item.unit || 'cái',
      unit_conversion: item.unit2 || '',
      conversion_rate: Number(item.conversion_rate || 1),
      quantity_main: String(qtyVal > 0 ? qtyVal : 1),
    }));
  };

  const handlePickMaterialDirect = (mat) => {
    if (mat?._voucher && mat?._item) {
      handlePickHandoverItem(mat._voucher, mat._item);
      return;
    }
    setSelectedHandoverMeta(null);
    setForm((p) => ({
      ...p,
      warehouse_name: mat.warehouse_name || p.warehouse_name || '',
      origin_voucher_id: mat.origin_voucher_id || null,
      origin_voucher_no: mat.origin_voucher_no || '',
      origin_line_id: mat.origin_line_id || null,
      factory_id: mat.factory_id || p.factory_id || null,
      factory_name: mat.factory_name || p.factory_name || '',
      item_code: mat.item_code,
      item_name: mat.item_name,
      unit_main: mat.unit_main || 'cái',
      unit_conversion: mat.unit_conversion || '',
      conversion_rate: Number(mat.conversion_rate || 1),
      quantity_main: String(Number(mat.closing_main || 1) > 0 ? mat.closing_main : 1),
    }));
  };

  const clearSelectedItem = () => {
    setSelectedHandoverMeta(null);
    setForm((p) => ({
      ...p,
      item_code: '',
      item_name: '',
      origin_voucher_id: null,
      origin_voucher_no: '',
      origin_line_id: null,
    }));
  };

  const handleSubmit = async () => {
    if (!form.warehouse_name) {
      setMsgModal({ isOpen: true, type: 'warning', title: 'Thiếu kho', message: 'Vui lòng chọn Kho nhận hàng trả về.' });
      return;
    }
    if (!form.item_code || !form.item_name) {
      setMsgModal({
        isOpen: true,
        type: 'warning',
        title: 'Thiếu vật tư',
        message: 'Vui lòng bấm "Chọn hàng" để chọn hàng đã giao trả về.',
      });
      return;
    }
    const qty = Number(form.quantity_main);
    if (isNaN(qty) || qty <= 0) {
      setMsgModal({ isOpen: true, type: 'warning', title: 'Số lượng không hợp lệ', message: 'Số lượng trả về phải lớn hơn 0.' });
      return;
    }
    if (!form.defect_reason.trim()) {
      setMsgModal({ isOpen: true, type: 'warning', title: 'Thiếu lý do', message: 'Vui lòng nhập lý do trả về hoặc tình trạng hàng.' });
      return;
    }

    setSaving(true);
    try {
      const saved = await mobileWarehouseService.createReturn({
        created_date: form.created_date,
        source_type: form.source_type,
        return_mode: form.return_mode,
        origin_voucher_id: form.origin_voucher_id || null,
        origin_voucher_no: form.origin_voucher_no || '',
        origin_line_id: form.origin_line_id || null,
        factory_id: form.factory_id || myFactory.factory_id || null,
        factory_name: form.factory_name || myFactory.factory_name || '',
        warehouse_name: form.warehouse_name,
        department_name: String(form.department_name || '').trim(),
        returned_by: String(form.returned_by || '').trim(),
        item_code: form.item_code,
        item_name: form.item_name,
        unit_main: form.unit_main,
        unit_conversion: form.unit_conversion,
        conversion_rate: Number(form.conversion_rate || 1),
        quantity_main: qty,
        quantity_conv: qtyConv,
        defect_category: form.defect_category,
        defect_reason: form.defect_reason.trim(),
        images: form.images,
      });

      setMsgModal({
        isOpen: true,
        type: 'success',
        title: 'Đã tạo phiếu trả về',
        message: `Phiếu ${saved.voucher_no} đã được gửi về Kho & hiển thị trực tiếp trên Web Quản lý kho / Hàng trả về.`,
        onDone: () => navigate('/warehouse/returns'),
      });
    } catch (err) {
      console.error('[WarehouseReturnFormView] Lỗi tạo phiếu trả về:', err);
      const isAuthErr = err?.response?.status === 401;
      setMsgModal({
        isOpen: true,
        type: 'error',
        title: 'Không thể lưu phiếu',
        message: err?.response?.data?.detail || err.message,
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

  const handleResolveSubmit = async () => {
    const resKey = resolveModal.resolution;
    setResolveModal((p) => ({ ...p, isOpen: false }));
    setSaving(true);
    try {
      const updated = await mobileWarehouseService.resolveReturn(id, {
        resolution: resKey,
        notes: resolveModal.notes || (resKey === 'REUSE' ? 'Kho xác nhận nhận lại hàng tái sử dụng' : ''),
        images: form.images,
      });
      setForm((p) => ({
        ...p,
        status: updated.status,
        resolution: updated.resolution,
        resolution_notes: updated.resolution_notes,
        received_by: updated.received_by,
        received_at: updated.received_at,
      }));
      setMsgModal({
        isOpen: true,
        type: 'success',
        title: 'Đã xử lý phiếu trả về',
        message: `Phiếu ${updated.voucher_no} đã chuyển sang '${RETURN_RESOLUTIONS[updated.resolution]?.label || updated.resolution}' và đồng bộ XNT lên Web.`,
      });
    } catch (err) {
      console.error('[WarehouseReturnFormView] Lỗi duyệt xử lý:', err);
      setMsgModal({
        isOpen: true,
        type: 'error',
        title: 'Lỗi xử lý',
        message: err?.response?.data?.detail || err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const badge = getStatusBadge(RETURN_STATUSES, form.status);
  const resBadge = RETURN_RESOLUTIONS[form.resolution] || RETURN_RESOLUTIONS.PENDING;
  const readOnly = !isNew;

  return (
    <Layout>
      <div className="mwh-page">
        <PageHeader
          title={isNew ? 'Tạo phiếu trả về' : `Phiếu ${form.voucher_no || '...'}`}
          subTitle={isNew ? 'Trả hàng về kho / Báo hàng loại' : badge.label}
          showBack={true}
          onBackClick={() => navigate('/warehouse/returns')}
        />

        {loading ? (
          <div className="mwh-empty">Đang tải thông tin phiếu trả về...</div>
        ) : (
          <div className="mwh-scroll-area">
            {!isNew && (
              <div className="mwh-card" style={{ background: '#faf6f0' }}>
                <div className="mwh-card-header">
                  <div>
                    <div className="mwh-voucher-code">{form.voucher_no}</div>
                    <div style={{ fontSize: '12px', color: '#7b6456' }}>
                      Nguồn: <strong>{form.created_channel}</strong> • Ngày: {formatDateVN(form.created_date)}
                    </div>
                  </div>
                  <span className="mwh-badge" style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                    {badge.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
                  <span className="mwh-badge" style={{ background: resBadge.bg, color: resBadge.color }}>
                    Hướng XL: {resBadge.label}
                  </span>
                  {form.received_by && (
                    <span style={{ color: '#047857', fontWeight: 600 }}>
                      Kho nhận: {form.received_by} ({form.received_at})
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="mwh-card">
              <div className="mwh-section-title">1. Kho & Thông tin trả hàng</div>

              <div className="mwh-field-row">
                <div className="mwh-field-group">
                  <label className="mwh-label">Kho lưu trữ / nhận trả <span className="mwh-req">*</span></label>
                  <select
                    className="mwh-select"
                    disabled={readOnly}
                    value={form.warehouse_name}
                    onChange={(e) => setForm((p) => ({ ...p, warehouse_name: e.target.value }))}
                  >
                    <option value="">-- Chọn kho --</option>
                    {(meta.warehouses || []).map((w) => (
                      <option key={w.code} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mwh-field-group">
                  <label className="mwh-label">Ngày phát sinh</label>
                  <input
                    type="date"
                    className="mwh-input"
                    readOnly={readOnly}
                    value={form.created_date}
                    onChange={(e) => setForm((p) => ({ ...p, created_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="mwh-field-row">
                <div className="mwh-field-group" style={!isNew && form.origin_voucher_no ? undefined : { marginBottom: 0 }}>
                  <label className="mwh-label">Bộ phận trả hàng</label>
                  <input
                    type="text"
                    className="mwh-input"
                    readOnly={readOnly}
                    placeholder="Nhập bộ phận / xưởng trả..."
                    value={form.department_name}
                    onChange={(e) => setForm((p) => ({ ...p, department_name: e.target.value }))}
                  />
                </div>
                <div className="mwh-field-group" style={!isNew && form.origin_voucher_no ? undefined : { marginBottom: 0 }}>
                  <label className="mwh-label">Người trả / Lập phiếu</label>
                  <input
                    className="mwh-input"
                    readOnly={readOnly}
                    value={form.returned_by}
                    onChange={(e) => setForm((p) => ({ ...p, returned_by: e.target.value }))}
                  />
                </div>
              </div>

              {!isNew && form.origin_voucher_no && (
                <div className="mwh-field-group" style={{ marginBottom: 0 }}>
                  <label className="mwh-label">Phiếu bàn giao gốc</label>
                  <input className="mwh-input" readOnly value={form.origin_voucher_no} />
                </div>
              )}
            </div>

            <div className="mwh-card">
              <div className="mwh-section-title">
                <span>2. Hàng trả về</span>
                {isNew && (
                  <button
                    type="button"
                    className="mwh-btn-secondary"
                    style={{ padding: '5px 10px', fontSize: '12px' }}
                    onClick={() => setPickerOpen(true)}
                  >
                    <Search size={13} /> {form.item_code ? 'Đổi hàng' : 'Chọn hàng'}
                  </button>
                )}
              </div>

              {form.item_code ? (
                <div className="mwh-item-card" style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, color: '#5c2d0e', fontSize: '14px' }}>{form.item_code}</span>
                        {form.origin_voucher_no && (
                          <span className="mwh-channel-badge">{form.origin_voucher_no}</span>
                        )}
                        {selectedHandoverMeta?.delivered_qty > 0 && (
                          <span className="mwh-stock-pill">
                            Đã giao: {formatNumberVN(selectedHandoverMeta.delivered_qty)} {selectedHandoverMeta.delivered_unit}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#374151', marginTop: 2 }}>{form.item_name}</div>
                      {(form.warehouse_name || form.unit_main) && (
                        <div style={{ fontSize: '11.5px', color: '#7b6456', marginTop: 2 }}>
                          {form.warehouse_name ? `${form.warehouse_name} • ` : ''}ĐVT: {form.unit_main}
                        </div>
                      )}
                    </div>
                    {isNew && (
                      <button
                        type="button"
                        className="mwh-btn-secondary"
                        style={{ padding: '4px 9px', fontSize: '11.5px', flexShrink: 0 }}
                        onClick={clearSelectedItem}
                      >
                        Đổi
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mwh-empty" style={{ padding: '16px 8px', marginBottom: '10px' }}>
                  <AlertCircle size={22} color="#b09b84" />
                  <span>
                    {isNew
                      ? hasFactory === false
                        ? 'Tài khoản chưa được gắn Nhà máy nên chưa có danh sách hàng đã giao.'
                        : 'Bấm "Chọn hàng" để chọn hàng đã giao trả về.'
                      : 'Không có thông tin vật tư.'}
                  </span>
                </div>
              )}

              <div className="mwh-field-row" style={{ gridTemplateColumns: '112px minmax(0, 1fr)' }}>
                <div className="mwh-field-group">
                  <label className="mwh-label">SL trả ({form.unit_main}) <span className="mwh-req">*</span></label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    className="mwh-input"
                    readOnly={readOnly}
                    placeholder="0"
                    value={form.quantity_main}
                    onChange={(e) => setForm((p) => ({ ...p, quantity_main: e.target.value }))}
                  />
                  {form.unit_conversion && form.unit_conversion !== form.unit_main && (
                    <span style={{ fontSize: '11px', color: '#7b6456' }}>
                      ≈ {formatNumberVN(qtyConv)} {form.unit_conversion}
                    </span>
                  )}
                </div>
                <div className="mwh-field-group">
                  <label className="mwh-label">Phân loại lỗi</label>
                  {readOnly ? (
                    <input className="mwh-input" readOnly value={form.defect_category || '—'} />
                  ) : (
                    <select
                      className="mwh-select"
                      value={form.defect_category}
                      onChange={(e) => setForm((p) => ({ ...p, defect_category: e.target.value }))}
                    >
                      <option value="">-- Chọn phân loại lỗi --</option>
                      <option value="Hoàn trả hàng tốt dư">Hoàn trả hàng tốt dư</option>
                      {defectCategoryOptions.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="mwh-field-group" style={{ marginBottom: 0 }}>
                <label className="mwh-label">Lý do trả về <span className="mwh-req">*</span></label>
                <textarea
                  rows={2}
                  className="mwh-textarea"
                  readOnly={readOnly}
                  placeholder="Nhập lý do trả về / hiện trạng hàng..."
                  value={form.defect_reason}
                  onChange={(e) => setForm((p) => ({ ...p, defect_reason: e.target.value }))}
                />
              </div>

              {form.resolution_notes && (
                <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: '#ecfdf5', fontSize: '12px', color: '#065f46' }}>
                  <strong>Kết luận xử lý:</strong> {form.resolution_notes}
                </div>
              )}
            </div>

            <div className="mwh-card">
              <WarehousePhotoGrid
                images={form.images}
                onChange={(imgs) => setForm((p) => ({ ...p, images: imgs }))}
                readOnly={readOnly && form.status !== 'PENDING'}
                label="Ảnh hiện trạng hàng trả về"
                onError={(msg) => setMsgModal({ isOpen: true, type: 'error', title: 'Lỗi ảnh', message: msg })}
              />
            </div>
          </div>
        )}

        {!loading && (
          <div className="mwh-bottom-bar">
            {isNew ? (
              <button type="button" className="mwh-btn-primary" style={{ flex: 1, padding: '11px 14px' }} disabled={saving} onClick={handleSubmit}>
                <RotateCcw size={16} /> {saving ? 'Đang lưu...' : 'Gửi phiếu trả về kho'}
              </button>
            ) : form.status === 'PENDING' && canResolve ? (
              <>
                <button
                  type="button"
                  className="mwh-btn-success"
                  style={{ flex: 1 }}
                  disabled={saving}
                  onClick={() => setResolveModal({ isOpen: true, resolution: 'REUSE', label: 'Tái sử dụng / Nhập lại kho', notes: '' })}
                >
                  <CheckCircle2 size={15} /> Nhập lại kho (REUSE)
                </button>
                <button
                  type="button"
                  className="mwh-btn-secondary"
                  disabled={saving}
                  onClick={() => setResolveModal({
                    isOpen: true,
                    resolution: form.source_type === 'QC_INCOMING' ? 'RETURN_VENDOR' : 'SCRAP',
                    label: form.source_type === 'QC_INCOMING' ? 'Trả nhà cung cấp' : 'Xuất hủy',
                    notes: '',
                  })}
                >
                  {form.source_type === 'QC_INCOMING' ? 'Trả NCC' : 'Xuất hủy'}
                </button>
              </>
            ) : (
              <button type="button" className="mwh-btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/warehouse/returns')}>
                Quay lại danh sách
              </button>
            )}
          </div>
        )}

        <WarehousePickerSheet
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handlePickMaterialDirect}
          materials={deliveredPickerItems}
          units={meta.units || []}
          warehouseName=""
          onlyInStock={true}
          allowCustomNew={false}
          stockBadgePrefix="Đã giao"
          emptyText={
            hasFactory === false
              ? 'Tài khoản chưa được gắn Nhà máy.'
              : 'Chưa có vật tư nào đã bàn giao phù hợp.'
          }
          title="Chọn hàng đã giao trả về"
        />

        <ConfirmModal
          isOpen={resolveModal.isOpen}
          title="Xác nhận xử lý phiếu trả về"
          message={`Bạn xác nhận chuyển phiếu ${form.voucher_no} (${form.quantity_main} ${form.unit_main} ${form.item_code}) sang hướng '${resolveModal.label}'?`}
          onCancel={() => setResolveModal((p) => ({ ...p, isOpen: false }))}
          onConfirm={handleResolveSubmit}
          confirmText="Xác nhận xử lý"
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

export default WarehouseReturnFormView;

