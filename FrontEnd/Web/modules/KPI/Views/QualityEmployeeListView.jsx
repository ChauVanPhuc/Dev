import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Plus, Minus, ChevronLeft, ChevronRight, ChevronDown, User, Calendar, Clock, Eye, LayoutGrid, Search, Filter, Download } from 'lucide-react';
import apiClient from '@shared/services/api';
import QualityEmployeeModal from './components/QualityEmployeeModal';
import KPITaskDetailModal from './components/KPITaskDetailModal';
import QualityEmployeeCalendarView from './components/QualityEmployeeCalendarView';
import QualityLeaveReportModal from './components/QualityLeaveReportModal';
import QualityOvertimeReportModal from './components/QualityOvertimeReportModal';
import DailyHeadcountSummaryModal from './components/DailyHeadcountSummaryModal';
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
  const [viewMode, setViewMode] = useState('chart'); // 'chart', 'table', 'calendar'

  // Modals cho Lịch & Chấm công
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [otModalOpen, setOtModalOpen] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);

  useEffect(() => {
    if (typeof setCustomTitle === 'function') setCustomTitle(title || 'Danh sách nhân sự');
    if (typeof setCustomSubtitle === 'function') setCustomSubtitle(viewMode === 'calendar' ? 'Lịch trình chấm công, báo phép & tăng ca nhân sự QLCL' : (viewMode === 'chart' ? 'CL03: Sơ đồ bố trí nhân sự' : (subtitle || 'Quản lý nhân sự QC/QA, phân công nhà máy, công đoạn & Đánh giá KPI chuyên trách')));
    if (typeof setCustomScreenCode === 'function') setCustomScreenCode(screenCode || '');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, title, subtitle, screenCode, viewMode]);

  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(15);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  
  // Active filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);

  // State chọn sơ đồ (Chốt chặn vs Bố trí)
  const [selectedScheme, setSelectedScheme] = useState('Sơ đồ chốt chặn');

  // Modal CL03.2: KPI & Checklist Detail Modal
  const [kpiModalOpen, setKpiModalOpen] = useState(false);
  const [selectedKpiEmployee, setSelectedKpiEmployee] = useState(null);

  // Tree & Calendar interaction state
  const [collapsedIds, setCollapsedIds] = useState(new Set());
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
          page,
          size,
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

    // Tìm topLeader (Trưởng phòng/Phó phòng/Giám đốc)
    const topLeader = employees.find(e => {
      const pos = (e.stage || e.position || e.position_name || '').toLowerCase();
      return pos.includes('giám đốc') || pos.includes('trưởng') || pos.includes('phó');
    }) || employees[0];

    const mapped = employees.map((emp, index) => {
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
        if (pos.includes('cấp 1')) explicitLevel = 'CẤP 1';
        else if (pos.includes('cấp 2')) explicitLevel = 'CẤP 2';
        else if (pos.includes('cấp 3')) explicitLevel = 'CẤP 3';
        else if (pos.includes('cấp 4')) explicitLevel = 'CẤP 4';
        else if (pos.includes('cấp 5')) explicitLevel = 'CẤP 5';
      }

      const isTop = emp.id === topLeader.id || pos.includes('giám đốc') || (explicitLevel && explicitLevel.toUpperCase() === 'CẤP 1');

      let computedLevel = 'CẤP 5';
      if (isTop) computedLevel = 'CẤP 1';
      else if (pos.includes('trưởng phòng') || (pos.includes('trưởng') && !pos.includes('tổ'))) computedLevel = 'CẤP 2';
      else if (pos.includes('phó')) computedLevel = 'CẤP 3';
      else if (pos.includes('tổ') || pos.includes('giám sát') || pos.includes('lead')) computedLevel = 'CẤP 4';

      const finalLevelName = explicitLevel ? explicitLevel.toUpperCase() : computedLevel;

      return {
        ...emp,
        finalLevelName,
        isTop,
        noteParentLevel,
        noteParentId
      };
    });

    const level1Emp = mapped.find(m => m.isTop || m.finalLevelName === 'CẤP 1') || mapped[0];
    const level2EmpList = mapped.filter(m => !m.isTop && m.finalLevelName === 'CẤP 2');
    const level3EmpList = mapped.filter(m => !m.isTop && m.finalLevelName === 'CẤP 3');
    const level4EmpList = mapped.filter(m => !m.isTop && m.finalLevelName === 'CẤP 4');

    return mapped.map((emp, index) => {
      let resolvedParentId = null;
      if (!emp.isTop) {
        // Tìm parentNode tương ứng trong danh sách mapped
        const pKey = emp.parent_id || emp.noteParentId;
        const pName = emp.parent_level || emp.noteParentLevel;

        let parentNode = null;
        if (pKey) {
          parentNode = mapped.find(e => String(e.id) === String(pKey) || e.employee_id === pKey);
        }
        if (!parentNode && pName) {
          parentNode = mapped.find(e => e.full_name === pName || e.employee_id === pName || (typeof pName === 'string' && pName.includes(e.full_name)));
        }

        if (parentNode && parentNode.id !== emp.id) {
          resolvedParentId = parentNode.id;
        } else {
          // Tự động phân cấp chuẩn 5 tầng (Cấp 1 -> Cấp 2 -> Cấp 3 -> Cấp 4 -> Cấp 5)
          if (emp.finalLevelName === 'CẤP 5') {
            const defL4 = level4EmpList.find(l => l.id !== emp.id);
            const defL3 = level3EmpList.find(l => l.id !== emp.id);
            const defL2 = level2EmpList.find(l => l.id !== emp.id);
            resolvedParentId = defL4 ? defL4.id : (defL3 ? defL3.id : (defL2 ? defL2.id : level1Emp.id));
          } else if (emp.finalLevelName === 'CẤP 4') {
            const defL3 = level3EmpList.find(l => l.id !== emp.id);
            const defL2 = level2EmpList.find(l => l.id !== emp.id);
            resolvedParentId = defL3 ? defL3.id : (defL2 ? defL2.id : level1Emp.id);
          } else if (emp.finalLevelName === 'CẤP 3') {
            const defL2 = level2EmpList.find(l => l.id !== emp.id);
            resolvedParentId = defL2 ? defL2.id : level1Emp.id;
          } else {
            resolvedParentId = level1Emp.id;
          }
        }
      }

      return {
        id: emp.id || `emp_${index}`,
        employee_id: emp.employee_id || `NV_${emp.id}`,
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

  // Recursive Tree Node Component
  const TreeNode = ({ node }) => {
    const children = childrenMap[node.id] || [];
    const hasChildren = children.length > 0;
    const hasOccupant = node.occupants && node.occupants.length > 0;
    const isCollapsed = collapsedIds.has(node.id);
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        {/* Node card */}
        <div style={{
          backgroundColor: '#fff',
          border: '1.5px solid #EADCC9',
          borderRadius: '12px',
          padding: '12px 16px',
          width: '240px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 10,
          transition: 'all 0.2s',
          cursor: 'pointer',
          boxSizing: 'border-box'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7B5233'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(123, 82, 51, 0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#EADCC9'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }}
        onClick={() => handleViewKpi(node.raw_data || node)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, backgroundColor: '#FAF6F0', color: '#7B5233', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>
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
              {viewMode === 'chart' ? <Eye size={16} /> : <LayoutGrid size={16} />}
              <span>{viewMode === 'chart' ? 'Xem dạng bảng' : 'Xem dạng sơ đồ'}</span>
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
              <option value="Sơ đồ chốt chặn">Sơ đồ chốt chặn</option>
              <option value="Sơ đồ bố trí">Sơ đồ bố trí</option>
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
          /* Sơ đồ cây phân cấp */
          <div 
            ref={containerRef}
            style={{
              backgroundColor: '#FAF8F5',
              border: '1px solid #EADCC9',
              borderRadius: '12px',
              padding: '32px 24px',
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
          </div>
        ) : (
          /* Dạng bảng chuẩn ERP */
          <div className="admin-list-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <div className="mgmt-table card admin-table-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #EADCC9' }}>
              <div className="table-responsive desktop-only admin-table-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                <table className="data-table">
                  <thead style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#FAF6F0' }}>
                    <tr>
                      <th>MÃ NV</th>
                      <th>HỌ TÊN</th>
                      <th>PHÒNG BAN</th>
                      <th>VỊ TRÍ</th>
                      <th>BỘ PHẬN</th>
                      <th>TRẠNG THÁI</th>
                      <th>NGÀY VÀO LÀM</th>
                      <th style={{ textAlign: 'center' }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                          Không tìm thấy nhân sự nào.
                        </td>
                      </tr>
                    ) : employees.map((emp) => (
                      <tr
                        key={emp.id}
                        onClick={() => handleViewKpi(emp)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ fontWeight: 700, color: '#7B5233' }}>{emp.employee_id}</td>
                        <td style={{ fontWeight: 600, color: '#2D1A12' }}>{emp.full_name}</td>
                        <td>{emp.department || 'QLCL'}</td>
                        <td>{emp.stage || 'Nhân viên QC'}</td>
                        <td>{emp.factory || '-'}</td>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: '#ECFDF5',
                            color: '#047857',
                            border: '1px solid #A7F3D0'
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981' }}></span>
                            {(!emp.status || emp.status.includes('?')) ? 'Đang làm việc' : emp.status}
                          </span>
                        </td>
                        <td>
                          {emp.created_at ? new Date(emp.created_at).toLocaleDateString('vi-VN') : '-'}
                        </td>
                        <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                            <button
                              onClick={() => handleEditProfile(emp)}
                              style={{ background: 'none', border: 'none', color: '#4F46E5', cursor: 'pointer', padding: '4px' }}
                              title="Sửa hồ sơ nhân sự"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(emp.id, emp.full_name)}
                              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                              title="Xóa"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Phân trang cố định đáy */}
              <div className="admin-pagination-desktop desktop-only" style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid #EADCC9', backgroundColor: '#FAF6F0' }}>
                <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                  Hiển thị <b>{total > 0 ? (page - 1) * size + 1 : 0} - {Math.min(page * size, total)}</b> trên <b>{total}</b> nhân sự
                </div>
                {pages > 1 && (
                  <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="page-btn"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {(() => {
                      const pageButtons = [];
                      for (let i = 1; i <= pages; i++) {
                        pageButtons.push(
                          <button
                            key={i}
                            className={`page-btn ${page === i ? 'active' : ''}`}
                            onClick={() => setPage(i)}
                          >
                            {i}
                          </button>
                        );
                      }
                      return pageButtons;
                    })()}
                    <button
                      disabled={page >= pages}
                      onClick={() => setPage(page + 1)}
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
    </div>
  );
};

export default QualityEmployeeListView;
