import React, { useState } from 'react';
import { X, CheckCircle2, HelpCircle, Upload, Plus } from 'lucide-react';
import AssessmentImportModal from './AssessmentImportModal';
import './assessment.css';

const AssessmentQuestionsModal = ({ assessment, onClose, onRefresh }) => {
  const [showAppendImportModal, setShowAppendImportModal] = useState(false);

  if (!assessment) return null;

  return (
    <>
      <div className="assessment-modal-overlay" onClick={onClose}>
        <div 
          className="assessment-modal-box" 
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '820px',
            maxHeight: '90vh',
            background: '#ffffff',
            border: '1px solid #e7dfd5',
            color: '#1c1917',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e7dfd5', paddingBottom: '12px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1c1917', margin: '0 0 3px 0' }}>
                Ngân Hàng Câu Hỏi - {assessment.title}
              </h2>
              <p style={{ fontSize: '12.5px', color: '#78716c', margin: 0 }}>
                Tổng cộng {assessment.questions?.length || assessment.total_questions} câu hỏi
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setShowAppendImportModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
                title="Bổ sung thêm câu hỏi từ file Excel hoặc Markdown"
              >
                <Upload size={14} /> Import thêm câu hỏi
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

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {assessment.questions && assessment.questions.length > 0 ? (
              assessment.questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  style={{
                    background: '#fdfbf7',
                    border: '1px solid #e7dfd5',
                    borderRadius: '12px',
                    padding: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '800', fontSize: '13px', color: '#b45309' }}>
                      Câu {idx + 1} {q.category_tag && `• [${q.category_tag}]`} {q.question_type === 'essay' && `• [Tự luận]`}
                    </span>
                    <span style={{
                      fontSize: '11.5px',
                      fontWeight: '700',
                      color: '#059669',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}>
                      {q.points} điểm
                    </span>
                  </div>

                  <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#1c1917', marginBottom: '10px', lineHeight: '1.5' }}>
                    {q.question_text}
                  </div>

                  {q.question_type === 'essay' ? (
                    <div style={{
                      background: '#ffffff',
                      border: '1px solid #ebdccb',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '12.5px',
                      color: '#57534e'
                    }}>
                      <b style={{ color: '#78350f' }}>Tiêu chí chấm điểm: </b>
                      {q.explanation || 'Chấm điểm dựa trên mức độ hiểu quy trình và câu trả lời tự luận của ứng viên.'}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      {q.options && q.options.map((opt) => {
                        const isCorrect = (q.correct_answers || []).includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            style={{
                              padding: '7px 10px',
                              borderRadius: '8px',
                              fontSize: '12.5px',
                              background: isCorrect ? '#ecfdf5' : '#ffffff',
                              border: isCorrect ? '1px solid #10b981' : '1px solid #e7dfd5',
                              color: isCorrect ? '#059669' : '#44403c',
                              fontWeight: isCorrect ? '700' : '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            {isCorrect && <CheckCircle2 size={14} color="#059669" />}
                            <span><b style={{ color: isCorrect ? '#059669' : '#b45309' }}>{opt.id}.</b> {opt.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.explanation && q.question_type !== 'essay' && (
                    <div style={{
                      fontSize: '12px',
                      color: '#78716c',
                      background: '#ffffff',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontStyle: 'italic',
                      border: '1px solid #e7dfd5'
                    }}>
                      💡 Giải thích: {q.explanation}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: '#78716c' }}>
                Chưa có câu hỏi nào trong bộ đề này.
              </div>
            )}
          </div>
        </div>
      </div>

      {showAppendImportModal && (
        <AssessmentImportModal
          targetAssessmentId={assessment.id}
          targetAssessmentTitle={assessment.title}
          onClose={() => setShowAppendImportModal(false)}
          onSuccess={() => {
            setShowAppendImportModal(false);
            if (onRefresh) onRefresh();
            onClose();
          }}
        />
      )}
    </>
  );
};

export default AssessmentQuestionsModal;
