import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, Search, Plus, Trash2, Edit, X, Save 
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import '@styles/components.css';

const EmployeeManagementView = () => {
  const { toast } = useToast();
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/employees');

  useEffect(() => {
    if (typeof setCustomTitle === 'function') setCustomTitle(title);
    if (typeof setCustomSubtitle === 'function') setCustomSubtitle(subtitle || '');
    if (typeof setCustomScreenCode === 'function') setCustomScreenCode(screenCode || '');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, title, subtitle, screenCode]);
  
  // Data States
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Metadata lists
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [kpiPool, setKpiPool] = useState([]);
  const [checklistPool, setChecklistPool] = useState([]);

  // Pagination & Search States
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [activeTab, setActiveTab] = useState('kpi'); // 'kpi' | 'checklist'
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    email: '',
    phone: '',
    role_id: '',
    permission_id: '',
    department: '',
    position: '',
    status: 'Đang làm việc',
    note: '',
    kpis: [],
    checklists: []
  });
  
  // Lookup Modals
  const [isKpiLookupOpen, setIsKpiLookupOpen] = useState(false);
  const [isChecklistLookupOpen, setIsChecklistLookupOpen] = useState(false);
  const [isRoleLookupOpen, setIsRoleLookupOpen] = useState(false);
  const [isPermissionLookupOpen, setIsPermissionLookupOpen] = useState(false);
  const [lookupSearch, setLookupSearch] = useState('');

  // Delete States
  const [deleteId, setDeleteId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [actionMenuId, setActionMenuId] = useState(null);

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/employees/', {
        params: {
          page,
          size,
          search: search || undefined
        }
      });
      setEmployees(res.items || []);
      setTotalItems(res.total || 0);
      setTotalPages(res.pages || 1);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Không thể tải danh sách nhân viên. Vui lòng thử lại sau.');
      toast('error', 'Tải dữ liệu thất bại!');
    } finally {
      setLoading(false);
    }
  };

  // Fetch metadata on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [rolesRes, permsRes, kpisRes, tasksRes] = await Promise.all([
          api.get('/roles/').catch(() => []),
          api.get('/permissions/').catch(() => []),
          api.get('/kpi-management/kpi-pool').catch(() => []),
          api.get('/kpi-management/checklist-pool').catch(() => [])
        ]);
        setRoles(rolesRes || []);
        setPermissions(permsRes || []);
        setKpiPool(kpisRes || []);
        setChecklistPool(tasksRes || []);
      } catch (err) {
        console.error('Error fetching metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [page, search]);

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

  // Form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Open create modal
  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({
      employee_id: '',
      full_name: '',
      email: '',
      phone: '',
      role_id: '',
      permission_id: '',
      department: '',
      position: '',
      status: 'Đang làm việc',
      note: '',
      kpis: [],
      checklists: []
    });
    setActiveTab('kpi');
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = async (emp) => {
    try {
      setModalMode('edit');
      const response = await api.get(`/employees/${emp.id}`);
      const data = response;
      
      setFormData({
        id: data.id,
        employee_id: data.employee_id || '',
        full_name: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        role_id: data.role_id || '',
        permission_id: data.permission_id || '',
        department: data.department || '',
        position: data.position || '',
        status: data.status || 'Đang làm việc',
        note: data.note || '',
        kpis: data.kpis || [],
        checklists: data.checklists || []
      });
      setActiveTab('kpi');
      setIsModalOpen(true);
    } catch (err) {
      console.error('Error fetching employee detail:', err);
      toast('error', 'Không thể lấy thông tin chi tiết nhân viên.');
    }
  };

  // Save Employee
  const handleSaveEmployee = async () => {
    if (submittingRef.current) return;
    if (!formData.employee_id.trim() || !formData.full_name.trim()) {
      toast('warning', 'Mã và Họ tên nhân viên là bắt buộc!');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await api.post('/employees/', formData);
        toast('success', 'Thêm nhân viên thành công!');
      } else {
        await api.put(`/employees/${formData.id}`, formData);
        toast('success', 'Cập nhật thông tin thành công!');
      }
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err) {
      console.error('Error saving employee:', err);
      const errMsg = err.response?.data?.detail || 'Lưu thông tin thất bại!';
      toast('error', errMsg);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // Delete triggering
  const handleDeleteTrigger = (id) => {
    setDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/employees/${deleteId}`);
      toast('success', 'Xóa nhân viên thành công!');
      setDeleteId(null);
      fetchEmployees();
    } catch (err) {
      console.error('Error deleting employee:', err);
      toast('error', 'Không thể xóa nhân viên.');
    }
  };

  // --- KPI Grid Helpers ---
  const handleAddKpiRow = () => {
    setFormData(prev => ({
      ...prev,
      kpis: [
        ...prev.kpis,
        { kpi_code: `KPI${prev.kpis.length + 1}`, content: '', score: 100, calc_method: '', target: '', actual: '', status: 'Đạt KPI', icon: '' }
      ]
    }));
  };

  const handleRemoveKpiRow = (idx) => {
    setFormData(prev => ({
      ...prev,
      kpis: prev.kpis.filter((_, i) => i !== idx)
    }));
  };

  const handleKpiRowChange = (idx, field, value) => {
    setFormData(prev => {
      const updated = [...prev.kpis];
      updated[idx] = {
        ...updated[idx],
        [field]: value
      };
      return { ...prev, kpis: updated };
    });
  };

  const handleSelectKpiFromPool = (poolItem) => {
    const exists = formData.kpis.some(k => k.kpi_code === poolItem.kpi_code);
    if (!exists) {
      setFormData(prev => ({
        ...prev,
        kpis: [
          ...prev.kpis,
          { 
            kpi_code: poolItem.kpi_code, 
            content: poolItem.content, 
            score: 100, 
            calc_method: poolItem.calc_method, 
            target: poolItem.target,
            actual: '',
            status: 'Đạt KPI',
            icon: ''
          }
        ]
      }));
      toast('success', `Đã thêm KPI: ${poolItem.content}`);
    } else {
      toast('warning', 'KPI này đã được thêm vào danh sách.');
    }
  };

  // --- Checklist Grid Helpers ---
  const handleAddChecklistRow = () => {
    setFormData(prev => ({
      ...prev,
      checklists: [
        ...prev.checklists,
        { task_code: `CV${prev.checklists.length + 1}`, content: '', frequency: 'Hàng ngày', status_today: 'Chưa hoàn thành', perform_count: 0 }
      ]
    }));
  };

  const handleRemoveChecklistRow = (idx) => {
    setFormData(prev => ({
      ...prev,
      checklists: prev.checklists.filter((_, i) => i !== idx)
    }));
  };

  const handleChecklistRowChange = (idx, field, value) => {
    setFormData(prev => {
      const updated = [...prev.checklists];
      updated[idx] = {
        ...updated[idx],
        [field]: value
      };
      return { ...prev, checklists: updated };
    });
  };

  const handleSelectChecklistFromPool = (poolItem) => {
    const exists = formData.checklists.some(t => t.task_code === poolItem.task_code);
    if (!exists) {
      setFormData(prev => ({
        ...prev,
        checklists: [
          ...prev.checklists,
          {
            task_code: poolItem.task_code,
            content: poolItem.content,
            frequency: poolItem.frequency,
            status_today: 'Chưa hoàn thành',
            perform_count: 0
          }
        ]
      }));
      toast('success', `Đã thêm Checklist: ${poolItem.content}`);
    } else {
      toast('warning', 'Checklist này đã được thêm vào danh sách.');
    }
  };

  // Filtered Pools for Lookups
  const filteredKpiPool = useMemo(() => {
    return kpiPool.filter(item => 
      item.content?.toLowerCase().includes(lookupSearch.toLowerCase()) ||
      item.kpi_code?.toLowerCase().includes(lookupSearch.toLowerCase())
    );
  }, [kpiPool, lookupSearch]);

  const filteredChecklistPool = useMemo(() => {
    return checklistPool.filter(item => 
      item.content?.toLowerCase().includes(lookupSearch.toLowerCase()) ||
      item.task_code?.toLowerCase().includes(lookupSearch.toLowerCase())
    );
  }, [checklistPool, lookupSearch]);

  const filteredRoles = useMemo(() => {
    return roles.filter(r => 
      (r.name?.toLowerCase().includes(lookupSearch.toLowerCase())) ||
      (r.description?.toLowerCase().includes(lookupSearch.toLowerCase()))
    );
  }, [roles, lookupSearch]);

  const filteredPermissions = useMemo(() => {
    return permissions.filter(p => 
      (p.name?.toLowerCase().includes(lookupSearch.toLowerCase())) ||
      (p.description?.toLowerCase().includes(lookupSearch.toLowerCase()))
    );
  }, [permissions, lookupSearch]);

  const handleSelectRole = (role) => {
    setFormData(prev => ({
      ...prev,
      role_id: role.id,
      department: role.description || role.name
    }));
    setIsRoleLookupOpen(false);
    toast('success', `Đã chọn bộ phận: ${role.description || role.name}`);
  };

  const handleSelectPermission = (perm) => {
    setFormData(prev => ({
      ...prev,
      permission_id: perm.id,
      position: perm.description || perm.name
    }));
    setIsPermissionLookupOpen(false);
    toast('success', `Đã chọn vị trí: ${perm.description || perm.name}`);
  };

  // Generation of automatic employee ID link
  const generateAutoId = async () => {
    try {
      const res = await api.get('/employees/', { params: { page: 1, size: 100 } });
      const items = res.items || [];
      
      let maxNum = 0;
      items.forEach(emp => {
        if (emp.employee_id && emp.employee_id.startsWith('SF')) {
          const numPart = emp.employee_id.slice(2);
          const num = parseInt(numPart, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      
      const nextNum = maxNum + 1;
      const formattedNum = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
      const nextId = `SF${formattedNum}`;
      
      setFormData(prev => ({
        ...prev,
        employee_id: nextId
      }));
      toast('success', `Đã sinh mã nhân viên tự động: ${nextId}`);
    } catch (err) {
      console.error(err);
      toast('error', 'Không thể sinh mã nhân viên tự động.');
    }
  };

  return (
    <div className="employee-mgmt-container">
      {/* Styles */}
      <style>{`
        .employee-mgmt-container {
          padding: 20px;
          font-family: 'Inter', sans-serif;
          background-color: #FAF6F0;
          min-height: 100vh;
          box-sizing: border-box;
        }

        .toolbar-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: white;
          padding: 12px 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          box-shadow: 0 4px 15px rgba(139, 119, 101, 0.08);
          border: 1px solid #ECE3D5;
          flex-wrap: wrap;
          gap: 12px;
        }

        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-wrapper input {
          padding: 8px 12px 8px 36px;
          border: 1.5px solid #E5D5C5;
          border-radius: 8px;
          outline: none;
          font-size: 14px;
          color: #4A3F35;
          width: 280px;
          transition: all 0.3s ease;
        }

        .search-wrapper input:focus {
          border-color: #8B5A2B;
          box-shadow: 0 0 0 3px rgba(139, 90, 43, 0.15);
        }

        .search-wrapper svg {
          position: absolute;
          left: 12px;
          color: #8C7A6B;
        }

        .btn-action {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: #8B5A2B;
          color: white;
        }

        .btn-primary:hover {
          background: #704822;
        }

        .btn-secondary {
          background: white;
          color: #8B5A2B;
          border: 1.5px solid #8B5A2B;
        }

        /* Table Design */
        .table-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(139, 119, 101, 0.08);
          border: 1px solid #ECE3D5;
          overflow: hidden;
          margin-bottom: 20px;
        }

        .emp-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .emp-table th {
          background-color: #F8F3EC;
          color: #4A3F35;
          font-weight: 600;
          font-size: 13px;
          padding: 12px 16px;
          border-bottom: 1.5px solid #E9DEC9;
        }

        .emp-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #F0E6D8;
          color: #4A3F35;
          font-size: 14px;
        }

        .emp-table tbody tr:hover {
          background-color: #FCFAF7;
        }

        .badge-status {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-working {
          background-color: #E2F5E9;
          color: #1B5E20;
        }

        .status-left {
          background-color: #FFEBEE;
          color: #C62828;
        }

        .action-cell {
          display: flex;
          gap: 6px;
        }

        .btn-icon {
          background: #FAF5F0;
          border: 1px solid #E5D5C5;
          color: #7D6B5C;
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .btn-icon:hover {
          background: #8B5A2B;
          color: white;
          border-color: #8B5A2B;
        }

        .btn-danger-icon:hover {
          background: #D32F2F !important;
          color: white !important;
          border-color: #D32F2F !important;
        }

        /* Pagination Control */
        .pagination-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 15px;
          padding: 10px;
        }

        .pagination-info {
          font-size: 14px;
          color: #7D6B5C;
        }

        .pagination-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-page {
          background: white;
          border: 1.5px solid #E5D5C5;
          color: #4A3F35;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .btn-page:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-page.active {
          background: #8B5A2B;
          color: white;
          border-color: #8B5A2B;
        }

        /* Modal styling */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal-dialog {
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          border: 1px solid #ECE3D5;
          animation: modalFadeIn 0.3s ease;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .modal-header {
          padding: 16px 24px;
          border-bottom: 1.5px solid #F3ECE2;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #FAF7F2;
          border-top-left-radius: 16px;
          border-top-right-radius: 16px;
        }

        .modal-header h3 {
          margin: 0;
          color: #4A3F35;
          font-size: 18px;
          font-weight: 600;
        }

        .modal-close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #8C7A6B;
        }

        .modal-body {
          padding: 24px;
          overflow-y: auto;
          max-height: 60vh;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group.full-width {
          grid-column: span 2;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: #615244;
        }

        .form-group label span {
          color: red;
        }

        .form-group input, .form-group textarea, .form-group select {
          padding: 10px 12px;
          border: 1.5px solid #E2D2C2;
          border-radius: 8px;
          outline: none;
          font-size: 14px;
          color: #4A3F35;
          background-color: white;
        }

        .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
          border-color: #8B5A2B;
        }

        .modal-footer {
          padding: 16px 24px;
          border-top: 1.5px solid #F3ECE2;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background-color: #FAF7F2;
          border-bottom-left-radius: 16px;
          border-bottom-right-radius: 16px;
        }

        /* Detail Tables inside Tabs */
        .tabs-header {
          display: flex;
          border-bottom: 2px solid #E9DEC9;
          margin-top: 25px;
          margin-bottom: 15px;
          gap: 20px;
        }

        .tab-btn {
          background: none;
          border: none;
          padding: 8px 4px;
          font-size: 14px;
          font-weight: 600;
          color: #8C7A6B;
          cursor: pointer;
          position: relative;
        }

        .tab-btn.tab-btn-active {
          color: #5C3E21;
        }

        .tab-btn.tab-btn-active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2.5px;
          background-color: #5C3E21;
          border-radius: 2px;
        }

        .detail-table-card {
          border: 1px solid #ECE3D5;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 15px;
        }

        .detail-table {
          width: 100%;
          border-collapse: collapse;
        }

        .detail-table th {
          background-color: #F8F3EC;
          color: #615244;
          font-size: 12px;
          font-weight: 600;
          padding: 8px 12px;
          border-bottom: 1px solid #E2D2C2;
        }

        .detail-table td {
          padding: 8px 12px;
          border-bottom: 1px solid #F0E6D8;
        }

        .detail-table input {
          width: 100%;
          border: 1px solid #E2D2C2;
          padding: 6px 10px;
          font-size: 13px;
          border-radius: 6px;
          box-sizing: border-box;
          outline: none;
          color: #4A3F35;
        }

        .detail-table input:focus {
          border-color: #8B5A2B;
        }

        .btn-add-detail {
          background-color: #FAF5F0;
          border: 1.5px dashed #8B5A2B;
          color: #8B5A2B;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .btn-add-detail:hover {
          background-color: #F3ECE2;
        }

        /* Lookup modal inside overlays */
        .lookup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
        }

        .lookup-dialog {
          background: white;
          border-radius: 12px;
          width: 500px;
          max-width: 90%;
          box-shadow: 0 5px 25px rgba(0,0,0,0.2);
          border: 1px solid #ECE3D5;
          display: flex;
          flex-direction: column;
          max-height: 80vh;
        }

        .lookup-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }

        .lookup-list {
          list-style: none;
          padding: 0;
          margin: 12px 0 0 0;
        }

        .lookup-item {
          padding: 10px 12px;
          border-bottom: 1px solid #F0E6D8;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 2px;
          transition: background 0.2s;
        }

        .lookup-item:hover {
          background-color: #FAF6F0;
        }
      `}</style>

      {/* Page Toolbar Component */}
      <PageToolbar 
        title={title} 
        code={screenCode} 
        subtitle={subtitle} 
      />

      {/* Search and Action Toolbar */}
      <div className="toolbar-row animate-card-entrance">
        <div className="search-wrapper">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Tìm theo mã, họ tên, điện thoại..." 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        
        <button className="btn-action btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} />
          Thêm nhân viên
        </button>
      </div>

      {/* Employees Table Grid */}
      <div className="table-card animate-card-entrance">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#8C7A6B' }}>
            Đang tải dữ liệu nhân viên...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#DC2626' }}>
            {error}
          </div>
        ) : (
          <table className="emp-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>STT</th>
                <th>Mã nhân viên</th>
                <th>Họ và tên</th>
                <th>Số điện thoại</th>
                <th>Email</th>
                <th>Bộ phận (Phòng ban)</th>
                <th>Vị trí (Chức danh)</th>
                <th>Trạng thái</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {employees.length > 0 ? (
                employees.map((emp, idx) => (
                  <tr key={emp.id}>
                    <td>{(page - 1) * size + idx + 1}</td>
                    <td><strong>{emp.employee_id}</strong></td>
                    <td>{emp.full_name}</td>
                    <td>{emp.phone || '-'}</td>
                    <td>{emp.email || '-'}</td>
                    <td>{emp.role_name || emp.department || '-'}</td>
                    <td>{emp.permission_name || emp.position || '-'}</td>
                    <td>
                      <span className={`badge-status ${emp.status === 'Đang làm việc' ? 'status-working' : 'status-left'}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ position: 'relative', zIndex: actionMenuId === emp.id ? 40 : 1, textAlign: 'center' }}>
                      <button
                        className="action-btn"
                        onClick={() => setActionMenuId(actionMenuId === emp.id ? null : emp.id)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2"/>
                          <circle cx="12" cy="12" r="2"/>
                          <circle cx="12" cy="19" r="2"/>
                        </svg>
                      </button>
                      {actionMenuId === emp.id && (
                        <div className="action-menu" style={{ right: '16px', top: '35px' }}>
                          <button className="action-menu-item" onClick={() => { handleOpenEdit(emp); setActionMenuId(null); }}>Chỉnh sửa</button>
                          <button className="action-menu-item danger" onClick={() => { handleDeleteTrigger(emp.id); setActionMenuId(null); }}>Xóa</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#8C7A6B' }}>
                    Không tìm thấy nhân viên nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination component */}
      {!loading && totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Hiển thị <strong>{employees.length}</strong> trên tổng số <strong>{totalItems}</strong> bản ghi
          </div>
          <div className="pagination-buttons">
            <button 
              className="btn-page" 
              disabled={page === 1}
              onClick={() => setPage(prev => prev - 1)}
            >
              <ChevronLeft size={16} /> Trước
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button 
                key={p} 
                className={`btn-page ${page === p ? 'active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            
            <button 
              className="btn-page" 
              disabled={page === totalPages}
              onClick={() => setPage(prev => prev + 1)}
            >
              Sau <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ width: '900px' }}>
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Thêm mới nhân viên' : 'Chỉnh sửa thông tin nhân viên'}</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {/* General Info Always on Top */}
              <div className="form-grid" style={{ marginBottom: '20px' }}>
                <div className="form-group">
                  <label>Mã nhân viên <span>*</span></label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      name="employee_id" 
                      placeholder="VD: SF01"
                      value={formData.employee_id} 
                      onChange={handleInputChange}
                      style={{ flex: 1 }}
                    />
                    <button 
                      type="button" 
                      className="btn-action btn-secondary" 
                      onClick={generateAutoId}
                      style={{ padding: '8px 12px', fontSize: '12px' }}
                    >
                      Sinh mã
                    </button>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Họ và tên <span>*</span></label>
                  <input 
                    type="text" 
                    name="full_name" 
                    placeholder="VD: Nguyễn Văn A"
                    value={formData.full_name} 
                    onChange={handleInputChange} 
                  />
                </div>
                
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input 
                    type="text" 
                    name="phone" 
                    placeholder="VD: 0987654321"
                    value={formData.phone} 
                    onChange={handleInputChange} 
                  />
                </div>
                
                <div className="form-group">
                  <label>Email</label>
                  <input 
                    type="email" 
                    name="email" 
                    placeholder="VD: nv.a@smartflow.vn"
                    value={formData.email} 
                    onChange={handleInputChange} 
                  />
                </div>
                
                <div className="form-group">
                  <label>Bộ phận (Phòng ban)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      value={formData.department || (roles.find(r => r.id === formData.role_id)?.description || '')} 
                      readOnly 
                      placeholder="Chưa chọn phòng ban"
                      style={{ flex: 1, backgroundColor: '#FAF6F0' }}
                    />
                    <button 
                      type="button" 
                      className="btn-action btn-secondary" 
                      onClick={() => { setIsRoleLookupOpen(true); setLookupSearch(''); }}
                      style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#5C3E21', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      Chọn
                    </button>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Vị trí (Chức danh)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      value={formData.position || (permissions.find(p => p.id === formData.permission_id)?.description || '')} 
                      readOnly 
                      placeholder="Chưa chọn vị trí"
                      style={{ flex: 1, backgroundColor: '#FAF6F0' }}
                    />
                    <button 
                      type="button" 
                      className="btn-action btn-secondary" 
                      onClick={() => { setIsPermissionLookupOpen(true); setLookupSearch(''); }}
                      style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#5C3E21', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      Chọn
                    </button>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Trạng thái làm việc</label>
                  <select name="status" value={formData.status} onChange={handleInputChange}>
                    <option value="Đang làm việc">Đang làm việc</option>
                    <option value="Đã nghỉ việc">Đã nghỉ việc</option>
                  </select>
                </div>
                
                <div className="form-group full-width">
                  <label>Ghi chú</label>
                  <textarea 
                    name="note" 
                    placeholder="Nhập ghi chú thêm..." 
                    rows="2"
                    value={formData.note} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>

              {/* Modal Tabs Header */}
              <div className="tabs-header">
                <button 
                  className={`tab-btn ${activeTab === 'kpi' ? 'tab-btn-active' : ''}`}
                  onClick={() => setActiveTab('kpi')}
                >
                  KPI
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'checklist' ? 'tab-btn-active' : ''}`}
                  onClick={() => setActiveTab('checklist')}
                >
                  Checklist công việc
                </button>
              </div>

              {/* Tab 2: KPI list */}
              {activeTab === 'kpi' && (
                <div>
                  <div className="detail-table-card">
                    <table className="detail-table">
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>STT</th>
                          <th>Mục tiêu KPI</th>
                          <th>Cách tính</th>
                          <th>Ngưỡng chấp nhận</th>
                          <th style={{ width: '100px' }}>Trọng số</th>
                          <th style={{ width: '130px' }}>Điểm trung bình</th>
                          <th style={{ width: '80px', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.kpis.map((kpi, idx) => (
                          <tr key={idx}>
                            <td style={{ textAlign: 'center', fontSize: '13px' }}>{idx + 1}</td>
                            <td>
                              <input 
                                type="text" 
                                value={kpi.content} 
                                onChange={(e) => handleKpiRowChange(idx, 'content', e.target.value)}
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                value={kpi.calc_method} 
                                onChange={(e) => handleKpiRowChange(idx, 'calc_method', e.target.value)}
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                value={kpi.target} 
                                onChange={(e) => handleKpiRowChange(idx, 'target', e.target.value)}
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                value={kpi.score} 
                                onChange={(e) => handleKpiRowChange(idx, 'score', parseInt(e.target.value) || 0)}
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                value={kpi.actual || ''} 
                                onChange={(e) => handleKpiRowChange(idx, 'actual', e.target.value)}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button className="btn-icon btn-danger-icon" onClick={() => handleRemoveKpiRow(idx)}>
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <button className="btn-add-detail" onClick={handleAddKpiRow}>
                      + Thêm mục tiêu KPI
                    </button>
                    <button className="btn-add-detail" onClick={() => { setIsKpiLookupOpen(true); setLookupSearch(''); }}>
                      + Chọn từ thư viện KPI mẫu
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Checklist công việc */}
              {activeTab === 'checklist' && (
                <div>
                  <div className="detail-table-card">
                    <table className="detail-table">
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>STT</th>
                          <th>Nhiệm vụ checklist</th>
                          <th>Cách theo dõi (Tần suất)</th>
                          <th style={{ width: '140px' }}>Trạng thái</th>
                          <th>Ghi chú</th>
                          <th style={{ width: '80px', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.checklists.map((task, idx) => (
                          <tr key={idx}>
                            <td style={{ textAlign: 'center', fontSize: '13px' }}>{idx + 1}</td>
                            <td>
                              <input 
                                type="text" 
                                value={task.content} 
                                onChange={(e) => handleChecklistRowChange(idx, 'content', e.target.value)}
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                value={task.frequency} 
                                onChange={(e) => handleChecklistRowChange(idx, 'frequency', e.target.value)}
                              />
                            </td>
                            <td>
                              <select 
                                value={task.status_today} 
                                onChange={(e) => handleChecklistRowChange(idx, 'status_today', e.target.value)}
                                style={{ width: '100%', padding: '6px', border: '1px solid #E2D2C2', borderRadius: '6px', outline: 'none' }}
                              >
                                <option value="Chưa hoàn thành">Chưa hoàn thành</option>
                                <option value="Đang thực hiện">Đang thực hiện</option>
                                <option value="Đã hoàn thành">Đã hoàn thành</option>
                              </select>
                            </td>
                            <td>
                              <input 
                                type="text" 
                                value={task.result || ''} 
                                onChange={(e) => handleChecklistRowChange(idx, 'result', e.target.value)}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button className="btn-icon btn-danger-icon" onClick={() => handleRemoveChecklistRow(idx)}>
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <button className="btn-add-detail" onClick={handleAddChecklistRow}>
                      + Thêm công việc
                    </button>
                    <button className="btn-add-detail" onClick={() => { setIsChecklistLookupOpen(true); setLookupSearch(''); }}>
                      + Chọn từ thư viện Checklist mẫu
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn-action btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy bỏ</button>
              <button className="btn-action btn-primary" onClick={handleSaveEmployee} disabled={submitting}>
                <Save size={16} />
                {submitting ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Selection Library Modal */}
      {isKpiLookupOpen && (
        <div className="lookup-overlay">
          <div className="lookup-dialog">
            <div className="modal-header">
              <h3>Thư viện KPI mục tiêu mẫu</h3>
              <button className="modal-close-btn" onClick={() => setIsKpiLookupOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="lookup-body">
              <div className="search-wrapper" style={{ marginBottom: '12px' }}>
                <Search size={14} />
                <input 
                  type="text" 
                  placeholder="Tìm KPI..." 
                  value={lookupSearch}
                  onChange={(e) => setLookupSearch(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <ul className="lookup-list">
                {filteredKpiPool.length > 0 ? (
                  filteredKpiPool.map(item => (
                    <li key={item.id} className="lookup-item" onClick={() => handleSelectKpiFromPool(item)}>
                      <strong>{item.kpi_code} - {item.content}</strong>
                      <small style={{ color: '#8C7A6B' }}>Cách tính: {item.calc_method || 'Chưa cập nhật'}</small>
                      <small style={{ color: '#8B5A2B' }}>Mục tiêu: {item.target}</small>
                    </li>
                  ))
                ) : (
                  <li style={{ textAlign: 'center', padding: '20px', color: '#8C7A6B' }}>
                    Không có KPI nào phù hợp.
                  </li>
                )}
              </ul>
            </div>
            <div className="modal-footer" style={{ padding: '12px 20px' }}>
              <button className="btn-action btn-secondary" onClick={() => setIsKpiLookupOpen(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Checklist Selection Library Modal */}
      {isChecklistLookupOpen && (
        <div className="lookup-overlay">
          <div className="lookup-dialog">
            <div className="modal-header">
              <h3>Thư viện Checklist công việc mẫu</h3>
              <button className="modal-close-btn" onClick={() => setIsChecklistLookupOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="lookup-body">
              <div className="search-wrapper" style={{ marginBottom: '12px' }}>
                <Search size={14} />
                <input 
                  type="text" 
                  placeholder="Tìm công việc..." 
                  value={lookupSearch}
                  onChange={(e) => setLookupSearch(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <ul className="lookup-list">
                {filteredChecklistPool.length > 0 ? (
                  filteredChecklistPool.map(item => (
                    <li key={item.id} className="lookup-item" onClick={() => handleSelectChecklistFromPool(item)}>
                      <strong>{item.task_code} - {item.content}</strong>
                      <small style={{ color: '#8C7A6B' }}>Tần suất: {item.frequency}</small>
                    </li>
                  ))
                ) : (
                  <li style={{ textAlign: 'center', padding: '20px', color: '#8C7A6B' }}>
                    Không có checklist nào phù hợp.
                  </li>
                )}
              </ul>
            </div>
            <div className="modal-footer" style={{ padding: '12px 20px' }}>
              <button className="btn-action btn-secondary" onClick={() => setIsChecklistLookupOpen(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Role Selection Modal */}
      {isRoleLookupOpen && (
        <div className="lookup-overlay">
          <div className="lookup-dialog">
            <div className="modal-header">
              <h3>Chọn Bộ phận (Phòng ban)</h3>
              <button className="modal-close-btn" onClick={() => setIsRoleLookupOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="lookup-body">
              <div className="search-wrapper" style={{ marginBottom: '12px' }}>
                <Search size={14} />
                <input 
                  type="text" 
                  placeholder="Tìm phòng ban..." 
                  value={lookupSearch}
                  onChange={(e) => setLookupSearch(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <ul className="lookup-list">
                {filteredRoles.length > 0 ? (
                  filteredRoles.map(item => (
                    <li key={item.id} className="lookup-item" onClick={() => handleSelectRole(item)}>
                      <strong>{item.description || item.name}</strong>
                      <small style={{ color: '#8C7A6B' }}>Mã hệ thống: {item.name}</small>
                    </li>
                  ))
                ) : (
                  <li style={{ textAlign: 'center', padding: '20px', color: '#8C7A6B' }}>
                    Không có phòng ban nào phù hợp.
                  </li>
                )}
              </ul>
            </div>
            <div className="modal-footer" style={{ padding: '12px 20px' }}>
              <button className="btn-action btn-secondary" onClick={() => setIsRoleLookupOpen(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Selection Modal */}
      {isPermissionLookupOpen && (
        <div className="lookup-overlay">
          <div className="lookup-dialog">
            <div className="modal-header">
              <h3>Chọn Vị trí (Chức danh)</h3>
              <button className="modal-close-btn" onClick={() => setIsPermissionLookupOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="lookup-body">
              <div className="search-wrapper" style={{ marginBottom: '12px' }}>
                <Search size={14} />
                <input 
                  type="text" 
                  placeholder="Tìm chức danh..." 
                  value={lookupSearch}
                  onChange={(e) => setLookupSearch(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <ul className="lookup-list">
                {filteredPermissions.length > 0 ? (
                  filteredPermissions.map(item => (
                    <li key={item.id} className="lookup-item" onClick={() => handleSelectPermission(item)}>
                      <strong>{item.description || item.name}</strong>
                      <small style={{ color: '#8C7A6B' }}>Quyền hạn: {item.name}</small>
                    </li>
                  ))
                ) : (
                  <li style={{ textAlign: 'center', padding: '20px', color: '#8C7A6B' }}>
                    Không có chức danh nào phù hợp.
                  </li>
                )}
              </ul>
            </div>
            <div className="modal-footer" style={{ padding: '12px 20px' }}>
              <button className="btn-action btn-secondary" onClick={() => setIsPermissionLookupOpen(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <BeautifulConfirmModal 
        isOpen={deleteId !== null}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa nhân viên này khỏi hệ thống? Dữ liệu liên quan đến KPI và checklist của nhân viên này cũng sẽ bị loại bỏ."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

export default EmployeeManagementView;
