import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Search, Plus, Trash2, Edit2, AlertTriangle, HelpCircle, Lock, Upload, Download, FileDown, ChevronDown, ChevronUp, Check, X, ImageIcon } from 'lucide-react';
import api from '@webShared/Services/api.service';
import ExcelJS from 'exceljs';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';

const KPIReportsView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [expandedEmpId, setExpandedEmpId] = useState(null);
  const [activeTab, setActiveTab] = useState('performance'); // checklist, kpi, performance, rules, feedback
  const [checklistPool, setChecklistPool] = useState([]);
  const [kpiPool, setKpiPool] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    employees: true,
    checklists: true,
    kpis: true,
    violations: true
  });
  
  // Data for the expanded employee
  const [checklists, setChecklists] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [otherKpiScores, setOtherKpiScores] = useState([]);
  const [violations, setViolations] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  
  // Search state for employee list
  const [empSearch, setEmpSearch] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Loaders
  const [loadingEmp, setLoadingEmp] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const { toast } = useToast();
  const setMessage = (msg) => {
    if (msg) {
      toast(msg.type, msg.text);
    }
  };
  const [showKhacDropdown, setShowKhacDropdown] = useState(false);

  // Checklist CRUD States
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [checklistFormData, setChecklistFormData] = useState({
    task_code: '',
    content: '',
    frequency: 'Hàng ngày',
    status_today: 'Chưa hoàn thành',
    perform_count: 0,
    last_performed: '-',
    result: '-',
    points: 10
  });

  // KPI CRUD States
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [editingKpi, setEditingKpi] = useState(null);
  const [kpiFormData, setKpiFormData] = useState({
    kpi_code: '',
    content: '',
    score: 50,
    calc_method: '',
    target: '',
    actual: '',
    status: 'Đạt KPI',
    icon: 'check'
  });

  // Shared Confirm Modal
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    type: 'delete',
    onConfirm: null
  });

  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    setCustomScreenCode('AD7');
    setCustomTitle('Báo cáo KPI');
    setCustomSubtitle('Hệ thống tổng hợp đánh giá và theo dõi hiệu suất năng suất lao động.');
    fetchEmployees();
    fetchPools();
  }, []);

  const fetchPools = async () => {
    try {
      const cp = await api.get('/kpi-management/checklist-pool');
      setChecklistPool(cp || []);
      const kp = await api.get('/kpi-management/kpi-pool');
      setKpiPool(kp || []);
    } catch (err) {
      console.error('Lỗi khi tải danh mục mẫu:', err);
    }
  };

  const handleConfirmExport = async () => {
    const workbook = new ExcelJS.Workbook();
    try {
      const data = await api.get('/kpi-management/export-data');
      if (!data) throw new Error("Không lấy được dữ liệu xuất báo cáo.");

      if (exportOptions.employees && data.employees) {
        const sheet1 = workbook.addWorksheet('Danh sách hiệu suất');
        sheet1.columns = [
          { header: 'Mã Nhân Viên', key: 'employee_id', width: 15 },
          { header: 'Họ và tên', key: 'full_name', width: 25 },
          { header: 'Bộ phận', key: 'department', width: 20 },
          { header: 'Chức vụ', key: 'position', width: 20 },
          { header: 'Hiệu suất KPI', key: 'kpi_performance', width: 20 },
          { header: 'Tiến độ Checklist', key: 'checklist_progress', width: 15 },
          { header: 'Xếp loại', key: 'rating', width: 15 },
          { header: 'Số lỗi vi phạm', key: 'violations_count', width: 15 },
          { header: 'Thay đổi điểm', key: 'points_change', width: 15 }
        ];
        data.employees.forEach(emp => sheet1.addRow(emp));
      }

      if (exportOptions.checklists && data.checklists) {
        const sheet2 = workbook.addWorksheet('Chi tiết Checklist');
        sheet2.columns = [
          { header: 'Mã Nhân Viên', key: 'employee_id', width: 15 },
          { header: 'Họ và tên', key: 'full_name', width: 25 },
          { header: 'Mã công việc', key: 'task_code', width: 15 },
          { header: 'Nội dung công việc', key: 'content', width: 30 },
          { header: 'Tần suất', key: 'frequency', width: 15 },
          { header: 'Trạng thái', key: 'status_today', width: 15 },
          { header: 'Số lần', key: 'perform_count', width: 10 },
          { header: 'Kết quả', key: 'result', width: 20 },
          { header: 'Ngày làm gần nhất', key: 'last_performed', width: 18 },
          { header: 'Điểm cộng', key: 'points', width: 12 }
        ];
        data.checklists.forEach(check => sheet2.addRow(check));
      }

      if (exportOptions.kpis && data.kpis) {
        const sheet3 = workbook.addWorksheet('Chi tiết KPI');
        sheet3.columns = [
          { header: 'Mã Nhân Viên', key: 'employee_id', width: 15 },
          { header: 'Họ và tên', key: 'full_name', width: 25 },
          { header: 'Mã KPI', key: 'kpi_code', width: 15 },
          { header: 'Chỉ số KPI', key: 'content', width: 30 },
          { header: 'Điểm số', key: 'score', width: 10 },
          { header: 'Cách tính / Đo lường', key: 'calc_method', width: 40 },
          { header: 'Mục tiêu', key: 'target', width: 15 },
          { header: 'Thực tế đạt', key: 'actual', width: 15 },
          { header: 'Trạng thái', key: 'status', width: 15 }
        ];
        data.kpis.forEach(kpi => sheet3.addRow(kpi));
      }

      if (exportOptions.violations && data.violations) {
        const sheet4 = workbook.addWorksheet('Nhật ký vi phạm');
        sheet4.columns = [
          { header: 'Mã Nhân Viên', key: 'employee_id', width: 15 },
          { header: 'Họ và tên', key: 'full_name', width: 25 },
          { header: 'Mã VP', key: 'violation_code', width: 12 },
          { header: 'Nội dung sự việc / Hành vi', key: 'content', width: 30 },
          { header: 'Ảnh hưởng', key: 'impact', width: 15 },
          { header: 'Cộng/Trừ điểm', key: 'calculation', width: 15 },
          { header: 'Thời gian', key: 'violation_time', width: 18 },
          { header: 'Người thực hiện', key: 'performer', width: 20 },
          { header: 'Ghi chú', key: 'note', width: 30 }
        ];
        data.violations.forEach(viol => sheet4.addRow(viol));
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Bao_Cao_KPI_Nhan_Su_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);

      setMessage({ type: 'success', text: 'Xuất báo cáo Excel thành công.' });
      setShowExportModal(false);
    } catch (err) {
      console.error("Lỗi khi xuất excel:", err);
      setMessage({ type: 'error', text: 'Có lỗi xảy ra khi tạo tệp Excel.' });
    }
  };

  const fetchEmployees = async () => {
    setLoadingEmp(true);
    try {
      const res = await api.get('/kpi-management/employees');
      setEmployees(res || []);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Không thể tải danh sách nhân sự.' });
    } finally {
      setLoadingEmp(false);
    }
  };

  const fetchAllDetailsForEmp = async (empId) => {
    setLoadingDetails(true);
    try {
      const [resCheck, resKpi, resViol, resFeed] = await Promise.all([
        api.get(`/kpi-management/checklists?employee_id=${empId}`),
        api.get(`/kpi-management/employee-items?employee_id=${empId}`),
        api.get(`/kpi-management/violations?employee_id=${empId}`),
        api.get(`/kpi-management/feedbacks?employee_id=${empId}`)
      ]);
      setChecklists(resCheck || []);
      setKpis(resKpi || []);
      setViolations(resViol || []);
      setFeedbacks(resFeed || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const toggleRow = (empId) => {
    if (expandedEmpId === empId) {
      setExpandedEmpId(null);
    } else {
      setExpandedEmpId(empId);
      fetchAllDetailsForEmp(empId);
    }
  };

  // Checklist Actions
  const handleOpenChecklistModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setChecklistFormData({
        task_code: task.task_code,
        content: task.content,
        frequency: task.frequency,
        status_today: task.status_today,
        perform_count: task.perform_count,
        last_performed: task.last_performed || '-',
        result: task.result || '-',
        points: task.points
      });
    } else {
      setEditingTask(null);
      const nextNum = checklists.length + 1;
      const nextCode = `CV${nextNum < 10 ? '0' + nextNum : nextNum}`;
      
      const defaultTask = checklistPool.length > 0 ? checklistPool[0] : { content: '', frequency: 'Hàng ngày', points: 10 };
      setChecklistFormData({
        task_code: nextCode,
        content: defaultTask.content,
        frequency: defaultTask.frequency,
        status_today: 'Chưa hoàn thành',
        perform_count: 0,
        last_performed: '-',
        result: '-',
        points: defaultTask.points
      });
    }
    setShowChecklistModal(true);
  };

  const handleSelectChecklistChange = (e) => {
    const selectedTitle = e.target.value;
    const taskDetails = checklistPool.find(t => t.content === selectedTitle);
    if (taskDetails) {
      setChecklistFormData(prev => ({
        ...prev,
        content: selectedTitle,
        frequency: taskDetails.frequency,
        points: taskDetails.points
      }));
    } else {
      setChecklistFormData(prev => ({
        ...prev,
        content: selectedTitle
      }));
    }
  };

  const handleSaveChecklist = () => {
    if (!checklistFormData.task_code.trim() || !checklistFormData.content.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin.' });
      return;
    }

    const actionText = editingTask ? 'Cập nhật' : 'Thêm mới';
    setConfirmModal({
      show: true,
      title: `Xác nhận ${actionText}`,
      message: `Bạn có muốn ${actionText.toLowerCase()} công việc "${checklistFormData.content}" không?`,
      type: 'add',
      onConfirm: async () => {
        try {
          if (editingTask) {
            await api.put(`/kpi-management/checklists/${editingTask.id}`, checklistFormData);
            setMessage({ type: 'success', text: 'Cập nhật công việc thành công.' });
          } else {
            await api.post('/kpi-management/checklists', {
              ...checklistFormData,
              employee_id: expandedEmpId
            });
            setMessage({ type: 'success', text: 'Thêm công việc thành công.' });
          }
          setShowChecklistModal(false);
          fetchAllDetailsForEmp(expandedEmpId);
        } catch (err) {
          console.error(err);
          setMessage({ type: 'error', text: 'Không thể lưu công việc.' });
        }
      }
    });
  };

  const handleDeleteChecklist = (task) => {
    setConfirmModal({
      show: true,
      title: 'Xác nhận xóa công việc',
      message: `Bạn có chắc muốn xóa công việc "${task.content}" (${task.task_code})?`,
      type: 'delete',
      onConfirm: async () => {
        try {
          await api.delete(`/kpi-management/checklists/${task.id}`);
          setMessage({ type: 'success', text: 'Đã xóa công việc thành công.' });
          fetchAllDetailsForEmp(expandedEmpId);
        } catch (err) {
          console.error(err);
          setMessage({ type: 'error', text: 'Không thể xóa công việc.' });
        }
      }
    });
  };

  // KPI Actions
  const handleOpenKpiModal = (kpi = null) => {
    if (kpi) {
      setEditingKpi(kpi);
      setKpiFormData({
        kpi_code: kpi.kpi_code,
        content: kpi.content,
        score: kpi.score,
        calc_method: kpi.calc_method,
        target: kpi.target,
        actual: kpi.actual || '',
        status: kpi.status || 'Đạt KPI',
        icon: kpi.icon || 'check'
      });
      // Lấy danh sách các KPI khác của nhân viên
      const otherKpis = kpis.filter(k => k.id !== kpi.id).map(k => ({
        id: k.id,
        kpi_code: k.kpi_code,
        content: k.content,
        score: k.score
      }));
      setOtherKpiScores(otherKpis);
    } else {
      setEditingKpi(null);
      const nextNum = kpis.length + 1;
      const nextCode = `KPI${nextNum < 10 ? '0' + nextNum : nextNum}`;
      
      const defaultKpi = kpiPool.length > 0 ? kpiPool[0] : { content: '', score: 50, calc_method: '', target: '' };
      setKpiFormData({
        kpi_code: nextCode,
        content: defaultKpi.content,
        score: defaultKpi.score,
        calc_method: defaultKpi.calc_method,
        target: defaultKpi.target,
        actual: '',
        status: 'Đạt KPI',
        icon: 'check'
      });
      // Lấy toàn bộ danh sách KPI hiện có
      const otherKpis = kpis.map(k => ({
        id: k.id,
        kpi_code: k.kpi_code,
        content: k.content,
        score: k.score
      }));
      setOtherKpiScores(otherKpis);
    }
    setShowKpiModal(true);
  };

  const handleSelectKpiChange = (e) => {
    const selectedTitle = e.target.value;
    const kpiDetails = kpiPool.find(k => k.content === selectedTitle);
    if (kpiDetails) {
      setKpiFormData(prev => ({
        ...prev,
        content: selectedTitle,
        score: kpiDetails.score,
        calc_method: kpiDetails.calc_method,
        target: kpiDetails.target
      }));
    } else {
      setKpiFormData(prev => ({
        ...prev,
        content: selectedTitle
      }));
    }
  };

  const handleSaveKpi = () => {
    if (!kpiFormData.kpi_code.trim() || !kpiFormData.content.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ thông tin chỉ số KPI.' });
      return;
    }

    const sumOfOthers = otherKpiScores.reduce((sum, item) => sum + (item.score || 0), 0);
    const totalScoreProposed = (parseInt(kpiFormData.score) || 0) + sumOfOthers;
    if (totalScoreProposed > 100) {
      setMessage({
        type: 'error',
        text: `Không thể lưu! Tổng điểm KPI của nhân viên sau khi đổi sẽ là ${totalScoreProposed}đ, vượt quá mức tối đa 100đ.`
      });
      return;
    }

    const actionText = editingKpi ? 'Cập nhật' : 'Thêm mới';
    setConfirmModal({
      show: true,
      title: `Xác nhận ${actionText}`,
      message: `Bạn có muốn ${actionText.toLowerCase()} chỉ số KPI "${kpiFormData.content}" không?`,
      type: 'add',
      onConfirm: async () => {
        try {
          // Lưu điểm các chỉ tiêu khác nếu có thay đổi
          for (const otherKpi of otherKpiScores) {
            const original = kpis.find(k => k.id === otherKpi.id);
            if (original && original.score !== otherKpi.score) {
              await api.put(`/kpi-management/employee-items/${otherKpi.id}`, {
                ...original,
                score: otherKpi.score
              });
            }
          }

          if (editingKpi) {
            await api.put(`/kpi-management/employee-items/${editingKpi.id}`, kpiFormData);
            setMessage({ type: 'success', text: 'Cập nhật chỉ số KPI thành công.' });
          } else {
            await api.post('/kpi-management/employee-items', {
              ...kpiFormData,
              employee_id: expandedEmpId
            });
            setMessage({ type: 'success', text: 'Thêm chỉ số KPI thành công.' });
          }
          setShowKpiModal(false);
          fetchAllDetailsForEmp(expandedEmpId);
        } catch (err) {
          console.error(err);
          setMessage({ type: 'error', text: 'Không thể lưu chỉ số KPI.' });
        }
      }
    });
  };

  const handleDeleteKpi = (kpi) => {
    setConfirmModal({
      show: true,
      title: 'Xác nhận xóa chỉ số KPI',
      message: `Bạn có chắc muốn xóa chỉ số KPI "${kpi.content}" (${kpi.kpi_code})?`,
      type: 'delete',
      onConfirm: async () => {
        try {
          await api.delete(`/kpi-management/employee-items/${kpi.id}`);
          setMessage({ type: 'success', text: 'Đã xóa chỉ số KPI thành công.' });
          fetchAllDetailsForEmp(expandedEmpId);
        } catch (err) {
          console.error(err);
          setMessage({ type: 'error', text: 'Không thể xóa chỉ số KPI.' });
        }
      }
    });
  };

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(empSearch.toLowerCase()) ||
    emp.employee_id.toLowerCase().includes(empSearch.toLowerCase())
  );

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;
  const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ padding: '15px 20px', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
        


      {/* Toolbar filter */}
      <div className="card" style={{ background: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #EADCC9', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <input 
            type="text" 
            placeholder="Nhập Họ và tên hoặc Mã NV" 
            value={empSearch}
            onChange={(e) => { setEmpSearch(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid #EADCC9', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
          />
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#7B5233' }} />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowKhacDropdown(!showKhacDropdown)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: 'none', borderRadius: '8px', backgroundColor: '#7B5233', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
            >
              Khác ▾
            </button>
            {showKhacDropdown && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '5px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #EADCC9', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, width: '200px', display: 'flex', flexDirection: 'column', padding: '6px' }}>
                <button onClick={() => { setShowKhacDropdown(false); navigate('/admin/kpi/checklist'); }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#7B5233', borderRadius: '4px' }}>Checklist công việc</button>
                <button onClick={() => { setShowKhacDropdown(false); navigate('/admin/kpi/list'); }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#7B5233', borderRadius: '4px' }}>Danh sách KPI</button>
                <button onClick={() => { setShowKhacDropdown(false); navigate('/admin/kpi/rules'); }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#7B5233', borderRadius: '4px' }}>Quy tắc cộng trừ điểm</button>
                <button onClick={() => { setShowKhacDropdown(false); navigate('/admin/kpi/feedback'); }} style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#7B5233', borderRadius: '4px' }}>Phản hồi và nhận xét</button>
              </div>
            )}
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', border: '1px solid #EADCC9', borderRadius: '8px', backgroundColor: '#fff', color: '#7B5233', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
            <Upload size={14} /> Nhập dữ liệu
          </button>
          <button onClick={() => setShowExportModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', border: '1px solid #EADCC9', borderRadius: '8px', backgroundColor: '#fff', color: '#7B5233', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
            <Download size={14} /> Xuất dữ liệu
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: 'none', borderRadius: '8px', backgroundColor: '#7B5233', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
            <Plus size={14} /> Thêm mới
          </button>
        </div>
      </div>

      {/* Master Table of Employees */}
      <div className="admin-list-layout">
        <div className="mgmt-table card admin-table-card" style={{ padding: '16px' }}>
          {loadingEmp ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải danh sách nhân sự...</div>
          ) : filteredEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Không tìm thấy nhân viên phù hợp.</div>
          ) : (
            <>
              <div className="table-responsive desktop-only admin-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th style={{ width: '120px' }}>Mã NV</th>
                    <th>Họ và tên</th>
                    <th>Bộ phận</th>
                    <th>Chức vụ</th>
                    <th>Ngày tạo</th>
                    <th style={{ width: '130px', minWidth: '130px', textAlign: 'center' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map((emp) => {
                    const isExpanded = expandedEmpId === emp.employee_id;
                    return (
                      <React.Fragment key={emp.employee_id}>
                        <tr 
                          onClick={() => toggleRow(emp.employee_id)}
                          style={{ cursor: 'pointer', backgroundColor: isExpanded ? '#FAF6F0' : 'transparent' }}
                        >
                          <td>
                            {isExpanded ? <ChevronUp size={16} style={{ color: '#7B5233' }} /> : <ChevronDown size={16} style={{ color: '#7B5233' }} />}
                          </td>
                          <td style={{ fontWeight: '700', color: '#7B5233' }}>{emp.employee_id}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '14px', backgroundColor: '#7B5233', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '11px' }}>
                                {emp.full_name.substring(0, 1).toUpperCase()}
                              </div>
                              <span style={{ fontWeight: '600', color: '#1e293b' }}>{emp.full_name}</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: '500' }}>{emp.department}</td>
                          <td>{emp.position}</td>
                          <td>{emp.created_at}</td>
                          <td style={{ textAlign: 'center', width: '130px', minWidth: '130px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                              backgroundColor: emp.status === 'Đang sử dụng' ? '#dcfce7' : '#fee2e2',
                              color: emp.status === 'Đang sử dụng' ? '#15803d' : '#b91c1c',
                              display: 'inline-block',
                              whiteSpace: 'nowrap'
                            }}>
                              {emp.status}
                            </span>
                          </td>
                        </tr>

                        {/* Row Expansion - Sub panel with 5 TABS */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} style={{ backgroundColor: '#FAF6F0', padding: '16px' }}>
                              <div className="card" style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #EADCC9' }}>
                                
                                {/* Tabs Header */}
                                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #EADCC9', marginBottom: '15px', paddingBottom: '2px' }}>
                                  {[
                                    { key: 'performance', label: 'Xem hiệu suất' },
                                    { key: 'checklist', label: 'Checklist Công Việc' },
                                    { key: 'kpi', label: 'KPI Nhân Sự' },
                                    { key: 'rules', label: 'Xem vi phạm' },
                                    { key: 'feedback', label: 'Phản hồi và nhận xét' }
                                  ].map(tab => (
                                    <button
                                      key={tab.key}
                                      onClick={() => setActiveTab(tab.key)}
                                      style={{
                                        padding: '8px 16px', border: 'none', borderRadius: '6px 6px 0 0',
                                        cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
                                        backgroundColor: activeTab === tab.key ? '#FAF6F0' : 'transparent',
                                        color: activeTab === tab.key ? '#7B5233' : '#64748b',
                                        borderBottom: activeTab === tab.key ? '2px solid #7B5233' : 'none'
                                      }}
                                    >
                                      {tab.label}
                                    </button>
                                  ))}
                                </div>

                                {loadingDetails ? (
                                  <div style={{ textAlign: 'center', padding: '25px', color: '#94a3b8', fontSize: '13px' }}>Đang tải dữ liệu chi tiết...</div>
                                ) : (
                                  <div>
                                    
                                    {/* TAB 1: CHECKLIST WITH CRUD */}
                                    {activeTab === 'checklist' && (
                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#7B5233' }}>Danh sách công việc</span>
                                          <button 
                                            onClick={() => handleOpenChecklistModal(null)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}
                                          >
                                            <Plus size={12} /> Thêm công việc
                                          </button>
                                        </div>
                                        <table className="data-table" style={{ fontSize: '12px' }}>
                                          <thead>
                                            <tr>
                                              <th style={{ width: '60px' }}>Mã</th>
                                              <th>Nội dung</th>
                                              <th style={{ width: '95px' }}>Tần suất</th>
                                              <th style={{ width: '130px' }}>Trạng thái hôm nay</th>
                                              <th style={{ width: '80px', textAlign: 'center' }}>Số lần thực hiện</th>
                                              <th style={{ width: '135px' }}>Ngày thực hiện gần nhất</th>
                                              <th>Kết quả</th>
                                              <th style={{ width: '60px', textAlign: 'center' }}>Điểm</th>
                                              <th style={{ width: '80px', textAlign: 'center' }}>Icon</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {checklists.map(task => (
                                              <tr key={task.id}>
                                                <td style={{ fontWeight: '700', color: '#7B5233' }}>{task.task_code}</td>
                                                <td style={{ fontWeight: '600' }}>{task.content}</td>
                                                <td>{task.frequency}</td>
                                                <td>
                                                  <span style={{
                                                    padding: '2px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold',
                                                    backgroundColor: task.status_today === 'Đã hoàn thành' ? '#dcfce7' : '#fee2e2',
                                                    color: task.status_today === 'Đã hoàn thành' ? '#15803d' : '#b91c1c'
                                                  }}>
                                                    {task.status_today}
                                                  </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>{task.perform_count}</td>
                                                <td>{task.last_performed}</td>
                                                <td>{task.result}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#15803d' }}>+{task.points}</td>
                                                <td>
                                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                    <button onClick={() => handleOpenChecklistModal(task)} style={{ display: 'flex', padding: '4px', borderRadius: '4px', border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#475569' }}><Edit2 size={12} /></button>
                                                    <button onClick={() => handleDeleteChecklist(task)} style={{ display: 'flex', padding: '4px', borderRadius: '4px', border: 'none', background: '#fee2e2', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={12} /></button>
                                                  </div>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}

                                    {/* TAB 2: KPI LIST WITH CRUD */}
                                    {activeTab === 'kpi' && (
                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#7B5233' }}>Danh sách chỉ số KPI</span>
                                          <button 
                                            onClick={() => handleOpenKpiModal(null)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}
                                          >
                                            <Plus size={12} /> Thêm chỉ số KPI
                                          </button>
                                        </div>
                                        {(() => {
                                          const totalKpiScore = kpis.reduce((sum, item) => sum + (item.score || 0), 0);
                                          if (totalKpiScore === 100) return null;
                                          return (
                                            <div style={{
                                              padding: '10px 14px',
                                              borderRadius: '8px',
                                              marginBottom: '12px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              fontSize: '12px',
                                              fontWeight: '600',
                                              backgroundColor: '#fef2f2',
                                              border: '1px solid #fecaca',
                                              color: '#991b1b'
                                            }}>
                                              <div>
                                                <span>⚠️ Tổng số điểm KPI hiện tại: <strong>{totalKpiScore} / 100đ</strong>. Yêu cầu tổng điểm của tất cả chỉ số phải bằng 100đ. Vui lòng điều chỉnh lại điểm của các chỉ số.</span>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                        <table className="data-table" style={{ fontSize: '12px' }}>
                                          <thead>
                                            <tr>
                                              <th style={{ width: '60px' }}>Mã KPI</th>
                                              <th>Nội dung KPI</th>
                                              <th style={{ width: '60px', textAlign: 'center' }}>Điểm</th>
                                              <th>Công thức đo lường</th>
                                              <th style={{ width: '110px' }}>Mục tiêu</th>
                                              <th style={{ width: '100px' }}>Kết quả đạt</th>
                                              <th style={{ width: '110px' }}>Trạng thái</th>
                                              <th style={{ width: '60px', textAlign: 'center' }}>Icon</th>
                                              <th style={{ width: '80px', textAlign: 'center' }}>Thao tác</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {kpis.map(kpi => (
                                              <tr key={kpi.id}>
                                                <td style={{ fontWeight: '700', color: '#7B5233' }}>{kpi.kpi_code}</td>
                                                <td style={{ fontWeight: '600' }}>{kpi.content}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{kpi.score}đ</td>
                                                <td>{kpi.calc_method}</td>
                                                <td style={{ fontWeight: '600', color: '#0f766e' }}>{kpi.target}</td>
                                                <td style={{ fontWeight: '700' }}>{kpi.actual || '-'}</td>
                                                <td>
                                                  <span style={{
                                                    padding: '2px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold',
                                                    backgroundColor: kpi.status === 'Đạt KPI' ? '#dcfce7' : '#fee2e2',
                                                    color: kpi.status === 'Đạt KPI' ? '#15803d' : '#b91c1c'
                                                  }}>
                                                    {kpi.status || 'Chưa đánh giá'}
                                                  </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                  <div style={{
                                                    display: 'inline-flex', width: '18px', height: '18px', borderRadius: '9px',
                                                    backgroundColor: kpi.icon === 'check' ? '#dcfce7' : '#fee2e2',
                                                    color: kpi.icon === 'check' ? '#15803d' : '#ef4444',
                                                    alignItems: 'center', justifyContent: 'center'
                                                  }}>
                                                    {kpi.icon === 'check' ? <Check size={10} /> : <X size={10} />}
                                                  </div>
                                                </td>
                                                <td>
                                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                    <button onClick={() => handleOpenKpiModal(kpi)} style={{ display: 'flex', padding: '4px', borderRadius: '4px', border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#475569' }}><Edit2 size={12} /></button>
                                                    <button onClick={() => handleDeleteKpi(kpi)} style={{ display: 'flex', padding: '4px', borderRadius: '4px', border: 'none', background: '#fee2e2', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={12} /></button>
                                                  </div>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}

                                    {/* TAB 3: PERFORMANCE GRAPHICS */}
                                    {activeTab === 'performance' && (
                                      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', padding: '10px 0' }}>
                                        
                                        {/* Donut Chart: Mức độ hoàn thành */}
                                        <div style={{ flex: 1, minWidth: '280px', padding: '16px', border: '1px solid #FAF6F0', borderRadius: '12px', background: '#fff' }}>
                                          <h5 style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#7B5233', fontWeight: '800' }}>Mức độ hoàn thành</h5>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                            <svg width="100" height="100" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                                              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                                              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#22c55e" strokeWidth="3" strokeDasharray="30 70" strokeDashoffset="0" />
                                              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="15 85" strokeDashoffset="-30" />
                                              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray="45 55" strokeDashoffset="-45" />
                                              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="10 90" strokeDashoffset="-90" />
                                            </svg>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '2px' }}></span> Hoàn thành: 30%</div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#f59e0b', borderRadius: '2px' }}></span> Đang làm: 15%</div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '2px' }}></span> Không hoàn thành: 45%</div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#3b82f6', borderRadius: '2px' }}></span> Khác: 10%</div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Bar Chart: Hiệu suất làm việc */}
                                        <div style={{ flex: 2, minWidth: '380px', padding: '16px', border: '1px solid #FAF6F0', borderRadius: '12px', background: '#fff' }}>
                                          <h5 style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#7B5233', fontWeight: '800' }}>Hiệu suất làm việc theo tháng</h5>
                                          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '100px', padding: '0 10px', borderBottom: '2px solid #e2e8f0' }}>
                                            {[
                                              { m: 'T1', val: 70 }, { m: 'T2', val: 90 }, { m: 'T3', val: 105 },
                                              { m: 'T4', val: 110 }, { m: 'T5', val: 85 }, { m: 'T6', val: 30 },
                                              { m: 'T7', val: 95 }, { m: 'T8', val: 100 }, { m: 'T9', val: 40 },
                                              { m: 'T10', val: 20 }, { m: 'T11', val: 10 }, { m: 'T12', val: 80 }
                                            ].map(item => (
                                              <div key={item.m} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '4px' }}>
                                                <div style={{ width: '12px', height: `${item.val * 0.7}px`, backgroundColor: '#7B5233', borderRadius: '3px 3px 0 0', transition: 'height 0.3s ease' }} title={`Đạt ${item.val}%`} />
                                                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>{item.m}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                      </div>
                                    )}

                                    {/* TAB 4: VIOLATIONS */}
                                    {activeTab === 'rules' && (
                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#7B5233' }}>Danh sách vi phạm / Nhật ký cộng trừ điểm</span>
                                        </div>
                                        <table className="data-table" style={{ fontSize: '12px' }}>
                                          <thead>
                                            <tr>
                                              <th style={{ width: '60px' }}>Mã VP</th>
                                              <th>Nội dung sự việc / Hành vi</th>
                                              <th style={{ width: '90px', textAlign: 'center' }}>Ảnh hưởng</th>
                                              <th style={{ width: '120px', textAlign: 'center' }}>Điểm cộng / trừ</th>
                                              <th style={{ width: '130px' }}>Thời gian</th>
                                              <th style={{ width: '120px' }}>Người thực hiện</th>
                                              <th>Bằng chứng QC</th>
                                              <th>Ghi chú</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {violations.map(rule => {
                                              const isDeduction = rule.calculation.startsWith('-');
                                              let imagesList = [];
                                              try {
                                                if (rule.evidence_images) {
                                                  imagesList = JSON.parse(rule.evidence_images);
                                                }
                                              } catch (e) {
                                                console.error(e);
                                              }
                                              return (
                                                <tr key={rule.id}>
                                                  <td style={{ fontWeight: '700', color: '#7B5233' }}>{rule.violation_code}</td>
                                                  <td style={{ fontWeight: '600' }}>{rule.content}</td>
                                                  <td style={{ textAlign: 'center' }}>
                                                    {rule.impact === 'Cao' ? (
                                                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#fee2e2', color: '#ef4444' }}>Cao</span>
                                                    ) : rule.impact === 'Trung bình' ? (
                                                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#fef3c7', color: '#d97706' }}>T.Bình</span>
                                                    ) : rule.impact === 'Thấp' ? (
                                                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#f1f5f9', color: '#64748b' }}>Thấp</span>
                                                    ) : (
                                                      <span style={{ color: '#94a3b8' }}>-</span>
                                                    )}
                                                  </td>
                                                  <td style={{ textAlign: 'center' }}>
                                                    <span style={{
                                                      padding: '2px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: '800',
                                                      backgroundColor: isDeduction ? '#fee2e2' : '#dcfce7',
                                                      color: isDeduction ? '#ef4444' : '#15803d'
                                                    }}>
                                                      {rule.calculation} điểm
                                                    </span>
                                                  </td>
                                                  <td>{rule.violation_time}</td>
                                                  <td>{rule.performer}</td>
                                                  <td>
                                                    {imagesList.length > 0 ? (
                                                      <div style={{ display: 'flex', gap: '4px' }}>
                                                        {imagesList.map((imgUrl, i) => (
                                                          <div key={i} onClick={() => setPreviewImage(imgUrl)} style={{ width: '28px', height: '28px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF6F0', position: 'relative' }}>
                                                            <img src={imgUrl} alt="evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                                            <ImageIcon size={10} style={{ position: 'absolute', color: '#7B5233', opacity: 0.5 }} />
                                                          </div>
                                                        ))}
                                                      </div>
                                                    ) : (
                                                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>Không có</span>
                                                    )}
                                                  </td>
                                                  <td>{rule.note}</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}

                                    {/* TAB 5: FEEDBACK */}
                                    {activeTab === 'feedback' && (
                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#7B5233' }}>Phản hồi và nhận xét</span>
                                        </div>
                                        <table className="data-table" style={{ fontSize: '12px' }}>
                                          <thead>
                                            <tr>
                                              <th style={{ width: '80px' }}>Mã NX</th>
                                              <th style={{ width: '150px' }}>Phân loại nhận xét</th>
                                              <th>Nội dung nhận xét chi tiết</th>
                                              <th style={{ width: '120px' }}>Thời gian gửi</th>
                                              <th style={{ width: '150px' }}>Người nhận xét (Manager)</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {feedbacks.map(fb => (
                                              <tr key={fb.id}>
                                                <td style={{ fontWeight: '700', color: '#7B5233' }}>{fb.feedback_code}</td>
                                                <td>
                                                  <span style={{
                                                    padding: '2px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold',
                                                    backgroundColor: fb.type === 'Thành tích nổi bật' ? '#dcfce7' : (fb.type === 'Những khó khăn' ? '#fee2e2' : (fb.type === 'Hành động cải tiến' ? '#e0f2fe' : '#f3e8ff')),
                                                    color: fb.type === 'Thành tích nổi bật' ? '#15803d' : (fb.type === 'Những khó khăn' ? '#b91c1c' : (fb.type === 'Hành động cải tiến' ? '#0369a1' : '#7e22ce'))
                                                  }}>
                                                    {fb.type}
                                                  </span>
                                                </td>
                                                <td style={{ fontWeight: '600', maxWidth: '300px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{fb.content}</td>
                                                <td>{fb.feedback_time}</td>
                                                <td>{fb.reviewer}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}

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

            {/* Pagination */}
            <div className="admin-pagination-desktop" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <div style={{ fontSize: '0.85rem', color: '#7B5233', fontWeight: '600' }}>
                Hiển thị <b>{filteredEmployees.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</b> - <b>{Math.min(currentPage * itemsPerPage, filteredEmployees.length)}</b> trên <b>{filteredEmployees.length}</b> kết quả
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #EADCC9', backgroundColor: '#fff', color: '#7B5233', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, fontWeight: '700' }}
                >
                  &lt; Trước
                </button>
                {[...Array(totalPages)].map((_, idx) => (
                  <button 
                    key={idx} 
                    className={`page-btn ${currentPage === idx + 1 ? 'active' : ''}`}
                    onClick={() => setCurrentPage(idx + 1)}
                    style={{ 
                      padding: '6px 12px', borderRadius: '6px', border: '1px solid #EADCC9', 
                      backgroundColor: currentPage === idx + 1 ? '#7B5233' : '#fff', 
                      color: currentPage === idx + 1 ? '#fff' : '#7B5233',
                      fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button 
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #EADCC9', backgroundColor: '#fff', color: '#7B5233', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, fontWeight: '700' }}
                >
                  Sau &gt;
                </button>
              </div>
            </div>
          </>
        )}
        </div>
      </div>

      {/* Checklist Add/Edit Modal */}
      {showChecklistModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', width: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#7B5233', fontWeight: '800', fontSize: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              {editingTask ? `Cập nhật công việc: ${checklistFormData.task_code}` : 'Thêm công việc vào Checklist'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Mã công việc</label>
                <input type="text" value={checklistFormData.task_code} onChange={(e) => setChecklistFormData({ ...checklistFormData, task_code: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Nội dung công việc</label>
                <select 
                  value={checklistFormData.content} 
                  onChange={handleSelectChecklistChange}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
                >
                  {checklistPool.map((item, idx) => (
                    <option key={idx} value={item.content}>
                      {item.content} ({item.frequency} - +{item.points}đ)
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Tần suất</label>
                  <select value={checklistFormData.frequency} onChange={(e) => setChecklistFormData({ ...checklistFormData, frequency: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="Hàng ngày">Hàng ngày</option>
                    <option value="Hàng tuần">Hàng tuần</option>
                    <option value="Hằng tháng">Hằng tháng</option>
                    <option value="Khi phát sinh">Khi phát sinh</option>
                    <option value="Liên tục trong ca">Liên tục trong ca</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Điểm cộng</label>
                  <input type="number" value={checklistFormData.points} onChange={(e) => setChecklistFormData({ ...checklistFormData, points: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Trạng thái</label>
                  <select value={checklistFormData.status_today} onChange={(e) => setChecklistFormData({ ...checklistFormData, status_today: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="Chưa hoàn thành">Chưa hoàn thành</option>
                    <option value="Đã hoàn thành">Đã hoàn thành</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Số lần</label>
                  <input type="number" value={checklistFormData.perform_count} onChange={(e) => setChecklistFormData({ ...checklistFormData, perform_count: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Kết quả</label>
                  <input type="text" value={checklistFormData.result} onChange={(e) => setChecklistFormData({ ...checklistFormData, result: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Ngày làm gần nhất</label>
                  <input type="text" value={checklistFormData.last_performed} onChange={(e) => setChecklistFormData({ ...checklistFormData, last_performed: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowChecklistModal(false)} style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', color: '#475569' }}>Hủy bỏ</button>
              <button onClick={handleSaveChecklist} style={{ flex: 1, padding: '8px 12px', border: 'none', borderRadius: '6px', background: '#7B5233', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Add/Edit Modal */}
      {showKpiModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', width: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#7B5233', fontWeight: '800', fontSize: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              {editingKpi ? `Cập nhật chỉ tiêu: ${kpiFormData.kpi_code}` : 'Thêm chỉ tiêu KPI'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Mã KPI</label>
                <input type="text" value={kpiFormData.kpi_code} onChange={(e) => setKpiFormData({ ...kpiFormData, kpi_code: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Nội dung KPI</label>
                <select 
                  value={kpiFormData.content} 
                  onChange={handleSelectKpiChange}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
                >
                  {kpiPool.map((item, idx) => (
                    <option key={idx} value={item.content}>
                      {item.content}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Công thức tính / Đo lường</label>
                <textarea value={kpiFormData.calc_method} onChange={(e) => setKpiFormData({ ...kpiFormData, calc_method: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box', height: '50px', resize: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Mục tiêu</label>
                  <input type="text" value={kpiFormData.target} onChange={(e) => setKpiFormData({ ...kpiFormData, target: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Thực tế đạt</label>
                  <input type="text" value={kpiFormData.actual} onChange={(e) => setKpiFormData({ ...kpiFormData, actual: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Điểm số</label>
                  <input type="number" value={kpiFormData.score} onChange={(e) => setKpiFormData({ ...kpiFormData, score: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                  {(() => {
                    const totalOfOtherKpis = otherKpiScores.reduce((sum, item) => sum + (item.score || 0), 0);
                    return (
                      <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginTop: '4px', lineHeight: '1.3' }}>
                        Tổng điểm các KPI khác: <strong>{totalOfOtherKpis}đ</strong>.
                        {totalOfOtherKpis < 100 ? (
                          <span> Nên đặt <strong>{100 - totalOfOtherKpis}đ</strong> để tổng bằng 100đ.</span>
                        ) : (
                          <span style={{ color: '#ef4444' }}> Đã đạt/vượt 100đ. Cần giảm điểm KPI khác trước.</span>
                        )}
                      </span>
                    );
                  })()}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '2px' }}>Trạng thái</label>
                  <select value={kpiFormData.status} onChange={(e) => setKpiFormData({ ...kpiFormData, status: e.target.value, icon: e.target.value === 'Đạt KPI' ? 'check' : 'x' })} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="Đạt KPI">Đạt KPI</option>
                    <option value="Chưa đạt KPI">Chưa đạt KPI</option>
                  </select>
                </div>
              </div>

              {otherKpiScores.length > 0 && (
                <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', border: '1px dashed #EADCC9', backgroundColor: '#FAF6F0' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#7B5233', marginBottom: '6px' }}>
                    Điều chỉnh điểm các chỉ tiêu khác (để tổng = 100đ):
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '100px', overflowY: 'auto', paddingRight: '4px' }}>
                    {otherKpiScores.map((otherKpi, idx) => (
                      <div key={otherKpi.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#475569', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }} title={otherKpi.content}>
                          <strong>{otherKpi.kpi_code}</strong>: {otherKpi.content}
                        </span>
                        <input 
                          type="number" 
                          value={otherKpi.score} 
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setOtherKpiScores(prev => prev.map((item, i) => i === idx ? { ...item, score: val } : item));
                          }}
                          style={{ width: '60px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', outline: 'none', textAlign: 'center', boxSizing: 'border-box' }} 
                        />
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const sumOfOthers = otherKpiScores.reduce((sum, item) => sum + (item.score || 0), 0);
                    const totalScoreProposed = (parseInt(kpiFormData.score) || 0) + sumOfOthers;
                    return (
                      <div style={{
                        marginTop: '8px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textAlign: 'center',
                        backgroundColor: totalScoreProposed === 100 ? '#f0fdf4' : '#fef2f2',
                        color: totalScoreProposed === 100 ? '#15803d' : '#991b1b',
                        border: `1px solid ${totalScoreProposed === 100 ? '#bbf7d0' : '#fecaca'}`
                      }}>
                        Tổng điểm sau khi lưu: {totalScoreProposed} / 100đ {totalScoreProposed === 100 ? '(Hợp lệ)' : '(Chưa đạt 100đ)'}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowKpiModal(false)} style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', color: '#475569' }}>Hủy bỏ</button>
              <button onClick={handleSaveKpi} style={{ flex: 1, padding: '8px 12px', border: 'none', borderRadius: '6px', background: '#7B5233', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Confirm Modal */}
      {confirmModal.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 2500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', width: '380px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', backgroundColor: confirmModal.type === 'delete' ? '#fee2e2' : '#dcfce7', color: confirmModal.type === 'delete' ? '#ef4444' : '#22c55e' }}>
              {confirmModal.type === 'delete' ? <AlertTriangle size={24} /> : <HelpCircle size={24} />}
            </div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1e293b' }}>{confirmModal.title}</h4>
            <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', color: '#475569' }}>Hủy bỏ</button>
              <button onClick={async () => { setConfirmModal(prev => ({ ...prev, show: false })); if (confirmModal.onConfirm) await confirmModal.onConfirm(); }} style={{ flex: 1, padding: '8px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', color: '#fff', backgroundColor: confirmModal.type === 'delete' ? '#ef4444' : '#7B5233' }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Image Zoom Modal */}
      {previewImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          onClick={() => setPreviewImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '85%', maxHeight: '85%' }} onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Large Evidence" style={{ width: '100%', height: 'auto', maxHeight: '80vh', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} />
            <button 
              onClick={() => setPreviewImage(null)}
              style={{ position: 'absolute', top: '-40px', right: '0px', background: 'none', border: 'none', color: '#fff', fontSize: '30px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Export Excel Options Modal */}
      {showExportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '900', color: '#7B5233' }}>Tùy chọn xuất dữ liệu</h3>
              <X size={20} onClick={() => setShowExportModal(false)} style={{ cursor: 'pointer', color: '#64748b' }} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={exportOptions.employees} 
                  onChange={(e) => setExportOptions({ ...exportOptions, employees: e.target.checked })} 
                />
                Bảng tổng hợp hiệu suất nhân sự (.xlsx)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={exportOptions.checklists} 
                  onChange={(e) => setExportOptions({ ...exportOptions, checklists: e.target.checked })} 
                />
                Chi tiết Checklist công việc (.xlsx)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={exportOptions.kpis} 
                  onChange={(e) => setExportOptions({ ...exportOptions, kpis: e.target.checked })} 
                />
                Chi tiết chỉ số KPI (.xlsx)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={exportOptions.violations} 
                  onChange={(e) => setExportOptions({ ...exportOptions, violations: e.target.checked })} 
                />
                Nhật ký cộng trừ điểm / vi phạm (.xlsx)
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowExportModal(false)}
                style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleConfirmExport}
                style={{ padding: '10px 24px', backgroundColor: '#7B5233', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '12px' }}
              >
                Xuất Báo Cáo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default KPIReportsView;
