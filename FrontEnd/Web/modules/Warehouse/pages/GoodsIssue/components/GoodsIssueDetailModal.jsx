// GoodsIssueDetailModal.jsx - Modal Xem chi tiết / Chỉnh sửa / Tạo mới Phiếu Xuất Kho
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, CheckCircle, Package, AlertCircle } from 'lucide-react';
import {
  WAREHOUSE_OPTIONS,
  ISSUE_TYPES,
  ISSUE_STATUSES,
  DEPARTMENT_OPTIONS,
  formatNumber
} from '../../../types/goodsIssue.types';
import warehouseInventoryService from '../../../services/warehouseInventory.service';
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
 * - Thêm mới: Không tự điền dữ liệu giả (kho xuất, bộ phận, đối tác, loại phiếu, mặt hàng).
 * - Trạng thái khởi tạo: Chờ xuất kho (PENDING).
 */
const getCleanFormData = (isCreate = false) => ({
  voucher_no: isCreate
    ? `PXK-${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`
    : '',
  warehouse_name: '', // Chưa chọn
  issue_date: new Date().toISOString().split('T')[0], // Ngày hiện tại
  deliverer_name: '', // Trống
  customer_code: '', // Trống
  customer_name: '', // Trống
  department_name: '', // Chưa chọn
  content: '', // Trống
  issue_type: '', // Chưa chọn
  status: 'PENDING', // Trạng thái khởi tạo mặc định: Chờ xuất kho
  ctgs: '', // Trống
  created_by: getLoggedUsername(),
  items: [] // Danh sách mặt hàng khởi tạo trống hoàn toàn
});

export const GoodsIssueDetailModal = ({
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
    issueTypes: dbIssueTypes,
    customers: dbCustomers,
  } = useWarehouseMeta();
  const [formData, setFormData] = useState(() => getCleanFormData(isCreateMode));
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [inventoryCatalog, setInventoryCatalog] = useState([]);

  const activeWarehouses = warehouseNames.length > 0 ? warehouseNames : WAREHOUSE_OPTIONS;
  const activeDepartments = departmentNames.length > 0 ? departmentNames : DEPARTMENT_OPTIONS;
  const activeIssueTypes = dbIssueTypes.length > 0 ? dbIssueTypes : ISSUE_TYPES;

  // Tải danh mục mặt hàng thực tế từ kho hệ thống để hỗ trợ tra cứu chính xác số tồn và ĐVT
  useEffect(() => {
    let isMounted = true;
    warehouseInventoryService
      .getRawItems()
      .then((items) => {
        if (isMounted && Array.isArray(items)) {
          setInventoryCatalog(items);
        }
      })
      .catch((err) => console.warn('Lỗi tải danh mục kho xuất:', err));
    return () => {
      isMounted = false;
    };
  }, []);

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
        issue_type: initialData.issue_type || '',
        status: initialData.status || 'PENDING',
        deliverer_name: initialData.deliverer_name || '',
        customer_code: initialData.customer_code || '',
        customer_name: initialData.customer_name || '',
        ctgs: initialData.ctgs || '',
        content: initialData.content || '',
        items: Array.isArray(initialData.items)
          ? initialData.items.map((it) => ({
              ...it,
              unit: it.unit || 'Cái',
              quantity: it.quantity !== undefined ? it.quantity : '',
              stock_qty: it.stock_qty !== undefined ? it.stock_qty : 0,
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

  // Quy tắc nghiệp vụ cho phép thay đổi kho xuất:
  // - Khi Thêm mới: Được chọn tự do trong 6 kho
  // - Khi Xem chi tiết: Khóa (chỉ hiển thị)
  // - Khi Chỉnh sửa: Cho phép thay đổi nếu trạng thái chưa hoàn tất xuất kho hoặc hủy
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
          item_name: '',
          stock_qty: 0,
          unit: '',
          quantity: '',
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
      const codeTrimmed = String(value || '').trim().toLowerCase();
      // Ưu tiên tìm trong kho đã chọn trước
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
        item.unit = match.unit_main || item.unit;
        item.stock_qty = match.closing_main !== undefined ? match.closing_main : 0;
      } else {
        item.stock_qty = 0;
      }
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

  // Kiểm tra tính hợp lệ trước khi lưu phiếu xuất
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // 1. Kiểm tra trường bắt buộc
    if (!formData.voucher_no?.trim()) {
      setFormError('Vui lòng nhập Mã phiếu!');
      return;
    }

    if (!formData.warehouse_name?.trim()) {
      setFormError('Vui lòng chọn Kho xuất kho trước khi lưu!');
      return;
    }

    if (!formData.issue_date) {
      setFormError('Vui lòng chọn Ngày xuất kho!');
      return;
    }

    // 2. Kiểm tra danh sách mặt hàng: Phải có ít nhất 1 dòng
    if (!formData.items || formData.items.length === 0) {
      setFormError('Phiếu xuất kho phải có ít nhất một dòng mặt hàng! Vui lòng nhấn "Thêm dòng hàng".');
      return;
    }

    // 3. Kiểm tra chi tiết từng dòng hàng
    for (let i = 0; i < formData.items.length; i++) {
      const it = formData.items[i];
      const rowNum = i + 1;

      // Tuyệt đối không cho phép số lượng âm
      if (isNegativeQty(it.quantity)) {
        setFormError(`Dòng số ${rowNum}: Số lượng xuất không được âm. Vui lòng kiểm tra lại các ô cảnh báo màu đỏ!`);
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

      const q = Number(it.quantity);
      if (
        it.quantity === '' ||
        it.quantity === null ||
        it.quantity === undefined ||
        isNaN(q) ||
        q <= 0
      ) {
        setFormError(`Dòng số ${rowNum}: Số lượng xuất phải lớn hơn 0!`);
        return;
      }

      if (!it.unit?.trim()) {
        setFormError(`Dòng số ${rowNum}: Vui lòng nhập Đơn vị tính (ĐVT)!`);
        return;
      }

      // Kiểm tra số lượng tồn khả dụng (Chỉ cảnh báo xác nhận khi duyệt COMPLETED)
      const currentStock = Number(it.stock_qty || 0);
      if (currentStock > 0 && q > currentStock && formData.status === 'COMPLETED') {
        const confirmOver = window.confirm(
          `Cảnh báo dòng ${rowNum} (${it.item_code}): Số lượng xuất (${q} ${it.unit}) lớn hơn số tồn khả dụng (${currentStock} ${it.unit}). Bạn có muốn tiếp tục xuất?`
        );
        if (!confirmOver) {
          setFormError(`Dòng số ${rowNum}: Số lượng xuất vượt tồn khả dụng (${currentStock} ${it.unit})`);
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
          (sum, it) => sum + (Number(it.quantity) > 0 ? Number(it.quantity) : 0),
          0
        )
      };
      await onSave?.(payloadToSave);
      onClose();
    } catch (err) {
      setFormError(err.message || 'Lỗi khi lưu phiếu xuất kho.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Tính số lượng hàng và tổng số lượng xuất thực tế
  const itemCount = formData.items.length;
  const totalQuantity = formData.items.reduce(
    (sum, it) => sum + (Number(it.quantity) > 0 ? Number(it.quantity) : 0),
    0
  );

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
                ? 'Thêm mới phiếu xuất kho'
                : isEditMode
                ? `Chỉnh sửa phiếu xuất kho: ${formData.voucher_no}`
                : `Chi tiết phiếu xuất kho: ${formData.voucher_no}`}
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

            {/* Datalist gợi ý mã hàng & đối tác từ Database */}
            <datalist id="inventory-issue-catalog-items">
              {inventoryCatalog
                .filter((inv) => !formData.warehouse_name || inv.warehouse_name === formData.warehouse_name)
                .map((inv) => (
                  <option key={inv.id || `${inv.warehouse_code}-${inv.item_code}`} value={inv.item_code}>
                    {inv.item_name} (Tồn: {formatNumber(inv.closing_main)} {inv.unit_main})
                  </option>
                ))}
            </datalist>
            <datalist id="issue-customers-list">
              {dbCustomers.map((c, idx) => (
                <option key={`${c.id || c.code || idx}_${c.name}`} value={c.name}>
                  {c.code ? `[${c.code}] ${c.name}` : c.name}
                </option>
              ))}
            </datalist>

            {/* ── PHẦN THÔNG TIN CHUNG (Cố định, bố cục 4 cột cân đối) ── */}
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
                  Thông tin chung phiếu xuất kho
                  <ChannelBadge channel={formData.created_channel} imageCount={(formData.images || []).length} />
                </span>
                {formData.confirmed_by && (
                  <span style={{ fontSize: '0.73rem', fontWeight: 600, color: '#059669', textTransform: 'none' }}>
                    Xác nhận nhận: {formData.receiver_name || formData.confirmed_by}{formData.confirmed_at ? ` (${formData.confirmed_at})` : ''}
                  </span>
                )}
              </div>

              {/* Hàng 1 (4 cột): Mã phiếu, Kho xuất, Ngày xuất kho, Trạng thái phiếu */}
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
                  <label className="wh-receipt-field-label">Kho xuất *</label>
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
                        ? 'Phiếu ở trạng thái Đã xuất kho/Đã hủy không được đổi kho'
                        : 'Chọn kho xuất từ 6 kho hệ thống'
                    }
                  >
                    <option value="">-- Chọn kho xuất --</option>
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
                  <label className="wh-receipt-field-label">Ngày xuất kho *</label>
                  <input
                    type="date"
                    disabled={isReadOnly}
                    required
                    value={formData.issue_date}
                    onChange={(e) => {
                      setFormError('');
                      setFormData({ ...formData, issue_date: e.target.value });
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
                    {Object.values(ISSUE_STATUSES).map((st) => (
                      <option key={st.key} value={st.key}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hàng 2 (4 cột): Người bàn giao, Từ bộ phận, Khách hàng / Đơn vị nhận, Loại phiếu */}
              <div className="wh-receipt-info-grid-4">
                <div className="wh-receipt-field-group">
                  <label className="wh-receipt-field-label">Người bàn giao</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="Họ tên người bàn giao..."
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
                  <label className="wh-receipt-field-label">Bộ phận yêu cầu</label>
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
                  <label className="wh-receipt-field-label">Khách hàng / Người nhận</label>
                  <input
                    type="text"
                    list="issue-customers-list"
                    disabled={isReadOnly}
                    placeholder="Mã hoặc tên đối tác / người nhận..."
                    value={formData.receiver_name || formData.customer_name || formData.customer_code || ''}
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
                    value={formData.issue_type || ''}
                    onChange={(e) => {
                      setFormError('');
                      setFormData({ ...formData, issue_type: e.target.value });
                    }}
                    className="wh-receipt-input"
                    style={{
                      backgroundColor: isReadOnly ? '#F9FAFB' : '#FFFFFF',
                      color: formData.issue_type ? '#1F2937' : '#9CA3AF'
                    }}
                  >
                    <option value="">-- Chọn loại phiếu --</option>
                    {activeIssueTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hàng 3 (CTGS 1 cột, Nội dung xuất kho 3 cột): Cân đối tuyệt đối với 4 cột trên */}
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
                  <label className="wh-receipt-field-label">Nội dung xuất kho</label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    placeholder="Mô tả tóm tắt nội dung lô hàng xuất..."
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

            {/* ── KHU VỰC DANH SÁCH XUẤT KHO (Chiếm toàn bộ không gian còn lại, cuộn độc lập) ── */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 auto',
                minHeight: 0,
                overflow: 'hidden'
              }}
            >
              {/* Tiêu đề ngắn gọn duy nhất: Danh sách xuất kho */}
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
                  Danh sách xuất kho
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
                      <th style={{ textAlign: 'left', minWidth: '260px' }}>
                        Tên mặt hàng
                      </th>
                      <th style={{ textAlign: 'right', width: '85px', minWidth: '80px' }}>
                        Số tồn
                      </th>
                      <th style={{ textAlign: 'center', width: '75px', minWidth: '70px' }}>
                        ĐVT
                      </th>
                      <th style={{ textAlign: 'right', width: '110px', minWidth: '100px' }}>
                        SL xuất
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
                          colSpan={isReadOnly ? 7 : 8}
                          style={{ textAlign: 'center', padding: '36px 16px', color: '#9CA3AF' }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <Package size={30} color="#D1D5DB" />
                            <span style={{ fontSize: '0.84rem', color: '#6B7280', fontWeight: '500' }}>
                              Chưa có dòng mặt hàng nào trong phiếu xuất.
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
                                list="inventory-issue-catalog-items"
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

                          {/* 3. Tên mặt hàng */}
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

                          {/* 4. Số tồn */}
                          <td style={{ textAlign: 'right', color: '#6B7280', fontWeight: '500' }}>
                            {formatNumber(it.stock_qty || 0)}
                          </td>

                          {/* 5. ĐVT */}
                          <td style={{ textAlign: 'center' }}>
                            {isReadOnly ? (
                              <span>{it.unit || '—'}</span>
                            ) : (
                              <input
                                type="text"
                                value={it.unit || ''}
                                placeholder="ĐVT"
                                onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
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

                          {/* 6. SL xuất */}
                          <td style={{ textAlign: 'right' }}>
                            {isReadOnly ? (
                              <strong style={{ color: '#B45309' }}>
                                {formatNumber(it.quantity || 0)}
                              </strong>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={it.quantity !== undefined ? it.quantity : ''}
                                  placeholder="0"
                                  onKeyDown={(e) => {
                                    if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E') {
                                      e.preventDefault();
                                    }
                                  }}
                                  onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                  style={{
                                    width: '100%',
                                    textAlign: 'right',
                                    padding: '3px 6px',
                                    border: isNegativeQty(it.quantity) ? '1.5px solid #DC2626' : '1px solid #D5C7B7',
                                    backgroundColor: isNegativeQty(it.quantity) ? '#FEF2F2' : '#FFFFFF',
                                    color: isNegativeQty(it.quantity) ? '#DC2626' : '#111827',
                                    borderRadius: '4px',
                                    fontSize: '0.78rem',
                                    fontWeight: '600'
                                  }}
                                />
                                {isNegativeQty(it.quantity) && (
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

                          {/* 7. Ghi chú */}
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
                  Tổng số lượng xuất: <strong style={{ color: '#2D1A12', fontWeight: 700 }}>{formatNumber(totalQuantity)}</strong>
                </span>
              </div>
              <MobileImagesGallery images={formData.images} title="Ảnh bàn giao hàng hóa từ Mobile" />
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
                <span>{saving ? 'Đang lưu...' : 'Lưu phiếu xuất kho'}</span>
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

export default GoodsIssueDetailModal;
