import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckSquare, Square, Save, FileText, CheckCircle2 } from 'lucide-react';
import api from '@webShared/Services/api.service';
import './assessment.css';

const DEFAULT_POSITIONS = [
  'QA', 'QC', 'KCS', 'Tổ trưởng', 'Quản đốc', 
  'Chuyền Mộc 1', 'Tổ Sơn PU', 'Tổ Đóng gói', 'NV Vận hành máy CNC'
];

const AssessmentEditorModal = ({ assessmentId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
  // Danh sách Bộ phận & Vị trí lấy từ Database
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Quản lý chất lượng',
    description: '',
    target_positions: ['QA', 'QC', 'Tổ trưởng'],
    duration_minutes: 45,
    pass_percentage: 60,
    shuffle_questions: true,
    shuffle_options: true,
    instructions: 'Vui lòng đọc kỹ câu hỏi và làm bài nghiêm túc. Hệ thống sẽ tự động nộp khi hết thời gian.',
    questions: [
      {
        question_type: 'single_choice',
        question_text: '',
        category_tag: 'Chuyên môn',
        points: 1.0,
        explanation: '',
        options: [
          { id: 'A', text: '' },
          { id: 'B', text: '' },
          { id: 'C', text: '' },
          { id: 'D', text: '' }
        ],
        correct_answers: ['A']
      }
    ]
  });

  const [customPosInput, setCustomPosInput] = useState('');

  // 1. Tải danh mục Bộ phận (từ bảng departments) và Vị trí từ Database
  useEffect(() => {
    // Lấy danh sách Bộ phận từ bảng departments (Danh mục Bộ phận)
    api.get('/departments/')
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (list.length > 0) {
          setDepartments(list);
          if (!assessmentId) {
            setFormData(prev => ({
              ...prev,
              category: prev.category && prev.category !== 'Quản lý chất lượng' ? prev.category : (list[0].name || list[0].code)
            }));
          }
        }
      })
      .catch(err => console.error('Lỗi tải danh mục bộ phận:', err));

    // Lấy danh sách vị trí công việc từ DB (/permissions/ hoặc /hr/positions)
    api.get('/permissions/?include_inactive=true')
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (list.length > 0) {
          setPositions(list);
        } else {
          api.get('/hr/positions').then(pRes => {
            if (Array.isArray(pRes)) setPositions(pRes);
          });
        }
      })
      .catch(() => {
        api.get('/hr/positions').then(pRes => {
          if (Array.isArray(pRes)) setPositions(pRes);
        });
      });
  }, []);

  // 2. Tải chi tiết bài kiểm tra nếu đang ở chế độ Chỉnh sửa (Edit)
  useEffect(() => {
    if (assessmentId) {
      setFetching(true);
      api.get(`/hr/assessments/${assessmentId}`)
        .then(res => {
          if (res) {
            setFormData({
              title: res.title || '',
              category: res.category || 'Quản lý chất lượng',
              description: res.description || '',
              target_positions: res.target_positions || [],
              duration_minutes: res.duration_minutes || 45,
              pass_percentage: res.pass_percentage || 60,
              shuffle_questions: res.shuffle_questions ?? true,
              shuffle_options: res.shuffle_options ?? true,
              instructions: res.instructions || '',
              questions: res.questions && res.questions.length > 0 ? res.questions.map(q => ({
                ...q,
                question_type: q.question_type || 'single_choice',
                options: q.options && q.options.length > 0 ? q.options : [
                  { id: 'A', text: '' },
                  { id: 'B', text: '' },
                  { id: 'C', text: '' },
                  { id: 'D', text: '' }
                ],
                correct_answers: q.correct_answers || ['A']
              })) : [
                {
                  question_type: 'single_choice',
                  question_text: '',
                  category_tag: 'Chuyên môn',
                  points: 1.0,
                  explanation: '',
                  options: [
                    { id: 'A', text: '' },
                    { id: 'B', text: '' },
                    { id: 'C', text: '' },
                    { id: 'D', text: '' }
                  ],
                  correct_answers: ['A']
                }
              ]
            });
          }
        })
        .catch(err => console.error(err))
        .finally(() => setFetching(false));
    }
  }, [assessmentId]);

  // Lấy danh sách tên các vị trí từ DB (hoặc danh sách mặc định nếu DB chưa có)
  const availablePositions = positions.length > 0 
    ? Array.from(new Set(positions.map(p => p.name).filter(Boolean)))
    : DEFAULT_POSITIONS;

  const toggleTargetPosition = (pos) => {
    setFormData(prev => {
      const exists = prev.target_positions.includes(pos);
      return {
        ...prev,
        target_positions: exists 
          ? prev.target_positions.filter(p => p !== pos)
          : [...prev.target_positions, pos]
      };
    });
  };

  const handleAddCustomPosition = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      e.preventDefault();
      if (customPosInput.trim() && !formData.target_positions.includes(customPosInput.trim())) {
        setFormData(prev => ({
          ...prev,
          target_positions: [...prev.target_positions, customPosInput.trim()]
        }));
        setCustomPosInput('');
      }
    }
  };

  const handleAddQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          question_type: 'single_choice',
          question_text: '',
          category_tag: prev.category,
          points: 1.0,
          explanation: '',
          options: [
            { id: 'A', text: '' },
            { id: 'B', text: '' },
            { id: 'C', text: '' },
            { id: 'D', text: '' }
          ],
          correct_answers: ['A']
        }
      ]
    }));
  };

  const handleRemoveQuestion = (index) => {
    if (formData.questions.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, idx) => idx !== index)
    }));
  };

  const handleQuestionChange = (qIndex, field, value) => {
    setFormData(prev => {
      const newQuestions = [...prev.questions];
      newQuestions[qIndex] = { ...newQuestions[qIndex], [field]: value };
      return { ...prev, questions: newQuestions };
    });
  };

  const handleOptionChange = (qIndex, optId, text) => {
    setFormData(prev => {
      const newQuestions = [...prev.questions];
      const newOptions = newQuestions[qIndex].options.map(opt => 
        opt.id === optId ? { ...opt, text } : opt
      );
      newQuestions[qIndex] = { ...newQuestions[qIndex], options: newOptions };
      return { ...prev, questions: newQuestions };
    });
  };

  const toggleCorrectAnswer = (qIndex, optId, isMultiChoice = false) => {
    setFormData(prev => {
      const newQuestions = [...prev.questions];
      const currentCorrects = newQuestions[qIndex].correct_answers || [];
      
      if (isMultiChoice) {
        const isSelected = currentCorrects.includes(optId);
        newQuestions[qIndex] = {
          ...newQuestions[qIndex],
          correct_answers: isSelected 
            ? currentCorrects.filter(id => id !== optId)
            : [...currentCorrects, optId]
        };
      } else {
        newQuestions[qIndex] = {
          ...newQuestions[qIndex],
          correct_answers: [optId]
        };
      }
      return { ...prev, questions: newQuestions };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Vui lòng nhập tiêu đề bài kiểm tra.');
      return;
    }
    setLoading(true);
    try {
      if (assessmentId) {
        await api.put(`/hr/assessments/${assessmentId}`, formData);
      } else {
        await api.post('/hr/assessments', formData);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi khi lưu bài kiểm tra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="assessment-modal-overlay" onClick={onClose}>
      <div 
        className="assessment-modal-box" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '860px',
          maxHeight: '92vh',
          background: '#ffffff',
          border: '1px solid #e7dfd5',
          color: '#1c1917',
          padding: '28px 32px'
        }}
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e7dfd5', paddingBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1c1917', margin: '0 0 4px 0' }}>
              {assessmentId ? 'Chỉnh Sửa Bài Kiểm Tra' : 'Tạo Mới Bài Kiểm Tra'}
            </h2>
            <p style={{ fontSize: '13px', color: '#78716c', margin: 0 }}>
              Cấu hình thông số bài thi, bộ phận áp dụng và ngân hàng câu hỏi
            </p>
          </div>
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

        {fetching ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#78716c' }}>Đang tải dữ liệu bài kiểm tra...</div>
        ) : (
          <form onSubmit={handleSave}>
            {/* 1. THÔNG TIN CHUNG */}
            <div style={{
              background: '#fdfbf7',
              border: '1px solid #e7dfd5',
              borderRadius: '14px',
              padding: '18px 20px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#44403c', marginBottom: '6px' }}>
                    TIÊU ĐỀ BÀI KIỂM TRA *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ví dụ: Đánh giá chuyên môn QA (Quality Assurance)"
                    style={{
                      width: '100%', padding: '9px 12px', background: '#ffffff',
                      border: '1px solid #d6d3d1', borderRadius: '8px',
                      color: '#1c1917', fontSize: '13.5px', boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* DANH MỤC / BỘ PHẬN TỪ DATABASE */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#44403c', marginBottom: '6px' }}>
                    BỘ PHẬN (DANH MỤC BỘ PHẬN) *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      width: '100%', padding: '9px 12px', background: '#ffffff',
                      border: '1px solid #d6d3d1', borderRadius: '8px',
                      color: '#1c1917', fontSize: '13px', boxSizing: 'border-box', cursor: 'pointer'
                    }}
                  >
                    {departments.length > 0 ? (
                      departments.map(d => {
                        const name = d.name || d.description || d.code;
                        const code = d.code ? `[${d.code}]` : '';
                        const role = d.role_name ? `• ${d.role_name}` : '';
                        return (
                          <option key={d.id} value={name}>
                            {name} {code} {role}
                          </option>
                        );
                      })
                    ) : (
                      <>
                        <option value="QC Kiểm Tra Nhập Kho">QC Kiểm Tra Nhập Kho [IQC] • QLCL</option>
                        <option value="Nhân Viên Kiểm Soát Quy Trình">Nhân Viên Kiểm Soát Quy Trình [QA] • QLCL</option>
                        <option value="QC Định Hình - Lắp Ráp">QC Định Hình - Lắp Ráp [PQC1] • QLCL</option>
                        <option value="QC Sơn - Đóng Gói">QC Sơn - Đóng Gói [PQC2] • QLCL</option>
                        <option value="QC Final">QC Final [FQC] • QLCL</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#44403c', marginBottom: '6px' }}>
                  MÔ TẢ NGẮN
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả mục tiêu, nội dung kiến thức của bài kiểm tra..."
                  style={{
                    width: '100%', padding: '8px 12px', background: '#ffffff',
                    border: '1px solid #d6d3d1', borderRadius: '8px',
                    color: '#1c1917', fontSize: '13px', boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Nhóm vị trí áp dụng (Target Positions từ DB) */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#44403c', marginBottom: '8px' }}>
                  NHÓM VỊ TRÍ CÔNG VIỆC ÁP DỤNG (CHỌN TỪ DATABASE HOẶC THÊM MỚI)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  {availablePositions.map(pos => {
                    const isSelected = formData.target_positions.includes(pos);
                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => toggleTargetPosition(pos)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: '700',
                          border: isSelected ? '1px solid #d97706' : '1px solid #e7dfd5',
                          background: isSelected ? '#fef3c7' : '#ffffff',
                          color: isSelected ? '#92400e' : '#57534e',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          boxShadow: isSelected ? '0 1px 4px rgba(217, 119, 6, 0.2)' : 'none'
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '}{pos}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={customPosInput}
                    onChange={(e) => setCustomPosInput(e.target.value)}
                    onKeyDown={handleAddCustomPosition}
                    placeholder="Thêm vị trí khác (nhập và bấm Thêm)..."
                    style={{
                      flex: 1, padding: '7px 12px', background: '#ffffff',
                      border: '1px solid #d6d3d1', borderRadius: '8px',
                      color: '#1c1917', fontSize: '12.5px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomPosition}
                    style={{
                      padding: '7px 14px', background: '#f5f5f4', color: '#44403c',
                      border: '1px solid #d6d3d1', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    Thêm vị trí
                  </button>
                </div>
              </div>

              {/* Thời gian & Tùy chọn xáo trộn */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#44403c', marginBottom: '6px' }}>
                    THỜI LƯỢNG (PHÚT)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 45 })}
                    style={{
                      width: '100%', padding: '8px 12px', background: '#ffffff',
                      border: '1px solid #d6d3d1', borderRadius: '8px',
                      color: '#1c1917', fontSize: '13px', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#44403c', marginBottom: '6px' }}>
                    ĐIỂM ĐẠT CHUẨN (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.pass_percentage}
                    onChange={(e) => setFormData({ ...formData, pass_percentage: parseFloat(e.target.value) || 60 })}
                    style={{
                      width: '100%', padding: '8px 12px', background: '#ffffff',
                      border: '1px solid #d6d3d1', borderRadius: '8px',
                      color: '#1c1917', fontSize: '13px', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '16px' }}>
                  <input
                    type="checkbox"
                    id="shuffle_q"
                    checked={formData.shuffle_questions}
                    onChange={(e) => setFormData({ ...formData, shuffle_questions: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#d97706', cursor: 'pointer' }}
                  />
                  <label htmlFor="shuffle_q" style={{ fontSize: '12.5px', color: '#44403c', cursor: 'pointer', fontWeight: '600' }}>
                    Xáo trộn câu hỏi
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '16px' }}>
                  <input
                    type="checkbox"
                    id="shuffle_opt"
                    checked={formData.shuffle_options}
                    onChange={(e) => setFormData({ ...formData, shuffle_options: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#d97706', cursor: 'pointer' }}
                  />
                  <label htmlFor="shuffle_opt" style={{ fontSize: '12.5px', color: '#44403c', cursor: 'pointer', fontWeight: '600' }}>
                    Xáo trộn đáp án
                  </label>
                </div>
              </div>
            </div>

            {/* 2. DANH SÁCH CÂU HỎI (ĐÃ BỎ TIÊU ĐỀ RƯỜM RÀ) */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '12px' }}>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '7px 16px', borderRadius: '8px',
                    background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#fff', border: 'none',
                    fontSize: '12.5px', fontWeight: '700', cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(217, 119, 6, 0.3)'
                  }}
                >
                  <Plus size={14} /> Thêm câu hỏi
                </button>
              </div>

              {formData.questions.map((q, qIdx) => {
                const isEssay = q.question_type === 'essay';
                const isMulti = q.question_type === 'multi_choice';

                return (
                  <div 
                    key={qIdx}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e7dfd5',
                      borderRadius: '12px',
                      padding: '16px 18px',
                      marginBottom: '14px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
                    }}
                  >
                    {/* Hàng điều khiển: Câu số + Loại câu hỏi (Trắc nghiệm / Tự luận) + Điểm */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: '800', fontSize: '13.5px', color: '#1c1917' }}>
                          Câu hỏi {qIdx + 1}
                        </span>

                        {/* Chọn Loại Câu Hỏi: Trắc nghiệm 1 đáp án / Trắc nghiệm nhiều đáp án / Tự luận */}
                        <div style={{ display: 'flex', background: '#f5f5f4', padding: '2px', borderRadius: '8px', border: '1px solid #e7e5e4' }}>
                          <button
                            type="button"
                            onClick={() => handleQuestionChange(qIdx, 'question_type', 'single_choice')}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              background: q.question_type === 'single_choice' || !q.question_type ? '#ffffff' : 'transparent',
                              color: q.question_type === 'single_choice' || !q.question_type ? '#b45309' : '#78716c',
                              boxShadow: q.question_type === 'single_choice' || !q.question_type ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                            }}
                          >
                            Trắc nghiệm 1 đáp án
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuestionChange(qIdx, 'question_type', 'multi_choice')}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              background: q.question_type === 'multi_choice' ? '#ffffff' : 'transparent',
                              color: q.question_type === 'multi_choice' ? '#b45309' : '#78716c',
                              boxShadow: q.question_type === 'multi_choice' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                            }}
                          >
                            Nhiều đáp án
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuestionChange(qIdx, 'question_type', 'essay')}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              background: q.question_type === 'essay' ? '#ffffff' : 'transparent',
                              color: q.question_type === 'essay' ? '#b45309' : '#78716c',
                              boxShadow: q.question_type === 'essay' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                            }}
                          >
                            ✍️ Tự luận
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#78716c' }}>Điểm:</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="10"
                            value={q.points}
                            onChange={(e) => handleQuestionChange(qIdx, 'points', parseFloat(e.target.value) || 1)}
                            style={{
                              width: '46px', padding: '3px 6px', background: '#ffffff',
                              border: '1px solid #d6d3d1', borderRadius: '6px',
                              color: '#1c1917', fontSize: '12px', textAlign: 'center'
                            }}
                          />
                        </div>
                        {formData.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(qIdx)}
                            style={{
                              background: '#fef2f2', border: '1px solid #fee2e2',
                              color: '#dc2626', borderRadius: '6px', padding: '5px', cursor: 'pointer'
                            }}
                            title="Xóa câu hỏi này"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Nội dung câu hỏi */}
                    <div style={{ marginBottom: '10px' }}>
                      <textarea
                        rows={2}
                        required
                        value={q.question_text}
                        onChange={(e) => handleQuestionChange(qIdx, 'question_text', e.target.value)}
                        placeholder="Nhập nội dung câu hỏi..."
                        style={{
                          width: '100%', padding: '8px 12px', background: '#faf9f6',
                          border: '1px solid #e7dfd5', borderRadius: '8px',
                          color: '#1c1917', fontSize: '13px', boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* PHẦN LỰA CHỌN ĐÁP ÁN HOẶC HƯỚNG DẪN TỰ LUẬN */}
                    {isEssay ? (
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#78350f', marginBottom: '4px' }}>
                          Tiêu chí chấm điểm & Đáp án gợi ý (Dành cho AI & Giám khảo)
                        </label>
                        <textarea
                          rows={2}
                          value={q.explanation || ''}
                          onChange={(e) => handleQuestionChange(qIdx, 'explanation', e.target.value)}
                          placeholder="Nhập hướng dẫn chấm, các ý chính cần đạt để AI đối chiếu và đánh giá tự luận..."
                          style={{
                            width: '100%', padding: '8px 12px', background: '#fdfbf7',
                            border: '1px solid #ebdccb', borderRadius: '8px',
                            color: '#44403c', fontSize: '12.5px', boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                          {q.options.map((opt) => {
                            const isCorrect = (q.correct_answers || []).includes(opt.id);
                            return (
                              <div 
                                key={opt.id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '6px',
                                  background: isCorrect ? '#ecfdf5' : '#faf9f6',
                                  border: isCorrect ? '1px solid #10b981' : '1px solid #e7dfd5',
                                  borderRadius: '8px', padding: '5px 8px'
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleCorrectAnswer(qIdx, opt.id, isMulti)}
                                  style={{
                                    background: 'transparent', border: 'none',
                                    color: isCorrect ? '#059669' : '#a8a29e',
                                    cursor: 'pointer', display: 'flex', padding: 0
                                  }}
                                  title={isCorrect ? 'Đáp án đúng' : 'Bấm để chọn đáp án đúng'}
                                >
                                  {isCorrect ? <CheckSquare size={16} /> : <Square size={16} />}
                                </button>
                                <span style={{ fontWeight: '800', fontSize: '12.5px', color: isCorrect ? '#059669' : '#b45309' }}>
                                  {opt.id}.
                                </span>
                                <input
                                  type="text"
                                  required={!isEssay}
                                  value={opt.text}
                                  onChange={(e) => handleOptionChange(qIdx, opt.id, e.target.value)}
                                  placeholder={`Lựa chọn ${opt.id}...`}
                                  style={{
                                    flex: 1, background: 'transparent', border: 'none',
                                    color: '#1c1917', fontSize: '12.5px', outline: 'none'
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>

                        {/* Giải thích đáp án trắc nghiệm */}
                        <div>
                          <input
                            type="text"
                            value={q.explanation || ''}
                            onChange={(e) => handleQuestionChange(qIdx, 'explanation', e.target.value)}
                            placeholder="Giải thích đáp án & trích dẫn tiêu chuẩn (nếu có)..."
                            style={{
                              width: '100%', padding: '6px 10px', background: '#faf9f6',
                              border: '1px solid #e7dfd5', borderRadius: '6px',
                              color: '#78716c', fontSize: '12px', boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer nút bấm */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e7dfd5', paddingTop: '14px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 18px', borderRadius: '8px',
                  background: '#f5f5f4', border: '1px solid #d6d3d1',
                  color: '#44403c', fontWeight: '600', fontSize: '13px', cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 24px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                  border: '1px solid rgba(254, 240, 138, 0.4)', color: '#ffffff', fontWeight: '700',
                  fontSize: '13.5px', cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(217, 119, 6, 0.3)'
                }}
              >
                <Save size={15} /> {loading ? 'Đang lưu...' : 'Lưu Đề Thi'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AssessmentEditorModal;
