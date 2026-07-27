import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Download, Plus, Trash2, Camera } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import CapaCauseModal from '@mobile/modules/capa/Views/components/CapaCauseModal';
import CapaPreventiveModal from '@mobile/modules/capa/Views/components/CapaPreventiveModal';

const CapaFormView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
  const navigate = useNavigate();
  const { id } = useParams();
  const isCreate = !id || id === 'create';
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'plan' | 'tracking'
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);

  // Tab 1 Form Data
  const [formData, setFormData] = useState({
    code: 'CAPA-01',
    created_at_time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' | ' + new Date().toLocaleDateString('vi-VN'),
    creator_name: 'Nguyễn Văn A',
    handler_name: 'Ngô Diễm My',
    urgency: 'Nghiêm trọng',
    scope: 'Sản phẩm lỗi',
    issue_description: 'Vi phạm quy trình sản xuất, làm cong vênh cánh cửa gỗ sồi',
    images: [],
    evaluator_name: 'Trần Thị B',
    evaluation_time: '10:00 | 23/1/2026',
    ticket_status: 'Không đạt (làm lại)',
  });

  // Tab 2 Data
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

  // Tab 3 Data
  const [evaluations, setEvaluations] = useState([
    { id: 1, content: 'Kiểm tra thao tác lụa phôi tại chuyền', execution_date: '24/01/2026', executor: 'Trần Thị B', result: 'Pass', notes: 'Công nhân tuân thủ SOP mới' }
  ]);

  // Modals state
  const [isCauseModalOpen, setIsCauseModalOpen] = useState(false);
  const [editingCauseIdx, setEditingCauseIdx] = useState(null);

  const [isPreventiveModalOpen, setIsPreventiveModalOpen] = useState(false);
  const [editingPlanIdx, setEditingPlanIdx] = useState(null);

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(isCreate ? 'Tạo báo cáo CAPA' : `Báo cáo CAPA: ${formData.code}`);
    if (setCustomSubtitle) setCustomSubtitle('CL10.2: Chi tiết CAPA');
    if (setCustomScreenCode) setCustomScreenCode('CL10.2');

    if (!isCreate) {
      fetchDetail();
    }
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/capas/${id}`);
      setFormData({
        code: data.code || 'CAPA-01',
        created_at_time: data.created_at_time || '',
        creator_name: data.creator_name || '',
        handler_name: data.handler_name || '',
        urgency: data.urgency || 'Bình thường',
        scope: data.scope || 'Sản phẩm lỗi',
        issue_description: data.issue_description || '',
        images: data.images ? (typeof data.images === 'string' ? JSON.parse(data.images) : data.images) : [],
        evaluator_name: data.evaluator_name || '',
        evaluation_time: data.evaluation_time || '',
        ticket_status: data.ticket_status || 'Đang theo dõi'
      });

      if (data.causes_json) {
        setCauses(typeof data.causes_json === 'string' ? JSON.parse(data.causes_json) : data.causes_json);
      }
      if (data.corrective_actions_json) {
        setCorrectiveActions(typeof data.corrective_actions_json === 'string' ? JSON.parse(data.corrective_actions_json) : data.corrective_actions_json);
      }
      if (data.preventive_plans_json) {
        setPreventivePlans(typeof data.preventive_plans_json === 'string' ? JSON.parse(data.preventive_plans_json) : data.preventive_plans_json);
      }
      if (data.evaluations_json) {
        setEvaluations(typeof data.evaluations_json === 'string' ? JSON.parse(data.evaluations_json) : data.evaluations_json);
      }
    } catch (err) {
      console.error('Lỗi khi lấy chi tiết CAPA:', err);
      toast('error', 'Không thể tải chi tiết CAPA.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (statusOverride = null) => {
    setSaving(true);
    try {
      const payload = {
        code: formData.code,
        created_at_time: formData.created_at_time,
        creator_name: formData.creator_name,
        handler_name: formData.handler_name,
        urgency: formData.urgency,
        scope: formData.scope,
        issue_description: formData.issue_description,
        images: JSON.stringify(formData.images),
        evaluator_name: formData.evaluator_name,
        evaluation_time: formData.evaluation_time,
        ticket_status: statusOverride || formData.ticket_status,
        tab_status: (statusOverride || formData.ticket_status) === 'Đạt (đóng CAPA)' ? 'history' : 'tracking',
        causes_json: JSON.stringify(causes),
        corrective_actions_json: JSON.stringify(correctiveActions),
        preventive_plans_json: JSON.stringify(preventivePlans),
        evaluations_json: JSON.stringify(evaluations)
      };

      if (isCreate) {
        await api.post('/capas/', payload);
        toast('success', 'Đã tạo báo cáo CAPA thành công!');
      } else {
        await api.put(`/capas/${id}`, payload);
        toast('success', 'Đã cập nhật báo cáo CAPA thành công!');
      }
      navigate('/admin/capa');
    } catch (err) {
      console.error('Lỗi khi lưu CAPA:', err);
      toast('error', 'Không thể lưu báo cáo CAPA.');
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

  const handleAddCorrectiveActionRow = () => {
    const actPrompt = prompt('Nhập nội dung hành động khắc phục:');
    if (!actPrompt) return;
    setCorrectiveActions([
      ...correctiveActions,
      {
        stt: correctiveActions.length + 1,
        action: actPrompt,
        time: new Date().toLocaleDateString('vi-VN'),
        handler: formData.handler_name || 'Nguyễn Văn A'
      }
    ]);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#7B5233', fontWeight: 'bold' }}>Đang tải dữ liệu CAPA...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Top Navigation & Export Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/admin/capa')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '900', color: '#1e293b' }}>
            Thông Tin Kiểm Tra ({formData.code})
          </h2>
        </div>

        <button
          onClick={() => toast('info', 'Đang xuất báo cáo PDF/Excel CAPA...')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#432818', color: '#fff', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
        >
          <Download size={15} /> Xuất báo cáo
        </button>
      </div>

      {/* Navigation 3 Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', backgroundColor: '#fff', borderRadius: '10px 10px 0 0', padding: '0 16px' }}>
        <button
          onClick={() => setActiveTab('general')}
          style={{ padding: '12px 24px', border: 'none', background: 'transparent', fontSize: '0.9rem', fontWeight: activeTab === 'general' ? '800' : '600', color: activeTab === 'general' ? '#7B5233' : '#64748b', borderBottom: activeTab === 'general' ? '3px solid #7B5233' : 'none', marginBottom: '-2px', cursor: 'pointer' }}
        >
          Thông tin chung
        </button>
        <button
          onClick={() => setActiveTab('plan')}
          style={{ padding: '12px 24px', border: 'none', background: 'transparent', fontSize: '0.9rem', fontWeight: activeTab === 'plan' ? '800' : '600', color: activeTab === 'plan' ? '#7B5233' : '#64748b', borderBottom: activeTab === 'plan' ? '3px solid #7B5233' : 'none', marginBottom: '-2px', cursor: 'pointer' }}
        >
          Kế hoạch xử lý
        </button>
        <button
          onClick={() => setActiveTab('tracking')}
          style={{ padding: '12px 24px', border: 'none', background: 'transparent', fontSize: '0.9rem', fontWeight: activeTab === 'tracking' ? '800' : '600', color: activeTab === 'tracking' ? '#7B5233' : '#64748b', borderBottom: activeTab === 'tracking' ? '3px solid #7B5233' : 'none', marginBottom: '-2px', cursor: 'pointer' }}
        >
          Theo dõi
        </button>
      </div>

      {/* TAB 1: THÔNG TIN CHUNG */}
      {activeTab === 'general' && (
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: '800', color: '#1e293b' }}>Mô tả chung</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Mã phiếu</label>
              <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc', fontWeight: '700' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Thời gian</label>
              <input type="text" value={formData.created_at_time} onChange={(e) => setFormData({ ...formData, created_at_time: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Người khởi tạo</label>
              <input type="text" value={formData.creator_name} onChange={(e) => setFormData({ ...formData, creator_name: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Người xử lý</label>
              <input type="text" value={formData.handler_name} onChange={(e) => setFormData({ ...formData, handler_name: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
            </div>
          </div>

          {/* Mức độ sự cố */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Mức độ sự cố</label>
            <div style={{ display: 'flex', gap: '20px' }}>
              {['Khẩn cấp', 'Nghiêm trọng', 'Bình thường', 'Nhẹ'].map(item => (
                <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input type="radio" name="urgency" checked={formData.urgency === item} onChange={() => setFormData({ ...formData, urgency: item })} />
                  {item}
                </label>
              ))}
            </div>
          </div>

          {/* Phạm vi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Phạm vi</label>
            <div style={{ display: 'flex', gap: '20px' }}>
              {['Sản phẩm lỗi', 'Quy trình', 'Khiếu nại từ KH', 'Khác'].map(item => (
                <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input type="radio" name="scope" checked={formData.scope === item} onChange={() => setFormData({ ...formData, scope: item })} />
                  {item}
                </label>
              ))}
            </div>
          </div>

          {/* Mô tả sự cố */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Mô tả sự cố</label>
            <textarea rows={3} value={formData.issue_description} onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })} placeholder="Nhập chi tiết mô tả sự cố..." style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }} />
          </div>

          {/* Upload Ảnh đính kèm (3 slots) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Hình ảnh minh họa</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              {[0, 1, 2].map(idx => (
                <div
                  key={idx}
                  onClick={() => {
                    const urlPrompt = prompt('Nhập link hình ảnh:');
                    if (urlPrompt) {
                      const updated = [...formData.images];
                      updated[idx] = urlPrompt;
                      setFormData({ ...formData, images: updated });
                    }
                  }}
                  style={{ height: '90px', borderRadius: '8px', border: '2px dashed #cbd5e1', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}
                >
                  {formData.images[idx] ? (
                    <img src={formData.images[idx]} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera size={26} color="#94a3b8" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Người đánh giá</label>
              <input type="text" value={formData.evaluator_name} onChange={(e) => setFormData({ ...formData, evaluator_name: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Thời gian đánh giá</label>
              <input type="text" value={formData.evaluation_time} onChange={(e) => setFormData({ ...formData, evaluation_time: e.target.value })} style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
            </div>
          </div>

          {/* Trạng thái phiếu */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Trạng thái phiếu</label>
            <div style={{ display: 'flex', gap: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: '600', color: '#15803d', cursor: 'pointer' }}>
                <input type="radio" name="ticket_status" checked={formData.ticket_status === 'Đạt (đóng CAPA)'} onChange={() => setFormData({ ...formData, ticket_status: 'Đạt (đóng CAPA)' })} />
                Đạt (đóng CAPA)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: '600', color: '#dc2626', cursor: 'pointer' }}>
                <input type="radio" name="ticket_status" checked={formData.ticket_status === 'Không đạt (làm lại)'} onChange={() => setFormData({ ...formData, ticket_status: 'Không đạt (làm lại)' })} />
                Không đạt (làm lại)
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KẾ HOẠCH XỬ LÝ */}
      {activeTab === 'plan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Section 1: Phân tích nguyên nhân 5-Why */}
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#1e293b' }}>1. Phân tích nguyên nhân</h3>
            {causes.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Chưa có nguyên nhân nào.</div>
            ) : (
              causes.map((c, idx) => (
                <div key={idx} style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#334155' }}>{idx + 1}. {c.direct_cause}</div>
                  {c.whys && c.whys.map((w, wIdx) => (
                    <div key={wIdx} style={{ fontSize: '0.84rem', color: '#475569', marginLeft: '16px', marginTop: '6px' }}>
                      • Tại sao? ➔ <i>{w}</i>
                    </div>
                  ))}
                </div>
              ))
            )}
            <button
              onClick={() => { setEditingCauseIdx(null); setIsCauseModalOpen(true); }}
              style={{ alignSelf: 'flex-start', border: 'none', background: 'transparent', color: '#7B5233', fontSize: '0.86rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={16} /> Thêm nguyên nhân khác
            </button>
          </div>

          {/* Section 2: Hành động khắc phục */}
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#1e293b' }}>2. Hành động khắc phục</h3>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr style={{ backgroundColor: '#432818', color: '#fff' }}>
                  <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                  <th style={{ textAlign: 'left' }}>Hành động</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Thời gian</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>Phụ trách</th>
                </tr>
              </thead>
              <tbody>
                {correctiveActions.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                    <td>{row.action}</td>
                    <td style={{ textAlign: 'center' }}>{row.time}</td>
                    <td style={{ textAlign: 'center' }}>{row.handler}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={handleAddCorrectiveActionRow}
              style={{ alignSelf: 'flex-start', border: 'none', background: 'transparent', color: '#7B5233', fontSize: '0.86rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={16} /> Thêm hành động khác
            </button>
          </div>

          {/* Section 3: Kế hoạch phòng ngừa */}
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#1e293b' }}>3. Kế hoạch phòng ngừa</h3>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr style={{ backgroundColor: '#432818', color: '#fff' }}>
                  <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                  <th style={{ textAlign: 'left' }}>Hành động</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Người thực hiện</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Hạn hoàn thành</th>
                  <th style={{ textAlign: 'left' }}>Kết quả mong đợi</th>
                </tr>
              </thead>
              <tbody>
                {preventivePlans.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                    <td>{row.action}</td>
                    <td style={{ textAlign: 'center' }}>{row.performer}</td>
                    <td style={{ textAlign: 'center' }}>{row.deadline}</td>
                    <td>{row.expected_result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => { setEditingPlanIdx(null); setIsPreventiveModalOpen(true); }}
              style={{ alignSelf: 'flex-start', border: 'none', background: 'transparent', color: '#7B5233', fontSize: '0.86rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={16} /> Thêm kế hoạch phòng ngừa
            </button>
          </div>

          {/* Bottom Action Bar */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button onClick={() => navigate('/admin/capa')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer' }}>Hủy bỏ</button>
            <button onClick={() => handleSave('Lưu nháp')} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#432818', color: '#fff', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer' }}>Lưu nháp</button>
            <button onClick={() => handleSave(formData.ticket_status)} style={{ flex: 1.5, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#7B5233', color: '#fff', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer' }}>Gửi phản hồi</button>
          </div>

        </div>
      )}

      {/* TAB 3: THEO DÕI */}
      {activeTab === 'tracking' && (
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#1e293b' }}>Lịch sử kiểm tra & Đánh giá định kỳ</h3>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: '#432818', color: '#fff' }}>
                <th style={{ textAlign: 'left' }}>Nội dung kiểm tra</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Ngày thực hiện</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Người thực hiện</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((ev, idx) => (
                <tr key={idx}>
                  <td>{ev.content}</td>
                  <td style={{ textAlign: 'center' }}>{ev.execution_date}</td>
                  <td style={{ textAlign: 'center' }}>{ev.executor}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold', color: ev.result === 'Pass' ? '#15803d' : '#dc2626' }}>{ev.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => {
              const content = prompt('Nhập nội dung kiểm tra:');
              if (!content) return;
              setEvaluations([...evaluations, { id: evaluations.length + 1, content, execution_date: new Date().toLocaleDateString('vi-VN'), executor: formData.evaluator_name || 'Trần Thị B', result: 'Pass', notes: '' }]);
            }}
            style={{ alignSelf: 'flex-start', border: 'none', background: 'transparent', color: '#7B5233', fontSize: '0.86rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={16} /> Thêm lượt kiểm tra
          </button>
        </div>
      )}

      {/* Cause Modal CL10.3 */}
      <CapaCauseModal
        isOpen={isCauseModalOpen}
        onClose={() => setIsCauseModalOpen(false)}
        onConfirm={handleConfirmCause}
        initialData={editingCauseIdx !== null ? causes[editingCauseIdx] : null}
      />

      {/* Preventive Plan Modal CL10.5 */}
      <CapaPreventiveModal
        isOpen={isPreventiveModalOpen}
        onClose={() => setIsPreventiveModalOpen(false)}
        onConfirm={handleConfirmPreventive}
        initialData={editingPlanIdx !== null ? preventivePlans[editingPlanIdx] : null}
      />

    </div>
  );
};

export default CapaFormView;
