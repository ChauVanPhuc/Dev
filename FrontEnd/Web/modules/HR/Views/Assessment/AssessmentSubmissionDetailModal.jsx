import React, { useState, useEffect } from 'react';
import { 
  X, Award, CheckCircle2, XCircle, AlertTriangle, HelpCircle, 
  Clock, Calendar, User, Briefcase, Building2, BrainCircuit, 
  Printer, Check, Filter, BookOpen, Sparkles, Target, Edit3,
  RefreshCw, Save, ChevronRight
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import './assessment.css';

const AssessmentSubmissionDetailModal = ({ submissionId, onClose, onRefresh }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'correct' | 'incorrect' | 'essay'
  const [regrading, setRegrading] = useState(false);
  
  // Inline edit state for overriding scores
  const [editingAnswerId, setEditingAnswerId] = useState(null);
  const [editScoreValue, setEditScoreValue] = useState('');
  const [editFeedbackValue, setEditFeedbackValue] = useState('');
  const [savingScore, setSavingScore] = useState(false);

  const fetchDetail = () => {
    if (submissionId) {
      setLoading(true);
      api.get(`/assessment/result/${submissionId}`)
        .then(res => {
          setData(res);
        })
        .catch(err => {
          console.error('Error fetching submission detail:', err);
          alert('Không thể tải chi tiết bài làm này.');
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [submissionId]);

  const handleRegradeAI = async () => {
    if (!window.confirm('Hệ thống sẽ gọi AI để phân tích và chấm lại toàn bộ các câu hỏi tự luận trong bài thi này. Bạn có muốn tiếp tục?')) return;
    setRegrading(true);
    try {
      const res = await api.post(`/hr/assessments/submissions/${submissionId}/regrade-ai`);
      setData(res);
      if (onRefresh) onRefresh();
      alert('Đã chấm lại bài thi bằng AI thành công!');
    } catch (err) {
      alert('Lỗi khi chấm lại bằng AI: ' + (err.response?.data?.detail || err.message));
    } finally {
      setRegrading(false);
    }
  };

  const handleStartEdit = (ans) => {
    setEditingAnswerId(ans.answer_id);
    setEditScoreValue(ans.points_earned.toString());
    setEditFeedbackValue('');
  };

  const handleCancelEdit = () => {
    setEditingAnswerId(null);
    setEditScoreValue('');
    setEditFeedbackValue('');
  };

  const handleSaveScore = async (answerId) => {
    const num = parseFloat(editScoreValue);
    if (isNaN(num) || num < 0) {
      alert('Vui lòng nhập điểm số hợp lệ.');
      return;
    }

    setSavingScore(true);
    try {
      const res = await api.put(`/hr/assessments/submissions/${submissionId}/override-score`, {
        answers: [{
          answer_id: answerId,
          points_earned: num,
          feedback: editFeedbackValue.trim() || undefined
        }]
      });
      setData(res);
      setEditingAnswerId(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Lỗi khi cập nhật điểm: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSavingScore(false);
    }
  };

  if (!submissionId) return null;

  useEffect(() => {
    document.body.classList.add('print-detail-open');
    return () => {
      document.body.classList.remove('print-detail-open');
    };
  }, []);

  const getRankBadgeColor = (level) => {
    switch (level) {
      case 'Level A': return { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669', badge: '#10b981' };
      case 'Level B': return { bg: '#fef3c7', border: '#fde68a', text: '#92400e', badge: '#d97706' };
      case 'Level C': return { bg: '#fff7ed', border: '#ffedd5', text: '#c2410c', badge: '#f59e0b' };
      case 'Level D': return { bg: '#fef2f2', border: '#fee2e2', text: '#dc2626', badge: '#ea580c' };
      default: return { bg: '#fdfbf7', border: '#ebdccb', text: '#78350f', badge: '#b45309' };
    }
  };

  const handlePrint = () => {
    // Reset bộ lọc về 'all' để đảm bảo in đầy đủ 100% tất cả câu hỏi
    setActiveFilter('all');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const formatSeconds = (sec) => {
    if (!sec) return '---';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m} phút ${s > 0 ? s + ' giây' : ''}`;
  };

  const answers = data?.answers || [];
  const correctCount = answers.filter(a => a.is_correct).length;
  const incorrectCount = answers.filter(a => !a.is_correct && a.question_type !== 'essay').length;
  const essayCount = answers.filter(a => a.question_type === 'essay').length;

  const filteredAnswers = answers.filter(a => {
    if (activeFilter === 'correct') return a.is_correct;
    if (activeFilter === 'incorrect') return !a.is_correct && a.question_type !== 'essay';
    if (activeFilter === 'essay') return a.question_type === 'essay';
    return true;
  });

  const badgeTheme = data ? getRankBadgeColor(data.rank_level) : null;

  return (
    <div className="assessment-modal-overlay" onClick={onClose}>
      <div 
        className="assessment-modal-box submission-detail-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Printable Official Corporate Header (Chỉ hiện khi In phiếu / Xuất PDF) */}
        <div className="print-only-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #1c1917', paddingBottom: '8px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '0.04em', color: '#78350f', textTransform: 'uppercase' }}>
                CÔNG TY CỔ PHẦN SMARTFLOW
              </div>
              <div style={{ fontSize: '11px', color: '#57534e' }}>
                Phòng Nhân Sự & Quản Trị Đánh Giá Năng Lực (QA/QC)
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '15px', fontWeight: '900', color: '#1c1917', textTransform: 'uppercase' }}>
                PHIẾU KẾT QUẢ ĐÁNH GIÁ SÁT HẠCH
              </div>
              <div style={{ fontSize: '11px', color: '#78716c' }}>
                Mã đợt thi: #{data?.assessment_id || 'ASM'} • In ngày: {new Date().toLocaleDateString('vi-VN')}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Header (Ẩn khi In) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid #e7dfd5', paddingBottom: '14px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fef3c7', padding: '3px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: '700', color: '#92400e', marginBottom: '6px' }}>
              <BookOpen size={13} /> {data?.assessment_title || 'Đánh giá năng lực'}
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#1c1917', margin: 0, letterSpacing: '-0.02em' }}>
              Chi Tiết Bài Làm & Kết Quả Chấm Điểm
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {essayCount > 0 && (
              <button
                onClick={handleRegradeAI}
                disabled={regrading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: regrading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)'
                }}
                title="Yêu cầu AI phân tích và chấm lại các câu tự luận"
              >
                <Sparkles size={14} className={regrading ? 'spin' : ''} /> {regrading ? 'Đang chấm AI...' : 'Chấm lại bằng AI'}
              </button>
            )}

            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#faf9f6',
                border: '1px solid #d6d3d1',
                color: '#44403c',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="In phiếu kết quả bài làm"
            >
              <Printer size={14} /> In phiếu
            </button>
            
            <button
              onClick={onClose}
              style={{
                background: '#f5f5f4',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                color: '#78716c',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#78716c' }}>
            <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px auto', display: 'block', color: '#d97706' }} />
            Đang tải dữ liệu chi tiết bài làm...
          </div>
        ) : !data ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
            Không tìm thấy dữ liệu bài làm.
          </div>
        ) : (
          <div>
            {/* Candidate & Result Overview Card */}
            <div className="print-avoid-break" style={{
              background: '#fdfbf7',
              border: '1px solid #ebdccb',
              borderRadius: '16px',
              padding: '18px 20px',
              marginBottom: '16px',
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: '16px'
            }}>
              {/* Left Column: Candidate Info */}
              <div>
                <div style={{ fontSize: '12px', color: '#78716c', fontWeight: '600', marginBottom: '2px' }}>
                  Thông tin nhân sự làm bài:
                </div>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#1c1917', marginBottom: '6px' }}>
                  {data.candidate_name} {data.employee_code && <span style={{ fontSize: '12px', color: '#92400e', fontWeight: 'normal' }}>({data.employee_code})</span>}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12.5px', color: '#57534e' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Briefcase size={13} color="#d97706" /> Vị trí: <b>{data.position_name}</b>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={13} color="#d97706" /> Bộ phận: <b>{data.department_name}</b>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={13} color="#d97706" /> Thời gian làm bài: <b>{formatSeconds(data.time_spent_seconds)}</b> (Nộp lúc {data.submitted_at})
                  </div>
                </div>
              </div>

              {/* Right Column: Score & Rank */}
              <div style={{
                background: '#ffffff',
                border: `1.5px solid ${badgeTheme.border}`,
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: badgeTheme.badge,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: '900',
                  flexShrink: 0
                }}>
                  {data.rank_level?.replace('Level ', '') || 'F'}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '17px', fontWeight: '900', color: '#1c1917' }}>
                    {data.percentage}% <span style={{ fontSize: '12px', color: '#92400e', fontWeight: '700' }}>({data.total_score}/{data.max_score} điểm)</span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: badgeTheme.text, margin: '2px 0' }}>
                    {data.rank_title || data.rank_level}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#78716c' }}>
                    {data.nine_box_category || 'Đánh giá năng lực tiêu chuẩn'}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Executive Summary Callout */}
            {data.ai_summary && (
              <div className="print-avoid-break" style={{
                background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                border: '1.5px solid #d8b4fe',
                borderRadius: '14px',
                padding: '14px 18px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#3b0764',
                lineHeight: '1.55',
                display: 'flex',
                gap: '10px'
              }}>
                <Sparkles size={18} color="#9333ea" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <b style={{ color: '#581c87' }}>Nhận xét tổng quan của AI: </b>
                  {data.ai_summary}
                </div>
              </div>
            )}

            {/* Question Filter Tabs Bar (Ẩn khi in) */}
            <div className="no-print" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              borderBottom: '1px solid #e7dfd5',
              paddingBottom: '10px'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setActiveFilter('all')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: activeFilter === 'all' ? '#1c1917' : '#faf9f6',
                    color: activeFilter === 'all' ? '#ffffff' : '#57534e',
                    border: '1px solid #d6d3d1'
                  }}
                >
                  Tất cả ({answers.length})
                </button>
                <button
                  onClick={() => setActiveFilter('correct')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: activeFilter === 'correct' ? '#059669' : '#ecfdf5',
                    color: activeFilter === 'correct' ? '#ffffff' : '#059669',
                    border: '1px solid #a7f3d0'
                  }}
                >
                  ✅ Câu đúng ({correctCount})
                </button>
                <button
                  onClick={() => setActiveFilter('incorrect')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: activeFilter === 'incorrect' ? '#dc2626' : '#fef2f2',
                    color: activeFilter === 'incorrect' ? '#ffffff' : '#dc2626',
                    border: '1px solid #fecaca'
                  }}
                >
                  ❌ Câu sai ({incorrectCount})
                </button>
                {essayCount > 0 && (
                  <button
                    onClick={() => setActiveFilter('essay')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      background: activeFilter === 'essay' ? '#7c3aed' : '#faf5ff',
                      color: activeFilter === 'essay' ? '#ffffff' : '#7c3aed',
                      border: '1px solid #e9d5ff'
                    }}
                  >
                    📝 Tự luận ({essayCount})
                  </button>
                )}
              </div>

              <div style={{ fontSize: '12px', color: '#78716c', fontWeight: '600' }}>
                Hiển thị {filteredAnswers.length}/{answers.length} câu
              </div>
            </div>

            {/* Questions List */}
            {filteredAnswers.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#78716c' }}>
                Không có câu hỏi nào theo bộ lọc này.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredAnswers.map((ans, idx) => {
                  const isEssay = ans.question_type === 'essay';
                  const isCorrect = ans.is_correct;
                  const candidateSelected = ans.selected_answers || [];
                  const correctAnswers = ans.correct_answers || [];
                  const isEditingThis = editingAnswerId === ans.answer_id;
                  const aiFb = ans.ai_feedback;

                  return (
                    <div 
                      key={ans.answer_id || idx}
                      className="print-avoid-break"
                      style={{
                        background: '#faf9f6',
                        border: isEssay ? '1.5px solid #d8b4fe' : (isCorrect ? '1.5px solid #10b981' : '1.5px solid #f87171'),
                        borderRadius: '12px',
                        padding: '16px 18px'
                      }}
                    >
                      {/* Question Item Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: isEssay ? '#f3e8ff' : (isCorrect ? '#ecfdf5' : '#fef2f2'),
                            color: isEssay ? '#7c3aed' : (isCorrect ? '#059669' : '#dc2626'),
                            fontWeight: '800',
                            fontSize: '12px'
                          }}>
                            {idx + 1}
                          </span>

                          <span style={{ fontWeight: '800', fontSize: '13px', color: '#1c1917' }}>
                            Câu {idx + 1}
                          </span>

                          {ans.category_tag && (
                            <span style={{ fontSize: '11px', background: '#f5f5f4', padding: '2px 8px', borderRadius: '6px', color: '#57534e', border: '1px solid #e7dfd5' }}>
                              {ans.category_tag}
                            </span>
                          )}

                          {isEssay && (
                            <span style={{ fontSize: '11px', background: '#f3e8ff', padding: '2px 8px', borderRadius: '6px', color: '#7c3aed', fontWeight: '800', border: '1px solid #e9d5ff' }}>
                              🤖 Tự luận AI Chấm
                            </span>
                          )}
                        </div>

                        {/* Points Badge & Override Button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isEditingThis ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="number"
                                step="0.25"
                                min="0"
                                max={ans.points_max}
                                value={editScoreValue}
                                onChange={(e) => setEditScoreValue(e.target.value)}
                                style={{
                                  width: '60px',
                                  padding: '4px 6px',
                                  borderRadius: '6px',
                                  border: '1px solid #d97706',
                                  fontWeight: '800',
                                  fontSize: '12px',
                                  outline: 'none',
                                  textAlign: 'center'
                                }}
                              />
                              <span style={{ fontSize: '11px', color: '#78716c' }}>/{ans.points_max} đ</span>
                              <button
                                onClick={() => handleSaveScore(ans.answer_id)}
                                disabled={savingScore}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  background: '#059669',
                                  color: '#fff',
                                  border: 'none',
                                  fontWeight: '700',
                                  fontSize: '11.5px',
                                  cursor: 'pointer'
                                }}
                              >
                                Lưu
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  background: '#f5f5f4',
                                  color: '#444',
                                  border: '1px solid #d6d3d1',
                                  fontSize: '11.5px',
                                  cursor: 'pointer'
                                }}
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontSize: '12px',
                                fontWeight: '800',
                                padding: '3px 10px',
                                borderRadius: '8px',
                                background: isCorrect ? '#ecfdf5' : '#fef2f2',
                                color: isCorrect ? '#059669' : '#dc2626',
                                border: `1px solid ${isCorrect ? '#a7f3d0' : '#fecaca'}`
                              }}>
                                {ans.points_earned} / {ans.points_max} điểm
                              </span>

                              <button
                                onClick={() => handleStartEdit(ans)}
                                className="no-print"
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: '#ffffff',
                                  border: '1px solid #d6d3d1',
                                  color: '#57534e',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                                title="Chỉnh sửa điểm số thủ công cho câu này"
                              >
                                <Edit3 size={12} /> Sửa điểm
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#1c1917', marginBottom: '10px', lineHeight: '1.45' }}>
                        {ans.question_text}
                      </div>

                      {/* Essay Answer Details or Multiple Choice Grid */}
                      {isEssay ? (
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{
                            background: '#ffffff',
                            border: '1px solid #e7dfd5',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            fontSize: '13px',
                            color: '#1c1917',
                            lineHeight: '1.5',
                            marginBottom: '8px'
                          }}>
                            <b style={{ color: '#92400e' }}>✍️ Câu trả lời của ứng viên: </b>
                            <div style={{ whiteSpace: 'pre-wrap', marginTop: '4px', color: '#292524' }}>
                              {candidateSelected[0] || '(Không có câu trả lời)'}
                            </div>
                          </div>

                          {aiFb && (
                            <div style={{
                              background: '#fbf9fe',
                              border: '1px solid #e9d5ff',
                              borderRadius: '8px',
                              padding: '10px 14px',
                              fontSize: '12px',
                              color: '#581c87',
                              lineHeight: '1.45'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', marginBottom: '4px' }}>
                                <Sparkles size={13} color="#9333ea" /> Đánh giá chi tiết từ AI:
                              </div>
                              <div style={{ whiteSpace: 'pre-wrap' }}>
                                {aiFb.comment}
                              </div>
                              {aiFb.criteria_breakdown && (
                                <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #d8b4fe', fontSize: '11.5px', color: '#6b21a8' }}>
                                  <b>Chi tiết barem: </b> 
                                  {Object.entries(aiFb.criteria_breakdown).map(([k, v]) => `${k}: ${v}`).join(' • ')}
                                </div>
                              )}
                            </div>
                          )}

                          {isEditingThis && (
                            <div style={{ marginTop: '6px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '700', color: '#444' }}>
                                Ghi chú của Giám khảo (tùy chọn):
                              </label>
                              <input
                                type="text"
                                value={editFeedbackValue}
                                onChange={(e) => setEditFeedbackValue(e.target.value)}
                                placeholder="Ví dụ: Đã kiểm tra lại thực tế tại xưởng, cộng thêm 0.5 điểm..."
                                style={{
                                  width: '100%',
                                  padding: '7px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #d97706',
                                  fontSize: '12px',
                                  marginTop: '4px',
                                  outline: 'none',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                          {ans.options?.map((opt) => {
                            const isCandidateChoice = candidateSelected.includes(opt.id);
                            const isTrueAnswer = correctAnswers.includes(opt.id);

                            let optBg = '#ffffff';
                            let optBorder = '#e7dfd5';
                            let optColor = '#44403c';

                            if (isCandidateChoice && isTrueAnswer) {
                              optBg = '#ecfdf5';
                              optBorder = '#10b981';
                              optColor = '#059669';
                            } else if (isCandidateChoice && !isTrueAnswer) {
                              optBg = '#fef2f2';
                              optBorder = '#ef4444';
                              optColor = '#dc2626';
                            } else if (!isCandidateChoice && isTrueAnswer) {
                              optBg = '#f0fdf4';
                              optBorder = '#86efac';
                              optColor = '#15803d';
                            }

                            return (
                              <div
                                key={opt.id}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  background: optBg,
                                  border: `1px solid ${optBorder}`,
                                  color: optColor,
                                  fontWeight: (isCandidateChoice || isTrueAnswer) ? '700' : '500',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  lineHeight: '1.4'
                                }}
                              >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <b>{opt.id}.</b> {opt.text}
                                </span>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                  {isCandidateChoice && isTrueAnswer && (
                                    <span style={{ fontSize: '11px', background: '#059669', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
                                      Bạn chọn đúng
                                    </span>
                                  )}
                                  {isCandidateChoice && !isTrueAnswer && (
                                    <span style={{ fontSize: '11px', background: '#dc2626', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
                                      Bạn chọn sai
                                    </span>
                                  )}
                                  {!isCandidateChoice && isTrueAnswer && (
                                    <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', border: '1px solid #86efac' }}>
                                      Đáp án chuẩn
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Explanation & Standard Reference Callout */}
                      {ans.explanation && (
                        <div style={{
                          fontSize: '12px',
                          color: '#78716c',
                          background: '#ffffff',
                          border: '1px solid #ebdccb',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          lineHeight: '1.45'
                        }}>
                          <b style={{ color: '#92400e' }}>💡 {isEssay ? 'Barem tiêu chuẩn & Hướng dẫn chấm:' : 'Giải thích & Tiêu chuẩn:'} </b>
                          {ans.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Official Signatures Block (Chỉ hiện khi In) */}
            <div className="print-only-signatures">
              <div style={{ textAlign: 'center', minWidth: '150px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#1c1917', textTransform: 'uppercase' }}>NGƯỜI LÀM BÀI</div>
                <div style={{ fontSize: '10.5px', color: '#78716c', fontStyle: 'italic', marginBottom: '55px' }}>(Ký và ghi rõ họ tên)</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1c1917' }}>{data.candidate_name}</div>
              </div>

              <div style={{ textAlign: 'center', minWidth: '150px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#1c1917', textTransform: 'uppercase' }}>CÁN BỘ CHẤM THI / QUẢN LÝ</div>
                <div style={{ fontSize: '10.5px', color: '#78716c', fontStyle: 'italic', marginBottom: '55px' }}>(Ký và ghi rõ họ tên)</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1c1917' }}>..........................................</div>
              </div>

              <div style={{ textAlign: 'center', minWidth: '150px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#1c1917', textTransform: 'uppercase' }}>PHÒNG NHÂN SỰ / QA</div>
                <div style={{ fontSize: '10.5px', color: '#78716c', fontStyle: 'italic', marginBottom: '55px' }}>(Xác nhận & Lưu hồ sơ)</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1c1917' }}>..........................................</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentSubmissionDetailModal;
