import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Search, Filter, LayoutGrid, List, Eye, Edit3, Trash2,
  CheckCircle2, XCircle, Layers, Image as ImageIcon, Sparkles, RefreshCw, MoreVertical
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import SOSQuickPreviewModal from './components/SOSQuickPreviewModal';
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

const SOSGuideManagementView = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

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
      // Đảm bảo chỉ lấy SOS
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
  const filteredGuides = guides.filter(g => {
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

  // Calculate Metrics
  const totalGuides = guides.length;
  const activeGuides = guides.filter(g => g.is_active !== false).length;
  const totalSteps = guides.reduce((sum, g) => sum + (g.steps?.length || 0), 0);
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
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: THEME.primary,
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(123, 82, 51, 0.25)'
          }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Tài liệu ban hành</div>
            <h1 style={{ margin: '2px 0 0 0', fontSize: '1.5rem', color: '#1E293B', fontWeight: 800 }}>
              Hướng dẫn thao tác (SOS)
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={fetchGuides}
            disabled={loading}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: `1px solid ${THEME.borderLight}`,
              backgroundColor: '#FFF',
              color: THEME.primary,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Làm mới
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/sos-guides/create')}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              backgroundColor: THEME.primary,
              color: '#FFF',
              border: 'none',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(123, 82, 51, 0.25)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = THEME.hover}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = THEME.primary}
          >
            <Plus size={18} /> + Tạo SOS mới
          </button>
        </div>
      </div>

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
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600 }}>Tổng số SOS</div>
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
          <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: THEME.bgLight, color: THEME.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600 }}>Bước thao tác</div>
            <div style={{ fontSize: '1.6rem', color: THEME.primary, fontWeight: 800 }}>{totalSteps}</div>
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
            <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600 }}>Ảnh thao tác chuẩn</div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã, tên SOS, vị trí..."
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
              backgroundColor: '#FFF'
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang áp dụng</option>
            <option value="inactive">Tạm ngưng</option>
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
      </div>

      {/* Table View */}
      {viewMode === 'table' ? (
        <div className="admin-list-layout">
          <div className="mgmt-table card admin-table-card">
            <div className="admin-table-scroll">
              <table className="data-table">
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: THEME.bgLight }}>
              <tr style={{ backgroundColor: THEME.bgLight, borderBottom: `1.5px solid ${THEME.borderLight}`, color: THEME.primary, fontWeight: 800, fontSize: 12.5, textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px', width: 60, backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>STT</th>
                <th style={{ padding: '12px 16px', width: 160, backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Mã tài liệu</th>
                <th style={{ padding: '12px 16px', backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Tên Hướng dẫn thao tác (SOS)</th>
                <th style={{ padding: '12px 16px', width: 220, backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Vị trí & Phạm vi áp dụng</th>
                <th style={{ padding: '12px 16px', width: 120, textAlign: 'center', backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Quy trình</th>
                <th style={{ padding: '12px 16px', width: 110, textAlign: 'center', backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Ảnh chuẩn</th>
                <th style={{ padding: '12px 16px', width: 140, textAlign: 'center', backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Trạng thái</th>
                <th style={{ padding: '12px 16px', width: 130, textAlign: 'center', backgroundColor: THEME.bgLight, position: 'sticky', top: 0, zIndex: 10 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                    Đang tải danh sách Hướng dẫn thao tác (SOS)...
                  </td>
                </tr>
              ) : filteredGuides.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 48, textAlign: 'center' }}>
                    <div style={{ color: '#64748B', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                      Chưa có Hướng dẫn thao tác (SOS) nào
                    </div>
                    <div style={{ color: '#94A3B8', fontSize: 13, marginBottom: 16 }}>
                      Bắt đầu xây dựng bảng phân tích thao tác chuẩn bằng cách nhấn nút dưới đây.
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/admin/sos-guides/create')}
                      style={{
                        padding: '9px 18px',
                        borderRadius: 8,
                        backgroundColor: THEME.primary,
                        color: '#FFF',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: 13.5,
                        cursor: 'pointer'
                      }}
                    >
                      + Tạo SOS mới
                    </button>
                  </td>
                </tr>
              ) : (
                filteredGuides.map((g, idx) => {
                  const stepCount = g.steps?.length || 0;
                  const imgCount = (g.steps || []).reduce((sum, s) => sum + (s.images?.length || 0), 0);
                  const isActive = g.is_active !== false;

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
                      <td style={{ padding: '14px 16px', color: '#94A3B8', fontWeight: 600 }}>{idx + 1}</td>
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
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14 }}>
                          {g.name}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748B', fontSize: 13 }}>
                        {g.description || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          backgroundColor: THEME.bgLight,
                          color: THEME.primary,
                          fontWeight: 700,
                          fontSize: 12
                        }}>
                          {stepCount} bước
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          backgroundColor: '#F0FDF4',
                          color: '#16A34A',
                          fontWeight: 700,
                          fontSize: 12
                        }}>
                          {imgCount} ảnh
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
                      <td style={{ padding: '14px 16px', textAlign: 'center', position: 'relative', zIndex: actionMenuId === g.id ? 50 : 1 }} onClick={e => e.stopPropagation()}>
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
                                setPreviewGuide(g);
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
                                navigate(`/admin/sos-guides/edit/${g.id}`);
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
                })
              )}
            </tbody>
          </table>
            </div>
          </div>
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
          {filteredGuides.map(g => (
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

                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: '#0F172A', fontWeight: 800 }}>
                  {g.name}
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#64748B', lineHeight: '1.4' }}>
                  {g.description || 'Chưa có mô tả phạm vi áp dụng.'}
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
                  {g.steps?.length || 0} bước thao tác
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
                    onClick={() => navigate(`/admin/sos-guides/edit/${g.id}`)}
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
          ))}
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
