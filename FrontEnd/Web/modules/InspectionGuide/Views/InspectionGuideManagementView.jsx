import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen, Plus, Search, Filter, LayoutGrid, List, Eye, Edit3, Trash2,
  CheckCircle2, XCircle, Layers, CheckSquare, Image as ImageIcon,
  Tag, RefreshCw, Sparkles, ShieldCheck, FileText, AlertTriangle, MoreVertical
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import GuideQuickPreviewModal from './components/GuideQuickPreviewModal';
import { INSPECTION_TYPE_OPTIONS } from './components/GuideAssignmentTab';
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
    createText: '+ Tạo HDKT mới',
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
    createText: '+ Tạo SOS mới',
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
    createText: '+ Tạo CTQ mới',
    emptyTitle: 'Chưa có tài liệu Lỗi cần chú ý (CTQ) nào'
  }
};

const InspectionGuideManagementView = ({ docType }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Determine current active doc type (HDKT, SOS, or CTQ) based on prop or route path
  const activeDocType = useMemo(() => {
    if (docType && DOC_CONFIGS[docType]) return docType;
    const pathname = location.pathname.toLowerCase();
    if (pathname.includes('/sos-guides')) return 'SOS';
    if (pathname.includes('/ctq-guides')) return 'CTQ';
    return 'HDKT';
  }, [docType, location.pathname]);

  const config = DOC_CONFIGS[activeDocType] || DOC_CONFIGS.HDKT;
  const HeaderIcon = config.icon;

  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & View State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Modals state
  const [previewGuide, setPreviewGuide] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);

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
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12,
        flexShrink: 0
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: config.color,
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${config.color}35`
            }}>
              <HeaderIcon size={22} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Tài liệu ban hành
              </div>
              <h1 style={{ margin: 0, fontSize: '1.65rem', color: '#2D1A12', fontWeight: 800, letterSpacing: '-0.02em' }}>
                {config.title}
              </h1>
            </div>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: 14 }}>
            {config.subtitle}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => fetchGuides()}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid #EADCC9',
              backgroundColor: '#FFFFFF',
              color: '#7B5233',
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F5EFE9'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>

          <button
            onClick={() => navigate(config.createPath)}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: config.color,
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: `0 4px 12px ${config.color}40`,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(0.9)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Plus size={18} /> {config.createText}
          </button>
        </div>
      </div>

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
              {INSPECTION_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
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
        </div>
      </div>

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
              cursor: 'pointer'
            }}
          >
            {config.createText}
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
                <th style={{ padding: '12px 16px', textAlign: 'left', width: 140, backgroundColor: '#FAF8F6', position: 'sticky', top: 0, zIndex: 10 }}>Mã tài liệu</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', backgroundColor: '#FAF8F6', position: 'sticky', top: 0, zIndex: 10 }}>Tên tài liệu & Mô tả</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', width: 220, backgroundColor: '#FAF8F6', position: 'sticky', top: 0, zIndex: 10 }}>Quy mô các bước</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', width: 200, backgroundColor: '#FAF8F6', position: 'sticky', top: 0, zIndex: 10 }}>Loại phiếu áp dụng</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: 140, backgroundColor: '#FAF8F6', position: 'sticky', top: 0, zIndex: 10 }}>Trạng thái</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: 140, backgroundColor: '#FAF8F6', position: 'sticky', top: 0, zIndex: 10 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuides.map((g, idx) => {
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
                      backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FCFBFA',
                      position: 'relative',
                      zIndex: actionMenuId === g.id ? 40 : 1
                    }}
                    onMouseEnter={e => {
                      if (actionMenuId !== g.id) e.currentTarget.style.backgroundColor = '#F5EFE9';
                    }}
                    onMouseLeave={e => {
                      if (actionMenuId !== g.id) e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#FCFBFA';
                    }}
                  >
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
                          {g.description}
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
                          {g.assignments.slice(0, 2).map((a, aIdx) => (
                            <span
                              key={a.id || aIdx}
                              style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                backgroundColor: '#F1F5F9',
                                color: '#475569',
                                fontSize: 11,
                                fontWeight: 700
                              }}
                            >
                              {getTypeLabel(a.inspection_type)}
                            </span>
                          ))}
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
                    <td style={{ padding: '14px 18px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
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

                    {/* Thao tác */}
                    <td style={{ padding: '14px 18px', textAlign: 'center', position: 'relative', zIndex: actionMenuId === g.id ? 50 : 1 }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className="action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionMenuId(actionMenuId === g.id ? null : g.id);
                        }}
                        title="Thao tác"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {actionMenuId === g.id && (
                        <div className="action-menu" style={{ right: '50%', transform: 'translateX(50%)', top: '80%', zIndex: 100 }}>
                          <button
                            type="button"
                            className="action-menu-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuId(null);
                              handleOpenPreview(g, e);
                            }}
                          >
                            Xem trước
                          </button>
                          <button
                            type="button"
                            className="action-menu-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuId(null);
                              navigate(`/admin/inspection-guides/edit/${g.id}`);
                            }}
                          >
                            Chỉnh sửa
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
          {filteredGuides.map(g => {
            const stepsCount = g.steps?.length ?? g.steps_count ?? 0;
            const subStepsCount = (g.steps || []).reduce((acc, s) => acc + (s.sub_steps?.length || 0), 0);
            const imagesCount = (g.steps || []).reduce((acc, s) => acc + (s.images?.length || 0), 0);

            return (
              <div
                key={g.id}
                onClick={() => navigate(`/admin/inspection-guides/edit/${g.id}`)}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  border: '1px solid #EADCC9',
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
                  e.currentTarget.style.borderColor = '#EADCC9';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(123, 82, 51, 0.04)';
                }}
              >
                <div>
                  {/* Card Top Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
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
                      {g.description}
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
          guide={previewGuide}
          onClose={() => setPreviewGuide(null)}
          onEdit={(id) => {
            setPreviewGuide(null);
            navigate(`/admin/inspection-guides/edit/${id}`);
          }}
        />
      )}
    </div>
  );
};

export default InspectionGuideManagementView;
