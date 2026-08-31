import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle, AlertCircle, Save, Calendar, User, Flag, Target } from 'lucide-react';
import api from '@webShared/Services/api.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';

const KPITaskEvaluationModal = ({ isOpen, onClose, taskId = null, onSaved = null }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    task_code: 'CL.03.2',
    task_name: 'Thông tin nhiệm vụ kiểm tra chất lượng ca 1',
    assigner: 'Nguyễn Văn Trưởng (Lead QC)',
    assignee: 'Trần Văn An (QC Staff)',
    deadline: '2026-08-30 17:00',
    priority: 'Cao',
    status: 'Đang thực hiện',
    target_score: 120,
    achieved_score: 40,
    description: 'Thực hiện kiểm tra các chỉ tiêu ISO & Checklist tiêu chuẩn công đoạn định hình xưởng 1.',
    criterias: [
      { stt: 1, criteria_name: 'Kiểm tra tem nhãn nguyên vật liệu', max_score: 30, achieved_score: 10, evaluation: 'Đạt', note: 'Đầy đủ tem nhãn' },
      { stt: 2, criteria_name: 'Đo kích thước ngoại quan bằng thước kẹp', max_score: 40, achieved_score: 20, evaluation: 'Đạt', note: 'Sai lệch trong khoảng cho phép' },
      { stt: 3, criteria_name: 'Báo cáo sự cố khi có lỗi lặp lại quá 3 lần', max_score: 30, achieved_score: 10, evaluation: 'Đạt', note: 'Ghi chép đầy đủ' },
      { stt: 4, criteria_name: 'Vệ sinh 5S khu vực bàn kiểm định', max_score: 20, achieved_score: 0, evaluation: 'Chưa đạt', note: 'Cần dọn dẹp lại cuối ca' }
    ]
  });

  useEffect(() => {
    if (isOpen) {
      if (taskId) {
        fetchTaskDetail(taskId);
      } else {
        fetchDefaultTask();
      }
    }
  }, [isOpen, taskId]);

  const fetchDefaultTask = async () => {
    try {
      setLoading(true);
      const res = await api.get('/kpi-tasks');
      if (res && res.length > 0) {
        setFormData(res[0]);
      }
    } catch (err) {
      console.error('Lỗi khi tải nhiệm vụ mặc định:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskDetail = async (id) => {
    try {
      setLoading(true);
      const res = await api.get(`/kpi-tasks/${id}`);
      if (res) {
        setFormData(res);
      }
    } catch (err) {
      console.error('Lỗi khi tải chi tiết nhiệm vụ:', err);
      toast('error', 'Không thể tải chi tiết nhiệm vụ');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleCriteriaChange = (index, field, value) => {
    const newCriterias = [...formData.criterias];
    newCriterias[index][field] = value;
    
    // Tự động tính lại achieved_score tổng
    const newAchievedTotal = newCriterias.reduce((sum, item) => sum + (parseFloat(item.achieved_score) || 0), 0);
    const newTargetTotal = newCriterias.reduce((sum, item) => sum + (parseFloat(item.max_score) || 0), 0);

    setFormData(prev => ({
      ...prev,
      criterias: newCriterias,
      achieved_score: newAchievedTotal,
      target_score: newTargetTotal > 0 ? newTargetTotal : prev.target_score
    }));
  };

  const handleAddCriteria = () => {
    const nextStt = formData.criterias.length + 1;
    setFormData(prev => ({
      ...prev,
      criterias: [
        ...prev.criterias,
        {
          stt: nextStt,
          criteria_name: '',
          max_score: 10,
          achieved_score: 0,
          evaluation: 'Đạt',
          note: ''
        }
      ]
    }));
  };

  const handleDeleteCriteria = (index) => {
    const newCriterias = formData.criterias.filter((_, idx) => idx !== index);
    const reindexed = newCriterias.map((item, idx) => ({ ...item, stt: idx + 1 }));
    const newAchievedTotal = reindexed.reduce((sum, item) => sum + (parseFloat(item.achieved_score) || 0), 0);

    setFormData(prev => ({
      ...prev,
      criterias: reindexed,
      achieved_score: newAchievedTotal
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (formData.id) {
        await api.put(`/kpi-tasks/${formData.id}`, formData);
        toast('success', 'Cập nhật phiếu nhiệm vụ CL.03.2 thành công');
      } else {
        await api.post('/kpi-tasks', formData);
        toast('success', 'Tạo phiếu nhiệm vụ CL.03.2 mới thành công');
      }
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Lỗi khi lưu nhiệm vụ:', err);
      toast('error', 'Không thể lưu nhiệm vụ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
      backdropFilter: 'blur(4px)',
      zIndex: 3000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        width: '900px',
        maxWidth: '95vw',
        maxHeight: '92vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #EADCC9'
      }}>
        
        {/* Modal Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #EADCC9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: '#FAF6F0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              padding: '4px 10px', backgroundColor: '#7B5233', color: '#fff',
              fontWeight: '800', borderRadius: '6px', fontSize: '13px'
            }}>
              {formData.task_code || 'CL.03.2'}
            </span>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#7B5233' }}>
              Thông tin nhiệm vụ
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: '4px', borderRadius: '50%' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7B5233', fontWeight: '600' }}>
              Đang tải dữ liệu nhiệm vụ CL.03.2...
            </div>
          ) : (
            <>
              {/* Form Info Grid + Big Score Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '20px', alignItems: 'start' }}>
                
                {/* Inputs Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Mã nhiệm vụ</label>
                    <input
                      type="text"
                      value={formData.task_code}
                      onChange={(e) => setFormData({ ...formData, task_code: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box', fontWeight: '700' }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Tên nhiệm vụ *</label>
                    <input
                      type="text"
                      value={formData.task_name}
                      onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box', fontWeight: '600' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Người giao</label>
                    <input
                      type="text"
                      value={formData.assigner}
                      onChange={(e) => setFormData({ ...formData, assigner: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Người nhận *</label>
                    <input
                      type="text"
                      value={formData.assignee}
                      onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Hạn chót</label>
                    <input
                      type="text"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      placeholder="YYYY-MM-DD HH:mm"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Mức độ ưu tiên</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
                    >
                      <option value="Cao">Cao</option>
                      <option value="Trung bình">Trung bình</option>
                      <option value="Thấp">Thấp</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Trạng thái</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}
                    >
                      <option value="Đang thực hiện">Đang thực hiện</option>
                      <option value="Hoàn thành">Hoàn thành</option>
                      <option value="Quá hạn">Quá hạn</option>
                    </select>
                  </div>
                </div>

                {/* Big Score Cards (120 vs 40) - Đúng theo Wireframe Màn Hình 3 */}
                <div style={{ display: 'flex', gap: '12px', height: '100%' }}>
                  
                  {/* Card 1: Target Score */}
                  <div style={{
                    flex: 1, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
                    padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>Điểm chỉ tiêu</span>
                    <span style={{ fontSize: '38px', fontWeight: '900', color: '#334155', lineHeight: 1 }}>
                      {formData.target_score}
                    </span>
                    <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Tổng điểm tối đa</span>
                  </div>

                  {/* Card 2: Achieved Score */}
                  <div style={{
                    flex: 1, backgroundColor: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '12px',
                    padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#c2410c', marginBottom: '6px' }}>Điểm đã đạt</span>
                    <span style={{ fontSize: '38px', fontWeight: '900', color: '#ea580c', lineHeight: 1 }}>
                      {formData.achieved_score}
                    </span>
                    <span style={{ fontSize: '10px', color: '#f97316', marginTop: '4px' }}>Thực hiện đạt được</span>
                  </div>

                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Mô tả chi tiết nhiệm vụ</label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              {/* Checklist Criteria Evaluation Table */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#7B5233' }}>
                    Danh sách tiêu chí đánh giá Checklist ({formData.criterias.length})
                  </h4>
                  <button
                    onClick={handleAddCriteria}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '6px 12px', border: 'none', borderRadius: '6px',
                      backgroundColor: '#7B5233', color: '#fff', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    <Plus size={12} /> Thêm tiêu chí
                  </button>
                </div>

                <div style={{ border: '1px solid #EADCC9', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#7B5233', color: '#fff' }}>
                        <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>STT</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Tiêu chí đánh giá</th>
                        <th style={{ padding: '8px 10px', width: '110px', textAlign: 'center' }}>Trọng số / Max</th>
                        <th style={{ padding: '8px 10px', width: '100px', textAlign: 'center' }}>Điểm đạt</th>
                        <th style={{ padding: '8px 10px', width: '110px', textAlign: 'center' }}>Đánh giá</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Ghi chú</th>
                        <th style={{ padding: '8px 10px', width: '50px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.criterias.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                            Chưa có tiêu chí nào. Bấm "Thêm tiêu chí" để bắt đầu.
                          </td>
                        </tr>
                      ) : (
                        formData.criterias.map((item, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: index % 2 === 0 ? '#fff' : '#FAF6F0' }}>
                            <td style={{ textAlign: 'center', fontWeight: '700', color: '#7B5233' }}>{index + 1}</td>
                            <td style={{ padding: '6px 8px' }}>
                              <input
                                type="text"
                                value={item.criteria_name}
                                onChange={(e) => handleCriteriaChange(index, 'criteria_name', e.target.value)}
                                placeholder="Nhập tên tiêu chí..."
                                style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                              />
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                              <input
                                type="number"
                                value={item.max_score}
                                onChange={(e) => handleCriteriaChange(index, 'max_score', parseFloat(e.target.value) || 0)}
                                style={{ width: '70px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', outline: 'none' }}
                              />
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                              <input
                                type="number"
                                value={item.achieved_score}
                                onChange={(e) => handleCriteriaChange(index, 'achieved_score', parseFloat(e.target.value) || 0)}
                                style={{ width: '70px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'center', fontWeight: 'bold', color: '#ea580c', outline: 'none' }}
                              />
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                              <select
                                value={item.evaluation}
                                onChange={(e) => handleCriteriaChange(index, 'evaluation', e.target.value)}
                                style={{ width: '90px', padding: '4px 4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', outline: 'none', backgroundColor: '#fff' }}
                              >
                                <option value="Đạt">Đạt</option>
                                <option value="Chưa đạt">Chưa đạt</option>
                                <option value="Khá">Khá</option>
                                <option value="Tốt">Tốt</option>
                              </select>
                            </td>
                            <td style={{ padding: '6px 8px' }}>
                              <input
                                type="text"
                                value={item.note || ''}
                                onChange={(e) => handleCriteriaChange(index, 'note', e.target.value)}
                                placeholder="Ghi chú đánh giá..."
                                style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                              />
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                              <button
                                onClick={() => handleDeleteCriteria(index)}
                                style={{ border: 'none', background: '#fee2e2', color: '#ef4444', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #EADCC9',
          display: 'flex', justifyContent: 'flex-end', gap: '10px',
          backgroundColor: '#FAF6F0'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '8px',
              backgroundColor: '#fff', color: '#475569', fontWeight: '700', fontSize: '12px', cursor: 'pointer'
            }}
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 20px', border: 'none', borderRadius: '8px',
              backgroundColor: '#7B5233', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer'
            }}
          >
            <Save size={14} />
            {saving ? 'Đang lưu...' : 'Lưu thông tin nhiệm vụ'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default KPITaskEvaluationModal;
