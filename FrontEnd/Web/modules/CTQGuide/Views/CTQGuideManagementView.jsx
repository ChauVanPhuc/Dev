import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  AlertTriangle, Plus, Search, Filter, LayoutGrid, List, Eye, Edit3, Trash2,
  CheckCircle2, XCircle, Layers, Image as ImageIcon, Sparkles, RefreshCw, Tag, MoreVertical,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import CTQQuickPreviewModal from './components/CTQQuickPreviewModal';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import '@styles/components.css';

const THEME = {
  primary: '#7B5233',
  hover: '#5D3B32',
  bgLight: '#FAF6F0',
  borderLight: '#EADCC9',
  pageBg: '#FAF8F6'
};

// Helper trích xuất công đoạn từ description nếu được lưu dạng [Công đoạn: ...]
const parseStageAndDesc = (description) => {
  if (!description) return { stage: 'Tất cả công đoạn', cleanDesc: '' };
  const match = description.match(/^\[Công đoạn:\s*([^\]]+)\]\s*(.*)$/i);
  if (match) {
    return {
      stage: match[1].trim(),
      cleanDesc: match[2].trim()
    };
  }
  return { stage: 'Chung', cleanDesc: description };
};

const CTQGuideManagementView = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/ctq-guides');

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title || 'Lỗi cần chú ý (CTQ)');
    if (setCustomSubtitle) setCustomSubtitle(subtitle || 'Tài liệu ban hành');
    if (setCustomScreenCode && screenCode) setCustomScreenCode(screenCode);
    return () => {
      if (setCustomTitle) setCustomTitle('');
      if (setCustomSubtitle) setCustomSubtitle('');
      if (setCustomScreenCode) setCustomScreenCode('');
    };
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const [guides, setGuides] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & State
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
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
    fetchStages();
  }, []);

  const fetchStages = async () => {
    try {
      const res = await api.get('/stages/').catch(() => api.get('/stages'));
      const rawStages = Array.isArray(res) ? res : (res?.items || []);
      const stageNames = rawStages.map(s => s.name || s.stage_name || s).filter(Boolean);
      setStages(Array.from(new Set(stageNames)));
    } catch (err) {
      console.warn('Lỗi tải danh sách công đoạn:', err);
    }
  };

  const fetchGuides = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/inspection-guides?doc_type=CTQ');
      const list = Array.isArray(res) ? res : res?.items || [];
      // Đảm bảo chỉ lấy CTQ
      const filtered = list.filter(g => (g.doc_type || '').toUpperCase() === 'CTQ');
      setGuides(filtered);
    } catch (err) {
      console.error('Lỗi tải danh sách CTQ:', err);
      setError('Không thể tải danh sách Lỗi cần chú ý.');
      if (toast) toast('error', 'Lỗi tải danh sách Lỗi cần chú ý (CTQ).');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/inspection-guides/${deleteTarget.id}`);
      if (toast) toast('success', `Đã xóa CTQ "${deleteTarget.code}" thành công.`);
      setGuides(prev => prev.filter(g => g.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Lỗi xóa CTQ:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi khi xóa tài liệu CTQ.');
    } finally {
      setDeleting(false);
    }
  };

  // Danh sách công đoạn xuất hiện trong danh sách CTQ để đưa vào bộ lọc
  const availableStages = useMemo(() => {
    const stageSet = new Set();
    guides.forEach(g => {
      const { stage } = parseStageAndDesc(g.description);
      if (stage && stage !== 'Chung') stageSet.add(stage);
    });
    stages.forEach(s => stageSet.add(s));
    return Array.from(stageSet);
  }, [guides, stages]);

  // Filtered List
  const filteredGuides = useMemo(() => {
    return guides.filter(g => {
      const { stage, cleanDesc } = parseStageAndDesc(g.description);

      const matchSearch =
        (g.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (g.code || '').toLowerCase().includes(search.toLowerCase()) ||
        (g.description || '').toLowerCase().includes(search.toLowerCase()) ||
        stage.toLowerCase().includes(search.toLowerCase());

      const matchStage =
        stageFilter === 'all' ? true : stage.toLowerCase() === stageFilter.toLowerCase();

      const matchStatus =
        statusFilter === 'all' ? true :
          statusFilter === 'active' ? g.is_active !== false :
            g.is_active === false;

      return matchSearch && matchStage && matchStatus;
    });
  }, [guides, search, stageFilter, statusFilter]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, stageFilter, statusFilter]);

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
  const totalItems = guides.reduce((sum, g) => sum + (g.steps?.length || 0), 0);
  const totalImages = guides.reduce((sum, g) => {
    const stepImgs = (g.steps || []).reduce((sSum, st) => sSum + (st.images?.length || 0), 0);
    return sum + stepImgs;
  }, 0);

  return (
    <div
      className="guide-management-container"
      style={{
        padding: '20px 28px',
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

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14,
        marginBottom: 14,
        flexShrink: 0
      }}>
        <div style={{
          padding: '18px 20px',
          borderRadius: 14,
          backgroundColor: '#FFFFFF',
          border: `1px solid ${THEME.borderLight}`,
          boxShadow: '0 4px 12px rgba(123, 82, 51, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: THEME.bgLight, color: THEME.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600 }}>Tổng số tài liệu CTQ</div>
            <div style={{ fontSize: '1.6rem', color: '#1E293B', fontWeight: 800 }}>{totalGuides}</div>
          </div>
        </div>

        <div style={{
          padding: '18px 20px',
          borderRadius: 14,
          backgroundColor: '#FFFFFF',
          border: `1px solid ${THEME.borderLight}`,
          boxShadow: '0 4px 12px rgba(123, 82, 51, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600 }}>Đang áp dụng</div>
            <div style={{ fontSize: '1.6rem', color: '#059669', fontWeight: 800 }}>{activeGuides}</div>
          </div>
        </div>

        <div style={{
          padding: '18px 20px',
          borderRadius: 14,
          backgroundColor: '#FFFFFF',
          border: `1px solid ${THEME.borderLight}`,
          boxShadow: '0 4px 12px rgba(123, 82, 51, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600 }}>Tạm ngưng</div>
            <div style={{ fontSize: '1.6rem', color: '#DC2626', fontWeight: 800 }}>{guides.filter(g => g.is_active === false).length}</div>
          </div>
        </div>

        <div style={{
          padding: '18px 20px',
          borderRadius: 14,
          backgroundColor: '#FFFFFF',
          border: `1px solid ${THEME.borderLight}`,
          boxShadow: '0 4px 12px rgba(123, 82, 51, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600 }}>Ảnh mẫu đối chứng</div>
            <div style={{ fontSize: '1.6rem', color: '#16A34A', fontWeight: 800 }}>{totalImages}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        border: `1px solid ${THEME.borderLight}`,
        padding: '12px 16px',
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280, flexWrap: 'wrap' }}>
          {/* Search box */}
          <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 360 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã G7.CL.CTQ, lỗi, công đoạn..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: 13.5,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Công đoạn Filter */}
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              fontSize: 13.5,
              fontWeight: 600,
              color: '#334155',
              backgroundColor: '#FFF'
            }}
          >
            <option value="all">Tất cả công đoạn</option>
            {availableStages.map((stg, i) => (
              <option key={i} value={stg}>{stg}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              fontSize: 13.5,
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

          {/* Page Size Filter */}
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              fontSize: 13.5,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', padding: 4, borderRadius: 8 }}>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: viewMode === 'table' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'table' ? THEME.primary : '#64748B',
              fontWeight: 700,
              fontSize: 12.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <List size={15} /> Bảng
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'grid' ? THEME.primary : '#64748B',
              fontWeight: 700,
              fontSize: 12.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <LayoutGrid size={15} /> Lưới
          </button>
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
              gap: 6
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Làm mới
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/ctq-guides/create')}
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
              boxShadow: '0 3px 8px rgba(123, 82, 51, 0.25)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = THEME.hover}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = THEME.primary}
          >
            <Plus size={16} /> Tạo CTQ mới
          </button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' ? (
        <div style={{
          flex: 1,
          minHeight: 0,
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          border: `1px solid ${THEME.borderLight}`,
          overflowY: 'auto',
          overflowX: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          position: 'relative'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: THEME.bgLight }}>
              <tr style={{ backgroundColor: THEME.bgLight, borderBottom: `1.5px solid ${THEME.borderLight}`, color: THEME.primary, fontWeight: 800, fontSize: 12.5, textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px', width: 50, backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>STT</th>
                <th style={{ padding: '12px 16px', width: 160, backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Mã CTQ</th>
                <th style={{ padding: '12px 16px', width: 180, backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Công đoạn</th>
                <th style={{ padding: '12px 16px', backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Lỗi cần chú ý (Danh mục lỗi)</th>
                <th style={{ padding: '12px 16px', width: 140, textAlign: 'center', backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Ảnh đối chứng</th>
                <th style={{ padding: '12px 16px', width: 130, textAlign: 'center', backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Trạng thái</th>
                <th style={{ padding: '12px 16px', width: 130, textAlign: 'center', backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                    Đang tải danh sách Lỗi cần chú ý (CTQ)...
                  </td>
                </tr>
              ) : filteredGuides.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 48, textAlign: 'center' }}>
                    <div style={{ color: '#64748B', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                      Chưa có tài liệu Lỗi cần chú ý (CTQ) nào
                    </div>
                    <div style={{ color: '#94A3B8', fontSize: 13, marginBottom: 16 }}>
                      Tạo tài liệu CTQ theo Mã (G7.CL.CTQ.xxx), Công đoạn và Lỗi từ danh mục lỗi ngay.
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/admin/ctq-guides/create')}
                      style={{
                        padding: '9px 18px',
                        borderRadius: 8,
                        backgroundColor: THEME.primary,
                        color: '#FFF',
                        border: 'none',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 13.5,
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={14} /> Tạo CTQ mới
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedGuides.map((g, idx) => {
                  const imgCount = (g.steps || []).reduce((sum, s) => sum + (s.images?.length || 0), 0);
                  const isActive = g.is_active !== false;
                  const { stage, cleanDesc } = parseStageAndDesc(g.description);

                  return (
                    <tr
                      key={g.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s',
                        position: 'relative',
                        zIndex: actionMenuId === g.id ? 40 : 1
                      }}
                      onMouseEnter={e => {
                        if (actionMenuId !== g.id) e.currentTarget.style.backgroundColor = THEME.bgLight;
                      }}
                      onMouseLeave={e => {
                        if (actionMenuId !== g.id) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '14px 16px', color: '#94A3B8', fontWeight: 600 }}>
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          backgroundColor: THEME.bgLight,
                          border: `1px solid ${THEME.borderLight}`,
                          color: THEME.primary,
                          fontWeight: 800,
                          fontSize: 12.5,
                          fontFamily: 'monospace'
                        }}>
                          {g.code}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 6,
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          color: '#334155',
                          fontWeight: 700,
                          fontSize: 12.5
                        }}>
                          ⚙️ {stage}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>
                          {g.name}
                        </div>
                        {cleanDesc && (
                          <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 3, lineHeight: '1.4' }}>
                            {cleanDesc}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          backgroundColor: '#F0FDF4',
                          color: '#16A34A',
                          fontWeight: 700,
                          fontSize: 12,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <ImageIcon size={13} /> {imgCount} ảnh mẫu
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 20,
                          backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2',
                          color: isActive ? '#15803D' : '#B91C1C',
                          fontWeight: 700,
                          fontSize: 12,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          {isActive ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                          {isActive ? 'Áp dụng' : 'Tạm ngưng'}
                        </span>
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
                                  setPreviewGuide(g);
                                }}
                              >
                                Xem nhanh CTQ
                              </button>
                              <button
                                type="button"
                                className="action-menu-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionMenuId(null);
                                  navigate(`/admin/ctq-guides/edit/${g.id}`);
                                }}
                              >
                                Chỉnh sửa CTQ
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
          overflowY: 'auto',
          padding: '4px 2px 20px 2px',
          alignContent: 'start'
        }}>
          {paginatedGuides.map(g => {
            const { stage, cleanDesc } = parseStageAndDesc(g.description);
            return (
              <div
                key={g.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  border: `1.5px solid ${THEME.borderLight}`,
                  padding: 18,
                  boxShadow: '0 4px 12px rgba(123, 82, 51, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      backgroundColor: THEME.bgLight,
                      color: THEME.primary,
                      fontWeight: 800,
                      fontSize: 12,
                      fontFamily: 'monospace'
                    }}>
                      {g.code}
                    </span>
                    <span style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: g.is_active !== false ? '#15803D' : '#B91C1C'
                    }}>
                      {g.is_active !== false ? '● Đang áp dụng' : '○ Tạm ngưng'}
                    </span>
                  </div>

                  <div style={{ marginBottom: 6 }}>
                    <span style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      backgroundColor: '#F8FAFC',
                      color: '#475569',
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1px solid #E2E8F0'
                    }}>
                      ⚙️ {stage}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: '#0F172A', fontWeight: 800 }}>
                    {g.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748B', lineHeight: '1.4' }}>
                    {cleanDesc || 'Chưa có mô tả chi tiết.'}
                  </p>
                </div>

                <div style={{
                  borderTop: '1px solid #F1F5F9',
                  paddingTop: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ fontSize: 12, color: THEME.primary, fontWeight: 700 }}>
                    {(g.steps || []).reduce((sum, s) => sum + (s.images?.length || 0), 0)} ảnh đối chứng
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setPreviewGuide(g)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: `1px solid ${THEME.borderLight}`,
                        backgroundColor: '#FFF',
                        color: THEME.primary,
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Xem
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/ctq-guides/edit/${g.id}`)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: 'none',
                        backgroundColor: THEME.primary,
                        color: '#FFF',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Soạn thảo
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

      {/* Quick Preview Modal */}
      {previewGuide && (
        <CTQQuickPreviewModal
          guide={previewGuide}
          onClose={() => setPreviewGuide(null)}
          onEdit={(g) => navigate(`/admin/ctq-guides/edit/${g.id}`)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <BeautifulConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Xác nhận xóa Lỗi cần chú ý (CTQ)"
        message={`Bạn có chắc chắn muốn xóa tài liệu CTQ "${deleteTarget?.name}" (${deleteTarget?.code})? Tất cả các điểm lỗi và hình ảnh đối chứng sẽ bị xóa vĩnh viễn.`}
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

export default CTQGuideManagementView;
