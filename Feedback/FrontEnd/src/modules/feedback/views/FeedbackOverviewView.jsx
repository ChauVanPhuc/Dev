import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, RefreshCw, Download, CheckSquare, Square, Eye, Edit, Image as ImageIcon, Sparkles, AlertCircle, HelpCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { feedbackService } from '../services/feedback.service';
import { FeedbackStatsCards } from '../components/FeedbackStatsCards';
import { FeedbackFilterBar } from '../components/FeedbackFilterBar';
import { FeedbackDetailModal } from '../components/FeedbackDetailModal';
import { ImageLightboxModal } from '@shared/components/ImageLightboxModal';
import { useToast } from '@shared/components/ToastContext';

export const FeedbackOverviewView = () => {
  const { toast } = useToast();

  // Data & Loading states
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [filterReportType, setFilterReportType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterArea, setFilterArea] = useState('all');

  // Selection & Batch
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  // Modals
  const [selectedReport, setSelectedReport] = useState(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState(null);

  // Fetch dữ liệu từ API
  const fetchReports = useCallback(async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const res = await feedbackService.getReports({ limit: 100 });
      const items = res.items || [];
      setReports(items);

      if (showToast) {
        toast('info', `Đã làm mới danh sách (${items.length} báo cáo).`);
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

  // Trích xuất danh sách các khu vực thực tế
  const areas = useMemo(() => {
    const s = new Set();
    reports.forEach(r => {
      if (r.area && r.area.trim()) s.add(r.area.trim());
    });
    return Array.from(s).sort();
  }, [reports]);

  // Thống kê KPI
  const stats = useMemo(() => {
    let pending = 0;
    let processing = 0;
    let resolved = 0;
    let rejected = 0;

    reports.forEach(r => {
      const st = r.status || 'Chờ xử lý';
      if (st === 'Chờ xử lý') pending++;
      else if (st === 'Đã tiếp nhận') processing++;
      else if (st === 'Đã xong') resolved++;
      else if (st === 'Từ chối') rejected++;
    });

    return {
      total: reports.length,
      pending,
      processing,
      resolved,
      rejected
    };
  }, [reports]);

  // Lọc dữ liệu hiển thị
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // 1. Tìm kiếm văn bản
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (r.code || '').toLowerCase().includes(q);
        const matchContent = (r.main_content || '').toLowerCase().includes(q);
        const matchCreator = (r.creator_name || '').toLowerCase().includes(q);
        const matchArea = (r.area || '').toLowerCase().includes(q);
        const matchReco = (r.solution_recommendation || '').toLowerCase().includes(q);
        if (!matchCode && !matchContent && !matchCreator && !matchArea && !matchReco) {
          return false;
        }
      }

      // 2. Lọc loại báo cáo
      if (filterReportType !== 'all') {
        if (r.report_type !== filterReportType) return false;
      }

      // 3. Lọc trạng thái
      if (filterStatus !== 'all') {
        if (r.status !== filterStatus) return false;
      }

      // 4. Lọc khu vực
      if (filterArea !== 'all') {
        if (r.area !== filterArea) return false;
      }

      return true;
    });
  }, [reports, searchQuery, filterReportType, filterStatus, filterArea]);

  // Reset toàn bộ bộ lọc
  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterReportType('all');
    setFilterStatus('all');
    setFilterArea('all');
  };

  // Chọn / Bỏ chọn dòng
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Chọn tất cả
  const isAllSelected = filteredReports.length > 0 && filteredReports.every(r => selectedIds.has(r.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReports.map(r => r.id)));
    }
  };

  // Duyệt nhanh hàng loạt
  const handleBatchConfirm = async (targetStatus = 'Đã xong') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast('warning', 'Vui lòng chọn ít nhất 1 phiếu để thực hiện thao tác.');
      return;
    }

    setBatchLoading(true);
    try {
      await feedbackService.batchConfirm(ids, targetStatus);
      toast('success', `Đã cập nhật trạng thái "${targetStatus}" cho ${ids.length} phiếu!`);
      setSelectedIds(new Set());
      fetchReports();
    } catch (err) {
      toast('error', 'Lỗi khi duyệt hàng loạt: ' + err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  // Xuất file Excel
  const handleExportExcel = () => {
    if (filteredReports.length === 0) {
      toast('warning', 'Không có dữ liệu để xuất Excel.');
      return;
    }

    try {
      const exportData = filteredReports.map((r, index) => ({
        'STT': index + 1,
        'Mã phiếu': r.code,
        'Loại báo cáo': r.report_type,
        'Khu vực / Xưởng': r.area || 'N/A',
        'Người lập': r.is_anonymous ? 'Ẩn danh' : r.creator_name,
        'Nội dung sự cố': r.main_content,
        'Đề xuất / Kiến nghị': r.solution_recommendation || '',
        'Trạng thái': r.status,
        'Người xử lý': r.handler_name || '',
        'Biện pháp xử lý / Phản hồi': r.handler_response || '',
        'Ngày lập': r.created_at || '',
        'Cập nhật lần cuối': r.updated_at || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 12 },
        { wch: 20 },
        { wch: 16 },
        { wch: 18 },
        { wch: 35 },
        { wch: 30 },
        { wch: 16 },
        { wch: 20 },
        { wch: 35 },
        { wch: 18 },
        { wch: 18 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'DS_Bao_Cao_Su_Co');

      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      XLSX.writeFile(workbook, `SmartFlow_Feedback_Reports_${dateStr}.xlsx`);
      toast('success', `Đã xuất thành công ${filteredReports.length} báo cáo ra file Excel!`);
    } catch (err) {
      console.error('Lỗi xuất Excel:', err);
      toast('error', 'Không thể xuất file Excel. Vui lòng thử lại!');
    }
  };

  return (
    <div className="feedback-content-body">
      {/* Page Banner (Like /admin/quality) */}
      <div className="overview-banner">
        <div className="overview-banner-title-group">
          <span className="overview-screen-badge">FB01</span>
          <div>
            <h1 className="overview-title">Quản lý Báo cáo Sự cố & Góp ý (Feedback)</h1>
            <p className="overview-subtitle">
              CL-FB: Tiếp nhận, theo dõi và giải quyết các báo cáo sự cố dừng chuyền / biên bản cuộc họp từ Mobile
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => window.location.href = '/'}
            className="btn-toolbar"
            style={{
              backgroundColor: '#432818',
              color: '#FFFFFF',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '700',
              padding: '0 14px',
              height: '36px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            title="Tạo báo cáo mới"
          >
            <span>+ Tạo phiếu mới</span>
          </button>
          <button
            onClick={() => fetchReports(true)}
            disabled={refreshing}
            className="btn-toolbar btn-toolbar-secondary"
            title="Làm mới dữ liệu (F5)"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span>Làm mới <span className="kbd-hint">F5</span></span>
          </button>
          <button
            onClick={handleExportExcel}
            className="btn-toolbar btn-toolbar-success"
            title="Xuất danh sách ra file Excel"
          >
            <Download size={15} />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <FeedbackStatsCards
        stats={stats}
        currentFilterStatus={filterStatus}
        onSelectStatus={(st) => setFilterStatus(st)}
      />

      {/* Toolbar & Filters */}
      <div className="toolbar-container">
        {/* Search Box */}
        <div className="toolbar-search-box">
          <Search size={18} color="#8C7B73" />
          <input
            type="text"
            placeholder="Tìm theo mã phiếu, nội dung, người tạo, khu vực..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="toolbar-actions">
          {/* Nút lọc nâng cao */}
          <button
            onClick={() => setIsFilterBarOpen(o => !o)}
            className={`btn-toolbar ${isFilterBarOpen ? 'btn-toolbar-primary' : 'btn-toolbar-secondary'}`}
          >
            <Filter size={15} />
            <span>Bộ lọc {filterReportType !== 'all' || filterArea !== 'all' ? '(Đang bật)' : ''}</span>
          </button>

          {/* Duyệt nhanh khi đã chọn */}
          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => handleBatchConfirm('Đã tiếp nhận')}
                disabled={batchLoading}
                className="btn-toolbar btn-toolbar-secondary"
                style={{ color: '#2563EB', borderColor: '#BFDBFE', background: '#EFF6FF' }}
              >
                <span>Tiếp nhận ({selectedIds.size})</span>
              </button>
              <button
                onClick={() => handleBatchConfirm('Đã xong')}
                disabled={batchLoading}
                className="btn-toolbar btn-toolbar-primary"
              >
                <span>Hoàn tất ({selectedIds.size})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Bar Panel */}
      <FeedbackFilterBar
        isOpen={isFilterBarOpen}
        filterReportType={filterReportType}
        setFilterReportType={setFilterReportType}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterArea={filterArea}
        setFilterArea={setFilterArea}
        areas={areas}
        onReset={handleResetFilters}
      />

      {/* Data Table */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="feedback-table">
            <thead>
              <tr>
                <th style={{ width: 44, textAlign: 'center' }}>
                  <button onClick={toggleSelectAll} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isAllSelected ? <CheckSquare size={17} color="#7B5233" /> : <Square size={17} color="#A89B93" />}
                  </button>
                </th>
                <th style={{ width: 50, textAlign: 'center' }}>STT</th>
                <th style={{ width: 100 }}>Mã phiếu</th>
                <th style={{ width: 140 }}>Loại báo cáo</th>
                <th style={{ width: 110 }}>Khu vực</th>
                <th style={{ width: 130 }}>Người gửi</th>
                <th>Nội dung sự cố</th>
                <th style={{ width: 90, textAlign: 'center' }}>Hình ảnh</th>
                <th style={{ width: 130, textAlign: 'center' }}>Trạng thái</th>
                <th style={{ width: 150 }}>Người xử lý</th>
                <th style={{ width: 130 }}>Thời gian</th>
                <th style={{ width: 100, textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '60px 20px', color: '#8C7B73' }}>
                    Đang nạp dữ liệu báo cáo...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: '60px 20px', color: '#8C7B73' }}>
                    Không tìm thấy báo cáo sự cố nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report, idx) => {
                  const isSelected = selectedIds.has(report.id);
                  let imgs = [];
                  try {
                    if (typeof report.images === 'string') imgs = JSON.parse(report.images);
                    else if (Array.isArray(report.images)) imgs = report.images;
                  } catch (e) { imgs = []; }

                  return (
                    <tr
                      key={report.id}
                      className={isSelected ? 'selected' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedReport(report)}
                    >
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center' }} onClick={(e) => { e.stopPropagation(); toggleSelect(report.id); }}>
                        <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isSelected ? <CheckSquare size={17} color="#7B5233" /> : <Square size={17} color="#D8CCC3" />}
                        </button>
                      </td>

                      {/* STT */}
                      <td style={{ textAlign: 'center', color: '#8C7B73', fontWeight: 600 }}>
                        {idx + 1}
                      </td>

                      {/* Mã phiếu */}
                      <td>
                        <span className="ticket-code-pill">
                          #{report.code}
                        </span>
                      </td>

                      {/* Loại báo cáo */}
                      <td>
                        <span className={`badge-report-type ${report.report_type === 'Biên bản cuộc họp' ? 'badge-meeting' : 'badge-issue'}`}>
                          {report.report_type || 'Báo cáo vấn đề'}
                        </span>
                      </td>

                      {/* Khu vực */}
                      <td>
                        <span style={{ fontWeight: 600, color: '#4A3B32' }}>
                          {report.area || 'N/A'}
                        </span>
                      </td>

                      {/* Người gửi */}
                      <td>
                        {report.is_anonymous ? (
                          <span style={{ fontStyle: 'italic', color: '#8C7B73', fontSize: '0.82rem' }}>
                            Ẩn danh
                          </span>
                        ) : (
                          <span style={{ fontWeight: 600 }}>
                            {report.creator_name}
                          </span>
                        )}
                      </td>

                      {/* Nội dung */}
                      <td style={{ maxWidth: 320 }}>
                        <div style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: '#2C1810',
                          fontWeight: 500
                        }} title={report.main_content}>
                          {report.main_content}
                        </div>
                      </td>

                      {/* Ảnh đính kèm */}
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        {imgs.length > 0 ? (
                          <div className="table-thumbs-row" style={{ justifyContent: 'center' }}>
                            <img
                              src={imgs[0]}
                              alt="thumb"
                              className="table-thumb-item"
                              onClick={() => setLightboxImageUrl(imgs[0])}
                            />
                            {imgs.length > 1 && (
                              <span
                                style={{
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  color: '#7B5233',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setSelectedReport(report)}
                              >
                                +{imgs.length - 1}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#C4B5AA', fontSize: '0.78rem' }}>—</span>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge-status ${
                          report.status === 'Đã xong' ? 'badge-resolved' :
                          report.status === 'Đã tiếp nhận' ? 'badge-in-progress' :
                          report.status === 'Từ chối' ? 'badge-rejected' : 'badge-pending'
                        }`}>
                          <span className="badge-status-dot" />
                          {report.status || 'Chờ xử lý'}
                        </span>
                      </td>

                      {/* Người xử lý */}
                      <td>
                        <span style={{ fontSize: '0.82rem', color: '#5D473A' }}>
                          {report.handler_name || '—'}
                        </span>
                      </td>

                      {/* Thời gian */}
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#8C7B73' }}>
                          {report.created_at}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="btn-toolbar btn-toolbar-secondary"
                          style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                        >
                          <Edit size={13} />
                          <span>Xử lý</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Chi tiết & Xử lý */}
      {selectedReport && (
        <FeedbackDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onSaved={() => fetchReports()}
          onDelete={() => fetchReports()}
          onImageClick={(url) => setLightboxImageUrl(url)}
        />
      )}

      {/* Lightbox Xem Ảnh Phóng To */}
      {lightboxImageUrl && (
        <ImageLightboxModal
          imageUrl={lightboxImageUrl}
          onClose={() => setLightboxImageUrl(null)}
        />
      )}
    </div>
  );
};

export default FeedbackOverviewView;
