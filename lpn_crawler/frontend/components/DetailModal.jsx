import React, { useState, useEffect, useRef } from 'react';
import { formatDateMDY, formatTimestampVN } from '../utils/formatters';
import { ImageLightboxModal } from './ImageLightboxModal';
import { ImageCanvas } from '../../ai_ocr_train/frontend/components/ImageCanvas';
import { lpnCrawlerApi } from '../services/api';

/**
 * DetailModal — Hiển thị chi tiết 1 item (Pallet/Box).
 * - Kích thước popup cố định, đồng đều 100% giữa ảnh chụp dọc và ảnh chụp ngang (không bị nhảy/giật kích cỡ).
 * - Ảnh chụp dọc tự động thu nhỏ (object-fit: contain) vừa khít trong khung cố định.
 * - Có 2 nút tròn điều hướng (< và >) ở hai bên modal kèm phím tắt mũi tên.
 * - Tông màu vàng nhạt ấm áp (#FAF6F0) đồng bộ với giao diện web.
 * - Vùng thông tin đọc từ training hình ảnh (AI OCR) hiển thị trực tiếp bên cạnh ảnh.
 */
const formatProcessingTime = (ms) => {
  if (!ms && ms !== 0) return '—';
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)} giây`;
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  return `${mins} phút ${secs > 0 ? `${secs} giây` : ''}`.trim();
};

export const DetailModal = ({ item, itemsList = [], onNavigate, onClose, onResolveSuccess }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  // AI OCR States
  const [aiResult, setAiResult] = useState(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isScanningAi, setIsScanningAi] = useState(false);
  const [aiScanError, setAiScanError] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedAiModel, setSelectedAiModel] = useState('hybrid_epoch15');
  const inspectorCacheRef = useRef({});

  // Resolution Action States
  const [isResolving, setIsResolving] = useState(false);
  const [showUnresolvedPrompt, setShowUnresolvedPrompt] = useState(false);
  const [unresolvedReason, setUnresolvedReason] = useState('');
  const [resolveFeedback, setResolveFeedback] = useState(null);

  // Danh sách các kiện trong cùng container (được nạp tự động để hỗ trợ đối chiếu kiện đi cùng)
  const [containerItems, setContainerItems] = useState([]);

  useEffect(() => {
    const cId = item?.container_id;
    if (cId && (!itemsList || itemsList.length <= 1)) {
      lpnCrawlerApi.getContainerDetail(cId).then((cont) => {
        if (cont && Array.isArray(cont.items) && cont.items.length > 0) {
          setContainerItems(cont.items);
        }
      }).catch((err) => console.warn('Could not load container items:', err));
    }
  }, [item?.container_id, itemsList?.length]);

  const effectiveItemsList = React.useMemo(() => {
    if (Array.isArray(item?.sibling_items) && item.sibling_items.length > 0) {
      return item.sibling_items;
    }
    if (Array.isArray(containerItems) && containerItems.length > 0) {
      return containerItems;
    }
    return Array.isArray(itemsList) ? itemsList : [];
  }, [item?.sibling_items, containerItems, itemsList]);

  const expLpnClean = String(item?.lpn || item?.expected_lpn || '').trim().toUpperCase();
  const expSkuClean = String(item?.sku || item?.expected_sku || '').trim().replace(/^[-:;,. #*!_/]+|[-:;,. #*!_/]+$/g, '').toUpperCase();

  // Map tất cả LPN của container để đối chiếu kiện đi kèm / thùng dán cạnh
  const containerLpnsMap = React.useMemo(() => {
    const map = {};
    if (Array.isArray(effectiveItemsList)) {
      effectiveItemsList.forEach((it) => {
        const l = String(it?.lpn || '').trim().toUpperCase();
        if (l) {
          map[l] = it;
        }
      });
    }
    return map;
  }, [effectiveItemsList]);

  const isLpnCodeMatch = (code, targetLpn = expLpnClean) => {
    const target = String(targetLpn || expLpnClean || '').trim().toUpperCase();
    if (!target || !code) return false;
    const clean = String(code).trim().toUpperCase();
    if (clean === target) return true;
    // Chuẩn hóa nhầm lẫn quang học giữa chữ O và số 0
    const normTarget = target.replace(/O/g, '0');
    const normClean = clean.replace(/O/g, '0');
    if (normClean === normTarget) return true;
    return false;
  };

  // Helper tính khoảng cách Levenshtein giữa 2 chuỗi có hỗ trợ cặp nhầm lẫn in nhiệt quang học (8 vs B, 0 vs O...)
  const calcLevenshtein = (s1, s2) => {
    const opticalPairs = new Set([
      '8B', 'B8', 'AR', 'RA', '0O', 'O0', '0Q', 'Q0', 'OQ', 'QO', '0D', 'D0',
      '8R', 'R8', '1I', 'I1', '14', '41', '5S', 'S5', '72', '27', '8S', 'S8',
      'UV', 'VU', '0U', 'U0', 'OU', 'UO', 'DB', 'BD', 'DO', 'OD', '38', '83',
      '3B', 'B3', '1L', 'L1', 'IL', 'LI', '6G', 'G6', '60', '06', '6B', 'B6',
      '80', '08', '0B', 'B0', '46', '64', '4A', 'A4', '17', '71'
    ]);
    const m = s1.length;
    const n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const c1 = s1[i - 1];
        const c2 = s2[j - 1];
        let cost = 1;
        if (c1 === c2 || opticalPairs.has(c1 + c2)) {
          cost = 0;
        }
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[m][n];
  };

  const normZeros = (s) => String(s || '').replace(/\b0+(\d+)/g, '$1');

  const isSkuCodeMatch = (code, targetSku = expSkuClean) => {
    const target = String(targetSku || expSkuClean || '').trim().replace(/^[-:;,. #*!_/]+|[-:;,. #*!_/]+$/g, '').toUpperCase();
    if (!target || !code) return false;
    const clean = String(code).trim().replace(/^[-:;,. #*!_/]+|[-:;,. #*!_/]+$/g, '').toUpperCase();
    if (clean === target) return true;

    // 1. Chuẩn hóa số 0 ở đầu (ví dụ: '2-54-WOA' vs '02-54-WOA')
    if (normZeros(clean) === normZeros(target)) return true;

    // 2. Quy tắc nếu sai tối đa 1 ký tự thì mặc định lấy dữ liệu đúng luôn (ví dụ: '21-60-BRO' vs '21-60D-BRO')
    if (calcLevenshtein(clean, target) <= 1) return true;

    const cleanNoDash = clean.replace(/-/g, '');
    const expNoDash = target.replace(/-/g, '');
    if (calcLevenshtein(cleanNoDash, expNoDash) <= 1) return true;
    if (calcLevenshtein(normZeros(clean), normZeros(target)) <= 1) return true;

    const calibClean = clean.replace(/-W[0Q]A$/, '-WOA').replace(/Q$/, 'O');
    const calibExp = target.replace(/-W[0Q]A$/, '-WOA').replace(/Q$/, 'O');
    if (calibClean === calibExp) return true;

    // 3. So sánh cùng độ dài với các cặp nhầm lẫn quang học
    if (clean.length === target.length) {
      let diffs = 0;
      let isConf = true;
      for (let i = 0; i < clean.length; i++) {
        if (clean[i] !== target[i]) {
          diffs++;
          const pair = [clean[i], target[i]].sort().join('');
          if (!['OQ', '0O', '0Q', '0D', '8B', '0B', '46', '4A', '17', 'AR', '1I', '5S', '72', '8S', 'UV', '1L', '6G', '08'].includes(pair)) {
            isConf = false;
          }
        }
      }
      if (diffs <= 1 && target.length >= 6) return true;
      if (isConf && diffs <= 2) return true;
    }
    return false;
  };

  // Helper: Nếu mã SKU giống 90-99% với CSDL chuẩn thì lấy luôn kết quả đúng
  const resolveEffectiveSku = (code, targetSku = expSkuClean) => {
    if (!code) return '';
    const target = String(targetSku || expSkuClean || '').trim().replace(/^[-:;,. #*!_/]+|[-:;,. #*!_/]+$/g, '').toUpperCase();
    if (target && isSkuCodeMatch(code, target)) {
      return target; // Khi mã quét giống 90-99% -> lấy luôn kết quả đúng theo yêu cầu người dùng
    }
    return String(code).trim().replace(/^[-:;,. #*!_/]+|[-:;,. #*!_/]+$/g, '').toUpperCase();
  };

  // Kiểm tra kiện hàng dán tem dọc (Top nóc / Box 10A có chữ cái đuôi) hay dán tem ngang (Pallet đứng / Box 10)
  const isPosVertical = (() => {
    const rawPos = item?.suffix_key || item?.record_type || '';
    if (!rawPos) return false;
    const s = String(rawPos).trim().toLowerCase();
    if (/top[\s_-]*n[oó]c/.test(s) || /d[oọ]c/.test(s) || /topnoc/.test(s)) return true;
    if (/pallet[\s_-]*[đd][uứ]ng/.test(s) || /ngang/.test(s)) return false;
    // Box 10A, 10B, 1A (số theo sau bởi chữ cái) -> tem dán dọc
    return Boolean(/\d+[a-z]$/i.test(s));
  })();

  // Lấy số thứ tự pallet gốc (ví dụ: 'Box 10A' -> '10', 'Pallet 10' -> '10')
  const currentPalletNum = (() => {
    const key = String(item?.suffix_key || '').trim();
    const m = key.match(/\d+/);
    return m ? m[0] : null;
  })();

  // Tìm kiện đối ứng trong cùng Pallet:
  // - Nếu đang ở Box 10A (Top Nóc) -> pairedItem là Pallet 10 (Tủ Dưới / Pallet Đứng)
  // - Nếu đang ở Pallet 10 (Pallet Đứng) -> pairedItem là Box 10A/10B (Tủ Trên Cùng / Top Nóc)
  const pairedItem = (() => {
    if (!currentPalletNum || !Array.isArray(effectiveItemsList)) return null;
    if (isPosVertical) {
      // Đang ở Top Nóc -> tìm Pallet đứng bên dưới
      return effectiveItemsList.find((it) => {
        const k = String(it?.suffix_key || '').trim().toLowerCase();
        const m = k.match(/\d+/);
        const isTopNocKey = /([a-z])$/i.test(k) || k.includes('top') || k.includes('nóc') || k.includes('noc');
        return m && m[0] === currentPalletNum && !isTopNocKey;
      }) || null;
    } else {
      // Đang ở Pallet đứng -> tìm Top Nóc bên trên
      return effectiveItemsList.find((it) => {
        const k = String(it?.suffix_key || '').trim().toLowerCase();
        const m = k.match(/\d+/);
        const isTopNocKey = /([a-z])$/i.test(k) || k.includes('top') || k.includes('nóc') || k.includes('noc');
        return m && m[0] === currentPalletNum && isTopNocKey;
      }) || null;
    }
  })();

  // Helper lấy thông tin CSDL đối chiếu chuẩn xác theo từng vị trí (Pallet Đứng vs Top Nóc)
  // - Nếu đang ở Box 10A: Tủ trên cùng đối chiếu Box 10A; Tủ dưới đối chiếu Pallet 10 đi cùng!
  // - Nếu đang ở Pallet 10: Tủ dưới đối chiếu Pallet 10; Tủ trên cùng đối chiếu Box 10A đi cùng!
  const getTargetMetaForOrient = (orient) => {
    const isTopOrient = (orient === 'vertical');
    if (isPosVertical) {
      if (isTopOrient) {
        return {
          expectedSku: expSkuClean,
          expectedLpn: expLpnClean,
          label: item?.suffix_key || 'Top nóc',
          isSelf: true,
          pairedItem: null
        };
      } else {
        const pSku = pairedItem?.sku ? String(pairedItem.sku).trim().replace(/^[-:;,. #*!_/]+|[-:;,. #*!_/]+$/g, '').toUpperCase() : '';
        const pLpn = pairedItem?.lpn ? String(pairedItem.lpn).trim().toUpperCase() : '';
        return {
          expectedSku: pSku,
          expectedLpn: pLpn,
          label: pairedItem?.suffix_key || (currentPalletNum ? `Pallet ${currentPalletNum}` : 'Tủ dưới (Pallet đứng)'),
          isSelf: false,
          pairedItem: pairedItem
        };
      }
    } else {
      if (!isTopOrient) {
        return {
          expectedSku: expSkuClean,
          expectedLpn: expLpnClean,
          label: item?.suffix_key || 'Pallet đứng',
          isSelf: true,
          pairedItem: null
        };
      } else {
        const pSku = pairedItem?.sku ? String(pairedItem.sku).trim().replace(/^[-:;,. #*!_/]+|[-:;,. #*!_/]+$/g, '').toUpperCase() : '';
        const pLpn = pairedItem?.lpn ? String(pairedItem.lpn).trim().toUpperCase() : '';
        return {
          expectedSku: pSku,
          expectedLpn: pLpn,
          label: pairedItem?.suffix_key || (currentPalletNum ? `Box ${currentPalletNum}A` : 'Tủ trên cùng (Top nóc)'),
          isSelf: false,
          pairedItem: pairedItem
        };
      }
    }
  };

  // Chỉ lấy đúng những chữ nằm dưới mã QR / Barcode (loại bỏ chữ rác trên thùng hoặc thông tin khác)
  const extractCleanCodeUnderRoi = (roi, type = 'all') => {
    if (!roi) return '';
    
    // 1. Mã giải mã từ barcode/QR
    const barcodes = Array.isArray(roi.barcodes) ? roi.barcodes : [];
    for (const b of barcodes) {
      const bStr = typeof b === 'string' ? b : (b?.data || '');
      const cleanB = String(bStr).trim().replace(/^[-:;,. #*!_"'/]+|[-:;,. #*!_"'/]+$/g, '');
      if (type === 'lpn') {
        const d = cleanB.replace(/[^0-9]/g, '');
        if (d.length >= 8 && d.length <= 12) return d;
      } else if (type === 'sku') {
        if (cleanB.includes('-') && /[A-Z0-9]/.test(cleanB)) return cleanB;
      } else {
        if (cleanB) return cleanB;
      }
    }

    // 2. Mã đã bóc tách từ pipeline
    const extLpn = roi.extracted_lpn || roi.extracted?.lpn;
    const extSku = roi.extracted_sku || roi.extracted?.sku;
    if (type === 'lpn' && extLpn) {
      return String(extLpn).trim().replace(/^[-:;,. #*!_"'/]+|[-:;,. #*!_"'/]+$/g, '');
    }
    if (type === 'sku' && extSku) {
      return String(extSku).trim().replace(/^[-:;,. #*!_"'/]+|[-:;,. #*!_"'/]+$/g, '');
    }

    // 3. Trích xuất đúng chuỗi chữ dưới mã vạch / QR (HRI) từ text_under_barcode, tokens hoặc full_text
    const rawSources = [
      roi.text_under_barcode,
      roi.full_text,
      ...(Array.isArray(roi.tokens) ? roi.tokens.map(t => t.text) : [])
    ].filter(Boolean);

    for (const src of rawSources) {
      const s = String(src).trim();
      if (type === 'lpn') {
        const m = s.match(/\b\d{8,12}\b/) || s.match(/(?:06|05|60)\d{6,10}/);
        if (m) return m[0];
        const digitsOnly = s.replace(/[^0-9]/g, '');
        if (digitsOnly.length >= 8 && digitsOnly.length <= 12) return digitsOnly;
      } else if (type === 'sku') {
        const m = s.match(/\b([A-Z0-9]{1,10}(?:\s*-\s*[A-Z0-9]{1,10}){1,4})\b/i);
        if (m) return m[1].replace(/\s+/g, '').replace(/^[-:;,. #*!_"'/]+|[-:;,. #*!_"'/]+$/g, '');
      } else {
        const mSku = s.match(/\b([A-Z0-9]{1,10}(?:\s*-\s*[A-Z0-9]{1,10}){1,4})\b/i);
        if (mSku) return mSku[1].replace(/\s+/g, '').replace(/^[-:;,. #*!_"'/]+|[-:;,. #*!_"'/]+$/g, '');
        const mLpn = s.match(/\b\d{8,12}\b/);
        if (mLpn) return mLpn[0];
      }
    }

    if (type === 'lpn' && extLpn) return String(extLpn).trim();
    if (type === 'sku' && extSku) return String(extSku).trim();
    return '';
  };

  const handleResolveAction = async (status, note = '') => {
    const currentItemId = item?.id || item?.item_id;
    if (!currentItemId) return;
    if (status === 'unresolved' && !note.trim()) {
      alert('Vui lòng nhập lý do không thể xử lý dòng này.');
      return;
    }
    setIsResolving(true);
    try {
      const res = await lpnCrawlerApi.resolveItem(currentItemId, status, note.trim());
      if (res && res.success) {
        setResolveFeedback(
          status === 'resolved'
            ? 'Đã đánh dấu xử lý thành công.'
            : 'Đã chuyển vào danh sách không xử lý được.'
        );
        setShowUnresolvedPrompt(false);
        setTimeout(() => {
          if (onResolveSuccess) {
            onResolveSuccess(status, item);
          } else {
            onClose();
          }
        }, 500);
      } else {
        alert(res?.message || 'Lỗi khi cập nhật trạng thái.');
      }
    } catch (err) {
      alert('Lỗi: ' + (err.message || 'Không thể cập nhật trạng thái'));
    } finally {
      setIsResolving(false);
    }
  };

  // Load danh sách model checkpoints
  useEffect(() => {
    fetch('/api/ai-ocr/models')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.models)) {
          setModels(d.models);
          if (d.default_active) {
            setSelectedAiModel(d.default_active);
          } else if (d.models.length > 0) {
            setSelectedAiModel(d.models[0].id);
          }
        }
      })
      .catch(() => { });
  }, []);

  // Tự động load kết quả AI OCR khi chuyển item
  useEffect(() => {
    const currentItemId = item?.id || item?.item_id;
    inspectorCacheRef.current = {};
    setInspectorAnalysis(null);
    if (currentItemId) {
      loadAiResult(currentItemId);
    } else {
      setAiResult(null);
      setAiScanError(null);
    }
  }, [item?.id, item?.item_id]);

  const loadAiResult = async (itemId) => {
    setIsLoadingAi(true);
    setAiScanError(null);
    let hasResult = false;
    try {
      let res = await fetch(`/api/v1/lpn-crawler/ai-ocr/item-result/${itemId}`);
      if (!res.ok) res = await fetch(`/api/ai-ocr/item-result/${itemId}`);
      const data = await res.json();
      if (data && data.has_result) {
        hasResult = true;
        setAiResult(data);
        if (data.model_id) {
          setSelectedAiModel(data.model_id);
        }
      } else {
        setAiResult(null);
      }
    } catch (err) {
      console.error('Lỗi lấy kết quả AI OCR:', err);
      setAiResult(null);
    } finally {
      setIsLoadingAi(false);
      // Chỉ tải chi tiết Inspector nếu người dùng đang bật xem Inspector
      if (hasResult && showPipelineInspector) {
        fetchInspectorAnalysis(false);
      }
    }
  };

  const handleScanAiNow = async () => {
    const currentItemId = item?.id || item?.item_id;
    if (!item || !currentItemId || isScanningAi) return;
    setIsScanningAi(true);
    setAiScanError(null);
    inspectorCacheRef.current = {};
    setInspectorAnalysis(null);
    try {
      const scanPayload = {
        item_id: currentItemId,
        model_id: selectedAiModel || undefined,
        package_position: item?.suffix_key || item?.record_type || undefined
      };
      let res = await fetch('/api/v1/lpn-crawler/ai-ocr/scan-single-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scanPayload)
      });
      if (!res.ok) {
        res = await fetch('/api/ai-ocr/scan-single-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scanPayload)
        });
      }
      const data = await res.json();
      if (data && (data.success || data.has_result)) {
        setAiResult(data);
        if (data.resolution_status && item) {
          item.resolution_status = data.resolution_status;
        }
        if (showPipelineInspector) {
          fetchInspectorAnalysis(false);
        }
        // Tự động kích hoạt cập nhật ra ngoài cho Container và danh sách tổng
        if (typeof onResolveSuccess === 'function') {
          onResolveSuccess(data);
        }
      } else {
        setAiScanError(data.detail || data.error || 'Quét thất bại hoặc không nhận diện được nhãn');
      }
    } catch (err) {
      setAiScanError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsScanningAi(false);
    }
  };

  // Pipeline Inspector States
  const [showPipelineInspector, setShowPipelineInspector] = useState(false);
  const [inspectorAnalysis, setInspectorAnalysis] = useState(null);
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [inspectorTab, setInspectorTab] = useState('ocr');
  const [selectedRoiIndex, setSelectedRoiIndex] = useState(0);
  const [roiTokensView, setRoiTokensView] = useState('roi_detail');

  const fetchInspectorAnalysis = async (forceRefresh = false) => {
    const currentItemId = item?.id || item?.item_id;
    const currentImg = (item?.images && item.images[activeImgIdx]) || (item?.images && item.images[0]);
    const imageId = currentImg?.id || aiResult?.image_id;
    const cacheKey = `${currentItemId}_${imageId}_${selectedAiModel || 'default'}`;

    if (!forceRefresh && inspectorCacheRef.current[cacheKey]) {
      setInspectorAnalysis(inspectorCacheRef.current[cacheKey]);
      setInspectorLoading(false);
      return;
    }

    setInspectorLoading(true);
    if (!inspectorCacheRef.current[cacheKey]) {
      setInspectorAnalysis(null);
    }
    setSelectedRoiIndex(0);
    try {
      const payload = {
        image_id: imageId,
        item_id: currentItemId,
        model_id: selectedAiModel || undefined,
        force_refresh: Boolean(forceRefresh),
        expected_lpn: item?.lpn || undefined,
        expected_sku: item?.sku || undefined,
        package_position: item?.suffix_key || item?.record_type || undefined
      };
      let res = await fetch('/api/v1/lpn-crawler/ai-ocr/analyze', {
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

        // Đồng bộ dữ liệu bóc tách tem nhãn sang aiResult để hiển thị đồng nhất ở cả 2 nơi (ngoài & trong Inspector)
        const roiList = data.roi_details || data.images?.roi_details || [];
        if (roiList.length > 0) {
          const expSku = String(item?.sku || '').trim().toUpperCase();
          const expLpn = String(item?.lpn || '').trim().toUpperCase();
          const skuCounts = {};
          const lpnCounts = {};

          roiList.forEach((r) => {
            const rawSku = r.extracted_sku || r.extracted?.sku || '';
            const sCode = typeof rawSku === 'string' ? rawSku.replace(/^[-:;,. #*!_/]+|[-:;,. #*!_/]+$/g, '') : rawSku;
            const rRot = r.rotation_deg ?? r.rotation ?? 0;
            const rOrient = r.orientation || ((rRot === 90 || rRot === 270 || r.crop_mode === 'vertical_rois') ? 'vertical' : 'horizontal');
            const rawCat = r.category_name || '';
            const rCat = (rawCat.toLowerCase().includes('top') || rOrient === 'vertical') ? 'Top nóc' : 'Pallet đứng';

            if (sCode) {
              const meta = getTargetMetaForOrient(rOrient);
              const effectiveSku = resolveEffectiveSku(sCode, meta.expectedSku);
              const sKey = `${effectiveSku}__${rOrient}`;
              if (!skuCounts[sKey]) {
                const isTargetM = Boolean(meta.expectedSku && (effectiveSku.toUpperCase() === meta.expectedSku || isSkuCodeMatch(sCode, meta.expectedSku)));
                const isSelfM = Boolean(expSkuClean && (effectiveSku.toUpperCase() === expSkuClean || isSkuCodeMatch(sCode, expSkuClean)));
                // Tem ở mỗi vị trí đối chiếu theo CSDL của chính vị trí đó (hoặc kiện hiện tại)
                const isM = isTargetM || isSelfM;
                let matchReason = '';
                if (isM) {
                  matchReason = isSelfM ? 'Khớp CSDL' : `Khớp ${meta.label} (CSDL: ${meta.expectedSku})`;
                } else {
                  matchReason = (otherSibling && otherSibling.suffix_key !== meta.label)
                    ? `❌ Lệch SKU: CSDL ${meta.label} là ${meta.expectedSku || expSkuClean} (Mã đọc thuộc ${otherSibling.suffix_key || 'kiện khác'}, nghi ngờ dán/xếp nhầm!)`
                    : `❌ Lệch SKU: CSDL ${meta.label} là ${meta.expectedSku || expSkuClean} (Đọc AI: ${effectiveSku})`;
                }
                skuCounts[sKey] = {
                  code: effectiveSku,
                  raw_code: sCode,
                  count: 0,
                  is_match: isM,
                  is_other_item: Boolean(otherSibling),
                  other_item_label: otherSibling ? otherSibling.suffix_key : null,
                  orientation: rOrient,
                  category_label: rCat,
                  match_reason: matchReason
                };
              }
              skuCounts[sKey].count += 1;
            }

            const rawLpn = r.extracted_lpn || r.extracted?.lpn || '';
            const lCode = typeof rawLpn === 'string' ? rawLpn.trim() : rawLpn;
            if (lCode) {
              const meta = getTargetMetaForOrient(rOrient);
              const lKey = `${lCode}__${rOrient}`;
              if (!lpnCounts[lKey]) {
                const isTargetM = Boolean(meta.expectedLpn && isLpnCodeMatch(lCode, meta.expectedLpn));
                const isSelfM = isLpnCodeMatch(lCode, expLpnClean);
                const otherItem = (!isSelfM && !isTargetM) ? containerLpnsMap[lCode.toUpperCase()] : null;
                // Tem ở mỗi vị trí đối chiếu theo CSDL của chính vị trí đó (hoặc kiện hiện tại)
                const isM = isTargetM || isSelfM;
                let matchReason = '';
                if (isM) {
                  matchReason = isSelfM ? 'Khớp CSDL' : `Khớp ${meta.label} (CSDL: ${meta.expectedLpn})`;
                } else {
                  matchReason = (otherItem && otherItem.suffix_key !== meta.label)
                    ? `❌ Lệch LPN: CSDL ${meta.label} là ${meta.expectedLpn || expLpnClean} (Mã đọc thuộc ${otherItem.suffix_key || 'kiện khác'}, nghi ngờ dán nhầm tem!)`
                    : `❌ Lệch LPN: CSDL ${meta.label} là ${meta.expectedLpn || expLpnClean} (Đọc AI: ${lCode})`;
                }
                lpnCounts[lKey] = {
                  code: lCode,
                  count: 0,
                  is_match: isM,
                  is_other_item: Boolean(otherItem),
                  other_item_label: otherItem ? otherItem.suffix_key : null,
                  orientation: rOrient,
                  category_label: rCat,
                  match_reason: matchReason
                };
              }
              lpnCounts[lKey].count += 1;
            }
          });

          const updatedSkus = Object.values(skuCounts);
          const updatedLpns = Object.values(lpnCounts);

          if (updatedSkus.length > 0 || updatedLpns.length > 0) {
            setAiResult((prev) => ({
              ...prev,
              has_result: true,
              detected_skus_detail: updatedSkus.length > 0 ? updatedSkus : prev?.detected_skus_detail,
              detected_lpns_detail: updatedLpns.length > 0 ? updatedLpns : prev?.detected_lpns_detail,
              detected_sku: updatedSkus.find(s => s.is_match)?.code || updatedSkus[0]?.code || prev?.detected_sku,
              detected_lpn: updatedLpns.find(l => l.is_match)?.code || updatedLpns[0]?.code || prev?.detected_lpn,
              is_sku_match: updatedSkus.some(s => s.is_match),
              is_lpn_match: updatedLpns.some(l => l.is_match),
              status: (updatedSkus.some(s => s.is_match) || updatedLpns.some(l => l.is_match)) ? 'success' : (prev?.status || 'review')
            }));
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi lấy chi tiết phân tích pipeline:', e);
    } finally {
      setInspectorLoading(false);
    }
  };

  const handleOpenPipelineInspector = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setShowPipelineInspector(true);
    fetchInspectorAnalysis(false);
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

  if (!item) return null;

  const images = item.images || [];
  const containerPart = item.container_number || '';
  const skuPart = item.sku ? ` - ${item.sku}` : (item.suffix_key ? ` - ${item.suffix_key}` : '');
  const modalTitle = `Chi tiết ${containerPart}${skuPart}`.trim();

  // Navigation Logic
  const currentItemId = item.id || item.item_id;
  const currentIndex = Array.isArray(itemsList)
    ? itemsList.findIndex((i) => {
        const iId = i.id || i.item_id;
        return iId && currentItemId
          ? Number(iId) === Number(currentItemId)
          : i.suffix_key === item.suffix_key && i.container_number === item.container_number;
      })
    : -1;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < itemsList.length - 1;

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    if (hasPrev && onNavigate) {
      onNavigate(itemsList[currentIndex - 1]);
      setActiveImgIdx(0);
    }
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    if (hasNext && onNavigate) {
      onNavigate(itemsList[currentIndex + 1]);
      setActiveImgIdx(0);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedImage) return; // Không can thiệp nếu đang mở lightbox xem ảnh lớn
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, itemsList, selectedImage, hasPrev, hasNext]);

  const resolveImgUrl = (img) => {
    if (!img) return '';
    if (typeof img === 'string') {
      if (img.startsWith('data:') || img.startsWith('http://') || img.startsWith('https://')) return img;
      return `/api/v1/lpn-crawler/images/view?path=${encodeURIComponent(img)}`;
    }
    if (img.id) {
      return `/api/v1/lpn-crawler/images/${img.id}/file`;
    }
    const rawPath = img.local_path || '';
    if (rawPath && rawPath !== 'None') {
      return `/api/v1/lpn-crawler/images/view?path=${encodeURIComponent(rawPath)}`;
    }
    return img.source_url || '';
  };

  const activeImageObj = images[activeImgIdx] || images[0];
  const activeImgUrl = activeImageObj ? resolveImgUrl(activeImageObj) : '';
  const activeFallbackUrl = typeof activeImageObj === 'object' ? activeImageObj?.source_url || '' : '';



  // Ưu tiên trích xuất từ roi_details của inspectorAnalysis nếu có, để luôn đồng nhất 100% với các tem trong Inspector
  const activeInspectorRois = inspectorAnalysis?.roi_details || inspectorAnalysis?.images?.roi_details;
  let inspectorSkusList = [];
  let inspectorLpnsList = [];
  if (Array.isArray(activeInspectorRois) && activeInspectorRois.length > 0) {
    const sMap = {};
    const lMap = {};

    activeInspectorRois.forEach((r) => {
      const rawSku = r.extracted_sku || r.extracted?.sku || '';
      const sCode = typeof rawSku === 'string' ? rawSku.replace(/^[-:;,. #*!_/]+|[-:;,. #*!_/]+$/g, '') : rawSku;
      const rRot = r.rotation_deg ?? r.rotation ?? 0;
      const rAsp = (r.bbox && r.bbox[2] && r.bbox[3]) ? (r.bbox[2] / r.bbox[3]) : 1.0;
      const rOrient = r.orientation || (rAsp < 0.95 ? 'vertical' : 'horizontal');
      const rawCat = r.category_name || '';
      const rCat = (rOrient === 'vertical' || rawCat.toLowerCase().includes('top')) ? 'Top nóc' : 'Pallet đứng';

      if (sCode) {
        const meta = getTargetMetaForOrient(rOrient);
        const effectiveSku = resolveEffectiveSku(sCode, meta.expectedSku);
        const sKey = `${effectiveSku}__${rOrient}`;
        if (!sMap[sKey]) {
          const isTargetM = Boolean(meta.expectedSku && (effectiveSku.toUpperCase() === meta.expectedSku || isSkuCodeMatch(sCode, meta.expectedSku)));
          const isSelfM = Boolean(expSkuClean && (effectiveSku.toUpperCase() === expSkuClean || isSkuCodeMatch(sCode, expSkuClean)));
          const otherSibling = (!isSelfM && !isTargetM && Array.isArray(effectiveItemsList)) ? effectiveItemsList.find(it => it.sku && isSkuCodeMatch(sCode, it.sku)) : null;
          // Tem ở mỗi vị trí đối chiếu theo CSDL của chính vị trí đó (hoặc kiện hiện tại)
          const isM = isTargetM || isSelfM;
          let matchReason = '';
          if (isM) {
            matchReason = isSelfM ? 'Khớp CSDL' : `Khớp ${meta.label} (CSDL: ${meta.expectedSku})`;
          } else {
            matchReason = (otherSibling && otherSibling.suffix_key !== meta.label)
              ? `❌ Lệch SKU: CSDL ${meta.label} là ${meta.expectedSku || expSkuClean} (Mã đọc thuộc ${otherSibling.suffix_key || 'kiện khác'}, nghi ngờ dán/xếp nhầm!)`
              : `❌ Lệch SKU: CSDL ${meta.label} là ${meta.expectedSku || expSkuClean} (Đọc AI: ${effectiveSku})`;
          }
          sMap[sKey] = {
            code: effectiveSku,
            raw_code: sCode,
            count: 0,
            is_match: isM,
            is_other_item: Boolean(otherSibling),
            other_item_label: otherSibling ? otherSibling.suffix_key : null,
            orientation: rOrient,
            category_label: rCat,
            match_reason: matchReason
          };
        }
        sMap[sKey].count += 1;
      }

      const rawLpn = r.extracted_lpn || r.extracted?.lpn || '';
      const lCode = typeof rawLpn === 'string' ? rawLpn.trim() : rawLpn;
      if (lCode) {
        const lKey = `${lCode}__${rOrient}`;
        if (!lMap[lKey]) {
          const meta = getTargetMetaForOrient(rOrient);
          const isSelfM = isLpnCodeMatch(lCode);
          const isTargetM = Boolean(meta.expectedLpn && isLpnCodeMatch(lCode, meta.expectedLpn));
          const otherItem = (!isSelfM && !isTargetM) ? containerLpnsMap[lCode.toUpperCase()] : meta.pairedItem;
          // Tem ở mỗi vị trí đối chiếu theo CSDL của chính vị trí đó (hoặc kiện hiện tại)
          const isM = isSelfM || isTargetM;
          let matchReason = '';
          if (isM) {
            matchReason = isSelfM ? 'Khớp CSDL' : `Khớp ${meta.label} (CSDL: ${meta.expectedLpn})`;
          } else {
            matchReason = (otherItem && otherItem.suffix_key !== meta.label)
              ? `❌ Lệch LPN: CSDL ${meta.label} là ${meta.expectedLpn || expLpnClean} (Mã đọc thuộc ${otherItem.suffix_key || 'kiện khác'}, nghi ngờ dán nhầm tem!)`
              : `❌ Lệch LPN: CSDL ${meta.label} là ${meta.expectedLpn || expLpnClean} (Đọc AI: ${lCode})`;
          }
          lMap[lKey] = {
            code: lCode,
            count: 0,
            is_match: isM,
            is_other_item: Boolean(otherItem),
            other_item_label: otherItem ? (otherItem.suffix_key || otherItem.item_code) : null,
            orientation: rOrient,
            category_label: rCat,
            match_reason: matchReason
          };
        }
        lMap[lKey].count += 1;
      }
    });
    inspectorSkusList = Object.values(sMap);
    inspectorLpnsList = Object.values(lMap);
  }

  // Danh sách các mã LPN & SKU đọc được từ AI (kèm số lượng xuất hiện và trạng thái đối chiếu CSDL)
  const rawLpnsList = (aiResult?.detected_lpns_detail && aiResult.detected_lpns_detail.length > 0)
    ? aiResult.detected_lpns_detail
    : aiResult?.detected_lpn
      ? [{
          code: aiResult.detected_lpn,
          count: 1,
          is_match: Boolean(aiResult.is_lpn_match),
          orientation: isPosVertical ? 'vertical' : 'horizontal',
          category_label: isPosVertical ? 'Top nóc' : 'Pallet đứng',
          match_reason: aiResult.is_lpn_match ? 'Khớp CSDL' : `Lệch mã: CSDL là ${expLpnClean}`
        }]
      : [];

  const rawLpnTotal = rawLpnsList.reduce((acc, l) => acc + (l.count || 1), 0);
  const inspectorLpnTotal = inspectorLpnsList.reduce((acc, l) => acc + (l.count || 1), 0);
  let baseLpnsList = (inspectorLpnsList.length > 0 && inspectorLpnTotal >= rawLpnTotal)
    ? inspectorLpnsList
    : (rawLpnsList.length > 0 ? rawLpnsList : inspectorLpnsList);

  if (baseLpnsList.length === 0 && Array.isArray(aiResult?.all_lpns) && aiResult.all_lpns.length > 0) {
    baseLpnsList = aiResult.all_lpns.map((code) => ({
      code,
      count: 1,
      orientation: isPosVertical ? 'vertical' : 'horizontal',
      category_label: isPosVertical ? 'Top nóc' : 'Pallet đứng'
    }));
  }

  // Tự động đối chiếu LPN: Nếu khớp CSDL hoặc khớp kiện đi kèm dán cạnh -> Đều ĐẠT (xanh lá/ngọc)
  const finalLpnsList = (() => {
    const map = {};
    baseLpnsList.forEach((itemLpn) => {
      const rawCode = String(itemLpn.code || '').trim();
      let itemOrient = itemLpn.orientation;
      if (!itemOrient) {
        if (isLpnCodeMatch(rawCode)) {
          itemOrient = isPosVertical ? 'vertical' : 'horizontal';
        } else {
          itemOrient = isPosVertical ? 'horizontal' : 'vertical';
        }
      }
      const rawCat = itemLpn.category_label || '';
      const itemCat = (itemOrient === 'vertical' || rawCat.toLowerCase().includes('top')) ? 'Top nóc' : 'Pallet đứng';
      const meta = getTargetMetaForOrient(itemOrient);

      const isSelfMatch = isLpnCodeMatch(rawCode);
      const isTargetMatch = Boolean(meta.expectedLpn && isLpnCodeMatch(rawCode, meta.expectedLpn));
      const otherItem = (!isSelfMatch && !isTargetMatch) ? containerLpnsMap[rawCode.toUpperCase()] : null;
      // Cả tem tủ đứng lẫn tem top nóc đều đối chiếu theo CSDL mục tiêu tương ứng (getTargetMetaForOrient) hoặc chính kiện này
      const isM = isSelfMatch || isTargetMatch;

      let reason = '';
      if (isM) {
        reason = (isTargetMatch && !meta.isSelf) ? `Khớp ${meta.label} (CSDL: ${meta.expectedLpn})` : 'Khớp CSDL';
      } else {
        reason = otherItem
          ? `❌ Lệch LPN: CSDL là ${meta.expectedLpn || expLpnClean} (Mã đọc thuộc ${otherItem.suffix_key || 'kiện khác'}, nghi ngờ dán nhầm tem!)`
          : (meta.expectedLpn ? `❌ Lệch LPN: CSDL ${meta.label} là ${meta.expectedLpn} (Đọc AI: ${rawCode})` : `❌ Lệch LPN: CSDL là ${expLpnClean} (Đọc AI: ${rawCode})`);
      }

      const key = `${rawCode}__${itemOrient}`;
      if (!map[key]) {
        map[key] = {
          ...itemLpn,
          code: rawCode,
          count: 0,
          is_match: isM,
          is_other_item: Boolean(otherItem),
          other_item_label: otherItem ? otherItem.suffix_key : null,
          orientation: itemOrient,
          category_label: itemCat,
          match_reason: reason
        };
      }
      map[key].count += (itemLpn.count || 1);
    });
    return Object.values(map);
  })();

  const rawSkusList = (aiResult?.detected_skus_detail && aiResult.detected_skus_detail.length > 0)
    ? aiResult.detected_skus_detail
    : aiResult?.detected_sku
      ? [{
          code: aiResult.detected_sku,
          count: 1,
          is_match: Boolean(aiResult.is_sku_match),
          orientation: isPosVertical ? 'vertical' : 'horizontal',
          category_label: isPosVertical ? 'Top nóc' : 'Pallet đứng',
          match_reason: aiResult.is_sku_match ? 'Khớp CSDL' : `Lệch mã: CSDL là ${expSkuClean}`
        }]
      : [];

  const rawSkuTotal = rawSkusList.reduce((acc, s) => acc + (s.count || 1), 0);
  const inspectorSkuTotal = inspectorSkusList.reduce((acc, s) => acc + (s.count || 1), 0);
  let baseSkusList = (inspectorSkusList.length > 0 && inspectorSkuTotal >= rawSkuTotal)
    ? inspectorSkusList
    : (rawSkusList.length > 0 ? rawSkusList : inspectorSkusList);

  if (baseSkusList.length === 0 && Array.isArray(aiResult?.all_skus) && aiResult.all_skus.length > 0) {
    baseSkusList = aiResult.all_skus.map((code) => ({
      code,
      count: 1,
      orientation: isPosVertical ? 'vertical' : 'horizontal',
      category_label: isPosVertical ? 'Top nóc' : 'Pallet đứng'
    }));
  }

  // Tự động đối chiếu SKU theo đúng vị trí: Tủ Dưới đối chiếu Pallet Đứng cùng bộ; Top Nóc đối chiếu Thùng Nóc!
  const finalSkusList = (() => {
    const map = {};
    baseSkusList.forEach((itemSku) => {
      const rawCode = itemSku.code;
      let itemOrient = itemSku.orientation;
      if (!itemOrient) {
        if (itemSku.count > 1) {
          itemOrient = 'horizontal';
        } else {
          itemOrient = isPosVertical ? 'vertical' : 'horizontal';
        }
      }
      const rawCat = itemSku.category_label || '';
      const itemCat = (itemOrient === 'vertical' || rawCat.toLowerCase().includes('top')) ? 'Top nóc' : 'Pallet đứng';
      const meta = getTargetMetaForOrient(itemOrient);
      const effectiveCode = resolveEffectiveSku(rawCode, meta.expectedSku);

      const isTargetM = Boolean(meta.expectedSku && (effectiveCode.toUpperCase() === meta.expectedSku || isSkuCodeMatch(rawCode, meta.expectedSku)));
      const isSelfM = Boolean(expSkuClean && (effectiveCode.toUpperCase() === expSkuClean || isSkuCodeMatch(rawCode, expSkuClean)));
      const otherSibling = (!isSelfM && !isTargetM && Array.isArray(effectiveItemsList)) ? effectiveItemsList.find(it => it.sku && isSkuCodeMatch(rawCode, it.sku)) : null;
      // Cả tem tủ đứng lẫn tem top nóc đều đối chiếu theo CSDL mục tiêu tương ứng (getTargetMetaForOrient) hoặc chính kiện này
      const isM = isSelfM || isTargetM;

      let reason = '';
      if (isM) {
        reason = (isTargetM && !meta.isSelf) ? `Khớp ${meta.label} (CSDL: ${meta.expectedSku})` : 'Khớp CSDL';
      } else {
        reason = otherSibling
          ? `❌ Lệch SKU: CSDL là ${meta.expectedSku || expSkuClean} (Mã đọc thuộc ${otherSibling.suffix_key || 'kiện khác'}, nghi ngờ dán/xếp nhầm!)`
          : (meta.expectedSku ? `❌ Lệch SKU: CSDL ${meta.label} là ${meta.expectedSku} (Đọc AI: ${effectiveCode})` : `❌ Lệch SKU: CSDL là ${expSkuClean} (Đọc AI: ${effectiveCode})`);
      }

      // Nhóm theo effectiveCode để gộp các biến thể giống 90-99% vào mã chuẩn:
      const key = `${effectiveCode}__${itemOrient}`;
      if (!map[key]) {
        map[key] = {
          ...itemSku,
          code: effectiveCode,
          count: 0,
          is_match: isM,
          is_other_item: Boolean(otherSibling),
          other_item_label: otherSibling ? otherSibling.suffix_key : null,
          orientation: itemOrient,
          category_label: itemCat,
          match_reason: reason
        };
      }
      map[key].count += (itemSku.count || 1);
    });
    return Object.values(map);
  })();

  // 1. Phân tách danh sách thành 2 nhóm: Tủ Dưới (Pallet đứng) và Tủ Trên Cùng (Top nóc)
  // Quy chuẩn chuẩn xác từ thực tế nhà máy:
  // - Top nóc là mã đứng: Con tem dán đứng (orientation === 'vertical')
  // - Tủ đứng là nằm ngang: Con tem dán nằm ngang (orientation === 'horizontal')
  const isTopnocLpn = (l) => {
    if (l.orientation === 'vertical') return true;
    if (l.orientation === 'horizontal') return false;
    const cat = String(l.category_label || '').toLowerCase();
    if (cat.includes('top') || cat.includes('nóc') || cat.includes('noc')) return true;
    if (cat.includes('đứng') || cat.includes('dung') || cat.includes('dưới') || cat.includes('duoi')) return false;
    if (l.is_other_item) return !isPosVertical;
    return isPosVertical;
  };

  const bottomLpns = finalLpnsList.filter((l) => !isTopnocLpn(l));
  const topLpns = finalLpnsList.filter((l) => isTopnocLpn(l));

  const isTopnocSku = (s) => {
    if (s.orientation === 'vertical') return true;
    if (s.orientation === 'horizontal') return false;
    const cat = String(s.category_label || '').toLowerCase();
    if (cat.includes('top') || cat.includes('nóc') || cat.includes('noc')) return true;
    if (cat.includes('đứng') || cat.includes('dung') || cat.includes('dưới') || cat.includes('duoi')) return false;
    if (s.count > 1) return false; // Thường tủ đứng có 2 tủ nên count >= 2
    return isPosVertical;
  };

  const bottomSkus = finalSkusList.filter((s) => !isTopnocSku(s));
  const topSkus = finalSkusList.filter((s) => isTopnocSku(s));

  const hasTopnocData = topLpns.length > 0 || topSkus.length > 0;

  // 2. Xác định thông tin "Đi cùng với Pallet nào" cho kiện Top nóc
  const pairedPalletInfo = (() => {
    const otherLpn = bottomLpns.find((l) => l.is_other_item && l.other_item_label && l.other_item_label !== 'Tủ dưới (Pallet đứng)') ||
                     topLpns.find((l) => l.is_other_item && l.other_item_label && l.other_item_label !== 'Tủ dưới (Pallet đứng)');
    if (otherLpn) {
      return {
        label: `${otherLpn.other_item_label} (Kiện dán cạnh)`,
        itemKey: otherLpn.other_item_label
      };
    }
    if (isPosVertical && item?.suffix_key) {
      const matchNum = String(item.suffix_key).match(/\d+/);
      if (matchNum && Array.isArray(itemsList)) {
        const numStr = matchNum[0];
        const pairedPallet = itemsList.find(
          (it) => it.suffix_key && (it.suffix_key.toLowerCase() === `pallet ${numStr}`.toLowerCase() || it.suffix_key.toLowerCase() === `box ${numStr}`.toLowerCase())
        );
        if (pairedPallet) {
          return {
            label: `${pairedPallet.suffix_key} (Kiện dán cạnh)`,
            itemKey: pairedPallet.suffix_key,
            item: pairedPallet
          };
        }
      }
    }
    if (!isPosVertical && item?.suffix_key) {
      const matchNum = String(item.suffix_key).match(/\d+/);
      if (matchNum && Array.isArray(itemsList)) {
        const numStr = matchNum[0];
        const pairedBox = itemsList.find(
          (it) => it.suffix_key && (it.suffix_key.toLowerCase() === `box ${numStr}a`.toLowerCase() || it.suffix_key.toLowerCase() === `pallet ${numStr}a`.toLowerCase())
        );
        if (pairedBox) {
          return {
            label: `${pairedBox.suffix_key} (Thùng dán nóc)`,
            itemKey: pairedBox.suffix_key,
            item: pairedBox
          };
        }
      }
    }
    return null;
  })();

  // 3. Tìm các Pallet trong container có chung bộ LPN & SKU Top nóc này
  const sharedTopnocPallets = (() => {
    if (!hasTopnocData && !isPosVertical) return [];
    if (!Array.isArray(itemsList) || itemsList.length === 0) return [];

    const targetTopLpn = topLpns[0]?.code || (isPosVertical ? item?.lpn : null);
    if (!targetTopLpn) return [];

    const matchingBoxes = itemsList.filter((it) => {
      const itLpn = String(it.lpn || '').trim();
      return itLpn === targetTopLpn;
    });

    if (matchingBoxes.length === 0) return [];

    const results = [];
    const seen = new Set();

    matchingBoxes.forEach((bItem) => {
      const bKey = bItem.suffix_key || '';
      const matchNum = bKey.match(/\d+/);
      let pItem = null;
      if (matchNum) {
        const num = matchNum[0];
        pItem = itemsList.find(
          (it) => it.suffix_key && it.suffix_key.toLowerCase() === `pallet ${num}`.toLowerCase()
        );
      }
      const displayName = pItem ? `${pItem.suffix_key} (${bKey})` : bKey;
      const navTarget = pItem || bItem;
      const targetId = navTarget.id || navTarget.item_id || displayName;

      if (!seen.has(targetId)) {
        seen.add(targetId);
        const isCurrent = (navTarget.id === (item?.id || item?.item_id)) || (bItem.id === (item?.id || item?.item_id));
        results.push({
          displayName,
          navTarget,
          isCurrent
        });
      }
    });

    return results;
  })();

  const totalDetectedLpns = finalLpnsList.reduce((acc, l) => acc + (l.count || 1), 0);
  const totalDetectedSkus = finalSkusList.reduce((acc, s) => acc + (s.count || 1), 0);
  const missingLpnCount = Math.max(0, totalDetectedSkus - totalDetectedLpns);

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(25, 15, 10, 0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        {/* WRAPPER CHỨA MODAL VÀ 2 NÚT ĐIỀU HƯỚNG TRÒN 2 BÊN */}
        <div
          className="lpn-detail-wrapper"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: '100%'
          }}
        >
          {/* NÚT QUA TRÁI (PREVIOUS) */}
          {hasPrev && (
            <button
              type="button"
              className="lpn-modal-nav-btn prev"
              onClick={handlePrev}
              style={{
                position: 'absolute',
                left: '-56px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #EADCC9',
                boxShadow: '0 6px 20px rgba(45, 26, 18, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7B5233',
                cursor: 'pointer',
                zIndex: 1120,
                transition: 'all 0.18s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FAF6F0';
                e.currentTarget.style.borderColor = '#7B5233';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#EADCC9';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
              title="Dòng trước (← Phím mũi tên trái)"
            >
              <span style={{ fontSize: '1.4rem', fontWeight: '800', lineHeight: 1, userSelect: 'none' }}>&lsaquo;</span>
            </button>
          )}

          {/* NỘI DUNG CHÍNH CỦA MODAL POPUP (KÍCH THƯỚC CỐ ĐỊNH, ĐỒNG ĐỀU) */}
          <div
            className="lpn-detail-dialog"
            style={{
              background: '#FAF6F0',
              borderRadius: '12px',
              width: 'min(calc(100vw - 40px), 1460px)',
              maxHeight: '94vh',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(45, 26, 18, 0.22), 0 6px 20px rgba(123, 82, 51, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #EADCC9',
              animation: 'modalScaleUp 0.18s ease-out forwards',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. HEADER */}
            <div
              style={{
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #EADCC9',
                background: '#FAF6F0',
                flexShrink: 0,
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <h2
                    style={{
                      fontSize: '1.08rem',
                      fontWeight: '800',
                      color: '#2D1A12',
                      margin: 0,
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    title={modalTitle}
                  >
                    {item.container_number || modalTitle}
                  </h2>
                  {item.factory && item.factory !== '—' && (
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '3px',
                        fontSize: '0.68rem',
                        fontWeight: '700',
                        backgroundColor: '#4A2E1B',
                        color: '#FFFFFF'
                      }}
                    >
                      {item.factory}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#7B5233', fontWeight: '700', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.suffix_key || item.record_type || 'Pallet'} {item.sku ? `• SKU: ${item.sku}` : ''}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {/* Mobile Prev / Next Arrows ngay trong header */}
                <div className="lpn-mobile-only" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={!hasPrev}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #EADCC9',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: hasPrev ? '#7B5233' : '#D1D5DB',
                      cursor: hasPrev ? 'pointer' : 'not-allowed',
                      boxShadow: '0 1px 3px rgba(123, 82, 51, 0.08)'
                    }}
                    title="Trước"
                  >
                    <span style={{ fontSize: '1.15rem', fontWeight: '800', lineHeight: 1, userSelect: 'none' }}>&lsaquo;</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!hasNext}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #EADCC9',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: hasNext ? '#7B5233' : '#D1D5DB',
                      cursor: hasNext ? 'pointer' : 'not-allowed',
                      boxShadow: '0 1px 3px rgba(123, 82, 51, 0.08)'
                    }}
                    title="Sau"
                  >
                    <span style={{ fontSize: '1.15rem', fontWeight: '800', lineHeight: 1, userSelect: 'none' }}>&rsaquo;</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  style={{
                    background: '#FAF6F0',
                    border: '1px solid #EADCC9',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    color: '#7B5233',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(123, 82, 51, 0.08)'
                  }}
                  title="Đóng"
                >
                  <span style={{ fontSize: '1.2rem', fontWeight: '700', lineHeight: 1, userSelect: 'none' }}>&times;</span>
                </button>
              </div>
            </div>

            {/* 2. BODY */}
            <div
              style={{
                padding: '14px 16px',
                backgroundColor: '#FAF6F0',
                overflowY: 'auto',
                flex: 1
              }}
            >
              <div
                className="lpn-detail-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '290px minmax(320px, 1fr) minmax(460px, 1.35fr)',
                  gap: '16px',
                  alignItems: 'stretch'
                }}
              >
                {/* CỘT TRÁI: 2 BẢNG THÔNG TIN CÂN ĐỐI */}
                <div
                  className="lpn-detail-col-info"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    height: '350px',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* BẢNG 1: THÔNG TIN CONTAINER */}
                  <div
                    style={{
                      border: '1px solid #EADCC9',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 2px 5px rgba(123, 82, 51, 0.04)',
                      height: 'calc(50% - 5px)',
                      display: 'flex',
                      flexDirection: 'column',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#F4ECE1',
                        borderBottom: '1px solid #EADCC9',
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        color: '#4E3629',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        flexShrink: 0
                      }}
                    >
                      Thông Tin Container
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                        <tbody>
                          <CleanTableRow label="Số Container" value={item.container_number} bold />
                          <CleanTableRow label="Factory" value={item.factory} />
                          <CleanTableRow label="Date loading" value={formatDateMDY(item.date_loading || item.date_loading_raw)} />
                          <CleanTableRow label="Timestamp" value={formatTimestampVN(item.timestamp_raw)} isLast />
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* BẢNG 2: THÔNG TIN KIỆN HÀNG PALLET / BOX */}
                  <div
                    style={{
                      border: '1px solid #EADCC9',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 2px 5px rgba(123, 82, 51, 0.04)',
                      height: 'calc(50% - 5px)',
                      display: 'flex',
                      flexDirection: 'column',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#F4ECE1',
                        borderBottom: '1px solid #EADCC9',
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        color: '#4E3629',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        flexShrink: 0
                      }}
                    >
                      Thông Tin Kiện Hàng {item.record_type || 'Pallet'}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                        <tbody>
                          <CleanTableRow label="Mã SKU" value={item.sku} bold />
                          <CleanTableRow label="Mã LPN" value={item.lpn} bold />
                          <CleanTableRow label="Lô hàng (Batch)" value={item.batch_resolved || item.batch_original} />
                          <CleanTableRow
                            label="Vị trí kiện hàng"
                            value={item.suffix_key || item.record_type}
                            rightBadge={
                              (item.suffix_key || item.record_type) ? (
                                <span
                                  style={{
                                    fontSize: '0.67rem',
                                    fontWeight: '700',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: isPosVertical ? '#EEF2FF' : '#FEF3C7',
                                    color: isPosVertical ? '#4338CA' : '#92400E',
                                    border: `1px solid ${isPosVertical ? '#C7D2FE' : '#FDE68A'}`,
                                    whiteSpace: 'nowrap'
                                  }}
                                  title={isPosVertical ? 'Kiện có chữ cái đằng sau (Box 10A): LPN & SKU dán xoay dọc (Top nóc)' : 'Kiện không có chữ cái (Box 10 / Pallet 10): LPN & SKU dán ngang bình thường (Pallet đứng)'}
                                >
                                  {isPosVertical ? 'Top nóc' : 'Pallet đứng'}
                                </span>
                              ) : null
                            }
                            isLast
                          />
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* CỘT GIỮA: KHUNG PICTURE (CỐ ĐỊNH 350PX, KHÔNG BỊ KÉO DÀI BỞI ẢNH DỌC) */}
                <div
                  className="lpn-detail-col-pic"
                  style={{
                    border: '1px solid #EADCC9',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 5px rgba(123, 82, 51, 0.04)',
                    boxSizing: 'border-box',
                    height: '350px'
                  }}
                >
                  {/* Header Picture */}
                  <div
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#F4ECE1',
                      borderBottom: '1px solid #EADCC9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexShrink: 0
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        color: '#4E3629',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em'
                      }}
                    >
                      Picture LPN {item.suffix_key || ''}
                    </span>

                    <span
                      style={{
                        fontSize: '0.74rem',
                        color: '#7B5233',
                        fontWeight: '700'
                      }}
                    >
                      {images.length} ảnh
                    </span>
                  </div>

                  {/* Body Picture */}
                  <div
                    style={{
                      padding: '8px',
                      backgroundColor: '#FFFFFF',
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      boxSizing: 'border-box'
                    }}
                  >
                    {images.length === 0 ? (
                      <div
                        style={{
                          border: '1px dashed #D5C7B7',
                          borderRadius: '6px',
                          padding: '20px 16px',
                          textAlign: 'center',
                          color: '#A89485',
                          fontSize: '0.84rem',
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#FAF8F5'
                        }}
                      >
                        <div style={{ marginBottom: '6px', opacity: 0.6 }}>
                          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                        </div>
                        Chưa có hình ảnh
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          flex: 1,
                          minHeight: 0,
                          height: '100%',
                          boxSizing: 'border-box'
                        }}
                      >
                        {/* Khung chứa ảnh: cố định kích thước gọn gàng, xem phóng to bấm vào mở lightbox */}
                        <div
                          className="lpn-detail-pic-box"
                          onClick={() =>
                            setSelectedImage({ primary: activeImgUrl, fallback: activeFallbackUrl })
                          }
                          style={{
                            position: 'relative',
                            width: '100%',
                            flex: 1,
                            minHeight: 0,
                            borderRadius: '6px',
                            overflow: 'hidden',
                            backgroundColor: '#FAF8F5',
                            border: '1px solid #EADCC9',
                            cursor: 'zoom-in',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box'
                          }}
                        >
                          <img
                            key={`${item.id || ''}-${activeImgIdx}-${activeImgUrl}`}
                            src={activeImgUrl}
                            alt={`Picture LPN ${item.suffix_key} #${activeImgIdx + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              objectPosition: 'center',
                              display: 'block'
                            }}
                            onError={(e) => {
                              if (activeFallbackUrl && e.target.src !== activeFallbackUrl) {
                                e.target.src = activeFallbackUrl;
                              } else {
                                e.target.style.opacity = '0.3';
                              }
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '6px',
                              right: '6px',
                              padding: '2px 8px',
                              backgroundColor: 'rgba(45, 26, 18, 0.75)',
                              color: '#FFFFFF',
                              fontSize: '0.68rem',
                              fontWeight: '600',
                              borderRadius: '4px',
                              pointerEvents: 'none',
                              backdropFilter: 'blur(2px)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                              <line x1="11" y1="8" x2="11" y2="14" />
                              <line x1="8" y1="11" x2="14" y2="11" />
                            </svg>
                            Phóng to ảnh
                          </div>
                        </div>

                        {/* Thumbnail strip khi có nhiều ảnh */}
                        {images.length > 1 && (
                          <div
                            style={{
                              display: 'flex',
                              gap: '6px',
                              overflowX: 'auto',
                              padding: '2px 0',
                              flexShrink: 0
                            }}
                          >
                            {images.map((img, idx) => {
                              const tUrl = resolveImgUrl(img);
                              const isCur = idx === activeImgIdx;
                              return (
                                <button
                                  key={img.id || idx}
                                  type="button"
                                  onClick={() => setActiveImgIdx(idx)}
                                  style={{
                                    width: '46px',
                                    height: '32px',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    border: isCur ? '2px solid #7B5233' : '1px solid #D5C7B7',
                                    padding: 0,
                                    cursor: 'pointer',
                                    backgroundColor: '#FAF8F5',
                                    flexShrink: 0
                                  }}
                                >
                                  <img
                                    src={tUrl}
                                    alt={`Thumb ${idx + 1}`}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => {
                                      const fallback = img?.source_url;
                                      if (fallback && e.target.src !== fallback) {
                                        e.target.src = fallback;
                                      }
                                    }}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* CỘT 3: THÔNG TIN ĐỌC TỪ TRAINING HÌNH ẢNH (CỐ ĐỊNH 350PX, CHIA 2 CỘT LPN & SKU) */}
                <div
                  className="lpn-detail-col-ocr"
                  style={{
                    border: '1px solid #EADCC9',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 5px rgba(123, 82, 51, 0.04)',
                    boxSizing: 'border-box',
                    height: '350px'
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#F4ECE1',
                      borderBottom: '1px solid #EADCC9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexShrink: 0
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: '800',
                          color: '#4E3629',
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em'
                        }}
                      >
                        Thông tin đọc từ training hình ảnh
                      </span>
                    </div>

                    {aiResult && (() => {
                      const hasSkuMismatch = finalSkusList.some((s) => !s.is_match);
                      const hasLpnMismatch = finalLpnsList.some((l) => !l.is_match);
                      const hasSkuMatch = finalSkusList.some((s) => s.is_match);
                      const hasLpnMatch = finalLpnsList.some((l) => l.is_match);

                      let badgeText = 'Đã nhận diện';
                      let badgeBg = '#DEF7EC';
                      let badgeColor = '#03543F';
                      let badgeBorder = '#BCF0DA';

                      if (hasSkuMismatch || hasLpnMismatch) {
                        if (hasSkuMismatch && hasLpnMismatch) {
                          badgeText = '❌ LỆCH CẢ SKU & LPN';
                        } else if (hasSkuMismatch) {
                          badgeText = '❌ LỆCH MẪU SKU';
                        } else {
                          badgeText = '⚠️ LỆCH MÃ LPN';
                        }
                        badgeBg = '#FDE8E8';
                        badgeColor = '#9B1C1C';
                        badgeBorder = '#F8B4B4';
                      } else if (hasSkuMatch && hasLpnMatch) {
                        badgeText = '✅ Khớp 100%';
                        badgeBg = '#DEF7EC';
                        badgeColor = '#03543F';
                        badgeBorder = '#BCF0DA';
                      } else if (hasSkuMatch || hasLpnMatch) {
                        badgeText = hasSkuMatch ? 'Khớp SKU (Thiếu LPN)' : 'Khớp LPN (Thiếu SKU)';
                        badgeBg = '#FEF3C7';
                        badgeColor = '#92400E';
                        badgeBorder = '#FCD34D';
                      } else if (aiResult.status === 'review') {
                        badgeText = 'Cần Review';
                        badgeBg = '#FEF3C7';
                        badgeColor = '#92400E';
                        badgeBorder = '#FCD34D';
                      } else {
                        badgeText = 'Chưa khớp CSDL';
                        badgeBg = '#FDE8E8';
                        badgeColor = '#9B1C1C';
                        badgeBorder = '#F8B4B4';
                      }

                      return (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            backgroundColor: badgeBg,
                            color: badgeColor,
                            border: `1px solid ${badgeBorder}`,
                            letterSpacing: '0.01em'
                          }}
                        >
                          {badgeText}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Sub toolbar: Chọn model & nút quét */}
                  <div
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#FAF8F5',
                      borderBottom: '1px solid #EADCC9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      flexShrink: 0
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <span style={{ fontSize: '0.74rem', color: '#7B5233', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        Chế độ OCR:
                      </span>
                      <select
                        value={selectedAiModel}
                        onChange={(e) => setSelectedAiModel(e.target.value)}
                        disabled={isScanningAi}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: '1px solid #D5C7B7',
                          fontSize: '0.74rem',
                          color: '#2D1A12',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                          maxWidth: '280px',
                          minWidth: '170px',
                          textOverflow: 'ellipsis'
                        }}
                        title="Chọn mô hình AI OCR"
                      >
                        {models.map((m) => (
                          <option key={m.id} value={m.id} title={m.display_name || m.name || m.label || m.id}>
                            {m.display_name || m.name || m.label || m.id}
                          </option>
                        ))}
                        {models.length === 0 && <option value="hybrid_epoch15">Dual-Engine: Epoch 15 - Acc 99.1%</option>}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {aiResult && (
                        <button
                          type="button"
                          onClick={handleOpenPipelineInspector}
                          disabled={isScanningAi}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '3px 9px',
                            borderRadius: '5px',
                            backgroundColor: '#FAF6F0',
                            color: '#7B5233',
                            border: '1px solid #D5C7B7',
                            fontSize: '0.73rem',
                            fontWeight: '700',
                            cursor: isScanningAi ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap'
                          }}
                          title="Xem chi tiết nhận dạng ảnh AI (Vị trí BBox, Cắt nhãn ROI, Khung từ OCR)"
                        >
                          Chi tiết
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleScanAiNow}
                        disabled={isScanningAi}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 11px',
                          borderRadius: '5px',
                          backgroundColor: isScanningAi ? '#D5C7B7' : '#7B5233',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '0.73rem',
                          fontWeight: '700',
                          cursor: isScanningAi ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap'
                        }}
                        title="Quét lại kiện hàng này bằng mô hình AI đã chọn"
                      >
                        {isScanningAi && (
                          <div
                            style={{
                              width: '11px',
                              height: '11px',
                              border: '2px solid rgba(255,255,255,0.4)',
                              borderTopColor: '#FFFFFF',
                              borderRadius: '50%',
                              animation: 'spin 0.8s linear infinite'
                            }}
                          />
                        )}
                        {isScanningAi ? 'Đang đọc...' : aiResult ? 'Quét lại' : 'Quét AI ngay'}
                      </button>
                    </div>
                  </div>

                  {/* Content Area */}
                  {isLoadingAi ? (
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#A89485',
                        fontSize: '0.82rem',
                        gap: '8px'
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          border: '2px solid #EADCC9',
                          borderTopColor: '#7B5233',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite'
                        }}
                      />
                      <span>Đang tải kết quả AI...</span>
                    </div>
                  ) : isScanningAi ? (
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#7B5233',
                        fontSize: '0.84rem',
                        gap: '10px',
                        padding: '16px',
                        textAlign: 'center'
                      }}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          border: '3px solid #EADCC9',
                          borderTopColor: '#7B5233',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite'
                        }}
                      />
                      <div style={{ fontWeight: '700', color: '#4E3629' }}>AI đang phân tích tem nhãn...</div>
                      <div style={{ fontSize: '0.74rem', color: '#8C6E54', maxWidth: '240px' }}>
                        Đang dò tìm tọa độ nhãn dán, xoay góc tối ưu & nhận diện mã LPN/SKU...
                      </div>
                    </div>
                  ) : !aiResult ? (
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px 16px',
                        textAlign: 'center',
                        backgroundColor: '#FAF8F5'
                      }}
                    >
                      <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#4E3629', marginBottom: '6px' }}>
                        Chưa có dữ liệu đọc từ AI
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#A89485', marginBottom: '14px', maxWidth: '240px' }}>
                        Kiện hàng này chưa được quét bằng mô hình AI đã train. Bấm nút dưới đây để chạy nhận diện ngay.
                      </div>
                      <button
                        type="button"
                        onClick={handleScanAiNow}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '7px 16px',
                          backgroundColor: '#7B5233',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(123, 82, 51, 0.25)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Bắt đầu đọc ảnh bằng AI
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#FFFFFF',
                        overflow: 'hidden'
                      }}
                    >
                      {aiScanError && (
                        <div
                          style={{
                            margin: '4px 8px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#FDE8E8',
                            border: '1px solid #F8B4B4',
                            color: '#9B1C1C',
                            fontSize: '0.73rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexShrink: 0
                          }}
                        >
                          <span>{aiScanError}</span>
                        </div>
                      )}

                      {/* CHIA 2 CỘT HIỂN THỊ TẤT CẢ MÃ ĐỌC ĐƯỢC: CỘT MÃ LPN & CỘT MÃ SKU */}
                      <div
                        style={{
                          flex: 1,
                          minHeight: 0,
                          display: 'flex',
                          overflow: 'hidden'
                        }}
                      >
                        {/* CỘT 1 (BÊN TRÁI): THÔNG TIN TỦ DƯỚI (PALLET ĐỨNG) */}
                        <div
                          style={{
                            flex: 1,
                            borderRight: '1px solid #EADCC9',
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: 0,
                            backgroundColor: '#FFFFFF'
                          }}
                        >
                          {/* Header Cột Tủ Dưới */}
                          <div
                            style={{
                              padding: '6px 9px',
                              backgroundColor: '#FDFBF7',
                              borderBottom: '1px solid #EADCC9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexShrink: 0
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontSize: '0.85rem' }}>🔽</span>
                              <span
                                style={{
                                  fontSize: '0.74rem',
                                  fontWeight: '800',
                                  color: '#78350F',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.02em'
                                }}
                              >
                                Tủ dưới (Pallet đứng)
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: '0.67rem',
                                color: '#92400E',
                                fontWeight: '700',
                                backgroundColor: '#FEF3C7',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid #FDE68A'
                              }}
                            >
                              {bottomLpns.length + bottomSkus.length} mã
                            </span>
                          </div>

                          {/* Body Cột Tủ Dưới: Phân mục LPN & SKU */}
                          <div
                            style={{
                              flex: 1,
                              overflowY: 'auto',
                              padding: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}
                          >
                            {/* Phân mục 1: Mã LPN Tủ Dưới */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#4B5563', textTransform: 'uppercase' }}>
                                  Mã LPN ({bottomLpns.length})
                                </span>
                              </div>
                              {bottomLpns.length === 0 ? (
                                <div style={{ padding: '8px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.73rem', fontStyle: 'italic', backgroundColor: '#F9FAFB', borderRadius: '4px' }}>
                                  Chưa nhận diện được mã LPN
                                </div>
                              ) : (
                                bottomLpns.map((itemLpn, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      padding: '6px 8px',
                                      borderRadius: '6px',
                                      backgroundColor: itemLpn.is_match ? '#F0FDF4' : '#FEF2F2',
                                      border: `1.5px solid ${itemLpn.is_match ? '#86EFAC' : '#F87171'}`,
                                      boxShadow: itemLpn.is_match ? 'none' : '0 1px 3px rgba(239, 68, 68, 0.1)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '3px',
                                      minWidth: 0
                                    }}
                                    title={itemLpn.match_reason}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                                        <span style={{ fontSize: '0.8rem' }}>{itemLpn.is_match ? '✅' : '❌'}</span>
                                        <span
                                          style={{
                                            fontFamily: 'Consolas, monospace',
                                            fontSize: '0.84rem',
                                            fontWeight: '800',
                                            color: itemLpn.is_match ? '#15803D' : '#991B1B',
                                            letterSpacing: '-0.2px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                          }}
                                        >
                                          {itemLpn.code}
                                        </span>
                                      </div>
                                      <span
                                        style={{
                                          fontSize: '0.66rem',
                                          color: itemLpn.is_match ? '#166534' : '#991B1B',
                                          fontWeight: '700',
                                          backgroundColor: itemLpn.is_match ? '#DCFCE7' : '#FEE2E2',
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                          border: `1px solid ${itemLpn.is_match ? '#BBF7D0' : '#FECACA'}`,
                                          flexShrink: 0
                                        }}
                                      >
                                        {itemLpn.count} cái
                                      </span>
                                    </div>
                                    {itemLpn.is_match && itemLpn.match_reason && (
                                      <div style={{ fontSize: '0.67rem', color: '#15803D', fontWeight: '600', lineHeight: 1.25 }}>
                                        {itemLpn.match_reason}
                                      </div>
                                    )}
                                    {!itemLpn.is_match && itemLpn.match_reason && (
                                      <div style={{ fontSize: '0.67rem', color: '#DC2626', fontWeight: '700', lineHeight: 1.25, backgroundColor: '#FFF5F5', padding: '2px 4px', borderRadius: '3px', border: '1px dashed #FECACA' }}>
                                        {itemLpn.match_reason}
                                      </div>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Phân mục 2: Mã SKU Tủ Dưới */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#4B5563', textTransform: 'uppercase' }}>
                                  Mã SKU ({bottomSkus.length})
                                </span>
                              </div>
                              {bottomSkus.length === 0 ? (
                                <div style={{ padding: '8px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.73rem', fontStyle: 'italic', backgroundColor: '#F9FAFB', borderRadius: '4px' }}>
                                  Chưa nhận diện được mã SKU
                                </div>
                              ) : (
                                bottomSkus.map((itemSku, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      padding: '6px 8px',
                                      borderRadius: '6px',
                                      backgroundColor: itemSku.is_match ? '#F0FDF4' : '#FEF2F2',
                                      border: `1.5px solid ${itemSku.is_match ? '#86EFAC' : '#F87171'}`,
                                      boxShadow: itemSku.is_match ? 'none' : '0 1px 3px rgba(239, 68, 68, 0.1)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '3px',
                                      minWidth: 0
                                    }}
                                    title={itemSku.match_reason}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                                        <span style={{ fontSize: '0.8rem' }}>{itemSku.is_match ? '✅' : '❌'}</span>
                                        <span
                                          style={{
                                            fontFamily: 'Consolas, monospace',
                                            fontSize: '0.84rem',
                                            fontWeight: '800',
                                            color: itemSku.is_match ? '#15803D' : '#991B1B',
                                            letterSpacing: '-0.2px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                          }}
                                        >
                                          {itemSku.code}
                                        </span>
                                      </div>
                                      <span
                                        style={{
                                          fontSize: '0.66rem',
                                          color: itemSku.is_match ? '#166534' : '#991B1B',
                                          fontWeight: '700',
                                          backgroundColor: itemSku.is_match ? '#DCFCE7' : '#FEE2E2',
                                          padding: '1px 6px',
                                          borderRadius: '4px',
                                          border: `1px solid ${itemSku.is_match ? '#BBF7D0' : '#FECACA'}`,
                                          flexShrink: 0
                                        }}
                                      >
                                        {itemSku.count} cái
                                      </span>
                                    </div>
                                    {itemSku.is_match && itemSku.match_reason && (
                                      <div style={{ fontSize: '0.67rem', color: '#15803D', fontWeight: '600', lineHeight: 1.25 }}>
                                        {itemSku.match_reason}
                                      </div>
                                    )}
                                    {!itemSku.is_match && itemSku.match_reason && (
                                      <div style={{ fontSize: '0.67rem', color: '#DC2626', fontWeight: '700', lineHeight: 1.25, backgroundColor: '#FFF5F5', padding: '2px 4px', borderRadius: '3px', border: '1px dashed #FECACA' }}>
                                        {itemSku.match_reason}
                                      </div>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        {/* CỘT 2 (BÊN PHẢI): THÔNG TIN TỦ TRÊN CÙNG (TOP NÓC) */}
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: 0,
                            backgroundColor: '#FFFFFF'
                          }}
                        >
                          {/* Header Cột Tủ Trên Cùng */}
                          <div
                            style={{
                              padding: '6px 9px',
                              backgroundColor: '#EEF2FF',
                              borderBottom: '1px solid #C7D2FE',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexShrink: 0
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontSize: '0.85rem' }}>🔼</span>
                              <span
                                style={{
                                  fontSize: '0.74rem',
                                  fontWeight: '800',
                                  color: '#312E81',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.02em'
                                }}
                              >
                                Tủ trên cùng (Top nóc)
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: '0.67rem',
                                color: '#4338CA',
                                fontWeight: '700',
                                backgroundColor: '#E0E7FF',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid #C7D2FE'
                              }}
                            >
                              {topLpns.length + topSkus.length} mã
                            </span>
                          </div>

                          {/* Badge Phụ: ĐI CÙNG VỚI PALLET NÀO */}
                          {pairedPalletInfo && (
                            <div
                              style={{
                                padding: '4px 9px',
                                backgroundColor: '#F8FAFC',
                                borderBottom: '1px solid #E2E8F0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.71rem',
                                flexShrink: 0
                              }}
                            >
                              <span style={{ color: '#475569', fontWeight: '600' }}>
                                Đi cùng:
                              </span>
                              {pairedPalletInfo.item && onNavigate ? (
                                <button
                                  type="button"
                                  onClick={() => onNavigate(pairedPalletInfo.item)}
                                  style={{
                                    border: '1px solid #93C5FD',
                                    backgroundColor: '#EFF6FF',
                                    color: '#1D4ED8',
                                    fontWeight: '700',
                                    fontSize: '0.7rem',
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title="Bấm để xem pallet đi cùng"
                                >
                                  {pairedPalletInfo.label} →
                                </button>
                              ) : (
                                <span
                                  style={{
                                    fontWeight: '700',
                                    color: '#1E293B',
                                    backgroundColor: '#F1F5F9',
                                    padding: '1px 6px',
                                    borderRadius: '3px'
                                  }}
                                >
                                  {pairedPalletInfo.label}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Body Cột Tủ Trên Cùng: Phân mục LPN, SKU & Danh sách cùng bộ Top Nóc */}
                          <div
                            style={{
                              flex: 1,
                              overflowY: 'auto',
                              padding: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}
                          >
                            {!hasTopnocData && !isPosVertical ? (
                              <div
                                style={{
                                  padding: '20px 10px',
                                  textAlign: 'center',
                                  color: '#94A3B8',
                                  fontSize: '0.75rem',
                                  fontStyle: 'italic',
                                  backgroundColor: '#F8FAFC',
                                  borderRadius: '6px',
                                  border: '1px dashed #E2E8F0',
                                  margin: 'auto 0'
                                }}
                              >
                                Kiện này không có tem Top nóc đi kèm
                              </div>
                            ) : (
                              <>
                                {/* Phân mục 1: Mã LPN Top Nóc */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#4338CA', textTransform: 'uppercase' }}>
                                      Mã LPN ({topLpns.length})
                                    </span>
                                  </div>
                                  {topLpns.length === 0 ? (
                                    <div style={{ padding: '6px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.72rem', fontStyle: 'italic', backgroundColor: '#F8FAFC', borderRadius: '4px' }}>
                                      Chưa nhận diện được mã LPN Top nóc
                                    </div>
                                  ) : (
                                    topLpns.map((itemLpn, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          padding: '6px 8px',
                                          borderRadius: '6px',
                                          backgroundColor: itemLpn.is_match ? '#F0FDF4' : '#FEF2F2',
                                          border: `1.5px solid ${itemLpn.is_match ? '#86EFAC' : '#F87171'}`,
                                          boxShadow: itemLpn.is_match ? 'none' : '0 1px 3px rgba(239, 68, 68, 0.1)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '3px',
                                          minWidth: 0
                                        }}
                                        title={itemLpn.match_reason}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                                            <span style={{ fontSize: '0.8rem' }}>{itemLpn.is_match ? '✅' : '❌'}</span>
                                            <span
                                              style={{
                                                fontFamily: 'Consolas, monospace',
                                                fontSize: '0.84rem',
                                                fontWeight: '800',
                                                color: itemLpn.is_match ? '#15803D' : '#991B1B',
                                                letterSpacing: '-0.2px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                              }}
                                            >
                                              {itemLpn.code}
                                            </span>
                                          </div>
                                          <span
                                            style={{
                                              fontSize: '0.66rem',
                                              color: itemLpn.is_match ? '#166534' : '#991B1B',
                                              fontWeight: '700',
                                              backgroundColor: itemLpn.is_match ? '#DCFCE7' : '#FEE2E2',
                                              padding: '1px 6px',
                                              borderRadius: '4px',
                                              border: `1px solid ${itemLpn.is_match ? '#BBF7D0' : '#FECACA'}`,
                                              flexShrink: 0
                                            }}
                                          >
                                            {itemLpn.count} cái
                                          </span>
                                        </div>
                                        {itemLpn.is_match && itemLpn.match_reason && (
                                          <div style={{ fontSize: '0.67rem', color: '#15803D', fontWeight: '600', lineHeight: 1.25 }}>
                                            {itemLpn.match_reason}
                                          </div>
                                        )}
                                        {!itemLpn.is_match && itemLpn.match_reason && (
                                          <div style={{ fontSize: '0.67rem', color: '#DC2626', fontWeight: '700', lineHeight: 1.25, backgroundColor: '#FFF5F5', padding: '2px 4px', borderRadius: '3px', border: '1px dashed #FECACA' }}>
                                            {itemLpn.match_reason}
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>

                                {/* Phân mục 2: Mã SKU Top Nóc */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#4338CA', textTransform: 'uppercase' }}>
                                      Mã SKU ({topSkus.length})
                                    </span>
                                  </div>
                                  {topSkus.length === 0 ? (
                                    <div style={{ padding: '6px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.72rem', fontStyle: 'italic', backgroundColor: '#F8FAFC', borderRadius: '4px' }}>
                                      Chưa nhận diện được mã SKU Top nóc
                                    </div>
                                  ) : (
                                    topSkus.map((itemSku, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          padding: '6px 8px',
                                          borderRadius: '6px',
                                          backgroundColor: itemSku.is_match ? '#F0FDF4' : '#FEF2F2',
                                          border: `1.5px solid ${itemSku.is_match ? '#86EFAC' : '#F87171'}`,
                                          boxShadow: itemSku.is_match ? 'none' : '0 1px 3px rgba(239, 68, 68, 0.1)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '3px',
                                          minWidth: 0
                                        }}
                                        title={itemSku.match_reason}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                                            <span style={{ fontSize: '0.8rem' }}>{itemSku.is_match ? '✅' : '❌'}</span>
                                            <span
                                              style={{
                                                fontFamily: 'Consolas, monospace',
                                                fontSize: '0.84rem',
                                                fontWeight: '800',
                                                color: itemSku.is_match ? '#15803D' : '#991B1B',
                                                letterSpacing: '-0.2px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                              }}
                                            >
                                              {itemSku.code}
                                            </span>
                                          </div>
                                          <span
                                            style={{
                                              fontSize: '0.66rem',
                                              color: itemSku.is_match ? '#166534' : '#991B1B',
                                              fontWeight: '700',
                                              backgroundColor: itemSku.is_match ? '#DCFCE7' : '#FEE2E2',
                                              padding: '1px 6px',
                                              borderRadius: '4px',
                                              border: `1px solid ${itemSku.is_match ? '#BBF7D0' : '#FECACA'}`,
                                              flexShrink: 0
                                            }}
                                          >
                                            {itemSku.count} cái
                                          </span>
                                        </div>
                                        {itemSku.is_match && itemSku.match_reason && (
                                          <div style={{ fontSize: '0.67rem', color: '#15803D', fontWeight: '600', lineHeight: 1.25 }}>
                                            {itemSku.match_reason}
                                          </div>
                                        )}
                                        {!itemSku.is_match && itemSku.match_reason && (
                                          <div style={{ fontSize: '0.67rem', color: '#DC2626', fontWeight: '700', lineHeight: 1.25, backgroundColor: '#FFF5F5', padding: '2px 4px', borderRadius: '3px', border: '1px dashed #FECACA' }}>
                                            {itemSku.match_reason}
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </>
                            )}

                            {/* Phân mục 3: CÁC PALLET DÙNG CHUNG BỘ TOP NÓC TRONG CONTAINER */}
                            {sharedTopnocPallets.length > 0 && (
                              <div
                                style={{
                                  marginTop: '4px',
                                  padding: '7px 8px',
                                  backgroundColor: '#F8FAFC',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '5px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '0.69rem', fontWeight: '800', color: '#334155' }}>
                                    👥 Chung bộ Top nóc ({sharedTopnocPallets.length} kiện):
                                  </span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                  {sharedTopnocPallets.map((shp, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      disabled={shp.isCurrent}
                                      onClick={() => onNavigate && onNavigate(shp.navTarget)}
                                      style={{
                                        fontSize: '0.67rem',
                                        fontWeight: shp.isCurrent ? '800' : '600',
                                        padding: '2px 7px',
                                        borderRadius: '4px',
                                        backgroundColor: shp.isCurrent ? '#F59E0B' : '#FFFFFF',
                                        color: shp.isCurrent ? '#FFFFFF' : '#1E293B',
                                        border: `1px solid ${shp.isCurrent ? '#D97706' : '#CBD5E1'}`,
                                        cursor: shp.isCurrent ? 'default' : 'pointer',
                                        transition: 'all 0.15s ease',
                                        boxShadow: shp.isCurrent ? '0 1px 2px rgba(245,158,11,0.3)' : 'none'
                                      }}
                                      title={shp.isCurrent ? 'Đang xem kiện này' : `Bấm chuyển sang xem ${shp.displayName}`}
                                    >
                                      {shp.displayName} {shp.isCurrent && '(Hiện tại)'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* FOOTER ĐỘ TIN CẬY & TỐC ĐỘ XỬ LÝ */}
                      <div
                        style={{
                          padding: '6px 10px',
                          backgroundColor: '#FAF8F5',
                          borderTop: '1px solid #EADCC9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.74rem',
                          flexShrink: 0
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#7B5233', fontWeight: '600' }}>Độ tin cậy:</span>
                          {aiResult.confidence ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <div
                                style={{
                                  width: '42px',
                                  height: '5px',
                                  borderRadius: '3px',
                                  backgroundColor: '#E5E7EB',
                                  overflow: 'hidden'
                                }}
                              >
                                <div
                                  style={{
                                    width: `${Math.min(100, Math.round((aiResult.confidence || 0) * 100))}%`,
                                    height: '100%',
                                    backgroundColor:
                                      aiResult.confidence >= 0.8
                                        ? '#10B981'
                                        : aiResult.confidence >= 0.5
                                          ? '#F59E0B'
                                          : '#EF4444'
                                  }}
                                />
                              </div>
                              <span style={{ fontWeight: '800', color: '#15803D' }}>
                                {Math.min(100, Math.round((aiResult.confidence || 0) * 100))}%
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: '#9CA3AF' }}>—</span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#7B5233', fontWeight: '600' }}>Tốc độ xử lý:</span>
                          <span style={{ fontWeight: '700', color: '#2D1A12' }}>
                            {formatProcessingTime(aiResult.processing_time_ms)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. FOOTER BAR VỚI CÁC THAO TÁC XỬ LÝ (KHÔNG EMOJI) */}
            <div
              className="lpn-detail-footer"
              style={{
                padding: '12px 20px',
                backgroundColor: '#FAF6F0',
                borderTop: '1px solid #EADCC9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: resolveFeedback ? 'space-between' : 'flex-end',
                gap: '12px',
                flexShrink: 0
              }}
            >
              {/* Thông báo kết quả xử lý (nếu có) */}
              {resolveFeedback && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#059669' }}>
                    {resolveFeedback}
                  </span>
                </div>
              )}

              {/* Các nút thao tác: Đóng, Không xử lý được, Đã xử lý */}
              <div className="lpn-detail-footer-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    border: '1px solid #D5C7B7',
                    backgroundColor: '#FFFFFF',
                    color: '#4E3629',
                    padding: '7px 16px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAF6F0')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  Đóng
                </button>

                <button
                  type="button"
                  onClick={() => setShowUnresolvedPrompt(true)}
                  disabled={isResolving}
                  style={{
                    border: '1.5px solid #DC2626',
                    backgroundColor: '#FFFFFF',
                    color: '#DC2626',
                    padding: '7px 16px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#DC2626';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.color = '#DC2626';
                  }}
                  title="Đánh dấu dòng này không thể xử lý kèm lý do"
                >
                  Không xử lý được
                </button>

                <button
                  type="button"
                  onClick={() => handleResolveAction('resolved')}
                  disabled={isResolving}
                  style={{
                    border: 'none',
                    backgroundColor: '#059669',
                    color: '#FFFFFF',
                    padding: '7px 20px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#047857')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
                  title="Đánh dấu dòng này đã được xử lý xong"
                >
                  Đã xử lý
                </button>
              </div>
            </div>

            {/* Prompt nhập lý do khi chọn "Không xử lý được" */}
            {showUnresolvedPrompt && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.45)',
                  backdropFilter: 'blur(2px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 200,
                  padding: '16px'
                }}
                onClick={() => setShowUnresolvedPrompt(false)}
              >
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    border: '1.5px solid #FCA5A5',
                    width: 'min(90vw, 480px)',
                    padding: '18px',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.22)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#991B1B' }}>
                      Ghi chú lý do không thể xử lý (bắt buộc):
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowUnresolvedPrompt(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        color: '#6B7280'
                      }}
                    >
                      &times;
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[
                      'Mất tem nhãn trên thùng',
                      'Tem nhãn rách nát / chói sáng',
                      'Sai quy cách dán nhãn',
                      'Thùng hàng rỗng / dán nhầm'
                    ].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setUnresolvedReason(sug)}
                        style={{
                          border: '1px solid #FECACA',
                          backgroundColor: '#FEF2F2',
                          color: '#991B1B',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          fontSize: '0.72rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    value={unresolvedReason}
                    onChange={(e) => setUnresolvedReason(e.target.value)}
                    placeholder="Nhập lý do cụ thể..."
                    style={{
                      width: '100%',
                      borderRadius: '6px',
                      border: '1px solid #D1D5DB',
                      padding: '8px',
                      fontSize: '0.82rem',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                    autoFocus
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowUnresolvedPrompt(false)}
                      style={{
                        border: '1px solid #D1D5DB',
                        backgroundColor: '#FFFFFF',
                        color: '#374151',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveAction('unresolved', unresolvedReason)}
                      disabled={isResolving}
                      style={{
                        border: 'none',
                        backgroundColor: '#DC2626',
                        color: '#FFFFFF',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Xác nhận: Không xử lý được
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* NÚT QUA PHẢI (NEXT) */}
          {hasNext && (
            <button
              type="button"
              className="lpn-modal-nav-btn next"
              onClick={handleNext}
              style={{
                position: 'absolute',
                right: '-56px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #EADCC9',
                boxShadow: '0 6px 20px rgba(45, 26, 18, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7B5233',
                cursor: 'pointer',
                zIndex: 1120,
                transition: 'all 0.18s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FAF6F0';
                e.currentTarget.style.borderColor = '#7B5233';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#EADCC9';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
              title="Dòng kế tiếp (→ Phím mũi tên phải)"
            >
              <span style={{ fontSize: '1.4rem', fontWeight: '800', lineHeight: 1, userSelect: 'none' }}>&rsaquo;</span>
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Inspector Modal: Chi Tiết Ảnh & Luồng Pipeline */}
      {showPipelineInspector && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(25, 15, 10, 0.75)',
            zIndex: 10020,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            backdropFilter: 'blur(3px)'
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setShowPipelineInspector(false);
          }}
        >
          <div
            className="lpn-inspector-dialog"
            style={{
              backgroundColor: '#FFFDF9',
              borderRadius: '12px',
              width: 'min(96vw, 1180px)',
              maxWidth: '96vw',
              height: 'min(94vh, 740px)',
              maxHeight: '94vh',
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
                minHeight: '46px',
                height: 'auto',
                padding: '8px 14px',
                backgroundColor: '#FAF6F0',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #EADCC9',
                flexShrink: 0,
                boxSizing: 'border-box',
                gap: '8px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '800', fontSize: '0.98rem', color: '#2D1A12', letterSpacing: '0.01em' }}>
                    Chi Tiết Ảnh & Luồng Pipeline: {containerPart} ({item.suffix_key || 'Pallet'})
                  </span>
                  <span style={{
                    fontSize: '0.70rem',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '5px',
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    border: '1px solid #86EFAC',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block', boxShadow: '0 0 4px #16A34A' }} />
                    {inspectorAnalysis?.model_info?.model_name?.includes('Dual-Engine')
                      ? inspectorAnalysis.model_info.model_name
                      : `Chế độ Dual-Engine: ${inspectorAnalysis?.model_info?.model_name ? inspectorAnalysis.model_info.model_name.replace(' (CRNN PyTorch)', '') : 'Epoch 19 - Acc 99.1%'} + EasyOCR Base`}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchInspectorAnalysis(true);
                  }}
                  disabled={inspectorLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#EDE3D2',
                    border: '1px solid #D6C0A9',
                    color: '#7B5233',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: inspectorLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Phân tích lại ảnh mới nhất theo thuật toán pipeline hiện tại"
                >
                  <span style={{ fontSize: '0.9rem', display: 'inline-block', transform: inspectorLoading ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s ease' }}>↻</span>
                  {inspectorLoading ? 'Đang chạy...' : 'Làm mới'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPipelineInspector(false);
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

            {/* Inspector Body */}
            <div
              style={{
                flex: 1,
                padding: '12px 14px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                backgroundColor: '#FAF6F0',
                boxSizing: 'border-box'
              }}
            >
              {/* ===== TOP: Image Viewer + Compact Steps ===== */}
              <div
                className="lpn-inspector-top-grid"
                style={{ display: 'grid', gridTemplateColumns: '1.22fr 0.78fr', gap: '12px', height: '340px', flexShrink: 0 }}
              >
                {/* Left: Pipeline Image Viewer */}
                <div style={{ minWidth: 0, height: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                  <ImageCanvas
                    images={inspectorAnalysis?.images}
                    activeTab={inspectorTab}
                    onTabChange={(tab) => setInspectorTab(tab)}
                    loading={inspectorLoading}
                    selectedRoiIdx={selectedRoiIndex + 1}
                    onSelectRoiIdx={(idx) => setSelectedRoiIndex(idx - 1)}
                  />
                </div>

                {/* Right: Thông tin ảnh + Bóc tách */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '340px', boxSizing: 'border-box' }}>
                  {/* Thông tin ảnh */}
                  <div style={{ backgroundColor: '#FFF', border: '1px solid #EADCC9', borderRadius: '6px', padding: '8px 12px' }}>
                    <div style={{ fontSize: '0.80rem', fontWeight: '800', color: '#7B5233', marginBottom: '3px' }}>
                      Thông tin ảnh
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#4A2E1B' }}>
                      Mã kiện: <strong>{containerPart}</strong> ({item.suffix_key || 'Pallet'})
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#8D6E63', marginTop: '2px' }}>
                      Nguồn: {item.factory || 'VINA G7'} • Ngày: {item.date_loading || '—'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#15803D', marginTop: '3px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block' }} />
                      <strong>{inspectorAnalysis?.model_info?.model_name?.includes('Dual-Engine')
                        ? inspectorAnalysis.model_info.model_name
                        : `Chế độ Dual-Engine: ${inspectorAnalysis?.model_info?.model_name ? inspectorAnalysis.model_info.model_name.replace(' (CRNN PyTorch)', '') : 'Epoch 19 - Acc 99.1%'} + EasyOCR Base`}</strong>
                    </div>
                  </div>

                  {/* CHI TIET MA BOC TACH - inline in right column */}
                  {(() => {
                    const roiList = inspectorAnalysis?.roi_details || inspectorAnalysis?.images?.roi_details || [];
                    return (
                      <div style={{ backgroundColor: '#FFF', border: '1px solid #EADCC9', borderRadius: '6px', padding: '8px 10px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: '800', color: '#7B5233' }}>
                            BÓC TÁCH ({inspectorLoading ? 'ĐANG TẢI...' : `${roiList.length} TEM`})
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
                                  <span style={{ fontSize: '0.68rem', fontWeight: '800', color: selectedRoiIndex === -1 ? '#065F46' : '#374151', whiteSpace: 'nowrap' }}>
                                    Tất Cả Tem
                                  </span>
                                  <span style={{ fontSize: '0.58rem', color: '#6B7280', fontWeight: '700' }}>
                                    ({roiList.length})
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.64rem', color: '#6B7280', fontWeight: '600', marginTop: '2px', whiteSpace: 'nowrap' }}>
                                  Xem ghép toàn bộ tem
                                </div>
                              </div>
                            )}

                            {roiList.map((roi, rIdx) => {
                              const targetLpn = item?.lpn;
                              const targetSku = item?.sku;
                              const pairedItem = inspectorAnalysis?.meta_info?.paired_item;
                              const pairedLpn = pairedItem?.lpn;
                              const containerItems = inspectorAnalysis?.meta_info?.container_items || [];

                              const isSel = selectedRoiIndex === rIdx;
                              const rLpn = roi.extracted_lpn || roi.extracted?.lpn;
                              const rSku = roi.extracted_sku || roi.extracted?.sku;

                              const rOrient = roi.orientation || (roi.rotation_deg === 90 || roi.rotation_deg === 270 ? 'vertical' : 'horizontal');
                              const meta = getTargetMetaForOrient(rOrient);
                              const isMetaLpn = rLpn && meta.expectedLpn && (rLpn === meta.expectedLpn || isLpnCodeMatch(rLpn, meta.expectedLpn));
                              const isDirectLpn = rLpn && targetLpn && (rLpn === targetLpn || isLpnCodeMatch(rLpn, targetLpn));
                              const isPairedLpn = rLpn && pairedLpn && (rLpn === pairedLpn || isLpnCodeMatch(rLpn, pairedLpn));
                              const isLpnMatch = isMetaLpn || isDirectLpn || isPairedLpn;

                              const isMetaSku = rSku && meta.expectedSku && (rSku === meta.expectedSku || isSkuCodeMatch(rSku, meta.expectedSku));
                              const isDirectSku = rSku && targetSku && (rSku === targetSku || isSkuCodeMatch(rSku, targetSku));
                              const isPairedSku = rSku && pairedItem?.sku && (rSku === pairedItem.sku || isSkuCodeMatch(rSku, pairedItem.sku));
                              const isSkuMatch = isMetaSku || isDirectSku || isPairedSku;
                              const hasMatch = isLpnMatch || isSkuMatch;
                              const isMismatch = (rLpn && targetLpn && !isLpnMatch) || (rSku && targetSku && !isSkuMatch);
                              const fullTextSnippet = roi.full_text || roi.text_under_barcode || (roi.tokens ? roi.tokens.map(t => t.text).join(' ') : '');

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
                                    <span style={{ fontSize: '0.68rem', fontWeight: '800', color: isSel ? '#065F46' : '#374151', whiteSpace: 'nowrap' }}>Tem #{roi.label_id}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      {hasMatch && (
                                        <span style={{ fontSize: '0.55rem', fontWeight: '800', color: '#15803D', backgroundColor: '#DCFCE7', padding: '1px 4px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                                          {isPairedLpn ? `ĐÚNG (${pairedItem?.suffix_key})` : 'ĐÚNG'}
                                        </span>
                                      )}
                                      {isMismatch && (
                                        <span style={{ fontSize: '0.55rem', fontWeight: '700', color: '#DC2626', backgroundColor: '#FEE2E2', padding: '1px 4px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                                          Khác CSDL
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '2px', gap: '4px' }}>
                                    <div style={{ fontSize: '0.66rem', color: '#1F2937', fontWeight: '600', flex: 1, minWidth: 0 }}>
                                      {rLpn && <span style={{ color: isLpnMatch ? '#047857' : '#DC2626', display: 'block' }}>LPN: <strong>{rLpn}</strong></span>}
                                      {rSku && <span style={{ color: isSkuMatch ? '#047857' : '#DC2626', display: 'block' }}>SKU: <strong>{rSku}</strong></span>}
                                      {(() => {
                                        const cleanCode = extractCleanCodeUnderRoi(roi, rLpn ? 'lpn' : (rSku ? 'sku' : 'all'));
                                        if (cleanCode && cleanCode !== rLpn && cleanCode !== rSku) {
                                          return (
                                            <span style={{ fontSize: '0.58rem', color: '#4B5563', display: 'block', marginTop: '1px', wordBreak: 'break-all' }}>
                                              Chữ dưới QR: <strong style={{ fontFamily: 'monospace' }}>{cleanCode}</strong>
                                            </span>
                                          );
                                        }
                                        return null;
                                      })()}
                                      {!rLpn && !rSku && (
                                        <span style={{ color: '#9CA3AF', fontSize: '0.58rem', fontStyle: 'italic' }}>Không có mã QR/Barcode</span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: '0.56rem', color: '#9CA3AF', fontFamily: 'monospace', flexShrink: 0 }}>
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
                                  {aiResult?.detected_lpn || 'LPN'}
                                </span>
                                <span style={{ backgroundColor: '#FAF6F0', border: '1px solid #D6C0A9', padding: '2px 6px', borderRadius: '3px', fontSize: '0.64rem', fontWeight: 'bold' }}>
                                  {aiResult?.detected_sku || 'SKU'}
                                </span>
                              </>
                            )}
                            {Array.isArray(aiResult?.detected_barcodes) && aiResult.detected_barcodes.length > 0 && (
                              <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', padding: '2px 6px', borderRadius: '3px', fontSize: '0.62rem', fontWeight: 'bold' }}>
                                BC: {aiResult.detected_barcodes[0]?.data || aiResult.detected_barcodes[0]}
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

                <div
                  className="lpn-inspector-compare-grid"
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}
                >
                  {/* LPN Compare Card */}
                  {(() => {
                    const targetLpn = item?.lpn;
                    const pairedItem = inspectorAnalysis?.meta_info?.paired_item;
                    const pairedLpn = pairedItem?.lpn;
                    const containerItems = inspectorAnalysis?.meta_info?.container_items || [];

                    const isRoiLpnMatch = (code, roi) => {
                      if (!code) return { isMatch: false };
                      const rOrient = roi?.orientation || (roi?.rotation_deg === 90 || roi?.rotation_deg === 270 ? 'vertical' : 'horizontal');
                      const meta = getTargetMetaForOrient(rOrient);

                      if (meta.expectedLpn && (code === meta.expectedLpn || isLpnCodeMatch(code, meta.expectedLpn))) {
                        return {
                          isMatch: true,
                          matchType: meta.isSelf ? 'direct' : 'paired',
                          label: meta.isSelf ? 'ĐÚNG 100%' : `ĐÚNG (Khớp ${meta.label})`
                        };
                      }
                      const isSelfMatch = targetLpn && (code === targetLpn || isLpnCodeMatch(code));
                      if (isSelfMatch) {
                        return { isMatch: true, matchType: 'direct', label: 'ĐÚNG 100%' };
                      }
                      const isPairedMatch = pairedLpn && (code === pairedLpn || isLpnCodeMatch(code));
                      if (isPairedMatch) {
                        return { isMatch: true, matchType: 'paired', label: `ĐÚNG (Khớp ${pairedItem?.suffix_key || 'Pallet/Top'})` };
                      }
                      const foundInCont = containerItems.find(c => c.lpn && (c.lpn === code || isLpnCodeMatch(code)));
                      if (foundInCont) {
                        return { isMatch: false, matchType: 'container_mismatch', label: `❌ LỆCH MÃ (Thuộc ${foundInCont.suffix_key || 'kiện khác'}, nghi nhầm tem!)` };
                      }
                      return { isMatch: false, label: 'SAI (Khác CSDL)' };
                    };

                    const roiList = inspectorAnalysis?.roi_details || inspectorAnalysis?.images?.roi_details || [];
                    const lpnRois = roiList.filter(r => r.extracted_lpn || r.extracted?.lpn);

                    const lpnMatchedCount = lpnRois.filter(r => {
                      const code = r.extracted_lpn || r.extracted?.lpn;
                      return isRoiLpnMatch(code, r).isMatch;
                    }).length;
                    const lpnTotalCount = lpnRois.length;
                    const isAllLpnMatch = lpnTotalCount > 0 ? (lpnMatchedCount === lpnTotalCount) : Boolean(aiResult?.is_lpn_match || (targetLpn && isRoiLpnMatch(aiResult?.detected_lpn || inspectorAnalysis?.extracted?.lpn, { orientation: isPosVertical ? 'vertical' : 'horizontal' }).isMatch));
                    const lpnMatchRate = lpnTotalCount > 0 ? Math.round((lpnMatchedCount / lpnTotalCount) * 100) : (isAllLpnMatch ? 100 : 0);

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
                              {pairedItem && pairedLpn && (
                                <span style={{ fontSize: '0.65rem', color: '#047857', marginLeft: '6px', fontWeight: '600' }}>
                                  ({pairedItem.suffix_key}: {pairedLpn})
                                </span>
                              )}
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
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {lpnRois.map((roi) => {
                                  const code = roi.extracted_lpn || roi.extracted?.lpn;
                                  const matchInfo = isRoiLpnMatch(code, roi);
                                  const isMatch = matchInfo.isMatch;
                                  const isSelected = selectedRoiIndex === (roi.label_id - 1);
                                  const cleanTextUnderQr = extractCleanCodeUnderRoi(roi, 'lpn');
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
                                        flexDirection: 'column',
                                        gap: '2px',
                                        padding: '4px 6px',
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
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                                            {matchInfo.label || (isMatch ? 'ĐÚNG 100%' : 'SAI (Khác CSDL)')}
                                          </span>
                                          {diffDetail && (
                                            <span style={{ fontSize: '0.58rem', color: '#B91C1C', fontWeight: '600' }}>
                                              ({diffDetail})
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {/* Hiển thị chuẩn xác chữ dưới mã QR */}
                                      {cleanTextUnderQr && (
                                        <div style={{ fontSize: '0.58rem', color: '#4B5563', paddingLeft: '2px', lineHeight: '1.2' }}>
                                          Chữ dưới mã: <strong style={{ color: '#1F2937', fontFamily: 'monospace' }}>{cleanTextUnderQr}</strong>
                                        </div>
                                      )}
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
                    const targetSku = item?.sku;
                    const pairedSku = pairedItem?.sku;
                    const roiList = inspectorAnalysis?.roi_details || inspectorAnalysis?.images?.roi_details || [];
                    const skuRois = roiList.filter(r => r.extracted_sku || r.extracted?.sku);

                    const isRoiSkuMatch = (code, roi) => {
                      if (!code) return { isMatch: false };
                      const rOrient = roi?.orientation || (roi?.rotation_deg === 90 || roi?.rotation_deg === 270 ? 'vertical' : 'horizontal');
                      const meta = getTargetMetaForOrient(rOrient);

                      if (meta.expectedSku && (code === meta.expectedSku || isSkuCodeMatch(code, meta.expectedSku))) {
                        return {
                          isMatch: true,
                          matchType: meta.isSelf ? 'direct' : 'paired',
                          label: meta.isSelf ? 'ĐÚNG 100%' : `ĐÚNG (${meta.label})`
                        };
                      }
                      if (targetSku && (code === targetSku || isSkuCodeMatch(code, targetSku))) {
                        return { isMatch: true, matchType: 'direct', label: 'ĐÚNG 100%' };
                      }
                      if (pairedSku && (code === pairedSku || isSkuCodeMatch(code, pairedSku))) {
                        return { isMatch: true, matchType: 'paired', label: `ĐÚNG (${pairedItem?.suffix_key || 'Pallet đi cùng'})` };
                      }
                      const otherSibling = Array.isArray(itemsList) ? itemsList.find(it => isSkuCodeMatch(code, it.sku)) : null;
                      if (otherSibling) {
                        return { isMatch: false, matchType: 'container_mismatch', label: `❌ LỆCH SKU (Thuộc ${otherSibling.suffix_key}, nghi ngờ dán nhầm!)` };
                      }
                      return { isMatch: false, label: 'SAI KÝ TỰ' };
                    };

                    const skuMatchedCount = skuRois.filter(r => {
                      const rawCode = r.extracted_sku || r.extracted?.sku || '';
                      const code = typeof rawCode === 'string' ? rawCode.replace(/^[-:;,. #*!_/]+|[-:;,. #*!_/]+$/g, '') : rawCode;
                      return isRoiSkuMatch(code, r).isMatch;
                    }).length;
                    const skuTotalCount = skuRois.length;
                    const isAllSkuMatch = skuTotalCount > 0 ? (skuMatchedCount === skuTotalCount) : Boolean(aiResult?.is_sku_match || (targetSku && ((aiResult?.detected_sku || inspectorAnalysis?.extracted?.sku) === targetSku || isSkuCodeMatch(aiResult?.detected_sku || inspectorAnalysis?.extracted?.sku))));
                    const skuMatchRate = skuTotalCount > 0 ? Math.round((skuMatchedCount / skuTotalCount) * 100) : (isAllSkuMatch ? 100 : 0);
                    const effectivePredSku = skuMatchedCount > 0 ? targetSku : (aiResult?.detected_sku || inspectorAnalysis?.extracted?.sku);

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
                              {pairedItem && pairedSku && (
                                <span style={{ fontSize: '0.65rem', color: '#047857', marginLeft: '6px', fontWeight: '600' }}>
                                  ({pairedItem.suffix_key}: {pairedSku})
                                </span>
                              )}
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
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {skuRois.map((roi) => {
                                  const rawCode = roi.extracted_sku || roi.extracted?.sku || '';
                                  const code = typeof rawCode === 'string' ? rawCode.replace(/^[-:;,. #*!_/]+|[-:;,. #*!_/]+$/g, '') : rawCode;
                                  const matchInfo = isRoiSkuMatch(code, roi);
                                  const isMatch = matchInfo.isMatch;
                                  const isSelected = selectedRoiIndex === (roi.label_id - 1);
                                  const cleanTextUnderQr = extractCleanCodeUnderRoi(roi, 'sku');
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
                                        flexDirection: 'column',
                                        gap: '2px',
                                        padding: '4px 6px',
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
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                                            {isMatch ? (matchInfo.label || 'ĐÚNG 100%') : 'SAI (Khác CSDL)'}
                                          </span>
                                          {diffDetail && (
                                            <span style={{ fontSize: '0.58rem', color: '#B91C1C', fontWeight: '600' }}>
                                              ({diffDetail})
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {/* Hiển thị chuẩn xác chữ dưới mã QR */}
                                      {cleanTextUnderQr && (
                                        <div style={{ fontSize: '0.58rem', color: '#4B5563', paddingLeft: '2px', lineHeight: '1.2' }}>
                                          Chữ dưới mã: <strong style={{ color: '#1F2937', fontFamily: 'monospace' }}>{cleanTextUnderQr}</strong>
                                        </div>
                                      )}
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

      {/* Lightbox Preview */}
      {selectedImage && (
        <ImageLightboxModal imageData={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </>
  );
};

/** Dòng bảng sạch sẽ với viền và font theo phong cách chuẩn */
function CleanTableRow({ label, value, bold = false, isLast = false, rightBadge = null }) {
  const isReactElem = React.isValidElement(value);
  const valStr = isReactElem
    ? value
    : value !== null && value !== undefined && String(value).trim() !== ''
      ? String(value).trim()
      : '—';
  const hasValue = isReactElem || valStr !== '—';

  return (
    <tr
      style={{
        borderBottom: isLast ? 'none' : '1px solid #EADCC9'
      }}
    >
      <td
        style={{
          width: '38%',
          padding: '6px 10px',
          color: '#7B5233',
          fontWeight: '600',
          fontSize: '0.81rem',
          borderRight: '1px solid #EADCC9',
          verticalAlign: 'middle'
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: '6px 10px',
          color: hasValue ? '#2D1A12' : '#9CA3AF',
          fontWeight: bold ? '800' : '600',
          fontSize: '0.83rem',
          verticalAlign: 'middle'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <div style={{ minWidth: 0, wordBreak: 'break-all' }}>{valStr}</div>
          {rightBadge}
        </div>
      </td>
    </tr>
  );
}

export { ImageLightboxModal };
export default DetailModal;
