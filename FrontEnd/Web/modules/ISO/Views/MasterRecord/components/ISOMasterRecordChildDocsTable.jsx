import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, Plus, Search, Filter, Folder, MoreHorizontal, 
  Trash2, Eye, Edit3, RefreshCw, FileText, ChevronRight,
  Layers, Building, X
} from 'lucide-react';
import ISOAttachedDocsTree from '../../../components/ISOAttachedDocsTree';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';

const formatVietnameseDate = (dateStr) => {
  if (!dateStr) return '---';
  try {
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
      return dateStr.split(' ')[0];
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
  } catch (e) {}
  return String(dateStr).split('T')[0].split(' ')[0] || '---';
};

const renderDocumentLevelBadge = (level) => {
  return (
    <span style={{ fontSize: '0.74rem', color: '#1e293b', fontWeight: 500, whiteSpace: 'nowrap' }}>
      {level || 'Cấp phòng'}
    </span>
  );
};

export const ISOMasterRecordChildDocsTable = ({
  folder = {},
  children = [],
  childDocs = [],
  loading = false,
  onBack,
  onOpenAddDocs,
  onOpenEditFolder,
  onRefresh,
  onPreviewDoc
}) => {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionMenuId, setActionMenuId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Close action menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (actionMenuId !== null && !e.target.closest('.iso-action-dropdown-btn') && !e.target.closest('.iso-action-dropdown-menu')) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [actionMenuId]);

  // Actual documents list resolving either children or childDocs
  const actualDocs = useMemo(() => {
    if (Array.isArray(children) && children.length > 0) return children;
    if (Array.isArray(childDocs) && childDocs.length > 0) return childDocs;
    return [];
  }, [children, childDocs]);

  // Departments for filter
  const departments = useMemo(() => {
    const set = new Set();
    actualDocs.forEach(c => {
      if (c.department_name) set.add(c.department_name.trim());
    });
    return Array.from(set).sort();
  }, [actualDocs]);

  // Filtered children
  const filteredChildren = useMemo(() => {
    return actualDocs.filter(doc => {
      if (deptFilter && (!doc.department_name || !doc.department_name.toLowerCase().includes(deptFilter.toLowerCase()))) {
        return false;
      }
      if (statusFilter && (!doc.status || !doc.status.toLowerCase().includes(statusFilter.toLowerCase()))) {
        return false;
      }
      if (search) {
        const s = search.toLowerCase();
        const mNewCode = (doc.new_code || '').toLowerCase().includes(s);
        const mOldCode = (doc.code || '').toLowerCase().includes(s);
        const mName = (doc.name || '').toLowerCase().includes(s);
        const mEditor = (doc.editor || '').toLowerCase().includes(s);
        const mApprover = (doc.approver || '').toLowerCase().includes(s);
        const mDept = (doc.department_name || '').toLowerCase().includes(s);
        if (!mNewCode && !mOldCode && !mName && !mEditor && !mApprover && !mDept) {
          return false;
        }
      }
      return true;
    });
  }, [actualDocs, search, deptFilter, statusFilter]);

  // Handle single remove child
  const handleRemoveChild = async (doc, e) => {
    e.stopPropagation();
    setActionMenuId(null);
    if (!window.confirm(`Bạn có chắc muốn loại tài liệu "${doc.name || doc.new_code}" khỏi bộ này?`)) {
      return;
    }

    setDeletingId(doc.id);
    try {
      await api.delete(`/iso-master-records/${folder.id}/children/${doc.id}`);
      toast.success(`Đã loại tài liệu ${doc.new_code || doc.name} khỏi bộ thành công!`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Lỗi khi loại tài liệu khỏi bộ:', err);
      toast.error('Có lỗi xảy ra khi loại tài liệu khỏi bộ');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div 
      className="gold-layout iso-master-container" 
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0%',
        minHeight: 0,
        height: '100%',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        boxSizing: 'border-box'
      }}
    >
      {/* HEADER BAR & BREADCRUMB */}
      <div style={{
        padding: '8px 14px',
        borderBottom: '1px solid #E2E8F0',
        backgroundColor: '#FFFDF9',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
      }}>
        {/* Left: Back button & Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <button
            type="button"
            onClick={onBack}
            title="Quay lại danh sách bộ tài liệu"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '0.80rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FAF6F0';
              e.currentTarget.style.borderColor = '#7B5233';
              e.currentTarget.style.color = '#7B5233';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.color = '#475569';
            }}
          >
            <ArrowLeft size={14} />
            <span>Quay lại</span>
          </button>

          {/* Breadcrumb path */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem' }}>
            <span 
              onClick={onBack}
              style={{ color: '#64748B', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Quản lý bộ tài liệu
            </span>
            <ChevronRight size={13} color="#94A3B8" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700', color: '#7B5233' }}>
              <span style={{ fontSize: '1rem' }}>📁</span>
              <span style={{ fontSize: '0.90rem' }}>{folder?.document_name || 'Bộ tài liệu'}</span>
            </div>
          </div>

          {/* Folder metadata pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '4px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 7px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              fontSize: '0.74rem',
              color: '#1E40AF',
              fontWeight: '600'
            }}>
              <Layers size={11} />
              {actualDocs.length} tài liệu
            </span>

            {folder?.department_in_charge && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 7px',
                borderRadius: '10px',
                backgroundColor: '#FAF6F0',
                border: '1px solid #EADCC9',
                fontSize: '0.74rem',
                color: '#7B5233',
                fontWeight: '600'
              }}>
                <Building size={11} />
                {folder.department_in_charge}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onOpenEditFolder && (
            <button
              type="button"
              onClick={() => onOpenEditFolder(folder)}
              title="Chỉnh sửa thông tin bộ tài liệu"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '0.78rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Edit3 size={13} />
              <span>Sửa thông tin bộ</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            title="Làm mới danh sách"
            style={{
              padding: '5px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <RefreshCw size={13} />
          </button>

          <button
            type="button"
            onClick={onOpenAddDocs}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#7B5233',
              color: '#FFFFFF',
              fontSize: '0.80rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(123, 82, 51, 0.2)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#654321'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7B5233'}
          >
            <Plus size={14} />
            <span>Thêm mới</span>
          </button>
        </div>
      </div>

      {/* SEARCH & INLINE FILTERS TOOLBAR */}
      <div style={{
        padding: '7px 14px',
        borderBottom: '1px solid #F1F5F9',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '8px'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã tài liệu, tên, người biên soạn..."
            style={{
              width: '100%',
              padding: '5px 10px 5px 30px',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              fontSize: '0.78rem',
              outline: 'none',
              backgroundColor: '#F8FAFC',
              boxSizing: 'border-box'
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8',
                padding: '2px'
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter by Department */}
        {departments.length > 0 && (
          <div style={{ minWidth: '140px' }}>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                fontSize: '0.78rem',
                backgroundColor: '#F8FAFC',
                color: '#334155',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Lọc phòng ban --</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}

        {/* Filter by Status */}
        <div style={{ minWidth: '130px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '5px 8px',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              fontSize: '0.78rem',
              backgroundColor: '#F8FAFC',
              color: '#334155',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">-- Lọc trạng thái --</option>
            <option value="Soạn thảo">Soạn thảo</option>
            <option value="Hiệu lực">Hiệu lực</option>
            <option value="Dự thảo">Dự thảo</option>
          </select>
        </div>

        {(search || deptFilter || statusFilter) && (
          <button
            type="button"
            onClick={() => { setSearch(''); setDeptFilter(''); setStatusFilter(''); }}
            style={{
              background: 'none',
              border: 'none',
              color: '#7B5233',
              fontSize: '0.76rem',
              fontWeight: '600',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Xóa bộ lọc
          </button>
        )}

        <div style={{ marginLeft: 'auto', fontSize: '0.76rem', color: '#64748B' }}>
          Hiển thị <strong>{filteredChildren.length}</strong> / {actualDocs.length} tài liệu
        </div>
      </div>

      {/* TABLE CONTENT AREA */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0%',
        minHeight: 0,
        minWidth: 0,
        height: '100%',
        overflow: 'hidden'
      }}>
        <div 
          className="admin-table-scroll" 
          style={{ 
            overflowX: 'auto', 
            overflowY: 'auto', 
            flex: '1 1 0%', 
            minHeight: 0, 
            minWidth: 0,
            height: '100%',
            width: '100%'
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#64748B', gap: '8px' }}>
              <RefreshCw size={24} className="iso-spinner" style={{ animation: 'spin 1s linear infinite' }} color="#7B5233" />
              <span style={{ fontSize: '0.82rem' }}>Đang tải danh sách tài liệu trong bộ...</span>
            </div>
          ) : filteredChildren.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '50px 20px',
              textAlign: 'center',
              color: '#64748B'
            }}>
              <Folder size={54} color="#CBD5E1" strokeWidth={1.2} style={{ marginBottom: '10px' }} />
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.98rem', color: '#334155', fontWeight: '700' }}>
                Bộ tài liệu này chưa có tài liệu nào
              </h4>
              <p style={{ margin: '0 0 14px 0', fontSize: '0.82rem', color: '#64748B', maxWidth: '380px' }}>
                Bấm nút "Thêm mới" để mở danh sách toàn bộ tài liệu trong hệ thống và đánh dấu tick những tài liệu cần đưa vào bộ này.
              </p>
              <button
                type="button"
                onClick={onOpenAddDocs}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#7B5233',
                  color: '#FFFFFF',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(123, 82, 51, 0.2)'
                }}
              >
                <Plus size={14} />
                <span>Thêm mới</span>
              </button>
            </div>
          ) : (
            <table className="data-table" style={{ width: '100%', tableLayout: 'auto', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0' }}>
                <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9' }}>
                  <th style={{ padding: '6px 3px', fontSize: '0.70rem', fontWeight: 'bold', color: '#7B5233', width: '32px', textAlign: 'center', whiteSpace: 'nowrap' }}>STT</th>
                  <th style={{ padding: '6px 4px', fontSize: '0.70rem', fontWeight: 'bold', color: '#7B5233', width: '85px', whiteSpace: 'nowrap' }}>MÃ MỚI</th>
                  <th style={{ padding: '6px 4px', fontSize: '0.70rem', fontWeight: 'bold', color: '#7B5233', width: '75px', whiteSpace: 'nowrap' }}>MÃ CŨ</th>
                  <th style={{ padding: '6px 4px', fontSize: '0.70rem', fontWeight: 'bold', color: '#7B5233', width: '105px', maxWidth: '120px', whiteSpace: 'nowrap' }}>PHÒNG BAN</th>
                  <th style={{ padding: '6px 6px', fontSize: '0.70rem', fontWeight: 'bold', color: '#7B5233', minWidth: '180px' }}>TÊN TÀI LIỆU</th>
                  <th style={{ padding: '6px 3px', fontSize: '0.70rem', fontWeight: 'bold', color: '#7B5233', width: '70px', textAlign: 'center', whiteSpace: 'nowrap' }}>CẤP DUYỆT</th>
                  <th style={{ padding: '6px 4px', fontSize: '0.70rem', fontWeight: 'bold', color: '#7B5233', width: '90px', textAlign: 'center', whiteSpace: 'nowrap' }}>NGƯỜI BIÊN SOẠN</th>
                  <th style={{ padding: '6px 4px', fontSize: '0.70rem', fontWeight: 'bold', color: '#7B5233', width: '90px', textAlign: 'center', whiteSpace: 'nowrap' }}>NGƯỜI XEM XÉT</th>
                  <th style={{ padding: '6px 4px', fontSize: '0.70rem', fontWeight: 'bold', color: '#7B5233', width: '95px', textAlign: 'center', whiteSpace: 'nowrap' }}>NGƯỜI PHÊ DUYỆT</th>
                  <th style={{ padding: '6px 3px', fontSize: '0.70rem', fontWeight: 'bold', color: '#7B5233', width: '85px', textAlign: 'center', whiteSpace: 'nowrap' }}>THỜI GIAN CẬP NHẬT</th>
                  <th style={{ padding: '6px 3px', fontSize: '0.70rem', fontWeight: 'bold', color: '#7B5233', width: '85px', textAlign: 'center', whiteSpace: 'nowrap' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '6px 3px', fontSize: '0.70rem', fontWeight: 'bold', color: '#7B5233', width: '50px', textAlign: 'center', whiteSpace: 'nowrap' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredChildren.map((doc, index) => {
                  const isActionOpen = actionMenuId === doc.id;
                  const isDeleting = deletingId === doc.id;

                  return (
                    <tr
                      key={doc.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                        backgroundColor: index % 2 === 1 ? '#fdfcfb' : 'white',
                        position: 'relative',
                        zIndex: isActionOpen ? 90 : 1,
                        cursor: 'pointer',
                        opacity: isDeleting ? 0.4 : 1
                      }}
                      onClick={() => onPreviewDoc && onPreviewDoc(doc, index)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 1 ? '#fdfcfb' : 'white'}
                    >
                      {/* 1. STT */}
                      <td style={{ padding: '5px 3px', fontSize: '0.74rem', color: '#64748b', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {index + 1}
                      </td>

                      {/* 2. MÃ MỚI */}
                      <td style={{ padding: '5px 4px', fontSize: '0.74rem', fontWeight: 600, color: '#7B5233', whiteSpace: 'nowrap' }}>
                        {doc.new_code || ''}
                      </td>

                      {/* 3. MÃ CŨ */}
                      <td style={{ padding: '5px 4px', fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                        {doc.code || ''}
                      </td>

                      {/* 4. PHÒNG BAN */}
                      <td style={{ padding: '5px 4px', fontSize: '0.74rem', color: '#1e293b', fontWeight: 500, maxWidth: '120px', whiteSpace: 'nowrap' }}>
                        <span 
                          title={doc.department_name || '---'}
                          style={{ 
                            display: 'inline-block',
                            maxWidth: '110px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            verticalAlign: 'middle',
                            backgroundColor: '#FAF6F0', 
                            padding: '1px 5px', 
                            borderRadius: '4px', 
                            border: '1px solid #EADCC9', 
                            fontSize: '0.72rem', 
                            fontWeight: 600, 
                            color: '#7B5233' 
                          }}
                        >
                          {doc.department_name || '---'}
                        </span>
                      </td>

                      {/* 5. TÊN TÀI LIỆU */}
                      <td style={{ padding: '5px 6px', fontSize: '0.75rem', color: '#1e293b', fontWeight: 500, wordBreak: 'break-word', minWidth: '190px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b', lineHeight: '1.3' }}>
                          {doc.name}
                        </div>
                        <ISOAttachedDocsTree
                          docs={(doc.documents && doc.documents.length > 0)
                            ? doc.documents
                            : (doc.related_templates && doc.related_templates.length > 0 ? doc.related_templates : [])}
                        />
                      </td>

                      {/* 6. CẤP DUYỆT */}
                      <td style={{ padding: '5px 3px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {renderDocumentLevelBadge(doc.document_level)}
                      </td>

                      {/* 7. NGƯỜI BIÊN SOẠN */}
                      <td style={{ padding: '5px 4px', fontSize: '0.76rem', color: '#1e293b', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {doc.editor || '---'}
                      </td>

                      {/* 8. NGƯỜI XEM XÉT */}
                      <td style={{ padding: '5px 4px', fontSize: '0.76rem', color: '#1e293b', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {doc.approver || '---'}
                      </td>

                      {/* 9. NGƯỜI PHÊ DUYỆT */}
                      <td style={{ padding: '5px 4px', fontSize: '0.76rem', color: '#1e293b', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {doc.approver_bgd || '---'}
                      </td>

                      {/* 10. THỜI GIAN CẬP NHẬT */}
                      <td style={{ padding: '5px 3px', fontSize: '0.74rem', color: '#1e293b', fontWeight: 500, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {formatVietnameseDate(doc.updated_at || doc.issue_date || doc.created_at)}
                      </td>

                      {/* 11. TRẠNG THÁI */}
                      <td style={{ padding: '5px 3px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          border: '1px solid #CBD5E1',
                          color: '#475569',
                          backgroundColor: '#FFFFFF',
                          fontWeight: '500',
                          whiteSpace: 'nowrap'
                        }}>
                          {doc.status || 'Soạn thảo'}
                        </span>
                      </td>

                      {/* 12. THAO TÁC */}
                      <td 
                        style={{ padding: '5px 3px', textAlign: 'center', position: 'relative' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="iso-action-dropdown-btn"
                          onClick={() => setActionMenuId(isActionOpen ? null : doc.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '3px',
                            cursor: 'pointer',
                            color: '#64748B',
                            borderRadius: '4px'
                          }}
                        >
                          <MoreHorizontal size={15} />
                        </button>

                        {/* Dropdown Menu */}
                        {isActionOpen && (
                          <div 
                            className="iso-action-dropdown-menu"
                            style={{
                              position: 'absolute',
                              right: '4px',
                              top: '24px',
                              backgroundColor: '#FFFFFF',
                              borderRadius: '6px',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                              border: '1px solid #E2E8F0',
                              minWidth: '160px',
                              zIndex: 100,
                              overflow: 'hidden'
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuId(null);
                                if (onPreviewDoc) onPreviewDoc(doc, index);
                              }}
                              style={{
                                width: '100%',
                                padding: '7px 10px',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                fontSize: '0.78rem',
                                color: '#334155',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <Eye size={13} color="#7B5233" />
                              <span>Xem trước tài liệu</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleRemoveChild(doc, e)}
                              style={{
                                width: '100%',
                                padding: '7px 10px',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                fontSize: '0.78rem',
                                color: '#DC2626',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                borderTop: '1px solid #F1F5F9'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <Trash2 size={13} color="#DC2626" />
                              <span>Loại khỏi bộ này</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ISOMasterRecordChildDocsTable;
