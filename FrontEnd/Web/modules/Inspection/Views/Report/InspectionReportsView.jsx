import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Calendar,
  ChevronRight,
  ChevronLeft,
  Eye,
  FileText,
  X,
  RotateCcw,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Download,
  FileSpreadsheet,
  Printer,
  MoreVertical,
  Trash2,
  Layers,
  Info,
  ClipboardList,
  Package,
  Camera,
  Loader2
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

import { useInspectionReports, getInspectionTypeLabel } from './hooks/useInspectionReports';
import SopStepsTable from './components/SopStepsTable';

import '@styles/components.css';

const InspectionReportsView = () => {
  const reports = useInspectionReports();
  const navigate = useNavigate();
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/reports');

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);
  const {
    activeActionMenu,
    activeTab,
    filterPending24h,
    adhesionInspections,
    aggData,
    applyDefaultBorders,
    b64,
    c,
    cleanPath,
    colIdx,
    conclusionCell,
    dailyEndDate,
    dailyInspections,
    dailyLimit,
    dailyPage,
    dailySearch,
    dailySort,
    dailyStartDate,
    date,
    dateText,
    defId,
    defectFreq,
    defectTypesMap,
    det,
    detailsHtml,
    entries,
    exportPoCode,
    fetchData,
    fetchImageBase64,
    filteredDailyList,
    filteredInboundList,
    filteredProcessList,
    filteredStageList,
    firstArticleInspections,
    formatDisplayDate,
    formatDisplayDateTime,
    formatExcelHeader,
    fullUrl,
    gIdx,
    generalImages,
    getDisplayInspector,
    getImageUrl,
    handleExportCurrentList,
    handleExportDetailedPO,
    handleExportQualitySummary,
    handleExportSingleExcel,
    handleExportSinglePDF,
    handleGlobalClick,
    handleImageError,
    handleResetFilters,
    i,
    imagesHtml,
    imagesList,
    imgPaths,
    inboundEndDate,
    inboundLimit,
    inboundPage,
    inboundSearch,
    inboundSort,
    inboundStartDate,
    inboundStatusFilter,
    inspectionTypes,
    isDaily,
    isExporting,
    isFilterBarOpen,
    isInput,
    isOpen,
    isPass,
    lightboxImage,
    loading,
    mVal,
    menuKey,
    moistVals,
    moistureInspections,
    pIdx,
    paginatedDailyList,
    paginatedInboundList,
    paginatedProcessList,
    paginatedStageList,
    parsed,
    parsedImages,
    passRate,
    photo,
    poInspections,
    pos,
    printWin,
    processInspections,
    r,
    rateCell,
    reader,
    remainingImages,
    renderActionDropdown,
    res,
    resCell,
    root,
    s,
    selectedDaily,
    selectedExportOption,
    selectedInbound,
    selectedInspection,
    filteredUnifiedList,
    paginatedUnifiedList,
    totalUnifiedPages,
    unifiedPage,
    setUnifiedPage,
    unifiedLimit,
    setUnifiedLimit,
    deleteTarget,
    setDeleteTarget,
    isDeleting,
    handleConfirmDelete,
    revertTarget,
    setRevertTarget,
    revertReason,
    setRevertReason,
    isReverting,
    handleConfirmRevert,
    setActiveActionMenu,
    setActiveTab,
    setDailyEndDate,
    setDailyInspections,
    setDailyLimit,
    setDailyPage,
    setDailySearch,
    setDailySort,
    setDailyStartDate,
    setDefectTypesMap,
    setExportPoCode,
    setInboundEndDate,
    setInboundLimit,
    setInboundPage,
    setInboundSearch,
    setInboundSort,
    setInboundStartDate,
    setInboundStatusFilter,
    setIsExporting,
    setIsFilterBarOpen,
    setLightboxImage,
    setLoading,
    setSelectedDaily,
    setSelectedExportOption,
    setSelectedInbound,
    setSelectedInspection,
    setShowExportModal,
    setStageEndDate,
    setStageInspections,
    setStageLimit,
    setStagePage,
    setStageSearch,
    setStageSort,
    setStageStartDate,
    setStageStatusFilter,
    stageStageFilter,
    setStageStageFilter,
    setStageTypeFilter,
    uniqueStages,
    showExportModal,
    sizeVal,
    sortedDefects,
    stCell,
    stageEndDate,
    stageInspections,
    stageLimit,
    stagePage,
    stageSearch,
    stageSort,
    stageStartDate,
    stageStatusFilter,
    stageTypeFilter,
    stats,
    styleTableHeaderRow,
    szVal,
    timeDiff,
    totalDailyPages,
    totalInboundPages,
    totalProcessPages,
    totalStagePages,
    triggerFileDownload,
    type,
    typeLabel,
    uniqueImages,
    uniquePoList,
    usedImages,
  } = reports;

  const renderActionBadge = (action, hasDefect = false) => {
    if (action === 'cach-ly') {
      return (
        <span className="status-badge" style={{ backgroundColor: '#FEF3C7', color: '#D97706', borderColor: '#FDE68A', padding: '3px 8px', fontWeight: '700' }}>
          Cách Ly
        </span>
      );
    }
    if (action === 'tra-ve') {
      return (
        <span className="status-badge" style={{ backgroundColor: '#FEF2F2', color: '#EF4444', borderColor: '#FCA5A5', padding: '3px 8px', fontWeight: '700' }}>
          Trả hàng
        </span>
      );
    }
    if (action === 'chap-nhan') {
      if (hasDefect) {
        return (
          <span className="status-badge" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE', padding: '3px 8px', fontWeight: '700' }}>
            Chấp nhận / Tự xử lý
          </span>
        );
      }
      return (
        <span className="status-badge" style={{ backgroundColor: '#ECFDF5', color: '#10B981', borderColor: '#A7F3D0', padding: '3px 8px', fontWeight: '700' }}>
          Chấp nhận
        </span>
      );
    }
    return <span style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>---</span>;
  };

  // ─── STATE & HELPERS CHO MODAL XEM CHI TIẾT 2 TAB (CHẾ ĐỘ READ-ONLY) ───
  const [selectedReportItem, setSelectedReportItem] = useState(null);
  const [modalTab, setModalTab] = useState('info'); // 'info' | 'details'
  const [lightboxImgUrl, setLightboxImgUrl] = useState(null);

  // Đồng bộ khi có trigger từ menu ngoài (selectedInspection, selectedInbound, selectedDaily)
  useEffect(() => {
    if (selectedInspection) {
      setSelectedReportItem({ ...selectedInspection, _reportType: 'stage' });
      setModalTab('info');
    } else if (selectedInbound) {
      setSelectedReportItem({ ...selectedInbound, _reportType: 'input' });
      setModalTab('info');
    } else if (selectedDaily) {
      setSelectedReportItem({ ...selectedDaily, _reportType: 'daily' });
      setModalTab('info');
    }
  }, [selectedInspection, selectedInbound, selectedDaily]);

  // Hồ sơ hiện tại đang được xem chi tiết
  const activeReportItem = useMemo(() => {
    return selectedReportItem || selectedInspection || selectedInbound || selectedDaily || null;
  }, [selectedReportItem, selectedInspection, selectedInbound, selectedDaily]);

  // Vị trí thứ tự của hồ sơ đang xem trong bảng hiện tại
  const currentReportIndex = useMemo(() => {
    if (!activeReportItem) return -1;
    return paginatedUnifiedList.findIndex(it => 
      String(it.id) === String(activeReportItem.id) &&
      (it.type === activeReportItem._reportType || it.type === activeReportItem.type || it.type === activeReportItem.inspection_type)
    );
  }, [activeReportItem, paginatedUnifiedList]);

  const goToPreviousReport = () => {
    if (currentReportIndex > 0) {
      const prevItem = paginatedUnifiedList[currentReportIndex - 1];
      setSelectedReportItem({
        ...prevItem.raw_item,
        _unifiedItem: prevItem,
        _reportType: prevItem.type,
        category: prevItem.category,
        batch_no: prevItem.batch_no,
        stage: prevItem.stage,
        inspector_name: prevItem.inspector_name,
        conclusion: prevItem.conclusion,
        action: prevItem.action,
        is_confirmed: prevItem.is_confirmed
      });
      setModalTab('info');
    }
  };

  const goToNextReport = () => {
    if (currentReportIndex >= 0 && currentReportIndex < paginatedUnifiedList.length - 1) {
      const nextItem = paginatedUnifiedList[currentReportIndex + 1];
      setSelectedReportItem({
        ...nextItem.raw_item,
        _unifiedItem: nextItem,
        _reportType: nextItem.type,
        category: nextItem.category,
        batch_no: nextItem.batch_no,
        stage: nextItem.stage,
        inspector_name: nextItem.inspector_name,
        conclusion: nextItem.conclusion,
        action: nextItem.action,
        is_confirmed: nextItem.is_confirmed
      });
      setModalTab('info');
    }
  };

  const handleCloseModal = () => {
    setSelectedReportItem(null);
    setSelectedInspection(null);
    setSelectedInbound(null);
    setSelectedDaily(null);
    setLightboxImgUrl(null);
  };

  const getSafeImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
      return path;
    }
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const baseApi = (api.defaults?.baseURL || '').replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
    const origin = baseApi || window.location.origin;
    return `${origin}${cleanPath}`;
  };

  const cleanCabinetTag = (tag) => {
    if (!tag) return '';
    return String(tag).replace(/^[A-Za-z0-9]+-\d+(?:-[A-Za-z0-9]+)?\s*\|\s*/i, '').trim();
  };

  // Trích xuất dữ liệu chi tiết của phiếu từ data_json
  const parsedReportData = useMemo(() => {
    if (!activeReportItem?.data_json) return {};
    try {
      return typeof activeReportItem.data_json === 'string'
        ? JSON.parse(activeReportItem.data_json)
        : activeReportItem.data_json;
    } catch (e) {
      return {};
    }
  }, [activeReportItem]);

  // Tổng hợp toàn bộ hình ảnh minh chứng của phiếu
  const reportImages = useMemo(() => {
    if (!activeReportItem) return [];
    const list = [];
    const add = (img) => {
      if (img && typeof img === 'string' && !list.includes(img)) {
        list.push(img);
      }
    };

    [activeReportItem.image_path_1, activeReportItem.image_path_2, activeReportItem.image_path_3].forEach(add);

    if (activeReportItem.images_json) {
      try {
        const p = typeof activeReportItem.images_json === 'string' ? JSON.parse(activeReportItem.images_json) : activeReportItem.images_json;
        if (Array.isArray(p)) p.forEach(add);
        else if (p && typeof p === 'object') {
          Object.values(p).forEach(v => {
            if (Array.isArray(v)) v.forEach(add);
            else add(v);
          });
        }
      } catch (e) {}
    }

    if (Array.isArray(parsedReportData?.images)) {
      parsedReportData.images.forEach(add);
    }

    if (parsedReportData?.steps) {
      Object.values(parsedReportData.steps).forEach(st => {
        if (st?.photo) add(st.photo);
        if (Array.isArray(st?.images)) st.images.forEach(add);
      });
    }

    if (Array.isArray(parsedReportData?.detailsList)) {
      parsedReportData.detailsList.forEach(det => {
        if (det?.image) add(det.image);
      });
    }

    if (Array.isArray(parsedReportData?.samples)) {
      parsedReportData.samples.forEach(s => {
        if (s?.moisture?.photo) add(s.moisture.photo);
        if (s?.size?.photo) add(s.size.photo);
      });
    }

    if (Array.isArray(parsedReportData?.checklist_results)) {
      parsedReportData.checklist_results.forEach(res => {
        if (Array.isArray(res?.images)) res.images.forEach(add);
        if (Array.isArray(res?.steps)) {
          res.steps.forEach(st => {
            if (Array.isArray(st?.images)) st.images.forEach(add);
          });
        }
      });
    }

    if (Array.isArray(activeReportItem.photos)) {
      activeReportItem.photos.forEach(add);
    }

    return list;
  }, [activeReportItem, parsedReportData]);

  const [fallbackReportSteps, setFallbackReportSteps] = useState([]);
  const [loadingReportSteps, setLoadingReportSteps] = useState(false);

  // Tự động nạp quy trình SOP theo công đoạn nếu báo cáo chưa lưu danh sách bước
  useEffect(() => {
    if (!activeReportItem) {
      setFallbackReportSteps([]);
      setLoadingReportSteps(false);
      return;
    }

    const rawSteps = parsedReportData?.steps || activeReportItem?.steps;
    if (rawSteps && ((Array.isArray(rawSteps) && rawSteps.length > 0) || (typeof rawSteps === 'object' && Object.keys(rawSteps).length > 0))) {
      setFallbackReportSteps([]);
      setLoadingReportSteps(false);
      return;
    }

    let isMounted = true;
    setLoadingReportSteps(true);

    const fetchFallbackGuide = async () => {
      try {
        const stageName = activeReportItem.stage || parsedReportData?.stage || '';
        const stageIdMap = {
          'nhập kho/đầu vào': 1,
          'nhap kho/dau vao': 1,
          'nhập kho': 1,
          'đầu vào': 1,
          'tạo phôi': 2,
          'tao phoi': 2,
          'định hình': 3,
          'dinh hinh': 3,
          'lắp ráp': 4,
          'lap rap': 4,
          'sơn': 5,
          'son': 5,
          'đóng gói': 6,
          'dong goi': 6,
          'lưu kho': 7,
          'luu kho': 7
        };
        const normalizedStage = (stageName || '').trim().toLowerCase();
        let targetStageId = activeReportItem.stage_id || parsedReportData?.stage_id || stageIdMap[normalizedStage] || null;

        if (!targetStageId && stageName) {
          try {
            const stagesRes = await api.get('/stages');
            const stagesList = Array.isArray(stagesRes?.data) ? stagesRes.data : (Array.isArray(stagesRes) ? stagesRes : []);
            const found = stagesList.find(s => s.name?.toLowerCase() === normalizedStage || s.code?.toLowerCase() === normalizedStage);
            if (found) targetStageId = found.id;
          } catch (err) {}
        }

        const mode = activeReportItem.inspection_type || activeReportItem._reportType || parsedReportData?.mode || 'first_sample';
        let guideData = null;

        if (targetStageId) {
          try {
            const res = await api.get(`/inspection-guides/mobile/${mode}?stage_id=${targetStageId}`);
            guideData = res?.data !== undefined ? res.data : res;
          } catch (e) {}
        }

        if (!guideData || !guideData.steps || guideData.steps.length === 0) {
          try {
            const allGuidesRes = await api.get('/inspection-guides?doc_type=HDKT&limit=50');
            const allGuides = Array.isArray(allGuidesRes?.data) ? allGuidesRes.data : (Array.isArray(allGuidesRes) ? allGuidesRes : (allGuidesRes?.items || []));
            const matchedGuide = allGuides.find(g => {
              const gName = (g.name || '').toLowerCase();
              return normalizedStage && (gName.includes(normalizedStage) || normalizedStage.includes(gName));
            });
            if (matchedGuide) {
              const singleRes = await api.get(`/inspection-guides/${matchedGuide.id}`);
              guideData = singleRes?.data !== undefined ? singleRes.data : singleRes;
            }
          } catch (e) {}
        }

        if (isMounted && guideData && Array.isArray(guideData.steps) && guideData.steps.length > 0) {
          const isPass = activeReportItem.conclusion === 'pass' || activeReportItem.result === 'Đạt' || activeReportItem.result === 'pass' || activeReportItem.result === 'ĐẠT';
          const formatted = guideData.steps.map((st, idx) => ({
            step_no: st.step_no || idx + 1,
            title: st.title || `Bước ${idx + 1}`,
            standard: st.standard || st.content || '',
            result: isPass ? 'pass' : (st.result || 'pass'),
            note: st.note || ''
          }));
          setFallbackReportSteps(formatted);
        } else if (isMounted) {
          setFallbackReportSteps([]);
        }
      } catch (err) {
        if (isMounted) setFallbackReportSteps([]);
      } finally {
        if (isMounted) setLoadingReportSteps(false);
      }
    };

    fetchFallbackGuide();

    return () => {
      isMounted = false;
    };
  }, [activeReportItem, parsedReportData]);

  // Danh sách các bước kiểm tra SOP (Hướng dẫn kiểm tra)
  const reportSteps = useMemo(() => {
    const rawSteps = parsedReportData?.steps || activeReportItem?.steps;
    if (rawSteps) {
      if (Array.isArray(rawSteps) && rawSteps.length > 0) return rawSteps;
      if (typeof rawSteps === 'object' && Object.keys(rawSteps).length > 0) {
        return Object.entries(rawSteps).map(([k, val], idx) => ({
          step_no: idx + 1,
          title: val.title || val.name || val.description || k,
          standard: val.standard || val.content || val.value || '',
          result: val.result || (val.status === 'FAIL' ? 'fail' : 'pass'),
          note: val.note || ''
        }));
      }
    }
    return fallbackReportSteps;
  }, [parsedReportData, activeReportItem, fallbackReportSteps]);

  // Phân rã danh sách chi tiết / phôi kiểm tra
  const reportPartsList = useMemo(() => {
    if (!activeReportItem) return [];

    let rawItems = [];
    if (Array.isArray(activeReportItem.details) && activeReportItem.details.length > 0) {
      rawItems = activeReportItem.details;
    } else if (Array.isArray(activeReportItem.parts_details) && activeReportItem.parts_details.length > 0) {
      rawItems = activeReportItem.parts_details;
    } else if (parsedReportData?.partsDetails && Array.isArray(parsedReportData.partsDetails) && parsedReportData.partsDetails.length > 0) {
      rawItems = parsedReportData.partsDetails;
    } else if (parsedReportData?.parts_details && Array.isArray(parsedReportData.parts_details) && parsedReportData.parts_details.length > 0) {
      rawItems = parsedReportData.parts_details;
    } else if (parsedReportData?.items && Array.isArray(parsedReportData.items) && parsedReportData.items.length > 0) {
      rawItems = parsedReportData.items;
    }

    if (rawItems.length > 0) {
      return rawItems.map((it, idx) => ({
        stt: String(idx + 1).padStart(2, '0'),
        name: it.part_name || it.name || it.product || 'Chi tiết',
        spec: it.specification || it.spec || activeReportItem.specification || 'Tiêu chuẩn',
        cabinet: cleanCabinetTag(it.cabinet || it.product_label || it.badge || it.product_name || it.product_sku || it.sku || ''),
        qty: it.plan_qty || it.qty || ''
      }));
    }

    const rawPartName = (activeReportItem.part_name || activeReportItem.product_sku || '').trim();
    const defaultCabinet = cleanCabinetTag(parsedReportData?.cabinet || parsedReportData?.product_label || parsedReportData?.badge || '');
    const defaultQty = activeReportItem.required_qty || parsedReportData?.requiredQty || activeReportItem.total_products || '';

    if (!rawPartName || rawPartName === 'N/A') {
      return [{
        stt: '01',
        name: activeReportItem.task_name || activeReportItem.stage || 'Chi tiết kiểm tra',
        spec: activeReportItem.specification || 'Tiêu chuẩn',
        cabinet: defaultCabinet,
        qty: defaultQty
      }];
    }

    const names = rawPartName
      .split(/[\n\r;]|,\s*(?=[A-ZÀ-Ỹa-z0-9])/)
      .map(s => s.trim())
      .filter(Boolean);

    const rawSpec = (activeReportItem.specification || '').trim();
    const specs = rawSpec.includes(',') 
      ? rawSpec.split(',').map(s => s.trim()).filter(Boolean) 
      : [];

    if (names.length === 0) {
      return [{
        stt: '01',
        name: rawPartName,
        spec: rawSpec || 'Tiêu chuẩn',
        cabinet: defaultCabinet,
        qty: defaultQty
      }];
    }

    return names.map((pName, idx) => {
      const pSpec = specs[idx] || (specs.length === 1 ? specs[0] : (rawSpec || 'Tiêu chuẩn'));
      return {
        stt: String(idx + 1).padStart(2, '0'),
        name: pName,
        spec: pSpec,
        cabinet: defaultCabinet,
        qty: defaultQty
      };
    });
  }, [activeReportItem, parsedReportData]);

  // Danh sách lỗi phát hiện
  const reportErrors = useMemo(() => {
    if (!activeReportItem) return [];
    let rawErrors = parsedReportData?.errors || parsedReportData?.defects || activeReportItem?.errors || activeReportItem?.defects;
    
    if (Array.isArray(rawErrors) && rawErrors.length > 0) {
      return rawErrors.map((e, idx) => ({
        stt: String(idx + 1).padStart(2, '0'),
        name: e.defect_name || e.name || e.label || `Lỗi #${idx + 1}`,
        code: e.defect_code || e.code || '',
        severity: e.severity || (e.isCTQ ? 'CTQ' : (e.isHeavy ? 'Nặng' : 'Tiêu chuẩn')),
        qty: Number(e.qty || e.quantity || 1),
        note: e.note || e.description || ''
      }));
    }

    const errorQty = Number(activeReportItem.error_qty || activeReportItem.total_defects || 0);
    if (errorQty > 0) {
      const noteText = activeReportItem.notes || activeReportItem.note || '';
      return [{
        stt: '01',
        name: noteText ? `Lỗi ghi nhận: ${noteText}` : 'Lỗi không đạt tiêu chuẩn kỹ thuật',
        code: 'DEF-GEN',
        severity: 'Cần lưu ý',
        qty: errorQty,
        note: noteText || 'Đã ghi nhận trong quá trình kiểm tra'
      }];
    }

    return [];
  }, [activeReportItem, parsedReportData]);

  // Phím tắt bàn phím khi đang mở modal xem báo cáo
  useEffect(() => {
    if (!activeReportItem) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (lightboxImgUrl) {
          setLightboxImgUrl(null);
        } else {
          handleCloseModal();
        }
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        setModalTab(prev => prev === 'info' ? 'details' : 'info');
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPreviousReport();
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextReport();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeReportItem, lightboxImgUrl, currentReportIndex, paginatedUnifiedList]);

  // Render badge phân loại
  const renderReportCategoryBadge = (item) => {
    if (!item) return null;
    const cat = item.category || getInspectionTypeLabel(item.inspection_type || item.type);
    const catLower = (cat || '').toLowerCase();
    
    let bg = '#FAF6F0';
    let color = '#7B5233';
    let border = '#EADCC9';

    if (catLower.includes('mẫu đầu') || catLower.includes('fqc')) {
      bg = '#EFF6FF'; color = '#1D4ED8'; border = '#BFDBFE';
    } else if (catLower.includes('đầu vào') || catLower.includes('iqc') || catLower.includes('nhập')) {
      bg = '#ECFDF5'; color = '#047857'; border = '#A7F3D0';
    } else if (catLower.includes('lại') || catLower.includes('tái')) {
      bg = '#FFFBEB'; color = '#B45309'; border = '#FDE68A';
    } else if (catLower.includes('quy trình')) {
      bg = '#F0F9FF'; color = '#0369A1'; border = '#BAE6FD';
    } else if (catLower.includes('độ ẩm')) {
      bg = '#FDF4FF'; color = '#A21CAF'; border = '#F5D0FE';
    } else if (catLower.includes('hàng ngày') || catLower.includes('daily')) {
      bg = '#F8FAFC'; color = '#475569'; border = '#CBD5E1';
    }

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: '6px',
        fontSize: '0.78rem',
        fontWeight: 700,
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap'
      }}>
        {cat}
      </span>
    );
  };

  // Render badge hành động xử lý (Read-only)
  const renderReportActionBadge = (item) => {
    if (!item) return <span style={{ color: '#9CA3AF', fontSize: '0.82rem' }}>—</span>;
    const isPass = item.conclusion === 'pass' || item.result === 'Đạt' || item.result === 'pass' || item.result === 'ĐẠT';
    const action = item.action || (isPass ? 'chap-nhan' : 'tra-ve');

    if (action === 'cach-ly') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '0.78rem',
          fontWeight: 700,
          backgroundColor: '#FEF3C7',
          color: '#D97706',
          border: '1px solid #FDE68A'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></span>
          <span>Cách ly</span>
        </span>
      );
    }
    if (action === 'tra-ve') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '0.78rem',
          fontWeight: 700,
          backgroundColor: '#FEF2F2',
          color: '#DC2626',
          border: '1px solid #FECACA'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }}></span>
          <span>Trả hàng</span>
        </span>
      );
    }
    if (action === 'chap-nhan') {
      if (!isPass) {
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 700,
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            border: '1px solid #BFDBFE'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3B82F6' }}></span>
            <span>Chấp nhận / Tự xử lý</span>
          </span>
        );
      }
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '0.78rem',
          fontWeight: 700,
          backgroundColor: '#ECFDF5',
          color: '#059669',
          border: '1px solid #A7F3D0'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}></span>
          <span>Chấp nhận</span>
        </span>
      );
    }
    return <span style={{ color: '#9CA3AF', fontSize: '0.82rem' }}>—</span>;
  };

  return (
    <div className="gold-layout">
      <style dangerouslySetInnerHTML={{ __html: `
        .inspection-tabs {
          display: flex;
          border-bottom: 2px solid #EADCC9;
          margin-bottom: 16px;
          gap: 8px;
        }
        .inspection-tab-item {
          padding: 10px 24px;
          font-weight: 700;
          font-size: 0.95rem;
          color: #7B5233;
          border: none;
          background: transparent;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }
        .inspection-tab-item.active {
          color: #2D1A12;
        }
        .inspection-tab-item.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 3px;
          background-color: #7B5233;
          border-radius: 3px;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .status-badge.pass {
          background-color: #ECFDF5;
          color: #10B981;
          border: 1px solid #A7F3D0;
        }
        .status-badge.fail {
          background-color: #FEF2F2;
          color: #EF4444;
          border: 1px solid #FCA5A5;
        }
        .grid-gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 8px;
          margin-top: 8px;
        }
        .gallery-thumb {
          width: 80px;
          height: 80px;
          border-radius: 8px;
          object-fit: cover;
          border: 1px solid #EADCC9;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .gallery-thumb:hover {
          transform: scale(1.05);
          border-color: #7B5233;
        }
        .detail-grid-info {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        @media (min-width: 768px) {
          .detail-grid-info {
            grid-template-columns: 1fr 1fr;
          }
        }
        .detail-row-item {
          display: flex;
          justify-content: space-between;
          padding-bottom: 8px;
          border-bottom: 1px dashed #EADCC9;
          font-size: 0.9rem;
        }
        .detail-row-item span:first-child {
          color: #8D6E63;
          font-weight: 600;
        }
        .detail-row-item span:last-child {
          color: #2D1A12;
          font-weight: 700;
        }
        .detail-sub-section {
          background: #FAF6F0;
          border: 1px solid #EADCC9;
          border-radius: 12px;
          padding: 16px;
          margin-top: 16px;
        }
        .detail-sub-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: #7B5233;
          margin: 0 0 12px 0;
          border-left: 3px solid #7B5233;
          padding-left: 8px;
        }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .modal-container {
          background-color: white;
          border-radius: 20px;
          width: 92%;
          max-width: 700px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          position: relative;
          padding: 24px;
        }
        .export-option-card {
          border: 1.5px solid #EADCC9;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s;
          background-color: #fff;
        }
        .export-option-card:hover {
          border-color: #7B5233;
          background-color: #FAF6F0;
        }
        .export-option-card.active {
          border-color: #7B5233;
          background-color: #FAF6F0;
          box-shadow: 0 0 0 3px rgba(123, 82, 51, 0.1);
        }
        .admin-table-scroll .data-table tbody tr {
          transform: none !important;
          animation: none !important;
          transition: background-color 0.15s ease !important;
        }
        .admin-table-scroll .data-table tbody tr:hover {
          transform: none !important;
          background-color: #FAF6F0 !important;
          box-shadow: 0 2px 8px rgba(123, 82, 51, 0.08) !important;
        }
        .kbd-shortcut {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 4px;
          line-height: 1.2;
          user-select: none;
          letter-spacing: 0.3px;
        }
        .kbd-shortcut-green {
          background-color: #A7F3D0;
          color: #065F46;
          border: 1px solid #6EE7B7;
        }
        .kbd-shortcut-red {
          background-color: #FECACA;
          color: #991B1B;
          border: 1px solid #FCA5A5;
        }
        .kbd-shortcut-gray {
          background-color: #F3F4F6;
          color: #4B5563;
          border: 1px solid #D1D5DB;
        }
        .kbd-shortcut-amber {
          background-color: #FDE68A;
          color: #92400E;
          border: 1px solid #FCD34D;
        }
        .modal-flank-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 860px;
          padding: 0 14px;
          box-sizing: border-box;
        }
        .modal-flank-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: #FAF6F0;
          border: 1.5px solid #EADCC9;
          color: #7B5233;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.16), 0 2px 6px rgba(0, 0, 0, 0.08);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          flex-shrink: 0;
          z-index: 1010;
        }
        .modal-flank-btn:hover:not(:disabled) {
          background-color: #FFFFFF;
          border-color: #7B5233;
          color: #5D3E26;
          transform: scale(1.12);
          box-shadow: 0 8px 24px rgba(123, 82, 51, 0.28);
        }
        .modal-flank-btn:active:not(:disabled) {
          transform: scale(0.94);
        }
        .modal-flank-btn:disabled {
          opacity: 0.28;
          cursor: not-allowed;
          box-shadow: none;
        }
        .modal-content-custom, .modal-content {
          background-color: white;
          border-radius: 16px;
          width: 92%;
          max-width: 740px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          position: relative;
        }
        @media (max-width: 880px) {
          .modal-flank-container {
            padding: 0 4px !important;
          }
          .modal-flank-btn {
            position: absolute !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            width: 40px !important;
            height: 40px !important;
            background-color: #FFFFFF !important;
          }
          .modal-flank-btn.prev {
            left: 8px !important;
          }
          .modal-flank-btn.next {
            right: 8px !important;
          }
        }
      `}} />

      {/* ── STICKY TOP ZONE ── */}
      <div className="sticky-top-zone">
        {/* TOOLBAR: Search & Filters */}
        <PageToolbar
          title={title}
          subtitle={subtitle}
          screenCode={screenCode}
          searchValue={stageSearch}
          onSearchChange={(val) => {
            setStageSearch(val);
            setUnifiedPage(1);
          }}
          searchPlaceholder="Tìm PO, sản phẩm, QC, phân loại..."
          showSort={true}
          sortOptions={[
            { value: 'date_desc', label: 'Ngày: Mới nhất' },
            { value: 'date_asc', label: 'Ngày: Cũ nhất' },
            { value: 'po_asc', label: 'Mã PO: A-Z' },
            { value: 'po_desc', label: 'Mã PO: Z-A' }
          ]}
          sortValue={stageSort}
          onSortChange={(val) => {
            setStageSort(val);
            setUnifiedPage(1);
          }}
          showFilter={true}
          isFilterOpen={isFilterBarOpen}
          onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
          activeFiltersCount={
            (stageTypeFilter !== 'all' ? 1 : 0) +
            (stageStageFilter !== 'all' ? 1 : 0) +
            (stageStatusFilter !== 'all' ? 1 : 0) +
            (stageStartDate ? 1 : 0) +
            (stageEndDate ? 1 : 0)
          }
          onExport={() => setShowExportModal(true)}
          hasWritePermission={true}
        />

        {/* INLINE EXPANDABLE FILTER BAR */}
        {isFilterBarOpen && (
          <div className="filter-inline-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end', backgroundColor: '#FFFDF9', border: '1px solid #EADCC9', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
            <div className="filter-field-group" style={{ minWidth: '160px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', color: '#7B5233', fontSize: '0.82rem', marginBottom: '4px', display: 'block' }}>Phân loại</label>
              <select
                value={stageTypeFilter}
                onChange={(e) => {
                  setStageTypeFilter(e.target.value);
                  setUnifiedPage(1);
                }}
                className="filter-dropdown-input"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #EADCC9', padding: '0 10px', backgroundColor: '#fff', color: '#2D1A12', fontSize: '0.88rem' }}
              >
                <option value="all">Tất cả</option>
                <option value="stage">Kiểm tra công đoạn</option>
                <option value="first_sample">Mẫu đầu tiên (FQC)</option>
                <option value="input">Đầu vào (IQC)</option>
                <option value="process">Kiểm tra quy trình</option>
                <option value="re_inspect">Kiểm tra lại</option>
                <option value="do-am">Đo độ ẩm</option>
                <option value="bam-dinh">Thử bám dính</option>
                <option value="sau-dong-goi">Sau đóng gói (OQC)</option>
                <option value="daily">Ghi nhận lỗi hàng ngày</option>
              </select>
            </div>

            <div className="filter-field-group" style={{ minWidth: '150px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', color: '#7B5233', fontSize: '0.82rem', marginBottom: '4px', display: 'block' }}>Công đoạn</label>
              <select
                value={stageStageFilter}
                onChange={(e) => {
                  setStageStageFilter(e.target.value);
                  setUnifiedPage(1);
                }}
                className="filter-dropdown-input"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #EADCC9', padding: '0 10px', backgroundColor: '#fff', color: '#2D1A12', fontSize: '0.88rem' }}
              >
                <option value="all">Tất cả công đoạn</option>
                {uniqueStages && uniqueStages.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            <div className="filter-field-group" style={{ minWidth: '130px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', color: '#7B5233', fontSize: '0.82rem', marginBottom: '4px', display: 'block' }}>Kết luận</label>
              <select
                value={stageStatusFilter}
                onChange={(e) => {
                  setStageStatusFilter(e.target.value);
                  setUnifiedPage(1);
                }}
                className="filter-dropdown-input"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #EADCC9', padding: '0 10px', backgroundColor: '#fff', color: '#2D1A12', fontSize: '0.88rem' }}
              >
                <option value="all">Tất cả</option>
                <option value="pass">Đạt (Pass)</option>
                <option value="fail">Không đạt (Fail)</option>
              </select>
            </div>

            <div className="filter-field-group" style={{ minWidth: '135px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', color: '#7B5233', fontSize: '0.82rem', marginBottom: '4px', display: 'block' }}>Từ ngày</label>
              <input 
                type="date"
                value={stageStartDate}
                onChange={(e) => {
                  setStageStartDate(e.target.value);
                  setUnifiedPage(1);
                }}
                className="filter-dropdown-input"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #EADCC9', padding: '0 10px', backgroundColor: '#fff', color: '#2D1A12', fontSize: '0.88rem' }}
              />
            </div>

            <div className="filter-field-group" style={{ minWidth: '135px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', color: '#7B5233', fontSize: '0.82rem', marginBottom: '4px', display: 'block' }}>Đến ngày</label>
              <input 
                type="date"
                value={stageEndDate}
                onChange={(e) => {
                  setStageEndDate(e.target.value);
                  setUnifiedPage(1);
                }}
                className="filter-dropdown-input"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #EADCC9', padding: '0 10px', backgroundColor: '#fff', color: '#2D1A12', fontSize: '0.88rem' }}
              />
            </div>

            <div className="filter-field-group" style={{ minWidth: '110px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', color: '#7B5233', fontSize: '0.82rem', marginBottom: '4px', display: 'block' }}>Hiển thị</label>
              <select
                value={unifiedLimit}
                onChange={(e) => {
                  setUnifiedLimit(parseInt(e.target.value));
                  setUnifiedPage(1);
                }}
                className="filter-dropdown-input"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #EADCC9', padding: '0 10px', backgroundColor: '#fff', color: '#2D1A12', fontSize: '0.88rem' }}
              >
                <option value={15}>15 dòng</option>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', marginLeft: 'auto' }}>
              <button 
                onClick={handleResetFilters}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  border: '1.5px solid #EADCC9',
                  backgroundColor: '#FAF6F0',
                  color: '#7B5233',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#7B5233';
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#7B5233';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FAF6F0';
                  e.currentTarget.style.color = '#7B5233';
                  e.currentTarget.style.borderColor = '#EADCC9';
                }}
                title="Xóa toàn bộ bộ lọc và đặt lại mặc định"
              >
                <RotateCcw size={14} /> Xóa lọc
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="admin-list-layout">
        {filterPending24h && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', marginBottom: '16px', color: '#EF4444', fontWeight: '600', fontSize: '0.9rem' }}>
            <span>⚠️ Đang hiển thị danh sách phiếu chưa xác nhận trong 24 giờ qua.</span>
            <button 
              onClick={() => navigate('/admin/reports')}
              style={{ backgroundColor: '#EF4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF4444'}
            >
              Hiển thị tất cả
            </button>
          </div>
        )}
        <div className="mgmt-table card admin-table-card">
          
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div className="spinner"></div>
                <span>Đang tải dữ liệu kiểm tra...</span>
              </div>
            </div>
          ) : paginatedUnifiedList.length === 0 ? (
            <div style={{ padding: '5rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <FileText size={48} opacity={0.3} style={{ color: '#8D6E63' }} />
                <span>Không tìm thấy phiếu kiểm tra nào phù hợp.</span>
              </div>
            </div>
          ) : (
            <>
              <div className="table-responsive desktop-only admin-table-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '90px', textAlign: 'center' }}>MÃ PHIẾU</th>
                      <th>Phân loại</th>
                      <th style={{ width: '150px' }}>Ngày kiểm tra</th>
                      <th>Mã PO</th>
                      <th>Công đoạn</th>
                      <th>Người kiểm QC</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>Xác nhận</th>
                      <th style={{ width: '140px', textAlign: 'center' }}>Kết quả</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Hành động</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUnifiedList.map((item, idx) => {
                      const isDaily = item.type === 'daily';
                      const isPass = item.conclusion === 'pass';
                      
                      const handleRowClick = () => {
                        setSelectedReportItem({
                          ...item.raw_item,
                          _unifiedItem: item,
                          _reportType: item.type,
                          category: item.category,
                          batch_no: item.batch_no,
                          stage: item.stage,
                          inspector_name: item.inspector_name,
                          conclusion: item.conclusion,
                          action: item.action,
                          is_confirmed: item.is_confirmed
                        });
                        setModalTab('info');
                      };

                      const hasDefect = (item.defect_rate > 0) || (!isDaily && !isPass);

                      return (
                        <tr key={`${item.type}-${item.id}`} onClick={handleRowClick} style={{ cursor: 'pointer' }}>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>#{item.id}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              backgroundColor: item.category.includes('Mẫu đầu') ? '#EFF6FF' :
                                               item.category.includes('Đầu vào') ? '#ECFDF5' :
                                               item.category.includes('lại') ? '#FFFBEB' :
                                               item.category.includes('quy trình') ? '#F0F9FF' :
                                               item.category.includes('độ ẩm') ? '#FDF4FF' :
                                               item.category.includes('lỗi hàng ngày') ? '#F8FAFC' : '#FAF6F0',
                              color: item.category.includes('Mẫu đầu') ? '#1D4ED8' :
                                     item.category.includes('Đầu vào') ? '#047857' :
                                     item.category.includes('lại') ? '#B45309' :
                                     item.category.includes('quy trình') ? '#0369A1' :
                                     item.category.includes('độ ẩm') ? '#A21CAF' :
                                     item.category.includes('lỗi hàng ngày') ? '#475569' : '#7B5233',
                              border: `1px solid ${
                                item.category.includes('Mẫu đầu') ? '#BFDBFE' :
                                item.category.includes('Đầu vào') ? '#A7F3D0' :
                                item.category.includes('lại') ? '#FDE68A' :
                                item.category.includes('quy trình') ? '#BAE6FD' :
                                item.category.includes('độ ẩm') ? '#F5D0FE' :
                                item.category.includes('lỗi hàng ngày') ? '#CBD5E1' : '#EADCC9'
                              }`
                            }}>
                              {item.category}
                            </span>
                          </td>
                          <td style={{ fontWeight: '600' }}>{formatDisplayDateTime(item.inspection_date)}</td>
                          <td style={{ color: '#7B5233', fontWeight: 'bold' }}>{item.batch_no || '---'}</td>
                          <td style={{ fontWeight: '700' }}>{item.stage || item.stage_name || item.product_sku || '---'}</td>
                          <td>{item.inspector_name || 'N/A'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`status-badge ${item.is_confirmed ? 'pass' : 'fail'}`} style={{ backgroundColor: item.is_confirmed ? '#ECFDF5' : '#FEF2F2', color: item.is_confirmed ? '#10B981' : '#EF4444', borderColor: item.is_confirmed ? '#A7F3D0' : '#FCA5A5' }}>
                              {item.is_confirmed ? (isDaily ? 'Đã hoàn thành' : 'Đã xác nhận') : 'Chưa'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {!hasDefect ? (
                              <span className="status-badge pass" style={{ padding: '3px 10px' }}>
                                Đạt
                              </span>
                            ) : (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                <span className="status-badge fail" style={{ padding: '3px 8px' }}>
                                  Không đạt
                                </span>
                                <span style={{ 
                                  fontSize: '0.72rem', 
                                  fontWeight: '700', 
                                  color: '#D97706', 
                                  backgroundColor: '#FEF3C7', 
                                  padding: '1px 6px', 
                                  borderRadius: '6px', 
                                  border: '1px solid #FDE68A',
                                  lineHeight: '1.2'
                                }}>
                                  {(item.defect_rate || 0).toFixed(2)}%
                                </span>
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {renderActionBadge(item.action, hasDefect)}
                          </td>
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            {renderActionDropdown(item.raw_item, item.type)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Card Grid */}
              <div className="mobile-only mgmt-cards-container" style={{ padding: '10px' }}>
                {paginatedUnifiedList.map((item, idx) => {
                  const isDaily = item.type === 'daily';
                  const isPass = item.conclusion === 'pass';
                  const hasDefect = (item.defect_rate > 0) || (!isDaily && !isPass);
                  
                  const handleRowClick = () => {
                    setSelectedReportItem({
                      ...item.raw_item,
                      _unifiedItem: item,
                      _reportType: item.type,
                      category: item.category,
                      batch_no: item.batch_no,
                      stage: item.stage,
                      inspector_name: item.inspector_name,
                      conclusion: item.conclusion,
                      action: item.action,
                      is_confirmed: item.is_confirmed
                    });
                    setModalTab('info');
                  };

                  return (
                    <div 
                      key={`${item.type}-${item.id}`} 
                      className="mgmt-card animate-card-entrance" 
                      style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #EADCC9', padding: '12px', marginBottom: '10px', cursor: 'pointer' }}
                      onClick={handleRowClick}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ fontWeight: 'bold', color: '#8D6E63' }}>Mã: #{item.id}</span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className={`status-badge ${item.is_confirmed ? 'pass' : 'fail'}`} style={{ backgroundColor: item.is_confirmed ? '#ECFDF5' : '#FEF2F2', color: item.is_confirmed ? '#10B981' : '#EF4444', borderColor: item.is_confirmed ? '#A7F3D0' : '#FCA5A5' }}>
                            {item.is_confirmed ? (isDaily ? 'HOÀN THÀNH' : 'ĐÃ XN') : 'CHƯA XN'}
                          </span>
                          <span className={`status-badge ${hasDefect ? 'fail' : 'pass'}`}>
                            {hasDefect ? `KHÔNG ĐẠT (${(item.defect_rate || 0).toFixed(2)}%)` : 'ĐẠT'}
                          </span>
                          {renderActionBadge(item.action, hasDefect)}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#8D6E63', fontWeight: 'bold', marginBottom: '4px' }}>
                        {item.category}
                      </div>
                      {item.batch_no && item.batch_no !== 'N/A' && item.batch_no !== '---' && (
                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#7B5233', marginBottom: '4px' }}>
                          PO: {item.batch_no}
                        </div>
                      )}
                      <div style={{ fontSize: '0.85rem', color: '#2D1A12', marginBottom: '4px' }}>
                        Công đoạn: <strong>{item.stage || item.stage_name || item.product_sku || 'N/A'}</strong>
                      </div>
                      {isDaily && (
                        <div style={{ fontSize: '0.85rem', color: '#EF4444', fontWeight: 'bold', marginBottom: '4px' }}>
                          {item.result_label}
                        </div>
                      )}
                      <div style={{ fontSize: '0.8rem', color: '#6B7280', display: 'flex', justifyContent: 'space-between' }}>
                        <span>QC: {item.inspector_name || 'N/A'}</span>
                        <span>{formatDisplayDate(item.inspection_date)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              <div className="admin-pagination-desktop desktop-only">
                <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                  Hiển thị <b>{filteredUnifiedList.length > 0 ? (unifiedPage - 1) * unifiedLimit + 1 : 0} - {Math.min(unifiedPage * unifiedLimit, filteredUnifiedList.length)}</b> trên <b>{filteredUnifiedList.length}</b> phiếu kiểm tra
                </div>
                {totalUnifiedPages > 1 && (
                  <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <button 
                      className="page-btn" 
                      onClick={() => setUnifiedPage(prev => Math.max(prev - 1, 1))} 
                      disabled={unifiedPage === 1}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {(() => {
                      const pages = [];
                      const delta = 2;
                      for (let i = 1; i <= totalUnifiedPages; i++) {
                        if (i === 1 || i === totalUnifiedPages || (i >= unifiedPage - delta && i <= unifiedPage + delta)) {
                          pages.push(i);
                        } else if (pages[pages.length - 1] !== '...') {
                          pages.push('...');
                        }
                      }
                      return pages.map((p, idx) => {
                        if (p === '...') {
                          return (
                            <span key={`ell-${idx}`} style={{ padding: '0 4px', color: '#8D6E63', fontWeight: '700' }}>
                              ...
                            </span>
                          );
                        }
                        return (
                          <button
                            key={p}
                            className={`page-btn ${unifiedPage === p ? 'active' : ''}`}
                            onClick={() => setUnifiedPage(p)}
                          >
                            {p}
                          </button>
                        );
                      });
                    })()}
                    <button 
                      className="page-btn" 
                      onClick={() => setUnifiedPage(prev => Math.min(prev + 1, totalUnifiedPages))} 
                      disabled={unifiedPage >= totalUnifiedPages}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>

      {/* Mobile Sticky Pagination */}
      {totalUnifiedPages > 1 && (
        <div className="pagination-mobile-sticky mobile-only">
          <button className="page-btn" onClick={() => setUnifiedPage(prev => Math.max(prev - 1, 1))} disabled={unifiedPage === 1}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#7B5233' }}>Trang {unifiedPage} / {totalUnifiedPages || 1}</span>
          <button className="page-btn" onClick={() => setUnifiedPage(prev => Math.min(prev + 1, totalUnifiedPages))} disabled={unifiedPage >= totalUnifiedPages}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* EXPORT OPTIONS MODAL */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <button 
              onClick={() => setShowExportModal(false)} 
              style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: '#F1F5F9', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#7B5233', margin: '0 0 20px 0' }}>Lựa chọn xuất báo cáo Excel</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              
              {/* Option 1 */}
              <div 
                className={`export-option-card ${selectedExportOption === 'current' ? 'active' : ''}`}
                onClick={() => setSelectedExportOption('current')}
              >
                <div style={{ marginTop: '2px' }}>
                  <input type="radio" checked={selectedExportOption === 'current'} readOnly style={{ accentColor: '#7B5233' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.9rem' }}>Xuất danh sách đang hiển thị</span>
                  <span style={{ fontSize: '0.78rem', color: '#8D6E63' }}>
                    Xuất các dòng hiện tại của danh sách theo các bộ lọc đang chọn ({filteredUnifiedList.length} dòng).
                  </span>
                </div>
              </div>

              {/* Option 2 */}
              <div 
                className={`export-option-card ${selectedExportOption === 'po' ? 'active' : ''}`}
                onClick={() => setSelectedExportOption('po')}
              >
                <div style={{ marginTop: '2px' }}>
                  <input type="radio" checked={selectedExportOption === 'po'} readOnly style={{ accentColor: '#7B5233' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                  <span style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.9rem' }}>Xuất chi tiết theo mã PO / Lệnh SX</span>
                  <span style={{ fontSize: '0.78rem', color: '#8D6E63', marginBottom: '6px' }}>
                    Kết xuất tệp gồm nhiều Sheet chi tiết (Bám dính, Độ ẩm, Quy trình...) của một PO xác định.
                  </span>
                  {selectedExportOption === 'po' && (
                    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '4px' }}>
                      <select 
                        value={exportPoCode} 
                        onChange={(e) => setExportPoCode(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #EADCC9',
                          backgroundColor: '#FAF6F0',
                          color: '#2D1A12',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          outline: 'none'
                        }}
                      >
                        {uniquePoList.map(po => (
                          <option key={po} value={po}>{po}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Option 3 */}
              <div 
                className={`export-option-card ${selectedExportOption === 'summary' ? 'active' : ''}`}
                onClick={() => setSelectedExportOption('summary')}
              >
                <div style={{ marginTop: '2px' }}>
                  <input type="radio" checked={selectedExportOption === 'summary'} readOnly style={{ accentColor: '#7B5233' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.9rem' }}>Báo cáo tổng hợp chất lượng theo thời gian</span>
                  <span style={{ fontSize: '0.78rem', color: '#8D6E63' }}>
                    Tổng hợp tỉ lệ đạt/lỗi của từng công đoạn và thống kê xếp hạng 15 lỗi xảy ra nhiều nhất dựa trên khoảng thời gian lọc hiện tại.
                  </span>
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => {
                  if (selectedExportOption === 'current') handleExportCurrentList();
                  else if (selectedExportOption === 'po') handleExportDetailedPO();
                  else if (selectedExportOption === 'summary') handleExportQualitySummary();
                }}
                disabled={isExporting}
                style={{
                  flex: 1,
                  backgroundColor: '#7B5233',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  opacity: isExporting ? 0.7 : 1
                }}
              >
                <Download size={16} /> {isExporting ? 'Đang xuất file...' : 'Tải xuống Báo cáo'}
              </button>
              <button 
                onClick={() => setShowExportModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#fff',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '10px',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

         {/* ── UNIFIED READ-ONLY INSPECTION DETAIL MODAL (2 TABS) ── */}
      {activeReportItem && (
        <div 
          className="modal-overlay"
          onClick={handleCloseModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(3px)',
            zIndex: 2500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box'
          }}
        >
          <div 
            className="modal-flank-container"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Flank navigation Left */}
            <button
              type="button"
              className="modal-flank-btn prev"
              disabled={currentReportIndex <= 0}
              onClick={goToPreviousReport}
              title="Hồ sơ trước (Phím mũi tên ←)"
              aria-label="Hồ sơ trước"
              style={{ marginRight: '14px', flexShrink: 0 }}
            >
              <ChevronLeft size={26} />
            </button>

            {/* Modal Content Dialog */}
            <div
              className="modal-content"
              style={{
                flex: 1,
                maxWidth: '740px',
                maxHeight: '90vh',
                margin: 0,
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
            {/* MODAL HEADER */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 22px',
              backgroundColor: '#FAF6F0',
              borderBottom: '1.5px solid #EADCC9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#7B5233',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 5px rgba(123, 82, 51, 0.25)',
                  flexShrink: 0
                }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#7B5233', fontSize: '1.18rem', fontWeight: 800, letterSpacing: '-0.2px' }}>
                    Chi tiết phiếu kiểm tra
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: 600, marginTop: '2px' }}>
                    Mã phiếu: <strong style={{ color: '#2D1A12' }}>#{activeReportItem.batch_no || activeReportItem.ticket_code || activeReportItem.code || activeReportItem.id}</strong>
                  </div>
                </div>
              </div>

              {/* Header Right: Counter pill + Result Badge + Close Button (Clean & Không bị trùng lặp) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Counter Pill */}
                {paginatedUnifiedList.length > 0 && currentReportIndex >= 0 && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #EADCC9',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: '#7B5233',
                      letterSpacing: '0.2px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                    title={`Đang xem phiếu ${currentReportIndex + 1} trên tổng số ${paginatedUnifiedList.length} phiếu`}
                  >
                    {currentReportIndex + 1} / {paginatedUnifiedList.length}
                  </div>
                )}

                {/* Read-Only Result Badge */}
                {(() => {
                  const isPass = activeReportItem.conclusion === 'pass' || 
                                 activeReportItem.result === 'Đạt' || 
                                 activeReportItem.result === 'pass' || 
                                 activeReportItem.result === 'ĐẠT';
                  return isPass ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      backgroundColor: '#ECFDF5',
                      color: '#059669',
                      border: '1.5px solid #A7F3D0',
                      boxShadow: '0 1px 2px rgba(16, 185, 129, 0.15)'
                    }}>
                      <CheckCircle2 size={15} /> ĐẠT
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      backgroundColor: '#FEF2F2',
                      color: '#DC2626',
                      border: '1.5px solid #FECACA',
                      boxShadow: '0 1px 2px rgba(239, 68, 68, 0.15)'
                    }}>
                      <AlertTriangle size={15} /> KHÔNG ĐẠT
                    </span>
                  );
                })()}

                {/* Close Button */}
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1.5px solid #EADCC9',
                    backgroundColor: '#FFFFFF',
                    color: '#8D6E63',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FEE2E2';
                    e.currentTarget.style.color = '#DC2626';
                    e.currentTarget.style.borderColor = '#FCA5A5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.color = '#8D6E63';
                    e.currentTarget.style.borderColor = '#EADCC9';
                  }}
                  title="Đóng (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1.5px solid #EADCC9',
              backgroundColor: '#FAF6F0',
              padding: '0 22px'
            }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setModalTab('info')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '11px 18px',
                    border: 'none',
                    borderBottom: modalTab === 'info' ? '3px solid #7B5233' : '3px solid transparent',
                    backgroundColor: 'transparent',
                    color: modalTab === 'info' ? '#7B5233' : '#8D6E63',
                    fontWeight: modalTab === 'info' ? 800 : 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Info size={16} />
                  <span>Thông tin</span>
                  {reportImages.length > 0 && (
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '1px 7px',
                      borderRadius: '10px',
                      backgroundColor: modalTab === 'info' ? '#EADCC9' : '#F3EBE1',
                      color: '#7B5233',
                      fontWeight: 700
                    }}>
                      {reportImages.length} ảnh
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setModalTab('details')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '11px 18px',
                    border: 'none',
                    borderBottom: modalTab === 'details' ? '3px solid #7B5233' : '3px solid transparent',
                    backgroundColor: 'transparent',
                    color: modalTab === 'details' ? '#7B5233' : '#8D6E63',
                    fontWeight: modalTab === 'details' ? 800 : 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Layers size={16} />
                  <span>Chi tiết</span>
                  {reportPartsList.length > 0 && (
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '1px 7px',
                      borderRadius: '10px',
                      backgroundColor: modalTab === 'details' ? '#7B5233' : '#EADCC9',
                      color: modalTab === 'details' ? '#FFFFFF' : '#7B5233',
                      fontWeight: 700
                    }}>
                      {reportPartsList.length}
                    </span>
                  )}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#8D6E63', fontWeight: 600 }}>
                <span>Phím tắt:</span>
                <span className="kbd-shortcut-pill">Tab</span>
                <span>đổi tab</span>
                <span style={{ margin: '0 2px' }}>•</span>
                <span className="kbd-shortcut-pill">←</span>
                <span className="kbd-shortcut-pill">→</span>
                <span>đổi phiếu</span>
              </div>
            </div>

            {/* MODAL BODY */}
            <div style={{ padding: '20px 22px', maxHeight: 'calc(85vh - 140px)', overflowY: 'auto' }}>
              {modalTab === 'info' ? (
                <>
                  {/* CARD THÔNG TIN TỔNG QUAN (3 DÒNG x 3 CỘT) */}
                  <div style={{
                    backgroundColor: '#FCFBF9',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    marginBottom: '16px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px 16px',
                    fontSize: '0.88rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        MÃ LÔ / PO
                      </span>
                      <strong style={{ color: '#7B5233', fontSize: '0.92rem' }}>
                        {activeReportItem.batch_no || activeReportItem.po_code || activeReportItem.production_order_code || '---'}
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        LOẠI KIỂM TRA
                      </span>
                      <div>{renderReportCategoryBadge(activeReportItem)}</div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        NGƯỜI KIỂM TRA QC
                      </span>
                      <strong style={{ color: '#2D1A12' }}>
                        {getDisplayInspector(activeReportItem) || activeReportItem.inspector_name || 'QC Inspector'}
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        NGÀY GHI NHẬN
                      </span>
                      <span style={{ color: '#2D1A12', fontWeight: 600 }}>
                        {formatDisplayDateTime(activeReportItem.inspection_date || activeReportItem.created_at)}
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        TRẠNG THÁI XÁC NHẬN
                      </span>
                      <div>
                        {activeReportItem.is_confirmed || activeReportItem.status === 'confirmed' || activeReportItem.status === 'Đã xác nhận' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            backgroundColor: '#ECFDF5',
                            color: '#059669',
                            border: '1px solid #A7F3D0'
                          }}>
                            <CheckCircle2 size={13} /> Đã xác nhận
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            backgroundColor: '#F3F4F6',
                            color: '#4B5563',
                            border: '1px solid #E5E7EB'
                          }}>
                            {activeReportItem.status || 'Đã hoàn thành'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        HÀNH ĐỘNG XỬ LÝ
                      </span>
                      <div>{renderReportActionBadge(activeReportItem)}</div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        SL CẦN KIỂM (LÔ)
                      </span>
                      <strong style={{ color: '#059669', fontSize: '0.92rem' }}>
                        {Number(activeReportItem.required_qty || parsedReportData?.requiredQty || activeReportItem.total_products || 0).toLocaleString()}
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        {activeReportItem.sample_qty ? 'SL MẪU KIỂM (AQL)' : 'SL ĐẠT'}
                      </span>
                      <strong style={{ color: '#1D4ED8', fontSize: '0.92rem' }}>
                        {Number(
                          activeReportItem.sample_qty ||
                          (Number(activeReportItem.passed_qty) > 0 ? activeReportItem.passed_qty : null) ||
                          activeReportItem.total_passed_qty ||
                          (activeReportItem.required_qty ? Math.max(Number(activeReportItem.required_qty) - Number(activeReportItem.error_qty || 0), 0) : 0)
                        ).toLocaleString()}
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.74rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        SỐ LỖI PHÁT HIỆN
                      </span>
                      <strong style={{
                        color: Number(activeReportItem.error_qty || activeReportItem.total_defects || 0) > 0 ? '#DC2626' : '#059669',
                        fontSize: '0.92rem'
                      }}>
                        {Number(activeReportItem.error_qty || activeReportItem.total_defects || 0).toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  {/* THÔNG TIN XỬ LÝ (READ-ONLY) */}
                  <div style={{ marginBottom: '16px', fontSize: '0.88rem' }}>
                    <div style={{
                      fontSize: '0.76rem',
                      color: '#7B5233',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      marginBottom: '6px'
                    }}>
                      Thông tin xử lý / Biện pháp khắc phục
                    </div>
                    <div style={{
                      background: '#FFFFFF',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #EADCC9',
                      color: '#2D1A12',
                      fontSize: '0.86rem',
                      lineHeight: '1.45'
                    }}>
                      {(() => {
                        const customInfo = activeReportItem.handling_info || parsedReportData?.handling_info || activeReportItem.action_note;
                        if (customInfo && customInfo.trim()) return customInfo;

                        const action = activeReportItem.action || activeReportItem.handling_action;
                        const isFail = activeReportItem.conclusion === 'fail' || activeReportItem.result === 'Không đạt' || activeReportItem.result === 'fail';

                        if (action === 'tra-ve' || (isFail && action !== 'cach-ly')) {
                          return 'Lô hàng không đạt tiêu chuẩn kỹ thuật: Yêu cầu trả hàng / xử lý lại hoặc loại bỏ theo quy định QC.';
                        }
                        if (action === 'cach-ly') {
                          return 'Lô hàng phát hiện bất thường: Cách ly và lưu kho riêng chờ thẩm định chuyên sâu từ ban chất lượng.';
                        }
                        return 'Sản phẩm đạt yêu cầu kiểm tra: Chấp nhận nhập kho và lưu trữ hồ sơ theo quy trình chuẩn.';
                      })()}
                    </div>
                  </div>

                  {/* GHI CHÚ (READ-ONLY) */}
                  <div style={{ marginBottom: '16px', fontSize: '0.88rem' }}>
                    <div style={{ fontSize: '0.76rem', color: '#8D6E63', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                      Ghi chú kiểm tra
                    </div>
                    <div style={{
                      background: '#FAF6F0',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #EADCC9',
                      color: (activeReportItem.notes || activeReportItem.note || parsedReportData?.notes || parsedReportData?.note) ? '#2D1A12' : '#9CA3AF',
                      fontStyle: (activeReportItem.notes || activeReportItem.note || parsedReportData?.notes || parsedReportData?.note) ? 'normal' : 'italic',
                      lineHeight: 1.4,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {activeReportItem.notes || activeReportItem.note || parsedReportData?.notes || parsedReportData?.note || 'Chưa ghi nhận thêm ghi chú cho phiếu này.'}
                    </div>
                  </div>

                  {/* HÌNH ẢNH MINH CHỨNG */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{
                      fontSize: '0.76rem',
                      color: '#7B5233',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Camera size={14} />
                      <span>Hình ảnh minh chứng ({reportImages.length})</span>
                    </div>
                    {reportImages.length > 0 ? (
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {reportImages.map((img, idx) => {
                          const imgUrl = getSafeImageUrl(img);
                          return (
                            <div
                              key={idx}
                              style={{
                                position: 'relative',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1.5px solid #EADCC9',
                                backgroundColor: '#FAF6F0',
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                transition: 'transform 0.15s, box-shadow 0.15s'
                              }}
                              onClick={() => setLightboxImgUrl(img)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.04)';
                                e.currentTarget.style.boxShadow = '0 4px 10px rgba(123,82,51,0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                              }}
                              title="Nhấp để xem ảnh lớn"
                            >
                              <img
                                src={imgUrl}
                                alt={`Minh chứng ${idx + 1}`}
                                onError={handleImageError}
                                style={{ width: '92px', height: '92px', objectFit: 'cover', display: 'block' }}
                              />
                              <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                backgroundColor: 'rgba(45, 26, 18, 0.65)',
                                color: '#FFFFFF',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                textAlign: 'center',
                                padding: '2px 0'
                              }}>
                                Ảnh {idx + 1}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{
                        padding: '12px 14px',
                        backgroundColor: '#FAF6F0',
                        borderRadius: '8px',
                        border: '1px dashed #EADCC9',
                        color: '#9CA3AF',
                        fontSize: '0.82rem',
                        fontStyle: 'italic'
                      }}>
                        Chưa đính kèm hình ảnh minh chứng cho phiếu này.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* TAB CHI TIẾT */}
                  {/* BẢNG DANH SÁCH CHI TIẾT / PHÔI KIỂM TRA */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      fontSize: '0.82rem',
                      color: '#7B5233',
                      fontWeight: 800,
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px'
                    }}>
                      <Package size={15} color="#7B5233" />
                      <span>Danh sách chi tiết / phôi kiểm tra ({reportPartsList.length})</span>
                    </div>

                    <div style={{
                      border: '1.5px solid #EADCC9',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      backgroundColor: '#ffffff',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1.5px solid #EADCC9' }}>
                            <th style={{ padding: '8px 10px', textAlign: 'center', color: '#7B5233', fontWeight: 800, fontSize: '0.76rem', width: '46px' }}>STT</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#7B5233', fontWeight: 800, fontSize: '0.76rem', minWidth: '130px' }}>TÊN CHI TIẾT / PHÔI</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#7B5233', fontWeight: 800, fontSize: '0.76rem', width: '140px' }}>QUY CÁCH / THÔNG SỐ</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', color: '#7B5233', fontWeight: 800, fontSize: '0.76rem', minWidth: '180px' }}>TÊN TỦ (SKU)</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', color: '#7B5233', fontWeight: 800, fontSize: '0.76rem', width: '90px' }}>SL KẾ HOẠCH</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportPartsList.map((p, idx) => (
                            <tr 
                              key={idx} 
                              style={{ 
                                borderBottom: idx < reportPartsList.length - 1 ? '1px solid #F3EBE1' : 'none',
                                transition: 'background-color 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FCF9F6'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                            >
                              <td style={{ padding: '9px 10px', color: '#8D6E63', fontWeight: 700, textAlign: 'center', verticalAlign: 'middle' }}>
                                {p.stt}
                              </td>
                              <td style={{ padding: '9px 12px', color: '#2D1A12', fontWeight: 700, verticalAlign: 'middle', lineHeight: 1.4 }}>
                                {p.name}
                              </td>
                              <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                                <span style={{
                                  display: 'inline-block',
                                  backgroundColor: '#FAF6F0',
                                  color: '#7B5233',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #EADCC9',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap'
                                }}>
                                  {p.spec}
                                </span>
                              </td>
                              <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                                {p.cabinet ? (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    fontSize: '0.76rem',
                                    padding: '2px 8px',
                                    borderRadius: '5px',
                                    backgroundColor: '#EFF6FF',
                                    color: '#1D4ED8',
                                    fontWeight: 600,
                                    border: '1px solid #BFDBFE',
                                    whiteSpace: 'nowrap'
                                  }} title={p.cabinet}>
                                    {p.cabinet}
                                  </span>
                                ) : (
                                  <span style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '9px 10px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, color: '#4B5563' }}>
                                {p.qty ? (
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    backgroundColor: '#F3F4F6',
                                    borderRadius: '6px',
                                    fontSize: '0.78rem',
                                    color: '#374151'
                                  }}>
                                    {Number(p.qty).toLocaleString()}
                                  </span>
                                ) : (
                                  <span style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* HƯỚNG DẪN KIỂM TRA (CÁC BƯỚC KIỂM TRA SOP) */}
                  <SopStepsTable
                    steps={reportSteps}
                    loading={loadingReportSteps}
                  />

                  {/* DANH SÁCH LỖI PHÁT HIỆN */}
                  {reportErrors.length > 0 ? (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{
                        fontSize: '0.82rem',
                        color: '#991B1B',
                        fontWeight: 800,
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          backgroundColor: '#FEE2E2',
                          border: '1px solid #FECDD3',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                        }}>
                          <AlertTriangle size={14} color="#DC2626" />
                        </div>
                        <span>Danh sách lỗi phát hiện</span>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: '#FEE2E2',
                          color: '#B91C1C',
                          border: '1px solid #FCA5A5'
                        }}>
                          {reportErrors.length} lỗi
                        </span>
                      </div>
                      <div className="sop-standard-scroll" style={{
                        border: '1px solid #FECDD3',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        backgroundColor: '#FFFFFF',
                        maxHeight: '260px',
                        overflowY: 'auto',
                        boxShadow: '0 2px 8px -2px rgba(220,38,38,0.06)'
                      }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#FFF5F5', borderBottom: '1.5px solid #FECDD3' }}>
                              <th style={{ padding: '10px 8px', textAlign: 'center', color: '#991B1B', fontWeight: 800, fontSize: '0.74rem', width: '56px', letterSpacing: '0.4px' }}>STT</th>
                              <th style={{ padding: '10px 14px', textAlign: 'left', color: '#991B1B', fontWeight: 800, fontSize: '0.74rem', letterSpacing: '0.4px' }}>TÊN LỖI GHI NHẬN</th>
                              <th style={{ padding: '10px 12px', textAlign: 'center', color: '#991B1B', fontWeight: 800, fontSize: '0.74rem', width: '115px', letterSpacing: '0.4px' }}>SL LỖI</th>
                              <th style={{ padding: '10px 14px', textAlign: 'left', color: '#991B1B', fontWeight: 800, fontSize: '0.74rem', letterSpacing: '0.4px' }}>GHI CHÚ CHI TIẾT</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportErrors.map((err, idx) => (
                              <tr 
                                key={idx} 
                                style={{ 
                                  borderBottom: idx < reportErrors.length - 1 ? '1px solid #FEE2E2' : 'none',
                                  backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FFFBFB',
                                  transition: 'background-color 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEE2E2'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#FFFBFB'}
                              >
                                <td style={{ padding: '9px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    backgroundColor: '#FEE2E2',
                                    color: '#DC2626',
                                    fontWeight: 800,
                                    fontSize: '0.75rem',
                                    border: '1px solid #FECDD3'
                                  }}>
                                    {err.stt || String(idx + 1).padStart(2, '0')}
                                  </span>
                                </td>
                                <td style={{ padding: '9px 14px', color: '#1E293B', fontWeight: 700, verticalAlign: 'middle' }}>
                                  {err.name}
                                </td>
                                <td style={{ padding: '9px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '3px 10px',
                                    borderRadius: '9999px',
                                    backgroundColor: '#FEE2E2',
                                    color: '#DC2626',
                                    fontWeight: 800,
                                    fontSize: '0.78rem',
                                    border: '1px solid #FCA5A5'
                                  }}>
                                    {err.qty}
                                  </span>
                                </td>
                                <td style={{ padding: '9px 14px', color: '#64748B', fontSize: '0.82rem', verticalAlign: 'middle' }}>
                                  {err.note || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      marginTop: '16px',
                      padding: '14px 16px',
                      backgroundColor: '#ECFDF5',
                      borderRadius: '10px',
                      border: '1.5px solid #A7F3D0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      color: '#065F46'
                    }}>
                      <CheckCircle2 size={20} color="#10B981" />
                      <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                        Không ghi nhận lỗi nào trong quá trình kiểm tra. Sản phẩm / lô hàng đạt chuẩn kỹ thuật.
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* MODAL FOOTER (READ-ONLY) */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              padding: '14px 22px',
              backgroundColor: '#FAF6F0',
              borderTop: '1.5px solid #EADCC9'
            }}>
              {/* Quick Exports + Close button */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    const t = activeReportItem._reportType === 'daily' || activeReportItem.type === 'daily'
                      ? 'daily'
                      : (activeReportItem._reportType === 'input' || activeReportItem.type === 'input' || activeReportItem.inspection_type === 'input'
                          ? 'input'
                          : 'stage');
                    handleExportSingleExcel(activeReportItem, t);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #A7F3D0',
                    backgroundColor: '#ECFDF5',
                    color: '#047857',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Xuất phiếu này ra file Excel"
                >
                  <FileSpreadsheet size={15} />
                  <span>Xuất Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const t = activeReportItem._reportType === 'daily' || activeReportItem.type === 'daily'
                      ? 'daily'
                      : (activeReportItem._reportType === 'input' || activeReportItem.type === 'input' || activeReportItem.inspection_type === 'input'
                          ? 'input'
                          : 'stage');
                    handleExportSinglePDF(activeReportItem, t);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #BAE6FD',
                    backgroundColor: '#F0F9FF',
                    color: '#0369A1',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="In hoặc lưu phiếu kiểm tra thành file PDF"
                >
                  <Printer size={15} />
                  <span>In / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>Đóng</span>
                  <span className="kbd-shortcut-pill">Esc</span>
                </button>
              </div>
            </div>
            </div>

            {/* Flank navigation Right */}
            <button
              type="button"
              className="modal-flank-btn next"
              disabled={currentReportIndex < 0 || currentReportIndex >= paginatedUnifiedList.length - 1}
              onClick={goToNextReport}
              title="Hồ sơ sau (Phím mũi tên →)"
              aria-label="Hồ sơ sau"
              style={{ marginLeft: '14px', flexShrink: 0 }}
            >
              <ChevronRight size={26} />
            </button>
          </div>
        </div>
      )}

      {/* LIGHTBOX / FULL IMAGE VIEW */}
      {(lightboxImage || lightboxImgUrl) && (
        <div 
          onClick={() => { setLightboxImage(null); setLightboxImgUrl(null); }}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out'
          }}
        >
          <img 
            src={lightboxImgUrl ? getSafeImageUrl(lightboxImgUrl) : getImageUrl(lightboxImage)} 
            alt="Full Preview"
            onError={handleImageError}
            style={{
              maxWidth: '95%',
              maxHeight: '95%',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              objectFit: 'contain'
            }}
          />
          <button 
            onClick={() => setLightboxImage(null)}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={24} />
          </button>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA PHIẾU KIỂM TRA */}
      {deleteTarget && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '16px'
          }}
          onClick={() => !isDeleting && setDeleteTarget(null)}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              border: '1.5px solid #FEE2E2',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '20px 24px', backgroundColor: '#FEF2F2', borderBottom: '1px solid #FEE2E2', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={22} style={{ color: '#DC2626' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#991B1B' }}>Xác nhận xóa phiếu kiểm tra</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#B91C1C' }}>Thao tác này không thể hoàn tác</p>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <p style={{ fontSize: '0.9rem', color: '#374151', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn xóa vĩnh viễn phiếu kiểm tra <b style={{ color: '#991B1B' }}>#{deleteTarget.item?.id}</b> khỏi hệ thống?
              </p>

              <div style={{ backgroundColor: '#FAF6F0', borderRadius: '8px', padding: '12px 14px', border: '1px solid #EADCC9', fontSize: '0.83rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8D6E63' }}>Mã PO:</span>
                  <span style={{ fontWeight: '700', color: '#2D1A12' }}>{deleteTarget.item?.batch_no || '---'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8D6E63' }}>Phân loại:</span>
                  <span style={{ fontWeight: '700', color: '#7B5233' }}>{deleteTarget.item?.category || getInspectionTypeLabel(deleteTarget.item?.inspection_type)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8D6E63' }}>Công đoạn:</span>
                  <span style={{ fontWeight: '700', color: '#2D1A12' }}>{deleteTarget.item?.stage || deleteTarget.item?.stage_name || '---'}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: '14px 24px', backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isDeleting ? '#FCA5A5' : '#DC2626',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN TRẢ VỀ PHIẾU KIỂM TRA (CHƯA LÀM) */}
      {revertTarget && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '16px'
          }}
          onClick={() => !isReverting && setRevertTarget(null)}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              border: '1.5px solid #FDE68A',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '18px 22px', backgroundColor: '#FFFBEB', borderBottom: '1px solid #FEF3C7', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <RotateCcw size={22} style={{ color: '#D97706' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#92400E' }}>Xác nhận trả về phiếu kiểm tra</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#B45309' }}>Chuyển trạng thái từ "Đã xác nhận" về "Chưa làm"</p>
              </div>
            </div>

            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.88rem', color: '#374151', margin: 0, lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn trả về phiếu kiểm tra <b style={{ color: '#92400E' }}>#{revertTarget.item?.id}</b>? Sau khi trả về, hồ sơ sẽ chuyển thành trạng thái <b style={{ color: '#D97706' }}>Chưa làm</b> để QC kiểm tra / xử lý lại.
              </p>

              <div style={{ backgroundColor: '#FAF6F0', borderRadius: '8px', padding: '12px 14px', border: '1px solid #EADCC9', fontSize: '0.83rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8D6E63' }}>Mã phiếu / Lô PO:</span>
                  <span style={{ fontWeight: '700', color: '#2D1A12' }}>{revertTarget.item?.ticket_code || revertTarget.item?.batch_no || '---'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8D6E63' }}>Phân loại:</span>
                  <span style={{ fontWeight: '700', color: '#7B5233' }}>{revertTarget.item?.category || getInspectionTypeLabel(revertTarget.item?.inspection_type)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8D6E63' }}>Công đoạn:</span>
                  <span style={{ fontWeight: '700', color: '#2D1A12' }}>{revertTarget.item?.stage || revertTarget.item?.stage_name || '---'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>
                  Lý do trả về (QC sẽ xem được ghi chú này):
                </label>
                <textarea
                  value={revertReason}
                  onChange={(e) => setRevertReason(e.target.value)}
                  placeholder="Ví dụ: Cần kiểm tra lại kích thước phôi, bổ sung hình ảnh mẫu lỗi..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    resize: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ padding: '14px 22px', backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={isReverting}
                onClick={() => setRevertTarget(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: isReverting ? 'not-allowed' : 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isReverting}
                onClick={handleConfirmRevert}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#D97706',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: isReverting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)'
                }}
              >
                <RotateCcw size={15} />
                {isReverting ? 'Đang trả về...' : 'Xác nhận trả về'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InspectionReportsView;
