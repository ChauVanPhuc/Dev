import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle2, ChevronRight, ChevronLeft, Send, AlertTriangle } from 'lucide-react';
import '../Assessment/assessment.css';

const CandidateQuizView = ({ assessment, candidateInfo, onSubmit, submitting }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [question_id]: ['A'] }
  const [timeLeft, setTimeLeft] = useState((assessment.duration_minutes || 45) * 60);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const hasAutoSubmitted = useRef(false);

  const questions = assessment.questions || [];
  const currentQ = questions[currentIndex] || {};

  // Đồng hồ đếm ngược thời gian thực
  useEffect(() => {
    if (timeLeft <= 0) {
      if (!hasAutoSubmitted.current) {
        hasAutoSubmitted.current = true;
        handleFinalSubmit(true);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!hasAutoSubmitted.current) {
            hasAutoSubmitted.current = true;
            handleFinalSubmit(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Format thời gian mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (qId, optId, isMulti) => {
    setAnswers(prev => {
      const currentList = prev[qId] || [];
      if (isMulti) {
        const exists = currentList.includes(optId);
        const nextList = exists ? currentList.filter(id => id !== optId) : [...currentList, optId];
        return { ...prev, [qId]: nextList };
      } else {
        return { ...prev, [qId]: [optId] };
      }
    });
  };

  const handleFinalSubmit = (isTimedOut = false) => {
    const timeSpent = ((assessment.duration_minutes || 45) * 60) - timeLeft;
    onSubmit({
      assessment_id: assessment.id,
      candidate_name: candidateInfo.candidate_name,
      position_name: candidateInfo.position_name,
      department_name: candidateInfo.department_name,
      employee_code: candidateInfo.employee_code,
      time_spent_seconds: Math.max(1, timeSpent),
      is_timed_out: isTimedOut,
      answers: answers
    });
  };

  const answeredCount = Object.keys(answers).filter(k => {
    const val = answers[k];
    if (typeof val === 'string') return val.trim().length > 0;
    return Array.isArray(val) && val.length > 0;
  }).length;
  const isLastQuestion = currentIndex === questions.length - 1;
  const isUrgent = timeLeft < 120; // Dưới 2 phút
  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <div className="quiz-session-wrapper">
      {/* Top Header Bar */}
      <header className="quiz-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            border: '2px solid #fde68a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '900', fontSize: '17px', color: '#ffffff',
            boxShadow: '0 3px 10px rgba(217, 119, 6, 0.35)'
          }}>
            {candidateInfo.candidate_name ? candidateInfo.candidate_name[0].toUpperCase() : 'N'}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#1c1917', lineHeight: '1.2' }}>
              {candidateInfo.candidate_name || 'Ứng viên'}
            </div>
            <div style={{ fontSize: '12.5px', color: '#92400e', fontWeight: '600', marginTop: '2px' }}>
              {candidateInfo.position_name} • {candidateInfo.department_name}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className={`timer-pill ${isUrgent ? 'urgent' : ''}`}>
            <Clock size={16} /> <span>{formatTime(timeLeft)}</span>
          </div>
          <button
            onClick={() => setShowConfirmSubmit(true)}
            style={{
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              color: '#ffffff', border: '1px solid rgba(254, 240, 138, 0.4)', borderRadius: '10px',
              padding: '8px 18px', fontSize: '13px', fontWeight: '800',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 3px 12px rgba(217, 119, 6, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <Send size={14} /> Nộp bài
          </button>
        </div>
      </header>

      {/* Main Quiz Area (Fit 100vh) */}
      <main className="quiz-main-area">
        <div className="quiz-content-container">
          
          {/* Tracker bar & Progress Bar */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#78716c', fontWeight: '600' }}>
              <span>Câu hỏi <b style={{ color: '#1c1917' }}>{currentIndex + 1}</b> / {questions.length}</span>
              <span>Đã hoàn thành: <b style={{ color: '#92400e' }}>{answeredCount}/{questions.length}</b> ({progressPercent}%)</span>
            </div>
            <div className="quiz-progress-track">
              <div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {/* Question Box Card */}
          <div className="quiz-question-card">
            {/* Tag loại câu hỏi & Điểm */}
            <div className="quiz-question-header">
              <span className="quiz-type-badge">
                {currentQ.question_type === 'essay' ? '✍️ Tự luận' : currentQ.question_type === 'multi_choice' ? '☑️ Nhiều lựa chọn' : '✨ 1 lựa chọn'}
              </span>
              <span className="quiz-points-badge">
                ⭐ {currentQ.points || 1.0} điểm
              </span>
            </div>

            {/* Nội dung câu hỏi */}
            <h2 className="quiz-question-title">
              {currentQ.question_text}
            </h2>

            {/* Danh sách lựa chọn đáp án hoặc ô nhập tự luận */}
            {currentQ.question_type === 'essay' ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px',
                  padding: '8px 12px', marginBottom: '8px', flexShrink: 0
                }}>
                  <span style={{ fontSize: '12px', color: '#92400e', fontWeight: '700' }}>
                    💡 Hướng dẫn: Trình bày chi tiết quy trình hoặc tiêu chuẩn.
                  </span>
                  <span style={{ fontSize: '11.5px', color: '#78716c', fontWeight: '600' }}>
                    {((typeof answers[currentQ.id] === 'string' ? answers[currentQ.id] : (answers[currentQ.id]?.[0] || '')).length)} ký tự
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={typeof answers[currentQ.id] === 'string' ? answers[currentQ.id] : (answers[currentQ.id]?.[0] || '')}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
                  placeholder="Nhập câu trả lời tự luận chi tiết của bạn tại đây (Hệ thống AI sẽ tự động phân tích và đối soát barem điểm)..."
                  style={{
                    width: '100%',
                    flex: 1,
                    minHeight: '100px',
                    padding: '12px 14px',
                    background: '#faf8f5',
                    border: '1.5px solid #d6d3d1',
                    borderRadius: '12px',
                    color: '#1c1917',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    lineHeight: '1.5',
                    outline: 'none',
                    resize: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#d97706'}
                  onBlur={(e) => e.target.style.borderColor = '#d6d3d1'}
                />
              </div>
            ) : (
              <div className="quiz-options-list">
                {currentQ.options && currentQ.options.map((opt) => {
                  const selectedList = Array.isArray(answers[currentQ.id]) ? answers[currentQ.id] : [];
                  const isSelected = selectedList.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      className={`quiz-option-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectOption(currentQ.id, opt.id, currentQ.question_type === 'multi_choice')}
                    >
                      <div className="option-radio-circle">
                        {isSelected && <div className="option-radio-circle-inner" />}
                      </div>
                      <span style={{ color: '#1c1917', fontWeight: isSelected ? '700' : '500', lineHeight: '1.4', flex: 1 }}>
                        <b style={{ color: '#b45309', marginRight: '6px' }}>{opt.id}.</b> {opt.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Danh sách nút chuyển nhanh từng câu */}
          <div className="quiz-pagination-box">
            {questions.map((q, idx) => {
              const val = answers[q.id];
              const isAnswered = typeof val === 'string' ? val.trim().length > 0 : Array.isArray(val) && val.length > 0;
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id || idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`quiz-page-btn ${isCurrent ? 'active' : isAnswered ? 'answered' : 'unanswered'}`}
                  title={`Câu ${idx + 1} (${isAnswered ? 'Đã trả lời' : 'Chưa làm'})`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Bottom Bar: Nút chuyển câu */}
          <div className="quiz-bottom-actions">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              className="quiz-btn-prev"
            >
              <ChevronLeft size={16} /> Câu trước
            </button>

            {isLastQuestion ? (
              <button
                onClick={() => setShowConfirmSubmit(true)}
                disabled={submitting}
                className="quiz-btn-next"
              >
                {submitting ? 'Đang chấm điểm & AI đánh giá...' : 'Hoàn thành & Nộp bài'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="quiz-btn-next"
              >
                Xác nhận & Tiếp tục <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Modal xác nhận nộp bài */}
      {showConfirmSubmit && (
        <div className="assessment-modal-overlay">
          <div className="assessment-modal-box" style={{ maxWidth: '440px', textAlign: 'center' }}>
            <AlertTriangle size={48} color="#d97706" style={{ margin: '0 auto 16px auto', display: 'block' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1c1917', margin: '0 0 8px 0' }}>
              Xác nhận nộp bài thi?
            </h3>
            <p style={{ fontSize: '13.5px', color: '#57534e', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              Bạn đã hoàn thành <b>{answeredCount} / {questions.length}</b> câu hỏi. 
              {answeredCount < questions.length && (
                <span style={{ color: '#dc2626', display: 'block', marginTop: '6px', fontWeight: '600' }}>
                  ⚠️ Còn {questions.length - answeredCount} câu chưa trả lời.
                </span>
              )}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowConfirmSubmit(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  background: '#f5f5f4', border: '1px solid #e7e5e4',
                  color: '#57534e', fontWeight: '700', cursor: 'pointer'
                }}
              >
                Làm tiếp
              </button>
              <button
                onClick={() => {
                  setShowConfirmSubmit(false);
                  handleFinalSubmit(false);
                }}
                disabled={submitting}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                  border: '1px solid rgba(254, 240, 138, 0.4)', color: '#ffffff', fontWeight: '800',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)'
                }}
              >
                {submitting ? 'Đang nộp...' : 'Đồng ý nộp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateQuizView;
