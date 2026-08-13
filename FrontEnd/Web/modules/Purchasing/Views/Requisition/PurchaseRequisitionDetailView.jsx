import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import {
  ChevronLeft, FileUp, FileDown, Share2, Save, Plus, Edit3, MoreHorizontal,
  Search, X, Check, Trash2
} from 'lucide-react';
import { purchasingService } from '@modules/Purchasing/Models/purchasing.service';
import api from '@webShared/Services/api.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import '@styles/components.css';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';

// Helper format ngày đẹp (Chuyển ISO 2026-07-26T15:19:53... thành 26/07/2026)
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '24/07/2026';
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return dateStr;
};

// Helper format số tiền chuẩn có dấu phẩy ($17,523,848)
const formatMoneyDisplay = (val) => {
  if (val === undefined || val === null || val === '') return '$0';
  const strVal = String(val).replace(/[^0-9.-]+/g, '');
  const num = Number(strVal);
  if (isNaN(num)) return '$0';
  return `$${num.toLocaleString()}`;
};

const PurchaseRequisitionDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, startGlobalUpload } = outletContext;
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/purchase-requisitions/:id');

  // Xác định chế độ: 'view' (Xem chi tiết) hoặc 'edit' (Chỉnh sửa)
  const searchParams = new URLSearchParams(location.search);
  const modeParam = searchParams.get('mode');
  const isEditMode = modeParam === 'edit' || id === 'create';
  const [isEditing, setIsEditing] = useState(isEditMode);

  useEffect(() => {
    setIsEditing(modeParam === 'edit' || id === 'create');
  }, [modeParam, id]);

  useEffect(() => {
    if (typeof setCustomTitle === 'function') setCustomTitle(title || 'Quản lý kinh doanh');
    if (typeof setCustomSubtitle === 'function') {
      setCustomSubtitle(subtitle || (isEditing ? 'KD03.1: Chỉnh sửa đơn hàng' : 'KD03.1: Chi tiết đơn hàng'));
    }
    if (typeof setCustomScreenCode === 'function') setCustomScreenCode(screenCode || 'KD03.1');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, isEditing, title, subtitle, screenCode]);

  const getLoggedInUser = () => {
    try {
      const userStr = localStorage.getItem('smartflow_user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        return userObj.full_name || userObj.name || userObj.username || userObj.display_name || 'Bùi Thị Tuyền';
      }
    } catch (e) {
      console.error(e);
    }
    return 'Bùi Thị Tuyền';
  };

  const loggedInUserName = useMemo(() => getLoggedInUser(), []);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    creator: loggedInUserName,
    created_at: '24/07/2026',
    po_code: id === 'create' ? `DH.${Date.now().toString().slice(-6)}` : 'GIAYXEO.DH02.06.26',
    status: 'Đang xử lý',
    total_amount: 0,
    reviewer: 'Nguyễn B',
    reviewed_at: '24/07/2026',
    type: 'Đơn bán hàng',
    material_type: 'Gỗ & Phụ kiện',
    priority: 'Bình thường',
    approver: 'Nguyễn Hòa',
    approved_at: '24/07/2026',
    supplier: id === 'create' ? '' : 'Khách hàng A'
  });

  // Danh sách thành phần mặt hàng trong đơn (100% từ CSDL)
  const [items, setItems] = useState([]);

  // State cho Modal Chọn BOM Sản phẩm mẫu
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [bomProducts, setBomProducts] = useState([]);
  const [bomLoading, setBomLoading] = useState(false);
  const [bomSearch, setBomSearch] = useState('');

  useEffect(() => {
    if (id && id !== 'create' && id !== 'id') {
      fetchDetail();
    }
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await purchasingService.getRequisitionById(id).catch(() => null);
      if (res) {
        setFormData(prev => ({
          ...prev,
          ...res,
          creator: res.creator || prev.creator,
          created_at: res.created_at ? (res.created_at.includes('T') ? res.created_at.split('T')[0] : res.created_at) : prev.created_at,
          po_code: res.po_code || res.order_code || prev.po_code,
          status: res.status || res.order_status_text || prev.status,
          total_amount: res.total_amount || prev.total_amount,
          reviewer: res.reviewer || prev.reviewer,
          reviewed_at: res.reviewed_at || prev.reviewed_at,
          type: res.order_type || res.type || prev.type,
          material_type: res.material_type || prev.material_type,
          priority: res.priority || prev.priority,
          approver: res.approver || prev.approver,
          approved_at: res.approved_at || prev.approved_at,
          supplier: res.supplier_name || res.supplier || res.partner || prev.supplier
        }));

        if (res.items && Array.isArray(res.items)) {
          setItems(res.items.map((it, idx) => ({
            id: it.id || idx + 1,
            code: it.item_code || it.code || `SP.${idx + 1}`,
            name: it.item_name || it.name || 'Sản phẩm',
            quantity: it.quantity || 1,
            unit: it.unit || 'bộ',
            price: it.unit_price || it.price || 0,
            total: it.subtotal_vnd || it.total || ((it.quantity || 1) * (it.unit_price || it.price || 0))
          })));
        } else {
          setItems([]);
        }
      }
    } catch (err) {
      console.error('Lỗi tải chi tiết đơn hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  // Lấy dữ liệu BOM từ CSDL theo từ khóa tìm kiếm
  const fetchBomProducts = async (queryTerm = '') => {
    setBomLoading(true);
    try {
      const endpoint = queryTerm.trim()
        ? `/master-products/?skip=0&limit=100&q=${encodeURIComponent(queryTerm.trim())}`
        : `/master-products/?skip=0&limit=100`;
      const res = await api.get(endpoint).catch(() => null);
      if (res && (res.items || Array.isArray(res))) {
        setBomProducts(res.items || (Array.isArray(res) ? res : []));
      } else {
        setBomProducts([]);
      }
    } catch (err) {
      console.error('Lỗi tải BOM sản phẩm từ CSDL:', err);
    } finally {
      setBomLoading(false);
    }
  };

  // Mở Modal Chọn BOM Sản phẩm mẫu (Tự động chuyển chế độ chỉnh sửa)
  const handleOpenBomModal = () => {
    setIsEditing(true);
    setIsBomModalOpen(true);
    setBomSearch('');
    fetchBomProducts('');
  };

  // Tự động truy vấn CSDL theo từ khóa tìm kiếm khi người dùng nhập thông tin
  useEffect(() => {
    if (isBomModalOpen) {
      const timer = setTimeout(() => {
        fetchBomProducts(bomSearch);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [bomSearch, isBomModalOpen]);

  // Chọn 1 sản phẩm từ BOM cho vào danh sách đơn hàng
  const handleSelectBomProduct = (product) => {
    const itemPrice = product.price && Number(product.price) > 0 ? Number(product.price) : 100;
    const newItem = {
      id: Date.now(),
      code: product.sku || product.product_code || `BOM.${product.id}`,
      name: product.name || product.product_name || 'Sản phẩm BOM',
      quantity: 1,
      unit: product.unit || 'bộ',
      price: itemPrice,
      total: itemPrice
    };
    setItems(prev => [...prev, newItem]);
    if (toast) toast('success', `Đã chọn sản phẩm BOM: ${newItem.name}`);
    setIsBomModalOpen(false);
  };

  // Tính tổng giá trị đơn hàng dựa trên items
  const computedTotalAmount = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.total || (it.quantity * it.price) || 0), 0);
  }, [items]);

  // 1. Hàm Lưu Thông Tin (Save)
  const handleSave = async () => {
    try {
      if (toast) toast('info', 'Đang lưu thông tin đơn hàng...');
      const payload = {
        po_code: formData.po_code || `DH.${Date.now().toString().slice(-6)}`,
        creator: formData.creator,
        order_type: formData.type || 'Đơn bán hàng',
        supplier_name: formData.supplier || 'Khách hàng A',
        total_amount: computedTotalAmount,
        status: formData.status || 'Đang xử lý',
        priority: formData.priority || 'Bình thường',
        material_type: formData.material_type || 'Gỗ & Phụ kiện',
        reviewer: formData.reviewer,
        approver: formData.approver,
        items: items
      };
      if (id && id !== 'create' && id !== 'id') {
        await purchasingService.updateRequisition(id, payload);
      } else {
        await purchasingService.createRequisition(payload);
      }
      if (toast) toast('success', 'Lưu thông tin đơn hàng thành công!');
      navigate(`/admin/purchase-requisitions`);
    } catch (err) {
      console.error('Lỗi khi lưu đơn hàng:', err);
      const errMsg = err?.response?.data?.detail || err?.message || 'Lỗi khi lưu thông tin đơn hàng!';
      if (toast) toast('error', errMsg);
    }
  };

  // 2. Hàm Nhập Danh Sách (Import Excel)
  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (startGlobalUpload) {
        await startGlobalUpload(file, `/purchase-requisitions/${id || '1'}/import-excel`, fetchDetail);
      } else {
        await purchasingService.importRequisitionsExcel(file).catch(() => null);
        if (toast) toast('success', 'Nhập danh sách thành phần Excel thành công!');
      }
    } catch (error) {
      if (toast) toast('error', 'Lỗi nhập danh sách Excel!');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 3. Hàm Xuất Đơn Hàng (Export)
  const handleExportOrder = () => {
    purchasingService.exportRequisitionsExcel({ id });
    if (toast) toast('success', 'Đã khởi tạo xuất đơn hàng Excel!');
  };

  // 4. Hàm Chuyển Thông Tin (Transfer / Submit)
  const handleTransferInfo = () => {
    setFormData(prev => ({ ...prev, status: 'Chờ duyệt' }));
    if (toast) toast('success', 'Đã chuyển thông tin đơn hàng thành công!');
  };

  return (
    <div className="purchase-requisition-detail-container detail-view-container" style={{
      width: '100%', maxWidth: '100%',
      padding: '16px 24px 60px 24px', backgroundColor: '#FAF6F0',
      minHeight: '100%', display: 'flex', flexDirection: 'column', gap: '16px',
      boxSizing: 'border-box'
    }}>
      
      {/* Hidden File Input for Excel Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleImportExcel}
      />

      {/* ── NÚT ĐIỀU HƯỚNG & HÀNH ĐỘNG TOP ZONE ── */}
      <div style={{
        width: '100%', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', boxSizing: 'border-box'
      }}>
        {/* Bên Trái: Nút Quay Lại */}
        <button
          type="button"
          onClick={() => navigate('/admin/purchase-requisitions')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: '#fff', border: '1px solid #CBD5E1',
            padding: '8px 16px', borderRadius: '8px',
            color: '#475569', fontWeight: '700', fontSize: '0.88rem',
            cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <ChevronLeft size={16} />
          <span>Quay lại danh sách</span>
        </button>

        {/* Bên Phải: 4 Nút Thao Tác Chức Năng Nổi Bật */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: '#475569', color: '#fff', border: 'none',
              padding: '8px 16px', borderRadius: '8px',
              fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            <FileDown size={16} />
            <span>Nhập danh sách</span>
          </button>

          <button
            type="button"
            onClick={handleExportOrder}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: '#334155', color: '#fff', border: 'none',
              padding: '8px 16px', borderRadius: '8px',
              fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            <FileUp size={16} />
            <span>Xuất đơn hàng</span>
          </button>

          <button
            type="button"
            onClick={handleTransferInfo}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: '#16A34A', color: '#fff', border: 'none',
              padding: '8px 16px', borderRadius: '8px',
              fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            <Share2 size={16} />
            <span>Chuyển thông tin</span>
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={handleSave}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                backgroundColor: '#7B5233', color: '#fff', border: 'none',
                padding: '8px 18px', borderRadius: '8px',
                fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(123, 82, 51, 0.2)'
              }}
            >
              <Save size={16} />
              <span>Lưu thông tin</span>
            </button>
          )}
        </div>
      </div>

      {/* ── KHU VỰC 1: THÔNG TIN CHUNG (CARD 1 TRÊN NỀN TRẮNG) ── */}
      <div style={{
        width: '100%', backgroundColor: '#fff',
        border: '1px solid #EADCC9', borderRadius: '12px',
        padding: '20px 24px', boxShadow: '0 2px 8px rgba(123, 82, 51, 0.04)',
        display: 'flex', flexDirection: 'column', gap: '16px',
        boxSizing: 'border-box', position: 'relative'
      }}>
        {/* Header Thông Tin Chung */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#7B5233', fontWeight: '800' }}>
            Thông tin chung
          </h3>
          <span style={{
            fontSize: '0.75rem', fontWeight: '700', padding: '4px 10px', borderRadius: '20px',
            backgroundColor: isEditing ? '#FEF3C7' : '#E2E8F0',
            color: isEditing ? '#92400E' : '#475569'
          }}>
            {isEditing ? 'Chế độ Chỉnh sửa' : 'Chế độ Xem'}
          </span>
        </div>

        {/* Lưới 12 Ô Nhập Thông Tin Chuẩn Giao Diện Sản Xuất */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px 18px', width: '100%'
        }}>
          {/* Ô Xám: Người khởi tạo (Cố định hệ thống) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Người khởi tạo</label>
            <input
              type="text"
              value={formData.creator || ''}
              readOnly disabled
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #E2E8F0', backgroundColor: '#F1F5F9',
                fontWeight: '600', color: '#64748B', cursor: 'not-allowed', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Ô Xám: Ngày khởi tạo (Cố định hệ thống) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Ngày khởi tạo</label>
            <input
              type="text"
              value={formatDateDisplay(formData.created_at)}
              readOnly disabled
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #E2E8F0', backgroundColor: '#F1F5F9',
                fontWeight: '600', color: '#64748B', cursor: 'not-allowed', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Ô Trắng: Mã đơn hàng */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Mã đơn hàng</label>
            <input
              type="text"
              value={formData.po_code || ''}
              onChange={(e) => setFormData({ ...formData, po_code: e.target.value })}
              readOnly={!isEditing}
              disabled={!isEditing}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: isEditing ? '#fff' : '#F8FAFC',
                fontWeight: '800', color: '#2D1A12',
                cursor: isEditing ? 'text' : 'not-allowed',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Ô Xám: Trạng thái đơn hàng (Cố định hệ thống) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Trạng thái đơn hàng</label>
            <input
              type="text"
              value={formData.status || 'Đang xử lý'}
              readOnly disabled
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #E2E8F0', backgroundColor: '#F1F5F9',
                fontWeight: '700', color: '#16A34A', cursor: 'not-allowed', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Ô Xám: Giá trị đơn hàng (Tự động tính toán) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Giá trị đơn hàng</label>
            <input
              type="text"
              value={formatMoneyDisplay(computedTotalAmount || formData.total_amount)}
              readOnly disabled
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #E2E8F0', backgroundColor: '#F1F5F9',
                fontWeight: '800', color: '#2D1A12', cursor: 'not-allowed', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Ô Xám: Người xem xét (Cố định hệ thống) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Người xem xét</label>
            <input
              type="text"
              value={formData.reviewer || ''}
              readOnly disabled
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #E2E8F0', backgroundColor: '#F1F5F9',
                fontWeight: '600', color: '#64748B', cursor: 'not-allowed', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Ô Xám: Ngày xem xét (Cố định hệ thống) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Ngày xem xét</label>
            <input
              type="text"
              value={formatDateDisplay(formData.reviewed_at)}
              readOnly disabled
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #E2E8F0', backgroundColor: '#F1F5F9',
                fontWeight: '600', color: '#64748B', cursor: 'not-allowed', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Ô Trắng Dropdown: Loại (Đơn bán hàng / Đơn mua hàng) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Loại *</label>
            <select
              value={formData.type || 'Đơn bán hàng'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              disabled={!isEditing}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: isEditing ? '#fff' : '#F8FAFC',
                fontWeight: '600', color: '#334155',
                cursor: isEditing ? 'pointer' : 'not-allowed',
                boxSizing: 'border-box'
              }}
            >
              <option value="Đơn mua hàng">Đơn mua hàng</option>
              <option value="Đơn bán hàng">Đơn bán hàng</option>
            </select>
          </div>

          {/* Ô Trắng: Loại vật tư */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Loại vật tư *</label>
            <select
              value={formData.material_type || 'Gỗ & Phụ kiện'}
              onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
              disabled={!isEditing}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: isEditing ? '#fff' : '#F8FAFC',
                fontWeight: '600', color: '#334155',
                cursor: isEditing ? 'pointer' : 'not-allowed',
                boxSizing: 'border-box'
              }}
            >
              <option value="Gỗ & Phụ kiện">Gỗ & Phụ kiện</option>
              <option value="Nhôm kính">Nhôm kính</option>
              <option value="Bao bì & Giấy">Bao bì & Giấy</option>
              <option value="Kim loại">Kim loại</option>
            </select>
          </div>

          {/* Ô Trắng: Mức độ ưu tiên */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Mức độ ưu tiên *</label>
            <select
              value={formData.priority || 'Bình thường'}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              disabled={!isEditing}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: isEditing ? '#fff' : '#F8FAFC',
                fontWeight: '600', color: '#334155',
                cursor: isEditing ? 'pointer' : 'not-allowed',
                boxSizing: 'border-box'
              }}
            >
              <option value="Bình thường">Bình thường</option>
              <option value="Cao">Cao</option>
              <option value="Khẩn cấp">Khẩn cấp</option>
            </select>
          </div>

          {/* Ô Xám: Người duyệt (Cố định hệ thống) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Người duyệt</label>
            <input
              type="text"
              value={formData.approver || ''}
              readOnly disabled
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #E2E8F0', backgroundColor: '#F1F5F9',
                fontWeight: '600', color: '#64748B', cursor: 'not-allowed', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Ô Xám: Ngày duyệt (Cố định hệ thống) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Ngày duyệt</label>
            <input
              type="text"
              value={formatDateDisplay(formData.approved_at)}
              readOnly disabled
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #E2E8F0', backgroundColor: '#F1F5F9',
                fontWeight: '600', color: '#64748B', cursor: 'not-allowed', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Ô Trắng: Đối tác / Nhà cung cấp / Khách hàng */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>
              {formData.type === 'Đơn bán hàng' ? 'Khách hàng (Đối tác) *' : 'Nhà cung cấp (Đối tác) *'}
            </label>
            <input
              type="text"
              value={formData.supplier || ''}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              readOnly={!isEditing}
              disabled={!isEditing}
              placeholder="Nhập tên đối tác / nhà cung cấp / khách hàng..."
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: isEditing ? '#fff' : '#F8FAFC',
                fontWeight: '600', color: '#1E293B',
                cursor: isEditing ? 'text' : 'not-allowed',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </div>

      {/* ── KHU VỰC 2: DANH SÁCH THÀNH PHẦN TRONG ĐƠN HÀNG ── */}
      <div style={{
        width: '100%', backgroundColor: '#fff',
        border: '1px solid #EADCC9', borderRadius: '12px',
        padding: '20px 24px', boxShadow: '0 2px 8px rgba(123, 82, 51, 0.04)',
        display: 'flex', flexDirection: 'column', gap: '16px',
        boxSizing: 'border-box'
      }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: '#7B5233', fontWeight: '800' }}>
          Danh sách thành phần trong đơn hàng
        </h3>

        <div className="table-responsive" style={{ width: '100%', border: '1px solid #EADCC9', borderRadius: '8px', overflow: 'hidden' }}>
          <table className="data-table" style={{ width: '100%', margin: 0 }}>
            <thead>
              <tr style={{ backgroundColor: '#FAF6F0' }}>
                <th style={{ textAlign: 'center', width: '50px', color: '#7B5233', backgroundColor: '#FAF6F0' }}>STT</th>
                <th style={{ color: '#7B5233', backgroundColor: '#FAF6F0' }}>MÃ MẶT HÀNG</th>
                <th style={{ color: '#7B5233', backgroundColor: '#FAF6F0' }}>TÊN MẶT HÀNG</th>
                <th style={{ textAlign: 'right', color: '#7B5233', backgroundColor: '#FAF6F0' }}>SỐ LƯỢNG</th>
                <th style={{ color: '#7B5233', backgroundColor: '#FAF6F0' }}>ĐƠN VỊ</th>
                <th style={{ textAlign: 'right', color: '#7B5233', backgroundColor: '#FAF6F0' }}>ĐƠN GIÁ ($)</th>
                <th style={{ textAlign: 'right', color: '#7B5233', backgroundColor: '#FAF6F0' }}>THÀNH TIỀN ($)</th>
                {isEditing && <th style={{ textAlign: 'center', width: '80px', color: '#7B5233', backgroundColor: '#FAF6F0' }}>THAO TÁC</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const priceVal = item.price || 0;
                const qtyVal = item.quantity || 1;
                const totalVal = item.total || (qtyVal * priceVal);
                
                return (
                  <tr key={item.id || idx}>
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#475569' }}>{idx + 1}</td>
                    <td style={{ fontWeight: '800', color: '#2D1A12' }}>{item.code || '---'}</td>
                    <td style={{ fontWeight: '600', color: '#2D1A12' }}>{item.name || '---'}</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#2D1A12' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          value={item.quantity || 1}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value) || 1);
                            const newItems = [...items];
                            newItems[idx].quantity = val;
                            newItems[idx].total = val * (newItems[idx].price || 0);
                            setItems(newItems);
                          }}
                          style={{ width: '80px', padding: '4px 8px', textAlign: 'right', borderRadius: '4px', border: '1px solid #CBD5E1', fontWeight: '700' }}
                        />
                      ) : qtyVal.toLocaleString()}
                    </td>
                    <td style={{ color: '#475569' }}>{item.unit || 'Bộ'}</td>
                    <td style={{ textAlign: 'right', color: '#475569' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          value={item.price || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            const newItems = [...items];
                            newItems[idx].price = val;
                            newItems[idx].total = (newItems[idx].quantity || 1) * val;
                            setItems(newItems);
                          }}
                          style={{ width: '90px', padding: '4px 8px', textAlign: 'right', borderRadius: '4px', border: '1px solid #CBD5E1', fontWeight: '700' }}
                        />
                      ) : `$${priceVal.toLocaleString()}`}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#2D1A12' }}>${totalVal.toLocaleString()}</td>
                    
                    {/* Thao tác xóa mặt hàng */}
                    {isEditing && (
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = items.filter((_, i) => i !== idx);
                            setItems(newItems);
                            if (toast) toast('info', 'Đã xóa mặt hàng khỏi đơn');
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: '4px' }}
                          title="Xóa khỏi đơn hàng"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={isEditing ? 8 : 7} style={{ padding: '2.5rem', textAlign: 'center', color: '#94A3B8', fontWeight: '600' }}>
                    {isEditing
                      ? <>Chưa có thành phần nào trong đơn hàng. Vui lòng bấm <b>+ Thêm mới</b> để chọn sản phẩm BOM.</>
                      : 'Chưa có thành phần nào trong đơn hàng.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Nút Thêm Mới Bật Modal Chọn BOM */}
        {isEditing && (
          <div>
            <button
              type="button"
              onClick={handleOpenBomModal}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                backgroundColor: '#7B5233', color: '#fff', border: 'none',
                padding: '8px 18px', borderRadius: '8px',
                fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(123, 82, 51, 0.2)'
              }}
            >
              <Plus size={16} />
              <span>Thêm mới (Chọn BOM)</span>
            </button>
          </div>
        )}
      </div>

      {/* ── MODAL CHỌN BOM SẢN PHẨM MẪU ── */}
      {isBomModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', width: '100%', maxWidth: '800px',
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '16px 24px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ margin: 0, color: '#7B5233', fontSize: '1.1rem', fontWeight: 800 }}>
                  Chọn Sản Phẩm Từ Danh Mục BOM
                </h3>
                <p style={{ margin: '2px 0 0 0', color: '#64748B', fontSize: '0.8rem' }}>
                  Chọn sản phẩm mẫu (BOM) để thêm vào danh sách thành phần đơn hàng
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBomModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Thanh Tìm Kiếm */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #F1F5F9', backgroundColor: '#fff' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo Mã SKU hoặc Tên sản phẩm BOM mẫu..."
                  value={bomSearch}
                  onChange={(e) => setBomSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 38px', borderRadius: '8px',
                    border: '1px solid #CBD5E1', fontSize: '0.9rem', outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Bảng Danh Sách BOM */}
            <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
              {bomLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B', fontWeight: '600' }}>
                  Đang tải danh sách sản phẩm BOM...
                </div>
              ) : bomProducts.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8', fontWeight: '600' }}>
                  Không tìm thấy sản phẩm BOM nào phù hợp với từ khóa.
                </div>
              ) : (
                <div className="table-responsive" style={{ border: '1px solid #CBD5E1', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="data-table" style={{ width: '100%', margin: 0 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#FAF6F0' }}>
                        <th style={{ textAlign: 'center', width: '50px', color: '#7B5233', backgroundColor: '#FAF6F0' }}>STT</th>
                        <th style={{ color: '#7B5233', backgroundColor: '#FAF6F0' }}>MÃ SKU</th>
                        <th style={{ color: '#7B5233', backgroundColor: '#FAF6F0' }}>TÊN SẢN PHẨM BOM</th>
                        <th style={{ color: '#7B5233', backgroundColor: '#FAF6F0' }}>ĐƠN VỊ</th>
                        <th style={{ textAlign: 'right', color: '#7B5233', backgroundColor: '#FAF6F0' }}>ĐƠN GIÁ MẪU ($)</th>
                        <th style={{ textAlign: 'center', width: '90px', color: '#7B5233', backgroundColor: '#FAF6F0' }}>THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bomProducts.map((p, idx) => (
                        <tr key={p.id || idx}>
                          <td style={{ textAlign: 'center', fontWeight: '600', color: '#64748B' }}>{idx + 1}</td>
                          <td style={{ fontWeight: '800', color: '#2D1A12' }}>{p.sku || p.product_code || `BOM.${p.id}`}</td>
                          <td style={{ fontWeight: '600', color: '#1E293B' }}>{p.name || p.product_name}</td>
                          <td style={{ color: '#64748B' }}>{p.unit || 'Bộ'}</td>
                          <td style={{ textAlign: 'right', fontWeight: '700', color: '#2D1A12' }}>
                            ${(p.price || 0).toLocaleString()}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleSelectBomProduct(p)}
                              style={{
                                backgroundColor: '#7B5233', color: '#fff', border: 'none',
                                padding: '5px 14px', borderRadius: '6px', fontSize: '0.8rem',
                                fontWeight: '700', cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(123, 82, 51, 0.2)'
                              }}
                            >
                              Chọn
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div style={{
              padding: '12px 24px', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0',
              display: 'flex', justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={() => setIsBomModalOpen(false)}
                style={{
                  padding: '8px 18px', borderRadius: '8px', border: '1px solid #CBD5E1',
                  backgroundColor: '#fff', color: '#475569', fontWeight: '700', cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PurchaseRequisitionDetailView;
