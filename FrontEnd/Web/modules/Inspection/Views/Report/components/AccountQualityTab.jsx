import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Users,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Layers,
  ArrowUpDown,
  Filter,
  Eye,
  Clock,
  ShieldCheck,
  Calendar,
  CalendarDays,
  CheckCheck,
  Loader2,
  Briefcase
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import AccountPendingTicketsDrawer from './AccountPendingTicketsDrawer';

const AccountQualityTab = ({
  pendingTasks = [],
  onSelectTask,
  refreshTrigger = 0,
  onUpdateAccountCount,
  isParameterMode = false,
}) => {
  // Lọc theo thời gian (Hôm nay, Tuần này, Tháng này, Tất cả, hoặc Tùy chọn)
  const [timePeriod, setTimePeriod] = useState('today'); // 'all' | 'today' | 'week' | 'month' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Danh sách toàn bộ phiếu và tài khoản tải từ CSDL
  const [allTickets, setAllTickets] = useState([]);
  const [rawAccounts, setRawAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc tìm kiếm & sắp xếp
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [sortOption, setSortOption] = useState('pending_desc');
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  // Reset trang khi bộ lọc thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStage, sortOption, pageSize, timePeriod]);

  // Tải danh sách toàn bộ phiếu và tài khoản từ Backend
  const fetchAllData = useCallback(async (period = timePeriod, sDate = customStartDate, eDate = customEndDate) => {
    setLoading(true);
    try {
      let url = '/inspections/all-tickets';
      const params = [];
      if (period && period !== 'all' && period !== 'custom') {
        params.push(`period=${period}`);
      } else if (period === 'custom') {
        if (sDate) params.push(`start_date=${sDate}`);
        if (eDate) params.push(`end_date=${eDate}`);
      }
      if (params.length > 0) {
        url += '?' + params.join('&');
      }

      const [ticketsRes, accountsRes] = await Promise.all([
        api.get(url).catch(err => {
          console.warn('Không thể tải /inspections/all-tickets:', err);
          return [];
        }),
        rawAccounts.length === 0 ? api.get('/accounts/?page=1&size=1000').catch(err => {
          console.warn('Không thể tải /accounts:', err);
          return { items: [] };
        }) : Promise.resolve(null)
      ]);

      const tList = Array.isArray(ticketsRes) ? ticketsRes : (ticketsRes?.data && Array.isArray(ticketsRes.data) ? ticketsRes.data : []);
      setAllTickets(tList);

      if (accountsRes) {
        const aList = accountsRes?.items || accountsRes?.data?.items || (Array.isArray(accountsRes) ? accountsRes : []);
        setRawAccounts(aList);
      }
    } catch (e) {
      console.error('Lỗi khi tải dữ liệu kiểm tra viên:', e);
    } finally {
      setLoading(false);
    }
  }, [timePeriod, customStartDate, customEndDate, rawAccounts.length]);

  useEffect(() => {
    fetchAllData(timePeriod, customStartDate, customEndDate);
  }, [timePeriod, refreshTrigger]);

  // Lọc chỉ lấy tài khoản thuộc QLCL (Trừ Ban Giám Đốc, IT, NVSX, Kế toán)
  const qlclAccounts = useMemo(() => {
    if (!Array.isArray(rawAccounts) || rawAccounts.length === 0) return [];

    return rawAccounts.filter(acc => {
      const dept = (acc.department_name || '').toLowerCase();
      const perm = (acc.permission_level || '').toLowerCase();
      const role = (acc.role_name || '').toLowerCase();
      const uname = (acc.username || '').toLowerCase();

      // 1. Loại trừ Ban Giám Đốc (Giám Đốc, GĐ, BGĐ, Admin)
      if (
        dept.includes('giám đốc') ||
        dept.includes('gđ') ||
        dept.includes('bgd') ||
        dept.includes('ban giám đốc') ||
        uname.includes('admin')
      ) {
        return false;
      }

      // 2. Loại trừ IT (Công nghệ thông tin)
      if (
        dept.includes('it') ||
        dept.includes('cntt') ||
        dept.includes('công nghệ thông tin')
      ) {
        return false;
      }

      // 3. Loại trừ NVSX (Nhân viên sản xuất) / Sản xuất
      if (
        perm === 'nvsx' ||
        dept.includes('sản xuất') ||
        dept.includes('sx')
      ) {
        return false;
      }

      // 4. Loại trừ Kế toán, Nhân sự nếu có
      if (dept.includes('kế toán') || dept.includes('nhân sự')) {
        return false;
      }

      // 5. Chỉ lấy tài khoản thuộc QLCL (QC, QA, Kiểm Soát, Kiểm Tra, QLCL, Chất lượng, KCS)
      const isQc = (
        dept.includes('qc') || dept.includes('qa') || dept.includes('kiểm') || dept.includes('chất lượng') || dept.includes('qlcl') || dept.includes('kcs') ||
        perm.includes('qc') || perm.includes('qa') || perm.includes('kiểm') || perm.includes('chất lượng') || perm.includes('qlcl') ||
        role.includes('qc') || role.includes('qa') || role.includes('kiểm') || role.includes('chất lượng') || role.includes('qlcl')
      );

      return isQc;
    });
  }, [rawAccounts]);

  // Tổng hợp dữ liệu theo từng tài khoản kiểm tra viên
  const accountStats = useMemo(() => {
    const groups = {};

    // 1. Khởi tạo toàn bộ tài khoản QLCL trước (kể cả chưa có phiếu nào để hiện 0/0)
    qlclAccounts.forEach(acc => {
      const name = (acc.full_name || acc.username || '').trim();
      if (!name) return;
      groups[name] = {
        name,
        username: acc.username,
        department: acc.department_name || '',
        permissionLevel: acc.permission_level || '',
        tasks: [],
        total: 0,
        pendingCount: 0,
        confirmedCount: 0,
        passCount: 0,
        failCount: 0,
        returnCount: 0,
        quarantineCount: 0,
        totalErrors: 0,
        stages: new Set(),
        latestDate: null,
        latestTask: null,
      };
    });

    // Helper tìm nhóm theo tên kiểm tra viên
    const findGroup = (inspectorName) => {
      if (!inspectorName) return null;
      const clean = inspectorName.trim();
      if (groups[clean]) return groups[clean];

      const lower = clean.toLowerCase();
      for (const key of Object.keys(groups)) {
        const g = groups[key];
        if (key.toLowerCase() === lower || (g.username && g.username.toLowerCase() === lower)) {
          return g;
        }
      }
      return null;
    };

    // 2. Phân bổ phiếu kiểm tra vào các nhóm
    const rawTickets = Array.isArray(allTickets) && allTickets.length > 0 ? allTickets : pendingTasks;
    const safeTickets = rawTickets.filter(task => {
      if (!task) return false;

      let dj = null;
      if (task.data_json) {
        try {
          dj = typeof task.data_json === 'string' ? JSON.parse(task.data_json) : task.data_json;
        } catch (e) {}
      }

      const rawType = String(task.inspection_type || dj?.mode || dj?.inspection_type || '').toLowerCase().trim();
      const rawCat = String(task.category || '').toLowerCase().trim();

      let isParam = false;
      const isOtherExplicit = (
        rawType.includes('first_sample') || rawType.includes('mẫu đầu') || rawType.includes('mau-dau') || rawType.includes('mẫu-đầu') ||
        rawType.includes('daily') || rawType.includes('hang-ngay') || rawType.includes('hằng ngày') ||
        rawType.includes('re_inspect') || rawType.includes('tai-kiem') || rawType.includes('tái kiểm') || rawType.includes('reinspect') ||
        rawType.includes('process') || rawType.includes('quy-trinh') || rawType.includes('quy trình') ||
        rawType.includes('qa') || rawType.includes('vấn đáp') || rawType.includes('van-dap') ||
        rawType.includes('nhap-kho') || rawType.includes('nhập kho') || rawType.includes('dau-vao') || rawType.includes('đầu vào') || rawType.includes('input')
      );

      if (!isOtherExplicit) {
        if (
          rawType === 'parameter' ||
          rawType.includes('parameter') ||
          rawType.includes('thông số') ||
          rawType.includes('thong-so') ||
          rawCat.includes('thông số') ||
          rawCat.includes('thong-so') ||
          rawCat.includes('parameter') ||
          dj?.mode === 'parameter' ||
          dj?.inspection_type === 'parameter'
        ) {
          isParam = true;
        }
      }

      return isParameterMode ? isParam : !isParam;
    });
    safeTickets.forEach(task => {
      const inspectorName = (task.inspector_name || 'QC Hệ thống').trim();
      let g = findGroup(inspectorName);

      if (!g) {
        const lowerInsp = inspectorName.toLowerCase();
        // Bỏ qua tài khoản hệ thống hoặc giám đốc
        if (lowerInsp.includes('admin') || lowerInsp.includes('giám đốc') || lowerInsp.includes('gđ')) {
          return;
        }
        groups[inspectorName] = {
          name: inspectorName,
          username: '',
          department: 'Phòng QLCL',
          permissionLevel: 'Kiểm tra viên',
          tasks: [],
          total: 0,
          pendingCount: 0,
          confirmedCount: 0,
          passCount: 0,
          failCount: 0,
          returnCount: 0,
          quarantineCount: 0,
          totalErrors: 0,
          stages: new Set(),
          latestDate: null,
          latestTask: null,
        };
        g = groups[inspectorName];
      }

      g.tasks.push(task);
      g.total += 1;

      const isConfirmed = task.is_confirmed === true;
      if (isConfirmed) {
        g.confirmedCount += 1;
      } else {
        g.pendingCount += 1;
      }

      const isPass = task.result === 'pass' || task.result === 'Đạt' || task.result === 'excellent';
      if (isPass) {
        g.passCount += 1;
      } else {
        g.failCount += 1;
      }

      if (task.action === 'tra-ve') g.returnCount += 1;
      if (task.action === 'cach-ly') g.quarantineCount += 1;
      if (Number(task.error_qty) > 0) g.totalErrors += Number(task.error_qty);
      if (task.stage) g.stages.add(task.stage);

      const d = new Date(task.recorded_date || task.completion_date);
      if (!isNaN(d.getTime())) {
        if (!g.latestDate || d > g.latestDate) {
          g.latestDate = d;
          g.latestTask = task;
        }
      }
    });

    return Object.values(groups)
      .filter(g => g.total > 0)
      .map(g => {
        const defectRate = g.total > 0 ? ((g.failCount / g.total) * 100).toFixed(1) : '0.0';
        const returnRate = g.total > 0 ? ((g.returnCount / g.total) * 100).toFixed(1) : '0.0';
        return {
          ...g,
          defectRate: Number(defectRate),
          returnRate: Number(returnRate),
          stagesList: Array.from(g.stages),
        };
      });
  }, [qlclAccounts, allTickets, pendingTasks]);

  // Cập nhật số lượng tài khoản QLCL có phát sinh phiếu lên View cha
  useEffect(() => {
    if (onUpdateAccountCount && accountStats.length > 0) {
      onUpdateAccountCount(accountStats.length);
    }
  }, [accountStats.length, onUpdateAccountCount]);

  // Danh sách công đoạn duy nhất cho bộ lọc
  const allStages = useMemo(() => {
    const s = new Set();
    accountStats.forEach(acc => {
      acc.stagesList.forEach(st => s.add(st));
    });
    return Array.from(s).sort();
  }, [accountStats]);

  // Các tùy chọn sắp xếp cho PageToolbar
  const sortOptions = [
    { value: 'pending_desc', label: 'Nhiều phiếu chờ duyệt nhất' },
    { value: 'total_desc', label: 'Nhiều tổng phiếu nhất' },
    { value: 'total_asc', label: 'Ít tổng phiếu nhất' },
    { value: 'defect_desc', label: 'Tỷ lệ lỗi cao nhất' },
    { value: 'return_desc', label: 'Tỷ lệ trả hàng cao nhất' },
    { value: 'name_asc', label: 'Tên kiểm tra viên (A-Z)' },
    { value: 'name_desc', label: 'Tên kiểm tra viên (Z-A)' },
  ];

  // Đếm số lượng bộ lọc đang hoạt động
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedStage !== 'all') count += 1;
    if (pageSize !== 30) count += 1;
    if (timePeriod !== 'today') count += 1;
    return count;
  }, [selectedStage, pageSize, timePeriod]);

  const handleResetFilters = () => {
    setSelectedStage('all');
    setTimePeriod('today');
    setCustomStartDate('');
    setCustomEndDate('');
    setPageSize(30);
    setCurrentPage(1);
  };

  // Lọc và Sắp xếp danh sách tài khoản
  const filteredAccounts = useMemo(() => {
    let list = [...accountStats];

    // 1. Lọc theo từ khóa tìm kiếm (tên kiểm tra viên hoặc công đoạn)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(acc =>
        acc.name.toLowerCase().includes(q) ||
        (acc.department && acc.department.toLowerCase().includes(q)) ||
        acc.stagesList.some(s => s.toLowerCase().includes(q))
      );
    }

    // 2. Lọc theo công đoạn
    if (selectedStage !== 'all') {
      list = list.filter(acc => acc.stagesList.includes(selectedStage));
    }

    // 3. Sắp xếp
    list.sort((a, b) => {
      if (sortOption === 'pending_desc') {
        if (b.pendingCount !== a.pendingCount) return b.pendingCount - a.pendingCount;
        return b.total - a.total;
      }
      if (sortOption === 'total_desc') {
        if (b.total !== a.total) return b.total - a.total;
        return b.pendingCount - a.pendingCount;
      }
      if (sortOption === 'total_asc') return a.total - b.total;
      if (sortOption === 'defect_desc') return b.defectRate - a.defectRate;
      if (sortOption === 'return_desc') return b.returnRate - a.returnRate;
      if (sortOption === 'name_asc') return a.name.localeCompare(b.name, 'vi');
      if (sortOption === 'name_desc') return b.name.localeCompare(a.name, 'vi');
      return 0;
    });

    return list;
  }, [accountStats, searchQuery, selectedStage, sortOption]);

  // Phân trang
  const totalAccounts = filteredAccounts.length;
  const totalPages = Math.max(1, Math.ceil(totalAccounts / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedAccounts = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, safeCurrentPage, pageSize]);

  // Chỉ số KPI tổng quan
  const summaryMetrics = useMemo(() => {
    const totalInspectors = accountStats.length;
    const inspectorsWithTickets = accountStats.filter(a => a.total > 0).length;
    const safeTickets = Array.isArray(allTickets) && allTickets.length > 0 ? allTickets : pendingTasks;
    const totalTickets = safeTickets.length;
    const totalPending = safeTickets.filter(t => !t.is_confirmed).length;
    const totalFails = safeTickets.filter(t => t.result !== 'pass' && t.result !== 'Đạt' && t.result !== 'excellent').length;
    const totalReturns = safeTickets.filter(t => t.action === 'tra-ve' || t.action === 'cach-ly').length;

    const avgDefectRate = totalTickets > 0 ? ((totalFails / totalTickets) * 100).toFixed(1) : '0.0';
    const avgReturnRate = totalTickets > 0 ? ((totalReturns / totalTickets) * 100).toFixed(1) : '0.0';

    return {
      totalInspectors,
      inspectorsWithTickets,
      totalTickets,
      totalPending,
      totalFails,
      totalReturns,
      avgDefectRate,
      avgReturnRate,
    };
  }, [accountStats, allTickets, pendingTasks]);

  const handleOpenAccountDrawer = (account) => {
    setSelectedAccount(account);
    setIsDrawerOpen(true);
  };

  // Cập nhật lại account đang mở trong Drawer khi data thay đổi
  const currentOpenAccount = useMemo(() => {
    if (!selectedAccount) return null;
    return accountStats.find(a => a.name === selectedAccount.name) || selectedAccount;
  }, [accountStats, selectedAccount]);

  const renderPageNumbers = () => {
    const pages = [];
    const delta = 1;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safeCurrentPage - delta && i <= safeCurrentPage + delta)) {
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
          type="button"
          className={`page-btn ${safeCurrentPage === p ? 'active' : ''}`}
          onClick={() => setCurrentPage(p)}
          style={{
            minWidth: '28px',
            height: '28px',
            borderRadius: '6px',
            fontWeight: '700',
            fontSize: '0.8rem',
            cursor: 'pointer',
            border: safeCurrentPage === p ? '1px solid #7B5233' : '1px solid #EADCC9',
            backgroundColor: safeCurrentPage === p ? '#7B5233' : '#FFFFFF',
            color: safeCurrentPage === p ? '#FFFFFF' : '#7B5233',
            transition: 'all 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {p}
        </button>
      );
    });
  };

  return (
    <div className="account-quality-container">
      {/* Responsive Stylesheet */}
      <style dangerouslySetInnerHTML={{ __html: `
        .account-quality-container {
          display: flex;
          flex-direction: column;
          flex: 1 1 0%;
          min-height: 0;
          height: 100%;
          overflow: hidden;
        }
        .account-desktop-view {
          display: flex !important;
          flex-direction: column;
          flex: 1 1 0%;
          min-height: 0;
          height: 100%;
          overflow: hidden;
        }
        .account-mobile-view {
          display: none;
        }
        .account-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 8px;
        }
        @media (max-width: 1024px) {
          .account-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 768px), (max-width: 480px) {
          .account-quality-container {
            display: block !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
          }
          .account-desktop-view {
            display: none !important;
          }
          .account-mobile-view {
            display: flex !important;
            flex-direction: column;
            gap: 10px;
            padding-bottom: 90px !important;
          }
          .account-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 6px !important;
            margin-bottom: 6px !important;
          }
          .account-kpi-card {
            padding: 6px 8px !important;
            gap: 8px !important;
            border-radius: 8px !important;
          }
          .account-kpi-icon {
            width: 28px !important;
            height: 28px !important;
            border-radius: 6px !important;
            flex-shrink: 0 !important;
          }
          .account-kpi-icon svg {
            width: 14px !important;
            height: 14px !important;
          }
          .account-kpi-label {
            font-size: 0.62rem !important;
            line-height: 1.15 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .account-kpi-val {
            font-size: 0.95rem !important;
            line-height: 1.15 !important;
          }
          .account-sticky-top-zone {
            position: -webkit-sticky !important;
            position: sticky !important;
            top: 48px !important;
            z-index: 55 !important;
            background-color: #FAF7F2 !important;
            padding-top: 4px !important;
            padding-bottom: 4px !important;
            margin-bottom: 8px !important;
            box-shadow: 0 4px 10px rgba(45, 26, 18, 0.05) !important;
          }
          .account-sticky-top-zone .page-toolbar {
            margin-bottom: 0 !important;
          }
          .pagination-mobile-sticky {
            display: flex !important;
            position: fixed !important;
            bottom: 20px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            margin: 0 !important;
            max-width: fit-content !important;
            background: rgba(255, 255, 255, 0.96) !important;
            backdrop-filter: blur(10px) !important;
            -webkit-backdrop-filter: blur(10px) !important;
            border: 1px solid #EADCC9 !important;
            border-radius: 100px !important;
            box-shadow: 0 4px 20px rgba(123, 82, 51, 0.22) !important;
            padding: 8px 18px !important;
            justify-content: center !important;
            align-items: center !important;
            gap: 16px !important;
            z-index: 9999 !important;
            width: auto !important;
            pointer-events: auto !important;
          }
          .pagination-mobile-sticky .page-btn {
            width: 32px !important;
            height: 32px !important;
            border-radius: 50% !important;
            background-color: #FAF5EE !important;
            border: 1px solid #D6C7B2 !important;
            color: #7B5233 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            padding: 0 !important;
          }
          .pagination-mobile-sticky .page-btn:disabled {
            opacity: 0.35 !important;
            cursor: not-allowed !important;
          }
        }
      ` }} />

      {/* TOP FIXED ZONE (KPI Cards & Search Toolbar + Time Filter) */}
      <div className="account-sticky-top-zone" style={{ flexShrink: 0, marginBottom: '8px' }}>
        {/* 1. KPI Top Summary Cards */}
        <div className="account-kpi-grid">
          {/* Card 1: Tổng kiểm tra viên QLCL */}
          <div className="account-kpi-card" style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #EADCC9',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 1px 3px rgba(45, 26, 18, 0.03)'
          }}>
            <div className="account-kpi-icon" style={{
              width: '34px',
              height: '34px',
              borderRadius: '7px',
              backgroundColor: '#FAF5EE',
              color: '#7B5233',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: '1px solid #EADCC9'
            }}>
              <Users size={17} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="account-kpi-label" style={{ fontSize: '0.7rem', color: '#78716C', fontWeight: '700', textTransform: 'uppercase' }}>
                Kiểm tra viên (QLCL)
              </div>
              <div className="account-kpi-val" style={{ fontSize: '1.15rem', fontWeight: '800', color: '#2D1A12', lineHeight: 1.2 }}>
                {summaryMetrics.totalInspectors} <span className="account-kpi-sub" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#A8A29E' }}>người</span>
              </div>
            </div>
          </div>

          {/* Card 2: Chờ duyệt / Tổng phiếu */}
          <div className="account-kpi-card" style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #EADCC9',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 1px 3px rgba(45, 26, 18, 0.03)'
          }}>
            <div className="account-kpi-icon" style={{
              width: '34px',
              height: '34px',
              borderRadius: '7px',
              backgroundColor: summaryMetrics.totalPending > 0 ? '#FEF3C7' : '#EFF6FF',
              color: summaryMetrics.totalPending > 0 ? '#D97706' : '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: `1px solid ${summaryMetrics.totalPending > 0 ? '#FDE68A' : '#BFDBFE'}`
            }}>
              <Layers size={17} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="account-kpi-label" style={{ fontSize: '0.7rem', color: '#78716C', fontWeight: '700', textTransform: 'uppercase' }}>
                Chờ duyệt / Tổng phiếu
              </div>
              <div className="account-kpi-val" style={{ fontSize: '1.15rem', fontWeight: '800', color: '#1E293B', lineHeight: 1.2 }}>
                <span style={{ color: summaryMetrics.totalPending > 0 ? '#D97706' : '#15803D' }}>{summaryMetrics.totalPending}</span>
                <span style={{ color: '#94A3B8', margin: '0 3px', fontWeight: '600' }}>/</span>
                <span>{summaryMetrics.totalTickets}</span>
                <span className="account-kpi-sub" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748B', marginLeft: '3px' }}>phiếu</span>
              </div>
            </div>
          </div>

          {/* Card 3: Tỷ lệ lỗi */}
          <div className="account-kpi-card" style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #EADCC9',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 1px 3px rgba(45, 26, 18, 0.03)'
          }}>
            <div className="account-kpi-icon" style={{
              width: '34px',
              height: '34px',
              borderRadius: '7px',
              backgroundColor: summaryMetrics.totalFails > 0 ? '#FEF2F2' : '#F0FDF4',
              color: summaryMetrics.totalFails > 0 ? '#DC2626' : '#15803D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: `1px solid ${summaryMetrics.totalFails > 0 ? '#FECACA' : '#BBF7D0'}`
            }}>
              <AlertTriangle size={17} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="account-kpi-label" style={{ fontSize: '0.7rem', color: '#78716C', fontWeight: '700', textTransform: 'uppercase' }}>
                Tỷ lệ lỗi
              </div>
              <div className="account-kpi-val" style={{ fontSize: '1.15rem', fontWeight: '800', color: summaryMetrics.totalFails > 0 ? '#DC2626' : '#15803D', lineHeight: 1.2 }}>
                {summaryMetrics.avgDefectRate}% <span className="account-kpi-sub" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#A8A29E' }}>({summaryMetrics.totalFails})</span>
              </div>
            </div>
          </div>

          {/* Card 4: Tỷ lệ trả hàng / cách ly */}
          <div className="account-kpi-card" style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #EADCC9',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 1px 3px rgba(45, 26, 18, 0.03)'
          }}>
            <div className="account-kpi-icon" style={{
              width: '34px',
              height: '34px',
              borderRadius: '7px',
              backgroundColor: summaryMetrics.totalReturns > 0 ? '#FFFBEB' : '#F8FAFC',
              color: summaryMetrics.totalReturns > 0 ? '#D97706' : '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: `1px solid ${summaryMetrics.totalReturns > 0 ? '#FDE68A' : '#E2E8F0'}`
            }}>
              <RotateCcw size={17} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="account-kpi-label" style={{ fontSize: '0.7rem', color: '#78716C', fontWeight: '700', textTransform: 'uppercase' }}>
                Tỷ lệ trả hàng / cách ly
              </div>
              <div className="account-kpi-val" style={{ fontSize: '1.15rem', fontWeight: '800', color: summaryMetrics.totalReturns > 0 ? '#D97706' : '#64748B', lineHeight: 1.2 }}>
                {summaryMetrics.avgReturnRate}% <span className="account-kpi-sub" style={{ fontSize: '0.75rem', fontWeight: '600', color: '#A8A29E' }}>({summaryMetrics.totalReturns})</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Thanh lọc thời gian nhanh (Ngày, Tuần, Tháng, Tất cả) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '8px',
          flexWrap: 'wrap'
        }}>
          {/* Cụm nút bấm chọn nhanh thời gian */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #EADCC9',
            borderRadius: '8px',
            padding: '3px 5px',
            overflowX: 'auto',
            maxWidth: '100%'
          }}>
            <span style={{
              fontSize: '0.74rem',
              fontWeight: '700',
              color: '#7B5233',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0 6px',
              whiteSpace: 'nowrap'
            }}>
              <Calendar size={13} /> Lọc thời gian:
            </span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'today', label: 'Hôm nay' },
              { id: 'week', label: 'Tuần này' },
              { id: 'month', label: 'Tháng này' },
            ].map(p => {
              const active = timePeriod === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTimePeriod(p.id)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '0.76rem',
                    fontWeight: active ? '800' : '600',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: active ? '#7B5233' : 'transparent',
                    color: active ? '#FFFFFF' : '#64748B',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Nhãn thông báo phạm vi dữ liệu */}
          <div style={{ fontSize: '0.75rem', color: '#8C827A', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span>Hiển thị tất cả tài khoản QLCL</span>
            <span style={{ color: '#D6C7B2' }}>•</span>
            <span>{filteredAccounts.length} kiểm tra viên</span>
          </div>
        </div>

        {/* 3. PageToolbar chuẩn hệ thống */}
        <PageToolbar
          searchValue={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          searchPlaceholder="Tìm theo tên kiểm tra viên, phòng ban, công đoạn..."
          showSort={true}
          sortOptions={sortOptions}
          sortValue={sortOption}
          onSortChange={(val) => {
            setSortOption(val);
            setCurrentPage(1);
          }}
          showFilter={true}
          isFilterOpen={isFilterBarOpen}
          onFilterToggle={() => setIsFilterBarOpen(prev => !prev)}
          activeFiltersCount={activeFiltersCount}
        />

        {/* 4. Inline Expandable Filter Bar */}
        {isFilterBarOpen && (
          <div className="filter-inline-bar quality-filter-bar" style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'flex-end',
            backgroundColor: '#FFFDF9',
            border: '1px solid #EADCC9',
            borderRadius: '12px',
            padding: '12px 14px',
            marginTop: '8px',
            boxShadow: '0 2px 8px rgba(45, 26, 18, 0.04)'
          }}>
            {/* Kỳ thời gian */}
            <div className="filter-field-group" style={{ minWidth: '150px', flex: '1 1 150px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', color: '#7B5233', fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>
                Kỳ thời gian
              </label>
              <select
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                className="filter-dropdown-input"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #EADCC9', padding: '0 10px', backgroundColor: '#fff', color: '#2D1A12', fontSize: '0.85rem' }}
              >
                <option value="all">Tất cả thời gian</option>
                <option value="today">Hôm nay</option>
                <option value="week">Tuần này</option>
                <option value="month">Tháng này</option>
                <option value="custom">Tùy chọn ngày</option>
              </select>
            </div>

            {/* Từ ngày / Đến ngày nếu chọn tùy chọn */}
            {timePeriod === 'custom' && (
              <>
                <div className="filter-field-group" style={{ minWidth: '140px', flex: '1 1 140px' }}>
                  <label className="filter-field-label" style={{ fontWeight: '700', color: '#7B5233', fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #EADCC9', padding: '0 8px', backgroundColor: '#fff', color: '#2D1A12', fontSize: '0.82rem' }}
                  />
                </div>
                <div className="filter-field-group" style={{ minWidth: '140px', flex: '1 1 140px' }}>
                  <label className="filter-field-label" style={{ fontWeight: '700', color: '#7B5233', fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #EADCC9', padding: '0 8px', backgroundColor: '#fff', color: '#2D1A12', fontSize: '0.82rem' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => fetchAllData('custom', customStartDate, customEndDate)}
                    style={{
                      height: '36px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      backgroundColor: '#7B5233',
                      color: '#fff',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Áp dụng ngày
                  </button>
                </div>
              </>
            )}

            {/* Công đoạn */}
            <div className="filter-field-group" style={{ minWidth: '160px', flex: '1 1 160px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', color: '#7B5233', fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>
                Công đoạn
              </label>
              <select
                value={selectedStage}
                onChange={(e) => {
                  setSelectedStage(e.target.value);
                  setCurrentPage(1);
                }}
                className="filter-dropdown-input"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #EADCC9', padding: '0 10px', backgroundColor: '#fff', color: '#2D1A12', fontSize: '0.85rem' }}
              >
                <option value="all">Tất cả công đoạn</option>
                {allStages.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Số lượng dòng trong trang */}
            <div className="filter-field-group" style={{ minWidth: '160px', flex: '1 1 160px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', color: '#7B5233', fontSize: '0.8rem', marginBottom: '4px', display: 'block' }}>
                Số lượng dòng trên trang
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="filter-dropdown-input"
                style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #EADCC9', padding: '0 10px', backgroundColor: '#fff', color: '#2D1A12', fontSize: '0.85rem' }}
              >
                <option value={10}>10 dòng / trang</option>
                <option value={20}>20 dòng / trang</option>
                <option value={30}>30 dòng / trang</option>
                <option value={50}>50 dòng / trang</option>
                <option value={100}>100 dòng / trang</option>
              </select>
            </div>

            {/* Nút xóa lọc */}
            {activeFiltersCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    height: '36px',
                    padding: '0 14px',
                    borderRadius: '8px',
                    border: '1px dashed #E0D6CB',
                    backgroundColor: '#FAF6F0',
                    color: '#8B5E3C',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Xóa lọc ({activeFiltersCount})</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Loading State hoặc Content */}
      {loading ? (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #EADCC9',
          textAlign: 'center',
          padding: '60px 16px',
          color: '#7B5233'
        }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 10px', color: '#7B5233' }} />
          <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Đang nạp dữ liệu kiểm tra viên & phiếu kiểm tra...</div>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #EADCC9',
          textAlign: 'center',
          padding: '48px 16px',
          color: '#94A3B8'
        }}>
          <Users size={40} style={{ opacity: 0.35, marginBottom: '8px' }} />
          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.94rem', fontWeight: '700', color: '#64748B' }}>
            Không tìm thấy kiểm tra viên phù hợp
          </h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#94A3B8' }}>
            Vui lòng thử đổi từ khóa tìm kiếm hoặc bấm nút xóa bộ lọc.
          </p>
        </div>
      ) : (
        <>
          {/* 6A. DESKTOP VIEW: Bảng thống kê chuẩn gold-layout */}
          <div className="admin-list-layout account-desktop-view">
            <div className="mgmt-table card admin-table-card">
              <div className="table-responsive admin-table-scroll">
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 14px' }}>Kiểm tra viên / Tài khoản</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Phiếu chờ duyệt / Tổng phiếu</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Đạt / Lỗi</th>
                      <th style={{ padding: '8px 14px', minWidth: '150px' }}>Tỷ lệ lỗi</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Tỷ lệ trả hàng</th>
                      <th style={{ padding: '8px 12px' }}>Công đoạn phụ trách</th>
                      <th style={{ padding: '8px 14px', textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAccounts.map((acc) => {
                      const errorColor = acc.defectRate === 0
                        ? '#16A34A'
                        : (acc.defectRate < 10 ? '#D97706' : '#DC2626');

                      return (
                        <tr
                          key={acc.name}
                          onClick={() => handleOpenAccountDrawer(acc)}
                          style={{
                            cursor: 'pointer',
                            transition: 'background-color 0.12s ease',
                          }}
                        >
                          {/* Cột 1: Tên kiểm tra viên & Phòng ban */}
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: '#F5ECE2',
                                color: '#7B5233',
                                border: '1px solid #E4D3C0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                                fontSize: '0.85rem',
                                flexShrink: 0
                              }}>
                                {acc.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: '700', color: '#2D1A12', fontSize: '0.86rem' }}>
                                    {acc.name}
                                  </span>
                                  {acc.total === 0 && (
                                    <span style={{
                                      fontSize: '0.65rem',
                                      fontWeight: '600',
                                      color: '#8C827A',
                                      backgroundColor: '#F1F5F9',
                                      padding: '1px 5px',
                                      borderRadius: '4px'
                                    }}>
                                      Chưa có phiếu
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#8C827A', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  {acc.department && (
                                    <span style={{ color: '#7B5233', fontWeight: '600' }}>
                                      {acc.department}
                                    </span>
                                  )}
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <Clock size={11} style={{ opacity: 0.7 }} />
                                    <span>{acc.latestDate ? acc.latestDate.toLocaleDateString('vi-VN') : '—'}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Cột 2: Phiếu chờ duyệt / Tổng phiếu */}
                          <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <span
                                title="Phiếu chờ duyệt"
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  backgroundColor: acc.pendingCount > 0 ? '#FEF3C7' : '#F8FAFC',
                                  color: acc.pendingCount > 0 ? '#B45309' : '#64748B',
                                  border: `1px solid ${acc.pendingCount > 0 ? '#FDE68A' : '#E2E8F0'}`,
                                  fontWeight: '800',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {acc.pendingCount}
                              </span>
                              <span style={{ color: '#94A3B8', fontWeight: '700', fontSize: '0.8rem' }}>/</span>
                              <span
                                title="Tổng số phiếu"
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  backgroundColor: acc.total > 0 ? '#EFF6FF' : '#F8FAFC',
                                  color: acc.total > 0 ? '#1D4ED8' : '#64748B',
                                  border: `1px solid ${acc.total > 0 ? '#BFDBFE' : '#E2E8F0'}`,
                                  fontWeight: '800',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {acc.total}
                              </span>
                            </div>
                          </td>

                          {/* Cột 3: Đạt / Lỗi */}
                          <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                            {acc.total > 0 ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#DCFCE7',
                                  color: '#15803D',
                                  fontWeight: '700',
                                  fontSize: '0.73rem'
                                }}>
                                  {acc.passCount} Đạt
                                </span>
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#FEE2E2',
                                  color: '#DC2626',
                                  fontWeight: '700',
                                  fontSize: '0.73rem'
                                }}>
                                  {acc.failCount} Lỗi
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: '#CBD5E1', fontSize: '0.78rem' }}>—</span>
                            )}
                          </td>

                          {/* Cột 4: Tỷ lệ lỗi */}
                          <td style={{ padding: '10px 14px' }}>
                            {acc.total > 0 ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  flex: 1,
                                  height: '6px',
                                  backgroundColor: '#E2E8F0',
                                  borderRadius: '3px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    width: `${Math.min(acc.defectRate, 100)}%`,
                                    height: '100%',
                                    backgroundColor: errorColor,
                                    borderRadius: '3px',
                                    transition: 'width 0.3s ease'
                                  }} />
                                </div>
                                <span style={{
                                  minWidth: '38px',
                                  fontWeight: '700',
                                  fontSize: '0.78rem',
                                  color: errorColor
                                }}>
                                  {acc.defectRate}%
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: '#CBD5E1', fontSize: '0.78rem' }}>—</span>
                            )}
                          </td>

                          {/* Cột 5: Tỷ lệ trả hàng */}
                          <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                            {acc.total > 0 ? (
                              acc.returnCount > 0 ? (
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#FFFBEB',
                                  color: '#B45309',
                                  border: '1px solid #FDE68A',
                                  fontWeight: '700',
                                  fontSize: '0.73rem'
                                }}>
                                  {acc.returnRate}% <span style={{ fontWeight: '500', fontSize: '0.68rem' }}>({acc.returnCount})</span>
                                </span>
                              ) : (
                                <span style={{ color: '#A8A29E', fontSize: '0.75rem' }}>0%</span>
                              )
                            ) : (
                              <span style={{ color: '#CBD5E1', fontSize: '0.78rem' }}>—</span>
                            )}
                          </td>

                          {/* Cột 6: Công đoạn phụ trách */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', maxWidth: '200px' }}>
                              {acc.stagesList && acc.stagesList.length > 0 ? (
                                acc.stagesList.map(st => (
                                  <span
                                    key={st}
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: '600',
                                      padding: '1px 5px',
                                      borderRadius: '3px',
                                      backgroundColor: '#FAF5EE',
                                      color: '#7B5233',
                                      border: '1px solid #EADCC9'
                                    }}
                                  >
                                    {st}
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: '#A8A29E', fontSize: '0.75rem' }}>
                                  {acc.department || '—'}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Cột 7: Nút xem danh sách */}
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAccountDrawer(acc);
                              }}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                backgroundColor: acc.total > 0 ? '#7B5233' : '#F5ECE2',
                                color: acc.total > 0 ? '#FFFFFF' : '#7B5233',
                                border: acc.total > 0 ? 'none' : '1px solid #E4D3C0',
                                fontSize: '0.76rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                boxShadow: acc.total > 0 ? '0 1px 2px rgba(123, 82, 51, 0.2)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Eye size={12} /> Xem {acc.total} phiếu
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Desktop Pagination Bar */}
              <div className="admin-pagination-desktop desktop-only">
                <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                  Hiển thị <b>{totalAccounts > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0} - {Math.min(safeCurrentPage * pageSize, totalAccounts)}</b> trên <b>{totalAccounts}</b> kiểm tra viên
                </div>

                {totalPages > 1 && (
                  <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="page-btn"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={safeCurrentPage === 1}
                      title="Trang trước"
                    >
                      <ChevronLeft size={14} />
                    </button>

                    {renderPageNumbers()}

                    <button
                      type="button"
                      className="page-btn"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={safeCurrentPage === totalPages}
                      title="Trang sau"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 6B. MOBILE VIEW: Dạng thẻ (cards) */}
          <div className="account-mobile-view">
            {paginatedAccounts.map((acc) => {
              const errorColor = acc.defectRate === 0
                ? '#16A34A'
                : (acc.defectRate < 10 ? '#D97706' : '#DC2626');

              return (
                <div
                  key={acc.name}
                  onClick={() => handleOpenAccountDrawer(acc)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #EADCC9',
                    padding: '12px 14px',
                    boxShadow: '0 1px 4px rgba(45, 26, 18, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  {/* Header: Avatar, Name & Chờ duyệt/Tổng phiếu */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        backgroundColor: '#F5ECE2',
                        color: '#7B5233',
                        border: '1px solid #E4D3C0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.88rem',
                        flexShrink: 0
                      }}>
                        {acc.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontWeight: '800',
                          color: '#2D1A12',
                          fontSize: '0.88rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {acc.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#8C827A', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          {acc.department && (
                            <span style={{ color: '#7B5233', fontWeight: '600' }}>
                              {acc.department}
                            </span>
                          )}
                          <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Clock size={11} style={{ opacity: 0.7 }} />
                            <span>{acc.latestDate ? acc.latestDate.toLocaleDateString('vi-VN') : '—'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Badge Chờ duyệt / Tổng phiếu */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <span
                        title="Phiếu chờ duyệt"
                        style={{
                          padding: '2px 7px',
                          borderRadius: '10px',
                          backgroundColor: acc.pendingCount > 0 ? '#FEF3C7' : '#F1F5F9',
                          color: acc.pendingCount > 0 ? '#B45309' : '#64748B',
                          border: `1px solid ${acc.pendingCount > 0 ? '#FDE68A' : '#E2E8F0'}`,
                          fontWeight: '800',
                          fontSize: '0.74rem'
                        }}
                      >
                        {acc.pendingCount} chờ
                      </span>
                      <span style={{ color: '#A8A29E', fontSize: '0.72rem', fontWeight: '700' }}>/</span>
                      <span
                        title="Tổng số phiếu"
                        style={{
                          padding: '2px 7px',
                          borderRadius: '10px',
                          backgroundColor: acc.total > 0 ? '#EFF6FF' : '#F1F5F9',
                          color: acc.total > 0 ? '#1D4ED8' : '#64748B',
                          border: `1px solid ${acc.total > 0 ? '#BFDBFE' : '#E2E8F0'}`,
                          fontWeight: '800',
                          fontSize: '0.74rem'
                        }}
                      >
                        {acc.total} phiếu
                      </span>
                    </div>
                  </div>

                  {/* Body Metrics */}
                  <div style={{
                    backgroundColor: '#FAF7F2',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    {acc.total > 0 ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              fontWeight: '700',
                              fontSize: '0.72rem'
                            }}>
                              {acc.passCount} Đạt
                            </span>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#FEE2E2',
                              color: '#DC2626',
                              fontWeight: '700',
                              fontSize: '0.72rem'
                            }}>
                              {acc.failCount} Lỗi
                            </span>
                            {acc.returnCount > 0 && (
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#FFFBEB',
                                color: '#B45309',
                                fontWeight: '700',
                                fontSize: '0.72rem',
                                border: '1px solid #FDE68A'
                              }}>
                                {acc.returnCount} Trả/Cách ly
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem' }}>
                            <span style={{ color: '#78716C', fontWeight: '600' }}>Tỷ lệ lỗi:</span>
                            <span style={{ fontWeight: '800', color: errorColor }}>{acc.defectRate}%</span>
                          </div>
                        </div>

                        {/* Defect progress bar */}
                        <div style={{
                          width: '100%',
                          height: '5px',
                          backgroundColor: '#E2E8F0',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${Math.min(acc.defectRate, 100)}%`,
                            height: '100%',
                            backgroundColor: errorColor,
                            borderRadius: '3px'
                          }} />
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#8C827A', fontStyle: 'italic' }}>
                        Chưa ghi nhận phiếu kiểm tra nào trong kỳ lọc này.
                      </div>
                    )}

                    {/* Công đoạn tags */}
                    {acc.stagesList && acc.stagesList.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '1px' }}>
                        <span style={{ fontSize: '0.68rem', color: '#78716C', fontWeight: '600', alignSelf: 'center' }}>
                          Công đoạn:
                        </span>
                        {acc.stagesList.map(st => (
                          <span
                            key={st}
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: '600',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: '#FFFFFF',
                              color: '#7B5233',
                              border: '1px solid #EADCC9'
                            }}
                          >
                            {st}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAccountDrawer(acc);
                    }}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '7px',
                      backgroundColor: '#FAF5EE',
                      border: '1px solid #D6C7B2',
                      color: '#7B5233',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Eye size={13} />
                    <span>Xem {acc.total} phiếu ({acc.pendingCount} chờ duyệt)</span>
                    <ChevronRight size={13} style={{ marginLeft: 'auto' }} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Mobile Sticky Floating Pagination Bar */}
          {!isDrawerOpen && totalPages > 1 && (
            <div className="pagination-mobile-sticky mobile-only">
              <button
                type="button"
                className="page-btn"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={safeCurrentPage === 1}
                aria-label="Trang trước"
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#7B5233', whiteSpace: 'nowrap' }}>
                Trang {safeCurrentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="page-btn"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={safeCurrentPage >= totalPages}
                aria-label="Trang sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* 7. Slide-out Drawer hiển thị chi tiết các phiếu của tài khoản */}
      <AccountPendingTicketsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        account={currentOpenAccount}
        onSelectTask={onSelectTask}
      />
    </div>
  );
};

export default AccountQualityTab;
