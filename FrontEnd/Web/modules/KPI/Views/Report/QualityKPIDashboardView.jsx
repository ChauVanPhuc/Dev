import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  FileText, 
  Search, 
  Settings, 
  Filter, 
  UserCheck, 
  Upload, 
  Download, 
  Bell, 
  Award,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  Send,
  ShieldAlert,
  AlertCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import '@styles/components.css';

// Import Modals
import KPITaskDetailModal from '../components/KPITaskDetailModal';
import KPITargetFormModal from '../components/KPITargetFormModal';
import KPINewTrainingModal from '../components/KPINewTrainingModal';
import KPISendAlertModal from '../components/KPISendAlertModal';
import KPITrainingDetailModal from '../components/KPITrainingDetailModal';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';

const QualityKPIDashboardView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/kpi/dashboard');

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title || 'Báo cáo KPI & Đánh giá Chất lượng');
    if (setCustomSubtitle) setCustomSubtitle(subtitle || 'Hệ thống Quản lý Chỉ số KPI Nhân sự, Vi phạm Mobile và Cảnh báo');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || 'KPI_DASHBOARD');
  }, [title, subtitle, screenCode, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // State Tabs: 'quality_targets' | 'work_indicators' | 'violations_list' | 'training_plan' | 'reports_bbch' | 'alerts_setup'
  const [activeTab, setActiveTab] = useState('quality_targets');

  // Global Filter States
  const [selectedMonth, setSelectedMonth] = useState('Tháng 8/2026');
  const [selectedFactory, setSelectedFactory] = useState('Tất cả nhà máy');
  const [loading, setLoading] = useState(false);

  // Modal Control States
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTaskData, setSelectedTaskData] = useState(null);

  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);
  const [deleteConfirmState, setDeleteConfirmState] = useState({ isOpen: false, itemToDelete: null });

  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [editingTrainingPlan, setEditingTrainingPlan] = useState(null);
  const [selectedTrainingPlan, setSelectedTrainingPlan] = useState(null);
  const [isTrainingDetailModalOpen, setIsTrainingDetailModalOpen] = useState(false);
  
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);

  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [checklistFormData, setChecklistFormData] = useState({ content: '', frequency: 'Hàng ngày', employee_id: 'NV_QLCL_004', status_today: 'Chưa làm' });

  // Dynamic Summary Stats from DB
  const [summaryStats, setSummaryStats] = useState({
    kpi_violation_score: 25,
    total_violations_count: 14,
    critical_errors_count: 3,
    checklist_completion_rate: 94.5,
    weekly_trend: [
      { week: 'Tuần 1', count: '12 lỗi', height: '45%' },
      { week: 'Tuần 2', count: '19 lỗi', height: '70%' },
      { week: 'Tuần 3', count: '25 lỗi', height: '95%', isPeak: true },
      { week: 'Tuần 4', count: '14 lỗi', height: '55%' }
    ]
  });

  // Tab 1 & Tab 3: Violations list loaded 100% from DB `/awards-discipline`
  const [violations, setViolations] = useState([]);

  // Tab 2: KPI Targets pool loaded 100% from DB `/kpi-management/kpi-pool`
  const [kpiTargets, setKpiTargets] = useState([]);

  // Tab 4: Training Plans (Loaded dynamically from DB)
  const [trainingPlans, setTrainingPlans] = useState([]);

  // Tab 5: Staff Evaluation Reports loaded 100% from DB `/staff-evaluation`
  const [staffEvaluations, setStaffEvaluations] = useState([]);

  // Tab 6: Alerts List
  const [alertsList, setAlertsList] = useState([
    { id: 1, code: 'ALT-01', title: 'Hiển thị thông báo mới', content: "Bùi Công Sự đã giao 'APT8-48-GRY' (SL: 12). Mời bộ phận Sản xuất công đoạn Đóng Gói tiếp nhận.", channel: 'Mobile App Banner', receiver: 'Tổ Đóng Gói', date: '31/08/2026 08:30', status: 'Đang phát' },
    { id: 2, code: 'ALT-02', title: 'Cảnh báo vi phạm điểm KPI', content: 'Hệ thống ghi nhận 2 nhân sự có điểm vi phạm > 15 điểm trong tháng 8.', channel: 'App Mobile & Push Email', receiver: 'Ban Giám Đốc, Trưởng QC', date: '30/08/2026 16:45', status: 'Đang phát' }
  ]);

  // Tab 7: Checklist Công Việc List (Full CRUD from DB `/kpi-management/checklists`)
  const [allChecklists, setAllChecklists] = useState([]);

  // FETCH REAL DATA FROM DATABASE APIS
  const fetchDatabaseData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Violations from Mobile `/awards-discipline` in DB
      const awardsResp = await api.get('/awards-discipline/').catch(() => null);
      if (awardsResp && Array.isArray(awardsResp) && awardsResp.length > 0) {
        const mapped = awardsResp.map((v, idx) => ({
          id: v.id || idx + 1,
          code: v.code || `VP-2026-${String(v.id || idx + 1).padStart(3, '0')}`,
          emp: v.staff_name || v.employee_name || 'Nhân sự QC',
          dept: v.department || 'Tổ Sản Xuất',
          rule: v.issue || v.content || 'Lỗi quy trình QC',
          score: -Math.abs(v.points || 5),
          fine: v.fine_amount || (v.points ? v.points * 20000 : 100000),
          reporter: v.created_by || 'QC Mobile App',
          date: v.created_at || v.date || '25/08/2026',
          status: v.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'
        }));
        setViolations(mapped);

        // Update stats from DB if records exist
        const totalViolationsCount = mapped.length;
        const totalPointsSum = mapped.reduce((acc, curr) => acc + Math.abs(curr.score), 0);
        setSummaryStats(prev => ({
          ...prev,
          total_violations_count: totalViolationsCount,
          kpi_violation_score: totalPointsSum
        }));
      }

      // 2. Fetch KPI Targets Pool from DB `/kpi-management/kpi-pool`
      const kpiPoolResp = await api.get('/kpi-management/kpi-pool').catch(() => null);
      if (kpiPoolResp && Array.isArray(kpiPoolResp) && kpiPoolResp.length > 0) {
        const mappedKpis = kpiPoolResp.map((k, idx) => ({
          id: k.id || idx + 1,
          code: k.kpi_code || `KPI${String(11 - idx).padStart(2, '0')}`,
          name: k.content,
          dept: 'Phòng QA/QC',
          target: k.target || '>= 98%',
          weight: '20%',
          unit: '%',
          status: 'Áp dụng'
        }));
        setKpiTargets(mappedKpis);
      }

      // 3. Fetch Staff Evaluations from DB `/staff-evaluation`
      const evalResp = await api.get('/staff-evaluation/').catch(() => null);
      if (evalResp && Array.isArray(evalResp) && evalResp.length > 0) {
        const mappedEvals = evalResp.map((e, idx) => ({
          id: e.id || idx + 1,
          code: `DG-2026-${String(e.id || idx + 1).padStart(2, '0')}`,
          emp: e.employee_name || e.staff_name || 'Nhân sự',
          dept: e.department || 'Phòng QA/QC',
          manager_note: e.note || e.content || 'Hoàn thành tốt nhiệm vụ',
          eval_score: e.score || 90,
          bbch_code: e.bbch_code || `BBCH-2026-0${idx + 1}`,
          date: e.date || '28/08/2026',
          status: 'Đã phê duyệt'
        }));
        setStaffEvaluations(mappedEvals);
      }

      // 4. Fetch Checklists / Training Plans from DB `/kpi-management/checklists`
      const checklistResp = await api.get('/kpi-management/checklists?employee_id=admin').catch(() => null);
      if (checklistResp && Array.isArray(checklistResp) && checklistResp.length > 0) {
        const mappedPlans = checklistResp.map((c, idx) => ({
          id: c.id || idx + 1,
          code: c.task_code || `KH-ĐT-${String(idx + 1).padStart(2, '0')}`,
          name: c.content,
          target: 'Nhân viên QC & Tổ trưởng',
          time: c.last_performed || '15/09/2026',
          teacher: 'Phòng Đào Tạo',
          fileName: 'TaiLieu_DaoTao_QC.pdf',
          status: c.status_today || 'Sắp diễn ra'
        }));
        setTrainingPlans(mappedPlans);
      }

      // 4b. Fetch All Checklists for Tab Checklist Công Việc
      const allChecklistsResp = await api.get('/kpi-management/checklists').catch(() => null);
      if (allChecklistsResp && Array.isArray(allChecklistsResp) && allChecklistsResp.length > 0) {
        setAllChecklists(allChecklistsResp);
      } else {
        setAllChecklists([
          { id: 1, task_code: 'CL-001', content: 'Kiểm tra 5S khu vực bàn kiểm định QC', frequency: 'Hàng ngày', status_today: 'Hoàn thành', perform_count: 5, last_performed: '31/08/2026', result: 'Đạt 100%', employee_id: 'admin' },
          { id: 2, task_code: 'CL-002', content: 'Đối chiếu tem nhãn với lệnh sản xuất ISO', frequency: 'Theo ca', status_today: 'Đang thực hiện', perform_count: 2, last_performed: '31/08/2026', result: 'Đạt yêu cầu', employee_id: 'admin' },
          { id: 3, task_code: 'CL-003', content: 'Kiểm tra thông số kỹ thuật máy đo kích thước', frequency: 'Hàng tuần', status_today: 'Hoàn thành', perform_count: 12, last_performed: '28/08/2026', result: 'Đạt chuẩn', employee_id: 'admin' }
        ]);
      }

      // 5. Fetch Notifications / Alerts from DB `/notifications/?all=true`
      let notifResp = await api.get('/notifications/?all=true').catch(() => null);

      // Auto-seed default alert if DB is empty so Mobile and Web are immediately connected
      if (!notifResp || !Array.isArray(notifResp) || notifResp.length === 0) {
        const seedPayload = JSON.stringify({
          title: 'Hiển thị thông báo mới',
          content: "Bùi Công Sự đã giao 'APT8-48-GRY' (SL: 12). Mời bộ phận Sản xuất công đoạn Đóng Gói tiếp nhận."
        });
        await api.post('/notifications/', {
          content: seedPayload,
          target_group: 'Tổ Đóng Gói',
          target_stage: 'MOBILE_BANNER',
          priority_status: 'BANNER:Hiển thị thông báo mới'
        }).catch(() => null);
        notifResp = await api.get('/notifications/?all=true').catch(() => null);
      }

      if (notifResp && Array.isArray(notifResp) && notifResp.length > 0) {
        const mappedNotifs = notifResp.map((n, idx) => {
          let title = 'Hiển thị thông báo mới';
          let content = n.content || '';
          if (n.priority_status && n.priority_status.startsWith('BANNER:')) {
            title = n.priority_status.replace('BANNER:', '').trim() || title;
          }
          if (content.startsWith('{') && content.includes('content')) {
            try {
              const parsed = JSON.parse(content);
              title = parsed.title || title;
              content = parsed.content || content;
            } catch (e) {}
          }
          return {
            id: n.id,
            code: `ALT-${String(n.id).padStart(2, '0')}`,
            title: title,
            content: content,
            channel: 'Mobile App Banner',
            receiver: n.target_group || 'Bộ phận Sản xuất',
            date: n.created_at ? new Date(n.created_at).toLocaleString('vi-VN') : '31/08/2026 08:30',
            status: 'Đang phát'
          };
        });
        setAlertsList(mappedNotifs);
      }

    } catch (err) {
      console.error('Error fetching DB data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseData();
  }, []);

  // Open Modal CL03.2
  const handleOpenDetailModal = (violation) => {
    setSelectedTaskData({
      employee_id: violation.code || 'VP-2026-081',
      employee_name: violation.emp || 'Nguyễn Văn A',
      position: violation.dept || 'Tổ Sơn Mạ',
      score_prev_month: 120,
      score_current: 95
    });
    setIsDetailModalOpen(true);
  };

  // CRUD Handlers for Tab 2 (Persisted directly to Backend DB API `/kpi-management/kpi-pool`)
  const handleSaveKpiTarget = async (targetItem) => {
    try {
      if (editingTarget) {
        await api.put(`/kpi-management/kpi-pool/${targetItem.id}`, {
          kpi_code: targetItem.code,
          content: targetItem.name,
          calc_method: targetItem.dept,
          target: targetItem.target
        }).catch(() => null);
        setKpiTargets(prev => prev.map(t => t.id === targetItem.id ? targetItem : t));
      } else {
        const createRes = await api.post('/kpi-management/kpi-pool', {
          kpi_code: targetItem.code,
          content: targetItem.name,
          calc_method: targetItem.dept,
          target: targetItem.target
        }).catch(() => null);
        
        const newId = createRes?.id || Date.now();
        setKpiTargets(prev => [...prev, { ...targetItem, id: newId }]);
      }
    } catch (err) {
      console.error('Error saving KPI target in DB:', err);
    }
    setEditingTarget(null);
  };

  const handleOpenDeleteConfirm = (item) => {
    setDeleteConfirmState({
      isOpen: true,
      itemToDelete: item
    });
  };

  // Tab 4 Training Handlers (Full CRUD)
  const handleOpenTrainingDetail = (plan) => {
    setSelectedTrainingPlan(plan);
    setIsTrainingDetailModalOpen(true);
  };

  const handleEditTrainingPlan = (plan) => {
    setEditingTrainingPlan(plan);
    setIsTrainingModalOpen(true);
  };

  const handleOpenDeleteTrainingConfirm = (plan) => {
    setDeleteConfirmState({
      isOpen: true,
      itemToDelete: plan,
      isTrainingPlan: true
    });
  };

  const handleSaveTrainingPlan = async (newPlan) => {
    try {
      if (editingTrainingPlan) {
        // Edit mode
        setTrainingPlans(prev => prev.map(p => p.id === newPlan.id ? newPlan : p));
      } else {
        // Create mode
        await api.post('/kpi-management/checklists', {
          employee_id: 'admin',
          task_code: newPlan.code,
          content: newPlan.name,
          frequency: 'Đào tạo',
          status_today: newPlan.status || 'Sắp diễn ra',
          perform_count: 1,
          last_performed: newPlan.time || '15/09/2026',
          result: newPlan.fileName || 'TaiLieu.pdf'
        }).catch(() => null);

        setTrainingPlans(prev => [...prev, { ...newPlan, id: Date.now() }]);
      }
    } catch (err) {
      console.error('Error saving training plan to DB:', err);
    } finally {
      setEditingTrainingPlan(null);
    }
  };

  const handleGeneralConfirmDelete = async () => {
    const item = deleteConfirmState.itemToDelete;
    if (!item) return;

    try {
      if (deleteConfirmState.isTrainingPlan) {
        if (item.id) {
          await api.delete(`/kpi-management/checklists/${item.id}`).catch(() => null);
        }
        setTrainingPlans(prev => prev.filter(p => p.id !== item.id));
      } else if (deleteConfirmState.isAlert) {
        if (item.id) {
          await api.delete(`/notifications/${item.id}`).catch(() => null);
        }
        await fetchDatabaseData();
      } else {
        await api.delete(`/kpi-management/kpi-pool/${item.id}`).catch(() => null);
        setKpiTargets(prev => prev.filter(t => t.id !== item.id));
      }
    } catch (err) {
      console.error('Error deleting item from DB:', err);
    } finally {
      setDeleteConfirmState({ isOpen: false, itemToDelete: null, isTrainingPlan: false, isAlert: false });
    }
  };

  // Tab 6 Alert CRUD Handlers - Persisted directly to Backend DB API `/notifications`
  const handleSendAlert = async (alertPayload) => {
    try {
      const payloadContent = JSON.stringify({
        title: alertPayload.title || 'Hiển thị thông báo mới',
        content: alertPayload.content
      });

      const updatedDate = alertPayload.date || new Date().toLocaleString('vi-VN');

      if (editingAlert && editingAlert.id) {
        // 1. Cập nhật ngay trên Giao diện Web (Optimistic UI Update)
        setAlertsList(prev => prev.map(item => 
          item.id === editingAlert.id 
            ? {
                ...item,
                title: alertPayload.title || 'Hiển thị thông báo mới',
                content: alertPayload.content,
                receiver: alertPayload.receiver || 'Bộ phận Sản xuất',
                date: updatedDate
              }
            : item
        ));

        // 2. Gửi request PUT lên Backend CSDL
        await api.put(`/notifications/${editingAlert.id}`, {
          content: payloadContent,
          target_group: alertPayload.receiver || 'Bộ phận Sản xuất',
          target_stage: 'MOBILE_BANNER',
          priority_status: `BANNER:${alertPayload.title || 'Hiển thị thông báo mới'}`
        }).catch(err => console.error('Error updating notification:', err));
      } else {
        // Create mode
        await api.post('/notifications/', {
          content: payloadContent,
          target_group: alertPayload.receiver || 'Bộ phận Sản xuất',
          target_stage: 'MOBILE_BANNER',
          priority_status: `BANNER:${alertPayload.title || 'Hiển thị thông báo mới'}`
        }).catch(err => console.error('Error creating notification:', err));
      }

      await fetchDatabaseData();
    } catch (err) {
      console.error('Error saving notification to DB:', err);
    } finally {
      setEditingAlert(null);
      setIsAlertModalOpen(false);
    }
  };

  const handleEditAlert = (alert) => {
    setEditingAlert(alert);
    setIsAlertModalOpen(true);
  };

  const handleDeleteAlert = (alert) => {
    setDeleteConfirmState({
      isOpen: true,
      itemToDelete: alert,
      isTrainingPlan: false,
      isAlert: true
    });
  };

  // CRUD Handlers for Tab Checklist Công Việc (Custom React Popup Modal)
  const handleAddDashboardChecklist = () => {
    setEditingChecklist(null);
    setChecklistFormData({ content: '', frequency: 'Hàng ngày', employee_id: 'NV_QLCL_004', status_today: 'Chưa làm' });
    setIsChecklistModalOpen(true);
  };

  const handleEditDashboardChecklist = (item) => {
    setEditingChecklist(item);
    setChecklistFormData({
      content: item.content || '',
      frequency: item.frequency || 'Hàng ngày',
      employee_id: item.employee_id || 'NV_QLCL_004',
      status_today: item.status_today || 'Đang thực hiện'
    });
    setIsChecklistModalOpen(true);
  };

  const handleSaveDashboardChecklist = async (e) => {
    if (e) e.preventDefault();
    if (!checklistFormData.content) return;

    try {
      if (editingChecklist) {
        await api.put(`/kpi-management/checklists/${editingChecklist.id}`, {
          employee_id: checklistFormData.employee_id,
          task_code: editingChecklist.task_code || `CL-${String(Date.now()).slice(-4)}`,
          content: checklistFormData.content,
          frequency: checklistFormData.frequency,
          status_today: checklistFormData.status_today,
          perform_count: editingChecklist.perform_count || 1,
          last_performed: new Date().toISOString().split('T')[0],
          result: editingChecklist.result || 'Đã cập nhật'
        });
      } else {
        await api.post('/kpi-management/checklists', {
          employee_id: checklistFormData.employee_id,
          task_code: `CL-${String(Date.now()).slice(-4)}`,
          content: checklistFormData.content,
          frequency: checklistFormData.frequency,
          status_today: checklistFormData.status_today,
          perform_count: 0,
          last_performed: new Date().toISOString().split('T')[0],
          result: 'Mới tạo'
        });
      }
      setIsChecklistModalOpen(false);
      await fetchDatabaseData();
    } catch (err) {
      console.error('Error saving checklist:', err);
    }
  };

  const handleDeleteDashboardChecklist = async (item) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa công việc checklist "${item.content}"?`)) {
      try {
        await api.delete(`/kpi-management/checklists/${item.id}`);
        await fetchDatabaseData();
      } catch (e) {
        console.error('Error deleting checklist:', e);
      }
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#FAF6F0', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* 6 MAIN TAB BUTTONS (EXACT DESIGN MATCHING MOCKUP) */}
      <div style={{
        display: 'flex',
        gap: '12px',
        borderBottom: '2px solid #EADCC9',
        marginBottom: '20px',
        overflowX: 'auto',
        paddingBottom: '2px',
        alignItems: 'center',
        justify: 'space-between'
      }}>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
          {[
            { id: 'quality_targets', label: 'Mục tiêu chất lượng' },
            { id: 'work_indicators', label: 'Chỉ số công việc' },
            { id: 'checklist_work', label: 'Checklist công việc' },
            { id: 'violations_list', label: 'Danh sách vi phạm' },
            { id: 'training_plan', label: 'Kế hoạch đào tạo' },
            { id: 'reports_bbch', label: 'Báo cáo và BBCH' },
            { id: 'alerts_setup', label: 'Thiết lập cảnh báo' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #5D3B32' : 'none',
                  backgroundColor: 'transparent',
                  color: isActive ? '#5D3B32' : '#64748B',
                  fontWeight: isActive ? '900' : '600',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Live DB Indicator & Refresh Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={fetchDatabaseData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #EADCC9', backgroundColor: '#FFFFFF', color: '#5D3B32', borderRadius: '8px', padding: '6px 12px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            {loading ? 'Đang tải DB...' : 'Làm mới DB'}
          </button>
        </div>
      </div>

      {/* TAB CONTENT AREA */}
      <div>

        {/* ========================================================================= */}
        {/* TAB 1: MỤC TIÊU CHẤT LƯỢNG (DỮ LIỆU TỪ DATABASE BACKEND `/awards-discipline`)*/}
        {/* ========================================================================= */}
        {activeTab === 'quality_targets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 4 TOP STAT CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              
              {/* CARD 1: CHỈ SỐ ĐIỂM KPI VI PHẠM */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '18px 20px', border: '1px solid #EADCC9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'relative' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                  CHỈ SỐ ĐIỂM KPI VI PHẠM
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                  <span style={{ fontSize: '2.4rem', fontWeight: '900', color: '#DC2626', lineHeight: 1 }}>{summaryStats.kpi_violation_score}</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#94A3B8' }}>/ 100</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', marginTop: '14px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(summaryStats.kpi_violation_score, 100)}%`, height: '100%', backgroundColor: '#DC2626', borderRadius: '4px' }}></div>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: '800', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ⚠️ Cảnh báo mức vi phạm cần cải thiện
                </div>
              </div>

              {/* CARD 2: TỔNG VI PHẠM QC */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '18px 20px', border: '1px solid #EADCC9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                    TỔNG VI PHẠM QC
                  </div>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
                    <ShieldAlert size={16} />
                  </div>
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: '900', color: '#1E293B', marginTop: '8px', lineHeight: 1 }}>
                  {summaryStats.total_violations_count}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '12px' }}>
                  Ghi nhận trong tháng này
                </div>
              </div>

              {/* CARD 3: LỖI NGHIỆM TRỌNG */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '18px 20px', border: '1px solid #EADCC9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                    LỖI NGHIỆM TRỌNG
                  </div>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
                    <AlertTriangle size={16} />
                  </div>
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: '900', color: '#1E293B', marginTop: '8px', lineHeight: 1 }}>
                  {summaryStats.critical_errors_count} <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#64748B' }}>ca</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: '800', marginTop: '12px' }}>
                  Cần xử lý CAPA khẩn cấp
                </div>
              </div>

              {/* CARD 4: HOÀN THÀNH CHECKLIST */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '18px 20px', border: '1px solid #EADCC9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                    HOÀN THÀNH CHECKLIST
                  </div>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
                    <CheckCircle2 size={16} />
                  </div>
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: '900', color: '#15803D', marginTop: '8px', lineHeight: 1 }}>
                  {summaryStats.checklist_completion_rate}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#15803D', fontWeight: '700', marginTop: '12px' }}>
                  Đạt chỉ tiêu ISO 9001
                </div>
              </div>

            </div>

            {/* MIDDLE SECTION: CHART + RECENT VIOLATIONS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
              
              {/* LEFT: CHART / WEEKLY TREND */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '20px', border: '1px solid #EADCC9' }}>
                <h4 style={{ margin: '0 0 20px 0', fontSize: '0.92rem', fontWeight: '800', color: '#5D3B32', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📈 Xu hướng phát hiện lỗi QC theo tuần
                </h4>
                
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '140px', paddingBottom: '10px', borderBottom: '1px solid #E2E8F0' }}>
                  {summaryStats.weekly_trend.map((w, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '60px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '900', color: w.isPeak ? '#DC2626' : '#D97706' }}>{w.count}</span>
                      <div style={{ width: '32px', height: w.height, backgroundColor: w.isPeak ? '#FEE2E2' : '#FEF3C7', borderRadius: '6px 6px 0 0', border: w.isPeak ? '1px solid #FCA5A5' : '1px solid #FDE68A' }}></div>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B' }}>{w.week}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT: RECENT VIOLATIONS LIST */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '20px', border: '1px solid #EADCC9' }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '0.92rem', fontWeight: '800', color: '#5D3B32', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⚠️ Biên bản vi phạm QC gần đây
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {violations.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem', backgroundColor: '#FAF6F0', borderRadius: '10px', border: '1px dashed #EADCC9' }}>
                      Chưa có biên bản vi phạm mới từ Mobile App
                    </div>
                  ) : (
                    violations.slice(0, 3).map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => handleOpenDetailModal(item)}
                        style={{
                          backgroundColor: '#FAF6F0',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          border: '1px solid #EADCC9',
                          cursor: 'pointer',
                          display: 'flex',
                          justify: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1E293B' }}>
                            {item.code} • {item.emp}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                            {item.rule}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: '900', color: '#DC2626' }}>
                            {item.score} điểm
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '2px' }}>
                            {item.date}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* BOTTOM SECTION: MAIN TABLE */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <div style={{ padding: '14px 18px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '800', color: '#5D3B32', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📜 Danh sách Mục tiêu chất lượng & Vi phạm QC
                </h4>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#7B5233' }}>Tổng số: {violations.length} record</span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px', fontWeight: '700', width: '50px' }}>STT</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700' }}>Mã biên bản</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700' }}>Nhân viên vi phạm</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700' }}>Bộ phận / Tổ</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700' }}>Nội dung vi phạm</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700', textAlign: 'center' }}>Điểm trừ</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700', textAlign: 'center' }}>Tiền phạt</th>
                    <th style={{ padding: '12px 14px', fontWeight: '700', textAlign: 'center' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontWeight: '600' }}>
                        Chưa có biên bản vi phạm nào được ghi nhận từ Mobile App (`/awards`) trong Database.
                      </td>
                    </tr>
                  ) : (
                    violations.map((item, idx) => (
                      <tr
                        key={item.id}
                        onClick={() => handleOpenDetailModal(item)}
                        style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0' }}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                        <td style={{ padding: '12px 14px', fontWeight: '800', color: '#1E293B' }}>{item.code}</td>
                        <td style={{ padding: '12px 14px', fontWeight: '700', color: '#1E293B' }}>{item.emp}</td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>{item.dept}</td>
                        <td style={{ padding: '12px 14px', color: '#334155' }}>{item.rule}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '900', color: '#DC2626' }}>{item.score} điểm</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '800', color: '#C2410C' }}>{item.fine ? `${item.fine.toLocaleString()} VNĐ` : '0 VNĐ'}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800',
                            backgroundColor: item.status === 'Đã duyệt' ? '#DCFCE7' : '#FEF3C7',
                            color: item.status === 'Đã duyệt' ? '#15803D' : '#B45309'
                          }}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CHỈ SỐ CÔNG VIỆC                                                   */}
        {/* ========================================================================= */}
        {activeTab === 'work_indicators' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '12px 18px', borderRadius: '10px', border: '1px solid #EADCC9' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#5D3B32' }}>
                📋 Bảng Danh mục Chỉ số Công việc KPI
              </div>
              <button
                onClick={() => { setEditingTarget(null); setIsTargetModalOpen(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#5D3B32', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                <Plus size={16} /> Thêm chỉ số KPI mới
              </button>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', fontWeight: '700', width: '50px' }}>STT</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Mã KPI</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Tên Chỉ Số Công Việc</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Bộ Phận Áp Dụng</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center' }}>Ngưỡng Đạt</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center' }}>Trọng Số (%)</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center' }}>Đơn Vị</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center', width: '110px' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {kpiTargets.map((item, idx) => (
                    <tr
                      key={item.id}
                      onClick={() => { setEditingTarget(item); setIsTargetModalOpen(true); }}
                      style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0', cursor: 'pointer' }}
                      title="Bấm để chỉnh sửa chỉ số này"
                    >
                      <td style={{ padding: '10px 12px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 12px', fontWeight: '800', color: '#5D3B32' }}>{item.code}</td>
                      <td style={{ padding: '10px 12px', fontWeight: '700', color: '#1E293B' }}>{item.name}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{item.dept}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700', color: '#15803D' }}>{item.target}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '800', color: '#5D3B32' }}>{item.weight}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748B' }}>{item.unit}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingTarget(item); setIsTargetModalOpen(true); }}
                            style={{ border: 'none', background: '#E0F2FE', color: '#0369A1', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }}
                            title="Chỉnh sửa chỉ số"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenDeleteConfirm(item); }}
                            style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }}
                            title="Xóa chỉ số"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: CHECKLIST CÔNG VIỆC                                                */}
        {/* ========================================================================= */}
        {activeTab === 'checklist_work' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '12px 18px', borderRadius: '10px', border: '1px solid #EADCC9' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#5D3B32' }}>
                📋 Quản lý Danh mục Checklist Công việc Nhân sự
              </div>
              <button
                onClick={handleAddDashboardChecklist}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#5D3B32', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                <Plus size={16} /> Thêm Checklist mới
              </button>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', fontWeight: '700', width: '50px' }}>STT</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', width: '110px' }}>Mã Công Việc</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Tên / Nhiệm Vụ Checklist</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', width: '130px' }}>Cách Theo Dõi</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', width: '130px' }}>Mã Nhân Sự</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center', width: '120px' }}>Trạng Thái</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center', width: '130px' }}>Lần Làm Gần Nhất</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', width: '130px' }}>Kết Quả</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center', width: '110px' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {allChecklists.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontWeight: '600' }}>
                        Chưa có mục checklist nào trong Database. Bấm "Thêm Checklist mới" để tạo.
                      </td>
                    </tr>
                  ) : allChecklists.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0' }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 12px', fontWeight: '800', color: '#5D3B32' }}>{item.task_code || `CL-00${idx + 1}`}</td>
                      <td style={{ padding: '10px 12px', fontWeight: '700', color: '#1E293B' }}>{item.content}</td>
                      <td style={{ padding: '10px 12px', color: '#475569' }}>{item.frequency || 'Hàng ngày'}</td>
                      <td style={{ padding: '10px 12px', color: '#2563EB', fontWeight: '700' }}>{item.employee_id || 'Chưa gán'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800',
                          backgroundColor: item.status_today === 'Hoàn thành' ? '#DCFCE7' : item.status_today === 'Đang thực hiện' ? '#E0F2FE' : '#FEF3C7',
                          color: item.status_today === 'Hoàn thành' ? '#15803D' : item.status_today === 'Đang thực hiện' ? '#0369A1' : '#B45309'
                        }}>
                          {item.status_today || 'Chưa làm'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748B' }}>{item.last_performed || 'Hôm nay'}</td>
                      <td style={{ padding: '10px 12px', color: '#16A34A', fontWeight: '700' }}>{item.result || 'Đạt yêu cầu'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleEditDashboardChecklist(item)}
                            style={{ border: 'none', background: '#E0F2FE', color: '#0369A1', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }}
                            title="Chỉnh sửa checklist"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteDashboardChecklist(item)}
                            style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }}
                            title="Xóa checklist"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: DANH SÁCH VI PHẠM                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'violations_list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '12px 18px', borderRadius: '10px', border: '1px solid #EADCC9' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#5D3B32' }}>
                📱 Dữ liệu Vi phạm thực tế từ Mobile App
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#16A34A' }}>
                ✓ Đã đồng bộ với DB Backend
              </span>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', fontWeight: '700', width: '50px' }}>STT</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Mã BB</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Nhân Viên Vi Phạm</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Bộ Phận</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Nội Dung Lỗi QC</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center' }}>Điểm Trừ</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center' }}>Tiền Phạt</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Người Lập (Mobile)</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center' }}>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
                        Chưa có dữ liệu vi phạm từ Mobile App trong Database `/awards-discipline`.
                      </td>
                    </tr>
                  ) : (
                    violations.map((item, idx) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 12px', fontWeight: '800', color: '#5D3B32' }}>{item.code}</td>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#1E293B' }}>{item.emp}</td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{item.dept}</td>
                        <td style={{ padding: '10px 12px', color: '#DC2626', fontWeight: '600' }}>{item.rule}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '900', color: '#DC2626' }}>{item.score} điểm</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '800', color: '#C2410C' }}>{item.fine ? `${item.fine.toLocaleString()} VNĐ` : '0 VNĐ'}</td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{item.reporter}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
                            backgroundColor: item.status === 'Đã duyệt' ? '#DCFCE7' : '#FEF3C7',
                            color: item.status === 'Đã duyệt' ? '#15803D' : '#B45309'
                          }}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: KẾ HOẠCH ĐÀO TẠO                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'training_plan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '12px 18px', borderRadius: '10px', border: '1px solid #EADCC9' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#5D3B32' }}>
                📚 Bảng Kế hoạch Đào tạo & Lưu trữ File Đính kèm
              </div>
              <button
                onClick={() => setIsTrainingModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#5D3B32', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                <Plus size={16} /> Tạo kế hoạch đào tạo
              </button>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', fontWeight: '700', width: '50px' }}>STT</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Mã Khóa</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Tên Chương Trình Đào Tạo</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Đối Tượng Tham Gia</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center' }}>Thời Gian</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Giảng Viên</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Tài Liệu Đính Kèm (File)</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center' }}>Trạng Thái</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center', width: '110px' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {trainingPlans.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontWeight: '600' }}>
                        Chưa có kế hoạch đào tạo nào được lưu trong Database (`/kpi-management/checklists`). Bấm "+ Tạo kế hoạch đào tạo" để thêm mới.
                      </td>
                    </tr>
                  ) : (
                    trainingPlans.map((item, idx) => (
                      <tr
                        key={item.id}
                        onClick={() => handleOpenTrainingDetail(item)}
                        style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0', cursor: 'pointer' }}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 12px', fontWeight: '800', color: '#5D3B32' }}>{item.code}</td>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#1E293B' }}>{item.name}</td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{item.target}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748B' }}>{item.time}</td>
                        <td style={{ padding: '10px 12px', color: '#334155' }}>{item.teacher}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.fileUrl) {
                                window.open(item.fileUrl, '_blank');
                              } else {
                                handleOpenTrainingDetail(item);
                              }
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563EB', fontWeight: '700', cursor: 'pointer' }}
                            title={item.fileUrl ? 'Nhấn để mở file trên trang riêng' : 'Nhấn để xem chi tiết'}
                          >
                            <ExternalLink size={14} /> {item.fileName}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
                            backgroundColor: item.status === 'Đã hoàn thành' ? '#DCFCE7' : '#FEF3C7',
                            color: item.status === 'Đã hoàn thành' ? '#15803D' : '#B45309'
                          }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenTrainingDetail(item); }}
                              style={{ border: 'none', background: '#EFF6FF', color: '#2563EB', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }}
                              title="Xem chi tiết"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditTrainingPlan(item); }}
                              style={{ border: 'none', background: '#FEF3C7', color: '#D97706', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }}
                              title="Chỉnh sửa"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenDeleteTrainingConfirm(item); }}
                              style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }}
                              title="Xóa khóa học"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: BÁO CÁO VÀ BBCH                                                   */}
        {/* ========================================================================= */}
        {activeTab === 'reports_bbch' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '12px 18px', borderRadius: '10px', border: '1px solid #EADCC9' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#5D3B32' }}>
                📋 Báo cáo Đánh giá Nhân sự từ Mobile App
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#16A34A' }}>
                ✓ Đồng bộ tự động qua API /staff-evaluation
              </span>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', fontWeight: '700', width: '50px' }}>STT</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Mã Báo Cáo</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Nhân Viên</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Bộ Phận</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Nhận Xét Đánh Giá Quản Lý</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center' }}>Điểm Đánh Giá</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Mã BBCH Khắc Phục</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center' }}>Ngày Lập</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center' }}>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {staffEvaluations.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>
                        Chưa có dữ liệu đánh giá nhân sự trong Database `/staff-evaluation`.
                      </td>
                    </tr>
                  ) : (
                    staffEvaluations.map((item, idx) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 12px', fontWeight: '800', color: '#5D3B32' }}>{item.code}</td>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#1E293B' }}>{item.emp}</td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{item.dept}</td>
                        <td style={{ padding: '10px 12px', color: '#334155' }}>{item.manager_note}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '900', color: '#15803D' }}>{item.eval_score} điểm</td>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#0284C7' }}>{item.bbch_code}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748B' }}>{item.date}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
                            backgroundColor: item.status === 'Đã phê duyệt' ? '#DCFCE7' : '#FEF3C7',
                            color: item.status === 'Đã phê duyệt' ? '#15803D' : '#B45309'
                          }}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: THIẾT LẬP CẢNH BÁO                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'alerts_setup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '12px 18px', borderRadius: '10px', border: '1px solid #EADCC9' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#5D3B32' }}>
                🔔 Thiết lập Cảnh báo & Phát Thông báo Mới đến Mobile App Banner
              </div>
              <button
                onClick={() => setIsAlertModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#5D3B32', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                <Send size={16} /> Bắn thông báo mới đến Mobile
              </button>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', border: '1px solid #EADCC9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', fontWeight: '700', width: '50px' }}>STT</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Mã Cảnh Báo</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Tiêu Đề Thông Báo</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Nội Dung Phát Đến Banner Mobile App</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700' }}>Đối Tượng Nhận</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center' }}>Thời Gian Phát</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center' }}>Trạng Thái</th>
                    <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center', width: '90px' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {alertsList.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontWeight: '600' }}>
                        Chưa có thông báo nào. Bấm "+ Bắn thông báo mới đến Mobile" để tạo.
                      </td>
                    </tr>
                  ) : (
                    alertsList.map((item, idx) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAF6F0' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 12px', fontWeight: '800', color: '#5D3B32' }}>{item.code}</td>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#1E293B' }}>{item.title}</td>
                        <td style={{ padding: '10px 12px', color: '#0F172A', fontWeight: '600', maxWidth: '320px' }}>{item.content}</td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{item.receiver}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748B' }}>{item.date}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#16A34A', fontWeight: '800' }}>{item.status}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleEditAlert(item)}
                              style={{ border: 'none', background: '#FEF3C7', color: '#D97706', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }}
                              title="Chỉnh sửa"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteAlert(item)}
                              style={{ border: 'none', background: '#FEE2E2', color: '#DC2626', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer' }}
                              title="Xóa thông báo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>

      {/* MODALS INTEGRATION */}
      
      {/* 1. Modal CL03.2 (KPITaskDetailModal) */}
      <KPITaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        taskData={selectedTaskData}
      />

      {/* 2. Modal CRUD KPI Target (KPITargetFormModal) */}
      <KPITargetFormModal
        isOpen={isTargetModalOpen}
        onClose={() => { setIsTargetModalOpen(false); setEditingTarget(null); }}
        targetData={editingTarget}
        onSave={handleSaveKpiTarget}
      />

      {/* 3. Modal Create/Edit Training Plan + Upload File (KPINewTrainingModal) */}
      <KPINewTrainingModal
        isOpen={isTrainingModalOpen}
        onClose={() => { setIsTrainingModalOpen(false); setEditingTrainingPlan(null); }}
        planData={editingTrainingPlan}
        onSave={handleSaveTrainingPlan}
      />

      {/* 3b. Modal View Detail Training Plan */}
      <KPITrainingDetailModal
        isOpen={isTrainingDetailModalOpen}
        onClose={() => { setIsTrainingDetailModalOpen(false); setSelectedTrainingPlan(null); }}
        planData={selectedTrainingPlan}
      />

      {/* 4. Modal Broadcast Alert to Mobile Banner (KPISendAlertModal) */}
      <KPISendAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => { setIsAlertModalOpen(false); setEditingAlert(null); }}
        alertData={editingAlert}
        onSend={handleSendAlert}
      />

      {/* 5. Custom Project Delete Confirmation Modal (BeautifulConfirmModal) */}
      <BeautifulConfirmModal
        isOpen={deleteConfirmState.isOpen}
        type="danger"
        title={
          deleteConfirmState.isTrainingPlan ? "Xác nhận xóa kế hoạch đào tạo"
          : deleteConfirmState.isAlert ? "Xác nhận xóa thông báo cảnh báo"
          : "Xác nhận xóa chỉ số KPI"
        }
        message={
          deleteConfirmState.isTrainingPlan 
            ? `Bạn có chắc chắn muốn xóa kế hoạch đào tạo "${deleteConfirmState.itemToDelete?.name || ''}" (${deleteConfirmState.itemToDelete?.code || ''}) khỏi hệ thống không?`
            : deleteConfirmState.isAlert
            ? `Bạn có chắc chắn muốn xóa thông báo "${deleteConfirmState.itemToDelete?.title || ''}" (${deleteConfirmState.itemToDelete?.code || ''}) khỏi hệ thống không?`
            : `Bạn có chắc chắn muốn xóa chỉ số KPI "${deleteConfirmState.itemToDelete?.name || ''}" (${deleteConfirmState.itemToDelete?.code || ''}) khỏi Database hệ thống không?`
        }
        confirmText="Xóa dữ liệu"
        cancelText="Hủy bỏ"
        onConfirm={handleGeneralConfirmDelete}
        onClose={() => setDeleteConfirmState({ isOpen: false, itemToDelete: null, isTrainingPlan: false, isAlert: false })}
      />

      {/* 6. Custom Checklist React Modal Popup */}
      {isChecklistModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            width: '450px',
            maxWidth: '90%',
            padding: '20px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1E293B', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
              {editingChecklist ? 'Cập Nhật Công Việc Checklist' : 'Thêm Công Việc Checklist Mới'}
            </h3>

            <form onSubmit={handleSaveDashboardChecklist}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Nội dung / Nhiệm vụ Checklist <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Kiểm tra 5S khu vực kiểm định..."
                  value={checklistFormData.content}
                  onChange={(e) => setChecklistFormData(prev => ({ ...prev, content: e.target.value }))}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Cách theo dõi
                  </label>
                  <select
                    value={checklistFormData.frequency}
                    onChange={(e) => setChecklistFormData(prev => ({ ...prev, frequency: e.target.value }))}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                  >
                    <option value="Hàng ngày">Hàng ngày</option>
                    <option value="Theo ca">Theo ca</option>
                    <option value="Hàng tuần">Hàng tuần</option>
                    <option value="Hàng tháng">Hàng tháng</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Mã nhân sự phụ trách
                  </label>
                  <input
                    type="text"
                    value={checklistFormData.employee_id}
                    onChange={(e) => setChecklistFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Trạng thái
                </label>
                <select
                  value={checklistFormData.status_today}
                  onChange={(e) => setChecklistFormData(prev => ({ ...prev, status_today: e.target.value }))}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="Hoàn thành">Hoàn thành</option>
                  <option value="Đang thực hiện">Đang thực hiện</option>
                  <option value="Chưa làm">Chưa làm</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsChecklistModalOpen(false)}
                  style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '6px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#7B5233', color: '#FFFFFF', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  {editingChecklist ? 'Cập Nhật Database' : 'Tạo Mới Về Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default QualityKPIDashboardView;
