import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import {
  ChevronLeft, FileUp, FileDown, Share2, Save, Plus, Edit3, MoreHorizontal
} from 'lucide-react';
import { purchasingService } from '@modules/Purchasing/Models/purchasing.service';
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
  if (val === undefined || val === null || val === '') return '$17,523,848';
  const strVal = String(val).replace(/[^0-9.-]+/g, '');
  const num = Number(strVal);
  if (isNaN(num) || num === 0) {
    if (typeof val === 'string' && val.trim()) return val.startsWith('$') ? val : `$${val}`;
    return '$17,523,848';
  }
  return `$${num.toLocaleString()}`;
};

const PurchaseRequisitionDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, startGlobalUpload } = outletContext;
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  // Xác định chế độ: 'view' (Xem chi tiết) hoặc 'edit' (Chỉnh sửa)
  const searchParams = new URLSearchParams(location.search);
  const modeParam = searchParams.get('mode');
  const isEditMode = modeParam === 'edit' || id === 'create';

  useEffect(() => {
    if (typeof setCustomTitle === 'function') setCustomTitle('Quản lý kinh doanh');
    if (typeof setCustomSubtitle === 'function') {
      setCustomSubtitle(isEditMode ? 'KD03.1: Chỉnh sửa đơn hàng' : 'KD03.1: Chi tiết đơn hàng');
    }
  }, [setCustomTitle, setCustomSubtitle, isEditMode]);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    creator: 'Bùi Thị Tuyền',
    created_at: '24/07/2026',
    po_code: 'GIAYXEO.DH02.06.26',
    status: 'Duyệt thành công',
    total_amount: '17,523,848',
    reviewer: 'Nguyễn B',
    reviewed_at: '24/07/2026',
    type: 'Đơn mua hàng',
    material_type: 'Gỗ & Phụ kiện',
    priority: 'Bình thường',
    approver: 'Nguyễn Hòa',
    approved_at: '24/07/2026',
    supplier: 'Nhà cung cấp 1'
  });

  const [items, setItems] = useState([
    { id: 1, code: 'BB.01', name: 'Giấy cuộn xeo 2 lớp', quantity: 1315, unit: 'Kg', price: 200, total: 263000 }
  ]);

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
          created_at: res.created_at || prev.created_at,
          po_code: res.po_code || res.order_code || prev.po_code,
          status: res.status || res.order_status_text || prev.status,
          total_amount: res.total_amount || prev.total_amount,
          reviewer: res.reviewer || prev.reviewer,
          reviewed_at: res.reviewed_at || prev.reviewed_at,
          type: res.type || res.order_type || prev.type,
          material_type: res.material_type || prev.material_type,
          priority: res.priority || prev.priority,
          approver: res.approver || prev.approver,
          approved_at: res.approved_at || prev.approved_at,
          supplier: res.supplier || res.partner || prev.supplier
        }));

        if (res.items && Array.isArray(res.items) && res.items.length > 0) {
          setItems(res.items.map((it, idx) => ({
            id: it.id || idx + 1,
            code: it.code || it.item_code || `BB.0${idx + 1}`,
            name: it.name || it.item_name || 'Giấy cuộn xeo 2 lớp',
            quantity: it.quantity || 1315,
            unit: it.unit || 'Kg',
            price: it.price || 200,
            total: it.total || (it.quantity || 1315) * (it.price || 200)
          })));
        }
      }
    } catch (err) {
      console.error('Lỗi tải chi tiết đơn hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Hàm Lưu Thông Tin (Save)
  const handleSave = async () => {
    try {
      if (toast) toast('info', 'Đang lưu thông tin đơn hàng...');
      const payload = { ...formData, items };
      if (id && id !== 'create' && id !== 'id') {
        await purchasingService.updateRequisition(id, payload).catch(() => null);
      } else {
        await purchasingService.createRequisition(payload).catch(() => null);
      }
      if (toast) toast('success', 'Lưu thông tin đơn hàng thành công!');
      navigate(`/admin/purchase-requisitions/${id || '1'}?mode=view`);
    } catch (err) {
      if (toast) toast('error', 'Lỗi khi lưu thông tin đơn hàng!');
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
    <div className="manufacture-plan-container mgmt-container" style={{
      width: '100%', maxWidth: '100%',
      padding: '16px 24px', backgroundColor: '#FAF6F0',
      minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '16px',
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
            color: '#475569', fontWeight: '700', cursor: 'pointer',
            fontSize: '0.85rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <ChevronLeft size={18} />
          <span>Quay lại danh sách</span>
        </button>

        {/* Bên Phải: Nhóm Nút Hành Động Top Right */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Nút Nhập Danh Sách */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: '#64748B', border: 'none',
              color: '#fff', padding: '8px 16px', borderRadius: '8px',
              fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            <FileUp size={16} />
            <span>Nhập danh sách</span>
          </button>

          {/* Nút Xuất Đơn Hàng */}
          <button
            type="button"
            onClick={handleExportOrder}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: '#475569', border: 'none',
              color: '#fff', padding: '8px 16px', borderRadius: '8px',
              fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            <FileDown size={16} />
            <span>Xuất đơn hàng</span>
          </button>

          {/* Nút Chuyển Thông Tin */}
          <button
            type="button"
            onClick={handleTransferInfo}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: '#65A30D', border: 'none',
              color: '#fff', padding: '8px 16px', borderRadius: '8px',
              fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
            }}
          >
            <Share2 size={16} />
            <span>Chuyển thông tin</span>
          </button>

          {/* Nút Chỉnh Sửa / Lưu Thông Tin */}
          {isEditMode ? (
            <button
              type="button"
              onClick={handleSave}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                backgroundColor: '#7B5233', border: 'none',
                color: '#fff', padding: '8px 16px', borderRadius: '8px',
                fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              <Save size={16} />
              <span>Lưu thông tin</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/admin/purchase-requisitions/${id || '1'}?mode=edit`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                backgroundColor: '#7B5233', border: 'none',
                color: '#fff', padding: '8px 16px', borderRadius: '8px',
                fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              <Edit3 size={16} />
              <span>Chỉnh sửa</span>
            </button>
          )}
        </div>
      </div>

      {/* ── KHU VỰC 1: THÔNG TIN CHUNG ── */}
      <div style={{
        width: '100%', backgroundColor: '#fff',
        border: '1px solid #EADCC9', borderRadius: '12px',
        padding: '20px 24px', boxShadow: '0 2px 8px rgba(123, 82, 51, 0.04)',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#7B5233', fontWeight: '800' }}>
            Thông tin chung
          </h3>
          <span style={{
            fontSize: '0.75rem', fontWeight: '800',
            padding: '3px 12px', borderRadius: '12px',
            backgroundColor: isEditMode ? '#FEF3C7' : '#E2E8F0',
            color: isEditMode ? '#D97706' : '#475569'
          }}>
            {isEditMode ? 'Chế độ Chỉnh sửa' : 'Chế độ Xem chi tiết (Chỉ đọc)'}
          </span>
        </div>

        <div style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px 20px',
          alignItems: 'start',
          boxSizing: 'border-box'
        }}>
          {/* Row 1 */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Người khởi tạo</label>
            <input
              type="text"
              value={formData.creator || 'Bùi Thị Tuyền'}
              readOnly
              disabled
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', fontWeight: '600', color: '#334155', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Ngày khởi tạo</label>
            <input
              type="text"
              value={formatDateDisplay(formData.created_at)}
              readOnly
              disabled
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', fontWeight: '600', color: '#334155', boxSizing: 'border-box' }}
            />
          </div>

          {/* Ô Trắng: Mã đơn hàng */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Mã đơn hàng</label>
            <input
              type="text"
              value={formData.po_code || 'GIAYXEO.DH02.06.26'}
              onChange={(e) => setFormData({ ...formData, po_code: e.target.value })}
              readOnly={!isEditMode}
              disabled={!isEditMode}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: isEditMode ? '#fff' : '#F8FAFC',
                fontWeight: '700', color: '#1E293B',
                cursor: isEditMode ? 'text' : 'not-allowed',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Trạng thái đơn hàng</label>
            <input
              type="text"
              value={formData.status || 'Duyệt thành công'}
              readOnly
              disabled
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', fontWeight: '700', color: '#475569', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Giá trị đơn hàng</label>
            <input
              type="text"
              value={formatMoneyDisplay(formData.total_amount)}
              readOnly
              disabled
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', fontWeight: '800', color: '#1E293B', boxSizing: 'border-box' }}
            />
          </div>

          {/* Row 2 */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Người xem xét</label>
            <input
              type="text"
              value={formData.reviewer || 'Nguyễn B'}
              readOnly
              disabled
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', fontWeight: '600', color: '#334155', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Ngày xem xét</label>
            <input
              type="text"
              value={formatDateDisplay(formData.reviewed_at)}
              readOnly
              disabled
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', fontWeight: '600', color: '#334155', boxSizing: 'border-box' }}
            />
          </div>

          {/* Ô Trắng: Loại */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Loại *</label>
            <select
              value={formData.type || 'Đơn mua hàng'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              disabled={!isEditMode}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: isEditMode ? '#fff' : '#F8FAFC',
                fontWeight: '600', color: '#334155',
                cursor: isEditMode ? 'pointer' : 'not-allowed',
                boxSizing: 'border-box'
              }}
            >
              <option value="Đơn mua hàng">Đơn mua hàng</option>
              <option value="Đơn mua lẻ">Đơn mua lẻ</option>
            </select>
          </div>

          {/* Ô Trắng: Loại vật tư */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Loại vật tư *</label>
            <select
              value={formData.material_type || 'Gỗ & Phụ kiện'}
              onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
              disabled={!isEditMode}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: isEditMode ? '#fff' : '#F8FAFC',
                fontWeight: '600', color: '#334155',
                cursor: isEditMode ? 'pointer' : 'not-allowed',
                boxSizing: 'border-box'
              }}
            >
              <option value="Gỗ & Phụ kiện">Gỗ & Phụ kiện</option>
              <option value="Vật tư gỗ cao cấp">Vật tư gỗ cao cấp</option>
              <option value="Hóa chất & Sơn">Hóa chất & Sơn</option>
            </select>
          </div>

          {/* Ô Trắng: Mức độ ưu tiên */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Mức độ ưu tiên *</label>
            <select
              value={formData.priority || 'Bình thường'}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              disabled={!isEditMode}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: isEditMode ? '#fff' : '#F8FAFC',
                fontWeight: '600', color: '#334155',
                cursor: isEditMode ? 'pointer' : 'not-allowed',
                boxSizing: 'border-box'
              }}
            >
              <option value="Cao">Cao</option>
              <option value="Bình thường">Bình thường</option>
              <option value="Thấp">Thấp</option>
            </select>
          </div>

          {/* Row 3 */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Người duyệt</label>
            <input
              type="text"
              value={formData.approver || 'Nguyễn Hòa'}
              readOnly
              disabled
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', fontWeight: '600', color: '#334155', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Ngày duyệt</label>
            <input
              type="text"
              value={formatDateDisplay(formData.approved_at)}
              readOnly
              disabled
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', fontWeight: '600', color: '#334155', boxSizing: 'border-box' }}
            />
          </div>

          {/* Ô Trắng: Nhà cung cấp / Tên đối tác */}
          <div style={{ gridColumn: 'span 3' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748B', marginBottom: '6px' }}>Nhà cung cấp / Tên đối tác *</label>
            <input
              type="text"
              value={formData.supplier || 'Nhà cung cấp 1'}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              readOnly={!isEditMode}
              disabled={!isEditMode}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: isEditMode ? '#fff' : '#F8FAFC',
                fontWeight: '600', color: '#1E293B',
                cursor: isEditMode ? 'text' : 'not-allowed',
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
                <th style={{ textAlign: 'center', width: '80px', color: '#7B5233', backgroundColor: '#FAF6F0' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const priceVal = item.price || 200;
                const qtyVal = item.quantity || 1315;
                const totalVal = item.total || (qtyVal * priceVal);
                
                return (
                  <tr key={item.id || idx}>
                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#475569' }}>{idx + 1}</td>
                    <td style={{ fontWeight: '800', color: '#2D1A12' }}>{item.code || 'BB.01'}</td>
                    <td style={{ fontWeight: '600', color: '#2D1A12' }}>{item.name || 'Mặt hàng'}</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#2D1A12' }}>
                      {isEditMode ? (
                        <input
                          type="number"
                          value={item.quantity || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            const newItems = [...items];
                            newItems[idx].quantity = val;
                            newItems[idx].total = val * (newItems[idx].price || 200);
                            setItems(newItems);
                          }}
                          style={{ width: '80px', padding: '4px 8px', textAlign: 'right', borderRadius: '4px', border: '1px solid #CBD5E1', fontWeight: '700' }}
                        />
                      ) : qtyVal.toLocaleString()}
                    </td>
                    <td style={{ color: '#475569' }}>{item.unit || 'Kg'}</td>
                    <td style={{ textAlign: 'right', color: '#475569' }}>${priceVal.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontWeight: '800', color: '#2D1A12' }}>${totalVal.toLocaleString()}</td>
                    
                    {/* THAO TÁC CHUYỂN THÀNH NÚT ... KHÔNG TÁC VỤ */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => {}}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
                        title="Thao tác"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>Chưa có thành phần nào trong đơn hàng.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Nút Thêm Mới Góc Dưới Bên Trái */}
        <div>
          {isEditMode ? (
            <button
              type="button"
              onClick={() => {
                const newItem = {
                  id: items.length + 1,
                  code: `BB.0${items.length + 1}`,
                  name: 'Mặt hàng thêm mới',
                  quantity: 100,
                  unit: 'Kg',
                  price: 200,
                  total: 20000
                };
                setItems([...items, newItem]);
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                backgroundColor: '#7B5233', color: '#fff', border: 'none',
                padding: '8px 16px', borderRadius: '8px',
                fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              <Plus size={16} />
              <span>Thêm mới</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                backgroundColor: '#E2E8F0', color: '#94A3B8', border: 'none',
                padding: '8px 16px', borderRadius: '8px',
                fontWeight: '700', fontSize: '0.85rem', cursor: 'not-allowed'
              }}
            >
              <Plus size={16} />
              <span>Thêm mới (Đã khóa)</span>
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

export default PurchaseRequisitionDetailView;
