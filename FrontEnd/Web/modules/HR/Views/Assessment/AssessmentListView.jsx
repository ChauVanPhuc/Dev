import React, { useState, useEffect } from 'react';
import { 
  Plus, Upload, QrCode, HelpCircle, Edit3, Pause, Play, Trash2, 
  Clock, CheckSquare, Users, Folder, Target, Award, RefreshCw, Eye,
  History, Download, Search, Filter, Sparkles, BookOpen
} from 'lucide-react';
import api from '@webShared/Services/api.service';
import AssessmentQRModal from './AssessmentQRModal';
import AssessmentImportModal from './AssessmentImportModal';
import AssessmentEditorModal from './AssessmentEditorModal';
import AssessmentQuestionsModal from './AssessmentQuestionsModal';
import AssessmentSubmissionsModal from './AssessmentSubmissionsModal';
import AssessmentSubmissionDetailModal from './AssessmentSubmissionDetailModal';
import './assessment.css';

const AssessmentListView = () => {
  const [activeTab, setActiveTab] = useState('assessments'); // 'assessments' | 'submissions'
  const [assessments, setAssessments] = useState([]);
  const [loadingAssessments, setLoadingAssessments] = useState(true);

  // Submissions Tab State
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyRankFilter, setHistoryRankFilter] = useState('all');

  // Modals state
  const [selectedQR, setSelectedQR] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editAssessmentId, setEditAssessmentId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuestionsModal, setSelectedQuestionsModal] = useState(null);
  const [selectedSubmissionsModal, setSelectedSubmissionsModal] = useState(null);
  const [viewSubmissionDetailId, setViewSubmissionDetailId] = useState(null);

  const fetchAssessments = async () => {
    setLoadingAssessments(true);
    try {
      const data = await api.get('/hr/assessments');
      setAssessments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load assessments:', err);
    } finally {
      setLoadingAssessments(false);
    }
  };

  const fetchAllSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const data = await api.get('/hr/assessments/submissions/all', {
        params: {
          search: historySearch || undefined,
          rank_level: historyRankFilter !== 'all' ? historyRankFilter : undefined
        }
      });
      setAllSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  useEffect(() => {
    if (activeTab === 'submissions') {
      fetchAllSubmissions();
    }
  }, [activeTab, historyRankFilter]);

  const handleToggleStatus = async (id) => {
    try {
      await api.post(`/hr/assessments/${id}/toggle-status`);
      fetchAssessments();
    } catch (err) {
      alert('Lỗi khi đổi trạng thái bài kiểm tra.');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bài kiểm tra "${title}"? Toàn bộ câu hỏi và kết quả làm bài liên quan sẽ bị xóa vĩnh viễn.`)) return;
    try {
      await api.delete(`/hr/assessments/${id}`);
      fetchAssessments();
    } catch (err) {
      alert('Lỗi khi xóa bài kiểm tra.');
    }
  };

  const handleOpenQuestions = async (id) => {
    try {
      const detail = await api.get(`/hr/assessments/${id}`);
      setSelectedQuestionsModal(detail);
    } catch (err) {
      alert('Lỗi khi tải chi tiết câu hỏi.');
    }
  };

  const handleExportAllSubmissions = () => {
    window.open(`${api.defaults.baseURL || ''}/hr/assessments/submissions/export`, '_blank');
  };

  const getRankBadgeColor = (level) => {
    switch (level) {
      case 'Level A': return { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669' };
      case 'Level B': return { bg: '#fef3c7', border: '#fde68a', text: '#92400e' };
      case 'Level C': return { bg: '#fff7ed', border: '#ffedd5', text: '#c2410c' };
      case 'Level D': return { bg: '#fef2f2', border: '#fee2e2', text: '#dc2626' };
      default: return { bg: '#fdfbf7', border: '#ebdccb', text: '#78350f' };
    }
  };

  // KPI Calculations
  const totalSubmissionsCount = allSubmissions.length;
  const avgSubmissionsScore = totalSubmissionsCount > 0 
    ? Math.round(allSubmissions.reduce((acc, cur) => acc + (cur.percentage || 0), 0) / totalSubmissionsCount) 
    : 0;
  const passedCount = allSubmissions.filter(s => (s.percentage || 0) >= 60).length;
  const passRate = totalSubmissionsCount > 0 ? Math.round((passedCount / totalSubmissionsCount) * 100) : 0;

  return (
    <div className="assessment-admin-container">
      {/* Top Toolbar: Tabs & Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '1px solid #e7dfd5',
        paddingBottom: '14px',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Navigation Tabs Bar */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('assessments')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '9px',
              border: activeTab === 'assessments' ? '1.5px solid #d97706' : '1px solid #e7dfd5',
              background: activeTab === 'assessments' ? '#fef3c7' : '#ffffff',
              color: activeTab === 'assessments' ? '#92400e' : '#57534e',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <BookOpen size={15} /> Danh sách Bài kiểm tra ({assessments.length})
          </button>

          <button
            onClick={() => setActiveTab('submissions')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '9px',
              border: activeTab === 'submissions' ? '1.5px solid #d97706' : '1px solid #e7dfd5',
              background: activeTab === 'submissions' ? '#fef3c7' : '#ffffff',
              color: activeTab === 'submissions' ? '#92400e' : '#57534e',
              fontWeight: '800',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <History size={15} /> Lịch sử & Kết quả làm bài
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="btn-assessment-secondary"
            onClick={() => setShowImportModal(true)}
            title="Import đề thi từ file Excel (.xlsx) hoặc Markdown (.md)"
          >
            <Upload size={14} /> Import đề thi (Excel / MD)
          </button>
          <button 
            className="btn-assessment-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={15} /> Tạo bài kiểm tra
          </button>
        </div>
      </div>

      {/* TAB 1: DANH SÁCH BÀI KIỂM TRA */}
      {activeTab === 'assessments' && (
        <div>
          {loadingAssessments ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#78716c' }}>
              <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px auto', display: 'block', color: '#d97706' }} />
              Đang tải danh sách bài kiểm tra...
            </div>
          ) : assessments.length === 0 ? (
            <div style={{
              padding: '50px 20px',
              textAlign: 'center',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px dashed #d6d3d1'
            }}>
              <HelpCircle size={40} color="#d97706" style={{ margin: '0 auto 12px auto', display: 'block' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1c1917', margin: '0 0 6px 0' }}>
                Chưa có bài kiểm tra nào
              </h3>
              <p style={{ fontSize: '13px', color: '#78716c', margin: '0 0 16px 0' }}>
                Hãy bấm "Tạo bài kiểm tra" hoặc "Import đề thi (Excel / MD)" để bắt đầu xây dựng ngân hàng câu hỏi.
              </p>
              <button 
                className="btn-assessment-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={14} /> Tạo bài kiểm tra đầu tiên
              </button>
            </div>
          ) : (
            <div className="assessment-list">
              {assessments.map((item) => {
                const isActive = item.status === 'active';
                return (
                  <div key={item.id} className="assessment-card">
                    {/* Thanh màu bên trái */}
                    <div className={`assessment-card-left-bar ${isActive ? 'active' : 'paused'}`} />

                    {/* Thông tin chính */}
                    <div className="assessment-card-main">
                      <div className="assessment-card-title-row">
                        <h3 className="assessment-card-title">{item.title}</h3>
                        <span className={`status-badge ${isActive ? 'active' : 'paused'}`}>
                          {isActive ? 'Hoạt động' : 'Tạm dừng'}
                        </span>
                      </div>

                      <p className="assessment-card-desc">
                        {item.description || 'Chưa có mô tả chi tiết cho bài kiểm tra này.'}
                      </p>

                      <div className="assessment-card-meta-row">
                        <span className="meta-item">
                          <Clock size={14} color="#d97706" /> {item.duration_minutes} phút
                        </span>
                        <span className="meta-item">
                          <HelpCircle size={14} color="#d97706" /> {item.total_questions} câu hỏi
                        </span>
                        <span 
                          className="meta-item" 
                          style={{ cursor: 'pointer', background: '#fef3c7', padding: '3px 8px', borderRadius: '6px', color: '#92400e' }}
                          onClick={() => setSelectedSubmissionsModal(item)}
                          title="Bấm để xem lịch sử nộp bài của đề này"
                        >
                          <Users size={14} color="#b45309" /> <b>{item.submission_count}</b> lượt làm
                        </span>
                        <span className="meta-item">
                          <Folder size={14} color="#d97706" /> {item.category}
                        </span>
                        {item.target_positions && item.target_positions.length > 0 && (
                          <span className="meta-item positions">
                            <Target size={14} color="#b45309" /> Vị trí: {item.target_positions.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Thao tác */}
                    <div className="assessment-card-actions">
                      <button 
                        className="assessment-action-btn history-btn"
                        onClick={() => setSelectedSubmissionsModal(item)}
                        title="Xem danh sách lịch sử nộp bài của đề thi này"
                        style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}
                      >
                        <History size={15} /> <span>Lịch sử ({item.submission_count})</span>
                      </button>

                      <button 
                        className="assessment-action-btn qr"
                        onClick={() => setSelectedQR(item)}
                        title="Xuất mã QR & Link làm bài nhanh"
                      >
                        <QrCode size={15} /> <span>QR & Link</span>
                      </button>

                      <button 
                        className="assessment-action-btn questions"
                        onClick={() => handleOpenQuestions(item.id)}
                        title="Xem danh sách câu hỏi"
                      >
                        <HelpCircle size={15} /> <span>Câu hỏi</span>
                      </button>

                      <button 
                        className="assessment-action-btn edit"
                        onClick={() => setEditAssessmentId(item.id)}
                        title="Chỉnh sửa đề thi"
                      >
                        <Edit3 size={15} /> <span>Sửa</span>
                      </button>

                      <button 
                        className="assessment-action-btn pause"
                        onClick={() => handleToggleStatus(item.id)}
                        title={isActive ? 'Tạm dừng bài kiểm tra' : 'Mở lại bài kiểm tra'}
                      >
                        {isActive ? <Pause size={15} /> : <Play size={15} />}
                        <span>{isActive ? 'Dừng' : 'Bật'}</span>
                      </button>

                      <button 
                        className="assessment-action-btn delete"
                        onClick={() => handleDelete(item.id, item.title)}
                        title="Xóa bài kiểm tra"
                      >
                        <Trash2 size={15} /> <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LỊCH SỬ & KẾT QUẢ TOÀN BỘ BÀI THI */}
      {activeTab === 'submissions' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e7dfd5', padding: '24px' }}>
          {/* Submissions Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1c1917', margin: '0 0 4px 0' }}>
                Lịch Sử Kiểm Tra & Đánh Giá Năng Lực
              </h2>
              <p style={{ fontSize: '12.5px', color: '#78716c', margin: 0 }}>
                Theo dõi tất cả bài làm của nhân sự, đối chiếu điểm số và xem lại chi tiết bài làm
              </p>
            </div>

            <button
              onClick={handleExportAllSubmissions}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#059669',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Download size={15} /> Xuất Báo Cáo Excel
            </button>
          </div>

          {/* KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#faf9f6', border: '1px solid #e7dfd5', borderRadius: '12px', padding: '12px 16px' }}>
              <div style={{ fontSize: '12px', color: '#78716c', fontWeight: '600' }}>Tổng lượt làm bài</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#1c1917' }}>{totalSubmissionsCount}</div>
            </div>
            <div style={{ background: '#faf9f6', border: '1px solid #e7dfd5', borderRadius: '12px', padding: '12px 16px' }}>
              <div style={{ fontSize: '12px', color: '#78716c', fontWeight: '600' }}>Điểm trung bình</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#d97706' }}>{avgSubmissionsScore}%</div>
            </div>
            <div style={{ background: '#faf9f6', border: '1px solid #e7dfd5', borderRadius: '12px', padding: '12px 16px' }}>
              <div style={{ fontSize: '12px', color: '#78716c', fontWeight: '600' }}>Tỷ lệ Đạt yêu cầu (&ge;60%)</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#059669' }}>{passRate}% <span style={{ fontSize: '12px', color: '#78716c', fontWeight: 'normal' }}>({passedCount} bài)</span></div>
            </div>
            <div style={{ background: '#faf9f6', border: '1px solid #e7dfd5', borderRadius: '12px', padding: '12px 16px' }}>
              <div style={{ fontSize: '12px', color: '#78716c', fontWeight: '600' }}>Xếp hạng Level A - C</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#92400e', marginTop: '4px' }}>
                {allSubmissions.filter(s => ['Level A', 'Level B', 'Level C'].includes(s.rank_level)).length} nhân sự
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <form onSubmit={(e) => { e.preventDefault(); fetchAllSubmissions(); }} style={{ flex: 1, display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={15} color="#78716c" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Tìm theo tên nhân sự, mã NV, vị trí, phòng ban..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: '8px',
                    border: '1px solid #d6d3d1',
                    background: '#faf9f6',
                    fontSize: '12.5px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#1c1917',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                Tìm kiếm
              </button>
            </form>

            <select
              value={historyRankFilter}
              onChange={(e) => setHistoryRankFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #d6d3d1',
                background: '#faf9f6',
                fontSize: '12.5px',
                fontWeight: '600',
                color: '#44403c',
                outline: 'none'
              }}
            >
              <option value="all">Tất cả mức Level</option>
              <option value="Level A">Level A (Xuất sắc)</option>
              <option value="Level B">Level B (Khá giỏi)</option>
              <option value="Level C">Level C (Đạt)</option>
              <option value="Level D">Level D (Cần cải thiện)</option>
              <option value="Level F">Level F (Kém / Chưa đạt)</option>
            </select>
          </div>

          {/* Submissions Table */}
          {loadingSubmissions ? (
            <div style={{ padding: '50px', textAlign: 'center', color: '#78716c' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px auto', display: 'block', color: '#d97706' }} />
              Đang tải danh sách kết quả...
            </div>
          ) : allSubmissions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#78716c' }}>
              Chưa có kết quả bài thi nào được ghi nhận.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e7dfd5', color: '#78350f', textAlign: 'left', background: '#faf9f6' }}>
                    <th style={{ padding: '10px 12px', borderRadius: '8px 0 0 8px' }}>Nhân sự</th>
                    <th style={{ padding: '10px 12px' }}>Đợt kiểm tra / Bài thi</th>
                    <th style={{ padding: '10px 12px' }}>Vị trí & Bộ phận</th>
                    <th style={{ padding: '10px 12px' }}>Điểm số</th>
                    <th style={{ padding: '10px 12px' }}>Xếp loại Level</th>
                    <th style={{ padding: '10px 12px' }}>Thời gian nộp</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', borderRadius: '0 8px 8px 0' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {allSubmissions.map((s) => {
                    const badge = getRankBadgeColor(s.rank_level);
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f0ece6' }}>
                        <td style={{ padding: '12px', fontWeight: '700', color: '#1c1917' }}>
                          {s.candidate_name}
                          {s.employee_code && <span style={{ fontSize: '11px', color: '#78716c', display: 'block', fontWeight: 'normal' }}>Mã: {s.employee_code}</span>}
                        </td>
                        <td style={{ padding: '12px', color: '#57534e', fontSize: '12px', fontWeight: '600' }}>
                          {s.assessment_title}
                        </td>
                        <td style={{ padding: '12px', color: '#44403c' }}>
                          <div style={{ fontWeight: '600' }}>{s.position_name}</div>
                          <div style={{ fontSize: '11.5px', color: '#78716c' }}>{s.department_name}</div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontWeight: '800', color: '#1c1917' }}>{s.percentage}%</span>
                          <span style={{ fontSize: '11px', color: '#b45309', display: 'block' }}>({s.total_score}/{s.max_score} đ)</span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            background: badge.bg,
                            border: `1px solid ${badge.border}`,
                            color: badge.text
                          }}>
                            {s.rank_level || 'Chưa xếp loại'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: '#78716c', fontSize: '12px' }}>
                          {s.submitted_at || '---'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <button
                            onClick={() => setViewSubmissionDetailId(s.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: '#fef3c7',
                              border: '1px solid #fde68a',
                              color: '#92400e',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                            title="Xem chi tiết câu hỏi và đáp án thí sinh đã chọn"
                          >
                            <Eye size={13} /> Xem bài làm
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {selectedQR && (
        <AssessmentQRModal 
          assessment={selectedQR} 
          onClose={() => setSelectedQR(null)} 
        />
      )}

      {showImportModal && (
        <AssessmentImportModal 
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            fetchAssessments();
            if (activeTab === 'submissions') fetchAllSubmissions();
          }}
        />
      )}

      {(showCreateModal || editAssessmentId) && (
        <AssessmentEditorModal
          assessmentId={editAssessmentId}
          onClose={() => {
            setShowCreateModal(false);
            setEditAssessmentId(null);
          }}
          onSuccess={() => fetchAssessments()}
        />
      )}

      {selectedQuestionsModal && (
        <AssessmentQuestionsModal
          assessment={selectedQuestionsModal}
          onClose={() => setSelectedQuestionsModal(null)}
          onAppendQuestions={() => {
            setShowImportModal(true);
          }}
        />
      )}

      {selectedSubmissionsModal && (
        <AssessmentSubmissionsModal
          assessment={selectedSubmissionsModal}
          onClose={() => setSelectedSubmissionsModal(null)}
        />
      )}

      {viewSubmissionDetailId && (
        <AssessmentSubmissionDetailModal
          submissionId={viewSubmissionDetailId}
          onClose={() => setViewSubmissionDetailId(null)}
        />
      )}
    </div>
  );
};

export default AssessmentListView;
