import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Package, Calendar, User, CheckCircle, Clock, AlertCircle,
  Warehouse, FileText, ShoppingCart, Eye, Truck
} from 'lucide-react';
import { purchasingService } from '@modules/Purchasing/Models/purchasing.service';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '---';
  return new Intl.NumberFormat('vi-VN').format(Math.round(value));
};

const formatDate = (dateStr) => {
  if (!dateStr) return '---';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return '---'; }
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '---';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '---'; }
};

const formatNumber = (value) => {
  if (!value && value !== 0) return '---';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
};

const getStatusDisplay = (status) => {
  switch (status) {
    case 'Duyệt thành công': return { text: 'Đã duyệt', bg: '#ecfdf5', color: '#10b981', icon: CheckCircle };
    case 'K.tra thành công': return { text: 'Đã kiểm tra', bg: '#eff6ff', color: '#3b82f6', icon: Eye };
    case 'Nháp': return { text: 'Nháp', bg: '#fffbeb', color: '#f59e0b', icon: Clock };
    default: return { text: status || '---', bg: '#f1f5f9', color: '#64748b', icon: AlertCircle };
  }
};

const getWarehouseDisplay = (status) => {
  switch (status) {
    case 'Đã nhập kho': return { text: 'Đã nhập kho', bg: '#ecfdf5', color: '#10b981' };
    case 'Nhập chưa hết': return { text: 'Nhập chưa hết', bg: '#fff7ed', color: '#f97316' };
    case 'Chưa nhập kho': return { text: 'Chưa nhập kho', bg: '#f1f5f9', color: '#94a3b8' };
    default: return { text: status || '---', bg: '#f1f5f9', color: '#94a3b8' };
  }
};

const PurchaseRequisitionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setCustomTitle, setCustomSubtitle } = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (data && setCustomTitle) {
      const status = getStatusDisplay(data.status);
      const StatusIcon = status.icon;
      const titleJSX = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2D1A12' }}>{data.po_code}</span>
          <span style={{
            padding: '3px 10px',
            borderRadius: '20px',
            fontSize: '0.72rem',
            fontWeight: 700,
            backgroundColor: status.bg,
            color: status.color,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            lineHeight: 1
          }}>
            <StatusIcon size={12} /> {status.text}
          </span>
        </div>
      );
      setCustomTitle(titleJSX);
      setCustomSubtitle('Chi tiết đơn đặt mua');
    }
  }, [data, setCustomTitle, setCustomSubtitle]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await purchasingService.getRequisitionById(id);
        setData(result);
      } catch (error) {
        console.error('Lỗi tải chi tiết:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>
        Đang tải dữ liệu...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#94a3b8' }}>
        <AlertCircle size={48} style={{ marginBottom: 16 }} />
        <h3>Không tìm thấy đơn đặt mua</h3>
        <button onClick={() => navigate('/admin/purchase-requisitions')}
          style={{ marginTop: 16, padding: '10px 20px', borderRadius: 8, border: 'none', backgroundColor: '#5d3b32', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const status = getStatusDisplay(data.status);
  const warehouse = getWarehouseDisplay(data.warehouse_status);
  const StatusIcon = status.icon;

  // Timeline steps
  const timeline = [
    { label: 'Ngày tạo đơn', date: data.order_date, person: data.creator, icon: FileText, color: '#7B5233' },
    { label: 'Ngày kiểm tra', date: data.inspection_date, person: data.inspector, icon: Eye, color: '#3b82f6' },
    { label: 'Ngày duyệt', date: data.approval_date, person: data.approver, icon: CheckCircle, color: '#10b981' },
    { label: 'Ngày giao hàng', date: data.delivery_date, person: null, icon: Truck, color: '#f59e0b' },
  ];

  return (
    <div className="manufacture-plan-container" style={{ maxWidth: '100%', margin: '0', width: '100%', padding: '4px 0 24px', boxSizing: 'border-box' }}>
      {/* Info Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, padding: '12px 16px' }}>
        {/* Supplier Info */}
        <div className="card-shadow" style={{ padding: 16, borderRadius: 12, backgroundColor: '#fff' }}>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Nhà cung cấp</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={20} color="#8D6E63" />
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>{data.supplier_name || '---'}</p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Mã NCC: {data.supplier_code || '---'}</p>
            </div>
          </div>
        </div>

        {/* Order Type Info */}
        <div className="card-shadow" style={{ padding: 16, borderRadius: 12, backgroundColor: '#fff' }}>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Loại đơn hàng</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingCart size={20} color="#10b981" />
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>{data.order_type || '---'}</p>
            </div>
          </div>
        </div>

        {/* Warehouse Status */}
        <div className="card-shadow" style={{ padding: 16, borderRadius: 12, backgroundColor: '#fff' }}>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Tình trạng kho</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Warehouse size={20} color={warehouse.color} />
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', backgroundColor: warehouse.bg, color: warehouse.color, fontSize: '0.82rem' }}>
                  {warehouse.text}
                </span>
              </p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                {data.processing_status || '---'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="card-shadow" style={{ padding: 20, borderRadius: 12, backgroundColor: '#fff' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: 700, color: '#2D1A12' }}>Tiến trình xử lý</h3>
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {timeline.map((step, idx) => {
              const StepIcon = step.icon;
              const isCompleted = !!step.date;
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', minWidth: 140 }}>
                  {idx > 0 && (
                    <div style={{
                      position: 'absolute', top: 18, left: 0, right: '50%', height: 2,
                      backgroundColor: isCompleted ? step.color : '#e2e8f0'
                    }} />
                  )}
                  {idx < timeline.length - 1 && (
                    <div style={{
                      position: 'absolute', top: 18, left: '50%', right: 0, height: 2,
                      backgroundColor: timeline[idx + 1]?.date ? timeline[idx + 1].color : '#e2e8f0'
                    }} />
                  )}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isCompleted ? step.color : '#f1f5f9', position: 'relative', zIndex: 1,
                    boxShadow: isCompleted ? `0 0 0 4px ${step.color}20` : 'none'
                  }}>
                    <StepIcon size={18} color={isCompleted ? '#fff' : '#94a3b8'} />
                  </div>
                  <p style={{ margin: '8px 0 2px', fontSize: '0.76rem', fontWeight: 600, color: isCompleted ? '#334155' : '#94a3b8', textAlign: 'center' }}>
                    {step.label}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: isCompleted ? '#64748b' : '#cbd5e1', textAlign: 'center' }}>
                    {formatDateTime(step.date)}
                  </p>
                  {step.person && (
                    <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <User size={11} /> {step.person}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="card-shadow" style={{ padding: 20, borderRadius: 12, backgroundColor: '#fff' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: 700, color: '#2D1A12' }}>
            Danh sách mặt hàng ({data.items?.length || 0})
          </h3>
          {data.items && data.items.length > 0 ? (
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f6f3', borderBottom: '2px solid #efe8e1' }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Mã MH</th>
                    <th style={thStyle}>Tên mặt hàng</th>
                    <th style={thStyle}>ĐVT</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Số lượng</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f5f0eb' }}>
                      <td style={tdStyle} data-label="#">{idx + 1}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: '#7B5233' }} data-label="Mã MH">{item.item_code || '---'}</td>
                      <td style={{ ...tdStyle, maxWidth: 280 }} data-label="Tên mặt hàng">{item.item_name || '---'}</td>
                      <td style={tdStyle} data-label="ĐVT">{item.unit || '---'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }} data-label="Số lượng">{formatNumber(item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              Chưa có mặt hàng nào. Hãy import từ file Excel "Báo cáo đơn mua hàng xác nhận" để thêm mặt hàng.
            </div>
          )}
        </div>
      </div>

      {/* Note */}
      {data.note && (
        <div style={{ padding: '0 16px 16px' }}>
          <div className="card-shadow" style={{ padding: 16, borderRadius: 12, backgroundColor: '#fff' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 700, color: '#2D1A12' }}>Ghi chú</h3>
            <p style={{ margin: 0, fontSize: '0.83rem', color: '#64748b', lineHeight: 1.6 }}>{data.note}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const thStyle = { padding: '10px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#7B5233', whiteSpace: 'nowrap' };
const tdStyle = { padding: '9px 10px', fontSize: '0.82rem', color: '#334155' };

export default PurchaseRequisitionDetail;
