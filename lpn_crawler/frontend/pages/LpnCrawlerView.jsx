import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { lpnCrawlerApi } from '../services/api';
import { ControlPanel } from '../components/ControlPanel';
import { DataTable } from '../components/DataTable';
import { ContainerCardView } from '../components/ContainerCardView';
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
import { DashboardModal } from '../components/DashboardModal';
import { LayoutDashboard } from 'lucide-react';
import useUiStore from '@shared/store/uiStore';
import '../styles/lpnCrawler.css';

export default function LpnCrawlerView() {
  const outletContext = useOutletContext() || {};
  const setCustomTitle = outletContext.setCustomTitle || (() => {});
  const setCustomSubtitle = outletContext.setCustomSubtitle || (() => {});
  const setHeaderRightExtra = outletContext.setHeaderRightExtra || (() => {});

  const { isLpnDashboardOpen, setLpnDashboardOpen } = useUiStore();

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
  const [forceRestartMessage, setForceRestartMessage] = useState('');

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

  // Load Initial Job, KPI Stats & Data
  useEffect(() => {
    fetchCurrentJob();
    fetchContainers();
    fetchKpiStats();
  }, [page, pageSize, filters, sortOption, viewMode]);

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
          rawLogs.forEach((l) => {
            const isOcr = (typeof l === 'object' && l !== null && l.source === 'ai_ocr') ||
              (typeof l === 'string' && (l.startsWith('[AI OCR]') || l.startsWith('[AI OCR Lỗi]'))) ||
              (typeof l === 'object' && l?.message && (l.message.startsWith('[AI OCR]') || l.message.startsWith('[AI OCR Lỗi]')));
            if (isOcr) {
              oLogs.push(l);
            } else {
              cLogs.push(l);
            }
          });
          setCrawlerLogs(cLogs.slice(-500));
          setOcrLogs(oLogs.slice(-500));
          setLiveLogs(rawLogs.slice(-500));
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
        setLiveLogs((prev) => [...prev, log].slice(-500));
        const isOcr = (typeof log === 'object' && log !== null && log.source === 'ai_ocr') ||
          (typeof log === 'string' && (log.startsWith('[AI OCR]') || log.startsWith('[AI OCR Lỗi]'))) ||
          (typeof log === 'object' && log?.message && (log.message.startsWith('[AI OCR]') || log.message.startsWith('[AI OCR Lỗi]')));
        if (isOcr) {
          setOcrLogs((prev) => [...prev, log].slice(-500));
        } else {
          setCrawlerLogs((prev) => [...prev, log].slice(-500));
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
      const activeFilters = filters;
      const activeSort = sortOption;
      const activePage = page;
      const activePageSize = pageSize;
      const currentMode = viewMode;

      if (currentMode === 'cards') {
        const res = await lpnCrawlerApi.getContainerCards({
          ...activeFilters,
          sort: activeSort,
          page: activePage,
          page_size: activePageSize || 24
        });
        setItems(res.items || []);
        setTotal(res.total || 0);
      } else {
        const res = await lpnCrawlerApi.getContainers({
          ...activeFilters,
          sort: activeSort,
          page: activePage,
          page_size: activePageSize || 15
        });
        setItems(res.items || []);
        setTotal(res.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSelectContainer = async (card) => {
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
  };

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

  const handleToggleSelectRow = (itemId) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleToggleSelectAll = (currentPageIds) => {
    const isAllSelected = currentPageIds.every((id) => selectedItemIds.includes(id));
    if (isAllSelected) {
      setSelectedItemIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      setSelectedItemIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

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
        current_action: 'Đang khởi chạy luồng Đồng bộ AppSheet & AI OCR...',
        processed: 0,
        total: 0,
        items_crawled: 0,
        images_downloaded: 0,
        sku_crawled: 0,
        speed_str: '—',
        crawl_mode: 'Live Sync (API + OCR)',
        eta_seconds: null,
        current_status: 'STARTING'
      });

      const res = await lpnCrawlerApi.startSyncJob(force, mode);
      if (res && res.id) {
        setCurrentJob({ ...res, is_sync_mode: true });
        showToast('success', `Đã khởi chạy Đồng bộ thành công (Job #${res.id})`);
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
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {/* Main Data Display: Table View OR Container Card View */}
      {viewMode === 'cards' ? (
        <ContainerCardView
          items={items}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={(newPage) => setPage(newPage)}
          onSelectContainer={handleSelectContainer}
          onSelectItem={handleSelectItem}
          selectedItemIds={selectedItemIds}
          onToggleSelectRow={handleToggleSelectRow}
          onToggleSelectAll={handleToggleSelectAll}
          loading={loading}
        />
      ) : (
        <DataTable
          items={items}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={(newPage) => setPage(newPage)}
          onSelectItem={handleSelectItem}
          selectedItemIds={selectedItemIds}
          onToggleSelectRow={handleToggleSelectRow}
          onToggleSelectAll={handleToggleSelectAll}
          loading={loading}
        />
      )}

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
          onClose={() => setSelectedContainer(null)}
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
          onClose={() => setMissingRowsConfig(prev => ({ ...prev, isOpen: false }))}
          onSelectItem={(itemId) => {
            setMissingRowsConfig(prev => ({ ...prev, isOpen: false }));
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
      <AiOcrScanModal
        isOpen={showAiOcrScanModal}
        onClose={() => setShowAiOcrScanModal(false)}
      />

      {/* Dashboard Modal (All-Time Data & Upcoming Charts) */}
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
    </div>
  );
}

