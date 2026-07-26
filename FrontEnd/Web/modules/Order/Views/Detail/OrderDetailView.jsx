import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Calendar, User, FileText, Clock, CheckCircle2, 
  Package, Edit2, Trash2, Layers, AlertCircle, ShoppingBag
} from 'lucide-react';
import { orderService } from '@modules/Order/Models/order.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import '@styles/components.css';

const formatDate = (dateStr) => {
  if (!dateStr) return 'Chưa xác định';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Chưa xác định';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return 'Chưa xác định'; }
};

const getStatusBadge = (statusNum, deadline) => {
  const isOverdue = deadline && new Date(deadline) < new Date() && statusNum !== 3;
  if (isOverdue) return { text: 'Quá hạn', bg: '#fef2f2', color: '#ef4444' };
  switch (statusNum) {
    case 3: return { text: 'Hoàn thành', bg: '#ecfdf5', color: '#10b981' };
    case 2: return { text: 'Đang sản xuất', bg: '#eff6ff', color: '#3b82f6' };
    default: return { text: 'Chờ sản xuất', bg: '#fffbeb', color: '#f59e0b' };
  }
};

export default function OrderDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const res = await orderService.getById(id);
      setOrder(res);
    } catch (err) {
      console.error('Lỗi tải chi tiết đơn hàng:', err);
      toast('error', 'Không thể tải thông tin đơn hàng!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchOrderDetail();
  }, [id]);

  const handleDelete = async () => {
    try {
      await orderService.delete(id);
      toast('success', 'Đã xóa đơn hàng thành công!');
      navigate('/admin/orders');
    } catch (err) {
      console.error('Lỗi khi xóa đơn hàng:', err);
      toast('error', 'Không thể xóa đơn hàng!');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#7B5233', fontWeight: 'bold' }}>
        Đang tải thông tin chi tiết đơn hàng...
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#9CA3AF' }}>
        Không tìm thấy thông tin đơn hàng.
        <div style={{ marginTop: '16px' }}>
          <button 
            onClick={() => navigate('/admin/orders')}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #7B5233', backgroundColor: '#FAF6F0', color: '#7B5233', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(order.order_status, order.delivery_date || order.deadline);
  const products = order.products || order.items || [];

  return (
    <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif', backgroundColor: '#F9FBFB', minHeight: '85vh' }}>
      
      {/* Top Bar Navigation & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/admin/orders')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: 'none', cursor: 'pointer', color: '#7B5233', fontWeight: 'bold', fontSize: '0.9rem' }}
        >
          <ChevronLeft size={20} />
          <span>Quay lại danh sách đơn hàng</span>
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate(`/admin/orders/edit/${order.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #7B5233', backgroundColor: '#FAF6F0', color: '#7B5233', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <Edit2 size={16} />
            <span>Chỉnh sửa</span>
          </button>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #EF4444', backgroundColor: '#FEF2F2', color: '#EF4444', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <Trash2 size={16} />
            <span>Xóa đơn hàng</span>
          </button>
        </div>
      </div>

      {/* Main Order Card Header */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #F3F4F6', paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1F2937' }}>{order.order_code}</h2>
              <span style={{ backgroundColor: statusBadge.bg, color: statusBadge.color, padding: '4px 12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                {statusBadge.text}
              </span>
              {order.is_priority === 1 && (
                <span style={{ backgroundColor: '#FEF2F2', color: '#EF4444', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.75rem' }}>
                  Ưu tiên cao
                </span>
              )}
            </div>
            <div style={{ marginTop: '8px', color: '#4B5563', fontSize: '0.9rem', display: 'flex', gap: '20px' }}>
              <span>Khách hàng: <strong style={{ color: '#7B5233' }}>{order.customer || '---'}</strong></span>
              {order.partner_po && <span>PO Đối tác: <strong>{order.partner_po}</strong></span>}
              {order.production_code && <span>Lệnh SX: <strong>{order.production_code}</strong></span>}
            </div>
          </div>
        </div>

        {/* Timeline Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div style={{ backgroundColor: '#FAF6F0', padding: '14px', borderRadius: '10px', border: '1px solid #EADCC9' }}>
            <div style={{ fontSize: '0.75rem', color: '#7B5233', fontWeight: '700', marginBottom: '4px' }}>NGÀY TẠO ĐƠN</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1F2937' }}>{formatDate(order.create_date)}</div>
          </div>
          <div style={{ backgroundColor: '#EFF6FF', padding: '14px', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
            <div style={{ fontSize: '0.75rem', color: '#1E40AF', fontWeight: '700', marginBottom: '4px' }}>BẮT ĐẦU SẢN XUẤT</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1F2937' }}>{formatDate(order.start_date)}</div>
          </div>
          <div style={{ backgroundColor: '#FFFBEB', padding: '14px', borderRadius: '10px', border: '1px solid #FDE68A' }}>
            <div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: '700', marginBottom: '4px' }}>HẠN GIAO HÀNG</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1F2937' }}>{formatDate(order.delivery_date || order.estimated_date)}</div>
          </div>
          <div style={{ backgroundColor: '#ECFDF5', padding: '14px', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
            <div style={{ fontSize: '0.75rem', color: '#065F46', fontWeight: '700', marginBottom: '4px' }}>HOÀN THÀNH THỰC TẾ</div>
            <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1F2937' }}>{formatDate(order.finished_date)}</div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 800, color: '#7B5233', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={20} />
          <span>Danh sách Sản phẩm ({products.length} loại)</span>
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#7B5233', color: '#FFFFFF' }}>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', width: '60px' }}>STT</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Mã SKU</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800 }}>Tên sản phẩm</th>
                <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 800, textAlign: 'right', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>Số lượng đặt</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                    Chưa có sản phẩm nào trong đơn hàng này.
                  </td>
                </tr>
              ) : (
                products.map((prod, idx) => (
                  <tr key={prod.id || idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#4B5563', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#7B5233', fontWeight: 'bold' }}>{prod.sku || '---'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1F2937', fontWeight: 600 }}>{prod.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.9rem', color: '#1F2937', fontWeight: 800, textAlign: 'right' }}>
                      {new Intl.NumberFormat('vi-VN').format(prod.quantity || 1)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note Section */}
      {order.note && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: 800, color: '#7B5233' }}>Ghi chú chi tiết</h3>
          <p style={{ margin: 0, color: '#4B5563', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-line' }}>{order.note}</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <BeautifulConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          title="Xóa đơn hàng"
          message={`Bạn có chắc chắn muốn xóa đơn hàng "${order.order_code}"? Cảnh báo: Thao tác này sẽ gỡ hoàn toàn đơn hàng khỏi hệ thống.`}
          confirmText="Đồng ý xóa"
          cancelText="Hủy bỏ"
          type="danger"
        />
      )}
    </div>
  );
}
