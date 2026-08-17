import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  FileText, Plus, Search, Filter, LayoutGrid, List, Eye, Edit3, Trash2,
  CheckCircle2, XCircle, Layers, Image as ImageIcon, Sparkles, RefreshCw,
  ExternalLink, ArrowUpDown, MoreVertical, ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import SOSQuickPreviewModal from './components/SOSQuickPreviewModal';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import '@styles/components.css';

const THEME = {
  primary: '#7B5233',
  hover: '#5D3B32',
  bgLight: '#FAF6F0',
  borderLight: '#EADCC9',
  badgeBg: '#FAF6F0',
  badgeText: '#7B5233',
  pageBg: '#FAF8F6'
};

// Helper làm sạch và format chuỗi mô tả/phạm vi áp dụng
const formatScopeText = (text) => {
  if (!text) return '—';
  return text
    .replace(/\[\s*\]/g, ' • ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^•\s*/, '')
    .trim();
};

const SOSGuideManagementView = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/sos-guides');

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Modals & Actions
  const [previewGuide, setPreviewGuide] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
  }, []);

  const fetchGuides = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/inspection-guides?doc_type=SOS');
      const list = Array.isArray(res) ? res : res?.items || [];
      const filtered = list.filter(g => (g.doc_type || '').toUpperCase() === 'SOS');
      setGuides(filtered);
    } catch (err) {
      console.error('Lỗi tải danh sách SOS:', err);
      setError('Không thể tải danh sách Hướng dẫn thao tác.');
      if (toast) toast('error', 'Lỗi tải danh sách Hướng dẫn thao tác (SOS).');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (g, e) => {
    if (e) e.stopPropagation();
    const updatedStatus = g.is_active === false ? true : false;
    try {
      await api.put(`/inspection-guides/${g.id}`, {
        code: g.code,
        name: g.name,
        doc_type: 'SOS',
        description: g.description,
        is_active: updatedStatus
      });
      setGuides(prev => prev.map(item => item.id === g.id ? { ...item, is_active: updatedStatus } : item));
      if (toast) toast('success', `Đã ${updatedStatus ? 'áp dụng' : 'tạm ngưng'} tài liệu "${g.code}"`);
    } catch (err) {
      console.error('Lỗi đổi trạng thái:', err);
      if (toast) toast('error', 'Lỗi khi cập nhật trạng thái.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/inspection-guides/${deleteTarget.id}`);
      if (toast) toast('success', `Đã xóa SOS "${deleteTarget.code}" thành công.`);
      setGuides(prev => prev.filter(g => g.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Lỗi xóa SOS:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi khi xóa tài liệu SOS.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered List
  const filteredGuides = useMemo(() => {
    return guides.filter(g => {
      const matchSearch =
        (g.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (g.code || '').toLowerCase().includes(search.toLowerCase()) ||
        (g.description || '').toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === 'all' ? true :
          statusFilter === 'active' ? g.is_active !== false :
            g.is_active === false;

      return matchSearch && matchStatus;
    });
  }, [guides, search, statusFilter]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

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

  // Calculate Metrics
  const totalGuides = guides.length;
  const activeGuides = guides.filter(g => g.is_active !== false).length;
  const inactiveGuides = totalGuides - activeGuides;
  const totalSteps = guides.reduce((sum, g) => sum + (g.steps?.length || 0), 0);
  const totalImages = guides.reduce((sum, g) => {
    const stepImgs = (g.steps || []).reduce((sSum, st) => sSum + (st.images?.length || 0), 0);
    return sum + stepImgs;
  }, 0);

  return (
    <div
      className="guide-management-container"
      style={{
        padding: '16px 24px',
        fontFamily: 'Inter, sans-serif',
        backgroundColor: THEME.pageBg,
        height: '100%',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        flexWrap: 'wrap',
        gap: 12,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: THEME.primary,
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(123, 82, 51, 0.2)'
          }}>
            <FileText size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Tài liệu ban hành
            </div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#1E293B', fontWeight: 800 }}>
              Hướng dẫn thao tác (SOS)
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={fetchGuides}
            disabled={loading}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: `1px solid ${THEME.borderLight}`,
              backgroundColor: '#FFF',
              color: THEME.primary,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Làm mới
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/sos-guides/create')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              backgroundColor: THEME.primary,
              color: '#FFF',
              border: 'none',
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(123, 82, 51, 0.25)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = THEME.hover}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = THEME.primary}
          >
            <Plus size={16} /> Tạo SOS mới
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        marginBottom: 12,
        flexShrink: 0
      }}>
        {/* Metric 1: Total */}
        <div style={{
          padding: '12px 16px',
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          border: `1px solid ${THEME.borderLight}`,
          boxShadow: '0 2px 6px rgba(123, 82, 51, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: THEME.bgLight, color: THEME.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Tổng số SOS</div>
            <div style={{ fontSize: '1.35rem', color: '#1E293B', fontWeight: 800, lineHeight: '1.2' }}>{totalGuides}</div>
          </div>
        </div>

        {/* Metric 2: Active */}
        <div style={{
          padding: '12px 16px',
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          border: `1px solid ${THEME.borderLight}`,
          boxShadow: '0 2px 6px rgba(123, 82, 51, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Đang áp dụng</div>
            <div style={{ fontSize: '1.35rem', color: '#059669', fontWeight: 800, lineHeight: '1.2' }}>{activeGuides}</div>
          </div>
        </div>

        {/* Metric 3: Inactive */}
        <div style={{
          padding: '12px 16px',
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          border: `1px solid ${THEME.borderLight}`,
          boxShadow: '0 2px 6px rgba(123, 82, 51, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XCircle size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Tạm ngưng</div>
            <div style={{ fontSize: '1.35rem', color: '#DC2626', fontWeight: 800, lineHeight: '1.2' }}>{inactiveGuides}</div>
          </div>
        </div>

        {/* Metric 4: Steps & Images */}
        <div style={{
          padding: '12px 16px',
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          border: `1px solid ${THEME.borderLight}`,
          boxShadow: '0 2px 6px rgba(123, 82, 51, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: THEME.bgLight, color: THEME.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Quy trình & Ảnh</div>
            <div style={{ fontSize: '1.15rem', color: THEME.primary, fontWeight: 800, lineHeight: '1.2' }}>
              {totalSteps} <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B' }}>bước</span> / {totalImages} <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B' }}>ảnh</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        border: `1px solid ${THEME.borderLight}`,
        padding: '10px 14px',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã SOS, tên thao tác, phạm vi..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
              backgroundColor: '#FFF',
              cursor: 'pointer'
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang áp dụng</option>
            <option value="inactive">Tạm ngưng</option>
          </select>

          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            style={{
              padding: '7px 10px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              fontSize: 13,
              fontWeight: 600,
              color: '#334155',
              backgroundColor: '#FFF',
              cursor: 'pointer'
            }}
          >
            <option value={10}>10 dòng / trang</option>
            <option value={15}>15 dòng / trang</option>
            <option value={25}>25 dòng / trang</option>
            <option value={50}>50 dòng / trang</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', padding: 3, borderRadius: 8 }}>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              padding: '5px 9px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: viewMode === 'table' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'table' ? THEME.primary : '#64748B',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <List size={14} /> Bảng
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            style={{
              padding: '5px 9px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'grid' ? THEME.primary : '#64748B',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <LayoutGrid size={14} /> Lưới
          </button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' ? (
        <div style={{
          flex: 1,
          minHeight: 0,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: `1px solid ${THEME.borderLight}`,
          overflowY: 'auto',
          overflowX: 'auto',
          boxShadow: '0 2px 8px rgba(123, 82, 51, 0.03)',
          position: 'relative'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: THEME.bgLight }}>
              <tr style={{
                backgroundColor: THEME.bgLight,
                borderBottom: `1.5px solid ${THEME.borderLight}`,
                color: THEME.primary,
                fontWeight: 800,
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.03em'
              }}>
                <th style={{ padding: '10px 14px', width: 50, textAlign: 'center', backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>STT</th>
                <th style={{ padding: '10px 14px', width: 140, backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Mã tài liệu</th>
                <th style={{ padding: '10px 14px', minWidth: 200, backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Tên Hướng dẫn thao tác (SOS)</th>
                <th style={{ padding: '10px 14px', width: 280, maxWidth: 360, backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Vị trí & Phạm vi áp dụng</th>
                <th style={{ padding: '10px 14px', width: 110, textAlign: 'center', backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Quy trình</th>
                <th style={{ padding: '10px 14px', width: 110, textAlign: 'center', backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Ảnh chuẩn</th>
                <th style={{ padding: '10px 14px', width: 130, textAlign: 'center', backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Trạng thái</th>
                <th style={{ padding: '10px 14px', width: 120, textAlign: 'center', backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                    <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px auto', display: 'block', color: THEME.primary }} />
                    Đang tải danh sách Hướng dẫn thao tác (SOS)...
                  </td>
                </tr>
              ) : filteredGuides.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center' }}>
                    <FileText size={40} style={{ color: '#CBD5E1', margin: '0 auto 12px auto' }} />
                    <div style={{ color: '#64748B', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                      Chưa có Hướng dẫn thao tác (SOS) nào
                    </div>
                    <div style={{ color: '#94A3B8', fontSize: 12.5, marginBottom: 14 }}>
                      {search || statusFilter !== 'all'
                        ? 'Không tìm thấy kết quả phù hợp với bộ lọc.'
                        : 'Bắt đầu xây dựng bảng phân tích thao tác chuẩn bằng cách nhấn nút bên dưới.'}
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/admin/sos-guides/create')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        backgroundColor: THEME.primary,
                        color: '#FFF',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer'
                      }}
                    >
                      + Tạo SOS mới
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedGuides.map((g, idx) => {
                  const stepCount = g.steps?.length || 0;
                  const imgCount = (g.steps || []).reduce((sum, s) => sum + (s.images?.length || 0), 0);
                  const isActive = g.is_active !== false;

                  return (
                    <tr
                      key={g.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s',
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FCFAF8',
                        position: 'relative',
                        zIndex: actionMenuId === g.id ? 40 : 1
                      }}
                      onMouseEnter={e => {
                        if (actionMenuId !== g.id) e.currentTarget.style.backgroundColor = THEME.bgLight;
                      }}
                      onMouseLeave={e => {
                        if (actionMenuId !== g.id) e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#FCFAF8';
                      }}
                    >
                      {/* STT */}
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: '#94A3B8', fontWeight: 600 }}>
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>

                      {/* Mã tài liệu */}
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          backgroundColor: THEME.bgLight,
                          border: `1px solid ${THEME.borderLight}`,
                          color: THEME.primary,
                          fontWeight: 800,
                          fontSize: 12,
                          fontFamily: 'monospace',
                          display: 'inline-block'
                        }}>
                          {g.code}
                        </span>
                      </td>

                      {/* Tên SOS */}
                      <td style={{ padding: '10px 14px' }}>
                        <div
                          onClick={() => setPreviewGuide(g)}
                          style={{
                            fontWeight: 700,
                            color: '#0F172A',
                            fontSize: 13.5,
                            cursor: 'pointer',
                            transition: 'color 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = THEME.primary}
                          onMouseLeave={e => e.currentTarget.style.color = '#0F172A'}
                          title="Nhấn để xem trước tài liệu SOS"
                        >
                          {g.name}
                        </div>
                      </td>

                      {/* Vị trí & Phạm vi áp dụng (Gọn gàng, tối đa 2 dòng + Tooltip) */}
                      <td style={{ padding: '10px 14px', maxWidth: 360 }}>
                        <div
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: 12.5,
                            lineHeight: '1.4',
                            color: '#475569',
                            cursor: 'help'
                          }}
                          title={g.description || 'Chưa có mô tả phạm vi áp dụng'}
                        >
                          {formatScopeText(g.description)}
                        </div>
                      </td>

                      {/* Quy trình */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          backgroundColor: THEME.bgLight,
                          border: `1px solid ${THEME.borderLight}`,
                          color: THEME.primary,
                          fontWeight: 700,
                          fontSize: 12,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <Layers size={13} /> {stepCount} bước
                        </span>
                      </td>

                      {/* Ảnh chuẩn */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          backgroundColor: imgCount > 0 ? '#F0FDF4' : '#F8FAFC',
                          border: `1px solid ${imgCount > 0 ? '#BBF7D0' : '#E2E8F0'}`,
                          color: imgCount > 0 ? '#16A34A' : '#94A3B8',
                          fontWeight: 700,
                          fontSize: 12,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <ImageIcon size={13} /> {imgCount} ảnh
                        </span>
                      </td>

                      {/* Trạng thái (Click để chuyển nhanh) */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span
                          onClick={(e) => handleToggleActive(g, e)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 20,
                            backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2',
                            color: isActive ? '#15803D' : '#B91C1C',
                            fontWeight: 700,
                            fontSize: 11.5,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'transform 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                          title="Nhấp để chuyển trạng thái Áp dụng / Tạm ngưng"
                        >
                          {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {isActive ? 'Áp dụng' : 'Tạm ngưng'}
                        </span>
                      </td>

                      {/* Thao tác (...) */}
                      <td style={{ padding: '10px 14px', textAlign: 'center', position: 'relative', zIndex: actionMenuId === g.id ? 40 : 1 }} onClick={e => e.stopPropagation()}>
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
                                  setPreviewGuide(g);
                                }}
                              >
                                Xem nhanh SOS
                              </button>
                              <button
                                type="button"
                                className="action-menu-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionMenuId(null);
                                  navigate(`/admin/sos-guides/edit/${g.id}`);
                                }}
                              >
                                Chỉnh sửa SOS
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
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View */
        <div style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 12,
          overflowY: 'auto',
          padding: '2px 2px 16px 2px',
          alignContent: 'start'
        }}>
          {paginatedGuides.map(g => (
            <div
              key={g.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                border: `1.5px solid ${THEME.borderLight}`,
                padding: 16,
                boxShadow: '0 2px 6px rgba(123, 82, 51, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 12
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: THEME.bgLight,
                    color: THEME.primary,
                    fontWeight: 800,
                    fontSize: 12,
                    fontFamily: 'monospace'
                  }}>
                    {g.code}
                  </span>
                  <span
                    onClick={(e) => handleToggleActive(g, e)}
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: g.is_active !== false ? '#15803D' : '#B91C1C',
                      cursor: 'pointer'
                    }}
                  >
                    {g.is_active !== false ? '● Áp dụng' : '○ Tạm ngưng'}
                  </span>
                </div>

                <h3
                  onClick={() => setPreviewGuide(g)}
                  style={{
                    margin: '0 0 6px 0',
                    fontSize: '1rem',
                    color: '#0F172A',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {g.name}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: 12.5,
                  color: '#64748B',
                  lineHeight: '1.4',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {formatScopeText(g.description)}
                </p>
              </div>

              <div style={{
                borderTop: '1px solid #F1F5F9',
                paddingTop: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ fontSize: 12, color: THEME.primary, fontWeight: 700 }}>
                  {g.steps?.length || 0} bước • {(g.steps || []).reduce((sum, s) => sum + (s.images?.length || 0), 0)} ảnh
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setPreviewGuide(g)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: `1px solid ${THEME.borderLight}`,
                      backgroundColor: '#FFF',
                      color: THEME.primary,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Xem
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/sos-guides/edit/${g.id}`)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: 'none',
                      backgroundColor: THEME.primary,
                      color: '#FFF',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Soạn thảo
                  </button>
                </div>
              </div>
            </div>
          ))}
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

      {/* Quick Preview Modal */}
      {previewGuide && (
        <SOSQuickPreviewModal
          guide={previewGuide}
          onClose={() => setPreviewGuide(null)}
          onEdit={(g) => navigate(`/admin/sos-guides/edit/${g.id}`)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <BeautifulConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Xác nhận xóa Hướng dẫn thao tác (SOS)"
        message={`Bạn có chắc chắn muốn xóa tài liệu SOS "${deleteTarget?.name}" (${deleteTarget?.code})? Tất cả các bước thao tác và hình ảnh liên quan sẽ bị xóa vĩnh viễn.`}
        confirmText="Xóa tài liệu"
        cancelText="Hủy bỏ"
        isDanger={true}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default SOSGuideManagementView;
