import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Minus, Maximize2, Minimize2, RefreshCw, Image as ImageIcon, ChevronLeft, ChevronRight, X, Eye, Cpu, Hash, ZoomIn, Info } from 'lucide-react';
import { lpnCrawlerApi } from '../services/api';
import { DetailModal } from './DetailModal';

// Helper định dạng tên mô hình Dual-Engine hiển thị đồng bộ và chính xác
const formatShortModelName = (name) => {
  if (!name) return 'Dual-Engine: Epoch 19 - Acc 99.1%';
  const str = String(name);
  // Kiểm tra nếu là Dual-Engine hoặc có Epoch trước
  const isDual = str.toLowerCase().includes('dual') || str.toLowerCase().includes('hybrid') || /(?:epoch|ep)/i.test(str);
  if (isDual) {
    const epMatch = str.match(/(?:epoch|ep)\s*(\d+)/i);
    const accMatch = str.match(/(?:acc\s*|acc:\s*|\()([0-9]+(?:\.[0-9]+)?)/i);
    const ep = epMatch ? epMatch[1] : '19';
    const acc = accMatch ? accMatch[1] : '99.1';
    return `Dual-Engine: Epoch ${ep} - Acc ${acc}%`;
  }
  if (str.toLowerCase().includes('easyocr') || str.toLowerCase().includes('base')) {
    return 'Bản Tiêu Chuẩn (EasyOCR)';
  }
  return str;
};

// Lấy đường dẫn ảnh hoặc Base64 linh hoạt để luôn hiển thị được hình ảnh
const resolveItemImageUrl = (item) => {
  if (!item) return null;
  if (item.thumbnail) {
    if (item.thumbnail.startsWith('data:') || item.thumbnail.startsWith('http') || item.thumbnail.startsWith('/')) {
      return item.thumbnail;
    }
    return `data:image/jpeg;base64,${item.thumbnail}`;
  }
  if (item.image_id) {
    return `/api/v1/lpn-crawler/images/${item.image_id}/file`;
  }
  if (item.image_url) {
    return item.image_url;
  }
  if (item.local_path) {
    return `/api/v1/lpn-crawler/images/view?path=${encodeURIComponent(item.local_path)}`;
  }
  return null;
};

// Helper bóc tách và chuẩn hóa thời gian [HH:mm:ss] cho từng dòng log trong cả 2 bảng nhật ký
const parseLogEntry = (logItem) => {
  if (!logItem) return { timeStr: '', text: '' };

  const rawText = typeof logItem === 'string' ? logItem : (logItem.message || JSON.stringify(logItem));
  let timeStr = '';

  // 1. Lấy từ timestamp, created_at hoặc time nếu logItem là object
  if (typeof logItem === 'object' && logItem !== null) {
    if (logItem.timestamp) {
      const match = String(logItem.timestamp).match(/(\d{1,2}:\d{2}:\d{2})/);
      timeStr = match ? match[1] : String(logItem.timestamp);
    } else if (logItem.created_at) {
      const s = String(logItem.created_at);
      const match = s.match(/(\d{2}:\d{2}:\d{2})/);
      if (match) {
        timeStr = match[1];
      } else {
        try {
          const d = new Date(s);
          if (!isNaN(d.getTime())) {
            timeStr = d.toLocaleTimeString('vi-VN', { hour12: false });
          }
        } catch (e) {}
      }
    } else if (logItem.time) {
      const match = String(logItem.time).match(/(\d{1,2}:\d{2}:\d{2})/);
      timeStr = match ? match[1] : String(logItem.time);
    }
  }

  // 2. Nếu trong rawText đã có sẵn [HH:mm:ss] ở đầu dòng
  let cleanText = rawText;
  const existingTimeMatch = rawText.match(/^\[(\d{1,2}:\d{2}:\d{2})\]\s*/);
  if (existingTimeMatch) {
    if (!timeStr) timeStr = existingTimeMatch[1];
    cleanText = rawText.replace(/^\[(\d{1,2}:\d{2}:\d{2})\]\s*/, '');
  }

  // 3. Đảm bảo chuẩn 2 chữ số giờ (09:05:00)
  if (timeStr && timeStr.length < 8 && /^\d:\d{2}:\d{2}$/.test(timeStr)) {
    timeStr = '0' + timeStr;
  }

  // 4. Nếu vẫn trống (ví dụ log tạo động tức thời không có trường thời gian), fallback giờ hệ thống
  if (!timeStr && typeof window !== 'undefined') {
    try {
      timeStr = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    } catch (e) {}
  }

  return { timeStr, text: cleanText };
};

export const SyncDualMonitorModal = ({
  currentJob,
  progressData,
  liveLogs = [],
  crawlerLogs: propCrawlerLogs = null,
  ocrLogs: propOcrLogs = null,
  syncOcrLiveFeed = [],
  syncOcrLatest = null,
  onStartSync,
  onStopSync,
  onPauseSync,
  onResumeSync,
  onClose,
  isOpen = false
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedImagePreview, setSelectedImagePreview] = useState(null);
  const [activeModelName, setActiveModelName] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);
  const [feedPage, setFeedPage] = useState(1);
  const [feedPageSize, setFeedPageSize] = useState(10);
  const [dbFeed, setDbFeed] = useState([]);
  const [mobileActiveTab, setMobileActiveTab] = useState('crawler');
  const crawlerLogEndRef = useRef(null);
  const ocrLogEndRef = useRef(null);
  const feedEndRef = useRef(null);

  const handleOpenDetailModal = async (feedItem) => {
    if (!feedItem) return;

    const sourceImgUrl = resolveItemImageUrl(feedItem) || feedItem.image_url || '';

    // 1. Mở ngay lập tức bằng dữ liệu sẵn có để trải nghiệm mượt mà không bị khựng
    const baseItem = {
      id: feedItem.item_id || feedItem.id || 'temp',
      item_id: feedItem.item_id || feedItem.id,
      container_number: feedItem.container_number,
      factory: feedItem.factory || '—',
      date_loading: feedItem.timestamp || '—',
      timestamp_raw: feedItem.timestamp || '—',
      record_type: feedItem.image_type || 'Pallet',
      suffix_key: feedItem.image_type || 'Pallet 1',
      sku: feedItem.expected_sku || feedItem.detected_sku,
      lpn: feedItem.expected_lpn || feedItem.detected_lpn,
      batch_original: '—',
      batch_resolved: '—',
      images: feedItem.images && feedItem.images.length > 0 ? feedItem.images : [
        {
          id: feedItem.image_id,
          local_path: feedItem.local_path,
          source_url: sourceImgUrl
        }
      ]
    };
    setSelectedDetailItem(baseItem);

    // 2. Tải thêm thông tin đầy đủ từ CSDL (Container Header, Batch, Factory...) nếu có item_id
    const itemId = feedItem.item_id || feedItem.id;
    if (itemId && itemId !== 'temp') {
      try {
        const fullItem = await lpnCrawlerApi.getItemDetail(itemId);
        if (fullItem) {
          setSelectedDetailItem((prev) => {
            if (!prev || (prev.id !== itemId && prev.item_id !== itemId)) return prev;
            return {
              ...fullItem,
              id: fullItem.item_id || itemId,
              timestamp_raw: fullItem.timestamp_raw || feedItem.timestamp,
              date_loading: fullItem.date_loading || feedItem.timestamp,
              images: (fullItem.images && fullItem.images.length > 0) ? fullItem.images : baseItem.images
            };
          });
        }
      } catch (err) {
        console.warn('Lấy thông tin chi tiết item từ API:', err);
      }
    }
  };

  useEffect(() => {
    if (progressData?.current_status === 'PAUSED') {
      setIsPaused(true);
    } else if (progressData?.current_status === 'CRAWLING' || progressData?.current_status === 'DONE') {
      setIsPaused(false);
    }
  }, [progressData?.current_status]);

  useEffect(() => {
    const fetchTopModel = async () => {
      try {
        if (typeof lpnCrawlerApi?.getAvailableModels === 'function') {
          const res = await lpnCrawlerApi.getAvailableModels();
          if (res && res.models && res.models.length > 0) {
            const topModel = res.models[0];
            setActiveModelName(topModel.display_name || topModel.name || topModel.label);
            return;
          }
        }
        let r = await fetch('/api/ai-ocr/models');
        if (!r.ok) r = await fetch('/api/v1/lpn-crawler/ai-ocr/models');
        if (r.ok) {
          const d = await r.json();
          if (d && d.success && Array.isArray(d.models) && d.models.length > 0) {
            const topModel = d.models[0];
            setActiveModelName(topModel.display_name || topModel.name || topModel.label);
          }
        }
      } catch (err) {
        // Fallback mặc định an toàn
      }
    };
    fetchTopModel();
  }, []);


  const handlePauseResume = async () => {
    const nextState = !isPaused;
    setIsPaused(nextState);
    try {
      let jobId = currentJob?.id;
      if (!jobId) {
        const active = await lpnCrawlerApi.getCurrentJob();
        jobId = active?.id;
      }
      if (jobId) {
        if (nextState) {
          await lpnCrawlerApi.pauseCrawlJob(jobId);
        } else {
          await lpnCrawlerApi.resumeCrawlJob(jobId);
        }
      }
    } catch (e) {
      console.error('Pause/Resume error:', e);
      setIsPaused(!nextState);
    }
  };

  // Tách riêng biệt 2 luồng log độc lập: Đồng bộ AppSheet vs AI OCR
  // Ưu tiên dùng state độc lập propCrawlerLogs / propOcrLogs do cha truyền xuống
  const crawlerLogs = propCrawlerLogs || liveLogs.filter((logItem) => {
    if (typeof logItem === 'object' && logItem !== null) {
      if (logItem.source) return logItem.source !== 'ai_ocr';
      const msg = logItem.message || '';
      return !(msg.includes('[AI OCR]') || msg.includes('[AI OCR Lỗi]') || msg.includes('Dual-Engine'));
    }
    const raw = String(logItem);
    return !(raw.includes('[AI OCR]') || raw.includes('[AI OCR Lỗi]') || raw.includes('Dual-Engine'));
  });

  const ocrLogs = propOcrLogs || liveLogs.filter((logItem) => {
    if (typeof logItem === 'object' && logItem !== null) {
      if (logItem.source) return logItem.source === 'ai_ocr';
      const msg = logItem.message || '';
      return msg.includes('[AI OCR]') || msg.includes('[AI OCR Lỗi]') || msg.includes('Dual-Engine');
    }
    const raw = String(logItem);
    return raw.includes('[AI OCR]') || raw.includes('[AI OCR Lỗi]') || raw.includes('Dual-Engine');
  });

  useEffect(() => {
    if (crawlerLogEndRef.current) {
      crawlerLogEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [crawlerLogs.length]);

  useEffect(() => {
    if (ocrLogEndRef.current) {
      ocrLogEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ocrLogs.length]);

  const total = progressData?.total || currentJob?.total_containers_found || 0;
  const processed = progressData?.processed || currentJob?.containers_processed || 0;
  const currentContainer = progressData?.current_container || '—';
  const isListening = progressData?.current_status === 'LISTENING';
  const isFailed = currentJob?.status === 'failed' || progressData?.current_status === 'FAILED';
  const isStopped = currentJob?.status === 'cancelled' || currentJob?.status === 'stopped' || currentJob?.status === 'interrupted' || progressData?.current_status === 'CANCELLED' || progressData?.current_status === 'STOPPED';
  const isCompleted = (currentJob?.status === 'completed' || currentJob?.status === 'completed_with_errors' || progressData?.current_status === 'COMPLETED' || progressData?.current_status === 'DONE') && !isListening && !isStopped;
  const isRunning = !isStopped && !isCompleted && !isFailed;
  const currentAction = isStopped
    ? 'Tiến trình đồng bộ đã dừng.'
    : progressData?.current_action || (currentJob?.status === 'failed' ? `Job thất bại: ${currentJob.error_message || ''}` : '');
  const imagesCount = progressData?.images_downloaded || currentJob?.total_images_downloaded || 0;
  const speedStr = progressData?.speed_str || '—';
  const displaySpeed = speedStr ? speedStr.replace(/\s*\(Fast-Skip\)/i, '') : '—';

  const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : (isListening || isCompleted ? 100 : 0);

  // Lấy container đang xử lý để nạp toàn bộ danh sách ảnh đã quét từ CSDL
  const activeContainerNum = (progressData?.current_container && progressData.current_container !== '—')
    ? progressData.current_container
    : (syncOcrLatest?.container_number || null);

  useEffect(() => {
    let isMounted = true;
    const fetchContainerOcrResults = async () => {
      try {
        const params = { limit: 300 };
        if (activeContainerNum) {
          params.container_number = activeContainerNum;
        }
        const res = await lpnCrawlerApi.getBatchScanResults(params);
        if (isMounted && res) {
          const list = res.results || res.items || [];
          if (list.length > 0) {
            setDbFeed(list);
          }
        }
      } catch (err) {
        console.warn('Lỗi nạp danh sách ảnh đã quét từ CSDL:', err);
      }
    };
    fetchContainerOcrResults();
    return () => { isMounted = false; };
  }, [activeContainerNum, currentJob?.id]);

  // Hợp nhất danh sách từ CSDL và các sự kiện SSE realtime mới nhất (không bị mất dòng khi thoát ra vào lại)
  const effectiveFeed = React.useMemo(() => {
    const map = new Map();
    // 1. Nạp từ CSDL
    (dbFeed || []).forEach((item) => {
      const k = item.item_id ? `item_${item.item_id}` : (item.id ? `id_${item.id}` : (item.image_id ? `img_${item.image_id}` : null));
      if (k) map.set(k, item);
    });
    // 2. Chồng sự kiện Realtime SSE mới nhất lên
    (syncOcrLiveFeed || []).forEach((item) => {
      const k = item.item_id ? `item_${item.item_id}` : (item.id ? `id_${item.id}` : (item.image_id ? `img_${item.image_id}` : null));
      if (k) {
        map.set(k, { ...(map.get(k) || {}), ...item });
      } else {
        map.set(`live_${map.size}`, item);
      }
    });
    const combined = Array.from(map.values());
    return combined.length > 0 ? combined : (syncOcrLiveFeed || []);
  }, [dbFeed, syncOcrLiveFeed]);

  // AI OCR running stats
  const ocrTotalScanned = syncOcrLatest?.stats?.total_scanned || effectiveFeed.length;
  const ocrMatchedCount = syncOcrLatest?.stats?.matched_count || effectiveFeed.filter(x => x.is_lpn_match || x.is_sku_match).length;
  const ocrMatchRate = ocrTotalScanned > 0 ? Math.round((ocrMatchedCount / ocrTotalScanned) * 100) : 0;
  const ocrAvgMs = syncOcrLatest?.stats?.avg_ms || (effectiveFeed.length > 0 ? Math.round(effectiveFeed.reduce((acc, cur) => acc + (cur.duration_ms || cur.processing_time_ms || 0), 0) / effectiveFeed.length) : 0);

  const displayLatest = syncOcrLatest || (effectiveFeed.length > 0 ? effectiveFeed[effectiveFeed.length - 1] : null);

  useEffect(() => {
    if (displayLatest?.active_model) {
      setActiveModelName(displayLatest.active_model);
    } else if (progressData?.active_model) {
      setActiveModelName(progressData.active_model);
    }
  }, [displayLatest?.active_model, progressData?.active_model]);

  // Chuyển đổi mili-giây sang giây (s) và phút (m) gọn gàng
  const formatDurationMs = (ms) => {
    if (!ms || ms <= 0) return '0ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const sec = ms / 1000;
    if (sec < 60) return `${sec.toFixed(1)}s`;
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}m ${s}s`;
  };

  const spotlightImgUrl = resolveItemImageUrl(displayLatest);

  // Phân trang danh sách nhận diện AI OCR
  const totalFeedItems = effectiveFeed.length;
  const totalFeedPages = Math.max(1, Math.ceil(totalFeedItems / feedPageSize));
  const currentFeedPage = Math.min(Math.max(1, feedPage), totalFeedPages);
  // Sắp xếp các ảnh mới nhất lên đầu danh sách để dễ theo dõi
  const reversedFeed = React.useMemo(() => {
    return [...effectiveFeed].reverse();
  }, [effectiveFeed]);
  const paginatedFeed = reversedFeed.slice((currentFeedPage - 1) * feedPageSize, currentFeedPage * feedPageSize);

  // Tiến trình đọc ảnh của Container hiện tại
  const currentContFeed = activeContainerNum ? effectiveFeed.filter(x => x.container_number === activeContainerNum) : effectiveFeed;
  const currentContDoneCount = Math.max(displayLatest?.container_img_idx || 0, currentContFeed.length || 0);
  const currentContTotalImgs = displayLatest?.container_img_total || Math.max(currentContDoneCount, currentContFeed.length || 1);
  const currentContTotalItems = displayLatest?.container_total_items || currentContTotalImgs;
  const currentContMatchCount = currentContFeed.filter(x => x.is_lpn_match || x.is_sku_match).length;
  const currentContProgressPercent = currentContTotalImgs > 0 ? Math.min(100, Math.round((currentContDoneCount / currentContTotalImgs) * 100)) : 100;

  // Nhận diện chế độ cào đang áp dụng (Fast-Path API vs UI Playwright)
  const isUiFallback = progressData?.crawl_mode === 'UI Playwright' ||
    (currentAction && (
      currentAction.includes('UI') ||
      currentAction.includes('DOM') ||
      currentAction.includes('quét danh sách Container') ||
      currentAction.includes('UI Fallback')
    )) ||
    liveLogs.some(log => {
      const txt = typeof log === 'string' ? log : (log.message || '');
      return txt.includes('UI Playwright') || txt.includes('[TỰ ĐỘNG CHUYỂN ĐỔI]') || txt.includes('UI Fallback');
    });

  const activeCrawlMode = isUiFallback ? 'UI Playwright' : (progressData?.crawl_mode || 'Fast-Path API');
  const isFastMode = activeCrawlMode.includes('Fast-Path');

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isFullscreen ? '0' : '20px'
      }}
    >
      <div
        className="lpn-sync-monitor-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: isFullscreen ? '0' : '14px',
          width: isFullscreen ? '100vw' : '1360px',
          maxWidth: isFullscreen ? '100vw' : '98vw',
          height: isFullscreen ? '100vh' : '90vh',
          maxHeight: isFullscreen ? '100vh' : '90vh',
          boxShadow: '0 16px 48px rgba(123, 82, 51, 0.3)',
          border: '1px solid #EADCC9',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div
          className="lpn-sync-header"
          style={{
            padding: '10px 18px',
            backgroundColor: '#FAF6F0',
            borderBottom: '1px solid #EADCC9',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '800', fontSize: '1.02rem', color: '#2D1A12' }}>
              Tiến Trình Đồng Bộ & Nhận Diện AI OCR
            </span>
            <span
              className={`lpn-status-badge ${isListening ? 'status-running' : isCompleted ? 'status-completed' : isFailed ? 'status-failed' : isStopped ? 'status-failed' : isPaused ? 'status-warning' : 'status-running'}`}
              style={{
                marginLeft: '4px',
                backgroundColor: isListening ? '#DCFCE7' : isStopped ? '#FEE2E2' : isPaused ? '#FEF3C7' : undefined,
                color: isListening ? '#15803D' : isStopped ? '#DC2626' : isPaused ? '#B45309' : undefined,
                border: isListening ? '1px solid #16A34A' : isStopped ? '1px solid #FCA5A5' : isPaused ? '1px solid #F59E0B' : undefined
              }}
            >
              {isListening ? 'THƯỜNG TRỰC ĐỒNG BỘ' : isCompleted ? 'ĐÃ RÀ SOÁT XONG' : isStopped ? 'ĐÃ DỪNG ĐỒNG BỘ' : isFailed ? 'THẤT BẠI' : isPaused ? 'TẠM DỪNG' : 'ĐANG ĐỒNG BỘ...'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {isRunning ? (
              <>
                <button
                  type="button"
                  onClick={handlePauseResume}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    borderRadius: '6px',
                    border: isPaused ? '1px solid #16A34A' : '1px solid #F59E0B',
                    backgroundColor: isPaused ? '#DCFCE7' : '#FFFBEB',
                    color: isPaused ? '#15803D' : '#B45309',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  title={isPaused ? "Tiếp tục tiến trình đồng bộ" : "Tạm dừng tiến trình đồng bộ"}
                >
                  {isPaused ? 'Tiếp Tục' : 'Tạm Dừng'}
                </button>

                <button
                  type="button"
                  onClick={onStopSync}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    borderRadius: '6px',
                    border: '1px solid #FCA5A5',
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  title="Dừng hoàn toàn tiến trình đồng bộ và giải phóng tài nguyên"
                >
                  Dừng Đồng Bộ
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onStartSync}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 14px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  borderRadius: '6px',
                  border: '1px solid #16A34A',
                  backgroundColor: '#15803D',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)',
                  transition: 'all 0.15s'
                }}
                title="Khởi động lại tiến trình đồng bộ dữ liệu AppSheet và AI OCR"
              >
                <RefreshCw size={14} color="#FFFFFF" />
                <span>Đồng Bộ Lại</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{
                background: 'transparent', border: 'none', padding: '4px 6px', cursor: 'pointer',
                color: '#4E3629', display: 'flex', alignItems: 'center', borderRadius: '4px'
              }}
              title={isFullscreen ? "Thu nhỏ cửa sổ" : "Mở rộng toàn màn hình"}
            >
              {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent', border: 'none', padding: '4px 6px', cursor: 'pointer',
                color: '#8D6E63', display: 'flex', alignItems: 'center', borderRadius: '4px'
              }}
              title="Đóng cửa sổ giám sát (tiến trình vẫn tiếp tục chạy ngầm)"
            >
              <Minus size={19} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          flex: 1,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF'
        }}>
          {/* Active Sync Status Overview Card with Progress Bar */}
          <div style={{
            backgroundColor: '#FAF6F0',
            border: '1px solid #EADCC9',
            borderRadius: '10px',
            padding: '12px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#4E3629' }}>
                  Trạng thái đồng bộ:
                </span>
                {isListening ? (
                  <span style={{ fontWeight: '800', fontSize: '0.92rem', color: '#15803D' }}>
                    Đang thường trực đồng bộ thời gian thực (Lắng nghe dữ liệu mới)
                  </span>
                ) : isCompleted ? (
                  <span style={{ fontWeight: '800', fontSize: '0.92rem', color: '#15803D' }}>
                    Đã kiểm tra toàn bộ danh sách dữ liệu
                  </span>
                ) : isFailed ? (
                  <span style={{ fontWeight: '800', fontSize: '0.92rem', color: '#DC2626' }}>
                    Tiến trình bị gián đoạn do lỗi
                  </span>
                ) : isPaused ? (
                  <span style={{ fontWeight: '800', fontSize: '0.92rem', color: '#B45309' }}>
                    Tạm dừng tại Container: {currentContainer}
                  </span>
                ) : (
                  <span style={{ fontWeight: '800', fontSize: '0.92rem', color: '#15803D' }}>
                    Đang kiểm tra: {currentContainer}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '0.82rem', color: '#666', fontWeight: '600' }}>
                  Đã kiểm tra: <strong style={{ color: '#2D1A12', fontSize: '0.92rem' }}>{Number(processed || 0).toLocaleString()}</strong> / {total > 0 ? Number(total).toLocaleString() : '—'} Container
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: '900', color: (isListening || isCompleted) ? '#15803D' : '#7B5233', minWidth: '48px', textAlign: 'right' }}>
                  {percent}%
                </span>
              </div>
            </div>

            {/* Thanh tiến độ trực quan */}
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#EADCC9',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${percent}%`,
                backgroundColor: (isListening || isCompleted) ? '#16A34A' : '#15803D',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#8D6E63' }}>
              <span style={{ fontStyle: 'italic', maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isListening
                  ? (currentAction || 'Dữ liệu hiện có đã được đồng bộ đầy đủ. Hệ thống đang thường trực lắng nghe để tự động bóc tách ngay khi có container hoặc ảnh mới phát sinh từ AppSheet.')
                  : isCompleted
                  ? 'Toàn bộ danh sách container đã được rà soát. Container nào có sẵn được bỏ qua nhanh, container mới và ảnh mới đã được tải và nhận diện thành công.'
                  : isStopped
                  ? 'Tiến trình đồng bộ đã dừng. Nhấn nút "Đồng Bộ Lại" ở góc trên nếu bạn muốn tiếp tục chạy.'
                  : (currentAction || 'Đang sẵn sàng đồng bộ...')}
              </span>
              <span>Tốc độ: {speedStr}</span>
            </div>
          </div>

          {/* Quick Metrics Grid - 4 Columns */}
          <div
            className="lpn-sync-metrics-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '8px',
              backgroundColor: '#FAF6F0',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #EADCC9',
              flexShrink: 0
            }}
          >
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: '600', display: 'block', whiteSpace: 'nowrap' }}>Container đã kiểm tra:</span>
              <div style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {Number(processed || 0).toLocaleString()} / {total > 0 ? Number(total).toLocaleString() : '—'} ({percent}%)
              </div>
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: '600', display: 'block', whiteSpace: 'nowrap' }}>Ảnh mới tải về:</span>
              <div style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {Number(imagesCount || 0).toLocaleString()} ảnh
              </div>
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: '600', display: 'block', whiteSpace: 'nowrap' }}>Ảnh đã quét AI OCR:</span>
              <div style={{ fontWeight: '800', color: '#16A34A', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {Number(ocrTotalScanned || 0).toLocaleString()} ảnh {ocrAvgMs > 0 && <span style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: '600' }}>({formatDurationMs(ocrAvgMs)}/ảnh)</span>}
              </div>
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: '600', display: 'block', whiteSpace: 'nowrap' }}>Tỷ lệ khớp LPN/SKU:</span>
              <div style={{ fontWeight: '800', color: ocrMatchRate >= 80 ? '#15803D' : '#D97706', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ocrMatchRate}% ({ocrMatchedCount}/{ocrTotalScanned})
              </div>
            </div>
          </div>

          {/* Mobile Tab Switcher: Xem toàn màn hình luồng cào hoặc luồng OCR trên điện thoại */}
          <div
            className="lpn-mobile-only"
            style={{
              display: 'flex',
              backgroundColor: '#FAF6F0',
              border: '1px solid #EADCC9',
              borderRadius: '8px',
              padding: '3px',
              gap: '4px',
              flexShrink: 0
            }}
          >
            <button
              type="button"
              onClick={() => setMobileActiveTab('crawler')}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                fontSize: '0.76rem',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: mobileActiveTab === 'crawler' ? '#7B5233' : 'transparent',
                color: mobileActiveTab === 'crawler' ? '#FFFFFF' : '#7B5233',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>📜 Luồng Cào</span>
              <span style={{ fontSize: '0.66rem', opacity: 0.85 }}>({crawlerLogs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileActiveTab('ocr')}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                fontSize: '0.76rem',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: mobileActiveTab === 'ocr' ? '#7B5233' : 'transparent',
                color: mobileActiveTab === 'ocr' ? '#FFFFFF' : '#7B5233',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>🤖 Nhận Diện OCR</span>
              <span style={{ fontSize: '0.66rem', opacity: 0.85 }}>({ocrTotalScanned})</span>
            </button>
          </div>

          {/* Modal Body: 2 Split Areas (Left: Crawler Stream Logs | Right: Live AI OCR Engine & Results) */}
          <div
            className="lpn-sync-split-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: '12px',
              flex: 1,
              overflow: 'hidden'
            }}
          >
            {/* ================= AREA 1: LEFT - APPSHEET CRAWLER STREAM LOGS ================= */}
            <div
              className={`lpn-sync-area-crawler ${mobileActiveTab !== 'crawler' ? 'lpn-mobile-hidden' : ''}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                backgroundColor: '#FAF6F0',
                borderRadius: '10px',
                border: '1px solid #EADCC9',
                padding: '12px 14px',
                overflow: 'hidden'
              }}
            >
              {/* Area Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ fontWeight: '800', fontSize: '0.88rem', color: '#2D1A12', whiteSpace: 'nowrap' }}>
                    Đồng bộ AppSheet
                  </span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: '700',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    backgroundColor: isFastMode ? '#DCFCE7' : '#FEF3C7',
                    color: isFastMode ? '#15803D' : '#B45309',
                    border: isFastMode ? '1px solid #86EFAC' : '1px solid #FCD34D',
                    whiteSpace: 'nowrap'
                  }}>
                    {isFastMode ? 'Fast-Path API' : 'UI Playwright'}
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#8D6E63', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Tốc độ: <strong style={{ color: '#2D1A12' }}>{displaySpeed}</strong>
                </span>
              </div>

              {/* Ô LOG RIÊNG BIỆT CHO CRAWLER (Không bị lẫn log AI OCR) */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: '200px',
                overflow: 'hidden'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  color: '#7B5233'
                }}>
                  <span>Nhật ký luồng cào AppSheet</span>
                  <span style={{ fontSize: '0.7rem', color: '#8D6E63', fontWeight: '500' }}>
                    {crawlerLogs.length} dòng log
                  </span>
                </div>
                <div style={{
                  backgroundColor: '#18181B',
                  color: '#4ADE80',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '0.78rem',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  flex: 1,
                  overflowY: 'auto',
                  border: '1.5px solid #3F3F46',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
                  lineHeight: '1.45'
                }}>
                  {crawlerLogs.length === 0 ? (
                    <div style={{ color: '#71717A', fontStyle: 'italic', padding: '6px 0' }}>
                      Đang kết nối luồng nhật ký từ AppSheet Crawler...
                    </div>
                  ) : (
                    crawlerLogs.map((logItem, idx) => {
                      const { timeStr, text } = parseLogEntry(logItem);
                      const isErr = text.includes('ERROR') || (text.toLowerCase().includes('lỗi') && !text.includes('Lỗi: 0'));
                      const isSucc = text.includes('SUCCESS') || text.includes('THÀNH CÔNG') || text.includes('Hoàn tất');
                      const isSkip = text.includes('Bỏ qua') || text.includes('ĐÃ ĐỦ 100%') || text.includes('ĐÃ CÓ TRONG DB');
                      const formattedText = text.replace(/\bBỏ qua\b/g, 'Bỏ\u00A0qua');
                      return (
                        <div
                          key={idx}
                          style={{
                            color: isErr ? '#F87171' : isSucc ? '#4ADE80' : isSkip ? '#FCD34D' : '#E2E8F0',
                            wordBreak: 'normal',
                            overflowWrap: 'break-word',
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.45',
                            padding: '1.5px 0'
                          }}
                        >
                          {timeStr ? (
                            <span style={{
                              color: '#9CA3AF',
                              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                              fontSize: '0.74rem',
                              marginRight: '6px',
                              fontWeight: '600',
                              opacity: 0.9,
                              userSelect: 'none'
                            }}>
                              [{timeStr}]
                            </span>
                          ) : null}
                          {formattedText}
                        </div>
                      );
                    })
                  )}
                  <div ref={crawlerLogEndRef} />
                </div>
              </div>
            </div>

            {/* ================= AREA 2: RIGHT - LIVE AI OCR ENGINE ================= */}
            <div
              className={`lpn-sync-area-ocr ${mobileActiveTab !== 'ocr' ? 'lpn-mobile-hidden' : ''}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                backgroundColor: '#FAF6F0',
                borderRadius: '10px',
                border: '1px solid #EADCC9',
                padding: '12px 14px',
                overflow: 'hidden'
              }}
            >
              {/* Area Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
                gap: '8px',
                minHeight: '26px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontWeight: '800', fontSize: '0.88rem', color: '#2D1A12', whiteSpace: 'nowrap' }}>
                    Nhận Diện AI OCR Thời Gian Thực
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span
                    title={`Mô hình nhận diện AI: ${formatShortModelName(activeModelName)}`}
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '5px',
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      border: '1px solid #86EFAC',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                      cursor: 'help'
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block', boxShadow: '0 0 4px #16A34A' }} />
                    {formatShortModelName(activeModelName)}
                  </span>
                  {typeof progressData?.ocr_queue_size === 'number' && progressData.ocr_queue_size > 0 && (
                    <span
                      title={`Hàng đợi nhận diện: ${progressData.ocr_queue_size} ảnh đang chờ xử lý`}
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: '700',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: '#FEF3C7',
                        color: '#B45309',
                        border: '1px solid #FCD34D',
                        whiteSpace: 'nowrap',
                        cursor: 'help'
                      }}
                    >
                      Chờ: {progressData.ocr_queue_size} ảnh
                    </span>
                  )}
                </div>
              </div>

              {/* Spotlight Card: Latest OCR-Analyzed Image */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EADCC9',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexShrink: 0
              }}>
                {displayLatest ? (
                  <>
                    <div
                      onClick={() => displayLatest && handleOpenDetailModal(displayLatest)}
                      style={{
                        width: '76px',
                        height: '76px',
                        borderRadius: '6px',
                        backgroundColor: '#FAF6F0',
                        overflow: 'hidden',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: displayLatest ? 'pointer' : 'default',
                        border: '1px solid #EADCC9'
                      }}
                      title={displayLatest ? "Bấm để xem chi tiết kiện hàng & AI OCR" : undefined}
                    >
                      {spotlightImgUrl ? (
                        <>
                          <img
                            key={spotlightImgUrl}
                            src={spotlightImgUrl}
                            alt="OCR Preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              if (displayLatest?.local_path && !e.target.src.includes('/images/view?path=')) {
                                e.target.src = `/api/v1/lpn-crawler/images/view?path=${encodeURIComponent(displayLatest.local_path)}`;
                              } else if (displayLatest?.image_id && !e.target.src.includes(`/images/${displayLatest.image_id}/file`)) {
                                e.target.src = `/api/v1/lpn-crawler/images/${displayLatest.image_id}/file`;
                              } else {
                                e.target.style.display = 'none';
                                const fb = e.target.parentElement?.querySelector('.img-fallback-icon');
                                if (fb) fb.style.display = 'flex';
                              }
                            }}
                          />
                          <div className="img-fallback-icon" style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                            <ImageIcon size={24} color="#8D6E63" />
                          </div>
                        </>
                      ) : (
                        <ImageIcon size={24} color="#8D6E63" />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {/* Container Header & Scan Duration */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <strong style={{ fontWeight: '800', fontSize: '0.85rem', color: '#2D1A12', whiteSpace: 'nowrap' }}>
                            {activeContainerNum || displayLatest.container_number || 'Container'}
                          </strong>
                          <span style={{
                            fontSize: '0.7rem',
                            color: '#7B5233',
                            backgroundColor: '#FAF6F0',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid #EADCC9',
                            whiteSpace: 'nowrap',
                            fontWeight: '600'
                          }}>
                            {currentContTotalItems} dòng hàng • {currentContTotalImgs} ảnh
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#8D6E63', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {displayLatest.timestamp || ''} | <strong style={{ color: '#2D1A12' }}>{formatDurationMs(displayLatest.duration_ms)}</strong>
                        </span>
                      </div>

                      {/* Container OCR Progress Bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem' }}>
                        <span style={{ color: '#8D6E63', flexShrink: 0, fontWeight: '600' }}>Tiến trình OCR:</span>
                        <div style={{
                          flex: 1,
                          height: '7px',
                          backgroundColor: '#EADCC9',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: `${currentContProgressPercent}%`,
                            height: '100%',
                            backgroundColor: currentContProgressPercent >= 100 ? '#16A34A' : '#7B5233',
                            borderRadius: '4px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        <span style={{ fontWeight: '700', color: '#2D1A12', flexShrink: 0, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                          {currentContDoneCount}/{currentContTotalImgs} ảnh ({currentContProgressPercent}%)
                        </span>
                      </div>

                      {/* Container Match Stats */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.73rem' }}>
                        <span style={{ color: '#8D6E63' }}>Kết quả:</span>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: '700',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: currentContMatchCount > 0 ? '#DCFCE7' : '#FEF3C7',
                          color: currentContMatchCount > 0 ? '#15803D' : '#B45309'
                        }}>
                          Khớp {currentContMatchCount}/{currentContDoneCount} ảnh
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8D6E63', fontSize: '0.8rem', padding: '10px' }}>
                    <RefreshCw size={16} className="animate-spin" color="#16A34A" />
                    <span>Đang đợi ảnh tải về từ AppSheet để bắt đầu phân tích AI OCR...</span>
                  </div>
                )}
              </div>

              {/* Live Feed Table: Bảng danh sách kết quả AI OCR trực tiếp */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: '140px',
                overflow: 'hidden',
                border: '1px solid #EADCC9',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF'
              }}>
                <div style={{
                  backgroundColor: '#FAF6F0',
                  padding: '7px 10px',
                  borderBottom: '1px solid #EADCC9',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  color: '#7B5233',
                  display: 'grid',
                  gridTemplateColumns: '48px 90px 1.1fr 1.1fr 92px 58px',
                  gap: '6px',
                  alignItems: 'center',
                  flexShrink: 0
                }}>
                  <span>Giờ</span>
                  <span>Container</span>
                  <span>LPN AI</span>
                  <span>SKU AI</span>
                  <span>Kết Quả</span>
                  <span style={{ textAlign: 'right' }}>Thời Gian</span>
                </div>

                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  backgroundColor: '#FFFFFF',
                  fontSize: '0.74rem'
                }}>
                  {effectiveFeed.length === 0 ? (
                    <div style={{ color: '#8D6E63', textAlign: 'center', padding: '28px 16px', fontStyle: 'italic', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <RefreshCw size={20} className="animate-spin" color="#7B5233" />
                      <span>Đang đợi ảnh mới từ AppSheet để bắt đầu nhận diện AI OCR...</span>
                      <span style={{ fontSize: '0.7rem', color: '#A89F91' }}>
                        Các container đã có sẵn sẽ được bỏ qua nhanh. Ảnh của container mới sẽ tự động hiển thị tại đây.
                      </span>
                    </div>
                  ) : (
                    paginatedFeed.map((item, idx) => {
                      const isAllMatch = item.is_lpn_match && item.is_sku_match;
                      const isAnyMatch = item.is_lpn_match || item.is_sku_match;
                      const isFirstOnFirstPage = idx === 0 && currentFeedPage === 1;
                      const rowImgUrl = resolveItemImageUrl(item);
                      return (
                        <div
                          key={idx}
                          onClick={() => handleOpenDetailModal(item)}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '48px 90px 1.1fr 1.1fr 92px 58px',
                            gap: '6px',
                            padding: '6px 10px',
                            borderBottom: '1px solid #F0E6D8',
                            alignItems: 'center',
                            backgroundColor: isFirstOnFirstPage ? '#FAF6F0' : '#FFFFFF',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s'
                          }}
                          title="Bấm để xem chi tiết kiện hàng & AI OCR"
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F5EBE1'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isFirstOnFirstPage ? '#FAF6F0' : '#FFFFFF'; }}
                        >
                          <span style={{ color: '#8D6E63', fontSize: '0.7rem' }}>{item.timestamp || ''}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, overflow: 'hidden' }}>
                            <strong style={{ color: '#2D1A12', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.container_number}
                            </strong>
                            {item.is_missing_recheck && (
                              <span style={{
                                fontSize: '0.62rem',
                                fontWeight: '700',
                                color: '#B45309',
                                backgroundColor: '#FEF3C7',
                                border: '1px solid #FDE68A',
                                borderRadius: '3px',
                                padding: '1px 3px',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                              }} title="Đang đối soát quét lại từ Danh Sách Thiếu / Lệch">
                                Quét lại
                              </span>
                            )}
                          </div>
                          <span style={{
                            fontFamily: 'monospace',
                            color: item.is_lpn_match ? '#15803D' : '#2D1A12',
                            fontWeight: item.is_lpn_match ? '700' : '500',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {item.detected_lpn || '—'}
                          </span>
                          <span style={{
                            fontFamily: 'monospace',
                            color: item.is_sku_match ? '#15803D' : '#2D1A12',
                            fontWeight: item.is_sku_match ? '700' : '500',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {item.detected_sku || '—'}
                          </span>
                          <span>
                            <span style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: '700',
                              backgroundColor: isAllMatch ? '#DCFCE7' : isAnyMatch ? '#FEF3C7' : '#FEE2E2',
                              color: isAllMatch ? '#15803D' : isAnyMatch ? '#B45309' : '#DC2626',
                              display: 'inline-block',
                              whiteSpace: 'nowrap'
                            }}>
                              {isAllMatch ? 'Khớp 100%' : isAnyMatch ? 'Khớp 1 phần' : 'Chưa khớp'}
                            </span>
                          </span>
                          <span style={{ color: '#8D6E63', textAlign: 'right', fontSize: '0.7rem' }}>
                            {formatDurationMs(item.duration_ms)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Thanh phân trang bảng nhận diện AI OCR */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '5px 10px',
                  backgroundColor: '#FAF6F0',
                  borderTop: '1px solid #EADCC9',
                  fontSize: '0.72rem',
                  color: '#4E3629',
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#8D6E63' }}>Hiển thị:</span>
                    <select
                      value={feedPageSize}
                      onChange={(e) => {
                        setFeedPageSize(Number(e.target.value));
                        setFeedPage(1);
                      }}
                      style={{
                        padding: '1px 5px',
                        fontSize: '0.72rem',
                        borderRadius: '4px',
                        border: '1px solid #EADCC9',
                        backgroundColor: '#FFFFFF',
                        color: '#2D1A12',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={10}>10 dòng</option>
                      <option value={20}>20 dòng</option>
                      <option value={50}>50 dòng</option>
                    </select>
                    <span style={{ color: '#8D6E63', marginLeft: '4px' }}>
                      (Tổng: <strong>{totalFeedItems}</strong> ảnh)
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '700', color: '#2D1A12' }}>
                      Trang {currentFeedPage} / {totalFeedPages}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        disabled={currentFeedPage <= 1}
                        onClick={() => setFeedPage(p => Math.max(1, p - 1))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          padding: '2px 7px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          borderRadius: '4px',
                          border: '1px solid #EADCC9',
                          backgroundColor: currentFeedPage <= 1 ? '#F3ECE4' : '#FFFFFF',
                          color: currentFeedPage <= 1 ? '#A89F91' : '#4E3629',
                          cursor: currentFeedPage <= 1 ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s'
                        }}
                        title="Trang trước"
                      >
                        <ChevronLeft size={13} />
                        <span>Trước</span>
                      </button>
                      <button
                        type="button"
                        disabled={currentFeedPage >= totalFeedPages}
                        onClick={() => setFeedPage(p => Math.min(totalFeedPages, p + 1))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          padding: '2px 7px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          borderRadius: '4px',
                          border: '1px solid #EADCC9',
                          backgroundColor: currentFeedPage >= totalFeedPages ? '#F3ECE4' : '#FFFFFF',
                          color: currentFeedPage >= totalFeedPages ? '#A89F91' : '#4E3629',
                          cursor: currentFeedPage >= totalFeedPages ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s'
                        }}
                        title="Trang kế tiếp"
                      >
                        <span>Sau</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ô LOG NHỎ DƯỚI BẢNG DANH SÁCH CHO AI OCR */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '135px',
                minHeight: '100px',
                flexShrink: 0,
                overflow: 'hidden'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  color: '#7B5233'
                }}>
                  <span>Nhật ký xử lý AI OCR</span>
                  <span style={{ fontSize: '0.7rem', color: '#8D6E63', fontWeight: '500' }}>
                    {ocrLogs.length} dòng log
                  </span>
                </div>
                <div style={{
                  backgroundColor: '#18181B',
                  color: '#38BDF8',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  fontSize: '0.76rem',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  flex: 1,
                  overflowY: 'auto',
                  border: '1.5px solid #3F3F46',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
                  lineHeight: '1.4'
                }}>
                  {ocrLogs.length === 0 ? (
                    <div style={{ color: '#71717A', fontStyle: 'italic', padding: '4px 0' }}>
                      Đang kết nối luồng nhật ký AI OCR...
                    </div>
                  ) : (
                    ocrLogs.map((logItem, idx) => {
                      const { timeStr, text } = parseLogEntry(logItem);
                      const isErr = text.includes('ERROR') || (text.toLowerCase().includes('lỗi') && !text.includes('Lỗi: 0'));
                      const isSucc = text.includes('SUCCESS') || text.includes('KHỚP') || text.includes('THÀNH CÔNG');
                      return (
                        <div
                          key={idx}
                          style={{
                            color: isErr ? '#F87171' : isSucc ? '#4ADE80' : '#38BDF8',
                            wordBreak: 'normal',
                            overflowWrap: 'break-word',
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.4',
                            padding: '1.5px 0'
                          }}
                        >
                          {timeStr ? (
                            <span style={{
                              color: '#9CA3AF',
                              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                              fontSize: '0.74rem',
                              marginRight: '6px',
                              fontWeight: '600',
                              opacity: 0.9,
                              userSelect: 'none'
                            }}>
                              [{timeStr}]
                            </span>
                          ) : null}
                          {text}
                        </div>
                      );
                    })
                  )}
                  <div ref={ocrLogEndRef} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Item Detail Modal — Dùng DetailModal có sẵn của hệ thống, render qua Portal để thoát khỏi flexbox và backdropFilter */}
      {selectedDetailItem && ReactDOM.createPortal(
        <DetailModal
          item={selectedDetailItem}
          itemsList={effectiveFeed.map(x => ({ ...x, id: x.item_id || x.id }))}
          onNavigate={(nextItem) => handleOpenDetailModal(nextItem)}
          onClose={() => setSelectedDetailItem(null)}
        />,
        document.body
      )}

      {/* Fullscreen Image Preview Lightbox — Render qua Portal để luôn chính giữa màn hình */}
      {selectedImagePreview && ReactDOM.createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              e.stopPropagation();
              setSelectedImagePreview(null);
            }
          }}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(6px)',
            zIndex: 10005,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImagePreview(null);
              }}
              style={{
                position: 'absolute',
                top: '-42px',
                right: '0',
                background: 'rgba(255, 255, 255, 0.25)',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              title="Đóng ảnh phóng to"
            >
              <X size={20} />
            </button>
            <img
              src={
                typeof selectedImagePreview === 'string' &&
                (selectedImagePreview.startsWith('data:') ||
                 selectedImagePreview.startsWith('/') ||
                 selectedImagePreview.startsWith('http'))
                  ? selectedImagePreview
                  : `data:image/jpeg;base64,${selectedImagePreview}`
              }
              alt="Enlarged Preview"
              style={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                borderRadius: '8px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

