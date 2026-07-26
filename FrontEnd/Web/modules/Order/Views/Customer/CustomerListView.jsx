import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Plus, Search, Edit2, Trash2, Phone, Mail, 
  MapPin, Building, Globe, CheckCircle, AlertCircle, X, Save
} from 'lucide-react';
import { customerService } from '@modules/Order/Models/customer.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import '@styles/components.css';

export default function CustomerListView() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [actionMenuId, setActionMenuId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    tax_code: '',
    country: 'Việt Nam',
    notes: '',
    is_active: 1
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const skip = (currentPage - 1) * pageSize;
      const res = await customerService.getAll(skip, pageSize, searchTerm);
      if (res && res.items) {
        setCustomers(res.items);
        setTotal(res.total);
      } else if (Array.isArray(res)) {
        setCustomers(res);
        setTotal(res.length);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách khách hàng:', err);
      toast('error', 'Lỗi khi tải danh sách khách hàng!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, pageSize, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (typeof e.target.closest === 'function') {
        if (!e.target.closest('.action-menu') && !e.target.closest('.action-btn')) {
          setActionMenuId(null);
        }
      } else {
        setActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenAddModal = () => {
    setSelectedCustomer(null);
    setFormData({
      code: 'KH-' + Math.floor(1000 + Math.random() * 9000),
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      tax_code: '',
      country: 'Việt Nam',
      notes: '',
      is_active: 1
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cust) => {
    setSelectedCustomer(cust);
    setFormData({
      code: cust.code || '',
      name: cust.name || '',
      contact_person: cust.contact_person || '',
      phone: cust.phone || '',
      email: cust.email || '',
      address: cust.address || '',
      tax_code: cust.tax_code || '',
      country: cust.country || 'Việt Nam',
      notes: cust.notes || '',
      is_active: cust.is_active ?? 1
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      toast('error', 'Vui lòng nhập đầy đủ Mã và Tên khách hàng!');
      return;
    }

    try {
      if (selectedCustomer) {
        await customerService.update(selectedCustomer.id, formData);
        toast('success', 'Cập nhật thông tin khách hàng thành công!');
      } else {
        await customerService.create(formData);
        toast('success', 'Tạo mới khách hàng thành công!');
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err) {
      console.error(err);
      toast('error', err.response?.data?.detail || 'Lưu thất bại!');
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    try {
      await customerService.delete(deletingCustomer.id);
      toast('success', `Đã xóa khách hàng ${deletingCustomer.name} thành công!`);
      setIsDeleteModalOpen(false);
      setDeletingCustomer(null);
      fetchCustomers();
    } catch (err) {
      console.error(err);
      toast('error', err.response?.data?.detail || 'Không thể xóa khách hàng này!');
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: '20px', backgroundColor: '#F9FBFB', minHeight: '85vh' }}>
      
      {/* Thống kê nhanh */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#FAF6F0', color: '#7B5233', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 700 }}>TỔNG KHÁCH HÀNG</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1F2937' }}>{total}</div>
          </div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 700 }}>ĐANG HOẠT ĐỘNG</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981' }}>
              {customers.filter(c => c.is_active === 1).length}
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 700 }}>THỊ TRƯỜNG / QUỐC GIA</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3B82F6' }}>
              {new Set(customers.map(c => c.country).filter(Boolean)).size || 1}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <PageToolbar
        searchValue={searchTerm}
        onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
        searchPlaceholder="Tìm theo mã, tên KH, SĐT, MST..."
        onCreate={handleOpenAddModal}
        createLabel="Thêm Khách hàng"
        hasWritePermission={true}
      />

      {/* Main Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#7B5233', color: '#FFFFFF' }}>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, width: '60px' }}>STT</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mã KH</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Tên Khách hàng / Đối tác</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Người liên hệ</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Số điện thoại</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Quốc gia</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Trạng thái</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, width: '100px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#7B5233', fontWeight: 'bold' }}>
                    Đang tải dữ liệu khách hàng...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                    Chưa có dữ liệu khách hàng nào.
                  </td>
                </tr>
              ) : (
                customers.map((cust, idx) => (
                  <tr key={cust.id} style={{ borderBottom: '1px solid #F3F4F6', position: 'relative', zIndex: actionMenuId === cust.id ? 30 : 1 }}>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4B5563', fontWeight: 600 }}>
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#7B5233', fontWeight: 'bold' }}>
                      {cust.code}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 700 }}>
                      {cust.name}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4B5563' }}>
                      {cust.contact_person || '---'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4B5563' }}>
                      {cust.phone || '---'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4B5563' }}>
                      {cust.country || 'Việt Nam'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                      <span style={{
                        backgroundColor: cust.is_active === 1 ? '#DCFCE7' : '#F3F4F6',
                        color: cust.is_active === 1 ? '#15803D' : '#6B7280',
                        padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.7rem'
                      }}>
                        {cust.is_active === 1 ? 'Đang hoạt động' : 'Tạm ngưng'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', position: 'relative', zIndex: actionMenuId === cust.id ? 40 : 1 }}>
                      <button
                        className="action-btn"
                        onClick={() => setActionMenuId(actionMenuId === cust.id ? null : cust.id)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                      </button>
                      {actionMenuId === cust.id && (
                        <div className="action-menu">
                          <button className="action-menu-item" onClick={() => { setActionMenuId(null); handleOpenEditModal(cust); }}>Chỉnh sửa</button>
                          <button className="action-menu-item danger" onClick={() => { setActionMenuId(null); setDeletingCustomer(cust); setIsDeleteModalOpen(true); }}>Xóa khách hàng</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 600 }}>
            Hiển thị <b>{customers.length}</b> trên <b>{total}</b> Khách hàng
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                Trước
              </button>
              <span style={{ padding: '6px 12px', fontSize: '0.85rem', fontWeight: 'bold', color: '#7B5233' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Sau
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', width: '520px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #E5E7EB', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAF8F6' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#2D1A12' }}>
                {selectedCustomer ? 'Chỉnh sửa Khách hàng' : 'Thêm Khách hàng mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÃ KHÁCH HÀNG *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ví dụ: KH001, PO_USA..."
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>TÊN KHÁCH HÀNG / CÔNG TY *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nhập tên đối tác/khách hàng..."
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>NGƯỜI LIÊN HỆ</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="Họ và tên..."
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>SỐ ĐIỆN THOẠI</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="SĐT..."
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>EMAIL</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@company.com"
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>MÃ SỐ THUẾ</label>
                  <input
                    type="text"
                    value={formData.tax_code}
                    onChange={e => setFormData({ ...formData, tax_code: e.target.value })}
                    placeholder="MST..."
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>ĐỊA CHỈ</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Địa chỉ trụ sở / nhà máy..."
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>QUỐC GIA / THỊ TRƯỜNG</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={e => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Ví dụ: Việt Nam, USA, Japan..."
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', borderTop: '1px solid #F3F4F6', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', color: '#4B5563', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#7B5233', color: '#FFFFFF', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                >
                  <Save size={14} />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deletingCustomer && (
        <BeautifulConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          title="Xóa thông tin khách hàng"
          message={`Bạn có chắc chắn muốn xóa khách hàng "${deletingCustomer.name}"? Cảnh báo: Việc xóa bỏ có thể ảnh hưởng đến lịch sử tra cứu đơn hàng liên quan.`}
          confirmText="Đồng ý xóa"
          cancelText="Hủy bỏ"
          type="danger"
        />
      )}
    </div>
  );
}
