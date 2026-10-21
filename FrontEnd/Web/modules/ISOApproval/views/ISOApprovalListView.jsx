import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  AlertOctagon,
  Eye,
  History,
  Download,
  Share2,
  FileCheck,
  Filter,
  CheckSquare,
  Square,
  Clock,
  Layers,
  FileText,
  UserCheck,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { API_ROOT } from '@webShared/Services/api.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import '@webShared/Views/components/layout/PageToolbar.css';
import '@styles/components.css';

import isoApprovalService from '../services/isoApproval.service';
import ApprovalStatsCards from '../components/ApprovalStatsCards';
import ApprovalDetailModal from '../components/ApprovalDetailModal';
import ApprovalActionModal from '../components/ApprovalActionModal';
import ApprovalHistoryModal from '../components/ApprovalHistoryModal';
import ISOApprovalPagination from '../components/ISOApprovalPagination';
import { formatVietnameseDateTime, formatVietnameseDate } from '../utils/isoDateUtils';
import '../styles/isoApproval.css';

export const ISOApprovalListView = () => {
  const outletContext = useOutletContext() || {};
  const setCustomTitle = outletContext.setCustomTitle || (() => {});
  const setCustomSubtitle = outletContext.setCustomSubtitle || (() => {});
  const setCustomScreenCode = outletContext.setCustomScreenCode || (() => {});

  const { toast } = useToast();
  const navigate = useNavigate();

  // Dữ liệu chính
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    draft: 0
  });
  const [loading, setLoading] = useState(false);

  // Bộ lọc
  const [statusTab, setStatusTab] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected' | 'draft'
  const [itemTypeFilter, setItemTypeFilter] = useState('all'); // 'all' | 'document' | 'process'
  const [departmentFilter, setDepartmentFilter] = useState('all'); // 'all' | 'CL' | 'SX' | 'KT' | 'KHO' | 'IT' | 'BGD'
  const [issuerFilter, setIssuerFilter] = useState('all');
  const [approverFilter, setApproverFilter] = useState('all');
  const [documentLevelFilter, setDocumentLevelFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [sortOption, setSortOption] = useState('');

  // Lựa chọn nhiều dòng (Batch selection)
  const [selectedItems, setSelectedItems] = useState([]); // Array of { item_type, item_id }

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Modals state
  const [detailModal, setDetailModal] = useState({
    show: false,
    item: null,
    loading: false
  });

  const [actionModal, setActionModal] = useState({
    show: false,
    actionType: 'approve', // 'approve' | 'reject' | 'forward'
    item: null,
    loading: false
  });

  const [historyModal, setHistoryModal] = useState({
    show: false,
    item: null,
    logs: [],
    loading: false
  });

  const [batchActionModal, setBatchActionModal] = useState({
    show: false,
    loading: false
  });

  // Quản lý dropdown thao tác 3 chấm trên từng dòng (id dạng `${item_type}_${id}`)
  const [actionMenuId, setActionMenuId] = useState(null);

  // Đóng dropdown thao tác 3 chấm khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.iso-action-dropdown-wrapper')) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Thiết lập tiêu đề Header của hệ thống
  useEffect(() => {
    setCustomTitle('Hồ sơ cần duyệt');
    setCustomSubtitle('Thẩm định và phê duyệt các tài liệu mẫu, quy trình thực tế áp dụng chuẩn ISO');
    setCustomScreenCode('ISO-APPROVALS');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // Tải dữ liệu thống kê
  const fetchStats = useCallback(async () => {
    try {
      const res = await isoApprovalService.getStats();
      if (res) {
        setStats(res);
      }
    } catch (err) {
      console.error('Lỗi khi tải thống kê phê duyệt:', err);
    }
  }, []);

  // Tải danh sách hồ sơ
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await isoApprovalService.getItems({
        status: statusTab,
        item_type: itemTypeFilter,
        department: departmentFilter,
        keyword: searchTerm.trim() || undefined,
        issuer: issuerFilter !== 'all' ? issuerFilter : undefined,
        approver: approverFilter !== 'all' ? approverFilter : undefined,
        document_level: documentLevelFilter !== 'all' ? documentLevelFilter : undefined
      });
      setItems(Array.isArray(res) ? res : []);
      setSelectedItems([]); // Reset selection on reload
    } catch (err) {
      console.error('Lỗi khi tải danh sách hồ sơ:', err);
      toast('error', 'Không thể tải danh sách hồ sơ cần duyệt!');
    } finally {
      setLoading(false);
    }
  }, [statusTab, itemTypeFilter, departmentFilter, searchTerm, issuerFilter, approverFilter, documentLevelFilter, toast]);

  useEffect(() => {
    fetchStats();
    fetchItems();
  }, [fetchStats, fetchItems]);

  // Danh sách gợi ý người đề xuất & người duyệt
  const availableIssuers = useMemo(() => {
    const s = new Set();
    items.forEach((i) => {
      if (i.issuer) s.add(i.issuer);
    });
    return Array.from(s).sort();
  }, [items]);

  const availableApprovers = useMemo(() => {
    const s = new Set();
    items.forEach((i) => {
      if (i.approver) s.add(i.approver);
    });
    return Array.from(s).sort();
  }, [items]);

  // Đếm số lượng bộ lọc nâng cao đang active (trong khung lọc nâng cao)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (departmentFilter !== 'all') count++;
    if (issuerFilter !== 'all') count++;
    if (approverFilter !== 'all') count++;
    if (itemTypeFilter !== 'all') count++;
    if (documentLevelFilter !== 'all') count++;
    return count;
  }, [departmentFilter, issuerFilter, approverFilter, itemTypeFilter, documentLevelFilter]);

  // Đặt lại các bộ lọc nâng cao về mặc định
  const handleResetFilters = () => {
    setItemTypeFilter('all');
    setDepartmentFilter('all');
    setIssuerFilter('all');
    setApproverFilter('all');
    setDocumentLevelFilter('all');
    setSortOption('');
    setCurrentPage(1);
  };

  // Click vào thẻ KPI để lọc theo trạng thái
  const handleSelectKpiCard = (key) => {
    if (statusTab === key && key !== 'all') {
      setStatusTab('all');
    } else {
      setStatusTab(key);
    }
    setCurrentPage(1);
  };

  // Sắp xếp dữ liệu theo lựa chọn sortOption của PageToolbar
  const sortedItems = useMemo(() => {
    let list = [...items];
    if (sortOption === 'time-desc') {
      list.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
    } else if (sortOption === 'time-asc') {
      list.sort((a, b) => new Date(a.updated_at || a.created_at || 0) - new Date(b.updated_at || b.created_at || 0));
    } else if (sortOption === 'code-asc') {
      list.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    } else if (sortOption === 'code-desc') {
      list.sort((a, b) => (b.code || '').localeCompare(a.code || ''));
    } else if (sortOption === 'name-asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortOption === 'name-desc') {
      list.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    }
    return list;
  }, [items, sortOption]);

  // Phân trang Client
  const totalPages = Math.ceil(sortedItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  // Xử lý chọn / bỏ chọn từng dòng
  const handleToggleSelectRow = (item) => {
    const isSelected = selectedItems.some(
      (si) => si.item_type === item.item_type && si.item_id === item.id
    );
    if (isSelected) {
      setSelectedItems(selectedItems.filter(
        (si) => !(si.item_type === item.item_type && si.item_id === item.id)
      ));
    } else {
      setSelectedItems([...selectedItems, { item_type: item.item_type, item_id: item.id }]);
    }
  };

  // Chọn / bỏ chọn tất cả các dòng trên trang hiện tại
  const isAllPageSelected = paginatedItems.length > 0 && paginatedItems.every((item) =>
    selectedItems.some((si) => si.item_type === item.item_type && si.item_id === item.id)
  );

  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected) {
      // Bỏ chọn các item trên trang này
      const pageKeys = new Set(paginatedItems.map((i) => `${i.item_type}_${i.id}`));
      setSelectedItems(selectedItems.filter((si) => !pageKeys.has(`${si.item_type}_${si.item_id}`)));
    } else {
      // Thêm các item chưa được chọn trên trang này
      const currentKeys = new Set(selectedItems.map((si) => `${si.item_type}_${si.item_id}`));
      const newSelections = [...selectedItems];
      for (const item of paginatedItems) {
        if (!currentKeys.has(`${item.item_type}_${item.id}`)) {
          newSelections.push({ item_type: item.item_type, item_id: item.id });
        }
      }
      setSelectedItems(newSelections);
    }
  };

  // Mở modal Xem chi tiết
  const handleOpenDetail = async (item) => {
    setDetailModal({ show: true, item: null, loading: true });
    try {
      const res = await isoApprovalService.getItemDetail(item.item_type, item.id);
      setDetailModal({ show: true, item: res, loading: false });
    } catch (err) {
      console.error('Lỗi lấy chi tiết hồ sơ:', err);
      toast('error', 'Không thể tải chi tiết hồ sơ!');
      setDetailModal({ show: false, item: null, loading: false });
    }
  };

  // Mở modal Lịch sử phê duyệt
  const handleOpenHistory = async (item) => {
    setHistoryModal({ show: true, item, logs: [], loading: true });
    try {
      const res = await isoApprovalService.getApprovalHistory(item.item_type, item.id);
      setHistoryModal({ show: true, item, logs: res || [], loading: false });
    } catch (err) {
      console.error('Lỗi lấy lịch sử duyệt:', err);
      toast('error', 'Không thể tải lịch sử vết duyệt!');
      setHistoryModal({ show: false, item: null, logs: [], loading: false });
    }
  };

  // Mở modal Thao tác (Approve / Reject / Forward)
  const handleOpenActionModal = (actionType, item) => {
    setActionModal({
      show: true,
      actionType,
      item,
      loading: false
    });
  };

  // Submit hành động Phê duyệt / Từ chối / Chuyển cấp
  const handleActionSubmit = async (payload) => {
    setActionModal((prev) => ({ ...prev, loading: true }));
    try {
      let res;
      if (payload.actionType === 'reject') {
        res = await isoApprovalService.rejectItem({
          item_type: payload.item_type,
          item_id: payload.item_id,
          comment: payload.comment,
          approver_name: payload.approver_name
        });
        toast('success', res.message || 'Đã từ chối hồ sơ và yêu cầu chỉnh sửa!');
      } else if (payload.actionType === 'forward') {
        res = await isoApprovalService.forwardItem({
          item_type: payload.item_type,
          item_id: payload.item_id,
          new_approver_name: payload.new_approver_name,
          new_approver_role: payload.new_approver_role,
          note: payload.note,
          forwarded_by: payload.forwarded_by
        });
        toast('success', res.message || 'Đã chuyển cấp phê duyệt thành công!');
      } else {
        // approve
        res = await isoApprovalService.approveItem({
          item_type: payload.item_type,
          item_id: payload.item_id,
          comment: payload.comment,
          approver_name: payload.approver_name
        });
        toast('success', res.message || 'Đã phê duyệt hồ sơ thành công!');
      }

      setActionModal({ show: false, actionType: 'approve', item: null, loading: false });
      setDetailModal({ show: false, item: null, loading: false });

      // Refresh lại dữ liệu và KPI
      fetchStats();
      fetchItems();
    } catch (err) {
      console.error('Lỗi thực hiện thao tác:', err);
      const detail = err.response?.data?.detail || err.message || 'Có lỗi xảy ra khi xử lý hồ sơ!';
      toast('error', detail);
      setActionModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Phê duyệt hàng loạt các hồ sơ đã chọn
  const handleBatchApprove = async () => {
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn phê duyệt đồng loạt ${selectedItems.length} hồ sơ đã chọn?`)) {
      return;
    }

    setBatchActionModal({ show: true, loading: true });
    try {
      const storedUser = localStorage.getItem('smartflow_user');
      let approverName = '';
      if (storedUser) {
        const u = JSON.parse(storedUser);
        approverName = u.full_name || u.name || '';
      }

      const res = await isoApprovalService.batchApprove({
        items: selectedItems,
        comment: 'Phê duyệt hàng loạt từ màn hình Quản lý hồ sơ cần duyệt',
        approver_name: approverName
      });

      toast('success', `Đã phê duyệt thành công ${res.success_count}/${res.total_requested} hồ sơ!`);
      setSelectedItems([]);
      fetchStats();
      fetchItems();
    } catch (err) {
      console.error('Lỗi phê duyệt hàng loạt:', err);
      toast('error', 'Có lỗi xảy ra khi phê duyệt hàng loạt!');
    } finally {
      setBatchActionModal({ show: false, loading: false });
    }
  };

  // Helper render badge trạng thái theo đúng yêu cầu phân cấp (chống rớt dòng, hiển thị rõ ràng)
  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('từ chối') || s.includes('rejected')) {
      return (
        <span
          className="status-badge"
          style={{
            backgroundColor: '#FEE2E2',
            color: '#991B1B',
            borderRadius: '12px',
            padding: '3px 10px',
            fontSize: '0.72rem',
            fontWeight: '700',
            display: 'inline-block',
            whiteSpace: 'nowrap',
            border: '1px solid #FECACA'
          }}
        >
          Từ chối
        </span>
      );
    }
    if (s.includes('chờ bgđ') || s.includes('cho bgd')) {
      return (
        <span
          className="status-badge"
          style={{
            backgroundColor: '#EDE9FE',
            color: '#6D28D9',
            borderRadius: '12px',
            padding: '3px 10px',
            fontSize: '0.72rem',
            fontWeight: '700',
            display: 'inline-block',
            whiteSpace: 'nowrap',
            border: '1px solid #DDD6FE'
          }}
        >
          Chờ BGĐ duyệt
        </span>
      );
    }
    if (s.includes('chờ trưởng phòng') || s.includes('cho truong phong') || s.includes('chờ duyệt') || s.includes('pending')) {
      return (
        <span
          className="status-badge"
          style={{
            backgroundColor: '#FEF3C7',
            color: '#B45309',
            borderRadius: '12px',
            padding: '3px 10px',
            fontSize: '0.72rem',
            fontWeight: '700',
            display: 'inline-block',
            whiteSpace: 'nowrap',
            border: '1px solid #FDE68A'
          }}
        >
          Chờ Trưởng phòng duyệt
        </span>
      );
    }
    if (s.includes('trưởng phòng đã duyệt') || s.includes('truong phong da duyet')) {
      return (
        <span
          className="status-badge"
          style={{
            backgroundColor: '#D1FAE5',
            color: '#065F46',
            borderRadius: '12px',
            padding: '3px 10px',
            fontSize: '0.72rem',
            fontWeight: '700',
            display: 'inline-block',
            whiteSpace: 'nowrap',
            border: '1px solid #A7F3D0'
          }}
        >
          Trưởng phòng đã duyệt
        </span>
      );
    }
    if (s.includes('bgđ đã duyệt') || s.includes('bgd da duyet') || s.includes('hiệu lực') || s.includes('hieu luc') || s.includes('đã duyệt') || s.includes('approved')) {
      return (
        <span
          className="status-badge"
          style={{
            backgroundColor: '#DCFCE7',
            color: '#15803D',
            borderRadius: '12px',
            padding: '3px 10px',
            fontSize: '0.72rem',
            fontWeight: '700',
            display: 'inline-block',
            whiteSpace: 'nowrap',
            border: '1px solid #86EFAC'
          }}
        >
          BGĐ đã duyệt
        </span>
      );
    }
    return (
      <span
        className="status-badge"
        style={{
          backgroundColor: '#F5EFE6',
          color: '#7B5233',
          borderRadius: '12px',
          padding: '3px 10px',
          fontSize: '0.72rem',
          fontWeight: '700',
          display: 'inline-block',
          whiteSpace: 'nowrap',
          border: '1px solid #EADCC9'
        }}
      >
        {status || 'Dự thảo'}
      </span>
    );
  };

  const getFileDownloadUrl = (filePath) => {
    if (!filePath) return '';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
    const cleanRoot = API_ROOT ? API_ROOT.replace(/\/$/, '') : '';
    const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return `${cleanRoot}${cleanPath}`;
  };

  // Helper tên hiển thị trạng thái
  const getStatusLabel = (key) => {
    switch (key) {
      case 'pending': return 'Chờ phê duyệt';
      case 'approved': return 'Đã phê duyệt';
      case 'rejected': return 'Yêu cầu sửa đổi';
      case 'draft': return 'Dự thảo / Nháp';
      default: return 'Tất cả';
    }
  };

  return (
    <div className="iso-approval-container">
      {/* 1. KHỐI THẺ KPI THỐNG KÊ (Đóng vai trò là bộ lọc trạng thái chính) */}
      <ApprovalStatsCards
        stats={stats}
        activeStatus={statusTab}
        onSelectStatus={handleSelectKpiCard}
      />

      {/* 2. KHỐI TOOLBAR CHUẨN (PageToolbar - Chuẩn thiết kế SmartFlow như Hình 1) */}
      <PageToolbar
        searchValue={searchTerm}
        onSearchChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search nhanh SKU, Cont, LPN..."
        showSort={true}
        sortValue={sortOption}
        onSortChange={(val) => {
          setSortOption(val);
          setCurrentPage(1);
        }}
        sortOptions={[
          { value: '', label: 'Mặc định' },
          { value: 'time-desc', label: 'Thời gian: Mới nhất' },
          { value: 'time-asc', label: 'Thời gian: Cũ nhất' },
          { value: 'code-asc', label: 'Mã hồ sơ: A → Z' },
          { value: 'code-desc', label: 'Mã hồ sơ: Z → A' },
          { value: 'name-asc', label: 'Tên hồ sơ: A → Z' },
          { value: 'name-desc', label: 'Tên hồ sơ: Z → A' }
        ]}
        showFilter={true}
        isFilterOpen={isFilterBarOpen}
        onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
        activeFiltersCount={activeFiltersCount}
        extraActions={[
          {
            label: 'Làm mới dữ liệu',
            icon: <RefreshCw size={14} />,
            onClick: () => {
              fetchStats();
              fetchItems();
            }
          },
          ...(selectedItems.length > 0 ? [
            {
              label: `Duyệt hàng loạt (${selectedItems.length})`,
              icon: <CheckCircle2 size={14} />,
              onClick: handleBatchApprove,
              color: '#059669'
            },
            {
              label: 'Bỏ chọn tất cả',
              icon: <AlertOctagon size={14} />,
              onClick: () => setSelectedItems([]),
              color: '#DC2626'
            }
          ] : [])
        ]}
        importActions={[
          {
            label: 'Đồng bộ từ hệ thống ISO',
            icon: <RefreshCw size={14} />,
            onClick: () => {
              fetchStats();
              fetchItems();
              toast('info', 'Đã đồng bộ lại danh sách hồ sơ cần duyệt');
            }
          }
        ]}
        onExport={() => toast('info', 'Đang trích xuất dữ liệu danh sách hồ sơ ISO...')}
        exportLabel="Xuất dữ liệu"
        onCreate={selectedItems.length > 0 ? handleBatchApprove : () => toast('info', 'Khởi tạo hồ sơ đề xuất phê duyệt mới')}
        createLabel={selectedItems.length > 0 ? `Duyệt (${selectedItems.length})` : 'Tạo mới'}
      />

      {/* KHUNG LỌC NÂNG CAO INLINE (Hiển thị khi nhấn icon lọc funnel: gồm 2 nhóm 'Ai được lọc' & 'Hồ sơ nào') */}
      {isFilterBarOpen && (
        <div
          className="filter-inline-bar"
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '16px'
          }}
        >
          {/* NHÓM 1: AI ĐƯỢC LỌC / ĐƠN VỊ NÀO */}
          <div className="filter-field-group">
            <label className="filter-field-label">Phòng ban</label>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả phòng ban</option>
              <option value="CL">CL - Quản lý chất lượng</option>
              <option value="SX">SX - Sản xuất</option>
              <option value="KT">KT - Kỹ thuật</option>
              <option value="KHO">KHO - Kho vận</option>
              <option value="IT">IT - Công nghệ thông tin</option>
              <option value="BGD">BGD - Ban Giám Đốc</option>
            </select>
          </div>

          <div className="filter-field-group">
            <label className="filter-field-label">Người đề xuất</label>
            <select
              value={issuerFilter}
              onChange={(e) => {
                setIssuerFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả người đề xuất</option>
              {availableIssuers.map((iss) => (
                <option key={iss} value={iss}>{iss}</option>
              ))}
            </select>
          </div>

          <div className="filter-field-group">
            <label className="filter-field-label">Người duyệt</label>
            <select
              value={approverFilter}
              onChange={(e) => {
                setApproverFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả người duyệt</option>
              {availableApprovers.map((appr) => (
                <option key={appr} value={appr}>{appr}</option>
              ))}
            </select>
          </div>

          {/* NHÓM 2: HỒ SƠ NÀO */}
          <div className="filter-field-group">
            <label className="filter-field-label">Loại hồ sơ</label>
            <select
              value={itemTypeFilter}
              onChange={(e) => {
                setItemTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả loại hồ sơ</option>
              <option value="document">Tài liệu mẫu ISO</option>
              <option value="process">Quy trình áp dụng</option>
            </select>
          </div>

          <div className="filter-field-group">
            <label className="filter-field-label">Cấp quản lý</label>
            <select
              value={documentLevelFilter}
              onChange={(e) => {
                setDocumentLevelFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả cấp quản lý</option>
              <option value="Cấp công ty">Cấp công ty</option>
              <option value="Cấp phòng ban">Cấp phòng ban</option>
            </select>
          </div>

          {/* SỐ DÒNG HIỂN THỊ */}
          <div className="filter-field-group">
            <label className="filter-field-label">Hiển thị số dòng</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={12}>12 dòng / trang</option>
              <option value={24}>24 dòng / trang</option>
              <option value={50}>50 dòng / trang</option>
              <option value={100}>100 dòng / trang</option>
            </select>
          </div>

          {/* NÚT XÓA BỘ LỌC */}
          {activeFiltersCount > 0 && (
            <div className="filter-field-group" style={{ minWidth: 'auto' }}>
              <button
                type="button"
                className="iso-btn iso-btn-outline"
                style={{
                  height: '38px',
                  padding: '0 12px',
                  fontSize: '0.82rem',
                  borderColor: '#C4B5A5',
                  color: '#7B5233',
                  background: '#FFFFFF'
                }}
                onClick={handleResetFilters}
                title="Đặt lại các tiêu chí lọc nâng cao"
              >
                Xóa bộ lọc ({activeFiltersCount})
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. KHỐI BẢNG DỮ LIỆU */}
      {/* 3. KHỐI BẢNG DỮ LIỆU CHUẨN CLAIM */}
      <div
        className="admin-table-card"
        style={{
          backgroundColor: '#FFF',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(123, 82, 51, 0.08)',
          border: '1px solid #EADCC9',
          flex: '1 1 auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          width: '100%',
          margin: 0
        }}
      >
        <div
          className="table-responsive admin-table-scroll"
          style={{
            flex: '1 1 auto',
            overflowY: 'auto',
            overflowX: 'auto',
            minHeight: 0
          }}
        >
          <table
            className="data-table"
            style={{
              width: '100%',
              minWidth: '1080px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              margin: 0,
              tableLayout: 'auto'
            }}
          >
            <thead>
              <tr
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  backgroundColor: '#FAF6F0',
                  borderBottom: '2px solid #EADCC9'
                }}
              >
                <th
                  className="checkbox-col"
                  style={{
                    width: '38px',
                    textAlign: 'center',
                    padding: '8px 4px',
                    backgroundColor: '#FAF6F0'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={paginatedItems.length > 0 && isAllPageSelected}
                    onChange={handleToggleSelectAllPage}
                    title="Chọn tất cả trên trang này"
                    style={{ cursor: 'pointer', accentColor: '#7B5233' }}
                  />
                </th>
                <th
                  style={{
                    width: '45px',
                    textAlign: 'center',
                    padding: '8px 4px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: '#7B5233',
                    backgroundColor: '#FAF6F0',
                    whiteSpace: 'nowrap'
                  }}
                >
                  STT
                </th>
                <th
                  style={{
                    width: '11%',
                    minWidth: '120px',
                    padding: '8px 10px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: '#7B5233',
                    backgroundColor: '#FAF6F0',
                    whiteSpace: 'nowrap'
                  }}
                >
                  MÃ THAM CHIẾU
                </th>
                <th
                  style={{
                    width: '26%',
                    minWidth: '220px',
                    padding: '8px 10px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: '#7B5233',
                    backgroundColor: '#FAF6F0',
                    whiteSpace: 'nowrap'
                  }}
                >
                  TÊN QUY TRÌNH / TÀI LIỆU
                </th>
                <th
                  style={{
                    width: '8%',
                    minWidth: '100px',
                    textAlign: 'center',
                    padding: '8px 6px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: '#7B5233',
                    backgroundColor: '#FAF6F0',
                    whiteSpace: 'nowrap'
                  }}
                >
                  PHÂN LOẠI
                </th>
                <th
                  style={{
                    width: '7%',
                    minWidth: '85px',
                    textAlign: 'center',
                    padding: '8px 6px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: '#7B5233',
                    backgroundColor: '#FAF6F0',
                    whiteSpace: 'nowrap'
                  }}
                >
                  PHÒNG BAN
                </th>
                <th
                  style={{
                    width: '5%',
                    minWidth: '65px',
                    textAlign: 'center',
                    padding: '8px 4px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: '#7B5233',
                    backgroundColor: '#FAF6F0',
                    whiteSpace: 'nowrap'
                  }}
                >
                  PHIÊN BẢN
                </th>
                <th
                  style={{
                    width: '10%',
                    minWidth: '115px',
                    padding: '8px 10px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: '#7B5233',
                    backgroundColor: '#FAF6F0',
                    whiteSpace: 'nowrap'
                  }}
                >
                  NGƯỜI ĐỀ XUẤT
                </th>
                <th
                  style={{
                    width: '10%',
                    minWidth: '125px',
                    padding: '8px 10px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: '#7B5233',
                    backgroundColor: '#FAF6F0',
                    whiteSpace: 'nowrap'
                  }}
                >
                  NGƯỜI DUYỆT
                </th>
                <th
                  style={{
                    width: '11%',
                    minWidth: '145px',
                    textAlign: 'center',
                    padding: '8px 10px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: '#7B5233',
                    backgroundColor: '#FAF6F0',
                    whiteSpace: 'nowrap'
                  }}
                >
                  THỜI GIAN TRÌNH DUYỆT
                </th>
                <th
                  style={{
                    width: '12%',
                    minWidth: '165px',
                    textAlign: 'center',
                    padding: '8px 8px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: '#7B5233',
                    backgroundColor: '#FAF6F0',
                    whiteSpace: 'nowrap'
                  }}
                >
                  TRẠNG THÁI
                </th>
                <th
                  style={{
                    width: '50px',
                    textAlign: 'center',
                    padding: '8px 4px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: '#7B5233',
                    backgroundColor: '#FAF6F0',
                    whiteSpace: 'nowrap'
                  }}
                >
                  THAO TÁC
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#FFFDFB' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', border: '3px solid #7B5233', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      <div style={{ color: '#8D6E63', fontWeight: '600', fontSize: '0.85rem' }}>Đang tải dữ liệu hồ sơ ISO...</div>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#FFFDFB' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <FileText size={38} color="#CBD5E1" />
                      <p style={{ color: '#2D1A12', fontWeight: '700', fontSize: '0.95rem', margin: 0 }}>Không tìm thấy hồ sơ nào phù hợp</p>
                      <p style={{ color: '#8D6E63', fontSize: '0.82rem', margin: 0 }}>
                        Thử điều chỉnh lại bộ lọc trạng thái hoặc từ khóa tìm kiếm.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const isSelected = selectedItems.some(
                    (si) => si.item_type === item.item_type && si.item_id === item.id
                  );
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  const isMenuOpen = actionMenuId === `${item.item_type}_${item.id}`;

                  return (
                    <tr
                      key={`${item.item_type}_${item.id}`}
                      style={{
                        backgroundColor: isSelected ? '#F8F2E8' : (idx % 2 === 0 ? '#FFFFFF' : '#FCFAF7'),
                        borderBottom: '1px solid #F3F4F6',
                        transition: 'background-color 0.15s ease'
                      }}
                      className={isSelected ? 'row-selected' : ''}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#FAF6F0';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#FCFAF7';
                      }}
                    >
                      {/* 1. Checkbox */}
                      <td style={{ textAlign: 'center', padding: '8px 4px', whiteSpace: 'nowrap' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(item)}
                          style={{ cursor: 'pointer', accentColor: '#7B5233' }}
                        />
                      </td>

                      {/* 2. STT */}
                      <td style={{ textAlign: 'center', padding: '8px 4px', fontWeight: 500, color: '#64748b', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {rowNumber}
                      </td>

                      {/* 3. Mã tham chiếu */}
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: '#7B5233',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontSize: '0.82rem'
                          }}
                          onClick={() => handleOpenDetail(item)}
                          title="Xem chi tiết hồ sơ"
                        >
                          {item.code}
                        </span>
                      </td>

                      {/* 4. Tên quy trình / Tài liệu */}
                      <td style={{ padding: '8px 10px' }}>
                        <div
                          style={{ fontWeight: 500, color: '#2D1A12', cursor: 'pointer', fontSize: '0.82rem' }}
                          onClick={() => handleOpenDetail(item)}
                          title="Xem chi tiết hồ sơ"
                        >
                          {item.name}
                        </div>
                      </td>

                      {/* 5. Phân loại */}
                      <td style={{ padding: '8px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span className={`iso-type-badge ${item.item_type}`} style={{ fontSize: '0.72rem', padding: '2px 8px', fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-block' }}>
                          {item.item_type === 'document' ? 'Tài liệu mẫu' : 'Quy trình'}
                        </span>
                      </td>

                      {/* 6. Phòng ban */}
                      <td style={{ padding: '8px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <span className="iso-dept-badge" style={{ fontSize: '0.72rem', padding: '2px 8px', fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-block' }}>
                          {item.department || 'CHUNG'}
                        </span>
                      </td>

                      {/* 7. Phiên bản */}
                      <td style={{ textAlign: 'center', padding: '8px 4px', fontWeight: 500, color: '#2D1A12', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        v{item.version || '01'}
                      </td>

                      {/* 8. Người đề xuất */}
                      <td style={{ padding: '8px 10px', fontWeight: 500, color: '#2D1A12', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {item.issuer || '---'}
                      </td>

                      {/* 9. Người duyệt */}
                      <td style={{ padding: '8px 10px', fontSize: '0.82rem', fontWeight: 500, color: '#2D1A12', whiteSpace: 'nowrap' }}>
                        {item.approver || (item.document_level === 'Cấp phòng' ? 'Trưởng phòng' : ((item.status || '').toLowerCase().includes('chờ bgđ') || (item.status || '').toLowerCase().includes('bgđ đã duyệt') ? 'Ban Giám Đốc' : 'Trưởng phòng'))}
                      </td>

                      {/* 10. Thời gian trình duyệt (Chỉ ngày tháng năm DD/MM/YYYY, lấy mốc duyệt gần nhất) */}
                      <td style={{ padding: '8px 10px', fontSize: '0.82rem', fontWeight: 500, color: '#2D1A12', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {formatVietnameseDate(item.approval_date || item.updated_at || item.issue_date || item.created_at)}
                      </td>

                      {/* 11. Trạng thái (Huy hiệu nằm trên 1 dòng duy nhất, không rớt dòng) */}
                      <td style={{ padding: '8px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {renderStatusBadge(item.status)}
                      </td>

                      {/* 12. Thao tác 3 chấm (Không background hay khung viền) */}
                      <td style={{ textAlign: 'center', padding: '8px 4px', position: 'relative', whiteSpace: 'nowrap' }}>
                        <div className="iso-action-dropdown-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            type="button"
                            className="iso-dots-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              const key = `${item.item_type}_${item.id}`;
                              setActionMenuId(actionMenuId === key ? null : key);
                            }}
                            title="Thao tác"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              boxShadow: 'none',
                              outline: 'none',
                              padding: '4px',
                              margin: 0,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#8D6E63',
                              borderRadius: '4px'
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {isMenuOpen && (
                            <div
                              className={`action-menu ${idx >= paginatedItems.length - 2 && paginatedItems.length > 2 ? 'drop-up' : ''}`}
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: idx >= paginatedItems.length - 2 && paginatedItems.length > 2 ? 'auto' : '100%',
                                bottom: idx >= paginatedItems.length - 2 && paginatedItems.length > 2 ? '100%' : 'auto',
                                minWidth: '190px',
                                boxShadow: '0 10px 25px -5px rgba(45, 26, 18, 0.15), 0 4px 10px rgba(45, 26, 18, 0.08)',
                                borderRadius: '10px',
                                border: '1px solid #EADCC9',
                                backgroundColor: '#FFFFFF',
                                padding: '6px 0',
                                zIndex: 1000,
                                textAlign: 'left'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="action-menu-item"
                                onClick={() => {
                                  setActionMenuId(null);
                                  handleOpenDetail(item);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.84rem' }}
                              >
                                <Eye size={15} color="#7B5233" />
                                <span>Xem chi tiết (Thu nhỏ)</span>
                              </button>

                              <button
                                type="button"
                                className="action-menu-item"
                                onClick={() => {
                                  setActionMenuId(null);
                                  navigate(item.item_type === 'process' ? `/admin/iso-processes/edit/${item.id}` : `/admin/iso-documents/edit/${item.id}`);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.84rem', color: '#1E40AF', fontWeight: 600 }}
                              >
                                <ExternalLink size={15} color="#2563EB" />
                                <span>{item.item_type === 'process' ? 'Mở trong Quy trình nghiệp vụ' : 'Mở trong Quản lý mẫu'}</span>
                              </button>

                              {!(item.status === 'Trưởng phòng đã duyệt' || item.status === 'BGĐ đã duyệt' || (item.status || '').toLowerCase().includes('hiệu lực')) && (
                                <button
                                  type="button"
                                  className="action-menu-item"
                                  onClick={() => {
                                    setActionMenuId(null);
                                    handleOpenActionModal('approve', item);
                                  }}
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.84rem', color: '#059669', fontWeight: 600 }}
                                >
                                  <CheckCircle2 size={15} color="#059669" />
                                  <span>
                                    {item.document_level === 'Cấp phòng'
                                      ? 'Trưởng phòng duyệt'
                                      : (item.status || '').toLowerCase().includes('chờ bgđ')
                                      ? 'BGĐ phê duyệt ban hành'
                                      : 'Trưởng phòng duyệt'}
                                  </span>
                                </button>
                              )}

                              <button
                                type="button"
                                className="action-menu-item danger"
                                onClick={() => {
                                  setActionMenuId(null);
                                  handleOpenActionModal('reject', item);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.84rem', color: '#DC2626' }}
                              >
                                <AlertOctagon size={15} color="#DC2626" />
                                <span>Từ chối / Yêu cầu sửa đổi</span>
                              </button>

                              <div style={{ height: '1px', background: '#F1E9DF', margin: '4px 0' }} />

                              <button
                                type="button"
                                className="action-menu-item"
                                onClick={() => {
                                  setActionMenuId(null);
                                  handleOpenHistory(item);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.84rem', color: '#4B5563' }}
                              >
                                <History size={15} color="#6B7280" />
                                <span>Lịch sử phê duyệt</span>
                              </button>

                              {item.file_path && (
                                <a
                                  href={getFileDownloadUrl(item.file_path)}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  className="action-menu-item"
                                  onClick={() => setActionMenuId(null)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.84rem', color: '#2563EB', textDecoration: 'none', boxSizing: 'border-box' }}
                                >
                                  <Download size={15} color="#2563EB" />
                                  <span>Tải tệp đính kèm</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Phân trang chuẩn Claim (Pinned bottom) */}
        <ISOApprovalPagination
          currentPage={currentPage}
          totalPages={totalPages}
          startIndex={(currentPage - 1) * pageSize}
          endIndex={Math.min(currentPage * pageSize, sortedItems.length)}
          totalItems={sortedItems.length}
          rowsPerPage={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>

      {/* 4. CÁC DIALOG MODAL */}
      {/* Modal Xem chi tiết toàn diện */}
      {detailModal.show && (
        <ApprovalDetailModal
          show={detailModal.show}
          detail={detailModal.item}
          loading={detailModal.loading}
          onClose={() => setDetailModal({ show: false, item: null, loading: false })}
          onApprove={(item) => handleOpenActionModal('approve', item)}
          onReject={(item) => handleOpenActionModal('reject', item)}
          onForward={(item) => handleOpenActionModal('forward', item)}
        />
      )}

      {/* Modal Thao tác Duyệt / Từ chối / Chuyển cấp */}
      <ApprovalActionModal
        show={actionModal.show}
        actionType={actionModal.actionType}
        item={actionModal.item}
        loading={actionModal.loading}
        onClose={() => setActionModal({ show: false, actionType: 'approve', item: null, loading: false })}
        onSubmit={handleActionSubmit}
      />

      {/* Modal Lịch sử vết phê duyệt */}
      <ApprovalHistoryModal
        show={historyModal.show}
        item={historyModal.item}
        logs={historyModal.logs}
        loading={historyModal.loading}
        onClose={() => setHistoryModal({ show: false, item: null, logs: [], loading: false })}
      />
    </div>
  );
};

export default ISOApprovalListView;
