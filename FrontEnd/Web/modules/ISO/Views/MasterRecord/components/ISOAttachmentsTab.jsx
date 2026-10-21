import React, { useState, useMemo } from 'react';
import { 
  Search, Upload, Download, MoreVertical, Eye, CheckCircle2, 
  Clock, AlertTriangle, Info, Folder, FolderOpen, FileText,
  ChevronDown, ChevronRight, Layers, FileSpreadsheet, ExternalLink,
  Check, X
} from 'lucide-react';
import { 
  formatClassificationText, 
  renderClassificationBadge 
} from './isoMasterRecordUtils';

export const ISOAttachmentsTab = ({
  detailRecord = {},
  realFilesData = null,
  groupChildDocs = [],
  selectedChildDoc = null,
  handleSelectChildDoc,
  setViewerActiveTab,
  openDocumentViewer,
  handleDownloadFile,
  handleToggleFileUsage,
  handleUnlinkFile,
  handleUploadRelatedFileInTab4,
  uploadingRelated = false,
  relatedFileInputRef,
  fileSearchText = '',
  setFileSearchText,
  fileTypeFilter = 'all',
  setFileTypeFilter,
  expandedChildDocId,
  setExpandedChildDocId,
  activeFileMenuKey,
  setActiveFileMenuKey,
  toast
}) => {
  // Folder expand state: map of child doc id -> boolean
  const [expandedFolders, setExpandedFolders] = useState({});

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: prev[folderId] === undefined ? false : !prev[folderId]
    }));
  };

  const isFolderExpanded = (folderId) => {
    return expandedFolders[folderId] !== false; // default to true (expanded)
  };

  // Chuẩn bị danh sách tài liệu con kèm file của từng tài liệu
  // Đảm bảo bảo toàn tất cả tài liệu con, chỉ loại bỏ trùng nếu thực sự cùng 1 bản ghi
  const childFolders = useMemo(() => {
    const rawList = (realFilesData?.child_documents && realFilesData.child_documents.length > 0)
      ? realFilesData.child_documents
      : groupChildDocs.map(c => {
          const cId = c.source_row_id || c.id;
          const allFiles = realFilesData?.files || realFilesData?.all_files || [];
          const cFiles = allFiles.filter(f => f.source_record_id === cId || f.source_row_id === cId);
          return {
            ...c,
            files: cFiles.length > 0 ? cFiles : (c.files || [])
          };
        });

    const seen = new Set();
    const result = [];
    for (const folder of rawList) {
      const idKey = (folder.id != null && folder.id !== '') 
        ? `id_${folder.id}` 
        : (folder.source_row_id != null ? `row_${folder.source_row_id}` : null);
      
      const contentKey = `${(folder.source_code || '').trim()}___${(folder.document_name || '').trim()}___${(folder.suggested_doc_code || '').trim()}`;
      const uniqueKey = idKey || contentKey;

      if (!seen.has(uniqueKey)) {
        seen.add(uniqueKey);
        result.push({ ...folder });
      } else {
        // Nếu thực sự cùng một bản ghi trùng lặp, gộp danh sách file nếu có file mới
        const existingIdx = result.findIndex(r => 
          (idKey && (r.id === folder.id || r.source_row_id === folder.source_row_id)) || 
          `${(r.source_code || '').trim()}___${(r.document_name || '').trim()}___${(r.suggested_doc_code || '').trim()}` === contentKey
        );
        if (existingIdx !== -1 && folder.files && folder.files.length > 0) {
          const existingFiles = result[existingIdx].files || [];
          const existingPaths = new Set(existingFiles.map(f => f.file_id || f.relative_path || f.clean_rel_path || f.file_name));
          const newFiles = folder.files.filter(f => !existingPaths.has(f.file_id || f.relative_path || f.clean_rel_path || f.file_name));
          if (newFiles.length > 0) {
            result[existingIdx].files = [...existingFiles, ...newFiles];
          }
        }
      }
    }
    return result;
  }, [realFilesData, groupChildDocs]);

  // Tập hợp toàn bộ danh sách file từ tất cả các thư mục con trong nhóm hồ sơ
  // Giữ các file trùng tên nếu có ID hoặc đường dẫn khác nhau, không tự ý xóa/gộp
  const allGroupFiles = useMemo(() => {
    if (childFolders && childFolders.length > 0) {
      const list = [];
      childFolders.forEach(folder => {
        if (Array.isArray(folder.files)) {
          folder.files.forEach(f => {
            list.push(f);
          });
        }
      });
      return list;
    }
    return realFilesData?.files || detailRecord?.files || [];
  }, [childFolders, realFilesData, detailRecord]);

  // Thống kê động số lượng file theo từng định dạng từ toàn bộ dữ liệu nhóm hồ sơ
  const fileCounts = useMemo(() => {
    let all = 0;
    let docx = 0;
    let xlsx = 0;
    let pdf = 0;
    let archive = 0;

    allGroupFiles.forEach(file => {
      all += 1;
      const ext = (file.ext || '').toLowerCase();
      if (ext === 'docx' || ext === 'doc') {
        docx += 1;
      } else if (ext === 'xlsx' || ext === 'xls') {
        xlsx += 1;
      } else if (ext === 'pdf') {
        pdf += 1;
      } else if (['rar', 'zip', '7z'].includes(ext)) {
        archive += 1;
      }
    });

    return { all, docx, xlsx, pdf, archive };
  }, [allGroupFiles]);

  const totalFilesCount = fileCounts.all;

  // Bộ lọc tìm kiếm và loại file
  const filterFile = (file) => {
    if (!file) return false;
    const nameMatch = !fileSearchText.trim() || 
      (file.file_name || '').toLowerCase().includes(fileSearchText.toLowerCase()) ||
      (file.relative_path || '').toLowerCase().includes(fileSearchText.toLowerCase());
    
    if (!nameMatch) return false;

    if (fileTypeFilter === 'all') return true;
    const ext = (file.ext || '').toLowerCase();
    if (fileTypeFilter === 'docx') return ext === 'docx' || ext === 'doc';
    if (fileTypeFilter === 'xlsx') return ext === 'xlsx' || ext === 'xls';
    if (fileTypeFilter === 'pdf') return ext === 'pdf';
    if (fileTypeFilter === 'archive') return ['rar', 'zip', '7z'].includes(ext);
    return true;
  };

  // Render 3-dots action menu cho từng dòng file
  const renderFileActionMenu = (file, fileKey) => {
    const isArchive = ['rar', 'zip', '7z'].includes((file.ext || '').toLowerCase());
    const isMenuOpen = activeFileMenuKey === fileKey;
    const isInUse = file.usage_status === 'IN_USE';

    return (
      <div 
        className="iso-file-action-wrapper" 
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative' }}
      >
        <button
          type="button"
          className="iso-file-more-btn"
          style={{
            background: isMenuOpen ? '#E2E8F0' : 'transparent',
            border: 'none',
            borderRadius: '4px',
            padding: '5px 8px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569',
            fontSize: '1rem',
            lineHeight: 1
          }}
          onClick={(e) => {
            e.stopPropagation();
            setActiveFileMenuKey(isMenuOpen ? null : fileKey);
          }}
          title="Thao tác với tệp tin"
        >
          <MoreVertical size={16} />
        </button>

        {isMenuOpen && (
          <>
            {/* Backdrop click outside */}
            <div 
              style={{ position: 'fixed', inset: 0, zIndex: 998 }} 
              onClick={(e) => {
                e.stopPropagation();
                setActiveFileMenuKey(null);
              }} 
            />

            {/* Floating dropdown */}
            <div 
              className="iso-file-menu-dropdown"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                minWidth: '190px',
                zIndex: 999,
                padding: '5px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 1. Xem file */}
              <button
                type="button"
                className="iso-file-menu-item"
                onClick={() => {
                  setActiveFileMenuKey(null);
                  if (!file.exists) {
                    toast?.warning?.(`Không tìm thấy file "${file.file_name}"`);
                    return;
                  }
                  if (isArchive) {
                    toast?.info?.(`Đang tải xuống file nén "${file.file_name}"...`);
                    handleDownloadFile(file);
                    return;
                  }
                  openDocumentViewer(file);
                }}
              >
                <Eye size={14} color="#2563EB" />
                <span>Xem file</span>
              </button>

              {/* 2. Tải xuống */}
              <button
                type="button"
                className="iso-file-menu-item"
                disabled={!file.exists}
                onClick={() => {
                  setActiveFileMenuKey(null);
                  handleDownloadFile(file);
                }}
              >
                <Download size={14} color="#7B5233" />
                <span>Tải xuống</span>
              </button>

              {/* 3. Chi tiết file */}
              <button
                type="button"
                className="iso-file-menu-item"
                onClick={() => {
                  setActiveFileMenuKey(null);
                  setExpandedChildDocId(expandedChildDocId === fileKey ? null : fileKey);
                }}
              >
                <Info size={14} color="#475569" />
                <span>Chi tiết file</span>
              </button>

              <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '3px 0' }} />

              {/* 4. Trạng thái sử dụng */}
              <button
                type="button"
                className="iso-file-menu-item"
                onClick={() => {
                  setActiveFileMenuKey(null);
                  if (handleToggleFileUsage) {
                    handleToggleFileUsage(file, isInUse ? 'NOT_IN_USE' : 'IN_USE');
                  }
                }}
              >
                {isInUse ? (
                  <>
                    <Clock size={14} color="#D97706" />
                    <span>Đánh dấu: Không sử dụng</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} color="#16A34A" />
                    <span>Đánh dấu: Đang sử dụng</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  // Render chi tiết siêu dữ liệu file khi được mở rộng
  const renderFileDetailPanel = (file) => (
    <div 
      className="iso-file-detail-panel"
      style={{
        margin: '2px 0 8px 14px',
        padding: '10px 14px',
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: '6px',
        fontSize: '0.78rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '6px 16px'
      }}
    >
      <div><span style={{ color: '#64748B' }}>Tên tệp tin:</span> <b style={{ color: '#1E293B' }}>{file.file_name}</b></div>
      <div><span style={{ color: '#64748B' }}>Định dạng:</span> <b style={{ color: '#1E293B' }}>{(file.ext || '').toUpperCase()}</b></div>
      <div><span style={{ color: '#64748B' }}>Dung lượng:</span> <b style={{ color: '#1E293B' }}>{file.size_formatted || '0 KB'}</b></div>
      <div>
        <span style={{ color: '#64748B' }}>Trạng thái sử dụng:</span>{' '}
        <b style={{ color: file.usage_status === 'IN_USE' ? '#16A34A' : '#D97706' }}>
          {file.usage_status_label || (file.usage_status === 'IN_USE' ? 'Đang sử dụng' : 'Không sử dụng')}
        </b>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <span style={{ color: '#64748B' }}>Đường dẫn file:</span>{' '}
        <span style={{ fontFamily: 'monospace', color: '#334155', wordBreak: 'break-all' }}>
          {file.relative_path || file.raw_path}
        </span>
      </div>
      {file.source_code && (
        <div><span style={{ color: '#64748B' }}>Mã nguồn hồ sơ:</span> <b>{file.source_code}</b></div>
      )}
      {file.modified_time && (
        <div><span style={{ color: '#64748B' }}>Ngày cập nhật:</span> <span>{file.modified_time}</span></div>
      )}
    </div>
  );

  return (
    <div className="iso-viewer-tab-content">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Toolbar lọc và tìm kiếm file */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          padding: '10px 16px',
          borderRadius: '8px',
          border: '1px solid var(--iso-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px', maxWidth: '380px' }}>
            <div className="iso-search-box" style={{ width: '100%', margin: 0 }}>
              <Search size={15} color="#8D6E63" />
              <input 
                type="text" 
                placeholder="Tìm tên tệp tin, đường dẫn..."
                value={fileSearchText}
                onChange={(e) => setFileSearchText(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Filter pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {[
                { key: 'all', label: `Tất cả (${fileCounts.all})` },
                { key: 'docx', label: `Word (.docx) (${fileCounts.docx})` },
                { key: 'xlsx', label: `Excel (.xlsx) (${fileCounts.xlsx})` },
                { key: 'pdf', label: `PDF (.pdf) (${fileCounts.pdf})` },
                { key: 'archive', label: `File nén (.rar, .zip) (${fileCounts.archive})` }
              ].map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  className="iso-page-btn"
                  style={{
                    padding: '4px 9px',
                    borderRadius: '12px',
                    fontSize: '0.74rem',
                    border: fileTypeFilter === btn.key ? '1px solid #7B5233' : '1px solid #CBD5E1',
                    backgroundColor: fileTypeFilter === btn.key ? '#FFF8F2' : '#FFFFFF',
                    color: fileTypeFilter === btn.key ? '#7B5233' : '#475569',
                    fontWeight: fileTypeFilter === btn.key ? '700' : '500',
                    cursor: 'pointer'
                  }}
                  onClick={() => setFileTypeFilter(btn.key)}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Input ẩn và Nút Tải file liên quan lên */}
            <input 
              type="file" 
              ref={relatedFileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleUploadRelatedFileInTab4} 
            />
            <button
              type="button"
              className="iso-btn-brown"
              style={{ padding: '5px 12px', fontSize: '0.78rem', gap: '6px', height: '32px' }}
              onClick={() => relatedFileInputRef.current?.click()}
              disabled={uploadingRelated}
              title="Tải tệp tin liên quan từ máy tính lên hồ sơ"
            >
              <Upload size={14} />
              <span>{uploadingRelated ? 'Đang tải lên...' : 'Tải file lên'}</span>
            </button>
          </div>
        </div>

        {/* CẤU TRÚC THƯ MỤC DUY NHẤT (FOLDER VIEW): 1 NHÓM HỒ SƠ -> CÁC THƯ MỤC TÀI LIỆU CON -> TỆP TIN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {childFolders.map((doc, docIdx) => {
              const folderId = doc.id || doc.source_row_id || `folder_${docIdx}`;
              const isExpanded = isFolderExpanded(folderId);
              const docFiles = (doc.files || []).filter(filterFile);
              const isCurrentSelected = (
                (selectedChildDoc?.id && selectedChildDoc.id === doc.id) ||
                (selectedChildDoc?.source_row_id && selectedChildDoc.source_row_id === doc.source_row_id)
              );

              return (
                <div 
                  key={folderId}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: isCurrentSelected ? '1.5px solid #7B5233' : '1px solid var(--iso-border)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    overflow: 'visible'
                  }}
                >
                  {/* Folder Header */}
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: isCurrentSelected ? '#FFF8F2' : '#F8FAFC',
                      borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleFolder(folderId)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
                      <button 
                        type="button" 
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      >
                        {isExpanded ? <ChevronDown size={17} color="#7B5233" /> : <ChevronRight size={17} color="#7B5233" />}
                      </button>

                      {isExpanded ? <FolderOpen size={18} color="#D97706" /> : <Folder size={18} color="#D97706" />}

                      {doc.source_code && (
                        <span style={{ fontWeight: '700', color: '#7B5233', fontSize: '0.84rem' }}>
                          [{doc.source_code}]
                        </span>
                      )}

                      <span style={{ fontWeight: isCurrentSelected ? '700' : '600', color: '#1E293B', fontSize: '0.88rem' }}>
                        {doc.document_name || doc.file_name || `Tài liệu ${docIdx + 1}`}
                      </span>

                      {doc.classification && (
                        <span className="iso-file-cls-badge">
                          {formatClassificationText(doc.classification)}
                        </span>
                      )}

                      {doc.department_in_charge && (
                        <span style={{ fontSize: '0.74rem', color: '#64748B', backgroundColor: '#EDF2F7', padding: '1px 6px', borderRadius: '4px' }}>
                          {doc.department_in_charge}
                        </span>
                      )}

                      <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#6D28D9', backgroundColor: '#EDE9FE', padding: '1px 8px', borderRadius: '10px' }}>
                        {(fileTypeFilter !== 'all' || fileSearchText.trim()) && docFiles.length !== (doc.files || []).length
                          ? `${docFiles.length}/${(doc.files || []).length} file đính kèm`
                          : `${(doc.files || []).length} file đính kèm`}
                      </span>

                      {isCurrentSelected && (
                        <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#047857', backgroundColor: '#D1FAE5', padding: '1px 7px', borderRadius: '8px' }}>
                          Đang chọn xem
                        </span>
                      )}
                    </div>

                    {/* Right action button: Chọn xem ở Tab 1 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="iso-btn-outline"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '5px', height: '28px' }}
                        onClick={() => {
                          handleSelectChildDoc(doc);
                          setViewerActiveTab('general');
                        }}
                        title="Chuyển sang Tab 1 để xem và chỉnh sửa thông tin của tài liệu này"
                      >
                        <FileText size={13} color="#7B5233" />
                        <span>Xem ở Tab 1</span>
                      </button>
                    </div>
                  </div>

                  {/* Folder Contents (Files of this child document) */}
                  {isExpanded && (
                    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#FFFFFF' }}>
                      {docFiles.length > 0 ? (
                        docFiles.map((file, fIdx) => {
                          const fileKey = file.raw_path || file.relative_path || `f_${folderId}_${fIdx}`;
                          const isArchive = ['rar', 'zip', '7z'].includes((file.ext || '').toLowerCase());
                          return (
                            <React.Fragment key={fileKey}>
                              <div
                                className={`iso-file-item-card ${file.exists ? 'is-clickable' : ''}`}
                                onClick={() => {
                                  if (!file.exists) {
                                    toast?.warning?.(`Không tìm thấy file "${file.file_name}" theo đường dẫn trong thư mục HỒ SƠ VINA G7.`);
                                    return;
                                  }
                                  if (isArchive) {
                                    toast?.info?.(`Định dạng file nén (.${file.ext}) không hỗ trợ xem trước, đang tải file xuống máy...`);
                                    handleDownloadFile(file);
                                    return;
                                  }
                                  openDocumentViewer(file);
                                }}
                                style={{ 
                                  cursor: file.exists ? 'pointer' : 'default', 
                                  marginLeft: '14px', 
                                  borderLeft: '3px solid #CBD5E1',
                                  overflow: 'visible',
                                  position: 'relative'
                                }}
                                title={file.exists ? (isArchive ? `Bấm để tải xuống: ${file.file_name}` : `Bấm để mở xem: ${file.file_name}`) : `Tệp tin không tồn tại: ${file.file_name}`}
                              >
                                {/* Left Info: Định dạng, Tên file, Dung lượng */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
                                  <span className={`iso-file-badge ${(file.ext || '').toLowerCase()}`}>
                                    {(file.ext || 'FILE').toUpperCase()}
                                  </span>

                                  <span className="iso-file-name-text" title={file.file_name}>
                                    {file.file_name}
                                  </span>

                                  {file.size_formatted && file.size_formatted !== '0 KB' && (
                                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                      {file.size_formatted}
                                    </span>
                                  )}

                                  {!file.exists && (
                                    <span className="iso-file-missing-pill">
                                      <AlertTriangle size={12} />
                                      <span>Không tìm thấy file trên đĩa</span>
                                    </span>
                                  )}
                                </div>

                                {/* Right: Trạng thái xử lý & Trạng thái sử dụng độc lập + Menu ba chấm ⋯ */}
                                <div 
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* 1. Trạng thái xử lý */}
                                  <span 
                                    className={`iso-status-pill proc-${(file.processing_status || 'unedited').toLowerCase()}`}
                                    title={`Trạng thái xử lý: ${file.processing_status_label || (file.processing_status === 'CONVERTED' ? 'Đã chuyển đổi' : file.processing_status === 'EDITED' ? 'Đã chỉnh sửa' : 'Chưa chỉnh sửa')}`}
                                  >
                                    {file.processing_status_label || (file.processing_status === 'CONVERTED' ? 'Đã chuyển đổi' : file.processing_status === 'EDITED' ? 'Đã chỉnh sửa' : 'Chưa chỉnh sửa')}
                                  </span>

                                  {/* 2. Trạng thái sử dụng */}
                                  <span 
                                    className={`iso-status-pill usage-${(file.usage_status || 'in_use').toLowerCase()}`}
                                    title={`Trạng thái sử dụng: ${file.usage_status_label || (file.usage_status === 'IN_USE' ? 'Đang sử dụng' : 'Không sử dụng')}`}
                                  >
                                    {file.usage_status === 'IN_USE' ? (
                                      <CheckCircle2 size={12} color="#047857" />
                                    ) : (
                                      <Clock size={12} color="#64748B" />
                                    )}
                                    <span>{file.usage_status_label || (file.usage_status === 'IN_USE' ? 'Đang sử dụng' : 'Không sử dụng')}</span>
                                  </span>

                                  {/* 3. Menu ba chấm ⋯ */}
                                  {renderFileActionMenu(file, fileKey)}
                                </div>
                              </div>

                              {/* Hiển thị chi tiết file khi mở rộng */}
                              {expandedChildDocId === fileKey && renderFileDetailPanel(file)}
                            </React.Fragment>
                          );
                        })
                      ) : (
                        <div style={{ padding: '8px 14px', fontSize: '0.8rem', color: '#94A3B8', fontStyle: 'italic', marginLeft: '14px' }}>
                          {(fileTypeFilter !== 'all' || fileSearchText.trim()) 
                            ? 'Không có tệp tin nào phù hợp với bộ lọc trong thư mục này.' 
                            : 'Chưa có tệp tin đính kèm cho dòng tài liệu này.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

      </div>
    </div>
  );
};

export default ISOAttachmentsTab;
