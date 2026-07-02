import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Search, Plus, Trash2, Edit2, AlertTriangle, HelpCircle } from 'lucide-react';
import api from '@webShared/Services/api.service';
import '@styles/components.css';

const KPIItemsView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  const navigate = useNavigate();
  const [kpiPool, setKpiPool] = useState([]);
  
  // Search
  const [kpiSearch, setKpiSearch] = useState('');
  
  // Loaders & Alerts
  const [loadingPool, setLoadingPool] = useState(false);
  const [message, setMessage] = useState(null);
  const [showKhacDropdown, setShowKhacDropdown] = useState(false);
  
  // Modals & Confirmations
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    kpi_code: '',
    content: '',
    calc_method: '',
    target: ''
  });

  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    type: 'delete',
    onConfirm: null
  });

  useEffect(() => {
    setCustomScreenCode('AD7.3');
    setCustomTitle('Danh mục chỉ số KPI mẫu');
    setCustomSubtitle('Cấu hình danh mục KPI mẫu chung phục vụ đánh giá hiệu suất.');
    fetchKpiPool();
  }, []);

  const fetchKpiPool = async () => {
    setLoadingPool(true);
    try {
      const res = await api.get('/kpi-management/kpi-pool');
      setKpiPool(res || []);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Không thể tải danh mục KPI mẫu.' });
    } finally {
      setLoadingPool(false);
    }
  };

  const handleOpenAddEditModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        kpi_code: item.kpi_code,
        content: item.content,
        calc_method: item.calc_method,
        target: item.target
      });
    } else {
      setEditingItem(null);
      const nextNum = kpiPool.length + 1;
      const nextCode = `KPI${nextNum < 10 ? '0' + nextNum : nextNum}`;
      setFormData({
        kpi_code: nextCode,
        content: '',
        calc_method: '',
        target: ''
      });
    }
    setShowAddEditModal(true);
  };

  const handleSave = () => {
    if (!formData.kpi_code.trim() || !formData.content.trim() || !formData.calc_method.trim() || !formData.target.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin mẫu KPI.' });
      return;
    }

    const actionText = editingItem ? 'Cập nhật' : 'Thêm mới';
    setConfirmModal({
      show: true,
      title: `Xác nhận ${actionText}`,
      message: `Bạn có muốn ${actionText.toLowerCase()} mẫu KPI "${formData.content}" không?`,
      type: 'add',
      onConfirm: async () => {
        try {
          if (editingItem) {
            await api.put(`/kpi-management/kpi-pool/${editingItem.id}`, formData);
            setMessage({ type: 'success', text: `Cập nhật mẫu KPI thành công.` });
          } else {
            await api.post('/kpi-management/kpi-pool', formData);
            setMessage({ type: 'success', text: `Thêm mẫu KPI thành công.` });
          }
          setShowAddEditModal(false);
          fetchKpiPool();
        } catch (err) {
          console.error(err);
          setMessage({ type: 'error', text: 'Không thể lưu mẫu KPI.' });
        }
      }
    });
  };

  const handleDelete = (item) => {
    setConfirmModal({
      show: true,
      title: 'Xác nhận xóa mẫu KPI',
      message: `Bạn có chắc muốn xóa mẫu KPI "${item.content}" (${item.kpi_code}) khỏi hệ thống?`,
      type: 'delete',
      onConfirm: async () => {
        try {
          await api.delete(`/kpi-management/kpi-pool/${item.id}`);
          setMessage({ type: 'success', text: 'Xóa mẫu KPI thành công.' });
          fetchKpiPool();
        } catch (err) {
          console.error(err);
          setMessage({ type: 'error', text: 'Không thể xóa mẫu KPI.' });
        }
      }
    });
  };

  const filteredPool = kpiPool.filter(item =>
    item.content.toLowerCase().includes(kpiSearch.toLowerCase()) ||
    item.kpi_code.toLowerCase().includes(kpiSearch.toLowerCase())
  );

  return (
    <div style={{ padding: '15px 20px', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      
      {/* Toast Alert */}
      {message && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 3000,
          padding: '12px 24px', borderRadius: '8px', color: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: 'bold', fontSize: '13px',
          backgroundColor: message.type === 'error' ? '#ef4444' : '#22c55e',
          transition: 'all 0.3s ease'
        }}>
          {message.text}
          <button onClick={() => setMessage(null)} style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        </div>
      )}
        


      {/* Selector & Actions Toolbar */}
      <div className="card" style={{ background: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #EADCC9', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#7B5233' }}>
            Tổng số chỉ số KPI mẫu: {filteredPool.length}
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '250px' }}>
            <input 
              type="text" 
              placeholder="Tìm kiếm KPI mẫu..." 
              value={kpiSearch}
              onChange={(e) => setKpiSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid #EADCC9', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
            />
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#7B5233' }} />
          </div>

          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowKhacDropdown(!showKhacDropdown)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: 'none', borderRadius: '8px', backgroundColor: '#7B5233', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
            >
              Khác ▾
            </button>
            {showKhacDropdown && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '5px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #EADCC9', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, width: '200px', display: 'flex', flexDirection: 'column', padding: '6px' }}>
                <button onClick={() => { setShowKhacDropdown(false); navigate('/admin/kpi'); }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#7B5233', borderRadius: '4px' }}>Quản lý KPI (Tổng quan)</button>
                <button onClick={() => { setShowKhacDropdown(false); navigate('/admin/kpi/checklist'); }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#7B5233', borderRadius: '4px' }}>Checklist công việc</button>
                <button onClick={() => { setShowKhacDropdown(false); navigate('/admin/kpi/rules'); }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#7B5233', borderRadius: '4px' }}>Quy tắc cộng trừ điểm</button>
                <button onClick={() => { setShowKhacDropdown(false); navigate('/admin/kpi/feedback'); }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#7B5233', borderRadius: '4px' }}>Phản hồi và nhận xét</button>
              </div>
            )}
          </div>

          <button onClick={() => handleOpenAddEditModal(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: 'none', borderRadius: '8px', backgroundColor: '#7B5233', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
            <Plus size={14} /> Thêm mẫu KPI
          </button>
        </div>
      </div>

      {/* Main Flat Table */}
      <div className="admin-list-layout">
        <div className="mgmt-table card admin-table-card" style={{ padding: '16px' }}>
          {loadingPool ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải danh mục mẫu...</div>
          ) : filteredPool.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Không có mẫu KPI nào trong hệ thống.</div>
          ) : (
            <div className="table-responsive desktop-only admin-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '100px' }}>Mã KPI</th>
                    <th>Chỉ số KPI mẫu</th>
                    <th>Cách tính / Công thức đo lường</th>
                    <th style={{ width: '150px' }}>Mục tiêu</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPool.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '700', color: '#7B5233' }}>{item.kpi_code}</td>
                      <td style={{ fontWeight: '600' }}>{item.content}</td>
                      <td>{item.calc_method}</td>
                      <td style={{ fontWeight: '700', color: '#0f766e' }}>{item.target}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button onClick={() => handleOpenAddEditModal(item)} style={{ display: 'flex', padding: '6px', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#475569' }}><Edit2 size={13} /></button>
                          <button onClick={() => handleDelete(item)} style={{ display: 'flex', padding: '6px', borderRadius: '6px', border: 'none', background: '#fee2e2', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Add/Edit */}
      {showAddEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', width: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#7B5233', fontWeight: '800', fontSize: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              {editingItem ? `Cập nhật KPI mẫu: ${formData.kpi_code}` : 'Thêm KPI mẫu mới'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Mã KPI</label>
                <input type="text" value={formData.kpi_code} onChange={(e) => setFormData({ ...formData, kpi_code: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Tên chỉ số KPI mẫu</label>
                <input type="text" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Mục tiêu tối thiểu</label>
                <input type="text" placeholder="e.g. >= 98%" value={formData.target} onChange={(e) => setFormData({ ...formData, target: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Công thức tính / Cách đo lường</label>
                <textarea value={formData.calc_method} onChange={(e) => setFormData({ ...formData, calc_method: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box', height: '60px', resize: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAddEditModal(false)} style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', color: '#475569' }}>Hủy bỏ</button>
              <button onClick={handleSave} style={{ flex: 1, padding: '8px 12px', border: 'none', borderRadius: '6px', background: '#7B5233', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', width: '380px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', backgroundColor: confirmModal.type === 'delete' ? '#fee2e2' : '#dcfce7', color: confirmModal.type === 'delete' ? '#ef4444' : '#22c55e' }}>
              {confirmModal.type === 'delete' ? <AlertTriangle size={24} /> : <HelpCircle size={24} />}
            </div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1e293b' }}>{confirmModal.title}</h4>
            <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', color: '#475569' }}>Hủy bỏ</button>
              <button onClick={async () => { setConfirmModal(prev => ({ ...prev, show: false })); if (confirmModal.onConfirm) await confirmModal.onConfirm(); }} style={{ flex: 1, padding: '8px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', color: '#fff', backgroundColor: confirmModal.type === 'delete' ? '#ef4444' : '#7B5233' }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default KPIItemsView;
