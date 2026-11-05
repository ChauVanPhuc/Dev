import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Plus, Minus, ChevronLeft, ChevronRight, ChevronDown, User, Calendar, Clock, Eye, LayoutGrid, Search, Filter, Download, FolderTree, Users, Layers, Award, FileSpreadsheet } from 'lucide-react';
import apiClient from '@shared/services/api';
import QualityEmployeeModal from './components/QualityEmployeeModal';
import KPITaskDetailModal from './components/KPITaskDetailModal';
import QualityEmployeeCalendarView from './components/QualityEmployeeCalendarView';
import QualityLeaveReportModal from './components/QualityLeaveReportModal';
import QualityOvertimeReportModal from './components/QualityOvertimeReportModal';
import DailyHeadcountSummaryModal from './components/DailyHeadcountSummaryModal';
import ProcessGateChartView from './components/ProcessGateChartView';
import ExportKPIModal from './components/ExportKPIModal';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import '@styles/components.css';

class ModalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Modal Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', maxWidth: '480px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', textAlign: 'center' }}>
            <h3 style={{ color: '#DC2626', margin: '0 0 10px 0', fontSize: '1.1rem', fontWeight: '800' }}>⚠️ Không thể hiển thị chi tiết nhân sự</h3>
            <p style={{ fontSize: '0.85rem', color: '#475569', backgroundColor: '#FEF2F2', padding: '10px', borderRadius: '6px', border: '1px solid #FECACA' }}>
              {String(this.state.error?.message || 'Lỗi xử lý dữ liệu nhân sự')}
            </p>
            <button
              type="button"
              onClick={() => { this.setState({ hasError: false, error: null }); this.props.onClose?.(); }}
              style={{ padding: '8px 20px', background: '#5D3B32', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '14px', fontWeight: '700', fontSize: '0.85rem' }}
            >
              Đóng Cửa Sổ
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const QualityEmployeeListView = () => {
  const navigate = useNavigate();
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/kpi/quality-employees');

  // State chế độ xem (chart, table, calendar)
  const [viewMode, setViewMode] = useState('table'); // 'table', 'chart', 'calendar'

  // Modals cho Lịch & Chấm công
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [otModalOpen, setOtModalOpen] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [kpiExportModalOpen, setKpiExportModalOpen] = useState(false);

  useEffect(() => {
    if (typeof setCustomTitle === 'function') setCustomTitle(title || 'Danh sách nhân sự');
    if (typeof setCustomSubtitle === 'function') setCustomSubtitle(viewMode === 'calendar' ? 'Lịch trình chấm công, báo phép & tăng ca nhân sự QLCL' : (viewMode === 'chart' ? 'CL03: Sơ đồ bố trí nhân sự' : 'CL03: Danh sách cây phân cấp nhân sự QLCL theo cấp bậc'));
    if (typeof setCustomScreenCode === 'function') setCustomScreenCode(screenCode || '');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, title, subtitle, screenCode, viewMode]);

  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  
  // Active filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);

  // State chọn sơ đồ (Chốt chặn vs Bố trí)
  const [selectedScheme, setSelectedScheme] = useState('Sơ đồ tổ chức');

  // Modal CL03.2: KPI & Checklist Detail Modal
  const [kpiModalOpen, setKpiModalOpen] = useState(false);
  const [selectedKpiEmployee, setSelectedKpiEmployee] = useState(null);

  // Tree & Calendar interaction state
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [tableExpandedIds, setTableExpandedIds] = useState(new Set());
  const [zoom, setZoom] = useState(1);
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState(0);
  const [modalInitialDate, setModalInitialDate] = useState(null);

  const handleOpenLeaveModal = (dateStr = null) => {
    setModalInitialDate(dateStr);
    setLeaveModalOpen(true);
  };

  const handleOpenOtModal = (dateStr = null) => {
    setModalInitialDate(dateStr);
    setOtModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadData();
    setCalendarRefreshTrigger(prev => prev + 1);
  };

  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const fileInputRef = useRef(null);
  const [treeSize, setTreeSize] = useState({ width: 0, height: 0 });

  const updateTreeSize = () => {
    if (contentRef.current) {
      const width = contentRef.current.scrollWidth || contentRef.current.offsetWidth;
      const height = contentRef.current.scrollHeight || contentRef.current.offsetHeight;
      if (width > 0 && height > 0) {
        setTreeSize({ width, height });
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(updateTreeSize, 100);
    return () => clearTimeout(timer);
  }, [employees, collapsedIds, viewMode]);

  const handleFitScreen = () => {
    if (!containerRef.current || !contentRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const contentWidth = treeSize.width || contentRef.current.scrollWidth;
    const contentHeight = treeSize.height || contentRef.current.scrollHeight;
    if (contentWidth > 0 && contentHeight > 0) {
      containerRef.current.scrollLeft = 0;
      containerRef.current.scrollTop = 0;
      const widthRatio = (containerWidth - 80) / contentWidth;
      const heightRatio = (containerHeight - 80) / contentHeight;
      let newZoom = Math.min(widthRatio, heightRatio);
      newZoom = Math.floor(newZoom * 100) / 100;
      newZoom = Math.max(0.3, Math.min(1.5, newZoom));
      setZoom(newZoom);
    }
  };

  const loadData = async () => {
    try {
      const res = await apiClient.get('/quality-employees/', {
        params: {
          page: 1,
          size: 1000,
          search: search || undefined,
          factory: selectedFactory || undefined
        }
      });
      if (res.data) {
        setEmployees(res.data.items || []);
        setTotal(res.data.total || 0);
        setPages(res.data.pages || 1);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách nhân sự QLCL:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, size, search, selectedFactory]);

  // Mở modal Thêm mới Nhân sự QLCL (QualityEmployeeModal)
  const handleAddEmployee = () => {
    setSelectedKpiEmployee(null);
    setModalOpen(true);
  };

  // Mở modal Sửa hồ sơ Nhân sự QLCL (QualityEmployeeModal)
  const handleEditProfile = (employee) => {
    setSelectedKpiEmployee(employee);
    setModalOpen(true);
  };

  // Mở modal Đánh giá KPI & Checklist (KPITaskDetailModal)
  const handleViewKpi = (employee) => {
    setSelectedKpiEmployee({
      ...(employee || {}),
      schema_name: selectedScheme
    });
    setKpiModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ nhân sự "${name}"?`)) return;
    try {
      await apiClient.delete(`/quality-employees/${id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi khi xóa nhân viên.');
    }
  };

  const handleExport = () => {
    alert('Tính năng xuất file Excel danh sách nhân sự đang được xử lý.');
  };

  // Tự động dựng sơ đồ phân cấp QC từ danh sách nhân sự (Org Chart Nodes)
  const treeNodes = useMemo(() => {
    if (!employees || employees.length === 0) {
      return [];
    }

    // Lọc lấy các nhân sự chính thức của cơ cấu QLCL (loại bỏ nhân sự đã nghỉ việc hoặc rác)
    const activeQLEmployees = employees.filter(e => {
      if (e.status === 'Đã nghỉ việc') return false;
      if (typeof e.employee_id === 'string' && e.employee_id.startsWith('OLD_')) return false;
      let isOut = false;
      if (e.note && typeof e.note === 'string' && e.note.startsWith('{')) {
        try {
          const parsed = JSON.parse(e.note);
          if (parsed.is_out_of_structure) isOut = true;
        } catch (_) {}
      }
      return !isOut;
    });

    const listToProcess = activeQLEmployees.length > 0 ? activeQLEmployees : employees;

    // Tìm topLeader (Trưởng phòng QLCL)
    const topLeader = listToProcess.find(e => {
      const pos = (e.stage || e.position || e.position_name || '').toLowerCase();
      return e.employee_id === '3973' || pos.includes('trưởng phòng');
    }) || listToProcess[0];

    const mapped = listToProcess.map((emp, index) => {
      const pos = (emp.stage || emp.position || emp.position_name || '').toLowerCase();
      let noteLevel = null;
      let noteParentLevel = null;
      let noteParentId = null;

      if (emp.note) {
        if (typeof emp.note === 'string' && emp.note.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(emp.note);
            noteLevel = parsed.level;
            noteParentLevel = parsed.parent_level;
            noteParentId = parsed.parent_id;
          } catch (e) {}
        } else if (typeof emp.note === 'string' && emp.note.includes('Cấp')) {
          noteLevel = emp.note;
        }
      }

      let explicitLevel = emp.current_level || noteLevel;
      if (!explicitLevel) {
        if (pos.includes('trưởng phòng')) explicitLevel = 'CẤP 1';
        else if (pos.includes('lead')) explicitLevel = 'CẤP 2';
        else if (pos.includes('supervisor') || pos.includes('admin') || pos.includes('process') || pos.includes('iqc')) explicitLevel = 'CẤP 3';
        else explicitLevel = 'CẤP 4';
      }

      const isTop = emp.id === topLeader.id || emp.employee_id === '3973' || (explicitLevel && explicitLevel.toUpperCase() === 'CẤP 1');
      const finalLevelName = explicitLevel ? explicitLevel.toUpperCase() : (isTop ? 'CẤP 1' : 'CẤP 4');

      return {
        ...emp,
        finalLevelName,
        isTop,
        noteParentLevel,
        noteParentId
      };
    });

    const level1Emp = mapped.find(m => m.isTop || m.finalLevelName === 'CẤP 1') || mapped[0];

    // Node trung gian QC Lead 2 (Trưởng phòng kiêm nhiệm) để tạo phân cấp Cấp 2 cân đối
    const qcLead2Node = {
      id: 'node_qc_lead_2',
      employee_id: 'QC_LEAD_2',
      full_name: 'Đặng Văn Nam (QC Lead 2)',
      finalLevelName: 'CẤP 2',
      level_name: 'CẤP 2',
      position_name: 'QC Lead 2 (Hiện trường)',
      department_name: 'QLCL',
      section_name: 'Toàn nhà máy',
      parent_id: level1Emp ? level1Emp.id : null,
      occupants: [{ full_name: 'Đặng Văn Nam' }],
      isVirtual: true,
      raw_data: {
        id: 'node_qc_lead_2',
        employee_id: 'QC_LEAD_2',
        full_name: 'Đặng Văn Nam',
        stage: 'QC Lead 2 (Kiêm nhiệm)',
        factory: 'Toàn nhà máy',
        department: 'QLCL',
        current_level: 'Cấp 2',
        parent_level: 'Đặng Văn Nam',
        parent_id: level1Emp ? level1Emp.id : null
      }
    };

    const resultNodes = mapped.map((emp, index) => {
      let resolvedParentId = null;
      if (!emp.isTop) {
        const pKey = emp.parent_id || emp.noteParentId;
        const pName = emp.parent_level || emp.noteParentLevel;

        let parentNode = null;
        if (pKey) {
          parentNode = mapped.find(e => String(e.id) === String(pKey) || String(e.employee_id) === String(pKey));
        }
        if (!parentNode && pName) {
          parentNode = mapped.find(e => e.full_name === pName || (typeof pName === 'string' && pName.includes(e.full_name)));
        }

        // Nếu là 3 QC Supervisor (Hà Đình Thành, Phan Thị Lương, Đỗ Hữu Phúc): nối vào QC Lead 2
        const posLower = (emp.stage || emp.position || '').toLowerCase();
        if (posLower.includes('supervisor') || ['139', '0556', '3396'].includes(String(emp.employee_id))) {
          resolvedParentId = 'node_qc_lead_2';
        } else if (parentNode && parentNode.id !== emp.id) {
          resolvedParentId = parentNode.id;
        } else {
          resolvedParentId = null; // KHÔNG tự động gán bừa cấp trên
        }
      }

      return {
        id: emp.id || `emp_${index}`,
        employee_id: emp.employee_id || `NV_${emp.id}`,
        full_name: emp.full_name || '',
        level_name: emp.finalLevelName,
        position_name: emp.stage || emp.position || 'Nhân sự QA/QC',
        department_name: emp.department || 'Quản Lý Chất Lượng',
        section_name: emp.factory || 'Phân Xưởng',
        parent_id: resolvedParentId,
        occupants: [{ full_name: emp.full_name }],
        raw_data: {
          ...emp,
          current_level: emp.finalLevelName,
          parent_level: emp.noteParentLevel || emp.parent_level,
          parent_id: resolvedParentId || emp.noteParentId || emp.parent_id
        }
      };
    });

    // Thêm QC Lead 2 vào danh sách node
    return [qcLead2Node, ...resultNodes];
  }, [employees]);

  const roots = useMemo(() => treeNodes.filter(n => !n.parent_id), [treeNodes]);
  const childrenMap = useMemo(() => {
    const map = {};
    treeNodes.forEach(node => {
      if (node.parent_id) {
        if (!map[node.parent_id]) map[node.parent_id] = [];
        map[node.parent_id].push(node);
      }
    });
    return map;
  }, [treeNodes]);

  const toggleCollapse = (nodeId) => {
    const next = new Set(collapsedIds);
    if (next.has(nodeId)) next.delete(nodeId);
    else next.add(nodeId);
    setCollapsedIds(next);
  };

  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => setCollapsedIds(new Set(treeNodes.map(n => n.id)));

  // Map ID -> Tên nhân sự để hiển thị Quản lý trực tiếp
  const empNameMap = useMemo(() => {
    const map = {};
    treeNodes.forEach(n => {
      map[n.id] = n.occupants?.[0]?.full_name || n.raw_data?.full_name || n.employee_id;
    });
    return map;
  }, [treeNodes]);

  // Đếm tổng số cấp dưới đệ quy (Subordinates)
  const totalSubordinatesMap = useMemo(() => {
    const map = {};
    const getSubCount = (id) => {
      if (map[id] !== undefined) return map[id];
      const children = childrenMap[id] || [];
      let count = children.length;
      for (const child of children) {
        count += getSubCount(child.id);
      }
      map[id] = count;
      return count;
    };
    treeNodes.forEach(n => getSubCount(n.id));
    return map;
  }, [treeNodes, childrenMap]);

  // Thống kê nhân sự theo cấp bậc (4 tầng chuẩn, loại bỏ node ảo)
  const { level1Count, level2Count, level3Count, level4Count, officialTotalCount } = useMemo(() => {
    let l1 = 0, l2 = 0, l3 = 0, l4 = 0;
    treeNodes.forEach(n => {
      if (n.isVirtual) return; // Bỏ qua node ảo kiêm nhiệm khi đếm số lượng người thực tế
      const lvl = String(n.level_name || '').toUpperCase();
      if (lvl.includes('1') || (!n.parent_id && !lvl)) l1++;
      else if (lvl.includes('2')) l2++;
      else if (lvl.includes('3')) l3++;
      else l4++;
    });
    return {
      level1Count: l1,
      level2Count: l2,
      level3Count: l3,
      level4Count: l4,
      officialTotalCount: l1 + l2 + l3 + l4
    };
  }, [treeNodes]);

  // Mặc định mở Cấp 1 và Cấp 2 khi load cây
  useEffect(() => {
    if (treeNodes && treeNodes.length > 0) {
      const initSet = new Set();
      treeNodes.forEach(n => {
        if (n.level_name === 'CẤP 1' || n.level_name === 'CẤP 2' || !n.parent_id) {
          initSet.add(n.id);
        }
      });
      setTableExpandedIds(initSet);
    }
  }, [treeNodes]);

  const toggleTableNode = (id) => {
    setTableExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllTable = () => {
    setTableExpandedIds(new Set(treeNodes.map(n => n.id)));
  };

  const collapseAllTable = () => {
    setTableExpandedIds(new Set());
  };

  // Danh sách phẳng các hàng hiển thị trên Tree Table (hỗ trợ đóng/mở & tìm kiếm tự động bung)
  const visibleTreeRows = useMemo(() => {
    if (!treeNodes || treeNodes.length === 0) return [];

    const searchLower = (search || '').trim().toLowerCase();
    const factoryFilter = selectedFactory || '';

    // 1. Chế độ lọc/tìm kiếm: Tìm các node khớp và tự động lấy tất cả cha của chúng
    if (searchLower || factoryFilter) {
      const matchingIds = new Set();
      const ancestorIds = new Set();

      treeNodes.forEach(node => {
        const emp = node.raw_data || {};
        const fullName = (node.occupants?.[0]?.full_name || emp.full_name || '').toLowerCase();
        const empId = (node.employee_id || '').toLowerCase();
        const pos = (node.position_name || emp.stage || '').toLowerCase();
        const sec = (node.section_name || emp.factory || '').toLowerCase();

        const matchSearch = !searchLower || (
          fullName.includes(searchLower) ||
          empId.includes(searchLower) ||
          pos.includes(searchLower) ||
          sec.includes(searchLower)
        );
        const matchFactory = !factoryFilter || (emp.factory || '').includes(factoryFilter) || (node.section_name || '').includes(factoryFilter);

        if (matchSearch && matchFactory) {
          matchingIds.add(node.id);
          let cur = node;
          while (cur && cur.parent_id) {
            ancestorIds.add(cur.parent_id);
            cur = treeNodes.find(t => t.id === cur.parent_id);
          }
        }
      });

      const rows = [];
      const traverseFiltered = (nodes, depth) => {
        for (const node of nodes) {
          const isMatched = matchingIds.has(node.id);
          const isAncestor = ancestorIds.has(node.id);

          if (isMatched || isAncestor) {
            const children = childrenMap[node.id] || [];
            const hasChildren = children.some(c => matchingIds.has(c.id) || ancestorIds.has(c.id));

            rows.push({
              ...node,
              depth,
              hasChildren,
              isExpanded: true,
              isHighlighted: isMatched,
              parent_name: node.parent_id ? (empNameMap[node.parent_id] || '-') : '-'
            });

            if (hasChildren) {
              traverseFiltered(children, depth + 1);
            }
          }
        }
      };

      traverseFiltered(roots, 0);
      return rows;
    }

    // 2. Chế độ bình thường: Duyệt theo roots và tableExpandedIds
    const rows = [];
    const traverse = (nodes, depth) => {
      for (const node of nodes) {
        const children = childrenMap[node.id] || [];
        const hasChildren = children.length > 0;
        const isExpanded = tableExpandedIds.has(node.id);

        rows.push({
          ...node,
          full_name: node.full_name || node.occupants?.[0]?.full_name || node.raw_data?.full_name || '',
          depth,
          hasChildren,
          isExpanded,
          parent_name: node.parent_id ? (empNameMap[node.parent_id] || '-') : '-'
        });

        if (hasChildren && isExpanded) {
          traverse(children, depth + 1);
        }
      }
    };

    traverse(roots, 0);
    return rows;
  }, [treeNodes, roots, childrenMap, tableExpandedIds, search, selectedFactory, empNameMap]);

  // Phân trang danh sách cây hiển thị
  const totalTreeRows = visibleTreeRows.length;
  const totalPages = Math.max(1, Math.ceil(totalTreeRows / size));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const paginatedTreeRows = useMemo(() => {
    const start = (currentPage - 1) * size;
    return visibleTreeRows.slice(start, start + size);
  }, [visibleTreeRows, currentPage, size]);

  // Recursive Tree Node Component
  const TreeNode = ({ node }) => {
    const children = childrenMap[node.id] || [];
    const hasChildren = children.length > 0;
    const hasOccupant = node.occupants && node.occupants.length > 0;
    const isCollapsed = collapsedIds.has(node.id);
    
    const lvlStr = String(node.level_name || '').toUpperCase();
    const isL1 = lvlStr.includes('1') || !node.parent_id;
    const isL2 = lvlStr.includes('2');
    const isL3 = lvlStr.includes('3');

    // Màu pastel chuẩn nhận diện theo Sơ đồ Tổ chức
    let cardBg = '#F3E8FF'; // Cấp 4: Tím pastel
    let cardBorder = '#C084FC';
    let badgeBg = '#EDE9FE';
    let badgeColor = '#6B21A8';

    if (isL1) {
      cardBg = '#FDE2E4'; // Cấp 1: Hồng pastel
      cardBorder = '#E07A5F';
      badgeBg = '#FECDD3';
      badgeColor = '#9F1239';
    } else if (isL2) {
      cardBg = '#D8F3DC'; // Cấp 2: Xanh lá pastel
      cardBorder = '#52B788';
      badgeBg = '#D1FAE5';
      badgeColor = '#065F46';
    } else if (isL3) {
      cardBg = '#FFF3B0'; // Cấp 3: Vàng pastel
      cardBorder = '#E09F3E';
      badgeBg = '#FEF3C7';
      badgeColor = '#92400E';
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        {/* Node card */}
        <div style={{
          backgroundColor: cardBg,
          border: `2px solid ${cardBorder}`,
          borderRadius: '12px',
          padding: '12px 16px',
          width: '240px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 10,
          transition: 'all 0.2s',
          cursor: 'pointer',
          boxSizing: 'border-box'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.12)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.06)'; }}
        onClick={() => handleViewKpi(node.raw_data || node)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, backgroundColor: badgeBg, color: badgeColor, padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>
              {node.level_name}
            </span>
            <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => handleEditProfile(node.raw_data || node)} style={{ background: 'none', border: 'none', color: '#4F46E5', cursor: 'pointer', padding: '2px' }} title="Sửa hồ sơ nhân sự">
                <Edit2 size={12} />
              </button>
              <button onClick={() => handleDelete(node.id, node.occupants?.[0]?.full_name || 'nhân sự')} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }} title="Xóa">
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#2D1A12', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {node.position_name || 'Vị trí chưa thiết lập'}
          </div>
          
          <div style={{ fontSize: '0.7rem', color: '#6B7280', display: 'flex', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span>PB: {node.department_name || '-'}</span>
            {node.section_name && <span>• NM: {node.section_name}</span>}
          </div>

          {/* Occupants list inside node card */}
          <div style={{
            marginTop: '4px',
            borderTop: '1px solid #F3F4F6',
            paddingTop: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            color: hasOccupant ? '#2D1A12' : '#9CA3AF'
          }}>
            <User size={12} style={{ color: hasOccupant ? '#7B5233' : '#9CA3AF' }} />
            <span style={{ fontWeight: hasOccupant ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hasOccupant ? node.occupants.map(o => o.full_name).join(', ') : 'Vị trí trống'}
            </span>
          </div>

          {/* Collapse/expand toggle */}
          {hasChildren && (
            <div style={{ marginTop: '2px', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
                title={isCollapsed ? 'Mở rộng cấp dưới' : 'Thu gọn cấp dưới'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: isCollapsed ? '#FAF6F0' : '#F3F4F6',
                  border: '1px solid #EADCC9',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: '#7B5233',
                  cursor: 'pointer',
                  lineHeight: 1
                }}
              >
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                <span>{isCollapsed ? `${children.length} cấp dưới` : 'Thu gọn'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Children Render block */}
        {hasChildren && !isCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 'max-content', minWidth: '100%' }}>
            <div style={{ width: '2px', height: '24px', backgroundColor: '#C4B5A5', zIndex: 1 }} />
            <div style={{ display: 'flex', position: 'relative', width: 'max-content', justifyContent: 'center' }}>
              {children.map((child, index) => {
                const isFirst = index === 0;
                const isLast = index === children.length - 1;
                const isSingle = children.length === 1;

                return (
                  <div
                    key={child.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                      flex: '0 0 auto'
                    }}
                  >
                    {!isSingle && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: isFirst ? '50%' : 0,
                        right: isLast ? '50%' : 0,
                        height: '2px',
                        backgroundColor: '#C4B5A5',
                        zIndex: 1
                      }} />
                    )}
                    <div style={{ width: '2px', height: '24px', backgroundColor: '#C4B5A5', zIndex: 1 }} />
                    <TreeNode node={child} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="gold-layout" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 85px)', overflow: 'hidden' }}>
      {/* ── STICKY TOP ZONE ── */}
      <div className="sticky-top-zone">
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #EADCC9',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          width: '100%',
          boxSizing: 'border-box',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          {/* Trái: Ô tìm kiếm & Icon Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              width: '320px',
              backgroundColor: '#FAF6F0',
              border: '1px solid #EADCC9',
              borderRadius: '8px',
              padding: '0 12px',
              height: '38px',
              boxSizing: 'border-box'
            }}>
              <Search size={16} style={{ color: '#7B5233', marginRight: '8px', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Nhập mã hoặc tên nhân viên..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  width: '100%',
                  fontSize: '0.85rem',
                  color: '#2D1A12',
                  padding: 0
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => setFilterOpen(!filterOpen)}
              title="Bộ lọc nâng cao"
              style={{
                height: '38px',
                width: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: filterOpen ? '1.5px solid #7B5233' : '1px solid #EADCC9',
                backgroundColor: filterOpen ? '#FAF6F0' : '#FFFFFF',
                color: '#7B5233',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxSizing: 'border-box'
              }}
            >
              <Filter size={18} strokeWidth={2.2} />
            </button>
          </div>

          {/* Phải: Nhóm các nút bấm đẩy sát góc phải (marginLeft: 'auto') */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
            {/* Nút Xuất KPI Tháng (Mẫu chuẩn Master G7.QLCL-KPI) */}
            <button
              type="button"
              onClick={() => setKpiExportModalOpen(true)}
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '8px',
                backgroundColor: '#1E6F5C',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(30,111,92,0.2)',
                whiteSpace: 'nowrap'
              }}
            >
              <FileSpreadsheet size={16} />
              <span>Xuất KPI Tháng</span>
            </button>

            {/* Nút Thêm nhân sự (Mở Modal CL03.2) */}
            <button
              type="button"
              onClick={handleAddEmployee}
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '8px',
                backgroundColor: '#7B5233',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Thêm nhân sự</span>
            </button>

            {/* Nút Xem lịch nghỉ (Màu nâu nhạt / Nâu đậm khi active) */}
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'calendar' ? 'chart' : 'calendar')}
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '8px',
                backgroundColor: viewMode === 'calendar' ? '#3D2B1F' : '#A27B5C',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                whiteSpace: 'nowrap'
              }}
            >
              <Calendar size={16} />
              <span>{viewMode === 'calendar' ? 'Xem dạng sơ đồ' : 'Xem lịch nghỉ'}</span>
            </button>

            {/* Nút Xem dạng bảng / Xem dạng sơ đồ (Màu espresso đậm) */}
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '8px',
                backgroundColor: '#3D2B1F',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                whiteSpace: 'nowrap'
              }}
            >
              {viewMode === 'chart' ? <LayoutGrid size={16} /> : <FolderTree size={16} />}
              <span>{viewMode === 'chart' ? 'Xem danh sách cây' : 'Xem sơ đồ khối'}</span>
            </button>

            {/* Nút Báo tăng ca (Màu espresso đậm) */}
            <button
              type="button"
              onClick={() => handleOpenOtModal()}
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '8px',
                backgroundColor: '#3D2B1F',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                whiteSpace: 'nowrap'
              }}
            >
              <Clock size={16} />
              <span>Báo tăng ca</span>
            </button>

            {/* Nút Báo nghỉ phép (Màu espresso đậm) */}
            <button
              type="button"
              onClick={() => handleOpenLeaveModal()}
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '8px',
                backgroundColor: '#3D2B1F',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Báo nghỉ phép</span>
            </button>
          </div>
        </div>

        {/* Filter Bar Dropdowns */}
        {filterOpen && (
          <div className="filter-inline-bar" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '12px' }}>
            <div className="filter-field-group">
              <label className="filter-field-label">Nhà máy</label>
              <select
                value={selectedFactory}
                onChange={(e) => { setSelectedFactory(e.target.value); setPage(1); }}
              >
                <option value="">Tất cả nhà máy</option>
                <option value="Nhà máy 1">Nhà máy 1</option>
                <option value="Nhà máy 2">Nhà máy 2</option>
                <option value="Nhà máy 3">Nhà máy 3</option>
              </select>
            </div>

            <div className="filter-field-group">
              <label className="filter-field-label">Hiển thị số dòng</label>
              <select
                value={size}
                onChange={(e) => { setSize(parseInt(e.target.value)); setPage(1); }}
              >
                <option value={15}>15 dòng</option>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
            </div>

            {(selectedFactory || size !== 15) && (
              <div className="filter-field-group">
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => {
                    setSelectedFactory('');
                    setSize(15);
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
      </div>

      {/* ── THANH ĐIỀU KHIỂN CÂY PHÂN CẤP (Gọn gàng, thanh lịch & dễ nhìn) ── */}
      {viewMode === 'table' && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          marginTop: '6px',
          padding: '6px 14px',
          backgroundColor: '#FAF7F2',
          borderRadius: '8px',
          border: '1px solid #EADCC9',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Nhóm nút thu gọn / mở rộng nhanh */}
            <div style={{ display: 'inline-flex', border: '1px solid #D4B896', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <button
                type="button"
                onClick={expandAllTable}
                style={{
                  padding: '5px 12px',
                  border: 'none',
                  borderRight: '1px solid #EADCC9',
                  backgroundColor: '#FFFFFF',
                  color: '#7B5233',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Mở rộng tất cả các nhánh phân cấp"
              >
                <ChevronDown size={13} strokeWidth={2.5} />
                <span>Mở rộng</span>
              </button>
              <button
                type="button"
                onClick={collapseAllTable}
                style={{
                  padding: '5px 12px',
                  border: 'none',
                  backgroundColor: '#FFFFFF',
                  color: '#7B5233',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Thu gọn tất cả các nhánh"
              >
                <ChevronRight size={13} strokeWidth={2.5} />
                <span>Thu gọn</span>
              </button>
            </div>

            {/* Thông tin số lượng cấp bậc chuẩn 4 tầng */}
            <div style={{ fontSize: '0.78rem', color: '#7B5233', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <span>Tổng: <b style={{ color: '#3D2B1F' }}>{officialTotalCount || treeNodes.length}</b> nhân sự</span>
              <span style={{ color: '#D4B896' }}>•</span>
              <span style={{ color: '#92400E', fontWeight: 700 }}>{level1Count} Trưởng phòng</span>
              <span style={{ color: '#D4B896' }}>•</span>
              <span style={{ color: '#1E40AF', fontWeight: 700 }}>{level2Count} QA/QC Lead</span>
              <span style={{ color: '#D4B896' }}>•</span>
              <span style={{ color: '#D97706', fontWeight: 700 }}>{level3Count} Supervisor / Chuyên viên</span>
              <span style={{ color: '#D4B896' }}>•</span>
              <span style={{ color: '#15803D', fontWeight: 700 }}>{level4Count} QC Công đoạn</span>
            </div>
          </div>

          {/* Phải: Chọn Loại Sơ đồ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: '700', color: '#7B5233' }}>Sơ đồ:</span>
            <select
              value={selectedScheme}
              onChange={(e) => setSelectedScheme(e.target.value)}
              style={{
                height: '28px',
                padding: '0 8px',
                borderRadius: '5px',
                border: '1px solid #D4B896',
                backgroundColor: '#FFFFFF',
                color: '#7B5233',
                fontWeight: '700',
                fontSize: '0.76rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="Sơ đồ tổ chức">Sơ đồ tổ chức</option>
              <option value="Sơ đồ chốt chặn">Sơ đồ chốt chặn</option>
            </select>
          </div>
        </div>
      )}

      {/* ── THANH ĐIỀU KHIỂN SƠ ĐỒ (Khi ở chế độ Chart view) ── */}
      {viewMode === 'chart' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={expandAll}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #EADCC9',
                backgroundColor: '#FAF6F0',
                color: '#7B5233',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Mở rộng tất cả
            </button>
            <button
              onClick={collapseAll}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #EADCC9',
                backgroundColor: '#FAF6F0',
                color: '#7B5233',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Thu gọn tất cả
            </button>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #EADCC9', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#fff' }}>
              <button
                onClick={() => setZoom(z => Math.max(0.3, parseFloat((z - 0.1).toFixed(1))))}
                style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: '#7B5233', display: 'flex', alignItems: 'center' }}
              >
                <Minus size={14} />
              </button>
              <span style={{ padding: '0 6px', fontSize: '0.75rem', fontWeight: 600, color: '#4A2E1B', minWidth: '36px', textAlign: 'center' }}>
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(2, parseFloat((z + 0.1).toFixed(1))))}
                style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: '#7B5233', display: 'flex', alignItems: 'center' }}
              >
                <Plus size={14} />
              </button>
              <button
                onClick={() => setZoom(1)}
                style={{ background: 'none', border: 'none', borderLeft: '1px solid #EADCC9', padding: '0 8px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, color: '#7B5233', height: '100%' }}
              >
                Reset
              </button>
              <button
                onClick={handleFitScreen}
                style={{ background: 'none', border: 'none', borderLeft: '1px solid #EADCC9', padding: '0 8px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, color: '#7B5233', height: '100%' }}
                title="Tự động phóng to/thu nhỏ sơ đồ vừa khung màn hình"
              >
                Vừa khung
              </button>
            </div>
          </div>

          {/* Phải: Chọn Loại Sơ đồ đang hiển thị */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#4A2E1B' }}>Sơ đồ:</span>
            <select
              value={selectedScheme}
              onChange={(e) => setSelectedScheme(e.target.value)}
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1.5px solid #EADCC9',
                backgroundColor: '#FFFFFF',
                color: '#7B5233',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <option value="Sơ đồ tổ chức">Sơ đồ tổ chức</option>
              <option value="Sơ đồ chốt chặn">Sơ đồ chốt chặn</option>
            </select>
          </div>
        </div>
      )}

      {/* ── WORKSPACE CHÍNH (DẠNG LỊCH, DẠNG SƠ ĐỒ CÂY HOẶC DẠNG BẢNG) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, marginTop: '4px', overflow: 'hidden' }}>
        {viewMode === 'calendar' ? (
          <QualityEmployeeCalendarView
            onOpenLeaveModal={(d) => handleOpenLeaveModal(d)}
            onOpenOtModal={(d) => handleOpenOtModal(d)}
            onOpenSummaryModal={() => setSummaryModalOpen(true)}
            refreshTrigger={calendarRefreshTrigger}
          />
        ) : viewMode === 'chart' ? (
          /* Sơ đồ trực quan: Sơ đồ tổ chức hoặc Sơ đồ chốt chặn */
          <div 
            ref={containerRef}
            style={{
              backgroundColor: '#FAF8F5',
              border: '1px solid #EADCC9',
              borderRadius: '12px',
              padding: selectedScheme === 'Sơ đồ chốt chặn' ? '16px' : '32px 24px',
              overflow: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              gap: '24px'
            }}>
            {selectedScheme === 'Sơ đồ chốt chặn' ? (
              <ProcessGateChartView onSelectEmployee={handleViewKpi} employees={treeNodes} />
            ) : (
              <div style={{
                width: treeSize.width ? `${treeSize.width * zoom}px` : 'auto',
                height: treeSize.height ? `${treeSize.height * zoom}px` : 'auto',
                margin: '0 auto',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div 
                  ref={contentRef}
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    justifyContent: 'center', 
                    alignItems: 'flex-start', 
                    gap: '40px', 
                    width: 'max-content', 
                    transform: `scale(${zoom})`, 
                    transformOrigin: 'top left',
                    flexShrink: 0
                  }}>
                  {roots.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 40px', color: '#7B5233', width: '100%', minWidth: '400px' }}>
                      <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#4A2E1B' }}>Chưa có dữ liệu nhân sự cho sơ đồ này</div>
                      <div style={{ fontSize: '0.85rem', color: '#7B5233', marginTop: '6px' }}>
                        Bảng dữ liệu trong Database hiện đang trống. Nhấn nút <strong style={{ color: '#3D2B1F' }}>[+ Thêm nhân sự]</strong> ở góc phải trên để khởi tạo.
                      </div>
                    </div>
                  ) : (
                    roots.map(root => (
                      <TreeNode key={root.id} node={root} />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Dạng bảng cây phân cấp chuẩn ERP - Gọn gàng & Dễ nhìn */
          <div className="admin-list-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <div className="mgmt-table card admin-table-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #EADCC9' }}>
              <div className="table-responsive desktop-only admin-table-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                <table className="data-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#FAF6F0' }}>
                    <tr>
                      <th style={{ width: '85px', textAlign: 'center', padding: '9px 8px' }}>CẤP</th>
                      <th style={{ minWidth: '280px', padding: '9px 12px' }}>HỌ VÀ TÊN</th>
                      <th style={{ width: '90px', padding: '9px 8px' }}>MÃ NV</th>
                      <th style={{ width: '150px', padding: '9px 10px' }}>VỊ TRÍ / CHỨC DANH</th>
                      <th style={{ width: '180px', padding: '9px 10px' }}>BỘ PHẬN / PHÂN XƯỞNG</th>
                      <th style={{ width: '150px', padding: '9px 10px' }}>QUẢN LÝ TRỰC TIẾP</th>
                      <th style={{ width: '120px', textAlign: 'center', padding: '9px 8px' }}>TRẠNG THÁI</th>
                      <th style={{ width: '80px', textAlign: 'center', padding: '9px 8px' }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTreeRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#9CA3AF' }}>
                          Không tìm thấy nhân sự nào.
                        </td>
                      </tr>
                    ) : paginatedTreeRows.map((row) => {
                      const emp = row.raw_data || {};
                      const lvlStr = String(row.level_name || emp.current_level || '').toUpperCase();
                      const isLevel1 = lvlStr.includes('1') || (!row.parent_id && row.depth === 0);
                      const isLevel2 = lvlStr.includes('2');
                      const isLevel3 = lvlStr.includes('3');
                      const isLevel4 = lvlStr.includes('4') || (!isLevel1 && !isLevel2 && !isLevel3);
                      const fullName = row.full_name || row.occupants?.[0]?.full_name || emp.full_name || 'Nhân sự';

                      return (
                        <tr
                          key={row.id}
                          onClick={() => handleViewKpi(emp)}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: row.isHighlighted ? '#FEFCE8' : (isLevel1 ? '#FCF9F5' : (isLevel2 ? '#FDFBF8' : '#FFFFFF')),
                            borderBottom: '1px solid #F1E8DF',
                            transition: 'background-color 0.12s ease'
                          }}
                        >
                          {/* 1. Cột CẤP BẬC (Chuẩn 4 tầng dựa theo thuộc tính chức vụ) */}
                          <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '7px 6px' }}>
                            {isLevel1 ? (
                              <span style={{
                                padding: '2px 7px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 800,
                                backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A'
                              }}>
                                Cấp 1
                              </span>
                            ) : isLevel2 ? (
                              <span style={{
                                padding: '2px 7px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700,
                                backgroundColor: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE'
                              }}>
                                Cấp 2
                              </span>
                            ) : isLevel3 ? (
                              <span style={{
                                padding: '2px 7px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700,
                                backgroundColor: '#FFEDD5', color: '#C2410C', border: '1px solid #FED7AA'
                              }}>
                                Cấp 3
                              </span>
                            ) : (
                              <span style={{
                                padding: '2px 7px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600,
                                backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0'
                              }}>
                                Cấp 4
                              </span>
                            )}
                          </td>

                          {/* 2. Cột HỌ TÊN (Cây thụt lề rõ ràng, tên in đậm đẹp) */}
                          <td style={{ paddingLeft: `${14 + row.depth * 22}px`, paddingRight: '12px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              {row.hasChildren ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTableNode(row.id);
                                  }}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '4px',
                                    border: '1px solid #D4B896',
                                    backgroundColor: row.isExpanded ? '#FAF0E6' : '#FFFFFF',
                                    color: '#7B5233',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    padding: 0
                                  }}
                                  title={row.isExpanded ? 'Thu gọn nhánh' : 'Mở rộng nhánh'}
                                >
                                  {row.isExpanded ? <ChevronDown size={12} strokeWidth={2.5} /> : <ChevronRight size={12} strokeWidth={2.5} />}
                                </button>
                              ) : (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '18px',
                                  height: '18px',
                                  color: '#C4A482',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  flexShrink: 0
                                }}>
                                  {row.depth > 0 ? '└' : '•'}
                                </span>
                              )}

                              {/* Họ tên đầy đủ */}
                              <span style={{
                                fontWeight: isLevel1 ? '800' : (isLevel2 ? '700' : '500'),
                                fontSize: isLevel1 ? '0.9rem' : '0.84rem',
                                color: isLevel1 ? '#4A2E1B' : (isLevel2 ? '#3D2B1F' : '#334155')
                              }}>
                                {fullName}
                              </span>

                              {/* Tag số lượng cấp dưới nhỏ gọn */}
                              {row.hasChildren && (
                                <span style={{
                                  padding: '1px 6px',
                                  borderRadius: '8px',
                                  fontSize: '0.68rem',
                                  fontWeight: '700',
                                  backgroundColor: '#F5ECE3',
                                  color: '#7B5233',
                                  border: '1px solid #EADCC9'
                                }}>
                                  {totalSubordinatesMap[row.id] || row.hasChildren} NV
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. Cột MÃ NV */}
                          <td style={{ fontWeight: 700, color: '#7B5233', fontSize: '0.82rem', verticalAlign: 'middle', padding: '7px 8px' }}>
                            {row.employee_id}
                          </td>

                          {/* 4. Cột VỊ TRÍ */}
                          <td style={{ color: '#4B382A', fontWeight: isLevel1 || isLevel2 ? 600 : 400, fontSize: '0.82rem', verticalAlign: 'middle', padding: '7px 10px' }}>
                            {row.position_name || emp.stage || '-'}
                          </td>

                          {/* 5. Cột BỘ PHẬN */}
                          <td style={{ fontSize: '0.82rem', color: '#475569', verticalAlign: 'middle', padding: '7px 10px' }}>
                            {row.section_name || emp.factory || '-'}
                          </td>

                          {/* 6. Cột QUẢN LÝ TRỰC TIẾP */}
                          <td style={{ fontSize: '0.82rem', verticalAlign: 'middle', padding: '7px 10px' }}>
                            <span style={{
                              color: row.parent_name && row.parent_name !== '-' ? '#7B5233' : '#9CA3AF',
                              fontWeight: row.parent_name && row.parent_name !== '-' ? 600 : 400
                            }}>
                              {row.parent_name || '-'}
                            </span>
                          </td>

                          {/* 7. Cột TRẠNG THÁI */}
                          <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '7px 8px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              backgroundColor: '#ECFDF5',
                              color: '#047857',
                              border: '1px solid #A7F3D0'
                            }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#10B981' }}></span>
                              {(!emp.status || emp.status.includes('?')) ? 'Đang làm việc' : emp.status}
                            </span>
                          </td>

                          {/* 8. Cột THAO TÁC */}
                          <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', verticalAlign: 'middle', padding: '7px 8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center' }}>
                              <button
                                onClick={() => handleEditProfile(emp)}
                                style={{ background: 'none', border: 'none', color: '#4F46E5', cursor: 'pointer', padding: '3px' }}
                                title="Sửa hồ sơ nhân sự"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(emp.id, emp.full_name)}
                                style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '3px' }}
                                title="Xóa"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Phân trang cố định đáy chuẩn ERP */}
              <div className="admin-pagination-desktop desktop-only" style={{ flexShrink: 0, padding: '10px 16px', borderTop: '1px solid #EADCC9', backgroundColor: '#FAF6F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                  Hiển thị <b>{totalTreeRows > 0 ? (currentPage - 1) * size + 1 : 0} - {Math.min(currentPage * size, totalTreeRows)}</b> trên <b>{totalTreeRows}</b> nhân sự
                </div>
                {totalPages > 1 && (
                  <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setPage(Math.max(1, currentPage - 1))}
                      className="page-btn"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {(() => {
                      const pageButtons = [];
                      for (let i = 1; i <= totalPages; i++) {
                        pageButtons.push(
                          <button
                            key={i}
                            className={`page-btn ${currentPage === i ? 'active' : ''}`}
                            onClick={() => setPage(i)}
                          >
                            {i}
                          </button>
                        );
                      }
                      return pageButtons;
                    })()}
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                      className="page-btn"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Employee Modal popup NS05 */}
      <QualityEmployeeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadData}
        employeeData={selectedKpiEmployee}
      />

      {/* KPI & Checklist Detail Modal CL03.2 */}
      <ModalErrorBoundary onClose={() => setKpiModalOpen(false)}>
        <KPITaskDetailModal
          isOpen={kpiModalOpen}
          onClose={() => setKpiModalOpen(false)}
          taskData={selectedKpiEmployee}
          onSave={() => { setKpiModalOpen(false); loadData(); }}
        />
      </ModalErrorBoundary>

      {/* Modal Báo Nghỉ Phép */}
      <QualityLeaveReportModal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onSuccess={handleModalSuccess}
        initialDate={modalInitialDate}
      />

      {/* Modal Báo Tăng Ca */}
      <QualityOvertimeReportModal
        isOpen={otModalOpen}
        onClose={() => setOtModalOpen(false)}
        onSuccess={handleModalSuccess}
        initialDate={modalInitialDate}
      />

      {/* Modal Báo Cáo Quân Số Hàng Ngày */}
      <DailyHeadcountSummaryModal
        isOpen={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
      />
      <ExportKPIModal
        isOpen={kpiExportModalOpen}
        onClose={() => setKpiExportModalOpen(false)}
        defaultMonth="2026-09"
        defaultFactory={selectedFactory}
      />
    </div>
  );
};

export default QualityEmployeeListView;
