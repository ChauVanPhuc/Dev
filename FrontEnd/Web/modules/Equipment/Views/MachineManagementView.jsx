import React, { useState, useEffect, useMemo, useRef } from 'react';
import api, { getBaseURL } from '@webShared/Services/api.service';
import { useOutletContext, useNavigate } from 'react-router-dom';
import ExcelJS from 'exceljs';
import axios from 'axios';
import { 
  Search, Filter, Plus, Edit, FileUp, FileDown, X, Layers, Settings, Eye, CheckCircle2, AlertTriangle, Hammer
} from 'lucide-react';
import '@styles/components.css';

const MachineManagementView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra } = useOutletContext();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // Data States
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Sorting & Filtering States
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortField, setSortField] = useState('code');
  const [sortOrder, setSortOrder] = useState('asc');
  const [actionMenuId, setActionMenuId] = useState(null);

  // Create/Edit Modal State
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [formData, setFormData] = useState({
    code: '', name: '', status: 'Hoạt động bình thường',
    factory: '', department: '', receive_date: '',
    origin: '', supplier: '', maintenance_cycle: 30,
    next_maintenance_date: '', last_maintenance_date: '',
    notes: '', images: '', qr_code: '', daily_run_time: '',
    productivity: '', production_year: '', owner_name: ''
  });

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const data = await api.get('/machines/');
      setMachines(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Lỗi khi tải danh sách máy móc:', error);
      setMessage({ type: 'error', text: 'Không thể tải danh sách máy móc từ hệ thống.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCustomScreenCode('MC37');
    setCustomTitle('Danh sách thiết bị máy móc');
    setCustomSubtitle('Hệ thống quản lý, lập lịch bảo trì và kiểm soát tình trạng thiết bị máy móc sản xuất.');
    fetchMachines();
  }, []);

  // Dynamic filter options lists
  const uniqueFactories = useMemo(() => {
    const list = new Set();
    machines.forEach(m => { if (m.factory) list.add(m.factory); });
    return ['All', ...Array.from(list)];
  }, [machines]);

  const uniqueDepartments = useMemo(() => {
    const list = new Set();
    machines.forEach(m => { if (m.department) list.add(m.department); });
    return ['All', ...Array.from(list)];
  }, [machines]);

  const uniqueStatuses = useMemo(() => {
    const list = new Set();
    machines.forEach(m => { if (m.status) list.add(m.status); });
    return ['All', ...Array.from(list)];
  }, [machines]);

  // Filtered and Sorted machines
  const filteredMachines = useMemo(() => {
    let result = machines.filter(m => {
      // 1. Search term match
      const codeStr = m.code ? m.code.toString().toLowerCase() : '';
      const nameStr = m.name ? m.name.toString().toLowerCase() : '';
      const factoryStr = m.factory ? m.factory.toString().toLowerCase() : '';
      const deptStr = m.department ? m.department.toString().toLowerCase() : '';
      const term = searchTerm.toLowerCase();

      const matchesSearch = 
        codeStr.includes(term) ||
        nameStr.includes(term) ||
        factoryStr.includes(term) ||
        deptStr.includes(term);

      // 2. Factory match
      const matchesFactory = selectedFactory === 'All' || m.factory === selectedFactory;

      // 3. Department match
      const matchesDepartment = selectedDepartment === 'All' || m.department === selectedDepartment;

      // 4. Status match
      const matchesStatus = selectedStatus === 'All' || m.status === selectedStatus;

      return matchesSearch && matchesFactory && matchesDepartment && matchesStatus;
    });

    // Apply Sorting
    result.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (sortField === 'next_maintenance_date' || sortField === 'last_maintenance_date') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      } else {
        valA = valA.toString().toLowerCase();
        valB = valB.toString().toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [machines, searchTerm, selectedFactory, selectedDepartment, selectedStatus, sortField, sortOrder]);

  // Handle Edit click
  const handleEditClick = (machine) => {
    setEditingMachine(machine);
    setFormData({
      code: machine.code || '',
      name: machine.name || '',
      status: machine.status || 'Hoạt động bình thường',
      factory: machine.factory || '',
      department: machine.department || '',
      receive_date: machine.receive_date || '',
      origin: machine.origin || '',
      supplier: machine.supplier || '',
      maintenance_cycle: machine.maintenance_cycle || 30,
      next_maintenance_date: machine.next_maintenance_date || '',
      last_maintenance_date: machine.last_maintenance_date || '',
      notes: machine.notes || '',
      images: machine.images || '',
      qr_code: machine.qr_code || '',
      daily_run_time: machine.daily_run_time || '',
      productivity: machine.productivity || '',
      production_year: machine.production_year || '',
      owner_name: machine.owner_name || ''
    });
    setShowAddEditModal(true);
  };

  // Handle Add New click
  const handleAddNewClick = () => {
    setEditingMachine(null);
    setFormData({
      code: '', name: '', status: 'Hoạt động bình thường',
      factory: '', department: '', receive_date: '',
      origin: '', supplier: '', maintenance_cycle: 30,
      next_maintenance_date: '', last_maintenance_date: '',
      notes: '', images: '', qr_code: '', daily_run_time: '',
      productivity: '', production_year: '', owner_name: ''
    });
    setShowAddEditModal(true);
  };

  // Submit create/edit form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMachine) {
        await api.put(`/machines/${editingMachine.id}`, formData);
        setMessage({ type: 'success', text: `Đã cập nhật máy "${formData.name}" thành công.` });
      } else {
        await api.post('/machines/', formData);
        setMessage({ type: 'success', text: `Đã khai báo máy mới "${formData.name}" thành công.` });
      }
      setShowAddEditModal(false);
      fetchMachines();
    } catch (error) {
      console.error('Lỗi khi lưu thông tin máy:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Không thể lưu thông tin thiết bị.' });
    }
  };

  // Handle Delete machine
  const handleDelete = async (machine) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa máy "${machine.name}" (${machine.code})?`)) {
      try {
        await api.delete(`/machines/${machine.id}`);
        setMessage({ type: 'success', text: `Đã xóa máy ${machine.name} thành công.` });
        fetchMachines();
      } catch (error) {
        console.error('Lỗi khi xóa máy:', error);
        setMessage({ type: 'error', text: error.response?.data?.detail || 'Không thể xóa máy.' });
      }
    }
  };

  // Handle Excel Import
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const importFormData = new FormData();
    importFormData.append('file', file);

    const token = localStorage.getItem('token');


    try {
      const response = await axios.post(
        `${getBaseURL()}/api/v1/machines/import-excel`,
        importFormData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );
      setMessage({ type: 'success', text: response.data.message || 'Nhập dữ liệu Excel thành công!' });
      fetchMachines();
    } catch (error) {
      console.error('Lỗi khi import Excel:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Có lỗi xảy ra khi nhập dữ liệu từ Excel.' });
      setLoading(false);
    } finally {
      e.target.value = ''; // Reset file input
    }
  };

  // Handle Excel Export
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Danh sách máy móc');
      sheet.columns = [
        { header: 'Mã máy', key: 'code', width: 15 },
        { header: 'Tên máy', key: 'name', width: 30 },
        { header: 'Nhà máy', key: 'factory', width: 25 },
        { header: 'Bộ phận', key: 'department', width: 20 },
        { header: 'Tình trạng máy', key: 'status', width: 20 },
        { header: 'Chu kỳ bảo trì (ngày)', key: 'maintenance_cycle', width: 20 },
        { header: 'Ngày bảo trì gần nhất', key: 'last_maintenance_date', width: 20 },
        { header: 'Ngày bảo trì dự kiến', key: 'next_maintenance_date', width: 20 },
        { header: 'Xuất xứ', key: 'origin', width: 15 },
        { header: 'Nhà cung cấp', key: 'supplier', width: 20 },
        { header: 'Người phụ trách', key: 'owner_name', width: 20 },
        { header: 'Năng suất', key: 'productivity', width: 15 },
        { header: 'Năm sản xuất', key: 'production_year', width: 15 },
        { header: 'Ghi chú', key: 'notes', width: 30 }
      ];

      filteredMachines.forEach(m => {
        sheet.addRow({
          code: m.code,
          name: m.name,
          factory: m.factory || '',
          department: m.department || '',
          status: m.status || 'Hoạt động bình thường',
          maintenance_cycle: m.maintenance_cycle || '',
          last_maintenance_date: m.last_maintenance_date || '',
          next_maintenance_date: m.next_maintenance_date || '',
          origin: m.origin || '',
          supplier: m.supplier || '',
          owner_name: m.owner_name || '',
          productivity: m.productivity || '',
          production_year: m.production_year || '',
          notes: m.notes || ''
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Danh_Sach_May_Moc_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      
      setMessage({ type: 'success', text: 'Xuất dữ liệu Excel thành công.' });
    } catch (err) {
      console.error("Lỗi khi xuất file Excel:", err);
      setMessage({ type: 'error', text: 'Có lỗi xảy ra khi xuất file Excel.' });
    }
  };

  const btnStyle = { 
    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', 
    backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '8px', 
    cursor: 'pointer', fontWeight: '700', fontSize: '13px', transition: 'background 0.2s'
  };

  return (
    <div style={{ padding: '5px 20px 20px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Hidden File Input for Excel Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".xlsx, .xls"
        onChange={handleImportExcel}
      />

      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 20px', backgroundColor: '#fff', borderRadius: '12px',
        border: '1px solid #EADCC9', width: '100%', marginBottom: '10px',
        gap: '15px', flexWrap: 'wrap', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#7B5233' }} size={16} />
            <input 
              type="text" 
              placeholder="Nhập mã hoặc tên máy..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%', padding: '8px 12px 8px 38px', border: '1.5px solid #EADCC9', 
                borderRadius: '8px', outline: 'none', fontSize: '13px',
                backgroundColor: '#fff', color: '#7B5233'
              }}
            />
          </div>
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => {
                setShowSortDropdown(!showSortDropdown);
                setShowFilterDropdown(false);
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '34px', height: '34px', border: 'none', background: 'none',
                cursor: 'pointer', color: '#7B5233',
                backgroundColor: showSortDropdown ? '#FAF6F0' : 'transparent',
                borderRadius: '8px'
              }}
              title="Sắp xếp"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 18V4"></path>
              </svg>
            </button>
            {showSortDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: '0', backgroundColor: '#fff',
                border: '1px solid #cbd5e1', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                zIndex: 1100, minWidth: '220px', padding: '12px', marginTop: '5px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Cột sắp xếp</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {[
                    { field: 'code', label: 'Mã máy' },
                    { field: 'name', label: 'Tên máy' },
                    { field: 'next_maintenance_date', label: 'Ngày bảo trì tiếp theo' }
                  ].map(opt => (
                    <label key={opt.field} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#334155' }}>
                      <input 
                        type="radio" 
                        name="sortField" 
                        checked={sortField === opt.field}
                        onChange={() => setSortField(opt.field)}
                        style={{ accentColor: '#7B5233' }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Thứ tự</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#334155' }}>
                      <input 
                        type="radio" 
                        name="sortOrder" 
                        checked={sortOrder === 'asc'}
                        onChange={() => setSortOrder('asc')}
                        style={{ accentColor: '#7B5233' }}
                      />
                      Tăng dần
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#334155' }}>
                      <input 
                        type="radio" 
                        name="sortOrder" 
                        checked={sortOrder === 'desc'}
                        onChange={() => setSortOrder('desc')}
                        style={{ accentColor: '#7B5233' }}
                      />
                      Giảm dần
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => {
                setShowFilterDropdown(!showFilterDropdown);
                setShowSortDropdown(false);
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '34px', height: '34px', border: 'none', background: 'none',
                cursor: 'pointer', color: '#7B5233',
                backgroundColor: showFilterDropdown ? '#FAF6F0' : 'transparent',
                borderRadius: '8px'
              }}
              title="Bộ lọc nâng cao"
            >
              <Filter size={20} strokeWidth={2.5} />
            </button>
            {showFilterDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: '0', backgroundColor: '#fff',
                border: '1px solid #cbd5e1', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                zIndex: 1100, minWidth: '260px', padding: '16px', marginTop: '5px',
                display: 'flex', flexDirection: 'column', gap: '12px'
              }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Nhà máy</label>
                  <select 
                    value={selectedFactory}
                    onChange={(e) => { setSelectedFactory(e.target.value); setPage(1); }}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  >
                    {uniqueFactories.map(f => (
                      <option key={f} value={f}>{f === 'All' ? 'Tất cả nhà máy' : f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Bộ phận</label>
                  <select 
                    value={selectedDepartment}
                    onChange={(e) => { setSelectedDepartment(e.target.value); setPage(1); }}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  >
                    {uniqueDepartments.map(d => (
                      <option key={d} value={d}>{d === 'All' ? 'Tất cả bộ phận' : d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Tình trạng</label>
                  <select 
                    value={selectedStatus}
                    onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  >
                    {uniqueStatuses.map(s => (
                      <option key={s} value={s}>{s === 'All' ? 'Tất cả trạng thái' : s}</option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={() => {
                    setSelectedFactory('All');
                    setSelectedDepartment('All');
                    setSelectedStatus('All');
                    setPage(1);
                  }}
                  style={{
                    padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px',
                    fontSize: '12px', fontWeight: 'bold', color: '#64748b', cursor: 'pointer',
                    backgroundColor: '#f8fafc', transition: 'background 0.2s', textAlign: 'center'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons on the Right */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => fileInputRef.current.click()} style={btnStyle}>
            <FileUp size={14} /> Nhập dữ liệu
          </button>

          <button onClick={handleExportExcel} style={btnStyle}>
            <FileDown size={14} /> Xuất dữ liệu
          </button>

          <button onClick={handleAddNewClick} style={{...btnStyle, backgroundColor: '#5c3924'}}>
            <Plus size={14} /> Thêm mới
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
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <span style={{ fontWeight: '600' }}>{message.text}</span>
          <X size={18} onClick={() => setMessage({type:'', text:''})} style={{ cursor: 'pointer', opacity: 0.5 }} />
        </div>
      )}

      {/* Bảng Dữ Liệu */}
      <div className="admin-list-layout">
        <div className="mgmt-table card admin-table-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #E5E7EB', borderRadius: '16px' }}>
          {loading ? (
            <div className="loading-state" style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid #7B5233', borderTopColor: 'transparent', borderRadius: '50%', animation: 'mgmtSpin 1s linear infinite', margin: '0 auto 15px auto' }} />
              Đang tải danh sách máy móc...
            </div>
          ) : (
            <>
              {/* Bảng Desktop */}
              <div className="table-responsive desktop-only admin-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '110px' }}>Mã</th>
                      <th>Tên máy</th>
                      <th>Nhà máy</th>
                      <th>Bộ phận</th>
                      <th>Tình trạng</th>
                      <th>Ngày Bảo Trì gần nhất</th>
                      <th>Ngày bảo trì tiếp theo</th>
                      <th style={{ textAlign: 'center', width: '120px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMachines.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8', padding: '4rem' }}>
                          <Hammer size={48} style={{ margin: '0 auto 15px auto', opacity: 0.3, color: '#7B5233' }} />
                          Không tìm thấy máy móc nào phù hợp. Vui lòng thêm mới hoặc nhập dữ liệu Excel.
                        </td>
                      </tr>
                    ) : (
                      filteredMachines.slice((page - 1) * pageSize, page * pageSize).map((m) => (
                        <tr 
                          key={m.id} 
                          className="animate-card-entrance"
                          style={{ 
                            position: 'relative', 
                            zIndex: actionMenuId === m.id ? 100 : 'auto' 
                          }}
                        >
                          <td>
                            <span 
                              style={{ fontWeight: '800', color: '#7B5233', cursor: 'pointer', textDecoration: 'underline' }}
                              onClick={() => navigate(`/admin/machines/detail/${m.id}`)}
                            >
                              {m.code}
                            </span>
                          </td>
                          <td style={{ fontWeight: '700', color: '#1e293b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#7B5233',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                                fontWeight: '800', fontSize: '12px', flexShrink: 0
                              }}>
                                {m.name ? m.name.charAt(0).toUpperCase() : 'M'}
                              </div>
                              <span>{m.name}</span>
                            </div>
                          </td>
                          <td>{m.factory || '—'}</td>
                          <td>{m.department || '—'}</td>
                          <td>
                            <span style={{
                              padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800',
                              backgroundColor: m.status?.includes('bình thường') || m.status === 'Bình thường' ? '#dcfce7' : m.status?.includes('Bảo trì') ? '#fef3c7' : '#fee2e2',
                              color: m.status?.includes('bình thường') || m.status === 'Bình thường' ? '#15803d' : m.status?.includes('Bảo trì') ? '#b45309' : '#b91c1c',
                              display: 'inline-block'
                            }}>
                              {m.status || 'Bình thường'}
                            </span>
                          </td>
                          <td>{m.last_maintenance_date || '—'}</td>
                          <td style={{ color: m.next_maintenance_date && new Date(m.next_maintenance_date) < new Date() ? '#ef4444' : '#475569', fontWeight: '600' }}>
                            {m.next_maintenance_date || '—'}
                          </td>
                          <td style={{ textAlign: 'center', position: 'relative', zIndex: actionMenuId === m.id ? 50 : 'auto' }}>
                            <button 
                              onClick={() => setActionMenuId(actionMenuId === m.id ? null : m.id)}
                              style={{
                                background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569',
                                borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 'bold',
                                fontSize: '14px', transition: 'all 0.2s'
                              }}
                              className="action-menu-btn"
                            >
                              ...
                            </button>
                            {actionMenuId === m.id && (
                              <div style={{
                                position: 'absolute', right: '10px', top: '100%', backgroundColor: '#fff',
                                border: '1px solid #cbd5e1', borderRadius: '8px', zIndex: 1100,
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '5px 0', minWidth: '130px'
                              }}>
                                <div 
                                  onClick={() => { setActionMenuId(null); navigate(`/admin/machines/detail/${m.id}`); }}
                                  style={{ padding: '8px 16px', fontSize: '13px', cursor: 'pointer', textAlign: 'left', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}
                                  className="dropdown-hover"
                                >
                                  Xem chi tiết
                                </div>
                                <div 
                                  onClick={() => { setActionMenuId(null); handleEditClick(m); }}
                                  style={{ padding: '8px 16px', fontSize: '13px', cursor: 'pointer', textAlign: 'left', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}
                                  className="dropdown-hover"
                                >
                                  Chỉnh sửa
                                </div>
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
              <div className="mobile-only mgmt-cards-container" style={{ padding: '15px' }}>
                {filteredMachines.length === 0 && <div className="no-data-text-mobile">Không tìm thấy dữ liệu</div>}
                {filteredMachines.slice((page - 1) * pageSize, page * pageSize).map((m) => (
                  <div key={m.id} className="mgmt-card animate-card-entrance" style={{ border: '1px solid #E5E7EB', borderRadius: '12px', padding: '12px', marginBottom: '10px', backgroundColor: '#fff' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#7B5233',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                        fontWeight: '800', fontSize: '14px', flexShrink: 0
                      }}>
                        {m.name ? m.name.charAt(0).toUpperCase() : 'M'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{m.name}</h4>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#7B5233' }}>{m.code}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                          <span style={{ fontSize: '10px', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#64748b' }}>{m.factory || 'Nhà máy'}</span>
                          <span style={{ fontSize: '10px', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#64748b' }}>{m.department || 'Tổ'}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '10px', fontSize: '11px', color: '#64748b' }}>
                      <span>Bảo trì tiếp theo: <strong style={{ color: '#334155' }}>{m.next_maintenance_date || '—'}</strong></span>
                      <span style={{
                        padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700',
                        backgroundColor: m.status?.includes('bình thường') || m.status === 'Bình thường' ? '#dcfce7' : '#fee2e2',
                        color: m.status?.includes('bình thường') || m.status === 'Bình thường' ? '#15803d' : '#b91c1c'
                      }}>{m.status || 'Bình thường'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                      <button onClick={() => navigate(`/admin/machines/detail/${m.id}`)} style={{ border: 'none', background: 'none', color: '#64748b', fontSize: '12px', fontWeight: '700' }}>Chi tiết</button>
                      <button onClick={() => handleEditClick(m)} style={{ border: 'none', background: 'none', color: '#7B5233', fontSize: '12px', fontWeight: '700' }}>Sửa</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {filteredMachines.length > 0 && (() => {
                const totalPages = Math.ceil(filteredMachines.length / pageSize);
                
                const getPaginationButtons = () => {
                  const buttons = [];
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) buttons.push(i);
                  } else {
                    buttons.push(1);
                    if (page > 4) buttons.push('...');
                    
                    const rangeStart = Math.max(2, page - 2);
                    const rangeEnd = Math.min(totalPages - 1, page + 2);
                    
                    for (let i = rangeStart; i <= rangeEnd; i++) buttons.push(i);
                    
                    if (page < totalPages - 3) buttons.push('...');
                    buttons.push(totalPages);
                  }
                  return buttons;
                };

                const buttons = getPaginationButtons();

                return (
                  <div className="admin-pagination-desktop" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <span className="pagination-info" style={{ fontWeight: '600', color: '#64748b', fontSize: '13px' }}>
                        Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredMachines.length)} / {filteredMachines.length} máy móc
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Số dòng hiển thị:</span>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setPage(1);
                          }}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1.5px solid #EADCC9',
                            fontSize: '13px',
                            color: '#7B5233',
                            backgroundColor: '#fff',
                            cursor: 'pointer',
                            outline: 'none',
                            fontWeight: '600'
                          }}
                        >
                          <option value={15}>15</option>
                          <option value={30}>30</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                    </div>
                    <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <button 
                        disabled={page === 1} 
                        onClick={() => setPage(prev => Math.max(prev - 1, 1))} 
                        className="page-btn"
                      >
                        Trước
                      </button>
                      
                      {buttons.map((btn, idx) => (
                        btn === '...' ? (
                          <span key={`ellipsis-${idx}`} style={{ color: '#7B5233', fontSize: '13px', padding: '0 6px', fontWeight: 'bold' }}>...</span>
                        ) : (
                          <button
                            key={btn}
                            className={`page-btn ${btn === page ? 'active' : ''}`}
                            onClick={() => setPage(btn)}
                          >
                            {btn}
                          </button>
                        )
                      ))}

                      <button 
                        disabled={page >= totalPages} 
                        onClick={() => setPage(prev => Math.min(prev + 1, totalPages))} 
                        className="page-btn"
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* Add / Edit Machine Modal */}
      {showAddEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', width: '700px', padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #EADCC9',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1.5px solid #F1F5F9', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#7B5233' }}>
                {editingMachine ? 'Chỉnh sửa thông tin máy' : 'Khai báo máy móc sản xuất mới'}
              </h3>
              <button onClick={() => setShowAddEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Mã máy *</label>
                <input 
                  type="text" 
                  required
                  disabled={editingMachine !== null}
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  placeholder="Ví dụ: MC04748"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Tên máy *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ví dụ: MÁY KHOAN 1 ĐẦU"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nhà máy (Xưởng)</label>
                <input 
                  type="text" 
                  value={formData.factory}
                  onChange={(e) => setFormData({...formData, factory: e.target.value})}
                  placeholder="Ví dụ: NHÀ MÁY -2"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Tổ (Bộ phận phụ trách)</label>
                <input 
                  type="text" 
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  placeholder="Ví dụ: ĐỊNH HÌNH"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Tình trạng</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                >
                  <option value="Hoạt động bình thường">Hoạt động bình thường</option>
                  <option value="Cần bảo trì">Cần bảo trì</option>
                  <option value="Đang bảo trì">Đang bảo trì</option>
                  <option value="Tạm ngưng / Hỏng">Tạm ngưng / Hỏng</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Người phụ trách</label>
                <input 
                  type="text" 
                  value={formData.owner_name}
                  onChange={(e) => setFormData({...formData, owner_name: e.target.value})}
                  placeholder="Tên nhân viên phụ trách"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Xuất xứ</label>
                <input 
                  type="text" 
                  value={formData.origin}
                  onChange={(e) => setFormData({...formData, origin: e.target.value})}
                  placeholder="Ví dụ: TRUNG QUỐC, NHẬT BẢN"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nhà cung cấp</label>
                <input 
                  type="text" 
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  placeholder="Tên nhà cung cấp máy"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Chu kỳ bảo trì (ngày)</label>
                <input 
                  type="number" 
                  value={formData.maintenance_cycle}
                  onChange={(e) => setFormData({...formData, maintenance_cycle: parseInt(e.target.value) || 30})}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ngày nhận máy (Về xưởng)</label>
                <input 
                  type="date" 
                  value={formData.receive_date}
                  onChange={(e) => setFormData({...formData, receive_date: e.target.value})}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ngày đã bảo trì gần nhất</label>
                <input 
                  type="date" 
                  value={formData.last_maintenance_date}
                  onChange={(e) => setFormData({...formData, last_maintenance_date: e.target.value})}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Ngày bảo trì dự kiến tiếp theo</label>
                <input 
                  type="date" 
                  value={formData.next_maintenance_date}
                  onChange={(e) => setFormData({...formData, next_maintenance_date: e.target.value})}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>QR Code của máy</label>
                <input 
                  type="text" 
                  value={formData.qr_code}
                  onChange={(e) => setFormData({...formData, qr_code: e.target.value})}
                  placeholder="Ví dụ: MC-VINAG7-DINHHINH-75286"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Đường dẫn ảnh máy</label>
                <input 
                  type="text" 
                  value={formData.images}
                  onChange={(e) => setFormData({...formData, images: e.target.value})}
                  placeholder="URL hình ảnh sản phẩm"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', outline: 'none' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Mô tả công việc bảo trì / Ghi chú</label>
                <textarea 
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Nhập ghi chú hoặc mô tả các hạng mục công việc cần bảo trì..."
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddEditModal(false)} style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                  Hủy bỏ
                </button>
                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineManagementView;
