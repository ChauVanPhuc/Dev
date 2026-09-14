import React, { useState } from 'react';
import { 
  Award, CheckCircle2, AlertTriangle, Zap, Printer, 
  ArrowLeft, BrainCircuit, Target, Briefcase, Building2,
  ChevronDown, ChevronUp, BookOpen, Check, X, ShieldCheck, UserCheck
} from 'lucide-react';
import '../Assessment/assessment.css';

const CandidateResultView = ({ result, onRestart }) => {
  const [showDetailAnswers, setShowDetailAnswers] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  if (!result) return null;

  const getRankTheme = (rankLevel) => {
    switch (rankLevel) {
      case 'Level A':
        return {
          letter: 'A',
          badgeBg: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
          bgGradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '#86efac',
          textColor: '#15803d',
          tagText: 'Xuất sắc / Chuyên gia'
        };
      case 'Level B':
        return {
          letter: 'B',
          badgeBg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
          bgGradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '#fde68a',
          textColor: '#92400e',
          tagText: 'Khá / Nắm vững'
        };
      case 'Level C':
        return {
          letter: 'C',
          badgeBg: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
          bgGradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
          border: '#fed7aa',
          textColor: '#c2410c',
          tagText: 'Đạt / Cần bổ sung'
        };
      case 'Level D':
        return {
          letter: 'D',
          badgeBg: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          bgGradient: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: '#fecaca',
          textColor: '#b91c1c',
          tagText: 'Chưa đạt / Cần đào tạo'
        };
      default:
        return {
          letter: 'F',
          badgeBg: 'linear-gradient(135deg, #78716c 0%, #57534e 100%)',
          bgGradient: 'linear-gradient(135deg, #fafaf9 0%, #f5f5f4 100%)',
          border: '#e7e5e4',
          textColor: '#57534e',
          tagText: 'Chưa xếp hạng'
        };
    }
  };

  const theme = getRankTheme(result.rank_level);

  const handlePrint = () => {
    window.print();
  };

  const answers = result.answers || [];
  const correctCount = answers.filter(a => a.is_correct).length;
  const incorrectCount = answers.filter(a => !a.is_correct && a.question_type !== 'essay').length;

  const filteredAnswers = answers.filter(a => {
    if (activeFilter === 'correct') return a.is_correct;
    if (activeFilter === 'incorrect') return !a.is_correct && a.question_type !== 'essay';
    return true;
  });

  return (
    <div className="candidate-portal-wrapper" style={{ padding: '20px 14px', minHeight: '100vh', justifyContent: 'flex-start', boxSizing: 'border-box' }}>
      <div className="candidate-card-container" style={{ maxWidth: '680px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Profile & Assessment Header */}
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e5d8c8',
          borderRadius: '20px',
          padding: '20px',
          boxShadow: '0 8px 24px -6px rgba(120, 80, 40, 0.06)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px'
        }}>
          {/* Top Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '11.5px',
            color: '#9a3412',
            fontWeight: '700'
          }}>
            <Award size={14} color="#d97706" /> Báo cáo Kết quả Đánh giá Năng lực
          </div>

          {/* Assessment Title */}
          <div style={{ fontSize: '14.5px', fontWeight: '800', color: '#78350f', maxWidth: '90%', lineHeight: '1.4' }}>
            {result.assessment_title || 'Bài kiểm tra năng lực chuyên môn'}
          </div>

          {/* Candidate Avatar & Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              border: '2px solid #fde68a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '900', fontSize: '18px', color: '#ffffff',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)',
              flexShrink: 0
            }}>
              {result.candidate_name ? result.candidate_name[0].toUpperCase() : 'N'}
            </div>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#1c1917', margin: 0, letterSpacing: '-0.01em', lineHeight: '1.2' }}>
                {result.candidate_name}
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', color: '#78716c', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Briefcase size={13} color="#d97706" /> {result.position_name}
                </span>
                <span style={{ fontSize: '12px', color: '#a8a29e' }}>•</span>
                <span style={{ fontSize: '12px', color: '#78716c', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Building2 size={13} color="#d97706" /> {result.department_name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Appraisal Certificate Card */}
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e5d8c8',
          borderRadius: '20px',
          padding: '20px',
          boxShadow: '0 10px 30px -8px rgba(120, 80, 40, 0.07)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Section Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              color: '#92400e',
              padding: '4px 16px',
              borderRadius: '20px',
              fontSize: '11.5px',
              fontWeight: '800',
              letterSpacing: '0.03em',
              textTransform: 'uppercase'
            }}>
              <ShieldCheck size={14} /> XẾP LOẠI NĂNG LỰC
            </span>
          </div>

          {/* Level Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            background: theme.bgGradient,
            border: `1.5px solid ${theme.border}`,
            borderRadius: '16px',
            padding: '16px 18px'
          }}>
            {/* Chữ cái Level */}
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: theme.badgeBg,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              fontWeight: '900',
              flexShrink: 0,
              boxShadow: `0 4px 14px rgba(0, 0, 0, 0.12)`
            }}>
              {theme.letter}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#1c1917', margin: 0 }}>
                  {result.rank_title || `${result.rank_level} - ${theme.tagText}`}
                </h3>
              </div>
              <p style={{ fontSize: '12.5px', color: '#57534e', margin: 0, lineHeight: '1.45' }}>
                {result.ai_summary || 'Đánh giá năng lực dựa trên điểm số thực tế và bộ tiêu chuẩn chuyên môn.'}
              </p>
            </div>
          </div>

          {/* 2 Metrics Cards (Grid tự co giãn, không bị bể) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1.5px solid #fde68a',
              borderRadius: '12px',
              padding: '12px 14px'
            }}>
              <div style={{ fontSize: '11px', color: '#92400e', fontWeight: '700', marginBottom: '2px' }}>
                📊 Kết quả điểm số:
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#92400e' }}>
                {result.percentage}% <span style={{ fontSize: '12.5px', color: '#b45309', fontWeight: '700' }}>({result.total_score}/{result.max_score} đ)</span>
              </div>
            </div>

            <div style={{
              background: '#faf8f5',
              border: '1.5px solid #e7dfd5',
              borderRadius: '12px',
              padding: '12px 14px'
            }}>
              <div style={{ fontSize: '11px', color: '#78716c', fontWeight: '700', marginBottom: '2px' }}>
                🎯 Phân vị 9-Box Grid:
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#1c1917', lineHeight: '1.3' }}>
                {result.nine_box_category || 'Core Contributor'}
              </div>
            </div>
          </div>

          {/* Vị trí đảm nhiệm tương ứng (Không bị bể dòng) */}
          <div style={{
            background: '#faf8f5',
            border: '1.5px solid #e7dfd5',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ fontSize: '11.5px', color: '#78716c', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Target size={14} color="#d97706" /> MỨC ĐỘ ĐÁP ỨNG VỊ TRÍ:
            </div>
            <div style={{
              background: '#fef3c7',
              border: '1px solid #fde68a',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: '800',
              color: '#92400e',
              lineHeight: '1.4'
            }}>
              {result.position_fit_status || 'Xem xét đào tạo lại theo chuẩn vị trí'}
            </div>
          </div>

          {/* Section: TIÊU CHÍ ĐÁNH GIÁ CẤP ĐỘ */}
          {result.criteria_evaluation && result.criteria_evaluation.length > 0 && (
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#78350f', letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: '6px' }}>
                TIÊU CHÍ ĐÁNH GIÁ CẤP ĐỘ:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {result.criteria_evaluation.map((criterion, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      background: '#faf8f5',
                      border: '1px solid #e7dfd5',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12.5px',
                      color: '#292524',
                      lineHeight: '1.4'
                    }}
                  >
                    <CheckCircle2 size={15} color="#d97706" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>{criterion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: AI ĐỊNH HƯỚNG & ĐỀ XUẤT HÀNH ĐỘNG */}
          {result.ai_recommendations && result.ai_recommendations.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: '800', color: '#78350f', letterSpacing: '0.02em', marginBottom: '6px' }}>
                <Zap size={14} color="#d97706" /> ĐỊNH HƯỚNG & ĐỀ XUẤT HÀNH ĐỘNG (AI EVALUATION):
              </div>
              <div style={{
                background: '#fdfbf7',
                border: '1.5px solid #ebdccb',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '12.5px',
                color: '#44403c',
                lineHeight: '1.55'
              }}>
                {result.ai_recommendations.map((rec, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: idx < result.ai_recommendations.length - 1 ? '5px' : '0' }}>
                    <span style={{ color: '#d97706', fontWeight: '800' }}>•</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collapsible: XEM LẠI CHI TIẾT TỪNG CÂU HỎI */}
          {answers.length > 0 && (
            <div style={{ borderTop: '1px solid #e7dfd5', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => setShowDetailAnswers(!showDetailAnswers)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: '#faf8f5',
                  border: '1.5px solid #e7dfd5',
                  color: '#1c1917',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BookOpen size={15} color="#d97706" />
                  Xem lại chi tiết từng câu ({answers.length} câu)
                </span>
                {showDetailAnswers ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showDetailAnswers && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Filter Bar */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('all')}
                      style={{
                        padding: '4px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer',
                        background: activeFilter === 'all' ? '#1c1917' : '#f5f5f4', color: activeFilter === 'all' ? '#fff' : '#444',
                        border: '1px solid #d6d3d1'
                      }}
                    >
                      Tất cả ({answers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('correct')}
                      style={{
                        padding: '4px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer',
                        background: activeFilter === 'correct' ? '#d97706' : '#fffbeb', color: activeFilter === 'correct' ? '#fff' : '#92400e',
                        border: '1px solid #fde68a'
                      }}
                    >
                      ⭐ Đúng ({correctCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('incorrect')}
                      style={{
                        padding: '4px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer',
                        background: activeFilter === 'incorrect' ? '#dc2626' : '#fef2f2', color: activeFilter === 'incorrect' ? '#fff' : '#dc2626',
                        border: '1px solid #fecaca'
                      }}
                    >
                      ❌ Chưa đúng ({incorrectCount})
                    </button>
                  </div>

                  {/* Answers list */}
                  {filteredAnswers.map((ans, idx) => {
                    const isCorrect = ans.is_correct;
                    const isEssay = ans.question_type === 'essay';
                    const candSelected = ans.selected_answers || [];
                    const correctAnswers = ans.correct_answers || [];

                    return (
                      <div
                        key={ans.answer_id || idx}
                        style={{
                          background: '#ffffff',
                          border: isEssay ? '1.5px solid #d6d3d1' : (isCorrect ? '1.5px solid #d97706' : '1.5px solid #f87171'),
                          borderRadius: '10px',
                          padding: '12px 14px',
                          boxShadow: '0 2px 6px rgba(120, 80, 40, 0.04)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '800', fontSize: '12.5px', color: '#b45309' }}>
                            Câu {idx + 1} {ans.category_tag && `• [${ans.category_tag}]`}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: isCorrect ? '#92400e' : '#dc2626' }}>
                            {ans.points_earned}/{ans.points_max} đ
                          </span>
                        </div>

                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#1c1917', marginBottom: '8px', lineHeight: '1.4' }}>
                          {ans.question_text}
                        </div>

                        {!isEssay ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', marginBottom: '6px' }}>
                            {ans.options?.map((opt) => {
                              const isCand = candSelected.includes(opt.id);
                              const isTrue = correctAnswers.includes(opt.id);
                              let bg = '#faf8f5';
                              let border = '#e7dfd5';
                              let text = '#44403c';

                              if (isCand && isTrue) { bg = '#fef3c7'; border = '#d97706'; text = '#92400e'; }
                              else if (isCand && !isTrue) { bg = '#fef2f2'; border = '#ef4444'; text = '#dc2626'; }
                              else if (!isCand && isTrue) { bg = '#fffbeb'; border = '#fde68a'; text = '#92400e'; }

                              return (
                                <div
                                  key={opt.id}
                                  style={{
                                    padding: '7px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    background: bg,
                                    border: `1.5px solid ${border}`,
                                    color: text,
                                    fontWeight: (isCand || isTrue) ? '700' : 'normal',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}
                                >
                                  <span><b style={{ color: '#b45309' }}>{opt.id}.</b> {opt.text}</span>
                                  {isCand && <span style={{ fontSize: '10.5px', fontWeight: '800' }}>{isTrue ? '⭐ Đúng' : '❌ Đã chọn'}</span>}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', background: '#faf8f5', border: '1px solid #e7dfd5', padding: '8px 12px', borderRadius: '6px', marginBottom: '6px', color: '#1c1917' }}>
                            <b style={{ color: '#92400e' }}>Câu trả lời: </b> {candSelected[0] || 'Chưa trả lời'}
                          </div>
                        )}

                        {ans.explanation && (
                          <div style={{ fontSize: '11.5px', color: '#57534e', background: '#fdfbf7', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ebdccb', lineHeight: '1.45' }}>
                            💡 <b>Barem:</b> {ans.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nút hành động phía dưới */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '4px' }}>
          <button
            onClick={handlePrint}
            style={{
              flex: 1,
              maxWidth: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '11px 16px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1.5px solid #e7dfd5',
              color: '#44403c',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(120, 80, 40, 0.04)',
              transition: 'all 0.2s ease'
            }}
          >
            <Printer size={15} /> In phiếu kết quả
          </button>

          {onRestart && (
            <button
              onClick={onRestart}
              style={{
                flex: 1,
                maxWidth: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '11px 16px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                border: '1px solid rgba(254, 240, 138, 0.4)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 3px 12px rgba(217, 119, 6, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              Làm bài khác
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateResultView;
