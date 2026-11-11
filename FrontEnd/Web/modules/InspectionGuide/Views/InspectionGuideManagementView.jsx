import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import {
  BookOpen, Plus, Search, Filter, LayoutGrid, List, Eye, Edit3, Trash2,
  CheckCircle2, XCircle, Layers, CheckSquare, Image as ImageIcon,
  Tag, RefreshCw, Sparkles, ShieldCheck, FileText, AlertTriangle, MoreVertical,
  ChevronLeft, ChevronRight, Sliders, FileDown
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import GuideQuickPreviewModal from './components/GuideQuickPreviewModal';
import InspectionFormTypeModal from './components/InspectionFormTypeModal';
import { INSPECTION_TYPE_OPTIONS } from './components/GuideAssignmentTab';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import '@styles/components.css';

const DOC_CONFIGS = {
  HDKT: {
    type: 'HDKT',
    title: 'Hướng dẫn kiểm tra (HDKT)',
    shortLabel: 'HDKT',
    subtitle: 'Quản lý quy chuẩn, danh mục các bước thực hiện và ảnh minh họa tiêu chuẩn kiểm định chất lượng QA/QC.',
    icon: BookOpen,
    color: '#7B5233',
    bg: '#FAF6F0',
    border: '#EADCC9',
    createPath: '/admin/inspection-guides/create',
    editBasePath: '/admin/inspection-guides/edit',
    createText: 'Tạo HDKT mới',
    emptyTitle: 'Chưa có tài liệu Hướng dẫn kiểm tra (HDKT) nào'
  },
  SOS: {
    type: 'SOS',
    title: 'Hướng dẫn thao tác (SOS)',
    shortLabel: 'SOS',
    subtitle: 'Bảng phân tích thao tác chuẩn (Standard Operating Sheet) cho công nhân tại từng vị trí, từng công đoạn sản xuất.',
    icon: FileText,
    color: '#0284C7',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    createPath: '/admin/sos-guides/create',
    editBasePath: '/admin/sos-guides/edit',
    createText: 'Tạo SOS mới',
    emptyTitle: 'Chưa có tài liệu Hướng dẫn thao tác (SOS) nào'
  },
  CTQ: {
    type: 'CTQ',
    title: 'Lỗi cần chú ý (CTQ)',
    shortLabel: 'CTQ',
    subtitle: 'Điểm kiểm soát chất lượng trọng yếu (Critical To Quality) & cảnh báo lỗi nguy cơ cao trong quá trình sản xuất.',
    icon: AlertTriangle,
    color: '#E11D48',
    bg: '#FFF1F2',
    border: '#FECDD3',
    createPath: '/admin/ctq-guides/create',
    editBasePath: '/admin/ctq-guides/edit',
    createText: 'Tạo CTQ mới',
    emptyTitle: 'Chưa có tài liệu Lỗi cần chú ý (CTQ) nào'
  }
};

const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
};

const getTypeLabel = (type) => {
  const found = INSPECTION_TYPE_OPTIONS.find(o => o.value === type);
  return found ? (found.badge || found.label) : (type || 'Chưa rõ');
};

const InspectionGuideManagementView = ({ docType }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title: metaTitle, subtitle: metaSubtitle } = useScreenMetadataCached(location.pathname);

  // Determine current active doc type (HDKT, SOS, or CTQ) based on prop or route path
  const activeDocType = useMemo(() => {
    if (docType && DOC_CONFIGS[docType]) return docType;
    const pathname = location.pathname.toLowerCase();
    if (pathname.includes('/sos-guides')) return 'SOS';
    if (pathname.includes('/ctq-guides')) return 'CTQ';
    return 'HDKT';
  }, [docType, location.pathname]);

  const config = DOC_CONFIGS[activeDocType] || DOC_CONFIGS.HDKT;

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(metaTitle || config.title);
    if (setCustomSubtitle) setCustomSubtitle(metaSubtitle || 'Tài liệu ban hành');
    if (setCustomScreenCode && screenCode) setCustomScreenCode(screenCode);
    return () => {
      if (setCustomTitle) setCustomTitle('');
      if (setCustomSubtitle) setCustomSubtitle('');
      if (setCustomScreenCode) setCustomScreenCode('');
    };
  }, [screenCode, metaTitle, metaSubtitle, config, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);
  const HeaderIcon = config.icon;

  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stagesMap, setStagesMap] = useState({});

  // Filters & View State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const res = await api.get('/stages/').catch(() => api.get('/stages'));
        const list = Array.isArray(res) ? res : (res?.items || []);
        const map = {};
        list.forEach(s => {
          map[s.id] = s.name || s.stage_name;
        });
        setStagesMap(map);
      } catch (err) {
        console.warn('Lỗi tải danh sách công đoạn:', err);
      }
    };
    fetchStages();
  }, []);

  const [isTypeConfigOpen, setIsTypeConfigOpen] = useState(false);
  const [formTypes, setFormTypes] = useState([]);

  const fetchFormTypes = async () => {
    try {
      const res = await api.get('/inspection-form-types?include_inactive=true');
      const list = Array.isArray(res) ? res : (res?.data || []);
      if (list.length > 0) {
        setFormTypes(list);
      }
    } catch (e) {
      console.warn('Lỗi tải loại phiếu:', e);
    }
  };

  useEffect(() => {
    fetchFormTypes();
  }, []);

  // Modals state
  const [previewGuide, setPreviewGuide] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);

  // Multi-select & Export state
  const [selectedGuideIds, setSelectedGuideIds] = useState([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-btn') && !e.target.closest('.action-menu')) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchGuides();
  }, [activeDocType]);

  const fetchGuides = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch specifically for this doc_type
      const res = await api.get(`/inspection-guides?doc_type=${activeDocType}&limit=500`);
      const items = res?.items || (Array.isArray(res) ? res : []);
      // Filter strictly by activeDocType
      const filteredItems = items.filter(g => (g.doc_type || 'HDKT') === activeDocType);
      setGuides(filteredItems);
    } catch (err) {
      console.error(`Lỗi tải danh sách ${config.title}:`, err);
      setError(err.message || `Lỗi tải dữ liệu ${config.title}`);
      if (toast) toast('error', `Không thể tải danh mục ${config.title}.`);
    } finally {
      setLoading(false);
    }
  };

  // Quick toggle active state
  const handleToggleActive = async (g, e) => {
    e.stopPropagation();
    try {
      const updatedStatus = !g.is_active;
      await api.put(`/inspection-guides/${g.id}`, {
        code: g.code,
        name: g.name,
        doc_type: g.doc_type || activeDocType,
        description: g.description,
        is_active: updatedStatus
      });
      setGuides(prev => prev.map(item => item.id === g.id ? { ...item, is_active: updatedStatus } : item));
      if (toast) toast('success', `Đã ${updatedStatus ? 'kích hoạt' : 'tạm ngưng'} tài liệu "${g.code}"`);
    } catch (err) {
      if (toast) toast('error', 'Lỗi cập nhật trạng thái');
    }
  };

  // Delete flow with modal
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/inspection-guides/${deleteTarget.id}`);
      setGuides(prev => prev.filter(g => g.id !== deleteTarget.id));
      if (toast) toast('success', `Đã xóa tài liệu "${deleteTarget.name}" thành công`);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Lỗi xóa tài liệu:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi khi xóa tài liệu');
    } finally {
      setDeleting(false);
    }
  };

  // Open Preview Modal
  const handleOpenPreview = async (g, e) => {
    if (e) e.stopPropagation();
    try {
      const detail = await api.get(`/inspection-guides/${g.id}`);
      setPreviewGuide(detail || g);
    } catch (err) {
      setPreviewGuide(g);
    }
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  // Filtered list
  const filteredGuides = useMemo(() => {
    return guides.filter(g => {
      const matchesSearch = !search ||
        (g.code && g.code.toLowerCase().includes(search.toLowerCase())) ||
        (g.name && g.name.toLowerCase().includes(search.toLowerCase())) ||
        (g.description && g.description.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && g.is_active) ||
        (statusFilter === 'inactive' && !g.is_active);

      const matchesType = typeFilter === 'all' || (g.assignments && g.assignments.some(a => a.inspection_type === typeFilter));

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [guides, search, statusFilter, typeFilter]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, typeFilter, activeDocType]);

  const totalPages = Math.ceil(filteredGuides.length / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  const paginatedGuides = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGuides.slice(start, start + pageSize);
  }, [filteredGuides, currentPage, pageSize]);

  useEffect(() => {
    setSelectedGuideIds([]);
  }, [activeDocType]);

  // Download file helper (docx or zip)
  const handleDownloadFile = async (url, payload = null, fallbackName = 'Tai_lieu.docx') => {
    setExporting(true);
    try {
      const res = payload
        ? await api.post(url, payload, { responseType: 'blob' })
        : await api.get(url, { responseType: 'blob' });

      const blob = new Blob([res], {
        type: fallbackName.endsWith('.zip')
          ? 'application/zip'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fallbackName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      if (toast) toast('success', `Đã xuất file "${fallbackName}" thành công!`);
    } catch (err) {
      console.error('Lỗi xuất file Word:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi khi xuất file Word');
    } finally {
      setExporting(false);
    }
  };

  const handleExportSingle = (g) => {
    const safeCode = (g.code || `HD_${g.id}`).replace(/[\\/*?:"<>|]/g, '_').trim();
    const safeName = (g.name || 'Tai_lieu').replace(/[\\/*?:"<>|]/g, '_').trim().slice(0, 80);
    const filename = `${safeCode}_${safeName}.docx`;
    handleDownloadFile(`/inspection-guides/${g.id}/export-docx`, null, filename);
  };

  const handleExportSelected = () => {
    if (selectedGuideIds.length === 0) return;
    if (selectedGuideIds.length === 1) {
      const singleGuide = guides.find(g => g.id === selectedGuideIds[0]);
      if (singleGuide) {
        handleExportSingle(singleGuide);
        return;
      }
    }
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const zipName = `${config.shortLabel}_Selected_${selectedGuideIds.length}_Docs_${timestamp}.zip`;
    handleDownloadFile(
      `/inspection-guides/export-docx-batch?ids=${selectedGuideIds.join(',')}`,
      null,
      zipName
    );
  };

  const handleToggleSelect = (guideId, e) => {
    if (e) e.stopPropagation();
    setSelectedGuideIds(prev =>
      prev.includes(guideId) ? prev.filter(id => id !== guideId) : [...prev, guideId]
    );
  };

  const handleSelectAllCurrentPage = (e) => {
    if (e) e.stopPropagation();
    const currentPageIds = paginatedGuides.map(g => g.id);
    const allSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedGuideIds.includes(id));
    if (allSelected) {
      setSelectedGuideIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedGuideIds(prev => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  // Statistics calculation for activeDocType
  const stats = useMemo(() => {
    const total = guides.length;
    const active = guides.filter(g => g.is_active).length;
    const inactive = total - active;
    const assignedTypes = new Set();
    guides.forEach(g => {
      if (g.assignments) {
        g.assignments.forEach(a => assignedTypes.add(a.inspection_type));
      }
    });

    return { total, active, inactive, typesCount: assignedTypes.size };
  }, [guides]);

  // Detect duplicate assignments across active guides: same (inspection_type, stage_id)
  const conflictMap = useMemo(() => {
    const map = {};
    (guides || []).forEach(g => {
      if (!g.is_active || !g.assignments) return;
      g.assignments.forEach(a => {
        const key = `${a.inspection_type}_${a.stage_id || 'all'}`;
        if (!map[key]) map[key] = [];
        map[key].push({ id: g.id, code: g.code, name: g.name });
      });
    });
    return map;
  }, [guides]);

  const getTypeLabel = (val) => {
    const legacyMap = {
      'mau-dau-tien': 'Kiểm tra mẫu lần đầu',
      'dau-vao': 'Nhập kho nguyên liệu (IQC)',
      'sau-dong-goi': 'Sau đóng gói (OQC)',
      'quy-trinh': 'Kiểm tra quy trình',
      'do-am': 'Đo độ ẩm gỗ',
      'bam-dinh': 'Kiểm tra bám dính sơn'
    };
    if (legacyMap[val]) return legacyMap[val];
    const fromApi = formTypes.find(t => t.code === val);
    if (fromApi) return fromApi.short_name || fromApi.name;
    const opt = INSPECTION_TYPE_OPTIONS.find(o => o.value === val);
    return opt ? opt.label : val;
  };

  return (
    <div
      className="guide-management-container"
      style={{
        padding: '20px 28px',
        fontFamily: 'Inter, sans-serif',
        backgroundColor: '#FAF8F6',
        height: '100%',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >

      {/* Top KPI Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14,
        marginBottom: 14,
        flexShrink: 0
      }}>
        {/* Metric 1 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          padding: '16px 20px',
          border: '1px solid #EADCC9',
          boxShadow: '0 2px 8px rgba(123, 82, 51, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: config.bg,
            color: config.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <HeaderIcon size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Tổng số {config.shortLabel}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2D1A12', marginTop: 2 }}>
              {stats.total}
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          padding: '16px 20px',
          border: '1px solid #EADCC9',
          boxShadow: '0 2px 8px rgba(123, 82, 51, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: '#ECFDF5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Đang hoạt động
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: 2 }}>
              {stats.active}
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          padding: '16px 20px',
          border: '1px solid #EADCC9',
          boxShadow: '0 2px 8px rgba(123, 82, 51, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <XCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Tạm ngưng
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#DC2626', marginTop: 2 }}>
              {stats.inactive}
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          padding: '16px 20px',
          border: '1px solid #EADCC9',
          boxShadow: '0 2px 8px rgba(123, 82, 51, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Loại phiếu đã gán
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563EB', marginTop: 2 }}>
              {stats.typesCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Control Bar */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: '12px 16px',
        border: '1px solid #EADCC9',
        boxShadow: '0 2px 8px rgba(123, 82, 51, 0.04)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 14,
        flexShrink: 0
      }}>
        {/* Left: Search input */}
        <div style={{ position: 'relative', minWidth: 280, flex: 1, maxWidth: 420 }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Tìm kiếm theo mã, tên ${config.shortLabel} hoặc mô tả...`}
            style={{
              width: '100%',
              padding: '9px 12px 9px 38px',
              borderRadius: 8,
              border: '1px solid #D1D5DB',
              fontSize: 13.5,
              outline: 'none',
              transition: 'border-color 0.2s',
              backgroundColor: '#FAF8F6'
            }}
            onFocus={e => { e.currentTarget.style.borderColor = config.color; e.currentTarget.style.backgroundColor = '#FFF'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.backgroundColor = '#FAF8F6'; }}
          />
        </div>

        {/* Right: Status & Type Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Status filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFF',
                fontSize: 13,
                fontWeight: 600,
                color: '#374151'
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Tạm ngưng</option>
            </select>
          </div>

          {/* Inspection Type filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Loại phiếu:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFF',
                fontSize: 13,
                fontWeight: 600,
                color: '#374151',
                maxWidth: 200
              }}
            >
              <option value="all">Tất cả loại phiếu</option>
              {(formTypes.length > 0 ? formTypes : INSPECTION_TYPE_OPTIONS).map(opt => {
                const val = opt.code || opt.value;
                const label = opt.name || opt.label;
                return (
                  <option key={val} value={val}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Page Size filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Hiển thị:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFF',
                fontSize: 13,
                fontWeight: 600,
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              <option value={10}>10 dòng</option>
              <option value={15}>15 dòng</option>
              <option value={30}>30 dòng</option>
              <option value={50}>50 dòng</option>
            </select>
          </div>

          {/* View Mode Toggle Button */}
          <div style={{
            display: 'flex',
            backgroundColor: '#F1F5F9',
            padding: 3,
            borderRadius: 8,
            border: '1px solid #E2E8F0'
          }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: viewMode === 'table' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'table' ? '#7B5233' : '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontWeight: 700,
                fontSize: 12,
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <List size={14} /> Bảng
            </button>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'grid' ? '#7B5233' : '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontWeight: 700,
                fontSize: 12,
                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <LayoutGrid size={14} /> Thẻ Card
            </button>
          </div>

          <div style={{ width: 1, height: 24, backgroundColor: '#E2E8F0', margin: '0 2px' }} />

          {/* Action buttons */}
          <button
            onClick={() => fetchGuides()}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #EADCC9',
              backgroundColor: '#FFFFFF',
              color: '#7B5233',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F5EFE9'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>

          {/* Button open Inspection Form Types Config Modal */}
          <button
            onClick={() => setIsTypeConfigOpen(true)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#334155',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.2s'
            }}
            title="Cấu hình danh mục loại phiếu kiểm tra (Custom)"
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
          >
            <Sliders size={15} color="#7B5233" /> Cấu hình loại phiếu
          </button>

          <button
            onClick={() => navigate(config.createPath)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: config.color,
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: `0 3px 8px ${config.color}35`,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.9)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Plus size={16} /> {config.createText}
          </button>
        </div>
      </div>

      {/* Selection Action Bar (Khi người dùng chọn tài liệu) */}
      {selectedGuideIds.length > 0 && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: '10px 18px',
          border: `1.5px solid ${config.color}`,
          boxShadow: '0 4px 14px rgba(123, 82, 51, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          flexShrink: 0,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              backgroundColor: config.bg,
              color: config.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckSquare size={16} />
            </div>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#2D1A12' }}>
              Đã chọn <strong style={{ color: config.color, fontSize: 15 }}>{selectedGuideIds.length}</strong> / {filteredGuides.length} {config.shortLabel}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={handleExportSelected}
              disabled={exporting}
              style={{
                padding: '7px 16px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: config.color,
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 13,
                cursor: exporting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: `0 2px 6px ${config.color}35`,
                opacity: exporting ? 0.7 : 1,
                transition: 'all 0.15s'
              }}
            >
              <FileDown size={15} className={exporting ? 'animate-spin' : ''} />
              {exporting ? 'Đang tạo file Word...' : (selectedGuideIds.length === 1 ? 'Xuất file Word (.docx)' : `Xuất file Word (.zip) (${selectedGuideIds.length})`)}
            </button>

            <button
              onClick={() => setSelectedGuideIds([])}
              style={{
                padding: '7px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#64748B',
                fontWeight: 600,
                fontSize: 12.5,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Main Content List Area */}
      {loading ? (
        <div style={{
          backgroundColor: '#FFF',
          borderRadius: 16,
          padding: 60,
          textAlign: 'center',
          border: '1px solid #EADCC9',
          color: '#7B5233'
        }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
          <p style={{ margin: 0, fontWeight: 700 }}>Đang tải danh sách {config.title}...</p>
        </div>
      ) : filteredGuides.length === 0 ? (
        <div style={{
          backgroundColor: '#FFF',
          borderRadius: 16,
          padding: 60,
          textAlign: 'center',
          border: '1px dashed #D1D5DB'
        }}>
          <HeaderIcon size={48} style={{ color: '#D1D5DB', margin: '0 auto 16px auto' }} />
          <h3 style={{ margin: '0 0 8px 0', color: '#2D1A12', fontWeight: 800 }}>
            {config.emptyTitle}
          </h3>
          <p style={{ margin: '0 0 20px 0', color: '#64748B', fontSize: 14 }}>
            {search || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Thử thay đổi bộ lọc tìm kiếm hoặc từ khóa.'
              : `Bắt đầu bằng cách tạo tài liệu ${config.shortLabel} đầu tiên.`}
          </p>
          <button
            onClick={() => navigate(config.createPath)}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              backgroundColor: config.color,
              color: '#FFF',
              border: 'none',
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Plus size={16} /> {config.createText}
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div style={{
          flex: 1,
          minHeight: 0,
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #EADCC9',
          boxShadow: '0 4px 14px rgba(123, 82, 51, 0.05)',
          overflowY: 'auto',
          overflowX: 'auto',
          position: 'relative'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF8F6' }}>
              <tr style={{
                backgroundColor: '#FAF8F6',
                borderBottom: '1.5px solid #EADCC9',
                color: '#7B5233',
                fontSize: 12.5,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: 44, backgroundColor: '#FAF8F6', position: 'sticky', top: 0, zIndex: 10 }}>
                  <input
                    type="checkbox"
                    checked={paginatedGuides.length > 0 && paginatedGuides.every(g => selectedGuideIds.includes(g.id))}
                    onChange={handleSelectAllCurrentPage}
                    style={{ cursor: 'pointer', width: 16, height: 16, accentColor: config.color }}
                    title="Chọn tất cả trên trang này"
                  />
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', width: 140, backgroundColor: '#FAF8F6', position: 'sticky', top: 0, zIndex: 10 }}>Mã tài liệu</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', backgroundColor: '#FAF8F6', position: 'sticky', top: 0, zIndex: 10 }}>Tên tài liệu & Mô tả</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', width: 180, backgroundColor: '#FAF8F6', position: 'sticky', top: 0, zIndex: 10 }}>Quy mô các bước</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', width: 170, backgroundColor: '#FAF8F6', position: 'sticky', top: 0, zIndex: 10 }}>Loại phiếu áp dụng</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', width: 170, backgroundColor: '#FAF8F6', position: 'sticky', top: 0, zIndex: 10 }}>Công đoạn áp dụng</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: 130, backgroundColor: '#FAF8F6', position: 'sticky', top: 0, zIndex: 10 }}>Trạng thái</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: 120, backgroundColor: '#FAF8F6', position: 'sticky', top: 0, zIndex: 10 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedGuides.map((g, idx) => {
                const stepsCount = g.steps?.length ?? g.steps_count ?? 0;
                const subStepsCount = (g.steps || []).reduce((acc, s) => acc + (s.sub_steps?.length || 0), 0);
                const imagesCount = (g.steps || []).reduce((acc, s) => acc + (s.images?.length || 0), 0);

                return (
                  <tr
                    key={g.id}
                    onClick={() => navigate(`/admin/inspection-guides/edit/${g.id}`)}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                      backgroundColor: selectedGuideIds.includes(g.id) ? '#F5EFE9' : (idx % 2 === 0 ? '#FFFFFF' : '#FCFBFA'),
                      position: 'relative',
                      zIndex: actionMenuId === g.id ? 40 : 1
                    }}
                    onMouseEnter={e => {
                      if (actionMenuId !== g.id) e.currentTarget.style.backgroundColor = '#F5EFE9';
                    }}
                    onMouseLeave={e => {
                      if (actionMenuId !== g.id) e.currentTarget.style.backgroundColor = selectedGuideIds.includes(g.id) ? '#F5EFE9' : (idx % 2 === 0 ? '#FFFFFF' : '#FCFBFA');
                    }}
                  >
                    {/* Checkbox chọn */}
                    <td style={{ padding: '14px 14px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedGuideIds.includes(g.id)}
                        onChange={e => handleToggleSelect(g.id, e)}
                        style={{ cursor: 'pointer', width: 16, height: 16, accentColor: config.color }}
                      />
                    </td>

                    {/* Mã tài liệu */}
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        backgroundColor: config.bg,
                        color: config.color,
                        border: `1px solid ${config.border}`,
                        fontWeight: 800,
                        fontSize: 12.5,
                        fontFamily: 'monospace',
                        display: 'inline-block'
                      }}>
                        {g.code}
                      </span>
                    </td>

                    {/* Tên & Mô tả */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 800, color: '#2D1A12', fontSize: 14.5 }}>
                        {g.name}
                      </div>
                      {g.process && (
                        <div style={{ marginTop: 4 }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 8px',
                            borderRadius: 4,
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            border: '1px solid #FDE68A',
                            fontSize: 11.5,
                            fontWeight: 700
                          }}>
                            Quy trình ISO: [{g.process.code}] {g.process.name}
                          </span>
                        </div>
                      )}
                      {g.description && (
                        <div style={{
                          color: '#64748B',
                          fontSize: 12.5,
                          marginTop: 3,
                          maxWidth: 450,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {stripHtml(g.description)}
                        </div>
                      )}
                    </td>

                    {/* Quy mô các bước */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          backgroundColor: '#FAF8F6',
                          border: '1px solid #EADCC9',
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#7B5233',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <Layers size={13} /> {stepsCount} bước lớn
                        </span>
                        {subStepsCount > 0 && (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#065F46',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <CheckSquare size={13} /> {subStepsCount} bước nhỏ
                          </span>
                        )}
                        {imagesCount > 0 && (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#1E40AF',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <ImageIcon size={13} /> {imagesCount} ảnh
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Loại phiếu áp dụng */}
                    <td style={{ padding: '14px 18px' }}>
                      {(!g.assignments || g.assignments.length === 0) ? (
                        <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>Chưa gán</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {g.assignments.slice(0, 2).map((a, aIdx) => {
                            const conflictKey = `${a.inspection_type}_${a.stage_id || 'all'}`;
                            const conflictList = conflictMap[conflictKey] || [];
                            const isConflicted = conflictList.length > 1;
                            const otherConflicts = conflictList.filter(item => item.id !== g.id);

                            return (
                              <span
                                key={a.id || aIdx}
                                title={isConflicted ? `⚠️ Bị trùng gán cặp này với tài liệu: ${otherConflicts.map(c => c.code).join(', ')}` : ''}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  backgroundColor: isConflicted ? '#FEE2E2' : '#F1F5F9',
                                  color: isConflicted ? '#991B1B' : '#475569',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  border: isConflicted ? '1px solid #FCA5A5' : 'none'
                                }}
                              >
                                {isConflicted && <AlertTriangle size={11} color="#DC2626" />}
                                {getTypeLabel(a.inspection_type)}
                              </span>
                            );
                          })}
                          {g.assignments.length > 2 && (
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: '#E2E8F0',
                              color: '#475569',
                              fontSize: 10.5,
                              fontWeight: 700
                            }}>
                              +{g.assignments.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Công đoạn áp dụng */}
                    <td style={{ padding: '14px 18px' }}>
                      {(!g.assignments || g.assignments.length === 0) ? (
                        <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>Chưa gán</span>
                      ) : (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {g.assignments.slice(0, 2).map((a, aIdx) => {
                            const stageText = a.stage_id ? (stagesMap[a.stage_id] || `CĐ #${a.stage_id}`) : 'Tất cả CĐ';
                            const conflictKey = `${a.inspection_type}_${a.stage_id || 'all'}`;
                            const conflictList = conflictMap[conflictKey] || [];
                            const isConflicted = conflictList.length > 1;
                            const otherConflicts = conflictList.filter(item => item.id !== g.id);

                            return (
                              <span
                                key={a.id || aIdx}
                                title={isConflicted ? `⚠️ Bị trùng gán cặp này với tài liệu: ${otherConflicts.map(c => c.code).join(', ')}` : ''}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  backgroundColor: isConflicted ? '#FEE2E2' : (a.stage_id ? '#FEF3C7' : '#F1F5F9'),
                                  color: isConflicted ? '#991B1B' : (a.stage_id ? '#92400E' : '#475569'),
                                  fontSize: 11,
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  border: isConflicted ? '1px solid #FCA5A5' : (a.stage_id ? '1px solid #FDE68A' : 'none')
                                }}
                              >
                                {isConflicted && <AlertTriangle size={11} color="#DC2626" />}
                                {stageText}
                              </span>
                            );
                          })}
                          {g.assignments.length > 2 && (
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              backgroundColor: '#E2E8F0',
                              color: '#475569',
                              fontSize: 10.5,
                              fontWeight: 700
                            }}>
                              +{g.assignments.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => handleToggleActive(g, e)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: 20,
                          border: 'none',
                          backgroundColor: g.is_active ? '#D1FAE5' : '#FEE2E2',
                          color: g.is_active ? '#065F46' : '#991B1B',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: g.is_active ? '#059669' : '#DC2626'
                        }} />
                        {g.is_active ? 'Hoạt động' : 'Tạm ngưng'}
                      </button>
                    </td>

                    {/* Thao tác (...) */}
                    <td style={{ padding: '12px 16px', textAlign: 'center', position: 'relative', zIndex: actionMenuId === g.id ? 40 : 1 }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                        <button
                          type="button"
                          className="action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuId(actionMenuId === g.id ? null : g.id);
                          }}
                          title="Thao tác"
                        >
                          <MoreVertical size={16} style={{ pointerEvents: 'none' }} />
                        </button>

                        {actionMenuId === g.id && (
                          <div className="action-menu" style={{ right: 0, top: '100%' }}>
                            <button
                              type="button"
                              className="action-menu-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuId(null);
                                handleOpenPreview(g, e);
                              }}
                            >
                              Xem chi tiết
                            </button>
                            <button
                              type="button"
                              className="action-menu-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuId(null);
                                navigate(`${config.editBasePath}/${g.id}`);
                              }}
                            >
                              Chỉnh sửa
                            </button>
                            <button
                              type="button"
                              className="action-menu-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuId(null);
                                handleExportSingle(g);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0284C7' }}
                            >
                              <FileDown size={14} /> Xuất file Word (.docx)
                            </button>
                            <button
                              type="button"
                              className="action-menu-item danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuId(null);
                                setDeleteTarget(g);
                              }}
                            >
                              Xóa tài liệu
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID CARD VIEW */
        <div style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
          overflowY: 'auto',
          padding: '4px 2px 20px 2px',
          alignContent: 'start'
        }}>
          {paginatedGuides.map(g => {
            const stepsCount = g.steps?.length ?? g.steps_count ?? 0;
            const subStepsCount = (g.steps || []).reduce((acc, s) => acc + (s.sub_steps?.length || 0), 0);
            const imagesCount = (g.steps || []).reduce((acc, s) => acc + (s.images?.length || 0), 0);

            return (
              <div
                key={g.id}
                onClick={() => navigate(`/admin/inspection-guides/edit/${g.id}`)}
                style={{
                  backgroundColor: selectedGuideIds.includes(g.id) ? '#FAF5F0' : '#FFFFFF',
                  borderRadius: 16,
                  border: selectedGuideIds.includes(g.id) ? `1.5px solid ${config.color}` : '1px solid #EADCC9',
                  padding: 20,
                  boxShadow: '0 4px 12px rgba(123, 82, 51, 0.04)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = config.color;
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 24px rgba(123, 82, 51, 0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = selectedGuideIds.includes(g.id) ? config.color : '#EADCC9';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(123, 82, 51, 0.04)';
                }}
              >
                <div>
                  {/* Card Top Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={selectedGuideIds.includes(g.id)}
                        onChange={e => handleToggleSelect(g.id, e)}
                        onClick={e => e.stopPropagation()}
                        style={{ cursor: 'pointer', width: 16, height: 16, accentColor: config.color }}
                        title="Chọn tài liệu này"
                      />
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      backgroundColor: config.bg,
                      color: config.color,
                      border: `1px solid ${config.border}`,
                      fontWeight: 800,
                      fontSize: 12,
                      fontFamily: 'monospace'
                    }}>
                      {g.code}
                    </span>
                  </div>

                    <button
                      onClick={e => handleToggleActive(g, e)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 12,
                        border: 'none',
                        backgroundColor: g.is_active ? '#D1FAE5' : '#FEE2E2',
                        color: g.is_active ? '#065F46' : '#991B1B',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {g.is_active ? 'Hoạt động' : 'Tạm ngưng'}
                    </button>
                  </div>

                  {/* Guide Name */}
                  <h3 style={{
                    margin: '0 0 8px 0',
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    color: '#2D1A12',
                    lineHeight: '1.4'
                  }}>
                    {g.name}
                  </h3>

                  {g.process && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        borderRadius: 4,
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                        border: '1px solid #FDE68A',
                        fontSize: 11.5,
                        fontWeight: 700
                      }}>
                        Quy trình ISO: [{g.process.code}] {g.process.name}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  {g.description && (
                    <p style={{
                      margin: '0 0 16px 0',
                      fontSize: 13,
                      color: '#64748B',
                      lineHeight: '1.5',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {stripHtml(g.description)}
                    </p>
                  )}

                  {/* Metrics Badges */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      backgroundColor: '#FAF8F6',
                      border: '1px solid #EADCC9',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#7B5233',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <Layers size={13} /> {stepsCount} bước lớn
                    </span>
                    {subStepsCount > 0 && (
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        backgroundColor: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#065F46',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <CheckSquare size={13} /> {subStepsCount} bước nhỏ
                      </span>
                    )}
                    {imagesCount > 0 && (
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#1E40AF',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <ImageIcon size={13} /> {imagesCount} ảnh
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div style={{
                  paddingTop: 14,
                  borderTop: '1px solid #F1F5F9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      onClick={e => handleOpenPreview(g, e)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid #EADCC9',
                        backgroundColor: '#FAF8F6',
                        color: '#7B5233',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Eye size={14} /> Xem trước
                    </button>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleExportSingle(g);
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: '1px solid #BAE6FD',
                        backgroundColor: '#F0F9FF',
                        color: '#0284C7',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title="Xuất file Word (.docx)"
                    >
                      <FileDown size={13} /> Word
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => navigate(`/admin/inspection-guides/edit/${g.id}`)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: 'none',
                        backgroundColor: '#7B5233',
                        color: '#FFF',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Edit3 size={14} /> Soạn thảo
                    </button>

                    <button
                      onClick={() => setDeleteTarget(g)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 8,
                        border: '1px solid #FEE2E2',
                        backgroundColor: '#FFF',
                        color: '#DC2626',
                        fontSize: 12.5,
                        cursor: 'pointer'
                      }}
                      title="Xóa tài liệu"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Phân trang - Desktop */}
      {filteredGuides.length > 0 && (
        <div className="admin-pagination-desktop desktop-only" style={{ borderRadius: viewMode === 'table' ? '0 0 12px 12px' : '12px', marginTop: viewMode === 'table' ? 0 : 12 }}>
          <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
            Hiển thị <b>{(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredGuides.length)}</b> trên <b>{filteredGuides.length}</b> kết quả
          </div>

          {totalPages > 1 && (
            <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="page-btn"
                title="Trang trước"
              >
                <ChevronLeft size={14} />
              </button>
              {(() => {
                const pages = [];
                const delta = 2;
                for (let i = 1; i <= totalPages; i++) {
                  if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                    pages.push(i);
                  } else if (pages[pages.length - 1] !== '...') {
                    pages.push('...');
                  }
                }
                return pages.map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`ell-${idx}`} style={{ padding: '0 4px', color: '#8D6E63', fontWeight: '700' }}>
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={p}
                      type="button"
                      className={`page-btn ${currentPage === p ? 'active' : ''}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  );
                });
              })()}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="page-btn"
                title="Trang sau"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Phân trang - Mobile Sticky */}
      {totalPages > 1 && (
        <div className="pagination-mobile-sticky mobile-only">
          <button
            type="button"
            className="page-btn"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#7B5233' }}>
            Trang {currentPage} / {totalPages || 1}
          </span>
          <button
            type="button"
            className="page-btn"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages || totalPages <= 1}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <BeautifulConfirmModal
        isOpen={!!deleteTarget}
        title={`Xác nhận xóa ${config.shortLabel}`}
        message={`Bạn có chắc chắn muốn xóa tài liệu "${deleteTarget?.name}" (${deleteTarget?.code})? Toàn bộ các bước thực hiện và ảnh tiêu chuẩn đính kèm sẽ bị xóa hoàn toàn.`}
        confirmText={deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
        confirmColor="#DC2626"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Quick Preview Modal */}
      {previewGuide && (
        <GuideQuickPreviewModal
          isOpen={Boolean(previewGuide)}
          guide={previewGuide}
          onClose={() => setPreviewGuide(null)}
          onEdit={(id) => {
            setPreviewGuide(null);
            navigate(`/admin/inspection-guides/edit/${id}`);
          }}
        />
      )}

      {/* Inspection Form Types Config Modal */}
      <InspectionFormTypeModal
        isOpen={isTypeConfigOpen}
        onClose={() => setIsTypeConfigOpen(false)}
        onUpdated={() => {
          fetchFormTypes();
          fetchGuides();
        }}
      />
    </div>
  );
};

export default InspectionGuideManagementView;
