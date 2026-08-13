import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, Search, Plus, Trash2, Edit, Save, X, 
  Settings, FolderTree, Layers, Table as TableIcon, Network, HelpCircle 
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import '@styles/components.css';

const OrgStructureManagementView = () => {
  const { toast } = useToast();
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/hr/structures');

  useEffect(() => {
    if (typeof setCustomTitle === 'function') setCustomTitle(title || 'Quản lý cấu trúc tổ chức');
    if (typeof setCustomSubtitle === 'function') setCustomSubtitle(subtitle || 'Thiết lập cấu trúc cây tổ chức, chức vụ và định biên nhân sự');
    if (typeof setCustomScreenCode === 'function') setCustomScreenCode(screenCode || 'NS02');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, title, subtitle, screenCode]);
  
  // Data States
  const [nodes, setNodes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [kpiPool, setKpiPool] = useState([]);
  const [checklistPool, setChecklistPool] = useState([]);
  
  // Loading & UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'chart'
  const [selectedChart, setSelectedChart] = useState('Sơ đồ nhân sự');
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [activeTab, setActiveTab] = useState('kpi'); // 'kpi' | 'checklist'
  const [currentNode, setCurrentNode] = useState(null);
  
  // Lookup Modals
  const [isKpiLookupOpen, setIsKpiLookupOpen] = useState(false);
  const [isChecklistLookupOpen, setIsChecklistLookupOpen] = useState(false);
  const [isRoleLookupOpen, setIsRoleLookupOpen] = useState(false);
  const [isPermissionLookupOpen, setIsPermissionLookupOpen] = useState(false);
  const [lookupSearch, setLookupSearch] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    level: 1,
    parent_id: '',
    description: '',
    employee_id: '',
    role_id: '',
    permission_id: '',
    note: '',
    kpis: [],
    tasks: []
  });

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState(null);
  const [actionMenuId, setActionMenuId] = useState(null);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [
        orgRes, 
        accRes, 
        rolesRes, 
        permsRes, 
        kpisRes, 
        checklistsRes
      ] = await Promise.all([
        api.get('/org-structures'),
        api.get('/employees?size=100'),
        api.get('/roles'),
        api.get('/permissions'),
        api.get('/kpi-management/kpi-pool').catch(() => ({ data: [] })),
        api.get('/kpi-management/checklist-pool').catch(() => ({ data: [] }))
      ]);

      setNodes(orgRes || []);
      setAccounts(accRes.items || accRes || []);
      setRoles(rolesRes || []);
      setPermissions(permsRes || []);
      setKpiPool(kpisRes || []);
      setChecklistPool(checklistsRes || []);
    } catch (err) {
      console.error('Failed to load org structure data:', err);
      setError('Không thể tải dữ liệu sơ đồ tổ chức. Vui lòng kiểm tra lại kết nối mạng.');
      toast('error', 'Tải dữ liệu thất bại!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      const matchSearch = 
        node.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.position_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.role_name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [nodes, searchTerm]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({
      name: '',
      level: 1,
      parent_id: '',
      description: '',
      employee_id: '',
      role_id: '',
      permission_id: '',
      note: '',
      kpis: [],
      tasks: []
    });
    setActiveTab('kpi');
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = async (nodeId) => {
    try {
      setModalMode('edit');
      const response = await api.get(`/org-structures/${nodeId}`);
      const data = response;
      
      setFormData({
        id: data.id,
        name: data.name || '',
        level: data.level || 1,
        parent_id: data.parent_id || '',
        description: data.description || '',
        employee_id: data.employee_id || '',
        role_id: data.role_id || '',
        permission_id: data.permission_id || '',
        note: data.note || '',
        kpis: data.kpis || [],
        tasks: data.tasks || []
      });
      setActiveTab('kpi');
      setIsModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch node detail:', err);
      toast('error', 'Không thể lấy thông tin chi tiết.');
    }
  };

  // Form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save Node (Create / Update)
  const handleSaveNode = async () => {
    if (!formData.name.trim()) {
      toast('warning', 'Vui lòng nhập tên sơ đồ!');
      return;
    }

    // Clean data formats
    const payload = {
      ...formData,
      parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
      employee_id: formData.employee_id ? parseInt(formData.employee_id) : null,
      role_id: formData.role_id ? parseInt(formData.role_id) : null,
      permission_id: formData.permission_id ? parseInt(formData.permission_id) : null,
      level: parseInt(formData.level)
    };

    try {
      if (modalMode === 'create') {
        await api.post('/org-structures/', payload);
        toast('success', 'Tạo nút sơ đồ thành công!');
      } else {
        await api.put(`/org-structures/${formData.id}`, payload);
        toast('success', 'Cập nhật sơ đồ thành công!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error saving node:', err);
      toast('error', 'Lưu dữ liệu thất bại!');
    }
  };

  // Delete Node Trigger
  const handleDeleteTrigger = (id) => {
    setDeleteId(id);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/org-structures/${deleteId}`);
      toast('success', 'Đã xóa và cập nhật cây phân cấp!');
      setDeleteId(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting node:', err);
      toast('error', 'Xóa thất bại!');
    }
  };

  // --- KPI Grid Helpers ---
  const handleAddKpiRow = () => {
    setFormData(prev => ({
      ...prev,
      kpis: [
        ...prev.kpis,
        { kpi_objective: '', calculation: '', acceptance_threshold: '', weight: 10, average_score: 0 }
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

  // --- Checklist Grid Helpers ---
  const handleAddTaskRow = () => {
    setFormData(prev => ({
      ...prev,
      tasks: [
        ...prev.tasks,
        { task_name: '', tracking_method: '', status: 'Chưa bắt đầu', note: '' }
      ]
    }));
  };

  const handleRemoveTaskRow = (idx) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== idx)
    }));
  };

  const handleTaskRowChange = (idx, field, value) => {
    setFormData(prev => {
      const updated = [...prev.tasks];
      updated[idx] = {
        ...updated[idx],
        [field]: value
      };
      return { ...prev, tasks: updated };
    });
  };

  // --- Lookup Modals Logic ---
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
      r.name?.toLowerCase().includes(lookupSearch.toLowerCase()) ||
      r.description?.toLowerCase().includes(lookupSearch.toLowerCase())
    );
  }, [roles, lookupSearch]);

  const filteredPermissions = useMemo(() => {
    return permissions.filter(p => 
      p.name?.toLowerCase().includes(lookupSearch.toLowerCase()) ||
      p.description?.toLowerCase().includes(lookupSearch.toLowerCase())
    );
  }, [permissions, lookupSearch]);

  const handleSelectRole = (role) => {
    setFormData(prev => ({
      ...prev,
      role_id: role.id
    }));
    setIsRoleLookupOpen(false);
    toast('success', `Đã chọn bộ phận: ${role.description || role.name}`);
  };

  const handleSelectPermission = (perm) => {
    setFormData(prev => ({
      ...prev,
      permission_id: perm.id
    }));
    setIsPermissionLookupOpen(false);
    toast('success', `Đã chọn vị trí: ${perm.description || perm.name}`);
  };

  const selectKpiFromPool = (poolItem) => {
    setFormData(prev => ({
      ...prev,
      kpis: [
        ...prev.kpis,
        { 
          kpi_objective: poolItem.content, 
          calculation: poolItem.calc_method || 'Đếm số lượng', 
          acceptance_threshold: poolItem.target || 'Đầy đủ', 
          weight: 10, 
          average_score: 0 
        }
      ]
    }));
    setIsKpiLookupOpen(false);
    setLookupSearch('');
  };

  const selectChecklistFromPool = (poolItem) => {
    setFormData(prev => ({
      ...prev,
      tasks: [
        ...prev.tasks,
        { 
          task_name: poolItem.content, 
          tracking_method: poolItem.frequency || 'Hàng ngày', 
          status: 'Chưa bắt đầu', 
          note: '' 
        }
      ]
    }));
    setIsChecklistLookupOpen(false);
    setLookupSearch('');
  };

  // Recursive Tree Rendering Helper (for Diagram View)
  const renderTreeNodes = (parentId = null) => {
    const children = nodes.filter(n => n.parent_id === parentId);
    if (children.length === 0) return null;

    return (
      <ul className="tree-branch">
        {children.map(child => (
          <li key={child.id} className="tree-leaf">
            <div className="tree-card">
              <div className="tree-card-header">
                <span className="node-level">Cấp {child.level}</span>
                <span className="node-role">{child.role_name || 'N/A'}</span>
              </div>
              <div className="tree-card-body">
                <div className="node-title">{child.name}</div>
                <div className="node-personnel">Nhân sự: <strong>{child.employee_name || 'Chưa phân bổ'}</strong></div>
                <div className="node-position">Chức danh: {child.permission_name || 'N/A'}</div>
              </div>
              <div className="tree-card-actions">
                <button className="btn-icon" onClick={() => handleOpenEdit(child.id)} title="Chỉnh sửa">
                  <Edit size={14} />
                </button>
                <button className="btn-icon btn-danger-icon" onClick={() => handleDeleteTrigger(child.id)} title="Xóa">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {renderTreeNodes(child.id)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="org-structure-container">
      {/* Dynamic Style Injection */}
      <style>{`
        .org-structure-container {
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

        .toolbar-left, .toolbar-right {
          display: flex;
          align-items: center;
          gap: 10px;
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
          width: 240px;
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

        .dropdown-select {
          padding: 8px 12px;
          border: 1.5px solid #E5D5C5;
          border-radius: 8px;
          outline: none;
          font-size: 14px;
          background-color: white;
          color: #4A3F35;
          cursor: pointer;
        }

        .view-mode-toggle {
          display: flex;
          border: 1.5px solid #E5D5C5;
          border-radius: 8px;
          overflow: hidden;
          background: white;
        }

        .view-mode-toggle button {
          background: none;
          border: none;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #8C7A6B;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-mode-toggle button.active {
          background: #8B5A2B;
          color: white;
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

        .btn-secondary:hover {
          background: #FAF3EC;
        }

        /* Table Design */
        .table-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(139, 119, 101, 0.08);
          border: 1px solid #ECE3D5;
          overflow: hidden;
        }

        .org-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .org-table th {
          background-color: #F8F3EC;
          color: #4A3F35;
          font-weight: 600;
          font-size: 13px;
          padding: 12px 16px;
          border-bottom: 1.5px solid #E9DEC9;
        }

        .org-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #F0E6D8;
          color: #4A3F35;
          font-size: 14px;
        }

        .org-table tbody tr:hover {
          background-color: #FCFAF7;
        }

        .badge-level {
          background-color: #EFE4D6;
          color: #7A5330;
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 11px;
        }

        /* Action Buttons */
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

        /* Modal Dialog Layout */
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
          width: 800px;
          max-width: 90%;
          max-height: 90vh;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          border: 1px solid #ECE3D5;
          animation: modalFadeIn 0.3s ease;
          display: flex;
          flex-direction: column;
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
          display: flex;
          align-items: center;
        }

        .modal-body {
          padding: 24px;
          overflow-y: auto;
          max-height: 60vh;
        }

        /* Form Inputs Grid */
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 24px;
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
          transition: border-color 0.2s ease;
        }

        .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
          border-color: #8B5A2B;
        }

        .form-group-with-btn {
          display: flex;
          gap: 8px;
        }

        .form-group-with-btn input {
          flex: 1;
        }

        .btn-lookup {
          background-color: #FAF3EC;
          border: 1.5px solid #8B5A2B;
          color: #8B5A2B;
          font-weight: 600;
          padding: 0 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
        }

        .btn-lookup:hover {
          background-color: #F3E6D9;
        }

        /* Tab Layout */
        .tabs-header {
          display: flex;
          border-bottom: 2px solid #E9DEC9;
          margin-bottom: 16px;
          gap: 16px;
        }

        .tab-btn {
          background: none;
          border: none;
          padding: 10px 4px;
          font-size: 14px;
          font-weight: 600;
          color: #8C7A6B;
          cursor: pointer;
          position: relative;
          bottom: -2px;
          transition: all 0.2s ease;
        }

        .tab-btn.tab-btn-active {
          color: #5C3E21;
          border-bottom: 2px solid #5C3E21;
        }

        /* KPI/Checklist Table in Modal */
        .detail-table-card {
          border: 1px solid #ECE3D5;
          border-radius: 10px;
          overflow: hidden;
          background-color: white;
        }

        .detail-table {
          width: 100%;
          border-collapse: collapse;
        }

        .detail-table th {
          background-color: #FAF7F2;
          color: #615244;
          font-size: 12px;
          font-weight: 600;
          padding: 10px 12px;
          border-bottom: 1.5px solid #ECE3D5;
          text-align: left;
        }

        .detail-table td {
          padding: 8px 12px;
          border-bottom: 1px solid #F3ECE2;
        }

        .detail-table input {
          width: 100%;
          border: 1px solid #E2D2C2;
          border-radius: 6px;
          padding: 6px 10px;
          box-sizing: border-box;
          font-size: 13px;
          outline: none;
        }

        .detail-table input:focus {
          border-color: #8B5A2B;
        }

        .btn-add-detail {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: #8B5A2B;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          margin-top: 10px;
        }

        .btn-add-detail:hover {
          text-decoration: underline;
        }

        .modal-footer {
          padding: 16px 24px;
          border-top: 1.5px solid #F3ECE2;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background-color: #FAF7F2;
        }

        /* Tree Diagram Styling */
        .tree-container {
          background: white;
          padding: 30px;
          border-radius: 12px;
          border: 1px solid #ECE3D5;
          overflow-x: auto;
          text-align: center;
        }

        .tree-container ul {
          padding-top: 20px; 
          position: relative;
          transition: all 0.5s;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
        }

        .tree-container li {
          float: left; 
          text-align: center;
          list-style-type: none;
          position: relative;
          padding: 20px 5px 0 5px;
          transition: all 0.5s;
        }

        /* We will use simple structured tree styling */
        .tree-branch {
          display: flex !important;
          flex-direction: row !important;
          justify-content: center;
        }

        .tree-card {
          background-color: #FCFAF7;
          border: 1.5px solid #E5D5C5;
          border-radius: 10px;
          width: 200px;
          padding: 0;
          box-shadow: 0 4px 10px rgba(139, 119, 101, 0.05);
          display: inline-block;
          text-align: left;
          overflow: hidden;
        }

        .tree-card-header {
          background-color: #F0E5D7;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: bold;
          color: #7A5330;
          display: flex;
          justify-content: space-between;
        }

        .tree-card-body {
          padding: 12px;
        }

        .node-title {
          font-size: 14px;
          font-weight: bold;
          color: #4A3F35;
          margin-bottom: 6px;
        }

        .node-personnel, .node-position {
          font-size: 12px;
          color: #7D6B5C;
          margin: 2px 0;
        }

        .tree-card-actions {
          border-top: 1px solid #F0E6D8;
          padding: 6px 12px;
          display: flex;
          justify-content: flex-end;
          gap: 6px;
          background-color: #FAF6F0;
        }

        /* Lookup dialog */
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
          backdrop-filter: blur(2px);
        }

        .lookup-dialog {
          background: white;
          border-radius: 12px;
          width: 500px;
          max-width: 90%;
          max-height: 80vh;
          box-shadow: 0 8px 30px rgba(0,0,0,0.2);
          border: 1px solid #ECE3D5;
          display: flex;
          flex-direction: column;
        }
      `}</style>

      {/* Header toolbar component */}
      <PageToolbar 
        title={title} 
        code={screenCode} 
        subtitle={subtitle} 
      />

      {/* Main search and action toolbar */}
      <div className="toolbar-row">
        <div className="toolbar-left">
          <div className="search-wrapper">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Nhập Mã, Tên sơ đồ..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="dropdown-select"
            value={selectedChart}
            onChange={(e) => setSelectedChart(e.target.value)}
          >
            <option value="Sơ đồ nhân sự">Sơ đồ nhân sự</option>
          </select>
          <div className="view-mode-toggle">
            <button 
              className={viewMode === 'table' ? 'active' : ''} 
              onClick={() => setViewMode('table')}
            >
              <TableIcon size={14} /> Xem dạng bảng
            </button>
            <button 
              className={viewMode === 'chart' ? 'active' : ''} 
              onClick={() => setViewMode('chart')}
            >
              <Network size={14} /> Xem dạng sơ đồ
            </button>
          </div>
        </div>
        <div className="toolbar-right">
          <button className="btn-action btn-secondary">Khác</button>
          <button className="btn-action btn-secondary">Nhập dữ liệu</button>
          <button className="btn-action btn-secondary">Xuất dữ liệu</button>
          <button className="btn-action btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} /> Thêm mới
          </button>
        </div>
      </div>

      {/* Content Rendering: Table Mode vs Diagram Mode */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: '#8C7A6B' }}>Đang tải dữ liệu...</div>
      ) : error ? (
        <div style={{ color: 'red', textAlign: 'center', padding: '50px 0' }}>{error}</div>
      ) : viewMode === 'table' ? (
        <div className="table-card">
          <table className="org-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Cấp</th>
                <th>Diễn giải</th>
                <th>Tên nhân viên</th>
                <th>Vị trí (Chức danh)</th>
                <th>Cấp trên trực tiếp</th>
                <th>Ghi chú</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredNodes.length > 0 ? (
                filteredNodes.map(node => (
                  <tr key={node.id}>
                    <td>
                      <span className="badge-level">Cấp {node.level}</span>
                    </td>
                    <td><strong>{node.name}</strong><br/><small style={{ color: '#8C7A6B' }}>{node.description}</small></td>
                    <td>{node.employee_name || <em style={{ color: '#BCAFA4' }}>Chưa gán</em>}</td>
                    <td>{node.permission_name || <em style={{ color: '#BCAFA4' }}>Chưa gán</em>}</td>
                    <td>{node.parent_name || <em style={{ color: '#BCAFA4' }}>Không có</em>}</td>
                    <td>{node.note || '-'}</td>
                    <td style={{ position: 'relative', zIndex: actionMenuId === node.id ? 40 : 1, textAlign: 'center' }}>
                      <button
                        className="action-btn"
                        onClick={() => setActionMenuId(actionMenuId === node.id ? null : node.id)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2"/>
                          <circle cx="12" cy="12" r="2"/>
                          <circle cx="12" cy="19" r="2"/>
                        </svg>
                      </button>
                      {actionMenuId === node.id && (
                        <div className="action-menu" style={{ right: '16px', top: '35px' }}>
                          <button className="action-menu-item" onClick={() => { handleOpenEdit(node.id); setActionMenuId(null); }}>Chỉnh sửa</button>
                          <button className="action-menu-item danger" onClick={() => { handleDeleteTrigger(node.id); setActionMenuId(null); }}>Xóa</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#8C7A6B', padding: '30px' }}>
                    Không tìm thấy sơ đồ nhân sự nào. Bấm 'Thêm mới' để khởi tạo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="tree-container">
          {renderTreeNodes(null) || (
            <div style={{ color: '#8C7A6B' }}>Không tìm thấy nút cấp cao nhất (parent_id = null) để vẽ sơ đồ.</div>
          )}
        </div>
      )}

      {/* CL02 Modal: Add/Edit Personnel Node Dialog */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Tạo mới cấp bậc sơ đồ tổ chức' : 'CL02: Thông tin nhân sự'}</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                {/* Row 1: Tên sơ đồ * */}
                <div className="form-group full-width">
                  <label>Tên sơ đồ <span>*</span></label>
                  <input 
                    type="text" 
                    name="name" 
                    placeholder="VD: Giám đốc chất lượng"
                    value={formData.name} 
                    onChange={handleInputChange} 
                  />
                </div>

                {/* Row 2: Cấp hiện tại, Cấp trên *, Phòng ban */}
                <div className="form-row-three-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', gridColumn: 'span 2' }}>
                  <div className="form-group">
                    <label>Cấp hiện tại</label>
                    <select name="level" value={formData.level} onChange={handleInputChange}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lvl => (
                        <option key={lvl} value={lvl}>Cấp {lvl}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Cấp trên <span>*</span></label>
                    <input 
                      type="text" 
                      value={nodes.find(n => n.id === parseInt(formData.parent_id))?.name || 'Không có (Cấp cao nhất)'} 
                      readOnly 
                      style={{ backgroundColor: '#FAF6F0' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phòng ban</label>
                    <input 
                      type="text" 
                      value={roles.find(r => r.id === parseInt(formData.role_id))?.description || ''} 
                      readOnly 
                      style={{ backgroundColor: '#FAF6F0' }}
                    />
                  </div>
                </div>

                {/* Row 3: Diễn giải * */}
                <div className="form-group full-width">
                  <label>Diễn giải <span>*</span></label>
                  <input 
                    type="text" 
                    name="description" 
                    placeholder="Nhập diễn giải..."
                    value={formData.description} 
                    onChange={handleInputChange} 
                  />
                </div>

                {/* Row 4: Chọn nhân sự *, Vị trí *, Bộ phận * */}
                <div className="form-row-three-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', gridColumn: 'span 2' }}>
                  <div className="form-group">
                    <label>Chọn nhân sự <span>*</span></label>
                    <select name="employee_id" value={formData.employee_id} onChange={handleInputChange}>
                      <option value="">-- Chọn nhân sự --</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.full_name} ({acc.employee_id})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Vị trí <span>*</span></label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        value={permissions.find(p => p.id === parseInt(formData.permission_id))?.description || ''} 
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
                    <label>Bộ phận <span>*</span></label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        value={roles.find(r => r.id === parseInt(formData.role_id))?.description || ''} 
                        readOnly 
                        placeholder="Chưa chọn bộ phận"
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
                </div>

                {/* Row 5: Ghi chú */}
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

              {/* Tabs Section for KPIs and Work Checklist */}
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

              {/* Tab Content 1: KPIs */}
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
                                value={kpi.kpi_objective} 
                                onChange={(e) => handleKpiRowChange(idx, 'kpi_objective', e.target.value)}
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                value={kpi.calculation} 
                                onChange={(e) => handleKpiRowChange(idx, 'calculation', e.target.value)}
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                value={kpi.acceptance_threshold} 
                                onChange={(e) => handleKpiRowChange(idx, 'acceptance_threshold', e.target.value)}
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                value={kpi.weight} 
                                onChange={(e) => handleKpiRowChange(idx, 'weight', parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                value={kpi.average_score} 
                                onChange={(e) => handleKpiRowChange(idx, 'average_score', parseFloat(e.target.value) || 0)}
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
                      + Thêm dòng KPI
                    </button>
                    <button className="btn-add-detail" onClick={() => setIsKpiLookupOpen(true)}>
                      + Thêm mục tiêu KPI từ thư viện
                    </button>
                  </div>
                </div>
              )}

              {/* Tab Content 2: Checklist */}
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
                        {formData.tasks.map((task, idx) => (
                          <tr key={idx}>
                            <td style={{ textAlign: 'center', fontSize: '13px' }}>{idx + 1}</td>
                            <td>
                              <input 
                                type="text" 
                                value={task.task_name} 
                                onChange={(e) => handleTaskRowChange(idx, 'task_name', e.target.value)}
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                value={task.tracking_method} 
                                onChange={(e) => handleTaskRowChange(idx, 'tracking_method', e.target.value)}
                              />
                            </td>
                            <td>
                              <select 
                                value={task.status} 
                                onChange={(e) => handleTaskRowChange(idx, 'status', e.target.value)}
                                style={{ width: '100%', padding: '6px', border: '1px solid #E2D2C2', borderRadius: '6px', outline: 'none' }}
                              >
                                <option value="Chưa bắt đầu">Chưa bắt đầu</option>
                                <option value="Đang thực hiện">Đang thực hiện</option>
                                <option value="Hoàn thành">Hoàn thành</option>
                              </select>
                            </td>
                            <td>
                              <input 
                                type="text" 
                                value={task.note} 
                                onChange={(e) => handleTaskRowChange(idx, 'note', e.target.value)}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button className="btn-icon btn-danger-icon" onClick={() => handleRemoveTaskRow(idx)}>
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <button className="btn-add-detail" onClick={handleAddTaskRow}>
                      + Thêm dòng công việc
                    </button>
                    <button className="btn-add-detail" onClick={() => setIsChecklistLookupOpen(true)}>
                      + Thêm checklist từ thư viện
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn-action btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy bỏ</button>
              <button className="btn-action btn-primary" onClick={handleSaveNode}>Xác nhận lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* CL03: Lookup Modal - KPI Selection */}
      {isKpiLookupOpen && (
        <div className="lookup-overlay">
          <div className="lookup-dialog">
            <div className="modal-header">
              <h3>CL03: Chọn Chỉ Số KPI</h3>
              <button className="modal-close-btn" onClick={() => { setIsKpiLookupOpen(false); setLookupSearch(''); }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
              <div className="search-wrapper">
                <Search size={14} />
                <input 
                  type="text" 
                  placeholder="Nhập mã hoặc tên KPI..." 
                  value={lookupSearch}
                  onChange={(e) => setLookupSearch(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="detail-table-card" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Mã KPI</th>
                      <th>Nội dung chỉ số KPI</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Chọn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredKpiPool.length > 0 ? (
                      filteredKpiPool.map(poolItem => (
                        <tr key={poolItem.id}>
                          <td><strong>{poolItem.kpi_code}</strong></td>
                          <td>{poolItem.content}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              className="btn-lookup"
                              onClick={() => selectKpiFromPool(poolItem)}
                              style={{ padding: '4px 10px' }}
                            >
                              Chọn
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#8C7A6B' }}>Không tìm thấy mẫu KPI nào.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checklist Lookup Modal */}
      {isChecklistLookupOpen && (
        <div className="lookup-overlay">
          <div className="lookup-dialog">
            <div className="modal-header">
              <h3>Chọn Checklist Công Việc Mẫu</h3>
              <button className="modal-close-btn" onClick={() => { setIsChecklistLookupOpen(false); setLookupSearch(''); }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
              <div className="search-wrapper">
                <Search size={14} />
                <input 
                  type="text" 
                  placeholder="Nhập mã hoặc nội dung công việc..." 
                  value={lookupSearch}
                  onChange={(e) => setLookupSearch(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="detail-table-card" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Mã</th>
                      <th>Nội dung checklist</th>
                      <th>Tần suất</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Chọn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChecklistPool.length > 0 ? (
                      filteredChecklistPool.map(poolItem => (
                        <tr key={poolItem.id}>
                          <td><strong>{poolItem.task_code}</strong></td>
                          <td>{poolItem.content}</td>
                          <td>{poolItem.frequency}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              className="btn-lookup"
                              onClick={() => selectChecklistFromPool(poolItem)}
                              style={{ padding: '4px 10px' }}
                            >
                              Chọn
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#8C7A6B' }}>Không tìm thấy mẫu checklist nào.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
              <button className="modal-close-btn" onClick={() => { setIsRoleLookupOpen(false); setLookupSearch(''); }}>
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
              <button className="btn-action btn-secondary" onClick={() => { setIsRoleLookupOpen(false); setLookupSearch(''); }}>Đóng</button>
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
              <button className="modal-close-btn" onClick={() => { setIsPermissionLookupOpen(false); setLookupSearch(''); }}>
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
              <button className="btn-action btn-secondary" onClick={() => { setIsPermissionLookupOpen(false); setLookupSearch(''); }}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <BeautifulConfirmModal
          isOpen={true}
          title="Xác nhận xóa cấp bậc nhân sự"
          message="Bạn có chắc chắn muốn xóa cấp nhân sự này? Lưu ý: Khi xóa, toàn bộ các chức vụ ở cấp tiếp theo sẽ tự động được điều chỉnh để nối lên cấp trên của nút bị xóa này, nhưng vẫn giữ nguyên giá trị cấp của chúng."
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
};

export default OrgStructureManagementView;
