import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit, Search, Filter, Upload, FileText, Download, AlertCircle, CheckCircle, ExternalLink, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

const getDepartmentAbbreviation = (templateSymbol, user) => {
  if (templateSymbol) {
    // Try to parse from template symbol, e.g. "G7.CL-QT01" or "G7.CL.QT01"
    const match = templateSymbol.match(/G7\.([A-Z0-9]+)[-.]/i);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
  }
  // Fallback to logged-in user
  const dept = (user?.department_name || user?.role_name || '').toUpperCase();
  if (dept.includes('CHẤT LƯỢNG') || dept.includes('QC') || dept.includes('CL') || dept.includes('KCS')) return 'CL';
  if (dept.includes('SẢN XUẤT') || dept.includes('SX')) return 'SX';
  if (dept.includes('KỸ THUẬT') || dept.includes('KT')) return 'KT';
  if (dept.includes('KHO')) return 'KHO';
  if (dept.includes('IT')) return 'IT';
  if (dept.includes('BGD') || dept.includes('BAN GIÁM ĐỐC')) return 'BGD';
  return 'SX';
};

const getTemplateAbbreviation = (templateSymbol) => {
  if (!templateSymbol) return 'QT';
  const parts = templateSymbol.split(/[-.]/);
  const lastPart = parts[parts.length - 1];
  const match = lastPart.match(/^([A-Za-z]+)/);
  if (match) {
    return match[1].toUpperCase();
  }
  return 'QT';
};

const findApprover = (level, deptAbbr, accountsList) => {
  if (!accountsList || accountsList.length === 0) return '';
  const isCty = level === 'Cấp công ty';
  const candidates = accountsList.filter(a => {
    const roleName = (a.role_name || '').toLowerCase();
    const permName = (a.permission_name || '').toLowerCase();
    const levelName = (a.permission_level || '').toLowerCase();
    if (isCty) {
      return (
        roleName.includes('giám đốc') || 
        roleName.includes('bgd') || 
        permName.includes('giám đốc') || 
        permName.includes('tgd') || 
        permName.includes('phó tổng giám đốc') ||
        levelName.includes('ban giám đốc') || 
        levelName.includes('giám đốc')
      );
    } else {
      return (
        roleName.includes('trưởng phòng') || 
        permName.includes('trưởng phòng') || 
        levelName.includes('trưởng phòng')
      );
    }
  });
  return candidates.length > 0 ? candidates[0].full_name : '';
};

const getCurrentFormattedDate = () => {
  const now = new Date();
  const DD = String(now.getDate()).padStart(2, '0');
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const YYYY = now.getFullYear();
  return `${DD}/${MM}/${YYYY}`;
};

const ISODocumentListView = ({ mode = 'documents' }) => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  
  const routePath = mode === 'processes' ? '/admin/iso-processes' : '/admin/iso-documents';
  const { screenCode, title, subtitle } = useScreenMetadataCached(routePath);
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [allProcesses, setAllProcesses] = useState([]);
  const [loading, setLoading] = useState(true);

  const getApproverCandidates = (level) => {
    if (!accounts || accounts.length === 0) return [];
    if (level === 'Cấp công ty') {
      return accounts.filter(a => {
        const roleName = (a.role_name || '').toLowerCase();
        const permName = (a.permission_name || '').toLowerCase();
        const levelName = (a.permission_level || '').toLowerCase();
        return (
          roleName.includes('giám đốc') || 
          roleName.includes('bgd') || 
          permName.includes('giám đốc') || 
          permName.includes('tgd') || 
          permName.includes('phó tổng giám đốc') ||
          levelName.includes('ban giám đốc') || 
          levelName.includes('giám đốc')
        );
      });
    } else {
      return accounts.filter(a => {
        const roleName = (a.role_name || '').toLowerCase();
        const permName = (a.permission_name || '').toLowerCase();
        const levelName = (a.permission_level || '').toLowerCase();
        return (
          roleName.includes('trưởng phòng') || 
          permName.includes('trưởng phòng') || 
          levelName.includes('trưởng phòng')
        );
      });
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProcessData, setNewProcessData] = useState({
    code: '',
    name: '',
    symbol: '',
    iso_document_id: '',
    document_level: '',
    editor: '',
    owner: '',
    approver: '',
    role: '',
    status: 'Nháp'
  });

  // Custom confirmation modal
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    id: null,
    title: '',
    message: '',
    onConfirm: null,
    confirmLabel: 'Xác nhận',
    confirmColor: '#d93025'
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [filterFolder, setFilterFolder] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const fileInputRef = useRef(null);
  const [actionMenuId, setActionMenuId] = useState(null);

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const url = mode === 'processes' ? '/iso-documents/processes' : '/iso-documents/';
      const data = await api.get(url);
      setDocuments(data || []);
    } catch (error) {
      console.error('Lỗi khi tải danh sách:', error);
      showFeedback('error', 'Không thể kết nối đến máy chủ để tải danh sách');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [mode]);

  const openCreateModal = async () => {
    try {
      setLoading(true);
      const [templatesData, processesData, accountsData] = await Promise.all([
        api.get('/iso-documents/'),
        api.get('/iso-documents/processes'),
        api.get('/accounts/?size=1000')
      ]);
      setTemplates(templatesData || []);
      setAllProcesses(processesData || []);
      const accountsList = accountsData?.items || [];
      setAccounts(accountsList);
      
      const defaultTemplate = templatesData && templatesData.length > 0 ? templatesData[0] : null;
      let generatedCode = '';
      let documentLevel = 'Cấp phòng';
      let initialSymbol = '';
      let approverName = '';
      
      const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
      const editorName = loggedInUser.full_name || loggedInUser.username || '';
      
      if (defaultTemplate) {
        initialSymbol = defaultTemplate.symbol || '';
        documentLevel = defaultTemplate.document_level || 'Cấp phòng';
        const xx = defaultTemplate.folder ? defaultTemplate.folder.slice(-2).toUpperCase() : 'SX';
        const yy = getTemplateAbbreviation(initialSymbol);
        
        const prefix = `G7.${xx}.${yy}`;
        let maxZz = 0;
        if (processesData && processesData.length > 0) {
          processesData.forEach(p => {
            if (p.code && p.code.toUpperCase().startsWith(prefix.toUpperCase())) {
              const suffix = p.code.slice(prefix.length);
              const num = parseInt(suffix, 10);
              if (!isNaN(num) && num > maxZz) {
                maxZz = num;
              }
            }
          });
        }
        const zz = String(maxZz + 1).padStart(2, '0');
        generatedCode = `G7.${xx}.${yy}${zz}`;
        approverName = findApprover(documentLevel, xx, accountsList);
      }
      
      setNewProcessData({
        code: generatedCode,
        name: '',
        symbol: initialSymbol,
        iso_document_id: defaultTemplate ? defaultTemplate.id : '',
        document_level: documentLevel,
        editor: editorName,
        owner: editorName,
        approver: approverName,
        role: '',
        status: 'Nháp'
      });
      setShowCreateModal(true);
    } catch (error) {
      console.error('Lỗi khi tải danh sách mẫu ISO:', error);
      showFeedback('error', 'Không thể tải danh sách tài liệu mẫu ISO gốc');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProcess = async (e) => {
    e.preventDefault();
    const hasIsoDocId = newProcessData.iso_document_id !== '' && newProcessData.iso_document_id !== null && newProcessData.iso_document_id !== undefined;
    if (!newProcessData.code || !newProcessData.name || !hasIsoDocId) {
      showFeedback('error', 'Vui lòng điền đầy đủ các thông tin bắt buộc');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/iso-documents/processes/save', newProcessData);
      setShowCreateModal(false);
      showFeedback('success', res.message || 'Khởi tạo quy trình mới thành công!');
      fetchDocuments();
      
      // Hỏi người dùng có muốn chuyển sang thiết lập lưu đồ & form ngay lập tức không
      const createdId = res.id;
      setTimeout(() => {
        setConfirmModal({
          show: true,
          id: createdId,
          title: '🎉 Khởi tạo thành công!',
          message: 'Quy trình mới đã được tạo. Bạn có muốn chuyển đến màn hình Biên soạn & Vẽ lưu đồ ngay không?',
          confirmLabel: 'Đi đến Biên soạn',
          confirmColor: '#16a34a',
          onConfirm: () => {
            setConfirmModal({ show: false, id: null, title: '', message: '', onConfirm: null, confirmLabel: 'Xác nhận', confirmColor: '#d93025' });
            navigate(`/admin/iso-processes/edit/${createdId}`);
          }
        });
      }, 500);

    } catch (error) {
      console.error('Lỗi khi tạo quy trình:', error);
      showFeedback('error', error.response?.data?.detail || 'Lỗi hệ thống khi tạo quy trình mới');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type, text) => {
    toast(type, text);
  };

  // Xử lý upload file Word .docx
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileNameLower = file.name.toLowerCase();
    if (!fileNameLower.endsWith('.docx') && !fileNameLower.endsWith('.doc')) {
      showFeedback('error', 'Chỉ hỗ trợ tải lên tệp định dạng Word (.doc, .docx)');
      return;
    }

    if (fileNameLower.endsWith('.doc')) {
      showFeedback('error', 'Hệ thống chỉ hỗ trợ phân tích tự động định dạng Word (.docx). Vui lòng chuyển đổi tệp (.doc) sang (.docx) trước khi tải lên.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadLoading(true);
    showFeedback('info', 'Đang tải lên và phân tích tài liệu quy trình...');

    try {
      // Gọi API upload để parse dữ liệu bằng Axios
      const parsedData = await api.post('/iso-documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Chuyển hướng sang màn hình form editor kèm dữ liệu phân tích được truyền qua state
      navigate(mode === 'processes' ? '/admin/iso-processes/edit/new' : '/admin/iso-documents/edit/new', { state: { parsedData } });

    } catch (error) {
      console.error('Lỗi khi tải lên file:', error);
      const errMsg = error.response?.data?.detail || error.message || 'Lỗi khi upload tệp quy trình ISO';
      showFeedback('error', errMsg);
    } finally {
      setUploadLoading(false);
      e.target.value = ''; // Reset input file
    }
  };

  // Xử lý xoá tài liệu quy trình
  const handleDeleteDoc = (id, code, name) => {
    setConfirmModal({
      show: true,
      id,
      title: mode === 'processes' ? 'Xác nhận xoá Quy trình' : 'Xác nhận xoá tài liệu ISO',
      message: mode === 'processes'
        ? `Bạn có chắc chắn muốn xoá quy trình áp dụng thực tế '${code} - ${name}' cùng toàn bộ thiết lập chi tiết liên quan?`
        : `Bạn có chắc chắn muốn xoá tài liệu mẫu '${code} - ${name}' cùng toàn bộ lưu đồ và thiết lập checklist liên quan?`,
      onConfirm: async () => {
        try {
          const url = mode === 'processes' ? `/iso-documents/processes/${id}` : `/iso-documents/${id}`;
          await api.delete(url);
          showFeedback('success', `Đã xoá thành công!`);
          fetchDocuments();
        } catch (error) {
          console.error('Lỗi khi xoá quy trình:', error);
          showFeedback('error', 'Không thể xoá quy trình này');
        }
        setConfirmModal({ show: false, id: null, title: '', message: '', onConfirm: null, confirmLabel: 'Xác nhận', confirmColor: '#d93025' });
      }
    });
  };

  // Trích xuất danh sách thư mục và người ban hành duy nhất
  const uniqueFolders = useMemo(() => {
    const list = documents.map(d => d.folder).filter(Boolean);
    return [...new Set(list)];
  }, [documents]);

  const uniqueOwners = useMemo(() => {
    const list = documents.map(d => d.owner || d.issuer).filter(Boolean);
    return [...new Set(list)];
  }, [documents]);

  // Lọc danh sách tài liệu
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const q = searchTerm.toLowerCase();
      let matchSearch = false;
      
      if (mode === 'processes') {
        matchSearch = 
          (doc.code || '').toLowerCase().includes(q) ||
          (doc.name || '').toLowerCase().includes(q) ||
          (doc.owner || '').toLowerCase().includes(q) ||
          (doc.editor || '').toLowerCase().includes(q) ||
          (doc.approver || '').toLowerCase().includes(q);
      } else {
        matchSearch = 
          (doc.code || '').toLowerCase().includes(q) ||
          (doc.name || '').toLowerCase().includes(q) ||
          (doc.issuer || '').toLowerCase().includes(q) ||
          (doc.folder || '').toLowerCase().includes(q) ||
          (doc.doc_type || '').toLowerCase().includes(q);
      }
      
      const matchStatus = statusFilter === '' || doc.status === statusFilter;
      const matchFolder = filterFolder === '' || doc.folder === filterFolder;
      const matchOwner = filterOwner === '' || (doc.owner === filterOwner || doc.issuer === filterOwner);
      return matchSearch && matchStatus && matchFolder && matchOwner;
    });
  }, [documents, searchTerm, statusFilter, filterFolder, filterOwner, mode]);

  const paginatedDocs = useMemo(() => {
    return filteredDocs.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredDocs, page, pageSize]);

  return (
    <div className="mgmt-container">
      <div className="mgmt-main" style={{ fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>

      {/* 1. Bộ điều khiển hành động và bộ lọc sử dụng PageToolbar và filter-inline-bar */}
      <PageToolbar
        searchValue={searchTerm}
        onSearchChange={(val) => { setSearchTerm(val); setPage(1); }}
        searchPlaceholder="Tìm theo mã, tên hoặc người ban hành..."
        showFilter={true}
        isFilterOpen={isFilterBarOpen}
        onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
        activeFiltersCount={(statusFilter ? 1 : 0) + (filterFolder ? 1 : 0) + (filterOwner ? 1 : 0)}
        onCreate={mode === 'processes' ? undefined : () => !uploadLoading && fileInputRef.current?.click()}
        createLabel={mode === 'processes' ? 'Thêm mới' : (uploadLoading ? 'Đang phân tích...' : 'Nhập dữ liệu')}
        createActions={mode === 'processes' ? [
          {
            label: 'Tạo từ mẫu ISO',
            icon: <Plus size={14} />,
            onClick: () => openCreateModal()
          },
          {
            label: 'Tải lên từ file Word (.docx)',
            icon: <Upload size={14} />,
            onClick: () => !uploadLoading && fileInputRef.current?.click()
          }
        ] : []}
        hasWritePermission={true}
      />

      <input
        type="file"
        ref={fileInputRef}
        accept=".doc,.docx"
        onChange={handleFileUpload}
        disabled={uploadLoading}
        style={{ display: 'none' }}
      />

      {isFilterBarOpen && (
        <div className="filter-inline-bar">
          {/* Lọc trạng thái */}
          <div className="filter-field-group">
            <label className="filter-field-label">Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Nháp">Nháp</option>
              <option value="Đang lưu hành">Đang lưu hành</option>
              <option value="Đang điều chỉnh">Đang điều chỉnh</option>
            </select>
          </div>

          {/* Lọc thư mục */}
          {mode === 'documents' && (
            <div className="filter-field-group">
              <label className="filter-field-label">Thư mục lưu trữ</label>
              <select
                value={filterFolder}
                onChange={(e) => { setFilterFolder(e.target.value); setPage(1); }}
              >
                <option value="">Tất cả thư mục</option>
                {uniqueFolders.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          )}

          {/* Lọc người ban hành / chủ quản */}
          <div className="filter-field-group">
            <label className="filter-field-label">{mode === 'processes' ? 'Bộ phận chủ quản' : 'Người ban hành'}</label>
            <select
              value={filterOwner}
              onChange={(e) => { setFilterOwner(e.target.value); setPage(1); }}
            >
              <option value="">Tất cả</option>
              {uniqueOwners.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Hiển thị số dòng */}
          <div className="filter-field-group">
            <label className="filter-field-label">Hiển thị số dòng</label>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
            >
              <option value={15}>15 dòng</option>
              <option value={30}>30 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>
          </div>
        </div>
      )}

      {/* 2. Bảng Danh sách Quy trình ISO */}
      <div className="admin-list-layout">
        <div className="mgmt-table admin-table-card card-shadow" style={{
          backgroundColor: 'white',
          border: '1px solid #EADCC9',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#7B5233', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <RefreshCw className="animate-spin" size={28} />
            <span style={{ fontWeight: '600' }}>Đang tải danh sách hồ sơ ISO...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#a0a0a0' }}>
            <FileText size={48} style={{ margin: '0 auto 16px auto', color: '#d0d0d0' }} />
            <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem' }}>Không tìm thấy tài liệu ISO quy trình nào</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>Vui lòng nhấn tải lên file Word hoặc thêm mới để bắt đầu cấu hình</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div className="admin-table-scroll" style={{ overflowX: 'auto', minHeight: '220px', flex: 1 }}>
            <table className="data-table" style={{ width: '100%', minWidth: '900px' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '50px' }}>STT</th>
                  {mode === 'processes' ? (
                    <>
                      <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '120px' }}>MÃ QUY TRÌNH</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '130px' }}>KÝ HIỆU</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233' }}>TÊN QUY TRÌNH</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '130px' }}>CẤP TÀI LIỆU</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '150px' }}>NGƯỜI BIÊN SOẠN</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '150px' }}>NGƯỜI DUYỆT</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '160px' }}>THỜI GIAN BAN HÀNH</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '120px', textAlign: 'center' }}>TRẠNG THÁI</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '100px' }}>MÃ MẪU</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '130px' }}>KÝ HIỆU</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233' }}>TÊN TÀI LIỆU</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '80px', textAlign: 'center' }}>PHIÊN BẢN</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '150px' }}>LOẠI TÀI LIỆU</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '150px' }}>NGƯỜI TẠO</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '120px' }}>CẬP NHẬT CUỐI</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '80px', textAlign: 'center' }}>FILE GỐC</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '120px', textAlign: 'center' }}>TRẠNG THÁI</th>
                    </>
                  )}
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', width: '100px', textAlign: 'center' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDocs.map((doc, index) => (
                  <tr
                    key={doc.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.2s',
                      backgroundColor: index % 2 === 1 ? '#fdfcfb' : 'white'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 1 ? '#fdfcfb' : 'white'}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>{index + 1}</td>
                    
                    {mode === 'processes' ? (
                      <>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 'bold', color: '#7B5233' }}>{doc.code}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1e293b', fontWeight: '500' }}>{doc.symbol || '---'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1e293b', fontWeight: '600' }}>{doc.name}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#64748b' }}>{doc.document_level || '---'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1e293b' }}>{doc.editor || '---'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1e293b' }}>
                          {doc.status === 'Hiệu lực' || doc.status === 'Đang lưu hành' || doc.status === 'Đang hoạt động' || doc.status === 'Đã duyệt' ? (doc.approver || '---') : '---'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1e293b' }}>
                          {doc.status === 'Hiệu lực' || doc.status === 'Đang lưu hành' || doc.status === 'Đang hoạt động' || doc.status === 'Đã duyệt' ? (doc.issue_date || '---') : '---'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 'bold', color: '#7B5233' }}>{doc.code}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1e293b', fontWeight: '500' }}>{doc.symbol || '---'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1e293b', fontWeight: '600' }}>{doc.name}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1e293b', textAlign: 'center', fontWeight: '500' }}>{doc.version}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#64748b' }}>{doc.doc_type || '---'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1e293b' }}>{doc.issuer || '---'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#64748b' }}>{doc.updated_at ? doc.updated_at.split(' ')[0] : '---'}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {doc.file_path ? (
                            <a
                              href={`${api.defaults.baseURL.replace(/\/$/, '')}/iso-documents/${doc.id}/download-raw`}
                              download
                              target="_blank"
                              rel="noreferrer"
                              title="Tải tệp tin gốc nguyên bản"
                              style={{ color: '#7B5233', display: 'inline-flex', padding: '4px', borderRadius: '4px', backgroundColor: '#FAF6F0', cursor: 'pointer' }}
                            >
                              <Download size={14} />
                            </a>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>Không có</span>
                          )}
                        </td>
                      </>
                    )}

                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        backgroundColor: doc.status === 'Đang lưu hành' || doc.status === 'Hiệu lực' ? '#e6f4ea' : doc.status === 'Nháp' || doc.status === 'Dự thảo' ? '#fff7ed' : doc.status === 'Đang điều chỉnh' ? '#eff6ff' : '#f1f5f9',
                        color: doc.status === 'Đang lưu hành' || doc.status === 'Hiệu lực' ? '#137333' : doc.status === 'Nháp' || doc.status === 'Dự thảo' ? '#c2410c' : doc.status === 'Đang điều chỉnh' ? '#1d4ed8' : '#64748b',
                        border: `1px solid ${doc.status === 'Đang lưu hành' || doc.status === 'Hiệu lực' ? '#137333' : doc.status === 'Nháp' || doc.status === 'Dự thảo' ? '#c2410c' : doc.status === 'Đang điều chỉnh' ? '#3b82f6' : '#cbd5e1'}`
                      }}>
                        {doc.status}
                      </span>
                    </td>
                    <td style={{ position: 'relative', textAlign: 'center', zIndex: actionMenuId === doc.id ? 40 : 1 }}>
                      <button
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionMenuId(actionMenuId === doc.id ? null : doc.id);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2"/>
                          <circle cx="12" cy="12" r="2"/>
                          <circle cx="12" cy="19" r="2"/>
                        </svg>
                      </button>
                      {actionMenuId === doc.id && (
                        <div className="action-menu" style={{ right: '50%', transform: 'translateX(50%)', top: '80%' }}>
                          <button
                            className="action-menu-item"
                            onClick={() => {
                              setActionMenuId(null);
                              navigate(mode === 'processes' ? `/admin/iso-processes/edit/${doc.id}` : `/admin/iso-documents/edit/${doc.id}`);
                            }}
                          >
                            Chỉnh sửa
                          </button>
                          <button
                            className="action-menu-item warn"
                            style={{ color: '#DC2626' }}
                            onClick={() => {
                              setActionMenuId(null);
                              handleDeleteDoc(doc.id, doc.code, doc.name);
                            }}
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Thanh phân trang đồng bộ */}
          {(() => {
            const totalPages = Math.ceil(filteredDocs.length / pageSize);
            return filteredDocs.length > 0 ? (
              <div className="admin-pagination-desktop desktop-only">
                <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                  Hiển thị <b>{paginatedDocs.length}</b> trên <b>{filteredDocs.length}</b> tài liệu
                </div>
                <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <button 
                    className="page-btn" 
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))} 
                    disabled={page === 1}
                    style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid #EADCC9',
                        backgroundColor: page === p ? '#7B5233' : '#FAF6F0',
                        color: page === p ? '#fff' : '#7B5233',
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      {p}
                    </button>
                  ))}
                  <button 
                    className="page-btn" 
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))} 
                    disabled={page === totalPages}
                    style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ) : null;
          })()}
          </div>
        )}
        </div>
      </div>

      {/* 3. Confirm Modal xoá tài liệu */}
      {confirmModal.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '450px',
            width: '100%',
            margin: '20px',
            boxShadow: '0 8px 32px rgba(45, 26, 18, 0.15)',
            border: '1px solid #EADCC9'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#7B5233', fontWeight: 'bold' }}>{confirmModal.title}</h3>
            <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '0.9rem', lineHeight: '1.45' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setConfirmModal({ show: false, id: null, title: '', message: '', onConfirm: null, confirmLabel: 'Xác nhận', confirmColor: '#d93025' })}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={confirmModal.onConfirm}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: confirmModal.confirmColor || '#d93025',
                  color: 'white',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}>
                {confirmModal.confirmLabel || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 4. Modal Tạo Quy trình thực tế mới */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '650px',
            width: '90%',
            margin: '20px',
            boxShadow: '0 8px 32px rgba(45, 26, 18, 0.15)',
            border: '1px solid #EADCC9',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Nút đóng góc trên bên phải */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 20px 0', borderBottom: '1px solid #F3F4F6', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, color: '#1F2937', fontSize: '1.25rem', fontWeight: 'bold' }}>Thêm quy trình mới</h2>
              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.5rem', padding: '0 4px', lineHeight: 1 }}
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleCreateProcess} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#4b301e', marginBottom: '4px' }}>
                  Mẫu tài liệu <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  value={newProcessData.iso_document_id}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const selTemplate = templates.find(t => t.id === parseInt(selId));
                    if (selTemplate) {
                      const initialSymbol = selTemplate.symbol || '';
                      const documentLevel = selTemplate.document_level || 'Cấp phòng';
                      const xx = selTemplate.folder ? selTemplate.folder.slice(-2).toUpperCase() : 'SX';
                      const yy = getTemplateAbbreviation(initialSymbol);
                      
                      const prefix = `G7.${xx}.${yy}`;
                      let maxZz = 0;
                      if (allProcesses && allProcesses.length > 0) {
                        allProcesses.forEach(p => {
                          if (p.code && p.code.toUpperCase().startsWith(prefix.toUpperCase())) {
                            const suffix = p.code.slice(prefix.length);
                            const num = parseInt(suffix, 10);
                            if (!isNaN(num) && num > maxZz) {
                              maxZz = num;
                            }
                          }
                        });
                      }
                      const zz = String(maxZz + 1).padStart(2, '0');
                      const generatedCode = `G7.${xx}.${yy}${zz}`;
                      const approverName = findApprover(documentLevel, xx, accounts);
                      
                      setNewProcessData(prev => ({
                        ...prev,
                        iso_document_id: selId,
                        name: '',
                        symbol: initialSymbol,
                        code: generatedCode,
                        document_level: documentLevel,
                        owner: prev.owner,
                        approver: approverName
                      }));
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #EADCC9',
                    outline: 'none',
                    fontSize: '0.88rem',
                    color: '#1F2937',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                  required
                >
                  <option value="" disabled>-- Chọn tài liệu mẫu ISO --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.code} - {t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#4b301e', marginBottom: '4px' }}>
                  Tên quy trình <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên quy trình..."
                  value={newProcessData.name}
                  onChange={(e) => setNewProcessData(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #EADCC9',
                    outline: 'none',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    color: '#1F2937'
                  }}
                  required
                />
              </div>

              {/* Grid 2 cột cho các trường thông tin bên dưới */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#4b301e', marginBottom: '4px' }}>
                    Mã tài liệu <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newProcessData.code}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #E5E7EB',
                      outline: 'none',
                      fontSize: '0.88rem',
                      fontWeight: '600',
                      backgroundColor: '#F3F4F6',
                      color: '#4B5563',
                      cursor: 'not-allowed',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#4b301e', marginBottom: '4px' }}>
                    Cấp tài liệu
                  </label>
                  <input
                    type="text"
                    value={newProcessData.document_level || 'Cấp phòng'}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #E5E7EB',
                      outline: 'none',
                      fontSize: '0.88rem',
                      fontWeight: '600',
                      backgroundColor: '#F3F4F6',
                      color: '#4B5563',
                      cursor: 'not-allowed',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#4b301e', marginBottom: '4px' }}>
                    Người biên soạn
                  </label>
                  <input
                    type="text"
                    value={newProcessData.editor}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #E5E7EB',
                      outline: 'none',
                      fontSize: '0.88rem',
                      fontWeight: '600',
                      backgroundColor: '#F3F4F6',
                      color: '#4B5563',
                      cursor: 'not-allowed',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#4b301e', marginBottom: '4px' }}>
                    Người duyệt cuối <span style={{ color: 'red' }}>*</span>
                  </label>
                  <select
                    value={newProcessData.approver || ''}
                    onChange={(e) => setNewProcessData(prev => ({ ...prev, approver: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #EADCC9',
                      outline: 'none',
                      fontSize: '0.88rem',
                      color: '#1F2937',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                    required
                  >
                    <option value="" disabled>-- Chọn người duyệt cuối --</option>
                    {getApproverCandidates(newProcessData.document_level || 'Cấp phòng').map(acc => (
                      <option key={acc.id} value={acc.full_name}>
                        {acc.full_name} ({acc.permission_name || acc.role_name || 'Người duyệt'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#4b301e', marginBottom: '4px' }}>
                    Thời gian cập nhật
                  </label>
                  <input
                    type="text"
                    value={getCurrentFormattedDate()}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #E5E7EB',
                      outline: 'none',
                      fontSize: '0.88rem',
                      fontWeight: '600',
                      backgroundColor: '#F3F4F6',
                      color: '#4B5563',
                      cursor: 'not-allowed',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#4b301e', marginBottom: '4px' }}>
                    Trạng thái
                  </label>
                  <input
                    type="text"
                    value="Nháp"
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #E5E7EB',
                      outline: 'none',
                      fontSize: '0.88rem',
                      fontWeight: '600',
                      backgroundColor: '#F3F4F6',
                      color: '#4B5563',
                      cursor: 'not-allowed',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid #EADCC9', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #7B5233',
                    backgroundColor: 'white',
                    color: '#7B5233',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#7B5233',
                    color: 'white',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Tạo mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ISODocumentListView;
