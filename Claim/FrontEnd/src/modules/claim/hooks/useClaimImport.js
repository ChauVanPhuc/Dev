import { useState, useEffect, useRef } from 'react';
import claimService from '../services/claim.service';
import { API_ROOT } from '../utils/claimHelpers';
import useUiStore from '@/shared/store/uiStore';

export const useClaimImport = ({ fetchClaims, setLoading, showModal }) => {
  const { setClaimIngestionProgress, setClaimSuccessSummary, setClaimImportError } = useUiStore();

  // Dropdown states & refs
  const [isOtherDropdownOpen, setIsOtherDropdownOpen] = useState(false);
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const pdfInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // PDF Archive states
  const [isPdfFolderModalOpen, setIsPdfFolderModalOpen] = useState(false);
  const [importedPdfs, setImportedPdfs] = useState([]);
  const [selectedPdfForPreview, setSelectedPdfForPreview] = useState(null);
  const [pdfActionMenuId, setPdfActionMenuId] = useState(null);
  const [pdfSearchQuery, setPdfSearchQuery] = useState('');

  // Latest batch highlight
  const [latestImport, setLatestImport] = useState(null);
  const [highlightBatchId, setHighlightBatchId] = useState(null);

  const fetchImportedPdfs = async () => {
    try {
      const res = await claimService.getImportedPdfs();
      setImportedPdfs(res || []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách PDF:', err);
    }
  };

  const getFullPdfUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    return `${API_ROOT}${cleanUrl}`;
  };

  const handleOpenPdfFolderModal = () => {
    setIsPdfFolderModalOpen(true);
    fetchImportedPdfs();
  };

  const handleDeletePdf = async (filename) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa file PDF này? Hành động này không thể khôi phục.`)) {
      return;
    }
    try {
      if (setLoading) setLoading(true);
      await claimService.deleteImportedPdf(filename);
      setPdfActionMenuId(null);
      fetchImportedPdfs();
      if (setLoading) setLoading(false);
    } catch (err) {
      if (setLoading) setLoading(false);
      console.error('Lỗi khi xóa PDF:', err);
      alert('Không thể xóa file PDF. Lỗi: ' + (err.response?.data?.detail || err.message));
    }
  };

  const triggerPdfUpload = () => {
    if (pdfInputRef.current) pdfInputRef.current.click();
  };

  const triggerFolderUpload = () => {
    if (folderInputRef.current) folderInputRef.current.click();
  };

  const handlePdfFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      window.dispatchEvent(new CustomEvent('start-claim-pdf-import-error', {
        detail: { message: 'Chỉ chấp nhận các tệp tin định dạng PDF.' }
      }));
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      return;
    }

    window.dispatchEvent(new CustomEvent('start-claim-pdf-import', {
      detail: {
        files: pdfFiles,
        isMultiple: pdfFiles.length > 1
      }
    }));
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const handleFolderFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      window.dispatchEvent(new CustomEvent('start-claim-pdf-import-error', {
        detail: { message: 'Không tìm thấy tệp tin PDF nào trong thư mục đã chọn.' }
      }));
      if (folderInputRef.current) folderInputRef.current.value = '';
      return;
    }

    window.dispatchEvent(new CustomEvent('start-claim-pdf-import', {
      detail: {
        files: pdfFiles,
        isMultiple: true
      }
    }));
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const loadLatestImportBatch = async () => {
    if (setLoading) setLoading(true);
    try {
      if (typeof claimService.getImportBatches === 'function') {
        const batches = await claimService.getImportBatches();
        if (batches && batches.length > 0) {
          const latest = batches[0];
          const batchDetail = await claimService.getImportBatch(latest.batch_id);
          if (batchDetail && batchDetail.records && batchDetail.records.length > 0) {
            setLatestImport({
              batch_id: latest.batch_id,
              period: batchDetail.records[0].period || 'Chưa xác định',
              total_records: batchDetail.records.length,
              warnings_count: 0,
              imported_at: new Date(latest.created_at || Date.now()).toLocaleString('vi-VN')
            });
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch latest import batch metadata:', e);
    } finally {
      if (setLoading) setLoading(false);
    }
  };

  // Event Listeners for PDF and Folder Import
  useEffect(() => {
    const handleClaimPdfImportError = (e) => {
      const errorMsg = e.detail?.message || 'Có lỗi xảy ra khi đọc tệp tin PDF.';
      setClaimImportError({
        isOpen: true,
        message: errorMsg
      });
    };

    const handleClaimPdfImport = async (e) => {
      const { files, isMultiple } = e.detail || {};
      if (!files || files.length === 0) return;

      if (!isMultiple && files.length === 1) {
        const file = files[0];
        setClaimIngestionProgress({
          isOpen: true,
          title: `Đang xử lý PDF: ${file.name}`,
          progress: 10,
          statusText: 'Đang phân tích và trích xuất dữ liệu khiếu nại...',
          filesCount: 1,
          isCompleted: false
        });

        let progressVal = 10;
        const progressInterval = setInterval(() => {
          progressVal += 5;
          if (progressVal > 95) {
            clearInterval(progressInterval);
          } else {
            let statusText = 'Đang phân tích và trích xuất dữ liệu khiếu nại...';
            if (progressVal > 60 && progressVal <= 85) {
              statusText = 'Đang định vị và liên kết hình ảnh lỗi...';
            } else if (progressVal > 85) {
              statusText = 'Đang lưu trữ dữ liệu...';
            }
            setClaimIngestionProgress(prev => ({
              ...prev,
              progress: progressVal,
              statusText,
              isCompleted: false
            }));
          }
        }, 150);

        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await claimService.importPdf(formData);
          clearInterval(progressInterval);

          const mechanismName = response.mechanism ? response.mechanism.name : 'Cơ chế 1 (Standard)';
          setClaimIngestionProgress(prev => ({
            ...prev,
            isOpen: true,
            progress: 100,
            statusText: `✓ Thành công! Đã xử lý bằng ${mechanismName}`,
            isCompleted: true
          }));

          setTimeout(() => {
            const isSuccess = Boolean(response.success || response.status === 'success' || response.data?.success);
            const totalRecords = response.total_records ?? response.data?.total_records ?? 0;
            const dbSavedCount = response.db_saved_count ?? response.data?.db_saved_count ?? totalRecords;
            const batchId = response.batch_id || response.data?.batch_id;
            const parseWarnings = response.parse_warnings || response.data?.parse_warnings || [];
            const fileStats = response.file_stats || response.data?.file_stats || [];
            const singleFileStat = fileStats.length > 0 ? fileStats : [{
              filename: file.name,
              original_name: file.name,
              claims_count: totalRecords,
              mechanism: response.mechanism || response.data?.mechanism || { name: mechanismName },
              period: response.period || response.data?.period || ''
            }];

            if (isSuccess && totalRecords > 0) {
              // Auto-record total credit amount into penalties if parsed via Mechanism 4
              if (response.mechanism?.total_credit_amount && response.period) {
                try {
                  const saved = localStorage.getItem('smartflow_customer_penalties');
                  const pens = saved ? JSON.parse(saved) : {};
                  pens[response.period] = response.mechanism.total_credit_amount;
                  localStorage.setItem('smartflow_customer_penalties', JSON.stringify(pens));
                  window.dispatchEvent(new CustomEvent('claim-penalties-updated'));
                } catch (pe) {
                  console.error('Error saving penalty from Mechanism 4:', pe);
                }
              }

              setClaimSuccessSummary({
                isOpen: true,
                batchId: batchId,
                claimsCount: dbSavedCount || totalRecords,
                photoCount: response?.photo_count ?? response?.data?.photo_count ?? response?.linked_photos_count ?? 0,
                warningsCount: parseWarnings ? parseWarnings.length : 0,
                warnings: parseWarnings,
                fileStats: singleFileStat
              });
              window.dispatchEvent(new CustomEvent('pdf-import-success-refresh', { detail: response }));
            } else if (isSuccess && totalRecords === 0) {
              const warningList = parseWarnings;
              const warningDetail = warningList.length > 0 ? ` (${warningList.join('; ')})` : '';
              setClaimImportError({
                isOpen: true,
                message: `Không bóc tách được dòng khiếu nại nào từ tệp PDF đã chọn${warningDetail}.\n\nLưu ý: Chức năng này dành cho Báo cáo khiếu nại (chứa thông tin Cabinet #). Nếu đây là Chứng từ phạt theo tháng, vui lòng chọn "Cập nhật phạt Khách hàng".`
              });
            } else {
              setClaimImportError({
                isOpen: true,
                message: 'Định dạng phản hồi không hợp lệ từ máy chủ.'
              });
            }
          }, 1000);

        } catch (error) {
          clearInterval(progressInterval);
          setClaimIngestionProgress(prev => ({ ...prev, isOpen: false, isCompleted: false }));
          const errorMsg = error.response?.data?.detail || error.message || 'Lỗi kết nối máy chủ.';
          setClaimImportError({
            isOpen: true,
            message: errorMsg
          });
        }
      } else {
        // Multiple files / Folder import
        setClaimIngestionProgress({
          isOpen: true,
          title: `Đang xử lý ${files.length} file PDF...`,
          progress: 5,
          statusText: `Đang phân tích và trích xuất dữ liệu khiếu nại (${files.length} file)...`,
          filesCount: files.length,
          isCompleted: false
        });

        const formData = new FormData();
        files.forEach(f => {
          formData.append('files', f);
        });

        try {
          const response = await claimService.importFolderStream(formData, (event) => {
            if (event.type === 'start') {
              const totalFiles = event.total_files || event.total || files.length;
              setClaimIngestionProgress(prev => ({
                ...prev,
                isOpen: true,
                progress: 5,
                statusText: `Đang phân tích và trích xuất dữ liệu khiếu nại (0/${totalFiles})...`,
                filesCount: totalFiles,
                isCompleted: false
              }));
            } else if (event.type === 'progress') {
              const currentIdx = event.file_index || event.current || 1;
              const totalFiles = event.total_files || event.total || files.length;
              const percent = event.percent !== undefined 
                ? Math.min(Math.max(event.percent, 5), 98) 
                : Math.min(Math.round(((currentIdx - (event.status === 'processing' ? 0.5 : 0)) / totalFiles) * 100), 98);

              let statusText = '';
              const rawName = event.filename || '';
              const fileName = rawName.split('/').pop().split('\\').pop();
              const shortName = fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName;

              if (event.status === 'processing') {
                statusText = `Đang phân tích và trích xuất dữ liệu (${currentIdx}/${totalFiles}): ${shortName}`;
              } else if (event.status === 'done') {
                statusText = `Đang phân tích và trích xuất dữ liệu (${currentIdx}/${totalFiles}): Đã đọc ${shortName}`;
              } else if (event.status === 'warning') {
                statusText = `Đang phân tích và trích xuất dữ liệu (${currentIdx}/${totalFiles}): Bỏ qua trùng ${shortName}`;
              } else if (event.status === 'error') {
                statusText = `Đang phân tích và trích xuất dữ liệu (${currentIdx}/${totalFiles}): Lỗi file ${shortName}`;
              } else {
                statusText = `Đang phân tích và trích xuất dữ liệu (${currentIdx}/${totalFiles})...`;
              }

              setClaimIngestionProgress(prev => ({
                ...prev,
                isOpen: true,
                progress: percent,
                statusText,
                isCompleted: false
              }));
            }
          });

          setClaimIngestionProgress(prev => ({
            ...prev,
            isOpen: true,
            progress: 100,
            statusText: `✓ Hoàn tất phân tích ${files.length} file PDF!`,
            isCompleted: true
          }));

          setTimeout(() => {
            setClaimIngestionProgress(prev => ({ ...prev, isOpen: false }));

            const isSuccess = Boolean(response?.success || response?.status === 'completed' || response?.status === 'success' || response?.data?.success);
            const totalRecords = response?.total_records ?? response?.data?.total_records ?? 0;
            const dbSavedCount = response?.db_saved_count ?? response?.data?.db_saved_count ?? totalRecords;
            const batchId = response?.batch_id || response?.data?.batch_id;
            const parseWarnings = response?.parse_warnings || response?.data?.parse_warnings || [];
            const fileStats = response?.file_stats || response?.data?.file_stats || [];

            if (isSuccess && (totalRecords > 0 || fileStats.length > 0)) {
              setClaimSuccessSummary({
                isOpen: true,
                batchId: batchId,
                claimsCount: dbSavedCount || totalRecords,
                photoCount: response?.photo_count ?? response?.data?.photo_count ?? response?.linked_photos_count ?? 0,
                warningsCount: parseWarnings ? parseWarnings.length : 0,
                warnings: parseWarnings,
                fileStats: fileStats
              });
              window.dispatchEvent(new CustomEvent('pdf-import-success-refresh', { detail: response }));
            } else if (isSuccess && totalRecords === 0 && fileStats.length === 0) {
              const warningList = parseWarnings;
              const warningDetail = warningList.length > 0 ? `\nChi tiết: ${warningList.join('; ')}` : '';
              setClaimImportError({
                isOpen: true,
                message: `Không bóc tách được dòng khiếu nại nào từ các file PDF trong thư mục.${warningDetail}\n\nLưu ý:\n1. Chức năng này dành cho Báo cáo khiếu nại (chứa thông tin Cabinet #).\n2. Nếu đây là Chứng từ phạt theo tháng, vui lòng chọn "Cập nhật phạt Khách hàng".`
              });
            } else {
              setClaimImportError({
                isOpen: true,
                message: 'Định dạng phản hồi không hợp lệ từ máy chủ hoặc thư mục rỗng.'
              });
            }
          }, 1200);

        } catch (streamError) {
          console.warn('Streaming endpoint failed, falling back to standard folder import...');
          setClaimIngestionProgress(prev => ({
            ...prev,
            isOpen: true,
            progress: 10,
            statusText: `Đang phân tích và trích xuất dữ liệu từ ${files.length} file PDF...`,
            isCompleted: false
          }));

          const formData2 = new FormData();
          files.forEach(f => {
            formData2.append('files', f);
          });

          let progressVal = 10;
          const progressInterval = setInterval(() => {
            progressVal += 2;
            if (progressVal > 95) {
              clearInterval(progressInterval);
            } else {
              let statusText = 'Đang phân tích và trích xuất dữ liệu khiếu nại...';
              if (progressVal > 25 && progressVal <= 60) {
                statusText = `Đang trích xuất dữ liệu khiếu nại từ ${files.length} tệp...`;
              } else if (progressVal > 60 && progressVal <= 80) {
                statusText = 'Đang định vị và liên kết hình ảnh lỗi...';
              } else if (progressVal > 80) {
                statusText = 'Đang hoàn tất lưu trữ dữ liệu...';
              }
              setClaimIngestionProgress(prev => ({
                ...prev,
                isOpen: true,
                progress: progressVal,
                statusText,
                isCompleted: false
              }));
            }
          }, 300);

          try {
            const response = await claimService.importFolder(formData2);
            clearInterval(progressInterval);

            setClaimIngestionProgress(prev => ({
              ...prev,
              isOpen: true,
              progress: 100,
              statusText: `✓ Hoàn tất phân tích ${files.length} file PDF!`,
              isCompleted: true
            }));

            setTimeout(() => {
              setClaimIngestionProgress(prev => ({ ...prev, isOpen: false }));

              if (response.success && response.total_records > 0) {
                setClaimSuccessSummary({
                  isOpen: true,
                  batchId: response.batch_id,
                  claimsCount: response.db_saved_count || response.total_records,
                  photoCount: 0,
                  warningsCount: response.parse_warnings ? response.parse_warnings.length : 0,
                  warnings: response.parse_warnings || [],
                  fileStats: response.file_stats || []
                });
                window.dispatchEvent(new CustomEvent('pdf-import-success-refresh', { detail: response }));
              } else if (response.success && response.total_records === 0) {
                setClaimImportError({
                  isOpen: true,
                  message: 'Không tìm thấy dữ liệu khiếu nại nào trong các file PDF đã chọn.'
                });
              } else {
                setClaimImportError({
                  isOpen: true,
                  message: 'Định dạng phản hồi không hợp lệ từ máy chủ hoặc thư mục rỗng.'
                });
              }
            }, 1200);

          } catch (error) {
            clearInterval(progressInterval);
            setClaimIngestionProgress(prev => ({ ...prev, isOpen: false, isCompleted: false }));
            const errorMsg = error.response?.data?.detail || error.message || 'Lỗi kết nối máy chủ.';
            setClaimImportError({
              isOpen: true,
              message: errorMsg
            });
          }
        }
      }
    };

    window.addEventListener('start-claim-pdf-import', handleClaimPdfImport);
    window.addEventListener('start-claim-pdf-import-error', handleClaimPdfImportError);
    return () => {
      window.removeEventListener('start-claim-pdf-import', handleClaimPdfImport);
      window.removeEventListener('start-claim-pdf-import-error', handleClaimPdfImportError);
    };
  }, []);

  // Listen to PDF import refresh event
  useEffect(() => {
    const handleSuccessRefresh = (e) => {
      const response = e.detail;
      if (fetchClaims) fetchClaims();
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const tableContainer = document.querySelector('.report-table-container');
      if (tableContainer) tableContainer.scrollTop = 0;

      if (response && response.batch_id) {
        setHighlightBatchId(response.batch_id);
        setTimeout(() => {
          setHighlightBatchId(null);
        }, 4000);

        setLatestImport({
          batch_id: response.batch_id,
          period: response.period,
          total_records: response.total_records,
          warnings_count: response.parse_warnings ? response.parse_warnings.length : 0,
          imported_at: new Date().toLocaleString('vi-VN')
        });
      }
    };

    window.addEventListener('pdf-import-success-refresh', handleSuccessRefresh);
    return () => window.removeEventListener('pdf-import-success-refresh', handleSuccessRefresh);
  }, [fetchClaims]);

  return {
    isOtherDropdownOpen,
    setIsOtherDropdownOpen,
    isImportDropdownOpen,
    setIsImportDropdownOpen,
    isExportDropdownOpen,
    setIsExportDropdownOpen,
    isExporting,
    setIsExporting,
    pdfInputRef,
    folderInputRef,
    isPdfFolderModalOpen,
    setIsPdfFolderModalOpen,
    importedPdfs,
    setImportedPdfs,
    selectedPdfForPreview,
    setSelectedPdfForPreview,
    pdfActionMenuId,
    setPdfActionMenuId,
    pdfSearchQuery,
    setPdfSearchQuery,
    latestImport,
    setLatestImport,
    highlightBatchId,
    setHighlightBatchId,
    fetchImportedPdfs,
    getFullPdfUrl,
    handleOpenPdfFolderModal,
    handleDeletePdf,
    triggerPdfUpload,
    triggerFolderUpload,
    handlePdfFileChange,
    handleFolderFileChange,
    loadLatestImportBatch
  };
};
