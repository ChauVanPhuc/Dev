import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Filter, FileDown, Search, Plus, FolderTree, Briefcase, Settings, Layers } from 'lucide-react';
import api from '@webShared/Services/api.service';
import ExcelJS from 'exceljs';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { buildPermissionGroupsFromSidebar } from './utils/permissionUtils';
import '@styles/components.css';

/**
 * View: Trang Quản lý người dùng
 * Tính năng: Bảng danh sách, Phân trang, Tìm kiếm, Lọc trạng thái, Sắp xếp, Menu thao tác
 */
const renderStages = (stageName) => {
  if (!stageName) return '-';
  const stages = stageName.split(',').map(s => s.trim()).filter(Boolean);
  if (stages.length === 0) return '-';

  const limit = 2;
  const displayed = stages.slice(0, limit);
  const remaining = stages.slice(limit);

  return (
    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', maxWidth: 220 }}>
      {displayed.map((st, idx) => (
        <span
          key={idx}
          style={{
            background: '#FAF6F0',
            color: '#7B5233',
            border: '1px solid #EADCC9',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: '0.68rem',
            whiteSpace: 'nowrap',
            fontWeight: 500
          }}
        >
          {st}
        </span>
      ))}
      {remaining.length > 0 && (
        <span
          title={stages.join('\n')}
          style={{
            background: '#7B5233',
            color: '#FFF',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: '0.68rem',
            whiteSpace: 'nowrap',
            fontWeight: 'bold',
            cursor: 'help'
          }}
        >
          +{remaining.length}
        </span>
      )}
    </div>
  );
};

const UserManagement = () => {
  const navigate = useNavigate();
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/users');

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // Phân quyền
  const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const loggedInUserIsAdmin = loggedInUser.role_name === 'IT' || loggedInUser.role_name === 'BGD' || loggedInUser.username === 'admin';

  let activePermissions = {};
  try {
    activePermissions = JSON.parse(localStorage.getItem('smartflow_active_permissions') || '{}');
  } catch (e) {
    console.error('Failed to parse screen permissions in UserManagement:', e);
  }

  const hasWritePermission = loggedInUserIsAdmin || activePermissions['users'] !== 'read';

  // ─── State dữ liệu ───────────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(false);

  // ─── State tìm kiếm & lọc ────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');      // '' = tất cả
  const [roleFilter, setRoleFilter] = useState('');          // '' = tất cả
  const [stageFilter, setStageFilter] = useState('');        // '' = tất cả
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // ─── State sắp xếp ───────────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState('id');
  const [sortDir, setSortDir] = useState('desc');
  const [showSortPanel, setShowSortPanel] = useState(false);

  // ─── State menu thao tác ─────────────────────────────────────────────────────
  const [actionMenuId, setActionMenuId] = useState(null); // ID user đang mở menu
  const [showExtraMenu, setShowExtraMenu] = useState(false); // Dropdown "Khác"
  const { toast } = useToast();
  const [confirmDeleteModal, setConfirmDeleteModal] = useState({ show: false, user: null });

  // ─── State chế độ xem & phân quyền ──────────────────────────────────────────
  const [viewMode, setViewMode] = useState('account_info'); // 'account_info' | 'permissions_web' | 'permissions_mobile'
  const [showViewModePanel, setShowViewModePanel] = useState(false);
  const [userPermissions, setUserPermissions] = useState({});
  const [permsLoading, setPermsLoading] = useState(false);

  const [sidebarItems, setSidebarItems] = useState([]);
  const [screens, setScreens] = useState([]);

  useEffect(() => {
    const loadSidebarData = async () => {
      try {
        const [sidebarRes, screensRes] = await Promise.all([
          api.get('/system/sidebar/all'),
          api.get('/screens')
        ]);
        setSidebarItems(sidebarRes || []);
        setScreens(screensRes || []);
      } catch (err) {
        console.error('Failed to load sidebar for matrix view:', err);
      }
    };
    loadSidebarData();
  }, []);

  const dynamicWebGroups = useMemo(() => {
    return buildPermissionGroupsFromSidebar(sidebarItems, 'web', screens);
  }, [sidebarItems, screens]);

  const dynamicMobileGroups = useMemo(() => {
    return buildPermissionGroupsFromSidebar(sidebarItems, 'mobile', screens);
  }, [sidebarItems, screens]);

  const currentGroups = useMemo(() => {
    return viewMode === 'permissions_mobile' ? dynamicMobileGroups : dynamicWebGroups;
  }, [viewMode, dynamicWebGroups, dynamicMobileGroups]);

  const filterRef = useRef(null);
  const sortRef = useRef(null);
  const viewModeRef = useRef(null);
  const extraMenuRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setShowFilterPanel(false);
      if (sortRef.current && !sortRef.current.contains(e.target)) setShowSortPanel(false);
      if (viewModeRef.current && !viewModeRef.current.contains(e.target)) setShowViewModePanel(false);
      if (extraMenuRef.current && !extraMenuRef.current.contains(e.target)) setShowExtraMenu(false);

      // Chỉ đóng action menu khi click thực sự ra ngoài menu và ngoài nút bấm "..."
      if (typeof e.target.closest === 'function') {
        if (!e.target.closest('.action-menu') && !e.target.closest('.action-btn')) {
          setActionMenuId(null);
        }
      } else {
        setActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce tìm kiếm 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch dữ liệu khi thay đổi bất kỳ tham số nào
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, size: pageSize, sort_by: sortBy, sort_dir: sortDir });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter) params.append('status', statusFilter);
      if (roleFilter) params.append('role', roleFilter);
      if (stageFilter) params.append('stage', stageFilter);
      const res = await api.get(`/accounts/?${params.toString()}`);
      setUsers(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Lỗi khi tải danh sách người dùng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page, pageSize, debouncedSearch, statusFilter, roleFilter, stageFilter, sortBy, sortDir]);

  // Tải chi tiết phân quyền của toàn bộ user trên trang hiện tại khi ở chế độ Phân quyền
  useEffect(() => {
    const fetchAllPermissions = async () => {
      if (!viewMode.startsWith('permissions') || users.length === 0) return;
      setPermsLoading(true);
      try {
        const promises = users.map(async (user) => {
          try {
            const res = await api.get(`/accounts/${user.id}/permissions?resolved=true`);
            return { userId: user.id, permissions: res.permissions || {} };
          } catch (e) {
            console.error(`Lỗi tải quyền cho user ${user.id}:`, e);
            return { userId: user.id, permissions: {} };
          }
        });
        const results = await Promise.all(promises);
        const permMap = {};
        results.forEach(item => {
          const userPerms = {};
          dynamicWebGroups.forEach(group => {
            group.screens.forEach(scr => {
              userPerms[scr.key] = item.permissions[scr.key] || 'write';
            });
          });
          dynamicMobileGroups.forEach(group => {
            group.screens.forEach(scr => {
              userPerms[scr.key] = item.permissions[scr.key] || 'write';
            });
          });
          permMap[item.userId] = userPerms;
        });
        setUserPermissions(permMap);
      } catch (err) {
        console.error('Lỗi khi tải hàng loạt phân quyền:', err);
      } finally {
        setPermsLoading(false);
      }
    };

    fetchAllPermissions();
  }, [users, viewMode]);

  const normalizePermission = (val) => {
    if (!val || val === 'none') return 'none';
    if (
      val.includes('write') ||
      val.includes('create') ||
      val.includes('edit') ||
      val.includes('delete') ||
      val.includes('approve') ||
      val.includes('export_import')
    ) {
      return 'write';
    }
    if (val.includes('read')) return 'read';
    return 'none';
  };

  // Hàm tính toán quyền cho nhóm cha dựa trên con
  const getGroupPermissionStateForUser = (userId, group) => {
    const userPerms = userPermissions[userId];
    if (!userPerms) return 'write';
    const childVals = group.screens.map(s => normalizePermission(userPerms[s.key] || 'write'));
    const uniqueVals = Array.from(new Set(childVals));
    if (uniqueVals.length >= 2) {
      return 'write'; // Trạng thái hỗn hợp mặc định về Điều chỉnh (write)
    }
    return uniqueVals[0] || 'write';
  };

  // Hàm thay đổi nhanh quyền cả nhóm
  const handleGroupPermissionChangeForUser = async (user, groupIdx, value) => {
    const currentPerms = { ...(userPermissions[user.id] || {}) };
    const group = currentGroups[groupIdx];

    // Gán đồng loạt quyền cho các con
    group.screens.forEach(s => {
      currentPerms[s.key] = value;
    });

    // Cập nhật UI tạm thời
    setUserPermissions(prev => ({
      ...prev,
      [user.id]: currentPerms
    }));

    // Gửi yêu cầu lưu lên server
    try {
      await api.put(`/accounts/${user.id}/permissions`, {
        permissions: currentPerms
      });
      // Nếu chỉnh sửa cho chính mình, đồng bộ localStorage
      if (user.username === loggedInUser.username) {
        localStorage.setItem('smartflow_active_permissions', JSON.stringify(currentPerms));
      }
    } catch (e) {
      console.error(`Lỗi cập nhật quyền cho user ${user.id}:`, e);
      toast('error', 'Đã xảy ra lỗi khi lưu cấu hình phân quyền.');
    }
  };

  // Trả về class màu sắc tương ứng với trạng thái
  const getMatrixDropdownClass = (val) => {
    if (val === 'none') return 'matrix-none';
    if (val === 'read') return 'matrix-read';
    return 'matrix-write';
  };

  // Xử lý sắp xếp cột trong bảng Desktop
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      // Fetch all matching users without pagination limit (e.g. size = 10000)
      const params = new URLSearchParams({ page: 1, size: 10000, sort_by: sortBy, sort_dir: sortDir });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/accounts/?${params.toString()}`);
      const allUsers = res.items || [];

      // Fetch permissions for all these users
      const permsPromises = allUsers.map(async (user) => {
        try {
          const permRes = await api.get(`/accounts/${user.id}/permissions?resolved=true`);
          return { userId: user.id, permissions: permRes.permissions || {} };
        } catch (e) {
          return { userId: user.id, permissions: {} };
        }
      });
      const permsResults = await Promise.all(permsPromises);
      const permMap = {};
      permsResults.forEach(item => {
        permMap[item.userId] = item.permissions;
      });

      const workbook = new ExcelJS.Workbook();
      
      // --- SHEET 1: DANH SÁCH TÀI KHOẢN ---
      const ws1 = workbook.addWorksheet("Danh sách tài khoản");
      ws1.views = [{ showGridLines: true }];

      // Title
      ws1.mergeCells('A1:J1');
      const titleCell = ws1.getCell('A1');
      titleCell.value = "DANH SÁCH TÀI KHOẢN NGƯỜI DÙNG";
      titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B5233' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws1.getRow(1).height = 40;

      // Headers
      const headers1 = [
        "STT", "Mã NV", "Họ và tên", "Username", "Số điện thoại", 
        "Phòng ban", "Bộ phận", "Vị trí", "Nhà máy", "Quyền hạn / Công đoạn", "Truy cập Mobile", "Trạng thái"
      ];
      ws1.addRow([]);
      ws1.getRow(2).height = 10;
      const headerRow1 = ws1.addRow(headers1);
      headerRow1.height = 30;
      headerRow1.eachCell((cell) => {
        cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B5233' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
          left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
          bottom: { style: 'medium', color: { argb: 'FF7B5233' } },
          right: { style: 'thin', color: { argb: 'FFBFBFBF' } }
        };
      });

      // Data Rows
      allUsers.forEach((user, idx) => {
        const isEven = idx % 2 === 1;
        const rowData = [
          idx + 1,
          user.employee_id || "",
          user.full_name || "",
          user.username || "",
          user.phone || "-",
          user.role_name || "-",
          user.department_name || "-",
          user.permission_name || "-",
          user.factory_name || "-",
          user.permission_level ? user.permission_level : (user.stage_name || "-"),
          user.is_mobile_allowed !== false ? "Cho phép" : "Chặn",
          user.status || ""
        ];
        const addedRow = ws1.addRow(rowData);
        addedRow.height = 24;
        addedRow.eachCell((cell, colNum) => {
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
          };
          if (isEven) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDFBF7' } };
          }
          if (colNum === 1 || colNum === 2 || colNum === 5 || colNum === 11 || colNum === 12) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
          if (colNum === 12) {
            const status = user.status;
            cell.font = { name: 'Segoe UI', size: 10, bold: true };
            if (status === 'Đang sử dụng') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } };
              cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF137333' } };
            } else if (status === 'Dừng hoạt động') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE8E6' } };
              cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFC5221F' } };
            } else {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF7E0' } };
              cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'B06000' } };
            }
          }
        });
      });

      ws1.columns = [
        { width: 8 },   // STT
        { width: 15 },  // Mã NV
        { width: 25 },  // Họ tên
        { width: 18 },  // Username
        { width: 16 },  // Số ĐT
        { width: 18 },  // Phòng ban
        { width: 18 },  // Bộ phận
        { width: 18 },  // Vị trí
        { width: 16 },  // Nhà máy
        { width: 28 },  // Quyền hạn / công đoạn
        { width: 16 },  // Mobile
        { width: 18 }   // Trạng thái
      ];


      // --- SHEET 2: PHÂN QUYỀN CHI TIẾT (WEB) ---
      const ws2 = workbook.addWorksheet("Phân quyền Web");
      ws2.views = [{ showGridLines: true }];

      // Title
      ws2.mergeCells('A1:Z1');
      const titleCell2 = ws2.getCell('A1');
      titleCell2.value = "MA TRẬN PHÂN QUYỀN CHI TIẾT PHIÊN BẢN WEB";
      titleCell2.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B5233' } };
      titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };
      ws2.getRow(1).height = 36;

      // Extract all screen headers
      const webScreens = [];
      dynamicWebGroups.forEach(g => {
        g.screens.forEach(s => {
          webScreens.push(s);
        });
      });

      const headers2 = ["STT", "Mã NV", "Họ và tên", ...webScreens.map(s => s.name)];
      ws2.addRow([]);
      ws2.getRow(2).height = 10;
      const headerRow2 = ws2.addRow(headers2);
      headerRow2.height = 32;
      headerRow2.eachCell((cell) => {
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B5233' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
          left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
          bottom: { style: 'medium', color: { argb: 'FF7B5233' } },
          right: { style: 'thin', color: { argb: 'FFBFBFBF' } }
        };
      });

      allUsers.forEach((user, idx) => {
        const isEven = idx % 2 === 1;
        const uPerms = permMap[user.id] || {};
        const rowData = [
          idx + 1,
          user.employee_id || "",
          user.full_name || "",
          ...webScreens.map(s => {
            const val = normalizePermission(uPerms[s.key] || 'write');
            return val === 'write' ? 'Điều chỉnh' : val === 'read' ? 'Truy cập' : 'Không được phép';
          })
        ];
        const addedRow = ws2.addRow(rowData);
        addedRow.height = 24;
        addedRow.eachCell((cell, colNum) => {
          cell.font = { name: 'Segoe UI', size: 9.5 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
          };
          if (isEven) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDFBF7' } };
          }
          if (colNum === 1 || colNum === 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNum === 3) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            const val = cell.value;
            if (val === 'Điều chỉnh') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } };
              cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF137333' } };
            } else if (val === 'Truy cập') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
              cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF1A73E8' } };
            } else {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE8E6' } };
              cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFC5221F' } };
            }
          }
        });
      });

      // Widths for ws2
      const ws2Widths = [{ width: 6 }, { width: 12 }, { width: 22 }];
      webScreens.forEach(() => ws2Widths.push({ width: 18 }));
      ws2.columns = ws2Widths;

      // --- SHEET 3: PHÂN QUYỀN CHI TIẾT (MOBILE) ---
      const ws3 = workbook.addWorksheet("Phân quyền Mobile");
      ws3.views = [{ showGridLines: true }];

      // Title
      ws3.mergeCells('A1:Z1');
      const titleCell3 = ws3.getCell('A1');
      titleCell3.value = "MA TRẬN PHÂN QUYỀN CHI TIẾT PHIÊN BẢN MOBILE";
      titleCell3.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B5233' } };
      titleCell3.alignment = { horizontal: 'center', vertical: 'middle' };
      ws3.getRow(1).height = 36;

      // Extract all screen headers
      const mobileScreens = [];
      dynamicMobileGroups.forEach(g => {
        g.screens.forEach(s => {
          mobileScreens.push(s);
        });
      });

      const headers3 = ["STT", "Mã NV", "Họ và tên", ...mobileScreens.map(s => s.name)];
      ws3.addRow([]);
      ws3.getRow(2).height = 10;
      const headerRow3 = ws3.addRow(headers3);
      headerRow3.height = 32;
      headerRow3.eachCell((cell) => {
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B5233' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
          left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
          bottom: { style: 'medium', color: { argb: 'FF7B5233' } },
          right: { style: 'thin', color: { argb: 'FFBFBFBF' } }
        };
      });

      allUsers.forEach((user, idx) => {
        const isEven = idx % 2 === 1;
        const uPerms = permMap[user.id] || {};
        const rowData = [
          idx + 1,
          user.employee_id || "",
          user.full_name || "",
          ...mobileScreens.map(s => {
            const val = normalizePermission(uPerms[s.key] || 'write');
            return val === 'write' ? 'Điều chỉnh' : val === 'read' ? 'Truy cập' : 'Không được phép';
          })
        ];
        const addedRow = ws3.addRow(rowData);
        addedRow.height = 24;
        addedRow.eachCell((cell, colNum) => {
          cell.font = { name: 'Segoe UI', size: 9.5 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
          };
          if (isEven) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDFBF7' } };
          }
          if (colNum === 1 || colNum === 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNum === 3) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            const val = cell.value;
            if (val === 'Điều chỉnh') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } };
              cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF137333' } };
            } else if (val === 'Truy cập') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
              cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF1A73E8' } };
            } else {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE8E6' } };
              cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFC5221F' } };
            }
          }
        });
      });

      // Widths for ws3
      const ws3Widths = [{ width: 6 }, { width: 12 }, { width: 22 }];
      mobileScreens.forEach(() => ws3Widths.push({ width: 18 }));
      ws3.columns = ws3Widths;

      // Save workbook to file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Danh_sach_tai_khoan_va_phan_quyen_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);

    } catch (e) {
      console.error('Lỗi khi xuất dữ liệu excel:', e);
      toast('error', 'Đã xảy ra lỗi khi xuất file Excel.');
    } finally {
      setLoading(false);
    }
  };

  // Icon mũi tên sắp xếp
  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <span style={{ color: '#CCC', marginLeft: 4 }}>↕</span>;
    return <span style={{ color: '#7B5233', marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // Màu sắc Trạng thái
  const getStatusStyle = (status) => {
    switch (status) {
      case 'Đang sử dụng': return { color: '#2E7D32', fontWeight: 'bold' };
      case 'Dừng hoạt động': return { color: '#D32F2F', fontWeight: 'bold' };
      case 'Đang chờ xóa': return { color: '#ED6C02', fontWeight: 'bold' };
      default: return { color: '#757575' };
    }
  };

  const handleAction = (action, user) => {
    setActionMenuId(null);
    if (action === 'edit') navigate(`/admin/users/edit/${user.id}`);
    if (action === 'permissions') navigate(`/admin/users/edit/${user.id}`);
    if (action === 'lock') toast('info', `Tính năng "Khóa tài khoản" cho ${user.full_name} đang được phát triển.`);
    if (action === 'reset_password') toast('info', `Tính năng "Reset mật khẩu" cho ${user.full_name} đang được phát triển.`);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="mgmt-container">
      {/* ── Phần nội dung chính ── */}
      <div className="mgmt-main">

        {/* ── Thanh công cụ (Toolbar) ── */}
        <PageToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Nhập tên hoặc mã nhân viên..."
          showSort={true}
          sortOptions={[
            { label: 'Sắp xếp', value: '' },
            { label: 'Mã nhân viên', value: 'employee_id' },
            { label: 'Họ tên (A-Z)', value: 'full_name' },
            { label: 'Số ĐT', value: 'phone' },
            { label: 'Trạng thái', value: 'status' }
          ]}
          sortValue={sortBy}
          onSortChange={(val) => { setSortBy(val); setSortDir('asc'); setPage(1); }}
          showFilter={true}
          isFilterOpen={showFilterPanel}
          onFilterToggle={() => setShowFilterPanel(!showFilterPanel)}
          activeFiltersCount={(statusFilter ? 1 : 0) + (roleFilter ? 1 : 0) + (stageFilter ? 1 : 0) + (viewMode !== 'account_info' ? 1 : 0)}
          extraActions={[
            {
              label: 'Bộ phận',
              icon: <FolderTree size={14} />,
              onClick: () => navigate('/admin/users/departments')
            }
          ]}
          onExport={handleExportExcel}
          isExporting={loading}
          onCreate={hasWritePermission ? () => navigate('/admin/users/create') : undefined}
          createLabel="Tạo mới"
          hasWritePermission={hasWritePermission}
        />

        {/* INLINE EXPANDABLE FILTER BAR */}
        {showFilterPanel && (
          <div className="filter-inline-bar" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {/* Lọc theo Trạng thái */}
            <div className="filter-field-group">
              <label className="filter-field-label">Trạng thái nhân viên</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Đang sử dụng">Đang sử dụng</option>
                <option value="Dừng hoạt động">Dừng hoạt động</option>
                <option value="Đang chờ xóa">Đang chờ xóa</option>
              </select>
            </div>

            {/* Lọc theo Chức vụ / Role */}
            <div className="filter-field-group">
              <label className="filter-field-label">Chức vụ / Vai trò</label>
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              >
                <option value="">Tất cả chức vụ</option>
                <option value="IT">IT System</option>
                <option value="BGD">Ban Giám Đốc</option>
                <option value="Quản lý">Quản lý sản xuất</option>
                <option value="Tổ trưởng">Tổ trưởng</option>
                <option value="QC">QC / Kiểm định</option>
                <option value="Nhân viên">Nhân viên</option>
              </select>
            </div>

            {/* Lọc theo Công đoạn gán */}
            <div className="filter-field-group">
              <label className="filter-field-label">Công đoạn gán</label>
              <select
                value={stageFilter}
                onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
              >
                <option value="">Tất cả công đoạn</option>
                <option value="Sơn">Phân xưởng Sơn</option>
                <option value="Lắp ráp">Lắp ráp</option>
                <option value="Đóng gói">Đóng gói</option>
                <option value="Mộc">Chế biến Mộc</option>
              </select>
            </div>

            {/* Chế độ xem */}
            <div className="filter-field-group">
              <label className="filter-field-label">Chế độ xem phân quyền</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
              >
                <option value="account_info">Thông tin tài khoản</option>
                <option value="permissions_web">Phân quyền Web</option>
                <option value="permissions_mobile">Phân quyền Mobile</option>
              </select>
            </div>

            {/* Hiển thị số dòng */}
            <div className="filter-field-group">
              <label className="filter-field-label">Hiển thị số dòng</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
              >
                <option value={15}>15 dòng</option>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
            </div>

            {/* Nút Xóa bộ lọc */}
            {(statusFilter || roleFilter || stageFilter || viewMode !== 'account_info' || pageSize !== 15) && (
              <div className="filter-field-group">
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => {
                    setStatusFilter('');
                    setRoleFilter('');
                    setStageFilter('');
                    setViewMode('account_info');
                    setPageSize(15);
                    setPage(1);
                  }}
                  style={{
                    height: '36px',
                    padding: '0 12px',
                    fontSize: '0.8rem',
                    backgroundColor: '#FAF6F0',
                    color: '#7B5233',
                    border: '1px solid #EADCC9',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Bảng dữ liệu ── */}
        <div className="admin-list-layout">
          <div className="mgmt-table card admin-table-card">
            {loading ? (
              <div className="loading-state">Đang tải dữ liệu...</div>
            ) : (
              <>
                {/* Bảng Desktop */}
                <div className="table-responsive desktop-only admin-table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th onClick={() => handleSort('employee_id')} style={{ cursor: 'pointer' }}>
                          Mã NV <SortIcon column="employee_id" />
                        </th>
                        <th onClick={() => handleSort('full_name')} style={{ cursor: 'pointer' }}>
                          Tên <SortIcon column="full_name" />
                        </th>
                        {viewMode === 'account_info' ? (
                          <>
                            <th>Phòng ban</th>
                            <th>Bộ phận</th>
                            <th>Vị trí</th>
                            <th>Nhà máy</th>
                            <th>Công đoạn / Quyền hạn</th>
                            <th>Username</th>
                            <th onClick={() => handleSort('phone')} style={{ cursor: 'pointer' }}>
                              Số ĐT <SortIcon column="phone" />
                            </th>
                            <th>Truy cập Mobile</th>
                            <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                              Trạng thái <SortIcon column="status" />
                            </th>
                            {hasWritePermission && <th>Thao tác</th>}
                          </>
                        ) : (
                          <>
                            {currentGroups.map((group) => (
                              <th key={group.title} style={{ width: '225px', minWidth: '200px' }}>
                                {group.title}
                              </th>
                            ))}
                            {hasWritePermission && <th style={{ width: '120px', minWidth: '100px', textAlign: 'center' }}>Thao tác</th>}
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="animate-card-entrance"
                          style={{
                            position: 'relative',
                            zIndex: actionMenuId === user.id ? 30 : 1
                          }}
                        >
                          <td>{user.employee_id}</td>
                          <td className="font-bold">{user.full_name}</td>
                          {viewMode === 'account_info' ? (
                            <>
                              <td>{user.role_name || '-'}</td>
                              <td>{user.department_name || '-'}</td>
                              <td>{user.permission_name || '-'}</td>
                              <td>{user.factory_name || '-'}</td>
                              <td>{user.permission_level ? <span style={{ fontWeight: '500', color: '#7B5233' }}>{user.permission_level}</span> : renderStages(user.stage_name)}</td>
                              <td>{user.username}</td>
                              <td>{user.phone || '-'}</td>
                              <td>
                                <span 
                                  style={{
                                    display: 'inline-block',
                                    padding: '3px 10px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    backgroundColor: user.is_mobile_allowed !== false ? '#EFF6FF' : '#FEF2F2',
                                    color: user.is_mobile_allowed !== false ? '#1D4ED8' : '#DC2626',
                                    border: `1px solid ${user.is_mobile_allowed !== false ? '#BFDBFE' : '#FCA5A5'}`,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {user.is_mobile_allowed !== false ? 'Cho phép' : 'Chặn'}
                                </span>
                              </td>
                              <td>
                                <span 
                                  style={{
                                    display: 'inline-block',
                                    padding: '3px 10px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    backgroundColor: user.status === 'Đang sử dụng' ? '#ECFDF5' : user.status === 'Dừng hoạt động' ? '#FEF2F2' : '#FFFBEB',
                                    color: user.status === 'Đang sử dụng' ? '#10B981' : user.status === 'Dừng hoạt động' ? '#EF4444' : '#D97706',
                                    border: `1px solid ${user.status === 'Đang sử dụng' ? '#A7F3D0' : user.status === 'Dừng hoạt động' ? '#FCA5A5' : '#FDE68A'}`,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {user.status}
                                </span>
                              </td>
                              {hasWritePermission && (
                                <td style={{ position: 'relative', zIndex: actionMenuId === user.id ? 40 : 1 }}>
                                  <button
                                    className="action-btn"
                                    onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                                  ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
                                  {actionMenuId === user.id && (
                                    <div className="action-menu">
                                      <button className="action-menu-item" onClick={() => handleAction('edit', user)}>Chỉnh sửa</button>
                                      <button className="action-menu-item warn" onClick={() => handleAction('lock', user)}>Khóa tài khoản</button>
                                      <button className="action-menu-item danger" onClick={() => handleAction('reset_password', user)}>Reset mật khẩu</button>
                                    </div>
                                  )}
                                </td>
                              )}
                            </>
                          ) : (
                            <>
                              <td>{user.role_name === 'IT' || user.role_name === 'BGD' ? 'Hành chính' : 'Sản xuất'}</td>

                              {currentGroups.map((group, groupIdx) => {
                                const userPerms = userPermissions[user.id];
                                if (!userPerms || permsLoading) {
                                  return (
                                    <td key={group.title}>
                                      <select className="matrix-select-dropdown matrix-loading" disabled>
                                        <option>Đang tải...</option>
                                      </select>
                                    </td>
                                  );
                                }
                                const groupVal = getGroupPermissionStateForUser(user.id, group);
                                return (
                                  <td key={group.title}>
                                    <select
                                      value={groupVal}
                                      onChange={(e) => handleGroupPermissionChangeForUser(user, groupIdx, e.target.value)}
                                      className={`matrix-select-dropdown ${getMatrixDropdownClass(groupVal)}`}
                                      disabled={!hasWritePermission}
                                      style={!hasWritePermission ? { cursor: 'not-allowed', opacity: 0.8 } : {}}
                                    >
                                      <option value="none">Không được phép</option>
                                      <option value="read">Truy cập</option>
                                      <option value="write">Điều chỉnh</option>
                                    </select>
                                  </td>
                                );
                              })}
                              {hasWritePermission && (
                                <td style={{ position: 'relative', zIndex: actionMenuId === user.id ? 40 : 1, textAlign: 'center' }}>
                                  <button
                                    className="action-btn"
                                    onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                                  ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
                                  {actionMenuId === user.id && (
                                    <div className="action-menu">
                                      <button className="action-menu-item" onClick={() => handleAction('edit', user)}>Chỉnh sửa</button>
                                      <button className="action-menu-item warn" onClick={() => handleAction('lock', user)}>Khóa tài khoản</button>
                                      <button className="action-menu-item danger" onClick={() => handleAction('reset_password', user)}>Reset mật khẩu</button>
                                    </div>
                                  )}
                                </td>
                              )}
                            </>
                          )}
                        </tr>
                      ))}
                      {users.length === 0 && !loading && (
                        <tr>
                          <td colSpan={viewMode === 'account_info' ? (hasWritePermission ? 9 : 8) : (hasWritePermission ? 3 + currentGroups.length + 1 : 3 + currentGroups.length)} style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
                            Không tìm thấy dữ liệu
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Thẻ Mobile */}
                <div className="mobile-only mgmt-cards-container">
                  {users.length === 0 && !loading && <div className="no-data-text-mobile">Không tìm thấy dữ liệu</div>}
                  {users.map((user) => (
                    <div key={user.id} className="mgmt-card animate-card-entrance" style={{ zIndex: actionMenuId === user.id ? 100 : 1 }}>
                      {viewMode === 'account_info' ? (
                        <>
                          <div className="mgmt-card-main">
                            <div className="mgmt-card-avatar">{user.full_name?.charAt(0) || 'U'}</div>
                            <div className="mgmt-card-details">
                              <div className="mgmt-card-title-row">
                                <h4 className="mgmt-card-title">{user.full_name}</h4>
                                <span className="mgmt-card-subtitle">#{user.employee_id}</span>
                              </div>
                              <div className="mgmt-card-meta-chips">
                                <span className="mgmt-card-chip">{user.role_name === 'IT' || user.role_name === 'BGD' ? 'Hành chính' : 'Sản xuất'}</span>
                                <span className="mgmt-card-chip secondary" title={user.stage_name}>
                                  {user.stage_name ? (
                                    user.stage_name.split(',').length > 1 ? (
                                      `${user.stage_name.split(',')[0].trim()} +${user.stage_name.split(',').length - 1}`
                                    ) : (
                                      user.stage_name
                                    )
                                  ) : (
                                    'Chưa gán'
                                  )}
                                </span>
                              </div>
                            </div>
                            {hasWritePermission && (
                              <div className="mgmt-card-actions">
                                <button
                                  className="action-btn"
                                  onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                                ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
                                {actionMenuId === user.id && (
                                  <div className="action-menu">
                                    <button className="action-menu-item" onClick={() => handleAction('edit', user)}>Chỉnh sửa</button>
                                    <button className="action-menu-item warn" onClick={() => handleAction('lock', user)}>Khóa tài khoản</button>
                                    <button className="action-menu-item danger" onClick={() => handleAction('reset_password', user)}>Reset mật khẩu</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="mgmt-card-footer">
                            <div className="mgmt-card-footer-left font-semibold">{user.role_name}</div>
                            <span className="status-dot-badge" style={getStatusStyle(user.status)}>
                              <span className="dot" style={{ backgroundColor: getStatusStyle(user.status).color }}></span>
                              {user.status}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div style={{ padding: '15px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #EADCC9', paddingBottom: '8px', position: 'relative' }}>
                            <div>
                              <h4 className="mgmt-card-title" style={{ margin: 0, fontSize: '1rem' }}>{user.full_name}</h4>
                              <span className="mgmt-card-subtitle" style={{ fontSize: '0.8rem', color: '#888' }}>#{user.employee_id} • {user.role_name === 'IT' || user.role_name === 'BGD' ? 'Hành chính' : 'Sản xuất'}</span>
                            </div>
                            {hasWritePermission && (
                              <div className="mgmt-card-actions" style={{ position: 'relative', zIndex: actionMenuId === user.id ? 110 : 2 }}>
                                <button
                                  className="action-btn"
                                  onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                                ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
                                {actionMenuId === user.id && (
                                  <div className="action-menu" style={{ right: 0, top: '100%' }}>
                                    <button className="action-menu-item" onClick={() => handleAction('edit', user)}>Chỉnh sửa</button>
                                    <button className="action-menu-item warn" onClick={() => handleAction('lock', user)}>Khóa tài khoản</button>
                                    <button className="action-menu-item danger" onClick={() => handleAction('reset_password', user)}>Reset mật khẩu</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {currentGroups.map((group, groupIdx) => {
                              const userPerms = userPermissions[user.id];
                              if (!userPerms || permsLoading) {
                                return (
                                  <div key={group.title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555' }}>{group.title}</span>
                                    <select className="matrix-select-dropdown matrix-loading" disabled style={{ width: '140px' }}>
                                      <option>Đang tải...</option>
                                    </select>
                                  </div>
                                );
                              }
                              const groupVal = getGroupPermissionStateForUser(user.id, group);
                              return (
                                <div key={group.title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555' }}>{group.title}</span>
                                  <select
                                    value={groupVal}
                                    onChange={(e) => handleGroupPermissionChangeForUser(user, groupIdx, e.target.value)}
                                    className={`matrix-select-dropdown ${getMatrixDropdownClass(groupVal)}`}
                                    disabled={!hasWritePermission}
                                    style={{
                                      width: '140px',
                                      ...(!hasWritePermission ? { cursor: 'not-allowed', opacity: 0.8 } : {})
                                    }}
                                  >
                                    <option value="none">Không được phép</option>
                                    <option value="read">Truy cập</option>
                                    <option value="write">Điều chỉnh</option>
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Phân trang - Desktop */}
                <div className="admin-pagination-desktop desktop-only">
                  <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                    Hiển thị <b>{total > 0 ? (page - 1) * pageSize + 1 : 0} - {Math.min(page * pageSize, total)}</b> trên <b>{total}</b> người dùng
                  </div>

                  {totalPages > 1 && (
                    <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="page-btn"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      {(() => {
                        const pages = [];
                        const delta = 2;
                        for (let i = 1; i <= totalPages; i++) {
                          if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
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
                              className={`page-btn ${page === p ? 'active' : ''}`}
                              onClick={() => setPage(p)}
                            >
                              {p}
                            </button>
                          );
                        });
                      })()}
                      <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                        className="page-btn"
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

        {/* Phân trang - Mobile Sticky */}
        {totalPages > 1 && (
          <div className="pagination-mobile-sticky mobile-only">
            <button className="page-btn" onClick={() => setPage(Math.max(page - 1, 1))} disabled={page === 1}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#7B5233' }}>Trang {page} / {totalPages || 1}</span>
            <button className="page-btn" onClick={() => setPage(Math.min(page + 1, totalPages))} disabled={page === totalPages || totalPages <= 1}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
      <style>{`
        .matrix-select-dropdown {
          width: 100%;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          border: 1px solid transparent;
          outline: none;
          cursor: pointer;
          transition: all 0.2s ease;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237B5233' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 8px center;
          background-size: 12px;
          padding-right: 28px;
        }
        .matrix-none {
          background-color: #FEF2F2 !important;
          border-color: #FECACA !important;
          color: #991B1B !important;
        }
        .matrix-read {
          background-color: #EFF6FF !important;
          border-color: #BFDBFE !important;
          color: #1E40AF !important;
        }
        .matrix-write {
          background-color: #ECFDF5 !important;
          border-color: #A7F3D0 !important;
          color: #065F46 !important;
        }
        .matrix-loading {
          background-color: #F3F4F6 !important;
          border-color: #E5E7EB !important;
          color: #6B7280 !important;
          cursor: not-allowed;
        }
        .matrix-select-dropdown option {
          background-color: #fff !important;
          color: #333 !important;
        }
        .view-mode-selector-btn:hover {
          background-color: #F5EFEB !important;
        }
        @media (max-width: 768px) {
          .toolbar-left {
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .toolbar-left .search-wrapper {
            width: 100% !important;
            flex: none !important;
            min-width: 100% !important;
          }
          .view-mode-selector-wrapper {
            width: 100% !important;
            flex: none !important;
          }
          .view-mode-selector-wrapper .view-mode-selector-btn {
            width: 100% !important;
            min-width: 100% !important;
          }
          .view-mode-selector-wrapper .dropdown-panel {
            width: 100% !important;
          }
        }
      `}</style>
      <BeautifulConfirmModal
        visible={confirmDeleteModal.show}
        title="Xác nhận xóa tài khoản"
        message={`Bạn có chắc muốn xóa tài khoản "${confirmDeleteModal.user?.full_name}"?`}
        onConfirm={() => {
          setConfirmDeleteModal({ show: false, user: null });
          toast('info', 'Tính năng xóa đang được phát triển.');
        }}
        onCancel={() => setConfirmDeleteModal({ show: false, user: null })}
        confirmText="Xóa tài khoản"
        cancelText="Hủy"
        type="error"
      />
    </div>
  );
};

export default UserManagement;

