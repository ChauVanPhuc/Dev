import React, { useState } from 'react';
import { ShieldCheck, Clock, FileText, ArrowRight, CheckCircle2 } from 'lucide-react';
import '../Assessment/assessment.css';

const DEFAULT_DEPT_TAGS = ['Phòng QLCL', 'Chuyền Mộc 1', 'Tổ Sơn PU', 'Tổ Đóng gói', 'Tổ Phôi ghép'];

const CandidateEntranceView = ({ assessment, onStart }) => {
  const [fullName, setFullName] = useState('');
  const [positionName, setPositionName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const targetPositions = assessment?.target_positions || ['QA', 'QC', 'Tổ trưởng'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập Họ và tên nhân sự.');
      return;
    }
    if (!positionName.trim()) {
      setErrorMsg('Vui lòng nhập hoặc chọn Vị trí công việc đánh giá.');
      return;
    }
    if (!departmentName.trim()) {
      setErrorMsg('Vui lòng nhập hoặc chọn Đội ngũ / Bộ phận / Chuyền xưởng.');
      return;
    }

    onStart({
      candidate_name: fullName.trim(),
      position_name: positionName.trim(),
      department_name: departmentName.trim(),
      employee_code: employeeCode.trim()
    });
  };

  return (
    <div className="candidate-portal-wrapper">
      <div className="candidate-card-container">
        {/* Header Badge */}
        <div className="candidate-header-pill">
          <ShieldCheck size={16} /> Hệ Thống Đánh Giá Năng Lực Nhân Sự
        </div>

        {/* Tên bài kiểm tra */}
        <h1 className="candidate-quiz-title">
          {assessment?.title || 'Đánh giá năng lực'}
        </h1>

        {/* Meta thông số */}
        <div className="candidate-meta-pills">
          <div className="candidate-meta-pill">
            ⏱ Thời gian: {assessment?.duration_minutes || 45} phút
          </div>
          <div className="candidate-meta-pill">
            📋 Số câu: {assessment?.total_questions || assessment?.questions?.length || 5} câu
          </div>
        </div>

        {/* Form nhập thông tin */}
        <div className="candidate-form-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#fff', borderRadius: '50%',
              width: '24px', height: '24px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '13px', fontWeight: '800',
              boxShadow: '0 2px 8px rgba(217, 119, 6, 0.4)'
            }}>
              1
            </span>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#1c1917', margin: 0 }}>
              Thông tin nhân sự tham gia
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: '#78716c', margin: '0 0 18px 0', paddingLeft: '34px' }}>
            Vui lòng điền chính xác để hệ thống phân loại Level A, B, C theo chuẩn vị trí.
          </p>

          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444',
              color: '#fca5a5', padding: '10px 14px', borderRadius: '10px',
              fontSize: '13px', marginBottom: '16px'
            }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Họ và tên */}
            <div className="candidate-form-group">
              <label className="candidate-label">HỌ VÀ TÊN NHÂN SỰ *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setErrorMsg(''); }}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="candidate-input"
              />
            </div>

            {/* Vị trí công việc đánh giá */}
            <div className="candidate-form-group">
              <label className="candidate-label">VỊ TRÍ CÔNG VIỆC ĐÁNH GIÁ *</label>
              <input
                type="text"
                required
                value={positionName}
                onChange={(e) => { setPositionName(e.target.value); setErrorMsg(''); }}
                placeholder="Ví dụ: QA Chuyên môn / QC kiểm tra"
                className="candidate-input"
              />
              {targetPositions.length > 0 && (
                <div className="quick-tag-list">
                  {targetPositions.map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      className={`quick-tag-item ${positionName === pos ? 'active' : ''}`}
                      onClick={() => setPositionName(pos)}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Đội ngũ / Bộ phận / Chuyền */}
            <div className="candidate-form-group">
              <label className="candidate-label">ĐỘI NGŨ / BỘ PHẬN / CHUYỀN XƯỞNG *</label>
              <input
                type="text"
                required
                value={departmentName}
                onChange={(e) => { setDepartmentName(e.target.value); setErrorMsg(''); }}
                placeholder="Ví dụ: Phòng QLCL"
                className="candidate-input"
              />
              <div className="quick-tag-list">
                {DEFAULT_DEPT_TAGS.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    className={`quick-tag-item ${departmentName === dept ? 'active' : ''}`}
                    onClick={() => setDepartmentName(dept)}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            {/* Mã nhân viên */}
            <div className="candidate-form-group">
              <label className="candidate-label">MÃ NHÂN VIÊN (NẾU CÓ)</label>
              <input
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="Ví dụ: NV-1082"
                className="candidate-input"
              />
            </div>

            {/* Nút bắt đầu */}
            <button type="submit" className="btn-candidate-start">
              Bắt đầu làm bài <ArrowRight size={18} style={{ display: 'inline', marginLeft: '6px', verticalAlign: 'middle' }} />
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
          Bảo mật dữ liệu nội bộ • Hệ thống tự động lưu bài làm và chấm điểm
        </div>
      </div>
    </div>
  );
};

export default CandidateEntranceView;
