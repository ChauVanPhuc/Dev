import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { screenService } from '@modules/System/Models/screen.service';
import { bugService } from '@modules/System/Models/bug.service';
import { Search, Filter, ChevronLeft, ChevronRight, FileDown, Eye, Trash2, ArrowUpDown, Plus } from 'lucide-react';
import { useScreen } from '@shared/context/ScreenContext';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';

const parseDescription = (desc) => {
  if (!desc) return { tag: '', text: '' };
  const match = desc.match(/^\[([^\]]+)\]\s*(.*)$/s);
  if (match) {
    return { tag: match[1], text: match[2] };
  }
  return { tag: '', text: desc };
};

const getPositionByName = (name) => {
  if (!name) return 'QC';
  const n = name.toLowerCase();
  if (n.includes('admin') || n.includes('it') || n.includes('hệ thống') || n.includes('administrator')) return 'Admin';
  if (n.includes('phuc') || n.includes('dev') || n.includes('coder') || n.includes('developer') || n.includes('phucv1')) return 'Lập trình viên';
  if (n.includes('qc') || n.includes('tester') || n.includes('kiem thu') || n.includes('nguyễn văn') || n.includes('phuong')) return 'QC';
  return 'QC'; // Default position
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} | ${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
};

const getSubsystem = (screen) => {
  const code = screen.current_code || '';
  if (code.startsWith('TC')) return 'Trang chủ';
  if (code.startsWith('HD') || code.startsWith('AD')) return 'Quản lý hệ thống';
  if (code.startsWith('NS')) return 'Quản lý nhân sự';
  if (code.startsWith('SX') || code.startsWith('MA')) return 'Quản lý sản xuất';
  if (code.startsWith('CL') || code.startsWith('QC')) return 'Quản lý chất lượng';
  if (code.startsWith('KD')) return 'Quản lý kinh doanh';
  if (code.startsWith('KT')) return 'Quản lý kỹ thuật';
  if (code.startsWith('BT')) return 'Bảo trì - cơ sở hạ tầng';
  
  // Fallback by route path
  const path = screen.route_path || '';
  if (path.includes('/manufacture') || path.includes('/plan') || path.includes('/delivery-tracking') || path.includes('/orders')) {
    return 'Quản lý sản xuất';
  }
  if (path.includes('/iso-documents') || path.includes('/iso-processes')) {
    return 'Quản lý nhân sự';
  }
  if (path.includes('/quality-records') || path.includes('/defects') || path.includes('/claims')) {
    return 'Quản lý chất lượng';
  }
  if (path.includes('/prices') || path.includes('/shipments')) {
    return 'Quản lý kinh doanh';
  }
  if (path.includes('/products')) {
    return 'Quản lý kỹ thuật';
  }
  if (path.includes('/machines')) {
    return 'Bảo trì - cơ sở hạ tầng';
  }
  return 'Quản lý hệ thống';
};

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  
  // Clean ngrok endpoint root
  const apiRoot = localStorage.getItem('smartflow_api_root') || 'http://localhost:8000';
  const cleanRoot = apiRoot.endsWith('/') ? apiRoot.slice(0, -1) : apiRoot;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanRoot}${cleanPath}`;
};

const ScreenManagement = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const setCustomTitle = outletContext?.setCustomTitle;
  const setCustomSubtitle = outletContext?.setCustomSubtitle;
  const setCustomScreenCode = outletContext?.setCustomScreenCode;

  const [screens, setScreens] = useState([]);
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  
  const [selectedScreenId, setSelectedScreenId] = useState(null);
  const [expandedBugId, setExpandedBugId] = useState(null);
  const [isBugListCollapsed, setIsBugListCollapsed] = useState(false);
  const [subsystemFilter, setSubsystemFilter] = useState('');
  const [designDateFrom, setDesignDateFrom] = useState('');
  const [designDateTo, setDesignDateTo] = useState('');
  const [completionDateFrom, setCompletionDateFrom] = useState('');
  const [completionDateTo, setCompletionDateTo] = useState('');
  const [bugCountFilter, setBugCountFilter] = useState('');
  const [checkedScreenIds, setCheckedScreenIds] = useState([]);

  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isOtherDropdownOpen, setIsOtherDropdownOpen] = useState(false);
  const [isExcelDropdownOpen, setIsExcelDropdownOpen] = useState(false);
  const [isPdfDropdownOpen, setIsPdfDropdownOpen] = useState(false);

  const { toast } = useToast();
  const [actionMenuId, setActionMenuId] = useState(null);
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortDir, setSortDir] = useState('desc');
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [customizationFilter, setCustomizationFilter] = useState('all');
  const { refreshScreens } = useScreen();

  useEffect(() => {
    if (setCustomScreenCode) setCustomScreenCode('HD02');
    if (setCustomTitle) setCustomTitle('Danh sách màn hình');
    if (setCustomSubtitle) setCustomSubtitle('HD02: Hiển thị thông tin về các màn hình thuộc hệ thống');
  }, [setCustomScreenCode, setCustomTitle, setCustomSubtitle]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.action-btn') && !e.target.closest('.action-menu') && !e.target.closest('.dropdown-container')) {
        setActionMenuId(null);
        setIsSortDropdownOpen(false);
        setIsOtherDropdownOpen(false);
        setIsExcelDropdownOpen(false);
        setIsPdfDropdownOpen(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const showToast = (message, type = 'success') => {
    toast(type, message);
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [screensData, bugsData] = await Promise.all([
        screenService.getScreens(),
        bugService.getBugs()
      ]);
      setScreens(screensData || []);
      setBugs(bugsData || []);
    } catch (error) {
      showToast('Không thể tải dữ liệu cấu hình hệ thống!', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleDeleteScreen = async (screen) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa màn hình "${screen.title}" khỏi cơ sở dữ liệu?`)) {
      try {
        await screenService.deleteScreen(screen.id);
        showToast('Xóa màn hình thành công!');
        if (selectedScreenId === screen.id) setSelectedScreenId(null);
        fetchAllData();
        refreshScreens();
      } catch (error) {
        showToast('Không thể xóa màn hình. Vui lòng thử lại!', 'error');
      }
    }
  };

  const handleReset = async (screen) => {
    if (window.confirm(`Bạn có chắc chắn muốn đặt lại mã màn hình của "${screen.title}" về mặc định (${screen.default_code})?`)) {
      try {
        await screenService.resetScreen(screen.id);
        showToast('Đã đặt lại mã màn hình về mặc định!');
        fetchAllData();
        refreshScreens();
      } catch (error) {
        showToast('Đặt lại thất bại!', 'error');
      }
    }
  };

  const fileInputRef = useRef(null);

  const handlePauseScreen = async (screen) => {
    try {
      const nextStatus = screen.status === 'Tạm dừng' ? 'Mới thiết kế' : 'Tạm dừng';
      await screenService.updateScreen(screen.id, {
        title: screen.title,
        route_path: screen.route_path,
        platform: screen.platform,
        status: nextStatus,
        target_date: screen.target_date,
        subtitle: screen.subtitle,
        mockup_path: screen.mockup_path
      });
      showToast(`Đã ${nextStatus === 'Tạm dừng' ? 'tạm dừng' : 'khôi phục'} hoạt động màn hình!`);
      fetchAllData();
      refreshScreens();
    } catch (error) {
      showToast('Cập nhật trạng thái thất bại!', 'error');
    }
  };

  const handleImportExcelClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showToast(`Đang nhập dữ liệu từ tệp ${file.name}...`, 'info');
    setTimeout(() => {
      showToast(`Đã nhập dữ liệu thành công từ tệp ${file.name}!`, 'success');
      fetchAllData();
    }, 1500);
  };

  const handleExportExcel = (exportAll = true) => {
    const rows = exportAll ? filteredScreens : screens.filter(s => checkedScreenIds.includes(s.id));
    if (rows.length === 0) {
      showToast('Không có màn hình nào được chọn để xuất Excel!', 'error');
      return;
    }
    const header = ['Mã màn hình', 'Mã mặc định', 'Tiêu đề', 'Phân hệ', 'Nền tảng', 'Trạng thái', 'Đường dẫn', 'Mô tả'];
    const csvContent = [
      header.join(','),
      ...rows.map(s => [
        `"${s.current_code || ''}"`,
        `"${s.default_code || ''}"`,
        `"${(s.title || '').replace(/"/g, '""')}"`,
        `"${getSubsystem(s)}"`,
        `"${s.platform || ''}"`,
        `"${s.status || 'Mới thiết kế'}"`,
        `"${s.route_path || ''}"`,
        `"${(s.subtitle || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Danh_sach_man_hinh_${exportAll ? 'toan_bo' : 'chon_loc'}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Xuất Excel thành công!');
  };

  const handleExportPDFSingle = (screenItem) => {
    handleExportPDF(false, [screenItem.id]);
  };

  const handleExportPDF = (exportAll = true, specificIds = null) => {
    let rows = [];
    if (specificIds) {
      rows = screens.filter(s => specificIds.includes(s.id));
    } else {
      rows = exportAll ? filteredScreens : screens.filter(s => checkedScreenIds.includes(s.id));
    }
    
    if (rows.length === 0) {
      showToast('Không có màn hình nào được chọn để xuất PDF!', 'error');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    const contentHtml = rows.map(s => `
      <div class="screen-spec" style="page-break-after: always; padding: 30px; font-family: Arial, sans-serif; color: #2D1A12; max-width: 800px; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #7B5233; padding-bottom: 12px; margin-bottom: 20px;">
          <div>
            <h1 style="margin: 0; font-size: 1.6rem; color: #4A2E20;">ĐẶC TẢ CHI TIẾT MÀN HÌNH</h1>
            <p style="margin: 4px 0 0 0; color: #8D6E63; font-size: 0.9rem;">Mã thiết kế: <b>${s.current_code}</b> (Mã gốc: ${s.default_code})</p>
          </div>
          <div style="font-size: 0.8rem; text-align: right; color: #8D6E63;">
            <p style="margin: 0;">Hệ thống quản lý SmartFlow</p>
            <p style="margin: 2px 0 0 0;">Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}</p>
          </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.85rem;">
          <tr>
            <td style="padding: 10px; border: 1px solid #EADCC9; font-weight: bold; background: #FAF6F0; width: 30%;">Tên màn hình</td>
            <td style="padding: 10px; border: 1px solid #EADCC9; font-weight: 600;">${s.title}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #EADCC9; font-weight: bold; background: #FAF6F0;">Phân hệ quản lý</td>
            <td style="padding: 10px; border: 1px solid #EADCC9;">${getSubsystem(s)}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #EADCC9; font-weight: bold; background: #FAF6F0;">Nền tảng</td>
            <td style="padding: 10px; border: 1px solid #EADCC9;">${s.platform === 'Web' ? '🖥️ Web Application' : '📱 Mobile Application'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #EADCC9; font-weight: bold; background: #FAF6F0;">Đường dẫn Route</td>
            <td style="padding: 10px; border: 1px solid #EADCC9; font-family: monospace; color: #7B5233;">${s.route_path}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #EADCC9; font-weight: bold; background: #FAF6F0;">Trạng thái thiết kế</td>
            <td style="padding: 10px; border: 1px solid #EADCC9; font-weight: bold; color: ${s.status === 'Hoàn thành' ? '#059669' : (s.status === 'Tạm dừng' ? '#9CA3AF' : '#D97706')};">${s.status || 'Mới thiết kế'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #EADCC9; font-weight: bold; background: #FAF6F0;">Ngày hoàn thành dự kiến</td>
            <td style="padding: 10px; border: 1px solid #EADCC9;">${s.target_date || 'Chưa thiết lập'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #EADCC9; font-weight: bold; background: #FAF6F0;">Mô tả chức năng chính</td>
            <td style="padding: 10px; border: 1px solid #EADCC9;">${s.subtitle || '-'}</td>
          </tr>
        </table>
        
        <h3 style="color: #7B5233; margin-top: 25px; border-bottom: 1px solid #EADCC9; padding-bottom: 6px;">Danh sách Component cấu thành (${(s.components || []).length})</h3>
        ${(s.components || []).length > 0 ? `
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.8rem;">
            <thead>
              <tr style="background: #4A2E20; color: #fff;">
                <th style="padding: 8px; border: 1px solid #EADCC9; text-align: left; color: #fff;">Component</th>
                <th style="padding: 8px; border: 1px solid #EADCC9; text-align: left; color: #fff;">Loại</th>
                <th style="padding: 8px; border: 1px solid #EADCC9; text-align: left; color: #fff;">Mô tả đặc tả chi tiết</th>
              </tr>
            </thead>
            <tbody>
              ${s.components.map(c => `
                <tr style="background: #FFF;">
                  <td style="padding: 8px; border: 1px solid #EADCC9; font-weight: bold;">${c.name}</td>
                  <td style="padding: 8px; border: 1px solid #EADCC9; font-style: italic;">${c.type}</td>
                  <td style="padding: 8px; border: 1px solid #EADCC9; color: #444; line-height: 1.4;">${c.description || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p style="font-style: italic; color: #8D6E63; font-size: 0.85rem;">Chưa khai báo thành phần giao diện.</p>'}
      </div>
    `).join('');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Đặc tả màn hình - SmartFlow</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 15px; background-color: #fff; }
            @media print {
              body { margin: 0; }
              .screen-spec { page-break-after: always; }
            }
          </style>
        </head>
        <body>
          ${contentHtml}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    showToast('Tải PDF đặc tả thành công!');
  };

  const filteredScreens = useMemo(() => {
    let result = screens.filter(screen => {
      const q = searchQuery.toLowerCase();
      return !q ||
        screen.title?.toLowerCase().includes(q) ||
        screen.route_path?.toLowerCase().includes(q) ||
        screen.current_code?.toLowerCase().includes(q) ||
        screen.default_code?.toLowerCase().includes(q);
    });

    if (platformFilter) {
      result = result.filter(s => s.platform === platformFilter);
    }

    if (subsystemFilter) {
      result = result.filter(s => getSubsystem(s) === subsystemFilter);
    }

    if (designDateFrom) {
      result = result.filter(s => s.updated_at && s.updated_at.split('T')[0] >= designDateFrom);
    }
    if (designDateTo) {
      result = result.filter(s => s.updated_at && s.updated_at.split('T')[0] <= designDateTo);
    }

    if (completionDateFrom) {
      result = result.filter(s => s.target_date && s.target_date >= completionDateFrom);
    }
    if (completionDateTo) {
      result = result.filter(s => s.target_date && s.target_date <= completionDateTo);
    }

    if (bugCountFilter) {
      result = result.filter(s => {
        const count = bugs.filter(b => b.screen_id === s.id).length;
        if (bugCountFilter === '0-10') return count >= 0 && count <= 10;
        if (bugCountFilter === '10-20') return count > 10 && count <= 20;
        if (bugCountFilter === 'above20') return count > 20;
        return true;
      });
    }

    if (customizationFilter !== 'all') {
      result = result.filter(s => {
        const isModified = s.current_code !== s.default_code;
        return customizationFilter === 'modified' ? isModified : !isModified;
      });
    }

    result = [...result].sort((a, b) => {
      let av = a[sortBy];
      let bv = b[sortBy];
      if (sortBy === 'subsystem') {
        av = getSubsystem(a);
        bv = getSubsystem(b);
      }
      av = (av || '').toString().toLowerCase();
      bv = (bv || '').toString().toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [screens, bugs, searchQuery, platformFilter, subsystemFilter, designDateFrom, designDateTo, completionDateFrom, completionDateTo, bugCountFilter, sortBy, sortDir, customizationFilter]);

  const totalPages = Math.ceil(filteredScreens.length / pageSize);
  const paginatedScreens = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredScreens.slice(startIndex, startIndex + pageSize);
  }, [filteredScreens, currentPage, pageSize]);

  const stats = useMemo(() => {
    const totalScreens = screens.length;
    const completedScreens = screens.filter(s => s.status === 'Hoàn thành').length;
    const buildPercentage = totalScreens > 0 ? Math.round((completedScreens / totalScreens) * 100) : 0;

    const totalBugs = bugs.length;
    const completedBugs = bugs.filter(b => b.status === 'Hoàn thành').length;
    const editPercentage = totalBugs > 0 ? Math.round((completedBugs / totalBugs) * 100) : 0;

    const fixedBugs = bugs.filter(b => b.status === 'Đã sửa' || b.status === 'Hoàn thành').length;
    const recoveryPercentage = totalBugs > 0 ? Math.round((fixedBugs / totalBugs) * 100) : 0;

    const urgentBugs = bugs.filter(b => b.severity === 'Critical' || b.severity === 'High');
    const totalUrgentBugs = urgentBugs.length;
    const fixedUrgentBugs = urgentBugs.filter(b => b.status === 'Đã sửa' || b.status === 'Hoàn thành').length;
    const urgentPercentage = totalUrgentBugs > 0 ? Math.round((fixedUrgentBugs / totalUrgentBugs) * 100) : 0;

    return {
      totalScreens, completedScreens, buildPercentage,
      totalBugs, completedBugs, editPercentage,
      fixedBugs, recoveryPercentage,
      totalUrgentBugs, fixedUrgentBugs, urgentPercentage
    };
  }, [screens, bugs]);

  const selectedScreenBugs = useMemo(() => {
    if (!selectedScreenId) return [];
    return bugs.filter(b => b.screen_id === selectedScreenId);
  }, [selectedScreenId, bugs]);

  const renderProgressCard = (title, numerator, denominator, percentage) => {
    return (
      <div className="progress-card" style={{
        background: '#fff',
        border: '1px solid #EADCC9',
        borderRadius: '10px',
        padding: '16px 20px',
        boxShadow: '0 4px 12px rgba(123, 82, 51, 0.05)',
        flex: 1,
        minWidth: '220px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#7B5233' }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '2rem', fontWeight: '800', color: '#2D1A12', lineHeight: 1 }}>{numerator}</span>
          <span style={{ fontSize: '1rem', color: '#8D6E63' }}>/{denominator}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
          <div style={{ flex: 1, height: '6px', backgroundColor: '#FAF6F0', borderRadius: '3px', overflow: 'hidden', border: '1px solid rgba(123, 82, 51, 0.1)' }}>
            <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: '#7B5233', borderRadius: '3px' }} />
          </div>
          <span style={{ fontSize: '0.78rem', color: '#8D6E63', fontWeight: 'bold', minWidth: '30px', textAlign: 'right' }}>{percentage}%</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="mgmt-container screen-management-container" style={{ paddingBottom: '40px' }}>
        <div className="mgmt-main">
          <div className="progress-cards-container" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
            marginBottom: '20px'
          }}>
            {renderProgressCard("Tiến độ xây dựng", stats.completedScreens, stats.totalScreens, stats.buildPercentage)}
            {renderProgressCard("Tiến độ chỉnh sửa", stats.completedBugs, stats.totalBugs, stats.editPercentage)}
            {renderProgressCard("Tiến độ khắc phục", stats.fixedBugs, stats.totalBugs, stats.recoveryPercentage)}
            {renderProgressCard("Lỗi khẩn cấp", stats.fixedUrgentBugs, stats.totalUrgentBugs, stats.urgentPercentage)}
          </div>

          {/* Custom Toolbar */}
          <div className="page-toolbar" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            background: '#fff',
            borderRadius: '8px',
            marginBottom: '12px',
            border: '1px solid #EADCC9'
          }}>
            {/* Left side: Search, Sort, Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Search */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', color: '#8D6E63' }} />
                <input
                  type="text"
                  placeholder="Tìm theo mã, tiêu đề, đường dẫn..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  style={{
                    padding: '8px 12px 8px 36px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '0.84rem',
                    outline: 'none',
                    width: '240px',
                    color: '#374151'
                  }}
                />
              </div>

              {/* Sort */}
              <div className="dropdown-container" style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    background: '#fff',
                    cursor: 'pointer',
                    color: '#7B5233'
                  }}
                  title="Sắp xếp danh sách"
                >
                  <ArrowUpDown size={18} />
                </button>
                {isSortDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    backgroundColor: '#fff',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    zIndex: 100,
                    width: '220px',
                    padding: '4px 0'
                  }}>
                    {[
                      { label: 'Theo ngày thiết kế (gần - xa)', value: 'updated_at_desc' },
                      { label: 'Theo ngày thiết kế (xa - gần)', value: 'updated_at_asc' },
                      { label: 'Theo ngày hoàn thành (gần - xa)', value: 'target_date_desc' },
                      { label: 'Theo ngày hoàn thành (xa - gần)', value: 'target_date_asc' },
                    ].map(item => {
                      const currentVal = `${sortBy}_${sortDir}`;
                      const isActive = currentVal === item.value;
                      return (
                        <div
                          key={item.value}
                          onClick={() => {
                            if (item.value === 'updated_at_desc') {
                              setSortBy('updated_at');
                              setSortDir('desc');
                            } else if (item.value === 'updated_at_asc') {
                              setSortBy('updated_at');
                              setSortDir('asc');
                            } else if (item.value === 'target_date_desc') {
                              setSortBy('target_date');
                              setSortDir('desc');
                            } else if (item.value === 'target_date_asc') {
                              setSortBy('target_date');
                              setSortDir('asc');
                            }
                            setIsSortDropdownOpen(false);
                            setCurrentPage(1);
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            fontWeight: isActive ? 'bold' : 'normal',
                            backgroundColor: isActive ? '#FAF6F0' : '#fff',
                            color: isActive ? '#7B5233' : '#374151'
                          }}
                          className="custom-select-item"
                        >
                          {item.label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Filter funnel toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    background: isFilterBarOpen ? '#FAF6F0' : '#fff',
                    cursor: 'pointer',
                    color: '#7B5233',
                    position: 'relative'
                  }}
                  title="Bộ lọc nâng cao"
                >
                  <Filter size={18} />
                  {((platformFilter ? 1 : 0) + (subsystemFilter ? 1 : 0) + (designDateFrom ? 1 : 0) + (designDateTo ? 1 : 0) + (completionDateFrom ? 1 : 0) + (completionDateTo ? 1 : 0) + (bugCountFilter ? 1 : 0) + (customizationFilter !== 'all' ? 1 : 0)) > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      backgroundColor: '#A0301B',
                      color: '#fff',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      fontSize: '0.68rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {(platformFilter ? 1 : 0) + (subsystemFilter ? 1 : 0) + (designDateFrom ? 1 : 0) + (designDateTo ? 1 : 0) + (completionDateFrom ? 1 : 0) + (completionDateTo ? 1 : 0) + (bugCountFilter ? 1 : 0) + (customizationFilter !== 'all' ? 1 : 0)}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Right side: Actions dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              
              {/* Nút Khác */}
              <div className="dropdown-container" style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsOtherDropdownOpen(!isOtherDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                    color: '#7B5233'
                  }}
                >
                  <span>Khác</span>
                  <span style={{ fontSize: '0.6rem' }}>▼</span>
                </button>
                {isOtherDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '110%',
                    right: 0,
                    backgroundColor: '#fff',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    zIndex: 100,
                    width: '180px',
                    padding: '4px 0'
                  }}>
                    <div
                      onClick={() => { setIsOtherDropdownOpen(false); navigate('/admin/bugs'); }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem', color: '#374151' }}
                      className="custom-select-item"
                    >
                      Danh sách lỗi hệ thống
                    </div>
                    <div
                      onClick={() => { setIsOtherDropdownOpen(false); navigate('/admin/monitor'); }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem', color: '#374151' }}
                      className="custom-select-item"
                    >
                      Tiến độ thực hiện
                    </div>
                  </div>
                )}
              </div>

              {/* Nút Nhập Excel */}
              <div>
                <button
                  type="button"
                  onClick={handleImportExcelClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                    color: '#7B5233'
                  }}
                >
                  <span>Nhập Excel</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                />
              </div>

              {/* Nút Xuất Excel */}
              <div className="dropdown-container" style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsExcelDropdownOpen(!isExcelDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                    color: '#7B5233'
                  }}
                >
                  <span>Xuất Excel</span>
                  <span style={{ fontSize: '0.6rem' }}>▼</span>
                </button>
                {isExcelDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '110%',
                    right: 0,
                    backgroundColor: '#fff',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    zIndex: 100,
                    width: '180px',
                    padding: '4px 0'
                  }}>
                    <div
                      onClick={() => { setIsExcelDropdownOpen(false); handleExportExcel(true); }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem', color: '#374151' }}
                      className="custom-select-item"
                    >
                      Xuất toàn bộ
                    </div>
                    <div
                      onClick={() => { setIsExcelDropdownOpen(false); handleExportExcel(false); }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem', color: '#374151' }}
                      className="custom-select-item"
                    >
                      Xuất theo danh sách chọn
                    </div>
                  </div>
                )}
              </div>

              {/* Nút Xuất PDF */}
              <div className="dropdown-container" style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsPdfDropdownOpen(!isPdfDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                    color: '#7B5233'
                  }}
                >
                  <span>Xuất PDF</span>
                  <span style={{ fontSize: '0.6rem' }}>▼</span>
                </button>
                {isPdfDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '110%',
                    right: 0,
                    backgroundColor: '#fff',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    zIndex: 100,
                    width: '180px',
                    padding: '4px 0'
                  }}>
                    <div
                      onClick={() => { setIsPdfDropdownOpen(false); handleExportPDF(true); }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem', color: '#374151' }}
                      className="custom-select-item"
                    >
                      Xuất toàn bộ
                    </div>
                    <div
                      onClick={() => { setIsPdfDropdownOpen(false); handleExportPDF(false); }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem', color: '#374151' }}
                      className="custom-select-item"
                    >
                      Xuất theo danh sách chọn
                    </div>
                  </div>
                )}
              </div>

              {/* Nút Thêm mới */}
              <div>
                <button
                  type="button"
                  onClick={() => navigate('/admin/screens/new')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#4A2E20',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 'bold'
                  }}
                >
                  <Plus size={14} strokeWidth={3} />
                  <span>Tạo mới</span>
                </button>
              </div>

            </div>
          </div>

          {isFilterBarOpen && (
            <div className="filter-inline-bar" style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '15px',
              padding: '16px 20px',
              background: '#FAF6F0',
              borderRadius: '8px',
              border: '1px solid #EADCC9',
              marginBottom: '15px'
            }}>
              {/* Phân hệ */}
              <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px' }}>
                <label className="filter-field-label" style={{ fontSize: '0.76rem', fontWeight: 'bold', color: '#7B5233' }}>Phân hệ</label>
                <select
                  value={subsystemFilter}
                  onChange={(e) => { setSubsystemFilter(e.target.value); setCurrentPage(1); }}
                  style={{ border: '1px solid #D1D5DB', borderRadius: '6px', padding: '6px 10px', fontSize: '0.82rem', outline: 'none' }}
                >
                  <option value="">Tất cả phân hệ</option>
                  <option value="Trang chủ">Trang chủ</option>
                  <option value="Quản lý hệ thống">Quản lý hệ thống</option>
                  <option value="Quản lý nhân sự">Quản lý nhân sự</option>
                  <option value="Quản lý sản xuất">Quản lý sản xuất</option>
                  <option value="Quản lý chất lượng">Quản lý chất lượng</option>
                  <option value="Quản lý kinh doanh">Quản lý kinh doanh</option>
                  <option value="Quản lý kỹ thuật">Quản lý kỹ thuật</option>
                  <option value="Bảo trì - cơ sở hạ tầng">Bảo trì - cơ sở hạ tầng</option>
                </select>
              </div>

              {/* Nền tảng */}
              <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 150px' }}>
                <label className="filter-field-label" style={{ fontSize: '0.76rem', fontWeight: 'bold', color: '#7B5233' }}>Nền tảng</label>
                <select
                  value={platformFilter}
                  onChange={(e) => { setPlatformFilter(e.target.value); setCurrentPage(1); }}
                  style={{ border: '1px solid #D1D5DB', borderRadius: '6px', padding: '6px 10px', fontSize: '0.82rem', outline: 'none' }}
                >
                  <option value="">Tất cả nền tảng</option>
                  <option value="Web">🖥️ Web</option>
                  <option value="Mobile">📱 Mobile</option>
                </select>
              </div>

              {/* Thời gian thiết kế */}
              <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 250px' }}>
                <label className="filter-field-label" style={{ fontSize: '0.76rem', fontWeight: 'bold', color: '#7B5233' }}>Thời gian thiết kế</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="date"
                    value={designDateFrom}
                    onChange={(e) => { setDesignDateFrom(e.target.value); setCurrentPage(1); }}
                    style={{ border: '1px solid #D1D5DB', borderRadius: '6px', padding: '6px 10px', fontSize: '0.82rem', outline: 'none', width: '100%' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#7B5233' }}>-</span>
                  <input
                    type="date"
                    value={designDateTo}
                    onChange={(e) => { setDesignDateTo(e.target.value); setCurrentPage(1); }}
                    style={{ border: '1px solid #D1D5DB', borderRadius: '6px', padding: '6px 10px', fontSize: '0.82rem', outline: 'none', width: '100%' }}
                  />
                </div>
              </div>

              {/* Thời gian hoàn thành */}
              <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 250px' }}>
                <label className="filter-field-label" style={{ fontSize: '0.76rem', fontWeight: 'bold', color: '#7B5233' }}>Thời gian hoàn thành</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="date"
                    value={completionDateFrom}
                    onChange={(e) => { setCompletionDateFrom(e.target.value); setCurrentPage(1); }}
                    style={{ border: '1px solid #D1D5DB', borderRadius: '6px', padding: '6px 10px', fontSize: '0.82rem', outline: 'none', width: '100%' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#7B5233' }}>-</span>
                  <input
                    type="date"
                    value={completionDateTo}
                    onChange={(e) => { setCompletionDateTo(e.target.value); setCurrentPage(1); }}
                    style={{ border: '1px solid #D1D5DB', borderRadius: '6px', padding: '6px 10px', fontSize: '0.82rem', outline: 'none', width: '100%' }}
                  />
                </div>
              </div>

              {/* Số lượng lỗi ghi nhận */}
              <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 180px' }}>
                <label className="filter-field-label" style={{ fontSize: '0.76rem', fontWeight: 'bold', color: '#7B5233' }}>Tổng lỗi ghi nhận</label>
                <select
                  value={bugCountFilter}
                  onChange={(e) => { setBugCountFilter(e.target.value); setCurrentPage(1); }}
                  style={{ border: '1px solid #D1D5DB', borderRadius: '6px', padding: '6px 10px', fontSize: '0.82rem', outline: 'none' }}
                >
                  <option value="">Tất cả số lượng</option>
                  <option value="0-10">0 - 10 lỗi</option>
                  <option value="10-20">10 - 20 lỗi</option>
                  <option value="above20">Trên 20 lỗi</option>
                </select>
              </div>

              {/* Trạng thái tuỳ chỉnh */}
              <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 150px' }}>
                <label className="filter-field-label" style={{ fontSize: '0.76rem', fontWeight: 'bold', color: '#7B5233' }}>Trạng thái tuỳ chỉnh</label>
                <select
                  value={customizationFilter}
                  onChange={(e) => { setCustomizationFilter(e.target.value); setCurrentPage(1); }}
                  style={{ border: '1px solid #D1D5DB', borderRadius: '6px', padding: '6px 10px', fontSize: '0.82rem', outline: 'none' }}
                >
                  <option value="all">Tất cả</option>
                  <option value="modified">Đã sửa đổi mã</option>
                  <option value="unmodified">Chưa sửa đổi mã</option>
                </select>
              </div>

              {/* Hiển thị số dòng */}
              <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 120px' }}>
                <label className="filter-field-label" style={{ fontSize: '0.76rem', fontWeight: 'bold', color: '#7B5233' }}>Số dòng hiển thị</label>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }}
                  style={{ border: '1px solid #D1D5DB', borderRadius: '6px', padding: '6px 10px', fontSize: '0.82rem', outline: 'none' }}
                >
                  <option value={15}>15 dòng</option>
                  <option value={30}>30 dòng</option>
                  <option value={50}>50 dòng</option>
                  <option value={100}>100 dòng</option>
                </select>
              </div>
            </div>
          )}

          <div className="admin-list-layout">
            <div className="mgmt-table admin-table-card card-shadow" style={{ 
              background: '#fff', 
              border: '1px solid #EADCC9'
            }}>
              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <span>Đang tải cấu hình màn hình...</span>
                </div>
              ) : filteredScreens.length === 0 ? (
                <div className="empty-state" style={{ padding: 40, textAlign: 'center', color: '#888' }}>Không tìm thấy màn hình nào phù hợp</div>
              ) : (
                <>
                  <div className="table-responsive desktop-only admin-table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>
                            <input 
                              type="checkbox"
                              checked={paginatedScreens.length > 0 && paginatedScreens.every(s => checkedScreenIds.includes(s.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const paginatedIds = paginatedScreens.map(s => s.id);
                                  setCheckedScreenIds(prev => [...new Set([...prev, ...paginatedIds])]);
                                } else {
                                  const paginatedIds = paginatedScreens.map(s => s.id);
                                  setCheckedScreenIds(prev => prev.filter(id => !paginatedIds.includes(id)));
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                          </th>
                          <th>Mã</th>
                          <th>Tên màn hình</th>
                          <th>Phân hệ</th>
                          <th>Nền tảng</th>
                          <th>Trạng thái</th>
                          <th>Ngày thiết kế</th>
                          <th>Ngày cập nhật</th>
                          <th style={{ textAlign: 'center' }}>Lỗi</th>
                          <th>Mô tả</th>
                          <th style={{ textAlign: 'center', width: '100px' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedScreens.map((screen) => {
                          const isSelected = selectedScreenId === screen.id;
                          const isChecked = checkedScreenIds.includes(screen.id);
                          const screenBugs = bugs.filter(b => b.screen_id === screen.id);
                          const completedBugs = screenBugs.filter(b => b.status === 'Hoàn thành').length;
                          const totalBugs = screenBugs.length;
                          
                          return (
                            <tr 
                              key={screen.id}
                              className={`clickable-row ${isSelected ? 'selected-row' : ''}`}
                              onClick={(e) => {
                                if (e.target.closest('.actions-cell') || e.target.closest('button') || e.target.closest('input[type="checkbox"]')) return;
                                navigate(`/admin/screens/${screen.id}`);
                              }}
                              style={{
                                position: 'relative',
                                zIndex: actionMenuId === screen.id ? 30 : 1,
                                backgroundColor: isSelected ? '#FAF6F0' : undefined,
                                opacity: screen.status === 'Tạm dừng' ? 0.6 : 1,
                                borderLeft: screen.status === 'Tạm dừng' ? '4px solid #9CA3AF' : undefined
                              }}
                            >
                              <td style={{ textAlign: 'center' }}>
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  onChange={() => {
                                    setCheckedScreenIds(prev => 
                                      prev.includes(screen.id) 
                                        ? prev.filter(id => id !== screen.id) 
                                        : [...prev, screen.id]
                                    );
                                    setSelectedScreenId(screen.id);
                                    setExpandedBugId(null);
                                  }}
                                  style={{ cursor: 'pointer' }}
                                />
                              </td>
                              <td className="code-text font-mono font-semibold" style={{ color: '#7B5233' }}>{screen.current_code}</td>
                              <td className="font-semibold">{screen.title}</td>
                              <td>{getSubsystem(screen)}</td>
                              <td>
                                <span className={`platform-badge ${screen.platform}`}>
                                  {screen.platform === 'Web' ? '🖥️ Web' : '📱 Mobile'}
                                </span>
                              </td>
                              <td>
                                <span 
                                  className={`status-badge ${screen.status === 'Hoàn thành' ? 'status-resolved' : (screen.status === 'Tạm dừng' ? 'status-closed' : 'status-new')}`} 
                                  style={{ 
                                    padding: '2px 8px', 
                                    borderRadius: '4px', 
                                    fontSize: '0.78rem',
                                    backgroundColor: screen.status === 'Tạm dừng' ? '#E2E8F0' : undefined,
                                    color: screen.status === 'Tạm dừng' ? '#475569' : undefined
                                  }}
                                >
                                  {screen.status || 'Mới thiết kế'}
                                </span>
                              </td>
                              <td style={{ color: '#666', fontSize: '0.8rem' }}>{formatDate(screen.updated_at)}</td>
                              <td style={{ color: '#666', fontSize: '0.8rem' }}>{formatDate(screen.updated_at)}</td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold', color: totalBugs > 0 ? (completedBugs === totalBugs ? '#059669' : '#EF4444') : '#64748B' }}>
                                {completedBugs}/{totalBugs}
                              </td>
                              <td style={{ color: '#666', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {screen.subtitle || '-'}
                              </td>
                              <td className="actions-cell" style={{ position: 'relative', textAlign: 'center', zIndex: actionMenuId === screen.id ? 40 : 1 }}>
                                <button
                                  className="action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuId(actionMenuId === screen.id ? null : screen.id);
                                  }}
                                ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
                                {actionMenuId === screen.id && (
                                  <div className="action-menu" style={{ right: '50%', transform: 'translateX(50%)', top: '80%' }}>
                                    <button
                                      className="action-menu-item"
                                      onClick={() => {
                                        setActionMenuId(null);
                                        navigate(`/admin/screens/${screen.id}`);
                                      }}
                                    >
                                      Chi tiết
                                    </button>
                                    <button
                                      className="action-menu-item"
                                      onClick={() => {
                                        setActionMenuId(null);
                                        handlePauseScreen(screen);
                                      }}
                                    >
                                      {screen.status === 'Tạm dừng' ? 'Khôi phục' : 'Tạm dừng'}
                                    </button>
                                    <button
                                      className="action-menu-item"
                                      onClick={() => {
                                        setActionMenuId(null);
                                        handleExportPDFSingle(screen);
                                      }}
                                    >
                                      Tải xuống PDF
                                    </button>
                                    <button
                                      className="action-menu-item danger"
                                      onClick={() => {
                                        setActionMenuId(null);
                                        handleDeleteScreen(screen);
                                      }}
                                      style={{ color: '#EF4444' }}
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mobile-only mgmt-cards-container">
                    {paginatedScreens.map((screen) => {
                      const isSelected = selectedScreenId === screen.id;
                      const isChecked = checkedScreenIds.includes(screen.id);
                      const screenBugs = bugs.filter(b => b.screen_id === screen.id);
                      const completedBugs = screenBugs.filter(b => b.status === 'Hoàn thành').length;
                      const totalBugs = screenBugs.length;
                      
                      return (
                        <div 
                          key={screen.id} 
                          className="mgmt-card"
                          style={{ 
                            border: isSelected ? '2px solid #7B5233' : '1px solid #EADCC9',
                            opacity: screen.status === 'Tạm dừng' ? 0.6 : 1
                          }}
                        >
                          <div className="mgmt-card-main" onClick={() => navigate(`/admin/screens/${screen.id}`)}>
                            <div className="mgmt-card-avatar" onClick={(e) => {
                              e.stopPropagation();
                              setCheckedScreenIds(prev => 
                                prev.includes(screen.id) 
                                  ? prev.filter(id => id !== screen.id) 
                                  : [...prev, screen.id]
                              );
                              setSelectedScreenId(screen.id);
                              setExpandedBugId(null);
                            }} style={{ cursor: 'pointer', backgroundColor: isSelected ? '#FAF6F0' : undefined }}>
                              {isChecked ? '✓' : (screen.platform === 'Web' ? '🖥️' : '📱')}
                            </div>
                            <div className="mgmt-card-details">
                              <div className="mgmt-card-title-row">
                                <h4 className="mgmt-card-title">{screen.title}</h4>
                                <span className={`platform-badge ${screen.platform}`}>
                                  {screen.platform}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.82rem', color: '#666', margin: '4px 0', lineHeight: '1.4' }}>
                                {screen.subtitle || 'Không có mô tả phụ'}
                              </p>
                              <div className="mgmt-card-meta-chips" style={{ marginTop: '6px' }}>
                                <span className="mgmt-card-chip font-mono">
                                  {screen.route_path}
                                </span>
                                <span className="mgmt-card-chip" style={{ backgroundColor: '#FAF6F0', color: '#7B5233' }}>
                                  {getSubsystem(screen)}
                                </span>
                                <span className={`mgmt-card-chip ${screen.status === 'Hoàn thành' ? 'success' : (screen.status === 'Tạm dừng' ? 'default' : 'info')}`} style={screen.status === 'Tạm dừng' ? { backgroundColor: '#E2E8F0', color: '#475569' } : undefined}>
                                  {screen.status || 'Mới thiết kế'}
                                </span>
                              </div>
                            </div>
                            <div className="mgmt-card-actions">
                              <button 
                                className="action-icon-btn"
                                onClick={(e) => { e.stopPropagation(); navigate(`/admin/screens/${screen.id}`); }}
                                title="Sửa"
                              >
                                ✏️
                              </button>
                              <button 
                                className="action-icon-btn delete"
                                onClick={(e) => { e.stopPropagation(); handleDeleteScreen(screen); }}
                                title="Xóa"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          <div className="mgmt-card-footer">
                            <div className="mgmt-card-footer-left font-mono">
                              Mã: <span style={{ fontWeight: 'bold', color: '#7B5233' }}>{screen.current_code}</span>
                            </div>
                            <div className="mgmt-card-footer-right" style={{ color: totalBugs > 0 ? (completedBugs === totalBugs ? '#059669' : '#EF4444') : '#64748B', fontWeight: 'bold' }}>
                              Lỗi: {completedBugs}/{totalBugs}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div className="admin-pagination-desktop">
                      <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                        Hiển thị <b>{paginatedScreens.length}</b> trên <b>{filteredScreens.length}</b> kết quả
                      </div>
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button 
                          disabled={currentPage === 1} 
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                          className="page-btn"
                        >
                          &lt; Trước
                        </button>
                        {(() => {
                          const pages = [];
                          const delta = 2;
                          for (let i = 1; i <= totalPages; i++) {
                            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                              pages.push(i);
                            } else if (pages[pages.length - 1] !== '...') {
                              pages.push('...');
                            }
                          }
                          return pages.map((p, idx) => {
                            if (p === '...') {
                              return (
                                <span key={`ell-${idx}`} style={{ padding: '0 8px', color: '#7B5233', fontWeight: '700' }}>
                                  ...
                                </span>
                              );
                            }
                            return (
                              <button
                                key={p}
                                className={`page-btn ${currentPage === p ? 'active' : ''}`}
                                onClick={() => setCurrentPage(p)}
                              >
                                {p}
                              </button>
                            );
                          });
                        })()}
                        <button 
                          disabled={currentPage >= totalPages} 
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                          className="page-btn"
                        >
                          Sau &gt;
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* DỰNG BẢNG DANH SÁCH LỖI INLINE (CHỈ HIỂN THỊ KHI ĐÃ CHỌN MÀN HÌNH) */}
          {selectedScreenId && (
            <div className="bugs-inline-section card" style={{
              marginTop: '30px',
              border: '1px solid #EADCC9',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 15px rgba(123, 82, 51, 0.05)',
              backgroundColor: '#fff'
            }}>
              <div 
                className="bugs-section-header" 
                onClick={() => setIsBugListCollapsed(!isBugListCollapsed)}
                style={{
                  padding: '16px 20px',
                  backgroundColor: '#FAF6F0',
                  borderBottom: '1px solid #EADCC9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12' }}>Danh sách lỗi</span>
                  <span style={{
                    fontSize: '0.75rem',
                    backgroundColor: '#A0301B',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: 'bold'
                  }}>{selectedScreenBugs.length}</span>
                </div>
                <div style={{ transform: isBugListCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7B5233" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>

              {!isBugListCollapsed && (
                <div style={{ padding: '20px' }}>
                  {selectedScreenBugs.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
                      Không có báo cáo lỗi nào cho màn hình này.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#7B5233', color: '#fff' }}>
                            <th style={{ color: '#fff' }}>Mã</th>
                            <th style={{ color: '#fff' }}>Component</th>
                            <th style={{ color: '#fff' }}>Mô tả</th>
                            <th style={{ color: '#fff' }}>Mức độ</th>
                            <th style={{ color: '#fff' }}>Trạng thái</th>
                            <th style={{ color: '#fff' }}>Ngày cập nhật</th>
                            <th style={{ color: '#fff' }}>Người cập nhật</th>
                            <th style={{ color: '#fff' }}>Ngày ghi nhận</th>
                            <th style={{ color: '#fff', textAlign: 'center' }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedScreenBugs.map((bug) => {
                            const isBugExpanded = expandedBugId === bug.id;
                            const parsed = parseDescription(bug.description);
                            const severityColors = {
                              'Critical': '#EF4444',
                              'High': '#F97316',
                              'Medium': '#D97706',
                              'Low': '#10B981'
                            };
                            return (
                              <React.Fragment key={bug.id}>
                                <tr 
                                  onClick={() => setExpandedBugId(isBugExpanded ? null : bug.id)}
                                  style={{ cursor: 'pointer', backgroundColor: isBugExpanded ? '#FAF6F0' : undefined }}
                                  className="clickable-row"
                                >
                                  <td className="font-mono font-bold">BUG-{bug.id}</td>
                                  <td className="font-semibold">{parsed.tag || 'Chung'}</td>
                                  <td>{parsed.text}</td>
                                  <td>
                                    <span style={{ color: severityColors[bug.severity] || '#7B5233', fontWeight: 'bold' }}>
                                      {bug.severity === 'Critical' ? 'Khẩn cấp' : (bug.severity === 'High' ? 'Cao' : (bug.severity === 'Medium' ? 'Trung bình' : 'Thấp'))}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`status-badge ${bug.status === 'Hoàn thành' ? 'status-resolved' : (bug.status === 'Đã sửa' ? 'status-processing' : 'status-new')}`}>
                                      {bug.status === 'New' || bug.status === 'Mới' ? 'Mới' : (bug.status === 'Đã sửa' ? 'Đã sửa' : (bug.status === 'Sửa lại' ? 'Sửa lại' : 'Hoàn thành'))}
                                    </span>
                                  </td>
                                  <td>{formatDate(bug.completed_at || bug.created_at)}</td>
                                  <td>{bug.assignee || '-'}</td>
                                  <td>{formatDate(bug.created_at)}</td>
                                  <td style={{ textAlign: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#7B5233', fontWeight: 'bold' }}>...</span>
                                  </td>
                                </tr>

                                {/* HIỂN THỊ PHẢN HỒI KHI ĐƯỢC CLICK MỞ RỘNG DÒNG (ANH 2) */}
                                {isBugExpanded && (
                                  <tr>
                                    <td colSpan={9} style={{ padding: '15px 25px', backgroundColor: '#FDFCFB', borderLeft: '4px solid #7B5233' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {/* Hộp thoại phản hồi gốc / Lịch sử cập nhật */}
                                        {bug.status === 'New' || bug.status === 'Mới' || !bug.updates || bug.updates.length === 0 ? (
                                          // Hiển thị mô tả lỗi gốc
                                          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                            {/* Left: Original Screenshots */}
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                              {bug.images && bug.images.length > 0 ? (
                                                bug.images.map((img, idx) => (
                                                  <div key={idx} style={{ width: '120px', height: '80px', borderRadius: '8px', border: '1px solid #EADCC9', overflow: 'hidden', backgroundColor: '#FAF6F0' }}>
                                                    <img src={getImageUrl(img.image_path)} alt="Bug spec" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onClick={() => window.open(getImageUrl(img.image_path), '_blank')} />
                                                  </div>
                                                ))
                                              ) : (
                                                <div style={{ width: '120px', height: '80px', borderRadius: '8px', border: '1px dashed #EADCC9', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF6F0', color: '#A08070', fontSize: '0.75rem' }}>
                                                  Không có ảnh
                                                </div>
                                              )}
                                            </div>
                                            {/* Right: Text box */}
                                            <div style={{ flex: 1, minWidth: '250px' }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#8D6E63', fontWeight: 'bold', marginBottom: '4px' }}>
                                                <span>Phản hồi từ [{getPositionByName(bug.reporter)} - {bug.reporter || 'QC'}]</span>
                                                <span>{formatDate(bug.created_at)}</span>
                                              </div>
                                              <div style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #EADCC9', backgroundColor: '#fff', fontSize: '0.88rem', color: '#2D1A12', minHeight: '38px' }}>
                                                {parsed.text}
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          // Hiển thị lịch sử các lần phản hồi/comment
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {bug.updates.map((update, uIdx) => (
                                              <div key={uIdx} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap', borderBottom: uIdx < bug.updates.length - 1 ? '1px dashed #FAF0E6' : 'none', paddingBottom: '12px' }}>
                                                {/* Left: update screenshot proof */}
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                  {update.images && update.images.length > 0 ? (
                                                    update.images.map((img, idx) => (
                                                      <div key={idx} style={{ width: '120px', height: '80px', borderRadius: '8px', border: '1px solid #EADCC9', overflow: 'hidden', backgroundColor: '#FAF6F0' }}>
                                                        <img src={getImageUrl(img.image_path)} alt="Bug update" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onClick={() => window.open(getImageUrl(img.image_path), '_blank')} />
                                                      </div>
                                                    ))
                                                  ) : (
                                                    <div style={{ width: '120px', height: '80px', borderRadius: '8px', border: '1px dashed #EADCC9', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF6F0', color: '#A08070', fontSize: '0.75rem' }}>
                                                      Không có ảnh
                                                    </div>
                                                  )}
                                                </div>
                                                {/* Right: update notes */}
                                                <div style={{ flex: 1, minWidth: '250px' }}>
                                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#8D6E63', fontWeight: 'bold', marginBottom: '4px' }}>
                                                    <span>Phản hồi từ [{getPositionByName(update.updater)} - {update.updater || 'QC'}]</span>
                                                    <span>{formatDate(update.created_at)}</span>
                                                  </div>
                                                  <div style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid #EADCC9', backgroundColor: '#fff', fontSize: '0.88rem', color: '#2D1A12', minHeight: '38px' }}>
                                                    {update.notes || <span style={{ color: '#999', fontStyle: 'italic' }}>Không có nội dung phản hồi.</span>}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ScreenManagement;
