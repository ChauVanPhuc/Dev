import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Plus, Trash2, Camera, Check, AlertCircle } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import apiClient from '@shared/services/api';
import CapaCauseModal from './components/CapaCauseModal';
import CapaPreventiveModal from './components/CapaPreventiveModal';
import CapaCorrectiveModal from './components/CapaCorrectiveModal';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';

const CAPADetailView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isCreate = !id || id === 'new';

  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'plan' | 'tracking'
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);

  // MessageModal System Popup State
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null
  });

  const showMessage = (type, title, message, onConfirm = null) => {
    setModalState({
      isOpen: true,
      type,
      title,
      message,
      onConfirm: () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      }
    });
  };

  // ConfirmModal System Confirmation State
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const showConfirm = (title, message, onConfirm) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      }
    });
  };

  const handleCancelClick = () => {
    showConfirm(
      'Xác nhận hủy bỏ',
      'Bạn có chắc chắn muốn rời khỏi trang và hủy các thao tác chưa lưu?',
      () => navigate('/mobile/capa/list')
    );
  };

  const handleDraftClick = () => {
    showConfirm(
      'Xác nhận lưu nháp',
      'Bạn có chắc chắn muốn lưu bản nháp phiếu CAPA này không?',
      () => handleSave('Lưu nháp')
    );
  };

  const handleSubmitClick = () => {
    showConfirm(
      'Xác nhận gửi phản hồi',
      'Bạn có chắc chắn muốn gửi phản hồi báo cáo CAPA này cho người phụ trách không?',
      () => handleSave(formData.ticket_status || 'Vừa tạo')
    );
  };

  // Tab 1: General Info State
  const [formData, setFormData] = useState({
    code: 'CAPA-01',
    created_at_time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' | ' + new Date().toLocaleDateString('vi-VN'),
    creator_name: 'Nguyễn Văn A',
    handler_name: 'Ngô Diễm My',
    urgency: 'Nghiêm trọng', // Khẩn cấp | Nghiêm trọng | Bình thường | Nhẹ
    scope: 'Sản phẩm lỗi', // Sản phẩm lỗi | Quy trình | Khiếu nại từ KH | Khác
    issue_description: 'Vi phạm quy trình sản xuất, làm cong vênh cánh cửa gỗ sồi',
    images: [],
    evaluator_name: 'Trần Thị B',
    evaluation_time: '10:00 | 23/1/2026',
    ticket_status: 'Không đạt (làm lại)', // Đạt (đóng CAPA) | Không đạt (làm lại) | Đang theo dõi
  });

  // Tab 2: 5-Why Causes, Corrective Actions, Preventive Plans
  const [causes, setCauses] = useState([
    {
      direct_cause: 'Do con người: Công nhân thao tác sai quy trình',
      whys: ['Chưa được đào tạo kỹ bước ghép phôi gỗ', 'Tài liệu SOP thiếu hình ảnh minh họa']
    }
  ]);
  const [correctiveActions, setCorrectiveActions] = useState([
    { stt: 1, action: 'Tái đào tạo quy trình ghép phôi', time: '23/01/2026', handler: 'Ngô Diễm My' }
  ]);
  const [preventivePlans, setPreventivePlans] = useState([
    { stt: 1, action: 'Cập nhật SOP kèm ảnh trực quan', performer: 'Ngô Diễm My', deadline: '30/01/2026', expected_result: '100% công nhân thuộc SOP' }
  ]);

  // Tab 3: Tracking Evaluations
  const [evaluations, setEvaluations] = useState([
    { id: 1, content: 'Tái đào tạo quy trình ghép phôi', execution_date: '24/01/2026', executor: 'Trần Thị B', result: 'Pass', notes: 'Công nhân tuân thủ SOP mới' }
  ]);
  const [evaluationText, setEvaluationText] = useState('');
  const [evaluationImages, setEvaluationImages] = useState([]);

  // Modals state
  const [isCauseModalOpen, setIsCauseModalOpen] = useState(false);
  const [editingCauseIdx, setEditingCauseIdx] = useState(null);

  const [isCorrectiveModalOpen, setIsCorrectiveModalOpen] = useState(false);
  const [editingCorrectiveIdx, setEditingCorrectiveIdx] = useState(null);

  const [isPreventiveModalOpen, setIsPreventiveModalOpen] = useState(false);
  const [editingPlanIdx, setEditingPlanIdx] = useState(null);

  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    const fetchStaffs = async () => {
      try {
        const accResp = await apiClient.get('/accounts/?limit=500');
        const accData = accResp.data?.items || accResp.data || [];
        if (Array.isArray(accData) && accData.length > 0) {
          const list = accData
            .filter(u => u.full_name || u.username)
            .map(u => ({
              label: u.full_name ? `${u.full_name} (${u.username})` : u.username,
              value: u.full_name || u.username
            }));
          setStaffList(list);
          return;
        }
      } catch (e) {
        console.error('Lỗi khi fetch accounts:', e);
      }

      try {
        const resp = await apiClient.get('/kpi-management/employees');
        const data = resp.data || resp;
        if (Array.isArray(data) && data.length > 0) {
          setStaffList(data.map(item => ({
            label: item.full_name ? `${item.full_name}${item.employee_id ? ' (' + item.employee_id + ')' : ''}` : item.username,
            value: item.full_name || item.username
          })));
        }
      } catch (e) {
        console.error('Lỗi khi fetch kpi employees:', e);
      }
    };
    fetchStaffs();
  }, []);

  const getLoggedInUser = () => {
    try {
      const uStr = localStorage.getItem('smartflow_user');
      return uStr ? JSON.parse(uStr) : null;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const loggedUser = getLoggedInUser();
    const creatorName = loggedUser?.full_name || loggedUser?.username || 'Nguyễn Văn A';
    const handlerName = loggedUser?.manager_name || loggedUser?.supervisor_name || loggedUser?.manager || loggedUser?.parent_name || 'Ngô Diễm My';

    if (isCreate) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} | ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

      setFormData(prev => ({
        ...prev,
        created_at_time: timeStr,
        creator_name: creatorName,
        handler_name: handlerName
      }));
    } else {
      fetchDetail();
    }
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const resp = await apiClient.get(`/capas/${id}`);
      const d = resp.data || {};
      const loggedUser = getLoggedInUser();
      
      setFormData({
        code: d.code || 'CAPA-01',
        created_at_time: d.created_at_time || '',
        creator_name: d.creator_name || loggedUser?.full_name || loggedUser?.username || 'Nguyễn Văn A',
        handler_name: d.handler_name || loggedUser?.manager_name || loggedUser?.supervisor_name || 'Ngô Diễm My',
        urgency: d.urgency || 'Bình thường',
        scope: d.scope || 'Sản phẩm lỗi',
        issue_description: d.issue_description || '',
        images: d.images ? (typeof d.images === 'string' ? JSON.parse(d.images) : d.images) : [],
        evaluator_name: d.evaluator_name || 'Trần Thị B',
        evaluation_time: d.evaluation_time || '10:00 | 23/1/2026',
        ticket_status: d.ticket_status || 'Đang theo dõi'
      });

      if (d.causes_json) {
        setCauses(typeof d.causes_json === 'string' ? JSON.parse(d.causes_json) : d.causes_json);
      }
      if (d.corrective_actions_json) {
        setCorrectiveActions(typeof d.corrective_actions_json === 'string' ? JSON.parse(d.corrective_actions_json) : d.corrective_actions_json);
      }
      if (d.preventive_plans_json) {
        setPreventivePlans(typeof d.preventive_plans_json === 'string' ? JSON.parse(d.preventive_plans_json) : d.preventive_plans_json);
      }
      if (d.evaluations_json) {
        setEvaluations(typeof d.evaluations_json === 'string' ? JSON.parse(d.evaluations_json) : d.evaluations_json);
      }
    } catch (err) {
      console.error('Lỗi khi lấy chi tiết CAPA:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showMessage('warning', 'Cảnh báo', 'Vui lòng cho phép bật cửa sổ popup để xuất báo cáo PDF!');
      return;
    }
    const causesList = causes.map((c, i) => `
      <div style="margin-bottom: 8px;">
        <strong>${i + 1}. ${c.direct_cause}</strong>
        <ul style="margin: 4px 0 0 16px; padding: 0;">
          ${(c.whys || []).map(w => `<li>Tại sao? &rarr; ${w}</li>`).join('')}
        </ul>
      </div>
    `).join('');

    const correctiveList = correctiveActions.map((c, i) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${i + 1}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${c.action}</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${c.time}</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${c.handler}</td>
      </tr>
    `).join('');

    const preventiveList = preventivePlans.map((p, i) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${i + 1}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${p.action}</td>
        <td style="border: 1px solid #ddd; padding: 6px;">${p.expected_result || ''}</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${p.deadline || ''}</td>
        <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${p.performer || ''}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BÁO CÁO CAPA - ${formData.code}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #432818; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #432818; text-transform: uppercase; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
          .box { border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; margin-bottom: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background-color: #432818; color: white; padding: 8px; text-align: left; font-size: 13px; }
          td { border: 1px solid #ddd; padding: 8px; font-size: 13px; }
          .footer-sign { display: flex; justify: space-between; margin-top: 50px; text-align: center; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">BÁO CÁO HÀNH ĐỘNG KHẮC PHỤC & PHÒNG NGỪA (CAPA)</div>
          <div style="margin-top: 4px;">Mã phiếu: <strong>${formData.code}</strong> | Ngày tạo: ${formData.created_at_time}</div>
        </div>

        <div class="box">
          <div class="grid">
            <div><strong>Người khởi tạo:</strong> ${formData.creator_name}</div>
            <div><strong>Người xử lý phụ trách:</strong> ${formData.handler_name}</div>
            <div><strong>Mức độ sự cố:</strong> ${formData.urgency}</div>
            <div><strong>Phạm vi ảnh hưởng:</strong> ${formData.scope}</div>
          </div>
          <div><strong>Mô tả sự cố:</strong> ${formData.issue_description}</div>
        </div>

        <h3 style="color: #432818; margin-top: 20px;">1. PHÂN TÍCH NGUYÊN NHÂN (5-WHY)</h3>
        <div class="box">${causesList || 'Chưa có phân tích nguyên nhân'}</div>

        <h3 style="color: #432818; margin-top: 20px;">2. HÀNH ĐỘNG KHẮC PHỤC TẠM THỜI</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">STT</th>
              <th>Hành động</th>
              <th style="width: 100px; text-align: center;">Thời gian</th>
              <th style="width: 120px; text-align: center;">Phụ trách</th>
            </tr>
          </thead>
          <tbody>
            ${correctiveList || '<tr><td colspan="4" style="text-align: center;">Chưa có dữ liệu</td></tr>'}
          </tbody>
        </table>

        <h3 style="color: #432818; margin-top: 20px;">3. KẾ HOẠCH PHÒNG NGỪA LÂU DÀI</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">STT</th>
              <th>Hành động cụ thể</th>
              <th>Tiêu chí đánh giá mong đợi</th>
              <th style="width: 100px; text-align: center;">Hạn chót</th>
              <th style="width: 120px; text-align: center;">Người thực hiện</th>
            </tr>
          </thead>
          <tbody>
            ${preventiveList || '<tr><td colspan="5" style="text-align: center;">Chưa có dữ liệu</td></tr>'}
          </tbody>
        </table>

        <div class="footer-sign">
          <div>
            <div>Người khởi tạo</div>
            <div style="margin-top: 50px;">${formData.creator_name}</div>
          </div>
          <div>
            <div>Người xử lý chính</div>
            <div style="margin-top: 50px;">${formData.handler_name}</div>
          </div>
          <div>
            <div>Người đánh giá phê duyệt</div>
            <div style="margin-top: 50px;">${formData.evaluator_name || 'Phê duyệt'}</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleSave = async (statusOverride = null) => {
    if (!formData.issue_description || !formData.issue_description.trim()) {
      showMessage('warning', 'Thiếu thông tin', 'Vui lòng nhập mô tả sự cố trước khi lưu báo cáo CAPA!');
      return;
    }

    setSaving(true);
    try {
      const finalStatus = statusOverride || formData.ticket_status || 'Vừa tạo';
      const payload = {
        code: formData.code,
        created_at_time: formData.created_at_time,
        creator_name: formData.creator_name,
        handler_name: formData.handler_name,
        urgency: formData.urgency || 'Bình thường',
        scope: formData.scope || 'Sản phẩm lỗi',
        issue_description: formData.issue_description,
        images: JSON.stringify(formData.images || []),
        evaluator_name: formData.evaluator_name || 'Trần Thị B',
        evaluation_time: formData.evaluation_time || '10:00 | 23/1/2026',
        ticket_status: finalStatus,
        tab_status: finalStatus === 'Đạt (đóng CAPA)' ? 'history' : 'tracking',
        causes_json: JSON.stringify(causes || []),
        corrective_actions_json: JSON.stringify(correctiveActions || []),
        preventive_plans_json: JSON.stringify(preventivePlans || []),
        evaluations_json: JSON.stringify(evaluations || [])
      };

      if (isCreate) {
        const resp = await apiClient.post('/capas/', payload);
        showMessage(
          'success',
          'Thành công',
          `Tạo báo cáo CAPA thành công (${resp.data?.code || formData.code})!`,
          () => navigate('/mobile/capa/list')
        );
      } else {
        await apiClient.put(`/capas/${id}`, payload);
        showMessage(
          'success',
          'Thành công',
          'Cập nhật báo cáo CAPA thành công!',
          () => navigate('/mobile/capa/list')
        );
      }
    } catch (err) {
      console.error('Lỗi khi lưu CAPA:', err);
      showMessage('error', 'Lỗi kết nối', 'Đã xảy ra lỗi khi lưu báo cáo CAPA vào hệ thống.');
    } finally {
      setSaving(false);
    }
  };

  // Handlers for Cause Modal (CL10.3)
  const handleConfirmCause = (newCauseData) => {
    if (editingCauseIdx !== null) {
      const updated = [...causes];
      updated[editingCauseIdx] = newCauseData;
      setCauses(updated);
      setEditingCauseIdx(null);
    } else {
      setCauses([...causes, newCauseData]);
    }
  };

  // Handlers for Preventive Modal (CL10.5)
  const handleConfirmPreventive = (newPlanData) => {
    if (editingPlanIdx !== null) {
      const updated = [...preventivePlans];
      updated[editingPlanIdx] = { stt: editingPlanIdx + 1, ...newPlanData };
      setPreventivePlans(updated);
      setEditingPlanIdx(null);
    } else {
      setPreventivePlans([
        ...preventivePlans,
        { stt: preventivePlans.length + 1, ...newPlanData }
      ]);
    }
  };

  // Trigger camera / file capture on mobile or desktop
  const triggerImageCapture = (onImageCaptured) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          onImageCaptured(event.target.result);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // Handlers for Corrective Action Modal (CL010.4)
  const handleConfirmCorrective = (newCorrectiveData) => {
    if (editingCorrectiveIdx !== null) {
      const updated = [...correctiveActions];
      updated[editingCorrectiveIdx] = {
        stt: editingCorrectiveIdx + 1,
        ...newCorrectiveData
      };
      setCorrectiveActions(updated);
      setEditingCorrectiveIdx(null);
    } else {
      setCorrectiveActions([
        ...correctiveActions,
        {
          stt: correctiveActions.length + 1,
          ...newCorrectiveData
        }
      ]);
    }
  };

  return (
    <Layout>
      <PageHeader 
        title="Lập báo cáo" 
        screenCode="CL10.2: Chi tiết CAPA" 
        showBack={true}
        onBackClick={() => navigate('/mobile/capa/list')}
      />

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, padding: '12px 14px 120px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Title Header Card & Export Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#fff',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#1e293b', whiteSpace: 'nowrap' }}>
            Thông Tin Kiểm Tra
          </h2>

          <button
            onClick={handleExportReport}
            style={{
              marginLeft: 'auto',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#432818',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <Download size={14} /> Xuất báo cáo
          </button>
        </div>

        {/* Navigation 3 Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', backgroundColor: '#fff', borderRadius: '10px 10px 0 0', padding: '0 8px' }}>
          <button
            onClick={() => setActiveTab('general')}
            style={{
              flex: 1,
              padding: '10px 4px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.84rem',
              fontWeight: activeTab === 'general' ? '800' : '600',
              color: activeTab === 'general' ? '#7B5233' : '#64748b',
              borderBottom: activeTab === 'general' ? '3px solid #7B5233' : 'none',
              marginBottom: '-2px',
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            Thông tin chung
          </button>

          <button
            onClick={() => setActiveTab('plan')}
            style={{
              flex: 1,
              padding: '10px 4px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.84rem',
              fontWeight: activeTab === 'plan' ? '800' : '600',
              color: activeTab === 'plan' ? '#7B5233' : '#64748b',
              borderBottom: activeTab === 'plan' ? '3px solid #7B5233' : 'none',
              marginBottom: '-2px',
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            Kế hoạch xử lý
          </button>

          <button
            onClick={() => setActiveTab('tracking')}
            style={{
              flex: 1,
              padding: '10px 4px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.84rem',
              fontWeight: activeTab === 'tracking' ? '800' : '600',
              color: activeTab === 'tracking' ? '#7B5233' : '#64748b',
              borderBottom: activeTab === 'tracking' ? '3px solid #7B5233' : 'none',
              marginBottom: '-2px',
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            Theo dõi
          </button>
        </div>

        {/* TAB 1: THÔNG TIN CHUNG */}
        {activeTab === 'general' && (
          <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px', boxSizing: 'border-box', maxWidth: '100%', overflow: 'hidden' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>
              Mô tả chung
            </h3>

            {/* Grid: Mã phiếu & Thời gian */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>Mã phiếu</label>
                <input
                  type="text"
                  value={formData.code}
                  readOnly
                  style={{ width: '100%', boxSizing: 'border-box', minWidth: 0, padding: '8px 10px', borderRadius: '8px', border: '1px solid #c5c5c5', fontSize: '0.82rem', backgroundColor: '#e0e0e0', color: '#1e293b', fontWeight: '700', cursor: 'not-allowed' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>Thời gian</label>
                <input
                  type="text"
                  value={formData.created_at_time}
                  readOnly
                  style={{ width: '100%', boxSizing: 'border-box', minWidth: 0, padding: '8px 10px', borderRadius: '8px', border: '1px solid #c5c5c5', fontSize: '0.82rem', backgroundColor: '#e0e0e0', color: '#1e293b', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            {/* Grid: Người khởi tạo & Người xử lý */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>Người khởi tạo</label>
                <input
                  type="text"
                  value={formData.creator_name}
                  readOnly
                  style={{ width: '100%', boxSizing: 'border-box', minWidth: 0, padding: '8px 10px', borderRadius: '8px', border: '1px solid #c5c5c5', fontSize: '0.82rem', backgroundColor: '#e0e0e0', color: '#1e293b', fontWeight: '600', cursor: 'not-allowed' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>Người xử lý</label>
                <input
                  type="text"
                  value={formData.handler_name}
                  readOnly
                  style={{ width: '100%', boxSizing: 'border-box', minWidth: 0, padding: '8px 10px', borderRadius: '8px', border: '1px solid #c5c5c5', fontSize: '0.82rem', backgroundColor: '#e0e0e0', color: '#1e293b', fontWeight: '600', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            {/* Mức độ sự cố */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>Mức độ sự cố</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {['Khẩn cấp', 'Nghiêm trọng', 'Bình thường', 'Nhẹ'].map(item => (
                  <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="urgency"
                      checked={formData.urgency === item}
                      onChange={() => setFormData({ ...formData, urgency: item })}
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            {/* Phạm vi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>Phạm vi</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {['Sản phẩm lỗi', 'Quy trình', 'Khiếu nại từ KH', 'Khác'].map(item => (
                  <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="scope"
                      checked={formData.scope === item}
                      onChange={() => setFormData({ ...formData, scope: item })}
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            {/* Mô tả sự cố */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>Mô tả sự cố</label>
              <textarea
                rows={3}
                value={formData.issue_description}
                onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
                placeholder="Nhập chi tiết mô tả sự cố..."
                style={{ width: '100%', boxSizing: 'border-box', minWidth: 0, padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', resize: 'vertical' }}
              />
            </div>

            {/* Upload Ảnh đính kèm (3 slots) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>Hình ảnh minh họa</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '10px' }}>
                {[0, 1, 2].map(idx => (
                  <div
                    key={idx}
                    onClick={() => {
                      triggerImageCapture((dataUrl) => {
                        const updated = [...formData.images];
                        updated[idx] = dataUrl;
                        setFormData({ ...formData, images: updated });
                      });
                    }}
                    style={{
                      height: '75px',
                      borderRadius: '8px',
                      border: '2px dashed #cbd5e1',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      overflow: 'hidden'
                    }}
                  >
                    {formData.images[idx] ? (
                      <img src={formData.images[idx]} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Camera size={22} color="#94a3b8" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Grid: Người đánh giá & Thời gian đánh giá */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>Người đánh giá</label>
                <input
                  type="text"
                  value={formData.evaluator_name}
                  readOnly
                  style={{ width: '100%', boxSizing: 'border-box', minWidth: 0, padding: '8px 10px', borderRadius: '8px', border: '1px solid #c5c5c5', fontSize: '0.82rem', backgroundColor: '#e0e0e0', color: '#1e293b', cursor: 'not-allowed' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>Thời gian đánh giá</label>
                <input
                  type="text"
                  value={formData.evaluation_time}
                  readOnly
                  style={{ width: '100%', boxSizing: 'border-box', minWidth: 0, padding: '8px 10px', borderRadius: '8px', border: '1px solid #c5c5c5', fontSize: '0.82rem', backgroundColor: '#e0e0e0', color: '#1e293b', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            {/* Trạng thái phiếu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>Trạng thái phiếu</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: '600', color: '#15803d', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="ticket_status"
                    checked={formData.ticket_status === 'Đạt (đóng CAPA)'}
                    onChange={() => setFormData({ ...formData, ticket_status: 'Đạt (đóng CAPA)' })}
                  />
                  Đạt (đóng CAPA)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: '600', color: '#dc2626', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="ticket_status"
                    checked={formData.ticket_status === 'Không đạt (làm lại)'}
                    onChange={() => setFormData({ ...formData, ticket_status: 'Không đạt (làm lại)' })}
                  />
                  Không đạt (làm lại)
                </label>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: KẾ HOẠCH XỬ LÝ */}
        {activeTab === 'plan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Section 1: Phân tích nguyên nhân 5-Why */}
            <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '800', color: '#1e293b' }}>
                1. Phân tích nguyên nhân
              </h3>

              {causes.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Chưa có nguyên nhân nào.</div>
              ) : (
                causes.map((c, idx) => (
                  <div key={idx} style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#334155' }}>
                      {idx + 1}. {c.direct_cause}
                    </div>
                    {c.whys && c.whys.map((w, wIdx) => (
                      <div key={wIdx} style={{ fontSize: '0.8rem', color: '#475569', marginLeft: '12px', marginTop: '4px' }}>
                        • Tại sao? ➔ <i>{w}</i>
                      </div>
                    ))}
                  </div>
                ))
              )}

              <button
                onClick={() => { setEditingCauseIdx(null); setIsCauseModalOpen(true); }}
                style={{
                  alignSelf: 'flex-start',
                  border: 'none',
                  background: 'transparent',
                  color: '#7B5233',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '4px'
                }}
              >
                <Plus size={15} /> Thêm nguyên nhân khác
              </button>
            </div>

            {/* Section 2: Hành động khắc phục */}
            <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '800', color: '#1e293b' }}>
                2. Hành động khắc phục
              </h3>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#432818', color: '#fff' }}>
                      <th style={{ padding: '6px', width: '35px' }}>STT</th>
                      <th style={{ padding: '6px', textAlign: 'left' }}>Hành động</th>
                      <th style={{ padding: '6px', width: '80px' }}>Thời gian</th>
                      <th style={{ padding: '6px', width: '85px' }}>Phụ trách</th>
                    </tr>
                  </thead>
                  <tbody>
                    {correctiveActions.map((row, idx) => (
                      <tr
                        key={idx}
                        onClick={() => { setEditingCorrectiveIdx(idx); setIsCorrectiveModalOpen(true); }}
                        style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                      >
                        <td style={{ padding: '6px', textAlign: 'center', fontWeight: '700' }}>{idx + 1}</td>
                        <td style={{ padding: '6px' }}>{row.action}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>{row.time}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>{row.handler}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => { setEditingCorrectiveIdx(null); setIsCorrectiveModalOpen(true); }}
                style={{
                  alignSelf: 'flex-start',
                  border: 'none',
                  background: 'transparent',
                  color: '#7B5233',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '4px'
                }}
              >
                <Plus size={15} /> Thêm hành động khác
              </button>
            </div>

            {/* Section 3: Kế hoạch phòng ngừa */}
            <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: '800', color: '#1e293b' }}>
                3. Kế hoạch phòng ngừa
              </h3>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#432818', color: '#fff' }}>
                      <th style={{ padding: '6px', width: '30px' }}>STT</th>
                      <th style={{ padding: '6px', textAlign: 'left' }}>Hành động</th>
                      <th style={{ padding: '6px', width: '75px' }}>Người thực hiện</th>
                      <th style={{ padding: '6px', width: '75px' }}>Hạn hoàn thành</th>
                      <th style={{ padding: '6px', textAlign: 'left' }}>Kết quả mong đợi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preventivePlans.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px', textAlign: 'center', fontWeight: '700' }}>{idx + 1}</td>
                        <td style={{ padding: '6px' }}>{row.action}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>{row.performer}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>{row.deadline}</td>
                        <td style={{ padding: '6px' }}>{row.expected_result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => { setEditingPlanIdx(null); setIsPreventiveModalOpen(true); }}
                style={{
                  alignSelf: 'flex-start',
                  border: 'none',
                  background: 'transparent',
                  color: '#7B5233',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '4px'
                }}
              >
                <Plus size={15} /> Thêm kế hoạch phòng ngừa
              </button>
            </div>

          </div>
        )}

        {/* TAB 3: THEO DÕI & ĐÁNH GIÁ */}
        {activeTab === 'tracking' && (
          <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px', boxSizing: 'border-box', maxWidth: '100%', overflow: 'hidden' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#1e293b' }}>
              Theo dõi & đánh giá
            </h3>

            {/* Bảng theo dõi & đánh giá */}
            <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#7B5233', color: '#fff' }}>
                    <th style={{ padding: '8px 6px', width: '38px', textAlign: 'center' }}>STT</th>
                    <th style={{ padding: '8px 6px', textAlign: 'left' }}>Hành động</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>Người đánh giá</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>Ngày đánh giá</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center', width: '65px' }}>Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((ev, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: '700' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 6px' }}>{ev.content}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>{ev.executor || formData.evaluator_name || 'Trần Thị B'}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>{ev.execution_date}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                        <span style={{
                          backgroundColor: ev.result === 'Fail' ? '#dc2626' : '#65a30d',
                          color: '#fff',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          fontWeight: '700',
                          display: 'inline-block'
                        }}>
                          {ev.result === 'Fail' ? 'Không đạt' : 'Đạt'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Form Kết quả đánh giá * */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b' }}>
                Kết quả đánh giá <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={3}
                value={evaluationText}
                onChange={(e) => setEvaluationText(e.target.value)}
                placeholder="Nhập nội dung kết quả đánh giá..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minWidth: 0,
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Thêm hình ảnh */}
            <button
              type="button"
              onClick={() => {
                triggerImageCapture((dataUrl) => {
                  setEvaluationImages((prev) => [...prev, dataUrl]);
                });
              }}
              style={{
                alignSelf: 'flex-start',
                border: 'none',
                background: 'transparent',
                color: '#7B5233',
                fontSize: '0.84rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} /> Thêm hình ảnh
            </button>

            {/* Render danh sách ảnh đính kèm */}
            {evaluationImages.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {evaluationImages.map((img, i) => (
                  <img key={i} src={img} alt="preview" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
                ))}
              </div>
            )}

          </div>
        )}

      </div>

      {/* Fixed Bottom Action Bar (Cố định 100% dưới cùng màn hình, khớp 450px với khung mobile #root) */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '450px',
        backgroundColor: '#fff',
        borderTop: '1px solid #e2e8f0',
        padding: '10px 14px 12px 14px',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.12)',
        zIndex: 1000,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* Hàng 1: Hủy bỏ & Lưu nháp */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={handleCancelClick}
            style={{
              flex: 1,
              height: '38px',
              borderRadius: '8px',
              border: '1px solid #432818',
              backgroundColor: '#fff',
              color: '#432818',
              fontWeight: '700',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleDraftClick}
            disabled={saving}
            style={{
              flex: 1,
              height: '38px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#432818',
              color: '#fff',
              fontWeight: '700',
              fontSize: '0.84rem',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(67, 40, 24, 0.2)',
              opacity: saving ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {saving ? 'Đang lưu...' : 'Lưu nháp'}
          </button>
        </div>

        {/* Hàng 2: Gửi phản hồi (Đỏ nổi bật full-width) */}
        <button
          type="button"
          onClick={handleSubmitClick}
          disabled={saving}
          style={{
            width: '100%',
            height: '42px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: '#b91c1c',
            color: '#fff',
            fontWeight: '800',
            fontSize: '0.88rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 3px 6px rgba(185, 28, 28, 0.3)',
            opacity: saving ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {saving ? 'Đang xử lý...' : 'Gửi phản hồi'}
        </button>
      </div>

      {/* Cause Modal CL10.3 */}
      <CapaCauseModal
        isOpen={isCauseModalOpen}
        onClose={() => setIsCauseModalOpen(false)}
        onConfirm={handleConfirmCause}
        initialData={editingCauseIdx !== null ? causes[editingCauseIdx] : null}
      />

      {/* Corrective Action Modal CL010.4 */}
      <CapaCorrectiveModal
        isOpen={isCorrectiveModalOpen}
        onClose={() => setIsCorrectiveModalOpen(false)}
        onConfirm={handleConfirmCorrective}
        initialData={editingCorrectiveIdx !== null ? correctiveActions[editingCorrectiveIdx] : null}
        staffList={staffList}
      />

      {/* Preventive Plan Modal CL10.5 */}
      <CapaPreventiveModal
        isOpen={isPreventiveModalOpen}
        onClose={() => setIsPreventiveModalOpen(false)}
        onConfirm={handleConfirmPreventive}
        initialData={editingPlanIdx !== null ? preventivePlans[editingPlanIdx] : null}
      />

      {/* Premium System MessageModal Popup */}
      <MessageModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
      />

      {/* Premium System ConfirmModal Popup */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        confirmText="Xác nhận"
        cancelText="Hủy"
      />
    </Layout>
  );
};

export default CAPADetailView;
