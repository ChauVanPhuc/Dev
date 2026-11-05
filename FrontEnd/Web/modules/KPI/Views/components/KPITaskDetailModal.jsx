import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, MoreHorizontal, Edit2, Trash2, AlertTriangle, CheckCircle2, Image as ImageIcon, FileText, Search, RotateCcw, Sliders } from 'lucide-react';
import api, { getFullImageUrl } from '@webShared/Services/api.service';
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
    selected_month: data.selected_month || `Tháng ${new Date().getMonth() + 1}`,
    score_prev_month: data.score_prev_month || 120,
    score_current: data.score_current || 40,
    level_code: data.level_code || 'LV-02',
    note: typeof data.note === 'string' && data.note.trim().startsWith('{') ? '' : (data.note || ''),
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
  const [previewImage, setPreviewImage] = useState(null);
  const [imageError, setImageError] = useState(false);

  // Popup Modal States & Sub-modal control state
  const [subModalType, setSubModalType] = useState(null); // 'kpi' | 'checklist' | 'parent'
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingKpiId, setEditingKpiId] = useState(null);
  const [editingChecklistId, setEditingChecklistId] = useState(null);
  const [newKpiForm, setNewKpiForm] = useState({ kpi_code: '', target: '', operator: '≥', thresholdVal: '95', unitSuffix: '%', weightVal: '20', category: 'D', calc_method: '' });
  const [newChecklistForm, setNewChecklistForm] = useState({ task_code: '', task: '', tracking: 'Hàng ngày', evidence_type: 'PHOTO', weight_score: '10' });

  const [kpiPool, setKpiPool] = useState([]);
  const [checklistPool, setChecklistPool] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  // Custom Result Sub-modal States & Handlers
  const [customResultModalOpen, setCustomResultModalOpen] = useState(false);
  const [selectedKpiForCustom, setSelectedKpiForCustom] = useState(null);
  const [customForm, setCustomForm] = useState({
    custom_value: '100',
    custom_actual: '100.0%',
    custom_score: 100,
    reason: ''
  });
  const [customSaving, setCustomSaving] = useState(false);

  // KPI Score Evidence Sub-modal States & Handler
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [evidenceData, setEvidenceData] = useState(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  // Helper kiểm tra Đạt / Chưa đạt giữa Kết quả hiện tại và Ngưỡng chấp nhận
  // Helper làm sạch giá trị Kết quả hiện tại thành 100% định dạng % thuần túy
    const cleanActual = (val, thresholdVal) => {
    const isLess = thresholdVal && String(thresholdVal).includes('<');
    if (!val || String(val).includes('Chưa')) return isLess ? '0.0%' : '100.0%';
    const str = String(val).trim();
    const pctMatch = str.match(/-?\d+(\.\d+)?%/);
    if (pctMatch) return pctMatch[0];
    const numMatch = str.match(/-?\d+(\.\d+)?/);
    if (numMatch) return `${parseFloat(numMatch[0]).toFixed(1)}%`;
    return str;
  };

  const checkKpiStatus = (actualVal, thresholdVal) => {
    const isLess = thresholdVal && String(thresholdVal).includes('<');
    const actRaw = (!actualVal || String(actualVal).includes('Chưa')) ? (isLess ? '0.0%' : '100.0%') : actualVal;
    const actStr = String(actRaw).trim();
    const threshStr = String(thresholdVal || '').trim();

    const actMatch = actStr.match(/-?\d+(\.\d+)?/);
    const actNum = actMatch ? parseFloat(actMatch[0]) : (isLess ? 0.0 : 100.0);

    const threshMatch = threshStr.match(/-?\d+(\.\d+)?/);
    const threshNum = threshMatch ? parseFloat(threshMatch[0]) : null;

    if (threshNum === null) {
      return { isPass: true, isNoData: false, label: 'Đạt', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' };
    }

    let isPass = true;
    if (threshStr.includes('<=')) {
      isPass = actNum <= threshNum;
    } else if (threshStr.includes('<')) {
      isPass = actNum < threshNum;
    } else if (threshStr.includes('>=')) {
      isPass = actNum >= threshNum;
    } else if (threshStr.includes('>')) {
      isPass = actNum > threshNum;
    } else if (threshStr.includes('=')) {
      isPass = Math.abs(actNum - threshNum) < 0.01;
    } else {
      isPass = actNum >= threshNum;
    }

    return isPass
      ? { isPass: true, isNoData: false, label: 'Đạt', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' }
      : { isPass: false, isNoData: false, label: 'Chưa đạt', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
  };

  const handleOpenEvidenceModal = async (kpiItem) => {
    setEvidenceModalOpen(true);
    setEvidenceLoading(true);
    setEvidenceData(null);

    const empId = formData.employee_id || taskData?.employee_id || '';
    const selectedMonthStr = formData.selected_month || 'Tháng 9';
    const monthNum = parseInt(String(selectedMonthStr).replace(/\D/g, '') || '9', 10);
    const kpiCode = kpiItem?.kpi_code || kpiItem?.code || 'KPI07';

    try {
      const resp = await api.get(`/kpi-management/score-evidence?employee_id=${empId}&kpi_code=${kpiCode}&month=${monthNum}&year=2026`);
      setEvidenceData({
        kpi_code: resp?.kpi_code || kpiCode,
        kpi_name: resp?.kpi_name || kpiItem?.target || 'Chỉ số đánh giá',
        target: resp?.target || kpiItem?.threshold || '>= 95%',
        category: resp?.category || kpiItem?.category || 'A',
        calc_method: resp?.calc_method || 'Truy xuất 1:1 từ CSDL SmartFlow',
        summary_text: resp?.summary_text || `Tổng số bản ghi: ${resp?.records?.length || 0}`,
        records: resp?.records || []
      });
    } catch (err) {
      console.error('Lỗi tải bằng chứng KPI:', err);
      setEvidenceData({
        kpi_code: kpiCode,
        kpi_name: kpiItem?.target || 'Chỉ số đánh giá',
        target: kpiItem?.threshold || '>= 95%',
        category: kpiItem?.category || 'A',
        calc_method: 'Lỗi truy xuất CSDL',
        summary_text: 'Không thể tải bản ghi xác thực nguồn.',
        records: []
      });
    } finally {
      setEvidenceLoading(false);
    }
  };

  // Helper trích xuất Tháng từ mọi định dạng ngày (ISO YYYY-MM-DD..., VN DD/MM/YYYY, text...)
  const extractMonthNumber = (dateVal) => {
    if (!dateVal) return null;
    const str = String(dateVal).trim();
    if (!str) return null;

    // 1. Tìm định dạng VN: DD/MM/YYYY hoặc DD.MM.YYYY hoặc DD-MM-YYYY (VD: "10:07 | 03/09/2026" hoặc "03.09.2026")
    const vnMatch = str.match(/(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})/);
    if (vnMatch && vnMatch[2]) {
      const monthNum = parseInt(vnMatch[2], 10);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        return monthNum;
      }
    }

    // 2. Tìm định dạng ISO: YYYY-MM-DD... (VD: "2026-09-03T02:06:52.170000")
    const isoMatch = str.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch && isoMatch[2]) {
      const monthNum = parseInt(isoMatch[2], 10);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        return monthNum;
      }
    }

    // 3. Chuỗi chứa "Tháng X"
    const monthTextMatch = str.match(/Tháng\s*(\d{1,2})/i);
    if (monthTextMatch && monthTextMatch[1]) {
      const monthNum = parseInt(monthTextMatch[1], 10);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        return monthNum;
      }
    }

    // 4. Fallback qua Date Object
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.getMonth() + 1;
    }

    return null;
  };

  // Helper bóc tách thông minh Ngưỡng KPI (Toán tử, Con số, Hậu tố đơn vị)
  const parseTargetStringToComponents = (rawStr) => {
    if (!rawStr) return { operator: '≥', value: '95', unitSuffix: '%' };
    let str = String(rawStr).trim();

    let operator = '≥';
    if (str.includes('>=')) { operator = '≥'; str = str.replace(/>=/g, ''); }
    else if (str.includes('<=')) { operator = '≤'; str = str.replace(/<=/g, ''); }
    else if (str.includes('≥')) { operator = '≥'; str = str.replace(/≥/g, ''); }
    else if (str.includes('≤')) { operator = '≤'; str = str.replace(/≤/g, ''); }
    else if (str.includes('>')) { operator = '>'; str = str.replace(/>/g, ''); }
    else if (str.includes('<')) { operator = '<'; str = str.replace(/</g, ''); }
    else if (str.includes('=')) { operator = '='; str = str.replace(/=/g, ''); }

    let unitSuffix = '%';
    const lower = str.toLowerCase();
    if (lower.includes('báo cáo')) unitSuffix = 'báo cáo';
    else if (lower.includes('biên bản') || lower.includes('capa')) unitSuffix = 'biên bản';
    else if (lower.includes('điểm')) unitSuffix = 'điểm';
    else if (lower.includes('lần') || lower.includes('lượt') || lower.includes('claim')) unitSuffix = 'lần';
    else if (lower.includes('hành động')) unitSuffix = 'hành động';
    else if (lower.includes('%')) unitSuffix = '%';

    let cleanVal = str
      .replace(/báo cáo|biên bản|capa|điểm|lần|lượt|claim|hành động|%/gi, '')
      .replace(/[>=<=≥≤=]/g, '')
      .trim();

    if (!cleanVal) cleanVal = '95';

    return { operator, value: cleanVal, unitSuffix };
  };



  // Tự động quét và tổng hợp danh sách các Tháng có dữ liệu thực tế từ tất cả các nguồn (Vi phạm, Đánh giá, KPI, Checklist)
  const availableMonths = useMemo(() => {
    const monthsSet = new Set();

    (violations || []).forEach(v => {
      const m = extractMonthNumber(v.raw_date || v.time);
      if (m) monthsSet.add(`Tháng ${m}`);
    });

    (managerEvaluations || []).forEach(m => {
      const mon = m.month ? parseInt(m.month, 10) : extractMonthNumber(m.time || m.eval_date || m.created_at);
      if (mon) monthsSet.add(`Tháng ${mon}`);
    });

    (kpiList || []).forEach(k => {
      const mon = k.month ? parseInt(k.month, 10) : extractMonthNumber(k.period || k.created_at);
      if (mon) monthsSet.add(`Tháng ${mon}`);
    });

    (checklist || []).forEach(c => {
      const mon = c.month ? parseInt(c.month, 10) : extractMonthNumber(c.date || c.created_at);
      if (mon) monthsSet.add(`Tháng ${mon}`);
    });

    // Luôn bổ sung Tháng hiện tại (VD: Tháng 9)
    const currentMonthNum = new Date().getMonth() + 1;
    monthsSet.add(`Tháng ${currentMonthNum}`);

    return Array.from(monthsSet).sort((a, b) => {
      const mA = parseInt(a.replace('Tháng ', ''), 10) || 0;
      const mB = parseInt(b.replace('Tháng ', ''), 10) || 0;
      return mB - mA;
    });
  }, [violations, managerEvaluations, kpiList, checklist]);

  // Xác định số tháng đang được chọn
  const selectedMonthNum = useMemo(() => {
    const str = formData.selected_month || availableMonths[0] || 'Tháng 9';
    return parseInt(str.replace('Tháng ', ''), 10) || (new Date().getMonth() + 1);
  }, [formData.selected_month, availableMonths]);

  // Lọc dữ liệu vi phạm của riêng tháng đang chọn
  const filteredViolationsByMonth = useMemo(() => {
    if (!violations || violations.length === 0) return [];
    return violations.filter(v => {
      const m = extractMonthNumber(v.raw_date || v.time);
      if (!m) return true;
      return m === selectedMonthNum;
    });
  }, [violations, selectedMonthNum]);

  // Lọc dữ liệu Đánh giá từ quản lý của riêng tháng đang chọn
  const filteredManagerEvalsByMonth = useMemo(() => {
    if (!managerEvaluations || managerEvaluations.length === 0) return [];
    return managerEvaluations.filter(e => {
      const m = e.month ? parseInt(e.month, 10) : extractMonthNumber(e.time || e.eval_date || e.created_at);
      if (!m) return true;
      return m === selectedMonthNum;
    });
  }, [managerEvaluations, selectedMonthNum]);

  // Lọc dữ liệu KPI của riêng tháng đang chọn (và tự động gom/lọc trùng mục tiêu giống nhau)
  const filteredKpiByMonth = useMemo(() => {
    if (!kpiList || kpiList.length === 0) return [];
    const list = kpiList.filter(k => {
      const m = k.month ? parseInt(k.month, 10) : extractMonthNumber(k.period || k.created_at);
      if (!m) return true;
      return m === selectedMonthNum;
    });

    const seen = new Set();
    const deduped = [];
    list.forEach(item => {
      const name = (item.target || item.content || '').trim().toLowerCase();
      if (name && !seen.has(name)) {
        seen.add(name);
        deduped.push(item);
      } else if (!name) {
        deduped.push(item);
      }
    });
    return deduped;
  }, [kpiList, selectedMonthNum]);

  // Lọc dữ liệu Checklist của riêng tháng đang chọn
  const filteredChecklistByMonth = useMemo(() => {
    if (!checklist || checklist.length === 0) return [];
    return checklist.filter(c => {
      const m = c.month ? parseInt(c.month, 10) : extractMonthNumber(c.date || c.created_at);
      if (!m) return true;
      return m === selectedMonthNum;
    });
  }, [checklist, selectedMonthNum]);

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
  const fetchEmployeeData = (empId, empName, targetMonth) => {
    if (!empId) {
      setKpiList([]);
      setChecklist([]);
      return;
    }

    // 1. Fetch Calculated KPI items and real-time scores from Backend Engine
    const targetMonthStr = targetMonth || formData.selected_month || 'Tháng 9';
    const monthNum = parseInt(String(targetMonthStr).replace(/\D/g, '') || '9', 10);
    api.get(`/kpi-management/calculate-score?employee_id=${empId}&month=${monthNum}&year=2026`)
      .then(scoreRes => {
        if (scoreRes && scoreRes.details) {
          setKpiList(scoreRes.details.map((k, idx) => ({
            id: k.id || idx + 1,
            db_id: k.id,
            kpi_code: k.kpi_code,
            target: k.content || k.target || 'Mục tiêu KPI',
            threshold: k.target || '>= 95%',
            actual: k.actual || '100.0%',
            weight: k.score ? `${k.score}%` : '20%',
            category: k.category || 'D',
            earned_percentage: k.earned_percentage,
            is_custom: k.is_custom || false,
            custom_reason: k.custom_reason || null,
            modified_by: k.modified_by || null
          })));

          setFormData(prev => ({
            ...prev,
            score_current: scoreRes.total_score || 0,
            score_kpi: scoreRes.kpi_score || 0,
            score_violation: scoreRes.violation_score || 0,
            score_manager: scoreRes.manager_score || 0,
            score_rating: scoreRes.rating || (scoreRes.total_score >= 100 ? 'A' : scoreRes.total_score >= 90 ? 'B' : scoreRes.total_score >= 80 ? 'C' : 'D'),
            rating: scoreRes.rating || (scoreRes.total_score >= 100 ? 'A' : scoreRes.total_score >= 90 ? 'B' : scoreRes.total_score >= 80 ? 'C' : 'D')
          }));
        }
      })
      .catch(() => {
        setKpiList([]);
      });

    // Fetch previous month score for comparison
    const prevMonth = monthNum > 1 ? monthNum - 1 : 12;
    const prevYear = monthNum > 1 ? 2026 : 2025;
    api.get(`/kpi-management/monthly-score?employee_id=${empId}&month=${prevMonth}&year=${prevYear}`)
      .then(prevRes => {
        if (prevRes && prevRes.total_score !== undefined) {
          setFormData(prev => ({
            ...prev,
            score_prev_month: prevRes.total_score
          }));
        }
      })
      .catch(() => {});

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
            task_code: c.task_code,
            task: c.content || 'Kiểm tra quy trình QC',
            tracking: c.frequency || 'Hàng ngày',
            status: c.status_today || 'Chưa làm',
            note: c.result || 'Đạt yêu cầu',
            evidence_type: c.evidence_type || 'NONE',
            evidence_url: c.evidence_url || null,
            performer_note: c.performer_note || null,
            completed_at: c.completed_at || null,
            weight_score: c.weight_score || 10
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
          const empSearchName = String(empName || '').toLowerCase();
          const empSearchId = String(empId || '');
          const filtered = list.filter(e => {
            const sName = String(e.staff_name || '').toLowerCase();
            const eName = String(e.employee_name || '').toLowerCase();
            const eId = String(e.employee_id || '');
            return (
              (e.staff_name && empSearchName && sName.includes(empSearchName)) ||
              (e.employee_name && empSearchName && eName.includes(empSearchName)) ||
              (e.employee_id && empSearchId && eId === empSearchId)
            );
          });
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

    // 4. Fetch Violation Points from Mobile `/awards-discipline/?limit=1000`
    api.get('/awards-discipline/?limit=1000')
      .then(res => {
        const list = res?.items || (Array.isArray(res) ? res : []);
        if (list.length > 0) {
          const empNameClean = String(empName || '').trim().toLowerCase();
          const empIdClean = String(empId || '').trim().toLowerCase();

          const filtered = list.filter(v => {
            const vStaffName = String(v.staff_name || v.employee_name || v.emp || '').trim().toLowerCase();
            const vEmpId = String(v.employee_id || v.code || '').trim().toLowerCase();

            // Nếu không truyền nhân sự cụ thể thì bỏ qua lọc
            if (!empNameClean && !empIdClean) return true;

            return (
              (empNameClean && vStaffName.includes(empNameClean)) ||
              (empNameClean && empNameClean.includes(vStaffName)) ||
              (empIdClean && vEmpId.includes(empIdClean)) ||
              (empIdClean && vEmpId === empIdClean)
            );
          });

          if (filtered.length > 0) {
            setViolations(filtered.map((v, idx) => {
              const rawImgs = v.evidence_images || v.images || v.image || v.photos || v.photo_url;
              let imagesList = [];
              if (rawImgs) {
                if (Array.isArray(rawImgs)) {
                  imagesList = rawImgs.filter(Boolean);
                } else if (typeof rawImgs === 'string') {
                  const trimmed = rawImgs.trim();
                  if (trimmed.startsWith('[')) {
                    try {
                      const parsed = JSON.parse(trimmed);
                      if (Array.isArray(parsed)) imagesList = parsed.filter(Boolean);
                    } catch (e) {
                      imagesList = [];
                    }
                  } else if (trimmed && trimmed !== '[]' && trimmed !== 'null' && trimmed !== 'undefined') {
                    imagesList = [trimmed];
                  }
                }
              }

              return {
                id: v.id || idx + 1,
                time: v.violation_time || v.date || (v.created_at ? new Date(v.created_at).toLocaleString('vi-VN') : '25/08/2026 09:30'),
                type: v.rule_name || v.issue || v.content || 'Vi phạm quy trình QC',
                description: v.note || v.description || v.rule_code || 'Ghi nhận từ ứng dụng Mobile',
                imagesList: imagesList,
                image: imagesList.length > 0 ? 'Xem ảnh' : 'Không có ảnh',
                reporter: v.reporter_name || v.created_by || 'QC Supervisor',
                point: `-${Math.abs(v.points || 0)}`,
                raw_date: v.date || v.created_at || v.violation_time
              };
            }));

            // Tính tổng số điểm vi phạm để tự động hiển thị lên ô "Vi phạm" trên header modal
            const totalViolationPoints = filtered.reduce((acc, curr) => acc + Math.abs(curr.points || 0), 0);
            setFormData(prev => ({
              ...prev,
              violation_score: totalViolationPoints > 0 ? `-${totalViolationPoints}` : '0'
            }));
          } else {
            setViolations([]);
            setFormData(prev => ({ ...prev, violation_score: '0' }));
          }
        } else {
          setViolations([]);
          setFormData(prev => ({ ...prev, violation_score: '0' }));
        }
      })
      .catch(() => {
        setViolations([]);
        setFormData(prev => ({ ...prev, violation_score: '0' }));
      });
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
        const pos = String(e.stage || e.position || '').toLowerCase();
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

          const noteStr = String(noteLevel || emp.note || '').toLowerCase();
          const posStr = String(emp.stage || emp.position || '').toLowerCase();
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
          const posStr = String(emp.position_name || emp.stage || emp.position || '').toLowerCase();
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

    const empName = taskData?.full_name || taskData?.employee_name || taskData?.name || '';
    const empId = taskData?.employee_id || (taskData?.id ? `NV_${taskData.id}` : '') || '';
    const pos = taskData?.stage || taskData?.position_name || taskData?.position || '';
    const dept = taskData?.department || taskData?.section_name || taskData?.department_name || '';
    const fac = taskData?.factory || taskData?.factory_name || '';

    // Trích xuất level và parent_level/parent_id từ taskData hoặc note JSON
    let curLevel = taskData?.current_level;
    let savedParentLevel = taskData?.parent_level || '';
    let savedParentId = taskData?.parent_id || null;
    let userNote = '';

    if (taskData?.note) {
      if (typeof taskData.note === 'string' && taskData.note.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(taskData.note);
          if (parsed.level) curLevel = parsed.level;
          if (parsed.parent_level) savedParentLevel = parsed.parent_level;
          if (parsed.parent_id) savedParentId = parsed.parent_id;
          userNote = parsed.note || '';
        } catch (e) {
          userNote = '';
        }
      } else if (typeof taskData.note === 'string' && taskData.note.includes('Cấp')) {
        curLevel = taskData.note;
        userNote = '';
      } else {
        userNote = String(taskData.note);
      }
    }

    if (!curLevel) {
      curLevel = 'Cấp 2';
    }

    // Bảo vệ logic: Cấp 1 hoặc nếu parent trùng chính mình thì cấp trên mặc định là Ban Giám Đốc (QMR)
    if (curLevel === 'Cấp 1' || savedParentLevel === empName || String(savedParentId) === String(empId) || !savedParentLevel) {
      if (curLevel === 'Cấp 1') {
        savedParentLevel = 'Ban Giám Đốc (QMR)';
        savedParentId = null;
      }
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
      parent_id: savedParentId,
      note: userNote
    }));

    fetchEmployeeData(empId, empName);
  }, [isOpen, taskData]);

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'selected_month') {
      const empId = formData.employee_id || taskData?.employee_id;
      const empName = formData.employee_name || taskData?.employee_name;
      if (empId) {
        fetchEmployeeData(empId, empName, value);
      }
    }
  };

  const handleOpenCustomResultModal = (item) => {
    setSelectedKpiForCustom(item);
    const clean = cleanActual(item.actual, item.threshold);
    const numMatch = clean.match(/-?\d+(\.\d+)?/);
    const scoreVal = numMatch ? parseFloat(numMatch[0]) : 100;
    setCustomForm({
      custom_value: String(scoreVal),
      custom_actual: `${scoreVal}%`,
      custom_score: scoreVal,
      reason: item.custom_reason || ''
    });
    setCustomResultModalOpen(true);
  };

  const handleSaveCustomResult = async (e) => {
    if (e) e.preventDefault();
    if (!selectedKpiForCustom) return;

    const empId = formData.employee_id || taskData?.employee_id;
    if (!empId) return;

    setCustomSaving(true);
    try {
      const selectedMonthStr = formData.selected_month || 'Tháng 9';
      const monthNum = parseInt(selectedMonthStr.replace(/\D/g, '') || '9', 10);
      const num = parseFloat(customForm.custom_value);
      const scoreVal = !isNaN(num) ? num : (parseFloat(customForm.custom_score) || 100);
      const actVal = `${scoreVal}%`;

      const res = await api.post('/kpi-management/custom-results', {
        employee_id: empId,
        kpi_code: selectedKpiForCustom.kpi_code,
        kpi_item_id: selectedKpiForCustom.db_id || selectedKpiForCustom.id,
        month: monthNum,
        year: 2026,
        custom_actual: actVal,
        custom_score: scoreVal,
        reason: customForm.reason,
        modified_by: 'Quản lý QC'
      });

      if (res?.scores?.details) {
        const scoreRes = res.scores;
        setKpiList(scoreRes.details.map((k, idx) => ({
          id: k.id || idx + 1,
          db_id: k.id,
          kpi_code: k.kpi_code,
          target: k.content || k.target || 'Mục tiêu KPI',
          threshold: k.target || '>= 95%',
          actual: k.actual || '100.0%',
          weight: k.score ? `${k.score}%` : '20%',
          category: k.category || 'D',
          earned_percentage: k.earned_percentage,
          is_custom: k.is_custom || false,
          custom_reason: k.custom_reason || null,
          modified_by: k.modified_by || null
        })));

        setFormData(prev => ({
          ...prev,
          score_current: scoreRes.total_score || 0,
          score_kpi: scoreRes.kpi_score || 0,
          score_violation: scoreRes.violation_score || 0,
          score_manager: scoreRes.manager_score || 0,
          score_rating: scoreRes.rating || (scoreRes.total_score >= 100 ? 'A' : scoreRes.total_score >= 90 ? 'B' : scoreRes.total_score >= 80 ? 'C' : 'D'),
          rating: scoreRes.rating || (scoreRes.total_score >= 100 ? 'A' : scoreRes.total_score >= 90 ? 'B' : scoreRes.total_score >= 80 ? 'C' : 'D')
        }));
        if (onSave) onSave(scoreRes);
      } else {
        fetchEmployeeData(empId, formData.employee_name, selectedMonthStr);
      }
      setCustomResultModalOpen(false);
    } catch (err) {
      console.error("Lỗi khi lưu kết quả tùy chỉnh:", err);
    } finally {
      setCustomSaving(false);
    }
  };

  const handleResetCustomResult = async () => {
    if (!selectedKpiForCustom) return;
    const empId = formData.employee_id || taskData?.employee_id;
    if (!empId) return;

    setCustomSaving(true);
    try {
      const selectedMonthStr = formData.selected_month || 'Tháng 9';
      const monthNum = parseInt(selectedMonthStr.replace(/\D/g, '') || '9', 10);
      const res = await api.delete(`/kpi-management/custom-results?employee_id=${empId}&kpi_code=${encodeURIComponent(selectedKpiForCustom.kpi_code)}&month=${monthNum}&year=2026`);

      if (res?.scores?.details) {
        const scoreRes = res.scores;
        setKpiList(scoreRes.details.map((k, idx) => ({
          id: k.id || idx + 1,
          db_id: k.id,
          kpi_code: k.kpi_code,
          target: k.content || k.target || 'Mục tiêu KPI',
          threshold: k.target || '>= 95%',
          actual: k.actual || '100.0%',
          weight: k.score ? `${k.score}%` : '20%',
          category: k.category || 'D',
          earned_percentage: k.earned_percentage,
          is_custom: k.is_custom || false,
          custom_reason: k.custom_reason || null,
          modified_by: k.modified_by || null
        })));

        setFormData(prev => ({
          ...prev,
          score_current: scoreRes.total_score || 0,
          score_kpi: scoreRes.kpi_score || 0,
          score_violation: scoreRes.violation_score || 0,
          score_manager: scoreRes.manager_score || 0,
          score_rating: scoreRes.rating || (scoreRes.total_score >= 100 ? 'A' : scoreRes.total_score >= 90 ? 'B' : scoreRes.total_score >= 80 ? 'C' : 'D'),
          rating: scoreRes.rating || (scoreRes.total_score >= 100 ? 'A' : scoreRes.total_score >= 90 ? 'B' : scoreRes.total_score >= 80 ? 'C' : 'D')
        }));
        if (onSave) onSave(scoreRes);
      } else {
        fetchEmployeeData(empId, formData.employee_name, selectedMonthStr);
      }
      setCustomResultModalOpen(false);
    } catch (err) {
      console.error("Lỗi khi khôi phục kết quả tự động:", err);
    } finally {
      setCustomSaving(false);
    }
  };

  const handleOpenAddKpiModal = () => {
    setEditingKpiId(null);
    setNewKpiForm({ kpi_code: '', target: '', operator: '≥', thresholdVal: '95', unitSuffix: '%', weightVal: '20', category: 'D', calc_method: '' });
    setSubModalType('kpi');
  };

  const handleOpenAddChecklistModal = () => {
    setEditingChecklistId(null);
    setNewChecklistForm({ task_code: '', task: '', tracking: 'Hàng ngày', evidence_type: 'PHOTO', weight_score: '10' });
    setSubModalType('checklist');
  };

  const handleEditKpi = (item) => {
    setEditingKpiId(item.id);
    const parsed = parseTargetStringToComponents(item.threshold || item.target);
    let weightVal = String(item.weight || '20').replace('%', '').trim();

    setNewKpiForm({
      kpi_code: item.kpi_code || '',
      target: item.target || item.content || '',
      operator: parsed.operator,
      thresholdVal: parsed.value,
      unitSuffix: parsed.unitSuffix,
      weightVal: weightVal || '20',
      category: item.category || 'D',
      calc_method: item.calc_method || ''
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
      task_code: item.task_code || '',
      task: item.task || item.content || '',
      tracking: item.tracking || item.frequency || 'Hàng ngày',
      evidence_type: item.evidence_type || 'PHOTO',
      weight_score: item.weight_score ? String(item.weight_score) : '10'
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

    const unitFormatted = newKpiForm.unitSuffix === '%' ? '%' : ` ${newKpiForm.unitSuffix}`;
    const thresholdStr = newKpiForm.operator ? `${newKpiForm.operator} ${newKpiForm.thresholdVal}${unitFormatted}` : `${newKpiForm.thresholdVal}${unitFormatted}`;
    const weightStr = `${newKpiForm.weightVal}%`;

    // Kiểm tra tổng trọng số không được vượt quá 100%
    const inputWeight = parseFloat(newKpiForm.weightVal) || 0;
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
            kpi_code: newKpiForm.kpi_code || k.kpi_code,
            target: newKpiForm.target,
            threshold: thresholdStr,
            weight: weightStr,
            category: newKpiForm.category || k.category || 'D'
          };
        }
        return k;
      }));

      const targetItem = kpiList.find(k => k.id === editingKpiId);
      const dbId = targetItem?.db_id || (typeof editingKpiId === 'number' && editingKpiId < 1000000000 ? editingKpiId : null);
      if (dbId) {
        try {
          await api.put(`/kpi-management/employee-items/${dbId}`, {
            kpi_code: newKpiForm.kpi_code || targetItem?.kpi_code || `KPI_${dbId}`,
            content: newKpiForm.target,
            score: parseInt(newKpiForm.weightVal) || 20,
            calc_method: newKpiForm.calc_method || weightStr,
            target: thresholdStr,
            actual: targetItem?.actual || 'Chưa có dữ liệu',
            status: targetItem?.status || 'Chưa có dữ liệu'
          });
        } catch (err) {}
      }
      setEditingKpiId(null);
    } else {
      // Chế độ Thêm mới
      let isSaved = false;
      let dbId = null;
      const assignedKpiCode = newKpiForm.kpi_code || `KPI_${Date.now()}`;
      if (empId) {
        try {
          const res = await api.post('/kpi-management/employee-items', {
            employee_id: empId,
            kpi_code: assignedKpiCode,
            content: newKpiForm.target,
            score: parseInt(newKpiForm.weightVal) || 20,
            calc_method: newKpiForm.calc_method || weightStr,
            target: thresholdStr,
            actual: 'Chưa có dữ liệu',
            status: 'Chưa có dữ liệu'
          });
          if (res?.id) dbId = res.id;
          isSaved = true;
        } catch (err) {}
      }

      const newItem = {
        id: dbId || Date.now(),
        db_id: dbId,
        kpi_code: assignedKpiCode,
        target: newKpiForm.target,
        threshold: thresholdStr,
        actual: 'Chưa có dữ liệu',
        weight: weightStr,
        category: newKpiForm.category || 'D',
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
    const wScore = parseInt(newChecklistForm.weight_score, 10) || 10;
    const evType = newChecklistForm.evidence_type || 'PHOTO';

    if (editingChecklistId) {
      // Chế độ Sửa (Edit)
      setChecklist(prev => prev.map(c => {
        if (c.id === editingChecklistId) {
          return {
            ...c,
            task: newChecklistForm.task,
            tracking: newChecklistForm.tracking || 'Hàng ngày',
            evidence_type: evType,
            weight_score: wScore
          };
        }
        return c;
      }));

      const targetItem = checklist.find(c => c.id === editingChecklistId);
      const dbId = targetItem?.db_id || (typeof editingChecklistId === 'number' && editingChecklistId < 1000000000 ? editingChecklistId : null);
      if (dbId) {
        try {
          await api.put(`/kpi-management/checklists/${dbId}`, {
            task_code: targetItem?.task_code || newChecklistForm.task_code || `CV_${dbId}`,
            content: newChecklistForm.task,
            frequency: newChecklistForm.tracking,
            status_today: targetItem?.status || 'Đang thực hiện',
            perform_count: targetItem?.perform_count || 1,
            last_performed: new Date().toISOString().split('T')[0],
            result: targetItem?.note || 'Đạt yêu cầu',
            evidence_type: evType,
            weight_score: wScore
          });
        } catch (err) {}
      }
      setEditingChecklistId(null);
    } else {
      // Chế độ Thêm mới
      let isSaved = false;
      let dbId = null;
      const assignedTaskCode = newChecklistForm.task_code || `CV_${Date.now()}`;
      if (empId) {
        try {
          const res = await api.post('/kpi-management/checklists', {
            employee_id: empId,
            task_code: assignedTaskCode,
            content: newChecklistForm.task,
            frequency: newChecklistForm.tracking,
            status_today: 'Đang thực hiện',
            perform_count: 1,
            last_performed: new Date().toISOString().split('T')[0],
            result: 'Đạt yêu cầu',
            evidence_type: evType,
            weight_score: wScore
          });
          if (res?.id) dbId = res.id;
          isSaved = true;
        } catch (err) {}
      }

      const newItem = {
        id: dbId || Date.now(),
        db_id: dbId,
        task_code: assignedTaskCode,
        task: newChecklistForm.task,
        tracking: newChecklistForm.tracking || 'Hàng ngày',
        status: 'Đang thực hiện',
        note: 'Đạt yêu cầu',
        evidence_type: evType,
        weight_score: wScore,
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
      parent_id: formData.parent_id || '',
      note: formData.note || ''
    });

    try {
      // 1. Lưu/Cập nhật nhân sự vào cơ sở dữ liệu backend
      const dynamicRating = formData.rating || formData.score_rating || (Number(formData.score_current || 0) >= 100 ? 'A' : Number(formData.score_current || 0) >= 90 ? 'B' : Number(formData.score_current || 0) >= 80 ? 'C' : 'D');
      await api.post('/quality-employees/', {
        employee_id: empId,
        full_name: empName,
        department: dept,
        stage: pos,
        factory: fac,
        note: notePayload,
        latest_rating: dynamicRating
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
            note: notePayload,
            latest_rating: dynamicRating
          }).catch(() => null);
        }
      });

      // 2. Lưu các mục KPI mới chưa từng lưu vào DB
      if (kpiList && kpiList.length > 0) {
        for (const kpi of kpiList) {
          if (kpi._isUnsaved) {
            await api.post('/kpi-management/employee-items', {
              employee_id: empId,
              kpi_code: kpi.kpi_code || `KPI_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              content: kpi.target || kpi.content,
              score: parseInt(kpi.weight) || 20,
              calc_method: kpi.calc_method || kpi.weight || '20%',
              target: kpi.threshold || '>= 95%',
              actual: kpi.actual || 'Chưa có dữ liệu',
              status: 'Chưa có dữ liệu'
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
              task_code: item.task_code || `CV_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              content: item.task || item.content,
              frequency: item.tracking || 'Hàng ngày',
              status_today: item.status || 'Đang thực hiện',
              perform_count: 1,
              last_performed: new Date().toISOString().split('T')[0],
              result: item.note || 'Đạt yêu cầu',
              evidence_type: item.evidence_type || 'PHOTO',
              weight_score: item.weight_score || 10
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
                onChange={(e) => {
                  const newLvl = e.target.value;
                  handleInputChange('current_level', newLvl);
                  if (newLvl === 'Cấp 1') {
                    setFormData(prev => ({
                      ...prev,
                      current_level: newLvl,
                      parent_level: 'Ban Giám Đốc (QMR)',
                      parent_id: null
                    }));
                  } else if (newLvl === 'Cấp 2' && (!formData.parent_level || formData.parent_level.includes('Ban Giám Đốc') || formData.parent_level === formData.employee_name)) {
                    setFormData(prev => ({
                      ...prev,
                      current_level: newLvl,
                      parent_level: 'Đặng Văn Nam',
                      parent_id: '3973'
                    }));
                  }
                }}
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
                  value={formData.selected_month || availableMonths[0] || 'Tháng 9'}
                  onChange={(e) => handleInputChange('selected_month', e.target.value)}
                  style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                >
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
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

          {/* Row 6: Dynamic Calculated Scores (Tháng hiển thị * | Điểm tổng | KPI (70%) | Checklist (30%) | QLĐG | Vi phạm | Xếp loại) */}
          {(() => {
            // 1. Điểm trừ Vi phạm
            const calculatedViolationScore = filteredViolationsByMonth.reduce((sum, item) => {
              const pt = parseInt(String(item.point).replace('+', '')) || 0;
              return sum + Math.abs(pt);
            }, 0);

            // 2. Điểm thưởng/cộng Quản lý
            const calculatedQldgScore = filteredManagerEvalsByMonth.reduce((sum, item) => {
              const pt = parseInt(String(item.total_point).replace('+', '')) || 0;
              return sum + pt;
            }, 0);

            // 3. Điểm Checklist (30% Trọng số)
            let calculatedChecklistScore = 100;
            if (filteredChecklistByMonth && filteredChecklistByMonth.length > 0) {
              let earned = 0;
              filteredChecklistByMonth.forEach(c => {
                const st = (c.status || c.status_today || '').toLowerCase();
                if (st.includes('hoàn thành') || st.includes('đạt')) earned += 100;
                else if (st.includes('trễ') || st.includes('đang thực hiện') || st.includes('cần làm')) earned += 50;
                else earned += 0;
              });
              calculatedChecklistScore = Math.round(earned / filteredChecklistByMonth.length);
            }

            // 4. Điểm KPI Trọng Số (70% Trọng số)
            let calculatedKpiScore = 100;
            if (filteredKpiByMonth && filteredKpiByMonth.length > 0) {
              let weightedSum = 0;
              let totalWeight = 0;
              let hasValidData = false;
              filteredKpiByMonth.forEach(k => {
                const actStr = String(k.actual || '');
                if (!actStr.includes('Chưa')) {
                  // Ưu tiên dùng earned_percentage do backend tính toán chính xác
                  const earned = (k.earned_percentage !== undefined && k.earned_percentage !== null)
                    ? Number(k.earned_percentage)
                    : (parseFloat(actStr.replace('%', '')) || 0);
                  const w = parseFloat(String(k.weight || k.calc_method).replace('%', '')) || (100 / filteredKpiByMonth.length);
                  weightedSum += (earned * w);
                  totalWeight += w;
                  hasValidData = true;
                }
              });
              if (hasValidData && totalWeight > 0) {
                calculatedKpiScore = Math.min(120, Math.round(weightedSum / totalWeight));
              } else {
                calculatedKpiScore = 100;
              }
            }

            // 5. Điểm Tổng = (30% Checklist + 70% KPI) + QLĐG - Vi phạm
            const basePerformanceScore = (0.3 * calculatedChecklistScore) + (0.7 * calculatedKpiScore);
            let calculatedTotalScore = Math.max(0, Math.round((basePerformanceScore + calculatedQldgScore - calculatedViolationScore) * 10) / 10);
            
            // Đồng bộ với điểm thực tế từ Backend Engine (/calculate-score) nếu có
            if (formData.score_current !== undefined && formData.score_current !== null && Number(formData.score_current) > 0) {
              calculatedTotalScore = Number(formData.score_current);
            }

            // 6. Ma trận Xếp loại (Rating Matrix) theo chuẩn công ty:
            // - Loại A: >= 100 điểm
            // - Loại B: >= 90 điểm và < 100 điểm
            // - Loại C: >= 80 điểm và < 90 điểm
            // - Loại D: < 80 điểm (hoặc 50 điểm)
            let ratingBadge = { label: 'B (Khá)', color: '#2563EB', bg: '#EFF6FF' };
            if (calculatedTotalScore >= 100) ratingBadge = { label: 'A (Xuất sắc)', color: '#15803D', bg: '#DCFCE7' };
            else if (calculatedTotalScore >= 90) ratingBadge = { label: 'B (Khá)', color: '#2563EB', bg: '#EFF6FF' };
            else if (calculatedTotalScore >= 80) ratingBadge = { label: 'C (Trung bình)', color: '#D97706', bg: '#FEF3C7' };
            else ratingBadge = { label: 'D (Cần cải thiện)', color: '#DC2626', bg: '#FEE2E2' };

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr 1.2fr', gap: '8px', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                    Tháng hiển thị <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <select
                    value={formData.selected_month || availableMonths[0] || 'Tháng 9'}
                    onChange={(e) => handleInputChange('selected_month', e.target.value)}
                    style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }}
                  >
                    {availableMonths.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
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
                    style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FAF6F0', fontSize: '0.85rem', color: '#7B5233', fontWeight: '900', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }} title="Mục tiêu KPI (Trọng số 70%)">
                    KPI (70%)
                  </label>
                  <input
                    type="text"
                    value={`${formData.score_kpi !== undefined && formData.score_kpi > 0 ? formData.score_kpi : calculatedKpiScore}%`}
                    readOnly
                    style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#EFEFEF', fontSize: '0.8rem', color: '#1E293B', fontWeight: '700', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }} title="Hoàn thành Checklist hàng ngày (Trọng số 30%)">
                    Checklist (30%)
                  </label>
                  <input
                    type="text"
                    value={`${calculatedChecklistScore}%`}
                    readOnly
                    style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#EFEFEF', fontSize: '0.8rem', color: '#1E293B', fontWeight: '700', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                    Vi phạm
                  </label>
                  <input
                    type="text"
                    value={calculatedViolationScore > 0 ? `-${calculatedViolationScore}` : '0'}
                    readOnly
                    style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#EFEFEF', fontSize: '0.8rem', color: calculatedViolationScore > 0 ? '#DC2626' : '#64748B', fontWeight: '800', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                    Xếp loại
                  </label>
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    backgroundColor: ratingBadge.bg,
                    color: ratingBadge.color,
                    fontWeight: '800',
                    fontSize: '0.78rem',
                    textAlign: 'center',
                    border: `1px solid ${ratingBadge.color}40`,
                    whiteSpace: 'nowrap'
                  }}>
                    {ratingBadge.label}
                  </div>
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
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '160px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredKpiByMonth.length > 0 ? (
                        filteredKpiByMonth.map((item, idx) => (
                          <tr key={item.id} style={{ borderTop: '1px solid #E2E8F0' }}>
                            <td style={{ padding: '6px 10px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                            <td style={{ padding: '6px 10px', color: '#1E293B', fontWeight: '700' }}>{item.target}</td>
                            <td style={{ padding: '6px 10px', color: '#475569' }}>{item.threshold}</td>
                            <td style={{ padding: '4px 8px' }}>
                              {(() => {
                                const status = checkKpiStatus(item.actual, item.threshold);
                                return (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <span
                                      onClick={() => handleOpenCustomResultModal(item)}
                                      title="Bấm để điều chỉnh kết quả"
                                      style={{
                                        color: status.color,
                                        fontWeight: '800',
                                        fontSize: '0.82rem',
                                        padding: '3px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: status.bg,
                                        border: `1px solid ${status.border}`,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {cleanActual(item.actual, item.threshold)}
                                    </span>
                                  </div>
                                );
                              })()}
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: '700', color: '#5D3B32' }}>{item.weight}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                <button
                                  type="button"
                                  title="Chỉnh sửa kết quả hiện tại"
                                  onClick={() => handleOpenCustomResultModal(item)}
                                  style={{
                                    border: 'none',
                                    background: '#F8FAFC',
                                    cursor: 'pointer',
                                    padding: '4px 6px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: '#475569'
                                  }}
                                >
                                  <Sliders size={13} />
                                </button>
                                <button
                                  type="button"
                                  title="Xem lịch sử & Bằng chứng xác thực điểm số"
                                  onClick={() => handleOpenEvidenceModal(item)}
                                  style={{ border: 'none', background: '#F0F9FF', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', color: '#0284C7' }}
                                >
                                  <Search size={13} />
                                </button>
                                <button
                                  type="button"
                                  title="Chỉnh sửa mục tiêu & trọng số"
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
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#94A3B8' }}>
                            Chưa có mục tiêu KPI ghi nhận cho tháng này.
                          </td>
                        </tr>
                      )}
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
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '40px', textAlign: 'center' }}>STT</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700' }}>Nhiệm Vụ</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '95px' }}>Cách theo dõi</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '125px' }}>Yêu cầu xác thực</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '95px', textAlign: 'center' }}>Trạng thái</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '125px', textAlign: 'center' }}>Bằng chứng</th>
                        <th style={{ padding: '6px 10px', fontWeight: '700', width: '70px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredChecklistByMonth.length > 0 ? (
                        filteredChecklistByMonth.map((item, idx) => (
                          <tr key={item.id} style={{ borderTop: '1px solid #E2E8F0', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                            <td style={{ padding: '6px 10px', fontWeight: '700', color: '#64748B', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ padding: '6px 10px', color: '#1E293B', fontWeight: '700' }}>
                              <div>{item.task}</div>
                              {item.performer_note && (
                                <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '500', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>💬</span> <em>{item.performer_note}</em>
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '6px 10px', color: '#475569', fontSize: '0.78rem' }}>{item.tracking}</td>
                            <td style={{ padding: '6px 10px' }}>
                              {item.evidence_type === 'PHOTO' ? (
                                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#E0F2FE', color: '#0369A1', fontWeight: '700' }}>📷 Chụp camera</span>
                              ) : item.evidence_type === 'SIGNATURE' ? (
                                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EDE9FE', color: '#6D28D9', fontWeight: '700' }}>✍️ Ký tên</span>
                              ) : item.evidence_type === 'FILE' ? (
                                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: '700' }}>📄 Tệp file</span>
                              ) : (
                                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#64748B', fontWeight: '600' }}>➖ Tự xác nhận</span>
                              )}
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                              <span style={{
                                fontSize: '0.72rem',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: '700',
                                backgroundColor: (item.status || '').toLowerCase().includes('hoàn thành') || (item.status || '').toLowerCase().includes('đạt') ? '#DCFCE7' : '#FEF3C7',
                                color: (item.status || '').toLowerCase().includes('hoàn thành') || (item.status || '').toLowerCase().includes('đạt') ? '#15803D' : '#B45309'
                              }}>
                                {item.status}
                              </span>
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                              {item.evidence_url ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage(getFullImageUrl(item.evidence_url))}
                                  style={{
                                    border: '1px solid #BAE6FD',
                                    borderRadius: '4px',
                                    backgroundColor: '#F0F9FF',
                                    color: '#0284C7',
                                    cursor: 'pointer',
                                    padding: '3px 8px',
                                    fontSize: '0.72rem',
                                    fontWeight: '700',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="Bấm để xem ảnh bằng chứng thực tế"
                                >
                                  <ImageIcon size={12} /> Xem ảnh
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Chưa nộp</span>
                              )}
                            </td>
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
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: '#94A3B8' }}>
                            Chưa có nhiệm vụ checklist ghi nhận cho tháng này.
                          </td>
                        </tr>
                      )}
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
                      {filteredManagerEvalsByMonth.length > 0 ? (
                        filteredManagerEvalsByMonth.map((item, idx) => (
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
                      {filteredViolationsByMonth.length > 0 ? (
                        filteredViolationsByMonth.map((item, idx) => (
                          <tr key={item.id} style={{ borderTop: '1px solid #E2E8F0' }}>
                            <td style={{ padding: '6px 10px', fontWeight: '700', color: '#64748B' }}>{idx + 1}</td>
                            <td style={{ padding: '6px 10px', color: '#475569' }}>{item.time}</td>
                            <td style={{ padding: '6px 10px', fontWeight: '700', color: '#DC2626' }}>{item.type}</td>
                            <td style={{ padding: '6px 10px', color: '#1E293B' }}>{item.description}</td>
                            <td style={{ padding: '6px 10px' }}>
                              {item.imagesList && item.imagesList.length > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  {item.imagesList.map((imgUrl, imgIdx) => {
                                    const fullSrc = getFullImageUrl(imgUrl);
                                    return (
                                      <div
                                        key={imgIdx}
                                        style={{
                                          position: 'relative',
                                          width: '42px',
                                          height: '42px',
                                          borderRadius: '6px',
                                          overflow: 'hidden',
                                          border: '1.5px solid #CBD5E1',
                                          cursor: 'pointer',
                                          backgroundColor: '#F8FAFC',
                                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                          transition: 'all 0.2s ease'
                                        }}
                                        onClick={() => {
                                          setImageError(false);
                                          setPreviewImage(fullSrc);
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.transform = 'scale(1.1)';
                                          e.currentTarget.style.borderColor = '#7B5233';
                                          e.currentTarget.style.zIndex = '10';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.transform = 'scale(1)';
                                          e.currentTarget.style.borderColor = '#CBD5E1';
                                          e.currentTarget.style.zIndex = '1';
                                        }}
                                        title="Nhấn để xem ảnh phóng to"
                                      >
                                        <img
                                          src={fullSrc}
                                          alt={`Bằng chứng ${imgIdx + 1}`}
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                          }}
                                          onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="%2394A3B8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
                                          }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span style={{ color: '#94A3B8', fontSize: '0.75rem', fontStyle: 'italic' }}>Không có ảnh</span>
                              )}
                            </td>
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
            borderRadius: '16px',
            width: subModalType === 'kpi' ? '560px' : '460px',
            maxWidth: '92%',
            padding: '24px',
            boxShadow: '0 20px 35px -10px rgba(74, 46, 43, 0.18), 0 10px 15px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #E2E8F0'
          }}>
            {subModalType === 'parent' && (
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#1E293B', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🎯 Chọn Cấp Trên Quản Lý</span>
                  <button type="button" onClick={() => setSubModalType(null)} style={{ border: 'none', backgroundColor: '#F1F5F9', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', color: '#64748B', fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </h3>
                <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                  {(() => {
                    const currentLevel = String(formData.current_level || 'Cấp 2').toLowerCase();
                    const currentEmpId = String(formData.employee_id || '').toLowerCase();
                    const currentEmpName = String(formData.employee_name || '').toLowerCase();

                    // Luôn loại trừ chính nhân sự đang sửa khỏi danh sách cấp trên
                    const otherEmployees = employeeOptions.filter(e => {
                      const eid = String(e.employee_id || e.id || '').toLowerCase();
                      const ename = String(e.full_name || '').toLowerCase();
                      return eid !== currentEmpId && ename !== currentEmpName;
                    });

                    let displayItems = [];
                    if (currentLevel.includes('cấp 1')) {
                      // Cấp 1 (Trưởng phòng) trực thuộc Ban Giám Đốc
                      displayItems = [
                        {
                          id: 'bgd_qmr',
                          employee_id: 'BGD',
                          name: 'Ban Giám Đốc (QMR)',
                          title: 'Ban Giám Đốc (QMR) - Ban Lãnh Đạo',
                          desc: 'Cấp Quản lý Trực tiếp của Trưởng Phòng',
                          badge: 'BAN GIÁM ĐỐC'
                        }
                      ];
                    } else {
                      const filtered = otherEmployees.filter(e => {
                        const pos = String(e.position_name || e.position || e.stage || '').toLowerCase();
                        const noteVal = typeof e.note === 'string' && e.note.includes('Cấp') ? e.note : '';
                        const lvl = String(e.current_level || noteVal).toLowerCase();

                        if (currentLevel.includes('cấp 2')) {
                          // Cấp 2 báo cáo cho Cấp 1 hoặc Trưởng phòng
                          return lvl.includes('cấp 1') || pos.includes('trưởng') || pos.includes('giám đốc');
                        } else if (currentLevel.includes('cấp 3')) {
                          // Cấp 3 báo cáo cho Cấp 2 hoặc Cấp 1
                          return lvl.includes('cấp 2') || lvl.includes('cấp 1') || pos.includes('lead') || pos.includes('qa') || pos.includes('trưởng');
                        } else if (currentLevel.includes('cấp 4')) {
                          return lvl.includes('cấp 3') || lvl.includes('cấp 2') || pos.includes('phó');
                        } else {
                          return lvl.includes('cấp 4') || lvl.includes('cấp 3') || pos.includes('tổ') || pos.includes('giám sát') || pos.includes('lead');
                        }
                      });

                      const listToDisplay = filtered.length > 0 ? filtered : otherEmployees;
                      displayItems = listToDisplay.map(e => ({
                        id: e.id,
                        employee_id: e.employee_id || `NV_${e.id}`,
                        name: e.full_name,
                        title: `${e.full_name} - ${e.position_name || 'Cấp Quản lý'}`,
                        desc: `Mã NV: ${e.employee_id || e.id} | ${e.department_name || e.section_name || 'Phòng QLCL'}`,
                        badge: e.current_level ? e.current_level.toUpperCase() : (e.position_name || 'Cấp 1')
                      }));
                    }
                    return displayItems;
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
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1E293B', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{editingKpiId ? '✏️' : '🎯'}</span>
                    <span>{editingKpiId ? 'Chỉnh Sửa Mục Tiêu KPI' : 'Thêm Mục Tiêu KPI Mới'}</span>
                  </span>
                  <button type="button" onClick={() => setSubModalType(null)} style={{ border: 'none', backgroundColor: '#F1F5F9', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', color: '#64748B', fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </h3>

                {!editingKpiId && (
                  <div style={{ marginBottom: '14px', backgroundColor: '#FAF6F0', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E5D5C5' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#4A2E2B', marginBottom: '6px' }}>
                      📌 Chọn nhanh tiêu chí từ Thư viện KPI trong Database:
                    </label>
                    <select
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const found = kpiPool.find(k => String(k.id) === selectedId);
                        if (found) {
                          const parsed = parseTargetStringToComponents(found.target);

                          setNewKpiForm({
                            kpi_code: found.kpi_code || '',
                            target: found.content,
                            operator: parsed.operator,
                            thresholdVal: parsed.value,
                            unitSuffix: parsed.unitSuffix,
                            weightVal: '20',
                            category: found.category || 'D',
                            calc_method: found.calc_method || ''
                          });
                        }
                      }}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #7B5233', backgroundColor: '#FFFFFF', color: '#334155', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', fontWeight: '600' }}
                    >
                      <option value="">-- Bấm để chọn danh mục KPI mẫu từ DB --</option>
                      {kpiPool.map(item => (
                        <option key={item.id} value={item.id}>
                          [{item.kpi_code}] {item.content} (Target: {item.target})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>
                      Tên mục tiêu KPI <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    {newKpiForm.kpi_code && (
                      <span style={{ fontSize: '0.72rem', padding: '1px 8px', borderRadius: '4px', backgroundColor: '#E0F2FE', color: '#0369A1', fontWeight: '700' }}>
                        Mã chuẩn: {newKpiForm.kpi_code}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="VD: Tỷ lệ tuân thủ quy trình QC..."
                    value={newKpiForm.target}
                    onChange={(e) => setNewKpiForm(prev => ({ ...prev, target: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#F8FAFC', fontWeight: '600', color: '#0F172A' }}
                  />
                </div>

                {/* Layout 2 cột căn chỉnh chuẩn 100%: 1. Ngưỡng đạt * | 2. Trọng số * */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '12px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
                  {/* 1. Ngưỡng đạt * */}
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                      1. Ngưỡng đạt <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', border: '1px solid #CBD5E1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#F8FAFC', width: '100%', boxSizing: 'border-box' }}>
                      <select
                        value={newKpiForm.operator}
                        onChange={(e) => setNewKpiForm(prev => ({ ...prev, operator: e.target.value }))}
                        style={{
                          border: 'none',
                          borderRight: '1px solid #CBD5E1',
                          padding: '8px 8px',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          color: '#4A2E2B',
                          backgroundColor: '#FAF6F0',
                          outline: 'none',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        <option value="≥">≥</option>
                        <option value="≤">≤</option>
                        <option value="=">=</option>
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                      </select>
                      <input
                        type="text"
                        placeholder="95"
                        value={newKpiForm.thresholdVal}
                        onChange={(e) => setNewKpiForm(prev => ({ ...prev, thresholdVal: e.target.value.replace(/[>=<=≥≤=]/g, '').trim() }))}
                        style={{
                          flex: 1,
                          width: 0,
                          minWidth: 0,
                          border: 'none',
                          padding: '8px 6px',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          color: '#0F172A',
                          backgroundColor: 'transparent',
                          outline: 'none',
                          textAlign: 'center'
                        }}
                      />
                      <div style={{
                        padding: '8px 10px',
                        backgroundColor: '#F1F5F9',
                        borderLeft: '1px solid #CBD5E1',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                        flexShrink: 0
                      }}>
                        {newKpiForm.unitSuffix || '%'}
                      </div>
                    </div>
                  </div>

                  {/* 2. Trọng số * */}
                  <div style={{ minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                      2. Trọng số <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', border: '1px solid #CBD5E1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#F8FAFC', width: '100%', boxSizing: 'border-box' }}>
                      <input
                        type="number"
                        placeholder="20"
                        value={newKpiForm.weightVal}
                        onChange={(e) => setNewKpiForm(prev => ({ ...prev, weightVal: e.target.value }))}
                        style={{
                          flex: 1,
                          width: 0,
                          minWidth: 0,
                          border: 'none',
                          padding: '8px 6px',
                          fontSize: '0.85rem',
                          fontWeight: '800',
                          color: '#0F172A',
                          textAlign: 'center',
                          backgroundColor: 'transparent',
                          outline: 'none'
                        }}
                      />
                      <div style={{
                        padding: '8px 10px',
                        backgroundColor: '#F1F5F9',
                        borderLeft: '1px solid #CBD5E1',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        flexShrink: 0
                      }}>
                        %
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setSubModalType(null)}
                    style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#4A2E2B', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(74, 46, 43, 0.25)' }}
                  >
                    Xác nhận
                  </button>
                </div>
              </form>
            )}

            {subModalType === 'checklist' && (
              <form onSubmit={handleSaveChecklist}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1E293B', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{editingChecklistId ? '✏️' : '📋'}</span>
                    <span>{editingChecklistId ? 'Chỉnh Sửa Nhiệm Vụ Checklist' : 'Thêm Nhiệm Vụ Checklist Mới'}</span>
                  </span>
                  <button type="button" onClick={() => setSubModalType(null)} style={{ border: 'none', backgroundColor: '#F1F5F9', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', color: '#64748B', fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </h3>

                <div style={{ marginBottom: '14px', backgroundColor: '#FAF6F0', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E5D5C5' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#4A2E2B', marginBottom: '6px' }}>
                    📌 Chọn từ Thư viện Checklist trong Database:
                  </label>
                  <select
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const found = checklistPool.find(c => String(c.id) === selectedId);
                      if (found) {
                        setNewChecklistForm({
                          task_code: found.task_code || `CV_${Date.now()}`,
                          task: found.content,
                          tracking: found.frequency || 'Hàng ngày',
                          evidence_type: found.evidence_type || 'PHOTO',
                          weight_score: found.weight_score ? String(found.weight_score) : '10'
                        });
                      }
                    }}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #7B5233', backgroundColor: '#FFFFFF', color: '#334155', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', fontWeight: '600' }}
                  >
                    <option value="">-- Bấm để chọn nhiệm vụ Checklist mẫu từ DB --</option>
                    {checklistPool.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.content} ({item.frequency})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                    Tên nhiệm vụ Checklist <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Kiểm tra thông số thiết bị đầu ca..."
                    value={newChecklistForm.task}
                    onChange={(e) => setNewChecklistForm(prev => ({ ...prev, task: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#F8FAFC', fontWeight: '600', color: '#0F172A' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.4fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  {/* Cách theo dõi */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                      Cách theo dõi
                    </label>
                    <select
                      value={newChecklistForm.tracking}
                      onChange={(e) => setNewChecklistForm(prev => ({ ...prev, tracking: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#F8FAFC', fontWeight: '600', color: '#0F172A' }}
                    >
                      <option value="Hàng ngày">Hàng ngày</option>
                      <option value="Theo ca">Theo ca</option>
                      <option value="Hàng tuần">Hàng tuần</option>
                      <option value="Hàng tháng">Hàng tháng</option>
                      <option value="Khi phát sinh">Khi phát sinh</option>
                    </select>
                  </div>

                  {/* Yêu cầu xác thực */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                      Yêu cầu xác thực
                    </label>
                    <select
                      value={newChecklistForm.evidence_type}
                      onChange={(e) => setNewChecklistForm(prev => ({ ...prev, evidence_type: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#F8FAFC', fontWeight: '600', color: '#0F172A' }}
                    >
                      <option value="PHOTO">📷 Bắt buộc chụp camera</option>
                      <option value="SIGNATURE">✍️ Ký tên xác nhận</option>
                      <option value="FILE">📄 Tệp đính kèm</option>
                      <option value="NONE">➖ Tự xác nhận</option>
                    </select>
                  </div>

                  {/* Trọng số điểm */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                      Trọng số điểm
                    </label>
                    <div style={{ display: 'flex', border: '1px solid #CBD5E1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#F8FAFC', width: '100%', boxSizing: 'border-box' }}>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={newChecklistForm.weight_score}
                        onChange={(e) => setNewChecklistForm(prev => ({ ...prev, weight_score: e.target.value }))}
                        style={{ flex: 1, width: 0, minWidth: 0, border: 'none', padding: '8px 6px', fontSize: '0.82rem', fontWeight: '800', color: '#0F172A', textAlign: 'center', backgroundColor: 'transparent', outline: 'none' }}
                      />
                      <span style={{ padding: '8px 6px', backgroundColor: '#F1F5F9', borderLeft: '1px solid #CBD5E1', fontSize: '0.72rem', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center' }}>
                        điểm
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setSubModalType(null)}
                    style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#4A2E2B', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(74, 46, 43, 0.25)' }}
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

            {/* Sub-modal Điều Chỉnh Kết Quả KPI (Custom Result Sub-modal) */}
      {customResultModalOpen && selectedKpiForCustom && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 3600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setCustomResultModalOpen(false)}
        >
          <div
            style={{
              position: 'relative',
              width: '380px',
              maxWidth: '95vw',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              padding: '18px 20px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
              border: '1px solid #E2E8F0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #EADCC9', paddingBottom: '10px', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: '800', color: '#7B5233' }}>
                  Điều chỉnh Kết quả KPI
                </h3>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B', marginTop: '3px' }}>
                  {selectedKpiForCustom.target}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomResultModalOpen(false)}
                style={{ border: 'none', background: '#F1F5F9', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form - Chỉ cần ô nhận thay đổi với % cố định */}
            <form onSubmit={handleSaveCustomResult}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  Kết quả hiện tại:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={customForm.custom_value}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = parseFloat(val);
                      setCustomForm(prev => ({
                        ...prev,
                        custom_value: val,
                        custom_actual: val ? `${val}%` : '',
                        custom_score: !isNaN(num) ? num : 0
                      }));
                    }}
                    placeholder="Nhập số (VD: 95 hoặc 100)"
                    autoFocus
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1.5px solid #7B5233',
                      borderRight: 'none',
                      borderTopLeftRadius: '6px',
                      borderBottomLeftRadius: '6px',
                      fontSize: '1rem',
                      fontWeight: '800',
                      color: '#1E293B',
                      outline: 'none'
                    }}
                    required
                  />
                  <div style={{
                    padding: '8px 14px',
                    backgroundColor: '#FAF7F2',
                    border: '1.5px solid #7B5233',
                    borderLeft: '1px solid #EADCC9',
                    borderTopRightRadius: '6px',
                    borderBottomRightRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: '800',
                    color: '#7B5233',
                    userSelect: 'none'
                  }}>
                    %
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                <div>
                  {selectedKpiForCustom.is_custom && (
                    <button
                      type="button"
                      onClick={handleResetCustomResult}
                      disabled={customSaving}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        color: '#DC2626',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      <RotateCcw size={12} /> Khôi phục
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => setCustomResultModalOpen(false)}
                    disabled={customSaving}
                    style={{
                      padding: '6px 14px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={customSaving}
                    style={{
                      padding: '6px 18px',
                      border: 'none',
                      backgroundColor: '#7B5233',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      color: '#FFFFFF',
                      cursor: 'pointer'
                    }}
                  >
                    {customSaving ? 'Đang lưu...' : 'Lưu kết quả'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-modal Bằng Chứng Xác Thực KPI (Audit Trail Evidence Sub-modal) */}
      {evidenceModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 3500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setEvidenceModalOpen(false)}
        >
          <div
            style={{
              position: 'relative',
              width: '850px',
              maxWidth: '95vw',
              maxHeight: '88vh',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #E2E8F0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#5D3B32', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={20} color="#5D3B32" />
                  BẰNG CHỨNG XÁC THỰC KPI: {evidenceData?.kpi_code || ''} - {evidenceData?.kpi_name || ''}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: '500' }}>
                  Hệ thống truy xuất dữ liệu gốc xác thực 1:1 từ CSDL SmartFlow
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEvidenceModalOpen(false)}
                style={{ border: 'none', background: '#F1F5F9', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            {evidenceLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                Đang truy xuất bản ghi dữ liệu gốc...
              </div>
            ) : evidenceData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', paddingRight: '4px' }}>
                {/* Information Card */}
                <div style={{ backgroundColor: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: '8px', padding: '12px 16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                    <div><strong>Mục tiêu:</strong> <span style={{ color: '#15803D', fontWeight: '700' }}>{evidenceData.target}</span></div>
                    <div><strong>Nhóm dữ liệu:</strong> <span style={{ color: '#5D3B32', fontWeight: '700' }}>Nhóm {evidenceData.category}</span></div>
                    <div style={{ gridColumn: 'span 2' }}><strong>Công thức tính:</strong> <span style={{ color: '#334155' }}>{evidenceData.calc_method || 'Truy xuất theo kết quả thực tế'}</span></div>
                    <div style={{ gridColumn: 'span 2', marginTop: '4px', borderTop: '1px dashed #CBD5E1', paddingTop: '6px' }}>
                      <strong style={{ color: '#0369A1' }}>📌 Tổng kết dữ liệu xác thực:</strong> <span style={{ color: '#0F172A', fontWeight: '700' }}>{evidenceData.summary_text}</span>
                    </div>
                  </div>
                </div>

                {/* Raw Records Table */}
                <div style={{ border: '1px solid #CBD5E1', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px', width: '45px', textAlign: 'center' }}>STT</th>
                        <th style={{ padding: '8px 10px', width: '110px' }}>Mã Phiếu</th>
                        <th style={{ padding: '8px 10px' }}>Nội dung / Tiêu đề</th>
                        <th style={{ padding: '8px 10px', width: '120px' }}>Thời gian</th>
                        <th style={{ padding: '8px 10px', width: '120px', textAlign: 'center' }}>Kết quả</th>
                        <th style={{ padding: '8px 10px', width: '110px' }}>Người thực hiện</th>
                        <th style={{ padding: '8px 10px', width: '90px', textAlign: 'center' }}>Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evidenceData.records && evidenceData.records.length > 0 ? (
                        evidenceData.records.map((rec, idx) => (
                          <tr key={rec.id || idx} style={{ borderTop: '1px solid #E2E8F0', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748B', fontWeight: '700' }}>{idx + 1}</td>
                            <td style={{ padding: '8px 10px', fontWeight: '800', color: '#5D3B32' }}>{rec.code}</td>
                            <td style={{ padding: '8px 10px', color: '#1E293B', fontWeight: '600' }}>
                              <div>{rec.title}</div>
                              {rec.note && <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>{rec.note}</div>}
                            </td>
                            <td style={{ padding: '8px 10px', color: '#475569' }}>{rec.date}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              {(() => {
                                const resStr = String(rec.result || '');
                                let rateVal = null;
                                const mNum = resStr.match(/(\d+(?:\.\d+)?)/);
                                if (mNum) {
                                  rateVal = parseFloat(mNum[1]);
                                }

                                let bgColor = '#FEF2F2';
                                let textColor = '#DC2626';
                                let borderColor = '#FECACA';

                                const isPassSignal = resStr.includes('PASS') || resStr.includes('Đạt') || resStr.includes('đúng hạn') || resStr.includes('Loại A') || resStr.includes('Loại B') || resStr.includes('Hoàn thành') || resStr.includes('tuân thủ');

                                if (rateVal !== null && !isNaN(rateVal)) {
                                  if (rateVal >= 90 || isPassSignal) {
                                    bgColor = '#F0FDF4'; textColor = '#15803D'; borderColor = '#BBF7D0';
                                  } else if (rateVal >= 80 || resStr.includes('Loại C')) {
                                    bgColor = '#FFFBEB'; textColor = '#D97706'; borderColor = '#FDE68A';
                                  }
                                } else if (isPassSignal) {
                                  bgColor = '#F0FDF4'; textColor = '#15803D'; borderColor = '#BBF7D0';
                                }

                                return (
                                  <div>
                                    <span style={{
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      fontWeight: '800',
                                      fontSize: '0.75rem',
                                      backgroundColor: bgColor,
                                      color: textColor,
                                      border: `1px solid ${borderColor}`,
                                      display: 'inline-block'
                                    }}>
                                      {rec.result}
                                    </span>
                                    {rec.sample_qty !== undefined && rec.sample_qty > 0 ? (
                                      <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px', fontWeight: '500' }}>
                                        (Kiểm {rec.sample_qty}, Lỗi {rec.error_qty})
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })()}
                            </td>
                            <td style={{ padding: '8px 10px', color: '#334155', fontWeight: '500' }}>{rec.performer}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              {(() => {
                                const hasValidImg = (() => {
                                  const imgData = rec.images;
                                  if (!imgData) return false;
                                  if (Array.isArray(imgData)) {
                                    return imgData.length > 0 && imgData.some(url => url && String(url).trim() !== '[]' && String(url).trim() !== '{}');
                                  }
                                  if (typeof imgData === 'string') {
                                    const s = imgData.trim();
                                    if (!s || s === '[]' || s === '{}' || s === 'null' || s === 'undefined') return false;
                                    if (s.startsWith('[')) {
                                      try {
                                        const parsed = JSON.parse(s);
                                        if (Array.isArray(parsed)) return parsed.length > 0 && parsed.some(url => url && String(url).trim() !== '[]');
                                      } catch (e) { return false; }
                                    }
                                    return true;
                                  }
                                  return false;
                                })();

                                if (hasValidImg) {
                                  let imgUrl = rec.images;
                                  if (typeof imgUrl === 'string' && imgUrl.startsWith('[')) {
                                    try {
                                      const parsed = JSON.parse(imgUrl);
                                      if (Array.isArray(parsed) && parsed.length > 0) imgUrl = parsed[0];
                                    } catch (e) {}
                                  } else if (Array.isArray(imgUrl) && imgUrl.length > 0) {
                                    imgUrl = imgUrl[0];
                                  }
                                  const fullSrc = getFullImageUrl(imgUrl);

                                  return (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <img
                                        src={fullSrc}
                                        alt="Bằng chứng"
                                        onClick={() => setPreviewImage(fullSrc)}
                                        onError={(e) => {
                                          e.target.onerror = null;
                                          e.target.style.display = 'none';
                                        }}
                                        style={{
                                          width: '48px',
                                          height: '48px',
                                          objectFit: 'cover',
                                          borderRadius: '6px',
                                          border: '2px solid #F59E0B',
                                          cursor: 'pointer',
                                          boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                                          backgroundColor: '#F8FAFC'
                                        }}
                                        title="Bấm vào ảnh để phóng to"
                                      />
                                    </div>
                                  );
                                }

                                if (rec.nav_url) {
                                  return (
                                    <a
                                      href={rec.nav_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: '#2563EB', textDecoration: 'none', fontWeight: '700', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                                    >
                                      Xem ↗
                                    </a>
                                  );
                                }

                                return <span style={{ color: '#94A3B8' }}>-</span>;
                              })()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontWeight: '500' }}>
                            {evidenceData.summary_text || 'Chưa phát sinh bản ghi nghiệp vụ nào cho nhân sự này trong khoảng thời gian được chọn.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Sub-modal Xem Ảnh Bằng Chứng Vi Phạm (Lightbox) */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(4px)',
            zIndex: 4000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => {
            setPreviewImage(null);
            setImageError(false);
          }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              minWidth: '360px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '18px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '14px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#7B5233', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ImageIcon size={18} /> Ảnh bằng chứng vi phạm QC
              </h4>
              <button
                type="button"
                onClick={() => {
                  setPreviewImage(null);
                  setImageError(false);
                }}
                style={{
                  border: 'none',
                  background: '#F1F5F9',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {imageError || (typeof previewImage === 'string' && previewImage.startsWith('blob:')) ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', backgroundColor: '#FEF2F2', borderRadius: '10px', border: '1px solid #FECACA', color: '#991B1B', maxWidth: '440px' }}>
                <AlertTriangle size={36} style={{ color: '#DC2626', marginBottom: '8px' }} />
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: '800', color: '#991B1B' }}>
                  Ảnh bằng chứng không khả dụng
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#7F1D1D', lineHeight: '1.5' }}>
                  Bản ghi này lưu liên kết ảnh tạm thời <code>blob:</code> từ bộ nhớ ứng dụng mobile cũ và đã hết hạn.<br/><br/>
                  💡 <em>Đã cập nhật hệ thống: Mọi ảnh vi phạm tải lên từ bây giờ sẽ tự động được mã hóa Base64 vĩnh viễn trong Database.</em>
                </p>
              </div>
            ) : (
              <img
                src={previewImage}
                alt="Bằng chứng vi phạm"
                style={{
                  maxWidth: '100%',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1'
                }}
                onError={() => setImageError(true)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KPITaskDetailModal;

