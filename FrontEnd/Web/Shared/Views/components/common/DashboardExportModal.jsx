import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Download,
  FileText,
  Image as ImageIcon,
  X,
  Loader2,
  CheckCircle2,
  Eye,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  BarChart3,
  Table
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

/**
 * Danh sách Dashboard chuẩn trong phân hệ Quản lý chất lượng & Khiếu nại ERP G7.
 */
export const DEFAULT_DASHBOARD_PAGES = [
  { id: 'page1', label: 'Tổng quan chất lượng' },
  { id: 'page2', label: 'Phân tích lỗi' },
  { id: 'page3', label: 'Kiểm soát & hành động' },
  { id: 'page4', label: 'Khiếu nại khách hàng' }
];

/**
 * Danh sách card phân tích chuẩn theo từng trang Dashboard để phục vụ xuất báo cáo Kết hợp
 */
export const DASHBOARD_CARDS_MAP = {
  page1: [
    { id: 'kpi', label: 'Thẻ chỉ số tổng quan (KPI)', defaultMode: 'chart' },
    { id: 'trend', label: 'Xu hướng tỷ lệ lỗi theo ngày', defaultMode: 'chart' },
    { id: 'stage', label: 'Tỷ lệ lỗi theo công đoạn', defaultMode: 'chart' },
    { id: 'causes', label: 'Top nguyên nhân lỗi', defaultMode: 'chart' },
    { id: 'passRate', label: 'Tỷ lệ đạt theo công đoạn', defaultMode: 'chart' }
  ],
  page2: [
    { id: 'kpi', label: 'Chỉ số Pareto', defaultMode: 'chart' },
    { id: 'pareto', label: 'Biểu đồ Pareto lỗi kiểm tra', defaultMode: 'chart' },
    { id: 'heatmap', label: 'Ma trận mức độ lỗi theo công đoạn', defaultMode: 'chart' },
    { id: 'dailyTrend', label: 'Xu hướng chất lượng theo ngày', defaultMode: 'chart' },
    { id: 'aqlSeverity', label: 'Cơ cấu mức độ nghiêm trọng AQL', defaultMode: 'chart' }
  ],
  page3: [
    { id: 'kpi', label: 'Chỉ số kiểm soát & CAPA', defaultMode: 'chart' },
    { id: 'topBatches', label: 'Top lô hàng lỗi nhiều nhất', defaultMode: 'chart' },
    { id: 'productLines', label: 'Chất lượng theo dòng sản phẩm', defaultMode: 'chart' },
    { id: 'qcRoster', label: 'Bảng theo dõi kiểm tra QC', defaultMode: 'table' },
    { id: 'capaStatus', label: 'Tình trạng xử lý sự cố CAPA', defaultMode: 'chart' }
  ],
  page4: [
    { id: 'trend', label: 'Xu hướng Claim & Tiền phạt', defaultMode: 'chart' },
    { id: 'pareto', label: 'Cơ cấu lỗi G7 (Pareto 80%)', defaultMode: 'chart' },
    { id: 'products', label: 'Chi tiết sản phẩm bị Claim', defaultMode: 'table' },
    { id: 'container', label: 'Phân tích độ trễ xuất Container', defaultMode: 'chart' },
    { id: 'penalty', label: 'Phân bổ theo phương án xử lý', defaultMode: 'table' }
  ]
};

const formatDateVN = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

/**
 * captureDomElement
 * Chụp một HTML DOM element sang canvas 2x DPI để phục vụ Preview và Export.
 */
export const captureDomElement = async (targetEl, options = {}) => {
  if (!targetEl) {
    throw new Error('Không tìm thấy vùng dữ liệu để kết xuất.');
  }

  await new Promise((r) => setTimeout(r, 200));

  return await html2canvas(targetEl, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#FAF8F6',
    logging: false,
    ignoreElements: (el) => {
      return (
        el.classList.contains('no-export') ||
        el.classList.contains('exp-toolbar') ||
        el.classList.contains('exp-filter-inline-bar') ||
        el.classList.contains('dashboard-toolbar') ||
        el.classList.contains('dashboard-toolbar-container') ||
        el.classList.contains('export-modal') ||
        el.classList.contains('export-modal-backdrop') ||
        el.classList.contains('export-preview-modal-backdrop') ||
        el.classList.contains('toast-container') ||
        el.getAttribute('data-no-export') === 'true' ||
        el.getAttribute('data-toolbar') === 'true'
      );
    },
    onclone: (clonedDoc, clonedTarget) => {
      clonedTarget.style.position = 'relative';
      clonedTarget.style.left = '0';
      clonedTarget.style.top = '0';
      clonedTarget.style.opacity = '1';
      clonedTarget.style.visibility = 'visible';
      clonedTarget.style.zIndex = '1';
      clonedTarget.style.transform = 'none';
      clonedTarget.style.display = 'flex';

      if (clonedTarget.parentElement) {
        clonedTarget.parentElement.style.opacity = '1';
        clonedTarget.parentElement.style.visibility = 'visible';
      }

      const tables = clonedTarget.querySelectorAll('table');
      tables.forEach((tbl) => {
        tbl.style.visibility = 'visible';
      });

      const toolbars = clonedTarget.querySelectorAll(
        '.exp-toolbar, .exp-filter-inline-bar, .dashboard-toolbar, .dashboard-toolbar-container, [data-toolbar="true"]'
      );
      toolbars.forEach((el) => {
        el.style.display = 'none';
      });

      const exportHeaders = clonedTarget.querySelectorAll('.dashboard-export-header');
      if (exportHeaders.length > 0) {
        exportHeaders.forEach((el) => {
          el.style.display = 'flex';
        });
      } else {
        const title = clonedTarget.getAttribute('data-report-title') || options.dashboardTitle || 'BÁO CÁO PHÂN TÍCH CHẤT LƯỢNG';
        const period = clonedTarget.getAttribute('data-report-period') || options.period || '';

        const banner = clonedDoc.createElement('div');
        banner.className = 'dashboard-export-header-injected';
        banner.style.cssText = `
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          padding: 8px 14px;
          background-color: #FAF6F0;
          border: 1.5px solid #EADCC9;
          border-radius: 6px;
          margin-bottom: 6px;
          box-sizing: border-box;
          width: 100%;
          flex-shrink: 0;
        `;

        const titleDiv = clonedDoc.createElement('div');
        titleDiv.style.cssText = 'font-size: 0.96rem; font-weight: 800; color: #303030;';
        titleDiv.textContent = title;
        banner.appendChild(titleDiv);

        if (period) {
          const periodDiv = clonedDoc.createElement('div');
          periodDiv.style.cssText = 'font-size: 0.80rem; color: #79543D; font-weight: 700;';
          periodDiv.textContent = period.startsWith('Kỳ báo cáo:') ? period : `Kỳ báo cáo: ${period}`;
          banner.appendChild(periodDiv);
        }

        clonedTarget.insertBefore(banner, clonedTarget.firstChild);
      }
    }
  });
};

/**
 * DashboardExportModal
 * Giao diện xuất báo cáo hoàn chỉnh tích hợp XEM TRƯỚC TRỰC TIẾP chuẩn ERP G7
 */
export const DashboardExportModal = ({
  isOpen,
  onClose,
  dashboardTitle = 'Dashboard',
  defaultFilenamePrefix = 'Dashboard',
  targetRef,
  currentPageId = 'page1',
  availablePages = DEFAULT_DASHBOARD_PAGES,
  renderCustomFilters = null,
  initialCustomFilters = {},
  onExportCustom = null,
  onCaptureAllPages = null
}) => {
  const [exportScope, setExportScope] = useState('single');
  const [selectedPageId, setSelectedPageId] = useState(currentPageId);

  const [exportMode, setExportMode] = useState('current');
  const [customFilters, setCustomFilters] = useState(initialCustomFilters);

  const [displayType, setDisplayType] = useState('chart');

  const [cardDisplayModes, setCardDisplayModes] = useState({
    trend: 'chart',
    pareto: 'chart',
    products: 'table',
    container: 'chart',
    penalty: 'table'
  });

  const [exportFormat, setExportFormat] = useState('png');

  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewPages, setPreviewPages] = useState([]);
  const [previewActiveIndex, setPreviewActiveIndex] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const [zoom, setZoom] = useState(100);
  const [fitMode, setFitMode] = useState('contain');
  const viewportRef = useRef(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const prevIsOpenRef = useRef(false);
  const previewRequestIdRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    const updateSize = () => {
      if (viewportRef.current) {
        setViewportSize({
          width: viewportRef.current.clientWidth,
          height: viewportRef.current.clientHeight
        });
      }
    };
    const timer = setTimeout(updateSize, 60);
    window.addEventListener('resize', updateSize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSize);
    };
  }, [isOpen, previewPages.length]);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      prevIsOpenRef.current = true;
      setExportScope('single');
      const targetPageId = currentPageId || (availablePages[0]?.id || 'page1');
      setSelectedPageId(targetPageId);
      setExportMode('current');
      setCustomFilters(initialCustomFilters || {});
      setExportFormat('png');

      const currentDashMode = initialCustomFilters?.dashboardViewMode === 'table' ? 'table' : 'chart';
      setDisplayType(currentDashMode);

      const pageCards = DASHBOARD_CARDS_MAP[targetPageId] || DASHBOARD_CARDS_MAP['page4'] || [];
      const initModes = {};
      pageCards.forEach((c) => {
        initModes[c.id] = c.defaultMode || 'chart';
      });
      setCardDisplayModes(initModes);

      setErrorMessage('');
      setExportSuccess(false);
      setPreviewActiveIndex(0);
      setZoom(100);
      setFitMode('contain');
    } else if (!isOpen) {
      prevIsOpenRef.current = false;
    }
  }, [isOpen]);

  // Phân giải cardDisplayModes động trên toàn bộ DASHBOARD_CARDS_MAP (bao gồm page1..page4)
  const resolvedCardModes = useMemo(() => {
    if (displayType === 'combined') {
      return cardDisplayModes;
    }
    const targetMode = displayType === 'table' ? 'table' : 'chart';
    const next = {};
    Object.values(DASHBOARD_CARDS_MAP).flat().forEach((c) => {
      next[c.id] = targetMode;
    });
    return next;
  }, [displayType, cardDisplayModes]);

  const cardModesKey = useMemo(() => JSON.stringify(resolvedCardModes), [resolvedCardModes]);
  const customFiltersKey = useMemo(() => JSON.stringify(customFilters), [customFilters]);

  const getTimestamp = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${y}${m}${d}_${h}${min}`;
  };

  const getActivePageObj = (pId) => {
    return availablePages.find((p) => p.id === pId) || availablePages[0] || { id: 'page1', label: 'Dashboard' };
  };

  useEffect(() => {
    if (!isOpen) return;

    const currentRequestId = ++previewRequestIdRef.current;
    setIsGeneratingPreview(true);
    setErrorMessage('');

    const delay = exportMode === 'custom' || displayType !== 'chart' ? 250 : 60;
    const timer = setTimeout(async () => {
      try {
        const generatedList = [];

        const exportOpts = {
          dashboardTitle: exportScope === 'single' ? getActivePageObj(selectedPageId).label : dashboardTitle,
          period: (customFilters?.startDate && customFilters?.endDate)
            ? `Kỳ báo cáo: ${formatDateVN(customFilters.startDate)} – ${formatDateVN(customFilters.endDate)}`
            : '',
          filters: [
            customFilters?.stage && customFilters.stage !== 'all' ? `Công đoạn: ${customFilters.stage}` : '',
            customFilters?.category && customFilters.category !== 'all' ? `Nhóm lỗi: ${customFilters.category}` : '',
            customFilters?.aql && customFilters.aql !== 'all' ? `AQL: ${customFilters.aql}` : ''
          ].filter(Boolean).join(' · ')
        };

        if (exportScope === 'single') {
          const pageObj = getActivePageObj(selectedPageId);

          const isLiveDashboardMatch =
            selectedPageId === currentPageId &&
            exportMode === 'current' &&
            displayType !== 'combined' &&
            displayType === (initialCustomFilters?.dashboardViewMode || 'chart');

          if (isLiveDashboardMatch) {
            if (targetRef && targetRef.current) {
              const canvas = await captureDomElement(targetRef.current, exportOpts);
              if (currentRequestId === previewRequestIdRef.current) {
                generatedList.push({
                  id: selectedPageId,
                  label: pageObj.label,
                  title: `Báo cáo: ${pageObj.label}`,
                  dataUrl: canvas.toDataURL('image/png', 1.0),
                  width: canvas.width,
                  height: canvas.height
                });
              }
            }
          } else if (typeof onExportCustom === 'function') {
            let capturedCanvas = null;
            await onExportCustom({
              pageId: selectedPageId,
              filters: {
                ...customFilters,
                dashboardViewMode: displayType === 'table' ? 'table' : 'chart',
                displayType,
                cardDisplayModes: resolvedCardModes
              },
              format: exportFormat,
              filenamePrefix: defaultFilenamePrefix,
              timestamp: getTimestamp(),
              exportElement: async (el) => {
                capturedCanvas = await captureDomElement(el, exportOpts);
              }
            });

            if (!capturedCanvas && targetRef?.current && displayType === 'chart' && (initialCustomFilters?.dashboardViewMode || 'chart') === 'chart') {
              capturedCanvas = await captureDomElement(targetRef.current, exportOpts);
            }

            if (capturedCanvas && currentRequestId === previewRequestIdRef.current) {
              generatedList.push({
                id: selectedPageId,
                label: pageObj.label,
                title: `Báo cáo: ${pageObj.label}`,
                dataUrl: capturedCanvas.toDataURL('image/png', 1.0),
                width: capturedCanvas.width,
                height: capturedCanvas.height
              });
            }
          } else if (targetRef?.current) {
            const canvas = await captureDomElement(targetRef.current, exportOpts);
            if (currentRequestId === previewRequestIdRef.current) {
              generatedList.push({
                id: selectedPageId,
                label: pageObj.label,
                title: `Báo cáo: ${pageObj.label}`,
                dataUrl: canvas.toDataURL('image/png', 1.0),
                width: canvas.width,
                height: canvas.height
              });
            }
          }
        } else {
          if (typeof onCaptureAllPages === 'function') {
            const allCaptured = await onCaptureAllPages({
              exportMode,
              customFilters: {
                ...customFilters,
                dashboardViewMode: displayType === 'table' ? 'table' : 'chart',
                displayType,
                cardDisplayModes: resolvedCardModes
              },
              format: exportFormat
            });
            if (Array.isArray(allCaptured) && allCaptured.length > 0 && currentRequestId === previewRequestIdRef.current) {
              generatedList.push(...allCaptured);
            }
          } else if (targetRef?.current) {
            const currentCanvas = await captureDomElement(targetRef.current, exportOpts);
            const currentDataUrl = currentCanvas.toDataURL('image/png', 1.0);
            if (currentRequestId === previewRequestIdRef.current) {
              availablePages.forEach((p) => {
                generatedList.push({
                  id: p.id,
                  label: p.label,
                  title: `Báo cáo: ${p.label}`,
                  dataUrl: currentDataUrl,
                  width: currentCanvas.width,
                  height: currentCanvas.height
                });
              });
            }
          }
        }

        if (currentRequestId === previewRequestIdRef.current) {
          if (generatedList.length > 0) {
            setPreviewPages(generatedList);
            setPreviewActiveIndex((prev) => Math.min(prev, generatedList.length - 1));
          } else {
            setErrorMessage('Không thể tạo bản xem trước cho cấu hình đã chọn.');
          }
        }
      } catch (err) {
        if (currentRequestId === previewRequestIdRef.current) {
          console.error('[DashboardExportModal] Lỗi tạo preview:', err);
          setErrorMessage(err.message || 'Không thể tạo bản xem trước.');
        }
      } finally {
        if (currentRequestId === previewRequestIdRef.current) {
          setIsGeneratingPreview(false);
        }
      }
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [
    isOpen,
    exportScope,
    selectedPageId,
    exportMode,
    displayType,
    cardModesKey,
    customFiltersKey,
    currentPageId,
    refreshKey,
    availablePages,
    defaultFilenamePrefix,
    onCaptureAllPages,
    onExportCustom,
    targetRef
  ]);

  const handleExecuteExport = async () => {
    if (previewPages.length === 0 || isGeneratingPreview) return;

    setIsExporting(true);
    setErrorMessage('');
    setExportSuccess(false);

    try {
      const timestamp = getTimestamp();

      if (exportFormat === 'pdf') {
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 8;
        const availableWidth = pdfWidth - margin * 2;
        const availableHeight = pdfHeight - margin * 2;

        previewPages.forEach((page, index) => {
          if (index > 0) pdf.addPage('a4', 'landscape');

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10.5);
          pdf.setTextColor(91, 57, 36);
          pdf.text(page.title || page.label, margin, margin + 4);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          pdf.setTextColor(120, 113, 108);
          pdf.text(`ERP G7 • ${new Date().toLocaleDateString('vi-VN')}`, pdfWidth - margin, margin + 4, { align: 'right' });

          const renderWidth = availableWidth;
          const renderHeight = Math.min((page.height * renderWidth) / page.width, availableHeight - 7);
          const posY = margin + 6;

          pdf.addImage(page.dataUrl, 'PNG', margin, posY, renderWidth, renderHeight, undefined, 'FAST');
        });

        const pdfFilename = exportScope === 'all'
          ? `${defaultFilenamePrefix}_ToanBo_${timestamp}.pdf`
          : `${defaultFilenamePrefix}_${getActivePageObj(selectedPageId).id}_${timestamp}.pdf`;

        pdf.save(pdfFilename);
      } else {
        if (exportScope === 'single' || previewPages.length === 1) {
          const singlePage = previewPages[0];
          const link = document.createElement('a');
          link.download = `${defaultFilenamePrefix}_${getActivePageObj(selectedPageId).id}_${timestamp}.png`;
          link.href = singlePage.dataUrl;
          link.click();
        } else {
          const zip = new JSZip();

          previewPages.forEach((page, idx) => {
            const base64Data = page.dataUrl.split(',')[1];
            const cleanName = page.label.replace(/[^a-zA-Z0-9_À-ỹ]/g, '_');
            const fileName = `${String(idx + 1).padStart(2, '0')}_${cleanName}.png`;
            zip.file(fileName, base64Data, { base64: true });
          });

          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const zipUrl = URL.createObjectURL(zipBlob);
          const link = document.createElement('a');
          link.download = `${defaultFilenamePrefix}_ToanBo_Dashboards_${timestamp}.zip`;
          link.href = zipUrl;
          link.click();
          URL.revokeObjectURL(zipUrl);
        }
      }

      setExportSuccess(true);
      setTimeout(() => {
        onClose();
        setExportSuccess(false);
      }, 1000);
    } catch (err) {
      console.error('[DashboardExportModal] Lỗi khi tải file:', err);
      setErrorMessage(err.message || 'Có lỗi xảy ra khi tạo bản xuất.');
    } finally {
      setIsExporting(false);
    }
  };

  const activePreview = previewPages[previewActiveIndex] || previewPages[0];
  const activePageObj = getActivePageObj(selectedPageId);

  const fitScale = useMemo(() => {
    if (!activePreview || !viewportSize.width || !viewportSize.height) return 1.0;
    const availW = Math.max(viewportSize.width - 24, 200);
    const availH = Math.max(viewportSize.height - 24, 200);
    const imgW = activePreview.width || 1400;
    const imgH = activePreview.height || 850;
    return Math.min(availW / imgW, availH / imgH, 1.0);
  }, [activePreview, viewportSize]);

  if (!isOpen) return null;

  return (
    <div
      className="export-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.60)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExporting && !isGeneratingPreview) onClose();
      }}
    >
      <div
        className="export-modal-dialog"
        style={{
          width: 'min(1500px, 96vw)',
          height: 'min(90vh, 90dvh)',
          minWidth: 'min(1500px, 96vw)',
          maxWidth: 'min(1500px, 96vw)',
          minHeight: 'min(90vh, 90dvh)',
          maxHeight: 'min(90vh, 90dvh)',
          boxSizing: 'border-box',
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.28)',
          border: '1.5px solid #EADCC9',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto'
        }}
      >
        {/* ── HEADER CỐ ĐỊNH (46px) ── */}
        <div
          className="export-modal-header"
          style={{
            height: '46px',
            minHeight: '46px',
            maxHeight: '46px',
            padding: '0 20px',
            backgroundColor: '#FAF6F0',
            borderBottom: '1px solid #EADCC9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} style={{ color: '#79543D' }} />
            <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#303030' }}>
              Xuất Dashboard
            </h3>
          </div>
          <button
            type="button"
            className="page-btn"
            onClick={onClose}
            disabled={isExporting}
            style={{
              background: 'none',
              border: 'none',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              color: '#A8A29E',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#303030'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#A8A29E'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── BODY 2 CỘT: CẤU HÌNH (30%) & XEM TRƯỚC TRỰC TIẾP (70%) ── */}
        <div
          className="export-modal-body filter"
          style={{
            flex: '1 1 0px',
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'row',
            boxSizing: 'border-box'
          }}
        >
          {/* ════════════ CỘT TRÁI: CẤU HÌNH XUẤT BÁO CÁO (~30%) ════════════ */}
          <div
            style={{
              width: '320px',
              minWidth: '300px',
              maxWidth: '340px',
              flexShrink: 0,
              borderRight: '1.5px solid #EADCC9',
              backgroundColor: '#FAF8F5',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '16px 18px',
              gap: '16px',
              boxSizing: 'border-box'
            }}
          >
            {/* 1. Phạm vi xuất */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#5B3924', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Phạm vi xuất:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: exportScope === 'all' ? '1.5px solid #79543D' : '1px solid #E8E2DC',
                    backgroundColor: exportScope === 'all' ? '#FAF6F2' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="radio"
                    name="exportScope"
                    value="all"
                    checked={exportScope === 'all'}
                    onChange={() => setExportScope('all')}
                    style={{ accentColor: '#79543D', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#303030' }}>
                    Toàn bộ Dashboard
                  </span>
                </label>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: exportScope === 'single' ? '1.5px solid #79543D' : '1px solid #E8E2DC',
                    backgroundColor: exportScope === 'single' ? '#FAF6F2' : '#FFFFFF',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="exportScope"
                      value="single"
                      checked={exportScope === 'single'}
                      onChange={() => setExportScope('single')}
                      style={{ accentColor: '#79543D', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#303030' }}>
                      Theo trang Dashboard
                    </span>
                  </label>

                  {exportScope === 'single' && (
                    <div style={{ paddingLeft: '22px', marginTop: '2px' }}>
                      <select
                        value={selectedPageId}
                        onChange={(e) => {
                          const newPageId = e.target.value;
                          setSelectedPageId(newPageId);
                          const pageCards = DASHBOARD_CARDS_MAP[newPageId] || DASHBOARD_CARDS_MAP['page4'] || [];
                          const newModes = {};
                          pageCards.forEach((c) => {
                            newModes[c.id] = c.defaultMode || 'chart';
                          });
                          setCardDisplayModes(newModes);
                        }}
                        style={{
                          width: '100%',
                          height: '28px',
                          padding: '0 8px',
                          borderRadius: '5px',
                          border: '1px solid #C4B5A5',
                          backgroundColor: '#FFFFFF',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          color: '#2D1A12',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {availablePages.map((page) => (
                          <option key={page.id} value={page.id}>
                            {page.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Chế độ xuất */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#5B3924', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Chế độ xuất:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: exportMode === 'current' ? '1.5px solid #79543D' : '1px solid #E8E2DC',
                    backgroundColor: exportMode === 'current' ? '#FAF6F2' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="radio"
                    name="exportMode"
                    value="current"
                    checked={exportMode === 'current'}
                    onChange={() => setExportMode('current')}
                    style={{ accentColor: '#79543D', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#303030' }}>
                    Màn hình hiện tại
                  </span>
                </label>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: exportMode === 'custom' ? '1.5px solid #79543D' : '1px solid #E8E2DC',
                    backgroundColor: exportMode === 'custom' ? '#FAF6F2' : '#FFFFFF',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="exportMode"
                      value="custom"
                      checked={exportMode === 'custom'}
                      onChange={() => setExportMode('custom')}
                      style={{ accentColor: '#79543D', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#303030' }}>
                      Theo bộ lọc tùy chọn
                    </span>
                  </label>

                  {exportMode === 'custom' && (
                    <div style={{ paddingLeft: '8px', marginTop: '2px' }}>
                      {typeof renderCustomFilters === 'function' ? (
                        renderCustomFilters({
                          customFilters,
                          updateFilter: (key, val) => setCustomFilters((prev) => ({ ...prev, [key]: val }))
                        })
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
                              Từ ngày:
                            </label>
                            <input
                              type="date"
                              value={customFilters.startDate || ''}
                              onChange={(e) => setCustomFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                              style={{ width: '100%', height: '26px', padding: '0 6px', border: '1px solid #E8E2DC', borderRadius: '4px', fontSize: '0.72rem', background: '#FFFFFF', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
                              Đến ngày:
                            </label>
                            <input
                              type="date"
                              value={customFilters.endDate || ''}
                              onChange={(e) => setCustomFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                              style={{ width: '100%', height: '26px', padding: '0 6px', border: '1px solid #E8E2DC', borderRadius: '4px', fontSize: '0.72rem', background: '#FFFFFF', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Kiểu hiển thị báo cáo: Biểu đồ | Bảng | Kết hợp */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#5B3924', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Kiểu hiển thị báo cáo:
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '4px',
                  backgroundColor: '#EFEAE4',
                  padding: '3px',
                  borderRadius: '6px'
                }}
              >
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setDisplayType('chart')}
                  style={{
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: displayType === 'chart' ? '#79543D' : 'transparent',
                    color: displayType === 'chart' ? '#FFFFFF' : '#57534E',
                    boxShadow: displayType === 'chart' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <BarChart3 size={13} />
                  <span>Biểu đồ</span>
                </button>

                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setDisplayType('table')}
                  style={{
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: displayType === 'table' ? '#79543D' : 'transparent',
                    color: displayType === 'table' ? '#FFFFFF' : '#57534E',
                    boxShadow: displayType === 'table' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Table size={13} />
                  <span>Bảng</span>
                </button>

                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setDisplayType('combined')}
                  style={{
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: displayType === 'combined' ? '#79543D' : 'transparent',
                    color: displayType === 'combined' ? '#FFFFFF' : '#57534E',
                    boxShadow: displayType === 'combined' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Layers size={13} />
                  <span>Kết hợp</span>
                </button>
              </div>

              {displayType === 'combined' && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #EADCC9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ fontSize: '0.67rem', fontWeight: 700, color: '#795137', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>
                    Cấu hình từng Card ({getActivePageObj(selectedPageId).label}):
                  </div>
                  {(DASHBOARD_CARDS_MAP[selectedPageId] || DASHBOARD_CARDS_MAP['page4'] || []).map((card) => {
                    const currentMode = cardDisplayModes[card.id] || card.defaultMode || 'chart';
                    return (
                      <div
                        key={card.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#FAF8F5',
                          border: '1px solid #F0ECE6'
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.70rem',
                            fontWeight: 600,
                            color: '#303030',
                            flex: 1,
                            minWidth: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={card.label}
                        >
                          {card.label}
                        </span>
                        <select
                          value={currentMode}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCardDisplayModes((prev) => ({ ...prev, [card.id]: val }));
                          }}
                          style={{
                            height: '24px',
                            padding: '0 4px',
                            borderRadius: '4px',
                            border: '1px solid #C4B5A5',
                            backgroundColor: currentMode === 'table' ? '#F5EBE1' : '#FFFFFF',
                            fontSize: '0.69rem',
                            fontWeight: 700,
                            color: currentMode === 'table' ? '#79543D' : '#303030',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="chart">Biểu đồ</option>
                          <option value="table">Bảng</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Định dạng xuất (PNG / PDF) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 800, color: '#5B3924', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Định dạng:
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px',
                  backgroundColor: '#EFEAE4',
                  padding: '3px',
                  borderRadius: '6px'
                }}
              >
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setExportFormat('png')}
                  style={{
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: exportFormat === 'png' ? '#79543D' : 'transparent',
                    color: exportFormat === 'png' ? '#FFFFFF' : '#57534E',
                    boxShadow: exportFormat === 'png' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ImageIcon size={14} />
                  <span>PNG</span>
                </button>
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setExportFormat('pdf')}
                  style={{
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: exportFormat === 'pdf' ? '#79543D' : 'transparent',
                    color: exportFormat === 'pdf' ? '#FFFFFF' : '#57534E',
                    boxShadow: exportFormat === 'pdf' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <FileText size={14} />
                  <span>PDF</span>
                </button>
              </div>

              <div style={{ marginTop: '6px', fontSize: '0.68rem', color: '#78716C', lineHeight: 1.3 }}>
                {exportFormat === 'pdf'
                  ? 'Xuất tài liệu PDF khổ A4 ngang chuẩn in ấn.'
                  : exportScope === 'all'
                  ? 'Đóng gói file nén (.zip) chứa các hình ảnh PNG riêng biệt.'
                  : 'Xuất file ảnh PNG độ nét cao (2x DPI).'
                }
              </div>
            </div>

            {errorMessage && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontSize: '0.70rem',
                  color: '#B91C1C',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px'
                }}
              >
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ flex: 1 }}>{errorMessage}</div>
              </div>
            )}
          </div>

          {/* ════════════ CỘT PHẢI: XEM TRƯỚC DASHBOARD TRỰC TIẾP (~70%) ════════════ */}
          <div
            style={{
              flex: '1 1 0px',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#F3EFEA',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <div
              style={{
                height: '40px',
                minHeight: '40px',
                maxHeight: '40px',
                padding: '0 16px',
                backgroundColor: '#FAF6F0',
                borderBottom: '1px solid #EADCC9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={15} style={{ color: '#79543D' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#5B3924', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Xem trước Dashboard trực tiếp
                </span>
                {activePreview && (
                  <span style={{ fontSize: '0.72rem', color: '#78716C' }}>
                    • {activePreview.label}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: exportFormat === 'pdf' ? '#EFE7DE' : '#E8EEF5',
                    color: exportFormat === 'pdf' ? '#5B3924' : '#1E40AF'
                  }}
                >
                  {exportFormat === 'pdf' ? 'Khổ A4 Ngang' : 'Ảnh PNG 2x DPI'}
                </span>
              </div>
            </div>

            <div
              ref={viewportRef}
              style={{
                flex: '1 1 0px',
                minHeight: 0,
                overflow: fitMode === 'contain' ? 'hidden' : 'auto',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: fitMode === 'contain' ? '8px' : '16px',
                boxSizing: 'border-box',
                backgroundColor: '#EBE5DF'
              }}
            >
              {isGeneratingPreview && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(250, 248, 246, 0.78)',
                    backdropFilter: 'blur(2px)',
                    zIndex: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  <Loader2 size={30} className="animate-spin" style={{ color: '#79543D' }} />
                  <div style={{ fontSize: '0.80rem', fontWeight: 700, color: '#5B3924' }}>
                    Đang kết xuất bản xem trước trực tiếp...
                  </div>
                  <div style={{ fontSize: '0.70rem', color: '#78716C' }}>
                    Đang dựng biểu đồ, KPI và số liệu thực tế
                  </div>
                </div>
              )}

              {!isGeneratingPreview && errorMessage && previewPages.length === 0 && (
                <div
                  style={{
                    margin: 'auto',
                    padding: '24px 32px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #EADCC9',
                    borderRadius: '8px',
                    textAlign: 'center',
                    maxWidth: '400px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                  }}
                >
                  <AlertCircle size={28} style={{ color: '#B91C1C', margin: '0 auto 8px auto' }} />
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#303030', marginBottom: '4px' }}>
                    Chưa thể tải bản xem trước
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#78716C', marginBottom: '14px' }}>
                    {errorMessage}
                  </div>
                  <button
                    type="button"
                    className="page-btn"
                    onClick={() => setRefreshKey((k) => k + 1)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 16px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      backgroundColor: '#79543D',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>Thử lại</span>
                  </button>
                </div>
              )}

              {activePreview && activePreview.dataUrl && (
                <div
                  style={{
                    width: fitMode === 'contain' ? `${Math.round((activePreview.width || 1400) * fitScale)}px` : `${zoom}%`,
                    maxWidth: fitMode === 'contain' ? '100%' : 'none',
                    height: fitMode === 'contain' ? `${Math.round((activePreview.height || 850) * fitScale)}px` : 'auto',
                    maxHeight: fitMode === 'contain' ? '100%' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16)',
                    borderRadius: '4px',
                    backgroundColor: '#FFFFFF',
                    overflow: 'hidden',
                    transition: fitMode === 'contain' ? 'none' : 'width 0.15s ease',
                    flexShrink: 0
                  }}
                >
                  <img
                    src={activePreview.dataUrl}
                    alt={activePreview.label}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block'
                    }}
                  />
                </div>
              )}
            </div>

            <div
              style={{
                height: '40px',
                minHeight: '40px',
                maxHeight: '40px',
                padding: '0 16px',
                backgroundColor: '#FAF6F0',
                borderTop: '1px solid #EADCC9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {previewPages.length > 1 ? (
                  <>
                    <button
                      type="button"
                      className="page-btn"
                      disabled={previewActiveIndex === 0}
                      onClick={() => setPreviewActiveIndex((i) => Math.max(0, i - 1))}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D6D3D1',
                        borderRadius: '4px',
                        cursor: previewActiveIndex === 0 ? 'not-allowed' : 'pointer',
                        opacity: previewActiveIndex === 0 ? 0.4 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        color: '#5B3924'
                      }}
                    >
                      <ChevronLeft size={14} />
                      <span>Trước</span>
                    </button>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#5B3924', margin: '0 4px' }}>
                      {previewActiveIndex + 1} / {previewPages.length}
                    </span>
                    <button
                      type="button"
                      className="page-btn"
                      disabled={previewActiveIndex >= previewPages.length - 1}
                      onClick={() => setPreviewActiveIndex((i) => Math.min(previewPages.length - 1, i + 1))}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D6D3D1',
                        borderRadius: '4px',
                        cursor: previewActiveIndex >= previewPages.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: previewActiveIndex >= previewPages.length - 1 ? 0.4 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        color: '#5B3924'
                      }}
                    >
                      <span>Tiếp</span>
                      <ChevronRight size={14} />
                    </button>
                    <span style={{ fontSize: '0.72rem', color: '#78716C', marginLeft: '6px' }}>
                      ({activePreview?.label})
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#78716C' }}>
                    1 trang duy nhất ({activePageObj.label})
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="page-btn"
                  title="Thu nhỏ (-15%)"
                  onClick={() => {
                    setFitMode('manual');
                    setZoom((z) => Math.max(50, z - 15));
                  }}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D6D3D1',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#57534E',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <ZoomOut size={13} />
                </button>

                <button
                  type="button"
                  className="page-btn"
                  title="Đặt lại 100%"
                  onClick={() => {
                    setFitMode('manual');
                    setZoom(100);
                  }}
                  style={{
                    minWidth: '50px',
                    height: '24px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D6D3D1',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#5B3924',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {zoom}%
                </button>

                <button
                  type="button"
                  className="page-btn"
                  title="Phóng to (+15%)"
                  onClick={() => {
                    setFitMode('manual');
                    setZoom((z) => Math.min(200, z + 15));
                  }}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D6D3D1',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#57534E',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <ZoomIn size={13} />
                </button>

                <button
                  type="button"
                  className="page-btn"
                  title="Vừa khung nhìn (Không thanh cuộn)"
                  onClick={() => {
                    setFitMode((m) => (m === 'contain' ? 'manual' : 'contain'));
                    if (fitMode !== 'contain') setZoom(100);
                  }}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: fitMode === 'contain' ? 700 : 500,
                    backgroundColor: fitMode === 'contain' ? '#EFE7DE' : '#FFFFFF',
                    color: fitMode === 'contain' ? '#5B3924' : '#57534E',
                    border: fitMode === 'contain' ? '1px solid #79543D' : '1px solid #D6D3D1',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Maximize2 size={12} />
                  <span>Vừa khung</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER CỐ ĐỊNH (52px): CHỈ GỒM [ HỦY ] VÀ [ XUẤT BÁO CÁO ] ── */}
        <div
          className="export-modal-footer"
          style={{
            height: '52px',
            minHeight: '52px',
            maxHeight: '52px',
            padding: '0 20px',
            backgroundColor: '#FAF6F0',
            borderTop: '1px solid #EADCC9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            flexShrink: 0,
            boxSizing: 'border-box'
          }}
        >
          <button
            type="button"
            className="page-btn"
            onClick={onClose}
            disabled={isExporting}
            style={{
              padding: '7px 18px',
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#57534E',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D6D3D1',
              borderRadius: '5px',
              cursor: isExporting ? 'not-allowed' : 'pointer'
            }}
          >
            Hủy
          </button>

          <button
            type="button"
            className="page-btn"
            onClick={handleExecuteExport}
            disabled={isExporting || isGeneratingPreview || previewPages.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 24px',
              fontSize: '0.76rem',
              fontWeight: 700,
              color: '#FFFFFF',
              backgroundColor: '#79543D',
              border: 'none',
              borderRadius: '5px',
              cursor: (isExporting || isGeneratingPreview || previewPages.length === 0) ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(91, 57, 36, 0.25)',
              opacity: (isExporting || isGeneratingPreview || previewPages.length === 0) ? 0.6 : 1,
              transition: 'all 0.15s ease'
            }}
          >
            {isExporting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Đang xuất báo cáo...</span>
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle2 size={15} style={{ color: '#86EFAC' }} />
                <span>Đã xuất thành công!</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>Xuất báo cáo ({exportFormat.toUpperCase()})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardExportModal;
