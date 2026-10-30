import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Search, Filter, CheckSquare, Square, 
  Check, Loader2, FileText, AlertCircle 
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';

let cachedAllDocs = null;

const ISOMasterRecordDocSelectorModal = ({
  isOpen = false,
  onClose,
  folder = {},
  currentAssignedIds = [],
  onSaved
}) => {
  const { toast } = useToast();
  const [allDocs, setAllDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  // Preload documents once on component mount
  useEffect(() => {
    fetchAllDocuments();
  }, []);

  const wasOpenRef = useRef(false);

  // Initialize selectedIds ONLY when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const initialIds = new Set(
        (currentAssignedIds || [])
          .map(id => Number(id))
          .filter(id => !isNaN(id) && id > 0)
      );
      setSelectedIds(initialIds);
      setSearch('');
      setDeptFilter('');
      setShowOnlySelected(false);
      if (!allDocs || allDocs.length === 0) {
        fetchAllDocuments();
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const fetchAllDocuments = async (force = false) => {
    if (!force && cachedAllDocs && cachedAllDocs.length > 0) {
      setAllDocs(cachedAllDocs);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/iso-master-records/all-available-documents');
      const docsList = Array.isArray(res)
        ? res
        : (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.items) ? res.items : []));
      if (docsList.length > 0) {
        cachedAllDocs = docsList;
        setAllDocs(docsList);
      } else if (cachedAllDocs && cachedAllDocs.length > 0) {
        setAllDocs(cachedAllDocs);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách tài liệu:', err);
      if (cachedAllDocs && cachedAllDocs.length > 0) {
        setAllDocs(cachedAllDocs);
      } else {
        toast.error('Không thể tải danh sách tài liệu toàn hệ thống');
      }
    } finally {
      setLoading(false);
    }
  };

  // Distinct departments for filter
  const departments = useMemo(() => {
    const set = new Set();
    allDocs.forEach(d => {
      if (d.department_name) set.add(d.department_name.trim());
    });
    return Array.from(set).sort();
  }, [allDocs]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return allDocs.filter(doc => {
      const docId = Number(doc.id);
      if (showOnlySelected && !selectedIds.has(docId)) {
        return false;
      }
      if (deptFilter && (!doc.department_name || !doc.department_name.toLowerCase().includes(deptFilter.toLowerCase()))) {
        return false;
      }
      if (search) {
        const term = search.toLowerCase().trim();
        const matchCode = (doc.new_code || '').toLowerCase().includes(term);
        const matchOldCode = (doc.code || '').toLowerCase().includes(term);
        const matchName = (doc.name || '').toLowerCase().includes(term);
        const matchEditor = (doc.editor || '').toLowerCase().includes(term);
        if (!matchCode && !matchOldCode && !matchName && !matchEditor) {
          return false;
        }
      }
      return true;
    });
  }, [allDocs, search, deptFilter, showOnlySelected, selectedIds]);

  // Toggle single item
  const handleToggle = (id) => {
    const numId = Number(id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(numId)) {
        next.delete(numId);
      } else {
        next.add(numId);
      }
      return next;
    });
  };

  // Select all visible
  const handleSelectAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredDocs.forEach(d => next.add(Number(d.id)));
      return next;
    });
  };

  // Deselect all visible
  const handleDeselectAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredDocs.forEach(d => next.delete(d.id));
      return next;
    });
  };

  // Save changes
  const handleSave = async () => {
    if (!folder?.id) return;
    setSaving(true);
    try {
      const loggedUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
      const actorName = loggedUser.full_name || loggedUser.username || 'Administrator';

      const payload = {
        process_ids: Array.from(selectedIds),
        actor_name: actorName
      };

      const res = await api.post(`/iso-master-records/${folder.id}/assign-children`, payload);
      toast.success(res.data?.message || 'Đã cập nhật danh sách tài liệu trong bộ thành công!');
      if (onSaved) {
        onSaved(Array.from(selectedIds));
      }
      onClose();
    } catch (err) {
      console.error('Lỗi lưu danh sách tài liệu con:', err);
      toast.error('Có lỗi xảy ra khi lưu danh sách tài liệu vào bộ');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isAllVisibleSelected = filteredDocs.length > 0 && filteredDocs.every(d => selectedIds.has(d.id));

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div 
        style={{
          width: '94vw',
          maxWidth: '1320px',
          maxHeight: '92vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FAF6F0'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem' }}>📁</span>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#7B5233' }}>
                Thêm tài liệu vào bộ: {folder?.document_name || 'Bộ tài liệu'}
              </h3>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748B' }}>
              Đánh dấu tick vào các tài liệu bạn muốn đưa vào bộ này. Bấm "Lưu thay đổi" để hoàn tất.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              background: 'none',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              color: '#64748B',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E2E8F0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid #F1F5F9',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          {/* Search box */}
          <div style={{
            position: 'relative',
            flex: '1 1 300px',
            minWidth: '240px'
          }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã mới, mã cũ, tên tài liệu, người soạn..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                fontSize: '0.86rem',
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
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  padding: '2px'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div style={{ minWidth: '180px' }}>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                fontSize: '0.86rem',
                backgroundColor: '#F8FAFC',
                color: '#334155',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Tất cả phòng ban --</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Quick filter checkboxes / buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={isAllVisibleSelected ? handleDeselectAllVisible : handleSelectAllVisible}
              style={{
                padding: '6px 12px',
                fontSize: '0.82rem',
                fontWeight: '600',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <CheckSquare size={14} color="#7B5233" />
              <span>{isAllVisibleSelected ? 'Bỏ chọn đang hiện' : 'Chọn tất cả đang hiện'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowOnlySelected(!showOnlySelected)}
              style={{
                padding: '6px 12px',
                fontSize: '0.82rem',
                fontWeight: '600',
                borderRadius: '6px',
                border: showOnlySelected ? '1px solid #7B5233' : '1px solid #CBD5E1',
                backgroundColor: showOnlySelected ? '#FAF6F0' : '#FFFFFF',
                color: showOnlySelected ? '#7B5233' : '#475569',
                cursor: 'pointer'
              }}
            >
              {showOnlySelected ? '✓ Đang lọc đã chọn' : 'Chỉ hiện đã chọn'}
            </button>

            {/* Counter badge */}
            <div style={{
              padding: '6px 12px',
              backgroundColor: '#EFF6FF',
              borderRadius: '6px',
              border: '1px solid #BFDBFE',
              fontSize: '0.84rem',
              color: '#1E40AF',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}>
              Đã chọn: <span style={{ color: '#1D4ED8', fontWeight: '700' }}>{selectedIds.size}</span> / {allDocs.length} tài liệu
            </div>
          </div>
        </div>

        {/* TABLE CONTENT */}
        <div style={{
          flex: '1 1 auto',
          overflowY: 'auto',
          minHeight: '260px',
          maxHeight: 'calc(92vh - 220px)',
          backgroundColor: '#FFFFFF'
        }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#64748B', gap: '12px' }}>
              <Loader2 size={32} className="iso-spinner" color="#7B5233" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Đang tải danh sách tài liệu hệ thống...</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
              <FileText size={48} color="#CBD5E1" style={{ marginBottom: '10px' }} />
              <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: '500' }}>Không tìm thấy tài liệu phù hợp bộ lọc</p>
            </div>
          ) : (
            <table className="iso-doc-selector-table" style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FAF6F0', borderBottom: '1.5px solid #EADCC9' }}>
                <tr>
                  <th style={{ padding: '6px 4px', width: '38px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      onChange={isAllVisibleSelected ? handleDeselectAllVisible : handleSelectAllVisible}
                      style={{ cursor: 'pointer', accentColor: '#7B5233', width: '15px', height: '15px' }}
                    />
                  </th>
                  <th style={{ padding: '6px 6px', textAlign: 'left', fontWeight: '700', color: '#7B5233', width: '105px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>MÃ MỚI</th>
                  <th style={{ padding: '6px 6px', textAlign: 'left', fontWeight: '700', color: '#7B5233', width: '80px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>MÃ CŨ</th>
                  <th style={{ padding: '6px 6px', textAlign: 'left', fontWeight: '700', color: '#7B5233', width: '135px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>PHÒNG BAN</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', fontWeight: '700', color: '#7B5233', fontSize: '0.72rem' }}>TÊN TÀI LIỆU</th>
                  <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: '700', color: '#7B5233', width: '85px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>CẤP DUYỆT</th>
                  <th style={{ padding: '6px 4px', textAlign: 'center', fontWeight: '700', color: '#7B5233', width: '90px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc, idx) => {
                  const isChecked = selectedIds.has(Number(doc.id));
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => handleToggle(doc.id)}
                      style={{
                        backgroundColor: isChecked ? '#FFFDF5' : (idx % 2 === 1 ? '#FAFAFA' : '#FFFFFF'),
                        borderBottom: '1px solid #F1F5F9',
                        cursor: 'pointer',
                        transition: 'background-color 0.1s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isChecked ? '#FEF3C7' : '#F1F5F9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isChecked ? '#FFFDF5' : (idx % 2 === 1 ? '#FAFAFA' : '#FFFFFF');
                      }}
                    >
                      {/* Checkbox */}
                      <td 
                        style={{ padding: '5px 8px', textAlign: 'center' }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          style={{
                            cursor: 'pointer',
                            accentColor: '#7B5233',
                            width: '15px',
                            height: '15px',
                            pointerEvents: 'none'
                          }}
                        />
                      </td>

                      {/* Mã mới */}
                      <td style={{ padding: '5px 8px', fontWeight: '700', color: '#7B5233', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                        {doc.new_code || '---'}
                      </td>

                      {/* Mã cũ */}
                      <td style={{ padding: '5px 8px', color: '#94A3B8', fontStyle: 'italic', whiteSpace: 'nowrap', fontSize: '0.76rem' }}>
                        {doc.code || '---'}
                      </td>

                      {/* Phòng ban */}
                      <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#FAF6F0',
                          border: '1px solid #EADCC9',
                          fontSize: '0.72rem',
                          fontWeight: '600',
                          color: '#7B5233'
                        }}>
                          {doc.department_name || 'ISO'}
                        </span>
                      </td>

                      {/* Tên tài liệu */}
                      <td style={{ padding: '5px 10px', color: '#1E293B', fontWeight: isChecked ? '600' : '500', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>{doc.name}</span>
                          {doc.documents_count > 0 && (
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '1px 5px',
                              borderRadius: '8px',
                              backgroundColor: '#E0E7FF',
                              color: '#3730A3',
                              fontWeight: '600',
                              whiteSpace: 'nowrap'
                            }}>
                              +{doc.documents_count} BM
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cấp duyệt */}
                      <td style={{ padding: '5px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: doc.document_level === 'Cấp công ty' ? '#EFF6FF' : '#F1F5F9',
                          color: doc.document_level === 'Cấp công ty' ? '#1E40AF' : '#475569',
                          fontWeight: '600'
                        }}>
                          {doc.document_level || 'Cấp phòng'}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td style={{ padding: '5px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: '0.70rem',
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          border: '1px solid #CBD5E1',
                          color: '#475569',
                          backgroundColor: '#FFFFFF',
                          fontWeight: '500'
                        }}>
                          {doc.status || 'Soạn thảo'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #E2E8F0',
          backgroundColor: '#FAF6F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: '0.86rem', color: '#64748B' }}>
            <span>Đã chọn <strong style={{ color: '#7B5233' }}>{selectedIds.size}</strong> tài liệu vào bộ này</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '0.88rem',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '8px 22px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#7B5233',
                color: '#FFFFFF',
                fontSize: '0.88rem',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                boxShadow: '0 2px 4px rgba(123, 82, 51, 0.25)'
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="iso-spinner" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Lưu thay đổi ({selectedIds.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ISOMasterRecordDocSelectorModal;

