import React, { useState, useEffect, useMemo } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import ExcelJS from 'exceljs';
import axios from 'axios';
import { 
  Search, Filter, Plus, Edit, Layers, FileUp, FileDown, Eye, X, ArrowUpRight 
} from 'lucide-react';
import '@styles/components.css';
import EquipmentHandover from './EquipmentHandoverView';

const EquipmentManagementView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra } = useOutletContext();
  const navigate = useNavigate();
  
  // Data States
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMenuId, setActionMenuId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const location = useLocation();
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverEquipmentId, setHandoverEquipmentId] = useState(null);

  useEffect(() => {
    if (location.state?.openHandover) {
      const hId = location.state.handoverId;
      setHandoverEquipmentId(hId ? parseInt(hId) : null);
      setShowHandoverModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  
  // Pagination & Popups
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [showOtherMenu, setShowOtherMenu] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    listSelected: true,
    listAll: false,
    docsSelected: false,
    docsAll: false
  });

  // Fetch all equipments
  const fetchEquipments = async () => {
    setLoading(true);
    try {
      const data = await api.get('/equipments/');
      setEquipments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Lỗi khi tải danh sách thiết bị:', error);
      setMessage({ type: 'error', text: 'Không thể tải danh sách thiết bị từ hệ thống.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCustomScreenCode('AD37');
    setCustomTitle('Quản lý thiết bị');
    setCustomSubtitle('Hệ thống giám sát, bàn giao, kiểm định và đào tạo vận hành máy móc thiết bị.');
    fetchEquipments();
    
    // Close action menu when clicking outside
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-menu') && !e.target.closest('.action-btn')) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      setHeaderExtra(null);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtered equipments
  const filteredEquipments = useMemo(() => {
    return equipments.filter(eq => 
      eq.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (eq.owner_name && eq.owner_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [equipments, searchTerm]);

  // Handle delete equipment
  const handleDelete = async (eq) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa thiết bị "${eq.name}" (${eq.code})?`)) {
      try {
        await api.delete(`/equipments/${eq.id}`);
        setMessage({ type: 'success', text: `Đã xóa thiết bị ${eq.name} thành công.` });
        fetchEquipments();
      } catch (error) {
        setMessage({ type: 'error', text: error.response?.data?.detail || 'Không thể xóa thiết bị.' });
      }
    }
  };

  // Export Excel / PDF ZIP function
  const handleConfirmExport = async () => {
    try {
      // 1. Xuất danh sách Excel
      if (exportOptions.listSelected) {
        const workbook = new ExcelJS.Workbook();
        const sheet1 = workbook.addWorksheet('Danh sách thiết bị');
        sheet1.columns = [
          { header: 'Mã Thiết Bị', key: 'code', width: 15 },
          { header: 'Tên Thiết Bị', key: 'name', width: 25 },
          { header: 'Loại Thiết Bị', key: 'type', width: 15 },
          { header: 'Bộ phận', key: 'department', width: 20 },
          { header: 'Người Sở Hữu', key: 'owner_name', width: 20 },
          { header: 'Ngày Bàn Giao', key: 'handover_date', width: 15 },
          { header: 'Ngày Kiểm Tra', key: 'check_date', width: 15 },
          { header: 'Trạng Thái', key: 'status', width: 15 }
        ];

        // Lựa chọn danh sách toàn bộ hoặc lọc theo bộ lọc hiện tại
        const targetList = exportOptions.listAll ? equipments : filteredEquipments;
        
        targetList.forEach(eq => {
          sheet1.addRow({
            code: eq.code,
            name: eq.name,
            type: eq.type || '',
            department: eq.department || '',
            owner_name: eq.owner_name || 'Chưa bàn giao',
            handover_date: eq.handover_date || '',
            check_date: eq.check_date || '',
            status: eq.status || 'Bình thường'
          });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Danh_Sach_Thiet_Bi_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
      }

      // 2. Xuất tài liệu chi tiết (ZIP chứa các tệp PDF)
      if (exportOptions.docsSelected) {
        const token = localStorage.getItem('token');
        const getBaseURL = () => {
          const { hostname, port } = window.location;
          if (port === '5173' || port === '3000') {
            return `http://${hostname}:8000`;
          }
          return window.location.origin;
        };

        const payload = {
          equipment_ids: exportOptions.docsAll ? null : filteredEquipments.map(eq => eq.id),
          export_all: exportOptions.docsAll
        };

        const response = await axios.post(
          `${getBaseURL()}/api/v1/equipments/export-zip`,
          payload,
          {
            responseType: 'blob',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }
        );

        const blob = new Blob([response.data], { type: 'application/x-zip-compressed' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Tai_Lieu_Thiet_Bi_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
      }

      setMessage({ type: 'success', text: 'Xuất dữ liệu thành công.' });
      setShowExportModal(false);
    } catch (err) {
      console.error("Lỗi khi xuất dữ liệu:", err);
      setMessage({ type: 'error', text: 'Có lỗi xảy ra khi xuất dữ liệu.' });
    }
  };

  const btnStyle = { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' };

  return (
    <div style={{ padding: '5px 20px 20px' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 20px', backgroundColor: '#fff', borderRadius: '12px',
        border: '1px solid #EADCC9', width: '100%', marginBottom: '10px',
        gap: '15px', flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#7B5233' }} size={16} />
            <input 
              type="text" 
              placeholder="Nhập Họ và tên hoặc Mã NV" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%', padding: '8px 12px 8px 38px', border: '1.5px solid #EADCC9', 
                borderRadius: '8px', outline: 'none', fontSize: '13px',
                backgroundColor: '#fff', color: '#7B5233'
              }}
            />
          </div>
          
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '34px', height: '34px', border: 'none', background: 'none',
            cursor: 'pointer', color: '#7B5233'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 18V4"></path>
            </svg>
          </button>

          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '34px', height: '34px', border: 'none', background: 'none',
            cursor: 'pointer', color: '#7B5233'
          }}>
            <Filter size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Action Buttons on the Right */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Button Khác */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowOtherMenu(!showOtherMenu)}
              style={btnStyle}
            >
              <Layers size={14} /> Khác
            </button>
            {showOtherMenu && (
              <div style={{
                position: 'absolute', top: '100%', right: '0', backgroundColor: '#fff',
                border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                zIndex: 1100, minWidth: '220px', padding: '8px 0', marginTop: '5px'
              }}>
                <div 
                  onClick={() => { navigate('/admin/equipment/categories'); setShowOtherMenu(false); }}
                  style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' }}
                  className="dropdown-hover"
                >
                  Danh sách thiết bị
                </div>
                <div 
                  onClick={() => { navigate('/admin/equipment/history'); setShowOtherMenu(false); }}
                  style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' }}
                  className="dropdown-hover"
                >
                  Lịch sử kiểm tra, hiệu chuẩn
                </div>
                <div 
                  onClick={() => { navigate('/admin/equipment/training'); setShowOtherMenu(false); }}
                  style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' }}
                  className="dropdown-hover"
                >
                  Thông tin đào tạo
                </div>
              </div>
            )}
          </div>

          <button style={btnStyle}>
            <FileUp size={14} /> Nhập dữ liệu
          </button>

          <button onClick={() => setShowExportModal(true)} style={btnStyle}>
            <FileDown size={14} /> Xuất dữ liệu
          </button>

          <button onClick={() => { setHandoverEquipmentId(null); setShowHandoverModal(true); }} style={btnStyle}>
            <Plus size={14} /> Bàn giao
          </button>
        </div>
      </div>

      {/* Alert Message */}
      {message.text && (
        <div style={{
          padding: '12px 20px', borderRadius: '12px', marginBottom: '15px',
          backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: message.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span style={{ fontWeight: '600' }}>{message.text}</span>
          <X size={18} onClick={() => setMessage({type:'', text:''})} style={{ cursor: 'pointer', opacity: 0.5 }} />
        </div>
      )}

      {/* ── Bảng dữ liệu đồng bộ với /admin/users ── */}
      <div className="admin-list-layout">
        <div className="mgmt-table card admin-table-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="loading-state" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
          ) : (
            <>
              {/* Bảng Desktop */}
              <div className="table-responsive desktop-only admin-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mã TB</th>
                      <th>Tên Thiết Bị</th>
                      <th>Loại TB</th>
                      <th>Bộ phận</th>
                      <th>Người sở hữu</th>
                      <th>Ngày bàn giao</th>
                      <th>Ngày kiểm tra</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: 'center', width: '100px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEquipments.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
                          Không tìm thấy thiết bị nào phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredEquipments.slice((page - 1) * pageSize, page * pageSize).map((eq) => (
                        <tr
                          key={eq.id}
                          className="animate-card-entrance"
                          style={{
                            position: 'relative',
                            zIndex: actionMenuId === eq.id ? 30 : 1
                          }}
                        >
                          <td>
                            <span 
                              style={{ fontWeight: '800', color: '#7B5233', cursor: 'pointer' }}
                              onClick={() => navigate(`/admin/equipment/detail/${eq.id}`)}
                            >
                              {eq.code}
                            </span>
                          </td>
                          <td className="font-bold">{eq.name}</td>
                          <td>{eq.type || '—'}</td>
                          <td>{eq.department || '—'}</td>
                          <td className="font-bold">{eq.owner_name || 'Chưa gán'}</td>
                          <td>{eq.handover_date || '—'}</td>
                          <td>{eq.check_date || '—'}</td>
                          <td>
                            <span style={{
                              padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800',
                              backgroundColor: eq.status === 'Bình thường' ? '#dcfce7' : eq.status === 'Bảo trì' ? '#fef3c7' : '#fee2e2',
                              color: eq.status === 'Bình thường' ? '#15803d' : eq.status === 'Bảo trì' ? '#b45309' : '#b91c1c',
                              display: 'inline-block'
                            }}>
                              {eq.status}
                            </span>
                          </td>
                          <td style={{ position: 'relative', zIndex: actionMenuId === eq.id ? 40 : 1, textAlign: 'center' }}>
                            <button
                              className="action-btn"
                              onClick={() => setActionMenuId(actionMenuId === eq.id ? null : eq.id)}
                            >•••</button>
                            {actionMenuId === eq.id && (
                              <div className="action-menu" style={{ right: '10px', top: '100%', zIndex: 1100 }}>
                                <button className="action-menu-item" onClick={() => { setActionMenuId(null); navigate(`/admin/equipment/detail/${eq.id}`); }}>👁️ Xem chi tiết</button>
                                <button className="action-menu-item" onClick={() => { setActionMenuId(null); setHandoverEquipmentId(eq.id); setShowHandoverModal(true); }}>✏️ Chỉnh sửa</button>
                                <button className="action-menu-item danger" onClick={() => { setActionMenuId(null); handleDelete(eq); }}>🗑 Xóa</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Thẻ Mobile */}
              <div className="mobile-only mgmt-cards-container">
                {filteredEquipments.length === 0 && <div className="no-data-text-mobile">Không tìm thấy dữ liệu</div>}
                {filteredEquipments.slice((page - 1) * pageSize, page * pageSize).map((eq) => (
                  <div key={eq.id} className="mgmt-card animate-card-entrance" style={{ zIndex: actionMenuId === eq.id ? 100 : 1 }}>
                    <div className="mgmt-card-main">
                      <div className="mgmt-card-avatar" style={{ backgroundColor: '#EADCC9', color: '#7B5233', fontWeight: '800' }}>
                        {eq.name?.charAt(0) || 'E'}
                      </div>
                      <div className="mgmt-card-details">
                        <div className="mgmt-card-title-row">
                          <h4 className="mgmt-card-title">{eq.name}</h4>
                          <span className="mgmt-card-subtitle" style={{ color: '#7B5233', fontWeight: '800' }}>#{eq.code}</span>
                        </div>
                        <div className="mgmt-card-meta-chips">
                          <span className="mgmt-card-chip">{eq.type || 'Thiết bị'}</span>
                          <span className="mgmt-card-chip secondary">{eq.department || 'Chưa gán'}</span>
                        </div>
                      </div>
                      <div className="mgmt-card-actions" style={{ position: 'relative' }}>
                        <button
                          className="action-btn"
                          onClick={() => setActionMenuId(actionMenuId === eq.id ? null : eq.id)}
                        >•••</button>
                        {actionMenuId === eq.id && (
                          <div className="action-menu" style={{ right: 0, top: '100%', zIndex: 1100 }}>
                            <button className="action-menu-item" onClick={() => { setActionMenuId(null); navigate(`/admin/equipment/detail/${eq.id}`); }}>👁️ Xem chi tiết</button>
                            <button className="action-menu-item" onClick={() => { setActionMenuId(null); setHandoverEquipmentId(eq.id); setShowHandoverModal(true); }}>✏️ Chỉnh sửa</button>
                            <button className="action-menu-item danger" onClick={() => { setActionMenuId(null); handleDelete(eq); }}>🗑 Xóa</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mgmt-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', marginTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                      <div className="mgmt-card-footer-left" style={{ fontSize: '12px', color: '#64748b' }}>
                        Sở hữu: <strong style={{ color: '#334155' }}>{eq.owner_name || 'Chưa gán'}</strong>
                      </div>
                      <span style={{
                        padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700',
                        backgroundColor: eq.status === 'Bình thường' ? '#dcfce7' : eq.status === 'Bảo trì' ? '#fef3c7' : '#fee2e2',
                        color: eq.status === 'Bình thường' ? '#15803d' : eq.status === 'Bảo trì' ? '#b45309' : '#b91c1c',
                        display: 'inline-block'
                      }}>
                        {eq.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {filteredEquipments.length > 0 && (
                <div className="admin-pagination-desktop" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px' }}>
                  <span className="pagination-info" style={{ fontWeight: '600', color: '#64748b' }}>
                    Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredEquipments.length)} / {filteredEquipments.length} thiết bị
                  </span>
                  <div className="pagination-controls" style={{ display: 'flex', gap: '5px' }}>
                    <button 
                      disabled={page === 1} 
                      onClick={() => setPage(prev => Math.max(prev - 1, 1))} 
                      className="page-btn"
                    >
                      Trước
                    </button>
                    {[...Array(Math.ceil(filteredEquipments.length / pageSize))].map((_, i) => (
                      <button
                        key={i}
                        className={`page-btn ${page === i + 1 ? 'active' : ''}`}
                        onClick={() => setPage(i + 1)}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button 
                      disabled={page >= Math.ceil(filteredEquipments.length / pageSize)} 
                      onClick={() => setPage(prev => Math.min(prev + 1, Math.ceil(filteredEquipments.length / pageSize)))} 
                      className="page-btn"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Export Options Modal */}
      {showExportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '12px', width: '420px', padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #EADCC9'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '14px', fontWeight: '700', color: '#7B5233' }}>Nội dung cần xuất</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '14px', fontWeight: '700', color: '#7B5233', width: '120px' }}>Xuất toàn bộ</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '14px 8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={exportOptions.listSelected} 
                        onChange={(e) => setExportOptions({ ...exportOptions, listSelected: e.target.checked })} 
                        style={{ accentColor: '#7B5233', width: '15px', height: '15px' }}
                      />
                      Xuất danh sách
                    </label>
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={exportOptions.listAll} 
                      disabled={!exportOptions.listSelected}
                      onChange={(e) => setExportOptions({ ...exportOptions, listAll: e.target.checked })} 
                      style={{ accentColor: '#7B5233', width: '15px', height: '15px', cursor: exportOptions.listSelected ? 'pointer' : 'default' }}
                    />
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '14px 8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={exportOptions.docsSelected} 
                        onChange={(e) => setExportOptions({ ...exportOptions, docsSelected: e.target.checked })} 
                        style={{ accentColor: '#7B5233', width: '15px', height: '15px' }}
                      />
                      Xuất tài liệu
                    </label>
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={exportOptions.docsAll} 
                      disabled={!exportOptions.docsSelected}
                      onChange={(e) => setExportOptions({ ...exportOptions, docsAll: e.target.checked })} 
                      style={{ accentColor: '#7B5233', width: '15px', height: '15px', cursor: exportOptions.docsSelected ? 'pointer' : 'default' }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={handleConfirmExport}
                disabled={!exportOptions.listSelected && !exportOptions.docsSelected}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', 
                  backgroundColor: (!exportOptions.listSelected && !exportOptions.docsSelected) ? '#cbd5e1' : '#5D3B32', 
                  color: '#fff', border: 'none', borderRadius: '8px', cursor: (!exportOptions.listSelected && !exportOptions.docsSelected) ? 'default' : 'pointer', 
                  fontWeight: '700', fontSize: '13px'
                }}
              >
                <FileDown size={16} />
                Xuất dữ liệu
              </button>
              <button 
                onClick={() => setShowExportModal(false)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', 
                  backgroundColor: '#5D3B32', color: '#fff', border: 'none', borderRadius: '8px', 
                  cursor: 'pointer', fontWeight: '700', fontSize: '13px' 
                }}
              >
                <X size={16} />
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Handover Modal */}
      {showHandoverModal && (
        <EquipmentHandover 
          id={handoverEquipmentId} 
          onClose={() => { setShowHandoverModal(false); setHandoverEquipmentId(null); }} 
          onSaved={() => { fetchEquipments(); }} 
        />
      )}
    </div>
  );
};

export default EquipmentManagementView;
