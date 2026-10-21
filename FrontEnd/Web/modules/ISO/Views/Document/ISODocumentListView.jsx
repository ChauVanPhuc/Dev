import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '@webShared/Services/api.service';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { Plus, Trash2, Edit, Search, Filter, Upload, FileText, Download, AlertCircle, CheckCircle, ExternalLink, RefreshCw, ChevronLeft, ChevronRight, FolderArchive, Layers, X, Building, User, ShieldCheck, Calendar, Loader2 } from 'lucide-react';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { formatVietnameseDateTime, formatVietnameseDate } from '../../utils/isoDateUtils';

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

// Hàm sinh mã tài liệu tự động theo định dạng chuẩn G7.{Mã_PB}.{Mã_Loại}{Số_TT}
const generateProcessCode = (deptCode, docTypeCode, processesList = []) => {
  const dCode = (deptCode || 'QL').trim().toUpperCase();
  const tCode = (docTypeCode || 'QT').trim().toUpperCase();
  const prefix = `G7.${dCode}.${tCode}`;
  let maxZz = 0;
  (processesList || []).forEach(p => {
    const pCode = (p.code || '').toUpperCase();
    if (pCode.startsWith(prefix)) {
      const suffix = pCode.slice(prefix.length);
      const num = parseInt(suffix, 10);
      if (!isNaN(num) && num > maxZz) {
        maxZz = num;
      }
    }
  });
  const zz = String(maxZz + 1).padStart(2, '0');
  return `G7.${dCode}.${tCode}${zz}`;
};

const findApprover = (level, deptAbbr, accountsList) => {
  if (!accountsList || accountsList.length === 0) return '';
  // Cả Cấp phòng và Cấp công ty (Bước 1) đều đưa cho Trưởng phòng ký trước
  const candidates = accountsList.filter(a => {
    const roleName = (a.role_name || '').toLowerCase();
    const permName = (a.permission_name || '').toLowerCase();
    const levelName = (a.permission_level || '').toLowerCase();
    return (
      roleName.includes('trưởng phòng') || 
      permName.includes('trưởng phòng') || 
      levelName.includes('trưởng phòng') ||
      levelName.includes('quản lý')
    );
  });
  return candidates.length > 0 ? candidates[0].full_name : (accountsList[0]?.full_name || 'Trưởng phòng');
};

const getCurrentFormattedDate = () => {
  const now = new Date();
  const DD = String(now.getDate()).padStart(2, '0');
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const YYYY = now.getFullYear();
  return `${DD}/${MM}/${YYYY}`;
};

const renderDocStatusBadge = (status, documentLevel) => {
  const rawStatus = (status || '').trim();
  const s = rawStatus.toLowerCase();

  // 1. Chỉnh sửa
  if (s === 'chỉnh sửa' || s.includes('chỉnh sửa') || s.includes('chinh sua')) {
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.72rem',
        fontWeight: 'bold',
        backgroundColor: '#FFF7ED',
        color: '#C2410C',
        border: '1px solid #FDBA74',
        display: 'inline-block',
        whiteSpace: 'nowrap'
      }}>
        Chỉnh sửa
      </span>
    );
  }

  // 2. Chờ xem xét
  if (s === 'chờ xem xét' || s.includes('xem xét') || s.includes('xem xet')) {
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.72rem',
        fontWeight: 'bold',
        backgroundColor: '#EFF6FF',
        color: '#1D4ED8',
        border: '1px solid #BFDBFE',
        display: 'inline-block',
        whiteSpace: 'nowrap'
      }}>
        Chờ xem xét
      </span>
    );
  }

  // 3. Chờ duyệt
  if (s === 'chờ duyệt' || s.includes('cho duyet') || s.includes('chờ')) {
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.72rem',
        fontWeight: 'bold',
        backgroundColor: '#FEF3C7',
        color: '#B45309',
        border: '1px solid #FDE68A',
        display: 'inline-block',
        whiteSpace: 'nowrap'
      }}>
        Chờ duyệt
      </span>
    );
  }

  // 4. Hết hiệu lực
  if (s === 'hết hiệu lực' || s.includes('hết hiệu lực') || s.includes('het hieu luc') || s.includes('từ chối') || s.includes('rejected')) {
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.72rem',
        fontWeight: 'bold',
        backgroundColor: '#FEE2E2',
        color: '#991B1B',
        border: '1px solid #FECACA',
        display: 'inline-block',
        whiteSpace: 'nowrap'
      }}>
        Hết hiệu lực
      </span>
    );
  }

  // 5. Hiệu lực
  if (s === 'hiệu lực' || s.includes('hiệu lực') || s.includes('hieu luc') || s.includes('đang lưu hành') || s.includes('đã duyệt')) {
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.72rem',
        fontWeight: 'bold',
        backgroundColor: '#DCFCE7',
        color: '#15803D',
        border: '1px solid #86EFAC',
        display: 'inline-block',
        whiteSpace: 'nowrap'
      }}>
        Hiệu lực
      </span>
    );
  }

  // 6. Nháp / Dự thảo
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '0.72rem',
      fontWeight: 'bold',
      backgroundColor: '#F1F5F9',
      color: '#475569',
      border: '1px solid #CBD5E1',
      display: 'inline-block',
      whiteSpace: 'nowrap'
    }}>
      {rawStatus || 'Nháp'}
    </span>
  );
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
  const [departmentsList, setDepartmentsList] = useState([]);
  const [departmentHeads, setDepartmentHeads] = useState([]);
  const [docTypesList, setDocTypesList] = useState([]);
  const [selectedWordFile, setSelectedWordFile] = useState(null);
  const [parsingWordLoading, setParsingWordLoading] = useState(false);
  const processFileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProcessData, setNewProcessData] = useState({
    code: '',
    name: '',
    symbol: 'QT',
    doc_type_id: '',
    doc_type_code: 'QT',
    department_id: '',
    department_name: '',
    file_path: '',
    document_level: 'Cấp phòng',
    editor: '',
    owner: '',
    approver: '',
    approver_bgd: 'Trần Đình Hùng (Tổng Giám Đốc)',
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
    if (mode === 'processes') {
      api.get('/iso-documents/types')
        .then(res => {
          if (Array.isArray(res)) setDocTypesList(res);
        })
        .catch(err => console.error('Lỗi khi tải danh mục loại tài liệu:', err));
    }
  }, [mode]);

  // Kích hoạt chọn tệp Word trực tiếp từ máy khi bấm Thêm mới
  const handleInitiateCreateProcess = () => {
    if (processFileInputRef.current) {
      processFileInputRef.current.value = '';
      processFileInputRef.current.click();
    }
  };

  const openCreateModal = async () => {
    try {
      setLoading(true);
      const [deptsData, tpData, procsData, typesData] = await Promise.all([
        api.get('/iso-documents/meta/departments').catch(() => []),
        api.get('/iso-documents/approvers/department-heads').catch(() => []),
        api.get('/iso-documents/processes').catch(() => []),
        api.get('/iso-documents/types').catch(() => [])
      ]);
      const depts = Array.isArray(deptsData) ? deptsData : [];
      const tps = Array.isArray(tpData) ? tpData : [];
      const procs = Array.isArray(procsData) ? procsData : [];
      const dtypes = Array.isArray(typesData) && typesData.length > 0 ? typesData : docTypesList;

      setDepartmentsList(depts);
      setDepartmentHeads(tps);
      setAllProcesses(procs);
      if (Array.isArray(typesData) && typesData.length > 0) {
        setDocTypesList(typesData);
      }

      const defaultDept = depts.length > 0 ? depts[0] : null;
      const deptCode = defaultDept ? defaultDept.code : 'CL';

      const defaultDocType = dtypes.length > 0 
        ? (dtypes.find(t => (t.code || '').toUpperCase() === 'QT') || dtypes[0]) 
        : { id: 1, name: 'Quy trình', code: 'QT' };
      const docTypeCode = defaultDocType.code || 'QT';

      const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
      const editorName = loggedInUser.full_name || loggedInUser.username || 'Administrator';

      // Sinh mã tài liệu tự động theo phòng ban & loại tài liệu
      const generatedCode = generateProcessCode(deptCode, docTypeCode, procs);

      const defaultApprover = tps.length > 0 ? tps[0].full_name : '';

      setSelectedWordFile(null);
      setNewProcessData({
        code: generatedCode,
        name: '',
        symbol: docTypeCode,
        doc_type_id: defaultDocType.id || '',
        doc_type_code: docTypeCode,
        department_id: defaultDept ? defaultDept.id : '',
        department_name: defaultDept ? defaultDept.name : '',
        file_path: '',
        document_level: 'Cấp phòng',
        editor: editorName,
        owner: editorName,
        approver: defaultApprover,
        approver_bgd: 'Trần Đình Hùng (Tổng Giám Đốc)',
        role: defaultDept ? defaultDept.name : '',
        status: 'Nháp'
      });
      setShowCreateModal(true);
    } catch (error) {
      console.error('Lỗi khi chuẩn bị tạo tài liệu:', error);
      showFeedback('error', 'Không thể tải danh sách dữ liệu khởi tạo');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDepartment = (deptId) => {
    const dept = departmentsList.find(d => d.id === parseInt(deptId, 10));
    if (!dept) return;
    const deptCode = dept.code || 'SX';
    const docTypeCode = newProcessData.doc_type_code || 'QT';
    const generatedCode = generateProcessCode(deptCode, docTypeCode, allProcesses);

    setNewProcessData(prev => ({
      ...prev,
      department_id: dept.id,
      department_name: dept.name,
      code: generatedCode,
      role: dept.name
    }));
  };

  const handleSelectDocType = (docTypeId) => {
    const dType = docTypesList.find(t => String(t.id) === String(docTypeId));
    const docTypeCode = dType ? dType.code : 'QT';
    const dept = departmentsList.find(d => d.id === parseInt(newProcessData.department_id, 10));
    const deptCode = dept ? dept.code : 'CL';
    const generatedCode = generateProcessCode(deptCode, docTypeCode, allProcesses);

    setNewProcessData(prev => ({
      ...prev,
      doc_type_id: dType ? dType.id : '',
      doc_type_code: docTypeCode,
      symbol: docTypeCode,
      code: generatedCode
    }));
  };

  // Xử lý bóc tách tệp Word: Tải lên -> Phân tích -> Tự động điền dữ liệu -> Hiển thị Modal
  const handleProcessWordUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileNameLower = file.name.toLowerCase();
    if (!fileNameLower.endsWith('.docx')) {
      showFeedback('error', 'Chỉ hỗ trợ tải lên tệp định dạng Word (.docx)');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setParsingWordLoading(true);

    try {
      // 1. Tải song song: Upload & parse Word đồng thời nạp danh sách Phòng ban & Trưởng phòng & Loại tài liệu
      const [parsedData, deptsData, tpData, procsData, typesData] = await Promise.all([
        api.post('/iso-documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }),
        departmentsList.length > 0 ? Promise.resolve(departmentsList) : api.get('/iso-documents/meta/departments').catch(() => []),
        departmentHeads.length > 0 ? Promise.resolve(departmentHeads) : api.get('/iso-documents/approvers/department-heads').catch(() => []),
        allProcesses.length > 0 ? Promise.resolve(allProcesses) : api.get('/iso-documents/processes').catch(() => []),
        docTypesList.length > 0 ? Promise.resolve(docTypesList) : api.get('/iso-documents/types').catch(() => [])
      ]);

      const depts = Array.isArray(deptsData) ? deptsData : [];
      const tps = Array.isArray(tpData) ? tpData : [];
      const procs = Array.isArray(procsData) ? procsData : [];
      const dtypes = Array.isArray(typesData) ? typesData : [];

      setDepartmentsList(depts);
      setDepartmentHeads(tps);
      setAllProcesses(procs);
      setDocTypesList(dtypes);

      // 2. Nhận diện phòng ban phù hợp từ tên tệp hoặc nội dung
      const fileBaseName = file.name.replace(/\.[^/.]+$/, "");
      const lowerName = fileBaseName.toLowerCase();
      let matchedDept = depts.find(d => {
        const c = (d.code || '').toLowerCase();
        const n = (d.name || '').toLowerCase();
        return (c && lowerName.includes(c)) || (n && lowerName.includes(n));
      });
      if (!matchedDept) {
        matchedDept = depts.find(d => (d.code || '').toUpperCase() === 'CL') || (depts.length > 0 ? depts[0] : null);
      }

      const deptCode = matchedDept ? matchedDept.code : 'CL';

      // Nhận diện loại tài liệu phù hợp (nếu có)
      let matchedType = dtypes.find(t => {
        const n = (t.name || '').toLowerCase();
        const c = (t.code || '').toLowerCase();
        return lowerName.includes(n) || lowerName.includes(`.${c}.`) || lowerName.includes(`-${c}-`);
      });
      if (!matchedType) {
        matchedType = dtypes.find(t => (t.code || '').toUpperCase() === 'QT') || (dtypes.length > 0 ? dtypes[0] : { id: 1, name: 'Quy trình', code: 'QT' });
      }
      const docTypeCode = matchedType ? matchedType.code : 'QT';

      // 3. Tự động sinh mã tài liệu kế tiếp theo phòng ban & loại tài liệu
      const generatedCode = generateProcessCode(deptCode, docTypeCode, procs);

      // 4. Lấy thông tin người biên soạn và Trưởng phòng duyệt
      const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
      const editorName = loggedInUser.full_name || loggedInUser.username || 'Administrator';
      const defaultApprover = tps.length > 0 ? tps[0].full_name : '';

      const processName = parsedData?.name || fileBaseName;

      // 5. Cập nhật state dữ liệu tài liệu
      setSelectedWordFile(file);
      setNewProcessData({
        code: generatedCode,
        name: processName,
        symbol: docTypeCode,
        doc_type_id: matchedType ? matchedType.id : '',
        doc_type_code: docTypeCode,
        department_id: matchedDept ? matchedDept.id : '',
        department_name: matchedDept ? matchedDept.name : '',
        file_path: parsedData?.file_path || '',
        diagram_data: parsedData?.diagram_data || '',
        sections: parsedData?.sections || undefined,
        steps: parsedData?.steps || undefined,
        document_level: 'Cấp phòng',
        editor: editorName,
        owner: editorName,
        approver: defaultApprover,
        approver_bgd: 'Trần Đình Hùng (Tổng Giám Đốc)',
        role: matchedDept ? matchedDept.name : '',
        status: 'Nháp'
      });

      showFeedback('success', `Đã bóc tách thành công tệp: ${file.name}`);
      
      // 6. Hiển thị Modal "Thêm tài liệu mới" sau khi chọn và bóc tách file xong
      setShowCreateModal(true);

    } catch (err) {
      console.error('Lỗi phân tích file Word:', err);
      showFeedback('error', err.response?.data?.detail || 'Không thể phân tích tệp Word');
    } finally {
      setParsingWordLoading(false);
      e.target.value = '';
    }
  };

  const handleCreateProcess = async (e) => {
    e.preventDefault();
    if (!newProcessData.code || !newProcessData.name || !newProcessData.department_id) {
      showFeedback('error', 'Vui lòng điền đầy đủ các thông tin bắt buộc (Cấp tài liệu, Phòng ban, Loại tài liệu, Tên tài liệu)');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/iso-documents/processes/save', newProcessData);
      setShowCreateModal(false);
      showFeedback('success', res.message || 'Khởi tạo tài liệu mới thành công!');
      fetchDocuments();
      
      const createdId = res.id;
      setTimeout(() => {
        setConfirmModal({
          show: true,
          id: createdId,
          title: '🎉 Khởi tạo thành công!',
          message: 'Tài liệu mới đã được tạo. Bạn có muốn chuyển đến màn hình Biên soạn & Vẽ lưu đồ ngay không?',
          confirmLabel: 'Đi đến Biên soạn',
          confirmColor: '#16a34a',
          onConfirm: () => {
            setConfirmModal({ show: false, id: null, title: '', message: '', onConfirm: null, confirmLabel: 'Xác nhận', confirmColor: '#d93025' });
            navigate(`/admin/iso-processes/edit/${createdId}`);
          }
        });
      }, 500);

    } catch (error) {
      console.error('Lỗi khi tạo tài liệu:', error);
      showFeedback('error', error.response?.data?.detail || 'Lỗi hệ thống khi tạo tài liệu mới');
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
      title: mode === 'processes' ? 'Xác nhận xoá Tài liệu' : 'Xác nhận xoá tài liệu ISO',
      message: mode === 'processes'
        ? `Bạn có chắc chắn muốn xoá tài liệu áp dụng thực tế '${code} - ${name}' cùng toàn bộ thiết lập chi tiết liên quan?`
        : `Bạn có chắc chắn muốn xoá tài liệu mẫu '${code} - ${name}' cùng toàn bộ lưu đồ và thiết lập checklist liên quan?`,
      onConfirm: async () => {
        try {
          const url = mode === 'processes' ? `/iso-documents/processes/${id}` : `/iso-documents/${id}`;
          await api.delete(url);
          showFeedback('success', `Đã xoá thành công!`);
          fetchDocuments();
        } catch (error) {
          console.error('Lỗi khi xoá tài liệu:', error);
          showFeedback('error', 'Không thể xoá tài liệu này');
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
          (doc.approver || '').toLowerCase().includes(q) ||
          (doc.approver_bgd || '').toLowerCase().includes(q);
      } else {
        matchSearch = 
          (doc.code || '').toLowerCase().includes(q) ||
          (doc.name || '').toLowerCase().includes(q) ||
          (doc.issuer || '').toLowerCase().includes(q) ||
          (doc.folder || '').toLowerCase().includes(q) ||
          (doc.doc_type || '').toLowerCase().includes(q);
      }
      
      const matchStatus = !statusFilter || (doc.status || '').toLowerCase().includes(statusFilter.toLowerCase());
      const matchLevel = !levelFilter || (doc.document_level || 'Cấp phòng') === levelFilter;
      const matchFolder = filterFolder === '' || doc.folder === filterFolder;
      const matchOwner = filterOwner === '' || (doc.owner === filterOwner || doc.issuer === filterOwner);
      return matchSearch && matchStatus && matchLevel && matchFolder && matchOwner;
    });
  }, [documents, searchTerm, statusFilter, levelFilter, filterFolder, filterOwner, mode]);

  const paginatedDocs = useMemo(() => {
    return filteredDocs.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredDocs, page, pageSize]);

  // Hiển thị cấp duyệt (chữ thường, không khung bo màu)
  const renderDocumentLevelBadge = (level) => {
    return (
      <span style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 500, whiteSpace: 'nowrap' }}>
        {level || 'Cấp phòng'}
      </span>
    );
  };

  // Người duyệt 1: Trưởng phòng ký (Chỉ hiển thị tên khi thực tế đã được ký duyệt)
  const renderApprover1 = (doc) => {
    const statusLower = (doc.status || '').toLowerCase().trim();

    // Chưa qua bước Trưởng phòng duyệt (Dự thảo, Bản nháp, Chờ duyệt, Chờ Trưởng phòng duyệt, Từ chối, Soạn thảo)
    if (
      !doc.status ||
      statusLower.includes('dự thảo') ||
      statusLower.includes('chờ trưởng phòng') ||
      statusLower.includes('chờ duyệt') ||
      statusLower.includes('bản nháp') ||
      statusLower.includes('từ chối') ||
      statusLower.includes('soạn thảo')
    ) {
      return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>---</span>;
    }

    // Các trạng thái Trưởng phòng đã duyệt: "Trưởng phòng đã duyệt", "Chờ BGĐ", "BGĐ đã duyệt", "Đã duyệt", "Hiệu lực"
    return (
      <span style={{ fontWeight: 500, color: '#1e293b' }}>
        {doc.approver || 'Trưởng phòng'}
      </span>
    );
  };

  // Người duyệt 2: Ban Giám Đốc (BGĐ) ký (Chỉ hiển thị tên khi thực tế đã được ký duyệt)
  const renderApprover2 = (doc) => {
    const lvl = doc.document_level || 'Cấp phòng';
    const statusLower = (doc.status || '').toLowerCase().trim();

    // Nếu là hồ sơ Cấp phòng (quy trình chỉ duyệt cấp phòng, không cần BGĐ)
    if (lvl === 'Cấp phòng' && !statusLower.includes('bgđ')) {
      return <span style={{ color: '#cbd5e1', fontWeight: 'bold' }} title="Không áp dụng cấp BGĐ">-</span>;
    }

    // Đã được BGĐ ký duyệt
    const isBgdApproved = statusLower.includes('bgđ đã duyệt') ||
                          statusLower.includes('ban giám đốc đã duyệt') ||
                          statusLower.includes('hiệu lực') ||
                          (statusLower.includes('đã duyệt') && !statusLower.includes('chờ bgđ'));

    if (isBgdApproved) {
      return (
        <span style={{ fontWeight: 600, color: '#1E40AF' }}>
          {doc.approver_bgd || 'Ban Giám Đốc'}
        </span>
      );
    }

    // Chưa tới lượt BGĐ duyệt hoặc đang chờ BGĐ duyệt
    return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>---</span>;
  };

  return (
    <div className="gold-layout iso-document-list-view" style={{
      height: 'calc(100vh - 68px)',
      maxHeight: 'calc(100vh - 68px)',
      minHeight: 0,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      width: '100%',
      padding: '0'
    }}>
      <div className="sticky-top-zone" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>

        {/* 0. Thanh chuyển đổi Tab nhóm Hồ sơ ISO */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 6px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #EADCC9',
          borderRadius: '10px',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}>
          <Link 
            to="/admin/iso-documents" 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              textDecoration: 'none',
              color: mode === 'documents' ? '#FFFFFF' : '#6B7280',
              backgroundColor: mode === 'documents' ? '#7B5233' : 'transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <FileText size={16} />
            <span>Quản lý mẫu tài liệu</span>
          </Link>
          <Link 
            to="/admin/iso-processes" 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              textDecoration: 'none',
              color: mode === 'processes' ? '#FFFFFF' : '#6B7280',
              backgroundColor: mode === 'processes' ? '#7B5233' : 'transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <Layers size={16} />
            <span>Tài liệu nghiệp vụ</span>
          </Link>
          <Link 
            to="/admin/iso-records" 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              textDecoration: 'none',
              color: '#6B7280',
              backgroundColor: 'transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <FolderArchive size={16} />
            <span>Quản lý hồ sơ (Master List)</span>
          </Link>
          <Link 
            to="/admin/iso-approvals" 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              textDecoration: 'none',
              color: '#6B7280',
              backgroundColor: 'transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <CheckCircle size={16} />
            <span>Hồ sơ cần duyệt</span>
          </Link>
          <Link 
            to="/admin/iso-signatures" 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              textDecoration: 'none',
              color: '#6B7280',
              backgroundColor: 'transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <Edit size={16} />
            <span>Quản lý Chữ ký</span>
          </Link>
        </div>

      {/* 1. Bộ điều khiển hành động và bộ lọc sử dụng PageToolbar và filter-inline-bar */}
      <PageToolbar
        searchValue={searchTerm}
        onSearchChange={(val) => { setSearchTerm(val); setPage(1); }}
        searchPlaceholder={mode === 'processes' ? 'Tìm theo mã tài liệu, tên, người biên soạn...' : 'Tìm theo mã mẫu, tên, người ban hành...'}
        showFilter={true}
        isFilterOpen={isFilterBarOpen}
        onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
        activeFiltersCount={(statusFilter ? 1 : 0) + (levelFilter ? 1 : 0) + (filterFolder ? 1 : 0) + (filterOwner ? 1 : 0)}
        onCreate={mode === 'processes' ? openCreateModal : undefined}
        createLabel={mode === 'processes' ? 'Thêm mới' : undefined}
        createActions={[]}
        hasWritePermission={true}
      />

      {isFilterBarOpen && (
        <div className="filter-inline-bar">
          {/* Lọc cấp duyệt */}
          <div className="filter-field-group">
            <label className="filter-field-label">Cấp duyệt</label>
            <select
              value={levelFilter}
              onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
            >
              <option value="">Tất cả cấp duyệt</option>
              <option value="Cấp phòng">Cấp phòng</option>
              <option value="Cấp công ty">Cấp công ty</option>
            </select>
          </div>

          {/* Lọc trạng thái */}
          <div className="filter-field-group">
            <label className="filter-field-label">Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">Tất cả trạng thái</option>
              {mode === 'processes' ? (
                <>
                  <option value="Hiệu lực">Hiệu lực</option>
                  <option value="Chờ xem xét">Chờ xem xét</option>
                  <option value="Chờ duyệt">Chờ duyệt</option>
                  <option value="Chỉnh sửa">Chỉnh sửa</option>
                  <option value="Nháp">Nháp</option>
                  <option value="Hết hiệu lực">Hết hiệu lực</option>
                </>
              ) : (
                <>
                  <option value="Chờ Trưởng phòng">Chờ Trưởng phòng duyệt</option>
                  <option value="Chờ BGĐ">Chờ BGĐ duyệt</option>
                  <option value="Trưởng phòng đã duyệt">Trưởng phòng đã duyệt</option>
                  <option value="BGĐ đã duyệt">BGĐ đã duyệt</option>
                  <option value="Hiệu lực">Hiệu lực / Đang lưu hành</option>
                  <option value="Nháp">Nháp / Dự thảo</option>
                  <option value="Từ chối">Từ chối</option>
                </>
              )}
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
      </div>

      {/* 2. Bảng Danh sách Quy trình ISO */}
      <div className="admin-list-layout" style={{ flex: '1 1 0%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="mgmt-table admin-table-card card-shadow" style={{
          backgroundColor: 'white',
          border: '1px solid #EADCC9',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 0%',
          height: '100%',
          minHeight: 0
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
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 0%', minHeight: 0, height: '100%', overflow: 'hidden' }}>
            <div className="admin-table-scroll" style={{ overflowX: 'auto', overflowY: 'auto', flex: '1 1 0%', minHeight: 0, height: '100%' }}>
            <table className="data-table" style={{ width: '100%', minWidth: '100%', tableLayout: 'auto' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0' }}>
                <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9' }}>
                  <th style={{ padding: '7px 4px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '38px', textAlign: 'center', whiteSpace: 'nowrap' }}>STT</th>
                  {mode === 'processes' ? (
                    <>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '90px', whiteSpace: 'nowrap' }}>MÃ CŨ</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '85px', textAlign: 'center', whiteSpace: 'nowrap' }}>MÃ MỚI</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '130px', maxWidth: '140px', whiteSpace: 'nowrap' }}>PHÒNG BAN</th>
                      <th style={{ padding: '7px 8px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', minWidth: '280px' }}>TÊN TÀI LIỆU</th>
                      <th style={{ padding: '7px 4px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '75px', textAlign: 'center', whiteSpace: 'nowrap' }}>SỐ TÀI LIỆU</th>
                      <th style={{ padding: '7px 4px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '80px', textAlign: 'center', whiteSpace: 'nowrap' }}>CẤP DUYỆT</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '110px', textAlign: 'center', whiteSpace: 'nowrap' }}>NGƯỜI BIÊN SOẠN</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '120px', whiteSpace: 'nowrap' }}>TRƯỞNG PHÒNG DUYỆT</th>
                      <th style={{ padding: '7px 4px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '110px', textAlign: 'center', whiteSpace: 'nowrap' }}>THỜI GIAN CẬP NHẬT</th>
                      <th style={{ padding: '7px 4px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '120px', textAlign: 'center', whiteSpace: 'nowrap' }}>TRẠNG THÁI</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '90px', whiteSpace: 'nowrap' }}>MÃ MẪU</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '90px', whiteSpace: 'nowrap' }}>KÝ HIỆU</th>
                      <th style={{ padding: '7px 8px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', minWidth: '150px' }}>TÊN TÀI LIỆU</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '130px', whiteSpace: 'nowrap' }}>THUỘC QUY TRÌNH</th>
                      <th style={{ padding: '7px 2px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '45px', textAlign: 'center', whiteSpace: 'nowrap' }}>PHIÊN BẢN</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '95px', whiteSpace: 'nowrap' }}>LOẠI TÀI LIỆU</th>
                      <th style={{ padding: '7px 4px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '75px', textAlign: 'center', whiteSpace: 'nowrap' }}>CẤP DUYỆT</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '95px', whiteSpace: 'nowrap' }}>NGƯỜI TẠO</th>
                      <th style={{ padding: '7px 6px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '110px', whiteSpace: 'nowrap' }}>TRƯỞNG PHÒNG DUYỆT</th>
                      <th style={{ padding: '7px 4px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '80px', textAlign: 'center', whiteSpace: 'nowrap' }}>BGĐ DUYỆT</th>
                      <th style={{ padding: '7px 4px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '85px', textAlign: 'center', whiteSpace: 'nowrap' }}>CẬP NHẬT CUỐI</th>
                      <th style={{ padding: '7px 2px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '42px', textAlign: 'center', whiteSpace: 'nowrap' }}>FILE GỐC</th>
                      <th style={{ padding: '7px 4px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '115px', textAlign: 'center', whiteSpace: 'nowrap' }}>TRẠNG THÁI</th>
                    </>
                  )}
                  <th style={{ padding: '7px 2px', fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233', width: '38px', textAlign: 'center', whiteSpace: 'nowrap' }}>THAO TÁC</th>
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
                    <td style={{ padding: '6px 4px', fontSize: '0.8rem', color: '#64748b', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap' }}>{index + 1}</td>
                    
                    {mode === 'processes' ? (
                      <>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', fontWeight: 600, color: '#7B5233', whiteSpace: 'nowrap' }}>{doc.code}</td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {doc.new_code || ''}
                        </td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, maxWidth: '140px', whiteSpace: 'nowrap' }}>
                          <span 
                            title={doc.department_name || doc.symbol || '---'}
                            style={{ 
                              display: 'inline-block',
                              maxWidth: '125px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              verticalAlign: 'middle',
                              backgroundColor: '#FAF6F0', 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              border: '1px solid #EADCC9', 
                              fontSize: '0.78rem', 
                              fontWeight: 600, 
                              color: '#7B5233' 
                            }}
                          >
                            {doc.department_name || doc.symbol || '---'}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, wordBreak: 'break-word', minWidth: '280px' }}>{doc.name}</td>
                        <td style={{ padding: '6px 4px', fontSize: '0.8rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {(() => {
                            const count = doc.documents_count || 0;
                            const isZero = count === 0;
                            return (
                              <span style={{
                                fontWeight: 700,
                                color: isZero ? '#DC2626' : '#15803D',
                                backgroundColor: isZero ? '#FEE2E2' : '#DCFCE7',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                border: `1px solid ${isZero ? '#FECACA' : '#BBF7D0'}`,
                                display: 'inline-block'
                              }}>
                                {count} TL
                              </span>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '6px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {renderDocumentLevelBadge(doc.document_level)}
                        </td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {doc.editor || '---'}
                        </td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {renderApprover1(doc)}
                        </td>
                        <td style={{ padding: '6px 4px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {formatVietnameseDate(doc.updated_at || doc.issue_date || doc.created_at)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', fontWeight: 600, color: '#7B5233', whiteSpace: 'nowrap' }}>{doc.code}</td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, whiteSpace: 'nowrap' }}>{doc.symbol || '---'}</td>
                        <td style={{ padding: '6px 8px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, wordBreak: 'break-word' }}>{doc.name}</td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {doc.process_code ? (
                            <span title={doc.process_name} style={{ fontWeight: 600, color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #BFDBFE', fontSize: '0.75rem' }}>
                              {doc.process_code}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.75rem' }}>Chưa gán</span>
                          )}
                        </td>
                        <td style={{ padding: '6px 2px', fontSize: '0.8rem', color: '#1e293b', textAlign: 'center', fontWeight: 500, whiteSpace: 'nowrap' }}>v{doc.version || '01'}</td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, whiteSpace: 'nowrap' }}>{doc.doc_type || '---'}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {renderDocumentLevelBadge(doc.document_level)}
                        </td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, whiteSpace: 'nowrap' }}>{doc.issuer || '---'}</td>
                        <td style={{ padding: '6px 6px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {renderApprover1(doc)}
                        </td>
                        <td style={{ padding: '6px 4px', fontSize: '0.8rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {renderApprover2(doc)}
                        </td>
                        <td style={{ padding: '6px 4px', fontSize: '0.8rem', color: '#1e293b', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {formatVietnameseDate(doc.updated_at || doc.created_at || doc.issue_date)}
                        </td>
                        <td style={{ padding: '6px 2px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {doc.file_path ? (
                            <a
                              href={`${api.defaults.baseURL.replace(/\/$/, '')}/iso-documents/${mode === 'processes' ? `processes/${doc.id}` : doc.id}/download-raw`}
                              download
                              target="_blank"
                              rel="noreferrer"
                              title="Tải tệp tin gốc nguyên bản"
                              style={{ color: '#7B5233', display: 'inline-flex', padding: '3px', borderRadius: '4px', backgroundColor: '#FAF6F0', cursor: 'pointer' }}
                            >
                              <Download size={13} />
                            </a>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Không có</span>
                          )}
                        </td>
                      </>
                    )}

                    <td style={{ padding: '6px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {renderDocStatusBadge(doc.status, doc.document_level)}
                    </td>
                    <td style={{ position: 'relative', textAlign: 'center', zIndex: actionMenuId === doc.id ? 40 : 1, whiteSpace: 'nowrap', padding: '6px 2px' }}>
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
                            className="action-menu-item"
                            style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => {
                              setActionMenuId(null);
                              navigate(`/admin/iso-approvals?keyword=${encodeURIComponent(doc.code)}`);
                            }}
                          >
                            <CheckCircle size={14} />
                            <span>Ký duyệt hồ sơ</span>
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
      {/* 4. Modal Tạo Quy trình thực tế mới (Gold Design System) */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(45, 26, 18, 0.22)',
            border: '1px solid #EADCC9',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '18px 24px',
              backgroundColor: '#FAF7F2',
              borderBottom: '1px solid #EADCC9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#FAF0E6',
                  border: '1px solid #E6D5C3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7B5233'
                }}>
                  <Layers size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, color: '#2D1A12', fontSize: '1.18rem', fontWeight: 700 }}>
                    Thêm tài liệu mới
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: '#786C62', marginTop: '2px', display: 'block' }}>
                    Khởi tạo thông tin tài liệu nghiệp vụ trước khi biên soạn
                  </span>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#EFE8DF'; e.currentTarget.style.color = '#2D1A12'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6B7280'; }}
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Form nội dung chuẩn hóa 5 hàng */}
            <form onSubmit={handleCreateProcess} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* HÀNG 1: Cấp tài liệu, Phòng ban */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
                  {/* Cấp tài liệu */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      <Layers size={14} color="#7B5233" />
                      <span>Cấp tài liệu</span>
                      <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      value={newProcessData.document_level || 'Cấp phòng'}
                      onChange={(e) => {
                        const newLvl = e.target.value;
                        setNewProcessData(prev => ({
                          ...prev,
                          document_level: newLvl
                        }));
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #D9C7B6',
                        outline: 'none',
                        fontSize: '0.88rem',
                        fontWeight: 500,
                        backgroundColor: '#FFFFFF',
                        color: '#1F2937',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="Cấp phòng">Cấp phòng</option>
                      <option value="Cấp công ty">Cấp công ty</option>
                    </select>
                  </div>

                  {/* Phòng ban */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      <Building size={14} color="#7B5233" />
                      <span>Phòng ban</span>
                      <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      value={newProcessData.department_id || ''}
                      onChange={(e) => handleSelectDepartment(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #D9C7B6',
                        outline: 'none',
                        fontSize: '0.88rem',
                        color: '#1F2937',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                      required
                    >
                      <option value="" disabled>-- Chọn phòng ban áp dụng tài liệu --</option>
                      {departmentsList.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* HÀNG 2: Loại tài liệu, Mã tài liệu (k chỉnh sửa) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
                  {/* Loại tài liệu */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      <FolderArchive size={14} color="#7B5233" />
                      <span>Loại tài liệu</span>
                      <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      value={newProcessData.doc_type_id || ''}
                      onChange={(e) => handleSelectDocType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #D9C7B6',
                        outline: 'none',
                        fontSize: '0.88rem',
                        color: '#1F2937',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                      required
                    >
                      <option value="" disabled>-- Chọn loại tài liệu --</option>
                      {docTypesList.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mã tài liệu (k chỉnh sửa) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Mã tài liệu <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newProcessData.code}
                      readOnly
                      title="Mã tài liệu được sinh tự động theo Cấp, Phòng ban và Loại tài liệu"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        outline: 'none',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        backgroundColor: '#F9FAFB',
                        color: '#1F2937',
                        cursor: 'default',
                        boxSizing: 'border-box'
                      }}
                      required
                    />
                  </div>
                </div>

                {/* HÀNG 3: Tên tài liệu (Full width 1 hàng) */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    <FileText size={14} color="#7B5233" />
                    <span>Tên tài liệu</span>
                    <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập tên tài liệu..."
                    value={newProcessData.name}
                    onChange={(e) => setNewProcessData(prev => ({ ...prev, name: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #D9C7B6',
                      outline: 'none',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                      color: '#1F2937',
                      fontWeight: 500
                    }}
                    required
                  />
                </div>

                {/* HÀNG 4: Người biên soạn, người phê duyệt */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
                  {/* Người biên soạn */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      <User size={13} color="#6B7280" />
                      <span>Người biên soạn</span>
                    </label>
                    <input
                      type="text"
                      value={newProcessData.editor}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        outline: 'none',
                        fontSize: '0.88rem',
                        fontWeight: 500,
                        backgroundColor: '#F9FAFB',
                        color: '#4B5563',
                        cursor: 'default',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Người phê duyệt */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      <ShieldCheck size={13} color="#7B5233" />
                      <span>{newProcessData.document_level === 'Cấp công ty' ? 'Người phê duyệt (Trưởng phòng)' : 'Người phê duyệt'}</span>
                      <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                      value={newProcessData.approver || ''}
                      onChange={(e) => setNewProcessData(prev => ({ ...prev, approver: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #D9C7B6',
                        outline: 'none',
                        fontSize: '0.88rem',
                        color: '#1F2937',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                      required
                    >
                      <option value="" disabled>-- Chọn người phê duyệt --</option>
                      {departmentHeads.map(acc => (
                        <option key={acc.id} value={acc.full_name}>
                          {acc.display_name || `${acc.full_name} (${acc.department_name || acc.role_name || 'Trưởng phòng'})`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Nếu Cấp công ty -> Người duyệt 2 (BGĐ) */}
                {newProcessData.document_level === 'Cấp công ty' && (
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', fontWeight: 600, color: '#1E40AF', marginBottom: '6px' }}>
                      <ShieldCheck size={13} color="#1E40AF" />
                      <span>Người phê duyệt 2: Cấp công ty (Ban Giám Đốc)</span>
                      <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newProcessData.approver_bgd || 'Trần Đình Hùng (Tổng Giám Đốc)'}
                      onChange={(e) => setNewProcessData(prev => ({ ...prev, approver_bgd: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #BFDBFE',
                        outline: 'none',
                        fontSize: '0.88rem',
                        color: '#1E3A8A',
                        backgroundColor: '#EFF6FF',
                        fontWeight: 600,
                        boxSizing: 'border-box'
                      }}
                      required
                    />
                    <span style={{ fontSize: '0.74rem', color: '#3B82F6', marginTop: '4px', display: 'block' }}>
                      ℹ️ Tài liệu 2 cấp duyệt: Trưởng phòng duyệt Bước 1, Ban Giám Đốc ký duyệt ban hành Bước 2.
                    </span>
                  </div>
                )}

                {/* HÀNG 5: Thời gian cập nhật, Trạng thái cập nhật */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
                  {/* Thời gian cập nhật */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      <Calendar size={13} color="#6B7280" />
                      <span>Thời gian cập nhật</span>
                    </label>
                    <input
                      type="text"
                      value={getCurrentFormattedDate()}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        outline: 'none',
                        fontSize: '0.88rem',
                        fontWeight: 500,
                        backgroundColor: '#F9FAFB',
                        color: '#4B5563',
                        cursor: 'default',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Trạng thái cập nhật */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      Trạng thái cập nhật
                    </label>
                    <div style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#F9FAFB',
                      fontSize: '0.88rem',
                      color: '#6B7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxSizing: 'border-box'
                    }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#FFF7ED',
                        color: '#C2410C',
                        border: '1px solid #FDBA74'
                      }}>
                        Nháp
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>(Sẽ chuyển tiếp khi biên soạn)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Modal */}
              <div style={{
                padding: '14px 24px',
                backgroundColor: '#FAF7F2',
                borderTop: '1px solid #EADCC9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '0.78rem', color: '#786C62' }}>
                  * Sau khi tạo mới, hệ thống sẽ mở trình biên soạn lưu đồ & biểu mẫu.
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '8px',
                      border: '1px solid #D5C2B0',
                      backgroundColor: '#FFFFFF',
                      color: '#5A4D43',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5EFE8'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#7B5233',
                      color: '#FFFFFF',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(123, 82, 51, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#634026'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B5233'}
                  >
                    <Plus size={16} />
                    Tạo mới tài liệu
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ISODocumentListView;
