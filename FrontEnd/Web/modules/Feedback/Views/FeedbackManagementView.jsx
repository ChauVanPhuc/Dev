import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Search,
  Filter,
  RefreshCw,
  FileDown,
  CheckSquare,
  Square,
  Eye,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Layers,
  ChevronLeft,
  ChevronRight,
  Volume2
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { feedbackService } from '../services/feedback.service';
import { FeedbackStatsCards } from '../components/FeedbackStatsCards';
import { FeedbackFilterBar } from '../components/FeedbackFilterBar';
import { FeedbackDetailModal } from '../components/FeedbackDetailModal';
import { ImageLightboxModal } from '../components/ImageLightboxModal';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import '@styles/components.css';
import '../styles/feedback.css';

// Helper làm nổi bật từ khóa tìm kiếm
const highlightMatch = (text, term) => {
  if (!text || !term || !term.trim()) return text;
  const strText = String(text);
  const lowerText = strText.toLowerCase();
  const lowerTerm = term.toLowerCase().trim();
  const index = lowerText.indexOf(lowerTerm);
  if (index === -1) return strText;

  const before = strText.substring(0, index);
  const match = strText.substring(index, index + lowerTerm.length);
  const after = strText.substring(index + lowerTerm.length);

  return (
    <>
      {before}
      <mark style={{ backgroundColor: '#FEF08A', color: '#854D0E', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>
        {match}
      </mark>
      {after}
    </>
  );
};

export const FeedbackManagementView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { toast } = useToast() || { toast: () => {} };

  // Đồng bộ Header với PortalLayout
  useEffect(() => {
    if (typeof setCustomTitle === 'function') setCustomTitle('Quản lý Góp Ý');
    if (typeof setCustomSubtitle === 'function') {
      setCustomSubtitle('Tiếp nhận, theo dõi và giải quyết các báo cáo sự cố dừng chuyền & ý kiến đóng góp từ Mobile');
    }
    if (typeof setCustomScreenCode === 'function') setCustomScreenCode('FB01');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // Data & Loading states
  const [reports, setReports] = useState([]);
  const [backendStats, setBackendStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Search, Sort & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sortValue, setSortValue] = useState('time_desc');
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [filterReportType, setFilterReportType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);

  // Selection & Batch
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  // Modals
  const [selectedReport, setSelectedReport] = useState(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', type: 'warning', confirmText: 'Xác nhận', onConfirm: null });

  // Audio Playback in Table
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const audioPlayerRef = useRef(null);

  // Fetch dữ liệu từ API
  const fetchReports = useCallback(async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const res = await feedbackService.getReports({ limit: 1000 });
      const items = res?.items || (Array.isArray(res) ? res : []);
      setReports(items);
      if (res?.stats) {
        setBackendStats(res.stats);
      }

      if (showToast) {
        toast('info', `Đã làm mới danh sách (${items.length} báo cáo & góp ý).`);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách báo cáo:', err);
      toast('error', 'Không thể tải danh sách báo cáo từ máy chủ.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Phím tắt bàn phím toàn cục F5
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F5') {
        e.preventDefault();
        fetchReports(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchReports]);

  // Dừng âm thanh khi unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  // Audio row toggle
  const handleToggleRowAudio = (reportId, audioPath) => {
    if (!audioPath) return;
    const fullUrl = feedbackService.formatMediaUrl(audioPath);

    if (playingAudioId === reportId) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(fullUrl);
      audioPlayerRef.current = audio;
      audio.onended = () => setPlayingAudioId(null);
      audio.play().catch(e => console.warn('Lỗi phát âm thanh:', e));
      setPlayingAudioId(reportId);
    }
  };

  // Trích xuất danh sách Phòng Ban & Bộ Phận thực tế từ dữ liệu
  const departments = useMemo(() => {
    const s = new Set();
    reports.forEach(r => {
      if (r.issue_type && r.issue_type.trim()) s.add(r.issue_type.trim());
    });
    return Array.from(s).sort();
  }, [reports]);

  const sections = useMemo(() => {
    const s = new Set();
    reports.forEach(r => {
      if (r.area && r.area.trim()) s.add(r.area.trim());
    });
    return Array.from(s).sort();
  }, [reports]);

  // Thống kê KPI tổng quan
  const stats = useMemo(() => {
    if (backendStats) {
      return {
        total: backendStats.total || reports.length,
        pending: backendStats.pending || 0,
        processing: backendStats.processing || 0,
        resolved: backendStats.completed || 0,
        rejected: backendStats.rejected || 0
      };
    }
    let pending = 0;
    let processing = 0;
    let resolved = 0;
    let rejected = 0;

    reports.forEach(r => {
      const st = r.status || 'Chờ xử lý';
      if (st === 'Chờ xử lý') pending++;
      else if (st === 'Đã tiếp nhận') processing++;
      else if (st === 'Đã xong' || st === 'Đã hoàn thành') resolved++;
      else if (st === 'Từ chối' || st === 'Đã hủy') rejected++;
    });

    return {
      total: reports.length,
      pending,
      processing,
      resolved,
      rejected
    };
  }, [reports, backendStats]);

  // Đếm số lượng bộ lọc đang active
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterReportType !== 'all') count++;
    if (filterStatus !== 'all') count++;
    if (filterDepartment !== 'all') count++;
    if (filterSection !== 'all') count++;
    if (fromDate) count++;
    if (toDate) count++;
    return count;
  }, [filterReportType, filterStatus, filterDepartment, filterSection, fromDate, toDate]);

  // Lọc dữ liệu theo Search, Filters, Sort
  const filteredReports = useMemo(() => {
    let result = reports.filter(r => {
      // 1. Tìm kiếm văn bản
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (r.code || '').toLowerCase().includes(q);
        const matchContent = (r.main_content || '').toLowerCase().includes(q);
        const matchCreator = (r.creator_name || '').toLowerCase().includes(q);
        const matchDept = (r.issue_type || '').toLowerCase().includes(q);
        const matchSec = (r.area || '').toLowerCase().includes(q);
        const matchReco = (r.solution_recommendation || '').toLowerCase().includes(q);
        if (!matchCode && !matchContent && !matchCreator && !matchDept && !matchSec && !matchReco) {
          return false;
        }
      }

      // 2. Lọc loại báo cáo
      if (filterReportType !== 'all') {
        if (r.report_type !== filterReportType) return false;
      }

      // 3. Lọc trạng thái
      if (filterStatus !== 'all') {
        const rStatus = r.status || 'Chờ xử lý';
        if (filterStatus === 'Đã xong') {
          if (rStatus !== 'Đã xong' && rStatus !== 'Đã hoàn thành') return false;
        } else if (filterStatus === 'Từ chối') {
          if (rStatus !== 'Từ chối' && rStatus !== 'Đã hủy') return false;
        } else {
          if (rStatus !== filterStatus) return false;
        }
      }

      // 4. Lọc Phòng Ban
      if (filterDepartment !== 'all') {
        if ((r.issue_type || '').trim() !== filterDepartment) return false;
      }

      // 5. Lọc Bộ Phận
      if (filterSection !== 'all') {
        if ((r.area || '').trim() !== filterSection) return false;
      }

      // 6. Lọc theo ngày tạo
      if (fromDate || toDate) {
        if (r.created_at) {
          // Parse định dạng "HH:MM | DD/MM/YYYY" hoặc ISO
          let itemDate = null;
          if (r.created_at.includes('|')) {
            const parts = r.created_at.split('|')[1]?.trim().split('/');
            if (parts && parts.length === 3) {
              itemDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
          } else {
            itemDate = new Date(r.created_at);
          }

          if (itemDate && !isNaN(itemDate.getTime())) {
            if (fromDate) {
              const fDate = new Date(fromDate);
              fDate.setHours(0, 0, 0, 0);
              if (itemDate < fDate) return false;
            }
            if (toDate) {
              const tDate = new Date(toDate);
              tDate.setHours(23, 59, 59, 999);
              if (itemDate > tDate) return false;
            }
          }
        }
      }

      return true;
    });

    // Sắp xếp dữ liệu
    result.sort((a, b) => {
      if (sortValue === 'time_desc') {
        return (b.id || 0) - (a.id || 0);
      } else if (sortValue === 'time_asc') {
        return (a.id || 0) - (b.id || 0);
      } else if (sortValue === 'code_asc') {
        return (a.code || '').localeCompare(b.code || '');
      } else if (sortValue === 'code_desc') {
        return (b.code || '').localeCompare(a.code || '');
      }
      return 0;
    });

    return result;
  }, [reports, searchQuery, filterReportType, filterStatus, filterDepartment, filterSection, fromDate, toDate, sortValue]);

  // Phân trang
  const totalCount = filteredReports.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReports = useMemo(() => {
    return filteredReports.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReports, startIndex, itemsPerPage]);

  // Danh sách các số trang hiển thị dạng compact
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    const delta = 2;
    const left = currentPage - delta;
    const right = currentPage + delta + 1;
    let l;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i < right)) {
        pages.push(i);
      }
    }
    const result = [];
    for (const p of pages) {
      if (l) {
        if (p - l === 2) {
          result.push(l + 1);
        } else if (p - l !== 1) {
          result.push('...');
        }
      }
      result.push(p);
      l = p;
    }
    return result;
  }, [totalPages, currentPage]);

  // Reset bộ lọc
  const handleResetFilters = () => {
    setFilterReportType('all');
    setFilterStatus('all');
    setFilterDepartment('all');
    setFilterSection('all');
    setFromDate('');
    setToDate('');
    setSearchQuery('');
    setCurrentPage(1);
    toast('info', 'Đã đặt lại tất cả bộ lọc về mặc định.');
  };

  // Checkbox Selection
  const isAllSelected = useMemo(() => {
    if (paginatedReports.length === 0) return false;
    return paginatedReports.every(r => selectedIds.has(r.id));
  }, [paginatedReports, selectedIds]);

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllSelected) {
      paginatedReports.forEach(r => next.delete(r.id));
    } else {
      paginatedReports.forEach(r => next.add(r.id));
    }
    setSelectedIds(next);
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Duyệt hàng loạt
  const handleBatchConfirm = (targetStatus) => {
    if (selectedIds.size === 0) return;
    const arrIds = Array.from(selectedIds);

    setConfirmModal({
      visible: true,
      title: 'Xác nhận cập nhật hàng loạt',
      message: `Bạn có chắc muốn chuyển ${arrIds.length} phiếu đã chọn sang trạng thái "${targetStatus}"?`,
      type: 'warning',
      confirmText: 'Xác nhận',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, visible: false }));
        setBatchLoading(true);
        try {
          await feedbackService.batchConfirm(arrIds, targetStatus, 'Ban Quản Lý');
          toast('success', `Đã cập nhật ${arrIds.length} phiếu sang "${targetStatus}"!`);
          setSelectedIds(new Set());
          fetchReports();
        } catch (err) {
          console.error('Lỗi duyệt hàng loạt:', err);
          toast('error', 'Có lỗi xảy ra khi cập nhật hàng loạt.');
        } finally {
          setBatchLoading(false);
        }
      }
    });
  };

  // Xuất file Excel chuẩn giao diện SmartFlow
  const handleExportExcel = async () => {
    if (filteredReports.length === 0) {
      toast('warning', 'Không có dữ liệu báo cáo nào để xuất!');
      return;
    }

    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'SmartFlow System';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Danh Sách Góp Ý & Sự Cố', {
        views: [{ showGridLines: true }]
      });

      // 1. Tiêu đề Báo Cáo
      worksheet.mergeCells('A1:L1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'DANH SÁCH BÁO CÁO SỰ CỐ & Ý KIẾN ĐÓNG GÓP (FEEDBACK)';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '7B5233' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 32;

      // 2. Thông tin xuất báo cáo
      worksheet.mergeCells('A2:L2');
      const subCell = worksheet.getCell('A2');
      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      subCell.value = `Thời điểm xuất: ${dateStr} | Tổng số phiếu: ${filteredReports.length}`;
      subCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: '64748B' } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(2).height = 18;

      // 3. Định nghĩa cột
      const columns = [
        { header: 'STT', key: 'stt', width: 8 },
        { header: 'Mã phiếu', key: 'code', width: 14 },
        { header: 'Loại phiếu', key: 'report_type', width: 22 },
        { header: 'Phòng Ban', key: 'department', width: 22 },
        { header: 'Bộ Phận', key: 'section', width: 24 },
        { header: 'Người gửi', key: 'creator', width: 20 },
        { header: 'Nội dung sự cố', key: 'content', width: 42 },
        { header: 'Kiến nghị / Giải pháp', key: 'reco', width: 35 },
        { header: 'Có ghi âm', key: 'has_audio', width: 14 },
        { header: 'Ngày tạo', key: 'created_at', width: 18 },
        { header: 'Trạng thái', key: 'status', width: 18 },
        { header: 'Người xử lý', key: 'handler', width: 20 }
      ];

      worksheet.columns = columns;

      // Header row
      const headerRow = worksheet.getRow(4);
      headerRow.values = columns.map(c => c.header);
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '7B5233' }
        };
        cell.font = {
          name: 'Arial',
          size: 10,
          bold: true,
          color: { argb: 'FFFFFF' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'EADCC9' } },
          bottom: { style: 'thin', color: { argb: 'EADCC9' } },
          left: { style: 'thin', color: { argb: 'EADCC9' } },
          right: { style: 'thin', color: { argb: 'EADCC9' } }
        };
      });

      // Thêm các dòng dữ liệu
      filteredReports.forEach((r, idx) => {
        const row = worksheet.addRow({
          stt: idx + 1,
          code: r.code || '---',
          report_type: r.report_type || '---',
          department: r.issue_type || '---',
          section: r.area || '---',
          creator: r.is_anonymous ? 'Ẩn danh' : (r.creator_name || '---'),
          content: r.main_content || '---',
          reco: r.solution_recommendation || '---',
          has_audio: r.audio_url ? 'Có' : 'Không',
          created_at: r.created_at || '---',
          status: r.status || 'Chờ xử lý',
          handler: r.handler_name || '---'
        });

        row.height = 24;

        // Định dạng viền và căn lề cho từng ô
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial', size: 9.5 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } }
          };

          // Căn giữa cho STT, Mã, Loại, Ghi âm, Ngày, Trạng thái
          if ([1, 2, 9, 10, 11].includes(colNumber)) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          }
        });

        // Màu trạng thái
        const statusCell = row.getCell(11);
        const stText = r.status || 'Chờ xử lý';
        if (stText === 'Đã xong' || stText === 'Đã hoàn thành') {
          statusCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '059669' } };
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'ECFDF5' } };
        } else if (stText === 'Đã tiếp nhận') {
          statusCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '2563EB' } };
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF6FF' } };
        } else if (stText === 'Từ chối' || stText === 'Đã hủy') {
          statusCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'DC2626' } };
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF2F2' } };
        } else {
          statusCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'D97706' } };
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBEB' } };
        }
      });

      // Tải file về máy
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Bao_Cao_Gop_Y_SmartFlow_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      toast('success', `Đã xuất thành công ${filteredReports.length} báo cáo ra file Excel!`);
    } catch (err) {
      console.error('Lỗi xuất Excel:', err);
      toast('error', 'Không thể xuất file Excel. Vui lòng thử lại!');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="gold-layout feedback-unified-container">
      {/* Dynamic CSS override to ensure Table fills 100% of viewport screen height */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 769px) {
          .feedback-unified-container {
            height: calc(100vh - 68px) !important;
            max-height: calc(100vh - 68px) !important;
            min-height: 0 !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            padding: 10px 14px 10px !important;
            box-sizing: border-box !important;
          }
          .feedback-unified-container .feedback-top-zone {
            flex-shrink: 0 !important;
            flex-grow: 0 !important;
            margin-bottom: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
          }
          .feedback-unified-container .stats-cards-grid {
            margin-bottom: 0 !important;
            gap: 10px !important;
          }
          .feedback-unified-container .stat-card {
            padding: 10px 14px !important;
          }
          .feedback-unified-container .table-card {
            flex: 1 1 0% !important;
            height: 100% !important;
            min-height: 0 !important;
            max-height: 100% !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            margin: 0 !important;
            border-radius: 8px !important;
            background: #FFFFFF !important;
            border: 1px solid #EADCC9 !important;
          }
          .feedback-unified-container .table-responsive {
            flex: 1 1 0% !important;
            height: 100% !important;
            min-height: 0 !important;
            overflow-x: auto !important;
            overflow-y: auto !important;
            display: block !important;
            position: relative !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .feedback-unified-container .table-responsive thead th {
            position: sticky !important;
            top: 0 !important;
            z-index: 10 !important;
            background-color: #F8F4EE !important;
            box-shadow: 0 1px 0 #EADCC9 !important;
          }
          .feedback-unified-container .admin-pagination-desktop {
            flex-shrink: 0 !important;
            flex-grow: 0 !important;
            height: 38px !important;
            min-height: 38px !important;
            max-height: 38px !important;
            padding: 0 14px !important;
            margin-top: auto !important;
            background: #FFFFFF !important;
            border-top: 1px solid #EADCC9 !important;
            z-index: 15 !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
        }
      `}} />

      {/* TOP ZONE: KPI Cards, Toolbar, Inline Filters */}
      <div className="feedback-top-zone">
        {/* 1. KPI Stats Cards */}
        <FeedbackStatsCards
          stats={stats}
          currentFilterStatus={filterStatus}
          onSelectStatus={(st) => {
            setFilterStatus(st);
            setCurrentPage(1);
          }}
        />

        {/* 2. Standard PageToolbar */}
        <div style={{ width: '100%' }}>
          <PageToolbar
            searchValue={searchQuery}
            onSearchChange={(val) => {
              setSearchQuery(val);
              setCurrentPage(1);
            }}
            searchPlaceholder="Tìm theo mã phiếu, nội dung, kiến nghị, phòng ban, người tạo..."
            showSort={true}
            sortOptions={[
              { value: 'time_desc', label: 'Mới nhất' },
              { value: 'time_asc', label: 'Cũ nhất' },
              { value: 'code_asc', label: 'Mã phiếu (A → Z)' },
              { value: 'code_desc', label: 'Mã phiếu (Z → A)' }
            ]}
            sortValue={sortValue}
            onSortChange={(val) => {
              setSortValue(val);
              setCurrentPage(1);
            }}
            showFilter={true}
            isFilterOpen={isFilterBarOpen}
            onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
            activeFiltersCount={activeFiltersCount}
            onExport={handleExportExcel}
            isExporting={isExporting}
            exportLabel="Xuất Excel"
            extraActions={[
              {
                label: 'Làm mới (F5)',
                icon: <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />,
                onClick: () => fetchReports(true)
              },
              ...(selectedIds.size > 0
                ? [
                    {
                      label: `Tiếp nhận (${selectedIds.size})`,
                      icon: <CheckCircle2 size={14} />,
                      onClick: () => handleBatchConfirm('Đã tiếp nhận')
                    },
                    {
                      label: `Hoàn thành (${selectedIds.size})`,
                      icon: <CheckSquare size={14} />,
                      onClick: () => handleBatchConfirm('Đã xong')
                    }
                  ]
                : [])
            ]}
          />
        </div>

        {/* 3. Inline Filter Bar */}
        <FeedbackFilterBar
          isOpen={isFilterBarOpen}
          filterReportType={filterReportType}
          setFilterReportType={(val) => {
            setFilterReportType(val);
            setCurrentPage(1);
          }}
          filterStatus={filterStatus}
          setFilterStatus={(val) => {
            setFilterStatus(val);
            setCurrentPage(1);
          }}
          filterDepartment={filterDepartment}
          setFilterDepartment={(val) => {
            setFilterDepartment(val);
            setCurrentPage(1);
          }}
          filterSection={filterSection}
          setFilterSection={(val) => {
            setFilterSection(val);
            setCurrentPage(1);
          }}
          fromDate={fromDate}
          setFromDate={(val) => {
            setFromDate(val);
            setCurrentPage(1);
          }}
          toDate={toDate}
          setToDate={(val) => {
            setToDate(val);
            setCurrentPage(1);
          }}
          departments={departments}
          sections={sections}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
          onReset={handleResetFilters}
        />
      </div>

      {/* 4. Table Card */}
      <div className="table-card" style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EADCC9', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="smartflow-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8F4EE', color: '#7B5233', fontWeight: '800', borderBottom: '2px solid #EADCC9' }}>
                <th style={{ width: '40px', textAlign: 'center', padding: '10px 6px' }}>
                  <span
                    onClick={toggleSelectAll}
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    title={isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả dòng'}
                  >
                    {isAllSelected ? <CheckSquare size={16} color="#7B5233" /> : <Square size={16} color="#A89F91" />}
                  </span>
                </th>
                <th style={{ width: '50px', textAlign: 'center', padding: '10px 6px' }}>STT</th>
                <th style={{ width: '100px', textAlign: 'center', padding: '10px 8px' }}>Mã phiếu</th>
                <th style={{ width: '130px', textAlign: 'left', padding: '10px 8px' }}>Loại phiếu</th>
                <th style={{ width: '150px', textAlign: 'left', padding: '10px 8px' }}>Phòng Ban</th>
                <th style={{ width: '150px', textAlign: 'left', padding: '10px 8px' }}>Bộ Phận</th>
                <th style={{ width: '140px', textAlign: 'left', padding: '10px 8px' }}>Người tạo</th>
                <th style={{ minWidth: '220px', textAlign: 'left', padding: '10px 8px' }}>Nội dung sự cố</th>
                <th style={{ width: '130px', textAlign: 'center', padding: '10px 8px' }}>Ngày tạo</th>
                <th style={{ width: '120px', textAlign: 'center', padding: '10px 8px' }}>Trạng thái</th>
                <th style={{ width: '80px', textAlign: 'center', padding: '10px 6px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '60px 0', color: '#8C7B73' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: '#7B5233' }} />
                    <p style={{ fontWeight: 600 }}>Đang tải danh sách báo cáo & góp ý...</p>
                  </td>
                </tr>
              ) : paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '60px 0', color: '#8C7B73' }}>
                    <AlertCircle size={36} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#475569' }}>Không tìm thấy báo cáo nào phù hợp.</p>
                    <p style={{ fontSize: '0.8rem', marginTop: 4, color: '#94A3B8' }}>Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc.</p>
                  </td>
                </tr>
              ) : (
                paginatedReports.map((report, idx) => {
                  const isSelected = selectedIds.has(report.id);
                  const isPlaying = playingAudioId === report.id;

                  // Trạng thái badge style
                  let statusBg = '#FFFBEB';
                  let statusColor = '#D97706';
                  let statusBorder = '#FDE68A';
                  const st = report.status || 'Chờ xử lý';

                  if (st === 'Đã xong' || st === 'Đã hoàn thành') {
                    statusBg = '#ECFDF5';
                    statusColor = '#059669';
                    statusBorder = '#A7F3D0';
                  } else if (st === 'Đã tiếp nhận') {
                    statusBg = '#EFF6FF';
                    statusColor = '#2563EB';
                    statusBorder = '#BFDBFE';
                  } else if (st === 'Từ chối' || st === 'Đã hủy') {
                    statusBg = '#FEF2F2';
                    statusColor = '#DC2626';
                    statusBorder = '#FECACA';
                  }

                  return (
                    <tr
                      key={report.id}
                      style={{
                        backgroundColor: isSelected ? '#FDF8F3' : idx % 2 === 0 ? '#FFFFFF' : '#FCFAF7',
                        borderBottom: '1px solid #F1E9DF',
                        transition: 'background-color 0.15s ease'
                      }}
                      onDoubleClick={() => setSelectedReport(report)}
                    >
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center', padding: '8px 6px' }}>
                        <span
                          onClick={() => toggleSelect(report.id)}
                          style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          {isSelected ? <CheckSquare size={16} color="#7B5233" /> : <Square size={16} color="#C4B5AA" />}
                        </span>
                      </td>

                      {/* STT */}
                      <td style={{ textAlign: 'center', fontWeight: '600', color: '#64748B' }}>
                        {String(startIndex + idx + 1).padStart(2, '0')}
                      </td>

                      {/* Mã phiếu */}
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            fontWeight: '800',
                            color: '#7B5233',
                            backgroundColor: '#FAF6F0',
                            border: '1px solid #EADCC9',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-block'
                          }}
                          onClick={() => setSelectedReport(report)}
                          title="Bấm xem chi tiết"
                        >
                          {report.code || '---'}
                        </span>
                      </td>

                      {/* Loại phiếu */}
                      <td>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: report.report_type === 'Biên bản cuộc họp' ? '#F5F3FF' : '#FFF7ED',
                            color: report.report_type === 'Biên bản cuộc họp' ? '#7C3AED' : '#C2410C',
                            border: `1px solid ${report.report_type === 'Biên bản cuộc họp' ? '#DDD6FE' : '#FFEDD5'}`,
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {report.report_type || 'Báo cáo vấn đề'}
                        </span>
                      </td>

                      {/* Phòng Ban */}
                      <td style={{ fontWeight: '600', color: '#334155' }}>
                        {highlightMatch(report.issue_type || '---', searchQuery)}
                      </td>

                      {/* Bộ Phận */}
                      <td style={{ color: '#475569' }}>
                        {highlightMatch(report.area || '---', searchQuery)}
                      </td>

                      {/* Người tạo */}
                      <td>
                        {report.is_anonymous ? (
                          <span style={{ fontStyle: 'italic', color: '#94A3B8', fontWeight: '600', fontSize: '0.78rem' }}>
                            (Ẩn danh)
                          </span>
                        ) : (
                          <span style={{ fontWeight: '600', color: '#1E293B' }}>
                            {highlightMatch(report.creator_name || '---', searchQuery)}
                          </span>
                        )}
                      </td>

                      {/* Nội dung sự cố */}
                      <td style={{ maxWidth: '280px' }}>
                        <div
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: '#2D1A12',
                            fontWeight: '500'
                          }}
                          title={report.main_content}
                        >
                          {highlightMatch(report.main_content || '---', searchQuery)}
                        </div>
                        {report.solution_recommendation && (
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: '#64748B',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginTop: '2px'
                            }}
                            title={`Kiến nghị: ${report.solution_recommendation}`}
                          >
                            <span style={{ fontWeight: '700', color: '#7B5233' }}>Kiến nghị: </span>
                            {highlightMatch(report.solution_recommendation, searchQuery)}
                          </div>
                        )}
                      </td>

                      {/* Ngày tạo */}
                      <td style={{ textAlign: 'center', color: '#64748B', fontSize: '0.75rem' }}>
                        {report.created_at || '---'}
                      </td>

                      {/* Trạng thái */}
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            backgroundColor: statusBg,
                            color: statusColor,
                            border: `1px solid ${statusBorder}`,
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {report.status || 'Chờ xử lý'}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedReport(report)}
                          style={{
                            border: '1px solid #EADCC9',
                            backgroundColor: '#FAF6F0',
                            color: '#7B5233',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                          title="Xem chi tiết & xử lý"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Compact Standard SmartFlow Pagination Footer */}
        <div className="admin-pagination-desktop desktop-only" style={{ padding: '10px 16px', borderTop: '1px solid #EADCC9' }}>
          <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
            Hiển thị <b>{totalCount > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, totalCount)}</b> trên <b>{totalCount}</b> báo cáo & góp ý
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="page-btn"
                title="Trang trước"
              >
                <ChevronLeft size={14} />
              </button>
              {pageNumbers.map((p, idx) =>
                p === '...' ? (
                  <span key={`dots-${idx}`} style={{ color: '#8D6E63', fontWeight: '700', padding: '0 4px', fontSize: '0.78rem' }}>
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`page-btn ${currentPage === p ? 'active' : ''}`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="page-btn"
                title="Trang sau"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Modals */}
      {selectedReport && (
        <FeedbackDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onSaved={() => fetchReports()}
          onDelete={() => {
            setSelectedReport(null);
            fetchReports();
          }}
          onImageClick={(url) => setLightboxImageUrl(url)}
        />
      )}

      {lightboxImageUrl && (
        <ImageLightboxModal
          imageUrl={lightboxImageUrl}
          onClose={() => setLightboxImageUrl(null)}
        />
      )}

      {/* Beautiful Confirm Modal thay thế window.confirm */}
      <BeautifulConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        cancelText="Hủy bỏ"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      />
    </div>
  );
};

export default FeedbackManagementView;
