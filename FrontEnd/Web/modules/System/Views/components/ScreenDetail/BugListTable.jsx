import React from 'react';
import { ChevronDown, MoreVertical } from 'lucide-react';

const parseDescription = (desc) => {
  if (!desc) return { tag: '', text: '' };
  const match = desc.match(/^\[([^\]]+)\]\s*(.*)$/s);
  if (match) {
    return { tag: match[1], text: match[2] };
  }
  return { tag: '', text: desc };
};

const getBugStatusLabel = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'new' || s === 'mới') return 'Mới';
  if (s === 'resolved' || s === 'đã sửa') return 'Đã sửa';
  if (s === 'verified' || s === 'hoàn thành') return 'Hoàn thành';
  if (s === 'reopened' || s === 'sửa lại' || s === 'in progress' || s === 'in_progress') return 'Sửa lại';
  return status;
};

const getPositionByName = (name) => {
  if (!name) return 'QC';
  const n = name.toLowerCase();
  if (n.includes('admin') || n.includes('it') || n.includes('hệ thống') || n.includes('administrator')) return 'Admin';
  if (n.includes('phuc') || n.includes('dev') || n.includes('coder') || n.includes('developer') || n.includes('phucv1')) return 'Lập trình viên';
  if (n.includes('qc') || n.includes('tester') || n.includes('kiem thu') || n.includes('nguyễn văn') || n.includes('phuong')) return 'QC';
  return 'QC';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

const BugListTable = ({
  screen,
  isBugListCollapsed,
  setIsBugListCollapsed,
  expandedBugId,
  setExpandedBugId,
  activeBugMenu,
  setActiveBugMenu,
  getImageUrl,
  handleOpenEditBugModal,
  handleDeleteBug
}) => {
  if (!screen) return null;
  return (
    <div className="bugs-inline-section card" style={{
      marginTop: '20px',
      border: '1px solid #D1D5DB',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      backgroundColor: '#fff'
    }}>
      <div
        className="bugs-section-header"
        onClick={() => setIsBugListCollapsed(!isBugListCollapsed)}
        style={{
          padding: '16px 20px',
          backgroundColor: '#fff',
          borderBottom: isBugListCollapsed ? 'none' : '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12' }}>Danh sách lỗi</span>
        </div>
        <ChevronDown
          size={20}
          style={{
            color: '#2D1A12',
            transform: isBugListCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.2s',
            strokeWidth: 2.5,
            cursor: 'pointer'
          }}
        />
      </div>

      {!isBugListCollapsed && (
        <div style={{ padding: '0 16px 16px 16px' }}>
          {(!screen.bugs || screen.bugs.length === 0) ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontStyle: 'italic', fontSize: '0.8rem' }}>
              Không có báo cáo lỗi nào cho màn hình này.
            </div>
          ) : (
            <div className="table-responsive" style={{ marginTop: '14px' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#7B5233', color: '#fff' }}>
                    <th style={{ color: '#fff', padding: '10px', fontSize: '0.76rem', fontWeight: 'bold', border: '1px solid #D1D5DB' }}>Mã</th>
                    <th style={{ color: '#fff', padding: '10px', fontSize: '0.76rem', fontWeight: 'bold', border: '1px solid #D1D5DB' }}>Component</th>
                    <th style={{ color: '#fff', padding: '10px', fontSize: '0.76rem', fontWeight: 'bold', border: '1px solid #D1D5DB' }}>Mô tả</th>
                    <th style={{ color: '#fff', padding: '10px', fontSize: '0.76rem', fontWeight: 'bold', border: '1px solid #D1D5DB' }}>Mức độ</th>
                    <th style={{ color: '#fff', padding: '10px', fontSize: '0.76rem', fontWeight: 'bold', border: '1px solid #D1D5DB' }}>Trạng thái</th>
                    <th style={{ color: '#fff', padding: '10px', fontSize: '0.76rem', fontWeight: 'bold', border: '1px solid #D1D5DB' }}>Ngày cập nhật</th>
                    <th style={{ color: '#fff', padding: '10px', fontSize: '0.76rem', fontWeight: 'bold', border: '1px solid #D1D5DB' }}>Người cập nhật</th>
                    <th style={{ color: '#fff', padding: '10px', fontSize: '0.76rem', fontWeight: 'bold', border: '1px solid #D1D5DB' }}>Ngày ghi nhận</th>
                    <th style={{ color: '#fff', padding: '10px', fontSize: '0.76rem', fontWeight: 'bold', border: '1px solid #D1D5DB' }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {screen.bugs.map((bug) => {
                    const isBugExpanded = expandedBugId === bug.id;
                    const parsed = parseDescription(bug.description);
                    const severityColors = {
                      'Critical': '#EF4444',
                      'High': '#F97316',
                      'Medium': '#D97706',
                      'Low': '#10B981'
                    };
                    return (
                      <React.Fragment key={bug.id}>
                        <tr
                          onClick={() => setExpandedBugId(isBugExpanded ? null : bug.id)}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: isBugExpanded ? '#FAF6F0' : undefined,
                            position: 'relative',
                            zIndex: activeBugMenu === bug.id ? 50 : 1
                          }}
                          className="clickable-row"
                        >
                          <td style={{ padding: '10px', border: '1px solid #D1D5DB', fontSize: '0.78rem' }} className="font-mono font-bold">BUG-{bug.id}</td>
                          <td style={{ padding: '10px', border: '1px solid #D1D5DB', fontSize: '0.78rem' }} className="font-semibold">{parsed.tag || 'Chung'}</td>
                          <td style={{ padding: '10px', border: '1px solid #D1D5DB', fontSize: '0.78rem' }}>{parsed.text}</td>
                          <td style={{ padding: '10px', border: '1px solid #D1D5DB', fontSize: '0.78rem' }}>
                            <span style={{ color: severityColors[bug.severity] || '#7B5233', fontWeight: 'bold' }}>
                              {bug.severity === 'Critical' ? 'Khẩn cấp' : (bug.severity === 'High' ? 'Cao' : (bug.severity === 'Medium' ? 'Trung bình' : 'Thấp'))}
                            </span>
                          </td>
                          <td style={{ padding: '10px', border: '1px solid #D1D5DB', fontSize: '0.78rem' }}>
                            <span className={`status-badge ${getBugStatusLabel(bug.status) === 'Hoàn thành'
                              ? 'status-resolved'
                              : (getBugStatusLabel(bug.status) === 'Đã sửa'
                                ? 'status-processing'
                                : 'status-new')
                              }`}>
                              {getBugStatusLabel(bug.status)}
                            </span>
                          </td>
                          <td style={{ padding: '10px', border: '1px solid #D1D5DB', fontSize: '0.78rem' }}>{formatDate(bug.completed_at || bug.created_at)}</td>
                          <td style={{ padding: '10px', border: '1px solid #D1D5DB', fontSize: '0.78rem' }}>{bug.assignee || '-'}</td>
                          <td style={{ padding: '10px', border: '1px solid #D1D5DB', fontSize: '0.78rem' }}>{formatDate(bug.created_at)}</td>
                          <td
                            style={{
                              padding: '10px',
                              border: '1px solid #D1D5DB',
                              fontSize: '0.78rem',
                              textAlign: 'center',
                              position: 'relative',
                              zIndex: activeBugMenu === bug.id ? 100 : 1
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', position: 'relative' }}>
                              <button
                                className="bug-action-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveBugMenu(activeBugMenu === bug.id ? null : bug.id);
                                }}
                                title="Thao tác"
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  color: '#64748B',
                                  cursor: 'pointer',
                                  padding: '4px'
                                }}
                              >
                                <MoreVertical size={16} style={{ pointerEvents: 'none' }} />
                              </button>
                              {activeBugMenu === bug.id && (
                                <div className="action-menu" style={{
                                  position: 'absolute',
                                  right: 0,
                                  top: '100%',
                                  backgroundColor: 'white',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                  borderRadius: '4px',
                                  zIndex: 9999,
                                  minWidth: '120px',
                                  border: '1px solid #E2E8F0',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  opacity: 1,
                                  animation: 'none'
                                }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveBugMenu(null);
                                      handleOpenEditBugModal(bug);
                                    }}
                                    style={{
                                      padding: '8px 12px',
                                      textAlign: 'left',
                                      background: 'none',
                                      border: 'none',
                                      borderBottom: '1px solid #E2E8F0',
                                      cursor: 'pointer',
                                      fontSize: '0.85rem',
                                      color: '#7B5233',
                                      fontWeight: '600'
                                    }}
                                  >
                                    Chi tiết
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveBugMenu(null);
                                      handleDeleteBug(bug.id);
                                    }}
                                    style={{
                                      padding: '8px 12px',
                                      textAlign: 'left',
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontSize: '0.85rem',
                                      color: '#EF4444',
                                      fontWeight: '600'
                                    }}
                                  >
                                    Xóa
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isBugExpanded && (
                          <tr>
                            <td colSpan={9} style={{ padding: '15px 25px', backgroundColor: '#FDFCFB', borderLeft: '4px solid #7B5233' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                  <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      {bug.images && bug.images.filter(img => !img.update_id).length > 0 ? (
                                        bug.images.filter(img => !img.update_id).map((img, idx) => (
                                          <div key={idx} style={{ width: '120px', height: '80px', borderRadius: '8px', border: '1px solid #EADCC9', overflow: 'hidden', backgroundColor: '#FAF6F0' }}>
                                            <img src={getImageUrl(img.image_path)} alt="Bug spec" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onClick={() => window.open(getImageUrl(img.image_path), '_blank')} />
                                          </div>
                                        ))
                                      ) : (
                                        <div style={{ width: '120px', height: '80px', borderRadius: '8px', border: '1px dashed #EADCC9', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF6F0', color: '#A08070', fontSize: '0.75rem' }}>
                                          Không có ảnh
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: '250px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#8D6E63', fontWeight: 'bold', marginBottom: '4px' }}>
                                        <span>Phản hồi từ [{getPositionByName(bug.reporter)} - {bug.reporter || 'Hệ thống'}]</span>
                                        <span>{formatDate(bug.created_at)}</span>
                                      </div>
                                      <div style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #EADCC9', backgroundColor: '#fff', fontSize: '0.82rem', color: '#2D1A12', minHeight: '38px' }}>
                                        {parsed.text}
                                      </div>
                                    </div>
                                  </div>

                                  {bug.updates && bug.updates.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px dashed #FAF0E6', paddingTop: '16px' }}>
                                      {bug.updates.map((update, uIdx) => (
                                        <div key={uIdx} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap', borderBottom: uIdx < bug.updates.length - 1 ? '1px dashed #FAF0E6' : 'none', paddingBottom: '12px' }}>
                                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {update.images && update.images.length > 0 ? (
                                              update.images.map((img, idx) => (
                                                <div key={idx} style={{ width: '120px', height: '80px', borderRadius: '8px', border: '1px solid #EADCC9', overflow: 'hidden', backgroundColor: '#FAF6F0' }}>
                                                  <img src={getImageUrl(img.image_path)} alt="Bug update" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onClick={() => window.open(getImageUrl(img.image_path), '_blank')} />
                                                </div>
                                              ))
                                            ) : (
                                              <div style={{ width: '120px', height: '80px', borderRadius: '8px', border: '1px dashed #EADCC9', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF6F0', color: '#A08070', fontSize: '0.75rem' }}>
                                                Không có ảnh
                                              </div>
                                            )}
                                          </div>
                                          <div style={{ flex: 1, minWidth: '250px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#8D6E63', fontWeight: 'bold', marginBottom: '4px' }}>
                                              <span>Phản hồi từ [{getPositionByName(update.updater)} - {update.updater || 'QC'}]</span>
                                              <span>{formatDate(update.created_at)}</span>
                                            </div>
                                            <div style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #EADCC9', backgroundColor: '#fff', fontSize: '0.82rem', color: '#2D1A12', minHeight: '38px' }}>
                                              {update.notes || <span style={{ color: '#999', fontStyle: 'italic' }}>Không có nội dung phản hồi.</span>}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BugListTable;
