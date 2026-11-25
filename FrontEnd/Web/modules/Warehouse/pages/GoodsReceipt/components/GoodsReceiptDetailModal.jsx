// GoodsReceiptDetailModal.jsx - Modal Xem chi tiết / Chỉnh sửa / Tạo mới Phiếu Nhập Kho
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, CheckCircle, Package, AlertCircle } from 'lucide-react';
import {
  WAREHOUSE_OPTIONS,
  RECEIPT_TYPES,
  RECEIPT_STATUSES,
  DEPARTMENT_OPTIONS,
  formatNumber
} from '../../../types/goodsReceipt.types';
import warehouseInventoryService from '../../../services/warehouseInventory.service';
import warehouseDataService from '../../../services/warehouseData.service';
import { useWarehouseMeta } from '../../../hooks/useWarehouseMeta';
import { ChannelBadge, MobileImagesGallery } from '../../../components/WarehouseMobileSyncBadge';

const getLoggedUsername = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u?.full_name || u?.name || u?.username || '';
  } catch {
    return '';
  }
};

/**
 * Kiểm tra xem một giá trị số lượng có phải là số âm hay không.
 * Bắt chính xác cả số âm như -1, -11, -100, chuỗi '-...', không tự ý chuyển thành dương.
 */
export const isNegativeQty = (val) => {
  if (val === '' || val === null || val === undefined) return false;
  if (typeof val === 'string' && val.trim().startsWith('-')) return true;
  const num = Number(val);
  return !isNaN(num) && num < 0;
};

/**
 * Tạo dữ liệu form sạch theo đúng quy tắc nghiệp vụ:
 * - Thêm mới: Không tự điền dữ liệu giả (kho, bộ phận, đối tác, loại phiếu, mặt hàng).
 * - Trạng thái khởi tạo: Chờ nhập kho (PENDING).
 */
const getCleanFormData = (isCreate = false) => ({
  voucher_no: isCreate
    ? `PNK-${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`
    : '',
  warehouse_name: '', // Chưa chọn
  receipt_date: new Date().toISOString().split('T')[0], // Ngày hiện tại
  deliverer_name: '', // Trống
  customer_code: '', // Trống
  customer_name: '', // Trống
  department_name: '', // Chưa chọn
  content: '', // Trống
  receipt_type: '', // Chưa chọn
  status: 'PENDING', // Trạng thái khởi tạo mặc định: Chờ nhập kho
  ctgs: '', // Trống
  created_by: getLoggedUsername(),
  items: [] // Danh sách mặt hàng khởi tạo trống hoàn toàn
});

export const GoodsReceiptDetailModal = ({
  isOpen,
  onClose,
  initialData = null,
  isEditMode = false,
  isCreateMode = false,
  onSave
}) => {
  // 1. Khai báo TẤT CẢ Hooks ở cấp cao nhất (Không đặt sau bất kỳ return sớm nào)
  const {
    warehouseNames,
    departmentNames,
    receiptTypes: dbReceiptTypes,
    customers: dbCustomers,
  } = useWarehouseMeta();
  const [formData, setFormData] = useState(() => getCleanFormData(isCreateMode));
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [inventoryCatalog, setInventoryCatalog] = useState([]);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');

  const activeWarehouses = warehouseNames.length > 0 ? warehouseNames : WAREHOUSE_OPTIONS;
  const activeDepartments = departmentNames.length > 0 ? departmentNames : DEPARTMENT_OPTIONS;
  const activeReceiptTypes = dbReceiptTypes.length > 0 ? dbReceiptTypes : RECEIPT_TYPES;

  // Tải danh mục vật tư nhanh trực tiếp từ Database khi Modal mở
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    warehouseDataService
      .searchCatalog({ limit: 150 })
      .then((catalogItems) => {
        if (!isMounted) return;
        setInventoryCatalog(Array.isArray(catalogItems) ? catalogItems : []);
      })
      .catch((err) => {
        console.warn('Lỗi tải danh mục vật tư DB:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Tìm kiếm bổ sung từ Database khi người dùng gõ mã mặt hàng chưa có sẵn trong cache
  useEffect(() => {
    const q = catalogSearchQuery.trim();
    if (!isOpen || q.length < 2) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      warehouseDataService
        .searchCatalog({ search: q, limit: 60 })
        .then((items) => {
          if (cancelled || !Array.isArray(items) || items.length === 0) return;
          setInventoryCatalog((prev) => {
            const seen = new Set(
              prev.map((m) => `${String(m.warehouse_name || '').toLowerCase()}|${String(m.item_code || '').toLowerCase()}`)
            );
            const next = [...prev];
            for (const c of items) {
              const k = `${String(c.warehouse_name || '').toLowerCase()}|${String(c.item_code || '').toLowerCase()}`;
              if (!seen.has(k)) {
                seen.add(k);
                next.push(c);
              }
            }
            return next;
          });
        })
        .catch((err) => console.warn('Lỗi tìm kiếm catalog kho:', err));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, catalogSearchQuery]);

  // Đồng bộ dữ liệu khi mở popup hoặc chuyển đổi chế độ
  useEffect(() => {
    if (!isOpen) {
      setFormError('');
      return;
    }

    if (isCreateMode) {
      // Chế độ Thêm mới: Khởi tạo biểu mẫu sạch hoàn toàn, không lưu vết lần trước
      setFormData(getCleanFormData(true));
      setFormError('');
    } else if (initialData) {
      // Chế độ Chỉnh sửa hoặc Xem chi tiết: Tải dữ liệu thực tế đã lưu của phiếu
      setFormData({
        ...initialData,
        warehouse_name: initialData.warehouse_name || '',
        department_name: initialData.department_name || '',
        receipt_type: initialData.receipt_type || '',
        status: initialData.status || 'PENDING',
        deliverer_name: initialData.deliverer_name || '',
        customer_code: initialData.customer_code || '',
        customer_name: initialData.customer_name || '',
        ctgs: initialData.ctgs || '',
        content: initialData.content || '',
        items: Array.isArray(initialData.items)
          ? initialData.items.map((it) => ({
              ...it,
              unit1: it.unit1 || it.unit || '',
              quantity1: it.quantity1 !== undefined ? it.quantity1 : (it.quantity !== undefined ? it.quantity : ''),
              unit2: it.unit2 || '',
              quantity2: it.quantity2 !== undefined ? it.quantity2 : '',
              stock_qty: it.stock_qty !== undefined ? it.stock_qty : 0,
              lsx: it.lsx || '',
              package_split: it.package_split || '',
              notes: it.notes || ''
            }))
          : []
      });
      setFormError('');
    }
  }, [isOpen, isCreateMode, initialData]);

  // Đóng modal bằng phím ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 2. Kiểm tra điều kiện render (Đảm bảo tất cả Hooks đã được gọi đầy đủ phía trên)
  if (!isOpen) return null;

  const isReadOnly = !isCreateMode && !isEditMode;

  // Quy tắc nghiệp vụ cho phép thay đổi kho:
  // - Khi Thêm mới: Được chọn tự do trong 6 kho
  // - Khi Xem chi tiết: Khóa (chỉ hiển thị)
  // - Khi Chỉnh sửa: Cho phép thay đổi nếu trạng thái chưa hoàn tất nhập kho hoặc hủy
  const isWarehouseDisabled =
    isReadOnly ||
    (isEditMode && (formData.status === 'COMPLETED' || formData.status === 'CANCELLED'));

  // Thêm một dòng hàng mới với các ô nhập liệu hoàn toàn trống
  const handleAddItem = () => {
    setFormError('');
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          item_code: '',
          image: '',
          item_name: '',
          stock_qty: 0,
          unit1: '',
          quantity1: '',
          unit2: '',
          quantity2: '',
          lsx: '',
          package_split: '',
          notes: ''
        }
      ]
    }));
  };

  // Thay đổi kho: Cập nhật lại số tồn thực tế theo kho mới
  const handleWarehouseChange = (newWarehouse) => {
    setFormError('');
    const updatedItems = formData.items.map((it) => {
      if (!it.item_code) return it;
      const match = inventoryCatalog.find(
        (inv) =>
          inv.item_code.toLowerCase() === it.item_code.toLowerCase() &&
          inv.warehouse_name === newWarehouse
      );
      return {
        ...it,
        stock_qty: match && match.closing_main !== undefined ? match.closing_main : 0
      };
    });

    setFormData((prev) => ({
      ...prev,
      warehouse_name: newWarehouse,
      items: updatedItems
    }));
  };

  // Thay đổi thông tin trên từng dòng hàng
  const handleItemChange = (index, field, value) => {
    setFormError('');
    const updated = [...formData.items];
    const item = { ...updated[index], [field]: value };

    // Tự động tra cứu số tồn và đơn vị tính thực tế khi nhập hoặc chọn mã mặt hàng
    if (field === 'item_code') {
      setCatalogSearchQuery(String(value || ''));
      const codeTrimmed = String(value || '').trim().toLowerCase();
      // Ưu tiên tìm trong kho đã chọn trước, sau đó tìm trong catalog PO / SP mẫu
      const match =
        inventoryCatalog.find(
          (inv) =>
            inv.item_code.toLowerCase() === codeTrimmed &&
            formData.warehouse_name &&
            inv.warehouse_name === formData.warehouse_name
        ) ||
        inventoryCatalog.find((inv) => inv.item_code.toLowerCase() === codeTrimmed);

      if (match) {
        item.item_name = match.item_name || item.item_name;
        item.unit1 = match.unit_main || item.unit1;
        item.unit = match.unit_main || item.unit;
        item.unit2 = match.unit_conversion || '';
        item.image = match.image_url || item.image || '';
        item.stock_qty = match.closing_main !== undefined ? match.closing_main : 0;
      } else {
        item.stock_qty = 0;
      }
    }

    if (field === 'unit1') {
      item.unit = value;
    }

    if (field === 'quantity1') {
      item.quantity = value !== '' ? Number(value) : '';
    }

    updated[index] = item;
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  const handleRemoveItem = (index) => {
    setFormError('');
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Kiểm tra tính hợp lệ trước khi lưu phiếu nhập
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // 1. Kiểm tra trường bắt buộc
    if (!formData.voucher_no?.trim()) {
      setFormError('Vui lòng nhập Mã phiếu!');
      return;
    }

    if (!formData.warehouse_name?.trim()) {
      setFormError('Vui lòng chọn Kho nhập kho trước khi lưu!');
      return;
    }

    if (!formData.receipt_date) {
      setFormError('Vui lòng chọn Ngày nhập kho!');
      return;
    }

    // 2. Kiểm tra danh sách mặt hàng: Phải có ít nhất 1 dòng
    if (!formData.items || formData.items.length === 0) {
      setFormError('Phiếu nhập kho phải có ít nhất một dòng mặt hàng! Vui lòng nhấn "Thêm dòng hàng".');
      return;
    }

    // 3. Kiểm tra chi tiết từng dòng hàng
    for (let i = 0; i < formData.items.length; i++) {
      const it = formData.items[i];
      const rowNum = i + 1;

      // Tuyệt đối không cho phép số lượng âm
      if (isNegativeQty(it.quantity1) || isNegativeQty(it.quantity2)) {
        setFormError(`Dòng số ${rowNum}: Số lượng không được âm. Vui lòng kiểm tra lại các ô cảnh báo màu đỏ!`);
        return;
      }

      if (!it.item_code?.trim()) {
        setFormError(`Dòng số ${rowNum}: Vui lòng nhập hoặc chọn Mã mặt hàng!`);
        return;
      }

      if (!it.item_name?.trim()) {
        setFormError(`Dòng số ${rowNum}: Vui lòng nhập Tên mặt hàng!`);
        return;
      }

      const q1 = Number(it.quantity1);
      if (
        it.quantity1 === '' ||
        it.quantity1 === null ||
        it.quantity1 === undefined ||
        isNaN(q1) ||
        q1 <= 0
      ) {
        setFormError(`Dòng số ${rowNum}: SL nhập 1 phải lớn hơn 0!`);
        return;
      }

      if (!it.unit1?.trim() && !it.unit?.trim()) {
        setFormError(`Dòng số ${rowNum}: Vui lòng nhập Đơn vị tính (ĐVT1)!`);
        return;
      }

      if (it.quantity2 !== '' && it.quantity2 !== undefined && it.quantity2 !== null) {
        const q2 = Number(it.quantity2);
        if (isNaN(q2) || q2 < 0) {
          setFormError(`Dòng số ${rowNum}: SL nhập 2 không được âm!`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payloadToSave = {
        ...formData,
        total_lines: formData.items.length,
        total_quantity: formData.items.reduce(
          (sum, it) => sum + (Number(it.quantity1) > 0 ? Number(it.quantity1) : 0),
          0
        )
      };
      await onSave?.(payloadToSave);
      onClose();
    } catch (err) {
      setFormError(err.message || 'Lỗi khi lưu phiếu nhập kho.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Tính số lượng hàng và tổng số lượng nhập thực tế (từ SL nhập 1)
  const itemCount = formData.items.length;
  const totalQuantity = formData.items.reduce((sum, it) => {
    const q1 = Number(it.quantity1 !== undefined ? it.quantity1 : (it.quantity !== undefined ? it.quantity : 0));
    return sum + (!isNaN(q1) && q1 > 0 ? q1 : 0);
  }, 0);

  const modalContent = (
    <div className="wh-modal-overlay" onClick={onClose}>
      <div
        className="wh-modal-card wh-receipt-detail-modal-card"
        style={{
          width: 'min(1440px, 96vw)',
          maxWidth: 'min(1440px, 96vw)',
          height: 'min(760px, 90dvh)',
          maxHeight: 'min(760px, 90dvh)',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header Popup - Cố định */}
        <div className="wh-modal-header" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={20} color="#7B5233" />
            <h3 className="wh-modal-title">
              {isCreateMode
                ? 'Thêm mới phiếu nhập kho'
                : isEditMode
                ? `Chỉnh sửa phiếu nhập kho: ${formData.voucher_no}`
                : `Chi tiết phiếu nhập kho: ${formData.voucher_no}`}
            </h3>
          </div>
          <button type="button" className="wh-modal-close" onClick={onClose} title="Đóng popup">
            <X size={20} />
          </button>
        </div>

        {/* 2. Body Popup - Phân chia khu vực thông tin chung và bảng danh sách có scroll độc lập */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          <div
            className="wh-modal-body"
            style={{
              padding: '14px 18px',
              display: 'flex',
              flexDirection: 'column',
              flex: '1 1 auto',
              minHeight: 0,
              overflow: 'hidden',
              gap: '12px'
            }}
          >
            {/* Cảnh báo lỗi xác thực (Validation Error Banner) */}
            {formError && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#991B1B',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  flexShrink: 0
                }}
              >
                <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            {/* Datalist gợi ý mã hàng & đối tác trực tiếp từ Database */}
            <datalist id="inventory-catalog-items">
              {inventoryCatalog
                .filter(
                  (inv) =>
                    !formData.warehouse_name ||
                    !inv.warehouse_name ||
                    inv.warehouse_name === formData.warehouse_name
                )
                .map((inv, i) => (
                  <option key={inv.id || `${inv.source || 'DB'}-${inv.warehouse_code || 'ALL'}-${inv.item_code}-${i}`} value={inv.item_code}>
                    {inv.item_name} (
                    {inv.source === 'Kho'
                      ? `Tồn: ${formatNumber(inv.closing_main)} ${inv.unit_main}`
                      : `${inv.source || 'Catalog'} • ${inv.unit_main}`}
                    )
                  </option>
                ))}
            </datalist>
            <datalist id="receipt-customers-list">
              {dbCustomers.map((c, idx) => (
                <option key={`${c.id || c.code || idx}_${c.name}`} value={c.name}>
                  {c.code ? `[${c.code}] ${c.name}` : c.name}
                </option>
              ))}
            </datalist>

            {/* ── PHẦN THÔNG TIN CHUNG (Cố định, bố cục 4 cột cân đối, không có 4 trường hóa đơn) ── */}
            <div
              style={{
                backgroundColor: '#FAF8F5',
                border: '1px solid #EADCC9',
                borderRadius: '8px',
                padding: '12px 14px',
                flexShrink: 0
              }}
            >
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: '#7B5233',
                  marginBottom: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <span>
                  Thông tin chung phiếu nhập kho
                  <ChannelBadge channel={formData.created_channel} imageCount={(formData.images || []).length} />
                </span>
                {formData.confirmed_by && (
                  <span style={{ fontSize: '0.73rem', fontWeight: 600, color: '#059669', textTransform: 'none' }}>
                    Xác nhận nhập: {formData.confirmed_by}{formData.confirmed_at ? ` (${formData.confirmed_at})` : ''}
                  </span>
                )}
              </div>

              {/* Hàng 1 (4 cột): Mã phiếu, Kho nhập, Ngày nhập kho, Trạng thái phiếu */}
              <div className="wh-receipt-info-grid-4">
                <div className="wh-receipt-field-group">
                  <label className="wh-receipt-field-label">Mã phiếu *</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    required
                    value={formData.voucher_no}
                    onChange={(e) => {
                      setFormError('');
                      setFormData({ ...formData, voucher_no: e.target.value });
                    }}
                    className="wh-receipt-input"
                    style={{ backgroundColor: isReadOnly ? '#F9FAFB' : '#FFFFFF' }}
                  />
                </div>

                <div className="wh-receipt-field-group">
                  <label className="wh-receipt-field-label">Kho nhập *</label>
                  <select
                    disabled={isWarehouseDisabled}
                    value={formData.warehouse_name || ''}
                    onChange={(e) => handleWarehouseChange(e.target.value)}
                    className="wh-receipt-input"
                    style={{
                      backgroundColor: isWarehouseDisabled ? '#F9FAFB' : '#FFFFFF',
                      fontWeight: formData.warehouse_name ? '600' : 'normal',
                      color: formData.warehouse_name ? '#1F2937' : '#9CA3AF'
                    }}
                    title={
                      isWarehouseDisabled && isEditMode
                        ? 'Phiếu ở trạng thái Đã nhập kho/Đã hủy không được đổi kho'
                        : 'Chọn kho nhập từ 6 kho hệ thống'
                    }
                  >
                    <option value="">-- Chọn kho nhập --</option>
                    {activeWarehouses.map((wh) => (
                      <option key={wh} value={wh}>
                        {wh}
                      </option>
                    ))}
                  </select>
                  {isEditMode && isWarehouseDisabled && (
                    <span style={{ fontSize: '0.68rem', color: '#D97706', display: 'block', marginTop: '2px', whiteSpace: 'nowrap' }}>
                      Đã khóa kho theo trạng thái phiếu
                    </span>
                  )}
                </div>

                <div className="wh-receipt-field-group">
                  <label className="wh-receipt-field-label">Ngày nhập kho *</label>
                  <input
                    type="date"
                    disabled={isReadOnly}
                    required
                    value={formData.receipt_date}
                    onChange={(e) => {
                      setFormError('');
                      setFormData({ ...formData, receipt_date: e.target.value });
                    }}
                    className="wh-receipt-input"
                    style={{ backgroundColor: isReadOnly ? '#F9FAFB' : '#FFFFFF' }}
                  />
                </div>

                <div className="wh-receipt-field-group">
                  <label className="wh-receipt-field-label">Trạng thái phiếu</label>
                  <select
                    disabled={isReadOnly}
                    value={formData.status}
                    onChange={(e) => {
                      setFormError('');
                      setFormData({ ...formData, status: e.target.value });
                    }}
                    className="wh-receipt-input"
                    style={{ backgroundColor: isReadOnly ? '#F9FAFB' : '#FFFFFF' }}
                  >
                    {Object.values(RECEIPT_STATUSES).map((st) => (
                      <option key={st.key} value={st.key}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hàng 2 (4 cột): Người giao hàng, Từ bộ phận, Đối tác / Khách hàng, Loại phiếu */}
              <div className="wh-receipt-info-grid-4">
                <div className="wh-receipt-field-group">
                  <label className="wh-receipt-field-label">Người giao hàng</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="Họ tên người giao..."
                    value={formData.deliverer_name || ''}
                    onChange={(e) => {
                      setFormError('');
                      setFormData({ ...formData, deliverer_name: e.target.value });
                    }}
                    className="wh-receipt-input"
                    style={{ backgroundColor: isReadOnly ? '#F9FAFB' : '#FFFFFF' }}
                  />
                </div>

                <div className="wh-receipt-field-group">
                  <label className="wh-receipt-field-label">Từ bộ phận</label>
                  <select
                    disabled={isReadOnly}
                    value={formData.department_name || ''}
                    onChange={(e) => {
                      setFormError('');
                      setFormData({ ...formData, department_name: e.target.value });
                    }}
                    className="wh-receipt-input"
                    style={{
                      backgroundColor: isReadOnly ? '#F9FAFB' : '#FFFFFF',
                      color: formData.department_name ? '#1F2937' : '#9CA3AF'
                    }}
                  >
                    <option value="">-- Chọn bộ phận --</option>
                    {activeDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="wh-receipt-field-group">
                  <label className="wh-receipt-field-label">Đối tác / Khách hàng</label>
                  <input
                    type="text"
                    list="receipt-customers-list"
                    disabled={isReadOnly}
                    placeholder="Mã hoặc tên đối tác..."
                    value={formData.customer_name || formData.customer_code || ''}
                    onChange={(e) => {
                      setFormError('');
                      const val = e.target.value;
                      const matched = dbCustomers.find((c) => c.name === val);
                      setFormData({
                        ...formData,
                        customer_name: val,
                        customer_code: matched?.code || (val ? (formData.customer_code || '') : '')
                      });
                    }}
                    className="wh-receipt-input"
                    style={{ backgroundColor: isReadOnly ? '#F9FAFB' : '#FFFFFF' }}
                  />
                </div>

                <div className="wh-receipt-field-group">
                  <label className="wh-receipt-field-label">Loại phiếu</label>
                  <select
                    disabled={isReadOnly}
                    value={formData.receipt_type || ''}
                    onChange={(e) => {
                      setFormError('');
                      setFormData({ ...formData, receipt_type: e.target.value });
                    }}
                    className="wh-receipt-input"
                    style={{
                      backgroundColor: isReadOnly ? '#F9FAFB' : '#FFFFFF',
                      color: formData.receipt_type ? '#1F2937' : '#9CA3AF'
                    }}
                  >
                    <option value="">-- Chọn loại phiếu --</option>
                    {activeReceiptTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hàng 3 (CTGS 1 cột, Nội dung nhập kho 3 cột): Cân đối tuyệt đối với 4 cột trên */}
              <div className="wh-receipt-info-grid-row3">
                <div className="wh-receipt-field-group col-ctgs">
                  <label className="wh-receipt-field-label">Chứng từ gốc (CTGS)</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="CTGS-..."
                    value={formData.ctgs || ''}
                    onChange={(e) => {
                      setFormError('');
                      setFormData({ ...formData, ctgs: e.target.value });
                    }}
                    className="wh-receipt-input"
                    style={{ backgroundColor: isReadOnly ? '#F9FAFB' : '#FFFFFF' }}
                  />
                </div>

                <div className="wh-receipt-field-group col-content">
                  <label className="wh-receipt-field-label">Nội dung nhập kho</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="Mô tả tóm tắt nội dung lô hàng nhập..."
                    value={formData.content || ''}
                    onChange={(e) => {
                      setFormError('');
                      setFormData({ ...formData, content: e.target.value });
                    }}
                    className="wh-receipt-input"
                    style={{ backgroundColor: isReadOnly ? '#F9FAFB' : '#FFFFFF' }}
                  />
                </div>
              </div>
            </div>

            {/* ── KHU VỰC DANH SÁCH NHẬP KHO (Chiếm toàn bộ không gian còn lại, cuộn độc lập) ── */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 auto',
                minHeight: 0,
                overflow: 'hidden'
              }}
            >
              {/* Tiêu đề ngắn gọn duy nhất: Danh sách nhập kho (Không số dòng, Không nhãn Kho đích) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                  marginBottom: '6px'
                }}
              >
                <span style={{ fontSize: '0.86rem', fontWeight: '700', color: '#4A2E1B' }}>
                  Danh sách nhập kho
                </span>

                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={handleAddItem}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '5px',
                      backgroundColor: '#FAF6F0',
                      border: '1px solid #7B5233',
                      color: '#7B5233',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Plus size={14} />
                    <span>Thêm dòng hàng</span>
                  </button>
                )}
              </div>

              {/* Khung cuộn của bảng: Cuộn dọc độc lập khi có nhiều dòng, cuộn ngang khi màn hình nhỏ */}
              <div
                className="wh-table-scroll"
                style={{
                  flex: '1 1 auto',
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'auto',
                  border: '1px solid #EADCC9',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <table className="wh-receipt-table">
                  <thead
                    style={{
                      position: 'sticky',
                      top: 0,
                      backgroundColor: '#FAF6F0',
                      zIndex: 5,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                    }}
                  >
                    <tr>
                      <th style={{ textAlign: 'center', width: '45px', minWidth: '45px' }}>
                        STT
                      </th>
                      <th style={{ textAlign: 'left', width: '140px', minWidth: '130px' }}>
                        Mã mặt hàng
                      </th>
                      <th style={{ textAlign: 'center', width: '60px', minWidth: '55px' }}>
                        Hình ảnh
                      </th>
                      <th style={{ textAlign: 'left', minWidth: '260px' }}>
                        Tên mặt hàng
                      </th>
                      <th style={{ textAlign: 'right', width: '85px', minWidth: '80px' }}>
                        Số tồn
                      </th>
                      <th style={{ textAlign: 'center', width: '75px', minWidth: '70px' }}>
                        ĐVT1
                      </th>
                      <th style={{ textAlign: 'right', width: '105px', minWidth: '95px' }}>
                        SL nhập 1
                      </th>
                      <th style={{ textAlign: 'center', width: '75px', minWidth: '70px' }}>
                        ĐVT2
                      </th>
                      <th style={{ textAlign: 'right', width: '105px', minWidth: '95px' }}>
                        SL nhập 2
                      </th>
                      <th style={{ textAlign: 'center', width: '110px', minWidth: '100px' }}>
                        LSX
                      </th>
                      <th style={{ textAlign: 'left', width: '110px', minWidth: '100px' }}>
                        Phân kiện
                      </th>
                      <th style={{ textAlign: 'left', minWidth: '160px' }}>
                        Ghi chú
                      </th>
                      {!isReadOnly && (
                        <th style={{ textAlign: 'center', width: '38px', minWidth: '38px' }}></th>
                      )}
                    </tr>
                  </thead>
                  <tbody style={{ verticalAlign: 'top' }}>
                    {formData.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isReadOnly ? 12 : 13}
                          style={{ textAlign: 'center', padding: '36px 16px', color: '#9CA3AF' }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <Package size={30} color="#D1D5DB" />
                            <span style={{ fontSize: '0.84rem', color: '#6B7280', fontWeight: '500' }}>
                              Chưa có dòng mặt hàng nào trong phiếu nhập.
                            </span>
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={handleAddItem}
                                style={{
                                  marginTop: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '5px 12px',
                                  borderRadius: '5px',
                                  backgroundColor: '#FAF6F0',
                                  border: '1px solid #7B5233',
                                  color: '#7B5233',
                                  fontSize: '0.78rem',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                <Plus size={14} />
                                <span>Thêm dòng hàng</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      formData.items.map((it, idx) => (
                        <tr
                          key={it.id || idx}
                          style={{
                            borderBottom: '1px solid #F0E6D8',
                            backgroundColor: idx % 2 === 1 ? '#FAF8F5' : '#FFFFFF',
                            height: '35px'
                          }}
                        >
                          {/* 1. STT */}
                          <td style={{ textAlign: 'center', color: '#8D6E63', fontWeight: '500' }}>
                            {idx + 1}
                          </td>

                          {/* 2. Mã mặt hàng */}
                          <td>
                            {isReadOnly ? (
                              <span style={{ fontWeight: '600', color: '#7B5233' }}>
                                {it.item_code || '—'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                list="inventory-catalog-items"
                                value={it.item_code || ''}
                                placeholder="Mã..."
                                onChange={(e) => handleItemChange(idx, 'item_code', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '3px 6px',
                                  border: '1px solid #D5C7B7',
                                  borderRadius: '4px',
                                  fontSize: '0.78rem'
                                }}
                              />
                            )}
                          </td>

                          {/* 3. Hình ảnh */}
                          <td style={{ textAlign: 'center' }}>
                            {it.image ? (
                              <img
                                src={it.image}
                                alt={it.item_name}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  objectFit: 'cover',
                                  borderRadius: '4px',
                                  border: '1px solid #EADCC9',
                                  display: 'inline-block',
                                  verticalAlign: 'middle'
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '4px',
                                  backgroundColor: '#FAF6F0',
                                  border: '1px solid #EADCC9',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto'
                                }}
                                title="Không có ảnh"
                              >
                                <Package size={13} color="#A88B77" />
                              </div>
                            )}
                          </td>

                          {/* 4. Tên mặt hàng */}
                          <td>
                            {isReadOnly ? (
                              <span title={it.item_name} style={{ color: '#1F2937' }}>
                                {it.item_name || '—'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                value={it.item_name || ''}
                                placeholder="Tên mặt hàng..."
                                onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '3px 6px',
                                  border: '1px solid #D5C7B7',
                                  borderRadius: '4px',
                                  fontSize: '0.78rem'
                                }}
                              />
                            )}
                          </td>

                          {/* 5. Số tồn */}
                          <td style={{ textAlign: 'right', color: '#6B7280', fontWeight: '500' }}>
                            {formatNumber(it.stock_qty || 0)}
                          </td>

                          {/* 6. ĐVT1 */}
                          <td style={{ textAlign: 'center' }}>
                            {isReadOnly ? (
                              <span>{it.unit1 || it.unit || '—'}</span>
                            ) : (
                              <input
                                type="text"
                                value={it.unit1 || it.unit || ''}
                                placeholder="ĐVT1"
                                onChange={(e) => handleItemChange(idx, 'unit1', e.target.value)}
                                style={{
                                  width: '100%',
                                  textAlign: 'center',
                                  padding: '3px 4px',
                                  border: '1px solid #D5C7B7',
                                  borderRadius: '4px',
                                  fontSize: '0.78rem'
                                }}
                              />
                            )}
                          </td>

                          {/* 7. SL nhập 1 */}
                          <td style={{ textAlign: 'right' }}>
                            {isReadOnly ? (
                              <strong style={{ color: '#047857' }}>
                                {formatNumber(it.quantity1 ?? it.quantity ?? 0)}
                              </strong>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={it.quantity1 !== undefined ? it.quantity1 : ''}
                                  placeholder="0"
                                  onKeyDown={(e) => {
                                    if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E') {
                                      e.preventDefault();
                                    }
                                  }}
                                  onChange={(e) => handleItemChange(idx, 'quantity1', e.target.value)}
                                  style={{
                                    width: '100%',
                                    textAlign: 'right',
                                    padding: '3px 6px',
                                    border: isNegativeQty(it.quantity1) ? '1.5px solid #DC2626' : '1px solid #D5C7B7',
                                    backgroundColor: isNegativeQty(it.quantity1) ? '#FEF2F2' : '#FFFFFF',
                                    color: isNegativeQty(it.quantity1) ? '#DC2626' : '#111827',
                                    borderRadius: '4px',
                                    fontSize: '0.78rem',
                                    fontWeight: '600'
                                  }}
                                />
                                {isNegativeQty(it.quantity1) && (
                                  <span
                                    style={{
                                      color: '#DC2626',
                                      fontSize: '0.68rem',
                                      fontWeight: '600',
                                      display: 'block',
                                      marginTop: '2px',
                                      lineHeight: 1.1,
                                      textAlign: 'right',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    Số lượng không được âm
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 8. ĐVT2 */}
                          <td style={{ textAlign: 'center' }}>
                            {isReadOnly ? (
                              <span style={{ color: it.unit2 ? '#374151' : '#9CA3AF' }}>
                                {it.unit2 || '—'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                value={it.unit2 || ''}
                                placeholder="ĐVT2"
                                onChange={(e) => handleItemChange(idx, 'unit2', e.target.value)}
                                style={{
                                  width: '100%',
                                  textAlign: 'center',
                                  padding: '3px 4px',
                                  border: '1px solid #D5C7B7',
                                  borderRadius: '4px',
                                  fontSize: '0.78rem'
                                }}
                              />
                            )}
                          </td>

                          {/* 9. SL nhập 2 */}
                          <td style={{ textAlign: 'right' }}>
                            {isReadOnly ? (
                              <span style={{ color: it.quantity2 ? '#1F2937' : '#9CA3AF' }}>
                                {it.quantity2 ? formatNumber(it.quantity2) : '—'}
                              </span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={it.quantity2 !== undefined ? it.quantity2 : ''}
                                  placeholder="0"
                                  onKeyDown={(e) => {
                                    if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E') {
                                      e.preventDefault();
                                    }
                                  }}
                                  onChange={(e) => handleItemChange(idx, 'quantity2', e.target.value)}
                                  style={{
                                    width: '100%',
                                    textAlign: 'right',
                                    padding: '3px 6px',
                                    border: isNegativeQty(it.quantity2) ? '1.5px solid #DC2626' : '1px solid #D5C7B7',
                                    backgroundColor: isNegativeQty(it.quantity2) ? '#FEF2F2' : '#FFFFFF',
                                    color: isNegativeQty(it.quantity2) ? '#DC2626' : '#111827',
                                    borderRadius: '4px',
                                    fontSize: '0.78rem'
                                  }}
                                />
                                {isNegativeQty(it.quantity2) && (
                                  <span
                                    style={{
                                      color: '#DC2626',
                                      fontSize: '0.68rem',
                                      fontWeight: '600',
                                      display: 'block',
                                      marginTop: '2px',
                                      lineHeight: 1.1,
                                      textAlign: 'right',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    Số lượng không được âm
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 10. LSX */}
                          <td style={{ textAlign: 'center' }}>
                            {isReadOnly ? (
                              <span
                                style={{
                                  backgroundColor: it.lsx ? '#FAF6F0' : 'transparent',
                                  color: it.lsx ? '#7B5233' : '#9CA3AF',
                                  padding: it.lsx ? '2px 6px' : 0,
                                  borderRadius: '4px',
                                  fontSize: '0.74rem',
                                  fontWeight: it.lsx ? '600' : 'normal'
                                }}
                              >
                                {it.lsx || '—'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                value={it.lsx || ''}
                                placeholder="LSX..."
                                onChange={(e) => handleItemChange(idx, 'lsx', e.target.value)}
                                style={{
                                  width: '100%',
                                  textAlign: 'center',
                                  padding: '3px 4px',
                                  border: '1px solid #D5C7B7',
                                  borderRadius: '4px',
                                  fontSize: '0.78rem'
                                }}
                              />
                            )}
                          </td>

                          {/* 11. Phân kiện */}
                          <td>
                            {isReadOnly ? (
                              <span style={{ color: it.package_split ? '#374151' : '#9CA3AF' }}>
                                {it.package_split || '—'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                value={it.package_split || ''}
                                placeholder="Kiện..."
                                onChange={(e) => handleItemChange(idx, 'package_split', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '3px 6px',
                                  border: '1px solid #D5C7B7',
                                  borderRadius: '4px',
                                  fontSize: '0.78rem'
                                }}
                              />
                            )}
                          </td>

                          {/* 12. Ghi chú */}
                          <td>
                            {isReadOnly ? (
                              <span style={{ color: it.notes ? '#4B5563' : '#9CA3AF' }}>
                                {it.notes || '—'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                value={it.notes || ''}
                                placeholder="Ghi chú..."
                                onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '3px 6px',
                                  border: '1px solid #D5C7B7',
                                  borderRadius: '4px',
                                  fontSize: '0.78rem'
                                }}
                              />
                            )}
                          </td>

                          {/* Thao tác xóa dòng */}
                          {!isReadOnly && (
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                title="Xóa dòng này"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#DC2626',
                                  cursor: 'pointer',
                                  padding: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Thanh tổng hợp số lượng cố định phía dưới bảng, căn phải, không cuộn theo các dòng hàng */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '8px',
                  padding: '2px 4px',
                  fontSize: '0.82rem',
                  color: '#4B5563',
                  flexShrink: 0
                }}
              >
                <span>
                  Số lượng hàng: <strong style={{ color: '#2D1A12', fontWeight: 700 }}>{formatNumber(itemCount)}</strong>
                </span>
                <span style={{ color: '#D5C7B7' }}>|</span>
                <span>
                  Tổng số lượng: <strong style={{ color: '#2D1A12', fontWeight: 700 }}>{formatNumber(totalQuantity)}</strong>
                </span>
              </div>
              <MobileImagesGallery images={formData.images} title="Ảnh chứng từ / Kiểm đếm từ Mobile" />
            </div>
          </div>

          {/* 3. Footer Popup - Chỉ hiển thị cho Thêm mới hoặc Chỉnh sửa, ẩn hoàn toàn khi Xem chi tiết */}
          {!isReadOnly && (
            <div className="wh-modal-footer" style={{ flexShrink: 0 }}>
              <button
                type="button"
                className="wh-btn-brown"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#4A2E1B',
                  border: '1px solid #D5C7B7'
                }}
                onClick={onClose}
              >
                <span>Hủy bỏ</span>
              </button>

              <button type="submit" className="wh-btn-primary" disabled={saving}>
                <CheckCircle size={15} />
                <span>{saving ? 'Đang lưu...' : 'Lưu phiếu nhập'}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default GoodsReceiptDetailModal;
