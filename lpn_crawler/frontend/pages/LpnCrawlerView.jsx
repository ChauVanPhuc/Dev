import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { lpnCrawlerApi } from '../services/api';
import { ControlPanel } from '../components/ControlPanel';
import { ContainerTableView } from '../components/ContainerTableView';
import { ContainerDetailModal } from '../components/ContainerDetailModal';
import { DetailModal } from '../components/DetailModal';
import { LogModal } from '../components/LogModal';
import { CrawlMonitorModal } from '../components/CrawlMonitorModal';
import { SyncDualMonitorModal } from '../components/SyncDualMonitorModal';
import { ForceRestartModal } from '../components/ForceRestartModal';
import { MissingRowsModal } from '../components/MissingRowsModal';
import { ConfirmDialogModal } from '../components/ConfirmDialogModal';
import { Toast } from '../components/Toast';
import { AiOcrScanModal } from '../components/AiOcrScanModal';
import { BatchContainerScanModal } from '../components/BatchContainerScanModal';
import { DashboardModal } from '../components/DashboardModal';
import { ZaloBotSettingsModal } from '../components/ZaloBotSettingsModal';
import { LayoutDashboard } from 'lucide-react';
import useUiStore from '@shared/store/uiStore';
import '../styles/lpnCrawler.css';

export default function LpnCrawlerView() {
  const outletContext = useOutletContext() || {};
  const setCustomTitle = outletContext.setCustomTitle || (() => {});
  const setCustomSubtitle = outletContext.setCustomSubtitle || (() => {});
  const setHeaderRightExtra = outletContext.setHeaderRightExtra || (() => {});

  const { isLpnDashboardOpen, setLpnDashboardOpen } = useUiStore();

  const [showBatchScanModal, setShowBatchScanModal] = useState(false);
  const [unscannedCount, setUnscannedCount] = useState(null);

  // Master Data & KPI States
  const [kpiStats, setKpiStats] = useState({
    total_containers: 0,
    total_sku_rows: 0,
    total_images: 0,
    total_missing_rows: 0
  });

  const [showDashboardModal, setShowDashboardModal] = useState(false);

  const [currentJob, setCurrentJob] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortOption, setSortOption] = useState('date-desc');
  const [loading, setLoading] = useState(false);
  const [liveLogs, setLiveLogs] = useState([]);
  const [crawlerLogs, setCrawlerLogs] = useState([]);
  const [ocrLogs, setOcrLogs] = useState([]);
  const [progressData, setProgressData] = useState(null);

  // Filters State
  const [filters, setFilters] = useState({
    search: '',
    container_number: '',
    factory: '',
    operator_name: '',
    batch: '',
    sku: '',
    lpn: '',
    year: '',
    month: '',
    startDate: '',
    endDate: ''
  });

  // View Mode: 'table' vs 'cards' (Default: 'table' theo thiết kế chuẩn)
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('lpn_view_mode') || 'table';
    } catch (e) {
      return 'table';
    }
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setItems([]);
    setPage(1);
    pageRef.current = 1;
    viewModeRef.current = mode;
    try {
      localStorage.setItem('lpn_view_mode', mode);
    } catch (e) {}
  };

  // Refs to avoid stale closures in SSE callbacks - always keep in sync synchronously
  const filtersRef = useRef(filters);
  const sortOptionRef = useRef(sortOption);
  const pageRef = useRef(page);
  const pageSizeRef = useRef(pageSize);
  const viewModeRef = useRef(viewMode);

  filtersRef.current = filters;
  sortOptionRef.current = sortOption;
  pageRef.current = page;
  pageSizeRef.current = pageSize;
  viewModeRef.current = viewMode;

  // Modals & Dialogs
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemsList, setSelectedItemsList] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showMonitorModal, setShowMonitorModal] = useState(false);
  const [showSyncMonitorModal, setShowSyncMonitorModal] = useState(false);
  const [syncOcrLiveFeed, setSyncOcrLiveFeed] = useState([]);
  const [syncOcrLatest, setSyncOcrLatest] = useState(null);
  const [isSyncActive, setIsSyncActive] = useState(false);
  const [showForceRestartModal, setShowForceRestartModal] = useState(false);
  const [missingRowsConfig, setMissingRowsConfig] = useState({
    isOpen: false,
    startDate: null,
    endDate: null,
    dateRangeLabel: null,
    isAllTime: false
  });
  const [showAiOcrScanModal, setShowAiOcrScanModal] = useState(false);
  const [showZaloSettingsModal, setShowZaloSettingsModal] = useState(false);
  const [zaloStatus, setZaloStatus] = useState({ is_connected: false, is_configured: false });
  const [forceRestartMessage, setForceRestartMessage] = useState('');

  // Tải trạng thái Zalo Bot
  const refreshZaloStatus = useCallback(() => {
    lpnCrawlerApi.getZaloStatus().then((st) => setZaloStatus(st || {})).catch(() => {});
  }, []);

  useEffect(() => {
    refreshZaloStatus();
  }, [refreshZaloStatus]);

  const handleResendZalo = async (container) => {
    const cId = container.container_id || container.id;
    try {
      showToast('info', `Đang gửi báo cáo Zalo cho Container ${container.container_number}...`);
      const res = await lpnCrawlerApi.resendContainerZaloReport(cId);
      showToast('success', res.message || `Đã gửi báo cáo Zalo thành công!`);
      fetchContainers(true);
      refreshZaloStatus();
    } catch (err) {
      showToast('error', err.message || 'Lỗi khi gửi báo cáo Zalo');
    }
  };

  const handleOpenMissingRows = (config = null) => {
    const stats7d = kpiStats?.recent_7days || kpiStats || {};

    if (config?.isAllTime) {
      setMissingRowsConfig({
        isOpen: true,
        startDate: null,
        endDate: null,
        dateRangeLabel: 'Toàn hệ thống',
        isAllTime: true
      });
      return;
    }

    const sDate = config?.startDate || filters.startDate || stats7d.start_date || stats7d.start_date_iso;
    const eDate = config?.endDate || filters.endDate || stats7d.end_date || stats7d.end_date_iso;
    const label = config?.dateRangeLabel || 
      (filters.startDate && filters.endDate ? `${filters.startDate} - ${filters.endDate}` : stats7d.date_range_label);

    setMissingRowsConfig({
      isOpen: true,
      startDate: sDate,
      endDate: eDate,
      dateRangeLabel: label,
      isAllTime: false
    });
  };

  // Custom Confirm Dialog State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: 'danger',
    title: '',
    description: '',
    message: '',
    confirmText: 'Xác Nhận',
    cancelText: 'Hủy Bỏ',
    loading: false,
    onConfirm: () => {}
  });

  // Custom Toast State
  const [toast, setToast] = useState({
    show: false,
    type: 'success',
    message: ''
  });

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
  };

  const isRunning = currentJob?.status === 'running' || currentJob?.status === 'pending';
  const isSyncing = isRunning && (Boolean(currentJob?.is_sync_mode) || isSyncActive);

  // Set Page Header Title
  useEffect(() => {
    setCustomTitle('Quản lý Crawl Dữ Liệu Container & LPN');
    setCustomSubtitle('Tự động crawl dữ liệu Container, Pallet, Box, Batch và hình ảnh từ AppSheet');
  }, [setCustomTitle, setCustomSubtitle]);

  // Khởi tạo thông tin Job và KPI một lần khi vào trang
  useEffect(() => {
    fetchCurrentJob();
    fetchKpiStats();
  }, []);

  // Tải danh sách Container khi chuyển trang, đổi bộ lọc hoặc đổi kiểu sắp xếp
  useEffect(() => {
    fetchContainers();
  }, [page, pageSize, filters, sortOption, viewMode]);

  // Tự động đồng bộ số liệu KPI ngoài màn hình mỗi 45 giây (thay vì 10 giây để tránh nghẽn)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchKpiStats();
    }, 45000);
    return () => clearInterval(timer);
  }, []);

  // Auto show monitor popup if job is active upon entering screen
  useEffect(() => {
    if (currentJob && (currentJob.status === 'running' || currentJob.status === 'pending')) {
      if (currentJob.is_sync_mode || isSyncActive) {
        setShowSyncMonitorModal(true);
      } else {
        setShowMonitorModal(true);
      }
    }
  }, [currentJob?.id, currentJob?.status]);

  // Nạp log lịch sử từ Database khi phát hiện Job đang hoạt động để modal không bị rỗng log
  useEffect(() => {
    const activeJobId = currentJob?.id;
    if (activeJobId && typeof activeJobId === 'number') {
      lpnCrawlerApi.getLogs({ jobId: activeJobId, limit: 300 }).then((res) => {
        const rawLogs = Array.isArray(res) ? res : (res?.items || []);
        if (rawLogs.length > 0) {
          const cLogs = [];
          const oLogs = [];
          const normalizedLogs = rawLogs.map((l) => {
            if (typeof l === 'object' && l !== null) {
              let ts = l.timestamp;
              if (!ts && l.created_at) {
                const s = String(l.created_at);
                const match = s.match(/(\d{2}:\d{2}:\d{2})/);
                if (match) {
                  ts = match[1];
                } else {
                  try {
                    const d = new Date(s);
                    if (!isNaN(d.getTime())) {
                      ts = d.toLocaleTimeString('vi-VN', { hour12: false });
                    }
                  } catch (e) {}
                }
              }
              return { ...l, timestamp: ts };
            }
            return l;
          });

          normalizedLogs.forEach((l) => {
            const isOcr = (typeof l === 'object' && l !== null && l.source === 'ai_ocr') ||
              (typeof l === 'string' && (l.includes('[AI OCR]') || l.includes('[AI OCR Lỗi]') || l.includes('Dual-Engine'))) ||
              (typeof l === 'object' && l?.message && (l.message.includes('[AI OCR]') || l.message.includes('[AI OCR Lỗi]') || l.message.includes('Dual-Engine')));
            if (isOcr) {
              oLogs.push(l);
            } else {
              cLogs.push(l);
            }
          });
          setCrawlerLogs(cLogs.slice(-500));
          setOcrLogs(oLogs.slice(-500));
          setLiveLogs(normalizedLogs.slice(-500));
        }
      }).catch((e) => console.warn('[LpnCrawlerView] Lỗi nạp log lịch sử:', e));

      lpnCrawlerApi.getBatchScanResults({ limit: 100 }).then((res) => {
        const feed = res?.results || res?.items || [];
        if (feed.length > 0) {
          setSyncOcrLiveFeed(feed.slice().reverse());
        }
      }).catch((e) => console.warn('[LpnCrawlerView] Lỗi nạp lịch sử OCR feed:', e));
    }
  }, [currentJob?.id]);

  // SSE Subscription for active job
  useEffect(() => {
    if (!currentJob || typeof currentJob.id !== 'number' || (currentJob.status !== 'running' && currentJob.status !== 'pending')) return;

    const sse = lpnCrawlerApi.subscribeJobSSE(
      currentJob.id,
      (prog) => {
        setProgressData(prog);
        if (prog?.current_status === 'FAILED') {
          setIsPaused(false);
          setIsSyncActive(false);
          setShowMonitorModal(false);
          setShowSyncMonitorModal(false);
          const errorMsg = prog.current_action || 'Tiến trình đã bị dừng do lỗi.';
          setConfirmModal({
            isOpen: true,
            type: 'danger',
            title: 'Tiến Trình Crawl Thất Bại',
            message: `Tiến trình cào dữ liệu đã dừng hoàn toàn do phát sinh lỗi:\n\n${errorMsg}`,
            confirmText: 'Đã Hiểu',
            cancelText: '',
            loading: false,
            onConfirm: () => {
              setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            }
          });
          showToast('error', `Tiến trình crawl thất bại: ${errorMsg}`);
          fetchCurrentJob();
        }
      },
      (log) => {
        let normalizedLog = log;
        if (typeof log === 'string') {
          normalizedLog = {
            message: log,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false })
          };
        } else if (typeof log === 'object' && log !== null && !log.timestamp && !log.created_at) {
          normalizedLog = {
            ...log,
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false })
          };
        }

        setLiveLogs((prev) => [...prev, normalizedLog].slice(-500));
        const isOcr = (typeof normalizedLog === 'object' && normalizedLog !== null && normalizedLog.source === 'ai_ocr') ||
          (typeof normalizedLog === 'string' && (normalizedLog.includes('[AI OCR]') || normalizedLog.includes('[AI OCR Lỗi]') || normalizedLog.includes('Dual-Engine'))) ||
          (typeof normalizedLog === 'object' && normalizedLog?.message && (normalizedLog.message.includes('[AI OCR]') || normalizedLog.message.includes('[AI OCR Lỗi]') || normalizedLog.message.includes('Dual-Engine')));
        if (isOcr) {
          setOcrLogs((prev) => [...prev, normalizedLog].slice(-500));
        } else {
          setCrawlerLogs((prev) => [...prev, normalizedLog].slice(-500));
        }
      },
      (st) => {
        if (st && st.status) {
          const isFailed = st.status === 'failed';
          const isAuth = st.status === 'auth_required';
          const errorMsg = st.error_message || (isAuth ? 'Yêu cầu xác minh tài khoản Google hoặc 2FA trên cửa sổ Chrome.' : 'Tiến trình đã bị dừng do lỗi.');

          if (st.status !== 'running' && st.status !== 'pending') {
            setIsSyncActive(false);
          }

          setCurrentJob(prev => prev ? { ...prev, status: st.status, error_message: errorMsg } : null);

          if (isFailed || isAuth) {
            setIsPaused(false);
            setIsSyncActive(false);
            setShowMonitorModal(false);
            setShowSyncMonitorModal(false);
            setProgressData({
              percent: 0,
              current_container: '—',
              current_status: 'FAILED',
              current_action: `Job thất bại: ${errorMsg}`
            });

            // Hiện Popup thông báo lỗi thất bại trên màn hình chính
            setConfirmModal({
              isOpen: true,
              type: 'danger',
              title: isAuth ? 'Yêu Cầu Xác Minh Tài Khoản' : 'Tiến Trình Crawl Thất Bại',
              message: `Tiến trình cào dữ liệu đã dừng hoàn toàn do phát sinh lỗi:\n\n${errorMsg}`,
              confirmText: 'Đã Hiểu',
              cancelText: '',
              loading: false,
              onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
              }
            });

            showToast('error', `Tiến trình crawl thất bại: ${errorMsg}`);
          }
        }
        fetchCurrentJob();
        fetchContainers(true);
        fetchKpiStats();
      },
      // onDataUpdated: Kích hoạt refresh DataTable ngay khi Backend lưu xong 1 Container
      (_dataEvt) => {
        fetchContainers(true);
        fetchKpiStats();
      },
      // onSyncOcr: Kích hoạt khi có ảnh vừa hoàn tất AI OCR
      (ocrEvt) => {
        if (ocrEvt?.data) {
          setSyncOcrLatest(ocrEvt.data);
          setSyncOcrLiveFeed((prev) => [...prev, ocrEvt.data].slice(-100));
          // Định kỳ cập nhật lại KPI và Danh Sách Thiếu/Lệch khi AI OCR khớp dữ liệu
          const scanned = ocrEvt.data?.stats?.total_scanned || 0;
          if (scanned % 5 === 0 || ocrEvt.data?.is_missing_recheck) {
            fetchKpiStats();
          }
        }
      }
    );

    return () => {
      sse.close();
    };
  }, [currentJob?.id, currentJob?.status]);

  const fetchCurrentJob = async () => {
    try {
      const job = await lpnCrawlerApi.getCurrentJob();
      setCurrentJob(job);
      return job;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const fetchKpiStats = async () => {
    try {
      const stats = await lpnCrawlerApi.getStats();
      if (stats) {
        setKpiStats(stats);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchContainers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const activeFilters = filtersRef.current || filters;
      const activeSort = sortOptionRef.current || sortOption;
      const activePage = pageRef.current || page;
      const activePageSize = pageSizeRef.current || pageSize;

      const res = await lpnCrawlerApi.getContainerCards({
        ...activeFilters,
        sort: activeSort,
        page: activePage,
        page_size: activePageSize || 15
      });
      setItems(res.items || []);
      setTotal(res.total || 0);

      // Cập nhật số lượng Container chưa quét (chỉ cần chạy ở trang đầu để tránh nghẽn khi lật trang)
      if (activePage === 1) {
        lpnCrawlerApi.getUnscannedContainers({ ...activeFilters, limit: 1 }).then((uRes) => {
          setUnscannedCount(uRes.total_containers);
        }).catch(() => {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSelectContainer = useCallback(async (card) => {
    if (!card || !card.container_id) return;
    try {
      const detail = await lpnCrawlerApi.getContainerDetail(card.container_id);
      if (detail) {
        setSelectedContainer(detail);
      }
    } catch (e) {
      console.error('[LPN] getContainerDetail failed:', e);
      showToast('error', `Không thể tải chi tiết container: ${e.message}`);
    }
  }, []);

  const handleSelectItem = async (itemOrId) => {
    if (!itemOrId) return;
    if (typeof itemOrId === 'object') {
      setSelectedItem(itemOrId);
      return;
    }
    try {
      const detail = await lpnCrawlerApi.getItemDetail(itemOrId);
      if (detail) {
        setSelectedItem(detail);
      }
    } catch (e) {
      console.error('[LPN] getItemDetail failed:', e);
      showToast('error', `Không thể tải chi tiết item: ${e.message}`);
    }
  };

  const handleToggleSelectRow = useCallback((itemId) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  }, []);

  const handleToggleSelectAll = useCallback((currentPageIds) => {
    setSelectedItemIds((prev) => {
      const isAllSelected = currentPageIds.every((id) => prev.includes(id));
      if (isAllSelected) {
        return prev.filter((id) => !currentPageIds.includes(id));
      } else {
        return Array.from(new Set([...prev, ...currentPageIds]));
      }
    });
  }, []);

  const handleDeleteSelected = () => {
    if (!selectedItemIds || selectedItemIds.length === 0) return;

    // Nếu chọn tất cả (bằng tổng số bản ghi) → cảnh báo xóa toàn bộ CSDL
    const isDeleteAll = total > 0 && selectedItemIds.length >= total;

    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: isDeleteAll ? 'Cảnh Báo Xóa Toàn Bộ Cơ Sở Dữ Liệu' : 'Xác Nhận Xóa Dòng Dữ Liệu',
      message: isDeleteAll
        ? `Bạn đang chọn TẤT CẢ ${total} bản ghi. Thao tác này sẽ XÓA TOÀN BỘ dữ liệu trong CSDL (Container, Pallet, Box, Hình ảnh). Thao tác này không thể khôi phục!`
        : `Bạn có chắc chắn muốn xóa ${selectedItemIds.length} dòng dữ liệu đã chọn? Dữ liệu và hình ảnh liên quan sẽ bị xóa vĩnh viễn.`,
      confirmText: isDeleteAll ? 'Xóa Toàn Bộ Dữ Liệu' : `Xóa ${selectedItemIds.length} Dòng`,
      cancelText: 'Hủy Bỏ',
      loading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, loading: true }));
        try {
          if (isDeleteAll) {
            await lpnCrawlerApi.deleteAllItems();
          } else {
            await lpnCrawlerApi.batchDeleteItems(selectedItemIds);
          }
          setSelectedItemIds([]);
          setConfirmModal((prev) => ({ ...prev, isOpen: false, loading: false }));
          await Promise.all([fetchContainers(), fetchKpiStats()]);
          showToast('success', isDeleteAll ? 'Đã xóa toàn bộ dữ liệu CSDL thành công.' : 'Đã xóa các dòng dữ liệu đã chọn thành công.');
        } catch (e) {
          setConfirmModal((prev) => ({ ...prev, isOpen: false, loading: false }));
          showToast('error', e.message || 'Lỗi khi xóa dữ liệu');
        }
      }
    });
  };

  const handleStartCrawl = async (force = false, mode = 'full') => {
    try {
      // Reset hoàn toàn state cũ để không bị nhận nhầm status cancelled từ job trước
      setLiveLogs([]);
      setCrawlerLogs([]);
      setOcrLogs([]);
      setProgressData({
        percent: 0,
        current_status: 'STARTING',
        current_action: 'Đang khởi tạo tiến trình Crawl AppSheet...',
        processed: 0,
        total: 0
      });
      setCurrentJob({
        id: 'starting',
        status: 'pending',
        containers_processed: 0,
        total_containers_found: 0
      });
      setShowMonitorModal(true);
      setShowForceRestartModal(false);

      const job = await lpnCrawlerApi.startCrawlJob(force, mode);
      setCurrentJob(job);
    } catch (e) {
      setShowMonitorModal(false);
      setProgressData(null);
      if (e.status === 409) {
        setForceRestartMessage(
          e.message || 'Hệ thống phát hiện đang có một Tiến Trình Crawl trước đó chưa hoàn tất hoặc bị khóa trong bộ nhớ.'
        );
        setShowForceRestartModal(true);
      } else {
        setConfirmModal({
          isOpen: true,
          type: 'danger',
          title: 'Khởi Chạy Crawl Thất Bại',
          message: e.message || 'Không thể bắt đầu job crawl do phát sinh lỗi kết nối máy chủ.',
          confirmText: 'Đã Hiểu',
          cancelText: '',
          loading: false,
          onConfirm: () => {
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          }
        });
        showToast('error', e.message || 'Không thể bắt đầu job crawl');
        fetchCurrentJob();
      }
    }
  };

  const handleStopCrawl = async () => {
    try {
      let activeJob = currentJob;
      if (!activeJob || !activeJob.id || typeof activeJob.id !== 'number') {
        activeJob = await lpnCrawlerApi.getCurrentJob();
      }
      if (activeJob && activeJob.id && typeof activeJob.id === 'number') {
        await lpnCrawlerApi.stopCrawlJob(activeJob.id);
      } else {
        await lpnCrawlerApi.resetLocks();
      }
      setShowMonitorModal(false);
      setProgressData(null);
      setIsPaused(false);
      await fetchCurrentJob();
      fetchContainers();
      fetchKpiStats();
      showToast('info', 'Đã dừng hoàn toàn tiến trình crawl.');
    } catch (e) {
      await lpnCrawlerApi.resetLocks();
      setShowMonitorModal(false);
      setProgressData(null);
      setIsPaused(false);
      await fetchCurrentJob();
    }
  };

  const handleOpenMonitor = async () => {
    let job = currentJob;
    if (!job) {
      job = await fetchCurrentJob();
    }
    setShowMonitorModal(true);
  };

  const handleExportExcel = () => {
    const url = lpnCrawlerApi.getExportExcelUrl(filters);
    window.open(url, '_blank');
  };

  const handleFilterChange = (key, val) => {
    let nextFilters;
    if (key === 'reset') {
      nextFilters = {
        search: '',
        container_number: '',
        factory: '',
        operator_name: '',
        batch: '',
        sku: '',
        lpn: '',
        year: '',
        month: '',
        startDate: '',
        endDate: ''
      };
    } else {
      nextFilters = { ...filters, [key]: val };
    }
    filtersRef.current = nextFilters;
    setFilters(nextFilters);
    setItems([]);
    setPage(1);
    pageRef.current = 1;
  };

  const handleSortChange = (val) => {
    setSortOption(val);
    setPage(1);
  };

  const [isPaused, setIsPaused] = useState(false);

  // Sync isPaused state with SSE progressData
  useEffect(() => {
    if (progressData?.current_status === 'PAUSED') {
      setIsPaused(true);
    } else if (progressData?.current_status === 'CRAWLING' || progressData?.current_status === 'DONE') {
      setIsPaused(false);
    }
  }, [progressData?.current_status]);

  const handlePauseCrawl = async () => {
    if (!currentJob || !currentJob.id) return;
    setIsPaused(true);
    try {
      await lpnCrawlerApi.pauseCrawlJob(currentJob.id);
      showToast('warning', 'Đã tạm dừng tiến trình crawl.');
    } catch (err) {
      setIsPaused(false);
      showToast('error', err.message || 'Lỗi khi tạm dừng');
    }
  };

  const handleResumeCrawl = async () => {
    if (!currentJob || !currentJob.id) return;
    setIsPaused(false);
    try {
      await lpnCrawlerApi.resumeCrawlJob(currentJob.id);
      showToast('success', 'Đã tiếp tục tiến trình crawl.');
    } catch (err) {
      setIsPaused(true);
      showToast('error', err.message || 'Lỗi khi tiếp tục');
    }
  };

  const handleStartSync = async (force = false, mode = 'incremental') => {
    try {
      setLiveLogs([]);
      setCrawlerLogs([]);
      setOcrLogs([]);
      setSyncOcrLiveFeed([]);
      setSyncOcrLatest(null);
      setIsPaused(false);
      setIsSyncActive(true);
      setShowSyncMonitorModal(true);

      setProgressData({
        percent: 0,
        current_container: '—',
        current_action: 'Đang kết nối AppSheet và kiểm tra dữ liệu mới...',
        processed: 0,
        total: 0,
        items_crawled: 0,
        images_downloaded: 0,
        sku_crawled: 0,
        speed_str: '—',
        crawl_mode: 'Cập nhật dữ liệu mới',
        eta_seconds: null,
        current_status: 'STARTING'
      });

      const res = await lpnCrawlerApi.startSyncJob(force, mode);
      if (res && res.id) {
        setCurrentJob({ ...res, is_sync_mode: false, auto_ocr: false });
        showToast('success', `Đã khởi chạy Cập nhật dữ liệu thành công (Job #${res.id})`);
      }
    } catch (err) {
      setIsSyncActive(false);
      if (err.status === 409 || err.message?.includes('409') || err.message?.includes('Tiến Trình Crawl đang chạy')) {
        setForceRestartMessage(err.detail?.message || err.message || 'Đang có tiến trình cào dữ liệu chạy ngầm.');
        setShowForceRestartModal(true);
      } else {
        showToast('error', err.message || 'Lỗi khi kích hoạt Đồng bộ.');
      }
    }
  };

  const handleStopSync = async () => {
    try {
      let activeJob = currentJob;
      if (!activeJob || !activeJob.id || typeof activeJob.id !== 'number') {
        activeJob = await lpnCrawlerApi.getCurrentJob();
      }
      if (activeJob && activeJob.id && typeof activeJob.id === 'number') {
        await lpnCrawlerApi.stopCrawlJob(activeJob.id);
        setCurrentJob(prev => prev ? { ...prev, status: 'cancelled' } : { id: 0, status: 'cancelled' });
        setIsSyncActive(false);
        setIsPaused(false);
        showToast('success', `Đã phát lệnh Dừng Đồng Bộ thành công (Job #${activeJob.id}).`);
      } else {
        await lpnCrawlerApi.resetLocks();
        setCurrentJob(prev => prev ? { ...prev, status: 'cancelled' } : { id: 0, status: 'cancelled' });
        setIsSyncActive(false);
        setIsPaused(false);
        showToast('info', 'Đã giải phóng toàn bộ khóa tiến trình.');
      }
      setProgressData(prev => ({
        ...(prev || {}),
        current_status: 'CANCELLED',
        current_action: 'Tiến trình đồng bộ đã dừng.'
      }));
    } catch (err) {
      showToast('error', `Lỗi dừng đồng bộ: ${err.message || err}`);
    }
  };

  return (
    <div className="lpn-container">
      {/* Toast Notification */}
      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />

      {/* Control Panel (4 KPI Stat Cards + Toolbar) */}
      <ControlPanel
        currentJob={currentJob}
        progressData={progressData}
        isPaused={isPaused}
        kpiStats={kpiStats}
        pageSize={pageSize}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        filters={filters}
        onFilterChange={handleFilterChange}
        sortOption={sortOption}
        onSortChange={handleSortChange}
        selectedItemIds={selectedItemIds}
        total={total}
        onDeleteSelected={handleDeleteSelected}
        onStartCrawl={() => handleStartCrawl(false)}
        onPauseCrawl={handlePauseCrawl}
        onResumeCrawl={handleResumeCrawl}
        onStopCrawl={handleStopCrawl}
        onExportExcel={handleExportExcel}
        onOpenLogs={() => setShowLogModal(true)}
        onOpenMonitor={handleOpenMonitor}
        onOpenMissingRows={handleOpenMissingRows}
        onOpenAiOcrScan={() => setShowAiOcrScanModal(true)}
        onSync={() => handleStartSync(false)}
        isSyncing={isSyncing}
        onStartSync={() => handleStartSync(false)}
        onStopSync={handleStopSync}
        onOpenSyncMonitor={() => setShowSyncMonitorModal(true)}
        onOpenBatchScan={() => setShowBatchScanModal(true)}
        unscannedCount={unscannedCount}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onOpenZaloSettings={() => setShowZaloSettingsModal(true)}
        zaloStatus={zaloStatus}
      />

      {/* Main Data Display: Bảng Danh Sách Container */}
      <ContainerTableView
        items={items}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(newPage) => setPage(newPage)}
        onSelectContainer={handleSelectContainer}
        selectedContainerIds={selectedItemIds}
        onToggleSelectRow={handleToggleSelectRow}
        onToggleSelectAll={handleToggleSelectAll}
        onResendZalo={handleResendZalo}
        loading={loading}
      />

      {/* Custom Styled Confirm / Alert Dialog */}
      <ConfirmDialogModal
        isOpen={confirmModal.isOpen}
        type={confirmModal.type}
        title={confirmModal.title}
        description={confirmModal.description}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        loading={confirmModal.loading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Custom Force Restart Confirmation Modal */}
      {showForceRestartModal && (
        <ForceRestartModal
          message={forceRestartMessage}
          onConfirm={() => {
            setShowForceRestartModal(false);
            handleStartCrawl(true, 'full');
          }}
          onCancel={() => setShowForceRestartModal(false)}
        />
      )}

      {/* Live Crawl Monitor Popup / Overlay */}
      {showMonitorModal && (
        <CrawlMonitorModal
          currentJob={currentJob}
          progressData={progressData}
          liveLogs={liveLogs}
          onStopCrawl={handleStopCrawl}
          onClose={() => setShowMonitorModal(false)}
        />
      )}

      {/* Live Sync Dual Monitor Popup / Overlay (Crawl & Realtime AI OCR) */}
      {showSyncMonitorModal && (
        <SyncDualMonitorModal
          currentJob={currentJob}
          progressData={progressData}
          liveLogs={liveLogs}
          crawlerLogs={crawlerLogs}
          ocrLogs={ocrLogs}
          syncOcrLiveFeed={syncOcrLiveFeed}
          syncOcrLatest={syncOcrLatest}
          onStartSync={() => handleStartSync(false)}
          onStopSync={handleStopSync}
          onClose={() => setShowSyncMonitorModal(false)}
        />
      )}

      {/* Container Detail Modal — Xem toàn bộ thẻ kiện hàng Pallet theo LPN trong container */}
      {selectedContainer && (
        <ContainerDetailModal
          containerData={selectedContainer}
          onSelectItemDetail={(item, itemsList) => {
            setSelectedItem(item);
            setSelectedItemsList(itemsList || selectedContainer.items || []);
          }}
          onClose={() => {
            setSelectedContainer(null);
            fetchContainers(true);
            fetchKpiStats();
          }}
          onContainerUpdate={(updatedContainer) => {
            setSelectedContainer(updatedContainer);
            // Cập nhật ngay dòng tương ứng ngoài bảng để badge đổi tức thì mà không cần F5
            setItems((prevItems) =>
              prevItems.map((c) =>
                (c.container_id === updatedContainer.container_id || c.id === updatedContainer.id || c.container_id === updatedContainer.id)
                  ? {
                      ...c,
                      status_code: updatedContainer.status_code,
                      status_label: updatedContainer.status_label,
                      ocr_scanned_count: updatedContainer.ocr_scanned_count,
                      ocr_matched_count: updatedContainer.ocr_matched_count,
                      ocr_mismatch_count: updatedContainer.ocr_mismatch_count,
                      is_valid: updatedContainer.status_code === 'PASSED'
                    }
                  : c
              )
            );
            fetchKpiStats();
          }}
        />
      )}

      {/* Item Detail Modal — mở theo item_id từng row */}
      {selectedItem && (
        <DetailModal
          item={selectedItem}
          itemsList={selectedItemsList.length > 0 ? selectedItemsList : items}
          onNavigate={(nextItem) => setSelectedItem(nextItem)}
          onClose={() => {
            setSelectedItem(null);
            setSelectedItemsList([]);
            fetchKpiStats();
            const cId = selectedContainer?.container_id || selectedContainer?.id;
            if (cId) {
              lpnCrawlerApi.getContainerDetail(cId).then((fresh) => {
                if (fresh && fresh.items) setSelectedContainer({ ...fresh });
              }).catch(() => {});
            }
          }}
          onResolveSuccess={(scanData) => {
            fetchKpiStats();
            fetchContainers(true);
            // Cập nhật tức thì item trong selectedContainer ngay lập tức (zero delay)
            if (scanData && scanData.item_id) {
              setSelectedContainer((prev) => {
                if (!prev || !prev.items) return prev;
                const newItems = prev.items.map((it) => {
                  if (it.id === scanData.item_id) {
                    const hasItemSku = Boolean(
                      it.sku &&
                      String(it.sku).trim() !== '' &&
                      String(it.sku).trim() !== 'None' &&
                      String(it.sku).trim() !== '0' &&
                      String(it.sku).trim() !== '—'
                    );
                    const isPassed = Boolean(
                      scanData.status === 'success' &&
                      scanData.is_lpn_match &&
                      (!hasItemSku || scanData.is_sku_match)
                    );
                    return {
                      ...it,
                      resolution_status: scanData.resolution_status || (isPassed ? 'resolved' : it.resolution_status),
                      ocr: {
                        ...(it.ocr || {}),
                        id: scanData.id || it.ocr?.id,
                        image_id: scanData.image_id,
                        status: scanData.status,
                        is_lpn_match: Boolean(scanData.is_lpn_match),
                        is_sku_match: Boolean(scanData.is_sku_match),
                        detected_lpn: scanData.detected_lpn,
                        detected_sku: scanData.detected_sku,
                        confidence: scanData.confidence,
                        error_reason: scanData.error_reason,
                        scanned_at: scanData.scanned_at
                      }
                    };
                  }
                  return it;
                });
                return { ...prev, items: newItems };
              });
            }
            const cId = selectedContainer?.container_id || selectedContainer?.id;
            if (cId) {
              lpnCrawlerApi.getContainerDetail(cId).then((fresh) => {
                if (fresh && fresh.items) setSelectedContainer({ ...fresh });
              }).catch(() => {});
            }
          }}
        />
      )}

      {/* Popup Danh Sách Dòng Thiếu Dữ Liệu */}
      {missingRowsConfig.isOpen && (
        <MissingRowsModal
          isOpen={missingRowsConfig.isOpen}
          startDate={missingRowsConfig.startDate}
          endDate={missingRowsConfig.endDate}
          dateRangeLabel={missingRowsConfig.dateRangeLabel}
          isAllTime={missingRowsConfig.isAllTime}
          onClose={() => {
            setMissingRowsConfig(prev => ({ ...prev, isOpen: false }));
            fetchKpiStats();
          }}
          onRefreshKpi={fetchKpiStats}
          onSelectItem={(itemId) => {
            handleSelectItem(itemId);
          }}
          onStartCrawl={(force, mode) => {
            setMissingRowsConfig(prev => ({ ...prev, isOpen: false }));
            handleStartCrawl(force, mode);
          }}
        />
      )}

      {/* Logs Viewer Modal */}
      {showLogModal && (
        <LogModal
          onClose={() => setShowLogModal(false)}
        />
      )}

      {/* AI OCR Batch Scan Modal */}
      {showAiOcrScanModal && (
        <AiOcrScanModal
          isOpen={showAiOcrScanModal}
          onClose={() => setShowAiOcrScanModal(false)}
        />
      )}

      {/* Batch Container Scan Modal (Quét Hàng Loạt Container Chưa Quét) */}
      {showBatchScanModal && (
        <BatchContainerScanModal
          isOpen={showBatchScanModal}
          onClose={() => setShowBatchScanModal(false)}
          currentFilters={filters}
          selectedContainerIds={selectedItemIds}
          onScanComplete={() => {
            fetchContainers(true);
            fetchKpiStats();
          }}
        />
      )}

      {/* Dashboard Modal (All-Time Data & Upcoming Charts) */}
      {(isLpnDashboardOpen || showDashboardModal) && (
        <DashboardModal
          isOpen={isLpnDashboardOpen || showDashboardModal}
          onClose={() => {
            setShowDashboardModal(false);
            setLpnDashboardOpen(false);
          }}
          allTimeStats={kpiStats?.all_time || kpiStats}
          onOpenMissingRows={(opts) => {
            setShowDashboardModal(false);
            setLpnDashboardOpen(false);
            handleOpenMissingRows(opts || { isAllTime: true });
          }}
        />
      )}

      {/* Modal Cấu hình Zalo Bot */}
      {showZaloSettingsModal && (
        <ZaloBotSettingsModal
          isOpen={showZaloSettingsModal}
          onClose={() => {
            setShowZaloSettingsModal(false);
            refreshZaloStatus();
          }}
          onShowToast={(msg, type) => showToast(type || 'info', msg)}
        />
      )}
    </div>
  );
}

