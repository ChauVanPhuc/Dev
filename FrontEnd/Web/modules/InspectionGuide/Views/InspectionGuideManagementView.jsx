import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Plus, Search, Filter, LayoutGrid, List, Eye, Edit3, Trash2,
  CheckCircle2, XCircle, Layers, CheckSquare, Image as ImageIcon,
  Tag, RefreshCw, Sparkles, ShieldCheck
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import GuideQuickPreviewModal from './components/GuideQuickPreviewModal';
import { INSPECTION_TYPE_OPTIONS } from './components/GuideAssignmentTab';
import '@styles/components.css';

const InspectionGuideManagementView = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Modals state
  const [previewGuide, setPreviewGuide] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/inspection-guides?limit=200');
      const items = res?.items || (Array.isArray(res) ? res : []);
      setGuides(items);
    } catch (err) {
      console.error('Lỗi tải danh sách hướng dẫn:', err);
      setError(err.message || 'Lỗi tải dữ liệu hướng dẫn kiểm tra');
      if (toast) toast('error', 'Không thể tải danh mục hướng dẫn kiểm tra.');
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
        description: g.description,
        is_active: updatedStatus
      });
      setGuides(prev => prev.map(item => item.id === g.id ? { ...item, is_active: updatedStatus } : item));
      if (toast) toast('success', `Đã ${updatedStatus ? 'kích hoạt' : 'tạm ngưng'} hướng dẫn "${g.code}"`);
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
      if (toast) toast('success', `Đã xóa hướng dẫn "${deleteTarget.name}" thành công`);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Lỗi xóa hướng dẫn:', err);
      if (toast) toast('error', err?.response?.data?.detail || err.message || 'Lỗi khi xóa hướng dẫn');
    } finally {
      setDeleting(false);
    }
  };

  // Open Preview Modal (fetch full details with steps if needed)
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

  // Statistics calculation
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
    <div style={{ padding: '24px 32px', fontFamily: 'Inter, sans-serif', backgroundColor: '#FAF8F6', minHeight: '100vh' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: '#7B5233',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(123, 82, 51, 0.2)'
            }}>
              <BookOpen size={20} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.65rem', color: '#2D1A12', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Hướng dẫn kiểm tra SOP
            </h1>
          </div>
          <p style={{ margin: 0, color: '#64748B', fontSize: 14 }}>
            Quản lý quy chuẩn, danh mục các bước thực hiện và ảnh minh họa tiêu chuẩn kiểm định chất lượng QA/QC.
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
            onClick={() => navigate('/admin/inspection-guides/create')}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: '#7B5233',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(123, 82, 51, 0.25)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#5D3E26'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#7B5233'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Plus size={18} /> Tạo hướng dẫn mới
          </button>
        </div>
      </div>

      {/* Top KPI Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        {/* Metric 1 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          padding: '18px 20px',
          border: '1px solid #EADCC9',
          boxShadow: '0 2px 8px rgba(123, 82, 51, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: '#F5EFE9',
            color: '#7B5233',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Tổng số tài liệu SOP
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2D1A12', marginTop: 2 }}>
              {stats.total}
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          padding: '18px 20px',
          border: '1px solid #EADCC9',
          boxShadow: '0 2px 8px rgba(123, 82, 51, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: '#ECFDF5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Đang hoạt động
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: 2 }}>
              {stats.active}
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          padding: '18px 20px',
          border: '1px solid #EADCC9',
          boxShadow: '0 2px 8px rgba(123, 82, 51, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <XCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Tạm ngưng
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#DC2626', marginTop: 2 }}>
              {stats.inactive}
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          padding: '18px 20px',
          border: '1px solid #EADCC9',
          boxShadow: '0 2px 8px rgba(123, 82, 51, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Loại phiếu đã gán
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563EB', marginTop: 2 }}>
              {stats.typesCount}
            </div>
          </div>
        </div>
      </div>

      {/* Smart Control & Filter Bar */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: '16px 20px',
        border: '1px solid #EADCC9',
        boxShadow: '0 2px 8px rgba(123, 82, 51, 0.04)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20
      }}>
        {/* Left: Search input */}
        <div style={{ position: 'relative', minWidth: 280, flex: 1, maxWidth: 420 }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo mã, tên quy trình hoặc mô tả..."
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
            onFocus={e => { e.currentTarget.style.borderColor = '#7B5233'; e.currentTarget.style.backgroundColor = '#FFF'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.backgroundColor = '#FAF8F6'; }}
          />
        </div>

        {/* Right: Filters & View Mode */}
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

      {/* Main Content Area */}
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
          <p style={{ margin: 0, fontWeight: 700 }}>Đang tải danh sách tài liệu SOP...</p>
        </div>
      ) : filteredGuides.length === 0 ? (
        <div style={{
          backgroundColor: '#FFF',
          borderRadius: 16,
          padding: 60,
          textAlign: 'center',
          border: '1px dashed #D1D5DB'
        }}>
          <BookOpen size={48} style={{ color: '#D1D5DB', margin: '0 auto 16px auto' }} />
          <h3 style={{ margin: '0 0 8px 0', color: '#2D1A12', fontWeight: 800 }}>Không tìm thấy hướng dẫn kiểm tra phù hợp</h3>
          <p style={{ margin: '0 0 20px 0', color: '#64748B', fontSize: 14 }}>
            {search || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Thử thay đổi bộ lọc tìm kiếm hoặc từ khóa.'
              : 'Chưa có tài liệu SOP nào được tạo.'}
          </p>
          <button
            onClick={() => navigate('/admin/inspection-guides/create')}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              backgroundColor: '#7B5233',
              color: '#FFF',
              border: 'none',
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer'
            }}
          >
            + Tạo hướng dẫn đầu tiên
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #EADCC9',
          boxShadow: '0 4px 14px rgba(123, 82, 51, 0.05)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                backgroundColor: '#FAF8F6',
                borderBottom: '1.5px solid #EADCC9',
                color: '#7B5233',
                fontSize: 12.5,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <th style={{ padding: '14px 18px', textAlign: 'left', width: 140 }}>Mã SOP</th>
                <th style={{ padding: '14px 18px', textAlign: 'left' }}>Tên hướng dẫn & Mô tả</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', width: 220 }}>Quy mô các bước</th>
                <th style={{ padding: '14px 18px', textAlign: 'left', width: 200 }}>Loại phiếu áp dụng</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', width: 140 }}>Trạng thái</th>
                <th style={{ padding: '14px 18px', textAlign: 'center', width: 140 }}>Thao tác</th>
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
                      backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FCFBFA'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F5EFE9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#FCFBFA'}
                  >
                    {/* Mã SOP */}
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        backgroundColor: '#EADCC9',
                        color: '#7B5233',
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
                          maxWidth: 400,
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

                    {/* Trạng thái (Switch) */}
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
                          backgroundColor: g.is_active ? '#10B981' : '#EF4444'
                        }} />
                        {g.is_active ? 'Hoạt động' : 'Tắt'}
                      </button>
                    </td>

                    {/* Thao tác */}
                    <td style={{ padding: '14px 18px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {/* Quick Preview Button */}
                        <button
                          onClick={e => handleOpenPreview(g, e)}
                          title="Xem trước SOP"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#FFF',
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#7B5233'; e.currentTarget.style.color = '#FFF'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFF'; e.currentTarget.style.color = '#475569'; }}
                        >
                          <Eye size={15} />
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => navigate(`/admin/inspection-guides/edit/${g.id}`)}
                          title="Biên soạn SOP"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#FFF',
                            color: '#7B5233',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#7B5233'; e.currentTarget.style.color = '#FFF'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFF'; e.currentTarget.style.color = '#7B5233'; }}
                        >
                          <Edit3 size={15} />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => setDeleteTarget(g)}
                          title="Xóa hướng dẫn"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            border: '1px solid #FEE2E2',
                            backgroundColor: '#FFF',
                            color: '#DC2626',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#DC2626'; e.currentTarget.style.color = '#FFF'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFF'; e.currentTarget.style.color = '#DC2626'; }}
                        >
                          <Trash2 size={15} />
                        </button>
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
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20
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
                  e.currentTarget.style.borderColor = '#7B5233';
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
                      backgroundColor: '#EADCC9',
                      color: '#7B5233',
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
                      borderRadius: 6,
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFF',
                      color: '#475569',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Eye size={14} /> Xem nhanh
                  </button>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => navigate(`/admin/inspection-guides/edit/${g.id}`)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: 'none',
                        backgroundColor: '#7B5233',
                        color: '#FFF',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Edit3 size={14} /> Biên soạn
                    </button>
                    <button
                      onClick={() => setDeleteTarget(g)}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 6,
                        border: '1px solid #FEE2E2',
                        backgroundColor: '#FFF',
                        color: '#DC2626',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
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

      {/* Quick Preview Modal */}
      <GuideQuickPreviewModal
        isOpen={Boolean(previewGuide)}
        onClose={() => setPreviewGuide(null)}
        guide={previewGuide}
        onEdit={(id) => navigate(`/admin/inspection-guides/edit/${id}`)}
      />

      {/* Delete Confirm Modal */}
      <BeautifulConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Xóa tài liệu SOP kiểm tra?"
        message={`Bạn có chắc chắn muốn xóa tài liệu "${deleteTarget?.name}" (${deleteTarget?.code})?\nThao tác này sẽ xóa vĩnh viễn toàn bộ các bước, checklist con và hình ảnh đính kèm.`}
        type="danger"
        confirmText={deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
        cancelText="Hủy bỏ"
      />
    </div>
  );
};

export default InspectionGuideManagementView;
