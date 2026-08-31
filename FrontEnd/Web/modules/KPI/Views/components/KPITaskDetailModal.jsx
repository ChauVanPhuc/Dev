import React, { useState, useEffect } from 'react';
import { X, Plus, MoreHorizontal, Edit2, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';

/**
 * Modal CL03.2: Thông tin nhân sự
 * Giữ 100% cấu trúc & vị trí các ô của Mockup Image 5, được tối ưu khoảng cách (compact padding)
 * để toàn bộ Modal nằm vừa vặn trong màn hình, không bị cuộn dầy.
 */
const KPITaskDetailModal = ({ isOpen, onClose, taskData, onSave }) => {
  const data = taskData || {};

  // Toast context hook (with fallback)
  let toastContext = null;
  try {
    toastContext = useToast();
  } catch (e) {}

  // Custom Alert & Confirm Popup States
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', text: '', type: 'warning' });
  const [modalConfirm, setModalConfirm] = useState({ show: false, title: '', text: '', onConfirm: null });

  // Form Fields State
  const [formData, setFormData] = useState({
    schema_name: data.schema_name || 'Sơ đồ chốt chặn',
    current_level: data.current_level || 'Cấp 1',
    parent_level: data.parent_level || 'Ban Giám Đốc (QMR)',
    factory: data.factory || 'Nhà máy 1 (NM1)',
    employee_name: data.employee_name || data.full_name || 'Ngô Diễm My',
    employee_id: data.employee_id || 'NV_IT_002',
    position: data.position || data.position_name || 'Trưởng nhóm PQC',
    department: data.department || data.section_name || data.department_name || 'Phòng QA/QC',
    selected_month: data.selected_month || 'Tháng 8',
    score_prev_month: data.score_prev_month || 120,
    score_current: data.score_current || 40,
    level_code: data.level_code || 'LV-02',
    note: data.note || '',
    display_month: data.display_month || 'Tháng 1',
    total_score: data.total_score || '160',
    kpi_score: data.kpi_score || '95',
    qldg_score: data.qldg_score || '40',
    violation_score: data.violation_score || '-5'
  });

  // Active Tab: 'kpi' | 'checklist' | 'manager_evaluation' | 'violations'
  const [activeTab, setActiveTab] = useState('kpi');

  // Data for 4 Tables matching exact mockup columns
  const [kpiList, setKpiList] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [managerEvaluations, setManagerEvaluations] = useState([]);
  const [violations, setViolations] = useState([]);

  // Popup Modal States & Sub-modal control state
  const [subModalType, setSubModalType] = useState(null); // 'kpi' | 'checklist' | 'parent'
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingKpiId, setEditingKpiId] = useState(null);
  const [editingChecklistId, setEditingChecklistId] = useState(null);
  const [newKpiForm, setNewKpiForm] = useState({ target: '', threshold: '>= 95%', weight: '30%' });
  const [newChecklistForm, setNewChecklistForm] = useState({ task: '', tracking: 'Hàng ngày' });

  const [kpiPool, setKpiPool] = useState([]);
  const [checklistPool, setChecklistPool] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  useEffect(() => {
    // 1. Fetch KPI Pool from Database
    api.get('/kpi-management/kpi-pool')
      .then(res => {
        const data = Array.isArray(res) ? res : (res?.data || res?.items || []);
        setKpiPool(data);
      })
      .catch(() => setKpiPool([]));

    // 2. Fetch Checklist Pool from Database
    api.get('/kpi-management/checklist-pool')
      .then(res => {
        const data = Array.isArray(res) ? res : (res?.data || res?.items || []);
        setChecklistPool(data);
      })
      .catch(() => setChecklistPool([]));

    // 3. Fetch Full Employees list from /admin/hr/employees & Quality Employees
    Promise.all([
      api.get('/hr/employees?page=1&size=1000').catch(() => null),
      api.get('/quality-employees/?size=1000').catch(() => null),
      api.get('/kpi-management/employees').catch(() => null)
    ]).then(([res1, res2, res3]) => {
      const list1 = res1?.items || (Array.isArray(res1) ? res1 : (res1?.data?.items || []));
      const list2 = res2?.items || (Array.isArray(res2) ? res2 : (res2?.data?.items || []));
      const list3 = res3?.items || (Array.isArray(res3) ? res3 : (res3?.data?.items || []));

      // Standardize employee items
      const combined = [...list1, ...list2, ...list3];
      const uniqueMap = new Map();
      combined.forEach(emp => {
        const name = emp.full_name || emp.name;
        const code = emp.employee_id || emp.id || name;
        if (name && !uniqueMap.has(name)) {
          uniqueMap.set(name, {
            id: emp.id,
            employee_id: emp.employee_id || `NV_${emp.id}`,
            full_name: name,
            position_name: emp.position_name || emp.stage || emp.position || 'Nhân viên QC',
            department_name: emp.department_name || emp.department || 'Phòng QA/QC',
            section_name: emp.section_name || emp.factory || 'Bộ phận QC',
            factory: emp.factory || emp.factory_name || 'Nhà máy 1 (NM1)'
          });
        }
      });
      const allEmps = Array.from(uniqueMap.values());
      if (allEmps.length > 0) setEmployeeOptions(allEmps);
    });
  }, []);

  useEffect(() => {
    const handleDocumentClick = () => setActiveMenuId(null);
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Fetch employee-specific data from Database
  const fetchEmployeeData = (empId, empName) => {
    if (!empId) {
      setKpiList([]);
      setChecklist([]);
      return;
    }

    // 1. Fetch KPI items for this employee from Database
    api.get(`/kpi-management/employee-items?employee_id=${empId}`)
      .then(res => {
        const list = res?.items || (Array.isArray(res) ? res : []);
        if (list.length > 0) {
          const uniqueList = [];
          const seen = new Set();
          for (const k of list) {
            const key = (k.content || k.target || '').trim();
            if (key && !seen.has(key)) {
              seen.add(key);
              uniqueList.push(k);
            }
          }
          setKpiList(uniqueList.map((k, idx) => ({
            id: k.id || idx + 1,
            db_id: k.id,
            target: k.content || k.target || 'Mục tiêu KPI',
            threshold: k.target || '>= 95%',
            actual: k.actual || '95%',
            weight: k.score ? `${k.score}%` : '30%'
          })));
        } else {
          setKpiList([]);
        }
      })
      .catch(() => setKpiList([]));

    // 2. Fetch Checklist items for this employee
    api.get(`/kpi-management/checklists?employee_id=${empId}`)
      .then(res => {
        const list = res?.items || (Array.isArray(res) ? res : []);
        if (list.length > 0) {
          const uniqueList = [];
          const seen = new Set();
          for (const c of list) {
            const key = (c.content || c.task || '').trim();
            if (key && !seen.has(key)) {
              seen.add(key);
              uniqueList.push(c);
            }
          }
          setChecklist(uniqueList.map((c, idx) => ({
            id: c.id || idx + 1,
            db_id: c.id,
            task: c.content || 'Kiểm tra quy trình QC',
            tracking: c.frequency || 'Hàng ngày',
            status: c.status_today || 'Hoàn thành',
            note: c.result || 'Đạt yêu cầu'
          })));
        } else {
          setChecklist([]);
        }
      })
      .catch(() => setChecklist([]));

    // 3. Fetch Manager Evaluations for this employee (từ /staff-evaluations hoặc /staff-evaluation)
    const fetchManagerEvals = async () => {
      try {
        let list = [];
        const resp1 = await api.get('/staff-evaluations/').catch(() => null);
        if (resp1) {
          list = resp1?.items || (Array.isArray(resp1) ? resp1 : []);
        }
        if (!list || list.length === 0) {
          const resp2 = await api.get('/staff-evaluation/').catch(() => null);
          if (resp2) {
            list = resp2?.items || (Array.isArray(resp2) ? resp2 : []);
          }
        }
        if (list && list.length > 0) {
          const filtered = list.filter(e => 
            (e.staff_name && e.staff_name.toLowerCase().includes((empName || '').toLowerCase())) ||
            (e.employee_name && e.employee_name.toLowerCase().includes((empName || '').toLowerCase())) ||
            (e.employee_id && String(e.employee_id) === String(empId))
          );
          if (filtered.length > 0) {
            setManagerEvaluations(filtered.map((e, idx) => ({
              id: e.id || idx + 1,
              time: e.eval_date || e.time || (e.created_at ? new Date(e.created_at).toLocaleDateString('vi-VN') : '31/08/2026'),
              achievement: e.achievements || e.manager_note || e.note || 'Hoàn thành nhiệm vụ',
              difficulty: e.limitations || 'Không có',
              plan: e.improvement_plan || e.proposed_action || 'Duy trì hiệu suất',
              proposal: e.proposals || 'Khen thưởng',
              total_point: e.rating ? `Loại ${e.rating}` : (e.actual_score ? `${e.actual_score} điểm` : '+5')
            })));
          } else {
            setManagerEvaluations([]);
          }
        } else {
          setManagerEvaluations([]);
        }
      } catch (err) {
        setManagerEvaluations([]);
      }
    };
    fetchManagerEvals();

    // 4. Fetch Violation Points from Mobile `/awards-discipline`
    api.get('/awards-discipline/')
      .then(res => {
        const list = res?.items || (Array.isArray(res) ? res : []);
        if (list.length > 0) {
          const filtered = list.filter(v => 
            (v.staff_name && v.staff_name.toLowerCase().includes((empName || '').toLowerCase())) ||
            (v.employee_name && v.employee_name.toLowerCase().includes((empName || '').toLowerCase())) ||
            (v.employee_id && String(v.employee_id) === String(empId))
          );
          if (filtered.length > 0) {
            setViolations(filtered.map((v, idx) => ({
              id: v.id || idx + 1,
              time: v.violation_time || (v.created_at ? new Date(v.created_at).toLocaleString('vi-VN') : '25/08/2026 09:30'),
              type: v.rule_name || v.issue || v.content || 'Vi phạm quy trình QC',
              description: v.note || v.description || v.rule_code || 'Ghi nhận từ ứng dụng Mobile',
              image: v.evidence_images && v.evidence_images !== '[]' ? 'Xem ảnh' : 'Không có ảnh',
              reporter: v.reporter_name || v.created_by || 'QC Supervisor',
              point: `-${Math.abs(v.points || 0)}`
            })));
          } else {
            setViolations([]);
          }
        } else {
          setViolations([]);
        }
      })
      .catch(() => setViolations([]));
  };

  // Load employee-specific data when modal opens or taskData changes
  useEffect(() => {
    if (!isOpen) return;

    // Load full list of quality employees & HR employees from DB
    Promise.all([
      api.get('/quality-employees/?size=1000').catch(() => null),
      api.get('/hr/employees?page=1&size=1000').catch(() => null)
    ]).then(([qRes, hrRes]) => {
      const qItems = qRes?.items || (Array.isArray(qRes) ? qRes : []);
      const hrItems = hrRes?.items || (Array.isArray(hrRes) ? hrRes : []);

      const uniqueMap = new Map();

      // Xác định top leader cho danh sách QLCL
      const topLeader = qItems.find(e => {
        const pos = (e.stage || e.position || '').toLowerCase();
        return pos.includes('giám đốc') || pos.includes('trưởng') || pos.includes('phó');
      }) || qItems[0];

      // Thêm nhân sự QLCL từ DB
      qItems.forEach(emp => {
        const name = emp.full_name || emp.name;
        if (name) {
          let noteLevel = null;
          if (emp.note && typeof emp.note === 'string' && emp.note.trim().startsWith('{')) {
            try { noteLevel = JSON.parse(emp.note).level; } catch (e) {}
          } else if (emp.note && typeof emp.note === 'string' && emp.note.includes('Cấp')) {
            noteLevel = emp.note;
          }

          const noteStr = (noteLevel || emp.note || '').toLowerCase();
          const posStr = (emp.stage || emp.position || '').toLowerCase();
          const isTop = (topLeader && emp.id === topLeader.id) || posStr.includes('giám đốc') || noteStr.includes('cấp 1');
          
          let lvl = 'Cấp 5';
          if (noteStr.includes('cấp 1') || isTop) lvl = 'Cấp 1';
          else if (noteStr.includes('cấp 2') || posStr.includes('trưởng phòng') || (posStr.includes('trưởng') && !posStr.includes('tổ'))) lvl = 'Cấp 2';
          else if (noteStr.includes('cấp 3') || posStr.includes('phó')) lvl = 'Cấp 3';
          else if (noteStr.includes('cấp 4') || posStr.includes('tổ') || posStr.includes('giám sát') || posStr.includes('lead')) lvl = 'Cấp 4';
          else if (noteStr.includes('cấp 5')) lvl = 'Cấp 5';

          uniqueMap.set(name, {
            id: emp.id,
            employee_id: emp.employee_id || `NV_${emp.id}`,
            full_name: name,
            position_name: emp.stage || emp.position || 'Nhân sự QLCL',
            department_name: emp.department || 'Phòng QA/QC',
            factory: emp.factory || 'Nhà máy 1 (NM1)',
            current_level: lvl
          });
        }
      });

      // Thêm nhân sự HR từ DB
      hrItems.forEach(emp => {
        const name = emp.full_name || emp.name;
        if (name && !uniqueMap.has(name)) {
          const posStr = (emp.position_name || emp.stage || emp.position || '').toLowerCase();
          let lvl = 'Cấp 5';
          if (posStr.includes('giám đốc')) lvl = 'Cấp 1';
          else if (posStr.includes('trưởng phòng') || posStr.includes('trưởng')) lvl = 'Cấp 2';
          else if (posStr.includes('phó')) lvl = 'Cấp 3';
          else if (posStr.includes('tổ') || posStr.includes('giám sát')) lvl = 'Cấp 4';

          uniqueMap.set(name, {
            id: emp.id,
            employee_id: emp.employee_id || `NV_${emp.id}`,
            full_name: name,
            position_name: emp.position_name || emp.stage || emp.position || 'Nhân sự HR',
            department_name: emp.department_name || emp.department || 'Phòng QA/QC',
            factory: emp.factory || emp.factory_name || 'Nhà máy 1 (NM1)',
            current_level: lvl
          });
        }
      });

      setEmployeeOptions(Array.from(uniqueMap.values()));
    }).catch(() => null);

    const empName = taskData?.full_name || taskData?.employee_name || '';
    const empId = taskData?.employee_id || '';
    const pos = taskData?.stage || taskData?.position_name || taskData?.position || '';
    const dept = taskData?.department || taskData?.section_name || taskData?.department_name || '';
    const fac = taskData?.factory || taskData?.factory_name || '';

    // Trích xuất level và parent_level/parent_id từ taskData hoặc note JSON
    let curLevel = taskData?.current_level;
    let savedParentLevel = taskData?.parent_level || '';
    let savedParentId = taskData?.parent_id || null;

    if (taskData?.note) {
      if (typeof taskData.note === 'string' && taskData.note.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(taskData.note);
          if (parsed.level) curLevel = parsed.level;
          if (parsed.parent_level) savedParentLevel = parsed.parent_level;
          if (parsed.parent_id) savedParentId = parsed.parent_id;
        } catch (e) {}
      } else if (typeof taskData.note === 'string' && taskData.note.includes('Cấp')) {
        curLevel = taskData.note;
      }
    }

    if (!curLevel) {
      curLevel = 'Cấp 2';
    }

    setFormData(prev => ({
      ...prev,
      employee_name: empName,
      employee_id: empId,
      position: pos,
      department: dept,
      factory: fac,
      current_level: curLevel,
      parent_level: savedParentLevel,
      parent_id: savedParentId
    }));

    fetchEmployeeData(empId, empName);
  }, [isOpen, taskData]);

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOpenAddKpiModal = () => {
    setEditingKpiId(null);
    setNewKpiForm({ target: '', threshold: '>= 95%', weight: '30%' });
    setSubModalType('kpi');
  };

  const handleOpenAddChecklistModal = () => {
    setEditingChecklistId(null);
    setNewChecklistForm({ task: '', tracking: 'Hàng ngày' });
    setSubModalType('checklist');
  };

  const handleEditKpi = (item) => {
    setEditingKpiId(item.id);
    setNewKpiForm({
      target: item.target,
      threshold: item.threshold || '>= 95%',
      weight: item.weight || '30%'
    });
    setSubModalType('kpi');
    setActiveMenuId(null);
  };

  const handleDeleteKpi = (item) => {
    setActiveMenuId(null);
    setModalConfirm({
      show: true,
      title: 'Xác nhận xóa mục tiêu KPI',
      text: `Bạn có chắc chắn muốn xóa mục tiêu KPI "${item.target}" khỏi hệ thống?`,
      onConfirm: async () => {
        setKpiList(prev => prev.filter(k => k.id !== item.id));
        const dbId = item.db_id || (typeof item.id === 'number' && item.id < 1000000000 ? item.id : null);
        if (dbId) {
          try {
            await api.delete(`/kpi-management/employee-items/${dbId}`);
          } catch (err) {}
        }
        if (toastContext?.toast) toastContext.toast('success', 'Đã xóa mục tiêu KPI thành công.');
      }
    });
  };

  const handleEditChecklist = (item) => {
    setEditingChecklistId(item.id);
    setNewChecklistForm({
      task: item.task,
      tracking: item.tracking || 'Hàng ngày'
    });
    setSubModalType('checklist');
    setActiveMenuId(null);
  };

  const handleDeleteChecklist = (item) => {
    setActiveMenuId(null);
    setModalConfirm({
      show: true,
      title: 'Xác nhận xóa Nhiệm vụ Checklist',
      text: `Bạn có chắc chắn muốn xóa nhiệm vụ "${item.task}" khỏi danh sách?`,
      onConfirm: async () => {
        setChecklist(prev => prev.filter(c => c.id !== item.id));
        const dbId = item.db_id || (typeof item.id === 'number' && item.id < 1000000000 ? item.id : null);
        if (dbId) {
          try {
            await api.delete(`/kpi-management/checklists/${dbId}`);
          } catch (err) {}
        }
        if (toastContext?.toast) toastContext.toast('success', 'Đã xóa nhiệm vụ Checklist thành công.');
      }
    });
  };

  const handleSaveKpi = async (e) => {
    if (e) e.preventDefault();
    if (!newKpiForm.target) return;
    const empId = formData.employee_id || taskData?.employee_id;

    // Kiểm tra tổng trọng số không được vượt quá 100%
    const inputWeight = parseFloat(String(newKpiForm.weight).replace('%', '')) || 0;
    const currentTotalWeight = kpiList
      .filter(k => k.id !== editingKpiId)
      .reduce((sum, item) => sum + (parseFloat(String(item.weight).replace('%', '')) || 0), 0);

    if (currentTotalWeight + inputWeight > 100) {
      const warningText = `Tổng trọng số KPI không được vượt quá 100%! (Hiện tại đã có ${currentTotalWeight}%, bạn nhập thêm ${inputWeight}% sẽ là ${currentTotalWeight + inputWeight}%)`;
      if (toastContext?.toast) {
        toastContext.toast('warning', warningText);
      }
      setModalAlert({
        show: true,
        type: 'warning',
        title: 'Cảnh báo Trọng số KPI',
        text: warningText
      });
      return;
    }

    if (editingKpiId) {
      // Chế độ Sửa (Edit)
      setKpiList(prev => prev.map(k => {
        if (k.id === editingKpiId) {
          return {
            ...k,
            target: newKpiForm.target,
            threshold: newKpiForm.threshold || '>= 95%',
            weight: newKpiForm.weight.includes('%') ? newKpiForm.weight : `${newKpiForm.weight}%`
          };
        }
        return k;
      }));

      const targetItem = kpiList.find(k => k.id === editingKpiId);
      const dbId = targetItem?.db_id || (typeof editingKpiId === 'number' && editingKpiId < 1000000000 ? editingKpiId : null);
      if (dbId) {
        try {
          await api.put(`/kpi-management/employee-items/${dbId}`, {
            kpi_code: targetItem?.kpi_code || `KPI_${dbId}`,
            content: newKpiForm.target,
            score: parseInt(newKpiForm.weight) || 30,
            calc_method: newKpiForm.weight,
            target: newKpiForm.threshold,
            actual: targetItem?.actual || '95%',
            status: 'Đang theo dõi'
          });
        } catch (err) {}
      }
      setEditingKpiId(null);
    } else {
      // Chế độ Thêm mới
      let isSaved = false;
      let dbId = null;
      if (empId) {
        try {
          const res = await api.post('/kpi-management/employee-items', {
            employee_id: empId,
            kpi_code: `KPI_${Date.now()}`,
            content: newKpiForm.target,
            score: parseInt(newKpiForm.weight) || 30,
            calc_method: newKpiForm.weight,
            target: newKpiForm.threshold,
            actual: '95%',
            status: 'Đang theo dõi'
          });
          if (res?.id) dbId = res.id;
          isSaved = true;
        } catch (err) {}
      }

      const newItem = {
        id: dbId || Date.now(),
        db_id: dbId,
        target: newKpiForm.target,
        threshold: newKpiForm.threshold || '>= 95%',
        actual: '95%',
        weight: newKpiForm.weight.includes('%') ? newKpiForm.weight : `${newKpiForm.weight}%`,
        _isUnsaved: !isSaved
      };
      setKpiList(prev => {
        if (prev.some(k => (k.target || k.content) === newItem.target)) return prev;
        return [...prev, newItem];
      });
    }

    setSubModalType(null);
  };

  const handleSaveChecklist = async (e) => {
    if (e) e.preventDefault();
    if (!newChecklistForm.task) return;
    const empId = formData.employee_id || taskData?.employee_id;

    if (editingChecklistId) {
      // Chế độ Sửa (Edit)
      setChecklist(prev => prev.map(c => {
        if (c.id === editingChecklistId) {
          return {
            ...c,
            task: newChecklistForm.task,
            tracking: newChecklistForm.tracking || 'Hàng ngày'
          };
        }
        return c;
      }));

      const targetItem = checklist.find(c => c.id === editingChecklistId);
      const dbId = targetItem?.db_id || (typeof editingChecklistId === 'number' && editingChecklistId < 1000000000 ? editingChecklistId : null);
      if (dbId) {
        try {
          await api.put(`/kpi-management/checklists/${dbId}`, {
            task_code: targetItem?.task_code || `CV_${dbId}`,
            content: newChecklistForm.task,
            frequency: newChecklistForm.tracking,
            status_today: targetItem?.status || 'Đang thực hiện',
            perform_count: 1,
            last_performed: new Date().toISOString().split('T')[0],
            result: targetItem?.note || 'Đạt yêu cầu'
          });
        } catch (err) {}
      }
      setEditingChecklistId(null);
    } else {
      // Chế độ Thêm mới
      let isSaved = false;
      let dbId = null;
      if (empId) {
        try {
          const res = await api.post('/kpi-management/checklists', {
            employee_id: empId,
            task_code: `CV_${Date.now()}`,
            content: newChecklistForm.task,
            frequency: newChecklistForm.tracking,
            status_today: 'Đang thực hiện',
            perform_count: 1,
            last_performed: new Date().toISOString().split('T')[0],
            result: 'Đạt yêu cầu'
          });
          if (res?.id) dbId = res.id;
          isSaved = true;
        } catch (err) {}
      }

      const newItem = {
        id: dbId || Date.now(),
        db_id: dbId,
        task: newChecklistForm.task,
        tracking: newChecklistForm.tracking || 'Hàng ngày',
        status: 'Đang thực hiện',
        note: 'Đạt yêu cầu',
        _isUnsaved: !isSaved
      };
      setChecklist(prev => {
        if (prev.some(c => (c.task || c.content) === newItem.task)) return prev;
        return [...prev, newItem];
      });
    }

    setSubModalType(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const empName = formData.employee_name;
    const empId = formData.employee_id || `NV_${Date.now()}`;
    const pos = formData.position || 'Nhân viên QC';
    const dept = formData.department || 'Phòng QA/QC';
    const fac = formData.factory || 'Nhà máy 1 (NM1)';

    const notePayload = JSON.stringify({
      level: formData.current_level || 'Cấp 2',
      parent_level: formData.parent_level || '',
      parent_id: formData.parent_id || ''
    });

    try {
      // 1. Lưu/Cập nhật nhân sự vào cơ sở dữ liệu backend
      await api.post('/quality-employees/', {
        employee_id: empId,
        full_name: empName,
        department: dept,
        stage: pos,
        factory: fac,
        note: notePayload,
        latest_rating: 'A'
      }).catch(async () => {
        // Nếu mã nhân sự đã tồn tại, tìm ID và gọi PUT để cập nhật
        const res = await api.get('/quality-employees/?size=1000').catch(() => null);
        const items = res?.items || (Array.isArray(res) ? res : []);
        const found = items.find(i => i.employee_id === empId || i.full_name === empName);
        if (found && found.id) {
          await api.put(`/quality-employees/${found.id}`, {
            full_name: empName,
            department: dept,
            stage: pos,
            factory: fac,
            note: notePayload
          }).catch(() => null);
        }
      });

      // 2. Lưu các mục KPI mới chưa từng lưu vào DB
      if (kpiList && kpiList.length > 0) {
        for (const kpi of kpiList) {
          if (kpi._isUnsaved) {
            await api.post('/kpi-management/employee-items', {
              employee_id: empId,
              kpi_code: `KPI_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              content: kpi.target || kpi.content,
              score: parseInt(kpi.weight) || 30,
              calc_method: kpi.weight || '30%',
              target: kpi.threshold || '>= 95%',
              actual: kpi.actual || '95%',
              status: 'Đang theo dõi'
            }).catch(() => null);
          }
        }
      }

      // 3. Lưu các mục Checklist mới chưa từng lưu vào DB
      if (checklist && checklist.length > 0) {
        for (const item of checklist) {
          if (item._isUnsaved) {
            await api.post('/kpi-management/checklists', {
              employee_id: empId,
              task_code: `CV_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              content: item.task || item.content,
              frequency: item.tracking || 'Hàng ngày',
              status_today: item.status || 'Đang thực hiện',
              perform_count: 1,
              last_performed: new Date().toISOString().split('T')[0],
              result: item.note || 'Đạt yêu cầu'
            }).catch(() => null);
          }
        }
      }
    } catch (err) {
      console.error('Lỗi khi lưu thông tin nhân sự:', err);
    }

    if (onSave) {
      onSave({ formData, kpiList, checklist, managerEvaluations, violations });
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(3px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px',
      boxSizing: 'border-box'
    }} onClick={onClose}>
      
      <div style={{
        margin: 'auto',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        width: '94vw',
        maxWidth: '1150px',
        maxHeight: '96vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header Modal Exactly Matching Mockup Image 5 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          borderBottom: '1px solid #E2E8F0',
          flexShrink: 0
        }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0F172A', fontWeight: '800' }}>
            CL03.2: Thông tin nhân sự
          </h3>
          <button 
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#0F172A',
              padding: '2px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body - Compacted Spacing while Preserving 100% Mockup Grid */}
        <form onSubmit={handleSubmit} style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
          
          {/* Row 1: Tên sơ đồ * */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
              Tên sơ đồ <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <select
              value={formData.schema_name}
              onChange={(e) => handleInputChange('schema_name', e.target.value)}
              style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#FFFFFF', fontWeight: '600', color: '#1E293B' }}
              required
            >
              <option value="Sơ đồ chốt chặn">Sơ đồ chốt chặn</option>
              <option value="Sơ đồ bố trí">Sơ đồ bố trí</option>
            </select>
          </div>

          {/* Row 2: Cấp hiện tại | Cấp trên * | Nhà máy */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                Cấp hiện tại
              </label>
              <select
                value={formData.current_level}
                onChange={(e) => handleInputChange('current_level', e.target.value)}
                style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
              >
                <option value="Cấp 1">Cấp 1</option>
                <option value="Cấp 2">Cấp 2</option>
                <option value="Cấp 3">Cấp 3</option>
                <option value="Cấp 4">Cấp 4</option>
                <option value="Cấp 5">Cấp 5</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                Cấp trên <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="text"
                  value={formData.parent_level}
                  onChange={(e) => handleInputChange('parent_level', e.target.value)}
                  onClick={(e) => { e.stopPropagation(); setSubModalType('parent'); }}
                  placeholder="Bấm chọn cấp trên..."
                  style={{ flex: 1, padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSubModalType('parent'); }}
                  style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', backgroundColor: '#4A2E2B', color: '#FFFFFF', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Chọn
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                Nhà máy
              </label>
              <select
                value={formData.factory}
                onChange={(e) => handleInputChange('factory', e.target.value)}
                style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#FFFFFF' }}
              >
                <option value="Nhà máy 1 (NM1)">Nhà máy 1 (NM1)</option>
                <option value="Nhà máy 2 (NM2)">Nhà máy 2 (NM2)</option>
                <option value="Nhà máy 3 (NM3)">Nhà máy 3 (NM3)</option>
                <option value="Khối Văn Phòng">Khối Văn Phòng</option>
              </select>
            </div>
          </div>

          {/* Row 3: Chọn nhân sự * | Vị trí * (ăn theo NV) | Bộ phận * (ăn theo NV) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                Chọn nhân sự <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                value={formData.employee_name}
                onChange={(e) => {
                  const selectedName = e.target.value;
                  handleInputChange('employee_name', selectedName);
                  const found = employeeOptions.find(emp => emp.full_name === selectedName || emp.name === selectedName);
                  if (found) {
                    const empId = found.employee_id || `NV_${found.id}`;
                    const pos = found.stage || found.position_name || found.position || 'Nhân viên QC';
                    const dept = found.department || found.section_name || found.department_name || 'Phòng QA/QC';
                    const fac = found.factory || found.factory_name || 'Nhà máy 1 (NM1)';
                    setFormData(prev => ({
                      ...prev,
                      employee_name: selectedName,
                      employee_id: empId,
                      position: pos,
                      department: dept,
                      factory: fac
                    }));
                    fetchEmployeeData(empId, selectedName);
                  }
                }}
                style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
              >
                {employeeOptions.map(emp => (
                  <option key={emp.id || emp.full_name} value={emp.full_name || emp.name}>
                    {emp.full_name || emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                Vị trí <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
                style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                Bộ phận <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Row 4: Exact 3-Column Layout of Image 5 (Col 1: Tháng & Level, Col 2: Tháng trước 120, Col 3: Hiện tại 40) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', alignItems: 'stretch' }}>
            
            {/* Left Col: Chọn tháng * & Level: */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                  Chọn tháng <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  value={formData.selected_month}
                  onChange={(e) => handleInputChange('selected_month', e.target.value)}
                  style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="Tháng 8">Tháng 8</option>
                  <option value="Tháng 7">Tháng 7</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                  Level:
                </label>
                <input
                  type="text"
                  value={formData.level_code}
                  readOnly
                  style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#EFEFEF', fontSize: '0.8rem', color: '#64748B', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Middle Col: Score Box Tháng trước (120) */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                Tháng trước
              </div>
              <div style={{
                flex: 1,
                backgroundColor: '#EFEFEF',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
              }}>
                <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#1E293B', lineHeight: '1' }}>
                  {formData.score_prev_month}
                </span>
              </div>
            </div>

            {/* Right Col: Score Box Hiện tại (40) */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                Hiện tại
              </div>
              <div style={{
                flex: 1,
                backgroundColor: '#EFEFEF',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
              }}>
                <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#EA580C', lineHeight: '1' }}>
                  {formData.score_current}
                </span>
              </div>
            </div>

          </div>

          {/* Row 5: Ghi chú */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
              Ghi chú
            </label>
            <input
              type="text"
              value={formData.note}
              onChange={(e) => handleInputChange('note', e.target.value)}
              style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Row 6: Dynamic Calculated Scores (Tháng hiển thị * | Điểm tổng | KPI | QLĐG | Vi phạm) */}
          {(() => {
            const calculatedViolationScore = violations.reduce((sum, item) => {
              const pt = parseInt(String(item.point).replace('+', '')) || 0;
              return sum + pt;
            }, 0);

            const calculatedQldgScore = managerEvaluations.reduce((sum, item) => {
              const pt = parseInt(String(item.total_point).replace('+', '')) || 0;
              return sum + pt;
            }, 0);

            const rawKpiScore = kpiList.length > 0 
              ? Math.round(kpiList.reduce((sum, item) => sum + (parseFloat(String(item.actual).replace('%', '')) || 95), 0) / kpiList.length)
              : 95;

            // KPI score max 100%
            const calculatedKpiScore = Math.min(100, Math.max(0, rawKpiScore));

            // Điểm tổng max 100%
            const calculatedTotalScore = Math.min(100, Math.max(0, Math.round(calculatedKpiScore + calculatedQldgScore + calculatedViolationScore)));

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                    Tháng hiển thị <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <select
                    value={formData.selected_month || 'Tháng 8'}
                    onChange={(e) => handleInputChange('selected_month', e.target.value)}
                    style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                  >
                    <option value="Tháng 1">Tháng 1</option>
                    <option value="Tháng 8">Tháng 8</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                    Điểm tổng
                  </label>
                  <input
                    type="text"
                    value={calculatedTotalScore}
                    readOnly
                    style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#EFEFEF', fontSize: '0.8rem', color: '#1E293B', fontWeight: '800', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                    KPI
                  </label>
                  <input
                    type="text"
                    value={calculatedKpiScore}
                    readOnly
                    style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#EFEFEF', fontSize: '0.8rem', color: '#64748B', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                    QLĐG
                  </label>
                  <input
                    type="text"
                    value={calculatedQldgScore >= 0 ? `+${calculatedQldgScore}` : calculatedQldgScore}
                    readOnly
                    style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#EFEFEF', fontSize: '0.8rem', color: '#64748B', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                    Vi phạm
                  </label>
                  <input
                    type="text"
                    value={calculatedViolationScore}
                    readOnly
                    style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#EFEFEF', fontSize: '0.8rem', color: calculatedViolationScore < 0 ? '#DC2626' : '#64748B', fontWeight: '800', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            );
          })()}

          {/* 4 DETAIL TABS EXACTLY MATCHING IMAGE 5 */}
          <div style={{ marginTop: '6px' }}>
            
            {/* Tab Headers */}
            <div style={{
              display: 'flex',
              gap: '20px',
              borderBottom: '2px solid #E2E8F0',
              marginBottom: '8px'
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('kpi')}
                style={{
                  padding: '5px 0',
                  border: 'none',
                  background: 'none',
                  fontWeight: activeTab === 'kpi' ? '800' : '600',
                  fontSize: '0.82rem',
                  color: activeTab === 'kpi' ? '#4A2E2B' : '#64748B',
                  borderBottom: activeTab === 'kpi' ? '3px solid #4A2E2B' : '3px solid transparent',
                  cursor: 'pointer',
                  marginBottom: '-2px'
                }}
              >
                KPI
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('checklist')}
                style={{
                  padding: '5px 0',
                  border: 'none',
                  background: 'none',
                  fontWeight: activeTab === 'checklist' ? '800' : '600',
                  fontSize: '0.82rem',
                  color: activeTab === 'checklist' ? '#4A2E2B' : '#64748B',
                  borderBottom: activeTab === 'checklist' ? '3px solid #4A2E2B' : '3px solid transparent',
                  cursor: 'pointer',
                  marginBottom: '-2px'
                }}
              >
                Checklist công việc
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('manager_evaluation')}
                style={{
                  padding: '5px 0',
                  border: 'none',
                  background: 'none',
                  fontWeight: activeTab === 'manager_evaluation' ? '800' : '600',
                  fontSize: '0.82rem',
                  color: activeTab === 'manager_evaluation' ? '#4A2E2B' : '#64748B',
                  borderBottom: activeTab === 'manager_evaluation' ? '3px solid #4A2E2B' : '3px solid transparent',
                  cursor: 'pointer',
                  marginBottom: '-2px'
                }}
              >
                Đánh giá từ quản lý
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('violations')}
                style={{
                  padding: '5px 0',
                  border: 'none',
                  background: 'none',
                  fontWeight: activeTab === 'violations' ? '800' : '600',
                  fontSize: '0.82rem',
                  color: activeTab === 'violations' ? '#4A2E2B' : '#64748B',
                  borderBottom: activeTab === 'violations' ? '3px solid #4A2E2B' : '3px solid transparent',
                  cursor: 'pointer',
                  marginBottom: '-2px'
                }}
              >
                Điểm vi phạm
              </button>
            </div>

            {/* TAB 1: KPI TABLE */}
            {activeTab === 'kpi' && (
              <div>
                <div style={{ border: '1px solid #CBD5E1', borderRadius: '6px', overflow: 'visible' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#7B5233', color: '#FFFFFF', textAlign: 'left' }}>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '50px' }}>STT</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700' }}>Mục tiêu KPI</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '150px' }}>Ngưỡng chấp nhận</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '150px' }}>Kết quả hiện tại</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '90px', textAlign: 'center' }}>Trọng số</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '90px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpiList.map((item, idx) => (
                        <tr key={item.id} style={{ borderTop: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '6px 10px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 10px', color: '#1E293B', fontWeight: '700' }}>{item.target}</td>
                          <td style={{ padding: '6px 10px', color: '#475569' }}>{item.threshold}</td>
                          <td style={{ padding: '6px 10px', color: '#15803D', fontWeight: '800' }}>{item.actual}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: '700', color: '#5D3B32' }}>{item.weight}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                title="Chỉnh sửa"
                                onClick={() => handleEditKpi(item)}
                                style={{ border: 'none', background: '#EFF6FF', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', color: '#2563EB' }}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                title="Xóa"
                                onClick={() => handleDeleteKpi(item)}
                                style={{ border: 'none', background: '#FEF2F2', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', color: '#DC2626' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Action Row: Left: + Thêm mục tiêu KPI, Right: Hủy bỏ & Xác nhận */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={handleOpenAddKpiModal}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: 'none', color: '#7B5233', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    <Plus size={15} /> Thêm mục tiêu KPI
                  </button>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={onClose}
                      style={{
                        padding: '6px 20px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        backgroundColor: '#FFFFFF',
                        color: '#334155',
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '6px 24px',
                        border: 'none',
                        borderRadius: '6px',
                        backgroundColor: '#4A2E2B',
                        color: '#FFFFFF',
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Xác nhận
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: CHECKLIST CÔNG VIỆC TABLE */}
            {activeTab === 'checklist' && (
              <div>
                <div style={{ border: '1px solid #CBD5E1', borderRadius: '6px', overflow: 'visible' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#7B5233', color: '#FFFFFF', textAlign: 'left' }}>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '50px' }}>STT</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700' }}>Nhiệm Vụ</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '130px' }}>Cách theo dõi</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '110px' }}>Trạng thái</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '150px' }}>Ghi chú</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '90px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checklist.map((item, idx) => (
                        <tr key={item.id} style={{ borderTop: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '6px 10px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 10px', color: '#1E293B', fontWeight: '700' }}>{item.task}</td>
                          <td style={{ padding: '6px 10px', color: '#475569' }}>{item.tracking}</td>
                          <td style={{ padding: '6px 10px', color: '#15803D', fontWeight: '700' }}>{item.status}</td>
                          <td style={{ padding: '6px 10px', color: '#64748B' }}>{item.note}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                title="Chỉnh sửa"
                                onClick={() => handleEditChecklist(item)}
                                style={{ border: 'none', background: '#EFF6FF', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', color: '#2563EB' }}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                title="Xóa"
                                onClick={() => handleDeleteChecklist(item)}
                                style={{ border: 'none', background: '#FEF2F2', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', color: '#DC2626' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={handleOpenAddChecklistModal}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: 'none', color: '#7B5233', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    <Plus size={15} /> Thêm công việc
                  </button>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={onClose} style={{ padding: '6px 20px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#334155', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>Hủy bỏ</button>
                    <button type="submit" style={{ padding: '6px 24px', border: 'none', borderRadius: '6px', backgroundColor: '#4A2E2B', color: '#FFFFFF', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>Xác nhận</button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ĐÁNH GIÁ TỪ QUẢN LÝ TABLE */}
            {activeTab === 'manager_evaluation' && (
              <div>
                <div style={{ border: '1px solid #CBD5E1', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#7B5233', color: '#FFFFFF', textAlign: 'left' }}>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '45px' }}>STT</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '110px' }}>Thời gian đánh giá</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700' }}>Thành tích nổi bật</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700' }}>Hạn chế/ Khó khăn</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700' }}>Kế hoạch cải tiến</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700' }}>Đề xuất kiến nghị</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '80px', textAlign: 'center' }}>Tổng điểm</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '70px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managerEvaluations.length > 0 ? (
                        managerEvaluations.map((item, idx) => (
                          <tr key={item.id} style={{ borderTop: '1px solid #E2E8F0' }}>
                            <td style={{ padding: '6px 10px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                            <td style={{ padding: '6px 10px', color: '#475569' }}>{item.time}</td>
                            <td style={{ padding: '6px 10px', color: '#15803D', fontWeight: '600' }}>{item.achievement}</td>
                            <td style={{ padding: '6px 10px', color: '#DC2626' }}>{item.difficulty}</td>
                            <td style={{ padding: '6px 10px', color: '#1E293B' }}>{item.plan}</td>
                            <td style={{ padding: '6px 10px', color: '#475569' }}>{item.proposal}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: '800', color: '#15803D' }}>{item.total_point}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'center', color: '#94A3B8' }}>
                              <MoreHorizontal size={15} style={{ cursor: 'pointer' }} />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} style={{ padding: '16px', textAlign: 'center', color: '#94A3B8' }}>
                            Không tìm thấy bản ghi Đánh giá từ Quản lý cho nhân sự này trong Database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={onClose} style={{ padding: '6px 20px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#334155', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>Hủy bỏ</button>
                    <button type="submit" style={{ padding: '6px 24px', border: 'none', borderRadius: '6px', backgroundColor: '#4A2E2B', color: '#FFFFFF', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>Xác nhận</button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ĐIỂM VI PHẠM TABLE */}
            {activeTab === 'violations' && (
              <div>
                <div style={{ border: '1px solid #CBD5E1', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#7B5233', color: '#FFFFFF', textAlign: 'left' }}>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '45px' }}>STT</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '120px' }}>Thời gian Ghi nhận</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '120px' }}>Loại vi phạm</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700' }}>Mô tả</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '80px' }}>Hình ảnh</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '120px' }}>Người ghi nhận</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '70px', textAlign: 'center' }}>Điểm</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '70px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {violations.length > 0 ? (
                        violations.map((item, idx) => (
                          <tr key={item.id} style={{ borderTop: '1px solid #E2E8F0' }}>
                            <td style={{ padding: '6px 10px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                            <td style={{ padding: '6px 10px', color: '#475569' }}>{item.time}</td>
                            <td style={{ padding: '6px 10px', fontWeight: '700', color: '#DC2626' }}>{item.type}</td>
                            <td style={{ padding: '6px 10px', color: '#1E293B' }}>{item.description}</td>
                            <td style={{ padding: '6px 10px', color: '#2563EB', cursor: 'pointer' }}>{item.image}</td>
                            <td style={{ padding: '6px 10px', color: '#475569' }}>{item.reporter}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: '800', color: '#DC2626' }}>{item.point}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'center', color: '#94A3B8' }}>
                              <MoreHorizontal size={15} style={{ cursor: 'pointer' }} />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} style={{ padding: '16px', textAlign: 'center', color: '#94A3B8' }}>
                            Không tìm thấy ghi nhận Điểm vi phạm từ ứng dụng Mobile App cho nhân sự này trong Database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={onClose} style={{ padding: '6px 20px', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#334155', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>Hủy bỏ</button>
                    <button type="submit" style={{ padding: '6px 24px', border: 'none', borderRadius: '6px', backgroundColor: '#4A2E2B', color: '#FFFFFF', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>Xác nhận</button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </form>
      </div>

      {/* CUSTOM REACT POPUP DIALOG FOR ADDING KPI OR CHECKLIST */}
      {subModalType && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setSubModalType(null);
          }}
          style={{
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
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            width: '420px',
            maxWidth: '90%',
            padding: '20px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            {subModalType === 'parent' && (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#1E293B', marginBottom: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Chọn Cấp Trên Quản Lý</span>
                  <button type="button" onClick={() => setSubModalType(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B', fontWeight: '700' }}>✕</button>
                </h3>
                <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  {(() => {
                    const currentLevel = (formData.current_level || 'Cấp 2').toLowerCase();
                    const filtered = employeeOptions.filter(e => {
                      const pos = (e.position_name || e.position || e.stage || '').toLowerCase();
                      const lvl = (e.current_level || (e.note && e.note.includes('Cấp') ? e.note : '')).toLowerCase();

                      if (currentLevel.includes('cấp 1')) {
                        // Chọn Cấp 1 -> Cấp trên gồm Ban Giám Đốc / Ban Quản Trị (Cấp 1)
                        return pos.includes('giám đốc') || lvl.includes('cấp 1');
                      } else if (currentLevel.includes('cấp 2')) {
                        // Chọn Cấp 2 -> Cấp trên hiển thị nhân sự Cấp 1
                        return lvl.includes('cấp 1') || pos.includes('giám đốc');
                      } else if (currentLevel.includes('cấp 3')) {
                        // Chọn Cấp 3 -> Cấp trên hiển thị nhân sự Cấp 2 (hoặc Cấp 1)
                        return lvl.includes('cấp 2') || lvl.includes('cấp 1') || pos.includes('trưởng');
                      } else if (currentLevel.includes('cấp 4')) {
                        // Chọn Cấp 4 -> Cấp trên hiển thị nhân sự Cấp 3 (hoặc Cấp 2)
                        return lvl.includes('cấp 3') || lvl.includes('cấp 2') || pos.includes('phó');
                      } else {
                        // Chọn Cấp 5 -> Cấp trên hiển thị nhân sự Cấp 4 (hoặc Cấp 3/2)
                        return lvl.includes('cấp 4') || lvl.includes('cấp 3') || pos.includes('tổ') || pos.includes('giám sát') || pos.includes('lead');
                      }
                    });
                    const listToDisplay = filtered.length > 0 ? filtered : employeeOptions;
                    return listToDisplay.map(e => ({
                      id: e.id,
                      employee_id: e.employee_id || `NV_${e.id}`,
                      name: e.full_name,
                      title: `${e.full_name} - ${e.position_name || 'Cấp Quản lý'}`,
                      desc: `Mã NV: ${e.employee_id || e.id} | ${e.department_name || e.section_name || 'Phòng QLCL'}`,
                      badge: e.current_level ? e.current_level.toUpperCase() : (e.position_name || 'Cấp 1')
                    }));
                  })().map((item, idx) => (
                    <div
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInputChange('parent_level', item.name || item.title);
                        setFormData(prev => ({ ...prev, parent_id: item.employee_id || item.id }));
                        setSubModalType(null);
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#F8FAFC',
                        cursor: 'pointer',
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#4A2E2B';
                        e.currentTarget.style.backgroundColor = '#FAF6F0';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#E2E8F0';
                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1E293B' }}>{item.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{item.desc}</div>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#E2E8F0', color: '#334155' }}>
                        {item.badge}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setSubModalType(null)}
                    style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}

            {subModalType === 'kpi' && (
              <form onSubmit={handleSaveKpi}>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#1E293B', marginBottom: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{editingKpiId ? 'Chỉnh Sửa Mục Tiêu KPI' : 'Thêm Mục Tiêu KPI Mới'}</span>
                  <button type="button" onClick={() => setSubModalType(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B', fontWeight: '700' }}>✕</button>
                </h3>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#4A2E2B', marginBottom: '4px' }}>
                    📌 Chọn từ Thư viện KPI trong Database:
                  </label>
                  <select
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const found = kpiPool.find(k => String(k.id) === selectedId);
                      if (found) {
                        setNewKpiForm({
                          target: found.content,
                          threshold: found.target || '>= 95%',
                          weight: '25%'
                        });
                      }
                    }}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #4A2E2B', backgroundColor: '#FAF6F0', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', fontWeight: '600' }}
                  >
                    <option value="">-- Bấm để chọn danh mục KPI mẫu từ DB --</option>
                    {kpiPool.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.content} (Target: {item.target})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Tên mục tiêu KPI <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Tỷ lệ tuân thủ quy trình QC..."
                    value={newKpiForm.target}
                    onChange={(e) => setNewKpiForm(prev => ({ ...prev, target: e.target.value }))}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      Ngưỡng chấp nhận
                    </label>
                    <input
                      type="text"
                      placeholder="VD: >= 95%"
                      value={newKpiForm.threshold}
                      onChange={(e) => setNewKpiForm(prev => ({ ...prev, threshold: e.target.value }))}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      Trọng số (%)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: 30%"
                      value={newKpiForm.weight}
                      onChange={(e) => setNewKpiForm(prev => ({ ...prev, weight: e.target.value }))}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSubModalType(null)}
                    style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '6px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#4A2E2B', color: '#FFFFFF', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Xác nhận
                  </button>
                </div>
              </form>
            )}

            {subModalType === 'checklist' && (
              <form onSubmit={handleSaveChecklist}>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#1E293B', marginBottom: '12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{editingChecklistId ? 'Chỉnh Sửa Nhiệm Vụ Checklist' : 'Thêm Nhiệm Vụ Checklist Mới'}</span>
                  <button type="button" onClick={() => setSubModalType(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B', fontWeight: '700' }}>✕</button>
                </h3>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#4A2E2B', marginBottom: '4px' }}>
                    📌 Chọn từ Thư viện Checklist trong Database:
                  </label>
                  <select
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const found = checklistPool.find(c => String(c.id) === selectedId);
                      if (found) {
                        setNewChecklistForm({
                          task: found.content,
                          tracking: found.frequency || 'Hàng ngày'
                        });
                      }
                    }}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #4A2E2B', backgroundColor: '#FAF6F0', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', fontWeight: '600' }}
                  >
                    <option value="">-- Bấm để chọn nhiệm vụ Checklist mẫu từ DB --</option>
                    {checklistPool.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.content} ({item.frequency})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Tên nhiệm vụ Checklist <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Kiểm tra thông số thiết bị đầu ca..."
                    value={newChecklistForm.task}
                    onChange={(e) => setNewChecklistForm(prev => ({ ...prev, task: e.target.value }))}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Cách theo dõi
                  </label>
                  <select
                    value={newChecklistForm.tracking}
                    onChange={(e) => setNewChecklistForm(prev => ({ ...prev, tracking: e.target.value }))}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                  >
                    <option value="Hàng ngày">Hàng ngày</option>
                    <option value="Theo ca">Theo ca</option>
                    <option value="Hàng tuần">Hàng tuần</option>
                    <option value="Hàng tháng">Hàng tháng</option>
                    <option value="Khi phát sinh">Khi phát sinh</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSubModalType(null)}
                    style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '6px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#4A2E2B', color: '#FFFFFF', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Xác nhận
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Custom Popup Alert Modal */}
      {modalAlert.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 3500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} onClick={() => setModalAlert(prev => ({ ...prev, show: false }))}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #E2E8F0'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
              backgroundColor: modalAlert.type === 'error' ? '#FEF2F2' : '#FFFBEB',
              color: modalAlert.type === 'error' ? '#DC2626' : '#D97706'
            }}>
              <AlertTriangle size={28} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: '800', color: '#1E293B' }}>
              {modalAlert.title || 'Thông báo hệ thống'}
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>
              {modalAlert.text}
            </p>
            <button
              type="button"
              onClick={() => setModalAlert(prev => ({ ...prev, show: false }))}
              style={{
                width: '100%',
                padding: '10px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#4A2E2B',
                color: '#FFFFFF',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* Custom Popup Confirmation Modal */}
      {modalConfirm.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 3500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} onClick={() => setModalConfirm(prev => ({ ...prev, show: false }))}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #E2E8F0'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
              backgroundColor: '#FEF2F2',
              color: '#DC2626'
            }}>
              <AlertTriangle size={28} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: '800', color: '#1E293B' }}>
              {modalConfirm.title}
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>
              {modalConfirm.text}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setModalConfirm(prev => ({ ...prev, show: false }))}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  setModalConfirm(prev => ({ ...prev, show: false }));
                  if (modalConfirm.onConfirm) await modalConfirm.onConfirm();
                }}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KPITaskDetailModal;
