import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateMDY } from '../utils/formatters';
import { ImageCanvas } from '../../ai_ocr_train/frontend/components/ImageCanvas';

export const AiOcrScanModal = ({ isOpen, onClose }) => {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [limitCount, setLimitCount] = useState(25);
  const [onlyUnprocessed, setOnlyUnprocessed] = useState(false);
  const [containerFilter, setContainerFilter] = useState('');

  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanReport, setScanReport] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // all, success, failed
  const [previewImage, setPreviewImage] = useState(null);

  // Phân trang cho Bảng Kết Quả Đọc Hình Ảnh Chi Tiết
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Inspector Pipeline Detail Modal States
  const [inspectingItem, setInspectingItem] = useState(null);
  const [inspectorTab, setInspectorTab] = useState('ocr');
  const [selectedRoiIndex, setSelectedRoiIndex] = useState(-1);
  const [roiTokensView, setRoiTokensView] = useState('roi_detail');
  const [inspectorAnalysis, setInspectorAnalysis] = useState(null);
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const inspectorCacheRef = useRef({});

  // Live Progress & Log States
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState({
    index: 0,
    total: 0,
    percent: 0,
    successCount: 0,
    failedCount: 0,
    durationMs: 0
  });
  const [showLogs, setShowLogs] = useState(true);
  const logsEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Tự động cuộn xuống cuối log khi có dòng mới
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
    }
  }, [logs]);

  // Load danh sách model checkpoints từ API
  useEffect(() => {
    if (isOpen) {
      loadModels();
      inspectorCacheRef.current = {};
    }
  }, [isOpen]);

  // Khi chọn xem chi tiết 1 ảnh, tự động phân tích các bước pipeline (tận dụng cache tải tức thì <5ms)
  useEffect(() => {
    if (inspectingItem) {
      setInspectorTab('ocr');
      setSelectedRoiIndex(-1);
      fetchInspectorAnalysis(inspectingItem, false);
    } else {
      setInspectorAnalysis(null);
    }
  }, [inspectingItem]);

  const formatDuration = (ms) => {
    if (ms === null || ms === undefined || isNaN(ms)) return '—';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const sec = ms / 1000;
    if (sec < 60) return `${sec.toFixed(1)}s`;
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}p ${s < 10 ? '0' : ''}${s}s`;
  };

  const API_OCR_BASE = '/api/v1/lpn-crawler/ai-ocr';

  const loadModels = async () => {
    setIsLoadingModels(true);
    try {
      let res = await fetch(`${API_OCR_BASE}/models`);
      if (!res.ok) res = await fetch('/api/ai-ocr/models');
      const data = await res.json();
      if (data.success && Array.isArray(data.models)) {
        setModels(data.models);
        setSelectedModel(data.default_active || (data.models[0]?.id || ''));
      }
    } catch (err) {
      console.error('Lỗi tải danh sách mô hình AI:', err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const fetchInspectorAnalysis = async (item, force = false) => {
    if (!item) return;
    const itemKey = item.item_id || item.id;
    const cacheKey = `${itemKey}_${item.image_id}_${selectedModel || 'default'}`;
    if (!force && inspectorCacheRef.current[cacheKey]) {
      setInspectorAnalysis(inspectorCacheRef.current[cacheKey]);
      setInspectorLoading(false);
      return;
    }
    setInspectorLoading(true);
    setInspectorAnalysis(null);
    setSelectedRoiIndex(-1);
    try {
      const payload = {
        image_id: item.image_id,
        item_id: itemKey,
        model_id: selectedModel || undefined,
        force_refresh: Boolean(force),
        expected_lpn: item.expected_lpn || item.lpn || undefined,
        expected_sku: item.expected_sku || item.sku || undefined
      };
      let res = await fetch(`${API_OCR_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        res = await fetch('/api/ai-ocr/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      const data = await res.json();
      if (data && data.success) {
        inspectorCacheRef.current[cacheKey] = data;
        setInspectorAnalysis(data);
      }
    } catch (e) {
      console.warn('Lỗi lấy chi tiết phân tích pipeline:', e);
    } finally {
      setInspectorLoading(false);
    }
  };

  // Hàm Dừng Quét
  const handleStopScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsScanning(false);
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Đã dừng phiên quét theo yêu cầu.`]);
  };

  // Hàm Bắt Đầu Quét / Đọc Tiếp / Đọc Từ Đầu
  const handleStartScan = async (isContinue = false) => {
    if (isScanning) return;
    setIsScanning(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let baseResults = [];
    if (isContinue && scanReport && Array.isArray(scanReport.results)) {
      baseResults = [...scanReport.results];
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Tiếp tục quét các ảnh kế tiếp...`]);
    } else {
      setScanReport(null);
      setPage(1);
      setLogs([
        `[${new Date().toLocaleTimeString()}] Khởi tạo phiên quét hình ảnh AI...`,
        `[${new Date().toLocaleTimeString()}] Phạm vi quét: Từ năm 2026 đến nay...`
      ]);
      setProgress({
        index: 0,
        total: 0,
        percent: 0,
        successCount: 0,
        failedCount: 0,
        durationMs: 0
      });
    }

    // Nếu bật onlyUnprocessed, CSDL đã tự động loại trừ mọi ảnh đã có kết quả (kể cả baseResults).
    // Chỉ cần truyền excludeIds khi người dùng tắt nút tick onlyUnprocessed để tránh truyền mảng hàng nghìn ID thừa qua mạng.
    const excludeIds = (isContinue && !onlyUnprocessed)
      ? baseResults.map((r) => r.image_id).filter(Boolean)
      : [];

    const payload = {
      model_id: selectedModel,
      limit: parseInt(limitCount) || 0,
      only_unprocessed: onlyUnprocessed,
      container_number: containerFilter.trim() || null,
      exclude_image_ids: excludeIds
    };

    try {
      let res = await fetch(`${API_OCR_BASE}/batch-scan-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!res.ok) {
        res = await fetch('/api/ai-ocr/batch-scan-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
      }

      if (!res.ok) {
        throw new Error(`Máy chủ trả về mã lỗi HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedResults = [...baseResults];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          try {
            const ev = JSON.parse(jsonStr);

            if (ev.type === 'start') {
              const combinedTotal = baseResults.length + ev.total;
              setProgress((prev) => ({
                ...prev,
                total: combinedTotal,
                index: baseResults.length,
                percent: combinedTotal > 0 ? Math.round((baseResults.length / combinedTotal) * 100) : 0
              }));
              if (ev.log) {
                setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${ev.log}`]);
              }
            } else if (ev.type === 'progress') {
              if (ev.item) {
                accumulatedResults = [ev.item, ...accumulatedResults.filter((x) => x.image_id !== ev.item.image_id)];
              }

              const totalCount = baseResults.length + ev.total;
              const currentIdx = baseResults.length + ev.index;
              const succCount = accumulatedResults.filter((r) => r.status === 'success').length;
              const failCount = accumulatedResults.filter((r) => r.status !== 'success').length;
              const pct = totalCount > 0 ? Math.round((currentIdx / totalCount) * 100) : 100;

              setProgress({
                index: currentIdx,
                total: totalCount,
                percent: pct,
                successCount: succCount,
                failedCount: failCount,
                durationMs: ev.duration_ms
              });

              if (ev.log) {
                setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${ev.log}`]);
              }

              setScanReport({
                success: true,
                total_scanned: accumulatedResults.length,
                total_success: succCount,
                total_failed: failCount,
                success_rate: accumulatedResults.length > 0 ? Math.round((succCount / accumulatedResults.length) * 100) : 0,
                model_used: selectedModel,
                results: accumulatedResults
              });
            } else if (ev.type === 'done') {
              const succCount = accumulatedResults.filter((r) => r.status === 'success').length;
              const failCount = accumulatedResults.filter((r) => r.status !== 'success').length;
              const rate = accumulatedResults.length > 0 ? Math.round((succCount / accumulatedResults.length) * 100) : 0;

              setProgress((prev) => ({
                ...prev,
                percent: 100,
                index: accumulatedResults.length,
                total: accumulatedResults.length,
                successCount: succCount,
                failedCount: failCount
              }));

              setScanReport({
                success: true,
                total_scanned: accumulatedResults.length,
                total_success: succCount,
                total_failed: failCount,
                success_rate: rate,
                model_used: ev.model_used || selectedModel,
                results: accumulatedResults
              });

              if (ev.log) {
                setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${ev.log}`]);
              }
            } else if (ev.type === 'empty' || ev.type === 'error') {
              if (ev.message) {
                setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] [Thông báo] ${ev.message}`]);
              }
            }
          } catch (errParse) {
            console.error('Lỗi parse SSE:', errParse);
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Phiên quét đã được dừng.');
        return;
      }
      console.error('Lỗi stream:', err);
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] [Lỗi stream] ${err.message}`]);
      // Fallback nếu stream gặp sự cố
      try {
        setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Chuyển sang chế độ quét trực tiếp...`]);
        let resFallback = await fetch(`${API_OCR_BASE}/batch-scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!resFallback.ok) {
          resFallback = await fetch('/api/ai-ocr/batch-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
        const data = await resFallback.json();
        if (data.success) {
          const combined = [...baseResults, ...(data.results || [])];
          const succCount = combined.filter((r) => r.status === 'success').length;
          const failCount = combined.filter((r) => r.status !== 'success').length;
          setScanReport({
            ...data,
            total_scanned: combined.length,
            total_success: succCount,
            total_failed: failCount,
            success_rate: combined.length > 0 ? Math.round((succCount / combined.length) * 100) : 0,
            results: combined
          });
          setProgress({
            index: combined.length,
            total: combined.length,
            percent: 100,
            successCount: succCount,
            failedCount: failCount,
            durationMs: 0
          });
          setLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Hoàn tất quét ${combined.length} ảnh: ${succCount} thành công, ${failCount} thất bại.`
          ]);
        }
      } catch (eFallback) {
        setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] [Lỗi] ${eFallback.message}`]);
      }
    } finally {
      setIsScanning(false);
      abortControllerRef.current = null;
    }
  };

  // Diff comparison helper function
  const renderDiffString = (gt = '', pred = '', isMatch = false) => {
    const gtStr = String(gt || '').trim();
    const predStr = String(pred || '').trim();
    const isExactMatch = isMatch || (gtStr === predStr && gtStr !== '');

    if (isExactMatch) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontFamily: 'Consolas, monospace', fontSize: '0.86rem', fontWeight: 'bold', color: '#047857' }}>
            {predStr || gtStr || '—'}
          </span>
          <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', fontSize: '0.62rem', fontWeight: '800', padding: '1px 6px', borderRadius: '3px' }}>
            (Khớp 100%)
          </span>
        </div>
      );
    }

    if (!predStr || predStr === 'Chưa nhận diện' || predStr === '—') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontFamily: 'Consolas, monospace', fontSize: '0.84rem', fontWeight: 'bold', color: '#DC2626' }}>
            (Chưa nhận diện)
          </span>
          <span style={{ backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '0.60rem', fontWeight: '800', padding: '1px 5px', borderRadius: '3px' }}>
            Bỏ sót mã
          </span>
        </div>
      );
    }

    const maxLen = Math.max(gtStr.length, predStr.length);
    const diffs = [];
    for (let i = 0; i < maxLen; i++) {
      const pChar = predStr[i] || '';
      const gChar = gtStr[i] || '';
      const isCharDiff = pChar !== gChar;
      diffs.push({ index: i + 1, pChar, gChar, isCharDiff });
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontFamily: 'Consolas, monospace', fontSize: '0.86rem', letterSpacing: '0.5px' }}>
            {diffs.map((d, idx) => (
              <span
                key={idx}
                style={{
                  backgroundColor: d.isCharDiff ? '#FEE2E2' : 'transparent',
                  color: d.isCharDiff ? '#DC2626' : '#047857',
                  fontWeight: d.isCharDiff ? '900' : 'bold',
                  padding: d.isCharDiff ? '1px 3px' : '0',
                  borderRadius: d.isCharDiff ? '3px' : '0',
                  border: d.isCharDiff ? '1px solid #FCA5A5' : 'none'
                }}
                title={d.isCharDiff ? `Vị trí ${d.index}: AI đọc '${d.pChar}' thay vì '${d.gChar}'` : `Ký tự '${d.pChar}' khớp`}
              >
                {d.pChar || '␣'}
              </span>
            ))}
          </span>
          <span style={{ backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '0.60rem', fontWeight: '800', padding: '1px 5px', borderRadius: '3px' }}>
            Lệch ký tự
          </span>
        </div>
      </div>
    );
  };

  const expLpnClean = inspectingItem ? String(inspectingItem.expected_lpn || inspectingItem.lpn || '').trim().toUpperCase() : '';
  const expSkuClean = inspectingItem ? String(inspectingItem.expected_sku || inspectingItem.sku || '').trim().replace(/^[-:;,. #*!_/]+|[-:;,. #*!_/]+$/g, '').toUpperCase() : '';

  const isLpnCodeMatch = (code) => {
    if (!expLpnClean || !code) return false;
    return String(code).trim().toUpperCase() === expLpnClean;
  };

  const isSkuCodeMatch = (code) => {
    if (!expSkuClean || !code) return false;
    const clean = String(code).trim().replace(/^[-:;,. #*!_/]+|[-:;,. #*!_/]+$/g, '').toUpperCase();
    if (clean === expSkuClean) return true;
    // Sửa nhầm lẫn quang học Q <-> O (ví dụ WQA <-> WOA)
    const calibClean = clean.replace(/-W[0Q]A$/, '-WOA').replace(/Q$/, 'O');
    const calibExp = expSkuClean.replace(/-W[0Q]A$/, '-WOA').replace(/Q$/, 'O');
    if (calibClean === calibExp) return true;
    if (clean.length === expSkuClean.length) {
      let diffs = 0;
      let isConf = true;
      for (let i = 0; i < clean.length; i++) {
        if (clean[i] !== expSkuClean[i]) {
          diffs++;
          const pair = [clean[i], expSkuClean[i]].sort().join('');
          if (!['OQ', '0O', '0Q', '0D', '8B', 'AR', '1I', '5S', '72', '8S', 'UV', '1L', '6G', '08'].includes(pair)) {
            isConf = false;
            break;
          }
        }
      }
      if (isConf && diffs <= 1) return true;
    }
    return false;
  };

  if (!isOpen) return null;

  const results = scanReport?.results || [];
  const filteredResults = results.filter((r) => {
    if (activeFilter === 'success') return r.status === 'success';
    if (activeFilter === 'failed') return r.status === 'failed';
    return true;
  });

  // Tính toán phân trang
  const total = results.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, total);
  const paginatedResults = results.slice(startIdx, endIdx);

  const getPageButtons = () => {
    const btns = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) btns.push(i);
    } else {
      btns.push(1);
      if (safePage > 3) btns.push('...');
      const rStart = Math.max(2, safePage - 1);
      const rEnd = Math.min(totalPages - 1, safePage + 1);
      for (let i = rStart; i <= rEnd; i++) btns.push(i);
      if (safePage < totalPages - 2) btns.push('...');
      btns.push(totalPages);
    }
    return btns;
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(25, 15, 10, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: '#FAF6F0',
            borderRadius: '12px',
            width: 'min(96vw, 1200px)',
            height: 'min(94vh, 900px)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 60px rgba(45, 26, 18, 0.3)',
            border: '1px solid #EADCC9',
            overflow: 'hidden',
            animation: 'modalScaleUp 0.18s ease-out forwards'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 20px',
              borderBottom: '1px solid #EADCC9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#FFFFFF'
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#2D1A12' }}>
                Đọc Hình Ảnh Bằng AI
              </h2>
              <div style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: '600', marginTop: '2px' }}>
                Phạm vi quét: Từ năm 2026 đến nay
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#7B5233',
                padding: '4px',
                borderRadius: '6px'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Configuration Section (Filters on Top, Action Bar on Bottom) */}
          <div
            style={{
              backgroundColor: '#FDFBF7',
              borderBottom: '1px solid #EADCC9',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Hàng 1: Các bộ lọc */}
            <div
              style={{
                padding: '14px 20px 10px 20px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'flex-end'
              }}
            >
              {/* Select Model */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 240px', minWidth: '190px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#4A2E1B', whiteSpace: 'nowrap' }}>
                  Chọn Mô Hình AI:
                </span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={isScanning || isLoadingModels}
                  style={{
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #D6C0A9',
                    backgroundColor: '#FFFFFF',
                    color: '#2D1A12',
                    fontSize: '0.80rem',
                    fontWeight: '700',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sample Count Limit */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '190px', flexShrink: 0 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#4A2E1B', whiteSpace: 'nowrap' }}>
                  Số Lượng Ảnh:
                </span>
                <select
                  value={limitCount}
                  onChange={(e) => setLimitCount(parseInt(e.target.value))}
                  disabled={isScanning}
                  style={{
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #D6C0A9',
                    backgroundColor: '#FFFFFF',
                    color: '#2D1A12',
                    fontSize: '0.80rem',
                    fontWeight: '700',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="10">10 ảnh (Test nhanh)</option>
                  <option value="25">25 ảnh</option>
                  <option value="50">50 ảnh</option>
                  <option value="100">100 ảnh</option>
                  <option value="200">200 ảnh</option>
                  <option value="500">500 ảnh (Batch lớn)</option>
                  <option value="0">Toàn bộ (Từ năm 2026 đến nay)</option>
                </select>
              </div>

              {/* Filter Container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '160px', flexShrink: 0 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#4A2E1B', whiteSpace: 'nowrap' }}>
                  Lọc Container:
                </span>
                <input
                  type="text"
                  placeholder="VD: JXLU... (Tùy chọn)"
                  value={containerFilter}
                  onChange={(e) => setContainerFilter(e.target.value)}
                  disabled={isScanning}
                  style={{
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #D6C0A9',
                    backgroundColor: '#FFFFFF',
                    fontSize: '0.80rem',
                    color: '#2D1A12',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Checkbox only unprocessed */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexShrink: 0 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'transparent', userSelect: 'none', whiteSpace: 'nowrap' }}>
                  &nbsp;
                </span>
                <label
                  style={{
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    color: onlyUnprocessed ? '#7B5233' : '#4A2E1B',
                    backgroundColor: onlyUnprocessed ? '#F4ECE1' : '#FFFFFF',
                    border: `1px solid ${onlyUnprocessed ? '#7B5233' : '#D6C0A9'}`,
                    borderRadius: '6px',
                    padding: '0 12px',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    transition: 'all 0.15s ease'
                  }}
                  title="Chỉ quét những ảnh trong CSDL chưa từng được nhận diện bằng AI"
                >
                  <input
                    type="checkbox"
                    checked={onlyUnprocessed}
                    onChange={(e) => setOnlyUnprocessed(e.target.checked)}
                    disabled={isScanning}
                    style={{ cursor: 'pointer', accentColor: '#7B5233' }}
                  />
                  Chỉ ảnh chưa có kết quả
                </label>
              </div>
            </div>

            {/* Hàng 2: Action & KPI Bar (4 Cards KPI bên trái + Nút Hành Động bên phải) */}
            <div
              style={{
                padding: '6px 18px',
                backgroundColor: '#F7F2EA',
                borderTop: '1px solid #EADCC9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexShrink: 0
              }}
            >
              {/* 4 Cards KPI hiển thị dàn đều, tách rời thoáng đãng */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '14px',
                  flex: 1,
                  maxWidth: '820px'
                }}
              >
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5D5C0',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(123, 82, 51, 0.05)'
                  }}
                >
                  <span style={{ fontSize: '0.62rem', fontWeight: '800', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block' }}>
                    TỔNG ẢNH ĐÃ ĐỌC
                  </span>
                  <div style={{ fontSize: '1.12rem', fontWeight: '900', color: '#2D1A12', lineHeight: '1.2', marginTop: '2px' }}>
                    {scanReport?.total_scanned ?? progress.index ?? 0}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #A7F3D0',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(4, 120, 87, 0.05)'
                  }}
                >
                  <span style={{ fontSize: '0.62rem', fontWeight: '800', color: '#047857', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block' }}>
                    ĐỌC THÀNH CÔNG
                  </span>
                  <div style={{ fontSize: '1.12rem', fontWeight: '900', color: '#047857', lineHeight: '1.2', marginTop: '2px' }}>
                    {scanReport?.total_success ?? progress.successCount ?? 0}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: (scanReport?.total_failed > 0 || progress.failedCount > 0) ? '1px solid #FECACA' : '1px solid #E5D5C0',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(220, 38, 38, 0.05)'
                  }}
                >
                  <span style={{ fontSize: '0.62rem', fontWeight: '800', color: (scanReport?.total_failed > 0 || progress.failedCount > 0) ? '#DC2626' : '#8D6E63', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block' }}>
                    ĐỌC THẤT BẠI
                  </span>
                  <div style={{ fontSize: '1.12rem', fontWeight: '900', color: (scanReport?.total_failed > 0 || progress.failedCount > 0) ? '#DC2626' : '#8D6E63', lineHeight: '1.2', marginTop: '2px' }}>
                    {scanReport?.total_failed ?? progress.failedCount ?? 0}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5D5C0',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(123, 82, 51, 0.05)'
                  }}
                >
                  <span style={{ fontSize: '0.62rem', fontWeight: '800', color: '#047857', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'block' }}>
                    TỶ LỆ THÀNH CÔNG
                  </span>
                  <div style={{ fontSize: '1.12rem', fontWeight: '900', color: '#047857', lineHeight: '1.2', marginTop: '2px' }}>
                    {scanReport?.success_rate ?? (progress.index > 0 ? Math.round((progress.successCount / progress.index) * 100) : 0)}%
                  </div>
                </div>
              </div>

              {/* Action Buttons: Dừng Quét / Đọc Tiếp / Đọc Từ Đầu / Bắt Đầu Đọc Ảnh */}
              {isScanning ? (
                <button
                  type="button"
                  onClick={handleStopScan}
                  style={{
                    height: '36px',
                    padding: '0 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#B91C1C';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#DC2626';
                  }}
                >
                  Dừng Quét
                </button>
              ) : scanReport && (scanReport.results || []).length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleStartScan(false)}
                    style={{
                      height: '36px',
                      padding: '0 16px',
                      borderRadius: '6px',
                      border: '1px solid #D6C0A9',
                      backgroundColor: '#FFFFFF',
                      color: '#4A2E1B',
                      fontWeight: '700',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F4ECE1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }}
                  >
                    Đọc Từ Đầu
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartScan(true)}
                    style={{
                      height: '36px',
                      padding: '0 22px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#047857',
                      color: '#FFFFFF',
                      fontWeight: '700',
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#065F46';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#047857';
                    }}
                  >
                    Đọc Tiếp
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleStartScan(false)}
                  style={{
                    height: '36px',
                    padding: '0 22px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#047857',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#065F46';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#047857';
                  }}
                >
                  Bắt Đầu Đọc Ảnh
                </button>
              )}
            </div>
          </div>

          {/* Body Content - CỐ ĐỊNH LAYOUT, KHÔNG CUỘN CẢ POPUP */}
          <div style={{ padding: '10px 18px', flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Thanh Tiến Trình & Khung Ghi Log Thời Gian Thực */}
            {(isScanning || logs.length > 0) && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EADCC9',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  flexShrink: 0,
                  boxShadow: '0 1px 4px rgba(123, 82, 51, 0.03)'
                }}
              >
                {/* Progress Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#2D1A12' }}>
                      Tiến Trình Xử Lý:
                    </span>
                    <span style={{ fontSize: '0.76rem', fontWeight: '700', color: '#7B5233' }}>
                      {progress.index} / {progress.total} ảnh ({progress.percent}%)
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {progress.durationMs > 0 && (
                      <span style={{ fontSize: '0.72rem', color: '#7B5233', fontWeight: '700' }}>
                        Thời gian: {formatDuration(progress.durationMs)}
                      </span>
                    )}
                    <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: '700' }}>
                      Thành công: {progress.successCount}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: '700' }}>
                      Thất bại: {progress.failedCount}
                    </span>
                  </div>
                </div>

                {/* Progress Bar Track */}
                <div
                  style={{
                    width: '100%',
                    height: '7px',
                    backgroundColor: '#EADCC9',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: `${progress.percent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
                      borderRadius: '4px',
                      transition: 'width 0.25s ease'
                    }}
                  />
                </div>

                {/* Log Console Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#4E3629' }}>
                    Nhật ký quét ({logs.length} dòng)
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowLogs(!showLogs)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#7B5233',
                        fontSize: '0.70rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {showLogs ? 'Thu gọn' : 'Mở rộng'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setLogs([])}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#9CA3AF',
                        fontSize: '0.70rem',
                        cursor: 'pointer'
                      }}
                    >
                      Xóa log
                    </button>
                  </div>
                </div>

                {/* Console Box */}
                {showLogs && (
                  <div
                    ref={logsEndRef}
                    style={{
                      backgroundColor: '#1E1610',
                      borderRadius: '6px',
                      border: '1px solid #4A3528',
                      padding: '6px 10px',
                      height: '130px',
                      overflowY: 'auto',
                      fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                      fontSize: '0.70rem',
                      lineHeight: '1.4',
                      color: '#F4ECE1'
                    }}
                  >
                    {logs.length === 0 ? (
                      <div style={{ color: '#7B6252', fontStyle: 'italic' }}>Chưa có log...</div>
                    ) : (
                      logs.map((line, idx) => {
                        let color = '#D1D5DB';
                        if (line.includes('Thành công') || line.includes('Khớp') || line.includes('[OK]')) color = '#34D399';
                        else if (line.includes('Thất bại') || line.includes('Lỗi') || line.includes('[Lỗi]')) color = '#F87171';
                        else if (line.includes('Bắt đầu') || line.includes('Hoàn tất') || line.includes('HOÀN TẤT')) color = '#FDE68A';

                        return (
                          <div key={idx} style={{ color, wordBreak: 'normal', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                            {line.replace(/\bBỏ qua\b/g, 'Bỏ\u00A0qua')}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Table Container Card (Cố định Tiêu Đề & Phân Trang, CHỈ Cuộn Nội Dung Bảng) */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #EADCC9',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(74, 46, 27, 0.04)'
              }}
            >
              {/* Tiêu đề Bảng - CỐ ĐỊNH */}
              <div
                style={{
                  padding: '7px 14px',
                  borderBottom: '1px solid #EADCC9',
                  backgroundColor: '#FAF6F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexShrink: 0
                }}
              >
                <span style={{ fontSize: '0.80rem', fontWeight: '800', color: '#4A2E1B' }}>
                  Bảng Kết Quả Đọc Hình Ảnh Chi Tiết ({results.length.toLocaleString()} bản ghi):
                </span>
                {totalPages > 1 && (
                  <span style={{ fontSize: '0.72rem', color: '#8D6E63', fontWeight: '600' }}>
                    Trang <b>{safePage}</b> / <b>{totalPages}</b>
                  </span>
                )}
              </div>

              {/* Vùng Bảng - CHỈ VÙNG NÀY ĐƯỢC SCROLL */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F4ECE1', zIndex: 10 }}>
                    <tr style={{ borderBottom: '1px solid #EADCC9', color: '#4E3629', fontWeight: '800' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '55px', whiteSpace: 'nowrap' }}>Ảnh</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', minWidth: '160px', whiteSpace: 'nowrap' }}>Container / Kiện</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', minWidth: '180px', whiteSpace: 'nowrap' }}>Mã LPN Nhận Diện</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', minWidth: '180px', whiteSpace: 'nowrap' }}>Mã SKU Nhận Diện</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', width: '110px', whiteSpace: 'nowrap' }}>Thời Gian Đọc</th>
                      <th style={{ padding: '8px 14px', textAlign: 'center', width: '130px', whiteSpace: 'nowrap' }}>Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '36px 20px', textAlign: 'center', color: '#8D6E63' }}>
                          <div style={{ fontWeight: '700', color: '#4A2E1B', fontSize: '0.85rem' }}>
                            Chưa có dữ liệu đọc ảnh
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#8D6E63', marginTop: '4px' }}>
                            Bấm "Bắt Đầu Đọc Ảnh" để quét và hiển thị kết quả tại đây.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedResults.map((r, idx) => {
                        const isSuccess = r.status === 'success';
                        return (
                          <tr
                            key={idx}
                            onClick={() => setInspectingItem(r)}
                            style={{
                              borderBottom: '1px solid #F0E6D8',
                              backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FDFBF7',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#F8F3EA';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#FDFBF7';
                            }}
                            title="Bấm để xem chi tiết ảnh & luồng pipeline"
                          >
                            {/* Ảnh thumbnail */}
                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                              {r.image_url ? (
                                <img
                                  src={r.image_url}
                                  alt="Thumb"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewImage(r.image_url);
                                  }}
                                  style={{
                                    width: '42px',
                                    height: '32px',
                                    objectFit: 'cover',
                                    borderRadius: '4px',
                                    border: '1px solid #D6C0A9',
                                    cursor: 'zoom-in'
                                  }}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div style={{ width: '42px', height: '32px', backgroundColor: '#FAF6F0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#8D6E63' }}>
                                  N/A
                                </div>
                              )}
                            </td>

                            {/* Container & Kiện */}
                            <td style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: '800', color: '#2D1A12' }}>{r.container_number}</span>
                                {r.date_loading && (
                                  <span style={{ fontSize: '0.68rem', color: '#7B5233', backgroundColor: '#F4ECE1', padding: '1px 6px', borderRadius: '4px', border: '1px solid #E5D5C0', fontWeight: '700' }}>
                                    {formatDateMDY(r.date_loading)}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.70rem', color: '#8D6E63', marginTop: '2px' }}>{r.suffix_key || '—'}</div>
                            </td>

                            {/* LPN */}
                            <td style={{ padding: '6px 12px' }}>
                              <div style={{ fontFamily: 'Consolas, monospace', fontWeight: '800', color: r.detected_lpn ? '#047857' : '#9CA3AF' }}>
                                {r.detected_lpn || '—'}
                              </div>
                              {r.expected_lpn && (
                                <div style={{ fontSize: '0.68rem', color: '#8D6E63' }}>
                                  Gốc: {r.expected_lpn} {r.is_lpn_match ? '(Khớp)' : ''}
                                </div>
                              )}
                            </td>

                            {/* SKU */}
                            <td style={{ padding: '6px 12px' }}>
                              <div style={{ fontWeight: '700', color: r.detected_sku ? '#4A2E1B' : '#9CA3AF' }}>
                                {r.detected_sku || '—'}
                              </div>
                              {r.expected_sku && (
                                <div style={{ fontSize: '0.68rem', color: '#8D6E63' }}>
                                  Gốc: {r.expected_sku} {r.is_sku_match ? '(Khớp)' : ''}
                                </div>
                              )}
                            </td>

                            {/* Thời Gian Đọc */}
                            <td style={{ padding: '6px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {r.processing_time_ms > 0 ? (
                                <span style={{ fontFamily: 'Consolas, monospace', fontSize: '0.78rem', fontWeight: '700', color: '#4A2E1B' }}>
                                  {formatDuration(r.processing_time_ms)}
                                </span>
                              ) : (
                                <span style={{ color: '#9CA3AF', fontSize: '0.70rem' }}>—</span>
                              )}
                            </td>

                            {/* Trạng thái & Lý do */}
                            <td style={{ padding: '6px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {isSuccess ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      whiteSpace: 'nowrap',
                                      backgroundColor: '#ECFDF5',
                                      color: '#047857',
                                      padding: '3px 10px',
                                      borderRadius: '12px',
                                      fontSize: '0.74rem',
                                      fontWeight: '800',
                                      border: '1px solid #A7F3D0'
                                    }}
                                  >
                                    Thành công
                                  </span>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      whiteSpace: 'nowrap',
                                      backgroundColor: '#FEF2F2',
                                      color: '#DC2626',
                                      padding: '3px 10px',
                                      borderRadius: '12px',
                                      fontSize: '0.74rem',
                                      fontWeight: '800',
                                      border: '1px solid #FECACA'
                                    }}
                                  >
                                    Thất bại
                                  </span>
                                  {r.error_reason && (
                                    <span style={{ fontSize: '0.64rem', color: '#DC2626', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.error_reason}>
                                      {r.error_reason}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer Phân Trang Chuẩn Giao Diện - CỐ ĐỊNH Ở ĐÁY BẢNG */}
              <div
                className="lpn-pagination-container"
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 14px',
                  backgroundColor: '#FFFFFF',
                  borderTop: '1px solid #EADCC9',
                  fontSize: '0.78rem',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#8D6E63', fontWeight: '600' }}>
                  <span>
                    Hiển thị <b>{total > 0 ? (startIdx + 1).toLocaleString() : 0}</b>–<b>{endIdx.toLocaleString()}</b> trên <b>{total.toLocaleString()}</b> bản ghi
                  </span>

                  {total > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#8D6E63' }}>Số dòng:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setPage(1);
                        }}
                        style={{
                          height: '26px',
                          padding: '0 6px',
                          fontSize: '0.74rem',
                          fontWeight: '700',
                          color: '#4A2E1B',
                          backgroundColor: '#FAF6F0',
                          border: '1px solid #D6C0A9',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value={10}>10 / trang</option>
                        <option value={20}>20 / trang</option>
                        <option value={50}>50 / trang</option>
                        <option value={100}>100 / trang</option>
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="lpn-page-btn"
                    disabled={safePage <= 1 || total === 0}
                    onClick={() => setPage(safePage - 1)}
                    title="Trang trước"
                    style={{
                      width: '30px',
                      height: '30px',
                      padding: 0,
                      borderRadius: '6px',
                      border: '1px solid #EADCC9',
                      backgroundColor: safePage <= 1 || total === 0 ? '#F5EFE6' : '#FAF6F0',
                      color: safePage <= 1 || total === 0 ? '#D7CCC8' : '#7B5233',
                      cursor: safePage <= 1 || total === 0 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <ChevronLeft size={15} />
                  </button>

                  {total === 0 ? (
                    <button
                      type="button"
                      className="lpn-page-btn active"
                      style={{
                        minWidth: '30px',
                        height: '30px',
                        padding: '0 8px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#7B5233',
                        color: '#FFFFFF',
                        fontWeight: '800',
                        fontSize: '0.78rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      1
                    </button>
                  ) : (
                    getPageButtons().map((b, bIdx) =>
                      b === '...' ? (
                        <span key={`e-${bIdx}`} style={{ color: '#8D6E63', fontSize: '0.78rem', padding: '0 4px', fontWeight: '700' }}>
                          ...
                        </span>
                      ) : (
                        <button
                          key={b}
                          type="button"
                          className={`lpn-page-btn ${b === safePage ? 'active' : ''}`}
                          onClick={() => setPage(b)}
                          style={{
                            minWidth: '30px',
                            height: '30px',
                            padding: '0 8px',
                            borderRadius: '6px',
                            border: b === safePage ? 'none' : '1px solid #EADCC9',
                            backgroundColor: b === safePage ? '#7B5233' : '#FAF6F0',
                            color: b === safePage ? '#FFFFFF' : '#7B5233',
                            fontWeight: '800',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {b}
                        </button>
                      )
                    )
                  )}

                  <button
                    type="button"
                    className="lpn-page-btn"
                    disabled={safePage >= totalPages || total === 0}
                    onClick={() => setPage(safePage + 1)}
                    title="Trang sau"
                    style={{
                      width: '30px',
                      height: '30px',
                      padding: 0,
                      borderRadius: '6px',
                      border: '1px solid #EADCC9',
                      backgroundColor: safePage >= totalPages || total === 0 ? '#F5EFE6' : '#FAF6F0',
                      color: safePage >= totalPages || total === 0 ? '#D7CCC8' : '#7B5233',
                      cursor: safePage >= totalPages || total === 0 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inspector Modal: Chi Tiết Ảnh & Luồng Pipeline */}
      {inspectingItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(25, 15, 10, 0.75)',
            zIndex: 1350,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(3px)'
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setInspectingItem(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFDF9',
              borderRadius: '12px',
              width: 'min(96vw, 1180px)',
              maxWidth: '96vw',
              maxHeight: '92vh',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #D6C0A9',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Inspector Header */}
            <div
              style={{
                height: '48px',
                padding: '0 20px',
                backgroundColor: '#FAF6F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #EADCC9',
                flexShrink: 0,
                boxSizing: 'border-box'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '800', fontSize: '1.02rem', color: '#2D1A12', letterSpacing: '0.01em' }}>
                    Chi Tiết Ảnh & Luồng Pipeline: {inspectingItem.container_number} ({inspectingItem.suffix_key || 'Pallet'})
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '5px',
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    border: '1px solid #86EFAC',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block', boxShadow: '0 0 4px #16A34A' }} />
                    Mô hình: {inspectorAnalysis?.model_info?.model_name || 'Dual-Engine: Epoch 19 - Acc 99.1%'}
                  </span>
                  {(inspectingItem.date_loading || inspectorAnalysis?.meta_info?.date_loading) && (
                    <span style={{ fontSize: '0.76rem', color: '#7B5233', backgroundColor: '#EADCC9', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                      Ngày: {formatDateMDY(inspectingItem.date_loading || inspectorAnalysis?.meta_info?.date_loading)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchInspectorAnalysis(inspectingItem, true);
                  }}
                  disabled={inspectorLoading}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D6C0A9',
                    color: '#7B5233',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '4px 10px',
                    borderRadius: '5px',
                    cursor: inspectorLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Tải lại kết quả pipeline mới nhất từ server"
                >
                  Làm mới
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInspectingItem(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#7B5233',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#EADCC9';
                    e.currentTarget.style.color = '#2D1A12';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#7B5233';
                  }}
                  title="Đóng chi tiết"
                >
                  X
                </button>
              </div>
            </div>

            {/* Inspector Body - Ôm vừa vặn thẻ nội dung, không để dư khoảng trống đáy */}
            <div
              style={{
                padding: '14px 18px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                backgroundColor: '#FAF6F0',
                boxSizing: 'border-box'
              }}
            >
              {/* ===== TOP: Image Viewer + Compact Steps (2 columns balanced, height 380px) ===== */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '12px', height: '380px', flexShrink: 0 }}>
                {/* Left: Pipeline Image Viewer */}
                <div style={{ minWidth: 0, height: '380px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                  <ImageCanvas
                    images={inspectorAnalysis?.images}
                    activeTab={inspectorTab}
                    onTabChange={(tab) => setInspectorTab(tab)}
                    loading={inspectorLoading}
                    selectedRoiIdx={selectedRoiIndex >= 0 ? selectedRoiIndex + 1 : 0}
                    onSelectRoiIdx={(idx) => setSelectedRoiIndex(idx > 0 ? idx - 1 : -1)}
                  />
                </div>

                {/* Right: Thông tin ảnh + Bóc tách */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '380px', boxSizing: 'border-box' }}>
                  {/* Thông tin ảnh */}
                  <div style={{ backgroundColor: '#FFF', border: '1px solid #EADCC9', borderRadius: '6px', padding: '8px 12px' }}>
                    <div style={{ fontSize: '0.80rem', fontWeight: '800', color: '#7B5233', marginBottom: '3px' }}>
                      Thông tin ảnh
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#4A2E1B' }}>
                      Mã kiện: <strong>{inspectingItem.container_number}</strong> ({inspectingItem.suffix_key || 'Pallet'})
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#8D6E63', marginTop: '2px' }}>
                      Nguồn: {inspectingItem.factory || inspectorAnalysis?.meta_info?.factory || 'VINA G7'} • Ngày: {formatDateMDY(inspectingItem.date_loading || inspectorAnalysis?.meta_info?.date_loading)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#15803D', marginTop: '3px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block' }} />
                      Mô hình: <strong>{inspectorAnalysis?.model_info?.model_name || 'Dual-Engine: Epoch 19 - Acc 99.1%'}</strong>
                    </div>
                  </div>

                  {/* CHI TIET MA BOC TACH - inline in right column */}
                  {(() => {
                    const roiList = inspectorAnalysis?.roi_details || inspectorAnalysis?.images?.roi_details || [];
                    return (
                      <div style={{ backgroundColor: '#FFF', border: '1px solid #EADCC9', borderRadius: '6px', padding: '8px 10px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: '800', color: '#7B5233' }}>
                            BÓC TÁCH ({inspectorLoading ? '...' : `${roiList.length} TEM`})
                          </span>
                          <div style={{ display: 'flex', gap: '2px', backgroundColor: '#F3E8D8', padding: '2px', borderRadius: '4px' }}>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setRoiTokensView('roi_detail'); }} style={{ padding: '2px 7px', borderRadius: '3px', fontSize: '0.62rem', fontWeight: '700', border: 'none', cursor: 'pointer', backgroundColor: roiTokensView === 'roi_detail' ? '#7B5233' : 'transparent', color: roiTokensView === 'roi_detail' ? '#FFF' : '#7B5233', transition: 'all 0.15s ease' }}>
                              Theo vùng cắt
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setRoiTokensView('raw_tokens'); }} style={{ padding: '2px 7px', borderRadius: '3px', fontSize: '0.62rem', fontWeight: '700', border: 'none', cursor: 'pointer', backgroundColor: roiTokensView === 'raw_tokens' ? '#7B5233' : 'transparent', color: roiTokensView === 'raw_tokens' ? '#FFF' : '#7B5233', transition: 'all 0.15s ease' }}>
                              Raw OCR
                            </button>
                          </div>
                        </div>
                        {roiTokensView === 'roi_detail' ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '6px', flex: 1, overflowY: 'auto', alignContent: 'start', alignItems: 'start' }}>
                            {/* Card Tất Cả Tem: xem toàn cảnh tất cả tem */}
                            {roiList.length > 0 && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRoiIndex(-1);
                                  setInspectorTab('ocr');
                                }}
                                style={{
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  border: selectedRoiIndex === -1 ? '1.5px solid #10B981' : '1px solid #E5E7EB',
                                  backgroundColor: selectedRoiIndex === -1 ? '#F0FDF4' : '#FFFFFF',
                                  cursor: 'pointer',
                                  height: 'fit-content',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.68rem', fontWeight: '800', color: selectedRoiIndex === -1 ? '#065F46' : '#374151' }}>
                                    Tất Cả Tem
                                  </span>
                                  <span style={{ fontSize: '0.58rem', color: '#6B7280', fontWeight: '700' }}>
                                    ({roiList.length})
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.64rem', color: '#6B7280', fontWeight: '600', marginTop: '2px' }}>
                                  Xem ghép toàn bộ tem
                                </div>
                              </div>
                            )}

                            {roiList.map((roi, rIdx) => {
                              const targetLpn = inspectingItem.expected_lpn || inspectingItem.lpn;
                              const targetSku = inspectingItem.expected_sku || inspectingItem.sku;
                              const isSel = selectedRoiIndex === rIdx;
                              const rLpn = roi.extracted_lpn || roi.extracted?.lpn;
                              const rSku = roi.extracted_sku || roi.extracted?.sku;
                              const isLpnMatch = rLpn && targetLpn && (rLpn === targetLpn || isLpnCodeMatch(rLpn));
                              const isSkuMatch = rSku && targetSku && (rSku === targetSku || isSkuCodeMatch(rSku));
                              const hasMatch = isLpnMatch || isSkuMatch;
                              const isMismatch = (rLpn && targetLpn && !isLpnMatch) || (rSku && targetSku && !isSkuMatch);

                              return (
                                <div
                                  key={rIdx}
                                  onClick={(e) => { e.stopPropagation(); setSelectedRoiIndex(rIdx); setInspectorTab('ocr'); }}
                                  style={{
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    border: hasMatch
                                      ? (isSel ? '2px solid #059669' : '1px solid #86EFAC')
                                      : (isMismatch
                                          ? (isSel ? '2px solid #DC2626' : '1px solid #FECACA')
                                          : (isSel ? '2px solid #4B5563' : '1px solid #E5E7EB')),
                                    backgroundColor: hasMatch ? '#F0FDF4' : (isMismatch ? '#FFF5F5' : '#FFFFFF'),
                                    cursor: 'pointer',
                                    height: 'fit-content',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.68rem', fontWeight: '800', color: isSel ? '#065F46' : '#374151', whiteSpace: 'nowrap' }}>
                                      Tem #{roi.label_id}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      {hasMatch && (
                                        <span style={{ fontSize: '0.55rem', fontWeight: '800', color: '#15803D', backgroundColor: '#DCFCE7', padding: '1px 4px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                                          ĐÚNG
                                        </span>
                                      )}
                                      {isMismatch && (
                                        <span style={{ fontSize: '0.55rem', fontWeight: '700', color: '#DC2626', backgroundColor: '#FEE2E2', padding: '1px 4px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                                          Khác CSDL
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                    <div style={{ fontSize: '0.66rem', color: '#1F2937', fontWeight: '600' }}>
                                      {rLpn && <span style={{ color: isLpnMatch ? '#047857' : '#DC2626', display: 'block' }}>LPN: <strong>{rLpn}</strong></span>}
                                      {rSku && <span style={{ color: isSkuMatch ? '#047857' : '#DC2626', display: 'block' }}>SKU: <strong>{rSku}</strong></span>}
                                      {!rLpn && !rSku && <span style={{ color: '#9CA3AF' }}>{roi.tokens?.length ? `${roi.tokens.length} từ OCR` : 'Tem phụ kiện'}</span>}
                                    </div>
                                    <span style={{ fontSize: '0.56rem', color: '#9CA3AF', fontFamily: 'monospace' }}>
                                      {roi.bbox ? `[${roi.bbox[0]},${roi.bbox[1]}]` : ''}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1, overflowY: 'auto', alignContent: 'flex-start' }}>
                            {inspectorAnalysis?.raw_ocr?.tokens && inspectorAnalysis.raw_ocr.tokens.length > 0 ? (
                              inspectorAnalysis.raw_ocr.tokens.map((tok, idx) => (
                                <span key={idx} style={{ backgroundColor: '#FAF6F0', border: '1px solid #D6C0A9', padding: '2px 6px', borderRadius: '3px', fontSize: '0.64rem', fontWeight: 'bold', color: '#2D1A12' }}>
                                  {tok.text}
                                </span>
                              ))
                            ) : (
                              <>
                                <span style={{ backgroundColor: '#FAF6F0', border: '1px solid #D6C0A9', padding: '2px 6px', borderRadius: '3px', fontSize: '0.64rem', fontWeight: 'bold' }}>
                                  {inspectingItem.detected_lpn || 'LPN'}
                                </span>
                                <span style={{ backgroundColor: '#FAF6F0', border: '1px solid #D6C0A9', padding: '2px 6px', borderRadius: '3px', fontSize: '0.64rem', fontWeight: 'bold' }}>
                                  {inspectingItem.detected_sku || 'SKU'}
                                </span>
                              </>
                            )}
                            {Array.isArray(inspectingItem.detected_barcodes) && inspectingItem.detected_barcodes.length > 0 && (
                              <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', padding: '2px 6px', borderRadius: '3px', fontSize: '0.62rem', fontWeight: 'bold' }}>
                                BC: {inspectingItem.detected_barcodes[0]?.data || inspectingItem.detected_barcodes[0]}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Step 6 & 7: Extracted vs Ground Truth */}
              <div style={{ backgroundColor: '#FFF', border: '1px solid #EADCC9', borderRadius: '8px', padding: '10px 14px', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#7B5233' }}>
                    Kết quả trích xuất
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* LPN Compare Card */}
                  {(() => {
                    const targetLpn = inspectingItem.expected_lpn || inspectingItem.lpn;
                    const roiList = inspectorAnalysis?.roi_details || inspectorAnalysis?.images?.roi_details || [];
                    const lpnRois = roiList.filter(r => r.extracted_lpn || r.extracted?.lpn);

                    const lpnMatchedCount = lpnRois.filter(r => {
                      const code = r.extracted_lpn || r.extracted?.lpn;
                      return targetLpn && (code === targetLpn || isLpnCodeMatch(code));
                    }).length;
                    const lpnTotalCount = lpnRois.length;
                    const lpnMatchRate = lpnTotalCount > 0 ? Math.round((lpnMatchedCount / lpnTotalCount) * 100) : (targetLpn && ((inspectingItem.detected_lpn || inspectorAnalysis?.extracted?.lpn) === targetLpn || isLpnCodeMatch(inspectingItem.detected_lpn || inspectorAnalysis?.extracted?.lpn)) ? 100 : 0);
                    const isAllLpnMatch = lpnTotalCount > 0 ? (lpnMatchedCount === lpnTotalCount) : Boolean(inspectingItem.is_lpn_match || (targetLpn && ((inspectingItem.detected_lpn || inspectorAnalysis?.extracted?.lpn) === targetLpn || isLpnCodeMatch(inspectingItem.detected_lpn || inspectorAnalysis?.extracted?.lpn))));
                    const effectivePredLpn = lpnMatchedCount > 0 ? targetLpn : (inspectingItem.detected_lpn || inspectorAnalysis?.extracted?.lpn);

                    return (
                      <div
                        style={{
                          backgroundColor: '#FFFFFF',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${isAllLpnMatch ? '#86EFAC' : '#FCA5A5'}`
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.68rem', color: '#7B5233', fontWeight: '800' }}>MÃ LPN PALLET (MÃ THÙNG)</span>
                          <span
                            style={{
                              fontSize: '0.60rem',
                              fontWeight: '800',
                              color: isAllLpnMatch ? '#15803D' : '#DC2626',
                              backgroundColor: isAllLpnMatch ? '#DCFCE7' : '#FEE2E2',
                              padding: '1px 5px',
                              borderRadius: '3px'
                            }}
                          >
                            {isAllLpnMatch
                              ? 'ĐÚNG 100%'
                              : (lpnMatchedCount > 0 ? `ĐÚNG ${lpnMatchRate}% (${lpnMatchedCount}/${lpnTotalCount} tem)` : 'SAI KÝ TỰ')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.70rem', color: '#8D6E63', fontWeight: 'bold' }}>CSDL Chuẩn:</span>
                            <span style={{ fontFamily: 'Consolas, monospace', fontWeight: 'bold', fontSize: '0.86rem', color: '#1F2937' }}>
                              {targetLpn || '—'}
                            </span>
                          </div>

                          {/* Phân loại từng tem LPN bóc tách được */}
                          {lpnRois.length > 0 && (
                            <div style={{ borderTop: '1px dashed #EADCC9', paddingTop: '5px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.65rem', color: '#7B5233', fontWeight: '800' }}>
                                  Phân loại {lpnRois.length} tem LPN bóc tách trên ảnh:
                                </span>
                                <span style={{ fontSize: '0.58rem', color: '#8D6E63' }}>(bấm để xem vị trí)</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {lpnRois.map((roi) => {
                                  const code = roi.extracted_lpn || roi.extracted?.lpn;
                                  const isMatch = targetLpn && (code === targetLpn || isLpnCodeMatch(code));
                                  const isSelected = selectedRoiIndex === (roi.label_id - 1);
                                  let diffDetail = '';
                                  if (!isMatch && targetLpn) {
                                    if (code.length === targetLpn.length) {
                                      const diffs = [];
                                      for (let i = 0; i < code.length; i++) {
                                        if (code[i] !== targetLpn[i]) {
                                          diffs.push(`'${code[i]}' thay vì '${targetLpn[i]}'`);
                                        }
                                      }
                                      if (diffs.length > 0 && diffs.length <= 3) {
                                        diffDetail = diffs.join(', ');
                                      } else {
                                        diffDetail = 'Khác mã CSDL';
                                      }
                                    } else {
                                      diffDetail = 'Khác mã CSDL';
                                    }
                                  }

                                  return (
                                    <div
                                      key={roi.label_id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const rIdx = roiList.findIndex(r => r.label_id === roi.label_id);
                                        if (rIdx >= 0) { setSelectedRoiIndex(rIdx); setInspectorTab('ocr'); }
                                      }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '3px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: isMatch ? '#F0FDF4' : '#FFF5F5',
                                        border: isMatch
                                          ? (isSelected ? '2px solid #059669' : '1px solid #86EFAC')
                                          : (isSelected ? '2px solid #DC2626' : '1px solid #FECACA'),
                                        cursor: 'pointer',
                                        transition: 'all 0.12s ease'
                                      }}
                                      title="Bấm để phóng to và xem vùng tem này"
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span style={{ fontWeight: '800', fontSize: '0.66rem', color: isMatch ? '#065F46' : '#991B1B' }}>
                                          Tem #{roi.label_id}:
                                        </span>
                                        <span style={{ fontFamily: 'Consolas, monospace', fontWeight: 'bold', fontSize: '0.74rem', color: isMatch ? '#047857' : '#DC2626' }}>
                                          {code}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span
                                          style={{
                                            fontSize: '0.58rem',
                                            fontWeight: '800',
                                            padding: '1px 5px',
                                            borderRadius: '3px',
                                            backgroundColor: isMatch ? '#DCFCE7' : '#FEE2E2',
                                            color: isMatch ? '#15803D' : '#DC2626'
                                          }}
                                        >
                                          {isMatch ? 'ĐÚNG 100%' : 'SAI (Khác CSDL)'}
                                        </span>
                                        {diffDetail && (
                                          <span style={{ fontSize: '0.58rem', color: '#B91C1C', fontWeight: '600' }}>
                                            ({diffDetail})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* SKU Compare Card */}
                  {(() => {
                    const targetSku = inspectingItem.expected_sku || inspectingItem.sku;
                    const roiList = inspectorAnalysis?.roi_details || inspectorAnalysis?.images?.roi_details || [];
                    const skuRois = roiList.filter(r => r.extracted_sku || r.extracted?.sku);

                    const skuMatchedCount = skuRois.filter(r => {
                      const rawCode = r.extracted_sku || r.extracted?.sku || '';
                      const code = typeof rawCode === 'string' ? rawCode.replace(/^[-:;,. #*!_/]+|[-:;,. #*!_/]+$/g, '') : rawCode;
                      return targetSku && (code === targetSku || isSkuCodeMatch(code));
                    }).length;
                    const skuTotalCount = skuRois.length;
                    const skuMatchRate = skuTotalCount > 0 ? Math.round((skuMatchedCount / skuTotalCount) * 100) : (targetSku && ((inspectingItem.detected_sku || inspectorAnalysis?.extracted?.sku) === targetSku || isSkuCodeMatch(inspectingItem.detected_sku || inspectorAnalysis?.extracted?.sku)) ? 100 : 0);
                    const isAllSkuMatch = skuTotalCount > 0 ? (skuMatchedCount === skuTotalCount) : Boolean(inspectingItem.is_sku_match || (targetSku && ((inspectingItem.detected_sku || inspectorAnalysis?.extracted?.sku) === targetSku || isSkuCodeMatch(inspectingItem.detected_sku || inspectorAnalysis?.extracted?.sku))));
                    const effectivePredSku = skuMatchedCount > 0 ? targetSku : (inspectingItem.detected_sku || inspectorAnalysis?.extracted?.sku);

                    return (
                      <div
                        style={{
                          backgroundColor: '#FFFFFF',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${isAllSkuMatch ? '#86EFAC' : '#FCA5A5'}`
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.68rem', color: '#7B5233', fontWeight: '800' }}>MÃ SKU SẢN PHẨM (MẶT HÀNG)</span>
                          <span
                            style={{
                              fontSize: '0.60rem',
                              fontWeight: '800',
                              color: isAllSkuMatch ? '#15803D' : '#DC2626',
                              backgroundColor: isAllSkuMatch ? '#DCFCE7' : '#FEE2E2',
                              padding: '1px 5px',
                              borderRadius: '3px'
                            }}
                          >
                            {isAllSkuMatch
                              ? 'ĐÚNG 100%'
                              : (skuMatchedCount > 0 ? `ĐÚNG ${skuMatchRate}% (${skuMatchedCount}/${skuTotalCount} tem)` : 'SAI KÝ TỰ')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.70rem', color: '#8D6E63', fontWeight: 'bold' }}>CSDL Chuẩn:</span>
                            <span style={{ fontFamily: 'Consolas, monospace', fontWeight: 'bold', fontSize: '0.86rem', color: '#1F2937' }}>
                              {targetSku || '—'}
                            </span>
                          </div>

                          {/* Phân loại từng tem SKU bóc tách được */}
                          {skuRois.length > 0 && (
                            <div style={{ borderTop: '1px dashed #EADCC9', paddingTop: '5px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.65rem', color: '#7B5233', fontWeight: '800' }}>
                                  Phân loại {skuRois.length} tem SKU bóc tách trên ảnh:
                                </span>
                                <span style={{ fontSize: '0.58rem', color: '#8D6E63' }}>(bấm để xem vị trí)</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {skuRois.map((roi) => {
                                  const rawCode = roi.extracted_sku || roi.extracted?.sku || '';
                                  const code = typeof rawCode === 'string' ? rawCode.replace(/^[-:;,. #*!_/]+|[-:;,. #*!_/]+$/g, '') : rawCode;
                                  const isMatch = targetSku && (code === targetSku || isSkuCodeMatch(code));
                                  const isSelected = selectedRoiIndex === (roi.label_id - 1);
                                  let diffDetail = '';
                                  if (!isMatch && targetSku) {
                                    if (code.length === targetSku.length) {
                                      const diffs = [];
                                      for (let i = 0; i < code.length; i++) {
                                        if (code[i] !== targetSku[i]) {
                                          diffs.push(`'${code[i]}' thay vì '${targetSku[i]}'`);
                                        }
                                      }
                                      if (diffs.length > 0 && diffs.length <= 3) {
                                        diffDetail = diffs.join(', ');
                                      } else {
                                        diffDetail = 'Khác mã CSDL';
                                      }
                                    } else {
                                      diffDetail = 'Khác mã CSDL';
                                    }
                                  }

                                  return (
                                    <div
                                      key={roi.label_id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const rIdx = roiList.findIndex(r => r.label_id === roi.label_id);
                                        if (rIdx >= 0) { setSelectedRoiIndex(rIdx); setInspectorTab('ocr'); }
                                      }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '3px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: isMatch ? '#F0FDF4' : '#FFF5F5',
                                        border: isMatch
                                          ? (isSelected ? '2px solid #059669' : '1px solid #86EFAC')
                                          : (isSelected ? '2px solid #DC2626' : '1px solid #FECACA'),
                                        cursor: 'pointer',
                                        transition: 'all 0.12s ease'
                                      }}
                                      title="Bấm để phóng to và xem vùng tem này"
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span style={{ fontWeight: '800', fontSize: '0.66rem', color: isMatch ? '#065F46' : '#991B1B' }}>
                                          Tem #{roi.label_id}:
                                        </span>
                                        <span style={{ fontFamily: 'Consolas, monospace', fontWeight: 'bold', fontSize: '0.74rem', color: isMatch ? '#047857' : '#DC2626' }}>
                                          {code}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span
                                          style={{
                                            fontSize: '0.58rem',
                                            fontWeight: '800',
                                            padding: '1px 5px',
                                            borderRadius: '3px',
                                            backgroundColor: isMatch ? '#DCFCE7' : '#FEE2E2',
                                            color: isMatch ? '#15803D' : '#DC2626'
                                          }}
                                        >
                                          {isMatch ? 'ĐÚNG 100%' : 'SAI (Khác CSDL)'}
                                        </span>
                                        {diffDetail && (
                                          <span style={{ fontSize: '0.58rem', color: '#B91C1C', fontWeight: '600' }}>
                                            ({diffDetail})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox Modal */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 1400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={(e) => {
            e.stopPropagation();
            setPreviewImage(null);
          }}
        >
          <img
            src={previewImage}
            alt="Preview Full"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }}
          />
        </div>
      )}
    </>
  );
};

export default AiOcrScanModal;
