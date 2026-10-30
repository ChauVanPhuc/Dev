import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@webShared/Services/api.service';
import { 
  AlertCircle, AlertTriangle, X, CheckCircle, Info 
} from 'lucide-react';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import './isoMasterRecord.css';

import { 
  COLUMN_CONFIG, 
  formatDateOnly, 
  getExcelColName 
} from './components/isoMasterRecordUtils';
import ISOMasterRecordTable from './components/ISOMasterRecordTable';
import ISOMasterRecordDetailModal from './components/ISOMasterRecordDetailModal';
import ISOImportExcelModal from './components/ISOImportExcelModal';
import ISODocumentViewerModal from './components/ISODocumentViewerModal';
import ISODocumentCompareModal from './components/ISODocumentCompareModal';
import ISODirectWordEditorModal from './components/ISODirectWordEditorModal';
import ISOMasterRecordChildDocsTable from './components/ISOMasterRecordChildDocsTable';
import ISOMasterRecordDocSelectorModal from './components/ISOMasterRecordDocSelectorModal';
import ISOProcessPreviewModal from '../../components/ISOProcessPreviewModal';

const ISOMasterRecordListView = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Logged-in user information
  const loggedInUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('smartflow_user') || '{}');
    } catch (e) {
      return {};
    }
  }, []);

  // Level 2 (Bên trong bộ tài liệu) states
  const [currentFolder, setCurrentFolder] = useState(null);
  const [childDocs, setChildDocs] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [isDocSelectorOpen, setIsDocSelectorOpen] = useState(false);

  // Preview document modal
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const { id: routeFolderId } = useParams();

  const fetchChildren = async (folderId) => {
    if (!folderId) return;
    setLoadingChildren(true);
    try {
      const res = await api.get(`/iso-master-records/${folderId}/children`);
      const children = res?.children || res?.data?.children || [];
      const record = res?.record || res?.data?.record;
      if (record) {
        setCurrentFolder(record);
      }
      setChildDocs(children);
    } catch (err) {
      console.error('Lỗi tải tài liệu trong bộ:', err);
      toast.error('Không thể tải danh sách tài liệu trong bộ');
    } finally {
      setLoadingChildren(false);
    }
  };

  // Đồng bộ với URL route: /admin/iso-records/:id
  useEffect(() => {
    if (routeFolderId) {
      fetchChildren(routeFolderId);
    } else {
      setCurrentFolder(null);
      setChildDocs([]);
    }
  }, [routeFolderId]);

  const handleSelectFolder = (rec) => {
    setCurrentFolder(rec);
    navigate(`/admin/iso-records/${rec.id}`);
  };

  const handleBackToFolders = () => {
    setCurrentFolder(null);
    setChildDocs([]);
    navigate('/admin/iso-records');
    fetchRecords();
  };

  // Data states
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total_all: 0,
    docs_count: 0,
    forms_count: 0,
    records_count: 0,
    checked_count: 0
  });

  // Query & Filter states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [checkedFilter, setCheckedFilter] = useState('');
  const [paFilter, setPaFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [codeFilter, setCodeFilter] = useState('');
  const [docNameFilter, setDocNameFilter] = useState('');
  const [editionFilter, setEditionFilter] = useState('');
  const [issueDateFilter, setIssueDateFilter] = useState('');
  const [modDateFilter, setModDateFilter] = useState('');
  const [managementDocFilter, setManagementDocFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [notesFilter, setNotesFilter] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState('asc');

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('iso_master_visible_columns');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...parsed,
            suggested_doc_code: true,
            document_name: true,
            source_status: true,
            actions: true
          };
        }
      }
    } catch (e) {}
    return {
      management_group: true,
      code_of_conduct: true,
      classification: true,
      suggested_doc_code: true,
      document_name: true,
      department_in_charge: true,
      edition: true,
      issue_date: true,
      last_modified_date: true,
      management_doc: true,
      source_status: true,
      notes: true,
      actions: true
    };
  });
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  const [activeNoteModal, setActiveNoteModal] = useState(null);

  // Column Visibility Handlers
  const handleToggleColumn = (colKey) => {
    const coreCols = ['suggested_doc_code', 'document_name', 'source_status', 'actions'];
    if (coreCols.includes(colKey)) return;
    setVisibleColumns(prev => {
      const next = {
        ...prev,
        [colKey]: !prev[colKey],
        suggested_doc_code: true,
        document_name: true,
        source_status: true,
        actions: true
      };
      try {
        localStorage.setItem('iso_master_visible_columns', JSON.stringify(next));
      } catch (err) {}
      return next;
    });
  };

  const handleShowAllColumns = () => {
    const allOn = {
      management_group: true,
      code_of_conduct: true,
      classification: true,
      suggested_doc_code: true,
      document_name: true,
      department_in_charge: true,
      edition: true,
      issue_date: true,
      last_modified_date: true,
      management_doc: true,
      source_status: true,
      notes: true,
      actions: true
    };
    setVisibleColumns(allOn);
    try {
      localStorage.setItem('iso_master_visible_columns', JSON.stringify(allOn));
    } catch (err) {}
  };

  // Filter options from API
  const [filterOptions, setFilterOptions] = useState({
    classifications: [],
    groups: [],
    departments: [],
    code_of_conducts: [],
    suggested_doc_codes: [],
    editions: [],
    management_docs: [],
    source_statuses: []
  });

  // Selection states
  const [selectedIds, setSelectedIds] = useState([]);

  // Dropdown states
  const [isOtherOpen, setIsOtherOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);

  // Modal states: Excel Upload
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState('append');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Modal states: Detail / View / Edit
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [viewerActiveTab, setViewerActiveTab] = useState('general');
  const [activeHeadingId, setActiveHeadingId] = useState('sec-1');
  const [linkedDocData, setLinkedDocData] = useState(null);
  const [loadingLinkedDoc, setLoadingLinkedDoc] = useState(false);
  const [fileSearchText, setFileSearchText] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);

  // Group child document management states
  const [selectedChildDoc, setSelectedChildDoc] = useState(null);
  const [expandedChildDocId, setExpandedChildDocId] = useState(null);

  // Real filesystem files & Word docs states
  const [realFilesData, setRealFilesData] = useState(null);
  const [loadingRealFiles, setLoadingRealFiles] = useState(false);
  const [selectedWordDoc, setSelectedWordDoc] = useState(null);
  const [tab2DocContent, setTab2DocContent] = useState({
    html_content: '',
    headings: [],
    preview_pdf_url: '',
    loading: false,
    error: null
  });
  const [activeFileMenuKey, setActiveFileMenuKey] = useState(null);
  const [docDropdownOpen, setDocDropdownOpen] = useState(false);
  const [docSearchTerm, setDocSearchTerm] = useState('');

  // Unlink file confirm modal
  const [confirmUnlinkModal, setConfirmUnlinkModal] = useState({
    show: false,
    file: null,
    loading: false
  });

  // Document Viewer Modal state
  const [docViewerModal, setDocViewerModal] = useState({
    show: false,
    file: null,
    docContent: null,
    excelData: null,
    activeSheetIdx: 0,
    selectedCell: { r: 0, c: 0, address: 'A1', val: '' },
    loading: false,
    error: null
  });
  const [docViewerZoom, setDocViewerZoom] = useState(100);
  const [downloadingFile, setDownloadingFile] = useState(false);
  const [uploadingWord, setUploadingWord] = useState(false);
  const [uploadingRelated, setUploadingRelated] = useState(false);
  const wordInputRef = useRef(null);
  const relatedFileInputRef = useRef(null);

  // Edit mode & Unsaved Changes states
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [initialFormData, setInitialFormData] = useState({});
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Document Conversion states
  const [conversionState, setConversionState] = useState({
    active: false,
    mode: 'after',
    loading: false,
    data: null,
    sourceDocBackup: null,
    sourceContentBackup: null
  });
  const [conversionStatus, setConversionStatus] = useState('IDLE');
  const [conversionError, setConversionError] = useState(null);
  const [acceptedDraft, setAcceptedDraft] = useState(null);

  // Compare Modal states
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareZoom, setCompareZoom] = useState(100);
  const [compareSyncScroll, setCompareSyncScroll] = useState(true);
  const [compareBlobs, setCompareBlobs] = useState({ beforeUrl: '', afterUrl: '', loading: false });
  const [comparePages, setComparePages] = useState({ before: [], after: [], loading: false, loaded: false });
  const compareLeftPaneRef = useRef(null);
  const compareRightPaneRef = useRef(null);
  const isSyncingScrollRef = useRef(false);

  // Direct Word Editor states
  const [showDirectWordEditorModal, setShowDirectWordEditorModal] = useState(false);
  const [isWordEditMode, setIsWordEditMode] = useState(false);
  const [editorInitialHtml, setEditorInitialHtml] = useState('');
  const [isWordEditorDirty, setIsWordEditorDirty] = useState(false);
  const [savingWordDirect, setSavingWordDirect] = useState(false);
  const [wordEditorZoom, setWordEditorZoom] = useState(100);
  const [wordEditorFont, setWordEditorFont] = useState('Times New Roman');
  const [wordEditorFontSize, setWordEditorFontSize] = useState('3');
  const [wordEditorStyle, setWordEditorStyle] = useState('p');
  const wordEditorRef = useRef(null);

  // Delete confirm modal
  const [confirmDelete, setConfirmDelete] = useState({
    show: false,
    id: null,
    name: '',
    isBatch: false
  });

  // Dedicated Folder Edit Modal state
  const [editFolderModal, setEditFolderModal] = useState({
    show: false,
    folder: null,
    name: '',
    dept: '',
    status: 'Dự thảo',
    notes: '',
    loading: false
  });

  const handleStartEditFolder = (folderToEdit) => {
    if (!folderToEdit) return;
    setEditFolderModal({
      show: true,
      folder: folderToEdit,
      name: folderToEdit.document_name || '',
      dept: folderToEdit.department_in_charge || '',
      status: folderToEdit.source_status || 'Dự thảo',
      notes: folderToEdit.notes || '',
      loading: false
    });
  };

  const handleSaveEditFolder = async () => {
    if (!editFolderModal.name.trim()) {
      toast.warning('Vui lòng nhập tên bộ tài liệu');
      return;
    }
    setEditFolderModal(prev => ({ ...prev, loading: true }));
    try {
      const payload = {
        document_name: editFolderModal.name.trim(),
        department_in_charge: editFolderModal.dept.trim() || loggedInUser?.department_name || '',
        source_status: editFolderModal.status || 'Dự thảo',
        notes: editFolderModal.notes.trim()
      };
      await api.put(`/iso-master-records/${editFolderModal.folder.id}`, payload);
      toast.success('Đã cập nhật thông tin bộ tài liệu thành công!');
      
      if (currentFolder && (currentFolder.id === editFolderModal.folder.id || currentFolder.id === Number(editFolderModal.folder.id))) {
        setCurrentFolder(prev => ({ ...prev, ...payload }));
      }
      
      setEditFolderModal({
        show: false,
        folder: null,
        name: '',
        dept: '',
        status: 'Dự thảo',
        notes: '',
        loading: false
      });
      fetchRecords();
      fetchFilterOptions();
    } catch (err) {
      toast.error('Lỗi khi cập nhật bộ tài liệu: ' + (err?.response?.data?.detail || err.message));
      setEditFolderModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Audit log states
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  // Fetch Audit Logs
  const fetchAuditLogs = async (recordId) => {
    if (!recordId) {
      setAuditLogs([]);
      return;
    }
    setLoadingAuditLogs(true);
    try {
      const res = await api.get(`/iso-master-records/${recordId}/audit-logs`);
      const data = res?.data !== undefined ? res.data : res;
      if (Array.isArray(data)) {
        setAuditLogs(data);
      } else if (data && data.items) {
        setAuditLogs(data.items);
      } else {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error('Lỗi khi tải lịch sử thay đổi:', err);
      setAuditLogs([]);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  // Populate HTML when word editor opens
  useEffect(() => {
    if ((isWordEditMode || showDirectWordEditorModal) && wordEditorRef.current) {
      wordEditorRef.current.innerHTML = editorInitialHtml || '<p>Không có nội dung</p>';
      setIsWordEditorDirty(false);
    }
  }, [isWordEditMode, showDirectWordEditorModal, editorInitialHtml]);

  // Fetch Records with Group By Mã TL đề xuất
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        sort_dir: sortDir,
        group_by_doc_code: 'true'
      });

      if (search.trim()) params.append('search', search.trim());
      if (classificationFilter) params.append('classification', classificationFilter);
      if (groupFilter) params.append('management_group', groupFilter);
      if (paFilter) params.append('code_of_conduct', paFilter);
      if (codeFilter) params.append('suggested_doc_code', codeFilter);
      if (docNameFilter) params.append('document_name', docNameFilter);
      if (deptFilter) params.append('department', deptFilter);
      if (editionFilter) params.append('edition', editionFilter);
      if (issueDateFilter) params.append('issue_date', issueDateFilter);
      if (modDateFilter) params.append('last_modified_date', modDateFilter);
      if (managementDocFilter) params.append('management_doc', managementDocFilter);
      if (statusFilter) params.append('source_status', statusFilter);
      if (notesFilter) params.append('notes', notesFilter);
      if (checkedFilter !== '') params.append('is_checked', checkedFilter);

      const res = await api.get(`/iso-master-records/?${params.toString()}`);
      if (res) {
        setRecords(res.items || []);
        setTotalCount(res.total || 0);
        setTotalPages(res.total_pages || 1);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Lỗi tải danh mục Master List:', err);
      toast.error('Không thể tải danh sách hồ sơ ISO Master List.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Filter Options
  const fetchFilterOptions = async () => {
    try {
      const res = await api.get('/iso-master-records/summary-options');
      if (res) setFilterOptions(res);
    } catch (err) {
      console.error('Lỗi tải filter options:', err);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [
    page, pageSize, classificationFilter, groupFilter, paFilter, codeFilter, 
    docNameFilter, deptFilter, editionFilter, issueDateFilter, modDateFilter, 
    managementDocFilter, statusFilter, notesFilter, checkedFilter, sortBy, sortDir
  ]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchRecords();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.iso-dropdown-container')) {
        setIsOtherOpen(false);
        setIsExportOpen(false);
        setIsColumnsMenuOpen(false);
      }
      if (!e.target.closest('.iso-filter-dropdown-wrapper')) {
        setActiveDropdown(null);
      }
      if (
        !e.target.closest('.iso-action-menu') && 
        !e.target.closest('.iso-action-btn') &&
        !e.target.closest('.iso-dropdown-menu') &&
        !e.target.closest('.iso-folder-action-wrapper')
      ) {
        setActionMenuId(null);
      }
      if (!e.target.closest('.iso-file-more-btn') && !e.target.closest('.iso-file-menu-dropdown')) {
        setActiveFileMenuKey(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Active filters count
  const activeFilters = useMemo(() => {
    const list = [];
    if (groupFilter) list.push({ key: 'group', label: `Nhóm: ${groupFilter}` });
    if (paFilter) list.push({ key: 'pa', label: `PA: ${paFilter}` });
    if (classificationFilter) list.push({ key: 'classification', label: `Phân loại: ${classificationFilter}` });
    if (codeFilter) list.push({ key: 'code', label: `Mã TL: ${codeFilter}` });
    if (docNameFilter) list.push({ key: 'docName', label: `Tên TL: ${docNameFilter}` });
    if (deptFilter) list.push({ key: 'dept', label: `Phòng ban: ${deptFilter}` });
    if (editionFilter) list.push({ key: 'edition', label: `Lần ban hành: ${editionFilter}` });
    if (managementDocFilter) list.push({ key: 'managementDoc', label: `Luật liên quan: ${managementDocFilter}` });
    if (statusFilter) list.push({ key: 'status', label: `Trạng thái: ${statusFilter}` });
    if (notesFilter) list.push({ key: 'notes', label: `Ghi chú: ${notesFilter}` });
    return list;
  }, [
    groupFilter, paFilter, classificationFilter, codeFilter, docNameFilter,
    deptFilter, editionFilter, managementDocFilter, statusFilter, notesFilter
  ]);

  const resetAllFilters = () => {
    setClassificationFilter('');
    setGroupFilter('');
    setPaFilter('');
    setCodeFilter('');
    setDocNameFilter('');
    setDeptFilter('');
    setEditionFilter('');
    setIssueDateFilter('');
    setModDateFilter('');
    setManagementDocFilter('');
    setStatusFilter('');
    setNotesFilter('');
    setCheckedFilter('');
    setPage(1);
  };

  // Check files status for selected record
  const fetchRealFilesStatus = async (recordId) => {
    if (!recordId) return;
    setLoadingRealFiles(true);
    try {
      const res = await api.get(`/iso-master-records/${recordId}/files-status`);
      const data = res?.data || res;
      if (data && data.success) {
        setRealFilesData(data);
        if (data.selected_word_doc) {
          setSelectedWordDoc(data.selected_word_doc);
          loadTab2Doc(data.selected_word_doc);
        } else if (data.word_docs && data.word_docs.length > 0) {
          setSelectedWordDoc(data.word_docs[0]);
          loadTab2Doc(data.word_docs[0]);
        } else {
          setSelectedWordDoc(null);
          setTab2DocContent({
            html_content: '',
            headings: [],
            preview_pdf_url: '',
            loading: false,
            error: null
          });
        }
      } else {
        setRealFilesData(null);
      }
    } catch (err) {
      console.error('Lỗi khi kiểm tra trạng thái tệp tin thực tế:', err);
      setRealFilesData(null);
    } finally {
      setLoadingRealFiles(false);
    }
  };

  // Load Tab 2 Document (Word PDF Preview Blob)
  const loadTab2Doc = async (docItem) => {
    if (!docItem || !docItem.exists || !docItem.relative_path) {
      if (tab2DocContent.preview_pdf_url && tab2DocContent.preview_pdf_url.startsWith('blob:')) {
        window.URL.revokeObjectURL(tab2DocContent.preview_pdf_url);
      }
      setTab2DocContent({
        html_content: '',
        headings: [],
        preview_pdf_url: '',
        loading: false,
        error: docItem && !docItem.exists ? 'Không tìm thấy file theo đường dẫn trong thư mục HỒ SƠ VINA G7' : 'Chưa có tài liệu Word đính kèm'
      });
      return;
    }

    setTab2DocContent(prev => {
      if (prev.preview_pdf_url && prev.preview_pdf_url.startsWith('blob:')) {
        window.URL.revokeObjectURL(prev.preview_pdf_url);
      }
      return {
        html_content: '',
        headings: docItem.headings || [],
        preview_pdf_url: '',
        loading: true,
        error: null
      };
    });

    const targetPath = docItem.clean_rel_path || docItem.relative_path || docItem.raw_path;
    const isWordDoc = (targetPath || '').toLowerCase().endsWith('.docx') || (targetPath || '').toLowerCase().endsWith('.doc');

    let blobUrl = '';
    let headings = docItem.headings || [];
    let htmlContent = '';
    let loadError = null;

    // 1. Nếu là tệp Word (.docx, .doc): Nạp trực tiếp HTML và Mục lục Headings qua python-docx (nhanh, chuẩn xác, không sinh lỗi 404 console)
    if (isWordDoc) {
      try {
        const res = await api.get('/iso-master-records/file-preview/docx', {
          params: { path: targetPath }
        });
        const data = res?.data || res;
        if (data && data.success) {
          htmlContent = data.html_content || '';
          if (data.headings && data.headings.length > 0) {
            headings = data.headings;
          }
        }
      } catch (hErr) {
        console.warn('Lỗi khi tải nội dung Word HTML:', hErr);
        loadError = 'Không thể xem trước tài liệu Word: ' + (hErr?.response?.data?.detail || hErr.message);
      }
    } else {
      // 2. Nếu là file PDF: Nạp stream PDF preview
      try {
        const pdfRes = await api.get('/iso-master-records/word-pdf-preview', {
          params: { path: docItem.relative_path },
          responseType: 'blob'
        });
        const rawBlob = (pdfRes instanceof Blob) ? pdfRes : (pdfRes?.data instanceof Blob ? pdfRes.data : new Blob([pdfRes]));
        if (!rawBlob.type || !rawBlob.type.includes('json')) {
          const pdfBlob = (rawBlob instanceof Blob && rawBlob.type === 'application/pdf')
            ? rawBlob
            : new Blob([rawBlob], { type: 'application/pdf' });
          blobUrl = window.URL.createObjectURL(pdfBlob);
        }
      } catch (pdfErr) {
        console.warn('Lỗi tải PDF preview:', pdfErr);
        loadError = 'Không thể tải bản xem trước PDF.';
      }
    }

    if (!blobUrl && !htmlContent && !loadError) {
      loadError = 'Không thể xem trước tài liệu Word: Tệp tin không khả dụng hoặc lỗi chuyển đổi.';
    }

    setTab2DocContent({
      html_content: htmlContent,
      headings: headings,
      preview_pdf_url: blobUrl,
      loading: false,
      error: loadError
    });

    if (headings && headings.length > 0) {
      setActiveHeadingId(headings[0].id);
    }
  };

  // Unique Word docs for Tab 2
  // Unique Word docs for Tab 2 - Hiển thị đầy đủ tất cả file DOCX thuộc folder/tài liệu đang chọn
  const uniqueWordDocs = useMemo(() => {
    let candidates = [];
    if (selectedChildDoc) {
      const cId = selectedChildDoc.source_row_id || selectedChildDoc.id;
      const cCode = (selectedChildDoc.source_code || '').trim();

      // Tìm trong realFilesData.child_documents trước theo ID hoặc mã
      const foundFolder = (realFilesData?.child_documents || []).find(cd => 
        (cId && (cd.id === cId || cd.source_row_id === cId)) ||
        (cCode && (cd.source_code || '').trim() === cCode)
      );

      if (foundFolder && Array.isArray(foundFolder.files) && foundFolder.files.length > 0) {
        candidates = foundFolder.files;
      } else if (Array.isArray(selectedChildDoc.files) && selectedChildDoc.files.length > 0) {
        candidates = selectedChildDoc.files;
      } else if (Array.isArray(realFilesData?.files)) {
        candidates = realFilesData.files.filter(f => 
          (cId && (f.source_record_id === cId || f.source_row_id === cId)) ||
          (cCode && (f.source_code || '').trim() === cCode)
        );
      }
    }

    if (candidates.length === 0) {
      candidates = realFilesData?.word_docs || realFilesData?.word_documents || realFilesData?.files || [];
    }

    // Chỉ lọc các file Word (.docx, .doc), KHÔNG lọc bỏ NOT_IN_USE, và bảo toàn các file XLSX ở Tab 4
    const wordCandidates = candidates.filter(f => {
      const ext = (f.ext || f.extension || '').toLowerCase().replace('.', '');
      const fn = (f.file_name || f.name || '').toLowerCase();
      return ext === 'docx' || ext === 'doc' || fn.endsWith('.docx') || fn.endsWith('.doc');
    });

    const seen = new Set();
    const result = [];
    for (const d of wordCandidates) {
      // Giữ riêng từng file nếu khác file_id hoặc đường dẫn hoặc phiên bản
      const rawKey = (d.file_id !== undefined && d.file_id !== null && d.file_id !== '')
        ? String(d.file_id) 
        : (d.clean_rel_path || d.relative_path || d.raw_path || `${d.file_name || ''}_${d.source_row_id || ''}_${d.folder_path || ''}`);
      const key = String(rawKey || '')
        .replace(/\\/g, '/')
        .toLowerCase()
        .trim();

      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(d);
      }
    }

    // Sắp xếp: file Đang sử dụng (IN_USE) lên đầu
    result.sort((a, b) => {
      if (a.usage_status === 'IN_USE' && b.usage_status !== 'IN_USE') return -1;
      if (a.usage_status !== 'IN_USE' && b.usage_status === 'IN_USE') return 1;
      return 0;
    });

    return result;
  }, [selectedChildDoc, realFilesData]);

  // Tự động đồng bộ tài liệu Word được chọn khi danh sách uniqueWordDocs thay đổi
  useEffect(() => {
    if (uniqueWordDocs && uniqueWordDocs.length > 0) {
      const isCurrentInList = selectedWordDoc && uniqueWordDocs.some(d => {
        if (selectedWordDoc.file_id && d.file_id) return String(selectedWordDoc.file_id) === String(d.file_id);
        const selPath = String(selectedWordDoc.relative_path || selectedWordDoc.clean_rel_path || selectedWordDoc.raw_path || selectedWordDoc.file_name || '').replace(/\\/g, '/').toLowerCase();
        const dPath = String(d.relative_path || d.clean_rel_path || d.raw_path || d.file_name || '').replace(/\\/g, '/').toLowerCase();
        return selPath === dPath;
      });

      if (!isCurrentInList) {
        const preferred = uniqueWordDocs.find(d => d.usage_status === 'IN_USE') || uniqueWordDocs[0];
        setSelectedWordDoc(preferred);
        loadTab2Doc(preferred);
      }
    }
  }, [uniqueWordDocs]);

  const hasDuplicateDocName = (fileName) => {
    if (!fileName) return false;
    return uniqueWordDocs.filter(d => (d.file_name || '').toLowerCase().trim() === fileName.toLowerCase().trim()).length > 1;
  };

  const getDocFolderContext = (doc) => {
    if (!doc) return '';
    if (doc.folder_path) return doc.folder_path;
    const rel = String(doc.relative_path || doc.clean_rel_path || '').replace(/\\/g, '/');
    const parts = rel.split('/').filter(Boolean);
    if (parts.length > 1) {
      return parts.slice(0, parts.length - 1).slice(-2).join(' / ');
    }
    return '';
  };

  const filteredWordDocs = useMemo(() => {
    if (!docSearchTerm.trim()) return uniqueWordDocs;
    const term = docSearchTerm.toLowerCase().trim();
    return uniqueWordDocs.filter(d => 
      (d.file_name || '').toLowerCase().includes(term) ||
      (d.relative_path || '').toLowerCase().includes(term) ||
      (d.folder_path || '').toLowerCase().includes(term)
    );
  }, [uniqueWordDocs, docSearchTerm]);

  // Group child docs - Đồng bộ đầy đủ tất cả tài liệu con trong nhóm
  const groupChildDocs = useMemo(() => {
    if (!detailRecord) return [];
    
    let rawList = [];
    if (realFilesData?.child_documents && realFilesData.child_documents.length > 0) {
      rawList = realFilesData.child_documents;
    } else if (realFilesData?.source_records && realFilesData.source_records.length > 0) {
      rawList = realFilesData.source_records;
    } else if (detailRecord.source_records && detailRecord.source_records.length > 0) {
      rawList = detailRecord.source_records;
    } else {
      rawList = [detailRecord];
    }

    const seen = new Set();
    const uniqueDocs = [];
    for (const d of rawList) {
      const idKey = (d.id != null && d.id !== '') ? `id_${d.id}` : (d.source_row_id != null ? `row_${d.source_row_id}` : null);
      const contentKey = `${(d.source_code || '').trim()}___${(d.document_name || '').trim()}___${(d.suggested_doc_code || '').trim()}`;
      const uniqueKey = idKey || contentKey;

      if (!seen.has(uniqueKey)) {
        seen.add(uniqueKey);
        uniqueDocs.push({
          ...d,
          file_name: d.document_name || d.source_code || 'Tài liệu',
          exists: true
        });
      }
    }
    return uniqueDocs.length > 0 ? uniqueDocs : [detailRecord];
  }, [detailRecord, realFilesData]);

  // Select child doc handler - SYNCHRONIZES METADATA & FILES
  const handleSelectChildDoc = (child) => {
    if (!child) return;
    setSelectedChildDoc(child);
    if (isEditing) {
      setEditFormData({ ...child });
    }
    
    // Tìm file Word đính kèm tương ứng của tài liệu con được chọn (nếu có)
    const cId = child.source_row_id || child.id;
    const cCode = (child.source_code || '').trim();
    const foundFolder = (realFilesData?.child_documents || []).find(cd => 
      (cId && (cd.id === cId || cd.source_row_id === cId)) ||
      (cCode && (cd.source_code || '').trim() === cCode)
    );
    const childFiles = (foundFolder && Array.isArray(foundFolder.files))
      ? foundFolder.files
      : (child.files || (realFilesData?.files || []).filter(f => 
          (cId && (f.source_record_id === cId || f.source_row_id === cId)) ||
          (cCode && (f.source_code || '').trim() === cCode)
        ));

    const wordFiles = childFiles.filter(f => {
      const ext = (f.ext || f.extension || '').toLowerCase().replace('.', '');
      const fn = (f.file_name || f.name || '').toLowerCase();
      return ext === 'docx' || ext === 'doc' || fn.endsWith('.docx') || fn.endsWith('.doc');
    });

    const defaultWordFile = wordFiles.find(f => f.usage_status === 'IN_USE') || wordFiles[0] || ((child.ext === 'docx' || child.ext === 'doc') ? child : null);

    if (defaultWordFile) {
      setSelectedWordDoc(defaultWordFile);
      loadTab2Doc(defaultWordFile);
    }
  };

  // Open Detail Modal (supports read-only or edit directly)
  const handleOpenDetailModal = (rec, editDirectly = false) => {
    setIsCreateMode(false);
    const initialChild = (rec.source_records && rec.source_records.length > 0) ? rec.source_records[0] : rec;
    setSelectedChildDoc(initialChild);
    setExpandedChildDocId(null);
    setDetailRecord(rec);
    const formVals = {
      ...rec,
      ...initialChild,
      id: rec.id,
      document_name: rec.document_name || initialChild?.document_name || '',
      department_in_charge: rec.department_in_charge || initialChild?.department_in_charge || '',
      notes: rec.notes || initialChild?.notes || '',
      source_status: rec.source_status || initialChild?.source_status || 'Dự thảo',
      management_group: rec.management_group || initialChild?.management_group || 'Hồ sơ',
      classification: rec.classification || initialChild?.classification || 'HỒ SƠ'
    };
    setInitialFormData(formVals);
    setEditFormData(formVals);
    setIsEditing(!!editDirectly);
    setShowUnsavedWarning(false);
    setPendingAction(null);
    setConversionState({
      active: false,
      mode: 'after',
      loading: false,
      data: null,
      sourceDocBackup: null,
      sourceContentBackup: null
    });
    setConversionStatus('IDLE');
    setConversionError(null);
    setAcceptedDraft(null);
    setShowDetailModal(true);
    fetchRealFilesStatus(rec.id);
    fetchAuditLogs(rec.id);
  };

  // Create new record modal
  const openCreateModal = () => {
    setIsCreateMode(true);
    setIsEditing(true);
    const nowStr = new Date().toLocaleDateString('vi-VN');
    const currentUserName = loggedInUser?.full_name || loggedInUser?.username || '';
    const currentUserDept = loggedInUser?.department_name || '';

    const blank = {
      source_code: '',
      management_group: '',
      classification: 'HỒ SƠ',
      suggested_doc_code: '',
      item_code: '',
      edition: '01',
      document_name: '',
      code_of_conduct: '',
      management_doc: '',
      form_code: '',
      attached_records_count: '',
      identified_forms_count: '',
      link_basis: '',
      is_checked: false,
      department_in_charge: currentUserDept,
      source_status: 'Dự thảo',
      review_issue: '',
      action_chosen: '',
      notes: '',
      source_link: '',
      issue_date: nowStr,
      last_modified_date: nowStr,
      created_by: currentUserName,
      approver: '',
      document_level: 'Cấp phòng'
    };
    setDetailRecord(blank);
    setSelectedChildDoc(blank);
    setExpandedChildDocId(null);
    setInitialFormData(blank);
    setEditFormData(blank);
    setViewerActiveTab('general');
    setRealFilesData({ files: [], word_docs: [], total_linked: 0, total_found: 0, total_missing: 0 });
    setSelectedWordDoc(null);
    setTab2DocContent({ html_content: '', headings: [], preview_pdf_url: '', loading: false, error: null });
    setShowUnsavedWarning(false);
    setPendingAction(null);
    setConversionStatus('IDLE');
    setConversionError(null);
    setAuditLogs([]);
    setShowDetailModal(true);
  };

  // Xử lý khi chọn Quy trình ISO hiệu lực từ Tab 1:
  // Tab 1 lấy thông tin CỦA QUY TRÌNH; các file biểu mẫu được nạp sang Tab 2 để chọn thao tác
  const handleSelectProcess = (proc) => {
    if (!proc) return;

    // 1. Chuyển đổi danh sách file biểu mẫu & quy trình để nạp vào Tab 2 (Nội dung)
    const docItems = [];
    if (Array.isArray(proc.documents)) {
      proc.documents.forEach((d, idx) => {
        if (d.file_path) {
          docItems.push({
            file_id: d.id || `proc_doc_${idx}`,
            file_name: d.file_name || `${d.code} - ${d.name}.docx`,
            relative_path: d.file_path,
            clean_rel_path: d.file_path,
            raw_path: d.file_path,
            exists: true,
            usage_status: 'IN_USE',
            source_code: d.code,
            document_name: d.name,
            code: d.code,
            version: d.version || 'v01'
          });
        }
      });
    }

    // File Word của chính quy trình nếu có
    if (proc.file_path) {
      docItems.push({
        file_id: `proc_${proc.id}`,
        file_name: proc.file_name || `${proc.code} - ${proc.name}.docx`,
        relative_path: proc.file_path,
        clean_rel_path: proc.file_path,
        raw_path: proc.file_path,
        exists: true,
        usage_status: docItems.length === 0 ? 'IN_USE' : 'NOT_IN_USE',
        source_code: proc.code,
        document_name: proc.name,
        code: proc.code,
        version: proc.edition || proc.version || '01'
      });
    }

    const initialSourceLinks = docItems.map(d => d.relative_path || d.clean_rel_path).filter(Boolean);

    // 2. Cập nhật thông tin chung CỦA QUY TRÌNH vào form (kèm source_link)
    setEditFormData(prev => ({
      ...prev,
      suggested_doc_code: proc.code || '',
      item_code: proc.code || '',
      document_name: proc.name || '',
      classification: proc.document_type || 'Quy trình',
      department_in_charge: proc.department_name || prev.department_in_charge,
      document_level: proc.document_level || prev.document_level || 'Cấp phòng',
      edition: proc.edition || proc.version || '01',
      management_group: proc.management_group || prev.management_group || proc.code,
      identified_forms_count: String(proc.documents_count || (proc.documents ? proc.documents.length : 0)),
      process_id: proc.id,
      approver: proc.approver || prev.approver,
      source_link: initialSourceLinks.join('\n')
    }));

    // 3. Cập nhật realFilesData để uniqueWordDocs ở Tab 2 có dữ liệu
    setRealFilesData({
      success: true,
      files: docItems,
      word_docs: docItems,
      total_linked: docItems.length,
      total_found: docItems.length,
      total_missing: 0
    });

    // 4. Quy tắc chọn file cho Tab 2 (Nội dung):
    // - Nếu có đúng 1 mẫu: Mặc định chọn luôn mẫu đó và nạp preview
    // - Nếu có >= 2 mẫu: Ở Tab 2 sẽ cho chọn mẫu để thao tác
    if (docItems.length === 1) {
      setSelectedWordDoc(docItems[0]);
      loadTab2Doc(docItems[0]);
    } else {
      setSelectedWordDoc(null);
      setTab2DocContent({
        html_content: '',
        headings: [],
        preview_pdf_url: '',
        loading: false,
        error: null
      });
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    const targetDoc = selectedChildDoc || detailRecord;
    setInitialFormData({ ...targetDoc });
    setEditFormData({ ...targetDoc });
  };

  const EDITABLE_FIELDS = useMemo(() => [
    'document_name', 'source_code', 'management_group', 'classification',
    'suggested_doc_code', 'item_code', 'edition', 'code_of_conduct',
    'department_in_charge', 'attached_records_count', 'identified_forms_count',
    'document_level', 'issue_date', 'last_modified_date', 'created_by',
    'approver', 'notes', 'is_checked'
  ], []);

  const isFormDirty = useMemo(() => {
    if (!isEditing) return false;
    return EDITABLE_FIELDS.some(field => {
      const currentVal = (editFormData[field] ?? '').toString().trim();
      const initialVal = (initialFormData[field] ?? '').toString().trim();
      return currentVal !== initialVal;
    });
  }, [isEditing, editFormData, initialFormData, EDITABLE_FIELDS]);

  const handleRequestClose = () => {
    if (isCreateMode) {
      if (isFormDirty) {
        setPendingAction('close');
        setShowUnsavedWarning(true);
      } else {
        setIsCreateMode(false);
        setIsEditing(false);
        setShowDetailModal(false);
      }
      return;
    }
    if (isEditing && isFormDirty) {
      setPendingAction('close');
      setShowUnsavedWarning(true);
    } else {
      setIsEditing(false);
      setShowDetailModal(false);
    }
  };

  const handleCancelClick = () => {
    if (isCreateMode) {
      if (isFormDirty) {
        setPendingAction('close');
        setShowUnsavedWarning(true);
      } else {
        setIsCreateMode(false);
        setIsEditing(false);
        setShowDetailModal(false);
      }
      return;
    }
    if (isEditing) {
      if (isFormDirty) {
        setPendingAction('cancel_edit');
        setShowUnsavedWarning(true);
      } else {
        setIsEditing(false);
        setEditFormData({ ...detailRecord });
      }
    } else {
      setShowDetailModal(false);
    }
  };

  const handleTabChange = (newTab) => {
    if (newTab === viewerActiveTab) return;
    setViewerActiveTab(newTab);
  };

  const handleStayAndContinue = () => {
    setShowUnsavedWarning(false);
    setPendingAction(null);
  };

  const handleDiscardChanges = () => {
    setEditFormData({ ...initialFormData });
    setShowUnsavedWarning(false);
    if (isCreateMode) {
      setIsCreateMode(false);
      setIsEditing(false);
      setShowDetailModal(false);
      setPendingAction(null);
      return;
    }
    if (pendingAction === 'close') {
      setIsEditing(false);
      setShowDetailModal(false);
    } else if (pendingAction === 'cancel_edit') {
      setIsEditing(false);
    }
    setPendingAction(null);
  };

  // Document Conversion Handlers
  const handleStartConversion = async () => {
    if (!detailRecord?.id) return;
    if (!selectedWordDoc || !selectedWordDoc.exists) {
      toast.warning('Vui lòng chọn một tài liệu Word hợp lệ trước khi chuyển đổi.');
      return;
    }

    setConversionStatus('CONVERTING');
    setConversionError(null);
    setConversionState(prev => ({
      ...prev,
      loading: true,
      sourceDocBackup: selectedWordDoc,
      sourceContentBackup: { ...tab2DocContent }
    }));

    try {
      const userCustomCode = editFormData.suggested_doc_code;
      const targetDocCode = (userCustomCode && userCustomCode.startsWith('G7.') && userCustomCode !== detailRecord.suggested_doc_code)
        ? userCustomCode
        : undefined;

      const res = await api.post(`/iso-master-records/${detailRecord.id}/convert-document`, {
        source_path: selectedWordDoc.relative_path || selectedWordDoc.raw_path,
        target_doc_code: targetDocCode,
        target_edition: undefined
      });
      const data = res?.data || res;
      if (data && data.success) {
        setConversionStatus('DRAFT_READY');
        setConversionError(null);
        setConversionState({
          active: true,
          mode: 'after',
          loading: false,
          data: data,
          sourceDocBackup: selectedWordDoc,
          sourceContentBackup: { ...tab2DocContent }
        });

        loadTab2Doc({
          relative_path: data.draft_rel_path,
          file_name: data.draft_filename,
          exists: true,
          headings: data.headings || []
        });

        loadComparePages(data.source_rel_path, data.draft_rel_path);
        setShowCompareModal(true);

        toast.success('Chuyển đổi thành công! Bản sau chuyển đổi đã được sinh theo chuẩn Mẫu quy trình.docx.');
      } else {
        throw new Error(data?.message || 'Chuyển đổi không thành công');
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Lỗi khi chuyển đổi tài liệu';
      setConversionStatus('CONVERSION_FAILED');
      setConversionError(msg);
      setConversionState(prev => ({ ...prev, loading: false }));
      toast.error(msg);
    }
  };

  const handleRetryConversion = async () => {
    handleStartConversion();
  };

  const loadComparePages = async (sourceRel, draftRel) => {
    if (!sourceRel && !draftRel) return;
    setComparePages({ before: [], after: [], loading: true, loaded: false });
    try {
      const res = await api.get(`/iso-master-records/${detailRecord?.id || 0}/compare-pages`, {
        params: { source_path: sourceRel, draft_path: draftRel }
      });
      const data = res?.data || res;
      setComparePages({
        before: data.before_pages || [],
        after: data.after_pages || [],
        loading: false,
        loaded: true
      });
    } catch (err) {
      console.warn('Lỗi nạp compare pages:', err);
      setComparePages({ before: [], after: [], loading: false, loaded: false });
    }
  };

  const handleOpenCompareModal = () => {
    const data = conversionState.data || acceptedDraft;
    if (!data) {
      toast.info('Tài liệu chưa có bản chuyển đổi (Draft) để so sánh.');
      return;
    }
    loadComparePages(data.source_rel_path, data.draft_rel_path);
    setShowCompareModal(true);
  };

  const handleLeftScroll = (e) => {
    if (!compareSyncScroll || isSyncingScrollRef.current) return;
    const leftEl = e.currentTarget;
    const rightEl = compareRightPaneRef.current;
    if (!rightEl) return;
    isSyncingScrollRef.current = true;
    const maxScrollLeft = leftEl.scrollHeight - leftEl.clientHeight;
    const maxScrollRight = rightEl.scrollHeight - rightEl.clientHeight;
    if (maxScrollLeft > 0 && maxScrollRight > 0) {
      rightEl.scrollTop = Math.round((leftEl.scrollTop / maxScrollLeft) * maxScrollRight);
    }
    setTimeout(() => { isSyncingScrollRef.current = false; }, 40);
  };

  const handleRightScroll = (e) => {
    if (!compareSyncScroll || isSyncingScrollRef.current) return;
    const rightEl = e.currentTarget;
    const leftEl = compareLeftPaneRef.current;
    if (!leftEl) return;
    isSyncingScrollRef.current = true;
    const maxScrollLeft = leftEl.scrollHeight - leftEl.clientHeight;
    const maxScrollRight = rightEl.scrollHeight - rightEl.clientHeight;
    if (maxScrollLeft > 0 && maxScrollRight > 0) {
      leftEl.scrollTop = Math.round((rightEl.scrollTop / maxScrollRight) * maxScrollLeft);
    }
    setTimeout(() => { isSyncingScrollRef.current = false; }, 40);
  };

  const handleSwitchConversionTab = (mode) => {
    if (conversionState.mode === mode) return;
    setConversionState(prev => ({ ...prev, mode }));
    if (mode === 'before' && conversionState.sourceDocBackup) {
      loadTab2Doc(conversionState.sourceDocBackup);
    } else if (mode === 'after' && conversionState.data) {
      loadTab2Doc({
        relative_path: conversionState.data.draft_rel_path,
        file_name: conversionState.data.draft_filename,
        exists: true,
        headings: conversionState.data.headings || []
      });
    }
  };

  const handleCancelConversion = async () => {
    setShowCompareModal(false);
    setAcceptedDraft(null);
    setConversionState({
      active: false,
      mode: 'after',
      loading: false,
      data: null,
      sourceDocBackup: null,
      sourceContentBackup: null
    });
    setConversionStatus('IDLE');
    setConversionError(null);
    toast.info('Đã hủy bản chuyển đổi. Tệp tin gốc không bị thay đổi.');
  };

  const handleAcceptConversion = async () => {
    const targetData = conversionState.data || acceptedDraft;
    if (!targetData || !detailRecord?.id) return;
    try {
      await api.post(`/iso-master-records/${detailRecord.id}/accept-conversion`, {
        draft_path: targetData.draft_rel_path,
        draft_filename: targetData.draft_filename,
        source_path: targetData.source_rel_path,
        source_filename: targetData.source_filename,
        doc_code_new: targetData.doc_code_new,
        edition_new: targetData.edition_new,
        issue_date_new: targetData.issue_date_new
      });
      setAcceptedDraft(targetData);
      setConversionState(prev => ({ ...prev, active: false }));
      setShowCompareModal(false);
      setEditFormData(prev => ({
        ...prev,
        suggested_doc_code: targetData.doc_code_new,
        edition: targetData.edition_new,
        issue_date: targetData.issue_date_new || prev.issue_date
      }));
      setIsEditing(true);
      toast.success('Đã chấp nhận bản chuyển đổi làm bản làm việc mới!');
    } catch (err) {
      toast.error('Lỗi khi chấp nhận bản chuyển đổi: ' + (err?.response?.data?.detail || err.message));
    }
  };

  const handleDownloadWorkingDraft = () => {
    const draftPath = acceptedDraft?.draft_rel_path || conversionState.data?.draft_rel_path;
    const draftName = acceptedDraft?.draft_filename || conversionState.data?.draft_filename || 'Ban_lam_viec.docx';
    if (!draftPath) {
      toast.warning('Chưa có bản làm việc để tải về.');
      return;
    }
    const downloadUrl = `/api/v1/iso-master-records/file-stream?path=${encodeURIComponent(draftPath)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = draftName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenDirectWordEditor = async () => {
    const targetDoc = selectedWordDoc || (uniqueWordDocs.length > 0 ? uniqueWordDocs[0] : null);
    const draftPath = targetDoc?.clean_rel_path || targetDoc?.relative_path || targetDoc?.raw_path || targetDoc?.file_path || acceptedDraft?.draft_rel_path || conversionState.data?.draft_rel_path;
    if (!draftPath) {
      if (typeof toast?.warning === 'function') {
        toast.warning('Chưa có tài liệu Word để chỉnh sửa.');
      } else if (typeof toast === 'function') {
        toast('warning', 'Chưa có tài liệu Word để chỉnh sửa.');
      }
      return;
    }

    let toastId = null;
    if (typeof toast?.loading === 'function') {
      toastId = toast.loading('Đang nạp tài liệu Word vào trình soạn thảo...');
    } else if (typeof toast === 'function') {
      toast('info', 'Đang nạp tài liệu Word vào trình soạn thảo...');
    }

    try {
      const res = await api.get('/iso-master-records/file-preview/docx', {
        params: { path: draftPath }
      });
      const d = res?.data || res;
      const html = d.html || d.html_content || '<p>Tài liệu trống</p>';
      if (toastId && typeof toast?.dismiss === 'function') {
        toast.dismiss(toastId);
      }
      setEditorInitialHtml(html);
      setIsWordEditMode(true);
      setIsWordEditorDirty(false);
      setShowDirectWordEditorModal(true);
    } catch (err) {
      if (toastId && typeof toast?.dismiss === 'function') {
        toast.dismiss(toastId);
      }
      const errMsg = 'Không thể đọc cấu trúc tệp tin Word để chỉnh sửa: ' + (err?.response?.data?.detail || err.message);
      if (typeof toast?.error === 'function') {
        toast.error(errMsg);
      } else if (typeof toast === 'function') {
        toast('error', errMsg);
      }
    }
  };

  const handleCancelWordEdit = () => {
    if (isWordEditorDirty && !window.confirm('Bạn có thay đổi chưa lưu trong tài liệu Word. Bạn có chắc chắn muốn hủy?')) {
      return;
    }
    setIsWordEditMode(false);
    setShowDirectWordEditorModal(false);
    setIsWordEditorDirty(false);
  };

  const handleExecWordCmd = (command, value = null) => {
    document.execCommand(command, false, value);
    setIsWordEditorDirty(true);
    if (wordEditorRef.current) {
      wordEditorRef.current.focus();
    }
  };

  const handleInsertWordTable = () => {
    const rows = window.prompt('Nhập số dòng bảng:', '3');
    if (!rows) return;
    const cols = window.prompt('Nhập số cột bảng:', '3');
    if (!cols) return;
    const r = parseInt(rows, 10);
    const c = parseInt(cols, 10);
    if (isNaN(r) || !r || !c || r <= 0 || c <= 0) return;

    let tableHtml = '<table class="iso-word-table" style="width:100%; border-collapse:collapse; margin:12px 0;"><tbody>';
    for (let i = 0; i < r; i++) {
      tableHtml += '<tr>';
      for (let j = 0; j < c; j++) {
        tableHtml += '<td style="border:1px solid #333; padding:6px 10px;">&nbsp;</td>';
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p><br></p>';
    document.execCommand('insertHTML', false, tableHtml);
    setIsWordEditorDirty(true);
  };

  const handleSaveDirectWordContent = async () => {
    const targetDoc = selectedWordDoc || (uniqueWordDocs.length > 0 ? uniqueWordDocs[0] : null);
    const draftPath = targetDoc?.clean_rel_path || targetDoc?.relative_path || targetDoc?.raw_path || targetDoc?.file_path || acceptedDraft?.draft_rel_path || conversionState.data?.draft_rel_path;
    if (!draftPath || !wordEditorRef.current) return;

    const editedHtml = wordEditorRef.current.innerHTML;
    setSavingWordDirect(true);
    let toastId = null;
    if (typeof toast?.loading === 'function') {
      toastId = toast.loading('Đang lưu trực tiếp vào tệp tin Word...');
    } else if (typeof toast === 'function') {
      toast('info', 'Đang lưu trực tiếp vào tệp tin Word...');
    }

    try {
      const endpoint = detailRecord?.id
        ? `/iso-master-records/${detailRecord.id}/save-direct-word-content`
        : `/iso-master-records/save-direct-word-content`;
      const res = await api.post(endpoint, {
        draft_path: draftPath,
        html_content: editedHtml
      });
      const data = res?.data || res;
      if (data && data.success) {
        if (toastId && typeof toast?.update === 'function') {
          toast.update(toastId, {
            render: 'Đã lưu chỉnh sửa vào tài liệu Word thành công!',
            type: 'success',
            isLoading: false,
            autoClose: 2500
          });
        } else if (typeof toast?.success === 'function') {
          toast.success('Đã lưu chỉnh sửa vào tài liệu Word thành công!');
        } else if (typeof toast === 'function') {
          toast('success', 'Đã lưu chỉnh sửa vào tài liệu Word thành công!');
        }
        setIsWordEditorDirty(false);
        setIsWordEditMode(false);
        setShowDirectWordEditorModal(false);
        loadTab2Doc({
          relative_path: draftPath,
          clean_rel_path: draftPath,
          file_name: targetDoc?.file_name || acceptedDraft?.draft_filename || conversionState.data?.draft_filename,
          exists: true,
          headings: data.headings || []
        });
        if (detailRecord?.id) {
          fetchAuditLogs(detailRecord.id);
          fetchRealFilesStatus(detailRecord.id);
        }
      } else {
        throw new Error(data?.detail || 'Lưu tài liệu không thành công');
      }
    } catch (err) {
      const errMsg = 'Lỗi lưu tài liệu: ' + (err?.response?.data?.detail || err.message);
      if (toastId && typeof toast?.update === 'function') {
        toast.update(toastId, {
          render: errMsg,
          type: 'error',
          isLoading: false,
          autoClose: 3500
        });
      } else if (typeof toast?.error === 'function') {
        toast.error(errMsg);
      } else if (typeof toast === 'function') {
        toast('error', errMsg);
      }
    } finally {
      setSavingWordDirect(false);
    }
  };

  const handleUploadWordInTab2 = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingWord(true);
    const toastId = toast.loading(`Đang tải lên tài liệu "${file.name}"...`);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      const recordIdParam = (!isCreateMode && detailRecord?.id) ? `?record_id=${detailRecord.id}` : '';
      const res = await api.post(`/iso-master-records/upload-word${recordIdParam}`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = res?.data || res;
      if (data && data.success) {
        toast.update(toastId, {
          render: `Tải lên tài liệu "${file.name}" thành công!`,
          type: 'success',
          isLoading: false,
          autoClose: 2500
        });
        const newDoc = {
          file_name: data.file_name || file.name,
          relative_path: data.relative_path,
          raw_path: data.relative_path,
          ext: 'docx',
          exists: true
        };
        setSelectedWordDoc(newDoc);
        loadTab2Doc(newDoc);
        if (detailRecord?.id) fetchRealFilesStatus(detailRecord.id);
      }
    } catch (err) {
      toast.update(toastId, {
        render: 'Lỗi tải file Word: ' + (err?.response?.data?.detail || err.message),
        type: 'error',
        isLoading: false,
        autoClose: 3500
      });
    } finally {
      setUploadingWord(false);
      e.target.value = '';
    }
  };

  const handleUploadRelatedFileInTab4 = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRelated(true);
    const toastId = toast.loading(`Đang tải lên "${file.name}"...`);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      const recordIdParam = (!isCreateMode && detailRecord?.id) ? `?record_id=${detailRecord.id}` : '';
      const res = await api.post(`/iso-master-records/upload-related-file${recordIdParam}`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = res?.data || res;
      if (data && data.success) {
        toast.update(toastId, {
          render: `Tải lên "${file.name}" thành công!`,
          type: 'success',
          isLoading: false,
          autoClose: 2500
        });
        if (detailRecord?.id) fetchRealFilesStatus(detailRecord.id);
      }
    } catch (err) {
      toast.update(toastId, {
        render: 'Lỗi tải lên: ' + (err?.response?.data?.detail || err.message),
        type: 'error',
        isLoading: false,
        autoClose: 3500
      });
    } finally {
      setUploadingRelated(false);
      e.target.value = '';
    }
  };

  const handleToggleFileUsage = async (fileItem, newStatus) => {
    if (!detailRecord?.id || !fileItem) return;
    const relPath = fileItem.relative_path || fileItem.raw_path;
    try {
      const res = await api.post(`/iso-master-records/${detailRecord.id}/update-file-usage`, {
        relative_path: relPath,
        usage_status: newStatus
      });
      const data = res?.data || res;
      if (data && data.success) {
        toast.success(data.message || 'Cập nhật trạng thái sử dụng file thành công!');
        fetchRealFilesStatus(detailRecord.id);
        fetchAuditLogs(detailRecord.id);
      }
    } catch (err) {
      toast.error('Lỗi cập nhật trạng thái file: ' + (err?.response?.data?.detail || err.message));
    }
  };

  const handleConfirmUnlinkFile = async () => {
    const targetFile = confirmUnlinkModal.file;
    if (!targetFile || !detailRecord) return;
    setConfirmUnlinkModal(prev => ({ ...prev, loading: true }));
    try {
      const uName = loggedInUser?.full_name || loggedInUser?.username;
      const uDept = loggedInUser?.department_name || '';
      const res = await api.post(`/iso-master-records/${detailRecord.id}/unlink-file`, {
        file_path: targetFile.raw_path,
        actor_name: uName,
        actor_dept: uDept
      });
      const data = res?.data || res;
      if (data && data.success) {
        toast.success(`Đã xóa liên kết file "${targetFile.file_name}" khỏi hồ sơ.`);
        setConfirmUnlinkModal({ show: false, file: null, loading: false });
        setActiveFileMenuKey(null);
        fetchRealFilesStatus(detailRecord.id);
        fetchAuditLogs(detailRecord.id);
        fetchRecords();
      }
    } catch (err) {
      toast.error('Lỗi khi gỡ liên kết file: ' + (err?.response?.data?.detail || err.message));
      setConfirmUnlinkModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Preview & Download Modal
  const openDocumentViewer = async (file) => {
    if (!file) return;
    const targetPath = file.relative_path || file.raw_path;
    if (!targetPath) {
      toast.warning('Không tìm thấy đường dẫn tệp tin.');
      return;
    }

    const ext = (file.ext || file.extension || '').toLowerCase().replace('.', '');
    setDocViewerModal({
      show: true,
      file: file,
      docContent: null,
      excelData: null,
      activeSheetIdx: 0,
      selectedCell: { r: 0, c: 0, address: 'A1', val: '' },
      loading: true,
      error: null
    });

    try {
      if (ext === 'docx' || ext === 'doc') {
        const pdfRes = await api.get('/iso-master-records/word-pdf-preview', {
          params: { path: targetPath },
          responseType: 'blob'
        });
        const rawBlob = (pdfRes instanceof Blob) ? pdfRes : (pdfRes?.data instanceof Blob ? pdfRes.data : new Blob([pdfRes]));
        const pdfBlob = (rawBlob instanceof Blob && rawBlob.type === 'application/pdf') 
          ? rawBlob 
          : new Blob([rawBlob], { type: 'application/pdf' });
        const blobUrl = window.URL.createObjectURL(pdfBlob);
        setDocViewerModal(prev => ({
          ...prev,
          docContent: { preview_pdf_url: blobUrl, headings: file.headings || [] },
          loading: false
        }));
      } else if (ext === 'pdf') {
        const pdfRes = await api.get('/iso-master-records/file-stream', {
          params: { path: targetPath },
          responseType: 'blob'
        });
        const rawBlob = (pdfRes instanceof Blob) ? pdfRes : (pdfRes?.data instanceof Blob ? pdfRes.data : new Blob([pdfRes]));
        const pdfBlob = (rawBlob instanceof Blob && rawBlob.type === 'application/pdf') 
          ? rawBlob 
          : new Blob([rawBlob], { type: 'application/pdf' });
        const blobUrl = window.URL.createObjectURL(pdfBlob);
        setDocViewerModal(prev => ({
          ...prev,
          docContent: { preview_pdf_url: blobUrl, bookmarks: [] },
          loading: false
        }));
      } else if (ext === 'xlsx' || ext === 'xls') {
        const res = await api.get('/iso-master-records/file-preview/excel', {
          params: { path: targetPath }
        });
        const data = res?.data || res;
        setDocViewerModal(prev => ({
          ...prev,
          excelData: data,
          loading: false
        }));
      } else {
        setDocViewerModal(prev => ({
          ...prev,
          loading: false,
          error: `Định dạng .${ext} chưa hỗ trợ xem trực tiếp.`
        }));
      }
    } catch (err) {
      setDocViewerModal(prev => ({
        ...prev,
        loading: false,
        error: 'Lỗi tải bản xem trước: ' + err.message
      }));
    }
  };

  const closeDocViewerModal = () => {
    if (docViewerModal.docContent?.preview_pdf_url && docViewerModal.docContent.preview_pdf_url.startsWith('blob:')) {
      window.URL.revokeObjectURL(docViewerModal.docContent.preview_pdf_url);
    }
    setDocViewerModal({
      show: false,
      file: null,
      docContent: null,
      excelData: null,
      activeSheetIdx: 0,
      selectedCell: { r: 0, c: 0, address: 'A1', val: '' },
      loading: false,
      error: null
    });
  };

  const handleDownloadFile = async (file) => {
    if (downloadingFile) return;
    const targetPath = file?.relative_path || file?.raw_path;
    const fileName = file?.file_name || 'tai_lieu_iso';
    if (!targetPath) {
      toast.warning('Tệp tin này chưa có đường dẫn tệp tin thực tế để tải về.');
      return;
    }
    setDownloadingFile(true);
    const toastId = toast.loading(`Đang tải xuống ${fileName}...`);
    try {
      const res = await api.get('/iso-master-records/file-stream', {
        params: { path: targetPath, download: true },
        responseType: 'blob'
      });
      const rawBlob = (res instanceof Blob) ? res : (res?.data instanceof Blob ? res.data : new Blob([res]));
      const url = window.URL.createObjectURL(rawBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      toast.update(toastId, {
        render: `Tải xuống thành công: ${fileName}`,
        type: 'success',
        isLoading: false,
        autoClose: 2500
      });
    } catch (err) {
      toast.update(toastId, {
        render: 'Lỗi tải file: ' + err.message,
        type: 'error',
        isLoading: false,
        autoClose: 3500
      });
    } finally {
      setDownloadingFile(false);
    }
  };

  // Save draft / update record
  const handleSaveDraft = async () => {
    const currentData = isEditing ? editFormData : detailRecord;
    const docName = (currentData?.document_name || '').trim();
    if (!docName) {
      toast.warning('Vui lòng nhập Tên hồ sơ trước khi lưu.');
      return;
    }
    setActionLoading(true);
    try {
      const nowStr = new Date().toLocaleDateString('vi-VN');
      const uName = loggedInUser?.full_name || loggedInUser?.username;
      const uDept = loggedInUser?.department_name || '';

      if (acceptedDraft) {
        const saveRes = await api.post(`/iso-master-records/${detailRecord.id}/save-converted-document`, {
          draft_path: acceptedDraft.draft_rel_path,
          source_path: acceptedDraft.source_rel_path,
          target_doc_code: currentData.suggested_doc_code || acceptedDraft.doc_code_new,
          target_edition: currentData.edition || acceptedDraft.edition_new,
          target_issue_date: currentData.issue_date || acceptedDraft.issue_date_new,
          document_name: docName
        });
        toast.success('Đã lưu chính thức phiên bản mới sau chuyển đổi thành công!');
        setAcceptedDraft(null);
        setIsEditing(false);
        fetchRecords();
        fetchRealFilesStatus(detailRecord.id);
        fetchAuditLogs(detailRecord.id);
        return;
      }

      // Đồng bộ source_link thực tế từ file đang chọn hoặc danh sách tệp đính kèm
      const chosenPathDraft = selectedWordDoc?.clean_rel_path || selectedWordDoc?.relative_path;
      const allFilesDraft = (realFilesData?.files || realFilesData?.word_docs || []).map(f => f.clean_rel_path || f.relative_path).filter(Boolean);
      let synchedSourceLinkDraft = currentData.source_link || '';
      if (chosenPathDraft || allFilesDraft.length > 0) {
        const reordered = [chosenPathDraft, ...allFilesDraft.filter(p => p !== chosenPathDraft)].filter(Boolean);
        if (reordered.length > 0) {
          synchedSourceLinkDraft = reordered.join('\n');
        }
      }

      const payload = {
        ...currentData,
        document_name: docName,
        source_link: synchedSourceLinkDraft,
        source_status: 'Dự thảo',
        action_chosen: 'Lưu nháp',
        action_type: 'SAVE_DRAFT',
        action_label: 'Lưu nháp hồ sơ',
        actor_name: uName,
        actor_dept: uDept,
        last_modified_date: nowStr
      };

      if (isCreateMode) {
        if (!payload.department_in_charge || !String(payload.department_in_charge).trim()) {
          payload.department_in_charge = loggedInUser?.department_name || 'Hồ sơ chung';
        }
        if (!payload.management_group || !String(payload.management_group).trim()) {
          payload.management_group = 'Hồ sơ';
        }
        if (!payload.classification || !String(payload.classification).trim()) {
          payload.classification = 'HỒ SƠ';
        }
        if (!payload.source_status || !String(payload.source_status).trim()) {
          payload.source_status = 'Dự thảo';
        }
        const res = await api.post('/iso-master-records/', payload);
        const newRecord = res?.data || res;
        toast.success('Đã tạo mới và lưu nháp hồ sơ thành công!');
        setIsCreateMode(false);
        setIsEditing(false);
        setShowDetailModal(false);
        setDetailRecord(newRecord);
        setSelectedChildDoc(newRecord);
        setInitialFormData(newRecord);
        setEditFormData(newRecord);
        fetchRecords();
        fetchFilterOptions();
      } else {
        const targetRecordId = detailRecord?.id || selectedChildDoc?.source_row_id || selectedChildDoc?.id;
        await api.put(`/iso-master-records/${targetRecordId}`, payload);
        const updated = { ...(selectedChildDoc || detailRecord), ...payload };
        setSelectedChildDoc(updated);
        setInitialFormData({ ...updated });
        setEditFormData({ ...updated });
        setIsEditing(false);
        setShowDetailModal(false);
        toast.success('Đã cập nhật thông tin hồ sơ thành công!');
        fetchRecords();
        if (targetRecordId) fetchAuditLogs(targetRecordId);
      }
    } catch (err) {
      toast.error('Không thể lưu: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Submit approval
  const handleSubmitApproval = async () => {
    const currentData = isEditing ? editFormData : detailRecord;
    const docName = (currentData?.document_name || '').trim();
    if (!docName) {
      toast.warning('Vui lòng nhập Tên hồ sơ trước khi gửi duyệt.');
      return;
    }
    setActionLoading(true);
    try {
      const nowStr = new Date().toLocaleDateString('vi-VN');
      const uName = loggedInUser?.full_name || loggedInUser?.username;
      const uDept = loggedInUser?.department_name || '';

      // Đồng bộ source_link thực tế từ file đang chọn hoặc danh sách tệp đính kèm
      const chosenPathSubmit = selectedWordDoc?.clean_rel_path || selectedWordDoc?.relative_path;
      const allFilesSubmit = (realFilesData?.files || realFilesData?.word_docs || []).map(f => f.clean_rel_path || f.relative_path).filter(Boolean);
      let synchedSourceLinkSubmit = currentData.source_link || '';
      if (chosenPathSubmit || allFilesSubmit.length > 0) {
        const reordered = [chosenPathSubmit, ...allFilesSubmit.filter(p => p !== chosenPathSubmit)].filter(Boolean);
        if (reordered.length > 0) {
          synchedSourceLinkSubmit = reordered.join('\n');
        }
      }

      const payload = {
        ...currentData,
        document_name: docName,
        source_link: synchedSourceLinkSubmit,
        source_status: 'Chờ duyệt',
        action_chosen: 'Gửi duyệt',
        action_type: 'SUBMIT_APPROVAL',
        action_label: 'Gửi duyệt hồ sơ',
        actor_name: uName,
        actor_dept: uDept,
        last_modified_date: nowStr
      };

      if (isCreateMode) {
        if (!payload.department_in_charge || !String(payload.department_in_charge).trim()) {
          payload.department_in_charge = loggedInUser?.department_name || 'Hồ sơ chung';
        }
        if (!payload.management_group || !String(payload.management_group).trim()) {
          payload.management_group = 'Hồ sơ';
        }
        if (!payload.classification || !String(payload.classification).trim()) {
          payload.classification = 'HỒ SƠ';
        }
        if (!payload.source_status || !String(payload.source_status).trim()) {
          payload.source_status = 'Chờ duyệt';
        }
        const res = await api.post('/iso-master-records/', payload);
        const newRecord = res?.data || res;
        toast.success('Đã tạo mới và gửi hồ sơ đi phê duyệt thành công!');
        setIsCreateMode(false);
        setIsEditing(false);
        setShowDetailModal(false);
        setDetailRecord(newRecord);
        setSelectedChildDoc(newRecord);
        setInitialFormData(newRecord);
        setEditFormData(newRecord);
        fetchRecords();
        fetchFilterOptions();
        if (newRecord?.id) fetchAuditLogs(newRecord.id);
      } else {
        const targetRecordId = detailRecord?.id || selectedChildDoc?.source_row_id || selectedChildDoc?.id;
        if (!targetRecordId) {
          toast.warning('Không tìm thấy mã hồ sơ để gửi duyệt.');
          setActionLoading(false);
          return;
        }
        await api.put(`/iso-master-records/${targetRecordId}`, payload);
        const updated = { ...(selectedChildDoc || detailRecord), ...payload };
        setSelectedChildDoc(updated);
        setInitialFormData({ ...updated });
        setEditFormData({ ...updated });
        setIsEditing(false);
        setShowDetailModal(false);
        toast.success('Đã gửi hồ sơ đi phê duyệt thành công!');
        fetchRecords();
        if (targetRecordId) fetchAuditLogs(targetRecordId);
      }
    } catch (err) {
      let errMsg = err?.response?.data?.detail;
      if (Array.isArray(errMsg)) {
        errMsg = errMsg.map(e => (typeof e === 'object' ? (e.msg || JSON.stringify(e)) : e)).join(', ');
      } else if (typeof errMsg === 'object') {
        errMsg = JSON.stringify(errMsg);
      }
      errMsg = errMsg || err.message || 'Lỗi không xác định';
      toast.error('Không thể gửi duyệt: ' + errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Handlers
  const handleDeleteConfirm = async () => {
    try {
      if (confirmDelete.isBatch) {
        await api.post('/iso-master-records/batch-delete', { ids: selectedIds });
        toast.success(`Đã xóa ${selectedIds.length} bản ghi thành công.`);
        setSelectedIds([]);
      } else if (confirmDelete.id) {
        await api.delete(`/iso-master-records/${confirmDelete.id}`);
        toast.success('Đã xóa bộ tài liệu thành công.');
        if (currentFolder && (currentFolder.id === confirmDelete.id || currentFolder.id === Number(confirmDelete.id))) {
          handleBackToFolders();
        }
      }
      setConfirmDelete({ show: false, id: null, isBatch: false, name: '' });
      fetchRecords();
      fetchFilterOptions();
    } catch (err) {
      toast.error('Có lỗi xảy ra khi xóa bộ tài liệu: ' + (err?.response?.data?.detail || err.message));
    }
  };

  // Excel Upload Handler
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.warning('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
      return;
    }
    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', uploadFile);
      const res = await api.post(`/iso-master-records/upload-excel?mode=${uploadMode}`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res && res.success) {
        toast.success(res.message || 'Nhập dữ liệu Excel thành công!');
        setShowUploadModal(false);
        setUploadFile(null);
        fetchRecords();
        fetchFilterOptions();
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Lỗi khi nhập file Excel.');
    } finally {
      setUploading(false);
    }
  };

  // Excel Export Handlers
  const handleExportExcel = (mode = 'current') => {
    setIsExportOpen(false);
    const params = new URLSearchParams();
    if (mode === 'current') {
      if (search.trim()) params.append('search', search.trim());
      if (classificationFilter) params.append('classification', classificationFilter);
      if (groupFilter) params.append('management_group', groupFilter);
      if (checkedFilter !== '') params.append('is_checked', checkedFilter);
      if (paFilter) params.append('code_of_conduct', paFilter);
      if (deptFilter) params.append('department', deptFilter);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    window.open(`${api.defaults.baseURL || '/api/v1'}/iso-master-records/export-excel${qs}`, '_blank');
  };

  return (
    <>
      {/* 1. Main Table Coordinator / Child Documents Table */}
      {(routeFolderId || currentFolder) ? (
        <ISOMasterRecordChildDocsTable
          folder={currentFolder || { id: routeFolderId, document_name: 'Đang tải...' }}
          children={childDocs}
          loading={loadingChildren}
          onBack={handleBackToFolders}
          onOpenAddDocs={() => setIsDocSelectorOpen(true)}
          onOpenEditFolder={handleStartEditFolder}
          onRefresh={() => fetchChildren(routeFolderId || currentFolder?.id)}
          onPreviewDoc={(doc, idx) => {
            setPreviewDoc(doc);
            setPreviewIndex(idx);
            setIsPreviewModalOpen(true);
          }}
        />
      ) : (
        <ISOMasterRecordTable
          records={records}
          onSelectFolder={handleSelectFolder}
        loading={loading}
        totalCount={totalCount}
        totalPages={totalPages}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        stats={stats}
        search={search}
        setSearch={setSearch}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortDir={sortDir}
        setSortDir={setSortDir}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        classificationFilter={classificationFilter}
        setClassificationFilter={setClassificationFilter}
        groupFilter={groupFilter}
        setGroupFilter={setGroupFilter}
        codeFilter={codeFilter}
        setCodeFilter={setCodeFilter}
        deptFilter={deptFilter}
        setDeptFilter={setDeptFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        paFilter={paFilter}
        setPaFilter={setPaFilter}
        docNameFilter={docNameFilter}
        setDocNameFilter={setDocNameFilter}
        editionFilter={editionFilter}
        setEditionFilter={setEditionFilter}
        managementDocFilter={managementDocFilter}
        setManagementDocFilter={setManagementDocFilter}
        notesFilter={notesFilter}
        setNotesFilter={setNotesFilter}
        resetAllFilters={resetAllFilters}
        activeFiltersCount={activeFilters.length}
        filterOptions={filterOptions}
        activeDropdown={activeDropdown}
        setActiveDropdown={setActiveDropdown}
        visibleColumns={visibleColumns}
        setVisibleColumns={setVisibleColumns}
        handleToggleColumn={handleToggleColumn}
        handleShowAllColumns={handleShowAllColumns}
        isColumnsMenuOpen={isColumnsMenuOpen}
        setIsColumnsMenuOpen={setIsColumnsMenuOpen}
        handleOpenDetailModal={handleOpenDetailModal}
        openCreateModal={openCreateModal}
        openUploadModal={() => setShowUploadModal(true)}
        handleExportExcel={handleExportExcel}
        onOpenEditFolder={handleStartEditFolder}
        handleSingleDelete={(recOrId) => setConfirmDelete({ show: true, id: typeof recOrId === 'object' && recOrId !== null ? recOrId.id : recOrId, name: typeof recOrId === 'object' && recOrId !== null ? recOrId.document_name : '', isBatch: false })}
        activeNoteModal={activeNoteModal}
        setActiveNoteModal={setActiveNoteModal}
        actionMenuId={actionMenuId}
        setActionMenuId={setActionMenuId}
        isExportOpen={isExportOpen}
        setIsExportOpen={setIsExportOpen}
        isOtherOpen={isOtherOpen}
        setIsOtherOpen={setIsOtherOpen}
      />
      )}

      {/* 2. Detail 5-Tab Modal */}
      <ISOMasterRecordDetailModal
        showDetailModal={showDetailModal}
        detailRecord={detailRecord}
        isCreateMode={isCreateMode}
        onSelectProcess={handleSelectProcess}
        selectedChildDoc={selectedChildDoc}
        groupChildDocs={groupChildDocs}
        handleSelectChildDoc={handleSelectChildDoc}
        isEditing={isEditing}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        isFormDirty={isFormDirty}
        formatDateOnly={formatDateOnly}
        linkedDocData={linkedDocData}
        actionLoading={actionLoading}
        handleStartEdit={handleStartEdit}
        handleRequestClose={handleRequestClose}
        handleCancelClick={handleCancelClick}
        handleSaveDraft={handleSaveDraft}
        handleSubmitApproval={handleSubmitApproval}
        acceptedDraft={acceptedDraft}
        viewerActiveTab={viewerActiveTab}
        setViewerActiveTab={setViewerActiveTab}
        handleTabChange={handleTabChange}
        showUnsavedWarning={showUnsavedWarning}
        handleStayAndContinue={handleStayAndContinue}
        handleDiscardChanges={handleDiscardChanges}
        
        // Tab 2 props
        selectedWordDoc={selectedWordDoc}
        setSelectedWordDoc={setSelectedWordDoc}
        uniqueWordDocs={uniqueWordDocs}
        filteredWordDocs={filteredWordDocs}
        docSearchTerm={docSearchTerm}
        setDocSearchTerm={setDocSearchTerm}
        docDropdownOpen={docDropdownOpen}
        setDocDropdownOpen={setDocDropdownOpen}
        hasDuplicateDocName={hasDuplicateDocName}
        getDocFolderContext={getDocFolderContext}
        loadTab2Doc={loadTab2Doc}
        loadingRealFiles={loadingRealFiles}
        docViewerZoom={docViewerZoom}
        setDocViewerZoom={setDocViewerZoom}
        isWordEditMode={isWordEditMode}
        setIsWordEditMode={setIsWordEditMode}
        isWordEditorDirty={isWordEditorDirty}
        setIsWordEditorDirty={setIsWordEditorDirty}
        savingWordDirect={savingWordDirect}
        handleCancelWordEdit={handleCancelWordEdit}
        handleSaveDirectWordContent={handleSaveDirectWordContent}
        wordEditorRef={wordEditorRef}
        wordEditorFont={wordEditorFont}
        setWordEditorFont={setWordEditorFont}
        wordEditorFontSize={wordEditorFontSize}
        setWordEditorFontSize={setWordEditorFontSize}
        wordEditorStyle={wordEditorStyle}
        setWordEditorStyle={setWordEditorStyle}
        wordEditorZoom={wordEditorZoom}
        handleExecWordCmd={handleExecWordCmd}
        handleInsertTable={handleInsertWordTable}
        conversionState={conversionState}
        conversionStatus={conversionStatus}
        conversionError={conversionError}
        handleSwitchConversionTab={handleSwitchConversionTab}
        handleStartConversion={handleStartConversion}
        handleRetryConversion={handleRetryConversion}
        handleAcceptConversion={handleAcceptConversion}
        handleCancelConversion={handleCancelConversion}
        handleOpenCompareModal={handleOpenCompareModal}
        handleOpenDirectWordEditor={handleOpenDirectWordEditor}
        handleDownloadWorkingDraft={handleDownloadWorkingDraft}
        wordInputRef={wordInputRef}
        handleUploadWordInTab2={handleUploadWordInTab2}
        handleDownloadFile={handleDownloadFile}
        downloadingFile={downloadingFile}
        uploadingWord={uploadingWord}
        tab2DocContent={tab2DocContent}
        activeHeadingId={activeHeadingId}
        scrollToHeading={(id) => {
          setActiveHeadingId(id);
          const targetEl = document.getElementById(id);
          if (!targetEl) return;
          const container = targetEl.closest('.iso-word-html-viewport') || targetEl.closest('.iso-viewer-doc-pane') || targetEl.closest('.iso-pdf-viewport');
          if (container) {
            const containerRect = container.getBoundingClientRect();
            const targetRect = targetEl.getBoundingClientRect();
            const scrollOffset = targetRect.top - containerRect.top + container.scrollTop - 24;
            container.scrollTo({
              top: Math.max(0, scrollOffset),
              behavior: 'smooth'
            });
          } else {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }}
        toast={toast}
        
        // Tab 3 props
        auditLogs={auditLogs}
        loadingAuditLogs={loadingAuditLogs}
        fetchAuditLogs={fetchAuditLogs}
        
        // Tab 4 props
        realFilesData={realFilesData}
        handleToggleFileUsage={handleToggleFileUsage}
        handleUnlinkFile={(file) => setConfirmUnlinkModal({ show: true, file, loading: false })}
        handleUploadRelatedFileInTab4={handleUploadRelatedFileInTab4}
        uploadingRelated={uploadingRelated}
        relatedFileInputRef={relatedFileInputRef}
        fileSearchText={fileSearchText}
        setFileSearchText={setFileSearchText}
        fileTypeFilter={fileTypeFilter}
        setFileTypeFilter={setFileTypeFilter}
        expandedChildDocId={expandedChildDocId}
        setExpandedChildDocId={setExpandedChildDocId}
        activeFileMenuKey={activeFileMenuKey}
        setActiveFileMenuKey={setActiveFileMenuKey}
        openDocumentViewer={openDocumentViewer}
      />

      {/* 3. Upload Excel Modal */}
      <ISOImportExcelModal
        show={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        uploadFile={uploadFile}
        setUploadFile={setUploadFile}
        uploadMode={uploadMode}
        setUploadMode={setUploadMode}
        uploading={uploading}
        onSubmit={handleUploadSubmit}
      />

      {/* 4. Document Viewer Modal (PDF / Word COM / Excel Spreadsheet) */}
      <ISODocumentViewerModal
        docViewerModal={docViewerModal}
        setDocViewerModal={setDocViewerModal}
        docViewerZoom={docViewerZoom}
        setDocViewerZoom={setDocViewerZoom}
        handleDownloadFile={handleDownloadFile}
        downloadingFile={downloadingFile}
        openDocumentViewer={openDocumentViewer}
        closeDocViewerModal={closeDocViewerModal}
      />

      {/* 5. Before / After Comparison Modal */}
      <ISODocumentCompareModal
        showCompareModal={showCompareModal}
        setShowCompareModal={setShowCompareModal}
        conversionState={conversionState}
        acceptedDraft={acceptedDraft}
        detailRecord={detailRecord}
        selectedWordDoc={selectedWordDoc}
        compareZoom={compareZoom}
        setCompareZoom={setCompareZoom}
        compareSyncScroll={compareSyncScroll}
        setCompareSyncScroll={setCompareSyncScroll}
        compareLeftPaneRef={compareLeftPaneRef}
        compareRightPaneRef={compareRightPaneRef}
        handleLeftScroll={handleLeftScroll}
        handleRightScroll={handleRightScroll}
        comparePages={comparePages}
        handleDownloadFile={handleDownloadFile}
        handleDownloadWorkingDraft={handleDownloadWorkingDraft}
        handleCancelConversion={handleCancelConversion}
        handleAcceptConversion={handleAcceptConversion}
        handleOpenWordEditModal={handleOpenDirectWordEditor}
      />

      {/* 6. Direct Word Editor Modal */}
      <ISODirectWordEditorModal
        showDirectWordEditorModal={showDirectWordEditorModal}
        handleCloseDirectWordEditor={handleCancelWordEdit}
        savingWordDirect={savingWordDirect}
        handleSaveDirectWordContent={handleSaveDirectWordContent}
        acceptedDraft={acceptedDraft}
        conversionState={conversionState}
        selectedWordDoc={selectedWordDoc}
        isWordEditorDirty={isWordEditorDirty}
        setIsWordEditorDirty={setIsWordEditorDirty}
        wordEditorRef={wordEditorRef}
        handleExecWordCmd={handleExecWordCmd}
        wordEditorFont={wordEditorFont}
        setWordEditorFont={setWordEditorFont}
        wordEditorFontSize={wordEditorFontSize}
        setWordEditorFontSize={setWordEditorFontSize}
        wordEditorStyle={wordEditorStyle}
        setWordEditorStyle={setWordEditorStyle}
        handleInsertWordTable={handleInsertWordTable}
        wordEditorZoom={wordEditorZoom}
        setWordEditorZoom={setWordEditorZoom}
        initialHtml={editorInitialHtml}
      />

            {/* Dedicated Folder Edit Modal */}
      {editFolderModal.show && (
        <div className="iso-modal-overlay" onClick={() => !editFolderModal.loading && setEditFolderModal(prev => ({ ...prev, show: false }))}>
          <div className="iso-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '92vw', borderRadius: '14px', overflow: 'hidden' }}>
            <div className="iso-modal-header" style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.25rem' }}>📁</span>
                <h3 className="iso-modal-title" style={{ color: '#7B5233', fontSize: '1.05rem', fontWeight: '700', margin: 0 }}>
                  Chỉnh sửa thông tin bộ tài liệu
                </h3>
              </div>
              <button 
                type="button"
                disabled={editFolderModal.loading}
                onClick={() => setEditFolderModal(prev => ({ ...prev, show: false }))}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="iso-modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#4B5563', marginBottom: '6px' }}>
                  TÊN BỘ TÀI LIỆU <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  className="iso-form-input"
                  value={editFolderModal.name}
                  onChange={(e) => setEditFolderModal(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nhập tên bộ tài liệu..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.90rem', boxSizing: 'border-box' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveEditFolder();
                    }
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#4B5563', marginBottom: '6px' }}>
                    PHÒNG BAN PHỤ TRÁCH
                  </label>
                  <input
                    type="text"
                    className="iso-form-input"
                    value={editFolderModal.dept}
                    onChange={(e) => setEditFolderModal(prev => ({ ...prev, dept: e.target.value }))}
                    placeholder="VD: Ban Giám Đốc..."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.90rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#4B5563', marginBottom: '6px' }}>
                    TRẠNG THÁI
                  </label>
                  <select
                    className="iso-form-input"
                    value={editFolderModal.status}
                    onChange={(e) => setEditFolderModal(prev => ({ ...prev, status: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.90rem', backgroundColor: '#FFFFFF', boxSizing: 'border-box', cursor: 'pointer' }}
                  >
                    <option value="Dự thảo">Dự thảo</option>
                    <option value="Chờ duyệt">Chờ duyệt</option>
                    <option value="Ban hành">Ban hành</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#4B5563', marginBottom: '6px' }}>
                  MÔ TẢ / GHI CHÚ
                </label>
                <textarea
                  className="iso-form-textarea"
                  value={editFolderModal.notes}
                  onChange={(e) => setEditFolderModal(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Nhập mô tả bộ tài liệu..."
                  rows={4}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.88rem', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="iso-modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button" 
                className="iso-page-btn" 
                disabled={editFolderModal.loading}
                onClick={() => setEditFolderModal(prev => ({ ...prev, show: false }))}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', cursor: 'pointer', fontWeight: '600' }}
              >
                Hủy
              </button>
              <button 
                type="button" 
                disabled={editFolderModal.loading || !editFolderModal.name.trim()}
                onClick={handleSaveEditFolder}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#7B5233',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: editFolderModal.loading || !editFolderModal.name.trim() ? 'not-allowed' : 'pointer',
                  opacity: editFolderModal.loading || !editFolderModal.name.trim() ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 4px rgba(123, 82, 51, 0.2)'
                }}
              >
                {editFolderModal.loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Confirm Delete Modal */}
      {confirmDelete.show && (
        <div className="iso-modal-overlay" onClick={() => setConfirmDelete({ show: false, id: null, isBatch: false })}>
          <div className="iso-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="iso-modal-header" style={{ backgroundColor: '#FEE2E2', borderBottomColor: '#FECACA' }}>
              <h3 className="iso-modal-title" style={{ color: '#991B1B' }}>
                <AlertCircle size={18} />
                <span>Xác nhận xóa</span>
              </h3>
              <button 
                type="button"
                onClick={() => setConfirmDelete({ show: false, id: null, isBatch: false })}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="iso-modal-body">
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#374151' }}>
                {confirmDelete.isBatch 
                  ? `Bạn có chắc chắn muốn xóa ${selectedIds.length} mục đã chọn không?` 
                  : `Bạn có chắc chắn muốn xóa bộ tài liệu "${confirmDelete.name || 'này'}" không?`}
              </p>
            </div>
            <div className="iso-modal-footer">
              <button 
                type="button" 
                className="iso-page-btn" 
                onClick={() => setConfirmDelete({ show: false, id: null, isBatch: false })}
              >
                Hủy
              </button>
              <button 
                type="button" 
                style={{
                  height: '34px',
                  padding: '0 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
                onClick={handleDeleteConfirm}
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Confirm Unlink File Modal */}
      {confirmUnlinkModal.show && (
        <div 
          className="iso-modal-overlay" 
          style={{ zIndex: 2300 }}
          onClick={() => !confirmUnlinkModal.loading && setConfirmUnlinkModal({ show: false, file: null, loading: false })}
        >
          <div 
            className="iso-modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '440px', borderRadius: '12px', border: '1px solid #FECACA' }}
          >
            <div className="iso-modal-header" style={{ backgroundColor: '#FEE2E2', borderBottomColor: '#FECACA' }}>
              <h3 className="iso-modal-title" style={{ color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} />
                <span>Xác nhận xóa liên kết tệp tin</span>
              </h3>
              <button 
                type="button"
                onClick={() => !confirmUnlinkModal.loading && setConfirmUnlinkModal({ show: false, file: null, loading: false })}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="iso-modal-body" style={{ padding: '20px 24px' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.92rem', color: '#1F2937', fontWeight: '600' }}>
                Bạn có chắc chắn muốn xóa liên kết tệp tin này khỏi hồ sơ?
              </p>
              <div style={{ 
                padding: '10px 12px', 
                backgroundColor: '#F8FAFC', 
                borderRadius: '6px', 
                border: '1px solid #E2E8F0', 
                fontSize: '0.82rem',
                color: '#334155',
                fontFamily: 'monospace',
                wordBreak: 'break-all'
              }}>
                {confirmUnlinkModal.file?.file_name}
              </div>
              <div style={{ marginTop: '12px', fontSize: '0.78rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={14} color="#059669" />
                <span>Lưu ý: Thao tác này chỉ xóa liên kết trong hệ thống, <b>không xóa file vật lý</b> trong thư mục <i>HỒ SƠ VINA G7</i>.</span>
              </div>
            </div>
            <div className="iso-modal-footer" style={{ padding: '12px 20px', gap: '10px', justifyContent: 'flex-end', backgroundColor: '#FAF6F0' }}>
              <button 
                type="button" 
                className="iso-viewer-footer-btn btn-cancel"
                disabled={confirmUnlinkModal.loading}
                onClick={() => setConfirmUnlinkModal({ show: false, file: null, loading: false })}
              >
                Hủy
              </button>
              <button 
                type="button" 
                className="iso-viewer-footer-btn"
                disabled={confirmUnlinkModal.loading}
                style={{ 
                  backgroundColor: '#DC2626', 
                  borderColor: '#DC2626', 
                  color: '#FFFFFF' 
                }}
                onClick={handleConfirmUnlinkFile}
              >
                {confirmUnlinkModal.loading ? 'Đang xóa liên kết...' : 'Xóa liên kết'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. View Note Modal */}
      {activeNoteModal && (
        <div className="iso-modal-overlay" onClick={() => setActiveNoteModal(null)} style={{ zIndex: 1200 }}>
          <div className="iso-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px', width: '90%' }}>
            <div className="iso-modal-header" style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="iso-modal-title" style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={16} color="#7B5233" />
                <span>{activeNoteModal.title || 'Nội dung ghi chú'}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setActiveNoteModal(null)} 
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '18px', fontSize: '0.88rem', lineHeight: '1.6', color: '#334155', maxHeight: '420px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
              {activeNoteModal.content}
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#F8FAFC' }}>
              <button 
                type="button" 
                className="iso-btn-brown" 
                onClick={() => setActiveNoteModal(null)} 
                style={{ padding: '6px 18px', fontSize: '0.84rem' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 8. Modal chọn tài liệu vào bộ (Checkbox checklist) */}
      <ISOMasterRecordDocSelectorModal
        isOpen={isDocSelectorOpen}
        onClose={() => setIsDocSelectorOpen(false)}
        folder={currentFolder || { id: routeFolderId }}
        currentAssignedIds={childDocs.map(c => c.id)}
        onSaved={() => {
          const activeId = routeFolderId || currentFolder?.id;
          if (activeId) {
            fetchChildren(activeId);
          }
          fetchRecords();
        }}
      />

      {/* 9. Modal xem trước tài liệu / quy trình */}
      <ISOProcessPreviewModal
        isOpen={isPreviewModalOpen}
        doc={previewDoc}
        docList={childDocs}
        currentIndex={previewIndex}
        onSelectIndex={(idx) => {
          setPreviewIndex(idx);
          setPreviewDoc(childDocs[idx]);
        }}
        onClose={() => {
          setIsPreviewModalOpen(false);
          setPreviewDoc(null);
        }}
      />
    </>
  );
};

export default ISOMasterRecordListView;
