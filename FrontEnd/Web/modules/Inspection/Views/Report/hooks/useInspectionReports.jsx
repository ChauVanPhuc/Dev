import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
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
  MoreVertical
} from 'lucide-react';
import api, { API_ROOT } from '@webShared/Services/api.service';
import ExcelJS from 'exceljs';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

export const getInspectionTypeLabel = (type) => {
  switch (type) {
    case 'dau-vao':
    case 'nhap-kho':
    case 'mau-dau-tien':
    case 'input': return 'Kiểm tra mẫu đầu tiên';
    case 'cong-doan':
    case 'stage': return 'Kiểm tra lại';
    case 'do-am': return 'Độ ẩm';
    case 'kich-thuoc': return 'Kích thước';
    case 'ngoai-quan': return 'Ngoại quan';
    case 'chuc-nang': return 'Chức năng';
    case 'bam-dinh': return 'Bám dính';
    case 'sau-dong-goi': return 'Sau đóng gói';
    case 'phu-kien': return 'Phụ kiện';
    case 'quy-trinh':
    case 'process': return 'Kiểm tra quy trình';
    case 'daily': return 'Ghi nhận lỗi hàng ngày';
    default: return type || 'N/A';
  }
};


export const useInspectionReports = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const filterPending24h = queryParams.get('unconfirmed_24h') === 'true';
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  
  // Lấy metadata từ database thay vì hardcode
  const { screenCode, title, subtitle } = useScreenMetadataCached(location.pathname || '/admin/reports');
  
  // Tab control: 'stage' | 'input' | 'daily' | 'process'
  const [activeTab, setActiveTab] = useState('stage');
  const [activeActionMenu, setActiveActionMenu] = useState(null);
  
  // Data lists
  const [stageInspections, setStageInspections] = useState([]);
  const [dailyInspections, setDailyInspections] = useState([]);
  const [defectTypesMap, setDefectTypesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

  // Detail Modal state
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [selectedDaily, setSelectedDaily] = useState(null);
  const [selectedInbound, setSelectedInbound] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Export Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportOption, setSelectedExportOption] = useState('current'); // 'current' | 'po' | 'summary'
  const [exportPoCode, setExportPoCode] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Search & Filter state for Stage Inspections & Process Inspections (shared or separate)
  const [stageSearch, setStageSearch] = useState('');
  const [stageTypeFilter, setStageTypeFilter] = useState('all');
  const [stageStatusFilter, setStageStatusFilter] = useState('all');
  const [stageStageFilter, setStageStageFilter] = useState('all');
  const [stageStartDate, setStageStartDate] = useState('');
  const [stageEndDate, setStageEndDate] = useState('');
  const [stageSort, setStageSort] = useState('date_desc');

  // Search & Filter state for Incoming/Input Inspections
  const [inboundSearch, setInboundSearch] = useState('');
  const [inboundStatusFilter, setInboundStatusFilter] = useState('all'); // 'all' | 'pass' | 'fail'
  const [inboundStartDate, setInboundStartDate] = useState('');
  const [inboundEndDate, setInboundEndDate] = useState('');
  const [inboundSort, setInboundSort] = useState('date_desc');

  // Search & Filter state for Daily Defects
  const [dailySearch, setDailySearch] = useState('');
  const [dailyStartDate, setDailyStartDate] = useState('');
  const [dailyEndDate, setDailyEndDate] = useState('');
  const [dailySort, setDailySort] = useState('date_desc');

  // Pagination states
  const [stagePage, setStagePage] = useState(1);
  const [stageLimit, setStageLimit] = useState(15);
  const [inboundPage, setInboundPage] = useState(1);
  const [inboundLimit, setInboundLimit] = useState(15);
  const [dailyPage, setDailyPage] = useState(1);
  const [dailyLimit, setDailyLimit] = useState(15);

  const [unifiedPage, setUnifiedPage] = useState(1);
  const [unifiedLimit, setUnifiedLimit] = useState(15);

  const handleResetFilters = () => {
    setStageSearch('');
    setStageTypeFilter('all');
    setStageStatusFilter('all');
    setStageStageFilter('all');
    setStageStartDate('');
    setStageEndDate('');
    setStageSort('date_desc');
    setUnifiedPage(1);
  };

  const getDisplayInspector = (item) => {
    if (!item) return 'N/A';
    if (item.inspector_name && item.inspector_name.trim() && item.inspector_name !== 'N/A') {
      return item.inspector_name;
    }
    if (item.data_json) {
      try {
        const parsed = typeof item.data_json === 'string' ? JSON.parse(item.data_json) : item.data_json;
        if (parsed && (parsed.created_by || parsed.inspector_name)) {
          return parsed.inspector_name || parsed.created_by;
        }
      } catch (e) {}
    }
    return 'N/A';
  };

  // Set Header Title / Subtitle
  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // Close action dropdown menu on global click
  useEffect(() => {
    const handleGlobalClick = () => setActiveActionMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const renderActionDropdown = (item, tabType) => {
    const menuKey = `${tabType}-${item.id}`;
    const isOpen = activeActionMenu === menuKey;

    return (
      <div style={{ position: 'relative', display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setActiveActionMenu(isOpen ? null : menuKey)}
          style={{
            border: 'none',
            background: isOpen ? '#EADCC9' : 'transparent',
            cursor: 'pointer',
            color: '#7B5233',
            padding: '6px 8px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          title="Thao tác"
        >
          <MoreVertical size={18} />
        </button>

        {isOpen && (
          <div 
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '4px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              border: '1px solid #EADCC9',
              zIndex: 1000,
              minWidth: '150px',
              padding: '4px 0',
              textAlign: 'left'
            }}
          >
            <button
              onClick={() => {
                setActiveActionMenu(null);
                if (tabType === 'daily') setSelectedDaily(item);
                else if (tabType === 'input') setSelectedInbound(item);
                else setSelectedInspection(item);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                color: '#2D1A12',
                fontWeight: '600'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Eye size={15} style={{ color: '#7B5233' }} /> Xem chi tiết
            </button>

            <button
              onClick={() => {
                setActiveActionMenu(null);
                handleExportSingleExcel(item, tabType);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                color: '#15803d',
                fontWeight: '600'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F0FDF4'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <FileSpreadsheet size={15} /> Xuất Excel
            </button>

            <button
              onClick={() => {
                setActiveActionMenu(null);
                handleExportSinglePDF(item, tabType);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                color: '#0284c7',
                fontWeight: '600'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F0F9FF'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Printer size={15} /> In / Xuất PDF
            </button>
          </div>
        )}
      </div>
    );
  };

  // Load all data on mount / refresh
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch up to 1000 items to support rich frontend search/filter/pagination
      const [stageRes, dailyRes, defectTypesRes] = await Promise.all([
        api.get('/inspections/stage?limit=1000'),
        api.get('/inspections/daily?limit=1000'),
        api.get('/inspections/defect-types').catch(() => [])
      ]);
      
      setStageInspections(Array.isArray(stageRes) ? stageRes : []);
      setDailyInspections(Array.isArray(dailyRes) ? dailyRes : []);

      const dMap = {};
      if (Array.isArray(defectTypesRes)) {
        defectTypesRes.forEach(d => {
          if (d.id) dMap[d.id] = d.name;
        });
      }
      setDefectTypesMap(dMap);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu kiểm tra:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Unique PO codes in system for selector in export popup
  const uniquePoList = useMemo(() => {
    const pos = stageInspections.map(i => i.batch_no).filter(Boolean);
    return Array.from(new Set(pos)).sort();
  }, [stageInspections]);

  // Initialize selected PO code for export once list is loaded
  useEffect(() => {
    if (uniquePoList.length > 0 && !exportPoCode) {
      setExportPoCode(uniquePoList[0]);
    }
  }, [uniquePoList, exportPoCode]);

  // --- FILTERING & SORTING STAGE INSPECTIONS (Excludes 'quy-trinh', 'mau-dau-tien', and 'do-am') ---
  const filteredStageList = useMemo(() => {
    // Filter out quy-trinh and mau-dau-tien (which have dedicated tabs)
    let result = stageInspections.filter(item => item.inspection_type !== 'quy-trinh' && item.inspection_type !== 'mau-dau-tien');

    if (filterPending24h) {
      const limitTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      result = result.filter(item => !item.is_confirmed && new Date(item.created_at || item.inspection_date) >= limitTime);
    }

    // Search filter (PO, SKU, Inspector, ID)
    if (stageSearch.trim()) {
      const term = stageSearch.toLowerCase().trim();
      result = result.filter(item => 
        String(item.id).includes(term) ||
        `#${item.id}`.includes(term) ||
        (item.batch_no || '').toLowerCase().includes(term) ||
        (item.product_sku || '').toLowerCase().includes(term) ||
        (item.inspector_name || '').toLowerCase().includes(term) ||
        getInspectionTypeLabel(item.inspection_type).toLowerCase().includes(term)
      );
    }

    // Type filter
    if (stageTypeFilter !== 'all') {
      if (stageTypeFilter === 'nhap-kho') {
        result = result.filter(item => item.inspection_type === 'nhap-kho' || item.inspection_type === 'dau-vao');
      } else {
        result = result.filter(item => item.inspection_type === stageTypeFilter);
      }
    }

    // Conclusion/Status filter
    if (stageStatusFilter !== 'all') {
      result = result.filter(item => item.conclusion === stageStatusFilter);
    }

    // Date range filter
    if (stageStartDate) {
      const start = new Date(stageStartDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(item => new Date(item.inspection_date) >= start);
    }
    if (stageEndDate) {
      const end = new Date(stageEndDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(item => new Date(item.inspection_date) <= end);
    }

    // Sort logic
    if (stageSort === 'date_desc') {
      result.sort((a, b) => {
        const timeDiff = new Date(b.created_at || b.inspection_date) - new Date(a.created_at || a.inspection_date);
        if (timeDiff !== 0) return timeDiff;
        return (b.id || 0) - (a.id || 0);
      });
    } else if (stageSort === 'date_asc') {
      result.sort((a, b) => {
        const timeDiff = new Date(a.created_at || a.inspection_date) - new Date(b.created_at || b.inspection_date);
        if (timeDiff !== 0) return timeDiff;
        return (a.id || 0) - (b.id || 0);
      });
    } else if (stageSort === 'po_asc') {
      result.sort((a, b) => (a.batch_no || '').localeCompare(b.batch_no || ''));
    } else if (stageSort === 'po_desc') {
      result.sort((a, b) => (b.batch_no || '').localeCompare(a.batch_no || ''));
    }

    return result;
  }, [stageInspections, stageSearch, stageTypeFilter, stageStatusFilter, stageStartDate, stageEndDate, stageSort]);

  // --- FILTERING & SORTING PROCESS INSPECTIONS (Only 'quy-trinh') ---
  const filteredProcessList = useMemo(() => {
    let result = stageInspections.filter(item => item.inspection_type === 'quy-trinh');

    if (filterPending24h) {
      const limitTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      result = result.filter(item => !item.is_confirmed && new Date(item.created_at || item.inspection_date) >= limitTime);
    }

    // Search filter (PO, SKU, Inspector, ID)
    if (stageSearch.trim()) {
      const term = stageSearch.toLowerCase().trim();
      result = result.filter(item => 
        String(item.id).includes(term) ||
        `#${item.id}`.includes(term) ||
        (item.batch_no || '').toLowerCase().includes(term) ||
        (item.product_sku || '').toLowerCase().includes(term) ||
        (item.inspector_name || '').toLowerCase().includes(term)
      );
    }

    // Conclusion/Status filter
    if (stageStatusFilter !== 'all') {
      result = result.filter(item => item.conclusion === stageStatusFilter);
    }

    // Date range filter
    if (stageStartDate) {
      const start = new Date(stageStartDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(item => new Date(item.inspection_date) >= start);
    }
    if (stageEndDate) {
      const end = new Date(stageEndDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(item => new Date(item.inspection_date) <= end);
    }

    // Sort logic
    if (stageSort === 'date_desc') {
      result.sort((a, b) => {
        const timeDiff = new Date(b.created_at || b.inspection_date) - new Date(a.created_at || a.inspection_date);
        if (timeDiff !== 0) return timeDiff;
        return (b.id || 0) - (a.id || 0);
      });
    } else if (stageSort === 'date_asc') {
      result.sort((a, b) => {
        const timeDiff = new Date(a.created_at || a.inspection_date) - new Date(b.created_at || b.inspection_date);
        if (timeDiff !== 0) return timeDiff;
        return (a.id || 0) - (b.id || 0);
      });
    } else if (stageSort === 'po_asc') {
      result.sort((a, b) => (a.batch_no || '').localeCompare(b.batch_no || ''));
    } else if (stageSort === 'po_desc') {
      result.sort((a, b) => (b.batch_no || '').localeCompare(a.batch_no || ''));
    }

    return result;
  }, [stageInspections, stageSearch, stageStatusFilter, stageStartDate, stageEndDate, stageSort]);

  // --- FILTERING & SORTING FIRST ARTICLE INSPECTIONS (mau-dau-tien) ---
  const filteredInboundList = useMemo(() => {
    let result = stageInspections.filter(item => item.inspection_type === 'mau-dau-tien');

    if (filterPending24h) {
      const limitTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      result = result.filter(item => !item.is_confirmed && new Date(item.created_at || item.inspection_date) >= limitTime);
    }

    // Search filter (PO, SKU, Inspector, ID)
    if (inboundSearch.trim()) {
      const term = inboundSearch.toLowerCase().trim();
      result = result.filter(item => 
        String(item.id).includes(term) ||
        `#${item.id}`.includes(term) ||
        (item.batch_no || '').toLowerCase().includes(term) ||
        (item.product_sku || '').toLowerCase().includes(term) ||
        (item.inspector_name || '').toLowerCase().includes(term)
      );
    }

    // Conclusion/Status filter
    if (inboundStatusFilter !== 'all') {
      result = result.filter(item => item.conclusion === inboundStatusFilter);
    }

    // Date range filter
    if (inboundStartDate) {
      const start = new Date(inboundStartDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(item => new Date(item.inspection_date) >= start);
    }
    if (inboundEndDate) {
      const end = new Date(inboundEndDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(item => new Date(item.inspection_date) <= end);
    }

    // Sort logic
    if (inboundSort === 'date_desc') {
      result.sort((a, b) => {
        const timeDiff = new Date(b.created_at || b.inspection_date) - new Date(a.created_at || a.inspection_date);
        if (timeDiff !== 0) return timeDiff;
        return (b.id || 0) - (a.id || 0);
      });
    } else if (inboundSort === 'date_asc') {
      result.sort((a, b) => {
        const timeDiff = new Date(a.created_at || a.inspection_date) - new Date(b.created_at || b.inspection_date);
        if (timeDiff !== 0) return timeDiff;
        return (a.id || 0) - (b.id || 0);
      });
    } else if (inboundSort === 'part_asc') {
      result.sort((a, b) => (a.product_sku || '').localeCompare(b.product_sku || ''));
    } else if (inboundSort === 'part_desc') {
      result.sort((a, b) => (b.product_sku || '').localeCompare(a.product_sku || ''));
    }

    return result;
  }, [stageInspections, inboundSearch, inboundStatusFilter, inboundStartDate, inboundEndDate, inboundSort]);

  // --- FILTERING & SORTING DAILY DEFECTS ---
  const filteredDailyList = useMemo(() => {
    let result = [...dailyInspections];

    // Search filter (Stage, Inspector, ID)
    if (dailySearch.trim()) {
      const term = dailySearch.toLowerCase().trim();
      result = result.filter(item => 
        String(item.id).includes(term) ||
        `#${item.id}`.includes(term) ||
        (item.stage_name || '').toLowerCase().includes(term) ||
        (item.inspector_name || '').toLowerCase().includes(term)
      );
    }

    // Date range filter
    if (dailyStartDate) {
      const start = new Date(dailyStartDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(item => new Date(item.inspection_date) >= start);
    }
    if (dailyEndDate) {
      const end = new Date(dailyEndDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(item => new Date(item.inspection_date) <= end);
    }

    // Sort logic
    if (dailySort === 'date_desc') {
      result.sort((a, b) => {
        const timeDiff = new Date(b.created_at || b.inspection_date) - new Date(a.created_at || a.inspection_date);
        if (timeDiff !== 0) return timeDiff;
        return (b.id || 0) - (a.id || 0);
      });
    } else if (dailySort === 'date_asc') {
      result.sort((a, b) => {
        const timeDiff = new Date(a.created_at || a.inspection_date) - new Date(b.created_at || b.inspection_date);
        if (timeDiff !== 0) return timeDiff;
        return (a.id || 0) - (b.id || 0);
      });
    } else if (dailySort === 'defects_desc') {
      result.sort((a, b) => (b.total_defects || 0) - (a.total_defects || 0));
    } else if (dailySort === 'defects_asc') {
      result.sort((a, b) => (a.total_defects || 0) - (b.total_defects || 0));
    }

    return result;
  }, [dailyInspections, dailySearch, dailyStartDate, dailyEndDate, dailySort]);

  const normalizeStage = (st) => {
    if (!st || st === 'N/A' || st === '---') return 'N/A';
    let s = String(st).trim();
    if (/^Nhập Kho(\s*\d+|\s*NM\d+|\s*\/Đầu Vào)?$/i.test(s)) return 'Nhập Kho';
    return s;
  };

  // Unique stages for filter dropdown
  const uniqueStages = useMemo(() => {
    const sSet = new Set();
    stageInspections.forEach(i => {
      const st = normalizeStage(i.stage || i.stage_name);
      if (st && st !== 'N/A') sSet.add(st);
    });
    dailyInspections.forEach(i => {
      const st = normalizeStage(i.stage_name || i.stage);
      if (st && st !== 'N/A') sSet.add(st);
    });
    const standardStages = ['Nhập Kho', 'Tạo Phôi', 'Định Hình', 'Lắp Ráp', 'Sơn', 'Đóng Gói', 'Lưu Kho', 'QC Final'];
    standardStages.forEach(st => sSet.add(st));
    return Array.from(sSet).filter(Boolean).sort();
  }, [stageInspections, dailyInspections]);

  // --- FILTERING & SORTING UNIFIED LIST (Stage, Inbound, Process, Daily) ---
  const filteredUnifiedList = useMemo(() => {
    let list = [];
    
    // 1. Stage Inspections
    stageInspections.forEach(item => {
      let cat = "Kiểm tra lại";
      let typeLabel = "stage";
      if (item.inspection_type === 'quy-trinh') {
        cat = "Kiểm tra quy trình";
        typeLabel = "process";
      } else if (item.inspection_type === 'mau-dau-tien' || item.inspection_type === 'dau-vao' || item.inspection_type === 'nhap-kho') {
        cat = "Kiểm tra mẫu đầu tiên";
        typeLabel = "input";
      }
      
      const sQty = item.sample_qty || item.required_qty || 1;
      const eQty = item.error_qty || 0;
      const isPass = item.conclusion === 'pass';
      const dRate = isPass ? 0 : (sQty > 0 ? (eQty / sQty) * 100 : 0);
      const stName = normalizeStage(item.stage || item.stage_name || item.product_sku);

      list.push({
        id: item.id,
        raw_item: item,
        type: typeLabel,
        category: cat,
        inspection_date: item.inspection_date,
        created_at: item.created_at,
        batch_no: item.batch_no,
        stage: stName,
        product_sku: stName,
        inspector_name: item.inspector_name || getDisplayInspector(item),
        is_confirmed: item.is_confirmed,
        confirmed_at: item.confirmed_at,
        confirmed_by: item.confirmed_by,
        conclusion: item.conclusion,
        defect_rate: dRate,
        sample_qty: sQty,
        error_qty: eQty,
        result_label: isPass ? 'Đạt' : `Lỗi (${eQty}/${sQty})`,
        notes: item.notes || item.notes_json || ""
      });
    });
    
    // 2. Daily Inspections
    dailyInspections.forEach(item => {
      const dRate = Number(item.defect_rate || 0);
      const stName = normalizeStage(item.stage_name || item.stage || item.product_sku);
      list.push({
        id: item.id,
        raw_item: item,
        type: "daily",
        category: "Ghi nhận lỗi hàng ngày",
        inspection_date: item.created_at || item.inspection_date,
        created_at: item.created_at,
        batch_no: item.batch_no || "APT-0041-01",
        stage: stName,
        product_sku: stName,
        inspector_name: item.inspector_name || getDisplayInspector(item),
        is_confirmed: true,
        conclusion: null,
        defect_rate: dRate,
        sample_qty: item.total_products || item.total_inspected || 0,
        error_qty: item.total_defects || 0,
        result_label: `Lỗi: ${item.total_defects || 0}/${item.total_products || item.total_inspected || 0}`,
        notes: item.notes || ""
      });
    });

    // 24h filter
    if (filterPending24h) {
      const limitTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      list = list.filter(item => item.type !== 'daily' && !item.is_confirmed && new Date(item.created_at || item.inspection_date) >= limitTime);
    }
    
    // Search query
    if (stageSearch.trim()) {
      const term = stageSearch.toLowerCase().trim();
      list = list.filter(item => 
        String(item.id).includes(term) ||
        `#${item.id}`.includes(term) ||
        (item.batch_no || '').toLowerCase().includes(term) ||
        (item.product_sku || '').toLowerCase().includes(term) ||
        (item.inspector_name || '').toLowerCase().includes(term) ||
        (item.category || '').toLowerCase().includes(term)
      );
    }
    
    // Type filter
    if (stageTypeFilter !== 'all') {
      list = list.filter(item => item.type === stageTypeFilter);
    }
    
    // Status filter
    if (stageStatusFilter !== 'all') {
      list = list.filter(item => {
        if (item.type === 'daily') return false;
        return item.conclusion === stageStatusFilter;
      });
    }

    // Stage (Công đoạn) filter
    if (stageStageFilter !== 'all') {
      list = list.filter(item => {
        const itemStage = (item.stage || item.stage_name || '').toLowerCase();
        return itemStage.includes(stageStageFilter.toLowerCase());
      });
    }
    
    // Date range filter
    if (stageStartDate) {
      const start = new Date(stageStartDate);
      start.setHours(0, 0, 0, 0);
      list = list.filter(item => new Date(item.inspection_date) >= start);
    }
    if (stageEndDate) {
      const end = new Date(stageEndDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter(item => new Date(item.inspection_date) <= end);
    }
    
    // Sort logic
    if (stageSort === 'date_desc') {
      list.sort((a, b) => new Date(b.inspection_date) - new Date(a.inspection_date) || (b.id - a.id));
    } else if (stageSort === 'date_asc') {
      list.sort((a, b) => new Date(a.inspection_date) - new Date(b.inspection_date) || (a.id - b.id));
    } else if (stageSort === 'po_asc') {
      list.sort((a, b) => (a.batch_no || '').localeCompare(b.batch_no || ''));
    } else if (stageSort === 'po_desc') {
      list.sort((a, b) => (b.batch_no || '').localeCompare(a.batch_no || ''));
    }
    
    return list;
  }, [stageInspections, dailyInspections, filterPending24h, stageSearch, stageTypeFilter, stageStatusFilter, stageStageFilter, stageStartDate, stageEndDate, stageSort]);

  const paginatedUnifiedList = useMemo(() => {
    const startIdx = (unifiedPage - 1) * unifiedLimit;
    return filteredUnifiedList.slice(startIdx, startIdx + unifiedLimit);
  }, [filteredUnifiedList, unifiedPage, unifiedLimit]);

  const totalUnifiedPages = Math.ceil(filteredUnifiedList.length / unifiedLimit);

  // Pagination helper slices
  const paginatedStageList = useMemo(() => {
    const startIdx = (stagePage - 1) * stageLimit;
    return filteredStageList.slice(startIdx, startIdx + stageLimit);
  }, [filteredStageList, stagePage, stageLimit]);

  const paginatedProcessList = useMemo(() => {
    const startIdx = (stagePage - 1) * stageLimit; // Reuse stagePage and stageLimit for process audit
    return filteredProcessList.slice(startIdx, startIdx + stageLimit);
  }, [filteredProcessList, stagePage, stageLimit]);

  const paginatedInboundList = useMemo(() => {
    const startIdx = (inboundPage - 1) * inboundLimit;
    return filteredInboundList.slice(startIdx, startIdx + inboundLimit);
  }, [filteredInboundList, inboundPage, inboundLimit]);

  const paginatedDailyList = useMemo(() => {
    const startIdx = (dailyPage - 1) * dailyLimit;
    return filteredDailyList.slice(startIdx, startIdx + dailyLimit);
  }, [filteredDailyList, dailyPage, dailyLimit]);

  const totalStagePages = Math.ceil(filteredStageList.length / stageLimit) || 1;
  const totalProcessPages = Math.ceil(filteredProcessList.length / stageLimit) || 1;
  const totalInboundPages = Math.ceil(filteredInboundList.length / inboundLimit) || 1;
  const totalDailyPages = Math.ceil(filteredDailyList.length / dailyLimit) || 1;

  // Format Helpers
  const formatDisplayDateTime = (dtStr) => {
    if (!dtStr) return 'N/A';
    const date = new Date(dtStr);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDisplayDate = (dStr) => {
    if (!dStr) return 'N/A';
    const date = new Date(dStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Safe Image URL getter
  const getImageUrl = (path) => {
    if (!path) return '';
    if (typeof path !== 'string') return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;

    let cleanPath = path.replace(/\\/g, '/');
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.slice(1);
    }
    if (cleanPath.startsWith('uploads/')) {
      cleanPath = `static/${cleanPath}`;
    }

    const root = API_ROOT ? (API_ROOT.endsWith('/') ? API_ROOT : `${API_ROOT}/`) : '/';
    return `${root}${cleanPath}`;
  };

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
  };

  // ----------------------------------------------------
  // EXPORT LOGIC: EXCEL FORMATTING HELPERS
  // ----------------------------------------------------
  const formatExcelHeader = (worksheet, title, columnsCount) => {
    // Merge cell A1 to columnsCount for Title
    worksheet.mergeCells(1, 1, 1, columnsCount);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '7B5233' } // Dark brown
    };
    worksheet.getRow(1).height = 40;

    // Merge A2 to columnsCount for Metadata
    worksheet.mergeCells(2, 1, 2, columnsCount);
    const subCell = worksheet.getCell(2, 1);
    subCell.value = `Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')} | Hệ thống SmartFlow`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '4B301E' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    subCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FAF6F0' } // Beige background
    };
    worksheet.getRow(2).height = 24;

    // Empty row
    worksheet.getRow(3).height = 15;
  };

  const styleTableHeaderRow = (worksheet, rowNumber, columnsCount) => {
    worksheet.views = [
      { state: 'frozen', ySplit: rowNumber }
    ];
    const row = worksheet.getRow(rowNumber);
    row.height = 26;
    for (let c = 1; c <= columnsCount; c++) {
      const cell = worksheet.getCell(rowNumber, c);
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '7B5233' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'EADCC9' } },
        bottom: { style: 'medium', color: { argb: '4B301E' } },
        left: { style: 'thin', color: { argb: 'EADCC9' } },
        right: { style: 'thin', color: { argb: 'EADCC9' } }
      };
    }
  };

  const applyDefaultBorders = (worksheet, startRow, endRow, colsCount) => {
    for (let r = startRow; r <= endRow; r++) {
      const row = worksheet.getRow(r);
      row.height = 20;
      // Zebra striping
      const isEven = r % 2 === 0;
      for (let c = 1; c <= colsCount; c++) {
        const cell = worksheet.getCell(r, c);
        cell.font = { name: 'Arial', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'EADCC9' } },
          bottom: { style: 'thin', color: { argb: 'EADCC9' } },
          left: { style: 'thin', color: { argb: 'EADCC9' } },
          right: { style: 'thin', color: { argb: 'EADCC9' } }
        };
        if (isEven) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FAF9F6' }
          };
        }
      }
    }
  };

  const triggerFileDownload = async (workbook, fileName) => {
    const safeFileName = fileName.replace(/[\/\\:*?"<>|]/g, '_');
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = safeFileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  // ----------------------------------------------------
  // EXPORT FUNCTION 1: CURRENT LIST (UNIFIED LIST)
  // ----------------------------------------------------
  const handleExportCurrentList = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Danh Sách Phiếu Kiểm Tra');
      const cols = [
        { header: 'Mã Phiếu', key: 'code', width: 12 },
        { header: 'Phân Loại', key: 'category', width: 22 },
        { header: 'Ngày Kiểm/Ghi Nhận', key: 'date', width: 22 },
        { header: 'Mã PO', key: 'po', width: 22 },
        { header: 'Sản Phẩm / C.Đoạn', key: 'sku', width: 26 },
        { header: 'QC Thực Hiện', key: 'inspector', width: 24 },
        { header: 'Trạng Thái XN', key: 'confirmation', width: 16 },
        { header: 'Kết Luận / Kết Quả', key: 'conclusion', width: 20 },
        { header: 'Ghi Chú', key: 'notes', width: 35 }
      ];
      sheet.columns = cols;
      formatExcelHeader(sheet, 'BÁO CÁO TỔNG HỢP PHIẾU KIỂM TRA CHẤT LƯỢNG', cols.length);

      cols.forEach((col, idx) => {
        sheet.getCell(4, idx + 1).value = col.header;
      });
      styleTableHeaderRow(sheet, 4, cols.length);

      filteredUnifiedList.forEach((item, index) => {
        const rowData = {
          code: `#${item.id}`,
          category: item.category,
          date: formatDisplayDateTime(item.inspection_date),
          po: item.batch_no || '---',
          sku: item.product_sku || '---',
          inspector: item.inspector_name || 'N/A',
          confirmation: item.type === 'daily' ? '---' : (item.is_confirmed ? 'Đã xác nhận' : 'Chưa'),
          conclusion: item.result_label,
          notes: item.notes || ''
        };
        const addedRow = sheet.addRow(rowData);
        
        // Highlight conclusion cells
        const conclusionCell = addedRow.getCell(8);
        if (item.type === 'daily') {
          conclusionCell.font = { color: { argb: 'D97706' }, bold: true };
        } else if (item.conclusion === 'pass') {
          conclusionCell.font = { color: { argb: '059669' }, bold: true };
        } else {
          conclusionCell.font = { color: { argb: 'DC2626' }, bold: true };
        }
      });

      applyDefaultBorders(sheet, 5, filteredUnifiedList.length + 4, cols.length);
      
      await triggerFileDownload(workbook, `Bao_Cao_Tong_Hop_Kiem_Tra_${new Date().toISOString().split('T')[0]}.xlsx`);
      setShowExportModal(false);
    } catch (err) {
      console.error("Lỗi khi xuất excel:", err);
      alert("Đã xảy ra lỗi khi tạo tệp Excel: " + (err.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  // ----------------------------------------------------
  // EXPORT FUNCTION 2: DETAILED PO REPORT (MULTI-SHEET)
  // ----------------------------------------------------
  const handleExportDetailedPO = async () => {
    if (!exportPoCode) return;
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Fetch all stage inspections for this PO
      const poInspections = stageInspections.filter(i => i.batch_no === exportPoCode);

      // --- SHEET 1: GENERAL OVERVIEW OF PO ---
      const sheetOverview = workbook.addWorksheet('Tổng Quan Lệnh SX');
      const colsOverview = [
        { header: 'STT', width: 8 },
        { header: 'Ngày Kiểm Tra', width: 22 },
        { header: 'Mã Sản Phẩm / Công Đoạn', width: 26 },
        { header: 'Loại Công Đoạn', width: 20 },
        { header: 'QC Thực Hiện', width: 24 },
        { header: 'Kết Luận Chung', width: 15 }
      ];
      formatExcelHeader(sheetOverview, `BÁO CÁO CHẤT LƯỢNG CHI TIẾT PO: ${exportPoCode}`, colsOverview.length);
      
      // Style column headers
      colsOverview.forEach((col, idx) => {
        sheetOverview.getCell(4, idx + 1).value = col.header;
        sheetOverview.getColumn(idx + 1).width = col.width;
      });
      styleTableHeaderRow(sheetOverview, 4, colsOverview.length);

      poInspections.forEach((item, index) => {
        const addedRow = sheetOverview.addRow([
          index + 1,
          formatDisplayDateTime(item.inspection_date),
          item.product_sku || 'N/A',
          getInspectionTypeLabel(item.inspection_type),
          item.inspector_name || 'N/A',
          item.conclusion === 'pass' ? 'Đạt' : 'Lỗi'
        ]);
        const conclusionCell = addedRow.getCell(6);
        if (item.conclusion === 'pass') {
          conclusionCell.font = { color: { argb: '059669' }, bold: true };
        } else {
          conclusionCell.font = { color: { argb: 'DC2626' }, bold: true };
        }
      });
      applyDefaultBorders(sheetOverview, 5, poInspections.length + 4, colsOverview.length);

      // --- SHEET 2: DETAILED ADHESION (BÁM DÍNH) ---
      const adhesionInspections = poInspections.filter(i => i.inspection_type === 'bam-dinh');
      if (adhesionInspections.length > 0) {
        const sheetAdh = workbook.addWorksheet('Chi Tiết Bám Dính');
        const colsAdh = [
          { header: 'QC Thực Hiện', width: 22 },
          { header: 'Ngày Đánh Giá', width: 22 },
          { header: 'Tên Linh Kiện / Phụ Kiện', width: 35 },
          { header: 'Đánh Giá Chi Tiết', width: 16 }
        ];
        formatExcelHeader(sheetAdh, `KẾT QUẢ ĐÁNH GIÁ BÁM DÍNH CÁC LINH KIỆN - PO: ${exportPoCode}`, colsAdh.length);
        colsAdh.forEach((col, idx) => {
          sheetAdh.getCell(4, idx + 1).value = col.header;
          sheetAdh.getColumn(idx + 1).width = col.width;
        });
        styleTableHeaderRow(sheetAdh, 4, colsAdh.length);

        let rowCount = 5;
        adhesionInspections.forEach(item => {
          let parsed = {};
          try { parsed = typeof item.data_json === 'string' ? JSON.parse(item.data_json || '{}') : (item.data_json || {}); } catch(e){}
          if (Array.isArray(parsed.detailsList)) {
            parsed.detailsList.forEach(det => {
              const addedRow = sheetAdh.addRow([
                item.inspector_name || 'N/A',
                formatDisplayDateTime(item.inspection_date),
                det.name || 'N/A',
                det.conclusion === 'pass' ? 'Đạt' : 'Lỗi'
              ]);
              const cellVal = addedRow.getCell(4);
              if (det.conclusion === 'pass') {
                cellVal.font = { color: { argb: '059669' }, bold: true };
              } else {
                cellVal.font = { color: { argb: 'DC2626' }, bold: true };
              }
              rowCount++;
            });
          }
        });
        applyDefaultBorders(sheetAdh, 5, rowCount - 1, colsAdh.length);
      }

      // --- SHEET 3: MOISTURE & DIMENSIONS (ĐỘ ẨM & KÍCH THƯỚC) ---
      const moistureInspections = poInspections.filter(i => i.inspection_type === 'do-am');
      if (moistureInspections.length > 0) {
        const sheetMoist = workbook.addWorksheet('Độ Ẩm & Kích Thước Gỗ');
        const colsMoist = [
          { header: 'QC Thực Hiện', width: 22 },
          { header: 'Ngày Kiểm', width: 22 },
          { header: 'Sản Phẩm', width: 20 },
          { header: 'Mẫu Số', width: 10 },
          { header: 'Các Lần Đo Độ Ẩm (%)', width: 28 },
          { header: 'Kích Thước (Dày x Rộng x Dài mm)', width: 32 },
          { header: 'Kết Quả Mẫu', width: 16 }
        ];
        formatExcelHeader(sheetMoist, `GHI NHẬN KÍCH THƯỚC & ĐỘ ẨM MẪU GỖ - PO: ${exportPoCode}`, colsMoist.length);
        colsMoist.forEach((col, idx) => {
          sheetMoist.getCell(4, idx + 1).value = col.header;
          sheetMoist.getColumn(idx + 1).width = col.width;
        });
        styleTableHeaderRow(sheetMoist, 4, colsMoist.length);

        let rowCount = 5;
        moistureInspections.forEach(item => {
          let parsed = {};
          try { parsed = typeof item.data_json === 'string' ? JSON.parse(item.data_json || '{}') : (item.data_json || {}); } catch(e){}
          if (Array.isArray(parsed.samples)) {
            parsed.samples.forEach(s => {
              const moistVals = s.moisture?.values ? s.moisture.values.map(v => `${v}%`).join(', ') : 'Chưa đo';
              const sizeVal = s.size?.thickness ? `${s.size.thickness} x ${s.size.width} x ${s.size.length} mm` : 'Chưa đo';
              const addedRow = sheetMoist.addRow([
                item.inspector_name || 'N/A',
                formatDisplayDateTime(item.inspection_date),
                item.product_sku || 'N/A',
                s.stt,
                moistVals,
                sizeVal,
                s.result === 'pass' ? 'Đạt' : s.result === 'fail' ? 'Lỗi' : 'Chưa đo'
              ]);
              const resCell = addedRow.getCell(7);
              if (s.result === 'pass') {
                resCell.font = { color: { argb: '059669' }, bold: true };
              } else if (s.result === 'fail') {
                resCell.font = { color: { argb: 'DC2626' }, bold: true };
              }
              rowCount++;
            });
          }
        });
        applyDefaultBorders(sheetMoist, 5, rowCount - 1, colsMoist.length);
      }

      // --- SHEET 4: DETAILED PROCESS AUDIT (KIỂM TRA QUY TRÌNH) ---
      const processInspections = poInspections.filter(i => i.inspection_type === 'quy-trinh');
      if (processInspections.length > 0) {
        const sheetProc = workbook.addWorksheet('Chi Tiết Quy Trình');
        const colsProc = [
          { header: 'QC Thực Hiện', width: 22 },
          { header: 'Ngày Đánh Giá', width: 22 },
          { header: 'Bước Kiểm Tra', width: 30 },
          { header: 'Giá Trị Đo', width: 16 },
          { header: 'Kết Quả', width: 16 }
        ];
        formatExcelHeader(sheetProc, `KẾT QUẢ ĐÁNH GIÁ QUY TRÌNH SẢN XUẤT - PO: ${exportPoCode}`, colsProc.length);
        colsProc.forEach((col, idx) => {
          sheetProc.getCell(4, idx + 1).value = col.header;
          sheetProc.getColumn(idx + 1).width = col.width;
        });
        styleTableHeaderRow(sheetProc, 4, colsProc.length);

        let rowCount = 5;
        processInspections.forEach(item => {
          let parsed = {};
          try { parsed = typeof item.data_json === 'string' ? JSON.parse(item.data_json || '{}') : (item.data_json || {}); } catch(e){}
          if (parsed.steps) {
            Object.entries(parsed.steps).forEach(([stepKey, val]) => {
              const addedRow = sheetProc.addRow([
                item.inspector_name || 'N/A',
                formatDisplayDateTime(item.inspection_date),
                stepKey.split('_').slice(1, -1).join(' ') || stepKey,
                val.value || 'N/A',
                val.result === 'pass' ? 'Đạt' : 'Lỗi'
              ]);
              const resCell = addedRow.getCell(5);
              if (val.result === 'pass') {
                resCell.font = { color: { argb: '059669' }, bold: true };
              } else {
                resCell.font = { color: { argb: 'DC2626' }, bold: true };
              }
              rowCount++;
            });
          }
        });
        applyDefaultBorders(sheetProc, 5, rowCount - 1, colsProc.length);
      }

      // --- SHEET 5: FIRST ARTICLE INSPECTION (MẪU ĐẦU TIÊN) ---
      const firstArticleInspections = poInspections.filter(i => i.inspection_type === 'mau-dau-tien');
      if (firstArticleInspections.length > 0) {
        const sheetFA = workbook.addWorksheet('Mẫu Đầu Tiên');
        const colsFA = [
          { header: 'QC Thực Hiện', width: 22 },
          { header: 'Ngày Đánh Giá', width: 22 },
          { header: 'Công Đoạn', width: 20 },
          { header: 'Máy', width: 20 },
          { header: 'SL Sản Xuất', width: 14 },
          { header: 'SL Kiểm Mẫu', width: 14 },
          { header: 'SL Lỗi', width: 14 },
          { header: 'Kết Luận', width: 14 }
        ];
        formatExcelHeader(sheetFA, `KẾT QUẢ KIỂM MẪU ĐẦU TIÊN - PO: ${exportPoCode}`, colsFA.length);
        colsFA.forEach((col, idx) => {
          sheetFA.getCell(4, idx + 1).value = col.header;
          sheetFA.getColumn(idx + 1).width = col.width;
        });
        styleTableHeaderRow(sheetFA, 4, colsFA.length);

        let rowCount = 5;
        firstArticleInspections.forEach(item => {
          let parsed = {};
          try { parsed = typeof item.data_json === 'string' ? JSON.parse(item.data_json || '{}') : (item.data_json || {}); } catch(e){}
          const addedRow = sheetFA.addRow([
            item.inspector_name || 'N/A',
            formatDisplayDateTime(item.inspection_date),
            parsed.stage || 'N/A',
            parsed.machine_name ? `${parsed.machine_name} (${parsed.machine_code})` : 'N/A',
            parsed.quantity_produced || 0,
            parsed.quantity_sampled || 0,
            parsed.quantity_rejected || 0,
            item.conclusion === 'pass' ? 'Đạt' : 'Lỗi'
          ]);
          const resCell = addedRow.getCell(8);
          if (item.conclusion === 'pass') {
            resCell.font = { color: { argb: '059669' }, bold: true };
          } else {
            resCell.font = { color: { argb: 'DC2626' }, bold: true };
          }
          rowCount++;
        });
        applyDefaultBorders(sheetFA, 5, rowCount - 1, colsFA.length);
      }

      await triggerFileDownload(workbook, `Bao_Cao_Chi_Tiet_PO_${exportPoCode.replace(/\//g, '_')}.xlsx`);
      setShowExportModal(false);
    } catch (err) {
      console.error("Lỗi khi xuất excel PO:", err);
      alert("Đã xảy ra lỗi khi tạo tệp Excel PO: " + (err.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  // ----------------------------------------------------
  // EXPORT FUNCTION 3: QUALITY SUMMARY REPORT (DATE RANGE)
  // ----------------------------------------------------
  const handleExportQualitySummary = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Tỉ lệ đạt lỗi công đoạn');
      
      // Calculate start and end date text
      const dateText = (stageStartDate || stageEndDate)
        ? `Từ ngày ${stageStartDate || 'đầu'} đến ngày ${stageEndDate || 'nay'}`
        : 'Tất cả thời gian';

      // --- SHEET 1: PASS/FAIL RATE BY INSPECTION TYPE ---
      const cols = [
        { header: 'STT', width: 8 },
        { header: 'Tên Công Đoạn', width: 30 },
        { header: 'Tổng Lượt Kiểm Tra', width: 22 },
        { header: 'Số Lượt Đạt (Pass)', width: 22 },
        { header: 'Số Lượt Lỗi (Fail)', width: 22 },
        { header: 'Tỉ Lệ Đạt (%)', width: 20 }
      ];
      formatExcelHeader(sheet, `BÁO CÁO PHÂN TÍCH TỈ LỆ ĐẠT CÔNG ĐOẠN\n(${dateText.toUpperCase()})`, cols.length);
      
      cols.forEach((col, idx) => {
        sheet.getCell(4, idx + 1).value = col.header;
        sheet.getColumn(idx + 1).width = col.width;
      });
      styleTableHeaderRow(sheet, 4, cols.length);

      // Aggregate data by type
      const aggData = {};
      const inspectionTypes = ['bam-dinh', 'sau-dong-goi', 'phu-kien', 'quy-trinh', 'do-am'];
      inspectionTypes.forEach(t => {
        aggData[t] = { total: 0, pass: 0, fail: 0 };
      });

      filteredStageList.forEach(item => {
        const type = item.inspection_type;
        if (aggData[type]) {
          aggData[type].total++;
          if (item.conclusion === 'pass') {
            aggData[type].pass++;
          } else {
            aggData[type].fail++;
          }
        }
      });

      inspectionTypes.forEach((type, index) => {
        const stats = aggData[type];
        const passRate = stats.total > 0 ? (stats.pass / stats.total * 100) : 100;
        
        const addedRow = sheet.addRow([
          index + 1,
          getInspectionTypeLabel(type),
          stats.total,
          stats.pass,
          stats.fail,
          `${passRate.toFixed(2)}%`
        ]);

        const rateCell = addedRow.getCell(6);
        rateCell.font = { bold: true };
        if (passRate >= 95) {
          rateCell.font = { color: { argb: '059669' }, bold: true };
        } else if (passRate >= 80) {
          rateCell.font = { color: { argb: 'D97706' }, bold: true };
        } else {
          rateCell.font = { color: { argb: 'DC2626' }, bold: true };
        }
      });

      applyDefaultBorders(sheet, 5, inspectionTypes.length + 4, cols.length);

      // --- SHEET 2: TOP DEFECTS ---
      const sheetDefects = workbook.addWorksheet('Top Lỗi Hàng Ngày');
      const colsDef = [
        { header: 'Hạng', width: 8 },
        { header: 'Mã Lỗi (Defect ID)', width: 22 },
        { header: 'Số Lần Ghi Nhận Lỗi', width: 26 }
      ];
      formatExcelHeader(sheetDefects, `BÁO CÁO THỐNG KÊ TẦN SUẤT LỖI GHI NHẬN HÀNG NGÀY\n(${dateText.toUpperCase()})`, colsDef.length);

      colsDef.forEach((col, idx) => {
        sheetDefects.getCell(4, idx + 1).value = col.header;
        sheetDefects.getColumn(idx + 1).width = col.width;
      });
      styleTableHeaderRow(sheetDefects, 4, colsDef.length);

      // Aggregate defect frequency from filteredDailyList
      const defectFreq = {};
      filteredDailyList.forEach(item => {
        if (Array.isArray(item.defects)) {
          item.defects.forEach(def => {
            const defId = def.defect_id;
            defectFreq[defId] = (defectFreq[defId] || 0) + (def.quantity || 0);
          });
        }
      });

      const sortedDefects = Object.entries(defectFreq)
        .map(([id, qty]) => ({ id, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 15);

      sortedDefects.forEach((item, index) => {
        sheetDefects.addRow([
          index + 1,
          `Mã lỗi #${item.id}`,
          item.qty
        ]);
      });

      applyDefaultBorders(sheetDefects, 5, sortedDefects.length + 4, colsDef.length);

      await triggerFileDownload(workbook, `Bao_Cao_Tong_Hop_Chat_Luong_${new Date().toISOString().split('T')[0]}.xlsx`);
      setShowExportModal(false);
    } catch (err) {
      console.error("Lỗi khi xuất excel tổng hợp:", err);
      alert("Đã xảy ra lỗi khi tạo tệp Excel tổng hợp: " + (err.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  // ----------------------------------------------------
  // EXPORT SINGLE RECORD TO EXCEL
  // ----------------------------------------------------
  const fetchImageBase64 = async (url) => {
    try {
      if (!url) return null;
      const fullUrl = getImageUrl(url);
      const res = await fetch(fullUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  };

  // ----------------------------------------------------
  // EXPORT SINGLE RECORD TO EXCEL
  // ----------------------------------------------------
  const handleExportSingleExcel = async (item, tabType) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Chi tiết phiếu');

      let parsed = {};
      try {
        parsed = typeof item.data_json === 'string' ? JSON.parse(item.data_json || '{}') : (item.data_json || {});
      } catch (e) {}

      if (tabType === 'daily') {
        const title = `PHIẾU GHI NHẬN LỖI HÀNG NGÀY - ${item.stage_name || ''}`;
        formatExcelHeader(sheet, title, 4);

        sheet.getRow(4).values = ['Công đoạn:', item.stage_name || 'N/A', 'Ngày kiểm:', formatDisplayDate(item.inspection_date)];
        sheet.getRow(5).values = ['QC kiểm tra:', item.inspector_name || 'N/A', 'Tổng SP kiểm:', item.total_products || 0];
        sheet.getRow(6).values = ['Tổng số lỗi:', item.total_defects || 0, 'Tỉ lệ lỗi (%):', `${(item.defect_rate || 0).toFixed(2)}%`];
        sheet.getRow(7).values = [];

        const cols = [
          { header: 'STT', width: 8 },
          { header: 'Mã lỗi (Defect ID)', width: 25 },
          { header: 'Số lượng lỗi', width: 20 },
          { header: 'Ghi chú', width: 30 }
        ];
        sheet.getRow(8).values = cols.map(c => c.header);
        cols.forEach((c, idx) => sheet.getColumn(idx + 1).width = c.width);
        styleTableHeaderRow(sheet, 8, cols.length);

        let rowIdx = 9;
        if (Array.isArray(item.defects) && item.defects.length > 0) {
          item.defects.forEach((def, i) => {
            sheet.addRow([i + 1, `Mã lỗi #${def.defect_id}`, def.quantity || 0, '']);
            rowIdx++;
          });
        }
        applyDefaultBorders(sheet, 9, rowIdx - 1, cols.length);
        await triggerFileDownload(workbook, `Phieu_Loi_Hang_Ngay_${item.stage_name || 'QC'}_${item.id}.xlsx`);

      } else if (tabType === 'input') {
        const title = `PHIẾU KIỂM TRA ĐẦU VÀO (IQC) - ${item.part_name || ''}`;
        formatExcelHeader(sheet, title, 5);

        sheet.getRow(4).values = ['Linh kiện:', item.part_name || 'N/A', '', 'Ngày kiểm:', formatDisplayDateTime(item.inspected_at)];
        sheet.mergeCells('B4:C4');
        sheet.getRow(5).values = ['Quy cách:', item.specification || 'N/A', '', 'Cont / PO:', item.cont_name || 'N/A'];
        sheet.mergeCells('B5:C5');
        sheet.getRow(6).values = ['QC kiểm tra:', item.inspector_name || 'N/A', '', 'Kết luận:', item.result || 'N/A'];
        sheet.mergeCells('B6:C6');
        sheet.getRow(7).values = ['Ghi chú:', item.note || 'N/A', '', '', ''];
        sheet.mergeCells('B7:E7');
        sheet.getRow(8).values = [];

        const cols = [
          { header: 'Chỉ số đo', width: 25 },
          { header: 'Chiều dài (mm)', width: 20 },
          { header: 'Chiều rộng (mm)', width: 20 },
          { header: 'Chiều dày (mm)', width: 20 },
          { header: 'Hình ảnh', width: 35 }
        ];
        sheet.getRow(9).values = cols.map(c => c.header);
        cols.forEach((c, idx) => sheet.getColumn(idx + 1).width = c.width);
        styleTableHeaderRow(sheet, 9, cols.length);

        sheet.addRow(['Kích thước thực tế', item.measured_length || '---', item.measured_width || '---', item.measured_height || '---', '']);
        
        // Nhúng hình ảnh IQC nếu có
        const imgPaths = [item.image_path_1, item.image_path_2, item.image_path_3].filter(Boolean);
        if (imgPaths.length > 0) {
          sheet.getRow(10).height = 80;
          for (let pIdx = 0; pIdx < imgPaths.length; pIdx++) {
            const b64 = await fetchImageBase64(imgPaths[pIdx]);
            if (b64) {
              const imgId = workbook.addImage({ base64: b64, extension: 'jpeg' });
              sheet.addImage(imgId, {
                tl: { col: 4 + pIdx, row: 9 },
                ext: { width: 100, height: 75 }
              });
            }
          }
        }
        applyDefaultBorders(sheet, 9, 10, cols.length);
        await triggerFileDownload(workbook, `Phieu_IQC_${(item.part_name || 'LinhKien').replace(/[/\\?%*:|"<>]/g, '_')}_${item.id}.xlsx`);

      } else {
        const typeLabel = getInspectionTypeLabel(item.inspection_type);
        const title = `PHIẾU KIỂM TRA ${typeLabel.toUpperCase()} - PO: ${item.batch_no || ''}`;
        formatExcelHeader(sheet, title, 5);

        // Grid thông tin chung (5 cột)
        sheet.getRow(4).values = ['Mã PO:', item.batch_no || 'N/A', '', 'Ngày kiểm:', formatDisplayDateTime(item.inspection_date)];
        sheet.mergeCells('B4:C4');

        sheet.getRow(5).values = ['Mã sản phẩm:', item.product_sku || 'N/A', '', 'QC thực hiện:', item.inspector_name || 'N/A'];
        sheet.mergeCells('B5:C5');

        sheet.getRow(6).values = ['Loại kiểm tra:', typeLabel, '', 'Kết luận:', item.conclusion === 'pass' ? 'ĐẠT' : 'LỖI'];
        sheet.mergeCells('B6:C6');

        sheet.getRow(7).values = ['Ghi chú:', item.notes || 'Không có ghi chú', '', '', ''];
        sheet.mergeCells('B7:E7');
        sheet.getRow(8).values = [];

        // Định dạng font / màu cho phần header thông tin chung
        [4, 5, 6, 7].forEach(rIdx => {
          sheet.getCell(rIdx, 1).font = { bold: true, color: { argb: '7B5233' } };
          sheet.getCell(rIdx, 4).font = { bold: true, color: { argb: '7B5233' } };
        });
        const resultCell = sheet.getCell(6, 5);
        if (item.conclusion === 'pass') {
          resultCell.font = { bold: true, color: { argb: '059669' } };
        } else {
          resultCell.font = { bold: true, color: { argb: 'DC2626' } };
        }

        // Bảng chi tiết
        const cols = [
          { header: 'STT', width: 8 },
          { header: 'Hạng mục / Mẫu kiểm', width: 32 },
          { header: 'Giá trị đo / Kết quả', width: 28 },
          { header: 'Trạng thái', width: 14 },
          { header: 'Hình ảnh minh chứng', width: 28 }
        ];
        sheet.getRow(9).values = cols.map(c => c.header);
        cols.forEach((c, idx) => sheet.getColumn(idx + 1).width = c.width);
        styleTableHeaderRow(sheet, 9, cols.length);

        const usedImages = new Set();
        let rowIdx = 10;

        if (Array.isArray(parsed.detailsList)) {
          for (let i = 0; i < parsed.detailsList.length; i++) {
            const det = parsed.detailsList[i];
            const isPass = det.conclusion === 'pass';
            const addedRow = sheet.addRow([
              i + 1,
              det.name || 'Chi tiết',
              isPass ? 'Đạt' : 'Không đạt',
              isPass ? 'Đạt' : 'Lỗi',
              ''
            ]);
            const stCell = addedRow.getCell(4);
            stCell.font = { bold: true, color: { argb: isPass ? '059669' : 'DC2626' } };

            if (det.image) {
              const b64 = await fetchImageBase64(det.image);
              if (b64) {
                usedImages.add(det.image);
                const imgId = workbook.addImage({ base64: b64, extension: 'jpeg' });
                sheet.addImage(imgId, {
                  tl: { col: 4, row: rowIdx - 1 },
                  ext: { width: 95, height: 62 }
                });
                addedRow.height = 70;
              }
            }
            rowIdx++;
          }
        } else if (Array.isArray(parsed.samples)) {
          for (let i = 0; i < parsed.samples.length; i++) {
            const s = parsed.samples[i];
            const isPass = s.result === 'pass';
            const mVal = s.moisture?.values ? s.moisture.values.map(v => `${v}%`).join(', ') : '';
            const szVal = s.size?.thickness ? `${s.size.thickness}x${s.size.width}x${s.size.length}mm` : '';
            const addedRow = sheet.addRow([
              i + 1,
              `Mẫu #${s.stt}`,
              `${mVal} ${szVal}`.trim() || 'N/A',
              isPass ? 'Đạt' : 'Lỗi',
              ''
            ]);
            const stCell = addedRow.getCell(4);
            stCell.font = { bold: true, color: { argb: isPass ? '059669' : 'DC2626' } };

            const photo = s.moisture?.photo || s.size?.photo;
            if (photo) {
              const b64 = await fetchImageBase64(photo);
              if (b64) {
                usedImages.add(photo);
                const imgId = workbook.addImage({ base64: b64, extension: 'jpeg' });
                sheet.addImage(imgId, {
                  tl: { col: 4, row: rowIdx - 1 },
                  ext: { width: 95, height: 62 }
                });
                addedRow.height = 70;
              }
            }
            rowIdx++;
          }
        } else if (parsed.steps) {
          const entries = Object.entries(parsed.steps);
          for (let i = 0; i < entries.length; i++) {
            const [k, val] = entries[i];
            const isPass = val.result === 'pass';
            const addedRow = sheet.addRow([
              i + 1,
              k,
              val.value || 'N/A',
              isPass ? 'Đạt' : 'Lỗi',
              ''
            ]);
            const stCell = addedRow.getCell(4);
            stCell.font = { bold: true, color: { argb: isPass ? '059669' : 'DC2626' } };

            if (val.photo) {
              const b64 = await fetchImageBase64(val.photo);
              if (b64) {
                usedImages.add(val.photo);
                const imgId = workbook.addImage({ base64: b64, extension: 'jpeg' });
                sheet.addImage(imgId, {
                  tl: { col: 4, row: rowIdx - 1 },
                  ext: { width: 95, height: 62 }
                });
                addedRow.height = 70;
              }
            }
            rowIdx++;
          }
        } else {
          sheet.addRow([1, 'Kết quả đánh giá chung', item.conclusion === 'pass' ? 'Đạt' : 'Lỗi', item.conclusion === 'pass' ? 'Đạt' : 'Lỗi', '']);
          rowIdx++;
        }

        // Tải ảnh tổng hợp nếu chưa được hiển thị ở các dòng chi tiết
        let generalImages = [];
        try {
          const parsedImages = typeof item.images_json === 'string' ? JSON.parse(item.images_json || '{}') : (item.images_json || {});
          Object.values(parsedImages).forEach(val => {
            if (Array.isArray(val)) generalImages.push(...val);
          });
        } catch (e) {}

        const remainingImages = Array.from(new Set(generalImages)).filter(img => img && !usedImages.has(img));
        if (remainingImages.length > 0) {
          rowIdx += 1;
          sheet.getCell(rowIdx, 1).value = "THƯ VIỆN HÌNH ẢNH BỔ SUNG";
          sheet.getCell(rowIdx, 1).font = { bold: true, size: 11, color: { argb: '7B5233' } };
          rowIdx += 1;

          let colIdx = 0;
          for (let gIdx = 0; gIdx < remainingImages.length; gIdx++) {
            const b64 = await fetchImageBase64(remainingImages[gIdx]);
            if (b64) {
              const imgId = workbook.addImage({ base64: b64, extension: 'jpeg' });
              sheet.addImage(imgId, {
                tl: { col: colIdx % 3 * 2, row: rowIdx - 1 },
                ext: { width: 130, height: 85 }
              });
              if ((colIdx + 1) % 3 === 0) {
                rowIdx += 6;
              }
              colIdx++;
            }
          }
        }

        applyDefaultBorders(sheet, 9, Math.max(rowIdx - 1, 10), cols.length);
        await triggerFileDownload(workbook, `Phieu_KT_${item.inspection_type}_${(item.batch_no || '').replace(/[/\\?%*:|"<>]/g, '_')}_${item.id}.xlsx`);
      }
    } catch (err) {
      console.error("Lỗi khi xuất tệp Excel lẻ:", err);
      alert("Lỗi khi xuất tệp Excel: " + err.message);
    }
  };

  // ----------------------------------------------------
  // EXPORT SINGLE RECORD TO PDF / PRINT
  // ----------------------------------------------------
  const handleExportSinglePDF = (item, tabType) => {
    let parsed = {};
    try {
      parsed = typeof item.data_json === 'string' ? JSON.parse(item.data_json || '{}') : (item.data_json || {});
    } catch (e) {}

    const isDaily = tabType === 'daily';
    const isInput = tabType === 'input';
    const typeLabel = isDaily ? 'Ghi Nhận Lỗi Hàng Ngày' : isInput ? 'Kiểm Tra Đầu Vào (IQC)' : getInspectionTypeLabel(item.inspection_type);

    let detailsHtml = '';
    if (isDaily) {
      detailsHtml = `
        <div style="margin-top:15px; font-weight:bold; color:#7B5233;">Danh sách chi tiết các lỗi:</div>
        <table style="width:100%; border-collapse:collapse; margin-top:8px;">
          <thead>
            <tr style="background:#7B5233; color:#fff;">
              <th style="padding:8px; border:1px solid #ddd;">STT</th>
              <th style="padding:8px; border:1px solid #ddd;">Tên Loại Lỗi</th>
              <th style="padding:8px; border:1px solid #ddd;">Số Lượng Lỗi</th>
            </tr>
          </thead>
          <tbody>
            ${(item.defects || []).map((d, i) => `
              <tr>
                <td style="padding:8px; border:1px solid #ddd; text-align:center;">${i+1}</td>
                <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">${d.defect_name || d.name || `Mã lỗi #${d.defect_id}`}</td>
                <td style="padding:8px; border:1px solid #ddd; text-align:center; color:#dc2626; font-weight:bold;">${d.quantity}</td>
              </tr>
            `).join('') || '<tr><td colspan="3" style="text-align:center; padding:10px;">Không có danh sách lỗi</td></tr>'}
          </tbody>
        </table>
      `;
    } else if (isInput) {
      detailsHtml = `
        <div style="margin-top:15px; font-weight:bold; color:#7B5233;">Bảng kích thước thực tế (mm):</div>
        <table style="width:100%; border-collapse:collapse; margin-top:8px;">
          <thead>
            <tr style="background:#7B5233; color:#fff;">
              <th style="padding:8px; border:1px solid #ddd;">Chiều Dài (mm)</th>
              <th style="padding:8px; border:1px solid #ddd;">Chiều Rộng (mm)</th>
              <th style="padding:8px; border:1px solid #ddd;">Chiều Dày (mm)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:10px; border:1px solid #ddd; text-align:center; font-size:1.1em; font-weight:bold;">${item.measured_length || '---'}</td>
              <td style="padding:10px; border:1px solid #ddd; text-align:center; font-size:1.1em; font-weight:bold;">${item.measured_width || '---'}</td>
              <td style="padding:10px; border:1px solid #ddd; text-align:center; font-size:1.1em; font-weight:bold;">${item.measured_height || '---'}</td>
            </tr>
          </tbody>
        </table>
      `;
    } else {
      if (Array.isArray(parsed.detailsList)) {
        detailsHtml = `
          <table style="width:100%; border-collapse:collapse; margin-top:15px;">
            <thead>
              <tr style="background:#7B5233; color:#fff;">
                <th style="padding:8px; border:1px solid #ddd; width:40px;">STT</th>
                <th style="padding:8px; border:1px solid #ddd;">Tên Chi Tiết / Hạng Mục</th>
                <th style="padding:8px; border:1px solid #ddd; width:100px;">Kết Quả</th>
                <th style="padding:8px; border:1px solid #ddd; width:120px;">Hình Ảnh</th>
              </tr>
            </thead>
            <tbody>
              ${parsed.detailsList.map((d, i) => `
                <tr>
                  <td style="padding:8px; border:1px solid #ddd; text-align:center;">${i+1}</td>
                  <td style="padding:8px; border:1px solid #ddd;">${d.name || 'N/A'}</td>
                  <td style="padding:8px; border:1px solid #ddd; text-align:center; font-weight:bold; color:${d.conclusion === 'pass' ? '#16a34a' : '#dc2626'};">
                    ${d.conclusion === 'pass' ? 'ĐẠT' : 'LỖI'}
                  </td>
                  <td style="padding:8px; border:1px solid #ddd; text-align:center;">
                    ${d.image ? `<img src="${getImageUrl(d.image)}" style="width:60px; height:45px; object-fit:cover; border-radius:4px;" />` : '---'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else if (Array.isArray(parsed.samples)) {
        detailsHtml = `
          <table style="width:100%; border-collapse:collapse; margin-top:15px;">
            <thead>
              <tr style="background:#7B5233; color:#fff;">
                <th style="padding:8px; border:1px solid #ddd; width:50px;">Mẫu</th>
                <th style="padding:8px; border:1px solid #ddd;">Độ Ẩm (%)</th>
                <th style="padding:8px; border:1px solid #ddd;">Kích Thước (mm)</th>
                <th style="padding:8px; border:1px solid #ddd; width:80px;">Kết Quả</th>
              </tr>
            </thead>
            <tbody>
              ${parsed.samples.map((s) => `
                <tr>
                  <td style="padding:8px; border:1px solid #ddd; text-align:center; font-weight:bold;">#${s.stt}</td>
                  <td style="padding:8px; border:1px solid #ddd;">${s.moisture?.values?.join(', ') || 'Chưa đo'}%</td>
                  <td style="padding:8px; border:1px solid #ddd;">${s.size?.thickness ? `${s.size.thickness} x ${s.size.width} x ${s.size.length}` : 'Chưa đo'}</td>
                  <td style="padding:8px; border:1px solid #ddd; text-align:center; font-weight:bold; color:${s.result === 'pass' ? '#16a34a' : '#dc2626'};">
                    ${s.result === 'pass' ? 'ĐẠT' : 'LỖI'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }

    let imagesHtml = '';
    const imagesList = [];
    if (parsed.steps) {
      Object.values(parsed.steps).forEach(st => { if (st.photo) imagesList.push(st.photo); });
    }
    if (Array.isArray(parsed.detailsList)) {
      parsed.detailsList.forEach(det => { if (det.image) imagesList.push(det.image); });
    }
    if (Array.isArray(parsed.samples)) {
      parsed.samples.forEach(s => {
        if (s.moisture?.photo) imagesList.push(s.moisture.photo);
        if (s.size?.photo) imagesList.push(s.size.photo);
      });
    }
    try {
      const parsedImages = typeof item.images_json === 'string' ? JSON.parse(item.images_json || '{}') : (item.images_json || {});
      Object.values(parsedImages).forEach(val => {
        if (Array.isArray(val)) imagesList.push(...val);
      });
    } catch (e) {}

    const uniqueImages = Array.from(new Set(imagesList)).filter(Boolean);
    if (uniqueImages.length > 0) {
      imagesHtml = `
        <div style="margin-top:20px;">
          <div style="font-weight:bold; color:#7B5233; margin-bottom:10px; font-size:14px;">THƯ VIỆN HÌNH ẢNH MINH CHỨNG PHIẾU:</div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            ${uniqueImages.map(img => `<img src="${getImageUrl(img)}" style="width:140px; height:100px; object-fit:cover; border-radius:6px; border:1px solid #ddd;" />`).join('')}
          </div>
        </div>
      `;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) return alert('Vui lòng cho phép bật cửa sổ popup để in PDF!');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu Kiểm Tra QC - ${item.batch_no || item.part_name || item.stage_name || ''}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #7B5233; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #7B5233; text-transform: uppercase; }
          .sub { font-size: 13px; color: #64748b; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #faf6f0; padding: 15px; border-radius: 8px; border: 1px solid #eadcc9; margin-bottom: 20px; }
          .info-item { font-size: 14px; }
          .info-item label { color: #78350f; font-weight: bold; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; text-align: center; }
          .sig-box { width: 45%; }
          .sig-title { font-weight: bold; font-size: 14px; margin-bottom: 60px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 15px; text-align: right;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #7B5233; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
            🖨️ In / Xuất PDF
          </button>
        </div>
        <div class="header">
          <div>
            <div class="title">G7 SMARTFLOW ERP</div>
            <div class="sub">HỆ THỐNG QUẢN LÝ CHẤT LƯỢNG SẢN XUẤT</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 16px; font-weight: bold; color: #7B5233;">PHIẾU KIỂM TRA CHẤT LƯỢNG</div>
            <div style="font-size: 12px; color: #64748b;">Mã phiếu: QC-${item.id} | Ngày: ${formatDisplayDate(item.inspection_date || item.inspected_at)}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item"><label>Loại kiểm tra:</label> ${typeLabel}</div>
          <div class="info-item"><label>QC Thực Hiện:</label> ${item.inspector_name || 'N/A'}</div>
          ${isDaily ? `
            <div class="info-item"><label>Công đoạn:</label> ${item.stage_name || 'N/A'}</div>
            <div class="info-item"><label>Tổng SP kiểm:</label> ${item.total_products || 0}</div>
            <div class="info-item"><label>Tổng lỗi:</label> ${item.total_defects || 0}</div>
            <div class="info-item"><label>Tỉ lệ lỗi:</label> ${(item.defect_rate || 0).toFixed(2)}%</div>
          ` : isInput ? `
            <div class="info-item"><label>Tên linh kiện:</label> ${item.part_name || 'N/A'}</div>
            <div class="info-item"><label>Quy cách:</label> ${item.specification || 'N/A'}</div>
            <div class="info-item"><label>Container/PO:</label> ${item.cont_name || 'N/A'}</div>
            <div class="info-item"><label>Kết luận:</label> <span style="font-weight:bold; color:${item.result === 'Đạt' ? '#16a34a':'#dc2626'}">${item.result || 'N/A'}</span></div>
          ` : `
            <div class="info-item"><label>Mã PO (Lệnh SX):</label> ${item.batch_no || 'N/A'}</div>
            <div class="info-item"><label>Mã Sản Phẩm:</label> ${item.product_sku || 'N/A'}</div>
            <div class="info-item"><label>Kết Luận:</label> <span style="font-weight:bold; color:${item.conclusion === 'pass' ? '#16a34a':'#dc2626'}">${item.conclusion === 'pass' ? 'ĐẠT' : 'LỖI'}</span></div>
          `}
        </div>

        ${item.notes || item.note ? `<div style="background:#fffbeb; padding:10px; border-radius:6px; border:1px solid #fef3c7; margin-bottom:15px; font-size:13px; color:#92400e;"><b>Ghi chú:</b> ${item.notes || item.note}</div>` : ''}

        ${detailsHtml}

        ${imagesHtml}

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-title">NGƯỜI LẬP PHIẾU (QC)</div>
            <div>${item.inspector_name || 'Ký tên'}</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">TRƯỞNG BỘ PHẬN QUẢN LÝ CHẤT LƯỢNG</div>
            <div>Ký tên & Đóng dấu</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          }
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };



  return {
    activeActionMenu,
    activeTab,
    applyDefaultBorders,
    dailyEndDate,
    filterPending24h,
    dailyInspections,
    dailyLimit,
    dailyPage,
    dailySearch,
    dailySort,
    dailyStartDate,
    defectTypesMap,
    exportPoCode,
    fetchData,
    fetchImageBase64,
    filteredDailyList,
    filteredInboundList,
    filteredProcessList,
    filteredStageList,
    formatDisplayDate,
    formatDisplayDateTime,
    formatExcelHeader,
    getDisplayInspector,
    getImageUrl,
    handleExportCurrentList,
    handleExportDetailedPO,
    handleExportQualitySummary,
    handleExportSingleExcel,
    handleExportSinglePDF,
    handleImageError,
    handleResetFilters,
    inboundEndDate,
    inboundLimit,
    inboundPage,
    inboundSearch,
    inboundSort,
    inboundStartDate,
    inboundStatusFilter,
    isExporting,
    isFilterBarOpen,
    lightboxImage,
    loading,
    paginatedDailyList,
    paginatedInboundList,
    paginatedProcessList,
    paginatedStageList,
    renderActionDropdown,
    screenCode,
    selectedDaily,
    selectedExportOption,
    selectedInbound,
    selectedInspection,
    setActiveActionMenu,
    setActiveTab,
    setCustomScreenCode,
    setCustomSubtitle,
    setCustomTitle,
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
    setStageTypeFilter,
    showExportModal,
    stageEndDate,
    stageInspections,
    stageLimit,
    stagePage,
    stageSearch,
    stageSort,
    stageStartDate,
    stageStatusFilter,
    stageStageFilter,
    setStageStageFilter,
    stageTypeFilter,
    uniqueStages,
    styleTableHeaderRow,
    subtitle,
    title,
    totalDailyPages,
    totalInboundPages,
    totalProcessPages,
    totalStagePages,
    triggerFileDownload,
    uniquePoList,
    filteredUnifiedList,
    paginatedUnifiedList,
    totalUnifiedPages,
    unifiedPage,
    setUnifiedPage,
    unifiedLimit,
    setUnifiedLimit,
  };
};
