import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Zap,
  Play,
  Square,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Loader2,
  FileText,
  Filter
} from 'lucide-react';
import { lpnCrawlerApi } from '../services/api';

export const BatchContainerScanModal = ({
  isOpen,
  onClose = () => {},
  currentFilters = {},
  selectedContainerIds = [],
  onScanComplete = () => {}
}) => {
  // Config & Scope States
  const [scope, setScope] = useState(selectedContainerIds.length > 0 ? 'selected' : 'filter'); // 'filter', 'selected', 'all'
  const [onlyUnprocessed, setOnlyUnprocessed] = useState(true);
  const [includeMismatched, setIncludeMismatched] = useState(false);
  const [selectedModel, setSelectedModel] = useState('hybrid_default');

  // Data States
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [targetContainers, setTargetContainers] = useState([]);
  const [totalUnscannedImages, setTotalUnscannedImages] = useState(0);

  // Scanning Execution States
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentContIndex, setCurrentContIndex] = useState(-1);
  const [currentContProgress, setCurrentContProgress] = useState({ processed: 0, total: 0 });
  const [containerResults, setContainerResults] = useState({}); // { [contId]: { status, label, passed, failed, total } }
  const [liveLogs, setLiveLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  // Totals
  const [overallStats, setOverallStats] = useState({
    processedImages: 0,
    totalImages: 0,
    passedImages: 0,
    failedImages: 0,
    completedContainers: 0
  });

  const [scanSummary, setScanSummary] = useState(null);

  // Refs for loop control & cancellation
  const cancelRequestedRef = useRef(false);
  const pauseRequestedRef = useRef(false);
  const abortControllerRef = useRef(null);
  const logsEndRef = useRef(null);

  // Tải danh sách container chờ quét
  const loadTargetContainers = async () => {
    setIsLoadingList(true);
    try {
      const params = {
        include_mismatched: includeMismatched,
        limit: 300
      };

      if (scope === 'filter') {
        if (currentFilters.startDate) params.startDate = currentFilters.startDate;
        if (currentFilters.endDate) params.endDate = currentFilters.endDate;
        if (currentFilters.search) params.search = currentFilters.search;
        if (currentFilters.factory) params.factory = currentFilters.factory;
      } else if (scope === 'selected' && selectedContainerIds.length > 0) {
        params.container_ids = selectedContainerIds.join(',');
      }

      const res = await lpnCrawlerApi.getUnscannedContainers(params);
      setTargetContainers(res.items || []);
      setTotalUnscannedImages(res.total_unscanned_images || 0);

      // Khởi tạo bảng kết quả ban đầu
      const initialResults = {};
      (res.items || []).forEach((c) => {
        initialResults[c.container_id] = {
          status: 'pending',
          label: c.status_label,
          passed: c.ocr_matched_count || 0,
          failed: c.ocr_mismatch_count || 0,
          total: c.total_images || 0,
          processed: c.ocr_scanned_count || 0
        };
      });
      setContainerResults(initialResults);
    } catch (err) {
      console.error('Lỗi khi tải danh sách container chờ quét:', err);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cancelRequestedRef.current = false;
      pauseRequestedRef.current = false;
      setIsScanning(false);
      setIsPaused(false);
      setCurrentContIndex(-1);
      setScanSummary(null);
      setLiveLogs([]);
      loadTargetContainers();
    }
  }, [isOpen, scope, includeMismatched]);

  // Cuộn log xuống cuối
  useEffect(() => {
    if (logsEndRef.current && showLogs) {
      logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
    }
  }, [liveLogs, showLogs]);

  const addLog = (text, type = 'info') => {
    const time = new Date().toLocaleTimeString('vi-VN');
    setLiveLogs((prev) => [
      ...prev.slice(-150),
      { time, text, type }
    ]);
  };

  // Bắt đầu quy trình Quét Tuần Tự Hàng Loạt Container
  const handleStartBatchScan = async () => {
    if (targetContainers.length === 0 || isScanning) return;

    setIsScanning(true);
    setIsPaused(false);
    setScanSummary(null);
    cancelRequestedRef.current = false;
    pauseRequestedRef.current = false;

    const totalConts = targetContainers.length;
    let totalImagesToProcess = 0;
    targetContainers.forEach((c) => {
      totalImagesToProcess += onlyUnprocessed ? (c.unscanned_images || c.total_images) : c.total_images;
    });

    setOverallStats({
      processedImages: 0,
      totalImages: totalImagesToProcess,
      passedImages: 0,
      failedImages: 0,
      completedContainers: 0
    });

    addLog(`🚀 Khởi động quét hàng loạt cho ${totalConts} Container (~${totalImagesToProcess} ảnh)...`, 'info');

    let processedImgsSum = 0;
    let passedImgsSum = 0;
    let failedImgsSum = 0;
    let completedContsCount = 0;

    for (let i = 0; i < totalConts; i++) {
      if (cancelRequestedRef.current) {
        addLog('⏹ Đã dừng toàn bộ tiến trình quét theo yêu cầu của người dùng.', 'warn');
        break;
      }

      // Hỗ trợ Pause: nếu pause thì chờ loop
      while (pauseRequestedRef.current && !cancelRequestedRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (cancelRequestedRef.current) break;

      const cont = targetContainers[i];
      setCurrentContIndex(i);
      setCurrentContProgress({ processed: 0, total: cont.total_images });

      // Đánh dấu Container đang quét
      setContainerResults((prev) => ({
        ...prev,
        [cont.container_id]: {
          ...prev[cont.container_id],
          status: 'scanning',
          label: 'Đang quét AI...'
        }
      }));

      addLog(`▶ [${i + 1}/${totalConts}] Đang quét Container ${cont.container_number} (${cont.total_images} ảnh)...`, 'info');

      // Tạo controller cho Container hiện tại
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        let contPassed = 0;
        let contFailed = 0;
        let contFinalSummary = null;

        await lpnCrawlerApi.scanContainerDeepStream(
          cont.container_id,
          {
            only_unprocessed: onlyUnprocessed,
            model_id: selectedModel
          },
          (ev) => {
            if (ev.type === 'start') {
              setCurrentContProgress({ processed: 0, total: ev.total });
            } else if (ev.type === 'item_scanned') {
              contPassed = ev.passed_count;
              contFailed = ev.failed_count;

              setCurrentContProgress({
                processed: ev.processed,
                total: ev.total
              });

              setContainerResults((prev) => ({
                ...prev,
                [cont.container_id]: {
                  ...prev[cont.container_id],
                  status: 'scanning',
                  processed: ev.processed,
                  total: ev.total,
                  passed: ev.passed_count,
                  failed: ev.failed_count,
                  label: `Đang quét (${ev.processed}/${ev.total})`
                }
              }));

              if (ev.status === 'success') {
                passedImgsSum++;
              } else {
                failedImgsSum++;
              }
              processedImgsSum++;

              setOverallStats({
                processedImages: processedImgsSum,
                totalImages: totalImagesToProcess,
                passedImages: passedImgsSum,
                failedImages: failedImgsSum,
                completedContainers: completedContsCount
              });
            } else if (ev.type === 'complete') {
              contFinalSummary = ev;
            } else if (ev.type === 'empty') {
              contFinalSummary = { status_code: 'PASSED', status_label: 'Đã hoàn tất trước đó', passed_count: cont.total_images, failed_count: 0 };
            }
          },
          controller.signal
        );

        completedContsCount++;
        const isContPassed = contFinalSummary?.status_code === 'PASSED';
        const finalStatus = isContPassed ? 'passed' : 'mismatch';
        const finalLabel = contFinalSummary?.status_label || (isContPassed ? 'Đạt' : `Lệch mã ${contFailed} ảnh`);

        setContainerResults((prev) => ({
          ...prev,
          [cont.container_id]: {
            ...prev[cont.container_id],
            status: finalStatus,
            label: finalLabel,
            passed: contFinalSummary?.passed_count || contPassed,
            failed: contFinalSummary?.failed_count || contFailed
          }
        }));

        setOverallStats((prev) => ({
          ...prev,
          completedContainers: completedContsCount
        }));

        addLog(
          `✓ Hoàn tất Container ${cont.container_number}: ${finalLabel} (${contPassed} Đạt, ${contFailed} Lệch)`,
          isContPassed ? 'success' : 'warn'
        );
      } catch (contErr) {
        if (contErr.name === 'AbortError') {
          addLog(`⚠ Đã ngắt Container ${cont.container_number}`, 'warn');
        } else {
          addLog(`❌ Lỗi quét Container ${cont.container_number}: ${contErr.message}`, 'error');
          setContainerResults((prev) => ({
            ...prev,
            [cont.container_id]: {
              ...prev[cont.container_id],
              status: 'error',
              label: 'Lỗi máy chủ'
            }
          }));
        }
      } finally {
        abortControllerRef.current = null;
      }
    }

    setIsScanning(false);
    setIsPaused(false);
    setCurrentContIndex(-1);

    const summary = {
      totalContainers: totalConts,
      completedContainers: completedContsCount,
      totalImages: totalImagesToProcess,
      processedImages: processedImgsSum,
      passedImages: passedImgsSum,
      failedImages: failedImgsSum
    };
    setScanSummary(summary);
    addLog(`🎉 HOÀN TẤT TIẾN TRÌNH QUÉT HÀNG LOẠT: ${completedContsCount}/${totalConts} Container.`, 'success');
  };

  // Tạm dừng / Tiếp tục
  const handleTogglePause = () => {
    if (isPaused) {
      pauseRequestedRef.current = false;
      setIsPaused(false);
      addLog('▶ Tiếp tục tiến trình quét...', 'info');
    } else {
      pauseRequestedRef.current = true;
      setIsPaused(true);
      addLog('⏸ Đã tạm dừng tiến trình quét.', 'warn');
    }
  };

  // Dừng hoàn toàn
  const handleStopScan = () => {
    cancelRequestedRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsScanning(false);
    setIsPaused(false);
    addLog('⏹ Yêu cầu dừng tiến trình quét được kích hoạt.', 'warn');
  };

  // Tính phần trăm tiến trình
  const overallPercent = overallStats.totalImages > 0
    ? Math.min(100, Math.round((overallStats.processedImages / overallStats.totalImages) * 100))
    : 0;

  const contPercent = currentContProgress.total > 0
    ? Math.round((currentContProgress.processed / currentContProgress.total) * 100)
    : 0;

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(29, 20, 15, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          width: '920px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          backgroundColor: '#FFFDF9',
          borderRadius: '14px',
          border: '1px solid #E4D3BF',
          boxShadow: '0 20px 40px rgba(74, 46, 27, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* 1. Header */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#F5EBE1',
            borderBottom: '1px solid #E4D3BF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(217, 119, 6, 0.35)'
              }}
            >
              <Zap size={18} color="#FFFFFF" fill="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontSize: '1.02rem', fontWeight: '800', color: '#4A2E1B' }}>
                Quét Tự Động Hàng Loạt Container Chưa Quét
              </div>
              <div style={{ fontSize: '0.74rem', color: '#7B5233' }}>
                Tự động nhận diện AI OCR cho các Container chưa có kết quả hoặc chưa quét đủ ảnh
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isScanning) {
                if (window.confirm('Tiến trình quét đang chạy. Bạn có chắc chắn muốn dừng và đóng lại?')) {
                  handleStopScan();
                  onClose();
                }
              } else {
                onClose();
              }
            }}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#7B5233',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 2. Body Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* A. Configuration Bar (Khi chưa chạy) */}
          {!isScanning && !scanSummary && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#FAF5EE',
                border: '1px solid #EADCC9',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {/* Scope Selection */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#4A2E1B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Filter size={13} />
                  <span>Phạm vi:</span>
                </span>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer', fontWeight: scope === 'filter' ? '700' : '500' }}>
                  <input
                    type="radio"
                    name="scan_scope"
                    value="filter"
                    checked={scope === 'filter'}
                    onChange={() => setScope('filter')}
                    style={{ accentColor: '#D97706' }}
                  />
                  <span>Theo bộ lọc bảng hiện tại</span>
                </label>

                {selectedContainerIds.length > 0 && (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer', fontWeight: scope === 'selected' ? '700' : '500' }}>
                    <input
                      type="radio"
                      name="scan_scope"
                      value="selected"
                      checked={scope === 'selected'}
                      onChange={() => setScope('selected')}
                      style={{ accentColor: '#D97706' }}
                    />
                    <span>Chỉ {selectedContainerIds.length} Container đã tick chọn</span>
                  </label>
                )}

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#2D1A12', cursor: 'pointer', fontWeight: scope === 'all' ? '700' : '500' }}>
                  <input
                    type="radio"
                    name="scan_scope"
                    value="all"
                    checked={scope === 'all'}
                    onChange={() => setScope('all')}
                    style={{ accentColor: '#D97706' }}
                  />
                  <span>Toàn bộ hệ thống</span>
                </label>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px dashed #E0D3C1' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#4A2E1B', cursor: 'pointer', fontWeight: '600' }}>
                  <input
                    type="checkbox"
                    checked={onlyUnprocessed}
                    onChange={(e) => setOnlyUnprocessed(e.target.checked)}
                    style={{ accentColor: '#7B5233' }}
                  />
                  <span>Chỉ quét ảnh chưa quét hoặc bị lỗi (Bỏ qua ảnh đã Đạt)</span>
                </label>

                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#4A2E1B', cursor: 'pointer', fontWeight: '600' }}>
                  <input
                    type="checkbox"
                    checked={includeMismatched}
                    onChange={(e) => setIncludeMismatched(e.target.checked)}
                    style={{ accentColor: '#7B5233' }}
                  />
                  <span>Quét lại cả Container đang bị Lệch mã</span>
                </label>
              </div>
            </div>
          )}

          {/* B. Live Progress Monitor (Khi đang quét hoặc hoàn tất) */}
          {(isScanning || scanSummary) && (
            <div
              style={{
                padding: '14px 16px',
                backgroundColor: isScanning ? '#FEF3C7' : '#DCFCE7',
                border: isScanning ? '1px solid #FCD34D' : '1px solid #86EFAC',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {/* Progress Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isScanning && <Loader2 size={16} color="#B45309" style={{ animation: 'spin 1s linear infinite' }} />}
                  {!isScanning && <CheckCircle2 size={16} color="#15803D" />}
                  <span style={{ fontSize: '0.86rem', fontWeight: '800', color: isScanning ? '#92400E' : '#166534' }}>
                    {isScanning
                      ? (isPaused ? '⏸ Đã tạm dừng quét' : `Đang quét Container ${currentContIndex + 1}/${targetContainers.length}: ${targetContainers[currentContIndex]?.container_number || '—'}`)
                      : `✓ Hoàn tất quét toàn bộ ${scanSummary?.completedContainers || targetContainers.length} Container!`
                    }
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: isScanning ? '#B45309' : '#15803D' }}>
                  {overallPercent}%
                </div>
              </div>

              {/* Progress Bar 1: Overall Images */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#5D4037', marginBottom: '3px' }}>
                  <span>Tiến độ tổng thể theo ảnh:</span>
                  <span>{overallStats.processedImages} / {overallStats.totalImages} ảnh ({overallPercent}%)</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${overallPercent}%`,
                      height: '100%',
                      backgroundColor: isScanning ? '#D97706' : '#16A34A',
                      transition: 'width 0.25s ease'
                    }}
                  />
                </div>
              </div>

              {/* Progress Bar 2: Current Container (Khi đang quét) */}
              {isScanning && currentContProgress.total > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: '#7B5233', marginBottom: '3px' }}>
                    <span>Container hiện tại ({targetContainers[currentContIndex]?.container_number}):</span>
                    <span>{currentContProgress.processed} / {currentContProgress.total} ảnh ({contPercent}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${contPercent}%`,
                        height: '100%',
                        backgroundColor: '#EA580C',
                        transition: 'width 0.2s ease'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Stats Counters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                <span style={{ padding: '3px 8px', backgroundColor: '#ECFDF5', color: '#047857', borderRadius: '4px', fontWeight: '700', fontSize: '0.74rem' }}>
                  ✓ {overallStats.passedImages} Ảnh Đạt
                </span>
                <span style={{ padding: '3px 8px', backgroundColor: '#FEF2F2', color: '#B91C1C', borderRadius: '4px', fontWeight: '700', fontSize: '0.74rem' }}>
                  ⚠ {overallStats.failedImages} Lệch/Lỗi
                </span>
                <span style={{ padding: '3px 8px', backgroundColor: '#F3F4F6', color: '#4B5563', borderRadius: '4px', fontWeight: '600', fontSize: '0.74rem' }}>
                  ⏳ Còn lại {Math.max(0, overallStats.totalImages - overallStats.processedImages)} ảnh
                </span>
              </div>
            </div>
          )}

          {/* C. Target Container List Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.80rem', fontWeight: '700', color: '#4A2E1B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={14} />
                <span>Danh sách Container ({targetContainers.length} Container • {totalUnscannedImages} ảnh cần quét)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!isScanning && (
                  <button
                    type="button"
                    onClick={loadTargetContainers}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      color: '#7B5233',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <RotateCcw size={12} />
                    <span>Làm mới</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowLogs(!showLogs)}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    color: '#7B5233',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <FileText size={12} />
                  <span>{showLogs ? 'Ẩn Log' : 'Xem Log'}</span>
                </button>
              </div>
            </div>

            {/* Container List Box */}
            <div
              style={{
                maxHeight: isScanning ? '220px' : '300px',
                overflowY: 'auto',
                border: '1px solid #EADCC9',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF'
              }}
            >
              {isLoadingList ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#7B5233', fontSize: '0.82rem' }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                  <div>Đang tải danh sách Container chưa quét...</div>
                </div>
              ) : targetContainers.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#15803D', fontSize: '0.84rem', fontWeight: '700' }}>
                  ✓ Tuyệt vời! Không có Container nào trong phạm vi này cần quét. Tất cả ảnh đều đã hoàn tất!
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', color: '#5D4037', fontWeight: '700', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', width: '40px' }}>#</th>
                      <th style={{ padding: '8px 12px' }}>Số Container</th>
                      <th style={{ padding: '8px 12px' }}>Nhà Máy</th>
                      <th style={{ padding: '8px 12px' }}>Ngày Loading</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Số Ảnh</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Trạng Thái Quét</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targetContainers.map((c, idx) => {
                      const res = containerResults[c.container_id] || {};
                      const isCurrent = isScanning && currentContIndex === idx;
                      const isDone = res.status === 'passed' || res.status === 'mismatch';

                      return (
                        <tr
                          key={c.container_id}
                          style={{
                            borderBottom: '1px solid #F0E6D8',
                            backgroundColor: isCurrent ? '#FEF3C7' : (isDone ? (res.status === 'passed' ? '#F0FDF4' : '#FEF2F2') : '#FFFFFF'),
                            transition: 'background-color 0.2s'
                          }}
                        >
                          <td style={{ padding: '8px 12px', color: '#8D6E63', fontWeight: '600' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 12px', fontWeight: '800', fontFamily: 'monospace', color: '#2D1A12' }}>
                            {c.container_number}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#5D4037' }}>{c.factory || '—'}</td>
                          <td style={{ padding: '8px 12px', color: '#5D4037' }}>{c.date_loading || '—'}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700', color: '#4A2E1B' }}>
                            {c.unscanned_images > 0 ? `${c.ocr_scanned_count}/${c.total_images}` : c.total_images}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {isCurrent ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', backgroundColor: '#FDE68A', color: '#92400E', borderRadius: '4px', fontWeight: '700' }}>
                                <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                                <span>{res.label || 'Đang quét...'}</span>
                              </span>
                            ) : res.status === 'passed' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', backgroundColor: '#DCFCE7', color: '#166534', borderRadius: '4px', fontWeight: '700' }}>
                                <CheckCircle2 size={11} />
                                <span>Đạt ({res.passed || c.total_images})</span>
                              </span>
                            ) : res.status === 'mismatch' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '4px', fontWeight: '700' }}>
                                <AlertTriangle size={11} />
                                <span>{res.label || `Lệch mã ${res.failed} ảnh`}</span>
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', backgroundColor: '#F3F4F6', color: '#4B5563', borderRadius: '4px', fontWeight: '600' }}>
                                <Clock size={11} />
                                <span>{c.status_label || 'Chưa quét'}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* D. Live Logs Console (Collapsible) */}
          {showLogs && (
            <div
              ref={logsEndRef}
              style={{
                maxHeight: '140px',
                overflowY: 'auto',
                backgroundColor: '#1E1E1E',
                color: '#D4D4D4',
                fontFamily: 'Consolas, monospace',
                fontSize: '0.72rem',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #333333',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px'
              }}
            >
              {liveLogs.length === 0 ? (
                <div style={{ color: '#666666' }}>// Sẵn sàng nhận nhật ký tiến trình quét...</div>
              ) : (
                liveLogs.map((log, lIdx) => (
                  <div key={lIdx} style={{ lineHeight: 1.4 }}>
                    <span style={{ color: '#888888', marginRight: '6px' }}>[{log.time}]</span>
                    <span
                      style={{
                        color:
                          log.type === 'error'
                            ? '#F87171'
                            : log.type === 'warn'
                            ? '#FBBF24'
                            : log.type === 'success'
                            ? '#34D399'
                            : '#60A5FA'
                      }}
                    >
                      {log.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 3. Footer Action Bar */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#FAF6F0',
            borderTop: '1px solid #E4D3BF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#5D4037', fontWeight: '600' }}>
            {isScanning ? (
              <span>Đang xử lý container {currentContIndex + 1}/{targetContainers.length}...</span>
            ) : scanSummary ? (
              <span style={{ color: '#166534', fontWeight: '700' }}>✓ Đã hoàn thành toàn bộ lượt quét hàng loạt.</span>
            ) : (
              <span>Sẵn sàng quét {targetContainers.length} Container (~{totalUnscannedImages} ảnh).</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!isScanning && !scanSummary && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D6C2AC',
                    borderRadius: '8px',
                    fontSize: '0.80rem',
                    fontWeight: '700',
                    color: '#6D4C41',
                    cursor: 'pointer'
                  }}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={targetContainers.length === 0 || isLoadingList}
                  onClick={handleStartBatchScan}
                  style={{
                    padding: '8px 18px',
                    backgroundColor: targetContainers.length === 0 ? '#9CA3AF' : '#D97706',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: '800',
                    color: '#FFFFFF',
                    cursor: targetContainers.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(217, 119, 6, 0.35)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Zap size={15} fill="#FFFFFF" />
                  <span>Bắt Đầu Quét ({targetContainers.length} Cont)</span>
                </button>
              </>
            )}

            {isScanning && (
              <>
                <button
                  type="button"
                  onClick={handleTogglePause}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: isPaused ? '#15803D' : '#D97706',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.80rem',
                    fontWeight: '700',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isPaused ? <Play size={13} fill="#FFFFFF" /> : <Pause size={13} fill="#FFFFFF" />}
                  <span>{isPaused ? 'Tiếp Tục' : 'Tạm Dừng'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleStopScan}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#DC2626',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.80rem',
                    fontWeight: '700',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Square size={13} fill="#FFFFFF" />
                  <span>Dừng Quét</span>
                </button>
              </>
            )}

            {!isScanning && scanSummary && (
              <button
                type="button"
                onClick={() => {
                  onScanComplete();
                  onClose();
                }}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#15803D',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(21, 128, 61, 0.3)'
                }}
              >
                <CheckCircle2 size={15} />
                <span>Hoàn Tất & Xem Kết Quả</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchContainerScanModal;
