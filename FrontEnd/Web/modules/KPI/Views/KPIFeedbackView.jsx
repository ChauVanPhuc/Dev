import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Search, Plus, Trash2, Edit2, AlertTriangle, HelpCircle, Lock, Upload, Download } from 'lucide-react';
import api from '@webShared/Services/api.service';
import '@styles/components.css';

const KPIFeedbackView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [feedbacks, setFeedbacks] = useState([]);
  
  // Search
  const [fbSearch, setFbSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Loaders & Alerts
  const [loadingEmp, setLoadingEmp] = useState(false);
  const [loadingFb, setLoadingFb] = useState(false);
  const [message, setMessage] = useState(null);
  const [showKhacDropdown, setShowKhacDropdown] = useState(false);
  
  // Modals & Confirmations
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingFb, setEditingFb] = useState(null);
  const [formData, setFormData] = useState({
    feedback_code: '',
    type: 'Thành tích nổi bật',
    content: '',
    feedback_time: '',
    reviewer: ''
  });

  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    type: 'delete',
    onConfirm: null
  });

  useEffect(() => {
    setCustomScreenCode('AD7.5');
    setCustomTitle('Ý kiến đóng góp & Nhận xét KPI');
    setCustomSubtitle('Nhật ký và cấu trúc ý kiến đóng góp của từng nhân viên.');
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmpId) {
      fetchFeedbacks(selectedEmpId);
    } else {
      setFeedbacks([]);
    }
  }, [selectedEmpId]);

  const fetchEmployees = async () => {
    setLoadingEmp(true);
    try {
      const res = await api.get('/kpi-management/employees');
      setEmployees(res || []);
      if (res && res.length > 0) {
        setSelectedEmpId(res[0].employee_id);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Không thể tải danh sách nhân sự.' });
    } finally {
      setLoadingEmp(false);
    }
  };

  const fetchFeedbacks = async (empId) => {
    setLoadingFb(true);
    try {
      const res = await api.get(`/kpi-management/feedbacks?employee_id=${empId}`);
      setFeedbacks(res || []);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Không thể tải phản hồi nhận xét.' });
    } finally {
      setLoadingFb(false);
    }
  };

  const handleOpenAddEditModal = (fb = null) => {
    if (fb) {
      setEditingFb(fb);
      setFormData({
        feedback_code: fb.feedback_code,
        type: fb.type,
        content: fb.content,
        feedback_time: fb.feedback_time,
        reviewer: fb.reviewer
      });
    } else {
      setEditingFb(null);
      const nextNum = feedbacks.length + 1;
      const nextCode = `NX${nextNum < 10 ? '0' + nextNum : nextNum}`;
      const nowStr = new Date().toISOString().slice(0, 10);
      setFormData({
        feedback_code: nextCode,
        type: 'Thành tích nổi bật',
        content: '',
        feedback_time: nowStr,
        reviewer: ''
      });
    }
    setShowAddEditModal(true);
  };

  const handleSave = () => {
    if (!formData.feedback_code.trim() || !formData.content.trim() || !formData.reviewer.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin nhận xét.' });
      return;
    }

    const actionText = editingFb ? 'Cập nhật' : 'Thêm mới';
    setConfirmModal({
      show: true,
      title: `Xác nhận ${actionText}`,
      message: `Bạn có muốn ${actionText.toLowerCase()} phản hồi/nhận xét này không?`,
      type: 'add',
      onConfirm: async () => {
        try {
          if (editingFb) {
            await api.put(`/kpi-management/feedbacks/${editingFb.id}`, formData);
            setMessage({ type: 'success', text: `Cập nhật nhận xét thành công.` });
          } else {
            await api.post('/kpi-management/feedbacks', {
              ...formData,
              employee_id: selectedEmpId
            });
            setMessage({ type: 'success', text: `Thêm nhận xét thành công.` });
          }
          setShowAddEditModal(false);
          fetchFeedbacks(selectedEmpId);
        } catch (err) {
          console.error(err);
          setMessage({ type: 'error', text: 'Không thể lưu nhận xét.' });
        }
      }
    });
  };

  const handleDelete = (fb) => {
    setConfirmModal({
      show: true,
      title: 'Xác nhận xóa nhận xét',
      message: `Bạn có chắc muốn xóa nhận xét "${fb.content}" (${fb.feedback_code})?`,
      type: 'delete',
      onConfirm: async () => {
        try {
          await api.delete(`/kpi-management/feedbacks/${fb.id}`);
          setMessage({ type: 'success', text: 'Xóa nhận xét thành công.' });
          fetchFeedbacks(selectedEmpId);
        } catch (err) {
          console.error(err);
          setMessage({ type: 'error', text: 'Không thể xóa nhận xét.' });
        }
      }
    });
  };

  const selectedEmp = employees.find(e => e.employee_id === selectedEmpId);
  const filteredFeedbacks = feedbacks.filter(fb =>
    fb.content.toLowerCase().includes(fbSearch.toLowerCase()) ||
    fb.type.toLowerCase().includes(fbSearch.toLowerCase()) ||
    fb.feedback_code.toLowerCase().includes(fbSearch.toLowerCase())
  );

  const totalPages = Math.ceil(filteredFeedbacks.length / itemsPerPage) || 1;
  const paginatedFeedbacks = filteredFeedbacks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
        
        {/* Employee Dropdown Selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#7B5233' }}>Chọn nhân viên:</label>
          {loadingEmp ? (
            <span style={{ fontSize: '12px', color: '#64748b' }}>Đang tải...</span>
          ) : (
            <select 
              value={selectedEmpId}
              onChange={(e) => { setSelectedEmpId(e.target.value); setCurrentPage(1); }}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #EADCC9', fontSize: '12px', fontWeight: '600', color: '#1e293b', outline: 'none', backgroundColor: '#fff', minWidth: '220px' }}
            >
              {employees.map(emp => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.full_name} ({emp.employee_id}) - {emp.department}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <input 
              type="text" 
              placeholder="Tìm kiếm nhận xét..." 
              value={fbSearch}
              onChange={(e) => { setFbSearch(e.target.value); setCurrentPage(1); }}
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
                <button onClick={() => { setShowKhacDropdown(false); navigate('/admin/kpi/list'); }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#7B5233', borderRadius: '4px' }}>Danh sách KPI</button>
                <button onClick={() => { setShowKhacDropdown(false); navigate('/admin/kpi/rules'); }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#7B5233', borderRadius: '4px' }}>Quy tắc cộng trừ điểm</button>
              </div>
            )}
          </div>

          <button onClick={() => handleOpenAddEditModal(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: 'none', borderRadius: '8px', backgroundColor: '#7B5233', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
            <Plus size={14} /> Thêm nhận xét
          </button>
        </div>
      </div>

      {/* Main Flat Feedbacks Table */}
      <div className="admin-list-layout">
        <div className="mgmt-table card admin-table-card" style={{ padding: '16px' }}>
          {selectedEmp && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #FAF6F0', paddingBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#7B5233' }}>
                Đang quản lý nhận xét của: {selectedEmp.full_name} ({selectedEmp.employee_id}) - {selectedEmp.position}
              </span>
            </div>
          )}

          {loadingFb ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải danh sách nhận xét...</div>
          ) : filteredFeedbacks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Không có nhận xét nào được ghi nhận cho nhân viên này.</div>
          ) : (
            <>
              <div className="table-responsive desktop-only admin-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Mã NX</th>
                    <th style={{ width: '150px' }}>Phân loại nhận xét</th>
                    <th>Nội dung nhận xét chi tiết</th>
                    <th style={{ width: '130px' }}>Thời gian gửi</th>
                    <th style={{ width: '180px' }}>Người nhận xét (Manager)</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFeedbacks.map((fb) => (
                    <tr key={fb.id}>
                      <td style={{ fontWeight: '700', color: '#7B5233' }}>{fb.feedback_code}</td>
                      <td>
                        <span style={{
                          padding: '2px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold',
                          backgroundColor: fb.type === 'Thành tích nổi bật' ? '#dcfce7' : (fb.type === 'Những khó khăn' ? '#fee2e2' : (fb.type === 'Hành động cải tiến' ? '#e0f2fe' : '#f3e8ff')),
                          color: fb.type === 'Thành tích nổi bật' ? '#15803d' : (fb.type === 'Những khó khăn' ? '#b91c1c' : (fb.type === 'Hành động cải tiến' ? '#0369a1' : '#7e22ce'))
                        }}>
                          {fb.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600', maxWidth: '350px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{fb.content}</td>
                      <td>{fb.feedback_time}</td>
                      <td>{fb.reviewer}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button onClick={() => handleOpenAddEditModal(fb)} style={{ display: 'flex', padding: '6px', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#475569' }}><Edit2 size={13} /></button>
                          <button onClick={() => handleDelete(fb)} style={{ display: 'flex', padding: '6px', borderRadius: '6px', border: 'none', background: '#fee2e2', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="admin-pagination-desktop" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <div style={{ fontSize: '0.85rem', color: '#7B5233', fontWeight: '600' }}>
                Hiển thị <b>{filteredFeedbacks.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</b> - <b>{Math.min(currentPage * itemsPerPage, filteredFeedbacks.length)}</b> trên <b>{filteredFeedbacks.length}</b> kết quả
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
              {editingFb ? `Cập nhật nhận xét: ${formData.feedback_code}` : 'Thêm nhận xét / Đề xuất'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Mã nhận xét</label>
                <input type="text" value={formData.feedback_code} onChange={(e) => setFormData({ ...formData, feedback_code: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Phân loại</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="Thành tích nổi bật">Thành tích nổi bật</option>
                    <option value="Những khó khăn">Những khó khăn</option>
                    <option value="Hành động cải tiến">Hành động cải tiến</option>
                    <option value="Đề xuất kiến nghị">Đề xuất kiến nghị</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Người nhận xét (Manager)</label>
                  <input type="text" value={formData.reviewer} onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Thời gian gửi</label>
                <input type="text" value={formData.feedback_time} onChange={(e) => setFormData({ ...formData, feedback_time: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Nội dung nhận xét chi tiết</label>
                <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box', height: '80px', resize: 'none', fontFamily: 'inherit' }} />
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

export default KPIFeedbackView;
