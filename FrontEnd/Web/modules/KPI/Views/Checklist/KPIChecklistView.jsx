import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Search, Plus, Trash2, Edit2, AlertTriangle, HelpCircle } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import '@styles/components.css';

const KPIChecklistView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  const navigate = useNavigate();
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/kpi/checklist');
  const [checklistPool, setChecklistPool] = useState([]);
  
  // Search
  const [taskSearch, setTaskSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Loaders & Alerts
  const [loadingPool, setLoadingPool] = useState(false);
  const { toast } = useToast();
  const setMessage = (msg) => {
    if (msg) {
      toast(msg.type, msg.text);
    }
  };
  const [showKhacDropdown, setShowKhacDropdown] = useState(false);
  
  // Modals & Confirmations
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    task_code: '',
    content: '',
    frequency: 'Hàng ngày'
  });

  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    type: 'delete',
    onConfirm: null
  });

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  useEffect(() => {
    fetchChecklistPool();
  }, []);

  const fetchChecklistPool = async () => {
    setLoadingPool(true);
    try {
      const res = await api.get('/kpi-management/checklist-pool');
      setChecklistPool(res || []);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Không thể tải danh mục checklist mẫu.' });
    } finally {
      setLoadingPool(false);
    }
  };

  const handleOpenAddEditModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        task_code: item.task_code,
        content: item.content,
        frequency: item.frequency
      });
    } else {
      setEditingItem(null);
      const nextNum = checklistPool.length + 1;
      const nextCode = `CV${nextNum < 10 ? '0' + nextNum : nextNum}`;
      setFormData({
        task_code: nextCode,
        content: '',
        frequency: 'Hàng ngày'
      });
    }
    setShowAddEditModal(true);
  };

  const handleSave = () => {
    if (!formData.task_code.trim() || !formData.content.trim() || !formData.frequency) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin mẫu checklist.' });
      return;
    }

    const actionText = editingItem ? 'Cập nhật' : 'Thêm mới';
    setConfirmModal({
      show: true,
      title: `Xác nhận ${actionText}`,
      message: `Bạn có muốn ${actionText.toLowerCase()} mẫu checklist "${formData.content}" không?`,
      type: 'add',
      onConfirm: async () => {
        try {
          if (editingItem) {
            await api.put(`/kpi-management/checklist-pool/${editingItem.id}`, formData);
            setMessage({ type: 'success', text: `Cập nhật mẫu checklist thành công.` });
          } else {
            await api.post('/kpi-management/checklist-pool', formData);
            setMessage({ type: 'success', text: `Thêm mẫu checklist thành công.` });
          }
          setShowAddEditModal(false);
          fetchChecklistPool();
        } catch (err) {
          console.error(err);
          setMessage({ type: 'error', text: 'Không thể lưu mẫu checklist.' });
        }
      }
    });
  };

  const handleDelete = (item) => {
    setConfirmModal({
      show: true,
      title: 'Xác nhận xóa mẫu checklist',
      message: `Bạn có chắc muốn xóa mẫu checklist "${item.content}" (${item.task_code}) khỏi hệ thống?`,
      type: 'delete',
      onConfirm: async () => {
        try {
          await api.delete(`/kpi-management/checklist-pool/${item.id}`);
          setMessage({ type: 'success', text: 'Xóa mẫu checklist thành công.' });
          fetchChecklistPool();
        } catch (err) {
          console.error(err);
          setMessage({ type: 'error', text: 'Không thể xóa mẫu checklist.' });
        }
      }
    });
  };

  const filteredPool = checklistPool.filter(item =>
    item.content.toLowerCase().includes(taskSearch.toLowerCase()) ||
    item.task_code.toLowerCase().includes(taskSearch.toLowerCase())
  );

  const totalPages = Math.ceil(filteredPool.length / itemsPerPage) || 1;
  const paginatedPool = filteredPool.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ padding: '15px 20px', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
        


      {/* Selector & Actions Toolbar */}
      <div className="card" style={{ background: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #EADCC9', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#7B5233' }}>
            Tổng số công việc mẫu: {filteredPool.length}
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '250px' }}>
            <input 
              type="text" 
              placeholder="Tìm kiếm công việc mẫu..." 
              value={taskSearch}
              onChange={(e) => { setTaskSearch(e.target.value); setCurrentPage(1); }}
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
                <button onClick={() => { setShowKhacDropdown(false); navigate('/admin/kpi/list'); }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#7B5233', borderRadius: '4px' }}>Danh sách KPI</button>
                <button onClick={() => { setShowKhacDropdown(false); navigate('/admin/kpi/rules'); }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#7B5233', borderRadius: '4px' }}>Quy tắc cộng trừ điểm</button>
                <button onClick={() => { setShowKhacDropdown(false); navigate('/admin/kpi/feedback'); }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#7B5233', borderRadius: '4px' }}>Phản hồi và nhận xét</button>
              </div>
            )}
          </div>

          <button onClick={() => handleOpenAddEditModal(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: 'none', borderRadius: '8px', backgroundColor: '#7B5233', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
            <Plus size={14} /> Thêm mẫu checklist
          </button>
        </div>
      </div>

      {/* Main Flat Table */}
      <div className="admin-list-layout">
        <div className="mgmt-table card admin-table-card" style={{ padding: '16px' }}>
          {loadingPool ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải danh mục mẫu...</div>
          ) : filteredPool.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Không có mẫu công việc nào trong hệ thống.</div>
          ) : (
            <>
              <div className="table-responsive desktop-only admin-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '100px' }}>Mã CV</th>
                    <th>Nội dung công việc</th>
                    <th style={{ width: '150px', textAlign: 'center' }}>Tần suất</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPool.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '700', color: '#7B5233' }}>{item.task_code}</td>
                      <td style={{ fontWeight: '600' }}>{item.content}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#FAF6F0', color: '#7B5233' }}>
                          {item.frequency}
                        </span>
                      </td>
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

            {/* Pagination */}
            <div className="admin-pagination-desktop desktop-only">
              <div style={{ fontSize: '0.85rem', color: '#7B5233', fontWeight: '600' }}>
                Hiển thị <b>{filteredPool.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</b> - <b>{Math.min(currentPage * itemsPerPage, filteredPool.length)}</b> trên <b>{filteredPool.length}</b> kết quả
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #EADCC9', backgroundColor: '#fff', color: '#7B5233', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, fontWeight: '700' }}
                >
                  &lt; Trước
                </button>
                {[...Array(totalPages)].map((_, idx) => (
                  <button 
                    key={idx} 
                    className={`page-btn ${currentPage === idx + 1 ? 'active' : ''}`}
                    onClick={() => setCurrentPage(idx + 1)}
                    style={{ 
                      padding: '6px 12px', borderRadius: '6px', border: '1px solid #EADCC9', 
                      backgroundColor: currentPage === idx + 1 ? '#7B5233' : '#fff', 
                      color: currentPage === idx + 1 ? '#fff' : '#7B5233',
                      fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button 
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #EADCC9', backgroundColor: '#fff', color: '#7B5233', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, fontWeight: '700' }}
                >
                  Sau &gt;
                </button>
              </div>
            </div>
          </>
        )}
        </div>
      </div>

      {/* Modal Add/Edit */}
      {showAddEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', width: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#7B5233', fontWeight: '800', fontSize: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              {editingItem ? `Cập nhật công việc mẫu: ${formData.task_code}` : 'Thêm công việc mẫu mới'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Mã công việc</label>
                <input type="text" value={formData.task_code} onChange={(e) => setFormData({ ...formData, task_code: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Nội dung công việc mẫu</label>
                <input type="text" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Tần suất thực hiện</label>
                <select value={formData.frequency} onChange={(e) => setFormData({ ...formData, frequency: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}>
                  <option value="Hàng ngày">Hàng ngày</option>
                  <option value="Hàng tuần">Hàng tuần</option>
                  <option value="Hằng tháng">Hằng tháng</option>
                  <option value="Khi phát sinh">Khi phát sinh</option>
                  <option value="Liên tục trong ca">Liên tục trong ca</option>
                </select>
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

export default KPIChecklistView;
